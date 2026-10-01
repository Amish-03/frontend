import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:28080',
        changeOrigin: true,
      },
    },
    watch: {
      ignored: [
        '**/s3-backend-service/**',
        '**/.git/**',
        '**/target/**',
        '**/.mvn/**',
      ],
    },
  },
})
