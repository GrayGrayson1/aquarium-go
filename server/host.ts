/**
 * A room's host (SHARED-SHOPS.md §5.2, §6.2): one shop's life around its room (./room.ts). It takes the shop's lease,
 * loads and repairs the shop and catches up the time it stood empty (a wake), or makes a new one (the owner's
 * `create`); runs the room's clock; saves every 3 minutes of play, when nobody is there any more and when it stops;
 * renews the lease every 30 seconds; stores, serves and prunes photos (§4.4); and stores the owner's grants (§5.4).
 *
 * It runs in the room's worker thread (./roomWorker.ts) or, in the unit tests, in the main thread; either way it talks
 * to the main thread only through its port (./protocol.ts) and reaches the database through it.
 */
import { gzipSync, gunzipSync } from 'node:zlib';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { tutorialSkip } from '@/sim/facility';
import { STARTER_IDS, type StarterId } from '@/data/species';
import { decodeRecord, encodeRecord } from '@/persistence/serialize';
import { SCHEMA_VERSION } from '@/persistence/schema';
import { SaveError } from '@/persistence/types';
import type { ClosingReason } from '@/types/shared';
import { Room, TICK_MS, parseClientMessage } from './room';
import type { FromRoom, OpenMode, RoomCall, RoomPort, ToRoom } from './protocol';
import type { ShopRow, ShopSave, Store } from './store';

/** Saves while someone plays (§5.2 item 4). */
export const SAVE_EVERY_MS = 3 * 60_000;
/** The lease: renewed every 30 seconds for 90 (§6.2). */
export const LEASE_SECONDS = 90;
export const LEASE_RENEW_MS = 30_000;
/** Photos are pruned after every few saves (§4.4). */
const PRUNE_EVERY_SAVES = 5;
/** A stored photo younger than this is never pruned: its listing may not be in a save yet. */
const PRUNE_GRACE_MS = 10 * 60_000;

export interface HostClock {
  /** Real time (ms). */
  wall(): number;
  /** A monotonic clock (ms). */
  now(): number;
}

export interface HostTimers {
  every(ms: number, fn: () => void): () => void;
  after(ms: number, fn: () => void): void;
}

export const realTimers: HostTimers = {
  every: (ms, fn) => {
    const h = setInterval(fn, ms);
    return () => clearInterval(h);
  },
  after: (ms, fn) => void setTimeout(fn, ms),
};

/** The store, through the port: each call a message to the main thread and its answer. */
function portStore(port: RoomPort, pending: Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>): Store {
  let next = 1;
  const call =
    (fn: RoomCall) =>
    (...args: unknown[]): Promise<never> =>
      new Promise((resolve, reject) => {
        const id = next++;
        pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
        port.post({ t: 'rpc', id, fn, args });
      });
  const refused = () => Promise.reject(new Error('not for a room'));
  return {
    member: refused,
    usageAdd: refused,
    shopGet: call('shopGet'),
    shopCreate: call('shopCreate'),
    shopPut: call('shopPut'),
    shopTake: call('shopTake'),
    shopRelease: call('shopRelease'),
    setPausers: call('setPausers'),
    photoPut: call('photoPut'),
    photoGet: call('photoGet'),
    photoHashes: call('photoHashes'),
    photosDelete: call('photosDelete'),
  };
}

/** A shop's stored text: the save's record (a header line, then the JSON). */
export function unpackBody(row: Pick<ShopRow, 'encoding' | 'body'>): string {
  return row.encoding === 'gzip-base64' ? gunzipSync(Buffer.from(row.body, 'base64')).toString('utf8') : row.body;
}

export class RoomHost {
  room: Room | null = null;
  private club = '';
  private holder = '';
  private build = '';
  private readonly store: Store;
  private readonly pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private revision = 0;
  private savedAt = 0;
  /** When the shop emptied (real ms), recorded with the next save; null while someone is there. */
  private leftAt: number | null = null;
  /** What the last save held: the step, and the emptied time. */
  private savedN = -1;
  private savedLeftAt: number | null = null;
  private saving: Promise<void> | null = null;
  private saves = 0;
  private stopTick: (() => void) | null = null;
  private stopLease: (() => void) | null = null;
  private leaseOkAt = 0;
  private stopping = false;
  /** Photos waiting for their first database write (retried with each save). */
  private readonly unstored = new Map<string, { mime: string; data: string }>();

  constructor(
    private readonly port: RoomPort,
    private readonly clock: HostClock = { wall: Date.now, now: () => performance.now() },
    private readonly timers: HostTimers = realTimers,
  ) {
    this.store = portStore(port, this.pending);
    port.on((m) => this.receive(m));
  }

  private post(m: FromRoom): void {
    this.port.post(m);
  }

  private log(line: string): void {
    this.post({ t: 'log', line: `[room ${this.club.slice(0, 8)}] ${line}` });
  }

  private receive(m: ToRoom): void {
    try {
      switch (m.t) {
        case 'open':
          this.club = m.club;
          this.holder = m.holder;
          this.build = m.build;
          void this.open(m);
          break;
        case 'join':
          this.room?.join(m.you, m.plain);
          break;
        case 'leave':
          this.room?.leave(m.user);
          break;
        case 'msg': {
          const msg = this.room ? parseClientMessage(m.text) : null; // a member's text, checked in this thread
          if (msg) this.room!.handle(m.user, msg);
          break;
        }
        case 'removed':
          this.room?.close(m.user, 'removed');
          break;
        case 'stop':
          void this.stop(m.why, m.until);
          break;
        case 'stats':
          this.post({ t: 'stats', id: m.id, stats: this.room?.snapshotStats() ?? null, cpu: process.cpuUsage() });
          break;
        case 'rpc': {
          const p = this.pending.get(m.id);
          this.pending.delete(m.id);
          if (!p) break;
          if (m.ok) p.resolve(m.value);
          else p.reject(new Error(m.error ?? 'store'));
          break;
        }
      }
    } catch (e) {
      // nothing a message carries may take the room down
      this.log(`message ${m.t} failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async open(m: { t: 'open' } & OpenMode): Promise<void> {
    try {
      const state = m.mode === 'create' ? await this.create(m) : await this.wake();
      if (typeof state === 'string') {
        this.post({ t: 'opened', ok: false, why: state });
        return void this.post({ t: 'stopped' });
      }
      this.post({ t: 'opened', ok: true, name: state.room.state.shopName ?? '', pausers: state.pausers });
    } catch (e) {
      this.log(`open failed: ${e instanceof Error ? e.message : String(e)}`);
      await this.release();
      this.post({ t: 'opened', ok: false, why: 'fault' });
      this.post({ t: 'stopped' });
    }
  }

  /** §5.2 item 1: the lease, the shop from the database, repaired, then the empty time caught up. */
  private async wake(): Promise<{ room: Room; pausers: string[] } | ClosingReason> {
    const take = await this.store.shopTake(this.club, this.holder, LEASE_SECONDS);
    if (!take.ok) return take.reason === 'missing' ? 'gone' : 'updating';
    this.leaseOkAt = this.clock.now();
    const row = await this.store.shopGet(this.club);
    if (!row) {
      await this.release();
      return 'gone';
    }
    // PERSIST-014: a shop saved by a newer build is never loaded past or written over; it waits for the newer server
    if (row.meta.schema_version > SCHEMA_VERSION) {
      await this.release();
      return 'updating';
    }
    let state: GameState;
    try {
      state = decodeRecord(unpackBody(row), 'The shared shop').state;
    } catch (e) {
      await this.release();
      if (e instanceof SaveError && e.code === 'too_new') return 'updating';
      this.log(`the stored shop can't be read: ${e instanceof Error ? e.message : String(e)}`);
      return 'fault';
    }
    this.revision = row.meta.revision;
    this.savedAt = row.meta.saved_at;
    const room = this.makeRoom(state, row.meta.pausers);
    // the time since it emptied, or since its last save after a crash (none under 5 minutes, or while paused)
    const since = row.meta.left_at ?? row.meta.saved_at;
    const summary = room.catchUp(Math.max(0, this.clock.wall() - since));
    this.leftAt = null;
    if (summary) this.log(`caught up ${summary.hours.toFixed(2)} game hours`);
    this.start();
    return { room, pausers: row.meta.pausers };
  }

  /** The owner's new shop (ADR-0045 decision 5): a new game with no guide, stored, then its lease. */
  private async create(m: Extract<OpenMode, { mode: 'create' }>): Promise<{ room: Room; pausers: string[] } | ClosingReason> {
    if (!(STARTER_IDS as readonly string[]).includes(m.starter)) return 'fault';
    const state = newGame({ starterId: m.starter as StarterId, starterName: m.starterName, shopName: m.name, seed: m.seed });
    tutorialSkip(state); // the guide teaches one player; in a shared shop it would pop up for everyone
    state.saveId = `shared_${this.club}`; // never a local slot's
    const enc = this.encode(state, this.clock.wall());
    const made = await this.store.shopCreate(this.club, m.user, { shopName: m.name, schemaVersion: enc.schemaVersion, build: this.build, savedAt: enc.savedAt, hour: enc.hour, day: enc.day, money: enc.money, encoding: enc.encoding, body: enc.body });
    if (!made.ok) return this.wake(); // made a moment ago by another tab: join that one
    const take = await this.store.shopTake(this.club, this.holder, LEASE_SECONDS);
    if (!take.ok) return 'updating';
    this.leaseOkAt = this.clock.now();
    this.revision = made.revision;
    this.savedAt = enc.savedAt;
    const room = this.makeRoom(state, []);
    this.start();
    return { room, pausers: [] };
  }

  private makeRoom(state: GameState, pausers: string[]): Room {
    const room = new Room(
      state,
      {
        send: (o) => this.post({ t: 'out', ...o }),
        gzip: (s) => gzipSync(s),
        later: (ms, fn) => this.timers.after(ms, fn),
        now: () => this.clock.now(),
        wall: () => this.clock.wall(),
        log: (line) => this.log(line),
        photoPut: (hash, mime, data) => void this.storePhoto(hash, mime, data),
        photoGet: (hash, reply) => void this.fetchPhoto(hash, reply),
        grant: (list) => void this.grant(list),
        emptied: () => {
          this.leftAt = this.clock.wall();
          void this.save();
        },
        returned: (away) => {
          this.leftAt = null;
          room.catchUp(away);
        },
        drop: (user) => this.post({ t: 'drop', user }),
        fault: () => void this.stop('fault'),
      },
      { club: this.club, pausers },
    );
    this.room = room;
    this.savedN = room.n;
    return room;
  }

  private start(): void {
    this.stopTick = this.timers.every(TICK_MS, () => this.tick());
    this.stopLease = this.timers.every(LEASE_RENEW_MS, () => void this.renew());
  }

  private tick(): void {
    const room = this.room;
    if (!room || this.stopping) return;
    try {
      room.tick();
    } catch (e) {
      this.log(`tick failed: ${e instanceof Error ? e.message : String(e)}`);
      void this.stop('fault');
      return;
    }
    if (room.running && this.clock.wall() - this.savedAt >= SAVE_EVERY_MS && !this.saving) void this.save();
  }

  /** §6.2: renewed on its own timer; a lease another server took closes the room (`restart`, nothing saved). */
  private async renew(): Promise<void> {
    if (this.stopping) return;
    try {
      const r = await this.store.shopTake(this.club, this.holder, LEASE_SECONDS);
      if (r.ok) this.leaseOkAt = this.clock.now();
      else {
        this.log(`lease lost (${r.reason})`);
        void this.stop('restart', undefined, { save: false });
      }
    } catch (e) {
      this.log(`lease renewal failed: ${e instanceof Error ? e.message : String(e)}`);
      if (this.clock.now() - this.leaseOkAt > LEASE_SECONDS * 1000) void this.stop('restart', undefined, { save: false });
    }
  }

  private encode(state: GameState, savedAt: number) {
    const { text, header } = encodeRecord(state, 'shared', savedAt);
    const body = gzipSync(text).toString('base64');
    return {
      encoding: 'gzip-base64' as const,
      body,
      savedAt,
      schemaVersion: header.schemaVersion,
      hour: header.meta.hour ?? state.clock.hour,
      day: header.meta.day,
      money: header.meta.money,
      shopName: header.meta.shopName,
    };
  }

  /** §5.2 item 4: the live copy as it is (no flush), one save at a time. */
  save(): Promise<void> {
    if (this.saving) return this.saving.then(() => this.save());
    const room = this.room;
    if (!room) return Promise.resolve();
    this.saving = (async () => {
      try {
        room.ensureExact();
        const savedAt = this.clock.wall();
        const n = room.n;
        const enc = this.encode(room.state, savedAt);
        const save: ShopSave = { club: this.club, holder: this.holder, expected: this.revision, shopName: enc.shopName || room.state.shopName || 'Shared shop', schemaVersion: enc.schemaVersion, build: this.build, savedAt, leftAt: this.leftAt, hour: enc.hour, day: enc.day, money: enc.money, encoding: enc.encoding, body: enc.body };
        const leftAt = this.leftAt;
        const r = await this.store.shopPut(save);
        if (r.ok) {
          this.revision = r.revision;
          this.savedAt = savedAt;
          this.savedN = n;
          this.savedLeftAt = leftAt;
          if (++this.saves % PRUNE_EVERY_SAVES === 0) void this.prune(savedAt);
          await this.retryPhotos();
          return;
        }
        this.log(`save refused (${r.reason})`);
        // another server holds the shop now, or wrote it: this copy stops without saving (§6.2)
        if (!this.stopping) void this.stop(r.reason === 'too_new' ? 'updating' : 'restart', undefined, { save: false });
      } catch (e) {
        this.log(`save failed: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        this.saving = null;
      }
    })();
    return this.saving;
  }

  private async storePhoto(hash: string, mime: string, data: string): Promise<void> {
    this.unstored.set(hash, { mime, data });
    try {
      await this.store.photoPut(this.club, hash, mime, data);
      this.unstored.delete(hash);
    } catch (e) {
      this.log(`photo not stored yet: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async retryPhotos(): Promise<void> {
    for (const [hash, p] of [...this.unstored]) await this.storePhoto(hash, p.mime, p.data);
  }

  private async fetchPhoto(hash: string, reply: (p: { mime: string; bytes: Uint8Array } | null) => void): Promise<void> {
    try {
      const mem = this.unstored.get(hash);
      const p = mem ?? (await this.store.photoGet(this.club, hash));
      reply(p ? { mime: p.mime, bytes: new Uint8Array(Buffer.from(p.data, 'base64')) } : null);
    } catch {
      reply(null);
    }
  }

  /**
   * §4.4's prune: stored photos no listing in the saved copy refers to, older than PRUNE_GRACE_MS before that save,
   * are deleted (pruned listings' photos, and photos of listings that never came to be).
   */
  private async prune(savedAt: number): Promise<void> {
    const room = this.room;
    if (!room) return;
    try {
      const refs = room.photoRefs();
      const stored = await this.store.photoHashes(this.club);
      const old = stored.filter((p) => !refs.has(p.hash) && p.at < savedAt - PRUNE_GRACE_MS && !this.unstored.has(p.hash)).map((p) => p.hash);
      if (old.length) await this.store.photosDelete(this.club, old.slice(0, 1000));
    } catch (e) {
      this.log(`prune failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async grant(list: string[]): Promise<void> {
    try {
      const kept = await this.store.setPausers(this.club, list);
      this.room?.setPausers(kept);
    } catch (e) {
      this.log(`grant failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async release(): Promise<void> {
    try {
      await this.store.shopRelease(this.club, this.holder);
    } catch {
      // it lapses in 90 seconds anyway
    }
  }

  /** Stop the timers at once, nothing saved (the tests' teardown). */
  dispose(): void {
    this.stopping = true;
    this.stopTick?.();
    this.stopLease?.();
  }

  /**
   * Save (unless the shop isn't this server's any more), close every member with `why` (none for `idle`), release
   * the lease and end. A fault's message says when the shop was last saved; a cap's when shops open again.
   */
  async stop(why: ClosingReason | 'idle', until?: string, opts: { save?: boolean } = {}): Promise<void> {
    if (this.stopping) return;
    this.stopping = true;
    this.stopTick?.();
    this.stopLease?.();
    const room = this.room;
    if (room && opts.save !== false && (room.n !== this.savedN || this.leftAt !== this.savedLeftAt)) await this.save();
    if (room && why !== 'idle') room.stop(why, why === 'cap' || why === 'hours' ? { until } : { savedAt: this.savedAt });
    if (opts.save !== false) await this.release();
    this.post({ t: 'stopped' });
  }
}
