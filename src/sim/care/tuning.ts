/**
 * Equipment tuning rules shared by the husbandry actions (./index.ts) and the fit verdicts (./fit.ts).
 * OWNER: lane "waterlab" (split out by lane "fit" so install and the pre-purchase hints use the same numbers).
 */
import type { GameState, Tank } from '@/types';
import { CLASS_DEFAULTS, ROOM_TEMP_C } from '../water/constants';
import { equipmentSummary, inhabitantsOf } from '../water/env';

/** Most units of one kind a tank can hold (installEquipment refuses more). */
export const MAX_PER_KIND: Record<string, number> = { lid: 1, ato: 1, autofeeder: 1, co2: 1, filter: 4, heater: 4, chiller: 3, light: 4, skimmer: 2, uv: 2, refugium: 1, fan: 3, airstone: 4, powerhead: 6, wavemaker: 4 };

/** Equipment kinds in running text ("2 auto top-offs", not "2 atos"). */
export const KIND_PLURAL: Partial<Record<string, string>> = { ato: 'auto top-offs', co2: 'CO₂ systems', uv: 'UV sterilisers', lid: 'lids', light: 'lights', refugium: 'refugiums' };

/** Inhabitants' combined ideal band for a parameter (falls back to the water class). */
export function idealBand(state: GameState, tank: Tank, key: 'tempC' | 'salinitySG'): { min: number; max: number; mid: number } {
  const d = CLASS_DEFAULTS[tank.waterClass];
  const base = key === 'tempC' ? d.temp : d.sg ?? { idealMin: 1, idealMax: 1, min: 1, max: 1 };
  let lo = base.idealMin;
  let hi = base.idealMax;
  const inh = inhabitantsOf(state, tank.id);
  const ranges = inh.map((i) => (key === 'tempC' ? i.species.tempC : i.species.salinitySG)).filter((r): r is NonNullable<typeof r> => !!r);
  if (ranges.length) {
    const l2 = Math.max(...ranges.map((r) => r.idealMin));
    const h2 = Math.min(...ranges.map((r) => r.idealMax));
    if (l2 <= h2) {
      lo = l2;
      hi = h2;
    }
  }
  return { min: lo, max: hi, mid: (lo + hi) / 2 };
}

/** The setting a newly installed unit of `kind` gets in this tank (thermostats for the animals, gentle pumps for weak swimmers). */
export function defaultSettingFor(state: GameState, tank: Tank, kind: string, fallback: number | undefined): number | undefined {
  const inh = inhabitantsOf(state, tank.id);
  const temp = idealBand(state, tank, 'tempC');
  const cool = tank.waterClass === 'freshwater_cool' || temp.mid < ROOM_TEMP_C - 0.5;
  switch (kind) {
    case 'heater':
      return cool ? Math.max(10, temp.min - 1) : Math.round(temp.mid * 2) / 2;
    case 'chiller': {
      if (cool) return Math.round(temp.mid * 2) / 2;
      const s = equipmentSummary(tank);
      return Math.max((s.heaterSet ?? temp.mid) + 1.5, temp.max);
    }
    case 'powerhead':
    case 'wavemaker': {
      const prefs = inh.map((i) => i.species.flowPreference);
      if (prefs.includes('very_low') || prefs.includes('low')) return 0.1;
      if (prefs.includes('moderate')) return 0.6;
      return fallback ?? 1;
    }
    default:
      return fallback;
  }
}
