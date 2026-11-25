/**
 * chunk 21 (C, "What next?"; the confirmation review, F1) — where the button floats on a phone held upright (next.css
 * says why it floats). Its own small chunk, which WhatNext.tsx loads once the HUD is on screen.
 *
 * Every 300 ms, and on a resize, it sets the anchor's `--next-top`:
 *  - wanted: just below the middle (its top 20 px under half height), clear of the room view's edge cue, whose chevron
 *    is centred at half height, and below the tank on most phones;
 *  - never higher than the toast column's room: two compact toasts under the tank bar (they start 8 px under it);
 *  - never lower than the first thing below it, with 8 px between: the guide card or its pill, the tool hint, the
 *    party banner, the tool row, the room view's Reset view chip, the tab bar.
 * When those leave it no room (a tall guide card on a short phone), it marks the anchor `is-crowded` and the button
 * steps aside (next.css) until there is room again. Elsewhere (a computer, a phone held sideways) it clears both.
 * OWNER: lane "next" (chunk 21).
 */

/** Must match next.css's upright-phone query. */
const UPRIGHT = '(max-width: 720px) and (min-height: 501px)';
const GAP = 8;
/** Two compact phone toasts and the gap between them (hud.css: 46 px each, also at 130 % text). */
const TOAST_ROOM = 2 * 46 + 5;
/** What may sit below the button, in the tank view or the room view. */
const BELOW = '.ag-hud__coach .ag-coach, .ag-hud__coach .ag-coach-pill, .ag-toolhint, .ag-party, .ag-toolrail, .ag-hud__cam--room, [data-testid="nav-tabbar"]';

const shown = (el: Element): DOMRect | null => {
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return null;
  const cs = getComputedStyle(el);
  return cs.visibility === 'hidden' || Number(cs.opacity) === 0 ? null : r;
};

/** Place the anchor once. */
export function placeWhatNext(): void {
  const anchor = document.querySelector<HTMLElement>('.ag-next-anchor');
  if (!anchor) return;
  if (!window.matchMedia(UPRIGHT).matches) {
    anchor.style.removeProperty('--next-top');
    anchor.classList.remove('is-crowded');
    return;
  }
  const h = window.innerHeight;
  const btnH = anchor.querySelector<HTMLElement>('.ag-next-btn')?.offsetHeight || 48;
  const bar = document.querySelector('.ag-tankbar')?.getBoundingClientRect();
  const highest = Math.round((bar && bar.height > 0 ? bar.bottom : 108) + GAP + TOAST_ROOM + GAP);
  let floor = h;
  for (const el of document.querySelectorAll(BELOW)) {
    if (el.closest('.ag-next-anchor')) continue;
    // (the coach's wrapper hides it, not the card itself: read the wrapper's visibility too)
    if (el.closest('.ag-hud__coach') && !shown(el.closest('.ag-hud__coach')!)) continue;
    const r = shown(el);
    // (anything reaching below the toast column counts, even when its top is above it: then there is no room)
    if (r && r.bottom > highest && r.top < floor) floor = r.top;
  }
  const lowest = Math.round(floor - GAP - btnH);
  const crowded = lowest < highest;
  const wanted = Math.round(h / 2 + 20);
  const top = crowded ? highest : Math.max(highest, Math.min(wanted, lowest));
  if (anchor.style.getPropertyValue('--next-top') !== `${top}px`) anchor.style.setProperty('--next-top', `${top}px`);
  anchor.classList.toggle('is-crowded', crowded);
}

/** Keep placing it (every 300 ms and on a resize); returns the stop. */
export function startWhatNextFloat(): () => void {
  placeWhatNext();
  const t = window.setInterval(placeWhatNext, 300);
  window.addEventListener('resize', placeWhatNext);
  return () => {
    window.clearInterval(t);
    window.removeEventListener('resize', placeWhatNext);
  };
}
