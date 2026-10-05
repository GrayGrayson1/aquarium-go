#!/usr/bin/env node
/**
 * Requirements traceability audit (master §19, §40 and §41 requirements-audit).
 *
 *   node scripts/agent/requirements-audit.mjs [--json]
 *
 * Fails when:
 * - a requirement of the current slice has no task once the slice is past PLAN_LOCK;
 * - a GREEN requirement has no tests or evidence, or cites evidence that doesn't exist;
 * - a requirement of an already accepted slice (or of the current slice once it claims acceptance) is not
 *   GREEN, DEFERRED or SUPERSEDED;
 * - a DEFERRED or SUPERSEDED requirement doesn't cite an ADR, or a BLOCKED one doesn't say what blocks it;
 * - an umbrella requirement is GREEN while a child that names it is still open;
 * - a requirement that existed at HEAD or at the last accepted checkpoint was deleted (ids are append-only);
 * - CURRENT_SLICE.md names an unknown requirement.
 */
import { pathToFileURL } from 'node:url';
import { PATHS, exists, parseArgs, readJson, readText, showAt } from './lib.mjs';
import { auditRequirements } from './requirements.mjs';

export { auditRequirements };

/** Earlier committed versions of the registry: HEAD and the last accepted checkpoint. */
export function committedRegistries(state) {
  const out = [];
  for (const ref of ['HEAD', state.lastAcceptedCheckpoint].filter(Boolean)) {
    const text = showAt(ref, PATHS.requirements);
    if (text) out.push(JSON.parse(text));
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let args;
  try {
    args = parseArgs(process.argv.slice(2), ['json']);
    if (Object.keys(args).some((k) => !['_', 'json'].includes(k))) throw new Error('usage: requirements-audit.mjs [--json]');
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const state = readJson(PATHS.state);
  const reqs = readJson(PATHS.requirements);
  const sliceText = exists(PATHS.currentSlice) ? readText(PATHS.currentSlice) : '';
  const r = auditRequirements(reqs, state, { committed: committedRegistries(state), sliceText, fileExists: exists });
  if (args.json) console.log(JSON.stringify(r, null, 2));
  else {
    for (const e of r.errors) console.log(`ERROR   ${e}`);
    for (const w of r.warnings) console.log(`WARNING ${w}`);
    for (const [slice, counts] of Object.entries(r.summary)) console.log(`${slice}: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}`);
    console.log(r.errors.length ? `FAILED with ${r.errors.length} error(s)` : 'OK');
  }
  process.exit(r.errors.length ? 1 : 0);
}
