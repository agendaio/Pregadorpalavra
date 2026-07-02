import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
        name: 'Pregador OS — Sistema Operacional para Pregadores',
        short_name: 'Pregador OS',
        description: 'Estude, prepare e ministre — em uma única plataforma.',
        theme_color: '#0d0d0c',
        background_color: '#fbfbf9',
        display: 'standalone',
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
        skipWaiting: true, // Ativar novo SW imediatamente — corrige cache stale
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
            // Outras APIs do Supabase (dados, auth) — cache normal
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
        navigateFallbackDenylist: [/^\/api/, /^\/__/, /\.svg$/, /\.png$/],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    rollupOptions: {
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
        },
      },
    },
  },
  server: { port: Number(process.env.PORT) || 8080, host: true },
  preview: { port: Number(process.env.PORT) || 8080 },
});
