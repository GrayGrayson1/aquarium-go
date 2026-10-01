// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { migrateSave, repairState, detectVersion, validateSaveShape, MIGRATIONS, decodeRecord, SCHEMA_VERSION } from '@/persistence';
import { makeLegacyV0Save } from '@/persistence/legacy';
import { advanceWorld } from '@/sim/world';
import { newGame } from '@/sim/newGame';
import { findNonFinite } from '@/dev/fixtures/core-testkit';

describe('core migrations', () => {
  it('has a contiguous chain from v0 to the current schema', () => {
    for (let v = 0; v < SCHEMA_VERSION; v++) expect(MIGRATIONS.find((m) => m.from === v && m.to === v + 1)).toBeTruthy();
  });

  it('upgrades the synthetic v0 legacy save', () => {
    const v0 = makeLegacyV0Save();
    expect(detectVersion(v0)).toBe(0);
    expect(Array.isArray(v0.tanks)).toBe(true);
    const money = v0.money;
    const { state, fromVersion, applied } = migrateSave(v0);
    expect(fromVersion).toBe(0);
    expect(applied.length).toBe(SCHEMA_VERSION);
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.finance.money).toBe(money);
    expect((state as unknown as { money?: number }).money).toBeUndefined();
    expect(state.tankOrder.length).toBe(v0.tanks.length);
    for (const id of state.tankOrder) {
      const t = state.tanks[id];
      expect(t.simDebtHours).toBe(0);
      expect(t.tapPressure).toBe(0);
      expect(t.signage).toBe(false);
      expect(t.water.level).toBe(1);
      expect(t.water.foodByTag).toEqual({});
    }
    expect(state.isShowcase).toBe(false);
    const starter = Object.values(state.creatures)[0];
    expect(state.progress.discoveredMorphs).toContain(`${starter.speciesId}:${starter.morphName}`);
    expect(state.progress.counters).toEqual({});
    expect(starter.visitorWows).toBe(0);
    expect(starter.history).toEqual([]);
    expect(starter.repro.totalOffspringRaised).toBe(0);
    expect(state.market.history).toEqual([]);
    // the caller's object is untouched
    expect(v0.schemaVersion).toBeUndefined();
  });

  it('loads a v0 JSON string through the normal decode path and the result can be simulated', () => {
    const text = JSON.stringify(makeLegacyV0Save());
    const d = decodeRecord(text);
    expect(d.fromVersion).toBe(0);
    advanceWorld(d.state, 24, { focusTankId: d.state.tankOrder[0] });
    expect(findNonFinite(d.state)).toEqual([]);
  });

  it('refuses saves from the future and non-saves', () => {
    const g = JSON.parse(JSON.stringify(newGame({ starterId: 'betta', starterName: 'X', seed: 3 })));
    g.schemaVersion = SCHEMA_VERSION + 1;
    expect(validateSaveShape(g)).toMatch(/newer version/);
    expect(() => migrateSave(g)).toThrow();
    expect(validateSaveShape({ hello: 'world' })).toMatch(/isn't an Aquarium Go save/);
    expect(validateSaveShape(42)).toBeTruthy();
  });

  it('repair drops unknown species, rehomes orphans, keeps ids unique and is idempotent', () => {
    const g = JSON.parse(JSON.stringify(newGame({ starterId: 'axolotl', starterName: 'R', seed: 21 })));
    const starter = Object.values(g.creatures)[0] as { id: string; tankId: string };
    g.creatures.cr_ghost_zz = { ...JSON.parse(JSON.stringify(starter)), id: 'cr_ghost_zz', speciesId: 'unicorn_fish' };
    // lane:fix-core (P5-12): only nextId-shaped ids (`prefix_<n>`) drive the counter — an id like cr_orphan_zz can't
    // collide with one, and counting it (as the starter's cr_starter_<seed> was) changed every id born after a load.
    g.creatures.cr_zz = { ...JSON.parse(JSON.stringify(starter)), id: 'cr_zz', tankId: 'tank_missing' };
    delete g.creatures.cr_zz.stats.hunger;
    g.idCounter = 0;
    g.clock.hour = 'noon';
    const notes = repairState(g);
    expect(g.creatures.cr_ghost_zz).toBeUndefined();
    expect(g.creatures.cr_zz.tankId).toBeNull();
    expect(typeof g.creatures.cr_zz.stats.hunger).toBe('number');
    expect(g.clock.hour).toBe(8);
    expect(g.idCounter).toBeGreaterThanOrEqual(parseInt('zz', 36));
    expect(notes.length).toBeGreaterThan(0);
    expect(repairState(g)).toEqual([]);
  });
});
