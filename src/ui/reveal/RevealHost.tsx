/**
 * Chunk 21, feature B: watches the game for rare finds and opens the reveal card when nothing is in the way. Mounted
 * once, in UIRoot. OWNER: lane "reveal".
 *
 * The feed (src/ui/reveal/feed.ts) queues finds as the sim records them; while some wait, this looks every half
 * second whether the card may open (src/ui/reveal/blockers.ts) and opens it on everything that waits. The card itself
 * (src/ui/reveal/RevealCard.tsx) is its own chunk, fetched the first time something waits and kept mounted after, so
 * its closing animation plays and the main bundle stays small.
 */
import { lazy, Suspense, useEffect, useState } from 'react';
import { useGame } from '@/state/game';
import { usePrefs } from '../common/prefs';
import type { RevealFind } from './finds';
import { readRevealBlockers, revealWaitReason } from './blockers';
import { startRevealFeed } from './feed';
import { useReveal } from './store';

const RevealCard = lazy(() => import('./RevealCard').then((m) => ({ default: m.RevealCard })));

/** How often a waiting reveal looks again whether it may open. */
const RETRY_MS = 500;

/** An animal still in the shop (one that has died or been sold since its birth is left out). */
function stillHere(f: RevealFind): boolean {
  const c = useGame.getState().game?.creatures[f.creatureId];
  return !!c && (c.status === 'alive' || c.status === 'listed');
}

export function RevealHost() {
  useEffect(() => startRevealFeed(), []);
  const on = usePrefs((s) => s.revealFinds !== false);
  const waiting = useReveal((s) => s.waiting.length > 0);
  const open = useReveal((s) => !!s.open);
  // the card's code is fetched the first time a find waits, and stays
  const [load, setLoad] = useState(false);
  useEffect(() => {
    if (waiting || open) setLoad(true);
  }, [waiting, open]);
  // the switch turned off: what waits is dropped and an open card closes
  useEffect(() => {
    if (!on) useReveal.getState().clear();
  }, [on]);
  useEffect(() => {
    if (!on || !waiting || open) return;
    let t = 0;
    const attempt = () => {
      if (revealWaitReason(readRevealBlockers()) === null) useReveal.getState().show(stillHere);
      else t = window.setTimeout(attempt, RETRY_MS);
    };
    // a beat first: the catch-up's welcome-back card is published just after the commit that queued its finds
    t = window.setTimeout(attempt, 350);
    return () => window.clearTimeout(t);
  }, [on, waiting, open]);
  if (!load) return null;
  return (
    <Suspense fallback={null}>
      <RevealCard />
    </Suspense>
  );
}
