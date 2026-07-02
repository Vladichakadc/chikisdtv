import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  build: {
    // Separa las librerías pesadas en chunks propios: el navegador las cachea
    // entre despliegues y la carga inicial en móvil baja drásticamente.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-vendor')) return 'vendor-charts'
            if (id.includes('exceljs')) return 'vendor-excel'
            if (id.includes('react-router')) return 'vendor-router'
            if (id.includes('react')) return 'vendor-react'
          }
        },
      },
    },
  },
})
