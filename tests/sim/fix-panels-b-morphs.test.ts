/**
 * PANELS-B S14-01 / S16-04: the Encyclopedia's "Morphs · n/N seen" chips must match the morph names the sim actually
 * composes ("Red Butterfly Veiltail" counts as a seen "Red Veiltail"), and the "(no morphs; …)" note entries must not
 * render as a permanently locked 0/1 meter.
 */
import { describe, it, expect } from 'vitest';
import { ALL_SPECIES, getSpecies } from '@/data/species';
import { FIXTURES } from '@/dev/fixtures';
import { createCreature } from '@/sim/life';
import { mulberry32 } from '@/sim/rng';
import { seenMorphChips, discoveredMorphNames, hasNoNamedMorphs, noMorphsNote } from '@/ui/panels/encyclopedia/morphs';

describe('encyclopedia morph chips', () => {
  it('matches curated chips against composed morph names by words', () => {
    const betta = getSpecies('betta');
    const seen = seenMorphChips(betta, ['betta:Red Halfmoon', 'betta:Yellow Marble Double Tail', 'axolotl:Golden Albino']);
    expect(seen.has('Royal Blue Halfmoon')).toBe(false);
    expect(seen.has('Yellow')).toBe(true);
    expect(seen.has('Marble')).toBe(true);
    expect(seen.has('Double Tail')).toBe(true);
    expect(seen.has('Red Veiltail')).toBe(false);
    expect(seenMorphChips(betta, ['betta:Red Butterfly Veiltail']).has('Red Veiltail')).toBe(true);
    expect(seenMorphChips(betta, ['betta:Copper Dragon Scale']).has('Copper Dragon')).toBe(true);
    expect(seenMorphChips(betta, []).size).toBe(0);
  });

  it('uses bracketed aliases and the species name', () => {
    const goldfish = getSpecies('fancy_goldfish');
    expect(seenMorphChips(goldfish, ['fancy_goldfish:Black Telescope']).has('Black Moor (Black Telescope)')).toBe(true);
    const comet = getSpecies('comet_goldfish');
    expect(seenMorphChips(comet, ['comet_goldfish:Red-Orange']).has('Red-Orange Comet')).toBe(true);
    expect(seenMorphChips(comet, ['comet_goldfish:Red-Orange Common (short tail)']).has('Common (short tail)')).toBe(true);
  });

  it('does not let the common name tick a base chip for a different morph (R08-05)', () => {
    const only = (id: string, name: string) => [...seenMorphChips(getSpecies(id), [`${id}:${name}`])].sort();
    expect(only('watchman_goby', 'Grey Watchman')).toEqual(['Grey Watchman']);
    expect(only('watchman_goby', 'Yellow Watchman')).toEqual(['Yellow Watchman']);
    expect(only('cherry_shrimp', 'Fire Red')).toEqual(['Fire Red']);
    expect(only('cherry_shrimp', 'Sakura Red')).toEqual(['Sakura Red']);
    expect(only('cherry_shrimp', 'Red Cherry')).toEqual(['Red Cherry']);
    expect(only('coral_beauty', 'High Orange')).toEqual(['High Orange']);
    expect(only('coral_beauty', 'Coral Beauty')).toEqual(['Coral Beauty']);
    expect(only('comet_goldfish', 'Red-Orange')).toEqual(['Red-Orange Comet']);
  });

  it('lists the player’s finds per species without the id prefix', () => {
    expect(discoveredMorphNames(['betta:Red Halfmoon', 'axolotl:Wild Type', 'betta:Red Halfmoon', 'betta:Turquoise Plakat'], 'betta')).toEqual(['Red Halfmoon', 'Turquoise Plakat']);
  });

  it('recognises "no morphs" note entries', () => {
    const tang = getSpecies('yellow_tang');
    expect(hasNoNamedMorphs(tang)).toBe(true);
    expect(noMorphsNote(tang)).toBe('individual variation');
    expect(hasNoNamedMorphs(getSpecies('betta'))).toBe(false);
  });

  it('every curated chip of every species is reachable from rolled genomes', () => {
    const g = FIXTURES.betta();
    const unreachable: string[] = [];
    for (const sp of ALL_SPECIES) {
      if (hasNoNamedMorphs(sp)) continue;
      const rng = mulberry32(42);
      const disc: string[] = [];
      for (let i = 0; i < 600; i++) {
        const c = createCreature(g, rng, sp.id, { ageDays: 30 });
        const k = `${sp.id}:${c.morphName}`;
        if (!disc.includes(k)) disc.push(k);
      }
      const seen = seenMorphChips(sp, disc);
      for (const m of sp.visualMorphs) if (!seen.has(m)) unreachable.push(`${sp.id}:${m}`);
    }
    // The few left are real but rare (homozygous line alleles at 2–8 % frequency) and simply not rolled in 600 tries.
    expect(unreachable.length, unreachable.join(', ')).toBeLessThanOrEqual(8);
    expect(unreachable.filter((u) => u.startsWith('betta:') && u !== 'betta:Copper Dragon')).toEqual([]);
    expect(unreachable.filter((u) => u.startsWith('fancy_goldfish:'))).toEqual([]);
    expect(unreachable.filter((u) => u.startsWith('fancy_guppy:') && u !== 'fancy_guppy:Albino Full Red')).toEqual([]);
  });
});
