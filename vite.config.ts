import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { devnotation } from 'devnotation/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    devnotation({ autoUpdate: true }),
  ],
});
