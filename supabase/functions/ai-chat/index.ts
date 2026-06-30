/**
 * Edge Function: ai-chat
 *
 * Proxy centralizado para OpenAI.
 * - A chave da API nunca é exposta ao client
 * - Verifica autenticação do usuário
 * - Aplica limites do plano
 * - Loga uso em usage_log
 *
 * POST /functions/v1/ai-chat
 * Body: { messages, systemAppend, maxTokens, temperature, model }
 * Headers: Authorization: Bearer <jwt>
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // 1. Validar JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonError(401, 'missing_authorization', 'Token de autenticação ausente');
    }
    const jwt = authHeader.replace(/^Bearer\s+/i, '');

    // 2. Cliente Supabase com service role (server-only)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 3. Cliente com JWT do usuário (para respeitar RLS)
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabaseUser.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return jsonError(401, 'invalid_token', 'Token inválido');
    }
    const userId = userData.user.id;

    // 4. Verificar se é admin ou usuário comum
    const { data: adminData } = await supabaseAdmin
      .from('admins')
      .select('id, role')
      .eq('user_id', userId)
      .eq('ativo', true)
      .maybeSingle();

    const isAdmin = !!adminData;

    // 5. Pegar limite do plano do usuário (admin é ilimitado)
    let limiteIA = 999999;
    if (!isAdmin) {
      const { data: subData } = await supabaseAdmin
        .from('subscriptions')
        .select('plan_id, status, plans(limite_ia_mes)')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      // @ts-ignore — nested select
      limiteIA = subData?.plans?.limite_ia_mes ?? 30;

      // 6. Contar uso no mês
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const { count } = await supabaseAdmin
        .from('usage_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('tipo', 'ia_request')
        .gte('criado_em', inicioMes.toISOString());

      if ((count ?? 0) >= limiteIA) {
        return jsonError(429, 'plan_limit_reached', `Limite mensal de IA atingido (${limiteIA}). Faça upgrade do plano.`);
      }
    }

    // 7. Pegar chave da API (server-side only)
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return jsonError(500, 'no_api_key', 'Nenhuma chave OpenAI configurada no servidor');
    }

    // 8. Parse body
    const body = await req.json().catch(() => ({}));
    const {
      messages = [],
      systemAppend = '',
      maxTokens = 2500,
      temperature = 0.7,
      model = 'gpt-4o-mini',
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return jsonError(400, 'invalid_body', 'messages[] é obrigatório');
    }

    // 9. Montar system prompt
    const systemContent = systemAppend
      ? `Você é o Assistente Ministerial do Pregador OS.\n\n${systemAppend}`
      : `Você é o Assistente Ministerial do Pregador OS — mentor especializado em teologia, hermenêutica, homilética e preparação de mensagens bíblicas.`;

    const fullMessages = [
      { role: 'system', content: systemContent },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    // 10. Chamar OpenAI
    const openaiStart = Date.now();
    const openaiRes = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        max_tokens: Math.min(maxTokens, 4000),
        temperature: Math.min(Math.max(temperature, 0), 2),
        stream: false,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      // Log erro
      await supabaseAdmin.from('usage_log').insert({
        user_id: userId,
        tipo: 'error',
        acao: 'openai_call_failed',
        meta: { status: openaiRes.status, error: errText.slice(0, 500) },
        ip: req.headers.get('x-forwarded-for') ?? null,
        user_agent: req.headers.get('user-agent') ?? null,
      });
      return jsonError(openaiRes.status, 'openai_error', `OpenAI retornou ${openaiRes.status}: ${errText.slice(0, 200)}`);
    }

    const openaiJson = await openaiRes.json();
    const duracaoMs = Date.now() - openaiStart;

    const content = openaiJson.choices?.[0]?.message?.content ?? '';
    const usage = openaiJson.usage ?? {};
    const tokensInput = usage.prompt_tokens ?? 0;
    const tokensOutput = usage.completion_tokens ?? 0;
    const tokensTotal = usage.total_tokens ?? tokensInput + tokensOutput;

    // Custo estimado (gpt-4o-mini)
    const custoUSD = (tokensInput / 1000) * 0.00015 + (tokensOutput / 1000) * 0.0006;

    // 11. Log uso (assíncrono — não bloqueia resposta)
    supabaseAdmin
      .from('usage_log')
      .insert({
        user_id: userId,
        tipo: 'ia_request',
        acao: 'chat',
        provider: 'openai',
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        custo_usd: custoUSD,
        duracao_ms: duracaoMs,
        ip: req.headers.get('x-forwarded-for') ?? null,
        user_agent: req.headers.get('user-agent') ?? null,
        meta: { model },
      })
      .then(() => {});

    // 12. Resposta
    return new Response(
      JSON.stringify({
        content,
        provider: 'openai',
        model,
        tokensInput,
        tokensOutput,
        tokensTotal,
        custoUSD,
        duracaoMs,
        isAdmin,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  } catch (err) {
    return jsonError(500, 'internal_error', (err as Error).message);
  }
});

function jsonError(status: number, code: string, message: string) {
  return new Response(JSON.stringify({ error: code, message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}