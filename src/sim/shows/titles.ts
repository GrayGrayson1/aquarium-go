/**
 * Show titles and what they are worth: Champion / Grand Champion, the market-valuation factors for titled animals
 * and their offspring, and the small exhibit boost award winners give. OWNER: lane "shows".
 *
 * Deliberately a leaf module (types + data only) so src/sim/economy/valuation.ts and src/sim/facility/exhibit.ts
 * can import it without an import cycle through the rest of src/sim/shows.
 */
import type { Creature, CreatureAwards, CreatureTitle, GameState, ShowTier } from '@/types';
import { CHAMPION_WINS, GRAND_CHAMPION_WINS } from '@/data/shows';

export const TITLE_LABEL: Record<CreatureTitle, string> = { champion: 'Champion', grand_champion: 'Grand Champion' };
/** Short prefix shown before a titled animal's name, the way show catalogues print it. */
export const TITLE_PREFIX: Record<CreatureTitle, string> = { champion: 'Ch.', grand_champion: 'Gr. Ch.' };

const TIER_RANK: Record<ShowTier, number> = { club: 0, regional: 1, national: 2, international: 3 };

/** A fresh, empty show record. */
export function emptyAwards(): CreatureAwards {
  return { ribbons: [], wins: {}, placings: 0, bestInShow: 0, shown: 0, titles: [] };
}

/** Class wins at `tier` or higher. */
export function winsAtOrAbove(a: CreatureAwards | undefined, tier: ShowTier): number {
  if (!a?.wins) return 0;
  let n = 0;
  for (const [t, v] of Object.entries(a.wins) as [ShowTier, number][]) if (TIER_RANK[t] >= TIER_RANK[tier] && Number.isFinite(v)) n += v;
  return n;
}

export function totalWins(a: CreatureAwards | undefined): number {
  return winsAtOrAbove(a, 'club');
}

/** Titles an animal's record qualifies for (Champion: 3 wins at Regional+; Grand Champion: 3 wins at National+). */
export function qualifiedTitles(a: CreatureAwards | undefined): CreatureTitle[] {
  const out: CreatureTitle[] = [];
  if (winsAtOrAbove(a, 'regional') >= CHAMPION_WINS) out.push('champion');
  if (winsAtOrAbove(a, 'national') >= GRAND_CHAMPION_WINS && out.includes('champion')) out.push('grand_champion');
  return out;
}

/** Highest title held (Grand Champion outranks Champion). */
export function topTitle(c: Pick<Creature, 'awards'> | undefined | null): CreatureTitle | null {
  const t = c?.awards?.titles;
  if (!t?.length) return null;
  return t.includes('grand_champion') ? 'grand_champion' : t.includes('champion') ? 'champion' : null;
}

/** "Gr. Ch. Ember" — a creature's name with its show title. */
export function titledName(c: Pick<Creature, 'name' | 'awards'>): string {
  const t = topTitle(c);
  return t ? `${TITLE_PREFIX[t]} ${c.name}` : c.name;
}

export interface ShowValueFactor {
  label: string;
  mult: number;
  note: string;
}

/**
 * Market-valuation factors from shows (src/sim/economy/valuation.ts): a moderate premium for a titled or winning
 * animal, and a smaller lineage-prestige premium for the offspring of champions. A game valuation — never a
 * statement about an animal's worth.
 */
export function showValueFactors(state: GameState, c: Creature): ShowValueFactor[] {
  const out: ShowValueFactor[] = [];
  const a = c.awards;
  if (a) {
    const top = topTitle(c);
    const wins = totalWins(a);
    const high = winsAtOrAbove(a, 'regional');
    const bis = Math.min(2, Math.max(0, a.bestInShow ?? 0));
    let m = 1;
    let note = '';
    if (top === 'grand_champion') {
      m = 1.4;
      note = `Grand Champion — ${wins} class win${wins === 1 ? '' : 's'}, ${winsAtOrAbove(a, 'national')} at National or higher`;
    } else if (top === 'champion') {
      m = 1.22;
      note = `Champion — ${high} class wins at Regional or higher`;
    } else if (high > 0) {
      m = 1 + 0.04 * Math.min(3, high);
      note = `${high} class win${high === 1 ? '' : 's'} at Regional or higher`;
    } else if (wins > 0) {
      m = 1 + 0.015 * Math.min(3, wins);
      note = `${wins} club class win${wins === 1 ? '' : 's'}`;
    } else if ((a.placings ?? 0) > 0) {
      m = 1.015;
      note = `Placed at ${a.placings === 1 ? 'a show' : `${a.placings} shows`}`;
    }
    if (bis > 0) {
      m += 0.03 * bis;
      note += `${note ? ' · ' : ''}${bis === 1 ? 'Best in Show' : `Best in Show ×${a.bestInShow}`}`;
    }
    if (m > 1.001) out.push({ label: 'Show record', mult: m, note });
  }
  // Lineage prestige: the offspring of a champion carry a little of the name.
  const parents = [c.lineage?.motherId, c.lineage?.fatherId].map((id) => (id ? state.creatures[id] : undefined)).filter((p): p is Creature => !!p);
  let best: { p: Creature; t: CreatureTitle } | null = null;
  let titledParents = 0;
  for (const p of parents) {
    const t = topTitle(p);
    if (!t) continue;
    titledParents++;
    if (!best || (t === 'grand_champion' && best.t !== 'grand_champion')) best = { p, t };
  }
  if (best) {
    const m = (best.t === 'grand_champion' ? 1.1 : 1.06) + (titledParents >= 2 ? 0.02 : 0);
    out.push({ label: 'Champion bloodline', mult: m, note: `${titledParents >= 2 ? 'Both parents are titled' : `Offspring of ${TITLE_LABEL[best.t]} ${best.p.name}`}` });
  }
  return out;
}

/**
 * Exhibit appeal from awards (src/sim/facility/exhibit.ts): award-winning animals and a prize-winning layout draw a
 * little more interest. Returns an additive 0..0.14 boost to the charisma factor plus a note for the exhibit report.
 */
export function showsExhibitBoost(state: GameState, tankId: string, creatures: Creature[]): { boost: number; note?: string } {
  let boost = 0;
  let star: Creature | null = null;
  let starRank = 0;
  for (const c of creatures) {
    const a = c.awards;
    if (!a) continue;
    const t = topTitle(c);
    const wins = totalWins(a);
    const b = t === 'grand_champion' ? 0.1 : t === 'champion' ? 0.07 : wins > 0 ? 0.03 : (a.placings ?? 0) > 0 ? 0.01 : 0;
    boost += b + (a.bestInShow > 0 ? 0.02 : 0);
    const rank = (t === 'grand_champion' ? 3 : t === 'champion' ? 2 : wins > 0 ? 1 : 0) + (a.bestInShow > 0 ? 0.5 : 0);
    if (rank > starRank) {
      starRank = rank;
      star = c;
    }
  }
  boost = Math.min(0.12, boost);
  const scape = state.shows?.tankAwards?.[tankId];
  if (scape && scape.wins > 0) boost += 0.04;
  else if (scape && scape.placings > 0) boost += 0.015;
  boost = Math.min(0.14, Math.max(0, boost));
  if (boost < 0.005) return { boost: 0 };
  const note = star
    ? `${titledName(star)} is a ${topTitle(star) ? TITLE_LABEL[topTitle(star)!].toLowerCase() : 'prize-winner'} — visitors love an award winner.`
    : 'An award-winning aquascape — visitors come to see it.';
  return { boost, note };
}
