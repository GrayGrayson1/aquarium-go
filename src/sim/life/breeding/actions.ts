/**
 * Breeding player actions. OWNER: lane "breeding".
 * All are Immer-draft mutators called through `mutate(draft => …)`.
 */
import type { Creature, GameState, Tank } from '@/types';
import type { ActionResult } from '../../care';
import { emitEvent } from '../../context';
import { simRng } from '../../rng';
import { findSpecies } from '@/data/species';
import { environmentGate } from '@/sim/compat';
import { bumpCounter } from '@/sim/facility';
import { createCreature, addCreature } from '@/sim/life';
import { moveCreature } from '../actions';
import { moduleFor } from './registry';
import { evaluatePair } from './check';
import { isCarried } from './clutch';
import { touchResidents } from '../../residents'; // lane:perf2
import {
  addHistory,
  ageDaysAt,
  effectiveRole,
  ensureEnv,
  fmtTemp,
  isAlive,
  isGone,
  isMature,
  isNurseryFor,
  noteFoodSeen,
  normalizeRepro,
  pickSite,
  plural,
  setStage,
  spName,
  spPlural,
  startResting,
} from './common';

const ok = (message: string): ActionResult => ({ ok: true, message });
const no = (message: string): ActionResult => ({ ok: false, message });

function moveInto(state: GameState, c: Creature, tank: Tank): ActionResult {
  if (c.tankId === tank.id) return ok('');
  const from = c.tankId;
  let res: ActionResult;
  try {
    res = moveCreature(state, c.id, tank.id);
  } catch (e) {
    res = no(String(e));
  }
  if (!res.ok) return res;
  if (c.tankId !== tank.id) c.tankId = tank.id;
  touchResidents(); // lane:perf2 — a move-in: drop the step's residents index
  followCarried(state, c, from);
  return ok('');
}

/** Broods carried inside a parent (pouch, mouth, berried eggs) travel with it. */
function followCarried(state: GameState, c: Creature, _from: string | null): void {
  for (const cl of Object.values(state.clutches)) {
    if (cl.guardedById === c.id && isCarried(cl) && c.tankId) cl.tankId = c.tankId;
  }
}

/** Begin a species-appropriate breeding attempt (e.g. introduce a conditioned female betta to the male's nest tank). */
export function startBreeding(state: GameState, aId: string, bId: string, tankId?: string): ActionResult {
  const ev = evaluatePair(state, aId, bId, true);
  if (!ev.sp || !ev.mod || !ev.male || !ev.female) return no(ev.reasons[0] ?? 'These two can’t breed.');
  const { sp, mod, male, female } = ev;
  if (!mod.breedable) return no(mod.explain?.(sp) ?? ev.reasons[0] ?? 'This species can’t be bred here yet.');
  if (ev.startBlockers.length) return no(`${ev.startBlockers[0]}${ev.nextStep ? ` ${ev.nextStep}` : ''}`);

  // Where: bettas meet in the male's (nest) tank; others in the requested tank, or wherever one of them lives.
  // (The card passes the viewed animal's tank; a betta male never leaves his nest for it.)
  const targetId = mod.introducedByKeeper ? male.tankId ?? tankId : tankId ?? (male.tankId === female.tankId ? male.tankId : female.tankId ?? male.tankId);
  const tank = targetId ? state.tanks[targetId] : undefined;
  if (!tank) return no('Choose a tank for the pair first.');
  const gate = environmentGate(sp, tank);
  if (!gate.ok) return no(gate.reason ?? `${tank.name} isn’t suitable for ${spPlural(sp)}.`);
  const t = tank.water.tempC;
  if (t < sp.tempC.min || t > sp.tempC.max) return no(`${tank.name} is ${fmtTemp(t)} — outside the safe range for ${spPlural(sp)} (${sp.tempC.min}–${sp.tempC.max} °C).`);

  const hour = state.clock.hour;
  for (const c of [male, female]) {
    normalizeRepro(c, hour);
    const r = moveInto(state, c, tank);
    if (!r.ok) return no(r.message || `Couldn’t move ${c.name}.`);
  }
  if (sp.sexSystem !== 'protandrous') {
    male.repro.partnerId = female.id;
    female.repro.partnerId = male.id;
  }
  const msg = mod.start?.(state, male, female, tank, hour) ?? `${male.name} and ${female.name} are together in ${tank.name}.`;
  addHistory(female, 'note', `Paired with ${male.name} for breeding.`, hour);
  addHistory(male, 'note', `Paired with ${female.name} for breeding.`, hour);
  bumpCounter(state, 'breedingAttempts');
  emitEvent(state, { kind: 'breeding', text: msg, tankId: tank.id, creatureId: female.id });
  return ok(msg);
}

/** Separate a creature from its partner/brood (betta female after spawning, male after fry free-swim...). */
export function separateCreature(state: GameState, creatureId: string, toTankId: string): ActionResult {
  const c = state.creatures[creatureId];
  if (!c) return no('Not found');
  if (isGone(c)) return no(`${c.name} is no longer in your care.`);
  const tank = state.tanks[toTankId];
  if (!tank) return no('That tank doesn’t exist.');
  if (c.tankId === toTankId) return no(`${c.name} is already in ${tank.name}.`);
  const sp = findSpecies(c.speciesId);
  if (sp) {
    const gate = environmentGate(sp, tank);
    if (!gate.ok) return no(gate.reason ?? `${tank.name} isn’t suitable.`);
  }
  const from = c.tankId;
  const hour = state.clock.hour;
  normalizeRepro(c, hour);
  const stage = c.repro.stage;
  const clutch = c.repro.clutchId ? state.clutches[c.repro.clutchId] : undefined;
  const partner = c.repro.partnerId ? state.creatures[c.repro.partnerId] : undefined;

  const res = moveInto(state, c, tank);
  if (!res.ok) return res;

  let msg = `${c.name} moved to ${tank.name}.`;
  let breedingRelated = true;
  const cooldownH = (sp?.breeding.cooldownDays ?? 5) * 24;
  if (stage === 'spent' || (stage === 'resting' && (c.repro.harassment ?? 0) > 0)) {
    if (stage === 'spent') startResting(c, hour, cooldownH);
    msg = `${c.name} is safe in ${tank.name} and can recover in peace.`;
  } else if (stage === 'guarding' && clutch && !isCarried(clutch)) {
    if (clutch.guardedById === c.id) clutch.guardedById = undefined;
    startResting(c, hour, cooldownH * 0.5);
    msg =
      clutch.stage === 'fry'
        ? `Perfect timing — ${c.name}’s job is done and the fry are on their own now.`
        : `${c.name} has left the ${clutch.stage === 'eggs' ? 'eggs' : 'brood'} — without a parent tending them, some may fungus or fall from the nest.`;
  } else if (stage === 'guarding' && !clutch) {
    // Guard duty with nothing left to guard (the clutch hatched or was lost) — a move always clears it.
    startResting(c, hour, cooldownH * 0.5);
    msg = `${c.name} moved to ${tank.name} — nothing left to guard, so ${c.sex === 'female' ? 'she' : 'he'} can rest.`;
  } else if (['courting', 'spawning', 'nest_preparing', 'depositing', 'following'].includes(stage)) {
    setStage(c, 'conditioning', hour);
    if (partner && isAlive(partner) && partner.tankId === from && partner.repro.stage === stage) setStage(partner, partner.repro.stage === 'courting' && sp?.breeding.system === 'bubble_nest' ? 'nest_ready' : 'conditioning', hour);
    msg = `Courtship interrupted — ${c.name} moved to ${tank.name}.`;
  } else if (stage === 'laying' && clutch) {
    clutch.pendingEggs = 0;
    startResting(c, hour, cooldownH);
    msg = `${c.name} stopped laying and moved to ${tank.name}; ${plural(clutch.count, 'egg')} stay behind.`;
  } else if (stage === 'pregnant' || stage === 'berried' || stage === 'brooding') {
    msg = `${c.name} moved to ${tank.name}, carrying the brood safely.`;
  } else breedingRelated = false;
  c.repro.harassment = Math.min(c.repro.harassment ?? 0, 0.3);
  if (breedingRelated) emitEvent(state, { kind: 'breeding', text: msg, tankId: tank.id, creatureId: c.id });
  return ok(msg);
}

/** Move a clutch (eggs/fry) to a nursery tank. */
export function moveClutch(state: GameState, clutchId: string, toTankId: string): ActionResult {
  const cl = state.clutches[clutchId];
  if (!cl) return no('Not found');
  const tank = state.tanks[toTankId];
  if (!tank) return no('That tank doesn’t exist.');
  if (cl.tankId === toTankId) return no(`They’re already in ${tank.name}.`);
  const sp = findSpecies(cl.speciesId);
  if (!sp) return no('Unknown species.');
  const carrier = cl.guardedById ? state.creatures[cl.guardedById] : undefined;
  if (isCarried(cl)) return no(`${carrier?.name ?? 'The parent'} is carrying ${cl.stage === 'in_pouch' ? 'this brood' : 'these eggs'} — move ${carrier?.name ?? 'the parent'} instead.`);
  if (cl.pendingEggs && cl.pendingEggs > 0) return no('She’s still laying — wait until she has finished.');
  const gate = environmentGate(sp, tank);
  if (!gate.ok) return no(gate.reason ?? `${tank.name} isn’t suitable.`);
  const t = tank.water.tempC;
  if (t < sp.tempC.min || t > sp.tempC.max) return no(`${tank.name} is ${fmtTemp(t)} — too ${t < sp.tempC.min ? 'cold' : 'warm'} for ${spName(sp)} young (${sp.tempC.min}–${sp.tempC.max} °C).`);
  if (sp.salinitySG && (tank.water.salinitySG < sp.salinitySG.min - 0.002 || tank.water.salinitySG > sp.salinitySG.max + 0.002)) {
    return no(`${tank.name}’s salinity (${tank.water.salinitySG.toFixed(3)}) doesn’t match the parents’ water.`);
  }

  const hour = state.clock.hour;
  const from = state.tanks[cl.tankId];
  cl.tankId = toTankId;
  const guardian = cl.guardedById ? state.creatures[cl.guardedById] : undefined;
  if (guardian && guardian.tankId !== toTankId) cl.guardedById = undefined;
  if (cl.visual === 'bubble_nest') cl.visual = cl.stage === 'eggs' || cl.stage === 'larvae' ? 'eggs_scattered' : 'fry_cloud';
  const site = pickSite(tank, cl.stage === 'eggs' ? (cl.visual === 'eggs_adhesive' ? 'rock' : 'plants_low') : 'midwater', `${cl.id}:moved:${hour.toFixed(1)}`, cl.extraAnchors?.length ?? 0);
  cl.anchor = site.anchor;
  cl.extraAnchors = site.extra.length ? site.extra : undefined;
  if (!cl.flags) cl.flags = [];
  if (!cl.flags.includes('moved')) cl.flags.push('moved');
  bumpCounter(state, 'clutchesMoved');

  const warnings: string[] = [];
  if (!isNurseryFor(state, tank, hour)) warnings.push(`there are adult animals in ${tank.name} that may eat them`);
  if ((tank.water.bioMaturity ?? 1) < 0.3) warnings.push(`${tank.name} isn’t cycled yet`);
  if (tank.water.ammonia > 0.25 || tank.water.nitrite > 0.25) warnings.push('ammonia/nitrite is detectable');
  const what = cl.stage === 'eggs' ? plural(cl.count, 'egg') : plural(cl.count, cl.stage === 'larvae' ? 'larva' : 'fry', cl.stage === 'larvae' ? 'larvae' : 'fry');
  const who = (cl.motherId && state.creatures[cl.motherId]?.name) || (cl.fatherId && state.creatures[cl.fatherId]?.name);
  const msg = `Moved ${who ? `${who}’s ` : ''}${what} from ${from?.name ?? 'the tank'} to ${tank.name}.${warnings.length ? ` Careful: ${warnings.join('; ')}.` : ''}${cl.stage === 'eggs' && moduleFor(sp).plan.guardEggs && !cl.guardedById ? ' An airstone nearby helps replace the parent’s fanning.' : ''}`;
  emitEvent(state, { kind: warnings.length ? 'warning' : 'breeding', text: msg, tankId: toTankId });
  return ok(msg);
}

/** DEV: make a creature (and a valid partner if present) ready to breed now and jump to the next stage. */
export function devForceBreeding(state: GameState, creatureId: string): ActionResult {
  const c = state.creatures[creatureId];
  if (!c || !isAlive(c)) return no('Not found');
  const sp = findSpecies(c.speciesId);
  if (!sp) return no('Unknown species');
  const mod = moduleFor(sp);
  if (!mod.breedable) return no(mod.explain?.(sp) ?? 'This species cannot be bred.');
  const tank = c.tankId ? state.tanks[c.tankId] : undefined;
  if (!tank) return no(`${c.name} isn’t in a tank.`);
  const hour = state.clock.hour;
  normalizeRepro(c, hour);

  // Already mid-event: jump ahead.
  const cl = c.repro.clutchId ? state.clutches[c.repro.clutchId] : undefined;
  if (cl) {
    cl.nextStageHour = Math.min(cl.nextStageHour, hour);
    if (c.repro.carryingUntilHour !== undefined) c.repro.carryingUntilHour = hour;
    if (c.repro.stageEndsHour !== undefined) c.repro.stageEndsHour = hour;
    return ok(`Dev: ${c.name}’s brood will advance on the next tick.`);
  }
  if (c.repro.stageEndsHour !== undefined && c.repro.stageEndsHour > hour && c.repro.stage !== 'resting') {
    c.repro.stageEndsHour = hour;
    if (c.repro.carryingUntilHour !== undefined) c.repro.carryingUntilHour = hour;
    const p = c.repro.partnerId ? state.creatures[c.repro.partnerId] : undefined;
    if (p && p.repro.stage === c.repro.stage && p.repro.stageEndsHour !== undefined) p.repro.stageEndsHour = hour;
    return ok(`Dev: ${c.name} skips ahead in “${c.repro.stage}”.`);
  }
  if (c.repro.carryingUntilHour !== undefined && c.repro.carryingUntilHour > hour) {
    c.repro.carryingUntilHour = hour;
    return ok(`Dev: ${c.name} is due now.`);
  }

  // Find (or create) a valid partner.
  const herm = sp.sexSystem === 'simultaneous_hermaphrodite';
  let myRole = effectiveRole(c, sp, hour);
  if (sp.sexSystem === 'protandrous' && myRole !== 'female') {
    // Protandrous: the forced animal becomes the pair's female unless a female already exists here.
    const existingF = Object.values(state.creatures).find((o) => o !== c && o.tankId === tank.id && o.speciesId === sp.id && isAlive(o) && o.reproRole === 'female');
    myRole = existingF ? 'male' : 'female';
  }
  if (!myRole || myRole === 'transitioning') myRole = 'female';
  const wantRole = herm ? 'herm' : myRole === 'female' ? 'male' : 'female';
  const valid = (o: Creature) => o !== c && o.speciesId === sp.id && isAlive(o) && (herm || effectiveRole(o, sp, hour) === wantRole || (sp.sexSystem === 'protandrous' && wantRole === 'male' && o.reproRole !== 'female'));
  const pool = Object.values(state.creatures).filter(valid);
  let partner = pool.find((o) => o.id === c.repro.partnerId && o.tankId === tank.id) ?? pool.find((o) => o.tankId === tank.id);
  if (!partner && mod.introducedByKeeper) partner = pool.find((o) => !!o.tankId);
  if (!partner) {
    const rng = simRng(state);
    const sex = herm ? undefined : wantRole === 'male' ? 'male' : 'female';
    partner = createCreature(state, rng, sp.id, { sex, ageDays: sp.breeding.maturityDays + 3, captiveBred: true, name: `${c.name}’s mate` });
    addCreature(state, partner, tank.id);
    addHistory(partner, 'acquired', 'Arrived as a breeding partner (dev).', hour);
  }
  if (partner.tankId !== tank.id) {
    const r = moveInto(state, partner, tank);
    if (!r.ok) return r;
  }
  normalizeRepro(partner, hour);

  // Make both ready.
  for (const x of [c, partner]) {
    const age = ageDaysAt(x, hour);
    if (age < sp.breeding.maturityDays) x.bornHour -= (sp.breeding.maturityDays - age + 0.5) * 24;
    if (x.lifeStage === 'juvenile' || x.lifeStage === 'fry' || x.lifeStage === 'larva' || x.lifeStage === 'egg') x.lifeStage = 'adult';
    x.stats.health = Math.max(x.stats.health, 95);
    x.stats.stress = Math.min(x.stats.stress, 10);
    x.stats.hunger = Math.min(x.stats.hunger, 15);
    x.stats.comfort = Math.max(x.stats.comfort, 80);
    x.stats.breedingReadiness = 100;
    if (!x.life) x.life = {};
    x.life.conditioning = 100;
    x.repro.harassment = 0;
    x.repro.warnLevel = 0;
    if (x.repro.stage === 'resting') setStage(x, 'idle', hour);
  }
  const female = herm ? c : myRole === 'female' ? c : partner;
  const male = female === c ? partner : c;
  if (!herm && sp.sexSystem !== 'protandrous') {
    female.reproRole = 'female';
    male.reproRole = 'male';
  } else if (sp.sexSystem === 'protandrous') {
    male.reproRole = 'male';
  }
  const tags = sp.breeding.conditions.needsConditioningFood;
  if (tags?.length) noteFoodSeen(tank, tags, hour);
  ensureEnv(tank, hour);
  if (!isMature(male, sp, hour) || !isMature(female, sp, hour)) return no('Could not make the pair mature.');
  const msg = mod.force(state, male, female, tank, hour);
  emitEvent(state, { kind: 'info', text: `Dev: ${msg}`, tankId: tank.id, creatureId: c.id });
  return ok(`Dev: ${msg}`);
}

