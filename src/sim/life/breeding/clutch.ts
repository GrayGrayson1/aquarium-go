/**
 * Clutch pipeline shared by every breeding system. OWNER: lane "breeding".
 *
 *   eggs / in_pouch ──(incubationHours)──▶ plan.phases[0] (larvae|fry) ──▶ plan.phases[1]? ──(fryRearingHours)──▶ juveniles
 *
 * Survival is a continuous hazard model (deterministic, no RNG): predation by adults (nursery vs display, cover
 * shelter), planktonic loss outside a nursery, starvation without suitable (live) food, water quality, sibling
 * crowding/cannibalism and unguarded-egg fungus. `count = round(initialCount × survival)`.
 * Juveniles are minted as individual creatures (inherited genomes, lineage) up to
 * min(maxRaisedPerClutch, nursery capacity); the rest are rehomed to local hobbyists (never culled on screen).
 */
import type { Clutch, Creature, GameState, SpeciesDefinition, Tank } from '@/types';
import type { SimContext } from '@/sim/context';
import { nextId } from '@/sim/ids';
import { simRng, type Rng } from '@/sim/rng';
import { findSpecies } from '@/data/species';
import { createCreature, addCreature, sizeAtAge, assignPrismatic, isPrismatic, prismaticChance, oneInLabel, recordFinds, strainTier } from '@/sim/life';
import type { MorphStrain } from '@/types';
import { TIER_WORD } from '@/data/rarity';
import { inheritGenome, resolveMorph, resolvePhenotype, rollGenome } from '@/sim/life/genetics';
import { consumeFood } from '@/sim/water';
import { addMastery, addReputation, bumpCounter } from '@/sim/facility';
import type { BreedingModule, NaturalFood, RearingPhase, TankInfo } from './types';
import {
  FRY_GRACE_H,
  PLANKTONIC_LOSS,
  addHistory,
  capacityUnits,
  clamp,
  clamp01,
  foodRecency,
  gallonsOf,
  hasEquipment,
  isAlive,
  isMature,
  isNight,
  isNurseryFor,
  juvenileSlots,
  lineIdFor,
  livingIn,
  pickSite,
  plural,
  ramp,
  revealSex,
  say,
  spName,
  spPlural,
  stockingOf,
  toastWorthy,
  unitsPerJuvenile,
  youngWaterSeverity,
  type Vec,
} from './common';

export type LossCause = keyof NonNullable<Clutch['losses']>;

export interface NewClutch {
  sp: SpeciesDefinition;
  tank: Tank;
  mother: Creature | null;
  father: Creature | null;
  hour: number;
  stage: Clutch['stage'];
  count: number;
  visual: Clutch['visual'];
  nextStageHour: number;
  anchor?: Vec;
  extraAnchors?: Vec[];
  guardedById?: string;
  pendingEggs?: number;
  notes?: string;
  infertile?: boolean;
}

/** Create a clutch, credit both parents (history, counters, mastery). */
export function createClutch(state: GameState, o: NewClutch): Clutch {
  const id = nextId(state, 'clutch');
  const cl: Clutch = {
    id,
    speciesId: o.sp.id,
    tankId: o.tank.id,
    motherId: o.mother?.id ?? null,
    fatherId: o.father?.id ?? null,
    laidHour: o.hour,
    stage: o.stage,
    count: Math.max(0, Math.round(o.count)),
    nextStageHour: o.nextStageHour,
    survival: 1,
    visual: o.visual,
    initialCount: Math.max(0, Math.round(o.count)),
    stageSinceHour: o.hour,
    fed: 0.5,
    lineId: lineIdFor(o.sp, o.mother, o.father),
    losses: { predation: 0, starvation: 0, water: 0, crowding: 0, fungus: 0 },
    flags: [],
  };
  if (o.anchor) cl.anchor = { ...o.anchor };
  if (o.extraAnchors?.length) cl.extraAnchors = o.extraAnchors.map((v) => ({ ...v }));
  if (o.guardedById) cl.guardedById = o.guardedById;
  if (o.pendingEggs) cl.pendingEggs = Math.round(o.pendingEggs);
  if (o.notes) cl.notes = o.notes;
  if (o.infertile) cl.infertile = true;
  state.clutches[id] = cl;

  for (const [p, as] of [
    [o.mother, 'female'],
    [o.father, 'male'],
  ] as const) {
    if (!p) continue;
    p.repro.totalClutches += 1;
    p.repro.lastSpawnHour = o.hour;
    revealSex(p, o.sp, as);
  }
  if (o.mother) addHistory(o.mother, 'bred', o.father ? `Spawned with ${o.father.name}.` : 'Produced a clutch.', o.hour);
  if (o.father && o.father !== o.mother) addHistory(o.father, 'bred', o.mother ? `Spawned with ${o.mother.name}.` : 'Fathered a clutch.', o.hour);
  bumpCounter(state, 'spawns');
  bumpCounter(state, `spawns_${o.sp.id}`);
  addMastery(state, 'breeding', Math.round(4 + 16 * o.sp.breeding.difficulty));
  return cl;
}

/** Add freshly laid eggs to a clutch (axolotl laying over several hours). */
export function addEggs(cl: Clutch, n: number): void {
  if (n <= 0) return;
  const init = cl.initialCount ?? cl.count;
  const alive = init * cl.survival;
  const newInit = init + n;
  cl.initialCount = newInit;
  cl.survival = newInit > 0 ? clamp01((alive + n) / newInit) : 1;
  cl.count = Math.round(alive + n);
  cl.pendingEggs = Math.max(0, (cl.pendingEggs ?? 0) - n);
}

export const isCarried = (cl: Clutch) => cl.stage === 'in_pouch' || (cl.visual === 'berried' && cl.stage === 'eggs');

export function phaseIndex(cl: Clutch, mod: BreedingModule): number {
  const i = mod.plan.phases.findIndex((p) => p.stage === cl.stage);
  return i;
}

export function currentPhase(cl: Clutch, mod: BreedingModule): RearingPhase | null {
  const i = phaseIndex(cl, mod);
  return i >= 0 ? mod.plan.phases[i] : null;
}

/** Hours the clutch spends in its current stage (for converting per-stage loss fractions into hazards). */
export function stageHours(cl: Clutch, sp: SpeciesDefinition, mod: BreedingModule): number {
  if (cl.stage === 'eggs' || cl.stage === 'in_pouch') return Math.max(6, sp.breeding.incubationHours);
  const ph = currentPhase(cl, mod);
  return Math.max(6, (ph?.frac ?? 1) * sp.breeding.fryRearingHours);
}

export function youngLabel(cl: Clutch, mod: BreedingModule): string {
  if (cl.stage === 'eggs' || cl.stage === 'in_pouch') return 'eggs';
  return currentPhase(cl, mod)?.label ?? (cl.stage === 'larvae' ? 'larvae' : 'fry');
}

/** Food the tank produces for young on its own (0..1). */
export function naturalFood(state: GameState, tank: Tank, kinds: readonly NaturalFood[], info: TankInfo): number {
  if (!kinds.length) return 0;
  const mature = tank.water.bioMaturity ?? 0;
  let best = 0;
  for (const k of kinds) {
    let v = 0;
    switch (k) {
      case 'infusoria':
        if (tank.environment !== 'marine') v = (0.12 + 0.5 * Math.min(1, info.habitat().cover / 0.6)) * ramp(mature, 0.35, 0.9);
        break;
      case 'biofilm':
        v = (0.3 + 0.35 * ramp(mature, 0.3, 0.9) + 0.25 * Math.min(1, info.habitat().grazing / 3) + 0.2 * Math.min(1, info.habitat().cover / 0.5)) * ramp(mature, 0.15, 0.5);
        break;
      case 'algae':
        v = clamp01((tank.water.algae ?? 0) / 60) * 0.7;
        break;
      case 'copepods': {
        const liveRock = tank.waterClass === 'marine_live_rock' || tank.waterClass === 'reef';
        v = (liveRock ? 0.22 : 0.05) * ramp(mature, 0.5, 1) + (hasEquipment(tank, 'refugium') ? 0.45 : 0);
        break;
      }
    }
    best = Math.max(best, v);
  }
  return clamp01(best);
}

interface PredationInfo {
  /** 0..1 fraction of the young lost over the current stage to predators (after cover shelter). */
  p: number;
  /** Adult conspecifics eating them (excluding a tending parent). */
  conspecific: Creature[];
  /** The tending parent has turned on its own free-swimming fry. */
  guardianEating: Creature | null;
  /** Other-species predators present, by species id. */
  others: Map<string, Creature[]>;
}

function predationInfo(state: GameState, cl: Clutch, tank: Tank, sp: SpeciesDefinition, mod: BreedingModule, hour: number, info: TankInfo): PredationInfo {
  const out: PredationInfo = { p: 0, conspecific: [], guardianEating: null, others: new Map() };
  if (isCarried(cl)) return out;
  const plan = mod.plan;
  const eggs = cl.stage === 'eggs';
  const tags = eggs ? plan.eggTags : plan.youngTags;
  const guardian = cl.guardedById;
  let pCon = 0;
  const living = livingIn(state, tank.id);
  for (const c of living) {
    if (c.lifeStage === 'egg' || c.lifeStage === 'larva' || c.lifeStage === 'fry') continue;
    if (c.speciesId === sp.id) {
      if (!isMature(c, sp, hour)) continue;
      if (c.id === guardian) {
        if (plan.guardianEatsFry && cl.stage === 'fry' && hour > (cl.stageSinceHour ?? cl.laidHour) + FRY_GRACE_H) {
          pCon = Math.max(pCon, sp.breeding.predationWithoutNursery);
          out.guardianEating = c;
        }
        continue;
      }
      if (eggs && !plan.parentsEatEggs) continue;
      if (sp.breeding.predationWithoutNursery <= 0) continue;
      pCon = Math.max(pCon, sp.breeding.predationWithoutNursery);
      out.conspecific.push(c);
      continue;
    }
    const osp = findSpecies(c.speciesId);
    if (!osp || !tags.length) continue;
    if (!osp.predatorTags.some((t) => tags.includes(t))) continue;
    const list = out.others.get(osp.id) ?? [];
    list.push(c);
    out.others.set(osp.id, list);
  }
  let keep = 1 - pCon;
  for (const list of out.others.values()) keep *= 1 - Math.min(0.95, 0.5 + 0.1 * (list.length - 1));
  const hrs = stageHours(cl, sp, mod);
  for (const r of info.youngRisks()) {
    if (r.targetSpeciesId !== sp.id || out.others.has(r.actorSpeciesId) || r.actorSpeciesId === sp.id) continue;
    const actors = living.filter((c) => c.speciesId === r.actorSpeciesId);
    if (!actors.length) continue;
    const perDay = clamp01(r.perDay);
    keep *= 1 - Math.min(0.97, 1 - Math.pow(1 - perDay, hrs / 24));
    out.others.set(r.actorSpeciesId, actors);
  }
  out.p = clamp((1 - keep) * (1 - plan.coverShelter * clamp01(info.habitat().cover)), 0, 0.995);
  return out;
}

/** Clutch per-hour hazards by cause. Also updates `cl.fed`. */
function hazards(state: GameState, cl: Clutch, tank: Tank, sp: SpeciesDefinition, mod: BreedingModule, hour: number, dt: number, info: TankInfo, pred: PredationInfo): Record<LossCause, number> {
  const plan = mod.plan;
  const b = sp.breeding;
  const out: Record<LossCause, number> = { predation: 0, starvation: 0, water: 0, crowding: 0, fungus: 0 };
  const hrs = stageHours(cl, sp, mod);
  const carried = isCarried(cl);
  const eggs = cl.stage === 'eggs' || cl.stage === 'in_pouch';

  // predation (+ planktonic loss in a display tank)
  let p = pred.p;
  if (plan.planktonic && !eggs && !isNurseryFor(state, tank, hour)) p = 1 - (1 - p) * (1 - PLANKTONIC_LOSS);
  if (p > 0) out.predation = -Math.log(1 - Math.min(0.995, p)) / hrs;

  // starvation
  if (!eggs) {
    const ph = currentPhase(cl, mod);
    const idx = phaseIndex(cl, mod);
    const into = hour - (cl.stageSinceHour ?? cl.laidHour);
    const yolk = idx === 0 && into < plan.yolkFrac * b.fryRearingHours;
    const offered = ph ? foodRecency(tank, ph.foods, hour, 10, 14) : 1;
    const target = yolk ? 1 : Math.max(offered, ph ? naturalFood(state, tank, ph.natural, info) : 1);
    const fed = cl.fed ?? 0.5;
    cl.fed = clamp01(fed + (target - fed) * (1 - Math.exp(-dt / 5)));
    if (!yolk) out.starvation = (plan.starveSeverity * 3) / Math.max(24, b.fryRearingHours) * Math.pow(1 - cl.fed, 2);
    // the young actually eat a little of what was offered
    if (!yolk && ph && offered > 0.5 && cl.count > 0) {
      try {
        consumeFood(tank, ph.foods, Math.min(0.2, 0.0015 * Math.sqrt(cl.count)) * dt);
      } catch {
        /* water lane may not support tags yet */
      }
    }
  }

  // water quality (eggs a little more robust, carried young much more)
  const sev = youngWaterSeverity(tank, sp);
  if (sev > 0) out.water = 0.03 * sev * (carried ? 0.25 : eggs ? 0.6 : 1);

  // crowding / sibling cannibalism
  if (!eggs && !carried && cl.count > 0) {
    const gal = gallonsOf(tank);
    if (plan.cannibalPerGallon) {
      const cap = Math.max(4, gal * plan.cannibalPerGallon);
      if (cl.count > cap) out.crowding = 0.015 * (cl.count / cap - 1);
    } else {
      const cap = Math.max(10, (gal * 30) / Math.max(0.3, Math.sqrt(Math.max(0.05, sp.bioload))));
      if (cl.count > cap) out.crowding = 0.006 * (cl.count / cap - 1);
    }
  }

  // unguarded eggs
  if (cl.stage === 'eggs' && plan.guardEggs && !carried) {
    const g = cl.guardedById ? state.creatures[cl.guardedById] : undefined;
    const tended = isAlive(g) && g.tankId === cl.tankId;
    if (!tended) {
      const pf = hasEquipment(tank, 'airstone') ? 0.25 : 0.5;
      out.fungus = -Math.log(1 - pf) / hrs;
    }
  }
  return out;
}

function flag(cl: Clutch, key: string): boolean {
  if (!cl.flags) cl.flags = [];
  if (cl.flags.includes(key)) return false;
  cl.flags.push(key);
  return true;
}

function parentName(state: GameState, cl: Clutch): string {
  const m = cl.motherId ? state.creatures[cl.motherId] : undefined;
  const f = cl.fatherId ? state.creatures[cl.fatherId] : undefined;
  const carrier = cl.guardedById ? state.creatures[cl.guardedById] : undefined;
  if (cl.stage === 'in_pouch' && carrier) return `${carrier.name}’s`;
  if (m) return `${m.name}’s`;
  if (f) return `${f.name}’s`;
  return 'The';
}

const LOSS_TEXT: Record<LossCause, (sp: SpeciesDefinition) => string> = {
  predation: () => 'they were eaten by tankmates or lost to the display — next time move them to a nursery tank',
  starvation: (sp) => `the young starved — ${spName(sp)} young need suitable live food such as infusoria, baby brine shrimp or copepods`,
  water: () => 'the water quality was too poor for such delicate young',
  crowding: () => 'too many young in too little water — crowded siblings turned on each other',
  fungus: () => 'without a parent tending them, the eggs fungused',
};

/** Remove a clutch that has no survivors, explain why, free up parents. */
export function loseClutch(state: GameState, cl: Clutch, sp: SpeciesDefinition, ctx: SimContext | null, reason?: string, kind: 'warning' | 'info' = 'warning'): void {
  let text = reason;
  if (!text) {
    const l = cl.losses ?? { predation: 0, starvation: 0, water: 0, crowding: 0, fungus: 0 };
    let worst: LossCause = 'predation';
    for (const k of Object.keys(l) as LossCause[]) if (l[k] > l[worst]) worst = k;
    text = `${parentName(state, cl)} ${cl.stage === 'eggs' ? 'eggs' : 'brood'} didn’t make it: ${LOSS_TEXT[worst](sp)}.`;
  }
  say(state, ctx, { kind, text, tankId: cl.tankId, creatureId: cl.motherId ?? cl.fatherId ?? undefined, toast: kind === 'warning' });
  releaseParents(state, cl);
  delete state.clutches[cl.id];
}

function releaseParents(state: GameState, cl: Clutch): void {
  for (const id of [cl.motherId, cl.fatherId, cl.guardedById]) {
    const p = id ? state.creatures[id] : undefined;
    if (p && p.repro.clutchId === cl.id) p.repro.clutchId = undefined;
  }
}

/** Advance one clutch for a sub-step. */
/** Fill optional bookkeeping for clutches created elsewhere (fixtures, old saves) without changing their count. */
export function normalizeClutch(cl: Clutch): void {
  if (!Number.isFinite(cl.count) || cl.count < 0) cl.count = 0;
  if (!Number.isFinite(cl.survival) || cl.survival <= 0 || cl.survival > 1) cl.survival = cl.count > 0 ? 1 : 0;
  if (cl.initialCount === undefined || !Number.isFinite(cl.initialCount)) cl.initialCount = cl.survival > 0 ? cl.count / cl.survival : cl.count;
  if (cl.stageSinceHour === undefined) cl.stageSinceHour = cl.laidHour;
  if (!Number.isFinite(cl.nextStageHour)) cl.nextStageHour = cl.laidHour + 24;
}

export function stepClutch(state: GameState, cl: Clutch, tank: Tank, sp: SpeciesDefinition, mod: BreedingModule, hour: number, dt: number, ctx: SimContext, info: TankInfo): void {
  normalizeClutch(cl);
  // Carried broods travel with their carrier.
  if (isCarried(cl)) {
    const carrier = cl.guardedById ? state.creatures[cl.guardedById] : undefined;
    if (!isAlive(carrier)) {
      const gone = cl.guardedById ? state.creatures[cl.guardedById] : undefined;
      const who = gone?.name ?? 'the parent';
      const what = cl.stage === 'in_pouch' ? 'The brood' : 'The eggs';
      if (gone && gone.status === 'sold') loseClutch(state, cl, sp, ctx, `${what} ${who} was carrying went with ${gone.sex === 'female' ? 'her' : 'him'} to a new home.`, 'info');
      else loseClutch(state, cl, sp, ctx, `${what} ${who} was carrying ${cl.stage === 'in_pouch' ? 'was' : 'were'} lost with ${who}.`);
      return;
    }
    if (carrier.tankId && carrier.tankId !== cl.tankId) {
      cl.tankId = carrier.tankId;
      return;
    }
  }

  // Eggs still being laid one by one need the mother present: if she was sold or died mid-lay, whatever she had
  // already placed carries on alone and the rest never come (a moved-out mother is handled by her module).
  if (cl.pendingEggs && cl.pendingEggs > 0) {
    const mother = cl.motherId ? state.creatures[cl.motherId] : undefined;
    const gone = !mother || (mother.status !== 'alive' && mother.status !== 'listed');
    if (gone) {
      cl.pendingEggs = undefined;
      if (cl.count <= 0) {
        const who = mother?.name ?? 'The mother';
        if (mother?.status === 'sold') loseClutch(state, cl, sp, ctx, `${who} left for a new home before laying any eggs — there is no clutch to raise.`, 'info');
        else loseClutch(state, cl, sp, ctx, `${who} never finished laying — no eggs were left behind.`);
        return;
      }
    }
  }

  // Infertile eggs (nerite eggs in freshwater…) never hatch — they fade after a while.
  if (cl.infertile) {
    if (hour >= cl.nextStageHour) {
      say(state, ctx, { kind: 'info', text: cl.notes ?? `${parentName(state, cl)} eggs never hatched.`, tankId: cl.tankId });
      releaseParents(state, cl);
      delete state.clutches[cl.id];
    }
    return;
  }

  // Survival.
  const pred = predationInfo(state, cl, tank, sp, mod, hour, info);
  const hz = hazards(state, cl, tank, sp, mod, hour, dt, info, pred);
  const total = hz.predation + hz.starvation + hz.water + hz.crowding + hz.fungus;
  const init = cl.initialCount ?? cl.count;
  if (total > 0 && init > 0) {
    const before = init * cl.survival;
    cl.survival = clamp01(cl.survival * Math.exp(-total * dt));
    const lost = before - init * cl.survival;
    if (!cl.losses) cl.losses = { predation: 0, starvation: 0, water: 0, crowding: 0, fungus: 0 };
    for (const k of Object.keys(hz) as LossCause[]) if (hz[k] > 0) cl.losses[k] += (lost * hz[k]) / total;
  }
  cl.count = Math.max(0, Math.round(init * cl.survival));
  warnings(state, cl, tank, sp, mod, hz, pred, hour, ctx);

  if (cl.count <= 0 && !(cl.pendingEggs && cl.pendingEggs > 0)) {
    loseClutch(state, cl, sp, ctx);
    return;
  }

  // Stage transitions (carried broods are released by their module: birth / mouth release).
  if (hour + dt < cl.nextStageHour || cl.stage === 'in_pouch') return;
  if (cl.pendingEggs && cl.pendingEggs > 0) return; // still being laid
  if (cl.stage === 'eggs') hatch(state, cl, tank, sp, mod, hour, ctx);
  else advancePhase(state, cl, tank, sp, mod, hour, ctx);
}

function names(list: Creature[]): string {
  const n = list.map((c) => c.name);
  if (n.length <= 1) return n[0] ?? 'an adult';
  if (n.length === 2) return `${n[0]} and ${n[1]}`;
  return `${n[0]}, ${n[1]} and ${n.length - 2} more`;
}

function predationText(state: GameState, cl: Clutch, tank: Tank, sp: SpeciesDefinition, mod: BreedingModule, pred: PredationInfo, hour: number): string {
  const who = parentName(state, cl);
  const whose = who === 'The' ? 'the' : who;
  const label = youngLabel(cl, mod);
  const guardian = cl.guardedById ? state.creatures[cl.guardedById] : undefined;
  const tending = isAlive(guardian) && guardian.tankId === cl.tankId && !pred.guardianEating && (cl.stage === 'eggs' || !!mod.plan.guardYoung);
  if (pred.guardianEating) return `${pred.guardianEating.name} has started eating the fry he raised — move him out of ${tank.name} now!`;
  if (mod.plan.planktonic && cl.stage !== 'eggs' && !isNurseryFor(state, tank, hour)) {
    return `${who} ${label} are drifting into the filter and the mouths of tankmates. Move them to a nursery tank to save them.`;
  }
  if (pred.conspecific.length && tending && guardian) {
    const one = pred.conspecific.length === 1;
    const eater = pred.conspecific[0];
    const pron = one ? (eater.reproRole === 'female' || eater.sex === 'female' ? 'her' : 'him') : 'them';
    const own = one && (eater.id === cl.motherId || eater.id === cl.fatherId);
    const target = own ? `${pron === 'her' ? 'her' : 'his'} own ${label}` : `${whose} ${label}`;
    return `${names(pred.conspecific)} ${one ? 'is' : 'are'} eating ${target}! Move ${pron} out and let ${guardian.name} tend the brood alone.`;
  }
  if (pred.conspecific.length) return `The adult ${spPlural(sp)} are eating ${whose} ${label}! Move the clutch to a nursery tank.`;
  const other = [...pred.others.keys()].map((id) => findSpecies(id)).filter((x): x is SpeciesDefinition => !!x);
  if (other.length) return `${other.map((o) => spPlural(o)).join(' and ').replace(/^./, (ch) => ch.toUpperCase())} ${other.length === 1 && pred.others.get(other[0].id)!.length === 1 ? 'is' : 'are'} hunting ${whose} ${label}! Move the clutch to a nursery tank.`;
  return `Something is eating ${whose} ${label} — a nursery tank would keep them safe.`;
}

function warnings(state: GameState, cl: Clutch, tank: Tank, sp: SpeciesDefinition, mod: BreedingModule, hz: Record<LossCause, number>, pred: PredationInfo, hour: number, ctx: SimContext): void {
  if (cl.count <= 0) return;
  const who = parentName(state, cl);
  const whose = who === 'The' ? 'the' : who;
  const label = youngLabel(cl, mod);
  const key = pred.guardianEating ? 'pred_guardian' : `pred_${cl.stage}`;
  if (hz.predation > 0.004 && flag(cl, key)) {
    say(state, ctx, { kind: pred.guardianEating ? 'danger' : 'warning', text: predationText(state, cl, tank, sp, mod, pred, hour), tankId: cl.tankId, creatureId: pred.guardianEating?.id ?? pred.conspecific[0]?.id, toast: !!pred.guardianEating || toastWorthy(state, sp, 'predation', 2) });
  }
  if (hz.starvation > 0.004 && (cl.fed ?? 1) < 0.4 && flag(cl, `food_${cl.stage}`)) {
    const ph = currentPhase(cl, mod);
    const foods = (ph?.foods ?? []).slice(0, 2).map((f) => f.replace(/_/g, ' '));
    say(state, ctx, { kind: 'warning', text: `${who} ${label} are hungry — offer ${foods.length ? foods.join(' or ') : 'tiny live foods'} several times a day.`, tankId: cl.tankId, toast: toastWorthy(state, sp, 'hungry', 2) });
  }
  if (hz.crowding > 0.002 && flag(cl, 'crowd')) {
    const text = mod.plan.cannibalPerGallon
      ? `${who} ${label} are crowded and starting to nip each other — split them between tanks or use a bigger nursery.`
      : `${who} ${label} are crowded — a bigger nursery would raise more of them.`;
    say(state, ctx, { kind: 'warning', text, tankId: cl.tankId });
  }
  if (hz.water > 0.01 && flag(cl, 'water')) {
    say(state, ctx, { kind: 'warning', text: `The water in ${tank.name} is hurting ${whose} ${label} — check temperature, ammonia and nitrite.`, tankId: cl.tankId, toast: true });
  }
  if (hz.fungus > 0 && flag(cl, 'fungus')) {
    say(state, ctx, { kind: 'warning', text: `Nobody is tending ${whose} eggs — some are turning white with fungus. An airstone nearby helps.`, tankId: cl.tankId });
  }
}

function hatch(state: GameState, cl: Clutch, tank: Tank, sp: SpeciesDefinition, mod: BreedingModule, hour: number, ctx: SimContext): void {
  const plan = mod.plan;
  if (plan.hatchAtNight && !isNight(tank, hour)) return;
  if (!plan.larvaeViable) {
    loseClutch(state, cl, sp, ctx, plan.nonViableText ?? `${parentName(state, cl)} eggs hatched, but the larvae need a rearing setup this shop can’t provide yet.`);
    return;
  }
  const ph = plan.phases[0];
  if (!ph) {
    mintJuveniles(state, cl, tank, sp, hour, ctx);
    return;
  }
  const wasBerried = cl.visual === 'berried';
  setPhase(cl, ph, sp, hour);
  if (!plan.guardYoung && !wasBerried) cl.guardedById = undefined;
  if (wasBerried) {
    cl.guardedById = undefined;
    cl.anchor = pickSite(tank, 'plants_low', `${cl.id}:hatch`).anchor;
  } else if (ph.visual === 'fry_cloud' && cl.anchor) {
    cl.anchor = { ...cl.anchor };
  } else if (ph.visual === 'fry_cloud') {
    cl.anchor = pickSite(tank, 'midwater', `${cl.id}:hatch`).anchor;
  }
  cl.fed = Math.max(cl.fed ?? 0, 0.5);
  bumpCounter(state, 'hatches');
  addMastery(state, 'breeding', 3);
  if (mod.onPhase?.(state, cl, tank, sp, hour, ctx)) return;
  const nursery = isNurseryFor(state, tank, hour);
  const hint = !nursery && sp.breeding.nurseryRequired ? ' Adults and filters are a danger — a nursery tank gives them their best chance.' : '';
  say(state, ctx, { kind: 'breeding', text: `${parentName(state, cl)} eggs hatched — ${plural(cl.count, ph.label.replace(/s$/, ''), ph.label)}!${hint}`, tankId: cl.tankId, creatureId: cl.motherId ?? undefined, toast: toastWorthy(state, sp, 'hatch') });
}

function setPhase(cl: Clutch, ph: RearingPhase, sp: SpeciesDefinition, hour: number): void {
  cl.stage = ph.stage;
  cl.stageSinceHour = hour;
  cl.nextStageHour = hour + Math.max(1, ph.frac * sp.breeding.fryRearingHours);
  if (ph.visual !== 'keep') cl.visual = ph.visual;
}

function advancePhase(state: GameState, cl: Clutch, tank: Tank, sp: SpeciesDefinition, mod: BreedingModule, hour: number, ctx: SimContext): void {
  const idx = phaseIndex(cl, mod);
  const next = idx >= 0 ? mod.plan.phases[idx + 1] : undefined;
  if (next) {
    setPhase(cl, next, sp, hour);
    if (next.visual === 'fry_cloud' && !cl.anchor) cl.anchor = pickSite(tank, 'midwater', `${cl.id}:fry`).anchor;
    if (!mod.onPhase?.(state, cl, tank, sp, hour, ctx)) {
      say(state, ctx, { kind: 'breeding', text: `${parentName(state, cl)} ${plural(cl.count, next.label.replace(/s$/, ''), next.label)} are growing well.`, tankId: cl.tankId });
    }
    return;
  }
  mintJuveniles(state, cl, tank, sp, hour, ctx);
}

/** Begin the rearing phases for a carried brood that has just been released (seahorse birth, mouthbrooder release). */
export function releaseCarried(cl: Clutch, tank: Tank, sp: SpeciesDefinition, mod: BreedingModule, hour: number): void {
  const ph = mod.plan.phases[0];
  cl.guardedById = undefined;
  if (ph) setPhase(cl, ph, sp, hour);
  else {
    cl.stage = 'fry';
    cl.stageSinceHour = hour;
    cl.nextStageHour = hour + sp.breeding.fryRearingHours;
  }
  cl.visual = 'fry_cloud';
  cl.anchor = pickSite(tank, 'midwater', `${cl.id}:birth`).anchor;
  cl.fed = Math.max(cl.fed ?? 0, 0.5);
}

// ───────────────────────────── minting juveniles ─────────────────────────────

const OFFSPRING_NAMES = [
  'Pebble', 'Sprout', 'Ripple', 'Button', 'Clover', 'Nori', 'Pip', 'Fern', 'Drift', 'Kelp', 'Wisp', 'Juniper', 'Poppy',
  'Marble', 'Sable', 'Cinder', 'Luna', 'Echo', 'Tide', 'Brook', 'Reed', 'Shell', 'Opal', 'Ivy', 'Moss', 'Maple', 'Hazel',
  'Wren', 'Sunny', 'Dash', 'Bean', 'Kiwi', 'Mango', 'Olive', 'Dumpling', 'Noodle', 'Biscuit', 'Toffee', 'Truffle',
  'Taro', 'Yuzu', 'Miso', 'Sesame', 'Basil', 'Sage', 'Saffron', 'Cocoa', 'Pearl', 'Comet', 'Nimbus', 'Lark', 'Rain',
];
const ROMAN = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];

function offspringName(rng: Rng, used: Set<string>): string {
  const base = OFFSPRING_NAMES[Math.floor(rng.next() * OFFSPRING_NAMES.length) % OFFSPRING_NAMES.length];
  for (const suffix of ROMAN) {
    const n = base + suffix;
    if (!used.has(n)) return n;
  }
  return `${base} ${used.size + 1}`;
}

/** Turn the surviving young of a clutch into individual juveniles (capacity-bounded). Removes the clutch. */
export function mintJuveniles(state: GameState, cl: Clutch, tank: Tank, sp: SpeciesDefinition, hour: number, ctx: SimContext | null): Creature[] {
  const rng = ctx?.rng ?? simRng(state);
  const mother = cl.motherId ? state.creatures[cl.motherId] : undefined;
  const father = cl.fatherId ? state.creatures[cl.fatherId] : undefined;
  const mg = mother?.genome ?? father?.genome ?? rollGenome(sp, rng);
  const fg = father?.genome ?? mg;
  const limit = Math.max(0, Math.min(cl.count, sp.breeding.maxRaisedPerClutch));
  const generation = Math.max(mother?.lineage.generation ?? 0, father?.lineage.generation ?? 0) + 1;
  const lineId = cl.lineId ?? lineIdFor(sp, mother, father);
  // Rearing can outlast the species' juvenile phase (seahorses, shrimp, small gobies): cap the birth age so every
  // youngster arrives as a juvenile with growth, the sex reveal and maturity still ahead of it.
  const ageDays = Math.max(0.5, Math.min((hour - cl.laidHour) / 24, Math.max(0.5, sp.lifecycle.juvenileDays * 0.8)));
  const parents = mother && father ? `${mother.name} × ${father.name}` : (mother ?? father)?.name ?? 'your breeding stock';
  const used = new Set<string>(Object.values(state.creatures).filter((c) => c.speciesId === sp.id).map((c) => c.name));
  const minted: Creature[] = [];
  const prismatic: Creature[] = []; // lane:genetics
  const newStrains = new Map<string, MorphStrain>(); // lane:genetics — creature id → first-time strain
  let estSize = sp.adultSizeCm * 0.5;
  try {
    estSize = sizeAtAge(sp, mg, ageDays);
  } catch {
    /* lifecycle growth unavailable */
  }

  // Mint one at a time while the tank has room (bioload at the juveniles' real size).
  for (let i = 0; i < limit; i++) {
    const stock = stockingOf(state, tank, hour);
    if (stock.used + unitsPerJuvenile(sp, estSize) > stock.cap + 1e-9) break;
    const genome = inheritGenome(sp, mg, fg, rng);
    const c = createCreature(state, rng, sp.id, {
      ageDays,
      genome,
      tankId: tank.id,
      captiveBred: true,
      motherId: mother?.id ?? cl.motherId,
      fatherId: father?.id ?? cl.fatherId,
      generation,
      lineId,
      breederName: 'Your shop',
      purchasePrice: 0,
    });
    // Guarantee inherited appearance even if creation used a placeholder.
    const ph = resolvePhenotype(sp, c.genome, c.appearance?.patternSeed ?? Math.floor(rng.next() * 1e9));
    if (c.morphName !== ph.morphName) {
      c.morphName = ph.morphName;
      c.appearance = { ...ph.visual };
    }
    if (c.reproRole === 'undifferentiated' && sp.sexSystem === 'gonochoristic') c.reproRole = rng.next() < 0.5 ? 'male' : 'female';
    if (!c.name || c.name === sp.commonName) c.name = offspringName(rng, used);
    used.add(c.name);
    c.lineage = { motherId: mother?.id ?? cl.motherId, fatherId: father?.id ?? cl.fatherId, generation, lineId, breederName: 'Your shop' };
    c.captiveBred = true;
    c.acquiredHour = hour;
    c.history = [{ hour, kind: 'born', text: `Raised in your shop — offspring of ${parents} (generation ${generation}).` }];
    if (genome.mutations?.length) c.history.push({ hour, kind: 'milestone', text: 'Carries a spontaneous colour mutation!' });
    // lane:genetics — one Prismatic roll per youngster, from its own generator (the sim stream is untouched). Prismatic
    // parents raise the odds; nothing makes it certain.
    if (assignPrismatic(state, c, 'bred', [mother, father])) prismatic.push(c);
    addCreature(state, c, tank.id);
    minted.push(c);
    const finds = recordFinds(state, c);
    if (finds.strains.length) newStrains.set(c.id, finds.strains[0]);
    if (Number.isFinite(c.sizeCm) && c.sizeCm > 0) estSize = c.sizeCm;
  }
  const n = minted.length;

  const rehomed = Math.max(0, cl.count - n);
  for (const p of [mother, father]) {
    if (!p) continue;
    p.repro.totalOffspringRaised += n;
    if (n > 0) addHistory(p, 'bred', `Raised ${plural(n, 'juvenile')} with ${p === mother ? (father?.name ?? 'a partner') : (mother?.name ?? 'a partner')}.`, hour);
  }

  // Morph discovery.
  const newMorphs: string[] = [];
  for (const c of minted) {
    const key = `${sp.id}:${c.morphName}`;
    if (!state.progress.discoveredMorphs.includes(key)) {
      state.progress.discoveredMorphs.push(key);
      newMorphs.push(c.morphName);
    }
  }

  // Counters & mastery.
  if (n > 0) {
    bumpCounter(state, 'births', n);
    bumpCounter(state, 'juvenilesRaised', n);
    bumpCounter(state, `raised_${sp.id}`, n);
    bumpCounter(state, 'clutchesRaised');
    addMastery(state, 'breeding', 10 + 2 * n + Math.round(20 * sp.breeding.difficulty));
  }
  if (rehomed > 0) {
    bumpCounter(state, 'rehomed', rehomed);
    addReputation(state, Math.min(4, Math.ceil(rehomed / 40)), 'Rehomed young to local hobbyists');
  }

  const capLimited = n < Math.min(cl.count, sp.breeding.maxRaisedPerClutch);
  const young = spPlural(sp);
  let text: string;
  if (n > 0) {
    text = `${plural(n, `young ${spName(sp)}`, `young ${young}`)} from ${parents} ${n === 1 ? 'is' : 'are'} ready to meet you!`;
    if (rehomed > 0) text += ` ${rehomed.toLocaleString('en-US')} more ${rehomed === 1 ? 'was' : 'were'} rehomed to local hobbyists.`;
    if (capLimited) text += ` ${tank.name} is at capacity — a bigger nursery would let you keep more.`;
  } else if (cl.count > 0) {
    text = `${parentName(state, cl)} young are grown, but ${tank.name} has no room for more animals — all ${cl.count.toLocaleString('en-US')} were rehomed to local hobbyists.`;
  } else text = `${parentName(state, cl)} brood has grown up.`;
  say(state, ctx, { kind: 'breeding', text, tankId: tank.id, creatureId: minted[0]?.id ?? mother?.id, toast: toastWorthy(state, sp, 'raised') });

  for (const m of newMorphs) {
    // Plain wild types don't count as a discovery — but a wild base with an overlay ("Kuro (Wild) Miyuki") does.
    const example = minted.find((c) => c.morphName === m);
    if (!example || isPlainWildType(sp, example)) continue;
    addMastery(state, 'breeding', 25);
    bumpCounter(state, 'morphsDiscovered');
    // lane:genetics — a first that is also a recognised strain says so in the same toast (never a second one)
    const strain = minted.filter((c) => c.morphName === m).map((c) => newStrains.get(c.id)).find(Boolean);
    const strainNote = strain ? ` A recognised ${TIER_WORD[strainTier(sp, strain)]} strain: ${strain.name}.` : '';
    say(state, ctx, { kind: 'celebrate', text: `First ${m} ${spName(sp)} bred in your shop!${strainNote}`, tankId: tank.id, creatureId: minted.find((c) => c.morphName === m)?.id, toast: true });
  }

  // lane:genetics — Prismatic young: announced after the brood's other news (so siblings' ids never shift)
  for (const c of prismatic) {
    addMastery(state, 'breeding', 40);
    bumpCounter(state, 'prismaticsBred');
    const odds = oneInLabel(prismaticChance({ source: 'bred', rareParents: [mother, father].filter((p) => isPrismatic(p)).length }));
    say(state, ctx, { kind: 'celebrate', text: `Prismatic! ${c.name}, one of the new ${spPlural(sp)} from ${parents}, shimmers with rainbow light — about ${odds} young are born like this.`, tankId: tank.id, creatureId: c.id, toast: true });
  }

  releaseParents(state, cl);
  delete state.clutches[cl.id];
  return minted;
}

/** True for a morph with no overlays whose base is absent, a catch-all, or itself a wild type. */
function isPlainWildType(sp: SpeciesDefinition, c: Creature): boolean {
  const r = resolveMorph(sp, c.genome);
  if (r.overlayIds.length) return false;
  if (!r.baseId) return true;
  const base = sp.genetics.phenotypes.find((p) => p.id === r.baseId);
  return !base || base.when.length === 0 || /wild/i.test(base.name);
}

/** Remaining nursery room for a species in a tank (for UI). */
export function nurseryRoom(state: GameState, tank: Tank, sp: SpeciesDefinition, hour: number): { slots: number; capacityUnits: number } {
  return { slots: juvenileSlots(state, tank, sp, hour), capacityUnits: capacityUnits(tank) };
}
