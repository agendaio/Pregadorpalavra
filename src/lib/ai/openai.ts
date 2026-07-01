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

    // Testa se a Edge Function responde
    try {
      const { data, error } = await sb.functions.invoke('ai-chat', {
        body: {
          messages: [{ role: 'user', content: 'teste' }],
          maxTokens: 5,
        },
      });

      if (error) {
        const errStr = String(error);
        // Erro de API key não configurada pelo admin
        if (errStr.includes('no_api_key')) {
          return {
            ok: false,
            motivo: 'IA não configurada pelo administrador. '
              + 'Acesse /admin/api-keys para cadastrar uma chave OpenAI.',
          };
        }
        return { ok: false, motivo: 'Erro na Edge Function: ' + errStr.slice(0, 200) };
      }

      return { ok: true };
    } catch (e) {
      const err = e as Error & { name?: string };
      // FunctionsFetchError não estende Error — verifica por nome
      if (err.name === 'FunctionsFetchError' || err.name === 'AbortError') {
        const msg = (e as Error).message;
        if (msg.includes('no_api_key')) {
          return {
            ok: false,
            motivo: 'IA não configurada pelo administrador. '
              + 'Acesse /admin/api-keys para cadastrar uma chave OpenAI.',
          };
        }
        return { ok: false, motivo: 'Falha de conexão com o servidor: ' + msg.slice(0, 200) };
      }
      return { ok: false, motivo: 'Falha de conexão com o servidor: ' + (e as Error).message };
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
        const errStr = String(error);
        if (errStr.includes('no_api_key')) {
          throw new AIError(
            'IA não configurada. Solicite ao administrador que cadastre uma chave OpenAI em /admin/api-keys.',
            'sem-chave',
            'openai',
          );
        }
        if (errStr.includes('limit_reached')) {
          throw new AIError(
            'Limite mensal de IA atingido. Faça upgrade do plano para continuar.',
            'tokens-excedidos',
            'openai',
          );
        }
        if (errStr.includes('invalid_token')) {
          throw new AIError('Sessão expirada. Faça login novamente.', 'sem-chave', 'openai');
        }
        throw new AIError('Erro na Edge Function: ' + errStr.slice(0, 200), 'desconhecido', 'openai');
      }

      // A Edge Function retorna { content, provider, model, tokensInput, tokensOutput, tokensTotal, custoUSD, duracaoMs }
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

      const err = e as Error & { name?: string; cause?: unknown };
      // FunctionsFetchError do Supabase (não estende Error — instanceof Error falha)
      // AbortError do fetch/abort
      if (err.name === 'AbortError' || err.name === 'FunctionsFetchError') {
        const msg = err.message ?? String(e);
        if (msg.includes('no_api_key')) {
          throw new AIError(
            'IA não configurada. Solicite ao administrador que cadastre uma chave OpenAI em /admin/api-keys.',
            'sem-chave',
            'openai',
          );
        }
        throw new AIError(msg.slice(0, 300), 'rede', 'openai');
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
