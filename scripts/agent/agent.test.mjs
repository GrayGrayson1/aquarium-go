/**
 * Tests for the agent harness scripts. Run: node --test 'scripts/agent/*.test.mjs'
 * (Node's built-in runner; no dependencies. Vitest doesn't collect these.)
 */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { ROOT, isLegalTransition, parseArgs, parseLedger, validateEvent } from './lib.mjs';
import {
  validateEvidenceFiles,
  validateGateEvidence,
  validateLedger,
  validateRegistry,
  validateRepairCount,
  validateRequirements,
  validateState,
  validateStateAgainstLedger,
} from './check-state.mjs';
import { MANDATED_READS, checkAssertion } from './bootstrap-check.mjs';
import { compareInventories, playwrightIds, vitestIds } from './test-inventory.mjs';
import { compareProtected } from './protect.mjs';
import { auditRequirements } from './requirements-audit.mjs';
import { decide, extractKickoff, preflight } from './relaunch.mjs';
import { LOG_LIMIT_BYTES, codeTreeOf, parseCounts, trimLog } from './evidence.mjs';
import { reportStatesVerdict } from './capture-evidence.mjs';
import { selectGates } from './verify-slice.mjs';
import { citedDesignHeadings, section } from './context-pack.mjs';
import { END, START, replaceBlock } from './handoff.mjs';

const SHA = 'a'.repeat(40);
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
  requiredReviewers: ['code-architecture'],
  gates: { typecheck: 'PENDING', unit: 'PENDING', build: 'PENDING', e2e: 'PENDING', diffCheck: 'PENDING', independentReview: 'PENDING', browserQa: 'NOT_YET_REQUIRED' },
});
const req = (o) => ({ id: 'NAV-001', slice: 'S1', source: 'design §5.2', description: 'tab bar', acceptance: ['five tabs'], tasks: [], tests: [], evidence: [], status: 'PENDING', ...o });

test('a valid state passes', () => {
  assert.deepEqual(validateState(baseState()).errors, []);
});

test('state: illegal machine state, unknown gate value and missing gates are errors', () => {
  const s = baseState();
  s.machineState = 'DONE';
  s.gates.unit = 'PASSED';
  delete s.gates.e2e;
  const { errors } = validateState(s);
  assert.ok(errors.some((e) => e.includes('not a legal state')));
  assert.ok(errors.some((e) => e.includes('gates.unit has unknown value PASSED')));
  assert.ok(errors.some((e) => e.includes('gates.e2e is missing')));
});

test('state: MULTIPLAYER_READINESS_GATE is a legal state', () => {
  const s = baseState();
  s.machineState = 'MULTIPLAYER_READINESS_GATE';
  assert.ok(!validateState(s).errors.some((e) => e.includes('legal state')));
});

test('state: remote or multiplayer permission needs an ADR reference', () => {
  const s = baseState();
  s.remoteMutationAllowed = true;
  s.multiplayerApproved = true;
  const { errors } = validateState(s);
  assert.ok(errors.some((e) => e.includes('remoteApproval')));
  assert.ok(errors.some((e) => e.includes('multiplayerApproval')));
});

test('state: three repair attempts force BLOCKED_MANUAL_REVIEW, and repairs name their defect', () => {
  const s = baseState();
  s.repairAttempt = 3;
  const { errors } = validateState(s);
  assert.ok(errors.some((e) => e.includes('BLOCKED_MANUAL_REVIEW')));
  assert.ok(errors.some((e) => e.includes('repairTarget')));
});

test('state: OWNER_GATE needs a reason', () => {
  const s = baseState();
  s.machineState = 'OWNER_GATE';
  assert.ok(validateState(s).errors.some((e) => e.includes('ownerGateReason')));
});

test('evidence: a GREEN gate needs a passing recorded run on the same code tree', () => {
  const s = baseState();
  s.gates.unit = 'GREEN';
  assert.ok(validateGateEvidence(s, { commands: [] }).errors.some((e) => e.includes('no recorded')));
  const failing = { commands: [{ gate: 'unit', exitCode: 1, codeTree: 't1' }] };
  assert.ok(validateGateEvidence(s, failing).errors.some((e) => e.includes('exited 1')));
  const stale = { commands: [{ gate: 'unit', exitCode: 0, codeTree: 'old' }] };
  assert.ok(validateGateEvidence(s, stale, { codeTree: 'new', acceptedTree: true }).errors.some((e) => e.includes('re-run')));
  assert.ok(validateGateEvidence(s, stale, { codeTree: 'new', acceptedTree: false }).warnings.some((e) => e.includes('re-run')));
  const ok = { commands: [{ gate: 'unit', exitCode: 0, codeTree: 'new' }] };
  assert.deepEqual(validateGateEvidence(s, ok, { codeTree: 'new', acceptedTree: true }).errors, []);
});

test('evidence: acceptance needs every gate GREEN, a GREEN review per required role and a GREEN manifest', () => {
  const s = baseState();
  s.machineState = 'CHECKPOINT';
  const { errors } = validateGateEvidence(s, null);
  assert.ok(errors.some((e) => e.includes('gate typecheck is PENDING')));
  assert.ok(errors.some((e) => e.includes('code-architecture review')));
  assert.ok(errors.some((e) => e.includes('manifest.json is missing')));
});

test('evidence: independentReview GREEN without a recorded GREEN review is an error', () => {
  const s = baseState();
  s.gates.independentReview = 'GREEN';
  assert.ok(validateGateEvidence(s, { reviews: [{ role: 'code-architecture', verdict: 'YELLOW' }] }).errors.some((e) => e.includes('no GREEN code-architecture review')));
});

test('requirements: schema, append-only ids and GREEN evidence', () => {
  assert.deepEqual(validateRequirements({ requirements: [req()] }, null).errors, []);
  const bad = validateRequirements({ requirements: [req({ id: 'XYZ-1', status: 'DONE', acceptance: [] })] }, null).errors;
  assert.ok(bad.some((e) => e.includes('FAMILY-NNN')));
  assert.ok(bad.some((e) => e.includes('unknown status')));
  assert.ok(bad.some((e) => e.includes('acceptance criterion')));
  assert.ok(validateRequirements({ requirements: [req({ status: 'GREEN' })] }, null).errors.some((e) => e.includes('GREEN without')));
  const deleted = validateRequirements({ requirements: [req()] }, { requirements: [req(), req({ id: 'NAV-002' })] }).errors;
  assert.ok(deleted.some((e) => e.includes('NAV-002 exists at HEAD but was deleted')));
  assert.ok(validateRequirements({ requirements: [req({ status: 'DEFERRED' })] }, null).errors.some((e) => e.includes('decision')));
});

test('requirements audit: tasks after PLAN_LOCK, accepted slices closed, unknown ids in the slice contract', () => {
  const s = baseState();
  const reqs = { requirements: [req(), req({ id: 'HARNESS-001', slice: 'S0', status: 'PENDING' })] };
  const r = auditRequirements(reqs, s, { sliceText: 'S1-T1 covers NAV-001 and NAV-099' });
  assert.ok(r.errors.some((e) => e.includes('NAV-001 (S1) has no task after PLAN_LOCK')));
  assert.ok(r.errors.some((e) => e.includes('HARNESS-001 belongs to accepted slice S0')));
  assert.ok(r.errors.some((e) => e.includes('unknown requirement NAV-099')));
  s.machineState = 'PLAN_LOCK';
  assert.ok(auditRequirements({ requirements: [req()] }, s).warnings.some((e) => e.includes('no task yet')));
});

test('ledger: valid events, rewrites detected, transitions need legal states', () => {
  const ev = { timestamp: '2026-10-05T00:00:00Z', kind: 'transition', actor: 'orchestrator', slice: 'S0', task: 'S0-T1', fromState: 'BOOTSTRAP', toState: 'BASELINE_VERIFY', result: 'ok', evidence: [], decisions: [] };
  assert.deepEqual(validateEvent(ev), []);
  assert.ok(validateEvent({ ...ev, toState: 'SHIPPED' }).some((p) => p.includes('not a legal state')));
  assert.ok(validateEvent({ ...ev, fromState: null }).some((p) => p.includes('needs fromState')));
  const line = `${JSON.stringify(ev)}\n`;
  assert.deepEqual(validateLedger(line + line, line).errors, []);
  assert.ok(validateLedger(line, line + line).errors.some((e) => e.includes('rewritten')));
  assert.equal(parseLedger('{"a":1}\nnot json\n').errors.length, 1);
});

test('design registry: APPROVED needs an approval and an existing path', () => {
  const reg = { designs: [{ id: 'D1', status: 'APPROVED', approval: null, path: 'missing.md' }, { id: 'D2', status: 'MAYBE' }] };
  const { errors } = validateRegistry(reg, () => false);
  assert.ok(errors.some((e) => e.includes('without an approval')));
  assert.ok(errors.some((e) => e.includes('does not exist')));
  assert.ok(errors.some((e) => e.includes('unknown status MAYBE')));
});

test('relaunch: stop conditions, alarms first', () => {
  const after = { ...baseState(), machineState: 'NEXT_SLICE' };
  const base = { exitCode: 0, after, checkErrors: [], progressed: true, stopFile: false, sessionsRun: 1, maxSessions: 6, deployConfigChanged: [], remotesChanged: false, pushesDetected: false };
  assert.equal(decide(base).action, 'continue');
  assert.deepEqual({ ...decide({ ...base, pushesDetected: true, exitCode: 1 }) }.alarm, true);
  assert.equal(decide({ ...base, remotesChanged: true }).alarm, true);
  assert.equal(decide({ ...base, deployConfigChanged: ['render.yaml'] }).alarm, true);
  assert.match(decide({ ...base, exitCode: 2 }).reason, /exited with code 2/);
  assert.match(decide({ ...base, checkErrors: ['x'] }).reason, /check-state/);
  assert.match(decide({ ...base, after: { ...after, machineState: 'OWNER_GATE', ownerGateReason: 'DESIGN_PENDING:DESIGN-S3D' } }).reason, /DESIGN_PENDING/);
  assert.match(decide({ ...base, after: { ...after, ownerGateRequired: true } }).reason, /owner gate/);
  assert.match(decide({ ...base, after: { ...after, remoteMutationAllowed: true } }).reason, /remote permission/);
  assert.match(decide({ ...base, progressed: false }).reason, /no recorded progress/);
  assert.match(decide({ ...base, stopFile: true }).reason, /STOP/);
  assert.match(decide({ ...base, sessionsRun: 6 }).reason, /cap/);
});

test('relaunch: pre-flight refuses unsafe starts', () => {
  const ok = preflight({ state: baseState(), checkErrors: [], stopFile: false, branch: 'agent/x' });
  assert.deepEqual(ok, []);
  const s = { ...baseState(), remoteMutationAllowed: true, machineState: 'BLOCKED_MANUAL_REVIEW' };
  const problems = preflight({ state: s, checkErrors: ['e'], stopFile: true, branch: 'main' });
  for (const needle of ['STOP', 'check-state', 'remoteMutationAllowed', 'BLOCKED_MANUAL_REVIEW', 'integration branch']) {
    assert.ok(problems.some((p) => p.includes(needle)), needle);
  }
});

test('relaunch: the kickoff prompt is the first text block', () => {
  assert.equal(extractKickoff('x\n```text\nline one\nline two\n```\n```text\nother\n```'), 'line one line two');
  assert.throws(() => extractKickoff('no block'));
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

test('reviews must state the verdict they are recorded with', () => {
  assert.ok(reportStatesVerdict('# Review\n\nVerdict: GREEN\n', 'GREEN'));
  assert.ok(reportStatesVerdict('**Verdict:** GREEN', 'GREEN'));
  assert.ok(reportStatesVerdict('VERDICT — YELLOW', 'YELLOW'));
  assert.ok(!reportStatesVerdict('# Review\n\nVerdict: RED\n', 'GREEN'));
  assert.ok(!reportStatesVerdict('Verdict: RED (not GREEN yet)', 'GREEN'));
});

test('verify-slice: gate selection skips not-applicable gates and rejects unknown ones', () => {
  const s = baseState();
  s.gates.e2e = 'NOT_APPLICABLE';
  const gates = selectGates(s, null);
  assert.ok(gates.includes('unit') && !gates.includes('e2e') && !gates.includes('independentReview'));
  assert.throws(() => selectGates(s, ['independentReview']));
});

test('context pack: sections and cited design headings', () => {
  const doc = '# A\ntext\n## 3. Hard\nkeep\n# PART II\nnot';
  assert.equal(section(doc, '## 3. Hard', '# PART II'), '## 3. Hard\nkeep');
  const design = '## 5. Navigation\n### 5.2 Phone tab bar (new)\n## 10. Automation';
  assert.deepEqual(citedDesignHeadings('see §5.2 and §10', design), ['- §10: 10. Automation', '- §5.2: 5.2 Phone tab bar (new)']);
});

test('handoff: replaces only the generated block', () => {
  const text = `# HANDOFF\n${START}\nold\n${END}\n\n## Exact next legal action\nkeep me\n`;
  const out = replaceBlock(text, `${START}\nnew\n${END}`);
  assert.ok(out.includes('new') && !out.includes('old') && out.includes('keep me'));
  assert.ok(replaceBlock('# HANDOFF\n\nbody\n', `${START}\nnew\n${END}`).startsWith(`# HANDOFF\n\n${START}`));
});

test('transitions: the table is enforced, any state may go to OWNER_GATE, gated exits need a decision', () => {
  const ev = (fromState, toState, decisions = []) => ({ timestamp: '2026-10-05T00:00:00Z', kind: 'transition', actor: 'o', slice: 'S1', task: 'T', fromState, toState, result: 'r', evidence: [], decisions });
  assert.ok(isLegalTransition('ADVERSARIAL_REVIEW', 'ACCEPT'));
  assert.ok(!isLegalTransition('IMPLEMENT', 'ACCEPT'));
  assert.ok(!isLegalTransition('TARGETED_VERIFY', 'CHECKPOINT'));
  assert.ok(isLegalTransition('IMPLEMENT', 'OWNER_GATE'));
  assert.ok(validateEvent(ev('IMPLEMENT', 'ACCEPT')).some((p) => p.includes('not a legal transition')));
  assert.ok(validateEvent(ev('OWNER_GATE', 'IMPLEMENT')).some((p) => p.includes('needs a recorded decision')));
  assert.deepEqual(validateEvent(ev('OWNER_GATE', 'IMPLEMENT', ['ADR-0004'])), []);
  assert.ok(validateEvent(ev('BLOCKED_MANUAL_REVIEW', 'REPAIR')).some((p) => p.includes('needs a recorded decision')));
  assert.ok(isLegalTransition('HANDOFF', 'MULTIPLAYER_READINESS_GATE') && isLegalTransition('MULTIPLAYER_READINESS_GATE', 'OWNER_GATE'));
});

test('repair events name their defect; repair limits force BLOCKED_MANUAL_REVIEW', () => {
  const ev = { timestamp: '2026-10-05T00:00:00Z', kind: 'repair', actor: 'o', slice: 'S1', task: 'T', result: 'attempt 1', evidence: [], decisions: [] };
  assert.ok(validateEvent(ev).some((p) => p.includes('defect')));
  assert.deepEqual(validateEvent({ ...ev, defect: 'D-S1-1' }), []);
  const s = baseState();
  s.repairTarget = 'D-S1-1';
  s.repairAttempt = 2;
  s.repairTotalAttempts = 5;
  assert.ok(validateState(s).errors.some((e) => e.includes('repair limit')));
  s.repairTotalAttempts = 1;
  assert.ok(validateState(s).errors.some((e) => e.includes('repairTotalAttempts')));
  s.repairTotalAttempts = 3;
  assert.deepEqual(validateState(s).errors, []);
});

test('state must match the last recorded transition', () => {
  const t = (toState) => ({ kind: 'transition', toState });
  assert.deepEqual(validateStateAgainstLedger({ machineState: 'IMPLEMENT' }, [t('PLAN_LOCK'), t('IMPLEMENT')]).errors, []);
  assert.ok(validateStateAgainstLedger({ machineState: 'ACCEPT' }, [t('IMPLEMENT')]).errors[0].includes('last recorded transition'));
  assert.deepEqual(validateStateAgainstLedger({ machineState: 'BOOTSTRAP' }, []).warnings, []);
});

test('OWNER_GATE needs a resume state', () => {
  const s = baseState();
  s.machineState = 'OWNER_GATE';
  s.ownerGateReason = 'DESIGN_PENDING:DESIGN-S3D';
  assert.ok(validateState(s).errors.some((e) => e.includes('resumeState')));
  s.resumeState = 'IMPLEMENT';
  assert.deepEqual(validateState(s).errors, []);
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
    const kept = readFileSync(join(ROOT, rel), 'utf8');
    assert.ok(kept.startsWith('[trimmed: last 2000 of 2500 lines'));
    assert.ok(kept.endsWith(`2499 ${line}`));
    assert.equal(readFileSync(join(ROOT, full.path), 'utf8'), text);
  } finally {
    rmSync(join(ROOT, '.agent-runs/test-tmp'), { recursive: true, force: true });
    rmSync(join(ROOT, '.agent-runs/evidence/TEST'), { recursive: true, force: true });
  }
});

test('code tree ignores docs/agent and is stable for a commit', () => {
  const a = codeTreeOf('HEAD');
  assert.match(a, /^[0-9a-f]{40}$/);
  assert.equal(codeTreeOf('HEAD'), a);
});

test('evidence files: missing, edited, ignored and flaky evidence is caught', () => {
  const manifest = {
    commands: [
      { gate: 'unit', exitCode: 1, codeTree: 't', log: 'docs/agent/evidence/S1/logs/a.log', logSha256: 'h1' },
      { gate: 'unit', exitCode: 0, codeTree: 't', log: 'docs/agent/evidence/S1/logs/b.log', logSha256: 'h2', fullLog: { path: '.agent-runs/x.log', sha256: 'h3' } },
    ],
    reviews: [{ report: 'docs/agent/evidence/S1/reviews/r.md', reportSha256: 'h4' }],
  };
  const files = { 'docs/agent/evidence/S1/logs/a.log': 'h1', 'docs/agent/evidence/S1/logs/b.log': 'CHANGED', 'docs/agent/evidence/S1/reviews/r.md': 'h4' };
  const r = validateEvidenceFiles(manifest, { exists: (p) => p in files, hash: (p) => files[p], ignored: (p) => p.endsWith('r.md') });
  assert.ok(r.errors.some((e) => e.includes('b.log no longer matches')));
  assert.ok(r.errors.some((e) => e.includes('r.md is ignored by Git')));
  assert.ok(r.warnings.some((e) => e.includes('.agent-runs/x.log') && e.includes('missing')));
  assert.ok(r.warnings.some((e) => e.includes('FLAKY')));
});

test('repair counts can not be understated', () => {
  const s = { repairTarget: 'D-S1-1', repairTotalAttempts: 1 };
  const ev = [{ kind: 'repair', defect: 'D-S1-1' }, { kind: 'repair', defect: 'D-S1-1' }, { kind: 'repair', defect: 'D-S1-2' }];
  assert.ok(validateRepairCount(s, ev).errors[0].includes('2 repair attempt'));
  assert.deepEqual(validateRepairCount({ ...s, repairTotalAttempts: 2 }, ev).errors, []);
});

test('bootstrap assertion is checked field by field and must come from a fresh session', () => {
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
    requiredReviewers: ['code-architecture'],
    forbidden: ['git push', 'deploy'],
    firstFiles: ['src/ui/hud/Dock.tsx'],
    risks: ['a', 'b', 'c'],
  };
  const ctx = { state, head: SHA, branch: 'agent/x', events: [{ kind: 'transition', toState: 'NEXT_SLICE', session: 'old' }] };
  assert.deepEqual(checkAssertion(good, ctx), []);
  const bad = checkAssertion({ ...good, sessionId: 'old', task: 'S1-T9', readFiles: ['AGENTS.md'], forbidden: ['nothing'], risks: ['a'] }, ctx);
  for (const needle of ['also closed the previous slice', 'STATE.currentTask', 'README_FIRST', '"push"', 'three risks']) {
    assert.ok(bad.some((e) => e.includes(needle)), needle);
  }
  assert.ok(checkAssertion({ ...good, expectedSha: 'b'.repeat(40) }, ctx).some((e) => e.includes('reconcile')));
});

test('test inventory: disappearing tests, dropped counts and new skips fail; approved removals pass', () => {
  const base = { vitest: { count: 3, tests: ['a > 1', 'a > 2', 'b > 1'] }, playwright: { count: 1, tests: ['e > x [desktop]'] }, skipMarkers: { 'tests/e2e/perf.spec.ts': 1 } };
  const now = { vitest: { count: 2, tests: ['a > 1', 'b > 1'] }, playwright: { count: 1, tests: ['e > x [desktop]'] }, skipMarkers: { 'tests/e2e/perf.spec.ts': 1, 'tests/sim/x.test.ts': 1 } };
  const errors = compareInventories(base, now);
  assert.ok(errors.some((e) => e.includes('disappeared: a > 2')));
  assert.ok(errors.some((e) => e.includes('count dropped')));
  assert.ok(errors.some((e) => e.includes('tests/sim/x.test.ts gained 1')));
  const ok = compareInventories(base, { ...now, skipMarkers: base.skipMarkers }, new Set(['a > 2']));
  assert.deepEqual(ok, []);
  const ids = playwrightIds({ suites: [{ title: 'boot.spec.ts', specs: [], suites: [{ title: 'boot', specs: [{ title: 'first launch', file: 'boot.spec.ts', tests: [{ projectName: 'desktop' }] }] }] }] });
  assert.deepEqual(ids, ['tests/e2e/boot.spec.ts > boot > first launch [desktop]']);
  assert.deepEqual(vitestIds([{ name: 'x > y', file: join(ROOT, 'tests/sim/a.test.ts') }]), ['tests/sim/a.test.ts > x > y']);
});

test('protected files: changes and deletions fail, new files warn', () => {
  const r = compareProtected({ 'a.md': '1', 'b.md': '2' }, { 'a.md': 'X', 'c.md': '3' });
  assert.ok(r.errors.some((e) => e.includes('a.md changed')));
  assert.ok(r.errors.some((e) => e.includes('b.md was deleted')));
  assert.ok(r.warnings.some((e) => e.includes('c.md')));
});

test('args parser handles values, booleans, repeats and kebab-case', () => {
  const a = parseArgs(['--kind', 'note', '--evidence', 'a', '--evidence', 'b', '--dry-run', '--max-sessions=3', 'pos'], ['dryRun']);
  assert.equal(a.kind, 'note');
  assert.deepEqual(a.evidence, ['a', 'b']);
  assert.equal(a.dryRun, true);
  assert.equal(a.maxSessions, '3');
  assert.deepEqual(a._, ['pos']);
});
