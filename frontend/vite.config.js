import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    assetsInclude: ['**/*.glb'],
    server: {
        port: 8000,
        host: true, // Allow access from network (mobile devices)
        proxy: {
            '/api': {
                target: 'http://localhost:8081',
                changeOrigin: true
            }
        }
    }
})

