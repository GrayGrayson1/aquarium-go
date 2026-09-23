/**
 * Per-tank, per-frame render state that is NOT a shader uniform (smoothed fixture light, party pulse...).
 * Written by TankFXProvider (useFrame priority -1), read by TankLights / TankWaterFX / TankShell.
 * OWNER: lane "waterfx".
 */
import { createContext, useContext } from 'react';
import * as THREE from 'three';
import { createLightState, type TankLightState } from '../shared/waterLook';

export interface TankRenderState {
  tankId: string;
  /** Smoothed fixture light (colour already includes party tint + intensity). */
  light: TankLightState;
  /** Light colour for real three.js lights (party-tinted, not fog-adjusted). */
  lampColor: THREE.Color;
  /** Shaft strength multiplier (water class × clarity). */
  shafts: number;
  /** 0..1 party amount (smoothed). */
  party: number;
  partyHue: number;
  /** 0..1 beat pulse (party only). */
  beat: number;
  /** Seconds since mount (for FX). */
  time: number;
}

export function createTankRenderState(tankId: string): TankRenderState {
  return { tankId, light: createLightState(), lampColor: new THREE.Color(1, 1, 1), shafts: 1, party: 0, partyHue: 0, beat: 0, time: 0 };
}

const FALLBACK = createTankRenderState('none');
export const TankRenderStateContext = createContext<TankRenderState | null>(null);
export function useTankRenderState(): TankRenderState {
  return useContext(TankRenderStateContext) ?? FALLBACK;
}
