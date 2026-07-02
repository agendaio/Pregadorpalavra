import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // Supabase JS adiciona automaticamente os headers `apikey` e `x-client-info`
  // em toda chamada. Sem eles no preflight, o browser bloqueia com CORS.
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Client-Info, apikey, x-client-info',
  'Access-Control-Max-Age': '86400',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  latencyMs?: number;
}

async function runTests(
  provider: string,
  apiKey: string,
  model: string,
): Promise<{ success: boolean; tests: TestResult[]; latencyMs: number; model: string }> {
  const tests: TestResult[] = [];
  const start = Date.now();

  // 1. Validar formato da chave
  {
    let validFormat = false;
    const k = apiKey.trim();
    if (provider === 'openai') validFormat = k.startsWith('sk-') || k.startsWith('sk-proj-');
    else if (provider === 'anthropic') validFormat = k.startsWith('sk-ant-') || k.startsWith('anthropic-');
    else if (provider === 'google') validFormat = k.length > 10;
    else if (provider === 'azure') validFormat = k.length > 10;
    else if (provider === 'groq') validFormat = k.startsWith('gsk_');
    else validFormat = k.length > 5;

    tests.push({
      name: 'Formato da chave',
      passed: validFormat,
      message: validFormat ? 'Formato valido' : `Formato invalido para ${provider}`,
    });
    if (!validFormat) return { success: false, tests, latencyMs: 0, model };
  }

  // 2. Testar autenticacao + modelo
  let responseOk = false;
  let errorMessage = '';
  let latencyMs = 0;

  try {
    const t0 = Date.now();

    if (provider === 'openai' || provider === 'groq') {
      const url = provider === 'groq'
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      const defaultModel = provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || defaultModel,
          messages: [{ role: 'user', content: 'Responda apenas com "OK".' }],
          max_tokens: 10,
          temperature: 0,
        }),
      });
      latencyMs = Date.now() - t0;
      if (res.ok) {
        const data = await res.json();
        const content = (data as { choices?: Array<{ message?: { content?: string } }> })
          .choices?.[0]?.message?.content;
        responseOk = !!(content && content.trim().length > 0);
        if (!responseOk) errorMessage = 'Resposta vazia ou mal-formatada';
      } else {
        const err = await res.text().catch(() => '');
        try {
          const parsed = JSON.parse(err);
          errorMessage = parsed.error?.message ?? `HTTP ${res.status}`;
        } catch {
          errorMessage = `HTTP ${res.status}: ${err.slice(0, 200)}`;
        }
      }
    } else if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-haiku-20250619',
          messages: [{ role: 'user', content: 'Responda apenas com "OK".' }],
          max_tokens: 10,
        }),
      });
      latencyMs = Date.now() - t0;
      if (res.ok) {
        const data = await res.json();
        const content = (data as { content?: Array<{ text?: string }> }).content?.[0]?.text;
        responseOk = !!(content && content.trim().length > 0);
        if (!responseOk) errorMessage = 'Resposta vazia ou mal-formatada';
      } else {
        const err = await res.text().catch(() => '');
        try {
          const parsed = JSON.parse(err);
          errorMessage = parsed.error?.message ?? `HTTP ${res.status}`;
        } catch {
          errorMessage = `HTTP ${res.status}: ${err.slice(0, 200)}`;
        }
      }
    } else if (provider === 'google') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Responda apenas com "OK".' }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
        },
      );
      latencyMs = Date.now() - t0;
      if (res.ok) {
        const data = await res.json();
        const content = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
          .candidates?.[0]?.content?.parts?.[0]?.text;
        responseOk = !!(content && content.trim().length > 0);
        if (!responseOk) errorMessage = 'Resposta vazia ou mal-formatada';
      } else {
        const err = await res.text().catch(() => '');
        try {
          const parsed = JSON.parse(err);
          errorMessage = parsed.error?.message ?? `HTTP ${res.status}`;
        } catch {
          errorMessage = `HTTP ${res.status}: ${err.slice(0, 200)}`;
        }
      }
    } else if (provider === 'azure') {
      const endpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT') ?? '';
      const apiVersion = '2024-02-01';
      if (!endpoint) {
        tests.push({
          name: 'Config Azure',
          passed: false,
          message: 'AZURE_OPENAI_ENDPOINT nao configurado no servidor',
        });
        return { success: false, tests, latencyMs: Date.now() - start, model };
      }
      const res = await fetch(`${endpoint}/chat/completions?api-version=${apiVersion}`, {
        method: 'POST',
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Responda apenas com "OK".' }],
          max_tokens: 10,
        }),
      });
      latencyMs = Date.now() - t0;
      if (res.ok) {
        responseOk = true;
      } else {
        const err = await res.text().catch(() => '');
        errorMessage = `HTTP ${res.status}: ${err.slice(0, 200)}`;
      }
    }
  } catch (e) {
    latencyMs = Date.now() - start;
    tests.push({
      name: 'Autenticacao e resposta',
      passed: false,
      message: `Erro: ${(e as Error).message}`,
      latencyMs,
    });
    return { success: false, tests, latencyMs, model };
  }

  const totalLatency = Date.now() - start;

  tests.push({
    name: 'Autenticacao e resposta',
    passed: responseOk,
    message: responseOk
      ? `Resposta OK em ${latencyMs}ms`
      : `Falha: ${errorMessage || 'sem resposta'}`,
    latencyMs,
  });

  // 3. Velocidade
  tests.push({
    name: 'Velocidade media',
    passed: totalLatency < 10000,
    message:
      totalLatency < 2000
        ? `Excelente (${totalLatency}ms)`
        : totalLatency < 5000
        ? `Bom (${totalLatency}ms)`
        : totalLatency < 10000
        ? `Aceitavel (${totalLatency}ms)`
        : `Lenta (${totalLatency}ms)`,
    latencyMs: totalLatency,
  });

  // 4. Conectividade
  tests.push({
    name: 'Conectividade',
    passed: true,
    message: 'Conexao estabelecida com sucesso',
  });

  return {
    success: tests.every((t) => t.passed),
    tests,
    latencyMs: totalLatency,
    model: model || (provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini'),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const { provider = 'openai', apiKey = '', model = '' } = body;

    if (!apiKey?.trim()) {
      return json({
        success: false,
        tests: [{ name: 'Validacao', passed: false, message: 'API key e obrigatoria' }],
        latencyMs: 0,
        model: '',
      }, 400);
    }

    const result = await runTests(provider, apiKey.trim(), model);
    // Sempre 200 — sucesso/falha vai no body.tests (frontend lê normalmente).
    // 422 quebraria o parse do supabase.functions.invoke e viraria "FunctionsFetchError".
    return json(result, 200);
  } catch (err) {
    return json({
      success: false,
      tests: [{ name: 'Erro interno', passed: false, message: (err as Error).message }],
      latencyMs: 0,
      model: '',
    }, 500);
  }
});
