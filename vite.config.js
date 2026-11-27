import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.GITHUB_PAGES_BASE || '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.png'],
      manifest: {
        start_url: base,
        scope: base,
        name: '康复日程',
        short_name: '康复日程',
        description: 'Rehabilitation Patient Scheduling App',
        theme_color: '#ffffff',
        display: 'standalone',
        background_color: '#f8fafc',
        icons: [
          {
            src: 'icon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true
      }
    })
  ],
})
