/**
 * Chunk 12 (SHARED-SHOPS.md §9.1): the shared-shop server in this process, on the stub's accounts and storage
 * (server/stub.ts), with rooms in this thread and a clock the test moves; members are Node's own WebSocket, which
 * sends the game's origin like a browser.
 */
import { gunzipSync } from 'node:zlib';
import type { GameState } from '@/types';
import type { ServerMessage, SharedBuild } from '@/types/shared';
import { SHARED_BUILD } from '@/types/shared';
import { newGame } from '@/sim/newGame';
import { tutorialSkip } from '@/sim/facility';
import { encodeRecord } from '@/persistence/serialize';
import { createShopServer, type ShopServer } from '../../../server/app';
import { readConfig } from '../../../server/config';
import { StubWorld } from '../../../server/stub';
import type { HostClock, HostTimers } from '../../../server/host';

export const ORIGIN = 'http://127.0.0.1:5173';

/** One clock for the rooms, the server and the stub database: real time starts at noon UTC on 2026-10-21. */
export class FakeTime implements HostClock, HostTimers {
  readonly start = Date.UTC(2026, 9, 21, 12, 0, 0);
  mono = 0;
  private intervals: { ms: number; next: number; fn: () => void; alive: boolean }[] = [];
  private timeouts: { at: number; fn: () => void }[] = [];
  wall = (): number => this.start + this.mono;
  now = (): number => this.mono;
  every = (ms: number, fn: () => void): (() => void) => {
    const it = { ms, next: this.mono + ms, fn, alive: true };
    this.intervals.push(it);
    return () => {
      it.alive = false;
    };
  };
  after = (ms: number, fn: () => void): void => {
    this.timeouts.push({ at: this.mono + ms, fn });
  };
  /** Move on by `ms`, firing every timer that comes due, in order. */
  advance(ms: number): void {
    const end = this.mono + ms;
    for (;;) {
      this.intervals = this.intervals.filter((i) => i.alive);
      let at = Infinity;
      for (const i of this.intervals) at = Math.min(at, i.next);
      for (const t of this.timeouts) at = Math.min(at, t.at);
      if (at > end) break;
      this.mono = at;
      const due = this.timeouts.filter((t) => t.at <= at);
      this.timeouts = this.timeouts.filter((t) => t.at > at);
      for (const t of due) t.fn();
      for (const i of this.intervals) {
        if (i.alive && i.next <= at) {
          i.next += i.ms;
          i.fn();
        }
      }
    }
    this.mono = end;
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Let `ms` of fake time pass in steps, letting the rooms' database calls finish between them, as they would in real
 * time (one big jump fires every lease renewal before any of them reaches the database, so the lease looks lapsed).
 */
export async function pass(time: FakeTime, ms: number, step = 10_000): Promise<void> {
  for (let done = 0; done < ms; done += step) {
    time.advance(Math.min(step, ms - done));
    await sleep(2);
  }
}

/** Wait (real time) until `cond` holds, moving the fake clock on by `step` ms between looks. */
export async function pump(time: FakeTime, cond: () => boolean, opts: { step?: number; timeout?: number; what?: string } = {}): Promise<void> {
  const until = Date.now() + (opts.timeout ?? 5000);
  while (!cond()) {
    if (Date.now() > until) throw new Error(`timed out waiting for ${opts.what ?? 'a condition'}`);
    if (opts.step) time.advance(opts.step);
    await sleep(3);
  }
}

export type Frame = { kind: 'text'; m: ServerMessage } | { kind: 'bin'; b: Uint8Array };

export class Member {
  readonly frames: Frame[] = [];
  closed: { code: number; reason: string } | null = null;
  opened = false;
  private constructor(readonly ws: WebSocket) {
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => (this.opened = true);
    ws.onmessage = (e: MessageEvent) => {
      if (typeof e.data === 'string') this.frames.push({ kind: 'text', m: JSON.parse(e.data) as ServerMessage });
      else this.frames.push({ kind: 'bin', b: new Uint8Array(e.data as ArrayBuffer) });
    };
    ws.onclose = (e: CloseEvent) => (this.closed = { code: e.code, reason: e.reason });
    ws.onerror = () => {};
  }

  static async connect(port: number, origin = ORIGIN): Promise<Member> {
    const Ws = WebSocket as unknown as new (url: string, init: unknown) => WebSocket;
    const m = new Member(new Ws(`ws://127.0.0.1:${port}/shop`, { headers: { origin } }));
    const until = Date.now() + 5000;
    while (!m.opened && !m.closed && Date.now() < until) await sleep(3);
    return m;
  }

  send(m: unknown): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(typeof m === 'string' ? m : JSON.stringify(m));
  }

  hello(token: string, club: string, build: SharedBuild = SHARED_BUILD, extra: Record<string, unknown> = {}): void {
    this.send({ t: 'hello', token, build, club, ...extra });
  }

  texts<T extends ServerMessage['t']>(t: T): Extract<ServerMessage, { t: T }>[] {
    return this.frames.filter((f): f is { kind: 'text'; m: ServerMessage } => f.kind === 'text' && f.m.t === t).map((f) => f.m as Extract<ServerMessage, { t: T }>);
  }

  bins(tag?: number): Uint8Array[] {
    return this.frames.filter((f): f is { kind: 'bin'; b: Uint8Array } => f.kind === 'bin' && (tag === undefined || f.b[0] === tag)).map((f) => f.b);
  }

  /** The last snapshot, as the shop's state. */
  snapshot(): GameState | null {
    const b = this.bins(1).at(-1) ?? this.bins(2).at(-1);
    if (!b) return null;
    const body = Buffer.from(b.subarray(1));
    return JSON.parse(b[0] === 1 ? gunzipSync(body).toString('utf8') : body.toString('utf8')) as GameState;
  }

  /** Every command step received, flattened. */
  commands(): { by: string; who?: string; id?: number; c: { k: string } & Record<string, unknown> }[] {
    return this.texts('steps').flatMap((s) => s.s.flatMap((st) => (st.cmds ?? []) as never[]));
  }

  close(): void {
    this.ws.close();
  }
}

/** A new shop's save text (a new game with no guide, as `create` makes one). */
export function shopText(opts: { name?: string; savedAt?: number; seed?: number; edit?: (g: GameState) => void } = {}): string {
  const g = newGame({ starterId: 'betta', starterName: 'Blue', shopName: opts.name ?? 'Club Shop', seed: opts.seed ?? 4242 });
  tutorialSkip(g);
  opts.edit?.(g);
  return encodeRecord(g, 'shared', opts.savedAt ?? 0).text;
}

export interface Rig {
  time: FakeTime;
  world: StubWorld;
  app: ShopServer;
  port: number;
  logs: string[];
  /** Join `club` as `token`'s player and wait for the welcome and the snapshot. */
  join(token: string, club: string, extra?: Record<string, unknown>): Promise<Member>;
  stop(): Promise<void>;
}

/** `stub: false` runs the server as on Render (clubs are canonical UUIDs) with the stub's store and accounts. */
export async function rig(opts: { build?: SharedBuild; world?: StubWorld; time?: FakeTime; stub?: boolean } = {}): Promise<Rig> {
  const time = opts.time ?? new FakeTime();
  const world = opts.world ?? new StubWorld();
  world.now = time.wall;
  const logs: string[] = [];
  const app = createShopServer({
    config: { ...readConfig({}), stub: opts.stub ?? true, port: 0 },
    store: world.store,
    auth: world.auth,
    inline: { clock: time, timers: time },
    timers: time,
    now: time.wall,
    build: opts.build,
    log: (l) => logs.push(l),
  });
  const port = await app.listen(0);
  const members: Member[] = [];
  return {
    time,
    world,
    app,
    port,
    logs,
    async join(token, club, extra = {}) {
      const m = await Member.connect(port);
      members.push(m);
      m.hello(token, club, SHARED_BUILD, extra);
      await pump(time, () => m.bins().length > 0 || m.closed !== null, { step: 50, what: `${token} to join` });
      return m;
    },
    async stop() {
      for (const m of members) m.close();
      await app.close();
    },
  };
}
