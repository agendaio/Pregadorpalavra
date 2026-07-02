/**
 * Vercel Edge Function — Chat Mode (Ultra-rápido)
 *
 * Bypassa o cold start do Supabase (~8s) indo direto pro OpenAI.
 * Cold start do Edge: ~50ms.
 *
 * rota: GET/POST /api/chat-fast
 * Body: { messages, systemPrompt, stream }
 */

export const runtime = 'edge';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RequestBody {
  messages: ChatMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

// ─── Cache inteligente em memória (Edge Runtime) ───────────────────────────
// Sobrevive entre requisições no mesmo container Edge.
// TTL: 5 minutos. Limite: 100 entradas (FIFO).

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 100;

interface CacheEntry {
  value: string;
  expires: number;
}

// globalThis persiste entre invocações no mesmo container Edge
const _g = globalThis as unknown as {
  __chat_fast_cache?: Map<string, CacheEntry>;
};
const cache = _g.__chat_fast_cache ?? new Map<string, CacheEntry>();
_g.__chat_fast_cache = cache;

function cacheKey(messages: ChatMessage[], systemPrompt: string): string {
  const lastUser = messages.filter(m => m.role === 'user').at(-1)?.content ?? '';
  const norm = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  return `${norm(systemPrompt).slice(0, 80)}|${norm(lastUser)}`;
}

function cacheGet(k: string): string | null {
  const e = cache.get(k);
  if (!e) return null;
  if (Date.now() > e.expires) { cache.delete(k); return null; }
  return e.value;
}

function cacheSet(k: string, v: string): void {
  if (cache.size >= CACHE_MAX) {
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
  }
  cache.set(k, { value: v, expires: Date.now() + CACHE_TTL_MS });
}

export async function GET(request: Request): Promise<Response> {
  return new Response('Use POST', { status: 405 });
}

export async function POST(request: Request): Promise<Response> {
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type',
      },
    });
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const {
    messages,
    systemPrompt = '',
    temperature = 0.7,
    maxTokens = 600,
    model = 'gpt-4o-mini',
  } = body;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ─── Montar messages array ─────────────────────────────────────────────
  const fullMessages: ChatMessage[] = [];
  if (systemPrompt) {
    fullMessages.push({ role: 'system', content: systemPrompt });
  }
  fullMessages.push(...messages);

  // ─── Cache check (apenas para non-streaming) ───────────────────────────
  const stream = request.headers.get('x-stream') === 'true';
  if (!stream) {
    const ck = cacheKey(messages, systemPrompt);
    const cached = cacheGet(ck);
    if (cached) {
      return new Response(JSON.stringify({ content: cached, cached: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'X-Cache': 'HIT',
        },
      });
    }
  }

  // ─── OpenAI API (streaming) ──────────────────────────────────────────────
  try {
    const openAIStream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
    });

    if (!openAIStream.ok) {
      const errText = await openAIStream.text();
      return new Response(JSON.stringify({ error: `OpenAI error ${openAIStream.status}`, detail: errText }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!openAIStream.body) {
      return new Response(JSON.stringify({ error: 'empty_stream' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!stream) {
      // Non-streaming: acumula tudo e retorna
      const reader = openAIStream.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          // Parse SSE lines
          const lines = chunk.split('\n');
          for (const line of lines) {
            const data = line.replace(/^data:\s*/, '');
            if (!data || data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) fullContent += delta;
            } catch { /* skip */ }
          }
        }
      }
      if (fullContent) {
        const ck = cacheKey(messages, systemPrompt);
        cacheSet(ck, fullContent);
      }
      return new Response(JSON.stringify({ content: fullContent }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Streaming: transforma eventos OpenAI em SSE pro frontend
    const streamBody = openAIStream.body;
    const encoder = new TextEncoder();
    let fullContent = '';
    let cached = false;

    const transformStream = new ReadableStream({
      async start(controller) {
        const reader = streamBody.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              const data = line.replace(/^data:\s*/, '');
              if (!data || data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  // Manda cada token como evento SSE
                  const sseData = `data: ${JSON.stringify({ content: delta })}\n\n`;
                  controller.enqueue(encoder.encode(sseData));
                }
              } catch { /* skip malformed */ }
            }
          }
        } finally {
          // Ao terminar, guarda no cache e manda [DONE]
          if (fullContent) {
            const ck = cacheKey(messages, systemPrompt);
            cacheSet(ck, fullContent);
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(transformStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'X-Cache': cached ? 'HIT' : 'MISS',
      },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown_error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
