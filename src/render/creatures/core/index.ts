/**
 * Procedural creature generator — public API. OWNER: lane "fishart". Other render lanes (critterart) may import it.
 *
 * Pipeline: a body plan (FishPlan) → BodySampler (profile curves, superellipse sections, head shaping) →
 * buildBodyGeometry (lofted, UV'd, analytic normals) + buildFinGeometry (membranes with spread/fold poses) +
 * eyes → createFishUniforms/createFishMaterials (MeshPhysicalMaterial patched with swim deformation, pattern
 * synthesis, scales, iridescence, translucent fins, underwater caustics/fog) → buildFish (CreatureObject that reads
 * CreatureRuntime every frame).
 *
 * Quick start for a new fish-like creature:
 *   const body = { noseX: 0.4, length: 0.75, dorsal: curve([[0,.04],[.4,.1],[1,.04]]), ventral: ..., width: ...,
 *                  mouth: { kind: 'terminal', yn: 0, t: 0.05 }, operculum: { t: 0.25, strength: 1 } };
 *   const b = new BodySampler(body);
 *   const plan: FishPlan = { key: 'my_fish', body, fins: [caudal(b, {...}), dorsal(b, {...})], eye: ..., motion: ..., look: ... };
 *   registerCreatureVisual('my_fish', (args) => buildFish(plan, args));
 */
export * from './plan';
export * from './math';
export { BodySampler, buildBodyGeometry } from './body';
export type { SurfacePoint, BodyGeometryOptions } from './body';
export { caudal, dorsal, anal, adipose, spinyDorsal, sailDorsal, pectoral, pelvic, thread, beard, buildFinGeometry } from './fins';
export type { CaudalKind, CaudalOptions, MedianOptions, PairedOptions } from './fins';
export { buildExtrasGeometry } from './extras';
export { createFishUniforms, createFishMaterials, applyFinUniforms, resolvePattern } from './materials';
export type { FishUniforms, FishMaterials, EyeUniforms } from './materials';
export { buildFish } from './fishObject';
export type { FishObject } from './fishObject';
export { resolveColor, safeColor, mixHex, shadeHex, luminance, appearanceHash } from './palette';
export { acquireFishGeometry, releaseFishGeometry, eyeGeometry, lodResolution, mergeIndexed } from './cache';
export { PATTERN_ID, MAX_FINS, MAX_MARKS } from './shaders';
