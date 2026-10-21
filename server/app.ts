/**
 * The shared-shop server (SHARED-SHOPS.md §5): HTTP (`/health` for waking it, with CORS for the game's sites;
 * `/stats`), the WebSocket at `/shop`, and one room per shop (./rooms.ts). This thread signs members in (./auth.ts),
 * checks their club, holds one connection per player, enforces the limits (§5.3), meters what it sends against the
 * caps (./usage.ts) and is the only one that talks to the database (./store.ts): rooms ask it, for their own club only.
 *
 * Nothing a request or a message carries may take the server down (chunk 10's review): each handler catches its own,
 * and a member's text is parsed and checked again in their room's thread.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Duplex } from 'node:stream';
import type { AddressInfo } from 'node:net';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, type WebSocket } from 'ws';
import { SHARED_BUILD, type ByeReason, type ClosingMessage, type ClosingReason, type RejectReason, type ServerMessage, type SharedBuild } from '@/types/shared';
import { originAllowed, type ServerConfig } from './config';
import type { Auth } from './auth';
import type { Store } from './store';
import { Usage, frameHeader } from './usage';
import { ROOM_CALLS, type FromRoom, type OpenMode } from './protocol';
import { inlineRunner, workerRunner, type RoomRunner } from './rooms';
import type { HostClock, HostTimers } from './host';
import { availableShops, loadShopText } from './shops';

/** Most a member may send (§5.3): 16 KB a message, 48 KB for a listing with its photo. */
export const MAX_MESSAGE = 16 * 1024;
export const MAX_LISTING_MESSAGE = 48 * 1024;
export const MAX_COMMANDS_PER_S = 10;
export const MAX_MESSAGES_PER_S = 30;
/** At most this many members in one shop at once (§5.3, ADR-0043 decision 3). */
export const MAX_MEMBERS = 10;
/** Joins and reconnects per player in an hour (§5.3). */
export const JOINS_PER_HOUR = 20;
/** A connection that hasn't said `hello` by then is closed, so idle sockets can't hold every slot. */
const HELLO_WITHIN_MS = 10_000;
/** A room with no connection for this long saves and ends (§5.2 item 5). */
export const EMPTY_ROOM_MS = 15 * 60_000;
/** Membership is checked again this often (§5.3). */
export const MEMBER_CHECK_MS = 15 * 60_000;
/** Messages kept while a `hello` is being checked. */
const MAX_QUEUED = 20;
/** Bytes an HTTP answer's headers add, roughly. */
const HTTP_HEADER_BYTES = 220;
/** The most connections the server holds (each member has one; the rest are joining or idle). */
const MAX_CONNECTIONS = 120;
/** A close that tells the browser it was away too long (it reconnects when the player is back). */
export const CLOSE_AWAY = 4000;
/** A closed socket is ended this long after its close frame, answered or not (a proxy may eat the handshake). */
export const BYE_GRACE_MS = 2000;
/** Bytes waiting to go to one member: past PHOTO_BUFFERED no photo is sent, past MAX_BUFFERED the connection ends. */
export const PHOTO_BUFFERED = 1_000_000;
export const MAX_BUFFERED = 8_000_000;
/** A sign-in that expired this long ago without a fresh `token` ends the connection (`bye: sign-in`). */
export const TOKEN_GRACE_MS = 10 * 60_000;

/**
 * The calls a room may make through the main thread (protocol.ts ROOM_CALLS), each about its own club only: a save names
 * its club inside, every other call names it first.
 */
export function roomCallAllowed(fn: string, args: readonly unknown[], club: string): boolean {
  if (!(ROOM_CALLS as readonly string[]).includes(fn)) return false;
  const named = fn === 'shopPut' ? (args[0] as { club?: unknown } | null)?.club : args[0];
  return named === club;
}

/** Is `a` an older release than `b`? (`x.y.z`, numbers only; anything unreadable counts as older.) */
export function olderVersion(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const x = pa[i];
    const y = pb[i];
    if (!Number.isInteger(x)) return true;
    if (!Number.isInteger(y)) return false;
    if (x !== y) return x < y;
  }
  return false;
}

/** Builds play together when their hashes match (§5.1); otherwise the older side reloads, or waits for the server. */
export function buildVerdict(client: SharedBuild, server: SharedBuild): 'build' | 'updating' | null {
  if (client.hash === server.hash) return null;
  return olderVersion(client.version, server.version) ? 'build' : 'updating';
}

export interface AppDeps {
  config: ServerConfig;
  store: Store;
  auth: Auth;
  /** Rooms in this thread instead of workers (the unit tests), with their clock and timers. */
  inline?: { clock?: HostClock; timers?: HostTimers };
  /** The server's own periodic jobs (the caps, empty rooms, membership, pings); the tests drive them. */
  timers?: HostTimers;
  /** Real time (ms). */
  now?: () => number;
  /** The build this server runs (the tests vary it). */
  build?: SharedBuild;
  /** The stub shops' folder (the replay). */
  shopsDir?: string;
  log?: (line: string) => void;
}

interface Conn {
  id: string;
  ws: WebSocket;
  phase: 'new' | 'joining' | 'joined' | 'closed';
  user: string | null;
  room: RoomHandle | null;
  queued: string[];
  windowStart: number;
  messages: number;
  commands: number;
  tokenExp: number;
  checkedAt: number;
}

interface RoomHandle {
  club: string;
  /** Settles `opened` (once; later calls do nothing). */
  settleOpened: (v: { ok: true } | { ok: false; why: ClosingReason }) => void;
  runner: RoomRunner;
  opened: Promise<{ ok: true } | { ok: false; why: ClosingReason }>;
  /** Each player's connection. */
  users: Map<string, Conn>;
  emptySince: number | null;
  stopping: boolean;
  stopped: Promise<void>;
  pendingStats: Map<number, (v: unknown) => void>;
}

export interface ShopServer {
  listen(port?: number): Promise<number>;
  /** SIGTERM: every room saves and closes (`restart`), the meters are written, then it stops listening. */
  shutdown(): Promise<void>;
  /** End at once, nothing saved (the tests' teardown). */
  close(): Promise<void>;
  stats(): Promise<unknown>;
  readonly usage: Usage;
  /** The rooms' clubs (tests). */
  rooms(): string[];
}

export function createShopServer(deps: AppDeps): ShopServer {
  const { config, store, auth } = deps;
  const now = deps.now ?? Date.now;
  const build = deps.build ?? SHARED_BUILD;
  const log = deps.log ?? ((line: string) => console.log(`[server] ${line}`));
  const holder = `aq-${randomUUID()}`;
  const started = now();
  const conns = new Map<string, Conn>();
  const rooms = new Map<string, RoomHandle>();
  const joins = new Map<string, number[]>();
  let nextConn = 1;
  let nextStats = 1;
  let roomSeq = 0;
  let capClosed = false;
  let shuttingDown = false;
  const timers: (() => void)[] = [];
  const clocks: HostTimers = deps.timers ?? {
    every: (ms, fn) => {
      const h = setInterval(fn, ms);
      h.unref();
      return () => clearInterval(h);
    },
    after: (ms, fn) => void setTimeout(fn, ms).unref(),
  };

  const usage = new Usage(store, now, () => closeForCap());

  // ── sending ────────────────────────────────────────────────────────────────────────────────────────────────────

  function send(c: Conn, kind: string, data: string | Uint8Array): void {
    if (c.ws.readyState !== 1) return;
    // a member who doesn't read (the review's note 1): no photo while much is queued, and the connection ends past a limit
    if (c.ws.bufferedAmount > MAX_BUFFERED) return end(c, 1008);
    if (kind === 'photo' && c.ws.bufferedAmount > PHOTO_BUFFERED) return;
    const n = typeof data === 'string' ? Buffer.byteLength(data) : data.length;
    c.ws.send(data);
    usage.count(kind, n + frameHeader(n));
  }

  function closing(c: Conn, why: ClosingReason, extra: Omit<ClosingMessage, 't' | 'why'> = {}): void {
    send(c, 'closing', JSON.stringify({ t: 'closing', why, ...extra } satisfies ServerMessage));
    end(c, 1000);
  }

  /**
   * Close a connection. Through Render's proxy a server's close frame never reaches the browser (measured 2026-10-21:
   * the `closing` message arrived, the close code didn't, and the socket dropped as 1006 about 20 seconds later), so a
   * close the browser must act on says why first: a `closing` message (closing()) or, for the ones with no words to
   * show, `bye`. Then the socket ends at once if the browser answers the close, and in BYE_GRACE_MS either way.
   */
  function end(c: Conn, code: number, reason?: string): void {
    if (c.phase === 'closed') return;
    if (c.ws.readyState !== 1) return c.ws.terminate();
    const why: ByeReason | null = code === CLOSE_AWAY ? 'away' : reason === 'sign-in' ? 'sign-in' : code === 1008 ? 'protocol' : code === 1011 ? 'server' : null;
    if (why) send(c, 'bye', JSON.stringify({ t: 'bye', why } satisfies ServerMessage));
    c.ws.close(code, reason);
    const ws = c.ws;
    clocks.after(BYE_GRACE_MS, () => {
      if (ws.readyState !== 3) ws.terminate();
    });
  }

  // ── rooms ──────────────────────────────────────────────────────────────────────────────────────────────────────

  function openRoom(club: string, mode: OpenMode): RoomHandle {
    const runner = deps.inline ? inlineRunner(deps.inline.clock, deps.inline.timers) : workerRunner();
    let resolveOpened!: (v: { ok: true } | { ok: false; why: ClosingReason }) => void;
    let resolveStopped!: () => void;
    const r: RoomHandle = {
      settleOpened: (v) => resolveOpened(v),
      club,
      runner,
      opened: new Promise((res) => (resolveOpened = res)),
      users: new Map(),
      emptySince: now(),
      stopping: false,
      stopped: new Promise((res) => (resolveStopped = res)),
      pendingStats: new Map(),
    };
    rooms.set(club, r);
    runner.onMessage((m: FromRoom) => {
      try {
        fromRoom(r, m, resolveOpened, resolveStopped);
      } catch (e) {
        log(`room message ${m.t} failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
    runner.onError((e) => {
      log(`room ${club.slice(0, 8)} failed: ${e.message}`);
      resolveOpened({ ok: false, why: 'fault' });
      for (const c of r.users.values()) closing(c, 'fault');
      finish(r, resolveStopped);
    });
    // a holder per room, not per process: a second room for one shop in this process finds the lease held (the review's B1)
    runner.send({ t: 'open', club, holder: `${holder}:${++roomSeq}`, build: build.hash, ...mode });
    return r;
  }

  function finish(r: RoomHandle, resolveStopped: () => void): void {
    r.stopping = true;
    // a room that ends while still opening releases its joiners (the review's note 3), and anyone left is told
    r.settleOpened({ ok: false, why: 'restart' });
    if (rooms.get(r.club) === r) rooms.delete(r.club);
    r.runner.terminate();
    for (const c of r.users.values()) closing(c, 'restart');
    r.users.clear();
    resolveStopped();
  }

  function fromRoom(r: RoomHandle, m: FromRoom, opened: (v: { ok: true } | { ok: false; why: ClosingReason }) => void, stopped: () => void): void {
    switch (m.t) {
      case 'opened':
        opened(m.ok ? { ok: true } : { ok: false, why: m.why });
        break;
      case 'out':
        for (const user of m.to) {
          const c = r.users.get(user);
          if (!c) continue;
          send(c, m.kind, m.bin ?? m.text!);
          if (m.kind === 'closing') {
            r.users.delete(user);
            end(c, 1000);
            noteEmpty(r);
          }
        }
        break;
      case 'drop': {
        const c = r.users.get(m.user);
        if (c) end(c, CLOSE_AWAY, 'away');
        break;
      }
      case 'rpc':
        void roomCall(r, m.id, m.fn, m.args);
        break;
      case 'stats':
        r.pendingStats.get(m.id)?.({ stats: m.stats, cpu: m.cpu });
        r.pendingStats.delete(m.id);
        break;
      case 'stopped':
        finish(r, stopped);
        break;
      case 'log':
        log(m.line);
        break;
    }
  }

  /** A room's database call: only the calls rooms make, and only about its own club. */
  async function roomCall(r: RoomHandle, id: number, fn: string, args: unknown[]): Promise<void> {
    let reply: { ok: boolean; value?: unknown; error?: string };
    if (!roomCallAllowed(fn, args, r.club)) reply = { ok: false, error: 'refused' };
    else {
      try {
        const value = await (store[fn as keyof Store] as (...a: unknown[]) => Promise<unknown>)(...args);
        reply = { ok: true, value };
      } catch (e) {
        reply = { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    }
    r.runner.send({ t: 'rpc', id, ...reply });
  }

  function stopRoom(r: RoomHandle, why: ClosingReason | 'idle', until?: string): Promise<void> {
    if (!r.stopping) {
      r.stopping = true;
      r.runner.send({ t: 'stop', why, until });
    }
    return r.stopped;
  }

  function noteEmpty(r: RoomHandle): void {
    if (r.users.size === 0 && r.emptySince === null) r.emptySince = now();
  }

  function closeForCap(): void {
    const c = usage.closed();
    if (!c || capClosed) return;
    capClosed = true;
    log(`shared shops closed for the month (${c.why}), until ${c.until}`);
    for (const r of rooms.values()) void stopRoom(r, c.why, c.until);
  }

  // ── connections ────────────────────────────────────────────────────────────────────────────────────────────────

  function onMessage(c: Conn, raw: Buffer, isBinary: boolean): void {
    try {
      route(c, raw, isBinary);
    } catch (e) {
      log(`${c.id}: message refused (${e instanceof Error ? e.message : String(e)})`);
      end(c, 1008);
    }
  }

  function route(c: Conn, raw: Buffer, isBinary: boolean): void {
    const t = now();
    if (t - c.windowStart >= 1000) {
      c.windowStart = t;
      c.messages = 0;
      c.commands = 0;
    }
    if (++c.messages > MAX_MESSAGES_PER_S || isBinary || raw.length > MAX_LISTING_MESSAGE) return end(c, 1008);
    const text = raw.toString('utf8');
    // the kind, the command's id and kind, and hello's fields: the rest is the room's to parse and check
    const m = JSON.parse(text) as Record<string, unknown> | null;
    if (!m || typeof m !== 'object' || Array.isArray(m) || typeof m.t !== 'string') return end(c, 1008);
    const listing = m.t === 'cmd' && typeof m.c === 'object' && m.c !== null && (m.c as { k?: unknown }).k === 'createListing';
    if (raw.length > MAX_MESSAGE && !listing) return end(c, 1008);
    if (c.phase === 'new') {
      if (m.t !== 'hello' && m.t !== 'create') return end(c, 1008);
      c.phase = 'joining';
      void join(c, m).catch((e) => {
        log(`${c.id}: join failed (${e instanceof Error ? e.message : String(e)})`);
        end(c, 1011);
      });
      return;
    }
    if (c.phase === 'joining') {
      if (c.queued.length >= MAX_QUEUED) return end(c, 1008);
      c.queued.push(text);
      return;
    }
    if (c.phase !== 'joined' || !c.room) return;
    switch (m.t) {
      case 'hello':
      case 'create':
        return;
      case 'token':
        void refresh(c, m.token);
        return;
      case 'cmd':
        if (++c.commands > MAX_COMMANDS_PER_S) {
          const id = typeof m.id === 'number' && Number.isSafeInteger(m.id) ? m.id : -1;
          return send(c, 'reject', JSON.stringify({ t: 'reject', id, why: 'rate' satisfies RejectReason } satisfies ServerMessage));
        }
        break;
    }
    c.room.runner.send({ t: 'msg', user: c.user!, text });
  }

  /** The connection closed while a `hello` waited (read through a call: TypeScript can't see the wait change it). */
  const gone = (c: Conn): boolean => c.phase === 'closed';
  /**
   * A club: its canonical lowercase UUID, as the database stores it (the review's B1: Postgres reads other spellings, upper
   * case or without hyphens, as the same club, which opened a second room for one shop). The stub's clubs are names.
   */
  const CLUB = config.stub ? /^[A-Za-z0-9_-]{1,80}$/ : /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const HIDDEN = /[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]/;
  const nameOk = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length >= 1 && v.length <= max && !HIDDEN.test(v);

  async function join(c: Conn, m: Record<string, unknown>): Promise<void> {
    const create = m.t === 'create';
    const b = m.build as Partial<SharedBuild> | undefined;
    if (typeof m.token !== 'string' || typeof m.club !== 'string' || !CLUB.test(m.club) || !b || typeof b.hash !== 'string' || typeof b.version !== 'string' || b.hash.length > 100 || b.version.length > 40) return end(c, 1008);
    if (create && (!nameOk(m.name, 60) || typeof m.starter !== 'string' || !/^[a-z_]{1,40}$/.test(m.starter) || !(m.starterName === undefined || m.starterName === '' || nameOk(m.starterName, 30)) || !(m.seed === undefined || (Number.isInteger(m.seed) && (m.seed as number) >= 0 && (m.seed as number) <= 0xffffffff)))) return end(c, 1008);
    const club = m.club;
    const cap = usage.closed();
    if (cap) return closing(c, cap.why, { until: cap.until });
    const verdict = buildVerdict({ hash: b.hash, version: b.version }, build);
    if (verdict) return closing(c, verdict);
    if (shuttingDown) return closing(c, 'restart');
    const who = await auth.verify(m.token);
    if (!who) return end(c, 1008, 'sign-in');
    const member = await store.member(who.user, club);
    if (gone(c)) return;
    if (!member) return closing(c, 'removed');
    if (!member.shop && !create) return closing(c, 'gone');
    if (!member.shop && !member.owner) return end(c, 1008);
    // §5.3: joins and reconnects per player, so a reconnect loop can't drain the data cap
    const t = now();
    const recent = (joins.get(who.user) ?? []).filter((x) => t - x < 3_600_000);
    if (recent.length >= JOINS_PER_HOUR) {
      joins.set(who.user, recent);
      return closing(c, 'outofstep');
    }
    recent.push(t);
    joins.set(who.user, recent);
    let r = rooms.get(club);
    while (r?.stopping) {
      await r.stopped;
      r = rooms.get(club);
    }
    if (!r) {
      const mode: OpenMode = create && !member.shop ? { mode: 'create', user: who.user, name: (m.name as string).trim(), starter: m.starter as string, starterName: ((m.starterName as string | undefined) ?? '').trim(), seed: m.seed as number | undefined } : { mode: 'wake' };
      r = openRoom(club, mode);
    }
    const opened = await r.opened;
    if (gone(c)) return;
    if (!opened.ok) return closing(c, opened.why);
    if (r.stopping) return closing(c, 'restart');
    const old = r.users.get(who.user);
    if (!old && r.users.size >= MAX_MEMBERS) return closing(c, 'full');
    if (old && old !== c) {
      // a second tab takes over (§5.3): the first is told, and the room keeps the member
      r.users.delete(who.user);
      closing(old, 'elsewhere');
    }
    c.user = who.user;
    c.room = r;
    c.phase = 'joined';
    c.tokenExp = who.exp;
    c.checkedAt = now();
    r.users.set(who.user, c);
    r.emptySince = null;
    r.runner.send({ t: 'join', you: { id: who.user, name: member.name, owner: member.owner, pause: member.pause }, plain: m.plain === true });
    const queued = c.queued;
    c.queued = [];
    for (const text of queued) route(c, Buffer.from(text), false);
  }

  /** A refreshed sign-in (§3.3): the same player only. */
  async function refresh(c: Conn, token: unknown): Promise<void> {
    const who = typeof token === 'string' ? await auth.verify(token) : null;
    if (!who || who.user !== c.user) return end(c, 1008, 'sign-in');
    c.tokenExp = who.exp;
  }

  function onClose(c: Conn): void {
    c.phase = 'closed';
    conns.delete(c.id);
    const r = c.room;
    if (!r || !c.user || r.users.get(c.user) !== c) return;
    r.users.delete(c.user);
    r.runner.send({ t: 'leave', user: c.user });
    noteEmpty(r);
  }

  // ── HTTP ───────────────────────────────────────────────────────────────────────────────────────────────────────

  function reply(req: IncomingMessage, res: ServerResponse, status: number, body: unknown): void {
    if (res.headersSent) return; // one answer per request, whatever answers second
    const text = JSON.stringify(body);
    const origin = req.headers.origin;
    const headers: Record<string, string> = { 'content-type': 'application/json', 'cache-control': 'no-store' };
    if (originAllowed(config.origins, origin)) {
      headers['access-control-allow-origin'] = origin!;
      headers.vary = 'origin';
    }
    res.writeHead(status, headers);
    res.end(text);
    usage.count('http', Buffer.byteLength(text) + HTTP_HEADER_BYTES);
  }

  async function stats(): Promise<unknown> {
    const perRoom = await Promise.all(
      [...rooms.values()].map(
        (r, i) =>
          new Promise((resolve) => {
            const id = nextStats++;
            r.pendingStats.set(id, (v) => resolve({ room: i, members: r.users.size, ...(v as object) }));
            r.runner.send({ t: 'stats', id });
            setTimeout(() => {
              if (r.pendingStats.delete(id)) resolve({ room: i, stats: null });
            }, 2000).unref();
          }),
      ),
    );
    const est = usage.estimate();
    return {
      version: config.version,
      build: build.hash,
      uptimeS: Math.round((now() - started) / 1000),
      connections: conns.size,
      sent: usage.sent,
      month: { bytes: Math.round(est.bytes), awakeS: Math.round(est.seconds), closed: est.closed },
      cpu: process.cpuUsage(),
      memory: process.memoryUsage(),
      rooms: perRoom,
    };
  }

  /** One replay at a time (the stub only): each is a worker with a whole shop. */
  let replaying = false;

  function replay(req: IncomingMessage, res: ServerResponse, url: URL): void {
    const shop = url.searchParams.get('shop') ?? '';
    const speed = Number(url.searchParams.get('speed') ?? 10);
    const hours = Number(url.searchParams.get('hours') ?? 24);
    if (!availableShops(deps.shopsDir).includes(shop) || ![1, 3, 10].includes(speed) || !(hours > 0 && hours <= 24 * 14)) return reply(req, res, 400, { error: 'bad request' });
    if (replaying) return reply(req, res, 503, { error: 'busy' });
    let worker: Worker;
    try {
      worker = new Worker(fileURLToPath(new URL('./roomWorker.js', import.meta.url)), { workerData: { mode: 'replay', text: loadShopText(shop, deps.shopsDir), speed, hours }, env: {} });
    } catch (e) {
      return reply(req, res, 500, { error: e instanceof Error ? e.message : String(e) });
    }
    replaying = true; // only once the worker exists, so a failure to start one can't hold the slot
    const done = () => {
      replaying = false;
      void worker.terminate();
    };
    worker.once('message', (m: { log: unknown; ms: number }) => {
      reply(req, res, 200, { ...(m.log as object), serverMs: m.ms, arch: process.arch, node: process.version });
      done();
    });
    worker.once('error', (e) => {
      reply(req, res, 500, { error: e instanceof Error ? e.message : String(e) });
      done();
    });
    worker.once('exit', () => {
      if (res.headersSent) return;
      replaying = false;
      reply(req, res, 500, { error: 'replay ended' });
    });
  }

  /** The request's target as a URL, or null when it isn't one (`//`, `/\\`): a request's text must never throw. */
  function urlOf(req: IncomingMessage): URL | null {
    try {
      return new URL(req.url ?? '/', 'http://localhost');
    } catch {
      return null;
    }
  }

  function onRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = urlOf(req);
    if (!url) return reply(req, res, 400, { error: 'bad request' });
    if (req.method === 'OPTIONS') return reply(req, res, 204, {});
    if (req.method !== 'GET') return reply(req, res, 405, { error: 'method' });
    if (url.pathname === '/health') {
      const c = usage.closed();
      return reply(req, res, 200, { ok: true, version: config.version, build: build.hash, closed: c?.why ?? null, until: c?.until ?? null, stub: config.stub });
    }
    if (url.pathname === '/stats') {
      stats()
        .then(
          (st) => reply(req, res, 200, st),
          () => reply(req, res, 500, { error: 'stats' }),
        )
        .catch(() => res.destroy());
      return;
    }
    if (url.pathname === '/stub/replay' && config.replay) return replay(req, res, url);
    reply(req, res, 404, { error: 'not found' });
  }

  const server = createServer((req, res) => {
    try {
      onRequest(req, res);
    } catch (e) {
      log(`request refused (${e instanceof Error ? e.message : String(e)})`);
      if (!res.headersSent) reply(req, res, 500, { error: 'server' });
      else res.destroy();
    }
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_LISTING_MESSAGE, perMessageDeflate: false });
  server.on('upgrade', (req, socket, head) => {
    try {
      onUpgrade(req, socket, head);
    } catch (e) {
      log(`upgrade refused (${e instanceof Error ? e.message : String(e)})`);
      socket.destroy();
    }
  });

  function onUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    const refuse = (status: string) => {
      socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
      socket.destroy();
    };
    const url = urlOf(req);
    if (!url) return refuse('400 Bad Request');
    if (url.pathname !== '/shop') return refuse('404 Not Found');
    if (!originAllowed(config.origins, req.headers.origin)) return refuse('403 Forbidden');
    if (conns.size >= MAX_CONNECTIONS || shuttingDown) return refuse('503 Service Unavailable');
    wss.handleUpgrade(req, socket, head, (ws) => {
      const c: Conn = { id: `c${nextConn++}`, ws, phase: 'new', user: null, room: null, queued: [], windowStart: now(), messages: 0, commands: 0, tokenExp: 0, checkedAt: 0 };
      conns.set(c.id, c);
      setTimeout(() => {
        if (c.phase === 'new' && conns.has(c.id)) c.ws.terminate(); // at once: a peer that ignores a close frame keeps no slot
      }, HELLO_WITHIN_MS).unref();
      ws.on('message', (data, isBinary) => onMessage(c, data, isBinary));
      ws.on('close', () => onClose(c));
      ws.on('error', () => ws.terminate());
    });
  }

  // ── the clocks ─────────────────────────────────────────────────────────────────────────────────────────────────

  const every = (ms: number, fn: () => void) => {
    timers.push(
      clocks.every(ms, () => {
        try {
          fn();
        } catch (e) {
          log(`timer failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }),
    );
  };
  // the caps, each second; the month's count to the database every few minutes
  every(1000, () => {
    usage.tick();
    if (usage.closed()) closeForCap();
    else capClosed = false;
  });
  // empty rooms end after 15 minutes (§5.2 item 5); members are checked again every 15 (§5.3)
  every(30_000, () => {
    const t = now();
    for (const r of rooms.values()) if (!r.stopping && r.users.size === 0 && r.emptySince !== null && t - r.emptySince >= EMPTY_ROOM_MS) void stopRoom(r, 'idle');
    for (const c of conns.values()) {
      // a sign-in nobody refreshed (send `token` when Supabase refreshes the session): the review's note 5
      if (c.phase === 'joined' && c.tokenExp + TOKEN_GRACE_MS < t) {
        end(c, 1008, 'sign-in');
        continue;
      }
      if (c.phase !== 'joined' || !c.room || t - c.checkedAt < MEMBER_CHECK_MS) continue;
      c.checkedAt = t;
      const r = c.room;
      const user = c.user!;
      store.member(user, r.club).then(
        (m) => {
          if (!m && r.users.get(user) === c) r.runner.send({ t: 'removed', user });
        },
        () => {},
      );
    }
  });
  // keep connections alive through proxies while a shop is paused and quiet
  every(30_000, () => {
    for (const c of conns.values()) {
      if (c.phase !== 'joined' || c.ws.readyState !== 1) continue;
      c.ws.ping();
      usage.count('ping', 2);
    }
  });
  void usage.flush(); // this month's count, and whether shops are closed

  return {
    usage,
    rooms: () => [...rooms.keys()],
    listen: (port = config.port) =>
      new Promise((resolve) => {
        server.listen(port, '0.0.0.0', () => resolve((server.address() as AddressInfo).port));
      }),
    stats,
    async shutdown() {
      shuttingDown = true;
      const all = [...rooms.values()].map((r) => stopRoom(r, 'restart'));
      await Promise.race([Promise.all(all), new Promise((res) => setTimeout(res, 20_000).unref())]);
      await usage.flush();
      for (const t of timers) t();
      for (const c of conns.values()) end(c, 1001);
      await new Promise<void>((res) => server.close(() => res()));
    },
    async close() {
      shuttingDown = true;
      for (const t of timers) t();
      for (const r of rooms.values()) r.runner.terminate();
      rooms.clear();
      for (const c of conns.values()) c.ws.terminate();
      wss.close();
      await new Promise<void>((res) => server.close(() => res()));
    },
  };
}
