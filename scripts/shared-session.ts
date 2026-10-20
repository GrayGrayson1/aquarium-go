/**
 * Shared shops' session measurement (chunk 10, SHARED-SHOPS.md §11): members in Node (the dev connection,
 * src/dev/sharedProto.ts) join a stub shop on a server, play at a speed with a feed every 5 seconds (from each member in
 * turn), then pause, and report what each received, the command round trips, the share of real time the shop kept, and
 * the server's meters (its CPU per real second, its step, fingerprint and snapshot times).
 * Run: SERVER=https://aquarium-go-shops.onrender.com npx vite-node scripts/shared-session.ts <shop> <speed> <seconds> <members>
 * (SERVER defaults to the Render test service; a local `npm run server` is http://127.0.0.1:4396).
 */
import { connectShared, type SharedClient } from '@/dev/sharedProto';
const SERVER = process.env.SERVER ?? 'https://aquarium-go-shops.onrender.com';
const ORIGIN = process.env.ORIGIN ?? 'http://127.0.0.1:4455';
const [shop = 'playthrough_betta', speedS = '10', secondsS = '120', membersS = '2'] = process.argv.slice(2);
const speed = Number(speedS) as 1 | 3 | 10;
const seconds = Number(secondsS);
// Node's WebSocket sends no Origin; the server only takes the game's origins, so present the dev page's
const Base = globalThis.WebSocket;
(globalThis as any).WebSocket = class extends Base {
  constructor(url: string) {
    super(url, { headers: { origin: ORIGIN } } as any);
  }
};
const ws = SERVER.replace(/^http/, 'ws') + '/shop';
const before = await (await fetch(`${SERVER}/stats`)).json();
const roomBefore = before.rooms.find((r: any) => r.shop === shop)?.stats;
const clients: SharedClient[] = [];
const t0 = Date.now();
for (let i = 0; i < Number(membersS); i++) clients.push(await connectShared(ws, shop, `M${i + 1}`));
console.log(`joined ${clients.length} in ${Date.now() - t0} ms; step ${clients[0].replica.n}`);
const s0 = clients[0].state()!;
const tanks = s0.tankOrder.slice(0, clients.length);
clients.forEach((c, i) => c.view(tanks[i] ?? tanks[0]));
clients[0].send({ k: 'setSpeed', speed });
const start = Date.now();
const startN = clients[0].replica.n;
const startHour = clients[0].state()!.clock.hour;
let k = 0;
const timer = setInterval(() => {
  const c = clients[k++ % clients.length];
  const s = c.state();
  if (!s) return;
  const food = Object.keys(s.inventory.foods).find((f) => (s.inventory.foods[f] ?? 0) >= 1);
  if (food) c.send({ k: 'feedTank', tank: tanks[0], food });
}, 5000);
await new Promise((r) => setTimeout(r, seconds * 1000));
clearInterval(timer);
clients[0].send({ k: 'setSpeed', speed: 0 });
await new Promise((r) => setTimeout(r, 2500));
const wall = (Date.now() - start) / 1000;
const st = await (await fetch(`${SERVER}/stats`)).json();
for (const c of clients) {
  const s = c.stats;
  const recv = Object.values(s.bytes).reduce((a, b) => a + b, 0);
  const rtt = s.rtt.slice().sort((a, b) => a - b);
  console.log(`${c.you}: steps ${c.replica.n - startN}, checks ${c.replica.stats.checks}, mismatches ${c.replica.stats.mismatches}, out of step ${s.outOfStep.length}, rejects ${s.rejects.length}, received ${(recv / 1024).toFixed(1)} KB (${JSON.stringify(Object.fromEntries(Object.entries(s.bytes).map(([k, v]) => [k, Math.round(v)])))}), rtt median ${rtt[Math.floor(rtt.length / 2)]?.toFixed(0)} ms max ${rtt[rtt.length - 1]?.toFixed(0)} ms, apply avg ${(c.replica.stats.stepMs / Math.max(1, c.replica.stats.steps)).toFixed(2)} ms max ${c.replica.stats.maxStepMs.toFixed(1)} ms`);
}
const game = clients[0].state()!.clock.hour - startHour;
console.log(`game hours ${game.toFixed(2)} in ${seconds} s at ${speed}x = ${(game / seconds / (0.1 * speed) * 100).toFixed(0)}% of real time`);
const room = st.rooms.find((r: any) => r.shop === shop)?.stats;
const d = (k: string) => {
  const a = room?.[k] ?? { count: 0, ms: 0 };
  const b = roomBefore?.[k] ?? { count: 0, ms: 0 };
  const n = a.count - b.count;
  return `${n} × ${(n ? (a.ms - b.ms) / n : 0).toFixed(1)} ms`;
};
const cpuMs = (st.cpu.user + st.cpu.system - before.cpu.user - before.cpu.system) / 1000;
console.log(`server: time steps ${d('timeSteps')}, command steps ${d('commandSteps')}, fingerprints ${d('fingerprints')}, snapshots ${d('snapshots')} | CPU ${(cpuMs / wall).toFixed(0)} ms per real second (${(cpuMs / 1000).toFixed(1)} s in ${wall.toFixed(0)} s)`);
console.log('server sent:', JSON.stringify(st.sent), 'cpu', JSON.stringify(st.cpu), 'rss MB', (st.memory.rss / 1e6).toFixed(0));
for (const c of clients) c.close();
process.exit(0);
