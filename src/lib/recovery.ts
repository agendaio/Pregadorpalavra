/**
 * Auto-recuperação de "tela branca" no PWA.
 *
 * Causa nº 1 de tela branca em PWA + Vite: o service worker serve um
 * `index.html` antigo (do precache) que aponta para um chunk JS/CSS cujo hash
 * o deploy novo já removeu → o import dinâmico falha → nada renderiza.
 *
 * A cura é sempre a mesma: **apagar os caches + desregistrar o SW + recarregar**.
 * Depois do reload, tudo vem fresco da rede (o mesmo que a Web já faz) e o app
 * volta a funcionar — agora na versão nova.
 *
 * IMPORTANTE: esta limpeza NÃO toca em dados do usuário. Só apaga o Cache
 * Storage (assets do Workbox) e os service workers. `localStorage` (login,
 * token, tema, idioma) e `IndexedDB` (mensagens, esboços) permanecem intactos.
 */

const CHAVE_TENTATIVAS = 'pregador.recover.count';
const MAX_TENTATIVAS = 2; // evita loop infinito de reload se a rede estiver quebrada

/** Reconhece erros de carregamento de chunk (import dinâmico / CSS / módulo). */
export function isChunkError(msg?: string | null): boolean {
  if (!msg) return false;
  return /ChunkLoadError|Loading chunk|Loading CSS chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|dynamically imported module/i.test(
    msg,
  );
}

/**
 * Limpa caches + service workers e recarrega. Guardado contra loop: no máximo
 * MAX_TENTATIVAS por sessão. Preserva login e dados locais.
 */
export async function hardRecover(motivo: string): Promise<void> {
  try {
    const n = Number(sessionStorage.getItem(CHAVE_TENTATIVAS) ?? '0');
    if (n >= MAX_TENTATIVAS) {
      // Já tentamos o suficiente — não recarrega de novo (senão vira loop).
      // Deixa a UI de erro aparecer pro usuário decidir.
      console.error('[recovery] limite de tentativas atingido. Motivo:', motivo);
      return;
    }
    sessionStorage.setItem(CHAVE_TENTATIVAS, String(n + 1));
    console.warn('[recovery] limpando cache e recarregando. Motivo:', motivo);

    if ('caches' in window) {
      const chaves = await caches.keys();
      await Promise.all(chaves.map((k) => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch (e) {
    console.error('[recovery] falha ao limpar', e);
  } finally {
    // Reload duro. `location.reload()` após desregistrar o SW busca tudo da rede.
    window.location.reload();
  }
}

/** Zera o contador de tentativas após um boot que renderizou de fato. */
export function marcarBootOk(): void {
  try {
    sessionStorage.removeItem(CHAVE_TENTATIVAS);
  } catch {
    /* sessionStorage indisponível — ignora */
  }
}

/**
 * Limpeza manual disparada pelo usuário (ex.: botão "Limpar cache"). Sempre
 * executa, ignorando o limite de tentativas.
 */
export async function limparCacheManual(): Promise<void> {
  try {
    sessionStorage.removeItem(CHAVE_TENTATIVAS);
    if ('caches' in window) {
      const chaves = await caches.keys();
      await Promise.all(chaves.map((k) => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } finally {
    window.location.reload();
  }
}
