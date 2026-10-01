/** The story line a photo leaves on its subject. OWNER: lane "ui-shell". */
import type { GameState } from '@/types';
import { noteInteraction } from '@/sim/life/actions';
import { safe } from '../common/safe';

/**
 * noteInteraction writes one throttled "photo" story line (6 game hours): keep that throttle, just give the line it
 * wrote the tank's name instead of adding a second entry for every shutter press. The history is capped (its length
 * stops growing) and a bond milestone can follow the line, so the new line is found by this hour, not by position.
 * Returns whether a line was added (the preview only says "Added to their story" when one was).
 */
export function notePhoto(d: GameState, creatureId: string): boolean {
  const c = d.creatures[creatureId];
  if (!c) return false;
  const hour = d.clock.hour;
  const isNew = (e: (typeof c.history)[number]) => e.kind === 'photo' && e.hour === hour;
  const had = (c.history ?? []).some(isNew);
  safe('noteInteraction', () => noteInteraction(d, creatureId, 'photo'), undefined);
  const line = had ? undefined : c.history?.find(isNew);
  if (!line) return false;
  line.text = `Posed for a portrait in ${d.tanks[c.tankId ?? '']?.name ?? 'the aquarium'}.`;
  return true;
}
