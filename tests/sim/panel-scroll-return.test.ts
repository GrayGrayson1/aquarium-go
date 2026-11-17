/**
 * Audit 2026-11-17, B7 — coming back from an offer, a species page or a show's entry, the list is where the player
 * left it (it used to jump to the top every time); a tab switch and a sub-view opening still start at the top.
 */
import { describe, it, expect } from 'vitest';
import { scrollTopFor } from '@/ui/panels/common/PanelLayout';

const tops = new Map([
  ['shop', 1240],
  ['species', 860],
]);

describe('B7: a list’s scroll around its sub-views', () => {
  it('back from a sub-view to the list it opened from: where the player was', () => {
    expect(scrollTopFor({ list: 'shop', sub: true }, { list: 'shop', sub: false }, tops)).toBe(1240);
    expect(scrollTopFor({ list: 'species', sub: true }, { list: 'species', sub: false }, tops)).toBe(860);
  });
  it('opening a sub-view, switching tabs, or a list never scrolled: the top', () => {
    expect(scrollTopFor({ list: 'shop', sub: false }, { list: 'shop', sub: true }, tops)).toBe(0);
    expect(scrollTopFor({ list: 'shop', sub: false }, { list: 'supplies', sub: false }, tops)).toBe(0);
    expect(scrollTopFor({ list: 'shop', sub: true }, { list: 'supplies', sub: false }, tops)).toBe(0);
    expect(scrollTopFor({ list: 'trends', sub: true }, { list: 'trends', sub: false }, tops)).toBe(0);
    expect(scrollTopFor({}, {}, tops)).toBe(0); // a panel that names no list
  });
});
