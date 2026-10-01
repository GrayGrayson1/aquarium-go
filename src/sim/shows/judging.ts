/**
 * Judging: scores an entry against its class standard and writes the judge's card. OWNER: lane "shows".
 *
 * Livestock (every criterion scored 0..1, then weighted by the class's points):
 *   form / colour / pattern   heritable potentials — structure, colour expression, pattern quality
 *   size & maturity           actual size against a top-quality adult of the species (young adults are still filling out)
 *   condition                 health, calm, conditioning from rich foods, no injuries, well fed
 *   deportment                composure on the bench — the keeper bond (life.bond), calm, a bold or show-off nature
 *   morph                     morph rarity (morph classes only), relative to the rarest morph of the species
 *   + prime age               colour and form soften a little in very young and ageing adults
 *   + the judge's eye         a small, honest bit of luck (±5 at most) shown on the card
 *
 * Aquascapes: composition (the judge's stricter critique of the layout, scaled by how much of it is the scaper's
 * own work rather than the gifted starter layout — lane:staff, S05-01), plant/coral health, animal welfare,
 * clarity & upkeep, sensible stocking and — for biotopes — whether the animals really share one habitat.
 *
 * Better genes and better care always mean a better expected score (tests/sim/shows-judging.test.ts).
 */
import type { Creature, GameState, JudgeCard, JudgeCriterion, SpeciesDefinition, Tank } from '@/types';
import { findSpecies } from '@/data/species';
import { CRITERION_LABEL, SHOW_TIERS, type ShowClassDef, type ShowCriterionKey } from '@/data/shows';
import type { ShowTier } from '@/types';
import { beautyScore, giftedLayoutShare, scapeCritique } from '../aquascape';
import { morphRarity, primeWindow } from '../economy/valuation';
import { ageDaysOf } from '../life/growth';
import { tankGallons } from './eligibility';
import type { Rng } from '../rng';

/** Spread of the judge's eye (points). */
export const JUDGE_SD = 2.2;
const JUDGE_MAX = 5;

const clamp01 = (v: number) => (Number.isFinite(v) ? (v < 0 ? 0 : v > 1 ? 1 : v) : 0);
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const round1 = (v: number) => Math.round(v * 10) / 10;

export interface ScoredCriterion {
  key: ShowCriterionKey;
  label: string;
  max: number;
  /** 0..1 quality. */
  q: number;
  points: number;
}

export interface EntryAssessment {
  /** Expected score before the judge's eye (0..100). */
  expected: number;
  criteria: ScoredCriterion[];
  /** Plain-language observations, strongest first (the card picks 3–5). */
  notes: { text: string; weight: number; tone: 'good' | 'bad' | 'neutral' }[];
}

function criteriaFrom(def: ShowClassDef, q: Partial<Record<ShowCriterionKey, number>>): ScoredCriterion[] {
  const out: ScoredCriterion[] = [];
  for (const [key, max] of Object.entries(def.standard) as [ShowCriterionKey, number][]) {
    if (!max) continue;
    const qq = clamp01(q[key] ?? 0);
    const label = key === 'form' ? (def.formLabel ?? CRITERION_LABEL.form) : key === 'deportment' ? (def.deportmentLabel ?? CRITERION_LABEL.deportment) : CRITERION_LABEL[key];
    out.push({ key, label, max, q: qq, points: round1(qq * max) });
  }
  return out;
}

const sumPoints = (cs: ScoredCriterion[]) => cs.reduce((a, c) => a + c.q * c.max, 0);

// ───────────────────────────── livestock ─────────────────────────────

/**
 * 0.84..1 — colour and form are at their best in a prime adult. The prime window is the economy's (primeWindow:
 * maturity to mid-adult life), not `adultDays`, which is the age at full size (lane:fix-econ, S16-01); a freshly
 * matured animal is still filling out for a while ('young').
 */
export function primeFactor(sp: SpeciesDefinition, c: Creature, nowHour: number): { f: number; phase: 'young' | 'prime' | 'past' | 'elder' } {
  const lc = sp.lifecycle;
  const age = ageDaysOf(c, nowHour);
  const { primeEnd, elderAt } = primeWindow(lc);
  if (c.lifeStage === 'elder') return { f: 0.9 - 0.06 * clamp01((age - elderAt) / Math.max(1, lc.lifespanDays - elderAt)), phase: 'elder' };
  const t = (age - lc.juvenileDays) / Math.max(1, lc.adultDays);
  if (t < 0.35) return { f: 0.9 + 0.1 * clamp01(t / 0.35), phase: 'young' };
  if (age <= primeEnd) return { f: 1, phase: 'prime' };
  return { f: 1 - 0.1 * clamp01((age - primeEnd) / Math.max(1, elderAt - primeEnd)), phase: 'past' };
}

/** Rarest morph rarity this species can show (for relative morph scoring). */
function maxSpeciesRarity(sp: SpeciesDefinition): number {
  let m = 0;
  for (const p of sp.genetics?.phenotypes ?? []) if (p.rarity > m) m = p.rarity;
  return m;
}

const POISE: Partial<Record<string, number>> = { showoff: 0.3, bold: 0.15, glass_curious: 0.1, explorer: 0.05, shy: -0.2, easily_startled: -0.3, homebody: -0.05 };

export function assessCreature(state: GameState, c: Creature, def: ShowClassDef): EntryAssessment {
  const sp = findSpecies(c.speciesId);
  const now = state.clock.hour;
  const pot = c.genome?.potentials;
  const st = c.stats;
  const health = num(st?.health, 100);
  const stress = num(st?.stress, 0);
  const hunger = num(st?.hunger, 0);
  const injury = num(c.life?.injury, 0);
  const conditioning = num(c.life?.conditioning, 0);
  const bond = num(c.life?.bond, 0);
  const prime = sp ? primeFactor(sp, c, now) : { f: 1, phase: 'prime' as const };

  // How well the animal's colour is showing today (stress and poor health wash colour out; rich food brings it up).
  const vigour = clamp01((health - 50) / 50) * (1 - stress / 150) * (0.85 + 0.15 * clamp01(conditioning / 100));
  const q: Partial<Record<ShowCriterionKey, number>> = {};
  q.form = (num(pot?.structure, 50) / 100) * (1 - clamp01(injury / 150)) * (0.9 + 0.1 * prime.f);
  q.colour = (num(pot?.color, 50) / 100) * (0.78 + 0.22 * vigour) * (0.92 + 0.08 * prime.f);
  q.pattern = num(pot?.pattern, 50) / 100;
  const topAdult = Math.max(0.1, (sp?.adultSizeCm ?? c.sizeCm) * 1.18);
  q.size = clamp01((num(c.sizeCm, 0) / topAdult - 0.7) / 0.3);
  q.condition = 0.45 * (health / 100) + 0.2 * (1 - stress / 100) + 0.15 * clamp01(conditioning / 100) + 0.1 * (1 - clamp01(injury / 100)) + 0.1 * (1 - clamp01(Math.max(0, hunger - 30) / 70));
  let poise = 0.5 + (num(pot?.temperament, 50) - 50) / 100;
  for (const t of c.personality ?? []) poise += POISE[t] ?? 0;
  q.deportment = 0.45 * clamp01(bond / 100) + 0.3 * (1 - stress / 100) + 0.25 * clamp01(poise);
  const maxR = sp ? maxSpeciesRarity(sp) : 0;
  const r = sp ? morphRarity(sp, c) : 0;
  q.rarity = maxR > 0 ? clamp01(r / Math.max(0.2, maxR * 0.9)) : 0.5;

  const criteria = criteriaFrom(def, q);
  const expected = clamp01(sumPoints(criteria) / 100) * 100;

  // ── observations for the judge's card ──
  const notes: EntryAssessment['notes'] = [];
  const formWord = (def.formLabel ?? 'form').toLowerCase();
  const w = (k: ShowCriterionKey) => def.standard[k] ?? 0;
  const describe = (k: ShowCriterionKey, qq: number, good: [string, string], bad: [string, string]) => {
    const max = w(k);
    if (!max) return;
    if (qq >= 0.88) notes.push({ text: good[0], weight: max * qq + 4, tone: 'good' });
    else if (qq >= 0.74) notes.push({ text: good[1], weight: max * qq, tone: 'good' });
    else if (qq <= 0.42) notes.push({ text: bad[0], weight: max * (1 - qq) + 3, tone: 'bad' });
    else if (qq <= 0.56) notes.push({ text: bad[1], weight: max * (1 - qq), tone: 'bad' });
  };
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  if (injury > 3 && w('form')) notes.push({ text: `A healing nick cost points on ${formWord}`, weight: 8, tone: 'bad' });
  else describe('form', q.form, [`Exceptional ${formWord}`, `Fine ${formWord}`], [`${cap(formWord)} well short of the standard`, `${cap(formWord)} fair, but not outstanding`]);
  if (vigour < 0.6 && w('colour') && num(pot?.color, 50) >= 55) notes.push({ text: stress > 30 ? 'Colour a touch dulled — stress shows in the colour' : 'Colour not at its best today — rich foods would bring it up', weight: w('colour') * 0.5 + 3, tone: 'bad' });
  else describe('colour', q.colour, ['Superb, saturated colour', 'Rich colour'], ['Colour pale and uneven', 'Colour a touch uneven']);
  describe('pattern', q.pattern, ['Crisp, beautifully even pattern', 'Clean pattern'], ['Pattern muddled', 'Pattern slightly irregular']);
  describe('size', q.size, ['Impressive size for the species', 'Good size'], [prime.phase === 'young' ? 'Still small — give it time to fill out' : 'Small for the species', 'A little under size']);
  describe('condition', q.condition, ['In glowing condition', 'In good condition'], ['Condition is poor — health comes first', 'Condition could be better']);
  if (w('deportment')) {
    if (q.deportment >= 0.78) notes.push({ text: bond >= 60 ? 'Settled and confident — clearly well kept' : 'Poised and confident on the bench', weight: 7 + bond / 20, tone: 'good' });
    else if (q.deportment >= 0.62 && bond >= 50) notes.push({ text: 'Calm on the bench — it trusts its keeper', weight: 5, tone: 'good' });
    else if (q.deportment < 0.5) notes.push({ text: bond < 30 ? 'A little nervous on the bench — more time with you will help' : 'Unsettled by the show hall', weight: 6, tone: 'bad' });
  }
  if (w('rarity') && sp) {
    if (q.rarity >= 0.75) notes.push({ text: `A rare ${c.morphName || 'morph'} — the judges lingered`, weight: 8, tone: 'good' });
    else if (q.rarity <= 0.25) notes.push({ text: 'A common morph for this class', weight: 2, tone: 'neutral' });
  }
  if (prime.phase === 'young') notes.push({ text: 'Still maturing — it will show better in a few days', weight: 3, tone: 'neutral' });
  else if (prime.phase === 'past' && prime.f < 0.96) notes.push({ text: 'A little past its prime', weight: 3, tone: 'neutral' });
  else if (prime.phase === 'elder') notes.push({ text: 'A veteran — past its prime, but shown with dignity', weight: 3, tone: 'neutral' });
  else if (prime.phase === 'prime') notes.push({ text: 'In its prime', weight: 1.5, tone: 'good' });
  return { expected, criteria, notes };
}

// ───────────────────────────── aquascapes ─────────────────────────────

/** Broad biogeographic region of a species, from its native-range text ('domestic' for man-made forms). */
export function biotopeRegion(sp: SpeciesDefinition | undefined): string {
  if (!sp) return 'unknown';
  const r = (sp.nativeRegion ?? '').toLowerCase();
  if (/domestic|trade form|no wild range|developed in/.test(r)) return 'domestic';
  if (/amazon|orinoco|paran|rio negro|peru|colombia|venezuela|guiana|brazil|ecuador|south america/.test(r)) return 'south_america';
  if (/mexico|xochimilco|p[aá]tzcuaro|central america/.test(r)) return 'central_america';
  if (/africa|congo|cameroon|nigeria|gabon|kenya|tanzania|mozambique/.test(r) && !/red sea|indo-pacific/.test(r)) return 'africa';
  if (/atlantic|caribbean|florida|gulf of mexico|bahamas|bermuda/.test(r)) return 'atlantic';
  if (/indo-pacific|pacific|red sea|indian ocean|great barrier|philippines|indonesia|sulawesi|banggai|hawai|reef/.test(r)) return 'indo_pacific';
  if (/japan|china|taiwan|korea|guangdong|hainan/.test(r)) return 'east_asia';
  if (/india|ganges|kerala|karnataka|bangladesh|nepal|sri lanka/.test(r)) return 'south_asia';
  if (/mekong|thailand|vietnam|laos|cambodia|malaysia|sumatra|borneo|java|sundaland/.test(r)) return 'southeast_asia';
  return 'other';
}

const REGION_LABEL: Record<string, string> = {
  south_america: 'the Amazon and South America',
  central_america: 'Mexico',
  africa: 'African waters',
  atlantic: 'the western Atlantic',
  indo_pacific: 'the Indo-Pacific reef',
  east_asia: 'East Asian streams',
  south_asia: 'South Asian rivers',
  southeast_asia: 'Southeast Asia',
  other: 'one habitat',
};

/** Composition credit an untouched gifted layout keeps (the rest is earned by the scaper's own placements). */
const SCAPER_HAND_FLOOR = 0.12;

const COMPAT_Q: Record<string, number> = { excellent: 1, usually_compatible: 0.95, conditional: 0.8, high_risk: 0.55, incompatible: 0.3 };

export function assessTank(state: GameState, tank: Tank, def: ShowClassDef): EntryAssessment {
  const report = beautyScore(state, tank);
  const factor = (label: string) => report.factors.find((f) => f.label === label)?.value;
  const animals = Object.values(state.creatures).filter((c) => c.tankId === tank.id && (c.status === 'alive' || c.status === 'listed'));
  const q: Partial<Record<ShowCriterionKey, number>> = {};
  // Judges are far harder to impress than the everyday beauty score (which any full, healthy tank pushes into the
  // 90s): composition is the strict critique — a dominant focal point on a third, real depth, an open lane, choice
  // material, botanical richness — on a steep curve, then scaled by the scaper's own hand: the layout the tank came
  // with is a club-level entry however pretty it is.
  const critique = scapeCritique(tank, report);
  const gifted = giftedLayoutShare(state, tank);
  const craft = Math.pow(clamp01((critique.composition - 0.58) / 0.38), 2);
  q.composition = craft * (SCAPER_HAND_FLOOR + (1 - SCAPER_HAND_FLOOR) * (1 - gifted));
  const lifeHealth = factor('Plant & coral health');
  const maturity = factor('Maturity');
  q.living = lifeHealth === undefined ? 0.2 : clamp01((lifeHealth / 100) * (0.7 + 0.3 * clamp01((maturity ?? 60) / 100)));
  const verdict = tank.cache?.compatVerdict ?? 'excellent';
  q.welfare = animals.length === 0 ? 0.75 : clamp01((num(tank.cache?.welfare, 70) / 100) * (COMPAT_Q[verdict] ?? 0.8) * (tank.cache?.animalStatus === 'danger' ? 0.6 : tank.cache?.animalStatus === 'watch' ? 0.88 : 1));
  const w = tank.water;
  q.clarity = clamp01(num(w?.clarity, 1) * (1 - num(w?.algae, 0) / 150) * (1 - num(w?.detritus, 0) / 200));
  const load = num(tank.cache?.stockingLoad, 0);
  q.stocking = animals.length === 0 ? 0.6 : load < 0.15 ? 0.6 + load * 2.67 : load <= 0.85 ? 1 : clamp01(1 - (load - 0.85) * 2.5);
  const regions = new Map<string, number>();
  let domestic = 0;
  for (const c of animals) {
    const reg = biotopeRegion(findSpecies(c.speciesId));
    if (reg === 'domestic') domestic++;
    else regions.set(reg, (regions.get(reg) ?? 0) + 1);
  }
  let topRegion = 'other';
  let topN = 0;
  for (const [k, v] of regions) {
    if (v > topN) {
      topN = v;
      topRegion = k;
    }
  }
  const speciesCount = new Set(animals.map((c) => c.speciesId)).size;
  // a biotope is a community: one species alone is only part of the picture
  q.biotope = animals.length === 0 ? 0 : clamp01((topN / animals.length) * (domestic > 0 ? 0.6 : 1) * (regions.size > 1 ? 0.85 : 1) * (speciesCount >= 2 ? 1 : 0.7));

  const criteria = criteriaFrom(def, q);
  const expected = clamp01(sumPoints(criteria) / 100) * 100;

  const notes: EntryAssessment['notes'] = [];
  const wt = (k: ShowCriterionKey) => def.standard[k] ?? 0;
  // composition: name the layout's strongest and weakest points from the judge's critique
  const comp = critique.factors.filter((f) => ['Focal point', 'Depth layering', 'Height & rhythm', 'Open water', 'Hardscape ↔ planting', 'Colour harmony', 'Texture contrast', 'Fullness', 'Material', 'Richness'].includes(f.label));
  const best = [...comp].sort((a, b) => b.value - a.value)[0];
  const worst = [...comp].sort((a, b) => a.value - b.value)[0];
  const GOOD: Record<string, string> = {
    'Focal point': 'A confident focal point draws the eye',
    'Depth layering': 'Beautiful depth, front to back',
    'Height & rhythm': 'A lovely rhythm of heights',
    'Open water': 'Generous open water lets it breathe',
    'Hardscape ↔ planting': 'Hardscape and planting in fine balance',
    'Colour harmony': 'Harmonious, restrained colour',
    'Texture contrast': 'Lovely contrast of fine and bold textures',
    Fullness: 'Lush and well filled',
    Material: 'Choice hardscape and plants throughout',
    Richness: 'A rich, varied planting',
  };
  const BAD: Record<string, string> = {
    'Focal point': 'The eye has nowhere to land — no clear focal point',
    'Depth layering': 'Flat — it needs more depth, front to back',
    'Height & rhythm': 'Heights feel uniform',
    'Open water': 'Crowded — little open water',
    'Hardscape ↔ planting': 'Hardscape and planting out of balance',
    'Colour harmony': 'Too many competing colours',
    'Texture contrast': 'Textures all alike',
    Fullness: 'Sparse — not yet filled in',
    Material: 'Everyday material — finer stone, wood or plants would lift it',
    Richness: 'Only a few kinds of plant or coral',
  };
  if (wt('composition')) {
    if (gifted >= 0.5) notes.push({ text: gifted >= 0.9 ? 'The layout the tank came with — the judges want to see the scaper’s own hand' : 'Still mostly the layout the tank came with — the judges want to see more of the scaper’s own hand', weight: 14, tone: 'bad' });
    else if (gifted >= 0.25) notes.push({ text: 'Part of the gifted layout still shows through', weight: 5, tone: 'neutral' });
    if (q.composition >= 0.8) notes.push({ text: best ? GOOD[best.label] ?? 'A striking composition' : 'A striking composition', weight: 12, tone: 'good' });
    else if (best && best.value >= 90) notes.push({ text: GOOD[best.label] ?? 'Some lovely touches', weight: 7, tone: 'good' });
    if (worst && worst.value < 60) notes.push({ text: BAD[worst.label] ?? 'The composition needs work', weight: 9 + (60 - worst.value) / 10, tone: 'bad' });
    else if (craft < 0.5 && gifted < 0.5) notes.push({ text: 'A pleasant layout, but not yet contest craft — every part must be deliberate', weight: 6, tone: 'bad' });
  }
  if (wt('living')) {
    if (q.living >= 0.85) notes.push({ text: tank.waterClass === 'reef' ? 'Corals open and thriving' : 'Lush, healthy growth', weight: 8, tone: 'good' });
    else if (q.living < 0.55) notes.push({ text: lifeHealth === undefined ? 'Little is growing yet' : 'Some plants or corals are struggling', weight: 8, tone: 'bad' });
  }
  if (wt('welfare')) {
    if (animals.length === 0) notes.push({ text: 'No animals — judged as a pure layout', weight: 3, tone: 'neutral' });
    else if (q.welfare >= 0.85) notes.push({ text: 'Calm, thriving animals — a joy to watch', weight: 7, tone: 'good' });
    else if (q.welfare < 0.65) notes.push({ text: 'The animals don’t look fully at ease', weight: 8, tone: 'bad' });
  }
  if (wt('clarity')) {
    if (q.clarity >= 0.92) notes.push({ text: 'Crystal-clear water and spotless glass', weight: 4, tone: 'good' });
    else if (q.clarity < 0.7) notes.push({ text: 'Algae or haze dulls the view', weight: 6, tone: 'bad' });
  }
  if (wt('stocking')) {
    if (load > 1) notes.push({ text: 'Overstocked for its size', weight: 7, tone: 'bad' });
    else if (animals.length > 0 && q.stocking >= 0.99) notes.push({ text: 'Sensibly stocked', weight: 2, tone: 'good' });
  }
  if (wt('biotope')) {
    if (q.biotope >= 0.9) notes.push({ text: `A convincing slice of ${REGION_LABEL[topRegion] ?? 'one habitat'}`, weight: 10, tone: 'good' });
    else if (domestic > 0) notes.push({ text: 'Domestic breeds have no wild habitat to recreate', weight: 9, tone: 'bad' });
    else if (regions.size > 1) notes.push({ text: 'Animals from different continents share this tank', weight: 9, tone: 'bad' });
    else if (speciesCount < 2 && animals.length > 0) notes.push({ text: `True to ${REGION_LABEL[topRegion] ?? 'one habitat'}, but one species is only part of the picture`, weight: 7, tone: 'neutral' });
  }
  const gal = tankGallons(tank);
  if (def.scape?.maxGallons && gal <= 10 && q.composition >= 0.7) notes.push({ text: 'A whole landscape in a tiny tank', weight: 3, tone: 'good' });
  return { expected, criteria, notes };
}

// ───────────────────────────── the card ─────────────────────────────

/** Pick 3–5 lines: the strongest positives and negatives first, then context. */
export function cardLines(a: EntryAssessment): string[] {
  const good = a.notes.filter((n) => n.tone === 'good').sort((x, y) => y.weight - x.weight);
  const bad = a.notes.filter((n) => n.tone === 'bad').sort((x, y) => y.weight - x.weight);
  const neutral = a.notes.filter((n) => n.tone === 'neutral').sort((x, y) => y.weight - x.weight);
  const out: string[] = [];
  const take = (list: typeof good, n: number) => {
    for (const x of list) {
      if (out.length >= 5 || n <= 0) break;
      if (!out.includes(x.text)) {
        out.push(x.text);
        n--;
      }
    }
  };
  take(good, 2);
  take(bad, 2);
  take(neutral, 1);
  take(good, 5);
  take(bad, 5);
  if (out.length < 3) {
    // fill with plain criterion readings so every card has at least three reasons
    for (const c of [...a.criteria].sort((x, y) => y.max - x.max)) {
      if (out.length >= 3) break;
      const word = c.q >= 0.75 ? 'strong' : c.q >= 0.55 ? 'sound' : 'modest';
      const line = `${c.label}: ${word}`;
      if (!out.includes(line)) out.push(line);
    }
  }
  return out.slice(0, 5);
}

/** Build the card: the criteria points plus the judge's eye add up to the score shown. */
export function buildCard(a: EntryAssessment, judge: string, eye: number): JudgeCard {
  const criteria: JudgeCriterion[] = a.criteria.map((c) => ({ key: c.key, label: c.label, points: c.points, max: c.max }));
  criteria.push({ key: 'judge', label: 'Judge’s eye', points: round1(eye), max: 0 });
  return { judge, lines: cardLines(a), criteria };
}

/** The judge's small, honest element of luck (bounded). */
export function judgeEye(rng: Rng): number {
  return Math.max(-JUDGE_MAX, Math.min(JUDGE_MAX, rng.gauss() * JUDGE_SD));
}

// ───────────────────────────── the field ─────────────────────────────

/** Normal CDF (Abramowitz–Stegun erf approximation). */
export function normCdf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

/**
 * Chances against a tier's field for an entry expected to score `expected` (the judge's eye folded into the
 * spread): P(win) and P(ribbon = top 3).
 */
export function fieldChances(tier: ShowTier, expected: number, field: number): { win: number; ribbon: number } {
  const t = SHOW_TIERS[tier];
  const sd = Math.sqrt(t.npcSd * t.npcSd + JUDGE_SD * JUDGE_SD);
  const p = normCdf((expected - t.npcMean) / sd); // chance one rival scores lower
  const n = Math.max(0, Math.round(field));
  const win = Math.pow(p, n);
  // P(at most 2 rivals beat it)
  let ribbon = 0;
  let comb = 1;
  for (let k = 0; k <= Math.min(2, n); k++) {
    if (k > 0) comb = (comb * (n - k + 1)) / k;
    ribbon += comb * Math.pow(1 - p, k) * Math.pow(p, n - k);
  }
  return { win: clamp01(win), ribbon: clamp01(ribbon) };
}

/** Plain quality band for an expected show score (the same four words as the potentials). */
export function scoreBand(expected: number): 'Ordinary' | 'Promising' | 'Exceptional' | 'Remarkable' {
  if (expected >= 82) return 'Remarkable';
  if (expected >= 70) return 'Exceptional';
  if (expected >= 57) return 'Promising';
  return 'Ordinary';
}

/** One-line outlook against a show's field. */
export function chanceWord(c: { win: number; ribbon: number }): string {
  if (c.win >= 0.45) return 'Strong contender';
  if (c.ribbon >= 0.55) return 'Good chance of a ribbon';
  if (c.ribbon >= 0.2) return 'In with a chance';
  if (c.ribbon >= 0.05) return 'Outside chance';
  return 'Long shot at this level';
}
