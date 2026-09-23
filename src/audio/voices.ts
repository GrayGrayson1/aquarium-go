/**
 * One-shot voice helpers (tone, noise hit, plucked/struck sample, bubble). Each voice is a tiny node chain that
 * disconnects itself when finished (see engine.trackVoice). OWNER: lane "audio".
 */
import { canStartVoice, loopNoise, noiseBuffer, pluckBuffer, stats, trackVoice, type Engine, type NoiseKind } from './engine';
import type { PluckKind } from './dsp';
import { midiToFreq } from './dsp';

export interface ToneOpts {
  type?: OscillatorType | PeriodicWave;
  freq: number;
  /** Frequency to glide to (exponential) over `glide` seconds. */
  freqEnd?: number;
  glide?: number;
  t0: number;
  attack?: number;
  /** Hold at peak before decay (s). */
  hold?: number;
  /** Exponential decay time-constant (s): the envelope is ~silent after 5×decay. */
  decay: number;
  peak: number;
  pan?: number;
  detune?: number;
  /** Optional low-pass cutoff (Hz). */
  lowpass?: number;
  priority?: 0 | 1 | 2;
}

/** Enveloped oscillator → (LP) → (pan) → dest. */
export function tone(e: Engine, dest: AudioNode, o: ToneOpts): void {
  if (!canStartVoice(o.priority ?? 1)) return;
  const ctx = e.ctx;
  const osc = ctx.createOscillator();
  if (o.type && typeof o.type === 'object') osc.setPeriodicWave(o.type);
  else osc.type = (o.type as OscillatorType | undefined) ?? 'sine';
  const t0 = Math.max(o.t0, ctx.currentTime);
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.freqEnd && o.freqEnd > 0) osc.frequency.exponentialRampToValueAtTime(o.freqEnd, t0 + (o.glide ?? o.decay));
  if (o.detune) osc.detune.value = o.detune;
  const g = ctx.createGain();
  const attack = Math.max(0.001, o.attack ?? 0.004);
  const hold = o.hold ?? 0;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(o.peak, t0 + attack);
  g.gain.setTargetAtTime(0, t0 + attack + hold, o.decay);
  const end = t0 + attack + hold + o.decay * 6;
  const nodes: AudioNode[] = [g];
  let head: AudioNode = osc;
  if (o.lowpass) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.lowpass;
    f.Q.value = 0.5;
    head.connect(f);
    head = f;
    nodes.push(f);
  }
  head.connect(g);
  let out: AudioNode = g;
  if (o.pan) {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, o.pan));
    g.connect(p);
    out = p;
    nodes.push(p);
  }
  out.connect(dest);
  osc.start(t0);
  osc.stop(end);
  trackVoice(osc, nodes);
}

export interface NoiseOpts {
  kind?: NoiseKind;
  filter: BiquadFilterType;
  freq: number;
  freqEnd?: number;
  glide?: number;
  q?: number;
  t0: number;
  attack?: number;
  hold?: number;
  decay: number;
  peak: number;
  pan?: number;
  priority?: 0 | 1 | 2;
}

/** Filtered noise burst → dest. */
export function noiseHit(e: Engine, dest: AudioNode, o: NoiseOpts): void {
  if (!canStartVoice(o.priority ?? 1)) return;
  const ctx = e.ctx;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(e, o.kind ?? 'white');
  const t0 = Math.max(o.t0, ctx.currentTime);
  const f = ctx.createBiquadFilter();
  f.type = o.filter;
  f.frequency.setValueAtTime(o.freq, t0);
  if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t0 + (o.glide ?? o.decay * 3));
  f.Q.value = o.q ?? 0.7;
  const g = ctx.createGain();
  const attack = Math.max(0.001, o.attack ?? 0.002);
  const hold = o.hold ?? 0;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(o.peak, t0 + attack);
  g.gain.setTargetAtTime(0, t0 + attack + hold, o.decay);
  const dur = attack + hold + o.decay * 6;
  src.connect(f);
  f.connect(g);
  const nodes: AudioNode[] = [f, g];
  let out: AudioNode = g;
  if (o.pan) {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, o.pan));
    g.connect(p);
    out = p;
    nodes.push(p);
  }
  out.connect(dest);
  const buf = src.buffer;
  src.start(t0, Math.random() * Math.max(0, buf.duration - dur - 0.05));
  src.stop(t0 + dur);
  trackVoice(src, nodes);
}

export interface PluckOpts {
  kind: PluckKind;
  midi: number;
  t0: number;
  velocity: number;
  pan?: number;
  /** Playback length cap (s); the buffer's natural length otherwise. */
  maxLen?: number;
  /** Optional low-pass (felt piano softness / distance). */
  lowpass?: number;
  priority?: 0 | 1 | 2;
  /** Pitch bend in cents (detune). */
  cents?: number;
}

/** Plays a cached rendered note (Karplus–Strong felt piano, kalimba, glass). */
export function pluck(e: Engine, dest: AudioNode, o: PluckOpts): void {
  if (!canStartVoice(o.priority ?? 1)) return;
  const ctx = e.ctx;
  const src = ctx.createBufferSource();
  src.buffer = pluckBuffer(e, o.kind, o.midi);
  if (o.cents) src.detune.value = o.cents;
  const t0 = Math.max(o.t0, ctx.currentTime);
  const g = ctx.createGain();
  g.gain.value = o.velocity;
  const nodes: AudioNode[] = [g];
  let head: AudioNode = src;
  if (o.lowpass) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.lowpass;
    f.Q.value = 0.4;
    head.connect(f);
    head = f;
    nodes.push(f);
  }
  head.connect(g);
  let out: AudioNode = g;
  if (o.pan) {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, o.pan));
    g.connect(p);
    out = p;
    nodes.push(p);
  }
  out.connect(dest);
  src.start(t0);
  const len = Math.min(src.buffer.duration, o.maxLen ?? Infinity);
  if (len < src.buffer.duration) {
    g.gain.setValueAtTime(o.velocity, t0 + len - 0.08);
    g.gain.linearRampToValueAtTime(0, t0 + len);
    src.stop(t0 + len + 0.01);
  }
  trackVoice(src, nodes);
}

/**
 * A single underwater bubble: sine with an upward (Minnaert → surface) pitch sweep and a very short envelope.
 * `size` 0 (tiny, high) .. 1 (big glug, low).
 */
export function bubble(e: Engine, dest: AudioNode, t0: number, size: number, peak: number, pan = 0, priority: 0 | 1 | 2 = 2): void {
  const s = Math.max(0, Math.min(1, size));
  const f0 = 3200 * Math.pow(0.16, s) * (0.85 + Math.random() * 0.3); // ~3.2 kHz tiny → ~500 Hz big
  const dur = 0.018 + s * 0.07;
  tone(e, dest, {
    type: 'sine',
    freq: f0,
    freqEnd: f0 * (1.35 + Math.random() * 0.7),
    glide: dur * 1.6,
    t0,
    attack: 0.0015 + s * 0.003,
    decay: dur * 0.45,
    peak,
    pan,
    priority,
  });
}

/** Simple chord of glass chimes (rolled). */
export function chimeRoll(e: Engine, dest: AudioNode, midis: number[], t0: number, gap: number, velocity: number, spread = 0.6): void {
  midis.forEach((m, i) => {
    pluck(e, dest, { kind: 'glass', midi: m, t0: t0 + i * gap, velocity: velocity * (1 - i * 0.08), pan: (i / Math.max(1, midis.length - 1) - 0.5) * spread, priority: 1 });
  });
}

/** Warm sine/triangle pad swell for fanfares (short-lived). */
export function swell(e: Engine, dest: AudioNode, midis: number[], t0: number, attack: number, decay: number, peak: number): void {
  midis.forEach((m, i) => {
    const pan = (i / Math.max(1, midis.length - 1) - 0.5) * 0.7;
    tone(e, dest, { type: 'triangle', freq: midiToFreq(m), t0, attack, hold: 0.05, decay, peak: peak / Math.sqrt(midis.length), pan, lowpass: 2200, priority: 1 });
  });
}

export { loopNoise, stats };
