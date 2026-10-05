/**
 * Shared helpers for the agent harness scripts (docs/agent). Node built-ins only (master §41).
 * The vocabularies below are the single machine-readable copy of the ones defined in
 * docs/agent/AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md; keep the two in step.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const PATHS = {
  state: 'docs/agent/STATE.json',
  ledger: 'docs/agent/LEDGER.jsonl',
  requirements: 'docs/agent/REQUIREMENTS.json',
  currentSlice: 'docs/agent/CURRENT_SLICE.md',
  handoff: 'docs/agent/HANDOFF.md',
  designRegistry: 'docs/agent/design/DESIGN_REGISTRY.json',
  decisions: 'docs/agent/decisions',
  evidence: 'docs/agent/evidence',
  kickoff: 'docs/agent/prompts/KICKOFF.md',
  stopFile: 'docs/agent/STOP',
};

/** Legal machine states (master §11). */
export const LEGAL_STATES = [
  'BOOTSTRAP',
  'BASELINE_VERIFY',
  'SLICE_DISCOVERY',
  'PLAN_LOCK',
  'IMPLEMENT',
  'TARGETED_VERIFY',
  'FULL_VERIFY',
  'BROWSER_QA',
  'SPECIALIST_REVIEW',
  'ADVERSARIAL_REVIEW',
  'REPAIR',
  'ACCEPT',
  'CHECKPOINT',
  'COMPACT',
  'HANDOFF',
  'NEXT_SLICE',
  'MULTIPLAYER_READINESS_GATE',
  'OWNER_GATE',
  'BLOCKED_MANUAL_REVIEW',
  'COMPLETE_LOCAL',
];

/**
 * Legal transitions (docs/agent/OPERATIONS.md §4). Any state may also move to OWNER_GATE. Leaving OWNER_GATE or
 * BLOCKED_MANUAL_REVIEW needs a recorded owner decision (an ADR reference in the event's `decisions`).
 */
export const TRANSITIONS = {
  BOOTSTRAP: ['BASELINE_VERIFY'],
  BASELINE_VERIFY: ['SLICE_DISCOVERY'],
  SLICE_DISCOVERY: ['PLAN_LOCK'],
  PLAN_LOCK: ['IMPLEMENT'],
  IMPLEMENT: ['TARGETED_VERIFY'],
  TARGETED_VERIFY: ['IMPLEMENT', 'FULL_VERIFY', 'REPAIR'],
  FULL_VERIFY: ['BROWSER_QA', 'SPECIALIST_REVIEW', 'ADVERSARIAL_REVIEW', 'REPAIR'],
  BROWSER_QA: ['SPECIALIST_REVIEW', 'ADVERSARIAL_REVIEW', 'REPAIR'],
  SPECIALIST_REVIEW: ['ADVERSARIAL_REVIEW', 'REPAIR'],
  ADVERSARIAL_REVIEW: ['ACCEPT', 'REPAIR'],
  REPAIR: ['TARGETED_VERIFY', 'FULL_VERIFY', 'BROWSER_QA', 'SPECIALIST_REVIEW', 'ADVERSARIAL_REVIEW', 'IMPLEMENT', 'BLOCKED_MANUAL_REVIEW'],
  ACCEPT: ['CHECKPOINT'],
  CHECKPOINT: ['COMPACT'],
  COMPACT: ['HANDOFF'],
  HANDOFF: ['NEXT_SLICE', 'MULTIPLAYER_READINESS_GATE'],
  NEXT_SLICE: ['BOOTSTRAP'],
  MULTIPLAYER_READINESS_GATE: ['OWNER_GATE'],
  OWNER_GATE: null, // filled below: back to any state, with a decision
  BLOCKED_MANUAL_REVIEW: ['SLICE_DISCOVERY', 'IMPLEMENT', 'REPAIR'],
  COMPLETE_LOCAL: [],
};

/** States that can be left only with a recorded owner decision. */
export const DECISION_EXITS = ['OWNER_GATE', 'BLOCKED_MANUAL_REVIEW'];

/** Repair limits per defect (docs/agent/OPERATIONS.md §5). */
export const REPAIR_LIMITS = { distinctStrategies: 3, totalAttempts: 5 };

/** States in which no session may continue on its own. */
export const STOP_STATES = ['OWNER_GATE', 'BLOCKED_MANUAL_REVIEW', 'COMPLETE_LOCAL'];

/** States that claim the current slice has been accepted. */
export const ACCEPTED_STATES = ['ACCEPT', 'CHECKPOINT', 'COMPACT', 'HANDOFF', 'NEXT_SLICE', 'MULTIPLAYER_READINESS_GATE', 'COMPLETE_LOCAL'];

export const SLICES = ['S0', 'S1', 'S2', 'S3', 'S4'];

/** Gate values (master §26 verdicts plus bookkeeping values). */
export const GATE_VALUES = ['PENDING', 'RUNNING', 'GREEN', 'YELLOW', 'RED', 'NOT_YET_REQUIRED', 'NOT_APPLICABLE'];

/** The command whose recorded exit code 0 proves each objective gate. */
export const GATE_COMMANDS = {
  typecheck: 'npm run typecheck',
  unit: 'npm test',
  build: 'npm run build',
  e2e: 'npm run e2e',
  diffCheck: 'node scripts/agent/diff-check.mjs',
  harnessTests: "node --test 'scripts/agent/*.test.mjs'",
  requirementsAudit: 'node scripts/agent/requirements-audit.mjs',
  testInventory: 'node scripts/agent/test-inventory.mjs',
  protectedFiles: 'node scripts/agent/protect.mjs',
};

/** Requirement statuses (docs/agent/REQUIREMENTS.json). */
export const REQ_STATUSES = ['PENDING', 'IN_PROGRESS', 'GREEN', 'YELLOW', 'RED', 'ACTIVE', 'BLOCKED', 'DEFERRED', 'SUPERSEDED'];

/** Requirement id families (master §40). */
export const REQ_FAMILIES = ['CONST', 'DES', 'NAV', 'GEN', 'MKT', 'AUTO', 'NOTIFY', 'PROD', 'SOC', 'PLAT', 'ACC', 'PERF', 'PERSIST', 'HARNESS', 'REL'];

/** Design registry statuses (docs/agent/design/DESIGN_INTAKE.md). */
export const DESIGN_STATUSES = ['PENDING_OWNER_DESIGN', 'RECEIVED', 'UNDER_REVIEW', 'APPROVED', 'SUPERSEDED', 'REJECTED'];

TRANSITIONS.OWNER_GATE = LEGAL_STATES.filter((s) => s !== 'OWNER_GATE');

/** True when `from → to` is in the transition table (any state may go to OWNER_GATE). */
export function isLegalTransition(from, to) {
  if (to === 'OWNER_GATE') return LEGAL_STATES.includes(from);
  return (TRANSITIONS[from] ?? []).includes(to);
}

/** Ledger event kinds. A 'transition' must follow TRANSITIONS; a 'repair' names its defect in `defect`. */
export const EVENT_KINDS = ['transition', 'repair', 'evidence', 'review', 'decision', 'owner-decision', 'session-start', 'session-end', 'note'];

export const abs = (rel) => join(ROOT, rel);
export const exists = (rel) => existsSync(abs(rel));
export const readText = (rel) => readFileSync(abs(rel), 'utf8');
export const readJson = (rel) => JSON.parse(readText(rel));

/** Write JSON through a temp file and a rename, so a crash never leaves half a file. */
export function writeJson(rel, value) {
  const p = abs(rel);
  const tmp = `${p}.tmp-${process.pid}`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(tmp, p);
}

export function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export function gitOk(...args) {
  try {
    git(...args);
    return true;
  } catch {
    return false;
  }
}

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export const nowIso = () => new Date().toISOString();

/** The Claude Code session running this script (null outside Claude Code). Used to prove fresh-context rollovers. */
export const currentSession = () => process.env.CLAUDE_CODE_SESSION_ID ?? null;

/** Parse LEDGER.jsonl text. Blank lines are errors too: the ledger is one JSON object per line. */
export function parseLedger(text) {
  const events = [];
  const errors = [];
  const lines = text.split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  lines.forEach((line, i) => {
    try {
      events.push(JSON.parse(line));
    } catch {
      errors.push(`LEDGER.jsonl line ${i + 1} is not valid JSON`);
    }
  });
  return { events, errors };
}

/** Returns a list of problems with one ledger event (empty when valid). */
export function validateEvent(e) {
  const problems = [];
  if (!e || typeof e !== 'object' || Array.isArray(e)) return ['event is not an object'];
  for (const k of ['timestamp', 'kind', 'actor', 'slice', 'task', 'result']) {
    if (typeof e[k] !== 'string' || !e[k].trim()) problems.push(`missing ${k}`);
  }
  if (typeof e.timestamp === 'string' && Number.isNaN(Date.parse(e.timestamp))) problems.push('timestamp is not a date');
  if (e.kind && !EVENT_KINDS.includes(e.kind)) problems.push(`unknown kind ${e.kind}`);
  if (e.slice && e.slice !== 'ALL' && !SLICES.includes(e.slice)) problems.push(`unknown slice ${e.slice}`);
  for (const k of ['fromState', 'toState']) {
    if (e[k] != null && !LEGAL_STATES.includes(e[k])) problems.push(`${k} ${e[k]} is not a legal state`);
  }
  if (e.kind === 'transition') {
    if (!e.fromState || !e.toState) problems.push('a transition needs fromState and toState');
    else if (LEGAL_STATES.includes(e.fromState) && LEGAL_STATES.includes(e.toState)) {
      if (!isLegalTransition(e.fromState, e.toState)) problems.push(`${e.fromState} → ${e.toState} is not a legal transition (OPERATIONS.md §4)`);
      if (DECISION_EXITS.includes(e.fromState) && !e.decisions?.length) problems.push(`leaving ${e.fromState} needs a recorded decision in "decisions"`);
    }
  }
  if (e.kind === 'repair' && (typeof e.defect !== 'string' || !e.defect.trim())) problems.push('a repair event needs its defect id in "defect"');
  for (const k of ['evidence', 'decisions']) {
    if (e[k] != null && (!Array.isArray(e[k]) || e[k].some((x) => typeof x !== 'string'))) problems.push(`${k} must be a list of strings`);
  }
  return problems;
}

/**
 * Append one event to LEDGER.jsonl (append-only: never rewrites a line). Fills timestamp and head.
 * Throws when the event is invalid or the existing ledger doesn't end with a newline.
 */
export function appendEvent(event) {
  let head = null;
  try {
    head = git('rev-parse', 'HEAD');
  } catch {
    /* not a git checkout */
  }
  const e = { timestamp: nowIso(), head, session: currentSession(), evidence: [], decisions: [], ...event };
  const problems = validateEvent(e);
  if (problems.length) throw new Error(`invalid ledger event: ${problems.join('; ')}`);
  const p = abs(PATHS.ledger);
  const current = existsSync(p) ? readFileSync(p, 'utf8') : '';
  if (current.length && !current.endsWith('\n')) throw new Error('LEDGER.jsonl does not end with a newline; refusing to append');
  appendFileSync(p, `${JSON.stringify(e)}\n`);
  return e;
}

/** Simple --flag value / --flag parser. Repeated flags collect into arrays. */
export function parseArgs(argv, booleans = []) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      out._.push(a);
      continue;
    }
    const eq = a.indexOf('=');
    const key = (eq > 0 ? a.slice(2, eq) : a.slice(2)).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    let value;
    if (eq > 0) value = a.slice(eq + 1);
    else if (booleans.includes(key)) value = true;
    else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) value = argv[++i];
    else value = true;
    if (key in out) out[key] = [].concat(out[key], value);
    else out[key] = value;
  }
  return out;
}
