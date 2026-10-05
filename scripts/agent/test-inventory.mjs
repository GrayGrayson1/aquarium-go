#!/usr/bin/env node
/**
 * Test inventory (master §35 test-integrity alarm): records every Vitest and Playwright test id plus the skip/only
 * markers in test files, and compares against the previous slice's inventory so tests can't silently disappear,
 * be renamed away or be skipped.
 *
 *   node scripts/agent/test-inventory.mjs --write     # write docs/agent/evidence/<slice>/test-inventory.json
 *   node scripts/agent/test-inventory.mjs             # compare the current tests against the last slice's inventory
 *
 * A deliberate removal or rename is allowed only when docs/agent/evidence/<slice>/test-changes.json lists it:
 *   [{ "removed": "<file> > <test name>", "reason": "...", "requirement": "NAV-003", "decision": "ADR-0007" }]
 * Lists come from `npx vitest list --json` and `npx playwright test --list --reporter=json` (no browser needed).
 */
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PATHS, ROOT, SLICES, abs, exists, git, nowIso, parseArgs, readJson, readText, writeJson } from './lib.mjs';
import { codeTreeOf } from './evidence.mjs';

const SKIP_RE = /\.(?:skip|only|todo|fixme)\(|\b(?:skipIf|runIf)\(|\btest\.fail\(/g;

function npx(args) {
  return execFileSync('npx', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
}

export function vitestIds(json) {
  return json.map((t) => `${relative(ROOT, t.file)} > ${t.name}`).sort();
}

export function playwrightIds(report) {
  const ids = [];
  const walk = (suite, trail) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) ids.push(`tests/e2e/${spec.file} > ${[...trail, spec.title].join(' > ')} [${t.projectName}]`);
    }
    for (const child of suite.suites ?? []) walk(child, child.title && !child.title.endsWith('.ts') ? [...trail, child.title] : trail);
  };
  for (const s of report.suites ?? []) walk(s, []);
  return ids.sort();
}

function testFiles(dir, out = []) {
  for (const e of readdirSync(abs(dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) testFiles(rel, out);
    else if (/\.(test|spec)\.tsx?$/.test(e.name)) out.push(rel);
  }
  return out;
}

export function skipMarkers(files, read) {
  const counts = {};
  for (const f of files) {
    const n = (read(f).match(SKIP_RE) ?? []).length;
    if (n) counts[f] = n;
  }
  return counts;
}

export function buildInventory() {
  const files = [...testFiles('tests'), ...testFiles('src')].sort();
  const vitest = vitestIds(JSON.parse(npx(['vitest', 'list', '--json'])));
  const playwright = playwrightIds(JSON.parse(npx(['playwright', 'test', '--list', '--reporter=json'])));
  return {
    generatedAt: nowIso(),
    head: git('rev-parse', 'HEAD'),
    codeTree: codeTreeOf(null),
    vitest: { count: vitest.length, tests: vitest },
    playwright: { count: playwright.length, tests: playwright },
    skipMarkers: skipMarkers(files, readText),
  };
}

/** Pure comparison of two inventories; `allowed` is the set of approved removals ("<file> > <name>"). */
export function compareInventories(base, now, allowed = new Set()) {
  const errors = [];
  for (const kind of ['vitest', 'playwright']) {
    const have = new Set(now[kind].tests);
    const missing = base[kind].tests.filter((t) => !have.has(t) && !allowed.has(t));
    for (const t of missing.slice(0, 50)) errors.push(`${kind} test disappeared: ${t}`);
    if (missing.length > 50) errors.push(`… and ${missing.length - 50} more ${kind} tests disappeared`);
    if (now[kind].count < base[kind].count - [...allowed].filter((t) => base[kind].tests.includes(t)).length) {
      errors.push(`${kind} test count dropped from ${base[kind].count} to ${now[kind].count}`);
    }
  }
  for (const [file, n] of Object.entries(now.skipMarkers)) {
    const before = base.skipMarkers[file] ?? 0;
    if (n > before) errors.push(`${file} gained ${n - before} skip/only/todo marker(s)`);
  }
  return errors;
}

/** The newest inventory recorded for a slice before `slice` (or for `slice` itself when it is S0). */
export function previousInventoryPath(slice) {
  const idx = SLICES.indexOf(slice);
  for (let i = idx === 0 ? 0 : idx - 1; i >= 0; i--) {
    const p = `${PATHS.evidence}/${SLICES[i]}/test-inventory.json`;
    if (exists(p)) return p;
  }
  return null;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = parseArgs(process.argv.slice(2), ['write']);
  const state = readJson(PATHS.state);
  const now = buildInventory();
  console.log(`vitest ${now.vitest.count} tests, playwright ${now.playwright.count} tests, skip markers in ${Object.keys(now.skipMarkers).length} file(s)`);
  if (args.write) {
    const out = `${PATHS.evidence}/${state.currentSlice}/test-inventory.json`;
    writeJson(out, now);
    console.log(`wrote ${out}`);
    process.exit(0);
  }
  const basePath = typeof args.against === 'string' ? args.against : previousInventoryPath(state.currentSlice);
  if (!basePath) {
    console.log('no earlier inventory to compare against; run with --write to record one');
    process.exit(0);
  }
  const changesPath = `${PATHS.evidence}/${state.currentSlice}/test-changes.json`;
  const allowed = new Set(exists(changesPath) ? readJson(changesPath).map((c) => c.removed) : []);
  const errors = compareInventories(readJson(basePath), now, allowed);
  for (const e of errors) console.log(`ERROR   ${e}`);
  console.log(errors.length ? `FAILED against ${basePath}` : `OK against ${basePath}`);
  process.exit(errors.length ? 1 : 0);
}
