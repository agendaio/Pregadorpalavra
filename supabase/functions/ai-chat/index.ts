/**
 * Edge Function: ai-chat
 *
 * Proxy centralizado para múltiplos provedores de IA (OpenAI, Azure, Anthropic, Google).
 * - A chave da API nunca é exposta ao client
 * - Lê chaves da tabela api_keys do banco (admin cadastra via painel)
 * - Verifica autenticação do usuário
 * - Aplica limites do plano
 * - Suporta streaming
 * - Loga uso em usage_log
 *
 * POST /functions/v1/ai-chat
 * Body: { messages, systemAppend, maxTokens, temperature, model, provider, stream }
 *
 * POST /functions/v1/ai-chat/test
 * Body: { provider, apiKey, model }
 * Testa autenticidade e conectividade da chave
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, content-type',
      ...extraHeaders,
    },
  });
}

function jsonError(status: number, code: string, message: string) {
  return json({ error: code, message }, status);
}

// ─── Provedores ─────────────────────────────────────────────────────────────

interface ChatOptions {
  provider: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  systemContent: string;
  maxTokens: number;
  temperature: number;
  streaming: boolean;
}

async function callOpenAI(opts: ChatOptions) {
  const { apiKey, model, messages, systemContent, maxTokens, temperature, streaming } = opts;

  if (streaming) {
    // Streaming via SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [{ role: 'system', content: systemContent }, ...messages],
              max_tokens: Math.min(maxTokens, 4000),
              temperature: Math.min(Math.max(temperature, 0), 2),
              stream: true,
            }),
          });

          if (!res.ok) {
            const err = await res.text();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'openai_error', message: err.slice(0, 300) })}\n\n`));
            controller.close();
            return;
          }

          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                continue;
              }
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content ?? '';
                if (content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch { /* skip */ }
            }
          }
        } catch (e) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'stream_error', message: (e as Error).message })}\n\n`));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  // Non-streaming
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemContent }, ...messages],
      max_tokens: Math.min(maxTokens, 4000),
      temperature: Math.min(Math.max(temperature, 0), 2),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI ${res.status}: ${err.slice(0, 300)}`);
  }

  return await res.json();
}

async function callAzureOpenAI(opts: ChatOptions) {
  const { apiKey, model, messages, systemContent, maxTokens, temperature, streaming } = opts;
  const endpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT') ?? '';
  const apiVersion = '2024-02-01';

  if (!endpoint) throw new Error('AZURE_OPENAI_ENDPOINT não configurado no servidor');

  const url = `${endpoint}/chat/completions?api-version=${apiVersion}`;

  if (streaming) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'api-key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [{ role: 'system', content: systemContent }, ...messages],
              max_tokens: maxTokens,
              temperature,
              stream: true,
            }),
          });

          if (!res.ok) {
            const err = await res.text();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'azure_error', message: err.slice(0, 300) })}\n\n`));
            controller.close();
            return;
          }

          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') { controller.enqueue(encoder.encode('data: [DONE]\n\n')); continue; }
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content ?? '';
                if (content) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              } catch { /* skip */ }
            }
          }
        } catch (e) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'stream_error', message: (e as Error).message })}\n\n`));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'system', content: systemContent }, ...messages],
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Azure OpenAI ${res.status}: ${err.slice(0, 300)}`);
  }
  return await res.json();
}

async function callAnthropic(opts: ChatOptions) {
  const { apiKey, model, messages, systemContent, maxTokens, temperature, streaming } = opts;
  const version = '2023-06-01';
  const url = `https://api.anthropic.com/v1/messages`;

  // Converte mensagens OpenAI format → Anthropic format
  const systemMsg = { role: 'system' as const, content: systemContent };
  const anthropicMessages = [systemMsg, ...messages].map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  if (streaming) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': version,
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: anthropicMessages,
              max_tokens: Math.min(maxTokens, 4096),
              temperature: Math.min(Math.max(temperature, 0), 2),
              stream: true,
            }),
          });

          if (!res.ok) {
            const err = await res.text();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'anthropic_error', message: err.slice(0, 300) })}\n\n`));
            controller.close();
            return;
          }

          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'content_block_delta') {
                  const content = parsed.delta?.text ?? '';
                  if (content) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                } else if (parsed.type === 'message_stop') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                }
              } catch { /* skip */ }
            }
          }
        } catch (e) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'stream_error', message: (e as Error).message })}\n\n`));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': version,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: anthropicMessages,
      max_tokens: Math.min(maxTokens, 4096),
      temperature: Math.min(Math.max(temperature, 0), 2),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  // Normaliza pro formato OpenAI
  return {
    choices: [{ message: { content: data.content?.[0]?.text ?? '' } }],
    usage: { prompt_tokens: data.usage?.input_tokens, completion_tokens: data.usage?.output_tokens, total_tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0) },
  };
}

async function callGoogleGemini(opts: ChatOptions) {
  const { apiKey, model, messages, systemContent, maxTokens, temperature, streaming } = opts;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

  // Converte pro format Gemini
  const contents = messages.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  if (streaming) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              systemInstruction: { parts: [{ text: systemContent }] },
              generationConfig: {
                maxOutputTokens: maxTokens,
                temperature,
              },
            }),
          });

          if (!res.ok) {
            const err = await res.text();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'gemini_error', message: err.slice(0, 300) })}\n\n`));
            controller.close();
            return;
          }

          const reader = res.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              try {
                const parsed = JSON.parse(data);
                const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
                if (content) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
              } catch { /* skip */ }
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (e) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'stream_error', message: (e as Error).message })}\n\n`));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: systemContent }] },
      generationConfig: { maxOutputTokens: maxTokens, temperature },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Gemini ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return { choices: [{ message: { content } }], usage: {} };
}

async function callProvider(opts: ChatOptions) {
  switch (opts.provider) {
    case 'azure': return await callAzureOpenAI(opts);
    case 'anthropic': return await callAnthropic(opts);
    case 'google': return await callGoogleGemini(opts);
    default: return await callOpenAI(opts);
  }
}

// ─── Helpers de custo ───────────────────────────────────────────────────────

function estimarCusto(provider: string, model: string, tokensInput: number, tokensOutput: number): number {
  const precos: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.5, output: 10 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4-turbo': { input: 10, output: 30 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    'claude-3-5-sonnet': { input: 3, output: 15 },
    'claude-3-opus': { input: 15, output: 75 },
    'claude-3-haiku': { input: 0.25, output: 1.25 },
    'gemini-1.5-pro': { input: 0, output: 0 },
    'gemini-1.5-flash': { input: 0, output: 0 },
  };
  const p = precos[model] ?? { input: 0.15, output: 0.6 };
  return (tokensInput / 1_000_000) * p.input + (tokensOutput / 1_000_000) * p.output;
}

// ─── Sistema de prompts ─────────────────────────────────────────────────────

const SYSTEM_BASE = `Você é o **Assistente Ministerial** do Pregador OS — um mentor especializado em teologia bíblica, hermenêutica, homilética e preparação de mensagens.

Sua missão é apoiar pregadores, líderes e estudiosos da Bíblia de forma respeitosa, fundamentada e acolhedora.

## Especializações:
- Bíblia Sagrada (Antigo e Novo Testamento)
- Contexto Bíblico e Histórico
- Hermenêutica e Exegese
- Homilética e Estrutura de Sermões
- Teologia Bíblica e Sistemática
- Apologética
- História da Igreja
- Cultura Judaica e do Novo Testamento
- Personagens, Cronologia e Geografia Bíblica
- Hebraico e Grego Bíblico (conceitos)
- Preparação de Esboços e Sermões
- Estudos para Células e Devocionais
- Liderança Cristã e Discipulado

## Regras importantes:
1. Nunca afirme autoridade religiosa. Ofereça apoio de estudo, não decisões teológicas definitivas.
2. Quando houver diferentes interpretações entre tradições cristãs, apresente-as com equilíbrio e respeito.
3. Baseie respostas na Bíblia, citações de commentaries reconhecidos e fontes históricas.
4. Seja claro, direto e prático — o pregador precisa de conteúdo útil.
5. Responda em português brasileiro.
6. Organize respostas com estrutura clara (títulos, listas, tabelas quando útil).
7. Para esboços, siga a estrutura: Título, Subtítulo, Texto Base, Tema, Objetivo, Introdução, Contextualização, Pontos (com aplicações), Conclusão, Referências.`;

// ─── Handler principal ───────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (req.method !== 'POST') {
    return jsonError(405, 'method_not_allowed', 'Apenas POST é aceito');
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return jsonError(401, 'missing_auth', 'Token de autenticação ausente');
    }
    const jwt = authHeader.replace(/^Bearer\s+/i, '');

    // Cliente admin (bypass RLS)
    const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Validar token via REST endpoint (suporta HS256 + ES256)
    let userId: string;
    try {
      const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'apikey': Deno.env.get('SUPABASE_ANON_KEY')!,
        },
      });
      if (!userResp.ok) {
        const errText = await userResp.text();
        return jsonError(401, 'invalid_token', `Token inválido ou expirado (HTTP ${userResp.status}): ${errText.slice(0, 200)}`);
      }
      const userJson = await userResp.json();
      userId = userJson.id;
      if (!userId) {
        return jsonError(401, 'invalid_token', 'Resposta sem user.id');
      }
    } catch (e) {
      return jsonError(401, 'invalid_token', `Falha ao validar token: ${(e as Error).message}`);
    }

    // Verificar se é admin
    const { data: adminData } = await sbAdmin
      .from('admins')
      .select('id, role')
      .eq('user_id', userId)
      .eq('ativo', true)
      .maybeSingle();
    const isAdmin = !!adminData;

    // Parse body
    const body = await req.json().catch(() => ({}));
    const {
      messages = [],
      systemAppend = '',
      maxTokens = 2500,
      temperature = 0.7,
      model = 'gpt-4o-mini',
      provider = 'openai',
      stream = false,
      agente_id = null,       // ID do agente IA específico
      modo = 'chat',          // 'chat' | 'test'
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      // Compatibilidade: aceita { mensagem: '...' } também
      const mensagemSimples = (body as { mensagem?: string }).mensagem;
      if (typeof mensagemSimples === 'string' && mensagemSimples.trim()) {
        (body as { messages?: unknown }).messages = [{ role: 'user', content: mensagemSimples.trim() }];
      } else {
        return jsonError(400, 'invalid_body', 'messages[] ou mensagem é obrigatório');
      }
    }

    // Obter API key ativa do banco
    const { data: keyData } = await sbAdmin
      .from('api_keys')
      .select('key_ciphertext, provider, modelo_padrao')
      .eq('ativo', true)
      .eq('provider', provider)
      .maybeSingle();

    let apiKey = keyData?.key_ciphertext;

    // Fallback: se não houver key no banco, tenta env var (compatibilidade)
    if (!apiKey) {
      apiKey = Deno.env.get('OPENAI_API_KEY');
    }

    if (!apiKey) {
      return jsonError(500, 'no_api_key', `Nenhuma chave ${provider} configurada. Solicite ao administrador que cadastre uma chave na aba API Keys do painel admin.`);
    }

    // ── Carregar agente se especificado ──
    let agentInfo: { id: string; nome: string; icon: string } | null = null;
    let agentPrompt = '';
    let agentTemp = temperature;
    let agentMaxTokens = maxTokens;
    let agentModelOverride: string | null = null;

    if (agente_id && modo !== 'test') {
      const { data: agentData } = await sbAdmin
        .from('ia_agents')
        .select('id, nome, icon, prompt_sistema, temperatura, max_tokens, modelo, ativo')
        .eq('id', agente_id)
        .maybeSingle();

      if (!agentData) {
        return jsonError(404, 'agent_not_found', 'Agente não encontrado.');
      }
      if (!agentData.ativo) {
        return jsonError(400, 'agent_inactive', 'Este agente está desativado.');
      }

      agentInfo = { id: agentData.id, nome: agentData.nome, icon: agentData.icon };
      agentPrompt = agentData.prompt_sistema ?? '';
      agentTemp = agentData.temperatura ?? temperature;
      agentMaxTokens = agentData.max_tokens ?? maxTokens;
      agentModelOverride = agentData.modelo;
    }

    const effectiveProvider = keyData?.provider ?? provider;
    const effectiveModel = agentModelOverride || model || keyData?.modelo_padrao || 'gpt-4o-mini';

    // Verificar limites (admin é ilimitado)
    if (!isAdmin) {
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);

      const { count } = await sbAdmin
        .from('usage_log')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('tipo', 'ia_request')
        .gte('criado_em', inicioMes.toISOString());

      // Pegar limite do plano
      const { data: subData } = await sbAdmin
        .from('subscriptions')
        .select('plans(limite_ia_mes)')
        .eq('user_id', userId)
        .in('status', ['active', 'trialing'])
        .order('criado_em', { ascending: false })
        .limit(1)
        .maybeSingle();

      // @ts-ignore
      const limite = subData?.plans?.limite_ia_mes ?? 30;

      if ((count ?? 0) >= limite) {
        return jsonError(429, 'limit_reached', `Limite mensal de IA atingido (${limite}). Faça upgrade do plano para continuar usando o Assistente Ministerial.`);
      }
    }

    // Montar prompt do sistema
    const promptParts: string[] = [];
    if (agentPrompt) {
      promptParts.push(agentPrompt);
    }
    if (systemAppend) {
      promptParts.push(systemAppend);
    }
    if (promptParts.length === 0) {
      promptParts.push(SYSTEM_BASE);
    }
    const systemContent = promptParts.join('\n\n');

    const start = Date.now();

    // Chamar provider com configs do agente
    const result = await callProvider({
      provider: effectiveProvider,
      apiKey,
      model: effectiveModel,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      systemContent,
      maxTokens: agentMaxTokens,
      temperature: agentTemp,
      streaming: stream,
    });

    // Se é streaming, a resposta já é um stream — loga depois
    if (stream) {
      // Log assíncrono
      sbAdmin.from('usage_log').insert({
        user_id: userId,
        tipo: 'ia_request',
        acao: 'chat_stream',
        provider: effectiveProvider,
        duracao_ms: Date.now() - start,
        meta: { model: effectiveModel, stream: true },
        ip: req.headers.get('x-forwarded-for') ?? null,
        user_agent: req.headers.get('user-agent') ?? null,
      }).then(() => {}).catch(() => {});

      return result; // ReadableStream response
    }

    // Non-streaming: extrair resposta
    const content = result.choices?.[0]?.message?.content ?? '';
    const usage = result.usage ?? {};
    const tokensInput = usage.prompt_tokens ?? 0;
    const tokensOutput = usage.completion_tokens ?? 0;
    const tokensTotal = usage.total_tokens ?? tokensInput + tokensOutput;
    const duracaoMs = Date.now() - start;
    const custoUSD = estimarCusto(effectiveProvider, effectiveModel, tokensInput, tokensOutput);

    // Log assíncrono (uso geral)
    sbAdmin.from('usage_log').insert({
      user_id: userId,
      tipo: 'ia_request',
      acao: agente_id ? `chat_agent_${agente_id.slice(0, 8)}` : 'chat',
      provider: effectiveProvider,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      custo_usd: custoUSD,
      duracao_ms: duracaoMs,
      meta: { model: effectiveModel, agente_id, agente_nome: agentInfo?.nome },
      ip: req.headers.get('x-forwarded-for') ?? null,
      user_agent: req.headers.get('user-agent') ?? null,
    }).then(() => {}).catch(() => {});

    // Log específico do agente (se for agente)
    if (agente_id && modo !== 'test') {
      sbAdmin.from('ia_agent_logs').insert({
        agent_id: agente_id,
        user_id: userId,
        mensagem: messages[messages.length - 1]?.content?.slice(0, 500) ?? '',
        resposta: content.slice(0, 2000),
        tokens_input: tokensInput,
        tokens_output: tokensOutput,
        duracao_ms: duracaoMs,
        custo_usd: custoUSD,
        modelo: effectiveModel,
        sucesso: true,
      }).then(() => {}).catch(() => {});

      // Incrementar stats do agente
      sbAdmin.rpc('increment_agent_stats', { p_agent_id: agente_id, p_tokens: tokensTotal }).then(() => {}).catch(() => {});
    }

    return json({
      content,
      provider: effectiveProvider,
      model: effectiveModel,
      tokensInput,
      tokensOutput,
      tokensTotal,
      custoUSD,
      duracaoMs,
      isAdmin,
      agente: agentInfo,
    });
  } catch (err) {
    console.error('ai-chat error:', err);
    return jsonError(500, 'internal_error', (err as Error).message);
  }
});
