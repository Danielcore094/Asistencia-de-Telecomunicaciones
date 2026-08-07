import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            workbox: {
                maximumFileSizeToCacheInBytes: 3 * 1024 * 1024 // 3 MB
            },
            manifest: {
                name: 'Asistencia Telecom',
                short_name: 'Telecom',
                description: 'Sistema de control de asistencia',
                theme_color: '#ffffff',
                icons: [
                    {
                        src: '/vite.svg',
                        sizes: '192x192',
                        type: 'image/svg+xml'
                    },
                    {
                        src: '/vite.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml'
                    }
                ]
            }
        })
    ],
    server: {
        port: 3000,
        strictPort: true
    }
})
