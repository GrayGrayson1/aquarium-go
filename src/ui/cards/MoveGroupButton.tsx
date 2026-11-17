/**
 * Audit 2026-11-17 (D2) — "Move the group (N)" on the card of a schooling, shoaling, colony or group animal: its whole
 * group in this tank goes through the move dialog together, so a school never sits split, half of it "lonely".
 * OWNER: lane "ui-shell".
 */
import { Users } from 'lucide-react';
import type { Creature, GameState } from '@/types';
import { findSpecies } from '@/data/species';
import { sfx } from '@/audio/sfx';
import { useShell } from '../common/shellStore';
import { Button } from '../kit';

/** The animals that would move with this one: alive, of its species, in its tank (itself first). */
export function groupOf(game: GameState, c: Creature): string[] {
  const sp = findSpecies(c.speciesId);
  if (!sp || (sp.social?.minGroup ?? 1) < 2 || !c.tankId || c.status !== 'alive') return [];
  const mates = Object.values(game.creatures).filter((x) => x.id !== c.id && x.status === 'alive' && x.tankId === c.tankId && x.speciesId === c.speciesId);
  return mates.length ? [c.id, ...mates.map((x) => x.id)] : [];
}

export function MoveGroupButton({ c, game }: { c: Creature; game: GameState }) {
  const ids = groupOf(game, c);
  if (ids.length < 2 || game.tankOrder.length < 2) return null;
  return (
    <Button size="sm" variant="ghost" data-testid="move-group" onClick={() => { sfx('open'); useShell.getState().set({ moveCreatureIds: ids }); }}>
      <Users size={14} aria-hidden /> Move the group ({ids.length})
    </Button>
  );
}
