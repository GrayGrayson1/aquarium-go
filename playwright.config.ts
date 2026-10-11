import { defineConfig, devices } from '@playwright/test';

/**
 * E2E + perf tests (tests/e2e). OWNER: lane "core".
 * Starts its own Vite server on E2E_PORT (default 4399). A server already listening there is reused only when
 * E2E_REUSE=1 (e.g. a production preview you started on purpose); otherwise a busy port fails loudly, so a server from
 * another checkout or worktree can never be tested by mistake.
 * lane:core (chunk 3, B-126) — it also builds the game for production under GitHub Pages' base path (/aquarium-go/,
 * into .e2e-dist) and serves it with `vite preview` on E2E_PREVIEW_PORT (default 4398) for the `base-path` project
 * (tests/e2e/base-path.spec.ts): the service worker's scope and the notification icon live under that path.
 * Run: `npx playwright test` (all) · `npx playwright test tests/e2e/boot.spec.ts` (one file).
 */
const PORT = Number(process.env.E2E_PORT ?? 4399);
const PREVIEW_PORT = Number(process.env.E2E_PREVIEW_PORT ?? 4398);
const BASE_PATH = '/aquarium-go/';
const GPU_ARGS = ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'];

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: true, // a focused test.only can never slip into a gate run
  workers: 1,
  retries: 0,
  reporter: [['list']],
  outputDir: 'test-results',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    viewport: { width: 1440, height: 900 },
    launchOptions: { args: GPU_ARGS },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
  },
  projects: [
    // Loads the app once before the tests, so a cold Vite start can't time out whichever test runs first (B-003).
    { name: 'warmup', testMatch: /warmup\.setup\.ts$/ },
    {
      name: 'desktop',
      dependencies: ['warmup'],
      testIgnore: /base-path\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions: { args: GPU_ARGS } },
    },
    {
      name: 'base-path',
      testMatch: /base-path\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions: { args: GPU_ARGS }, baseURL: `http://127.0.0.1:${PREVIEW_PORT}${BASE_PATH}` },
    },
  ],
  webServer: [
    {
      command: `npx vite --host 127.0.0.1 --port ${PORT} --strictPort`,
      url: `http://127.0.0.1:${PORT}`,
      reuseExistingServer: process.env.E2E_REUSE === '1',
      timeout: 120_000,
    },
    {
      command: `npx vite build --base=${BASE_PATH} --outDir .e2e-dist --emptyOutDir --logLevel warn && npx vite preview --base=${BASE_PATH} --outDir .e2e-dist --host 127.0.0.1 --port ${PREVIEW_PORT} --strictPort`,
      url: `http://127.0.0.1:${PREVIEW_PORT}${BASE_PATH}`,
      reuseExistingServer: false,
      timeout: 240_000,
    },
  ],
});
