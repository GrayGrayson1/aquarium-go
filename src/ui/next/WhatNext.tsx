/**
 * chunk 21 (C, "What next?") — the "What next?" button (also the N key). Pressing it opens the sheet of the most
 * useful things to do now (./NextSheet.tsx, with the ranking in ./nextBest.ts).
 *
 * Only this file is in the main chunk (chunk 21 review S3): the sheet, the ranking and the way there are their own
 * chunk, fetched when the pointer or the focus reaches the button, or when it opens. A load that fails leaves the
 * sheet out (its error boundary) and the button as it was.
 *
 * Where the button sits (next.css): in the tank bar after Room on a computer and on a phone held sideways; on a phone
 * held upright it floats at the right edge at mid-height, because the tank switcher needs the whole bar for its
 * status line (chunk 21 review B1). OWNER: lane "next" (chunk 21).
 */
import { lazy, Suspense } from 'react';
import clsx from 'clsx';
import { AnimatePresence } from 'motion/react';
import { Lightbulb } from 'lucide-react';
import { sfx } from '@/audio/sfx';
import { useShell } from '../common/shellStore';
import { ErrorBoundary } from '../common/ErrorBoundary';
import './next.css';

const load = () => import('./NextSheet');
const NextSheet = lazy(() => load().then((m) => ({ default: m.NextSheet })));
const prefetch = () => void load().catch(() => undefined);

/** Open or close the sheet (the button, and the N key). */
export function toggleWhatNext(): void {
  const shell = useShell.getState();
  sfx(shell.popover === 'next' ? 'close' : 'open');
  shell.togglePopover('next');
}

/** The N key opens it only while its button is on screen (a phone's full panel or bottom sheet hides it). */
export function whatNextReachable(): boolean {
  const btn = document.querySelector<HTMLElement>('[data-testid="hud-next"]');
  return !!btn && btn.getClientRects().length > 0 && getComputedStyle(btn).visibility === 'visible';
}

export function WhatNextButton() {
  const open = useShell((s) => s.popover === 'next');
  return (
    <div className="ag-popanchor ag-next-anchor">
      <button
        type="button"
        className={clsx('ag-hudpill ag-hudbtn ag-next-btn', open && 'is-on')}
        data-testid="hud-next"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="What next? (N)"
        onClick={toggleWhatNext}
        onPointerEnter={prefetch}
        onFocus={prefetch}
      >
        <Lightbulb size={16} aria-hidden />
        <span className="ag-next-btn__label">What next?</span>
      </button>
      <ErrorBoundary name="what-next" resetKey={open}>
        <Suspense fallback={null}>
          <AnimatePresence>{open && <NextSheet key="next" />}</AnimatePresence>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
