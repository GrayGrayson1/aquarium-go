/**
 * The scenario lab without a browser (chunk 15, ADR-0051): build a recipe, run it forward and print what happened, so
 * an agent or a test can try a setup in seconds. docs/SCENARIOS.md has the recipe format; src/dev/scenario/cli.ts the
 * logic.
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
import { scenarioCli } from '@/dev/scenario/cli';

process.exit(
  scenarioCli(process.argv.slice(2), {
    read: (path) => readFileSync(path === '-' ? 0 : path, 'utf8'),
    write: (path, text) => writeFileSync(path, text),
    print: (line) => console.log(line),
    fixtures: FIXTURES,
  }),
);
