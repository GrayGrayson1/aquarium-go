/**
 * Tests for the agent harness scripts. Run: node --test 'scripts/agent/*.test.mjs'
 * (Node's built-in runner; no dependencies. Vitest doesn't collect these.)
 *
 * Most tests call the scripts' pure functions with hand-made inputs, including the bypasses the S0 reviews found
 * (docs/agent/evidence/S0/reviews: code-architecture-harness-1 H/M/L, security-data-1 SD-n, adversarial-1 F-n and the
 * numbered rows of its bypass table, "#n"). A few read the real repository (code trees, committed versions, ADRs, the
 * context pack) and never write to it. The CLI tests pass only an unknown option, which every script refuses before it
 * reads or writes anything. relaunch.mjs is never run: its decisions are exported and tested here.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { GATE_COMMANDS, PATHS, ROOT, TRANSITIONS, approvalIsAdr, checkTransition, committedVersions, findAdr, git, isLegalTransition, parseArgs, parseLedger, positiveInt, positiveNumber, readText, sha256File, showAt, validateEvent } from './lib.mjs';
import {
  EVIDENCE_DIRS,
  evidenceScope,
  preparedView,
  repairCounts,
  validateEvidenceFiles,
  validateGateEvidence,
  validateLedger,
  validateManifestAppendOnly,
  validateManifestHistory,
  validateRegistry,
  validateRepairs,
  validateState,
  validateStateAgainstLedger,
} from './check-state.mjs';
import { MANDATED_READS, bookkeepingOnlySince, checkAssertion } from './bootstrap-check.mjs';
import { DISABLE_RE, compareInventories, playwrightIds, referenceInventoryPath, skipMarkers, validateTestChanges, vitestIds } from './test-inventory.mjs';
import { ADR_TEMPLATE, OWNER_ONLY, PROTECTED_PATTERNS, adrStatus, compareProtected, hasOwnerApproval, lastRecordedHash, protectedFiles, updateProblems } from './protect.mjs';
import { REQ_ID_RE, REQ_TOKEN_RE, auditRequirements, umbrellaOf, validateRequirements } from './requirements.mjs';
import { committedRegistries } from './requirements-audit.mjs';
import { DENY_RULES, DEPLOY_CONFIG, UNATTENDED_NOTE, alarmsBetween, childEnv, claudeArgs, decide, extractKickoff, parseRelaunchArgs, preflight } from './relaunch.mjs';
import { LOG_LIMIT_BYTES, NON_CODE_PATHS, codeTreeOf, emptyManifest, parseCounts, trimLog } from './evidence.mjs';
import { reportStatesVerdict, reportVerdict, reviewProblems } from './capture-evidence.mjs';
import { parseVerifyArgs, selectGates } from './verify-slice.mjs';
import { buildPack, citedDesignHeadings, designCitations, section } from './context-pack.mjs';
import { END, START, replaceBlock } from './handoff.mjs';
import { MANDATORY_REVIEWERS, nextState } from './next-slice.mjs';
import { buildEvent, stateAfter } from './record-event.mjs';

// ---------------------------------------------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------------------------------------------

const SHA = 'a'.repeat(40);
const ALL_GATES = [...Object.keys(GATE_COMMANDS), 'browserQa', 'independentReview'];
const gatesOf = (value) => Object.fromEntries(ALL_GATES.map((g) => [g, value]));
const baseState = () => ({
  schemaVersion: 2,
  project: 'AquariumGo',
  planningBaselineSha: SHA,
  actualBaselineSha: SHA,
  integrationBranch: 'agent/x',
  remoteMutationAllowed: false,
  remoteApproval: null,
  currentSlice: 'S1',
  currentTask: 'S1-T1',
  machineState: 'IMPLEMENT',
  resumeState: null,
  repairAttempt: 0,
  repairTotalAttempts: 0,
  repairTarget: null,
  lastAcceptedCheckpoint: null,
  contextRolloverRequired: false,
  ownerGateRequired: false,
  ownerGateReason: null,
  multiplayerApproved: false,
  multiplayerApproval: null,
  requiredReviewers: ['code-architecture', 'adversarial'],
  gates: { ...gatesOf('PENDING'), browserQa: 'NOT_YET_REQUIRED' },
});
const acceptedState = (o = {}) => ({ ...baseState(), machineState: 'ACCEPT', gates: { ...gatesOf('GREEN'), browserQa: 'NOT_APPLICABLE' }, ...o });

/** A gate record as runAndRecord writes it, on code tree T. */
const rec = (gate, o = {}) => ({ gate, command: GATE_COMMANDS[gate], exitCode: 0, log: `docs/agent/evidence/S1/logs/${gate}.log`, logSha256: 'h', head: SHA, codeTree: 'T', ...o });
const review = (role, o = {}) => ({ role, verdict: 'GREEN', report: `docs/agent/evidence/S1/reviews/${role}-1.md`, reportSha256: 'h', head: SHA, codeTree: 'T', ...o });
/** A manifest that backs acceptance on `tree`: every objective gate passed, every role reviewed GREEN. */
const greenManifest = (tree = 'T', roles = ['code-architecture', 'adversarial']) => ({
  ...emptyManifest('S1'),
  verdict: 'GREEN',
  commands: Object.keys(GATE_COMMANDS).map((g) => rec(g, { codeTree: tree })),
  reviews: roles.map((r) => review(r, { codeTree: tree })),
});

const event = (o) => ({ timestamp: '2026-10-05T00:00:00Z', kind: 'note', actor: 'orchestrator', slice: 'S1', task: 'S1-T1', result: 'r', evidence: [], decisions: [], ...o });
const transition = (fromState, toState, o = {}) => event({ kind: 'transition', fromState, toState, ...o });
const repair = (defect, o = {}) => event({ kind: 'repair', defect, strategy: 's', ...o });
const lines = (...events) => events.map((e) => `${JSON.stringify(e)}\n`).join('');

const req = (o) => ({ id: 'NAV-001', slice: 'S1', source: 'design §5.2', description: 'tab bar', acceptance: ['five tabs'], tasks: [], tests: ['tests/sim/nav.test.ts'], evidence: [], status: 'PENDING', ...o });

const has = (list, needle) => list.some((x) => x.includes(needle));
const assertHas = (list, needle) => assert.ok(has(list, needle), `expected an entry containing "${needle}" in:\n${list.join('\n')}`);
const assertNone = (list, needle) => assert.ok(!has(list, needle), `expected no entry containing "${needle}" in:\n${list.join('\n')}`);

// ---------------------------------------------------------------------------------------------------------------
// lib.mjs: arguments
// ---------------------------------------------------------------------------------------------------------------

test('args parser handles values, booleans, repeats and kebab-case', () => {
  const a = parseArgs(['--kind', 'note', '--evidence', 'a', '--evidence', 'b', '--dry-run', '--max-sessions=3', 'pos'], ['dryRun']);
  assert.equal(a.kind, 'note');
  assert.deepEqual(a.evidence, ['a', 'b']);
  assert.equal(a.dryRun, true);
  assert.equal(a.maxSessions, '3');
  assert.deepEqual(a._, ['pos']);
});

test('args: with an allowed list, unknown and mistyped options throw (F5)', () => {
  const allowed = ['maxSessions', 'model'];
  assert.throws(() => parseArgs(['--self-test'], ['dryRun'], allowed), /unknown option --self-test/);
  assert.throws(() => parseArgs(['--dry-rn'], ['dryRun'], allowed), /unknown option --dry-rn/);
  assert.throws(() => parseArgs(['--max-session=3'], ['dryRun'], allowed), /unknown option --max-session/);
  assert.deepEqual(parseArgs(['--dry-run', '--max-sessions', '2'], ['dryRun'], allowed), { _: [], dryRun: true, maxSessions: '2' });
  // An empty list allows only the booleans.
  assert.throws(() => parseArgs(['--jsn'], ['json', 'strict'], []), /unknown option --jsn/);
  assert.equal(parseArgs(['--json'], ['json', 'strict'], []).json, true);
});

test('relaunch: unknown or mistyped options are refused, so a typo never starts sessions (F5)', () => {
  for (const argv of [['--self-test'], ['--dryrun'], ['--max-session', '3'], ['--budget', '5'], ['--dry-run', '--force']]) {
    assert.throws(() => parseRelaunchArgs(argv), /unknown option/, argv.join(' '));
  }
  assert.equal(parseRelaunchArgs(['--dry-run']).dryRun, true);
  assert.equal(parseRelaunchArgs(['--max-sessions', '3', '--budget-usd=40']).budgetUsd, '40');
});

test('verify-slice: unknown options are refused instead of running every gate', () => {
  assert.throws(() => parseVerifyArgs(['--gate', 'unit']), /unknown option --gate/);
  assert.throws(() => parseVerifyArgs(['--nostate']), /unknown option/);
  assert.deepEqual(parseVerifyArgs(['--gates', 'unit,typecheck', '--no-state']), { _: [], gates: 'unit,typecheck', noState: true });
});

test('lib: numeric options must be positive, so the session cap and waits stay meaningful (M9)', () => {
  for (const bad of ['six', '0', '-2', '1.5', 'NaN', '']) assert.throws(() => positiveInt(bad, 'max-sessions', 6), /whole number/, bad);
  assert.equal(positiveInt(undefined, 'max-sessions', 6), 6);
  assert.equal(positiveInt('3', 'max-sessions', 6), 3);
  for (const bad of ['x', '0', '-1', 'NaN', 'Infinity']) assert.throws(() => positiveNumber(bad, 'bg-wait-hours', 6), /positive number/, bad);
  assert.equal(positiveNumber('0.5', 'bg-wait-hours', 6), 0.5);
  assert.equal(positiveNumber(undefined, 'bg-wait-hours', 6), 6);
});

test('cli: every script that takes options refuses an unknown one before doing anything', () => {
  // The files these scripts write when they do run: none may change when they refuse.
  const written = [PATHS.state, PATHS.ledger, PATHS.handoff, PATHS.currentSlice, PATHS.protected, `${PATHS.evidence}/S0/manifest.json`, '.agent-runs/CONTEXT_PACK.md'];
  const fingerprint = () => written.map((f) => `${f}:${existsSync(join(ROOT, f)) ? sha256File(join(ROOT, f)) : 'absent'}`).join('\n');
  const before = fingerprint();
  const scripts = {
    'check-state': /unknown option --no-such-option/,
    protect: /unknown option --no-such-option/,
    'record-event': /unknown option --no-such-option/,
    'context-pack': /unknown option --no-such-option/,
    handoff: /unknown option --no-such-option/,
    'next-slice': /unknown option --no-such-option/,
    'capture-evidence': /unknown option --no-such-option/,
    'requirements-audit': /usage: requirements-audit\.mjs/,
    'test-inventory': /unknown option --no-such-option/,
    'diff-check': /unknown option --no-such-option/,
  };
  for (const [name, message] of Object.entries(scripts)) {
    const r = spawnSync(process.execPath, [join(ROOT, 'scripts/agent', `${name}.mjs`), '--no-such-option'], { cwd: ROOT, encoding: 'utf8', timeout: 30000 });
    assert.notEqual(r.status, 0, `${name} exited 0`);
    assert.notEqual(r.status, null, `${name} did not exit by itself`);
    assert.match(`${r.stdout}${r.stderr}`, message, name);
  }
  assert.equal(fingerprint(), before, 'a refused command wrote a harness file');
});

// ---------------------------------------------------------------------------------------------------------------
// lib.mjs: transitions (OPERATIONS.md §4)
// ---------------------------------------------------------------------------------------------------------------

test('transitions: the table matches OPERATIONS.md §4', () => {
  assert.deepEqual(TRANSITIONS, {
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
    OWNER_GATE: [],
    BLOCKED_MANUAL_REVIEW: ['SLICE_DISCOVERY', 'IMPLEMENT', 'REPAIR'],
    COMPLETE_LOCAL: [],
  });
});

test('transitions: the table is enforced, any state may go to OWNER_GATE, gated exits need a decision', () => {
  assert.ok(isLegalTransition('ADVERSARIAL_REVIEW', 'ACCEPT'));
  for (const [from, to] of [['IMPLEMENT', 'ACCEPT'], ['TARGETED_VERIFY', 'CHECKPOINT'], ['FULL_VERIFY', 'ACCEPT'], ['BASELINE_VERIFY', 'REPAIR'], ['HANDOFF', 'MULTIPLAYER_READINESS_GATE'], ['HANDOFF', 'BOOTSTRAP'], ['OWNER_GATE', 'OWNER_GATE'], ['IMPLEMENT', 'DONE'], ['DONE', 'IMPLEMENT']]) {
    assert.ok(!isLegalTransition(from, to), `${from} → ${to}`);
  }
  for (const from of ['IMPLEMENT', 'ACCEPT', 'BLOCKED_MANUAL_REVIEW', 'MULTIPLAYER_READINESS_GATE']) assert.ok(isLegalTransition(from, 'OWNER_GATE'), from);
  assert.ok(isLegalTransition('NEXT_SLICE', 'MULTIPLAYER_READINESS_GATE') && isLegalTransition('MULTIPLAYER_READINESS_GATE', 'OWNER_GATE'));
  // Ledger events: the same table, and gated exits name an ADR.
  assertHas(validateEvent(transition('IMPLEMENT', 'ACCEPT')), 'not a legal transition');
  assertHas(validateEvent(transition('OWNER_GATE', 'IMPLEMENT')), 'leaving OWNER_GATE needs an ADR');
  assertHas(validateEvent(transition('OWNER_GATE', 'IMPLEMENT', { decisions: ['ok'] })), 'leaving OWNER_GATE needs an ADR');
  assert.deepEqual(validateEvent(transition('OWNER_GATE', 'IMPLEMENT', { decisions: ['ADR-0004'] })), []);
  assertHas(validateEvent(transition('BLOCKED_MANUAL_REVIEW', 'REPAIR')), 'leaving BLOCKED_MANUAL_REVIEW needs an ADR');
});

test('transitions: a transition must start at STATE.machineState and name the current slice (M1, #21)', () => {
  const state = baseState();
  // A legal pair declared from the wrong state: ADVERSARIAL_REVIEW → ACCEPT while the state is IMPLEMENT.
  assertHas(checkTransition({ from: 'ADVERSARIAL_REVIEW', to: 'ACCEPT', slice: 'S1' }, { state }), 'STATE.machineState is IMPLEMENT');
  assertHas(checkTransition({ from: 'IMPLEMENT', to: 'TARGETED_VERIFY', slice: 'S2' }, { state }), 'STATE.currentSlice is S1');
  assertHas(checkTransition({ from: 'IMPLEMENT', to: 'ACCEPT', slice: 'S1' }, { state }), 'not a legal transition');
  assert.deepEqual(checkTransition({ from: 'IMPLEMENT', to: 'TARGETED_VERIFY', slice: 'S1' }, { state }), []);
});

test('transitions: leaving OWNER_GATE or BLOCKED_MANUAL_REVIEW needs a committed ADR, and OWNER_GATE resumes only where it was entered', () => {
  const gate = { ...baseState(), machineState: 'OWNER_GATE', resumeState: 'IMPLEMENT', ownerGateReason: 'DESIGN_PENDING:DESIGN-S3D' };
  const committed = (id) => id === 'ADR-0008';
  const t = (to, decisions, state = gate) => checkTransition({ from: state.machineState, to, slice: 'S1', decisions }, { state, adrExists: committed });
  assertHas(t('IMPLEMENT', []), 'leaving OWNER_GATE needs a recorded decision');
  assertHas(t('IMPLEMENT', ['ADR-0099']), 'decision ADR-0099 is not a committed ADR');
  assertHas(t('IMPLEMENT', ['owner said yes']), 'is not a committed ADR');
  assertHas(t('REPAIR', ['ADR-0008']), 'OWNER_GATE may only resume at IMPLEMENT');
  assert.deepEqual(t('IMPLEMENT', ['ADR-0008']), []);
  assert.deepEqual(t('COMPLETE_LOCAL', ['ADR-0008']), []);
  const blocked = { ...baseState(), machineState: 'BLOCKED_MANUAL_REVIEW' };
  assertHas(t('REPAIR', [], blocked), 'leaving BLOCKED_MANUAL_REVIEW needs a recorded decision');
  assertHas(t('REPAIR', ['ADR-0099'], blocked), 'not a committed ADR');
  assertHas(t('ACCEPT', ['ADR-0008'], blocked), 'not a legal transition');
  assert.deepEqual(t('REPAIR', ['ADR-0008'], blocked), []);
});

test('transitions: entering OWNER_GATE needs a reason and a state work can resume at', () => {
  const state = baseState();
  const t = (reason, resume) => checkTransition({ from: 'IMPLEMENT', to: 'OWNER_GATE', slice: 'S1', reason, resume }, { state });
  assertHas(t(undefined, 'IMPLEMENT'), 'needs --reason');
  for (const resume of [undefined, 'BLOCKED_MANUAL_REVIEW', 'COMPLETE_LOCAL', 'OWNER_GATE', 'DONE']) assertHas(t('OTHER:x', resume), 'needs --resume');
  assert.deepEqual(t('DESIGN_PENDING:DESIGN-S3D', 'IMPLEMENT'), []);
});

test('transitions: NEXT_SLICE is entered with a session id and left only in a different session (L2, M04)', () => {
  const next = { ...baseState(), machineState: 'NEXT_SLICE' };
  const leave = (session, closingSession, to = 'BOOTSTRAP', o = {}) => checkTransition({ from: 'NEXT_SLICE', to, slice: next.currentSlice, ...o }, { state: o.state ?? next, session, closingSession, s4Accepted: o.s4Accepted });
  assert.deepEqual(leave('new', 'old'), []);
  assertHas(leave('old', 'old'), 'also closed the previous slice');
  assertHas(leave(null, 'old'), 'needs the Claude Code session ids');
  assertHas(leave('new', null), 'needs the Claude Code session ids');
  // Pure callers that don't pass a session skip the check; record-event.mjs always passes one.
  assert.deepEqual(leave(undefined, null), []);
  // Entering NEXT_SLICE without a session would leave the next session no way out, so it is refused up front.
  const handoff = { ...baseState(), machineState: 'HANDOFF' };
  assertHas(checkTransition({ from: 'HANDOFF', to: 'NEXT_SLICE', slice: 'S1' }, { state: handoff, session: null }), 'entering NEXT_SLICE needs');
  assert.deepEqual(checkTransition({ from: 'HANDOFF', to: 'NEXT_SLICE', slice: 'S1' }, { state: handoff, session: 'closing' }), []);
});

test('transitions: the readiness gate follows only an accepted S4, and an accepted S4 starts no other slice', () => {
  const s4 = { ...baseState(), currentSlice: 'S4', currentTask: 'S4-T9', machineState: 'NEXT_SLICE' };
  const t = (to, state, s4Accepted) => checkTransition({ from: 'NEXT_SLICE', to, slice: state.currentSlice }, { state, s4Accepted, session: 'new', closingSession: 'old' });
  assertHas(t('MULTIPLAYER_READINESS_GATE', s4, false), 'follows only an accepted S4');
  assertHas(t('MULTIPLAYER_READINESS_GATE', { ...s4, currentSlice: 'S3' }, true), 'follows only an accepted S4');
  assert.deepEqual(t('MULTIPLAYER_READINESS_GATE', s4, true), []);
  assertHas(t('BOOTSTRAP', s4, true), 'next step is MULTIPLAYER_READINESS_GATE');
});

test('ledger events: required fields, legal states, repair defects and strategies', () => {
  const ok = transition('BOOTSTRAP', 'BASELINE_VERIFY');
  assert.deepEqual(validateEvent(ok), []);
  assertHas(validateEvent({ ...ok, toState: 'SHIPPED' }), 'not a legal state');
  assertHas(validateEvent({ ...ok, fromState: null }), 'needs fromState');
  assertHas(validateEvent({ ...ok, actor: '' }), 'missing actor');
  assertHas(validateEvent({ ...ok, timestamp: 'yesterday' }), 'not a date');
  assertHas(validateEvent({ ...ok, kind: 'approval' }), 'unknown kind');
  assertHas(validateEvent({ ...ok, slice: 'S9' }), 'unknown slice');
  assertHas(validateEvent({ ...ok, decisions: 'ADR-0004' }), 'decisions must be a list');
  assertHas(validateEvent(event({ kind: 'repair' })), 'defect');
  assertHas(validateEvent(event({ kind: 'repair', defect: 'D-S1-1' })), 'strategy');
  assert.deepEqual(validateEvent(repair('D-S1-1')), []);
  assert.deepEqual(validateEvent(event({ kind: 'repair', defect: 'D-S1-1', resolved: true })), []);
  assert.deepEqual(validateEvent([]), ['event is not an object']);
});

// ---------------------------------------------------------------------------------------------------------------
// check-state.mjs: STATE.json
// ---------------------------------------------------------------------------------------------------------------

test('a valid state passes', () => {
  assert.deepEqual(validateState(baseState()), { errors: [], warnings: [] });
});

test('state: illegal machine state, unknown gate value and missing gates are errors', () => {
  const s = baseState();
  s.machineState = 'DONE';
  s.gates.unit = 'PASSED';
  delete s.gates.e2e;
  const { errors } = validateState(s);
  assertHas(errors, 'not a legal state');
  assertHas(errors, 'gates.unit has unknown value PASSED');
  assertHas(errors, 'gates.e2e is missing');
});

test('state: every gate is required, and only browserQa may be waived without an owner ADR (M2, #6, #7)', () => {
  for (const g of ['harnessTests', 'requirementsAudit', 'testInventory', 'protectedFiles', 'independentReview']) {
    const s = baseState();
    delete s.gates[g];
    assertHas(validateState(s).errors, `STATE.gates.${g} is missing`);
  }
  const extra = baseState();
  extra.gates.manualCheck = 'GREEN';
  assertHas(validateState(extra).errors, 'manualCheck is not a known gate');
  for (const v of ['NOT_APPLICABLE', 'NOT_YET_REQUIRED']) {
    const s = baseState();
    s.gates.e2e = v;
    assertHas(validateState(s).errors, `gate e2e can't be ${v} without an owner-approved waiver`);
    assert.deepEqual(validateState({ ...s, gateWaivers: { e2e: 'ADR-0004' } }).errors, []);
  }
  assert.deepEqual(validateState({ ...baseState(), gates: { ...baseState().gates, browserQa: 'NOT_APPLICABLE' } }).errors, []);
});

test('state: remote or multiplayer permission needs an ADR reference', () => {
  const s = baseState();
  s.remoteMutationAllowed = true;
  s.multiplayerApproved = true;
  const { errors } = validateState(s);
  assertHas(errors, 'remoteApproval');
  assertHas(errors, 'multiplayerApproval');
});

test('state: at 3 distinct strategies or 5 attempts the slice must be in BLOCKED_MANUAL_REVIEW unless the owner overrode it', () => {
  const s = { ...baseState(), repairTarget: 'D-S1-1', repairAttempt: 2, repairTotalAttempts: 4 };
  assert.deepEqual(validateState(s).errors, []);
  assertHas(validateState({ ...s, repairTotalAttempts: 5 }).errors, 'at the repair limit');
  assertHas(validateState({ ...s, repairAttempt: 3 }).errors, 'at the repair limit');
  assert.deepEqual(validateState({ ...s, repairAttempt: 3, machineState: 'BLOCKED_MANUAL_REVIEW' }).errors, []);
  assert.deepEqual(validateState({ ...s, repairTotalAttempts: 5, repairOverrides: { 'D-S1-1': 'ADR-0010' } }).errors, []);
  assertHas(validateState({ ...s, repairTotalAttempts: 5, repairOverrides: { 'D-S1-2': 'ADR-0010' } }).errors, 'at the repair limit');
  // Counters need a defect, and the total can't be below the distinct count.
  const untargeted = validateState({ ...baseState(), repairAttempt: 3 }).errors;
  assertHas(untargeted, 'repairTarget must name the blocking defect');
  assertHas(untargeted, 'repairTotalAttempts must be a whole number of at least repairAttempt');
  assertHas(validateState({ ...s, repairAttempt: 2, repairTotalAttempts: 1 }).errors, 'repairTotalAttempts must be a whole number of at least repairAttempt');
});

test('OWNER_GATE needs a reason and a resume state', () => {
  const s = { ...baseState(), machineState: 'OWNER_GATE' };
  assertHas(validateState(s).errors, 'ownerGateReason');
  assertHas(validateState(s).errors, 'resumeState');
  assertHas(validateState({ ...s, ownerGateReason: 'MULTIPLAYER', resumeState: 'COMPLETE_LOCAL' }).errors, 'not a state work can resume at');
  assert.deepEqual(validateState({ ...s, ownerGateReason: 'DESIGN_PENDING:DESIGN-S3D', resumeState: 'IMPLEMENT', ownerGateRequired: true }), { errors: [], warnings: [] });
  assertHas(validateState({ ...baseState(), ownerGateRequired: true }).warnings, 'ownerGateRequired is true');
});

test('state: SHAs are full commits, and the reviewers include code-architecture', () => {
  assertHas(validateState({ ...baseState(), lastAcceptedCheckpoint: 'abc123' }).errors, 'lastAcceptedCheckpoint must be a full 40-character SHA');
  assertHas(validateState({ ...baseState(), requiredReviewers: ['adversarial'] }).errors, 'must include code-architecture');
  assertHas(validateState({ ...baseState(), schemaVersion: 1 }).errors, 'schemaVersion must be 2');
});

test('state must match the last recorded transition', () => {
  const t = (toState) => ({ kind: 'transition', toState });
  assert.deepEqual(validateStateAgainstLedger({ machineState: 'IMPLEMENT' }, [t('PLAN_LOCK'), t('IMPLEMENT')]).errors, []);
  assertHas(validateStateAgainstLedger({ machineState: 'ACCEPT' }, [t('IMPLEMENT')]).errors, 'last recorded transition went to IMPLEMENT');
  assert.deepEqual(validateStateAgainstLedger({ machineState: 'BOOTSTRAP' }, []).warnings, []);
  assertHas(validateStateAgainstLedger({ machineState: 'IMPLEMENT' }, []).warnings, 'no transition is recorded');
});

// ---------------------------------------------------------------------------------------------------------------
// check-state.mjs: gate evidence
// ---------------------------------------------------------------------------------------------------------------

test('evidence: a GREEN gate needs a passing run of its real command with a log and a code tree (#1, #4, #5)', () => {
  const s = { ...baseState(), gates: { ...baseState().gates, unit: 'GREEN' } };
  const errorsFor = (commands) => validateGateEvidence(s, { commands }, { targetTree: 'T' }).errors;
  assertHas(errorsFor([]), 'has no recorded "npm test" run');
  assertHas(errorsFor([rec('unit', { exitCode: 1 })]), 'exited 1');
  assertHas(errorsFor([rec('unit', { command: 'echo ok' })]), 'ran "echo ok", not "npm test"');
  assertHas(errorsFor([{ gate: 'unit', command: 'npm test', exitCode: 0 }]), 'no log, log hash or code tree');
  assertHas(errorsFor([rec('unit', { treeChanged: true })]), 'saw the code change while it ran');
  // Baseline records carry a phase and never count for a gate.
  assertHas(errorsFor([rec('unit', { phase: 'BASELINE_VERIFY' })]), 'has no recorded');
  // The latest record decides.
  assertHas(errorsFor([rec('unit'), rec('unit', { exitCode: 1 })]), 'exited 1');
  assert.deepEqual(errorsFor([rec('unit', { exitCode: 1 }), rec('unit')]), []);
});

test('evidence: GREEN gates on a stale or foreign code tree warn before acceptance and fail at it (#2, #3, #8, #9)', () => {
  const s = { ...baseState(), gates: { ...baseState().gates, unit: 'GREEN' } };
  const stale = { commands: [rec('unit', { codeTree: 'old' })] };
  const before = validateGateEvidence(s, stale, { targetTree: 'new', accepted: false });
  assert.deepEqual(before.errors, []);
  assertHas(before.warnings, 'passed on code tree old, not new');
  assertHas(validateGateEvidence(s, stale, { targetTree: 'new', accepted: true }).errors, 'passed on code tree old, not new');
  // A tree that can't be computed is no excuse at acceptance.
  assertHas(validateGateEvidence(acceptedState(), greenManifest(), { targetTree: null, accepted: true }).errors, 'could not be computed');
  assert.deepEqual(validateGateEvidence(s, { commands: [rec('unit', { codeTree: 'new' })] }, { targetTree: 'new', accepted: false }), { errors: [], warnings: [] });
});

test('evidence: acceptance needs every gate GREEN, a GREEN review per required role on the accepted tree and a GREEN manifest (M3, #15)', () => {
  const pending = validateGateEvidence({ ...baseState(), machineState: 'CHECKPOINT' }, null, { targetTree: 'T', accepted: true }).errors;
  assertHas(pending, 'gate typecheck is PENDING');
  assertHas(pending, 'needs a GREEN code-architecture review');
  assertHas(pending, 'needs a GREEN adversarial review');
  assertHas(pending, 'manifest.json is missing');
  const s = acceptedState();
  assert.deepEqual(validateGateEvidence(s, greenManifest('T'), { targetTree: 'T', accepted: true }).errors, []);
  const oldReviews = { ...greenManifest('T'), reviews: [review('code-architecture', { codeTree: 'old' }), review('adversarial', { codeTree: 'old' })] };
  assertHas(validateGateEvidence(s, oldReviews, { targetTree: 'T', accepted: true }).errors, 'latest code-architecture review covered code tree old');
  const redAfterGreen = { ...greenManifest('T'), reviews: [...greenManifest('T').reviews, review('adversarial', { verdict: 'RED' })] };
  assertHas(validateGateEvidence(s, redAfterGreen, { targetTree: 'T', accepted: true }).errors, 'needs a GREEN adversarial review');
  assertHas(validateGateEvidence(s, { ...greenManifest('T'), verdict: 'PENDING' }, { targetTree: 'T', accepted: true }).errors, 'manifest verdict is PENDING');
  assertHas(validateGateEvidence(s, greenManifest('old'), { targetTree: 'T', accepted: true }).errors, 'passed on code tree old, not T');
});

test('evidence: independentReview needs a GREEN code-architecture review; browserQa needs a clean run on the accepted tree', () => {
  const ir = { ...baseState(), gates: { ...baseState().gates, independentReview: 'GREEN' } };
  assertHas(validateGateEvidence(ir, { reviews: [review('code-architecture', { verdict: 'YELLOW' })] }).errors, 'no GREEN code-architecture review');
  assertHas(validateGateEvidence(ir, { reviews: [review('adversarial')] }).errors, 'no GREEN code-architecture review');
  const bq = { ...baseState(), gates: { ...baseState().gates, browserQa: 'GREEN' } };
  assertHas(validateGateEvidence(bq, { browserRuns: [] }, { targetTree: 'T' }).errors, 'no browser runs');
  const run = (o) => ({ route: '#/shop', consoleErrors: 0, codeTree: 'T', screenshot: '.agent-runs/evidence/S1/a.png', screenshotSha256: 'h', ...o });
  assertHas(validateGateEvidence(bq, { browserRuns: [run({ codeTree: 'old' })] }, { targetTree: 'T', accepted: true }).errors, 'no browser run was recorded on the accepted code tree');
  assertHas(validateGateEvidence(bq, { browserRuns: [run({ consoleErrors: 2 })] }, { targetTree: 'T', accepted: true }).errors, 'console errors');
  assertHas(validateGateEvidence(bq, { browserRuns: [run({ consoleErrors: 2 })] }, { targetTree: 'T', accepted: false }).warnings, 'console errors');
  assert.deepEqual(validateGateEvidence(bq, { browserRuns: [run()] }, { targetTree: 'T', accepted: false }), { errors: [], warnings: [] });
});

test('evidence: at acceptance only browserQa, or a gate with an owner waiver, may be NOT_APPLICABLE (#6)', () => {
  const s = acceptedState();
  assert.deepEqual(validateGateEvidence(s, greenManifest(), { targetTree: 'T', accepted: true }).errors, []);
  const noE2e = { ...greenManifest(), commands: greenManifest().commands.filter((c) => c.gate !== 'e2e') };
  const unwaived = { ...s, gates: { ...s.gates, e2e: 'NOT_APPLICABLE' } };
  assertHas(validateGateEvidence(unwaived, noE2e, { targetTree: 'T', accepted: true }).errors, 'claims acceptance but gate e2e is NOT_APPLICABLE');
  assert.deepEqual(validateGateEvidence({ ...unwaived, gateWaivers: { e2e: 'ADR-0010' } }, noE2e, { targetTree: 'T', accepted: true }).errors, []);
});

// ---------------------------------------------------------------------------------------------------------------
// check-state.mjs: evidence files, manifests, ledger, repairs
// ---------------------------------------------------------------------------------------------------------------

test('evidence files: missing, edited, ignored and flaky evidence is caught (#10, #12)', () => {
  const manifest = {
    commands: [
      { gate: 'unit', exitCode: 1, codeTree: 't', log: 'docs/agent/evidence/S1/logs/a.log', logSha256: 'h1' },
      { gate: 'unit', exitCode: 0, codeTree: 't', log: 'docs/agent/evidence/S1/logs/b.log', logSha256: 'h2', fullLog: { path: '.agent-runs/x.log', sha256: 'h3' } },
      { gate: 'build', exitCode: 0, codeTree: 't', log: 'docs/agent/evidence/S1/logs/gone.log', logSha256: 'h5' },
      { gate: 'typecheck', exitCode: 0, codeTree: 't', log: 'docs/agent/evidence/S1/logs/c.log' },
    ],
    reviews: [{ report: 'docs/agent/evidence/S1/reviews/r.md', reportSha256: 'h4' }],
  };
  const files = { 'docs/agent/evidence/S1/logs/a.log': 'h1', 'docs/agent/evidence/S1/logs/b.log': 'CHANGED', 'docs/agent/evidence/S1/logs/c.log': 'h6', 'docs/agent/evidence/S1/reviews/r.md': 'h4' };
  const r = validateEvidenceFiles(manifest, { exists: (p) => p in files, hash: (p) => files[p], ignored: (p) => p.endsWith('r.md') });
  assertHas(r.errors, 'b.log no longer matches its recorded SHA-256');
  assertHas(r.errors, 'gone.log cited in the manifest is missing');
  assertHas(r.errors, 'c.log has no recorded SHA-256');
  assertHas(r.errors, 'r.md is ignored by Git');
  // A full log kept outside Git on purpose only warns when it's gone.
  assertHas(r.warnings, '.agent-runs/x.log cited in the manifest is missing');
  assertNone(r.errors, '.agent-runs/x.log');
  assertHas(r.warnings, 'FLAKY');
});

test('evidence files: cited paths stay inside the evidence folders, and only full logs and screenshots may live outside Git (SD-8, SD-9)', () => {
  assert.deepEqual(EVIDENCE_DIRS, ['docs/agent/evidence/', '.agent-runs/']);
  const all = () => true;
  const check = (manifest) => validateEvidenceFiles(manifest, { exists: all, hash: () => 'h', ignored: () => false });
  for (const p of ['../../outside.log', '/etc/passwd', 'docs/agent/evidence/../../README.md', 'README.md', 'docs/agent/STATE.json', '.agent-runs/../src/x.log']) {
    assertHas(check({ commands: [{ log: p, logSha256: 'h' }] }).errors, `log ${p} is outside`);
  }
  assertHas(check({ commands: [{ log: '.agent-runs/evidence/S1/logs/unit.log', logSha256: 'h' }] }).errors, 'must be committed under docs/agent/evidence/');
  assertHas(check({ reviews: [{ report: '.agent-runs/review.md', reportSha256: 'h', verdict: 'GREEN' }] }).errors, 'review report .agent-runs/review.md is under .agent-runs/');
  assertHas(check({ files: [{ kind: 'test-inventory', path: '.agent-runs/inv.json', sha256: 'h' }] }).errors, 'test-inventory file .agent-runs/inv.json is under .agent-runs/');
  assertHas(check({ commands: [{ log: 42, logSha256: 'h' }] }).errors, 'log 42 is outside');
  // Full logs and screenshots may be kept outside Git (with their hash); a missing one only warns.
  const outside = validateEvidenceFiles(
    { commands: [{ log: 'docs/agent/evidence/S1/logs/u.log', logSha256: 'h', fullLog: { path: '.agent-runs/evidence/S1/logs/u.full.log', sha256: 'h' } }], browserRuns: [{ screenshot: '.agent-runs/evidence/S1/shop.png', screenshotSha256: 'h' }] },
    { exists: (p) => !p.endsWith('.png'), hash: () => 'h', ignored: (p) => p.startsWith('.agent-runs/') },
  );
  assert.deepEqual(outside.errors, []);
  assertHas(outside.warnings, 'screenshot .agent-runs/evidence/S1/shop.png cited in the manifest is missing');
});

test('evidence files: a review report must exist, keep its hash and end with the verdict it was recorded with (H2, #14, #16)', () => {
  const report = 'docs/agent/evidence/S1/reviews/adversarial-1.md';
  const legend = 'Every reviewer ends the report with a line `Verdict: GREEN`, `Verdict: YELLOW` or `Verdict: RED`.\n\nFindings…\n\nVerdict: RED\n';
  const check = (r, text = legend, hash = 'h') => validateEvidenceFiles({ reviews: [r] }, { exists: () => true, hash: () => hash, ignored: () => false, read: () => text });
  assertHas(check({ report, reportSha256: 'h', verdict: 'GREEN' }).errors, 'ends with RED, but it was recorded as GREEN');
  assertHas(check({ report, reportSha256: 'h', verdict: 'GREEN' }, 'All good.\n').errors, 'ends with no verdict');
  assertHas(check({ reportSha256: 'h', verdict: 'GREEN' }).errors, 'review report has no path');
  assertHas(check({ report, reportSha256: 'h', verdict: 'RED' }, legend, 'other').errors, 'no longer matches its recorded SHA-256');
  assert.deepEqual(check({ report, reportSha256: 'h', verdict: 'RED' }).errors, []);
});

test('manifest: committed records are append-only, and an accepted verdict and checkpoint stay (M4, #11, #13)', () => {
  const red = rec('e2e', { exitCode: 1 });
  const green = rec('e2e');
  const committed = { ...emptyManifest('S1'), commands: [red, green], reviews: [review('adversarial')], verdict: 'GREEN', checkpointSha: SHA };
  const check = (current) => validateManifestAppendOnly(current, committed, 'S1').errors;
  assert.deepEqual(check({ ...committed, commands: [red, green, rec('unit')] }), []);
  assertHas(check({ ...committed, commands: [green] }), 'manifest commands no longer starts with its committed records');
  assertHas(check({ ...committed, commands: [{ ...red, exitCode: 0 }, green] }), 'manifest commands no longer starts');
  assertHas(check({ ...committed, commands: [red, { ...green, logSha256: 'edited-log-hash' }] }), 'manifest commands no longer starts');
  assertHas(check({ ...committed, commands: [green, red] }), 'manifest commands no longer starts');
  assertHas(check({ ...committed, reviews: [] }), 'manifest reviews no longer starts');
  for (const k of ['browserRuns', 'files', 'performance']) {
    assertHas(validateManifestAppendOnly({ ...committed, [k]: [] }, { ...committed, [k]: [{ x: 1 }] }, 'S1').errors, `manifest ${k} no longer starts`);
  }
  assertHas(check({ ...committed, verdict: 'PENDING' }), 'verdict was GREEN when committed and is now PENDING');
  assertHas(check({ ...committed, checkpointSha: 'b'.repeat(40) }), 'checkpointSha changed after it was recorded');
  assert.deepEqual(validateManifestAppendOnly(committed, null, 'S1').errors, []);
});

test('manifest: a committed manifest may not be deleted, and a rewrite committed mid-slice is still caught (M4, SD-8)', () => {
  const rel = 'docs/agent/evidence/S1/manifest.json';
  const v1 = { ...emptyManifest('S1'), commands: [rec('e2e', { exitCode: 1 })] };
  const v2 = { ...v1, commands: [...v1.commands, rec('e2e')] };
  const rewritten = { ...v2, commands: [rec('e2e')] }; // the failing run dropped, then committed
  const texts = (...ms) => ms.map((m) => JSON.stringify(m, null, 2));
  assertHas(validateManifestHistory(rel, null, texts(v1)).errors, `${rel} was committed and has been deleted`);
  assert.deepEqual(validateManifestHistory(rel, null, []).errors, []);
  assert.deepEqual(validateManifestHistory(rel, { ...v2, commands: [...v2.commands, rec('unit')] }, texts(v1, v2), 'S1').errors, []);
  // HEAD holds the rewrite, but the version committed before it still convicts it (and the error is reported once).
  const errors = validateManifestHistory(rel, rewritten, texts(v1, v2, rewritten), 'S1').errors;
  assert.deepEqual(errors, ['S1 manifest commands no longer starts with its committed records (records are append-only)']);
  assert.deepEqual(validateManifestHistory(rel, v1, ['{ not json'], 'S1').errors, []);
});

test('ledger: rewritten and deleted lines are caught against every committed version, even after a commit (M4, SD-8, #17-#19)', () => {
  const l1 = lines(event({ result: 'one' }));
  const l1Rewritten = lines(event({ result: 'one, edited' }));
  const l2 = lines(event({ result: 'two' }));
  const l3 = lines(event({ result: 'three' }));
  assert.deepEqual(validateLedger(l1 + l2 + l3, [l1, l1 + l2]).errors, []);
  assertHas(validateLedger(l1Rewritten + l2 + l3, [l1, l1 + l2]).errors, 'no longer starts with a committed version');
  assertHas(validateLedger(l1 + l3, [l1 + l2]).errors, 'no longer starts with a committed version');
  // A rewrite committed mid-slice: HEAD holds the rewritten text, but an earlier committed version still convicts it.
  assertHas(validateLedger(l1Rewritten + l2 + l3, [l1 + l2, l1Rewritten + l2]).errors, 'no longer starts with a committed version');
  assertHas(validateLedger(`${l1}\n${l2}`, []).errors, 'line 2 is not valid JSON');
  assert.equal(parseLedger('{"a":1}\nnot json\n').errors.length, 1);
});

test('ledger: transitions form one chain from BOOTSTRAP (M1, #21)', () => {
  const chain = [transition('BOOTSTRAP', 'BASELINE_VERIFY'), transition('BASELINE_VERIFY', 'SLICE_DISCOVERY')];
  assert.deepEqual(validateLedger(lines(...chain)).errors, []);
  assertHas(validateLedger(lines(...chain, transition('PLAN_LOCK', 'IMPLEMENT'))).errors, 'line 3: transition starts at PLAN_LOCK but the previous one ended at SLICE_DISCOVERY');
  assertHas(validateLedger(lines(transition('ADVERSARIAL_REVIEW', 'ACCEPT'))).errors, 'the first transition must start at BOOTSTRAP');
  assertHas(validateLedger(lines(...chain, transition('SLICE_DISCOVERY', 'ACCEPT'))).errors, 'not a legal transition');
});

test('ledger: owner decisions and owner-gate exits must cite committed ADRs, and OWNER_GATE resumes only at its recorded state', () => {
  const committed = (id) => id === 'ADR-0008';
  const toGate = [transition('BOOTSTRAP', 'BASELINE_VERIFY'), transition('BASELINE_VERIFY', 'OWNER_GATE', { reason: 'BASELINE_RED:unit', resume: 'BASELINE_VERIFY' })];
  assertHas(validateLedger(lines(event({ kind: 'owner-decision' })), [], committed).errors, 'line 1: an owner-decision event must cite committed ADRs');
  assertHas(validateLedger(lines(event({ kind: 'owner-decision', decisions: ['ADR-0099'] })), [], committed).errors, 'an owner-decision event must cite committed ADRs');
  assert.deepEqual(validateLedger(lines(event({ kind: 'owner-decision', decisions: ['ADR-0008'] })), [], committed).errors, []);
  // A line written by hand past record-event.mjs.
  assertHas(validateLedger(lines(...toGate, transition('OWNER_GATE', 'BASELINE_VERIFY', { decisions: ['ADR-0099'] })), [], committed).errors, 'leaving OWNER_GATE must cite committed ADRs');
  assertHas(validateLedger(lines(...toGate, transition('OWNER_GATE', 'IMPLEMENT', { decisions: ['ADR-0008'] })), [], committed).errors, 'OWNER_GATE may only resume at BASELINE_VERIFY');
  assert.deepEqual(validateLedger(lines(...toGate, transition('OWNER_GATE', 'BASELINE_VERIFY', { decisions: ['ADR-0008'] })), [], committed).errors, []);
  assert.deepEqual(validateLedger(lines(...toGate, transition('OWNER_GATE', 'COMPLETE_LOCAL', { decisions: ['ADR-0008'] })), [], committed).errors, []);
});

test('repairs: counts are per defect, a new defect id resets nothing, and only a fix resets its own defect (M5, F14, #36)', () => {
  const events = [repair('D-S1-1', { distinct: true }), repair('D-S1-1'), repair('D-S1-2'), repair('D-S1-1', { distinct: true }), repair('D-S0-1', { slice: 'S0' }), event({ kind: 'note' })];
  assert.deepEqual(repairCounts(events, 'S1'), { 'D-S1-1': { attempts: 3, distinct: 2, resolved: false }, 'D-S1-2': { attempts: 1, distinct: 0, resolved: false } });
  const fixed = [...events, event({ kind: 'repair', defect: 'D-S1-1', resolved: true })];
  assert.equal(repairCounts(fixed, 'S1')['D-S1-1'].resolved, true);
  assert.deepEqual(repairCounts([...fixed, repair('D-S1-1')], 'S1')['D-S1-1'], { attempts: 1, distinct: 0, resolved: false });
});

test('repairs: a defect at 3 distinct strategies or 5 attempts forces BLOCKED_MANUAL_REVIEW, whatever STATE names (OPERATIONS.md §5)', () => {
  const five = Array.from({ length: 5 }, () => repair('D-S1-1'));
  const threeDistinct = Array.from({ length: 3 }, () => repair('D-S1-1', { distinct: true }));
  const renamed = { ...baseState(), repairTarget: 'D-S1-2' }; // the open defect renamed, counters at 0
  assertHas(validateRepairs(renamed, five).errors, 'defect D-S1-1 reached the repair limit (5 attempts, 0 distinct strategies)');
  assertHas(validateRepairs(renamed, threeDistinct).errors, 'defect D-S1-1 reached the repair limit (3 attempts, 3 distinct strategies)');
  assert.deepEqual(validateRepairs(renamed, five.slice(0, 4)).errors, []);
  assert.deepEqual(validateRepairs(renamed, threeDistinct.slice(0, 2)).errors, []);
  assert.deepEqual(validateRepairs({ ...renamed, machineState: 'BLOCKED_MANUAL_REVIEW' }, five).errors, []);
  assert.deepEqual(validateRepairs({ ...renamed, repairOverrides: { 'D-S1-1': 'ADR-0010' } }, five, () => true).errors, []);
  assertHas(validateRepairs({ ...renamed, repairOverrides: { 'D-S1-1': 'ADR-0099' } }, five, () => false).errors, 'reached the repair limit');
  assert.deepEqual(validateRepairs(renamed, [...five, event({ kind: 'repair', defect: 'D-S1-1', resolved: true })]).errors, []);
});

test('repair counts can not be understated', () => {
  const s = { ...baseState(), repairTarget: 'D-S1-1', repairAttempt: 0, repairTotalAttempts: 1 };
  const events = [repair('D-S1-1', { distinct: true }), repair('D-S1-1'), repair('D-S1-2')];
  assertHas(validateRepairs(s, events).errors, 'LEDGER.jsonl records 2 attempt(s) on D-S1-1 but STATE.repairTotalAttempts is 1');
  assertHas(validateRepairs(s, events).errors, 'LEDGER.jsonl records 1 distinct strategy on D-S1-1 but STATE.repairAttempt is 0');
  assert.deepEqual(validateRepairs({ ...s, repairAttempt: 1, repairTotalAttempts: 2 }, events).errors, []);
});

test('check-state: after next-slice.mjs the accepted slice is judged on its own evidence, on the checkpoint tree', () => {
  const closing = transition('HANDOFF', 'NEXT_SLICE', { slice: 'S0' });
  const prepared = { ...baseState(), currentSlice: 'S1', machineState: 'NEXT_SLICE', lastAcceptedCheckpoint: SHA };
  assert.deepEqual(evidenceScope(prepared, closing), { prepared: true, acceptedSlice: 'S0', accepted: false, postCheckpoint: true });
  // Before next-slice.mjs runs, and after S4 (which has no next slice), the current slice is the accepted one.
  assert.deepEqual(evidenceScope({ ...prepared, currentSlice: 'S0' }, closing), { prepared: false, acceptedSlice: 'S0', accepted: true, postCheckpoint: true });
  assert.deepEqual(evidenceScope({ ...prepared, currentSlice: 'S4' }, { ...closing, slice: 'S4' }), { prepared: false, acceptedSlice: 'S4', accepted: true, postCheckpoint: true });
  // next-slice.mjs run twice: S2 isn't the slice after the one that closed, so S2's own (pending) gates must hold.
  assert.deepEqual(evidenceScope({ ...prepared, currentSlice: 'S2' }, closing), { prepared: false, acceptedSlice: 'S2', accepted: true, postCheckpoint: true });
  // ACCEPT compares with the working tree (F3); BOOTSTRAP of the new slice claims nothing.
  assert.deepEqual(evidenceScope({ ...prepared, machineState: 'ACCEPT' }, transition('ADVERSARIAL_REVIEW', 'ACCEPT')), { prepared: false, acceptedSlice: 'S1', accepted: true, postCheckpoint: false });
  assert.deepEqual(evidenceScope({ ...prepared, machineState: 'BOOTSTRAP' }, transition('NEXT_SLICE', 'BOOTSTRAP')), { prepared: false, acceptedSlice: 'S1', accepted: false, postCheckpoint: false });

  const view = preparedView(prepared, 'S0');
  assert.equal(view.currentSlice, 'S0');
  assert.deepEqual(view.requiredReviewers, MANDATORY_REVIEWERS);
  for (const g of Object.keys(GATE_COMMANDS)) assert.equal(view.gates[g], 'GREEN', g);
  assert.equal(preparedView({ ...prepared, gateWaivers: { e2e: 'ADR-0010' } }, 'S0').gates.e2e, 'NOT_APPLICABLE');
  const s0 = (m) => ({ ...m, slice: 'S0' });
  assert.deepEqual(validateGateEvidence(view, s0(greenManifest('T')), { targetTree: 'T', accepted: true }).errors, []);
  assertHas(validateGateEvidence(view, s0(greenManifest('T', ['code-architecture'])), { targetTree: 'T', accepted: true }).errors, 'needs a GREEN adversarial review in the S0 manifest');
  assertHas(validateGateEvidence(view, s0(greenManifest('old')), { targetTree: 'T', accepted: true }).errors, 'passed on code tree old, not T');
  assertHas(validateGateEvidence(view, null, { targetTree: 'T', accepted: true }).errors, 'docs/agent/evidence/S0/manifest.json is missing');
});

// ---------------------------------------------------------------------------------------------------------------
// Real repository (read-only): code trees, committed versions, ADRs
// ---------------------------------------------------------------------------------------------------------------

test('code tree ignores docs/agent and is stable for a commit', () => {
  const a = codeTreeOf('HEAD');
  assert.match(a, /^[0-9a-f]{40}$/);
  assert.equal(codeTreeOf('HEAD'), a);
  assert.deepEqual(NON_CODE_PATHS, ['docs/agent', 'AGENTS.md', 'CLAUDE.md']);
});

test('code tree: an older commit whose docs/agent differs from HEAD still gets its tree (H1, F3)', () => {
  const lastLedgerCommit = git('log', '-1', '--format=%H', '--', PATHS.ledger);
  const ref = git('rev-parse', `${lastLedgerCommit}^`);
  assert.notEqual(showAt(ref, PATHS.ledger), showAt('HEAD', PATHS.ledger), 'the fixture commit must differ from HEAD in docs/agent');
  const listed = (tree) => git('ls-tree', '-r', '--name-only', tree).split('\n').filter(Boolean);
  const expected = listed(ref).filter((f) => !NON_CODE_PATHS.some((p) => f === p || f.startsWith(`${p}/`)));
  assert.deepEqual(listed(codeTreeOf(ref)), expected);
  // The S0 baseline evidence was recorded on exactly the baseline commit's code tree.
  const baseline = JSON.parse(readText(PATHS.state)).actualBaselineSha;
  const unit = JSON.parse(readText(`${PATHS.evidence}/S0/manifest.json`)).commands.find((c) => c.gate === 'unit' && c.phase === 'BASELINE_VERIFY');
  assert.equal(codeTreeOf(baseline), unit.codeTree);
});

test('committed versions: every version since the anchor is checked, oldest first, ending at HEAD (M4, SD-8)', () => {
  const baseline = JSON.parse(readText(PATHS.state)).actualBaselineSha;
  const ledger = committedVersions(PATHS.ledger, baseline);
  assert.ok(ledger.length >= 2, 'the ledger has been committed more than once');
  for (let i = 1; i < ledger.length; i++) assert.ok(ledger[i].startsWith(ledger[i - 1]), `version ${i} doesn't extend version ${i - 1}`);
  assert.equal(ledger[ledger.length - 1], showAt('HEAD', PATHS.ledger));
  // Intermediate versions are included, not only HEAD: the registry grew from a short list to its merged size.
  const registries = committedRegistries({ actualBaselineSha: baseline });
  assert.ok(registries.length >= 2);
  assert.ok(registries[0].requirements.length < registries[registries.length - 1].requirements.length);
  assert.deepEqual(committedVersions('docs/agent/no-such-file.json', baseline), []);
  assert.deepEqual(committedVersions(PATHS.ledger, 'f'.repeat(40)), [showAt('HEAD', PATHS.ledger)]);
});

test('approvals: only a committed ADR listed in decisions/INDEX.md counts (SD-6, SD-11, #25-#27)', () => {
  const path = findAdr('ADR-0008');
  assert.equal(path, 'docs/agent/decisions/ADR-0008-docs-corrections.md');
  assert.ok(approvalIsAdr('ADR-0008'));
  assert.ok(approvalIsAdr(path));
  for (const ref of ['README.md', 'package.json', 'ADR-0099', 'see ADR-0008', 'docs/agent/decisions/ADR-0008-other.md', null, 8]) assert.ok(!approvalIsAdr(ref), String(ref));
  for (const id of ['ADR-8', 'ADR-0099', '../ADR-0008', 'ADR-0008-docs-corrections.md', 'INDEX']) assert.equal(findAdr(id), null, id);
});

// ---------------------------------------------------------------------------------------------------------------
// requirements.mjs and requirements-audit.mjs
// ---------------------------------------------------------------------------------------------------------------

test('requirements: schema, append-only ids and GREEN evidence (#22-#24)', () => {
  assert.ok(REQ_ID_RE.test('NAV-001') && REQ_ID_RE.test('HARNESS-008') && !REQ_ID_RE.test('XYZ-001') && !REQ_ID_RE.test('NAV-1') && !REQ_ID_RE.test('NAV-0001'));
  assert.deepEqual('S1 covers NAV-001, MKT-012 and XYZ-001'.match(REQ_TOKEN_RE), ['NAV-001', 'MKT-012']);
  assert.deepEqual(validateRequirements({ requirements: [req()] }), { errors: [], warnings: [] });
  assertHas(validateRequirements({}).errors, 'no requirements array');
  const bad = validateRequirements({ requirements: [req({ id: 'XYZ-1', status: 'DONE', acceptance: [], slice: 'S9' }), req(), req()] }).errors;
  for (const needle of ['FAMILY-NNN', 'unknown status DONE', 'acceptance criterion', 'unknown slice S9', 'requirement NAV-001: duplicate id']) assertHas(bad, needle);
  assertHas(validateRequirements({ requirements: [req({ tests: [] })] }).errors, 'names no test');
  assertHas(validateRequirements({ requirements: [req({ status: 'GREEN' })] }).errors, 'GREEN without tests and evidence');
  assertHas(validateRequirements({ requirements: [req({ status: 'GREEN', evidence: ['docs/agent/evidence/S1/acceptance-report.md'] })] }, [], () => false).errors, 'GREEN evidence docs/agent/evidence/S1/acceptance-report.md does not exist');
  assertHas(validateRequirements({ requirements: [req({ status: 'BLOCKED' })] }).errors, 'BLOCKED needs blockedBy');
  // Ids are append-only against every committed version, not only the newest.
  const older = { requirements: [req(), req({ id: 'NAV-002' })] };
  assertHas(validateRequirements({ requirements: [req()] }, [older, { requirements: [req()] }]).errors, 'requirement NAV-002 was deleted');
  // Closing a requirement by DEFERRED or SUPERSEDED needs a committed ADR, not a made-up one.
  for (const status of ['DEFERRED', 'SUPERSEDED']) {
    assertHas(validateRequirements({ requirements: [req({ status, tests: [] })] }).errors, `${status} needs a decision citing an ADR`);
    assertHas(validateRequirements({ requirements: [req({ status, tests: [], decision: 'ADR-0099' })] }, [], () => true, () => false).errors, 'cites ADR-0099, which is not a committed ADR');
    assert.deepEqual(validateRequirements({ requirements: [req({ status, tests: [], decision: 'ADR-0005 decision 1' })] }, [], () => true, (id) => id === 'ADR-0005').errors, []);
  }
});

test('requirements audit: tasks after PLAN_LOCK, accepted slices closed, unknown ids in the slice contract', () => {
  const s = baseState();
  const reqs = { requirements: [req(), req({ id: 'HARNESS-001', slice: 'S0', status: 'PENDING' })] };
  const r = auditRequirements(reqs, s, { sliceText: 'S1-T1 covers NAV-001 and NAV-099' });
  assertHas(r.errors, 'NAV-001 (S1) has no task after PLAN_LOCK');
  assertHas(r.errors, 'HARNESS-001 belongs to accepted slice S0 but is PENDING');
  assertHas(r.errors, 'unknown requirement NAV-099');
  assert.deepEqual(r.summary, { S1: { PENDING: 1 }, S0: { PENDING: 1 } });
  assertHas(auditRequirements({ requirements: [req()] }, { ...s, machineState: 'PLAN_LOCK' }).warnings, 'no task yet');
  const claims = auditRequirements({ requirements: [req({ tasks: ['S1-T1'] })] }, { ...s, machineState: 'CHECKPOINT' }).errors;
  assertHas(claims, 'NAV-001 is PENDING but S1 claims acceptance (CHECKPOINT)');
  // The audit passes the committed versions and the ADR check down to the schema checks.
  assertHas(auditRequirements({ requirements: [req({ tasks: ['S1-T1'] })] }, s, { committed: [{ requirements: [req({ id: 'NAV-003' })] }] }).errors, 'NAV-003 was deleted');
  assertHas(auditRequirements({ requirements: [req({ status: 'DEFERRED', decision: 'ADR-0099', tests: [] })] }, s, { adrOk: () => false }).errors, 'not a committed ADR');
});

test('requirements audit: an umbrella is GREEN only when every child that names it is closed', () => {
  const umbrella = req({ id: 'NAV-001', status: 'GREEN', tasks: ['S1-T1'], evidence: ['docs/agent/evidence/S1/acceptance-report.md'] });
  const child = (status, o = {}) => req({ id: 'NAV-002', source: 'design §5.1; umbrella NAV-001', tasks: ['S1-T2'], status, ...o });
  assert.deepEqual(umbrellaOf(child('PENDING')), ['NAV-001']);
  assert.deepEqual(umbrellaOf(req({ source: 'umbrella NAV-001 and umbrella MKT-001' })), ['NAV-001', 'MKT-001']);
  assertHas(auditRequirements({ requirements: [umbrella, child('PENDING')] }, baseState()).errors, 'umbrella NAV-001 is GREEN while NAV-002 are still open');
  assertNone(auditRequirements({ requirements: [umbrella, child('DEFERRED', { decision: 'ADR-0005', tests: [] })] }, baseState()).errors, 'umbrella');
  assertNone(auditRequirements({ requirements: [umbrella, child('GREEN', { evidence: ['x'] })] }, baseState()).errors, 'umbrella');
});

test('design registry: APPROVED needs an approval citing a committed ADR and an existing path (#28, #29)', () => {
  const reg = { designs: [{ id: 'D1', status: 'APPROVED', approval: null, path: 'missing.md' }, { id: 'D2', status: 'MAYBE' }, { id: 'D3', status: 'APPROVED', approval: 'the owner will surely like it', path: 'ok.md' }, { id: 'D2', status: 'RECEIVED' }] };
  const { errors } = validateRegistry(reg, (p) => p === 'ok.md', () => true);
  assertHas(errors, 'design D1: APPROVED without an approval citing a committed ADR');
  assertHas(errors, 'design D1: APPROVED but its path missing.md does not exist');
  assertHas(errors, 'design D3: APPROVED without an approval');
  assertHas(errors, 'unknown status MAYBE');
  assertHas(errors, 'design D2: duplicate id');
  assertHas(validateRegistry({ designs: [{ id: 'D4', status: 'APPROVED', approval: 'ADR-0099', path: 'ok.md' }] }, () => true, () => false).errors, 'APPROVED without an approval citing a committed ADR');
  assert.deepEqual(validateRegistry({ designs: [{ id: 'D5', status: 'APPROVED', approval: 'ADR-0005 decision 6', path: 'ok.md' }] }, () => true, (id) => id === 'ADR-0005').errors, []);
  assertHas(validateRegistry({}).errors, 'no designs array');
});

// ---------------------------------------------------------------------------------------------------------------
// protect.mjs
// ---------------------------------------------------------------------------------------------------------------

test('protected files: changes, deletions and unrecorded files fail; an edited accepted ADR is named as such (#30-#32)', () => {
  const r = compareProtected(
    { 'a.md': '1', 'b.md': '2', 'docs/agent/decisions/ADR-0002-x.md': '3' },
    { 'a.md': 'X', 'c.md': '3', 'docs/agent/decisions/ADR-0002-x.md': 'Y' },
  );
  assertHas(r.errors, 'protected file a.md changed without a recorded approval');
  assertHas(r.errors, 'protected file b.md was deleted');
  assertHas(r.errors, 'accepted ADR docs/agent/decisions/ADR-0002-x.md was edited');
  // A file that was taken out of PROTECTED.json (and then edited) can't hide: an unrecorded protected file fails.
  assertHas(r.errors, 'protected file c.md is not recorded');
  assert.deepEqual(compareProtected({ 'a.md': '1' }, { 'a.md': '1' }), { errors: [], warnings: [] });
});

test('protected files: the patterns cover the rules, the scripts and the gate-defining and deploy files (F10, SD-12)', () => {
  for (const p of ['AGENTS.md', 'CLAUDE.md', 'docs/agent/README_FIRST.md', 'docs/agent/AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md', 'docs/agent/OPERATIONS.md', 'docs/agent/decisions/', 'docs/agent/prompts/', 'docs/agent/templates/', 'docs/agent/design/', 'scripts/agent/', 'package.json', 'tsconfig.json', 'vitest.config.ts', 'playwright.config.ts', '.github/', 'render.yaml']) {
    assert.ok(PROTECTED_PATTERNS.includes(p), p);
  }
  for (const p of OWNER_ONLY) assert.ok(PROTECTED_PATTERNS.includes(p), `owner-only ${p} is protected`);
  for (const p of ['docs/agent/OPERATIONS.md', 'docs/agent/prompts/', 'AGENTS.md', 'render.yaml', '.github/']) assert.ok(OWNER_ONLY.includes(p), p);
  const files = protectedFiles();
  for (const f of ['scripts/agent/lib.mjs', 'scripts/agent/agent.test.mjs', 'docs/agent/OPERATIONS.md', 'docs/agent/decisions/ADR-0008-docs-corrections.md', 'package.json']) assert.ok(files.includes(f), f);
  // Only files Git can see: nothing ignored, and not the record itself.
  for (const f of files) assert.ok(!f.startsWith('.agent-runs/') && !f.includes('node_modules/') && !f.endsWith('.DS_Store') && f !== PATHS.protected, f);
});

test('protected files: an owner approval is a real quote, not the template text or a placeholder', () => {
  const template = readText(ADR_TEMPLATE);
  const adr = (body) => `# ADR-0100 — x\n\n**Status:** Accepted\\\n\n## Decision\nx\n\n## Owner approval\n${body}\n\n## Notes\nlater\n`;
  assert.ok(!hasOwnerApproval('# ADR\n\n## Decision\nno approval section at all, however long this text is\n', template));
  // The template's own instructions, copied unchanged, approve nothing.
  const copied = template.slice(template.indexOf('## Owner approval'));
  assert.ok(!hasOwnerApproval(`# ADR-0100\n\n${copied}`, template));
  for (const placeholder of ['Pending: the owner will answer at the next session boundary.', '**TBD** once the owner has read the diff and answered the question.', 'To be recorded after the owner replies to the question in HANDOFF.md.']) {
    assert.ok(!hasOwnerApproval(adr(placeholder), template), placeholder);
  }
  assert.ok(!hasOwnerApproval(adr('Yes.'), template));
  assert.ok(hasOwnerApproval(adr('Given 2026-10-06 by the owner: "Approve as written", for the files listed in section 5.'), template));
  // Only the section itself counts, not what follows the next heading.
  assert.ok(!hasOwnerApproval(`## Owner approval\nok\n## Notes\n${'words that are not an approval '.repeat(5)}`, template));
  assert.ok(hasOwnerApproval(readText('docs/agent/decisions/ADR-0008-docs-corrections.md'), template));
  assert.equal(adrStatus('**Status:** Accepted\\\n'), 'Accepted');
  assert.equal(adrStatus('# x\n**Status:** Proposed\n'), 'Proposed');
  assert.equal(adrStatus('**Status:** Accepted (owner-requested; …)\\'), 'Accepted');
  assert.equal(adrStatus('Status: Accepted'), null);
});

test('protected files: --update refuses a missing, proposed, old or unapproved ADR, an edited accepted ADR, and a hand-edited or deleted record (M10, SD-7, #33)', () => {
  const approved = '**Status:** Accepted\\\n\n## Owner approval\nGiven 2026-10-06 by the owner: "Approve as written", for the files listed in section 5.\n';
  const unapproved = '**Status:** Accepted\\\n\n## Decision\nScripts only.\n';
  const recorded = { 'docs/agent/OPERATIONS.md': 'o1', 'docs/agent/decisions/ADR-0002-x.md': 'a1', 'scripts/agent/lib.mjs': 'l1' };
  const ok = { adrPath: 'docs/agent/decisions/ADR-0100-x.md', adrText: approved, adrAtAnchor: false, recorded, recordHash: 'p1', ledgerHash: 'p1', files: { ...recorded, 'scripts/agent/lib.mjs': 'l2' } };
  const problems = (o) => updateProblems({ ...ok, ...o }).problems;
  assert.deepEqual(updateProblems(ok), { problems: [], changed: ['scripts/agent/lib.mjs'] });
  assertHas(problems({ adrPath: null }), '--update needs --adr ADR-NNNN');
  assertHas(problems({ adrText: approved.replace('Accepted', 'Proposed') }), 'is Proposed, not Accepted');
  assertHas(problems({ adrText: approved.replace('**Status:** Accepted\\\n', '') }), 'without a **Status:** line');
  assertHas(problems({ adrAtAnchor: true }), 'already existed at the last accepted checkpoint');
  // Accepted ADRs are never edited or deleted.
  assertHas(problems({ files: { ...recorded, 'docs/agent/decisions/ADR-0002-x.md': 'a2' } }), 'accepted ADRs are never edited: docs/agent/decisions/ADR-0002-x.md');
  const { 'docs/agent/decisions/ADR-0002-x.md': _gone, ...withoutAdr } = recorded;
  assertHas(problems({ files: withoutAdr }), 'accepted ADRs are never edited');
  // Owner-only files need the owner's words; other protected files only an ADR (and a reviewer, OPERATIONS.md §10).
  assertHas(problems({ adrText: unapproved, files: { ...recorded, 'docs/agent/OPERATIONS.md': 'o2' } }), 'needs an "## Owner approval" section quoting the owner, because owner-only files changed: docs/agent/OPERATIONS.md');
  assert.deepEqual(problems({ adrText: unapproved }), []);
  // The edited ADR's new hash written into PROTECTED.json by hand first: the record no longer matches its ledger event.
  const handEdited = { recorded: { ...recorded, 'docs/agent/decisions/ADR-0002-x.md': 'a2' }, files: { ...recorded, 'docs/agent/decisions/ADR-0002-x.md': 'a2' }, recordHash: 'p2' };
  assertHas(problems(handEdited), "doesn't match the hash its last protect.mjs ledger event recorded");
  // PROTECTED.json deleted first, so every file looks new.
  assertHas(problems({ recorded: null, recordHash: null, files: { ...recorded, 'docs/agent/decisions/ADR-0002-x.md': 'a2' } }), 'is missing although the ledger records it');
  // The very first record: nothing recorded yet, by file or by ledger.
  const first = updateProblems({ ...ok, recorded: null, recordHash: null, ledgerHash: null });
  assert.deepEqual(first.problems, []);
  assert.deepEqual(first.changed.sort(), Object.keys(ok.files).sort());
  // The hash the ledger vouches for is the latest protect.mjs event's.
  const ev = (actor, protectedSha256) => event({ kind: 'decision', actor, protectedSha256 });
  assert.equal(lastRecordedHash([ev('protect.mjs', 'p1'), ev('orchestrator', 'forged'), ev('protect.mjs', 'p2'), event({ actor: 'protect.mjs' })]), 'p2');
  assert.equal(lastRecordedHash([ev('orchestrator', 'forged')]), null);
});

test('gate configuration: the settings that make a passing gate mean something are still in place (HARNESS-006, F10)', () => {
  const vitest = readText('vitest.config.ts');
  assert.match(vitest, /^\s*allowOnly:\s*false,/m);
  assert.match(vitest, /^\s*expect:\s*\{\s*requireAssertions:\s*true\s*\}/m);
  assert.doesNotMatch(vitest, /^\s*(retry|passWithNoTests|bail)\s*:/m);
  const playwright = readText('playwright.config.ts');
  assert.match(playwright, /^\s*forbidOnly:\s*true,/m);
  assert.match(playwright, /^\s*retries:\s*0,/m);
  assert.match(playwright, /^\s*reuseExistingServer:\s*process\.env\.E2E_REUSE === '1',/m);
  assert.match(playwright, /--strictPort/);
  // The gate commands run these npm scripts; narrowing one would narrow its gate.
  const scripts = JSON.parse(readText('package.json')).scripts;
  assert.equal(GATE_COMMANDS.typecheck, 'npm run typecheck');
  assert.equal(scripts.typecheck, 'tsc -b --noEmit');
  assert.equal(GATE_COMMANDS.unit, 'npm test');
  assert.equal(scripts.test, 'vitest run');
  assert.equal(scripts.build, 'tsc -b && vite build');
  assert.equal(scripts.e2e, 'playwright test');
  const include = JSON.parse(readText('tsconfig.json')).include;
  for (const p of ['src', 'tests/sim', 'tests/e2e', 'playwright.config.ts', 'vitest.config.ts']) assert.ok(include.includes(p), p);
});

// ---------------------------------------------------------------------------------------------------------------
// bootstrap-check.mjs
// ---------------------------------------------------------------------------------------------------------------

test('bootstrap assertion is checked field by field and must come from a fresh session (M6, F13, SD-11, #37)', () => {
  const state = { ...baseState(), currentSlice: 'S1', currentTask: 'S1-T1', machineState: 'BOOTSTRAP' };
  const good = {
    sessionId: 'new',
    startedAt: '2026-10-06T00:00:00Z',
    readFiles: [...MANDATED_READS],
    expectedSha: SHA,
    actualSha: SHA,
    branch: 'agent/x',
    slice: 'S1',
    task: 'S1-T1',
    machineState: 'BOOTSTRAP',
    requiredGates: Object.keys(state.gates),
    requiredReviewers: ['code-architecture', 'adversarial'],
    forbidden: ['git push', 'deploy'],
    firstFiles: ['src/ui/hud/Dock.tsx'],
    risks: ['a', 'b', 'c'],
  };
  const closed = [{ kind: 'transition', toState: 'NEXT_SLICE', session: 'old' }];
  const ctx = { state, head: SHA, branch: 'agent/x', events: closed, session: 'new' };
  assert.deepEqual(checkAssertion(good, ctx), []);
  const bad = checkAssertion({ ...good, task: 'S1-T9', readFiles: ['AGENTS.md'], forbidden: ['nothing'], risks: ['a'], firstFiles: [], requiredGates: ['unit'], requiredReviewers: [] }, ctx);
  for (const needle of ['STATE.currentTask', 'mandated file docs/agent/README_FIRST.md', 'don\'t mention "push"', 'don\'t mention "deploy"', 'three risks', 'first files', 'required gate typecheck', 'required reviewer adversarial']) assertHas(bad, needle);
  assertHas(checkAssertion({ ...good, actualSha: 'b'.repeat(40) }, ctx), 'is not HEAD');
  assertHas(checkAssertion({ ...good, branch: 'main' }, ctx), 'is not the current branch agent/x');
  assertHas(checkAssertion({ ...good, risks: 'three' }, ctx), 'assertion field risks must be a list');
  // The session id is the running session's, not the assertion's word for it.
  assertHas(checkAssertion(good, { ...ctx, session: null }), 'CLAUDE_CODE_SESSION_ID is not set');
  assertHas(checkAssertion({ ...good, sessionId: 'made-up' }, { ...ctx, session: 'old' }), 'sessionId made-up is not this Claude Code session (old)');
  assertHas(checkAssertion({ ...good, sessionId: 'old' }, { ...ctx, session: 'old' }), 'session old also closed the previous slice');
  assertHas(checkAssertion(good, { ...ctx, events: [{ kind: 'transition', toState: 'NEXT_SLICE', session: null }] }), 'records no session id');
  // S0 has no closing transition to compare with.
  assert.deepEqual(checkAssertion(good, { ...ctx, events: [] }), []);
  // expectedSha may trail HEAD only by harness bookkeeping.
  const trailing = { ...good, expectedSha: 'b'.repeat(40) };
  assertHas(checkAssertion(trailing, ctx), 'reconcile');
  assertHas(checkAssertion(trailing, { ...ctx, changedSinceExpected: ['docs/agent/HANDOFF.md', 'src/sim/world.ts'] }), 'reconcile');
  assert.deepEqual(checkAssertion(trailing, { ...ctx, changedSinceExpected: ['docs/agent/HANDOFF.md', 'docs/agent/STATE.json', 'AGENTS.md'] }), []);
});

test('bootstrap: bookkeeping-only commits are exactly the NON_CODE_PATHS', () => {
  assert.ok(bookkeepingOnlySince(SHA, SHA, null));
  assert.ok(!bookkeepingOnlySince(SHA, 'b'.repeat(40), null));
  assert.ok(bookkeepingOnlySince(SHA, 'b'.repeat(40), ['docs/agent/LEDGER.jsonl', 'CLAUDE.md']));
  assert.ok(!bookkeepingOnlySince(SHA, 'b'.repeat(40), ['docs/agent-notes.md']));
  assert.ok(!bookkeepingOnlySince(SHA, 'b'.repeat(40), ['scripts/agent/check-state.mjs']));
});

// ---------------------------------------------------------------------------------------------------------------
// test-inventory.mjs
// ---------------------------------------------------------------------------------------------------------------

test('test inventory: disappearing tests, dropped counts and new skips fail; approved removals pass (M7, #38)', () => {
  const base = { vitest: { count: 3, tests: ['a > 1', 'a > 2', 'b > 1'] }, playwright: { count: 1, tests: ['e > x [desktop]'] }, skipMarkers: { 'tests/e2e/perf.spec.ts': 1 } };
  const now = { vitest: { count: 2, tests: ['a > 1', 'b > 1'] }, playwright: { count: 1, tests: ['e > x [desktop]'] }, skipMarkers: { 'tests/e2e/perf.spec.ts': 1, 'tests/sim/x.test.ts': 1 } };
  const errors = compareInventories(base, now);
  assertHas(errors, 'vitest test disappeared: a > 2');
  assertHas(errors, 'vitest test count dropped from 3 to 2');
  assertHas(errors, 'tests/sim/x.test.ts gained 1');
  assert.deepEqual(compareInventories(base, { ...now, skipMarkers: base.skipMarkers }, new Set(['a > 2'])), []);
  // A rename is a disappearance unless approved; a renamed Playwright test too.
  assertHas(compareInventories(base, { ...base, playwright: { count: 1, tests: ['e > y [desktop]'] } }), 'playwright test disappeared: e > x [desktop]');
  assertHas(compareInventories(base, { ...base, skipMarkers: { 'tests/e2e/perf.spec.ts': 2 } }), 'tests/e2e/perf.spec.ts gained 1');
  const ids = playwrightIds({ suites: [{ title: 'boot.spec.ts', specs: [], suites: [{ title: 'boot', specs: [{ title: 'first launch', file: 'boot.spec.ts', tests: [{ projectName: 'desktop' }, { projectName: 'phone' }] }] }] }] });
  assert.deepEqual(ids, ['tests/e2e/boot.spec.ts > boot > first launch [desktop]', 'tests/e2e/boot.spec.ts > boot > first launch [phone]']);
  assert.deepEqual(vitestIds([{ name: 'x > y', file: join(ROOT, 'tests/sim/a.test.ts') }]), ['tests/sim/a.test.ts > x > y']);
});

test('test inventory: every form of skip, focus, todo, fixme or inversion is a marker (F10 V3-V7, SD-19)', () => {
  const markers = [
    "it.skip('x', () => {})",
    "it.skip ('x', () => {})",
    "test.skip.each([1])('x', () => {})",
    "it.todo.each([1])('x')",
    "describe.only('x', () => {})",
    "test.only('x', () => {})",
    "it.todo('later')",
    "test.fixme('x', async () => {})",
    "test.describe.fixme('x', () => {})",
    "test.describe.skip('x', () => {})",
    "it.concurrent.skip('x', () => {})",
    "it.fails('x', () => { expect(1).toBe(2) })",
    "test.fail('x', async () => {})",
    "test('x', async ({ page }) => { test.fail(); })",
    "test('x', async ({ page }) => { test.skip(true, 'not on CI'); })",
    "describe.skipIf(isCI)('x', () => {})",
    "it.runIf(false)('x', () => {})",
    "xit('x', () => {})",
    "xdescribe('x', () => {})",
    "xtest('x', () => {})",
    "it('x', { skip: true }, () => {})",
    "it('x', { todo: true }, () => {})",
    "it('x', { only: true }, () => {})",
    "it('x', { fails: true }, () => {})",
    "describe['skip']('x', () => {})",
    'it["only"]("x", () => {})',
    "it('x', (ctx) => { ctx.skip() })",
    "it('x', (context) => { context.skip() })",
    "it('x', ({ skip }) => { skip() })",
    "it('x', async ({ expect, skip }) => { skip() })",
    'const s = it.skip;',
  ];
  for (const m of markers) assert.ok((m.match(DISABLE_RE) ?? []).length >= 1, `not counted: ${m}`);
  const plain = [
    "it('skips the tutorial when asked', () => { expect(skipTutorial(state)).toBe(true) })",
    "it('marks the only tank', () => { expect(state.todos).toHaveLength(2) })",
    'expect(result.skipped).toBe(0); const onlyChild = 1; const todoList = [];',
    "test('fixmes nothing', () => { process.exit(0); matrix(1); })",
  ];
  for (const p of plain) assert.equal((p.match(DISABLE_RE) ?? []).length, 0, `counted: ${p}`);
  const files = { 'tests/sim/a.test.ts': "it.skip('x', () => {})\nit.only('y', () => {})\n", 'tests/sim/b.test.ts': "it('z', () => {})\n" };
  assert.deepEqual(skipMarkers(Object.keys(files), (f) => files[f]), { 'tests/sim/a.test.ts': 2 });
});

test('test inventory: a removal needs a known requirement and a committed ADR, and S0 compares with the baseline inventory', () => {
  const known = new Set(['NAV-017']);
  const committed = (id) => id === 'ADR-0010';
  assert.deepEqual(validateTestChanges([{ removed: 'tests/sim/a.test.ts > x', reason: 'r', requirement: 'NAV-017', decision: 'ADR-0010' }], known, committed), []);
  const bad = validateTestChanges([{ removed: 'x', requirement: 'NAV-999', decision: 'ADR-0099' }], known, committed);
  assertHas(bad, '"removed" must be "<file> > <test name>"');
  assertHas(bad, 'unknown requirement NAV-999');
  assertHas(bad, 'decision ADR-0099 is not a committed ADR');
  assert.deepEqual(validateTestChanges({}, known, committed), ['test-changes.json must be a list']);
  // S0's reference is the inventory of the baseline commit, never S0's own file.
  assert.equal(referenceInventoryPath('S0'), 'docs/agent/evidence/S0/test-inventory-baseline.json');
  const s1 = referenceInventoryPath('S1');
  assert.ok(s1 === null || s1 === 'docs/agent/evidence/S0/test-inventory.json', String(s1));
});

// ---------------------------------------------------------------------------------------------------------------
// relaunch.mjs
// ---------------------------------------------------------------------------------------------------------------

test('relaunch: stop conditions, alarms first', () => {
  const after = { ...baseState(), machineState: 'NEXT_SLICE' };
  const base = { alarms: [], exitCode: 0, after, checkErrors: [], dirty: false, progressed: true, stopFile: false, sessionsRun: 1, maxSessions: 6 };
  assert.equal(decide(base).action, 'continue');
  const alarm = decide({ ...base, alarms: ["origin's refs changed", '.git/hooks changed'], exitCode: 1, checkErrors: ['x'] });
  assert.deepEqual(alarm, { action: 'stop', reason: "origin's refs changed; .git/hooks changed", alarm: true });
  const stops = [
    [{ exitCode: 2 }, /exited with code 2/],
    [{ checkErrors: ['x'] }, /check-state\.mjs found 1 error/],
    [{ after: { ...after, remoteMutationAllowed: true } }, /remote permission/],
    [{ after: { ...after, machineState: 'OWNER_GATE', ownerGateReason: 'DESIGN_PENDING:DESIGN-S3D' } }, /OWNER_GATE \(DESIGN_PENDING:DESIGN-S3D\)/],
    [{ after: { ...after, machineState: 'BLOCKED_MANUAL_REVIEW' } }, /BLOCKED_MANUAL_REVIEW/],
    [{ after: { ...after, machineState: 'COMPLETE_LOCAL' } }, /COMPLETE_LOCAL/],
    [{ after: { ...after, ownerGateRequired: true } }, /owner gate required/],
    [{ dirty: true }, /uncommitted changes/],
    [{ progressed: false }, /no recorded progress/],
    [{ stopFile: true }, /docs\/agent\/STOP exists/],
    [{ sessionsRun: 6 }, /session cap \(6\)/],
    [{ sessionsRun: 1000, maxSessions: Number.NaN }, /session cap/],
    [{ maxSessions: undefined }, /session cap/],
  ];
  for (const [o, reason] of stops) {
    const d = decide({ ...base, ...o });
    assert.equal(d.action, 'stop', JSON.stringify(o));
    assert.equal(d.alarm, false, JSON.stringify(o));
    assert.match(d.reason, reason);
  }
});

test('relaunch: pre-flight refuses unsafe starts', () => {
  assert.deepEqual(preflight({ state: baseState(), checkErrors: [], stopFile: false, branch: 'agent/x', locked: false }), []);
  const s = { ...baseState(), remoteMutationAllowed: true, machineState: 'BLOCKED_MANUAL_REVIEW', ownerGateRequired: true, ownerGateReason: 'OTHER:x' };
  const problems = preflight({ state: s, checkErrors: ['e'], stopFile: true, branch: 'main', locked: true });
  for (const needle of ['another launcher holds', 'STOP', 'check-state', 'remoteMutationAllowed', 'BLOCKED_MANUAL_REVIEW', 'owner gate required', 'integration branch']) assertHas(problems, needle);
  assertHas(preflight({ state: { ...baseState(), integrationBranch: null }, checkErrors: [], stopFile: false, branch: 'main' }), 'STATE.integrationBranch is not set');
  for (const machineState of ['OWNER_GATE', 'COMPLETE_LOCAL']) assertHas(preflight({ state: { ...baseState(), machineState }, checkErrors: [], stopFile: false, branch: 'agent/x' }), `machineState is ${machineState}`);
});

test('relaunch: alarms for pushes, remote writes, rewritten refs and guard or deploy-config changes (SD-4, SD-5, SD-12, F16, M9)', () => {
  const snap = (o = {}) => ({
    refs: { 'refs/heads/agent/x': 'a1', 'refs/heads/side': 's1', 'refs/remotes/origin/main': 'r1', 'refs/tags/checkpoint/S0-harness': 't1' },
    remote: 'r1\trefs/heads/main\n',
    gitConfig: 'c',
    hooks: 'k',
    claude: 'cl',
    mcp: 'absent',
    userSettings: 'settings.json:u',
    protectedErrors: 0,
    protectedFiles: 'p',
    protectedRecord: 'pr',
    deployConfig: Object.fromEntries(DEPLOY_CONFIG.map((p) => [p, `h-${p}`])),
    ...o,
  });
  const reflogs = { 'refs/remotes/origin/main': ['fetch: fast-forward'], 'refs/remotes/origin/new': ['update by push'], 'refs/remotes/origin/fetched': ['fetch origin: storing head'] };
  const ctx = { integrationBranch: 'agent/x', isAncestor: (a, b) => a === 'a1' && b === 'a2', reflogSubjects: (ref) => reflogs[ref] ?? [] };
  const alarms = (after, before = snap()) => alarmsBetween(before, after, ctx);
  assert.deepEqual(alarms(snap()), []);
  // Normal work: the integration branch moves forward, origin/main moves by fetch, a new tag, a fetched branch.
  assert.deepEqual(alarms(snap({ refs: { ...snap().refs, 'refs/heads/agent/x': 'a2', 'refs/remotes/origin/main': 'r2', 'refs/tags/checkpoint/S1-x': 't2', 'refs/remotes/origin/fetched': 'f1' } })), []);
  const expect = [
    [{ remote: 'r2\trefs/heads/main\n' }, "origin's refs changed during the session"],
    [{ remote: null }, "could not read origin's refs (git ls-remote) after the session"],
    [{ refs: { ...snap().refs, 'refs/heads/agent/x': 'a0' } }, 'the integration branch agent/x was rewound or rewritten'],
    [{ refs: { ...snap().refs, 'refs/heads/side': 's2' } }, 'ref refs/heads/side was moved'],
    [{ refs: { ...snap().refs, 'refs/tags/checkpoint/S0-harness': 't9' } }, 'tag refs/tags/checkpoint/S0-harness was moved'],
    [{ refs: (({ 'refs/heads/side': _s, ...rest }) => rest)(snap().refs) }, 'ref refs/heads/side was deleted'],
    [{ refs: { ...snap().refs, 'refs/remotes/origin/new': 'n1' } }, 'remote-tracking ref refs/remotes/origin/new appeared other than by fetch'],
    [{ gitConfig: 'c2' }, '.git/config changed'],
    [{ hooks: 'k2' }, '.git/hooks changed'],
    [{ claude: 'cl2' }, '.claude settings changed'],
    [{ mcp: 'm1' }, '.mcp.json changed'],
    [{ userSettings: 'settings.json:u2' }, 'user-level Claude Code settings changed'],
    [{ protectedErrors: 1 }, 'protected harness files changed without an approval'],
    [{ protectedFiles: 'p2' }, 'protected harness files or docs/agent/PROTECTED.json changed'],
    [{ protectedRecord: 'pr2' }, 'protected harness files or docs/agent/PROTECTED.json changed'],
  ];
  for (const [o, needle] of expect) assertHas(alarms(snap(o)), needle);
  // A remote-tracking ref moved by a push leaves a non-fetch reflog entry.
  const pushed = alarmsBetween(snap(), snap({ refs: { ...snap().refs, 'refs/remotes/origin/main': 'r2' } }), { ...ctx, reflogSubjects: () => ['update by push'] });
  assertHas(pushed, 'remote-tracking ref refs/remotes/origin/main changed other than by fetch');
  // Origin unreadable before the session: nothing can rule out a push.
  assertHas(alarms(snap(), snap({ remote: null })), "could not read origin's refs (git ls-remote) before the session");
  for (const p of DEPLOY_CONFIG) assertHas(alarms(snap({ deployConfig: { ...snap().deployConfig, [p]: 'changed' } })), `deploy configuration changed (${p})`);
});

test('relaunch: deploy configuration covers both channels\' build inputs (SD-12)', () => {
  assert.deepEqual([...DEPLOY_CONFIG].sort(), ['.github', '.npmrc', 'package-lock.json', 'package.json', 'render.yaml', 'vite.config.ts']);
});

test('relaunch: unattended sessions get no push credentials and their deny rules inline (SD-4, SD-5)', () => {
  const base = { PATH: '/bin', HOME: '/h', GH_TOKEN: 't', GITHUB_TOKEN: 't', GH_ENTERPRISE_TOKEN: 't', GITHUB_ENTERPRISE_TOKEN: 't', RENDER_API_KEY: 'k', VERCEL_TOKEN: 'v', NPM_TOKEN: 'n', SSH_AUTH_SOCK: '/tmp/agent.sock', GIT_ASKPASS: '/usr/bin/askpass', SSH_ASKPASS: '/usr/bin/askpass' };
  const env = childEnv(base, 2);
  for (const k of ['GH_TOKEN', 'GITHUB_TOKEN', 'GH_ENTERPRISE_TOKEN', 'GITHUB_ENTERPRISE_TOKEN', 'RENDER_API_KEY', 'VERCEL_TOKEN', 'NPM_TOKEN', 'SSH_AUTH_SOCK', 'GIT_ASKPASS', 'SSH_ASKPASS']) assert.ok(!(k in env), k);
  assert.equal(base.GH_TOKEN, 't', 'the launcher\'s own environment is untouched');
  assert.equal(env.PATH, '/bin');
  assert.equal(env.GIT_TERMINAL_PROMPT, '0');
  assert.equal(env.GH_CONFIG_DIR, join(ROOT, '.agent-runs', 'gh-config-empty'));
  const config = Object.fromEntries(Array.from({ length: Number(env.GIT_CONFIG_COUNT) }, (_, i) => [env[`GIT_CONFIG_KEY_${i}`], env[`GIT_CONFIG_VALUE_${i}`]]));
  assert.deepEqual(config, { 'credential.helper': '', 'credential.https://github.com.helper': '' });
  assert.equal(env.CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS, String(2 * 3600000));

  const argv = claudeArgs({ kickoff: 'Start.', slice: 'S1', stamp: 'STAMP', model: 'opus', effort: 'max', budgetUsd: 40 });
  const after = (flag) => argv[argv.indexOf(flag) + 1];
  assert.equal(argv[0], '-p');
  assert.equal(argv[1], 'Start.');
  assert.equal(after('--permission-mode'), 'auto');
  assert.equal(after('--permission-prompts'), 'none');
  assert.deepEqual(JSON.parse(after('--settings')), { permissions: { deny: DENY_RULES } });
  assert.equal(after('--append-system-prompt'), UNATTENDED_NOTE);
  assert.equal(after('--max-budget-usd'), '40');
  assert.ok(!claudeArgs({ kickoff: 'k', slice: 'S1', stamp: 's' }).includes('--model'));
  assert.match(UNATTENDED_NOTE, /Never push, deploy, publish/);
});

test('relaunch: the deny rules cover every push, credential, wrapper and history-rewrite form the reviews found (SD-4, SD-14, F16, M9)', () => {
  // Rules are "Bash(pattern)": `*` matches any run of characters, everything else is literal.
  const rules = DENY_RULES.map((r) => {
    const m = r.match(/^Bash\((.+)\)$/);
    assert.ok(m, `malformed rule ${r}`);
    return new RegExp(`^${m[1].split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
  });
  const denied = (command) => rules.some((re) => re.test(command));
  const mustDeny = [
    'git push',
    'git push origin main',
    'git push --force origin main',
    'git push --tags',
    'git push https://github.com/GrayGrayson1/aquarium-go.git main',
    'git -C /Volumes/Dev/Projects/AquariumGo push origin main',
    'git -C . push',
    'git -c core.logAllRefUpdates=false push origin agent/x',
    'git --git-dir=.git push origin main',
    'git --work-tree=. push origin main',
    'git --no-pager push origin main',
    'git -P push origin main',
    'git --literal-pathspecs push origin main',
    'env git push origin main',
    '/usr/bin/git push origin main',
    '/opt/homebrew/bin/git push origin main',
    "sh -c 'git push origin main'",
    "bash -c 'git push origin main'",
    "zsh -c 'git push origin main'",
    'xargs git push',
    'git credential fill',
    'git remote add backup https://example.com/x.git',
    'git remote set-url origin https://example.com/x.git',
    'git config remote.origin.pushurl https://example.com/x.git',
    'gh pr create --fill',
    'gh api -X POST repos/GrayGrayson1/aquarium-go/dispatches',
    'render deploys create srv-dath0mfavr4c73dgk3j0',
    'curl -X POST https://api.render.com/v1/services/srv-dath0mfavr4c73dgk3j0/deploys',
    'wget https://api.github.com/repos',
    'npm publish',
    'git commit --amend',
    'git commit -a --amend',
    'git commit --no-edit --amend',
    'git reset --hard HEAD~1',
    'git reset --soft HEAD~1',
    'git reset --mixed HEAD~1',
    'git gc --prune=now',
    'git branch -f agent/x HEAD~1',
    'git branch -D side',
    'git branch --delete --force side',
    'git tag -f checkpoint/S0-harness',
    'git tag -d checkpoint/S0-harness',
    'git tag --delete checkpoint/S0-harness',
    'git switch -f main',
    'git switch --discard-changes main',
    'git checkout -f main',
    'git checkout -- src/sim/world.ts',
    'git reflog delete HEAD@{1}',
    'git reflog expire --expire=now --all',
    'git update-ref refs/heads/agent/x HEAD~1',
    'git rebase -i HEAD~3',
    'git filter-branch --force',
    'git stash drop',
    'git clean -fdx',
    'git restore .',
  ];
  for (const c of mustDeny) assert.ok(denied(c), `not denied: ${c}`);
  for (const c of ['git status', 'git log --oneline -5', 'git diff --stat', 'git add -A', 'git commit -m "S1: push notification copy"', 'git fetch origin', 'npm test', 'node scripts/agent/check-state.mjs', 'git --version']) {
    assert.ok(!denied(c), `denied: ${c}`);
  }
});

test('relaunch: the kickoff prompt is the first text block', () => {
  assert.equal(extractKickoff('x\n```text\nline one\nline two\n```\n```text\nother\n```'), 'line one line two');
  assert.throws(() => extractKickoff('no block'), /no ```text block/);
  assert.ok(extractKickoff(readText(PATHS.kickoff)).length > 20);
});

// ---------------------------------------------------------------------------------------------------------------
// capture-evidence.mjs, evidence.mjs
// ---------------------------------------------------------------------------------------------------------------

test('reviews must state the verdict they are recorded with, on their last line (H2, SD-9, F11)', () => {
  assert.equal(reportVerdict('# Review\n\nVerdict: GREEN\n'), 'GREEN');
  assert.equal(reportVerdict('**Verdict:** YELLOW\n\n'), 'YELLOW');
  assert.equal(reportVerdict('Verdict: red'), 'RED');
  // A legend quoted in the report, or a verdict anywhere but the last line, isn't the verdict.
  const legend = 'End the report with a line `Verdict: GREEN`, `Verdict: YELLOW` or `Verdict: RED`.';
  assert.equal(reportVerdict(`${legend}\n\nVerdict: RED\n`), 'RED');
  assert.equal(reportVerdict(`Verdict: GREEN\n\nOne more thing.\n`), null);
  assert.equal(reportVerdict('Verdict: GREEN|YELLOW|RED'), null);
  assert.equal(reportVerdict('Verdict: RED (not GREEN yet)'), null);
  assert.equal(reportVerdict('VERDICT — YELLOW'), null);
  assert.ok(reportStatesVerdict('Verdict: GREEN', 'GREEN'));
  assert.ok(!reportStatesVerdict(`${legend}\nVerdict: RED`, 'GREEN'));
  // The S0 reviews on file end with their verdicts.
  assert.equal(reportVerdict(readText('docs/agent/evidence/S0/reviews/adversarial-1.md')), 'RED');
});

test('capture-evidence: a review is recorded only from the reviewer\'s own report under evidence/<slice>/reviews/ (SD-9)', () => {
  const report = 'docs/agent/evidence/S1/reviews/adversarial-1.md';
  const files = { [report]: 'Findings.\n\nVerdict: GREEN\n', 'docs/agent/evidence/S1/reviews/legend.md': 'Ends with `Verdict: GREEN` or `Verdict: RED`.\nVerdict: RED\n', '.agent-runs/review.md': 'Verdict: GREEN\n' };
  const io = { exists: (p) => p in files, read: (p) => files[p] };
  const problems = (o) => reviewProblems({ role: 'adversarial', verdict: 'GREEN', report, ...o }, 'S1', io);
  assert.deepEqual(problems({}), []);
  assertHas(problems({ role: undefined }), '--review needs --role');
  assertHas(problems({ verdict: true }), '--review needs --verdict');
  assertHas(problems({ verdict: 'GREENISH' }), '--verdict must be one of GREEN, YELLOW, RED');
  for (const elsewhere of ['.agent-runs/review.md', 'docs/agent/evidence/S0/reviews/adversarial-1.md', 'docs/agent/evidence/S1/reviews/../../../../../.agent-runs/review.md', '/tmp/review.md', 'README.md']) {
    assertHas(problems({ report: elsewhere }), 'must be the reviewer\'s own file under docs/agent/evidence/S1/reviews/');
  }
  assertHas(problems({ report: 'docs/agent/evidence/S1/reviews/missing.md' }), 'does not exist');
  assertHas(problems({ report: 'docs/agent/evidence/S1/reviews/legend.md' }), 'ends with "Verdict: RED", not "Verdict: GREEN"');
});

test('evidence: counts from Vitest, Playwright and tsc output', () => {
  const vitest = parseCounts(' Test Files  151 passed (151)\n      Tests  1753 passed (1753)\n');
  assert.equal(vitest.vitestFiles, '151 passed (151)');
  assert.equal(vitest.vitestTests, '1753 passed (1753)');
  const pw = parseCounts('  45 passed (3.1m)\n  2 failed\n  1 flaky\n');
  assert.equal(pw.playwright_passed, 45);
  assert.equal(pw.playwright_failed, 2);
  assert.equal(pw.playwright_flaky, 1);
  assert.equal(parseCounts('a.ts(1,1): error TS2322: x\nb.ts(2,2): error TS2345: y').tsErrors, 2);
});

test('evidence: oversized logs keep their tail in Git and the full copy outside it', () => {
  const rel = '.agent-runs/test-tmp/big.log';
  mkdirSync(join(ROOT, '.agent-runs/test-tmp'), { recursive: true });
  const line = 'x'.repeat(600);
  const text = Array.from({ length: 2500 }, (_, i) => `${i} ${line}`).join('\n');
  writeFileSync(join(ROOT, rel), text);
  try {
    assert.equal(trimLog(rel, 'small', 'TEST'), null);
    const full = trimLog(rel, text, 'TEST');
    assert.ok(full && full.bytes > LOG_LIMIT_BYTES);
    assert.ok(full.path.startsWith('.agent-runs/'), 'the full log stays outside Git');
    const kept = readFileSync(join(ROOT, rel), 'utf8');
    assert.ok(kept.startsWith('[trimmed: last 2000 of 2500 lines'));
    assert.ok(kept.endsWith(`2499 ${line}`));
    assert.equal(readFileSync(join(ROOT, full.path), 'utf8'), text);
  } finally {
    rmSync(join(ROOT, '.agent-runs/test-tmp'), { recursive: true, force: true });
    rmSync(join(ROOT, '.agent-runs/evidence/TEST'), { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// next-slice.mjs, record-event.mjs, verify-slice.mjs, context-pack.mjs, handoff.mjs
// ---------------------------------------------------------------------------------------------------------------

test('next-slice: the next slice starts with fresh gates, the mandatory reviewers and a rollover (OPERATIONS.md §6)', () => {
  assert.deepEqual(MANDATORY_REVIEWERS, ['code-architecture', 'adversarial']);
  const closing = { ...baseState(), currentSlice: 'S0', currentTask: 'S0-T12', machineState: 'NEXT_SLICE', repairAttempt: 1, repairTotalAttempts: 2, repairTarget: 'D-S0-1', repairOverrides: { 'D-S0-1': 'ADR-0010' }, gates: { ...gatesOf('GREEN'), browserQa: 'NOT_APPLICABLE' } };
  const reviewers = ['code-architecture', 'adversarial', 'browser-qa'];
  assert.throws(() => nextState({ ...closing, machineState: 'HANDOFF' }, { reviewers }), /record HANDOFF → NEXT_SLICE first/);
  assert.throws(() => nextState({ ...closing, currentSlice: 'S4' }, { reviewers }), /S4 is the last slice: the next step is MULTIPLAYER_READINESS_GATE/);
  assert.throws(() => nextState(closing, { reviewers: ['code-architecture'] }), /needs the adversarial reviewer/);
  assert.throws(() => nextState(closing, { reviewers: ['adversarial', 'security-data'] }), /needs the code-architecture reviewer/);
  const s = nextState(closing, { reviewers });
  assert.equal(s.currentSlice, 'S1');
  assert.equal(s.currentTask, 'S1-BOOTSTRAP');
  assert.equal(s.machineState, 'NEXT_SLICE');
  assert.deepEqual(s.gates, gatesOf('PENDING'));
  assert.deepEqual(s.requiredReviewers, reviewers);
  assert.deepEqual([s.repairAttempt, s.repairTotalAttempts, s.repairTarget, s.repairOverrides, s.contextRolloverRequired], [0, 0, null, {}, true]);
  assert.equal(nextState(closing, { reviewers, browser: false }).gates.browserQa, 'NOT_APPLICABLE');
  assert.deepEqual(validateState(s), { errors: [], warnings: [] });
});

test('record-event: STATE follows a transition, and the owner-gate fields are set on entry and cleared on exit', () => {
  const e = buildEvent({ kind: 'transition', actor: 'o', slice: 'S1', task: 'S1-T1', from: 'IMPLEMENT', to: 'OWNER_GATE', result: 'r', reason: 'DESIGN_PENDING:DESIGN-S3D', resume: 'IMPLEMENT', decision: ['ADR-0005'], evidence: 'a.log', distinct: true });
  assert.deepEqual([e.fromState, e.toState, e.reason, e.resume, e.decisions, e.evidence, e.distinct], ['IMPLEMENT', 'OWNER_GATE', 'DESIGN_PENDING:DESIGN-S3D', 'IMPLEMENT', ['ADR-0005'], ['a.log'], true]);
  const gated = stateAfter(baseState(), e);
  assert.deepEqual([gated.machineState, gated.ownerGateRequired, gated.ownerGateReason, gated.resumeState], ['OWNER_GATE', true, 'DESIGN_PENDING:DESIGN-S3D', 'IMPLEMENT']);
  assert.deepEqual(validateState(gated).errors, []);
  const resumed = stateAfter(gated, { fromState: 'OWNER_GATE', toState: 'IMPLEMENT' });
  assert.deepEqual([resumed.machineState, resumed.ownerGateRequired, resumed.ownerGateReason, resumed.resumeState], ['IMPLEMENT', false, null, null]);
  assert.equal(buildEvent({ kind: 'note', actor: 'o', slice: 'S1', task: 'T', result: 'r' }).fromState, null);
});

test('verify-slice: gate selection skips not-applicable gates and rejects unknown ones', () => {
  const s = { ...baseState(), gates: { ...baseState().gates, e2e: 'NOT_APPLICABLE' } };
  const gates = selectGates(s, null);
  assert.ok(gates.includes('unit') && gates.includes('harnessTests') && !gates.includes('e2e') && !gates.includes('independentReview') && !gates.includes('browserQa'));
  assert.throws(() => selectGates(s, ['independentReview']), /no command for gate/);
  assert.throws(() => selectGates(s, ['browserQa']), /no command for gate/);
  assert.deepEqual(selectGates(s, ['e2e']), ['e2e']);
});

test('context pack: sections and cited design headings', () => {
  const doc = '# A\ntext\n## 3. Hard\nkeep\n# PART II\nnot';
  assert.equal(section(doc, '## 3. Hard', '# PART II'), '## 3. Hard\nkeep');
  const design = '## 5. Navigation\n### 5.2 Phone tab bar (new)\n## 10. Automation';
  assert.deepEqual(citedDesignHeadings(['§5.2', '§10', '§99'], design), ['- §10: 10. Automation', '- §5.2: 5.2 Phone tab bar (new)']);
});

test('context pack: only "design §" citations count, and ranges are expanded (M8)', () => {
  const sorted = (texts, sections) => designCitations(texts, sections).sort();
  assert.deepEqual(sorted(['master §9 S1; OPERATIONS.md §6, §10; master §12-§16']), []);
  assert.deepEqual(sorted(['design §12-§16']), ['§12', '§13', '§14', '§15', '§16']);
  assert.deepEqual(sorted(['design §12.2-§12.5']), ['§12.2', '§12.3', '§12.4', '§12.5']);
  assert.deepEqual(sorted(['design §5.1, §5.2 and §10; master §9']), ['§10', '§5.1', '§5.2']);
  assert.deepEqual(sorted(['design §5.9–§6.1']), ['§5.9', '§6.1']);
  assert.deepEqual(sorted(['design §1-§500']), ['§1', '§500']);
  assert.deepEqual(sorted([], ['§3', '20.3']), ['§20.3', '§3']);
});

test('context pack: the reviewer pack leaves out the handoff and the ledger (M8, F12, SD-13)', () => {
  const handoff = readText(PATHS.handoff).trim();
  const builder = buildPack();
  const reviewer = buildPack({ forReviewer: true });
  assert.ok(builder.includes('## Handoff') && builder.includes(handoff));
  assert.ok(!reviewer.includes('## Handoff'));
  assert.ok(!reviewer.includes(handoff));
  const ledgerLine = readText(PATHS.ledger).split('\n')[0];
  assert.ok(ledgerLine.length > 20 && !reviewer.includes(ledgerLine) && !builder.includes(ledgerLine));
  assert.ok(reviewer.includes('## Current slice'));
});

test('handoff: replaces only the generated block', () => {
  const text = `# HANDOFF\n${START}\nold\n${END}\n\n## Exact next legal action\nkeep me\n`;
  const out = replaceBlock(text, `${START}\nnew\n${END}`);
  assert.ok(out.includes('new') && !out.includes('old') && out.includes('keep me'));
  assert.ok(replaceBlock('# HANDOFF\n\nbody\n', `${START}\nnew\n${END}`).startsWith(`# HANDOFF\n\n${START}`));
});
