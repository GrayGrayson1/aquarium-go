/**
 * Round-3 polish (P-2, P-7): toasts keep to a corner over a short-landscape bottom sheet; the room view marks the
 * edges the exhibit row runs past, only while it does (useFacilityOverflow). The layouts were checked in the browser.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RoomEdgeCues } from '@/ui/hud/RoomChips';

const hud = readFileSync(new URL('../../src/ui/styles/hud.css', import.meta.url), 'utf8');
/** The body of the first `@media <query> {` block. */
const block = (css: string, query: string) => {
  const at = css.indexOf(`@media ${query} {`);
  expect(at, query).toBeGreaterThanOrEqual(0);
  const rest = css.slice(at);
  return rest.slice(0, rest.indexOf('\n}'));
};

describe('P-2: toasts over a short-landscape bottom sheet', () => {
  it('sit in the right-hand corner at under half the width, not across the sheet body', () => {
    const land = block(hud, '(max-height: 500px) and (orientation: landscape)');
    const rule = /:root:has\(\.pn-sheet--bottom, \.ag-sheet--bottom\) \.ag-toasts:not\(\.is-onboarding\) \{([^}]*)\}/.exec(land)?.[1] ?? '';
    expect(rule).toMatch(/left: auto;/);
    expect(rule).toMatch(/right: var\(--edge-r\);/);
    expect(rule).toMatch(/width: min\(340px, 42vw\);/);
  });
});

describe('P-7: room-view edge cues', () => {
  const render = (left: boolean, right: boolean) => renderToStaticMarkup(createElement(RoomEdgeCues, { left, right }));

  it('are absent while the whole row is in frame', () => {
    expect(render(false, false)).not.toContain('ag-roomedge');
  });
  it('mark only the side the row runs past', () => {
    const html = render(false, true);
    expect(html).toContain('room-edge-right');
    expect(html).not.toContain('room-edge-left');
    expect(render(true, false)).not.toContain('room-edge-right');
    expect(render(true, true)).toMatch(/room-edge-left[\s\S]*room-edge-right/);
  });
  it('follow the camera rig overflow store', () => {
    const src = readFileSync(new URL('../../src/ui/hud/RoomChips.tsx', import.meta.url), 'utf8');
    expect(src).toMatch(/useFacilityOverflow\(\(s\) => s\.left\)/);
    expect(src).toMatch(/useFacilityOverflow\(\(s\) => s\.right\)/);
  });
  it('never take pointer events (drags reach the room under them)', () => {
    expect(hud).toMatch(/\.ag-roomedge \{ position: fixed;[^}]*pointer-events: none; \}/);
  });
});
