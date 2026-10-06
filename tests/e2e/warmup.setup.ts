import { test as setup } from '@playwright/test';
import { aq, quickGame } from './helpers';

/**
 * Warm-up (BACKLOG B-003), run once before the e2e tests (the `warmup` project in playwright.config.ts). Vite's dev
 * server compiles each module on its first request. On a cold start (a fresh checkout, changed dependencies, a slow
 * disk) loading the app took longer than a test's two minutes, so whichever test ran first timed out. This loads the
 * app with a long timeout, so the tests start against a warm server. It checks nothing about the game.
 */
const LONG = 10 * 60_000;

setup('warm up the dev server', async ({ page }) => {
  setup.setTimeout(LONG + 3 * 60_000);
  const started = Date.now();
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: LONG });
  await page.waitForFunction(() => !!(window as unknown as { __AQ?: { ready?: boolean } }).__AQ?.ready, null, { timeout: LONG });
  // Best effort: start a game and open a panel, so the lazily loaded panel code is compiled too. If this part fails,
  // the tests that open panels wait for them as they always did. It is skipped when the load itself used most of the
  // budget, so it can never time the warm-up out.
  if (Date.now() - started > LONG - 60_000) return;
  try {
    await quickGame(page, 'betta');
    await aq(page, 'setUI', { panel: 'market' });
    await page.getByTestId('panel-market').waitFor({ state: 'visible', timeout: 2 * 60_000 });
  } catch {
    // The app itself loaded, which is what the warm-up is for.
  }
});
