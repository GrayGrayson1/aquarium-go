/**
 * chunk 19 (ADR-0055, QOL-002, QOL-004, QOL-006) — point at a control after going somewhere: wait for it to be drawn
 * (a panel or tab may still be opening), scroll it into view and make it glow for a moment. Links on the tank card,
 * Find anything and "How to unlock" use it. OWNER: lane "ui-shell".
 */

/** How long the glow lasts (ms): three soft pulses. */
export const GLOW_MS = 2700;
const TRIES = 30;
const EVERY_MS = 100;

let seq = 0;

/** Glow the first element matching `selector` once it is on screen (gives up quietly after ~3 s). */
export function glow(selector: string, opts: { block?: ScrollLogicalPosition; within?: string } = {}): void {
  if (typeof document === 'undefined') return;
  const my = ++seq;
  let tries = 0;
  const look = () => {
    if (my !== seq) return; // a newer glow took over
    const root = opts.within ? document.querySelector(opts.within) : document;
    const el = root?.querySelector<HTMLElement>(selector) ?? null;
    if (!el || el.getBoundingClientRect().height === 0) {
      if (++tries < TRIES) window.setTimeout(look, EVERY_MS);
      return;
    }
    try {
      el.scrollIntoView({ block: opts.block ?? 'center', inline: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
    } catch {
      el.scrollIntoView();
    }
    el.classList.remove('ag-glow');
    void el.offsetWidth; // restart the animation when the same control glows twice
    el.classList.add('ag-glow');
    window.setTimeout(() => el.classList.remove('ag-glow'), GLOW_MS);
  };
  window.setTimeout(look, 30);
}

function reducedMotion(): boolean {
  try {
    return document.documentElement.getAttribute('data-reduced-motion') === 'true' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
