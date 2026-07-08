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
      // Supabase JS injeta `apikey` e `x-client-info` automaticamente — devem
      // constar aqui no preflight OPTIONS, senão o browser bloqueia com CORS.
      'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
      ...extraHeaders,
    },
  });
}

function jsonError(status: number, code: string, message: string) {
  return json({ error: code, message }, status);
}

// ─── CACHE INTELIGENTE ──────────────────────────────────────────────────────
// In-memory, janela curta (5 min), TTL limpo por entrada.
// Usa globalThis pra sobreviver a cold starts dentro do mesmo container
// (Supabase Edge mantém warm pool; containers persistem minutos).
// Reduz latência percebida pra perguntas recorrentes — mesmo efeito visual
// do "cache" do ChatGPT.

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 200;

interface CacheEntry { value: string; expires: number }
const _global = globalThis as unknown as { __ai_chat_cache?: Map<string, CacheEntry> };
const cache: Map<string, CacheEntry> = _global.__ai_chat_cache ?? new Map();
_global.__ai_chat_cache = cache;

function cacheGet(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function cacheSet(key: string, value: string): void {
  if (cache.size >= CACHE_MAX) {
    // FIFO: apaga a entrada mais antiga
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
}

// Chave única usada tanto na leitura quanto na escrita — precisa ser
// EXATAMENTE a mesma fórmula nos dois lugares, senão o cache nunca dá hit.
function buildChatCacheKey(model: string, systemContent: string, pergunta: string): string {
  const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  return `${model}|${norm(systemContent).slice(0, 120)}|${norm(pergunta)}`;
}

function ultimaPerguntaDoUsuario(messages: unknown): string {
  if (!Array.isArray(messages)) return '';
  return (messages as Array<{ role: string; content: string }>)
    .filter((m) => m.role === 'user')
    .slice(-1)[0]?.content ?? '';
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

// Retry automático em 429 (rate limit) / 503 (indisponível) com backoff curto.
// O free-tier do Groq estoura o limite por minuto com facilidade quando o
// usuário manda várias perguntas seguidas; um ou dois retries curtos resolvem
// a grande maioria dos casos sem o usuário nem perceber.
async function fetchWithRetry(url: string, init: RequestInit, tentativas = 3): Promise<Response> {
  let ultima: Response | null = null;
  for (let i = 0; i < tentativas; i++) {
    const res = await fetch(url, init);
    if (res.status !== 429 && res.status !== 503) return res;
    ultima = res;
    if (i < tentativas - 1) {
      const retryAfter = Number(res.headers.get('retry-after'));
      const espera = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 4000)
        : 700 * (i + 1); // 0.7s, 1.4s
      await res.text().catch(() => {}); // libera a conexão antes de esperar
      await new Promise((r) => setTimeout(r, espera));
    }
  }
  return ultima!;
}

// Erro classificável de provedor — carrega o status HTTP e o corpo, pra que o
// rodízio de chaves decida se a chave estourou limite por minuto (pausa curta),
// cota diária/sem crédito (pausa longa) ou é inválida (desativa de vez).
class ProviderError extends Error {
  httpStatus: number;
  errText: string;
  errorCode: string;
  constructor(message: string, httpStatus: number, errText: string, errorCode: string) {
    super(message);
    this.name = 'ProviderError';
    this.httpStatus = httpStatus;
    this.errText = errText;
    this.errorCode = errorCode;
  }
}

// ─── Truncamento de mensagens ─────────────────────────────────────────────────
// Estima tokens pela contagem de palavras (≈4 chars por token em média).
// Garante que a requisição nunca estoure o limite de entrada do modelo.
const MAX_INPUT_TOKENS = 4500; // margem de segurança abaixo de 6000 TPM do Groq 8b-instant

function truncateMessages(messages: Array<{ role: string; content: string }>, systemContent: string): Array<{ role: string; content: string }> {
  const systemTokens = Math.ceil(systemContent.length / 4);
  const budget = MAX_INPUT_TOKENS - systemTokens;
  if (budget <= 0) return [];

  const result: Array<{ role: string; content: string }> = [];
  let used = 0;

  // Começa pelas mensagens mais recentes (índice alto → mais relevantes)
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const tokens = Math.ceil(msg.content.length / 4);
    if (used + tokens <= budget) {
      result.unshift(msg);
      used += tokens;
    } else {
      // Corta o conteúdo da mensagem mais antiga se necessário
      const remaining = budget - used;
      if (remaining > 100) {
        const truncatedContent = msg.content.slice(0, remaining * 4);
        result.unshift({ ...msg, content: truncatedContent });
      }
      break;
    }
  }
  return result;
}

// callOpenAI e callGroq usam o mesmo formato de API (Groq é compatível com
// o schema OpenAI) — só muda a URL base e o rótulo do erro.
// `fallbackModel`: se o modelo principal estourar rate limit (429), tenta um
// modelo mais leve. No Groq o limite é POR MODELO, então cair pro 70b-versatile
// (cota bem maior no free tier) resolve a maioria dos 429.
async function callOpenAICompatible(
  opts: ChatOptions,
  baseUrl: string,
  errorLabel: string,
  errorCode: string,
  fallbackModel?: string,
) {
  const { apiKey, model, messages, systemContent, maxTokens, temperature, streaming } = opts;

  // Trunca histórico de chat pra nunca estourar limite de input tokens
  const truncated = truncateMessages(messages, systemContent);

  const doFetch = (modelToUse: string, useStream: boolean) => fetchWithRetry(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelToUse,
      messages: [{ role: 'system', content: systemContent }, ...truncated],
      max_tokens: Math.min(maxTokens, 4000),
      temperature: Math.min(Math.max(temperature, 0), 2),
      ...(useStream ? { stream: true } : {}),
    }),
  });

  // Faz a requisição (com fallback de modelo em 429) e valida o status ANTES
  // de decidir streaming. Assim, se a chave falhar, lançamos um erro
  // classificável (com httpStatus + errText) e o rodízio de chaves troca pra
  // próxima na hora (failover) — o usuário nunca vê o erro.
  let res = await doFetch(model, streaming);
  if (res.status === 429 && fallbackModel && fallbackModel !== model) {
    await res.text().catch(() => {});
    res = await doFetch(fallbackModel, streaming);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new ProviderError(`${errorLabel} ${res.status}: ${errText.slice(0, 300)}`, res.status, errText, errorCode);
  }

  if (streaming) {
    // res já OK — só repassa o SSE convertendo pro nosso formato { content }
    const encoder = new TextEncoder();
    const reader = res.body!.getReader();
    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        let buffer = '';
        try {
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
        'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
      },
    });
  }

  return await res.json();
}

async function callOpenAI(opts: ChatOptions) {
  return callOpenAICompatible(opts, 'https://api.openai.com/v1/chat/completions', 'OpenAI', 'openai_error');
}

async function callGroq(opts: ChatOptions) {
  // Fallback pro modelo versátil (70b) quando o principal estoura rate limit.
  // O 8b-instant é usado só quando é o modelo explicitamente selecionado.
  const fallback = opts.model === 'llama-3.1-8b-instant' || opts.model === 'llama-3.3-70b-versatile'
    ? undefined
    : 'llama-3.3-70b-versatile';
  return callOpenAICompatible(opts, 'https://api.groq.com/openai/v1/chat/completions', 'Groq', 'groq_error', fallback);
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
    case 'groq': return await callGroq(opts);
    default: return await callOpenAI(opts);
  }
}

// ─── Rodízio de chaves + failover automático ────────────────────────────────

interface ChaveRodizio {
  id: string;
  provider: string;
  key_ciphertext: string;
  modelo_padrao: string | null;
}

// deno-lint-ignore no-explicit-any
async function pegarProximaChave(sbAdmin: any): Promise<ChaveRodizio | null> {
  // Tenta RPC primeiro (rodízio LRU completo). Se não existir, cai no SELECT direto.
  try {
    const { data, error } = await sbAdmin.rpc('pegar_proxima_chave', { p_provider: null });
    if (!error && data) {
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.key_ciphertext) return row as ChaveRodizio;
    }
  } catch { /* RPC não existe — segue pro SELECT */ }

  // Fallback direto: pega a primeira chave Groq ativa do banco (sem rodízio LRU).
  // Útil quando as RPCs de rodízio ainda não foram criadas no banco.
  const { data, error } = await sbAdmin
    .from('api_keys')
    .select('id, provider, key_ciphertext, modelo_padrao')
    .eq('ativo', true)
    .eq('provider', 'groq')
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id, provider: data.provider, key_ciphertext: data.key_ciphertext, modelo_padrao: data.modelo_padrao };
}

// deno-lint-ignore no-explicit-any
async function marcarChaveErro(sbAdmin: any, id: string, tipo: 'rate_limit' | 'quota' | 'invalida', cooldownSeg: number) {
  try {
    await sbAdmin.rpc('marcar_chave_erro', { p_id: id, p_tipo: tipo, p_cooldown_seg: cooldownSeg });
  } catch { /* best-effort */ }
}

// Distingue rate limit por minuto (pausa curta) de cota dura (pausa longa) de
// chave inválida (desativa). Baseado no status HTTP + texto do provedor.
function classificarErroChave(status: number, text: string): 'rate_limit' | 'quota' | 'invalida' | 'outro' {
  const t = (text || '').toLowerCase();
  if (status === 401 || t.includes('invalid_api_key') || t.includes('invalid api key') || t.includes('incorrect api key') || t.includes('revoked')) {
    return 'invalida';
  }
  if (status === 429 || status === 402) {
    if (
      t.includes('insufficient_quota') || t.includes('exceeded your current quota') || t.includes('billing') ||
      t.includes('per day') || t.includes('daily') || t.includes('tokens per day') || t.includes('rpd') || t.includes('tpd') ||
      t.includes('no credit') || t.includes('out of credit') || t.includes('quota')
    ) {
      return 'quota';
    }
    // TPM (tokens per minute) é rate limit, não quota — pausa curta
    return 'rate_limit';
  }
  return 'outro';
}

type RodizioBase = {
  messages: Array<{ role: string; content: string }>;
  systemContent: string;
  maxTokens: number;
  temperature: number;
  streaming: boolean;
  /** Força um modelo específico (ex: config do agente). Sem isso, usa o modelo da chave. */
  modelOverride?: string;
};

// Executa a chamada ao provedor com rodízio + failover: tenta até MAX chaves;
// pausa/desativa as que estouram limite e segue pra próxima. Se não houver
// chave no banco, cai na chave do env (último recurso).
// deno-lint-ignore no-explicit-any
async function callComRodizio(
  sbAdmin: any,
  base: RodizioBase,
  fallbackKey?: string,
  fallbackProvider = 'groq',
): Promise<{ result: any; provider: string; model: string }> {
  const MAX = 6;
  let ultimoErro: unknown = null;

  for (let i = 0; i < MAX; i++) {
    const chave = await pegarProximaChave(sbAdmin);
    if (!chave) break;

    const provider = chave.provider || fallbackProvider;
    const model = base.modelOverride || chave.modelo_padrao || 'gpt-4o-mini';
    try {
      const result = await callProvider({
        provider,
        apiKey: chave.key_ciphertext,
        model,
        messages: base.messages,
        systemContent: base.systemContent,
        maxTokens: base.maxTokens,
        temperature: base.temperature,
        streaming: base.streaming,
      });
      return { result, provider, model };
    } catch (e) {
      ultimoErro = e;
      const status = e instanceof ProviderError ? e.httpStatus : 0;
      const text = e instanceof ProviderError ? e.errText : ((e as Error)?.message ?? '');
      const tipo = classificarErroChave(status, text);
      if (tipo === 'rate_limit') await marcarChaveErro(sbAdmin, chave.id, 'rate_limit', 60);
      else if (tipo === 'quota') await marcarChaveErro(sbAdmin, chave.id, 'quota', 86400);
      else if (tipo === 'invalida') await marcarChaveErro(sbAdmin, chave.id, 'invalida', 0);
      // 'outro' (rede / 5xx transitório) → não pune a chave; só tenta a próxima
    }
  }

  // Sem chave no banco (ou todas indisponíveis) → chave do env como último recurso
  if (fallbackKey) {
    const model = base.modelOverride || 'gpt-4o-mini';
    const result = await callProvider({
      provider: fallbackProvider,
      apiKey: fallbackKey,
      model,
      messages: base.messages,
      systemContent: base.systemContent,
      maxTokens: base.maxTokens,
      temperature: base.temperature,
      streaming: base.streaming,
    });
    return { result, provider: fallbackProvider, model };
  }

  throw ultimoErro ?? new ProviderError('Nenhuma chave de IA disponível no momento.', 503, '', 'no_api_key');
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
    // Groq: free tier generoso — custo tratado como 0 pra não estimar valor incorreto.
    'llama-3.3-70b-versatile': { input: 0, output: 0 },
    'llama-3.1-8b-instant': { input: 0, output: 0 },
  };
  const fallback = provider === 'groq' ? { input: 0, output: 0 } : { input: 0.15, output: 0.6 };
  const p = precos[model] ?? fallback;
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

// Prompt leve para modo chat — sem overhead de esboço ou parsing.
// Fallback: só é usado se o frontend não mandar systemPrompt/systemAppend.
const SYSTEM_BASE_LIGHT = `Você é o Assistente Ministerial do Pregador OS — um teólogo prático que responde perguntas bíblicas de forma direta e precisa, igual uma conversa de chat.

Regras de formato (importante):
- Responda em texto corrido, como uma conversa — NÃO use títulos markdown (##), NÃO estruture como sermão ou esboço.
- 2 a 5 frases para perguntas simples. Só passe disso se o usuário pedir detalhes.
- Pode usar **negrito** pontual e um versículo entre parênteses, nada além disso.
- Responda em português. Cite versículos completos (Livro Capítulo:Versículo) quando relevante.`;

// ─── Handler principal ───────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (req.method !== 'POST') {
    return jsonError(405, 'method_not_allowed', 'Apenas POST é aceito');
  }

  try {
    // Usuário anônimo é permitido — não validamos JWT aqui.
    // O userId só é preenchido se o token for um JWT válido com sub claim.
    let userId: string | null = null;

    // Cliente admin (bypass RLS)
    const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const authHeader = req.headers.get('authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();

    // Tentar extrair userId do JWT (se tiver sub claim)
    // Supabase usa base64url, não base64 — atob nativo falha
    if (jwt) {
      try {
        const parts = jwt.split('.');
        if (parts.length === 3) {
          // Corrige base64url → base64 padrão (Deno atob só aceita base64)
          let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          // Adiciona padding se necessário
          while (b64.length % 4) b64 += '=';
          const payload = JSON.parse(atob(b64));
          if (payload.sub && payload.exp && payload.exp * 1000 > Date.now()) {
            userId = payload.sub;
          }
        }
      } catch {
        // JWT inválido ou expirado — segue como usuário anônimo
      }
    }

    // Verificar se é admin (só se usuário logado)
    let isAdmin = false;
    if (userId) {
      const { data: adminData } = await sbAdmin
        .from('admins')
        .select('id, role')
        .eq('user_id', userId)
        .eq('ativo', true)
        .maybeSingle();
      isAdmin = !!adminData;
    }

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
      modo = 'chat',          // 'chat' | 'sermon' | 'test'
      session_context = null, // Contexto do esboço em construção
      systemPrompt = '',       // Prompt customizado (enviado pelo frontend em modo chat)
    } = body;

    // ── WARMUP ────────────────────────────────────────────────────────────────
    // O frontend faz um POST invisível no load pra acordar o container Deno.
    // Não faz sentido gastar uma requisição ao provedor (Groq) com isso —
    // cada warmup era 1 chamada ao Groq e ajudava a estourar o rate limit.
    // Respondemos na hora, sem tocar no provedor.
    if ((body as { warmup?: boolean }).warmup === true) {
      return json({ ok: true, warmup: true });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      // Compatibilidade: aceita { mensagem: '...' } também
      const mensagemSimples = (body as { mensagem?: string }).mensagem;
      if (typeof mensagemSimples === 'string' && mensagemSimples.trim()) {
        (body as { messages?: unknown }).messages = [{ role: 'user', content: mensagemSimples.trim() }];
      } else {
        return jsonError(400, 'invalid_body', 'messages[] ou mensagem é obrigatório');
      }
    }

    // ── CACHE INTELIGENTE (chat mode apenas) ────────────────────────────────
    // Chave normalizada (modelo + system prompt + última pergunta).
    // Janela: 5 minutos. Tamanho máximo: 200 entradas.
    if (modo === 'chat' && Array.isArray(messages) && messages.length > 0) {
      const sysBaseLookup = systemPrompt || systemAppend || SYSTEM_BASE_LIGHT;
      const cacheKey = buildChatCacheKey(model, sysBaseLookup, ultimaPerguntaDoUsuario(messages));
      const cached = cacheGet(cacheKey);
      if (cached) {
        // Cache hit — devolve na mesma velocidade do ChatGPT
        if (stream) {
          // SSE cached: primeiro event imediato com a resposta inteira
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: cached, cached: true })}\n\n`));
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            },
          });
          return new Response(stream, {
            status: 200,
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache, no-transform',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
            },
          });
        }
        return json({ content: cached, cached: true, provider, model });
      }
    }

    // Chave de API: rodízio automático entre TODAS as chaves ativas
    // (ver callComRodizio + RPC pegar_proxima_chave). Aqui só preparamos a
    // chave do env como último recurso, caso não haja nenhuma no banco.
    // Fallback usa Groq (gratuito) em vez de OpenAI.
    const envKey = Deno.env.get('GROQ_API_KEY') || Deno.env.get('OPENAI_API_KEY') || undefined;

    // ── CHAT MODE: resposta rápida, sem overhead de esboço ─────────────────────
    if (modo === 'chat') {
      const start = Date.now();

      // Prompt leve: usa o que o frontend enviou, ou fallback mínimo
      const systemContent = systemPrompt || systemAppend || SYSTEM_BASE_LIGHT;

      // deno-lint-ignore no-explicit-any
      let result: any;
      let effectiveProviderChat = provider;
      let effectiveModelChat = model;
      try {
        // Se o frontend enviou apiKey direto, usa sem passar pelo rodízio de chaves
        const apiKeyDireto = (body as { apiKey?: string }).apiKey;
        if (apiKeyDireto) {
          result = await callProvider({
            provider: provider || 'groq',
            apiKey: apiKeyDireto,
            model: model || 'llama-3.3-70b-versatile',
            messages: messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
            systemContent,
            maxTokens,
            temperature,
            streaming: stream,
          });
          effectiveProviderChat = provider || 'groq';
          effectiveModelChat = model || 'llama-3.3-70b-versatile';
        } else {
          const r = await callComRodizio(sbAdmin, {
            messages: messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
            systemContent,
            maxTokens,
            temperature,
            streaming: stream,
          }, envKey, provider);
          result = r.result;
          effectiveProviderChat = r.provider;
          effectiveModelChat = r.model;
        }
      } catch (e) {
        if (e instanceof ProviderError && e.errorCode === 'no_api_key') {
          return jsonError(500, 'no_api_key', 'Nenhuma chave de IA configurada. Cadastre chaves na aba API Keys do painel admin.');
        }
        throw e;
      }

      if (stream) {
        // Log básico assíncrono (sem extrair esboço)
        sbAdmin.from('usage_log').insert({
          user_id: userId,
          tipo: 'ia_request',
          acao: 'chat',
          provider: effectiveProviderChat,
          duracao_ms: Date.now() - start,
          meta: { model: effectiveModelChat, stream: true, modo: 'chat' },
          ip: req.headers.get('x-forwarded-for') ?? null,
          user_agent: req.headers.get('user-agent') ?? null,
        }).then(() => {}).catch(() => {});

        // Intercepta o stream pra popular o cache ao final, sem atrasar
        // nem um milissegundo a entrega ao cliente — cada chunk é repassado
        // imediatamente; a extração de texto acontece em paralelo.
        // Usa `model` (não effectiveModelChat) pra bater com a chave calculada
        // no lookup acima — o lookup roda antes de sabermos qual provider/key
        // está ativo (de propósito, pra não pagar a query no cache-hit).
        const cacheKeyWrite = buildChatCacheKey(model, systemContent, ultimaPerguntaDoUsuario(messages));
        const streamResponse = result as Response;
        let acc = '';
        let sseBuffer = '';
        const decoder = new TextDecoder();
        const tap = new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            controller.enqueue(chunk);
            sseBuffer += decoder.decode(chunk, { stream: true });
            const events = sseBuffer.split('\n\n');
            sseBuffer = events.pop() ?? '';
            for (const evt of events) {
              const data = evt.replace(/^data:\s*/, '').trim();
              if (!data || data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data) as { content?: string; error?: string };
                if (parsed.content) acc += parsed.content;
              } catch { /* skip */ }
            }
          },
          flush() {
            if (acc) cacheSet(cacheKeyWrite, acc);
          },
        });

        return new Response(streamResponse.body?.pipeThrough(tap) ?? null, {
          status: streamResponse.status,
          headers: streamResponse.headers,
        });
      }

      const content = result.choices?.[0]?.message?.content ?? '';
      const usage = result.usage ?? {};
      const duracaoMs = Date.now() - start;

      // ── Salvar no cache para perguntas idênticas (chave normalizada) ──
      if (content && Array.isArray(messages) && messages.length > 0) {
        const cacheKey = buildChatCacheKey(model, systemContent, ultimaPerguntaDoUsuario(messages));
        cacheSet(cacheKey, content);
      }

      // Log assíncrono
      sbAdmin.from('usage_log').insert({
        user_id: userId,
        tipo: 'ia_request',
        acao: 'chat',
        provider: effectiveProviderChat,
        tokens_input: usage.prompt_tokens ?? 0,
        tokens_output: usage.completion_tokens ?? 0,
        duracao_ms: duracaoMs,
        meta: { model: effectiveModelChat, modo: 'chat' },
        ip: req.headers.get('x-forwarded-for') ?? null,
        user_agent: req.headers.get('user-agent') ?? null,
      }).then(() => {}).catch(() => {});

      return json({
        content,
        provider: effectiveProviderChat,
        model: effectiveModelChat,
        tokensInput: usage.prompt_tokens ?? 0,
        tokensOutput: usage.completion_tokens ?? 0,
        tokensTotal: (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0),
        custoUSD: 0,
        duracaoMs,
        modo: 'chat',
      });
    }

    // ── SERMON MODE: fluxo completo com esboço ─────────────────────────────────

    // ── Carregar config global do Agente Ministerial ──
    let ministerialConfig: {
      systemPrompt: string;
      temperatura: number;
      maxTokens: number;
      modelo: string | null;
      habilitado: boolean;
    } = {
      systemPrompt: '',
      temperatura: temperature,
      maxTokens: maxTokens,
      modelo: null,
      habilitado: true,
    };

    try {
      const { data: cfgData } = await sbAdmin
        .from('ia_config')
        .select('valor, metadata')
        .eq('id', 'agente_ministerial')
        .maybeSingle();

      if (cfgData) {
        const meta = cfgData.metadata ?? {};
        ministerialConfig = {
          systemPrompt: cfgData.valor ?? '',
          temperatura: meta.temperatura ?? temperature,
          maxTokens: meta.max_tokens ?? maxTokens,
          modelo: meta.modelo ?? null,
          habilitado: meta.habilitado !== false,
        };
      }
    } catch { /* não bloqueia — usa defaults */ }

    // Se agente desabilitado
    if (!ministerialConfig.habilitado && modo !== 'test') {
      return jsonError(503, 'agent_disabled', 'O Assistente Ministerial está temporariamente desabilitado pelo administrador.');
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

    // Modelo forçado pela config do agente/ministerial; se não houver, o
    // rodízio usa o modelo_padrao de cada chave.
    const modelOverrideSermon = agentModelOverride || ministerialConfig.modelo || undefined;
    let effectiveProvider = provider;
    let effectiveModel = modelOverrideSermon || model || 'gpt-4o-mini';
    const effectiveTemp = agentTemp || ministerialConfig.temperatura;
    const effectiveMaxTokens = agentMaxTokens || ministerialConfig.maxTokens;

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

    // 1. Prompt enviado pelo frontend (via systemPrompt field)
    if (systemPrompt?.trim()) {
      promptParts.push(systemPrompt.trim());
    }
    // 2. Prompt customizado do Agente Ministerial (do banco, fallback)
    else if (ministerialConfig.systemPrompt.trim()) {
      promptParts.push(ministerialConfig.systemPrompt.trim());
    }
    // 3. Prompt do agente específico (se houver)
    if (agentPrompt) {
      promptParts.push(agentPrompt);
    }
    // 4. System append (instruções extras — contexto de esboço)
    if (systemAppend) {
      promptParts.push(systemAppend);
    }
    // 5. Fallback: base default
    if (promptParts.length === 0) {
      promptParts.push(SYSTEM_BASE);
    }

    // 5. Injetar contexto de sessão (esboço em construção)
    if (session_context && typeof session_context === 'object') {
      const ctx = session_context as Record<string, unknown>;
      const partesCtx: string[] = [
        '# Contexto atual da pregação',
        '',
      ];
      const add = (label: string, key: string) => {
        const val = ctx[key];
        if (typeof val === 'string' && val.trim()) {
          partesCtx.push(`**${label}:** ${val}`);
        }
      };
      add('Título', 'titulo');
      add('Série', 'serie');
      add('Texto Base', 'textoBase');
      add('Tema', 'tema');
      add('Objetivo', 'objetivo');
      add('Público', 'publico');
      add('Resumo', 'resumo');

      const pontos = ctx.pontos as Array<{ texto: string; subpontos: string[]; aplicacoes: string[] }> | undefined;
      if (pontos && pontos.length > 0) {
        partesCtx.push('');
        partesCtx.push('**Estrutura atual:**');
        pontos.forEach((p, i) => {
          partesCtx.push(`${i + 1}. ${p.texto}`);
          p.subpontos?.forEach((sp, j) => {
            partesCtx.push(`   ${String.fromCharCode(97 + j)}) ${sp}`);
          });
          p.aplicacoes?.forEach((app) => {
            partesCtx.push(`   → ${app}`);
          });
        });
      }
      const intro = ctx.introducao as string | undefined;
      if (intro?.trim()) {
        partesCtx.push('');
        partesCtx.push(`**Introdução:** ${intro}`);
      }
      const concl = ctx.conclusao as string | undefined;
      if (concl?.trim()) {
        partesCtx.push('');
        partesCtx.push(`**Conclusão:** ${concl}`);
      }
      partesCtx.push('');
      partesCtx.push('> Use este contexto automaticamente para suas respostas.');

      promptParts.unshift(partesCtx.join('\n'));
    }

    const systemContent = promptParts.join('\n\n');

    const start = Date.now();

    // Chamar provider com rodízio + failover (configs do agente aplicadas)
    // deno-lint-ignore no-explicit-any
    let result: any;
    try {
      const r = await callComRodizio(sbAdmin, {
        messages: messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
        systemContent,
        maxTokens: effectiveMaxTokens,
        temperature: effectiveTemp,
        streaming: stream,
        modelOverride: modelOverrideSermon,
      }, envKey, provider);
      result = r.result;
      effectiveProvider = r.provider;
      effectiveModel = r.model;
    } catch (e) {
      if (e instanceof ProviderError && e.errorCode === 'no_api_key') {
        return jsonError(500, 'no_api_key', 'Nenhuma chave de IA configurada. Cadastre chaves na aba API Keys do painel admin.');
      }
      throw e;
    }

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
