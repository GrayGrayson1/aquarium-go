/**
 * Minimal water report used only while the waterlab lane's getWaterReport returns placeholder data (no params).
 * Keeps the tank card meaningful; real reports always win. OWNER: lane "ui-shell".
 */
import type { GameState, ParamStatus, StatusLevel, WaterReport } from '@/types';
import { findSpecies } from '@/data/species';
import { creaturesInTank } from '@/sim/life';
import { safe } from '../common/safe';

function band(v: number, lo: number, hi: number, loWarn: number, hiWarn: number): StatusLevel {
  if (v >= lo && v <= hi) return 'good';
  if (v >= loWarn && v <= hiWarn) return 'watch';
  return 'danger';
}

export function fallbackParams(state: GameState, tankId: string): ParamStatus[] {
  const t = state.tanks[tankId];
  if (!t) return [];
  const w = t.water;
  const residents = safe('creaturesInTank', () => creaturesInTank(state, tankId), []);
  const sps = residents.map((c) => findSpecies(c.speciesId)).filter((s): s is NonNullable<typeof s> => !!s);
  const tMin = sps.length ? Math.max(...sps.map((s) => s.tempC.idealMin)) : 22;
  const tMax = sps.length ? Math.min(...sps.map((s) => s.tempC.idealMax)) : 28;
  const pMin = sps.length ? Math.max(...sps.map((s) => s.pH.idealMin)) : 6.5;
  const pMax = sps.length ? Math.min(...sps.map((s) => s.pH.idealMax)) : 8.3;
  const marine = t.environment === 'marine';
  const out: ParamStatus[] = [
    { key: 'temp', label: 'Temperature', value: w.tempC, unit: '°C', display: `${w.tempC.toFixed(1)} °C`, status: band(w.tempC, tMin, tMax, tMin - 2, tMax + 2), ideal: `${tMin}–${tMax} °C` },
    { key: 'ph', label: 'pH', value: w.pH, unit: '', display: w.pH.toFixed(2), status: band(w.pH, pMin, pMax, pMin - 0.4, pMax + 0.4), ideal: `${pMin.toFixed(1)}–${pMax.toFixed(1)}` },
    { key: 'ammonia', label: 'Ammonia', value: w.ammonia, unit: 'ppm', display: `${w.ammonia.toFixed(2)} ppm`, status: w.ammonia < 0.1 ? 'good' : w.ammonia < 0.5 ? 'watch' : 'danger', ideal: '0 ppm', reason: 'Toxic waste from animals and uneaten food. A mature filter converts it.' },
    { key: 'nitrite', label: 'Nitrite', value: w.nitrite, unit: 'ppm', display: `${w.nitrite.toFixed(2)} ppm`, status: w.nitrite < 0.1 ? 'good' : w.nitrite < 0.5 ? 'watch' : 'danger', ideal: '0 ppm' },
    { key: 'nitrate', label: 'Nitrate', value: w.nitrate, unit: 'ppm', display: `${w.nitrate.toFixed(0)} ppm`, status: w.nitrate < 25 ? 'good' : w.nitrate < 50 ? 'watch' : 'danger', ideal: 'Under 20 ppm', advice: w.nitrate >= 25 ? 'A partial water change lowers nitrate.' : undefined },
  ];
  if (marine) out.push({ key: 'salinity', label: 'Salinity', value: w.salinitySG, unit: 'SG', display: w.salinitySG.toFixed(3), status: band(w.salinitySG, 1.023, 1.026, 1.02, 1.028), ideal: '1.023–1.026' });
  else if (t.environment === 'brackish') out.push({ key: 'salinity', label: 'Salinity', value: w.salinitySG, unit: 'SG', display: w.salinitySG.toFixed(3), status: band(w.salinitySG, 1.004, 1.012, 1.003, 1.018), ideal: '1.004–1.012' }); // lane:brackish
  out.push({ key: 'oxygen', label: 'Oxygen', value: w.oxygen, unit: '', display: `${Math.round(w.oxygen * 100)}%`, status: w.oxygen > 0.75 ? 'good' : w.oxygen > 0.5 ? 'watch' : 'danger' });
  out.push({ key: 'level', label: 'Water level', value: w.level, unit: '', display: `${Math.round(w.level * 100)}%`, status: w.level > 0.94 ? 'good' : w.level > 0.85 ? 'watch' : 'danger', advice: w.level <= 0.94 ? 'Top off with fresh water.' : undefined });
  return out;
}

export function withFallback(report: WaterReport | null, state: GameState, tankId: string): WaterReport | null {
  if (!report) return null;
  if (report.params && report.params.length) return report;
  const params = fallbackParams(state, tankId);
  const worst: StatusLevel = params.some((p) => p.status === 'danger') ? 'danger' : params.some((p) => p.status === 'watch') ? 'watch' : 'good';
  return { ...report, params, status: report.status === 'good' ? worst : report.status, headline: report.headline };
}
