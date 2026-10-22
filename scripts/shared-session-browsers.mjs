// Shared shops' session in real browsers (chunk 10, SHARED-SHOPS.md §11): Chromium and WebKit on this machine join one
// stub shop on a server through the test page, play at a speed with a feed every 5 seconds, then pause; both copies must
// be at the same step with the same fingerprint. Needs the Vite dev server for the test page:
//   npx vite --host 127.0.0.1 --port 4455 --strictPort
// Run: PLAYWRIGHT_BROWSERS_PATH=~/LocalTest/playwright node scripts/shared-session-browsers.mjs <shop> <speed> <seconds>
import { chromium, webkit } from 'playwright';
const SERVER = process.env.SERVER ?? 'https://aquarium-go-shops.onrender.com';
const PAGE = process.env.PAGE ?? 'http://127.0.0.1:4455/tests/e2e/shared/page.html';
const [shop = 'playthrough_betta', speedS = '10', secondsS = '120'] = process.argv.slice(2);
const speed = Number(speedS);
const seconds = Number(secondsS);
const wsUrl = SERVER.replace(/^http/, 'ws') + '/shop';
const before = await (await fetch(`${SERVER}/stats`)).json();
const browsers = [await chromium.launch(), await webkit.launch()];
const pages = [];
for (const [i, b] of browsers.entries()) {
  const p = await b.newPage();
  await p.goto(PAGE);
  await p.waitForFunction(() => window.__shared?.ready, null, { timeout: 120000 });
  const t0 = Date.now();
  await p.evaluate(async ([u, s, n]) => { window.__client = await window.__shared.connect(u, s, n); }, [wsUrl, shop, i ? 'WebKit' : 'Chromium']);
  console.log(`${i ? 'webkit' : 'chromium'} joined in ${Date.now() - t0} ms`);
  pages.push(p);
}
const tanks = await pages[0].evaluate(() => window.__client.state().tankOrder.slice(0, 2));
await pages[0].evaluate((t) => window.__client.view(t), tanks[0]);
await pages[1].evaluate((t) => window.__client.view(t), tanks[1] ?? tanks[0]);
await pages[0].evaluate((sp) => window.__client.send({ k: 'setSpeed', speed: sp }), speed);
const start = Date.now();
let k = 0;
while (Date.now() - start < seconds * 1000) {
  await new Promise((r) => setTimeout(r, 5000));
  const p = pages[k++ % 2];
  await p.evaluate((t) => {
    const s = window.__client.state();
    const food = Object.keys(s.inventory.foods).find((f) => s.inventory.foods[f] >= 1);
    if (food) window.__client.send({ k: 'feedTank', tank: t, food });
  }, tanks[0]);
}
await pages[1].evaluate(() => window.__client.send({ k: 'setSpeed', speed: 0 }));
await new Promise((r) => setTimeout(r, 3000));
const after = await (await fetch(`${SERVER}/stats`)).json();
const views = [];
for (const p of pages) {
  views.push(await p.evaluate(() => {
    const c = window.__client;
    const rtt = c.stats.rtt.slice().sort((a, b) => a - b);
    return { you: c.you, n: c.replica.n, hash: window.__shared.stateHash(c.state()), checks: c.replica.stats.checks, mismatches: c.replica.stats.mismatches, outOfStep: c.stats.outOfStep.length, bytes: c.stats.bytes, rttMedian: rtt[Math.floor(rtt.length / 2)], rttMax: rtt[rtt.length - 1], applyAvg: c.replica.stats.stepMs / Math.max(1, c.replica.stats.steps), maxBatchMs: c.stats.maxBatchMs, checkMs: c.replica.stats.checkMs / Math.max(1, c.replica.stats.checks) };
  }));
}
for (const [i, v] of views.entries()) console.log(i ? 'webkit  ' : 'chromium', JSON.stringify(v));
console.log('same step and copy:', views[0].n === views[1].n && views[0].hash === views[1].hash);
const cpu = (after.cpu.user + after.cpu.system - before.cpu.user - before.cpu.system) / 1000;
console.log(`server CPU ${(cpu / (seconds + 3)).toFixed(0)} ms per real second; sent ${((after.sent.total - before.sent.total) / 1024).toFixed(0)} KB`);
for (const p of pages) await p.evaluate(() => window.__client.close());
for (const b of browsers) await b.close();
