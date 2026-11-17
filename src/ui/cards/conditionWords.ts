/**
 * Audit 2026-11-17 — the creature card's condition words and colours, on the same lines as its Condition box and the
 * tank card (src/sim/life `creatureWellbeing`, src/sim/tankStatus.ts), so a meter never says one thing while the box
 * says another. OWNER: lane "ui-shell".
 */

/** D12: an illness's severity as the card shows it. The sim keeps it 0–100 (never a 0–1 fraction); recovery is at ≤ 0.01. */
export function illnessSeverityPct(severity: number): number {
  return Math.max(1, Math.round(Number.isFinite(severity) ? severity : 0));
}

/**
 * D10: the Stress meter on the Condition box's lines (src/sim/life `creatureWellbeing`, src/sim/tankStatus.ts): stressed
 * above 55 (Watch, with the reason in the box), panicking above 80 (Danger).
 */
export function stressWord(s: number): string {
  return s < 20 ? 'Calm' : s <= 55 ? 'Settled' : s <= 80 ? 'Stressed' : 'Panicking';
}
export function stressTone(s: number): 'good' | 'watch' | 'danger' {
  return s > 80 ? 'danger' : s > 55 ? 'watch' : 'good';
}

/** D10: the Health meter on the Condition box's lines: Watch under 75, Danger under 40. */
export function healthWord(h: number): string {
  return h >= 90 ? 'Great' : h >= 75 ? 'Good' : h >= 40 ? 'Low' : 'Poor';
}
export function healthTone(h: number): 'good' | 'watch' | 'danger' {
  return h < 40 ? 'danger' : h < 75 ? 'watch' : 'good';
}
