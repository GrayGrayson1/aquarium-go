import { describe, it, expect } from 'vitest';
import type { PersonalityTag } from '@/types';
import { getSpecies, STARTER_IDS } from '@/data/species';
import { newGame } from '@/sim/newGame';
import { mulberry32 } from '@/sim/rng';
import { createCreature, addCreature, personalityModifiers, describePersonality, creatureWellbeing } from '@/sim/life';
import { allowedTags, excludes, rollPersonalityTags } from '@/sim/life/personality';
import { NAME_POOLS, generateName } from '@/sim/life/names';
import { adultSizeFor } from '@/sim/life/growth';
import { renameCreature, devAgeCreature, toggleFavorite, noteInteraction } from '@/sim/life/actions';

describe('lifecycle — creature creation', () => {
  it('is deterministic: same seed → identical creatures', () => {
    const a = newGame({ starterId: 'betta', starterName: 'Ember', seed: 4242 });
    const b = newGame({ starterId: 'betta', starterName: 'Ember', seed: 4242 });
    expect(JSON.stringify(a.creatures)).toBe(JSON.stringify(b.creatures));
    const s1 = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 1 });
    const s2 = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 1 });
    const c1 = createCreature(s1, mulberry32(77), 'pea_puffer', { ageDays: 12 });
    const c2 = createCreature(s2, mulberry32(77), 'pea_puffer', { ageDays: 12 });
    expect(c1).toEqual(c2);
  });

  it('starter creature is complete and sensible', () => {
    for (const id of STARTER_IDS) {
      const s = newGame({ starterId: id, starterName: 'Pip', seed: 99 });
      const c = Object.values(s.creatures)[0];
      const sp = getSpecies(id);
      expect(c.name).toBe('Pip');
      expect(c.personality.length).toBeGreaterThanOrEqual(1);
      expect(c.personality.length).toBeLessThanOrEqual(3);
      expect(c.morphName.length).toBeGreaterThan(0);
      expect(c.sizeCm).toBeGreaterThan(sp.adultSizeCm * 0.5);
      expect(c.sizeCm).toBeLessThan(sp.adultSizeCm * 1.3);
      expect(['juvenile', 'adult']).toContain(c.lifeStage);
      expect(c.appearance.patternSeed).toBeGreaterThan(0);
      expect(c.history.length).toBeGreaterThan(0);
    }
  });

  it('sex follows the species sex system and is hidden before sexVisibleAtDays', () => {
    const s = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 3 });
    const rng = mulberry32(8);
    const young = createCreature(s, rng, 'axolotl', { ageDays: 5 });
    expect(young.sex).toBe('unknown');
    expect(['male', 'female']).toContain(young.reproRole);
    expect(young.lifeStage).toBe('juvenile');
    const adultF = createCreature(s, rng, 'axolotl', { ageDays: 30, sex: 'female' });
    expect(adultF.sex).toBe('female');
    const clownYoung = createCreature(s, rng, 'ocellaris_clownfish', { ageDays: 3 });
    expect(clownYoung.reproRole).toBe('undifferentiated');
    expect(clownYoung.sex).toBe('unknown');
    const clownAdult = createCreature(s, rng, 'ocellaris_clownfish', { ageDays: 20 });
    expect(clownAdult.reproRole).toBe('male');
    expect(clownAdult.sex).toBe('male');
    let males = 0;
    for (let i = 0; i < 400; i++) if (createCreature(s, rng, 'lined_seahorse', { ageDays: 30 }).reproRole === 'male') males++;
    expect(males).toBeGreaterThan(160);
    expect(males).toBeLessThan(240);
  });

  it('size follows age and size potential', () => {
    const s = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 3 });
    const rng = mulberry32(11);
    const sp = getSpecies('axolotl');
    const baby = createCreature(s, rng, 'axolotl', { ageDays: 1 });
    const adult = createCreature(s, rng, 'axolotl', { ageDays: 60 });
    expect(baby.sizeCm).toBeLessThan(sp.adultSizeCm * 0.35);
    expect(adult.sizeCm).toBeGreaterThan(adultSizeFor(sp, adult.genome) * 0.9);
    const big = createCreature(s, rng, 'axolotl', { ageDays: 60, genome: { alleles: {}, potentials: { size: 99, color: 50, pattern: 50, structure: 50, fertility: 50, hardiness: 50, temperament: 50, curiosity: 50 } } });
    const small = createCreature(s, rng, 'axolotl', { ageDays: 60, genome: { alleles: {}, potentials: { size: 1, color: 50, pattern: 50, structure: 50, fertility: 50, hardiness: 50, temperament: 50, curiosity: 50 } } });
    expect(big.sizeCm).toBeGreaterThan(small.sizeCm * 1.25);
    // missing loci are repaired with the commonest allele
    expect(big.genome.alleles.dark).toEqual(['D', 'D']);
  });
});

describe('lifecycle — personality', () => {
  it('tags stay species-valid, 1–3, never contradictory', () => {
    const s = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 5 });
    const rng = mulberry32(31);
    for (const id of STARTER_IDS) {
      const sp = getSpecies(id);
      const allowed = new Set(allowedTags(sp));
      for (let i = 0; i < 300; i++) {
        const c = createCreature(s, rng, id, { ageDays: 20 });
        expect(c.personality.length).toBeGreaterThanOrEqual(1);
        expect(c.personality.length).toBeLessThanOrEqual(3);
        expect(new Set(c.personality).size).toBe(c.personality.length);
        for (const t of c.personality) expect(allowed.has(t)).toBe(true);
        for (const a of c.personality) for (const b of c.personality) if (a !== b) expect(excludes(a, b)).toBe(false);
      }
    }
    expect(allowedTags(getSpecies('lined_seahorse'))).not.toContain('competitive_feeder');
    const betta = allowedTags(getSpecies('betta'));
    for (const t of ['showoff', 'glass_curious', 'nest_builder'] as PersonalityTag[]) expect(betta).toContain(t);
    const puffer = allowedTags(getSpecies('pea_puffer'));
    for (const t of ['explorer', 'glass_curious', 'food_obsessed'] as PersonalityTag[]) expect(puffer).toContain(t);
    const axo = allowedTags(getSpecies('axolotl'));
    for (const t of ['homebody', 'food_obsessed', 'glass_curious'] as PersonalityTag[]) expect(axo).toContain(t);
    expect(axo).not.toContain('social');
  });

  it('tags correlate with temperament and curiosity potentials', () => {
    const rng = mulberry32(64);
    const sp = getSpecies('betta');
    const pot = (t: number, c: number) => ({ alleles: {}, potentials: { size: 50, color: 50, pattern: 50, structure: 50, fertility: 50, hardiness: 50, temperament: t, curiosity: c } });
    let boldWhenBold = 0;
    let shyWhenBold = 0;
    let shyWhenShy = 0;
    let explorerWhenCurious = 0;
    let homebodyWhenCurious = 0;
    for (let i = 0; i < 500; i++) {
      const bold = rollPersonalityTags(sp, pot(90, 50), rng);
      if (bold.includes('bold')) boldWhenBold++;
      if (bold.includes('shy')) shyWhenBold++;
      if (rollPersonalityTags(sp, pot(10, 50), rng).includes('shy')) shyWhenShy++;
      const cur = rollPersonalityTags(sp, pot(50, 95), rng);
      if (cur.includes('explorer') || cur.includes('glass_curious')) explorerWhenCurious++;
      if (cur.includes('homebody')) homebodyWhenCurious++;
    }
    expect(shyWhenBold).toBe(0);
    expect(boldWhenBold).toBeGreaterThan(100);
    expect(shyWhenShy).toBeGreaterThan(100);
    expect(explorerWhenCurious).toBeGreaterThan(200);
    expect(homebodyWhenCurious).toBe(0);
  });

  it('personality modifiers are 0..1 and reflect tags', () => {
    const s = newGame({ starterId: 'betta', starterName: 'Ember', seed: 9 });
    const c = Object.values(s.creatures)[0];
    const bold = personalityModifiers({ ...c, personality: ['bold', 'showoff'], genome: { ...c.genome, potentials: { ...c.genome.potentials, temperament: 85 } } });
    const shy = personalityModifiers({ ...c, personality: ['shy', 'easily_startled'], genome: { ...c.genome, potentials: { ...c.genome.potentials, temperament: 15 } } });
    for (const v of [...Object.values(bold), ...Object.values(shy)]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(bold.boldness).toBeGreaterThan(shy.boldness);
    expect(shy.startle).toBeGreaterThan(bold.startle);
    expect(bold.displayDrive).toBeGreaterThan(shy.displayDrive);
    expect(describePersonality(c).length).toBeGreaterThan(3);
  });
});

describe('lifecycle — names', () => {
  it('has 40+ unique names per mood and picks deterministically', () => {
    for (const [mood, pool] of Object.entries(NAME_POOLS)) {
      expect(pool.length, mood).toBeGreaterThanOrEqual(40);
      expect(new Set(pool).size, mood).toBe(pool.length);
    }
    const sp = getSpecies('lined_seahorse');
    expect(generateName(sp, mulberry32(3))).toBe(generateName(sp, mulberry32(3)));
    const taken = new Set<string>();
    for (let i = 0; i < 60; i++) taken.add(generateName(sp, mulberry32(i), taken));
    expect(taken.size).toBe(60);
  });
});

describe('lifecycle — actions', () => {
  it('rename, favourite, age and interact update the individual profile', () => {
    const s = newGame({ starterId: 'axolotl', starterName: 'Mochi', seed: 21 });
    const rng = mulberry32(2);
    const tankId = s.tankOrder[0];
    const baby = addCreature(s, createCreature(s, rng, 'axolotl', { ageDays: 3 }), tankId);
    expect(renameCreature(s, baby.id, '  Nimbus  ').ok).toBe(true);
    expect(baby.name).toBe('Nimbus');
    expect(renameCreature(s, baby.id, '   ').ok).toBe(false);
    expect(baby.history.some((h) => h.kind === 'named')).toBe(true);
    toggleFavorite(s, baby.id);
    expect(baby.favorite).toBe(true);
    expect(baby.sex).toBe('unknown');
    const r = devAgeCreature(s, baby.id, 30);
    expect(r.ok).toBe(true);
    expect(baby.lifeStage).toBe('adult');
    expect(baby.sex).not.toBe('unknown');
    expect(baby.history.some((h) => h.kind === 'milestone' && /is a (male|female)!/.test(h.text))).toBe(true);
    expect(baby.sizeCm).toBeGreaterThan(15);
    const e0 = baby.stats.enrichment;
    for (let i = 0; i < 80; i++) noteInteraction(s, baby.id, 'photo');
    expect(baby.stats.enrichment).toBeGreaterThan(e0);
    expect(baby.life?.bond ?? 0).toBeGreaterThan(20);
    expect(baby.history.length).toBeLessThanOrEqual(40);
    expect(creatureWellbeing(s, baby).status).toMatch(/good|watch|danger/);
  });
});
