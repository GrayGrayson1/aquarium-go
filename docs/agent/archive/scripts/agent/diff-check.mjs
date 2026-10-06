#!/usr/bin/env node
/**
 * Whitespace and conflict-marker check (the diffCheck gate) for everything changed since the slice base: committed
 * and uncommitted changes, plus new untracked files, which plain `git diff --check` never sees.
 *
 *   node scripts/agent/diff-check.mjs [--base <sha>]
 *
 * The base defaults to STATE.lastAcceptedCheckpoint, then STATE.actualBaselineSha, then HEAD.
 *
 * docs/agent/evidence is left out: its logs are raw tool output (Vitest prints trailing spaces, for example) and are
 * hashed in the manifest, so they must never be "cleaned".
 */
import { spawnSync } from 'node:child_process';
import { PATHS, ROOT, parseArgs, readJson } from './lib.mjs';

export const EXCLUDED = 'docs/agent/evidence';

let args;
try {
  args = parseArgs(process.argv.slice(2), [], ['base']);
} catch (e) {
  console.error(e.message);
  process.exit(2);
}
let base = args.base;
if (!base) {
  try {
    const s = readJson(PATHS.state);
    base = s.lastAcceptedCheckpoint ?? s.actualBaselineSha ?? 'HEAD';
  } catch {
    base = 'HEAD';
  }
}

const runGit = (...a) => spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' });
let failed = false;

const tracked = runGit('diff', '--check', base, '--', '.', `:(exclude)${EXCLUDED}`);
if (tracked.status !== 0) {
  failed = true;
  process.stdout.write(tracked.stdout || tracked.stderr);
}

const untracked = runGit('ls-files', '-z', '--others', '--exclude-standard').stdout.split('\0').filter((f) => f && !f.startsWith(`${EXCLUDED}/`));
for (const f of untracked) {
  // --no-index always "differs" from /dev/null, so judge by the --check output, not the exit code.
  const out = runGit('diff', '--no-index', '--check', '--', '/dev/null', f).stdout.trim();
  if (out) {
    failed = true;
    console.log(out);
  }
}

console.log(`diff-check against ${base}: ${failed ? 'FAILED' : 'clean'} (${untracked.length} untracked file(s) checked)`);
process.exit(failed ? 1 : 0);
