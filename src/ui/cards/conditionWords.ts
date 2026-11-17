/**
 * Audit 2026-11-17 — the creature card's condition words and colours, on the same lines as its Condition box and the
 * tank card (src/sim/life `creatureWellbeing`, src/sim/tankStatus.ts), so a meter never says one thing while the box
 * says another. OWNER: lane "ui-shell".
 */

/** D12: an illness's severity as the card shows it. The sim keeps it 0–100 (never a 0–1 fraction); recovery is at ≤ 0.01. */
export function illnessSeverityPct(severity: number): number {
  return Math.max(1, Math.round(Number.isFinite(severity) ? severity : 0));
}
