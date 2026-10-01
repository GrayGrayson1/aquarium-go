// @vitest-environment node
/**
 * lane:fix-core — save-slot regressions from the audit:
 *   P5-01  the pagehide/hidden path writes synchronously into localStorage and the next boot picks it up
 *   P5-04 / S06-04  a stale tab's write is refused once another tab saved the same aquarium
 *   P5-03 / S06-03 / S06-07  a displaced aquarium survives in `<slot>.backup`, is listed and loadable
 *   P5-05  null entries in record arrays are dropped by repairState (the sim used to crash on them)
 *   P5-12  the starter's `cr_starter_<seed>` id no longer drives the id counter (save/load is transparent)
 *   S06-01  a hung storage write times out, demotes and the save still lands
 *   S06-08  a quota failure all the way to memory tells the truth
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { newGame, previewStarters } from '@/sim/newGame';
import { advanceWorld } from '@/sim/world';
import {
  saveGame,
  saveGameSync,
  loadGameDetailed,
  listSaves,
  deleteSave,
  latestSaveSlot,
  setStorageBackend,
  setSyncStore,
  createMemoryBackend,
  configureStorageDetection,
  resetSaveReconciliation,
  resetSaveSession,
  isStaleGame,
  storageStatus,
  slotLabel,
  repairState,
  decodeRecord,
  encodeRecord,
  stateHash,
  type KVBackend,
  type BackendName,
} from '@/persistence';
import type { GameState } from '@/types';

const SAVE = 'aquarium-go.save.auto';
const STAMP = 'aquarium-go.stamp.auto';

/** A Map posing as localStorage for the synchronous mirror. */
function fakeSync(map = new Map<string, string>()) {
  return {
    map,
    store: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    },
  };
}

const named = (name: BackendName, map = new Map<string, string>()): KVBackend => ({ ...createMemoryBackend(map), name });

const game = (name: string, seed: number, money = 300) => {
  const g = newGame({ starterId: 'betta', starterName: name, seed });
  g.shopName = name;
  g.finance.money = money;
  return g;
};

beforeEach(() => {
  resetSaveReconciliation();
  resetSaveSession();
  setSyncStore(null);
  setStorageBackend(createMemoryBackend());
});
afterEach(() => {
  setSyncStore(undefined);
  configureStorageDetection(null);
});

describe('P5-01: synchronous mirror for pagehide', () => {
  it('saveGameSync writes localStorage and the next boot loads it (and moves it into the main store)', async () => {
    const idbMap = new Map<string, string>();
    const lsMap = new Map<string, string>();
    const sync = fakeSync(lsMap);
    setSyncStore(sync.store);
    resetSaveReconciliation(['memory']);
    setStorageBackend(named('memory', idbMap), [], [named('localstorage', lsMap)]);
    const g = game('Mirror', 5, 4321);
    expect(saveGameSync(g, 'auto')).toBe(true);
    expect(lsMap.has(SAVE)).toBe(true);
    expect(idbMap.has(SAVE)).toBe(false);
    const r = await loadGameDetailed('auto');
    expect(r.ok).toBe(true);
    expect(r.state!.finance.money).toBe(4321);
    // reconciled into the active store, mirror tidied
    expect(idbMap.has(SAVE)).toBe(true);
    expect(lsMap.has(SAVE)).toBe(false);
  });

  it('a regular save that is at least as new removes this tab’s mirror', async () => {
    const lsMap = new Map<string, string>();
    setSyncStore(fakeSync(lsMap).store);
    const g = game('Mirror2', 6);
    expect(saveGameSync(g, 'auto')).toBe(true);
    expect(lsMap.has(SAVE)).toBe(true);
    await new Promise((r) => setTimeout(r, 2));
    expect((await saveGame(g, 'auto')).ok).toBe(true);
    expect(lsMap.has(SAVE)).toBe(false);
    expect(lsMap.has(STAMP)).toBe(true);
  });
});

describe('P5-04 / S06-04: a stale tab never overwrites a newer save of the same aquarium', () => {
  it('refuses the write when another tab saved during this session, and recovers after a reload of the slot', async () => {
    const lsMap = new Map<string, string>();
    setSyncStore(fakeSync(lsMap).store);
    const g = game('Two tabs', 7, 100);
    expect((await saveGame(g, 'auto')).ok).toBe(true);
    // "The other tab" writes the same aquarium a little later (a stamp with its own tab id, a newer record).
    await new Promise((r) => setTimeout(r, 3));
    const other = { ...g, finance: { ...g.finance, money: 6300 } } as GameState;
    const rec = encodeRecord(other, 'auto');
    const { storage } = await import('@/persistence');
    await storage.set(SAVE, rec.text);
    lsMap.set(STAMP, JSON.stringify({ savedAt: rec.header.savedAt, saveId: g.saveId, tab: 'other-tab' }));

    const res = await saveGame({ ...g, finance: { ...g.finance, money: 350 } } as GameState, 'auto');
    expect(res.ok).toBe(false);
    expect(res.code).toBe('stale');
    expect(isStaleGame(g.saveId)).toBe(true);
    const kept = await loadGameDetailed('auto');
    expect(kept.state!.finance.money).toBe(6300);
    // Loading the newest copy makes this tab current again.
    expect(isStaleGame(g.saveId)).toBe(false);
    expect((await saveGame(kept.state!, 'auto')).ok).toBe(true);
  });

  it('a different aquarium is never "stale" (New Game over an old autosave is fine)', async () => {
    const a = game('A', 8);
    expect((await saveGame(a, 'auto')).ok).toBe(true);
    const b = game('B', 9);
    expect((await saveGame(b, 'auto')).ok).toBe(true);
  });

  it('the sync path refuses too', async () => {
    const lsMap = new Map<string, string>();
    setSyncStore(fakeSync(lsMap).store);
    const g = game('Sync stale', 10);
    expect((await saveGame(g, 'auto')).ok).toBe(true);
    lsMap.set(STAMP, JSON.stringify({ savedAt: Date.now() + 5, saveId: g.saveId, tab: 'other-tab' }));
    expect(saveGameSync(g, 'auto')).toBe(false);
  });
});

describe('P5-03 / S06-03 / S06-07: a displaced aquarium survives as "Previous …"', () => {
  it('keeps the displaced game in the backup across the new game’s autosaves, lists and loads it', async () => {
    const a = game('Axolotl Abode', 11, 1286);
    expect((await saveGame(a, 'auto')).ok).toBe(true);
    expect((await saveGame(a, 'auto')).ok).toBe(true);
    // No previous entry while the same aquarium keeps saving.
    expect((await listSaves()).some((m) => m.previousOf)).toBe(false);

    const b = game('Betta Barn', 12, 300);
    expect((await saveGame(b, 'auto')).ok).toBe(true); // displaces A → backup
    for (let i = 0; i < 3; i++) expect((await saveGame(b, 'auto')).ok).toBe(true); // would have rotated A away

    const saves = await listSaves();
    const prev = saves.find((m) => m.previousOf === 'auto');
    expect(prev).toBeTruthy();
    expect(prev!.slot).toBe('auto.backup');
    expect(prev!.shopName).toBe('Axolotl Abode');
    expect(prev!.saveId).toBe(a.saveId);
    expect(slotLabel(prev!.slot)).toBe('Previous autosave');
    expect(await latestSaveSlot()).toBe('auto');

    const r = await loadGameDetailed('auto.backup');
    expect(r.ok).toBe(true);
    expect(r.state!.saveId).toBe(a.saveId);
    expect(r.restoredFromBackup).toBeUndefined();
    expect(r.meta?.previousOf).toBe('auto');

    // Playing A again displaces B the same way (symmetric), and deleting the previous copy removes only it.
    expect((await saveGame(r.state!, 'auto')).ok).toBe(true);
    expect((await listSaves()).find((m) => m.previousOf === 'auto')?.shopName).toBe('Betta Barn');
    await deleteSave('auto.backup');
    const after = await listSaves();
    expect(after.some((m) => m.previousOf)).toBe(false);
    expect(after.find((m) => m.slot === 'auto')?.shopName).toBe('Axolotl Abode');
  });

  it('a manual slot overwritten with another aquarium lists the old one as its previous copy', async () => {
    const a = game('Checkpoint', 13);
    const b = game('Other', 14);
    expect((await saveGame(a, 'slot1')).ok).toBe(true);
    expect((await saveGame(b, 'slot1')).ok).toBe(true);
    const prev = (await listSaves()).find((m) => m.previousOf === 'slot1');
    expect(prev?.shopName).toBe('Checkpoint');
    expect(slotLabel(prev!.slot)).toBe('Previous copy of Slot 1');
  });
});

describe('P5-05: null entries in record arrays', () => {
  const ARRAYS: ((s: GameState) => unknown[])[] = [
    (s) => s.tanks[s.tankOrder[0]].equipment,
    (s) => s.finance.ledger,
    (s) => s.finance.daily,
    (s) => s.log,
    (s) => s.market.listings,
    (s) => s.market.buyers,
    (s) => s.market.history,
    (s) => s.progress.quests,
    (s) => s.progress.unlocked,
    (s) => s.progress.achievements,
    (s) => s.inventory.equipment,
    (s) => s.inventory.decor,
    (s) => Object.values(s.creatures)[0].history,
    (s) => Object.values(s.creatures)[0].personality,
    (s) => s.visitors.history,
  ];
  it('are dropped on repair and the world can be simulated', () => {
    for (const pick of ARRAYS) {
      const g = newGame({ starterId: 'pea_puffer', starterName: 'Nulls', seed: 15 });
      const raw = JSON.parse(JSON.stringify(g)) as GameState;
      (pick(raw) as unknown[]).push(null, 42);
      const d = decodeRecord(raw);
      expect(pick(d.state).some((x) => x === null || typeof x === 'number')).toBe(false);
      expect(() => advanceWorld(d.state, 24, { forceFull: true })).not.toThrow();
    }
  });
});

describe('P5-12: save/load is transparent for a real starter', () => {
  it('does not bump the id counter to the starter seed; later ids and the world hash match', () => {
    const seed = 777; // 'll' in base 36: the old suffix scan parsed cr_starter_ll as id #777
    const make = () => {
      const g = newGame({ starterId: 'betta', starterName: 'Ll', seed, starterCreature: previewStarters(seed).betta });
      g.isShowcase = false;
      advanceWorld(g, 6, { forceFull: true });
      return g;
    };
    const straight = make();
    const reloaded = decodeRecord(encodeRecord(make(), 'auto').text).state;
    expect(reloaded.idCounter).toBe(straight.idCounter);
    advanceWorld(straight, 48, { forceFull: true });
    advanceWorld(reloaded, 48, { forceFull: true });
    expect(stateHash(reloaded)).toBe(stateHash(straight));
  });

  it('still keeps the counter ahead of nextId-shaped ids', () => {
    const g = JSON.parse(JSON.stringify(newGame({ starterId: 'betta', starterName: 'Ids', seed: 16 })));
    g.tanks.tank_zzz = { ...g.tanks[g.tankOrder[0]], id: 'tank_zzz' };
    g.idCounter = 0;
    repairState(g);
    expect(g.idCounter).toBe(parseInt('zzz', 36));
  });
});

describe('S06-01: a hung write does not wedge saving for the session', () => {
  it('times out, demotes and the save lands on the next backend', async () => {
    const hung = new Map<string, string>();
    const base = createMemoryBackend(hung);
    let probing = true;
    const idb: KVBackend = {
      ...base,
      name: 'indexeddb',
      set: (k, v) => (probing || k === 'aquarium-go.probe' ? base.set(k, v) : new Promise<void>(() => undefined)),
    };
    const lsMap = new Map<string, string>();
    configureStorageDetection({ candidates: () => [idb, named('localstorage', lsMap), createMemoryBackend()], patienceMs: 200, retryDelayMs: 1, notify: false, opTimeoutMs: 60 });
    const { storage } = await import('@/persistence');
    expect(await storage.backendName()).toBe('indexeddb');
    probing = false;
    const t0 = Date.now();
    const res = await saveGame(game('Hung', 17), 'auto');
    expect(res.ok).toBe(true);
    expect(res.backend).toBe('localstorage');
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(lsMap.has(SAVE)).toBe(true);
    expect(storageStatus().reason).toBe('demoted');
    // and the next save just works
    expect((await saveGame(game('Hung', 17), 'auto')).ok).toBe(true);
  });
});

describe('S06-08: out of space', () => {
  it('reports memory-only saves as degraded with a "full" notice', async () => {
    const quota = () => Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
    const failing = (name: BackendName): KVBackend => {
      const base = createMemoryBackend();
      return {
        ...base,
        name,
        set: (k, v) => {
          if (k !== 'aquarium-go.probe') throw quota();
          return base.set(k, v);
        },
      };
    };
    configureStorageDetection({ candidates: () => [failing('indexeddb'), failing('localstorage'), createMemoryBackend()], patienceMs: 200, retryDelayMs: 1, notify: false });
    const res = await saveGame(game('Full', 18), 'auto');
    expect(res.ok).toBe(true);
    expect(res.backend).toBe('memory');
    expect(res.degraded).toBe(true);
    expect(res.message).toMatch(/session only/);
    const st = storageStatus();
    expect(st.backend).toBe('memory');
    expect(st.reason).toBe('full');
    expect(st.warning).toMatch(/full/);
    expect(st.warning).toMatch(/until this tab closes/);
  });
});
