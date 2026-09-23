/**
 * Per-water-class look (fog tint, absorption, caustics, colour grade) and the day/night fixture schedule.
 * OWNER: lane "waterfx". Pure data + pure functions (no React) so tests and other lanes can use them.
 */
import * as THREE from 'three';
import type { LightPreset, TankLighting, WaterClass } from '@/types';

export interface WaterGrade {
  /** Multiplicative colour balance applied after tone mapping (1 = neutral). */
  gain: [number, number, number];
  /** Additive shadow lift (display-referred, tiny). */
  lift: [number, number, number];
  saturation: number;
  contrast: number;
}

export interface WaterLook {
  /** In-scatter (fog) colour at full light, sRGB hex. */
  tint: string;
  /** Per-channel absorption per metre (red dies first in real water). */
  absorb: [number, number, number];
  /** Scatter density per metre in crystal-clear water. */
  fog: number;
  caustic: number;
  /** Caustic cells per metre. */
  causticScale: number;
  /** Light-shaft strength multiplier. */
  shafts: number;
  /** In-scatter brightness of the lit water column (1 = marine reference). Black-backed freshwater needs more. */
  scatter: number;
  grade: WaterGrade;
}

export const WATER_LOOKS: Record<WaterClass, WaterLook> = {
  freshwater_cool: {
    tint: '#4aa89c',
    absorb: [0.36, 0.07, 0.11],
    fog: 0.34,
    caustic: 1.1,
    causticScale: 22,
    shafts: 1.35,
    scatter: 3.2,
    grade: { gain: [0.98, 1.0, 1.01], lift: [0.0000, 0.0013, 0.0020], saturation: 1.02, contrast: 1.04 },
  },
  freshwater_tropical: {
    tint: '#5ea67a',
    absorb: [0.3, 0.08, 0.22],
    fog: 0.36,
    caustic: 1.1,
    causticScale: 22,
    shafts: 1.4,
    scatter: 2.5,
    grade: { gain: [1.02, 1.0, 0.96], lift: [0.0013, 0.0013, 0.0000], saturation: 1.06, contrast: 1.05 },
  },
  // lane:qa-visual — cleaner, more luminous planted water: a paler sage-gold glow (was a saturated olive that read
  // murky), clearer mid-water (less scatter density + blue absorption) so plants and small fish keep their colour,
  // and the warm green-gold mood carried by the grade instead of the haze.
  freshwater_planted: {
    tint: '#a6cc86',
    absorb: [0.24, 0.06, 0.2],
    fog: 0.25,
    caustic: 1.2,
    causticScale: 22,
    shafts: 1.5,
    scatter: 3.0,
    grade: { gain: [1.04, 1.01, 0.95], lift: [0.0012, 0.0012, 0.0002], saturation: 1.1, contrast: 1.08 },
  },
  marine_fowlr: {
    tint: '#2f8cbc',
    absorb: [0.6, 0.12, 0.04],
    fog: 0.36,
    caustic: 1.15,
    causticScale: 21,
    shafts: 1.0,
    scatter: 1,
    grade: { gain: [0.96, 1.0, 1.04], lift: [0.0000, 0.0010, 0.0027], saturation: 1.06, contrast: 1.06 },
  },
  marine_live_rock: {
    tint: '#2c86b8',
    absorb: [0.62, 0.13, 0.05],
    fog: 0.38,
    caustic: 1.15,
    causticScale: 21,
    shafts: 1.0,
    scatter: 1,
    grade: { gain: [0.96, 1.0, 1.04], lift: [0.0000, 0.0010, 0.0027], saturation: 1.06, contrast: 1.06 },
  },
  reef: {
    tint: '#2466b4',
    absorb: [0.72, 0.18, 0.03],
    fog: 0.4,
    caustic: 1.2,
    causticScale: 21,
    shafts: 1.1,
    scatter: 1,
    grade: { gain: [0.95, 0.98, 1.06], lift: [0.0010, 0.0000, 0.0033], saturation: 1.08, contrast: 1.07 },
  },
  // lane:brackish — estuary water: clear, muted olive-teal in-scatter with a warm tannin stain (blue absorbed first),
  // distinct from freshwater green and marine blue.
  brackish: {
    tint: '#4e8e88',
    absorb: [0.26, 0.09, 0.36],
    fog: 0.36,
    caustic: 1.1,
    causticScale: 21,
    shafts: 1.3,
    scatter: 2.2,
    grade: { gain: [1.035, 0.995, 0.95], lift: [0.0016, 0.0011, 0.0002], saturation: 1.02, contrast: 1.05 },
  },
};

export function waterLook(wc: WaterClass | string): WaterLook {
  return WATER_LOOKS[wc as WaterClass] ?? WATER_LOOKS.freshwater_tropical;
}

const ALGAE_GREEN = new THREE.Color('#6f8f2e');
const MURK = new THREE.Color('#7d8a6a');

/** Resolved fog parameters for current water chemistry (clarity + algae). Writes into `outTint`. */
export function resolveWaterFog(
  wc: WaterClass | string,
  water: { clarity?: number; algae?: number } | undefined,
  outTint: THREE.Color,
): { density: number; caustic: number; shafts: number; absorb: [number, number, number] } {
  const look = waterLook(wc);
  const clarity = clamp01(water?.clarity ?? 1);
  const algae = clamp01((water?.algae ?? 0) / 100);
  outTint.set(look.tint);
  // algae → green cast; low clarity → milky murk
  outTint.lerp(ALGAE_GREEN, algae * 0.55);
  outTint.lerp(MURK, (1 - clarity) * 0.35);
  const density = look.fog * (1 + (1 - clarity) * 3.2 + algae * 1.6);
  return {
    density,
    caustic: look.caustic * (0.35 + 0.65 * clarity) * (1 - algae * 0.35),
    shafts: look.shafts * (1 + (1 - clarity) * 0.8),
    absorb: [look.absorb[0] + algae * 0.2, look.absorb[1], look.absorb[2] + algae * 0.6],
  };
}

// ───────────────────────────── Fixture light presets + day/night schedule ─────────────────────────────

export interface LightPresetDef {
  color: string;
  /** Relative brightness. */
  level: number;
  /** 0..1 how "actinic" (drives coral fluorescence hints + grade). */
  actinic: number;
}

export const LIGHT_PRESETS: Record<LightPreset, LightPresetDef> = {
  daylight: { color: '#fff5e8', level: 1.0, actinic: 0 },
  warm: { color: '#ffd9a6', level: 0.92, actinic: 0 },
  planted: { color: '#ffeedd', level: 1.05, actinic: 0 },
  reef_actinic: { color: '#4b5cff', level: 0.8, actinic: 1 },
  reef_full: { color: '#d6e3ff', level: 1.1, actinic: 0.45 },
  moonlight: { color: '#5a78e6', level: 0.28, actinic: 0.3 },
  sunset: { color: '#ffa66e', level: 0.8, actinic: 0 },
  cool: { color: '#e6f0ff', level: 1.0, actinic: 0.1 },
};

const SUNRISE = new THREE.Color('#ff9a5c');
const DUSK = new THREE.Color('#ff7f55');
const MOON = new THREE.Color('#4c66d6');
const DARK = new THREE.Color('#0b1426');
const _c = new THREE.Color();
const _p = new THREE.Color();

export interface TankLightState {
  /** Linear light colour × brightness (feeds uLightColor). */
  color: THREE.Color;
  /** Scalar brightness (0 = pitch dark, ~1 = full fixture). */
  level: number;
  /** 0..1 fixture on-ness (0 at night even with moonlight). */
  day: number;
  /** 0..1 moonlight contribution. */
  moon: number;
  actinic: number;
}

export function createLightState(): TankLightState {
  return { color: new THREE.Color(1, 1, 1), level: 1, day: 1, moon: 0, actinic: 0 };
}

const RAMP_H = 1.0;

function hod(hour: number) {
  return ((hour % 24) + 24) % 24;
}
/** Hours elapsed since `from` going forward around the clock. */
function since(from: number, h: number) {
  return (h - from + 24) % 24;
}

/**
 * Fixture light for a tank at an absolute game hour: on/off schedule with ~1 h sunrise/sunset ramps
 * (warm dawn → preset → orange dusk), moonlight at night when enabled.
 */
export function computeTankLight(lighting: TankLighting | undefined, hour: number, out: TankLightState): TankLightState {
  const preset = LIGHT_PRESETS[lighting?.preset ?? 'daylight'] ?? LIGHT_PRESETS.daylight;
  const intensity = Math.max(0, Math.min(1.5, lighting?.intensity ?? 1));
  const on = lighting?.onHour ?? 7;
  const off = lighting?.offHour ?? 22;
  const moonOn = lighting?.moonlight ?? true;
  const h = hod(hour);
  const span = (off - on + 24) % 24 || 24;
  const t = since(on, h); // hours since lights on
  let day = 0;
  _p.set(preset.color);
  _c.copy(_p);
  if (t < span) {
    const ramp = Math.min(RAMP_H, span / 3);
    if (t < ramp) {
      const k = smooth(t / ramp);
      day = k;
      _c.copy(SUNRISE).lerp(_p, k);
    } else if (t > span - ramp) {
      const k = smooth((span - t) / ramp);
      day = k;
      _c.copy(DUSK).lerp(_p, k);
    } else {
      day = 1;
    }
  }
  const moon = moonOn ? 1 - day : 0;
  const level = day * preset.level * intensity + moon * 0.22 + (1 - day) * (1 - moon) * 0.035;
  // colour: fixture colour weighted by `day`, moonlight blue otherwise
  out.color.copy(_c).multiplyScalar(day * preset.level * intensity);
  out.color.r += MOON.r * moon * 0.22 + DARK.r * (1 - day) * (1 - moon) * 0.035;
  out.color.g += MOON.g * moon * 0.22 + DARK.g * (1 - day) * (1 - moon) * 0.035;
  out.color.b += MOON.b * moon * 0.22 + DARK.b * (1 - day) * (1 - moon) * 0.035;
  out.level = level;
  out.day = day;
  out.moon = moon;
  out.actinic = preset.actinic * day + moon * 0.4;
  return out;
}

function smooth(x: number) {
  const k = Math.max(0, Math.min(1, x));
  return k * k * (3 - 2 * k);
}
function clamp01(x: number) {
  return Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
}
