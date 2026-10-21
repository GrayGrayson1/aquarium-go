// @vitest-environment node
/**
 * Chunk 13 (SHARED-SHOPS.md §3.3, §4.2, §5.3, §7; SHARE-005, SHARE-006, SHARE-013, SHARE-017): the game's own
 * connection (src/ui/shared/connection.ts) and shared dispatcher (src/ui/shared/dispatch.ts) against the real server
 * in this process (chunk 12's harness: the stub's accounts and storage, rooms in this thread, one fake clock). Two
 * members join one shop, their commands reach each other, each sender's `done` settles from its own step with the
 * result every copy computed, pause is refused and then granted, first one wins names the other member, and a later
 * welcome and snapshot replace the copy. The timers (hidden tabs, "Still here?", the waits, falling behind) are in
 * shared-connection.test.ts on a fake socket.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { gunzipSync } from 'node:zlib';
import type { CommandResult } from '@/sim/commands';
import type { SharedStep } from '@/sim/sharedStep';
import { useGame } from '@/state/game';
import { stateHash } from '@/persistence/hash';
import { StubWorld } from '../../server/stub';
import { SharedConnection, type ConnectionDeps, type ConnectionEvents, type SocketLike } from '@/ui/shared/connection';
import { SharedDispatcher } from '@/ui/shared/dispatch';
import { SHARED_WORDS } from '@/ui/shared/words';
import type { SharedMember } from '@/types/shared';
import { ORIGIN, pump, rig, shopText, type Rig } from './support/sharedServer';

const OWNER = 'stub:o:Owner:owner';
const ANN = 'stub:a:Ann';
const BEN = 'stub:b:Ben';
const CLUB = 'club_1';

let r: Rig | null = null;
const conns: SharedConnection[] = [];
afterEach(async () => {
  for (const c of conns.splice(0)) c.close();
  useGame.getState().setGame(null);
  await r?.stop();
  r = null;
});

async function shop(): Promise<Rig> {
  const world = new StubWorld();
  const x = await rig({ world });
  const t = x.time.wall();
  world.addClub(CLUB, null, { text: shopText({ savedAt: t }), savedAt: t, leftAt: null });
  r = x;
  return x;
}

interface Client {
  conn: SharedConnection;
  disp: SharedDispatcher;
  steps: { step: SharedStep; results: CommandResult[] }[];
  welcomes: number;
  members: SharedMember[];
  rejects: string[];
  closings: string[];
  notes: string[];
}

function deps(x: Rig, token: string): ConnectionDeps {
  return {
    base: `http://127.0.0.1:${x.port}`,
    club: CLUB,
    socket: (url) => {
      const Ws = WebSocket as unknown as new (u: string, init: unknown) => SocketLike;
      return new Ws(url, { headers: { origin: ORIGIN } });
    },
    health: async () => ({ closed: null, until: null }),
    token: async () => token,
    gunzip: async (b) => gunzipSync(Buffer.from(b)).toString('utf8'),
    canGunzip: true,
    wall: x.time.wall,
    now: x.time.now,
    after: (ms, fn) => {
      let live = true;
      x.time.after(ms, () => live && fn());
      return () => {
        live = false;
      };
    },
    hidden: () => false,
    idle: (fn) => fn(),
  };
}

async function join(x: Rig, token: string, extra: Partial<ConnectionEvents> = {}): Promise<Client> {
  const c: Client = { steps: [], welcomes: 0, members: [], rejects: [], closings: [], notes: [] } as unknown as Client;
  let conn!: SharedConnection;
  const disp = new SharedDispatcher({
    sender: () => conn,
    mayPause: () => c.members.find((m) => m.id === conn.you)?.pause ?? false,
    ownerName: () => 'Owner',
    note: (t) => c.notes.push(t),
    now: x.time.now,
    after: (ms, fn) => {
      let live = true;
      x.time.after(ms, () => live && fn());
      return () => {
        live = false;
      };
    },
  });
  conn = new SharedConnection(deps(x, token), {
    welcome: (w) => {
      c.welcomes++;
      c.members = w.members;
    },
    step: (step, results) => {
      c.steps.push({ step, results });
      c.disp.settleStep(step, results);
    },
    reject: (id, why) => {
      c.rejects.push(why);
      c.disp.reject(id, why);
    },
    members: (m) => (c.members = m),
    closing: (m) => c.closings.push(m.why),
    dropped: () => c.disp.dropped(),
    ...extra,
  });
  conns.push(conn);
  c.conn = conn;
  c.disp = disp;
  await conn.start();
  await pump(x.time, () => c.welcomes > 0, { step: 50, what: `${token}'s welcome` });
  return c;
}

/** A food the shop has. */
const foodOf = (c: Client): string => Object.entries(c.conn.replica.state!.inventory.foods).find(([, n]) => n > 0)![0];

/** Send through the dispatcher (as the act helpers do) and wait for `done`. */
async function act(x: Rig, c: Client, cmd: Parameters<SharedDispatcher['dispatch']>[0]): Promise<CommandResult | null> {
  useGame.getState().setGame(c.conn.replica.state);
  let got: { r: CommandResult | null } | null = null;
  const ret = c.disp.dispatch(cmd, (res) => (got = { r: res }));
  expect(ret).toBeUndefined(); // a shared dispatcher never answers at once (§4.2)
  await pump(x.time, () => got !== null, { step: 50, what: `${cmd.k} to settle` });
  return got!.r;
}

describe('chunk 13: the connection against the server', () => {
  it('joins with the account id, loads the shop, and stays in step through the fingerprints', async () => {
    const x = await shop();
    const ann = await join(x, ANN);
    expect(ann.conn.you).toBe('u_a');
    // (a shop woken from storage keeps the id it was saved with: the client goes by the shared mode, not the id)
    expect(ann.conn.replica.state!.shopName).toBe('Club Shop');
    expect(ann.conn.replica.state!.progress.tutorial.done).toBe(true);
    let checks = 0;
    ann.conn.replica.onCheck = () => checks++;
    await pump(x.time, () => checks >= 2, { step: 250, timeout: 15_000, what: 'two fingerprints' });
    expect(ann.conn.replica.stats.mismatches).toBe(0);
  });

  it("a member's command reaches the other; the sender's done settles from its own step with the shared result", async () => {
    const x = await shop();
    const ann = await join(x, ANN);
    const ben = await join(x, BEN);
    const tank = ann.conn.replica.state!.tankOrder[0];
    const res = await act(x, ann, { k: 'feedTank', tank, food: foodOf(ann) });
    expect(res?.ok).toBe(true);
    await pump(x.time, () => ben.steps.some((s) => s.step.cmds?.some((c) => c.by === 'u_a')), { step: 50, what: 'the feed at Ben' });
    const seen = ben.steps.find((s) => s.step.cmds?.some((c) => c.by === 'u_a'))!;
    expect(seen.step.cmds![0].who).toBe('Ann');
    expect(seen.results[0].ok).toBe(true);
    // both copies are the same after the same steps
    await pump(x.time, () => ann.conn.replica.n === ben.conn.replica.n, { step: 50, what: 'the same step' });
    expect(stateHash(ann.conn.replica.state!)).toBe(stateHash(ben.conn.replica.state!));
  });

  it('pause is refused without permission (not even sent), and allowed once the owner grants it (§5.4)', async () => {
    const x = await shop();
    const owner = await join(x, OWNER);
    const ann = await join(x, ANN);
    const refused = await act(x, ann, { k: 'setSpeed', speed: 0 });
    expect(refused).toEqual({ ok: false, message: SHARED_WORDS.notAllowed('Owner') });
    // forced past the dispatcher's own check, the server refuses it too: `forbidden`, the same words
    const plain = ann.disp;
    ann.disp = new SharedDispatcher({ sender: () => ann.conn, mayPause: () => true, ownerName: () => 'Owner', note: () => {}, now: x.time.now, after: () => () => {} });
    const forced = await act(x, ann, { k: 'setSpeed', speed: 0 });
    ann.disp = plain;
    expect(ann.rejects).toContain('forbidden');
    expect(forced).toEqual({ ok: false, message: SHARED_WORDS.notAllowed('Owner') });
    // the owner grants it; Ann's members list says so, and her pause goes through
    owner.conn.grant('u_a', true);
    await pump(x.time, () => !!ann.members.find((m) => m.id === 'u_a')?.pause, { step: 100, what: 'the grant' });
    const paused = await act(x, ann, { k: 'setSpeed', speed: 0 });
    expect(paused?.ok).toBe(true);
    await pump(x.time, () => owner.conn.replica.state!.clock.speed === 0, { step: 50, what: 'the pause at the owner' });
  });

  it('a guide flag the shop already has settles at once and is never sent (§4.3)', async () => {
    const x = await shop();
    const ann = await join(x, ANN);
    const flags = ann.conn.replica.state!.progress.tutorial.flags;
    const have = Object.keys(flags)[0] ?? null;
    const name = have ?? 'opened_market';
    if (!have) {
      const first = await act(x, ann, { k: 'raiseFlag', name });
      expect(first?.ok).toBe(true);
      await pump(x.time, () => Object.hasOwn(ann.conn.replica.state!.progress.tutorial.flags, name), { step: 50, what: 'the flag' });
    }
    const before = ann.steps.length;
    useGame.getState().setGame(ann.conn.replica.state);
    let got: CommandResult | null | undefined;
    ann.disp.dispatch({ k: 'raiseFlag', name }, (res) => (got = res));
    expect(got).toEqual({ ok: true, message: '', noResult: true });
    x.time.advance(500);
    expect(ann.steps.slice(before).some((s) => s.step.cmds?.some((c) => c.c.k === 'raiseFlag'))).toBe(false);
  });

  it('first one wins: the second seller is refused, naming the first, and a setting notes who changed it (§4.3)', async () => {
    const x = await shop();
    const ann = await join(x, ANN);
    const ben = await join(x, BEN);
    const g = ann.conn.replica.state!;
    const fish = Object.values(g.creatures).find((c) => c.status === 'alive' && !c.isStarter) ?? Object.values(g.creatures).find((c) => c.status === 'alive')!;
    // both send before either sees the other's step: the server applies Ann's first
    const got: Record<string, CommandResult | null> = {};
    useGame.getState().setGame(ann.conn.replica.state);
    ann.disp.dispatch({ k: 'quickSell', creatures: [fish.id] }, (res) => (got.ann = res));
    useGame.getState().setGame(ben.conn.replica.state);
    ben.disp.dispatch({ k: 'quickSell', creatures: [fish.id] }, (res) => (got.ben = res));
    await pump(x.time, () => 'ann' in got && 'ben' in got, { step: 50, what: 'both sales to settle' });
    expect(got.ann?.ok, got.ann?.message).toBe(true);
    expect(got.ben).toMatchObject({ ok: false, message: 'Ann already sold that fish.', conflict: { by: 'u_a', name: 'Ann' } });
    // a setting is last-writer-wins, with a note on the later sender's screen
    const tank = g.tankOrder[0];
    expect((await act(x, ann, { k: 'renameTank', tank, name: 'Ann’s tank' }))?.ok).toBe(true);
    expect((await act(x, ben, { k: 'renameTank', tank, name: 'Ben’s tank' }))?.ok).toBe(true);
    expect(ben.notes).toEqual([SHARED_WORDS.changedThat('Ann')]);
    expect(ann.notes).toEqual([]);
  });

  it('a later welcome and snapshot replace the copy, and a command in flight across the drop settles as not applied', async () => {
    const x = await shop();
    const ann = await join(x, ANN);
    useGame.getState().setGame(ann.conn.replica.state);
    let got: CommandResult | null | undefined;
    // drop the connection the moment the command is sent: no step settles it
    const tank = ann.conn.replica.state!.tankOrder[0];
    ann.disp.dispatch({ k: 'feedTank', tank, food: foodOf(ann) }, (res) => (got = res));
    (ann.conn as unknown as { ws: SocketLike | null }).ws?.close();
    await pump(x.time, () => got !== undefined, { step: 50, what: 'the lost command to settle' });
    expect(got).toBeNull();
    await pump(x.time, () => ann.welcomes >= 2, { step: 250, timeout: 15_000, what: 'the reconnect' });
    expect(ann.conn.open).toBe(true);
  });
});
