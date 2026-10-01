/**
 * UI/game sound API. OWNER: lane "audio". Keep signatures (UI + gameplay code call these).
 * Safe to call at any time: before the first user gesture (or without Web Audio) every call is a silent no-op.
 * All sounds are synthesised live (glass, water and felt timbres) — no audio files.
 */
import { busAudible, duckMusic, getEngine, stats, unlockAudio as engineUnlock, type Engine } from './engine';
import { bubble, chimeRoll, noiseHit, pluck, swell, tone } from './voices';
import { midiToFreq } from './dsp';
import { IncomeCueGate } from './cues';
import { getGame } from '@/state/game';

export type SfxId =
  | 'click'
  | 'hover'
  | 'open'
  | 'close'
  | 'confirm'
  | 'error'
  | 'coin'
  | 'bid'
  | 'sold'
  | 'feed'
  | 'tap_glass'
  | 'splash'
  | 'bubble'
  | 'unlock'
  | 'celebrate'
  | 'warning'
  | 'camera'
  | 'place'
  | 'birth'
  | 'visitor_wow'
  // lane:audio additions
  | 'breed'
  | 'death'
  | 'notify'
  | 'party_on'
  | 'party_off';

export const SFX_IDS: SfxId[] = [
  'click', 'hover', 'open', 'close', 'confirm', 'error', 'coin', 'bid', 'sold', 'feed', 'tap_glass', 'splash', 'bubble',
  'unlock', 'celebrate', 'warning', 'camera', 'place', 'birth', 'visitor_wow', 'breed', 'death', 'notify', 'party_on',
  'party_off',
];

export interface SfxOpts {
  /** 0..1+ multiplier (default 1). */
  volume?: number;
  /** −1 (left) .. 1 (right). */
  pan?: number;
  /** Seconds from now. */
  delay?: number;
}

const TANK_SOUNDS = new Set<SfxId>(['feed', 'tap_glass', 'splash', 'bubble']);
const MIN_GAP_MS: Partial<Record<SfxId, number>> = { hover: 70, click: 35, bubble: 25, coin: 60, feed: 140, tap_glass: 90, camera: 250 };
const DUCK: Partial<Record<SfxId, [number, number]>> = {
  sold: [0.4, 1.6],
  unlock: [0.4, 1.6],
  celebrate: [0.45, 2],
  birth: [0.35, 1.8],
  breed: [0.3, 1.5],
  death: [0.3, 2.4],
  warning: [0.25, 1.1],
  party_on: [0.3, 1],
};
const lastAt = new Map<SfxId, number>();

type Recipe = (e: Engine, out: AudioNode, t: number, v: number, pan: number) => void;

const R = () => Math.random();

const RECIPES: Record<SfxId, Recipe> = {
  click: (e, out, t, v, pan) => {
    tone(e, out, { freq: 2350, freqEnd: 1900, glide: 0.03, t0: t, attack: 0.001, decay: 0.016, peak: 0.085 * v, pan, priority: 0 });
    tone(e, out, { freq: 4700, t0: t, attack: 0.001, decay: 0.007, peak: 0.02 * v, pan, priority: 0 });
    noiseHit(e, out, { filter: 'highpass', freq: 6000, t0: t, decay: 0.004, peak: 0.03 * v, pan, priority: 0 });
  },
  hover: (e, out, t, v, pan) => {
    tone(e, out, { freq: 3000 * (0.98 + R() * 0.04), t0: t, attack: 0.002, decay: 0.012, peak: 0.02 * v, pan: pan + (R() - 0.5) * 0.2, priority: 2 });
  },
  open: (e, out, t, v, pan) => {
    noiseHit(e, out, { kind: 'pink', filter: 'bandpass', freq: 700, freqEnd: 2600, glide: 0.18, q: 1.2, t0: t, attack: 0.03, hold: 0.08, decay: 0.06, peak: 0.05 * v, pan });
    pluck(e, out, { kind: 'glass', midi: 88, t0: t + 0.05, velocity: 0.12 * v, pan: pan - 0.1, maxLen: 1.5 });
    pluck(e, out, { kind: 'glass', midi: 95, t0: t + 0.09, velocity: 0.07 * v, pan: pan + 0.15, maxLen: 1.5 });
  },
  close: (e, out, t, v, pan) => {
    noiseHit(e, out, { kind: 'pink', filter: 'bandpass', freq: 2600, freqEnd: 700, glide: 0.16, q: 1.2, t0: t, attack: 0.02, hold: 0.06, decay: 0.05, peak: 0.045 * v, pan });
    pluck(e, out, { kind: 'glass', midi: 83, t0: t + 0.04, velocity: 0.09 * v, pan: pan + 0.1, maxLen: 1.2 });
    pluck(e, out, { kind: 'glass', midi: 76, t0: t + 0.08, velocity: 0.06 * v, pan: pan - 0.1, maxLen: 1.2 });
  },
  confirm: (e, out, t, v, pan) => {
    pluck(e, out, { kind: 'kalimba', midi: 81, t0: t, velocity: 0.24 * v, pan: pan - 0.1, priority: 0 });
    pluck(e, out, { kind: 'kalimba', midi: 88, t0: t + 0.075, velocity: 0.2 * v, pan: pan + 0.1, priority: 0 });
    pluck(e, out, { kind: 'glass', midi: 93, t0: t + 0.075, velocity: 0.04 * v, pan, maxLen: 1.5 });
  },
  error: (e, out, t, v, pan) => {
    tone(e, out, { type: 'triangle', freq: 294, freqEnd: 288, t0: t, attack: 0.006, hold: 0.05, decay: 0.05, peak: 0.1 * v, pan, lowpass: 1100, priority: 0 });
    tone(e, out, { type: 'triangle', freq: 262, freqEnd: 255, t0: t + 0.12, attack: 0.006, hold: 0.06, decay: 0.07, peak: 0.09 * v, pan, lowpass: 1000, priority: 0 });
  },
  place: (e, out, t, v, pan) => {
    tone(e, out, { freq: 150, freqEnd: 70, glide: 0.12, t0: t, attack: 0.003, decay: 0.06, peak: 0.22 * v, pan });
    noiseHit(e, out, { filter: 'bandpass', freq: 2800, q: 0.8, t0: t + 0.01, attack: 0.005, decay: 0.05, peak: 0.05 * v, pan });
    bubble(e, out, t + 0.06, 0.45, 0.06 * v, pan + 0.1, 1);
  },
  camera: (e, out, t, v, pan) => {
    noiseHit(e, out, { filter: 'bandpass', freq: 1400, q: 2.5, t0: t, decay: 0.008, peak: 0.12 * v, pan, priority: 0 });
    noiseHit(e, out, { filter: 'highpass', freq: 3000, t0: t, decay: 0.004, peak: 0.08 * v, pan, priority: 0 });
    noiseHit(e, out, { filter: 'bandpass', freq: 1100, q: 2.5, t0: t + 0.085, decay: 0.01, peak: 0.12 * v, pan, priority: 0 });
    tone(e, out, { freq: 190, freqEnd: 120, t0: t + 0.085, attack: 0.001, decay: 0.02, peak: 0.07 * v, pan, priority: 0 });
    pluck(e, out, { kind: 'glass', midi: 100, t0: t + 0.11, velocity: 0.035 * v, pan, maxLen: 1.5 });
  },
  coin: (e, out, t, v, pan) => {
    pluck(e, out, { kind: 'glass', midi: 83, t0: t, velocity: 0.2 * v, pan: pan - 0.1, maxLen: 1.6, priority: 0 });
    pluck(e, out, { kind: 'glass', midi: 88, t0: t + 0.07, velocity: 0.24 * v, pan: pan + 0.1, maxLen: 2, priority: 0 });
    tone(e, out, { freq: 3951, t0: t + 0.07, attack: 0.001, decay: 0.04, peak: 0.02 * v, pan });
  },
  bid: (e, out, t, v, pan) => {
    chimeRoll(e, out, [81, 88, 93], t, 0.065, 0.2 * v, 0.5);
    pluck(e, out, { kind: 'kalimba', midi: 69, t0: t, velocity: 0.12 * v, pan });
  },
  sold: (e, out, t, v0) => {
    const v = v0 * 0.8;
    [72, 76, 79, 84].forEach((m, i) => pluck(e, out, { kind: 'kalimba', midi: m, t0: t + i * 0.07, velocity: (0.28 - i * 0.02) * v, pan: -0.3 + i * 0.2, priority: 0 }));
    swell(e, out, [60, 64, 67, 71, 74], t + 0.1, 0.15, 0.55, 0.13 * v);
    chimeRoll(e, out, [96, 100], t + 0.36, 0.06, 0.12 * v, 0.6);
    tone(e, out, { freq: midiToFreq(48), t0: t + 0.1, attack: 0.05, decay: 0.4, peak: 0.08 * v, lowpass: 400 });
  },
  feed: (e, out, t, v, pan) => {
    tone(e, out, { freq: 420 * (0.9 + R() * 0.2), freqEnd: 1300, glide: 0.045, t0: t, attack: 0.002, decay: 0.022, peak: 0.16 * v, pan });
    noiseHit(e, out, { filter: 'bandpass', freq: 2200, q: 1, t0: t, attack: 0.001, decay: 0.012, peak: 0.05 * v, pan });
    for (let i = 0; i < 3; i++) bubble(e, out, t + 0.08 + R() * 0.3, 0.1 + R() * 0.3, 0.035 * v, pan + (R() - 0.5) * 0.3);
  },
  tap_glass: (e, out, t, v0, pan) => {
    const v = v0 * 0.62;
    // a dull knuckle "thock" on thick glass: short muffled transient + low body + two close glass modes that beat
    // (slightly rough on purpose — tapping stresses the animals).
    noiseHit(e, out, { kind: 'pink', filter: 'lowpass', freq: 750, q: 0.8, t0: t, attack: 0.001, decay: 0.012, peak: 0.34 * v, pan, priority: 0 });
    tone(e, out, { freq: 170, freqEnd: 105, glide: 0.08, t0: t, attack: 0.001, decay: 0.045, peak: 0.36 * v, pan, priority: 0 });
    tone(e, out, { freq: 523, t0: t, attack: 0.002, decay: 0.05, peak: 0.055 * v, pan, priority: 0 });
    tone(e, out, { freq: 551, t0: t, attack: 0.002, decay: 0.05, peak: 0.055 * v, pan, priority: 0 });
    tone(e, out, { freq: 82, t0: t + 0.005, attack: 0.004, decay: 0.09, peak: 0.12 * v, pan, lowpass: 300 });
  },
  splash: (e, out, t, v, pan) => {
    noiseHit(e, out, { filter: 'bandpass', freq: 1800, freqEnd: 500, glide: 0.3, q: 0.6, t0: t, attack: 0.004, decay: 0.09, peak: 0.2 * v, pan });
    noiseHit(e, out, { kind: 'brown', filter: 'lowpass', freq: 400, t0: t, attack: 0.006, decay: 0.12, peak: 0.14 * v, pan });
    for (let i = 0; i < 6; i++) bubble(e, out, t + 0.03 + R() * 0.5, 0.2 + R() * 0.6, 0.05 * v, pan + (R() - 0.5) * 0.6);
  },
  bubble: (e, out, t, v, pan) => {
    bubble(e, out, t, 0.3 + R() * 0.4, 0.1 * v, pan, 1);
  },
  unlock: (e, out, t, v) => {
    [88, 91, 93, 96, 100, 103].forEach((m, i) => pluck(e, out, { kind: 'glass', midi: m, t0: t + i * 0.045, velocity: (0.16 - i * 0.012) * v, pan: -0.5 + i * 0.2, maxLen: 2.5 }));
    noiseHit(e, out, { filter: 'highpass', freq: 7000, t0: t, attack: 0.05, decay: 0.25, peak: 0.028 * v });
    swell(e, out, [64, 71, 76], t, 0.08, 0.5, 0.08 * v);
  },
  celebrate: (e, out, t, v0) => {
    const v = v0 * 0.8;
    [72, 76, 79, 83, 84].forEach((m, i) => pluck(e, out, { kind: 'kalimba', midi: m, t0: t + i * 0.06, velocity: (0.28 - i * 0.02) * v, pan: -0.4 + i * 0.2, priority: 0 }));
    swell(e, out, [60, 67, 71, 74, 76], t + 0.1, 0.2, 0.9, 0.14 * v);
    chimeRoll(e, out, [96, 100, 103, 108], t + 0.35, 0.05, 0.12 * v, 0.8);
    noiseHit(e, out, { filter: 'highpass', freq: 8000, t0: t + 0.3, attack: 0.1, decay: 0.35, peak: 0.022 * v });
  },
  warning: (e, out, t, v, pan) => {
    pluck(e, out, { kind: 'felt', midi: 62, t0: t, velocity: 0.34 * v, pan, lowpass: 1400, maxLen: 0.9, priority: 0 });
    pluck(e, out, { kind: 'felt', midi: 62, t0: t + 0.16, velocity: 0.26 * v, pan, lowpass: 1300, maxLen: 0.9, priority: 0 });
    tone(e, out, { freq: 147, t0: t, attack: 0.02, decay: 0.15, peak: 0.05 * v, pan });
  },
  birth: (e, out, t, v) => {
    [79, 83, 86].forEach((m, i) => pluck(e, out, { kind: 'kalimba', midi: m, t0: t + i * 0.11, velocity: 0.26 * v, pan: -0.3 + i * 0.3, priority: 0 }));
    pluck(e, out, { kind: 'glass', midi: 98, t0: t + 0.4, velocity: 0.08 * v, pan: 0.2 });
    swell(e, out, [67, 71, 74], t + 0.05, 0.25, 0.8, 0.07 * v);
  },
  breed: (e, out, t, v) => {
    pluck(e, out, { kind: 'kalimba', midi: 76, t0: t, velocity: 0.2 * v, pan: -0.15, priority: 0 });
    chimeRoll(e, out, [88, 95], t + 0.04, 0.18, 0.13 * v, 0.5);
  },
  death: (e, out, t, v) => {
    tone(e, out, { freq: 110, t0: t, attack: 0.35, hold: 0.2, decay: 0.9, peak: 0.06 * v, lowpass: 600, priority: 0 });
    tone(e, out, { type: 'triangle', freq: 164.8, t0: t + 0.05, attack: 0.45, hold: 0.2, decay: 0.9, peak: 0.03 * v, lowpass: 700 });
    pluck(e, out, { kind: 'felt', midi: 45, t0: t + 0.05, velocity: 0.18 * v, lowpass: 800 });
  },
  notify: (e, out, t, v, pan) => {
    pluck(e, out, { kind: 'glass', midi: 93, t0: t, velocity: 0.1 * v, pan, maxLen: 2, priority: 0 });
  },
  visitor_wow: (e, out, t, v, pan) => {
    // a soft distant crowd "ooh": three voiced saws through /u/ formants with a rising–falling glide
    const ctx = e.ctx;
    [196, 247, 294].forEach((f0, i) => {
      const t0 = Math.max(ctx.currentTime, t + i * 0.03);
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      const f = f0 * (0.97 + R() * 0.06);
      osc.frequency.setValueAtTime(f * 0.94, t0);
      osc.frequency.exponentialRampToValueAtTime(f * 1.18, t0 + 0.28);
      osc.frequency.exponentialRampToValueAtTime(f * 0.9, t0 + 0.8);
      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.value = 360;
      f1.Q.value = 4;
      const f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.value = 780;
      f2.Q.value = 6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.09 * v, t0 + 0.14);
      g.gain.setTargetAtTime(0, t0 + 0.42, 0.14);
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan + (i - 1) * 0.35));
      osc.connect(f1);
      osc.connect(f2);
      f1.connect(g);
      f2.connect(g);
      g.connect(p);
      p.connect(out);
      osc.start(t0);
      osc.stop(t0 + 1.4);
      stats.voicesActive++;
      osc.onended = () => {
        stats.voicesActive = Math.max(0, stats.voicesActive - 1);
        for (const n of [osc, f1, f2, g, p]) n.disconnect();
      };
    });
    pluck(e, out, { kind: 'glass', midi: 100, t0: t + 0.22, velocity: 0.05 * v, pan: pan + 0.2, maxLen: 2 });
  },
  party_on: (e, out, t, v) => {
    noiseHit(e, out, { kind: 'pink', filter: 'bandpass', freq: 300, freqEnd: 4200, glide: 0.5, q: 2, t0: t, attack: 0.3, decay: 0.08, peak: 0.07 * v, priority: 0 });
    [69, 76, 81].forEach((m, i) => pluck(e, out, { kind: 'kalimba', midi: m, t0: t + 0.34 + i * 0.05, velocity: 0.22 * v, pan: -0.3 + i * 0.3, priority: 0 }));
  },
  party_off: (e, out, t, v) => {
    noiseHit(e, out, { kind: 'pink', filter: 'bandpass', freq: 4200, freqEnd: 300, glide: 0.45, q: 2, t0: t, attack: 0.05, hold: 0.3, decay: 0.1, peak: 0.06 * v, priority: 0 });
    [81, 76, 69].forEach((m, i) => pluck(e, out, { kind: 'kalimba', midi: m, t0: t + i * 0.06, velocity: 0.2 * v, pan: 0.3 - i * 0.3, priority: 0 }));
  },
};

/**
 * Play a sound effect. Never throws; silently does nothing before the first user gesture, without Web Audio,
 * when muted, or when the relevant volume is zero. Rapid repeats of the same id are rate-limited.
 */
export function sfx(id: SfxId, opts?: SfxOpts): void {
  try {
    const e = getEngine();
    if (!e || e.ctx.state !== 'running') return;
    const recipe = RECIPES[id];
    if (!recipe) return;
    const tank = TANK_SOUNDS.has(id);
    if (!busAudible(tank ? 'aquarium' : 'ui')) return;
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const gap = MIN_GAP_MS[id] ?? 90;
    const last = lastAt.get(id) ?? -1e9;
    if (nowMs - last < gap && !(opts?.delay && opts.delay > 0)) return;
    lastAt.set(id, nowMs);
    const v = Math.max(0, Math.min(2, opts?.volume ?? 1));
    if (v <= 0) return;
    const pan = Math.max(-1, Math.min(1, opts?.pan ?? 0));
    const t = e.ctx.currentTime + 0.004 + Math.max(0, opts?.delay ?? 0);
    recipe(e, tank ? e.tankSfx : e.uiIn, t, v, pan);
    const duck = DUCK[id];
    if (duck) duckMusic(duck[0] * Math.min(1, v), duck[1]);
    stats.sfxPlayed++;
    stats.lastSfx = id;
  } catch (err) {
    console.warn('[audio] sfx failed', id, err);
  }
}

const incomeGate = new IncomeCueGate();

/**
 * Money went up on its own (tickets, a listing sold, staff sales): a soft, sparse coin chime — at most one every
 * 12 s (30 s while fast-forwarding), and never on top of a buy/sell cue the player just triggered.
 */
export function incomeCue(delta: number): void {
  if (!(delta > 0)) return;
  const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (nowMs - lastPlayed('coin') < 500 || nowMs - lastPlayed('sold') < 1500) return;
  if (!incomeGate.allow(nowMs, getGame()?.clock?.speed ?? 1)) return;
  sfx('coin', { volume: 0.35 });
}

/** performance.now() of the last time `id` actually played (−1e9 if never). */
export function lastPlayed(id: SfxId): number {
  return lastAt.get(id) ?? -1e9;
}

/** Call from the first user gesture to unlock WebAudio. Idempotent; safe anytime. */
export function unlockAudio(): void {
  engineUnlock();
}
