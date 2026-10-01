/**
 * Round 3 QA (lane:qa-r3) — actions that work but carry a warning say so (`ActionResult.caution`), so quiet controls
 * (a click in the water, a setpoint stepper, the lights schedule) still surface it; a purchase keeps the install's
 * heads-up; a thermostat set outside the animals' range is called out.
 */
import { describe, it, expect } from 'vitest';
import type { GameState } from '@/types';
import { newGame } from '@/sim/newGame';
import { createTank } from '@/sim/tanks';
import { feedTank, installEquipment, setEquipment, setLighting } from '@/sim/care';
import { buyEquipment } from '@/sim/economy';
import { unlock } from '@/sim/facility/progression';

function seahorseGame(): { s: GameState; tankId: string } {
  const s = newGame({ starterId: 'lined_seahorse', starterName: 'Ripple', seed: 7 });
  s.isShowcase = true; // no log noise
  const tankId = s.tankOrder[0];
  return { s, tankId };
}

describe('qa-r3: feeding reports its caveats', () => {
  it('flakes for seahorses: worked, but flagged — nothing here eats it', () => {
    const { s, tankId } = seahorseGame();
    s.inventory.foods.flake_tropical = 50;
    const r = feedTank(s, tankId, 'flake_tropical');
    expect(r.ok).toBe(true);
    expect(r.caution).toBe(true);
    expect(r.message).toMatch(/Nothing in this tank eats it/);
  });

  it('an empty tank: the food just rots (said, and flagged)', () => {
    const { s } = seahorseGame();
    const t = createTank(s, 'g10', 'freshwater_tropical', { cycled: true, placement: { x: 1.5, z: 0, rotY: 0 } });
    s.inventory.foods.flake_tropical = 50;
    const r = feedTank(s, t.id, 'flake_tropical');
    expect(r.ok).toBe(true);
    expect(r.caution).toBe(true);
    expect(r.message).toMatch(/Nothing lives in this tank yet/);
  });

  it('mysis for seahorses is an ordinary feed (no caution)', () => {
    const { s, tankId } = seahorseGame();
    s.inventory.foods.mysis_frozen = 200;
    const r = feedTank(s, tankId, 'mysis_frozen');
    expect(r.ok).toBe(true);
    expect(r.caution).toBeFalsy();
  });

  it('krill & silversides are too big for seahorses (no longer tagged mysis)', () => {
    const { s, tankId } = seahorseGame();
    s.inventory.foods.meaty_frozen = 40;
    const r = feedTank(s, tankId, 'meaty_frozen');
    expect(r.caution).toBe(true);
    expect(r.message).toMatch(/Nothing in this tank eats it/);
  });
});

describe('qa-r3: thermostat settings are checked against the residents', () => {
  it('a heater set above the seahorses’ range says so, with the setting to aim for', () => {
    const { s, tankId } = seahorseGame();
    const heater = s.tanks[tankId].equipment.find((e) => e.defId.startsWith('heater'));
    expect(heater).toBeTruthy();
    const r = setEquipment(s, tankId, heater!.id, { setting: 29 });
    expect(r.ok).toBe(true);
    expect(r.caution).toBe(true);
    expect(r.message).toMatch(/29\.0 °C is warmer than the 22–25 °C/);
    expect(r.message).toMatch(/About 23\.5 °C suits/);
  });

  it('a setting inside the range is quiet', () => {
    const { s, tankId } = seahorseGame();
    const heater = s.tanks[tankId].equipment.find((e) => e.defId.startsWith('heater'))!;
    const r = setEquipment(s, tankId, heater.id, { setting: 24 });
    expect(r.caution).toBeFalsy();
    expect(r.message).not.toMatch(/Heads-up/);
  });
});

describe('qa-r3: buying gear keeps the install’s heads-up', () => {
  it('an autofeeder for seahorses: receipt + why it can’t feed them, flagged', () => {
    const { s, tankId } = seahorseGame();
    unlock(s, 'gear_autofeeder', { silent: true });
    s.finance.money = 1000;
    const r = buyEquipment(s, tankId, 'autofeeder');
    expect(r.ok).toBe(true);
    expect(r.caution).toBe(true);
    expect(r.message).toMatch(/^Installed Autofeeder in .+ \(\$35\)\. Heads-up: /);
    expect(r.message).toMatch(/autofeeder can’t feed/);
  });

  it('installing it from storage is flagged the same way', () => {
    const { s, tankId } = seahorseGame();
    const r = installEquipment(s, tankId, 'autofeeder', { purchased: true });
    expect(r.ok).toBe(true);
    expect(r.caution).toBe(true);
  });
});

describe('qa-r3: the lights schedule warns once, not on every intensity step', () => {
  it('a long day is flagged when the hours change, not when only the intensity does', () => {
    const { s, tankId } = seahorseGame();
    const long = setLighting(s, tankId, { onHour: 5, offHour: 23 });
    expect(long.caution).toBe(true);
    const dim = setLighting(s, tankId, { intensity: 0.7 });
    expect(dim.caution).toBeFalsy();
    expect(dim.message).toMatch(/Long photoperiods/); // still in the message where it is read
  });
});
