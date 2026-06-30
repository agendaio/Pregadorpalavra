/**
 * Pregador OS — Camada de abstração de IA.
 *
 * Toda comunicação com provedores de IA passa por aqui.
 * Isso permite trocar OpenAI por Anthropic, Ollama, etc.
 * sem mexer em uma linha da UI ou da lógica de produto.
 */

import type { Mensagem } from '@/types/mensagem';

/** Mensagem de conversa (chat-style). */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  /** Quando foi criada (ms) — opcional ao montar prompts */
  timestamp?: number;
  /** Tokens consumidos apenas nesta mensagem */
  tokens?: number;
  /** Metadata opcional */
  meta?: {
    acao?: string;
    contextoResumo?: string;
  };
}

/** Configuração para uma requisição ao provedor */
export interface AIRequest {
  messages: ChatMessage[];
  /** System prompt adicional injetado antes da conversa */
  systemAppend?: string;
  /** Contexto da mensagem em edição (acoplado automaticamente) */
  mensagemContexto?: Mensagem | null;
  /** Limite de tokens pra resposta (max_tokens) */
  maxTokens?: number;
  /** Temperatura (0-2). Default 0.7 */
  temperature?: number;
  /** Se true, faz stream. Default false. */
  stream?: boolean;
  /** Callback pra streaming (token por token) */
  onChunk?: (chunk: string) => void;
  /** Se true, aborta (usado em cancelamento) */
  signal?: AbortSignal;
}

/** Resposta normalizada de qualquer provedor */
export interface AIResponse {
  content: string;
  /** Total de tokens consumidos (input + output) */
  tokensTotal: number;
  tokensInput: number;
  tokensOutput: number;
  /** Modelo usado */
  model: string;
  /** Provedor usado */
  provider: string;
  /** Custo estimado em USD */
  custoUSD: number;
  /** Quando terminou (ms) */
  fimEm: number;
  /** Duração em ms */
  duracaoMs: number;
  /** Pra fins de cache: hash do input (sem stream) */
  cacheKey?: string;
}

/** Metadados do provedor */
export interface ProviderInfo {
  id: string;
  nome: string;
  descricao: string;
  modelos: ModeloInfo[];
  requerChave: boolean;
  /** Se false, não precisa de rede */
  offline: boolean;
}

export interface ModeloInfo {
  id: string;
  nome: string;
  /** Limite de contexto (tokens) */
  contexto: number;
  /** Custo por 1K tokens de input em USD */
  custoInput: number;
  /** Custo por 1K tokens de output em USD */
  custoOutput: number;
  /** Descrição curta */
  descricao?: string;
}

/** Erro de provedor */
export class AIError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'sem-chave'
      | 'rede'
      | 'rate-limit'
      | 'tokens-excedidos'
      | 'provedor-indisponivel'
      | 'resposta-invalida'
      | 'cancelado'
      | 'desconhecido',
    public readonly provider?: string,
  ) {
    super(message);
    this.name = 'AIError';
  }
}

/** Interface que todo provedor deve implementar */
export interface AIProvider {
  info(): ProviderInfo;
  /** Verifica se está pronto pra uso (chave configurada, etc) */
  pronto(): Promise<{ ok: boolean; motivo?: string }>;
  /** Faz uma chamada e retorna a resposta completa */
  enviar(req: AIRequest): Promise<AIResponse>;
  /** Estima tokens de um texto (sem chamar API) */
  estimarTokens(texto: string): number;
}