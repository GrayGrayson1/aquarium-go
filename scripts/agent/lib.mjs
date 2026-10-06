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
import { appendFileSync, existsSync, readFileSync, readdirSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
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
  adrTemplate: 'docs/agent/templates/ADR_TEMPLATE.md',
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
 * Legal transitions (docs/agent/OPERATIONS.md §4). Any state may also move to OWNER_GATE, resuming later at the state it
 * was entered from. OWNER_GATE leaves only to that resume state or COMPLETE_LOCAL, and BLOCKED_MANUAL_REVIEW only to the
 * listed states, both with the owner's approval in `decisions`: an ADR that records the owner's words and was
 * committed after the stop state was entered (ownerApprovalProblems). NEXT_SLICE leads to MULTIPLAYER_READINESS_GATE
 * only once S4 is accepted, and always in a new session (checkTransition).
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

/** The slice after `slice`, or null after S4 (or for an unknown slice). */
export function nextSlice(slice) {
  const i = SLICES.indexOf(slice);
  return i >= 0 && i < SLICES.length - 1 ? SLICES[i + 1] : null;
}

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
 * Full check of a transition against the current state and the ledger. `ctx`: { state, ownerApproval(id, { notAt }) →
 * problems, s4Accepted, session, closingSession, lastTransition }.
 * - `ownerApproval` judges each decision cited for leaving OWNER_GATE or BLOCKED_MANUAL_REVIEW (record-event.mjs passes
 *   ownerApprovalProblems); `notAt` is the commit recorded when that stop state was entered, at which the ADR may not
 *   exist yet.
 * - `lastTransition` is the last transition in the ledger (null when there is none; leave it undefined to skip the
 *   ledger checks): the slice may change only at NEXT_SLICE → BOOTSTRAP, to the next slice, and OWNER_GATE resumes only
 *   at the state its entry recorded.
 * - `session` is the Claude Code session recording the transition and `closingSession` the one that recorded the last
 *   → NEXT_SLICE transition; when `session` is passed (record-event.mjs always does), entering NEXT_SLICE needs a known
 *   session (so the next one can prove it is fresh), and leaving it needs a known session that differs from the
 *   closing one.
 * Returns problems (empty when the transition may be recorded).
 */
export function checkTransition({ from, to, slice, decisions = [], reason, resume }, { state, ownerApproval = () => [], s4Accepted = false, session, closingSession = null, lastTransition } = {}) {
  const problems = [];
  if (!isLegalTransition(from, to)) problems.push(`${from} → ${to} is not a legal transition (OPERATIONS.md §4)`);
  if (state) {
    if (from !== state.machineState) problems.push(`the transition starts from ${from}, but STATE.machineState is ${state.machineState}`);
    if (slice !== state.currentSlice) problems.push(`the transition names slice ${slice}, but STATE.currentSlice is ${state.currentSlice}`);
    if (from === 'OWNER_GATE' && to !== 'COMPLETE_LOCAL' && to !== state.resumeState) problems.push(`OWNER_GATE may only resume at ${state.resumeState} (STATE.resumeState) or close at COMPLETE_LOCAL`);
  }
  if (lastTransition !== undefined) {
    if (lastTransition === null) {
      if (slice !== SLICES[0]) problems.push(`the first transition belongs to ${SLICES[0]}, not ${slice}`);
    } else if (from === 'NEXT_SLICE' && to === 'BOOTSTRAP') {
      const next = nextSlice(lastTransition.slice);
      if (slice !== next) problems.push(`NEXT_SLICE → BOOTSTRAP starts ${next ?? 'no slice'} (the slice after ${lastTransition.slice}, which recorded the last transition), not ${slice}`);
    } else if (slice !== lastTransition.slice) {
      problems.push(`the last transition was recorded in ${lastTransition.slice}, not ${slice}: the slice changes only at NEXT_SLICE → BOOTSTRAP, to the next slice`);
    }
    if (from === 'OWNER_GATE' && lastTransition?.toState === 'OWNER_GATE' && to !== 'COMPLETE_LOCAL' && to !== lastTransition.resume) {
      problems.push(`OWNER_GATE was entered with resume ${lastTransition.resume ?? '(none)'}: it may only resume there or close at COMPLETE_LOCAL`);
    }
  }
  if (to === 'OWNER_GATE') {
    if (!reason) problems.push('entering OWNER_GATE needs --reason (OPERATIONS.md §2)');
    if (!resume || !LEGAL_STATES.includes(resume) || STOP_STATES.includes(resume)) problems.push('entering OWNER_GATE needs --resume <state to continue at>');
    else if (resume !== from) problems.push(`OWNER_GATE resumes only at the state it is entered from: --resume ${from}, not ${resume}`);
  }
  if (DECISION_EXITS.includes(from)) {
    if (!decisions.length) problems.push(`leaving ${from} needs a recorded decision (--decision ADR-NNNN)`);
    const entry = lastTransition?.toState === from ? lastTransition : null;
    if (entry && !entry.head) problems.push(`the transition into ${from} recorded no commit (head), so no decision can be shown to postdate it`);
    for (const d of decisions) {
      if (!ADR_ID_RE.test(d)) problems.push(`decision ${d} is not an ADR id (ADR-NNNN)`);
      else for (const p of ownerApproval(d, { notAt: entry?.head ?? null })) problems.push(`decision ${p}`);
    }
  }
  if (from === 'NEXT_SLICE' && to === 'MULTIPLAYER_READINESS_GATE' && !(state?.currentSlice === 'S4' && s4Accepted)) problems.push('the readiness gate follows only an accepted S4');
  if (from === 'NEXT_SLICE' && to === 'BOOTSTRAP' && state?.currentSlice === 'S4' && s4Accepted) problems.push('S4 is accepted: the next step is MULTIPLAYER_READINESS_GATE, not another slice');
  if (to === 'NEXT_SLICE' && session !== undefined && !session) problems.push('entering NEXT_SLICE needs this session\'s id (CLAUDE_CODE_SESSION_ID): without it the next session can\'t prove it is a fresh one, and leaving NEXT_SLICE is refused');
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

/** The committed, indexed ADR an approval reference names: its id (ADR-NNNN) or exactly its path. Null otherwise. */
export function resolveAdrRef(ref) {
  if (typeof ref !== 'string') return null;
  const id = (ref.match(/ADR-\d{4}/) ?? [])[0];
  if (!id) return null;
  const path = findAdr(id);
  return path && (ref === id || ref === path) ? path : null;
}

/** An approval reference (STATE.remoteApproval and similar) must be a committed, indexed ADR path or id. */
export const approvalIsAdr = (ref) => !!resolveAdrRef(ref);

/** The non-empty, trimmed lines of a text's "## Owner approval" section, or null when it has none. */
export function ownerApprovalLines(text) {
  const lines = String(text).split('\n');
  const start = lines.findIndex((l) => /^## Owner approval\s*$/.test(l));
  if (start < 0) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^## /.test(l));
  return (end < 0 ? rest : rest.slice(0, end)).map((l) => l.trim()).filter(Boolean);
}

/**
 * True when the ADR text has an "## Owner approval" section with real content. Lines copied unchanged from the ADR
 * template's own section (its instructions) don't count, and a section that starts "Pending", "TBD" or "To be
 * recorded" is no approval.
 */
export function hasOwnerApproval(adrText, templateText = exists(PATHS.adrTemplate) ? readText(PATHS.adrTemplate) : '') {
  const lines = ownerApprovalLines(adrText);
  if (!lines) return false;
  const placeholder = new Set(ownerApprovalLines(templateText) ?? []);
  const own = lines.filter((l) => !placeholder.has(l));
  if (/^(pending|tbd|todo|to be (recorded|added|confirmed))\b/i.test((own[0] ?? '').replace(/[*_>`]/g, '').trim())) return false;
  return own.join('').replace(/\s+/g, '').length >= 40;
}

/** The ADR's status word from its "**Status:**" line (Accepted, Proposed, …), or null. */
export function adrStatus(adrText) {
  return String(adrText).match(/^\*\*Status:\*\*\s*([A-Za-z]+)/m)?.[1] ?? null;
}

/** decisions/INDEX.md's "Owner decision" cell for ADR `id` (the row whose first cell links `[id]`), or null. */
export function indexOwnerDecision(indexText, id) {
  const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const rows = String(indexText).split('\n').filter((l) => l.trim().startsWith('|'));
  const header = rows.find((l) => cells(l).some((c) => /^owner decision$/i.test(c)));
  if (!header) return null;
  const col = cells(header).findIndex((c) => /^owner decision$/i.test(c));
  const row = rows.find((l) => cells(l)[0].startsWith(`[${id}]`));
  return row ? cells(row)[col] ?? null : null;
}

/** True when `text` names `name` (a path or an id) whole, not as part of a longer path or id. */
export function namesPath(text, name) {
  const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\w./-])${escaped}(?![\\w/-]|\\.\\w)`).test(String(text));
}

/**
 * Why an ADR's text can't stand as the owner's approval (pure; empty when it can; ADR-0013 decision 3). It must be
 * Accepted and have an "## Owner approval" section with the owner's words (hasOwnerApproval), and it must name every
 * entry of `names` (the owner-only files a protect.mjs --update covers, the defect a repair override lifts, the design
 * an approval approves). `legacy` marks a citation recorded before that convention (LEGACY_LEDGER,
 * LEGACY_DESIGN_APPROVALS): it may cite an ADR without the section if decisions/INDEX.md marks the ADR as an owner
 * decision ("Yes", `indexCell`).
 */
export function approvalTextProblems(adrText, { templateText, indexCell = null, legacy = false, names = [], checkStatus = true } = {}) {
  const problems = [];
  const status = adrStatus(adrText);
  if (checkStatus && status !== 'Accepted') problems.push(`is ${status ?? 'without a **Status:** line'}, not Accepted`);
  if (!hasOwnerApproval(adrText, templateText)) {
    if (!legacy) problems.push('has no "## Owner approval" section with the owner\'s words (the ADR template\'s placeholder and a "Pending" note don\'t count; ADR-0013 decision 3)');
    else if (!/^yes\b/i.test(String(indexCell ?? '').trim())) problems.push(`predates the "## Owner approval" convention, and decisions/INDEX.md doesn't mark it as an owner decision ("Owner decision: ${indexCell ?? 'no row'}")`);
  }
  const unnamed = names.filter((n) => !namesPath(adrText, n));
  if (unnamed.length) problems.push(`doesn't name ${unnamed.join(', ')}, which it would approve`);
  return problems;
}

/**
 * Why `ref` can't stand as the owner's approval (empty when it can). Every script that takes an ADR as the owner's
 * approval asks this: gate waivers, repair overrides, leaving OWNER_GATE or BLOCKED_MANUAL_REVIEW, owner-decision
 * events, design approvals, STATE.remoteApproval and multiplayerApproval, and protected-file updates (PROTECTED.json's
 * approvedBy and the ledger's protect.mjs events; protect.mjs --update applies approvalTextProblems to the committed
 * ADR it resolved). The ADR must be committed and listed in decisions/INDEX.md (`ref` is its id or exact path), and pass
 * approvalTextProblems as committed at HEAD (with the index committed there), so an uncommitted edit of an ADR never
 * counts. `notAt`: a commit at which the ADR may not exist yet (the commit recorded when the stop state it would end
 * was entered), so an older owner ADR can't be cited for a newer decision.
 */
export function ownerApprovalProblems(ref, { legacy = false, names = [], notAt = null } = {}) {
  const path = resolveAdrRef(ref);
  if (!path) return [`${ref} is not a committed ADR listed in decisions/INDEX.md (cite its id ADR-NNNN or its exact path)`];
  const id = path.match(/ADR-\d{4}/)[0];
  const index = showAt('HEAD', PATHS.decisionIndex) ?? '';
  const problems = approvalTextProblems(showAt('HEAD', path) ?? '', { indexCell: indexOwnerDecision(index, id), legacy, names });
  if (notAt && showAt(notAt, path) !== null) problems.push(`already existed at ${notAt.slice(0, 10)}, when the state it would end was entered: the owner's decision is a new ADR`);
  return problems.map((p) => `${id} ${p}`);
}

export const isOwnerApproval = (ref, opts) => ownerApprovalProblems(ref, opts).length === 0;

/**
 * The ledger events recorded before ADR-0013 decision 3 required an "## Owner approval" section: the first 32 lines,
 * exactly as committed at 7afa202 (pinned by their SHA-256, so editing them, or a ledger that doesn't start with them,
 * grants nothing). Their owner-decision events may cite owner ADRs written before the convention (ADR-0001, -0002,
 * -0004, -0005: "Owner decision: Yes" in the index, no section). Every later event needs the section.
 */
export const LEGACY_LEDGER = Object.freeze({ lines: 32, sha256: 'b41fb42706a01184e54be8e077771d20b8f36280f9a894ee722eac2dc6068dec' });

/** How many leading ledger events are LEGACY_LEDGER's (0 unless the ledger starts with exactly those lines). */
export function legacyEventCount(ledgerText) {
  const lines = String(ledgerText).split('\n');
  if (lines.length <= LEGACY_LEDGER.lines) return 0;
  const prefix = `${lines.slice(0, LEGACY_LEDGER.lines).join('\n')}\n`;
  return sha256Text(prefix) === LEGACY_LEDGER.sha256 ? LEGACY_LEDGER.lines : 0;
}

/** Design approvals recorded before ADR-0013 decision 3, pinned by their exact text (DESIGN_REGISTRY.json at 7afa202). */
export const LEGACY_DESIGN_APPROVALS = Object.freeze([
  Object.freeze({ id: 'DESIGN-0.5', approval: 'Owner-approved before the harness was installed: master §7 and ADR-0001 (2026-10-05).' }),
]);

export const isLegacyDesignApproval = (design) => LEGACY_DESIGN_APPROVALS.some((l) => l.id === design?.id && l.approval === design?.approval);

/**
 * Which slice's evidence must hold, and how strictly (pure). `lastTransition` is the last transition in the ledger.
 * next-slice.mjs prepares the next slice while the machine is still at NEXT_SLICE: until the new session records
 * NEXT_SLICE → BOOTSTRAP, the accepted slice is the one that recorded HANDOFF → NEXT_SLICE (`prepared`), its evidence
 * must still hold, and the new slice's fresh gates claim nothing.
 */
export function evidenceScope(s, lastTransition) {
  const current = SLICES.indexOf(s.currentSlice);
  const prepared = s.machineState === 'NEXT_SLICE' && lastTransition?.toState === 'NEXT_SLICE' && current > 0 && SLICES.indexOf(lastTransition.slice) === current - 1;
  return {
    prepared,
    acceptedSlice: prepared ? lastTransition.slice : s.currentSlice,
    accepted: ACCEPTED_STATES.includes(s.machineState) && !prepared,
    postCheckpoint: POST_CHECKPOINT_STATES.includes(s.machineState),
  };
}

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export const sha256Text = (text) => createHash('sha256').update(text).digest('hex');

export const nowIso = () => new Date().toISOString();

/** The Claude Code session running this script (null outside Claude Code). Used to prove fresh-context rollovers. */
export const currentSession = () => process.env.CLAUDE_CODE_SESSION_ID ?? null;

/**
 * True when the module at `moduleUrl` (a script passes its import.meta.url) is the script this process was started
 * with, so a CLI runs its main block only then and not when another script imports it (D-S0-15). Node gives the main
 * module's import.meta.url its real path (symlinks resolved, unless --preserve-symlinks-main) but keeps any symlink in
 * process.argv[1], so comparing the two unresolved made every CLI exit 0 without doing anything whenever it was
 * reached through a symlink: on macOS, everything under os.tmpdir() (/var is a symlink to /private/var). Both
 * sides are compared as real paths. Without an argv[1] (node -e, the REPL), or with one that doesn't resolve, no module
 * is the main one.
 */
export function isMainModule(moduleUrl, argv1 = process.argv[1]) {
  if (!argv1) return false;
  try {
    return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(argv1);
  } catch {
    return false;
  }
}

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
    if (e.fromState === 'ACCEPT' && e.toState === 'CHECKPOINT' && !/^[0-9a-f]{40}$/.test(e.checkpoint ?? '')) problems.push('ACCEPT → CHECKPOINT records the checkpoint commit (its full SHA) in "checkpoint"');
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

/** Dashes that aren't the ASCII hyphen-minus: smart punctuation turns "--" into one of these. */
const TYPOGRAPHIC_DASH_RE = /^[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/;

/**
 * --flag value / --flag=value / --flag parser. Repeated flags collect into arrays. With `allowed` (strict mode), every
 * argument must be a known --option, so a typo is never ignored or read as something else (`relaunch.mjs --self-tset`,
 * `-dry-run`, `—dry-run` or `--dry-run=` would otherwise start real sessions, security-data-2 M1): an unknown option,
 * a positional argument, a single-dash or typographic-dash form, a value on a boolean, an empty `=` value and an option
 * that needs a value but has none all throw.
 */
export function parseArgs(argv, booleans = [], allowed = null) {
  const strict = Array.isArray(allowed);
  const flag = (key) => `--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = String(argv[i]);
    if (!a.startsWith('--')) {
      if (strict) {
        if (TYPOGRAPHIC_DASH_RE.test(a)) throw new Error(`"${a}" starts with a typographic dash, not two ASCII hyphens: options are written --name`);
        if (a.startsWith('-')) throw new Error(`single-dash option "${a}" is not accepted: options are written --name`);
        throw new Error(`unexpected argument "${a}": this script takes only --options`);
      }
      out._.push(a);
      continue;
    }
    const eq = a.indexOf('=');
    const key = (eq > 0 ? a.slice(2, eq) : a.slice(2)).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (strict && !allowed.includes(key) && !booleans.includes(key)) throw new Error(`unknown option ${flag(key)}`);
    let value;
    if (eq > 0) value = a.slice(eq + 1);
    else if (booleans.includes(key)) value = true;
    else if (i + 1 < argv.length && !String(argv[i + 1]).startsWith('--')) value = String(argv[++i]);
    else value = true;
    if (strict) {
      if (eq > 0 && booleans.includes(key)) throw new Error(`${flag(key)} takes no value (got "${a}")`);
      if (eq > 0 && value === '') throw new Error(`${flag(key)}= has an empty value`);
      if (value === true && !booleans.includes(key)) throw new Error(`${flag(key)} needs a value`);
    }
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
