/**
 * egg_case — the bottom sharks (coral catshark, epaulette, brown-banded bamboo shark). Chunk 17 (ADR-0053; the sharks
 * research, docs/research/marine.md "Cross-species notes (the bottom sharks)"). OWNER: lane "breeding".
 *
 *   a pair at night: courting (the male grips her by a fin) ─▶ she lays 1–2 leathery egg cases ─▶ resting
 *   (cooldownDays: the laying cycle) ─▶ lays again…
 *
 * The pair spawner runs the pair; this module adds what is particular to egg cases:
 * - About half the cases a mated female lays are duds (Harahush 2007: 33 % viable; Payne 2012: 48 % hatched). A dud
 *   is laid like any case (its own clutch beside the good ones), never hatches and rots away, adding a little waste
 *   while it lies there (clutch.ts), unless the keeper lifts it out (`liftOutClutch`).
 * - A female with no male still lays on schedule (Wheeler 2025), and every case is empty.
 * - Incubation is the species' (real days × 8, the owner's round 2), about 4.6 % shorter per °C above 26 °C and longer
 *   below (Wheeler 2021: 125 days at 27 °C, 101 at 31), set from the water when she lays.
 * - No parental care; adults and other egg eaters take about half the cases in a mixed tank (the species'
 *   predationWithoutNursery, decided case by case in clutch.ts); a case hatches at night (Wheeler 2021: 25 of 27 in the dark) into a juvenile, newly
 *   hatched, that lives on its yolk and then eats chopped seafood.
 * The catshark and bamboo shark lay theirs loose on the sand, the epaulette ties them to rock.
 * Draws on the step's `ctx.rng` only in a tank with a ready female shark.
 */
import type { SpeciesDefinition, Tank } from '@/types';
import type { BreedingModule, StepEnv } from '../types';
import { createClutch } from '../clutch';
import { makePairSpawner, dataGates, type PairSpawnerConfig } from './pairSpawner';
import { approxDuration, inSpawnWindow, isMature, isReady, pickSite, plural, roleOf, rollClutchSize, say, spPlural, startResting, toastWorthy } from '../common';

/** Share of a mated female's cases that are fertile and develop. */
export const EGG_CASE_FERTILE = 0.45;
/** Incubation change per °C away from 26 °C (shorter when warmer). */
const PER_DEG = 0.046;
const REF_TEMP_C = 26;
/** A dud lies this share of the species' incubation before it has rotted away (its waste: clutch.ts). */
const DUD_FRAC = 0.25;

/** Laid loose on the sand (catshark, bamboo shark) or tied to rock (epaulette). */
const onSand = (sp: SpeciesDefinition) => sp.genus !== 'Hemiscyllium';
/** Where a species' egg cases lie: on the sand, or tied to the rock (the epaulette). The lab places them the same way. */
export const eggCaseSite = (sp: SpeciesDefinition): 'floor' | 'rock' => (onSand(sp) ? 'floor' : 'rock');
const where = (sp: SpeciesDefinition) => (onSand(sp) ? 'on the sand' : 'tied to the rock');

/** Game hours a case laid now in this tank takes to hatch. */
export function eggCaseIncubation(sp: SpeciesDefinition, tank: Tank): number {
  const t = Number.isFinite(tank.water.tempC) ? tank.water.tempC : REF_TEMP_C;
  const f = Math.min(1.25, Math.max(0.75, 1 - PER_DEG * (t - REF_TEMP_C)));
  return sp.breeding.incubationHours * f;
}

const cfg: PairSpawnerConfig = {
  id: 'egg_case',
  plan: {
    // the young hatch straight into juveniles, newly hatched
    phases: [],
    eggTags: ['eggs'],
    youngTags: ['fry'],
    parentsEatEggs: true,
    guardEggs: false,
    guardianEatsFry: false,
    planktonic: false,
    hatchAtNight: true,
    larvaeViable: true,
    starveSeverity: 0.6,
    coverShelter: 0.3,
    yolkFrac: 1,
    bornAgeDays: 0.5,
  },
  window: 'night',
  courtHours: [1, 3],
  spawnHours: [0.5, 1.5],
  spawnStage: 'spawning',
  guardStage: 'guarding',
  visual: 'egg_case',
  site: 'rock',
  layOf: (sp) => (onSand(sp) ? { site: 'floor', visual: 'egg_case' } : null),
  extraSites: 1,
  maleRestFrac: 0.5,
  fertile(rng, n) {
    let k = 0;
    for (let i = 0; i < n; i++) if (rng.next() < EGG_CASE_FERTILE) k++;
    return k;
  },
  incubation: eggCaseIncubation,
  dudHours: (sp) => Math.max(48, sp.breeding.incubationHours * DUD_FRAC),
  text: {
    court: (m, f) => `${m.name} is following ${f.name} over the floor and gripping her by a fin: the sharks are mating.`,
    spawn: (m, f, sp, n, tank, guardian, duds = 0) =>
      duds >= n
        ? `${f.name} laid ${plural(n, 'egg case')} ${where(sp)}, but ${n === 1 ? 'it is a dud' : 'both are duds'}: not every case is fertile. Lift duds out, or they rot.`
        : `${f.name} laid ${plural(n, 'egg case')} ${where(sp)}.${duds > 0 ? ' One is a dud, with no embryo inside.' : ''} A case takes about ${approxDuration(eggCaseIncubation(sp, tank)).replace(/^~/, '')} to hatch, and tankmates eat them: a nursery tank keeps them safe.`,
    dudNotes: (f, sp, n) => `${n === 1 ? 'A dud' : 'Duds'}: no embryo inside. Lift ${n === 1 ? 'it' : 'them'} out, or ${n === 1 ? 'it rots' : 'they rot'}.`,
  },
};

const pair = makePairSpawner(cfg);

/** A female with no mature male lays on schedule anyway, and every case is empty. */
function layAlone(env: StepEnv): void {
  const { state, tank, species: sp, members, hour, ctx } = env;
  const adults = members.filter((c) => isMature(c, sp, hour));
  if (adults.some((c) => roleOf(c, sp) === 'male')) return;
  if (!inSpawnWindow(tank, hour, 'night')) return;
  for (const f of adults) {
    if (roleOf(f, sp) !== 'female' || f.repro.stage !== 'gravid' || !isReady(f)) continue;
    if (!dataGates(state, tank, sp, cfg, hour).ok) return;
    const n = rollClutchSize(ctx.rng, sp, f);
    const site = pickSite(tank, eggCaseSite(sp), `${f.id}:${hour.toFixed(1)}`, cfg.extraSites);
    const text = `${f.name} laid ${plural(n, 'egg case')} ${where(sp)}, but with no male in the tank ${n === 1 ? 'it is' : 'they are'} empty. Lift ${n === 1 ? 'it' : 'them'} out, or ${n === 1 ? 'it rots' : 'they rot'}.`;
    createClutch(state, {
      sp,
      tank,
      mother: f,
      father: null,
      hour,
      stage: 'eggs',
      count: n,
      visual: 'egg_case',
      nextStageHour: hour + (cfg.dudHours?.(sp) ?? 48),
      anchor: site.anchor,
      extraAnchors: site.extra,
      infertile: true,
      notes: cfg.text.dudNotes?.(f, sp, n),
    });
    startResting(f, hour, sp.breeding.cooldownDays * 24);
    say(state, ctx, { kind: 'info', text, tankId: tank.id, creatureId: f.id, toast: toastWorthy(state, sp, 'lone_case') });
  }
}

export const eggCaseModule: BreedingModule = {
  ...pair,
  explain: (sp) => `${spPlural(sp)[0].toUpperCase()}${spPlural(sp).slice(1)} lay leathery egg cases that hatch months later as independent pups.`,
  step(env) {
    pair.step(env);
    layAlone(env);
  },
};
