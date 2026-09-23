/**
 * Shared GLSL snippets. OWNER: lane "waterfx" (others may import; request additions via report).
 *
 * simplex noise: "webgl-noise" by Ian McEwan / Stefan Gustavson (Ashima Arts), MIT License —
 * https://github.com/ashima/webgl-noise (recorded in docs/ASSET_LEDGER.md).
 * Everything else in this file is original Aquarium Go code.
 */

export const GLSL_SIMPLEX3 = /* glsl */ `
#ifndef AG_SIMPLEX3
#define AG_SIMPLEX3
vec3 mod289(vec3 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
float fbm3(vec3 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++) { s += a * snoise(p); p *= 2.02; a *= 0.5; }
  return s;
}
#endif
`;

/** Cheap hash + value noise (2D/3D). Original. */
export const GLSL_VALUE_NOISE = /* glsl */ `
#ifndef AG_VALUE_NOISE
#define AG_VALUE_NOISE
float agHash1(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float agHash13(vec3 p){ p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float agVNoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = agHash1(i), b = agHash1(i + vec2(1.0, 0.0)), c = agHash1(i + vec2(0.0, 1.0)), d = agHash1(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float agVNoise3(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float n000 = agHash13(i), n100 = agHash13(i + vec3(1,0,0)), n010 = agHash13(i + vec3(0,1,0)), n110 = agHash13(i + vec3(1,1,0));
  float n001 = agHash13(i + vec3(0,0,1)), n101 = agHash13(i + vec3(1,0,1)), n011 = agHash13(i + vec3(0,1,1)), n111 = agHash13(i + vec3(1,1,1));
  return mix(mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y), mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y), u.z);
}
float agVFbm(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * agVNoise(p); p = p * 2.03 + vec2(17.1, 3.7); a *= 0.5; }
  return s;
}
float agVFbm3(vec3 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * agVNoise3(p); p = p * 2.03 + vec3(17.1, 3.7, 9.2); a *= 0.5; }
  return s;
}
#endif
`;

/**
 * Original animated caustic pattern (Aquarium Go).
 * Two layers of drifting Voronoi cells, domain-warped by slow sine flow so the cell walls wobble organically;
 * the distance to the nearest cell wall (F2 − F1) becomes a thin bright web whose width `w` models focus.
 * agCaustics(p, t) keeps the original signature (~0..1.6).
 */
export const GLSL_CAUSTICS = /* glsl */ `
#ifndef AG_CAUSTICS
#define AG_CAUSTICS
vec2 agHash2(vec2 p){ p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return fract(sin(p)*43758.5453); }
float agCausticEdge(vec2 p, float t){
  vec2 ip = floor(p); vec2 fp = fract(p);
  float d1 = 8.0; float d2 = 8.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = agHash2(ip + g);
    o = 0.5 + 0.38 * sin(t * (0.55 + 0.35 * o.yx) + 6.2831 * o);
    vec2 r = g + o - fp;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
  }
  return sqrt(d2) - sqrt(d1);
}
vec2 agCausticWarp(vec2 p, float t){
  vec2 q = p + 0.22 * vec2(sin(p.y * 1.3 + t * 0.47) + 0.6 * sin(p.y * 2.7 - t * 0.33 + p.x * 0.8), sin(p.x * 1.1 - t * 0.41) + 0.6 * sin(p.x * 2.3 + t * 0.29 - p.y * 0.7));
  return q + 0.12 * vec2(sin(q.y * 4.3 + t * 0.9), sin(q.x * 3.9 - t * 0.8));
}
/** w = web width in cell units (0.05 sharp .. 0.3 soft). */
float agCausticsW(vec2 p, float t, float w){
  vec2 q = agCausticWarp(p, t);
  float e1 = agCausticEdge(q + vec2(t * 0.021, -t * 0.013), t);
  float e2 = agCausticEdge(q * 1.37 + vec2(-t * 0.017, t * 0.019) + 3.7, t * 1.13);
  float a = 1.0 - smoothstep(0.0, w, e1);
  float b = 1.0 - smoothstep(0.0, w * 1.15, e2);
  a *= a; b *= b;
  return a * 0.5 + b * 0.38 + a * b * 1.6;
}
float agCaustics(vec2 p, float t){ return agCausticsW(p, t, 0.16); }
/** Chromatic variant from ONE cell evaluation: red focuses tighter, blue spreads wider (dispersion-like fringes). */
vec3 agCausticsRGB(vec2 p, float t, float w){
  vec2 q = agCausticWarp(p, t);
  float e1 = agCausticEdge(q + vec2(t * 0.021, -t * 0.013), t);
  float e2 = agCausticEdge(q * 1.37 + vec2(-t * 0.017, t * 0.019) + 3.7, t * 1.13);
  vec3 wv = vec3(w * 0.8, w, w * 1.3);
  vec3 a = vec3(1.0) - smoothstep(vec3(0.0), wv, vec3(e1));
  vec3 b = vec3(1.0) - smoothstep(vec3(0.0), wv * 1.15, vec3(e2));
  a *= a; b *= b;
  return (a * 0.5 + b * 0.38 + a * b * 1.6) * vec3(0.92, 1.0, 1.06);
}
#endif
`;
