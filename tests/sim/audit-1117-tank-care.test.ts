/**
 * Audit 2026-11-17, area C (keeping a tank healthy: water, equipment, feeding, dosing and the advice the game gives).
 * Each block pins one finding from that audit.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { getWaterReport } from '@/sim/water';
import { waterChange, waterChangeCost, dose } from '@/sim/care';

type Starter = 'betta' | 'ocellaris_clownfish' | 'axolotl' | 'lined_seahorse';
const base = (starter: Starter = 'betta') => newGame({ starterId: starter, starterName: 'Test', seed: 99 });
const firstTank = (s: GameState) => s.tanks[s.tankOrder[0]];

describe('C1: a water change the salt can’t cover is refused, as the keepers’ and the Auto Water Changer’s are', () => {
  it('refuses a 50% change with 0.6 kg of salt, says what it needs and has, and leaves the water alone', () => {
    const s = base('ocellaris_clownfish');
    const t = firstTank(s);
    s.inventory.salt = 0.6;
    const sg = t.water.salinitySG;
    const need = waterChangeCost(s, t.id, 0.5).saltKg;
    expect(need).toBeGreaterThan(0.6);
    const r = waterChange(s, t.id, 0.5);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/^Changing 50% of this tank needs about \d+\.\d kg of salt mix, and you have 0\.6 kg\. Buy marine salt mix in Market › Supplies first/);
    expect(t.water.salinitySG).toBe(sg);
    expect(s.inventory.salt).toBe(0.6);
  });

  it('offers a smaller change only when the salt covers the smallest one, and says "none" when it is gone', () => {
    const s = base('ocellaris_clownfish');
    const t = firstTank(s);
    s.inventory.salt = waterChangeCost(s, t.id, 0.1).saltKg + 0.05;
    expect(waterChange(s, t.id, 0.5).message).toMatch(/, or change less water\.$/);
    s.inventory.salt = 0;
    const r = waterChange(s, t.id, 0.25);
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/and you have none\. Buy marine salt mix in Market › Supplies first\.$/);
  });

  it('still changes the water when the salt covers it exactly', () => {
    const s = base('ocellaris_clownfish');
    const t = firstTank(s);
    const sg = t.water.salinitySG;
    s.inventory.salt = waterChangeCost(s, t.id, 0.25).saltKg + 0.001;
    const r = waterChange(s, t.id, 0.25);
    expect(r.ok).toBe(true);
    expect(r.message).not.toMatch(/ran short of salt/);
    expect(Math.abs(t.water.salinitySG - sg)).toBeLessThan(0.002);
  });

  it('low-salinity advice says to dose back up now, not 0.001 a day', () => {
    const s = base('ocellaris_clownfish');
    const t = firstTank(s);
    t.water.salinitySG = 1.016;
    const p = getWaterReport(s, t.id).params.find((x) => x.key === 'salinity')!;
    expect(p.status).not.toBe('good');
    expect(p.advice).toBe('Dose salt mix until it reads at least 1.023 — each dose adds 0.001.');
    s.inventory.salt = 5;
    const r = dose(s, t.id, 'salt');
    expect(r.ok).toBe(true);
    expect(r.message).toMatch(/Dose again until it reads at least 1\.023\.$/);
    expect(r.message).not.toMatch(/0\.001 a day/);
  });
});
