/**
 * lane:automation (chunk 5; PERF-004, the chunk 5 review) — Operations' summaries are computed once per game hour (the
 * Operations key: the hour, the stock, the budget, the holds, the lines), never on each refresh. The stock manager's dry
 * runs walk every animal (`plannedUsage`), so this counts every call into them from outside src/sim/staff/work.ts
 * while every Operations view, the Supplies salt row and Staff's budget line render again and again in the same hour,
 * as the panel does every 500 ms while the clock runs.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState } from '@/types';

const calls = vi.hoisted(() => ({ nextStockCheck: 0, planPurchases: 0, plannedOrders: 0, plannedUsage: 0 }));
vi.mock('@/sim/staff/work', async (importOriginal) => {
  const m = await importOriginal<typeof import('@/sim/staff/work')>();
  return {
    ...m,
    nextStockCheck: (...a: Parameters<typeof m.nextStockCheck>) => (calls.nextStockCheck++, m.nextStockCheck(...a)),
    planPurchases: (...a: Parameters<typeof m.planPurchases>) => (calls.planPurchases++, m.planPurchases(...a)),
    plannedOrders: (...a: Parameters<typeof m.plannedOrders>) => (calls.plannedOrders++, m.plannedOrders(...a)),
    plannedUsage: (...a: Parameters<typeof m.plannedUsage>) => (calls.plannedUsage++, m.plannedUsage(...a)),
  };
});

import { facility } from './support/automation';
import { unlock } from '@/sim/facility';
import { useGame } from '@/state/game';
import { opsSnapshot, opsTier } from '@/ui/common/ops';
import { Overview } from '@/ui/panels/operations/Overview';
import { WaterTab } from '@/ui/panels/operations/WaterTab';
import { FeedTab } from '@/ui/panels/operations/FeedTab';
import { ProblemsView } from '@/ui/panels/operations/Problems';
import { ManualView } from '@/ui/panels/operations/Manual';
import { MapTab } from '@/ui/panels/operations/MapTab';
import { SaltRow } from '@/ui/panels/market/SuppliesAutomation';
import { BudgetStatus } from '@/ui/panels/visitors/StaffTab';

const total = () => calls.nextStockCheck + calls.planPurchases + calls.plannedOrders + calls.plannedUsage;
const reset = () => {
  calls.nextStockCheck = calls.planPurchases = calls.plannedOrders = calls.plannedUsage = 0;
};

function renderAll(g: GameState): string {
  useGame.setState({ game: g });
  const snap = opsSnapshot(g);
  const tier = opsTier(g);
  const nav = { tab: () => {}, view: () => {} };
  return [
    createElement(Overview, { g, snap, tier, nav, small: false }),
    createElement(WaterTab, { g, snap, nav, small: false }),
    createElement(FeedTab, { g, nav, small: false }),
    createElement(ProblemsView, { g, snap, nav }),
    createElement(ManualView, { g, snap, nav }),
    createElement(MapTab, { g, snap, tier, layer: 'all', onLayer: () => {}, small: false, nav }),
    createElement(SaltRow, { g, flash: null }),
    createElement(BudgetStatus, { g, m: g.staff!.roster[0], budget: g.staff!.stockBudget }),
  ]
    .map((e) => renderToStaticMarkup(e))
    .join('');
}

/** What a 4 Hz publish hands the panel: a new game object, a little later in the same hour. */
const publish = (g: GameState, dh: number): GameState => ({ ...g, clock: { ...g.clock, hour: g.clock.hour + dh }, finance: { ...g.finance, money: g.finance.money - 0.5 } });

afterEach(() => useGame.setState({ game: null }));

describe('PERF-004: Operations computes its forecast once per game hour', () => {
  it('re-rendering every view in the same hour runs no dry run of the stock manager\'s check; a new hour runs it once', () => {
    // the full Operations (Water room, Live food room, the Desk), a stock manager, salt low enough to order
    const f = facility({ fresh: 2, marine: 2, salt: 4.1, rosa: 150, food: true, eggs: 2, veg: 1, hour: 24 * 3 + 8.25 });
    unlock(f.g, 'operations_desk', { silent: true });
    reset();
    const first = renderAll(f.g);
    expect(first).toContain('Salt'); // the views really rendered their supplies
    expect(calls.nextStockCheck).toBe(1); // the snapshot's forecast, shared by every view
    expect(calls.plannedUsage + calls.plannedOrders + calls.planPurchases).toBeLessThanOrEqual(2); // Staff's two whole-order dry runs
    reset();
    let g = f.g;
    for (let i = 0; i < 6; i++) {
      g = publish(g, 0.1); // 8:21 … 8:51
      renderAll(g);
    }
    expect(total()).toBe(0);
    g = publish(g, 0.5); // 9:21: a new hour
    renderAll(g);
    expect(calls.nextStockCheck).toBe(1);
  });
});
