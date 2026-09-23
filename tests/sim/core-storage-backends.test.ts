// @vitest-environment node
/**
 * Save storage detection + multi-backend saves (QA: "saves can vanish" after a slow first load).
 *
 * Repro: on a busy cold start IndexedDB answered after ~3.5 s, the old 2.5 s probe gave up and saved to localStorage;
 * the next (fast) visit used IndexedDB and the title said "No saves yet". Now a slow IndexedDB is waited for (and
 * promoted when it answers), and saves are listed/loaded across every backend and moved into IndexedDB.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { newGame } from '@/sim/newGame';
import {
  saveGame,
  loadGame,
  loadGameDetailed,
  listSaves,
  deleteSave,
  createMemoryBackend,
  configureStorageDetection,
  storageStatus,
  storage,
  onSavesChanged,
  resetSaveReconciliation,
  encodeRecord,
  type KVBackend,
  type BackendName,
} from '@/persistence';

const SAVE = 'aquarium-go.save.auto';
const BACKUP = 'aquarium-go.save.auto.backup';

/** A memory map posing as a named backend, optionally gated (ops wait until `open()`) or failing. */
function fakeBackend(name: BackendName, map = new Map<string, string>(), opts: { gated?: boolean; failing?: boolean } = {}) {
  let open: () => void = () => undefined;
  const ready = opts.gated ? new Promise<void>((r) => (open = r)) : Promise.resolve();
  const base = createMemoryBackend(map);
  let attempts = 0;
  const wrap = <T>(f: () => Promise<T>): Promise<T> =>
    ready.then(() => {
      if (opts.failing) throw new Error('UnknownError: Internal error opening backing store');
      return f();
    });
  const backend: KVBackend = {
    name,
    get: (k) => wrap(() => base.get(k)),
    set: (k, v) => {
      if (k === 'aquarium-go.probe') attempts++;
      return wrap(() => base.set(k, v));
    },
    del: (k) => wrap(() => base.del(k)),
    keys: () => wrap(() => base.keys()),
  };
  return { backend, map, open: () => open(), attempts: () => attempts };
}

const game = (name: string, seed: number, money = 300) => {
  const g = newGame({ starterId: 'betta', starterName: name, seed });
  g.finance.money = money;
  return g;
};

function detectWith(candidates: KVBackend[], patienceMs = 60) {
  configureStorageDetection({ candidates: () => candidates, patienceMs, retryDelayMs: 1, notify: false });
}

beforeEach(() => resetSaveReconciliation());
afterEach(() => configureStorageDetection(null));

describe('storage detection: a slow IndexedDB is not a blocked one', () => {
  it('waits for a slow-but-working IndexedDB instead of falling back', async () => {
    const idb = fakeBackend('indexeddb', new Map(), { gated: true });
    const ls = fakeBackend('localstorage');
    detectWith([idb.backend, ls.backend, createMemoryBackend()], 500);
    setTimeout(() => idb.open(), 80); // answers well after the first moments of a busy start, within patience
    expect(await storage.backendName()).toBe('indexeddb');
    expect(storageStatus()).toMatchObject({ backend: 'indexeddb', reason: 'ok', pendingPromotion: false, warning: null });
    expect((await saveGame(game('Slow', 1), 'auto')).backend).toBe('indexeddb');
    expect(idb.map.has(SAVE)).toBe(true);
    expect(ls.map.has(SAVE)).toBe(false);
  });

  it('falls back after its patience runs out, then promotes IndexedDB and moves the saves across', async () => {
    const idb = fakeBackend('indexeddb', new Map(), { gated: true });
    const ls = fakeBackend('localstorage');
    detectWith([idb.backend, ls.backend, createMemoryBackend()], 40);
    const changed = vi.fn();
    const off = onSavesChanged(changed);
    const g = game('Lost', 42, 777);
    const r = await saveGame(g, 'auto');
    expect(r.ok).toBe(true);
    expect(r.backend).toBe('localstorage');
    const st = storageStatus();
    expect(st).toMatchObject({ backend: 'localstorage', reason: 'slow', pendingPromotion: true });
    expect(st.warning).toMatch(/slow to open/i);
    expect(st.warning).not.toMatch(/blocked/i);
    expect(ls.map.has(SAVE)).toBe(true);

    idb.open(); // the database finally answers
    await vi.waitFor(() => expect(idb.map.has(SAVE)).toBe(true));
    await vi.waitFor(() => expect(changed).toHaveBeenCalled());
    off();
    expect(await storage.backendName()).toBe('indexeddb');
    expect(storageStatus()).toMatchObject({ backend: 'indexeddb', reason: 'ok', pendingPromotion: false });
    // IndexedDB now holds a byte-identical copy, so the localStorage one was tidied away.
    expect(ls.map.has(SAVE)).toBe(false);
    const list = await listSaves();
    expect(list.map((s) => `${s.slot}:${s.starterName}:${s.backend}`)).toEqual(['auto:Lost:indexeddb']);
    expect((await loadGame('auto'))?.finance.money).toBe(777);
  });

  it('retries a database that errors, then reports it as blocked', async () => {
    const idb = fakeBackend('indexeddb', new Map(), { failing: true });
    const ls = fakeBackend('localstorage');
    detectWith([idb.backend, ls.backend, createMemoryBackend()]);
    expect(await storage.backendName()).toBe('localstorage');
    expect(idb.attempts()).toBe(3); // first try + 2 retries with a fresh connection
    expect(storageStatus()).toMatchObject({ backend: 'localstorage', reason: 'blocked', pendingPromotion: false });
    expect(storageStatus().warning).toMatch(/blocked/i);
  });
});

describe('saves are found wherever they were written', () => {
  it('next visit (fast IndexedDB) finds and migrates a save left in localStorage', async () => {
    // Session 1 (slow start) wrote the autosave to localStorage.
    const text = encodeRecord(game('Lost', 42, 555), 'auto', 1_000).text;
    const lsMap = new Map<string, string>([[SAVE, text]]);
    const idb = fakeBackend('indexeddb');
    const ls = fakeBackend('localstorage', lsMap);
    detectWith([idb.backend, ls.backend, createMemoryBackend()]);
    const list = await listSaves();
    expect(list.map((s) => `${s.slot}:${s.starterName}`)).toEqual(['auto:Lost']);
    const r = await loadGameDetailed('auto');
    expect(r.ok).toBe(true);
    expect(r.restoredFromBackup).toBeFalsy();
    expect(r.state?.finance.money).toBe(555);
    expect(idb.map.get(SAVE)).toBe(text);
    expect(ls.map.has(SAVE)).toBe(false);
    expect(idb.map.has('aquarium-go.meta.auto')).toBe(true);
  });

  it('newest copy wins; the older IndexedDB copy becomes the backup, never lost', async () => {
    const older = encodeRecord(game('Old', 1, 100), 'auto', 1_000).text;
    const newer = encodeRecord(game('New', 2, 200), 'auto', 2_000).text;
    const idb = fakeBackend('indexeddb', new Map([[SAVE, older]]));
    const ls = fakeBackend('localstorage', new Map([[SAVE, newer]]));
    detectWith([idb.backend, ls.backend, createMemoryBackend()]);
    expect((await listSaves())[0].starterName).toBe('New');
    expect((await loadGame('auto'))?.finance.money).toBe(200);
    expect(idb.map.get(SAVE)).toBe(newer);
    expect(idb.map.get(BACKUP)).toBe(older);
    expect(ls.map.has(SAVE)).toBe(false);
  });

  it('a stale localStorage copy never overrides a newer IndexedDB save (and is kept, not destroyed)', async () => {
    const newer = encodeRecord(game('Current', 3, 900), 'auto', 5_000).text;
    const stale = encodeRecord(game('Stale', 4, 10), 'auto', 1_000).text;
    const idb = fakeBackend('indexeddb', new Map([[SAVE, newer]]));
    const ls = fakeBackend('localstorage', new Map([[SAVE, stale]]));
    detectWith([idb.backend, ls.backend, createMemoryBackend()]);
    expect((await listSaves()).map((s) => s.starterName)).toEqual(['Current']);
    expect((await loadGame('auto'))?.finance.money).toBe(900);
    expect(idb.map.get(SAVE)).toBe(newer);
    expect(ls.map.get(SAVE)).toBe(stale);
  });

  it('keeps damaged source data and still recovers the intact backup', async () => {
    const good = encodeRecord(game('Backup', 5, 321), 'auto', 1_000).text;
    const damaged = encodeRecord(game('Damaged', 6, 1), 'auto', 2_000).text.slice(0, 300);
    const idb = fakeBackend('indexeddb');
    const ls = fakeBackend('localstorage', new Map([[SAVE, damaged], [BACKUP, good]]));
    detectWith([idb.backend, ls.backend, createMemoryBackend()]);
    const r = await loadGameDetailed('auto');
    expect(r.ok).toBe(true);
    expect(r.state?.finance.money).toBe(321);
    expect(idb.map.get(SAVE)).toBe(good);
    expect(ls.map.get(SAVE)).toBe(damaged); // never deleted: nothing identical exists elsewhere
  });

  it('deleting a slot removes it from every backend (an older copy cannot resurface)', async () => {
    const idb = fakeBackend('indexeddb', new Map([[SAVE, encodeRecord(game('A', 7), 'auto', 5_000).text]]));
    const ls = fakeBackend('localstorage', new Map([[SAVE, encodeRecord(game('B', 8), 'auto', 1_000).text]]));
    detectWith([idb.backend, ls.backend, createMemoryBackend()]);
    expect((await listSaves()).length).toBe(1);
    await deleteSave('auto');
    expect(await listSaves()).toEqual([]);
    expect(idb.map.has(SAVE) || ls.map.has(SAVE)).toBe(false);
  });

  it('with IndexedDB unavailable, localStorage saves still list and load', async () => {
    const lsMap = new Map<string, string>([[SAVE, encodeRecord(game('Solo', 9, 42), 'auto', 1_000).text]]);
    detectWith([fakeBackend('localstorage', lsMap).backend, createMemoryBackend()]);
    expect((await listSaves()).map((s) => s.backend)).toEqual(['localstorage']);
    expect((await loadGame('auto'))?.finance.money).toBe(42);
    expect(lsMap.has(SAVE)).toBe(true);
  });
});
