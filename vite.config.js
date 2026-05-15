import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-1024.png'],
      manifest: {
        name: 'WoofWell — Dog Health Tracker',
        short_name: 'WoofWell',
        description: 'Track your dog\'s vet visits, vaccines, medications & weight. Free AI symptom checker.',
        theme_color: '#7C3AED',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-1024.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
})
