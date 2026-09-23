/**
 * GLSL for the procedural fish. OWNER: lane "fishart".
 *
 * Injected into MeshPhysicalMaterial via onBeforeCompile (materials.ts), so fish get three.js lights, shadows,
 * tone mapping and colour management for free, plus:
 *  - vertex swim deformation (travelling body wave, turn bend, puff, belly, gill flare, mouth, fin spread/billow/flutter)
 *  - fragment pattern synthesis for every PatternKind, seeded per individual
 *  - scale micro-relief with per-scale glints, countershading, thin-film iridescence, metallic sheen,
 *    fake water-surface environment reflection, wrap/subsurface fill, translucent back-lit fins
 *  - underwater caustics + path fog (UNDERWATER_PARS / agApplyUnderwater from src/render/shared/underwater.ts)
 */
import { GLSL_SIMPLEX3 } from '../../shared/glsl';

export const PATTERN_ID: Record<string, number> = {
  solid: 0,
  none: 0,
  bands: 1,
  bars: 2,
  spots: 3,
  speckled: 4,
  marble: 5,
  butterfly: 6,
  bicolor: 7,
  dalmatian: 8,
  grizzle: 9,
  lateral_stripe: 10,
  mottled: 11,
  reticulated: 12,
  koi: 13,
  dragon_scale: 14,
  lined: 15,
  saddle: 16,
};

export const MAX_FINS = 14;
export const MAX_MARKS = 8;

// ───────────────────────────────── vertex ─────────────────────────────────

export const SWIM_PARS = /* glsl */ `
uniform vec4 uSwimA;  // phase, amplitude, wavenumber k, bend
uniform vec4 uSwimB;  // noseX, tailX, envelope power, head sway
uniform vec4 uSwimC;  // time, speed01, bendK, finSoft
uniform vec4 uShapeA; // puff, belly, bodyDepth, mouthOpen
uniform vec4 uShapeB; // gillFlare, flutter, finFlare, sag
uniform vec4 uHeadA;  // mouthT, mouthYn, operculumT, pectoral Hz
uniform vec4 uLag;    // turn lag, speed streamline, breathe, fin phase lag per r
uniform vec4 uStateA; // fin clamp (stress/sleep/death), _, _, _
varying vec3 vFsRest;
varying vec3 vAgWorldPos;
varying vec3 vAgWorldNormal;

// Amplitude envelope: head sway + power ramp to the tail base, then a gentle linear continuation into the caudal
// fin (so long fins follow the tail rather than whipping into loops).
float fsEnv(float x){
  float a = max(0.0, (uSwimB.x - x) / max(0.05, uSwimB.x - uSwimB.y));
  float e = a <= 1.0 ? pow(a, uSwimB.z) : 1.0 + min(a - 1.0, 0.8) * min(uSwimB.z, 2.5) * 0.3;
  return uSwimB.w + e;
}
float fsWaveZ(float x, float lag){
  float d = uSwimB.x - x;
  return uSwimA.y * fsEnv(x) * sin(uSwimA.z * d - uSwimA.x + lag) - uSwimA.w * uSwimC.z * x * x;
}
`;

/** Body: replaces <beginnormal_vertex>; defines fsP / objectNormal. */
export const BODY_VERT_PARS = /* glsl */ `
attribute vec4 aBody;
attribute vec2 aAxis;
varying vec4 vBody;
`;

export const BODY_VERT_NORMAL = /* glsl */ `
vec3 fsP = position;
vec3 objectNormal = normal;
{
  float t = aBody.x;
  float yn = aBody.y;
  vec2 rad = vec2(fsP.y - aAxis.x, fsP.z);
  float appendage = step(0.5, aBody.w);
  rad.x *= uShapeA.z;
  // puff: inflate about the axis, belly and flanks most
  float pw = uShapeA.x * (0.32 + 0.6 * smoothstep(0.4, -0.95, yn)) * smoothstep(0.0, 0.22, t) * smoothstep(1.0, 0.55, t);
  // belly: fed / gravid ventral bulge
  float bw = uShapeA.y * 0.16 * smoothstep(0.15, -0.95, yn) * sin(clamp((t - 0.16) / 0.56, 0.0, 1.0) * 3.14159);
  // breathing: gill plates pump gently
  float opT = uHeadA.z;
  float gill = smoothstep(opT - 0.11, opT - 0.005, t) * (1.0 - smoothstep(opT - 0.004, opT + 0.01, t)) * (1.0 - yn * yn);
  float breathe = uLag.z * 0.006;
  rad *= 1.0 + (pw + bw) * (1.0 - appendage);
  rad.y += sign(rad.y) * (uShapeB.x * 0.055 + breathe) * gill * (1.0 - appendage);
  // mouth: lower jaw drops, upper lip lifts a touch
  float mt = clamp(1.0 - t / max(uHeadA.x, 1e-3), 0.0, 1.0);
  float lower = smoothstep(uHeadA.y + 0.1, uHeadA.y - 0.3, yn);
  rad.x -= uShapeA.w * mt * mt * (lower * 0.06 - (1.0 - lower) * 0.012);
  fsP.y = aAxis.x + rad.x;
  fsP.z = rad.y;
  float z0 = fsWaveZ(fsP.x, 0.0);
  float dz = (fsWaveZ(fsP.x + 0.003, 0.0) - fsWaveZ(fsP.x - 0.003, 0.0)) / 0.006;
  fsP.z += z0;
  objectNormal = normalize(vec3(normal.x - dz * normal.z, normal.y / max(uShapeA.z, 0.4), normal.z));
  vBody = aBody;
  vFsRest = position;
}
`;

/** Fins: replaces <beginnormal_vertex>. */
export const FIN_VERT_PARS = /* glsl */ `
attribute vec4 aFin;   // s, r, finIndex, dist
attribute vec4 aFinB;  // rays, web, soft, role
attribute vec3 aFold;
attribute vec4 aRoot;  // root xyz, axisY
uniform vec4 uFinMot[${MAX_FINS}]; // restSpread, lengthScale, flutterAmp, phase
varying vec4 vFin;
varying vec4 vFinB;
`;

export const FIN_VERT_NORMAL = /* glsl */ `
vec3 fsP;
vec3 objectNormal = normal;
{
  int fi = int(aFin.z + 0.5);
  vec4 mot = uFinMot[fi];
  float role = aFinB.w;
  float s = aFin.x;
  float r = aFin.y;
  float flare = uShapeB.z;
  float spread = clamp(mix(mot.x, 1.0, flare), 0.0, 1.0);
  // streamline: long fins fold back a little at speed
  spread = clamp(spread - uLag.y * 0.25 * aFinB.z, 0.0, 1.0);
  // clamped fins: stress, sleep and death fold the fins against the body (beards stay tucked)
  spread *= 1.0 - uStateA.x * (role > 5.5 && role < 6.5 ? 1.0 : 0.85);
  vec3 q = mix(aFold, position, spread);
  q = aRoot.xyz + (q - aRoot.xyz) * mot.y;
  // follow body depth / puff at the root
  vec2 rootRad = vec2(aRoot.y - aRoot.w, aRoot.z);
  float pwRoot = uShapeA.x * 0.45 + uShapeA.y * 0.05;
  q.y += rootRad.x * (uShapeA.z - 1.0) + rootRad.x * pwRoot;
  q.z += rootRad.y * pwRoot;
  float dist = aFin.w * mot.y;
  float soft = aFinB.z * uSwimC.w;
  vec3 nrm = normal;
  float side = sign(nrm.z + 1e-4);
  float t = uSwimC.x;
  // flapping about the root line: pectoral hover / rowing, puffer-style dorsal+anal sculling
  {
    bool paired = role > 2.5 && role < 4.5;
    float amp = paired ? (role < 3.5 ? mot.z + uShapeB.y : mot.z * (0.5 + 0.5 * uShapeB.y))
                       : mot.z * (0.35 + 0.65 * uShapeB.y);
    if (amp > 0.0) {
      float w = uHeadA.w * 6.2831 * (role > 3.5 && role < 4.5 ? 0.6 : 1.0);
      float ph = t * w + mot.w - r * 1.3 + s * (paired ? 1.1 : 2.6) + (paired ? side * 0.55 : 0.0);
      q += nrm * sin(ph) * amp * dist * 0.62;
      if (paired) q.x += cos(ph) * amp * dist * 0.2 * r;
    }
  }
  // gourami feelers: slow exploratory sweeps
  if (role > 6.5 && role < 7.5) {
    float ph = t * 1.3 + mot.w;
    q += nrm * sin(ph + r * 1.7) * dist * 0.22 * r;
    q.y += sin(ph * 0.7 + r * 2.1) * dist * 0.12 * r;
  }
  // dorsal filament flick (firefish)
  if (role > 8.5) {
    float fl = mot.z * (0.5 + 0.5 * sin(t * 2.3 + mot.w)) * pow(max(0.0, sin(t * 0.9 + mot.w)), 6.0);
    q.x += fl * dist * 0.35 * r;
    q.y -= fl * dist * 0.2 * r;
  }
  // billowing membrane: ripple travelling out along the rays + slow turbulence
  float wph = uSwimA.x * 0.9 - r * 3.4 + s * 2.3;
  float bil = sin(wph) * (0.035 + 0.055 * uSwimC.y) + 0.035 * sin(t * 1.7 + s * 6.0 + r * 2.6) + 0.015 * sin(t * 3.1 - s * 11.0);
  bil += uLag.x * 0.55;
  q += nrm * soft * r * r * dist * bil * (role > 2.5 && role < 4.5 ? 0.5 : 1.0);
  // long fins droop when the fish is slow
  q.y -= uShapeB.w * soft * r * r * dist * (1.0 - uSwimC.y) * 0.3;
  // body wave (+ phase lag toward the fin edge = whip)
  float lag = r * uLag.w * min(soft, 1.0);
  float z0 = fsWaveZ(q.x, lag);
  float dz = (fsWaveZ(q.x + 0.003, lag) - fsWaveZ(q.x - 0.003, lag)) / 0.006;
  q.z += z0;
  fsP = q;
  objectNormal = normalize(vec3(nrm.x - dz * nrm.z, nrm.y, nrm.z));
  vFin = aFin;
  vFinB = aFinB;
  vFsRest = position;
}
`;

export const VERT_BEGIN = /* glsl */ `
vec3 transformed = fsP;
`;

export const VERT_WORLD = /* glsl */ `
#include <worldpos_vertex>
{
  vec4 agWp = modelMatrix * vec4(transformed, 1.0);
  vAgWorldPos = agWp.xyz;
  vAgWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
}
`;

// ───────────────────────────────── fragment ─────────────────────────────────

export const FRAG_PARS = /* glsl */ `
uniform vec3 uCBody;
uniform vec3 uCBody2;
uniform vec3 uCBelly;
uniform vec3 uCFin;
uniform vec3 uCFin2;
uniform vec3 uCAccent;
uniform vec3 uCEdge;
uniform vec3 uCLower;
uniform vec3 uCLip;
uniform vec3 uCAppend;
uniform vec4 uLookA;  // dorsalDark, bellyLine, bellyAmount, bellySoft
uniform vec4 uLookB;  // scaleCols, scaleRows, scaleStrength, scaleKind
uniform vec4 uLookC;  // iridescence, metallic, translucency, glow
uniform vec4 uLookD;  // patternScale, patternContrast, edgeWidth, roughness
uniform vec4 uLookE;  // colorIntensity, highlight, operculumStrength, lateralLine
uniform vec4 uLookF;  // iridMode, iridHue, sss, patternBellyFade
uniform vec4 uLookG;  // regularity, gloss, pattern id, opT
uniform vec4 uPatA;
uniform vec4 uPatB;
uniform vec4 uLookH;  // marksUnderPattern, _, _, _
uniform vec4 uBands[4];
uniform vec4 uStripe;  // yn0, yn1, halfW, redT0
uniform vec4 uStripe2; // t0, t1, _, _
uniform vec4 uMarkA[${MAX_MARKS}];
uniform vec4 uMarkB[${MAX_MARKS}];
uniform vec4 uMarkC[${MAX_MARKS}];
uniform vec3 uSeed;
uniform vec4 uSwimB;
uniform vec4 uHeadA;
uniform vec4 uShapeA;
varying vec3 vFsRest;
varying vec3 vAgWorldPos;
varying vec3 vAgWorldNormal;
${GLSL_SIMPLEX3}

float fsH1(vec3 p){ p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
vec3 fsH3(vec3 p){ return vec3(fsH1(p), fsH1(p + vec3(17.3, 5.1, 9.7)), fsH1(p + vec3(3.7, 41.2, 23.9))); }
float fsH2(vec2 p){ return fsH1(vec3(p, 7.13)); }

// Cellular noise: (F1, F2, cell id)
vec3 fsCell(vec3 p){
  vec3 ip = floor(p); vec3 fp = fract(p);
  float d1 = 9.0; float d2 = 9.0; float id = 0.0;
  for (int k = -1; k <= 1; k++) for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec3 g = vec3(float(i), float(j), float(k));
    vec3 o = fsH3(ip + g) * 0.85 + 0.075;
    vec3 r = g + o - fp;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = fsH1(ip + g + 3.1); } else if (d < d2) { d2 = d; }
  }
  return vec3(sqrt(d1), sqrt(d2), id);
}

float fsAA(float d, float w){ float fw = max(fwidth(d), 1e-4) * 0.9 + w; return 1.0 - smoothstep(-fw, fw, d); }

vec3 fsSat(vec3 c, float s){ float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); return max(vec3(0.0), mix(vec3(l), c, s)); }

vec3 fsThinFilm(float cosT, float hue){
  float d = hue + (1.0 - cosT) * 0.85;
  return 0.5 + 0.5 * cos(6.2831 * (d + vec3(0.0, 0.33, 0.67)));
}

// Cotangent frame from screen derivatives (tangent-free bump mapping); T/B are unit-ish along uv.x / uv.y.
mat3 fsTBN(vec3 p, vec3 n, vec2 uv){
  vec3 q0 = dFdx(p); vec3 q1 = dFdy(p);
  vec2 st0 = dFdx(uv); vec2 st1 = dFdy(uv);
  vec3 q1perp = cross(q1, n); vec3 q0perp = cross(n, q0);
  vec3 T = q1perp * st0.x + q0perp * st1.x;
  vec3 B = q1perp * st0.y + q0perp * st1.y;
  float det = max(dot(T, T), dot(B, B));
  float sc = det == 0.0 ? 0.0 : inversesqrt(det);
  return mat3(T * sc, B * sc, n);
}

// Overlapping (imbricated) scale field. Returns (height, edge distance, id, radial angle).
// q in scale units: x grows toward the head, y around the body.
vec4 fsScales(vec2 q){
  vec2 cell = floor(q);
  float best = -1e9; vec4 res = vec4(0.0, 1.0, 0.0, -1.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = cell + vec2(float(i), float(j));
    vec2 ctr = vec2(c.x + 0.5 + 0.5 * mod(c.y, 2.0), c.y + 0.5);
    vec2 d = q - ctr;
    d.x *= 0.92;
    float rr = length(d);
    float R = 0.78;
    if (rr < R) {
      float prio = ctr.x * 4.0 - abs(d.y) * 0.1 + ctr.y * 0.01;
      if (prio > best) {
        best = prio;
        float e = (R - rr) / R;
        res = vec4(smoothstep(0.0, 0.5, e), e, fsH2(c), atan(d.y, d.x) + 6.2832);
      }
    }
  }
  return res;
}

// Soft ellipse mark in (t, yn) space.
float fsMark(int i, float t, float yn){
  vec4 a = uMarkA[i]; vec4 c = uMarkC[i];
  float mode = c.y;
  vec2 d = vec2(t - a.x, yn - a.y);
  float cr = cos(c.z), sr = sin(c.z);
  d = vec2(cr * d.x - sr * d.y, sr * d.x + cr * d.y);
  d /= max(a.zw, vec2(1e-4));
  float dist;
  if (mode < 0.5) dist = length(d) - 1.0;
  else if (mode < 1.5) dist = abs(length(d) - 1.0) - 0.22;
  else if (mode < 2.5) dist = max(abs(d.x) - 1.0, abs(d.y) - 1.0);
  else if (mode < 3.5) dist = abs(d.y) - 1.0;
  else dist = max(abs(d.y) - 1.0, abs(d.x) - 1.0);
  float soft = max(0.02, c.x);
  float n = snoise(vec3(t * 23.0, yn * 7.0, uSeed.x + float(i))) * 0.12 * soft;
  return 1.0 - smoothstep(-soft, soft * 0.5, dist + n);
}

// Pattern synthesis. t/yn body coords, P rest position, fin=1 on fins (r = fin radial coord).
vec3 fsPattern(vec3 col, float t, float yn, vec3 P, float isFin, float r, inout float metal, inout float irid, inout float rough){
  float pc = uLookD.y;
  float ps = max(0.3, uLookD.x);
  vec3 sp = P * 1.0 + uSeed;
  float reg = uLookG.x;
  float bellyFade = uLookF.w < -1.5 ? 1.0 : smoothstep(uLookF.w - 0.25, uLookF.w + 0.25, yn);
int pid = int(uLookG.z + 0.5);
  if (pid == 1) {
  // clownfish bands with black edges
  if (isFin < 0.5 || r < 0.02) {
    float inside = 0.0; float edge = 0.0;
    float extent = mix(0.55, 1.2, smoothstep(0.6, 1.0, ps)); // misbar: bands stop short of the belly/back
    for (int i = 0; i < 4; i++) {
      vec4 b = uBands[i];
      if (b.y <= 0.0) continue;
      float wob = snoise(vec3(t * 9.0, yn * 3.0, uSeed.y + float(i) * 3.1)) * (0.012 + 0.02 * (1.0 - reg));
      float tc = b.x + b.z * (1.0 - yn * yn) - b.w * max(0.0, 1.0 - abs(yn) * 1.6) + wob;
      float d = abs(t - tc) - b.y;
      float vmask = 1.0 - smoothstep(extent - 0.15, extent + 0.02, abs(yn + 0.08 * float(i)) + snoise(vec3(t * 14.0, yn * 5.0, uSeed.z)) * 0.18 * (1.0 - smoothstep(0.95, 1.05, ps)));
      float ew = uLookD.z;
      inside = max(inside, fsAA(d, 0.0) * vmask);
      edge = max(edge, fsAA(abs(d - ew * 0.5) - ew * 0.5, 0.0) * vmask);
    }
    col = mix(col, uCEdge, edge * pc);
    col = mix(col, uCAccent, inside * pc);
    rough = mix(rough, rough * 0.85, inside);
  }
} else if (pid == 2) {
  // thin vertical bars
  float n = floor(4.0 + ps * 4.0 + uPatA.x);
  float tt = (t - 0.18) / 0.78;
  float wob = snoise(vec3(t * 5.0, yn * 2.0, uSeed.x)) * 0.12 * (1.2 - reg);
  float bx = fract(tt * n + wob + uPatA.y);
  float bar = fsAA(abs(bx - 0.5) - (0.12 + uPatA.z), 0.0) * step(0.0, tt) * step(tt, 1.0);
  bar *= smoothstep(-1.1, -0.5, yn + uPatA.w);
  col = mix(col, uCAccent, bar * pc);
} else if (pid == 3) {
  // spots / blotches: irregular, varied sizes, some merging
  vec3 wp = sp * (15.0 * ps + uPatA.x);
  wp += vec3(snoise(sp * 9.0 + 3.0), snoise(sp * 9.0 + 7.0), snoise(sp * 9.0 + 11.0)) * 0.35 * (1.2 - reg * 0.6);
  vec3 c = fsCell(wp);
  float sz = fsH1(vec3(c.z * 31.0));
  float rad = mix(0.16, 0.44, sz * sz) * (0.85 + uPatA.y);
  float spot = fsAA(c.x - rad, 0.015) * step(0.1 + uPatA.z, fract(c.z * 7.3));
  float rim = (1.0 - smoothstep(0.0, 0.06, abs(c.x - rad - 0.03))) * spot * uPatB.x;
  spot *= mix(1.0, bellyFade, 1.0 - isFin * 0.5);
  col = mix(col, uCAccent, spot * pc);
  col = mix(col, uCEdge, rim * pc);
} else if (pid == 4) {
  // fine speckles
  vec3 c = fsCell(sp * (38.0 * ps));
  float spot = fsAA(c.x - 0.2 * (0.6 + fsH1(vec3(c.z * 13.0))), 0.0) * step(0.35, c.z);
  col = mix(col, uCAccent, spot * pc * mix(0.5, 1.0, bellyFade));
} else if (pid == 5) {
  // marble: organic patches with optional dark outline (snowflake clownfish)
  float m = fbm3(sp * (3.2 * ps) + vec3(0.0, 0.0, uSeed.x));
  float th = uPatA.x;
  float pch = smoothstep(th - 0.04, th + 0.04, m);
  float outline = 1.0 - smoothstep(0.0, 0.035 + uLookD.z, abs(m - th));
  col = mix(col, uCAccent, pch * pc);
  col = mix(col, uCEdge, outline * pc * uPatA.y);
} else if (pid == 6) {
  // butterfly: bold band on the outer fins
  if (isFin > 0.5) {
    float edgeN = snoise(vec3(P.x * 18.0, P.y * 18.0, uSeed.x)) * 0.05 * (1.3 - reg);
    float band = smoothstep(0.52 + edgeN, 0.58 + edgeN, r);
    col = mix(col, uCFin2, band * pc);
    rough = mix(rough, 0.6, band * 0.3);
  }
} else if (pid == 7) {
  // bicolour: split along the body (uPatA.x centre, .y width, .z slant) or body vs fins
  if (isFin < 0.5) {
    float split = smoothstep(uPatA.x - uPatA.y, uPatA.x + uPatA.y, t + yn * uPatA.z + snoise(vec3(t * 6.0, yn * 3.0, uSeed.x)) * 0.02);
    col = mix(col, uCBody2, split * pc * uPatA.w);
  } else {
    col = mix(col, uCAccent, pc * 0.75 * smoothstep(0.1, 0.35, r));
  }
} else if (pid == 8) {
  // dalmatian: sparse bold spots on body and fins
  vec3 c = fsCell(sp * (8.0 * ps));
  float rad = mix(0.16, 0.36, fsH1(vec3(c.z * 17.0)));
  float spot = fsAA(c.x - rad + snoise(sp * 30.0) * 0.05, 0.0) * step(0.45, c.z);
  col = mix(col, uCAccent, spot * pc);
} else if (pid == 9) {
  // grizzle: fine streaks (along rays on fins)
  vec3 q = isFin > 0.5 ? vec3(P.x * 6.0, P.y * 6.0, r * 30.0) : vec3(t * 40.0, yn * 6.0, 0.0);
  float g = snoise(q + uSeed) * 0.6 + snoise(q * 2.3 + uSeed.yzx) * 0.4;
  col = mix(col, uCAccent, smoothstep(0.1, 0.5, g) * pc * 0.8);
} else if (pid == 10) {
  // lateral stripe (neon / cardinal): iridescent stripe + red lower body
  if (isFin < 0.5) {
    float along = clamp((t - uStripe2.x) / max(0.01, uStripe2.y - uStripe2.x), 0.0, 1.0);
    float yc = mix(uStripe.x, uStripe.y, along);
    float d = abs(yn - yc) - uStripe.z * (0.7 + 0.3 * sin(3.14159 * along));
    float inT = smoothstep(uStripe2.x - 0.02, uStripe2.x + 0.03, t) * (1.0 - smoothstep(uStripe2.y - 0.03, uStripe2.y + 0.02, t));
    float stripe = fsAA(d, 0.01) * inT;
    float red = smoothstep(uStripe.w - 0.03, uStripe.w + 0.05, t) * (1.0 - smoothstep(yc - uStripe.z - 0.05, yc - uStripe.z + 0.02, yn)) * smoothstep(-1.05, -0.75, yn);
    red *= 1.0 - smoothstep(0.96, 1.02, t);
    col = mix(col, uCLower, red * pc);
    col = mix(col, uCAccent, stripe * pc);
    irid = max(irid, stripe * 1.0);
    metal = max(metal, stripe * 0.35);
    rough = mix(rough, 0.22, stripe);
  }
} else if (pid == 11) {
  // mottled blotches (gobies, groupers, loaches)
  float m1 = fbm3(sp * (4.5 * ps));
  float m2 = fbm3(sp * (11.0 * ps) + 5.3);
  col = mix(col, uCBody2, smoothstep(-0.1, 0.35, m1) * pc * 0.8);
  col = mix(col, uCAccent, smoothstep(0.25, 0.5, m2) * pc * 0.6 * bellyFade);
} else if (pid == 12) {
  // reticulated: network of lines
  vec3 rp = sp * (9.0 * ps + uPatA.x);
  // lane:brackish — optional domain warp (uPatB.y > 0) turns the cell network into squiggly vermiculation; uPatB.z
  // scales how much of the network survives on the belly (0 = the default 0.35 floor)
  if (uPatB.y > 0.0) rp += vec3(snoise(rp * 0.55 + 1.7), snoise(rp * 0.55 + 5.3), snoise(rp * 0.55 + 9.1)) * uPatB.y;
  vec3 c = fsCell(rp);
  float line = 1.0 - smoothstep(0.0, 0.07 + uPatA.y, c.y - c.x);
  col = mix(col, uCAccent, line * pc * mix(0.35 * (1.0 - uPatB.z), 1.0, bellyFade));
} else if (pid == 13) {
  // koi: big irregular patches (accent = red, body2 = black)
  float k1 = fbm3(sp * (2.6 * ps) + vec3(uSeed.x));
  float k2 = fbm3(sp * (4.2 * ps) + vec3(9.1, uSeed.y, 2.0));
  col = mix(col, uCAccent, smoothstep(0.02, 0.1, k1) * pc);
  col = mix(col, uCBody2, smoothstep(0.34, 0.42, k2) * pc * 0.9);
} else if (pid == 14) {
  // dragon scale: thick metallic plates
  if (isFin < 0.5) {
    vec4 sc = fsScales(vec2(t * -uLookB.x * 0.75, vBody.z * uLookB.y * 0.75));
    float plate = smoothstep(0.05, 0.3, sc.y) * smoothstep(-0.9, -0.2, yn + 0.3 * (fsH1(vec3(sc.z * 9.0)) - 0.5));
    col = mix(col, uCAccent, plate * pc);
    metal = max(metal, plate * 0.75);
    rough = mix(rough, 0.2, plate);
  }
} else if (pid == 15) {
  // fine longitudinal lines
  // lane:brackish — optional: uPatA.x > 0 sets the line count per yn, uPatA.y > 0 breaks each line into a row of dots
  // (dots per body length) that merge back into streaks here and there, uPatA.z widens the lines (sailfin molly)
  float lnN = uPatA.x > 0.0 ? uPatA.x : 5.0 + ps * 4.0;
  float lv = yn * lnN + snoise(vec3(t * 4.0, 0.0, uSeed.x)) * 0.2;
  float l = abs(fract(lv) - 0.5);
  float lineM = fsAA(l - 0.08 - uPatA.z, 0.0);
  if (uPatA.y > 0.0) {
    float dp = abs(fract(t * uPatA.y + floor(lv + 0.5) * 0.5) - 0.5);
    float dd = length(vec2(l / (0.12 + uPatA.z), dp / 0.24)) - 1.0;
    float dotM = 1.0 - smoothstep(-0.3, 0.2, dd);
    float merge = smoothstep(0.2, 0.7, snoise(vec3(t * 3.0, yn * 2.0, uSeed.y)));
    lineM = max(dotM, lineM * merge * 0.85) * mix(0.15, 1.0, bellyFade) * smoothstep(0.2, 0.3, t);
    if (isFin > 0.5) {
      // fins: rows of dark spots between the rays (a sailfin's spotted sail)
      float fr = abs(fract(r * 4.5) - 0.5);
      float ft = abs(fract(t * uPatA.y * 1.1 + floor(r * 4.5 + 0.5) * 0.5) - 0.5);
      float fd = length(vec2(fr / 0.17, ft / 0.26)) - 1.0;
      lineM = (1.0 - smoothstep(-0.3, 0.2, fd)) * smoothstep(0.08, 0.2, r) * (1.0 - smoothstep(0.78, 0.9, r));
    }
  }
  col = mix(col, uCAccent, lineM * pc * (uPatA.y > 0.0 ? 1.0 : 1.0 - isFin));
} else if (pid == 16) {
  // saddles over the back
  float n = 3.0 + floor(ps * 2.0);
  float tt = (t - 0.12) / 0.85;
  float sd = abs(fract(tt * n + snoise(vec3(t * 4.0, yn, uSeed.x)) * 0.08) - 0.5);
  float sad = fsAA(sd - 0.16, 0.02) * smoothstep(-0.5, 0.2, yn + snoise(vec3(t * 7.0, yn * 3.0, uSeed.y)) * 0.25) * step(0.0, tt) * step(tt, 1.0);
  col = mix(col, uCAccent, sad * pc);
}
  return col;
}

vec3 fsApplyMarks(vec3 col, float t, float yn, float finAmt){
  for (int i = 0; i < ${MAX_MARKS}; i++) {
    vec4 b = uMarkB[i];
    if (b.w <= 0.0) continue;
    // onFins: 0 body only, (0,1] body + fins at that strength, 2 fins only
    float onF = uMarkC[i].w;
    float w = finAmt > 0.5 ? min(onF, 1.0) : (onF > 1.5 ? 0.0 : 1.0);
    if (w <= 0.0) continue;
    float m = fsMark(i, t, yn) * b.w * w;
    col = mix(col, b.rgb, m);
  }
  return col;
}

// Fake water-surface environment: bright rippled surface above, dim depths below.
vec3 fsEnvColor(vec3 wR){
  float up = wR.y;
  vec3 sky = uLightColor * (0.55 + 0.45 * smoothstep(0.2, 0.95, up));
  vec3 deep = uWaterTint * 0.12 + vec3(0.01);
  vec3 c = mix(deep, sky, smoothstep(-0.25, 0.55, up));
  c += uLightColor * pow(max(0.0, up), 24.0) * 1.5;
  return c;
}
`;

/** Replaces <color_fragment> for the body. Produces diffuseColor + fs* locals used later. */
export const BODY_FRAG_COLOR = /* glsl */ `
float fsT = vBody.x;
float fsYn = vBody.y;
float fsMetal = uLookC.y;
float fsIrid = uLookF.x > 0.5 ? 0.0 : uLookC.x;
float fsRough = uLookD.w;
fsMetal = max(fsMetal, uLookC.x * 0.22);
float fsKind = vBody.w;
vec3 fsCol = uCBody;
{
  // dorsal/ventral shading
  fsCol = mix(fsCol, uCBody2, smoothstep(0.05, 1.0, fsYn) * uLookA.x);
  float bl = smoothstep(uLookA.y + uLookA.w, uLookA.y - uLookA.w, fsYn);
  fsCol = mix(fsCol, uCBelly, bl * uLookA.z);
  if (uLookH.x > 0.5) {
    // marks underneath: pattern (e.g. pearl spots) drawn on top of marks (e.g. dark bars)
    fsCol = fsApplyMarks(fsCol, fsT, fsYn, 0.0);
    fsCol = fsPattern(fsCol, fsT, fsYn, vFsRest, 0.0, 0.0, fsMetal, fsIrid, fsRough);
  } else {
    fsCol = fsPattern(fsCol, fsT, fsYn, vFsRest, 0.0, 0.0, fsMetal, fsIrid, fsRough);
    fsCol = fsApplyMarks(fsCol, fsT, fsYn, 0.0);
  }
  // operculum edge + lips
  float edgeT = uLookG.w + 0.025 * (1.0 - fsYn * fsYn);
  float oplW = 0.004 + fwidth(fsT) * 1.5;
  float opl = (1.0 - smoothstep(0.0, oplW, abs(fsT - edgeT - 0.004))) * smoothstep(0.95, 0.6, abs(fsYn)) * uLookE.z * clamp(0.006 / oplW, 0.35, 1.0);
  fsCol *= 1.0 - opl * 0.35;
  float lip = (1.0 - smoothstep(0.0, 0.1, abs(fsYn - uHeadA.y))) * (1.0 - smoothstep(uHeadA.x * 0.6, uHeadA.x * 1.2, fsT));
  fsCol = mix(fsCol, uCLip, lip * 0.55);
  fsCol *= 1.0 - lip * uShapeA.w * 0.8;
  // lateral line: faint dotted row of pores
  float ll = uLookE.w * (1.0 - smoothstep(0.0, 0.05, abs(fsYn - 0.18 + fsT * 0.1))) * smoothstep(edgeT, edgeT + 0.05, fsT) * (1.0 - smoothstep(0.85, 0.95, fsT));
  ll *= 0.6 + 0.4 * step(0.5, fract(fsT * 70.0));
  fsCol *= 1.0 - ll * 0.18;
  // appendages (barbels, bristles, spines)
  if (fsKind > 0.5) { fsCol = uCAppend; fsIrid *= 0.2; fsRough = 0.5; }
  // colour intensity (stress fades, display intensifies)
  float ci = uLookE.x;
  fsCol = fsSat(fsCol, mix(0.35, 1.18, ci)) * mix(0.8, 1.06, ci);
}
diffuseColor.rgb = fsCol;
`;

/** Replaces <color_fragment> for fins. */
export const FIN_FRAG_COLOR = /* glsl */ `
int fsFi = int(vFin.z + 0.5);
vec4 fsOpt = uFinOpt[fsFi];     // opacity, pattern, rayContrast, irid
vec4 fsTint = uFinTint[fsFi];   // rgb, amount
vec4 fsEdgeC = uFinEdge[fsFi];  // rgb, amount
vec4 fsShape = uFinShape[fsFi]; // edgeStart, edgeWidth, rootBlend, translucency
float fsS = vFin.x;
float fsR = vFin.y;
float fsRays = vFinB.x;
float fsWeb = vFinB.y;
float fsRole = vFinB.w;
float fsMetal = uLookC.y * 0.3;
float fsIrid = uLookC.x * fsOpt.w * 0.45;
float fsRough = 0.42;
float fsRayMask = 0.0;
float fsAlpha = fsOpt.x;
vec3 fsCol;
{
  // rays: straight lines in (s) space that branch toward the edge
  float rc = fsS * max(fsRays, 1.0);
  float rd = abs(fract(rc + 0.5) - 0.5);
  float rd2 = abs(fract(rc * 2.0) - 0.5);
  float branch = smoothstep(0.45, 0.7, fsR);
  float rw = max(fwidth(rc), 1e-4);
  float rayA = 1.0 - smoothstep(0.03, 0.06 + rw * 1.2, rd);
  float rayB = (1.0 - smoothstep(0.03, 0.06 + rw * 2.0, rd2 * 0.5)) * branch * 0.8;
  fsRayMask = fsRays > 0.5 ? max(rayA, rayB) * (0.55 + 0.45 * (1.0 - fsR * 0.5)) : 0.0;
  if (fsRays > 0.5 && fsRays < 1.5) fsRayMask = 1.0; // threads are all ray
  // joints along rays
  fsRayMask *= 0.85 + 0.15 * smoothstep(0.2, 0.5, abs(fract(fsR * 26.0) - 0.5));
  // crowntail / spine web recession between rays
  float web = fsWeb * smoothstep(0.0, 0.5, rd * 2.0);
  float membraneEdge = 1.0 - web;
  float membrane = 1.0 - smoothstep(membraneEdge - 0.07, membraneEdge + 0.005, fsR);
  // thin translucent fringe (screen-space aware so big fins stay crisp)
  float fwR = fwidth(fsR);
  float fringe = 1.0 - smoothstep(1.0 - max(0.035, fwR * 2.5), 1.0, fsR);
  // colour: root → base → edge
  vec3 base = mix(uCFin, fsTint.rgb, fsTint.a);
  vec3 edgeCol = mix(uCFin2, fsEdgeC.rgb, fsEdgeC.a > 0.0 ? 1.0 : 0.0);
  float eg = smoothstep(fsShape.x, fsShape.x + fsShape.y, fsR);
  fsCol = mix(base, edgeCol, eg * (fsEdgeC.a > 0.0 ? fsEdgeC.a : 0.6));
  float bodyT = (uSwimB.x - vFsRest.x) / max(0.05, uSwimB.x - uSwimB.y);
  fsCol = fsPattern(fsCol, bodyT, clamp(vFsRest.y * 8.0, -1.0, 1.0), vFsRest, 1.0, fsR, fsMetal, fsIrid, fsRough) * fsOpt.y + fsCol * (1.0 - fsOpt.y);
  fsCol = fsApplyMarks(fsCol, bodyT, clamp(vFsRest.y * 8.0, -1.0, 1.0), 1.0);
  fsCol = mix(mix(uCBody, uCBody2, 0.25), fsCol, smoothstep(0.0, max(0.001, fsShape.z), fsR));
  // rays denser/darker than the membrane; membrane between rays a little lighter, with streaks along the rays
  float streak = snoise(vec3(fsS * max(fsRays, 1.0) * 1.7, fsR * 2.5, uSeed.x + vFin.z * 3.1));
  fsCol *= 0.94 + 0.12 * streak * fsOpt.z;
  fsCol = mix(fsCol * 1.08 + 0.01, fsCol * 0.72, fsRayMask * fsOpt.z);
  // a touch darker and more saturated toward the root
  fsCol = mix(fsSat(fsCol, 1.15) * 0.82, fsCol, smoothstep(0.0, 0.45, fsR));
  float a = max(fsAlpha * membrane, fsRayMask * min(1.0, fsAlpha + 0.35 * fsOpt.z) * (1.0 - smoothstep(0.96, 1.0, fsR)));
  a *= mix(1.0, fringe, 1.0 - fsWeb);
  a *= smoothstep(0.0, 0.02, fsR) * 0.5 + 0.5;
  fsAlpha = clamp(a, 0.0, 1.0);
  float ci = uLookE.x;
  fsCol = fsSat(fsCol, mix(0.35, 1.18, ci)) * mix(0.8, 1.06, ci);
}
diffuseColor.rgb = fsCol;
diffuseColor.a = fsAlpha;
if (diffuseColor.a < 0.012) discard;
`;

export const FRAG_ROUGH = /* glsl */ `
float roughnessFactor = fsRough;
`;
export const FRAG_METAL = /* glsl */ `
float metalnessFactor = clamp(fsMetal, 0.0, 1.0);
`;

/** Body: after <normal_fragment_begin>, bump scales. */
export const BODY_FRAG_NORMAL = /* glsl */ `
#include <normal_fragment_maps>
float fsScaleEdge = 0.0;
float fsScaleId = 0.0;
{
  float kind = uLookB.w;
  float strength = uLookB.z;
  // head (in front of the operculum) is scaleless skin
  strength *= smoothstep(uLookG.w + 0.005, uLookG.w + 0.05, fsT);
  strength *= 1.0 - step(0.5, fsKind);
  if (strength > 0.001 && kind < 2.5) {
    vec2 q = vec2(fsT * -uLookB.x, vBody.z * uLookB.y);
    vec4 sc = fsScales(q);
    float fw = max(fwidth(q.x), fwidth(q.y));
    float fade = 1.0 - smoothstep(0.25, 0.7, fw);
    fsScaleEdge = (1.0 - smoothstep(0.0, 0.1 + fw * 0.2, sc.y)) * fade;
    fsScaleId = sc.z;
    // tilt: rim slopes outward, plus a random tilt per scale -> glints that shimmer as the fish turns
    vec2 dir = sc.w > 0.0 ? vec2(cos(sc.w), sin(sc.w)) : vec2(0.0);
    vec2 tilt = dir * (1.0 - smoothstep(0.0, 0.4, sc.y)) * 0.55 + (fsH3(vec3(sc.z * 91.0)).xy - 0.5) * 0.5;
    mat3 tbn = fsTBN(-vViewPosition, normal, q);
    normal = normalize(normal + (tbn[0] * tilt.x + tbn[1] * tilt.y) * strength * fade * 0.55);
    // per-scale tone: pocket (anterior base) darker, exposed centre lighter, slight random variation
    float centre = smoothstep(0.25, 0.85, sc.y);
    fsCol *= mix(1.0, (0.86 + 0.2 * sc.z) * (0.88 + 0.22 * centre), strength * fade);
    fsCol *= 1.0 - fsScaleEdge * strength * 0.32;
    diffuseColor.rgb = fsCol;
  } else if (kind > 3.5 && strength > 0.001) {
    // armour plates (corydoras / pleco): rows of large bony plates
    vec2 q = vec2(fsT * uLookB.x, (fsYn + 1.0) * 1.5);
    vec2 f = fract(q);
    float e = min(min(f.x, 1.0 - f.x) * 2.0, min(f.y, 1.0 - f.y) * 2.0);
    vec2 tilt = vec2(f.x - 0.5, f.y - 0.5) * 2.0 * (1.0 - smoothstep(0.0, 0.3, e));
    mat3 tbn = fsTBN(-vViewPosition, normal, q);
    normal = normalize(normal + (tbn[0] * tilt.x + tbn[1] * tilt.y) * strength * 0.5);
    fsCol *= 1.0 - (1.0 - smoothstep(0.0, 0.08, e)) * strength * 0.35;
    diffuseColor.rgb = fsCol;
  }
}
`;

/** Fins: rays are raised ridges that catch the light. */
export const FIN_FRAG_NORMAL = /* glsl */ `
#include <normal_fragment_maps>
if (fsRays > 1.5) {
  float rc = fsS * fsRays;
  float sd = fract(rc + 0.5) - 0.5;
  float w = 0.16;
  float h = exp(-sd * sd / (w * w));
  float slope = -2.0 * sd / (w * w) * h * 0.08;
  float fw = fwidth(rc);
  slope *= 1.0 - smoothstep(0.3, 0.8, fw);
  mat3 tbn = fsTBN(-vViewPosition, normal, vec2(rc, fsR * 8.0));
  normal = normalize(normal + tbn[0] * slope);
}
`;

/** Replaces <emissivemap_fragment>: iridescence, fake env reflection, wrap/subsurface, rim highlight, glow. */
export const FRAG_EMISSIVE = (fin: boolean) => /* glsl */ `
#include <emissivemap_fragment>
{
  vec3 vN = normalize(normal);
  vec3 vV = normalize(vViewPosition);
  vec3 wN = normalize((vec4(vN, 0.0) * viewMatrix).xyz);
  vec3 wV = normalize((vec4(vV, 0.0) * viewMatrix).xyz);
  vec3 wR = reflect(-wV, wN);
  float cosT = clamp(abs(dot(vN, vV)), 0.0, 1.0);
  float fres = pow(1.0 - cosT, 4.0);
  float lightLum = clamp(dot(uLightColor, vec3(0.333)), 0.0, 2.0);
  vec3 env = fsEnvColor(wR);
  ${
    fin
      ? `
  float glint = 0.0;
  float fsScaleId = 0.0;
  float fsTrans = fsShape.w;
  // translucent membrane: light scattering through the fin (brighter when backlit / edge-on)
  float back = pow(clamp(dot(-wV, normalize(vec3(0.0, 1.0, 0.0) + wN * 0.2)), 0.0, 1.0), 2.0);
  totalEmissiveRadiance += fsCol * fsTrans * lightLum * (0.16 + 0.34 * (1.0 - cosT) + 0.5 * back);
  `
      : `
  float glint = 0.0;
  if (uLookF.x > 1.5 && uLookF.x < 2.5) fsIrid = max(fsIrid, uLookC.x * (0.35 + 0.65 * fsScaleId));
  if (uLookF.x > 2.5) fsIrid = max(fsIrid, uLookC.x * smoothstep(-0.2, 0.6, fsYn));
  // scale glints: individual scales flash like tiny mirrors as their tilted normals catch the overhead light
  glint = smoothstep(0.55, 1.0, fsScaleId) * pow(max(0.0, dot(wR, normalize(vec3(0.15, 1.0, 0.25)))), 14.0) * (uLookC.x + uLookC.y + 0.15) * uLookB.z * (1.0 - fsScaleEdge);
  // subsurface-ish wrap fill: soft light that keeps thin fish luminous
  float wrap = 0.5 + 0.5 * wN.y;
  totalEmissiveRadiance += fsCol * uLookF.z * lightLum * 0.2 * wrap;
  `
  }
  // structural colour: a thin-film hue sweep that rides on the base colour, strongest at grazing angles and on
  // individual scales (glints), never a flat colour wash
  vec3 film = fsThinFilm(cosT, uLookF.y + fsScaleId * 0.12);
  vec3 sheen = mix(fsCol * 1.6 + 0.04, film, 0.45);
  float iridW = fsIrid * lightLum * (0.05 + 0.5 * fres + 0.55 * glint);
  totalEmissiveRadiance += sheen * iridW * 0.55;
  totalEmissiveRadiance += env * (fsMetal * 0.6 + 0.05) * mix(vec3(1.0), fsCol * 1.4 + 0.1, clamp(fsMetal + fsIrid * 0.5, 0.0, 1.0)) * (0.3 + 0.7 * fres) * 0.55;
  totalEmissiveRadiance += uLightColor * glint * (0.25 + 0.6 * fsMetal) * 0.5;
  totalEmissiveRadiance += fsCol * uLookC.w * 1.5;
  // selection: a thin soft rim hugging the silhouette only (no flat term, so the fish's own colours stay fully
  // visible); membranes get less, since a fin seen edge-on is all "silhouette"
  totalEmissiveRadiance += vec3(0.4, 1.0, 0.88) * uLookE.y * pow(smoothstep(0.58, 0.97, 1.0 - cosT), 2.0) * ${fin ? '0.2' : '1.15'};
}
`;

// Shared fin uniforms declared only in the fin program.
export const FIN_FRAG_PARS = /* glsl */ `
uniform vec4 uFinOpt[${MAX_FINS}];
uniform vec4 uFinTint[${MAX_FINS}];
uniform vec4 uFinEdge[${MAX_FINS}];
uniform vec4 uFinShape[${MAX_FINS}];
varying vec4 vFin;
varying vec4 vFinB;
vec4 vBody = vec4(0.0);
`;

export const BODY_FRAG_DECL = /* glsl */ `
varying vec4 vBody;
`;

// ───────────────────────────────── eye ─────────────────────────────────

export const EYE_VERT = /* glsl */ `
varying vec3 vEyeLocal;
varying vec3 vAgWorldPos;
varying vec3 vAgWorldNormal;
`;
export const EYE_VERT_MAIN = /* glsl */ `
#include <worldpos_vertex>
vEyeLocal = position;
{
  vec4 agWp = modelMatrix * vec4(transformed, 1.0);
  vAgWorldPos = agWp.xyz;
  vAgWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
}
`;
export const EYE_FRAG_PARS = /* glsl */ `
uniform vec3 uIris;
uniform vec3 uIrisRing;
uniform vec3 uSclera;
uniform vec4 uEyeA; // pupil, ringWidth, ringAmount, highlight
uniform vec4 uEyeB; // mask amount, colorIntensity, _, _
uniform vec3 uEyeMask;
varying vec3 vEyeLocal;
varying vec3 vAgWorldPos;
varying vec3 vAgWorldNormal;
`;
export const EYE_FRAG_COLOR = /* glsl */ `
vec3 eyeDir = normalize(vEyeLocal);
float ang = acos(clamp(eyeDir.z, -1.0, 1.0)) / 1.5708; // 0 at the look axis, 1 at the equator
float pupil = uEyeA.x;
vec3 eyeCol;
{
  float azim = atan(eyeDir.y, eyeDir.x);
  float fib = 0.5 + 0.5 * sin(azim * 38.0 + sin(azim * 7.0) * 2.0) * 0.5 + 0.25 * sin(azim * 91.0);
  vec3 iris = uIris * (0.72 + 0.4 * fib * smoothstep(pupil, pupil + 0.25, ang));
  iris = mix(iris, uIris * 1.35 + 0.05, smoothstep(pupil + 0.02, pupil + 0.12, ang) * (1.0 - smoothstep(pupil + 0.14, pupil + 0.3, ang)) * 0.5);
  float ringStart = 0.86 - uEyeA.y;
  iris = mix(iris, uIrisRing, smoothstep(ringStart, ringStart + 0.08, ang) * uEyeA.z);
  float pw = fwidth(ang) * 1.5;
  float pupilMask = 1.0 - smoothstep(pupil - pw, pupil + pw, ang);
  eyeCol = mix(iris, vec3(0.004, 0.005, 0.008), pupilMask);
  // limbal darkening
  eyeCol *= 1.0 - smoothstep(0.75, 1.0, ang) * 0.55;
  eyeCol = mix(eyeCol, uSclera, smoothstep(0.98, 1.1, ang));
  // eye mask bar (e.g. banggai / kuhli) across the eye
  eyeCol = mix(eyeCol, uEyeMask, uEyeB.x * (1.0 - smoothstep(0.18, 0.28, abs(eyeDir.x))) * smoothstep(pupil + 0.02, pupil + 0.06, ang));
}
diffuseColor.rgb = eyeCol;
`;
export const EYE_FRAG_EMISSIVE = /* glsl */ `
#include <emissivemap_fragment>
{
  vec3 vN = normalize(normal);
  vec3 vV = normalize(vViewPosition);
  // studio catchlight: fixed view-space light above-left of the camera, always visible
  vec3 L1 = normalize(vec3(-0.45, 0.6, 0.66));
  vec3 H1 = normalize(L1 + vV);
  float spec = pow(max(dot(vN, H1), 0.0), 380.0) * 9.0;
  vec3 L2 = normalize(vec3(0.5, -0.2, 0.85));
  float spec2 = pow(max(dot(vN, normalize(L2 + vV)), 0.0), 120.0) * 0.6;
  float lightLum = clamp(dot(uLightColor, vec3(0.333)), 0.25, 2.0);
  totalEmissiveRadiance += vec3(1.0, 0.99, 0.96) * (spec + spec2) * uEyeA.w * lightLum;
  // cornea fresnel sheen
  float fres = pow(1.0 - clamp(dot(vN, vV), 0.0, 1.0), 3.0);
  totalEmissiveRadiance += uLightColor * fres * 0.18;
  // iris glow (reflective tapetum-like sheen for iridescent irises)
  totalEmissiveRadiance += diffuseColor.rgb * 0.08;
}
`;
