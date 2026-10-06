/**
 * Repository-level tests of the harness scripts (code-architecture-harness-2 F5 and F1-F4; security-data-2 M1, M2 and
 * m1; ADR-0011 open point 7). Run with the rest: node --test 'scripts/agent/*.test.mjs'.
 *
 * Each test copies a prepared temporary git repository under os.tmpdir() (the real scripts/agent, without its tests,
 * and a minimal docs/agent) and runs the real scripts there as separate processes: check-state, protect (verify and
 * --update), record-event, diff-check, verify-slice, capture-evidence, next-slice, requirements-audit, and relaunch (a
 * smoke run with a stub --claude program and a PATH that can't reach a real claude). npm and npx are stand-ins whose
 * gate scripts pass or fail on demand, so nothing is installed or fetched. Nothing is written into this repository,
 * nothing reaches the network, the fixtures' git reads neither the user's nor the system's git config (no signing, no
 * hooks), and no `git push` is ever run (the relaunch origin is a bare clone). Each test names the guard it pins.
 * The D-S0-15 tests reach a fixture through a symlink, as every fixture is reached on macOS (os.tmpdir() is under /var,
 * a symlink to /private/var), and check that the scripts still run there.
 *
 * Stages, built once and copied per test: "implement" (S0 in IMPLEMENT, protected hashes recorded), "accept" (every gate
 * run and GREEN, both mandatory reviews GREEN, ADVERSARIAL_REVIEW → ACCEPT, uncommitted), "checkpoint" (the checkpoint
 * commit and tag, ACCEPT → CHECKPOINT recorded, uncommitted) and "prepared" (CHECKPOINT → … → NEXT_SLICE, next-slice.mjs
 * run for S1, committed). If the build fails, every test that needs the stages fails with that first error.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { ROOT } from './lib.mjs';

// ---------------------------------------------------------------------------------------------------------------
// The workspace: stand-in programs and the fixture repositories, all under one temporary directory
// ---------------------------------------------------------------------------------------------------------------

const NODE = process.execPath;
const WORK = mkdtempSync(join(tmpdir(), 'aq-harness-fixtures-'));
after(() => rmSync(WORK, { recursive: true, force: true }));

const executable = (path, body) => {
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
};

/** npm and npx for the fixtures: `npm test` and `npm run <gate>` pass unless FIXTURE_FAIL names them. */
const BIN = join(WORK, 'bin');
mkdirSync(BIN);
writeFileSync(
  join(BIN, 'gates.mjs'),
  [
    '// Stand-in for npm and npx in the harness fixtures: no packages, no network.',
    "import { writeFileSync } from 'node:fs';",
    "import { join } from 'node:path';",
    'const [cmd, ...rest] = process.argv.slice(2);',
    "if (cmd === 'npx') {",
    "  if (rest[0] === 'vitest') process.stdout.write('[]');",
    "  else if (rest[0] === 'playwright') process.stdout.write('{\"suites\":[]}');",
    '  else process.exit(64);',
    '  process.exit(0);',
    '}',
    "const gate = cmd === 'test' ? 'test' : cmd === 'run' ? rest[0] : null;",
    'if (!gate) process.exit(64);',
    "if (gate === 'e2e' && process.env.E2E_REUSE === '1') {",
    "  console.log('E2E_REUSE=1 reached the e2e gate');",
    '  process.exit(3);',
    '}',
    "if (gate === 'test' && process.env.FIXTURE_TOUCH) writeFileSync(join(process.cwd(), process.env.FIXTURE_TOUCH), '// changed while the gate ran\\n');",
    "const failing = (process.env.FIXTURE_FAIL ?? '').split(',').includes(gate);",
    "console.log(`stand-in ${gate}: ${failing ? 'failing' : 'passing'}`);",
    'process.exit(failing ? 1 : 0);',
    '',
  ].join('\n'),
);
executable(join(BIN, 'npm'), `exec "${NODE}" "${join(BIN, 'gates.mjs')}" "$@"`);
executable(join(BIN, 'npx'), `exec "${NODE}" "${join(BIN, 'gates.mjs')}" npx "$@"`);

const GIT_ENV = {
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Fixture',
  GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
  GIT_COMMITTER_NAME: 'Fixture',
  GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
};
/** The parent's environment minus anything that would change how the fixture's git, scripts or nested node --test run. */
const dropped = (k) => k.startsWith('GIT_') || k.startsWith('FIXTURE_') || ['NODE_TEST_CONTEXT', 'CLAUDE_CODE_SESSION_ID', 'E2E_REUSE'].includes(k);
const fixtureEnv = (extra = {}) => ({ ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !dropped(k))), ...GIT_ENV, PATH: `${BIN}${delimiter}${process.env.PATH ?? ''}`, ...extra });

function run(cmd, args, cwd, extra = {}) {
  const r = spawnSync(cmd, args, { cwd, env: fixtureEnv(extra), encoding: 'utf8', timeout: 120000 });
  if (r.error) throw r.error;
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, out: `${r.stdout}\n${r.stderr}` };
}

function git(dir, ...args) {
  const r = run('git', args, dir);
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} exited ${r.status} in ${dir}:\n${r.out}`);
  return r.stdout.trim();
}

const agent = (dir, name, args = [], extra = {}) => run(NODE, [join(dir, 'scripts/agent', `${name}.mjs`), ...args], dir, extra);

function checkState(dir, extra) {
  const r = agent(dir, 'check-state', ['--json'], extra);
  try {
    return { ...JSON.parse(r.stdout), status: r.status };
  } catch {
    throw new Error(`check-state printed no JSON (exit ${r.status}):\n${r.out}`);
  }
}

const put = (dir, rel, text) => {
  mkdirSync(dirname(join(dir, rel)), { recursive: true });
  writeFileSync(join(dir, rel), text);
};
const putJson = (dir, rel, value) => put(dir, rel, `${JSON.stringify(value, null, 2)}\n`);
const getJson = (dir, rel) => JSON.parse(readFileSync(join(dir, rel), 'utf8'));
const getText = (dir, rel) => readFileSync(join(dir, rel), 'utf8');
const editJson = (dir, rel, fn) => putJson(dir, rel, fn(getJson(dir, rel)) ?? getJson(dir, rel));
const editState = (dir, fn) => putJson(dir, 'docs/agent/STATE.json', fn(getJson(dir, 'docs/agent/STATE.json')));
const ledgerEvents = (dir) => getText(dir, 'docs/agent/LEDGER.jsonl').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

function commitAll(dir, message) {
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '--no-verify', '-m', message);
  return git(dir, 'rev-parse', 'HEAD');
}

const has = (list, needle) => list.some((x) => x.includes(needle));
const assertHas = (list, needle) => assert.ok(has(list, needle), `expected an entry containing "${needle}" in:\n${list.join('\n')}`);
const assertNone = (list, needle) => assert.ok(!has(list, needle), `expected no entry containing "${needle}" in:\n${list.join('\n')}`);
const assertClean = (r) => assert.deepEqual(r.errors, [], `check-state errors:\n${r.errors.join('\n')}`);
function assertRefused(r, needle) {
  assert.notEqual(r.status, 0, `expected a refusal, but it exited 0:\n${r.out}`);
  assert.ok(r.out.includes(needle), `expected "${needle}" in:\n${r.out}`);
}
const assertDone = (r) => assert.equal(r.status, 0, r.out);

/** Record one ledger event with record-event.mjs (slice and task from STATE). */
function record(dir, args, extra = {}) {
  const s = getJson(dir, 'docs/agent/STATE.json');
  return agent(dir, 'record-event', ['--actor', 'orchestrator', '--slice', s.currentSlice, '--task', s.currentTask, '--result', 'fixture step', ...args], extra);
}
const move = (dir, from, to, args = [], extra = {}) => record(dir, ['--kind', 'transition', '--from', from, '--to', to, ...args], extra);

// ---------------------------------------------------------------------------------------------------------------
// The fixture repository
// ---------------------------------------------------------------------------------------------------------------

const OWNER_WORDS = 'Given 2026-10-05 by the owner in a top-level session. Question (verbatim): "May the fixture make the change above?" Answer (verbatim): "Yes, as written."';

function adrText(id, title, decision, { status = 'Accepted', owner = false } = {}) {
  return [`# ${id} — ${title}`, '', `**Status:** ${status}\\`, '**Date:** 2026-10-05\\', '**Slice:** S0\\', '**Requirements:** HARNESS-001', '', '## Context', 'A harness fixture.', '', '## Decision', decision, '', ...(owner ? ['## Owner approval', OWNER_WORDS, ''] : [])].join('\n');
}

const ADRS = [
  ['ADR-0001', 'legacy-owner', 'Yes', adrText('ADR-0001', 'An owner decision written before the convention', 'The owner decided this before "## Owner approval" sections existed.')],
  ['ADR-0002', 'owner-approval', 'Yes', adrText('ADR-0002', 'The owner approves the harness files', 'Record the harness, including package.json and docs/agent/prompts/KICKOFF.md.', { owner: true })],
  ['ADR-0003', 'agent-change', 'No (needs independent review)', adrText('ADR-0003', 'An agent-written change', 'The scripts change; an independent reviewer signs off.')],
  ['ADR-0004', 'owner-override', 'Yes', adrText('ADR-0004', 'The owner lifts a repair limit and approves a design', 'The repair limit for D-S0-9 is lifted, and DESIGN-X is approved.', { owner: true })],
];
const indexRow = (id, slug, owner) => `| [${id}](${id}-${slug}.md) | 2026-10-05 | Accepted | ${owner} | fixture |`;

/** Write an ADR and its index row (both protected files: protect.mjs reports them until --update). */
function addAdr(dir, id, slug, text, owner = 'Yes') {
  put(dir, `docs/agent/decisions/${id}-${slug}.md`, text);
  appendFileSync(join(dir, 'docs/agent/decisions/INDEX.md'), `${indexRow(id, slug, owner)}\n`);
}

const emptyManifest = (slice) => ({ slice, checkpointSha: null, commands: [], browserRuns: [], screenshots: [], performance: [], reviews: [], files: [], requirements: [], verdict: 'PENDING' });
const GATES = ['typecheck', 'unit', 'build', 'e2e', 'diffCheck', 'harnessTests', 'requirementsAudit', 'testInventory', 'protectedFiles'];

let copies = 0;
function copyTo(src, name) {
  const dest = join(WORK, `${name}-${++copies}`);
  cpSync(src, dest, { recursive: true });
  return dest;
}

function buildStages() {
  const g = join(WORK, 'stage-implement');
  mkdirSync(g);
  git(g, 'init', '-q', '-b', 'main');
  put(g, '.gitignore', '.agent-runs/\nnode_modules/\ndocs/agent/STOP\n');
  putJson(g, 'package.json', { name: 'fixture', private: true, scripts: { typecheck: 'stand-in', test: 'stand-in', build: 'stand-in', e2e: 'stand-in' } });
  put(g, 'src/app.ts', 'export const answer = 42;\n');
  const baseline = commitAll(g, 'baseline');

  mkdirSync(join(g, 'scripts/agent'), { recursive: true });
  for (const f of readdirSync(join(ROOT, 'scripts/agent'))) if (f.endsWith('.mjs') && !f.endsWith('.test.mjs')) copyFileSync(join(ROOT, 'scripts/agent', f), join(g, 'scripts/agent', f));
  put(g, 'scripts/agent/ok.test.mjs', "import assert from 'node:assert/strict';\nimport { test } from 'node:test';\n\ntest('fixture harness test', () => assert.equal(1 + 1, 2));\n");
  mkdirSync(join(g, 'docs/agent/templates'), { recursive: true });
  for (const t of ['ADR_TEMPLATE.md', 'CURRENT_SLICE_TEMPLATE.md']) copyFileSync(join(ROOT, 'docs/agent/templates', t), join(g, 'docs/agent/templates', t));
  put(g, 'docs/agent/prompts/KICKOFF.md', '# Kickoff\n\n```text\nStart the fixture session.\nRead docs/agent first.\n```\n');
  put(g, 'docs/agent/CURRENT_SLICE.md', '# CURRENT SLICE — S0\n\n**Slice:** S0 — fixture harness\n\n## Governing requirements\nHARNESS-001\n');
  put(g, 'docs/agent/HANDOFF.md', '# HANDOFF\n');
  const requirement = (id, slice, o) => ({ id, slice, source: 'fixture', description: `fixture requirement ${id}`, acceptance: ['the harness checks pass'], tasks: [], tests: ['scripts/agent/ok.test.mjs'], evidence: [], status: 'PENDING', ...o });
  putJson(g, 'docs/agent/REQUIREMENTS.json', { requirements: [requirement('HARNESS-001', 'S0', { tasks: ['S0-T1'], status: 'IN_PROGRESS' }), requirement('NAV-001', 'S1')] });
  putJson(g, 'docs/agent/design/DESIGN_REGISTRY.json', { designs: [{ id: 'DESIGN-X', title: 'Fixture design', status: 'PENDING_OWNER_DESIGN', approval: null, path: null }] });
  put(g, 'docs/agent/design/DESIGN-X.md', '# DESIGN-X\n\nA fixture design.\n');
  for (const [id, slug, , text] of ADRS) put(g, `docs/agent/decisions/${id}-${slug}.md`, text);
  put(g, 'docs/agent/decisions/INDEX.md', ['# Decisions index', '', '| ADR | Date | Status | Owner decision | Summary |', '|---|---|---|---|---|', ...ADRS.map(([id, slug, owner]) => indexRow(id, slug, owner)), ''].join('\n'));
  putJson(g, 'docs/agent/evidence/S0/manifest.json', emptyManifest('S0'));
  putJson(g, 'docs/agent/evidence/S0/test-inventory-baseline.json', { vitest: { count: 0, tests: [] }, playwright: { count: 0, tests: [] }, skipMarkers: {} });
  putJson(g, 'docs/agent/STATE.json', {
    schemaVersion: 2,
    project: 'Fixture',
    planningBaselineSha: baseline,
    actualBaselineSha: baseline,
    integrationBranch: 'main',
    remoteMutationAllowed: false,
    remoteApproval: null,
    currentSlice: 'S0',
    currentTask: 'S0-T1',
    machineState: 'BOOTSTRAP',
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
    gates: { ...Object.fromEntries(GATES.map((x) => [x, 'PENDING'])), browserQa: 'NOT_APPLICABLE', independentReview: 'PENDING' },
  });
  put(g, 'docs/agent/LEDGER.jsonl', '');
  const harness = commitAll(g, 'harness');
  for (const [from, to] of [['BOOTSTRAP', 'BASELINE_VERIFY'], ['BASELINE_VERIFY', 'SLICE_DISCOVERY'], ['SLICE_DISCOVERY', 'PLAN_LOCK'], ['PLAN_LOCK', 'IMPLEMENT']]) assertDone(move(g, from, to));
  assertDone(agent(g, 'protect', ['--update', '--adr', 'ADR-0002']));
  commitAll(g, 'bookkeeping: S0 in IMPLEMENT, protected hashes under ADR-0002');

  // ACCEPT: every gate run for real (stand-in npm), both mandatory reviews GREEN, the requirement closed.
  const a = copyTo(g, 'stage-accept');
  assertDone(agent(a, 'verify-slice'));
  for (const role of ['code-architecture', 'adversarial']) {
    put(a, `docs/agent/evidence/S0/reviews/${role}-1.md`, `# ${role} review\n\nA fresh fixture reviewer.\n\nVerdict: GREEN\n`);
    assertDone(agent(a, 'capture-evidence', ['--review', '--role', role, '--verdict', 'GREEN', '--report', `docs/agent/evidence/S0/reviews/${role}-1.md`]));
  }
  editJson(a, 'docs/agent/REQUIREMENTS.json', (r) => ({ requirements: r.requirements.map((q) => (q.id === 'HARNESS-001' ? { ...q, status: 'GREEN', evidence: ['docs/agent/evidence/S0/manifest.json'] } : q)) }));
  editJson(a, 'docs/agent/evidence/S0/manifest.json', (m) => ({ ...m, verdict: 'GREEN' }));
  editState(a, (s) => ({ ...s, gates: { ...s.gates, independentReview: 'GREEN' } }));
  for (const [from, to] of [['IMPLEMENT', 'TARGETED_VERIFY'], ['TARGETED_VERIFY', 'FULL_VERIFY'], ['FULL_VERIFY', 'ADVERSARIAL_REVIEW'], ['ADVERSARIAL_REVIEW', 'ACCEPT']]) assertDone(move(a, from, to));

  // CHECKPOINT: the checkpoint commit and tag, then ACCEPT → CHECKPOINT records it (m4).
  const c = copyTo(a, 'stage-checkpoint');
  const checkpoint = commitAll(c, 'S0: checkpoint — fixture');
  git(c, 'tag', 'checkpoint/S0-fixture');
  assertDone(move(c, 'ACCEPT', 'CHECKPOINT'));

  // NEXT_SLICE, prepared for S1 by next-slice.mjs, committed by the closing session.
  const p = copyTo(c, 'stage-prepared');
  commitAll(p, 'bookkeeping: lastAcceptedCheckpoint');
  for (const [from, to] of [['CHECKPOINT', 'COMPACT'], ['COMPACT', 'HANDOFF']]) assertDone(move(p, from, to));
  assertDone(move(p, 'HANDOFF', 'NEXT_SLICE', [], { CLAUDE_CODE_SESSION_ID: 'closing-session' }));
  assertDone(agent(p, 'next-slice', ['--reviewers', 'code-architecture,adversarial']));
  commitAll(p, 'S0 closed; S1 prepared');
  return { implement: g, accept: a, checkpoint: c, prepared: p, baseline, harness, checkpointSha: checkpoint };
}

/**
 * The stages, built on first use. A failed build is remembered as well, so every later test reports its original error
 * instead of building again into the half-built stage-implement directory and failing with EEXIST (D-S0-15).
 */
let built = null;
function stages() {
  if (!built) {
    try {
      built = { stages: buildStages() };
    } catch (error) {
      built = { error };
    }
  }
  if (built.error) throw built.error;
  return built.stages;
}

/** Run `fn` on a fresh copy of a stage, removed afterwards. */
function inStage(stage, fn) {
  const dir = copyTo(stages()[stage], stage);
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Every stage is a valid repository, and the handover from S0 to S1 works end to end
// ---------------------------------------------------------------------------------------------------------------

test('fixtures: every stage passes check-state, and the closing session hands S0 over to a fresh S1 session', () => {
  const st = stages();
  for (const stage of ['implement', 'accept', 'checkpoint', 'prepared']) assertClean(checkState(st[stage]));
  // m4: ACCEPT → CHECKPOINT recorded the checkpoint in STATE, in the manifest and in the ledger event itself.
  const s = getJson(st.checkpoint, 'docs/agent/STATE.json');
  assert.equal(s.lastAcceptedCheckpoint, st.checkpointSha);
  assert.equal(getJson(st.checkpoint, 'docs/agent/evidence/S0/manifest.json').checkpointSha, st.checkpointSha);
  assert.equal(ledgerEvents(st.checkpoint).pop().checkpoint, st.checkpointSha);
  // The gate records carry node:test counts now (m6).
  const harnessRun = getJson(st.accept, 'docs/agent/evidence/S0/manifest.json').commands.find((x) => x.gate === 'harnessTests');
  assert.deepEqual([harnessRun.exitCode, harnessRun.counts.node_pass, harnessRun.counts.node_fail], [0, 1, 0]);
  inStage('prepared', (dir) => {
    // m1: the prepared state audits the accepted S0, not S1's open requirement (twice).
    const audit = agent(dir, 'requirements-audit');
    assertDone(audit);
    assert.ok(!audit.out.includes('NAV-001'), audit.out);
    // The closing session can't start S1; a fresh one can (HARNESS-002 A3, F5's record-event session guard).
    assertRefused(move(dir, 'NEXT_SLICE', 'BOOTSTRAP', [], { CLAUDE_CODE_SESSION_ID: 'closing-session' }), 'also closed the previous slice');
    assertRefused(move(dir, 'NEXT_SLICE', 'BOOTSTRAP'), 'leaving NEXT_SLICE needs the Claude Code session ids');
    assertDone(move(dir, 'NEXT_SLICE', 'BOOTSTRAP', [], { CLAUDE_CODE_SESSION_ID: 'fresh-session' }));
    assertClean(checkState(dir));
    assert.deepEqual(ledgerEvents(dir).filter((e) => e.kind === 'transition').slice(-1)[0].slice, 'S1');
  });
});

test('record-event: entering NEXT_SLICE needs this session\'s id (F5 record-event session guard)', () => {
  inStage('checkpoint', (dir) => {
    for (const [from, to] of [['CHECKPOINT', 'COMPACT'], ['COMPACT', 'HANDOFF']]) assertDone(move(dir, from, to));
    assertRefused(move(dir, 'HANDOFF', 'NEXT_SLICE'), "entering NEXT_SLICE needs this session's id");
    assertDone(move(dir, 'HANDOFF', 'NEXT_SLICE', [], { CLAUDE_CODE_SESSION_ID: 'closing-session' }));
  });
});

// ---------------------------------------------------------------------------------------------------------------
// The scripts run when the repository is reached through a symlink (D-S0-15)
// ---------------------------------------------------------------------------------------------------------------

/**
 * Run `fn` on a fresh copy of a stage that it reaches only through a symlink, as every fixture is reached on macOS.
 * Node gives the script it starts an import.meta.url with the real path but keeps process.argv[1] as given, and the
 * scripts' old main-module check, which compared the two unresolved, made each of them exit 0 there without running.
 */
function throughSymlink(stage, fn) {
  return inStage(stage, (dir) => {
    const link = `${dir}-link`;
    symlinkSync(dir, link, 'dir');
    try {
      return fn(link);
    } finally {
      rmSync(link, { force: true });
    }
  });
}

test('fixtures: reached through a symlink, record-event, protect, check-state and requirements-audit still run, and fail where the repository is broken (D-S0-15)', () => {
  throughSymlink('implement', (link) => {
    // A sound repository: each gate prints its verdict (behind the old main-module check, each printed nothing, exit 0).
    const protect = agent(link, 'protect');
    assertDone(protect);
    assert.match(protect.stdout, /^OK$/m);
    assertClean(checkState(link));
    const audit = agent(link, 'requirements-audit');
    assertDone(audit);
    assert.match(audit.stdout, /^OK$/m);
    // record-event records the event and moves STATE (the first silent no-op of the stage build on the owner's Mac).
    const before = ledgerEvents(link).length;
    assertDone(move(link, 'IMPLEMENT', 'TARGETED_VERIFY'));
    assert.equal(ledgerEvents(link).length, before + 1);
    assert.equal(getJson(link, 'docs/agent/STATE.json').machineState, 'TARGETED_VERIFY');
    // A broken repository fails each gate instead of passing it silently.
    appendFileSync(join(link, 'scripts/agent/ok.test.mjs'), '// edited\n');
    assertRefused(agent(link, 'protect'), 'protected file scripts/agent/ok.test.mjs changed without a recorded approval');
    const r = checkState(link);
    assertHas(r.errors, 'protected file scripts/agent/ok.test.mjs changed without a recorded approval');
    assert.equal(r.status, 1);
    put(link, 'docs/agent/CURRENT_SLICE.md', '# CURRENT SLICE — S9\n\nHARNESS-001\n');
    assertRefused(agent(link, 'requirements-audit'), 'CURRENT_SLICE.md does not name the current slice S0 in its header');
  });
});

test('fixtures: reached through a symlink, every harness CLI runs its main block instead of exiting 0 without a word (D-S0-15)', () => {
  // Refusing an unknown option is something only a script's main block does. relaunch shows its dry run instead, in
  // relaunchIn's box, where no real claude can be reached.
  const refusals = {
    'bootstrap-check': 'Usage: node scripts/agent/bootstrap-check.mjs <assertion.json>',
    'capture-evidence': 'unknown option --no-such-option',
    'check-state': 'unknown option --no-such-option',
    'context-pack': 'unknown option --no-such-option',
    'diff-check': 'unknown option --no-such-option',
    handoff: 'unknown option --no-such-option',
    'next-slice': 'unknown option --no-such-option',
    protect: 'unknown option --no-such-option',
    'record-event': 'unknown option --no-such-option',
    'requirements-audit': 'usage: requirements-audit.mjs',
    'test-inventory': 'unknown option --no-such-option',
    'verify-slice': 'unknown option --no-such-option',
  };
  throughSymlink('implement', (link) => {
    // Every script but the three libraries is a CLI, and every CLI is checked here.
    const libraries = ['evidence.mjs', 'lib.mjs', 'requirements.mjs'];
    const clis = readdirSync(join(link, 'scripts/agent')).filter((f) => f.endsWith('.mjs') && !f.endsWith('.test.mjs') && !libraries.includes(f));
    assert.deepEqual(clis.map((f) => f.replace(/\.mjs$/, '')).sort(), [...Object.keys(refusals), 'relaunch'].sort());
    const unexpected = [];
    for (const [name, message] of Object.entries(refusals)) {
      const r = agent(link, name, ['--no-such-option']);
      if (r.status === 0 || r.status === null || !r.out.includes(message)) unexpected.push(`${name} exited ${r.status}: ${r.out.trim() || '(no output)'}`);
    }
    const dry = relaunchIn(link, ['--dry-run']);
    if (dry.status !== 0 || !/Pre-flight OK\. Would run:/.test(dry.out)) unexpected.push(`relaunch --dry-run exited ${dry.status}: ${dry.out.trim() || '(no output)'}`);
    assert.deepEqual(unexpected, [], `these scripts did not run their main block as expected through the symlink:\n${unexpected.join('\n')}`);
    assert.equal(dry.call, null, 'no session was started');
    assert.equal(dry.decoyCalled, false);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// check-state: Git reality (F5: :419, :421, :424, :428)
// ---------------------------------------------------------------------------------------------------------------

test('check-state: an agent on a feat/* branch is an error (F5 :419, HARNESS-017 A2)', () => {
  inStage('implement', (dir) => {
    git(dir, 'checkout', '-q', '-b', 'feat/new-thing');
    const r = checkState(dir);
    assertHas(r.errors, 'HEAD is on feat/new-thing: agents never commit on feat/* branches');
    assertHas(r.warnings, 'is not the integration branch main');
    assert.equal(r.status, 1);
  });
});

test('check-state: a checkpoint tag that is not an ancestor of HEAD is an error (F5 :421, HARNESS-024 A1)', () => {
  inStage('implement', (dir) => {
    git(dir, 'checkout', '-q', '-b', 'side');
    put(dir, 'docs/agent/HANDOFF.md', '# HANDOFF\n\nabandoned work\n');
    commitAll(dir, 'abandoned');
    git(dir, 'tag', 'checkpoint/S0-abandoned');
    git(dir, 'checkout', '-q', 'main');
    assertHas(checkState(dir).errors, 'checkpoint tag checkpoint/S0-abandoned is not an ancestor of HEAD');
  });
});

test('check-state: STATE SHAs must be commits of this repository (F5 :424, HARNESS-019 A1)', () => {
  inStage('implement', (dir) => {
    editState(dir, (s) => ({ ...s, planningBaselineSha: 'f'.repeat(40), actualBaselineSha: 'f'.repeat(40) }));
    const r = checkState(dir);
    assertHas(r.errors, `STATE.planningBaselineSha ${'f'.repeat(40)} is not a commit in this repository`);
    assertHas(r.errors, `STATE.actualBaselineSha ${'f'.repeat(40)} is not a commit in this repository`);
  });
});

test('check-state: the checkpoint must come after the baseline (F5 :428, HARNESS-019 A3)', () => {
  inStage('implement', (dir) => {
    editState(dir, (s) => ({ ...s, lastAcceptedCheckpoint: s.actualBaselineSha }));
    assertHas(checkState(dir).errors, 'STATE.lastAcceptedCheckpoint must be a commit made after the baseline (actualBaselineSha)');
  });
});

// ---------------------------------------------------------------------------------------------------------------
// check-state: owner approvals in STATE (F5 :433-436; F1, M2; ADR-0013 decision 3)
// ---------------------------------------------------------------------------------------------------------------

test('check-state: remote and multiplayer permission need the owner\'s approval, not just any ADR (F5 :433, F1, M2)', () => {
  inStage('implement', (dir) => {
    const withApproval = (ref) => {
      editState(dir, (s) => ({ ...s, remoteMutationAllowed: true, remoteApproval: ref, multiplayerApproved: true, multiplayerApproval: ref }));
      return checkState(dir).errors;
    };
    for (const k of ['remoteApproval', 'multiplayerApproval']) {
      assertHas(withApproval('ADR-0003'), `STATE.${k} is not the owner's approval: ADR-0003 has no "## Owner approval" section`);
      // An owner decision written before the convention doesn't count for a new approval either.
      assertHas(withApproval('ADR-0001'), `STATE.${k} is not the owner's approval: ADR-0001 has no "## Owner approval" section`);
      assertHas(withApproval('README.md'), `STATE.${k} is not the owner's approval: README.md is not a committed ADR`);
      assertHas(withApproval('ADR-0099'), 'ADR-0099 is not a committed ADR listed in decisions/INDEX.md');
    }
    assert.deepEqual(withApproval('ADR-0002'), []);
    assert.deepEqual(withApproval('docs/agent/decisions/ADR-0002-owner-approval.md'), []);
  });
});

test('check-state: a gate waiver needs the owner\'s approval, for the current slice (F5 :435, F1, M2, open point 4)', () => {
  inStage('implement', (dir) => {
    const waive = (waivers) => {
      editState(dir, (s) => ({ ...s, gates: { ...s.gates, e2e: 'NOT_APPLICABLE' }, gateWaivers: waivers }));
      return checkState(dir).errors;
    };
    assertHas(waive({ S0: { e2e: 'ADR-0003' } }), 'STATE.gateWaivers.S0.e2e is not the owner\'s approval: ADR-0003 has no "## Owner approval" section');
    assertHas(waive({ S0: { e2e: 'ADR-0099' } }), 'STATE.gateWaivers.S0.e2e is not the owner\'s approval: ADR-0099 is not a committed ADR');
    assertHas(waive({ S1: { e2e: 'ADR-0002' } }), "gate e2e can't be NOT_APPLICABLE without an owner-approved waiver in STATE.gateWaivers.S0.e2e");
    assertHas(waive({ e2e: 'ADR-0002' }), 'waivers are keyed by slice');
    assert.deepEqual(waive({ S0: { e2e: 'ADR-0002' } }), []);
  });
});

test('check-state: a repair override needs the owner\'s approval naming the defect (F5 :436, F1 P6, M2)', () => {
  inStage('implement', (dir) => {
    for (let i = 0; i < 5; i++) assertDone(record(dir, ['--kind', 'repair', '--defect', 'D-S0-9', '--strategy', `attempt ${i + 1}`]));
    assert.deepEqual((({ repairTarget, repairAttempt, repairTotalAttempts }) => [repairTarget, repairAttempt, repairTotalAttempts])(getJson(dir, 'docs/agent/STATE.json')), ['D-S0-9', 0, 5]);
    assertHas(checkState(dir).errors, 'defect D-S0-9 reached the repair limit (5 attempts, 0 distinct strategies)');
    const override = (ref) => {
      editState(dir, (s) => ({ ...s, repairOverrides: { 'D-S0-9': ref } }));
      return checkState(dir).errors;
    };
    const agentAdr = override('ADR-0003');
    assertHas(agentAdr, 'STATE.repairOverrides.D-S0-9 is not the owner\'s approval: ADR-0003 has no "## Owner approval" section');
    assertHas(agentAdr, 'defect D-S0-9 reached the repair limit');
    // A genuine owner ADR about something else can't be cited for this defect.
    const elsewhere = override('ADR-0002');
    assertHas(elsewhere, "STATE.repairOverrides.D-S0-9 is not the owner's approval: ADR-0002 doesn't name D-S0-9");
    assertHas(elsewhere, 'reached the repair limit');
    assert.deepEqual(override('ADR-0004'), []);
  });
});

test('check-state: a design approval needs the owner\'s approval naming the design (F1, M2, ADR-0013 decision 3)', () => {
  inStage('implement', (dir) => {
    const approve = (approval) => {
      editJson(dir, 'docs/agent/design/DESIGN_REGISTRY.json', () => ({ designs: [{ id: 'DESIGN-X', title: 'Fixture design', status: 'APPROVED', approval, path: 'docs/agent/design/DESIGN-X.md' }] }));
      return checkState(dir).errors.filter((e) => e.startsWith('design '));
    };
    assertHas(approve('Approved by ADR-0003.'), "design DESIGN-X: APPROVED, but its approval is not the owner's: ADR-0003 has no");
    assertHas(approve('Approved by ADR-0001.'), 'ADR-0001 has no "## Owner approval" section');
    assertHas(approve('Approved by ADR-0002.'), "ADR-0002 doesn't name DESIGN-X");
    assertHas(approve('The owner liked it.'), "design DESIGN-X: APPROVED without an approval citing the owner's ADR");
    assert.deepEqual(approve('Approved by ADR-0004 (verbatim).'), []);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// check-state: the append-only anchor and the baseline (F5 :440; F2)
// ---------------------------------------------------------------------------------------------------------------

test('check-state: a committed ledger rewrite is caught, and moving the anchor or the baseline past it is refused (F5 :440, F2 P11a-c)', () => {
  inStage('implement', (dir) => {
    const text = getText(dir, 'docs/agent/LEDGER.jsonl');
    put(dir, 'docs/agent/LEDGER.jsonl', text.replace('"result":"fixture step"', '"result":"fixture step, rewritten"'));
    const rewrite = commitAll(dir, 'rewrite the first ledger line');
    // P11a: caught against the versions committed since the baseline.
    assertHas(checkState(dir).errors, 'LEDGER.jsonl no longer starts with a committed version of itself');
    // P11b: the anchor moved to the rewrite commit in IMPLEMENT.
    editState(dir, (s) => ({ ...s, lastAcceptedCheckpoint: rewrite }));
    assertHas(checkState(dir).errors, 'STATE.lastAcceptedCheckpoint is set, but the ledger records no ACCEPT → CHECKPOINT transition');
    // P11c: the baseline moved to the rewrite commit instead (alone, or together with the planning baseline).
    editState(dir, (s) => ({ ...s, lastAcceptedCheckpoint: null, actualBaselineSha: rewrite }));
    const alone = checkState(dir).errors;
    assertHas(alone, 'must equal planningBaselineSha');
    assertHas(alone, `STATE.actualBaselineSha is ${rewrite}, but a committed STATE.json recorded`);
    editState(dir, (s) => ({ ...s, planningBaselineSha: rewrite }));
    assertHas(checkState(dir).errors, `STATE.planningBaselineSha is ${rewrite}, but a committed STATE.json recorded`);
  });
});

test('check-state: after the checkpoint, the anchor must be the checkpoint the ledger recorded, backed by its commit and tag (F2)', () => {
  inStage('checkpoint', (dir) => {
    const { harness, checkpointSha } = stages();
    // Moved to an earlier commit after the baseline: the ledger recorded another checkpoint, and the commit backs none.
    editState(dir, (s) => ({ ...s, lastAcceptedCheckpoint: harness }));
    const moved = checkState(dir).errors;
    assertHas(moved, `but the last ACCEPT → CHECKPOINT transition (S0) recorded ${checkpointSha}`);
    assertHas(moved, "doesn't end at → ACCEPT for S0");
    assertHas(moved, "the S0 manifest committed at");
    editState(dir, (s) => ({ ...s, lastAcceptedCheckpoint: checkpointSha }));
    assertClean(checkState(dir));
    // A checkpoint tag for S0 that points elsewhere.
    git(dir, 'tag', 'checkpoint/S0-other', harness);
    assertHas(checkState(dir).errors, 'tag checkpoint/S0-other points at');
  });
});

test('record-event: ACCEPT → CHECKPOINT refuses a commit that does not back the checkpoint, and --checkpoint elsewhere (F2, m4)', () => {
  inStage('accept', (dir) => {
    const { harness } = stages();
    assertRefused(move(dir, 'ACCEPT', 'CHECKPOINT'), "doesn't end at → ACCEPT for S0");
    const cp = commitAll(dir, 'S0: checkpoint — fixture');
    assertRefused(move(dir, 'ACCEPT', 'CHECKPOINT', ['--checkpoint', harness]), "the ledger committed at");
    git(dir, 'tag', 'checkpoint/S0-wrong', harness);
    assertRefused(move(dir, 'ACCEPT', 'CHECKPOINT'), 'tag checkpoint/S0-wrong points at');
    git(dir, 'tag', '-d', 'checkpoint/S0-wrong');
    assertRefused(move(dir, 'IMPLEMENT', 'TARGETED_VERIFY', ['--checkpoint', cp]), '--checkpoint belongs only to ACCEPT → CHECKPOINT');
    put(dir, 'src/app.ts', 'export const answer = 43;\n');
    assertRefused(move(dir, 'ACCEPT', 'CHECKPOINT'), 'the working code differs from the checkpoint');
    put(dir, 'src/app.ts', 'export const answer = 42;\n');
    assertDone(move(dir, 'ACCEPT', 'CHECKPOINT', ['--checkpoint', cp]));
    assert.equal(getJson(dir, 'docs/agent/STATE.json').lastAcceptedCheckpoint, cp);
    assertClean(checkState(dir));
  });
});

// ---------------------------------------------------------------------------------------------------------------
// check-state: accepted and post-checkpoint states (F5 :453, :457, :475, :476, :508; F4)
// ---------------------------------------------------------------------------------------------------------------

test('check-state: a checkpoint that is not an ancestor of HEAD is an error, even when its own commit backs it (HARNESS-024 A1)', () => {
  inStage('checkpoint', (dir) => {
    const { checkpointSha } = stages();
    // A rewritten checkpoint: the same tree and parent on no branch, so it backs itself but isn't in HEAD's history.
    const twin = git(dir, 'commit-tree', `${checkpointSha}^{tree}`, '-p', `${checkpointSha}^`, '-m', 'S0: checkpoint — rewritten');
    editState(dir, (s) => ({ ...s, lastAcceptedCheckpoint: twin }));
    editJson(dir, 'docs/agent/evidence/S0/manifest.json', (m) => ({ ...m, checkpointSha: twin }));
    put(dir, 'docs/agent/LEDGER.jsonl', getText(dir, 'docs/agent/LEDGER.jsonl').replace(checkpointSha, twin));
    assertHas(checkState(dir).errors, 'STATE.lastAcceptedCheckpoint is not an ancestor of HEAD');
  });
});

test('check-state: code changed after the checkpoint commit is an error (F5 :453, HARNESS-024 A1)', () => {
  inStage('checkpoint', (dir) => {
    put(dir, 'src/app.ts', 'export const answer = 43;\n');
    assertHas(checkState(dir).errors, 'the code changed after the checkpoint commit');
  });
});

test('check-state: a code tree that can\'t be computed is an error once accepted (F5 :457)', () => {
  inStage('checkpoint', (dir) => {
    editState(dir, (s) => ({ ...s, lastAcceptedCheckpoint: 'e'.repeat(40) }));
    const r = checkState(dir);
    assertHas(r.errors, 'could not compute the code tree');
    assertNone(r.warnings, 'could not compute the code tree');
  });
});

test('check-state: the accepted manifest\'s checkpointSha must be STATE.lastAcceptedCheckpoint (F5 :476)', () => {
  inStage('checkpoint', (dir) => {
    editJson(dir, 'docs/agent/evidence/S0/manifest.json', (m) => ({ ...m, checkpointSha: null }));
    assertHas(checkState(dir).errors, "the S0 manifest's checkpointSha (null) is not STATE.lastAcceptedCheckpoint");
  });
});

test('check-state: an accepted state runs the full requirements audit (F5 :508, HARNESS-011 A2)', () => {
  inStage('accept', (dir) => {
    editJson(dir, 'docs/agent/REQUIREMENTS.json', (r) => ({ requirements: r.requirements.map((q) => (q.id === 'HARNESS-001' ? { ...q, status: 'IN_PROGRESS' } : q)) }));
    assertHas(checkState(dir).errors, 'HARNESS-001 is IN_PROGRESS but S0 claims acceptance (ACCEPT)');
  });
});

test('check-state: acceptance needs the latest review of every report series GREEN, in either recording order (F4)', () => {
  inStage('accept', (dir) => {
    const review = (name, verdict, role = 'code-architecture') => {
      put(dir, `docs/agent/evidence/S0/reviews/${name}.md`, `# ${name}\n\nFindings.\n\nVerdict: ${verdict}\n`);
      assertDone(agent(dir, 'capture-evidence', ['--review', '--role', role, '--verdict', verdict, '--report', `docs/agent/evidence/S0/reviews/${name}.md`]));
    };
    // The harness half RED, then the game half GREEN, both recorded under code-architecture: the role check passes.
    review('code-architecture-harness-1', 'RED');
    review('code-architecture-2', 'GREEN');
    const r = checkState(dir);
    assertHas(r.errors, 'the latest review in the series docs/agent/evidence/S0/reviews/code-architecture-harness is RED');
    assertNone(r.errors, 'needs a GREEN code-architecture review');
    review('code-architecture-harness-2', 'GREEN');
    assertClean(checkState(dir));
  });
});

test('check-state: in the prepared NEXT_SLICE state the accepted slice\'s evidence still has to hold (F5 :475)', () => {
  inStage('prepared', (dir) => {
    // A failing typecheck appended to S0's manifest: append-only allows it, the predecessor's gate check doesn't.
    const log = 'docs/agent/evidence/S0/logs/typecheck-late.log';
    put(dir, log, 'stand-in typecheck: failing\n');
    editJson(dir, 'docs/agent/evidence/S0/manifest.json', (m) => {
      const last = m.commands.filter((x) => x.gate === 'typecheck').pop();
      return { ...m, commands: [...m.commands, { ...last, exitCode: 1, log, logSha256: sha256(join(dir, log)) }] };
    });
    assertHas(checkState(dir).errors, 'gate typecheck is GREEN but its latest recorded run exited 1');
  });
  inStage('prepared', (dir) => {
    // A RED review left as the latest of a series of the accepted slice.
    const report = 'docs/agent/evidence/S0/reviews/security-data-1.md';
    put(dir, report, '# security-data\n\nVerdict: RED\n');
    editJson(dir, 'docs/agent/evidence/S0/manifest.json', (m) => ({ ...m, reviews: [...m.reviews, { ...m.reviews[0], role: 'security-data', verdict: 'RED', report, reportSha256: sha256(join(dir, report)) }] }));
    assertHas(checkState(dir).errors, 'the latest review in the series docs/agent/evidence/S0/reviews/security-data is RED');
  });
});

// ---------------------------------------------------------------------------------------------------------------
// check-state: manifests, the slice contract, STATE vs the ledger, protected files (F5 :479, :511, :523, :536; F3)
// ---------------------------------------------------------------------------------------------------------------

test('check-state: every slice\'s manifest is checked, not only the current one (F5 :479, HARNESS-012 A3)', () => {
  inStage('implement', (dir) => {
    putJson(dir, 'docs/agent/evidence/S1/manifest.json', { ...emptyManifest('S1'), commands: [{ gate: 'unit', command: 'npm test', exitCode: 0, log: 'docs/agent/evidence/S1/logs/gone.log', logSha256: 'h', codeTree: 't' }] });
    assertHas(checkState(dir).errors, 'log docs/agent/evidence/S1/logs/gone.log cited in the manifest is missing');
  });
});

test('check-state: CURRENT_SLICE.md must name the current slice in its header (F5 :511, HARNESS-013 A1)', () => {
  inStage('implement', (dir) => {
    put(dir, 'docs/agent/CURRENT_SLICE.md', '# CURRENT SLICE — S9\n\nHARNESS-001\n');
    assertHas(checkState(dir).errors, 'CURRENT_SLICE.md does not name the current slice S0 in its header');
    const audit = agent(dir, 'requirements-audit');
    assertRefused(audit, 'CURRENT_SLICE.md does not name the current slice S0 in its header');
  });
});

test('check-state: STATE.machineState must be the last recorded transition\'s (F5 :523, HARNESS-010 A1)', () => {
  inStage('implement', (dir) => {
    editState(dir, (s) => ({ ...s, machineState: 'TARGETED_VERIFY' }));
    assertHas(checkState(dir).errors, 'STATE.machineState is TARGETED_VERIFY but the last recorded transition went to IMPLEMENT');
  });
});

test('check-state and record-event: the slice can\'t change without NEXT_SLICE → BOOTSTRAP (F3 P12)', () => {
  inStage('implement', (dir) => {
    editState(dir, (s) => ({ ...s, currentSlice: 'S1', currentTask: 'S1-T1' }));
    put(dir, 'docs/agent/CURRENT_SLICE.md', '# CURRENT SLICE — S1\n\nNAV-001\n');
    assertHas(checkState(dir).errors, 'STATE.currentSlice is S1 but the last recorded transition belongs to S0');
    assertRefused(move(dir, 'IMPLEMENT', 'TARGETED_VERIFY'), 'the last transition was recorded in S0, not S1');
    // A transition line written by hand past record-event.mjs.
    appendFileSync(join(dir, 'docs/agent/LEDGER.jsonl'), `${JSON.stringify({ timestamp: '2026-10-06T00:00:00Z', kind: 'transition', actor: 'hand', slice: 'S1', task: 'S1-T1', fromState: 'IMPLEMENT', toState: 'TARGETED_VERIFY', result: 'r', evidence: [], decisions: [] })}\n`);
    editState(dir, (s) => ({ ...s, machineState: 'TARGETED_VERIFY' }));
    assertHas(checkState(dir).errors, 'the slice changed from S0 to S1 outside NEXT_SLICE → BOOTSTRAP');
  });
});

test('check-state: a changed protected file fails check-state as well as protect.mjs (F5 :536, HARNESS-005 A3)', () => {
  inStage('implement', (dir) => {
    const original = getText(dir, 'scripts/agent/ok.test.mjs');
    appendFileSync(join(dir, 'scripts/agent/ok.test.mjs'), '// edited\n');
    assertHas(checkState(dir).errors, 'protected file scripts/agent/ok.test.mjs changed without a recorded approval');
    assertRefused(agent(dir, 'protect'), 'protected file scripts/agent/ok.test.mjs changed without a recorded approval');
    // So does an unrecorded new gate file: a tsconfig variant, the Vitest setup folder (D-S0-14).
    put(dir, 'scripts/agent/ok.test.mjs', original);
    assertClean(checkState(dir));
    put(dir, 'tsconfig.app.json', '{}\n');
    put(dir, 'tests/sim/setup/extra.ts', 'export {};\n');
    const r = checkState(dir).errors;
    assertHas(r, 'protected file tsconfig.app.json is not recorded');
    assertHas(r, 'protected file tests/sim/setup/extra.ts is not recorded');
  });
});

// ---------------------------------------------------------------------------------------------------------------
// protect.mjs (F5 protect :153, :155, findAdr :245, :249; F1, ADR-0013 decision 3)
// ---------------------------------------------------------------------------------------------------------------

test('protect: PROTECTED.json\'s approvedBy must be the owner\'s approval, a committed, indexed ADR with the owner\'s words (F5 protect :153, ADR-0013 decision 3)', () => {
  inStage('implement', (dir) => {
    editJson(dir, 'docs/agent/PROTECTED.json', (p) => ({ ...p, approvedBy: 'docs/agent/decisions/ADR-0099-nothing.md' }));
    const r = agent(dir, 'protect');
    assertRefused(r, "docs/agent/PROTECTED.json approvedBy (docs/agent/decisions/ADR-0099-nothing.md) is not the owner's approval: docs/agent/decisions/ADR-0099-nothing.md is not a committed ADR");
    assertHas(checkState(dir).errors, 'approvedBy (docs/agent/decisions/ADR-0099-nothing.md)');
  });
  // An agent ADR (Accepted, committed, indexed, without the owner's words) put in approvedBy past protect.mjs, with a
  // ledger event that vouches for the edited record: verification and check-state still refuse it.
  inStage('implement', (dir) => {
    editJson(dir, 'docs/agent/PROTECTED.json', (p) => ({ ...p, approvedBy: 'docs/agent/decisions/ADR-0003-agent-change.md' }));
    const s = getJson(dir, 'docs/agent/STATE.json');
    const forged = { timestamp: '2026-10-05T12:00:00.000Z', kind: 'decision', actor: 'protect.mjs', slice: s.currentSlice, task: s.currentTask, result: 'protected hashes recorded by hand', decisions: ['ADR-0003'], evidence: ['docs/agent/PROTECTED.json'], protectedSha256: sha256(join(dir, 'docs/agent/PROTECTED.json')), changedFiles: [] };
    appendFileSync(join(dir, 'docs/agent/LEDGER.jsonl'), `${JSON.stringify(forged)}\n`);
    const r = agent(dir, 'protect');
    assertRefused(r, 'docs/agent/PROTECTED.json approvedBy (docs/agent/decisions/ADR-0003-agent-change.md) is not the owner\'s approval: ADR-0003 has no "## Owner approval" section');
    assert.ok(!r.out.includes("doesn't match the hash"), r.out);
    const errors = checkState(dir).errors;
    assertHas(errors, 'a protect.mjs update must cite the owner\'s approval: ADR-0003 has no "## Owner approval" section');
    assertHas(errors, "approvedBy (docs/agent/decisions/ADR-0003-agent-change.md) is not the owner's approval");
  });
});

test('protect: PROTECTED.json edited by hand no longer matches the hash its ledger event recorded (F5 protect :155)', () => {
  inStage('implement', (dir) => {
    put(dir, 'docs/agent/PROTECTED.json', `${JSON.stringify(getJson(dir, 'docs/agent/PROTECTED.json'))}\n`);
    const r = agent(dir, 'protect');
    assertRefused(r, "doesn't match the hash its last protect.mjs ledger event recorded");
    assert.ok(!r.out.includes('approvedBy'), r.out);
  });
});

test('protect --update: an owner-only change needs the owner\'s words and must name each owner-only file (F1, M2, ADR-0013 decision 3)', () => {
  inStage('implement', (dir) => {
    editJson(dir, 'package.json', (p) => ({ ...p, description: 'changed' }));
    assertRefused(agent(dir, 'protect', ['--update', '--adr', 'ADR-0003']), 'has no "## Owner approval" section with the owner\'s words');
    assertRefused(agent(dir, 'protect', ['--update', '--adr', 'ADR-0001']), 'has no "## Owner approval" section');
    // A genuine owner ADR that doesn't name package.json can't bless it (harness-2 P7).
    assertRefused(agent(dir, 'protect', ['--update', '--adr', 'ADR-0004']), "ADR-0004-owner-override.md doesn't name package.json, which it would approve");
    // A new ADR is judged as committed: an approval section added to its working copy afterwards counts for nothing.
    addAdr(dir, 'ADR-0005', 'package-change', adrText('ADR-0005', 'Change package.json', 'Add a description to package.json.'), 'No');
    commitAll(dir, 'ADR-0005 without the owner\'s words');
    appendFileSync(join(dir, 'docs/agent/decisions/ADR-0005-package-change.md'), `\n## Owner approval\n${OWNER_WORDS}\n`);
    assertRefused(agent(dir, 'protect', ['--update', '--adr', 'ADR-0005']), 'ADR-0005-package-change.md has no "## Owner approval" section');
    put(dir, 'docs/agent/decisions/ADR-0005-package-change.md', adrText('ADR-0005', 'Change package.json', 'Add a description to package.json.'));
    assertDone(agent(dir, 'protect', ['--update', '--adr', 'ADR-0002']));
    assert.deepEqual(ledgerEvents(dir).pop().changedFiles.sort(), ['docs/agent/decisions/ADR-0005-package-change.md', 'docs/agent/decisions/INDEX.md', 'package.json']);
    assertClean(checkState(dir));
  });
});

test('protect --update: every update, a script-only one too, needs the owner\'s approval in an Accepted, committed, indexed ADR (F5 findAdr :245, :249, ADR-0013 decision 3)', () => {
  inStage('implement', (dir) => {
    appendFileSync(join(dir, 'scripts/agent/ok.test.mjs'), '// a reviewed script change\n');
    // Committed, Accepted, with the owner's words, but not in the index.
    put(dir, 'docs/agent/decisions/ADR-0005-unindexed.md', adrText('ADR-0005', 'Unindexed', 'x', { owner: true }));
    // Indexed, but the file isn't committed.
    put(dir, 'docs/agent/decisions/ADR-0006-uncommitted.md', adrText('ADR-0006', 'Uncommitted', 'x', { owner: true }));
    appendFileSync(join(dir, 'docs/agent/decisions/INDEX.md'), `${indexRow('ADR-0006', 'uncommitted', 'Yes')}\n`);
    // Committed and indexed, but Proposed.
    addAdr(dir, 'ADR-0007', 'proposed', adrText('ADR-0007', 'Proposed', 'x', { status: 'Proposed', owner: true }));
    git(dir, 'add', 'docs/agent/decisions/ADR-0005-unindexed.md', 'docs/agent/decisions/ADR-0007-proposed.md', 'docs/agent/decisions/INDEX.md');
    git(dir, 'commit', '-q', '--no-verify', '-m', 'ADRs');
    for (const id of ['ADR-0005', 'ADR-0006']) {
      assertRefused(agent(dir, 'protect', ['--update', '--adr', id]), '--update needs --adr ADR-NNNN: a committed ADR listed in docs/agent/decisions/INDEX.md');
      assertRefused(record(dir, ['--kind', 'owner-decision', '--decision', id]), `decision ${id} is not a committed ADR listed in decisions/INDEX.md`);
    }
    assertRefused(agent(dir, 'protect', ['--update', '--adr', 'ADR-0007']), 'is Proposed, not Accepted');
    // An agent ADR (Accepted, committed, indexed) no longer blesses even a script change, nor does an owner ADR from
    // before the "## Owner approval" convention: every update needs the owner's words, and a refusal records nothing.
    const record0 = getText(dir, 'docs/agent/PROTECTED.json');
    const ledger0 = getText(dir, 'docs/agent/LEDGER.jsonl');
    const agentOnly = agent(dir, 'protect', ['--update', '--adr', 'ADR-0003']);
    assertRefused(agentOnly, 'docs/agent/decisions/ADR-0003-agent-change.md has no "## Owner approval" section with the owner\'s words');
    assertRefused(agentOnly, "every protected-file update needs the owner's approval");
    assert.ok(!agentOnly.out.includes('owner-only file'), agentOnly.out);
    assertRefused(agent(dir, 'protect', ['--update', '--adr', 'ADR-0001']), 'docs/agent/decisions/ADR-0001-legacy-owner.md has no "## Owner approval" section');
    assert.equal(getText(dir, 'docs/agent/PROTECTED.json'), record0);
    assert.equal(getText(dir, 'docs/agent/LEDGER.jsonl'), ledger0);
    // Committed, ADR-0006 (Accepted, indexed, with the owner's words) records the change, and the repository passes.
    git(dir, 'add', 'docs/agent/decisions/ADR-0006-uncommitted.md');
    git(dir, 'commit', '-q', '--no-verify', '-m', 'commit ADR-0006');
    assertDone(agent(dir, 'protect', ['--update', '--adr', 'ADR-0006']));
    const updated = ledgerEvents(dir).pop();
    assert.deepEqual(updated.decisions, ['ADR-0006']);
    assert.ok(updated.changedFiles.includes('scripts/agent/ok.test.mjs'), updated.changedFiles.join(', '));
    assert.equal(getJson(dir, 'docs/agent/PROTECTED.json').approvedBy, 'docs/agent/decisions/ADR-0006-uncommitted.md');
    assertDone(agent(dir, 'protect'));
    assertClean(checkState(dir));
  });
});

// ---------------------------------------------------------------------------------------------------------------
// record-event.mjs (F5 record-event :94, :99, :103; F1, M2, m3, m7, open point 5)
// ---------------------------------------------------------------------------------------------------------------

test('record-event: repair and transition events must name the current slice (F5 record-event :94)', () => {
  inStage('implement', (dir) => {
    const r = agent(dir, 'record-event', ['--kind', 'repair', '--actor', 'o', '--slice', 'S1', '--task', 'S1-T1', '--defect', 'D-S1-1', '--strategy', 's', '--result', 'r']);
    assertRefused(r, 'repair events name the current slice S0');
    assert.equal(ledgerEvents(dir).filter((e) => e.kind === 'repair').length, 0);
  });
});

test('record-event: an owner-decision event must cite the owner\'s approval (F5 record-event :103, F1, M2)', () => {
  inStage('implement', (dir) => {
    assertRefused(record(dir, ['--kind', 'owner-decision']), "an owner-decision event cites the ADR that records the owner's words");
    assertRefused(record(dir, ['--kind', 'owner-decision', '--decision', 'ADR-0003']), 'decision ADR-0003 has no "## Owner approval" section');
    // Pre-convention owner ADRs were grandfathered only for events already recorded (LEGACY_LEDGER), never for new ones.
    assertRefused(record(dir, ['--kind', 'owner-decision', '--decision', 'ADR-0001']), 'decision ADR-0001 has no "## Owner approval" section');
    assertRefused(record(dir, ['--kind', 'owner-decision', '--decision', 'ADR-0099']), 'decision ADR-0099 is not a committed ADR');
    const before = ledgerEvents(dir).length;
    assertDone(record(dir, ['--kind', 'owner-decision', '--decision', 'ADR-0002']));
    assert.equal(ledgerEvents(dir).length, before + 1);
    assertClean(checkState(dir));
    // The same event written by hand with an agent ADR: check-state catches it.
    appendFileSync(join(dir, 'docs/agent/LEDGER.jsonl'), `${JSON.stringify({ timestamp: '2026-10-06T00:00:00Z', kind: 'owner-decision', actor: 'hand', slice: 'S0', task: 'S0-T1', result: 'r', evidence: [], decisions: ['ADR-0003'] })}\n`);
    assertHas(checkState(dir).errors, 'an owner-decision event must cite the owner\'s approval: ADR-0003 has no');
  });
  inStage('implement', (dir) => {
    // An uncommitted edit that gives an agent ADR an approval section counts for nothing: ADRs are judged as committed.
    appendFileSync(join(dir, 'docs/agent/decisions/ADR-0003-agent-change.md'), `\n## Owner approval\n${OWNER_WORDS}\n`);
    assertRefused(record(dir, ['--kind', 'owner-decision', '--decision', 'ADR-0003']), 'decision ADR-0003 has no "## Owner approval" section');
  });
});

test('record-event: OWNER_GATE resumes where it was entered, and is left only with a new ADR holding the owner\'s words (m3, F1, M2)', () => {
  inStage('implement', (dir) => {
    assertRefused(move(dir, 'IMPLEMENT', 'OWNER_GATE', ['--reason', 'OTHER:fixture', '--resume', 'ACCEPT']), 'OWNER_GATE resumes only at the state it is entered from: --resume IMPLEMENT, not ACCEPT');
    assertDone(move(dir, 'IMPLEMENT', 'OWNER_GATE', ['--reason', 'OTHER:fixture', '--resume', 'IMPLEMENT']));
    assertRefused(move(dir, 'OWNER_GATE', 'IMPLEMENT', ['--decision', 'ADR-0003']), 'decision ADR-0003 has no "## Owner approval" section');
    // A genuine owner ADR that already existed when the gate was entered decides nothing about it.
    assertRefused(move(dir, 'OWNER_GATE', 'IMPLEMENT', ['--decision', 'ADR-0002']), 'decision ADR-0002 already existed at');
    // STATE.resumeState edited by hand: check-state and record-event follow the ledger.
    editState(dir, (s) => ({ ...s, resumeState: 'ACCEPT' }));
    assertHas(checkState(dir).errors, 'STATE.resumeState is ACCEPT but OWNER_GATE was entered with resume IMPLEMENT');
    addAdr(dir, 'ADR-0005', 'gate-answer', adrText('ADR-0005', 'The owner answers the gate', 'Continue the slice.', { owner: true }));
    commitAll(dir, 'ADR-0005 records the owner\'s answer');
    assertRefused(move(dir, 'OWNER_GATE', 'ACCEPT', ['--decision', 'ADR-0005']), 'OWNER_GATE was entered with resume IMPLEMENT');
    editState(dir, (s) => ({ ...s, resumeState: 'IMPLEMENT' }));
    assertDone(move(dir, 'OWNER_GATE', 'IMPLEMENT', ['--decision', 'ADR-0005']));
    assertDone(agent(dir, 'protect', ['--update', '--adr', 'ADR-0005']));
    assertClean(checkState(dir));
  });
});

test('record-event and check-state: BLOCKED_MANUAL_REVIEW is left only with an owner ADR newer than the block (F1 P6, M2)', () => {
  inStage('implement', (dir) => {
    for (const [from, to] of [['IMPLEMENT', 'TARGETED_VERIFY'], ['TARGETED_VERIFY', 'REPAIR'], ['REPAIR', 'BLOCKED_MANUAL_REVIEW']]) assertDone(move(dir, from, to));
    assertRefused(move(dir, 'BLOCKED_MANUAL_REVIEW', 'REPAIR', ['--decision', 'ADR-0004']), 'decision ADR-0004 already existed at');
    assertRefused(move(dir, 'BLOCKED_MANUAL_REVIEW', 'REPAIR', ['--decision', 'ADR-0003']), 'decision ADR-0003 has no');
    // The same exit written by hand past record-event.mjs.
    const blockedAt = ledgerEvents(dir).pop();
    appendFileSync(join(dir, 'docs/agent/LEDGER.jsonl'), `${JSON.stringify({ ...blockedAt, timestamp: '2026-10-06T00:00:00Z', fromState: 'BLOCKED_MANUAL_REVIEW', toState: 'REPAIR', decisions: ['ADR-0004'] })}\n`);
    editState(dir, (s) => ({ ...s, machineState: 'REPAIR' }));
    assertHas(checkState(dir).errors, "leaving BLOCKED_MANUAL_REVIEW must cite the owner's approval: ADR-0004 already existed at");
  });
  inStage('implement', (dir) => {
    // The owner's new ADR, with their words, committed after the block: the exit is recorded and check-state agrees.
    for (const [from, to] of [['IMPLEMENT', 'TARGETED_VERIFY'], ['TARGETED_VERIFY', 'REPAIR'], ['REPAIR', 'BLOCKED_MANUAL_REVIEW']]) assertDone(move(dir, from, to));
    addAdr(dir, 'ADR-0005', 'unblock', adrText('ADR-0005', 'The owner lifts the block', 'Repair D-S0-9 again with the strategy in the root-cause report.', { owner: true }));
    commitAll(dir, 'ADR-0005 records the owner\'s instruction');
    assertDone(move(dir, 'BLOCKED_MANUAL_REVIEW', 'REPAIR', ['--decision', 'ADR-0005']));
    assertDone(agent(dir, 'protect', ['--update', '--adr', 'ADR-0005']));
    assertClean(checkState(dir));
  });
});

test('record-event: repair events keep STATE\'s counters in step, and --resolved needs existing evidence (m7, open point 5)', () => {
  inStage('implement', (dir) => {
    const counters = () => (({ repairTarget, repairAttempt, repairTotalAttempts }) => [repairTarget, repairAttempt, repairTotalAttempts])(getJson(dir, 'docs/agent/STATE.json'));
    assertDone(record(dir, ['--kind', 'repair', '--defect', 'D-S0-9', '--strategy', 'first', '--distinct']));
    assertDone(record(dir, ['--kind', 'repair', '--defect', 'D-S0-9', '--strategy', 'second']));
    assertDone(record(dir, ['--kind', 'repair', '--defect', 'D-S0-8', '--strategy', 'other defect']));
    assert.deepEqual(counters(), ['D-S0-9', 1, 2]);
    assertClean(checkState(dir));
    assertRefused(record(dir, ['--kind', 'repair', '--defect', 'D-S0-9', '--resolved']), '--resolved needs --evidence naming the passing run that resolves D-S0-9');
    assertRefused(record(dir, ['--kind', 'repair', '--defect', 'D-S0-9', '--resolved', '--evidence', 'docs/agent/evidence/S0/logs/none.log']), '--resolved needs --evidence');
    assertDone(record(dir, ['--kind', 'repair', '--defect', 'D-S0-9', '--resolved', '--evidence', 'docs/agent/evidence/S0/manifest.json']));
    assert.deepEqual(counters(), [null, 0, 0]);
    assertClean(checkState(dir));
  });
});

// ---------------------------------------------------------------------------------------------------------------
// verify-slice.mjs and evidence.mjs (F5 verify-slice :53, evidence :150)
// ---------------------------------------------------------------------------------------------------------------

test('verify-slice: the e2e gate never inherits E2E_REUSE (F5 verify-slice :53, HARNESS-006 A1)', () => {
  inStage('implement', (dir) => {
    // The stand-in fails when E2E_REUSE=1 reaches it, as a reused dev server would.
    assert.equal(run('npm', ['run', 'e2e'], dir, { E2E_REUSE: '1' }).status, 3);
    assertDone(agent(dir, 'verify-slice', ['--gates', 'e2e'], { E2E_REUSE: '1' }));
    const rec = getJson(dir, 'docs/agent/evidence/S0/manifest.json').commands.pop();
    assert.deepEqual([rec.gate, rec.command, rec.exitCode], ['e2e', 'npm run e2e', 0]);
    assert.equal(getJson(dir, 'docs/agent/STATE.json').gates.e2e, 'GREEN');
  });
});

test('verify-slice: a gate run during which the code changed is flagged and can\'t count (F5 evidence :150)', () => {
  inStage('implement', (dir) => {
    assertDone(agent(dir, 'verify-slice', ['--gates', 'unit'], { FIXTURE_TOUCH: 'src/app.ts' }));
    const rec = getJson(dir, 'docs/agent/evidence/S0/manifest.json').commands.pop();
    assert.equal(rec.treeChanged, true);
    assert.notEqual(rec.codeTreeAfter, rec.codeTree);
    assertHas(checkState(dir).errors, "gate unit's latest run saw the code change while it ran");
  });
});

test('verify-slice: a failing gate is recorded RED with its log and hash (runAndRecord, HARNESS-012 A1)', () => {
  inStage('implement', (dir) => {
    const r = agent(dir, 'verify-slice', ['--gates', 'typecheck'], { FIXTURE_FAIL: 'typecheck' });
    assert.equal(r.status, 1, r.out);
    const rec = getJson(dir, 'docs/agent/evidence/S0/manifest.json').commands.pop();
    assert.deepEqual([rec.gate, rec.exitCode], ['typecheck', 1]);
    assert.equal(sha256(join(dir, rec.log)), rec.logSha256);
    assert.match(getText(dir, rec.log), /stand-in typecheck: failing/);
    assert.match(rec.codeTree, /^[0-9a-f]{40}$/);
    assert.equal(getJson(dir, 'docs/agent/STATE.json').gates.typecheck, 'RED');
  });
});

test('test-inventory: a skip marker added to a harness test file fails the gate (harness-2 m6)', () => {
  inStage('implement', (dir) => {
    assertDone(agent(dir, 'test-inventory'));
    appendFileSync(join(dir, 'scripts/agent/ok.test.mjs'), "test('later', { skip: 'not yet' }, () => {});\n");
    assertRefused(agent(dir, 'test-inventory'), 'scripts/agent/ok.test.mjs gained 1 skip/only/todo/fails marker(s)');
  });
});

// ---------------------------------------------------------------------------------------------------------------
// diff-check.mjs (F5 diff-check :38)
// ---------------------------------------------------------------------------------------------------------------

test('diff-check: whitespace errors fail the gate everywhere except in evidence logs (F5 diff-check :38)', () => {
  inStage('implement', (dir) => {
    assertDone(agent(dir, 'diff-check'));
    // Raw tool output in evidence logs, committed or new, is never "cleaned" (it is hashed in the manifest).
    put(dir, 'docs/agent/evidence/S0/logs/raw.log', 'a line with trailing spaces   \n');
    commitAll(dir, 'evidence log');
    put(dir, 'docs/agent/evidence/S0/logs/new.log', 'another trailing space \n');
    assertDone(agent(dir, 'diff-check'));
    put(dir, 'src/new.ts', 'export const x = 1;   \n');
    assertRefused(agent(dir, 'diff-check'), 'src/new.ts');
    rmSync(join(dir, 'src/new.ts'));
    put(dir, 'src/app.ts', 'export const answer = 42; \n');
    assertRefused(agent(dir, 'diff-check'), 'src/app.ts');
  });
});

// ---------------------------------------------------------------------------------------------------------------
// capture-evidence.mjs (security-data-2 m1)
// ---------------------------------------------------------------------------------------------------------------

test('capture-evidence: --review --candidate records the reviewed commit only when its code is the working tree\'s (security-data-2 m1)', () => {
  inStage('implement', (dir) => {
    const report = 'docs/agent/evidence/S0/reviews/code-architecture-1.md';
    put(dir, report, '# review\n\nVerdict: GREEN\n');
    const review = (...more) => agent(dir, 'capture-evidence', ['--review', '--role', 'code-architecture', '--verdict', 'GREEN', '--report', report, ...more]);
    assertRefused(review('--candidate', stages().baseline), `--candidate ${stages().baseline} has code tree`);
    assertRefused(review('--candidate', 'no-such-commit'), '--candidate no-such-commit is not a commit in this repository');
    assertRefused(review('--candidate='), '--candidate= has an empty value');
    assert.equal(getJson(dir, 'docs/agent/evidence/S0/manifest.json').reviews.length, 0);
    const head = git(dir, 'rev-parse', 'HEAD');
    assertDone(review('--candidate', 'HEAD'));
    const rec = getJson(dir, 'docs/agent/evidence/S0/manifest.json').reviews.pop();
    assert.equal(rec.candidate, head);
    assertDone(review());
    assert.equal(getJson(dir, 'docs/agent/evidence/S0/manifest.json').reviews.pop().candidate, undefined);
    // A targeted command is recorded with its gate label.
    assertDone(agent(dir, 'capture-evidence', ['--command', `"${NODE}" -e "console.log(1)"`, '--label', 'smoke']));
    assert.equal(getJson(dir, 'docs/agent/evidence/S0/manifest.json').commands.pop().gate, 'check:smoke');
  });
});

// ---------------------------------------------------------------------------------------------------------------
// relaunch.mjs: a smoke run of main() and snapshot() (ADR-0011 open point 7; security-data-2 M1 and M2)
// ---------------------------------------------------------------------------------------------------------------

/**
 * Run relaunch.mjs in a fixture with a stub --claude. Its PATH holds only a git wrapper and a decoy `claude` that records
 * any call, so neither the real claude nor osascript can be reached; the origin is a bare clone of the fixture.
 */
function relaunchIn(dir, args, { mode = 'idle', withStub = true } = {}) {
  const box = mkdtempSync(join(WORK, 'relaunch-'));
  const rbin = join(box, 'bin');
  mkdirSync(rbin);
  const realGit = spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf8', env: fixtureEnv() }).stdout.trim();
  executable(join(rbin, 'git'), `exec "${realGit}" "$@"`);
  const decoy = join(box, 'decoy-claude-called');
  executable(join(rbin, 'claude'), `echo called > "${decoy}"\nexit 99`);
  const callFile = join(box, 'stub-call.json');
  writeFileSync(
    join(box, 'stub-claude.mjs'),
    [
      "import { writeFileSync } from 'node:fs';",
      "import { spawnSync } from 'node:child_process';",
      'writeFileSync(process.env.FIXTURE_STUB_CALL, JSON.stringify({ argv: process.argv.slice(2), env: process.env }));',
      "if (process.env.FIXTURE_STUB_MODE === 'decide') {",
      "  const r = spawnSync(process.execPath, ['scripts/agent/record-event.mjs', '--kind', 'owner-decision', '--actor', 'stub-session', '--slice', 'S0', '--task', 'S0-T1', '--result', 'decided for the owner', '--decision', 'ADR-0002'], { stdio: 'inherit' });",
      '  process.exit(r.status ?? 1);',
      '}',
      '',
    ].join('\n'),
  );
  const stub = join(box, 'stub-claude');
  executable(stub, `exec "${NODE}" "${join(box, 'stub-claude.mjs')}" "$@"`);
  if (!git(dir, 'remote').split('\n').includes('origin')) {
    git(dir, 'clone', '-q', '--bare', dir, join(box, 'origin.git'));
    git(dir, 'remote', 'add', 'origin', join(box, 'origin.git'));
  }
  mkdirSync(join(box, 'home'));
  const env = { PATH: rbin, HOME: join(box, 'home'), CLAUDE_CONFIG_DIR: join(box, 'claude-config'), TMPDIR: tmpdir(), GH_TOKEN: 'fixture-token', ...GIT_ENV, FIXTURE_STUB_CALL: callFile, FIXTURE_STUB_MODE: mode };
  const r = spawnSync(NODE, [join(dir, 'scripts/agent/relaunch.mjs'), ...args, ...(withStub ? ['--claude', stub] : [])], { cwd: dir, env, encoding: 'utf8', timeout: 90000 });
  if (r.error) throw r.error;
  const call = existsSync(callFile) ? JSON.parse(readFileSync(callFile, 'utf8')) : null;
  return { status: r.status, out: `${r.stdout}\n${r.stderr}`, call, decoyCalled: existsSync(decoy) };
}

test('relaunch: a smoke run starts one session with the stub, strips credentials, records it and releases the lock (open point 7)', () => {
  inStage('implement', (dir) => {
    const before = ledgerEvents(dir).length;
    const r = relaunchIn(dir, ['--max-sessions', '1']);
    assert.equal(r.status, 0, r.out);
    assert.equal(r.decoyCalled, false, 'the PATH claude was never called');
    assert.match(r.out, /session 1: S0 S0-T1 \(IMPLEMENT\)/);
    assert.match(r.out, /stop \(the session left uncommitted changes/);
    // The stub got the kickoff prompt and the unattended settings, without push credentials.
    assert.ok(r.call, 'the stub claude ran');
    assert.deepEqual(r.call.argv.slice(0, 2), ['-p', 'Start the fixture session. Read docs/agent first.']);
    const after = (flag) => r.call.argv[r.call.argv.indexOf(flag) + 1];
    assert.equal(after('--permission-mode'), 'auto');
    assert.equal(after('--permission-prompts'), 'none');
    assert.ok(JSON.parse(after('--settings')).permissions.deny.includes('Bash(git push *)'));
    assert.equal(r.call.env.GH_TOKEN, undefined);
    assert.equal(r.call.env.GIT_TERMINAL_PROMPT, '0');
    assert.equal(r.call.env.GIT_CONFIG_KEY_0, 'credential.helper');
    // The session is in the ledger, with its transcript's path and hash; the lock is gone.
    const added = ledgerEvents(dir).slice(before);
    assert.deepEqual(added.map((e) => [e.kind, e.actor]), [['session-start', 'relaunch'], ['session-end', 'relaunch']]);
    assert.match(added[1].result, /^exit 0; stop: the session left uncommitted changes/);
    assert.ok(existsSync(join(dir, added[0].evidence[0])), 'the transcript file exists');
    assert.ok(!existsSync(join(dir, '.agent-runs/relaunch.lock')), 'the lock was released');
  });
});

test('relaunch: a session that records an owner decision stops the launcher with an alarm (security-data-2 M2)', () => {
  inStage('implement', (dir) => {
    const r = relaunchIn(dir, ['--max-sessions', '3'], { mode: 'decide' });
    assert.equal(r.status, 2, r.out);
    assert.match(r.out, /an owner-decision event \(ADR-0002\) was recorded during an unattended session/);
    assert.equal(r.decoyCalled, false);
  });
});

test('relaunch: --dry-run starts nothing, and typos are refused before anything runs (security-data-2 M1)', () => {
  inStage('implement', (dir) => {
    const before = getText(dir, 'docs/agent/LEDGER.jsonl');
    const dry = relaunchIn(dir, ['--dry-run']);
    assert.equal(dry.status, 0, dry.out);
    assert.match(dry.out, /Pre-flight OK\. Would run:/);
    assert.equal(dry.call, null, 'no session was started');
    for (const [argv, message] of [[['-dry-run'], 'single-dash option "-dry-run"'], [['—dry-run'], 'typographic dash'], [['dry-run'], 'unexpected argument "dry-run"'], [['-n'], 'single-dash option "-n"'], [['--dry-run='], '--dry-run takes no value'], [['--help='], '--help takes no value']]) {
      const r = relaunchIn(dir, argv);
      assert.equal(r.status, 1, `${argv.join(' ')}:\n${r.out}`);
      assert.ok(r.out.includes(message), `${argv.join(' ')}:\n${r.out}`);
      assert.equal(r.call, null, `${argv.join(' ')} started a session`);
      assert.equal(r.decoyCalled, false);
    }
    assert.equal(getText(dir, 'docs/agent/LEDGER.jsonl'), before, 'nothing was recorded');
  });
});
