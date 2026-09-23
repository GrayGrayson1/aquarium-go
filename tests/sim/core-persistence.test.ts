// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { newGame } from '@/sim/newGame';
import {
  encodeRecord,
  decodeRecord,
  saveGame,
  loadGame,
  loadGameDetailed,
  listSaves,
  deleteSave,
  setStorageBackend,
  createMemoryBackend,
  rawSlot,
  exportSaveText,
  importSaveText,
  stateHash,
  MAX_INLINE_DATA_URL,
  SCHEMA_VERSION,
} from '@/persistence';
import { richSaveState, findNonFinite } from '@/dev/fixtures/core-testkit';

beforeEach(() => {
  setStorageBackend(createMemoryBackend());
});

describe('core persistence: serialize / roundtrip', () => {
  it('a fresh game needs no repairs', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Fresh', seed: 11 });
    const d = decodeRecord(encodeRecord(g, 'auto').text);
    expect(d.repairs).toEqual([]);
    expect(d.fromVersion).toBe(SCHEMA_VERSION);
  });

  it('preserves creature ids, lineage, listings and breeding state', () => {
    const g = richSaveState();
    const d = decodeRecord(encodeRecord(g, 'slot1').text).state;
    expect(Object.keys(d.creatures).sort()).toEqual(Object.keys(g.creatures).sort());
    for (const c of Object.values(g.creatures)) {
      expect(d.creatures[c.id].lineage).toEqual(c.lineage);
      expect(d.creatures[c.id].repro).toEqual(c.repro);
      expect(d.creatures[c.id].genome).toEqual(c.genome);
      expect(d.creatures[c.id].status).toBe(c.status);
    }
    expect(d.clutches).toEqual(g.clutches);
    expect(d.market.listings).toEqual(g.market.listings);
    expect(d.tankOrder).toEqual(g.tankOrder);
    expect(d.rngState).toBe(g.rngState);
    expect(d.idCounter).toBeGreaterThanOrEqual(g.idCounter);
  });

  it('roundtrip is idempotent (hash stable across repeated save/load)', () => {
    const once = decodeRecord(encodeRecord(richSaveState(), 'a').text).state;
    const twice = decodeRecord(encodeRecord(once, 'a').text).state;
    expect(stateHash(twice)).toBe(stateHash(once));
  });

  it('strips huge embedded photos but keeps small ones', () => {
    const g = richSaveState();
    const big = 'data:image/png;base64,' + 'A'.repeat(MAX_INLINE_DATA_URL + 10);
    g.market.listings[0].snapshot.photo = big;
    const { text, stats } = encodeRecord(g, 'x');
    expect(stats.strippedDataUrls).toBe(1);
    expect(text.length).toBeLessThan(MAX_INLINE_DATA_URL);
    const d = decodeRecord(text).state;
    expect(d.market.listings[0].snapshot.photo).toBeUndefined();
    const small = richSaveState();
    const d2 = decodeRecord(encodeRecord(small, 'x').text).state;
    expect(d2.market.listings[0].snapshot.photo).toBe(small.market.listings[0].snapshot.photo);
  });

  it('never writes NaN / Infinity and drops transient fields', () => {
    const g = richSaveState();
    const c = Object.values(g.creatures)[0];
    c.stats.stress = Number.NaN;
    c.sizeCm = Number.POSITIVE_INFINITY;
    g.offlineGrace = true;
    const { text, stats } = encodeRecord(g, 'x');
    expect(stats.fixedNumbers).toBe(2);
    const d = decodeRecord(text).state;
    expect(findNonFinite(d)).toEqual([]);
    expect(d.offlineGrace).toBeUndefined();
  });

  it('detects a truncated record via checksum', () => {
    const { text } = encodeRecord(richSaveState(), 'x');
    expect(() => decodeRecord(text.slice(0, text.length - 40))).toThrow();
  });
});

describe('core persistence: slots, backup and corruption', () => {
  it('saves, lists and loads slots (newest first)', async () => {
    const a = newGame({ starterId: 'axolotl', starterName: 'A', seed: 1 });
    const b = newGame({ starterId: 'lined_seahorse', starterName: 'B', seed: 2 });
    expect((await saveGame(a, 'slot1')).ok).toBe(true);
    await new Promise((r) => setTimeout(r, 5));
    expect((await saveGame(b, 'auto')).ok).toBe(true);
    const list = await listSaves();
    expect(list.map((s) => s.slot)).toEqual(['auto', 'slot1']);
    expect(list[0].starterId).toBe('lined_seahorse');
    expect(list[1].creatures).toBeGreaterThan(0);
    const loaded = await loadGame('slot1');
    expect(loaded?.starterId).toBe('axolotl');
    await deleteSave('slot1');
    expect((await listSaves()).map((s) => s.slot)).toEqual(['auto']);
  });

  it('refuses to save showcase worlds', async () => {
    const g = newGame({ starterId: 'betta', starterName: 'S', seed: 3 });
    g.isShowcase = true;
    expect((await saveGame(g, 'auto')).ok).toBe(false);
    expect(await loadGame('auto')).toBeNull();
  });

  it('falls back to the backup when the primary is corrupted, and never overwrites a good backup with a bad one', async () => {
    const g1 = newGame({ starterId: 'betta', starterName: 'One', seed: 5 });
    g1.finance.money = 111;
    const g2 = { ...g1, finance: { ...g1.finance, money: 222 } };
    await saveGame(g1, 'slot2');
    await saveGame(g2, 'slot2');
    const text = (await rawSlot.get('slot2')) as string;
    await rawSlot.set('slot2', text.slice(0, Math.floor(text.length / 2)));
    const r = await loadGameDetailed('slot2');
    expect(r.ok).toBe(true);
    expect(r.restoredFromBackup).toBe(true);
    expect(r.state?.finance.money).toBe(111);

    // Saving over the damaged primary must keep the good backup (g1), not rotate the damaged record into it.
    const g3 = { ...g1, finance: { ...g1.finance, money: 333 } };
    await rawSlot.set('slot2', '{"garbage":');
    await saveGame(g3, 'slot2');
    const backup = decodeRecord(await rawSlot.getBackup('slot2')).state;
    expect(backup.finance.money).toBe(111);

    // Both damaged → friendly failure, no throw.
    await rawSlot.set('slot2', 'nope');
    const mem = createMemoryBackend();
    setStorageBackend(mem);
    await mem.set('aquarium-go.save.slot2', 'nope');
    await mem.set('aquarium-go.save.slot2.backup', 'also nope');
    const bad = await loadGameDetailed('slot2');
    expect(bad.ok).toBe(false);
    expect(typeof bad.error).toBe('string');
  });

  it('loads the first (object) save format written by the prototype', async () => {
    const g = newGame({ starterId: 'pea_puffer', starterName: 'Old', seed: 8 });
    const seeded = new Map<string, string>([['aquarium-go.save.auto', JSON.parse(JSON.stringify(g)) as unknown as string]]);
    setStorageBackend(createMemoryBackend(seeded));
    const loaded = await loadGame('auto');
    expect(loaded?.starterId).toBe('pea_puffer');
    expect((await listSaves())[0]?.slot).toBe('auto');
  });

  it('falls back to the next backend when the current one throws', async () => {
    const broken = createMemoryBackend();
    broken.set = async () => {
      throw new Error('QuotaExceededError');
    };
    const spare = createMemoryBackend();
    setStorageBackend(broken, [spare]);
    const g = newGame({ starterId: 'betta', starterName: 'Q', seed: 9 });
    const r = await saveGame(g, 'auto');
    expect(r.ok).toBe(true);
    expect(r.backend).toBe('memory');
    expect((await loadGame('auto'))?.saveId).toBe(g.saveId);
  });
});

describe('core persistence: export / import', () => {
  it('exports and re-imports a save file', async () => {
    const g = richSaveState();
    const text = exportSaveText(g);
    const r = await importSaveText(text, 'slot3');
    expect(r.ok).toBe(true);
    expect(r.slot).toBe('slot3');
    expect(Object.keys(r.state!.creatures).sort()).toEqual(Object.keys(g.creatures).sort());
    expect((await loadGame('slot3'))?.saveId).toBe(g.saveId);
  });

  it('gives friendly errors for bad files', async () => {
    expect((await importSaveText('')).error).toMatch(/empty/i);
    expect((await importSaveText('hello there')).error).toMatch(/isn't JSON|isn't an Aquarium Go save/i);
    expect((await importSaveText('{"hello":1}')).error).toMatch(/isn't an Aquarium Go save/i);
    expect((await importSaveText('{"tanks":{')).error).toMatch(/JSON|damaged/i);
    const future = JSON.parse(JSON.stringify(newGame({ starterId: 'betta', starterName: 'F', seed: 4 })));
    future.schemaVersion = SCHEMA_VERSION + 5;
    const r = await importSaveText(JSON.stringify(future));
    expect(r.ok).toBe(false);
    expect(r.code).toBe('too_new');
    expect(r.error).toMatch(/newer version/i);
  });
});
