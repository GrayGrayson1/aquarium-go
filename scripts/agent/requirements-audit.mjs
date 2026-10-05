#!/usr/bin/env node
/**
 * Requirements traceability audit (master §19, §40 and §41 requirements-audit).
 *
 *   node scripts/agent/requirements-audit.mjs [--json]
 *
 * Fails when:
 * - a requirement of the current slice has no task once the slice is past PLAN_LOCK;
 * - a GREEN requirement has no tests or evidence;
 * - a requirement of an already accepted slice (or of the current slice once it claims acceptance) is not
 *   GREEN, DEFERRED or SUPERSEDED;
 * - a DEFERRED or SUPERSEDED requirement has no decision reference;
 * - a requirement that exists at HEAD was deleted (ids are append-only);
 * - CURRENT_SLICE.md names an unknown requirement.
 */
import { pathToFileURL } from 'node:url';
import { ACCEPTED_STATES, LEGAL_STATES, PATHS, REQ_FAMILIES, SLICES, exists, git, parseArgs, readJson, readText } from './lib.mjs';
import { validateRequirements } from './check-state.mjs';

const BEFORE_TASKS = ['BOOTSTRAP', 'BASELINE_VERIFY', 'SLICE_DISCOVERY', 'PLAN_LOCK'];
const CLOSED = ['GREEN', 'DEFERRED', 'SUPERSEDED'];

export function auditRequirements(reqs, state, { committed = null, sliceText = '' } = {}) {
  const { errors, warnings } = validateRequirements(reqs, committed);
  const list = Array.isArray(reqs?.requirements) ? reqs.requirements : [];
  const current = SLICES.indexOf(state.currentSlice);
  const pastPlan = LEGAL_STATES.includes(state.machineState) && !BEFORE_TASKS.includes(state.machineState);
  const claimsAcceptance = ACCEPTED_STATES.includes(state.machineState);
  for (const r of list) {
    const idx = SLICES.indexOf(r.slice);
    if (r.slice === state.currentSlice && !CLOSED.includes(r.status)) {
      if (!r.tasks?.length) (pastPlan ? errors : warnings).push(`${r.id} (${r.slice}) has no task${pastPlan ? ' after PLAN_LOCK' : ' yet'}`);
      if (claimsAcceptance) errors.push(`${r.id} is ${r.status} but ${state.currentSlice} claims acceptance (${state.machineState})`);
    }
    if (idx >= 0 && idx < current && !CLOSED.includes(r.status)) {
      errors.push(`${r.id} belongs to accepted slice ${r.slice} but is ${r.status}`);
    }
  }
  const known = new Set(list.map((r) => r.id));
  const tokenRe = new RegExp(`\\b(?:${REQ_FAMILIES.join('|')})-\\d{3}\\b`, 'g');
  for (const id of new Set(sliceText.match(tokenRe) ?? [])) {
    if (!known.has(id)) errors.push(`CURRENT_SLICE.md names unknown requirement ${id}`);
  }
  const bySlice = {};
  for (const r of list) {
    bySlice[r.slice] ??= {};
    bySlice[r.slice][r.status] = (bySlice[r.slice][r.status] ?? 0) + 1;
  }
  return { errors, warnings, summary: bySlice };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = parseArgs(process.argv.slice(2), ['json']);
  const state = readJson(PATHS.state);
  const reqs = readJson(PATHS.requirements);
  let committed = null;
  try {
    committed = JSON.parse(git('show', `HEAD:${PATHS.requirements}`));
  } catch {
    /* not committed yet */
  }
  const sliceText = exists(PATHS.currentSlice) ? readText(PATHS.currentSlice) : '';
  const r = auditRequirements(reqs, state, { committed, sliceText });
  if (args.json) console.log(JSON.stringify(r, null, 2));
  else {
    for (const e of r.errors) console.log(`ERROR   ${e}`);
    for (const w of r.warnings) console.log(`WARNING ${w}`);
    for (const [slice, counts] of Object.entries(r.summary)) console.log(`${slice}: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}`);
    console.log(r.errors.length ? `FAILED with ${r.errors.length} error(s)` : 'OK');
  }
  process.exit(r.errors.length ? 1 : 0);
}
