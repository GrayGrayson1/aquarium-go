// @vitest-environment node
/**
 * lane:ui-panels (BACKLOG B-121) — numbers and words the screens show come from the simulation's own rules, so they
 * can't disagree with what then happens: the Visitors panel's admission projection uses the sim's price curve, the
 * decorating tools quote the sale the sim will pay, and the dock's locked Visitors item says the unlock rule's words.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { admissionDraw } from '@/sim/facility';
import { placeDecor, removeDecor, decorSellValue, SELL_BACK_FRACTION } from '@/sim/aquascape';
import { getDecorDef } from '@/data/catalog/decor';
import { UNLOCK_RULE_BY_KEY } from '@/data/unlocks';
import { projectAdmission } from '@/ui/panels/visitors/admissionProjection';
import { DOCK_ITEMS, dockLockHint } from '@/ui/hud/Dock';

const FAIR = 8;

/** A shop that charges `admission` and had 100 visitors a day lately. */
function shop(admission: number): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 77 });
  g.facility.level = 'specialty_shop';
  g.facility.admission = admission;
  g.visitors.history = [1, 2, 3].map((day) => ({ day, count: 100, revenue: 100 * admission, avgSatisfaction: 70 }));
  return g;
}

describe('B-121: the admission projection follows the sim', () => {
  it('at the price charged now it is the recent days themselves', () => {
    const p = projectAdmission(shop(6), 6, FAIR);
    expect(p.visitors).toBeCloseTo(100, 9);
    expect(p.revenue).toBeCloseTo(600, 9);
  });

  it("visitors scale by the sim's draw at the new price over its draw at the current one", () => {
    const g = shop(6);
    for (const price of [0, 1, 4, 8, 10, 12, 15, 16, 20, 30, 40]) {
      const expected = (100 * admissionDraw(price / FAIR)) / admissionDraw(6 / FAIR);
      expect(projectAdmission(g, price, FAIR).visitors, `at $${price}`).toBeCloseTo(expected, 9);
    }
  });

  it('takings peak at the fair price and only fall above it, as they do in the sim', () => {
    const g = shop(FAIR);
    const revenue = (price: number) => projectAdmission(g, price, FAIR).revenue;
    const best = Math.max(...Array.from({ length: 41 }, (_, p) => revenue(p)));
    expect(revenue(FAIR)).toBe(best);
    for (let p = FAIR; p < 40; p++) expect(revenue(p + 1), `$${p + 1} against $${p}`).toBeLessThan(revenue(p));
  });

  it("the review's case: from half the fair price to 1.75 times it the takings fall by about two fifths (it showed a gain)", () => {
    const g = shop(FAIR / 2);
    const now = projectAdmission(g, FAIR / 2, FAIR).revenue;
    const then = projectAdmission(g, FAIR * 1.75, FAIR).revenue;
    // the sim: (1.75 × 0.15) ÷ (0.5 × 0.9)
    expect(then / now).toBeCloseTo((1.75 * admissionDraw(1.75)) / (0.5 * admissionDraw(0.5)), 9);
    expect(then / now).toBeCloseTo(0.5833, 3);
  });

  it('Audit 2026-11-17 (H7): days with tips but no visitors (the hobby room\'s friends) are left out of the base', () => {
    const g = shop(6);
    g.visitors.history = [...[1, 2, 3, 4, 5, 6].map((day) => ({ day, count: 0, revenue: 12, avgSatisfaction: 0 })), { day: 7, count: 70, revenue: 420, avgSatisfaction: 70 }];
    expect(projectAdmission(g, 6, FAIR).visitors).toBeCloseTo(70, 9); // it averaged in the six empty days: 10
    g.visitors.history = [1, 2, 3].map((day) => ({ day, count: 0, revenue: 12, avgSatisfaction: 0 }));
    expect(projectAdmission(g, 6, FAIR).visitors).toBeGreaterThan(0); // no visitors yet: the room's capacity estimate, not 0
  });

  it('from a price far past the fair one the scaling is bounded: the current price counts as a draw of at least 0.01', () => {
    const g = shop(40);
    g.visitors.history = [{ day: 1, count: 2, revenue: 80, avgSatisfaction: 40 }];
    expect(admissionDraw(40 / FAIR), 'the sim draws less than the floor at 5 times the fair price').toBeLessThan(0.01);
    const p = projectAdmission(g, FAIR, FAIR);
    expect(p.visitors).toBeCloseTo((2 * admissionDraw(1)) / 0.01, 9);
    expect(Number.isFinite(p.revenue)).toBe(true);
  });
});

describe('B-121: the screens call the shared rules (their own copies are gone)', () => {
  const src = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');

  it('the Visitors panel projects with projectAdmission and draws no curve of its own', () => {
    const panel = src('src/ui/panels/visitors/VisitorsPanel.tsx');
    expect(panel).toContain("import { projectAdmission } from './admissionProjection'");
    expect(panel.match(/projectAdmission\(g, /g) ?? []).toHaveLength(2);
    expect(panel).not.toMatch(/Math\.pow|function project\(/);
    expect(src('src/ui/panels/visitors/admissionProjection.ts')).toMatch(/admissionDraw\(p \/ fair\)/);
  });

  it('the decorating tools quote decorSellValue, not the bare sell-back fraction', () => {
    const editor = src('src/render/decor/DecorEditor.tsx');
    expect(editor).toContain('decorSellValue(hoverDef, hoverInst)');
    expect(editor).not.toContain('SELL_BACK_FRACTION');
  });

  it('the dock asks dockLockHint for a locked item, and Visitors has no words of its own', () => {
    const dock = src('src/ui/hud/Dock.tsx');
    expect(dock).toContain('const hint = dockLockHint(it);');
    expect(dock).not.toContain("hint: 'Grow your reputation");
    expect(DOCK_ITEMS.find((it) => it.id === 'visitors')!.hint).toBeUndefined();
  });
});

describe('B-121: the decorating tools quote the sale the sim pays', () => {
  it('a piece sells back for its price times the sell-back fraction', () => {
    const wood = getDecorDef('spider_wood')!;
    expect(decorSellValue(wood, {})).toBe(Math.round(wood.price * SELL_BACK_FRACTION));
    expect(decorSellValue(wood, { health: 10 }), 'only an almond leaf sells by its health').toBe(Math.round(wood.price * SELL_BACK_FRACTION));
    expect(decorSellValue(undefined, {})).toBe(0);
  });

  it('an almond leaf sells by how much of it is left: the quote and the sale agree as it breaks down', () => {
    const leaf = getDecorDef('almond_leaf');
    expect(leaf?.visual).toBe('botanical_almond_leaf');
    for (const health of [100, 75, 50, 49, 20, 0]) {
      const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 78 });
      g.finance.money = 500;
      const t = g.tanks[g.tankOrder[0]];
      const placed = placeDecor(g, t.id, leaf!.id, { x: 0, z: 0 });
      expect(placed.ok, placed.message).toBe(true);
      const inst = t.decor.find((d) => d.id === placed.decorId)!;
      inst.health = health;
      const quote = decorSellValue(leaf, inst);
      const before = g.finance.money;
      expect(removeDecor(g, t.id, inst.id, true).ok).toBe(true);
      expect(g.finance.money - before, `at health ${health}`).toBe(quote);
      expect(quote).toBe(Math.round(leaf!.price * SELL_BACK_FRACTION * (health / 100)));
    }
  });
});

describe('B-121: a locked dock item says how its unlock rule says to unlock it', () => {
  it('Visitors: the rule is the specialty shop, and the dock says so', () => {
    const visitors = DOCK_ITEMS.find((it) => it.id === 'visitors')!;
    expect(UNLOCK_RULE_BY_KEY.visitors.hint).toBe('Upgrade to a specialty shop to welcome paying visitors.');
    expect(dockLockHint(visitors)).toBe(UNLOCK_RULE_BY_KEY.visitors.hint);
  });

  it("every locked item has words, and none that aren't its own or its rule's", () => {
    for (const it of DOCK_ITEMS.filter((x) => x.lock)) {
      const hint = dockLockHint(it);
      expect(hint, it.id).toBeTruthy();
      expect([it.hint, UNLOCK_RULE_BY_KEY[it.lock!]?.hint]).toContain(hint);
    }
    expect(dockLockHint(DOCK_ITEMS.find((it) => it.id === 'tanks')!), 'an item with no lock has no hint').toBeUndefined();
  });
});
