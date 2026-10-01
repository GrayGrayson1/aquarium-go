/**
 * Pure mapping from game/UI state → soundscape parameters (what the ambience + music should be doing).
 * OWNER: lane "audio". No Web Audio here (unit-testable).
 */
import type { EquipmentInstance, FacilityLevelId, GameState, Tank } from '@/types';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { getFacilityLevel } from '@/data/facilities';
import { hourOfDay, lightsOn } from '@/sim/time';
import type { MusicMood } from './theory';

/** What a tank's equipment sounds like (all 0..1 except bubble rates, which are blips per second). */
export interface TankSoundProfile {
  /** Motor/pump hum + filtered brown-noise water rumble. */
  hum: number;
  /** HOB/canister return waterfall trickle. */
  trickle: number;
  /** Fine airstone bubbles per second. */
  fineBubbles: number;
  /** Large sponge-filter/air-lift bubbles per second. */
  bigBubbles: number;
  /** Gentle water movement (powerheads, wavemakers, filter flow). */
  flow: number;
  /** Protein-skimmer fizz. */
  fizz: number;
  /** Fan / chiller air noise. */
  air: number;
}

export const SILENT_PROFILE: TankSoundProfile = { hum: 0, trickle: 0, fineBubbles: 0, bigBubbles: 0, flow: 0, fizz: 0, air: 0 };

const has = (s: string, re: RegExp) => re.test(s.toLowerCase());

/** Sound contribution of one installed device. Works from the catalog def, falling back to id heuristics. */
export function equipmentSound(eq: EquipmentInstance): Partial<TankSoundProfile> {
  if (!eq.on || eq.failed) return {};
  const def = getEquipmentDef(eq.defId);
  const key = `${eq.defId} ${def?.visual ?? ''} ${def?.name ?? ''}`;
  const kind: string = def?.kind ?? guessKind(eq.defId);
  // flow-ish settings are 0..1; heater settings are °C (ignored)
  const s = eq.setting !== undefined && eq.setting >= 0 && eq.setting <= 1.5 ? Math.max(0.25, eq.setting) : 1;
  const wear = 0.85 + (1 - Math.max(0, Math.min(1, eq.condition ?? 1))) * 0.6; // worn motors hum louder
  switch (kind) {
    case 'filter':
      if (has(key, /sponge|air[-_ ]?lift|corner/)) return { bigBubbles: 3.2 * s, hum: 0.12, flow: 0.15 };
      if (has(key, /hob|hang|power[-_ ]?filter|waterfall|back/)) return { trickle: 0.9 * s, hum: 0.55 * wear, flow: 0.35 * s };
      if (has(key, /canister|sump|wet[-_ ]?dry/)) return { trickle: 0.45 * s, hum: 0.28 * wear, flow: 0.45 * s };
      if (has(key, /internal|nano|mini/)) return { hum: 0.4 * wear, flow: 0.4 * s, trickle: 0.12 };
      return { hum: 0.4 * wear, trickle: 0.35 * s, flow: 0.3 * s };
    case 'airstone':
      return { fineBubbles: 7 * s, hum: 0.18 * wear };
    case 'co2':
      return { fineBubbles: 0.8 };
    case 'powerhead':
    case 'wavemaker':
      return { flow: 0.6 * s, hum: 0.14 * wear };
    case 'skimmer':
      return { fizz: 0.75 * s, hum: 0.3 * wear, trickle: 0.2 };
    case 'refugium':
      return { trickle: 0.25, flow: 0.15 };
    case 'fan':
    case 'chiller':
      return { air: 0.6, hum: 0.15 * wear };
    case 'uv':
      return { hum: 0.08 };
    default:
      return {};
  }
}

function guessKind(defId: string): string {
  const id = defId.toLowerCase();
  if (/filter|hob|canister|sponge|sump/.test(id)) return 'filter';
  if (/air ?stone|airstone|bubbler|air_pump|airpump/.test(id)) return 'airstone';
  if (/powerhead|wave/.test(id)) return 'powerhead';
  if (/skimmer/.test(id)) return 'skimmer';
  if (/fan/.test(id)) return 'fan';
  if (/chiller/.test(id)) return 'chiller';
  if (/co2/.test(id)) return 'co2';
  return 'other';
}

export function tankSoundProfile(tank: Tank | null | undefined): TankSoundProfile {
  const p: TankSoundProfile = { ...SILENT_PROFILE };
  if (!tank) return p;
  for (const eq of tank.equipment ?? []) {
    const c = equipmentSound(eq);
    for (const k of Object.keys(c) as (keyof TankSoundProfile)[]) p[k] += c[k] ?? 0;
  }
  p.hum = Math.min(1, p.hum);
  p.trickle = Math.min(1, p.trickle);
  p.flow = Math.min(1, p.flow);
  p.fizz = Math.min(1, p.fizz);
  p.air = Math.min(1, p.air);
  p.fineBubbles = Math.min(16, p.fineBubbles);
  p.bigBubbles = Math.min(8, p.bigBubbles);
  return p;
}

/** Whole-room profile for the facility view: many tanks blend into a softer, fuller bed. */
export function facilitySoundProfile(game: GameState): TankSoundProfile {
  const p: TankSoundProfile = { ...SILENT_PROFILE };
  const ids = game.tankOrder ?? Object.keys(game.tanks);
  let n = 0;
  for (const id of ids) {
    const t = game.tanks[id];
    if (!t) continue;
    const tp = tankSoundProfile(t);
    for (const k of Object.keys(tp) as (keyof TankSoundProfile)[]) p[k] += tp[k];
    n++;
  }
  if (n === 0) return p;
  // loudness grows sub-linearly with the number of tanks
  const g = 1 / Math.sqrt(n);
  p.hum = Math.min(1, p.hum * g * 1.2);
  p.trickle = Math.min(1, p.trickle * g);
  p.flow = Math.min(1, p.flow * g);
  p.fizz = Math.min(1, p.fizz * g);
  p.air = Math.min(1, p.air * g);
  p.fineBubbles = Math.min(10, p.fineBubbles * g);
  p.bigBubbles = Math.min(5, p.bigBubbles * g);
  return p;
}

/** Room reverb / tone character per facility level. */
export interface RoomSound {
  id: FacilityLevelId | 'title';
  /** Reverb RT60 in seconds. */
  reverb: number;
  preDelay: number;
  damping: number;
  /** Room-tone level 0..1 and low-pass cutoff (Hz). */
  tone: number;
  toneCutoff: number;
  /** HVAC "air" layer level (big spaces). */
  air: number;
}

export const ROOMS: Record<RoomSound['id'], RoomSound> = {
  title: { id: 'title', reverb: 2.4, preDelay: 0.02, damping: 0.55, tone: 0.25, toneCutoff: 420, air: 0.1 },
  hobby_room: { id: 'hobby_room', reverb: 0.75, preDelay: 0.008, damping: 0.7, tone: 0.3, toneCutoff: 320, air: 0.03 },
  specialty_shop: { id: 'specialty_shop', reverb: 1.1, preDelay: 0.012, damping: 0.6, tone: 0.36, toneCutoff: 420, air: 0.08 },
  aquarium_store: { id: 'aquarium_store', reverb: 1.5, preDelay: 0.016, damping: 0.55, tone: 0.42, toneCutoff: 520, air: 0.14 },
  showroom: { id: 'showroom', reverb: 2.1, preDelay: 0.02, damping: 0.5, tone: 0.45, toneCutoff: 600, air: 0.2 },
  destination: { id: 'destination', reverb: 2.8, preDelay: 0.026, damping: 0.45, tone: 0.5, toneCutoff: 680, air: 0.26 },
  grand_hall: { id: 'grand_hall', reverb: 3.6, preDelay: 0.034, damping: 0.4, tone: 0.55, toneCutoff: 760, air: 0.32 },
};

export function roomFor(level: FacilityLevelId | null | undefined): RoomSound {
  return (level && ROOMS[level]) || ROOMS.hobby_room;
}

/** Is it night for the listener: the focused tank's lights are off, or (no tank) the clock is 21:00–07:00. */
export function isNight(game: GameState | null, tank: Tank | null | undefined): boolean {
  if (!game) return false;
  const h = game.clock?.hour ?? 12;
  if (tank?.lighting) return !lightsOn(tank.lighting.onHour, tank.lighting.offHour, h);
  const hd = hourOfDay(h);
  return hd >= 21 || hd < 7;
}

/**
 * Real-time hysteresis for the listener's day/night flag. A game day is four real minutes at 1× (night is
 * 100 s), so raw `isNight` would swap the score's key and tempo every 10–12 s at 10×. The gate only follows a
 * change after it has held for `minHoldMs` and the current value has been in place for `minDwellMs`, and
 * while fast-forwarding (speed ≥ 3) it keeps the current value: the music settles instead of chasing the clock.
 * Pure (no Web Audio) — unit-tested.
 */
export class NightGate {
  private held: boolean | null = null;
  private heldSince = -Infinity;
  private candidate: boolean | null = null;
  private candidateSince = 0;

  constructor(
    readonly minHoldMs = 8000,
    readonly minDwellMs = 45000,
  ) {}

  get value(): boolean | null {
    return this.held;
  }

  /** Forget everything (new save / screen change): the next update adopts the raw value at once. */
  reset(): void {
    this.held = null;
    this.candidate = null;
  }

  update(raw: boolean, speed: number, nowMs: number): boolean {
    if (this.held === null) {
      this.held = raw;
      this.heldSince = nowMs;
      this.candidate = null;
      return raw;
    }
    if (raw === this.held) {
      this.candidate = null;
      return this.held;
    }
    if (speed >= 3) {
      // fast-forward: hold the mood; the candidate clock restarts once the player slows down
      this.candidate = null;
      return this.held;
    }
    if (this.candidate !== raw) {
      this.candidate = raw;
      this.candidateSince = nowMs;
    }
    if (nowMs - this.candidateSince >= this.minHoldMs && nowMs - this.heldSince >= this.minDwellMs) {
      this.held = raw;
      this.heldSince = nowMs;
      this.candidate = null;
    }
    return this.held;
  }
}

/**
 * 0..1 estimate of how many visitors are in the building right now. The facility lane may override with an exact
 * value via `setVisitorPresence` (director.ts).
 */
export function visitorPresence(game: GameState | null): number {
  if (!game || !game.facility?.openToPublic) return 0;
  const f = game.facility;
  const hd = hourOfDay(game.clock.hour);
  const open = f.openHour <= f.closeHour ? hd >= f.openHour && hd < f.closeHour : hd >= f.openHour || hd < f.closeHour;
  if (!open) return 0;
  let cap = 3;
  try {
    cap = getFacilityLevel(f.level).visitorCapacity || 3;
  } catch {
    /* stub data */
  }
  const today = game.visitors?.today?.count ?? 0;
  // busier at midday, bigger buildings hold more people
  const span = (f.closeHour - f.openHour + 24) % 24 || 10;
  const t = ((hd - f.openHour + 24) % 24) / span;
  const dayCurve = Math.sin(Math.PI * Math.max(0, Math.min(1, t)));
  const crowd = Math.min(1, 0.25 + Math.log2(1 + cap) / 8 + Math.min(0.3, today / 200));
  return Math.max(0, Math.min(1, crowd * (0.35 + 0.65 * dayCurve)));
}

export interface MoodInputs {
  screen: string;
  view: 'tank' | 'facility';
  panel: string | null;
  partyMode: boolean;
  night: boolean;
  hasGame: boolean;
}

export function chooseMood(i: MoodInputs): MusicMood {
  if (i.partyMode) return 'party';
  if (i.screen === 'boot') return 'off';
  if (i.screen === 'title' || i.screen === 'starter' || i.screen === 'naming') return 'title';
  if (!i.hasGame) return 'title';
  if (i.panel === 'market' || i.panel === 'visitors') return 'market';
  if (i.night) return 'night';
  return i.view === 'facility' ? 'facility' : 'tank';
}
