/**
 * Fix lane HUD-2 — CSS contracts behind the round-2 layout fixes (the behaviour itself was checked in the browser).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (f: string) => readFileSync(new URL(`../../src/ui/styles/${f}`, import.meta.url), 'utf8');
const shell = read('shell.css');
const hud = read('hud.css');
const screens = read('screens.css');
/** The body of the first `@media <query> {` block. */
const block = (css: string, query: string) => {
  const at = css.indexOf(`@media ${query} {`);
  expect(at, query).toBeGreaterThanOrEqual(0);
  const rest = css.slice(at);
  return rest.slice(0, rest.indexOf('\n}'));
};

describe('touch screens (iOS Safari)', () => {
  const coarse = block(shell, '(pointer: coarse)');
  it('G4-05: fields keep 16 px so focusing one never zooms the page', () => {
    expect(coarse).toMatch(/\.ag-ui :is\(input, select, textarea\)[^{]*\{ font-size: max\(16px,/);
  });
  it('G4-06: no selection loupe / callout on HUD text, but fields stay selectable', () => {
    expect(shell).toMatch(/\.ag-ui, \.scene-canvas \{ -webkit-touch-callout: none; \}/);
    expect(coarse).toMatch(/\.ag-ui, \.scene-canvas \{ -webkit-user-select: none; user-select: none; \}/);
    expect(coarse).toMatch(/:is\(input, textarea[^)]*\) \{ -webkit-user-select: text; user-select: text; \}/);
  });
});

describe('layout', () => {
  it('G4-04: the naming card is capped by the dynamic viewport height', () => {
    expect(screens).toMatch(/\.ag-naming__card \{[^}]*max-height: calc\(100dvh - 40px\)/);
    expect(screens).toMatch(/\.ag-naming__card \{[^}]*max-height: calc\(100dvh - 24px\)/);
  });
  it('P4-08: phone speed segments are at least 34 px wide and fill the 40 px pill', () => {
    expect(hud).toMatch(/\.ag-speed \.ag-seg__item \{ min-width: 32px; min-height: 40px;/);
    expect(hud).toMatch(/\.ag-speed \.ag-seg__item \{ min-width: 34px; padding: 0 4px; \}/);
    expect(block(hud, '(max-width: 374px)')).toMatch(/min-width: 30px/);
  });
  it('S12-04: the action prompt clears the raised guide and the tool rail; short windows hang the rail from the top', () => {
    const mid = block(hud, '(min-width: 721px) and (max-width: 1199px) and (min-height: 501px)');
    expect(mid).toMatch(/\.ag-toolhint \{[^}]*left: calc\(var\(--coach-w\) \+ var\(--edge\) \* 2\); right: calc\(var\(--edge\) \* 2 \+ 76px\)/);
    expect(block(hud, '(min-width: 721px) and (min-height: 501px) and (max-height: 760px)')).toMatch(/\.ag-toolrail \{ top: calc\(var\(--edge\) \+ var\(--topbar-h\) \+ 10px\); transform: none; \}/);
  });
  it('P6-04: upright card portraits are shown whole', () => {
    expect(shell).toMatch(/\.ag-portrait--upright img \{ position: relative; object-fit: contain;/);
  });
});
