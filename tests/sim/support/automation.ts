/**
 * Test support (not a test file): a small facility for the S3-D automation tests (chunk 5). Freshwater and marine tanks
 * with Auto Water Changers (lights on at 08:00), optional Auto Top-Offs, the Water room and the Live food room, and a
 * stock manager. Only src/sim, src/data and src/types are imported (AUTO-016 A4).
 */
import type { GameState, Tank, WaterClass } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { installEquipment } from '@/sim/care';
import { starterAquascape } from '@/sim/aquascape';
import { unlock } from '@/sim/facility';
import { addStaffDirect } from '@/sim/staff';
import { installFoodRoom, installWaterRoom } from '@/sim/automation';
import { advanceWorld } from '@/sim/world';

export interface FacilityOpts {
  /** Freshwater and marine tanks, each with an Auto Water Changer (10 % at 08:00). */
  fresh?: number;
  marine?: number;
  /** Auto Top-Offs on every tank. */
  ato?: boolean;
  water?: boolean;
  food?: boolean;
  /** A stock manager (skill 3: checks at 9 AM and 3 PM) with this daily budget; null: none. */
  rosa?: number | null;
  salt?: number;
  eggs?: number;
  veg?: number;
  money?: number;
  seed?: number;
  /** Start hour (default Day 4, 02:00). */
  hour?: number;
}

export interface Facility {
  g: GameState;
  fresh: Tank[];
  marine: Tank[];
}

export function facility(o: FacilityOpts = {}): Facility {
  const g = newGame({ starterId: 'betta', starterName: 'Ops', seed: o.seed ?? 7 });
  g.isShowcase = false;
  for (const id of Object.keys(g.creatures)) delete g.creatures[id];
  for (const id of [...g.tankOrder]) delete g.tanks[id];
  g.tankOrder = [];
  g.log = [];
  g.clock.hour = o.hour ?? 24 * 3 + 2;
  g.facility.level = 'showroom';
  g.finance.money = o.money ?? 50000;
  for (const k of ['gear_tier2', 'gear_autofeeder', 'gear_ato', 'marine_basics', 'nursery', 'staff']) unlock(g, k, { silent: true });
  g.inventory.foods = { flake_tropical: 3000, marine_pellets: 3000, micro_pellets: 3000, ...(o.veg !== undefined ? { blanched_veg: o.veg } : {}) };
  g.inventory.salt = o.salt ?? 0;
  if (o.eggs !== undefined) g.inventory.brineShrimpEggs = o.eggs;
  const rng = simRng(g);
  const make = (wc: WaterClass, i: number, name: string): Tank => {
    const t = createTank(g, 'g20L', wc, { cycled: true, placement: { x: -8 + i * 1.6, z: 2, rotY: 0 }, name });
    t.decor = starterAquascape(g, 'generic', t);
    t.lighting.onHour = 8;
    t.lighting.offHour = 20;
    installEquipment(g, t.id, 'auto_water_changer', { purchased: true });
    if (o.ato) installEquipment(g, t.id, 'ato', { purchased: true });
    const species = wc === 'freshwater_tropical' ? 'neon_tetra' : 'ocellaris_clownfish';
    for (let k = 0; k < 2; k++) addCreature(g, createCreature(g, rng, species, { ageDays: 60 }), t.id);
    return t;
  };
  const fresh: Tank[] = [];
  const marine: Tank[] = [];
  let i = 0;
  for (let k = 0; k < (o.fresh ?? 2); k++) fresh.push(make('freshwater_tropical', i++, `Fresh ${k + 1}`));
  for (let k = 0; k < (o.marine ?? 2); k++) marine.push(make('marine_fowlr', i++, `Marine ${k + 1}`));
  if (o.water !== false) installWaterRoom(g, g.clock.hour);
  if (o.food) installFoodRoom(g);
  if (o.rosa !== null && o.rosa !== undefined) {
    addStaffDirect(g, { name: 'Rosa Duarte', role: 'stock_manager', skill: 3, trait: 'quick_learner' });
    g.staff!.stockBudget = o.rosa;
  }
  return { g, fresh, marine };
}

/** Advance the world in `piece`-hour steps for `hours` (full fidelity unless `focus` names a tank). */
export function run(g: GameState, hours: number, piece = 0.5, opts: { forceFull?: boolean; focus?: string | null } = { forceFull: true }): void {
  for (let done = 0; done < hours - 1e-9; done += piece) step(g, Math.min(piece, hours - done), opts);
}

function step(g: GameState, dt: number, opts: { forceFull?: boolean; focus?: string | null }): void {
  advanceWorld(g, dt, { forceFull: opts.forceFull, focusTankId: opts.focus ?? null });
}
