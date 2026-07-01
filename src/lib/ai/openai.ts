import type {
  AIProvider,
  AIRequest,
  AIResponse,
  ProviderInfo,
  ModeloInfo,
} from './provider';
import { AIError } from './provider';
import { supabase, SUPABASE_CONFIGURED } from '@/lib/supabase';

/**
 * Provider que chama a Edge Function "ai-chat" no Supabase.
 *
 * A Edge Function é server-side e lê a API key da tabela api_keys
 * no banco — o usuário final NUNCA vê ou fornece a chave.
 *
 * O JWT do usuário autenticado é passado no Authorization header.
 */

const MODELOS: ModeloInfo[] = [
  {
    id: 'gpt-4o-mini',
    nome: 'GPT-4o mini',
    contexto: 128_000,
    custoInput: 0.00015,
    custoOutput: 0.0006,
    descricao: 'Rápido e barato. Ideal para 90% das tarefas ministeriais.',
  },
  {
    id: 'gpt-4o',
    nome: 'GPT-4o',
    contexto: 128_000,
    custoInput: 0.0025,
    custoOutput: 0.01,
    descricao: 'Modelo completo. Melhor raciocínio teológico e contexto longo.',
  },
  {
    id: 'gpt-4-turbo',
    nome: 'GPT-4 Turbo',
    contexto: 128_000,
    custoInput: 0.01,
    custoOutput: 0.03,
    descricao: 'Top de linha para exegese profunda e séries longas.',
  },
];

export class OpenAIProvider implements AIProvider {
  info(): ProviderInfo {
    return {
      id: 'openai',
      nome: 'Assistente Ministerial',
      descricao: 'IA real via Edge Function. Chave centralizada pelo administrador — usuário não configura nada.',
      modelos: MODELOS,
      requerChave: false,
      offline: false,
    };
  }

  /** Extrai o código de erro da resposta — funciona tanto com error plain object quanto com Error nativo */
  private extrairErro(error: unknown): { codigo: string; mensagem: string; status?: number } {
    if (!error) return { codigo: '', mensagem: '' };

    // FunctionsHttpError do Supabase JS: { message, status, context: { body, status } }
    const ctx = (error as { context?: { body?: unknown; status?: number } }).context;
    const errBody = ctx?.body;
    const status = ctx?.status ?? (error as { status?: number }).status;

    // Tenta extrair do body (pode ser string JSON ou object)
    let bodyObj: Record<string, unknown> | null = null;
    if (typeof errBody === 'string') {
      try { bodyObj = JSON.parse(errBody); } catch { bodyObj = { message: errBody }; }
    } else if (errBody && typeof errBody === 'object') {
      bodyObj = errBody as Record<string, unknown>;
    }

    const codigo = (bodyObj?.error as string) ?? '';
    const msgRaw = (bodyObj?.message as string) ?? String(error).slice(0, 300);
    return { codigo, mensagem: msgRaw, status };
  }

  async pronto(): Promise<{ ok: boolean; motivo?: string }> {
    if (!SUPABASE_CONFIGURED) {
      return {
        ok: false,
        motivo: 'Conexão Supabase não disponível. '
          + 'Verifique se o app está online e o Supabase está configurado.',
      };
    }
    const sb = supabase();
    if (!sb) return { ok: false, motivo: 'Cliente Supabase não disponível.' };

    try {
      const { data, error } = await sb.functions.invoke('ai-chat', {
        body: { messages: [{ role: 'user', content: 'teste' }], maxTokens: 5 },
      });

      if (error) {
        const { codigo, mensagem, status } = this.extrairErro(error);

        if (codigo === 'invalid_token' || status === 401) {
          return {
            ok: false,
            motivo: 'Sessão expirada. Faça login novamente.',
          };
        }
        if (codigo === 'no_api_key') {
          return {
            ok: false,
            motivo: 'IA não configurada pelo administrador. Acesse /admin/api-keys para cadastrar uma chave OpenAI.',
          };
        }
        return { ok: false, motivo: 'Erro no servidor: ' + mensagem.slice(0, 200) };
      }
      return { ok: true };
    } catch (e) {
      const err = e as Error & { name?: string };
      if (err.name === 'FunctionsFetchError' || err.name === 'AbortError') {
        const { codigo, mensagem } = this.extrairErro(e);
        if (codigo === 'invalid_token') {
          return { ok: false, motivo: 'Sessão expirada. Faça login novamente.' };
        }
        if (codigo === 'no_api_key') {
          return { ok: false, motivo: 'IA não configurada pelo administrador. Acesse /admin/api-keys para cadastrar uma chave OpenAI.' };
        }
        return { ok: false, motivo: 'Falha de conexão: ' + mensagem.slice(0, 200) };
      }
      return { ok: false, motivo: 'Falha de conexão: ' + (e as Error).message.slice(0, 200) };
    }
  }

  async enviar(req: AIRequest): Promise<AIResponse> {
    const sb = supabase();
    if (!sb) throw new AIError("Supabase nao disponivel", "rede", "openai");

    const inicioMs = Date.now();
    const querStream = req.stream === true && typeof req.onChunk === "function";

    // Pega JWT da sessao atual (Edge Function exige Authorization)
    const { data: { session } } = await sb.auth.getSession();
    const jwt = session?.access_token;
    if (!jwt) throw new AIError("Sessao expirada. Faca login novamente.", "sem-chave", "openai");

    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
    const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
    if (!supabaseUrl || !anonKey) throw new AIError("Configuracao Supabase ausente", "rede", "openai");

    const body = JSON.stringify({
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
      systemAppend: req.systemAppend ?? "",
      maxTokens: req.maxTokens ?? 2500,
      temperature: req.temperature ?? 0.7,
      stream: querStream,
      agente_id: (req as { agenteId?: string }).agenteId ?? null,
    });

    const fetchOpts: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwt}`,
        "apikey": anonKey,
      },
      body,
      signal: req.signal,
    };

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, fetchOpts);

      if (!res.ok) {
        const errorBody = await res.text().catch(() => "");
        let parsed: { error?: string; message?: string } = {};
        try { parsed = JSON.parse(errorBody); } catch { parsed = { message: errorBody }; }
        const codigo = parsed.error ?? "";
        const mensagem = parsed.message ?? errorBody;

        if (codigo === "invalid_token" || res.status === 401) throw new AIError("Sessao expirada.", "sem-chave", "openai");
        if (codigo === "no_api_key") throw new AIError("IA nao configurada. Cadastre chave em /admin/api-keys.", "sem-chave", "openai");
        if (codigo === "limit_reached" || res.status === 429) throw new AIError("Limite mensal de IA atingido.", "tokens-excedidos", "openai");
        throw new AIError("Erro no servidor: " + mensagem.slice(0, 300), "desconhecido", "openai");
      }

      // ---- STREAMING (SSE) ----
      if (querStream) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new AIError("Stream indisponivel", "resposta-invalida", "openai");

        let buffer = "";
        let accumulated = "";
        let provider = "openai";
        let model = "gpt-4o-mini";
        let tokensInput = 0;
        let tokensOutput = 0;
        let custoUSD = 0;
        let erroMsg: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const evt of events) {
            const data = evt.replace(/^data:\s*/, "").trim();
            if (!data || data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data) as {
                content?: string; done?: boolean; error?: string; message?: string;
                provider?: string; model?: string; tokensInput?: number;
                tokensOutput?: number; custoUSD?: number;
              };
              if (parsed.error) { erroMsg = parsed.message ?? parsed.error; break; }
              if (parsed.content) {
                accumulated += parsed.content;
                req.onChunk?.(parsed.content);
              }
              if (parsed.done) {
                provider = parsed.provider ?? provider;
                model = parsed.model ?? model;
                tokensInput = parsed.tokensInput ?? 0;
                tokensOutput = parsed.tokensOutput ?? 0;
                custoUSD = parsed.custoUSD ?? 0;
              }
            } catch { /* skip */ }
          }
        }

        if (erroMsg) {
          if (erroMsg.includes("no_api_key")) throw new AIError("IA nao configurada.", "sem-chave", "openai");
          if (erroMsg.includes("limit_reached")) throw new AIError("Limite atingido.", "tokens-excedidos", "openai");
          throw new AIError(erroMsg.slice(0, 300), "desconhecido", "openai");
        }

        return {
          content: accumulated,
          tokensTotal: tokensInput + tokensOutput,
          tokensInput, tokensOutput, model, provider, custoUSD,
          fimEm: Date.now(),
          duracaoMs: Date.now() - inicioMs,
        };
      }

      // ---- NON-STREAMING ----
      const result = await res.json() as {
        content: string; provider: string; model: string;
        tokensInput: number; tokensOutput: number; tokensTotal: number;
        custoUSD: number; duracaoMs: number;
      };

      if (!result?.content) throw new AIError("Resposta vazia do servidor", "resposta-invalida", "openai");

      return {
        content: result.content,
        tokensTotal: result.tokensTotal ?? result.tokensInput + result.tokensOutput,
        tokensInput: result.tokensInput ?? 0,
        tokensOutput: result.tokensOutput ?? 0,
        model: result.model ?? "gpt-4o-mini",
        provider: result.provider ?? "openai",
        custoUSD: result.custoUSD ?? 0,
        fimEm: Date.now(),
        duracaoMs: result.duracaoMs ?? (Date.now() - inicioMs),
      };
    } catch (e) {
      if (e instanceof AIError) throw e;
      const err = e as Error & { name?: string };
      if (err.name === "AbortError") throw new AIError("Cancelado", "cancelado", "openai");
      throw new AIError((e as Error).message ?? "Erro desconhecido", "rede", "openai");
    }
  }

  estimarTokens(texto: string): number {
    if (!texto) return 0;
    return Math.ceil(texto.length / 3.2);
  }
}

export const openaiProvider = new OpenAIProvider();
export { MODELOS };
