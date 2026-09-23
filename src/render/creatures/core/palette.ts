/**
 * Colour helpers: resolve ColorRefs against a creature's appearance, and small colour math for body plans.
 * OWNER: lane "fishart". All returned colours are in three's linear working space.
 */
import * as THREE from 'three';
import type { CreatureVisualParams } from '@/types';
import type { ColorRef } from './plan';

const tmp = new THREE.Color();

export function safeColor(css: string | undefined, fallback = '#888888'): THREE.Color {
  const c = new THREE.Color();
  try {
    c.set(css && /^#|^rgb|^hsl/.test(css) ? css : fallback);
  } catch {
    c.set(fallback);
  }
  return c;
}

export function resolveColor(ref: ColorRef | undefined, a: CreatureVisualParams, fallback: ColorRef = 'body'): THREE.Color {
  const r = ref ?? fallback;
  switch (r) {
    case 'body':
      return safeColor(a.bodyColor);
    case 'body2':
      return safeColor(a.bodyColor2, a.bodyColor);
    case 'belly':
      return safeColor(a.bellyColor, a.bodyColor);
    case 'fin':
      return safeColor(a.finColor, a.bodyColor);
    case 'fin2':
      return safeColor(a.finColor2, a.finColor);
    case 'accent':
      return safeColor(a.accentColor, '#ffffff');
    case 'eye':
      return safeColor(a.eyeColor, '#222222');
    case 'black':
      return safeColor('#0b0a0a');
    case 'white':
      return safeColor('#f4f2ee');
    case 'clear':
      return safeColor('#d8e4e6');
    default:
      return safeColor(r);
  }
}

/** Mix two CSS colours (sRGB) → CSS hex. Handy in body plans for derived tones. */
export function mixHex(a: string, b: string, t: number): `#${string}` {
  const ca = safeColor(a);
  const cb = safeColor(b);
  ca.lerp(cb, t);
  return `#${ca.getHexString()}`;
}

/** Lighten (+) / darken (−) a CSS colour in HSL lightness. */
export function shadeHex(a: string, dl: number, ds = 0): `#${string}` {
  const c = safeColor(a);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.max(0, Math.min(1, hsl.s + ds)), Math.max(0, Math.min(1, hsl.l + dl)));
  return `#${c.getHexString()}`;
}

/** Relative luminance (0..1) of a CSS colour. */
export function luminance(a: string): number {
  tmp.copy(safeColor(a));
  return 0.2126 * tmp.r + 0.7152 * tmp.g + 0.0722 * tmp.b;
}

/** Stable hash of the visual params (for caches). */
export function appearanceHash(a: CreatureVisualParams | undefined): string {
  if (!a) return 'none';
  const s = [
    a.bodyColor,
    a.bodyColor2,
    a.bellyColor,
    a.finColor,
    a.finColor2,
    a.accentColor,
    a.eyeColor,
    a.pattern,
    a.patternScale?.toFixed(2),
    a.patternContrast?.toFixed(2),
    a.patternSeed,
    a.patternRegularity?.toFixed(2) ?? '',
    a.iridescence?.toFixed(2),
    a.metallic?.toFixed(2),
    a.translucency?.toFixed(2),
    a.finType,
    a.finLength?.toFixed(2),
    a.bodyDepth?.toFixed(2),
    a.gillFullness?.toFixed(2),
    a.gillColor ?? '',
    a.glow?.toFixed(2) ?? '',
  ].join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
