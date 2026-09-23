/**
 * Party / music-reactive mode. OWNER: lane "audio".
 *
 * - Built-in groove: an original, tasteful ~118 BPM generative house-ish track (kick, clap, hats, off-beat bass,
 *   filtered arp with echo, side-chained pad, sparkles, breakdowns) — obviously a fun mode.
 * - Microphone (optional): requested ONLY when party mode starts with `mic: true`. Denied/unavailable → falls back to
 *   the built-in groove and reports it in `useAudioStore().partyStatus`.
 * - An AnalyserNode feeds the pure `ReactiveAnalyzer` every animation frame, which writes `audioReactive`.
 * - Without Web Audio (or before unlock) a silent "virtual" 118 BPM beat still drives the visuals.
 * The game never depends on any of this.
 */
import type { AudioReactiveState } from '@/types';
import { audioReactive, resetAudioReactive } from '@/runtime/audioReactive';
import { addTicker, getEngine, reedWave, setKeepAlive, stats, trackVoice, unlockAudio, warmWave, type Engine } from './engine';
import { chimeRoll, noiseHit } from './voices';
import { midiToFreq } from './dsp';
import { ReactiveAnalyzer, rms, spectrumDbToMag } from './analysis';
import { PARTY_ARP, PARTY_BASS, PARTY_BPM, PARTY_CHORDS, PARTY_HATS, PARTY_KEY } from './theory';
import { getAudioStatus, setAudioStatus, type PartyStatus } from './store';
import { sfx } from './sfx';

// ───────────────────────────── Groove ─────────────────────────────

class Groove {
  readonly out: GainNode;
  private hatBus: GainNode;
  private drumBus: GainNode;
  private bassBus: GainNode;
  private arpBus: GainNode;
  private arpFilter: BiquadFilterNode;
  private arpLfo: OscillatorNode;
  private arpPans: StereoPannerNode[] = [];
  private padBus: GainNode;
  private padDuck: GainNode;
  private nodes: AudioNode[] = [];
  private step = 0;
  private nextAt: number;
  private readonly sixteenth = 60 / PARTY_BPM / 4;
  private stopped = false;
  disposeAt = Infinity;

  constructor(
    private e: Engine,
    dest: AudioNode,
    tap: AudioNode | null,
  ) {
    const ctx = e.ctx;
    const g = (v = 1) => {
      const n = ctx.createGain();
      n.gain.value = v;
      this.nodes.push(n);
      return n;
    };
    this.out = g(0);
    this.out.gain.setTargetAtTime(0.5, ctx.currentTime, 0.4);
    this.out.connect(dest);
    if (tap) this.out.connect(tap);

    this.drumBus = g(1);
    this.drumBus.connect(this.out);
    const hatHp = ctx.createBiquadFilter();
    hatHp.type = 'highpass';
    hatHp.frequency.value = 7000;
    hatHp.Q.value = 0.6;
    this.hatBus = g(1);
    this.hatBus.connect(hatHp);
    hatHp.connect(this.out);

    this.bassBus = g(1);
    this.bassBus.connect(this.out);

    // arp → resonant low-pass swept by a slow LFO → dry + dotted-8th echo
    this.arpBus = g(1);
    this.arpFilter = ctx.createBiquadFilter();
    this.arpFilter.type = 'lowpass';
    this.arpFilter.frequency.value = 1900;
    this.arpFilter.Q.value = 3.5;
    this.arpLfo = ctx.createOscillator();
    this.arpLfo.frequency.value = 1 / ((60 / PARTY_BPM) * 32); // one sweep per 8 bars
    const lfoAmt = g(1300);
    this.arpLfo.connect(lfoAmt);
    lfoAmt.connect(this.arpFilter.frequency);
    this.arpLfo.start();
    this.arpBus.connect(this.arpFilter);
    const arpOut = g(0.5);
    this.arpFilter.connect(arpOut);
    arpOut.connect(this.out);
    const delay = ctx.createDelay(2);
    delay.delayTime.value = this.sixteenth * 3;
    const fb = g(0.34);
    const fbLp = ctx.createBiquadFilter();
    fbLp.type = 'lowpass';
    fbLp.frequency.value = 2800;
    arpOut.connect(delay);
    delay.connect(fbLp);
    fbLp.connect(fb);
    fb.connect(delay);
    const wet = g(0.45);
    fbLp.connect(wet);
    wet.connect(this.out);
    for (const p of [-0.45, 0.45]) {
      const sp = ctx.createStereoPanner();
      sp.pan.value = p;
      sp.connect(this.arpBus);
      this.arpPans.push(sp);
      this.nodes.push(sp);
    }

    // pad → side-chain duck (pumps with the kick) → low-pass
    this.padBus = g(1);
    this.padDuck = g(1);
    const padLp = ctx.createBiquadFilter();
    padLp.type = 'lowpass';
    padLp.frequency.value = 1700;
    padLp.Q.value = 0.6;
    this.padBus.connect(this.padDuck);
    this.padDuck.connect(padLp);
    padLp.connect(this.out);

    this.nodes.push(hatHp, this.arpFilter, this.arpLfo, delay, fbLp, padLp);
    stats.nodesCreated += this.nodes.length;
    this.nextAt = ctx.currentTime + 0.12;
  }

  schedule(now: number, horizon: number): void {
    if (this.stopped) return;
    if (this.nextAt < now - 0.25) this.nextAt = now + 0.05;
    let guard = 0;
    while (this.nextAt < horizon && guard++ < 16) {
      this.playStep(this.nextAt, this.step);
      this.step++;
      this.nextAt += this.sixteenth;
    }
  }

  private playStep(t0: number, step: number): void {
    const s16 = step % 16;
    const bar = Math.floor(step / 16);
    const section = bar < 4 ? 'intro' : (['full', 'full', 'break', 'lift'] as const)[Math.floor((bar - 4) / 8) % 4];
    const barInSection = (bar - 4) % 8;
    const chord = PARTY_CHORDS[bar % PARTY_CHORDS.length];
    const swing = s16 % 2 === 1 ? this.sixteenth * 0.12 : 0;
    const t = t0 + swing;
    const kickOn = section !== 'break' || barInSection >= 7;

    // kick: four on the floor
    if (s16 % 4 === 0 && kickOn && !(section === 'break' && barInSection === 7 && s16 >= 8)) this.kick(t0, s16 === 0 ? 1 : 0.9);
    // clap on 2 & 4
    if ((s16 === 4 || s16 === 12) && section !== 'intro' && section !== 'break') this.clap(t0);
    // hats
    const hv = PARTY_HATS[s16];
    if (section === 'intro') {
      if (s16 % 4 === 2) this.hat(t, hv * 0.8, false);
    } else if (section !== 'break' || s16 % 4 === 2) {
      this.hat(t, hv, s16 % 4 === 2 && section !== 'break');
    }
    // bass
    const b = PARTY_BASS[s16];
    if (b !== null && section !== 'intro' && section !== 'break') {
      this.bass(t, PARTY_KEY - 24 + chord.root + b, this.sixteenth * 1.6, s16 % 4 === 2 ? 1 : 0.8);
    }
    // arp (sparser in the intro, busier in the lift)
    const arpOn = section === 'lift' || section === 'full' || (section === 'break' && s16 % 2 === 0) || (section === 'intro' && bar >= 2 && s16 % 2 === 0);
    if (arpOn) {
      const idx = PARTY_ARP[s16];
      const tones = chord.tones;
      const octave = Math.floor(idx / tones.length) * 12;
      const midi = PARTY_KEY + 12 + tones[idx % tones.length] + octave;
      this.arp(t, midi, s16 % 4 === 0 ? 0.9 : 0.6, s16 % 2);
    }
    // pad on bar start
    if (s16 === 0) this.pad(t0, chord.tones, section === 'break' ? 1.25 : 0.8);
    // sparkle into sections, riser before the drop
    if (s16 === 0 && barInSection === 0 && section !== 'intro') {
      chimeRoll(this.e, this.out, chord.tones.slice(1, 4).map((x) => PARTY_KEY + 36 + x), t0, 0.07, 0.1, 0.9);
    }
    if (section === 'break' && barInSection === 6 && s16 === 0) {
      noiseHit(this.e, this.out, { kind: 'pink', filter: 'bandpass', freq: 300, freqEnd: 6000, glide: this.sixteenth * 30, q: 2.2, t0, attack: this.sixteenth * 28, decay: 0.05, peak: 0.12 });
    }
  }

  private kick(t: number, v: number): void {
    const ctx = this.e.ctx;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(155, t);
    o.frequency.exponentialRampToValueAtTime(47, t + 0.09);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.95 * v, t + 0.003);
    g.gain.setTargetAtTime(0, t + 0.02, 0.1);
    o.connect(g);
    g.connect(this.drumBus);
    o.start(t);
    o.stop(t + 0.6);
    track(o, [g]);
    noiseHit(this.e, this.drumBus, { filter: 'highpass', freq: 2500, t0: t, decay: 0.003, peak: 0.12 * v, priority: 1 });
    // side-chain pump on the pad
    const d = this.padDuck.gain;
    d.setValueAtTime(0.3, t);
    d.setTargetAtTime(1, t + 0.03, 0.11);
  }

  private clap(t: number): void {
    for (let i = 0; i < 3; i++) noiseHit(this.e, this.drumBus, { filter: 'bandpass', freq: 1400, q: 1.2, t0: t + i * 0.011, decay: 0.004, peak: 0.22, priority: 1 });
    noiseHit(this.e, this.drumBus, { filter: 'bandpass', freq: 1200, q: 0.9, t0: t + 0.03, decay: 0.06, peak: 0.14, priority: 1 });
  }

  private hat(t: number, v: number, open: boolean): void {
    noiseHit(this.e, this.hatBus, { filter: 'bandpass', freq: open ? 9000 : 10500, q: 0.8, t0: t, decay: open ? 0.055 : 0.012, peak: (open ? 0.14 : 0.12) * v, pan: open ? 0.2 : -0.15, priority: 2 });
  }

  private bass(t: number, midi: number, dur: number, v: number): void {
    const ctx = this.e.ctx;
    const o = ctx.createOscillator();
    o.setPeriodicWave(warmWave(this.e));
    o.frequency.value = midiToFreq(midi);
    const sub = ctx.createOscillator();
    sub.frequency.value = midiToFreq(midi);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 5;
    f.frequency.setValueAtTime(160, t);
    f.frequency.linearRampToValueAtTime(950, t + 0.012);
    f.frequency.setTargetAtTime(200, t + 0.02, dur * 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.42 * v, t + 0.006);
    g.gain.setTargetAtTime(0, t + dur * 0.7, 0.03);
    const sg = ctx.createGain();
    sg.gain.value = 0.55;
    o.connect(f);
    sub.connect(sg);
    sg.connect(g);
    f.connect(g);
    g.connect(this.bassBus);
    o.start(t);
    sub.start(t);
    o.stop(t + dur + 0.25);
    sub.stop(t + dur + 0.25);
    track(o, [f, g]);
    track(sub, [sg]);
  }

  private arp(t: number, midi: number, v: number, side: number): void {
    const ctx = this.e.ctx;
    const o = ctx.createOscillator();
    o.setPeriodicWave(reedWave(this.e));
    o.frequency.value = midiToFreq(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16 * v, t + 0.004);
    g.gain.setTargetAtTime(0, t + 0.01, 0.07);
    o.connect(g);
    g.connect(this.arpPans[side] ?? this.arpBus);
    o.start(t);
    o.stop(t + 0.5);
    track(o, [g]);
  }

  private pad(t: number, tones: number[], len: number): void {
    const ctx = this.e.ctx;
    const barDur = this.sixteenth * 16;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.25);
    g.gain.setTargetAtTime(0, t + barDur * len - 0.15, 0.2);
    g.connect(this.padBus);
    const wave = warmWave(this.e);
    tones.forEach((x, i) => {
      const o = ctx.createOscillator();
      o.setPeriodicWave(wave);
      o.frequency.value = midiToFreq(PARTY_KEY + x);
      o.detune.value = (i % 2 ? 1 : -1) * 7;
      const vg = ctx.createGain();
      vg.gain.value = 0.3;
      o.connect(vg);
      vg.connect(g);
      o.start(t);
      o.stop(t + barDur * len + 1.2);
      track(o, i === 0 ? [vg, g] : [vg]); // all voices end together; the first one also releases the shared gain
    });
  }

  stop(at: number): void {
    this.stopped = true;
    this.out.gain.cancelScheduledValues(at);
    this.out.gain.setValueAtTime(this.out.gain.value, at);
    this.out.gain.setTargetAtTime(0, at, 0.35);
    this.disposeAt = at + 2.5;
  }

  dispose(): void {
    try {
      this.arpLfo.stop();
    } catch {
      /* ignore */
    }
    for (const n of this.nodes) n.disconnect();
  }
}

const track = trackVoice;

// ───────────────────────────── Session ─────────────────────────────

interface Session {
  token: number;
  wantMic: boolean;
  groove: Groove | null;
  analyser: AnalyserNode | null;
  micStream: MediaStream | null;
  micSource: MediaStreamAudioSourceNode | null;
  source: AudioReactiveState['source'];
  raf: number;
  lastT: number;
  startedAt: number;
  /** Virtual-beat phase (used only when no audio is available). */
  vPhase: number;
}

let session: Session | null = null;
let token = 0;
const dyingGrooves: Groove[] = [];
const analyzer = new ReactiveAnalyzer();
let freqDb: Float32Array<ArrayBuffer> | null = null;
let mags: Float32Array<ArrayBuffer> | null = null;
let timeBuf: Float32Array<ArrayBuffer> | null = null;
let unTick: (() => void) | null = null;

function ensureTicker(): void {
  if (unTick) return;
  unTick = addTicker((now, horizon) => {
    session?.groove?.schedule(now, horizon);
    for (let i = dyingGrooves.length - 1; i >= 0; i--) {
      if (now > dyingGrooves[i].disposeAt) {
        dyingGrooves[i].dispose();
        dyingGrooves.splice(i, 1);
      }
    }
  });
}

function makeAnalyser(e: Engine): AnalyserNode {
  const a = e.ctx.createAnalyser();
  a.fftSize = 2048;
  a.smoothingTimeConstant = 0.15;
  a.minDecibels = -100;
  a.maxDecibels = -10;
  freqDb = new Float32Array(a.frequencyBinCount);
  mags = new Float32Array(a.frequencyBinCount);
  timeBuf = new Float32Array(a.fftSize);
  return a;
}

function startGroove(s: Session, e: Engine): void {
  if (!s.analyser) s.analyser = makeAnalyser(e);
  s.groove = new Groove(e, e.musicIn, s.analyser);
  s.source = 'builtin';
  ensureTicker();
}

/**
 * Start party mode. With `mic: true` the browser's microphone permission prompt appears now (never earlier).
 * Resolves with the resulting status; never rejects.
 */
export async function startPartyMode({ mic = false }: { mic?: boolean } = {}): Promise<PartyStatus> {
  try {
    if (session && session.wantMic === mic) return getAudioStatus().partyStatus;
    if (session) stopPartyMode(true);
    const my = ++token;
    unlockAudio();
    const e = getEngine();
    const s: Session = { token: my, wantMic: mic, groove: null, analyser: null, micStream: null, micSource: null, source: 'builtin', raf: 0, lastT: performance.now(), startedAt: performance.now(), vPhase: 0 };
    session = s;
    analyzer.reset();
    audioReactive.enabled = true;
    audioReactive.source = 'builtin';

    let status: PartyStatus = 'builtin';
    let message: string | null = null;
    if (mic) {
      setAudioStatus({ partyStatus: 'requesting_mic', partyMessage: 'Waiting for microphone permission…' });
      const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
      if (!md?.getUserMedia || !e) {
        status = 'mic_unavailable';
        message = 'No microphone available — playing the built-in groove.';
      } else {
        try {
          const stream = await md.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true } });
          if (session !== s || token !== my) {
            stream.getTracks().forEach((tr) => tr.stop());
            return getAudioStatus().partyStatus;
          }
          s.micStream = stream;
          s.analyser = makeAnalyser(e);
          s.micSource = e.ctx.createMediaStreamSource(stream);
          s.micSource.connect(s.analyser); // analysed only — never routed to the speakers (no feedback)
          s.source = 'microphone';
          setKeepAlive('party-mic', true);
          status = 'microphone';
          message = 'Listening to your music through the microphone.';
        } catch (err) {
          if (session !== s || token !== my) return getAudioStatus().partyStatus;
          const name = (err as { name?: string })?.name ?? '';
          status = name === 'NotAllowedError' || name === 'SecurityError' ? 'mic_denied' : 'mic_unavailable';
          message = status === 'mic_denied' ? 'Microphone permission was denied — playing the built-in groove instead.' : 'No microphone found — playing the built-in groove instead.';
        }
      }
    }
    if (s.source !== 'microphone') {
      if (e) startGroove(s, e);
      else {
        status = 'silent';
        message = 'Audio is unavailable — lights follow a silent beat.';
      }
    }
    audioReactive.source = s.source;
    setAudioStatus({ partyStatus: status, partyMessage: message });
    sfx('party_on');
    s.lastT = performance.now();
    const loop = (ts: number) => {
      if (session !== s) return;
      s.raf = requestAnimationFrame(loop);
      frame(s, ts);
    };
    s.raf = requestAnimationFrame(loop);
    return status;
  } catch (err) {
    console.warn('[audio] party mode failed to start', err);
    setAudioStatus({ partyStatus: 'silent', partyMessage: null });
    return 'silent';
  }
}

/** Stop party mode: fades the groove, releases the microphone, zeroes `audioReactive`. */
export function stopPartyMode(silent = false): void {
  const s = session;
  session = null;
  token++;
  if (!s) {
    resetAudioReactive();
    return;
  }
  try {
    if (s.raf) cancelAnimationFrame(s.raf);
    const e = getEngine();
    if (s.groove && e) {
      s.groove.stop(e.ctx.currentTime);
      dyingGrooves.push(s.groove);
    }
    s.micStream?.getTracks().forEach((tr) => tr.stop());
    s.micSource?.disconnect();
    const a = s.analyser;
    if (a) setTimeout(() => a.disconnect(), 2600);
    setKeepAlive('party-mic', false);
    if (!silent) sfx('party_off');
  } catch (err) {
    console.warn('[audio] party mode stop failed', err);
  }
  resetAudioReactive();
  setAudioStatus({ partyStatus: 'off', partyMessage: null });
}

export function partyModeStatus(): { active: boolean; status: PartyStatus; source: AudioReactiveState['source']; message: string | null } {
  const st = getAudioStatus();
  return { active: !!session, status: st.partyStatus, source: session?.source ?? 'none', message: st.partyMessage };
}

const VIRTUAL_BEAT = 60 / PARTY_BPM;

function frame(s: Session, ts: number): void {
  const dt = Math.max(0.001, Math.min(0.1, (ts - s.lastT) / 1000));
  s.lastT = ts;
  const e = getEngine();
  const a = s.analyser;
  let f: { level: number; bass: number; mid: number; treble: number; beat: number; hue: number };
  if (a && e && e.ctx.state === 'running' && freqDb && mags && timeBuf) {
    a.getFloatFrequencyData(freqDb);
    spectrumDbToMag(freqDb, mags);
    a.getFloatTimeDomainData(timeBuf);
    f = analyzer.process(mags, e.ctx.sampleRate, rms(timeBuf), dt);
  } else {
    // silent virtual groove so visuals still dance (no audio / not yet unlocked)
    const tt = (ts - s.startedAt) / 1000;
    const phase = (tt % VIRTUAL_BEAT) / VIRTUAL_BEAT;
    const hit = phase < s.vPhase; // wrapped → a new beat
    s.vPhase = phase;
    const pulse = Math.exp(-phase * 7);
    const six = Math.exp(-(((tt * 4) / VIRTUAL_BEAT) % 1) * 9);
    f = analyzer.frame;
    f.level = 0.45 + 0.25 * pulse;
    f.bass = 0.2 + 0.7 * pulse;
    f.mid = 0.35 + 0.15 * Math.sin(tt * 0.9);
    f.treble = 0.2 + 0.4 * six;
    f.beat = hit ? 1 : f.beat * Math.exp(-7 * dt);
    f.hue = (f.hue + 0.012 * dt + (hit ? 0.0618 : 0)) % 1;
  }
  audioReactive.enabled = true;
  audioReactive.source = s.source;
  audioReactive.level = clamp01(f.level);
  audioReactive.bass = clamp01(f.bass);
  audioReactive.mid = clamp01(f.mid);
  audioReactive.treble = clamp01(f.treble);
  audioReactive.beat = clamp01(f.beat);
  audioReactive.hue = ((f.hue % 1) + 1) % 1;
}

const clamp01 = (v: number) => (Number.isFinite(v) ? (v < 0 ? 0 : v > 1 ? 1 : v) : 0);

export function partyDebug() {
  return {
    active: !!session,
    source: session?.source ?? 'none',
    beats: analyzer.detector.beats,
    interval: +analyzer.detector.lastInterval.toFixed(3),
    reactive: { ...audioReactive },
  };
}
