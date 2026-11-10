import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/visit': 'http://127.0.0.1:8001',
      '/visits': 'http://127.0.0.1:8001',
      '/patients': 'http://127.0.0.1:8001',
      '/chat': 'http://127.0.0.1:8001',
      '/llm': 'http://127.0.0.1:8001',
      '/auth': 'http://127.0.0.1:8001',
      '/predict': 'http://127.0.0.1:8001',
      '/explain': 'http://127.0.0.1:8001',
      '/model-card': 'http://127.0.0.1:8001',
      '/fhir': 'http://127.0.0.1:8001',
      '/audit': 'http://127.0.0.1:8001'
    }
  },
  build: {
    target: 'es2019',
    outDir: 'dist',
  }
})
