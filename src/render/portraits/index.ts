/**
 * Offscreen creature portraits for UI cards. OWNER: lane "fishart".
 *
 * One shared offscreen WebGLRenderer renders a creature through its registered factory (fish + critterart specials)
 * in a flattering 3/4 view with soft studio lighting over a subtle gradient backdrop tinted by the species'
 * environment. Results are cached as image URLs by (creature/species, appearance hash, life stage, sex, size) and
 * rendered asynchronously, one per animation frame, so the UI never stalls; a job whose last subscriber unmounts
 * before it renders is dropped. Returns null while pending or when WebGL is unavailable.
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react';
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
/** lane:pc-perf — ms the last job took; an expensive job spaces out the next one (see schedule). */
let lastJobMs = 0;
let delayId = 0;
/**
 * lane:fix-panels — the job whose pixels are still being encoded off the main thread (canvas.toBlob). The pump waits
 * for it, so the shared canvas still holds that render if the encode fails and the synchronous fallback is needed.
 */
let encoding = false;

/**
 * lane:pc-perf — one live (off-stage) object per species keeps its shader programs linked. Disposing every portrait
 * object right after its render released the programs, so the next animal of the same species compiled them again:
 * opening Livestock on a big facility spent ~3 s of a 15 s session compiling (measured) — seconds more on
 * Windows/Direct3D. The previous object of a species is disposed only after the new one has rendered (its programs are
 * then in use again), and at most KEEP_SPECIES species are kept.
 */
const KEEP_SPECIES = 16;
const keepAlive = new Map<string, { dispose(): void }>();
function keep(key: string, obj: { dispose(): void }) {
  const prev = keepAlive.get(key);
  keepAlive.delete(key);
  keepAlive.set(key, obj);
  if (prev && prev !== obj) prev.dispose();
  while (keepAlive.size > KEEP_SPECIES) {
    const [k, o] = keepAlive.entries().next().value as [string, { dispose(): void }];
    keepAlive.delete(k);
    o.dispose();
  }
}

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
  for (const o of keepAlive.values()) o.dispose();
  keepAlive.clear();
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

/** Render the job onto the shared canvas. True when the canvas now holds the portrait (read it back with `readback`). */
function renderJob(job: Job): boolean {
  if (!ensureRenderer() || !renderer || !scene || !camera || !stage) return false;
  const factory = getCreatureFactory(job.species.id, job.species.behaviorSet);
  if (!factory) return false;
  let obj;
  try {
    obj = factory({ species: job.species, creature: job.creature, appearance: job.appearance, lod: 0, quality: 'high', fx });
  } catch (e) {
    console.warn('[portraits] factory failed', job.species.id, e);
    return false;
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
    stage.remove(holder);
    keep(`${job.species.id}|${job.creature?.lifeStage ?? 'adult'}`, obj);
    obj = null;
    return true;
  } catch (e) {
    console.warn('[portraits] render failed', job.species.id, e);
    return false;
  } finally {
    obj?.dispose();
  }
}

/** Synchronous readback: WebP where the browser encodes it, PNG otherwise. */
function dataUrl(canvas: HTMLCanvasElement): string | null {
  try {
    const url = canvas.toDataURL('image/webp', 0.9);
    return url.startsWith('data:image/webp') ? url : canvas.toDataURL('image/png');
  } catch {
    try {
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }
}

function finish(job: Job, url: string | null) {
  encoding = false;
  results.set(job.key, url);
  notify(job.key);
  if (queue.length) schedule();
}

/**
 * lane:fix-panels — encode a canvas that holds the portrait. `toBlob` encodes off the main thread (the synchronous
 * `toDataURL` encode + base64 was ~a third of every job's main-thread time); the pump waits for the callback, so on
 * failure the canvas still holds this render and the synchronous path takes over.
 */
function encode(job: Job, canvas: HTMLCanvasElement) {
  if (typeof canvas.toBlob !== 'function' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return finish(job, dataUrl(canvas));
  encoding = true;
  let settled = false;
  let guard = 0;
  const settle = (blob: Blob | null) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(guard);
    let url: string | null = null;
    if (blob) {
      try {
        url = URL.createObjectURL(blob);
      } catch {
        url = null;
      }
    }
    finish(job, url ?? dataUrl(canvas));
  };
  try {
    const t0 = performance.now();
    canvas.toBlob((b) => settle(b), 'image/webp', 0.9);
    lastJobMs += performance.now() - t0; // a slow copy spaces out the next job too (see schedule)
    // a callback that never comes (context lost mid-encode) must not stall every portrait after it
    guard = window.setTimeout(() => settle(null), 2000);
  } catch {
    settle(null);
  }
}

/** The 2D canvas an asynchronous readback paints its pixels into before encoding. */
let scratch: HTMLCanvasElement | null = null;

/**
 * lane:fix-integrate-ui — read the rendered portrait back without stalling the main thread. `toBlob` on the WebGL
 * canvas copied the pixels synchronously, waiting for the GPU to finish everything queued before it, the main scene's
 * frame included: 29 ms per portrait on average and 88 ms at worst while Livestock opened beside a busy tank
 * (measured). Now the pixels go into a pixel-pack buffer behind a fence, the fence is polled between tasks, and the
 * bytes are painted into a 2D canvas that is encoded as before. Any failure falls back to the synchronous copy (the
 * pump is held, so the WebGL canvas still holds this render).
 */
function readback(job: Job) {
  const canvas = renderer?.domElement;
  if (!canvas) return finish(job, null);
  const gl = renderer?.getContext();
  if (typeof WebGL2RenderingContext === 'undefined' || !(gl instanceof WebGL2RenderingContext) || typeof ImageData === 'undefined') return encode(job, canvas);
  const w = gl.drawingBufferWidth;
  const h = gl.drawingBufferHeight;
  let buf: WebGLBuffer | null = null;
  let fence: WebGLSync | null = null;
  const release = () => {
    if (gl.isContextLost()) return;
    if (fence) gl.deleteSync(fence);
    if (buf) gl.deleteBuffer(buf);
    fence = null;
    buf = null;
  };
  try {
    buf = gl.createBuffer();
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buf);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, w * h * 4, gl.STREAM_READ);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, 0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
  } catch {
    fence = null;
  }
  if (!fence || !buf) {
    release();
    return encode(job, canvas);
  }
  encoding = true;
  const started = performance.now();
  const poll = () => {
    if (!renderer || renderer.getContext() !== gl || gl.isContextLost()) return finish(job, null);
    const status = gl.clientWaitSync(fence!, 0, 0);
    if (status === gl.TIMEOUT_EXPIRED && performance.now() - started < 2000) {
      window.setTimeout(poll, 4);
      return;
    }
    if (status !== gl.ALREADY_SIGNALED && status !== gl.CONDITION_SATISFIED) {
      release();
      return encode(job, canvas);
    }
    try {
      const px = new Uint8ClampedArray(w * h * 4);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buf);
      gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, px);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      release();
      scratch ??= document.createElement('canvas');
      scratch.width = w;
      scratch.height = h;
      const ctx = scratch.getContext('2d', { willReadFrequently: true }); // a CPU-backed canvas: toBlob copies no GPU pixels
      if (!ctx) return encode(job, canvas);
      ctx.putImageData(new ImageData(flipRows(px, w, h), w, h), 0, 0);
      encode(job, scratch);
    } catch {
      release();
      encode(job, canvas);
    }
  };
  window.setTimeout(poll, 0);
}

/**
 * GL rows run bottom-up and the drawing buffer holds premultiplied colour; ImageData wants top-down, straight alpha.
 * Exported for tests.
 */
export function flipRows(src: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(new ArrayBuffer(src.length));
  const row = w * 4;
  for (let y = 0; y < h; y++) out.set(src.subarray((h - 1 - y) * row, (h - y) * row), y * row);
  for (let i = 0; i < out.length; i += 4) {
    const a = out[i + 3];
    if (a === 255 || a === 0) continue;
    const k = 255 / a;
    out[i] = out[i] * k;
    out[i + 1] = out[i + 1] * k;
    out[i + 2] = out[i + 2] * k;
  }
  return out;
}

function pump() {
  rafId = 0;
  if (encoding) return; // resumes from finish()
  const job = queue.shift();
  if (!job) return;
  queued.delete(job.key);
  const t0 = performance.now();
  const ok = renderJob(job);
  lastJobMs = performance.now() - t0;
  if (!ok) return finish(job, null);
  readback(job);
}

/** lane:fix-panels — forget a queued job nobody is waiting for any more (its row unmounted before it rendered). */
function dequeue(key: string) {
  if (!queued.has(key)) return;
  const i = queue.findIndex((j) => j.key === key);
  if (i >= 0) queue.splice(i, 1);
  queued.delete(key);
}

/**
 * lane:fix-panels — a subscriber is gone: once the current commit has settled (a remount that resubscribes keeps the
 * job), drop the job if nobody else is waiting for it. Rendered results stay cached.
 */
export function releasePortrait(key: string): void {
  queueMicrotask(() => {
    if (!listeners.get(key)?.size) dequeue(key);
  });
}

function schedule() {
  if (rafId || delayId || encoding || typeof requestAnimationFrame === 'undefined') return;
  // lane:pc-perf — a cheap job (programs warm) runs every frame; after an expensive one (a first compile, a big
  // readback) leave a few frames free so a panel full of new portraits never turns into a run of dropped frames
  if (lastJobMs > 8) {
    delayId = window.setTimeout(() => {
      delayId = 0;
      schedule();
    }, Math.min(250, lastJobMs * 3));
    lastJobMs = 0;
    return;
  }
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
  // a stable subscribe function per key — a fresh closure every render made React resubscribe on each re-render
  const sub = useMemo(() => (key ? (f: () => void) => subscribe(key, f) : noop), [key]);
  const url = useSyncExternalStore(
    sub,
    () => (key ? results.get(key) ?? null : null),
    () => null,
  );
  useEffect(() => {
    if (!key) return;
    if (!results.has(key)) enqueue(subject, key, { size });
    // a row that goes away before its turn (panel closed, list paged or filtered) takes its job with it: closing
    // Livestock on a big facility used to leave 300+ renders stuttering the tank for a minute
    return () => releasePortrait(key);
    // subject identity may change every render; the key captures everything that matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return url;
}

export function useSpeciesPortrait(speciesId: string, size = 256): string | null {
  const species = findSpecies(speciesId);
  return usePortrait(species ? { speciesId, appearance: species.genetics?.baseVisual } : null, size);
}

/**
 * lane:fix-panels — render portraits ahead of need, e.g. the five starters while the title screen idles, so the
 * cards that follow find them cached instead of rendering one per frame during their entrance animation.
 */
export function prewarmPortraits(subjects: PortraitSubject[], size = 192): void {
  for (const s of subjects) {
    const key = portraitKey(s, size);
    if (key) enqueue(s, key, { size });
  }
}

/** Drop cached portraits (e.g. on memory pressure). */
export function clearPortraitCache(): void {
  for (const url of results.values()) if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
  results.clear();
}

/** lane:fix-panels — jobs still waiting to render (diagnostics / tests). */
export function portraitQueueLength(): number {
  return queue.length;
}

/** True when portraits cannot be rendered (no WebGL). */
export function portraitsUnavailable(): boolean {
  return unavailable;
}
