// @vitest-environment node
/**
 * chunk 6 (B-180, the review's M80) — far tanks' AI cost: each far tank steps at its own phase instead of all on the
 * same frame, waits while the AI is over its frame budget (but always moves at least at half rate), and a tank hidden
 * in tank view steps a quarter as often (throttled, never frozen); every tank's creatures and clutches come from one
 * index per game version instead of each TankAI scanning them all. Presentation only: the simulation is untouched.
 */
import { describe, it, expect } from 'vitest';
import { AI_MAX_STEP, FAR_PERIOD, HIDDEN_PERIOD, farPhase, planFarStep, type FarStep } from '@/ai/core/steps';
import { indexByTank } from '@/ai/core/tankIndex';
import { newGame } from '@/sim/newGame';
import { lineFarm } from './support/production';

/** Steps a tank takes over `seconds` of frames at `hz`, with the AI over budget on every `overEvery`-th frame. */
function stepsOver(seconds: number, hz: number, period: number, overEvery = 0, accum0 = 0): { steps: number; maxPerFrame: number } {
  const out: FarStep = { accum: accum0, h: 0 };
  let steps = 0;
  let maxPerFrame = 0;
  for (let i = 0; i < seconds * hz; i++) {
    planFarStep(out.accum, 1 / hz, period, overEvery > 0 && i % overEvery === 0, out);
    const n = out.h > 0 ? 1 : 0;
    steps += n;
    maxPerFrame = Math.max(maxPerFrame, n);
    expect(out.h === 0 || out.h === AI_MAX_STEP).toBe(true);
  }
  return { steps, maxPerFrame };
}

describe('B-180: far and hidden tanks', () => {
  it('a far tank keeps its pace at any frame rate: one 50 ms step per 50 ms, never two in a frame', () => {
    for (const hz of [30, 60, 144]) {
      const r = stepsOver(10, hz, FAR_PERIOD);
      expect(r.maxPerFrame).toBe(1);
      expect(r.steps).toBeGreaterThanOrEqual(199);
      expect(r.steps).toBeLessThanOrEqual(200);
    }
  });

  it('a hidden tank steps a quarter as often, and never stops', () => {
    const r = stepsOver(10, 60, HIDDEN_PERIOD);
    expect(r.steps).toBeGreaterThanOrEqual(49);
    expect(r.steps).toBeLessThanOrEqual(50);
  });

  it('over the frame budget a far tank waits, but still moves at least at half its rate', () => {
    const always = stepsOver(10, 60, FAR_PERIOD, 1);
    expect(always.steps).toBeGreaterThanOrEqual(95); // half rate: one step per 100 ms
    expect(always.steps).toBeLessThanOrEqual(101);
    const sometimes = stepsOver(10, 60, FAR_PERIOD, 3);
    expect(sometimes.steps).toBeGreaterThan(always.steps);
  });

  it('a long frame never queues catch-up: the carry is capped at two periods', () => {
    const out = planFarStep(0, 5, FAR_PERIOD, false);
    expect(out.h).toBe(AI_MAX_STEP);
    expect(out.accum).toBeLessThanOrEqual(FAR_PERIOD + 1e-9);
    expect(planFarStep(Number.NaN, Number.NaN, FAR_PERIOD, false)).toEqual({ accum: 0, h: 0 });
  });

  it('far tanks start at their own phase, so fifteen of them no longer step on the same frame', () => {
    const ids = Array.from({ length: 15 }, (_, i) => `tank_${i + 1}`);
    const phases = ids.map((id) => farPhase(id));
    for (const p of phases) expect(p >= 0 && p < FAR_PERIOD).toBe(true);
    expect(farPhase('tank_7')).toBe(farPhase('tank_7')); // stable
    // the frame each tank first steps on at 60 Hz: spread over the 50 ms period, not all on one
    const firstFrame = phases.map((p) => {
      const out: FarStep = { accum: p, h: 0 };
      for (let f = 1; f <= 10; f++) if (planFarStep(out.accum, 1 / 60, FAR_PERIOD, false, out).h > 0) return f;
      return -1;
    });
    expect(new Set(firstFrame).size).toBeGreaterThanOrEqual(3);
    expect(Math.max(...firstFrame.map((f) => firstFrame.filter((x) => x === f).length))).toBeLessThan(15);
  });

  it('one index per game version gives each tank the creatures and clutches the old per-tank scan found, in order', () => {
    for (const g of [newGame({ starterId: 'betta', starterName: 'Index', seed: 4 }), lineFarm(17).g]) {
      const index = indexByTank(g);
      for (const id of g.tankOrder) {
        expect((index.creatures.get(id) ?? []).map((c) => c.id)).toEqual(Object.values(g.creatures).filter((c) => c.tankId === id).map((c) => c.id));
        expect((index.clutches.get(id) ?? []).map((c) => c.id)).toEqual(Object.values(g.clutches).filter((c) => c.tankId === id).map((c) => c.id));
      }
    }
  });
});
