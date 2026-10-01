/**
 * PANELS-B S14-04: TankThumb must place every decor silhouette and resident glyph inside the 132×88 miniature for
 * every tank id (hashStr is unsigned, so the shifts must be too). P1-05/P4-07: the "Ready to propagate" list reads
 * "… and 3 more", never "3 mores".
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FIXTURES } from '@/dev/fixtures';
import { creaturesInTank } from '@/sim/life';
import { TankThumb } from '@/ui/panels/common/TankThumb';
import { hashStr, nameList } from '@/ui/panels/common/format';

describe('TankThumb placement', () => {
  it('keeps decor and residents inside the thumbnail for every big_facility tank', () => {
    const g = FIXTURES.big_facility();
    const negativeSeeds = g.tankOrder.filter((id) => hashStr(id) >= 2 ** 31);
    expect(negativeSeeds.length, 'fixture should contain ids whose hash sets the sign bit').toBeGreaterThan(0);
    for (const id of g.tankOrder) {
      const tank = g.tanks[id];
      const residents = creaturesInTank(g, id);
      const svg = renderToStaticMarkup(createElement(TankThumb, { tank, residents }));
      // Decor paths start at "M<x> …"; residents are translated groups.
      const xs = [...svg.matchAll(/ d="M(-?[\d.]+) /g)].map((m) => Number(m[1]));
      const tx = [...svg.matchAll(/transform="translate\((-?[\d.]+) (-?[\d.]+)\)"/g)].map((m) => [Number(m[1]), Number(m[2])]);
      expect(xs.length).toBeGreaterThan(0);
      for (const x of xs) expect(x, `${id} decor x`).toBeGreaterThanOrEqual(0);
      for (const [x, y] of tx) {
        expect(x, `${id} resident x`).toBeGreaterThanOrEqual(0);
        expect(x, `${id} resident x`).toBeLessThanOrEqual(132);
        expect(y, `${id} resident y`).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('frag-ready hint copy', () => {
  it('lists the first two names and a plain "N more"', () => {
    expect(nameList(['Vallisneria', 'Java Fern', 'Anubias', 'Rotala', 'Ludwigia'], 2)).toBe('Vallisneria, Java Fern and 3 more');
    expect(nameList(['Vallisneria', 'Java Fern'], 2)).toBe('Vallisneria and Java Fern');
    expect(nameList(['Vallisneria'], 2)).toBe('Vallisneria');
  });
});
