import { describe, expect, it } from 'vitest';
import { newGame, previewStarters } from '@/sim/newGame';
import type { StarterId } from '@/data/species';
import { behaviorCrowd, behaviorPredators } from '@/dev/fixtures/behavior-lab';
import { scanMotion, type MotionScenario } from './motionScan';

const STARTERS: StarterId[] = ['axolotl', 'betta', 'pea_puffer', 'ocellaris_clownfish', 'lined_seahorse'];
// 1234 and 5 are the layouts where the axolotl starts squeezed between spider wood and the front glass
const SEEDS = [1234, 5];
const scenarios: MotionScenario[] = STARTERS.flatMap((s) =>
  SEEDS.map((seed) => ({
    name: `${s}#${seed}`,
    maxTanks: 1,
    build: () => {
      const p = previewStarters(seed)[s];
      return newGame({ starterId: s, starterName: p.name, seed, starterCreature: p });
    },
  })),
);
// Animals that settle into decor: the peacock mantis shrimp at its burrow in a rubble mound (it used to press into the
// mound's side and trade its heading between the sand and the rock ~12×/s — visible on screen), and a crowded planted
// tank where kuhli loaches share a hide, corys rest side by side and shrimp and otos climb stones and wood.
const settlers: MotionScenario[] = [
  { name: 'behavior-predators', build: behaviorPredators, maxTanks: 1 },
  { name: 'behavior-crowd', build: behaviorCrowd, maxTanks: 1 },
];

const describeJitter = (r: ReturnType<typeof scanMotion>) =>
  [...r.bySpecies.entries()].filter(([, st]) => st.jitterWindows > 0).map(([sp, st]) => `${sp} ${st.jitterWindows}/${st.windows}: ${st.example}`);
const share = (r: ReturnType<typeof scanMotion>) => r.jitterWindows / Math.max(1, r.windows);

describe('creature motion quality (uneven browser frame times)', () => {
  it('starter animals do not vibrate in place — raw AI motion', () => {
    const r = scanMotion(scenarios, { secs: 45 });
    // the axolotl used to shake ~40×/s against glass, wood and stones from the first second
    expect(r.bySpecies.get('axolotl')!.jitterWindows, describeJitter(r).join('\n')).toBe(0);
    expect(share(r), describeJitter(r).join('\n')).toBeLessThan(0.005);
  });

  it('what is drawn is steady', () => {
    const r = scanMotion(scenarios, { secs: 45, drawn: true });
    expect(share(r), describeJitter(r).join('\n')).toBeLessThan(0.002);
  });

  it('burrowing and hiding animals settle without shaking', () => {
    let atBurrow = 0;
    let settled = 0;
    let facingOut = 0;
    const r = scanMotion(settlers, {
      secs: 36,
      onFrame: ({ a, t }) => {
        // (it walks there first, and later may go foraging: count its time at the burrow once it has had time to arrive)
        if (a.speciesId !== 'peacock_mantis_shrimp' || t < 12 || a.act !== 'burrow') return;
        atBurrow++;
        // sitting in its burrow mouth (not orbiting under a coral or walking the mound's side), facing out into the tank
        if (Math.hypot(a.rt.pos.x - a.home.x, a.rt.pos.z - a.home.z) < a.L * 0.5) {
          settled++;
          if (a.fwd.z > 0.3) facingOut++;
        }
      },
    });
    const why = describeJitter(r).join('\n');
    expect(r.bySpecies.get('peacock_mantis_shrimp')!.jitterWindows, why).toBe(0);
    expect(r.bySpecies.get('kuhli_loach')!.jitterWindows, why).toBeLessThanOrEqual(1);
    expect(share(r), why).toBeLessThan(0.004);
    expect(atBurrow).toBeGreaterThan(100);
    expect(settled / atBurrow).toBeGreaterThan(0.9);
    expect(facingOut / settled).toBeGreaterThan(0.8);
    // and what is drawn of them is still
    const d = scanMotion(settlers, { secs: 36, drawn: true });
    expect(share(d), describeJitter(d).join('\n')).toBeLessThan(0.001);
  });

  it('long, uneven frames (a busy browser at 17–25 fps) stay steady, substepped or over budget', () => {
    for (const overBudget of [false, true]) {
      const r = scanMotion(scenarios, { secs: 45, frameMs: [40, 60], overBudget });
      const why = `${overBudget ? 'over budget' : 'two substeps'}\n${describeJitter(r).join('\n')}`;
      expect(r.bySpecies.get('axolotl')!.jitterWindows, why).toBe(0);
      expect(share(r), why).toBeLessThan(0.015);
      const d = scanMotion(scenarios, { secs: 45, frameMs: [40, 60], overBudget, drawn: true });
      expect(share(d), `${overBudget ? 'over budget' : 'two substeps'} (drawn)\n${describeJitter(d).join('\n')}`).toBeLessThan(0.01);
    }
  });
});
