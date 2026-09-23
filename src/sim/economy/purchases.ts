/**
 * Purchases: livestock offers, tank kits, equipment, food and salt. Pattern: validate → spend → act → log.
 * OWNER: lane "market". Purchases can never push money below 0 (spend without allowDebt).
 */
import type { GameState, WaterClass, Creature } from '@/types';
import type { ActionResult } from '../care';
import { refreshFoodStatus } from '../tankStatus';
import { installEquipment } from '../care';
import { environmentGate } from '../compat';
import { addCreature } from '../life';
import { generateName } from '../life/names';
import { mulberry32, hashString } from '../rng';
import { createTank, defaultSubstrate } from '../tanks';
import { defaultEquipmentFor } from '../water';
import { isUnlocked, findFreeSpot, bumpCounter } from '../facility';
import { emitEvent } from '../context';
import { findSpecies } from '@/data/species';
import { TANK_TIER_BY_ID } from '@/data/catalog/tanks';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getFoodDef } from '@/data/catalog/foods';
import { getSubstrateDef } from '@/data/catalog/substrates';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { spend, canAfford } from './finance';
import { clonePlain, fmtMoney, finite, nicePrice, pushCapped, speciesPlural, roundCents, aOrAn } from './util'; // lane:w2-ui: aOrAn ("an 800 Gallon Exhibit")

/** Marine salt mix price per kg. */
export const SALT_PRICE_PER_KG = 3;
/** Kit discount on bundled default equipment. */
const KIT_EQUIPMENT_DISCOUNT = 0.9;

const fail = (message: string): ActionResult => ({ ok: false, message });

function needMoney(state: GameState, price: number, what: string): ActionResult {
  const money = state.finance.money;
  if (money < 0) return fail(`You're ${fmtMoney(-money)} in debt, so purchases are paused. Sell something or wait for income first.`);
  return fail(`Not enough money for ${what}: it costs ${fmtMoney(price)} and you have ${fmtMoney(money)}.`);
}

function unlockHint(key: string | null): string {
  if (!key) return '';
  return (UNLOCK_KEYS as Record<string, string>)[key] ?? key.replace(/_/g, ' ');
}

// ───────────────────────────── livestock ─────────────────────────────

export function buyOffer(state: GameState, offerId: string, tankId: string, creatureIndexes?: number[]): ActionResult {
  const m = state.market;
  const offer = m.stock.find((o) => o.id === offerId);
  if (!offer) return fail('That offer is no longer available.');
  const now = state.clock.hour;
  if (offer.expiresHour <= now) {
    m.stock = m.stock.filter((o) => o.id !== offerId);
    return fail('That offer has expired.');
  }
  const tank = state.tanks[tankId];
  if (!tank) return fail('Choose a tank for the new arrivals.');
  const sp = findSpecies(offer.speciesId);
  if (!sp) return fail('Unknown species.');
  let gate: { ok: boolean; reason?: string };
  try {
    gate = environmentGate(sp, tank);
  } catch {
    gate = sp.environment === tank.environment ? { ok: true } : { ok: false, reason: `${sp.commonName} can't live in a ${tank.environment} tank.` };
  }
  if (!gate.ok) return fail(gate.reason ?? `${sp.commonName} can't live in this tank's water.`);

  const total = offer.creatures.length;
  if (total === 0) {
    m.stock = m.stock.filter((o) => o.id !== offerId);
    return fail('That offer is sold out.');
  }
  let idx: number[];
  if (creatureIndexes && creatureIndexes.length) {
    const uniq = [...new Set(creatureIndexes)];
    if (uniq.length !== creatureIndexes.length || uniq.some((i) => !Number.isInteger(i) || i < 0 || i >= total)) return fail('Choose valid animals from this offer.');
    idx = uniq.sort((a, b) => a - b);
  } else idx = offer.creatures.map((_, i) => i);
  const all = idx.length === total;
  const unit = offer.unitPrice ?? Math.max(1, nicePrice((offer.price / total) * 1.12));
  const price = all ? offer.price : Math.min(offer.price, Math.max(1, Math.round(unit * idx.length)));
  const label = offer.label ?? `${idx.length} ${speciesPlural(offer.speciesId)}`;
  if (!spend(state, price, 'livestock_purchase', `Bought ${all ? label : `${idx.length} × ${sp.commonName}`} from ${offer.seller}`)) return needMoney(state, price, label);

  const perPrice = roundCents(price / idx.length);
  const bought: Creature[] = [];
  // Names already in the player's collection (animals born or bought since this offer was rolled can collide).
  const taken = new Set<string>();
  for (const x of Object.values(state.creatures)) if (x.status === 'alive' || x.status === 'listed') taken.add(x.name);
  for (const i of idx) {
    const c = clonePlain(offer.creatures[i]);
    if (taken.has(c.name)) {
      // Deterministic rename that leaves the sim RNG stream untouched.
      const old = c.name;
      c.name = generateName(sp, mulberry32(hashString(`rename:${c.id}:${old}`)), taken, c.sex); // lane:w2-sim: sex-matched
      for (let n = 2; taken.has(c.name); n++) c.name = `${old} ${n}`;
    }
    taken.add(c.name);
    c.status = 'alive';
    c.acquiredHour = now;
    c.purchasePrice = perPrice;
    if (!Array.isArray(c.history)) c.history = [];
    pushCapped(c.history, { hour: now, kind: 'acquired', text: `Bought from ${offer.seller} for ${fmtMoney(perPrice)}.` }, 40);
    addCreature(state, c, tankId);
    bought.push(c);
    if (!state.progress.discoveredSpecies.includes(c.speciesId)) state.progress.discoveredSpecies.push(c.speciesId);
    const mk = `${c.speciesId}:${c.morphName}`;
    if (!state.progress.discoveredMorphs.includes(mk)) state.progress.discoveredMorphs.push(mk);
  }

  if (all) m.stock = m.stock.filter((o) => o.id !== offerId);
  else {
    const keep = offer.creatures.filter((_, i) => !idx.includes(i));
    offer.price = Math.max(1, nicePrice((offer.price * keep.length) / total));
    offer.creatures = keep;
    offer.kind = keep.length > 1 ? 'group' : 'creature';
    if (keep.length > 1 && /^(Group|Colony) of \d+/.test(offer.label ?? '')) offer.label = offer.label!.replace(/of \d+/, `of ${keep.length}`);
  }
  bumpCounter(state, 'purchases');
  bumpCounter(state, 'animalsBought', bought.length);

  const who = bought.length === 1 ? bought[0].name : `${bought.length} ${speciesPlural(offer.speciesId)}`;
  // Same threshold as the water report's cycle DANGER (< 40 % established with animals in the tank).
  const uncycled = finite(tank.water?.bioMaturity, 1) < 0.4;
  emitEvent(state, {
    kind: uncycled ? 'warning' : 'info',
    text: `${who} arrived in ${tank.name}.${uncycled ? ' This tank is not cycled yet — feed lightly and watch ammonia closely.' : ' Give them a little time to settle in.'}`,
    tankId,
    creatureId: bought[0]?.id,
  });
  return { ok: true, message: `${who} added to ${tank.name} for ${fmtMoney(price)}.` };
}

// ───────────────────────────── tanks ─────────────────────────────

/** Price of the optional "seeded with mature media" add-on for a tier. */
export function seededMediaPrice(tierId: string): number {
  const g = TANK_TIER_BY_ID[tierId]?.gallons ?? 20;
  return nicePrice(15 + g * 0.6);
}

/** Kit price: tank + stand, default equipment (bundled at a discount) and substrate. */
export function tankKitPrice(tierId: string, waterClass: WaterClass, seeded = false): { total: number; tank: number; equipment: number; substrate: number; seeded: number } {
  const tier = TANK_TIER_BY_ID[tierId];
  if (!tier) return { total: 0, tank: 0, equipment: 0, substrate: 0, seeded: 0 };
  let equipment = 0;
  try {
    for (const id of defaultEquipmentFor(tierId, waterClass)) equipment += getEquipmentDef(id)?.price ?? 0;
  } catch {
    equipment = 0;
  }
  equipment = Math.round(equipment * KIT_EQUIPMENT_DISCOUNT);
  const sub = defaultSubstrate(waterClass);
  const subDef = sub.kind === 'bare' ? undefined : getSubstrateDef(sub.kind);
  const substrate = subDef ? Math.round(subDef.price * (tier.gallons / 10)) : 0;
  const seed = seeded ? seededMediaPrice(tierId) : 0;
  return { total: tier.price + equipment + substrate + seed, tank: tier.price, equipment, substrate, seeded: seed };
}

export interface BuyTankOptions {
  /** Add mature filter media (bioMaturity ≈ 0.6) for an extra fee. */
  seeded?: boolean;
  name?: string;
}

/** Buy a new tank of a tier and place it on the facility floor (calls core createTank). */
export function buyTank(state: GameState, tierId: string, waterClass: WaterClass, placement?: { x: number; z: number; rotY: number }, opts: BuyTankOptions = {}): ActionResult & { tankId?: string } {
  const tier = TANK_TIER_BY_ID[tierId];
  if (!tier) return fail('Unknown tank size.');
  if (!isUnlocked(state, tier.unlock)) return fail(`The ${tier.name} isn't available yet (${unlockHint(tier.unlock)}).`);
  let spot: { x: number; z: number; rotY: number } | null = placement ?? null;
  if (!spot) {
    try {
      spot = findFreeSpot(state, tierId);
    } catch {
      spot = null;
    }
  }
  if (!spot) return fail(`There's no floor space for ${aOrAn(tier.name)} ${tier.name}. Sell or move a tank, choose a smaller size, or expand your facility.`);
  const kit = tankKitPrice(tierId, waterClass, !!opts.seeded);
  if (!canAfford(state, kit.total)) return needMoney(state, kit.total, `the ${tier.name} kit`);
  if (!spend(state, kit.total, 'tank_purchase', `${tier.name} kit${opts.seeded ? ' + seeded media' : ''}`)) return needMoney(state, kit.total, `the ${tier.name} kit`);
  const tank = createTank(state, tierId, waterClass, { cycled: false, placement: spot, name: opts.name?.trim() || undefined });
  if (opts.seeded) tank.water.bioMaturity = Math.max(tank.water.bioMaturity, 0.6);
  bumpCounter(state, 'tanksBought');
  emitEvent(state, {
    kind: 'tip',
    text: opts.seeded
      ? `Your ${tier.name} is set up with seeded media, so it's partly cycled. Add animals gradually and keep testing the water.`
      : `Your ${tier.name} is filled, but it isn't cycled yet. Beneficial bacteria need time to grow: add a pinch of food or bottled bacteria and wait until ammonia and nitrite read zero before adding animals.`,
    tankId: tank.id,
    toast: true,
  });
  return { ok: true, message: `Bought ${aOrAn(tier.name)} ${tier.name} for ${fmtMoney(kit.total)}.`, tankId: tank.id };
}

// ───────────────────────────── equipment & consumables ─────────────────────────────

export function buyEquipment(state: GameState, tankId: string, defId: string): ActionResult {
  const def = getEquipmentDef(defId);
  if (!def) return fail('Unknown equipment.');
  const tank = state.tanks[tankId];
  if (!tank) return fail('Choose a tank to install it in.');
  if (!isUnlocked(state, def.unlock)) return fail(`${def.name} isn't available yet (${unlockHint(def.unlock)}).`);
  if (def.environments?.length && !def.environments.includes(tank.environment)) return fail(`${def.name} isn't made for ${tank.environment} tanks.`);
  if (!canAfford(state, def.price)) return needMoney(state, def.price, def.name);
  const res = installEquipment(state, tankId, defId, { purchased: true });
  if (!res.ok) return res;
  if (!spend(state, def.price, 'equipment', `${def.name} for ${tank.name}`)) return needMoney(state, def.price, def.name);
  bumpCounter(state, 'equipmentBought');
  return { ok: true, message: `Installed ${def.name} in ${tank.name} (${fmtMoney(def.price)}).` };
}

export function buyFood(state: GameState, foodId: string, packs: number): ActionResult {
  const def = getFoodDef(foodId);
  if (!def) return fail('Unknown food.');
  const n = Math.floor(finite(packs, 0));
  if (n < 1 || n > 99) return fail('Choose between 1 and 99 packs.');
  if (!isUnlocked(state, def.unlock)) return fail(`${def.name} isn't available yet (${unlockHint(def.unlock)}).`);
  const price = roundCents(def.price * n);
  if (!spend(state, price, 'food', `${n} × ${def.name}`)) return needMoney(state, price, `${n} × ${def.name}`);
  const servings = Math.max(1, Math.round(def.servingsPerPack * n));
  state.inventory.foods[foodId] = (state.inventory.foods[foodId] ?? 0) + servings;
  refreshFoodStatus(state);
  return { ok: true, message: `Bought ${n} × ${def.name} (${servings} servings) for ${fmtMoney(price)}.` };
}

export function buySalt(state: GameState, kg: number): ActionResult {
  const amount = Math.round(finite(kg, 0) * 10) / 10;
  if (!(amount > 0) || amount > 500) return fail('Choose between 0.1 and 500 kg of salt mix.');
  const price = roundCents(amount * SALT_PRICE_PER_KG);
  if (!spend(state, price, 'consumables', `${amount} kg marine salt mix`)) return needMoney(state, price, `${amount} kg of salt mix`);
  state.inventory.salt = Math.round((finite(state.inventory.salt, 0) + amount) * 10) / 10;
  return { ok: true, message: `Bought ${amount} kg of marine salt mix for ${fmtMoney(price)}.` };
}
