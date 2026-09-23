import { describe, expect, it } from 'vitest';
import { AI_MAX_FRAME_DT, AI_MAX_STEP, planAiSteps } from './steps';

describe('AI frame stepping (TankAI catch-up)', () => {
  it('steps an ordinary frame once, in full', () => {
    expect(planAiSteps(1 / 60, false)).toEqual({ n: 1, h: 1 / 60 });
    expect(planAiSteps(1 / 30, false)).toEqual({ n: 1, h: 1 / 30 });
  });

  it('splits a long frame into two even substeps — never more', () => {
    const s = planAiSteps(0.04, false);
    expect(s.n).toBe(2);
    expect(s.h).toBeCloseTo(0.02, 9);
    for (const dt of [0.05, 0.07, 0.1, 0.3, 5]) {
      const p = planAiSteps(dt, false);
      expect(p.n).toBe(2);
      expect(p.h).toBeLessThanOrEqual(AI_MAX_STEP);
      expect(p.n * p.h).toBeLessThanOrEqual(AI_MAX_FRAME_DT + 1e-9);
    }
  });

  it('over its time budget, a long frame gets one step and the excess is dropped (no spiral)', () => {
    expect(planAiSteps(0.04, true)).toEqual({ n: 1, h: 0.04 });
    expect(planAiSteps(0.2, true)).toEqual({ n: 1, h: AI_MAX_STEP });
    // the work per frame is bounded however slow frames get
    for (const dt of [0.02, 0.05, 0.1, 1]) expect(planAiSteps(dt, true).n).toBe(1);
  });

  it('ignores nonsense frame times', () => {
    expect(planAiSteps(0, false).n).toBe(0);
    expect(planAiSteps(-1, false).n).toBe(0);
    expect(planAiSteps(Number.NaN, false).n).toBe(0);
  });
});
