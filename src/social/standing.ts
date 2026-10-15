/**
 * The player's own leaderboard numbers, computed locally from the save (0.5 spec §13.5, §13.6; SOC-008 A3). OWNER:
 * lane "social". Pure reads of the game state; nothing here writes it.
 *
 * - Collection value: every animal the player owns (in a tank, in the holding container or listed for sale) at
 *   `creatureValue`, plus each tank's hardware and decor at `tankValuation` with no animals (they are already counted).
 * - Prismatics: owned Prismatic animals.
 * - Show wins: class wins (rank 1) judged in the last seven game days.
 */
import type { GameState } from '@/types';
import { creatureValue, tankValuation } from '@/sim/economy/valuation';
import { isPrismatic } from '@/sim/life/rareVariants';
import type { LeaderboardKind } from './service';

export type PlayerStanding = Record<LeaderboardKind, number> & { name: string };

const WEEK_HOURS = 7 * 24;
const NO_ANIMALS: ReadonlySet<string> = new Set();

const owned = (status: string) => status === 'alive' || status === 'listed';

export function playerStanding(g: GameState): PlayerStanding {
  let animals = 0;
  let prismatics = 0;
  for (const c of Object.values(g.creatures)) {
    if (!owned(c.status)) continue;
    const v = creatureValue(g, c).total;
    if (Number.isFinite(v)) animals += v;
    if (isPrismatic(c)) prismatics++;
  }
  let tanks = 0;
  for (const id of g.tankOrder) {
    const v = tankValuation(g, id, { creatureIds: NO_ANIMALS }).expected;
    if (Number.isFinite(v)) tanks += v;
  }
  const since = g.clock.hour - WEEK_HOURS;
  let wins = 0;
  for (const e of g.shows?.entries ?? []) if (e.status === 'judged' && e.rank === 1 && (e.judgedHour ?? -Infinity) > since) wins++;
  return { name: g.shopName || 'My Aquarium', collection_value: Math.round(animals + tanks), prismatics, show_wins: wins };
}
