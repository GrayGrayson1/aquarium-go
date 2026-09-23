/**
 * Small tank edits the panels need that have no domain mutator yet (rename, purpose, water-class conversion of an
 * EMPTY tank, backdrop, substrate). They are written as (draft, …) → ActionResult so they can move into src/sim
 * unchanged — see the ui-panels report. OWNER: lane "ui-panels".
 */
import type { BackdropKind, GameState, SubstrateKind, TankPurpose, WaterClass } from '@/types';
import { environmentOf, defaultLightPreset, defaultSubstrate } from '@/sim/tanks';
import { initialWater } from '@/sim/water';
import { creaturesInTank, clutchesInTank } from '@/sim/life';
import { spend } from '@/sim/economy';
import { isUnlocked } from '@/sim/facility'; // lane:brackish
import { getDecorDef } from '@/data/catalog/decor';
import { getSubstrateDef } from '@/data/catalog/substrates';
import { getTankTier } from '@/data/catalog/tanks';
import { WATER_CLASS_LABEL, PURPOSE_LABEL } from './format';

export interface OpResult {
  ok: boolean;
  message: string;
}

export function renameTank(state: GameState, tankId: string, name: string): OpResult {
  const t = state.tanks[tankId];
  if (!t) return { ok: false, message: 'Tank not found' };
  const n = name.trim().slice(0, 32);
  if (!n) return { ok: false, message: 'Give your tank a name' };
  t.name = n;
  return { ok: true, message: `Renamed to “${n}”` };
}

export function setTankPurpose(state: GameState, tankId: string, purpose: TankPurpose): OpResult {
  const t = state.tanks[tankId];
  if (!t) return { ok: false, message: 'Tank not found' };
  t.purpose = purpose;
  return { ok: true, message: `${t.name} is now a ${PURPOSE_LABEL[purpose].toLowerCase()} tank` };
}

export function canChangeWaterClass(state: GameState, tankId: string): { ok: boolean; reason?: string } {
  const t = state.tanks[tankId];
  if (!t) return { ok: false, reason: 'Tank not found' };
  if (creaturesInTank(state, tankId).length > 0) return { ok: false, reason: 'Move or sell every animal first — water can only be converted in an empty tank.' };
  if (clutchesInTank(state, tankId).length > 0) return { ok: false, reason: 'There are eggs or fry in this tank.' };
  if (t.listingId) return { ok: false, reason: 'This tank is listed for sale.' };
  return { ok: true };
}

/**
 * Convert an empty tank to another water class. Switching environment (fresh ↔ marine) means fresh water and an
 * uncycled filter (a one-step change to or from brackish keeps part of the cycle); decor that cannot live in the new
 * water returns to storage.
 */
export function convertWaterClass(state: GameState, tankId: string, wc: WaterClass): OpResult {
  const t = state.tanks[tankId];
  if (!t) return { ok: false, message: 'Tank not found' };
  const gate = canChangeWaterClass(state, tankId);
  if (!gate.ok) return { ok: false, message: gate.reason ?? 'Not possible' };
  if (t.waterClass === wc) return { ok: true, message: 'No change' };
  // lane:brackish — brackish water needs the estuary know-how first.
  if (wc === 'brackish' && !isUnlocked(state, 'brackish')) return { ok: false, message: 'Brackish water unlocks with the Brackish Estuaries research.' };
  const env = environmentOf(wc);
  const envChanged = env !== t.environment;
  const from = t.environment;
  t.waterClass = wc;
  t.environment = env;
  let carried = 0;
  if (envChanged) {
    // lane:brackish — fresh ↔ brackish ↔ marine is a step in salinity: nitrifying bacteria adapt to a one-step change, so
    // part of the cycle carries over (fresh ↔ marine still starts from scratch). The substrate stays if it suits the new water.
    const oneStep = from === 'brackish' || env === 'brackish';
    const maturity = t.water.bioMaturity;
    t.water = initialWater(wc, false);
    if (oneStep && maturity > 0.05) {
      carried = Math.min(0.9, maturity * 0.7);
      t.water.bioMaturity = Math.max(t.water.bioMaturity, carried);
    }
    const keepSubstrate = oneStep && (getSubstrateDef(t.substrate.kind)?.environments.includes(env) ?? false);
    if (!keepSubstrate) t.substrate = defaultSubstrate(wc);
    if (env === 'marine' || from === 'marine') t.backdrop = env === 'marine' ? 'deep_blue' : 'black';
  }
  t.lighting.preset = defaultLightPreset(wc);
  // Return decor that does not belong in this water to storage.
  const keep: typeof t.decor = [];
  let stored = 0;
  for (const d of t.decor) {
    const def = getDecorDef(d.defId);
    const okEnv = !def || def.environments.includes(env);
    const okClass = !def?.waterClasses?.length || def.waterClasses.includes(wc);
    if (okEnv && okClass) keep.push(d);
    else {
      if (d.frag && d.frag.grownHour === undefined) (state.inventory.frags ??= []).push({ ...d, x: 0, y: 0, z: 0 }); // lane:frags — frags go to frag storage
      else state.inventory.decor.push(d);
      stored++;
    }
  }
  t.decor = keep;
  let extra = '';
  if (envChanged) {
    const water =
      env === 'brackish' ? ` Marine salt mixed in at about a third of sea strength (SG ${t.water.salinitySG.toFixed(3)}).` : env === 'marine' ? ' Fresh salt water mixed.' : ' Fresh water added.';
    extra = carried > 0
      ? `${water} Filter bacteria adapt to a one-step change in salinity, so about ${Math.round(t.water.bioMaturity * 100)}% of the cycle carries over — test the water before adding animals.`
      : `${water} The filter needs to cycle before animals move in.`;
  }
  return { ok: true, message: `Converted to ${WATER_CLASS_LABEL[wc].toLowerCase()}.${stored ? ` ${stored} decor item${stored === 1 ? '' : 's'} moved to storage.` : ''}${extra}` };
}

export function setBackdrop(state: GameState, tankId: string, backdrop: BackdropKind): OpResult {
  const t = state.tanks[tankId];
  if (!t) return { ok: false, message: 'Tank not found' };
  t.backdrop = backdrop;
  return { ok: true, message: 'Backdrop updated' };
}

/** Price to fill this tank with a substrate (catalog price is per 10 gallons). */
export function substrateCost(tierId: string, kind: SubstrateKind): number {
  const def = getSubstrateDef(kind);
  if (!def) return 0;
  const gal = safeGallons(tierId);
  return Math.round(def.price * Math.max(1, gal / 10));
}

function safeGallons(tierId: string): number {
  try {
    return getTankTier(tierId).gallons;
  } catch {
    return 10;
  }
}

export function changeSubstrate(state: GameState, tankId: string, kind: SubstrateKind, color?: string): OpResult {
  const t = state.tanks[tankId];
  if (!t) return { ok: false, message: 'Tank not found' };
  const def = getSubstrateDef(kind);
  if (!def) return { ok: false, message: 'Unknown substrate' };
  if (!def.environments.includes(t.environment)) return { ok: false, message: `${def.name} isn’t suitable for ${t.environment} tanks` };
  if (t.substrate.kind === kind && (!color || color === t.substrate.color)) return { ok: true, message: 'Already in place' };
  const cost = t.substrate.kind === kind ? 0 : substrateCost(t.tierId, kind);
  if (!spend(state, cost, 'decor', `${def.name} substrate for ${t.name}`)) return { ok: false, message: 'Not enough money' };
  const depth = kind === 'bare' ? 0 : kind === 'planted_soil' ? 5 : kind === 'aragonite' ? 4 : t.substrate.depthCm || 3;
  t.substrate = { kind, depthCm: depth, color: color ?? def.colors[0] ?? t.substrate.color };
  // Stirring up the bed clouds the water briefly.
  t.water.clarity = Math.max(0.55, t.water.clarity - 0.25);
  t.water.detritus = Math.min(100, t.water.detritus + 4);
  return { ok: true, message: `${def.name} added to ${t.name}` };
}

export function markLogRead(state: GameState): void {
  for (const e of state.log) if (!e.read) e.read = true;
}
