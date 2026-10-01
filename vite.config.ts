import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { execSync } from 'node:child_process';

/** Short commit + build time: every deploy gets a new id, even a rebuild of the same commit. */
function makeBuildId(): string {
  let sha = 'nogit';
  try {
    sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || sha;
  } catch {
    /* building from a tarball */
  }
  return `${sha}-${Date.now().toString(36)}`;
}

/**
 * Stamps each production build with an id: `__BUILD_ID__` in the bundle ('dev' under the dev server) and version.json
 * (`{ "id": … }`) beside index.html. A tab still running an older cached build polls that file and offers a reload
 * (src/ui/hud/UpdatePrompt.tsx). It is relative to the output root, so the Pages base path just works.
 */
function buildStamp(): Plugin {
  let id = 'dev';
  return {
    name: 'aquarium-go:build-stamp',
    config(_, { command }) {
      if (command === 'build') id = makeBuildId();
      return { define: { __BUILD_ID__: JSON.stringify(id) } };
    },
    generateBundle() {
      if (id !== 'dev') this.emitFile({ type: 'asset', fileName: 'version.json', source: `${JSON.stringify({ id })}\n` });
    },
  };
}

export default defineConfig({
  plugins: [react(), buildStamp()],
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
