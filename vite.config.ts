import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 4200,
    strictPort: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
