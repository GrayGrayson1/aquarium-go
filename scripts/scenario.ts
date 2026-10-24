/**
 * The scenario lab without a browser (chunk 15, ADR-0051): build a recipe, run it forward and print what happened, so
 * an agent or a test can try a setup in seconds. docs/SCENARIOS.md has the recipe format.
 * Usage: npm run scenario -- <recipe.json | preset> [--hours N] [--json] [--save out.json] [--force]
 *        npm run scenario -- --list
 *   <recipe.json>  a recipe file (or a lab export); a built-in preset by id (`ammonia-crisis`); `-` reads stdin
 *   --hours N      game hours to run (default: the latest check, else 24; 0 only builds)
 *   --json         the build's problems and the report as JSON
 *   --save FILE    write the world at the end as a save file (Settings › Saves › Import, or `__AQ.importText`)
 *   --force        run even if the build reported errors (it always builds what it can)
 * Exit code 1 when the build has errors (without --force) or a check fails.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { FIXTURES } from '@/dev/fixtures';
import { buildScenario, formatReport, presetById, PRESETS, runScenario, type ScenarioRecipe } from '@/dev/scenario';
import { exportSaveText } from '@/persistence/transfer';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const value = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter((a, i) => !a.startsWith('--') && !['--hours', '--save'].includes(args[i - 1] ?? ''));

if (flag('--list') || !positional.length) {
  if (!positional.length && !flag('--list')) console.log('Usage: npm run scenario -- <recipe.json | preset> [--hours N] [--json] [--save out.json]\n');
  console.log('Built-in presets:');
  for (const p of PRESETS) console.log(`  ${p.id.padEnd(20)} ${p.group.padEnd(20)} ${p.recipe.name}`);
  process.exit(flag('--list') ? 0 : 1);
}

function readRecipe(src: string): ScenarioRecipe {
  const preset = presetById(src);
  if (preset && !src.endsWith('.json')) return preset.recipe;
  const text = src === '-' ? readFileSync(0, 'utf8') : readFileSync(src, 'utf8');
  const v = JSON.parse(text) as ScenarioRecipe & { recipe?: ScenarioRecipe };
  return v && typeof v === 'object' && v.recipe && typeof v.recipe === 'object' ? v.recipe : v; // a lab export wraps it
}

let recipe: ScenarioRecipe;
try {
  recipe = readRecipe(positional[0]);
} catch (e) {
  console.error(`Couldn't read ${positional[0]}: ${(e as Error).message}`);
  process.exit(1);
}

const built = buildScenario(recipe, { fixtures: FIXTURES });
const errors = built.issues.filter((i) => i.level === 'error');
const hoursArg = value('--hours');
const checksMax = Math.max(0, ...(recipe.checks ?? []).map((c) => (typeof c.afterHours === 'number' ? c.afterHours : 0)));
const hours = hoursArg !== undefined ? Number(hoursArg) : checksMax || 24;
if (!Number.isFinite(hours) || hours < 0) {
  console.error('--hours must be a number of game hours, 0 or more.');
  process.exit(1);
}
const stop = errors.length > 0 && !flag('--force');
const report = stop ? null : runScenario(built, recipe, hours);

if (flag('--json')) {
  console.log(JSON.stringify({ issues: built.issues, repairs: built.repairs, hoursRunWhileBuilding: built.hoursRun, report }, null, 2));
} else {
  if (built.issues.length) {
    console.log('Build:');
    for (const i of built.issues) console.log(`  ${i.level.toUpperCase().padEnd(7)} ${i.at}: ${i.message}`);
    console.log('');
  }
  if (stop) console.log(`Not run: the build has ${errors.length} error${errors.length === 1 ? '' : 's'} (add --force to run what it built).`);
  if (report) console.log(formatReport(report));
}

const out = value('--save');
if (out) {
  writeFileSync(out, exportSaveText(built.state));
  console.log(`\nSaved the world to ${out} (Settings › Saves › Import).`);
}
process.exit(stop || (report && !report.passed) ? 1 : 0);
