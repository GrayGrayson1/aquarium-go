/** lane:pc-perf — pixel budget, adaptive render scale and GPU classification. */
import { describe, expect, it } from 'vitest';
import { budgetDpr, LatenessProbe, ScaleController, SCALE_MIN, type ScaleDecision } from './resolution';
import { classifyRenderer } from './gpuTier';
import { QUALITY } from './quality';

/** Feed slow frames at the floor until the controller asks for the feature drop. */
function runToDrop(c: ScaleController): boolean {
  for (let t = 0; t < 60_000; t += 45) if (c.frame(45)?.kind === 'drop') return true;
  return false;
}

/** Feed `seconds` of frames at `ms` each; returns every decision. */
function run(c: ScaleController, ms: number, seconds: number): ScaleDecision[] {
  const out: ScaleDecision[] = [];
  for (let t = 0; t < seconds * 1000; t += ms) {
    const d = c.frame(ms);
    if (d) out.push(d);
  }
  return out;
}

describe('pixel budget', () => {
  it('leaves normal screens exactly as before', () => {
    const H = QUALITY.high;
    expect(budgetDpr(1, H.dpr, H.maxMP, 1920, 1080)).toBe(1); // 1080p desktop
    expect(budgetDpr(2, H.dpr, H.maxMP, 1440, 900)).toBe(1.6); // Retina laptop
    expect(budgetDpr(1.25, H.dpr, H.maxMP, 1536, 864)).toBe(1.25); // 1080p at 125 %
  });

  it('caps 4K screens to the tier budget', () => {
    for (const [w, h, dpr] of [
      [3840, 2160, 1],
      [2560, 1440, 1.5],
      [2194, 1234, 1.75],
      [1920, 1080, 2],
    ] as const) {
      for (const q of ['low', 'medium', 'high'] as const) {
        const B = QUALITY[q];
        const d = budgetDpr(dpr, B.dpr, B.maxMP, w, h);
        expect((w * d * h * d) / 1e6).toBeLessThanOrEqual(B.maxMP * 1.03);
        expect(d).toBeGreaterThanOrEqual(0.5);
      }
    }
    // Ultra keeps a 4K screen at full resolution
    expect(budgetDpr(1, QUALITY.ultra.dpr, QUALITY.ultra.maxMP, 3840, 2160)).toBe(1);
  });

  it('applies the adaptive scale and never goes below the floor', () => {
    const H = QUALITY.high;
    expect(budgetDpr(1, H.dpr, H.maxMP, 1920, 1080, 0.8)).toBe(0.8);
    expect(budgetDpr(1, H.dpr, H.maxMP, 3840, 2160, 0.1)).toBeGreaterThanOrEqual(0.4);
  });
});

describe('ScaleController', () => {
  it('stays put when frames are on time (and never probes above 1)', () => {
    const c = new ScaleController(1);
    const d = run(c, 16.7, 30).filter((x) => x?.kind === 'scale');
    expect(d).toHaveLength(0);
    expect(c.scale).toBe(1);
  });

  it('steps down while slow (GPU-bound: each step helps) and stops at the floor', () => {
    const c = new ScaleController(1);
    // frame time ∝ pixels ∝ scale²: 40 ms at full scale
    for (let i = 0; i < 40; i++) {
      const ms = 40 * c.scale * c.scale;
      for (let k = 0; k < 1000 / ms + 1; k++) c.frame(ms);
    }
    expect(c.scale).toBeLessThan(0.7);
    expect(c.scale).toBeGreaterThanOrEqual(SCALE_MIN);
  });

  it('reverts a step down that did not help (CPU-bound) instead of blurring for nothing', () => {
    const c = new ScaleController(1);
    const d = run(c, 30, 8).filter((x) => x?.kind === 'scale');
    expect(d[0]).toMatchObject({ reason: 'down' });
    expect(d[1]).toMatchObject({ reason: 'revert', scale: 1 });
    // and holds off for a while (no immediate retry)
    expect(run(c, 30, 10).filter((x) => x?.kind === 'scale')).toHaveLength(0);
  });

  it('never lowers resolution when the main thread is the bottleneck', () => {
    const c = new ScaleController(1);
    const out: ScaleDecision[] = [];
    for (let i = 0; i < 20 * 30; i++) out.push(c.frame(33, 28)); // 28 of 33 ms are main-thread work
    expect(out.filter((x) => x?.kind === 'scale')).toHaveLength(0);
    expect(c.scale).toBe(1);
  });

  it('probes back up with back-off after load goes away', () => {
    const c = new ScaleController(0.7);
    const ups = run(c, 16.7, 20).filter((x) => x?.kind === 'scale');
    expect(ups.length).toBeGreaterThan(0);
    expect(c.scale).toBe(1);
  });

  it('asks for a feature drop only once, and only at the floor', () => {
    const c = new ScaleController(SCALE_MIN);
    const drops = run(c, 45, 60).filter((x) => x?.kind === 'drop');
    expect(drops).toHaveLength(1);
  });

  // lane:tankrender — a drop forced by a passing burst must not be remembered; one that fixed the frame rate is
  it('confirms a drop only once the frames after it are on time', () => {
    const c = new ScaleController(SCALE_MIN);
    expect(runToDrop(c)).toBe(true);
    // the tier change hands the verdict to a fresh controller
    const c2 = new ScaleController(1);
    c2.carryOver(c);
    expect(run(c2, 16.7, 2).filter((x) => x?.kind === 'drop_helped')).toHaveLength(0);
    expect(run(c2, 16.7, 4).filter((x) => x?.kind === 'drop_helped')).toHaveLength(1);
    // once only, and never a second drop this session
    expect(run(c2, 16.7, 10).filter((x) => x?.kind === 'drop_helped')).toHaveLength(0);
    expect(run(c2, 45, 60).filter((x) => x?.kind === 'drop')).toHaveLength(0);
  });

  it('writes a drop off when frames stay slow afterwards (the machine was just struggling)', () => {
    const c = new ScaleController(SCALE_MIN);
    expect(runToDrop(c)).toBe(true);
    const c2 = new ScaleController(1);
    c2.carryOver(c);
    run(c2, 30, 5);
    expect(run(c2, 16.7, 20).filter((x) => x?.kind === 'drop_helped')).toHaveLength(0);
  });

  it('does not credit the resolution for a faster window that was mostly main-thread work', () => {
    const c = new ScaleController(1);
    // slow and GPU-looking for a second: steps down
    const out: ScaleDecision[] = [];
    for (let i = 0; i < 25; i++) out.push(c.frame(40, 3));
    expect(out.filter((x) => x?.kind === 'scale')[0]).toMatchObject({ reason: 'down' });
    // settle window, then a verify window that is faster but CPU-bound (a UI burst tailing off): reverted
    for (let i = 0; i < 25; i++) out.push(c.frame(40, 3));
    for (let i = 0; i < 28; i++) out.push(c.frame(36, 6, 24));
    const d = out.filter((x) => x?.kind === 'scale');
    expect(d[1]).toMatchObject({ reason: 'revert', scale: 1 });
  });

  it('treats a window of main-thread bursts as CPU-bound even when the bursts land in hitch frames', () => {
    const c = new ScaleController(1);
    const out: ScaleDecision[] = [];
    // an 80 ms burst every 100 ms: the frame after each burst is a >100 ms hitch, and the probe reports the burst's
    // time with the short frame that follows it
    for (let s = 0; s < 30; s++) for (let k = 0; k < 10; k++) out.push(c.frame(k % 2 ? 104 : 30, 6, k % 2 ? 0 : 80));
    expect(out.filter((x) => x?.kind === 'scale')).toHaveLength(0);
    expect(c.scale).toBe(1);
  });

  it('ignores hitches (long frames) when judging throughput', () => {
    const c = new ScaleController(1);
    const out: ScaleDecision[] = [];
    for (let s = 0; s < 20; s++) {
      for (let i = 0; i < 55; i++) out.push(c.frame(16.7));
      out.push(c.frame(400)); // a GC / sim hitch once a second
    }
    expect(out.filter((x) => x?.kind === 'scale')).toHaveLength(0);
  });
});

describe('LatenessProbe', () => {
  it('counts nothing for timers that fire on time', () => {
    const p = new LatenessProbe();
    p.tick(100, 8, 108.4);
    expect(p.take()).toBe(0);
  });
  it('counts the lateness caused by work outside the frame loop', () => {
    const p = new LatenessProbe();
    p.tick(100, 8, 140);
    expect(p.take()).toBeCloseTo(32);
    expect(p.take()).toBe(0);
  });
  it('subtracts the frame loop spans it overlapped, so a GPU-heavy frame adds nothing', () => {
    const p = new LatenessProbe();
    p.frame(102, 130); // a 28 ms render submission inside the probe interval
    p.tick(100, 8, 131);
    expect(p.take()).toBe(0);
    p.frame(140, 150);
    // 10 ms of frame + 15 ms of something else
    p.tick(135, 8, 168);
    expect(p.take()).toBeCloseTo(15);
  });
  it('forgets everything on reset', () => {
    const p = new LatenessProbe();
    p.tick(0, 8, 50);
    p.reset();
    expect(p.take()).toBe(0);
  });
  // R05-02 — WebKit fires every 8 ms timer ~4 ms late, Firefox ~2 ms, even on an idle page (and the odd one on time)
  const idle = (p: LatenessProbe, lateMs: number, fromMs: number, toMs: number) => {
    let t = fromMs;
    for (let i = 0; t < toMs; i++) {
      const late = i % 16 === 0 ? 0 : lateMs;
      p.tick(t, 8, t + 8 + late);
      t += 8 + late;
    }
    return t;
  };
  it('learns a constant platform timer delay and stops counting it', () => {
    const p = new LatenessProbe();
    const t = idle(p, 4, 0, 3000);
    p.take();
    expect(p.floor).toBeCloseTo(4);
    idle(p, 4, t, t + 1000);
    expect(p.take()).toBe(0);
  });
  it('still counts a real block on top of the platform delay', () => {
    const p = new LatenessProbe();
    const t = idle(p, 4, 0, 3000);
    p.take();
    p.tick(t, 8, t + 8 + 4 + 40);
    expect(p.take()).toBeCloseTo(40);
  });
  it('keeps the floor low when any recent window had on-time timers, and caps it', () => {
    const p = new LatenessProbe();
    let t = idle(p, 0.2, 0, 1100);
    t = idle(p, 20, t, 4000); // seconds of sustained outside work must not become "platform delay"
    p.take();
    expect(p.floor).toBeLessThan(0.5);
    const q = new LatenessProbe();
    idle(q, 20, 0, 4000);
    q.take();
    expect(q.floor).toBe(6);
  });
  it("leaves the browser's rendering update after each frame out, up to its usual length", () => {
    const p = new LatenessProbe();
    // 20 ms frames: 8 ms of frame loop, then 6 ms of compositing / WebGL present before the next task runs
    let ext = 0;
    for (let f = 0; f < 40; f++) {
      const t0 = f * 20;
      ext += p.take(); // the governor takes once a frame
      p.frame(t0, t0 + 8);
      p.frameDone(t0 + 8, t0 + 14);
      p.tick(t0 + 2, 8, t0 + 14); // due mid-frame, held back by the frame and the rendering update
    }
    expect(p.post).toBeCloseTo(6);
    expect(ext + p.take()).toBe(0);
    // a 30 ms React commit queued behind a frame is still outside work, beyond the usual 6 ms (most of it: the overlap
    // correction is coarse)
    p.frame(1000, 1008);
    p.frameDone(1008, 1044);
    p.tick(1002, 8, 1044);
    expect(p.take()).toBeGreaterThan(20);
  });
});

describe('GPU classification', () => {
  const cases: [string, string, string][] = [
    ['ANGLE (Intel, Intel(R) UHD Graphics 620 (0x00003EA0) Direct3D11 vs_5_0 ps_5_0, D3D11)', 'integrated', 'medium'],
    ['ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11)', 'integrated', 'medium'],
    ['ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001638) Direct3D11 vs_5_0 ps_5_0, D3D11)', 'integrated', 'medium'],
    ['ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)', 'discrete', 'high'],
    ['ANGLE (NVIDIA, NVIDIA GeForce MX450 (0x00001F9D) Direct3D11 vs_5_0 ps_5_0, D3D11)', 'discrete', 'medium'],
    ['ANGLE (AMD, AMD Radeon RX 6700 XT (0x000073DF) Direct3D11 vs_5_0 ps_5_0, D3D11)', 'discrete', 'high'],
    ['ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics (0x000056A0) Direct3D11 vs_5_0 ps_5_0, D3D11)', 'discrete', 'high'],
    ['ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro, Unspecified Version)', 'apple', 'high'],
    ['ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)', 'software', 'low'],
    ['ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)', 'software', 'low'],
    ['llvmpipe (LLVM 15.0.7, 256 bits)', 'software', 'low'],
    ['Adreno (TM) 740', 'integrated', 'medium'],
    ['', 'unknown', 'high'],
  ];
  it.each(cases)('%s', (r, cls, tier) => {
    expect(classifyRenderer(r)).toEqual({ cls, tier });
  });
  it('treats a context with a major performance caveat as software', () => {
    expect(classifyRenderer('ANGLE (NVIDIA, NVIDIA GeForce GTX 1060)', { caveat: true }).tier).toBe('low');
  });
  it('keeps the old small-device rule for unknown GPUs', () => {
    expect(classifyRenderer('Some GPU', { cores: 4 }).tier).toBe('medium');
    expect(classifyRenderer('Some GPU', { coarse: true }).tier).toBe('medium');
  });
});
