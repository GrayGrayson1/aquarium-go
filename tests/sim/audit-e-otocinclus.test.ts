/**
 * Audit 2026-11-17, E26: the otocinclus shares the corydoras' spawning module; its courtship line names the otocinclus,
 * not "cory spawning behaviour".
 */
import { describe, expect, it } from 'vitest';
import { getSpecies } from '@/data/species';
import { substrateCourtText } from '@/sim/life/breeding/systems/spawners';

describe('E26: the substrate spawners’ courtship line', () => {
  it('names the otocinclus, and keeps “cory” for the corydoras', () => {
    expect(substrateCourtText({ name: 'Oto' }, { name: 'Tina' }, getSpecies('otocinclus'))).toBe('Oto and friends are dashing along the glass after Tina — otocinclus spawning behaviour!');
    expect(substrateCourtText({ name: 'Pan' }, { name: 'Da' }, getSpecies('panda_corydoras'))).toBe('Pan and friends are dashing along the glass after Da — cory spawning behaviour!');
  });
});
