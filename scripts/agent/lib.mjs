/**
 * Shared helpers for the agent harness scripts (docs/agent). Node built-ins only (master §41).
 * The vocabularies below are the single machine-readable copy of the ones defined in
 * docs/agent/AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md and docs/agent/OPERATIONS.md; keep them in step.
 *
 * What these checks can and can't do: they catch accidental and single-step violations (a gate marked GREEN by hand,
 * an illegal transition, an edited log, a rewritten ledger line, a deleted requirement). An agent with write access to
 * every file could still forge several files at once; that is visible in Git history, and independent reviewers
 * re-run the gates themselves instead of trusting the manifest (OPERATIONS.md §7).
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
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
  decisionIndex: 'docs/agent/decisions/INDEX.md',
  evidence: 'docs/agent/evidence',
  kickoff: 'docs/agent/prompts/KICKOFF.md',
  protected: 'docs/agent/PROTECTED.json',
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
 * Legal transitions (docs/agent/OPERATIONS.md §4). Any state may also move to OWNER_GATE. OWNER_GATE leaves only to
 * its recorded resume state or COMPLETE_LOCAL, and BLOCKED_MANUAL_REVIEW only to the listed states, both with a
 * committed ADR in `decisions`. NEXT_SLICE leads to MULTIPLAYER_READINESS_GATE only once S4 is accepted, and always in
 * a new session (checkTransition).
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
  HANDOFF: ['NEXT_SLICE'],
  NEXT_SLICE: ['BOOTSTRAP', 'MULTIPLAYER_READINESS_GATE'],
  MULTIPLAYER_READINESS_GATE: ['OWNER_GATE'],
  OWNER_GATE: [], // contextual: resumeState or COMPLETE_LOCAL (checkTransition)
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

/** Accepted states after the checkpoint commit exists. */
export const POST_CHECKPOINT_STATES = ['CHECKPOINT', 'COMPACT', 'HANDOFF', 'NEXT_SLICE', 'MULTIPLAYER_READINESS_GATE', 'COMPLETE_LOCAL'];

export const SLICES = ['S0', 'S1', 'S2', 'S3', 'S4'];

/** Gate values (master §26 verdicts plus bookkeeping values). */
export const GATE_VALUES = ['PENDING', 'RUNNING', 'GREEN', 'YELLOW', 'RED', 'NOT_YET_REQUIRED', 'NOT_APPLICABLE'];

/** The command whose recorded exit code 0 proves each objective gate. Every key is required in STATE.gates. */
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

/** Gates that may be NOT_APPLICABLE without a waiver; e2e needs an owner ADR in STATE.gateWaivers. */
export const WAIVABLE_GATES = ['browserQa'];

/** Requirement statuses (docs/agent/REQUIREMENTS.json). */
export const REQ_STATUSES = ['PENDING', 'IN_PROGRESS', 'GREEN', 'YELLOW', 'RED', 'ACTIVE', 'BLOCKED', 'DEFERRED', 'SUPERSEDED'];

/** Requirement id families (master §40). */
export const REQ_FAMILIES = ['CONST', 'DES', 'NAV', 'GEN', 'MKT', 'AUTO', 'NOTIFY', 'PROD', 'SOC', 'PLAT', 'ACC', 'PERF', 'PERSIST', 'HARNESS', 'REL'];

/** Design registry statuses (docs/agent/design/DESIGN_INTAKE.md). */
export const DESIGN_STATUSES = ['PENDING_OWNER_DESIGN', 'RECEIVED', 'UNDER_REVIEW', 'APPROVED', 'SUPERSEDED', 'REJECTED'];

/** Ledger event kinds. A 'transition' must follow TRANSITIONS; a 'repair' names its defect in `defect`. */
export const EVENT_KINDS = ['transition', 'repair', 'evidence', 'review', 'decision', 'owner-decision', 'session-start', 'session-end', 'note'];

export const ADR_ID_RE = /^ADR-\d{4}$/;

/** True when `from → to` is in the static table (any state may go to OWNER_GATE; OWNER_GATE exits are contextual). */
export function isLegalTransition(from, to) {
  if (!LEGAL_STATES.includes(from) || !LEGAL_STATES.includes(to)) return false;
  if (to === 'OWNER_GATE') return from !== 'OWNER_GATE';
  if (from === 'OWNER_GATE') return true; // narrowed by checkTransition to resumeState or COMPLETE_LOCAL
  return (TRANSITIONS[from] ?? []).includes(to);
}

/**
 * Full check of a transition against the current state. `ctx`: { state, adrExists(id) → bool, s4Accepted, session,
 * closingSession }. `session` is the Claude Code session recording the transition and `closingSession` the one that
 * recorded the last → NEXT_SLICE transition; when `session` is passed (record-event.mjs always does), leaving
 * NEXT_SLICE needs a known session that differs from the closing one.
 * Returns problems (empty when the transition may be recorded).
 */
export function checkTransition({ from, to, slice, decisions = [], reason, resume }, { state, adrExists = () => true, s4Accepted = false, session, closingSession = null }) {
  const problems = [];
  if (!isLegalTransition(from, to)) problems.push(`${from} → ${to} is not a legal transition (OPERATIONS.md §4)`);
  if (state) {
    if (from !== state.machineState) problems.push(`the transition starts from ${from}, but STATE.machineState is ${state.machineState}`);
    if (slice !== state.currentSlice) problems.push(`the transition names slice ${slice}, but STATE.currentSlice is ${state.currentSlice}`);
    if (from === 'OWNER_GATE' && to !== 'COMPLETE_LOCAL' && to !== state.resumeState) problems.push(`OWNER_GATE may only resume at ${state.resumeState} (STATE.resumeState) or close at COMPLETE_LOCAL`);
  }
  if (to === 'OWNER_GATE') {
    if (!reason) problems.push('entering OWNER_GATE needs --reason (OPERATIONS.md §2)');
    if (!resume || !LEGAL_STATES.includes(resume) || STOP_STATES.includes(resume)) problems.push('entering OWNER_GATE needs --resume <state to continue at>');
  }
  if (DECISION_EXITS.includes(from)) {
    if (!decisions.length) problems.push(`leaving ${from} needs a recorded decision (--decision ADR-NNNN)`);
    for (const d of decisions) if (!ADR_ID_RE.test(d) || !adrExists(d)) problems.push(`decision ${d} is not a committed ADR listed in decisions/INDEX.md`);
  }
  if (from === 'NEXT_SLICE' && to === 'MULTIPLAYER_READINESS_GATE' && !(state?.currentSlice === 'S4' && s4Accepted)) problems.push('the readiness gate follows only an accepted S4');
  if (from === 'NEXT_SLICE' && to === 'BOOTSTRAP' && state?.currentSlice === 'S4' && s4Accepted) problems.push('S4 is accepted: the next step is MULTIPLAYER_READINESS_GATE, not another slice');
  if (from === 'NEXT_SLICE' && session !== undefined) {
    if (!session || !closingSession) problems.push('leaving NEXT_SLICE needs the Claude Code session ids of this session and of the one that closed the previous slice (CLAUDE_CODE_SESSION_ID), to prove the context was refreshed');
    else if (session === closingSession) problems.push(`session ${session} also closed the previous slice: the next slice and the readiness gate start in a new session (master §3.2)`);
  }
  return problems;
}

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

/** Contents of `rel` at commit `ref`, or null when it doesn't exist there. Trailing newline preserved. */
export function showAt(ref, rel) {
  try {
    return execFileSync('git', ['show', `${ref}:${rel}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    return null;
  }
}

/**
 * Every committed version of `rel` from commit `anchor` (inclusive; the whole history when null) up to HEAD, oldest
 * first, following first parents. Append-only checks compare the working copy with each of them, so a rewrite that
 * was committed in the middle of a slice is still caught.
 */
export function committedVersions(rel, anchor) {
  let log = [];
  try {
    log = git('log', '--first-parent', '--reverse', '--format=%H', anchor ? `${anchor}..HEAD` : 'HEAD', '--', rel).split('\n').filter(Boolean);
  } catch {
    /* no commits yet, or the anchor isn't a commit (check-state reports that separately) */
  }
  const texts = [...(anchor ? [anchor] : []), ...log, 'HEAD'].map((ref) => showAt(ref, rel)).filter((t) => t != null);
  return [...new Set(texts)];
}

/** True when `rel` is tracked at HEAD (committed). */
export const isCommitted = (rel) => gitOk('cat-file', '-e', `HEAD:${rel}`);

/**
 * Path of a committed ADR (`ADR-NNNN-*.md`) that is listed in decisions/INDEX.md, or null. Decisions and approvals
 * may only cite such ADRs.
 */
export function findAdr(id) {
  if (!ADR_ID_RE.test(id)) return null;
  let index = '';
  try {
    index = readText(PATHS.decisionIndex);
  } catch {
    return null;
  }
  if (!index.includes(`[${id}]`)) return null;
  const file = (existsSync(abs(PATHS.decisions)) ? readdirSync(abs(PATHS.decisions)) : []).find((f) => f.startsWith(`${id}-`) && f.endsWith('.md'));
  if (!file) return null;
  const rel = `${PATHS.decisions}/${file}`;
  return isCommitted(rel) ? rel : null;
}

/** An approval reference (STATE.remoteApproval and similar) must be a committed, indexed ADR path or id. */
export function approvalIsAdr(ref) {
  if (typeof ref !== 'string') return false;
  const id = (ref.match(/ADR-\d{4}/) ?? [])[0];
  if (!id) return false;
  const path = findAdr(id);
  return !!path && (ref === id || ref === path);
}

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export const sha256Text = (text) => createHash('sha256').update(text).digest('hex');

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

/** Returns a list of problems with one ledger event on its own (empty when valid). */
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
    else if (!isLegalTransition(e.fromState, e.toState)) problems.push(`${e.fromState} → ${e.toState} is not a legal transition (OPERATIONS.md §4)`);
    else if (DECISION_EXITS.includes(e.fromState) && !(e.decisions ?? []).some((d) => ADR_ID_RE.test(d))) problems.push(`leaving ${e.fromState} needs an ADR in "decisions"`);
  }
  if (e.kind === 'repair') {
    if (typeof e.defect !== 'string' || !e.defect.trim()) problems.push('a repair event needs its defect id in "defect"');
    if (!e.resolved && (typeof e.strategy !== 'string' || !e.strategy.trim())) problems.push('a repair attempt needs a one-line "strategy"');
  }
  for (const k of ['evidence', 'decisions']) {
    if (e[k] != null && (!Array.isArray(e[k]) || e[k].some((x) => typeof x !== 'string'))) problems.push(`${k} must be a list of strings`);
  }
  return problems;
}

/**
 * Append one event to LEDGER.jsonl (append-only: never rewrites a line). Fills timestamp, head and session.
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

/**
 * --flag value / --flag=value / --flag parser. Repeated flags collect into arrays. With `allowed`, an unknown flag
 * throws (a mistyped flag must never be ignored: `relaunch.mjs --self-tset` would otherwise start real sessions).
 */
export function parseArgs(argv, booleans = [], allowed = null) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      out._.push(a);
      continue;
    }
    const eq = a.indexOf('=');
    const key = (eq > 0 ? a.slice(2, eq) : a.slice(2)).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (allowed && !allowed.includes(key) && !booleans.includes(key)) throw new Error(`unknown option --${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`);
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

/** A positive integer option (throws otherwise). */
export function positiveInt(value, name, fallback) {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw new Error(`--${name} must be a whole number of at least 1 (got ${value})`);
  return n;
}

/** A positive number option (throws otherwise). */
export function positiveNumber(value, name, fallback) {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`--${name} must be a positive number (got ${value})`);
  return n;
}
