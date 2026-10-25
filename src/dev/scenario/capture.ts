/**
 * captureRecipe (chunk 15, ADR-0051 decision 5): the game on screen as a recipe to edit and keep. It records what a
 * recipe can say (the shop, every tank with its exact water, gear, decor and lights, every animal with its genes and
 * condition, eggs and fry, staff); the rest (the market's listings and bids, shows, history, the log) is the game's own
 * and isn't carried over. Building the capture gives a game like the one captured, not the same one.
 */
import type { GameState } from '@/types';
import { ageDaysOf } from '@/sim/life/growth';
import { RESEARCH } from '@/data/research';
import { findSpecies } from '@/data/species';
import { dayOf, hourOfDay } from '@/sim/time';
import { RECIPE_FORMAT, RECIPE_VERSION, type AnimalRecipe, type ScenarioRecipe, type TankRecipe, type WaterValues } from './recipe';
import { WATER_RANGES } from './build';

const r2 = (v: number, places = 3) => Math.round(v * 10 ** places) / 10 ** places;
const isSexChanging = (speciesId: string) => {
  const sys = findSpecies(speciesId)?.sexSystem;
  return sys === 'protandrous' || sys === 'protogynous';
};

export function captureRecipe(g: GameState, name = `${g.shopName} (captured)`): ScenarioRecipe {
  const animalsIn = (tankId: string): AnimalRecipe[] =>
    Object.values(g.creatures)
      .filter((c) => c.tankId === tankId && (c.status === 'alive' || c.status === 'listed'))
      .map((c) => ({
        species: c.speciesId,
        name: c.name,
        ...(c.sex !== 'unknown' ? { sex: c.sex } : {}),
        ageDays: r2(ageDaysOf(c, g.clock.hour), 2),
        genes: { ...c.genome.alleles },
        potentials: { ...c.genome.potentials },
        ...(c.rareVariant ? { prismatic: true } : {}),
        stats: Object.fromEntries(Object.entries(c.stats).map(([k, v]) => [k, r2(v, 1)])),
        ...(c.illness ? { illness: { kind: c.illness.kind, severity: r2(c.illness.severity, 1) } } : {}),
        ...(c.life?.injury ? { injury: r2(c.life.injury, 1) } : {}),
        ...(c.favorite ? { favorite: true } : {}),
        ...(!c.captiveBred ? { wild: true } : {}),
        // the hidden role when the sex doesn't show yet, or a sex-changing species' role as it stands
        ...(c.sex === 'unknown' || isSexChanging(c.speciesId) ? { patch: { reproRole: c.reproRole } } : {}),
      }));
  const tanks: TankRecipe[] = g.tankOrder
    .map((id) => g.tanks[id])
    .filter(Boolean)
    .map((t) => {
      const values: WaterValues = {};
      for (const k of Object.keys(WATER_RANGES)) {
        const v = (t.water as unknown as Record<string, number>)[k];
        if (typeof v === 'number' && Number.isFinite(v)) (values as Record<string, number>)[k] = r2(v, 4);
      }
      const young = Object.values(g.clutches)
        .filter((cl) => cl.tankId === t.id && cl.stage !== 'in_pouch' && !(cl.visual === 'berried' && cl.stage === 'eggs') && cl.count > 0)
        .map((cl) => ({ species: cl.speciesId, stage: cl.stage === 'eggs' ? ('eggs' as const) : cl.stage === 'larvae' ? ('larvae' as const) : ('fry' as const), count: cl.count, nextStageInHours: r2(Math.max(0.25, cl.nextStageHour - g.clock.hour), 2) }));
      return {
        name: t.name,
        size: t.tierId,
        water: t.waterClass,
        purpose: t.purpose,
        ageDays: r2(Math.max(0, (g.clock.hour - t.createdHour) / 24), 1),
        matchWater: false,
        values,
        bareEquipment: true,
        equipment: t.equipment.map((e) => ({
          id: e.defId,
          condition: r2(e.condition, 3),
          on: e.on,
          ...(e.setting !== undefined ? { setting: e.setting } : {}),
          ...(e.failed && e.failMode ? { failed: e.failMode } : {}),
          exact: true,
        })),
        substrate: { kind: t.substrate.kind, depthCm: t.substrate.depthCm, color: t.substrate.color },
        backdrop: t.backdrop,
        lights: { preset: t.lighting.preset, intensity: t.lighting.intensity, on: t.lighting.onHour, off: t.lighting.offHour, moonlight: t.lighting.moonlight },
        decor: t.decor.length ? t.decor.map((d) => ({ id: d.defId, x: r2(d.x, 4), y: r2(d.y, 4), z: r2(d.z, 4), rotY: r2(d.rotY, 4), scale: r2(d.scale, 4), exact: true })) : 'none',
        animals: animalsIn(t.id),
        ...(young.length ? { young } : {}),
      };
    });
  const research = g.progress.research;
  return {
    format: RECIPE_FORMAT,
    version: RECIPE_VERSION,
    name: name.slice(0, 60),
    notes: `Captured from ${g.shopName} on day ${dayOf(g.clock.hour)}. The market's listings, shows and history aren't carried over.`,
    seed: g.seed,
    base: 'blank',
    shop: {
      name: g.shopName,
      money: r2(g.finance.money, 2),
      day: dayOf(g.clock.hour),
      hour: r2(hourOfDay(g.clock.hour), 2),
      facility: g.facility.level,
      openToPublic: g.facility.openToPublic,
      admission: g.facility.admission,
      unlocks: [...g.progress.unlocked],
      research: research.completed.filter((id) => RESEARCH.some((d) => d.id === id)),
      ...(research.activeId ? { researching: { id: research.activeId, hoursDone: r2(research.progressHours, 2) } } : {}),
      reputation: r2(g.progress.reputation, 1),
      mastery: { ...g.progress.mastery },
      guide: 'done',
      inventory: { foods: { ...g.inventory.foods }, salt: g.inventory.salt, brineShrimpEggs: g.inventory.brineShrimpEggs ?? 0 },
      ...(g.facility.water ? { waterRoom: true } : {}),
      ...(g.facility.food ? { foodRoom: true } : {}),
    },
    tanks,
    staff: (g.staff?.roster ?? []).map((m) => ({ role: m.role, name: m.name, skill: m.skill, trait: m.trait })),
    ...(g.staff ? { stockBudget: g.staff.stockBudget } : {}),
    open: { speed: 0 },
  };
}
