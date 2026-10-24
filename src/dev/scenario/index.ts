/**
 * The scenario lab's engine (chunk 15, ADR-0051): recipes, the builder, the presets and the headless run. A developer
 * tool: the app loads it only where the developer tools are allowed (src/state/devTools.ts), Node code imports it.
 * The format is documented in docs/SCENARIOS.md.
 */
export { RECIPE_FORMAT, RECIPE_VERSION } from './recipe';
export type * from './recipe';
export { buildScenario, recipeProblem, slugOf, WATER_RANGES, MAX_WARMUP_HOURS, MAX_SPAWN_HOURS, type BuildEnv, type BuildIssue, type BuildResult, type IssueLevel } from './build';
export { validateRecipe, type Validation } from './validate';
export { captureRecipe } from './capture';
export { runScenario, formatReport, type RunReport, type CheckResult, type TankReport } from './run';
export { PRESETS, presetById, type Preset, type PresetGroup } from './presets';
export { genesForMorph, morphNames, findMorph } from './genes';
export { encodeRecipeParam, decodeRecipeParam, readLabAddress, type LabAddress } from './link';
export { deepMerge } from './patch';
