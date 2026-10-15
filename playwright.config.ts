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
 * lane:social (chunk 6) — the production project also runs prod-mode.spec.ts (the players' build without ?dev=1: no
 * Social, SOC-011). ADR-0024 decision 3 (B-129): every spec also runs in WebKit, Safari's engine (`webkit`,
 * `webkit-base-path`; Playwright's own WebKit build, no npm package). `--project=desktop` runs Chromium alone.
 */
const PORT = Number(process.env.E2E_PORT ?? 4399);
const PREVIEW_PORT = Number(process.env.E2E_PREVIEW_PORT ?? 4398);
const BASE_PATH = '/aquarium-go/';
const GPU_ARGS = ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'];
/** Specs that run against the production build under the Pages base path (the preview server). */
const PROD_SPECS = /(base-path|prod-mode)\.spec\.ts$/;
const PREVIEW_URL = `http://127.0.0.1:${PREVIEW_PORT}${BASE_PATH}`;
/** WebKit takes none of Chromium's GPU switches. */
const SAFARI = { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 }, launchOptions: { args: [] } };

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
      testIgnore: PROD_SPECS,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions: { args: GPU_ARGS } },
    },
    {
      name: 'base-path',
      testMatch: PROD_SPECS,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, launchOptions: { args: GPU_ARGS }, baseURL: PREVIEW_URL },
    },
    // ADR-0024 decision 3 (B-129): the same specs in WebKit
    { name: 'webkit', dependencies: ['warmup'], testIgnore: PROD_SPECS, use: SAFARI },
    { name: 'webkit-base-path', testMatch: PROD_SPECS, use: { ...SAFARI, baseURL: PREVIEW_URL } },
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
      url: PREVIEW_URL,
      reuseExistingServer: false,
      timeout: 240_000,
    },
  ],
});
