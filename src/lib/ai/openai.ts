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
    if (!sb) {
      throw new AIError('Supabase não disponível', 'rede', 'openai');
    }

    const inicioMs = Date.now();

    try {
      const { data, error } = await sb.functions.invoke('ai-chat', {
        body: {
          messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
          systemAppend: req.systemAppend ?? '',
          maxTokens: req.maxTokens ?? 2500,
          temperature: req.temperature ?? 0.7,
          stream: false,
        },
      });

      if (error) {
        const { codigo, mensagem, status } = this.extrairErro(error);

        if (codigo === 'invalid_token' || status === 401) {
          throw new AIError('Sessão expirada. Faça login novamente.', 'sem-chave', 'openai');
        }
        if (codigo === 'no_api_key') {
          throw new AIError(
            'IA não configurada. Solicite ao administrador que cadastre uma chave OpenAI em /admin/api-keys.',
            'sem-chave', 'openai',
          );
        }
        if (codigo === 'limit_reached') {
          throw new AIError(
            'Limite mensal de IA atingido. Faça upgrade do plano para continuar.',
            'tokens-excedidos', 'openai',
          );
        }
        throw new AIError('Erro no servidor: ' + mensagem.slice(0, 200), 'desconhecido', 'openai');
      }

      const result = data as {
        content: string;
        provider: string;
        model: string;
        tokensInput: number;
        tokensOutput: number;
        tokensTotal: number;
        custoUSD: number;
        duracaoMs: number;
      };

      if (!result?.content) {
        throw new AIError('Resposta vazia do servidor de IA', 'resposta-invalida', 'openai');
      }

      return {
        content: result.content,
        tokensTotal: result.tokensTotal ?? result.tokensInput + result.tokensOutput,
        tokensInput: result.tokensInput ?? 0,
        tokensOutput: result.tokensOutput ?? 0,
        model: result.model ?? 'gpt-4o-mini',
        provider: result.provider ?? 'openai',
        custoUSD: result.custoUSD ?? 0,
        fimEm: Date.now(),
        duracaoMs: result.duracaoMs ?? (Date.now() - inicioMs),
      };
    } catch (e) {
      if (e instanceof AIError) throw e;

      const err = e as Error & { name?: string };
      if (err.name === 'AbortError' || err.name === 'FunctionsFetchError') {
        const { codigo, mensagem } = this.extrairErro(e);
        if (codigo === 'invalid_token') {
          throw new AIError('Sessão expirada. Faça login novamente.', 'sem-chave', 'openai');
        }
        if (codigo === 'no_api_key') {
          throw new AIError(
            'IA não configurada. Solicite ao administrador que cadastre uma chave OpenAI em /admin/api-keys.',
            'sem-chave', 'openai',
          );
        }
        throw new AIError(mensagem.slice(0, 300), 'rede', 'openai');
      }
      throw new AIError((e as Error).message, 'rede', 'openai');
    }
  }

  estimarTokens(texto: string): number {
    if (!texto) return 0;
    return Math.ceil(texto.length / 3.2);
  }
}

export const openaiProvider = new OpenAIProvider();
export { MODELOS };
