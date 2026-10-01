/**
 * All camera modes: facility overview, cinematic fly-to, front, orbit, follow, close, photo and title "attract".
 * OWNER: lane "waterfx".
 *
 * Input: mouse drag / touch drag rotates, wheel / pinch zooms, right-drag / shift-drag / two-finger drag pans
 * (facility + photo). A drag threshold keeps simple clicks/taps flowing to the tank interaction layer; handlers can
 * call `wasCameraDrag()` (camera/cameraFX.ts) to ignore the click that ends a camera drag.
 */
import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { GameState, Tank } from '@/types';
import { getGame } from '@/state/game';
import { getUI } from '@/state/ui';
import { getSettings } from '@/state/settings';
import { runtime } from '@/runtime/tankRuntime';
import { tankDims } from '@/sim/tankSpace';
import { getTankTier } from '@/data/catalog/tanks';
import { getFacilityLevel } from '@/data/facilities';
import { facilityCameraBounds, facilityExhibitFrame } from '../facility/bounds';
import { shellGeom } from '../tank/shell/Glass';
import { tankLocalToWorld, worldToTankLocal } from './space';
import { updateFacilityOverflow } from './facilityOverflow';
import { pickSightline } from './sightline'; // lane:w2-visual
import { tankSlide } from './followFrame';
import { cameraFX, cameraInput, focusToMetres, noteCameraUserMove, usePhotoSettings, zoomToFov, type RigMode } from './cameraFX';
import { computeFreeRect, computeMenuRect, isPhoneLayout, measureOcclusion, viewportState, type FreeRect, type Occlusion } from './viewport';

const DEFAULT_FOV = 38;

const V = () => new THREE.Vector3();
const rig = {
  key: '',
  mode: 'idle' as RigMode,
  pos: new THREE.Vector3(0, 1.4, 3),
  target: new THREE.Vector3(0, 0.9, 0),
  fov: DEFAULT_FOV,
  // user offsets for the current mode
  yaw: 0,
  pitch: 0,
  zoom: 1,
  /**
   * lane:w2-visual — lowest front/orbit zoom allowed right now: with a side sheet open (creature card, tank card) the
   * free rect is narrower than the canvas, and leaning in must not push the tank past it (it was clipped at the
   * canvas edge on one side and tucked under the sheet on the other). Updated by the framing code every frame.
   */
  zoomFloor: 0,
  pan: V(),
  // facility state
  fTarget: V(),
  fYaw: 0,
  fPitch: 0.62,
  fDist: 6,
  // photo state (free camera)
  pTarget: V(),
  pYaw: 0,
  pPitch: 0,
  pDist: 1,
  // follow smoothing
  follow: V(),
  followValid: false,
  /** Smoothed camera yaw that shows the followed animal's flank (side profile). */
  sYaw: 0,
  sYawValid: false,
  // parallax (smoothed pointer)
  ptrX: 0,
  ptrY: 0,
  px: 0,
  py: 0,
  // transition
  tActive: false,
  tT: 0,
  tDur: 1.2,
  tLift: 0,
  tFromPos: V(),
  tFromTarget: V(),
  tFromFov: DEFAULT_FOV,
  tCut: false,
  initialized: false,
  // desired
  dPos: V(),
  dTarget: V(),
  dFov: DEFAULT_FOV,
  springBack: false,
  // lane:w2-visual — close/follow sight line (see sightline.ts): chosen variant, its smoothed values, re-check timer
  losPick: [1, 0] as [number, number],
  losSide: 1,
  losLift: 0,
  losValid: false,
  losT: 0,
  lastTankId: '' as string,
  /** Facility overview lens (halls use a longer lens so the floor recedes and the exhibit wall reads large). */
  fFov: DEFAULT_FOV,
  /** Room view: tank the camera was flown to by a click (lane:facrender), '' = overview / hand-driven. */
  fFocusId: '',
  /** lane:fix-integrate-ui (G2-04) — the room the facility framing was computed for (level and floor size). */
  roomSig: '',
  /**
   * The framing the room view opened with, for "Reset view" ("Back to the whole room") to fly back to: recomputing
   * the overview could frame closer (the first one is measured while the screen it came from still covers part of
   * the canvas) or from elsewhere (entering pulls back from the tank you were in). Valid for one canvas size.
   */
  fHome: { target: V(), yaw: 0, pitch: 0, dist: 0, fov: DEFAULT_FOV, w: 0, h: 0 },
};

/** Remember the current room framing as the room view's home (see rig.fHome). */
function saveFacilityHome(w: number, h: number) {
  const home = rig.fHome;
  home.target.copy(rig.fTarget);
  home.yaw = rig.fYaw;
  home.pitch = rig.fPitch;
  home.dist = rig.fDist;
  home.fov = rig.fFov;
  home.w = w;
  home.h = h;
}

/** Fly the room camera back to its home framing; false when there is none for this canvas size. */
function restoreFacilityHome(w: number, h: number): boolean {
  const home = rig.fHome;
  if (!home.dist || home.w !== w || home.h !== h) return false;
  rig.fTarget.copy(home.target);
  rig.fYaw = home.yaw;
  rig.fPitch = home.pitch;
  rig.fDist = home.dist;
  rig.fFov = home.fov;
  return true;
}

/** Free-viewport tracking (HUD + `[data-occlude]` sheets) and the lens shift that centres the shot in it. */
const view = {
  /** Smoothed free rect the camera frames into (canvas CSS px). */
  free: viewportState.free,
  /** Target free rect from the latest measurement. */
  want: { x0: 0, y0: 0, x1: 1, y1: 1 } as FreeRect,
  occ: viewportState.occlusion as Occlusion,
  lastMeasure: -1e9,
  w: 0,
  h: 0,
  kind: 'none' as FrameKind,
  screen: '',
  valid: false,
  /** Vertical offset (px) of the optical axis from the free-rect centre (phones hang the tank near the top). */
  axisDY: 0,
  axisWant: 0,
  // last applied projection (skip redundant updateProjectionMatrix calls)
  ox: NaN,
  oy: NaN,
  vw: 0,
  vh: 0,
};

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as unknown as { __AQ_CAM?: unknown }).__AQ_CAM = rig;
  (window as unknown as { __AQ_VIEW?: unknown }).__AQ_VIEW = view;
}

/**
 * What the free rect is measured against: the in-game HUD + sheets, a menu screen's content blocks (attract camera),
 * or nothing (photo mode / boot — the whole canvas is the frame).
 */
type FrameKind = 'game' | 'menu' | 'none';

/** Re-measure occluders (≤ 4×/s, immediately on resize / screen change) and ease the free rect toward them. */
function updateFreeRect(el: HTMLCanvasElement, w: number, h: number, kind: FrameKind, screen: string, dt: number, snap: boolean) {
  const now = performance.now();
  const resized = view.w !== w || view.h !== h;
  if (resized || kind !== view.kind || screen !== view.screen || now - view.lastMeasure > 250) {
    view.lastMeasure = now;
    if (kind !== 'none') measureOcclusion(el.getBoundingClientRect(), view.occ);
    else view.occ.left = view.occ.right = view.occ.top = view.occ.bottom = 0;
    if (kind === 'menu') computeMenuRect(w, h, view.occ, screen, view.want);
    else computeFreeRect(w, h, view.occ, kind === 'game', view.want);
  }
  const f = view.free;
  const t = view.want;
  if (!view.valid || resized || snap) {
    f.x0 = t.x0;
    f.x1 = t.x1;
    f.y0 = t.y0;
    f.y1 = t.y1;
  } else {
    // sheets slide in over ~0.3 s: follow a touch behind so the shot glides rather than tracks the animation
    const k = 1 - Math.exp(-dt * 4.2);
    f.x0 += (t.x0 - f.x0) * k;
    f.x1 += (t.x1 - f.x1) * k;
    f.y0 += (t.y0 - f.y0) * k;
    f.y1 += (t.y1 - f.y1) * k;
  }
  // optical-axis anchor offset (set per frame by the framing code) eases with the rect
  if (!view.valid || resized || snap) view.axisDY = view.axisWant;
  else view.axisDY += (view.axisWant - view.axisDY) * (1 - Math.exp(-dt * 4.2));
  view.valid = true;
  view.w = w;
  view.h = h;
  view.kind = kind;
  view.screen = screen;
}

/** Off-axis projection: put the optical axis (the rig target) at the centre of the free rect (+ the anchor offset). */
function applyLensShift(camera: THREE.PerspectiveCamera, w: number, h: number, fov: number) {
  const f = view.free;
  const ox = w / 2 - (f.x0 + f.x1) / 2;
  const oy = h / 2 - ((f.y0 + f.y1) / 2 + view.axisDY);
  const viewChanged = Math.abs(ox - view.ox) > 0.05 || Math.abs(oy - view.oy) > 0.05 || w !== view.vw || h !== view.vh || !camera.view?.enabled;
  const fovChanged = Math.abs(camera.fov - fov) > 1e-3;
  if (!viewChanged && !fovChanged) return;
  camera.fov = fov;
  if (viewChanged) {
    view.ox = ox;
    view.oy = oy;
    view.vw = w;
    view.vh = h;
    camera.setViewOffset(w, h, ox, oy, w, h); // also updates the projection
  } else camera.updateProjectionMatrix();
}

// scratch
const LOS_DEFAULT: [number, number] = [1, 0];
const _los = V();
const _losTo = V();
const _losC = V();
const _losPose = { D: 0, yaw: 0, pitch: 0 };
const _a = V();
const _b = V();
const _c = V();
const _off = V();
const _t = V();

function ease(t: number) {
  const k = Math.max(0, Math.min(1, t));
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
}
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

function focusTank(g: GameState, id: string | null): Tank | null {
  if (id && g.tanks[id]) return g.tanks[id];
  const first = g.tankOrder[0];
  return first ? g.tanks[first] ?? null : null;
}

/** Distance from the tank centre that frames its whole front at this aspect ratio. */
function frontDistance(tank: Tank, aspect: number, fov: number): { D: number; cy: number; H: number; W: number; L: number } {
  const d = tankDims(tank);
  const tv = Math.tan((fov * Math.PI) / 360);
  const th = tv * aspect;
  const portrait = aspect < 0.9;
  // leave room for the HUD (top bar ~15% / dock ~10% of the height) and some air around the tank
  const wantW = (d.L + 0.06) * (portrait ? 1.0 : 1.4);
  const wantH = (d.H + 0.1) * (portrait ? 1.9 : 1.72);
  const D = Math.max(wantW / 2 / th, wantH / 2 / tv) + d.W / 2 + d.glass;
  return { D: Math.max(D, d.W / 2 + 0.12), cy: d.H * 0.47, H: d.H, W: d.W, L: d.L };
}

/**
 * Hero framing for front/orbit: the tank body (rim to bottom trim) fills ~85 % of the free viewport width, or ~84 %
 * of its height when height-bound (phones fit the width at ~92 %). The lens shift (see `applyLensShift`) centres the
 * target in the free rect, so this only decides the distance. Returns the distance from the body centre (`D`) and the
 * body centre height (`cy`) in tank-local metres.
 */
function heroFrame(tank: Tank, free: FreeRect, viewH: number, viewW: number, fov: number): { D: number; cy: number; H: number; W: number; L: number; bodyH: number; outerW: number; zFull: number } {
  const d = tankDims(tank);
  const sg = shellGeom(d, getTankTier(tank.tierId));
  const tv = Math.tan((fov * Math.PI) / 360);
  const fw = Math.max(60, free.x1 - free.x0);
  const fh = Math.max(60, free.y1 - free.y0);
  const phone = isPhoneLayout(viewW, viewH);
  const bodyL = sg.outerL;
  // a little of the lid/fixture above the rim counts as body so the light bar never tucks under the top bar
  const bodyTop = sg.topY + 0.02;
  const bodyH = bodyTop - sg.bottomY;
  const fracW = phone ? 0.95 : 0.855;
  const fracH = phone ? 0.84 : 0.87;
  // distance from the camera to the FRONT face plane that makes the body fit
  const zW = (bodyL * viewH) / (2 * tv * fracW * fw);
  const zH = (bodyH * viewH) / (2 * tv * fracH * fh);
  const zd = Math.max(zW, zH, 0.12);
  // lane:w2-visual — front-face distance at which the body spans the WHOLE free width (the lean-in limit with a sheet open)
  const zFull = (bodyL * viewH) / (2 * tv * fw);
  return { D: zd + sg.outerW / 2, cy: (bodyTop + sg.bottomY) / 2, H: d.H, W: d.W, L: d.L, bodyH, outerW: sg.outerW, zFull };
}

/** Spherical offset (yaw around +Y from +Z, pitch up) in tank-local space. */
function sph(yaw: number, pitch: number, dist: number, out: THREE.Vector3) {
  const cp = Math.cos(pitch);
  return out.set(Math.sin(yaw) * cp * dist, Math.sin(pitch) * dist, Math.cos(yaw) * cp * dist);
}

function resolveMode(g: GameState | null): { mode: RigMode; tank: Tank | null; creatureId: string | null } {
  const ui = getUI();
  if (!g) return { mode: 'idle', tank: null, creatureId: null };
  if (ui.screen !== 'game') return { mode: 'attract', tank: focusTank(g, ui.focusedTankId), creatureId: null };
  if (ui.view === 'facility') return { mode: 'facility', tank: focusTank(g, ui.focusedTankId), creatureId: null };
  const tank = focusTank(g, ui.focusedTankId);
  if (!tank) return { mode: 'facility', tank: null, creatureId: null };
  if (ui.photoMode || ui.cameraMode === 'photo') return { mode: 'photo', tank, creatureId: ui.followCreatureId ?? ui.selectedCreatureId };
  const cm = ui.cameraMode;
  if (cm === 'follow' || cm === 'close') {
    const id = ui.followCreatureId ?? ui.selectedCreatureId;
    const rt = id ? runtime.creatures.get(id) : undefined;
    if (id && rt && rt.tankId === tank.id) return { mode: cm, tank, creatureId: id };
    return { mode: cm === 'close' ? 'close' : 'front', tank, creatureId: null };
  }
  return { mode: cm === 'orbit' ? 'orbit' : 'front', tank, creatureId: null };
}

/** Dev/test hook: set the user offsets of the current tank camera mode (yaw/pitch radians, zoom multiplier). */
export function setCameraOffsets(o: { yaw?: number; pitch?: number; zoom?: number }): void {
  if (o.yaw !== undefined) rig.yaw = o.yaw;
  if (o.pitch !== undefined) rig.pitch = o.pitch;
  if (o.zoom !== undefined) rig.zoom = o.zoom;
  rig.springBack = false;
}

function resetOffsets() {
  rig.yaw = 0;
  rig.pitch = 0;
  rig.zoom = 1;
  rig.pan.set(0, 0, 0);
  rig.followValid = false;
  rig.sYawValid = false;
  rig.losValid = false; // lane:w2-visual
  rig.losT = 0;
}

/** Portrait phone layout (tall, narrow canvas). */
const isPortraitPhone = (w: number, h: number) => isPhoneLayout(w, h) && h > w * 1.1;

/**
 * Phones: the tank is width-bound and leaves a tall free rect. lane:qa-visual — sit the tank body at the optical
 * centre of the free rect (a touch above the geometric centre) so it reads as the hero with a little wall above and
 * its stand below, instead of hanging at the top over a tall band of empty cabinet. Sheets that rise from the bottom
 * shrink the free rect, so the tank re-centres above them on its own.
 * Returns the optical-axis offset (px, ≤ 0) from the free-rect centre.
 */
function portraitAnchor(bodyH: number, distToFront: number, viewH: number, fov: number): number {
  const fr = view.free;
  const fh = fr.y1 - fr.y0;
  const tv = Math.tan((fov * Math.PI) / 360);
  const bodyPx = (bodyH * viewH) / (2 * tv * Math.max(0.05, distToFront));
  return Math.min(0, fr.y0 + Math.max(fh * 0.43, fh * 0.05 + bodyPx * 0.5) - (fr.y0 + fr.y1) / 2);
}

/**
 * Default overview framing of the room: fit the exhibit band into the free viewport (the lens shift centres it there).
 * Leaving a tank pulls back from that tank so the transition reads; otherwise the exhibit frame's own target is used.
 */
function frameFacility(g: GameState, tank: Tank | null, prevMode: RigMode, viewW: number, viewH: number) {
  const b = facilityCameraBounds(g.facility);
  const ex = facilityExhibitFrame(g);
  rig.fFov = ex.fov;
  const tv = Math.tan((ex.fov * Math.PI) / 360);
  const fr = view.want;
  const fw = Math.max(60, fr.x1 - fr.x0);
  const fh = Math.max(60, fr.y1 - fr.y0);
  // phones: fitting the whole exhibit row into a portrait width shrinks every tank to a speck — frame its heart.
  // lane:facrender (P6-06) — wide screens: show as much of the row as keeps the tanks readable (≥ OVERVIEW_PX_PER_M),
  // instead of always slicing a mature hall to its middle few tanks
  const fitW = isPhoneLayout(viewW, viewH) ? Math.max(1.4, ex.width * 0.5) : clamp(fw / OVERVIEW_PX_PER_M, ex.width, ex.fullWidth);
  const dW = (fitW * viewH) / (2 * tv * fw * 0.94);
  const dH = (ex.height * viewH) / (2 * tv * fh * 0.9);
  rig.fDist = clamp(Math.max(dW, dH), b.minDist, b.maxDist);
  rig.fPitch = ex.pitch;
  if (getFacilityLevel(g.facility.level).order < 3) {
    // hobby room / shops: stand further back (the dollhouse cut-away drops the near wall) with a longer lens,
    // above head height. The tanks keep their size in frame, while visitors wandering the small room stay
    // figures in the scene instead of wide-angle silhouettes looming over the lens.
    const lens = Math.min(ex.fov, 29);
    rig.fDist = clamp((rig.fDist * tv) / Math.tan((lens * Math.PI) / 360), b.minDist, b.maxDist);
    rig.fFov = lens;
    rig.fPitch = Math.max(ex.pitch, 0.42);
  }
  if (tank && prevMode !== 'idle' && prevMode !== 'attract') {
    // out of a tank (or the tank bar in the room): pull back from that tank (its front toward the camera) so the transition reads
    tankLocalToWorld(tank, [0, 0, tankDims(tank).W / 2 + 0.5], rig.fTarget);
    rig.fTarget.y = ex.target[1];
    rig.fYaw = tank.placement.rotY;
  } else {
    rig.fTarget.set(ex.target[0], ex.target[1], ex.target[2]);
    rig.fYaw = ex.yaw;
  }
}

/**
 * lane:facrender (S10-06) — room view: glide to one tank (clicked in the room) so it fills the frame, squarely from
 * its front. `rig.fFocusId` remembers it so the next click on the same tank can enter it.
 */
function frameFacilityTank(g: GameState, tank: Tank) {
  const b = facilityCameraBounds(g.facility);
  const d = tankDims(tank);
  const ex = facilityExhibitFrame(g);
  tankLocalToWorld(tank, [0, d.H * 0.45, d.W / 2 + 0.2], rig.fTarget);
  rig.fYaw = tank.placement.rotY;
  rig.fPitch = 0.3;
  rig.fFov = ex.fov;
  const tv = Math.tan((ex.fov * Math.PI) / 360);
  const fr = view.want;
  const fw = Math.max(60, fr.x1 - fr.x0);
  const fh = Math.max(60, fr.y1 - fr.y0);
  // the tank with a little of its neighbours across, the tank on its stand plus some wall vertically
  const w = Math.max(1.8, d.L * 2.4);
  const h = d.H + 0.9;
  rig.fDist = clamp(Math.max((w * view.h) / (2 * tv * fw), (h * view.h) / (2 * tv * fh)), b.minDist * FOCUS_MIN_DIST, b.maxDist);
}

/** A focused tank may bring the room camera in closer than the overview's floor (fraction of minDist). */
const FOCUS_MIN_DIST = 0.55;
/** Overview: never spread the exhibit row thinner than this on screen (a 1 m tank stays ≥ 90 px wide). */
const OVERVIEW_PX_PER_M = 90;

const facilityRequest = { reset: false, focusId: '' as string };

/** Room view: fly to a tank (a click on it in the room). */
export function focusFacilityTank(tankId: string): void {
  facilityRequest.focusId = tankId;
  facilityRequest.reset = false;
}

/** Room view: return to the default overview framing. */
export function resetFacilityView(): void {
  facilityRequest.reset = true;
  facilityRequest.focusId = '';
}

/** The tank the room camera was last flown to (cleared by a reset or a hand-driven pan/orbit). */
export function facilityFocusedTank(): string {
  return rig.fFocusId;
}

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);

  // ── input ──
  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number; sx: number; sy: number; button: number; shift: boolean; type: string }>();
    let pinchD = 0;
    let pinchMid = { x: 0, y: 0 };
    let dragging = false;
    const threshold = (type: string) => (type === 'touch' ? 10 : 6);

    const sens = () => getSettings().cameraSensitivity || 1;
    const placingTool = () => {
      const t = getUI().tool;
      return t === 'decor_place' || t === 'decor_move' || t === 'tank_place';
    };

    const rotate = (dx: number, dy: number) => {
      const k = sens();
      switch (rig.mode) {
        case 'facility':
          rig.fFocusId = '';
          rig.fYaw -= dx * 0.0055 * k;
          rig.fPitch = clamp(rig.fPitch + dy * 0.004 * k, 0.22, 1.36);
          break;
        case 'photo':
          rig.pYaw -= dx * 0.005 * k;
          rig.pPitch = clamp(rig.pPitch + dy * 0.004 * k, -0.6, 1.4);
          break;
        case 'front':
          rig.yaw = clamp(rig.yaw - dx * 0.0035 * k, -0.5, 0.5);
          rig.pitch = clamp(rig.pitch + dy * 0.0025 * k, -0.15, 0.35);
          rig.springBack = true;
          break;
        case 'orbit':
          rig.yaw = clamp(rig.yaw - dx * 0.005 * k, -1.35, 1.35);
          rig.pitch = clamp(rig.pitch + dy * 0.004 * k, -0.12, 1.15);
          break;
        case 'follow':
        case 'close':
          rig.yaw = clamp(rig.yaw - dx * 0.004 * k, -0.9, 0.9);
          rig.pitch = clamp(rig.pitch + dy * 0.003 * k, -0.35, 0.7);
          rig.springBack = true;
          break;
        default:
          break;
      }
    };
    const pan = (dx: number, dy: number) => {
      const h = el.clientHeight || 800;
      if (rig.mode === 'facility') {
        rig.fFocusId = '';
        const s = (rig.fDist / h) * 1.1;
        const c = Math.cos(rig.fYaw);
        const sn = Math.sin(rig.fYaw);
        rig.fTarget.x -= (dx * c + dy * sn) * s;
        rig.fTarget.z -= (-dx * sn + dy * c) * s;
      } else if (rig.mode === 'photo') {
        const s = (rig.pDist / h) * 0.9;
        _a.set(1, 0, 0).applyQuaternion(camera.quaternion).multiplyScalar(-dx * s);
        _b.set(0, 1, 0).applyQuaternion(camera.quaternion).multiplyScalar(dy * s);
        rig.pTarget.add(_a).add(_b);
      }
    };
    const zoomBy = (f: number) => {
      switch (rig.mode) {
        case 'facility':
          rig.fDist *= f;
          break;
        case 'photo':
          rig.pDist = clamp(rig.pDist * f, 0.08, 12);
          break;
        case 'front':
          rig.zoom = clamp(rig.zoom * f, Math.min(1, Math.max(0.55, rig.zoomFloor)), 1.3);
          break;
        case 'orbit':
          rig.zoom = clamp(rig.zoom * f, Math.min(1, Math.max(0.45, rig.zoomFloor)), 1.8);
          break;
        case 'follow':
        case 'close':
          rig.zoom = clamp(rig.zoom * f, 0.5, 2.2);
          break;
        default:
          break;
      }
    };

    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, button: e.button, shift: e.shiftKey, type: e.pointerType });
      cameraInput.moved = 0;
      cameraInput.pointers = pointers.size;
      if (pointers.size === 2) {
        const [p1, p2] = [...pointers.values()];
        pinchD = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        pinchMid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      }
    };
    const onMove = (e: PointerEvent) => {
      if (e.target === el) {
        const r = el.getBoundingClientRect();
        rig.ptrX = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
        rig.ptrY = ((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1;
      } else {
        // over the HUD / a sheet: drift back to the neutral pose instead of following the cursor around the UI
        rig.ptrX = 0;
        rig.ptrY = 0;
      }
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      const total = Math.hypot(e.clientX - p.sx, e.clientY - p.sy);
      cameraInput.moved = Math.max(cameraInput.moved, total);
      if (!dragging && total > threshold(p.type)) {
        dragging = true;
        cameraInput.dragging = true;
      }
      if (!dragging) return;
      if (pointers.size >= 2) {
        const [p1, p2] = [...pointers.values()];
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        if (pinchD > 0 && dist > 0) zoomBy(pinchD / dist);
        if (rig.mode === 'facility' || rig.mode === 'photo') pan(mid.x - pinchMid.x, mid.y - pinchMid.y);
        else rotate((mid.x - pinchMid.x) * 0.5, (mid.y - pinchMid.y) * 0.5);
        pinchD = dist;
        pinchMid = mid;
        return;
      }
      const wantsPan = p.button === 2 || p.button === 1 || p.shift;
      if (wantsPan) pan(dx, dy);
      else if (!placingTool()) rotate(dx, dy);
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      cameraInput.pointers = pointers.size;
      if (pointers.size < 2) pinchD = 0;
      if (pointers.size === 0 && dragging) {
        dragging = false;
        cameraInput.dragging = false;
        cameraInput.lastDragEnd = performance.now();
        if (!placingTool()) noteCameraUserMove();
      }
    };
    const onWheel = (e: WheelEvent) => {
      if (rig.mode === 'attract' || rig.mode === 'idle') return;
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomBy(Math.exp(clamp(dy, -200, 200) * 0.0012));
      noteCameraUserMove();
    };
    const onContext = (e: Event) => e.preventDefault();
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('contextmenu', onContext);
    el.style.touchAction = 'none';
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('contextmenu', onContext);
    };
  }, [gl, camera]);

  // lens shift belongs to this rig: drop it when the rig goes away
  useEffect(
    () => () => {
      camera.clearViewOffset();
      view.valid = false;
      view.ox = NaN;
    },
    [camera],
  );

  // ── per-frame rig ──
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const t = state.clock.elapsedTime;
    const g = getGame();
    const reduced = getSettings().reducedMotion;
    const { mode, tank, creatureId } = resolveMode(g);
    const aspect = size.width / Math.max(1, size.height);
    // photo mode frames the whole canvas (the saved picture is the full frame, so no lens shift there)
    const screen = getUI().screen;
    const frameKind: FrameKind = mode === 'attract' ? 'menu' : screen === 'game' && mode !== 'idle' && mode !== 'photo' ? 'game' : 'none';
    updateFreeRect(gl.domElement, size.width, size.height, frameKind, screen, dt, false);
    view.axisWant = 0;
    const key = `${mode}|${tank?.id ?? ''}|${mode === 'follow' || mode === 'close' ? creatureId ?? '' : ''}`;

    const keyChanged = key !== rig.key;
    if (keyChanged) {
      const prevMode = rig.mode;
      rig.key = key;
      rig.mode = mode;
      if (mode === 'photo' && prevMode !== 'photo') {
        // free camera starts where we are, orbiting the current look-at point…
        const inTankShot = prevMode === 'front' || prevMode === 'orbit' || prevMode === 'follow' || prevMode === 'close';
        if (!inTankShot && tank) {
          // lane:qa-visual — …unless we were not looking at the tank yet (photo mode straight from the room view or
          // the first frames after load): then start from the tank's hero front shot instead of orbiting the room origin
          const f = heroFrame(tank, view.free, size.height, size.width, DEFAULT_FOV);
          _c.set(0, f.cy, 0);
          tankLocalToWorld(tank, _c, rig.target);
          sph(0, 0.06, f.D, _off).add(_c);
          tankLocalToWorld(tank, _off, rig.pos);
        }
        rig.pTarget.copy(rig.target);
        _a.copy(rig.pos).sub(rig.target);
        rig.pDist = Math.max(0.1, _a.length());
        rig.pYaw = Math.atan2(_a.x, _a.z);
        rig.pPitch = Math.asin(clamp(_a.y / rig.pDist, -1, 1));
      } else {
        if (mode !== 'facility' || prevMode !== 'facility') resetOffsets();
        if (mode === 'orbit') {
          // orbit opens on a gentle three-quarter view so the switch reads clearly
          rig.yaw = 0.5;
          rig.pitch = 0.22;
        }
        if (mode === 'facility' && g) {
          // lane:facrender — a click on a tank in the room sets the focused tank (this key change) and asks for a fly-to
          const want = facilityRequest.focusId ? g.tanks[facilityRequest.focusId] ?? null : null;
          if (want) frameFacilityTank(g, want);
          else frameFacility(g, tank, prevMode, size.width, size.height);
          // entering the room (not a tank switch inside it): this is where "Reset view" brings the player back to
          if (prevMode !== 'facility') {
            if (want) rig.fHome.dist = 0;
            else saveFacilityHome(size.width, size.height);
          }
          rig.fFocusId = want ? want.id : '';
          facilityRequest.focusId = '';
          facilityRequest.reset = false;
        }
      }
      if (rig.initialized && mode !== 'photo') {
        cameraFX.transitionSeq++;
        rig.tActive = true;
        rig.tT = 0;
        rig.tCut = reduced;
        // switching between in-tank views is a short move: keep it quick so the new subject is framed promptly
        const inTank = (m: RigMode) => m === 'front' || m === 'orbit' || m === 'follow' || m === 'close';
        rig.tDur = reduced ? 0.45 : prevMode === 'idle' ? 0.001 : prevMode === 'attract' ? 1.8 : inTank(prevMode) && inTank(mode) ? 0.9 : 1.25;
        rig.tFromPos.copy(rig.pos);
        rig.tFromTarget.copy(rig.target);
        rig.tFromFov = rig.fov;
      }
    }

    // lane:fix-integrate-ui (G2-04) — a facility upgrade grows the room and re-seats every tank without changing the
    // key: re-frame the new room from its own overview (dropping the old room's pan/zoom) with the usual glide
    let roomMove = false;
    if (g) {
      const sig = `${g.facility.level}|${g.facility.width}|${g.facility.depth}`;
      if (sig !== rig.roomSig) {
        roomMove = rig.roomSig !== '' && mode === 'facility' && !keyChanged && rig.initialized;
        rig.roomSig = sig;
        if (roomMove) {
          resetOffsets();
          facilityRequest.reset = true;
          facilityRequest.focusId = '';
        }
      }
    }

    // lane:facrender — room view requests without a key change: fly to a clicked tank / back to the overview
    if (mode === 'facility' && g && (facilityRequest.reset || facilityRequest.focusId)) {
      const want = facilityRequest.focusId ? g.tanks[facilityRequest.focusId] ?? null : null;
      if (want) frameFacilityTank(g, want);
      else if (roomMove || !restoreFacilityHome(size.width, size.height)) {
        frameFacility(g, null, 'facility', size.width, size.height);
        saveFacilityHome(size.width, size.height);
      }
      rig.fFocusId = want ? want.id : '';
      facilityRequest.reset = false;
      facilityRequest.focusId = '';
      if (rig.initialized) {
        cameraFX.transitionSeq++;
        rig.tActive = true;
        rig.tT = 0;
        rig.tCut = reduced;
        rig.tDur = reduced ? 0.45 : roomMove ? 1.6 : 0.9;
        rig.tFromPos.copy(rig.pos);
        rig.tFromTarget.copy(rig.target);
        rig.tFromFov = rig.fov;
      }
    }

    // pointer parallax smoothing
    const pk = 1 - Math.exp(-dt * 2.5);
    rig.px += (rig.ptrX - rig.px) * pk;
    rig.py += (rig.ptrY - rig.py) * pk;
    // spring back temporary peeks when not dragging
    if (rig.springBack && !cameraInput.dragging) {
      const sk = 1 - Math.exp(-dt * 1.6);
      rig.yaw -= rig.yaw * sk;
      rig.pitch -= rig.pitch * sk;
      if (Math.abs(rig.yaw) < 1e-3 && Math.abs(rig.pitch) < 1e-3) rig.springBack = false;
    }

    let fov = DEFAULT_FOV;
    let focusDist = 0;
    let focusRange = 0;
    let dof = 0;
    const dPos = rig.dPos;
    const dTarget = rig.dTarget;

    switch (mode) {
      case 'idle': {
        dTarget.set(0, 0.2 + Math.sin(t * 0.05) * 0.05, -4);
        dPos.set(Math.sin(t * 0.03) * 0.15, 0, 0);
        break;
      }
      case 'attract': {
        if (!tank) break;
        const yaw = 0.26 * Math.sin(t * 0.045) + 0.07 * Math.sin(t * 0.11 + 1.3);
        const pitch = 0.07 + 0.05 * Math.sin(t * 0.037 + 0.6);
        let dist: number;
        let cy: number;
        let shift = 0;
        if (isPortraitPhone(size.width, size.height)) {
          // portrait menus stack their text low on the screen: fit the tank into the band above it (the lens shift
          // centres it there, see computeMenuRect) instead of parking it behind the copy
          const f = heroFrame(tank, view.free, size.height, size.width, fov);
          dist = f.D * (1.1 + 0.04 * Math.sin(t * 0.029));
          cy = f.cy;
        } else {
          const f = frontDistance(tank, aspect, fov);
          dist = f.D * (1.08 + 0.05 * Math.sin(t * 0.029));
          cy = f.cy;
          // landscape title: the menu hugs the left, so frame the tank a little right of centre
          if (aspect > 1.1 && screen === 'title' && view.free.x0 < 1 && view.free.x1 > size.width - 1) shift = -f.L * 0.22;
        }
        const d = tankDims(tank);
        _c.set(shift + Math.sin(t * 0.05) * d.L * 0.04, cy + Math.sin(t * 0.07) * d.H * 0.03, 0);
        tankLocalToWorld(tank, _c, dTarget);
        sph(yaw, pitch, dist, _off).add(_c);
        tankLocalToWorld(tank, _off, dPos);
        focusDist = dist;
        break;
      }
      case 'facility': {
        if (!g) break;
        const b = facilityCameraBounds(g.facility);
        rig.fTarget.x = clamp(rig.fTarget.x, b.minX, b.maxX);
        rig.fTarget.z = clamp(rig.fTarget.z, b.minZ, b.maxZ);
        rig.fDist = clamp(rig.fDist, rig.fFocusId ? b.minDist * FOCUS_MIN_DIST : b.minDist, b.maxDist);
        dTarget.copy(rig.fTarget);
        sph(rig.fYaw, rig.fPitch, rig.fDist, _off);
        dPos.copy(dTarget).add(_off);
        dPos.y = Math.max(0.35, dPos.y);
        focusDist = rig.fDist;
        fov = rig.fFov;
        break;
      }
      case 'front':
      case 'orbit': {
        if (!tank) break;
        const f = heroFrame(tank, view.free, size.height, size.width, fov);
        const portrait = isPortraitPhone(size.width, size.height);
        const par = mode === 'front' && !reduced ? 1 : 0;
        const yaw = rig.yaw + rig.px * 0.03 * par;
        // phones look down into the tank: the water surface and substrate give the small picture depth and height
        const pitch = (portrait ? 0.14 : 0.035) + rig.pitch - rig.py * 0.018 * par;
        const minD = Math.hypot(f.L / 2, f.W / 2) + 0.1;
        // lane:w2-visual — side sheet open: lean in only until the tank body fills the free width (see rig.zoomFloor)
        const sheet = view.free.x1 - view.free.x0 < size.width * 0.92;
        const fitDist = sheet ? f.zFull / 0.94 + f.outerW / 2 : 0;
        rig.zoomFloor = sheet && f.D > 0 ? fitDist / f.D : 0;
        if (rig.zoom < rig.zoomFloor && rig.zoomFloor <= 1) rig.zoom += (rig.zoomFloor - rig.zoom) * Math.min(1, dt * 6);
        const dist = Math.max(mode === 'orbit' ? minD : f.W / 2 + 0.1, f.D * rig.zoom, fitDist);
        if (portrait) view.axisWant = portraitAnchor(f.bodyH, dist - f.outerW / 2, size.height, fov);
        _c.set(0, f.cy, 0);
        tankLocalToWorld(tank, _c, dTarget);
        sph(yaw, pitch, dist, _off).add(_c);
        tankLocalToWorld(tank, _off, dPos);
        focusDist = dist;
        dof = 0;
        break;
      }
      case 'follow':
      case 'close': {
        if (!tank) break;
        const d = tankDims(tank);
        const sg = shellGeom(d, getTankTier(tank.tierId));
        const rt = creatureId ? runtime.creatures.get(creatureId) : undefined;
        const close = mode === 'close';
        if (rt) {
          // gentle lag, cancelled out by a small velocity lead so a cruising animal stays near the frame centre
          const k = rig.followValid ? 1 - Math.exp(-dt * (close ? 2.2 : 3)) : 1;
          const lead = 0.28;
          const maxLead = Math.max(0.01, (rt.lengthM ?? 0.05) * 1.2);
          _b.set(rt.vel?.x ?? 0, rt.vel?.y ?? 0, rt.vel?.z ?? 0).multiplyScalar(lead);
          if (_b.lengthSq() > maxLead * maxLead) _b.setLength(maxLead);
          rig.follow.x += (rt.pos.x + _b.x - rig.follow.x) * k;
          rig.follow.y += (rt.pos.y + _b.y - rig.follow.y) * k;
          rig.follow.z += (rt.pos.z + _b.z - rig.follow.z) * k;
          rig.followValid = true;
        } else if (!rig.followValid) {
          rig.follow.set(0, d.H * 0.5, 0);
          rig.followValid = true;
        }
        const len = Math.max(0.008, rt?.lengthM ?? 0.05);
        const vw = size.width;
        const vh = size.height;
        const fr = view.free;
        const fw = Math.max(60, fr.x1 - fr.x0);
        const fh = Math.max(60, fr.y1 - fr.y0);

        // ── how much to show (world width across the free viewport at the animal) ──
        // follow: the animal plus swimming room (tiny animals get relatively more context); close: a portrait.
        // Both are capped by the tank so a big animal in a small tank never pulls the camera back into the room.
        let boxW = rt ? (close ? len * 1.8 + 0.025 : 2 * Math.pow(len, 0.6)) : d.L * (close ? 0.45 : 0.7);
        const cap = Math.min(d.L * (close ? 0.72 : 0.84), (d.H * (close ? 0.85 : 1.25) * fw) / fh);
        boxW = Math.min(boxW * rig.zoom, cap * Math.max(1, Math.sqrt(rig.zoom)));
        // …but always the whole animal (tall portrait frames would otherwise crop a long body to fit the tank height)
        if (rt) boxW = Math.max(boxW, Math.min(len * (close ? 1.25 : 1.4) * rig.zoom, d.L * 0.95));
        boxW = Math.max(0.05, boxW);

        // ── side profile: swing toward the animal's flank (close strongly, follow gently) ──
        let side = 0;
        if (rt) {
          // the flank faces the camera when the camera yaw equals the heading yaw folded into (−π/2, π/2]
          let a = Math.atan2(Math.sin(rt.yaw), Math.cos(rt.yaw));
          if (a > Math.PI / 2) a -= Math.PI;
          else if (a <= -Math.PI / 2) a += Math.PI;
          // head-on / tail-on sits on the fold: stay on the side we are already on instead of flipping across
          if (Math.abs(a) > 1.15 && rig.sYawValid && Math.abs(rig.sYaw) > 0.02 && Math.sign(a) !== Math.sign(rig.sYaw)) a = Math.sign(rig.sYaw) * (Math.PI / 2);
          const maxSide = close ? 0.62 : 0.3;
          side = clamp(a, -maxSide, maxSide);
        }
        if (!rig.sYawValid) {
          rig.sYaw = side;
          rig.sYawValid = true;
        } else rig.sYaw += (side - rig.sYaw) * (1 - Math.exp(-dt * 0.9));

        // ── lens + distance ──
        let lens = DEFAULT_FOV;
        if (close) {
          // telephoto portrait from a comfortable working distance
          const Dc = clamp(len * 2.6 + 0.14, 0.16, 1.2);
          lens = clamp((2 * Math.atan((boxW * vh) / (2 * Dc * fw)) * 180) / Math.PI, 12, 34);
        }
        let D = (boxW * vh) / (2 * Math.tan((lens * Math.PI) / 360) * fw);
        const T = _t.copy(rig.follow);
        const pitch0 = (close ? 0.05 : 0.08) + rig.pitch;
        // the flank swing never carries the camera past the tank's end, nor right up to its corner (it would look in
        // through the side pane / the corner silicone: a dark block with green glass edges) — lane:w2-visual, was L/2 + 2 cm
        const endX = Math.max(0.02, d.L / 2 - 0.06);
        // stay outside the front glass: back off along the view ray and narrow the lens to hold the framing
        const frontZ = sg.outerW / 2 + 0.03;
        // lane:w2-visual — lens position for a sight-line variant (flank-swing multiplier, extra pitch); see sightline.ts
        const lensAt = (sideMul: number, lift: number, out: { x: number; y: number; z: number }, pose?: { D: number; yaw: number; pitch: number }) => {
          const p = pitch0 + lift;
          const c = Math.cos(p);
          const lo = Math.asin(clamp((-endX - T.x) / Math.max(0.05, D * c), -1, 1));
          const hi = Math.asin(clamp((endX - T.x) / Math.max(0.05, D * c), -1, 1));
          const yw = clamp(rig.sYaw * sideMul, Math.min(0, lo), Math.max(0, hi)) + rig.yaw;
          const dd = Math.max(D, (frontZ - T.z) / Math.max(0.25, c * Math.cos(yw)));
          sph(yw, p, dd, _los);
          out.x = T.x + _los.x;
          out.y = T.y + _los.y;
          out.z = T.z + _los.z;
          if (pose) {
            pose.D = dd;
            pose.yaw = yw;
            pose.pitch = p;
          }
          return out;
        };
        // keep a clear sight line to the animal: re-check ~3×/s, glide between variants
        if (rt) {
          rig.losT -= dt;
          if (rig.losT <= 0) {
            rig.losT = 0.3;
            _losTo.set(rt.pos.x, rt.pos.y + len * 0.2, rt.pos.z);
            rig.losPick = pickSightline(tank, _losTo, rig.losPick, (sm, lf, o) => lensAt(sm, lf, o));
          }
        } else rig.losPick = LOS_DEFAULT;
        const kl = rig.losValid ? 1 - Math.exp(-dt * 1.8) : 1;
        rig.losSide += (rig.losPick[0] - rig.losSide) * kl;
        rig.losLift += (rig.losPick[1] - rig.losLift) * kl;
        rig.losValid = true;
        lensAt(rig.losSide, rig.losLift, _losC, _losPose);
        const pitch = _losPose.pitch;
        const yaw = _losPose.yaw;
        fov = lens;
        if (D < _losPose.D) {
          D = _losPose.D;
          fov = clamp((2 * Math.atan((boxW * vh) / (2 * D * fw)) * 180) / Math.PI, close ? 10 : 22, lens);
        }
        const C = sph(yaw, pitch, D, _off).add(T);

        // ── keep the shot on the tank: slide it so the view through the front face stays inside the tank outline ──
        const zF = sg.outerW / 2;
        if (C.z - T.z > 1e-4) {
          const tp = clamp((C.z - zF) / (C.z - T.z), 0, 1);
          const px = C.x + (T.x - C.x) * tp;
          const py = C.y + (T.y - C.y) * tp;
          const s = (2 * Math.max(0.02, D * tp) * Math.tan((fov * Math.PI) / 360)) / vh; // metres per px at the front face
          // lane:facrender — measured against the free rect (a phone's bottom sheet no longer pushes the subject under it)
          const { dx, dy } = tankSlide({ px, py, outerL: sg.outerL, bottomY: sg.bottomY, topY: sg.topY, fr, vw, vh, s });
          T.x += dx;
          C.x += dx;
          T.y += dy;
          C.y += dy;
        }
        // lane:w2-visual — …and the slide never carries the lens past the end margin either
        C.x = clamp(C.x, -endX - 0.02, endX + 0.02);
        tankLocalToWorld(tank, T, dTarget);
        tankLocalToWorld(tank, C, dPos);
        // focus on the animal itself (the look-at point leads it and may be slid toward the tank centre)
        focusDist = rt ? dPos.distanceTo(tankLocalToWorld(tank, rt.pos, _b)) : dPos.distanceTo(dTarget);
        if (close) {
          dof = 0.7;
          focusRange = len * 1.2 + 0.03;
        }
        break;
      }
      case 'photo': {
        const ps = usePhotoSettings.getState();
        fov = zoomToFov(ps.zoom);
        sph(rig.pYaw, rig.pPitch, rig.pDist, _off);
        dTarget.copy(rig.pTarget);
        dPos.copy(rig.pTarget).add(_off);
        // stay outside the tank glass (free camera)
        if (tank) {
          const d = tankDims(tank);
          worldToTankLocal(tank, dPos, _b);
          const hx = d.L / 2 + d.glass + 0.03;
          const hz = d.W / 2 + d.glass + 0.03;
          if (Math.abs(_b.x) < hx && Math.abs(_b.z) < hz && _b.y > -0.05 && _b.y < d.H + 0.05) {
            const ex = hx - Math.abs(_b.x);
            const ez = hz - Math.abs(_b.z);
            const ey = d.H + 0.05 - _b.y;
            if (ez <= ex && ez <= ey) _b.z = Math.sign(_b.z || 1) * hz;
            else if (ex <= ey) _b.x = Math.sign(_b.x || 1) * hx;
            else _b.y = d.H + 0.05;
            tankLocalToWorld(tank, _b, dPos);
          }
        }
        let fd = dPos.distanceTo(dTarget);
        if (ps.focusMode === 'manual') fd = focusToMetres(ps.focus);
        else if (creatureId && tank) {
          const rt = runtime.creatures.get(creatureId);
          if (rt) {
            fd = dPos.distanceTo(tankLocalToWorld(tank, rt.pos, _c));
            // auto focus keeps the whole subject sharp, however shallow the aperture
            focusRange = (rt.lengthM ?? 0.05) * 0.9 + 0.02;
          }
        }
        focusDist = fd;
        dof = ps.aperture;
        break;
      }
    }
    rig.dFov = fov;

    if (!rig.initialized) {
      rig.pos.copy(dPos);
      rig.target.copy(dTarget);
      rig.fov = fov;
      rig.initialized = mode !== 'idle' || !!g;
    }

    if (rig.tActive) {
      rig.tT += dt;
      const p = rig.tT / Math.max(0.001, rig.tDur);
      if (rig.tCut) {
        // reduced motion: quick fade out → cut → fade in
        cameraFX.fade = p < 0.4 ? p / 0.4 : Math.max(0, 1 - (p - 0.4) / 0.6);
        if (p >= 0.4) {
          rig.pos.copy(dPos);
          rig.target.copy(dTarget);
          rig.fov = fov;
        }
      } else {
        const e = ease(p);
        const travel = rig.tFromPos.distanceTo(dPos);
        const lift = Math.sin(Math.PI * e) * Math.min(0.8, travel * 0.22);
        rig.pos.lerpVectors(rig.tFromPos, dPos, e);
        rig.pos.y += lift;
        rig.target.lerpVectors(rig.tFromTarget, dTarget, e);
        rig.fov = rig.tFromFov + (fov - rig.tFromFov) * e;
      }
      if (p >= 1) {
        rig.tActive = false;
        cameraFX.fade = 0;
      }
    } else {
      // damped tracking of the desired pose
      const k = mode === 'attract' || mode === 'idle' ? 1 : 1 - Math.exp(-dt * (mode === 'facility' || mode === 'photo' ? 9 : 6));
      rig.pos.lerp(dPos, k);
      rig.target.lerp(dTarget, k);
      rig.fov += (fov - rig.fov) * (1 - Math.exp(-dt * 5));
    }

    camera.position.copy(rig.pos);
    camera.lookAt(rig.target);
    applyLensShift(camera, size.width, size.height, rig.fov);
    updateFacilityOverflow(mode === 'facility' ? g : null, camera, dt);

    cameraFX.mode = mode;
    cameraFX.transitioning = rig.tActive;
    cameraFX.focusDistance = focusDist > 0 ? focusDist : rig.pos.distanceTo(rig.target);
    cameraFX.bokehScale = dof;
    cameraFX.focusRange = focusRange;
    cameraFX.dofEnabled = dof > 0.01;
  }, -2);

  return null;
}
