// @vitest-environment node
/**
 * Audit 2026-11-17, area F (money): buying, selling, prices, and never being left broke without a way out. One test per
 * finding fixed; server-rendered like ui-shop-05 where the fix is on a screen.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { useGame } from '@/state/game';
import { refreshFoodStatus } from '@/sim/tankStatus';
import { SuppliesTab } from '@/ui/panels/market/Supplies';
import { cantAffordTitle, hungryAndShort, moneyHeld, needsCashIdeas } from '@/ui/common/moneyShort';
import { FinancesPanel } from '@/ui/panels/finances/FinancesPanel';
import { eventLink } from '@/ui/hud/eventLinks';
import { devStepEconomy } from '@/sim/economy';
import { AQUARIUM_CLUB } from '@/data/buyers';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

function game(money = 5000): GameState {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 71 });
  g.finance.money = money;
  useGame.getState().setGame(g);
  return g;
}

/** The starter's food cupboard is bare. */
function noFood(g: GameState): void {
  for (const k of Object.keys(g.inventory.foods)) g.inventory.foods[k] = 0;
  refreshFoodStatus(g);
}

const supplies = (g: GameState) => renderToStaticMarkup(createElement(SuppliesTab, { g }));

afterEach(() => useGame.getState().setGame(null));

describe('F1: a greyed "Buy" says why, and how to raise the money', () => {
  it('a disabled button’s reason: in debt, or short of the price', () => {
    expect(cantAffordTitle(-12, 6)).toBe('You’re $12 in debt, so purchases are paused');
    expect(cantAffordTitle(4.5, 6)).toBe('Not enough money: you have $4.50');
    expect(cantAffordTitle(6, 6)).toBeUndefined();
    expect(moneyHeld(199.6)).toBe('$199'); // never more than the player has (F11)
  });

  it('with money to spare, no callout', () => {
    const out = supplies(game());
    expect(out).not.toContain('supplies-money-short');
  });

  it('short of the cheapest food: the callout, a way to raise cash, and a reason on each greyed button', () => {
    const g = game(1);
    const out = supplies(g);
    expect(out).toContain('data-testid="supplies-money-short"');
    expect(text(out)).toContain('Not enough money You have $1: not enough for anything here.');
    expect(out).toContain('data-testid="supplies-raise-cash"');
    expect(text(out)).toContain('Ways to raise cash');
    expect(out).toContain('title="Not enough money: you have $1"');
    expect(needsCashIdeas(g)).toBe(true);
  });

  it('in debt: purchases are paused, food included', () => {
    const g = game(-12);
    const t = text(supplies(g));
    expect(t).toContain('Purchases are paused');
    expect(t).toContain('You’re $12 in debt, so purchases are paused, food included.');
  });

  it('no food left and less money than the cheapest pack the animal eats (A7’s worst case)', () => {
    const g = game(1);
    noFood(g);
    const h = hungryAndShort(g);
    expect(h).not.toBeNull();
    expect(h!.tanks[0].names).toContain('Ember');
    const t = text(supplies(g));
    expect(t).toContain('Not enough money for food');
    expect(t).toMatch(/Ember has no food left, and \$1 won’t buy a pack of .+ \(\$\d+\)\./);
    // with enough for that pack, nothing to say
    g.finance.money = h!.price;
    expect(hungryAndShort(g)).toBeNull();
  });
});

describe('F2: money trouble leads to Finances', () => {
  const toMidnight = (g: GameState) => 24 - (g.clock.hour % 24) + 0.25;

  it('the midnight debt warning and "Cash is getting low" open Finances (and the low-cash tip is a toast)', () => {
    const g = game(-20);
    devStepEconomy(g, toMidnight(g), { finance: true });
    const red = g.log.find((e) => /in the red after today's bills/.test(e.text))!;
    expect(red.toast).toBe(true);
    expect(eventLink(red)).toMatchObject({ panel: 'finances', label: 'Open Finances' });

    const h = game(1.5);
    h.finance.lastWarnHour = -999;
    devStepEconomy(h, toMidnight(h), { finance: true });
    const low = h.log.find((e) => /^Cash is getting low/.test(e.text))!;
    expect(low).toBeDefined();
    expect(low.toast).toBe(true);
    expect(eventLink(low)).toMatchObject({ panel: 'finances' });
  });

  it('the club’s loans, a room money won’t restock and back in the black open Finances too', () => {
    for (const text of [
      `Good news: ${AQUARIUM_CLUB} heard you were struggling and lent you $140, interest-free. It is repaid automatically.`,
      `${AQUARIUM_CLUB} would rather see your room full than quiet: they've lent you another $1,230, interest-free, to start again.`,
      `Loan repaid in full — ${AQUARIUM_CLUB} sends their thanks and a round of applause.`,
      `Your tanks are empty and $4 won't restock them. If that's still true tomorrow, ${AQUARIUM_CLUB} will lend you enough to start again.`,
      `You're back in the black with $12. Purchases are available again.`,
    ])
      expect(eventLink({ kind: 'info', text }), text).toMatchObject({ panel: 'finances' });
    // the sim still writes the phrases the link looks for (update MONEY_NEWS if this copy changes)
    const src = readFileSync(fileURLToPath(new URL('../../src/sim/economy/finance.ts', import.meta.url)), 'utf8');
    for (const phrase of ["in the red after today's bills", 'Cash is getting low:', ', interest-free', 'Loan repaid in full', "won't restock ${", "You're back in the black"]) expect(src).toContain(phrase);
    expect(eventLink({ kind: 'info', text: 'Pip blew a bubble nest.' })).toBeNull();
  });

  it('Finances’ ways to raise cash are links to where each happens', () => {
    const g = game(-30);
    g.progress.unlocked.push('market_listings');
    const out = renderToStaticMarkup(createElement(FinancesPanel));
    expect(out).toContain('data-testid="finance-idea-list_animal"');
    expect(out).toContain('data-testid="finance-idea-go-list_animal"');
    expect(text(out)).toContain('New listing');
  });
});
