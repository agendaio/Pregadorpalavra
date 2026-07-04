import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// ── Identidade global da versão (gerada no build) ──────────────────────────
// Cada deploy carimba version + build + hash + timestamp. O hash é a fonte de
// verdade pra detectar "há uma versão nova?" no cliente, sem depender do SW.
function coletarGitInfo(): { hash: string; build: number } {
  const env = process.env;
  let hash = env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || '';
  let build = 0;
  try {
    if (!hash) hash = execSync('git rev-parse --short HEAD').toString().trim();
    build = Number(execSync('git rev-list --count HEAD').toString().trim()) || 0;
  } catch {
    /* git indisponível (build sem histórico) — cai no fallback abaixo */
  }
  if (!hash) hash = Date.now().toString(36);
  return { hash, build };
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));
const { hash: APP_HASH, build: APP_BUILD } = coletarGitInfo();
const BUILD_TIME = new Date().toISOString();
const APP_VERSION: string = pkg.version;

const VERSION_PAYLOAD = JSON.stringify({
  version: APP_VERSION,
  build: APP_BUILD,
  hash: APP_HASH,
  timestamp: BUILD_TIME,
});

/** Emite /version.json no dist — servido sem cache (ver vercel.json). */
function versionManifestPlugin() {
  return {
    name: 'pregador-version-manifest',
    generateBundle(this: { emitFile: (f: { type: 'asset'; fileName: string; source: string }) => void }) {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: VERSION_PAYLOAD });
    },
  };
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __APP_BUILD__: JSON.stringify(APP_BUILD),
    __APP_HASH__: JSON.stringify(APP_HASH),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  plugins: [
    react(),
    versionManifestPlugin(),
    VitePWA({
      // 'prompt' (não 'autoUpdate'): o reload é controlado pelo updateManager,
      // pra nunca recarregar no meio do uso e nunca dar tela branca. A ativação
      // só acontece quando o novo precache está 100% íntegro (tudo-ou-nada).
      registerType: 'prompt',
      injectRegister: 'auto',
      filename: 'sw.js',
      manifestFilename: 'manifest.webmanifest',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-192.png',
        'icon-maskable-512.png',
        'splash-1290x2796.png',
        'splash-1179x2556.png',
        'splash-1284x2778.png',
        'splash-1170x2532.png',
        'splash-750x1334.png',
        'robots.txt',
        'sitemap.xml',
      ],
      manifest: {
        id: '/',
        name: 'Pregador OS — Sistema Operacional para Pregadores',
        short_name: 'Pregador OS',
        description: 'Estude, prepare e ministre — em uma única plataforma.',
        theme_color: '#0d0d0c',
        background_color: '#fbfbf9',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'pt-BR',
        categories: ['productivity', 'lifestyle', 'education', 'books'],
        icons: [
          { src: '/icon-192.png',         sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icon-512.png',         sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/apple-touch-icon.png',  sizes: '180x180', type: 'image/png', purpose: 'any' },
        ],
        shortcuts: [
          {
            name: 'Nova mensagem',
            short_name: 'Nova',
            description: 'Iniciar uma nova mensagem',
            url: '/?action=new',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Modo Púlpito',
            short_name: 'Púlpito',
            description: 'Abrir o modo de ministração',
            url: '/pulpit',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Assistente Ministerial',
            short_name: 'Assistente',
            description: 'Conversar com o assistente teológico',
            url: '/assistente',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // skipWaiting fica FALSE de propósito: o SW novo espera até o
        // updateManager mandar SKIP_WAITING (via updateSW), garantindo reload
        // único e controlado, sem interromper o usuário no meio de uma ação.
        skipWaiting: false,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
            },
          },
          {
            // Edge Functions — streaming SSE não pode ser cacheado.
            // Usa NetworkOnly para nunca interceptar streaming.
            urlPattern: /^https:\/\/.*\.supabase\.co\/functions\/v1\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-auth',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/__/, /\/version\.json$/, /\.svg$/, /\.png$/],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  optimizeDeps: {
    // @tiptap/pm não tem export raiz "." — Vite 6 é rígido com isso.
    exclude: ['@tiptap/pm'],
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      // @tiptap/pm é um meta-pacote só com subpaths (./state, ./model, etc).
      // Rollup falha se algo tentar resolver o pacote raiz. Marcar como external.
      external: ['@tiptap/pm'],
      output: {
        manualChunks: {
          // vendor
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // editor (Tiptap é o mais pesado)
          'editor-vendor': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-character-count',
            '@tiptap/extension-placeholder',
            '@tiptap/extension-typography',
          ],
          // animação
          'motion': ['framer-motion'],
          // icons
          'icons': ['lucide-react'],
          // utils (date-fns, clsx, tailwind-merge)
          'utils': ['clsx', 'tailwind-merge', 'date-fns', 'nanoid'],
          // dexie (IndexedDB)
          'db': ['dexie', 'dexie-react-hooks'],
          // supabase
          'supabase': ['@supabase/supabase-js'],
          // html2canvas (export PDF/imagem)
          'html2canvas': ['html2canvas'],
          // markdown
          'markdown': ['react-markdown', 'rehype-raw', 'remark-gfm'],
        },
      },
    },
  },
  server: { port: Number(process.env.PORT) || 8080, host: true },
  preview: { port: Number(process.env.PORT) || 8080 },
});
