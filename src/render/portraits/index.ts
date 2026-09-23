/**
 * Offscreen creature portraits for UI cards. OWNER: lane "fishart".
 *
 * One shared offscreen WebGLRenderer renders a creature through its registered factory (fish + critterart specials)
 * in a flattering 3/4 view with soft studio lighting over a subtle gradient backdrop tinted by the species'
 * environment. Results are cached as data URLs by (creature/species, appearance hash, life stage, sex, size) and
 * rendered asynchronously, one per animation frame, so the UI never stalls. Returns null while pending or when WebGL
 * is unavailable.
 */
import { useEffect, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import type { Creature, CreatureRuntime, CreatureVisualParams, SpeciesDefinition } from '@/types';
import { findSpecies } from '@/data/species';
import { getCreatureFactory } from '../creatures/registry';
import '../creatures';
import { createTankFXUniforms } from '../shared/underwater';
import { appearanceHash } from '../creatures/core/palette';

export type PortraitSubject = Creature | { speciesId: string; appearance?: CreatureVisualParams } | null;

export interface PortraitOptions {
  /** Output pixel size (square). */
  size: number;
  /** Transparent background instead of the tinted studio gradient. */
  transparent?: boolean;
}

type Job = { key: string; species: SpeciesDefinition; creature: Creature | null; appearance: CreatureVisualParams; size: number; transparent: boolean };

const results = new Map<string, string | null>();
const listeners = new Map<string, Set<() => void>>();
const queue: Job[] = [];
const queued = new Set<string>();
let rafId = 0;
let unavailable = false;

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let stage: THREE.Group | null = null;
const backdrops = new Map<string, THREE.Texture>();
const fx = createTankFXUniforms();
fx.uFogDensity.value = 0;
fx.uAbsorb.value.set(0, 0, 0);
fx.uCausticIntensity.value = 0.28;
fx.uCausticScale.value = 7;
fx.uWaterBox.value.set(10, 20, 10);
fx.uTankInv.value.makeTranslation(0, 10, 0);
fx.uLightColor.value.set('#f6fbff');
fx.uCamPos.value.set(0, 0, 3);

function notify(key: string) {
  listeners.get(key)?.forEach((f) => f());
}

function ensureRenderer(): boolean {
  if (renderer) return true;
  if (unavailable || typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.setPixelRatio(1);
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      disposeRenderer();
    });
    renderer = r;
  } catch {
    unavailable = true;
    return false;
  }
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(26, 1, 0.01, 50);
  stage = new THREE.Group();
  scene.add(stage);
  // soft studio lighting: warm key from above-front-left, cool rim from behind, gentle fill
  const key = new THREE.DirectionalLight('#fff4e6', 2.6);
  key.position.set(-1.2, 2.2, 2.4);
  const rim = new THREE.DirectionalLight('#9fd8ff', 1.6);
  rim.position.set(1.5, 1.2, -2.5);
  const fill = new THREE.DirectionalLight('#cfe6ff', 0.6);
  fill.position.set(2, -0.6, 2);
  scene.add(key, rim, fill, new THREE.HemisphereLight('#e6f3fa', '#2c3a3e', 0.9), new THREE.AmbientLight('#ffffff', 0.18));
  return true;
}

function disposeRenderer() {
  for (const t of backdrops.values()) t.dispose();
  backdrops.clear();
  renderer?.dispose();
  renderer = null;
  scene = null;
  camera = null;
  stage = null;
}

/** Gradient backdrop tinted by environment (freshwater teal-green, marine blue, brackish olive). */
function backdrop(env: string): THREE.Texture {
  let t = backdrops.get(env);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const [top, mid, bot] =
    env === 'marine' ? ['#1d5f86', '#113e5e', '#06182a'] : env === 'brackish' ? ['#4f6a4c', '#2f4634', '#101a14'] : ['#2d6d63', '#1a4640', '#081a18'];
  const lin = g.createLinearGradient(0, 0, 0, 256);
  lin.addColorStop(0, top);
  lin.addColorStop(0.55, mid);
  lin.addColorStop(1, bot);
  g.fillStyle = lin;
  g.fillRect(0, 0, 256, 256);
  const rad = g.createRadialGradient(118, 92, 10, 128, 110, 170);
  rad.addColorStop(0, 'rgba(255,255,255,0.16)');
  rad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rad;
  g.fillRect(0, 0, 256, 256);
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  backdrops.set(env, t);
  return t;
}

function portraitRuntime(species: SpeciesDefinition): CreatureRuntime {
  return {
    id: 'portrait',
    speciesId: species.id,
    tankId: 'portrait',
    pos: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    roll: 0,
    speedBL: 0.35,
    swimPhase: 1.1,
    bend: -0.12,
    finFlare: 0.45,
    gillFlick: 0,
    mouthOpen: 0.04,
    eyeL: 0.1,
    eyeR: 0.1,
    flutter: 0.3,
    tailCurl: 0.4,
    puff: 0,
    belly: 0,
    colorIntensity: 0.95,
    pose: 'hover',
    behavior: 'portrait',
    lengthM: 1,
    visible: true,
    selected: false,
    ai: {},
  };
}

const _box = new THREE.Box3();
const _ctr = new THREE.Vector3();
const _sz = new THREE.Vector3();

function renderJob(job: Job): string | null {
  if (!ensureRenderer() || !renderer || !scene || !camera || !stage) return null;
  const factory = getCreatureFactory(job.species.id, job.species.behaviorSet);
  if (!factory) return null;
  let obj;
  try {
    obj = factory({ species: job.species, creature: job.creature, appearance: job.appearance, lod: 0, quality: 'high', fx });
  } catch (e) {
    console.warn('[portraits] factory failed', job.species.id, e);
    return null;
  }
  try {
    const rt = portraitRuntime(job.species);
    // settle springs into the portrait pose
    for (let i = 0; i < 40; i++) obj.update(rt, 0.05, 2 + i * 0.05);
    const holder = new THREE.Group();
    holder.add(obj.root);
    const upright = job.species.behaviorSet === 'seahorse';
    holder.rotation.set(0, upright ? -0.25 : -0.48, upright ? 0 : 0.05, 'YZX');
    stage.add(holder);
    holder.updateMatrixWorld(true);
    _box.setFromObject(holder, true);
    if (_box.isEmpty()) _box.set(new THREE.Vector3(-0.5, -0.3, -0.2), new THREE.Vector3(0.5, 0.3, 0.2));
    _box.getCenter(_ctr);
    _box.getSize(_sz);
    const fov = (camera.fov * Math.PI) / 180;
    const fitH = _sz.y / 2 / Math.tan(fov / 2);
    const fitW = _sz.x / 2 / Math.tan(fov / 2);
    const dist = Math.max(fitH, fitW) * 1.12 + _sz.z * 0.5;
    camera.position.set(_ctr.x + dist * 0.04, _ctr.y + dist * 0.1, _ctr.z + dist);
    camera.lookAt(_ctr);
    camera.updateMatrixWorld();
    fx.uCamPos.value.copy(camera.position);
    fx.uTime.value = 3.7;
    scene.background = job.transparent ? null : backdrop(job.species.environment ?? 'freshwater');
    const px = Math.max(32, Math.min(1024, Math.round(job.size * Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1))));
    renderer.setSize(px, px, false);
    renderer.setClearColor(0x000000, job.transparent ? 0 : 1);
    renderer.render(scene, camera);
    let url: string;
    try {
      url = renderer.domElement.toDataURL('image/webp', 0.9);
      if (!url.startsWith('data:image/webp')) url = renderer.domElement.toDataURL('image/png');
    } catch {
      url = renderer.domElement.toDataURL('image/png');
    }
    stage.remove(holder);
    return url;
  } catch (e) {
    console.warn('[portraits] render failed', job.species.id, e);
    return null;
  } finally {
    obj.dispose();
  }
}

function pump() {
  rafId = 0;
  const job = queue.shift();
  if (!job) return;
  queued.delete(job.key);
  const url = renderJob(job);
  results.set(job.key, url);
  notify(job.key);
  if (queue.length) schedule();
}

function schedule() {
  if (rafId || typeof requestAnimationFrame === 'undefined') return;
  rafId = requestAnimationFrame(pump);
}

function resolveSubject(subject: PortraitSubject): { species: SpeciesDefinition; creature: Creature | null; appearance: CreatureVisualParams } | null {
  if (!subject) return null;
  const species = findSpecies(subject.speciesId);
  if (!species) return null;
  const creature = 'id' in subject && 'genome' in subject ? (subject as Creature) : null;
  const appearance = subject.appearance ?? species.genetics?.baseVisual;
  if (!appearance) return null;
  return { species, creature, appearance };
}

export function portraitKey(subject: PortraitSubject, size: number, transparent = false): string | null {
  if (!subject) return null;
  const c = 'id' in subject && 'genome' in subject ? (subject as Creature) : null;
  const a = subject.appearance;
  return `${subject.speciesId}|${a ? appearanceHash(a) : 'base'}|${c?.lifeStage ?? 'adult'}|${c?.sex ?? '-'}|${size}|${transparent ? 't' : 'b'}`;
}

/** Imperative API: request a portrait; resolves with a data URL (or null when unavailable). */
export function requestPortrait(subject: PortraitSubject, opts: PortraitOptions = { size: 256 }): Promise<string | null> {
  const key = portraitKey(subject, opts.size, opts.transparent);
  if (!key) return Promise.resolve(null);
  if (results.has(key)) return Promise.resolve(results.get(key) ?? null);
  return new Promise((resolve) => {
    const off = subscribe(key, () => {
      if (results.has(key)) {
        off();
        resolve(results.get(key) ?? null);
      }
    });
    enqueue(subject, key, opts);
  });
}

function enqueue(subject: PortraitSubject, key: string, opts: PortraitOptions) {
  if (results.has(key) || queued.has(key)) return;
  if (unavailable) {
    results.set(key, null);
    return;
  }
  const r = resolveSubject(subject);
  if (!r) {
    results.set(key, null);
    return;
  }
  queued.add(key);
  queue.push({ key, ...r, size: opts.size, transparent: !!opts.transparent });
  schedule();
}

function subscribe(key: string, f: () => void): () => void {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(f);
  return () => {
    set!.delete(f);
    if (!set!.size) listeners.delete(key);
  };
}

const noop = () => () => {};

export function usePortrait(subject: Creature | { speciesId: string; appearance?: CreatureVisualParams } | null, size = 256): string | null {
  const key = portraitKey(subject, size);
  const url = useSyncExternalStore(
    key ? (f) => subscribe(key, f) : noop,
    () => (key ? results.get(key) ?? null : null),
    () => null,
  );
  useEffect(() => {
    if (key && !results.has(key)) enqueue(subject, key, { size });
    // subject identity may change every render; the key captures everything that matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return url;
}

export function useSpeciesPortrait(speciesId: string, size = 256): string | null {
  const species = findSpecies(speciesId);
  return usePortrait(species ? { speciesId, appearance: species.genetics?.baseVisual } : null, size);
}

/** Drop cached portraits (e.g. on memory pressure). */
export function clearPortraitCache(): void {
  results.clear();
}

/** True when portraits cannot be rendered (no WebGL). */
export function portraitsUnavailable(): boolean {
  return unavailable;
}
