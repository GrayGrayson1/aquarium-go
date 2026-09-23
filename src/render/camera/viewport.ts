/**
 * Free viewport: the part of the canvas that is not covered by HUD chrome or side/bottom sheets, so the camera can
 * frame the aquarium inside it (lens shift + fit). OWNER: render.
 *
 * Contract with the UI: any DOM element with `data-occlude="right" | "bottom"` (also "left" | "top") covers the
 * viewport from that edge up to its bounding rect. Hidden (display:none / visibility:hidden / opacity 0) or
 * off-canvas elements don't count, so sheets that slide or fade out release the space on their own.
 * The fixed HUD (top bar, bottom dock) is a constant reserve (`hudReserve`), not measured.
 * Menu screens (title / starter / naming) are measured too: marking their text blocks `data-occlude` lets the attract
 * camera frame the tank in the space left over (portrait phones fall back to fixed bands, `computeMenuRect`).
 */

export interface FreeRect {
  /** Canvas-relative CSS pixels. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Occlusion {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** True for phone-like layouts (portrait or narrow). */
export function isPhoneLayout(w: number, h: number): boolean {
  return w < 700 || w / Math.max(1, h) < 0.9;
}

/** Space the always-on HUD takes from the top and bottom edges (CSS px). */
export function hudReserve(w: number, h: number): { top: number; bottom: number; left: number; right: number } {
  if (isPhoneLayout(w, h)) return { top: 112, bottom: 150, left: 0, right: 0 };
  // desktop: top bar + tank switcher row ≈ 130 px, dock ≈ 110 px; short windows get a little back
  const k = h < 700 ? 0.8 : 1;
  return { top: 130 * k, bottom: 110 * k, left: 0, right: 0 };
}

/** Width of the desktop tool rail strip at the right edge (rail + its margin), CSS px. */
const DESKTOP_RAIL_PX = 96;

type VisCheck = HTMLElement & { checkVisibility?: (o?: { opacityProperty?: boolean; visibilityProperty?: boolean }) => boolean };

/** Measure `[data-occlude]` elements against the canvas rect. Cheap: a handful of rect reads. */
export function measureOcclusion(canvas: DOMRect, out: Occlusion): Occlusion {
  out.left = out.right = out.top = out.bottom = 0;
  if (typeof document === 'undefined') return out;
  const els = document.querySelectorAll<HTMLElement>('[data-occlude]');
  for (let i = 0; i < els.length; i++) {
    const el = els[i] as VisCheck;
    const side = el.dataset.occlude;
    if (!side) continue;
    const r = el.getBoundingClientRect();
    const x0 = Math.max(r.left, canvas.left);
    const x1 = Math.min(r.right, canvas.right);
    const y0 = Math.max(r.top, canvas.top);
    const y1 = Math.min(r.bottom, canvas.bottom);
    if (x1 - x0 < 12 || y1 - y0 < 12) continue;
    try {
      if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    } catch {
      /* older engines: assume visible */
    }
    switch (side) {
      case 'right':
        out.right = Math.max(out.right, canvas.right - x0);
        break;
      case 'left':
        out.left = Math.max(out.left, x1 - canvas.left);
        break;
      case 'bottom':
        out.bottom = Math.max(out.bottom, canvas.bottom - y0);
        break;
      case 'top':
        out.top = Math.max(out.top, y1 - canvas.top);
        break;
      default:
        break;
    }
  }
  return out;
}

/**
 * Free rect = canvas − max(HUD reserve, occluders). Occluders that would leave less than ~40 % of the canvas width
 * (or ~12 % of its height) are treated as full-screen overlays and ignored — shifting behind them is pointless.
 */
export function computeFreeRect(w: number, h: number, occ: Occlusion, withHud: boolean, out: FreeRect): FreeRect {
  const hud = withHud ? hudReserve(w, h) : { top: 0, bottom: 0, left: 0, right: 0 };
  let left = Math.max(hud.left, occ.left);
  // lane:qa-visual — desktop: a left-hand sheet (tank card) pushes the tank toward the right edge, where the tool rail
  // lives (it isn't a sheet, so it isn't measured): keep the rail's strip clear so the tank never tucks under it
  const rail = withHud && occ.left > 0 && !isPhoneLayout(w, h) ? DESKTOP_RAIL_PX : 0;
  let right = Math.max(hud.right, occ.right, rail);
  let top = Math.max(hud.top, occ.top);
  let bottom = Math.max(hud.bottom, occ.bottom);
  if (w - left - right < w * 0.4) {
    left = hud.left;
    right = hud.right;
  }
  if (h - top - bottom < h * 0.12) {
    // keep the HUD reserve, drop the sheet
    top = hud.top;
    bottom = hud.bottom;
    if (h - top - bottom < h * 0.12) top = bottom = 0;
  }
  out.x0 = left;
  out.x1 = Math.max(left + 1, w - right);
  out.y0 = top;
  out.y1 = Math.max(top + 1, h - bottom);
  return out;
}

/**
 * Menu screens (title / starter pick / naming) in portrait: the UI stacks its content in the lower part of the screen,
 * so the attract camera frames the tank in the band above it. If the UI marks its blocks with `data-occlude`, the
 * measured rect wins (see `computeMenuRect`); these fractions are the fallback, tuned on a 390×844 phone.
 */
const MENU_BANDS: Record<string, [number, number]> = {
  title: [0.07, 0.55],
  starter: [0.1, 0.37],
  naming: [0.015, 0.28],
};

/**
 * Free rect for a menu screen: measured `[data-occlude]` blocks if the UI provides any, else the portrait band for the
 * screen, else the whole canvas (landscape menus keep their own composition).
 */
export function computeMenuRect(w: number, h: number, occ: Occlusion, screen: string, out: FreeRect): FreeRect {
  const measured = occ.left + occ.right + occ.top + occ.bottom > 0;
  if (measured) return computeFreeRect(w, h, occ, false, out);
  const band = isPhoneLayout(w, h) && w / Math.max(1, h) < 0.9 ? MENU_BANDS[screen] : undefined;
  out.x0 = 0;
  out.x1 = w;
  out.y0 = band ? band[0] * h : 0;
  out.y1 = band ? band[1] * h : h;
  return out;
}

/** Live snapshot for debugging / UI (read-only). */
export const viewportState = {
  free: { x0: 0, y0: 0, x1: 1, y1: 1 } as FreeRect,
  occlusion: { left: 0, right: 0, top: 0, bottom: 0 } as Occlusion,
};
