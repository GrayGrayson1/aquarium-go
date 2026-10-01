/**
 * PANELS-B S14-04: TankThumb must place every decor silhouette and resident glyph inside the 132×88 miniature for
 * every tank id (hashStr is unsigned, so the shifts must be too). P1-05/P4-07: the "Ready to propagate" list reads
 * "… and 3 more", never "3 mores" (R10-04: the hint itself is rendered, since the bug was its inline plural()).
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FIXTURES } from '@/dev/fixtures';
import { creaturesInTank } from '@/sim/life';
import { TankThumb } from '@/ui/panels/common/TankThumb';
import { hashStr, nameList } from '@/ui/panels/common/format';
import { FragReadyHint } from '@/ui/panels/build/FragAction';
import { DECOR } from '@/data/catalog/decor';
import { fragEligibility } from '@/sim/aquascape';

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

describe('FragReadyHint', () => {
  it('renders five ready plants as "A, B and 3 more"', () => {
    const g = FIXTURES.big_facility();
    const tank = g.tanks[g.tankOrder.find((id) => g.tanks[id].decor.length > 0)!];
    const proto = tank.decor[0];
    const picks = DECOR.filter((d) => d.category === 'plant').filter((d) => {
      const inst = { ...proto, id: `t-${d.id}`, defId: d.id, growth: 1, health: 100, recoverUntilHour: undefined };
      return fragEligibility(g, { ...tank, decor: [inst] }, inst).ok;
    }).slice(0, 5);
    expect(picks.length, 'five plants that can be cut without research').toBe(5);
    const ready = { ...tank, listingId: undefined, decor: picks.map((d) => ({ ...proto, id: `t-${d.id}`, defId: d.id, growth: 1, health: 100, recoverUntilHour: undefined })) };
    const html = renderToStaticMarkup(createElement(FragReadyHint, { g, tank: ready }));
    expect(html).toContain(`${picks[0].name}, ${picks[1].name} and 3 more.`);
    expect(html).not.toMatch(/\d+ mores/);
  });
});
