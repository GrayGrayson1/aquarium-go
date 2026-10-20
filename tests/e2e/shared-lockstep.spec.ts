/**
 * Chunk 10 (SHARE-002, SHARED-SHOPS.md §3.2 rule 1, §9.2): shared shops' lockstep across engines. The prototype server
 * runs in Node (started by playwright.config.ts with its stub shops); this browser, Chromium or WebKit, applies the
 * server's steps through the same step block on the test page (tests/e2e/shared/page.html, no game) and must match
 * every fingerprint the server sent.
 */
import { test, expect, type Page } from '@playwright/test';
import type { ReplayReport } from './shared/page';
import type { StepLog } from '../../server/replay';

const SERVER = `http://127.0.0.1:${process.env.E2E_SHOPS_PORT ?? 4396}`;
const SHOP_URL = `${SERVER.replace('http:', 'ws:')}/shop`;

interface ClientView {
  you: string;
  n: number;
  checks: number;
  mismatches: number;
  outOfStep: number;
  rejects: number;
  rtt: number[];
  hash: string | null;
}
type Win = Window & {
  __shared: {
    ready: boolean;
    replay(log: StepLog): ReplayReport;
    connect(url: string, shop: string, name: string): Promise<unknown>;
    stateHash(s: unknown): string;
  };
  __client: {
    you: string;
    replica: { n: number; stats: { checks: number; mismatches: number } };
    stats: { outOfStep: unknown[]; rejects: unknown[]; rtt: number[] };
    send(c: unknown): number;
    view(t: string | null): void;
    state(): unknown;
    close(): void;
  };
};

async function openTestPage(page: Page): Promise<void> {
  await page.goto('/tests/e2e/shared/page.html');
  await page.waitForFunction(() => (window as unknown as Win).__shared?.ready === true, null, { timeout: 60_000 });
}

async function replayLog(page: Page, log: StepLog): Promise<ReplayReport> {
  return await page.evaluate((l) => (window as unknown as Win).__shared.replay(l), log);
}

test.describe('shared shops: lockstep across engines (chunk 10, SHARE-002)', () => {
  test('the cross-engine replay: the Node server’s steps, replayed here, match every fingerprint', async ({ page, request }) => {
    test.setTimeout(300_000);
    await openTestPage(page);
    const cases = [
      { shop: 'big_facility', speed: 10, hours: 168 },
      { shop: 'playthrough_betta', speed: 10, hours: 168 },
      { shop: 'playthrough_axolotl', speed: 10, hours: 168 },
      { shop: 'playthrough_betta', speed: 1, hours: 24 },
    ];
    for (const c of cases) {
      const res = await request.get(`${SERVER}/stub/replay?shop=${c.shop}&speed=${c.speed}&hours=${c.hours}`, { timeout: 120_000 });
      expect(res.ok(), c.shop).toBe(true);
      const log = (await res.json()) as StepLog;
      expect(log.fingerprints, c.shop).toBeGreaterThanOrEqual(16);
      expect(log.steps.some((s) => s.cmds?.length), c.shop).toBe(true);
      const rep = await replayLog(page, log);
      expect(rep, `${c.shop} at ${c.speed}×`).toMatchObject({ applied: rep.steps, checks: log.fingerprints, firstMismatch: null, stalled: null });
    }
  });

  test('a copy that differs is caught at the first fingerprint', async ({ page, request }) => {
    await openTestPage(page);
    const res = await request.get(`${SERVER}/stub/replay?shop=playthrough_betta&speed=10&hours=24`);
    const log = (await res.json()) as StepLog;
    const tampered = JSON.parse(log.snapshot) as { finance: { money: number } };
    tampered.finance.money += 1;
    const rep = await replayLog(page, { ...log, snapshot: JSON.stringify(tampered) });
    expect(rep.firstMismatch).toBe(log.steps.find((s) => s.fp)!.n);
    expect(rep.stalled).toBe('fingerprint');
  });

  test('two browsers in one shop: commands reach both, and both stay in step', async ({ browser }) => {
    test.setTimeout(180_000);
    const pages = await Promise.all([0, 1].map(async () => (await browser.newContext()).newPage()));
    for (const p of pages) await openTestPage(p);
    const [a, b] = pages;
    for (const [p, name] of [
      [a, 'A'],
      [b, 'B'],
    ] as const) {
      await p.evaluate(
        async ([url, who]) => {
          const w = window as unknown as Win;
          w.__client = (await w.__shared.connect(url, 'new_betta', who)) as Win['__client'];
        },
        [SHOP_URL, name] as const,
      );
    }
    const tank = await a.evaluate(() => {
      const s = (window as unknown as Win).__client.state() as { tankOrder: string[]; inventory: { foods: Record<string, number> } };
      return { id: s.tankOrder[0], food: Object.keys(s.inventory.foods).find((f) => s.inventory.foods[f] >= 1)! };
    });
    await a.evaluate((t) => {
      const c = (window as unknown as Win).__client;
      c.view(t.id);
      c.send({ k: 'setSpeed', speed: 10 });
      c.send({ k: 'feedTank', tank: t.id, food: t.food });
    }, tank);
    await b.evaluate((t) => (window as unknown as Win).__client.send({ k: 'waterChange', tank: t.id, fraction: 0.1 }), tank);
    // two fingerprints (one every 10 real seconds) on both
    const checks = (p: Page) => p.evaluate(() => (window as unknown as Win).__client.replica.stats.checks);
    await expect.poll(async () => Math.min(await checks(a), await checks(b)), { timeout: 60_000, intervals: [1000] }).toBeGreaterThanOrEqual(2);
    // pause, let both reach the same step, and compare the copies directly
    await b.evaluate(() => (window as unknown as Win).__client.send({ k: 'setSpeed', speed: 0 }));
    const view = (p: Page) =>
      p.evaluate((): ClientView => {
        const w = window as unknown as Win;
        const c = w.__client;
        const s = c.state();
        return {
          you: c.you,
          n: c.replica.n,
          checks: c.replica.stats.checks,
          mismatches: c.replica.stats.mismatches,
          outOfStep: c.stats.outOfStep.length,
          rejects: c.stats.rejects.length,
          rtt: c.stats.rtt,
          hash: s ? w.__shared.stateHash(s) : null,
        };
      });
    await expect.poll(async () => {
      const [va, vb] = [await view(a), await view(b)];
      return va.n === vb.n && va.n > 0 ? 'same step' : `${va.n} / ${vb.n}`;
    }, { timeout: 15_000 }).toBe('same step');
    await a.waitForTimeout(1500); // nothing more arrives while paused
    const [va, vb] = [await view(a), await view(b)];
    expect(va.n).toBe(vb.n);
    expect(va.hash).toBe(vb.hash);
    for (const v of [va, vb]) expect(v, v.you).toMatchObject({ mismatches: 0, outOfStep: 0, rejects: 0 });
    expect(va.rtt.length).toBe(2); // A's own commands came back in steps
    expect(vb.rtt.length).toBe(2);
    for (const p of pages) await p.evaluate(() => (window as unknown as Win).__client.close());
  });
});
