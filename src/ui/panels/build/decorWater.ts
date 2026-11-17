/**
 * Audit 2026-11-17 (G7) — Build › Decor lists only the pieces a tank's water class takes, silently. After Reef Systems a
 * player on a fish-only or live-rock tank saw no new corals and no word why: this names the unlocked pieces the water
 * hides and where to get a tank that takes them. Pure (tests import it).
 */
import type { GameState, Tank } from '@/types';
import { DECOR } from '@/data/catalog/decor';
import { isUnlocked } from '@/sim/facility';
import { nameList } from '../common/format';

/** The line under Decor's category chips (null: nothing unlocked is hidden by this tank's water). */
export function decorWaterNote(g: GameState, tank: Pick<Tank, 'environment' | 'waterClass'>): string | null {
  const hidden = DECOR.filter((d) => d.environments.includes(tank.environment) && !!d.waterClasses?.length && !d.waterClasses.includes(tank.waterClass) && isUnlocked(g, d.unlock));
  const reefOnly = hidden.filter((d) => d.waterClasses!.every((w) => w === 'reef'));
  const liveRockOk = hidden.filter((d) => d.waterClasses!.includes('marine_live_rock'));
  const parts: string[] = [];
  if (liveRockOk.length) parts.push(`the ${nameList(liveRockOk.map((d) => d.name))} ${liveRockOk.length === 1 ? 'needs' : 'need'} a live-rock or reef tank`);
  if (reefOnly.length) parts.push(`${reefOnly.some((d) => d.category === 'coral') ? 'corals' : `the ${nameList(reefOnly.map((d) => d.name))}`} need${!reefOnly.some((d) => d.category === 'coral') && reefOnly.length === 1 ? 's' : ''} a reef tank`);
  if (!parts.length) return null;
  const said = parts.join(', and ');
  return `${said.charAt(0).toUpperCase()}${said.slice(1)}. Set one up in Build › Tanks, or convert an empty marine tank in Tanks.`;
}
