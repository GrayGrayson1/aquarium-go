/**
 * Audit 2026-11-17, B20 — Space pauses the game from the scene, but inside a panel, a sheet or a popover it is the
 * page's own key (it scrolls the list): with a panel just opened, focus is on its title and Space used to pause.
 */
import { describe, it, expect } from 'vitest';
import { isInSheet, isOnControl } from '@/ui/hud/GameHUD';

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
