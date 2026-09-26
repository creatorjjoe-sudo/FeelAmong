import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Keeps your network exposure layout active
    proxy: {
      // Intercepts all frontend fetch requests starting with /api
      '/api': {
        target: 'http://localhost:5000', // Redirects them to your Express server port
        changeOrigin: true,
        secure: false,
      }
    }
  },
})
