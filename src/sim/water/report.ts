/**
 * Plain-language water reports and per-species water comfort. OWNER: lane "waterlab".
 * Priority: "what is wrong and why", judged against the actual inhabitants' ranges (intersection) and water class.
 */
import { pluralPhrase } from '../economy/util';
import type { GameState, ParamStatus, SpeciesDefinition, StatusLevel, Tank, WaterIssue, WaterParamKey, WaterReport } from '@/types';
import { clamp, fmt, ammoniaToxicityWeight, nitrateThresholds, nitrifierTempFactor } from './chem';
import { CLASS_DEFAULTS, ROOM_TEMP_C } from './constants';
import { computeTankEnv, flowInfo, flowMismatch, FLOW_LABEL, type Inhabitant, type TankEnv, expectedTempC } from './env';
import { tankDailyCostImpl } from './kits';

const RANK: Record<StatusLevel, number> = { good: 0, watch: 1, danger: 2 };
const worst = (a: StatusLevel, b: StatusLevel): StatusLevel => (RANK[a] >= RANK[b] ? a : b);

export function comfortStatus(comfort: number): StatusLevel {
  return comfort >= 70 ? 'good' : comfort >= 40 ? 'watch' : 'danger';
}

/** pH units past a species' limits that only stress (WATCH, no harm); matches the welfare model's tolerance. */
const PH_TOLERANCE = 0.3;

// ───────────────────────────── naming helpers ─────────────────────────────

const lower = (s: string) => s.toLowerCase();
const pluralName = (common: string): string => pluralPhrase(lower(common));

/** "Mochi" / "your bettas" / "your betta" */
function whoOf(group: Inhabitant[]): string {
  const sp = group[0].species;
  if (group.length === 1) {
    const c = group[0].creature;
    return c.name && c.name !== sp.commonName ? `${c.name} (${lower(sp.commonName)})` : `your ${lower(sp.commonName)}`;
  }
  return `your ${pluralName(sp.commonName)}`;
}

function groupBySpecies(inh: Inhabitant[]): Inhabitant[][] {
  const m = new Map<string, Inhabitant[]>();
  for (const i of inh) {
    const g = m.get(i.species.id);
    if (g) g.push(i);
    else m.set(i.species.id, [i]);
  }
  return [...m.values()];
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

// ───────────────────────────── range judging ─────────────────────────────

interface RangeLike {
  min: number;
  max: number;
  idealMin: number;
  idealMax: number;
}

interface RangeJudgement {
  status: StatusLevel;
  ideal: string;
  reason?: string;
  high: boolean;
  low: boolean;
  offenders: string[];
}

function judgeRange(
  value: number,
  groups: Inhabitant[][],
  get: (s: SpeciesDefinition) => RangeLike | null,
  classRange: RangeLike | null,
  unit: string,
  digits: number,
  classLabel: string,
  /** Values up to this far past a species limit are WATCH (stress, no harm) rather than DANGER — used for pH. */
  tolerance = 0,
  /** lane:w2-sim — tolerated-but-not-ideal is a GOOD with a note (pH: the keeper can't change hardness mid-tank). */
  offIdealIsNote = false,
): RangeJudgement {
  const ranges = groups.map((g) => ({ g, r: get(g[0].species) })).filter((x): x is { g: Inhabitant[]; r: RangeLike } => !!x.r);
  const f = (v: number) => `${fmt(v, digits)}${unit}`;
  if (ranges.length === 0) {
    if (!classRange) return { status: 'good', ideal: '', high: false, low: false, offenders: [] };
    const r = classRange;
    const st: StatusLevel = value < r.min || value > r.max ? 'danger' : value < r.idealMin || value > r.idealMax ? 'watch' : 'good';
    return {
      status: st,
      ideal: `${fmt(r.idealMin, digits)}–${f(r.idealMax)} for a ${classLabel}`,
      reason: st === 'good' ? undefined : value > r.idealMax ? `Higher than a ${classLabel} usually runs.` : `Lower than a ${classLabel} usually runs.`,
      high: value > r.idealMax,
      low: value < r.idealMin,
      offenders: [],
    };
  }
  const iMin = Math.max(...ranges.map((x) => x.r.idealMin));
  const iMax = Math.min(...ranges.map((x) => x.r.idealMax));
  const tMin = Math.max(...ranges.map((x) => x.r.min));
  const tMax = Math.min(...ranges.map((x) => x.r.max));
  const who = joinNames(ranges.slice(0, 3).map((x) => whoOf(x.g)));
  let ideal: string;
  if (iMin <= iMax) ideal = `${fmt(iMin, digits)}–${f(iMax)} for ${who}`;
  else if (tMin <= tMax) ideal = `${fmt(tMin, digits)}–${f(tMax)} (no single ideal suits ${who})`;
  else ideal = `No value suits ${who} at once`;
  const tooHigh: string[] = [];
  const tooLow: string[] = [];
  const offIdealHigh: string[] = [];
  const offIdealLow: string[] = [];
  const nearHigh: string[] = [];
  const nearLow: string[] = [];
  for (const { g, r } of ranges) {
    const name = whoOf(g);
    if (value > r.max + tolerance) tooHigh.push(`${name} (max ${f(r.max)})`);
    else if (value < r.min - tolerance) tooLow.push(`${name} (min ${f(r.min)})`);
    else if (value > r.max) nearHigh.push(`${name} (max ${f(r.max)})`);
    else if (value < r.min) nearLow.push(`${name} (min ${f(r.min)})`);
    else if (value > r.idealMax) offIdealHigh.push(name);
    else if (value < r.idealMin) offIdealLow.push(name);
  }
  if (tooHigh.length || tooLow.length) {
    const parts: string[] = [];
    if (tooHigh.length) parts.push(`too high for ${joinNames(tooHigh)}`);
    if (tooLow.length) parts.push(`too low for ${joinNames(tooLow)}`);
    return { status: 'danger', ideal, reason: `${f(value)} is ${parts.join('; ')}.`, high: tooHigh.length > 0, low: tooLow.length > 0, offenders: [...tooHigh, ...tooLow] };
  }
  if (nearHigh.length || nearLow.length) {
    const parts: string[] = [];
    if (nearHigh.length) parts.push(`just above what ${joinNames(nearHigh)} tolerate`);
    if (nearLow.length) parts.push(`just below what ${joinNames(nearLow)} tolerate`);
    return { status: 'watch', ideal, reason: `${fmt(value, digits + 1)}${unit} is ${parts.join('; ')} — stressful, not yet harmful. Correct it gradually.`, high: nearHigh.length > 0, low: nearLow.length > 0, offenders: [...nearHigh, ...nearLow] };
  }
  if (offIdealHigh.length || offIdealLow.length) {
    const parts: string[] = [];
    if (offIdealHigh.length) parts.push(`a little high for ${joinNames(offIdealHigh)}`);
    if (offIdealLow.length) parts.push(`a little low for ${joinNames(offIdealLow)}`);
    return { status: offIdealIsNote ? 'good' : 'watch', ideal, reason: `Tolerated, but ${parts.join('; ')}.`, high: offIdealHigh.length > 0, low: offIdealLow.length > 0, offenders: [...offIdealHigh, ...offIdealLow] };
  }
  return { status: 'good', ideal, high: false, low: false, offenders: [] };
}

// ───────────────────────────── sensitivity helpers ─────────────────────────────

/** 1 for hardy animals, up to ~1.4 for delicate ones (seahorses, discus, axolotls). */
export function speciesSensitivity(sp: SpeciesDefinition): number {
  return clamp(1 + Math.max(0, 0.6 - sp.hardiness) + (sp.category === 'amphibian' ? 0.15 : 0) + (sp.category === 'invertebrate' ? 0.1 : 0), 1, 1.6);
}

function strictNitrate(species: SpeciesDefinition[]): boolean {
  return species.some(
    (s) => s.category === 'amphibian' || s.hardiness <= 0.45 || s.difficulty === 'expert' || s.category === 'coral' || (s.environment === 'freshwater' && s.difficulty === 'advanced'),
  );
}

function detoxActive(tank: Tank, hour?: number): boolean {
  const u = tank.water.lab?.detoxUntilHour;
  if (u === undefined) return false;
  return hour === undefined ? true : hour < u;
}

// ───────────────────────────── species comfort ─────────────────────────────

export function speciesWaterComfortImpl(species: SpeciesDefinition, tank: Tank): { comfort: number; harm: number; stressors: string[] } {
  const w = tank.water;
  const stressors: string[] = [];
  let pen = 0;
  let harm = 0;
  const name = pluralName(species.commonName);
  const sens = speciesSensitivity(species);

  // Hard salinity mismatch
  const sg = w.salinitySG ?? 1;
  if (species.environment === 'freshwater' && sg > Math.max(1.004, (species.salinitySG?.max ?? 1) + 0.002)) {
    return { comfort: 0, harm: 1, stressors: [`This is salt water — ${name} are freshwater animals and cannot survive here.`] };
  }
  if (species.environment === 'marine' && sg < Math.min(1.012, (species.salinitySG?.min ?? 1.02) - 0.004)) {
    return { comfort: 0, harm: 1, stressors: [`This water is far too fresh — ${name} are marine animals and cannot survive here.`] };
  }

  // Temperature
  const t = w.tempC;
  const tr = species.tempC;
  if (t > tr.max || t < tr.min) {
    const d = t > tr.max ? t - tr.max : tr.min - t;
    pen += Math.min(90, 45 + 20 * d);
    harm += Math.min(1, 0.12 + 0.18 * d);
    stressors.push(
      t > tr.max
        ? `Water is too warm: ${fmt(t, 1)} °C (${name} tolerate up to ${fmt(tr.max, 0)} °C, ideally ${fmt(tr.idealMin, 0)}–${fmt(tr.idealMax, 0)} °C).`
        : `Water is too cold: ${fmt(t, 1)} °C (${name} need at least ${fmt(tr.min, 0)} °C, ideally ${fmt(tr.idealMin, 0)}–${fmt(tr.idealMax, 0)} °C).`,
    );
  } else if (t > tr.idealMax || t < tr.idealMin) {
    const gap = t > tr.idealMax ? Math.max(0.5, tr.max - tr.idealMax) : Math.max(0.5, tr.idealMin - tr.min);
    const d = t > tr.idealMax ? t - tr.idealMax : tr.idealMin - t;
    pen += 25 * clamp(d / gap, 0, 1);
    stressors.push(`${fmt(t, 1)} °C is ${t > tr.idealMax ? 'warmer' : 'cooler'} than ideal (${fmt(tr.idealMin, 0)}–${fmt(tr.idealMax, 0)} °C).`);
  }

  // pH
  const p = w.pH;
  const pr = species.pH;
  if (p > pr.max || p < pr.min) {
    const d = p > pr.max ? p - pr.max : pr.min - p;
    pen += Math.min(70, 25 + 40 * d);
    // Marginal excursions (≤ PH_TOLERANCE past the limit) stress but don't injure; the welfare model uses the same band.
    if (d > PH_TOLERANCE) harm += Math.min(0.8, 0.05 + 0.3 * (d - PH_TOLERANCE));
    stressors.push(`pH ${fmt(p, 1)} is outside what ${name} tolerate (${fmt(pr.min, 1)}–${fmt(pr.max, 1)}).`);
  } else if (p > pr.idealMax || p < pr.idealMin) {
    // lane:w2-sim — tolerated but not ideal: a mild note (the report says GOOD), never harm.
    const gap = p > pr.idealMax ? Math.max(0.2, pr.max - pr.idealMax) : Math.max(0.2, pr.idealMin - pr.min);
    const d = p > pr.idealMax ? p - pr.idealMax : pr.idealMin - p;
    pen += 8 * clamp(d / gap, 0, 1);
    stressors.push(`pH ${fmt(p, 1)} is tolerated, though ${name} prefer ${fmt(pr.idealMin, 1)}–${fmt(pr.idealMax, 1)}.`);
  }

  // Salinity (marine / brackish species)
  if (species.salinitySG) {
    const r = species.salinitySG;
    // lane:brackish — estuary animals are euryhaline: water that is too fresh stresses them but harms them slowly.
    const estuaryFresh = species.environment === 'brackish' && sg < r.min;
    if (sg > r.max || sg < r.min) {
      const d = sg > r.max ? sg - r.max : r.min - sg;
      pen += Math.min(80, 30 + 4000 * d);
      harm += Math.min(1, 0.1 + 150 * d) * (estuaryFresh ? 0.35 : 1);
      stressors.push(
        estuaryFresh
          ? `Salinity ${fmt(sg, 3)} is too fresh for ${name} — they need brackish water (SG ${fmt(r.min, 3)}–${fmt(r.max, 3)}). Raise it slowly with salt mix.`
          : `Salinity ${fmt(sg, 3)} is outside the safe range (${fmt(r.min, 3)}–${fmt(r.max, 3)}).`,
      );
    } else if (sg > r.idealMax || sg < r.idealMin) {
      pen += 8;
      stressors.push(
        species.environment === 'brackish' && sg < r.idealMin && tank.environment === 'freshwater'
          ? `${name[0].toUpperCase()}${name.slice(1)} live in fresh water, but a little salt (SG ${fmt(r.idealMin, 3)}–${fmt(r.idealMax, 3)}) suits them best.`
          : `Salinity ${fmt(sg, 3)} is slightly off ideal (${fmt(r.idealMin, 3)}–${fmt(r.idealMax, 3)}).`,
      );
    }
  }

  // Nitrogen
  const detox = detoxActive(tank) ? 0.35 : 1;
  const nh = w.ammonia * ammoniaToxicityWeight(p, t) * detox * sens;
  if (nh > 0.15) {
    pen += Math.min(70, 60 * (nh - 0.1));
    // lane:w2-sim — harm starts where the report turns WATCH (weighted 0.25), never while it still says GOOD;
    // the slope keeps the same harm at the DANGER line (0.5).
    harm += Math.max(0, nh - 0.25) * 0.7;
    stressors.push(`Ammonia ${fmt(w.ammonia, 2)} ppm is burning gills${p >= 8 ? ' — at this high pH much more of it is in its toxic form' : ''}.`);
  }
  const marine = species.environment !== 'freshwater';
  const no2 = w.nitrite * (marine ? 0.25 : 1) * detox * sens;
  if (no2 > 0.15) {
    pen += Math.min(60, 40 * (no2 - 0.1));
    harm += Math.max(0, no2 - 0.25) * 0.5; // lane:w2-sim — from the report's WATCH line, as for ammonia
    stressors.push(`Nitrite ${fmt(w.nitrite, 2)} ppm stops blood carrying oxygen.`);
  }
  const [good, watch] = nitrateThresholds({ marine, reef: false, strict: strictNitrate([species]) });
  if (w.nitrate > good) {
    pen += Math.min(25, (w.nitrate - good) * 0.6);
    if (w.nitrate > watch) {
      harm += Math.min(0.3, (w.nitrate - watch) * 0.004 * sens);
      stressors.push(`Nitrate ${fmt(w.nitrate, 0)} ppm is high — long exposure weakens ${name}.`);
    } else stressors.push(`Nitrate ${fmt(w.nitrate, 0)} ppm is building up.`);
  }

  // Oxygen
  const need = species.special?.highOxygen ? 0.85 : 0.68;
  if (w.oxygen < need) {
    pen += Math.min(60, (need - w.oxygen) * 120);
    if (w.oxygen < 0.45) harm += (0.45 - w.oxygen) * 1.5;
    stressors.push(w.oxygen < 0.45 ? 'Oxygen is dangerously low — expect gasping at the surface.' : `Oxygen is lower than ${name} like${t > 26 ? ' (warm water holds less)' : ''}.`);
  }

  // Flow — lane:w2-sim: the shared rule (flowMismatch): one level off is a mild note, two or more is real stress.
  const fi = flowInfo(tank);
  const fm = flowMismatch(fi.index, species);
  if (fm === 'too_strong') {
    pen += 25;
    harm += species.flowPreference === 'very_low' || species.flowPreference === 'low' ? 0.04 : 0;
    stressors.push(`The current is far too strong (${FLOW_LABEL[fi.level]}) — ${name} want ${FLOW_LABEL[species.flowPreference]} flow and tire themselves out.`);
  } else if (fm === 'too_still') {
    pen += species.special?.highOxygen ? 18 : 6;
    stressors.push(`${cap(name)} want ${FLOW_LABEL[species.flowPreference]} flow; this water is too still.`);
  } else if (fm === 'bit_strong') {
    pen += 4;
    stressors.push(`Flow is a touch strong for ${name} — fine, though they'd like it ${FLOW_LABEL[species.flowPreference]}.`);
  } else if (fm === 'bit_still') {
    pen += 3;
    stressors.push(`The water is a touch still for ${name} — fine, though they'd like ${FLOW_LABEL[species.flowPreference]} flow.`);
  }

  // Low level for jumpers/air breathers doesn't hurt; skip. Recent shock handled by the life lane (water.shock).
  const comfort = clamp(100 - pen, 0, 100);
  return { comfort: Math.round(comfort * 10) / 10, harm: clamp(harm, 0, 1), stressors };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ───────────────────────────── the report ─────────────────────────────

interface IssueX extends WaterIssue {
  headline: string;
  weight: number;
}

const PARAM_PRIORITY: Partial<Record<WaterParamKey, number>> = {
  salinity: 10,
  ammonia: 9,
  temp: 9,
  nitrite: 8,
  oxygen: 8,
  ph: 6,
  filtration: 7,
  cycle: 5,
  nitrate: 5,
  stocking: 5,
  level: 4,
  kh: 4,
  flow: 3,
  light: 2,
  gh: 2,
  algae: 2,
  clarity: 2,
};

export function getWaterReportImpl(state: GameState, tankId: string): WaterReport {
  const tank = state.tanks[tankId];
  if (!tank) {
    return { tankId, status: 'good', headline: 'Tank not found', params: [], issues: [], stability: 0, cycleProgress: 0, stockingLoad: 0, dailyCost: 0 };
  }
  const env = computeTankEnv(state, tank);
  const w = tank.water;
  const d = CLASS_DEFAULTS[tank.waterClass] ?? CLASS_DEFAULTS.freshwater_tropical;
  const groups = groupBySpecies(env.inhabitants);
  const species = groups.map((g) => g[0].species);
  const hasAnimals = env.inhabitants.length > 0;
  const marine = env.salt;
  const reef = tank.waterClass === 'reef' || env.corals > 0;
  const s = env.summary;
  const params: ParamStatus[] = [];
  const issues: IssueX[] = [];
  const hour = state.clock?.hour;
  const add = (p: ParamStatus, headline?: string) => {
    params.push(p);
    if (p.status !== 'good' && p.reason) {
      issues.push({
        status: p.status,
        text: p.reason,
        advice: p.advice,
        param: p.key,
        headline: headline ?? `${p.label} needs attention`,
        weight: RANK[p.status] * 100 + (PARAM_PRIORITY[p.key] ?? 1),
      });
    }
  };

  // Temperature
  {
    const j = judgeRange(w.tempC, groups, (sp) => sp.tempC, d.temp, ' °C', 1, d.label);
    let advice: string | undefined;
    if (j.status !== 'good') {
      if (s.stuckHeaters.length) advice = 'A heater thermostat has stuck on — switch that heater off now.';
      else if (j.high)
        advice = s.chillers.length
          ? `Lower the chiller setting${s.heaterSet !== null ? ' and the heater' : ''}.`
          : s.heaterSet !== null && s.heaterSet > w.tempC - 1
            ? `Turn the heater down to about ${fmt(Math.max(...species.map((x) => x.tempC.idealMin), d.temp.idealMin) + 0.5, 0)} °C.`
            : `The room keeps this tank near ${ROOM_TEMP_C} °C. Add a chiller, or a clip-on fan for 1–2 °C of evaporative cooling.`;
      else
        advice = s.heaters.length
          ? s.failed.some((e) => e.def.kind === 'heater')
            ? 'A heater has failed — repair or replace it.'
            : 'Raise the heater setting (or add a second heater if it cannot keep up).'
          : 'Add a heater sized for this tank (about 3–5 W per gallon).';
    }
    add(
      { key: 'temp', label: 'Temperature', value: w.tempC, unit: '°C', display: `${fmt(w.tempC, 1)} °C`, status: j.status, ideal: j.ideal, reason: j.reason, advice },
      j.status === 'danger' ? (j.high ? 'Water is too warm' : 'Water is too cold') : j.high ? 'Water is a little warm' : 'Water is a little cool',
    );
  }

  // pH — lane:w2-sim: within every resident's TOLERATED range is GOOD (a note names who would prefer softer or harder
  // water: mixed soft- and hard-water tanks settle where their KH puts them, and the keeper can't fix that). Up to
  // PH_TOLERANCE past a limit is WATCH (stress, no harm, as in the welfare model); beyond that DANGER.
  {
    const j = judgeRange(w.pH, groups, (sp) => sp.pH, d.pH, '', 1, d.label, PH_TOLERANCE, true);
    let reason = j.reason;
    let advice: string | undefined;
    const ranges = species.map((sp) => sp.pH);
    const noCommon = ranges.length > 1 && Math.max(...ranges.map((r) => r.min)) > Math.min(...ranges.map((r) => r.max));
    if (j.status !== 'good') {
      advice = j.low
        ? w.kh < 2
          ? 'Carbonate hardness (KH) is exhausted, so acids are pulling pH down. Dose buffer and do a water change.'
          : 'Do a water change and dose buffer to raise KH. Check for rotting food or heavy CO₂ injection.'
        : 'Do small water changes with softer water; remove limestone or aragonite from soft-water tanks.';
      if (noCommon) {
        reason = `${reason ?? ''} No pH suits all of these animals at once — a compatibility problem, not a care one.`.trim();
        advice = 'Rehome one group to a tank with water that suits it.';
      }
    } else if (j.offenders.length) {
      const high = groups.filter((g) => w.pH > g[0].species.pH.idealMax).map(whoOf);
      const low = groups.filter((g) => w.pH < g[0].species.pH.idealMin).map(whoOf);
      const parts: string[] = [];
      if (high.length) parts.push(`${joinNames(high)} would prefer ${marine ? 'it a little lower' : 'softer, slightly more acidic water'}`);
      if (low.length) parts.push(`${joinNames(low)} would prefer ${marine ? 'it a little higher' : 'harder, more alkaline water'}`);
      reason = `pH ${fmt(w.pH, 1)} is fine for everyone here — ${parts.join('; ')}.`;
      advice =
        high.length && low.length
          ? 'Nothing to fix: this mix settles in between, which everyone tolerates.'
          : groups.length > 1
            ? 'Nothing to fix: tolerated water is fine long-term. Their ideal water is an option for a tank of their own.'
            : 'Nothing to fix: tolerated water is fine long-term.';
    }
    add({ key: 'ph', label: 'pH', value: w.pH, unit: '', display: fmt(w.pH, 2), status: j.status, ideal: j.ideal, reason, advice }, j.low ? 'pH is falling' : 'pH is off');
  }

  // Ammonia
  {
    const sens = species.length ? Math.max(...species.map(speciesSensitivity)) : 1;
    const detox = detoxActive(tank, hour);
    const tw = ammoniaToxicityWeight(w.pH, w.tempC);
    const weighted = w.ammonia * tw * sens * (detox ? 0.35 : 1);
    const st: StatusLevel = weighted >= 0.5 ? 'danger' : weighted >= 0.25 ? 'watch' : 'good';
    let reason: string | undefined;
    let advice: string | undefined;
    if (st !== 'good') {
      const causes: string[] = [];
      if (w.bioMaturity < 0.6) causes.push('the biological filter is still establishing');
      if (s.activeFilters.length === 0) causes.push(s.filters.length ? 'the filter is off or broken' : 'there is no filter');
      if (w.foodInWater > 5) causes.push('uneaten food is rotting');
      if (env.stockingLoad > 1) causes.push('there are more animals than the filter can handle');
      if (!causes.length) causes.push('waste is outpacing the filter');
      reason = `Ammonia ${fmt(w.ammonia, 2)} ppm — ${causes.join(', ')}.${w.pH >= 7.8 ? ` At pH ${fmt(w.pH, 1)} far more of it is in the toxic NH₃ form.` : ''}${detox ? ' (Partly bound by conditioner for now.)' : ''}`;
      advice = `Do a 30–50% water change, feed lightly for a day${detox ? '' : ' and dose conditioner to bind ammonia'}.${w.bioMaturity < 0.6 ? ' Bottled bacteria speeds up the cycle.' : ''}`;
    }
    add(
      { key: 'ammonia', label: 'Ammonia', value: w.ammonia, unit: 'ppm', display: `${fmt(w.ammonia, 2)} ppm`, status: st, ideal: '0 ppm', reason, advice },
      st === 'danger' ? 'Ammonia spike — act now' : 'Ammonia detected',
    );
  }

  // Nitrite
  {
    const sens = species.length ? Math.max(...species.map(speciesSensitivity)) : 1;
    const detox = detoxActive(tank, hour);
    const weighted = w.nitrite * (marine ? 0.25 : 1) * sens * (detox ? 0.35 : 1);
    const st: StatusLevel = weighted >= 0.5 ? 'danger' : weighted >= 0.25 ? 'watch' : 'good';
    const reason =
      st === 'good'
        ? undefined
        : `Nitrite ${fmt(w.nitrite, 2)} ppm — the second group of filter bacteria has not caught up${w.bioMaturity < 0.6 ? ' (normal mid-cycle)' : ''}. Nitrite stops blood carrying oxygen${marine ? ', although salt water softens it' : ''}.`;
    add(
      {
        key: 'nitrite',
        label: 'Nitrite',
        value: w.nitrite,
        unit: 'ppm',
        display: `${fmt(w.nitrite, 2)} ppm`,
        status: st,
        ideal: '0 ppm',
        reason,
        advice: st === 'good' ? undefined : 'Change 30–50% of the water and hold off on new animals until it reads zero.',
      },
      st === 'danger' ? 'Nitrite spike — act now' : 'Nitrite detected',
    );
  }

  // Nitrate
  {
    const strict = strictNitrate(species);
    const [good, watch] = nitrateThresholds({ marine, reef, strict });
    const st: StatusLevel = w.nitrate < good ? 'good' : w.nitrate < watch ? 'watch' : 'danger';
    const exporters: string[] = [];
    if (!(env.habitat.nitrateUptake > 0.05)) exporters.push(marine ? 'a refugium' : 'fast-growing plants');
    if (marine && s.skimmerExport === 0) exporters.push('a protein skimmer');
    add(
      {
        key: 'nitrate',
        label: 'Nitrate',
        value: w.nitrate,
        unit: 'ppm',
        display: `${fmt(w.nitrate, 0)} ppm`,
        status: st,
        ideal: `under ${good} ppm${strict ? ' (sensitive animals)' : reef ? ' (corals)' : ''}`,
        reason: st === 'good' ? undefined : `Nitrate ${fmt(w.nitrate, 0)} ppm — the end product of the nitrogen cycle keeps accumulating until water is changed.`,
        advice: st === 'good' ? undefined : `Do a 25–35% water change.${exporters.length ? ` ${cap(joinNames(exporters))} would export nitrate between changes.` : ''}`,
      },
      st === 'danger' ? 'Nitrate is high — change water soon' : 'Nitrate building — plan a water change',
    );
  }

  // Salinity (salt tanks only)
  if (marine) {
    const j = judgeRange(w.salinitySG, groups, (sp) => sp.salinitySG, d.sg, '', 3, d.label);
    let advice: string | undefined;
    const brackishTank = tank.waterClass === 'brackish';
    if (j.status !== 'good')
      advice = j.high
        ? brackishTank
          ? `Evaporation concentrates salt. Top off with fresh water, and mix the next water change a little weaker${s.ato ? '' : ' — an auto top-off keeps this steady'}.`
          : `Evaporation concentrates salt. Top off with fresh (RO) water${s.ato ? '' : ' — an auto top-off keeps this steady'}.`
        : brackishTank
          ? 'Brackish water needs only a little marine salt — about a third of reef strength. Dose salt mix gradually (no more than 0.001 a day) or do water changes with slightly saltier water.'
          : 'Dose salt mix gradually (about 0.001 per day) or do water changes with slightly saltier water.';
    add(
      { key: 'salinity', label: 'Salinity', value: w.salinitySG, unit: 'SG', display: fmt(w.salinitySG, 3), status: j.status, ideal: j.ideal, reason: j.reason, advice },
      j.high ? 'Salinity is creeping up' : 'Salinity is low',
    );
  }

  // Oxygen
  {
    const need = species.some((sp) => sp.special?.highOxygen) ? 0.85 : 0.7;
    const st: StatusLevel = w.oxygen >= need ? 'good' : w.oxygen >= need - 0.18 ? 'watch' : 'danger';
    const warm = w.tempC > 26.5;
    add(
      {
        key: 'oxygen',
        label: 'Oxygen',
        value: w.oxygen,
        unit: '%',
        display: `${Math.round(w.oxygen * 100)}%`,
        status: st,
        ideal: `above ${Math.round(need * 100)}%`,
        reason: st === 'good' ? undefined : `Dissolved oxygen is ${Math.round(w.oxygen * 100)}%${warm ? ' — warm water holds less oxygen' : ''}${env.stockingLoad > 0.9 ? ' and the tank is heavily stocked' : ''}.`,
        advice: st === 'good' ? undefined : 'Add an airstone or point a filter outlet at the surface — surface ripples are where oxygen gets in.',
      },
      st === 'danger' ? 'Oxygen is running low' : 'Oxygen is a little low',
    );
  }

  // KH (+ GH freshwater)
  {
    const kr = d.kh;
    const spK = species.filter((x) => x.kh).map((x) => x.kh!);
    const kMin = Math.max(kr.min, ...spK.map((k) => k.min));
    const kMax = Math.min(kr.max + 4, ...spK.map((k) => k.max));
    const st: StatusLevel = w.kh < Math.min(1, kMin * 0.5) || w.kh < (marine ? 5.5 : 0.8) ? 'danger' : w.kh < kMin - 0.3 || w.kh > kMax + 1 ? 'watch' : 'good';
    add(
      {
        key: 'kh',
        label: 'Carbonate hardness (KH)',
        value: w.kh,
        unit: 'dKH',
        display: `${fmt(w.kh, 1)} dKH`,
        status: st,
        ideal: `${fmt(kMin, 0)}–${fmt(Math.max(kMin, kMax), 0)} dKH`,
        reason: st === 'good' ? undefined : w.kh < kMin ? `KH ${fmt(w.kh, 1)} is low — it is the buffer that stops pH crashing${marine ? ' and corals use it to build skeletons' : ''}.` : `KH ${fmt(w.kh, 1)} is higher than your animals prefer.`,
        advice: st === 'good' ? undefined : w.kh < kMin ? `Dose buffer${marine ? ' or a coral supplement' : ''} and keep up with water changes.` : 'Use softer water for water changes.',
      },
      'KH buffer is low',
    );
    if (!marine && d.gh) {
      const spG = species.filter((x) => x.gh).map((x) => x.gh!);
      const gMin = Math.max(d.gh.min, ...spG.map((g) => g.min));
      const gMax = Math.min(d.gh.max, ...spG.map((g) => g.max));
      const stG: StatusLevel = w.gh < gMin - 2 || w.gh > gMax + 4 ? 'watch' : 'good';
      add(
        {
          key: 'gh',
          label: 'General hardness (GH)',
          value: w.gh,
          unit: 'dGH',
          display: `${fmt(w.gh, 0)} dGH`,
          status: stG,
          ideal: `${fmt(gMin, 0)}–${fmt(Math.max(gMin, gMax), 0)} dGH`,
          reason: stG === 'good' ? undefined : `GH ${fmt(w.gh, 0)} is ${w.gh < gMin ? 'softer' : 'harder'} than your animals prefer${w.gh < gMin && species.some((x) => x.category === 'invertebrate') ? ' — shrimp and snails need minerals to moult and build shells' : ''}.`,
          advice: stG === 'good' ? undefined : 'Adjust gradually with water changes.',
        },
        'Hardness is off',
      );
    }
  }

  // Cycle
  {
    const m = w.bioMaturity;
    const st: StatusLevel = m >= 0.75 ? 'good' : m >= 0.4 || !hasAnimals ? 'watch' : 'danger';
    add(
      {
        key: 'cycle',
        label: 'Biological filter',
        value: m,
        unit: '%',
        display: `${Math.round(m * 100)}% established`,
        status: st,
        ideal: 'fully established (cycled)',
        reason:
          st === 'good'
            ? undefined
            : `The beneficial bacteria that turn ammonia into nitrite and nitrate are only ${Math.round(m * 100)}% established${hasAnimals ? ' — expect ammonia and nitrite spikes' : ''}.`,
        advice:
          st === 'good'
            ? undefined
            : hasAnimals
              ? 'Dose bottled bacteria, move mature filter media from an established tank, and add animals slowly.'
              : 'Bacteria need an ammonia source: dose bottled bacteria or move mature filter media in, and drop a pinch of food daily (a "fishless cycle") before adding animals.',
      },
      hasAnimals ? 'Tank is still cycling' : 'Filter is still cycling',
    );
  }

  // Stocking
  {
    const load = env.stockingLoad;
    const st: StatusLevel = load < 0.85 ? 'good' : load < 1.05 ? 'watch' : 'danger';
    const limit = env.processCapUnits < env.spaceCapUnits ? 'filter capacity' : 'water volume';
    // lane:w2-sim — say why when cool water is part of it (filter bacteria work slower in the cold)
    const coolNote = limit === 'filter capacity' && nitrifierTempFactor(w.tempC, w.lab?.bioTempC) < 0.9 ? ' Cool water slows the filter bacteria, so a cool tank needs more filter for the same animals.' : '';
    add(
      {
        key: 'stocking',
        label: 'Stocking',
        value: load,
        unit: '%',
        display: `${Math.round(load * 100)}%`,
        status: st,
        ideal: 'under 85% of capacity',
        reason: st === 'good' ? undefined : `The animals produce ${Math.round(load * 100)}% of what this tank's ${limit} can comfortably handle — chemistry will swing.${coolNote}`,
        advice: st === 'good' ? undefined : limit === 'filter capacity' ? 'Upgrade or add a filter, or rehome some animals.' : 'Move some animals to another tank or upgrade to a larger aquarium.',
      },
      st === 'danger' ? 'Tank is overstocked' : 'Tank is nearly full',
    );
  }

  // Filtration
  {
    const turnover = s.filterGph / Math.max(1, env.gallons);
    const wasteNeed = (env.bioloadUnits + 0.0001) / Math.max(0.01, env.processCapUnits); // lane:w2-sim: temperature-aware
    let st: StatusLevel = 'good';
    let reason: string | undefined;
    let advice: string | undefined;
    const failedFilter = s.filters.find((e) => e.inst.failed);
    const offFilter = s.filters.find((e) => !e.inst.on && !e.inst.failed);
    if (s.activeFilters.length === 0) {
      st = hasAnimals ? 'danger' : 'watch';
      reason = failedFilter ? `The ${failedFilter.def.name} has failed.` : offFilter ? 'The filter is switched off — its bacteria are starving.' : 'There is no filter.';
      advice = failedFilter ? 'Repair or replace the filter.' : offFilter ? 'Switch the filter back on.' : 'Install a filter sized for this tank.';
    } else if (wasteNeed > 1.05) {
      st = 'danger';
      reason = 'Filter capacity is insufficient — the animals make more waste than the bacteria can process.';
      advice = 'Add a second filter or upgrade to a larger one.';
    } else if (turnover < 2 && !s.activeFilters.every((e) => e.def.visual === 'sponge_filter')) {
      st = 'watch';
      reason = `Water only passes through the filter ${fmt(turnover, 1)}× per hour.`;
      advice = 'Aim for 4–10× turnover per hour (sponge filters in gentle tanks are the exception).';
    } else if (failedFilter) {
      st = 'watch';
      reason = `The ${failedFilter.def.name} has failed; the remaining filters are carrying the load.`;
      advice = 'Repair or replace it.';
    }
    add(
      {
        key: 'filtration',
        label: 'Filtration',
        value: turnover,
        unit: '×/h',
        display: `${fmt(turnover, 1)}× per hour`,
        status: st,
        ideal: '4–10× per hour, capacity above the bioload',
        reason,
        advice,
      },
      st === 'danger' ? 'Filtration is failing' : 'Filtration needs attention',
    );
  }

  // Flow — lane:w2-sim: one level off a species' preference is a gentle note (GOOD, with advice); two or more levels
  // off is WATCH. Mixed tanks whose animals want neighbouring flows can always reach GOOD at a middle setting.
  {
    let st: StatusLevel = 'good';
    const tooStrong: string[] = [];
    const tooWeak: string[] = [];
    const bitStrong: string[] = [];
    const bitStill: string[] = [];
    for (const g of groups) {
      const m = flowMismatch(env.flow.index, g[0].species);
      if (m === 'too_strong') tooStrong.push(whoOf(g));
      else if (m === 'too_still') tooWeak.push(whoOf(g));
      else if (m === 'bit_strong') bitStrong.push(whoOf(g));
      else if (m === 'bit_still') bitStill.push(whoOf(g));
    }
    if (tooStrong.length || tooWeak.length) st = 'watch';
    const prefs = [...new Set(species.map((sp) => FLOW_LABEL[sp.flowPreference]))];
    let reason: string | undefined;
    let advice: string | undefined;
    if (st !== 'good') {
      reason = tooStrong.length ? `The current is too strong for ${joinNames(tooStrong)}.` : `The water is too still for ${joinNames(tooWeak)}.`;
      advice = tooStrong.length ? 'Turn powerheads down, or use a sponge filter for gentle flow.' : 'Add a small powerhead for more movement.';
    } else if (bitStrong.length || bitStill.length) {
      const parts: string[] = [];
      if (bitStrong.length) parts.push(`${joinNames(bitStrong)} would like it a touch gentler`);
      if (bitStill.length) parts.push(`${joinNames(bitStill)} a touch livelier`);
      reason = `Fine for everyone: ${parts.join('; ')}.`;
      advice =
        bitStrong.length && bitStill.length
          ? 'A middle setting suits this mix — no change needed.'
          : bitStrong.length
            ? 'Optional: turn the filter or powerhead down a notch.'
            : 'Optional: a small powerhead would add a little movement.';
    }
    add(
      {
        key: 'flow',
        label: 'Water flow',
        value: env.flow.turnover,
        unit: '×/h',
        display: `${cap(FLOW_LABEL[env.flow.level])} (${fmt(env.flow.turnover, 0)}×/h)`,
        status: st,
        ideal: prefs.length ? `${joinNames(prefs)} for your animals` : 'depends on your animals',
        reason,
        advice,
      },
      tooStrong.length ? 'Current is too strong' : 'Water is too still',
    );
  }

  // Light
  {
    const intensity = tank.lighting?.intensity ?? 1;
    const par = s.par * intensity;
    const photoperiod = ((tank.lighting.offHour - tank.lighting.onHour + 24) % 24) || 24;
    let st: StatusLevel = 'good';
    let reason: string | undefined;
    let advice: string | undefined;
    const lightLevel = par < 0.35 ? 0 : par < 0.75 ? 1 : 2;
    const dimLovers = groups.filter((g) => g[0].species.lightPreference === 'dim');
    const brightLovers = groups.filter((g) => g[0].species.lightPreference === 'bright');
    if (s.lights.length === 0) {
      st = hasAnimals || env.habitat.nitrateUptake > 0 || env.corals > 0 ? 'watch' : 'good';
      reason = s.failed.some((e) => e.def.kind === 'light') ? 'The light has burned out.' : 'No light is installed.';
      advice = 'Install a light — animals need a day/night rhythm, and plants and corals need light to live.';
    } else if (lightLevel === 2 && dimLovers.length) {
      st = 'watch';
      reason = `This light is bright for ${joinNames(dimLovers.map(whoOf))}, which prefer dim, shaded water.`;
      advice = 'Lower the intensity or add floating plants and caves for shade.';
    } else if (lightLevel === 0 && (brightLovers.length || env.corals > 0)) {
      st = 'watch';
      reason = env.corals > 0 ? 'Corals need stronger light to photosynthesise.' : `${cap(joinNames(brightLovers.map(whoOf)))} prefer bright light.`;
      advice = 'Raise the intensity or install a stronger light.';
    } else if (photoperiod > 11 && w.algae > 25) {
      st = 'watch';
      reason = `Lights are on ${photoperiod} hours a day — long photoperiods feed algae.`;
      advice = 'Shorten the photoperiod to about 8 hours.';
    }
    add(
      {
        key: 'light',
        label: 'Light',
        value: par,
        unit: '',
        display: s.lights.length ? `${['Low', 'Medium', 'High'][lightLevel]} · ${photoperiod} h/day` : 'None',
        status: st,
        ideal: 'matches your animals and plants',
        reason,
        advice,
      },
      'Lighting is a poor match',
    );
  }

  // Algae
  {
    const a = w.algae;
    const st: StatusLevel = a < 30 ? 'good' : a < 70 ? 'watch' : 'danger';
    add(
      {
        key: 'algae',
        label: 'Algae',
        value: a,
        unit: '%',
        display: `${Math.round(a)}%`,
        status: st,
        ideal: 'a light film at most',
        reason: st === 'good' ? undefined : `Algae is taking over (${Math.round(a)}%) — light plus nitrate with nothing to compete for it.`,
        advice: st === 'good' ? undefined : 'Scrape the glass, shorten the lighting to ~8 hours, change water, and add fast plants or algae grazers.',
      },
      'Algae is spreading',
    );
  }

  // Level
  {
    const lv = w.level;
    const st: StatusLevel = lv >= 0.95 ? 'good' : lv >= 0.87 ? 'watch' : 'danger';
    add(
      {
        key: 'level',
        label: 'Water level',
        value: lv,
        unit: '%',
        display: `${Math.round(lv * 100)}%`,
        status: st,
        ideal: 'full',
        reason: st === 'good' ? undefined : `${Math.round((1 - lv) * 100)}% has evaporated${marine ? ' — the salt stays behind, so salinity rises' : ''}${lv < 0.87 && s.filters.some((e) => e.def.visual === 'hob_filter') ? ' and the hang-on filter is sucking air' : ''}.`,
        advice: st === 'good' ? undefined : `Top off with fresh water${marine ? ' (never salt water)' : ''}.`,
      },
      'Water level is low',
    );
  }

  // Clarity
  {
    const c = w.clarity;
    const st: StatusLevel = c >= 0.85 ? 'good' : c >= 0.6 ? 'watch' : 'danger';
    const bloom = w.bioMaturity < 0.45 && w.ammonia > 0.15;
    add(
      {
        key: 'clarity',
        label: 'Clarity',
        value: c,
        unit: '%',
        display: `${Math.round(c * 100)}%`,
        status: st,
        ideal: 'crystal clear',
        reason:
          st === 'good'
            ? undefined
            : bloom
              ? 'A cloudy bacterial bloom — normal in a new tank; it clears as the filter matures.'
              : w.algae > 50
                ? 'Green water: free-floating algae.'
                : 'Suspended detritus and leftover food are clouding the water.',
        advice: st === 'good' ? undefined : bloom ? 'Be patient, feed lightly; a UV sterilizer clears it faster.' : 'Vacuum the substrate, rinse the filter sponge in tank water and feed less.',
      },
      'Water is cloudy',
    );
  }

  // Equipment-level issues
  if (s.conflict) {
    issues.push({
      status: 'watch',
      param: 'temp',
      text: `The heater is set to ${fmt(s.heaterSet ?? 0, 1)} °C but the chiller to ${fmt(s.chillerSet ?? 0, 1)} °C, so they fight each other — wasting power and making the temperature swing.`,
      advice: 'Set the heater at least 1 °C below the chiller setting.',
      headline: 'Heater and chiller are fighting',
      weight: 150,
    });
  }
  for (const e of s.failed) {
    if (e.def.kind === 'filter' || e.def.kind === 'light') continue; // covered by params
    const stuck = e.inst.failMode === 'stuck_on' && e.inst.on;
    const dangerous = e.def.kind === 'heater' || e.def.kind === 'chiller' || e.def.kind === 'ato';
    issues.push({
      status: stuck || (dangerous && hasAnimals) ? 'danger' : 'watch',
      text: stuck ? `The ${e.def.name}'s thermostat has stuck on — it is cooking the tank.` : `The ${e.def.name} has failed.`,
      advice: stuck ? 'Switch it off now, then repair or replace it.' : 'Repair or replace it.',
      headline: stuck ? 'Heater stuck on — overheating!' : `${e.def.name} has failed`,
      weight: stuck ? 300 : dangerous ? 205 : 110,
    });
  }
  // Undersized heater
  if (s.heaterSet !== null && !s.stuckHeaters.length) {
    const reach = expectedTempC(tank, s);
    if (reach < s.heaterSet - 0.6) {
      issues.push({
        status: 'watch',
        param: 'temp',
        text: `The heater is too small for this tank: it can only hold about ${fmt(reach, 1)} °C, short of the ${fmt(s.heaterSet, 1)} °C setting.`,
        advice: 'Add a second heater or install a more powerful one.',
        headline: 'Heater is undersized',
        weight: 140,
      });
    }
  }
  // Tropical animals without any heater (room is cool)
  if (hasAnimals && s.heaterSet === null && !s.stuckHeaters.length) {
    const cold = species.filter((sp) => sp.tempC.idealMin > ROOM_TEMP_C + 1);
    if (cold.length && w.tempC < Math.max(...cold.map((sp) => sp.tempC.idealMin))) {
      issues.push({
        status: w.tempC < Math.max(...cold.map((sp) => sp.tempC.min)) ? 'danger' : 'watch',
        param: 'temp',
        text: `There is no heater, and the room keeps this tank near ${ROOM_TEMP_C} °C — too cool for ${joinNames(cold.map((sp) => pluralName(sp.commonName)))}.`,
        advice: 'Install a heater set to the middle of their range.',
        headline: 'Tank needs a heater',
        weight: 160,
      });
    }
  }

  // Sort, dedupe, headline
  issues.sort((a, b) => b.weight - a.weight);
  const seen = new Set<string>();
  const outIssues: WaterIssue[] = [];
  for (const i of issues) {
    if (seen.has(i.text)) continue;
    seen.add(i.text);
    outIssues.push({ status: i.status, text: i.text, advice: i.advice, param: i.param });
  }
  const status: StatusLevel = issues.reduce<StatusLevel>((acc, i) => worst(acc, i.status), 'good');
  let headline: string;
  if (issues.length && status !== 'good') headline = issues[0].headline;
  else if (!hasAnimals) headline = w.bioMaturity >= 0.75 ? 'Water is ready for animals' : 'Water is clean — the filter is still maturing';
  else headline = (tank.water.lab?.swing ?? 0) < 0.1 && w.clarity > 0.95 ? 'Water is healthy and stable' : 'Water is healthy';

  return {
    tankId,
    status,
    headline,
    params,
    issues: outIssues,
    stability: stabilityScore(tank, env, params),
    cycleProgress: clamp(w.bioMaturity, 0, 1),
    stockingLoad: Math.round(env.stockingLoad * 1000) / 1000,
    dailyCost: tankDailyCostImpl(state, tank, env.summary),
  };
}

function stabilityScore(tank: Tank, env: TankEnv, params: ParamStatus[]): number {
  const w = tank.water;
  const s = env.summary;
  const volume = clamp(8 * Math.log2(Math.max(1, env.gallons)) - 8, 5, 40);
  const maturity = 25 * clamp(w.bioMaturity, 0, 1) * (0.6 + 0.4 * clamp(w.lab?.colony ?? 0.6, 0, 1));
  let equip = 0;
  if (s.activeFilters.length >= 2 || s.activeFilters.some((e) => e.def.id === 'filter_sump')) equip += 7;
  else if (s.activeFilters.length === 1) equip += 3;
  if (s.heaters.length >= 2) equip += 4;
  else if (s.heaters.length === 1) equip += 2;
  if (env.salt && s.ato) equip += 4;
  if (s.lid) equip += 2;
  if (s.aeration > 0.3) equip += 2;
  const swing = 30 * clamp(w.lab?.swing ?? 0, 0, 1);
  const over = Math.max(0, env.stockingLoad - 0.8) * 40;
  const low = Math.max(0, 1 - w.level) * 60;
  const dangers = Math.min(30, params.filter((p) => p.status === 'danger').length * 10);
  const conflict = s.conflict ? 10 : 0;
  return Math.round(clamp(15 + volume + maturity + Math.min(20, equip) - swing - over - low - dangers - conflict, 0, 100));
}

/** Class ideal ranges & labels (UI helpers). */
export function waterClassDefaults(tank: Tank) {
  return CLASS_DEFAULTS[tank.waterClass];
}

export { pluralName, whoOf, joinNames, groupBySpecies };
