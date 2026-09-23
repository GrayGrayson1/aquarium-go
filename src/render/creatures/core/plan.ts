/**
 * FishPlan: the complete, data-only description of a procedural fish. OWNER: lane "fishart".
 *
 * A species body plan (src/render/creatures/fish/<species>.ts) turns a creature's appearance into a FishPlan; the core
 * generator (`buildFish`) lofts the body, grows the fins, places the eyes and wires the swim/pattern shader.
 *
 * Coordinates (creature local space, see src/render/creatures/types.ts): head +X, up +Y, right side +Z.
 * Standard length = 1 unit (snout tip → caudal tip). Along the body, `t` runs 0 (snout) → 1 (end of caudal peduncle).
 * Around the body, θ runs 0 (dorsal midline) → π/2 (+Z flank) → π (ventral) → 3π/2 (−Z flank).
 * `yn` is the normalised height on the flank: −1 = belly edge, 0 = body axis, +1 = back.
 */
import type { Curve } from './math';
import type { PatternKind } from '@/types';

/** Colour reference: a slot from the creature's appearance, a named constant, or a literal CSS colour. */
export type ColorRef =
  | 'body'
  | 'body2'
  | 'belly'
  | 'fin'
  | 'fin2'
  | 'accent'
  | 'eye'
  | 'black'
  | 'white'
  | 'clear'
  | `#${string}`;

export type MouthKind = 'terminal' | 'upturned' | 'subterminal' | 'sucker' | 'beak' | 'tube';

export interface BodySpec {
  /** x of the snout tip (units). Default 0.42. */
  noseX: number;
  /** Snout tip → end of caudal peduncle (units). */
  length: number;
  /** Height of the dorsal outline above the axis, as a function of t (units, before bodyDepth). */
  dorsal: Curve;
  /** Depth of the ventral outline below the axis (positive, units). */
  ventral: Curve;
  /** Half-width (units). */
  width: Curve;
  /** Axis (centreline) height offset (units). Default 0. */
  axis?: Curve;
  /** Superellipse exponent of the upper/lower cross-section halves (2 = ellipse, >2 boxy, <2 keeled). */
  expTop?: number | Curve;
  expBottom?: number | Curve;
  /** Exponent across the flank (z). Defaults to the upper/lower exponent. */
  expSide?: number | Curve;
  /** Length (in t) of the rounded snout cap. */
  noseRound?: number;
  /** Rounded cap at the peduncle end (hidden by the caudal fin). */
  tailRound?: number;
  mouth: { kind: MouthKind; yn: number; t: number; groove?: number };
  /** Gill-cover (operculum) posterior edge position in t, and how strongly it is drawn. */
  operculum: { t: number; strength: number; flare?: number };
  /** Cheek fullness below/behind the eye. */
  cheek?: number;
  /** Bumpy head growth (oranda wen / ranchu hood). 0..1 */
  wen?: number;
  /** Extra nuchal hump (ryukin). Folded into dorsal curve by the plan, stored here for shading. */
  hump?: number;
  /** Rough cross-section keel on the belly (0..1). */
  keel?: number;
}

export interface MotionSpec {
  /** Body-wave wavelength in body lengths (carangiform ≈1, anguilliform ≈0.5). */
  wavelength: number;
  /** Tail amplitude at cruise speed (units). */
  amp: number;
  /** Tail amplitude while hovering. */
  idleAmp: number;
  /** Envelope exponent (higher = motion concentrated in the tail). */
  envPow: number;
  /** Fraction of amplitude the head keeps (yaw counter-sway). */
  headSway: number;
  /** Body curvature per unit `bend` (turns). */
  bendK: number;
  /** Pectoral beat frequency (Hz) at full flutter. */
  pectoralHz: number;
  /** Pectoral flap amplitude (0..1). */
  pectoralAmp: number;
  /** Baseline pectoral flutter while idle (0..1). */
  idleFlutter: number;
  /** Global secondary fin-motion multiplier (long fins billow more). */
  finSoft: number;
  /** Fin spread at rest (0 clamped .. 1 fully spread); flare pushes toward 1. */
  finRest: number;
  /** Long-fin droop when slow. */
  sag: number;
  /** Idle tail-beat frequency (Hz) when the runtime phase is not advancing. */
  idleHz: number;
  /** Phase lag (radians per unit r) of fin edges behind the body wave. */
  finLag: number;
  /** Clownfish-style rocking roll/yaw per beat (radians). */
  waddle?: number;
  /** Mandarin-style hop (units of body length). */
  hop?: number;
  /** Rigid body (pufferfish/boxfish): body wave only in the tail. */
  rigid?: boolean;
  /** Gill-cover flare during display (0..1). */
  gillFlare?: number;
  /** Idle breathing (gill/mouth pumping) amount. */
  breathe?: number;
  /** Dorsal-filament flick (firefish) amount. */
  flick?: number;
}

export type MarkMode = 'ellipse' | 'ring' | 'band_t' | 'band_y' | 'stripe';

/** A soft elliptical colour mark in body space (t, yn), e.g. eye mask, peduncle spot, face stripe. */
export interface Mark {
  t: number;
  yn: number;
  rt: number;
  ryn: number;
  color: ColorRef;
  strength?: number; // 0..1 (default 1)
  soft?: number; // 0..1 edge softness (default 0.35)
  mode?: MarkMode;
  /** Rotation in the (t, yn) plane, radians (slants stripes). */
  rot?: number;
  /** Fins: 0 = body only, 0..1 = body + fins at that strength, 2 = fins only. */
  onFins?: number;
}

/** Clownfish-style band: centre t, half width, curvature (back-bulge at mid height), forward arrow bulge. */
export interface BandSpec {
  t: number;
  w: number;
  curve?: number;
  arrow?: number;
}

export interface LateralStripeSpec {
  /** yn of stripe centre at the head and at the tail. */
  yn0: number;
  yn1: number;
  /** Half-width in yn. */
  w: number;
  /** t range. */
  t0: number;
  t1: number;
  /** Red lower-body region start t (neon ~0.45; cardinal ~0.08). Set > 1 to disable. */
  redT0: number;
  /** Colour of the lower body region (defaults to 'body2'). */
  lowerColor?: ColorRef;
}

export interface LookSpec {
  /** 0..1 darkening/shift toward body2 on the back. */
  dorsalDark: number;
  /** yn below which belly colour takes over, and blend amount. */
  bellyLine: number;
  bellyAmount: number;
  bellySoft?: number;
  /** Scale grid: columns along the body, strength 0..1, kind (cycloid, fine, skin, plates, ctenoid). */
  scales: { cols: number; strength: number; kind: 'cycloid' | 'fine' | 'skin' | 'plates' | 'ctenoid' };
  /** Base surface roughness (0.2 wet gloss .. 0.7 matte). */
  roughness: number;
  /** Clear-coat mucus gloss 0..1. */
  gloss?: number;
  lateralLine?: number;
  marks?: Mark[];
  bands?: BandSpec[];
  stripe?: LateralStripeSpec;
  /** Colour of pattern edges (clownfish black band edges, marble outlines). */
  patternEdge?: ColorRef;
  patternEdgeWidth?: number;
  /** Species-level pattern override (used when appearance.pattern is 'solid' but the species always has markings). */
  pattern?: PatternKind;
  /** Pattern parameters interpreted by specific patterns (see shaders.ts). */
  patA?: [number, number, number, number];
  patB?: [number, number, number, number];
  /** Where iridescence shows: 'body' everywhere, 'stripe' only the lateral stripe, 'scales' sparkling scales. */
  iridMode?: 'body' | 'stripe' | 'scales' | 'back';
  /** Thin-film hue offset (0..1) — shifts which colours the iridescence sweeps through. */
  iridHue?: number;
  /** Subsurface/wrap brightness of the body (0..1). */
  sss?: number;
  /** Where patterns fade on the belly (yn); -2 disables. */
  patternBellyFade?: number;
  /** Colour of lips/mouth line. */
  lipColor?: ColorRef;
  /** Colour of the operculum (gill cover) tint. */
  gillTint?: ColorRef;
  /** Colour of appendages (barbels/bristles/spines) — default body2. */
  appendageColor?: ColorRef;
  /**
   * Remap the appearance colour slots the shader uses (e.g. mandarin: base = body2 blue, lines = body orange).
   * Keys are shader slots, values any ColorRef.
   */
  slots?: Partial<Record<'body' | 'body2' | 'belly' | 'fin' | 'fin2' | 'accent', ColorRef>>;
  /** Draw marks first and the pattern over them (e.g. banggai pearl spots over black bars). */
  marksUnderPattern?: boolean;
  /** Species-specific rendering of an appearance pattern (e.g. lionfish { bands: 'bars' }). */
  patternMap?: Partial<Record<PatternKind, PatternKind>>;
}

export interface EyeSpec {
  t: number;
  yn: number;
  /** Radius (units). */
  r: number;
  /** Fraction of the eyeball diameter that protrudes from the head (0..1). */
  protrude: number;
  /** Look axis tilt forward/up (radians). */
  forward: number;
  up: number;
  /** Iris colour override (defaults to appearance.eyeColor). */
  iris?: ColorRef;
  /** Colour of a ring/iris rim (kole tang gold ring, clownfish orange iris). */
  ring?: ColorRef;
  ringWidth?: number;
  /** Pupil radius as fraction of visible eye (0.3..0.7). */
  pupil: number;
  /** Eye stalk / telescope protrusion (units). */
  stalk?: number;
  /** Eye can swivel far (pea puffer, mandarin): multiplier on runtime eyeL/eyeR. */
  swivel?: number;
  /** Bar/mask through the eye (drawn onto the iris). */
  maskColor?: ColorRef;
  /** Skin colour around the exposed eyeball (socket rim). Default 'body'. */
  socket?: ColorRef;
}

export type FinRole = 'dorsal' | 'caudal' | 'anal' | 'pectoral' | 'pelvic' | 'adipose' | 'beard' | 'thread' | 'spine' | 'sail';

export const FIN_ROLE_ID: Record<FinRole, number> = {
  dorsal: 0,
  caudal: 1,
  anal: 2,
  pectoral: 3,
  pelvic: 4,
  adipose: 5,
  beard: 6,
  thread: 7,
  spine: 8,
  sail: 9,
};

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

/**
 * Geometric fin description produced by the fin library (fins.ts). s ∈ [0,1] runs along the fin root (front → back
 * for median fins), r ∈ [0,1] from the root to the edge.
 */
export interface FinShape {
  role: FinRole;
  /** Root point on the body for s. */
  root: (s: number) => [number, number, number];
  /** Spread ray: unit direction and length for s. */
  ray: (s: number) => { dir: [number, number, number]; len: number };
  /** Folded (clamped) ray. */
  fold: (s: number) => { dir: [number, number, number]; len: number };
  /** Membrane normal (for median fins [0,0,1]). */
  normal: [number, number, number];
  /** Out-of-plane cupping (units at the edge, sign = side). */
  cup: number;
  /** Membrane S-curve ripple baked into the rest shape. */
  ripple?: number;
  /** Number of fin rays drawn by the shader. */
  rays: number;
  /** Crowntail web recession (0 = full webbing, 0.6 = deep spikes). */
  web: number;
  /** Secondary motion multiplier (0 stiff .. 1.5 very flowy). */
  soft: number;
  /** Mesh resolution. */
  segS: number;
  segR: number;
  /** Create the mirrored copy on the −Z side (paired fins). */
  mirror?: boolean;
  /** Visual options (resolved per individual into shader uniforms). */
  style: FinStyle;
}

export interface FinStyle {
  /** Base membrane colour (default 'fin'). */
  color?: ColorRef;
  /** Edge colour (default 'fin2') + where it starts (r) + blend width. */
  edge?: ColorRef;
  edgeStart?: number;
  edgeWidth?: number;
  edgeAmount?: number;
  /** Membrane opacity 0..1. */
  opacity: number;
  /** How much the body pattern continues onto this fin (0..1). */
  pattern?: number;
  /** Ray visibility (0..1). */
  rayContrast?: number;
  /** Iridescent sparkle 0..1. */
  irid?: number;
  /** Blend from body colour at the root (r distance). */
  rootBlend?: number;
  /** Phase offset for flutter / independent motion. */
  phase?: number;
  /** Flutter amplitude multiplier for this fin. */
  flutter?: number;
  /** Rest spread override for this fin. */
  rest?: number;
}

/** Tube-like appendage (barbel, bristle, spine, whisker) merged into the body mesh. */
export interface ExtraSpec {
  kind: 'barbel' | 'bristle' | 'spine' | 'wen' | 'filament';
  /** Polyline in creature space (units). */
  path: [number, number, number][];
  radius: number;
  /** Radius at the tip as fraction of base. */
  taper: number;
  color?: ColorRef;
  /** Mirror to −Z side. */
  mirror?: boolean;
  /** Body t this appendage hangs from (for pattern lookups / wave). */
  t: number;
}

export interface FishPlan {
  /** Geometry cache key — must change whenever the geometry changes (species + finType + sex variants...). */
  key: string;
  body: BodySpec;
  /** Fin builders receive the lofted body so roots sit on its surface. */
  fins: FinShape[];
  eye: EyeSpec;
  extras?: ExtraSpec[];
  motion: MotionSpec;
  look: LookSpec;
  pickRadius?: number;
}
