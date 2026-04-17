import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icon-192.svg', 'icon-512.svg'],
      manifest: {
        name: 'Canary Обходы',
        short_name: 'Обходы',
        description: 'Офлайн-клиент обходчика для промышленного оборудования',
        theme_color: '#7c4f26',
        background_color: '#f9f5ec',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'ru',
        icons: [
          {
            src: 'icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages',
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: ({ url, request }) => request.method === 'GET' && (
              url.pathname.includes('/inspection-plans/today')
              || url.pathname.includes('/api/v1/inspection-plans/')
              || url.pathname.includes('/equipment/')
              || url.pathname.includes('/api/v1/equipment/')
            ),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-read-model',
              networkTimeoutSeconds: 4,
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
