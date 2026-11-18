/**
 * Display helpers + plain-language labels shared by the shell and panels. OWNER: lane "ui-shell".
 * No species facts here — only words for enums the type contracts define.
 */
import type {
  WaterClass,
  CompatVerdict,
  PersonalityTag,
  LifeStage,
  Creature,
  SpeciesDefinition,
  Difficulty,
  StatusLevel,
  LightPreset,
  GameEvent,
  EquipmentKind,
} from '@/types';
import { ageDays, dayOf, formatClock, hourOfDay } from '@/sim/time';
import { getFoodDef } from '@/data/catalog/foods';
import { findSpecies } from '@/data/species';
import { moduleFor } from '@/sim/life/breeding/registry'; // review E (E17)

export { formatClock, dayOf, hourOfDay };

export function titleCase(id: string): string {
  return id
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** 'solitary_or_pair' → 'Solitary or pair'. */
export function sentenceCase(id: string): string {
  const s = id.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Audit 2026-11-17 (J4): one table for the water types' names (the tank card's chip said "Tropical planted" where
// Tanks said "Planted freshwater")
export { WATER_CLASS_LABEL, WATER_CLASS_WORDS } from '@/data/tankLabels';

/** Tone per water class, used for chips (cool = aqua, tropical = gold/green, marine = blue). */
export const WATER_CLASS_TONE: Record<WaterClass, 'aqua' | 'good' | 'gold' | 'violet' | 'neutral'> = {
  freshwater_cool: 'aqua',
  freshwater_tropical: 'gold',
  freshwater_planted: 'good',
  marine_fowlr: 'violet',
  marine_live_rock: 'violet',
  reef: 'violet',
  brackish: 'neutral',
};

export const VERDICT_LABEL: Record<CompatVerdict, string> = {
  excellent: 'Excellent',
  usually_compatible: 'Usually compatible',
  conditional: 'Conditional',
  high_risk: 'High risk',
  incompatible: 'Incompatible',
};

export const VERDICT_STATUS: Record<CompatVerdict, StatusLevel> = {
  excellent: 'good',
  usually_compatible: 'good',
  conditional: 'watch',
  high_risk: 'danger',
  incompatible: 'danger',
};

export const PERSONALITY: Record<PersonalityTag, { label: string; line: string }> = {
  bold: { label: 'Bold', line: 'Comes forward to investigate and rarely startles.' },
  shy: { label: 'Shy', line: 'Prefers cover — plenty of hides help it settle.' },
  explorer: { label: 'Explorer', line: 'Patrols every corner of the tank.' },
  food_obsessed: { label: 'Food obsessed', line: 'First to the food, every single time.' },
  glass_curious: { label: 'Glass curious', line: 'Follows your finger along the glass.' },
  nest_builder: { label: 'Nest builder', line: 'Spends time building and tending nests.' },
  homebody: { label: 'Homebody', line: 'Keeps close to a favourite spot.' },
  social: { label: 'Social', line: 'Seeks out the company of its own kind.' },
  solitary: { label: 'Solitary', line: 'Happiest with space of its own.' },
  night_owl: { label: 'Night owl', line: 'Most active around lights-out.' },
  showoff: { label: 'Show-off', line: 'Displays readily — visitors adore it.' },
  easily_startled: { label: 'Easily startled', line: 'Sudden movement sends it darting for cover.' },
  patient_feeder: { label: 'Patient feeder', line: 'Takes its time; target feeding helps.' },
  competitive_feeder: { label: 'Competitive feeder', line: 'Pushes others aside at mealtimes.' },
  decor_inspector: { label: 'Decor inspector', line: 'Investigates every new plant and stone.' },
};

export function personalityLabel(t: string): string {
  return (PERSONALITY as Record<string, { label: string }>)[t]?.label ?? titleCase(t);
}
export function personalityLine(t: string): string {
  return (PERSONALITY as Record<string, { line: string }>)[t]?.line ?? '';
}

export const LIFE_STAGE_LABEL: Record<LifeStage, string> = {
  egg: 'Egg',
  larva: 'Larva',
  fry: 'Fry',
  juvenile: 'Juvenile',
  adult: 'Adult',
  elder: 'Elder',
};

export const DIFFICULTY_LABEL: Record<Difficulty, { label: string; tone: 'good' | 'aqua' | 'watch' | 'danger'; pips: number }> = {
  beginner: { label: 'Beginner', tone: 'good', pips: 1 },
  intermediate: { label: 'Intermediate', tone: 'aqua', pips: 2 },
  advanced: { label: 'Advanced', tone: 'watch', pips: 3 },
  expert: { label: 'Expert', tone: 'danger', pips: 4 },
};

export const LIGHT_PRESET_LABEL: Record<LightPreset, string> = {
  daylight: 'Daylight',
  warm: 'Warm',
  planted: 'Planted',
  reef_actinic: 'Actinic',
  reef_full: 'Full reef',
  moonlight: 'Moonlight',
  sunset: 'Sunset',
  cool: 'Cool',
};

export function lightPresetsFor(waterClass: WaterClass): LightPreset[] {
  if (waterClass === 'reef' || waterClass.startsWith('marine')) return ['reef_full', 'reef_actinic', 'daylight', 'cool', 'sunset', 'moonlight'];
  if (waterClass === 'freshwater_planted') return ['planted', 'daylight', 'warm', 'sunset', 'moonlight'];
  if (waterClass === 'freshwater_cool') return ['cool', 'daylight', 'warm', 'sunset', 'moonlight'];
  return ['daylight', 'warm', 'planted', 'sunset', 'moonlight'];
}

export const EQUIPMENT_KIND_LABEL: Record<EquipmentKind, string> = {
  filter: 'Filter',
  heater: 'Heater',
  chiller: 'Chiller',
  fan: 'Cooling fan',
  light: 'Light',
  airstone: 'Air stone',
  powerhead: 'Powerhead',
  skimmer: 'Protein skimmer',
  ato: 'Auto top-off',
  co2: 'CO₂',
  autofeeder: 'Autofeeder', // lane:qa-r3 — one spelling everywhere
  uv: 'UV steriliser',
  refugium: 'Refugium',
  wavemaker: 'Wavemaker',
  lid: 'Lid',
  water_changer: 'Water changer', // lane:automation (0.5 §10.3)
  doser: 'Live-food doser', // lane:automation (chunk 5)
};

/** Audit 2026-11-17 (J14): how a food reaches the animals, in the feed picker's words (Supplies said "Slow Sink"). */
export const FOOD_DELIVERY_WORD: Record<string, string> = { floating: 'Floats', slow_sink: 'Sinks slowly', fast_sink: 'Sinks fast', live: 'Live food', target: 'Target fed' };

export function cToF(c: number) {
  return c * 1.8 + 32;
}

export function formatTemp(c: number, unit: 'C' | 'F', digits = 1): string {
  return unit === 'F' ? `${cToF(c).toFixed(digits)} °F` : `${c.toFixed(digits)} °C`;
}

/** Reputation as the player sees it everywhere (top bar, guide, research): whole points, never rounded up. */
export function formatRep(rep: number): string {
  return String(Math.floor(Number.isFinite(rep) ? rep : 0));
}

/** "24.5–28.0 °C" → "24.5–28 °C" (sim reports carry one decimal; whole numbers read cleaner). */
function tidyCelsius(text: string): string {
  return text.replace(/(-?\d+(?:\.\d+)?)(\s*[–-]\s*(-?\d+(?:\.\d+)?))?(\s*°\s*C)/g, (_m, a: string, _r, b: string | undefined, unit: string) => {
    const t = (x: string) => x.replace(/\.0+$/, '');
    return b != null ? `${t(a)}–${t(b)}${unit}` : `${t(a)}${unit}`;
  });
}

/** A temperature *difference* ("by ~2 °C", "1 °C below the chiller", "1–2 °C of cooling", "~2 °C cooler") scales by
 *  1.8 with no +32 offset. Only "by …" before the value or a comparison word right after "°C" marks one: a bare "~"
 *  does not ("breeding slows below ~21 °C" is a real temperature). */
// Audit 2026-11-17 (review of D8): "Cools 1–2 °C by evaporation", "Cools about 2 °C", "Cools only about 2 °C" (care/fit.ts)
// Audit 2026-11-17 (J1): "needs to drop about 2 °C" and a signed "−1 °C" are differences too (they read as 36 °F and
// 30 °F before). The review: only the verb marks one ("Cools 2 °C", "cool about 2 °C", "drop about 2 °C"), never the
// adjective ("a cool 18 °C room" is a temperature); a sign only when no digit or letter is right before it.
const TEMP_DELTA_BEFORE = /(?:\bby\s+(?:~\s*|about\s+|around\s+)?|±\s*|\b(?:cools|warms|drops)\s+(?:only\s+)?(?:~\s*|about\s+|around\s+)?|\b(?:cool|warm|drop)\s+(?:only\s+)?(?:~\s*|about\s+|around\s+)|(?:^|[\s(])[−+]\s*)$/i;
const TEMP_DELTA_AFTER = /^\s+(?:below|above|cooler|warmer|colder|hotter|lower|higher|of|per)\b/i;

function fDelta(c: number): string {
  const f = c * 1.8;
  return Math.abs(f) >= 1 ? String(Math.round(f)) : f.toFixed(1);
}

/** Audit 2026-11-17 (J1): a temperature difference in the player's unit ("2 °C" → "4 °F"), never with the +32 offset. */
export function formatTempDelta(c: number, unit: 'C' | 'F'): string {
  return unit === 'F' ? `${fDelta(c)} °F` : `${String(c)} °C`;
}

/** Replace °C values inside report strings with °F when requested (and tidy "28.0 °C" → "28 °C"). */
export function convertTempText(text: string | undefined, unit: 'C' | 'F'): string | undefined {
  if (!text) return text;
  if (unit === 'C') return tidyCelsius(text);
  return text.replace(/(-?\d+(?:\.\d+)?)(\s*[–-]\s*(-?\d+(?:\.\d+)?))?\s*°\s*C/g, (m: string, a: string, _r, b: string | undefined, at: number) => {
    if (TEMP_DELTA_BEFORE.test(text.slice(0, at)) || TEMP_DELTA_AFTER.test(text.slice(at + m.length))) {
      return b != null ? `${fDelta(Number(a))}–${fDelta(Number(b))} °F` : `${fDelta(Number(a))} °F`;
    }
    const fa = cToF(Number(a));
    const dig = a.includes('.') ? 1 : 0;
    if (b != null) return `${fa.toFixed(dig)}–${cToF(Number(b)).toFixed(dig)} °F`;
    return `${fa.toFixed(dig)} °F`;
  });
}

/**
 * Audit 2026-11-17 (J1): a source's facts quote °C or °F as the source wrote them ("68–78 °F"); show both in the
 * player's unit. The quoted values are temperatures, never differences.
 */
export function convertSourceTempText(text: string, unit: 'C' | 'F'): string {
  if (unit === 'F') return convertTempText(text, 'F') ?? text;
  const c = (f: string, dig: number) => ((Number(f) - 32) / 1.8).toFixed(dig);
  return tidyCelsius(text).replace(/(-?\d+(?:\.\d+)?)(\s*[–-]\s*(-?\d+(?:\.\d+)?))?\s*°\s*F\b/g, (_m, a: string, _r, b: string | undefined) => {
    const dig = a.includes('.') ? 1 : 0;
    return b != null ? `${c(a, dig)}–${c(b, dig)} °C` : `${c(a, dig)} °C`;
  });
}

export function formatDayClock(hour: number) {
  return `Day ${dayOf(hour)} · ${formatClock(hour)}`;
}

/** "3 days", "12 hours" style age from a born hour. */
export function formatAge(bornHour: number, nowHour: number): string {
  const d = ageDays(bornHour, nowHour);
  if (d < 1) return `${Math.max(1, Math.round(d * 24))} h`;
  if (d < 2) return '1 day';
  return `${Math.floor(d)} days`;
}

export function foodName(foodId: string): string {
  return getFoodDef(foodId)?.name ?? titleCase(foodId.replace(/_frozen$/, ' (frozen)'));
}

export function speciesName(id: string): string {
  return findSpecies(id)?.commonName ?? titleCase(id);
}

/** Observable sex + reproductive role, in words that respect each species' biology. */
export function sexRoleText(c: Creature, sp: SpeciesDefinition | undefined, nowHour: number): { label: string; detail?: string } {
  const age = ageDays(c.bornHour, nowHour);
  if (sp?.sexSystem === 'protandrous') {
    switch (c.reproRole) {
      case 'female':
        return { label: 'Female', detail: 'Dominant — became female as the larger of the pair.' };
      case 'transitioning_female':
        return { label: 'Transitioning to female', detail: 'Now dominant, the change to female is under way.' };
      case 'undifferentiated':
        return { label: 'Not yet differentiated', detail: 'Its role will be set by the social hierarchy.' };
      default:
        return { label: 'Male', detail: 'May become female if dominant.' };
    }
  }
  if (sp?.sexSystem === 'protogynous') {
    // the mirror image (clown gobies): every fish starts female, the dominant one of a group turns male (protogyny.ts)
    if (c.repro?.stage === 'transitioning_male') return { label: 'Transitioning to male', detail: 'Now dominant, the change to male is under way.' };
    switch (c.reproRole) {
      case 'male':
        return { label: 'Male', detail: 'Dominant — became the male of the group.' };
      case 'undifferentiated':
        return { label: 'Not yet differentiated', detail: 'Its role will be set by the social hierarchy.' };
      default:
        return { label: 'Female', detail: 'May become male if dominant.' };
    }
  }
  // audit E17: a hermaphrodite never shows a sex, and a snail whose sex shows only at the end of its life can't be
  // sexed by eye: "Not yet visible · Sex shows at around 14 days" was forever, or a promise for its last day
  // (review E: the pairing advice only for a species that breeds in pairs here: not a tang, puffer or triggerfish the
  // game never breeds, which fight their own kind, nor an anemone, which splits alone)
  const pairs = !!sp && moduleFor(sp).breedable;
  if (sp?.sexSystem === 'simultaneous_hermaphrodite') return pairs ? { label: 'Both sexes', detail: 'Any two adults can pair up — both can carry eggs.' } : { label: 'Both sexes' };
  if (sp && c.sex === 'unknown' && sp.lifecycle.sexVisibleAtDays >= sp.lifecycle.lifespanDays) return pairs ? { label: 'Can’t be told by eye', detail: 'Keep a few together and they pair up on their own.' } : { label: 'Can’t be told by eye' };
  if (c.sex === 'unknown' || (sp && age < sp.lifecycle.sexVisibleAtDays && c.lifeStage !== 'adult')) {
    return { label: 'Not yet visible', detail: sp ? `Sex shows at around ${Math.round(sp.lifecycle.sexVisibleAtDays)} days.` : undefined };
  }
  if (sp?.parentalCare === 'male_pouch' && c.sex === 'male') return { label: 'Male', detail: 'Carries the young in his brood pouch.' };
  if (sp?.parentalCare === 'male_mouth' && c.sex === 'male') return { label: 'Male', detail: 'Broods eggs in his mouth.' };
  return { label: c.sex === 'male' ? 'Male' : 'Female' };
}

/** Probability (per game-week) in words. */
export function probabilityWord(p: number | undefined): string | null {
  if (p == null || !Number.isFinite(p)) return null;
  if (p < 0.03) return 'rarely';
  if (p < 0.12) return 'occasionally';
  if (p < 0.3) return 'sometimes';
  if (p < 0.6) return 'often'; // Audit 2026-11-17 (J17): "Happens often", not "Happens likely"
  return 'very often';
}

export const EVENT_KIND_TONE: Record<GameEvent['kind'], 'aqua' | 'good' | 'watch' | 'danger' | 'gold' | 'violet' | 'neutral'> = {
  info: 'aqua',
  tip: 'aqua',
  warning: 'watch',
  danger: 'danger',
  celebrate: 'gold',
  breeding: 'violet',
  market: 'good',
  visitor: 'aqua',
  death: 'danger',
  unlock: 'gold',
};

/** Relative time between two game hours ("3 h ago"). */
export function agoText(hour: number, nowHour: number): string {
  const dh = Math.max(0, nowHour - hour);
  if (dh < 1 / 6) return 'just now';
  if (dh * 60 < 59.5) return `${Math.round(dh * 60)} min ago`; // lane:w2-ui: no "60 min ago" / "24 h ago"
  if (dh < 23.5) return `${Math.round(dh)} h ago`;
  const d = Math.round(dh / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, Number.isFinite(v) ? v : a));
}

export function pct(v: number) {
  return `${Math.round(clamp(v, 0, 999) * 100)}%`;
}
