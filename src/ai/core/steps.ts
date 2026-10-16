/**
 * How a rendered frame's time becomes AI steps (used by TankAI and the motion scan). Pure. OWNER: lane "behavior".
 *
 * A long frame is split into two even substeps so fast fish never tunnel through decor — never more than two, and
 * none at all once the AI is over its per-frame time budget: then the frame gets one step and the excess time is
 * dropped (the animals slow down for a moment). Catching up in full made a slow frame cost more AI work, which made
 * the next frame slower still.
 */

/** Longest frame (s) the AI simulates at all; anything beyond is dropped (a tab switch, a GC pause). */
export const AI_MAX_FRAME_DT = 0.1;
/** Longest single AI step (s) — stepWorld clamps to this too. */
export const AI_MAX_STEP = 0.05;
/** Frames longer than this (s) are split into two even substeps while there is time budget for it. */
export const AI_SUBSTEP_OVER = 1 / 30;
/** AI time per rendered frame (ms, all tanks together) above which frames are no longer substepped. */
export const AI_FRAME_BUDGET_MS = 4;

export interface AiSteps {
  /** Number of steps (1 or 2). */
  n: number;
  /** Length of each step (s). */
  h: number;
}

/**
 * Plan the AI steps for a frame of `delta` seconds. `overBudget`: the AI already spent its time budget (this frame,
 * or the last one) — no substeps.
 */
export function planAiSteps(delta: number, overBudget: boolean, out: AiSteps = { n: 1, h: 0 }): AiSteps {
  const dt = Number.isFinite(delta) ? Math.min(Math.max(delta, 0), AI_MAX_FRAME_DT) : 0;
  if (dt > AI_SUBSTEP_OVER && !overBudget) {
    out.n = 2;
    out.h = Math.min(dt / 2, AI_MAX_STEP);
  } else {
    out.n = dt > 0 ? 1 : 0;
    out.h = Math.min(dt, AI_MAX_STEP);
  }
  return out;
}

// ───────────── chunk 6 (B-180) — far and hidden tanks ─────────────

/** A far tank (lod 2) takes one AI_MAX_STEP step whenever this much time has accrued (s). */
export const FAR_PERIOD = AI_MAX_STEP;
/**
 * A tank the player can't see (beyond the tank-view radius, SceneRoot) takes the same step a quarter as often:
 * throttled, never frozen, so its animals are where they should roughly be when it comes back into view.
 */
export const HIDDEN_PERIOD = 4 * AI_MAX_STEP;

/** A tank's stable phase in [0, period): far tanks no longer all step on the same frame (B-180). */
export function farPhase(tankId: string, period = FAR_PERIOD): number {
  let h = 2166136261;
  for (let i = 0; i < tankId.length; i++) h = Math.imul(h ^ tankId.charCodeAt(i), 16777619);
  return (((h >>> 0) % 1000) / 1000) * period;
}

export interface FarStep {
  /** Time carried to the next frame (s). */
  accum: number;
  /** This frame's step (s): AI_MAX_STEP, or 0 for none. */
  h: number;
}

/**
 * A far or hidden tank's step for a frame of `delta` seconds: one step once `period` has accrued, never more than one
 * a frame, the carry capped at two periods (a long frame never queues catch-up). Over the AI's frame budget the step
 * waits until the carry reaches its cap, then takes one step and drops the period it waited: a far tank always moves
 * at least at half its rate.
 */
export function planFarStep(accum: number, delta: number, period: number, overBudget: boolean, out: FarStep = { accum: 0, h: 0 }): FarStep {
  const dt = Number.isFinite(delta) ? Math.min(Math.max(delta, 0), AI_MAX_FRAME_DT) : 0;
  const carry = Math.min((Number.isFinite(accum) ? Math.max(0, accum) : 0) + dt, 2 * period);
  if (carry >= period && !overBudget) {
    out.h = AI_MAX_STEP;
    out.accum = carry - period;
  } else if (overBudget && carry >= 2 * period - 1e-9) {
    out.h = AI_MAX_STEP; // the waited period is dropped: the animals slow down for a moment, the frame costs one step
    out.accum = 0;
  } else {
    out.h = 0;
    out.accum = carry;
  }
  return out;
}
