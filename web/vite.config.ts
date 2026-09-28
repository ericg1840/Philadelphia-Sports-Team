import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app from /<repo>/; set BASE_PATH in CI (see .github/workflows/pages.yml).
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  server: { fs: { allow: ['..'] } },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Philly Sports',
        short_name: 'Philly',
        description: 'Upcoming games for the Phillies, Eagles, Sixers, Flyers and Union.',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            // Worker API: always try the network, fall back to the last response offline.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 20, maxAgeSeconds: 7 * 24 * 3600 },
            },
          },
          {
            urlPattern: ({ url }) =>
              /(^|\.)(espncdn\.com|mlbstatic\.com|nhle\.com|weather\.gov)$/.test(url.hostname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'logos',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 3600 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
