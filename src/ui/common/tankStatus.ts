/**
 * Why a tank shows Healthy / Watch / Danger, in one line (tank bar tooltip, alerts drawer). OWNER: lane "ui-shell".
 * The sim composes the status from water, animal welfare and food (src/sim/tankStatus.ts) and explains it in
 * `cache.statusReasons` / `cache.statusReason`; older saves fall back to the water report's headline.
 */
import type { GameState } from '@/types';
import { getWaterReport } from '@/sim/water';
import { safe } from './safe';

/** Up to two reasons, most urgent first ("Ember is starving — feed right away. · Ammonia is rising"). */
export function tankStatusReason(g: GameState, tankId: string, opts: { skipFood?: boolean; sep?: string } = {}): string {
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
