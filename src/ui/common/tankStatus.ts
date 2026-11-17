/**
 * Why a tank shows Healthy / Watch / Danger, in one line (tank bar tooltip, alerts drawer). OWNER: lane "ui-shell".
 * The sim composes the status from water, animal welfare and food (src/sim/tankStatus.ts) and explains it in
 * `cache.statusReasons` / `cache.statusReason`; older saves fall back to the water report's headline.
 */
import type { GameState } from '@/types';
import type { StatusLevel } from '@/types/reports';
import { getWaterReport } from '@/sim/water';
import { safe } from './safe';
import { convertTempText } from './format'; // Audit 2026-11-17 (J1)
import { useSettings } from '@/state/settings'; // Audit 2026-11-17 (J1)

/**
 * Audit 2026-11-17 (J10, B-157): a tank's status, and its water's, in one set of words everywhere (the tank bar, the
 * tank card, Tanks, the bell, Find). A reading on the Water tab keeps Good · Watch · Danger (Settings names them).
 */
export const TANK_STATUS_WORD: Record<StatusLevel, string> = { good: 'Healthy', watch: 'Watch', danger: 'Danger' };

/**
 * Up to two reasons, most urgent first ("Ember is starving — feed right away. · Ammonia is rising"). Audit 2026-11-17
 * (J1): temperatures in the player's unit (the sim writes °C); `unit` defaults to the setting.
 */
export function tankStatusReason(g: GameState, tankId: string, opts: { skipFood?: boolean; sep?: string; unit?: 'C' | 'F' } = {}): string {
  const unit = opts.unit ?? useSettings.getState().tempUnit;
  return convertTempText(statusReason(g, tankId, opts), unit) ?? '';
}

function statusReason(g: GameState, tankId: string, opts: { skipFood?: boolean; sep?: string }): string {
  const t = g.tanks[tankId];
  if (!t) return '';
  const c = t.cache;
  if (c.statusReasons?.length || c.statusReason) {
    let reasons = c.statusReasons?.length ? [...c.statusReasons] : [c.statusReason!];
    // the restock row / food chip already says it: drop the food line (the sim reports it verbatim from the outlook)
    if (opts.skipFood && c.foodLevel && c.foodLevel !== 'ok') reasons = reasons.filter((r) => !/\bfood\b/i.test(r));
    return reasons.slice(0, 2).join(opts.sep ?? ' · ');
  }
  if (c.status === 'good') return '';
  const report = safe('getWaterReport', () => getWaterReport(g, tankId), null);
  return report?.headline ?? 'Needs attention';
}
