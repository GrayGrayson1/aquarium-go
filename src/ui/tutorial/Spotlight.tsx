/**
 * chunk 19 (ADR-0055 decision 7, QOL-008) — the guide's and the tour's spotlight: the screen dims softly except a
 * rounded window round what to tap next, a ring glows round it and a hand taps beside it; when the target changes the
 * window glides to it. It never takes a tap (pointer-events: none): the game stays playable under it. `candidates`
 * are CSS selectors in order of preference, and the first one drawn (and not covered by a sheet, unless `covered`
 * is allowed) is the target, so a step can say "the suggested decor card, else the Decor tab, else Build in the dock"
 * without knowing which is on screen. With no target and `dimAll`, the whole screen dims (the tour's opening and
 * closing cards). OWNER: lane "ui-shell".
 */
import { useEffect, useId, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Pointer } from 'lucide-react';
import { useSettings } from '@/state/settings';

const reducedMotion = () => useSettings.getState().reducedMotion || (typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  round: boolean;
}

const PAD = 6;
const EVERY_MS = 200;

/** Sheets, popovers and the guide itself: a target under one of these isn't really on screen. */
const COVERS = '.ag-sheet, .pn-sheet, .ag-popover, .ag-coach, .ag-coach-pill, .ag-modal, .ag-welcome, .ag-tour';

function covered(el: HTMLElement, r: DOMRect): boolean {
  const x = Math.min(window.innerWidth - 1, Math.max(0, r.left + r.width / 2));
  const y = Math.min(window.innerHeight - 1, Math.max(0, r.top + r.height / 2));
  const top = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!top || el.contains(top) || top.contains(el)) return false;
  return !!top.closest(COVERS) && !top.closest(COVERS)?.contains(el);
}

/** The first candidate drawn on screen, measured (null when none is). Exported for tests through the DOM. */
export function findTarget(candidates: readonly string[], allowCovered = false): { el: HTMLElement; rect: Rect } | null {
  for (const sel of candidates) {
    let el: HTMLElement | null = null;
    try {
      el = document.querySelector<HTMLElement>(sel);
    } catch {
      el = null;
    }
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.right < 0 || r.top > window.innerHeight || r.left > window.innerWidth) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
    if (!allowCovered && covered(el, r)) continue;
    const radius = parseFloat(cs.borderTopLeftRadius || '0');
    return { el, rect: { x: r.left, y: r.top, w: r.width, h: r.height, round: radius >= Math.min(r.width, r.height) / 2 - 1 } };
  }
  return null;
}

/** Track the first visible candidate (re-measured a few times a second and on resize). */
export function useSpotlightTarget(candidates: readonly string[], opts: { allowCovered?: boolean; scrollIntoView?: boolean } = {}): Rect | null {
  const key = candidates.join('\n');
  const [rect, setRect] = useState<Rect | null>(null);
  useLayoutEffect(() => {
    let timer = 0;
    let last = '';
    let scrolled = '';
    const measure = () => {
      const hit = findTarget(candidates, opts.allowCovered);
      if (hit && opts.scrollIntoView && scrolled !== hit.el.dataset.testid + hit.el.className) {
        // a target inside a scrolling list (a sheet, the dock on a phone) is brought into view once
        scrolled = hit.el.dataset.testid + hit.el.className;
        const inScroll = hit.el.closest('.pn-body, .ag-dock__scroll, .ag-sheet__body');
        if (inScroll) {
          const r = hit.el.getBoundingClientRect();
          const box = inScroll.getBoundingClientRect();
          if (r.top < box.top || r.bottom > box.bottom || r.left < box.left || r.right > box.right) hit.el.scrollIntoView({ block: 'center', inline: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
        }
      }
      const r = hit?.rect ?? null;
      const k = r ? `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.w)},${Math.round(r.h)},${r.round}` : 'none';
      if (k !== last) {
        last = k;
        setRect(r);
      }
      // (a hidden tab measures once a second: nothing on screen moves there)
      timer = window.setTimeout(measure, document.hidden ? 1000 : EVERY_MS);
    };
    measure();
    const onResize = () => {
      last = '';
      measure();
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, [key, opts.allowCovered, opts.scrollIntoView]); // eslint-disable-line react-hooks/exhaustive-deps
  return rect;
}

export function Spotlight({ rect, dim = true, dimAll = false, hand = true, gold = false, testId = 'guide-spotlight' }: { rect: Rect | null; dim?: boolean; dimAll?: boolean; hand?: boolean; /** 0.5 §5.5: a destination that lives in the phone's More rings gold */ gold?: boolean; testId?: string }) {
  const reduced = useSettings((s) => s.reducedMotion);
  const maskId = `ag-spot-${useId().replace(/:/g, '')}`;
  const [vw, setVw] = useState(() => (typeof window === 'undefined' ? 0 : window.innerWidth));
  const [vh, setVh] = useState(() => (typeof window === 'undefined' ? 0 : window.innerHeight));
  useEffect(() => {
    const on = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  if (typeof document === 'undefined') return null;
  const root = document.querySelector('.ag-ui') ?? document.body;
  const showDim = (dim && !!rect) || dimAll;
  const hole = rect ? { x: rect.x - PAD, y: rect.y - PAD, width: rect.w + PAD * 2, height: rect.h + PAD * 2, rx: rect.round ? (rect.h + PAD * 2) / 2 : 16 } : null;
  const glide = reduced ? { duration: 0 } : { type: 'spring' as const, stiffness: 260, damping: 30 };
  return createPortal(
    <div className="ag-spot" data-testid={testId} data-target={rect ? 'on' : 'none'} aria-hidden>
      <AnimatePresence>
        {showDim && (
          <motion.svg key="dim" className="ag-spot__dim" width={vw} height={vh} viewBox={`0 0 ${vw} ${vh}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.35 }}>
            <defs>
              <mask id={maskId}>
                <rect x={0} y={0} width={vw} height={vh} fill="white" />
                {hole && <motion.rect initial={false} animate={hole} transition={glide} fill="black" />}
              </mask>
            </defs>
            <rect x={0} y={0} width={vw} height={vh} fill="rgba(2, 9, 14, 0.5)" mask={`url(#${maskId})`} />
          </motion.svg>
        )}
      </AnimatePresence>
      {hole && (
        <motion.div
          className={`ag-spot__ring${rect?.round ? ' is-round' : ''}${gold ? ' is-gold' : ''}`}
          initial={false}
          animate={{ left: hole.x, top: hole.y, width: hole.width, height: hole.height }}
          transition={glide}
          data-testid={`${testId}-ring`}
        />
      )}
      {hole && hand && (
        <motion.div className="ag-spot__hand" initial={false} animate={{ left: hole.x + hole.width - 14, top: hole.y + hole.height - 10 }} transition={glide}>
          <Pointer size={26} strokeWidth={1.8} aria-hidden />
        </motion.div>
      )}
    </div>,
    root,
  );
}
