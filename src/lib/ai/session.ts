import Dexie, { type Table } from 'dexie';
import type { ChatMessage, AIResponse } from './provider';

/**
 * Sessão do Assistente Ministerial.
 *
 * Persistência:
 *  - Sessões por usuário (uma por vez nesta versão)
 *  - Mensagens por sessão
 *  - Cache de respostas (chave = hash do input, valor = resposta + custo)
 *  - Stats agregados (tokens total, custo total)
 */

export interface Sessao {
  id: string;
  titulo: string;
  /** Mensagem em edição (fk conceitual) */
  agenteId?: string | null;
  agenteNome?: string | null;
  /** Quando foi criada */
  createdAt: number;
  /** Última atividade */
  updatedAt: number;
}

export interface MensagemPersistida extends ChatMessage {
  id: string;
  sessaoId: string;
  /** Resposta completa do provedor (metadata) */
  resposta?: AIResponse;
}

export interface CacheResposta {
  /** Chave hash do input */
  chave: string;
  /** Resposta cacheada */
  resposta: AIResponse;
  /** Quando foi cacheada */
  cacheadaEm: number;
  /** Quantas vezes foi reutilizada */
  reutilizacoes: number;
}

export interface StatsIA {
  id: 'global';
  tokensTotal: number;
  tokensInput: number;
  tokensOutput: number;
  custoTotalUSD: number;
  requisicoes: number;
  /** Por provedor */
  porProvider: Record<string, { requisicoes: number; tokens: number; custo: number }>;
}

class IADB extends Dexie {
  sessoes!: Table<Sessao, string>;
  mensagens!: Table<MensagemPersistida, string>;
  cache!: Table<CacheResposta, string>;
  stats!: Table<StatsIA, string>;

  constructor() {
    super('PregadorOSIA');
    this.version(1).stores({
      sessoes: '&id, createdAt, updatedAt',
      mensagens: '&id, sessaoId, timestamp, [sessaoId+timestamp]',
      cache: '&chave, cacheadaEm',
      stats: '&id',
    });
  }
}

export const aiDB = new IADB();

/** Hash simples para chave de cache */
export async function hashInput(texto: string): Promise<string> {
  if (!texto) return 'empty';
  const enc = new TextEncoder().encode(texto);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

/** Sessão atual (singleton por enquanto) */
export async function obterOuCriarSessao(mensagemId?: string | null): Promise<Sessao> {
  // Procura sessão mais recente
  let ultima: Sessao | undefined;
  try {
    ultima = await aiDB.sessoes.orderBy('updatedAt').reverse().first();
  } catch {
    try {
      const todas = await aiDB.sessoes.orderBy('createdAt').reverse().limit(1).toArray();
      ultima = todas[0];
    } catch {
      // DB vazio
    }
  }

  // Se a última é da mesma mensagem em edição, reusa
  if (ultima && (!mensagemId || ultima.agenteId === mensagemId)) {
    return ultima;
  }

  // Senão, cria nova
  const nova: Sessao = {
    id: crypto.randomUUID(),
    titulo: '',
    agenteId: mensagemId ?? null,
    agenteNome: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await aiDB.sessoes.add(nova);
  return nova;
}

export async function listarMensagens(sessaoId: string): Promise<MensagemPersistida[]> {
  return aiDB.mensagens.where('sessaoId').equals(sessaoId).sortBy('timestamp');
}

export async function adicionarMensagem(m: MensagemPersistida): Promise<void> {
  await aiDB.mensagens.add(m);
  await aiDB.sessoes.update(m.sessaoId, { updatedAt: Date.now() });
}

/** Lista sessões mais recentes (usado pelo AssistantPage) */
export async function listarSessoesRecentes(limite = 30): Promise<Sessao[]> {
  try {
    return await aiDB.sessoes.orderBy('updatedAt').reverse().limit(limite).toArray();
  } catch {
    try {
      return await aiDB.sessoes.orderBy('createdAt').reverse().limit(limite).toArray();
    } catch {
      return [];
    }
  }
}

export async function limparSessao(sessaoId: string): Promise<void> {
  await aiDB.mensagens.where('sessaoId').equals(sessaoId).delete();
}

export async function buscarCache(chave: string): Promise<CacheResposta | undefined> {
  return aiDB.cache.get(chave);
}

export async function guardarCache(item: CacheResposta): Promise<void> {
  await aiDB.cache.put(item);
}

export async function incrementarReutilizacao(chave: string): Promise<void> {
  const item = await aiDB.cache.get(chave);
  if (item) {
    await aiDB.cache.update(chave, { reutilizacoes: item.reutilizacoes + 1 });
  }
}

export async function obterStats(): Promise<StatsIA> {
  const stats = await aiDB.stats.get('global');
  return (
    stats ?? {
      id: 'global',
      tokensTotal: 0,
      tokensInput: 0,
      tokensOutput: 0,
      custoTotalUSD: 0,
      requisicoes: 0,
      porProvider: {},
    }
  );
}

export async function registrarUso(resp: AIResponse): Promise<void> {
  const stats = await obterStats();
  stats.tokensTotal += resp.tokensTotal;
  stats.tokensInput += resp.tokensInput;
  stats.tokensOutput += resp.tokensOutput;
  stats.custoTotalUSD += resp.custoUSD;
  stats.requisicoes += 1;
  if (!stats.porProvider[resp.provider]) {
    stats.porProvider[resp.provider] = { requisicoes: 0, tokens: 0, custo: 0 };
  }
  stats.porProvider[resp.provider].requisicoes += 1;
  stats.porProvider[resp.provider].tokens += resp.tokensTotal;
  stats.porProvider[resp.provider].custo += resp.custoUSD;
  await aiDB.stats.put(stats);
}