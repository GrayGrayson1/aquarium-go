/**
 * Evidence capture for the agent harness (master §28): runs commands with their logs, hashes and counts, and records
 * them in docs/agent/evidence/<slice>/manifest.json. Node built-ins only.
 *
 * Every command record carries the "code tree": the Git tree hash of the working directory without the harness files
 * (NON_CODE_PATHS). It changes whenever any code, test or config file changes (tracked or new, ignored files
 * excluded) and not when only the harness bookkeeping changes, so check-state.mjs can prove that the gates passed on
 * exactly the code that was later checkpointed.
 */
import { execFileSync, spawn } from 'node:child_process';
import { closeSync, copyFileSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { PATHS, ROOT, abs, exists, git, nowIso, readJson, sha256File, writeJson } from './lib.mjs';

/** Harness bookkeeping and instructions: editing them never invalidates test evidence. */
export const NON_CODE_PATHS = ['docs/agent', 'AGENTS.md', 'CLAUDE.md'];

/**
 * Git tree hash of the code: `ref` (a commit) or, when null, the working directory including untracked files that
 * aren't ignored. NON_CODE_PATHS are removed in both cases. Uses a throwaway index, so the real index is never touched.
 */
export function codeTreeOf(ref) {
  const dir = mkdtempSync(join(tmpdir(), 'aq-codetree-'));
  const env = { ...process.env, GIT_INDEX_FILE: join(dir, 'index') };
  const run = (...args) => execFileSync('git', args, { cwd: ROOT, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  try {
    run('read-tree', ref ?? 'HEAD');
    if (!ref) run('add', '-A', '--', '.');
    run('rm', '-r', '--cached', '-q', '--ignore-unmatch', '--', ...NON_CODE_PATHS);
    return run('write-tree');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export const manifestPath = (slice) => `${PATHS.evidence}/${slice}/manifest.json`;

export function emptyManifest(slice) {
  return { slice, checkpointSha: null, commands: [], browserRuns: [], screenshots: [], performance: [], reviews: [], requirements: [], verdict: 'PENDING' };
}

export function loadManifest(slice) {
  const p = manifestPath(slice);
  if (!exists(p)) return emptyManifest(slice);
  return { ...emptyManifest(slice), ...readJson(p) };
}

export function saveManifest(manifest) {
  mkdirSync(abs(`${PATHS.evidence}/${manifest.slice}`), { recursive: true });
  writeJson(manifestPath(manifest.slice), manifest);
}

/** Pull pass/fail counts out of Vitest, Playwright and tsc output. */
export function parseCounts(text) {
  const counts = {};
  const files = text.match(/Test Files\s+([^\n]*)/);
  if (files) counts.vitestFiles = files[1].trim();
  const tests = text.match(/\n\s*Tests\s+([^\n]*)/);
  if (tests) counts.vitestTests = tests[1].trim();
  for (const k of ['passed', 'failed', 'flaky', 'skipped', 'did not run', 'interrupted']) {
    const m = text.match(new RegExp(`^\\s*(\\d+) ${k}\\b`, 'm'));
    if (m) counts[`playwright_${k.replace(/ /g, '_')}`] = Number(m[1]);
  }
  const tsErrors = text.match(/error TS\d+/g);
  if (tsErrors) counts.tsErrors = tsErrors.length;
  return counts;
}

/** Committed logs stay small: above this size only the tail is committed and the full log is kept outside Git. */
export const LOG_LIMIT_BYTES = 1024 * 1024;
export const LOG_TAIL_LINES = 2000;

/**
 * When a log is over LOG_LIMIT_BYTES, copy it in full to .agent-runs/evidence/<slice>/logs/ (ignored by Git) and
 * replace the committed copy with its last LOG_TAIL_LINES lines. Returns the full log's path, size and hash, or null.
 */
export function trimLog(logRel, text, slice) {
  const bytes = Buffer.byteLength(text);
  if (bytes <= LOG_LIMIT_BYTES) return null;
  const keepRel = `.agent-runs/evidence/${slice}/logs/${basename(logRel, '.log')}.full.log`;
  mkdirSync(dirname(abs(keepRel)), { recursive: true });
  copyFileSync(abs(logRel), abs(keepRel));
  const sha256 = sha256File(abs(keepRel));
  const lines = text.split('\n');
  writeFileSync(abs(logRel), `[trimmed: last ${LOG_TAIL_LINES} of ${lines.length} lines; full log ${keepRel} sha256:${sha256}]\n${lines.slice(-LOG_TAIL_LINES).join('\n')}`);
  return { path: keepRel, bytes, sha256 };
}

/**
 * Run `command` in the repo through the shell, log stdout and stderr to
 * docs/agent/evidence/<slice>/logs/<gate>-<stamp>.log, and append a record to the slice manifest.
 */
export async function runAndRecord({ slice, gate, command, requirements = [], env = {} }) {
  const startIso = nowIso();
  const stamp = startIso.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const logRel = `${PATHS.evidence}/${slice}/logs/${gate}-${stamp}.log`;
  mkdirSync(abs(`${PATHS.evidence}/${slice}/logs`), { recursive: true });
  const head = git('rev-parse', 'HEAD');
  const dirty = git('status', '--porcelain').length > 0;
  const codeTree = codeTreeOf(null);
  const fd = openSync(abs(logRel), 'w');
  const t0 = Date.now();
  const exitCode = await new Promise((resolveExit) => {
    const child = spawn(command, { cwd: ROOT, shell: true, env: { ...process.env, ...env }, stdio: ['ignore', fd, fd] });
    child.on('error', () => resolveExit(127));
    child.on('exit', (code, signal) => resolveExit(code ?? (signal ? 128 : 1)));
  });
  closeSync(fd);
  const text = readFileSync(abs(logRel), 'utf8');
  const counts = parseCounts(text);
  const fullLog = trimLog(logRel, text, slice);
  const record = {
    gate,
    command,
    cwd: ROOT,
    start: startIso,
    end: nowIso(),
    seconds: Math.round((Date.now() - t0) / 1000),
    exitCode,
    counts,
    log: logRel,
    logSha256: sha256File(abs(logRel)),
    ...(fullLog ? { fullLog } : {}),
    head,
    dirty,
    codeTree,
    requirements,
  };
  const manifest = loadManifest(slice);
  manifest.commands.push(record);
  saveManifest(manifest);
  return record;
}
