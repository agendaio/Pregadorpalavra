/**
 * Pregador OS — Camada de Sincronização
 *
 * Arquitetura: offline-first.
 *  1. Salva no IndexedDB imediatamente (sempre funciona offline)
 *  2. Em background, sincroniza com Supabase
 *  3. Conflict resolution: last-write-wins (updatedEm maior vence)
 *
 * Cada store que precisa de sync chama `sync.push(tabela, id, operacao)`
 * e o sync worker processa a fila em background.
 */

import { supabase, SUPABASE_CONFIGURED } from '@/lib/supabase';
import type { Mensagem, Serie, Tag } from '@/types/mensagem';

// ─── Tipos ─────────────────────────────────────────────────────────────────

type Tabela = 'mensagens' | 'series' | 'tags' | 'estudos' | 'analises';

interface SyncItem {
  tabela: Tabela;
  id: string;
  operacao: 'upsert' | 'delete';
  payload?: unknown;
  timestamp: number;
}

// ─── Fila offline ────────────────────────────────────────────────────────────

/** Chave no localStorage pra fila de sync pendente */
const QUEUE_KEY = 'pregador.syncQueue';

/** Pega a fila atual do localStorage */
function getQueue(): SyncItem[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

/** Salva a fila no localStorage */
function saveQueue(q: SyncItem[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

/** Adiciona um item na fila de sync */
export function queueSync(tabela: Tabela, id: string, operacao: 'upsert' | 'delete', payload?: unknown): void {
  const q = getQueue();
  // Remove entradas anteriores do mesmo registro (evita duplicatas)
  const filtrada = q.filter((i) => !(i.tabela === tabela && i.id === id));
  filtrada.push({ tabela, id, operacao, payload, timestamp: Date.now() });
  saveQueue(filtrada.slice(-200)); // limite de 200 itens na fila
}

// ─── Converter formato local → formato Supabase ──────────────────────────────

/** Pega o user_id do usuário autenticado */
async function getUserId(): Promise<string | null> {
  if (!SUPABASE_CONFIGURED) return null;
  const sb = supabase();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mensagemToDb(m: Mensagem, userId: string): Record<string, any> {
  return {
    id: m.id,
    user_id: userId,
    titulo: m.titulo,
    categoria: m.categoria ?? 'sermão',
    tema: m.tema,
    texto_base: m.textoBase,
    objetivo: m.objetivo,
    publico: m.publico,
    ocasiao: m.ocasiao,
    livro_biblico: m.livroBiblico,
    personagens: m.personagens ?? [],
    versiculos_json: JSON.stringify(m.versiculos ?? []),
    referencias_json: JSON.stringify(m.referenciasCruzadas ?? []),
    comentarios: m.comentarios,
    contexto_historico: m.contextoHistorico,
    aplicacoes: m.aplicacoes ?? [],
    ilustracoes: m.ilustracoes ?? [],
    testemunhos: m.testemunhos ?? [],
    frases_marcantes: m.frasesMarcantes ?? [],
    perguntas: m.perguntas ?? [],
    desafios: m.desafios ?? [],
    dinamica: m.dinamica,
    oracao: m.oracao,
    conclusao: m.conclusao,
    tempo_estimado: m.tempoEstimado ?? 30,
    observacoes: m.observacoes,
    esboco: m.esboco,
    conteudo: m.conteudo,
    slides_json: JSON.stringify(m.slides ?? []),
    arquivos_json: JSON.stringify(m.arquivos ?? []),
    igreja: m.igreja ?? null,
    data_pregacao: m.dataPregacao ? new Date(m.dataPregacao).toISOString() : null,
    tags: m.tags ?? [],
    favorita: m.favorita ?? false,
    status: m.status ?? 'rascunho',
    versao: m.versao ?? 1,
    device_id: m.deviceId ?? null,
    synced_at: new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbToMensagem(row: Record<string, any>): Mensagem {
  return {
    id: row.id,
    titulo: row.titulo ?? '',
    categoria: row.categoria ?? 'sermão',
    tema: row.tema ?? '',
    textoBase: row.texto_base ?? '',
    objetivo: row.objetivo ?? '',
    publico: row.publico ?? '',
    ocasiao: row.ocasiao ?? '',
    serie: row.serie_id ?? null,
    livroBiblico: row.livro_biblico ?? '',
    personagens: row.personagens ?? [],
    versiculos: (() => { try { return JSON.parse(row.versiculos_json ?? '[]'); } catch { return []; } })(),
    referenciasCruzadas: (() => { try { return JSON.parse(row.referencias_json ?? '[]'); } catch { return []; } })(),
    comentarios: row.comentarios ?? '',
    contextoHistorico: row.contexto_historico ?? '',
    aplicacoes: row.aplicacoes ?? [],
    ilustracoes: row.ilustracoes ?? [],
    testemunhos: row.testemunhos ?? [],
    frasesMarcantes: row.frases_marcantes ?? [],
    perguntas: row.perguntas ?? [],
    desafios: row.desafios ?? [],
    dinamica: row.dinamica ?? '',
    oracao: row.oracao ?? '',
    conclusao: row.conclusao ?? '',
    tempoEstimado: row.tempo_estimado ?? 30,
    observacoes: row.observacoes ?? '',
    esboco: row.esboco ?? '',
    conteudo: row.conteudo ?? '',
    slides: (() => { try { return JSON.parse(row.slides_json ?? '[]'); } catch { return []; } })(),
    arquivos: (() => { try { return JSON.parse(row.arquivos_json ?? '[]'); } catch { return []; } })(),
    igreja: row.igreja ?? undefined,
    dataPregacao: row.data_pregacao ? new Date(row.data_pregacao).getTime() : null,
    tags: row.tags ?? [],
    favorita: row.favorita ?? false,
    status: row.status ?? 'rascunho',
    versao: row.versao ?? 1,
    deviceId: row.device_id ?? undefined,
    criadoEm: row.criado_em ? new Date(row.criado_em).getTime() : Date.now(),
    atualizadoEm: row.atualizado_em ? new Date(row.atualizado_em).getTime() : Date.now(),
  };
}

// ─── Sync worker ─────────────────────────────────────────────────────────────

let syncRunning = false;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Processa um item da fila de sync.
 * Se falhar, deixa na fila pra tentar novamente depois.
 */
async function processarItem(item: SyncItem): Promise<boolean> {
  if (!SUPABASE_CONFIGURED) return false;
  const sb = supabase();
  if (!sb) return false;

  try {
    if (item.tabela === 'mensagens') {
      if (item.operacao === 'delete') {
        await sb.from('mensagens').delete().eq('id', item.id);
      } else {
        const userId = await getUserId();
        if (!userId) { console.warn('[sync] sem usuário logado, pulando mensagem'); return false; }
        const payload = mensagemToDb(item.payload as Mensagem, userId);
        const { error } = await sb.from('mensagens').upsert(payload, { onConflict: 'id' });
        if (error) { console.warn('[sync] upsert mensagem erro:', error.message); return false; }
      }
    } else if (item.tabela === 'series') {
      if (item.operacao === 'delete') {
        await sb.from('series').delete().eq('id', item.id);
      } else {
        const userId = await getUserId();
        if (!userId) return false;
        const { error } = await sb.from('series').upsert({ ...item.payload as Record<string, unknown>, user_id: userId }, { onConflict: 'id' });
        if (error) { console.warn('[sync] upsert serie erro:', error.message); return false; }
      }
    } else if (item.tabela === 'tags') {
      if (item.operacao === 'delete') {
        await sb.from('tags').delete().eq('id', item.id);
      } else {
        const userId = await getUserId();
        if (!userId) return false;
        const { error } = await sb.from('tags').upsert({ ...item.payload as Record<string, unknown>, user_id: userId }, { onConflict: 'id' });
        if (error) { console.warn('[sync] upsert tag erro:', error.message); return false; }
      }
    } else if (item.tabela === 'estudos') {
      if (item.operacao === 'delete') {
        await sb.from('estudos').delete().eq('id', item.id);
      } else {
        const userId = await getUserId();
        if (!userId) return false;
        const { error } = await sb.from('estudos').upsert({ ...item.payload as Record<string, unknown>, user_id: userId }, { onConflict: 'id' });
        if (error) { console.warn('[sync] upsert estudo erro:', error.message); return false; }
      }
    }
    return true;
  } catch (e) {
    console.warn('[sync] erro processar item:', (e as Error).message);
    return false;
  }
}

/**
 * Processa toda a fila de sync pendente.
 * Chamado automaticamente em background, ou manualmente via `forceSync()`.
 */
export async function processarFila(): Promise<{ synced: number; failed: number }> {
  if (syncRunning) return { synced: 0, failed: 0 };
  syncRunning = true;

  const q = getQueue();
  let synced = 0;
  let failed = 0;
  const novaFila: SyncItem[] = [];

  for (const item of q) {
    const ok = await processarItem(item);
    if (ok) {
      synced++;
    } else {
      // Tenta de novo na próxima rodada
      failed++;
      novaFila.push(item);
    }
  }

  saveQueue(novaFila);
  syncRunning = false;
  return { synced, failed };
}

/**
 * Força uma sincronização imediata da fila pendente.
 */
export async function forceSync(): Promise<{ synced: number; failed: number }> {
  return processarFila();
}

/**
 * Agenda sync em background (debounce de 2s).
 * Múltiplas chamadas em sequência só disparam uma vez.
 */
export function scheduleSync(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void processarFila();
  }, 2000);
}

/**
 * Carrega dados do Supabase (pull) — chamado no startup se online.
 * Retorna mapa de id → updatedEm para detecção de conflitos.
 */
export async function pullMensagens(): Promise<Map<string, number>> {
  const mapa = new Map<string, number>();
  if (!SUPABASE_CONFIGURED) return mapa;
  const sb = supabase();
  if (!sb) return mapa;

  try {
    const { data, error } = await sb
      .from('mensagens')
      .select('id, atualizado_em, versao')
      .order('atualizado_em', { ascending: false })
      .limit(1000);

    if (!error && data) {
      for (const row of data as { id: string; atualizado_em: string; versao: number }[]) {
        const ts = row.atualizado_em ? new Date(row.atualizado_em).getTime() : 0;
        mapa.set(row.id, ts);
      }
    }
  } catch (e) {
    console.warn('[sync] pullMensagens erro:', (e as Error).message);
  }
  return mapa;
}

/**
 * Salva uma mensagem: IndexedDB primeiro, depois queue pro Supabase.
 */
export async function syncSalvarMensagem(m: Mensagem): Promise<void> {
  // Já é salvo no IndexedDB pelo store — só precisa agendar sync
  queueSync('mensagens', m.id, 'upsert', m);
  scheduleSync();
}

/**
 * Remove uma mensagem: IndexedDB primeiro, depois queue pro Supabase.
 */
export function syncRemoverMensagem(id: string): void {
  queueSync('mensagens', id, 'delete');
  scheduleSync();
}

/** Indica se há itens pendentes na fila de sync */
export function hasPendingSync(): boolean {
  return getQueue().length > 0;
}

/** Retorna quantos itens estão pendentes */
export function pendingCount(): number {
  return getQueue().length;
}

/**
 * Inicializa a sincronização no startup do app.
 * - Processa fila pendente de operações anteriores (offline → online)
 * - Agenda sync em background
 * Chamada uma vez em App.tsx quando o usuário está autenticado.
 */
export async function syncInit(): Promise<void> {
  if (!SUPABASE_CONFIGURED) return;

  // Processa fila offline pendente
  const { synced, failed } = await processarFila();
  if (synced > 0) console.log(`[sync] ${synced} item(ns) sincronizado(s) do queue`);
  if (failed > 0) console.warn(`[sync] ${failed} item(ns) falharam e serão retentados`);

  // Agenda sync em background para próximas alterações
  scheduleSync();

  // Sincroniza quando a aba ganhar foco (usuário volta online)
  window.addEventListener('focus', () => {
    void processarFila();
  });
}

