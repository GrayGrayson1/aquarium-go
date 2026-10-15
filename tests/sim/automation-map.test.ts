/**
 * lane:automation (chunk 5; DESIGN-S3D §7.5, INTAKE C-46) — the Facility map's areas (AUTO-040): a line's breed and raise
 * tanks are Breeding, its quarantine and keep tanks Quarantine & keepers, then the tank's purpose, the rest the Gallery;
 * an area shows as many tiles as fit and line tanks always.
 */
import { describe, it, expect } from 'vitest';
import { lineFarm } from './support/production';
import { areaTiles, mapAreas } from '@/ui/panels/operations/mapModel';
import { createTank } from '@/sim/tanks';
import { productionLines } from '@/sim/production';

describe('AUTO-040: map areas', () => {
  it('groups by line role first, then purpose, the rest in the Gallery, in tank order', () => {
    const { g, tanks } = lineFarm(17);
    const extra = createTank(g, 'g20L', 'freshwater_tropical', { cycled: true, placement: { x: 8, z: 2, rotY: 0 }, name: 'Nursery' });
    extra.purpose = 'nursery';
    const show = createTank(g, 'g20L', 'freshwater_tropical', { cycled: true, placement: { x: 10, z: 2, rotY: 0 }, name: 'Showcase' });
    const a = mapAreas(g);
    expect(a.breeding.map((t) => t.id)).toEqual(expect.arrayContaining([tanks.breed.id, tanks.raise.id, extra.id]));
    expect(a.quarantine.map((t) => t.id)).toEqual(expect.arrayContaining([tanks.qt.id, tanks.keep.id]));
    expect(a.gallery.map((t) => t.id)).toContain(show.id);
    const short = productionLines(g)[0].name.replace(/ line$/, '');
    expect(a.lineTanks.get(tanks.raise.id)).toEqual([short]);
    // every tank is in exactly one area
    const all = [...a.breeding, ...a.quarantine, ...a.gallery].map((t) => t.id).sort();
    expect(all).toEqual([...g.tankOrder].sort());
  });

  it('an area shows what fits, ending "+{n} more"; tanks that belong to a line always show', () => {
    const { g, tanks } = lineFarm(17);
    const many = Array.from({ length: 10 }, (_, i) => createTank(g, 'g10', 'freshwater_tropical', { cycled: true, placement: { x: -12 + i, z: 6, rotY: 0 }, name: `Show ${i}` }));
    const list = [...many.slice(0, 5), tanks.keep, ...many.slice(5)];
    const a = mapAreas(g);
    const { shown, more } = areaTiles(list, 4, a.lineTanks);
    expect(shown).toContain(tanks.keep);
    expect(shown.length).toBe(4);
    expect(more).toBe(list.length - 4);
  });
});
