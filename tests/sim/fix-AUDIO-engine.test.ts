import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

/** A context the browser lets run at construction (autoplay allowed), recording suspend/resume calls. */
class FakeContext {
  static last: FakeContext | null = null;
  state: AudioContextState = 'running';
  currentTime = 0;
  sampleRate = 8000;
  baseLatency = 0;
  destination = {};
  onstatechange: (() => void) | null = null;
  calls: string[] = [];
  masterTargets: number[] = [];
  private nodes = 0;
  constructor() {
    FakeContext.last = this;
  }
  private set(st: AudioContextState) {
    return Promise.resolve().then(() => {
      if (this.state === st) return;
      this.state = st;
      this.onstatechange?.();
    });
  }
  suspend() {
    this.calls.push('suspend');
    return this.set('suspended');
  }
  resume() {
    this.calls.push('resume');
    return this.set('running');
  }
  close() {
    return this.set('closed');
  }
  private node() {
    const index = this.nodes++;
    const param = () => {
      const p = { value: 0, cancelScheduledValues: () => p, setValueAtTime: () => p, setTargetAtTime: (v: number) => (index === 1 && this.masterTargets.push(v), p) };
      return p;
    };
    return { connect() {}, disconnect() {}, gain: param(), frequency: param(), Q: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), fftSize: 0 };
  }
  createGain = () => this.node(); // the second node built is the master volume
  createBiquadFilter = () => this.node();
  createDynamicsCompressor = () => this.node();
  createAnalyser = () => this.node();
}

const flush = () => new Promise((r) => setTimeout(r, 0));
type EngineModule = typeof import('@/audio/engine');
let eng: EngineModule;

beforeAll(async () => {
  (globalThis as unknown as { window: unknown }).window = { AudioContext: FakeContext };
  eng = await import('@/audio/engine');
});
afterAll(() => {
  eng.destroyEngine();
  delete (globalThis as unknown as { window?: unknown }).window;
});

describe('fix AUDIO — no sound before the first gesture (R09-02)', () => {
  it('the idle prewarm keeps an autoplay-allowed context silent and suspended', async () => {
    eng.prewarmAudio();
    const ctx = FakeContext.last!;
    expect(ctx).toBeTruthy();
    expect(ctx.calls).toEqual(['suspend']);
    expect(ctx.masterTargets.every((v) => v === 0)).toBe(true);
    await flush();
    expect(ctx.state).toBe('suspended');
    expect(eng.engineInfo().unlocked).toBe(false);
    expect(eng.gestureHeard()).toBe(false);
  });

  it('a context that starts running on its own goes back to sleep until the gesture', async () => {
    const ctx = FakeContext.last!;
    await ctx.resume(); // e.g. the browser resumed it
    await flush();
    expect(ctx.state).toBe('suspended');
    expect(eng.engineInfo().unlocked).toBe(false);
  });

  it('the first gesture resumes it and fades the master in', async () => {
    const ctx = FakeContext.last!;
    eng.unlockAudio();
    expect(eng.gestureHeard()).toBe(true);
    await flush();
    expect(ctx.state).toBe('running');
    expect(eng.engineInfo().unlocked).toBe(true);
    expect(ctx.masterTargets[ctx.masterTargets.length - 1]).toBeGreaterThan(0);
  });

  it('a gesture that lands while the pre-gesture suspend is still in flight ends up running', async () => {
    eng.destroyEngine();
    vi.resetModules();
    eng = await import('@/audio/engine');
    eng.prewarmAudio();
    const ctx = FakeContext.last!;
    expect(ctx.state).toBe('running'); // suspend() not settled yet
    eng.unlockAudio();
    await flush();
    expect(ctx.calls).toEqual(['suspend', 'resume']);
    expect(ctx.state).toBe('running');
    expect(eng.engineInfo().unlocked).toBe(true);
  });
});
