/**
 * Requirements registry checks (master §13, §19, §40), shared by check-state.mjs and requirements-audit.mjs.
 * Pure functions: callers pass in the registry, earlier committed versions and a file-existence check.
 */
import { ACCEPTED_STATES, LEGAL_STATES, REQ_FAMILIES, REQ_STATUSES, SLICES } from './lib.mjs';

export const REQ_ID_RE = new RegExp(`^(${REQ_FAMILIES.join('|')})-\\d{3}$`);
export const REQ_TOKEN_RE = new RegExp(`\\b(?:${REQ_FAMILIES.join('|')})-\\d{3}\\b`, 'g');
const CLOSED = ['GREEN', 'DEFERRED', 'SUPERSEDED'];
const BEFORE_TASKS = ['BOOTSTRAP', 'BASELINE_VERIFY', 'SLICE_DISCOVERY', 'PLAN_LOCK'];

/**
 * Schema and append-only checks. `committed` is a list of earlier registry versions (HEAD, the last accepted
 * checkpoint): an id that existed in any of them must still exist. `fileExists(rel)` checks GREEN evidence paths.
 */
export function validateRequirements(reqs, committed = [], fileExists = () => true) {
  const errors = [];
  const warnings = [];
  const list = reqs?.requirements;
  if (!Array.isArray(list)) return { errors: ['REQUIREMENTS.json has no requirements array'], warnings };
  const seen = new Set();
  for (const r of list) {
    const where = `requirement ${r?.id ?? '(no id)'}`;
    if (!REQ_ID_RE.test(r?.id ?? '')) errors.push(`${where}: id must be FAMILY-NNN with a master §40 family`);
    if (seen.has(r?.id)) errors.push(`${where}: duplicate id`);
    seen.add(r?.id);
    if (r?.slice !== 'ALL' && !SLICES.includes(r?.slice)) errors.push(`${where}: unknown slice ${r?.slice}`);
    if (!REQ_STATUSES.includes(r?.status)) errors.push(`${where}: unknown status ${r?.status}`);
    for (const k of ['source', 'description']) if (typeof r?.[k] !== 'string' || !r[k].trim()) errors.push(`${where}: missing ${k}`);
    for (const k of ['acceptance', 'tasks', 'tests', 'evidence']) if (!Array.isArray(r?.[k])) errors.push(`${where}: ${k} must be a list`);
    if (Array.isArray(r?.acceptance) && !r.acceptance.length) errors.push(`${where}: needs at least one acceptance criterion (master §40)`);
    if (Array.isArray(r?.tests) && !r.tests.length && !['DEFERRED', 'SUPERSEDED'].includes(r?.status)) errors.push(`${where}: names no test`);
    if (r?.status === 'GREEN') {
      if (!(r.evidence?.length && r.tests?.length)) errors.push(`${where}: GREEN without tests and evidence`);
      for (const e of r.evidence ?? []) if (!fileExists(String(e).split(' ')[0])) errors.push(`${where}: GREEN evidence ${e} does not exist`);
    }
    if (['DEFERRED', 'SUPERSEDED'].includes(r?.status) && !/ADR-\d{4}/.test(String(r.decision ?? ''))) errors.push(`${where}: ${r.status} needs a decision citing an ADR`);
    if (r?.status === 'BLOCKED' && !r.blockedBy) errors.push(`${where}: BLOCKED needs blockedBy`);
  }
  for (const version of committed) {
    for (const old of version?.requirements ?? []) {
      if (old?.id && !seen.has(old.id)) errors.push(`requirement ${old.id} was deleted; mark it SUPERSEDED with an ADR instead (ids are append-only)`);
    }
  }
  return { errors, warnings };
}

/** Umbrella ids a requirement names in its source ("umbrella NAV-001"). */
export const umbrellaOf = (r) => [...String(r.source ?? '').matchAll(/umbrella ((?:[A-Z]+)-\d{3})/g)].map((m) => m[1]);

/**
 * Traceability audit (master §41 requirements-audit): tasks after PLAN_LOCK, closed requirements in accepted slices,
 * known ids in the slice contract, and umbrella requirements GREEN only when every child is closed.
 */
export function auditRequirements(reqs, state, { committed = [], sliceText = '', fileExists = () => true } = {}) {
  const { errors, warnings } = validateRequirements(reqs, committed, fileExists);
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
    if (idx >= 0 && idx < current && !CLOSED.includes(r.status)) errors.push(`${r.id} belongs to accepted slice ${r.slice} but is ${r.status}`);
  }
  const byId = new Map(list.map((r) => [r.id, r]));
  for (const r of list) {
    if (r.status !== 'GREEN') continue;
    const open = list.filter((c) => umbrellaOf(c).includes(r.id) && !CLOSED.includes(c.status));
    if (open.length) errors.push(`umbrella ${r.id} is GREEN while ${open.map((c) => c.id).join(', ')} are still open`);
  }
  for (const id of new Set(sliceText.match(REQ_TOKEN_RE) ?? [])) {
    if (!byId.has(id)) errors.push(`CURRENT_SLICE.md names unknown requirement ${id}`);
  }
  const summary = {};
  for (const r of list) {
    summary[r.slice] ??= {};
    summary[r.slice][r.status] = (summary[r.slice][r.status] ?? 0) + 1;
  }
  return { errors, warnings, summary };
}
