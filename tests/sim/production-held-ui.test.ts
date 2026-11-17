/**
 * Audit 2026-11-17 (H3, H4) — a line that can't go on says why, where the player looks: a line stopped by a missing
 * parent or tank is an Operations problem (no all-clear while it is), and Operations › Lines says what it needs; a due
 * pair that can't get into condition says what holds it back, on the Next clutch tile and in Operations › Lines.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState } from '@/types';
import { useGame } from '@/state/game';
import { unlock } from '@/sim/facility';
import { opsSnapshot, opsTier } from '@/ui/common/ops';
import { Overview } from '@/ui/panels/operations/Overview';
import { LinesTab } from '@/ui/panels/operations/LinesTab';
import { ProblemsView } from '@/ui/panels/operations/Problems';
import { ProductionTab } from '@/ui/panels/livestock/Production';
import { lineView } from '@/sim/production/view';
import { lineFarm } from './support/production';

const nav = { tab: () => {}, view: () => {} };
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

function use(g: GameState): void {
  useGame.setState({ game: g });
  Object.assign(useGame.getInitialState(), useGame.getState());
}
const render = (el: ReactElement) => text(renderToStaticMarkup(el));

afterEach(() => {
  useGame.setState({ game: null });
  Object.assign(useGame.getInitialState(), { game: null });
});

describe('Audit 2026-11-17 (H3): a line missing a parent or tank', () => {
  it('shows in Problems with its notice and a Fix, keeps the all-clear away, and Lines says why', () => {
    const f = lineFarm(17);
    const g = f.g;
    unlock(g, 'operations_desk', { silent: true });
    const line = g.production!.lines[0];
    use(g);
    const clear = () => render(createElement(Overview, { g, snap: opsSnapshot(g), tier: opsTier(g), nav, small: false }));
    line.broken = { ref: 'mother', id: line.pair.motherId, name: 'Cinder', sinceHour: g.clock.hour };
    const notice = `${line.name} paused: Cinder is no longer in your care. Choose another pair, or end the line.`;
    expect(clear()).not.toContain('Everything is running smoothly.');
    const problems = renderToStaticMarkup(createElement(ProblemsView, { g, snap: opsSnapshot(g), nav }));
    expect(problems).toContain('data-testid="issues-line_broken"');
    expect(text(problems)).toContain(`${line.name} paused Look soon ${notice} Fix`);
    const lines = render(createElement(LinesTab, { g, small: false }));
    expect(lines).toContain(notice);
    expect(lines).not.toMatch(/Next clutch in \d+ day/);
  });
});

describe('Audit 2026-11-17 (H4): a due pair that can’t get into condition', () => {
  it('says what holds it back (here: the breed tank too cool for spawning), on the tile and in Lines', () => {
    const f = lineFarm(17);
    const g = f.g;
    const line = g.production!.lines[0];
    for (const cl of Object.values(g.clutches)) cl.count = 0;
    const m = g.creatures[line.pair.motherId];
    const d = g.creatures[line.pair.fatherId];
    for (const c of [m, d]) {
      c.repro.lastSpawnHour = g.clock.hour - 24 * 30; // well past the rest after spawning
      c.stats.breedingReadiness = 10;
      c.stats.hunger = 5;
      c.stats.stress = 5;
      c.stats.health = 100;
      c.stats.comfort = 100;
    }
    f.tanks.breed.water.tempC = 24.5; // bettas spawn above 26 °C
    use(g);
    const v = lineView(g, line)!;
    expect(v.next.notReady?.drag).toBe('too_cool');
    const tile = render(createElement(ProductionTab, { g, sel: null, onSelect: () => {} }));
    expect(tile).toContain('Next clutch Not ready Breed Tank is too cool for spawning (24.5 °C; they spawn above 26 °C)');
    const lines = render(createElement(LinesTab, { g, small: false }));
    expect(lines).toContain('Not ready yet: Breed Tank is too cool for spawning (24.5 °C; they spawn above 26 °C)');
    // warm enough again: what holds him back next is food to bring him into condition
    f.tanks.breed.water.tempC = 27;
    expect(lineView(g, line)!.next.notReady?.drag).toBe('conditioning');
    expect(render(createElement(LinesTab, { g, small: false }))).toContain('Not ready yet: they need rich food (bloodworms, brine shrimp or daphnia) to get into condition');
  });
});
