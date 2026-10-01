/**
 * Lane "fit" — the fit hint components (src/ui/common/FitNote.tsx) render the verdicts with icon + word + colour,
 * stay quiet for plain general advice, and convert temperatures to the player's unit.
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FitBadge, FitLine, FoodEaters } from '@/ui/common/FitNote';
import type { FitVerdict, FoodFit } from '@/sim/care/fit';
import { convertTempText } from '@/ui/common/format';

const html = (el: ReturnType<typeof createElement>) => renderToStaticMarkup(el);

const useless: FitVerdict = { level: 'useless', label: 'Won’t help', text: 'Your 3 lined seahorses only eat frozen or live food, so an autofeeder can’t feed them — feed them by hand or target-feed.', attention: true };
const generalOk: FitVerdict = { level: 'ok', label: 'Good fit', text: 'More oxygen — a cheap safety net.', general: true };
const harmful: FitVerdict = { level: 'harmful', label: 'Harmful', text: 'Even turned down to 10%, it makes the current too strong.' };

describe('ui fit hints', () => {
  it('badge: icon + word, amber for "won’t help", red for harmful, nothing for general advice', () => {
    const b = html(createElement(FitBadge, { verdict: useless }));
    expect(b).toContain('ag-fitbadge is-watch');
    expect(b).toContain('Won’t help');
    expect(b).toContain('<svg');
    expect(html(createElement(FitBadge, { verdict: harmful }))).toContain('is-danger');
    expect(html(createElement(FitBadge, { verdict: generalOk }))).toBe('');
  });

  it('line: boxed with the word for problems, hidden for general advice, harmful is an alert', () => {
    const l = html(createElement(FitLine, { verdict: useless, testId: 'x' }));
    expect(l).toContain('is-boxed');
    expect(l).toContain('Won’t help.');
    expect(l).toContain('data-testid="x"');
    expect(html(createElement(FitLine, { verdict: generalOk }))).toBe('');
    expect(html(createElement(FitLine, { verdict: harmful }))).toContain('role="alert"');
  });

  it('line: temperatures go through the °C / °F formatter', () => {
    // (server render reads the settings store's initial °C; the browser follows Settings › Temperature)
    const t: FitVerdict = { level: 'useless', label: 'Won’t help', text: 'Lotus the axolotl needs 15–18 °C — cooler than the room (about 22 °C).' };
    expect(html(createElement(FitLine, { verdict: t }))).toMatch(/15–18 °C/);
    expect(convertTempText(t.text, 'F')).toMatch(/59–64 °F/);
  });

  it('food eaters: who eats it, and an autofeeder / hand-feed chip', () => {
    const f: FoodFit = { foodId: 'mysis_frozen', form: 'frozen', autofeeder: false, here: [], elsewhere: [], young: [], level: 'ok', text: 'Eaten by 3 lined seahorses.', formText: 'Frozen — thaw it and feed by hand; an autofeeder can’t dispense it.' };
    const out = html(createElement(FoodEaters, { fit: f }));
    expect(out).toContain('Eaten by 3 lined seahorses.');
    expect(out).toContain('Hand-feed');
    expect(out).toContain('data-testid="food-eaters-mysis_frozen"');
    const dry = html(createElement(FoodEaters, { fit: { ...f, foodId: 'flake_tropical', form: 'dry', autofeeder: true, level: 'useless', text: 'Nobody you keep eats this.' } }));
    expect(dry).toContain('Autofeeder OK');
    expect(dry).toContain('is-watch');
  });
});
