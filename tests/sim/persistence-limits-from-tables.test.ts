// @vitest-environment node
/**
 * lane:core (ADR-0037, owner question G1; B-203) — repairState reads the Water room's limits from WATER_ROOM and the
 * rare-variant kinds from RARE_VARIANT_KINDS, never from copies of them: with both tables made bigger here (a fourth
 * prep level, five reservoirs, a second kind), a save at the new limits loads unchanged and one past them is still
 * repaired. core-save-forward-safety pins the real tables to the save format.
 */
import { describe, it, expect, vi } from 'vitest';
import { newGame } from '@/sim/newGame';
import { installWaterRoom } from '@/sim/automation';
import { repairState } from '@/persistence/migrations';
import { clonePlain } from '@/sim/economy/util';

vi.mock('@/data/catalog/machines', async (importOriginal) => {
  const m = await importOriginal<typeof import('@/data/catalog/machines')>();
  return { ...m, WATER_ROOM: { ...m.WATER_ROOM, prepRates: [6, 9, 12, 15], prepPrices: [380, 760, 1140], maxReservoirs: 5 } };
});
vi.mock('@/data/rarity', async (importOriginal) => {
  const m = await importOriginal<typeof import('@/data/rarity')>();
  return { ...m, RARE_VARIANT_KINDS: { ...m.RARE_VARIANT_KINDS, opaline: true } };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

function world(): { raw: Json; starterId: string } {
  const g = newGame({ starterId: 'betta', starterName: 'Opal', seed: 37 });
  installWaterRoom(g, g.clock.hour);
  const starter = Object.values(g.creatures).find((c) => c.isStarter)!;
  return { raw: clonePlain(g) as Json, starterId: starter.id };
}

describe('ADR-0037 (G1): the limits a save is repaired against come from the game’s tables', () => {
  it('a prep level and a reservoir count the Water room’s table allows load unchanged; past them they reset', () => {
    const { raw } = world();
    raw.facility.water.prepLevel = 3;
    raw.facility.water.reservoirs = 5;
    expect(repairState(raw)).toEqual([]);
    expect(raw.facility.water).toMatchObject({ prepLevel: 3, reservoirs: 5 });
    raw.facility.water.prepLevel = 4;
    raw.facility.water.reservoirs = 6;
    expect(repairState(raw)).toEqual(expect.arrayContaining(['facility.water.prepLevel → 0', 'facility.water.reservoirs → 0']));
    expect(raw.facility.water).toMatchObject({ prepLevel: 0, reservoirs: 0 });
  });

  it('a rare-variant kind the table lists loads unchanged; one it doesn’t is removed', () => {
    const { raw, starterId } = world();
    raw.creatures[starterId].rareVariant = { kind: 'opaline', origin: 'bred', visualSeed: 77 };
    expect(repairState(raw)).toEqual([]);
    expect(raw.creatures[starterId].rareVariant).toEqual({ kind: 'opaline', origin: 'bred', visualSeed: 77 });
    raw.creatures[starterId].rareVariant = { kind: 'glimmer', origin: 'bred', visualSeed: 77 };
    expect(repairState(raw).some((r) => r.endsWith('.rareVariant: unreadable, removed'))).toBe(true);
    expect(raw.creatures[starterId].rareVariant).toBeUndefined();
  });
});
