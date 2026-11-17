/**
 * Audit 2026-11-17 (D15) — moving an animal into a tank the preview calls High risk or Incompatible asks for the same
 * tick as buying it into that tank (src/ui/panels/market/buyState.ts). OWNER: lane "ui-shell".
 */
import type { CompatVerdict } from '@/types';

export function moveNeedsAck(verdict: CompatVerdict | null | undefined): boolean {
  return verdict === 'high_risk' || verdict === 'incompatible';
}

/** The move button: what it says, and whether it can be pressed. */
export function moveButton(i: { tankName: string | null; gateOk: boolean; verdict: CompatVerdict | null | undefined; acknowledged: boolean }): { label: string; enabled: boolean } {
  if (!i.tankName) return { label: 'Choose a tank', enabled: false };
  if (moveNeedsAck(i.verdict) && !i.acknowledged) return { label: 'Confirm the risk first', enabled: false };
  return { label: `Move to ${i.tankName}`, enabled: i.gateOk };
}
