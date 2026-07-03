/**
 * Identidade global da versão do Pregador OS.
 *
 * Estes valores são carimbados no build (vite.config.ts → `define`) a partir do
 * git: versão (package.json), build (nº de commits), hash (commit curto) e
 * timestamp do deploy. O mesmo payload é escrito em `/version.json`, que o
 * `updateManager` consulta pra detectar deploys novos no Vercel.
 *
 * Não bumpe nada aqui à mão: suba a `version` no package.json e o resto é
 * derivado automaticamente a cada deploy.
 */
export const APP_VERSION =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev';

export const APP_BUILD =
  typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : 0;

export const APP_HASH =
  typeof __APP_HASH__ !== 'undefined' ? __APP_HASH__ : 'dev';

/** Data/hora do build (ISO 8601). */
export const BUILD_DATE =
  typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();

/** Rótulo curto pra UI/diagnóstico. Ex.: "v0.10.23 · build 134 · cac1e4a" */
export const VERSION_LABEL = `v${APP_VERSION} · build ${APP_BUILD} · ${APP_HASH}`;

/** Namespace de cache do Workbox (varia por versão+hash). */
export const SW_CACHE_VERSION = `pregador-os-v${APP_VERSION}-${APP_HASH}`;
