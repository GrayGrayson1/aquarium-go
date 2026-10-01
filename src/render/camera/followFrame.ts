/**
 * Follow/close framing helper: how far to slide the look-at point so the view through the tank's front face stays
 * inside the tank outline. Pure so it can be unit-tested. OWNER: render (camera).
 *
 * The frame is measured from the optical axis to the FREE rect (canvas minus HUD chrome and sheets), not to the
 * canvas: a phone's bottom-sheet creature card covers half the canvas, and holding that hidden half inside the tank
 * pushed bottom dwellers up under the card. The floating HUD bands are translucent chrome, so half of each still
 * counts as frame (a sliver of stand or wall behind the dock is fine).
 */
import { hudReserve, type FreeRect } from './viewport';

export interface SlideInput {
  /** Where the view ray crosses the front-face plane (tank-local x / y, metres). */
  px: number;
  py: number;
  /** Tank shell outline at the front face. */
  outerL: number;
  bottomY: number;
  topY: number;
  /** Free rect + canvas size (CSS px). */
  fr: FreeRect;
  vw: number;
  vh: number;
  /** Metres per CSS px at the front face. */
  s: number;
}

export function tankSlide(i: SlideInput): { dx: number; dy: number } {
  const { fr, vw, vh, s } = i;
  const ax = (fr.x0 + fr.x1) / 2;
  const ay = (fr.y0 + fr.y1) / 2;
  const hud = hudReserve(vw, vh);
  const left = (ax - fr.x0 + Math.min(fr.x0, hud.left) * 0.5) * s;
  const right = (fr.x1 - ax + Math.min(vw - fr.x1, hud.right) * 0.5) * s;
  const up = (ay - fr.y0 + Math.min(fr.y0, hud.top) * 0.5) * s;
  const down = (fr.y1 - ay + Math.min(vh - fr.y1, hud.bottom) * 0.5) * s;
  // a sliver of rim / stand / wall at the edges is fine; a frame that is mostly room is not
  const mx = (left + right) * 0.05;
  const my = (up + down) * 0.07;
  const x0 = -i.outerL / 2 - mx + left;
  const x1 = i.outerL / 2 + mx - right;
  const y0 = i.bottomY - my + down;
  const y1 = i.topY + my - up;
  const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
  return {
    dx: (x0 <= x1 ? clamp(i.px, x0, x1) : (x0 + x1) / 2) - i.px,
    dy: (y0 <= y1 ? clamp(i.py, y0, y1) : (y0 + y1) / 2) - i.py,
  };
}
