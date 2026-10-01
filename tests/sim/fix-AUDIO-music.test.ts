import { describe, it, expect } from 'vitest';
import { Music } from '@/audio/music';
import type { Engine } from '@/audio/engine';
import { moodSwitchDue, type MoodSwitchInputs } from '@/audio/soundscape';
import type { MusicMood } from '@/audio/theory';

/**
 * Minimal stand-in for the Web Audio graph: every `create*` returns a node whose unknown properties are no-op
 * AudioParams. Enough to drive Music/MoodLayer bookkeeping (what is built, faded, revived, disposed) in node.
 */
function fakeParam() {
  const p: Record<string, unknown> = { value: 0 };
  for (const k of ['setValueAtTime', 'linearRampToValueAtTime', 'exponentialRampToValueAtTime', 'setTargetAtTime', 'cancelScheduledValues', 'cancelAndHoldAtTime', 'setValueCurveAtTime']) p[k] = () => p;
  return p;
}
function fakeNode(): unknown {
  const own: Record<string | symbol, unknown> = { connect: (d: unknown) => d, disconnect() {}, start() {}, stop() {}, setPeriodicWave() {}, addEventListener() {}, removeEventListener() {} };
  return new Proxy(own, {
    get: (t, k) => (k in t ? t[k] : typeof k === 'string' ? (t[k] = fakeParam()) : undefined),
    set: (t, k, v) => ((t[k] = v), true),
  });
}
function fakeEngine() {
  const ctx = {
    state: 'running' as AudioContextState,
    currentTime: 0,
    sampleRate: 8000,
    destination: fakeNode(),
    createBuffer: (ch: number, len: number, sr: number) => ({ numberOfChannels: ch, length: len, sampleRate: sr, duration: len / sr, getChannelData: () => new Float32Array(len), copyToChannel() {} }),
    createPeriodicWave: () => ({}),
  };
  const ctxProxy = new Proxy(ctx as Record<string, unknown>, { get: (t, k) => (k in t ? t[k as string] : typeof k === 'string' && k.startsWith('create') ? () => fakeNode() : undefined) });
  const e = new Proxy({ ctx: ctxProxy } as Record<string, unknown>, { get: (t, k) => (k in t ? t[k as string] : (t[k as string] = fakeNode())) });
  return { e: e as unknown as Engine, ctx };
}

type Layers = { mood: MusicMood; fading: boolean }[];
const tick = (m: Music, now: number) => (m as unknown as { tick(now: number, horizon: number): void }).tick(now, now + 0.3);
const layers = (m: Music): Layers => m.info().layers as Layers;

describe('fix AUDIO — Music layers (R09-03: S15-04 muted-session leak, deferred rebuild, revive)', () => {
  it('drops layers instead of queueing them while the context is suspended, and rebuilds one on resume', () => {
    const { e, ctx } = fakeEngine();
    const m = new Music(e);
    m.setMood('tank');
    expect(layers(m)).toEqual([{ mood: 'tank', fading: false }]);
    ctx.state = 'suspended'; // muted → the engine suspends after the fade
    const cycle: MusicMood[] = ['night', 'tank', 'facility', 'market', 'title'];
    for (let i = 0; i < 20; i++) {
      m.setMood(cycle[i % cycle.length]);
      expect(layers(m).length).toBeLessThanOrEqual(1);
    }
    m.setMood('night');
    expect(layers(m)).toEqual([]);
    // unmuted: the clock runs again and the next tick builds exactly the wanted score
    ctx.state = 'running';
    ctx.currentTime = 1;
    tick(m, 1);
    tick(m, 1.05);
    expect(layers(m)).toEqual([{ mood: 'night', fading: false }]);
    m.dispose();
  });

  it('revives a recently faded layer for a quick flick back instead of building a second one', () => {
    const { e, ctx } = fakeEngine();
    const m = new Music(e);
    m.setMood('tank');
    ctx.currentTime = 2;
    m.setMood('market');
    expect(layers(m)).toEqual([{ mood: 'tank', fading: true }, { mood: 'market', fading: false }]);
    ctx.currentTime = 4;
    m.setMood('tank');
    expect(layers(m)).toEqual([{ mood: 'tank', fading: false }, { mood: 'market', fading: true }]);
    // long after the fade the market layer is disposed by the ticker
    ctx.currentTime = 30;
    tick(m, 30);
    expect(layers(m)).toEqual([{ mood: 'tank', fading: false }]);
    m.dispose();
  });

  it("'off' (music bus at 0) fades everything out and never rebuilds", () => {
    const { e, ctx } = fakeEngine();
    const m = new Music(e);
    m.setMood('facility');
    ctx.currentTime = 1;
    m.setMood('off');
    expect(layers(m)).toEqual([{ mood: 'facility', fading: true }]);
    for (const t of [2, 5, 20, 40]) tick(m, t);
    expect(layers(m)).toEqual([]);
    m.dispose();
  });
});

describe('fix AUDIO — moodSwitchDue (R09-03: debounce, panel debounce, dwell)', () => {
  const base: MoodSwitchInputs = { want: 'night', applied: 'tank', forced: false, screenChanged: false, view: 'tank', appliedView: 'tank', sincePendingMs: 0, sinceAppliedMs: 60000 };
  const cases: [string, Partial<MoodSwitchInputs>, boolean][] = [
    ['same mood: nothing to do', { want: 'tank' }, false],
    ['first score plays at once', { applied: null, sincePendingMs: 0 }, true],
    ['score after off plays at once', { applied: 'off', sincePendingMs: 0 }, true],
    ['screen change switches at once', { screenChanged: true }, true],
    ['party in and out at once', { want: 'party' }, true],
    ['party out at once', { applied: 'party' }, true],
    ['forced mood at once', { forced: true }, true],
    ['day→night waits out the 1.5 s debounce', { sincePendingMs: 1400 }, false],
    ['day→night after the debounce', { sincePendingMs: 1600 }, true],
    ['day→night inside the 12 s dwell of the same view waits', { sincePendingMs: 5000, sinceAppliedMs: 8000 }, false],
    ['a view switch skips the dwell', { want: 'facility', view: 'facility', sincePendingMs: 1600, sinceAppliedMs: 2000 }, true],
    ['a market glance under 3 s is ignored', { want: 'market', sincePendingMs: 2500, sinceAppliedMs: 1000 }, false],
    ['a market visit past 3 s switches despite the dwell', { want: 'market', sincePendingMs: 3100, sinceAppliedMs: 1000 }, true],
    ['leaving the market also uses the panel debounce', { applied: 'market', want: 'tank', sincePendingMs: 2000 }, false],
    ['music bus to 0 goes off after the debounce, dwell or not', { want: 'off', sincePendingMs: 1600, sinceAppliedMs: 1000 }, true],
  ];
  for (const [name, patch, due] of cases) it(name, () => expect(moodSwitchDue({ ...base, ...patch })).toBe(due));
});
