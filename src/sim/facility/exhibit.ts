/**
 * Exhibit scoring: how good a tank is as a public display. OWNER: lane "facility".
 *
 * Original model (not derived from any other game): ten 0..1 factors are blended by weight, then gated by welfare
 * so that rarity or size can never beat a healthy, beautiful tank. Size uses a logarithmic curve (diminishing
 * returns), which is why a gorgeous, ethical 20-gallon display can outscore a messy 1,000-gallon tank.
 */
import type { Creature, ExhibitReport, GameState, Rarity, Tank } from '@/types';
import { findSpecies } from '@/data/species';
import { getTankTier } from '@/data/catalog/tanks';
import { creaturesInTank } from '../life';
import { hourOfDay, lightsOn } from '../time';
import { showsExhibitBoost } from '../shows/titles'; // lane:shows

export type ExhibitFactorKey = 'beauty' | 'welfare' | 'activity' | 'charisma' | 'rarity' | 'variety' | 'behaviour' | 'signage' | 'clarity' | 'size';

export const EXHIBIT_WEIGHTS: Record<ExhibitFactorKey, number> = {
  beauty: 0.24,
  welfare: 0.18,
  activity: 0.14,
  charisma: 0.14,
  rarity: 0.06,
  variety: 0.05,
  behaviour: 0.06,
  signage: 0.04,
  clarity: 0.06,
  size: 0.07,
};

const FACTOR_LABELS: Record<ExhibitFactorKey, string> = {
  beauty: 'Beauty',
  welfare: 'Welfare',
  activity: 'Visible activity',
  charisma: 'Species charisma',
  rarity: 'Rarity',
  variety: 'Coherent variety',
  behaviour: 'Behaviour moments',
  signage: 'Educational sign',
  clarity: 'Clean, clear water',
  size: 'Size',
};

const RARITY_VALUE: Record<Rarity, number> = { common: 0.12, uncommon: 0.32, rare: 0.55, very_rare: 0.8, legendary: 1 };

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);

export interface ExhibitInfo {
  tankId: string;
  /** 0..100 */
  score: number;
  factors: Record<ExhibitFactorKey, number>;
  /** 0.2..1 multiplier applied for poor welfare. */
  welfareGate: number;
  /** Sick / stressed / suffering animals are visible — visitors will be concerned. */
  concerned: boolean;
  concernText?: string;
  /** The animal visitors are worried about (unwell first, then starving) — reaction lines name this one, not the star. */
  concernCreature?: Creature;
  empty: boolean;
  speciesIds: string[];
  groups: string[];
  /** Species with the most individuals (for fatigue + reactions). */
  mainSpeciesId: string | null;
  /** Most charismatic individual (for reaction lines). */
  star: Creature | null;
  /** Recent rare behaviour visitors can witness — `text` is a noun phrase ("a bubble nest", "newly hatched fry"). */
  moment: { text: string; creatureId?: string } | null;
  gallons: number;
  /** Expected visitors/hour contribution before reputation & price. */
  appeal: number;
  /** Educational value 0..1 (signage × species story). */
  education: number;
  /** Conservation story strength 0..1. */
  conservation: number;
  /** lane:shows — why award winners make this exhibit more appealing (exhibit report note). */
  awardNote?: string;
}

/** Diminishing-returns size curve: 5 gal ≈ 0.12, 20 ≈ 0.35, 55 ≈ 0.52, 125 ≈ 0.65, 300 ≈ 0.8, 1000 = 1. */
export function sizeFactor(gallons: number): number {
  return clamp01(Math.log(Math.max(2.5, gallons) / 2.5) / Math.log(400));
}

/**
 * What a breeding log line lets visitors see, as a noun phrase for the reaction templates ("Is that {moment}?").
 * Ordered most-specific first. Lines that describe nothing visible (a seasonal cool-down, a group's new male) are not
 * moments: they must not inflate the exhibit's behaviour factor or the wow rate.
 */
const MOMENT_PHRASES: [RegExp, string][] = [
  [/free-swimming|hatched|larva|newborn|dropped .*fry|released|youngster|were born|\bborn\b/i, 'newly hatched fry'],
  [/bubble nest/i, 'a bubble nest'],
  [/\bfry\b|growing well/i, 'a cloud of fry'],
  [/pouch|pregnan/i, 'a pregnant male'],
  [/berried|carrying eggs/i, 'a berried female'],
  [/laying|egg tube|finished laying|clutch|spawning embrace|\bspawn(ed|ing)?\b|eggs/i, 'a fresh clutch of eggs'],
  [/dancing|dance|waltz|courting|courtship|greet|circling|entwined/i, 'a courtship dance'],
  [/nipping|cleaning a patch|spermatophore/i, 'a pair preparing to spawn'],
  [/bonded pair|accepted .* as her partner|sticking close/i, 'a newly bonded pair'],
  [/\bnest\b/i, 'a nest'],
];

export function momentPhrase(text: string): string | null {
  for (const [re, phrase] of MOMENT_PHRASES) if (re.test(text)) return phrase;
  return null;
}

function recentMoment(state: GameState, tank: Tank, now: number): ExhibitInfo['moment'] {
  // breeding events in the log (births, eggs, nests) within the last 2 game days
  for (let i = state.log.length - 1; i >= 0; i--) {
    const e = state.log[i];
    if (now - e.hour > 48) break;
    if (e.tankId !== tank.id) continue;
    if (e.kind === 'breeding' || e.kind === 'celebrate') {
      const phrase = momentPhrase(e.text);
      if (phrase) return { text: phrase, creatureId: e.creatureId };
    }
  }
  // visible clutches (bubble nests, egg strands, a pregnant seahorse's pouch)
  for (const cl of Object.values(state.clutches ?? {})) {
    if (cl.tankId !== tank.id) continue;
    const what =
      cl.visual === 'bubble_nest'
        ? 'a bubble nest'
        : cl.visual === 'pouch'
          ? 'a pregnant male'
          : cl.visual === 'fry_cloud'
            ? 'a cloud of fry'
            : cl.visual === 'berried'
              ? 'a berried female'
              : 'a clutch of eggs';
    return { text: `${what}`, creatureId: cl.guardedById ?? cl.fatherId ?? undefined };
  }
  return null;
}

function visibility(c: Creature, day: boolean): number {
  const sp = findSpecies(c.speciesId);
  if (!sp) return 0.5;
  if (c.lifeStage === 'egg' || c.lifeStage === 'larva') return 0;
  if (sp.category === 'coral' || sp.category === 'anemone') return 0.3;
  const tr = sp.behaviorTraits;
  let v = 0.55 + (sp.activeSwimmer ? 0.22 : 0) + 0.2 * (tr?.curiosity ?? 0.3);
  if ((tr?.burrowing ?? 0) > 0.5) v *= 0.65;
  if (day) v *= 1 - 0.55 * (tr?.nocturnal ?? 0);
  else v *= 0.45 + 0.55 * (tr?.nocturnal ?? 0);
  for (const p of c.personality ?? []) {
    if (p === 'bold' || p === 'showoff' || p === 'glass_curious') v += 0.12;
    if (p === 'shy' || p === 'easily_startled' || p === 'homebody') v -= 0.12;
  }
  if (c.sizeCm < 2) v *= 0.6;
  else if (c.sizeCm < 4) v *= 0.85;
  if ((c.stats?.stress ?? 0) > 70) v *= 0.6;
  if (c.lifeStage === 'fry') v *= 0.5;
  return Math.max(0, v);
}

function morphRarity(c: Creature): number {
  const sp = findSpecies(c.speciesId);
  if (!sp || !c.morphName) return 0;
  let best = 0;
  for (const ph of sp.genetics?.phenotypes ?? []) {
    if (ph.rarity > best && c.morphName.toLowerCase().includes(ph.name.toLowerCase())) best = ph.rarity;
  }
  return best;
}

export function exhibitInfo(state: GameState, tank: Tank): ExhibitInfo {
  const now = state.clock.hour;
  const creatures = creaturesInTank(state, tank.id).filter((c) => c.status === 'alive' || c.status === 'listed');
  let gallons = 10;
  try {
    gallons = getTankTier(tank.tierId).gallons;
  } catch {
    /* unknown tier */
  }
  const day = lightsOn(tank.lighting?.onHour ?? 7, tank.lighting?.offHour ?? 22, now) && hourOfDay(now) > 6;

  // species tallies
  const bySpecies = new Map<string, number>();
  const groups = new Set<string>();
  let appealMax = 0;
  let appealSum = 0;
  let rarityMax = 0;
  let visSum = 0;
  let sick = 0;
  let suffering = 0;
  let conservation = 0;
  let star: Creature | null = null;
  let starScore = -1;
  for (const c of creatures) {
    bySpecies.set(c.speciesId, (bySpecies.get(c.speciesId) ?? 0) + 1);
    const sp = findSpecies(c.speciesId);
    const appeal = sp?.visitorAppeal ?? 0.5;
    if (sp) groups.add(sp.group);
    appealMax = Math.max(appealMax, appeal);
    appealSum += appeal;
    const r = sp ? RARITY_VALUE[sp.rarity] ?? 0.1 : 0.1;
    rarityMax = Math.max(rarityMax, Math.min(1, r + morphRarity(c) * 0.45));
    const v = visibility(c, day);
    visSum += v;
    const st = c.stats;
    if (c.illness || (st && (st.health < 45 || st.stress > 78))) sick++;
    // Same line as the tank status: a starving animal (hunger ≥ 90) is suffering, and visitors notice.
    if (st && (st.health < 25 || st.hunger >= 90)) suffering++;
    if (sp?.conservation?.status && !/least concern|not evaluated|domesticated/i.test(sp.conservation.status)) conservation = Math.max(conservation, 0.8);
    else conservation = Math.max(conservation, 0.35);
    const s = appeal * (0.6 + v) + (c.isStarter ? 0.15 : 0) + (c.visitorWows ?? 0) * 0.002 + (c.awards?.titles?.length ?? 0) * 0.1; // lane:shows: titled animals star
    if (s > starScore) {
      starScore = s;
      star = c;
    }
  }
  const n = creatures.length;
  const empty = n === 0;

  // factors
  const welfareBase = clamp01((tank.cache?.welfare ?? 70) / 100);
  const sickFrac = n ? sick / n : 0;
  let welfare = welfareBase * (1 - 0.5 * sickFrac) * (tank.cache?.status === 'danger' ? 0.75 : 1);
  if (tank.cache?.compatVerdict === 'incompatible') welfare *= 0.7;
  else if (tank.cache?.compatVerdict === 'high_risk') welfare *= 0.85;
  welfare = clamp01(welfare);

  const beauty = clamp01((tank.cache?.beauty ?? 40) / 100);
  const activity = empty ? 0 : clamp01(1 - Math.exp(-(visSum + 0.3) / 1.5));
  // lane:shows — award-winning animals and a prize-winning layout draw a little more interest.
  const award = empty ? { boost: 0, note: undefined } : showsExhibitBoost(state, tank.id, creatures);
  const charisma = empty ? 0 : clamp01(appealMax * 0.65 + (appealSum / n) * 0.35 + award.boost);
  const rarity = empty ? 0 : clamp01(rarityMax);
  const coherence: Record<string, number> = { excellent: 1, usually_compatible: 0.95, conditional: 0.8, high_risk: 0.5, incompatible: 0.25 };
  const s = bySpecies.size;
  const variety = s === 0 ? 0 : clamp01(Math.min(1, 0.45 + 0.17 * (s - 1)) * (coherence[tank.cache?.compatVerdict ?? 'excellent'] ?? 1));
  const moment = empty ? null : recentMoment(state, tank, now);
  let specialCount = 0;
  for (const id of bySpecies.keys()) specialCount = Math.max(specialCount, findSpecies(id)?.specialBehaviors?.length ?? 0);
  const behaviour = moment ? 1 : clamp01(0.18 + 0.045 * specialCount);
  const signage = tank.signage ? 1 : 0;
  const w = tank.water;
  const clarity = clamp01((w?.clarity ?? 1) * (1 - (w?.algae ?? 0) / 160) * (1 - (w?.detritus ?? 0) / 250));
  const size = sizeFactor(gallons);

  const factors: Record<ExhibitFactorKey, number> = { beauty, welfare, activity, charisma, rarity, variety, behaviour, signage, clarity, size };
  let num = 0;
  let den = 0;
  for (const k of Object.keys(EXHIBIT_WEIGHTS) as ExhibitFactorKey[]) {
    num += EXHIBIT_WEIGHTS[k] * factors[k];
    den += EXHIBIT_WEIGHTS[k];
  }
  const raw = den > 0 ? num / den : 0;
  // Welfare gate: a suffering exhibit cannot be rescued by rarity, size or beauty.
  const welfareGate = empty ? 1 : Math.max(0.2, Math.min(1, (welfare - 0.3) / 0.4));
  const score = Math.round(Math.max(0, Math.min(100, 100 * raw * welfareGate * (empty ? 0.35 : 1))) * 10) / 10;

  const concerned = !empty && (sickFrac > 0 || suffering > 0 || welfare < 0.42 || tank.cache?.status === 'danger');
  let concernText: string | undefined;
  let concernCreature: Creature | undefined;
  if (concerned) {
    const sickOne = creatures.find((c) => c.illness || (c.stats && (c.stats.health < 45 || c.stats.stress > 78)));
    const starving = creatures.find((c) => (c.stats?.hunger ?? 0) >= 90);
    concernCreature = sickOne ?? starving;
    concernText = sickOne ? `${sickOne.name} doesn’t look well` : starving ? `${starving.name} looks half-starved` : (tank.cache?.waterStatus ?? tank.cache?.status) === 'danger' ? 'the water looks wrong' : 'the animals seem stressed';
  }

  let main: string | null = null;
  let mainN = 0;
  for (const [id, k] of bySpecies) {
    if (k > mainN) {
      mainN = k;
      main = id;
    }
  }

  const education = clamp01((tank.signage ? 0.7 : 0.15) + (conservation > 0.5 ? 0.2 : 0) + (s > 1 ? 0.1 : 0));
  const appeal = empty ? 0.05 : Math.pow(score / 100, 1.6) * (0.55 + 0.45 * size) * 4;

  return {
    tankId: tank.id,
    score,
    factors,
    welfareGate,
    concerned,
    concernText,
    concernCreature,
    empty,
    speciesIds: [...bySpecies.keys()],
    groups: [...groups],
    mainSpeciesId: main,
    star,
    moment,
    gallons,
    appeal,
    education,
    conservation,
    awardNote: award.note, // lane:shows
  };
}

export function exhibitReport(state: GameState, tankId: string): ExhibitReport {
  const tank = state.tanks[tankId];
  if (!tank) return { score: 0, factors: [], visitorAppeal: 0 };
  const info = exhibitInfo(state, tank);
  const notes: Partial<Record<ExhibitFactorKey, string>> = {};
  if (info.welfareGate < 1) notes.welfare = 'Visitors notice unwell or stressed animals — welfare caps this exhibit.';
  if (info.moment) notes.behaviour = `Visitors can see ${info.moment.text}.`;
  if (!tank.signage) notes.signage = 'Add a sign to teach visitors about these animals.';
  if (info.factors.clarity < 0.6) notes.clarity = 'Algae or cloudy water dulls the view.';
  if (info.empty) notes.charisma = 'No animals yet.';
  else if (info.awardNote) notes.charisma = info.awardNote; // lane:shows
  const factors = (Object.keys(EXHIBIT_WEIGHTS) as ExhibitFactorKey[]).map((k) => ({ label: FACTOR_LABELS[k], value: Math.round(info.factors[k] * 100), note: notes[k] }));
  if (info.welfareGate < 1) factors.push({ label: 'Welfare gate', value: Math.round(info.welfareGate * 100), note: 'Score multiplier from animal welfare.' });
  return { score: info.score, factors, visitorAppeal: Math.round(info.appeal * 100) / 100 };
}
