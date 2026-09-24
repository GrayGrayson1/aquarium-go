/**
 * The current AI step length, for per-step constants that were tuned at 60 steps/s. OWNER: lane "pc-perf".
 * `k` = dt × 60: exactly 1 at 60 Hz (so behaviour there is unchanged), 0.42 at 144 Hz, 2 at 30 Hz. Per-step chances
 * scale by `k`, per-step blend factors use `1 - (1 - f)^k`, per-step damping uses `f^k`.
 */
export const stepRate = { dt: 1 / 60, k: 1 };

export function setStepDt(dt: number): void {
  stepRate.dt = dt;
  stepRate.k = dt * 60;
}

/** A per-step blend factor `f` (tuned at 60 Hz) for the current step. */
export const perStep = (f: number): number => (stepRate.k === 1 ? f : 1 - Math.pow(1 - f, stepRate.k));
