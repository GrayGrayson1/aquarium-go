/**
 * Audit 2026-11-17, B20 — Space pauses the game from the scene, but inside a panel, a sheet or a popover it is the
 * page's own key (it scrolls the list): with a panel just opened, focus is on its title and Space used to pause.
 */
import { describe, it, expect } from 'vitest';
import { isInSheet, isOnControl, sheetScroller } from '@/ui/hud/GameHUD';

/** A focused element inside whatever the `inside` selectors name. */
const at = (...inside: string[]) => ({ target: { closest: (sel: string) => (sel.split(',').some((s) => inside.includes(s.trim())) ? {} : null) } }) as unknown as KeyboardEvent;

describe('B20: Space inside a panel scrolls it', () => {
  it('a panel’s title, a sheet’s body or a popover keeps Space', () => {
    expect(isInSheet(at('.pn-sheet'))).toBe(true);
    expect(isInSheet(at('.ag-sheet'))).toBe(true);
    expect(isInSheet(at('.ag-popover'))).toBe(true);
  });
  it('the scene (the page itself) still pauses, and a control keeps Space for itself', () => {
    expect(isInSheet(at())).toBe(false);
    expect(isInSheet({ target: null } as unknown as KeyboardEvent)).toBe(false);
    expect(isOnControl(at('button'))).toBe(true);
  });
});

describe('B20 review: Space scrolls the panel’s list, even from its title', () => {
  /** A tiny tree: sheet > [head > title, body], with the body scrolling. */
  function tree() {
    const box = (cls: string, y: string, scroll = 0, parent: Record<string, unknown> | null = null) => ({ cls, y, scrollHeight: scroll, clientHeight: 100, parentElement: parent });
    const sheet = box('pn-sheet', 'visible', 0, { cls: 'host', y: 'visible', scrollHeight: 0, clientHeight: 0, parentElement: null });
    const head = box('pn-head', 'visible', 0, sheet);
    const title = box('pn-head__title', 'visible', 0, head);
    const body = box('pn-body', 'auto', 900, sheet);
    const row = box('pn-row', 'visible', 0, body);
    const all = [sheet, head, title, body, row];
    for (const el of all)
      Object.assign(el, {
        closest: (sel: string) => {
          for (let e: typeof el | null = el; e; e = e.parentElement as typeof el | null) if (sel.split(',').some((s) => s.trim() === `.${e.cls}`)) return e;
          return null;
        },
        querySelector: (sel: string) => (el === sheet && sel.split(',').some((s) => s.trim() === '.pn-body') ? body : null),
      });
    return { title, body, row };
  }
  it('from the title (outside the body) it is the body; from a row inside, its own scroller', () => {
    const t = tree();
    const real = globalThis.getComputedStyle;
    globalThis.getComputedStyle = ((el: { y: string }) => ({ overflowY: el.y })) as unknown as typeof getComputedStyle;
    try {
      expect(sheetScroller(t.title as unknown as HTMLElement)).toBe(t.body);
      expect(sheetScroller(t.row as unknown as HTMLElement)).toBe(t.body);
    } finally {
      globalThis.getComputedStyle = real;
    }
  });
});
