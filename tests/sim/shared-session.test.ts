// @vitest-environment node
/**
 * Chunk 13 (SHARED-SHOPS.md §5.7, §7.2, §7.3; SHARE-010, SHARE-011; the review's B3, B5 and notes 4 to 7): a visit as
 * the session runs it, with the connection replaced by a fake that the test drives (the real one is
 * shared-connection.test.ts and shared-client.test.ts). Before anything wakes the server, a signed-out player and
 * shops closed for the month are told so; opening saves your own aquarium first; a command's follow-up reads the store
 * after the copy holding its result is published; leaving takes the shop off the store before the shared mode goes,
 * loads the save that waited (wherever it is), once even when two leaves overlap; and opening from the title leaves a
 * waiting save's record alone.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { GameState } from '@/types';
import type { CommandResult } from '@/sim/commands';
import { newGame } from '@/sim/newGame';
import { tutorialSkip } from '@/sim/facility';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { inSharedShop, useSharedMode } from '@/state/sharedMode';
import { createMemoryBackend, listSaves, markSharedAway, readSharedAway, saveGame, setStorageBackend, setSyncStore } from '@/persistence';
import { provideSocialService, type SharedShops, type SocialService } from '@/social';
import type { ConnectionDeps, ConnectionEvents, Welcome } from '@/ui/shared/connection';
import { useShared } from '@/ui/shared/store';
import { leaveSharedShop, openSharedShop } from '@/ui/shared/session';
import { forgetSharedShops } from '@/ui/shared/shopsCache';

interface Fake {
  deps: ConnectionDeps;
  events: ConnectionEvents;
  replica: { state: GameState | null; n: number };
  you: string;
  open: boolean;
  started: boolean;
  closed: boolean;
  sent: { id: number; c: unknown }[];
}
const fakes = vi.hoisted(() => ({ conns: [] as unknown[] }));
vi.mock('@/ui/shared/connection', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/ui/shared/connection')>();
  class FakeConnection {
    replica = { state: null as GameState | null, n: 0 };
    you = 'u_a';
    open = true;
    started = false;
    closed = false;
    sent: { id: number; c: unknown }[] = [];
    constructor(
      public deps: ConnectionDeps,
      public events: ConnectionEvents,
    ) {
      fakes.conns.push(this);
    }
    async start() {
      this.started = true;
    }
    close() {
      this.closed = true;
    }
    send(c: unknown) {
      const id = this.sent.length + 1;
      this.sent.push({ id, c });
      return id;
    }
    view() {}
    grant() {}
    photo() {}
    noteInput() {}
    visibility() {}
    quiet() {}
  }
  return { ...real, SharedConnection: FakeConnection };
});

function memory(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

const service = (o: { token?: string | null; shops?: Partial<SharedShops> } = {}) =>
  ({
    accessToken: async () => (o.token === undefined ? 'stub:a:Ann' : o.token),
    sharedShops: async () => ({ shops: [], closed: null, reopens: null, ...o.shops }),
  }) as unknown as SocialService;

const conn = (): Fake => fakes.conns.at(-1) as Fake;
const CLUB = { id: 'club_1', name: 'CalliClub' };

function shopState(): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Blue', shopName: 'Club Shop', seed: 8 });
  tutorialSkip(g);
  g.saveId = 'save_from_storage'; // a woken shop keeps the id it was saved with
  return g;
}

const welcome = (): Welcome => ({ t: 'welcome', you: { id: 'u_a', name: 'Ann', owner: false, pause: false }, shop: { club: CLUB.id, name: 'Club Shop', owner: 'Olive' }, members: [], n: 3, full: [] });

/** The fake connection's welcome and snapshot: the replica holds the shop. */
function arrive(f: Fake): GameState {
  f.replica.state = shopState();
  f.replica.n = 3;
  f.events.welcome?.(welcome(), true);
  f.events.phase?.('open');
  return f.replica.state;
}

async function ownGame(): Promise<GameState> {
  const g = newGame({ starterId: 'axolotl', starterName: 'Pip', seed: 3 });
  g.clock.speed = 1;
  useGame.getState().setGame(g);
  useUI.getState().set({ screen: 'game' });
  return g;
}

beforeEach(() => {
  fakes.conns.length = 0;
  setStorageBackend(createMemoryBackend());
  setSyncStore(memory());
  (globalThis as { localStorage?: unknown }).localStorage = memory();
  forgetSharedShops();
  useUI.setState({ toasts: [] });
});

afterEach(async () => {
  await leaveSharedShop();
  provideSocialService(null);
  setSyncStore(undefined);
  delete (globalThis as { localStorage?: unknown }).localStorage;
  useGame.getState().setGame(null);
  useShared.setState({ closing: null, phase: 'idle' });
});

describe('chunk 13: before anything wakes the server (the review’s B5, §5.7)', () => {
  it('signed out: the sign-in line, no connection, and your own aquarium stays as it was', async () => {
    provideSocialService(service({ token: null }));
    const g = await ownGame();
    await openSharedShop(CLUB, { from: 'title' });
    expect(fakes.conns).toHaveLength(0);
    expect(useShared.getState().closing).toEqual({ why: 'signedOut' });
    expect(inSharedShop()).toBe(false);
    expect(useGame.getState().game).toBe(g);
  });

  it('shops closed for the month: the cap line with its day, no connection', async () => {
    provideSocialService(service({ shops: { closed: 'cap', reopens: '2026-11-01' } }));
    await ownGame();
    await openSharedShop(CLUB, { from: 'game' });
    expect(fakes.conns).toHaveLength(0);
    expect(useShared.getState().closing).toEqual({ why: 'cap', until: '2026-11-01' });
  });
});

describe('chunk 13: a visit', () => {
  it('opening saves your own aquarium first, records it, and turns the shared mode on; the shop shows on welcome', async () => {
    provideSocialService(service());
    const own = await ownGame();
    await openSharedShop(CLUB, { from: 'game' });
    expect(conn().started).toBe(true);
    expect(inSharedShop()).toBe(true);
    expect(readSharedAway()).toMatchObject({ club: CLUB.id, saveId: own.saveId, from: 'game' });
    expect((await listSaves()).some((m) => m.saveId === own.saveId)).toBe(true);
    const shop = arrive(conn());
    const shown = useGame.getState().game!;
    expect(shown.shopName).toBe('Club Shop');
    expect(shown).not.toBe(shop); // the store's copy never aliases the replica's
    expect(useShared.getState().ownerName).toBe('Olive');
    expect(useUI.getState().screen).toBe('game');
  });

  it('the review’s B3: a follow-up reads the store after the copy holding its result is published', async () => {
    provideSocialService(service());
    await ownGame();
    await openSharedShop(CLUB, { from: 'game' });
    const f = conn();
    const shop = arrive(f);
    const tank = shop.tankOrder[0];
    let seen: { res: CommandResult | null; name: string | undefined } | null = null;
    useGame.getState().dispatch({ k: 'renameTank', tank, name: 'Renamed' }, (res) => (seen = { res, name: useGame.getState().game!.tanks[tank].name }));
    expect(f.sent).toHaveLength(1);
    // the step arrives: the replica applies it, then the batch is published
    shop.tanks[tank].name = 'Renamed';
    const step = { n: 4, h: 0, cmds: [{ by: 'u_a', who: 'Ann', id: f.sent[0].id, c: f.sent[0].c as never }] };
    f.events.step?.(step, [{ ok: true, message: 'Renamed.' }]);
    expect(seen).toBeNull(); // not before the copy is on screen
    f.events.applied?.();
    expect(seen).toEqual({ res: { ok: true, message: 'Renamed.' }, name: 'Renamed' });
  });

  it('leaving takes the shop off the store before the mode goes, then loads the save that waited, with no catch-up', async () => {
    provideSocialService(service());
    const own = await ownGame();
    await openSharedShop(CLUB, { from: 'game' });
    arrive(conn());
    const order: string[] = [];
    const offMode = useSharedMode.subscribe((s) => order.push(`mode:${s.club}:${useGame.getState().game?.saveId ?? 'none'}`));
    await leaveSharedShop();
    offMode();
    expect(order[0]).toBe('mode:null:none'); // the shop was gone from the store when the mode went off
    expect(useGame.getState().game?.saveId).toBe(own.saveId);
    expect(useGame.getState().game?.clock.hour).toBe(own.clock.hour);
    expect(readSharedAway()).toBeNull();
    expect(conn().closed).toBe(true);
  });

  it('the save that waited loads from wherever it is, even when another aquarium took the autosave slot', async () => {
    provideSocialService(service());
    const own = await ownGame();
    await openSharedShop(CLUB, { from: 'game' });
    arrive(conn());
    // another tab: own game also kept in slot 2, and the autosave now holds a different aquarium
    await saveGame({ ...own }, 'slot2');
    await saveGame(newGame({ starterId: 'betta', starterName: 'Other', seed: 99 }), 'auto');
    await leaveSharedShop();
    expect(useGame.getState().game?.saveId).toBe(own.saveId);
  });

  it('two leaves at once leave once; a later one does nothing', async () => {
    provideSocialService(service());
    const own = await ownGame();
    await openSharedShop(CLUB, { from: 'game' });
    arrive(conn());
    const a = leaveSharedShop({ closing: { why: 'full' } });
    const b = leaveSharedShop();
    expect(b).toBe(a);
    await a;
    expect(useGame.getState().game?.saveId).toBe(own.saveId);
    useUI.getState().set({ screen: 'game' });
    await leaveSharedShop(); // the error boundary's Back left on screen after the closing
    expect(useUI.getState().screen).toBe('game');
    expect(useGame.getState().game?.saveId).toBe(own.saveId);
  });

  it("opening from the title leaves a waiting save's record alone (a browser closed inside a shop earlier)", async () => {
    provideSocialService(service());
    markSharedAway('club_old', 'save_waiting', 'game', 1000);
    useGame.getState().setGame(null);
    useUI.getState().set({ screen: 'title' });
    await openSharedShop(CLUB, { from: 'title' });
    arrive(conn());
    await leaveSharedShop();
    expect(readSharedAway()).toMatchObject({ saveId: 'save_waiting', enteredAt: 1000, heartbeat: 1000 });
    expect(useUI.getState().screen).toBe('title');
    expect(useGame.getState().game).toBeNull();
  });
});
