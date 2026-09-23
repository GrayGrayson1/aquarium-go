#!/usr/bin/env node
// Standard visual-QA screenshot set (spec §31). Point it at a RUNNING dev/preview server; it starts nothing.
//
// Usage:
//   node scripts/qa-shots.mjs [baseUrl] [--out screenshots] [--only title,starter,...] [--wait 6000] [--dpr 1] [--headed]
//   e.g. node scripts/qa-shots.mjs http://127.0.0.1:5216
//
// Shots (file names are stable so reviews can diff them):
//   01-title  02-starter-select  03-tank-<starter> ×5  04-build-mode  05-market-listing  06-auction-bids
//   07-facility-visitors  08-large-tank  09-mobile-title  10-mobile-tank
// Each shot runs in a fresh browser context (clean storage). Uses data-testids (docs/TEST_IDS.md) and window.__AQ.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : def;
};
const has = (name) => argv.includes(`--${name}`);
const base = (argv[0] && !argv[0].startsWith('--') ? argv[0] : 'http://127.0.0.1:5216').replace(/\/$/, '');
const outDir = resolve(opt('out', 'screenshots'));
const only = opt('only', null)?.split(',').map((s) => s.trim());
const settle = Number(opt('wait', 6000));
const dpr = Number(opt('dpr', 1));
const STARTERS = ['axolotl', 'betta', 'pea_puffer', 'ocellaris_clownfish', 'lined_seahorse'];
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: !has('headed'),
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'],
});

const results = [];

async function withPage(viewport, mobile, fn) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: mobile ? 2 : dpr,
    hasTouch: mobile,
    isMobile: mobile,
  });
  const page = await context.newPage();
  const logs = [];
  page.on('console', (m) => {
    if (m.type() === 'error') logs.push(`[error] ${m.text()}`);
  });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  try {
    await fn(page, logs);
  } finally {
    await context.close();
  }
  return logs;
}

async function ready(page, path = '/') {
  await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__AQ?.ready, null, { timeout: 30_000 });
}

async function clickTid(page, id, logs, { optional = false, timeout = 5000 } = {}) {
  try {
    await page.getByTestId(id).first().click({ timeout });
    await page.waitForTimeout(700);
    return true;
  } catch (e) {
    if (!optional) logs.push(`[missing] data-testid="${id}"`);
    return false;
  }
}

/** New game via __AQ with the tutorial skipped so shots are clean. */
async function quickGame(page, starterId, { money = 0, keepTutorial = false } = {}) {
  await page.evaluate(
    ([id, m, keep]) => {
      window.__AQ.newGame(id, undefined, 424242);
      window.__AQ.dev.unlockAll();
      if (m) window.__AQ.dev.addMoney(m);
      if (!keep) window.__AQ.act('tutorialSkip');
    },
    [starterId, money, keepTutorial],
  );
}

/** A listing (with a spare animal) — returns its id or null when the market lane isn't ready. */
async function makeListing(page) {
  return page.evaluate(() => {
    const aq = window.__AQ;
    const g = aq.state();
    const species = g.starterId;
    const spawned = aq.dev.spawnSpecies(species, g.tankOrder[0], { sex: 'female', count: 1 });
    const id = spawned.ids?.[0] ?? Object.values(g.creatures)[0].id;
    const r = aq.act('createListing', { kind: 'creature', creatureIds: [id], reserve: 10, durationHours: 96, title: 'QA listing' });
    return r?.listingId ?? aq.state().market.listings[0]?.id ?? null;
  });
}

async function shot(name, viewport, mobile, fn) {
  if (only && !only.some((o) => name.includes(o))) return;
  const file = `${outDir}/${name}.png`;
  const t0 = Date.now();
  let ok = true;
  const logs = await withPage(viewport, mobile, async (page, logs) => {
    try {
      await fn(page, logs);
      await page.screenshot({ path: file });
    } catch (e) {
      ok = false;
      logs.push(`[failed] ${e.message.split('\n')[0]}`);
      try {
        await page.screenshot({ path: file });
      } catch {
        /* ignore */
      }
    }
  });
  results.push({ name, ok, ms: Date.now() - t0, logs });
  console.log(`${ok ? '✓' : '✗'} ${name}.png (${((Date.now() - t0) / 1000).toFixed(1)}s)${logs.length ? '\n    ' + logs.slice(0, 8).join('\n    ') : ''}`);
}

// ─────────────────────────────── the standard set ───────────────────────────────

await shot('01-title', DESKTOP, false, async (page) => {
  await ready(page);
  await page.waitForTimeout(settle);
});

await shot('02-starter-select', DESKTOP, false, async (page, logs) => {
  await ready(page);
  await page.waitForTimeout(1500);
  await clickTid(page, 'title-new-game', logs);
  await page.waitForTimeout(settle * 0.6);
});

for (const id of STARTERS) {
  await shot(`03-tank-${id}`, DESKTOP, false, async (page) => {
    await ready(page);
    await quickGame(page, id);
    await page.waitForTimeout(settle);
  });
}

await shot('04-build-mode', DESKTOP, false, async (page, logs) => {
  await ready(page);
  await quickGame(page, 'betta', { money: 3000 });
  await page.waitForTimeout(2000);
  await clickTid(page, 'dock-build', logs);
  // Decor tab of the build panel (the panel honours panelTarget 'tab:<id>').
  await page.evaluate(() => window.__AQ.setUI({ panel: 'build', panelTarget: 'tab:decor' }));
  await page.waitForTimeout(settle * 0.5);
});

await shot('05-market-listing', DESKTOP, false, async (page, logs) => {
  await ready(page);
  await quickGame(page, 'betta', { money: 3000 });
  const id = await makeListing(page);
  if (!id) logs.push('[note] createListing unavailable — market lane not ready');
  await page.waitForTimeout(1500);
  await clickTid(page, 'dock-market', logs);
  if (id) await page.evaluate((lid) => window.__AQ.setUI({ panel: 'market', panelTarget: `listing:${lid}` }), id);
  await page.waitForTimeout(settle * 0.4);
});

await shot('06-auction-bids', DESKTOP, false, async (page, logs) => {
  await ready(page);
  await quickGame(page, 'betta', { money: 3000 });
  const id = await makeListing(page);
  const bids = await page.evaluate((lid) => {
    for (let i = 0; i < 8; i++) {
      window.__AQ.advance(12);
      const l = window.__AQ.state().market.listings.find((x) => x.id === lid);
      if (!l || l.bids.length || l.status !== 'active') return l?.bids.length ?? 0;
    }
    return 0;
  }, id);
  if (!bids) logs.push('[note] no bids arrived after 96 h');
  await page.waitForTimeout(1200);
  await clickTid(page, 'dock-market', logs);
  if (id) await page.evaluate((lid) => window.__AQ.setUI({ panel: 'market', panelTarget: `listing:${lid}` }), id);
  await page.waitForTimeout(settle * 0.4);
});

await shot('07-facility-visitors', DESKTOP, false, async (page) => {
  await ready(page, '/?fixture=big_facility&view=facility');
  await page.evaluate(() => {
    // Simulate forward to mid-afternoon so the hall is open and visitors are about.
    const h = window.__AQ.state().clock.hour % 24;
    if (h < 13) window.__AQ.advance(14 - h);
  });
  await page.waitForTimeout(settle + 3000);
});

await shot('08-large-tank', DESKTOP, false, async (page) => {
  await ready(page, '/?fixture=big_facility');
  await page.evaluate(() => window.__AQ.focusLargestTank());
  await page.waitForTimeout(settle + 2000);
});

await shot('09-mobile-title', MOBILE, true, async (page) => {
  await ready(page);
  await page.waitForTimeout(settle);
});

await shot('10-mobile-tank', MOBILE, true, async (page) => {
  await ready(page);
  await quickGame(page, 'pea_puffer');
  await page.waitForTimeout(settle);
});

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} shots saved to ${outDir}`);
if (failed.length) process.exitCode = 1;
