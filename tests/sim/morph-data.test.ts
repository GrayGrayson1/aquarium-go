/**
 * Chunk 6 (B-194; ADR-0029 decision 8, ADR-0034 decisions 5 and 6) — the morph data:
 * - no two looks share a name, in any species (the catalog groups phenotypes by name, so a shared name was one discovery
 *   and one tier for two looks; looks reached by two genotype routes, like the cherry shrimp's two Fire Reds, are fine);
 * - the bristlenose's two-copy fin overlay is "Double Long-fin", and saves are renamed from each animal's genes;
 * - a look's "about 1 in n" and tier come from its share of market stock with the seller's pick counted, checked
 *   against the shop's own code (src/sim/economy/shop.ts).
 */
import { describe, it, expect } from 'vitest';
import { findSpecies, listSpecies } from '@/data/species';
import { composeMorphName, resolveMorph } from '@/sim/life/genetics';
import { catalogEntry, morphCatalog, pickedShare } from '@/sim/life/morphCatalog';
import { composition, generateOffer } from '@/sim/economy/shop';
import { mulberry32 } from '@/sim/rng';
import { newGame } from '@/sim/newGame';
import { repairState } from '@/persistence/migrations';
import { OFFER_TIER_WEIGHTS, PICK_ROLLS, SPECIAL_OFFER_SHARE, SPECIAL_PICKED_CHANCE } from '@/data/stocking';
import type { CreatureVisualParams, Genome, PhenotypeRule, SpeciesDefinition } from '@/types';

const bristlenose = findSpecies('bristlenose_pleco')!;
const betta = findSpecies('betta')!;

/** A look as the renderer gets it: the species' base visual, then the base rule's and each overlay's patches. */
function lookOf(sp: SpeciesDefinition, ruleIds: readonly string[]): string {
  const rules = new Map(sp.genetics.phenotypes.map((r) => [r.id, r] as const));
  const v: Partial<CreatureVisualParams> = { ...sp.genetics.baseVisual };
  for (const id of ruleIds) Object.assign(v, (rules.get(id) as PhenotypeRule).visual);
  return JSON.stringify(Object.keys(v).sort().map((k) => [k, (v as Record<string, unknown>)[k]]));
}

const G = (fins: [string, string], xan: [string, string] = ['N', 'N']): Genome =>
  ({ alleles: { albino: ['A', 'A'], xan, leu: ['N', 'N'], fins }, potentials: { size: 50, color: 50, pattern: 50, structure: 50, fertility: 50, hardiness: 50, temperament: 50, curiosity: 50 } }) as Genome;

describe('no two looks share a name (ADR-0029 decision 8)', () => {
  const species = listSpecies(() => true).filter((s) => s.genetics?.phenotypes?.length);
  it.each(species.map((s) => [s.id, s] as const))('%s', (_id, sp) => {
    for (const e of morphCatalog(sp).entries) {
      const looks = new Set(e.phenotypes.map((ph) => lookOf(sp, ph.ruleIds)));
      expect(looks.size, `${sp.id}: "${e.morphName}" names ${looks.size} different looks (${e.phenotypes.map((p) => p.key).join(' ; ')})`).toBe(1);
    }
  });

  it('the check can fail: the old bristlenose overlay name made two looks one', () => {
    const old = { ...bristlenose, genetics: { ...bristlenose.genetics, phenotypes: bristlenose.genetics.phenotypes.map((r) => (r.id === 'super_longfin' ? { ...r, name: 'Super Long-fin' } : r)) } };
    const rules = new Map(old.genetics.phenotypes.map((r) => [r.id, r] as const));
    const superRed = rules.get('super_red')!;
    expect(composeMorphName(old, superRed, [rules.get('longfin')!])).toBe(composeMorphName(old, superRed, [rules.get('super_longfin')!]));
    expect(lookOf(old, ['super_red', 'longfin'])).not.toBe(lookOf(old, ['super_red', 'super_longfin']));
  });
});

describe('the bristlenose’s "Double Long-fin" (ADR-0034 decision 5)', () => {
  it('one copy and two copies of Long-fin have their own names, discoveries and tiers', () => {
    expect(resolveMorph(bristlenose, G(['s', 'L'], ['r', 'r'])).morphName).toBe('Super Red Long-fin');
    expect(resolveMorph(bristlenose, G(['L', 'L'], ['r', 'r'])).morphName).toBe('Super Red Double Long-fin');
    expect(resolveMorph(bristlenose, G(['L', 'L'], ['c', 'c'])).morphName).toBe('Calico Double Long-fin');
    expect(resolveMorph(bristlenose, G(['L', 'L'])).morphName).toBe('Brown (Wild) Double Long-fin');
    expect(catalogEntry(bristlenose, 'Super Red Long-fin')?.phenotypes).toHaveLength(1);
    expect(catalogEntry(bristlenose, 'Super Red Double Long-fin')?.phenotypes).toHaveLength(1);
    expect(morphCatalog(bristlenose).entries.some((e) => e.morphName.includes('Super Long-fin'))).toBe(false);
  });

  it('a save is renamed from each animal’s genes, shop stock and discoveries too; a second repair finds nothing', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 5 }) as unknown as Record<string, any>;
    const tankId = g.tankOrder[0];
    const fish = (id: string, morphName: string, genome: Genome) => ({ ...structuredClone(Object.values(g.creatures)[0] as object), id, speciesId: 'bristlenose_pleco', tankId, morphName, genome, name: id });
    g.creatures.bn1 = fish('bn1', 'Super Red Long-fin', G(['L', 'L'], ['r', 'r'])); // the shared name, two copies
    g.creatures.bn2 = fish('bn2', 'Super Red Long-fin', G(['s', 'L'], ['r', 'r'])); // the shared name, one copy
    g.creatures.bn3 = fish('bn3', 'Calico Super Long-fin', G(['L', 'L'], ['c', 'c']));
    g.creatures.bn4 = fish('bn4', 'Lemon Super Long-fin', null as unknown as Genome); // no genome: the plain rename
    g.market.stock = [{ id: 'offer_bn', kind: 'creature', speciesId: 'bristlenose_pleco', creatures: [fish('bn5', 'Brown (Wild) Super Long-fin', G(['L', 'L']))], price: 50, seller: 'S', expiresHour: 999 }];
    g.progress.discoveredMorphs = ['betta:Red Veiltail', 'bristlenose_pleco:Albino Super Long-fin', 'bristlenose_pleco:Super Red Long-fin', 'bristlenose_pleco:Albino Double Long-fin'];
    const repairs = repairState(g);
    expect(g.creatures.bn1.morphName).toBe('Super Red Double Long-fin');
    expect(g.creatures.bn2.morphName).toBe('Super Red Long-fin');
    expect(g.creatures.bn3.morphName).toBe('Calico Double Long-fin');
    expect(g.creatures.bn4.morphName).toBe('Lemon Double Long-fin');
    expect(g.market.stock[0].creatures[0].morphName).toBe('Brown (Wild) Double Long-fin');
    expect(g.progress.discoveredMorphs).toEqual(['betta:Red Veiltail', 'bristlenose_pleco:Albino Double Long-fin', 'bristlenose_pleco:Super Red Long-fin']);
    expect(repairs.filter((r) => r.includes('B-194'))).toHaveLength(4);
    expect(repairState(g).filter((r) => r.includes('B-194'))).toEqual([]);
  });
});

describe('a look’s share of market stock counts the seller’s pick (ADR-0034 decision 6)', () => {
  const rarePerOffer = OFFER_TIER_WEIGHTS.rare / (OFFER_TIER_WEIGHTS.standard + OFFER_TIER_WEIGHTS.breeder + OFFER_TIER_WEIGHTS.rare);
  const pickedOffer = (1 - SPECIAL_OFFER_SHARE) * rarePerOffer + SPECIAL_OFFER_SHARE * SPECIAL_PICKED_CHANCE;

  it('the picked share follows the offer sizes: singles and pairs, a harem’s trios, never shoals or colonies', () => {
    expect(pickedShare(betta)).toBeCloseTo(pickedOffer, 10);
    expect(pickedShare(findSpecies('neon_tetra')!)).toBe(0);
    expect(pickedShare(findSpecies('cherry_shrimp')!)).toBe(0);
    for (const sp of listSpecies(() => true)) expect(pickedShare(sp)).toBeLessThanOrEqual(pickedOffer + 1e-12);
  });

  it('…and agrees with the shop’s composition() (animals in offers of one or two, over all animals)', () => {
    for (const sp of listSpecies(() => true)) {
      const rng = mulberry32(7);
      let small = 0;
      let all = 0;
      for (let i = 0; i < 4000; i++) {
        const n = composition(sp, rng).count;
        all += n;
        if (n <= 2) small += n;
      }
      expect(Math.abs(small / all - pickedShare(sp) / pickedOffer), sp.id).toBeLessThan(0.03);
    }
  });

  it('the shop draws its tiers with OFFER_TIER_WEIGHTS', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 9 });
    const rng = mulberry32(21);
    const n = 3000;
    let rare = 0;
    for (let i = 0; i < n; i++) if (generateOffer(g, rng, 'axolotl', { expiresHour: 999 })?.tier === 'rare') rare++;
    expect(Math.abs(rare / n - rarePerOffer)).toBeLessThan(0.015);
  });

  it('a Rare find’s looks match the catalog’s best-of-six odds (the shop’s own generateOffer)', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 11 });
    const rng = mulberry32(33);
    const cat = morphCatalog(betta);
    const w = pickedShare(betta);
    // the pick-only part of each look's share: (share − (1 − w) × genes) / w
    const pickOdds = new Map(cat.entries.map((e) => [e.morphName, (e.frequency - (1 - w) * e.geneticFrequency) / w]));
    const seen = new Map<string, number>();
    const n = 2500;
    for (let i = 0; i < n; i++) {
      const o = generateOffer(g, rng, 'betta', { tier: 'rare', expiresHour: 999 })!;
      const name = o.creatures[0].morphName;
      seen.set(name, (seen.get(name) ?? 0) + 1);
    }
    const top = [...pickOdds.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [name, p] of top) expect(Math.abs((seen.get(name) ?? 0) / n - p), `${name}: about ${(p * 100).toFixed(1)}% of Rare finds`).toBeLessThan(0.02);
    // and with six rolls the most striking looks really are favoured over the genes alone
    expect(PICK_ROLLS).toBe(6);
    const strikingFirst = [...cat.entries].sort((a, b) => b.frequency / b.geneticFrequency - a.frequency / a.geneticFrequency)[0];
    expect(strikingFirst.frequency).toBeGreaterThan(strikingFirst.geneticFrequency);
  });

  it('tiers and the morph line agree: every tier is the tier of its own share', () => {
    for (const sp of [betta, bristlenose, findSpecies('axolotl')!]) {
      for (const e of morphCatalog(sp).entries) {
        const sum = e.phenotypes.reduce((s, ph) => s + ph.share, 0);
        expect(e.frequency).toBeCloseTo(sum, 12);
      }
      const total = morphCatalog(sp).entries.reduce((s, e) => s + e.frequency, 0);
      expect(total).toBeCloseTo(1, 6);
    }
  });
});
