import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    dedupe: ['react', 'react-dom', 'three', '@react-three/fiber'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/postprocessing',
      'postprocessing',
      'zustand',
      'immer',
      'idb-keyval',
      'lucide-react',
      'simplex-noise',
      'motion/react',
      'clsx',
    ],
  },
  server: { host: '127.0.0.1', strictPort: false },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
    sourcemap: false,
    rollupOptions: {
      output: {
        // lane:perf — stable vendor chunks. They change only when a dependency is upgraded, so browsers keep them
        // cached across game updates, and they download in parallel with the (much smaller) app chunk.
        manualChunks(id: string) {
          if (!id.includes('/node_modules/')) return undefined;
          if (/\/node_modules\/three\/(build|src)\//.test(id)) return 'vendor-three';
          if (/\/node_modules\/(@react-three\/|postprocessing\/|three-stdlib\/|@monogrid\/|n8ao\/|fflate\/|maath\/|suspend-react\/|its-fine\/|react-use-measure\/)/.test(id)) return 'vendor-r3f';
          if (/\/node_modules\/(react|react-dom|scheduler|use-sync-external-store|zustand|immer)\//.test(id)) return 'vendor-react';
          if (/\/node_modules\/(motion|motion-dom|motion-utils|framer-motion)\//.test(id)) return 'vendor-motion';
          return undefined;
        },
      },
    },
  },
});
