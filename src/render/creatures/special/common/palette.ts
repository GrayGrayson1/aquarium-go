/**
 * Appearance → linear-space palette helpers. OWNER: lane "critterart".
 */
import * as THREE from 'three';
import type { CreatureVisualParams } from '@/types';
import type { CritterUniforms } from './materials';
import { PATTERN_IDS } from './materials';

export function color(hex: string | undefined, fallback = '#888888'): THREE.Color {
  const c = new THREE.Color();
  try {
    c.set(hex && /^#?[0-9a-fA-F]{3,8}$/.test(hex.replace('#', '')) ? hex : fallback);
  } catch {
    c.set(fallback);
  }
  return c;
}

export const luma = (c: THREE.Color) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

/** Fill the standard palette slots from appearance. */
export function applyAppearance(u: CritterUniforms, a: CreatureVisualParams): void {
  const p = u.uAgcPal.value;
  p[0].copy(color(a.bodyColor));
  p[1].copy(color(a.bodyColor2, a.bodyColor));
  p[2].copy(color(a.bellyColor, a.bodyColor));
  p[3].copy(color(a.finColor, a.bodyColor));
  p[4].copy(color(a.finColor2, a.finColor));
  p[5].copy(color(a.accentColor, a.bodyColor));
  p[6].copy(color(a.gillColor ?? a.finColor, a.bodyColor));
  p[7].copy(color(a.eyeColor, '#111111'));
  u.uAgcPat.value.set(
    PATTERN_IDS[a.pattern] ?? 0,
    Number.isFinite(a.patternScale) ? a.patternScale : 1,
    Number.isFinite(a.patternContrast) ? a.patternContrast : 0.5,
    ((a.patternSeed ?? 0) % 997) / 997 * 61.7,
  );
  u.uAgcMat.value.set(a.iridescence ?? 0, a.metallic ?? 0, a.translucency ?? 0, a.glow ?? 0);
}
