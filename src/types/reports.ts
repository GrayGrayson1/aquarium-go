/**
 * Derived report contracts consumed by the UI. OWNER: core. Lanes may ADD optional fields.
 */
import type { CompatVerdict } from './species';
import type { Sex } from './game';

export type StatusLevel = 'good' | 'watch' | 'danger';

export type WaterParamKey =
  | 'temp'
  | 'ph'
  | 'ammonia'
  | 'nitrite'
  | 'nitrate'
  | 'salinity'
  | 'oxygen'
  | 'gh'
  | 'kh'
  | 'cycle'
  | 'stocking'
  | 'filtration'
  | 'flow'
  | 'light'
  | 'algae'
  | 'level'
  | 'clarity';

export interface ParamStatus {
  key: WaterParamKey;
  label: string;
  value: number;
  unit: string;
  /** Pre-formatted for display, e.g. "25.4 °C", "0.02 ppm". */
  display: string;
  status: StatusLevel;
  /** Human ideal band, e.g. "24–27 °C for your betta". */
  ideal?: string;
  /** Why this status (plain language). */
  reason?: string;
  advice?: string;
}

export interface WaterIssue {
  status: StatusLevel;
  text: string; // "Ammonia is rising — waste is outpacing your filter."
  advice?: string; // "Do a 25% water change and feed less for a day."
  param?: WaterParamKey;
}

export interface WaterReport {
  tankId: string;
  status: StatusLevel;
  /** One-line summary: "Water is healthy", "Nitrite spike — act soon". */
  headline: string;
  params: ParamStatus[];
  issues: WaterIssue[];
  /** 0..100 */
  stability: number;
  /** 0..1 biological filter establishment */
  cycleProgress: number;
  /** Stocking load 0..>1 */
  stockingLoad: number;
  /** Daily operating cost for this tank. */
  dailyCost: number;
}

export type CompatCategory =
  | 'water'
  | 'temperature'
  | 'salinity'
  | 'chemistry'
  | 'size'
  | 'tank'
  | 'social'
  | 'aggression'
  | 'predation'
  | 'feeding'
  | 'flow'
  | 'light'
  | 'reef'
  | 'plants'
  | 'habitat'
  | 'breeding'
  | 'exception';

export interface CompatReason {
  severity: 'positive' | 'info' | 'caution' | 'warning' | 'critical';
  category: CompatCategory;
  text: string;
  speciesIds: string[];
  creatureIds?: string[];
  /** Rough chance per game-week of a bad outcome, when meaningful. */
  probability?: number;
  mitigation?: string;
}

export interface CompatPair {
  a: string; // species id
  b: string; // species id (may equal a for conspecific checks)
  verdict: CompatVerdict;
  reasons: CompatReason[];
}

export interface CompatReport {
  verdict: CompatVerdict;
  /** 0..100 (100 = ideal) */
  score: number;
  /** Most important reasons first. */
  reasons: CompatReason[];
  pairs: CompatPair[];
  perSpecies: Record<string, { verdict: CompatVerdict; reasons: CompatReason[] }>;
}

/** Something the player is considering adding to a tank. */
export interface CandidateAddition {
  speciesId: string;
  count?: number;
  sex?: Sex;
  sizeCm?: number;
  /** Existing creatures being moved in (use their real sex/size/personality). */
  creatureIds?: string[];
}

export interface ValueFactor {
  label: string;
  /** Multiplier applied (1 = neutral) */
  mult: number;
  note?: string;
}

export interface ValueBreakdown {
  total: number;
  base: number;
  factors: ValueFactor[];
}

export interface TankValuation {
  expected: number;
  low: number;
  high: number;
  parts: { label: string; amount: number; note?: string }[];
  modifiers: ValueFactor[];
}

export interface BeautyReport {
  score: number; // 0..100
  factors: { label: string; value: number; note?: string }[];
  tips: string[];
}

export interface ExhibitReport {
  score: number; // 0..100
  factors: { label: string; value: number; note?: string }[];
  visitorAppeal: number; // expected visitors/hour contribution
}
