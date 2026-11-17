/**
 * Audit 2026-11-17, B23 — the Log and the bell use one rule for "… ago": the Log said "0 days ago" from 23.5 to 24
 * game hours, and "yesterday" where the bell said "2 days ago".
 */
import { describe, it, expect } from 'vitest';
import { relTime } from '@/ui/panels/common/format';
import { agoText } from '@/ui/common/format';

describe('B23: one “… ago”', () => {
  it('never “0 days ago”', () => {
    for (let dh = 23.4; dh <= 24.1; dh += 0.05) expect(relTime(100 - dh, 100)).not.toMatch(/^0 /);
    expect(relTime(76.2, 100)).toBe('yesterday'); // 23.8 h
  });
  it('the Log and the bell agree at every age', () => {
    for (let dh = 0; dh < 24 * 9; dh += 0.37) expect(relTime(1000 - dh, 1000), `${dh} h`).toBe(agoText(1000 - dh, 1000));
    expect(relTime(1000 - 40, 1000)).toBe('2 days ago');
  });
});
