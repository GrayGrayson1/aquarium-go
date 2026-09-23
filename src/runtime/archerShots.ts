/**
 * Archerfish shots (per-frame, non-persisted). OWNER: lane "brackish". The AI WRITES (src/ai/core/spit.ts), the jet /
 * insect renderer READS (src/render/tank/fx/ArcherJets.tsx). At most one shot per tank at a time.
 *
 * A shot is the whole little story: a fly settles in the air gap above the water (on the inside of the glass just
 * above the waterline, or on an emergent leaf) → an archerfish lines up beneath it and tilts up → a jet of water knocks the fly
 * down → it tumbles onto the surface → the fish snaps it up. Positions are tank-local metres (see src/types/runtime.ts).
 * The fly is cosmetic: it never feeds the sim (a game abstraction — real keepers offer insects, crickets and pellets).
 */
import * as THREE from 'three';

export type ArcherShotPhase =
  /** the fly is resting where it landed; the archerfish is lining up underneath */
  | 'rest'
  /** the jet is in flight (jetAge counts up from the moment of the shot) */
  | 'shot'
  /** knocked off: tumbling down toward the water */
  | 'fall'
  /** struggling on the surface film */
  | 'float'
  /** snapped up by a fish (or it sank) */
  | 'gone'
  /** the shooter gave up before firing: the fly buzzes off */
  | 'flyoff';

/** 'glass' = the inside of the end or front glass just above the waterline; 'leaf' = an emergent leaf. */
export type ArcherPerch = 'glass' | 'leaf';

export interface ArcherShot {
  tankId: string;
  shooterId: string;
  /** Monotonic id: the renderer resets its animation when this changes. */
  seq: number;
  phase: ArcherShotPhase;
  /** Seconds in the current phase (AI time, which runs at real speed). */
  age: number;
  /** Where the fly sits (see ArcherPerch); perchN tells which pane. */
  perch: ArcherPerch;
  /** Unit normal of the perch surface, pointing from the surface into the air (the fly's back faces it). */
  perchN: THREE.Vector3;
  /** Current fly position. */
  insect: THREE.Vector3;
  insectVel: THREE.Vector3;
  /** Fly heading (radians about +Y) and tumble angle while falling. */
  insectYaw: number;
  spin: number;
  /** Mouth position when the jet was fired, and the point it was aimed at (the fly at that moment). */
  from: THREE.Vector3;
  to: THREE.Vector3;
  /** The fish's heading when it fired: the jet leaves the water along it, then arcs over onto `to`. */
  dir: THREE.Vector3;
  /** Seconds since the shot (−1 before firing). */
  jetAge: number;
  /** Stable 0..1 seed for cosmetic variation. */
  seed: number;
}

/** Jet flight time from the surface to the fly (cosmetic and slowed so it can be seen; a real jet takes a few hundredths of a second). */
export const JET_FLIGHT_S = 0.2;
/** How long the jet keeps pouring from the mouth before its tail detaches. */
export const JET_POUR_S = 0.12;

/** tankId → the current (or last) shot. */
export const archerShots = new Map<string, ArcherShot>();

let shotSeq = 0;

export function newArcherShot(tankId: string, shooterId: string, perch: ArcherPerch, at: THREE.Vector3, normal: THREE.Vector3, seed: number): ArcherShot {
  let s = archerShots.get(tankId);
  if (!s) {
    s = {
      tankId,
      shooterId,
      seq: 0,
      phase: 'rest',
      age: 0,
      perch,
      perchN: new THREE.Vector3(),
      insect: new THREE.Vector3(),
      insectVel: new THREE.Vector3(),
      insectYaw: 0,
      spin: 0,
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
      dir: new THREE.Vector3(0, 1, 0),
      jetAge: -1,
      seed,
    };
    archerShots.set(tankId, s);
  }
  s.shooterId = shooterId;
  s.seq = ++shotSeq;
  s.phase = 'rest';
  s.age = 0;
  s.perch = perch;
  s.perchN.copy(normal);
  s.insect.copy(at);
  s.insectVel.set(0, 0, 0);
  s.insectYaw = seed * Math.PI * 2;
  s.spin = 0;
  s.from.copy(at);
  s.to.copy(at);
  s.dir.set(0, 1, 0);
  s.jetAge = -1;
  s.seed = seed;
  return s;
}

/** A shot that is still playing out (the fly is visible or the jet is in the air). */
export function shotActive(s: ArcherShot | undefined): s is ArcherShot {
  return !!s && s.phase !== 'gone' && s.phase !== 'flyoff';
}

// QA: `window.__AQ_SPIT(tankId?)` asks the next idle archerfish in that tank (or any animated tank) to take a shot now.
const forced = new Set<string>();
/** Request a shot in a tank (QA / dev tools); '*' = any tank. The AI consumes the request. */
export function requestArcherShot(tankId = '*'): void {
  forced.add(tankId);
}
/** A QA request is waiting for this tank. */
export function hasArcherRequest(tankId: string): boolean {
  return forced.has(tankId) || forced.has('*');
}
/** Consume a pending QA request for this tank. */
export function takeArcherRequest(tankId: string): boolean {
  if (forced.delete(tankId)) return true;
  return forced.delete('*');
}
if (typeof window !== 'undefined') {
  const w = window as unknown as { __AQ_SPIT?: (tankId?: string) => void; __AQ_ARCHER?: Map<string, ArcherShot> };
  w.__AQ_SPIT = requestArcherShot;
  w.__AQ_ARCHER = archerShots;
}
