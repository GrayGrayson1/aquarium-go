import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';

/**
 * The shared-shop server's build (SHARED-SHOPS.md §5.1): `npm run build:server` bundles server/main.ts and the room
 * worker for Node 22 into dist-server/, with the simulation, the data and the pure persistence modules inside; `ws`
 * (the only dependency, ADR-0045 decision 2) and Node's own modules stay outside. The repo's own Vite, so no new build
 * tool.
 */
const APP_VERSION: string = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  define: { 'process.env.npm_package_version': JSON.stringify(APP_VERSION) },
  publicDir: false,
  build: {
    ssr: true,
    target: 'node22',
    outDir: 'dist-server',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    rollupOptions: {
      input: { main: 'server/main.ts', roomWorker: 'server/roomWorker.ts' },
      output: { format: 'es', entryFileNames: '[name].js', chunkFileNames: 'chunks/[name]-[hash].js' },
    },
  },
});
