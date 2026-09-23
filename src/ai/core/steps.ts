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
