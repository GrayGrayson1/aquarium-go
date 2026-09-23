import { describe, it, expect } from 'vitest';
import { Agc, BeatDetector, ReactiveAnalyzer, bandEnergies, binForHz, dbToMag, rms, spectrumDbToMag } from '@/audio/analysis';
import { mulberry32 } from '@/audio/dsp';

const SR = 48000;
const BINS = 1024; // fftSize 2048
const FPS = 60;

/** Build a synthetic magnitude spectrum with given energy in bass/mid/treble regions plus a noise floor. */
function spectrum(bass: number, mid: number, treble: number, noise: number, rnd: () => number): Float32Array {
  const m = new Float32Array(BINS);
  const b0 = binForHz(40, SR, BINS);
  const b1 = binForHz(140, SR, BINS);
  const m0 = binForHz(300, SR, BINS);
  const m1 = binForHz(1800, SR, BINS);
  const t0 = binForHz(3000, SR, BINS);
  const t1 = binForHz(10000, SR, BINS);
  for (let i = 0; i < BINS; i++) {
    let v = noise * rnd();
    if (i >= b0 && i <= b1) v += bass;
    if (i >= m0 && i <= m1) v += mid;
    if (i >= t0 && i <= t1) v += treble;
    m[i] = v;
  }
  return m;
}

/** Simulate a drum pattern: kick envelope on beats, hats on 8ths (treble only). */
function simulate(bpm: number, seconds: number, opts: { jitterAmp?: number; hats?: boolean; seed?: number } = {}) {
  const rnd = mulberry32(opts.seed ?? 7);
  const det = new BeatDetector();
  const beatTimes: number[] = [];
  const period = 60 / bpm;
  const dt = 1 / FPS;
  for (let f = 0; f < seconds * FPS; f++) {
    const t = f * dt;
    const sinceKick = t % period;
    const beatIdx = Math.floor(t / period);
    const amp = 1 + (opts.jitterAmp ?? 0) * (mulberry32(beatIdx + 99)() * 2 - 1);
    const kick = amp * Math.exp(-sinceKick * 12);
    const sinceHat = t % (period / 2);
    const hat = opts.hats ? Math.exp(-sinceHat * 30) : 0;
    const s = spectrum(kick, 0.15 + 0.05 * rnd(), hat, 0.03, rnd);
    const e = bandEnergies(s, SR);
    if (det.process(e.bass + e.mid * 0.25, dt)) beatTimes.push(t);
  }
  return { det, beatTimes, period };
}

describe('audio analysis — helpers', () => {
  it('converts dB to linear magnitude, treating -Infinity as silence', () => {
    expect(dbToMag(0)).toBeCloseTo(1, 6);
    expect(dbToMag(-20)).toBeCloseTo(0.1, 6);
    expect(dbToMag(-Infinity)).toBe(0);
    expect(dbToMag(NaN)).toBe(0);
    const out = spectrumDbToMag([-20, -Infinity, -40], new Float32Array(3));
    expect(Array.from(out).map((v) => +v.toFixed(3))).toEqual([0.1, 0, 0.01]);
  });

  it('maps frequencies to FFT bins', () => {
    expect(binForHz(SR / 4, SR, BINS)).toBe(BINS / 2);
    expect(binForHz(0, SR, BINS)).toBe(0);
    expect(binForHz(SR, SR, BINS)).toBe(BINS - 1);
  });

  it('computes RMS of a sine as amplitude/√2', () => {
    const block = new Float32Array(4800);
    for (let i = 0; i < block.length; i++) block[i] = Math.sin((2 * Math.PI * 440 * i) / SR);
    expect(rms(block)).toBeCloseTo(Math.SQRT1_2, 2);
    expect(rms(new Float32Array(0))).toBe(0);
  });

  it('splits a spectrum into the right bands', () => {
    const rnd = mulberry32(1);
    const onlyTreble = bandEnergies(spectrum(0, 0, 1, 0, rnd), SR);
    expect(onlyTreble.treble).toBeGreaterThan(0.5);
    expect(onlyTreble.bass).toBeLessThan(0.01);
    expect(onlyTreble.mid).toBeLessThan(0.01);
    const onlyBass = bandEnergies(spectrum(1, 0, 0, 0, rnd), SR);
    expect(onlyBass.bass).toBeGreaterThan(0.5);
    expect(onlyBass.treble).toBe(0);
    const onlyMid = bandEnergies(spectrum(0, 1, 0, 0, rnd), SR);
    expect(onlyMid.mid).toBeGreaterThan(onlyMid.bass);
    expect(onlyMid.mid).toBeGreaterThan(onlyMid.treble);
  });

  it('AGC normalises quiet and loud inputs into 0..1', () => {
    const quiet = new Agc();
    const loud = new Agc();
    let q = 0;
    let l = 0;
    for (let i = 0; i < 120; i++) {
      q = quiet.process(0.001 * (1 + Math.sin(i / 5)), 1 / 60);
      l = loud.process(10 * (1 + Math.sin(i / 5)), 1 / 60);
    }
    expect(q).toBeGreaterThanOrEqual(0);
    expect(q).toBeLessThanOrEqual(1);
    expect(l).toBeGreaterThanOrEqual(0);
    expect(l).toBeLessThanOrEqual(1);
    expect(Math.abs(q - l)).toBeLessThan(0.15); // same shape → similar normalised value
  });
});

describe('audio analysis — beat detector', () => {
  it('finds the beats of a steady 120 BPM kick', () => {
    const { beatTimes, period, det } = simulate(120, 10);
    // 20 beats in 10 s; allow warm-up loss of the first one or two
    expect(beatTimes.length).toBeGreaterThanOrEqual(18);
    expect(beatTimes.length).toBeLessThanOrEqual(21);
    const intervals = beatTimes.slice(1).map((t, i) => t - beatTimes[i]);
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    expect(mean).toBeCloseTo(period, 1);
    for (const iv of intervals) expect(Math.abs(iv - period)).toBeLessThan(0.05);
    expect(det.lastInterval).toBeCloseTo(period, 1);
  });

  it('tracks 128 BPM with ±30% kick loudness variation and busy hats', () => {
    const { beatTimes } = simulate(128, 12, { jitterAmp: 0.3, hats: true, seed: 3 });
    const expected = (128 / 60) * 12;
    expect(beatTimes.length).toBeGreaterThanOrEqual(Math.floor(expected * 0.85));
    expect(beatTimes.length).toBeLessThanOrEqual(Math.ceil(expected) + 1);
  });

  it('respects the refractory period (no double triggers)', () => {
    const { beatTimes } = simulate(174, 8);
    const intervals = beatTimes.slice(1).map((t, i) => t - beatTimes[i]);
    for (const iv of intervals) expect(iv).toBeGreaterThanOrEqual(0.28 - 1e-9);
  });

  it('stays quiet on a steady drone and on silence', () => {
    const rnd = mulberry32(5);
    const det = new BeatDetector();
    let beats = 0;
    for (let f = 0; f < 600; f++) {
      const e = bandEnergies(spectrum(0.5, 0.2, 0.05, 0.02, rnd), SR);
      if (det.process(e.bass + e.mid * 0.25, 1 / 60)) beats++;
    }
    expect(beats).toBeLessThanOrEqual(1);
    const sil = new BeatDetector();
    let sb = 0;
    for (let f = 0; f < 600; f++) if (sil.process(0, 1 / 60)) sb++;
    expect(sb).toBe(0);
    expect(sil.pulse).toBe(0);
  });

  it('pulse jumps to 1 on a beat and decays', () => {
    const det = new BeatDetector();
    for (let f = 0; f < 60; f++) det.process(0.05, 1 / 60);
    expect(det.process(2, 1 / 60)).toBe(true);
    expect(det.pulse).toBe(1);
    for (let f = 0; f < 30; f++) det.process(0.05, 1 / 60);
    expect(det.pulse).toBeLessThan(0.05);
    expect(det.pulse).toBeGreaterThan(0);
  });

  it('ignores non-finite input', () => {
    const det = new BeatDetector();
    expect(() => {
      for (let f = 0; f < 100; f++) det.process(f % 2 ? NaN : Infinity, 1 / 60);
    }).not.toThrow();
    expect(Number.isFinite(det.pulse)).toBe(true);
  });
});

describe('audio analysis — reactive analyzer', () => {
  it('produces bounded, finite values and a rotating hue that jumps on beats', () => {
    const rnd = mulberry32(11);
    const an = new ReactiveAnalyzer();
    const period = 60 / 118;
    let prevHue = 0;
    let beatFrames = 0;
    for (let f = 0; f < 60 * 8; f++) {
      const t = f / 60;
      const kick = Math.exp(-(t % period) * 12);
      const s = spectrum(kick, 0.2, 0.1 * rnd(), 0.02, rnd);
      const fr = an.process(s, SR, 0.2 + 0.2 * kick, 1 / 60);
      for (const v of [fr.level, fr.bass, fr.mid, fr.treble, fr.beat, fr.hue]) {
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      if (fr.beat === 1) beatFrames++;
      prevHue = fr.hue;
    }
    expect(beatFrames).toBeGreaterThanOrEqual(12); // ~15 beats in 8 s at 118 BPM
    expect(prevHue).toBeGreaterThan(0);
    // bass follows the kick: high right after a beat, lower mid-beat
    expect(an.frame.bass).toBeGreaterThanOrEqual(0);
  });

  it('falls to zero on silence', () => {
    const an = new ReactiveAnalyzer();
    const rnd = mulberry32(2);
    for (let f = 0; f < 120; f++) an.process(spectrum(1, 0.5, 0.5, 0.05, rnd), SR, 0.3, 1 / 60);
    for (let f = 0; f < 240; f++) an.process(new Float32Array(BINS), SR, 0, 1 / 60);
    expect(an.frame.level).toBeLessThan(0.01);
    expect(an.frame.bass).toBeLessThan(0.01);
    expect(an.frame.beat).toBeLessThan(0.01);
  });
});
