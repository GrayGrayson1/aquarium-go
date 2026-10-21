/**
 * One shared shop on the server (SHARED-SHOPS.md §3, §5.2 to §5.5): its copy, which counts, and the members connected
 * to it. The room advances the copy in steps it sizes, runs each command in its own zero-hour step at once, and sends
 * every member the same steps, which each browser applies through the same step block. Plain logic with no sockets,
 * timers or storage of its own: the host (./host.ts) drives it and keeps it saved, and the unit tests drive it
 * directly.
 *
 * Members are players (their account ids), not connections: a reconnect is the same member, so first one wins knows
 * their earlier commands and the re-sync budget follows the player (§5.3). Chunk 12 adds who may pause (§5.4), the
 * guide flags forwarded once, the starvation guard's slow-down in `post` (§3.2 rule 6), photos (§4.4), the catch-up
 * when someone comes back (§5.2), time steps in place with a checkpoint (§11), and fingerprints spaced by their cost.
 */
import { createHash } from 'node:crypto';
import type { GameState } from '@/types';
import { runSharedStep, type SharedStep, type StepCommand } from '@/sim/sharedStep';
import { validateCommand, type Command } from '@/sim/commands';
import { GAME_HOURS_PER_REAL_SECOND } from '@/sim/time';
import { checkStarvation, newStarvationMemory, type StarvationMemory } from '@/sim/starvation';
import { simulateOffline, defaultFocus, OFFLINE_HIDDEN_MIN_MS, type OfflineSummary } from '@/sim/catchUp';
import { deepClone } from '@/sim/clone';
import { stateHash } from '@/persistence/hash';
import {
  FRAME_PHOTO,
  FRAME_SNAPSHOT_GZIP,
  FRAME_SNAPSHOT_PLAIN,
  PHOTO_REF,
  PHOTO_TYPES,
  type ClientMessage,
  type ClosingMessage,
  type ClosingReason,
  type RejectReason,
  type ServerMessage,
  type SharedMember,
  type SharedYou,
} from '@/types/shared';
import { parsePhoto } from './photos';

/** The room's tick, as the game loop's (TICK_MS). */
export const TICK_MS = 250;
/** Time steps go out about once a second (§3.3). */
const TICKS_PER_FLUSH = 4;
/** A fingerprint every 10 real seconds, or more rarely when one costs more than FINGERPRINT_SHARE of the time (§11). */
const FINGERPRINT_MIN_MS = 10_000;
const FINGERPRINT_MAX_MS = 60_000;
const FINGERPRINT_SHARE = 0.02;
/** The interval between fingerprints for one that took `ms` to make (§11): at least 10 s, at most 60 s. */
export const fingerprintEvery = (ms: number): number => Math.min(FINGERPRINT_MAX_MS, Math.max(FINGERPRINT_MIN_MS, ms / FINGERPRINT_SHARE));
/** At most this many tanks at full detail (§3.2 rule 4). */
const MAX_FULL = 4;
/** Three time steps in a row that throw stop the shop (§5.2 item 3). */
const MAX_FAILED_TICKS = 3;
/** Re-syncs per member (§5.3): at most 3 in 10 minutes and 6 in an hour, then the connection closes (`outofstep`). */
const RESYNCS_PER_10_MIN = 3;
const RESYNCS_PER_HOUR = 6;
/**
 * "There" (§5.5, ADR-0045 decision 4): 30 minutes without input counts as away. The browser asks "Still here?" at 30
 * minutes and says `away` a minute later; the server's own check waits a minute more, so an answer in time never
 * flickers the shop.
 */
export const IDLE_MS = 31 * 60_000;
/** A member away this long is disconnected (the browser does it after 2 minutes; this is the server's backstop). */
export const AWAY_DROP_MS = 10 * 60_000;
/** `view` counts at most once a second (§5.3). */
const VIEW_EVERY_MS = 1000;
/** `members` goes out at most once a second (§3.3). */
const MEMBERS_EVERY_MS = 1000;
/** Photo listings per member a minute (§4.4), and photos a member may ask for a minute. */
const PHOTO_LISTINGS_PER_MIN = 6;
const PHOTO_REQUESTS_PER_MIN = 60;
/** Photos kept in memory (each 10 to 40 KB). */
const PHOTO_CACHE = 64;
/** A catch-up's summary rides on the welcome of members who join this soon after it. */
const CATCH_UP_FRESH_MS = 120_000;

/**
 * A member's message, as text from the network: parsed and checked here, in the worker. Only the fields each kind
 * uses are kept; a command's own fields are checked by `validateCommand` when it is applied. `hello`, `create` and
 * `token` are the connection's own (./app.ts), never a room's.
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
    case 'grant':
      return typeof o.user === 'string' && o.user.length > 0 && o.user.length <= 80 && typeof o.pause === 'boolean' ? { t: 'grant', user: o.user, pause: o.pause } : null;
    case 'photo':
      return typeof o.hash === 'string' && /^[0-9a-f]{64}$/.test(o.hash) ? { t: 'photo', hash: o.hash } : null;
    case 'here':
    case 'away':
    case 'input':
    case 'resync':
      return { t: o.t };
    default:
      return null;
  }
}

/**
 * Who may send a command (§5.4): pause and speed for the owner and the members the owner chose; the guide's own
 * steps for nobody (a shared shop has no guide, ADR-0045 decision 5); everything else for every member (ADR-0043
 * decision 5). The one place permission tiers (§5.6) will change.
 */
export function allowed(member: { owner: boolean; pause: boolean }, cmd: Command): boolean {
  switch (cmd.k) {
    case 'setSpeed':
      return member.owner || member.pause;
    case 'tutorialNext':
    case 'tutorialSkip':
      return false;
    default:
      return true;
  }
}

export type OutKind = 'steps' | 'snapshot' | 'welcome' | 'members' | 'reject' | 'closing' | 'photo';

/** A frame for some members (their account ids): JSON text, or a binary snapshot or photo. */
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
  /** A monotonic clock (ms): durations. */
  now(): number;
  /** Real time (ms): first one wins' 30 seconds, "there", the catch-up. Default `Date.now`; tests drive it. */
  wall?(): number;
  log?(line: string): void;
  /** A new photo to store once (§4.4): its hash, type and base64 data. */
  photoPut?(hash: string, mime: string, data: string): void;
  /** Fetch a stored photo; `reply(null)` when there's none. */
  photoGet?(hash: string, reply: (p: { mime: string; bytes: Uint8Array } | null) => void): void;
  /** The owner changed who may pause: store the new list (`setPausers` answers it back to the room). */
  grant?(pausers: string[]): void;
  /** Nobody is there any more (the shop pauses: the host saves, recording when). */
  emptied?(): void;
  /** Someone is there again after `awayMs` with nobody there (the host decides on a catch-up). */
  returned?(awayMs: number): void;
  /** Close this member's connection: away too long (the browser reconnects when they're back). */
  drop?(user: string): void;
  /**
   * Three time steps in a row threw (§5.2 item 3): the room has stopped stepping, its copy is the last good one; the
   * host saves it and calls `stop('fault', …)`. Without it the room stops at once.
   */
  fault?(): void;
}

interface Member extends SharedYou {
  here: boolean;
  view: string | null;
  /** A view that waits for its turn (one a second). */
  pendingView: string | null | undefined;
  lastView: number;
  plain: boolean;
  /** Real ms of the last input, and since when they're away (null while there). */
  lastInput: number;
  awaySince: number | null;
  photoListings: number[];
  photoRequests: number[];
  /** Photos already sent on this connection: each once (the review's note 1; the browser keeps them for the session). */
  photosSent: Set<string>;
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
  /** The interval between fingerprints now (ms). */
  fingerprintEveryMs: number;
  snapshots: Timing & { bytes: number };
  checkpoints: Timing;
  /** Bytes queued per kind of frame, counted once per recipient. */
  bytes: Record<OutKind, number>;
  frames: Record<OutKind, number>;
  rejected: number;
  /** Commands the game refused because what their sender saw had changed (first one wins, §4.3). */
  conflicts: number;
  /** Guide flags the shop already had, not forwarded (§4.3). */
  flagsDropped: number;
  failedTicks: number;
  /** Time steps that threw and were undone from the checkpoint. */
  undone: number;
  /** The serialized copy's fingerprint differed from the live copy's (§3.2 rule 10). */
  snapshotRepairs: number;
  /** Members closed for re-syncing too often (§5.3). */
  outOfStep: number;
  /** The starvation guard slowed the shop (§3.2 rule 6). */
  slowdowns: number;
  catchUps: number;
  photosStored: number;
  photosServed: number;
}

const enc = new TextEncoder();

/**
 * Does the copy hold only what JSON writes back exactly? A number that isn't finite (JSON writes null, the fingerprint
 * "NaN") or an object that isn't plain (a Map, a Date: JSON and the fingerprint read them differently) would make a
 * snapshot step differently from the live copy. One walk, much cheaper than two fingerprints and a parse (§11); when it
 * says no, the room takes the slow path that repairs the copy (§3.2 rule 10).
 */
export function jsonExact(v: unknown, depth = 0): boolean {
  if (typeof v === 'number') return Number.isFinite(v);
  if (v === null || typeof v !== 'object') return typeof v !== 'function' && typeof v !== 'bigint' && typeof v !== 'symbol';
  if (depth > 200) return false;
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) if (!jsonExact(v[i], depth + 1)) return false;
    return true;
  }
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) return false;
  for (const k in v) if (!jsonExact((v as Record<string, unknown>)[k], depth + 1)) return false;
  return true;
}

export interface RoomOptions {
  /** The club the shop belongs to, and who may pause besides the owner (the shop's row). */
  club: string;
  pausers?: readonly string[];
  /** chunk 13 — the owner's name, for the welcome (the pause refusal names them). */
  owner?: string;
}

export class Room {
  state: GameState;
  /** The last step applied. */
  n = 0;
  /** The full-detail list in force. */
  full: string[] = [];
  readonly club: string;
  /** chunk 13 — the owner's name (the welcome names them). */
  private readonly owner: string | undefined;
  private pendingFull: string[] | null = null;
  private readonly members = new Map<string, Member>();
  /** Re-syncs by player, kept across reconnects while the room lives (§5.3). */
  private readonly resyncs = new Map<string, number[]>();
  private pausers: Set<string>;
  private outbox: SharedStep[] = [];
  private ticks = 0;
  private stepsSinceFp = 0;
  private fpEveryMs = FINGERPRINT_MIN_MS;
  private lastFpAt: number;
  private failedTicks = 0;
  private flushSoon = false;
  /** Faulted: no more steps until the host stops the room. */
  private halted = false;
  private membersDirty = false;
  private lastMembersAt = -Infinity;
  /** The copy at the last fingerprint, and the steps applied since: a time step that throws is undone from it. */
  private checkpoint: { state: GameState; n: number; full: string[]; starving: string[] } | null = null;
  private since: { step: SharedStep; full: string[] }[] = [];
  private readonly starvation: StarvationMemory = newStarvationMemory();
  /** When the shop last had nobody there (real ms), while it has nobody. */
  private idleSince: number | null;
  private lastCatchUp: { summary: OfflineSummary; at: number } | null = null;
  private snapshotCache: { n: number; plain: boolean; bin: Uint8Array } | null = null;
  private readonly photos = new Map<string, { mime: string; bytes: Uint8Array }>();
  stopped = false;
  readonly stats: RoomStats;

  constructor(
    state: GameState,
    private readonly io: RoomIo,
    opts: RoomOptions = { club: 'shop' },
  ) {
    this.state = state;
    this.club = opts.club;
    this.owner = opts.owner;
    this.pausers = new Set(opts.pausers ?? []);
    this.idleSince = this.wall();
    this.lastFpAt = io.now();
    const zero = { steps: 0, snapshot: 0, welcome: 0, members: 0, reject: 0, closing: 0, photo: 0 };
    this.stats = {
      n: 0,
      hour: 0,
      speed: 0,
      members: 0,
      here: 0,
      timeSteps: timing(),
      commandSteps: timing(),
      fingerprints: timing(),
      fingerprintEveryMs: FINGERPRINT_MIN_MS,
      snapshots: { ...timing(), bytes: 0 },
      checkpoints: timing(),
      bytes: { ...zero },
      frames: { ...zero },
      rejected: 0,
      conflicts: 0,
      flagsDropped: 0,
      failedTicks: 0,
      undone: 0,
      snapshotRepairs: 0,
      outOfStep: 0,
      slowdowns: 0,
      catchUps: 0,
      photosStored: 0,
      photosServed: 0,
    };
    this.takeCheckpoint();
  }

  private wall(): number {
    return this.io.wall?.() ?? Date.now();
  }

  /** Running: someone is there (§5.5). Commands apply even while it isn't. */
  get running(): boolean {
    for (const m of this.members.values()) if (m.here) return true;
    return false;
  }

  get size(): number {
    return this.members.size;
  }

  has(user: string): boolean {
    return this.members.has(user);
  }

  memberList(): SharedMember[] {
    return [...this.members.values()].map((m) => ({ id: m.id, name: m.name, here: m.here, pause: this.mayPause(m) }));
  }

  private mayPause(m: { id: string; owner: boolean }): boolean {
    return m.owner || this.pausers.has(m.id);
  }

  /** A member joins, or comes back on a new connection: they get the welcome and the shop (§3.3). */
  join(you: SharedYou, plain = false): void {
    if (this.stopped || this.halted) return;
    this.flush(); // steps already made go to the members who were there for them
    const wall = this.wall();
    const had = this.members.get(you.id);
    const m: Member = {
      id: you.id,
      name: you.name,
      owner: you.owner,
      pause: false,
      here: true,
      view: had?.view ?? null,
      pendingView: undefined,
      lastView: -Infinity,
      plain,
      lastInput: wall,
      awaySince: null,
      photoListings: had?.photoListings ?? [],
      photoRequests: had?.photoRequests ?? [],
      photosSent: new Set(),
    };
    if (you.pause && !you.owner) this.pausers.add(you.id); // the database says so (`server_member`)
    this.cameBack(); // before the joiner is a member: a catch-up then reaches them in their welcome
    this.members.set(you.id, m);
    this.sendSnapshot(you.id);
    this.membersChanged();
  }

  leave(user: string): void {
    if (!this.members.delete(user)) return;
    this.updateFull();
    this.membersChanged();
    this.checkEmptied();
  }

  /** The owner's grant, once stored (the list as the database kept it). */
  setPausers(list: readonly string[]): void {
    this.pausers = new Set(list);
    this.membersChanged();
  }

  handle(user: string, m: ClientMessage): void {
    const member = this.members.get(user);
    if (!member || this.stopped) return;
    switch (m.t) {
      case 'cmd':
        this.command(member, m.id, m.c);
        break;
      case 'view': {
        const tank = typeof m.tank === 'string' && Object.hasOwn(this.state.tanks, m.tank) ? m.tank : null;
        if (this.io.now() - member.lastView >= VIEW_EVERY_MS) this.setView(member, tank);
        else member.pendingView = tank;
        break;
      }
      case 'here':
      case 'input':
        member.lastInput = this.wall();
        member.awaySince = null;
        if (!member.here) {
          member.here = true;
          this.cameBack();
          this.membersChanged();
        }
        break;
      case 'away':
        if (member.here) {
          member.here = false;
          member.awaySince = this.wall();
          this.membersChanged();
          this.checkEmptied();
        }
        break;
      case 'resync':
        this.resync(member);
        break;
      case 'grant':
        if (!member.owner || !this.io.grant) break;
        {
          const next = new Set(this.pausers);
          if (m.pause) next.add(m.user);
          else next.delete(m.user);
          this.io.grant([...next]);
        }
        break;
      case 'photo':
        this.photo(member, m.hash);
        break;
      default:
        break;
    }
  }

  /** One tick of the room's clock (every TICK_MS). */
  tick(): void {
    if (this.stopped || this.halted) return;
    this.ticks++;
    const now = this.io.now();
    for (const m of this.members.values()) if (m.pendingView !== undefined && now - m.lastView >= VIEW_EVERY_MS) this.setView(m, m.pendingView);
    if (this.ticks % TICKS_PER_FLUSH === 0) this.checkIdle();
    const speed = this.state.clock.speed;
    if (this.running && speed > 0) {
      const h = (TICK_MS / 1000) * GAME_HOURS_PER_REAL_SECOND * speed;
      if (this.timeStep(h)) this.failedTicks = 0;
      else if (++this.failedTicks >= MAX_FAILED_TICKS || this.halted) return this.faulted();
    }
    if (now - this.lastFpAt >= this.fpEveryMs) this.fingerprint();
    if (this.ticks % TICKS_PER_FLUSH === 0) this.flush();
    if (this.membersDirty && now - this.lastMembersAt >= MEMBERS_EVERY_MS) this.broadcastMembers();
  }

  /** Send every step made so far. */
  flush(): void {
    this.flushSoon = false;
    if (!this.outbox.length) return;
    // chunk 13: the server's clock with them, so a browser can tell it has fallen behind (§7.6)
    const msg: ServerMessage = { t: 'steps', s: this.outbox, at: this.wall() };
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
    s.fingerprintEveryMs = this.fpEveryMs;
    return JSON.parse(JSON.stringify(s)) as RoomStats;
  }

  /** Close every member's connection with `why` and stop stepping. */
  stop(why: ClosingReason, extra: Omit<ClosingMessage, 't' | 'why'> = {}): void {
    if (this.stopped) return;
    this.flush();
    this.out([...this.members.keys()], 'closing', JSON.stringify({ t: 'closing', why, ...extra } satisfies ServerMessage));
    this.stopped = true;
  }

  private faulted(): void {
    this.halted = true;
    this.flush();
    if (this.io.fault) this.io.fault();
    else this.stop('fault');
  }

  /** Close one member with `why` (a member taken out of the club: `removed`). */
  close(user: string, why: ClosingReason): void {
    if (!this.members.has(user)) return;
    this.flush();
    this.out([user], 'closing', JSON.stringify({ t: 'closing', why } satisfies ServerMessage));
    this.leave(user);
  }

  /**
   * Catch up the time nobody was here (§5.2, ADR-0043 decision 6, ADR-0045 decision 14): nothing under 5 minutes or
   * while paused, else at most 12 game hours under the grace rules; everyone there gets the shop again, with the
   * summary. Returns the summary when game time passed.
   */
  catchUp(realMs: number): OfflineSummary | null {
    if (this.stopped || realMs < OFFLINE_HIDDEN_MIN_MS || this.state.clock.speed === 0) return null;
    this.flush();
    const summary = simulateOffline(this.state, realMs, { focusTankId: defaultFocus(this.state) });
    if (!(summary.hours > 0)) return null;
    this.stats.catchUps++;
    // a new copy no step describes: every member starts again from it, and later steps follow on from it
    this.n++;
    this.since = [];
    this.takeCheckpoint();
    this.snapshotCache = null;
    this.lastCatchUp = { summary, at: this.wall() };
    for (const id of this.members.keys()) this.sendSnapshot(id);
    return summary;
  }

  /** The tanks' photos the shop's listings refer to (the hashes), for the prune (§4.4). */
  photoRefs(): Set<string> {
    const out = new Set<string>();
    for (const l of this.state.market.listings) {
      const p = l.snapshot?.photo;
      if (typeof p === 'string' && PHOTO_REF.test(p)) out.add(p.slice(2));
    }
    return out;
  }

  /** A photo the host fetched or stored: kept for the next requests. */
  cachePhoto(hash: string, mime: string, bytes: Uint8Array): void {
    this.photos.delete(hash);
    this.photos.set(hash, { mime, bytes });
    while (this.photos.size > PHOTO_CACHE) this.photos.delete(this.photos.keys().next().value!);
  }

  // ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

  private setView(m: Member, tank: string | null): void {
    m.pendingView = undefined;
    m.lastView = this.io.now();
    m.view = tank;
    this.updateFull();
  }

  /** Away members, and the 30 minutes without input (§5.5). */
  private checkIdle(): void {
    const wall = this.wall();
    let changed = false;
    for (const m of this.members.values()) {
      if (m.here && wall - m.lastInput >= IDLE_MS) {
        m.here = false;
        m.awaySince = wall;
        changed = true;
      }
      if (!m.here && m.awaySince !== null && wall - m.awaySince >= AWAY_DROP_MS && this.io.drop) {
        m.awaySince = null; // asked once
        this.io.drop(m.id);
      }
    }
    if (changed) {
      this.membersChanged();
      this.checkEmptied();
    }
  }

  private checkEmptied(): void {
    if (this.running || this.idleSince !== null) return;
    this.idleSince = this.wall();
    this.flush();
    this.io.emptied?.();
  }

  /** Someone is there again: after a while with nobody, the host may catch the shop up (§5.2 item 5). */
  private cameBack(): void {
    if (this.idleSince === null) return;
    const away = this.wall() - this.idleSince;
    this.idleSince = null;
    this.io.returned?.(away);
  }

  /** When nobody has been there since (real ms), or null while someone is. */
  get emptySince(): number | null {
    return this.idleSince;
  }

  private resync(member: Member): void {
    const now = this.io.now();
    const times = (this.resyncs.get(member.id) ?? []).filter((t) => now - t < 3_600_000);
    const recent = times.filter((t) => now - t < 600_000).length;
    if (recent >= RESYNCS_PER_10_MIN || times.length >= RESYNCS_PER_HOUR) {
      this.stats.outOfStep++;
      this.resyncs.set(member.id, times);
      this.close(member.id, 'outofstep');
      return;
    }
    times.push(now);
    this.resyncs.set(member.id, times);
    this.flush();
    this.sendSnapshot(member.id);
  }

  /** A time step, in place (§11: no copy); a step that throws is undone from the checkpoint and never sent. */
  private timeStep(h: number): boolean {
    const step: SharedStep = { n: this.n + 1, h };
    const full = this.pendingFull ?? this.full;
    if (this.pendingFull) step.full = this.pendingFull;
    const t0 = this.io.now();
    try {
      runSharedStep(this.state, step, full);
      // §3.2 rule 6: the server's own changes go in `post`, so every copy makes them in this step
      const slowed = checkStarvation(this.state, this.starvation);
      if (slowed) {
        step.post = [{ k: 'setSpeed', speed: 1 }];
        this.stats.slowdowns++;
      }
    } catch (e) {
      this.io.log?.(`step ${step.n} threw: ${e instanceof Error ? e.message : String(e)}`);
      this.undo();
      return false;
    }
    note(this.stats.timeSteps, this.io.now() - t0);
    this.accept(step, full);
    return true;
  }

  /** A command's own step, on a copy (§5.2 item 3): a block that throws leaves the shop as it was. */
  private commandStep(cmd: StepCommand): boolean {
    const step: SharedStep = { n: this.n + 1, h: 0, cmds: [cmd] };
    const full = this.pendingFull ?? this.full;
    if (this.pendingFull) step.full = this.pendingFull;
    const t0 = this.io.now();
    try {
      const out = runSharedStep(this.state, step, full, { copy: true });
      this.state = out.state;
      for (const r of out.results) if (r.conflict) this.stats.conflicts++;
    } catch (e) {
      this.io.log?.(`step ${step.n} threw: ${e instanceof Error ? e.message : String(e)}`);
      return false;
    }
    note(this.stats.commandSteps, this.io.now() - t0);
    this.accept(step, full);
    return true;
  }

  private accept(step: SharedStep, full: string[]): void {
    this.n = step.n;
    this.full = full;
    this.pendingFull = null;
    this.outbox.push(step);
    this.since.push({ step, full });
    this.stepsSinceFp++;
    this.snapshotCache = null;
  }

  /**
   * Back to the checkpoint, then every step since, in place: the copy after the last step that worked (each of those
   * steps worked once, and a step does the same thing every time). If even that throws, the room halts.
   */
  private undo(): void {
    const cp = this.checkpoint!;
    this.stats.undone++;
    try {
      const state = deepClone(cp.state);
      // the starvation memory replays too (each slow-down is in its step's `post` already, so none repeats)
      const mem: StarvationMemory = { gameId: this.starvation.gameId, starving: new Set(cp.starving) };
      for (const { step, full } of this.since) {
        runSharedStep(state, step, full);
        if (step.h > 0) checkStarvation(state, mem);
      }
      this.state = state;
      this.starvation.starving = mem.starving;
    } catch (e) {
      // the checkpoint itself is a good copy (older): the host saves that, never the half-applied step (the review's note 7)
      this.io.log?.(`undo from step ${cp.n} threw: ${e instanceof Error ? e.message : String(e)}`);
      this.state = deepClone(cp.state);
      this.starvation.starving = new Set(cp.starving);
      this.halted = true;
    }
  }

  private takeCheckpoint(): void {
    const t0 = this.io.now();
    this.checkpoint = { state: deepClone(this.state), n: this.n, full: [...this.full], starving: [...this.starvation.starving] };
    this.since = [];
    note(this.stats.checkpoints, this.io.now() - t0);
  }

  private command(member: Member, id: unknown, raw: unknown): void {
    const cid = typeof id === 'number' && Number.isSafeInteger(id) ? id : -1;
    let c = validateCommand(raw);
    if (!c) return this.reject(member.id, cid, 'malformed');
    if (!allowed({ owner: member.owner, pause: this.mayPause(member) }, c)) return this.reject(member.id, cid, 'forbidden');
    // §4.3: the shop raises each guide flag once; ten members opening the market send one
    if (c.k === 'raiseFlag' && Object.hasOwn(this.state.progress.tutorial.flags, c.name)) {
      this.stats.flagsDropped++;
      return;
    }
    if (c.k === 'createListing' && c.photo !== undefined) {
      // §4.4: the server stores the picture once and every copy gets its reference; only the server makes references
      const p = PHOTO_REF.test(c.photo) ? null : parsePhoto(c.photo);
      if (!p) return this.reject(member.id, cid, 'malformed');
      const now = this.io.now();
      member.photoListings = member.photoListings.filter((t) => now - t < 60_000);
      if (member.photoListings.length >= PHOTO_LISTINGS_PER_MIN) return this.reject(member.id, cid, 'rate');
      member.photoListings.push(now);
      const hash = createHash('sha256').update(p.bytes).digest('hex');
      if (!this.photos.has(hash)) this.stats.photosStored++;
      this.cachePhoto(hash, p.mime, p.bytes);
      // always: the host knows whether the database still holds it (a photo listed again after a prune is stored again)
      this.io.photoPut?.(hash, p.mime, p.base64);
      c = { ...c, photo: `p:${hash}` };
    }
    if (!member.here) {
      member.here = true; // a command brings its sender back (§5.5)
      member.lastInput = this.wall();
      member.awaySince = null;
      this.cameBack();
      this.membersChanged();
    }
    // the sender's name and the server's wall clock travel with the command, for first one wins (§4.3)
    if (!this.commandStep({ by: member.id, who: member.name, id: cid, at: this.wall(), c })) return this.reject(member.id, cid, 'failed');
    if (!this.flushSoon) {
      this.flushSoon = true;
      this.io.later(50, () => this.flushSoon && this.flush());
    }
  }

  private reject(to: string, id: number, why: RejectReason): void {
    this.stats.rejected++;
    this.out([to], 'reject', JSON.stringify({ t: 'reject', id, why } satisfies ServerMessage));
  }

  /** A photo a member asked for (§4.4): only one the shop's listings refer to, a few a minute. */
  private photo(member: Member, hash: string): void {
    const now = this.io.now();
    member.photoRequests = member.photoRequests.filter((t) => now - t < 60_000);
    if (member.photoRequests.length >= PHOTO_REQUESTS_PER_MIN || member.photosSent.has(hash) || !this.photoRefs().has(hash)) return;
    member.photoRequests.push(now);
    const send = (p: { mime: string; bytes: Uint8Array }) => {
      const type = PHOTO_TYPES.indexOf(p.mime as (typeof PHOTO_TYPES)[number]);
      if (type <= 0 || !this.members.has(member.id)) return;
      const bin = new Uint8Array(1 + 64 + 1 + p.bytes.length);
      bin[0] = FRAME_PHOTO;
      bin.set(enc.encode(hash), 1);
      bin[65] = type;
      bin.set(p.bytes, 66);
      this.stats.photosServed++;
      member.photosSent.add(hash); // when it goes out, not when asked
      this.out([member.id], 'photo', undefined, bin);
    };
    const have = this.photos.get(hash);
    if (have) return send(have);
    this.io.photoGet?.(hash, (p) => {
      if (!p) return;
      this.cachePhoto(hash, p.mime, p.bytes);
      send(p);
    });
  }

  /** The server's fingerprint on the latest step, spaced by what it costs (§11). */
  private fingerprint(): void {
    this.lastFpAt = this.io.now();
    if (this.stepsSinceFp === 0) return;
    // every step so far has gone out: a step of its own, which changes nothing, carries it
    if (!this.outbox.length) {
      // it carries a full-detail list that's waiting, as any step does (the review's note 4)
      const full = this.pendingFull ?? this.full;
      const empty: SharedStep = { n: this.n + 1, h: 0 };
      if (this.pendingFull) empty.full = this.pendingFull;
      try {
        runSharedStep(this.state, empty, full);
      } catch {
        return;
      }
      this.accept(empty, full);
    }
    const t0 = this.io.now();
    this.outbox[this.outbox.length - 1].fp = stateHash(this.state);
    const ms = this.io.now() - t0;
    note(this.stats.fingerprints, ms);
    this.fpEveryMs = fingerprintEvery(ms);
    this.stepsSinceFp = 0;
    this.takeCheckpoint();
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

  /**
   * §3.2 rule 10, before every snapshot and save: the serialized copy must step exactly as the live one. When the cheap
   * check can't say so and the fingerprints differ, the live copy becomes the serialized one (logged as a bug) and every
   * member but `skip` gets it again.
   */
  ensureExact(skip?: string): void {
    if (jsonExact(this.state)) return;
    const parsed = JSON.parse(JSON.stringify(this.state)) as GameState;
    if (stateHash(parsed) === stateHash(this.state)) return;
    this.stats.snapshotRepairs++;
    this.io.log?.(`step ${this.n}: the serialized copy differs from the live copy; continuing from the serialized one`);
    this.state = parsed;
    this.takeCheckpoint();
    this.snapshotCache = null;
    for (const k of this.members.keys()) if (k !== skip) this.sendSnapshot(k);
  }

  /** A welcome and the shop as it is after step `n` (a join, a re-sync or a catch-up). */
  private sendSnapshot(id: string): void {
    const member = this.members.get(id)!;
    const t0 = this.io.now();
    this.ensureExact(id);
    const welcome: ServerMessage = {
      t: 'welcome',
      you: { id: member.id, name: member.name, owner: member.owner, pause: this.mayPause(member) },
      shop: { club: this.club, name: this.state.shopName ?? '', ...(this.owner ? { owner: this.owner } : {}) },
      members: this.memberList(),
      n: this.n,
      full: [...this.full],
    };
    if (this.lastCatchUp && this.wall() - this.lastCatchUp.at < CATCH_UP_FRESH_MS) welcome.catchUp = this.lastCatchUp.summary;
    this.out([id], 'welcome', JSON.stringify(welcome));
    let bin = this.snapshotCache && this.snapshotCache.n === this.n && this.snapshotCache.plain === member.plain ? this.snapshotCache.bin : null;
    if (!bin) {
      const json = JSON.stringify(this.state);
      const body = member.plain ? enc.encode(json) : this.io.gzip(json);
      bin = new Uint8Array(body.length + 1);
      bin[0] = member.plain ? FRAME_SNAPSHOT_PLAIN : FRAME_SNAPSHOT_GZIP;
      bin.set(body, 1);
      this.snapshotCache = { n: this.n, plain: member.plain, bin };
    }
    note(this.stats.snapshots, this.io.now() - t0);
    this.stats.snapshots.bytes += bin.length;
    this.out([id], 'snapshot', undefined, bin);
  }

  private membersChanged(): void {
    this.membersDirty = true;
    if (this.io.now() - this.lastMembersAt >= MEMBERS_EVERY_MS) this.broadcastMembers();
  }

  private broadcastMembers(): void {
    this.membersDirty = false;
    this.lastMembersAt = this.io.now();
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
