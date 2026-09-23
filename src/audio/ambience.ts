/**
 * Aquarium ambience: filter hum, HOB waterfall trickle, water movement, bubbles (airstones / sponge filters),
 * skimmer fizz, fan air, room tone per facility level and a distant visitor murmur. OWNER: lane "audio".
 *
 * Continuous layers are built lazily when their level rises above zero and torn down after staying silent for a
 * while, so an empty room costs almost nothing. Bubbles and murmur syllables are scheduled by the engine's
 * lookahead ticker. Levels glide slowly (never abrupt) — it should feel like a calm room, never a sound effect.
 */
import { addTicker, loopNoise, trickleBuffer, stats, type Engine } from './engine';
import { bubble } from './voices';
import type { RoomSound, TankSoundProfile } from './soundscape';
import { SILENT_PROFILE, ROOMS } from './soundscape';

export interface AmbienceTargets {
  active: boolean;
  profile: TankSoundProfile;
  room: RoomSound;
  /** Room-tone multiplier (night is quieter). */
  roomTone: number;
  /** 0..1 visitor presence. */
  visitors: number;
  /** Extra "a tank is here" presence (gentle water movement even without equipment). */
  waterPresence: number;
  /** 0..1 overall multiplier (party mode ducks ambience). */
  master: number;
}

interface Layer {
  gain: GainNode;
  nodes: AudioNode[];
  sources: AudioScheduledSourceNode[];
  level: number;
  zeroSince: number;
}

const LAYER_TAU = 1.2;
const DISPOSE_AFTER_S = 6;

interface Talker {
  noise: AudioBufferSourceNode;
  osc: OscillatorNode;
  f1: BiquadFilterNode;
  f2: BiquadFilterNode;
  syl: GainNode;
  pan: StereoPannerNode;
  nodes: AudioNode[];
  next: number;
  inPhrase: number;
  pitch: number;
  loud: number;
}

export class Ambience {
  private tankOut: GainNode;
  private roomOut: GainNode;
  private bubbleBus: GainNode;
  private bubbleSlots: StereoPannerNode[] = [];
  private layers = new Map<string, Layer>();
  private targets: AmbienceTargets = { active: false, profile: SILENT_PROFILE, room: ROOMS.hobby_room, roomTone: 1, visitors: 0, waterPresence: 0, master: 1 };
  private nextFine = Infinity;
  private nextBig = Infinity;
  private nextStray = Infinity;
  private spongePan = -0.45;
  private talkers: Talker[] = [];
  private murmurBus: GainNode | null = null;
  private murmurNodes: AudioNode[] = [];
  private murmurZeroSince = 0;
  private murmurLevel = -1;
  private toneCutoff = -1;
  private unTick: () => void;
  /** Debug mirror of current layer levels. */
  levels: Record<string, number> = {};

  constructor(private e: Engine) {
    const ctx = e.ctx;
    this.tankOut = ctx.createGain();
    this.tankOut.connect(e.tankBus);
    this.roomOut = ctx.createGain();
    this.roomOut.connect(e.roomBus);
    this.bubbleBus = ctx.createGain();
    const bubbleLp = ctx.createBiquadFilter();
    bubbleLp.type = 'lowpass';
    bubbleLp.frequency.value = 7000;
    this.bubbleBus.connect(bubbleLp);
    bubbleLp.connect(this.tankOut);
    // pooled stereo positions for bubbles (no per-bubble panner)
    for (const p of [-0.7, -0.4, -0.15, 0.1, 0.35, 0.65]) {
      const s = ctx.createStereoPanner();
      s.pan.value = p;
      s.connect(this.bubbleBus);
      this.bubbleSlots.push(s);
    }
    stats.nodesCreated += 10;
    this.unTick = addTicker((now, horizon) => this.tick(now, horizon));
  }

  update(t: AmbienceTargets): void {
    this.targets = t;
    const p = t.profile;
    const on = t.active ? t.master : 0;
    const now = this.e.ctx.currentTime;
    // tank layers
    this.setLayer('hum', on * (p.hum > 0 ? 0.08 + p.hum * 0.3 : 0), () => this.buildHum());
    this.setLayer('trickle', on * p.trickle * 0.34, () => this.buildTrickle());
    this.setLayer('flow', on * Math.min(1, t.waterPresence * 0.2 + p.flow * 0.55) * 0.5, () => this.buildFlow());
    this.setLayer('stream', on * Math.min(1, p.fineBubbles / 8) * 0.05, () => this.buildStream());
    this.setLayer('fizz', on * p.fizz * 0.1, () => this.buildFizz());
    this.setLayer('air', on * p.air * 0.12, () => this.buildAir());
    // room
    const room = t.room;
    this.setLayer('roomTone', on * room.tone * 0.3 * t.roomTone, () => this.buildRoomTone(), this.roomOut);
    this.setLayer('roomAir', on * room.air * 0.1 * t.roomTone, () => this.buildRoomAir(), this.roomOut);
    const rt = this.layers.get('roomTone');
    if (rt && this.toneCutoff !== room.toneCutoff) {
      this.toneCutoff = room.toneCutoff;
      const lp = rt.nodes.find((n): n is BiquadFilterNode => n instanceof BiquadFilterNode);
      lp?.frequency.setTargetAtTime(room.toneCutoff, now, 2);
    }
    // bubble clocks (Poisson processes)
    const fineRate = on > 0 ? p.fineBubbles : 0;
    const bigRate = on > 0 ? p.bigBubbles : 0;
    if (fineRate <= 0) this.nextFine = Infinity;
    else if (!Number.isFinite(this.nextFine)) this.nextFine = now + 0.1 + expo(fineRate);
    if (bigRate <= 0) this.nextBig = Infinity;
    else if (!Number.isFinite(this.nextBig)) this.nextBig = now + 0.2 + expo(bigRate);
    const strayRate = on > 0 && t.waterPresence > 0 ? 0.06 : 0;
    if (strayRate <= 0) this.nextStray = Infinity;
    else if (!Number.isFinite(this.nextStray)) this.nextStray = now + 2 + expo(strayRate);
    // murmur
    const murmur = on * Math.max(0, Math.min(1, t.visitors));
    this.setMurmur(murmur);
    this.levels = {};
    for (const [k, l] of this.layers) this.levels[k] = +l.level.toFixed(3);
    this.levels.murmur = +murmur.toFixed(3);
    this.levels.fineBubblesPerS = +fineRate.toFixed(2);
    this.levels.bigBubblesPerS = +bigRate.toFixed(2);
  }

  private setLayer(name: string, level: number, build: () => Omit<Layer, 'level' | 'zeroSince' | 'gain'> & { head: AudioNode }, dest: AudioNode = this.tankOut): void {
    const now = this.e.ctx.currentTime;
    let l = this.layers.get(name);
    if (!l && level > 0.0005) {
      try {
        const b = build();
        const g = this.e.ctx.createGain();
        g.gain.value = 0;
        b.head.connect(g);
        g.connect(dest);
        l = { gain: g, nodes: b.nodes, sources: b.sources, level: 0, zeroSince: 0 };
        this.layers.set(name, l);
      } catch (err) {
        console.warn('[audio] ambience layer failed', name, err);
        return;
      }
    }
    if (!l) return;
    if (Math.abs(l.level - level) > 1e-4) {
      l.gain.gain.setTargetAtTime(level, now, LAYER_TAU);
      l.level = level;
    }
    if (level <= 0.0005) {
      if (!l.zeroSince) l.zeroSince = now;
      else if (now - l.zeroSince > DISPOSE_AFTER_S) {
        this.disposeLayer(l);
        this.layers.delete(name);
      }
    } else l.zeroSince = 0;
  }

  private disposeLayer(l: Layer): void {
    for (const s of l.sources) {
      try {
        s.stop();
      } catch {
        /* ignore */
      }
    }
    for (const n of [...l.sources, ...l.nodes, l.gain]) {
      try {
        n.disconnect();
      } catch {
        /* ignore */
      }
    }
  }

  // ───────────── layer builders ─────────────

  private buildHum() {
    const { ctx } = this.e;
    const noise = loopNoise(this.e, 'brown');
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 260;
    lp.Q.value = 0.6;
    const churn = ctx.createBiquadFilter(); // faint mid "churn" of water inside the filter body
    churn.type = 'peaking';
    churn.frequency.value = 420;
    churn.Q.value = 1.2;
    churn.gain.value = 5;
    const head = ctx.createGain();
    noise.connect(lp);
    lp.connect(churn);
    churn.connect(head);
    // very subtle motor hum (100 Hz + harmonics) with slow wobble
    const toneGain = ctx.createGain();
    toneGain.gain.value = 0.05;
    const oscs: OscillatorNode[] = [];
    const partials: [number, number][] = [[100, 1], [200, 0.35], [300, 0.1]];
    for (const [f, a] of partials) {
      const o = ctx.createOscillator();
      o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.004);
      const g = ctx.createGain();
      g.gain.value = a;
      o.connect(g);
      g.connect(toneGain);
      o.start();
      oscs.push(o);
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.17;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 0.015;
    lfo.connect(lfoAmt);
    lfoAmt.connect(toneGain.gain);
    lfo.start();
    toneGain.connect(head);
    stats.nodesCreated += 14;
    return { head, nodes: [lp, churn, head, toneGain, lfoAmt], sources: [noise, ...oscs, lfo] };
  }

  private buildTrickle() {
    const { ctx } = this.e;
    const head = ctx.createGain();
    const shelf = ctx.createBiquadFilter();
    shelf.type = 'highshelf';
    shelf.frequency.value = 6000;
    shelf.gain.value = -5;
    shelf.connect(head);
    const srcs: AudioBufferSourceNode[] = [];
    const nodes: AudioNode[] = [head, shelf];
    ([[0, -0.3, 1], [1, 0.35, 0.93]] as const).forEach(([i, pan, rate]) => {
      const s = ctx.createBufferSource();
      s.buffer = trickleBuffer(this.e, i);
      s.loop = true;
      s.playbackRate.value = rate;
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      s.connect(p);
      p.connect(shelf);
      s.start(ctx.currentTime, Math.random() * 2);
      srcs.push(s);
      nodes.push(p);
    });
    // band-passed noise bed with slow "burble" modulation
    const bed = loopNoise(this.e, 'pink');
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1100;
    bp.Q.value = 0.9;
    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.3;
    bed.connect(bp);
    bp.connect(bedGain);
    bedGain.connect(shelf);
    const lfoF = ctx.createOscillator();
    lfoF.frequency.value = 0.07;
    const lfoFAmt = ctx.createGain();
    lfoFAmt.gain.value = 320;
    lfoF.connect(lfoFAmt);
    lfoFAmt.connect(bp.frequency);
    const lfoA = ctx.createOscillator();
    lfoA.frequency.value = 0.13;
    const lfoAAmt = ctx.createGain();
    lfoAAmt.gain.value = 0.1;
    lfoA.connect(lfoAAmt);
    lfoAAmt.connect(bedGain.gain);
    lfoF.start();
    lfoA.start();
    stats.nodesCreated += 14;
    return { head, nodes: [...nodes, bp, bedGain, lfoFAmt, lfoAAmt], sources: [...srcs, bed, lfoF, lfoA] };
  }

  private buildFlow() {
    const { ctx } = this.e;
    const head = ctx.createGain();
    const nodes: AudioNode[] = [head];
    const sources: AudioScheduledSourceNode[] = [];
    ([[-0.55, 380, 0.05, 0.09], [0.55, 520, 0.071, 0.063]] as const).forEach(([pan, f, lf, la]) => {
      const n = loopNoise(this.e, 'pink');
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = f;
      lp.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.value = 0.6;
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      n.connect(lp);
      lp.connect(g);
      g.connect(p);
      p.connect(head);
      const lfo1 = ctx.createOscillator();
      lfo1.frequency.value = lf;
      const a1 = ctx.createGain();
      a1.gain.value = f * 0.35;
      lfo1.connect(a1);
      a1.connect(lp.frequency);
      const lfo2 = ctx.createOscillator();
      lfo2.frequency.value = la;
      const a2 = ctx.createGain();
      a2.gain.value = 0.25;
      lfo2.connect(a2);
      a2.connect(g.gain);
      lfo1.start();
      lfo2.start();
      sources.push(n, lfo1, lfo2);
      nodes.push(lp, g, p, a1, a2);
    });
    stats.nodesCreated += 17;
    return { head, nodes, sources };
  }

  private buildStream() {
    const { ctx } = this.e;
    const n = loopNoise(this.e, 'white');
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 4800;
    bp.Q.value = 1.1;
    const head = ctx.createGain();
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.41;
    const amt = ctx.createGain();
    amt.gain.value = 0.3;
    lfo.connect(amt);
    amt.connect(head.gain);
    lfo.start();
    n.connect(bp);
    bp.connect(head);
    stats.nodesCreated += 5;
    return { head, nodes: [bp, amt], sources: [n, lfo] };
  }

  private buildFizz() {
    const { ctx } = this.e;
    const n = loopNoise(this.e, 'white');
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3200;
    bp.Q.value = 0.8;
    const head = ctx.createGain();
    n.connect(bp);
    bp.connect(head);
    stats.nodesCreated += 3;
    return { head, nodes: [bp], sources: [n] };
  }

  private buildAir() {
    const { ctx } = this.e;
    const n = loopNoise(this.e, 'pink');
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 0.4;
    const head = ctx.createGain();
    n.connect(bp);
    bp.connect(head);
    stats.nodesCreated += 3;
    return { head, nodes: [bp], sources: [n] };
  }

  private buildRoomTone() {
    const { ctx } = this.e;
    const n = loopNoise(this.e, 'brown');
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = this.targets.room.toneCutoff;
    this.toneCutoff = this.targets.room.toneCutoff;
    lp.Q.value = 0.5;
    const head = ctx.createGain();
    n.connect(lp);
    lp.connect(head);
    stats.nodesCreated += 3;
    return { head, nodes: [lp], sources: [n] };
  }

  private buildRoomAir() {
    const { ctx } = this.e;
    const n = loopNoise(this.e, 'pink');
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 0.5;
    const head = ctx.createGain();
    n.connect(bp);
    bp.connect(head);
    stats.nodesCreated += 3;
    return { head, nodes: [bp], sources: [n] };
  }

  // ───────────── visitor murmur ─────────────

  private setMurmur(level: number): void {
    const { ctx } = this.e;
    const now = ctx.currentTime;
    if (level > 0.001 && !this.murmurBus) {
      const bus = ctx.createGain();
      bus.gain.value = 0;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1500;
      lp.Q.value = 0.4;
      const verb = ctx.createGain(); // extra reverb send → reads as "people across the room"
      verb.gain.value = 0.5;
      bus.connect(lp);
      lp.connect(this.roomOut);
      lp.connect(verb);
      verb.connect(this.e.reverbIn);
      this.murmurBus = bus;
      this.murmurNodes = [lp, verb];
      for (let i = 0; i < 5; i++) this.talkers.push(this.makeTalker(i));
      stats.nodesCreated += 3;
    }
    if (!this.murmurBus) return;
    if (Math.abs(level - this.murmurLevel) > 1e-3) {
      this.murmurLevel = level;
      this.murmurBus.gain.setTargetAtTime(level * 0.85, now, 1.5);
    }
    if (level <= 0.001) {
      if (!this.murmurZeroSince) this.murmurZeroSince = now;
      else if (now - this.murmurZeroSince > DISPOSE_AFTER_S) this.disposeMurmur();
    } else this.murmurZeroSince = 0;
  }

  private makeTalker(i: number): Talker {
    const { ctx } = this.e;
    const noise = loopNoise(this.e, 'pink');
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    const pitch = [110, 128, 176, 205, 150][i % 5] * (0.92 + Math.random() * 0.16);
    osc.frequency.value = pitch;
    const nG = ctx.createGain();
    nG.gain.value = 0.35;
    const vG = ctx.createGain();
    vG.gain.value = 0.42;
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = 500;
    f1.Q.value = 4;
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.value = 1400;
    f2.Q.value = 5;
    const syl = ctx.createGain();
    syl.gain.value = 0;
    const pan = ctx.createStereoPanner();
    pan.pan.value = -0.8 + (i / 4) * 1.6 + (Math.random() - 0.5) * 0.2;
    noise.connect(nG);
    osc.connect(vG);
    for (const src of [nG, vG]) {
      src.connect(f1);
      src.connect(f2);
    }
    f1.connect(syl);
    f2.connect(syl);
    syl.connect(pan);
    pan.connect(this.murmurBus!);
    osc.start();
    stats.nodesCreated += 8;
    return { noise, osc, f1, f2, syl, pan, nodes: [nG, vG, f1, f2, syl, pan], next: ctx.currentTime + Math.random() * 2, inPhrase: 0, pitch, loud: 0.5 + Math.random() * 0.5 };
  }

  private disposeMurmur(): void {
    for (const t of this.talkers) {
      for (const s of [t.noise, t.osc]) {
        try {
          s.stop();
          s.disconnect();
        } catch {
          /* ignore */
        }
      }
      for (const n of t.nodes) n.disconnect();
    }
    this.talkers = [];
    for (const n of this.murmurNodes) n.disconnect();
    this.murmurNodes = [];
    this.murmurBus?.disconnect();
    this.murmurBus = null;
    this.murmurZeroSince = 0;
    this.murmurLevel = -1;
  }

  // ───────────── scheduler ─────────────

  private tick(now: number, horizon: number): void {
    const t = this.targets;
    const p = t.profile;
    // catch-up guard after a suspend: never burst old events
    if (this.nextFine < now - 0.2) this.nextFine = now + expo(Math.max(0.1, p.fineBubbles));
    if (this.nextBig < now - 0.2) this.nextBig = now + expo(Math.max(0.1, p.bigBubbles));
    if (this.nextStray < now - 0.2) this.nextStray = now + 3;
    const m = t.active ? t.master : 0;
    // airstone: small clusters of fine bubbles
    let guard = 0;
    while (this.nextFine < horizon && guard++ < 40) {
      const at = this.nextFine;
      const n = 1 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        const slot = this.bubbleSlots[2 + Math.floor(Math.random() * 3)];
        bubble(this.e, slot, at + k * (0.012 + Math.random() * 0.03), 0.04 + Math.random() * 0.26, (0.02 + Math.random() * 0.035) * m);
      }
      this.nextFine = at + expo(Math.max(0.1, p.fineBubbles)) * n;
    }
    // sponge filter / air-lift: bigger, rounder glugs from one side, sometimes doubled
    guard = 0;
    while (this.nextBig < horizon && guard++ < 20) {
      const at = this.nextBig;
      const slot = this.bubbleSlots[this.spongePan < 0 ? 1 : 4];
      bubble(this.e, slot, at, 0.55 + Math.random() * 0.4, (0.05 + Math.random() * 0.04) * m);
      if (Math.random() < 0.3) bubble(this.e, slot, at + 0.05 + Math.random() * 0.05, 0.4 + Math.random() * 0.3, 0.035 * m);
      // air-lifts are fairly regular: jittered interval rather than pure Poisson
      const mean = 1 / Math.max(0.1, p.bigBubbles);
      this.nextBig = at + mean * (0.6 + Math.random() * 0.8);
    }
    // an occasional stray bubble (a fish gulp, a pocket escaping the substrate)
    if (this.nextStray < horizon) {
      const slot = this.bubbleSlots[Math.floor(Math.random() * this.bubbleSlots.length)];
      bubble(this.e, slot, this.nextStray, 0.3 + Math.random() * 0.3, 0.025 * m);
      this.nextStray += 6 + expo(0.08);
    }
    // murmur syllables
    if (this.murmurBus) for (const tk of this.talkers) this.talk(tk, now, horizon);
  }

  private talk(tk: Talker, now: number, horizon: number): void {
    if (tk.next < now - 0.3) tk.next = now + Math.random();
    let guard = 0;
    while (tk.next < horizon && guard++ < 12) {
      const at = tk.next;
      if (tk.inPhrase <= 0) {
        // pause between utterances, then start a new phrase
        tk.inPhrase = 4 + Math.floor(Math.random() * 14);
        tk.next = at + 0.6 + Math.random() * 3.5;
        continue;
      }
      tk.inPhrase--;
      const dur = 0.09 + Math.random() * 0.16;
      const amp = tk.loud * (0.35 + Math.random() * 0.65);
      // vowel formants (rough F1/F2 space of spoken vowels)
      const F1 = 300 + Math.random() * 500;
      const F2 = 900 + Math.random() * 1400;
      tk.f1.frequency.setTargetAtTime(F1, at, 0.02);
      tk.f2.frequency.setTargetAtTime(F2, at, 0.02);
      tk.osc.frequency.setTargetAtTime(tk.pitch * (0.9 + Math.random() * 0.25), at, 0.05);
      tk.syl.gain.setTargetAtTime(amp, at, 0.025);
      tk.syl.gain.setTargetAtTime(0.0001, at + dur, 0.04);
      tk.next = at + dur + 0.03 + Math.random() * 0.12;
    }
  }

  dispose(): void {
    this.unTick();
    for (const l of this.layers.values()) this.disposeLayer(l);
    this.layers.clear();
    this.disposeMurmur();
    for (const s of this.bubbleSlots) s.disconnect();
    this.bubbleBus.disconnect();
    this.tankOut.disconnect();
    this.roomOut.disconnect();
  }
}

/** Exponential inter-arrival time for a Poisson process of `rate` events/s. */
function expo(rate: number): number {
  return -Math.log(1 - Math.random() * 0.999) / Math.max(1e-3, rate);
}
