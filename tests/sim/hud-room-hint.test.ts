/**
 * Audit 2026-11-17, B12 — the room view's one-time "how to move" line counts as seen only once it is on screen (on a
 * phone the guide card hid it and it was used up unseen), and on a phone the guide no longer hides Reset view: the
 * chips sit just above the guide card.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { onScreen } from '@/ui/hud/RoomChips';

const rects = (n: number) => ({ length: n }) as DOMRectList;

describe('B12: the room view hint and chips', () => {
  it('a hint under display:none (or a hidden sheet) is not on screen', () => {
    expect(onScreen(null)).toBe(false);
    expect(onScreen({ getClientRects: () => rects(1), checkVisibility: () => false })).toBe(false);
    expect(onScreen({ getClientRects: () => rects(1), checkVisibility: (o) => !!o?.visibilityProperty })).toBe(true);
    expect(onScreen({ getClientRects: () => rects(0) })).toBe(false); // an engine without checkVisibility
    expect(onScreen({ getClientRects: () => rects(1) })).toBe(true);
  });

  it('on a phone the guide card moves the room chips above it instead of hiding them', () => {
    const hud = readFileSync(new URL('../../src/ui/styles/hud.css', import.meta.url), 'utf8');
    expect(hud).not.toMatch(/\.ag-hud:has\(\.ag-hud__coach \.ag-coach\) \.ag-hud__cam--room \{ display: none; \}/);
    expect(hud).toMatch(/\.ag-hud:has\(\.ag-hud__coach \.ag-coach\) \.ag-hud__cam--room \{ bottom: calc\(var\(--coach-clear,/);
  });
});
