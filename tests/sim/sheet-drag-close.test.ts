/**
 * Audit 2026-11-17, B18 — More, Settings and the tank card swipe closed from their grab bar and header, by the rule
 * the panels use (120 px, or a flick over 700 px/s); a press on a control or in the list never starts the drag.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { startsDrag, swipedDown } from '@/ui/common/dragClose';

/** An element whose `closest` answers from the selectors it matches (itself or an ancestor). */
const el = (...matches: string[]) => ({ closest: (sel: string) => (sel.split(',').some((s) => matches.includes(s.trim())) ? {} : null) }) as unknown as Element;

describe('B18: swiping a phone sheet closed', () => {
  it('PanelHost’s rule: 120 px down, or a quick flick', () => {
    expect(swipedDown({ offset: { y: 121 }, velocity: { y: 0 } })).toBe(true);
    expect(swipedDown({ offset: { y: 40 }, velocity: { y: 900 } })).toBe(true);
    expect(swipedDown({ offset: { y: 100 }, velocity: { y: 300 } })).toBe(false);
    expect(swipedDown({ offset: { y: -200 }, velocity: { y: -900 } })).toBe(false);
  });

  it('starts on the grab bar or the header, never on a control or the list', () => {
    expect(startsDrag(el('.ag-more__head'), '.ag-more__grab, .ag-more__head')).toBe(true);
    expect(startsDrag(el('.ag-more__grab'), '.ag-more__grab, .ag-more__head')).toBe(true);
    expect(startsDrag(el('.ag-more__head', 'button'), '.ag-more__grab, .ag-more__head')).toBe(false);
    expect(startsDrag(el('.ag-more__grid'), '.ag-more__grab, .ag-more__head')).toBe(false);
    expect(startsDrag(el('.ag-sheet__head', '[role="tab"]'), '.ag-sheet__head')).toBe(false);
    expect(startsDrag(null, '.ag-sheet__head')).toBe(false);
  });

  it('the browser doesn’t take those swipes as a pan', () => {
    const read = (f: string) => readFileSync(new URL(`../../src/ui/styles/${f}`, import.meta.url), 'utf8');
    expect(read('nav.css')).toMatch(/\.ag-more__grab, \.ag-more__head \{ touch-action: none; \}/);
    expect(read('shell.css')).toMatch(/\.ag-sheet\.ag-sheet--bottom \{ touch-action: none; \}/);
  });
});
