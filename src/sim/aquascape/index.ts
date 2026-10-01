/**
 * Aquascaping: decor placement actions, beauty scoring, starter layouts, living decor and habitat.
 * OWNER: lane "aquascape".
 *
 * Public API (stable): placeDecor, moveDecor, removeDecor, beautyScore, starterAquascape, stepTankDecor,
 * tankHabitat, TankHabitat. Extra helpers for the editor/UI: checkPlacement, placementLimits, maxScaleFor,
 * substrateHeightAt, surfaceHeightAt, tankLightInfo, SELL_BACK_FRACTION.
 */
import type { GameState, Tank, BeautyReport, DecorInstance } from '@/types';
import type { ActionResult } from '../care';
import { placeDecorImpl, moveDecorImpl, removeDecorImpl, reseatDecorImpl } from './placement';
import { beautyScoreImpl } from './beauty';
import { starterAquascapeImpl } from './starters';
import { stepTankDecorImpl } from './growth';
import { tankHabitat as tankHabitatImpl, type TankHabitat as Habitat } from './habitat';

export type TankHabitat = Habitat;

export { checkPlacement, placementLimits, maxScaleFor, resolveBaseY, SELL_BACK_FRACTION, type PlacementCheck, type PlacementPos } from './placement';
export { substrateHeightAt, surfaceHeightAt, substrateShape } from './terrain';
export { tankLightInfo, isLitAt } from './growth';
export { STARTER_LAYOUTS, giftedLayoutShare } from './starters';
export { scapeCritique, type ScapeCritique, type CritiqueFactor } from './beauty'; // lane:staff — the show judge's stricter eye
export { emptyHabitat, vitality } from './habitat';
// lane:frags — frags & cuttings (take, plant, racks, grow-out)
export { takeFrag, plantFrag, fragEligibility, fragRackSlots, fragRacksIn, freeRackSlots, onFragRack, autoFragSpot, storedFrags, isGrowingFrag, fragLabel, isCoralDef, MAX_STORED_FRAGS, FRAG_RACK_VISUAL, type FragEligibility, type FragBlock } from './frags';

function refreshBeauty(state: GameState, tank: Tank): void {
  try {
    tank.cache.beauty = beautyScoreImpl(state, tank).score;
  } catch {
    /* derived cache only */
  }
}

/** Place a decor item (purchase handled here via economy.spend unless `owned`). */
export function placeDecor(state: GameState, tankId: string, defId: string, pos: { x: number; z: number; rotY?: number; scale?: number }, owned = false): ActionResult & { decorId?: string } {
  return placeDecorImpl(state, tankId, defId, pos, owned, (t) => refreshBeauty(state, t));
}

export function moveDecor(state: GameState, tankId: string, decorId: string, pos: { x: number; z: number; rotY?: number; scale?: number }): ActionResult {
  return moveDecorImpl(state, tankId, decorId, pos, (t) => refreshBeauty(state, t));
}

/** Remove decor back into inventory (or sell back at a loss). */
export function removeDecor(state: GameState, tankId: string, decorId: string, sell = false): ActionResult {
  return removeDecorImpl(state, tankId, decorId, sell, (t) => refreshBeauty(state, t));
}

/** lane:staff — re-seat every piece after the bed changed (substrate swap, water conversion) and refresh beauty. */
export function reseatDecor(state: GameState, tank: Tank): void {
  reseatDecorImpl(tank);
  refreshBeauty(state, tank);
}

export function beautyScore(state: GameState, tank: Tank): BeautyReport {
  return beautyScoreImpl(state, tank);
}

/** Hand-authored (procedurally jittered) starter aquascape for each starter species. */
export function starterAquascape(state: GameState, starterId: string, tank: Tank): DecorInstance[] {
  return starterAquascapeImpl(state, starterId, tank);
}

/** Grow plants/corals, trim needs, algae interaction. Called per tank step (`startHour`: the step's world hour). */
export function stepTankDecor(state: GameState, tank: Tank, dt: number, startHour?: number): void {
  stepTankDecorImpl(state, tank, dt, startHour);
}

/** Aggregate habitat features of a tank's decor + substrate (compat, welfare, breeding all use this). */
export function tankHabitat(state: GameState, tank: Tank): TankHabitat {
  return tankHabitatImpl(state, tank);
}
