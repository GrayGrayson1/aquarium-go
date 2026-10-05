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
 * Fails when a field disagrees with reality, a mandated file wasn't read, or the session is the same one that
 * closed the previous slice (the rollover didn't happen).
 */
import { pathToFileURL } from 'node:url';
import { PATHS, exists, git, parseLedger, readJson, readText } from './lib.mjs';

export const MANDATED_READS = [
  'AGENTS.md',
  'docs/agent/README_FIRST.md',
  'docs/agent/AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md',
  'docs/agent/OPERATIONS.md',
  'docs/agent/STATE.json',
  'docs/agent/CURRENT_SLICE.md',
  'docs/agent/HANDOFF.md',
];

export function checkAssertion(a, { state, head, branch, events }) {
  const errors = [];
  const req = (k, type) => {
    const ok = type === 'array' ? Array.isArray(a?.[k]) : typeof a?.[k] === type && a[k] !== '';
    if (!ok) errors.push(`assertion field ${k} must be a ${type === 'array' ? 'list' : 'non-empty string'}`);
    return ok;
  };
  for (const k of ['sessionId', 'startedAt', 'expectedSha', 'actualSha', 'branch', 'slice', 'task', 'machineState']) req(k, 'string');
  for (const k of ['readFiles', 'requiredGates', 'requiredReviewers', 'forbidden', 'firstFiles', 'risks']) req(k, 'array');
  if (errors.length) return errors;

  if (a.actualSha !== head) errors.push(`actualSha ${a.actualSha} is not HEAD ${head}`);
  if (a.expectedSha !== head) errors.push(`expectedSha ${a.expectedSha} differs from HEAD ${head}: reconcile HANDOFF/STATE with Git before editing (master §16)`);
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
  if (closing?.session && closing.session === a.sessionId) {
    errors.push(`session ${a.sessionId} also closed the previous slice: a fresh session is required after every mega-slice`);
  }
  return errors;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const file = process.argv[2];
  if (!file || !exists(file)) {
    console.error('Usage: node scripts/agent/bootstrap-check.mjs <assertion.json>');
    process.exit(1);
  }
  const errors = checkAssertion(readJson(file), {
    state: readJson(PATHS.state),
    head: git('rev-parse', 'HEAD'),
    branch: git('rev-parse', '--abbrev-ref', 'HEAD'),
    events: parseLedger(exists(PATHS.ledger) ? readText(PATHS.ledger) : '').events,
  });
  for (const e of errors) console.log(`ERROR   ${e}`);
  console.log(errors.length ? `FAILED with ${errors.length} error(s)` : 'OK: the bootstrap assertion matches the repository');
  process.exit(errors.length ? 1 : 0);
}
