// @vitest-environment node
/**
 * Chunk 13 (SHARED-SHOPS.md §7.2, §7.3; SHARE-010, SHARE-011): your own aquarium waits while you're in a shared shop,
 * and nothing saves a shared shop on the device or online.
 *
 * - Resuming the waiting save leaves out the time spent in the shop: no catch-up for it, also after the browser closed
 *   inside the shop (then only the time since the last heartbeat counts as away); another save's resume is untouched.
 * - With a shared shop open, every save path refuses before anything else (the flush before a save included): the
 *   session's saves, autosave, Save, Load, Import, Export, and the leaderboard's numbers; a shared shop's own id is
 *   never written to a slot by anyone; the game loop and the hidden-tab catch-up never move it.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { useGame } from '@/state/game';
import { useUI } from '@/state/ui';
import { setSharedMode } from '@/state/sharedMode';
import {
  catchUpAfterHidden,
  createMemoryBackend,
  loadAndResume,
  markSharedAway,
  readSharedAway,
  saveCurrentGame,
  saveCurrentGameSync,
  saveGame,
  saveGameSync,
  setStorageBackend,
  setSyncStore,
  sharedAwayHeartbeat,
  takeSharedAwayMs,
  SHARED_SAVE_REFUSED,
} from '@/persistence';
import { autosaveAllowed, autosaveNow } from '@/game/useAutosave';
import { runTick } from '@/game/GameLoop';
import { exportCurrent, importFile, loadIntoGame, saveNow } from '@/ui/common/saves';
import { currentStanding } from '@/social';
import '@/ui/panels/social/socialStore'; // the standing source

const MIN = 60_000;
const HOUR = 60 * MIN;

function memoryStore(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

beforeEach(() => {
  setStorageBackend(createMemoryBackend());
  setSyncStore(memoryStore());
  setSharedMode(null);
  useGame.getState().setGame(null);
  useUI.getState().set({ screen: 'game', toasts: [] });
});

afterEach(() => {
  setSharedMode(null);
  setSyncStore(undefined);
  useGame.getState().setGame(null);
});

async function savedGame(): Promise<GameState> {
  const g = newGame({ starterId: 'betta', starterName: 'Waits', seed: 31 });
  g.clock.speed = 1;
  g.lastTickRealMs = 1_000_000_000_000;
  g.lastSavedRealMs = g.lastTickRealMs;
  expect((await saveGame(g, 'auto')).ok).toBe(true);
  return g;
}

describe('chunk 13: your own aquarium waits (SHARE-010)', () => {
  it('back from the shop after three hours: nothing caught up for the time away', async () => {
    const g = await savedGame();
    const t0 = g.lastTickRealMs;
    markSharedAway('club_1', g.saveId, 'game', t0);
    sharedAwayHeartbeat(t0 + 3 * HOUR);
    const r = await loadAndResume('auto', { now: t0 + 3 * HOUR });
    expect(r.ok).toBe(true);
    expect(r.summary?.hours ?? 0).toBe(0);
    expect(r.state!.clock.hour).toBe(g.clock.hour);
    expect(readSharedAway()).toBeNull(); // used up
  });

  it('the browser closed inside the shop: only the time since the last heartbeat is time away', async () => {
    const g = await savedGame();
    const t0 = g.lastTickRealMs;
    // without the record, 10 h 40 min away catches up the full 12 game hours
    const plain = await loadAndResume('auto', { now: t0 + 10 * HOUR + 40 * MIN, apply: false });
    expect(plain.summary!.hours).toBeGreaterThan(11);
    markSharedAway('club_1', g.saveId, 'game', t0);
    sharedAwayHeartbeat(t0 + 10 * HOUR); // the shop was open for 10 hours, then the browser closed
    const r = await loadAndResume('auto', { now: t0 + 10 * HOUR + 40 * MIN, apply: false });
    // 40 real minutes at 1× (6 game hours a minute, capped at 12): the cap still applies, so compare a short spell
    expect(r.summary!.hours).toBeGreaterThan(0);
    const g2 = await savedGame();
    markSharedAway('club_1', g2.saveId, 'game', t0);
    sharedAwayHeartbeat(t0 + 10 * HOUR);
    const short = await loadAndResume('auto', { now: t0 + 10 * HOUR + 1 * MIN, apply: false });
    expect(short.summary?.hours ?? 0).toBeLessThanOrEqual(6.01);
    expect(short.summary?.hours ?? 0).toBeLessThan(plain.summary!.hours);
  });

  it("another save's resume leaves the record alone", async () => {
    markSharedAway('club_1', 'save_other', 'game', 1000);
    expect(takeSharedAwayMs('save_mine')).toBe(0);
    expect(readSharedAway()?.saveId).toBe('save_other');
    sharedAwayHeartbeat(5000);
    expect(takeSharedAwayMs('save_other')).toBe(4000);
    expect(readSharedAway()).toBeNull();
  });
});

describe('chunk 13: nothing saves a shared shop on the device (SHARE-011)', () => {
  it('with a shared shop open, the session saves refuse before the flush', async () => {
    const g = await savedGame();
    useGame.getState().setGame(g);
    setSharedMode('club_1');
    const before = useGame.getState().game!.lastTickRealMs;
    const r = await saveCurrentGame('auto', { flush: true });
    expect(r).toMatchObject({ ok: false, message: SHARED_SAVE_REFUSED });
    expect(saveCurrentGameSync('auto')).toBe(false);
    expect(useGame.getState().game!.lastTickRealMs).toBe(before); // the flush never ran
    expect(SHARED_SAVE_REFUSED).toBe('The shared shop saves itself on the server.');
  });

  it("a shared shop's own id is never written to a slot, whoever asks", async () => {
    const g = newGame({ starterId: 'betta', starterName: 'Shop', seed: 2 });
    g.saveId = 'shared_club_1';
    expect(await saveGame(g, 'slot1')).toMatchObject({ ok: false, message: SHARED_SAVE_REFUSED });
    expect(saveGameSync(g, 'auto')).toBe(false);
    // and the session refuses it even before the mode is set (a save that lands while the player leaves)
    useGame.getState().setGame(g);
    expect((await saveCurrentGame('auto')).ok).toBe(false);
  });

  it('autosave, Save, Load, Import and Export refuse, and say why', async () => {
    const g = await savedGame();
    useGame.getState().setGame(g);
    setSharedMode('club_1');
    expect(autosaveAllowed()).toBe(false);
    expect(autosaveAllowed({ evenIfOff: true })).toBe(false);
    expect(await autosaveNow('interval')).toBe(false);
    expect(await saveNow('slot1', true)).toBe(false);
    expect(await loadIntoGame('auto')).toBeNull();
    expect(exportCurrent()).toBe(false);
    const file = { text: async () => '{}', name: 'x.json', size: 2 } as unknown as File;
    expect(await importFile(file, 'slot3')).toEqual({ ok: false, error: SHARED_SAVE_REFUSED });
    const toasts = useUI.getState().toasts.map((t) => t.text);
    expect(toasts.filter((t) => t === SHARED_SAVE_REFUSED).length).toBeGreaterThanOrEqual(3);
    // the game on screen is still the one that was there (Load replaced nothing)
    expect(useGame.getState().game).toBe(g);
  });

  it('a shared shop is not on the leaderboards: no numbers to report', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Shop', seed: 2 });
    useGame.getState().setGame(g);
    expect(currentStanding()).not.toBeNull();
    setSharedMode('club_1');
    expect(currentStanding()).toBeNull();
  });

  it('the game loop and the hidden-tab catch-up never move a shared shop', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Shop', seed: 2 });
    g.clock.speed = 10;
    g.lastTickRealMs = Date.now() - 2 * HOUR;
    useGame.getState().setGame(g);
    setSharedMode('club_1');
    const hour = g.clock.hour;
    expect(runTick(1)).toBe(0);
    expect(catchUpAfterHidden(2 * HOUR)).toBeNull();
    expect(useGame.getState().game!.clock.hour).toBe(hour);
    setSharedMode(null);
    runTick(1);
    expect(useGame.getState().game!.clock.hour).toBeGreaterThan(hour);
  });
});
