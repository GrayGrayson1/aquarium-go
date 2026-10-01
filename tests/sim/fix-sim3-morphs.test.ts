/**
 * Round-3 lane SIM (R02-06) — morphs S16-05 renamed keep one name and one discovery in saves from before it.
 */
import { describe, it, expect } from 'vitest';
import { newGame, previewStarters } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { getSpecies } from '@/data/species';
import { renamedMorphs } from '@/sim/life/genetics';
import { migrateSave } from '@/persistence/migrations';
import { clonePlain } from '@/sim/economy/util';

describe('R02-06 — renamed overlay morphs in old saves', () => {
  it('knows the old names', () => {
    expect(renamedMorphs(getSpecies('cherry_shrimp')).get('Red High Grade Cherry')).toBe('High Grade Red Cherry');
    expect(renamedMorphs(getSpecies('betta')).size).toBe(0);
  });

  it('renames living animals and the discovered list, without duplicate discoveries', () => {
    const pv = previewStarters(5).betta;
    const g = newGame({ starterId: 'betta', starterName: pv.name, seed: 5, starterCreature: pv });
    const t = createTank(g, 'g10', 'freshwater_tropical', { cycled: true, name: 'Shrimp' });
    const c = addCreature(g, createCreature(g, simRng(g), 'cherry_shrimp', { ageDays: 60 }), t.id);
    c.morphName = 'Red High Grade Cherry';
    g.progress.discoveredMorphs.push('cherry_shrimp:Red High Grade Cherry', 'cherry_shrimp:High Grade Red Cherry', 'cherry_shrimp:Red Cherry');
    const before = g.progress.discoveredMorphs.length;
    const { state } = migrateSave(clonePlain(g));
    expect(state.creatures[c.id].morphName).toBe('High Grade Red Cherry');
    const shrimp = state.progress.discoveredMorphs.filter((k) => k.startsWith('cherry_shrimp:'));
    expect(shrimp).toEqual(['cherry_shrimp:High Grade Red Cherry', 'cherry_shrimp:Red Cherry']);
    expect(state.progress.discoveredMorphs.length).toBe(before - 1);
    // the starter's own (unchanged) morph is untouched
    expect(state.creatures[Object.values(g.creatures).find((x) => x.isStarter)!.id].morphName).toBe(Object.values(g.creatures).find((x) => x.isStarter)!.morphName);
  });
});
