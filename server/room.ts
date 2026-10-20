/**
 * One shared shop on the server (SHARED-SHOPS.md §3, §5.2): its copy, which counts, and the members connected to it.
 * The room advances the copy in steps it sizes, runs each command in its own zero-hour step at once, and sends every
 * member the same steps, which each browser applies through the same step block. Plain logic with no sockets or
 * timers of its own: the worker (./roomWorker.ts) drives it, and the unit tests drive it directly.
 *
 * Chunk 10's prototype: no accounts (a member is a connection), no pause permission, no database (chunk 12).
 */
import type { GameState } from '@/types';
import { runSharedStep, type SharedStep } from '@/sim/sharedStep';
import { validateCommand, type Command } from '@/sim/commands';
import { GAME_HOURS_PER_REAL_SECOND } from '@/sim/time';
import { stateHash } from '@/persistence/hash';
import { FRAME_SNAPSHOT_GZIP, FRAME_SNAPSHOT_PLAIN, type ClientMessage, type ServerMessage, type SharedMember } from '@/types/shared';

/** The room's tick, as the game loop's (TICK_MS). */
export const TICK_MS = 250;
/** Time steps go out about once a second (§3.3). */
const TICKS_PER_FLUSH = 4;
/** A fingerprint every 10 real seconds (§3.1). */
const TICKS_PER_FINGERPRINT = 40;
/** At most this many tanks at full detail (§3.2 rule 4). */
const MAX_FULL = 4;
/** Three time steps in a row that throw stop the shop (§5.2 item 3). */
const MAX_FAILED_TICKS = 3;
/** Re-syncs per member (§5.3): at most 3 in 10 minutes and 6 in an hour, then the connection closes (`outofstep`). */
const RESYNCS_PER_10_MIN = 3;
const RESYNCS_PER_HOUR = 6;

/**
 * A member's message, as text from the network: parsed and checked here, in the worker. Only the fields each kind
 * uses are kept; a command's own fields are checked by `validateCommand` when it is applied.
 */
export function parseClientMessage(text: string): ClientMessage | null {
  let x: unknown;
  try {
    x = JSON.parse(text);
  } catch {
    return null;
  }
  if (x === null || typeof x !== 'object' || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  switch (o.t) {
    case 'cmd':
      return typeof o.id === 'number' && Number.isSafeInteger(o.id) ? { t: 'cmd', id: o.id, c: o.c as Command } : null;
    case 'view':
      return { t: 'view', tank: typeof o.tank === 'string' && o.tank.length <= 80 ? o.tank : null };
    case 'here':
    case 'away':
    case 'input':
    case 'resync':
      return { t: o.t };
    default:
      return null;
  }
}

export type OutKind = 'steps' | 'snapshot' | 'welcome' | 'members' | 'reject' | 'closing';

/** A frame for some members: JSON text, or a binary snapshot. */
export interface Outgoing {
  to: string[];
  kind: OutKind;
  text?: string;
  bin?: Uint8Array;
}

export interface RoomIo {
  send(out: Outgoing): void;
  gzip(text: string): Uint8Array;
  /** Run `fn` once, `ms` from now (the quick flush after a command). */
  later(ms: number, fn: () => void): void;
  now(): number;
  log?(line: string): void;
}

interface Member {
  id: string;
  name: string;
  here: boolean;
  view: string | null;
  plain: boolean;
  /** When this member's re-syncs were sent (io.now()). */
  resyncs: number[];
}

interface Timing {
  count: number;
  ms: number;
  max: number;
}
const timing = (): Timing => ({ count: 0, ms: 0, max: 0 });
const note = (t: Timing, ms: number) => {
  t.count++;
  t.ms += ms;
  t.max = Math.max(t.max, ms);
};

export interface RoomStats {
  n: number;
  hour: number;
  speed: number;
  members: number;
  here: number;
  timeSteps: Timing;
  commandSteps: Timing;
  fingerprints: Timing;
  snapshots: Timing & { bytes: number };
  /** Bytes queued per kind of frame, counted once per recipient. */
  bytes: Record<OutKind, number>;
  frames: Record<OutKind, number>;
  rejected: number;
  failedTicks: number;
  /** The serialized copy's fingerprint differed from the live copy's (§3.2 rule 10). */
  snapshotRepairs: number;
  /** Members closed for re-syncing too often (§5.3). */
  outOfStep: number;
}

const enc = new TextEncoder();

export class Room {
  state: GameState;
  /** The last step applied. */
  n = 0;
  /** The full-detail list in force. */
  full: string[] = [];
  private pendingFull: string[] | null = null;
  private readonly members = new Map<string, Member>();
  private outbox: SharedStep[] = [];
  private ticks = 0;
  private stepsSinceFp = 0;
  private failedTicks = 0;
  private flushSoon = false;
  stopped = false;
  readonly stats: RoomStats;

  constructor(
    state: GameState,
    private readonly io: RoomIo,
  ) {
    this.state = state;
    const zero = { steps: 0, snapshot: 0, welcome: 0, members: 0, reject: 0, closing: 0 };
    this.stats = {
      n: 0,
      hour: 0,
      speed: 0,
      members: 0,
      here: 0,
      timeSteps: timing(),
      commandSteps: timing(),
      fingerprints: timing(),
      snapshots: { ...timing(), bytes: 0 },
      bytes: { ...zero },
      frames: { ...zero },
      rejected: 0,
      failedTicks: 0,
      snapshotRepairs: 0,
      outOfStep: 0,
    };
  }

  /** Running: someone is there (§5.5). Commands apply even while it isn't. */
  get running(): boolean {
    for (const m of this.members.values()) if (m.here) return true;
    return false;
  }

  memberList(): SharedMember[] {
    return [...this.members.values()].map((m) => ({ id: m.id, name: m.name, here: m.here }));
  }

  join(id: string, name: string, plain = false): void {
    if (this.stopped) return;
    this.flush(); // steps already made go to the members who were there for them
    this.members.set(id, { id, name, here: true, view: null, plain, resyncs: [] });
    this.sendSnapshot(id);
    this.broadcastMembers();
  }

  leave(id: string): void {
    if (!this.members.delete(id)) return;
    this.updateFull();
    this.broadcastMembers();
  }

  get size(): number {
    return this.members.size;
  }

  handle(id: string, m: ClientMessage): void {
    const member = this.members.get(id);
    if (!member || this.stopped) return;
    switch (m.t) {
      case 'cmd':
        this.command(member, m.id, m.c);
        break;
      case 'view':
        member.view = typeof m.tank === 'string' && Object.hasOwn(this.state.tanks, m.tank) ? m.tank : null;
        this.updateFull();
        break;
      case 'here':
      case 'input':
        if (!member.here) {
          member.here = true;
          this.broadcastMembers();
        }
        break;
      case 'away':
        if (member.here) {
          member.here = false;
          this.broadcastMembers();
        }
        break;
      case 'resync': {
        const now = this.io.now();
        member.resyncs = member.resyncs.filter((t) => now - t < 3_600_000);
        const recent = member.resyncs.filter((t) => now - t < 600_000).length;
        if (recent >= RESYNCS_PER_10_MIN || member.resyncs.length >= RESYNCS_PER_HOUR) {
          this.stats.outOfStep++;
          this.out([id], 'closing', JSON.stringify({ t: 'closing', why: 'outofstep' } satisfies ServerMessage));
          this.leave(id);
          break;
        }
        member.resyncs.push(now);
        this.flush();
        this.sendSnapshot(id);
        break;
      }
      default:
        break;
    }
  }

  /** One tick of the room's clock (every TICK_MS). */
  tick(): void {
    if (this.stopped) return;
    this.ticks++;
    const speed = this.state.clock.speed;
    if (this.running && speed > 0) {
      const h = (TICK_MS / 1000) * GAME_HOURS_PER_REAL_SECOND * speed;
      if (this.step(h)) this.failedTicks = 0;
      else if (++this.failedTicks >= MAX_FAILED_TICKS) return this.stop('fault');
    }
    if (this.ticks % TICKS_PER_FINGERPRINT === 0) this.fingerprint();
    if (this.ticks % TICKS_PER_FLUSH === 0) this.flush();
  }

  /** Send every step made so far. */
  flush(): void {
    this.flushSoon = false;
    if (!this.outbox.length) return;
    const msg: ServerMessage = { t: 'steps', s: this.outbox };
    this.outbox = [];
    this.out([...this.members.keys()], 'steps', JSON.stringify(msg));
  }

  snapshotStats(): RoomStats {
    const s = this.stats;
    s.n = this.n;
    s.hour = this.state.clock.hour;
    s.speed = this.state.clock.speed;
    s.members = this.members.size;
    s.here = [...this.members.values()].filter((m) => m.here).length;
    s.failedTicks = this.failedTicks;
    return JSON.parse(JSON.stringify(s)) as RoomStats;
  }

  stop(why: 'fault' | 'cap' | 'restart'): void {
    if (this.stopped) return;
    this.flush();
    this.out([...this.members.keys()], 'closing', JSON.stringify({ t: 'closing', why } satisfies ServerMessage));
    this.stopped = true;
  }

  // ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

  /** Make one step and apply it; false if its block threw (nothing changed). */
  private step(h: number, cmd?: { by: string; id: number; c: Command }): boolean {
    const step: SharedStep = { n: this.n + 1, h };
    const full = this.pendingFull ?? this.full;
    if (this.pendingFull) step.full = this.pendingFull;
    if (cmd) step.cmds = [cmd];
    const t0 = this.io.now();
    try {
      this.state = runSharedStep(this.state, step, full, { copy: true }).state;
    } catch (e) {
      this.io.log?.(`step ${step.n} threw: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
    note(cmd ? this.stats.commandSteps : this.stats.timeSteps, this.io.now() - t0);
    this.n = step.n;
    this.full = full;
    this.pendingFull = null;
    this.outbox.push(step);
    this.stepsSinceFp++;
    return true;
  }

  private command(member: Member, id: unknown, raw: unknown): void {
    const cid = typeof id === 'number' && Number.isSafeInteger(id) ? id : -1;
    const c = validateCommand(raw);
    if (!c) return this.reject(member.id, cid, 'malformed');
    if (!member.here) {
      member.here = true; // a command brings its sender back (§5.5)
      this.broadcastMembers();
    }
    if (!this.step(0, { by: member.id, id: cid, c })) return this.reject(member.id, cid, 'failed');
    if (!this.flushSoon) {
      this.flushSoon = true;
      this.io.later(50, () => this.flushSoon && this.flush());
    }
  }

  private reject(to: string, id: number, why: string): void {
    this.stats.rejected++;
    this.out([to], 'reject', JSON.stringify({ t: 'reject', id, why } satisfies ServerMessage));
  }

  /** The server's fingerprint on the latest step, every 10 seconds while steps are being made. */
  private fingerprint(): void {
    if (this.stepsSinceFp === 0) return;
    // every step so far has gone out: a step of its own, which changes nothing, carries it
    if (!this.outbox.length && !this.step(0)) return;
    const t0 = this.io.now();
    this.outbox[this.outbox.length - 1].fp = stateHash(this.state);
    note(this.stats.fingerprints, this.io.now() - t0);
    this.stepsSinceFp = 0;
  }

  /** The tanks the members are looking at, most viewers first, then tank order (§3.2 rule 4). */
  private updateFull(): void {
    const count = new Map<string, number>();
    for (const m of this.members.values()) if (m.view && Object.hasOwn(this.state.tanks, m.view)) count.set(m.view, (count.get(m.view) ?? 0) + 1);
    const order = this.state.tankOrder;
    const list = [...count.keys()].sort((a, b) => count.get(b)! - count.get(a)! || order.indexOf(a) - order.indexOf(b)).slice(0, MAX_FULL);
    const cur = this.pendingFull ?? this.full;
    if (list.length === cur.length && list.every((t, i) => t === cur[i])) return;
    this.pendingFull = list;
  }

  /** A welcome and the shop as it is after step `n` (a join or a re-sync). */
  private sendSnapshot(id: string): void {
    const member = this.members.get(id)!;
    const t0 = this.io.now();
    let json = JSON.stringify(this.state);
    // §3.2 rule 10: the snapshot must step exactly as the live copy (JSON drops undefined and turns NaN into null)
    const parsed = JSON.parse(json) as GameState;
    if (stateHash(parsed) !== stateHash(this.state)) {
      this.stats.snapshotRepairs++;
      this.io.log?.(`step ${this.n}: the serialized copy differs from the live copy; continuing from the serialized one`);
      this.state = parsed;
      json = JSON.stringify(parsed);
      const others = [...this.members.keys()].filter((k) => k !== id);
      for (const k of others) this.sendSnapshot(k);
    }
    const welcome: ServerMessage = { t: 'welcome', you: id, members: this.memberList(), n: this.n, full: [...this.full] };
    this.out([id], 'welcome', JSON.stringify(welcome));
    const body = member.plain ? enc.encode(json) : this.io.gzip(json);
    const bin = new Uint8Array(body.length + 1);
    bin[0] = member.plain ? FRAME_SNAPSHOT_PLAIN : FRAME_SNAPSHOT_GZIP;
    bin.set(body, 1);
    note(this.stats.snapshots, this.io.now() - t0);
    this.stats.snapshots.bytes += bin.length;
    this.out([id], 'snapshot', undefined, bin);
  }

  private broadcastMembers(): void {
    const msg: ServerMessage = { t: 'members', members: this.memberList() };
    this.out([...this.members.keys()], 'members', JSON.stringify(msg));
  }

  private out(to: string[], kind: OutKind, text?: string, bin?: Uint8Array): void {
    if (!to.length) return;
    const size = bin ? bin.length : enc.encode(text!).length;
    this.stats.bytes[kind] += size * to.length;
    this.stats.frames[kind] += to.length;
    this.io.send({ to, kind, text, bin });
  }
}
