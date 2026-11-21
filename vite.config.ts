import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { devnotation } from 'devnotation/vite';

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  plugins: [
    react(),
    devnotation({ autoUpdate: true }),
  ],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('tesseract.js')) {
              return 'vendor-ocr';
            }
            if (id.includes('@zxing')) {
              return 'vendor-barcode';
            }
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('jspdf-autotable') || id.includes('react-to-print')) {
              return 'vendor-pdf-print';
            }
            if (id.includes('xlsx')) {
              return 'vendor-excel';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
          }
        },
      },
    },
  },
});
