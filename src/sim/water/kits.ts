/**
 * Default equipment kits, running costs and species tuning. OWNER: lane "waterlab".
 */
import type { GameState, SpeciesDefinition, Tank, WaterClass } from '@/types';
import { getTankTier } from '@/data/catalog/tanks';
import { clamp } from './chem';
import { LITRES_PER_GALLON, ROOM_TEMP_C, SALT_KG_PER_LITRE, SALT_PRICE_PER_KG, isSaltClass, saltStrength } from './constants';
import { equipmentSummary, safeGallons, thermalTau, type EquipmentSummary } from './env';

const rep = (id: string, n: number): string[] => Array.from({ length: Math.max(0, n) }, () => id);

function filterKit(gallons: number, waterClass: WaterClass): string[] {
  const gentle = waterClass === 'freshwater_cool' || waterClass === 'freshwater_planted';
  if (gallons <= 12) return gentle ? ['filter_sponge'] : ['filter_hob_small'];
  if (gallons <= 20) return gentle ? ['filter_sponge'] : ['filter_hob_small'];
  if (gallons <= 40) return gentle && waterClass === 'freshwater_cool' ? ['filter_sponge'] : ['filter_hob_large'];
  if (gallons <= 60) return ['filter_canister'];
  if (gallons <= 150) return rep('filter_canister', gallons >= 90 ? 2 : 1);
  return rep('filter_sump', Math.ceil(gallons / 400));
}

function heaterKit(gallons: number): string[] {
  if (gallons <= 15) return ['heater_50w'];
  if (gallons <= 40) return ['heater_100w'];
  if (gallons <= 75) return ['heater_300w'];
  if (gallons <= 125) return rep('heater_300w', 2);
  return rep('heater_titanium_800w', Math.max(2, Math.ceil((gallons * 2.5) / 800)));
}

function lightKit(lengthIn: number, id: string): string[] {
  return rep(id, lengthIn > 100 ? 3 : lengthIn > 60 ? 2 : 1);
}

/** Default equipment definition ids for a brand-new tank of this tier + class. */
export function defaultEquipmentForImpl(tierId: string, waterClass: WaterClass): string[] {
  let gallons = 20;
  let lengthIn = 30;
  try {
    const t = getTankTier(tierId);
    gallons = t.gallons;
    lengthIn = t.dimsIn.l;
  } catch {
    /* unknown tier: assume 20 gal */
  }
  const out: string[] = [...filterKit(gallons, waterClass)];
  const marine = waterClass === 'reef' || waterClass.startsWith('marine');
  switch (waterClass) {
    case 'freshwater_cool':
      if (gallons <= 40) out.push('chiller_mini');
      else out.push(...rep('chiller_large', Math.ceil(gallons / 400)));
      out.push(...lightKit(lengthIn, 'light_basic_led'));
      break;
    case 'freshwater_planted':
      out.push(...heaterKit(gallons), ...lightKit(lengthIn, 'light_planted'));
      break;
    case 'freshwater_tropical':
    case 'brackish':
      out.push(...heaterKit(gallons), ...lightKit(lengthIn, 'light_basic_led'));
      break;
    default:
      out.push(...heaterKit(gallons));
      if (gallons <= 40) out.push('powerhead_small');
      else if (gallons <= 75) out.push(...rep('powerhead_small', 2));
      else if (gallons <= 300) out.push(...rep('powerhead_large', Math.ceil(gallons / 150)));
      else out.push(...rep('wavemaker', Math.ceil(gallons / 500)));
      if (waterClass === 'reef') {
        out.push(...lightKit(lengthIn, gallons >= 75 ? 'light_reef_premium' : 'light_reef'));
        out.push(gallons > 75 ? 'skimmer_insump' : 'skimmer_hob');
        if (gallons >= 40) out.push('ato');
      } else {
        // Live rock (coralline algae, macroalgae, gorgonians) wants real reef light; fish-only tanks do fine with a basic LED.
        out.push(...lightKit(lengthIn, waterClass === 'marine_live_rock' ? 'light_reef' : 'light_basic_led'));
        if (gallons > 150) out.push('skimmer_insump');
      }
  }
  if (marine && gallons > 150) out.push('ato');
  out.push('lid_glass');
  return out;
}

/** Heat power (W) needed to hold `set` against the room for this tank. */
function holdWatts(gallons: number, lid: boolean, deltaC: number): number {
  const litres = gallons * LITRES_PER_GALLON;
  return (Math.max(0, deltaC) * litres) / (0.86 * thermalTau(gallons, lid));
}

/** Daily running cost of a tank (equipment upkeep by duty cycle + tier base upkeep + marine salt). */
export function tankDailyCostImpl(state: GameState, tank: Tank, summary?: EquipmentSummary): number {
  const s = summary ?? equipmentSummary(tank);
  const gallons = safeGallons(tank);
  let base = 0.5;
  try {
    base = getTankTier(tank.tierId).baseUpkeep;
  } catch {
    /* default */
  }
  let cost = base;
  const conflictMul = s.conflict ? 1.8 : 1;
  const photoperiod = (((tank.lighting?.offHour ?? 22) - (tank.lighting?.onHour ?? 8) + 24) % 24) || 12;
  for (const e of s.entries) {
    const { inst, def } = e;
    if (!inst.on) continue;
    if (inst.failed && !(def.kind === 'heater' && inst.failMode === 'stuck_on')) continue;
    switch (def.kind) {
      case 'heater': {
        if (inst.failed) {
          cost += def.upkeep;
          break;
        }
        const set = inst.setting ?? def.stats.defaultSetting ?? 25.5;
        const need = holdWatts(gallons, s.lid, set - (ROOM_TEMP_C - s.fanCool));
        const duty = clamp(need / Math.max(1, s.heaterPower), 0.03, 1);
        cost += def.upkeep * duty * conflictMul;
        break;
      }
      case 'chiller': {
        const set = inst.setting ?? def.stats.defaultSetting ?? 18;
        const need = holdWatts(gallons, s.lid, ROOM_TEMP_C + 0.5 * s.par - s.fanCool - set);
        const duty = clamp(need / Math.max(1, s.chillerPower), 0.03, 1);
        cost += def.upkeep * duty * conflictMul;
        break;
      }
      case 'light':
        cost += def.upkeep * (photoperiod / 12) * clamp(tank.lighting?.intensity ?? 1, 0.2, 1.5);
        break;
      default:
        cost += def.upkeep;
    }
  }
  if (isSaltClass(tank.waterClass)) {
    // ~20% water change a week with fresh salt mix (lane:brackish: brackish water needs only ~a third of the salt)
    const kgPerDay = (gallons * LITRES_PER_GALLON * 0.2 * SALT_KG_PER_LITRE * saltStrength(tank.waterClass)) / 7;
    cost += kgPerDay * SALT_PRICE_PER_KG;
  }
  return Math.round(cost * 100) / 100;
}

// ───────────────────────────── species tuning ─────────────────────────────

const FLOW_SETTING: Record<SpeciesDefinition['flowPreference'], number> = { very_low: 0.05, low: 0.1, moderate: 0.6, high: 1 };
const LIGHT_INTENSITY: Record<SpeciesDefinition['lightPreference'], number> = { dim: 0.55, moderate: 0.85, bright: 1.1 };

/** Adjust equipment settings for a species (heater within the ideal band, gentle pumps for weak swimmers, light level). */
export function tuneTankForSpecies(tank: Tank, sp: SpeciesDefinition, freshTank: boolean): void {
  const idealMid = (sp.tempC.idealMin + sp.tempC.idealMax) / 2;
  const target = clamp(Math.round(idealMid * 2) / 2, sp.tempC.idealMin, sp.tempC.idealMax);
  const cool = target < ROOM_TEMP_C - 0.5;
  for (const inst of tank.equipment) {
    const kind = inst.defId.startsWith('heater')
      ? 'heater'
      : inst.defId.startsWith('chiller')
        ? 'chiller'
        : inst.defId.startsWith('powerhead') || inst.defId === 'wavemaker'
          ? 'pump'
          : inst.defId.startsWith('light_')
            ? 'light'
            : 'other';
    if (kind === 'heater') {
      // Cool-water animals: the heater only guards against a cold room.
      inst.setting = cool ? Math.max(10, sp.tempC.idealMin - 1) : target;
    } else if (kind === 'chiller') {
      inst.setting = cool ? target : Math.max(target + 1.5, sp.tempC.idealMax);
    } else if (kind === 'pump') {
      inst.setting = FLOW_SETTING[sp.flowPreference] ?? 0.6;
      inst.on = sp.flowPreference !== 'very_low';
    } else if (kind === 'light') {
      inst.setting = 1;
    }
  }
  tank.lighting.intensity = LIGHT_INTENSITY[sp.lightPreference] ?? 1;
  if (freshTank) {
    tank.water.tempC = clamp(target, sp.tempC.min, sp.tempC.max);
    if (sp.salinitySG && tank.water.salinitySG > 1.003) tank.water.salinitySG = Math.round(((sp.salinitySG.idealMin + sp.salinitySG.idealMax) / 2) * 10000) / 10000;
    if (tank.water.lab) tank.water.lab.prevTemp = tank.water.tempC;
  }
}
