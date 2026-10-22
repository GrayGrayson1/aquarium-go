/**
 * Chunk 12 (SHARED-SHOPS.md §9.3, §11; ADR-0047 decision 2) — the shared-shop server's live smoke test, and with
 * `--measure` the numbers for OWNER_QUESTIONS K1. Run by hand from a clone with node_modules and the Supabase CLI
 * signed in, after a deploy, never by `npm test` or e2e:
 *
 *   npx vite-node scripts/shared-smoke.ts             the smoke
 *   npx vite-node scripts/shared-smoke.ts --measure   the speed and data numbers on the free instance
 *
 * It makes a throwaway account (the first club's invite code, read with the CLI, never printed) and a throwaway club
 * with a shared shop (through `supabase db query --linked --project-ref <ref>`, scoped to the project), plays the shop
 * on the live server as that account — sign-in, the build's identity, commands, fingerprints, a refused pause, a photo,
 * a wrong token, a refreshed one, the save when it empties, and (chunk 14) the money pool: the account on Asks first
 * with some money approved, spending it, refused past it, asking, refused a tier and an answer — then removes the club
 * (its shop and photos go with it) and the account, and checks nothing of either is left. It never reads or prints the
 * server's password or any key but the publishable one.
 */
import { createClient } from '@supabase/supabase-js';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import type { GameState } from '@/types';
import { ONLINE_PROJECT, SHARED_SHOP_SERVER } from '@/social/project';
import { FRAME_PHOTO, SHARED_BUILD, type ServerMessage } from '@/types/shared';
import { newGame } from '@/sim/newGame';
import { tutorialSkip } from '@/sim/facility';
import { encodeRecord } from '@/persistence/serialize';
import { SharedReplica } from '@/game/sharedLoop';
import { FIXTURES } from '@/dev/fixtures';
import { applyCommand } from '@/sim/commands';
import { deepClone } from '@/sim/clone';
import { roundCents } from '@/sim/economy/util';

const CLI = process.env.SUPABASE_CLI ?? `${process.env.HOME}/.local/bin/supabase`;
const REF = /^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/.exec(ONLINE_PROJECT?.url ?? '')?.[1];
const SERVER = process.env.SMOKE_SERVER ?? SHARED_SHOP_SERVER;
const ORIGIN = 'https://graygrayson1.github.io';
const MEASURE = process.argv.includes('--measure');
if (!ONLINE_PROJECT || !REF || !SERVER) {
  console.error('No project or shop server in src/social/project.ts.');
  process.exit(2);
}
const WS_URL = `${SERVER.replace(/^http/, 'ws')}/shop`;
const stamp = Date.now();
const results: { name: string; ok: boolean }[] = [];
function check(name: string, ok: unknown, detail = ''): void {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? ` — ${detail}` : ''}`);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** An admin query through the CLI, scoped to this project (from a file, for long statements); returns the rows. */
function admin(sql: string): Record<string, unknown>[] {
  const dir = mkdtempSync(join(tmpdir(), 'aq-smoke-'));
  try {
    const file = join(dir, 'q.sql');
    writeFileSync(file, sql);
    const out = execFileSync(CLI, ['db', 'query', '--linked', '--project-ref', REF!, '-o', 'json', '-f', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
    const parsed = JSON.parse(out.slice(out.search(/[[{]/))) as { rows?: Record<string, unknown>[] } | Record<string, unknown>[];
    return Array.isArray(parsed) ? parsed : (parsed.rows ?? []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;

/** A shop's row from a game: gzipped and base64'd as the server stores one. */
function shopRow(g: GameState, savedAt: number) {
  const { text, header } = encodeRecord(g, 'shared', savedAt);
  return { body: gzipSync(text).toString('base64'), header };
}

/** A throwaway club with a shared shop holding `g`, the account a member (and allowed to pause when `pause`). */
function makeClub(user: string, g: GameState, pause: boolean): string {
  const id = admin(`insert into public.clubs (name, blurb, initials, color_a, color_b, invite_code) values (${lit(`Smoke shop ${stamp % 100000}`)}, '', 'SS', '#2fc4b2', '#127567', public.new_invite_code('SMOKE')) returning id`)[0].id as string;
  g.saveId = `shared_${id}`;
  const savedAt = Date.now();
  const { body, header } = shopRow(g, savedAt);
  admin(`insert into public.club_members (club_id, user_id) values (${lit(id)}, ${lit(user)});
insert into public.shared_shops (club_id, shop_name, created_by, pausers, revision, schema_version, build, saved_at, left_at, hour, day, money, encoding, body)
values (${lit(id)}, ${lit(g.shopName ?? 'Smoke')}, null, ${pause ? `array[${lit(user)}]::uuid[]` : `'{}'`}, 1, ${header.schemaVersion}, 'smoke', ${savedAt}, ${savedAt}, ${g.clock.hour}, ${header.meta.day}, ${header.meta.money}, 'gzip-base64', ${lit(body)});`);
  return id;
}

interface Conn {
  ws: WebSocket;
  texts: ServerMessage[];
  bins: Uint8Array[];
  replica: SharedReplica;
  closed: { code: number; reason: string } | null;
  welcome: Extract<ServerMessage, { t: 'welcome' }> | null;
  rtt: number[];
  sent: Map<number, number>;
}

function connect(token: string, club: string): Conn {
  const Ws = WebSocket as unknown as new (url: string, init: unknown) => WebSocket;
  const ws = new Ws(WS_URL, { headers: { origin: ORIGIN } });
  ws.binaryType = 'arraybuffer';
  const c: Conn = { ws, texts: [], bins: [], replica: new SharedReplica((fn) => setTimeout(fn, 0)), closed: null, welcome: null, rtt: [], sent: new Map() };
  c.replica.onOutOfStep = () => ws.send(JSON.stringify({ t: 'resync' }));
  ws.onopen = () => ws.send(JSON.stringify({ t: 'hello', token, build: SHARED_BUILD, club }));
  ws.onclose = (e) => (c.closed = { code: e.code, reason: e.reason });
  ws.onerror = () => {};
  ws.onmessage = (e: MessageEvent) => {
    if (typeof e.data !== 'string') {
      const b = new Uint8Array(e.data as ArrayBuffer);
      c.bins.push(b);
      if ((b[0] === 1 || b[0] === 2) && c.welcome) {
        const body = Buffer.from(b.subarray(1));
        c.replica.load(JSON.parse(b[0] === 1 ? gunzipSync(body).toString('utf8') : body.toString('utf8')) as GameState, c.welcome.n, c.welcome.full);
      }
      return;
    }
    const m = JSON.parse(e.data) as ServerMessage;
    c.texts.push(m);
    if (m.t === 'welcome') c.welcome = m;
    if (m.t === 'steps') {
      c.replica.apply(m.s);
      for (const s of m.s) for (const sc of s.cmds ?? []) if (sc.id !== undefined && c.sent.has(sc.id)) c.rtt.push(Date.now() - c.sent.get(sc.id)!);
    }
  };
  return c;
}
let nextId = 1;
function cmd(c: Conn, command: unknown): number {
  const id = nextId++;
  c.sent.set(id, Date.now());
  c.ws.send(JSON.stringify({ t: 'cmd', id, c: command }));
  return id;
}
async function until(cond: () => boolean, ms: number): Promise<boolean> {
  const end = Date.now() + ms;
  while (!cond() && Date.now() < end) await sleep(100);
  return cond();
}
const stats = async () => (await (await fetch(`${SERVER}/stats`)).json()) as { cpu: { user: number; system: number }; uptimeS: number; rooms: { members?: number; stats: Record<string, unknown> | null }[]; sent: Record<string, number> };

const sb = createClient(ONLINE_PROJECT.url, ONLINE_PROJECT.publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
let user: string | null = null;
const clubs: string[] = [];

try {
  // 0. the server answers, runs this build, and lets the game's site wake it
  const t0 = Date.now();
  let health: { ok?: boolean; build?: string; stub?: boolean; version?: string } | null = null;
  let cors: string | null = null;
  for (let i = 0; i < 30 && !health?.ok; i++) {
    try {
      const res = await fetch(`${SERVER}/health`, { headers: { origin: ORIGIN } });
      cors = res.headers.get('access-control-allow-origin');
      health = await res.json();
    } catch {
      await sleep(3000);
    }
  }
  console.log(`(the server answered in ${((Date.now() - t0) / 1000).toFixed(1)} s, version ${health?.version})`);
  check('/health answers', health?.ok === true);
  check('it runs this build (the same hash of what every copy runs)', health?.build === SHARED_BUILD.hash, `${health?.build} vs ${SHARED_BUILD.hash}`);
  check('it runs on the database, not the stub', health?.stub === false);
  check('/health allows the game’s site (CORS)', cors === ORIGIN, String(cors));

  // 1. a throwaway account in the first club
  const code = admin("select invite_code from public.clubs where name = 'Aquarium Go Friends' order by created_at limit 1")[0]?.invite_code as string | undefined;
  if (!code) throw new Error('no first club');
  const up = await sb.auth.signUp({ email: `smoke-shop-${stamp}@example.com`, password: `Smoke-${stamp}-${Math.random().toString(36).slice(2)}`, options: { data: { invite_code: code, display_name: 'Smoke Shop', age_ok: true } } });
  user = up.data.user?.id ?? null;
  const token = up.data.session?.access_token;
  check('a throwaway account signs up', !!user && !!token, up.error?.message);
  if (!user || !token) throw new Error('no account');

  if (!MEASURE) {
    // 2. a throwaway club with a new shop, running at 10×
    const g = newGame({ starterId: 'betta', starterName: 'Smoke', shopName: 'Smoke Reef', seed: stamp >>> 0 });
    tutorialSkip(g);
    g.clock.speed = 10;
    // chunk 14 (ADR-0050): the account asks first, with a pack and a half of food approved for it
    const buyable = Object.keys(g.inventory.foods).find((f) => applyCommand(deepClone(g), { k: 'buyFood', food: f, packs: 1 }).ok)!;
    const probe = deepClone(g);
    applyCommand(probe, { k: 'buyFood', food: buyable, packs: 1 });
    const price = roundCents(g.finance.money - probe.finance.money);
    const approved = roundCents(price * 1.5);
    g.pool = { members: { [user]: { name: 'Smoke Shop', tier: 'ask', extra: approved } } };
    const club = makeClub(user, g, false);
    clubs.push(club);
    const shopsRead = await sb.rpc('club_shared_shops');
    check('club_shared_shops() lists the throwaway shop for its member, without the body', JSON.stringify(shopsRead.data ?? '').includes(club) && !JSON.stringify(shopsRead.data).includes('body'), shopsRead.error?.message);
    const usage = await sb.rpc('shared_usage');
    check('shared_usage() is the owner’s only', !!usage.error && /forbidden/.test(usage.error.message), JSON.stringify(usage.data));

    // 3. join on the live server
    const c = connect(token, club);
    check('joins: a welcome and the shop', await until(() => !!c.replica.state, 90_000), JSON.stringify(c.closed));
    check('the welcome names this player, not the owner, who may not pause', c.welcome?.you.id === user && c.welcome.you.owner === false && c.welcome.you.pause === false, JSON.stringify(c.welcome?.you));
    check('the shop is the one stored', c.replica.state?.shopName === 'Smoke Reef' && c.replica.state.saveId === `shared_${club}`);
    const tank = c.replica.state!.tankOrder[0];
    c.ws.send(JSON.stringify({ t: 'view', tank }));
    const food = Object.keys(c.replica.state!.inventory.foods).find((f) => (c.replica.state!.inventory.foods[f] ?? 0) >= 1)!;
    const fed = cmd(c, { k: 'feedTank', tank, food });
    check('a command comes back in a step, sent by this player', await until(() => c.texts.some((m) => m.t === 'steps' && m.s.some((s) => s.cmds?.some((x) => x.id === fed && x.by === user))), 10_000));
    const paused = cmd(c, { k: 'setSpeed', speed: 0 });
    check('a pause without permission is refused', await until(() => c.texts.some((m) => m.t === 'reject' && m.id === paused && m.why === 'forbidden'), 10_000));

    // 3b. chunk 14, the money pool: the approved money spent, a purchase over it refused, a request, the owner's commands
    const inStep = (id: number) => c.texts.some((m) => m.t === 'steps' && m.s.some((s) => s.cmds?.some((x) => x.id === id)));
    const rejected = (id: number) => c.texts.find((m): m is Extract<ServerMessage, { t: 'reject' }> => m.t === 'reject' && m.id === id);
    const extra = () => c.replica.state?.pool?.members?.[user!]?.extra;
    const bought = cmd(c, { k: 'buyFood', food: buyable, packs: 1 });
    check('a purchase within the approved money goes through, and the approved money drops by its price', (await until(() => inStep(bought), 10_000)) && (await until(() => extra() === roundCents(approved - price), 5000)), `extra ${extra()}`);
    const over = cmd(c, { k: 'buyFood', food: buyable, packs: 1 });
    check('a purchase over it is refused (spend), with what it cost and what the account had', await until(() => {
      const r = rejected(over);
      return r?.why === 'spend' && r.cost === price && r.can === roundCents(approved - price);
    }, 10_000), JSON.stringify(rejected(over)));
    const asked = cmd(c, { k: 'askMoney', amount: 100, note: 'Smoke test' });
    check('a request for money comes back in a step and waits in the pool', (await until(() => inStep(asked), 10_000)) && c.replica.state?.pool?.asks?.[0]?.amount === 100);
    const askId = c.replica.state?.pool?.asks?.[0]?.id ?? 'ask_none';
    const tierCmd = cmd(c, { k: 'setSpending', member: user, name: 'Smoke Shop', tier: 'free' });
    const answerCmd = cmd(c, { k: 'answerAsk', ask: askId, yes: true });
    check('a tier and an answer without the permission are refused (forbidden)', await until(() => rejected(tierCmd)?.why === 'forbidden' && rejected(answerCmd)?.why === 'forbidden', 10_000));
    check('two fingerprints, both matching', await until(() => c.replica.stats.checks >= 2, 40_000) && c.replica.stats.mismatches === 0, JSON.stringify(c.replica.stats));

    // 4. a listing photo: stored once, forwarded as its reference, served back
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2000, 5)]);
    const fish = Object.values(c.replica.state!.creatures).find((x) => x.isStarter)!;
    const listed = cmd(c, { k: 'createListing', kind: 'creature', creatures: [fish.id], reserve: 50, hours: 24, photo: `data:image/jpeg;base64,${jpeg.toString('base64')}` });
    await until(() => c.texts.some((m) => m.t === 'steps' && m.s.some((s) => s.cmds?.some((x) => x.id === listed))), 10_000);
    const ref = c.texts.flatMap((m) => (m.t === 'steps' ? m.s.flatMap((s) => s.cmds ?? []) : [])).find((x) => x.id === listed)?.c as { photo?: string } | undefined;
    check('the listing’s photo arrives as a reference', /^p:[0-9a-f]{64}$/.test(ref?.photo ?? ''), ref?.photo?.slice(0, 40));
    const hash = ref?.photo?.slice(2) ?? '';
    c.ws.send(JSON.stringify({ t: 'photo', hash }));
    check('the photo is served back, byte for byte', await until(() => c.bins.some((b) => b[0] === FRAME_PHOTO && Buffer.from(b.subarray(66)).equals(jpeg)), 15_000));
    check('the photo is stored once in the database', (await until(() => Number(admin(`select count(*) as n from public.shared_photos where club_id = ${lit(club)} and hash = ${lit(hash)}`)[0]?.n) === 1, 15_000)));

    // 5. tokens: a wrong one is refused; a refreshed one for the same player keeps the connection
    const before = ((await stats()) as unknown as { connections: number }).connections;
    const bad = connect('not-a-token', club);
    // through Render's proxy the server's close frame doesn't arrive (and the proxy keeps the browser's end open about
    // 20 seconds): the `bye` message says why, and the browser closes the socket itself
    check('a wrong token is refused (bye: sign-in)', await until(() => bad.texts.some((m) => m.t === 'bye' && m.why === 'sign-in'), 15_000), JSON.stringify(bad.texts));
    let after = -1;
    check('…and the server drops it within a few seconds', await until(() => (void stats().then((st) => (after = (st as unknown as { connections: number }).connections)), after >= 0 && after <= before), 10_000), `${before} → ${after}`);
    bad.ws.close();
    c.ws.send(JSON.stringify({ t: 'token', token }));
    await sleep(1500);
    check('a refreshed token for the same player keeps the connection', c.closed === null);

    // 6. leaving saves the shop, recording when it emptied
    c.ws.close();
    const saved = await until(() => {
      const row = admin(`select revision, left_at from public.shared_shops where club_id = ${lit(club)}`)[0];
      return Number(row?.revision) >= 2 && row?.left_at !== null;
    }, 30_000);
    check('the shop saved when it emptied (a new revision, left_at set)', saved);
  } else {
    // K1 (§11): each shop at its speeds for a minute, the account allowed to change the speed
    // the stub shops chunk 10 measured (scripts/shared-stub-shops.ts): a new game, a month-old shop, a late-game one
    const runs: [string, () => GameState, number[]][] = [
      ['new_betta', () => newGame({ seed: 20261020, starterId: 'betta', starterName: '', shopName: 'Shared shop (test)' }), [10]],
      ['playthrough_betta', () => FIXTURES.playthrough_betta(), [1, 10]],
      ['big_facility', () => FIXTURES.big_facility(), [1, 3, 10]],
    ];
    const rows: string[] = [];
    for (const [name, make, speeds] of runs) {
      const g = make();
      g.clock.speed = 0;
      // every animal fed at the start, so the starvation guard doesn't slow a run to 1× (§3.2 rule 6) and hide the server's pace
      for (const c of Object.values(g.creatures)) if (c.status === 'alive' || c.status === 'listed') c.stats.hunger = 0;
      const club = makeClub(user, g, true);
      clubs.push(club);
      const c = connect(token, club);
      if (!(await until(() => !!c.replica.state, 120_000))) {
        check(`${name}: joins`, false, JSON.stringify(c.closed));
        continue;
      }
      const tank = c.replica.state!.tankOrder[0];
      c.ws.send(JSON.stringify({ t: 'view', tank }));
      for (const speed of speeds) {
        cmd(c, { k: 'setSpeed', speed });
        await sleep(3000);
        const s0 = await stats();
        const h0 = c.replica.state!.clock.hour;
        const w0 = Date.now();
        c.rtt.length = 0;
        const feeder = setInterval(() => {
          const st = c.replica.state;
          const food = st && Object.keys(st.inventory.foods).find((f) => (st.inventory.foods[f] ?? 0) >= 1);
          if (food) cmd(c, { k: 'feedTank', tank, food });
          c.ws.send(JSON.stringify({ t: 'input' }));
        }, 5000);
        await sleep(60_000);
        clearInterval(feeder);
        const s1 = await stats();
        const realS = (Date.now() - w0) / 1000;
        const kept = (c.replica.state!.clock.hour - h0) / (realS * 0.1 * speed);
        const cpuMs = (s1.cpu.user + s1.cpu.system - s0.cpu.user - s0.cpu.system) / 1000 / realS;
        type RoomStats = { timeSteps: { count: number; ms: number; max: number }; fingerprints: { count: number; ms: number; max: number }; fingerprintEveryMs: number; slowdowns: number; speed: number };
        // the room this account is in (earlier runs' rooms stay loaded, empty, for 15 minutes)
        const r0 = s0.rooms.find((r) => (r.members ?? 0) > 0 && r.stats)?.stats as RoomStats | undefined;
        const room = s1.rooms.find((r) => (r.members ?? 0) > 0 && r.stats)?.stats as RoomStats | undefined;
        // this run's steps: the room's counts are since it started
        const stepMean = room && r0 ? (room.timeSteps.ms - r0.timeSteps.ms) / Math.max(1, room.timeSteps.count - r0.timeSteps.count) : NaN;
        const fpMean = room && r0 ? (room.fingerprints.ms - r0.fingerprints.ms) / Math.max(1, room.fingerprints.count - r0.fingerprints.count) : NaN;
        const med = [...c.rtt].sort((a, b) => a - b)[Math.floor(c.rtt.length / 2)] ?? NaN;
        const slowed = room && r0 ? room.slowdowns - r0.slowdowns : 0;
        rows.push(`| ${name} | ${speed}× | ${(kept * 100).toFixed(0)}%${slowed ? ` (slowed to 1× ${slowed}×)` : ''} | ${cpuMs.toFixed(0)} ms | ${stepMean.toFixed(1)} ms (max ${room?.timeSteps.max.toFixed(0)}) | ${fpMean.toFixed(0)} ms, every ${room ? (room.fingerprintEveryMs / 1000).toFixed(0) : '?'} s | ${med.toFixed(0)} ms | ${c.replica.stats.mismatches} |`);
        console.log(rows.at(-1));
      }
      c.ws.close();
      await sleep(2000);
    }
    console.log('\n| Shop | Speed | Game time kept | Server CPU per real second | A time step (mean, max) | A fingerprint, interval | Command round trip (median) | Mismatches |\n|---|---|---|---|---|---|---|---|');
    for (const r of rows) console.log(r);
    const usage = await (await fetch(`${SERVER}/stats`)).json();
    console.log(`\nsent since start (bytes, before ×1.4): ${JSON.stringify(usage.sent)}; month: ${JSON.stringify(usage.month)}`);
  }
} catch (e) {
  check('the run finished', false, e instanceof Error ? e.message : String(e));
} finally {
  // the clubs go (their shops and photos with them), then the account; nothing of either may be left
  for (const club of clubs) admin(`delete from public.clubs where id = ${lit(club)}`);
  if (user) {
    const del = await sb.rpc('delete_my_account');
    check('the throwaway account is deleted', !del.error, del.error?.message);
  }
  if (clubs.length) {
    const list = clubs.map(lit).join(', ');
    const left = admin(`select (select count(*) from public.clubs where id in (${list})) + (select count(*) from public.shared_shops where club_id in (${list})) + (select count(*) from public.shared_photos where club_id in (${list})) + (select count(*) from public.club_members where club_id in (${list})) as n`)[0];
    check('nothing of the throwaway clubs, shops or photos is left', Number(left?.n) === 0, JSON.stringify(left));
  }
  if (user) {
    const left = admin(`select (select count(*) from auth.users where id = ${lit(user)}) + (select count(*) from public.profiles where id = ${lit(user)}) as n`)[0];
    check('nothing of the throwaway account is left', Number(left?.n) === 0, JSON.stringify(left));
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed} of ${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}
