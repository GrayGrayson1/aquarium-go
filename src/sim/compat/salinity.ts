/**
 * Which water a species can live in, by salinity — shared by the purchase gate (index.ts environmentGate) and the
 * compatibility engine, so the two never disagree. OWNER: lane "brackish".
 *
 * Tank environments hold roughly these salinities (see src/sim/water/constants.ts CLASS_DEFAULTS):
 *   freshwater  SG 1.000          brackish  SG ~1.003–1.018          marine  SG ~1.019–1.028
 * A species fits its own environment, plus:
 * - a brackish tank if it is a freshwater animal that tolerates real salt (max ≥ 1.005) or a marine animal that
 *   tolerates low salinity (min ≤ 1.012);
 * - fresh water if it is a brackish animal that tolerates fresh water (min ≤ 1.001, e.g. mollies);
 * - a marine tank if it is a brackish animal that tolerates full sea water (max ≥ 1.020).
 */
import type { Environment, SpeciesDefinition } from '@/types';

const ENVS: Environment[] = ['freshwater', 'brackish', 'marine'];

export function fitsEnvironment(sp: SpeciesDefinition, env: Environment): boolean {
  if (sp.environment === env) return true;
  const r = sp.salinitySG;
  if (!r) return false;
  if (env === 'brackish') return (sp.environment === 'freshwater' && r.max >= 1.005) || (sp.environment === 'marine' && r.min <= 1.012);
  if (sp.environment === 'brackish') return env === 'marine' ? r.max >= 1.02 : r.min <= 1.001;
  return false;
}

/** Environments this species can live in. */
export function livableEnvironments(sp: SpeciesDefinition): Environment[] {
  return ENVS.filter((e) => fitsEnvironment(sp, e));
}

/** Environments where both species can live (empty = they can never share a tank). */
export function sharedEnvironments(a: SpeciesDefinition, b: SpeciesDefinition): Environment[] {
  return ENVS.filter((e) => fitsEnvironment(a, e) && fitsEnvironment(b, e));
}

const sgText = (sp: SpeciesDefinition) => (sp.salinitySG ? `SG ${sp.salinitySG.min.toFixed(3)}–${sp.salinitySG.max.toFixed(3)}` : '');

/** Plain-language "needs" phrase for a species' water, e.g. "part-salt brackish water (SG 1.002–1.012)". */
export function waterNeedPhrase(sp: SpeciesDefinition): string {
  if (sp.environment === 'marine') return `full-strength sea water${sp.salinitySG ? ` (${sgText(sp)})` : ''}`;
  if (sp.environment === 'brackish') return `part-salt brackish water${sp.salinitySG ? ` (${sgText(sp)})` : ''}`;
  return 'fresh water — salt harms them';
}

/**
 * A brackish animal living in fresh or marine water (e.g. mollies in a freshwater community): allowed, but worth a
 * gentle note. Returns null when there is nothing to say.
 */
export function offIdealEnvironmentNote(sp: SpeciesDefinition, env: Environment): string | null {
  if (sp.environment !== 'brackish' || env === 'brackish' || !sp.salinitySG) return null;
  const r = sp.salinitySG;
  if (env === 'freshwater') return `they live in fresh water, but hard water with a little salt (SG ${r.idealMin.toFixed(3)}–${r.idealMax.toFixed(3)}) suits them best`;
  return `they tolerate sea water, but brackish water (SG ${r.idealMin.toFixed(3)}–${r.idealMax.toFixed(3)}) suits them best`;
}
