/**
 * chunk 17 (ADR-0053 decisions 4 and 9, BIG-007) — the tank gate: the shop stocks a species only once the player has
 * unlocked the smallest tank that holds an adult (gallons and footprint), on top of its research; a locked card says
 * what is still missing, built from the unlock rules' hints (the owner's words, round 3).
 */
import { describe, expect, it } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { simRng } from '@/sim/rng';
import { ALL_SPECIES, findSpecies } from '@/data/species';
import { TANK_TIERS } from '@/data/catalog/tanks';
import { isSpeciesAvailable, requiredUnlocks, speciesLockHint, stockNewUnlocks } from '@/sim/economy/shop';
import { tankKeyFor, tankTierFor, unlock } from '@/sim/facility';

const game = (starterId: 'betta' | 'axolotl' | 'pea_puffer' | 'ocellaris_clownfish' | 'lined_seahorse', seed = 1): GameState => newGame({ starterId, starterName: '', seed });

/** The design's table (BIG-TANKS.md §3), computed on 27f9d55: the 32 of the 79 species that gain a tank key. */
const GATED_79: Record<string, string[]> = {
  tank_40: ['freshwater_angelfish', 'swordtail', 'fancy_goldfish', 'royal_gramma', 'green_chromis', 'banggai_cardinalfish', 'watchman_goby', 'maroon_clownfish', 'fighting_conch', 'sixline_wrasse', 'lawnmower_blenny', 'flame_hawkfish', 'bubbletip_anemone', 'mandarin_dragonet', 'peacock_mantis_shrimp'],
  tank_55: ['melanurus_wrasse'],
  tank_75: ['comet_goldfish', 'discus', 'coral_beauty', 'flame_angelfish', 'dwarf_lionfish'],
  tank_90: ['kole_tang'],
  tank_125: ['yellow_tang', 'foxface_rabbitfish', 'chocolate_tang', 'lyretail_anthias', 'elegant_starfish', 'sand_sifting_starfish', 'banded_archerfish'],
  tank_180: ['sailfin_tang', 'miniatus_grouper'],
  tank_240: ['emperor_angelfish'],
};

/** The big-tank species chunk 17 adds (each waits for its own research as well; species-chunk17.test.ts). */
const CHUNK17 = new Set(['oscar', 'clown_loach', 'black_ghost_knifefish', 'fahaka_puffer', 'ornate_bichir', 'silver_arowana', 'koi', 'silver_mono', 'spotted_scat', 'blue_tang', 'naso_tang', 'queen_angelfish', 'clown_triggerfish', 'panther_grouper', 'motoro_stingray', 'coral_catshark', 'epaulette_shark', 'brownbanded_bamboo_shark']);

describe('BIG-007: the tank gate', () => {
  it('every species fits a tank tier (a species no tank holds is a data error)', () => {
    for (const sp of ALL_SPECIES) expect(tankTierFor(sp), sp.id).toBeDefined();
  });

  it('the tank key is the smallest tier that holds an adult, by gallons and footprint', () => {
    for (const sp of ALL_SPECIES) {
      const tier = tankTierFor(sp)!;
      expect(tier.gallons, sp.id).toBeGreaterThanOrEqual(sp.recommendedMinTankGallons);
      const fp = sp.recommendedFootprint;
      const fits = (t: (typeof TANK_TIERS)[number]) => t.gallons >= sp.recommendedMinTankGallons && (!fp || (t.dimsIn.l >= fp.minLengthIn - 0.5 && t.dimsIn.w >= fp.minWidthIn - 0.5));
      for (const t of TANK_TIERS) if (t.gallons < tier.gallons) expect(fits(t), `${sp.id}: ${t.id} is smaller and fits`).toBe(false);
    }
  });

  it('the 79 species released in 0.8.0 wait for the tanks the design lists, and only those', () => {
    const expected = new Map<string, string>();
    for (const [key, ids] of Object.entries(GATED_79)) for (const id of ids) expected.set(id, key);
    expect(expected.size).toBe(32);
    for (const [id, key] of expected) expect(tankKeyFor(findSpecies(id)!), id).toBe(key);
    // the rest of the 0.8.0 species fit the open tiers (5, 10, 20 long, 29), so they gain no key
    const released = ALL_SPECIES.filter((sp) => !CHUNK17.has(sp.id) && tankKeyFor(sp) !== null && !expected.has(sp.id));
    expect(released.map((sp) => sp.id)).toEqual([]);
  });

  it('requiredUnlocks adds the tank key once, after the species’ own keys', () => {
    const emperor = findSpecies('emperor_angelfish')!;
    expect(requiredUnlocks(emperor)).toEqual(['marine_basics', 'tank_240']);
    const gramma = findSpecies('royal_gramma')!;
    expect(requiredUnlocks(gramma)).toEqual(['marine_basics', 'tank_40']);
    const neon = findSpecies('neon_tetra')!;
    expect(requiredUnlocks(neon)).toEqual(['fw_basic']);
    for (const sp of ALL_SPECIES) expect(new Set(requiredUnlocks(sp)).size, sp.id).toBe(requiredUnlocks(sp).length);
  });

  it('the shop waits for the tank, and the player’s own starter is always available', () => {
    const g = game('ocellaris_clownfish');
    expect(isSpeciesAvailable(g, 'ocellaris_clownfish')).toBe(true);
    expect(isSpeciesAvailable(g, 'firefish')).toBe(true); // a 20-gallon fish: no tank key
    expect(isSpeciesAvailable(g, 'royal_gramma')).toBe(false);
    unlock(g, 'tank_40', { silent: true });
    expect(isSpeciesAvailable(g, 'royal_gramma')).toBe(true);
    expect(isSpeciesAvailable(g, 'emperor_angelfish')).toBe(false);
  });

  it('a new game’s shop sells no animal whose tank is still locked, over many seeds and every starter', () => {
    let offers = 0;
    for (const starter of ['betta', 'axolotl', 'pea_puffer', 'ocellaris_clownfish', 'lined_seahorse'] as const) {
      for (let seed = 1; seed <= 10; seed++) {
        const g = game(starter, seed);
        for (const o of g.market.stock) {
          offers++;
          const key = tankKeyFor(findSpecies(o.speciesId)!);
          if (key) expect(g.progress.unlocked, `${starter} seed ${seed}: ${o.speciesId} waits for ${key}`).toContain(key);
        }
      }
    }
    expect(offers).toBeGreaterThan(0);
  });

  it('unlocking a tank size stocks the species it lets in at once', () => {
    let stockedGated = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const g = game('ocellaris_clownfish', seed);
      stockNewUnlocks(g, simRng(g), g.clock.hour, false);
      const before = new Set(g.market.stock.map((o) => o.speciesId));
      unlock(g, 'tank_40', { silent: true });
      stockNewUnlocks(g, simRng(g), g.clock.hour, true);
      const fresh = g.market.stock.map((o) => o.speciesId).filter((id) => !before.has(id));
      for (const id of fresh) expect(tankKeyFor(findSpecies(id)!), `seed ${seed}: ${id} is new because of the tank`).toBe('tank_40');
      stockedGated += fresh.length;
      if (fresh.length) expect(g.log.some((e) => e.kind === 'market' && e.text.startsWith('New arrivals at the shop:')), `seed ${seed}`).toBe(true);
    }
    expect(stockedGated).toBeGreaterThan(0);
  });
});

describe('BIG-007: a locked card says what is still missing (ADR-0053 round 3, the owner’s words)', () => {
  it('research and tank together, then the tank alone', () => {
    const g = game('betta');
    const emperor = findSpecies('emperor_angelfish')!;
    expect(speciesLockHint(g, emperor)).toBe('Research Marine Systems (or reach 150 reputation as a seasoned keeper). It also waits for the 240 Gallon: open a public showroom and reach 360 reputation.');
    unlock(g, 'marine_basics', { silent: true });
    expect(speciesLockHint(g, emperor)).toBe('Comes into the shop with the 240 Gallon: open a public showroom and reach 360 reputation.');
    expect(speciesLockHint(g, findSpecies('royal_gramma')!)).toBe('Comes into the shop with the 40 Gallon Breeder: reach 25 reputation or raise a clutch.');
  });

  it('research alone, when the tank is already unlocked or needs no unlock', () => {
    const g = game('betta');
    expect(speciesLockHint(g, findSpecies('firefish')!)).toBe('Research Marine Systems (or reach 150 reputation as a seasoned keeper).');
    unlock(g, 'tank_240', { silent: true });
    expect(speciesLockHint(g, findSpecies('emperor_angelfish')!)).toBe('Research Marine Systems (or reach 150 reputation as a seasoned keeper).');
  });

  it('nothing to say once the species can be bought, and never for the player’s starter', () => {
    const g = game('betta');
    expect(speciesLockHint(g, findSpecies('zebra_danio')!)).toBeNull();
    expect(speciesLockHint(g, findSpecies('betta')!)).toBeNull();
    for (const sp of ALL_SPECIES) {
      const hint = speciesLockHint(g, sp);
      expect(hint === null, sp.id).toBe(isSpeciesAvailable(g, sp.id));
      if (hint) expect(hint, sp.id).toMatch(/^[A-Z].*\.$/);
    }
  });
});
