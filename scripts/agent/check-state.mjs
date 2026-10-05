#!/usr/bin/env node
/**
 * Validate the harness's durable state (master §41 check-state): STATE.json, REQUIREMENTS.json, LEDGER.jsonl,
 * the design registry, CURRENT_SLICE.md and the current slice's evidence manifest, against Git reality.
 *
 *   node scripts/agent/check-state.mjs           # errors exit 1, warnings don't
 *   node scripts/agent/check-state.mjs --json    # machine-readable result
 *   node scripts/agent/check-state.mjs --strict  # warnings fail too
 *
 * It refuses the "accepted without evidence" combinations: a GREEN gate without a passing recorded command for the
 * same code tree, an accepted state without GREEN gates, review and manifest, remote or multiplayer permission
 * without an ADR, a rewritten ledger line, and a requirement deleted from the committed registry.
 */
import { pathToFileURL } from 'node:url';
import {
  ACCEPTED_STATES,
  DESIGN_STATUSES,
  GATE_COMMANDS,
  GATE_VALUES,
  LEGAL_STATES,
  PATHS,
  REPAIR_LIMITS,
  REQ_FAMILIES,
  REQ_STATUSES,
  SLICES,
  STOP_STATES,
  abs,
  exists,
  git,
  gitOk,
  parseArgs,
  parseLedger,
  readJson,
  readText,
  sha256File,
  validateEvent,
} from './lib.mjs';
import { codeTreeOf } from './evidence.mjs';
import { verifyProtected } from './protect.mjs';

const REQUIRED_STATE_KEYS = {
  schemaVersion: 'number',
  project: 'string',
  planningBaselineSha: 'string',
  remoteMutationAllowed: 'boolean',
  currentSlice: 'string',
  currentTask: 'string',
  machineState: 'string',
  repairAttempt: 'number',
  contextRolloverRequired: 'boolean',
  ownerGateRequired: 'boolean',
  multiplayerApproved: 'boolean',
  requiredReviewers: 'object',
  gates: 'object',
};

const SHA_RE = /^[0-9a-f]{40}$/;
const REQ_ID_RE = new RegExp(`^(${REQ_FAMILIES.join('|')})-\\d{3}$`);
const REQ_TOKEN_RE = new RegExp(`\\b(?:${REQ_FAMILIES.join('|')})-\\d{3}\\b`, 'g');

/** Pure checks on STATE.json alone. */
export function validateState(s) {
  const errors = [];
  const warnings = [];
  if (!s || typeof s !== 'object') return { errors: ['STATE.json is not an object'], warnings };
  for (const [k, t] of Object.entries(REQUIRED_STATE_KEYS)) {
    if (typeof s[k] !== t || s[k] === null) errors.push(`STATE.${k} must be a ${t}`);
  }
  if (s.schemaVersion !== 2) errors.push(`STATE.schemaVersion must be 2 (found ${s.schemaVersion})`);
  if (!LEGAL_STATES.includes(s.machineState)) errors.push(`STATE.machineState ${s.machineState} is not a legal state (master §11)`);
  if (!SLICES.includes(s.currentSlice)) errors.push(`STATE.currentSlice ${s.currentSlice} is not one of ${SLICES.join(', ')}`);
  const total = s.repairTotalAttempts ?? 0;
  if (!Number.isInteger(s.repairAttempt) || s.repairAttempt < 0 || s.repairAttempt > REPAIR_LIMITS.distinctStrategies) {
    errors.push(`STATE.repairAttempt (distinct strategies) must be an integer 0-${REPAIR_LIMITS.distinctStrategies}`);
  }
  if (!Number.isInteger(total) || total < 0 || total > REPAIR_LIMITS.totalAttempts || total < s.repairAttempt) {
    errors.push(`STATE.repairTotalAttempts must be an integer from repairAttempt to ${REPAIR_LIMITS.totalAttempts}`);
  }
  if ((s.repairAttempt >= REPAIR_LIMITS.distinctStrategies || total >= REPAIR_LIMITS.totalAttempts) && s.machineState !== 'BLOCKED_MANUAL_REVIEW') {
    errors.push(`the repair limit (${REPAIR_LIMITS.distinctStrategies} distinct strategies or ${REPAIR_LIMITS.totalAttempts} attempts) requires BLOCKED_MANUAL_REVIEW (master §3.3, OPERATIONS.md §5)`);
  }
  if ((s.repairAttempt > 0 || total > 0) && !s.repairTarget) errors.push('STATE.repairTarget must name the blocking defect while repairs are counted');
  if (s.resumeState != null && !LEGAL_STATES.includes(s.resumeState)) errors.push(`STATE.resumeState ${s.resumeState} is not a legal state`);
  if (s.machineState === 'OWNER_GATE' && !s.resumeState) errors.push('OWNER_GATE needs STATE.resumeState (where work continues after the decision)');
  for (const k of ['planningBaselineSha', 'actualBaselineSha', 'lastAcceptedCheckpoint']) {
    if (s[k] != null && !SHA_RE.test(s[k])) errors.push(`STATE.${k} must be a full 40-character SHA or null`);
  }
  if (s.remoteMutationAllowed && !s.remoteApproval) errors.push('remoteMutationAllowed is true without STATE.remoteApproval (an ADR that records the owner\'s verbatim yes)');
  if (s.multiplayerApproved && !s.multiplayerApproval) errors.push('multiplayerApproved is true without STATE.multiplayerApproval (an ADR that records the owner\'s verbatim yes)');
  if (s.machineState === 'OWNER_GATE' && !s.ownerGateReason) errors.push('OWNER_GATE needs STATE.ownerGateReason');
  if (s.ownerGateRequired && s.machineState !== 'OWNER_GATE') warnings.push('ownerGateRequired is true but machineState is not OWNER_GATE');
  if (s.gates && typeof s.gates === 'object') {
    for (const [g, v] of Object.entries(s.gates)) {
      if (!GATE_VALUES.includes(v)) errors.push(`STATE.gates.${g} has unknown value ${v}`);
    }
    for (const g of ['typecheck', 'unit', 'build', 'e2e', 'diffCheck', 'independentReview']) {
      if (!(g in s.gates)) errors.push(`STATE.gates.${g} is missing`);
    }
  }
  if (!Array.isArray(s.requiredReviewers) || !s.requiredReviewers.includes('code-architecture')) {
    errors.push('STATE.requiredReviewers must include code-architecture (master §26)');
  }
  return { errors, warnings };
}

/** The newest manifest command record for a gate, or undefined. */
function latestRecord(manifest, gate) {
  const recs = (manifest?.commands ?? []).filter((c) => c.gate === gate);
  return recs[recs.length - 1];
}

/**
 * Cross-checks between STATE.json and the current slice's evidence manifest. `codeTree` is the code tree that the
 * gates must have been run on (HEAD's when the state claims acceptance).
 */
export function validateGateEvidence(s, manifest, { codeTree, acceptedTree } = {}) {
  const errors = [];
  const warnings = [];
  const gates = s.gates ?? {};
  for (const [gate, value] of Object.entries(gates)) {
    if (value !== 'GREEN') continue;
    if (gate in GATE_COMMANDS) {
      const rec = latestRecord(manifest, gate);
      if (!rec) errors.push(`gate ${gate} is GREEN but the ${s.currentSlice} manifest has no recorded "${GATE_COMMANDS[gate]}" run`);
      else if (rec.exitCode !== 0) errors.push(`gate ${gate} is GREEN but its latest recorded run exited ${rec.exitCode}`);
      else if (codeTree && rec.codeTree && rec.codeTree !== codeTree) {
        (acceptedTree ? errors : warnings).push(`gate ${gate} passed on code tree ${rec.codeTree.slice(0, 10)}, not the current ${codeTree.slice(0, 10)}; re-run it`);
      }
    } else if (gate === 'independentReview') {
      const greens = (manifest?.reviews ?? []).filter((r) => r.verdict === 'GREEN' && r.role === 'code-architecture');
      if (!greens.length) errors.push('independentReview is GREEN but the manifest has no GREEN code-architecture review');
    } else if (gate === 'browserQa') {
      if (!(manifest?.browserRuns ?? []).length) errors.push('browserQa is GREEN but the manifest has no browser runs');
    }
  }
  for (const role of s.requiredReviewers ?? []) {
    const reviews = (manifest?.reviews ?? []).filter((r) => r.role === role);
    const last = reviews[reviews.length - 1];
    if (ACCEPTED_STATES.includes(s.machineState) && (!last || last.verdict !== 'GREEN')) {
      errors.push(`${s.machineState} needs a GREEN ${role} review in the ${s.currentSlice} manifest`);
    }
  }
  if (ACCEPTED_STATES.includes(s.machineState)) {
    for (const [gate, value] of Object.entries(gates)) {
      if (!['GREEN', 'NOT_APPLICABLE'].includes(value)) errors.push(`${s.machineState} claims acceptance but gate ${gate} is ${value}`);
    }
    if (!manifest) errors.push(`${s.machineState} claims acceptance but docs/agent/evidence/${s.currentSlice}/manifest.json is missing`);
    else if (manifest.verdict !== 'GREEN') errors.push(`${s.machineState} claims acceptance but the manifest verdict is ${manifest.verdict}`);
  }
  return { errors, warnings };
}

/**
 * Every file the manifest cites must still exist with the recorded hash, and committed evidence must not be
 * ignored by Git. Files kept outside Git on purpose (.agent-runs/) only warn when missing. Also flags gates that
 * failed and then passed on the same code tree: those are FLAKY and must be listed in the acceptance report.
 */
export function validateEvidenceFiles(manifest, { exists: fileExists, hash, ignored }) {
  const errors = [];
  const warnings = [];
  const check = (rel, sha, what) => {
    if (!rel) return;
    const outside = rel.startsWith('.agent-runs/');
    if (!fileExists(rel)) (outside ? warnings : errors).push(`${what} ${rel} cited in the manifest is missing`);
    else if (sha && hash(rel) !== sha) errors.push(`${what} ${rel} no longer matches its recorded SHA-256 (evidence was edited)`);
    else if (!outside && ignored(rel)) errors.push(`${what} ${rel} is ignored by Git, so it would never be committed`);
  };
  for (const c of manifest.commands ?? []) {
    check(c.log, c.logSha256, 'log');
    if (c.fullLog) check(c.fullLog.path, c.fullLog.sha256, 'full log');
  }
  for (const r of manifest.reviews ?? []) check(r.report, r.reportSha256, 'review report');
  for (const b of manifest.browserRuns ?? []) check(b.screenshot, b.screenshotSha256, 'screenshot');
  const seenRed = new Set();
  const flaky = new Set();
  for (const c of manifest.commands ?? []) {
    const key = `${c.gate}@${c.codeTree}`;
    if (c.exitCode !== 0) seenRed.add(key);
    else if (seenRed.has(key)) flaky.add(c.gate);
  }
  for (const g of flaky) warnings.push(`gate ${g} failed and then passed on the same code tree: list it as FLAKY in the acceptance report`);
  return { errors, warnings };
}

/** The ledger's repair events for the current defect must not outnumber STATE.repairTotalAttempts. */
export function validateRepairCount(s, events) {
  if (!s.repairTarget) return { errors: [], warnings: [] };
  const logged = events.filter((e) => e?.kind === 'repair' && e.defect === s.repairTarget).length;
  if (logged > (s.repairTotalAttempts ?? 0)) {
    return { errors: [`LEDGER.jsonl records ${logged} repair attempt(s) on ${s.repairTarget} but STATE.repairTotalAttempts is ${s.repairTotalAttempts ?? 0}`], warnings: [] };
  }
  return { errors: [], warnings: [] };
}

/** Pure checks on REQUIREMENTS.json; `committed` is the version at HEAD (or null). */
export function validateRequirements(reqs, committed) {
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
    if (r?.status === 'GREEN' && !(r.evidence?.length && r.tests?.length)) errors.push(`${where}: GREEN without tests and evidence`);
    if (['DEFERRED', 'SUPERSEDED'].includes(r?.status) && !r.decision) errors.push(`${where}: ${r.status} needs a decision (ADR) reference`);
  }
  for (const old of committed?.requirements ?? []) {
    if (old?.id && !seen.has(old.id)) errors.push(`requirement ${old.id} exists at HEAD but was deleted; mark it SUPERSEDED with a decision instead`);
  }
  return { errors, warnings };
}

/** The committed ledger must be a prefix of the working ledger (append-only). */
export function validateLedger(text, committedText) {
  const errors = [];
  const { events, errors: parseErrors } = parseLedger(text);
  errors.push(...parseErrors);
  events.forEach((e, i) => {
    for (const p of validateEvent(e)) errors.push(`LEDGER.jsonl line ${i + 1}: ${p}`);
  });
  if (committedText != null && !text.startsWith(committedText)) {
    errors.push('LEDGER.jsonl no longer starts with its committed content: a line was rewritten or deleted (append-only, master §13)');
  }
  return { errors, warnings: [], events };
}

/** STATE.machineState must be where the last recorded transition left it (no silent state edits). */
export function validateStateAgainstLedger(s, events) {
  const transitions = events.filter((e) => e?.kind === 'transition');
  const last = transitions[transitions.length - 1];
  if (!last) return { errors: [], warnings: s.machineState === 'BOOTSTRAP' ? [] : ['no transition is recorded in LEDGER.jsonl yet'] };
  if (last.toState !== s.machineState) {
    return { errors: [`STATE.machineState is ${s.machineState} but the last recorded transition went to ${last.toState}; record the transition with record-event.mjs`], warnings: [] };
  }
  return { errors: [], warnings: [] };
}

export function validateRegistry(reg, fileExists) {
  const errors = [];
  if (!Array.isArray(reg?.designs)) return { errors: ['DESIGN_REGISTRY.json has no designs array'], warnings: [] };
  const ids = new Set();
  for (const d of reg.designs) {
    if (ids.has(d.id)) errors.push(`design ${d.id}: duplicate id`);
    ids.add(d.id);
    if (!DESIGN_STATUSES.includes(d.status)) errors.push(`design ${d.id}: unknown status ${d.status}`);
    if (d.status === 'APPROVED') {
      if (!d.approval) errors.push(`design ${d.id}: APPROVED without an approval reference`);
      if (!d.path || !fileExists(d.path)) errors.push(`design ${d.id}: APPROVED but its path ${d.path} does not exist`);
    }
  }
  return { errors, warnings: [] };
}

function tryGit(...args) {
  try {
    return git(...args);
  } catch {
    return null;
  }
}

/** Run every check against the repository. */
export function checkRepository() {
  const errors = [];
  const warnings = [];
  const add = (r) => {
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  };
  let s;
  try {
    s = readJson(PATHS.state);
  } catch (e) {
    return { errors: [`cannot read STATE.json: ${e.message}`], warnings };
  }
  add(validateState(s));

  // Git reality.
  const head = tryGit('rev-parse', 'HEAD');
  const branch = tryGit('rev-parse', '--abbrev-ref', 'HEAD');
  if (branch === 'main' || branch?.startsWith('feat/')) errors.push(`HEAD is on ${branch}: agents never commit on main or feat/* (a push to main deploys); switch to ${s.integrationBranch ?? 'the integration branch'}`);
  else if (s.integrationBranch && branch !== s.integrationBranch) warnings.push(`current branch ${branch} is not the integration branch ${s.integrationBranch}`);
  const mainAhead = tryGit('rev-list', '--count', 'origin/main..main');
  if (mainAhead && Number(mainAhead) > 0) warnings.push(`local main has ${mainAhead} commit(s) that origin/main lacks; a push of main would deploy them`);
  for (const tag of (tryGit('tag', '--list', 'checkpoint/*') ?? '').split('\n').filter(Boolean)) {
    if (head && !gitOk('merge-base', '--is-ancestor', tag, head)) errors.push(`checkpoint tag ${tag} is not an ancestor of HEAD (accepted history was rewritten or abandoned)`);
  }
  for (const k of ['planningBaselineSha', 'actualBaselineSha', 'lastAcceptedCheckpoint']) {
    if (s[k] && SHA_RE.test(s[k]) && !gitOk('cat-file', '-e', `${s[k]}^{commit}`)) errors.push(`STATE.${k} ${s[k]} is not a commit in this repository`);
  }
  if (s.lastAcceptedCheckpoint && head && !gitOk('merge-base', '--is-ancestor', s.lastAcceptedCheckpoint, head)) {
    errors.push('STATE.lastAcceptedCheckpoint is not an ancestor of HEAD (accepted history was rewritten)');
  }
  for (const k of ['remoteApproval', 'multiplayerApproval']) {
    if (s[k] && !exists(s[k])) errors.push(`STATE.${k} points at ${s[k]}, which does not exist`);
  }
  if (exists(PATHS.stopFile)) warnings.push('docs/agent/STOP exists: the relaunch script will not start sessions');

  // Evidence for the current slice.
  const manifestPath = `${PATHS.evidence}/${s.currentSlice}/manifest.json`;
  let manifest = null;
  if (exists(manifestPath)) {
    try {
      manifest = readJson(manifestPath);
    } catch (e) {
      errors.push(`${manifestPath} is not valid JSON: ${e.message}`);
    }
  }
  const accepted = ACCEPTED_STATES.includes(s.machineState);
  let codeTree = null;
  try {
    codeTree = accepted && s.lastAcceptedCheckpoint ? codeTreeOf(s.lastAcceptedCheckpoint) : codeTreeOf(null);
  } catch (e) {
    warnings.push(`could not compute the code tree: ${e.message}`);
  }
  add(validateGateEvidence(s, manifest, { codeTree, acceptedTree: accepted }));
  if (manifest) add(validateEvidenceFiles(manifest, { exists, hash: (rel) => sha256File(abs(rel)), ignored: (rel) => gitOk('check-ignore', '-q', rel) }));

  // Requirements (append-only ids against HEAD).
  try {
    const reqs = readJson(PATHS.requirements);
    const committedText = tryGit('show', `HEAD:${PATHS.requirements}`);
    add(validateRequirements(reqs, committedText ? JSON.parse(committedText) : null));
    const known = new Set(reqs.requirements.map((r) => r.id));
    if (exists(PATHS.currentSlice)) {
      const slice = readText(PATHS.currentSlice);
      const first = slice.split('\n').slice(0, 6).join('\n');
      if (!first.includes(s.currentSlice)) errors.push(`CURRENT_SLICE.md does not name the current slice ${s.currentSlice} in its header`);
      for (const id of new Set(slice.match(REQ_TOKEN_RE) ?? [])) {
        if (!known.has(id)) errors.push(`CURRENT_SLICE.md references unknown requirement ${id}`);
      }
    }
  } catch (e) {
    errors.push(`cannot check REQUIREMENTS.json: ${e.message}`);
  }

  // Ledger.
  try {
    const text = exists(PATHS.ledger) ? readText(PATHS.ledger) : '';
    const committed = tryGit('show', `HEAD:${PATHS.ledger}`);
    const ledger = validateLedger(text, committed == null ? null : committed.length ? `${committed}\n` : '');
    add(ledger);
    add(validateStateAgainstLedger(s, ledger.events));
    add(validateRepairCount(s, ledger.events));
  } catch (e) {
    errors.push(`cannot check LEDGER.jsonl: ${e.message}`);
  }

  // Design registry.
  try {
    add(validateRegistry(readJson(PATHS.designRegistry), exists));
  } catch (e) {
    errors.push(`cannot check the design registry: ${e.message}`);
  }

  // Protected harness files.
  try {
    add(verifyProtected());
  } catch (e) {
    errors.push(`cannot verify protected files: ${e.message}`);
  }

  if (STOP_STATES.includes(s.machineState)) warnings.push(`machineState is ${s.machineState}: no session may continue without the owner`);
  return { errors, warnings, state: { slice: s.currentSlice, task: s.currentTask, machineState: s.machineState, branch, head } };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = parseArgs(process.argv.slice(2), ['json', 'strict']);
  const r = checkRepository();
  if (args.json) console.log(JSON.stringify(r, null, 2));
  else {
    for (const e of r.errors) console.log(`ERROR   ${e}`);
    for (const w of r.warnings) console.log(`WARNING ${w}`);
    if (r.state) console.log(`state: ${r.state.slice} ${r.state.task} ${r.state.machineState} on ${r.state.branch} at ${r.state.head?.slice(0, 10)}`);
    console.log(r.errors.length ? `FAILED with ${r.errors.length} error(s)` : 'OK');
  }
  process.exit(r.errors.length || (args.strict && r.warnings.length) ? 1 : 0);
}
