// @vitest-environment node
/**
 * Chunk 10 (SHARED-SHOPS.md §3, §9.1 "Lockstep in one process"): the prototype server's room and browsers' replicas
 * in one process. Every member applies the room's steps through the same step block and every fingerprint matches,
 * with interface-style reads between steps on one copy, members joining from mid-run snapshots and leaving, commands
 * from several members, and pauses; a copy changed by hand is caught at the next fingerprint and re-synced; a command
 * whose block throws is refused to its sender only. The cross-engine version (Chromium, WebKit) is
 * tests/e2e/shared-lockstep.spec.ts.
 */
import { describe, it, expect } from 'vitest';
import { gzipSync, gunzipSync } from 'node:zlib';
import type { GameState } from '@/types';
import type { ServerMessage } from '@/types/shared';
import { FIXTURES } from '@/dev/fixtures';
import { encodeRecord, decodeRecord } from '@/persistence/serialize';
import { stateHash } from '@/persistence/hash';
import { deepClone } from '@/sim/clone';
import { evaluateTank, previewAddition } from '@/sim/compat';
import { stateReachability } from '@/sim/facility/layout';
import { beautyScore } from '@/sim/aquascape';
import { SharedReplica } from '@/game/sharedLoop';
import { Room, type Outgoing } from '../../server/room';
import { stepLog } from '../../server/replay';

const shop = (name: string): GameState => decodeRecord(encodeRecord(FIXTURES[name](), 'shared', 0).text).state;

interface Peer {
  replica: SharedReplica;
  welcome: Extract<ServerMessage, { t: 'welcome' }> | null;
  got: Outgoing[];
  mismatches: number;
  checks: number;
}

/** A room and its members' replicas, with the frames delivered at once (fingerprints checked at once too). */
function harness(state: GameState) {
  const frames: Outgoing[] = [];
  const later: (() => void)[] = [];
  const room = new Room(state, { send: (o) => frames.push(o), gzip: (s) => gzipSync(s), later: (_, fn) => void later.push(fn), now: () => performance.now() });
  const peers = new Map<string, Peer>();
  const deliver = () => {
    while (later.length) later.shift()!();
    while (frames.length) {
      const f = frames.shift()!;
      for (const to of f.to) {
        const p = peers.get(to);
        if (!p) continue;
        p.got.push(f);
        if (f.kind === 'welcome') p.welcome = JSON.parse(f.text!);
        else if (f.kind === 'snapshot') {
          const body = Buffer.from(f.bin!.subarray(1));
          const json = f.bin![0] === 1 ? gunzipSync(body).toString('utf8') : body.toString('utf8');
          p.replica.load(JSON.parse(json) as GameState, p.welcome!.n, p.welcome!.full);
        } else if (f.kind === 'steps') p.replica.apply((JSON.parse(f.text!) as Extract<ServerMessage, { t: 'steps' }>).s);
      }
    }
  };
  const join = (id: string, plain = false) => {
    const p: Peer = { replica: new SharedReplica((fn) => fn()), welcome: null, got: [], mismatches: 0, checks: 0 };
    p.replica.onCheck = (_, ok) => {
      p.checks++;
      if (!ok) p.mismatches++;
    };
    p.replica.onOutOfStep = () => room.handle(id, { t: 'resync' });
    peers.set(id, p);
    room.join(id, id.toUpperCase(), plain);
    deliver();
    return p;
  };
  const leave = (id: string) => {
    room.leave(id);
    peers.delete(id);
    deliver();
  };
  const tick = (n = 1) => {
    for (let i = 0; i < n; i++) {
      room.tick();
      deliver();
    }
  };
  /** Send everything, then every replica must equal the room's copy. */
  const settle = () => {
    room.flush();
    deliver();
    const want = stateHash(room.state);
    for (const [id, p] of peers) {
      expect(p.replica.n, id).toBe(room.n);
      expect(stateHash(p.replica.state!), id).toBe(want);
    }
  };
  return { room, peers, join, leave, tick, settle, deliver };
}

/** What the interface reads between steps: compatibility (with hypothetical candidates), reachability, beauty. */
function interfaceReads(g: GameState): void {
  for (const id of g.tankOrder.slice(0, 6)) {
    evaluateTank(g, id);
    const sp = Object.values(g.creatures).find((c) => c.tankId === id)?.speciesId;
    if (sp) previewAddition(g, id, { speciesId: sp, count: 2 });
    beautyScore(g, g.tanks[id]);
  }
  stateReachability(g);
}

function food(g: GameState): string | undefined {
  return Object.keys(g.inventory.foods).find((f) => (g.inventory.foods[f] ?? 0) >= 1);
}

describe('chunk 10: lockstep in one process (SHARED-SHOPS.md §9.1)', () => {
  for (const [name, days] of [
    ['playthrough_betta', 7],
    ['big_facility', 2],
  ] as const) {
    it(`${name}, ${days} game days at 10×: every fingerprint matches, with reads, joins, leaves and commands`, () => {
      const h = harness(shop(name));
      const order = h.room.state.tankOrder;
      const a = h.join('a');
      const b = h.join('b', true);
      h.room.handle('a', { t: 'view', tank: order[0] });
      h.room.handle('b', { t: 'view', tank: order[1] ?? order[0] });
      h.room.handle('a', { t: 'cmd', id: 1, c: { k: 'setSpeed', speed: 10 } });
      const ticks = (days * 24) / 0.25;
      let c: Peer | null = null;
      for (let i = 1; i <= ticks; i++) {
        const f = food(h.room.state);
        if (i % 23 === 0 && f) h.room.handle('a', { t: 'cmd', id: i, c: { k: 'feedTank', tank: order[0], food: f } });
        if (i % 59 === 0) h.room.handle(h.peers.has('b') ? 'b' : 'a', { t: 'cmd', id: i, c: { k: 'waterChange', tank: order[1] ?? order[0], fraction: 0.05 } });
        if (i === Math.floor(ticks / 3)) c = h.join('c'); // a joiner from a mid-run snapshot
        if (i === Math.floor(ticks / 2)) h.leave('b');
        if (i === Math.floor((ticks * 2) / 3)) h.room.handle('c', { t: 'view', tank: order[2] ?? order[0] });
        h.tick();
        if (i % 3 === 0) interfaceReads(a.replica.state!); // only one copy reads; the others don't
      }
      h.settle();
      // a fingerprint every 40 ticks (10 real seconds); c joined a third of the way in
      expect(a.checks).toBe(Math.floor(ticks / 40));
      expect(c!.checks).toBe(Math.floor(ticks / 40) - Math.floor(Math.floor(ticks / 3) / 40));
      expect([a.mismatches, b.mismatches, c!.mismatches]).toEqual([0, 0, 0]);
      expect([a, c!].map((p) => p.replica.stalled)).toEqual([null, null]);
      expect(h.room.stats.rejected).toBe(0);
      expect(h.room.stats.snapshotRepairs).toBe(0);
    }, 120_000);
  }

  it('a copy changed by hand is caught at the next fingerprint and re-synced from a snapshot', () => {
    const h = harness(shop('playthrough_betta'));
    const a = h.join('a');
    h.room.handle('a', { t: 'cmd', id: 1, c: { k: 'setSpeed', speed: 10 } });
    h.tick(45); // past the first fingerprint
    expect(a.checks).toBe(1);
    a.replica.state!.finance.money += 1;
    h.tick(40);
    expect(a.mismatches).toBe(1);
    expect(a.got.filter((f) => f.kind === 'snapshot')).toHaveLength(2); // the join and the re-sync
    expect(a.replica.stalled).toBeNull();
    h.tick(80);
    expect(a.mismatches).toBe(1);
    expect(a.checks).toBeGreaterThanOrEqual(4);
    h.settle();
  });

  it('a command whose block throws is refused to its sender only and changes nothing', () => {
    const g = shop('playthrough_betta');
    const ghost = deepClone(g.tanks[g.tankOrder[0]]);
    ghost.id = 'ghost';
    (ghost as unknown as { water: null }).water = null; // not in tankOrder: only a command on it throws
    g.tanks.ghost = ghost;
    const h = harness(g);
    const a = h.join('a');
    const b = h.join('b');
    h.tick(4);
    const n = h.room.n;
    h.room.handle('a', { t: 'cmd', id: 7, c: { k: 'waterChange', tank: 'ghost', fraction: 0.2 } });
    h.deliver();
    expect(h.room.n).toBe(n);
    expect(a.got.filter((f) => f.kind === 'reject').map((f) => JSON.parse(f.text!))).toEqual([{ t: 'reject', id: 7, why: 'failed' }]);
    expect(b.got.filter((f) => f.kind === 'reject')).toEqual([]);
    h.room.handle('b', { t: 'cmd', id: 8, c: { k: 'feedTank', tank: 'ghost', food: 'nothing-here' } }); // refused by the rules: applied as usual
    h.room.handle('a', { t: 'cmd', id: 9, c: { k: 'teleport' } as never });
    h.deliver();
    expect(a.got.filter((f) => f.kind === 'reject').map((f) => JSON.parse(f.text!).why)).toEqual(['failed', 'malformed']);
    h.settle();
  });

  it('runs only while someone is there; commands still apply while it is paused', () => {
    const h = harness(shop('playthrough_betta'));
    h.join('a');
    h.join('b');
    h.room.handle('a', { t: 'cmd', id: 1, c: { k: 'setSpeed', speed: 10 } });
    h.tick(8);
    const hour = h.room.state.clock.hour;
    h.room.handle('a', { t: 'away' });
    h.tick(4);
    expect(h.room.state.clock.hour).toBeGreaterThan(hour); // b is still there
    h.room.handle('b', { t: 'away' });
    const paused = h.room.state.clock.hour;
    const n = h.room.n;
    h.tick(20);
    expect(h.room.state.clock.hour).toBe(paused);
    h.room.handle('b', { t: 'cmd', id: 2, c: { k: 'setSpeed', speed: 3 } }); // a command brings its sender back (§5.5)
    expect(h.room.n).toBe(n + 1);
    h.tick(4);
    expect(h.room.state.clock.hour).toBeGreaterThan(paused);
    h.settle();
  });

  it('the full-detail list: most viewers first, then tank order, at most 4, sent with the next step', () => {
    const h = harness(shop('big_facility'));
    const order = h.room.state.tankOrder;
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
    for (const id of ids) h.join(id);
    const views = [order[5], order[5], order[3], order[1], order[0], order[7]];
    ids.forEach((id, i) => h.room.handle(id, { t: 'view', tank: views[i] }));
    h.room.handle('a', { t: 'cmd', id: 1, c: { k: 'setSpeed', speed: 1 } });
    h.room.flush();
    h.deliver();
    const steps = h.peers.get('a')!.got.filter((f) => f.kind === 'steps').flatMap((f) => (JSON.parse(f.text!) as { s: { full?: string[] }[] }).s);
    expect(steps[0].full).toEqual([order[5], order[0], order[1], order[3]]);
    expect(h.room.full).toEqual([order[5], order[0], order[1], order[3]]);
    const g = h.join('g');
    expect(g.welcome!.full).toEqual(h.room.full);
    h.tick(8);
    h.settle();
  });

  it("the replay's step log replays to the same fingerprints", () => {
    const log = stepLog(shop('playthrough_axolotl'), { speed: 10, hours: 48 });
    expect(log.fingerprints).toBeGreaterThanOrEqual(4);
    const r = new SharedReplica((fn) => fn());
    let bad = 0;
    r.onCheck = (_, ok) => void (ok || bad++);
    r.load(JSON.parse(log.snapshot) as GameState, log.n, log.full);
    r.apply(log.steps);
    expect(r.stats.checks).toBe(log.fingerprints);
    expect(bad).toBe(0);
    expect(log.steps.some((s) => s.cmds?.length)).toBe(true);
  });
});
