/** Breeding lane — the ?fixture=breeding_* dev fixtures produce the states renderers/AI iterate against. */
import { describe, it, expect, vi } from 'vitest';
import { BREEDING_FIXTURES } from '@/dev/fixtures/breeding';

vi.setConfig({ testTimeout: 240_000 });

describe('breeding fixtures', () => {
  it('breeding_betta: male guarding a bubble nest of eggs, female moved out', () => {
    const g = BREEDING_FIXTURES.breeding_betta();
    const cl = Object.values(g.clutches).find((c) => c.speciesId === 'betta');
    expect(cl?.visual).toBe('bubble_nest');
    expect(cl?.anchor).toBeDefined();
    const male = g.creatures[cl!.guardedById!];
    expect(male.repro.stage).toBe('guarding');
    expect(male.tankId).toBe(cl!.tankId);
    const female = g.creatures[cl!.motherId!];
    expect(female.tankId).not.toBe(cl!.tankId);
  });

  it('breeding_betta_fry: free-swimming fry, male moved out', () => {
    const g = BREEDING_FIXTURES.breeding_betta_fry();
    const cl = Object.values(g.clutches).find((c) => c.speciesId === 'betta');
    expect(cl?.stage).toBe('fry');
    expect(cl?.visual).toBe('fry_cloud');
  });

  it('breeding_axolotl: eggs laid singly across plants', () => {
    const g = BREEDING_FIXTURES.breeding_axolotl();
    const cl = Object.values(g.clutches).find((c) => c.speciesId === 'axolotl');
    expect(cl?.visual).toBe('egg_strands');
    expect((cl?.extraAnchors ?? []).length).toBeGreaterThan(0);
  });

  it('breeding_clownfish: adhesive eggs with the male guarding', () => {
    const g = BREEDING_FIXTURES.breeding_clownfish();
    const cl = Object.values(g.clutches).find((c) => c.speciesId === 'ocellaris_clownfish');
    expect(cl?.visual).toBe('eggs_adhesive');
    expect(g.creatures[cl!.guardedById!].repro.stage).toBe('guarding');
  });

  it('breeding_seahorse: a visibly pregnant male', () => {
    const g = BREEDING_FIXTURES.breeding_seahorse();
    const dad = Object.values(g.creatures).find((c) => c.repro.stage === 'pregnant');
    expect(dad).toBeDefined();
    expect(dad!.repro.progress ?? 0).toBeGreaterThanOrEqual(0.6);
    const cl = g.clutches[dad!.repro.clutchId!];
    expect(cl.visual).toBe('pouch');
  });
});
