/**
 * Shown when no game/showcase world is loaded: the camera floats in open water — a deep gradient with rippling
 * caustic light from far above, slow light shafts and drifting motes. Cheap (one sphere + one points draw).
 * OWNER: lane "waterfx".
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { GLSL_CAUSTICS, GLSL_VALUE_NOISE } from './glsl';

export function AmbientDepths() {
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const skyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          ${GLSL_CAUSTICS}
          ${GLSL_VALUE_NOISE}
          uniform float uTime; varying vec3 vDir;
          void main(){
            vec3 d = normalize(vDir);
            float up = d.y * 0.5 + 0.5;
            vec3 deep = vec3(0.002, 0.012, 0.022);
            vec3 mid = vec3(0.01, 0.07, 0.1);
            vec3 top = vec3(0.07, 0.3, 0.36);
            vec3 col = mix(deep, mid, smoothstep(0.1, 0.6, up));
            col = mix(col, top, smoothstep(0.6, 1.0, up));
            // Snell's window + caustic shimmer overhead
            if (d.y > 0.0) {
              vec2 p = d.xz / max(d.y, 0.15) * 2.2;
              float c = agCausticsW(p, uTime * 0.6, 0.18);
              col += vec3(0.25, 0.55, 0.6) * c * pow(d.y, 3.0) * 0.5;
              col += vec3(0.5, 0.8, 0.85) * pow(smoothstep(0.75, 1.0, d.y), 4.0) * 0.6;
            }
            // soft vertical shafts
            float ang = atan(d.x, -d.z);
            float sh = agVNoise(vec2(ang * 9.0 + uTime * 0.04, uTime * 0.05));
            sh = pow(sh, 3.0) * smoothstep(-0.2, 0.7, d.y) * (1.0 - smoothstep(0.7, 1.0, d.y));
            col += vec3(0.1, 0.28, 0.3) * sh * 0.5;
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [uniforms],
  );
  useEffect(() => () => skyMat.dispose(), [skyMat]);

  const motes = useMemo(() => {
    const n = 700;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 0.6 + Math.random() * 7;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 2] = Math.sin(a) * r - 1.5;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useEffect(() => () => motes.dispose(), [motes]);
  const moteMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          uniform float uTime; varying float vA;
          void main(){
            vec3 p = position;
            p.y = mod(p.y + uTime * 0.03 + 3.0, 6.0) - 3.0;
            p.x += sin(uTime * 0.2 + position.z) * 0.1;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            float dist = -mv.z;
            vA = smoothstep(9.0, 2.0, dist) * 0.8;
            gl_PointSize = clamp(9.0 / dist, 1.0, 6.0);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          varying float vA;
          void main(){
            vec2 c = gl_PointCoord - 0.5;
            float a = exp(-dot(c, c) * 14.0) * vA;
            gl_FragColor = vec4(vec3(0.45, 0.8, 0.85) * a * 0.5, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [uniforms],
  );
  useEffect(() => () => moteMat.dispose(), [moteMat]);

  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime;
  });

  return (
    <group>
      <mesh material={skyMat} frustumCulled={false} renderOrder={-10}>
        <sphereGeometry args={[50, 48, 32]} />
      </mesh>
      <points geometry={motes} material={moteMat} frustumCulled={false} />
    </group>
  );
}
