/**
 * Plain-language breeding status for creature and clutch cards. OWNER: lane "breeding".
 * PURE: never writes to state.
 */
import type { GameState } from '@/types';
import { findSpecies } from '@/data/species';
import { moduleFor } from './registry';
import type { StatusOut } from './types';
import { incidentRisks } from '@/sim/compat';
import { currentPhase, isCarried, predationInfo, youngLabel } from './clutch';
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
  makeTankInfo,
  plural,
  spPlural,
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
  // an animal that breeds alone (the living anemone splitting) does reproduce: the owner's wording (ADR-0052 decision 11)
  if (!mod.breedable) return { label: mod.asexual ? 'Splits by itself' : 'Not bred here', detail: mod.explain?.(sp) };
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
      // audit E15: plain words a child knows, not keepers' terms (conditioning, spermatophore, berried, spent…)
      return { label: 'Getting into breeding shape', detail: readiness >= READY ? 'In breeding condition' : `Breeding readiness ${readiness}%`, progress: clamp01(c.stats.breedingReadiness / 100) };
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
      return { label: 'Leaving sperm packets for her', detail: `${pn} is following`, progress: prog };
    case 'following':
      return { label: 'Picking up a sperm packet', progress: prog };
    case 'laying':
      return { label: 'Laying eggs', detail: cl ? `${plural(cl.count, 'egg')} so far` : undefined, progress: prog };
    case 'guarding': {
      if (!cl) return { label: 'Guarding' };
      if (cl.stage === 'eggs') return { label: `Guarding ${plural(cl.count, 'egg')}`, detail: `Hatching in ${approxDuration(cl.nextStageHour - hour)}`, progress: clutchProgress(state, cl.id) };
      if (cl.stage === 'larvae') return { label: `Tending ${plural(cl.count, 'larva', 'larvae')}`, detail: 'Returning strays to the nest', progress: clutchProgress(state, cl.id) };
      // audit E12: a cichlid pair herds its free-swimming fry and never eats them: no need to move either parent
      if (moduleFor(sp).plan.pairGuards) return { label: 'Fry are free-swimming', detail: 'The pair herd them and keep them safe', progress: 1 };
      return { label: 'Fry are free-swimming', detail: `Move ${c.name} out — his job is done`, progress: 1 };
    }
    case 'brooding':
      return { label: cl ? `Holding ${plural(cl.count, 'egg')} in his mouth` : 'Holding eggs in his mouth', detail: 'Won’t eat until the young are released', progress: prog };
    case 'pregnant': {
      const due = (r.carryingUntilHour ?? hour) - hour;
      return { label: due > 0 ? `Pregnant — due in ${approxDuration(due)}` : 'Pregnant — birth is imminent', detail: cl ? `Carrying about ${plural(cl.count, 'young', 'young')}` : undefined, progress: prog };
    }
    case 'berried':
      return { label: cl ? `Carrying ${plural(cl.count, 'egg')} under her tail` : 'Carrying eggs under her tail', detail: `Hatching in ${approxDuration((r.carryingUntilHour ?? hour) - hour)}`, progress: prog };
    case 'spent':
      return { label: 'Worn out after spawning', detail: 'Move her to her own tank to recover' };
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
  /**
   * audit E1/E2: nothing here eats these young or sweeps them away (a nursery with the parent still in it isn't safe;
   * a cichlid pair alone with its brood is).
   */
  safe: boolean;
  /** audit E3: "You can keep up to N young from this clutch…", when the clutch is bigger than that. */
  keepNote?: string;
  /** audit E25: due, but waits for the dark (a clownfish's or shark's eggs, a seahorse's birth). */
  waitsForDark: boolean;
}

/** Short list of names: "Atlas", "Atlas and Coral", "Atlas, Coral and 2 more". */
function nameList(n: string[]): string {
  if (n.length <= 1) return n[0] ?? '';
  if (n.length === 2) return `${n[0]} and ${n[1]}`;
  return `${n[0]}, ${n[1]} and ${n.length - 2} more`;
}

/**
 * chunk 17 — what a torch shone through a shark's egg case shows at this point of its incubation (Onimaru 2018 and
 * Choosri 2023, as fractions of the incubation: the sharks research's candling table).
 */
function candled(p: number): string {
  if (p < 0.08) return 'Candled: only the yolk so far';
  if (p < 0.2) return 'Candled: a tiny embryo twitching on the yolk';
  if (p < 0.4) return 'Candled: long feathery gills, and the tail is growing';
  if (p < 0.56) return 'Candled: the seams have opened and it pumps water through with its tail';
  if (p < 0.88) return 'Candled: its bands are showing';
  return 'Candled: the pup fills the case, its yolk nearly gone';
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
  // audit E25: a seahorse gives birth only after lights-out or at first light; a mouthbrooder releases them at once
  else if (cl.stage === 'in_pouch') detail = remaining > 0 ? `Due in ${approxDuration(remaining)}` : mod.id === 'seahorse_pouch' ? 'Due after lights-out or at first light' : 'Due any moment';
  else if (cl.stage === 'eggs' && cl.visual === 'egg_case' && remaining > 0) detail = `${candled(clutchProgress(state, cl.id))}. Hatching in ${approxDuration(remaining)}`;
  else if (cl.stage === 'eggs') detail = cl.pendingEggs ? 'Still being laid' : remaining > 0 ? `Hatching in ${approxDuration(remaining)}` : mod.plan.hatchAtNight ? 'Hatching tonight after lights-out' : 'Hatching any moment';
  else {
    const ph = currentPhase(cl, mod);
    const last = mod.plan.phases[mod.plan.phases.length - 1] === ph;
    detail = last ? `Juveniles in ${approxDuration(remaining)}` : `Next stage in ${approxDuration(remaining)}`;
    if (ph && ph.foods.length && foodRecency(tank, ph.foods, hour, 10, 14) < 0.5 && (cl.fed ?? 1) < 0.6) warnings.push(`Hungry — offer ${ph.foods.slice(0, 2).map((f) => f.replace(/_/g, ' ')).join(' or ')}`);
  }
  // audit E1/E2/E12: who actually eats them here (the sim's own rule: a cichlid pair spares its brood, a parent moved
  // into the nursery doesn't), not the tank's Nursery label or a head count of tank mates
  const carried = isCarried(cl);
  const nursery = isNurseryFor(state, tank, hour);
  let safe = true;
  if (!carried && !cl.infertile) {
    const info = makeTankInfo(state, tank, hour, () => {
      try {
        return (incidentRisks(state, tank.id) ?? []).filter((r) => r.youngOnly);
      } catch {
        return [];
      }
    });
    const pred = predationInfo(state, cl, tank, sp, mod, hour, info);
    const others = [...pred.others.keys()].map((id) => findSpecies(id)).filter((x): x is NonNullable<typeof x> => !!x);
    if (pred.guardianEating) {
      safe = false;
      warnings.push(`${pred.guardianEating.name} has started eating them — move ${pred.guardianEating.sex === 'female' ? 'her' : 'him'} out`);
    } else if (pred.p >= 0.05 && (pred.conspecific.length || others.length)) {
      safe = false;
      const who = [...pred.conspecific.map((c) => c.name), ...others.map((o) => `the ${spPlural(o)}`)];
      const one = who.length === 1 && pred.conspecific.length === 1;
      const what = cl.stage === 'eggs' ? 'the eggs' : 'the young';
      // in a nursery the eater was moved in with them: move it out; elsewhere the young go to a nursery
      const fix = nursery ? `move ${pred.conspecific.length === 1 && !others.length ? (pred.conspecific[0].sex === 'female' || pred.conspecific[0].reproRole === 'female' ? 'her' : 'him') : 'them'} out` : 'a nursery tank would keep them safe';
      warnings.push(`${nameList(who).replace(/^./, (ch) => ch.toUpperCase())} ${one ? 'eats' : 'eat'} ${what} here — ${fix}`);
    }
    if (mod.plan.planktonic && cl.stage !== 'eggs' && !nursery) {
      safe = false;
      warnings.push('They drift into the filter and tank mates’ mouths here — move them to a nursery tank');
    }
  }
  // audit E2: the room check, before it matters: the young that don't fit when they grow up are rehomed
  const slots = juvenileSlots(state, tank, sp, hour);
  if (!carried && !cl.infertile && slots < Math.min(cl.count, sp.breeding.maxRaisedPerClutch)) {
    warnings.push(slots <= 0 ? `No room in ${tank.name} for these young when they grow up — move them to a bigger or emptier tank` : `Room for only ${slots} of these when they grow up — move them to a bigger or emptier tank`);
  }
  // audit E3: the per-clutch cap (a game rule no screen showed): say it while the clutch is bigger than it
  const max = sp.breeding.maxRaisedPerClutch;
  const keepNote = !cl.infertile && cl.count > max ? `You can keep up to ${max} young from this clutch; the rest go to local hobbyists.` : undefined;
  const waitsForDark = remaining <= 0 && ((cl.stage === 'eggs' && !!mod.plan.hatchAtNight) || (cl.stage === 'in_pouch' && mod.id === 'seahorse_pouch'));
  return {
    label: `${plural(cl.count, label.replace(/s$/, ''), label)}`,
    detail,
    progress: clutchProgress(state, cl.id),
    warnings,
    nurserySlots: slots,
    safe,
    ...(keepNote ? { keepNote } : {}),
    waitsForDark,
  };
}
