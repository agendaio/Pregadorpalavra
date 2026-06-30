import type {
  AIProvider,
  AIRequest,
  AIResponse,
  ProviderInfo,
  ModeloInfo,
} from './provider';
import { AIError } from './provider';

/**
 * Provider OpenAI / ChatGPT.
 *
 * Acesso direto via API REST. Em produção ideal, isso deveria passar por
 * uma Edge Function (Supabase) para não expor a chave ao cliente. Por
 * enquanto (MVP), a chave fica em localStorage + env var e o usuário é
 * avisado na Settings.
 */

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const MODELOS: ModeloInfo[] = [
  {
    id: 'gpt-4o-mini',
    nome: 'GPT-4o mini',
    contexto: 128_000,
    custoInput: 0.00015,
    custoOutput: 0.0006,
    descricao: 'Rápido, barato, bom pra 90% das tarefas ministeriais.',
  },
  {
    id: 'gpt-4o',
    nome: 'GPT-4o',
    contexto: 128_000,
    custoInput: 0.0025,
    custoOutput: 0.01,
    descricao: 'Modelo completo. Melhor raciocínio teológico, contexto longo.',
  },
  {
    id: 'gpt-4-turbo',
    nome: 'GPT-4 Turbo',
    contexto: 128_000,
    custoInput: 0.01,
    custoOutput: 0.03,
    descricao: 'Top de linha pra exegese profunda e séries longas.',
  },
  {
    id: 'gpt-3.5-turbo',
    nome: 'GPT-3.5 Turbo',
    contexto: 16_385,
    custoInput: 0.0005,
    custoOutput: 0.0015,
    descricao: 'Econômico, contexto curto. Pra textos pequenos.',
  },
];

const CHAVE_STORAGE = 'pregador.openai.key';
const MODELO_STORAGE = 'pregador.openai.model';

export class OpenAIProvider implements AIProvider {
  info(): ProviderInfo {
    return {
      id: 'openai',
      nome: 'ChatGPT (OpenAI)',
      descricao: 'Modelos GPT-4o e GPT-4o mini. Requer chave de API.',
      modelos: MODELOS,
      requerChave: true,
      offline: false,
    };
  }

  async pronto(): Promise<{ ok: boolean; motivo?: string }> {
    const chave = this.obterChave();
    if (!chave) return { ok: false, motivo: 'Chave da API não configurada. Vá em Configurações > IA.' };
    if (!chave.startsWith('sk-')) return { ok: false, motivo: 'Chave da API inválida (esperado prefixo sk-).' };
    return { ok: true };
  }

  obterChave(): string | null {
    return (
      (import.meta.env.VITE_OPENAI_API_KEY as string | undefined) ||
      localStorage.getItem(CHAVE_STORAGE) ||
      null
    );
  }

  obterModelo(): string {
    return localStorage.getItem(MODELO_STORAGE) || 'gpt-4o-mini';
  }

  async enviar(req: AIRequest): Promise<AIResponse> {
    const pr = await this.pronto();
    if (!pr.ok) {
      throw new AIError(pr.motivo ?? 'Provedor indisponível', 'sem-chave', 'openai');
    }

    const inicioMs = Date.now();
    const modelo = this.obterModelo();
    const infoModelo = MODELOS.find((m) => m.id === modelo) ?? MODELOS[0];

    const body = {
      model: modelo,
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: req.maxTokens ?? 2000,
      temperature: req.temperature ?? 0.7,
      stream: !!req.stream,
    };

    let response: Response;
    try {
      response = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.obterChave()}`,
        },
        body: JSON.stringify(req.stream ? { ...body, stream: true } : body),
        signal: req.signal,
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        throw new AIError('Requisição cancelada pelo usuário', 'cancelado', 'openai');
      }
      throw new AIError(`Falha de rede: ${(e as Error).message}`, 'rede', 'openai');
    }

    if (!response.ok) {
      let mensagem = `HTTP ${response.status}`;
      try {
        const errBody = await response.json();
        mensagem = errBody.error?.message ?? mensagem;
      } catch {
        // corpo vazio
      }

      if (response.status === 401) throw new AIError('Chave da API inválida ou expirada', 'sem-chave', 'openai');
      if (response.status === 429) throw new AIError('Limite de requisições atingido. Tente em alguns segundos.', 'rate-limit', 'openai');
      if (response.status === 402) throw new AIError('Créditos esgotados na OpenAI', 'sem-chave', 'openai');
      throw new AIError(mensagem, 'desconhecido', 'openai');
    }

    if (req.stream && req.onChunk) {
      return this.consumirStream(response, req, infoModelo, inicioMs);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    if (!choice?.message?.content) {
      throw new AIError('Resposta vazia do provedor', 'resposta-invalida', 'openai');
    }

    const tokensInput = data.usage?.prompt_tokens ?? this.estimarTokens(req.messages.map((m) => m.content).join('\n'));
    const tokensOutput = data.usage?.completion_tokens ?? this.estimarTokens(choice.message.content);

    return {
      content: choice.message.content,
      tokensTotal: tokensInput + tokensOutput,
      tokensInput,
      tokensOutput,
      model: modelo,
      provider: 'openai',
      custoUSD: (tokensInput / 1000) * infoModelo.custoInput + (tokensOutput / 1000) * infoModelo.custoOutput,
      fimEm: Date.now(),
      duracaoMs: Date.now() - inicioMs,
    };
  }

  private async consumirStream(
    response: Response,
    req: AIRequest,
    infoModelo: ModeloInfo,
    inicioMs: number,
  ): Promise<AIResponse> {
    if (!response.body) throw new AIError('Stream vazio', 'resposta-invalida', 'openai');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let acumulado = '';
    let tokensEstimadosOutput = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // OpenAI envia SSE: linhas "data: {...}" separadas por \n\n
      const linhas = buffer.split('\n');
      buffer = linhas.pop() ?? '';

      for (const linha of linhas) {
        const t = linha.trim();
        if (!t.startsWith('data:')) continue;
        const data = t.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const obj = JSON.parse(data);
          const delta = obj.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            acumulado += delta;
            tokensEstimadosOutput += this.estimarTokens(delta);
            req.onChunk?.(acumulado);
          }
        } catch {
          // linha inválida, ignora
        }
      }
    }

    const tokensInput = this.estimarTokens(req.messages.map((m) => m.content).join('\n'));

    return {
      content: acumulado,
      tokensTotal: tokensInput + tokensEstimadosOutput,
      tokensInput,
      tokensOutput: tokensEstimadosOutput,
      model: infoModelo.id,
      provider: 'openai',
      custoUSD: (tokensInput / 1000) * infoModelo.custoInput + (tokensEstimadosOutput / 1000) * infoModelo.custoOutput,
      fimEm: Date.now(),
      duracaoMs: Date.now() - inicioMs,
    };
  }

  /** Estimativa simples: ~4 chars por token em inglês, ~3 em PT. */
  estimarTokens(texto: string): number {
    if (!texto) return 0;
    return Math.ceil(texto.length / 3.2);
  }
}

export const openaiProvider = new OpenAIProvider();
export { CHAVE_STORAGE, MODELO_STORAGE };
export { MODELOS };