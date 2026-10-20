/**
 * The shared-shop server (SHARED-SHOPS.md §5), chunk 10's prototype: HTTP for `/health` and `/stats`, the WebSocket
 * at `/shop`, one worker thread per shop. Stub shops only (./shops.ts): no accounts, no database, no key. For the
 * public test service it also caps connections and the bytes it sends, so a stranger who finds the address can't
 * spend Render's free data.
 *
 * Environment: PORT; ALLOWED_ORIGINS (comma-separated; `http://127.0.0.1:*` allows any local port); SHOPS_DIR;
 * SHOPS_MAX_CONNECTIONS (default 12); SHOPS_BYTE_BUDGET (bytes sent since start, default 300 MB); SHOPS_REPLAY=1
 * enables `/stub/replay` (tests and the measurements).
 *
 * On Render (`RENDER` set) the prototype is closed after chunk 10's measurements unless SHOPS_OPEN=1: it takes no
 * connections and no replays, and answers only `/health` and `/stats`. Its byte budget starts again at every wake and
 * its address is in this public repo, so an open stub would let anyone spend Render's free data (shared with the
 * static site and `dascade`). Chunk 12's server, with sign-in, replaces this.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ClientMessage, ClosingReason } from '@/types/shared';
import { availableShops, loadShopText } from './shops';
import type { ToWorker } from './roomWorker';
import type { OutKind } from './room';

const PORT = Number(process.env.PORT ?? 4396);
const ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'http://127.0.0.1:*').split(',').map((s) => s.trim()).filter(Boolean);
const MAX_CONNECTIONS = Number(process.env.SHOPS_MAX_CONNECTIONS ?? 12);
const BYTE_BUDGET = Number(process.env.SHOPS_BYTE_BUDGET ?? 300e6);
const CLOSED = Boolean(process.env.RENDER) && process.env.SHOPS_OPEN !== '1';
const REPLAY = process.env.SHOPS_REPLAY === '1' && !CLOSED;
/** Most a member may send (§5.3): 16 KB a message (48 KB is for a listing with a photo, chunk 12). */
const MAX_MESSAGE = 16 * 1024;
const MAX_COMMANDS_PER_S = 10;
const MAX_MESSAGES_PER_S = 30;
/** An empty room is kept this long, then its worker ends. */
const EMPTY_ROOM_MS = 5 * 60_000;
const WORKER = fileURLToPath(new URL('./roomWorker.js', import.meta.url));
const VERSION = process.env.npm_package_version ?? 'proto';
const started = Date.now();

function originAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  return ORIGINS.some((o) => (o.endsWith(':*') ? origin.startsWith(o.slice(0, -1)) && /^\d+$/.test(origin.slice(o.length - 1)) : origin === o));
}

// ── meters ───────────────────────────────────────────────────────────────────────────────────────────────────────

const sent = { total: 0, frames: 0, byKind: {} as Record<string, number>, http: 0 };
let capped = false;
function count(kind: OutKind | 'http' | 'ping', bytes: number): void {
  sent.total += bytes;
  sent.frames++;
  sent.byKind[kind] = (sent.byKind[kind] ?? 0) + bytes;
  if (!capped && sent.total > BYTE_BUDGET) {
    capped = true;
    console.log(`[server] byte budget reached (${sent.total} bytes): closing every room`);
    for (const r of rooms.values()) r.worker.postMessage({ t: 'stop', why: 'cap' } satisfies ToWorker);
  }
}

// ── rooms ────────────────────────────────────────────────────────────────────────────────────────────────────────

interface Conn {
  id: string;
  ws: WebSocket;
  room: RoomHandle | null;
  windowStart: number;
  messages: number;
  commands: number;
  bytesOut: number;
}
interface RoomHandle {
  shop: string;
  worker: Worker;
  conns: Set<string>;
  emptySince: number | null;
}

const conns = new Map<string, Conn>();
const rooms = new Map<string, RoomHandle>();
let nextConn = 1;
let nextStats = 1;
const pendingStats = new Map<number, (v: unknown) => void>();

function roomFor(shop: string): RoomHandle {
  const have = rooms.get(shop);
  if (have) return have;
  const worker = new Worker(WORKER, { workerData: { mode: 'room', text: loadShopText(shop) } });
  const handle: RoomHandle = { shop, worker, conns: new Set(), emptySince: null };
  worker.on('message', (m: { t: string; to?: string[]; kind?: OutKind; text?: string; bin?: Uint8Array; id?: number; stats?: unknown; cpu?: unknown }) => {
    if (m.t === 'out') {
      for (const id of m.to!) {
        const c = conns.get(id);
        if (!c || c.ws.readyState !== 1) continue;
        const data = m.bin ?? m.text!;
        const size = m.bin ? m.bin.length : Buffer.byteLength(m.text!);
        c.ws.send(data);
        c.bytesOut += size;
        count(m.kind!, size);
        if (m.kind === 'closing') c.ws.close(1000);
      }
    } else if (m.t === 'stats') {
      pendingStats.get(m.id!)?.({ shop, stats: m.stats, cpu: m.cpu });
      pendingStats.delete(m.id!);
    } else if (m.t === 'stopped') {
      endRoom(handle);
    }
  });
  worker.on('error', (e) => {
    console.log(`[server] room ${shop} failed: ${e instanceof Error ? e.message : String(e)}`);
    for (const id of handle.conns) close(conns.get(id), 'fault');
    endRoom(handle);
  });
  rooms.set(shop, handle);
  return handle;
}

function endRoom(r: RoomHandle): void {
  if (rooms.get(r.shop) !== r) return;
  rooms.delete(r.shop);
  void r.worker.terminate();
}

setInterval(() => {
  const now = Date.now();
  for (const r of rooms.values()) if (r.emptySince !== null && now - r.emptySince > EMPTY_ROOM_MS) endRoom(r);
}, 30_000).unref();

function close(c: Conn | undefined, why: ClosingReason): void {
  if (!c) return;
  const text = JSON.stringify({ t: 'closing', why });
  if (c.ws.readyState === 1) {
    c.ws.send(text);
    count('closing', text.length);
    c.ws.close(1000);
  }
}

// ── connections ──────────────────────────────────────────────────────────────────────────────────────────────────

function onMessage(c: Conn, raw: Buffer, isBinary: boolean): void {
  const now = Date.now();
  if (now - c.windowStart >= 1000) {
    c.windowStart = now;
    c.messages = 0;
    c.commands = 0;
  }
  if (++c.messages > MAX_MESSAGES_PER_S || isBinary || raw.length > MAX_MESSAGE) return void c.ws.close(1008);
  let m: ClientMessage;
  try {
    m = JSON.parse(raw.toString('utf8')) as ClientMessage;
  } catch {
    return void c.ws.close(1008);
  }
  if (!m || typeof m !== 'object' || typeof m.t !== 'string') return void c.ws.close(1008);
  if (!c.room) {
    if (m.t !== 'hello') return void c.ws.close(1008);
    if (capped) return close(c, 'cap');
    const shop = typeof m.club === 'string' ? m.club : '';
    if (!availableShops().includes(shop)) return void c.ws.close(1008);
    const room = roomFor(shop);
    room.conns.add(c.id);
    room.emptySince = null;
    c.room = room;
    const name = typeof m.name === 'string' ? m.name.slice(0, 40) : 'Someone';
    room.worker.postMessage({ t: 'join', conn: c.id, name, plain: m.plain === true } satisfies ToWorker);
    return;
  }
  if (m.t === 'cmd' && ++c.commands > MAX_COMMANDS_PER_S) return void c.ws.close(1008);
  if (m.t === 'hello') return;
  c.room.worker.postMessage({ t: 'msg', conn: c.id, m } satisfies ToWorker);
}

function onClose(c: Conn): void {
  conns.delete(c.id);
  const r = c.room;
  if (!r) return;
  r.conns.delete(c.id);
  r.worker.postMessage({ t: 'leave', conn: c.id } satisfies ToWorker);
  if (r.conns.size === 0) r.emptySince = Date.now();
}

// ── HTTP ─────────────────────────────────────────────────────────────────────────────────────────────────────────

function reply(req: IncomingMessage, res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  const origin = req.headers.origin;
  const headers: Record<string, string> = { 'content-type': 'application/json', 'cache-control': 'no-store' };
  if (originAllowed(origin)) {
    headers['access-control-allow-origin'] = origin!;
    headers.vary = 'origin';
  }
  res.writeHead(status, headers);
  res.end(text);
  count('http', Buffer.byteLength(text));
}

async function stats(): Promise<unknown> {
  const perRoom = await Promise.all(
    [...rooms.values()].map(
      (r) =>
        new Promise((resolve) => {
          const id = nextStats++;
          pendingStats.set(id, resolve);
          r.worker.postMessage({ t: 'stats', id } satisfies ToWorker);
          setTimeout(() => {
            if (pendingStats.delete(id)) resolve({ shop: r.shop, stats: null });
          }, 2000).unref();
        }),
    ),
  );
  return {
    version: VERSION,
    uptimeS: Math.round((Date.now() - started) / 1000),
    connections: conns.size,
    sent,
    budget: BYTE_BUDGET,
    capped,
    cpu: process.cpuUsage(),
    memory: process.memoryUsage(),
    rooms: perRoom,
  };
}

function replay(req: IncomingMessage, res: ServerResponse, url: URL): void {
  const shop = url.searchParams.get('shop') ?? '';
  const speed = Number(url.searchParams.get('speed') ?? 10);
  const hours = Number(url.searchParams.get('hours') ?? 24);
  if (!availableShops().includes(shop) || ![1, 3, 10].includes(speed) || !(hours > 0 && hours <= 24 * 14)) return reply(req, res, 400, { error: 'bad request' });
  const worker = new Worker(WORKER, { workerData: { mode: 'replay', text: loadShopText(shop), speed, hours } });
  worker.once('message', (m: { log: unknown; ms: number }) => {
    reply(req, res, 200, { ...(m.log as object), serverMs: m.ms, arch: process.arch, node: process.version });
    void worker.terminate();
  });
  worker.once('error', (e) => reply(req, res, 500, { error: e instanceof Error ? e.message : String(e) }));
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (req.method === 'OPTIONS') return reply(req, res, 204, {});
  if (req.method !== 'GET') return reply(req, res, 405, { error: 'method' });
  if (url.pathname === '/health') return reply(req, res, 200, { ok: true, version: VERSION, shops: availableShops(), capped, closed: CLOSED });
  if (url.pathname === '/stats') return void stats().then((s) => reply(req, res, 200, s));
  if (url.pathname === '/stub/replay' && REPLAY) return replay(req, res, url);
  reply(req, res, 404, { error: 'not found' });
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 48 * 1024, perMessageDeflate: false });
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const refuse = (status: string) => {
    socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
    socket.destroy();
  };
  if (url.pathname !== '/shop') return refuse('404 Not Found');
  if (CLOSED) return refuse('503 Service Unavailable');
  if (!originAllowed(req.headers.origin)) return refuse('403 Forbidden');
  if (conns.size >= MAX_CONNECTIONS) return refuse('503 Service Unavailable');
  wss.handleUpgrade(req, socket, head, (ws) => {
    const c: Conn = { id: `c${nextConn++}`, ws, room: null, windowStart: Date.now(), messages: 0, commands: 0, bytesOut: 0 };
    conns.set(c.id, c);
    ws.on('message', (data, isBinary) => onMessage(c, data, isBinary));
    ws.on('close', () => onClose(c));
    ws.on('error', () => ws.terminate());
  });
});

// Keep connections alive through proxies while a shop is paused and quiet.
setInterval(() => {
  for (const c of conns.values()) {
    if (c.ws.readyState !== 1) continue;
    c.ws.ping();
    count('ping', 2);
  }
}, 30_000).unref();

process.on('SIGTERM', () => {
  for (const c of conns.values()) close(c, 'restart');
  server.close();
  setTimeout(() => process.exit(0), 500).unref();
});

server.listen(PORT, () => console.log(`[server] shared shops (prototype) on :${PORT}; shops: ${availableShops().join(', ') || 'none'}${CLOSED ? '; closed (set SHOPS_OPEN=1 to open)' : ''}`));
