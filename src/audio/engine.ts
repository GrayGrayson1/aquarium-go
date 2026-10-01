/**
 * Web Audio engine: one lazily-created AudioContext, bus graph, reverb, limiter, settings binding, lookahead
 * scheduler hub, buffer caches and voice accounting. OWNER: lane "audio".
 *
 * Graph:
 *   music layers / party ─► musicIn ─► musicDuck ─► musicBus(vol) ─┬─────────────► masterIn
 *   tank ambience ─► tankBus ─► tankDistance(LP) ─► tankLevel ─┐    └─ sendMusic ─┐
 *   tank sfx ─► tankSfx ────────────────────────────────────────┼─► aquariumBus(vol) ─┬─► masterIn
 *   room tone / visitors ─► roomBus ─► roomLevel ───────────────┘                      └─ sendAquarium ─┤
 *   ui sfx ─► uiIn ─► uiBus(vol) ─┬─► masterIn                                                          │
 *                                 └─ sendUi ─────────────────────────────────────────► reverbIn ◄───────┘
 *   reverbIn ─► HP ─► convolver (crossfaded per room) ─► masterIn
 *   masterIn ─► masterVol(vol·mute) ─► HP 22 Hz ─► glue compressor ─► limiter ─► destination (+ debug meter)
 *
 * Every public function is safe before unlock and never throws; without Web Audio everything is a silent no-op.
 */
import { useSettings, type Settings } from '@/state/settings';
import { setAudioStatus } from './store';
import { fillBrown, fillPink, fillWhite, makeImpulse, midiToFreq, mulberry32, renderPluck, renderTrickle, type PluckKind } from './dsp';
import type { RoomSound } from './soundscape';

export interface Engine {
  ctx: AudioContext;
  masterIn: GainNode;
  masterVol: GainNode;
  musicIn: GainNode;
  musicDuck: GainNode;
  musicBus: GainNode;
  aquariumBus: GainNode;
  tankBus: GainNode;
  tankDistance: BiquadFilterNode;
  tankLevel: GainNode;
  tankSfx: GainNode;
  roomBus: GainNode;
  roomLevel: GainNode;
  uiIn: GainNode;
  uiBus: GainNode;
  sendMusic: GainNode;
  sendAquarium: GainNode;
  sendUi: GainNode;
  reverbIn: GainNode;
  reverbPre: BiquadFilterNode;
  meter: AnalyserNode;
}

type Ticker = (now: number, horizon: number) => void;

const LOOKAHEAD_S = 0.3;
const TICK_MS = 50;
export const MAX_VOICES = 150;

let engine: Engine | null = null;
let failed = false;
let unlockedOnce = false;
/** `unlockAudio` has run (a user gesture): nothing is audible before it, even where the browser allows autoplay. */
let gestureSeen = false;
const readyCallbacks = new Set<(e: Engine) => void>();
const tickers = new Set<Ticker>();
let timer: ReturnType<typeof setTimeout> | null = null;
let settingsUnsub: (() => void) | null = null;
const keepAlive = new Set<string>();
let muteSuspendTimer: ReturnType<typeof setTimeout> | null = null;
let suspendedForMute = false;

export const stats = {
  voicesActive: 0,
  voicesStarted: 0,
  voicesDropped: 0,
  nodesCreated: 0,
  ticks: 0,
  sfxPlayed: 0,
  lastSfx: '' as string,
  room: '' as string,
};

type AudioCtor = typeof AudioContext;
function audioCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export function audioSupported(): boolean {
  return !!audioCtor();
}

/** The engine if it exists (prewarmed at idle time or created by the first user gesture). */
export function getEngine(): Engine | null {
  if (!engine || engine.ctx.state === 'closed') return null;
  return engine;
}

/** Engine exists and its clock is running (safe to schedule audible events). */
export function isRunning(): boolean {
  return !!engine && engine.ctx.state === 'running';
}

export function onEngineReady(cb: (e: Engine) => void): () => void {
  readyCallbacks.add(cb);
  if (engine) {
    try {
      cb(engine);
    } catch (err) {
      console.warn('[audio] ready callback failed', err);
    }
  }
  return () => readyCallbacks.delete(cb);
}

/**
 * Build the AudioContext and bus graph ahead of the first gesture. It stays silent until `unlockAudio` (master
 * gain held at 0, and suspended if the browser started it running because autoplay is allowed).
 * Constructing a context is allowed anywhere and, in Chromium, opens the audio device (~100 ms+ on the main
 * thread): doing it at idle time keeps that cost out of the player's first click. Idempotent, never throws.
 */
export function prewarmAudio(): void {
  try {
    if (!engine && !failed) createEngine();
  } catch (err) {
    console.warn('[audio] prewarm failed', err);
  }
}

/**
 * Create (if needed) and resume the AudioContext. Call from a user gesture. Idempotent, never throws.
 */
export function unlockAudio(): void {
  try {
    const first = !gestureSeen;
    gestureSeen = true;
    if (!engine && !failed) createEngine();
    if (!engine) return;
    const ctx = engine.ctx;
    const hidden = typeof document !== 'undefined' && document.hidden;
    // the first gesture resumes even a 'running' context: the pre-gesture hold may have a suspend() in flight,
    // and a resume() queued after it wins
    if ((first || ctx.state !== 'running') && ctx.state !== 'closed' && !hidden && !suspendedForMute) {
      ctx.resume().then(syncState, () => syncState());
    }
    if (first) applySettings(useSettings.getState()); // fade the master in
    syncState();
  } catch (err) {
    console.warn('[audio] unlock failed', err);
  }
}

function syncState(): void {
  if (!engine) return;
  const st = engine.ctx.state as AudioContextState | 'interrupted';
  if (st === 'running' && gestureSeen) unlockedOnce = true;
  setAudioStatus({ contextState: st, unlocked: unlockedOnce });
}

/** Has a user gesture reached `unlockAudio` yet. */
export function gestureHeard(): boolean {
  return gestureSeen;
}

/** Before the first gesture a context the browser let start (autoplay allowed, background tab) goes back to sleep. */
function holdUntilGesture(ctx: AudioContext): void {
  if (!gestureSeen && ctx.state === 'running') ctx.suspend().then(syncState, () => undefined);
}

function gain(ctx: AudioContext, v = 1): GainNode {
  const g = ctx.createGain();
  g.gain.value = v;
  stats.nodesCreated++;
  return g;
}

function createEngine(): void {
  const Ctor = audioCtor();
  if (!Ctor) {
    failed = true;
    setAudioStatus({ supported: false });
    return;
  }
  let ctx: AudioContext;
  try {
    ctx = new Ctor({ latencyHint: 'interactive' });
  } catch (err) {
    failed = true;
    console.warn('[audio] AudioContext unavailable', err);
    setAudioStatus({ supported: false });
    return;
  }
  holdUntilGesture(ctx);

  const masterIn = gain(ctx);
  const masterVol = gain(ctx, 0);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 22;
  hp.Q.value = 0.5;
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -18;
  glue.knee.value = 14;
  glue.ratio.value = 2.5;
  glue.attack.value = 0.02;
  glue.release.value = 0.3;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.12;
  const meter = ctx.createAnalyser();
  meter.fftSize = 512;
  masterIn.connect(masterVol);
  masterVol.connect(hp);
  hp.connect(glue);
  glue.connect(limiter);
  limiter.connect(ctx.destination);
  limiter.connect(meter);
  stats.nodesCreated += 5;

  // music
  const musicIn = gain(ctx);
  const musicDuck = gain(ctx);
  const musicBus = gain(ctx, 0);
  musicIn.connect(musicDuck);
  musicDuck.connect(musicBus);
  musicBus.connect(masterIn);

  // aquarium
  const aquariumBus = gain(ctx, 0);
  aquariumBus.connect(masterIn);
  const tankBus = gain(ctx);
  const tankDistance = ctx.createBiquadFilter();
  tankDistance.type = 'lowpass';
  tankDistance.frequency.value = 16000;
  tankDistance.Q.value = 0.3;
  stats.nodesCreated++;
  const tankLevel = gain(ctx, 1);
  tankBus.connect(tankDistance);
  tankDistance.connect(tankLevel);
  tankLevel.connect(aquariumBus);
  const tankSfx = gain(ctx);
  tankSfx.connect(aquariumBus);
  const roomBus = gain(ctx);
  const roomLevel = gain(ctx, 0.6);
  roomBus.connect(roomLevel);
  roomLevel.connect(aquariumBus);

  // ui
  const uiIn = gain(ctx);
  const uiBus = gain(ctx, 0);
  uiIn.connect(uiBus);
  uiBus.connect(masterIn);

  // reverb sends
  const reverbIn = gain(ctx);
  const reverbPre = ctx.createBiquadFilter();
  reverbPre.type = 'highpass';
  reverbPre.frequency.value = 180;
  reverbPre.Q.value = 0.5;
  stats.nodesCreated++;
  reverbIn.connect(reverbPre);
  const sendMusic = gain(ctx, 0.42);
  const sendAquarium = gain(ctx, 0.12);
  const sendUi = gain(ctx, 0.22);
  musicBus.connect(sendMusic);
  aquariumBus.connect(sendAquarium);
  uiBus.connect(sendUi);
  sendMusic.connect(reverbIn);
  sendAquarium.connect(reverbIn);
  sendUi.connect(reverbIn);

  engine = {
    ctx, masterIn, masterVol, musicIn, musicDuck, musicBus, aquariumBus, tankBus, tankDistance, tankLevel, tankSfx,
    roomBus, roomLevel, uiIn, uiBus, sendMusic, sendAquarium, sendUi, reverbIn, reverbPre, meter,
  };

  ctx.onstatechange = () => {
    holdUntilGesture(ctx);
    syncState();
    // a context unlocked (or resumed) while muted should still go to sleep after the fade
    if (ctx.state === 'running') updateMuteSuspend(useSettings.getState());
  };
  applySettings(useSettings.getState(), true);
  settingsUnsub = useSettings.subscribe((s) => applySettings(s));
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
  startTimer();
  syncState();
  for (const cb of readyCallbacks) {
    try {
      cb(engine);
    } catch (err) {
      console.warn('[audio] ready callback failed', err);
    }
  }
}

// ───────────────────────────── Settings / volume ─────────────────────────────

/** Perceptual volume curve for sliders (0..1 → gain). */
export const volumeCurve = (v: number) => {
  const x = Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
  return x * x;
};

let lastVolumes = '';
export function applySettings(s: Settings, immediate = false): void {
  const e = engine;
  if (!e) return;
  const key = `${gestureSeen}|${s.muted}|${s.volume.master}|${s.volume.music}|${s.volume.aquarium}|${s.volume.ui}`;
  if (key === lastVolumes && !immediate) return;
  lastVolumes = key;
  const t = e.ctx.currentTime;
  const tau = immediate ? 0.005 : 0.08;
  const set = (p: AudioParam, v: number) => {
    p.cancelScheduledValues(t);
    p.setValueAtTime(p.value, t);
    p.setTargetAtTime(v, t, tau);
  };
  set(e.masterVol.gain, s.muted || !gestureSeen ? 0 : volumeCurve(s.volume.master));
  set(e.musicBus.gain, volumeCurve(s.volume.music));
  set(e.aquariumBus.gain, volumeCurve(s.volume.aquarium));
  set(e.uiBus.gain, volumeCurve(s.volume.ui));
  updateMuteSuspend(s);
}

/** Is a bus audible at all (skip creating voices otherwise). */
export function busAudible(bus: 'music' | 'aquarium' | 'ui'): boolean {
  const s = useSettings.getState();
  if (s.muted || s.volume.master <= 0.001) return false;
  return s.volume[bus] > 0.001;
}

/** Keep the context running even when muted (e.g. microphone analysis for party mode). */
export function setKeepAlive(reason: string, on: boolean): void {
  if (on) keepAlive.add(reason);
  else keepAlive.delete(reason);
  updateMuteSuspend(useSettings.getState());
}

function updateMuteSuspend(s: Settings): void {
  const e = engine;
  if (!e) return;
  const silent = s.muted || s.volume.master <= 0.001;
  if (muteSuspendTimer) {
    clearTimeout(muteSuspendTimer);
    muteSuspendTimer = null;
  }
  if (silent && keepAlive.size === 0) {
    // save CPU/battery: suspend after the fade-out
    muteSuspendTimer = setTimeout(() => {
      muteSuspendTimer = null;
      if (engine && engine.ctx.state === 'running') {
        suspendedForMute = true;
        engine.ctx.suspend().then(syncState, () => undefined);
      }
    }, 1500);
  } else if (suspendedForMute) {
    suspendedForMute = false;
    if (!(typeof document !== 'undefined' && document.hidden) && unlockedOnce) e.ctx.resume().then(syncState, () => undefined);
  }
}

function onVisibility(): void {
  const e = engine;
  if (!e) return;
  try {
    if (document.hidden) {
      if (e.ctx.state === 'running') e.ctx.suspend().then(syncState, () => undefined);
    } else if (unlockedOnce && !suspendedForMute) {
      e.ctx.resume().then(syncState, () => undefined);
    }
  } catch {
    /* ignore */
  }
}

// ───────────────────────────── Mix controls ─────────────────────────────

export interface MixTargets {
  tankLevel: number;
  roomLevel: number;
  distanceHz: number;
  aquariumSend: number;
  musicSend: number;
  uiSend: number;
}

let lastMix = '';
export function setMix(m: MixTargets, tau = 0.6): void {
  const e = engine;
  if (!e) return;
  const key = `${m.tankLevel}|${m.roomLevel}|${m.distanceHz}|${m.aquariumSend}|${m.musicSend}|${m.uiSend}`;
  if (key === lastMix) return; // never pile identical automation events onto the timeline
  lastMix = key;
  const t = e.ctx.currentTime;
  e.tankLevel.gain.setTargetAtTime(m.tankLevel, t, tau);
  e.roomLevel.gain.setTargetAtTime(m.roomLevel, t, tau);
  e.tankDistance.frequency.setTargetAtTime(m.distanceHz, t, tau);
  e.sendAquarium.gain.setTargetAtTime(m.aquariumSend, t, tau);
  e.sendMusic.gain.setTargetAtTime(m.musicSend, t, tau);
  e.sendUi.gain.setTargetAtTime(m.uiSend, t, tau);
}

/** Briefly lower the music so an event cue reads clearly. */
export function duckMusic(amount = 0.35, holdS = 1.2): void {
  const e = engine;
  if (!e || e.ctx.state !== 'running') return;
  const t = e.ctx.currentTime;
  const p = e.musicDuck.gain;
  p.cancelScheduledValues(t);
  p.setValueAtTime(p.value, t);
  p.setTargetAtTime(Math.max(0.2, 1 - amount), t, 0.08);
  p.setTargetAtTime(1, t + holdS, 0.7);
}

// ───────────────────────────── Reverb rooms ─────────────────────────────

interface ReverbSlot {
  conv: ConvolverNode;
  out: GainNode;
  id: string;
}
let reverbSlot: ReverbSlot | null = null;
const irCache = new Map<string, AudioBuffer>();

function impulseFor(e: Engine, room: RoomSound): AudioBuffer {
  const key = `${room.id}:${e.ctx.sampleRate}`;
  const hit = irCache.get(key);
  if (hit) return hit;
  const sr = e.ctx.sampleRate;
  const [l, r] = makeImpulse(sr, { seconds: room.reverb, preDelay: room.preDelay, damping: room.damping, early: 10, earlySpread: 0.01 + room.reverb * 0.02 }, mulberry32(0x5eed + Math.round(room.reverb * 100)));
  const buf = makeBuffer(e, [l, r]);
  irCache.set(key, buf);
  return buf;
}

/** Switch the room reverb (crossfades; no-op if unchanged). */
export function setRoom(room: RoomSound): void {
  const e = engine;
  if (!e) return;
  if (reverbSlot?.id === room.id) return;
  try {
    const conv = e.ctx.createConvolver();
    conv.buffer = impulseFor(e, room);
    const out = gain(e.ctx, 0);
    e.reverbPre.connect(conv);
    conv.connect(out);
    out.connect(e.masterIn);
    stats.nodesCreated++;
    const t = e.ctx.currentTime;
    out.gain.setTargetAtTime(1, t, 0.4);
    const old = reverbSlot;
    if (old) {
      old.out.gain.cancelScheduledValues(t);
      old.out.gain.setValueAtTime(old.out.gain.value, t);
      old.out.gain.setTargetAtTime(0, t, 0.4);
      setTimeout(() => {
        try {
          e.reverbPre.disconnect(old.conv);
          old.conv.disconnect();
          old.out.disconnect();
        } catch {
          /* already gone */
        }
      }, 3000);
    }
    reverbSlot = { conv, out, id: room.id };
    stats.room = room.id;
  } catch (err) {
    console.warn('[audio] reverb setup failed', err);
  }
}

// ───────────────────────────── Scheduler ─────────────────────────────

export function addTicker(fn: Ticker): () => void {
  tickers.add(fn);
  return () => tickers.delete(fn);
}

function startTimer(): void {
  if (timer) return;
  const loop = () => {
    timer = setTimeout(loop, TICK_MS);
    const e = engine;
    if (!e || e.ctx.state !== 'running') return;
    stats.ticks++;
    const now = e.ctx.currentTime;
    const horizon = now + LOOKAHEAD_S;
    for (const t of tickers) {
      try {
        t(now, horizon);
      } catch (err) {
        console.warn('[audio] scheduler tick failed', err);
      }
    }
  };
  timer = setTimeout(loop, TICK_MS);
}

// ───────────────────────────── Voices ─────────────────────────────

/** Priority 0 = essential (UI feedback), 1 = normal, 2 = decorative (bubbles, hover). */
export function canStartVoice(priority: 0 | 1 | 2 = 1): boolean {
  const limit = priority === 0 ? MAX_VOICES + 30 : priority === 1 ? MAX_VOICES : MAX_VOICES * 0.6;
  if (stats.voicesActive >= limit) {
    stats.voicesDropped++;
    return false;
  }
  return true;
}

/** Register a one-shot source: when it ends, every node in `nodes` is disconnected (GC-friendly). */
export function trackVoice(src: AudioScheduledSourceNode, nodes: AudioNode[]): void {
  stats.voicesActive++;
  stats.voicesStarted++;
  stats.nodesCreated += nodes.length + 1;
  let done = false;
  src.onended = () => {
    if (done) return;
    done = true;
    stats.voicesActive = Math.max(0, stats.voicesActive - 1);
    try {
      src.disconnect();
    } catch {
      /* ignore */
    }
    for (const n of nodes) {
      try {
        n.disconnect();
      } catch {
        /* ignore */
      }
    }
  };
}

// ───────────────────────────── Buffers ─────────────────────────────

/** Wrap generated channel data in an AudioBuffer. */
export function makeBuffer(e: Engine, channels: Float32Array[]): AudioBuffer {
  const len = Math.max(1, channels[0]?.length ?? 1);
  const buf = e.ctx.createBuffer(channels.length, len, e.ctx.sampleRate);
  channels.forEach((c, i) => buf.getChannelData(i).set(c));
  return buf;
}

const noiseCache = new Map<string, AudioBuffer>();
export type NoiseKind = 'white' | 'pink' | 'brown';

export function noiseBuffer(e: Engine, kind: NoiseKind): AudioBuffer {
  const hit = noiseCache.get(kind);
  if (hit) return hit;
  const sr = e.ctx.sampleRate;
  const seconds = kind === 'white' ? 3 : 6;
  const data = new Float32Array(Math.floor(sr * seconds));
  const rnd = mulberry32(kind === 'white' ? 11 : kind === 'pink' ? 22 : 33);
  if (kind === 'white') fillWhite(data, rnd, 0.9);
  else if (kind === 'pink') fillPink(data, rnd, sr);
  else fillBrown(data, rnd);
  const buf = makeBuffer(e, [data]);
  noiseCache.set(kind, buf);
  return buf;
}

const pluckCache = new Map<string, AudioBuffer>();
export function pluckBuffer(e: Engine, kind: PluckKind, midi: number): AudioBuffer {
  const m = Math.round(midi);
  const key = `${kind}:${m}`;
  const hit = pluckCache.get(key);
  if (hit) return hit;
  const sr = e.ctx.sampleRate;
  const f = midiToFreq(m);
  const seconds = kind === 'glass' ? 4.2 : kind === 'felt' ? Math.min(3.4, Math.max(1.4, 3.6 - (m - 48) * 0.05)) : 2.2;
  const data = renderPluck(sr, f, seconds, kind, mulberry32(m * 131 + kind.length));
  const buf = makeBuffer(e, [data]);
  pluckCache.set(key, buf);
  return buf;
}

const trickleCache: AudioBuffer[] = [];
export function trickleBuffer(e: Engine, i: 0 | 1): AudioBuffer {
  if (trickleCache[i]) return trickleCache[i];
  const sr = e.ctx.sampleRate;
  const data = renderTrickle(sr, i === 0 ? 6.3 : 4.7, mulberry32(1234 + i * 77));
  const buf = makeBuffer(e, [data]);
  trickleCache[i] = buf;
  return buf;
}

let warm: PeriodicWave | null = null;
/** Soft saw-like wave (harmonics roll off faster than a saw) — warmer pads, less aliasing. */
export function warmWave(e: Engine): PeriodicWave {
  if (warm) return warm;
  const n = 28;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) imag[k] = (1 / Math.pow(k, 1.35)) * (k % 2 === 0 ? 0.8 : 1);
  warm = e.ctx.createPeriodicWave(real, imag);
  return warm;
}

let reed: PeriodicWave | null = null;
/** Hollow square-ish wave for the party arp (odd harmonics, softened). */
export function reedWave(e: Engine): PeriodicWave {
  if (reed) return reed;
  const n = 20;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) imag[k] = k % 2 === 1 ? 1 / Math.pow(k, 1.2) : 0.12 / k;
  reed = e.ctx.createPeriodicWave(real, imag);
  return reed;
}

/** Looping noise source starting at a random offset (decorrelates multiple consumers). */
export function loopNoise(e: Engine, kind: NoiseKind, offsetSeed = Math.random()): AudioBufferSourceNode {
  const src = e.ctx.createBufferSource();
  src.buffer = noiseBuffer(e, kind);
  src.loop = true;
  stats.nodesCreated++;
  src.start(e.ctx.currentTime, (offsetSeed % 1) * (src.buffer.duration - 0.1));
  return src;
}

/** Peak/RMS of the master output right now (debug/QA). */
export function meterReading(): { rms: number; peak: number } {
  const e = engine;
  if (!e) return { rms: 0, peak: 0 };
  const d = new Float32Array(e.meter.fftSize);
  e.meter.getFloatTimeDomainData(d);
  let s = 0;
  let p = 0;
  for (let i = 0; i < d.length; i++) {
    s += d[i] * d[i];
    p = Math.max(p, Math.abs(d[i]));
  }
  return { rms: Math.sqrt(s / d.length), peak: p };
}

export function engineInfo() {
  const e = engine;
  return {
    supported: audioSupported(),
    created: !!e,
    state: e ? e.ctx.state : 'none',
    unlocked: unlockedOnce,
    sampleRate: e?.ctx.sampleRate ?? 0,
    baseLatency: e?.ctx.baseLatency ?? 0,
    time: e ? +e.ctx.currentTime.toFixed(2) : 0,
    suspendedForMute,
    keepAlive: [...keepAlive],
    buses: e
      ? {
          master: +e.masterVol.gain.value.toFixed(3),
          music: +e.musicBus.gain.value.toFixed(3),
          aquarium: +e.aquariumBus.gain.value.toFixed(3),
          ui: +e.uiBus.gain.value.toFixed(3),
          duck: +e.musicDuck.gain.value.toFixed(3),
          tankLevel: +e.tankLevel.gain.value.toFixed(3),
          roomLevel: +e.roomLevel.gain.value.toFixed(3),
          distanceHz: Math.round(e.tankDistance.frequency.value),
        }
      : null,
    cachedBuffers: { noise: noiseCache.size, pluck: pluckCache.size, trickle: trickleCache.filter(Boolean).length, ir: irCache.size },
    tickers: tickers.size,
    stats: { ...stats },
  };
}

/** Test/dev only: tear everything down. */
export function destroyEngine(): void {
  if (!engine) return;
  try {
    settingsUnsub?.();
    settingsUnsub = null;
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
    if (timer) clearTimeout(timer);
    timer = null;
    void engine.ctx.close();
  } catch {
    /* ignore */
  }
  engine = null;
  reverbSlot = null;
  lastVolumes = '';
  lastMix = '';
  noiseCache.clear();
  pluckCache.clear();
  trickleCache.length = 0;
  irCache.clear();
  warm = null;
  reed = null;
}
