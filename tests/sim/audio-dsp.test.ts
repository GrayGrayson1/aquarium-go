import { describe, it, expect } from 'vitest';
import { fillBrown, fillPink, fillWhite, makeImpulse, makeLoopable, midiToFreq, mulberry32, renderPluck, renderTrickle } from '@/audio/dsp';
import { MOODS, MelodyGen, nextChord, scaleNotes } from '@/audio/theory';
import { chooseMood, equipmentSound, tankSoundProfile, visitorPresence } from '@/audio/soundscape';
import type { EquipmentInstance, Tank, GameState } from '@/types';

const SR = 48000;

/** Autocorrelation pitch estimate over a window. */
function pitchOf(x: Float32Array, start: number, len: number, fMin = 60, fMax = 2000): number {
  let best = 0;
  let bestLag = 0;
  for (let lag = Math.floor(SR / fMax); lag <= Math.ceil(SR / fMin); lag++) {
    let s = 0;
    for (let i = 0; i < len; i++) s += x[start + i] * x[start + i + lag];
    if (s > best) {
      best = s;
      bestLag = lag;
    }
  }
  // parabolic interpolation around the peak
  const ac = (lag: number) => {
    let s = 0;
    for (let i = 0; i < len; i++) s += x[start + i] * x[start + i + lag];
    return s;
  };
  const a = ac(bestLag - 1);
  const b = ac(bestLag);
  const c = ac(bestLag + 1);
  const shift = (a - c) / (2 * (a - 2 * b + c));
  return SR / (bestLag + (Number.isFinite(shift) ? shift : 0));
}

function goertzel(x: Float32Array, start: number, len: number, hz: number): number {
  const w = (2 * Math.PI * hz) / SR;
  const c = 2 * Math.cos(w);
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < len; i++) {
    const s0 = x[start + i] + c * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return s1 * s1 + s2 * s2 - c * s1 * s2;
}

describe('audio dsp — generators', () => {
  it('noise generators are bounded, finite and roughly zero-mean', () => {
    for (const fill of [fillWhite, fillPink, fillBrown]) {
      const b = fill(new Float32Array(SR), mulberry32(3));
      let mean = 0;
      let peak = 0;
      for (const v of b) {
        expect(Number.isFinite(v)).toBe(true);
        mean += v;
        peak = Math.max(peak, Math.abs(v));
      }
      expect(peak).toBeLessThanOrEqual(1);
      expect(Math.abs(mean / b.length)).toBeLessThan(0.05);
    }
  });

  it('Karplus–Strong felt piano is in tune (±0.6%)', () => {
    for (const midi of [48, 57, 64, 72, 81]) {
      const f = midiToFreq(midi);
      const x = renderPluck(SR, f, 0.8, 'felt', mulberry32(midi));
      const est = pitchOf(x, Math.floor(SR * 0.1), 2400);
      expect(Math.abs(est / f - 1)).toBeLessThan(0.006);
    }
  });

  it('kalimba and glass voices are in tune and decay', () => {
    for (const kind of ['kalimba', 'glass'] as const) {
      const f = midiToFreq(76);
      const x = renderPluck(SR, f, 1.5, kind, mulberry32(9));
      // bells are inharmonic → check the fundamental dominates its semitone neighbours (Goertzel)
      const at = (hz: number) => goertzel(x, Math.floor(SR * 0.05), Math.floor(SR * 0.5), hz);
      expect(at(f)).toBeGreaterThan(at(f * 1.06) * 20);
      expect(at(f)).toBeGreaterThan(at(f / 1.06) * 20);
      const e = (a: number, b: number) => {
        let s = 0;
        for (let i = a; i < b; i++) s += x[i] * x[i];
        return s;
      };
      expect(e(Math.floor(SR * 1.2), Math.floor(SR * 1.3))).toBeLessThan(e(Math.floor(SR * 0.05), Math.floor(SR * 0.15)));
    }
  });

  it('impulse responses decay by ≥40 dB over their length', () => {
    const [l, r] = makeImpulse(SR, { seconds: 1.5, preDelay: 0.02, damping: 0.5, early: 10, earlySpread: 0.04 }, mulberry32(1));
    expect(l.length).toBe(r.length);
    const energy = (a: number, b: number) => {
      let s = 0;
      for (let i = a; i < b; i++) s += l[i] * l[i];
      return s / (b - a);
    };
    const head = energy(Math.floor(SR * 0.03), Math.floor(SR * 0.13));
    const tail = energy(l.length - Math.floor(SR * 0.1), l.length);
    expect(10 * Math.log10(head / tail)).toBeGreaterThan(40);
  });

  it('trickle loops are loopable and bounded', () => {
    const t = renderTrickle(SR, 2, mulberry32(4));
    expect(t.length).toBeLessThan(SR * 2);
    let peak = 0;
    for (const v of t) peak = Math.max(peak, Math.abs(v));
    expect(peak).toBeLessThanOrEqual(0.81);
    // loop seam is continuous: last→first sample jump is small relative to peak
    expect(Math.abs(t[t.length - 1] - t[0])).toBeLessThan(0.3);
    const lp = makeLoopable(new Float32Array(100).fill(1), 10);
    expect(lp.length).toBe(90);
  });
});

describe('audio theory — generative rules', () => {
  it('melody stays in range and in scale', () => {
    for (const cfg of Object.values(MOODS)) {
      const rnd = mulberry32(12);
      const gen = new MelodyGen(cfg, rnd);
      const allowed = new Set(scaleNotes(cfg.key, cfg.scale, cfg.melodyRange[0], cfg.melodyRange[1]));
      let chord = nextChord(cfg, null, rnd);
      let notes = 0;
      for (let step = 0; step < 800; step++) {
        if (step % 16 === 0) chord = nextChord(cfg, chord, rnd);
        const n = gen.step(step, chord);
        if (n) {
          notes++;
          expect(allowed.has(n.midi)).toBe(true);
          expect(n.velocity).toBeGreaterThan(0);
          expect(n.velocity).toBeLessThanOrEqual(1);
        }
      }
      // sparse but not silent
      expect(notes).toBeGreaterThan(20);
      expect(notes).toBeLessThan(500);
    }
  });

  it('chord chains only reference defined chords', () => {
    for (const cfg of Object.values(MOODS)) {
      const names = new Set(cfg.chords.map((c) => c.name));
      for (const c of cfg.chords) for (const [n] of c.next) expect(names.has(n)).toBe(true);
    }
  });

  it('chooses moods from screen / view / night / panels / party', () => {
    const base = { screen: 'game', view: 'tank' as const, panel: null, partyMode: false, night: false, hasGame: true };
    expect(chooseMood({ ...base, screen: 'boot' })).toBe('off');
    expect(chooseMood({ ...base, screen: 'title' })).toBe('title');
    expect(chooseMood(base)).toBe('tank');
    expect(chooseMood({ ...base, view: 'facility' })).toBe('facility');
    expect(chooseMood({ ...base, night: true })).toBe('night');
    expect(chooseMood({ ...base, panel: 'market' })).toBe('market');
    expect(chooseMood({ ...base, partyMode: true })).toBe('party');
  });
});

describe('audio soundscape — equipment and visitors', () => {
  const eq = (defId: string, extra: Partial<EquipmentInstance> = {}): EquipmentInstance => ({ id: defId, defId, installedHour: 0, condition: 1, on: true, ...extra });

  it('recognises filters, airstones and sponge filters (with or without catalog data)', () => {
    expect(equipmentSound(eq('zz_test_hob_filter')).trickle).toBeGreaterThan(0.5);
    expect(equipmentSound(eq('zz_test_sponge_filter')).bigBubbles).toBeGreaterThan(1);
    expect(equipmentSound(eq('zz_test_airstone')).fineBubbles).toBeGreaterThan(3);
    expect(equipmentSound(eq('zz_test_canister_filter')).trickle).toBeGreaterThan(0);
    expect(equipmentSound(eq('zz_test_heater'))).toEqual({});
  });

  it('switched-off or failed equipment falls silent', () => {
    expect(equipmentSound(eq('zz_test_hob_filter', { on: false }))).toEqual({});
    expect(equipmentSound(eq('zz_test_hob_filter', { failed: true }))).toEqual({});
  });

  it('builds a clamped tank profile', () => {
    const tank = { equipment: [eq('zz_test_hob_filter'), eq('zz_test_hob_filter2'), eq('zz_test_airstone'), eq('zz_test_airstone2'), eq('zz_test_airstone3')] } as unknown as Tank;
    const p = tankSoundProfile(tank);
    expect(p.trickle).toBeLessThanOrEqual(1);
    expect(p.hum).toBeLessThanOrEqual(1);
    expect(p.fineBubbles).toBeLessThanOrEqual(16);
    expect(tankSoundProfile(null).hum).toBe(0);
  });

  it('estimates visitor presence only while open', () => {
    const g = {
      clock: { hour: 13, speed: 1 },
      facility: { level: 'hobby_room', openToPublic: true, openHour: 9, closeHour: 19 },
      visitors: { today: { count: 20 } },
    } as unknown as GameState;
    const open = visitorPresence(g);
    expect(open).toBeGreaterThan(0);
    expect(open).toBeLessThanOrEqual(1);
    expect(visitorPresence({ ...g, clock: { hour: 23, speed: 1 } } as GameState)).toBe(0);
    expect(visitorPresence({ ...g, facility: { ...g.facility, openToPublic: false } } as GameState)).toBe(0);
    expect(visitorPresence(null)).toBe(0);
  });
});

describe('audio dsp — pink noise spectrum', () => {
  it('falls ≈3 dB per octave', () => {
    const n = SR * 4;
    const x = fillPink(new Float32Array(n), mulberry32(8));
    // average Goertzel power over many short blocks at octave-spaced frequencies
    const power = (hz: number) => {
      let p = 0;
      const block = 4800;
      for (let b = 0; b + block < n; b += block) p += goertzel(x, b, block, hz);
      return p;
    };
    const p250 = power(250);
    const p1000 = power(1000);
    const p4000 = power(4000);
    const slope1 = (10 * Math.log10(p1000 / p250)) / 2; // dB per octave
    const slope2 = (10 * Math.log10(p4000 / p1000)) / 2;
    expect(slope1).toBeGreaterThan(-4.5);
    expect(slope1).toBeLessThan(-1.5);
    expect(slope2).toBeGreaterThan(-4.5);
    expect(slope2).toBeLessThan(-1.5);
  });
});
