/**
 * Round-3 lane SIM (R01-01) — sliding every gifted starter piece a few cm the same way does not turn the gifted
 * layout into the player's own (show odds, Living Art, photo contests), while a real rearrangement still does.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import type { StarterId } from '@/data/species';
import { newGame } from '@/sim/newGame';
import { advanceWorld } from '@/sim/world';
import { moveDecor, giftedLayoutShare } from '@/sim/aquascape';
import { assessTank, fieldChances } from '@/sim/shows';
import { SHOW_CLASS_BY_ID, SHOW_TIERS } from '@/data/shows';
import { tankDims } from '@/sim/tankSpace';

function grown(starterId: StarterId): GameState {
  const g = newGame({ starterId, starterName: 'X', seed: 11, shopName: 'T' });
  g.finance.money = 1e6;
  advanceWorld(g, 24 * 10, { focusTankId: g.tankOrder[0] });
  return g;
}

function regionalWin(g: GameState, tankId: string): number {
  const def = SHOW_CLASS_BY_ID.scape_planted;
  const a = assessTank(g, g.tanks[tankId], def);
  return fieldChances('regional', a.expected, Math.round((SHOW_TIERS.regional.field[0] + SHOW_TIERS.regional.field[1]) / 2)).win;
}

describe('R01-01 — gifted layout share is translation tolerant', () => {
  it('a uniform 3-4 cm slide of every piece keeps the layout gifted and out of the Regional running', () => {
    for (const [starter, dx, dz] of [['betta', 0.031, 0], ['axolotl', 0, 0.035], ['pea_puffer', -0.04, 0.01]] as const) {
      const g = grown(starter);
      const t = g.tanks[g.tankOrder[0]];
      let moved = 0;
      for (const d of [...t.decor]) if (moveDecor(g, t.id, d.id, { x: d.x + dx, z: d.z + dz, rotY: d.rotY, scale: d.scale }).ok) moved++;
      expect(moved, starter).toBeGreaterThan(t.decor.length * 0.6);
      expect(giftedLayoutShare(g, t), starter).toBeGreaterThanOrEqual(0.6);
      expect(regionalWin(g, t.id), starter).toBeLessThan(0.05);
    }
  });

  it('a real rearrangement (mirrored, or every piece moved 10+ cm) still reads as the player’s own', () => {
    const g = grown('betta');
    const t = g.tanks[g.tankOrder[0]];
    const mirrored = structuredClone(t);
    for (const d of mirrored.decor) d.x = -d.x;
    expect(giftedLayoutShare(g, mirrored)).toBeLessThan(0.5);
    const { L, W } = tankDims(t);
    const moved = structuredClone(t);
    moved.decor.forEach((d, i) => {
      const a = i * 2.4;
      d.x = Math.max(-L / 2 + 0.03, Math.min(L / 2 - 0.03, d.x + 0.11 * Math.cos(a)));
      d.z = Math.max(-W / 2 + 0.03, Math.min(W / 2 - 0.03, d.z + 0.11 * Math.sin(a)));
    });
    expect(giftedLayoutShare(g, moved)).toBeLessThan(0.5);
  });
});
