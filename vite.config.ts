import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** The release version players see (title screen, Settings › About). Bump it in package.json for every deploy. */
const APP_VERSION: string = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;

function gitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'nogit';
  } catch {
    return 'nogit'; // building from a tarball
  }
}

/**
 * Stamps each production build: `__BUILD_ID__` (short commit + build time, so every deploy gets a new id, even a
 * rebuild of the same commit; 'dev' under the dev server), `__APP_VERSION__`, `__BUILD_SHA__` and `__BUILD_TIME__`
 * in the bundle (src/ui/common/version.ts), and version.json (`{ "id": …, "version": … }`) beside index.html. A tab
 * still running an older cached build polls that file and offers a reload naming the new version
 * (src/ui/hud/UpdatePrompt.tsx). It is relative to the output root, so the Pages base path just works.
 */
function buildStamp(): Plugin {
  let id = 'dev';
  return {
    name: 'aquarium-go:build-stamp',
    config(_, { command }) {
      let sha = 'dev';
      let time = '';
      if (command === 'build') {
        sha = gitSha();
        const now = Date.now();
        id = `${sha}-${now.toString(36)}`;
        time = new Date(now).toISOString();
      }
      return {
        define: {
          __BUILD_ID__: JSON.stringify(id),
          __APP_VERSION__: JSON.stringify(APP_VERSION),
          __BUILD_SHA__: JSON.stringify(sha),
          __BUILD_TIME__: JSON.stringify(time),
        },
      };
    },
    generateBundle() {
      if (id !== 'dev') this.emitFile({ type: 'asset', fileName: 'version.json', source: `${JSON.stringify({ id, version: APP_VERSION })}\n` });
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
