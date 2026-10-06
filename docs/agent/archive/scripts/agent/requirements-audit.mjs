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
 * - a DEFERRED or SUPERSEDED decision cites an ADR that isn't committed and listed in decisions/INDEX.md;
 * - a requirement that existed in any version committed since the last accepted checkpoint (or the baseline) was
 *   deleted (ids are append-only);
 * - CURRENT_SLICE.md doesn't name the current slice in its header, or names an unknown requirement.
 *
 * In the prepared NEXT_SLICE state that next-slice.mjs leaves (lib.mjs evidenceScope, as check-state.mjs judges it),
 * the audit judges the accepted predecessor: its requirements must be closed, and the new slice's claim nothing yet.
 */
import { PATHS, committedVersions, evidenceScope, exists, findAdr, isMainModule, parseArgs, parseLedger, readJson, readText } from './lib.mjs';
import { auditRequirements, sliceHeaderProblems } from './requirements.mjs';

export { auditRequirements };

/** Earlier committed versions of the registry: every one since the last accepted checkpoint (or the baseline). */
export function committedRegistries(state) {
  const out = [];
  for (const text of committedVersions(PATHS.requirements, state.lastAcceptedCheckpoint ?? state.actualBaselineSha ?? null)) {
    try {
      out.push(JSON.parse(text));
    } catch {
      /* a committed version that wasn't valid JSON can't name ids */
    }
  }
  return out;
}

/** The STATE view the audit judges (pure): the accepted predecessor in the prepared NEXT_SLICE state, else STATE. */
export function auditView(state, lastTransition) {
  const scope = evidenceScope(state, lastTransition);
  return scope.prepared ? { ...state, currentSlice: scope.acceptedSlice } : state;
}

if (isMainModule(import.meta.url)) {
  let args;
  try {
    args = parseArgs(process.argv.slice(2), ['json'], []);
  } catch (e) {
    console.error(`${e.message}\nusage: requirements-audit.mjs [--json]`);
    process.exit(1);
  }
  const state = readJson(PATHS.state);
  const reqs = readJson(PATHS.requirements);
  const sliceText = exists(PATHS.currentSlice) ? readText(PATHS.currentSlice) : '';
  const lastTransition = parseLedger(exists(PATHS.ledger) ? readText(PATHS.ledger) : '').events.filter((e) => e?.kind === 'transition').pop();
  const r = auditRequirements(reqs, auditView(state, lastTransition), { committed: committedRegistries(state), sliceText, fileExists: exists, adrOk: (id) => !!findAdr(id) });
  r.errors.push(...sliceHeaderProblems(sliceText, state.currentSlice));
  if (args.json) console.log(JSON.stringify(r, null, 2));
  else {
    for (const e of r.errors) console.log(`ERROR   ${e}`);
    for (const w of r.warnings) console.log(`WARNING ${w}`);
    for (const [slice, counts] of Object.entries(r.summary)) console.log(`${slice}: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}`);
    console.log(r.errors.length ? `FAILED with ${r.errors.length} error(s)` : 'OK');
  }
  process.exit(r.errors.length ? 1 : 0);
}
