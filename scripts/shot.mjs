#!/usr/bin/env node
// Screenshot helper for visual QA.
// Usage: node scripts/shot.mjs <url> <out.png> [--w 1440] [--h 900] [--wait 4000] [--eval "js"] [--click "selector"] [--headed]
// Starts nothing: point it at a running dev server (npm run dev -- --port XXXX).
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const url = args[0];
const out = args[1] ?? 'shot.png';
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const has = (name) => args.includes(`--${name}`);
const width = Number(opt('w', 1440));
const height = Number(opt('h', 900));
const wait = Number(opt('wait', 4000));
const evalJs = opt('eval', null);
const clicks = [];
for (let i = 0; i < args.length; i++) if (args[i] === '--click') clicks.push(args[i + 1]);

const browser = await chromium.launch({
  headless: !has('headed'),
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: Number(opt('dpr', 1)) });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(wait);
for (const c of clicks) {
  try { await page.click(c, { timeout: 5000 }); await page.waitForTimeout(1200); } catch (e) { logs.push(`[click-failed] ${c}: ${e.message.split('\n')[0]}`); }
}
if (evalJs) {
  try { const r = await page.evaluate(evalJs); if (r !== undefined) console.log('eval:', JSON.stringify(r)); } catch (e) { logs.push(`[eval-failed] ${e.message}`); }
  await page.waitForTimeout(Number(opt('after', 1500)));
}
await page.screenshot({ path: out });
console.log(`saved ${out}`);
if (logs.length) console.log(logs.slice(0, 40).join('\n'));
await browser.close();
