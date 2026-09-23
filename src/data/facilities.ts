/**
 * Facility level definitions: floor size, rent, crowd capacity, upgrade path, entrance and built-in room props.
 * OWNER: lane "facility".
 *
 * Balance (polish sweep, see docs/GAME_DESIGN.md "Balance curve"): the specialty shop is the first big goal
 * (~1–2 real hours of good play). Later levels are priced from the net income the previous level earns so each
 * move takes a few real hours, and rent is sized to ~10–20% of a well-run venue's takings — it matters, but it
 * never bankrupts a careful player.
 *
 * Coordinates are facility space in metres: origin at the room centre, x across (−left/+right as seen from the
 * default camera), z front(+)/back(−). The default camera looks from +z toward the back wall, so the front wall is
 * rendered as a cut-away and doors on it are where visitors walk in.
 */
import type { FacilityLevelId } from '@/types';

/** A built-in piece of the room (bookshelf, counter, columns...). `blocks` = visitors and tanks cannot use its floor. */
export interface FacilityPropDef {
  kind:
    | 'bookshelf'
    | 'armchair'
    | 'side_table'
    | 'floor_lamp'
    | 'houseplant'
    | 'door_swing'
    | 'rug'
    | 'counter'
    | 'merch_shelf'
    | 'planter'
    | 'reception'
    | 'ticket_gate'
    | 'column';
  x: number;
  z: number;
  /** Footprint along local x / local z (metres) before rotation. */
  w: number;
  d: number;
  rotY: number;
  blocks: boolean;
}

export interface FacilityLevelDef {
  id: FacilityLevelId;
  name: string;
  width: number; // metres
  depth: number;
  dailyRent: number;
  visitorCapacity: number;
  upgradeCost: number;
  unlockKey: string | null;
  blurb: string;
  // ── additions (lane facility) ──
  /** 0-based order in the facility arc. */
  order: number;
  /** Reputation required to buy this level (the unlock rule also checks it). */
  minReputation: number;
  /** Interior wall height (render). */
  wallHeight: number;
  /** Where visitors enter (floor point just inside the doorway) and which wall the door is on. */
  entrance: { x: number; z: number; side: 'front' | 'right' | 'left' };
  /** Default opening hours / admission when the facility first opens at this level. */
  openHour: number;
  closeHour: number;
  defaultAdmission: number;
  /** Reach multiplier: bigger venues draw visitors from further away. */
  reach: number;
  /** Built-in room props (not player fixtures). */
  props: FacilityPropDef[];
  /** Fixtures laid out when the level is first opened. */
  defaultFixtures: { kind: FixtureKind; x: number; z: number; rotY: number }[];
  /** Short line for the upgrade card: what changes. */
  perks: string[];
  /** Preferred gap between neighbouring exhibits when auto-placing (metres). */
  tankSpacing?: number;
}

export type FixtureKind = 'bench' | 'planter' | 'info_kiosk' | 'donation_box';

export interface FixtureDef {
  kind: FixtureKind;
  name: string;
  price: number;
  /** Footprint (local x × local z) metres. */
  w: number;
  d: number;
  blurb: string;
}

export const FIXTURE_DEFS: Record<FixtureKind, FixtureDef> = {
  bench: { kind: 'bench', name: 'Viewing bench', price: 120, w: 1.6, d: 0.5, blurb: 'Tired visitors linger longer and enjoy more.' },
  planter: { kind: 'planter', name: 'Planter', price: 60, w: 0.6, d: 0.6, blurb: 'Softens the room; a small ambience boost.' },
  info_kiosk: { kind: 'info_kiosk', name: 'Info kiosk', price: 250, w: 0.6, d: 0.45, blurb: 'Students and conservation-minded visitors love to learn.' },
  donation_box: { kind: 'donation_box', name: 'Conservation donation box', price: 80, w: 0.45, d: 0.45, blurb: 'Turns inspired visitors into donors.' },
};

const HALF_PI = Math.PI / 2;

export const FACILITY_LEVELS: FacilityLevelDef[] = [
  {
    id: 'hobby_room',
    tankSpacing: 0.12,
    name: 'Hobby Room',
    order: 0,
    width: 5,
    depth: 4.4,
    wallHeight: 2.6,
    dailyRent: 0,
    visitorCapacity: 4,
    upgradeCost: 0,
    unlockKey: null,
    minReputation: 0,
    blurb: 'A spare room with a good chair, a bookshelf and your first tank. Where it all begins.',
    entrance: { x: 2.15, z: 1.45, side: 'right' },
    openHour: 10,
    closeHour: 21,
    defaultAdmission: 0,
    reach: 0,
    props: [
      { kind: 'bookshelf', x: -2.33, z: -0.55, w: 1.15, d: 0.34, rotY: HALF_PI, blocks: true },
      { kind: 'armchair', x: -1.72, z: 1.3, w: 0.86, d: 0.84, rotY: 2.55, blocks: true },
      { kind: 'side_table', x: -2.17, z: 0.55, w: 0.46, d: 0.46, rotY: 0, blocks: true },
      { kind: 'floor_lamp', x: -2.18, z: 1.92, w: 0.42, d: 0.42, rotY: 0, blocks: true },
      { kind: 'houseplant', x: 2.12, z: -1.83, w: 0.56, d: 0.56, rotY: 0, blocks: true },
      { kind: 'door_swing', x: 2.05, z: 1.45, w: 0.9, d: 1.0, rotY: 0, blocks: true },
      { kind: 'rug', x: -0.2, z: 0.45, w: 2.5, d: 1.75, rotY: 0, blocks: false },
    ],
    defaultFixtures: [],
    perks: ['Private — friends and neighbours drop by to admire your tanks'],
  },
  {
    id: 'specialty_shop',
    tankSpacing: 0.3,
    name: 'Specialty Shop',
    order: 1,
    width: 9,
    depth: 7,
    wallHeight: 3.2,
    dailyRent: 30,
    visitorCapacity: 14,
    upgradeCost: 1000,
    unlockKey: 'facility_specialty_shop',
    minReputation: 100, // lane:w2-sim — matches the unlock rule (was 60)
    blurb: 'A small storefront on a quiet street. Your first paying visitors walk through the door.',
    entrance: { x: 0, z: 3.2, side: 'front' },
    openHour: 9,
    closeHour: 19,
    defaultAdmission: 4,
    reach: 1.3,
    props: [
      { kind: 'counter', x: 3.55, z: 1.5, w: 2.2, d: 0.72, rotY: -HALF_PI, blocks: true },
      { kind: 'merch_shelf', x: -4.22, z: 1.75, w: 2.4, d: 0.45, rotY: HALF_PI, blocks: true },
      { kind: 'planter', x: -1.45, z: 3.05, w: 0.55, d: 0.55, rotY: 0, blocks: true },
      { kind: 'planter', x: 1.45, z: 3.05, w: 0.55, d: 0.55, rotY: 0, blocks: true },
      { kind: 'rug', x: 0, z: 2.55, w: 1.8, d: 1.0, rotY: 0, blocks: false },
    ],
    defaultFixtures: [{ kind: 'bench', x: 0, z: 0.9, rotY: 0 }],
    perks: ['Open to paying visitors', '63 m² of floor', 'Educational signage'],
  },
  {
    id: 'aquarium_store',
    tankSpacing: 0.45,
    name: 'Aquarium Store',
    order: 2,
    width: 14,
    depth: 10,
    wallHeight: 3.6,
    dailyRent: 150,
    visitorCapacity: 34,
    upgradeCost: 8000,
    unlockKey: 'facility_aquarium_store',
    minReputation: 180,
    blurb: 'An expanded store with display rows, a proper checkout and room for serious systems.',
    entrance: { x: 0, z: 4.7, side: 'front' },
    openHour: 9,
    closeHour: 20,
    defaultAdmission: 6,
    reach: 1.5,
    props: [
      { kind: 'counter', x: 5.3, z: 3.35, w: 2.8, d: 0.8, rotY: 0, blocks: true },
      { kind: 'merch_shelf', x: -6.72, z: 2.2, w: 3.4, d: 0.5, rotY: HALF_PI, blocks: true },
      { kind: 'merch_shelf', x: 6.72, z: -0.4, w: 3.0, d: 0.5, rotY: -HALF_PI, blocks: true },
      { kind: 'planter', x: -1.7, z: 4.55, w: 0.6, d: 0.6, rotY: 0, blocks: true },
      { kind: 'planter', x: 1.7, z: 4.55, w: 0.6, d: 0.6, rotY: 0, blocks: true },
      { kind: 'rug', x: 0, z: 4.0, w: 2.4, d: 1.2, rotY: 0, blocks: false },
    ],
    defaultFixtures: [
      { kind: 'bench', x: -2.2, z: 1.2, rotY: 0 },
      { kind: 'bench', x: 2.2, z: 1.2, rotY: 0 },
      { kind: 'info_kiosk', x: -3.6, z: 3.9, rotY: 0 },
    ],
    perks: ['140 m² of floor', 'Up to 34 visitors at once', 'Wider reach — more visitors find you'],
  },
  {
    id: 'showroom',
    tankSpacing: 1.0,
    name: 'Public Showroom',
    order: 3,
    width: 20,
    depth: 14,
    wallHeight: 4.6,
    dailyRent: 450,
    visitorCapacity: 70,
    upgradeCost: 40000,
    unlockKey: 'facility_showroom',
    minReputation: 350,
    blurb: 'A darkened gallery where every tank is a lit window into another world.',
    entrance: { x: 0, z: 6.7, side: 'front' },
    openHour: 10,
    closeHour: 20,
    defaultAdmission: 10,
    reach: 2.3,
    props: [
      { kind: 'reception', x: 6.6, z: 5.3, w: 3.0, d: 0.9, rotY: 0, blocks: true },
      { kind: 'planter', x: -2.0, z: 6.45, w: 0.7, d: 0.7, rotY: 0, blocks: true },
      { kind: 'planter', x: 2.0, z: 6.45, w: 0.7, d: 0.7, rotY: 0, blocks: true },
    ],
    defaultFixtures: [
      { kind: 'bench', x: -4, z: 1.0, rotY: 0 },
      { kind: 'bench', x: 0, z: 1.0, rotY: 0 },
      { kind: 'bench', x: 4, z: 1.0, rotY: 0 },
      { kind: 'info_kiosk', x: -6.5, z: 5.2, rotY: 0 },
      { kind: 'donation_box', x: 4.4, z: 5.6, rotY: 0 },
    ],
    perks: ['280 m² gallery', 'Dark gallery lighting makes tanks glow', 'Up to 70 visitors'],
  },
  {
    id: 'destination',
    tankSpacing: 1.3,
    name: 'Destination Aquarium',
    order: 4,
    width: 28,
    depth: 18,
    wallHeight: 6.5,
    dailyRent: 1200,
    visitorCapacity: 130,
    upgradeCost: 120000,
    unlockKey: 'facility_destination',
    minReputation: 550,
    blurb: 'People plan day trips around you now. Dramatic halls, ticket gates and a queue on weekends.',
    entrance: { x: 0, z: 8.6, side: 'front' },
    openHour: 9,
    closeHour: 21,
    defaultAdmission: 16,
    reach: 3.4,
    props: [
      { kind: 'ticket_gate', x: -2.4, z: 7.6, w: 2.6, d: 0.5, rotY: 0, blocks: true },
      { kind: 'ticket_gate', x: 2.4, z: 7.6, w: 2.6, d: 0.5, rotY: 0, blocks: true },
      { kind: 'reception', x: -9.5, z: 7.0, w: 3.2, d: 1.0, rotY: 0, blocks: true },
      { kind: 'planter', x: -4.6, z: 8.4, w: 0.8, d: 0.8, rotY: 0, blocks: true },
      { kind: 'planter', x: 4.6, z: 8.4, w: 0.8, d: 0.8, rotY: 0, blocks: true },
    ],
    defaultFixtures: [
      { kind: 'bench', x: -6, z: 1.5, rotY: 0 },
      { kind: 'bench', x: -2, z: 1.5, rotY: 0 },
      { kind: 'bench', x: 2, z: 1.5, rotY: 0 },
      { kind: 'bench', x: 6, z: 1.5, rotY: 0 },
      { kind: 'info_kiosk', x: 9.5, z: 6.8, rotY: 0 },
      { kind: 'donation_box', x: 7.2, z: 7.4, rotY: 0 },
    ],
    perks: ['500 m² of exhibition space', 'Ticket gates and a real crowd', 'Acrylic showpieces become possible'],
  },
  {
    id: 'grand_hall',
    tankSpacing: 1.6,
    name: 'Grand Hall',
    order: 5,
    width: 36,
    depth: 24,
    wallHeight: 9,
    dailyRent: 3000,
    visitorCapacity: 240,
    upgradeCost: 300000,
    unlockKey: 'facility_grand_hall',
    minReputation: 780,
    blurb: 'A cavernous hall of columns and spot-lit water. Home of the 1,000-gallon grand display.',
    entrance: { x: 0, z: 11.6, side: 'front' },
    openHour: 9,
    closeHour: 22,
    defaultAdmission: 22,
    reach: 4.8,
    props: [
      // engaged columns along the back and side walls, spaced to leave generous tank bays
      ...[-13.5, -4.5, 4.5, 13.5].map((x) => ({ kind: 'column' as const, x, z: -11.55, w: 0.9, d: 0.9, rotY: 0, blocks: true })),
      ...[-6, 2].map((z) => ({ kind: 'column' as const, x: -17.55, z, w: 0.9, d: 0.9, rotY: 0, blocks: true })),
      ...[-6, 2].map((z) => ({ kind: 'column' as const, x: 17.55, z, w: 0.9, d: 0.9, rotY: 0, blocks: true })),
      { kind: 'ticket_gate', x: -2.6, z: 10.5, w: 3.0, d: 0.5, rotY: 0, blocks: true },
      { kind: 'ticket_gate', x: 2.6, z: 10.5, w: 3.0, d: 0.5, rotY: 0, blocks: true },
      { kind: 'reception', x: -12.5, z: 9.8, w: 3.6, d: 1.0, rotY: 0, blocks: true },
      { kind: 'planter', x: -5.2, z: 11.3, w: 0.9, d: 0.9, rotY: 0, blocks: true },
      { kind: 'planter', x: 5.2, z: 11.3, w: 0.9, d: 0.9, rotY: 0, blocks: true },
    ],
    defaultFixtures: [
      { kind: 'bench', x: -9, z: 3.2, rotY: 0 },
      { kind: 'bench', x: -3, z: 3.2, rotY: 0 },
      { kind: 'bench', x: 3, z: 3.2, rotY: 0 },
      { kind: 'bench', x: 9, z: 3.2, rotY: 0 },
      { kind: 'bench', x: -6, z: -3.5, rotY: 0 },
      { kind: 'bench', x: 6, z: -3.5, rotY: 0 },
      { kind: 'info_kiosk', x: 12.5, z: 9.6, rotY: 0 },
      { kind: 'info_kiosk', x: -8.5, z: 9.8, rotY: 0 },
      { kind: 'donation_box', x: 9.5, z: 10.4, rotY: 0 },
      { kind: 'planter', x: -15.5, z: 9.5, rotY: 0 },
      { kind: 'planter', x: 15.5, z: 9.5, rotY: 0 },
    ],
    perks: ['864 m² hall with 9 m ceilings', 'Up to 240 visitors', 'The 1,000-gallon grand display'],
  },
];

export const FACILITY_LEVEL_ORDER: FacilityLevelId[] = FACILITY_LEVELS.map((l) => l.id);

export function getFacilityLevel(id: FacilityLevelId): FacilityLevelDef {
  return FACILITY_LEVELS.find((l) => l.id === id) ?? FACILITY_LEVELS[0];
}

export function nextFacilityLevelDef(id: FacilityLevelId): FacilityLevelDef | null {
  const i = FACILITY_LEVEL_ORDER.indexOf(id);
  return i >= 0 && i < FACILITY_LEVELS.length - 1 ? FACILITY_LEVELS[i + 1] : null;
}

export function facilityLevelIndex(id: FacilityLevelId): number {
  return Math.max(0, FACILITY_LEVEL_ORDER.indexOf(id));
}
