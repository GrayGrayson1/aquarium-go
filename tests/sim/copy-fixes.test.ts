/**
 * Copy fixes from the mid-game QA pass: a/an articles, species names repeated in market labels, duplicate names in
 * one purchase, and ungrammatical buyer templates.
 */
import { describe, it, expect } from 'vitest';
import type { PhenotypeRule } from '@/types';
import { newGame } from '@/sim/newGame';
import { aOrAn, withArticle, fill, morphTitle } from '@/sim/economy/util';
import { generateOffer, buyOffer, composeBidMessage } from '@/sim/economy';
import { fillTemplate, REACTION_LINES } from '@/sim/facility/reactions';
import { composeMorphName } from '@/sim/life/genetics';
import { simRng, mulberry32 } from '@/sim/rng';
import { listSpecies, getSpecies } from '@/data/species';

/** "a" directly before a word that starts with a vowel sound. */
const BAD_A = /\b[Aa] (?=[aeiouAEIOU8])(?!uni|Uni|use|Use|one\b|eu|Eu)/;

describe('a / an', () => {
  it('picks the article by sound', () => {
    expect(aOrAn('ocellaris clownfish')).toBe('an');
    expect(aOrAn('axolotl')).toBe('an');
    expect(aOrAn('Albino')).toBe('an');
    expect(aOrAn('betta')).toBe('a');
    expect(aOrAn('unicorn pleco')).toBe('a');
    expect(aOrAn('hour')).toBe('an');
    expect(aOrAn(8)).toBe('an');
    expect(aOrAn('18')).toBe('an');
    expect(aOrAn(80)).toBe('an');
    expect(aOrAn(11)).toBe('an');
    expect(aOrAn(10)).toBe('a');
    expect(aOrAn(100)).toBe('a');
    expect(aOrAn(125)).toBe('a');
    expect(withArticle('otocinclus', true)).toBe('An otocinclus');
  });

  it('fixes "a {placeholder}" in filled templates', () => {
    expect(fill('A {morph} like {name} is rare.', { morph: 'Albino', name: 'Pip' })).toBe('An Albino like Pip is rare.');
    expect(fill('Is it a {morph}?', { morph: 'Leucistic' })).toBe('Is it a Leucistic?');
    expect(fill('A {gallons}-gallon footprint', { gallons: '18' })).toBe('An 18-gallon footprint');
  });

  it('visitor reaction lines use the right article for every species', () => {
    const line = fillTemplate('Look at {name}! I didn’t know a {species} could look like that.', { name: 'Nemo', species: 'Ocellaris clownfish' });
    expect(line).toBe('Look at Nemo! I didn’t know an ocellaris clownfish could look like that.');
    for (const sp of listSpecies()) {
      for (const lines of Object.values(REACTION_LINES)) {
        for (const t of lines) {
          const s = fillTemplate(t, { name: 'Pip', species: sp.commonName, tank: 'Reef', gallons: 80, morph: 'Albino', moment: 'a bubble nest', who: 'Maya', region: 'Asia' });
          expect(s, s).not.toMatch(BAD_A);
          expect(s, s).not.toMatch(/\{\w+\}/);
        }
      }
    }
  });

  it('plural lines read as plurals', () => {
    const s = fillTemplate('I didn’t know {species_pl} could be so charming.', { species: 'Neon tetra' });
    expect(s).toBe('I didn’t know neon tetras could be so charming.');
  });
});

describe('buyer messages', () => {
  it('conservation and breeder openers are grammatical with plural species', () => {
    const seen: string[] = [];
    for (let seed = 1; seed <= 400; seed++) {
      for (const archetype of ['conservation', 'breeder', 'collector'] as const) {
        const msg = composeBidMessage(mulberry32(seed), {
          archetype,
          isTank: false,
          likes: ['rarity', 'lineage'],
          concerns: [],
          vars: { species: 'axolotls', name: 'Pip', morph: 'Albino', gallons: '20', org: 'the Lake Xochimilco Trust', scope: 'animal' },
        });
        seen.push(msg);
      }
    }
    const all = seen.join('\n');
    expect(all).not.toMatch(/axolotls conservation/);
    expect(all).not.toMatch(/small axolotls line/);
    expect(all).not.toMatch(BAD_A);
    expect(all).toMatch(/conservation outreach about axolotls/);
  });
});

describe('market labels never repeat the species name', () => {
  it('the two QA examples', () => {
    expect(morphTitle('Peppermint Richly coloured', 'Peppermint Shrimp')).toBe('Richly coloured Peppermint Shrimp');
    expect(morphTitle('Red Honey (Sunset)', 'Honey Gourami')).toBe('Red Honey Gourami (Sunset)');
    // Existing behaviour is kept.
    expect(morphTitle('Gold Honey', 'Honey Gourami')).toBe('Gold Honey Gourami');
    expect(morphTitle('Red Cherry', 'Cherry Shrimp')).toBe('Red Cherry Shrimp');
    expect(morphTitle('Golden Albino', 'Axolotl')).toBe('Golden Albino Axolotl');
    expect(morphTitle('Wild Type', 'Betta')).toBe('Betta');
  });

  it('every species: base × overlay morph names give labels without a doubled word', () => {
    const words = (s: string) => s.toLowerCase().replace(/[()]/g, ' ').split(/\s+/).filter((w) => w.length > 1);
    for (const sp of listSpecies()) {
      const rules: PhenotypeRule[] = sp.genetics?.phenotypes ?? [];
      const bases: (PhenotypeRule | null)[] = [null, ...rules.filter((r) => r.layer === 'base')];
      const overlays = rules.filter((r) => r.layer === 'overlay');
      const sets: PhenotypeRule[][] = [[]];
      for (let i = 0; i < overlays.length; i++) {
        sets.push([overlays[i]]);
        for (let j = i + 1; j < overlays.length; j++) sets.push([overlays[i], overlays[j]]);
      }
      for (const b of bases) {
        for (const o of sets) {
          const morph = composeMorphName(sp, b, o);
          const label = morphTitle(morph, sp.commonName);
          const w = words(label);
          expect(new Set(w).size, `${sp.id}: "${morph}" → "${label}"`).toBe(w.length);
          expect(label.toLowerCase(), `${sp.id}: "${label}"`).toContain(sp.commonName.toLowerCase().split(/\s+/).pop()!);
        }
      }
    }
  });

  it('market offers use those labels', () => {
    const g = newGame({ starterId: 'ocellaris_clownfish', starterName: 'Nemo', seed: 5 });
    const rng = simRng(g);
    for (const id of ['peppermint_shrimp', 'honey_gourami']) {
      if (!listSpecies().some((s) => s.id === id)) continue;
      for (let i = 0; i < 25; i++) {
        const o = generateOffer(g, rng, id, { expiresHour: g.clock.hour + 24, tier: 'special', sexes: [undefined] });
        const w = (o?.label ?? '').toLowerCase().replace(/[()]/g, ' ').split(/\s+/).filter((x) => x.length > 1);
        expect(new Set(w).size, o?.label).toBe(w.length);
      }
    }
  });
});

describe('unique names', () => {
  it('animals rolled into one offer never share a name', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 11 });
    const rng = simRng(g);
    for (let i = 0; i < 40; i++) {
      const o = generateOffer(g, rng, 'fancy_guppy', { expiresHour: g.clock.hour + 24, sexes: Array(10).fill(undefined) })!;
      const names = o.creatures.map((c) => c.name);
      expect(new Set(names).size, names.join(', ')).toBe(names.length);
      expect(names).not.toContain('Ember');
    }
  });

  it('buying renames an animal whose name is already taken in your collection', () => {
    const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 12 });
    g.finance.money = 5000;
    const tankId = g.tankOrder[0];
    const o = generateOffer(g, simRng(g), 'fancy_guppy', { expiresHour: g.clock.hour + 24, sexes: [undefined, undefined, undefined] })!;
    o.creatures[0].name = 'Ember';
    o.creatures[1].name = 'Ruby';
    o.creatures[2].name = 'Ruby';
    g.market.stock.push(o);
    const ids = o.creatures.map((c) => c.id);
    const r = buyOffer(g, o.id, tankId);
    expect(r.ok, r.message).toBe(true);
    const names = Object.values(g.creatures)
      .filter((c) => c.status === 'alive')
      .map((c) => c.name);
    expect(new Set(names).size, names.join(', ')).toBe(names.length);
    expect(ids.map((id) => g.creatures[id].name)).not.toContain('Ember');
    expect(getSpecies('fancy_guppy')).toBeTruthy();
  });

  it('renaming is deterministic and leaves the sim RNG untouched', () => {
    const run = () => {
      const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 13 });
      g.finance.money = 5000;
      const o = generateOffer(g, simRng(g), 'fancy_guppy', { expiresHour: g.clock.hour + 24, sexes: [undefined, undefined] })!;
      o.creatures[0].name = 'Ember';
      g.market.stock.push(o);
      const before = g.rngState;
      buyOffer(g, o.id, g.tankOrder[0]);
      return { name: g.creatures[o.creatures[0].id].name, rngSame: g.rngState === before };
    };
    const a = run();
    const b = run();
    expect(a.name).toBe(b.name);
    expect(a.rngSame).toBe(true);
  });
});
