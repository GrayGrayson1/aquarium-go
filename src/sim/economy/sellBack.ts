/**
 * Audit 2026-11-17 (G22; the owner's answer to C11 and F15) — the local store buys back what the player no longer
 * needs, at half its price as it already does for decorations (`SELL_BACK_FRACTION`). Deterministic (no random draws),
 * no save fields. The interface shows the amount and asks first.
 *
 * - Stored equipment sells for half its catalogue price, scaled by its condition (as a part-rotted almond leaf sells
 *   for what is left of it); a broken unit fetches half that again (the store has to fix it).
 */
import type { EquipmentDef, EquipmentInstance, GameState } from '@/types';
import type { ActionResult } from '../care';
import { SELL_BACK_FRACTION } from '../aquascape';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { earn } from './finance';
import { clamp, fmtMoney } from './util';

/** What the store pays for a stored unit: half its price, by its condition; half that again when it's broken. */
export function equipmentSellValue(def: EquipmentDef | null | undefined, inst: Pick<EquipmentInstance, 'condition' | 'failed'>): number {
  if (!def) return 0;
  const condition = clamp(Number.isFinite(inst.condition) ? inst.condition : 1, 0, 1);
  return Math.round(def.price * SELL_BACK_FRACTION * condition * (inst.failed ? 0.5 : 1));
}

/** Sell one unit from storage to the local store. */
export function sellStoredEquipment(state: GameState, instanceId: string): ActionResult {
  const idx = state.inventory.equipment.findIndex((e) => e.id === instanceId);
  if (idx < 0) return { ok: false, message: 'That equipment isn’t in storage any more.' };
  const inst = state.inventory.equipment[idx];
  const def = getEquipmentDef(inst.defId);
  const name = def?.name ?? 'Equipment';
  const value = equipmentSellValue(def, inst);
  state.inventory.equipment.splice(idx, 1);
  if (value > 0) earn(state, value, 'equipment', `Sold ${name} from storage`);
  return { ok: true, message: value > 0 ? `${name} sold for ${fmtMoney(value)}.` : `${name} given to the store for parts.` };
}
