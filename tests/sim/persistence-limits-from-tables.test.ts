// @vitest-environment node
/**
 * lane:core (ADR-0037, owner question G1; B-203) — repairState reads the Water room's limits from WATER_ROOM and the
 * rare-variant kinds from RARE_VARIANT_KINDS, never from copies of them: with both tables made bigger here (a fourth
 * prep level, five reservoirs, a second kind), a save at the new limits loads unchanged and one past them is still
 * repaired. chunk 7 (B-203, REL-024): so do the Live food room's cone and jar limits (FOOD_ROOM; the load used to cut
 * at 12), the staff skill range (STAFF_MAX_SKILL) and the rare-variant origins (RARE_VARIANT_ORIGINS), made bigger
 * here too. core-save-forward-safety pins the real tables to the save format.
 */
import { describe, it, expect, vi } from 'vitest';
import { newGame } from '@/sim/newGame';
import { installWaterRoom, installFoodRoom } from '@/sim/automation';
import { repairState } from '@/persistence/migrations';
import { clonePlain } from '@/sim/economy/util';

vi.mock('@/data/catalog/machines', async (importOriginal) => {
  const m = await importOriginal<typeof import('@/data/catalog/machines')>();
  return { ...m, WATER_ROOM: { ...m.WATER_ROOM, prepRates: [6, 9, 12, 15], prepPrices: [380, 760, 1140], maxReservoirs: 5 }, FOOD_ROOM: { ...m.FOOD_ROOM, maxCones: 14, maxJars: 16 } };
});
vi.mock('@/data/rarity', async (importOriginal) => {
  const m = await importOriginal<typeof import('@/data/rarity')>();
  return { ...m, RARE_VARIANT_KINDS: { ...m.RARE_VARIANT_KINDS, opaline: true }, RARE_VARIANT_ORIGINS: { ...m.RARE_VARIANT_ORIGINS, gifted: true } };
});
vi.mock('@/data/staff', async (importOriginal) => {
  const m = await importOriginal<typeof import('@/data/staff')>();
  return { ...m, STAFF_MAX_SKILL: 7 };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

function world(): { raw: Json; starterId: string } {
  const g = newGame({ starterId: 'betta', starterName: 'Opal', seed: 37 });
  installWaterRoom(g, g.clock.hour);
  installFoodRoom(g);
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

describe('chunk 7 (B-203): the Live food room, staff skill and rare-variant origin limits come from the tables too', () => {
  const cones = (n: number) => Array.from({ length: n }, () => ({ startedHour: null }));

  it('cones and jars the Live food room allows load unchanged (past the old cut at 12); more are cut to the limit', () => {
    const { raw } = world();
    raw.facility.food.cones = cones(14);
    raw.facility.food.jars = cones(16);
    expect(repairState(raw)).toEqual([]);
    expect(raw.facility.food.cones).toHaveLength(14);
    expect(raw.facility.food.jars).toHaveLength(16);
    raw.facility.food.cones = cones(15);
    raw.facility.food.jars = cones(17);
    expect(repairState(raw)).toEqual(expect.arrayContaining(['facility.food.cones: unreadable entries removed', 'facility.food.jars: unreadable entries removed']));
    expect(raw.facility.food.cones).toHaveLength(14);
    expect(raw.facility.food.jars).toHaveLength(16);
  });

  it('a staff skill the table allows loads unchanged; past it, it is clamped to the top', () => {
    const { raw } = world();
    const member = { id: 'st_1', role: 'aquarist', trait: 'quick_learner', skill: 7, tankIds: [], wage: 60, xp: 0, hiredHour: 0, avatarSeed: 1, name: 'Ada Test' };
    raw.staff = { roster: [member], candidates: [], feeds: [], talks: [], care: {}, warned: {} };
    repairState(raw);
    expect(raw.staff.roster[0].skill).toBe(7);
    raw.staff.roster[0].skill = 8;
    repairState(raw);
    expect(raw.staff.roster[0].skill).toBe(7);
  });

  it('a rare-variant origin the table lists loads unchanged; one it doesn’t becomes the shop', () => {
    const { raw, starterId } = world();
    raw.creatures[starterId].rareVariant = { kind: 'prismatic', origin: 'gifted', visualSeed: 77 };
    expect(repairState(raw)).toEqual([]);
    expect(raw.creatures[starterId].rareVariant).toEqual({ kind: 'prismatic', origin: 'gifted', visualSeed: 77 });
    raw.creatures[starterId].rareVariant = { kind: 'prismatic', origin: 'stolen', visualSeed: 77 };
    repairState(raw);
    expect(raw.creatures[starterId].rareVariant).toEqual({ kind: 'prismatic', origin: 'shop', visualSeed: 77 });
  });
});
