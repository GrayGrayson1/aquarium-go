/**
 * Keeps custom shader programs alive across LOD swaps. OWNER: lane "tankrender".
 *
 * Why: three keys a ShaderMaterial's program by per-session ids of its vertex/fragment shader *stages*, and a stage is
 * dropped the moment the last material using that source is disposed. Every tank switch and every room ↔ tank toggle
 * disposes the hero's water/FX materials (LOD swap) and creates new ones with the very same source: new stage ids, a
 * new cache key, and a synchronous compile + link on their first draw — 100–380 ms frozen at the start of each camera
 * flight, on every switch, for the whole session (measured: 4–5 new programs per switch). ProgramKeeper cannot help
 * because those keys were never stable.
 *
 * Now a custom material is parked instead of disposed when its component unmounts: the most recently unmounted
 * material of each (shader source, defines) variant is kept — it holds the stage ids and the linked program(s) — and
 * the one it replaces is disposed. Later mounts hit the program cache. The set is bounded by the number of shader
 * variants, not by play time (one material object per variant, no geometry).
 */
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type * as THREE from 'three';

const parked = new Map<string, THREE.ShaderMaterial>();

function variantKey(m: THREE.ShaderMaterial): string {
  let k = m.vertexShader + '\u0000' + m.fragmentShader;
  if (m.defines) for (const name of Object.keys(m.defines).sort()) k += `\u0000${name}=${String(m.defines[name])}`;
  return k;
}

/**
 * Release a custom material that its component no longer draws: parked if the renderer has compiled it (so its
 * programs stay cached), disposed outright otherwise.
 */
export function parkShaderMaterial(gl: THREE.WebGLRenderer, m: THREE.ShaderMaterial): void {
  const props = gl.properties.get(m) as { programs?: Map<string, unknown> } | undefined;
  if (!props?.programs?.size) {
    m.dispose();
    return;
  }
  const key = variantKey(m);
  const prev = parked.get(key);
  parked.set(key, m);
  if (prev && prev !== m) prev.dispose();
}

/** Parks `mat` (see parkShaderMaterial) when the component unmounts or the material is replaced. */
export function useParkedMaterial(mat: THREE.ShaderMaterial): void {
  const gl = useThree((s) => s.gl);
  useEffect(() => () => parkShaderMaterial(gl, mat), [gl, mat]);
}

/** QA: number of parked variants. */
export function parkedProgramCount(): number {
  return parked.size;
}
