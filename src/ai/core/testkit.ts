/**
 * Headless helpers for building AI worlds without the game store (tests, sandboxes, benchmarks).
 * OWNER: lane "behavior".
 */
import type { Creature, DecorDef, DecorInstance, Tank, WaterClass } from '@/types';
import { findSpecies } from '@/data/species';
import { getDecorDef } from '@/data/catalog/decor';
import { personalityModifiers } from '@/sim/life';
import { createWorld, syncWorld, type AIHooks, type AIWorld } from './world';

const HAB = { hides: 0, cover: 0, sightBreak: 0, nitrateUptake: 0, oxygen: 0, grazing: 0, enrichment: 0, hitching: 0 };

/** Minimal decor definitions (independent of the aquascape catalog). */
export const TEST_DECOR: Record<string, DecorDef> = {
  test_rock: {
    id: 'test_rock',
    name: 'Test rock',
    category: 'hardscape',
    price: 0,
    unlock: null,
    environments: ['freshwater', 'marine'],
    size: { w: 0.14, d: 0.1, h: 0.09 },
    scaleRange: [0.5, 2],
    habitat: { ...HAB, hides: 1 },
    beauty: 1,
    visual: 'rock',
    anchors: [
      { kind: 'cave', offset: [0, 0.02, 0.06], capacity: 1 },
      { kind: 'hide', offset: [0.05, 0.02, -0.06], capacity: 2 },
      { kind: 'burrow', offset: [-0.09, 0, 0.05], capacity: 1 },
    ],
    description: '',
  },
  test_branch: {
    id: 'test_branch',
    name: 'Test branch',
    category: 'hardscape',
    price: 0,
    unlock: null,
    environments: ['freshwater', 'marine'],
    size: { w: 0.06, d: 0.05, h: 0.2 },
    scaleRange: [0.5, 2],
    habitat: { ...HAB, hitching: 3 },
    beauty: 1,
    visual: 'branch',
    anchors: [
      { kind: 'hitch', offset: [0.03, 0.12, 0], capacity: 1 },
      { kind: 'hitch', offset: [-0.03, 0.17, 0], capacity: 1 },
      { kind: 'perch', offset: [0, 0.2, 0], capacity: 1 },
    ],
    description: '',
  },
  test_plant: {
    id: 'test_plant',
    name: 'Test plant',
    category: 'plant',
    price: 0,
    unlock: null,
    environments: ['freshwater'],
    size: { w: 0.08, d: 0.06, h: 0.18 },
    scaleRange: [0.5, 2],
    habitat: { ...HAB, cover: 0.5 },
    beauty: 1,
    visual: 'plant',
    anchors: [{ kind: 'leaf_rest', offset: [0.02, 0.16, 0.02], capacity: 1 }],
    description: '',
  },
  test_anemone: {
    id: 'test_anemone',
    name: 'Test anemone',
    category: 'anemone',
    price: 0,
    unlock: null,
    environments: ['marine'],
    size: { w: 0.1, d: 0.1, h: 0.08 },
    scaleRange: [0.5, 2],
    habitat: { ...HAB },
    beauty: 1,
    visual: 'anemone',
    anchors: [{ kind: 'host', offset: [0, 0.06, 0], capacity: 2 }],
    description: '',
  },
};

export const resolveTestDecor = (id: string): DecorDef | undefined => TEST_DECOR[id] ?? getDecorDef(id);

export function makeTestTank(opts: { id?: string; tierId?: string; waterClass?: WaterClass; decor?: DecorInstance[]; substrateCm?: number; hourOn?: number; hourOff?: number } = {}): Tank {
  const wc = opts.waterClass ?? 'freshwater_planted';
  const marine = wc.startsWith('marine') || wc === 'reef';
  return {
    id: opts.id ?? 'tank_test',
    name: 'Test tank',
    tierId: opts.tierId ?? 'g29',
    waterClass: wc,
    environment: marine ? 'marine' : 'freshwater',
    purpose: 'display',
    placement: { x: 0, z: 0, rotY: 0 },
    water: {
      tempC: 25,
      pH: 7.2,
      ammonia: 0,
      nitrite: 0,
      nitrate: 5,
      oxygen: 1,
      salinitySG: marine ? 1.025 : 1,
      gh: 8,
      kh: 5,
      detritus: 0,
      algae: 5,
      clarity: 1,
      bioMaturity: 1,
      foodInWater: 0,
      foodByTag: {},
      level: 1,
    },
    equipment: [],
    decor: opts.decor ?? [],
    substrate: { kind: 'sand', depthCm: opts.substrateCm ?? 4, color: '#ccbb99' },
    backdrop: 'black',
    lighting: { preset: 'daylight', intensity: 1, onHour: opts.hourOn ?? 7, offHour: opts.hourOff ?? 22, moonlight: true },
    createdHour: 0,
    cache: { stockingLoad: 0, beauty: 50, welfare: 100, exhibitScore: 50, stability: 80, status: 'good', compatVerdict: 'excellent' },
    signage: false,
    lastMaintenanceHour: 0,
    tapPressure: 0,
  };
}

let seq = 0;
export function makeTestCreature(speciesId: string, tankId: string, over: Partial<Creature> & { temperament?: number; curiosity?: number } = {}): Creature {
  const sp = findSpecies(speciesId);
  const id = over.id ?? `cr_test_${speciesId}_${++seq}`;
  const t = over.temperament ?? 50;
  const cu = over.curiosity ?? 50;
  const c: Creature = {
    id,
    speciesId,
    name: speciesId,
    sex: over.sex ?? 'unknown',
    reproRole: 'undifferentiated',
    bornHour: -500,
    lifeStage: 'adult',
    sizeCm: (sp?.adultSizeCm ?? 5) * 0.9,
    tankId,
    genome: { alleles: {}, potentials: { size: 50, color: 50, pattern: 50, structure: 50, fertility: 50, hardiness: 50, temperament: t, curiosity: cu } },
    appearance: sp ? { ...sp.genetics.baseVisual } : ({} as Creature['appearance']),
    morphName: 'Wild type',
    personality: over.personality ?? [],
    stats: { health: 100, hunger: 30, stress: 10, energy: 80, social: 70, comfort: 80, breedingReadiness: 0, enrichment: 60 },
    repro: { stage: 'idle', stageSinceHour: 0, totalClutches: 0, totalOffspringRaised: 0 },
    lineage: { motherId: null, fatherId: null, generation: 0, lineId: 'test', breederName: 'test' },
    captiveBred: true,
    acquiredHour: 0,
    purchasePrice: 0,
    status: 'alive',
    history: [],
    visitorWows: 0,
  };
  return { ...c, ...over, id, genome: c.genome } as Creature;
}

export function makeTestWorld(tank: Tank, creatures: Creature[], hour = 12, hooks: AIHooks = {}): AIWorld {
  const w = createWorld(tank.id, {
    resolveDecor: resolveTestDecor,
    personality: (c) => {
      try {
        return personalityModifiers(c);
      } catch {
        return null;
      }
    },
    species: findSpecies,
    hooks,
  });
  syncWorld(w, { tank, creatures, clutches: [], hour, refreshInfo: true });
  return w;
}

export function decor(defId: string, x: number, z: number, opts: Partial<DecorInstance> = {}): DecorInstance {
  return { id: opts.id ?? `d_${defId}_${++seq}`, defId, x, y: opts.y ?? 0.04, z, rotY: opts.rotY ?? 0, scale: opts.scale ?? 1, seed: 1, ...opts };
}
