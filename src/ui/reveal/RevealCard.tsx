/**
 * Chunk 21, feature B: the rare-hatch reveal card. OWNER: lane "reveal".
 *
 * RevealHost (src/ui/reveal/RevealHost.tsx) opens it over the game when young are born and one is a rare first for the
 * collection (the rule: src/ui/reveal/finds.ts): a short build-up, then the animal's picture, name, morph, rarity chips
 * and "New for your collection", with "See it" (the animal's card), "Open collection" (the Collection's address,
 * #/encyclopedia/collection/{species}) and Close. Several finds make one card with a pager (Left and Right arrows turn
 * it too). The kit's Modal gives it the dialog's manners: Escape and a tap outside close it, Tab stays inside, focus
 * comes back afterwards. With reduced motion there is no build-up and no animation, just the card. The toast and the
 * log line the sim writes for the same birth stay as they are. Loaded on demand (its own chunk). Reads the game;
 * never writes it.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useGame } from '@/state/game';
import { useSettings } from '@/state/settings';
import { findSpecies } from '@/data/species';
import { sfx } from '@/audio/sfx';
import { Button, IconButton, Modal } from '../kit';
import { Portrait } from '../common/Portrait';
import { MorphTierBadge, PrismaticBadge, StrainBadge } from '../common/Prismatic';
import { safe } from '../common/safe';
import { go, parseNav } from '../nav/router';
import { REVEAL_WORDS, collectionHash, revealView, type RevealFind } from './finds';
import { useReveal } from './store';
import './reveal.css';

/** The build-up before the animal shows. */
export const BUILD_UP_MS = 1300;

const osReducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
/** The card (loaded on demand by RevealHost, src/ui/reveal/RevealHost.tsx). */
export function RevealCard() {
  const pages = useReveal((s) => s.open);
  const page = useReveal((s) => s.page);
  const opened = useReveal((s) => s.opened);
  const reduced = useSettings((s) => s.reducedMotion) || osReducedMotion();
  const count = pages?.length ?? 0;
  const isOpen = count > 0;
  // the build-up plays once per opening (paging shows the next animal at once): `builtFor` is the opening whose
  // build-up has finished, so a new opening starts on its build-up from its very first frame
  const [builtFor, setBuiltFor] = useState(-1);
  const building = isOpen && !reduced && builtFor !== opened;
  useEffect(() => {
    if (!isOpen) return;
    // the animal arrives with a chime
    if (reduced) {
      sfx('unlock', { volume: 0.7 });
      return;
    }
    const t = window.setTimeout(() => {
      setBuiltFor(opened);
      sfx('unlock', { volume: 0.7 });
    }, BUILD_UP_MS);
    return () => window.clearTimeout(t);
  }, [opened, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Left and Right turn the pager while the card is open
  useEffect(() => {
    if (!isOpen || count < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if ((e.target as HTMLElement | null)?.closest?.('input, select, textarea')) return;
      e.preventDefault();
      e.stopPropagation();
      useReveal.getState().turn(e.key === 'ArrowRight' ? 1 : -1);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isOpen, count]);

  const find = pages?.[Math.min(page, count - 1)] ?? null;
  const shown = !building && !!find;
  const close = () => useReveal.getState().close();
  const seeIt = () => {
    if (!find) return;
    close();
    go({ kind: 'creature', creatureId: find.creatureId });
  };
  const openCollection = () => {
    if (!find) return;
    close();
    // feature A's Collection, by its address only (an address this build doesn't know opens the Encyclopedia)
    const to = parseNav(collectionHash(find.speciesId));
    go(to ? to.route : { kind: 'panel', panel: 'encyclopedia' });
  };
  return (
    <Modal
      open={isOpen}
      onClose={close}
      testId="hatch-reveal"
      width={400}
      title={
        <span className="ag-hatch__title">
          <Sparkles size={15} aria-hidden /> {shown ? REVEAL_WORDS.over : REVEAL_WORDS.buildUp}
        </span>
      }
    >
      <div className="ag-hatch" data-phase={shown ? 'shown' : 'build'}>
        <div className="ag-hatch__live" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {shown ? (
              <motion.div
                key={find.creatureId}
                className="ag-hatch__page"
                initial={reduced ? false : { opacity: 0, scale: 0.82, filter: 'blur(6px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={reduced ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
                transition={{ type: 'spring', stiffness: 240, damping: 22 }}
              >
                <FindPage find={find} />
              </motion.div>
            ) : (
              <motion.div key="build" className="ag-hatch__stage" exit={reduced ? undefined : { opacity: 0, scale: 1.15, transition: { duration: 0.18 } }}>
                <span className="ag-hatch__orb" aria-hidden />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {shown && (
          <div className="ag-hatch__foot">
            {count > 1 && (
              <div className="ag-hatch__pager">
                <IconButton label={REVEAL_WORDS.previous} disabled={page <= 0} onClick={() => useReveal.getState().turn(-1)} data-testid="hatch-reveal-prev">
                  <ChevronLeft size={16} />
                </IconButton>
                <span className="ag-hatch__count" data-testid="hatch-reveal-pager">
                  {REVEAL_WORDS.pager(page + 1, count)}
                </span>
                <IconButton label={REVEAL_WORDS.next} disabled={page >= count - 1} onClick={() => useReveal.getState().turn(1)} data-testid="hatch-reveal-next">
                  <ChevronRight size={16} />
                </IconButton>
              </div>
            )}
            <div className="ag-row ag-hatch__actions">
              <Button variant="primary" onClick={seeIt} data-testid="hatch-reveal-see">
                {REVEAL_WORDS.see}
              </Button>
              <Button onClick={openCollection} data-testid="hatch-reveal-collection">
                {REVEAL_WORDS.collection}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** One animal: its picture, name, morph, chips and why it is a find. */
function FindPage({ find }: { find: RevealFind }) {
  const c = useGame((s) => s.game?.creatures[find.creatureId]);
  const g = useGame.getState().game;
  const view = g ? safe('revealView', () => revealView(g, find), null) : null;
  if (!c || !view) return null;
  const strain = find.newStrain ? findSpecies(c.speciesId)?.genetics.strains?.find((s) => s.id === find.newStrain!.id) : undefined;
  return (
    <>
      <div className="ag-hatch__stage">
        <Portrait subject={c} shape="circle" size={192} className="ag-hatch__portrait" />
      </div>
      <h3 className="ag-hatch__name" data-testid="hatch-reveal-name">
        {view.name}
      </h3>
      <div className="ag-hatch__morph">{view.morph}</div>
      <div className="ag-hatch__chips">
        {find.prismatic && <PrismaticBadge />}
        {strain && find.newStrain && <StrainBadge strain={strain} tier={find.newStrain.tier} />}
        {find.newMorph && <MorphTierBadge tier={find.newMorph.tier} share={find.newMorph.share ?? undefined} />}
      </div>
      {view.lines.map((line) => (
        <p key={line} className="ag-hatch__why">
          {line}
        </p>
      ))}
    </>
  );
}
