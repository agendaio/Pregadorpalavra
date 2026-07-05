import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { hardRecover, isChunkError, marcarBootOk } from './lib/recovery';

// ── Rede de segurança contra "tela branca" no PWA ──────────────────────────
// Se um chunk (import dinâmico) falhar ao carregar — típico quando o SW tem um
// index.html antigo apontando pra um chunk que o deploy novo já removeu — a
// gente limpa o cache e recarrega automaticamente. Isso faz o PWA se
// autorreparar e ficar em tempo real com a Web.

// Vite dispara este evento quando o preload de um módulo dinâmico falha.
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  void hardRecover('vite:preloadError');
});

// Erros globais de script (inclui "Loading chunk X failed").
window.addEventListener('error', (e) => {
  const msg = e?.message || (e?.error as Error | undefined)?.message;
  if (isChunkError(msg)) void hardRecover('error:chunk');
});

// Promessas rejeitadas sem catch (ex.: import() que falhou).
window.addEventListener('unhandledrejection', (e) => {
  const msg = (e?.reason as Error | undefined)?.message ?? String(e?.reason ?? '');
  if (isChunkError(msg)) void hardRecover('rejection:chunk');
});

const rootEl = document.getElementById('root')!;

// Watchdog de boot: se em 8s nada foi renderizado em #root, algo travou o
// carregamento (chunk quebrado, erro silencioso) → auto-recupera.
const watchdog = window.setTimeout(() => {
  if (rootEl.childElementCount === 0) void hardRecover('watchdog:boot-vazio');
}, 8000);

try {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  // Confirma que pintou algo, cancela o watchdog e zera o contador de recuperação.
  requestAnimationFrame(() => {
    if (rootEl.childElementCount > 0) {
      window.clearTimeout(watchdog);
      marcarBootOk();
    }
  });
} catch (err) {
  window.clearTimeout(watchdog);
  if (isChunkError((err as Error)?.message)) void hardRecover('render:chunk');
  else throw err;
}
