import { test, expect, chromium } from '@playwright/test';
import { openApp, aq, probe, devUrl } from './helpers';

/** Minimum acceptable frame rates in headless Chromium on the dev Mac (hardware WebGL). */
const MIN_FPS_FACILITY = 30;
const MIN_FPS_HERO = 30;
const MIN_FPS_SCHOOL = 24;

async function sampleFps(page: import('@playwright/test').Page, ms = 4000) {
  return aq<{ fps: number; p95Ms: number; maxMs: number }>(page, 'frameStats', ms);
}

test.describe('performance', () => {
  test('big_facility: facility view and the 1,000 gal display stay smooth', async ({ page }, info) => {
    await openApp(page, '/?fixture=big_facility&view=facility');
    await page.waitForTimeout(5000);
    const facility = await sampleFps(page);
    const loop = await aq<{ avgMs: number; errors: number }>(page, 'stats');
    info.annotations.push({ type: 'perf', description: `facility fps=${facility.fps.toFixed(1)} p95=${facility.p95Ms.toFixed(1)}ms sim=${loop.avgMs.toFixed(2)}ms/tick` });
    expect(await probe<number>(page, 'g.tankOrder.length')).toBeGreaterThanOrEqual(12);
    expect(facility.fps).toBeGreaterThanOrEqual(MIN_FPS_FACILITY);
    expect(loop.avgMs).toBeLessThan(12);
    expect(loop.errors).toBe(0);

    const id = await aq<string>(page, 'focusLargestTank');
    expect(await probe<string>(page, `g.tanks['${id}'].tierId`)).toBe('g1000');
    await page.waitForTimeout(4000);
    const hero = await sampleFps(page);
    info.annotations.push({ type: 'perf', description: `g1000 fps=${hero.fps.toFixed(1)} p95=${hero.p95Ms.toFixed(1)}ms` });
    expect(hero.fps).toBeGreaterThanOrEqual(MIN_FPS_HERO);
  });

  test('stress_school: 80 schooling fish', async ({ page }, info) => {
    await openApp(page, '/?fixture=stress_school');
    await page.waitForTimeout(5000);
    const n = await probe<number>(page, `Object.values(g.creatures).filter(c => c.tankId === g.tankOrder[0]).length`);
    expect(n).toBe(80);
    const s = await sampleFps(page);
    info.annotations.push({ type: 'perf', description: `school fps=${s.fps.toFixed(1)} p95=${s.p95Ms.toFixed(1)}ms max=${s.maxMs.toFixed(1)}ms` });
    expect(s.fps).toBeGreaterThanOrEqual(MIN_FPS_SCHOOL);
  });

  test('10× speed does not stutter the sim', async ({ page }, info) => {
    await openApp(page, '/?fixture=big_facility&view=facility');
    await aq(page, 'dev.setSpeed', 10);
    await page.waitForTimeout(6000);
    const loop = await aq<{ avgMs: number; maxMs: number; droppedHours: number; errors: number }>(page, 'stats');
    info.annotations.push({ type: 'perf', description: `10x sim avg=${loop.avgMs.toFixed(2)}ms max=${loop.maxMs.toFixed(1)}ms dropped=${loop.droppedHours.toFixed(2)}h` });
    expect(loop.droppedHours).toBeLessThan(0.5);
    expect(loop.avgMs).toBeLessThan(12);
    expect(loop.errors).toBe(0);
  });

  test('memory stays bounded entering/leaving tank view 20×', async ({}, info) => {
    const browser = await chromium.launch({
      args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--js-flags=--expose-gc', '--enable-precise-memory-info'],
    });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const base = info.project.use.baseURL ?? `http://127.0.0.1:${process.env.E2E_PORT ?? 4399}`;
    await page.goto(`${base}${devUrl('/?fixture=community_fw')}`, { waitUntil: 'domcontentloaded' }); // ?dev=1: it uses write tools (PLAT-005)
    await page.waitForFunction(() => !!(window as unknown as { __AQ?: { ready?: boolean } }).__AQ?.ready);
    await page.waitForTimeout(4000);
    const heap = () =>
      page.evaluate(async () => {
        const w = window as unknown as { gc?: () => void; __AQ: { memory(): { used: number } | null } };
        for (let i = 0; i < 3; i++) {
          w.gc?.();
          await new Promise((r) => setTimeout(r, 100));
        }
        return w.__AQ.memory()?.used ?? 0;
      });
    const ids = await probe<string[]>(page, 'g.tankOrder');
    // Warm-up cycle so lazily-built caches are counted in the baseline.
    for (const id of ids) {
      await aq(page, 'dev.focusTank', id, 'tank');
      await page.waitForTimeout(400);
    }
    await aq(page, 'setUI', { view: 'facility' });
    await page.waitForTimeout(600);
    const before = await heap();
    for (let i = 0; i < 20; i++) {
      await aq(page, 'dev.focusTank', ids[i % ids.length], 'tank');
      await page.waitForTimeout(300);
      await aq(page, 'setUI', { view: 'facility' });
      await page.waitForTimeout(300);
    }
    const after = await heap();
    const growthMb = (after - before) / (1024 * 1024);
    info.annotations.push({ type: 'perf', description: `heap before=${(before / 1048576).toFixed(1)}MB after=${(after / 1048576).toFixed(1)}MB growth=${growthMb.toFixed(1)}MB` });
    await browser.close();
    if (before === 0) test.skip(true, 'performance.memory unavailable');
    expect(growthMb).toBeLessThan(40);
  });
});
