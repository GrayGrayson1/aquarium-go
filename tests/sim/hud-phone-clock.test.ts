/**
 * Audit 2026-11-17 (area B) — the phone's clock pill: the amber manual-mode pill keeps its Hand and its time at 390 px
 * (B3, AUTO-042).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const hud = readFileSync(new URL('../../src/ui/styles/hud.css', import.meta.url), 'utf8');
/** Selectors of every one-declaration `{ display: none; }` rule. */
const hidden = [...hud.matchAll(/^\s*([^{}\n]+?)\s*\{\s*display: none;\s*\}/gm)].map((m) => m[1]);

describe('B3: the amber manual-mode pill on a phone', () => {
  it('no rule hides its Hand or its time', () => {
    const clock = hidden.filter((s) => /ag-clock-pill__(icon|time)/.test(s));
    expect(clock.length).toBeGreaterThan(0);
    for (const s of clock) expect(s, s).toContain(':not(.is-manual)');
  });
});
