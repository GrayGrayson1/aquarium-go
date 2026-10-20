// @vitest-environment node
/**
 * Chunk 9 (ADR-0044; the audit's E1 and G1; REL-037) — a newer copy of the same aquarium is never dropped silently.
 * A slot's backup is listed as "Previous …" only when it holds another aquarium, and before this chunk an older copy
 * of the same aquarium written over a newer one (a load, an overwrite, an import) pushed the newer one into a backup
 * nobody could see, and the next autosave rotated it away. Now the newer one goes into the backup as a kept copy (a new
 * identity), listed, until the slot switches aquarium again; `keepReplaced` keeps the replaced copy whatever its
 * progress (Import). PERSIST-014 still holds: a newer build's record in the backup is never written over.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { newGame } from '@/sim/newGame';
import {
  saveGame,
  saveGameSync,
  storage,
  isStaleGame,
  loadGameDetailed,
  listSaves,
  setStorageBackend,
  setSyncStore,
  createMemoryBackend,
  configureStorageDetection,
  resetSaveReconciliation,
  resetSaveSession,
  encodeRecord,
  reconcileSaves,
  baseSaveId,
  keptSaveId,
  copySave,
  SCHEMA_VERSION,
  type KVBackend,
  type BackendName,
} from '@/persistence';
import type { GameState } from '@/types';

const named = (name: BackendName, map = new Map<string, string>()): KVBackend => ({ ...createMemoryBackend(map), name });

const aquarium = (name: string, seed: number): GameState => {
  const g = newGame({ starterId: 'betta', starterName: name, seed });
  g.shopName = name;
  return g;
};

/** The same aquarium at another point of its play (day `day`, hour 10). */
const onDay = (g: GameState, day: number, money = g.finance.money): GameState => {
  const s = structuredClone(g);
  s.clock.hour = (day - 1) * 24 + 10;
  s.finance.money = money;
  return s;
};

/** A save list line: "slot: name day N" (previous copies say whose). */
const lines = async () => (await listSaves()).map((m) => `${m.slot}: ${m.shopName} day ${m.day}${m.previousOf ? ` (previous of ${m.previousOf})` : ''}`).sort();

let map: Map<string, string>;
beforeEach(() => {
  resetSaveReconciliation();
  resetSaveSession();
  setSyncStore(null);
  map = new Map();
  setStorageBackend(createMemoryBackend(map));
});
afterEach(() => {
  setSyncStore(undefined);
  configureStorageDetection(null);
});

describe('E1: an older copy written over a newer one keeps the newer one listed', () => {
  it('in the autosave, across any number of the older copy’s autosaves (the audit’s probe: day 10 was gone)', async () => {
    const a = aquarium('Reef Corner', 21);
    expect((await saveGame(onDay(a, 10), 'auto')).ok).toBe(true);
    expect((await saveGame(onDay(a, 2), 'auto')).ok).toBe(true); // loading day 2's copy, then its autosaves
    for (let i = 0; i < 3; i++) expect((await saveGame(onDay(a, 2, 100 + i), 'auto')).ok).toBe(true);
    expect(await lines()).toEqual(['auto.backup: Reef Corner day 10 (previous of auto)', 'auto: Reef Corner day 2']);
    const prev = (await listSaves()).find((m) => m.previousOf === 'auto')!;
    expect(prev.saveId).not.toBe(a.saveId); // a kept copy: its own identity, from the same aquarium
    expect(baseSaveId(prev.saveId!)).toBe(a.saveId);
    const back = await loadGameDetailed('auto.backup');
    expect(back.ok).toBe(true);
    expect(back.state!.clock.hour).toBe(9 * 24 + 10);
    // the slot itself still loads the copy just written (the kept one keeps its own, older time)
    const now = await loadGameDetailed('auto');
    expect(now.state!.saveId).toBe(a.saveId);
    expect(now.state!.clock.hour).toBe(24 + 10);
    expect(now.restoredFromBackup).toBeUndefined();
  });

  it('in a manual slot (Replace with an earlier copy): the later copy is "Previous copy of Slot 1"', async () => {
    const a = aquarium('Coral Nook', 22);
    expect((await saveGame(onDay(a, 10), 'slot1')).ok).toBe(true);
    expect((await saveGame(onDay(a, 2), 'slot1')).ok).toBe(true);
    expect(await lines()).toEqual(['slot1.backup: Coral Nook day 10 (previous of slot1)', 'slot1: Coral Nook day 2']);
  });

  it('keepReplaced (Import) keeps the copy it replaces even when that one is behind', async () => {
    const a = aquarium('Kelp Hall', 23);
    expect((await saveGame(onDay(a, 2), 'slot2')).ok).toBe(true);
    expect((await saveGame(onDay(a, 10), 'slot2', { keepReplaced: true })).ok).toBe(true);
    expect(await lines()).toEqual(['slot2.backup: Kelp Hall day 2 (previous of slot2)', 'slot2: Kelp Hall day 10']);
  });

  it('the aquarium being played saving on lists nothing (unchanged), and keeps a displaced one beneath it', async () => {
    const a = aquarium('Tide Pool', 24);
    for (let d = 1; d <= 4; d++) expect((await saveGame(onDay(a, d), 'auto')).ok).toBe(true);
    expect(await lines()).toEqual(['auto: Tide Pool day 4']);
    const b = aquarium('Other', 25);
    expect((await saveGame(onDay(b, 1), 'auto')).ok).toBe(true);
    for (let d = 2; d <= 4; d++) expect((await saveGame(onDay(b, d), 'auto')).ok).toBe(true);
    expect(await lines()).toEqual(['auto.backup: Tide Pool day 4 (previous of auto)', 'auto: Other day 4']);
  });

  it('a kept copy takes the backup’s place, as any switch of aquarium does (the dialog offers a slot first)', async () => {
    const w = aquarium('Old W', 26);
    const a = aquarium('Now A', 27);
    expect((await saveGame(onDay(w, 3), 'auto')).ok).toBe(true);
    expect((await saveGame(onDay(a, 10), 'auto')).ok).toBe(true); // W is "Previous autosave"
    expect((await saveGame(onDay(a, 2), 'auto')).ok).toBe(true); // an earlier copy of A loaded: day 10 kept
    expect(await lines()).toEqual(['auto.backup: Now A day 10 (previous of auto)', 'auto: Now A day 2']);
  });

  it('PERSIST-014: a newer build’s record in the backup is never written over; the write is refused', async () => {
    const a = aquarium('Future', 28);
    expect((await saveGame(onDay(a, 10), 'auto')).ok).toBe(true);
    const newer = encodeRecord({ ...onDay(a, 12), schemaVersion: SCHEMA_VERSION + 1 }, 'auto', Date.now() - 1000).text;
    map.set('aquarium-go.save.auto.backup', newer);
    const r = await saveGame(onDay(a, 2), 'auto');
    expect(r.ok).toBe(false);
    expect(r.code).toBe('too_new');
    expect(map.get('aquarium-go.save.auto.backup')).toBe(newer);
    expect((await loadGameDetailed('auto')).state?.clock.hour).toBe(9 * 24 + 10); // the slot's day 10, untouched
  });

  it('the page-close save, with localStorage as the save store, keeps a further-along copy the same way', async () => {
    const ls = new Map<string, string>();
    setSyncStore({ getItem: (k) => ls.get(k) ?? null, setItem: (k, v) => void ls.set(k, v), removeItem: (k) => void ls.delete(k) });
    setStorageBackend(named('localstorage', ls));
    const a = aquarium('Lagoon', 29);
    expect((await saveGame(onDay(a, 10), 'auto')).ok).toBe(true);
    expect(saveGameSync(onDay(a, 2), 'auto')).toBe(true);
    expect((await saveGame(onDay(a, 2), 'auto')).ok).toBe(true);
    expect(await lines()).toEqual(['auto.backup: Lagoon day 10 (previous of auto)', 'auto: Lagoon day 2']);
  });
});

describe('the helpers', () => {
  it('keptSaveId: a new identity from the same aquarium, whatever copy it is made from', () => {
    const k = keptSaveId('save_abc');
    expect(k).toMatch(/^save_abc_kept_[0-9a-z]+$/);
    expect(baseSaveId(k)).toBe('save_abc');
    expect(baseSaveId(keptSaveId(k))).toBe('save_abc');
    expect(baseSaveId('save_abc')).toBe('save_abc');
  });

  it('copySave puts a stored copy (a backup too) into another slot', async () => {
    const w = aquarium('Parked', 30);
    const a = aquarium('Shown', 31);
    expect((await saveGame(onDay(w, 5), 'auto')).ok).toBe(true);
    expect((await saveGame(onDay(a, 1), 'auto')).ok).toBe(true);
    expect((await copySave('auto.backup', 'slot3')).ok).toBe(true);
    expect(await lines()).toEqual(['auto.backup: Parked day 5 (previous of auto)', 'auto: Shown day 1', 'slot3: Parked day 5']);
    expect((await copySave('slot2', 'slot1')).ok).toBe(false); // nothing there
  });
});

describe('Settings › Saves’ Load (loadIntoGame): an earlier copy of the aquarium on screen', () => {
  it('keeps the current progress listed as "Previous autosave" across the loaded copy’s autosaves', async () => {
    const { useGame } = await import('@/state/game');
    const { useUI } = await import('@/state/ui');
    const { useSettings } = await import('@/state/settings');
    const { loadIntoGame } = await import('@/ui/common/saves');
    const { saveCurrentGame } = await import('@/persistence');
    const a = aquarium('Reef Corner', 40);
    expect((await saveGame(onDay(a, 2), 'slot1')).ok).toBe(true);
    useSettings.setState({ autosave: true });
    useUI.setState({ screen: 'game' });
    useGame.getState().setGame(onDay(a, 10));
    try {
      const g = await loadIntoGame('slot1');
      expect(g?.saveId).toBe(a.saveId);
      for (let i = 0; i < 3; i++) expect((await saveCurrentGame('auto')).ok).toBe(true); // the loaded copy plays on
      const prev = (await listSaves()).find((m) => m.previousOf === 'auto');
      expect(prev?.day).toBe(10);
      expect(baseSaveId(prev!.saveId!)).toBe(a.saveId);
      expect(useGame.getState().game!.saveId).toBe(a.saveId); // the game on screen keeps its identity
    } finally {
      useGame.getState().setGame(null);
      useUI.setState({ screen: 'boot' });
    }
  });

  it('a later copy loaded over an earlier branch: that branch’s progress is kept listed too (only the kept save does it)', async () => {
    const { useGame } = await import('@/state/game');
    const { useUI } = await import('@/state/ui');
    const { useSettings } = await import('@/state/settings');
    const { loadIntoGame } = await import('@/ui/common/saves');
    const { saveCurrentGame } = await import('@/persistence');
    const a = aquarium('Kelp Hall', 41);
    expect((await saveGame(onDay(a, 10), 'slot1')).ok).toBe(true);
    useSettings.setState({ autosave: true });
    useUI.setState({ screen: 'game' });
    useGame.getState().setGame(onDay(a, 2, 777)); // an earlier copy, played on its own way
    try {
      expect((await loadIntoGame('slot1'))?.clock.hour).toBe(9 * 24 + 10);
      for (let i = 0; i < 3; i++) expect((await saveCurrentGame('auto')).ok).toBe(true);
      const prev = (await listSaves()).find((m) => m.previousOf === 'auto');
      expect(prev).toMatchObject({ day: 2, money: 777 });
    } finally {
      useGame.getState().setGame(null);
      useUI.setState({ screen: 'boot' });
    }
  });
});

describe('the review’s blockers (chunk 9)', () => {
  const fakeLS = () => {
    const ls = new Map<string, string>();
    return { ls, store: { getItem: (k: string) => ls.get(k) ?? null, setItem: (k: string, v: string) => void ls.set(k, v), removeItem: (k: string) => void ls.delete(k) } };
  };
  /** Another tab writes `g` into the autosave a moment later (its own stamp and a newer record), as fix-core-saves does. */
  const otherTabWrites = async (g: GameState, ls: Map<string, string>) => {
    await new Promise((r) => setTimeout(r, 3));
    const rec = encodeRecord(g, 'auto');
    await storage.set('aquarium-go.save.auto', rec.text);
    await storage.set('aquarium-go.meta.auto', JSON.stringify(rec.header.meta)); // the listing reads the meta
    ls.set('aquarium-go.stamp.auto', JSON.stringify({ savedAt: rec.header.savedAt, saveId: g.saveId, tab: 'other-tab', hour: g.clock.hour }));
  };

  it('1: a kept copy is refused by the stale-tab guard as its aquarium would be (staleAs)', async () => {
    const { ls, store } = fakeLS();
    setSyncStore(store);
    const a = aquarium('Two Tabs', 50);
    expect((await saveGame(onDay(a, 8), 'auto')).ok).toBe(true);
    await otherTabWrites(onDay(a, 12), ls);
    const r = await saveGame({ ...onDay(a, 8), saveId: keptSaveId(a.saveId) }, 'auto', { staleAs: a.saveId });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('stale');
    expect((await loadGameDetailed('auto')).state!.clock.hour).toBe(11 * 24 + 10); // the other tab's day 12 stays
  });

  it('1: a tab that is behind loads an earlier copy: the other tab’s further copy survives its autosaves', async () => {
    const { ls, store } = fakeLS();
    setSyncStore(store);
    const { useGame } = await import('@/state/game');
    const { useUI } = await import('@/state/ui');
    const { useSettings } = await import('@/state/settings');
    const { loadIntoGame } = await import('@/ui/common/saves');
    const { saveCurrentGame } = await import('@/persistence');
    const a = aquarium('Behind', 51);
    expect((await saveGame(onDay(a, 2), 'slot1')).ok).toBe(true);
    expect((await saveGame(onDay(a, 8), 'auto')).ok).toBe(true);
    useSettings.setState({ autosave: true });
    useUI.setState({ screen: 'game' });
    useGame.getState().setGame(onDay(a, 8));
    try {
      await otherTabWrites(onDay(a, 12), ls); // played on to day 12 there, then closed
      expect(isStaleGame(a.saveId)).toBe(false);
      await loadIntoGame('slot1');
      for (let i = 0; i < 2; i++) await saveCurrentGame('auto');
      const days = (await listSaves()).filter((m) => baseSaveId(m.saveId ?? '') === a.saveId).map((m) => m.day);
      expect(days).toContain(12);
    } finally {
      useGame.getState().setGame(null);
      useUI.setState({ screen: 'boot' });
    }
  });

  it('3: the page-close copy of an earlier one, moved into IndexedDB on the next boot, keeps the further copy listed', async () => {
    const idbMap = new Map<string, string>();
    const { ls, store } = fakeLS();
    setSyncStore(store);
    const IDB = named('indexeddb', idbMap);
    const LS = named('localstorage', ls);
    setStorageBackend(IDB, [LS], [LS]);
    const a = aquarium('Title Load', 52);
    expect((await saveGame(onDay(a, 10), 'auto')).ok).toBe(true);
    await new Promise((r) => setTimeout(r, 3));
    expect(saveGameSync(onDay(a, 2), 'auto')).toBe(true); // an earlier copy loaded on the title screen, the tab closed
    // next boot
    resetSaveReconciliation();
    resetSaveSession();
    setStorageBackend(IDB, [LS], [LS]);
    await reconcileSaves();
    expect(await lines()).toEqual(['auto.backup: Title Load day 10 (previous of auto)', 'auto: Title Load day 2']);
    expect((await saveGame(onDay(a, 2, 5), 'auto')).ok).toBe(true);
    expect((await listSaves()).find((m) => m.previousOf === 'auto')?.day).toBe(10);
  });

  it('4: with Settings’ autosave off, Load still keeps the current progress listed (the dialog promises it)', async () => {
    const { useGame } = await import('@/state/game');
    const { useUI } = await import('@/state/ui');
    const { useSettings } = await import('@/state/settings');
    const { loadIntoGame } = await import('@/ui/common/saves');
    const a = aquarium('Autosave Off', 53);
    expect((await saveGame(onDay(a, 5), 'auto')).ok).toBe(true);
    expect((await saveGame(onDay(a, 2), 'slot1')).ok).toBe(true);
    useSettings.setState({ autosave: false });
    useUI.setState({ screen: 'game' });
    useGame.getState().setGame(onDay(a, 10));
    try {
      await loadIntoGame('slot1');
      expect((await listSaves()).filter((m) => baseSaveId(m.saveId ?? '') === a.saveId).map((m) => m.day)).toContain(10);
    } finally {
      useSettings.setState({ autosave: true });
      useGame.getState().setGame(null);
      useUI.setState({ screen: 'boot' });
    }
  });
});

describe('the review’s confirmation (B): a title-screen load, then Load in Settings (ADR-0044 decision 6)', () => {
  async function setUp() {
    const { useGame } = await import('@/state/game');
    const { useUI } = await import('@/state/ui');
    const { useSettings } = await import('@/state/settings');
    const a = aquarium('Reef Corner', 60);
    expect((await saveGame(onDay(a, 10), 'auto')).ok).toBe(true);
    expect((await saveGame(onDay(a, 2), 'slot1')).ok).toBe(true);
    expect((await saveGame(onDay(a, 5), 'slot2')).ok).toBe(true);
    useSettings.setState({ autosave: true });
    useUI.setState({ screen: 'game', toasts: [] });
    useGame.getState().setGame(onDay(a, 2)); // Slot 1, loaded on the title screen; no autosave yet
    return { a, useGame, useUI };
  }
  const done = async () => {
    const { useGame } = await import('@/state/game');
    const { useUI } = await import('@/state/ui');
    useGame.getState().setGame(null);
    useUI.setState({ screen: 'boot' });
  };

  it('day 10, only in the autosave, is saved to a free slot first and stays there (before: gone after one autosave)', async () => {
    const { a, useUI } = await setUp();
    const { loadIntoGame } = await import('@/ui/common/saves');
    const { saveCurrentGame } = await import('@/persistence');
    try {
      expect((await loadIntoGame('slot2'))?.clock.hour).toBe(4 * 24 + 10);
      expect(useUI.getState().toasts.map((t) => t.text)).toContain('Reef Corner was only in the autosave, so it was saved to Slot 3 first.');
      for (let i = 0; i < 2; i++) await saveCurrentGame('auto');
      expect((await listSaves()).find((m) => m.slot === 'slot3')).toMatchObject({ day: 10, saveId: a.saveId });
    } finally {
      await done();
    }
  });

  it('with every slot full nothing loads, and it says so', async () => {
    const { useGame, useUI } = await setUp();
    const { loadIntoGame } = await import('@/ui/common/saves');
    try {
      expect((await saveGame(aquarium('Filler', 61), 'slot3')).ok).toBe(true);
      expect(await loadIntoGame('slot2')).toBeNull();
      expect(useUI.getState().toasts.map((t) => t.text)).toContain('Reef Corner is only in the autosave and every slot is full. Free a slot in Settings › Saves first.');
      expect(useGame.getState().game!.clock.hour).toBe(24 + 10);
      expect((await listSaves()).find((m) => m.slot === 'auto')?.day).toBe(10);
    } finally {
      await done();
    }
  });

  it('the usual load of an earlier copy parks nothing (the autosave is the game on screen’s own)', async () => {
    const { useGame } = await import('@/state/game');
    const { useUI } = await import('@/state/ui');
    const { loadIntoGame } = await import('@/ui/common/saves');
    const a = aquarium('Plain', 62);
    expect((await saveGame(onDay(a, 2), 'slot1')).ok).toBe(true);
    expect((await saveGame(onDay(a, 9), 'auto')).ok).toBe(true);
    useUI.setState({ screen: 'game', toasts: [] });
    useGame.getState().setGame(onDay(a, 10));
    try {
      await loadIntoGame('slot1');
      expect(useUI.getState().toasts.some((t) => t.text.includes('was only in the autosave'))).toBe(false);
      expect((await listSaves()).filter((m) => m.slot !== 'auto' && !m.previousOf).map((m) => m.slot)).toEqual(['slot1']);
    } finally {
      await done();
    }
  });
});

describe('the review’s second confirmation: Load reads the copy it loads before it writes anything', () => {
  async function env() {
    const { useGame } = await import('@/state/game');
    const { useUI } = await import('@/state/ui');
    const { useSettings } = await import('@/state/settings');
    const { loadIntoGame } = await import('@/ui/common/saves');
    useSettings.setState({ autosave: true });
    useUI.setState({ screen: 'game', toasts: [] });
    return { useGame, useUI, loadIntoGame, done: () => (useGame.getState().setGame(null), useUI.setState({ screen: 'boot' })) };
  }

  it('"Previous autosave" (another aquarium) loaded right after a title-screen load is the one loaded, and nothing is lost', async () => {
    const { useGame, loadIntoGame, done } = await env();
    const w = aquarium('Wren', 70);
    const x = aquarium('Xenia', 71);
    expect((await saveGame(onDay(w, 6), 'auto')).ok).toBe(true);
    expect((await saveGame(onDay(x, 10), 'auto')).ok).toBe(true); // Wren is "Previous autosave"
    expect((await saveGame(onDay(x, 2), 'slot1')).ok).toBe(true);
    useGame.getState().setGame(onDay(x, 2)); // Slot 1, loaded on the title screen
    try {
      const g = await loadIntoGame('auto.backup');
      expect(g?.saveId).toBe(w.saveId); // before: Xenia's day 10, and Wren gone
      const saves = await listSaves();
      expect(saves.find((m) => m.slot === 'auto')?.saveId).toBe(w.saveId);
      expect(saves.find((m) => m.slot === 'slot2')).toMatchObject({ saveId: x.saveId, day: 10 }); // parked first
      expect(saves.filter((m) => m.saveId === x.saveId || baseSaveId(m.saveId ?? '') === x.saveId).map((m) => m.day).sort()).toEqual([10, 2, 2].sort());
    } finally {
      done();
    }
  });

  it('a kept branch of the same aquarium in "Previous autosave" loads as itself', async () => {
    const { useGame, loadIntoGame, done } = await env();
    const a = aquarium('Branches', 72);
    expect((await saveGame({ ...onDay(a, 4, 444), saveId: keptSaveId(a.saveId) }, 'auto')).ok).toBe(true);
    expect((await saveGame(onDay(a, 10), 'auto')).ok).toBe(true); // the day-4 branch is "Previous autosave"
    expect((await saveGame(onDay(a, 2), 'slot1')).ok).toBe(true);
    useGame.getState().setGame(onDay(a, 2));
    try {
      const g = await loadIntoGame('auto.backup');
      expect(g?.finance.money).toBe(444);
      expect(Math.floor(g!.clock.hour / 24) + 1).toBeGreaterThanOrEqual(4);
      expect((await listSaves()).some((m) => m.day === 10)).toBe(true);
    } finally {
      done();
    }
  });
});

describe('the review’s last confirmation: a stale tab’s Load, and a load with nothing on screen', () => {
  it('the stale banner’s "load the newer copy" loads it and keeps "Previous autosave" (another aquarium) as it was', async () => {
    const ls = new Map<string, string>();
    setSyncStore({ getItem: (k) => ls.get(k) ?? null, setItem: (k, v) => void ls.set(k, v), removeItem: (k) => void ls.delete(k) });
    const { useGame } = await import('@/state/game');
    const { useUI } = await import('@/state/ui');
    const { useSettings } = await import('@/state/settings');
    const { loadIntoGame } = await import('@/ui/common/saves');
    const w = aquarium('Wren', 80);
    const x = aquarium('Xenia', 81);
    expect((await saveGame(onDay(w, 6), 'auto')).ok).toBe(true);
    expect((await saveGame(onDay(x, 8), 'auto')).ok).toBe(true); // Wren is "Previous autosave"
    // the other tab plays Xenia on to day 12
    await new Promise((r) => setTimeout(r, 3));
    const rec = encodeRecord(onDay(x, 12), 'auto');
    await storage.set('aquarium-go.save.auto', rec.text);
    await storage.set('aquarium-go.meta.auto', JSON.stringify(rec.header.meta));
    ls.set('aquarium-go.stamp.auto', JSON.stringify({ savedAt: rec.header.savedAt, saveId: x.saveId, tab: 'other-tab', hour: onDay(x, 12).clock.hour }));
    expect((await saveGame(onDay(x, 8), 'auto')).code).toBe('stale'); // this tab is refused: the banner shows
    expect(isStaleGame(x.saveId)).toBe(true);
    useSettings.setState({ autosave: true });
    useUI.setState({ screen: 'game' });
    useGame.getState().setGame(onDay(x, 8));
    try {
      expect((await loadIntoGame('auto'))?.clock.hour).toBe(11 * 24 + 10);
      expect((await listSaves()).find((m) => m.previousOf === 'auto')?.saveId).toBe(w.saveId);
    } finally {
      useGame.getState().setGame(null);
      useUI.setState({ screen: 'boot' });
    }
  });

  it('with no game on screen (the title, Continue, a link), a load writes nothing', async () => {
    const { loadIntoGame } = await import('@/ui/common/saves');
    const { useGame } = await import('@/state/game');
    const { useUI } = await import('@/state/ui');
    const a = aquarium('Title', 82);
    expect((await saveGame(onDay(a, 3), 'auto')).ok).toBe(true);
    const before = [...map.entries()].filter(([k]) => k.startsWith('aquarium-go.save.')).sort();
    try {
      expect((await loadIntoGame('auto'))?.saveId).toBe(a.saveId);
      expect([...map.entries()].filter(([k]) => k.startsWith('aquarium-go.save.')).sort()).toEqual(before);
    } finally {
      useGame.getState().setGame(null);
      useUI.setState({ screen: 'boot' });
    }
  });
});

describe('the review’s final confirmation: a stale tab’s Load still keeps a further copy of what it loads', () => {
  it('a kept Yarrow day 9 in "Previous autosave", a stale tab loads Yarrow day 3: day 9 goes to a free slot first', async () => {
    const ls = new Map<string, string>();
    setSyncStore({ getItem: (k) => ls.get(k) ?? null, setItem: (k, v) => void ls.set(k, v), removeItem: (k) => void ls.delete(k) });
    const { useGame } = await import('@/state/game');
    const { useUI } = await import('@/state/ui');
    const { useSettings } = await import('@/state/settings');
    const { loadIntoGame } = await import('@/ui/common/saves');
    const { saveCurrentGame } = await import('@/persistence');
    const x = aquarium('Xenia', 90);
    const y = aquarium('Yarrow', 91);
    expect((await saveGame({ ...onDay(y, 9), saveId: keptSaveId(y.saveId) }, 'auto')).ok).toBe(true);
    expect((await saveGame(onDay(x, 8), 'auto')).ok).toBe(true); // the kept Yarrow is "Previous autosave"
    expect((await saveGame(onDay(y, 3), 'slot2')).ok).toBe(true);
    await new Promise((r) => setTimeout(r, 3));
    const rec = encodeRecord(onDay(x, 12), 'auto'); // the other tab plays Xenia on to day 12
    await storage.set('aquarium-go.save.auto', rec.text);
    await storage.set('aquarium-go.meta.auto', JSON.stringify(rec.header.meta));
    ls.set('aquarium-go.stamp.auto', JSON.stringify({ savedAt: rec.header.savedAt, saveId: x.saveId, tab: 'other-tab', hour: onDay(x, 12).clock.hour }));
    expect((await saveGame(onDay(x, 8), 'auto')).code).toBe('stale');
    useSettings.setState({ autosave: true });
    useUI.setState({ screen: 'game', toasts: [] });
    useGame.getState().setGame(onDay(x, 8));
    try {
      expect((await loadIntoGame('slot2'))?.saveId).toBe(y.saveId);
      await saveCurrentGame('auto');
      const kept = (await listSaves()).filter((m) => m.slot !== 'auto' && !m.previousOf);
      expect(kept.some((m) => baseSaveId(m.saveId ?? '') === y.saveId && m.day === 9)).toBe(true); // before: in no save
      expect(useUI.getState().toasts.map((t) => t.text)).toContain('Yarrow was only in the autosave, so it was saved to Slot 3 first.');
    } finally {
      useGame.getState().setGame(null);
      useUI.setState({ screen: 'boot' });
    }
  });
});
