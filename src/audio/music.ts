/**
 * Generative ambient score. OWNER: lane "audio".
 *
 * Each mood is a `MoodLayer`: slow evolving pads (detuned warm-saw voices through a breathing low-pass), a quiet
 * root drone, a phrase-based felt-piano/kalimba melody with a soft echo, optional warm bass pulse, and occasional
 * glassy chimes. Chords follow a small Markov chain in a lydian/pentatonic palette. Mood changes crossfade (the old
 * layer releases while the new one swells in). Timing uses the engine's lookahead scheduler (AudioContext time).
 */
import { addTicker, stats, warmWave, type Engine } from './engine';
import { pluck, chimeRoll } from './voices';
import { midiToFreq } from './dsp';
import { MOODS, MelodyGen, nextChord, type ChordDef, type MoodConfig, type MusicMood } from './theory';

const FADE_IN_TAU = 1.6;
const FADE_OUT_TAU = 1.3;

interface PadVoice {
  gain: GainNode;
  oscs: OscillatorNode[];
  nodes: AudioNode[];
  endAt: number;
}

class MoodLayer {
  readonly out: GainNode;
  private padBus: GainNode;
  private padFilter: BiquadFilterNode;
  private padLfo: OscillatorNode;
  private padLfoAmt: GainNode;
  private pluckBus: GainNode;
  private delay: DelayNode;
  private fb: GainNode;
  private fbLp: BiquadFilterNode;
  private wet: GainNode;
  private chord: ChordDef | null = null;
  private stepsLeft = 0;
  private step = 0;
  private nextStepAt: number;
  private nextChimeAt: number;
  private melody: MelodyGen;
  private pads: PadVoice[] = [];
  private stopScheduling = false;
  disposeAt = Infinity;
  readonly stepDur: number;

  constructor(
    private e: Engine,
    readonly cfg: MoodConfig,
    startAt: number,
  ) {
    const ctx = e.ctx;
    this.stepDur = 60 / cfg.bpm / 2;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.gain.setTargetAtTime(1, startAt, FADE_IN_TAU);
    this.out.connect(e.musicIn);

    this.padBus = ctx.createGain();
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.Q.value = 0.7;
    const [lo, hi] = cfg.padCutoff;
    this.padFilter.frequency.value = (lo + hi) / 2;
    this.padLfo = ctx.createOscillator();
    this.padLfo.frequency.value = 0.028 + Math.random() * 0.02;
    this.padLfoAmt = ctx.createGain();
    this.padLfoAmt.gain.value = (hi - lo) / 2;
    this.padLfo.connect(this.padLfoAmt);
    this.padLfoAmt.connect(this.padFilter.frequency);
    this.padLfo.start();
    this.padBus.connect(this.padFilter);
    this.padFilter.connect(this.out);

    // plucks → dry + dotted-8th echo with a darkening feedback loop
    this.pluckBus = ctx.createGain();
    this.pluckBus.connect(this.out);
    this.delay = ctx.createDelay(2);
    this.delay.delayTime.value = this.stepDur * 1.5;
    this.fb = ctx.createGain();
    this.fb.gain.value = cfg.echo;
    this.fbLp = ctx.createBiquadFilter();
    this.fbLp.type = 'lowpass';
    this.fbLp.frequency.value = 2400;
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.32;
    this.pluckBus.connect(this.delay);
    this.delay.connect(this.fbLp);
    this.fbLp.connect(this.fb);
    this.fb.connect(this.delay);
    this.fbLp.connect(this.wet);
    this.wet.connect(this.out);
    stats.nodesCreated += 13;

    this.melody = new MelodyGen(cfg, Math.random);
    this.nextStepAt = startAt + 0.05;
    this.nextChimeAt = startAt + this.randChime() * 0.5;
  }

  private randChime(): number {
    const [a, b] = this.cfg.chimeEvery;
    return a + Math.random() * Math.max(0, b - a);
  }

  schedule(now: number, horizon: number): void {
    if (this.stopScheduling) return;
    if (this.nextStepAt < now - 0.25) {
      // resumed after a suspend: realign instead of bursting missed steps
      this.nextStepAt = now + 0.05;
    }
    let guard = 0;
    while (this.nextStepAt < horizon && guard++ < 32) {
      this.playStep(this.nextStepAt);
      this.nextStepAt += this.stepDur;
      this.step++;
    }
    if (this.cfg.chimeEvery[1] > 0 && this.nextChimeAt < horizon) {
      if (this.nextChimeAt >= now - 0.25) this.playChime(Math.max(now, this.nextChimeAt));
      this.nextChimeAt = Math.max(now, this.nextChimeAt) + this.randChime();
    }
    // retire finished pad voices
    this.pads = this.pads.filter((p) => {
      if (p.endAt < now) {
        for (const n of p.nodes) n.disconnect();
        return false;
      }
      return true;
    });
  }

  private playStep(t: number): void {
    const cfg = this.cfg;
    if (this.stepsLeft <= 0 || !this.chord) {
      const next = nextChord(cfg, this.chord, Math.random);
      this.chord = next;
      // occasionally linger longer on a chord — breathing, non-mechanical form
      const stretch = Math.random() < 0.3 ? 1.5 : 1;
      this.stepsLeft = Math.round(cfg.chordBeats * 2 * stretch);
      this.startPad(next, t, this.stepsLeft * this.stepDur);
    }
    this.stepsLeft--;
    const chord = this.chord!;
    const beatStep = this.step % 2 === 0;
    const humanize = (Math.random() - 0.5) * 0.016;
    // melody
    const n = this.melody.step(this.step, chord);
    if (n) {
      const pan = (Math.random() - 0.5) * 0.7;
      pluck(this.e, this.pluckBus, {
        kind: cfg.pluckVoice,
        midi: n.midi,
        t0: t + Math.max(0, humanize),
        velocity: n.velocity * cfg.pluckLevel,
        pan,
        lowpass: cfg.pluckVoice === 'felt' ? 2600 : 4200,
        priority: 1,
      });
      // a soft harmony a sixth below on phrase endings
      if (n.last && Math.random() < 0.45) {
        pluck(this.e, this.pluckBus, { kind: cfg.pluckVoice, midi: n.midi - (Math.random() < 0.5 ? 9 : 8), t0: t + 0.02, velocity: n.velocity * cfg.pluckLevel * 0.55, pan: -pan, lowpass: 2200, priority: 2 });
      }
    }
    // warm pulse on beats (facility / market)
    if (cfg.pulse > 0 && beatStep) {
      const beatInBar = (this.step / 2) % 4;
      const accent = beatInBar === 0 ? 1 : beatInBar === 2 ? 0.8 : 0.55;
      pluck(this.e, this.pluckBus, { kind: 'felt', midi: cfg.key + chord.root + 12, t0: t, velocity: cfg.pulse * accent, lowpass: 900, maxLen: this.stepDur * 3, priority: 2 });
    }
  }

  private startPad(chord: ChordDef, t: number, dur: number): void {
    const ctx = this.e.ctx;
    const cfg = this.cfg;
    const attack = Math.min(4, dur * 0.4);
    const release = 5;
    // release previous pad
    for (const p of this.pads) {
      if (p.endAt > t + release + 0.5) {
        p.gain.gain.cancelScheduledValues(t);
        p.gain.gain.setTargetAtTime(0, t, release / 4);
        for (const o of p.oscs) {
          try {
            o.stop(t + release + 0.2);
          } catch {
            /* ignore */
          }
        }
        p.endAt = t + release + 0.3;
      }
    }
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setValueAtTime(0, t);
    g.gain.setTargetAtTime(cfg.padLevel, t, attack / 3);
    g.connect(this.padBus);
    const oscs: OscillatorNode[] = [];
    const nodes: AudioNode[] = [g];
    const wave = warmWave(this.e);
    const per = 1 / Math.sqrt(chord.tones.length * 2);
    const maxEnd = t + dur + release + 8; // safety stop if never released
    chord.tones.forEach((tone, i) => {
      const f = midiToFreq(cfg.key + tone + cfg.padOctave);
      for (const side of [-1, 1]) {
        const o = ctx.createOscillator();
        o.setPeriodicWave(wave);
        o.frequency.value = f;
        o.detune.value = side * (5 + Math.random() * 5) + (Math.random() - 0.5) * 2;
        const vg = ctx.createGain();
        vg.gain.value = per * (i === 0 ? 1 : 0.85);
        const p = ctx.createStereoPanner();
        p.pan.value = side * (0.25 + (i / chord.tones.length) * 0.5);
        o.connect(vg);
        vg.connect(p);
        p.connect(g);
        o.start(t);
        o.stop(maxEnd);
        oscs.push(o);
        nodes.push(vg, p);
      }
    });
    // triangle sub-drone on the chord root
    if (cfg.droneLevel > 0) {
      const d = ctx.createOscillator();
      d.type = 'triangle';
      d.frequency.value = midiToFreq(cfg.key + chord.root);
      const dg = ctx.createGain();
      dg.gain.value = cfg.droneLevel / Math.max(0.05, cfg.padLevel);
      d.connect(dg);
      dg.connect(g);
      d.start(t);
      d.stop(maxEnd);
      oscs.push(d);
      nodes.push(dg);
    }
    stats.nodesCreated += nodes.length + oscs.length;
    this.pads.push({ gain: g, oscs, nodes: [...nodes, ...oscs], endAt: maxEnd });
  }

  private playChime(t: number): void {
    const chord = this.chord;
    if (!chord) return;
    const tones = chord.tones.slice(1).sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 2));
    const base = this.cfg.mood === 'night' ? 24 : 36;
    const midis = tones.map((x) => this.cfg.key + x + base).map((m) => (m > 104 ? m - 12 : m)).sort((a, b) => a - b);
    chimeRoll(this.e, this.pluckBus, midis, t, 0.12 + Math.random() * 0.14, 0.07 + Math.random() * 0.05, 0.9);
  }

  fadeOut(at: number): void {
    this.stopScheduling = true;
    this.out.gain.cancelScheduledValues(at);
    this.out.gain.setValueAtTime(this.out.gain.value, at);
    this.out.gain.setTargetAtTime(0, at, FADE_OUT_TAU);
    this.disposeAt = at + FADE_OUT_TAU * 6;
  }

  dispose(): void {
    try {
      this.padLfo.stop();
    } catch {
      /* ignore */
    }
    for (const p of this.pads) {
      for (const o of p.oscs) {
        try {
          o.stop();
        } catch {
          /* ignore */
        }
      }
      for (const n of p.nodes) n.disconnect();
    }
    this.pads = [];
    for (const n of [this.out, this.padBus, this.padFilter, this.padLfo, this.padLfoAmt, this.pluckBus, this.delay, this.fb, this.fbLp, this.wet]) n.disconnect();
  }
}

export class Music {
  private layers: MoodLayer[] = [];
  mood: MusicMood = 'off';
  private unTick: () => void;

  constructor(private e: Engine) {
    this.unTick = addTicker((now, horizon) => this.tick(now, horizon));
  }

  setMood(m: MusicMood): void {
    if (m === this.mood) return;
    this.mood = m;
    const now = this.e.ctx.currentTime;
    for (const l of this.layers) if (l.disposeAt === Infinity) l.fadeOut(now);
    if (m !== 'off' && m !== 'party') {
      const cfg = MOODS[m];
      if (cfg) this.layers.push(new MoodLayer(this.e, cfg, now + 0.1));
    }
  }

  private tick(now: number, horizon: number): void {
    this.layers = this.layers.filter((l) => {
      if (now > l.disposeAt) {
        l.dispose();
        return false;
      }
      l.schedule(now, horizon);
      return true;
    });
  }

  info() {
    return { mood: this.mood, layers: this.layers.map((l) => ({ mood: l.cfg.mood, fading: l.disposeAt !== Infinity })) };
  }

  dispose(): void {
    this.unTick();
    for (const l of this.layers) l.dispose();
    this.layers = [];
  }
}
