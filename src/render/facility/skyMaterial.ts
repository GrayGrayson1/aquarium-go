/**
 * Procedural sky seen through room openings (hobby-room window, shop storefronts and doors, hall arches and
 * windows): gradient + sun/moon glow + clouds + stars + a distant tree line / rooftops, all driven by the game hour.
 * One material per room, updated once per frame. OWNER: lane "facility".
 */
import * as THREE from 'three';
import { getGame } from '@/state/game';
import { hourOfDay } from '@/sim/time';

const SKY_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const SKY_FRAG = /* glsl */ `
uniform float uHour;
uniform float uTime;
varying vec2 vUv;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*n2(p); p*=2.03; a*=0.5; } return s; }
void main(){
  float h = uHour;
  // daylight 0 at night, 1 at noon; dawn/dusk warmth
  float day = smoothstep(5.5, 8.0, h) * (1.0 - smoothstep(18.0, 20.5, h));
  float dusk = exp(-pow((h-19.0)/1.1, 2.0)) + exp(-pow((h-6.6)/0.9, 2.0));
  vec3 nightTop = vec3(0.02, 0.035, 0.08), nightHor = vec3(0.06, 0.09, 0.16);
  vec3 dayTop = vec3(0.30, 0.55, 0.88), dayHor = vec3(0.78, 0.86, 0.93);
  vec3 duskTop = vec3(0.25, 0.22, 0.42), duskHor = vec3(1.0, 0.58, 0.32);
  float y = vUv.y;
  vec3 top = mix(nightTop, dayTop, day); vec3 hor = mix(nightHor, dayHor, day);
  top = mix(top, duskTop, clamp(dusk,0.0,1.0)*0.8); hor = mix(hor, duskHor, clamp(dusk,0.0,1.0)*0.9);
  vec3 col = mix(hor, top, smoothstep(0.15, 1.0, y));
  // sun / moon glow
  float sunX = fract((h - 6.0) / 24.0) * 2.4 - 0.2;
  float sunY = sin(clamp((h - 6.0) / 13.0, 0.0, 1.0) * 3.14159) * 0.8 + 0.1;
  vec2 d = vUv - vec2(sunX, sunY);
  float glow = exp(-dot(d, d) * 18.0);
  col += vec3(1.0, 0.85, 0.6) * glow * (0.35 * day + 0.8 * clamp(dusk,0.0,1.0));
  // clouds
  float c = fbm(vec2(vUv.x * 3.0 + uTime * 0.004, vUv.y * 6.0));
  float cloud = smoothstep(0.55, 0.8, c) * smoothstep(0.25, 0.7, y);
  vec3 cloudCol = mix(vec3(0.1, 0.12, 0.18), mix(vec3(0.95), vec3(1.0, 0.7, 0.5), clamp(dusk,0.0,1.0)), max(day, clamp(dusk,0.0,1.0)*0.8));
  col = mix(col, cloudCol, cloud * 0.55);
  // stars
  float night = 1.0 - max(day, clamp(dusk,0.0,1.0));
  vec2 sp = floor(vUv * vec2(90.0, 110.0));
  float st = step(0.985, h21(sp)) * (0.6 + 0.4 * sin(uTime * 2.0 + h21(sp+3.0)*20.0));
  col += vec3(st) * night * smoothstep(0.3, 0.9, y) * 0.9;
  // distant tree line and rooftops
  float ridge = 0.16 + 0.05 * fbm(vec2(vUv.x * 5.0, 1.0)) + 0.03 * step(0.6, fract(vUv.x * 7.0)) * step(vUv.x, 0.55);
  float trees = 0.2 + 0.08 * fbm(vec2(vUv.x * 14.0, 3.0));
  vec3 land = mix(vec3(0.02, 0.03, 0.04), vec3(0.16, 0.2, 0.18), day) + vec3(0.25, 0.12, 0.05) * clamp(dusk,0.0,1.0) * 0.4;
  col = mix(col, land, step(vUv.y, max(ridge, trees)));
  // a few warm windows in the houses at night
  float lit = step(0.9, h21(floor(vUv * vec2(40.0, 60.0)) + 7.0)) * step(vUv.y, ridge - 0.01) * step(0.05, vUv.y) * night;
  col += vec3(1.0, 0.75, 0.4) * lit * 0.8;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

export function createSkyMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms: { uHour: { value: 12 }, uTime: { value: 0 } },
    toneMapped: false,
  });
}

/** Per-frame uniforms: the game clock's hour and a slow drift for the clouds / star twinkle. */
export function updateSkyMaterial(mat: THREE.ShaderMaterial, elapsed: number): void {
  const g = getGame();
  mat.uniforms.uHour.value = g ? hourOfDay(g.clock.hour) : 12;
  mat.uniforms.uTime.value = elapsed;
}
