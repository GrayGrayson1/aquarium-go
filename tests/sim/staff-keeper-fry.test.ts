/**
 * Audit 2026-11-17 (H2; the owner's choice, "keepers feed fry"): on their rounds keepers give the young in their tanks
 * their first foods from stock, through the same feed the player and a live-food doser use; they flag it when none of
 * the young's foods is in stock, and leave a tank with a working doser to the doser.
 */
import { describe, it, expect } from 'vitest';
import type { GameState, Tank } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { createCreature, addCreature } from '@/sim/life';
import { simRng } from '@/sim/rng';
import { getSpecies } from '@/data/species';
import { createClutch, currentPhase } from '@/sim/life/breeding/clutch';
import { moduleFor } from '@/sim/life/breeding/registry';
import { installEquipment } from '@/sim/care';
import { addStaffDirect, keeperVisit } from '@/sim/staff';
import { BRINE, INFUSORIA } from '@/data/catalog/machines';

function nursery(): { g: GameState; tank: Tank; m: ReturnType<typeof addStaffDirect>; clutchId: string } {
  const g = newGame({ starterId: 'betta', starterName: 'Ember', seed: 51 });
  g.isShowcase = false;
  g.inventory.foods = {};
  const tank = createTank(g, 'g20L', 'freshwater_tropical', { cycled: true, placement: { x: 6, z: 2, rotY: 0 }, name: 'Nursery 1' });
  tank.water.tempC = 27;
  const sp = getSpecies('betta');
  const rng = simRng(g);
  const elsewhere = createTank(g, 'g10', 'freshwater_tropical', { cycled: true, placement: { x: 9, z: 2, rotY: 0 }, name: 'Pair Tank' });
  const mother = addCreature(g, createCreature(g, rng, 'betta', { sex: 'female', ageDays: 40, name: 'Cinder' }), elsewhere.id);
  const father = addCreature(g, createCreature(g, rng, 'betta', { sex: 'male', ageDays: 40, name: 'Blaze' }), elsewhere.id);
  const cl = createClutch(g, { sp, tank, mother, father, hour: g.clock.hour, stage: 'fry', count: 40, visual: 'fry_cloud', nextStageHour: g.clock.hour + 200 });
  cl.stageSinceHour = g.clock.hour - sp.breeding.fryRearingHours * 0.5; // past the yolk, into the fry phase
  const m = addStaffDirect(g, { name: 'Maya Okafor', role: 'aquarist', skill: 2, trait: 'gentle_hands', tankIds: [tank.id] });
  return { g, tank, m, clutchId: cl.id };
}

describe('Audit 2026-11-17 (H2): keepers feed fry their first foods', () => {
  it('a round with baby brine in stock feeds the fry from it (the doser’s serving: one per 20 young)', () => {
    const { g, tank, m, clutchId } = nursery();
    const cl = g.clutches[clutchId];
    expect(currentPhase(cl, moduleFor(getSpecies('betta')))?.foods).toContain('baby_brine');
    g.inventory.foods[BRINE] = 10;
    keeperVisit(g, m, tank.id, 'morning', g.clock.hour);
    expect(g.inventory.foods[BRINE]).toBe(8);
    expect(tank.breedingEnv?.foodSeen?.baby_brine).toBe(g.clock.hour);
    expect(g.log.some((e) => /couldn’t feed the fry/.test(e.text))).toBe(false);
    // fed a moment ago: the next visit leaves them be
    keeperVisit(g, m, tank.id, 'midday', g.clock.hour + 1);
    expect(g.inventory.foods[BRINE]).toBe(8);
  });

  it('with none of their foods in stock the keeper says so, once a round', () => {
    const { g, tank, m } = nursery();
    keeperVisit(g, m, tank.id, 'morning', g.clock.hour);
    const said = g.log.filter((e) => e.text === 'Maya couldn’t feed the fry in Nursery 1: no baby brine or infusoria in stock. Buy food in Market › Supplies.');
    expect(said.length).toBe(1);
    expect(m.today?.issues).toContain('No first foods for the fry in Nursery 1');
  });

  it('a tank with a working live-food doser is left to the doser (no double feeding)', () => {
    const { g, tank, m } = nursery();
    g.inventory.foods[BRINE] = 10;
    g.inventory.foods[INFUSORIA] = 10;
    expect(installEquipment(g, tank.id, 'live_food_doser', { purchased: true }).ok).toBe(true);
    keeperVisit(g, m, tank.id, 'morning', g.clock.hour);
    expect(g.inventory.foods[BRINE]).toBe(10);
    expect(g.inventory.foods[INFUSORIA]).toBe(10);
    expect(g.log.some((e) => /couldn’t feed the fry/.test(e.text))).toBe(false);
  });
});
