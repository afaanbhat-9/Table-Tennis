import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'client',
  publicDir: 'public',
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared')
    }
  },
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true
  }
});
