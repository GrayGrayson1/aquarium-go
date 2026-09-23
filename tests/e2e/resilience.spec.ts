import { test, expect } from '@playwright/test';
import { openApp, quickGame, onboardViaUI, tid, aq, probe, collectErrors, expectCanvasNotBlank } from './helpers';

test.describe('resilience', () => {
  test('audio/microphone permission denied does not break party mode', async ({ browser }) => {
    const context = await browser.newContext({ permissions: [] });
    await context.addInitScript(() => {
      // Pretend the user denied the microphone and make sure nothing else can request it either.
      const deny = () => Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
      if (navigator.mediaDevices) {
        Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: deny, configurable: true });
      }
      try {
        const k = 'aquarium-go.settings.v1';
        const s = JSON.parse(localStorage.getItem(k) || '{}');
        localStorage.setItem(k, JSON.stringify({ ...s, partyUseMicrophone: true }));
      } catch {
        /* ignore */
      }
    });
    const page = await context.newPage();
    const errors = collectErrors(page);
    await openApp(page);
    await quickGame(page, 'betta');
    const party = tid(page, 'tool-party');
    await expect(party).toBeVisible();
    await party.click();
    await page.waitForTimeout(2000);
    const hourA = await probe<number>(page, 'g.clock.hour');
    await page.waitForTimeout(1500);
    expect(await probe<number>(page, 'g.clock.hour')).toBeGreaterThan(hourA);
    await party.click();
    await page.waitForTimeout(500);
    await expectCanvasNotBlank(page);
    const uncaught = errors.filter((e) => e.startsWith('[pageerror]'));
    expect(uncaught, uncaught.join('\n')).toEqual([]);
    await context.close();
  });

  test('works with no network (all non-local requests blocked)', async ({ page }) => {
    const external: string[] = [];
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.protocol === 'data:' || url.protocol === 'blob:') return route.continue();
      external.push(url.href);
      return route.abort('internetdisconnected');
    });
    const errors = collectErrors(page);
    await openApp(page);
    await onboardViaUI(page, 'ocellaris_clownfish', 'Offline');
    await page.waitForTimeout(3000);
    await expectCanvasNotBlank(page);
    expect(external, `external requests attempted:\n${external.join('\n')}`).toEqual([]);
    expect(errors.filter((e) => /net::|Failed to fetch|ERR_/.test(e))).toEqual([]);
  });

  test('reduced-motion preference is honoured and the game still runs', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = collectErrors(page);
    await openApp(page);
    expect(await page.evaluate(() => (window as unknown as { __AQ: { settings(): { reducedMotion: boolean } } }).__AQ.settings().reducedMotion)).toBe(true);
    await quickGame(page, 'lined_seahorse');
    await page.waitForTimeout(2000);
    await expectCanvasNotBlank(page);
    const s = await aq<{ screen: string }>(page, 'summary');
    expect(s.screen).toBe('game');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('rapid glass-tap spam does not crash or reward', async ({ page }) => {
    const errors = collectErrors(page);
    await openApp(page);
    await quickGame(page, 'pea_puffer');
    const tap = tid(page, 'tool-tap');
    if (await tap.count()) await tap.click();
    const box = await page.locator('canvas').first().boundingBox();
    for (let i = 0; i < 40; i++) await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2, { delay: 5 });
    await page.waitForTimeout(800);
    const pressure = await probe<number>(page, 'g.tanks[g.tankOrder[0]].tapPressure');
    expect(pressure).toBeLessThanOrEqual(10);
    expect(errors.filter((e) => e.startsWith('[pageerror]'))).toEqual([]);
  });

  test('saving still works when IndexedDB is unavailable (localStorage fallback + warning toast)', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'indexedDB', {
        configurable: true,
        get() {
          throw new DOMException('IndexedDB disabled for this test', 'SecurityError');
        },
      });
    });
    const errors = collectErrors(page);
    const warnings: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'warning') warnings.push(m.text());
    });
    // Record every toast the UI store receives (they auto-dismiss, so don't rely on timing).
    await page.addInitScript(() => {
      (window as unknown as { __toasts: string[] }).__toasts = [];
    });
    await openApp(page);
    await page.evaluate(() => {
      const w = window as unknown as { __toasts: string[]; __AQ: { ui(): { toasts: { text: string }[] } } };
      const seen = new Set<string>();
      setInterval(() => {
        for (const t of w.__AQ.ui().toasts) if (!seen.has(t.text)) (seen.add(t.text), w.__toasts.push(t.text));
      }, 50);
    });
    await quickGame(page, 'betta');
    const saved = await aq<{ ok: boolean; backend?: string }>(page, 'save', 'slot1');
    expect(saved.ok).toBe(true);
    expect(saved.backend).toBe('localstorage');
    await page.waitForTimeout(300);
    const toasts = await page.evaluate(() => (window as unknown as { __toasts: string[] }).__toasts);
    const warned = warnings.some((w) => /fell back to localstorage/.test(w)) || toasts.some((t) => /storage/i.test(t));
    expect(warned, `toasts: ${JSON.stringify(toasts)} warnings: ${JSON.stringify(warnings.slice(0, 5))}`).toBe(true);
    const saves = await aq<{ slot: string }[]>(page, 'listSaves');
    expect(saves.map((s) => s.slot)).toContain('slot1');
    expect(errors.filter((e) => e.startsWith('[pageerror]'))).toEqual([]);
  });
});
