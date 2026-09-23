/**
 * Tank creation and tank-level helpers. OWNER: core.
 */
import type { GameState, Tank, WaterClass, Environment, SubstrateKind, BackdropKind, LightPreset } from '@/types';
import { nextId } from './ids';
import { initialWater, defaultEquipmentFor } from './water';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getTankTier } from '@/data/catalog/tanks';

export function environmentOf(waterClass: WaterClass): Environment {
  if (waterClass === 'reef' || waterClass.startsWith('marine')) return 'marine';
  if (waterClass === 'brackish') return 'brackish';
  return 'freshwater';
}

export function defaultLightPreset(waterClass: WaterClass): LightPreset {
  switch (waterClass) {
    case 'reef':
      return 'reef_full';
    case 'marine_fowlr':
    case 'marine_live_rock':
      return 'cool';
    case 'freshwater_planted':
      return 'planted';
    case 'freshwater_cool':
      return 'daylight';
    default:
      return 'warm';
  }
}

export function defaultSubstrate(waterClass: WaterClass): { kind: SubstrateKind; depthCm: number; color: string } {
  switch (waterClass) {
    case 'freshwater_cool':
      return { kind: 'fine_sand', depthCm: 2.5, color: '#d9ccb0' };
    case 'freshwater_planted':
      return { kind: 'planted_soil', depthCm: 5, color: '#3b3128' };
    case 'freshwater_tropical':
      return { kind: 'fine_gravel', depthCm: 4, color: '#8a7c68' };
    default:
      return { kind: 'aragonite', depthCm: 4, color: '#efe6d6' };
  }
}

export interface CreateTankOptions {
  name?: string;
  cycled?: boolean;
  purpose?: Tank['purpose'];
  placement?: { x: number; z: number; rotY: number };
  withDefaultEquipment?: boolean;
  backdrop?: BackdropKind;
  substrate?: { kind: SubstrateKind; depthCm: number; color: string };
}

/** Create a tank and insert it into state. Does NOT charge money (economy.buyTank does). */
export function createTank(state: GameState, tierId: string, waterClass: WaterClass, opts: CreateTankOptions = {}): Tank {
  const tier = getTankTier(tierId);
  const id = nextId(state, 'tank');
  const env = environmentOf(waterClass);
  const tank: Tank = {
    id,
    name: opts.name ?? `${tier.name}`,
    tierId,
    waterClass,
    environment: env,
    purpose: opts.purpose ?? 'display',
    placement: opts.placement ?? { x: 0, z: 0, rotY: 0 },
    water: initialWater(waterClass, opts.cycled ?? false),
    equipment: [],
    decor: [],
    substrate: opts.substrate ?? defaultSubstrate(waterClass),
    backdrop: opts.backdrop ?? (env === 'marine' ? 'deep_blue' : 'black'),
    lighting: { preset: defaultLightPreset(waterClass), intensity: 1, onHour: 7, offHour: 22, moonlight: true },
    createdHour: state.clock.hour,
    cache: { stockingLoad: 0, beauty: 40, welfare: 100, exhibitScore: 30, stability: 70, status: 'good', compatVerdict: 'excellent' },
    signage: false,
    lastMaintenanceHour: state.clock.hour,
    tapPressure: 0,
  };
  if (opts.withDefaultEquipment !== false) {
    for (const defId of defaultEquipmentFor(tierId, waterClass)) {
      const def = getEquipmentDef(defId);
      tank.equipment.push({
        id: nextId(state, 'eq'),
        defId,
        installedHour: state.clock.hour,
        condition: 1,
        on: true,
        setting: def?.stats.defaultSetting,
      });
    }
  }
  state.tanks[id] = tank;
  state.tankOrder.push(id);
  return tank;
}

/** Remove a tank from state (its creatures must already be moved/sold). */
export function deleteTank(state: GameState, tankId: string): void {
  delete state.tanks[tankId];
  state.tankOrder = state.tankOrder.filter((t) => t !== tankId);
  for (const c of Object.values(state.clutches)) if (c.tankId === tankId) delete state.clutches[c.id];
}
