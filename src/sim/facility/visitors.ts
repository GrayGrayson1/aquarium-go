/**
 * Visitor simulation: arrivals, visits, satisfaction, revenue, reactions, friend visits and daily rollover.
 * OWNER: lane "facility". Deterministic: all randomness comes from ctx.rng.
 *
 * Model (original):
 *  - Arrival rate λ = Σ exhibit appeal (with facility-wide repeat-species fatigue) × reputation × price × novelty
 *    × day-of-week × time-of-day × venue reach. Admitted arrivals are capped by capacity via Little's law
 *    (occupancy = rate × dwell time), so crowds never pile up without bound.
 *  - Each arriving visitor (sampled; large crowds are simulated through weighted representatives) has an
 *    archetype with interests, patience, budget, education and welfare sensitivity. They walk the reachable
 *    exhibits nearest the entrance first, enjoy each one according to their interests, tire of repeated species,
 *    are delighted by rare behaviour and concerned by unwell animals (welfare always outranks rarity).
 *  - Satisfaction drives tips, donations, reputation and exhibit popularity. Revenue is banked through
 *    economy.earn about once per game hour.
 */
import type { GameState, VisitorLiveState, VisitorReaction } from '@/types';
import type { SimContext } from '../context';
import type { Rng } from '../rng';
import { emitEvent } from '../context';
import { dayOf, hourOfDay } from '../time';
import { earn } from '../economy';
import { findSpecies } from '@/data/species';
import { facilityLevelIndex, getFacilityLevel } from '@/data/facilities';
import { exhibitInfo, type ExhibitInfo, type ExhibitFactorKey } from './exhibit';
import { stateReachability } from './layout';
import { pickLine, pushReaction, FRIEND_NAMES, NEIGHBOUR_NAMES, type ReactionContext, type ReactionVars } from './reactions';
import { addMastery, addReputation, bumpCounter, isUnlocked, tutorialStepId } from './progression';
import { theTank } from '../economy/util';
import { docentEffect, type DocentEffect } from '../staff'; // lane:staff

// ───────────────────────────── archetypes ─────────────────────────────

export type VisitorArchetype = 'family' | 'kids' | 'student' | 'enthusiast' | 'photographer' | 'tourist' | 'conservation' | 'critic';

export interface ArchetypeDef {
  id: VisitorArchetype;
  label: string;
  interests: Record<ExhibitFactorKey, number>;
  patience: number;
  budget: number;
  education: number;
  conservation: number;
  generosity: number;
  priceSensitivity: number;
  crowdTolerance: number;
  comfortNeed: number;
  welfareSensitivity: number;
  /** Arrival weight by facility order (0 = hobby .. 5 = grand hall). */
  weights: [number, number, number, number, number, number];
}

const I = (beauty: number, welfare: number, activity: number, charisma: number, rarity: number, variety: number, behaviour: number, signage: number, clarity: number, size: number): Record<ExhibitFactorKey, number> => ({ beauty, welfare, activity, charisma, rarity, variety, behaviour, signage, clarity, size });

export const ARCHETYPES: ArchetypeDef[] = [
  { id: 'family', label: 'Family', interests: I(1, 1, 1.4, 1.5, 0.3, 0.6, 1.2, 0.4, 0.6, 1), patience: 0.5, budget: 30, education: 0.4, conservation: 0.3, generosity: 0.5, priceSensitivity: 1, crowdTolerance: 0.5, comfortNeed: 0.9, welfareSensitivity: 0.6, weights: [0, 3, 3, 2.6, 2.4, 2.2] },
  { id: 'kids', label: 'School group', interests: I(0.6, 0.8, 1.8, 1.8, 0.3, 0.8, 1.5, 0.3, 0.4, 1.2), patience: 0.35, budget: 6, education: 0.6, conservation: 0.4, generosity: 0.2, priceSensitivity: 0.7, crowdTolerance: 0.8, comfortNeed: 0.4, welfareSensitivity: 0.5, weights: [0, 0.8, 1.2, 1.2, 1.2, 1.2] },
  { id: 'student', label: 'Student', interests: I(0.7, 1, 1, 0.9, 0.8, 1, 1.2, 1.6, 0.6, 0.5), patience: 0.7, budget: 10, education: 1, conservation: 0.7, generosity: 0.25, priceSensitivity: 1.4, crowdTolerance: 0.6, comfortNeed: 0.5, welfareSensitivity: 0.8, weights: [0, 1, 1, 1, 1, 1] },
  { id: 'enthusiast', label: 'Enthusiast', interests: I(1.3, 1.4, 0.9, 0.8, 1.5, 1.1, 1.4, 0.6, 1.2, 0.5), patience: 0.9, budget: 40, education: 0.6, conservation: 0.6, generosity: 0.7, priceSensitivity: 0.7, crowdTolerance: 0.5, comfortNeed: 0.3, welfareSensitivity: 1, weights: [0, 2, 1.6, 1.2, 1, 0.9] },
  { id: 'photographer', label: 'Photographer', interests: I(1.8, 0.9, 1, 1.1, 0.9, 0.7, 1, 0.2, 1.6, 0.9), patience: 0.8, budget: 25, education: 0.3, conservation: 0.4, generosity: 0.5, priceSensitivity: 0.8, crowdTolerance: 0.3, comfortNeed: 0.3, welfareSensitivity: 0.7, weights: [0, 0.3, 0.6, 1, 1, 1] },
  { id: 'tourist', label: 'Tourist', interests: I(1, 0.8, 1.2, 1.4, 0.8, 0.8, 1, 0.4, 0.7, 1.6), patience: 0.6, budget: 45, education: 0.3, conservation: 0.3, generosity: 0.6, priceSensitivity: 0.5, crowdTolerance: 0.7, comfortNeed: 0.8, welfareSensitivity: 0.5, weights: [0, 0.2, 0.5, 1.2, 2.2, 2.8] },
  { id: 'conservation', label: 'Conservationist', interests: I(0.8, 1.8, 0.8, 0.8, 0.6, 0.9, 1.2, 1.5, 0.8, 0.4), patience: 0.75, budget: 30, education: 0.9, conservation: 1, generosity: 0.8, priceSensitivity: 0.8, crowdTolerance: 0.5, comfortNeed: 0.5, welfareSensitivity: 1.4, weights: [0, 0.7, 0.8, 0.9, 1, 1] },
  { id: 'critic', label: 'Critic', interests: I(1.5, 1.6, 1, 1, 1, 1.2, 1.2, 1, 1.4, 0.7), patience: 1, budget: 20, education: 0.7, conservation: 0.6, generosity: 0.1, priceSensitivity: 0.4, crowdTolerance: 0.4, comfortNeed: 0.5, welfareSensitivity: 1.5, weights: [0, 0.05, 0.1, 0.15, 0.15, 0.15] },
];

const ARCH_BY_ID = Object.fromEntries(ARCHETYPES.map((a) => [a.id, a])) as Record<VisitorArchetype, ArchetypeDef>;

// ───────────────────────────── helpers ─────────────────────────────

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export function weekdayOf(day: number): number {
  return (((day - 1) % 7) + 7) % 7;
}
const DAY_FACTOR = [0.8, 0.9, 0.95, 1, 1.15, 1.45, 1.35];

export function isOpenAt(state: GameState, hour: number): boolean {
  const f = state.facility;
  if (!f.openToPublic || f.level === 'hobby_room' || !isUnlocked(state, 'visitors')) return false;
  const h = hourOfDay(hour);
  return f.openHour <= f.closeHour ? h >= f.openHour && h < f.closeHour : h >= f.openHour || h < f.closeHour;
}

export function ensureLive(state: GameState): VisitorLiveState {
  const v = state.visitors;
  if (!v.live) {
    v.live = {
      occupancy: 0,
      arrivalRate: 0,
      crowding: 0,
      carry: 0,
      pendingAdmission: 0,
      pendingTips: 0,
      pendingDonations: 0,
      lastFlushHour: state.clock.hour,
      mix: {},
      unreachable: [],
    };
  }
  return v.live;
}

/**
 * Only display tanks are exhibits. Quarantine, nursery and breeding tanks are back of house: visitors never see them,
 * so a sick fish in the hospital tank costs no satisfaction or reputation, and fry-only nurseries never drag the fair
 * ticket price down. (Old saves without a purpose count as display; see migrations.)
 */
export function onDisplay(state: GameState, tankId: string): boolean {
  const t = state.tanks[tankId];
  return !!t && (t.purpose ?? 'display') === 'display';
}

function displayInfos(state: GameState): ExhibitInfo[] {
  return state.tankOrder.filter((id) => onDisplay(state, id)).map((id) => exhibitInfo(state, state.tanks[id]));
}

/** What a fair ticket price looks like for this facility right now. */
export function fairAdmission(state: GameState, infos?: ExhibitInfo[]): number {
  const list = infos ?? displayInfos(state);
  let v = 0;
  for (const e of list) if (!e.empty) v += Math.pow(e.score / 100, 1.3) * (0.7 + 0.3 * e.factors.size);
  const lvl = facilityLevelIndex(state.facility.level);
  return Math.round((2.5 + 3.8 * Math.sqrt(v)) * (1 + 0.14 * lvl) * 2) / 2;
}

/** Facility-wide attraction with repeat-species fatigue: the fifth betta tank adds far less than the first. */
export function facilityAttraction(infos: ExhibitInfo[]): number {
  const sorted = [...infos].filter((e) => !e.empty).sort((a, b) => b.appeal - a.appeal);
  const species = new Map<string, number>();
  const groups = new Map<string, number>();
  let total = 0;
  for (const e of sorted) {
    const s = e.mainSpeciesId ?? '';
    const g = (e.mainSpeciesId && findSpecies(e.mainSpeciesId)?.group) || s;
    const rs = species.get(s) ?? 0;
    const rg = groups.get(g) ?? 0;
    total += e.appeal * Math.pow(0.55, rs) * Math.pow(0.85, Math.max(0, rg - rs));
    species.set(s, rs + 1);
    groups.set(g, rg + 1);
  }
  return total;
}

function novelty(state: GameState, now: number): number {
  let n = 0;
  for (const id of state.tankOrder) if (now - (state.tanks[id]?.createdHour ?? -1e9) < 72) n++;
  const fresh = new Set<string>();
  for (const c of Object.values(state.creatures)) if (c.status === 'alive' && c.tankId && now - c.acquiredHour < 72) fresh.add(c.speciesId);
  n += fresh.size;
  return 1 + 0.08 * Math.min(6, n);
}

function tankName(state: GameState, id: string): string {
  return state.tanks[id]?.name ?? 'tank';
}

/** The animal a reaction is about: the exhibit's star, or the unwell one when the visitor is concerned. */
function subjectOf(e: ExhibitInfo, mood?: VisitorReaction['mood']): ExhibitInfo['star'] {
  return mood === 'concerned' && e.concernCreature ? e.concernCreature : e.star;
}

function varsFor(state: GameState, e: ExhibitInfo, mood?: VisitorReaction['mood']): ReactionVars {
  const star = subjectOf(e, mood);
  const sp = star ? findSpecies(star.speciesId) : e.mainSpeciesId ? findSpecies(e.mainSpeciesId) : undefined;
  return {
    name: star?.name ?? sp?.commonName ?? 'the fish',
    species: sp?.commonName ?? 'fish',
    tank: tankName(state, e.tankId),
    gallons: e.gallons,
    morph: star?.morphName && !/wild/i.test(star.morphName) ? star.morphName : undefined,
    moment: e.moment?.text, // a noun phrase ("a bubble nest"); see exhibit.ts momentPhrase
    region: sp?.nativeRegion?.split(/[—,;(]/)[0]?.trim(),
  };
}

// ───────────────────────────── a single visit ─────────────────────────────

interface VisitOutcome {
  sat: number;
  tip: number;
  donation: number;
  wows: number;
  concerned: number;
  /** Stars this visitor gasped at (one entry per wow). */
  starWows: string[];
  reaction?: { ctx: ReactionContext; mood: VisitorReaction['mood']; e: ExhibitInfo; priority: number };
  critic?: 'good' | 'bad';
}

interface VisitEnv {
  exhibits: ExhibitInfo[]; // reachable, ordered by path distance
  occupancy: number;
  capacity: number;
  admission: number;
  fair: number;
  benches: number;
  planters: number;
  kiosks: number;
  donationBoxes: number;
  levelOrder: number;
  signFrac: number;
  /** lane:staff — docents on the floor (bounded satisfaction / learning / donation lift); null without docents. */
  docent?: DocentEffect | null;
}

function simulateVisit(state: GameState, rng: Rng, arch: ArchetypeDef, env: VisitEnv, weight: number): VisitOutcome {
  const patience = arch.patience * rng.range(0.7, 1.3);
  const n = env.exhibits.length;
  const nSee = Math.max(1, Math.min(n, Math.round(2 + patience * 9 + rng.next())));
  // choose which exhibits: nearest first, but popular/appealing ones pull people along
  let chosen = env.exhibits;
  if (nSee < n) {
    chosen = env.exhibits
      .map((e, i) => ({ e, k: (1 + e.appeal) * rng.range(0.6, 1.4) - i * 0.04 }))
      .sort((a, b) => b.k - a.k)
      .slice(0, nSee)
      .map((x) => x.e)
      .sort((a, b) => env.exhibits.indexOf(a) - env.exhibits.indexOf(b));
  }
  let isum = 0;
  for (const k of Object.keys(arch.interests) as ExhibitFactorKey[]) isum += arch.interests[k];
  const seenSpecies = new Map<string, number>();
  const seenGroups = new Map<string, number>();
  const enjoyments: number[] = [];
  let wows = 0;
  let concerned = 0;
  const starWows: string[] = [];
  let reaction: VisitOutcome['reaction'];
  const consider = (r: NonNullable<VisitOutcome['reaction']>) => {
    if (!reaction || r.priority > reaction.priority) reaction = r;
  };
  for (const e of chosen) {
    const stat = (state.visitors.exhibit[e.tankId] ??= { popularity: 50, views: 0, wows: 0 });
    let base = 0;
    for (const k of Object.keys(arch.interests) as ExhibitFactorKey[]) base += arch.interests[k] * e.factors[k];
    base = isum > 0 ? base / isum : 0;
    // repeat-species fatigue within this visit
    let rs = 0;
    let rg = 0;
    for (const s of e.speciesIds) rs = Math.max(rs, seenSpecies.get(s) ?? 0);
    for (const g of e.groups) rg = Math.max(rg, seenGroups.get(g) ?? 0);
    const fatigue = 1 / (1 + 0.55 * rs + 0.18 * Math.max(0, rg - rs));
    let enjoy = base * e.welfareGate * fatigue * (e.empty ? 0.35 : 1);
    // tiny tanks are hard to see in a crowd
    if (env.occupancy > env.capacity * 0.6 && e.gallons < 30) enjoy *= 0.9;
    enjoy = Math.max(0, Math.min(1, enjoy));
    enjoyments.push(enjoy);
    for (const s of e.speciesIds) seenSpecies.set(s, (seenSpecies.get(s) ?? 0) + 1);
    for (const g of e.groups) seenGroups.set(g, (seenGroups.get(g) ?? 0) + 1);

    let wow = false;
    if (!e.empty && e.welfareGate > 0.7) {
      if (e.moment && rng.chance(0.6)) wow = true;
      else if (enjoy > 0.72 && rng.chance((enjoy - 0.66) * 1.6)) wow = true;
    }
    let concern = false;
    if (e.concerned && rng.chance(Math.min(0.95, 0.3 + 0.45 * arch.welfareSensitivity))) concern = true;

    stat.views += weight;
    if (wow) {
      stat.wows += weight;
      wows++;
      if (e.star) starWows.push(e.star.id); // credited per represented visitor by publicStep
    }
    if (concern) concerned++;
    stat.popularity += (enjoy * 100 - stat.popularity) * Math.min(1, 0.03 * weight);
    if (!Number.isFinite(stat.popularity)) stat.popularity = 50;

    // reaction candidates
    if (concern) consider({ ctx: 'concerned', mood: 'concerned', e, priority: 5 + rng.next() });
    else if (wow) {
      const ctx: ReactionContext = e.moment ? 'wow_moment' : arch.id === 'kids' ? 'kid' : arch.id === 'photographer' ? 'photographer' : e.gallons >= 240 && rng.chance(0.5) ? 'wow_big' : 'wow';
      consider({ ctx, mood: 'wow', e, priority: 4 + rng.next() });
    } else if (e.empty) consider({ ctx: 'empty', mood: 'neutral', e, priority: 1 + rng.next() });
    else if (rs >= 1 && enjoy < 0.5) consider({ ctx: 'fatigue', mood: 'bored', e, priority: 2.5 + rng.next() });
    else if (enjoy > 0.6) {
      const ctx: ReactionContext = arch.id === 'student' && e.factors.signage > 0 ? 'student' : arch.id === 'conservation' && e.factors.signage > 0 ? 'conservation' : arch.id === 'kids' ? 'kid' : 'happy';
      consider({ ctx, mood: 'happy', e, priority: 2 + rng.next() });
    } else if (enjoy > 0.38) consider({ ctx: 'neutral', mood: 'neutral', e, priority: 1 + rng.next() });
    else consider({ ctx: 'bored', mood: 'bored', e, priority: 1.5 + rng.next() });
  }
  // satisfaction
  const sorted = [...enjoyments].sort((a, b) => b - a);
  const top = sorted.slice(0, 3);
  const meanTop = top.length ? top.reduce((a, b) => a + b, 0) / top.length : 0;
  const mean = enjoyments.length ? enjoyments.reduce((a, b) => a + b, 0) / enjoyments.length : 0;
  let sat = 100 * (0.55 * meanTop + 0.45 * mean) + 12; // arriving at a place full of water is itself nice
  sat += Math.min(3, wows) * 6;
  sat -= Math.min(2, concerned) * 14;
  // comfort: seats, planters, gallery lighting
  const seats = env.benches * 3;
  const want = Math.max(1, env.occupancy * 0.22);
  sat += (Math.min(1, seats / want) - 0.5) * 8 * arch.comfortNeed;
  sat += Math.min(3, env.planters * 0.6);
  if (env.levelOrder >= 3) sat += 3;
  // crowding
  const crowd = env.capacity > 0 ? env.occupancy / env.capacity : 0;
  sat -= Math.max(0, crowd - 0.6) * 40 * (1 - arch.crowdTolerance);
  // price vs value
  const x = env.fair > 0 ? env.admission / env.fair : 0;
  if (x > 1) sat -= (x - 1) * 25 * arch.priceSensitivity;
  else sat += (1 - x) * 4 * arch.priceSensitivity;
  // learning
  sat += env.signFrac * arch.education * 8 + Math.min(1, env.kiosks) * arch.education * 3;
  // lane:staff — docents: a guided look lifts everyone a little, curious visitors more, families most with a great-with-kids docent
  if (env.docent) sat += env.docent.sat + env.docent.learn * arch.education + (arch.id === 'family' || arch.id === 'kids' ? env.docent.kids : 0);
  sat = Math.max(0, Math.min(100, sat));

  if (crowd > 0.9 && rng.chance(0.4) && reaction && reaction.mood !== 'wow' && reaction.mood !== 'concerned') {
    reaction = { ctx: 'crowded', mood: 'bored', e: reaction.e, priority: 3 };
  }

  // Welfare gates generosity: a visitor who was worried by a suffering animal leaves no tip, and donates less.
  let tip = 0;
  if (sat >= 68 && rng.chance(Math.min(0.9, ((sat - 62) / 60) * arch.generosity * 1.4 * (env.docent?.tip ?? 1)))) tip = concerned > 0 ? 0 : arch.budget * rng.range(0.03, 0.08); // lane:staff docent tip lift
  let donation = 0;
  const cons = arch.conservation * (0.35 + 0.65 * env.signFrac);
  if (sat >= 55 && rng.chance(Math.min(0.8, cons * (sat / 100) * 0.35 * (1 + 0.6 * Math.min(2, env.donationBoxes)) * (env.docent?.donation ?? 1)))) donation = arch.budget * rng.range(0.04, 0.12) * (concerned > 0 ? 0.5 : 1);

  let critic: VisitOutcome['critic'];
  if (arch.id === 'critic') {
    critic = sat >= 72 ? 'good' : sat < 45 ? 'bad' : undefined;
    if (critic && reaction) reaction = { ctx: critic === 'good' ? 'critic_good' : 'critic_bad', mood: critic === 'good' ? 'wow' : 'concerned', e: reaction.e, priority: 6 };
  }
  return { sat, tip, donation, wows, concerned, starWows, reaction, critic };
}

// ───────────────────────────── public opening ─────────────────────────────

const MAX_SAMPLES = 16;
/** Reaction lines pushed per 0.25 game hours at most (the pace the feed was tuned at). */
const REACTIONS_PER_QUARTER = 2;

function publicStep(state: GameState, dt: number, h: number, rng: Rng): void {
  const live = ensureLive(state);
  const fac = state.facility;
  const level = getFacilityLevel(fac.level);
  const reach = stateReachability(state);
  live.unreachable = [...reach.unreachable];

  // warn about blocked aisles (throttled per tank)
  live.warnedHour ??= {};
  for (const id of reach.unreachable) {
    const last = live.warnedHour[id];
    if (last !== undefined && h - last < 12) continue;
    live.warnedHour[id] = h;
    emitEvent(state, { kind: 'warning', text: `Visitors can’t reach ${theTank(tankName(state, id))} — clear an aisle.`, tankId: id, toast: true });
  }

  // back-of-house tanks (quarantine, nursery, breeding) are not exhibits: nobody walks up to them or worries about them
  const reachable = state.tankOrder.filter((id) => onDisplay(state, id) && reach.reachable.has(id));
  const infos = reachable.map((id) => exhibitInfo(state, state.tanks[id]));
  infos.sort((a, b) => (reach.distance[a.tankId] ?? 0) - (reach.distance[b.tankId] ?? 0));
  const fair = fairAdmission(state, infos);
  const rep = state.progress.reputation;
  const repF = 0.25 + 1.75 * (1 - Math.exp(-rep / 250));
  const x = fair > 0 ? fac.admission / fair : 1;
  const priceF = Math.max(0.05, Math.min(1.2, 1.2 - 0.6 * x));
  const day = dayOf(h);
  const dayF = DAY_FACTOR[weekdayOf(day)];
  const span = fac.closeHour > fac.openHour ? fac.closeHour - fac.openHour : 24 - fac.openHour + fac.closeHour;
  const into = (hourOfDay(h) - fac.openHour + 24) % 24;
  const hourF = Math.max(0.3, 0.45 + 0.75 * Math.sin(Math.PI * Math.min(1, Math.max(0, into / Math.max(1, span)))));
  const attraction = facilityAttraction(infos);
  // lane:staff — docents: talks and guided visits get talked about (a small, bounded draw; see docentEffect)
  const docent = state.staff?.roster.length ? docentEffect(state, h) : null;
  const lambdaRaw = attraction * repF * priceF * novelty(state, h) * dayF * hourF * level.reach * (docent?.draw ?? 1);
  const dwell = Math.max(0.5, Math.min(2.5, 0.45 + 0.09 * infos.length));
  const cap = level.visitorCapacity;
  const lambda = Math.min(lambdaRaw, cap / dwell);
  live.arrivalRate = lambda;
  // lane:w2-sim — occupancy counts real people: those still inside after this step's departures (mean stay = dwell)
  // plus this step's admitted arrivals that haven't left yet. It can never exceed the day's arrivals (Little's law
  // still holds on average: occupancy ≈ arrival rate × dwell).
  const stay = Math.exp(-dt / dwell);
  live.occupancy = Math.max(0, live.occupancy * stay);
  const settle = () => {
    live.occupancy = Math.max(0, Math.min(cap, live.occupancy, state.visitors.today.count));
    live.crowding = cap > 0 ? live.occupancy / cap : 0;
  };

  if (!infos.some((e) => !e.empty)) {
    live.carry = 0;
    settle();
    return;
  }

  // arrivals: expected value preserved through the carry at ANY step size. An arrival granted early leaves a debt
  // (negative carry) that later steps pay off; it is never forgiven, or 1× (0.025 h steps) would admit several times
  // the visitors of 10× or the offline catch-up. One rng draw per step, always.
  const k = lambda * dt + live.carry;
  let n = Math.max(0, Math.floor(k));
  const frac = k - n; // negative while a debt is outstanding: the draw below can't fire
  if (rng.next() < frac) {
    n += 1;
    live.carry = frac - 1;
  } else live.carry = frac;
  if (n <= 0) {
    settle();
    return;
  }
  // Arrivals are spread over the step: on average this share of them is still inside at its end.
  live.occupancy += n * Math.min(1, (dwell / dt) * (1 - stay));

  const fixtures = fac.fixtures ?? [];
  const env: VisitEnv = {
    exhibits: infos,
    occupancy: live.occupancy,
    capacity: cap,
    admission: fac.admission,
    fair,
    benches: fixtures.filter((f) => f.kind === 'bench').length,
    planters: fixtures.filter((f) => f.kind === 'planter').length + level.props.filter((p) => p.kind === 'planter').length * 0.5,
    kiosks: fixtures.filter((f) => f.kind === 'info_kiosk').length,
    donationBoxes: fixtures.filter((f) => f.kind === 'donation_box').length,
    levelOrder: level.order,
    signFrac: infos.length ? infos.filter((e) => e.factors.signage > 0).length / infos.length : 0,
    docent, // lane:staff
  };

  const samples = Math.min(n, MAX_SAMPLES);
  const weight = n / samples;
  const lvl = level.order;
  let satSum = 0;
  let tips = 0;
  let donations = 0;
  let wows = 0;
  let concerned = 0;
  let repDelta = 0;
  const reactions: NonNullable<VisitOutcome['reaction']>[] = [];
  const mixCount: Record<string, number> = {};
  const starWowCount = new Map<string, number>();
  for (let i = 0; i < samples; i++) {
    const arch = rng.weighted(ARCHETYPES, (a) => a.weights[lvl] ?? 0);
    mixCount[arch.id] = (mixCount[arch.id] ?? 0) + 1;
    const o = simulateVisit(state, rng, arch, env, weight);
    satSum += o.sat * weight;
    tips += o.tip * weight;
    donations += o.donation * weight;
    wows += o.wows * weight;
    concerned += o.concerned * weight;
    repDelta += 0.05 * ((o.sat - 55) / 45) * weight;
    if (o.reaction) reactions.push(o.reaction);
    for (const id of o.starWows) starWowCount.set(id, (starWowCount.get(id) ?? 0) + 1);
    if (o.critic) {
      const e = o.reaction?.e ?? infos[0];
      const good = o.critic === 'good';
      // A sample stands for `weight` visitors, critics included: a busy hall gets the same critic swing per person
      // whether it was watched at 1× (every visitor sampled) or caught up offline (16 samples for 60 people).
      addReputation(state, (good ? 4 : -4) * weight, '');
      // Reputation always moves, but the log hears about critics at most once per exhibit per game day.
      live.warnedHour ??= {};
      const key = `critic:${e.tankId}`;
      const lastCritic = live.warnedHour[key];
      if (lastCritic !== undefined && h - lastCritic < 24) continue;
      live.warnedHour[key] = h;
      // lane:qa-final — praise pops up at most once a game day across the whole venue (a 15-exhibit hall toasted a
      // critic every ~30 real seconds); every visit is still in the log. An unimpressed critic always says so. (The
      // key is cleared at the nightly rollover like every non-tank key, so it is "once per calendar day".)
      const lastPraise = live.warnedHour['critic:praise_toast'];
      const toast = !good || lastPraise === undefined || h - lastPraise >= 24;
      if (good && toast) live.warnedHour['critic:praise_toast'] = h;
      emitEvent(state, {
        kind: good ? 'celebrate' : 'warning',
        text: good ? `A visiting critic praised ${theTank(tankName(state, e.tankId))}: “welfare and beauty, done right.” (+reputation)` : `A visiting critic was unimpressed by ${theTank(tankName(state, e.tankId))}. (−reputation)`,
        tankId: e.tankId,
        toast,
      });
    }
  }

  // stars' "wow" tallies grow per represented visitor (rounded once per step, so the count stays a whole number)
  for (const [id, count] of starWowCount) {
    const cr = state.creatures[id];
    if (!cr) continue;
    const before = cr.visitorWows ?? 0;
    cr.visitorWows = before + Math.round(count * weight);
    if (Math.floor(cr.visitorWows / 25) > Math.floor(before / 25)) {
      cr.history.push({ hour: state.clock.hour, kind: 'visitor_wow', text: `${cr.visitorWows} visitors have gasped at ${cr.name}.` });
      if (cr.history.length > 40) cr.history.splice(0, cr.history.length - 40);
    }
  }

  // totals
  const v = state.visitors;
  const admission = fac.admission * n;
  v.today.count += n;
  settle(); // lane:w2-sim — after the day's count includes these arrivals
  v.today.revenue += admission + tips + donations;
  v.today.tips += tips + donations;
  v.today.satisfactionSum += satSum;
  v.totalVisitors += n;
  bumpCounter(state, 'visitors', n);
  if (wows > 0) bumpCounter(state, 'wows', Math.round(wows));
  addMastery(state, 'exhibition', 0.25 * n + 0.5 * wows);
  if (repDelta) addReputation(state, repDelta, '');
  if (concerned > 0) {
    const loss = Math.min(0.25 * concerned, Math.max(0, 8 - (live.concernLossToday ?? 0)));
    if (loss > 0) {
      live.concernLossToday = (live.concernLossToday ?? 0) + loss;
      addReputation(state, -loss, '');
    }
  }
  if (!state.isShowcase) {
    live.pendingAdmission += admission;
    live.pendingTips += tips;
    live.pendingDonations += donations;
  }
  // crowd mix EMA (for the 3D crowd)
  const a = Math.min(1, 0.15 * samples);
  for (const arch of ARCHETYPES) {
    const share = (mixCount[arch.id] ?? 0) / samples;
    live.mix[arch.id] = (live.mix[arch.id] ?? 0) * (1 - a) + share * a;
  }

  // reactions: at most two per quarter game hour (a budget refilled per hour, so the feed turns over at the same pace
  // at every speed), most notable first
  live.reactionBudget = Math.min(REACTIONS_PER_QUARTER, (live.reactionBudget ?? REACTIONS_PER_QUARTER) + REACTIONS_PER_QUARTER * (dt / 0.25));
  reactions.sort((p, q) => q.priority - p.priority);
  for (const r of reactions) {
    if (live.reactionBudget < 1) break;
    const p = r.mood === 'wow' || r.mood === 'concerned' ? 0.8 : 0.3;
    if (!rng.chance(p)) continue;
    const vars = varsFor(state, r.e, r.mood);
    pushReaction(v.reactions, { hour: h, tankId: r.e.tankId, creatureId: subjectOf(r.e, r.mood)?.id, text: pickLine(rng, r.ctx, vars), mood: r.mood });
    if (r.mood === 'wow') {
      const stat = v.exhibit[r.e.tankId];
      if (stat) stat.lastFeatured = h;
    }
    live.reactionBudget -= 1;
  }
}

// ───────────────────────────── friend visits (hobby room) ─────────────────────────────

/** Tutorial steps that wait on friend visits (or the reputation they bring), and the gap between visits then. */
const TUTORIAL_FRIEND_STEPS = new Set(['first_money', 'first_goal', 'upgrade']);
const TUTORIAL_FRIEND_GAP_H: [number, number] = [2, 3.5];

/** After the first three friend visits, toast one at most every this many game hours (the rest are logged). */
const FRIEND_TOAST_EVERY_H = 44;
/** A worried friend (an animal in danger) is news worth repeating sooner. */
const FRIEND_WORRIED_TOAST_EVERY_H = 20;

function friendStep(state: GameState, h: number, rng: Rng): void {
  const live = ensureLive(state);
  if (live.friend && h >= live.friend.untilHour) live.friend = undefined;
  if (live.friend) return;
  const stepId = tutorialStepId(state);
  const firstMoney = stepId === 'first_money';
  if (live.nextFriendHour === undefined) live.nextFriendHour = h + rng.range(2.5, 5);
  // "A friend has heard about {name} and wants to visit": no visit yet during this step → one comes soon.
  const visitsAtStep = state.progress.tutorial.stepBaselines?.friend_visits ?? 0;
  if (firstMoney && (state.progress.counters.friend_visits ?? 0) <= visitsAtStep) live.nextFriendHour = Math.min(live.nextFriendHour, h + 0.9);
  if (h < live.nextFriendHour) return;
  const hod = hourOfDay(h);
  if (hod < 9 || hod >= 21) return;
  // only when something healthy is worth showing off
  const candidates = state.tankOrder
    .map((id) => state.tanks[id])
    .filter((t) => t && t.cache?.status !== 'danger' && (t.cache?.welfare ?? 0) >= 50)
    .map((t) => exhibitInfo(state, t))
    .filter((e) => !e.empty && e.welfareGate >= 0.7);
  // A hobby room is one room: friends see every tank. An animal in danger anywhere (starving, seriously ill, failing)
  // means nobody leaves praise or a tip — they leave worried (throttled note, no money, no reputation, no visit
  // counted toward quests).
  const neglected = state.tankOrder.map((id) => state.tanks[id]).find((t) => t?.cache?.animalStatus === 'danger' && t.cache.statusReason);
  if (neglected) {
    live.nextFriendHour = h + rng.range(5, 9);
    const c = state.progress.counters;
    if (!state.isShowcase && h - (c._friendWorriedHour ?? -1e9) >= FRIEND_WORRIED_TOAST_EVERY_H) {
      c._friendWorriedHour = h;
      const roll = rng.next();
      const who = roll < 0.6 ? rng.pick(FRIEND_NAMES) : rng.pick(NEIGHBOUR_NAMES);
      const reason = neglected.cache.statusReason!.replace(/\s*—.*$/, '').replace(/\.$/, '');
      emitEvent(state, { kind: 'warning', text: `${who} dropped by but left worried: ${reason}. No tip today.`, tankId: neglected.id, toast: true });
    }
    return;
  }
  if (!candidates.length) {
    live.nextFriendHour = h + 3;
    return;
  }
  const e = rng.weighted(candidates, (c) => 0.2 + c.score);
  const roll = rng.next();
  const kind: 'friend' | 'neighbour' | 'kids' = roll < 0.55 ? 'friend' : roll < 0.85 ? 'neighbour' : 'kids';
  const who = kind === 'neighbour' ? rng.pick(NEIGHBOUR_NAMES) : kind === 'kids' ? 'The neighbour’s kids' : rng.pick(FRIEND_NAMES);
  // Very hungry, stressed or unwell animals (WATCH) still get visitors, but a smaller tip and less praise.
  const welfareMul = e.tankId && state.tanks[e.tankId]?.cache?.animalStatus === 'watch' ? 0.5 : 1;
  // Hobby-room income before the shop opens: ~$25–35 a game day from a lovely, healthy tank (balance sweep).
  const tip = Math.round(Math.max(welfareMul < 1 ? 1 : 2, Math.min(25, (5 + e.score * 0.12) * rng.range(0.75, 1.35) * (kind === 'kids' ? 0.5 : 1) * welfareMul)));
  const vars = { ...varsFor(state, e), who };
  const ctx: ReactionContext = kind === 'kids' ? 'friend_kids' : kind === 'neighbour' ? 'neighbour' : 'friend';
  const text = pickLine(rng, ctx, vars);
  pushReaction(state.visitors.reactions, { hour: h, tankId: e.tankId, creatureId: e.star?.id, text, mood: e.score >= 55 && welfareMul === 1 ? 'wow' : 'happy' });
  live.friend = { name: who, kind, tankId: e.tankId, untilHour: h + 1.6, party: kind === 'kids' ? 2 : 1 };
  // The tutorial's friend steps ("A visitor!", "Word gets around", the reputation upgrade) count visits made during
  // the step — friends come round a little more often while one is waiting on them.
  live.nextFriendHour = h + (stepId && TUTORIAL_FRIEND_STEPS.has(stepId) ? rng.range(...TUTORIAL_FRIEND_GAP_H) : rng.range(5, 9));
  if (e.star) {
    const cr = state.creatures[e.star.id];
    if (cr) cr.visitorWows = (cr.visitorWows ?? 0) + 1;
  }
  bumpCounter(state, 'friend_visits');
  const stat = (state.visitors.exhibit[e.tankId] ??= { popularity: 50, views: 0, wows: 0 });
  stat.views += 1;
  if (e.score >= 55) stat.wows += 1;
  addReputation(state, (1.5 + e.score / 100) * welfareMul, '');
  if (!state.isShowcase) {
    earn(state, tip, 'tips', `Tip from ${who}`);
    bumpCounter(state, 'tips_total', tip);
    state.visitors.today.tips += tip;
    state.visitors.today.revenue += tip;
    const starName = e.star?.name ?? 'your tank';
    // Toast the first few visits, then at most about once every two game days — friends drop by several times a day and a
    // toast every minute of play buries everything else. Every visit is still logged.
    const c = state.progress.counters;
    const visits = c.friend_visits ?? 0;
    const lastToast = c._friendToastHour ?? -1e9;
    const toast = visits <= 3 || h - lastToast >= FRIEND_TOAST_EVERY_H;
    if (toast) c._friendToastHour = h;
    emitEvent(state, { kind: 'visitor', text: `${who} dropped by to see ${starName} and left a $${tip} tip.`, tankId: e.tankId, creatureId: e.star?.id, toast });
  }
}

// ───────────────────────────── banking + rollover ─────────────────────────────

function flushRevenue(state: GameState, h: number, force = false): void {
  const live = ensureLive(state);
  if (!force && Math.floor(h) === Math.floor(live.lastFlushHour)) return;
  live.lastFlushHour = h;
  const r2 = (x: number) => Math.round(x * 100) / 100;
  if (live.pendingAdmission >= 0.01) earn(state, r2(live.pendingAdmission), 'admission', 'Admission');
  if (live.pendingTips >= 0.01) earn(state, r2(live.pendingTips), 'tips', 'Visitor tips');
  if (live.pendingDonations >= 0.01) earn(state, r2(live.pendingDonations), 'tips', 'Conservation donations');
  live.pendingAdmission = 0;
  live.pendingTips = 0;
  live.pendingDonations = 0;
}

function rollover(state: GameState, h: number): void {
  const v = state.visitors;
  const day = dayOf(h);
  if (day <= v.today.day) return;
  flushRevenue(state, h, true);
  const t = v.today;
  const avg = t.count > 0 ? t.satisfactionSum / t.count : 0;
  if (t.count > 0 || t.tips > 0) {
    v.history.push({ day: t.day, count: Math.round(t.count), revenue: Math.round(t.revenue * 100) / 100, avgSatisfaction: Math.round(avg * 10) / 10 });
    if (v.history.length > 90) v.history.splice(0, v.history.length - 90);
  }
  if (t.count >= 20 && avg >= 75) bumpCounter(state, 'five_star_days');
  v.today = { day, count: 0, revenue: 0, tips: 0, satisfactionSum: 0 };
  // lane:w2-sim — across midnight: a venue that is closed by now has let its last visitors out; one that is still
  // open (hours past midnight) counts the people inside as the new day's first visitors, so "inside" never exceeds
  // "today".
  const liveNow = ensureLive(state);
  if (isOpenAt(state, h)) v.today.count = Math.ceil(Math.max(0, liveNow.occupancy) - 1e-9);
  else liveNow.occupancy = 0;
  // popularity relaxes toward neutral; forget tanks that no longer exist
  for (const id of Object.keys(v.exhibit)) {
    if (!state.tanks[id]) {
      delete v.exhibit[id];
      continue;
    }
    const s = v.exhibit[id];
    s.popularity = 50 + (s.popularity - 50) * 0.85;
  }
  const live = ensureLive(state);
  live.concernLossToday = 0;
  if (live.warnedHour) for (const id of Object.keys(live.warnedHour)) if (!state.tanks[id.replace(/^critic:/, '')]) delete live.warnedHour[id];
}

// ───────────────────────────── step ─────────────────────────────

export function stepVisitors(state: GameState, dt: number, ctx: SimContext): void {
  if (!(dt > 0)) return;
  if (state.isShowcase) return;
  const live = ensureLive(state);
  // stale references (tank sold/removed while visitors were viewing it)
  if (live.friend && !state.tanks[live.friend.tankId]) live.friend = undefined;
  let t = 0;
  while (t < dt - 1e-9) {
    const sdt = Math.min(0.5, dt - t);
    const h = ctx.hour + t;
    rollover(state, h);
    if (isOpenAt(state, h)) {
      publicStep(state, sdt, h, ctx.rng);
    } else {
      live.occupancy *= Math.exp(-sdt / 0.5);
      if (live.occupancy < 0.05) live.occupancy = 0;
      live.arrivalRate = 0;
      live.crowding = 0;
      live.carry = 0;
    }
    if (!state.facility.openToPublic || state.facility.level === 'hobby_room') friendStep(state, h, ctx.rng);
    flushRevenue(state, h);
    t += sdt;
  }
}

// ───────────────────────────── UI summary ─────────────────────────────

export interface VisitorSummary {
  open: boolean;
  openNow: boolean;
  canOpen: boolean;
  occupancy: number;
  capacity: number;
  arrivalRate: number;
  crowding: number;
  admission: number;
  fairAdmission: number;
  today: { count: number; revenue: number; tips: number; avgSatisfaction: number };
  weekday: string;
  unreachable: string[];
  friend?: VisitorLiveState['friend'];
  topExhibits: { tankId: string; name: string; popularity: number; views: number; wows: number; score: number }[];
  mix: { id: VisitorArchetype; label: string; share: number }[];
}

export function visitorSummary(state: GameState): VisitorSummary {
  const fac = state.facility;
  const level = getFacilityLevel(fac.level);
  const live = state.visitors.live;
  const t = state.visitors.today;
  const infos = displayInfos(state);
  const top = infos
    .map((e) => {
      const s = state.visitors.exhibit[e.tankId];
      return { tankId: e.tankId, name: tankName(state, e.tankId), popularity: Math.round(s?.popularity ?? 50), views: Math.round(s?.views ?? 0), wows: Math.round(s?.wows ?? 0), score: e.score };
    })
    .sort((a, b) => b.popularity + b.score - (a.popularity + a.score));
  const mixTotal = Object.values(live?.mix ?? {}).reduce((a, b) => a + b, 0) || 1;
  return {
    open: fac.openToPublic,
    openNow: isOpenAt(state, state.clock.hour),
    canOpen: fac.level !== 'hobby_room' && isUnlocked(state, 'visitors'),
    occupancy: live?.occupancy ?? 0,
    capacity: level.visitorCapacity,
    arrivalRate: live?.arrivalRate ?? 0,
    crowding: live?.crowding ?? 0,
    admission: fac.admission,
    fairAdmission: fairAdmission(state, infos),
    today: { count: Math.round(t.count), revenue: Math.round(t.revenue * 100) / 100, tips: Math.round(t.tips * 100) / 100, avgSatisfaction: t.count > 0 ? Math.round((t.satisfactionSum / t.count) * 10) / 10 : 0 },
    weekday: WEEKDAYS[weekdayOf(dayOf(state.clock.hour))],
    unreachable: [...(live?.unreachable ?? [])],
    friend: live?.friend,
    topExhibits: top,
    mix: ARCHETYPES.map((a) => ({ id: a.id, label: a.label, share: (live?.mix?.[a.id] ?? 0) / mixTotal })).filter((m) => m.share > 0.01),
  };
}

export function archetypeLabel(id: string): string {
  return ARCH_BY_ID[id as VisitorArchetype]?.label ?? id;
}
