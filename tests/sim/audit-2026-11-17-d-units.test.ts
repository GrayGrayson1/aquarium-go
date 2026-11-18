/**
 * Audit 2026-11-17, area D, finding D8 (and the review): with °F chosen, the compatibility list (CompatView: the shop,
 * the move dialog, the tank card) and the creature card's condition notes read in °F. Rendered on the server with the
 * player's unit set to °F (a server render reads the settings store's initial state, so the store is mocked here).
 */
import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { previewAddition } from '@/sim/compat';
import { CompatView } from '@/ui/common/CompatView';
import { ConditionNotes } from '@/ui/cards/ConditionNotes';
import { convertTempText } from '@/ui/common/format';

vi.mock('@/state/settings', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/state/settings')>();
  type S = ReturnType<typeof real.useSettings.getState>;
  const inF = <T,>(sel?: (s: S) => T) => {
    const st = { ...real.useSettings.getState(), tempUnit: 'F' as const };
    return sel ? sel(st) : st;
  };
  return { ...real, useSettings: Object.assign(inF, real.useSettings) };
});

const base = () => newGame({ starterId: 'betta', starterName: 'Ember', seed: 777 });

describe('D8: compatibility reasons and the card’s condition notes show the player’s temperature unit', () => {
  it('the compatibility list reads in °F, the reason and its fix', () => {
    const s = base();
    const t = createTank(s, 'g20L', 'freshwater_planted', { cycled: true });
    const r = previewAddition(s, t.id, { speciesId: 'white_cloud_minnow', count: 6 });
    const temp = r.reasons.find((x) => x.category === 'temperature' && x.severity !== 'info')!;
    expect(temp.text).toMatch(/°C/);
    const html = renderToStaticMarkup(createElement(CompatView, { report: r }));
    expect(html).toMatch(/too warm for white cloud mountain minnows/);
    expect(html).toContain(convertTempText(temp.text, 'F')!.split(' — ')[0]);
    expect(html).toMatch(/°F/);
    expect(html).not.toMatch(/°(\s|&nbsp;| )*C/);
  });

  it('the card’s condition notes read in °F', () => {
    const s = base();
    const ember = Object.values(s.creatures).find((c) => c.isStarter)!;
    const html = renderToStaticMarkup(createElement(ConditionNotes, { c: ember, notes: ['Ember is struggling with the water (too warm, 27.0 °C) — bettas need 24–28 °C.'], unit: 'F' }));
    expect(html).toMatch(/80\.6 °F/);
    expect(html).not.toMatch(/°\s*C/);
  });
});
