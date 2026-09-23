/**
 * Shared e2e helpers. OWNER: lane "core".
 * The UI is driven through data-testids (docs/TEST_IDS.md); state is checked through window.__AQ (src/dev/debugHooks.ts).
 */
import { expect, type Page, type Locator } from '@playwright/test';

export const STARTERS = [
  { id: 'axolotl', env: 'freshwater' },
  { id: 'betta', env: 'freshwater' },
  { id: 'pea_puffer', env: 'freshwater' },
  { id: 'ocellaris_clownfish', env: 'marine' },
  { id: 'lined_seahorse', env: 'marine' },
] as const;

export const tid = (page: Page, id: string): Locator => page.getByTestId(id);

/** Collect console errors + uncaught page errors (ignores known-benign noise). */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  const benign = [/Download the React DevTools/i, /\[vite\]/i, /favicon/i];
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (benign.some((re) => re.test(t))) return;
    errors.push(`[console] ${t}`);
  });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  return errors;
}

/** Open the app and wait until window.__AQ is ready. */
export async function openApp(page: Page, path = '/'): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!(window as unknown as { __AQ?: { ready?: boolean } }).__AQ?.ready, null, { timeout: 30_000 });
}

/** Evaluate against window.__AQ (typed loosely on purpose). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function aq<T = any>(page: Page, fn: string, ...args: unknown[]): Promise<T> {
  return page.evaluate(
    ([name, a]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const api = (window as any).__AQ;
      const parts = (name as string).split('.');
      let target = api;
      for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]];
      return target[parts[parts.length - 1]](...(a as unknown[]));
    },
    [fn, args] as const,
  ) as Promise<T>;
}

export async function summary(page: Page) {
  return aq<{
    screen: string;
    view?: string;
    hasGame: boolean;
    money?: number;
    hour?: number;
    tanks?: number;
    creatures?: number;
    focusedEnvironment?: string;
    starterId?: string;
    listings?: number;
    tutorial?: { step: number; done: boolean; skipped: boolean };
  }>(page, 'summary');
}

/** Start a game without the onboarding screens (for tests that aren't about onboarding). */
export async function quickGame(page: Page, starterId = 'betta', opts: { unlockAll?: boolean; money?: number } = {}): Promise<void> {
  await aq(page, 'newGame', starterId, 'Tester', 12345);
  if (opts.unlockAll !== false) await aq(page, 'dev.unlockAll');
  if (opts.money) await aq(page, 'dev.addMoney', opts.money);
  await page.waitForFunction(() => (window as unknown as { __AQ: { summary(): { screen: string } } }).__AQ.summary().screen === 'game');
}

/** Complete onboarding through the real UI: New Game → starter card → confirm → name → begin. */
export async function onboardViaUI(page: Page, starterId: string, name = 'Testy', touch = false): Promise<void> {
  const press = (l: Locator) => (touch ? l.tap() : l.click());
  await press(tid(page, 'title-new-game'));
  const card = tid(page, `starter-card-${starterId}`);
  await card.waitFor({ state: 'visible' });
  await press(card);
  await press(tid(page, 'starter-confirm'));
  const input = tid(page, 'name-input');
  await input.waitFor({ state: 'visible' });
  await input.fill(name);
  await press(tid(page, 'name-confirm'));
  await expect(tid(page, 'hud-money')).toBeVisible();
}

/** lane:perf — a newly loaded world compiles its shaders behind a soft veil (~0.3–1 s); wait until it has lifted. */
export async function waitForWarmup(page: Page): Promise<void> {
  await page
    .waitForFunction(() => !(window as unknown as { __AQ?: { warming?: () => boolean } }).__AQ?.warming?.(), null, { timeout: 8_000 })
    .catch(() => undefined);
  await page.waitForTimeout(450); // the veil's fade-out
}

/** Luminance statistics of the WebGL canvas (via a screenshot decoded in the page). */
export async function canvasStats(page: Page): Promise<{ mean: number; std: number; colors: number }> {
  const canvas = page.locator('canvas').first();
  await canvas.waitFor({ state: 'visible' });
  await waitForWarmup(page);
  const b64 = (await canvas.screenshot()).toString('base64');
  return page.evaluate(async (data) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const w = Math.min(320, img.width);
    const h = Math.max(1, Math.round((img.height * w) / img.width));
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0, w, h);
    const px = ctx.getImageData(0, 0, w, h).data;
    let sum = 0;
    let sum2 = 0;
    const colors = new Set<number>();
    const n = w * h;
    for (let i = 0; i < px.length; i += 4) {
      const lum = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
      sum += lum;
      sum2 += lum * lum;
      colors.add(((px[i] >> 3) << 10) | ((px[i + 1] >> 3) << 5) | (px[i + 2] >> 3));
    }
    const mean = sum / n;
    return { mean, std: Math.sqrt(Math.max(0, sum2 / n - mean * mean)), colors: colors.size };
  }, b64);
}

export async function expectCanvasNotBlank(page: Page): Promise<void> {
  const s = await canvasStats(page);
  expect(s.colors, `canvas looks blank: ${JSON.stringify(s)}`).toBeGreaterThan(24);
  expect(s.std, `canvas looks flat: ${JSON.stringify(s)}`).toBeGreaterThan(2);
}

/** Click (or tap) the middle of the 3D view — the focused tank's front glass in tank view. */
export async function clickTank(page: Page, touch = false, fx = 0.5, fy = 0.5): Promise<void> {
  const box = await page.locator('canvas').first().boundingBox();
  if (!box) throw new Error('no canvas');
  const x = box.x + box.width * fx;
  const y = box.y + box.height * fy;
  if (touch) {
    await page.touchscreen.tap(x, y);
    return;
  }
  // Hover first: placement tools compute their ghost/validity on pointer move, then commit on click.
  await page.mouse.move(x - 20, y - 10);
  await page.mouse.move(x, y, { steps: 6 });
  await page.waitForTimeout(120);
  await page.mouse.click(x, y);
}

/** Open a dock panel and wait for its root. */
export async function openPanel(page: Page, panelId: string): Promise<void> {
  await tid(page, `dock-${panelId}`).click();
  await expect(tid(page, `panel-${panelId}`)).toBeVisible();
}

/** Poll a state predicate evaluated in the page (string body receives `g` = GameState). */
export async function waitForState(page: Page, predicateBody: string, timeout = 10_000): Promise<void> {
  await page.waitForFunction(
    (body) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const g = (window as any).__AQ.state();
      // eslint-disable-next-line no-new-func
      return !!g && new Function('g', `return (${body});`)(g);
    },
    predicateBody,
    { timeout },
  );
}

/** Game-state probe (returns plain JSON). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function probe<T = any>(page: Page, body: string): Promise<T> {
  return page.evaluate((b) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).__AQ.state();
    // eslint-disable-next-line no-new-func
    return new Function('g', `return (${b});`)(g);
  }, body) as Promise<T>;
}
