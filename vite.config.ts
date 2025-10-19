import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // Fail if port is already in use
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
