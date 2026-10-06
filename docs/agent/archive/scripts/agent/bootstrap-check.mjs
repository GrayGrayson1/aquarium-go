#!/usr/bin/env node
/**
 * Check a fresh session's bootstrap assertion (master §16) against Git and STATE.json, field by field.
 *
 *   node scripts/agent/bootstrap-check.mjs docs/agent/evidence/S1/bootstrap-20261006T090000Z.json
 *
 * The agent writes the assertion itself after reading the mandated files and before editing anything:
 *
 *   {
 *     "sessionId": "<CLAUDE_CODE_SESSION_ID>",   "startedAt": "<ISO time>",
 *     "readFiles": ["AGENTS.md", "docs/agent/README_FIRST.md", ...],
 *     "expectedSha": "<full SHA the handoff says HEAD should be>",  "actualSha": "<git rev-parse HEAD>",
 *     "branch": "...", "slice": "S1", "task": "...", "machineState": "...",
 *     "requiredGates": ["typecheck", ...], "requiredReviewers": ["code-architecture", ...],
 *     "forbidden": ["git push", "deploy", ...], "firstFiles": ["src/..."], "risks": ["...", "...", "..."]
 *   }
 *
 * Fails when a field disagrees with reality, a mandated file wasn't read, a file in readFiles or firstFiles doesn't
 * exist, startedAt isn't an ISO time, the session id isn't the running Claude Code session (or no session id is known),
 * or the session is the same one that closed the previous slice, or that closing transition recorded no session (the
 * rollover didn't happen, or can't be shown).
 * expectedSha may trail HEAD when the only commits since touch harness bookkeeping (NON_CODE_PATHS): the handoff is
 * written before the commit that contains it.
 */
import { isAbsolute } from 'node:path';
import { PATHS, currentSession, exists, git, gitOk, isMainModule, parseLedger, readJson, readText } from './lib.mjs';
import { NON_CODE_PATHS } from './evidence.mjs';

export const MANDATED_READS = [
  'AGENTS.md',
  'docs/agent/README_FIRST.md',
  'docs/agent/AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md',
  'docs/agent/OPERATIONS.md',
  'docs/agent/STATE.json',
  'docs/agent/CURRENT_SLICE.md',
  'docs/agent/HANDOFF.md',
];

/** True when `expected` is HEAD, or an ancestor whose later commits only touch NON_CODE_PATHS. */
export function bookkeepingOnlySince(expected, head, changedFiles) {
  if (expected === head) return true;
  if (changedFiles === null) return false;
  return changedFiles.every((f) => NON_CODE_PATHS.some((p) => f === p || f.startsWith(`${p}/`)));
}

/** An ISO 8601 date-time with a time zone ("2026-10-06T01:29:44Z", "2026-10-06T01:29:44.5+02:00"). */
export const ISO_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;

export function checkAssertion(a, { state, head, branch, events, session = null, changedSinceExpected = null, fileExists = exists }) {
  const errors = [];
  const req = (k, type) => {
    const ok = type === 'array' ? Array.isArray(a?.[k]) : typeof a?.[k] === type && a[k] !== '';
    if (!ok) errors.push(`assertion field ${k} must be a ${type === 'array' ? 'list' : 'non-empty string'}`);
    return ok;
  };
  for (const k of ['sessionId', 'startedAt', 'expectedSha', 'actualSha', 'branch', 'slice', 'task', 'machineState']) req(k, 'string');
  for (const k of ['readFiles', 'requiredGates', 'requiredReviewers', 'forbidden', 'firstFiles', 'risks']) req(k, 'array');
  if (errors.length) return errors;

  if (!ISO_TIME_RE.test(a.startedAt) || Number.isNaN(Date.parse(a.startedAt))) errors.push(`startedAt ${a.startedAt} is not an ISO time (for example 2026-10-06T01:29:44Z)`);
  for (const k of ['readFiles', 'firstFiles']) {
    for (const f of a[k]) if (typeof f !== 'string' || !f || isAbsolute(f) || f.split(/[\\/]/).includes('..') || !fileExists(f)) errors.push(`${k} names ${JSON.stringify(f)}, which is not a file in this repository`);
  }
  if (a.actualSha !== head) errors.push(`actualSha ${a.actualSha} is not HEAD ${head}`);
  if (!bookkeepingOnlySince(a.expectedSha, head, changedSinceExpected)) errors.push(`expectedSha ${a.expectedSha} differs from HEAD ${head} by more than harness bookkeeping: reconcile HANDOFF/STATE with Git before editing (master §16)`);
  if (!session) errors.push('CLAUDE_CODE_SESSION_ID is not set: run the check inside the Claude Code session it describes, so the session id can be compared');
  else if (a.sessionId !== session) errors.push(`sessionId ${a.sessionId} is not this Claude Code session (${session})`);
  if (a.branch !== branch) errors.push(`branch ${a.branch} is not the current branch ${branch}`);
  for (const k of [['slice', 'currentSlice'], ['task', 'currentTask'], ['machineState', 'machineState']]) {
    if (a[k[0]] !== state[k[1]]) errors.push(`${k[0]} ${a[k[0]]} differs from STATE.${k[1]} ${state[k[1]]}`);
  }
  for (const f of MANDATED_READS) if (!a.readFiles.includes(f)) errors.push(`mandated file ${f} is not in readFiles`);
  const gates = Object.entries(state.gates ?? {}).filter(([, v]) => v !== 'NOT_APPLICABLE').map(([g]) => g);
  for (const g of gates) if (!a.requiredGates.includes(g)) errors.push(`required gate ${g} is missing from requiredGates`);
  for (const r of state.requiredReviewers ?? []) if (!a.requiredReviewers.includes(r)) errors.push(`required reviewer ${r} is missing`);
  const forbidden = a.forbidden.join(' ').toLowerCase();
  for (const word of ['push', 'deploy']) if (!forbidden.includes(word)) errors.push(`forbidden actions don't mention "${word}"`);
  if (a.risks.length < 3) errors.push('name at least three risks');
  if (!a.firstFiles.length) errors.push('name the first files to inspect');
  const closing = [...events].reverse().find((e) => e?.kind === 'transition' && e.toState === 'NEXT_SLICE');
  if (closing && !closing.session) errors.push('the transition that closed the previous slice records no session id, so the rollover to a fresh session can\'t be checked');
  else if (closing?.session === a.sessionId) {
    errors.push(`session ${a.sessionId} also closed the previous slice: a fresh session is required after every mega-slice`);
  }
  return errors;
}

if (isMainModule(import.meta.url)) {
  const file = process.argv[2];
  if (!file || !exists(file)) {
    console.error('Usage: node scripts/agent/bootstrap-check.mjs <assertion.json>');
    process.exit(1);
  }
  const a = readJson(file);
  const head = git('rev-parse', 'HEAD');
  let changedSinceExpected = null;
  if (typeof a.expectedSha === 'string' && /^[0-9a-f]{40}$/.test(a.expectedSha) && gitOk('merge-base', '--is-ancestor', a.expectedSha, head)) {
    changedSinceExpected = git('diff', '--name-only', a.expectedSha, head).split('\n').filter(Boolean);
  }
  const errors = checkAssertion(a, {
    state: readJson(PATHS.state),
    head,
    branch: git('rev-parse', '--abbrev-ref', 'HEAD'),
    events: parseLedger(exists(PATHS.ledger) ? readText(PATHS.ledger) : '').events,
    session: currentSession(),
    changedSinceExpected,
  });
  for (const e of errors) console.log(`ERROR   ${e}`);
  console.log(errors.length ? `FAILED with ${errors.length} error(s)` : 'OK: the bootstrap assertion matches the repository');
  process.exit(errors.length ? 1 : 0);
}
