/**
 * Audit 2026-11-17 (H17): Operations' Feeding tile says "Running" only while an Autofeeder (or a doser) actually runs;
 * with every Autofeeder switched off it says "Paused".
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState } from '@/types';
import { useGame } from '@/state/game';
import { opsSnapshot, opsTier } from '@/ui/common/ops';
import { Overview } from '@/ui/panels/operations/Overview';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { lineFarm } from './support/production';

const nav = { tab: () => {}, view: () => {} };
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

function tile(g: GameState): string {
  useGame.setState({ game: g });
  Object.assign(useGame.getInitialState(), useGame.getState());
  const html = renderToStaticMarkup(createElement(Overview, { g, snap: opsSnapshot(g), tier: opsTier(g), nav, small: false }));
  const at = html.indexOf('data-testid="ops-sys-feeding"');
  const next = html.indexOf('data-testid="ops-sys-', at + 10);
  return text(html.slice(html.indexOf('>', at) + 1, next > 0 ? html.lastIndexOf('<', next) : undefined));
}

afterEach(() => {
  useGame.setState({ game: null });
  Object.assign(useGame.getInitialState(), { game: null });
});

describe('Audit 2026-11-17 (H17): the Feeding tile', () => {
  it('Running with Autofeeders on; Paused with all of them off', () => {
    const { g } = lineFarm(17);
    expect(tile(g)).toContain('Running');
    for (const t of Object.values(g.tanks)) for (const e of t.equipment) if (getEquipmentDef(e.defId)?.kind === 'autofeeder') e.on = false;
    const off = tile(g);
    expect(off).toContain('Paused');
    expect(off).not.toContain('Running');
  });
});
