/**
 * Tank tiers — real-world gallon sizes with standard interior dimensions (inches).
 * OWNER: core (prices may be tuned by the economy lane).
 */
import type { TankTier } from '@/types';
import { byId } from '@/data/byId';

export const TANK_TIERS: TankTier[] = [
  { id: 'g5', gallons: 5, name: '5 Gallon Nano', dimsIn: { l: 16, w: 8, h: 10 }, price: 45, unlock: null, material: 'glass', glassMm: 4, standStyle: 'desk', baseUpkeep: 0.4, blurb: 'A jewel-box tank. Cheap, but tiny volumes swing fast.' },
  { id: 'g10', gallons: 10, name: '10 Gallon', dimsIn: { l: 20, w: 10, h: 12 }, price: 60, unlock: null, material: 'glass', glassMm: 5, standStyle: 'desk', baseUpkeep: 0.5, blurb: 'The classic first aquarium.' },
  { id: 'g20L', gallons: 20, name: '20 Gallon Long', dimsIn: { l: 30, w: 12, h: 12 }, price: 95, unlock: null, material: 'glass', glassMm: 5, standStyle: 'cabinet', baseUpkeep: 0.7, blurb: 'Long and low — lots of floor space for bottom dwellers.' },
  { id: 'g29', gallons: 29, name: '29 Gallon', dimsIn: { l: 30, w: 12, h: 18 }, price: 130, unlock: null, material: 'glass', glassMm: 6, standStyle: 'cabinet', baseUpkeep: 0.9, blurb: 'Taller water column for a first reef or seahorse system.' },
  { id: 'g40B', gallons: 40, name: '40 Gallon Breeder', dimsIn: { l: 36, w: 18, h: 16 }, price: 190, unlock: 'tank_40', material: 'glass', glassMm: 6, standStyle: 'cabinet', baseUpkeep: 1.1, blurb: 'Wide and deep — the breeder’s favourite footprint.' },
  { id: 'g55', gallons: 55, name: '55 Gallon', dimsIn: { l: 48, w: 13, h: 21 }, price: 260, unlock: 'tank_55', material: 'glass', glassMm: 8, standStyle: 'cabinet', baseUpkeep: 1.4, blurb: 'Four feet of swimming length.' },
  { id: 'g75', gallons: 75, name: '75 Gallon', dimsIn: { l: 48, w: 18, h: 21 }, price: 360, unlock: 'tank_75', material: 'glass', glassMm: 10, standStyle: 'cabinet', baseUpkeep: 1.8, blurb: 'A true centrepiece for community or reef.' },
  { id: 'g90', gallons: 90, name: '90 Gallon', dimsIn: { l: 48, w: 18, h: 24 }, price: 460, unlock: 'tank_90', material: 'glass', glassMm: 10, standStyle: 'cabinet', baseUpkeep: 2.1, blurb: 'Taller aquascapes and deeper reefs.' },
  { id: 'g125', gallons: 125, name: '125 Gallon', dimsIn: { l: 72, w: 18, h: 21 }, price: 780, unlock: 'tank_125', material: 'glass', glassMm: 12, standStyle: 'cabinet', baseUpkeep: 2.8, blurb: 'Six feet long — room for real open-water swimmers.' },
  { id: 'g180', gallons: 180, name: '180 Gallon', dimsIn: { l: 72, w: 24, h: 25 }, price: 1400, unlock: 'tank_180', material: 'glass', glassMm: 12, standStyle: 'cabinet', baseUpkeep: 3.8, blurb: 'Deep front-to-back for dramatic hardscape.' },
  { id: 'g240', gallons: 240, name: '240 Gallon', dimsIn: { l: 96, w: 24, h: 25 }, price: 2400, unlock: 'tank_240', material: 'glass', glassMm: 15, standStyle: 'built_in', baseUpkeep: 5.0, blurb: 'Eight feet of display.' },
  { id: 'g300', gallons: 300, name: '300 Gallon', dimsIn: { l: 96, w: 24, h: 31 }, price: 3600, unlock: 'tank_300', material: 'acrylic', glassMm: 19, standStyle: 'built_in', baseUpkeep: 6.2, blurb: 'Showroom scale. Visitors stop in their tracks.' },
  { id: 'g500', gallons: 500, name: '500 Gallon Showpiece', dimsIn: { l: 120, w: 36, h: 27 }, price: 7200, unlock: 'tank_500', material: 'acrylic', glassMm: 25, standStyle: 'plinth', baseUpkeep: 9.5, blurb: 'A room-defining exhibit.' },
  { id: 'g600', gallons: 600, name: '600 Gallon Exhibit', dimsIn: { l: 120, w: 36, h: 32 }, price: 9000, unlock: 'tank_600', material: 'acrylic', glassMm: 25, standStyle: 'plinth', baseUpkeep: 11, blurb: 'Public-aquarium ambitions.' },
  { id: 'g800', gallons: 800, name: '800 Gallon Exhibit', dimsIn: { l: 144, w: 36, h: 36 }, price: 12500, unlock: 'tank_800', material: 'acrylic', glassMm: 32, standStyle: 'plinth', baseUpkeep: 14, blurb: 'Twelve feet of living water.' },
  { id: 'g1000', gallons: 1000, name: '1,000 Gallon Grand Display', dimsIn: { l: 144, w: 48, h: 33 }, price: 17500, unlock: 'tank_1000', material: 'panoramic', glassMm: 38, standStyle: 'plinth', baseUpkeep: 18, blurb: 'The grand hall centrepiece.' },
];

export const TANK_TIER_BY_ID: Record<string, TankTier> = byId(TANK_TIERS);

export function getTankTier(id: string): TankTier {
  const t = TANK_TIER_BY_ID[id];
  if (!t) throw new Error(`Unknown tank tier ${id}`);
  return t;
}
