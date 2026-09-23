/**
 * See-through acrylic for decor (the frag rack). lane:w2-visual.
 *
 * A transparent, glossy MeshStandardMaterial tinted by the geometry's vertex colours and patched with the tank's
 * underwater FX, like the equipment glass (TankEquipment). The broad faces stay mostly clear; polished edges (tagged
 * aExtra.x = 1 by the generator) and grazing angles (Fresnel) turn denser, and the edges carry a faint light-piped
 * glow — the cues that make cast acrylic read as acrylic rather than as a grey slab. Only the hero-LOD DecorItem uses
 * it; merged far LODs keep the opaque decor material (the pale tint reads fine at that size).
 */
import * as THREE from 'three';
import { patchUnderwaterMaterial, type TankFXUniforms } from '../shared/underwater';

/** Face opacity (straight on); edges and grazing views rise from here. */
const FACE_ALPHA = 0.3;

export function makeAcrylicMaterial(fx: TankFXUniforms): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.07,
    metalness: 0,
    envMapIntensity: 1.1,
    transparent: true,
    opacity: FACE_ALPHA,
    depthWrite: false,
  });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aExtra;\nvarying float vAcEdge;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAcEdge = aExtra.x;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vAcEdge;').replace(
      '#include <opaque_fragment>',
      `{
  float acFres = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 3.0);
  diffuseColor.a = clamp(max(diffuseColor.a + acFres * 0.5, vAcEdge * 0.72), 0.0, 0.92);
  outgoingLight += diffuseColor.rgb * vAcEdge * 0.05;
}
#include <opaque_fragment>`,
    );
  };
  mat.customProgramCacheKey = () => 'agdecor-acrylic';
  patchUnderwaterMaterial(mat, fx);
  return mat;
}
