/**
 * Chunk 21, feature B: feeds the reveal queue from the game store. OWNER: lane "reveal".
 *
 * Every store commit of the same aquarium is read against the one before it (src/ui/reveal/finds.ts): the game loop's
 * ticks, the dev tools' time jumps and the hidden-tab catch-up (one commit) all come through here, so a find is seen
 * the moment the sim records it, whatever ran it. Another aquarium resets the queue without reading its backlog. With
 * Settings › Notifications › Reveal rare finds off, nothing is queued. Reads only; never writes game state.
 */
import { useGame } from '@/state/game';
import { usePrefs } from '../common/prefs';
import { safe } from '../common/safe';
import { revealFindsInCommit } from './finds';
import { useReveal } from './store';

/** The player's switch (on unless turned off; an older stored preference has no value, which reads as on). */
export const revealsOn = (): boolean => usePrefs.getState().revealFinds !== false;

/** Start watching the game store (returns the unsubscribe). */
export function startRevealFeed(): () => void {
  const first = useGame.getState().game;
  useReveal.getState().reset(first?.saveId ?? null);
  return useGame.subscribe((s, p) => {
    const next = s.game;
    const prev = p.game;
    if (next === prev) return;
    const r = useReveal.getState();
    if (!next) {
      if (r.saveId !== null || r.open || r.waiting.length) r.reset(null);
      return;
    }
    if (r.saveId !== next.saveId) {
      r.reset(next.saveId);
      return;
    }
    if (!prev || prev.saveId !== next.saveId || prev.log === next.log || next.isShowcase || !revealsOn()) return;
    const finds = safe('revealFinds', () => revealFindsInCommit(prev, next), []);
    if (finds.length) r.add(next.saveId, finds);
  });
}
