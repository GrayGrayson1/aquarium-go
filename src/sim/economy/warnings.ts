/**
 * Plain-language reasons to think twice before selling an animal — shared by the listing preview, the quick-sale
 * quote and the UI confirm dialogs (lane:fix-econ, S03-05 / P2-07). Pure over GameState; no RNG.
 */
import type { GameState, Creature, Clutch } from '@/types';
import { findSpecies } from '@/data/species';
import { moduleFor } from '../life/breeding/registry';

const YOUNG = (cl: Clutch): string => (cl.stage === 'eggs' ? `${cl.count} egg${cl.count === 1 ? '' : 's'}` : `${cl.count} young`); // Audit 2026-11-17 (J16): "1 egg"
const pronoun = (c: Creature): string => (c.sex === 'male' ? 'he' : c.sex === 'female' ? 'she' : 'they');

/** Is this clutch carried by (not just guarded by) its parent — it travels with the animal. */
export function carriesClutch(cl: Clutch): boolean {
  return cl.stage === 'in_pouch' || cl.visual === 'berried' || cl.visual === 'pouch';
}

/**
 * Warnings for selling these animals (any path: auction, quick sale, accepted bid). Empty when nothing is at stake.
 * Order: sick → starter → brood → pair → favourite, one line per animal and reason.
 */
export function saleWarnings(state: GameState, creatureIds: readonly string[]): string[] {
  const ids = new Set(creatureIds);
  const creatures = creatureIds.map((id) => state.creatures[id]).filter((c): c is Creature => !!c && (c.status === 'alive' || c.status === 'listed'));
  if (!creatures.length) return [];
  const out: string[] = [];
  const sick = creatures.filter((c) => c.illness || (c.stats?.health ?? 100) < 50);
  if (sick.length) out.push(`${sick.map((c) => c.name).join(', ')} ${sick.length === 1 ? 'is' : 'are'} unwell. Buyers will see it, and selling sick animals can cost reputation.`);
  const starter = creatures.find((c) => c.isStarter);
  if (starter) out.push(`${starter.name} is your very first animal. Once sold, they're gone for good.`);
  const clutches = Object.values(state.clutches ?? {}).filter((cl) => cl.count > 0);
  for (const c of creatures) {
    const mine = clutches.filter((cl) => cl.guardedById === c.id);
    const carried = mine.find(carriesClutch);
    const guarded = mine.find((cl) => !carriesClutch(cl));
    if (carried) out.push(`${c.name} is carrying ${YOUNG(carried)} — they go with ${pronoun(c) === 'they' ? 'them' : pronoun(c) === 'he' ? 'him' : 'her'} if sold.`);
    else if (['pregnant', 'berried', 'brooding', 'gravid'].includes(c.repro?.stage ?? '')) out.push(`${c.name} is expecting young — they'd be born in someone else's tank.`);
    // audit E12: a cichlid pair's other parent, staying, goes on tending the brood alone (pairGuards)
    const otherId = guarded ? (guarded.motherId === c.id ? guarded.fatherId : guarded.motherId) : null;
    const other = otherId && !ids.has(otherId) ? state.creatures[otherId] : undefined;
    const pairSp = guarded ? findSpecies(guarded.speciesId) : undefined;
    const otherTends = !!guarded && !!pairSp && !!moduleFor(pairSp).plan.pairGuards && !!other && (other.status === 'alive' || other.status === 'listed') && other.tankId === guarded.tankId;
    if (guarded && otherTends) out.push(`${c.name} is guarding ${YOUNG(guarded)} with ${other!.name}, who will go on tending them alone.`);
    else if (guarded) out.push(`${c.name} is guarding ${YOUNG(guarded)} — with no parent tending them, eggs fungus and fry get eaten.`);
    else if (['guarding', 'laying', 'spawning', 'depositing'].includes(c.repro?.stage ?? '') && mine.length === 0) out.push(`${c.name} is in the middle of spawning — the clutch is lost if ${pronoun(c)} ${pronoun(c) === 'they' ? 'go' : 'goes'} now.`);
  }
  for (const c of creatures) {
    const pid = c.repro?.partnerId;
    if (!pid || ids.has(pid)) continue;
    const p = state.creatures[pid];
    if (!p || (p.status !== 'alive' && p.status !== 'listed')) continue;
    // Only bonded pairs (seahorse greetings, clownfish pair-bond days): a betta's spawning partner is not a mate.
    if ((c.repro?.bond ?? 0) > 0 || (p.repro?.bond ?? 0) > 0) out.push(`${c.name} and ${p.name} are a bonded pair — selling ${c.name} alone breaks it up.`);
  }
  const fav = creatures.filter((c) => c.favorite);
  if (fav.length) out.push(`${fav.map((c) => c.name).join(', ')} ${fav.length === 1 ? 'is' : 'are'} marked as a favourite.`);
  return out;
}
