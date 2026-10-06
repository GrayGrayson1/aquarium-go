#!/usr/bin/env node
/**
 * Test inventory (master §35 test-integrity alarm): records every Vitest and Playwright test id plus the markers that
 * disable or invert tests, and compares against the reference inventory so tests can't silently disappear, be
 * renamed away, be skipped or be inverted.
 *
 *   node scripts/agent/test-inventory.mjs --baseline   # S0 only: write evidence/S0/test-inventory-baseline.json
 *                                                     # from STATE.actualBaselineSha (in a temporary worktree)
 *   node scripts/agent/test-inventory.mjs --write      # write evidence/<slice>/test-inventory.json (end of a slice)
 *   node scripts/agent/test-inventory.mjs              # the gate: compare the current tests with the reference
 *
 * The reference is the previous slice's inventory, or for S0 the baseline inventory. A missing reference fails.
 * A deliberate removal or rename is allowed only when docs/agent/evidence/<slice>/test-changes.json lists it with
 * a requirement and a committed ADR:
 *   [{ "removed": "<file> > <test name>", "reason": "...", "requirement": "NAV-017", "decision": "ADR-0007" }]
 * Lists come from `npx vitest list --json` and `npx playwright test --list --reporter=json` (no browser needed).
 * The harness's own node:test files (scripts/agent/*.test.mjs) are scanned for skip markers too, in their code only:
 * the text of their strings, templates, regular expressions and comments is left out, because agent.test.mjs quotes
 * every marker form as test data (code-architecture-harness-2 m6). A file the reference doesn't list starts at zero.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { join, relative } from 'node:path';
import { PATHS, ROOT, SLICES, abs, exists, findAdr, git, isMainModule, nowIso, parseArgs, readJson, writeJson } from './lib.mjs';
import { codeTreeOf, recordFile } from './evidence.mjs';

/**
 * Markers that skip, focus, defer or invert a test, in any of the forms Vitest and Playwright accept: modifiers
 * (`.skip(`, `.skip (`, `.skip.each(`, and aliases such as `const s = it.skip`), skipIf/runIf, test.fail, x-prefixed
 * functions, options objects (`{ skip: true }`), bracket access (`describe['skip']`) and runtime skips from the test
 * context (`ctx.skip()`, `({ skip }) => skip()`, `async ({ expect, skip }) => …`).
 */
export const DISABLE_RE =
  /\.(?:skip|only|todo|fixme|fails)\b|\b(?:skipIf|runIf)\s*\(|\btest\.fail\s*\(|\bx(?:it|test|describe)\s*\(|\b(?:skip|only|todo|fails)\s*:\s*true\b|\[\s*['"](?:skip|only|todo|fails|fixme)['"]\s*\]|\b(?:ctx|context|t|task)\.skip\s*\(|\(\s*\{\s*skip\s*\}\s*\)|\(\s*\{[^{}]*\bskip\b[^{}]*\}\s*\)\s*=>/g;

function npx(args, cwd) {
  return execFileSync('npx', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
}

export function vitestIds(json, root = ROOT) {
  return json.map((t) => `${relative(root, t.file)} > ${t.name}`).sort();
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

function testFiles(root, dir, out = []) {
  if (!existsSync(join(root, dir))) return out;
  for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) testFiles(root, rel, out);
    else if (/\.(test|spec)\.tsx?$/.test(e.name)) out.push(rel);
  }
  return out;
}

export function skipMarkers(files, read, re = DISABLE_RE) {
  const counts = {};
  for (const f of files) {
    const n = (read(f).match(re) ?? []).length;
    if (n) counts[f] = n;
  }
  return counts;
}

/**
 * node:test's own markers on top of DISABLE_RE: an options object whose skip, todo or only is set to anything but
 * false (`{ skip: 'reason' }`, `{ todo: true }`, `{ skip: process.env.CI }`). `t.skip()`, `test.todo()` and the like
 * are already DISABLE_RE's `.skip`/`.todo` forms.
 */
export const NODE_TEST_DISABLE_RE = new RegExp(`${DISABLE_RE.source}|\\b(?:skip|todo|only)\\s*:\\s*(?!false\\b|undefined\\b|null\\b|0\\b)[^\\s,}]`, 'g');

/** Characters after which a "/" starts a regular expression literal rather than a division. */
const REGEX_AFTER = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);
const REGEX_AFTER_WORDS = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);

/**
 * JavaScript source with the text of its comments, strings, template literals and regular expression literals left
 * out (pure), so a marker quoted as data doesn't count as a marker. Quotes stay as empty pairs, template `${…}`
 * expressions stay as code, a regular expression becomes `RE` and a comment a space. A heuristic tokenizer: enough
 * for test files, not a parser.
 */
export function jsCodeOnly(src) {
  let out = '';
  let i = 0;
  const stack = []; // open template literals: the brace depth at which each `${…}` returns to its template
  let depth = 0;
  const lastSignificant = () => {
    const t = out.trimEnd();
    const word = t.match(/[A-Za-z_$][\w$]*$/)?.[0];
    if (word) return REGEX_AFTER_WORDS.has(word) ? '(' : 'a';
    return t.slice(-1);
  };
  const template = (opening) => {
    // inside a template literal, starting after its opening backtick or after the `}` that closes an expression
    if (opening) out += '`';
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') i += 2;
      else if (c === '`') {
        i++;
        out += '`';
        return;
      } else if (c === '$' && src[i + 1] === '{') {
        i += 2;
        out += '${';
        stack.push(depth);
        depth++;
        return;
      } else i++;
    }
  };
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      out += ' ';
    } else if (c === '/' && d === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end < 0 ? src.length : end + 2;
      out += ' ';
    } else if (c === "'" || c === '"') {
      i++;
      while (i < src.length && src[i] !== c && src[i] !== '\n') i += src[i] === '\\' ? 2 : 1;
      i++;
      out += `${c}${c}`;
    } else if (c === '`') {
      i++;
      template(true);
    } else if (c === '/' && REGEX_AFTER.has(lastSignificant())) {
      i++;
      let inClass = false;
      while (i < src.length && src[i] !== '\n') {
        const r = src[i];
        if (r === '\\') i += 2;
        else if (inClass) {
          if (r === ']') inClass = false;
          i++;
        } else if (r === '[') {
          inClass = true;
          i++;
        } else if (r === '/') {
          i++;
          break;
        } else i++;
      }
      while (i < src.length && /[a-z]/i.test(src[i])) i++; // flags
      out += 'RE';
    } else if (c === '{') {
      depth++;
      out += c;
      i++;
    } else if (c === '}') {
      depth--;
      i++;
      if (stack.length && stack[stack.length - 1] === depth) {
        stack.pop();
        out += '}';
        template(false);
      } else out += c;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/** The harness's own node:test files (scripts/agent/*.test.mjs) under `root`. */
export function harnessTestFiles(root = ROOT) {
  const dir = join(root, 'scripts/agent');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.test.mjs')).sort().map((f) => `scripts/agent/${f}`);
}

/** Skip markers in the code of the harness's node:test files (their quoted text left out, jsCodeOnly). */
export function harnessSkipMarkers(files, read) {
  return skipMarkers(files, (f) => jsCodeOnly(read(f)), NODE_TEST_DISABLE_RE);
}

/** Inventory of the checkout at `root` (the repo, or a temporary worktree of another commit). */
export function buildInventory(root = ROOT, head = git('rev-parse', 'HEAD'), codeTree = codeTreeOf(null)) {
  const files = [...testFiles(root, 'tests'), ...testFiles(root, 'src')].sort();
  const vitest = vitestIds(JSON.parse(npx(['vitest', 'list', '--json'], root)), root);
  const playwright = playwrightIds(JSON.parse(npx(['playwright', 'test', '--list', '--reporter=json'], root)));
  const read = (f) => readFileSync(join(root, f), 'utf8');
  return {
    generatedAt: nowIso(),
    head,
    codeTree,
    vitest: { count: vitest.length, tests: vitest },
    playwright: { count: playwright.length, tests: playwright },
    skipMarkers: { ...skipMarkers(files, read), ...harnessSkipMarkers(harnessTestFiles(root), read) },
  };
}

/** Inventory of commit `sha` built in a temporary detached worktree under .agent-runs/ (removed afterwards). */
export function inventoryAt(sha) {
  const dir = abs(`.agent-runs/inventory-${sha.slice(0, 12)}`);
  if (existsSync(dir)) git('worktree', 'remove', '--force', dir);
  git('worktree', 'add', '--detach', dir, sha);
  try {
    symlinkSync(abs('node_modules'), join(dir, 'node_modules'));
    return buildInventory(dir, sha, codeTreeOf(sha));
  } finally {
    git('worktree', 'remove', '--force', dir);
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  }
}

/** Pure comparison of two inventories; `allowed` is the set of approved removals ("<file> > <name>"). */
export function compareInventories(base, now, allowed = new Set()) {
  const errors = [];
  for (const kind of ['vitest', 'playwright']) {
    const have = new Set(now[kind].tests);
    const missing = base[kind].tests.filter((t) => !have.has(t) && !allowed.has(t));
    for (const t of missing.slice(0, 50)) errors.push(`${kind} test disappeared: ${t}`);
    if (missing.length > 50) errors.push(`… and ${missing.length - 50} more ${kind} tests disappeared`);
    const approved = [...allowed].filter((t) => base[kind].tests.includes(t)).length;
    if (now[kind].count < base[kind].count - approved) errors.push(`${kind} test count dropped from ${base[kind].count} to ${now[kind].count}`);
  }
  for (const [file, n] of Object.entries(now.skipMarkers)) {
    const before = base.skipMarkers[file] ?? 0;
    if (n > before) errors.push(`${file} gained ${n - before} skip/only/todo/fails marker(s)`);
  }
  return errors;
}

/** Problems with test-changes.json entries: each needs a requirement and a committed ADR. */
export function validateTestChanges(changes, knownRequirements, adrExists) {
  const problems = [];
  if (!Array.isArray(changes)) return ['test-changes.json must be a list'];
  changes.forEach((c, i) => {
    if (typeof c?.removed !== 'string' || !c.removed.includes(' > ')) problems.push(`test-changes entry ${i + 1}: "removed" must be "<file> > <test name>"`);
    if (!knownRequirements.has(c?.requirement)) problems.push(`test-changes entry ${i + 1}: unknown requirement ${c?.requirement}`);
    if (!adrExists(String(c?.decision ?? ''))) problems.push(`test-changes entry ${i + 1}: decision ${c?.decision} is not a committed ADR listed in decisions/INDEX.md`);
  });
  return problems;
}

/** The reference inventory for `slice`: the previous slice's, or the baseline for S0. */
export function referenceInventoryPath(slice) {
  const idx = SLICES.indexOf(slice);
  if (idx <= 0) return `${PATHS.evidence}/S0/test-inventory-baseline.json`;
  for (let i = idx - 1; i >= 0; i--) {
    const p = `${PATHS.evidence}/${SLICES[i]}/test-inventory.json`;
    if (exists(p)) return p;
  }
  return null;
}

if (isMainModule(import.meta.url)) {
  let args;
  try {
    args = parseArgs(process.argv.slice(2), ['write', 'baseline'], []);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const state = readJson(PATHS.state);
  if (args.baseline) {
    if (state.currentSlice !== 'S0' || !state.actualBaselineSha) {
      console.error('--baseline is for S0, from STATE.actualBaselineSha');
      process.exit(1);
    }
    const inv = inventoryAt(state.actualBaselineSha);
    const out = `${PATHS.evidence}/S0/test-inventory-baseline.json`;
    writeJson(out, inv);
    recordFile('S0', out, 'test-inventory-baseline');
    console.log(`baseline at ${state.actualBaselineSha.slice(0, 10)}: vitest ${inv.vitest.count}, playwright ${inv.playwright.count} → ${out}`);
    process.exit(0);
  }
  const now = buildInventory();
  console.log(`vitest ${now.vitest.count} tests, playwright ${now.playwright.count} tests, disable markers in ${Object.keys(now.skipMarkers).length} file(s)`);
  if (args.write) {
    const out = `${PATHS.evidence}/${state.currentSlice}/test-inventory.json`;
    writeJson(out, now);
    recordFile(state.currentSlice, out, 'test-inventory');
    console.log(`wrote ${out}`);
    process.exit(0);
  }
  const basePath = referenceInventoryPath(state.currentSlice);
  if (!basePath || !exists(basePath)) {
    console.log(`ERROR   no reference inventory (${basePath ?? 'none'}); for S0 run --baseline first`);
    process.exit(1);
  }
  const changesPath = `${PATHS.evidence}/${state.currentSlice}/test-changes.json`;
  const changes = exists(changesPath) ? readJson(changesPath) : [];
  const known = new Set(readJson(PATHS.requirements).requirements.map((r) => r.id));
  const errors = [...validateTestChanges(changes, known, (d) => !!findAdr(d)), ...compareInventories(readJson(basePath), now, new Set(changes.map((c) => c.removed)))];
  for (const e of errors) console.log(`ERROR   ${e}`);
  console.log(errors.length ? `FAILED against ${basePath}` : `OK against ${basePath}`);
  process.exit(errors.length ? 1 : 0);
}
