// @vitest-environment node
/**
 * lane:core (PERSIST-014; PERSIST-003 A1, A2 and A6; ADR-0005 decision 1 "good saves going forward", ADR-0016
 * decision 2) — forward-safe saves. A record written by a newer build (header or body schemaVersion above
 * SCHEMA_VERSION: `too_new`) is final for this build:
 *  - loading its slot reports too_new with the "newer version" message (ADR-0019 decision 4 adds "Refresh the page to
 *    get the latest version."), never "damaged", and restores neither the slot's `.backup` nor another backend's copy;
 *  - saveGame, saveGameSync (the pagehide/hidden write), the backup rotation and moving saves between backends leave
 *    it unchanged, in the primary and in the `.backup` key.
 * The species ids and tank sizes known at this SCHEMA_VERSION are pinned below: adding one without raising it fails.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { newGame } from '@/sim/newGame';
import {
  saveGame,
  saveGameSync,
  loadGame,
  loadGameDetailed,
  loadAndResume,
  listSaves,
  reconcileSaves,
  setStorageBackend,
  setSyncStore,
  createMemoryBackend,
  configureStorageDetection,
  resetSaveReconciliation,
  resetSaveSession,
  encodeRecord,
  cyrb53,
  SCHEMA_VERSION,
  type KVBackend,
  type BackendName,
} from '@/persistence';
import { ALL_SPECIES } from '@/data/species';
import { TANK_TIERS } from '@/data/catalog/tanks';
import type { GameState } from '@/types';

const NEWER = SCHEMA_VERSION + 1;
const MESSAGE = `This save comes from a newer version of Aquarium Go (save format v${NEWER}; this game reads up to v${SCHEMA_VERSION}). Refresh the page to get the latest version.`;
const SAVE = 'aquarium-go.save.auto';
const BACKUP = 'aquarium-go.save.auto.backup';
const META = 'aquarium-go.meta.auto';
const STAMP = 'aquarium-go.stamp.auto';

const named = (name: BackendName, map = new Map<string, string>()): KVBackend => ({ ...createMemoryBackend(map), name });

/** A Map posing as localStorage for the synchronous (pagehide) write. */
const syncStoreOver = (map: Map<string, string>) => ({
  getItem: (k: string) => map.get(k) ?? null,
  setItem: (k: string, v: string) => void map.set(k, v),
  removeItem: (k: string) => void map.delete(k),
});

const game = (name: string, seed: number, money = 300): GameState => {
  const g = newGame({ starterId: 'betta', starterName: name, seed });
  g.shopName = name;
  g.finance.money = money;
  return g;
};

/** This build's record of `g`, written at `at`. */
const current = (g: GameState, at: number) => encodeRecord(g, 'auto', at).text;

/**
 * A newer build's record of `g`, written at `at`, in each shape this build must recognise:
 *  - header: the record format with the schemaVersion raised in its header and its body (what a newer build writes);
 *  - body: a bare JSON state without a header, its schemaVersion raised;
 *  - body-under-header: the header says SCHEMA_VERSION, but the (checksummed) body says newer;
 *  - torn: a newer build's write cut short (the header says newer, the body is truncated).
 */
function newerRecord(shape: string, g: GameState, at: number): string {
  const future = { ...structuredClone(g), schemaVersion: NEWER, lastSavedRealMs: at } as GameState;
  const header = encodeRecord(future, 'auto', at).text;
  if (shape === 'header') return header;
  if (shape === 'torn') return header.slice(0, header.length - 40);
  const body = JSON.stringify(future);
  if (shape === 'body') return body;
  const own = encodeRecord(g, 'auto', at).text;
  const h = JSON.parse(own.slice(0, own.indexOf('\n')));
  return `${JSON.stringify({ ...h, checksum: cyrb53(body), length: body.length })}\n${body}`;
}
const SHAPES = ['header', 'body', 'body-under-header', 'torn'];

beforeEach(() => {
  resetSaveReconciliation();
  resetSaveSession();
  setSyncStore(null);
  setStorageBackend(createMemoryBackend());
});
afterEach(() => {
  setSyncStore(undefined);
  configureStorageDetection(null);
  vi.restoreAllMocks();
});

describe('PERSIST-014 A1: a slot whose newest record is too_new loads as too_new', () => {
  it('a newer primary and a valid backup on a memory backend: too_new with the message, no older copy, never "damaged"', async () => {
    const g = game('Future', 101, 4321);
    const t0 = Date.now() - 60_000;
    const mem = new Map<string, string>([
      [SAVE, newerRecord('header', g, t0 + 1000)],
      [BACKUP, current(g, t0)],
    ]);
    const other = new Map<string, string>([[SAVE, current(g, t0 + 500)]]); // another backend's older copy of the slot
    const before = new Map(mem);
    const otherBefore = new Map(other);
    setStorageBackend(createMemoryBackend(mem), [], [named('localstorage', other)]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const r = await loadGameDetailed('auto');
    expect(r.ok).toBe(false);
    expect(r.code).toBe('too_new');
    expect(r.error).toMatch(/newer version/);
    expect(r.error).toBe(MESSAGE);
    expect(r.state).toBeUndefined();
    expect(r.restoredFromBackup).toBeUndefined();
    expect(await loadGame('auto')).toBeNull();
    const resumed = await loadAndResume('auto', { apply: false });
    expect(resumed.code).toBe('too_new');
    expect(resumed.restoredFromBackup).toBeUndefined();
    expect(warn.mock.calls.some((c) => /damaged|restored/i.test(String(c[0])))).toBe(false);
    expect(mem).toEqual(before);
    expect(other).toEqual(otherBefore);
  });

  it.each(SHAPES)('the same for a newer record in the %s shape', async (shape) => {
    const g = game('Shapes', 102);
    const t0 = Date.now() - 60_000;
    const mem = new Map<string, string>([
      [SAVE, newerRecord(shape, g, t0 + 1000)],
      [BACKUP, current(g, t0)],
    ]);
    setStorageBackend(createMemoryBackend(mem));
    const r = await loadGameDetailed('auto');
    expect(r.code).toBe('too_new');
    expect(r.error).toBe(MESSAGE);
    expect(r.restoredFromBackup).toBeUndefined();
  });

  it('a newer record only in another backend (a newer build’s pagehide copy) stops the load just the same', async () => {
    const g = game('Two stores', 103);
    const t0 = Date.now() - 60_000;
    const newer = newerRecord('header', g, t0 + 1000);
    setStorageBackend(createMemoryBackend(new Map([[SAVE, current(g, t0)], [BACKUP, current(g, t0 - 1000)]])), [], [named('localstorage', new Map([[SAVE, newer]]))]);
    const r = await loadGameDetailed('auto');
    expect(r.code).toBe('too_new');
    expect(r.state).toBeUndefined();
    // With IndexedDB as the save store the load first moves the newest copy across: the newer record arrives byte for
    // byte (so the next write meets it there), and the load still reports too_new.
    const idb = new Map<string, string>([[SAVE, current(g, t0)], [BACKUP, current(g, t0 - 1000)]]);
    setStorageBackend(named('indexeddb', idb), [], [named('localstorage', new Map([[SAVE, newer]]))]);
    expect((await loadGameDetailed('auto')).code).toBe('too_new');
    expect(idb.get(SAVE)).toBe(newer);
  });

  it('loading the slot’s previous copy stops at a newer backup too', async () => {
    const a = game('Shown', 104);
    const b = game('Displaced', 105);
    const t0 = Date.now() - 60_000;
    setStorageBackend(createMemoryBackend(new Map([[SAVE, current(a, t0 + 2000)], [BACKUP, newerRecord('header', b, t0 + 1000)]])), [], [named('localstorage', new Map([[BACKUP, current(b, t0)]]))]);
    const r = await loadGameDetailed('auto.backup');
    expect(r.code).toBe('too_new');
    expect(r.state).toBeUndefined();
    // the slot itself still loads its own (newest) record
    expect((await loadGameDetailed('auto')).state?.saveId).toBe(a.saveId);
  });

  it('the slot stays listed (with its index entry, and from the record header without one)', async () => {
    const g = game('Listed', 106);
    const rec = newerRecord('header', g, Date.now() - 1000);
    const meta = JSON.parse(rec.slice(0, rec.indexOf('\n'))).meta;
    setStorageBackend(createMemoryBackend(new Map([[SAVE, rec], [META, JSON.stringify(meta)]])));
    expect((await listSaves()).map((m) => [m.slot, m.schemaVersion])).toEqual([['auto', NEWER]]);
    setStorageBackend(createMemoryBackend(new Map([[SAVE, rec]])));
    expect((await listSaves()).map((m) => [m.slot, m.schemaVersion])).toEqual([['auto', NEWER]]);
  });
});

describe('PERSIST-014 A2: no write path rotates a too_new record away or overwrites it', () => {
  describe.each(SHAPES)('a newer record in the %s shape', (shape) => {
    it('saveGame leaves it in the primary (and the backup as it was), for this aquarium or another', async () => {
      const g = game('Primary', 201);
      const t0 = Date.now() - 60_000;
      const mem = new Map<string, string>([
        [SAVE, newerRecord(shape, g, t0 + 1000)],
        [BACKUP, current(g, t0)],
      ]);
      const before = new Map(mem);
      setStorageBackend(createMemoryBackend(mem));
      for (const state of [g, game('Another', 202)]) {
        const res = await saveGame(state, 'auto');
        expect(res.ok).toBe(false);
        expect(res.code).toBe('too_new'); // autosave tells the player once, with the refresh line (useAutosave.ts)
        expect(res.message).toBe(MESSAGE);
        expect(mem).toEqual(before);
      }
    });

    it('saveGame keeps it in the backup: the write lands for this aquarium; over another aquarium it is refused', async () => {
      const g = game('Backup', 203);
      const t0 = Date.now() - 60_000;
      const newer = newerRecord(shape, g, t0);
      const mem = new Map<string, string>([
        [SAVE, current(g, t0 + 1000)],
        [BACKUP, newer],
      ]);
      setStorageBackend(createMemoryBackend(mem));
      expect((await saveGame({ ...g, finance: { ...g.finance, money: 999 } }, 'auto')).ok).toBe(true);
      expect(mem.get(BACKUP)).toBe(newer);
      expect((await loadGameDetailed('auto')).state?.finance.money).toBe(999);
      // the primary holds another aquarium: rotating it is the only way to keep it, so nothing is written
      const other = game('Other', 204);
      mem.set(SAVE, current(other, t0 + 2000));
      const before = new Map(mem);
      const res = await saveGame(g, 'auto');
      expect(res.ok).toBe(false);
      expect(res.message).toBe(MESSAGE);
      expect(mem).toEqual(before);
    });

    it('saveGameSync, with localStorage as the save store, leaves it in the primary and the backup', async () => {
      const g = game('Sync', 205);
      const t0 = Date.now() - 60_000;
      const ls = new Map<string, string>([
        [SAVE, newerRecord(shape, g, t0 + 1000)],
        [BACKUP, current(g, t0)],
      ]);
      setStorageBackend(named('localstorage', ls));
      setSyncStore(syncStoreOver(ls));
      let before = new Map(ls);
      expect(saveGameSync(g, 'auto')).toBe(false);
      expect(saveGameSync(game('Another', 206), 'auto')).toBe(false);
      expect(ls).toEqual(before);
      // in the backup: a write of this aquarium lands; one over another aquarium is refused
      const newer = newerRecord(shape, g, t0);
      ls.set(SAVE, current(g, t0 + 1000));
      ls.set(BACKUP, newer);
      expect(saveGameSync({ ...g, finance: { ...g.finance, money: 777 } }, 'auto')).toBe(true);
      expect(ls.get(BACKUP)).toBe(newer);
      ls.set(SAVE, current(game('Other', 207), t0 + 2000));
      before = new Map(ls);
      expect(saveGameSync(g, 'auto')).toBe(false);
      expect(ls).toEqual(before);
    });

    it('saveGameSync, mirroring for IndexedDB, leaves a newer pagehide copy in localStorage unchanged', async () => {
      const g = game('Mirror', 208);
      const t0 = Date.now() - 60_000;
      const idb = new Map<string, string>([[SAVE, current(g, t0)]]);
      const ls = new Map<string, string>([
        [SAVE, newerRecord(shape, g, t0 + 1000)],
        [BACKUP, newerRecord(shape, g, t0 + 500)],
      ]);
      const idbBefore = new Map(idb);
      const lsBefore = new Map(ls);
      setStorageBackend(named('indexeddb', idb), [], [named('localstorage', ls)]);
      setSyncStore(syncStoreOver(ls));
      expect(saveGameSync(g, 'auto')).toBe(false);
      expect(ls).toEqual(lsBefore);
      expect(idb).toEqual(idbBefore);
    });

    it('moving saves between backends leaves it in the target’s primary and backup', async () => {
      const g = game('Reconcile', 209);
      const t0 = Date.now() - 60_000;
      // a newer v1 copy elsewhere (this build's own pagehide copy) must not replace or rotate the newer record
      for (const key of [SAVE, BACKUP]) {
        resetSaveReconciliation(['memory']);
        const target = new Map<string, string>([
          [SAVE, current(g, t0)],
          [BACKUP, current(g, t0 - 1000)],
        ]);
        target.set(key, newerRecord(shape, g, key === SAVE ? t0 : t0 - 1000));
        const before = new Map(target);
        const elsewhere = new Map<string, string>([[SAVE, current(g, t0 + 5000)]]);
        setStorageBackend(named('memory', target), [], [named('localstorage', elsewhere)]);
        await reconcileSaves();
        expect(target).toEqual(before);
        expect(elsewhere.has(SAVE)).toBe(true);
      }
    });
  });

  it('a newer build’s pagehide copy (and stamp) keeps an older tab off the slot until no newer record is left', async () => {
    const g = game('Stamp', 210);
    const t0 = Date.now() - 60_000;
    const idb = new Map<string, string>([
      [SAVE, current(g, t0)],
      [BACKUP, current(g, t0 - 1000)],
    ]);
    const ls = new Map<string, string>();
    setStorageBackend(named('indexeddb', idb), [], [named('localstorage', ls)]);
    setSyncStore(syncStoreOver(ls));
    // This build stamps what it writes with its save format…
    expect(saveGameSync(g, 'auto')).toBe(true);
    expect(JSON.parse(ls.get(STAMP)!).schemaVersion).toBe(SCHEMA_VERSION);
    // …and a newer build's tab then wrote the slot last: its record only reached localStorage (pagehide).
    ls.set(SAVE, newerRecord('header', g, t0 + 50_000));
    ls.delete(BACKUP);
    ls.set(STAMP, JSON.stringify({ savedAt: t0 + 50_000, saveId: g.saveId, tab: 'newer-tab', hour: g.clock.hour, schemaVersion: NEWER }));
    const idbBefore = new Map(idb);
    const lsBefore = new Map(ls);
    expect(saveGameSync(g, 'auto')).toBe(false);
    const res = await saveGame(g, 'auto');
    expect(res.ok).toBe(false);
    expect(res.message).toBe(MESSAGE);
    expect(idb).toEqual(idbBefore);
    expect(ls).toEqual(lsBefore);
    // The stamp alone is not enough once no newer record is stored anywhere: the regular save lands and re-stamps.
    ls.delete(SAVE);
    expect((await saveGame(g, 'auto')).ok).toBe(true);
    expect(JSON.parse(ls.get(STAMP)!).schemaVersion).toBe(SCHEMA_VERSION);
    expect(saveGameSync(g, 'auto')).toBe(true);
  });

  it('the stale-tab rule’s “this tab played further” never takes a newer build’s save back', async () => {
    const g = game('Further', 211);
    const h0 = g.clock.hour;
    const idb = new Map<string, string>();
    const ls = new Map<string, string>();
    setStorageBackend(named('indexeddb', idb), [], [named('localstorage', ls)]);
    setSyncStore(syncStoreOver(ls));
    expect((await saveGame(g, 'auto')).ok).toBe(true);
    // A newer build's tab then saved the same aquarium one game hour on (a glance), with its stamp.
    const at = Date.now() + 1000;
    idb.set(SAVE, newerRecord('header', { ...g, clock: { ...g.clock, hour: h0 + 1 } }, at));
    ls.set(STAMP, JSON.stringify({ savedAt: at, saveId: g.saveId, tab: 'newer-tab', hour: h0 + 1, schemaVersion: NEWER }));
    const idbBefore = new Map(idb);
    const lsBefore = new Map(ls);
    const further = { ...g, clock: { ...g.clock, hour: h0 + 24 } } as GameState;
    expect((await saveGame(further, 'auto')).message).toBe(MESSAGE);
    expect(saveGameSync(further, 'auto')).toBe(false);
    expect(idb).toEqual(idbBefore);
    expect(ls).toEqual(lsBefore);
  });
});

/**
 * The species ids (ALL_SPECIES, src/data/species) and tank sizes (TANK_TIERS ids, src/data/catalog/tanks.ts) each save
 * format knows, written out literally on purpose (ADR-0016 decision 2, PERSIST-003 A6). An older build only refuses a
 * save holding a species or a tank size it doesn't know because that save says it is newer: so a change that adds one
 * raises SCHEMA_VERSION (with its migration, test and docs entry, PERSIST-003 A4) and adds the new format's lists here.
 * Never edit an existing entry to make this pass.
 */
const KNOWN_AT: Record<number, { species: string[]; tankTiers: string[] }> = {
  1: {
    species: [
      'african_dwarf_frog',
      'amano_shrimp',
      'axolotl',
      'banded_archerfish',
      'banggai_cardinalfish',
      'betta',
      'bristlenose_pleco',
      'bumblebee_goby',
      'cardinal_tetra',
      'cherry_shrimp',
      'cleaner_shrimp',
      'clown_goby',
      'comet_goldfish',
      'coral_beauty',
      'discus',
      'dwarf_crayfish',
      'dwarf_lionfish',
      'endlers_livebearer',
      'fancy_goldfish',
      'fancy_guppy',
      'figure_eight_puffer',
      'firefish',
      'foxface_rabbitfish',
      'green_chromis',
      'hermit_crab',
      'hillstream_loach',
      'honey_gourami',
      'kole_tang',
      'kuhli_loach',
      'lined_seahorse',
      'mandarin_dragonet',
      'medaka',
      'miniatus_grouper',
      'mystery_snail',
      'neon_tetra',
      'nerite_snail',
      'ocellaris_clownfish',
      'otocinclus',
      'panda_corydoras',
      'pea_puffer',
      'peacock_mantis_shrimp',
      'peppermint_shrimp',
      'royal_gramma',
      'sailfin_molly',
      'trochus_snail',
      'watchman_goby',
      'white_cloud_minnow',
      'yellow_tang',
    ],
    tankTiers: ['g5', 'g10', 'g20L', 'g29', 'g40B', 'g55', 'g75', 'g90', 'g125', 'g180', 'g240', 'g300', 'g500', 'g600', 'g800', 'g1000'],
  },
};

describe('PERSIST-014 A5 / ADR-0016 decision 2: a new species or tank size raises SCHEMA_VERSION', () => {
  it(`the species and tank sizes are exactly the ones pinned for save format v${SCHEMA_VERSION}`, () => {
    const pinned = KNOWN_AT[SCHEMA_VERSION];
    expect(pinned, `pin the species ids and tank tiers known at save format v${SCHEMA_VERSION} in KNOWN_AT`).toBeDefined();
    expect(ALL_SPECIES.map((s) => s.id).sort(), 'a species was added or removed: raise SCHEMA_VERSION (ADR-0016 decision 2)').toEqual([...pinned.species].sort());
    expect(TANK_TIERS.map((t) => t.id).sort(), 'a tank size was added or removed: raise SCHEMA_VERSION (ADR-0016 decision 2)').toEqual([...pinned.tankTiers].sort());
  });
});
