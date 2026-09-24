/** lane:pc-perf — pixel budget, adaptive render scale and GPU classification. */
import { describe, expect, it } from 'vitest';
import { budgetDpr, ScaleController, SCALE_MIN, type ScaleDecision } from './resolution';
import { classifyRenderer } from './gpuTier';
import { QUALITY } from './quality';

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
