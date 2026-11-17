/**
 * Purchases: livestock offers, tank kits, equipment, food and salt. Pattern: validate → spend → act → log.
 * OWNER: lane "market". Purchases can never push money below 0 (spend without allowDebt).
 */
import type { GameState, WaterClass, Creature, Tank, ShopOffer } from '@/types';
import type { ActionResult } from '../care';
import { refreshFoodStatus } from '../tankStatus';
import { installEquipment } from '../care';
import { MAX_PER_KIND } from '../care/tuning'; // Audit 2026-11-17 (G25)
import { environmentGate } from '../compat';
import { addCreature, isLotOffer, recordFinds } from '../life';
import { generateName } from '../life/names';
import { mulberry32, hashString } from '../rng';
import { createTank, defaultSubstrate } from '../tanks';
import { defaultEquipmentFor } from '../water';
import { isUnlocked, findFreeSpot, bumpCounter, waterClassLock } from '../facility';
import { emitEvent } from '../context';
import { settleTanks } from '../settle'; // ADR-0026 decision 5 (chunk 5)
import { findSpecies } from '@/data/species';
import { TANK_TIER_BY_ID, TANK_TIERS } from '@/data/catalog/tanks';
import { getEquipmentDef, equipmentOfKind } from '@/data/catalog/equipment';
import { nextId } from '../ids';
import { getFoodDef } from '@/data/catalog/foods';
import { EGGS_SUPPLY } from '@/data/catalog/machines'; // lane:automation (chunk 5)
import { getSubstrateDef } from '@/data/catalog/substrates';
import { UNLOCK_KEYS } from '@/data/unlockKeys';
import { spend, canAfford } from './finance';
import { isFoodAvailable, soldWithWords, offerHeld } from './shop';
import { marketTimeScale, NEGOTIATION_HOLD_HOURS, MAX_NEGOTIATION_HOLD_HOURS } from './listings'; // F6: the bid hold's windows
import { GAME_HOURS_PER_REAL_SECOND } from '../time';
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

/**
 * What a shop offer costs for `count` of its animals: the whole group at the offer price, a partial pick at the
 * per-animal price, never more than the whole group. The Shop panel quotes this so the button, the affordability check
 * and the charge agree to the dollar (lane:fix-econ, S13-11).
 */
export function offerPickPrice(offer: Pick<ShopOffer, 'price' | 'unitPrice' | 'creatures'>, count: number): { unit: number; price: number } {
  const total = Math.max(1, offer.creatures.length);
  const unit = offer.unitPrice ?? Math.max(1, nicePrice((offer.price / total) * 1.12));
  const n = Math.max(0, Math.min(total, Math.floor(count)));
  const price = n >= total ? offer.price : Math.min(offer.price, Math.max(1, Math.round(unit * n)));
  return { unit, price };
}

export function buyOffer(state: GameState, offerId: string, tankId: string, creatureIndexes?: number[]): ActionResult {
  const m = state.market;
  const offer = m.stock.find((o) => o.id === offerId);
  if (!offer) return fail('That offer is no longer available.');
  const now = state.clock.hour;
  if (offer.expiresHour <= now && !offerHeld(offer, now)) {
    m.stock = m.stock.filter((o) => o.id !== offerId);
    return fail('That offer has expired.');
  }
  const tank = state.tanks[tankId];
  if (!tank) return fail('Choose a tank for the new arrivals.');
  // the tank catches up its owed hours first, so the newcomers arrive now, not hours back (ADR-0026 decision 5, B-176)
  settleTanks(state, [tankId]);
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
  // lane:genetics — a group carrying a Prismatic is one lot: the jewel can't be picked out at the group's unit price
  if (!all && isLotOffer(offer)) return fail('This group includes a Prismatic and is sold as one lot — buy the whole group.');
  const { price } = offerPickPrice(offer, idx.length);
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
    recordFinds(state, c); // lane:genetics — named strains + Prismatic finds (silent; the encyclopedia shows them)
  }

  if (all) m.stock = m.stock.filter((o) => o.id !== offerId);
  else {
    const keep = offer.creatures.filter((_, i) => !idx.includes(i));
    offer.price = Math.max(1, nicePrice((offer.price * keep.length) / total));
    offer.creatures = keep;
    offer.kind = keep.length > 1 ? 'group' : 'creature';
    if (keep.length > 1 && /^(Group|Colony) of \d+/.test(offer.label ?? '')) offer.label = offer.label!.replace(/of \d+/, `of ${keep.length}`);
    // F6: buying releases the hold (in a shared shop, someone else may still be looking: see releaseHold)
    releaseHold(state, offer);
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
    ...(uncycled ? { toast: true } : {}), // audit 2026-11-17 (F4): said where the player sees it, not only in the log
  });
  return { ok: true, message: `${who} added to ${tank.name} for ${fmtMoney(price)}.` };
}

/**
 * Audit 2026-11-17 (F6, the owner's choice: "Hold it while I'm looking") — an offer the player has open stays until
 * they buy it or close it, the way a bid waits while they write a counter-offer (holdBidForCounter): each call holds it
 * for NEGOTIATION_HOLD_HOURS (≈ 2 real minutes at any speed) past now, so the screen renews it while it is open;
 * `release` (close) ends it soon (releaseHold). A screen left open can't keep an offer forever: the whole hold is capped at
 * MAX_NEGOTIATION_HOLD_HOURS from its start (≈ 6 real minutes), after which the offer leaves at the next check if its
 * time is up. The shop restocks around a held offer as usual (refreshStock).
 */
export function holdOffer(state: GameState, offerId: string, release = false): ActionResult {
  const offer = state.market.stock.find((o) => o.id === offerId);
  if (!offer) return fail('That offer is no longer available.');
  if (release) {
    releaseHold(state, offer);
    return { ok: true, message: '' };
  }
  const now = state.clock.hour;
  if (offer.expiresHour <= now && !offerHeld(offer, now)) return fail('That offer has left the shop.');
  const k = marketTimeScale(state);
  // a new look starts only after the offer ran unheld for a full window (a hold kept open can't chain past its cap)
  if (offer.holdStartHour === undefined || now - (offer.holdUntilHour ?? -Infinity) >= NEGOTIATION_HOLD_HOURS * k) offer.holdStartHour = now;
  const until = Math.min(offer.holdStartHour + MAX_NEGOTIATION_HOLD_HOURS * k, now + NEGOTIATION_HOLD_HOURS * k);
  offer.holdUntilHour = Math.max(offer.holdUntilHour ?? 0, until);
  return { ok: true, message: '' };
}

/** How long a released hold lingers (≈ 20 real seconds at any speed): longer than another screen's 15 s renewal. */
export const HOLD_RELEASE_HOURS = 20 * GAME_HOURS_PER_REAL_SECOND;

/**
 * Review fix (audit 2026-11-17, F6) — closing an offer (or buying part of it) ends the hold soon rather than at once:
 * its end is cut to about 20 real seconds from now and its start kept. In a shared shop another member may still be
 * looking; their 15 s renewal then keeps it (still inside the cap from the same start). In a solo game a closed
 * offer whose time is up leaves within those 20 seconds.
 */
function releaseHold(state: GameState, offer: ShopOffer): void {
  if (offer.holdUntilHour === undefined) return;
  offer.holdUntilHour = Math.min(offer.holdUntilHour, state.clock.hour + HOLD_RELEASE_HOURS * marketTimeScale(state));
}

// ───────────────────────────── tanks ─────────────────────────────

/** Price of the optional "seeded with mature media" add-on for a tier. */
export function seededMediaPrice(tierId: string): number {
  const g = TANK_TIER_BY_ID[tierId]?.gallons ?? 20;
  return nicePrice(15 + g * 0.6);
}

export interface KitEquipment {
  /** Equipment definition ids the kit ships with (one entry per unit). */
  ids: string[];
  /** Locked defaults that were swapped (`to` = null: left out) — for the kit card and the purchase tip. */
  swaps: { from: string; fromCount: number; to: string | null; count: number }[];
}

/**
 * The gear a kit actually ships with for THIS player (lane:fix-econ, S16-03). A tier's default kit may list devices the
 * player hasn't unlocked (a sump, a premium reef light, a titanium heater); a kit is not a back door past the unlock
 * tree, so each locked device is replaced by the best unlocked device of its kind — several smaller units (up to 3)
 * when the tank is bigger than one can handle — or left out when nothing of that kind is unlocked yet.
 */
export function kitEquipmentFor(state: GameState, tierId: string, waterClass: WaterClass): KitEquipment {
  const tier = TANK_TIER_BY_ID[tierId];
  const gallons = tier?.gallons ?? 20;
  const env: Tank['environment'] = waterClass === 'brackish' ? 'brackish' : waterClass === 'reef' || waterClass.startsWith('marine') ? 'marine' : 'freshwater';
  let defaults: string[] = [];
  try {
    defaults = defaultEquipmentFor(tierId, waterClass);
  } catch {
    defaults = [];
  }
  const ids: string[] = [];
  const swaps = new Map<string, { fromCount: number; to: string | null; count: number }>();
  for (const id of defaults) {
    const def = getEquipmentDef(id);
    if (!def || isUnlocked(state, def.unlock)) {
      // Audit 2026-11-17 (G25 review): every unit within the per-tank limit, not only swapped ones (a reef kit from the
      // 180 gallon up listed two auto top-offs, limit one, and charged for both)
      if (def && ids.filter((x) => getEquipmentDef(x)?.kind === def.kind).length >= (MAX_PER_KIND[def.kind] ?? 6)) continue;
      ids.push(id);
      continue;
    }
    const options = equipmentOfKind(def.kind).filter((e) => e.id !== id && isUnlocked(state, e.unlock) && (!e.environments?.length || e.environments.includes(env)));
    // Best available = the priciest unlocked unit; prefer one rated for the tank when there is one.
    const rated = options.filter((e) => e.gallonsRange.max >= gallons);
    const sub = (rated.length ? rated : options).at(-1);
    let count = 0;
    if (sub) {
      count = def.kind === 'filter' || def.kind === 'heater' || def.kind === 'chiller' ? Math.min(3, Math.max(1, Math.ceil(gallons / Math.max(1, sub.gallonsRange.max)))) : 1;
      // Audit 2026-11-17 (G25): never more of a kind than one tank may hold (a 300 gallon kit shipped 6 heaters, max 4)
      const have = ids.filter((x) => getEquipmentDef(x)?.kind === def.kind).length;
      count = Math.min(count, Math.max(0, (MAX_PER_KIND[def.kind] ?? 6) - have));
      for (let i = 0; i < count; i++) ids.push(sub.id);
    }
    const prev = swaps.get(id);
    if (prev) {
      prev.count += count;
      prev.fromCount++;
    } else swaps.set(id, { fromCount: 1, to: sub?.id ?? null, count });
  }
  return { ids, swaps: [...swaps.entries()].map(([from, v]) => ({ from, ...v })) };
}

/** One line for the kit card / purchase tip: what a kit swaps or leaves out and what unlocks the real thing. */
export function kitSwapNote(kit: KitEquipment): string {
  if (!kit.swaps.length) return '';
  const parts = kit.swaps.map((sw) => {
    const from = getEquipmentDef(sw.from);
    const to = sw.to ? getEquipmentDef(sw.to) : undefined;
    const need = unlockHint(from?.unlock ?? null);
    const was = `${sw.fromCount > 1 ? `${sw.fromCount} × ` : ''}${from?.name ?? sw.from}`;
    return `${to ? `${sw.count > 1 ? `${sw.count} × ` : ''}${to.name} instead of ${was}` : `no ${was}`}${need ? ` (unlock: ${need})` : ''}`;
  });
  return `This kit ships with ${parts.join('; ')}.`;
}

/**
 * Kit price: tank + stand, default equipment (bundled at a discount) and substrate. With `state`, the equipment is
 * what the kit ships with for this player (kitEquipmentFor); without it, the tier's default kit.
 */
export function tankKitPrice(tierId: string, waterClass: WaterClass, seeded = false, state?: GameState): { total: number; tank: number; equipment: number; substrate: number; seeded: number } {
  const tier = TANK_TIER_BY_ID[tierId];
  if (!tier) return { total: 0, tank: 0, equipment: 0, substrate: 0, seeded: 0 };
  let equipment = 0;
  try {
    for (const id of state ? kitEquipmentFor(state, tierId, waterClass).ids : defaultEquipmentFor(tierId, waterClass)) equipment += getEquipmentDef(id)?.price ?? 0;
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

/** Every water type a kit can be set up for (each open once its research is done: waterClassLock). */
const KIT_WATER: WaterClass[] = ['freshwater_cool', 'freshwater_tropical', 'freshwater_planted', 'brackish', 'marine_fowlr', 'marine_live_rock', 'reef'];

/**
 * Audit 2026-11-17 (F7) — the cheapest whole kit this player can buy now (the glass, the gear it ships with and the
 * substrate, as Build prices it), over the tank sizes and water types open to them; null when none is. The empty-room
 * message and the restart loan quote this, not the glass alone.
 */
export function cheapestKit(state: GameState, opts: { seeded?: boolean } = {}): { tierId: string; name: string; waterClass: WaterClass; total: number; daily: number } | null {
  let best: { tierId: string; name: string; waterClass: WaterClass; total: number; daily: number } | null = null;
  for (const tier of TANK_TIERS) {
    if (!isUnlocked(state, tier.unlock)) continue;
    for (const wc of KIT_WATER) {
      if (waterClassLock(state, wc)) continue;
      const total = tankKitPrice(tier.id, wc, !!opts.seeded, state).total;
      if (total > 0 && (!best || total < best.total)) best = { tierId: tier.id, name: tier.name, waterClass: wc, total, daily: kitDailyCost(state, tier.id, wc) };
    }
  }
  return best;
}

/**
 * Review fix (F7) — what a kit costs a day to run before it exists: the glass's base upkeep plus each piece of its gear
 * at full duty (an upper bound: a heater rarely runs flat out), so the restart loan never falls short of two days.
 */
export function kitDailyCost(state: GameState, tierId: string, waterClass: WaterClass): number {
  const base = TANK_TIER_BY_ID[tierId]?.baseUpkeep ?? 0.5;
  const gear = kitEquipmentFor(state, tierId, waterClass).ids.reduce((a, id) => a + (getEquipmentDef(id)?.upkeep ?? 0), 0);
  return roundCents(base + gear);
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
  const waterLock = waterClassLock(state, waterClass); // chunk 7 (B-160): the rule, not only Build's screen
  if (waterLock) return fail(waterLock);
  let spot: { x: number; z: number; rotY: number } | null = placement ?? null;
  if (!spot) {
    try {
      spot = findFreeSpot(state, tierId);
    } catch {
      spot = null;
    }
  }
  // Audit 2026-11-17 (G19): the real ways out (taking an empty tank down, an auction once it opens, a bigger venue)
  if (!spot) return fail(`There's no floor space for ${aOrAn(tier.name)} ${tier.name}. Choose a smaller size, move a tank, or take down an empty tank you no longer need in Tanks${isUnlocked(state, 'tank_auctions') ? ' (or auction one in Market › My listings)' : ''}. A bigger venue (Build › Facility) adds room.`);
  const gear = kitEquipmentFor(state, tierId, waterClass);
  const kit = tankKitPrice(tierId, waterClass, !!opts.seeded, state);
  if (!canAfford(state, kit.total)) return needMoney(state, kit.total, `the ${tier.name} kit`);
  if (!spend(state, kit.total, 'tank_purchase', `${tier.name} kit${opts.seeded ? ' + seeded media' : ''}`)) return needMoney(state, kit.total, `the ${tier.name} kit`);
  // The kit's gear is installed here (not createTank's defaults) so locked devices never arrive through a kit (S16-03).
  const tank = createTank(state, tierId, waterClass, { cycled: false, placement: spot, name: opts.name?.trim() || undefined, withDefaultEquipment: false });
  for (const defId of gear.ids) {
    const def = getEquipmentDef(defId);
    tank.equipment.push({ id: nextId(state, 'eq'), defId, installedHour: state.clock.hour, condition: 1, on: true, ...(def?.stats.defaultSetting !== undefined ? { setting: def.stats.defaultSetting } : {}) }); // §3.2 rule 10
  }
  if (opts.seeded) tank.water.bioMaturity = Math.max(tank.water.bioMaturity, 0.6);
  bumpCounter(state, 'tanksBought');
  emitEvent(state, {
    kind: 'tip',
    text: opts.seeded
      ? `Your ${tier.name} is set up with seeded media, so it's partly cycled. Add animals gradually and keep testing the water.`
      : // Audit 2026-11-17 C5 — new water reads zero ammonia and nitrite from the start, so "wait until they read zero"
        // was passed at once; say what to watch instead, and how long (a pinch a day: about a week in the sim)
        `Your ${tier.name} is filled, but it isn't cycled yet. Drop in a pinch of food each day until the tank card’s Biological filter reads Mature before adding animals — about a week, or a few days with bottled bacteria.`,
    tankId: tank.id,
    toast: true,
  });
  const swapNote = kitSwapNote(gear);
  if (swapNote) emitEvent(state, { kind: 'info', text: `${swapNote} Research the missing gear and install it from the Build panel.`, tankId: tank.id });
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
  // lane:qa-r3 — keep the install's own notes (it won't help these animals, a thermostat setting, a heater/chiller
  // clash) after the receipt: they used to be dropped here
  const head = `Installed the ${def.name}.`;
  const notes = res.message.startsWith(head) ? res.message.slice(head.length).trim() : '';
  return { ok: true, message: `Installed ${def.name} in ${tank.name} (${fmtMoney(def.price)}).${notes ? ` ${notes}` : ''}`, ...(res.caution ? { caution: true } : {}) };
}

export function buyFood(state: GameState, foodId: string, packs: number): ActionResult {
  const def = getFoodDef(foodId);
  if (!def) return fail('Unknown food.');
  const n = Math.floor(finite(packs, 0));
  if (n < 1 || n > 99) return fail('Choose between 1 and 99 packs.');
  if (!isUnlocked(state, def.unlock)) return fail(`${def.name} isn't available yet (${unlockHint(def.unlock)}).`);
  // chunk 17 (ADR-0053 decision 5): a food sold with certain animals waits until one of them can be bought
  if (!isFoodAvailable(state, def)) return fail(`The shop sells ${def.name} once you can buy ${soldWithWords(def)}.`);
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

/**
 * lane:automation (chunk 5, DESIGN-S3D §4, §8.5) — brine shrimp eggs for the Live food room's hatchery: a tin of 30
 * scoops (a scoop starts a cone). A supply, not a food: the scoops are `inventory.brineShrimpEggs`.
 */
export function buyEggs(state: GameState, tins: number): ActionResult {
  const n = Math.floor(finite(tins, 0));
  if (n < 1 || n > 99) return fail('Choose between 1 and 99 tins.');
  const price = roundCents(EGGS_SUPPLY.price * n);
  const what = `${n} × ${EGGS_SUPPLY.name.toLowerCase()}`;
  if (!spend(state, price, 'consumables', what)) return needMoney(state, price, what);
  const scoops = EGGS_SUPPLY.scoops * n;
  state.inventory.brineShrimpEggs = Math.max(0, Math.floor(finite(state.inventory.brineShrimpEggs ?? 0, 0))) + scoops;
  return { ok: true, message: `Bought ${n === 1 ? 'a tin' : `${n} tins`} of brine shrimp eggs (${scoops} scoops) for ${fmtMoney(price)}.` };
}
