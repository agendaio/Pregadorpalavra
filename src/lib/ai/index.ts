/**
 * AiDB — IndexedDB via Dexie para sessões e mensagens de chat.
 *
 * Persiste sessões de conversa e mensagens no IndexedDB do navegador,
 * permitindo offline-first e carregamento instantâneo.
 */

import Dexie, { type Table } from 'dexie';

// ─── Tipos ──────────────────────────────────────────────────────────────────

/** Sessão de chat */
export interface Sessao {
  id: string;
  titulo: string;
  agenteId?: string | null;
  agenteNome?: string | null;
  createdAt: number;
  updatedAt: number;
}

/** Mensagem persistida */
export interface MensagemPersistida {
  id: string;
  sessaoId: string;
  timestamp: number;
  role: 'user' | 'assistant';
  content: string;
}

/** Cache de resposta */
export interface CacheEntry {
  chave: string;
  valor: string;
  cacheadaEm: number;
}

/** Estatísticas de uso */
export interface StatsEntry {
  id: string;
  requisicoes: number;
  tokensTotal: number;
  custoTotalUSD: number;
  provider: string;
  ultimaRequisicao: number;
}

// ─── DB ─────────────────────────────────────────────────────────────────────

export class AiDB extends Dexie {
  sessoes!: Table<Sessao, string>;
  mensagens!: Table<MensagemPersistida, string>;
  cache!: Table<CacheEntry, string>;
  stats!: Table<StatsEntry, string>;

  constructor() {
    super('PregadorAiDB');
    this.version(1).stores({
      sessoes: '&id, updatedAt',
      mensagens: '&id, sessaoId, timestamp, [sessaoId+timestamp]',
      cache: '&chave, cacheadaEm',
      stats: '&id, provider',
    });
  }
}

export const aiDB = new AiDB();

// ─── Sessões ─────────────────────────────────────────────────────────────────

/**
 * Lista sessões ordenadas por atualização (mais recente primeiro).
 */
export async function listarSessoesRecentes(limite = 20): Promise<Sessao[]> {
  return aiDB.sessoes.orderBy('updatedAt').reverse().limit(limite).toArray();
}

/**
 * Lista sessões — nunca rejeita (retorna [] em caso de erro).
 */
export async function listarSessoesSegura(): Promise<Sessao[]> {
  try {
    return await listarSessoesRecentes();
  } catch {
    return [];
  }
}

/**
 * Busca ou cria sessão ativa.
 */
export async function obterOuCriarSessao(
  sessaoId?: string | null,
  agente?: { id: string; nome: string },
): Promise<Sessao> {
  if (sessaoId) {
    const existente = await aiDB.sessoes.get(sessaoId);
    if (existente) return existente;
  }

  const agora = Date.now();
  const nova: Sessao = {
    id: crypto.randomUUID(),
    titulo: `Conversa ${new Date().toLocaleDateString('pt-BR')}`,
    agenteId: agente?.id ?? null,
    agenteNome: agente?.nome ?? null,
    createdAt: agora,
    updatedAt: agora,
  };
  await aiDB.sessoes.put(nova);
  return nova;
}

/**
 * Atualiza título e timestamp de uma sessão.
 */
export async function atualizarSessao(
  sessaoId: string,
  partial: Partial<Pick<Sessao, 'titulo' | 'agenteId' | 'agenteNome'>>,
): Promise<void> {
  await aiDB.sessoes.update(sessaoId, {
    ...partial,
    updatedAt: Date.now(),
  });
}

/**
 * Exclui sessão e todas as suas mensagens.
 */
export async function excluirSessao(sessaoId: string): Promise<void> {
  await aiDB.transaction('rw', [aiDB.sessoes, aiDB.mensagens], async () => {
    await aiDB.sessoes.delete(sessaoId);
    await aiDB.mensagens.where('sessaoId').equals(sessaoId).delete();
  });
}

// ─── Mensagens ───────────────────────────────────────────────────────────────

/**
 * Lista mensagens de uma sessão, ordenadas por timestamp.
 */
export async function listarMensagens(sessaoId: string): Promise<MensagemPersistida[]> {
  return aiDB.mensagens
    .where('sessaoId')
    .equals(sessaoId)
    .sortBy('timestamp');
}

/**
 * Adiciona mensagem à sessão.
 */
export async function adicionarMensagem(
  sessaoId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<MensagemPersistida> {
  const msg: MensagemPersistida = {
    id: crypto.randomUUID(),
    sessaoId,
    timestamp: Date.now(),
    role,
    content,
  };
  await aiDB.mensagens.put(msg);
  await aiDB.sessoes.update(sessaoId, { updatedAt: Date.now() });
  return msg;
}

/**
 * Atualiza conteúdo de uma mensagem existente.
 */
export async function atualizarMensagem(id: string, content: string): Promise<void> {
  await aiDB.mensagens.update(id, { content });
}

/**
 * Exclui mensagem.
 */
export async function excluirMensagem(id: string): Promise<void> {
  await aiDB.mensagens.delete(id);
}

/**
 * Limpa mensagens de uma sessão (mantém a sessão).
 */
export async function limparMensagens(sessaoId: string): Promise<void> {
  await aiDB.mensagens.where('sessaoId').equals(sessaoId).delete();
}

// ─── Cache ──────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 horas

/**
 * Obtém entrada do cache se ainda válida.
 */
export async function obterCache(chave: string): Promise<string | null> {
  const entry = await aiDB.cache.get(chave);
  if (!entry) return null;
  if (Date.now() - entry.cacheadaEm > CACHE_TTL_MS) {
    await aiDB.cache.delete(chave);
    return null;
  }
  return entry.valor;
}

/**
 * Salva no cache.
 */
export async function salvarCache(chave: string, valor: string): Promise<void> {
  await aiDB.cache.put({ chave, valor, cacheadaEm: Date.now() });
}

/**
 * Limpa cache expirado.
 */
export async function limparCacheExpirado(): Promise<void> {
  const cutoff = Date.now() - CACHE_TTL_MS;
  await aiDB.cache.where('cacheadaEm').below(cutoff).delete();
}

// ─── Stats ──────────────────────────────────────────────────────────────────

/**
 * Obtém estatísticas agregadas de uso.
 */
export async function obterStats(): Promise<{
  requisicoes: number;
  tokensTotal: number;
  custoTotalUSD: number;
  porProvider: Record<string, { requisicoes: number; tokens: number; custo: number }>;
}> {
  const entradas = await aiDB.stats.toArray();
  const porProvider: Record<string, { requisicoes: number; tokens: number; custo: number }> = {};

  let requisicoes = 0;
  let tokensTotal = 0;
  let custoTotalUSD = 0;

  for (const e of entradas) {
    requisicoes += e.requisicoes;
    tokensTotal += e.tokensTotal;
    custoTotalUSD += e.custoTotalUSD;
    if (!porProvider[e.provider]) {
      porProvider[e.provider] = { requisicoes: 0, tokens: 0, custo: 0 };
    }
    porProvider[e.provider].requisicoes += e.requisicoes;
    porProvider[e.provider].tokens += e.tokensTotal;
    porProvider[e.provider].custo += e.custoTotalUSD;
  }

  return { requisicoes, tokensTotal, custoTotalUSD, porProvider };
}

/**
 * Registra uma requisição de IA.
 */
export async function registrarRequisicao(
  provider: string,
  tokens: number,
  custoUSD: number,
): Promise<void> {
  const id = `${provider}-${new Date().toISOString().slice(0, 7)}`; // mensal
  const existing = await aiDB.stats.get(id);
  if (existing) {
    await aiDB.stats.update(id, {
      requisicoes: existing.requisicoes + 1,
      tokensTotal: existing.tokensTotal + tokens,
      custoTotalUSD: existing.custoTotalUSD + custoUSD,
      ultimaRequisicao: Date.now(),
    });
  } else {
    await aiDB.stats.put({
      id,
      provider,
      requisicoes: 1,
      tokensTotal: tokens,
      custoTotalUSD: custoUSD,
      ultimaRequisicao: Date.now(),
    });
  }
}

// ─── Re-exports para compatibilidade de módulos ──────────────────────────────

// Tipos de ações rápidas (AIPanel, etc.)
export type { AcaoIA } from './types';
export { ACOES_IA } from './types';

// ChatMessage (vários componentes)
export type { ChatMessage } from './provider';

// Router e provider
export { enviarComFallback } from './router';
export { openaiProvider, OpenAIProvider } from './openai';
export { localProvider, LocalProvider } from './local';
export type { ProviderId } from './router';

// Agent
export { construirMensagens, SYSTEM_APPENDS } from './agent';
export { SYSTEM_PROMPT, CONTEXT_INSTRUCTION } from './prompt';

// contextoMensagem (agent.ts e local.ts)
export { contextoMensagem } from './contexto';

// Stats para SettingsPage
export interface StatsIA {
  requisicoes: number;
  tokensTotal: number;
  custoTotalUSD: number;
  porProvider: Record<string, { requisicoes: number; tokens: number; custo: number }>;
}
