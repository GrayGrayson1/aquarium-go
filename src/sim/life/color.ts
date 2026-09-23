/**
 * Tiny colour helpers for appearance resolution (hex <-> HSL, blending, jitter). OWNER: lane "lifecycle".
 * Pure functions, no dependencies.
 */

export type RGB = [number, number, number];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function isHexColor(v: unknown): v is string {
  return typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
}

export function hexToRgb(hex: string): RGB {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  if (!Number.isFinite(n)) return [0.5, 0.5, 0.5];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgbToHex([r, g, b]: RGB): string {
  const to = (v: number) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** h in degrees [0,360), s,l in [0,1]. */
export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const hh = (((h % 360) + 360) % 360) / 360;
  s = clamp01(s);
  l = clamp01(l);
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [hue2rgb(hh + 1 / 3), hue2rgb(hh), hue2rgb(hh - 1 / 3)];
}

/** Linear blend of two hex colours (t=0 → a, t=1 → b). */
export function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const k = clamp01(t);
  return rgbToHex([ca[0] + (cb[0] - ca[0]) * k, ca[1] + (cb[1] - ca[1]) * k, ca[2] + (cb[2] - ca[2]) * k]);
}

/**
 * Shift a colour in HSL. `satMul` scales saturation (richness), `hueShift` in degrees, `lightShift` adds to lightness.
 * Near-greys stay near-grey (saturation scaling has little to act on), so whites/blacks remain believable.
 */
export function adjustHex(hex: string, hueShift: number, satMul: number, lightShift: number): string {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  // Very light or very dark colours tolerate less lightness change before they look wrong.
  const lightRoom = Math.min(l, 1 - l) * 2; // 0 at black/white, 1 at mid
  const nl = clamp01(l + lightShift * (0.35 + 0.65 * lightRoom));
  const ns = clamp01(s * satMul);
  return rgbToHex(hslToRgb(h + hueShift * (0.3 + 0.7 * s), ns, nl));
}

/** 0..1 saturation of a hex colour. */
export function saturationOf(hex: string): number {
  return rgbToHsl(hexToRgb(hex))[1];
}
