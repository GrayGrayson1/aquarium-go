import { describe, it, expect } from 'vitest';
import { NightGate } from '@/audio/soundscape';
import { IncomeCueGate } from '@/audio/cues';

/** Drive the gate with the game's day/night cycle: night 21:00–07:00, one game hour = 10 s real at 1×. */
function cycle(gate: NightGate, speed: number, seconds: number, startHour = 12): { flips: number; values: boolean[] } {
  const values: boolean[] = [];
  let flips = 0;
  let last: boolean | null = null;
  for (let s = 0; s <= seconds; s++) {
    const hour = (startHour + (s * speed) / 10) % 24;
    const raw = hour >= 21 || hour < 7;
    const v = gate.update(raw, speed, s * 1000);
    if (last !== null && v !== last) flips++;
    last = v;
    values.push(v);
  }
  return { flips, values };
}

describe('fix AUDIO — NightGate (S15-02: no day/night mood flapping while fast-forwarding)', () => {
  it('adopts the raw value at once on the first evaluation and after a reset', () => {
    const g = new NightGate();
    expect(g.update(true, 10, 0)).toBe(true);
    g.reset();
    expect(g.update(false, 10, 5)).toBe(false);
  });

  it('holds the current mood at 10× (a 4-minute day would swap the score every ~12 s)', () => {
    const g = new NightGate();
    const r = cycle(g, 10, 240);
    expect(r.flips).toBe(0);
    expect(r.values.every((v) => v === false)).toBe(true);
  });

  it('holds at 3× as well', () => {
    const g = new NightGate();
    expect(cycle(g, 3, 400).flips).toBe(0);
  });

  it('settles a fast-forward session loaded at night on the day score once, then holds it (R09-01)', () => {
    for (const speed of [3, 10]) {
      const g = new NightGate();
      const r = cycle(g, speed, 600, 22);
      expect(r.values[0]).toBe(true);
      expect(r.flips).toBe(1);
      expect(r.values[r.values.length - 1]).toBe(false);
      // the flip waits out the dwell since the load, then the day score stays through every later night
      expect(r.values.indexOf(false)).toBeGreaterThanOrEqual(45);
    }
  });

  it('follows the clock at 1× after a short hold, at most once per real day/night', () => {
    const g = new NightGate();
    const r = cycle(g, 1, 480); // two game days
    expect(r.flips).toBe(4); // day→night→day→night→day
    // night starts at 21:00 = 90 s in; the gate follows 8 s later, not before
    expect(r.values[95]).toBe(false);
    expect(r.values[99]).toBe(true);
  });

  it('ignores a brief flicker (lights toggled and back) shorter than the hold time', () => {
    const g = new NightGate();
    g.update(false, 1, 0);
    for (let t = 1000; t < 6000; t += 200) expect(g.update(true, 1, t)).toBe(false);
    expect(g.update(false, 1, 6200)).toBe(false);
  });

  it('keeps a freshly applied value for the minimum dwell before changing again', () => {
    const g = new NightGate(8000, 45000);
    g.update(false, 1, 0);
    // (the first value also counts as applied: a change right after a load waits out the dwell)
    for (let t = 1000; t < 45000; t += 1000) expect(g.update(true, 1, t)).toBe(false);
    expect(g.update(true, 1, 45000)).toBe(true);
    // day comes back 10 s later: candidate hold passes at +8 s, but dwell (45 s since the flip) has not
    for (let t = 55000; t < 90000; t += 500) expect(g.update(false, 1, t)).toBe(true);
    expect(g.update(false, 1, 90000)).toBe(false);
  });

  it('resumes following once the player slows down from fast-forward', () => {
    const g = new NightGate();
    g.update(false, 10, 0);
    g.update(true, 10, 30000);
    expect(g.value).toBe(false);
    // back to 1×: the hold clock starts now, not at 30 s
    for (let t = 60000; t < 67900; t += 100) expect(g.update(true, 1, t)).toBe(false);
    expect(g.update(true, 1, 68100)).toBe(true);
  });
});

describe('fix AUDIO — IncomeCueGate (S15-03: passive income chimes are sparse)', () => {
  it('allows one chime per gap at 1× and a longer gap while fast-forwarding', () => {
    const g = new IncomeCueGate(12000, 30000);
    expect(g.allow(0, 1)).toBe(true);
    expect(g.allow(5000, 1)).toBe(false);
    expect(g.allow(11999, 1)).toBe(false);
    expect(g.allow(12000, 1)).toBe(true);
    expect(g.allow(25000, 10)).toBe(false); // 13 s later but fast: 30 s gap
    expect(g.allow(42000, 10)).toBe(true);
  });

  it('caps a 10× minute of income ticks every 1.5 s at two chimes', () => {
    const g = new IncomeCueGate();
    let played = 0;
    for (let t = 0; t < 60000; t += 1500) if (g.allow(t, 10)) played++;
    expect(played).toBe(2);
  });
});
