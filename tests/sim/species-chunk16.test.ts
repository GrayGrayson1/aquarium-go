/**
 * Chunk 16 (ADR-0052): the new species' rules the data alone can't show.
 *  - Decision 4 with round 2's decision 9: a new species needs no research of its own, but the shop stocks it once the
 *    player can keep its water type, and restocks it the moment that research completes.
 *  - Decision 3: anthias and melanurus wrasse change sex socially (special.socialSexChange) though the game doesn't
 *    breed them; other non-breedable protogynous species (the coral beauty) are unchanged.
 *  - SPC-002: the living bubble-tip anemone splits in two by itself once settled and well fed (fission).
 */
import { describe, expect, it } from 'vitest';
import type { GameState, WaterClass } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { advanceWorld } from '@/sim/world';
import { ALL_SPECIES, findSpecies } from '@/data/species';
import { ROSTER } from '@/data/species/roster';
import { isSpeciesAvailable, requiredUnlocks, stockNewUnlocks } from '@/sim/economy/shop';
import { unlock, waterClassKeys, waterClassLock } from '@/sim/facility';

const NEW_IDS = ROSTER.filter((r) => r.unlock === 'open').map((r) => r.id);
const WATER: WaterClass[] = ['freshwater_cool', 'freshwater_tropical', 'freshwater_planted', 'marine_fowlr', 'marine_live_rock', 'reef', 'brackish'];

const game = (starterId: 'betta' | 'axolotl' | 'pea_puffer' | 'ocellaris_clownfish' | 'lined_seahorse', seed = 1): GameState => newGame({ starterId, starterName: '', seed });

describe('ADR-0052 decision 9: a new species comes into the shop with its water type', () => {
  it('waterClassKeys is the same rule as waterClassLock for every water type', () => {
    for (const wc of WATER) {
      const g = game('betta');
      const keys = waterClassKeys(wc);
      expect(waterClassLock(g, wc) === null, `${wc} before its keys`).toBe(keys.length === 0);
      for (const k of keys) unlock(g, k, { silent: true });
      expect(waterClassLock(g, wc), `${wc} after ${keys.join(', ')}`).toBeNull();
    }
  });

  it('every new species has no research of its own and keys only from its water', () => {
    expect(NEW_IDS.length).toBeGreaterThan(0);
    for (const id of NEW_IDS) {
      const sp = findSpecies(id)!;
      expect(sp.unlock.requires, id).toEqual([]);
      const easiest = Math.min(...sp.waterClasses.map((wc) => waterClassKeys(wc).length));
      expect(requiredUnlocks(sp).length, id).toBe(easiest);
    }
  });

  it('a freshwater starter is offered no new marine species on day one, over many seeds', () => {
    for (const starter of ['betta', 'axolotl', 'pea_puffer'] as const) {
      for (let seed = 1; seed <= 12; seed++) {
        const g = game(starter, seed);
        for (const o of g.market.stock) {
          const sp = findSpecies(o.speciesId)!;
          if (NEW_IDS.includes(sp.id)) expect(sp.environment, `${starter} seed ${seed}: ${sp.id}`).not.toBe('marine');
        }
        for (const id of NEW_IDS) if (findSpecies(id)!.environment === 'marine') expect(isSpeciesAvailable(g, id), id).toBe(false);
      }
    }
  });

  it('Marine Systems makes the new marine species available, and the shop stocks some of them at once', () => {
    const g = game('betta', 3);
    const marine = NEW_IDS.filter((id) => findSpecies(id)!.environment === 'marine' && findSpecies(id)!.waterClasses.some((wc) => wc !== 'reef'));
    unlock(g, 'marine_basics', { silent: true });
    for (const id of marine) expect(isSpeciesAvailable(g, id), id).toBe(true);
    const before = new Set(g.market.stock.map((o) => o.speciesId));
    stockNewUnlocks(g, simRng(g), g.clock.hour, false);
    const fresh = g.market.stock.map((o) => o.speciesId).filter((id) => !before.has(id));
    expect(fresh.some((id) => marine.includes(id)), `fresh offers: ${fresh.join(', ')}`).toBe(true);
  });

  it('a marine starter can be offered the new marine species from day one', () => {
    let seen = 0;
    for (let seed = 1; seed <= 6; seed++) seen += game('ocellaris_clownfish', seed).market.stock.filter((o) => NEW_IDS.includes(o.speciesId)).length;
    expect(seen).toBeGreaterThan(0);
  });
});

describe('ADR-0052 decision 3: social sex change in species the game does not breed', () => {
  function tankOf(g: GameState, speciesId: string, count: number) {
    const t = createTank(g, 'g180', 'marine_live_rock', { cycled: true, placement: { x: 0, z: 2, rotY: 0 }, name: 'Reef' });
    const rng = simRng(g);
    const fish = Array.from({ length: count }, () => {
      const c = createCreature(g, rng, speciesId, { ageDays: 40 });
      c.sex = 'female';
      c.reproRole = 'female';
      addCreature(g, c, t.id);
      return c;
    });
    return { t, fish };
  }

  // nobody feeds a test tank, and a starving fish (health under 40) is passed over: keep them fed
  const fed = (g: GameState, ids: string[]) => {
    for (const id of ids) if (g.creatures[id]) g.creatures[id].stats.hunger = 10;
  };

  it('five female anthias make one male within a few days, and only one', () => {
    const g = game('ocellaris_clownfish');
    const { fish } = tankOf(g, 'lyretail_anthias', 5);
    for (let h = 0; h < 120; h++) {
      fed(g, fish.map((c) => c.id));
      advanceWorld(g, 1, {});
    }
    const alive = fish.map((c) => g.creatures[c.id]).filter((c) => c && c.status === 'alive');
    expect(alive.filter((c) => c.sex === 'male').length).toBe(1);
    expect(alive.filter((c) => c.sex === 'female').length).toBe(alive.length - 1);
    expect(g.log.some((e) => /has become the male of the lyretail anthias group\.$/.test(e.text))).toBe(true);
  });

  it('the melanurus wrasse does the same', () => {
    const g = game('ocellaris_clownfish');
    const { fish } = tankOf(g, 'melanurus_wrasse', 3);
    for (let h = 0; h < 120; h++) {
      fed(g, fish.map((c) => c.id));
      advanceWorld(g, 1, {});
    }
    expect(fish.map((c) => g.creatures[c.id]).filter((c) => c?.sex === 'male').length).toBe(1);
  });

  it('coral beauties (no social sex change in the data) stay as they were', () => {
    const g = game('ocellaris_clownfish');
    const { fish } = tankOf(g, 'coral_beauty', 3);
    for (let h = 0; h < 120; h++) {
      fed(g, fish.map((c) => c.id));
      advanceWorld(g, 1, {});
    }
    expect(fish.map((c) => g.creatures[c.id]).filter((c) => c?.sex === 'male').length).toBe(0);
  });

  it('only the harem species of chunk 16 carry the flag, and all are protogynous', () => {
    const flagged = ALL_SPECIES.filter((s) => s.special?.socialSexChange).map((s) => s.id).sort();
    expect(flagged).toEqual(['flame_angelfish', 'flame_hawkfish', 'lyretail_anthias', 'melanurus_wrasse']);
    for (const id of flagged) expect(findSpecies(id)!.sexSystem).toBe('protogynous');
  });
});

describe('ADR-0052 / SPC-002: a settled, well-fed bubble-tip splits in two (fission)', () => {
  function reef(g: GameState, size: 'g180' | 'g29', count: number) {
    const t = createTank(g, size, 'reef', { cycled: true, placement: { x: 0, z: 2, rotY: 0 }, name: 'Reef' });
    const rng = simRng(g);
    const anemones = Array.from({ length: count }, () => {
      const c = createCreature(g, rng, 'bubbletip_anemone', { ageDays: 60 });
      addCreature(g, c, t.id);
      c.acquiredHour = g.clock.hour - 20 * 24; // settled in long ago
      return c;
    });
    return { t, anemones };
  }
  // the keeper's hand: feeding held where the test wants it, and a broken heater or pump mended at once (over a month a
  // unit fails now and then, and a heater stuck on would cook the tank — not what these tests are about)
  const keep = (g: GameState, hunger: number) => {
    for (const c of Object.values(g.creatures)) if (c.speciesId === 'bubbletip_anemone' && c.status === 'alive') c.stats.hunger = hunger;
    for (const t of Object.values(g.tanks)) for (const e of t.equipment) if (e.failed) {
      e.failed = false;
      delete e.failMode;
      e.on = true;
    }
  };
  const run = (g: GameState, hours: number, hunger: number) => {
    for (let h = 0; h < hours; h++) {
      keep(g, hunger);
      advanceWorld(g, 1, {});
    }
  };
  const anemonesIn = (g: GameState, tankId: string) => Object.values(g.creatures).filter((c) => c.tankId === tankId && c.speciesId === 'bubbletip_anemone' && c.status === 'alive');

  it('splits within a month into a clone: same genes, sex and look, a smaller half that grows, a message', () => {
    const g = game('ocellaris_clownfish', 3);
    const { t, anemones } = reef(g, 'g180', 1);
    const parent = anemones[0];
    let h = 0;
    for (; h < 30 * 24 && anemonesIn(g, t.id).length < 2; h++) run(g, 1, 10);
    const now = anemonesIn(g, t.id);
    expect(now.length, 'split within 30 days').toBe(2);
    const clone = now.find((c) => c.lineage.motherId === parent.id)!;
    expect(clone).toBeDefined();
    expect(clone.genome.alleles).toEqual(g.creatures[parent.id].genome.alleles);
    expect(clone.morphName).toBe(g.creatures[parent.id].morphName);
    expect(clone.sex).toBe(g.creatures[parent.id].sex);
    const born = clone.sizeCm;
    expect(born).toBeLessThan(g.creatures[parent.id].sizeCm * 0.9);
    run(g, 20 * 24, 10);
    expect(g.creatures[clone.id].sizeCm).toBeGreaterThan(born); // and grows back
    expect(clone.history[0].text).toMatch(/^Split from /);
    expect(g.log.some((e) => /has split in two! The new bubble-tip anemone, .+, is its clone\.$/.test(e.text))).toBe(true);
  });

  it('rests between splits: one parent splits at most once in its cooldown', () => {
    const g = game('ocellaris_clownfish', 4);
    const { anemones } = reef(g, 'g180', 1);
    run(g, 30 * 24, 10);
    const splits = (g.creatures[anemones[0].id].history ?? []).filter((e) => e.kind === 'bred' && e.text.startsWith('Split')).map((e) => e.hour);
    for (let i = 1; i < splits.length; i++) expect(splits[i] - splits[i - 1]).toBeGreaterThanOrEqual(findSpecies('bubbletip_anemone')!.breeding.cooldownDays * 24);
  });

  it('a hungry one never splits, and a small tank holds only one', () => {
    const g = game('ocellaris_clownfish', 5);
    const hungry = reef(g, 'g180', 1);
    run(g, 30 * 24, 60);
    expect(anemonesIn(g, hungry.t.id)).toHaveLength(1);
    const h = game('ocellaris_clownfish', 6);
    const small = reef(h, 'g29', 1);
    run(h, 30 * 24, 10);
    expect(anemonesIn(h, small.t.id)).toHaveLength(1);
  });
});
