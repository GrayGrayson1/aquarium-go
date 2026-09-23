/**
 * Data-parameterised pair spawner used by several systems. OWNER: lane "breeding".
 *
 *   conditioning ─▶ (female) gravid ─(spawn window + gates: cover / nest site / cave / cool cue / lid)─▶ courting
 *   ─▶ spawning ─▶ clutch ─▶ guardian: guarding | brooding (mouthbrooder carries the eggs) ; others: resting
 *
 * Gates come from `species.breeding.conditions` (needsCover, needsNestSite, coolingTrigger, minTempC…) plus the
 * config's site requirements, so the same code serves pea puffers, tetras, white clouds, medaka, corydoras,
 * bristlenose plecos, Banggai cardinals and mystery snails with species-appropriate text.
 */
import type { Clutch, Creature, GameState, SpeciesDefinition, Tank } from '@/types';
import type { SimContext } from '@/sim/context';
import type { BreedingModule, CheckCtx, RearingPlan, StepEnv, StatusOut } from '../types';
import { createClutch, releaseCarried } from '../clutch';
import {
  COVER_FOR_SPAWNING,
  addHistory,
  approxDuration,
  coolCueActive,
  ensureEnv,
  guardianOf,
  habitatOf,
  hasCave,
  hasNestSite,
  inSpawnWindow,
  isMature,
  isReady,
  pairUp,
  pickSite,
  plural,
  rollClutchSize,
  roleOf,
  say,
  setStage,
  spName,
  spPlural,
  stageDue,
  startResting,
  throttleTank,
  throttleTankBackoff,
  toastWorthy,
  tickTimers,
  type SiteKind,
  type SpawnWindow,
} from '../common';
import { bumpCounter } from '@/sim/facility';
import { getSpecies } from '@/data/species';

export interface Gate {
  ok: boolean;
  reason?: string;
  step?: string;
}

export interface PairSpawnerConfig {
  id: BreedingModule['id'];
  plan: RearingPlan;
  window: SpawnWindow;
  courtHours: [number, number];
  spawnHours: [number, number];
  spawnStage: string;
  guardStage: string;
  visual: Clutch['visual'];
  site: SiteKind;
  /** Extra anchors for scattered eggs. */
  extraSites: number;
  /** Clutch carried by the guardian (mouthbrooder): stage 'in_pouch', released by this module. */
  carried?: boolean;
  /** Male rest after spawning as a fraction of cooldownDays. */
  maleRestFrac: number;
  /** Extra species/system gates beyond the data conditions. */
  gate?(state: GameState, tank: Tank, sp: SpeciesDefinition): Gate;
  /** Eggs that can never hatch here (flavour text) — e.g. nerite eggs in freshwater. */
  infertile?(sp: SpeciesDefinition, tank: Tank): string | null;
  text: {
    court(m: Creature, f: Creature, sp: SpeciesDefinition): string;
    spawn(m: Creature, f: Creature, sp: SpeciesDefinition, n: number, tank: Tank, guardian: Creature | null): string;
    release?(g: Creature, n: number, sp: SpeciesDefinition): string;
  };
  status?(state: GameState, c: Creature, sp: SpeciesDefinition, hour: number): StatusOut | null;
}

/** Data-driven gates shared by every pair spawner. */
export function dataGates(state: GameState, tank: Tank, sp: SpeciesDefinition, cfg: PairSpawnerConfig, hour: number): Gate {
  const cond = sp.breeding.conditions;
  const hab = habitatOf(state, tank);
  if (cond.needsCover && hab.cover < COVER_FOR_SPAWNING) {
    return { ok: false, reason: `${spPlural(sp)[0].toUpperCase()}${spPlural(sp).slice(1)} only spawn in dense cover (plants or moss) — cover here is ${Math.round(hab.cover * 100)}%.`, step: 'Add dense plants or a clump of moss to give them somewhere to spawn.' };
  }
  if (cond.needsNestSite) {
    const ok = cfg.site === 'cave' ? hasCave(tank, hab) || hasNestSite(tank, hab) : hasNestSite(tank, hab);
    if (!ok) return { ok: false, reason: cfg.site === 'cave' ? 'There is no cave for the male to claim.' : 'There is no flat rock or tile to lay eggs on.', step: cfg.site === 'cave' ? 'Add a cave or spawning tube.' : 'Add a flat stone or rock near their favourite spot.' };
  }
  if (cond.coolingTrigger && !coolCueActive(tank, hour)) {
    return { ok: false, reason: 'They are waiting for a seasonal cue.', step: 'A cool water change (~2 °C cooler) often triggers spawning.' };
  }
  if (cond.minTempC !== undefined && tank.water.tempC < cond.minTempC - 0.5) {
    return { ok: false, reason: `The water is too cool to spawn (needs ${cond.minTempC} °C+).`, step: `Warm the tank to about ${cond.minTempC + 1} °C.` };
  }
  if (cond.maxTempC !== undefined && tank.water.tempC > cond.maxTempC + 0.5) {
    return { ok: false, reason: `The water is too warm to spawn (needs ≤ ${cond.maxTempC} °C).`, step: `Cool the tank below ${cond.maxTempC} °C.` };
  }
  return cfg.gate ? cfg.gate(state, tank, sp) : { ok: true };
}

export function makePairSpawner(cfg: PairSpawnerConfig): BreedingModule {
  const mod: BreedingModule = {
    id: cfg.id,
    breedable: true,
    plan: cfg.plan,
    step: (env) => stepPairs(env, cfg, mod),
    check: (cc) => checkPair(cc, cfg),
    start(state, male, female, tank, hour) {
      pairUp(male, female);
      for (const c of [male, female]) if (c.repro.stage === 'idle') setStage(c, 'conditioning', hour);
      const g = dataGates(state, tank, getSpecies(female.speciesId), cfg, hour);
      return g.ok ? `${male.name} and ${female.name} are together — watch for courtship.` : `${male.name} and ${female.name} are together. ${g.step ?? g.reason ?? ''}`.trim();
    },
    force(state, male, female, tank, hour) {
      const sp = getSpecies(female.speciesId);
      if (sp.breeding.conditions.coolingTrigger) {
        const env = ensureEnv(tank, hour);
        env.coolCueUntilHour = hour + 48;
      }
      pairUp(male, female);
      setStage(male, 'courting', hour, hour + 0.5);
      setStage(female, 'courting', hour, hour + 0.5);
      return `${male.name} and ${female.name} are courting.`;
    },
    status: (state, c, sp, hour) => statusFor(state, c, sp, hour, cfg),
  };
  return mod;
}

function stepPairs(env: StepEnv, cfg: PairSpawnerConfig, mod: BreedingModule): void {
  const { state, tank, species: sp, members, hour, ctx } = env;
  const b = sp.breeding;
  const adults = members.filter((c) => isMature(c, sp, hour));
  for (const c of adults) tickTimers(c, hour);
  const herm = sp.sexSystem === 'simultaneous_hermaphrodite';
  const males = adults.filter((c) => (herm ? true : roleOf(c, sp) === 'male'));
  const females = adults.filter((c) => (herm ? true : roleOf(c, sp) === 'female'));
  const byId = new Map(adults.map((c) => [c.id, c] as const));

  // Ongoing events (female side drives; herm pairs: whichever holds the 'female' flag = lower id).
  for (const f of females) {
    const st = f.repro.stage;
    if (st !== 'courting' && st !== cfg.spawnStage) continue;
    const m = f.repro.partnerId ? byId.get(f.repro.partnerId) : undefined;
    if (!m || m.repro.stage !== st) {
      setStage(f, isReady(f) ? 'gravid' : 'conditioning', hour);
      continue;
    }
    if (herm && f.id > m.id) continue;
    if (!stageDue(f, hour)) continue;
    if (st === 'courting') {
      const end = hour + ctx.rng.range(cfg.spawnHours[0], cfg.spawnHours[1]);
      setStage(f, cfg.spawnStage, hour, end);
      setStage(m, cfg.spawnStage, hour, end);
    } else spawn(state, tank, sp, m, f, hour, ctx, cfg);
  }
  // Males left in courtship without a partner.
  for (const m of males) {
    const st = m.repro.stage;
    if (st !== 'courting' && st !== cfg.spawnStage) continue;
    const f = m.repro.partnerId ? byId.get(m.repro.partnerId) : undefined;
    if (!f || f.repro.stage !== st) setStage(m, 'conditioning', hour);
  }

  // Guardians.
  for (const g of adults) {
    if (g.repro.stage !== cfg.guardStage) continue;
    const cl = g.repro.clutchId ? state.clutches[g.repro.clutchId] : undefined;
    if (cfg.carried && cl && cl.stage === 'in_pouch' && cl.guardedById === g.id) {
      g.repro.carryingUntilHour = cl.nextStageHour;
      if (hour >= cl.nextStageHour) {
        releaseCarried(cl, tank, sp, mod, hour);
        startResting(g, hour, b.cooldownDays * 24 * cfg.maleRestFrac);
        addHistory(g, 'bred', `Released ${plural(cl.count, 'youngster')} from his mouth.`, hour);
        say(state, ctx, { kind: 'breeding', text: cfg.text.release?.(g, cl.count, sp) ?? `${g.name} released ${plural(cl.count, 'tiny youngster')}!`, tankId: tank.id, creatureId: g.id, toast: true });
      }
      continue;
    }
    if (!cl || cl.tankId !== g.tankId || cl.guardedById !== g.id) {
      if (cl && cl.guardedById === g.id) cl.guardedById = undefined;
      startResting(g, hour, b.cooldownDays * 24 * cfg.maleRestFrac);
    }
  }

  // Labels.
  for (const f of females) {
    if (f.repro.stage === 'idle' || f.repro.stage === 'conditioning') {
      if (isReady(f)) setStage(f, 'gravid', hour);
      else if (f.repro.stage === 'idle' && males.some((m) => m !== f)) setStage(f, 'conditioning', hour);
    } else if (f.repro.stage === 'gravid' && f.stats.breedingReadiness < 45) setStage(f, 'conditioning', hour);
  }
  if (!herm) for (const m of males) if (m.repro.stage === 'idle' && females.length) setStage(m, 'conditioning', hour);

  // New courtships.
  if (!inSpawnWindow(tank, hour, cfg.window)) return;
  const candidates = females.filter((f) => f.repro.stage === 'gravid');
  if (!candidates.length) return;
  const gate = dataGates(state, tank, sp, cfg, hour);
  if (!gate.ok) {
    if (males.some((m) => isReady(m) && !candidates.includes(m)) && throttleTankBackoff(tank, `gate_${sp.id}`, hour, 36)) {
      say(state, ctx, { kind: 'tip', text: `${gate.reason ?? 'Conditions aren’t right for spawning.'} ${gate.step ?? ''}`.trim(), tankId: tank.id });
    }
    return;
  }
  const free = males.filter((m) => isReady(m) && (m.repro.stage === 'conditioning' || m.repro.stage === 'idle' || (herm && m.repro.stage === 'gravid')));
  for (const f of candidates) {
    if (f.repro.stage !== 'gravid') continue;
    const pool = free.filter((m) => m !== f && m.repro.stage !== 'courting');
    const m = pool.find((x) => x.id === f.repro.partnerId) ?? [...pool].sort((x, y) => y.stats.breedingReadiness - x.stats.breedingReadiness)[0];
    if (!m) break;
    pairUp(m, f);
    const end = hour + ctx.rng.range(cfg.courtHours[0], cfg.courtHours[1]);
    setStage(m, 'courting', hour, end);
    setStage(f, 'courting', hour, end);
    const key = `court_${sp.id}`;
    const seen = state.progress.counters[key] ?? 0;
    bumpCounter(state, key);
    say(state, ctx, { kind: 'breeding', text: cfg.text.court(m, f, sp), tankId: tank.id, creatureId: m.id, toast: seen < 3 });
  }
}

function spawn(state: GameState, tank: Tank, sp: SpeciesDefinition, m: Creature, f: Creature, hour: number, ctx: SimContext, cfg: PairSpawnerConfig): void {
  const b = sp.breeding;
  const n = rollClutchSize(ctx.rng, sp, f);
  const guardian = guardianOf(sp, m, f);
  const infertile = cfg.infertile?.(sp, tank) ?? null;
  const carried = !!cfg.carried && !!guardian;
  const site = carried ? null : pickSite(tank, infertile ? 'rock' : cfg.site, `${f.id}:${hour.toFixed(1)}`, infertile ? 5 : cfg.extraSites);
  const cl = createClutch(state, {
    sp,
    tank,
    mother: f,
    father: m,
    hour,
    stage: carried ? 'in_pouch' : 'eggs',
    count: n,
    visual: carried ? 'pouch' : infertile ? 'eggs_adhesive' : cfg.visual,
    nextStageHour: hour + (infertile ? Math.max(48, b.incubationHours * 3) : b.incubationHours),
    anchor: site?.anchor,
    extraAnchors: site?.extra,
    guardedById: guardian && !infertile ? guardian.id : undefined,
    infertile: !!infertile,
    notes: infertile ?? undefined,
  });
  for (const p of [m, f]) {
    if (guardian && p === guardian && !infertile) {
      setStage(p, cfg.guardStage, hour);
      p.repro.clutchId = cl.id;
      if (carried) p.repro.carryingUntilHour = cl.nextStageHour;
    } else startResting(p, hour, b.cooldownDays * 24 * (p === m ? cfg.maleRestFrac : 1));
  }
  say(state, ctx, { kind: 'breeding', text: cfg.text.spawn(m, f, sp, n, tank, infertile ? null : guardian), tankId: tank.id, creatureId: f.id, toast: toastWorthy(state, sp, 'spawn') });
  if (infertile && throttleTank(tank, `infertile_${sp.id}`, hour, 24 * 7)) say(state, ctx, { kind: 'info', text: infertile, tankId: tank.id });
}

function checkPair(cc: CheckCtx, cfg: PairSpawnerConfig): void {
  const { state, tank, sp, hour } = cc;
  if (!tank) return;
  const g = dataGates(state, tank, sp, cfg, hour);
  if (!g.ok) {
    if (g.reason) cc.reasons.push(g.reason);
    if (g.step) cc.steps.push(g.step);
  }
  const inf = cfg.infertile?.(sp, tank);
  if (inf) cc.steps.push(inf);
  if (cfg.window !== 'any' && !inSpawnWindow(tank, hour, cfg.window)) {
    const when = { morning: 'in the morning, soon after the lights come on', dawn: 'at dawn', evening: 'in the evening', night: 'at night' }[cfg.window];
    cc.steps.push(`${spPlural(sp)[0].toUpperCase()}${spPlural(sp).slice(1)} usually spawn ${when}.`);
  }
  // Group composition advice (harems / shoals).
  const inTank = Object.values(state.creatures).filter((c) => c.tankId === tank.id && c.speciesId === sp.id && isMature(c, sp, hour));
  const males = inTank.filter((c) => roleOf(c, sp) === 'male').length;
  const females = inTank.filter((c) => roleOf(c, sp) === 'female').length;
  if ((sp.social.kind === 'harem' || sp.social.kind === 'shoal' || sp.social.kind === 'school') && males > females && females > 0) {
    cc.steps.push(`More males than females causes chasing — aim for one male to two or three female ${spPlural(sp)}.`);
  }
}

function statusFor(state: GameState, c: Creature, sp: SpeciesDefinition, hour: number, cfg: PairSpawnerConfig): StatusOut | null {
  const own = cfg.status?.(state, c, sp, hour);
  if (own) return own;
  const cl = c.repro.clutchId ? state.clutches[c.repro.clutchId] : undefined;
  if (c.repro.stage === cfg.guardStage && cfg.carried && cl) {
    return { label: `Mouthbrooding ${plural(cl.count, 'egg')}`, detail: `He won’t eat until they’re released (${approxDuration(cl.nextStageHour - hour)})`, progress: c.repro.progress };
  }
  if (c.repro.stage === cfg.spawnStage && cfg.spawnStage !== 'spawning') {
    const p = c.repro.partnerId ? state.creatures[c.repro.partnerId] : undefined;
    return { label: `Spawning${p ? ` with ${p.name}` : ''}`, progress: c.repro.progress };
  }
  return null;
}

/** Shared text helpers for configs. */
export const TEXT = {
  genericCourt: (m: Creature, f: Creature, sp: SpeciesDefinition) => `${m.name} is courting ${f.name} — the ${spName(sp)} pair are displaying to each other.`,
  genericSpawn: (m: Creature, f: Creature, sp: SpeciesDefinition, n: number, tank: Tank, guardian: Creature | null) =>
    `${f.name} and ${m.name} spawned — ${plural(n, 'egg')}!${guardian ? ` ${guardian.name} is guarding them.` : ` Adults eat eggs, so move them to a nursery tank.`}`,
};
