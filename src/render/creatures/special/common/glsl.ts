/**
 * GLSL library for critter surfaces (original code, Aquarium Go). All symbols are prefixed `agc`.
 * OWNER: lane "critterart".
 */

export const AGC_NOISE = /* glsl */ `
float agcH31(vec3 p){ p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float agcH21(vec2 p){ p = fract(p * vec2(0.3183099, 0.3678794) + vec2(0.71, 0.113)); p *= 17.0; return fract(p.x * p.y * (p.x + p.y)); }
vec3 agcH33(vec3 p){
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453123);
}
float agcVn(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(agcH31(i), agcH31(i + vec3(1,0,0)), f.x), mix(agcH31(i + vec3(0,1,0)), agcH31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(agcH31(i + vec3(0,0,1)), agcH31(i + vec3(1,0,1)), f.x), mix(agcH31(i + vec3(0,1,1)), agcH31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float agcVn2(vec2 x){
  vec2 i = floor(x); vec2 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(agcH21(i), agcH21(i + vec2(1,0)), f.x), mix(agcH21(i + vec2(0,1)), agcH21(i + vec2(1,1)), f.x), f.y);
}
float agcFbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * agcVn(p); p = p * 2.03 + vec3(17.1, 3.3, 9.7); a *= 0.5; } return s / 0.9375; }
float agcFbm2(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * agcVn2(p); p = p * 2.03 + vec2(17.1, 3.3); a *= 0.5; } return s / 0.9375; }
/** Cellular noise: x = F1, y = F2, z = random id of the nearest cell. */
vec3 agcCell(vec3 p){
  vec3 ip = floor(p); vec3 fp = fract(p);
  float d1 = 8.0; float d2 = 8.0; float id = 0.0;
  for (int k = -1; k <= 1; k++) for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec3 g = vec3(float(i), float(j), float(k));
    vec3 o = agcH33(ip + g);
    vec3 r = g + o - fp;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = agcH31(ip + g + 11.3); } else if (d < d2) { d2 = d; }
  }
  return vec3(sqrt(d1), sqrt(d2), id);
}
vec3 agcCell2(vec2 p){
  vec2 ip = floor(p); vec2 fp = fract(p);
  float d1 = 8.0; float d2 = 8.0; float id = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(float(i), float(j));
    vec2 o = vec2(agcH21(ip + g), agcH21(ip + g + 7.7));
    vec2 r = g + o - fp;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = agcH21(ip + g + 3.1); } else if (d < d2) { d2 = d; }
  }
  return vec3(sqrt(d1), sqrt(d2), id);
}
float agcLuma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 agcSat(vec3 c, float s){ float l = agcLuma(c); return max(vec3(0.0), mix(vec3(l), c, s)); }
float agcSmooth(float a, float b, float x){ return smoothstep(a, b, x); }
`;

/** Scale-correct bump mapping from a scalar height (world units) using screen-space derivatives. */
export const AGC_BUMP = /* glsl */ `
vec3 agcPerturb(vec3 surfPos, vec3 surfNorm, float h, float faceDir){
  vec3 sx = dFdx(surfPos); vec3 sy = dFdy(surfPos);
  vec3 r1 = cross(sy, surfNorm); vec3 r2 = cross(surfNorm, sx);
  float det = dot(sx, r1) * faceDir;
  vec2 dh = vec2(dFdx(h), dFdy(h));
  vec3 grad = sign(det) * (dh.x * r1 + dh.y * r2);
  vec3 n = abs(det) * surfNorm - grad;
  return length(n) > 1e-12 ? normalize(n) : surfNorm;
}
`;
