import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'PersonalOS',
        short_name: 'PersonalOS',
        description: 'Dein persönliches Command Center',
        theme_color: '#141415',
        background_color: '#141415',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cache app shell and API responses
        runtimeCaching: [
          {
            urlPattern: /^\/api\/(habits|todos|journal\/today|financeSummary|goals)/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'api-cache', expiration: { maxAgeSeconds: 60 * 60 * 24 } },
          },
        ],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://178.104.52.85:8090',
        changeOrigin: true,
      },
    },
  },
})
