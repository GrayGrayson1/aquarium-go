/**
 * Estuary decor (lane brackish): mangrove roots, oyster shells, estuary pebbles, mangrove seedling.
 * Geometry is sane over many seeds, anchors sit on real geometry, the mangrove is a soft stilt tangle for the AI, and
 * the emergent seedling grows up to break the surface.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, Tank } from '@/types';
import { DECOR, getDecorDef, isEmergent } from '@/data/catalog/decor';
import { buildDecor, toGeometry, MAT_CLASSES } from '@/render/decor/gen';
import { decorSolidity } from '@/ai/core/env';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { tankDims } from '@/sim/tankSpace';
import { checkPlacement, placeDecor } from '@/sim/aquascape';
import { EMERGENT_REACH_M } from '@/sim/aquascape/placement';
import { unlockEverything } from '@/dev/fixtures/core-helpers';

const IDS = ['mangrove_roots', 'oyster_shells', 'estuary_pebbles', 'mangrove_seedling'];

function allPositions(def: (typeof DECOR)[number], seed: number, lod: number): number[] {
  const b = buildDecor(def, seed, lod);
  const out: number[] = [];
  for (const k of MAT_CLASSES) out.push(...b[k].pos);
  return out;
}

describe('estuary decor geometry', () => {
  it('builds valid, finite, unit-normal geometry over many seeds and every LOD', () => {
    for (const id of IDS) {
      const def = getDecorDef(id)!;
      expect(def, id).toBeTruthy();
      for (const seed of [1, 7, 99, 4007, 12345, 31337])
        for (const lod of [0, 1, 2]) {
          const geo = toGeometry(buildDecor(def, seed, lod));
          let verts = 0;
          for (const g of Object.values(geo)) {
            if (!g) continue;
            const n = g.getAttribute('normal');
            verts += n.count;
            for (let i = 0; i < n.count; i++) expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i)), `${id} s${seed} l${lod}`).toBeGreaterThan(0.5);
            for (const name of Object.keys(g.attributes)) {
              const arr = g.getAttribute(name).array as ArrayLike<number>;
              for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) expect.fail(`${id} ${name}[${i}]`);
            }
            g.dispose();
          }
          expect(verts, `${id} seed ${seed} lod ${lod}`).toBeGreaterThan(0);
        }
    }
  });

  it('every anchor has real geometry close by (arches over the cave, shells around the nest, a leaf to rest on)', () => {
    for (const id of IDS) {
      const def = getDecorDef(id)!;
      for (const seed of [4242, 12345]) {
        const pos = allPositions(def, seed, 0);
        for (const a of def.anchors) {
          let best = Infinity;
          for (let i = 0; i < pos.length; i += 3) best = Math.min(best, Math.hypot(pos[i] - a.offset[0], pos[i + 1] - a.offset[1], pos[i + 2] - a.offset[2]));
          // caves/nests are roofed within ~3.5 cm; perches, rests and leaves sit on the surface
          const reach = a.kind === 'cave' || a.kind === 'nest_site' || a.kind === 'hide' ? 0.036 : 0.018;
          expect(best, `${id} ${a.kind} seed ${seed}`).toBeLessThan(reach);
        }
      }
    }
  });

  it('the mangrove tangle has open water under its arches and stays within a sane triangle budget', () => {
    const def = getDecorDef('mangrove_roots')!;
    const b = buildDecor(def, 4242, 0);
    const tris = b.solid.idx.length / 3;
    expect(tris).toBeLessThan(40000);
    // the cave anchor itself is not buried in bark: nothing within 8 mm of it
    const cave = def.anchors.find((a) => a.kind === 'cave')!.offset;
    const p = b.solid.pos;
    let near = Infinity;
    for (let i = 0; i < p.length; i += 3) near = Math.min(near, Math.hypot(p[i] - cave[0], p[i + 1] - cave[1], p[i + 2] - cave[2]));
    expect(near).toBeGreaterThan(0.008);
  });
});

describe('estuary decor in the sim', () => {
  function world(wc: Tank['waterClass'] = 'brackish', tier = 'g29'): { g: GameState; t: Tank } {
    const g = newGame({ starterId: 'pea_puffer', starterName: 'T', seed: 77 });
    unlockEverything(g);
    g.finance.money = 10_000;
    const t = createTank(g, tier, wc, { cycled: true });
    return { g, t };
  }

  it('mangrove roots are a soft stilt tangle for the AI (fish weave through; no solid boss on the bed)', () => {
    expect(decorSolidity(getDecorDef('mangrove_roots')!)).toEqual({ body: 'soft', round: false, base: null });
    expect(decorSolidity(getDecorDef('oyster_shells')!).body).toBe('hard');
    expect(decorSolidity(getDecorDef('mangrove_seedling')!).base).not.toBeNull();
  });

  it('are gated by the mangrove unlock and belong in the right water', () => {
    const g = newGame({ starterId: 'pea_puffer', starterName: 'T', seed: 5 });
    const t = createTank(g, 'g29', 'brackish', { cycled: true });
    g.finance.money = 10_000;
    expect(checkPlacement(g, t, 'mangrove_roots', { x: 0, z: 0 }).code).toBe('locked');
    expect(checkPlacement(g, t, 'estuary_pebbles', { x: 0.1, z: 0.05 }).ok).toBe(true);
    const fw = world('freshwater_tropical');
    expect(checkPlacement(fw.g, fw.t, 'oyster_shells', { x: 0, z: 0 }).code).toBe('environment');
    expect(checkPlacement(fw.g, fw.t, 'mangrove_roots', { x: 0, z: 0 }).ok).toBe(true);
    const sea = world('marine_fowlr');
    expect(checkPlacement(sea.g, sea.t, 'mangrove_seedling', { x: 0, z: 0 }).code).toBe('environment');
  });

  it('the emergent seedling grows until its crown just breaks the surface, whatever size is asked for', () => {
    expect(isEmergent(getDecorDef('mangrove_seedling')!)).toBe(true);
    for (const tier of ['g20L', 'g29', 'g75']) {
      const { g, t } = world('brackish', tier);
      const d = tankDims(t);
      const def = getDecorDef('mangrove_seedling')!;
      for (const asked of [0.6, 1, 2]) {
        const chk = checkPlacement(g, t, def.id, { x: 0, z: 0, scale: asked });
        expect(chk.ok, `${tier} ${asked}: ${chk.message}`).toBe(true);
        const top = chk.y + def.size.h * chk.scale;
        expect(top).toBeLessThanOrEqual(d.waterY + EMERGENT_REACH_M + 0.002);
        if (def.size.h * def.scaleRange[1] > d.waterY - chk.y + 0.01) expect(top).toBeGreaterThan(d.waterY);
      }
      expect(placeDecor(g, t.id, def.id, { x: 0, z: 0 }).ok).toBe(true);
    }
  });

  it('existing brackish-tolerant plants still fit brackish tanks; freshwater-only ones do not', () => {
    const { g, t } = world('brackish');
    for (const id of ['java_fern', 'anubias_nana', 'java_moss', 'cryptocoryne', 'vallisneria']) {
      expect(getDecorDef(id)!.environments).toContain('brackish');
      expect(getDecorDef(id)!.description).toMatch(/brackish/);
    }
    expect(checkPlacement(g, t, 'amazon_sword', { x: 0, z: 0 }).code).toBe('environment');
  });
});

