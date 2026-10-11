// @vitest-environment node
/**
 * lane:ui-shell (B-178, ADR-0022) — the water report's Stability meter shows a word beside its number, on the meter's
 * own colour bands (Meter tone 'auto': 60+ good, 30–59 watch, under 30 danger).
 */
import { describe, it, expect } from 'vitest';
import { stabilityWord } from '@/ui/cards/TankCard';

describe('stability word', () => {
  it('Stable from 60, Sensitive from 30, Fragile below', () => {
    expect([100, 60, 59.9, 30, 29.9, 0].map(stabilityWord)).toEqual(['Stable', 'Stable', 'Sensitive', 'Sensitive', 'Fragile', 'Fragile']);
  });
});
