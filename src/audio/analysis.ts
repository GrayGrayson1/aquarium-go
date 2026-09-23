/**
 * Pure music-analysis DSP for party / music-reactive mode (no Web Audio dependency → unit-tested in
 * tests/sim/audio-beat.test.ts). OWNER: lane "audio".
 *
 * Input per frame: an FFT magnitude spectrum (either linear magnitudes or dBFS as delivered by
 * AnalyserNode.getFloatFrequencyData) plus an optional time-domain block. Output: smoothed level, bass/mid/treble
 * bands with automatic gain control, a beat pulse from spectral-flux onset detection with an adaptive threshold,
 * and a slowly rotating party hue that jumps on beats.
 */

export interface BandRanges {
  bass: [number, number];
  mid: [number, number];
  treble: [number, number];
}

export const DEFAULT_BANDS: BandRanges = {
  bass: [30, 160],
  mid: [160, 2200],
  treble: [2200, 12000],
};

/** dBFS → linear magnitude. Non-finite input (−Infinity for silence) → 0. */
export function dbToMag(db: number): number {
  if (!Number.isFinite(db)) return 0;
  return Math.pow(10, db / 20);
}

/** Convert an AnalyserNode float spectrum (dBFS) to linear magnitudes in place into `out`. */
export function spectrumDbToMag(db: ArrayLike<number>, out: Float32Array): Float32Array {
  const n = Math.min(db.length, out.length);
  for (let i = 0; i < n; i++) out[i] = dbToMag(db[i]);
  return out;
}

/** Index of the FFT bin containing `hz` for a spectrum of `binCount` bins (= fftSize/2). */
export function binForHz(hz: number, sampleRate: number, binCount: number): number {
  const nyquist = sampleRate / 2;
  const i = Math.round((hz / nyquist) * binCount);
  return Math.max(0, Math.min(binCount - 1, i));
}

/**
 * RMS band energies (linear) of a magnitude spectrum. Each band value is sqrt(mean(mag²)) over its bins.
 */
export function bandEnergies(
  mags: ArrayLike<number>,
  sampleRate: number,
  ranges: BandRanges = DEFAULT_BANDS,
): { bass: number; mid: number; treble: number } {
  const bins = mags.length;
  const band = (r: [number, number]) => {
    const a = binForHz(r[0], sampleRate, bins);
    const b = Math.max(a, binForHz(r[1], sampleRate, bins));
    let s = 0;
    for (let i = a; i <= b; i++) s += mags[i] * mags[i];
    return Math.sqrt(s / (b - a + 1));
  };
  return { bass: band(ranges.bass), mid: band(ranges.mid), treble: band(ranges.treble) };
}

/** RMS of a time-domain block (−1..1). */
export function rms(block: ArrayLike<number>): number {
  if (!block.length) return 0;
  let s = 0;
  for (let i = 0; i < block.length; i++) s += block[i] * block[i];
  return Math.sqrt(s / block.length);
}

/** Frame-rate independent exponential smoothing coefficient. */
export const smoothK = (dt: number, tau: number) => (tau <= 0 ? 1 : 1 - Math.exp(-dt / tau));

/**
 * Asymmetric envelope follower (fast attack, slow release) — what makes visuals feel "punchy but smooth".
 */
export function follow(prev: number, target: number, dt: number, attack: number, release: number): number {
  return prev + (target - prev) * smoothK(dt, target > prev ? attack : release);
}

/**
 * Automatic gain control: tracks a decaying peak so bands map into 0..1 regardless of input loudness
 * (built-in groove vs quiet microphone). Returns the normalised value.
 */
export class Agc {
  peak: number;
  constructor(
    /** Values below this never get amplified to full scale (≈ −70 dB per FFT bin: quiet room noise). */
    public floor = 3e-4,
    public releasePerSec = 0.35,
    initial = 0,
  ) {
    this.peak = initial;
  }
  process(v: number, dt: number): number {
    const x0 = Number.isFinite(v) && v > 0 ? v : 0;
    if (x0 > this.peak) this.peak = x0;
    else this.peak = Math.max(this.floor, this.peak * Math.exp(-this.releasePerSec * dt));
    const x = x0 / Math.max(this.floor, this.peak);
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }
}

export interface BeatDetectorOptions {
  /** Threshold = mean + k·std of recent flux. */
  k: number;
  /** Seconds of history for the adaptive statistics. */
  window: number;
  /** Minimum seconds between beats (refractory period; 0.28 s ≈ 214 BPM max). */
  refractory: number;
  /** Absolute minimum flux (relative to the running energy mean) to ignore noise floors. */
  minRelFlux: number;
  /** Beat pulse decay rate (per second, exponential). */
  decay: number;
}

export const DEFAULT_BEAT: BeatDetectorOptions = { k: 1.5, window: 1.2, refractory: 0.28, minRelFlux: 0.12, decay: 7 };

/**
 * Onset/beat detector on a single energy signal (normally low-band energy). Uses positive spectral flux
 * (energy increase since last frame) against an adaptive threshold (EMA mean + k·EMA std over `window` seconds),
 * a refractory period, and a pulse output that jumps to 1 and decays exponentially.
 */
export class BeatDetector {
  opts: BeatDetectorOptions;
  private prev = 0;
  private fluxMean = 0;
  private fluxVar = 0;
  private energyMean = 0;
  private sinceBeat = 1e9;
  private warm = 0;
  pulse = 0;
  /** Total beats detected (debug/tests). */
  beats = 0;
  /** Estimated interval between the last two beats (s), 0 if unknown. */
  lastInterval = 0;

  constructor(opts: Partial<BeatDetectorOptions> = {}) {
    this.opts = { ...DEFAULT_BEAT, ...opts };
  }

  reset(): void {
    this.prev = 0;
    this.fluxMean = 0;
    this.fluxVar = 0;
    this.energyMean = 0;
    this.sinceBeat = 1e9;
    this.warm = 0;
    this.pulse = 0;
    this.beats = 0;
    this.lastInterval = 0;
  }

  /** Feed one frame. Returns true when a beat onset is detected on this frame. */
  process(energy: number, dt: number): boolean {
    const o = this.opts;
    const e = Number.isFinite(energy) && energy > 0 ? energy : 0;
    const flux = Math.max(0, e - this.prev);
    this.prev = e;
    this.sinceBeat += dt;
    this.warm += dt;
    this.pulse *= Math.exp(-o.decay * dt);

    const std = Math.sqrt(Math.max(0, this.fluxVar));
    const threshold = this.fluxMean + o.k * std;
    const minFlux = o.minRelFlux * Math.max(this.energyMean, 1e-6);
    const isBeat = this.warm > 0.25 && flux > threshold && flux > minFlux && this.sinceBeat >= o.refractory;

    // update adaptive statistics (after the decision so a spike does not raise its own threshold)
    const a = smoothK(dt, o.window);
    const d = flux - this.fluxMean;
    this.fluxMean += a * d;
    this.fluxVar = (1 - a) * (this.fluxVar + a * d * d);
    this.energyMean += a * (e - this.energyMean);

    if (isBeat) {
      if (this.sinceBeat < 5) this.lastInterval = this.sinceBeat;
      this.sinceBeat = 0;
      this.pulse = 1;
      this.beats++;
    }
    return isBeat;
  }
}

export interface ReactiveFrame {
  level: number;
  bass: number;
  mid: number;
  treble: number;
  beat: number;
  hue: number;
}

/**
 * Full per-frame analyser: bands → AGC → smoothing; beat detection on the bass band; hue rotation.
 * Deterministic: the hue jump on beats uses a fixed golden-ratio step.
 */
export class ReactiveAnalyzer {
  private agcBass = new Agc();
  private agcMid = new Agc();
  private agcTreble = new Agc();
  private agcLevel = new Agc(1e-3, 0.25);
  readonly detector: BeatDetector;
  frame: ReactiveFrame = { level: 0, bass: 0, mid: 0, treble: 0, beat: 0, hue: 0 };
  /** Hue rotation speed in turns per second. */
  hueSpeed = 0.012;
  hueJump = 0.0618;

  constructor(beat: Partial<BeatDetectorOptions> = {}) {
    this.detector = new BeatDetector(beat);
  }

  reset(): void {
    this.agcBass = new Agc();
    this.agcMid = new Agc();
    this.agcTreble = new Agc();
    this.agcLevel = new Agc(1e-3, 0.25);
    this.detector.reset();
    this.frame = { level: 0, bass: 0, mid: 0, treble: 0, beat: 0, hue: this.frame.hue };
  }

  /**
   * @param mags linear magnitude spectrum (length = fftSize/2)
   * @param timeRms RMS of the time-domain block (pass <0 to derive level from the spectrum)
   */
  process(mags: ArrayLike<number>, sampleRate: number, timeRms: number, dt: number): ReactiveFrame {
    const safeDt = Math.max(1e-4, Math.min(0.25, dt));
    const b = bandEnergies(mags, sampleRate);
    const lvlRaw = timeRms >= 0 ? timeRms : (b.bass + b.mid + b.treble) / 3;
    const f = this.frame;
    // AGC → 0..1, then a gentle perceptual lift (sqrt) so short transients such as hats still read visually
    const bass = Math.sqrt(this.agcBass.process(b.bass, safeDt));
    const mid = Math.sqrt(this.agcMid.process(b.mid, safeDt));
    const treble = Math.sqrt(this.agcTreble.process(b.treble, safeDt));
    const lvl = Math.sqrt(this.agcLevel.process(lvlRaw, safeDt));
    // silence gate: if the absolute signal is ~0, let everything fall to 0
    const gate = lvlRaw > 1e-4 ? 1 : 0;
    f.bass = follow(f.bass, bass * gate, safeDt, 0.02, 0.18);
    f.mid = follow(f.mid, mid * gate, safeDt, 0.03, 0.2);
    f.treble = follow(f.treble, treble * gate, safeDt, 0.015, 0.14);
    f.level = follow(f.level, lvl * gate, safeDt, 0.04, 0.3);
    const hit = this.detector.process(b.bass + b.mid * 0.25, safeDt);
    f.beat = this.detector.pulse;
    f.hue = (f.hue + this.hueSpeed * safeDt + (hit ? this.hueJump : 0)) % 1;
    return f;
  }
}
