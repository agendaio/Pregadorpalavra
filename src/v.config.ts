/**
 * Versão do Pregador OS.
 *
 * Bumpar este número a cada deploy força invalidação do cache PWA
 * nos clientes. Combinado com Workbox autoUpdate, isso garante que
 * os usuários sempre vejam a versão mais recente.
 */
export const APP_VERSION = '0.9.3';

/** Versão do service worker / cache do Workbox */
export const SW_CACHE_VERSION = `pregador-os-v${APP_VERSION}`;

/** Data do build (atualizada pelo CI/Vercel em produção) */
export const BUILD_DATE = new Date().toISOString();