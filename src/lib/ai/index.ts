/**
 * Stub — módulo AI desabilitado na build minimal.
 * As funcionalidades de IA foram removidas para simplificar o app.
 *
 * Para reativar: substituir este stub pela implementação completa com
 * o provider de IA configurado.
 */

import Dexie, { type Table } from 'dexie';

/** Sessão de chat */
export interface Sessao {
  id: string;
  titulo: string;
  agenteId?: string | null;
  agenteNome?: string | null;
  createdAt: number;
  updatedAt: number;
}

/** Mensagem persistida stub */
export interface MensagemPersistida {
  id: string;
  sessaoId: string;
  timestamp: number;
  role: 'user' | 'assistant';
  content: string;
}

/** DB local para cache de IA (agora vazio) */
export class AiDB extends Dexie {
  sessoes!: Table<Sessao, string>;
  mensagens!: Table<MensagemPersistida, string>;
  cache!: Table<unknown, string>;
  stats!: Table<unknown, string>;

  constructor() {
    super('AiDB');
    this.version(1).stores({
      // Índices necessários para queries do código original
      sessoes: '&id, criadaEm, atualizadaEm',
      mensagens: '&id, sessaoId, timestamp, [sessaoId+timestamp]',
      cache: '&chave, cacheadaEm',
      stats: '&id',
    });
  }
}

export const aiDB = new AiDB();

export interface StatsIA {
  requisicoes: number;
  tokensTotal: number;
  custoTotalUSD: number;
  porProvider: Record<string, { requisicoes: number; tokens: number; custo: number }>;
}

/** Retorna stats vazios */
export async function obterStats(): Promise<StatsIA> {
  return { requisicoes: 0, tokensTotal: 0, custoTotalUSD: 0, porProvider: {} };
}

/** Provider stub — sempre indisponível */
export const openaiProvider = {
  pronto: () => Promise.resolve({ ok: false, motivo: 'IA desabilitada' }),
};

/**
 * Lista sessões ordenadas por atualização (mais recente primeiro).
 * Retorna array vazio pois IA está desabilitada.
 */
export async function listarSessoesRecentes(_limite = 20): Promise<Sessao[]> {
  return [];
}

/**
 * Hook-safe: retorna Promise que nunca rejeita.
 */
export async function listarSessoesSegura(): Promise<Sessao[]> {
  return [];
}
