/**
 * `npm run scenario` (scripts/scenario.ts; chunk 15, ADR-0051): build a recipe, run it forward, report. The script is a
 * thin wrapper around `scenarioCli`, which takes its files and output as functions so the tests can run it.
 */
import type { GameState } from '@/types';
import { exportSaveText } from '@/persistence/transfer';
import { buildScenario } from './build';
import { formatReport, runScenario } from './run';
import { PRESETS, presetById } from './presets';
import type { ScenarioRecipe } from './recipe';

export const CLI_USAGE = 'Usage: npm run scenario -- <recipe.json | preset> [--hours N] [--json] [--save out.json] [--force]';

export interface CliIo {
  read(path: string): string;
  write(path: string, text: string): void;
  print(line: string): void;
  fixtures?: Record<string, () => GameState>;
}

/** Run the command line (`args` without the program); resolves to the exit code: 1 on build errors or a failed check. */
export function scenarioCli(args: string[], io: CliIo): number {
  const flag = (name: string) => args.includes(name);
  const value = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const positional = args.filter((a, i) => !a.startsWith('--') && !['--hours', '--save'].includes(args[i - 1] ?? ''));
  if (flag('--list') || !positional.length) {
    if (!flag('--list')) io.print(`${CLI_USAGE}\n`);
    io.print('Built-in presets:');
    for (const p of PRESETS) io.print(`  ${p.id.padEnd(20)} ${p.group.padEnd(20)} ${p.recipe.name}`);
    return flag('--list') ? 0 : 1;
  }
  let recipe: ScenarioRecipe;
  try {
    const src = positional[0];
    const preset = src.endsWith('.json') ? undefined : presetById(src);
    if (preset) recipe = preset.recipe;
    else {
      const v = JSON.parse(io.read(src)) as ScenarioRecipe & { recipe?: ScenarioRecipe };
      recipe = v && typeof v === 'object' && v.recipe && typeof v.recipe === 'object' ? v.recipe : v; // a lab export may wrap it
    }
  } catch (e) {
    io.print(`Couldn't read ${positional[0]}: ${(e as Error).message}`);
    return 1;
  }
  const hoursArg = value('--hours');
  const checksMax = Math.max(0, ...(Array.isArray(recipe?.checks) ? recipe.checks : []).map((c) => (c && typeof c.afterHours === 'number' && Number.isFinite(c.afterHours) ? c.afterHours : 0)));
  const hours = hoursArg !== undefined ? Number(hoursArg) : checksMax || 24;
  if (!Number.isFinite(hours) || hours < 0) {
    io.print('--hours must be a number of game hours, 0 or more.');
    return 1;
  }
  const built = buildScenario(recipe, { fixtures: io.fixtures });
  const errors = built.issues.filter((i) => i.level === 'error');
  const stop = errors.length > 0 && !flag('--force');
  const report = stop ? null : runScenario(built, recipe, hours);
  if (flag('--json')) {
    io.print(JSON.stringify({ issues: built.issues, repairs: built.repairs, hoursRunWhileBuilding: built.hoursRun, report }, null, 2));
  } else {
    if (built.issues.length) {
      io.print('Build:');
      for (const i of built.issues) io.print(`  ${i.level.toUpperCase().padEnd(7)} ${i.at}: ${i.message}`);
      io.print('');
    }
    if (stop) io.print(`Not run: the build has ${errors.length} error${errors.length === 1 ? '' : 's'} (add --force to run what it built).`);
    if (report) io.print(formatReport(report));
  }
  const out = value('--save');
  if (out) {
    io.write(out, exportSaveText(built.state));
    io.print(`\nSaved the world to ${out} (Settings › Saves › Import).`);
  }
  return stop || (report && !report.passed) ? 1 : 0;
}
