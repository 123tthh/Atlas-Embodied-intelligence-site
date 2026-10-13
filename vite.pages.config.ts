import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const base = process.env.PAGES_BASE_PATH || '/Atlas-Embodied-intelligence-site/';
if (!base.startsWith('/') || !base.endsWith('/') || base.includes('..')) throw new Error('Invalid Pages base path');

export default defineConfig({
  root: fileURLToPath(new URL('./static-site', import.meta.url)),
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  base,
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  define: { __ATLAS_STATIC__: 'true', __ATLAS_BASE__: JSON.stringify(base) },
  build: { outDir: '../dist-pages', emptyOutDir: true },
  server: { host: '127.0.0.1', port: 4175 },
  preview: { host: '127.0.0.1', port: 4175 },
});
