/**
 * Lane brackish (fish art) — the four estuary fish body plans build clean geometry for every morph, sex and age:
 * finite vertices, fins/marks inside the shader's limits, and geometry cache keys that change with the shape.
 * Run: npx vitest run tests/sim/brackish-fishart.test.ts
 */
import { describe, expect, it } from 'vitest';
import type { Creature, CreatureVisualParams, SpeciesDefinition } from '@/types';
import type { CreatureFactoryArgs } from '@/render/creatures/types';
import type { FishPlan } from '@/render/creatures/core/plan';
import { BodySampler, buildBodyGeometry } from '@/render/creatures/core/body';
import { buildFinGeometry } from '@/render/creatures/core/fins';
import { MAX_FINS, MAX_MARKS } from '@/render/creatures/core/shaders';
import { juvenile } from '@/render/creatures/fish/common';
import { figureEightPufferPlan } from '@/render/creatures/fish/figure_eight_puffer';
import { plan as bumblebeePlan } from '@/render/creatures/fish/bumblebee_goby';
import { plan as mollyPlan } from '@/render/creatures/fish/sailfin_molly';
import { plan as archerPlan } from '@/render/creatures/fish/banded_archerfish';
import { findSpecies } from '@/data/species';

const PLANS: Record<string, (a: CreatureFactoryArgs) => FishPlan> = {
  figure_eight_puffer: figureEightPufferPlan,
  bumblebee_goby: bumblebeePlan,
  sailfin_molly: mollyPlan,
  banded_archerfish: archerPlan,
};

/** Every base phenotype, each overlay on the first base, for both sexes. */
function looks(sp: SpeciesDefinition): CreatureVisualParams[] {
  const ph = sp.genetics.phenotypes;
  const bases = ph.filter((p) => p.layer === 'base');
  const overlays = ph.filter((p) => p.layer === 'overlay');
  const out: CreatureVisualParams[] = [];
  for (const b of bases) out.push({ ...sp.genetics.baseVisual, ...b.visual });
  for (const b of bases) for (const o of overlays) out.push({ ...sp.genetics.baseVisual, ...b.visual, ...o.visual });
  return out;
}

const args = (sp: SpeciesDefinition, appearance: CreatureVisualParams, sex: Creature['sex'] | null): CreatureFactoryArgs =>
  ({
    species: sp,
    creature: sex ? ({ id: 'x', speciesId: sp.id, sex, reproRole: sex === 'female' ? 'female' : 'male', lifeStage: 'adult' } as unknown as Creature) : null,
    appearance,
    lod: 0,
    quality: 'high',
    fx: {} as CreatureFactoryArgs['fx'],
  }) as CreatureFactoryArgs;

function finite(g: { getAttribute(n: string): { array: ArrayLike<number> } }, name: string): boolean {
  const arr = g.getAttribute(name).array;
  for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) return false;
  return true;
}

describe.each(Object.keys(PLANS))('%s body plan', (id) => {
  const sp = findSpecies(id)!;
  const planFn = PLANS[id];

  it('exists in the species registry', () => {
    expect(sp).toBeDefined();
  });

  it('builds finite body + fin geometry for every morph, sex and the juvenile form', () => {
    for (const a of looks(sp)) {
      for (const sex of ['male', 'female', null] as const) {
        const p0 = planFn(args(sp, a, sex));
        for (const p of [p0, juvenile(p0)]) {
          expect(p.fins.length).toBeLessThanOrEqual(MAX_FINS);
          expect((p.look.marks ?? []).length).toBeLessThanOrEqual(MAX_MARKS);
          expect((p.look.bands ?? []).length).toBeLessThanOrEqual(4);
          const b = new BodySampler(p.body);
          const body = buildBodyGeometry(b, { rings: 24, segments: 16 });
          const fins = buildFinGeometry(b, p.fins, 0.5);
          expect(finite(body, 'position'), `${id} body`).toBe(true);
          expect(finite(fins, 'position'), `${id} fins`).toBe(true);
          expect(finite(fins, 'aFold'), `${id} fin fold`).toBe(true);
          body.dispose();
          fins.dispose();
        }
      }
    }
  });

  it('keeps the body inside the standard-length envelope (nose ≈ +0.4, tail tip ≈ −0.6)', () => {
    const p = planFn(args(sp, sp.genetics.baseVisual, 'male'));
    const b = new BodySampler(p.body);
    const g = buildBodyGeometry(b, { rings: 24, segments: 16 });
    g.computeBoundingBox();
    const bb = g.boundingBox!;
    expect(bb.max.x).toBeLessThan(0.5);
    expect(bb.min.x).toBeGreaterThan(-0.45);
    expect(bb.max.y - bb.min.y).toBeLessThan(0.45);
    g.dispose();
  });
});

describe('sex- and fin-dependent geometry gets its own cache key', () => {
  it('sailfin molly: male sail vs female dorsal, lyretail vs normal tail', () => {
    const sp = findSpecies('sailfin_molly')!;
    const base = sp.genetics.baseVisual;
    const m = mollyPlan(args(sp, base, 'male'));
    const f = mollyPlan(args(sp, base, 'female'));
    const ly = mollyPlan(args(sp, { ...base, finType: 'lyretail', finLength: 1.3 }, 'male'));
    expect(new Set([m.key, f.key, ly.key]).size).toBe(3);
    // the male's sail is much taller than the female's dorsal
    const tallest = (p: FishPlan) => Math.max(...p.fins.filter((x) => x.role === 'dorsal').map((x) => Math.max(...[0, 0.25, 0.5, 0.75, 1].map((s) => x.ray(s).len))));
    expect(tallest(m)).toBeGreaterThan(tallest(f) * 2);
  });

  it('bumblebee goby: sexes differ (gravid female belly)', () => {
    const sp = findSpecies('bumblebee_goby')!;
    expect(bumblebeePlan(args(sp, sp.genetics.baseVisual, 'male')).key).not.toBe(bumblebeePlan(args(sp, sp.genetics.baseVisual, 'female')).key);
  });
});
