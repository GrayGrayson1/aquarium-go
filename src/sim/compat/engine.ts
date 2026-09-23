/**
 * Data-driven compatibility evaluator. OWNER: lane "waterlab".
 *
 * Works on "members" (one per species: counts, sexes, sizes, creature ids) plus a tank context, so it is pure and
 * testable without the game state. Every rule reads species DATA (tags, ranges, temperament numbers, social rules,
 * exception rules) — no species ids are hard-coded.
 *
 * Verdict = worst reason, where severity maps to: critical → incompatible, warning → high risk, caution → conditional,
 * info → usually compatible. Exception rules can only make a verdict worse (verdictFloor). Mitigation (cover, hides,
 * sight breaks, tank size, target feeding, nurseries) lowers incident probabilities — never below 35 % of the base —
 * and never upgrades a biological mismatch (real predation stays at least high risk).
 */
import type {
  CompatCategory,
  CompatPair,
  CompatReason,
  CompatReport,
  CompatVerdict,
  ConspecificOutcome,
  Environment,
  SpeciesDefinition,
  SubstrateKind,
  TankPurpose,
  WaterClass,
  CompatExceptionRule,
  ActivityZone,
} from '@/types';
import type { TankHabitat } from '../aquascape';
import { cap, lower, plural, the, Subj, youngNoun, numberWord, joinAnd, SUBSTRATE_NAMES, CLASS_NAMES } from './text';
import { preyFits, preyReachCm } from './predation';
import { withArticle } from '../economy/util'; // lane:w2-ui ("An ocellaris clownfish was stung…")
import { fitsEnvironment, offIdealEnvironmentNote, sharedEnvironments, waterNeedPhrase } from './salinity'; // lane:brackish

// ───────────────────────────── contracts ─────────────────────────────

export interface IncidentRisk {
  kind: 'predation' | 'aggression' | 'fin_nip' | 'gill_nip' | 'harassment' | 'feeding_exclusion' | 'coral_nip' | 'sting';
  actorSpeciesId: string;
  targetSpeciesId: string;
  /** Specific individuals when relevant (e.g. two male bettas). */
  actorIds?: string[];
  targetIds?: string[];
  /** Probability per game-day that an incident happens (already mitigated by cover/size/hides). */
  perDay: number;
  /** If the incident kills/removes the target. */
  lethal: boolean;
  /** Targets only eggs/fry/juveniles/shrimplets (life lane applies to clutches/juveniles). */
  youngOnly?: boolean;
  /**
   * Predation: the largest prey (cm, for a full-grown predator) that can be killed — see ./predation.ts preyReachCm.
   * The life lane scales it by the predator's current size. Absent → the predator's mouth size.
   */
  maxPreyCm?: number;
  text: string; // "The goldfish may eat cherry shrimp."
}

export interface MemberIndividual {
  id: string;
  sizeCm: number;
  sex: 'male' | 'female' | 'unknown';
  adult: boolean;
}

export interface CompatMember {
  species: SpeciesDefinition;
  count: number;
  males: number;
  females: number;
  unknown: number;
  adults: number;
  juveniles: number;
  minSizeCm: number;
  maxSizeCm: number;
  individuals: MemberIndividual[];
  creatureIds: string[];
  isCandidate?: boolean;
}

export interface CompatContext {
  /** Pure species-vs-species mode (encyclopedia): skip tank-fit checks. */
  neutral: boolean;
  tankId?: string;
  gallons: number;
  dimsIn: { l: number; w: number; h: number };
  waterClass: WaterClass;
  environment: Environment;
  purpose: TankPurpose;
  habitat: TankHabitat;
  substrate: { kind: SubstrateKind; depthCm: number };
  /** 0 very_low .. 3 high; null = unknown. */
  flowIndex: number | null;
  /** 0 dim, 1 moderate, 2 bright; null = unknown. */
  lightLevel: number | null;
  expectedTempC: number | null;
  salinitySG: number | null;
  /** Current tank pH (null = unknown / neutral mode). */
  pH?: number | null;
  hasLid: boolean;
  ageDays: number;
  bioMaturity: number;
  pods: number;
  algae: number;
  anemones: number;
  corals: number;
  spaceCapUnits: number;
  processCapUnits: number;
  /** Species with eggs/fry/young currently in this tank (young-predation reasons become visible). */
  clutchSpecies?: string[];
  /** Stinging cnidarians in the decor (anemones, Euphyllia-type LPS, fire coral) — matches `tag:stinging_cnidarian`. */
  stinging?: number;
  /** Tank glass thickness (mm) and material, for strike-risk animals. */
  glassMm?: number;
  material?: 'glass' | 'acrylic' | 'panoramic';
}

export interface CompatEvaluation {
  report: CompatReport;
  incidents: IncidentRisk[];
}

// ───────────────────────────── helpers ─────────────────────────────

const VERDICTS: CompatVerdict[] = ['excellent', 'usually_compatible', 'conditional', 'high_risk', 'incompatible'];
const vRank = (v: CompatVerdict) => VERDICTS.indexOf(v);
export const worseVerdict = (a: CompatVerdict, b: CompatVerdict): CompatVerdict => (vRank(a) >= vRank(b) ? a : b);
type Sev = CompatReason['severity'];
const SEV_RANK: Record<Sev, number> = { positive: 0, info: 1, caution: 2, warning: 3, critical: 4 };
const SEV_VERDICT: Record<Sev, CompatVerdict> = { positive: 'excellent', info: 'usually_compatible', caution: 'conditional', warning: 'high_risk', critical: 'incompatible' };
const VERDICT_SEV: Record<CompatVerdict, Sev> = { excellent: 'positive', usually_compatible: 'info', conditional: 'caution', high_risk: 'warning', incompatible: 'critical' };
const SEV_PENALTY: Record<Sev, number> = { positive: -2, info: 3, caution: 9, warning: 22, critical: 45 };
const downgrade = (s: Sev): Sev => (s === 'critical' ? 'warning' : s === 'warning' ? 'caution' : s === 'caution' ? 'info' : s);

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const clamp01 = (v: number) => clamp(v, 0, 1);
const round3 = (v: number) => Math.round(v * 1000) / 1000;
/** Per-day probability → chance of at least one incident per game-week. */
const weekly = (pDay: number) => 1 - Math.pow(1 - clamp(pDay, 0, 0.99), 7);

const YOUNG_TAGS = ['fry', 'eggs', 'shrimp_fry', 'amphibian_larva'];
const FLOW_NAMES = ['very gentle', 'gentle', 'moderate', 'strong'];
const FLOW_INDEX: Record<string, number> = { very_low: 0, low: 1, moderate: 2, high: 3 };
const LIGHT_INDEX: Record<string, number> = { dim: 0, moderate: 1, bright: 2 };

export const pairKey = (a: string, b: string) => (a <= b ? `${a}|${b}` : `${b}|${a}`);

function dietFactor(a: SpeciesDefinition): number {
  if (a.temperament === 'predatory') return 1.3;
  switch (a.diet) {
    case 'carnivore':
      return 1;
    case 'omnivore':
      return 0.8;
    case 'planktivore':
      return 0.45;
    case 'detritivore':
      return 0.35;
    case 'herbivore':
      return 0.15;
    default:
      return 0;
  }
}

function zones(sp: SpeciesDefinition): Set<ActivityZone> {
  return new Set(sp.activityZone ?? []);
}

/** 0..1 overlap of activity zones ('all' overlaps everything; bottom/substrate and upper/surface count as neighbours). */
function zoneOverlap(a: SpeciesDefinition, b: SpeciesDefinition): number {
  const za = zones(a);
  const zb = zones(b);
  if (za.has('all') || zb.has('all') || za.size === 0 || zb.size === 0) return 1;
  const near: Record<string, string[]> = { bottom: ['substrate', 'lower'], substrate: ['bottom'], surface: ['upper'], upper: ['surface', 'middle'], middle: ['upper', 'lower'], lower: ['middle', 'bottom'], decor: ['middle', 'lower'], glass: [] };
  let hits = 0;
  for (const z of za) {
    if (zb.has(z)) hits += 1;
    else if ((near[z] ?? []).some((n) => zb.has(n as ActivityZone))) hits += 0.4;
  }
  return clamp01(hits / Math.min(za.size, zb.size));
}

function youngTagsOf(b: SpeciesDefinition): string[] {
  const t = b.preyTags ?? [];
  if (t.includes('shrimp_dwarf') || t.includes('shrimp_large') || /shrimp/i.test(b.commonName)) return ['shrimp_fry', 'eggs'];
  if (b.category === 'amphibian') return ['amphibian_larva', 'eggs', 'fry'];
  if (t.includes('snail') || t.includes('snail_small')) return ['snail_small', 'eggs'];
  if (b.category === 'fish') return ['fry', 'eggs'];
  return ['eggs'];
}

/** Heuristic severities never exceed what an explicit species rule for this pair says (rules are better informed). */
function capByRule(out: { ruleSeverity: Map<string, Sev> }, key: string, sev: Sev): Sev {
  const r = out.ruleSeverity.get(`${key}:a`);
  if (!r) return sev;
  return SEV_RANK[sev] > SEV_RANK[r] ? r : sev;
}

/** Species whose young routinely appear in a community tank without any help from the keeper. */
function readyBreeder(b: SpeciesDefinition): boolean {
  const s = b.breeding?.system;
  return s === 'shrimp_berried' || s === 'livebearer' || (b.social?.kind === 'colony' && s !== 'not_in_game' && s !== 'snail_egg_clutch');
}

function hasPositive(x: SpeciesDefinition, y: SpeciesDefinition): boolean {
  return (x.positiveInteractions ?? []).some((pi) => (pi.other.startsWith('tag:') ? (y.preyTags ?? []).includes(pi.other.slice(4)) || y.group === pi.other.slice(4) : pi.other === y.id));
}

function breedsIn(b: SpeciesDefinition, env: Environment): boolean {
  const s = b.breeding?.system;
  if (!s || s === 'not_in_game' || s === 'fragmentation') return false;
  if (s === 'shrimp_larval_marine' && env === 'freshwater') return false;
  return true;
}

/** Tag matching for exception rules: the other species' preyTags, group, genus or id. */
function ruleMatches(rule: CompatExceptionRule, other: SpeciesDefinition): string | null {
  if (rule.other.startsWith('tag:')) {
    const t = rule.other.slice(4);
    if ((other.preyTags ?? []).includes(t) || other.group === t || other.genus === t || other.id === t) return t;
    return null;
  }
  return rule.other === other.id ? other.id : null;
}

// ───────────────────────────── collector ─────────────────────────────

interface RX extends CompatReason {
  floor?: CompatVerdict;
  key: string;
}

class Collector {
  reasons: RX[] = [];
  incidents: IncidentRisk[] = [];
  flags = new Set<string>();
  ruleSeverity = new Map<string, Sev>();
  constructor(readonly ctx: CompatContext) {}

  add(r: Omit<RX, 'speciesIds'> & { speciesIds: string[] }): void {
    this.reasons.push({ ...r, probability: r.probability !== undefined ? round3(r.probability) : undefined });
  }
  flag(k: string): void {
    this.flags.add(k);
  }
  has(k: string): boolean {
    return this.flags.has(k);
  }
  incident(i: IncidentRisk): void {
    if (!(i.perDay > 0)) return;
    const perDay = round3(clamp(i.perDay, 0, 0.95));
    // one incident per actor → target, kind and age class (keep the highest risk)
    const dup = this.incidents.find((x) => x.kind === i.kind && x.actorSpeciesId === i.actorSpeciesId && x.targetSpeciesId === i.targetSpeciesId && !!x.youngOnly === !!i.youngOnly);
    if (dup) {
      if (perDay > dup.perDay) Object.assign(dup, { ...i, perDay });
      return;
    }
    this.incidents.push({ ...i, perDay });
  }

  finish(members: CompatMember[]): CompatEvaluation {
    // dedupe identical text for the same species set
    const seen = new Set<string>();
    const rs: RX[] = [];
    for (const r of this.reasons) {
      const k = `${r.text}|${[...r.speciesIds].sort().join(',')}`;
      if (seen.has(k)) continue;
      seen.add(k);
      rs.push(r);
    }
    const reasonVerdict = (r: RX): CompatVerdict => (r.floor ? worseVerdict(SEV_VERDICT[r.severity], r.floor) : SEV_VERDICT[r.severity]);
    rs.sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity] || vRank(reasonVerdict(b)) - vRank(reasonVerdict(a)) || (b.probability ?? 0) - (a.probability ?? 0));

    let verdict: CompatVerdict = 'excellent';
    let penalty = 0;
    let positives = 0;
    for (const r of rs) {
      verdict = worseVerdict(verdict, reasonVerdict(r));
      if (r.severity === 'positive') positives++;
      else penalty += SEV_PENALTY[r.floor ? VERDICT_SEV[worseVerdict(SEV_VERDICT[r.severity], r.floor)] : r.severity];
    }
    const score = scoreFor(verdict, 100 - penalty + Math.min(6, positives * 2));

    // pairs (every species pair, plus conspecific groups)
    const pairs: CompatPair[] = [];
    const ids = members.map((m) => m.species.id);
    const strip = (r: RX): CompatReason => {
      const { floor: _f, key: _k, ...rest } = r;
      void _f;
      void _k;
      return rest;
    };
    for (let i = 0; i < members.length; i++) {
      for (let j = i; j < members.length; j++) {
        if (i === j && members[i].count < 2) continue;
        const k = pairKey(ids[i], ids[j]);
        const prs = rs.filter((r) => r.key === k);
        const v = prs.reduce<CompatVerdict>((acc, r) => worseVerdict(acc, reasonVerdict(r)), 'excellent');
        pairs.push({ a: ids[i], b: ids[j], verdict: v, reasons: prs.map(strip) });
      }
    }
    const perSpecies: CompatReport['perSpecies'] = {};
    for (const id of ids) {
      const prs = rs.filter((r) => r.speciesIds.includes(id));
      perSpecies[id] = { verdict: prs.reduce<CompatVerdict>((acc, r) => worseVerdict(acc, reasonVerdict(r)), 'excellent'), reasons: prs.map(strip) };
    }
    return { report: { verdict, score, reasons: rs.map(strip), pairs, perSpecies }, incidents: this.incidents };
  }
}

function scoreFor(verdict: CompatVerdict, raw: number): number {
  const band: Record<CompatVerdict, [number, number]> = {
    incompatible: [0, 15],
    high_risk: [16, 40],
    conditional: [41, 65],
    usually_compatible: [66, 84],
    excellent: [85, 100],
  };
  const [lo, hi] = band[verdict];
  return Math.round(clamp(raw, lo, hi));
}

// ───────────────────────────── mitigation ─────────────────────────────

type Mit = NonNullable<CompatExceptionRule['mitigatedBy']>[number];

function mitFactor(kinds: readonly Mit[], ctx: CompatContext, a: CompatMember, b: CompatMember): number {
  let f = 1;
  const h = ctx.habitat;
  for (const k of kinds) {
    switch (k) {
      case 'cover':
        f *= 1 - 0.45 * clamp01(h.cover ?? 0);
        break;
      case 'hides': {
        const need = Math.max(2, (b.species.hidesNeeded || 1) * b.count);
        f *= 1 - 0.35 * clamp01((h.hides ?? 0) / need);
        break;
      }
      case 'sight_breaks':
        f *= 1 - 0.4 * clamp01(h.sightBreak ?? 0);
        break;
      case 'tank_size': {
        const need = Math.max(a.species.recommendedMinTankGallons, b.species.recommendedMinTankGallons, 5);
        f *= clamp(Math.sqrt((need * 1.5) / Math.max(1, ctx.gallons)), 0.45, 1);
        break;
      }
      case 'target_feeding':
        f *= b.species.feedingStyle === 'target_fed' || b.species.specialBehaviors?.includes('target_feed') ? 0.6 : 0.85;
        break;
      case 'nursery':
        f *= ctx.purpose === 'nursery' || ctx.purpose === 'breeding' ? 0.5 : 0.85;
        break;
    }
  }
  return f;
}
const mitigate = (base: number, f: number) => base * Math.max(0.35, f);

// ───────────────────────────── per-species (tank fit) ─────────────────────────────

function speciesChecks(m: CompatMember, ctx: CompatContext, out: Collector): void {
  const sp = m.species;
  const key = `species:${sp.id}`;
  const ids = [sp.id];
  const name = plural(sp);
  const cids = m.creatureIds.length ? m.creatureIds : undefined;
  const add = (severity: Sev, category: CompatCategory, text: string, extra: Partial<RX> = {}) => out.add({ severity, category, text, speciesIds: ids, creatureIds: cids, key, ...extra });

  // Environment & class
  // lane:brackish — one salinity model shared with the purchase gate (./salinity.ts): mollies may live in fresh water,
  // marine animals only in brackish water they tolerate.
  const envOk = fitsEnvironment(sp, ctx.environment);
  if (!envOk) {
    add('critical', 'water', `${cap(name)} need ${waterNeedPhrase(sp)} — they cannot survive in a ${ctx.environment} tank.`);
    return; // nothing else matters
  }
  const envNote = offIdealEnvironmentNote(sp, ctx.environment);
  if (envNote) add('info', 'salinity', `${cap(name)}: ${envNote}.`);
  if (!sp.waterClasses.includes(ctx.waterClass)) {
    const where = joinAnd(sp.waterClasses.map((c) => CLASS_NAMES[c] ?? c));
    add('caution', 'tank', `${cap(name)} are normally kept in ${where} tanks, not a ${CLASS_NAMES[ctx.waterClass] ?? ctx.waterClass} setup.`);
  }
  if (ctx.expectedTempC !== null) {
    const t = ctx.expectedTempC;
    const r = sp.tempC;
    if (t > r.max + 0.2 || t < r.min - 0.2) {
      add('warning', 'temperature', `This tank runs at about ${t.toFixed(0)} °C — too ${t > r.max ? 'warm' : 'cold'} for ${name} (${r.min}–${r.max} °C).`, {
        mitigation: t > r.max ? (sp.special?.coolWater ? 'A chiller set to the middle of their range fixes this.' : 'Lower the heater setting.') : 'Install or raise a heater.',
      });
    } else if (t > r.idealMax + 0.5 || t < r.idealMin - 0.5) {
      add('info', 'temperature', `At about ${t.toFixed(0)} °C this tank is outside the ideal ${r.idealMin}–${r.idealMax} °C for ${name}.`, { mitigation: 'Adjust the heater or chiller setting.' });
    }
  }
  // The tank's actual pH vs this species' range (e.g. soft-water tetras in a hard, alkaline community tank).
  if (ctx.pH !== undefined && ctx.pH !== null && Number.isFinite(ctx.pH)) {
    const p = ctx.pH;
    const r = sp.pH;
    // lane:w2-sim — the water report's bands: past the tolerated range is a caution (WATCH: stress only) up to 0.3 pH
    // and a warning beyond (DANGER: harm); tolerated but off-ideal is a note (GOOD).
    const past = p > r.max ? p - r.max : p < r.min ? r.min - p : 0;
    if (past > 0) {
      add(past > 0.3 ? 'warning' : 'caution', 'chemistry', `This tank's pH is about ${p.toFixed(1)} — too ${p > r.max ? 'alkaline' : 'acidic'} for ${name} (pH ${r.min}–${r.max}).`, {
        mitigation: p > r.max ? 'Softer water, driftwood or almond leaves bring pH down slowly — or choose a species suited to this water.' : 'Buffer the water (and do regular water changes) to raise pH — or choose a species suited to this water.',
      });
    } else if (p > r.idealMax + 0.3 || p < r.idealMin - 0.3) {
      add('info', 'chemistry', `At pH ${p.toFixed(1)} this tank is outside the ideal ${r.idealMin}–${r.idealMax} for ${name} — tolerated, not ideal.`);
    }
  }
  if (sp.salinitySG && ctx.salinitySG !== null && ctx.salinitySG > 1.003) {
    const r = sp.salinitySG;
    if (ctx.salinitySG > r.max + 0.001 || ctx.salinitySG < r.min - 0.001)
      add('warning', 'salinity', `Salinity ${ctx.salinitySG.toFixed(3)} is outside the safe range for ${name} (${r.min.toFixed(3)}–${r.max.toFixed(3)}).`);
  }

  // Size vs tank (always judged at ADULT size)
  const minGal = sp.recommendedMinTankGallons;
  const juvNote = m.adults === 0 && m.count > 0 ? ' Juveniles fit for now, but they grow.' : '';
  if (ctx.gallons < minGal * 0.5) {
    add('critical', 'size', `This tank is far too small for an adult ${lower(sp.commonName)} (${sp.adultSizeCm} cm) — it needs at least ${minGal} gallons.${juvNote}`);
  } else if (ctx.gallons < minGal) {
    add('warning', 'size', `An adult ${lower(sp.commonName)} (${sp.adultSizeCm} cm) needs at least ${minGal} gallons; this tank holds ${ctx.gallons}.${juvNote}`, {
      mitigation: 'Plan a larger tank before it reaches adult size.',
    });
  } else if (sp.special?.outgrowsSmallTanks && ctx.gallons < minGal * 1.5) {
    add('info', 'size', `${cap(name)} grow large quickly — this tank is at the lower limit.`);
  }
  const fp = sp.recommendedFootprint;
  if (fp && ctx.dimsIn.l < fp.minLengthIn - 0.5) {
    add(sp.activeSwimmer ? 'warning' : 'caution', 'size', sp.activeSwimmer ? 'This fish requires more swimming length than this tank provides.' : `${cap(name)} need a tank at least ${fp.minLengthIn} in long.`, {
      mitigation: `Choose a tank at least ${fp.minLengthIn} in long.`,
    });
  } else if (fp && ctx.dimsIn.w < fp.minWidthIn - 0.5) {
    add('caution', 'size', `${cap(name)} need more front-to-back depth (${fp.minWidthIn} in) to turn and patrol.`);
  }

  // Group / social needs
  const s = sp.social;
  if (s && m.count < s.minGroup) {
    const schooling = s.kind === 'school' || s.kind === 'shoal';
    const sev: Sev = schooling || (s.kind === 'group' && m.count === 1) ? 'warning' : 'caution';
    const alone = m.count === 1 ? (schooling ? ' Kept alone it will be stressed, pale and shy.' : ' Alone it will not show natural behaviour.') : '';
    add(sev, 'social', `This species needs a group of at least ${numberWord(s.minGroup)}.${alone}`, { mitigation: `Keep ${s.idealGroup}+ together.` });
  }
  if (s?.maxPer10Gallons && m.count > 1) {
    const allowed = Math.max(1, Math.floor((s.maxPer10Gallons * ctx.gallons) / 10));
    if (m.count > allowed)
      add('warning', 'social', `Too many ${name} for this tank — territorial ${name} need about ${Math.round(10 / s.maxPer10Gallons)} gallons each (room for ${allowed} here).`, {
        mitigation: 'A larger tank with many sight breaks.',
      });
  }

  // Substrate
  const avoid = sp.substrateRules?.avoid ?? [];
  if (avoid.includes(ctx.substrate.kind)) {
    const note = sp.substrateRules.note ?? '';
    const ingest = /swallow|ingest|impact/i.test(note) || sp.category === 'amphibian';
    add(
      ingest ? 'warning' : 'caution',
      'habitat',
      ingest
        ? `${cap(name)} can swallow ${SUBSTRATE_NAMES[ctx.substrate.kind] ?? ctx.substrate.kind} while feeding — a real risk of impaction.`
        : `${cap(name)} do poorly on ${SUBSTRATE_NAMES[ctx.substrate.kind] ?? ctx.substrate.kind}.`,
      { mitigation: `Use ${joinAnd((sp.substrateRules.preferred ?? []).slice(0, 3).map((k) => SUBSTRATE_NAMES[k] ?? k))} instead.` },
    );
  }
  if (sp.special?.burrower && (ctx.substrate.depthCm < 5 || ['bare', 'large_pebbles', 'gravel'].includes(ctx.substrate.kind))) {
    add('caution', 'habitat', `${cap(name)} dig burrows and need a deep, soft sand bed (5 cm or more).`);
  }

  // Hides & cover
  const groupy = ['school', 'shoal', 'colony', 'group'].includes(sp.social?.kind ?? '');
  const hidesNeed = Math.min(12, (sp.hidesNeeded ?? 0) * Math.max(1, Math.ceil(m.count / (groupy ? 4 : 1))));
  if (hidesNeed > 0 && (ctx.habitat.hides ?? 0) < hidesNeed * 0.6) {
    add('caution', 'habitat', `${cap(name)} need about ${hidesNeed} hiding place${hidesNeed > 1 ? 's' : ''}; this tank has ${Math.floor(ctx.habitat.hides ?? 0)}.`, {
      mitigation: 'Add caves, rockwork or dense plants.',
    });
  }
  if ((sp.coverPreference ?? 0) >= 0.6 && (ctx.habitat.cover ?? 0) < sp.coverPreference - 0.35) {
    add('caution', 'habitat', `${cap(name)} want dense cover; in an open tank they become stressed${sp.territoriality >= 0.5 ? ' and more aggressive' : ''}.`, {
      mitigation: 'Add dense plants and sight breaks.',
    });
  }

  // Special needs
  const sn = sp.special ?? {};
  if (sn.requiresMatureDays && ctx.ageDays < sn.requiresMatureDays && ctx.bioMaturity < 0.98) {
    add('warning', 'tank', `${cap(name)} need a mature tank (running ${sn.requiresMatureDays}+ days with established biofilm); this one is ${Math.floor(ctx.ageDays) === 1 ? '1 day' : `${Math.floor(ctx.ageDays)} days`} old.`); // lane:w2-ui: no "1 days"
  }
  if (sn.needsPods && ctx.pods < 0.35) {
    add('warning', 'feeding', `${cap(name)} hunt copepods all day and starve without a thriving population — add mature live rock or a refugium.`);
  }
  if (sn.escapeArtist && !ctx.hasLid) {
    add('caution', 'tank', `${cap(name)} jump or climb out — this tank needs a lid.`, { mitigation: 'Install a glass lid.' });
  }
  if (sn.highOxygen && ctx.flowIndex !== null && ctx.flowIndex < (FLOW_INDEX[sp.flowPreference] ?? 1)) {
    // lane:w2-sim — same band as the water report: any shortfall of current is a real problem for these fish
    add('caution', 'flow', `${cap(name)} need fast-flowing, oxygen-rich water.`, { mitigation: 'Add a powerhead and an airstone.' });
  }
  if (sn.needsAlgaeOrBiofilm && ctx.algae < 5 && ctx.ageDays < 14) {
    add('caution', 'feeding', `${cap(name)} graze algae and biofilm — a new, spotless tank can starve them.`, { mitigation: 'Wait until the tank matures, and supplement with algae wafers.' });
  }

  // Flow & light
  if (ctx.flowIndex !== null) {
    // lane:w2-sim — the shared flow rule (water/env flowMismatch): two or more levels off is a caution (the water
    // report's WATCH); one level off is at most a note (the report's GOOD with advice) and never worse. One level too
    // still gets no reason here at all, so a gently filtered starter tank stays Excellent.
    const d = ctx.flowIndex - (FLOW_INDEX[sp.flowPreference] ?? 1);
    if (d >= 2)
      add('caution', 'flow', `The current here is too strong for ${name}, which want ${FLOW_NAMES[FLOW_INDEX[sp.flowPreference] ?? 1]} flow.`, {
        mitigation: 'Turn powerheads down or switch to a sponge filter.',
      });
    else if (d === 1) add('info', 'flow', `Flow is a little strong for ${name}.`, { mitigation: 'Turn the filter or powerhead down a notch.' }); // lane:qa-play: most small tanks have no powerhead
    else if (!sn.highOxygen && d <= -2) add('caution', 'flow', `${cap(name)} want ${FLOW_NAMES[FLOW_INDEX[sp.flowPreference] ?? 1]} flow; this water is too still.`, { mitigation: 'Add a powerhead.' });
  }
  if (ctx.lightLevel !== null) {
    const d = ctx.lightLevel - (LIGHT_INDEX[sp.lightPreference] ?? 1);
    if (d >= 2) add('caution', 'light', `${cap(name)} prefer dim, shaded water — this light is very bright.`, { mitigation: 'Lower the intensity or add floating plants and caves for shade.' });
    else if (d <= -2) add('info', 'light', `${cap(name)} prefer brighter light.`);
  }

  // Reef, anemones, plants
  const corals = ctx.corals;
  const coralRisk = sp.coralRisk ?? 0;
  if (corals > 0 && (coralRisk >= 0.5 || sp.reefSafe === 'unsafe')) {
    add('warning', 'reef', `Coral may be nipped — ${name} are not reef-safe.`, { probability: weekly(Math.max(coralRisk, 0.5) * 0.3) });
    out.incident({ kind: 'coral_nip', actorSpeciesId: sp.id, targetSpeciesId: 'coral', actorIds: cids, perDay: Math.max(coralRisk, 0.5) * 0.3, lethal: false, text: `The ${lower(sp.commonName)} is nipping at the corals.` });
  } else if (corals > 0 && (coralRisk >= 0.2 || sp.reefSafe === 'caution')) {
    add('caution', 'reef', `${cap(name)} may pick at some corals.`, { probability: weekly(coralRisk * 0.2) });
    out.incident({ kind: 'coral_nip', actorSpeciesId: sp.id, targetSpeciesId: 'coral', actorIds: cids, perDay: coralRisk * 0.2, lethal: false, text: `The ${lower(sp.commonName)} is picking at the corals.` });
  } else if (corals === 0 && ctx.waterClass === 'reef' && sp.reefSafe === 'unsafe') {
    add('info', 'reef', `${cap(name)} are not reef-safe — they will nip corals if you add them.`);
  }
  // Stinging cnidarians (anemones, Euphyllia-type LPS, fire coral) vs sting-sensitive animals.
  const stinging = ctx.stinging ?? ctx.anemones;
  let stingHandled = false;
  if (stinging > 0) {
    for (const rule of sp.exceptionRules ?? []) {
      if (rule.other !== 'tag:stinging_cnidarian') continue;
      const p = mitigate(rule.incidentRisk ?? 0.1, mitFactor(rule.mitigatedBy ?? [], ctx, m, m));
      const sev: Sev = SEV_OF_FLOOR(rule.verdictFloor) ?? 'warning';
      add(sev, 'reef', rule.reason, { floor: rule.verdictFloor, probability: weekly(p), mitigation: 'Remove anemones and stinging corals from this tank.' });
      out.incident({ kind: 'sting', actorSpeciesId: 'stinging_cnidarian', targetSpeciesId: sp.id, targetIds: cids, perDay: p, lethal: false, text: `${cap(withArticle(lower(sp.commonName)))} was stung by a coral or anemone.` });
      stingHandled = true;
    }
    if (!stingHandled && sn.stingSensitive) {
      add('warning', 'reef', `Anemones and strongly stinging corals burn ${name} that perch on them.`, { mitigation: 'Keep this tank free of anemones and stinging corals.' });
      out.incident({ kind: 'sting', actorSpeciesId: 'stinging_cnidarian', targetSpeciesId: sp.id, targetIds: cids, perDay: 0.12, lethal: false, text: `${cap(withArticle(lower(sp.commonName)))} was stung by a coral or anemone.` });
      stingHandled = true;
    }
  }
  if (sn.glassStrikeRisk && ctx.material === 'glass' && (ctx.glassMm ?? 99) < 10) {
    add('warning', 'tank', `${cap(name)} strike hard enough to crack thin glass — this tank's ${ctx.glassMm} mm glass is at risk.`, { mitigation: 'Use an acrylic tank or glass at least 10 mm thick.' });
  }
  if (ctx.anemones > 0) {
    switch (stingHandled && sp.anemoneRelationship === 'prey_risk' ? 'handled' : sp.anemoneRelationship) {
      case 'prey_risk':
        add('warning', 'reef', `Anemones can sting and even eat ${name}.`, { mitigation: 'Keep anemones out of this tank.' });
        out.incident({ kind: 'sting', actorSpeciesId: 'anemone', targetSpeciesId: sp.id, targetIds: cids, perDay: 0.08, lethal: false, text: `${cap(withArticle(lower(sp.commonName)))} was stung by the anemone.` });
        break;
      case 'host_seeker':
        add('positive', 'reef', `${cap(name)} will likely move into the anemone and host in it.`);
        break;
      case 'harms_anemone':
        add('warning', 'reef', `${cap(name)} nip at anemones.`);
        break;
    }
  }
  if (sp.plantSafe === 'unsafe' && (ctx.waterClass === 'freshwater_planted' || (ctx.habitat.nitrateUptake ?? 0) > 0.1)) {
    add('caution', 'plants', `${cap(name)} uproot or eat live plants.`, { mitigation: 'Use hardy, rhizome plants tied to wood (anubias, java fern).' });
  } else if (sp.plantSafe === 'caution' && ctx.waterClass === 'freshwater_planted') {
    add('info', 'plants', `${cap(name)} may nibble delicate plants.`);
  }
}

// ───────────────────────────── conspecific ─────────────────────────────

function conspecific(m: CompatMember, ctx: CompatContext, out: Collector): void {
  const sp = m.species;
  const key = pairKey(sp.id, sp.id);
  const ids = [sp.id];
  const name = plural(sp);
  const r = sp.sameSpeciesRule;
  if (!r) return;
  const selfRule = (sp.exceptionRules ?? []).find((x) => x.other === sp.id);
  const maleIds = m.individuals.filter((i) => i.sex === 'male').map((i) => i.id);
  const femaleIds = m.individuals.filter((i) => i.sex === 'female').map((i) => i.id);
  const unknownIds = m.individuals.filter((i) => i.sex === 'unknown').map((i) => i.id);
  const self = { species: sp } as CompatMember;
  const mit = (base: number, lethal: boolean) => base * Math.max(lethal ? 0.75 : 0.35, mitFactor(['sight_breaks', 'hides', 'tank_size'], ctx, self, m));

  const outcome = (o: ConspecificOutcome, who: 'male' | 'female' | 'juvenile', actors: string[]) => {
    if (o === 'ok') return;
    const base = o === 'lethal' ? (selfRule?.incidentRisk ?? 0.7) : o === 'fight' ? 0.3 : 0.08;
    const p = mit(base, o === 'lethal');
    let sev: Sev = o === 'lethal' ? 'critical' : o === 'fight' ? 'warning' : 'caution';
    if (o === 'tension' && (ctx.habitat.sightBreak ?? 0) >= 0.6) sev = 'info';
    let text: string;
    if (who === 'juvenile') text = o === 'tension' ? `Young ${name} squabble when crowded.` : `Young ${name} bite each other when crowded or hungry.`;
    else if (o === 'lethal') text = who === 'male' ? (selfRule?.reason ?? 'Two adult males are likely to fight — often to serious injury.') : `Two adult females are likely to fight — often to serious injury.`;
    else if (o === 'fight') text = who === 'male' ? 'Two adult males are likely to fight.' : 'Two adult females are likely to fight.';
    else text = who === 'male' ? `Male ${name} spar and chase each other.` : `Female ${name} squabble over space.`;
    out.add({
      severity: sev,
      category: 'social',
      text,
      speciesIds: ids,
      creatureIds: actors.length ? actors : undefined,
      key,
      probability: weekly(p),
      mitigation: r.note ?? (o === 'tension' ? 'Dense plants and sight breaks help.' : 'Keep them apart.'),
    });
    out.incident({
      kind: 'aggression',
      actorSpeciesId: sp.id,
      targetSpeciesId: sp.id,
      actorIds: actors,
      targetIds: actors,
      perDay: p,
      lethal: o === 'lethal',
      text: `${cap(text)}`,
    });
  };

  if (sp.sexSystem === 'protandrous' && m.females === 0) {
    // Hierarchy species: juveniles/males sort themselves out and the dominant fish becomes female.
    if (m.count === 2) out.add({ severity: 'positive', category: 'social', text: `Two young ${name} will pair up — the dominant one becomes female.`, speciesIds: ids, key });
    else if (m.count >= 3 && (sp.social?.kind === 'pair_hierarchy' || sp.social?.kind === 'pair')) {
      out.add({ severity: 'caution', category: 'social', text: `Only one breeding pair forms; extra ${name} get chased by the pair.`, speciesIds: ids, key, mitigation: 'Keep a single pair unless the tank is very large.' });
      out.incident({ kind: 'harassment', actorSpeciesId: sp.id, targetSpeciesId: sp.id, perDay: mit(0.12, false), lethal: false, text: `The dominant ${lower(sp.commonName)} pair is chasing the others.` });
    }
    return;
  }

  if (m.males >= 2) outcome(r.maleMale, 'male', maleIds);
  if (m.females >= 2) outcome(r.femaleFemale, 'female', femaleIds);
  if (m.males >= 1 && m.females >= 1) {
    switch (r.mixed) {
      case 'breeding_only_temporary':
        out.add({
          severity: 'warning',
          category: 'breeding',
          text: `Males and females should only share a tank briefly, for supervised spawning — the male will harass the female.`,
          speciesIds: ids,
          key,
          mitigation: 'Separate them after spawning.',
        });
        out.incident({ kind: 'harassment', actorSpeciesId: sp.id, targetSpeciesId: sp.id, actorIds: maleIds, targetIds: femaleIds, perDay: mit(0.4, false), lethal: false, text: `The male ${lower(sp.commonName)} is harassing the female.` });
        break;
      case 'harassment': {
        const ok = m.females >= m.males * 2 && (ctx.habitat.cover ?? 0) >= 0.5;
        out.add({
          severity: ok ? 'info' : 'caution',
          category: 'social',
          text: `Male ${name} harass females — keep more females than males, with dense cover.`,
          speciesIds: ids,
          key,
        });
        out.incident({ kind: 'harassment', actorSpeciesId: sp.id, targetSpeciesId: sp.id, actorIds: maleIds, targetIds: femaleIds, perDay: mit(ok ? 0.06 : 0.15, false), lethal: false, text: `A male ${lower(sp.commonName)} is chasing the females.` });
        break;
      }
      case 'courtship_ok':
        out.add({ severity: 'positive', category: 'breeding', text: `A male and a female — they may court and breed.`, speciesIds: ids, key });
        break;
    }
  }
  const juveniles = m.individuals.filter((i) => !i.adult).map((i) => i.id);
  if (juveniles.length >= 2 || (juveniles.length >= 1 && m.count - juveniles.length >= 1)) outcome(r.juvenile, 'juvenile', juveniles);
  const unknownAdults = m.individuals.filter((i) => i.adult && i.sex === 'unknown').length;
  // A species' own rule about its conspecifics (e.g. "two dragonets compete for pods") applies whenever rivals may share.
  if (selfRule?.verdictFloor && (m.males >= 2 || unknownAdults >= 2 || juveniles.length >= 2 || (m.females >= 2 && r.femaleFemale !== 'ok'))) {
    const alreadySaid = out.reasons.some((x) => x.key === key && x.text === selfRule.reason);
    if (!alreadySaid) {
      const p = mit(selfRule.incidentRisk ?? 0.1, false);
      out.add({ severity: VERDICT_SEV[selfRule.verdictFloor] === 'positive' ? 'info' : VERDICT_SEV[selfRule.verdictFloor], category: 'social', text: selfRule.reason, speciesIds: ids, key, floor: selfRule.verdictFloor, probability: weekly(p) });
    }
  }
  if (unknownAdults >= 2 && (r.maleMale === 'fight' || r.maleMale === 'lethal')) {
    out.add({
      severity: r.maleMale === 'lethal' ? 'warning' : 'caution',
      category: 'social',
      text: `Their sexes aren't visible yet — if two turn out to be males, they are likely to fight.`,
      speciesIds: ids,
      creatureIds: unknownIds,
      key,
    });
  }
}

// ───────────────────────────── mutual pair checks ─────────────────────────────

function mutual(A: CompatMember, B: CompatMember, ctx: CompatContext, out: Collector): void {
  const a = A.species;
  const b = B.species;
  const key = pairKey(a.id, b.id);
  const ids = [a.id, b.id];
  const add = (severity: Sev, category: CompatCategory, text: string, extra: Partial<RX> = {}) => out.add({ severity, category, text, speciesIds: ids, key, ...extra });

  if (a.environment !== b.environment) {
    // lane:brackish — they can share a tank only if some water suits both (./salinity.ts), e.g. mollies with guppies
    // in hard fresh water; a figure-eight puffer and a neon tetra never.
    const brackishOk =
      sharedEnvironments(a, b).length > 0 && (!a.salinitySG || !b.salinitySG || Math.min(a.salinitySG.max, b.salinitySG.max) >= Math.max(a.salinitySG.min, b.salinitySG.min));
    if (!brackishOk) {
      add(
        'critical',
        'water',
        a.environment === 'brackish' || b.environment === 'brackish'
          ? `${Subj(a)} need ${waterNeedPhrase(a)}, while ${plural(b)} need ${waterNeedPhrase(b)}. No salinity suits both, so they can never share a tank.`
          : `${Subj(a)} live in ${a.environment === 'marine' ? 'the sea' : 'fresh water'} and ${plural(b)} in ${b.environment === 'marine' ? 'the sea' : 'fresh water'} — they can never share a tank.`,
      );
      return;
    }
  }
  // Species-only animals (e.g. a smashing mantis shrimp): any tank mate is at least high risk.
  for (const [x, y] of [
    [a, b],
    [b, a],
  ] as const) {
    if (x.special?.speciesOnly) add('warning', 'social', `${Subj(x)} should be kept on their own — ${plural(y)} and any other tank mates are at risk.`, { floor: 'high_risk', mitigation: 'Give it a species-only tank.' });
  }
  // Temperature
  const ov = Math.min(a.tempC.max, b.tempC.max) - Math.max(a.tempC.min, b.tempC.min);
  const iov = Math.min(a.tempC.idealMax, b.tempC.idealMax) - Math.max(a.tempC.idealMin, b.tempC.idealMin);
  const rng = (s: SpeciesDefinition) => `${s.tempC.min}–${s.tempC.max} °C`;
  if (ov < 0) add('critical', 'temperature', `Their temperature needs don't overlap at all (${lower(a.commonName)} ${rng(a)}, ${lower(b.commonName)} ${rng(b)}).`);
  else if (ov < 2) add('warning', 'temperature', `Temperature ranges barely overlap (${lower(a.commonName)} ${rng(a)}, ${lower(b.commonName)} ${rng(b)}).`);
  else if (iov < 0) add('caution', 'temperature', `Their ideal temperatures don't overlap — one of them will always be a little outside its comfort zone.`);
  // pH
  const pov = Math.min(a.pH.max, b.pH.max) - Math.max(a.pH.min, b.pH.min);
  if (pov < -0.3) add('warning', 'chemistry', `Their pH needs don't overlap (${a.pH.min}–${a.pH.max} vs ${b.pH.min}–${b.pH.max}).`);
  else if (pov < 0.1) add('caution', 'chemistry', `pH ranges barely overlap.`);
  // Salinity
  if (a.salinitySG && b.salinitySG) {
    const sov = Math.min(a.salinitySG.max, b.salinitySG.max) - Math.max(a.salinitySG.min, b.salinitySG.min);
    if (sov < 0) add('warning', 'salinity', `They need different salinity levels.`);
  }
  // Hardness
  if (a.gh && b.gh && Math.min(a.gh.max, b.gh.max) < Math.max(a.gh.min, b.gh.min)) add('caution', 'chemistry', `They prefer different water hardness (soft vs hard water).`);
  // Flow & light preferences
  const fd = Math.abs((FLOW_INDEX[a.flowPreference] ?? 1) - (FLOW_INDEX[b.flowPreference] ?? 1));
  if (fd >= 3) add('warning', 'flow', `They need very different water flow (${lower(a.commonName)}: ${FLOW_NAMES[FLOW_INDEX[a.flowPreference]]}, ${lower(b.commonName)}: ${FLOW_NAMES[FLOW_INDEX[b.flowPreference]]}).`);
  else if (fd === 2) add('caution', 'flow', `Their flow preferences differ — one wants ${FLOW_NAMES[FLOW_INDEX[a.flowPreference]]} water, the other ${FLOW_NAMES[FLOW_INDEX[b.flowPreference]]}.`);
  const ld = Math.abs((LIGHT_INDEX[a.lightPreference] ?? 1) - (LIGHT_INDEX[b.lightPreference] ?? 1));
  if (ld >= 2) add('caution', 'light', `One wants dim, shaded water and the other bright light.`, { mitigation: 'Provide shaded areas under floating plants or overhangs.' });
  // Same group / genus territorial conflict
  if (a.id !== b.id && !out.has(`rule:${key}`) && (a.group === b.group || a.genus === b.genus) && Math.max(a.territoriality, b.territoriality) >= 0.5) {
    const sameGenus = a.genus === b.genus;
    add(sameGenus ? 'warning' : 'caution', 'aggression', `Closely related, similar-looking species often fight: ${plural(a)} and ${plural(b)} treat each other as rivals.`, {
      mitigation: 'Add them at the same time, in a large tank with many sight breaks.',
    });
    out.flag(`aggr:${key}`);
  }
  // Positive interactions
  for (const [x, y] of [
    [a, b],
    [b, a],
  ] as const) {
    for (const pi of x.positiveInteractions ?? []) {
      const hit = pi.other.startsWith('tag:') ? (y.preyTags ?? []).includes(pi.other.slice(4)) || y.group === pi.other.slice(4) : pi.other === y.id;
      if (hit) add('positive', 'exception', pi.text);
    }
  }
}

// ───────────────────────────── directional pair checks (A acts on B) ─────────────────────────────

const SEV_OF_FLOOR = (v?: CompatVerdict): Sev | undefined => (v ? (VERDICT_SEV[v] === 'positive' ? undefined : VERDICT_SEV[v]) : undefined);

function applyExceptionRules(A: CompatMember, B: CompatMember, ctx: CompatContext, out: Collector): void {
  const a = A.species;
  const b = B.species;
  const key = pairKey(a.id, b.id);
  for (const rule of a.exceptionRules ?? []) {
    if (rule.other === a.id && a.id !== b.id) continue; // conspecific rules handled elsewhere
    const tag = ruleMatches(rule, b);
    if (!tag) continue;
    let kind: IncidentRisk['kind'];
    let actor = A;
    let target = B;
    const young = YOUNG_TAGS.includes(tag);
    if ((a.predatorTags ?? []).includes(tag)) kind = tag === 'long_fins' ? 'fin_nip' : tag === 'gills_external' ? 'gill_nip' : 'predation';
    else if ((b.predatorTags ?? []).some((t) => (a.preyTags ?? []).includes(t))) {
      kind = 'predation';
      actor = B;
      target = A;
    } else if (tag === 'long_fins') kind = 'fin_nip';
    else if (tag === 'gills_external') kind = 'gill_nip';
    else if ((a.predatorTags ?? []).some((t) => (b.preyTags ?? []).includes(t))) kind = 'predation';
    else if (/feed|food|eat faster|compet|outcompet|grab/i.test(rule.reason)) {
      kind = 'feeding_exclusion';
      if (b.feedingSpeed > a.feedingSpeed) {
        actor = B;
        target = A;
      }
    } else {
      if (b.aggression > a.aggression) {
        actor = B;
        target = A;
      }
      kind = actor.species.aggression >= 0.25 || actor.species.territoriality >= 0.5 ? 'aggression' : 'harassment';
    }
    const base = rule.incidentRisk ?? 0.1;
    const p = mitigate(base, mitFactor(rule.mitigatedBy ?? [], ctx, actor, target));
    const sev: Sev = SEV_OF_FLOOR(rule.verdictFloor) ?? (base >= 0.5 ? 'warning' : base >= 0.15 ? 'caution' : 'info');
    // Exception-rule predation is always "named" prey (the predator's data lists it), so tearing predators such as
    // pea puffers can kill prey about their own length — the same reach the life lane uses (./predation.ts).
    const fits = preyFits(actor.species, target.species, true);
    // Both species often describe the same relationship — report it once (keep the more severe wording).
    const prior = out.ruleSeverity.get(`${key}:${young ? 'y' : 'a'}`);
    if (prior === undefined || SEV_RANK[sev] > SEV_RANK[prior]) {
      out.ruleSeverity.set(`${key}:${young ? 'y' : 'a'}`, sev);
      out.add({
        severity: sev,
        category: kind === 'predation' ? 'predation' : kind === 'feeding_exclusion' ? 'feeding' : kind === 'fin_nip' || kind === 'gill_nip' || kind === 'aggression' ? 'aggression' : 'exception',
        text: rule.reason,
        speciesIds: [a.id, b.id],
        key,
        floor: rule.verdictFloor,
        probability: weekly(p),
        mitigation: rule.mitigatedBy?.length ? `Reduced (not removed) by ${joinAnd(rule.mitigatedBy.map((x) => x.replace('_', ' ')))}.` : undefined,
      });
    }
    out.incident({
      kind,
      actorSpeciesId: actor.species.id,
      targetSpeciesId: target.species.id,
      actorIds: actor.creatureIds.length ? actor.creatureIds : undefined,
      targetIds: young ? undefined : target.creatureIds.length ? target.creatureIds : undefined,
      perDay: p,
      lethal: kind === 'predation' && (young || fits),
      youngOnly: young || undefined,
      maxPreyCm: kind === 'predation' ? preyReachCm(actor.species, true) : undefined,
      text: rule.reason,
    });
    const dir = `${actor.species.id}>${target.species.id}`;
    out.flag(`rule:${key}`);
    out.flag(`${kind === 'predation' ? 'pred' : kind === 'fin_nip' ? 'fin' : kind === 'gill_nip' ? 'gill' : kind === 'feeding_exclusion' ? 'feed' : 'aggr'}:${dir}${young ? ':young' : ''}`);
    if (kind === 'aggression' || kind === 'harassment') out.flag(`aggr:${key}`);
  }
}

function directional(A: CompatMember, B: CompatMember, ctx: CompatContext, out: Collector): void {
  const a = A.species;
  const b = B.species;
  if (a.id === b.id) return;
  const key = pairKey(a.id, b.id);
  const ids = [a.id, b.id];
  const actorIds = A.creatureIds.length ? A.creatureIds : undefined;
  const targetIds = B.creatureIds.length ? B.creatureIds : undefined;
  const add = (severity: Sev, category: CompatCategory, text: string, extra: Partial<RX> = {}) => out.add({ severity, category, text, speciesIds: ids, key, ...extra });
  const dir = `${a.id}>${b.id}`;
  const df = dietFactor(a);
  const mouth = Math.max(0, a.maxLikelyPreySizeCm ?? 0);
  const isAnimal = b.category !== 'coral' && b.category !== 'anemone';

  // ── Predation of adults (tags + mouth-size heuristic) ──
  const adultTags = (a.predatorTags ?? []).filter((t) => !YOUNG_TAGS.includes(t) && (b.preyTags ?? []).includes(t));
  const sizeRatio = b.adultSizeCm / Math.max(0.1, mouth);
  let adultPredation = out.has(`pred:${dir}`);
  if (isAnimal && !adultPredation && df > 0) {
    if (adultTags.length && sizeRatio <= 1) {
      const ease = clamp01(1 - sizeRatio);
      const base = (0.15 + 0.35 * ease) * df;
      const p = mitigate(base, mitFactor(['cover', 'hides', 'tank_size'], ctx, A, B));
      const critical = a.temperament === 'predatory' && sizeRatio <= 0.6;
      add(critical ? 'critical' : 'warning', 'predation', critical ? `${Subj(a)} will hunt and eat ${plural(b)} — they fit easily in its mouth.` : `${Subj(a)} may eat ${plural(b)}.`, {
        probability: weekly(p),
        mitigation: critical ? 'No amount of cover makes this safe.' : 'Dense plants and plenty of hides reduce the risk, but won’t remove it.',
      });
      out.incident({ kind: 'predation', actorSpeciesId: a.id, targetSpeciesId: b.id, actorIds, targetIds, perDay: p, lethal: true, maxPreyCm: preyReachCm(a, true), text: `${cap(the(a))} may eat ${plural(b)}.` });
      adultPredation = true;
      out.flag(`pred:${dir}`);
    } else if (adultTags.length) {
      // Too big to swallow as adults — but small, young or moulting individuals are at risk.
      const small = B.individuals.filter((i) => i.sizeCm <= mouth);
      const p = mitigate(0.06 * df, mitFactor(['cover', 'hides'], ctx, A, B));
      add('caution', 'predation', `${Subj(a)} may attack ${plural(b)} — small, young or moulting individuals are most at risk.`, {
        probability: weekly(p),
        mitigation: 'Plenty of hiding places help.',
      });
      out.incident({ kind: 'harassment', actorSpeciesId: a.id, targetSpeciesId: b.id, actorIds, targetIds, perDay: p, lethal: false, text: `${cap(the(a))} is harassing the ${plural(b)}.` });
      if (small.length) {
        const ps = mitigate(0.25 * df, mitFactor(['cover', 'hides'], ctx, A, B));
        add('warning', 'predation', `Juvenile ${plural(b)} are still small enough for ${the(a)} to eat.`, { creatureIds: small.map((s) => s.id), probability: weekly(ps) });
        out.incident({ kind: 'predation', actorSpeciesId: a.id, targetSpeciesId: b.id, actorIds, targetIds: small.map((s) => s.id), perDay: ps, lethal: true, text: `${cap(the(a))} may eat the young ${plural(b)}.` });
      }
      out.flag(`pred:${dir}`);
    } else if (
      (a.temperament === 'predatory' && b.adultSizeCm <= mouth * 1.15 && a.adultSizeCm >= b.adultSizeCm * 1.3) ||
      (df >= 0.8 && b.adultSizeCm <= mouth * 0.7 && a.adultSizeCm >= b.adultSizeCm * 2)
    ) {
      // No tag, but the prey plainly fits in the mouth of a meat-eater (ambush predators swallow slender fish whole).
      const predatory = a.temperament === 'predatory';
      const p = mitigate((predatory ? 0.25 : 0.07) * df, mitFactor(['cover', 'hides', 'tank_size'], ctx, A, B));
      add(predatory ? 'warning' : 'caution', 'predation', `At ${b.adultSizeCm} cm, ${plural(b)} are small enough to fit in ${the(a)}'s mouth.`, { probability: weekly(p) });
      out.incident({ kind: 'predation', actorSpeciesId: a.id, targetSpeciesId: b.id, actorIds, targetIds, perDay: p, lethal: true, maxPreyCm: Math.max(mouth * 1.15, b.adultSizeCm), text: `${cap(the(a))} may swallow ${plural(b)}.` });
      adultPredation = true;
      out.flag(`pred:${dir}`);
    }
  }

  // ── Young (fry, shrimplets, larvae, eggs) ──
  if (isAnimal && breedsIn(b, ctx.environment) && !out.has(`pred:${dir}:young`)) {
    const yt = youngTagsOf(b);
    const tagYoung = (a.predatorTags ?? []).some((t) => yt.includes(t));
    const mouthYoung = a.frySafe !== 'safe' && (b.lifecycle?.hatchSizeCm ?? 1) <= mouth && df >= 0.35;
    if (tagYoung || mouthYoung) {
      const base = 0.35 + (0.3 * Math.min(1.3, df)) / 1.3;
      const p = mitigate(base, mitFactor(['cover', 'nursery'], ctx, A, B));
      const dense = (ctx.habitat.cover ?? 0) >= 0.5;
      const sev: Sev = adultPredation ? 'info' : dense ? 'info' : 'caution';
      const noun = youngNoun(b);
      // Only worth a visible reason when young actually turn up: colony breeders (shrimp, livebearers) breed in
      // community tanks all the time; for others, only once a clutch is in this tank. The incident is always listed.
      if (readyBreeder(b) || (ctx.clutchSpecies ?? []).includes(b.id))
        add(
          sev,
          'breeding',
          adultPredation ? `${cap(noun)} are at even higher risk.` : `${cap(noun)} are at high predation risk even if adults are usually tolerated.`,
          { probability: weekly(p), mitigation: 'Dense moss and a separate nursery tank protect the young.' },
        );
      out.incident({ kind: 'predation', actorSpeciesId: a.id, targetSpeciesId: b.id, actorIds, perDay: p, lethal: true, youngOnly: true, text: `${cap(the(a))} may eat ${noun}.` });
      out.flag(`pred:${dir}:young`);
    }
  }

  // ── Fin nipping ──
  const longFins = b.hasLongFins || (b.preyTags ?? []).includes('long_fins');
  if (longFins && (a.finNipper ?? 0) >= 0.15 && !out.has(`fin:${dir}`)) {
    const p = mitigate(a.finNipper * 0.35 * (0.4 + 0.6 * zoneOverlap(a, b)), mitFactor(['sight_breaks', 'cover'], ctx, A, B));
    const sev: Sev = capByRule(out, key, a.finNipper >= 0.5 ? 'warning' : a.finNipper >= 0.25 ? 'caution' : 'info');
    add(sev, 'aggression', `${Subj(a)} may nip the long fins of ${plural(b)}.`, { probability: weekly(p), mitigation: 'Choose short-finned tank mates instead.' });
    out.incident({ kind: 'fin_nip', actorSpeciesId: a.id, targetSpeciesId: b.id, actorIds, targetIds, perDay: p, lethal: false, text: `${cap(the(a))} is nipping at the ${lower(b.commonName)}'s fins.` });
    out.flag(`fin:${dir}`);
  }

  // ── Gill nipping (external gills) ──
  if ((b.preyTags ?? []).includes('gills_external') && a.category === 'fish' && !out.has(`gill:${dir}`) && ((a.finNipper ?? 0) >= 0.05 || a.aggression >= 0.25 || a.feedingStyle === 'picker')) {
    const sev: Sev = a.finNipper >= 0.3 || a.aggression >= 0.5 ? 'warning' : 'caution';
    const p = mitigate(0.08 + a.finNipper * 0.4 + a.aggression * 0.2, mitFactor(['cover', 'sight_breaks'], ctx, A, B));
    add(sev, 'aggression', `${Subj(a)} may pick at ${the(b)}'s delicate external gills.`, { probability: weekly(p) });
    out.incident({ kind: 'gill_nip', actorSpeciesId: a.id, targetSpeciesId: b.id, actorIds, targetIds, perDay: p, lethal: false, text: `${cap(the(a))} is picking at the ${lower(b.commonName)}'s gills.` });
    out.flag(`gill:${dir}`);
  }

  // ── Aggression / territorial bullying ──
  if (!out.has(`aggr:${dir}`) && isAnimal && (a.aggression >= 0.3 || a.temperament === 'aggressive')) {
    const overlap = zoneOverlap(a, b);
    const bSmaller = b.adultSizeCm <= a.adultSizeCm * 1.2;
    const bPeaceful = b.temperament === 'peaceful';
    const invert = b.category === 'invertebrate';
    const partners = hasPositive(a, b) || hasPositive(b, a);
    let sev: Sev | null = null;
    if ((a.temperament === 'aggressive' || a.aggression >= 0.6) && overlap > 0.2 && bSmaller) sev = bPeaceful ? 'warning' : 'caution';
    else if (!invert && a.aggression >= 0.3 && a.territoriality >= 0.5 && bPeaceful && overlap > 0.3 && bSmaller) sev = 'caution';
    if (sev && (b.adultSizeCm >= a.adultSizeCm * 2 || invert)) sev = downgrade(sev);
    if (partners) sev = null;
    if (sev) sev = capByRule(out, key, sev);
    if (sev && !(adultPredation && sev !== 'warning')) {
      const crowd = clamp((a.recommendedMinTankGallons + b.recommendedMinTankGallons) / Math.max(1, ctx.gallons), 0.5, 2);
      const p = mitigate(a.aggression * (0.2 + 0.5 * overlap) * crowd * (bPeaceful ? 1.2 : 0.8) * 0.5, mitFactor(['sight_breaks', 'hides', 'tank_size'], ctx, A, B));
      add(sev, 'aggression', sev === 'warning' ? `${Subj(a)} are aggressive and likely to bully ${plural(b)}.` : `${Subj(a)} are territorial and may chase ${plural(b)}.`, {
        probability: weekly(p),
        mitigation: 'Sight breaks, caves and a bigger tank spread out territories.',
      });
      out.incident({ kind: 'aggression', actorSpeciesId: a.id, targetSpeciesId: b.id, actorIds, targetIds, perDay: p, lethal: false, text: `${cap(the(a))} is chasing the ${plural(b)}.` });
      out.flag(`aggr:${dir}`);
      out.flag(`aggr:${key}`);
    }
  }

  // ── Feeding competition ──
  const dietOverlap = (a.foods ?? []).some((f) => (b.foods ?? []).includes(f));
  const forager = ['grazer', 'scavenger', 'picker'].includes(b.feedingStyle) || b.diet === 'herbivore' || b.diet === 'detritivore' || b.diet === 'photosynthetic';
  const bSlow = !forager && (b.feedingSpeed <= 0.3 || b.feedingStyle === 'target_fed' || (b.preyTags ?? []).includes('fish_slow'));
  const gap = a.feedingSpeed - b.feedingSpeed;
  if (dietOverlap && bSlow && gap >= 0.3 && (a.feedingAggression >= 0.25 || a.feedingSpeed >= 0.6)) {
    const sev: Sev = capByRule(out, key, a.feedingAggression >= 0.5 || a.feedingSpeed >= 0.75 || gap >= 0.55 ? 'warning' : 'caution');
    const targetFed = b.feedingStyle === 'target_fed';
    const p = mitigate((0.15 + gap * 0.4) * (0.5 + a.feedingAggression), mitFactor(['target_feeding'], ctx, A, B));
    add(sev, 'feeding', `${Subj(a)} are likely to outcompete ${the(b)} at feeding.`, {
      probability: weekly(p),
      mitigation: targetFed ? 'Target feeding with tongs or a feeding station gives it a fair chance.' : 'Feed in several places at once, with sinking food for slow bottom feeders.',
    });
    out.incident({ kind: 'feeding_exclusion', actorSpeciesId: a.id, targetSpeciesId: b.id, actorIds, targetIds, perDay: p, lethal: false, text: `${cap(the(a))} is stealing food from the ${lower(b.commonName)}.` });
    out.flag(`feed:${dir}`);
  } else if (a.activeSwimmer && (b.preyTags ?? []).includes('fish_slow') && a.behaviorTraits?.cruiseSpeed >= 1 && !out.has(`aggr:${key}`)) {
    add('caution', 'social', `Fast, active swimmers stress slow ${plural(b)}.`);
  }

  // ── Breeding-season territoriality ──
  if (!ctx.neutral && ['male', 'female', 'both', 'male_mouth'].includes(a.parentalCare) && a.territoriality >= 0.4 && isAnimal) {
    const canPair = (A.males >= 1 && A.females >= 1) || (a.sexSystem === 'protandrous' && A.count >= 2);
    if (canPair && !out.has(`breed:${a.id}`)) {
      out.add({ severity: 'info', category: 'breeding', text: `When spawning, ${plural(a)} guard their eggs and chase tank mates away.`, speciesIds: [a.id], key: `species:${a.id}` });
      out.flag(`breed:${a.id}`);
    }
  }
}

// ───────────────────────────── tank-level ─────────────────────────────

function tankChecks(members: CompatMember[], ctx: CompatContext, out: Collector): void {
  let adultLoad = 0;
  let territorial = 0;
  for (const m of members) {
    adultLoad += m.species.bioload * m.count;
    if (m.species.territoriality >= 0.6) territorial += m.count;
  }
  const capacity = Math.max(0.1, Math.min(ctx.spaceCapUnits, ctx.processCapUnits));
  const load = adultLoad / capacity;
  const ids = members.map((m) => m.species.id);
  if (load > 1.15)
    out.add({
      severity: 'warning',
      category: 'tank',
      text: `When grown, these animals would need ${Math.round(load * 100)}% of this tank's capacity — expect unstable water and constant stress.`,
      speciesIds: ids,
      key: 'tank',
      mitigation: ctx.processCapUnits < ctx.spaceCapUnits ? 'A bigger filter helps; fewer animals help more.' : 'Use a larger tank or keep fewer animals.',
    });
  else if (load > 0.9)
    out.add({ severity: 'caution', category: 'tank', text: `This stocking is near the tank's limit once everyone is full-grown (${Math.round(load * 100)}%).`, speciesIds: ids, key: 'tank' });
  const territoryRoom = Math.max(1, Math.floor(ctx.gallons / 10) + 1);
  if (territorial > territoryRoom && members.length > 1)
    out.add({
      severity: 'caution',
      category: 'aggression',
      text: `Too many territorial animals for the space — expect constant squabbles.`,
      speciesIds: members.filter((m) => m.species.territoriality >= 0.6).map((m) => m.species.id),
      key: 'tank',
      mitigation: 'More rockwork and plants to break up territories, or a larger tank.',
    });
}

// ───────────────────────────── entry point ─────────────────────────────

export function evaluateComposition(members: CompatMember[], ctx: CompatContext): CompatEvaluation {
  const out = new Collector(ctx);
  const ms = members.filter((m) => m.count > 0);
  if (!ctx.neutral) for (const m of ms) speciesChecks(m, ctx, out);
  for (const m of ms) if (m.count >= 2 && (!ctx.neutral || ms.length === 1)) conspecific(m, ctx, out);
  for (let i = 0; i < ms.length; i++) {
    for (let j = i + 1; j < ms.length; j++) {
      applyExceptionRules(ms[i], ms[j], ctx, out);
      applyExceptionRules(ms[j], ms[i], ctx, out);
      mutual(ms[i], ms[j], ctx, out);
      directional(ms[i], ms[j], ctx, out);
      directional(ms[j], ms[i], ctx, out);
    }
  }
  if (!ctx.neutral && ms.length) tankChecks(ms, ctx, out);
  return out.finish(ms);
}

/** Build a member from explicit individuals. */
export function memberFrom(species: SpeciesDefinition, individuals: MemberIndividual[], isCandidate = false): CompatMember {
  const sizes = individuals.map((i) => i.sizeCm);
  return {
    species,
    count: individuals.length,
    males: individuals.filter((i) => i.sex === 'male').length,
    females: individuals.filter((i) => i.sex === 'female').length,
    unknown: individuals.filter((i) => i.sex === 'unknown').length,
    adults: individuals.filter((i) => i.adult).length,
    juveniles: individuals.filter((i) => !i.adult).length,
    minSizeCm: sizes.length ? Math.min(...sizes) : species.adultSizeCm,
    maxSizeCm: sizes.length ? Math.max(...sizes) : species.adultSizeCm,
    individuals,
    creatureIds: individuals.map((i) => i.id).filter((id) => !id.startsWith('candidate:')),
    isCandidate,
  };
}

/** Convenience: a member of `count` adults (sexes alternate male/female unless given). */
export function simpleMember(species: SpeciesDefinition, count: number, sex?: 'male' | 'female' | 'unknown' | 'mixed', sizeCm?: number): CompatMember {
  const inds: MemberIndividual[] = [];
  for (let i = 0; i < count; i++) {
    const sx = sex === undefined || sex === 'mixed' ? (i % 2 === 0 ? 'male' : 'female') : sex;
    inds.push({ id: `candidate:${species.id}:${i}`, sizeCm: sizeCm ?? species.adultSizeCm, sex: sx, adult: (sizeCm ?? species.adultSizeCm) >= species.adultSizeCm * 0.6 });
  }
  return memberFrom(species, inds, true);
}
