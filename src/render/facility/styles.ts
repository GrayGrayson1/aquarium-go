/**
 * Visual style per facility level: floors, walls, trims, lighting mood. OWNER: lane "facility".
 * Rooms are always darker than the tanks so the water glows (art direction §4).
 */
import type { FacilityLevelId } from '@/types';

export type FloorKind = 'planks' | 'terrazzo' | 'concrete' | 'stone' | 'tiles';

export interface RoomStyle {
  floor: { kind: FloorKind; base: string; repeatM: number; roughness: number; clearcoat?: number; seed: string; tiles?: number; vein?: string; inlay?: string };
  wall: { base: string; roughness: number; strength?: number };
  /** Back wall accent (behind the tanks). */
  accent?: { base: string; kind: 'plaster' | 'slats'; roughness: number };
  wainscot?: { color: string; height: number };
  trim: string;
  skirting: number;
  crown: boolean;
  /** Warm/cool room light colour and strength (0..1 relative). */
  light: { color: string; strength: number; count: number; height: number };
  /** Fake spot pools on the floor in front of each tank + wall washes. */
  pools: number;
  wash?: { color: string; strength: number };
  /** Exterior ground tint seen through the cut-away. */
  ground: string;
  /** Emissive strip along the base of the walls (galleries). */
  baseGlow?: string;
  /** Extra hemisphere fill so dark architecture stays legible (sky, ground, intensity). */
  fill?: [string, string, number];
  /** Sign placement on the back wall: centre height and width (metres). */
  sign: { y: number; w: number };
}

export const ROOM_STYLES: Record<FacilityLevelId, RoomStyle> = {
  hobby_room: {
    floor: { kind: 'planks', base: '#a4744a', repeatM: 2.4, roughness: 0.5, clearcoat: 0.3, seed: 'hobby-oak' },
    wall: { base: '#cbbb9c', roughness: 0.92, strength: 0.32 },
    wainscot: { color: '#e8e2d4', height: 0.92 },
    trim: '#ece6d8',
    skirting: 0.13,
    crown: true,
    light: { color: '#ffcf9a', strength: 0.55, count: 0, height: 2.4 },
    pools: 0,
    ground: '#0b0a09',
    sign: { y: 0, w: 0 },
  },
  specialty_shop: {
    floor: { kind: 'terrazzo', base: '#cfc8bb', repeatM: 3, roughness: 0.42, clearcoat: 0.35, seed: 'shop-terrazzo' },
    wall: { base: '#e6e1d7', roughness: 0.9, strength: 0.4 },
    accent: { base: '#1f4d52', kind: 'plaster', roughness: 0.9 },
    trim: '#2c2a27',
    skirting: 0.09,
    crown: false,
    light: { color: '#ffe6c8', strength: 0.75, count: 4, height: 3.0 },
    pools: 0.25,
    ground: '#0c0d0e',
    sign: { y: 2.2, w: 3.4 },
  },
  aquarium_store: {
    floor: { kind: 'concrete', base: '#8f8d88', repeatM: 4, roughness: 0.38, clearcoat: 0.45, seed: 'store-concrete' },
    wall: { base: '#d9d5cc', roughness: 0.9, strength: 0.4 },
    accent: { base: '#6b4a31', kind: 'slats', roughness: 0.6 },
    trim: '#232323',
    skirting: 0.1,
    crown: false,
    light: { color: '#fff0dc', strength: 0.7, count: 6, height: 3.4 },
    pools: 0.35,
    ground: '#0b0c0d',
    sign: { y: 2.5, w: 4.6 },
  },
  showroom: {
    floor: { kind: 'planks', base: '#4d3727', repeatM: 3.2, roughness: 0.48, clearcoat: 0.25, seed: 'showroom-smoked-oak' },
    wall: { base: '#2f3236', roughness: 0.95, strength: 0.5 },
    accent: { base: '#2e2419', kind: 'slats', roughness: 0.65 },
    trim: '#0f1011',
    skirting: 0.12,
    crown: false,
    light: { color: '#ffd9ae', strength: 0.42, count: 6, height: 4.2 },
    pools: 0.9,
    wash: { color: '#8fb8c9', strength: 0.45 },
    ground: '#060708',
    baseGlow: '#f3c98b',
    fill: ['#6d7f94', '#2a2019', 0.45],
    sign: { y: 3.25, w: 6 },
  },
  destination: {
    floor: { kind: 'stone', base: '#3b4047', repeatM: 3.2, roughness: 0.46, clearcoat: 0.22, seed: 'dest-basalt', tiles: 2, vein: 'rgba(170,190,210,0.12)' },
    wall: { base: '#1f3444', roughness: 0.95, strength: 0.5 },
    accent: { base: '#17293a', kind: 'plaster', roughness: 0.95 },
    trim: '#0a0e12',
    skirting: 0.16,
    crown: false,
    // 6 lights in a symmetric 3 × 2 grid (was 8): every lit pixel in the hall loops over all room lights, so fewer,
    // stronger lights keep the tank view smooth without changing the overall brightness
    light: { color: '#cfe3ff', strength: 0.53, count: 6, height: 6 },
    pools: 1,
    wash: { color: '#5fb6d6', strength: 0.65 },
    ground: '#05070a',
    baseGlow: '#6fd2e6',
    fill: ['#5f86a8', '#1a2330', 0.6],
    sign: { y: 4.1, w: 8 },
  },
  grand_hall: {
    floor: { kind: 'stone', base: '#4a433b', repeatM: 4, roughness: 0.44, clearcoat: 0.25, seed: 'grand-marble', tiles: 2, vein: 'rgba(235,220,190,0.14)', inlay: 'rgba(196,160,98,0.6)' },
    wall: { base: '#3b332b', roughness: 0.92, strength: 0.5 },
    accent: { base: '#2c261f', kind: 'plaster', roughness: 0.95 },
    trim: '#3b3024',
    skirting: 0.3,
    crown: true,
    // 6 lights in a symmetric 3 × 2 grid (was 10 in a lopsided 4 + 4 + 2): see destination
    light: { color: '#ffd8a8', strength: 0.66, count: 6, height: 8.2 },
    pools: 1,
    wash: { color: '#e8b877', strength: 0.7 },
    ground: '#050506',
    baseGlow: '#e7b56c',
    fill: ['#8a7a66', '#221a12', 0.6],
    sign: { y: 5, w: 9.5 },
  },
};

/** Tint of the light pool in front of a tank, by water class family. */
export function poolColor(waterClass: string): string {
  if (waterClass === 'reef') return '#4f8dff';
  if (waterClass.startsWith('marine')) return '#46c6e8';
  if (waterClass === 'freshwater_planted') return '#8fe0a6';
  if (waterClass === 'freshwater_cool') return '#8fd8e0';
  return '#9fdcc8';
}
