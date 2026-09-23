import { test, expect } from '@playwright/test';
import { STARTERS, openApp, onboardViaUI, collectErrors, probe, expectCanvasNotBlank } from './helpers';

test.describe('starter selection', () => {
  for (const s of STARTERS) {
    test(`choose ${s.id} → named → correct ${s.env} tank`, async ({ page }) => {
      const errors = collectErrors(page);
      await openApp(page);
      await onboardViaUI(page, s.id, `Test ${s.id.slice(0, 6)}`);
      const info = await probe<{ env: string; waterClass: string; species: string[]; name: string | null; tanks: number }>(
        page,
        `(() => {
          const t = g.tanks[g.tankOrder[0]];
          const cs = Object.values(g.creatures).filter(c => c.tankId === t.id);
          const starter = cs.find(c => c.isStarter);
          return { env: t.environment, waterClass: t.waterClass, species: cs.map(c => c.speciesId), name: starter ? starter.name : null, tanks: g.tankOrder.length };
        })()`,
      );
      expect(info.tanks).toBe(1);
      expect(info.env).toBe(s.env);
      if (s.env === 'marine') expect(info.waterClass).toMatch(/^(marine|reef)/);
      else expect(info.waterClass).toMatch(/^freshwater/);
      expect(info.species).toContain(s.id);
      expect(info.name).toBe(`Test ${s.id.slice(0, 6)}`);
      const summary = await probe<{ starterId: string; salinity: number }>(page, `({ starterId: g.starterId, salinity: g.tanks[g.tankOrder[0]].water.salinitySG })`);
      expect(summary.starterId).toBe(s.id);
      if (s.env === 'marine') expect(summary.salinity).toBeGreaterThan(1.015);
      else expect(summary.salinity).toBeLessThan(1.005);
      await page.waitForTimeout(1500);
      await expectCanvasNotBlank(page);
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }
});
