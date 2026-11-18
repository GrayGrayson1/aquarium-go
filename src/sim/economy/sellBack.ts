/**
 * Audit 2026-11-17 (G19, G22; the owner's answer to C11 and F15) — the local store buys back what the player no longer
 * needs, at half its price as it already does for decorations (`SELL_BACK_FRACTION`), and an empty tank can be taken
 * down. Both are deterministic (no random draws) and add no save fields. The interface shows the amount and asks first.
 *
 * - Stored equipment sells for half its catalogue price, whatever its condition (the owner's words: "at half price,
 *   exactly as it already does for decorations"; no profit path: kit gear costs 0.9 of list, a repair 0.35).
 * - An empty tank (no animals, eggs or young; not listed; not in a production line) comes down: its equipment and decor
 *   go to storage through the same paths "Remove" and "To storage" use, the tank goes as an auctioned one does
 *   (`deleteTank`; the step's own tidying drops staff rounds, docent talks and visits to it), and the store pays half
 *   the bare tank's price. Taking down the last tank leaves the room empty, as selling the last one at auction does.
 */
import type { EquipmentDef, EquipmentKind, GameState } from '@/types';
import type { ActionResult } from '../care';
import { removeEquipment } from '../care';
import { removeDecor, SELL_BACK_FRACTION } from '../aquascape';
import { deleteTank } from '../tanks';
import { emitEvent } from '../context';
import { isUnlocked } from '../facility';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { TANK_TIER_BY_ID, TANK_TIERS } from '@/data/catalog/tanks';
import { earn } from './finance';
import { fmtMoney } from './util';

/** What the store pays for a stored unit: half its catalogue price (review: flat, as the owner approved it). */
export function equipmentSellValue(def: EquipmentDef | null | undefined): number {
  return def ? Math.round(def.price * SELL_BACK_FRACTION) : 0;
}

/** Sell one unit from storage to the local store. */
export function sellStoredEquipment(state: GameState, instanceId: string): ActionResult {
  const idx = state.inventory.equipment.findIndex((e) => e.id === instanceId);
  if (idx < 0) return { ok: false, message: 'That equipment isn’t in storage any more.' };
  const inst = state.inventory.equipment[idx];
  const def = getEquipmentDef(inst.defId);
  const name = def?.name ?? 'Equipment';
  const value = equipmentSellValue(def);
  state.inventory.equipment.splice(idx, 1);
  if (value > 0) earn(state, value, 'equipment', `Sold ${name} from storage`);
  return { ok: true, message: value > 0 ? `${name} sold for ${fmtMoney(value)}.` : `${name} given to the store for parts.` };
}

/** A kind of equipment in a sentence ("its heater, 2 filters and 4 decor pieces"). */
const KIND_WORD: Record<EquipmentKind, [string, string]> = {
  filter: ['filter', 'filters'],
  heater: ['heater', 'heaters'],
  chiller: ['chiller', 'chillers'],
  fan: ['fan', 'fans'],
  light: ['light', 'lights'],
  airstone: ['air stone', 'air stones'],
  powerhead: ['powerhead', 'powerheads'],
  skimmer: ['skimmer', 'skimmers'],
  ato: ['top-off unit', 'top-off units'],
  co2: ['CO₂ unit', 'CO₂ units'],
  autofeeder: ['autofeeder', 'autofeeders'],
  uv: ['UV steriliser', 'UV sterilisers'],
  refugium: ['refugium', 'refugiums'],
  wavemaker: ['wavemaker', 'wavemakers'],
  lid: ['lid', 'lids'],
  water_changer: ['water changer', 'water changers'],
  doser: ['doser', 'dosers'],
};

/** "a, b and c" */
const andList = (parts: string[]): string => (parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`);

/** What taking a tank down would do, or why it can't (the tank card shows it before asking). */
export interface TakeDownCheck {
  ok: boolean;
  /** Why not, in a sentence (when `ok` is false). */
  reason?: string;
  /** The tank as a sentence names it: "the 20 Gallon", or a name the player gave it. */
  called: string;
  /** The store's payment for the bare tank. */
  value: number;
  /** What goes to storage, as a sentence names it ("its heater, filter and 4 decor pieces"); '' when nothing. */
  stores: string;
  /** Review fix: more than one thing goes to storage ("… go to storage"; one: "… goes to storage"). */
  storesMany: boolean;
  /** It's the player's only tank: the room is left empty. */
  last: boolean;
}

export function takeDownCheck(state: GameState, tankId: string): TakeDownCheck {
  const tank = Object.hasOwn(state.tanks, tankId) ? state.tanks[tankId] : undefined;
  if (!tank) return { ok: false, reason: 'That tank no longer exists.', called: 'that tank', value: 0, stores: '', storesMany: false, last: false };
  const tier = TANK_TIER_BY_ID[tank.tierId];
  // a tank still called by its size ("10 Gallon", "10 Gallon 2") reads "the 10 Gallon"; a name of its own stands alone
  const called = tier && (tank.name === tier.name || tank.name.startsWith(`${tier.name} `)) ? `the ${tank.name}` : tank.name;
  const kinds = new Map<EquipmentKind, number>();
  for (const e of tank.equipment) {
    const k = getEquipmentDef(e.defId)?.kind;
    if (k) kinds.set(k, (kinds.get(k) ?? 0) + 1);
  }
  const parts = [...kinds].map(([k, n]) => (n === 1 ? KIND_WORD[k]?.[0] ?? k : `${n} ${KIND_WORD[k]?.[1] ?? k}`));
  // review fix: one piece is "its decor piece", never "its 1 decor piece"
  if (tank.decor.length) parts.push(tank.decor.length === 1 ? 'decor piece' : `${tank.decor.length} decor pieces`);
  const view: TakeDownCheck = { ok: true, called, value: tier ? Math.round(tier.price * SELL_BACK_FRACTION) : 0, stores: parts.length ? `its ${andList(parts)}` : '', storesMany: tank.equipment.length + tank.decor.length > 1, last: state.tankOrder.length <= 1 };
  const refuse = (reason: string): TakeDownCheck => ({ ...view, ok: false, reason });
  if (tank.listingId) return refuse('It’s listed for sale. Withdraw the listing first.');
  if (Object.values(state.creatures).some((c) => c.tankId === tankId && (c.status === 'alive' || c.status === 'listed'))) return refuse('Animals live in it. Move them to another tank first.');
  // review fix: young that grow up stay in the tank, so waiting frees nothing
  if (Object.values(state.clutches).some((cl) => cl.tankId === tankId && cl.count > 0)) return refuse('Eggs or young are in it. Move them to another tank first.');
  const line = (state.production?.lines ?? []).find((l) => l.tanks.breed === tankId || l.tanks.raise === tankId || l.tanks.keep === tankId || l.tanks.quarantine.includes(tankId) || l.pair.restTankId === tankId);
  // review fix: line names already end in "line", and a line's tanks are changed (or the line ended) in Livestock › Production
  if (line) return refuse(`${line.name} uses it. Give the line another tank in Livestock › Production, or end the line there, first.`);
  return view;
}

/** Take an empty tank down: its gear and decor to storage, half the bare tank's price back. */
export function takeDownTank(state: GameState, tankId: string): ActionResult {
  const check = takeDownCheck(state, tankId);
  if (!check.ok) return { ok: false, message: check.reason ?? 'That tank can’t be taken down.' };
  const tank = state.tanks[tankId];
  // the same paths as Build's "Remove" and "To storage", so nothing is lost or counted twice
  for (const e of [...tank.equipment]) removeEquipment(state, tankId, e.id);
  for (const d of [...tank.decor]) removeDecor(state, tankId, d.id, false);
  deleteTank(state, tankId);
  if (check.value > 0) earn(state, check.value, 'tank_purchase', `Took down ${tank.name}`);
  const stored = check.stores ? ` ${check.stores.charAt(0).toUpperCase()}${check.stores.slice(1)} went to storage.` : '';
  if (!state.tankOrder.length && !state.isShowcase) {
    // as when the last tank goes at auction (listings.ts): the room is empty, and the way back
    const cheap = TANK_TIERS.filter((t) => isUnlocked(state, t.unlock)).sort((a, b) => a.price - b.price)[0];
    emitEvent(state, { kind: 'info', text: `You have ${fmtMoney(state.finance.money)} and an empty room — ${cheap ? `a ${cheap.name} kit starts at about ${fmtMoney(cheap.price)}. ` : ''}Tip: start the next tank early, because new tanks need time to cycle before animals move in.`, toast: true });
  }
  return { ok: true, message: `Took down ${check.called}.${stored} You got ${fmtMoney(check.value)} back for the tank.` };
}
