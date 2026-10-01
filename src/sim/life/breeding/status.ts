/**
 * Plain-language breeding status for creature and clutch cards. OWNER: lane "breeding".
 * PURE: never writes to state.
 */
import type { GameState } from '@/types';
import { findSpecies } from '@/data/species';
import { moduleFor } from './registry';
import type { StatusOut } from './types';
import { currentPhase, isCarried, youngLabel } from './clutch';
import {
  READY,
  SURFACE_CALM_MAX,
  ageDaysAt,
  approxDuration,
  clamp01,
  foodRecency,
  habitatOf,
  isAlive,
  isMature,
  isNurseryFor,
  juvenileSlots,
  plural,
  stageProgress,
  surfaceAgitation,
} from './common';

export function creatureBreedingStatus(state: GameState, creatureId: string): StatusOut | null {
  const c = state.creatures[creatureId];
  if (!c || !isAlive(c) || !c.repro) return null;
  const sp = findSpecies(c.speciesId);
  if (!sp) return null;
  const mod = moduleFor(sp);
  const hour = state.clock.hour;
  if (!mod.breedable) return { label: 'Not bred here', detail: mod.explain?.(sp) };
  if (!isMature(c, sp, hour)) {
    const age = ageDaysAt(c, hour);
    return { label: 'Too young to breed', detail: `Matures in ${approxDuration((sp.breeding.maturityDays - age) * 24)}`, progress: clamp01(age / Math.max(1, sp.breeding.maturityDays)) };
  }
  const own = mod.status?.(state, c, sp, hour);
  if (own) return { ...own, progress: own.progress === undefined ? undefined : clamp01(own.progress) };

  const r = c.repro;
  const partner = r.partnerId ? state.creatures[r.partnerId] : undefined;
  const pn = partner && isAlive(partner) ? partner.name : 'a partner';
  const prog = stageProgress(c, hour);
  const cl = r.clutchId ? state.clutches[r.clutchId] : undefined;
  const tank = c.tankId ? state.tanks[c.tankId] : undefined;
  const readiness = Math.round(c.stats.breedingReadiness);

  switch (r.stage) {
    case 'conditioning':
      return { label: 'Conditioning', detail: readiness >= READY ? 'In breeding condition' : `Breeding readiness ${readiness}%`, progress: clamp01(c.stats.breedingReadiness / 100) };
    case 'nest_building': {
      const calm = tank ? surfaceAgitation(tank, habitatOf(state, tank).cover) <= SURFACE_CALM_MAX : true;
      return { label: 'Building a bubble nest', detail: calm ? 'Blowing bubbles beneath the leaves' : 'The surface is too choppy — the nest keeps breaking up', progress: clamp01(r.nestProgress ?? 0) };
    }
    case 'nest_ready':
      return { label: 'Bubble nest ready', detail: 'Introduce a conditioned female with Start breeding', progress: 1 };
    case 'gravid':
      return { label: 'Full of eggs', detail: 'Ready to spawn with a partner' };
    case 'courting':
      return { label: `Courting ${pn}`, progress: prog };
    case 'spawning':
      return { label: `Spawning with ${pn}`, progress: prog };
    case 'depositing':
      return { label: 'Depositing spermatophores', detail: `${pn} is following`, progress: prog };
    case 'following':
      return { label: 'Picking up a spermatophore', progress: prog };
    case 'laying':
      return { label: 'Laying eggs', detail: cl ? `${plural(cl.count, 'egg')} so far` : undefined, progress: prog };
    case 'guarding': {
      if (!cl) return { label: 'Guarding' };
      if (cl.stage === 'eggs') return { label: `Guarding ${plural(cl.count, 'egg')}`, detail: `Hatching in ${approxDuration(cl.nextStageHour - hour)}`, progress: clutchProgress(state, cl.id) };
      if (cl.stage === 'larvae') return { label: `Tending ${plural(cl.count, 'larva', 'larvae')}`, detail: 'Returning strays to the nest', progress: clutchProgress(state, cl.id) };
      return { label: 'Fry are free-swimming', detail: `Move ${c.name} out — his job is done`, progress: 1 };
    }
    case 'brooding':
      return { label: cl ? `Mouthbrooding ${plural(cl.count, 'egg')}` : 'Mouthbrooding', detail: 'Won’t eat until the young are released', progress: prog };
    case 'pregnant': {
      const due = (r.carryingUntilHour ?? hour) - hour;
      return { label: due > 0 ? `Pregnant — due in ${approxDuration(due)}` : 'Pregnant — birth is imminent', detail: cl ? `Carrying about ${plural(cl.count, 'young', 'young')}` : undefined, progress: prog };
    }
    case 'berried':
      return { label: cl ? `Berried — ${plural(cl.count, 'egg')}` : 'Berried', detail: `Hatching in ${approxDuration((r.carryingUntilHour ?? hour) - hour)}`, progress: prog };
    case 'spent':
      return { label: 'Spent after spawning', detail: 'Move her to her own tank to recover' };
    case 'resting':
      return { label: `Resting — ready again in ${approxDuration((r.stageEndsHour ?? hour) - hour)}`, progress: prog };
    case 'bonding':
      return { label: `Pair-bonding with ${pn}`, progress: clamp01((r.bond ?? 0) / 2) };
    case 'nest_preparing':
      return { label: `Preparing a nest site with ${pn}`, progress: prog };
    case 'transitioning_female':
      return { label: 'Becoming female', progress: prog };
    case 'transitioning_male':
      return { label: 'Becoming male', progress: prog };
    default: {
      const p = partner && isAlive(partner) && partner.tankId === c.tankId ? partner : undefined;
      return { label: 'Not breeding', detail: p ? `Paired with ${p.name} · readiness ${readiness}%` : readiness >= READY ? 'In breeding condition — needs a partner' : `Breeding readiness ${readiness}%` };
    }
  }
}

/** 0..1 progress of a clutch through its current stage. */
export function clutchProgress(state: GameState, clutchId: string): number {
  const cl = state.clutches[clutchId];
  if (!cl) return 0;
  const since = cl.stageSinceHour ?? cl.laidHour;
  const span = cl.nextStageHour - since;
  return span > 0 ? clamp01((state.clock.hour - since) / span) : 1;
}

export interface ClutchStatus {
  label: string;
  detail?: string;
  progress: number;
  /** Plain-language problems right now (predators, hunger, no nursery room…). */
  warnings: string[];
  /** Juveniles that will fit when these young grow up. */
  nurserySlots: number;
}

/** Status of a clutch for the UI (eggs / larvae / fry card). */
export function clutchStatus(state: GameState, clutchId: string): ClutchStatus | null {
  const cl = state.clutches[clutchId];
  if (!cl) return null;
  const sp = findSpecies(cl.speciesId);
  const tank = state.tanks[cl.tankId];
  if (!sp || !tank) return null;
  const mod = moduleFor(sp);
  const hour = state.clock.hour;
  const label = youngLabel(cl, mod);
  const warnings: string[] = [];
  const remaining = cl.nextStageHour - hour;
  let detail: string;
  if (cl.infertile) detail = cl.notes ?? 'These eggs won’t hatch here.';
  else if (cl.stage === 'in_pouch') detail = `Due in ${approxDuration(remaining)}`;
  else if (cl.stage === 'eggs') detail = cl.pendingEggs ? 'Still being laid' : remaining > 0 ? `Hatching in ${approxDuration(remaining)}` : mod.plan.hatchAtNight ? 'Hatching tonight after lights-out' : 'Hatching any moment';
  else {
    const ph = currentPhase(cl, mod);
    const last = mod.plan.phases[mod.plan.phases.length - 1] === ph;
    detail = last ? `Juveniles in ${approxDuration(remaining)}` : `Next stage in ${approxDuration(remaining)}`;
    if (ph && ph.foods.length && foodRecency(tank, ph.foods, hour, 10, 14) < 0.5 && (cl.fed ?? 1) < 0.6) warnings.push(`Hungry — offer ${ph.foods.slice(0, 2).map((f) => f.replace(/_/g, ' ')).join(' or ')}`);
  }
  if (!isCarried(cl) && !isNurseryFor(state, tank, hour) && sp.breeding.nurseryRequired) warnings.push('Adults share this tank — a nursery would save more of them');
  const slots = juvenileSlots(state, tank, sp, hour);
  if (cl.stage !== 'eggs' && cl.stage !== 'in_pouch' && slots < Math.min(cl.count, sp.breeding.maxRaisedPerClutch)) warnings.push(slots <= 0 ? 'No room left in this tank for juveniles' : `Room for only ${plural(slots, 'juvenile')} here`);
  return {
    label: `${plural(cl.count, label.replace(/s$/, ''), label)}`,
    detail,
    progress: clutchProgress(state, cl.id),
    warnings,
    nurserySlots: slots,
  };
}
