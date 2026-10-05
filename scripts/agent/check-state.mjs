#!/usr/bin/env node
/**
 * Validate the harness's durable state (master §41 check-state): STATE.json, REQUIREMENTS.json, LEDGER.jsonl, the
 * design registry, CURRENT_SLICE.md, every slice's evidence manifest and the protected files, against Git reality.
 *
 *   node scripts/agent/check-state.mjs           # errors exit 1, warnings don't
 *   node scripts/agent/check-state.mjs --json    # machine-readable result
 *   node scripts/agent/check-state.mjs --strict  # warnings fail too
 *
 * It refuses the "accepted without evidence" combinations (lib.mjs explains what such checks can and can't catch):
 * a GREEN gate without a passing run of its real command on the accepted code tree; reviews or browser runs from
 * another tree; a review whose report doesn't end with the recorded verdict; an accepted state with open gates;
 * evidence edited after it was recorded; remote, multiplayer, waiver or design approvals that aren't committed ADRs;
 * rewritten ledger lines, broken transition chains, deleted requirements or manifests, or rewritten manifest records
 * (against every version committed since the last accepted checkpoint, or the baseline before the first one);
 * owner-gate exits without a committed ADR; repair limits passed without stopping; and changed protected files.
 */
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ACCEPTED_STATES,
  ADR_ID_RE,
  DECISION_EXITS,
  DESIGN_STATUSES,
  GATE_COMMANDS,
  GATE_VALUES,
  LEGAL_STATES,
  PATHS,
  POST_CHECKPOINT_STATES,
  REPAIR_LIMITS,
  SLICES,
  STOP_STATES,
  WAIVABLE_GATES,
  abs,
  approvalIsAdr,
  committedVersions,
  exists,
  findAdr,
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
import { reportVerdict } from './capture-evidence.mjs';
import { REQ_TOKEN_RE, auditRequirements, validateRequirements } from './requirements.mjs';

export { validateRequirements };

const SHA_RE = /^[0-9a-f]{40}$/;
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
const ALL_GATES = [...Object.keys(GATE_COMMANDS), 'browserQa', 'independentReview'];

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
  if (!Number.isInteger(s.repairAttempt) || s.repairAttempt < 0) errors.push('STATE.repairAttempt (distinct strategies) must be a whole number');
  if (!Number.isInteger(total) || total < 0 || total < s.repairAttempt) errors.push('STATE.repairTotalAttempts must be a whole number of at least repairAttempt');
  if ((s.repairAttempt > 0 || total > 0) && !s.repairTarget) errors.push('STATE.repairTarget must name the blocking defect while repairs are counted');
  if ((s.repairAttempt >= REPAIR_LIMITS.distinctStrategies || total >= REPAIR_LIMITS.totalAttempts) && s.machineState !== 'BLOCKED_MANUAL_REVIEW' && !(s.repairTarget && s.repairOverrides?.[s.repairTarget])) {
    errors.push(`STATE counts ${s.repairAttempt} distinct strategies and ${total} attempts on ${s.repairTarget ?? 'the repair target'}: at the repair limit (${REPAIR_LIMITS.distinctStrategies} distinct or ${REPAIR_LIMITS.totalAttempts} in total) the slice moves to BLOCKED_MANUAL_REVIEW unless the owner's ADR is in STATE.repairOverrides (OPERATIONS.md §5)`);
  }
  if (s.resumeState != null && (!LEGAL_STATES.includes(s.resumeState) || STOP_STATES.includes(s.resumeState))) errors.push(`STATE.resumeState ${s.resumeState} is not a state work can resume at`);
  if (s.machineState === 'OWNER_GATE' && !s.resumeState) errors.push('OWNER_GATE needs STATE.resumeState (where work continues after the decision)');
  if (s.machineState === 'OWNER_GATE' && !s.ownerGateReason) errors.push('OWNER_GATE needs STATE.ownerGateReason');
  if (s.ownerGateRequired && s.machineState !== 'OWNER_GATE') warnings.push('ownerGateRequired is true but machineState is not OWNER_GATE');
  for (const k of ['planningBaselineSha', 'actualBaselineSha', 'lastAcceptedCheckpoint']) {
    if (s[k] != null && !SHA_RE.test(s[k])) errors.push(`STATE.${k} must be a full 40-character SHA or null`);
  }
  if (s.remoteMutationAllowed && !s.remoteApproval) errors.push('remoteMutationAllowed is true without STATE.remoteApproval (an ADR that records the owner\'s verbatim yes)');
  if (s.multiplayerApproved && !s.multiplayerApproval) errors.push('multiplayerApproved is true without STATE.multiplayerApproval (an ADR that records the owner\'s verbatim yes)');
  if (s.gates && typeof s.gates === 'object') {
    for (const g of ALL_GATES) if (!(g in s.gates)) errors.push(`STATE.gates.${g} is missing (every gate is required)`);
    for (const [g, v] of Object.entries(s.gates)) {
      if (!ALL_GATES.includes(g)) errors.push(`STATE.gates.${g} is not a known gate`);
      if (!GATE_VALUES.includes(v)) errors.push(`STATE.gates.${g} has unknown value ${v}`);
      if ((v === 'NOT_APPLICABLE' || v === 'NOT_YET_REQUIRED') && !WAIVABLE_GATES.includes(g) && !s.gateWaivers?.[g]) {
        errors.push(`gate ${g} can't be ${v} without an owner-approved waiver in STATE.gateWaivers.${g}`);
      }
    }
  }
  if (!Array.isArray(s.requiredReviewers) || !s.requiredReviewers.includes('code-architecture')) {
    errors.push('STATE.requiredReviewers must include code-architecture (master §26)');
  }
  return { errors, warnings };
}

/** Gate records count as evidence only when they ran the gate's real command and aren't baseline records. */
const gateRecords = (manifest, gate) => (manifest?.commands ?? []).filter((c) => c.gate === gate && !c.phase);

/**
 * STATE vs the current slice's manifest. `targetTree` is the code tree the evidence must belong to (null when it
 * couldn't be computed); in accepted states every check is an error, before acceptance tree mismatches only warn.
 */
export function validateGateEvidence(s, manifest, { targetTree = null, accepted = false } = {}) {
  const errors = [];
  const warnings = [];
  const strict = (msg) => (accepted ? errors : warnings).push(msg);
  const gates = s.gates ?? {};
  if (accepted && !targetTree) errors.push('the accepted code tree could not be computed, so no gate evidence can be checked');
  for (const [gate, value] of Object.entries(gates)) {
    if (value !== 'GREEN') continue;
    if (gate in GATE_COMMANDS) {
      const recs = gateRecords(manifest, gate);
      const rec = recs[recs.length - 1];
      if (!rec) {
        errors.push(`gate ${gate} is GREEN but the ${s.currentSlice} manifest has no recorded "${GATE_COMMANDS[gate]}" run`);
        continue;
      }
      if (rec.command !== GATE_COMMANDS[gate]) errors.push(`gate ${gate} is GREEN but its latest record ran "${rec.command}", not "${GATE_COMMANDS[gate]}"`);
      if (rec.exitCode !== 0) errors.push(`gate ${gate} is GREEN but its latest recorded run exited ${rec.exitCode}`);
      if (!rec.log || !rec.logSha256 || !rec.codeTree) errors.push(`gate ${gate}'s latest record has no log, log hash or code tree`);
      if (rec.treeChanged) errors.push(`gate ${gate}'s latest run saw the code change while it ran; run it again`);
      if (targetTree && rec.codeTree && rec.codeTree !== targetTree) strict(`gate ${gate} passed on code tree ${rec.codeTree.slice(0, 10)}, not ${targetTree.slice(0, 10)}; run it again`);
    } else if (gate === 'independentReview') {
      const greens = (manifest?.reviews ?? []).filter((r) => r.verdict === 'GREEN' && r.role === 'code-architecture');
      if (!greens.length) errors.push('independentReview is GREEN but the manifest has no GREEN code-architecture review');
    } else if (gate === 'browserQa') {
      const runs = manifest?.browserRuns ?? [];
      if (!runs.length) errors.push('browserQa is GREEN but the manifest has no browser runs');
      const onTree = targetTree ? runs.filter((b) => b.codeTree === targetTree) : runs;
      if (accepted && targetTree && !onTree.length) errors.push('browserQa is GREEN but no browser run was recorded on the accepted code tree');
      if (onTree.some((b) => b.consoleErrors !== 0)) strict('a browser run on this code tree recorded console errors');
    }
  }
  if (accepted) {
    for (const role of s.requiredReviewers ?? []) {
      const reviews = (manifest?.reviews ?? []).filter((r) => r.role === role);
      const last = reviews[reviews.length - 1];
      if (!last || last.verdict !== 'GREEN') errors.push(`${s.machineState} needs a GREEN ${role} review in the ${s.currentSlice} manifest`);
      else if (targetTree && last.codeTree !== targetTree) errors.push(`the latest ${role} review covered code tree ${String(last.codeTree).slice(0, 10)}, not the accepted ${targetTree.slice(0, 10)}`);
    }
    for (const [gate, value] of Object.entries(gates)) {
      const waived = (value === 'NOT_APPLICABLE' && (WAIVABLE_GATES.includes(gate) || s.gateWaivers?.[gate]));
      if (value !== 'GREEN' && !waived) errors.push(`${s.machineState} claims acceptance but gate ${gate} is ${value}`);
    }
    if (!manifest) errors.push(`${s.machineState} claims acceptance but docs/agent/evidence/${s.currentSlice}/manifest.json is missing`);
    else if (manifest.verdict !== 'GREEN') errors.push(`${s.machineState} claims acceptance but the manifest verdict is ${manifest.verdict}`);
  }
  return { errors, warnings };
}

/** Where evidence may live: committed under docs/agent/evidence/, or kept outside Git under .agent-runs/. */
export const EVIDENCE_DIRS = ['docs/agent/evidence/', '.agent-runs/'];

/**
 * Every file the manifest cites must lie inside EVIDENCE_DIRS, still exist with its recorded hash and not be ignored
 * by Git. Only full logs and screenshots may be kept outside Git on purpose (under .agent-runs/, where a missing file
 * only warns); command logs, review reports and recorded files must be committed. A review's report must end with the
 * verdict it was recorded with. A gate that failed and then passed on one tree is FLAKY.
 */
export function validateEvidenceFiles(manifest, { exists: fileExists, hash, ignored, read }) {
  const errors = [];
  const warnings = [];
  const check = (rel, sha, what, committedOnly = true) => {
    if (!rel) {
      errors.push(`${what} has no path`);
      return false;
    }
    if (typeof rel !== 'string' || isAbsolute(rel) || rel.split(/[\\/]/).includes('..') || !EVIDENCE_DIRS.some((d) => rel.startsWith(d))) {
      errors.push(`${what} ${rel} is outside ${EVIDENCE_DIRS.join(' and ')}`);
      return false;
    }
    const outside = rel.startsWith('.agent-runs/');
    if (outside && committedOnly) {
      errors.push(`${what} ${rel} is under .agent-runs/, which Git ignores: it must be committed under docs/agent/evidence/`);
      return false;
    }
    if (!fileExists(rel)) {
      (outside ? warnings : errors).push(`${what} ${rel} cited in the manifest is missing`);
      return false;
    }
    if (!sha) errors.push(`${what} ${rel} has no recorded SHA-256`);
    else if (hash(rel) !== sha) errors.push(`${what} ${rel} no longer matches its recorded SHA-256 (evidence was edited)`);
    if (!outside && ignored(rel)) errors.push(`${what} ${rel} is ignored by Git, so it would never be committed`);
    return true;
  };
  for (const c of manifest.commands ?? []) {
    check(c.log, c.logSha256, 'log');
    if (c.fullLog) check(c.fullLog.path, c.fullLog.sha256, 'full log', false);
  }
  for (const r of manifest.reviews ?? []) {
    if (check(r.report, r.reportSha256, 'review report') && read) {
      const ended = reportVerdict(read(r.report));
      if (ended !== r.verdict) errors.push(`review report ${r.report} ends with ${ended ?? 'no verdict'}, but it was recorded as ${r.verdict}`);
    }
  }
  for (const b of manifest.browserRuns ?? []) check(b.screenshot, b.screenshotSha256, 'screenshot', false);
  for (const f of manifest.files ?? []) check(f.path, f.sha256, `${f.kind ?? 'evidence'} file`);
  const seenRed = new Set();
  const flaky = new Set();
  for (const c of manifest.commands ?? []) {
    if (c.phase) continue;
    const key = `${c.gate}@${c.codeTree}`;
    if (c.exitCode !== 0) seenRed.add(key);
    else if (seenRed.has(key)) flaky.add(c.gate);
  }
  for (const g of flaky) warnings.push(`gate ${g} failed and then passed on the same code tree: list it as FLAKY in the acceptance report`);
  return { errors, warnings };
}

/** A manifest may only grow: every committed record stays, unchanged and in order; an accepted verdict stays. */
export function validateManifestAppendOnly(current, committed, label) {
  const errors = [];
  if (!committed) return { errors, warnings: [] };
  for (const k of ['commands', 'reviews', 'browserRuns', 'files', 'performance']) {
    const before = committed[k] ?? [];
    const now = current?.[k] ?? [];
    if (now.length < before.length || before.some((x, i) => JSON.stringify(x) !== JSON.stringify(now[i]))) {
      errors.push(`${label} manifest ${k} no longer starts with its committed records (records are append-only)`);
    }
  }
  if (committed.verdict === 'GREEN' && current?.verdict !== 'GREEN') errors.push(`${label} manifest verdict was GREEN when committed and is now ${current?.verdict}`);
  if (committed.checkpointSha && current?.checkpointSha !== committed.checkpointSha) errors.push(`${label} manifest checkpointSha changed after it was recorded`);
  return { errors, warnings: [] };
}

/**
 * The committed ledger versions must be prefixes of the working ledger, and transitions must form one chain. With
 * `adrOk(id)`, an owner-decision event and every exit from OWNER_GATE or BLOCKED_MANUAL_REVIEW must cite committed ADRs,
 * and OWNER_GATE may only resume at the state recorded when it was entered, or close at COMPLETE_LOCAL. That catches
 * lines written by hand, past record-event.mjs.
 */
export function validateLedger(text, committedTexts = [], adrOk = () => true) {
  const errors = [];
  const { events, errors: parseErrors } = parseLedger(text);
  errors.push(...parseErrors);
  events.forEach((e, i) => {
    for (const p of validateEvent(e)) errors.push(`LEDGER.jsonl line ${i + 1}: ${p}`);
  });
  for (const committed of committedTexts) {
    if (committed != null && !text.startsWith(committed)) {
      errors.push('LEDGER.jsonl no longer starts with a committed version of itself: a line was rewritten or deleted (append-only, master §13)');
      break;
    }
  }
  const citesAdrs = (e) => Array.isArray(e.decisions) && e.decisions.length > 0 && e.decisions.every((d) => ADR_ID_RE.test(d) && adrOk(d));
  let prev = null;
  let resume = null;
  events.forEach((e, i) => {
    if (e?.kind === 'owner-decision' && !citesAdrs(e)) errors.push(`LEDGER.jsonl line ${i + 1}: an owner-decision event must cite committed ADRs listed in decisions/INDEX.md`);
    if (e?.kind !== 'transition') return;
    if (prev === null && e.fromState !== 'BOOTSTRAP') errors.push(`LEDGER.jsonl line ${i + 1}: the first transition must start at BOOTSTRAP`);
    if (prev !== null && e.fromState !== prev) errors.push(`LEDGER.jsonl line ${i + 1}: transition starts at ${e.fromState} but the previous one ended at ${prev}`);
    if (DECISION_EXITS.includes(e.fromState) && !citesAdrs(e)) errors.push(`LEDGER.jsonl line ${i + 1}: leaving ${e.fromState} must cite committed ADRs listed in decisions/INDEX.md`);
    if (e.fromState === 'OWNER_GATE' && e.toState !== 'COMPLETE_LOCAL' && e.toState !== resume) errors.push(`LEDGER.jsonl line ${i + 1}: OWNER_GATE may only resume at ${resume ?? '(no resume state was recorded)'} or close at COMPLETE_LOCAL`);
    if (e.toState === 'OWNER_GATE') resume = e.resume ?? null;
    prev = e.toState;
  });
  return { errors, warnings: [], events };
}

/** STATE.machineState must be where the last recorded transition left it (no silent state edits). */
export function validateStateAgainstLedger(s, events) {
  const transitions = events.filter((e) => e?.kind === 'transition');
  const last = transitions[transitions.length - 1];
  if (!last) return { errors: [], warnings: s.machineState === 'BOOTSTRAP' ? [] : ['no transition is recorded in LEDGER.jsonl yet'] };
  if (last.toState !== s.machineState) {
    return { errors: [`STATE.machineState is ${s.machineState} but the last recorded transition went to ${last.toState}; record transitions with record-event.mjs`], warnings: [] };
  }
  return { errors: [], warnings: [] };
}

/** Per-defect repair counts from the ledger (current slice). */
export function repairCounts(events, slice) {
  const out = {};
  for (const e of events) {
    if (e?.kind !== 'repair' || e.slice !== slice || !e.defect) continue;
    const d = (out[e.defect] ??= { attempts: 0, distinct: 0, resolved: false });
    if (e.resolved) {
      d.resolved = true;
      continue;
    }
    if (d.resolved) Object.assign(d, { attempts: 0, distinct: 0, resolved: false }); // a new failure after a fix
    d.attempts++;
    if (e.distinct) d.distinct++;
  }
  return out;
}

/** No open defect may pass a repair limit outside BLOCKED_MANUAL_REVIEW unless the owner overrode it in an ADR. */
export function validateRepairs(s, events, adrOk = () => true) {
  const errors = [];
  for (const [defect, c] of Object.entries(repairCounts(events, s.currentSlice))) {
    if (c.resolved) continue;
    const over = c.attempts >= REPAIR_LIMITS.totalAttempts || c.distinct >= REPAIR_LIMITS.distinctStrategies;
    const override = s.repairOverrides?.[defect];
    if (over && s.machineState !== 'BLOCKED_MANUAL_REVIEW' && !(override && adrOk(override))) {
      errors.push(`defect ${defect} reached the repair limit (${c.attempts} attempts, ${c.distinct} distinct strategies): BLOCKED_MANUAL_REVIEW or an owner ADR in STATE.repairOverrides is required (OPERATIONS.md §5)`);
    }
    if (s.repairTarget === defect && (s.repairTotalAttempts ?? 0) < c.attempts) errors.push(`LEDGER.jsonl records ${c.attempts} attempt(s) on ${defect} but STATE.repairTotalAttempts is ${s.repairTotalAttempts ?? 0}`);
    if (s.repairTarget === defect && (s.repairAttempt ?? 0) < c.distinct) errors.push(`LEDGER.jsonl records ${c.distinct} distinct strateg${c.distinct === 1 ? 'y' : 'ies'} on ${defect} but STATE.repairAttempt is ${s.repairAttempt ?? 0}`);
  }
  return { errors, warnings: [] };
}

export function validateRegistry(reg, fileExists, adrOk = () => true) {
  const errors = [];
  if (!Array.isArray(reg?.designs)) return { errors: ['DESIGN_REGISTRY.json has no designs array'], warnings: [] };
  const ids = new Set();
  for (const d of reg.designs) {
    if (ids.has(d.id)) errors.push(`design ${d.id}: duplicate id`);
    ids.add(d.id);
    if (!DESIGN_STATUSES.includes(d.status)) errors.push(`design ${d.id}: unknown status ${d.status}`);
    if (d.status === 'APPROVED') {
      const adr = String(d.approval ?? '').match(/ADR-\d{4}/)?.[0];
      if (!adr || !adrOk(adr)) errors.push(`design ${d.id}: APPROVED without an approval citing a committed ADR`);
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
  const adrOk = (ref) => approvalIsAdr(ref) || !!findAdr(ref);

  // Git reality.
  const head = tryGit('rev-parse', 'HEAD');
  const branch = tryGit('rev-parse', '--abbrev-ref', 'HEAD');
  if (s.integrationBranch && branch !== s.integrationBranch) warnings.push(`current branch ${branch} is not the integration branch ${s.integrationBranch}`);
  if (branch?.startsWith('feat/')) errors.push(`HEAD is on ${branch}: agents never commit on feat/* branches`);
  for (const tag of (tryGit('tag', '--list', 'checkpoint/*') ?? '').split('\n').filter(Boolean)) {
    if (head && !gitOk('merge-base', '--is-ancestor', tag, head)) errors.push(`checkpoint tag ${tag} is not an ancestor of HEAD (accepted history was rewritten or abandoned)`);
  }
  for (const k of ['planningBaselineSha', 'actualBaselineSha', 'lastAcceptedCheckpoint']) {
    if (s[k] && SHA_RE.test(s[k]) && !gitOk('cat-file', '-e', `${s[k]}^{commit}`)) errors.push(`STATE.${k} ${s[k]} is not a commit in this repository`);
  }
  if (s.lastAcceptedCheckpoint) {
    if (head && !gitOk('merge-base', '--is-ancestor', s.lastAcceptedCheckpoint, head)) errors.push('STATE.lastAcceptedCheckpoint is not an ancestor of HEAD (accepted history was rewritten)');
    if (s.actualBaselineSha && (s.lastAcceptedCheckpoint === s.actualBaselineSha || !gitOk('merge-base', '--is-ancestor', s.actualBaselineSha, s.lastAcceptedCheckpoint))) {
      errors.push('STATE.lastAcceptedCheckpoint must be a commit made after the baseline (actualBaselineSha)');
    }
  }
  for (const k of ['remoteApproval', 'multiplayerApproval']) {
    if (s[k] && !approvalIsAdr(s[k])) errors.push(`STATE.${k} (${s[k]}) is not a committed ADR listed in decisions/INDEX.md`);
  }
  for (const [g, ref] of Object.entries(s.gateWaivers ?? {})) if (!approvalIsAdr(ref)) errors.push(`STATE.gateWaivers.${g} (${ref}) is not a committed ADR listed in decisions/INDEX.md`);
  for (const [d, ref] of Object.entries(s.repairOverrides ?? {})) if (!approvalIsAdr(ref)) errors.push(`STATE.repairOverrides.${d} (${ref}) is not a committed ADR listed in decisions/INDEX.md`);
  if (exists(PATHS.stopFile)) warnings.push('docs/agent/STOP exists: the relaunch script will not start sessions');

  // Append-only checks compare with every version committed since this anchor.
  const anchor = s.lastAcceptedCheckpoint ?? s.actualBaselineSha ?? null;
  const ledgerText = exists(PATHS.ledger) ? readText(PATHS.ledger) : '';
  const lastTransition = parseLedger(ledgerText).events.filter((e) => e?.kind === 'transition').pop();
  // next-slice.mjs prepares the next slice while the machine is still at NEXT_SLICE. Until the new session records
  // NEXT_SLICE → BOOTSTRAP, the slice that was accepted is the one that recorded HANDOFF → NEXT_SLICE: its evidence
  // must still hold, and the new slice's fresh gates claim nothing.
  const prepared = s.machineState === 'NEXT_SLICE' && lastTransition?.toState === 'NEXT_SLICE' && SLICES.indexOf(lastTransition.slice) === SLICES.indexOf(s.currentSlice) - 1 && SLICES.indexOf(s.currentSlice) > 0;
  const acceptedSlice = prepared ? lastTransition.slice : s.currentSlice;
  const accepted = ACCEPTED_STATES.includes(s.machineState) && !prepared;
  const postCheckpoint = POST_CHECKPOINT_STATES.includes(s.machineState);

  // The code tree the evidence must belong to.
  let targetTree = null;
  try {
    const working = codeTreeOf(null);
    if (postCheckpoint) {
      if (!s.lastAcceptedCheckpoint) errors.push(`${s.machineState} needs STATE.lastAcceptedCheckpoint (the checkpoint commit)`);
      else {
        targetTree = codeTreeOf(s.lastAcceptedCheckpoint);
        if (working !== targetTree) errors.push('the code changed after the checkpoint commit: bookkeeping commits may only touch docs/agent, AGENTS.md and CLAUDE.md');
      }
    } else targetTree = working;
  } catch (e) {
    (accepted || postCheckpoint ? errors : warnings).push(`could not compute the code tree: ${e.message.split('\n')[0]}`);
  }

  // Evidence: the current slice's gates, and every slice's manifest (files and append-only history).
  const manifestOf = (slice) => `${PATHS.evidence}/${slice}/manifest.json`;
  const loadSliceManifest = (slice) => {
    if (!exists(manifestOf(slice))) return null;
    try {
      return readJson(manifestOf(slice));
    } catch (e) {
      errors.push(`${manifestOf(slice)} is not valid JSON: ${e.message}`);
      return null;
    }
  };
  const manifest = loadSliceManifest(s.currentSlice);
  add(validateGateEvidence(s, manifest, { targetTree, accepted }));
  const acceptedManifest = prepared ? loadSliceManifest(acceptedSlice) : manifest;
  if (prepared) {
    // The accepted slice's objective gates, its code-architecture review and its verdict, on the checkpoint tree.
    const gates = Object.fromEntries(Object.keys(GATE_COMMANDS).map((g) => [g, s.gateWaivers?.[g] ? 'NOT_APPLICABLE' : 'GREEN']));
    const view = { ...s, currentSlice: acceptedSlice, requiredReviewers: ['code-architecture'], gates: { ...gates, independentReview: 'GREEN', browserQa: 'NOT_APPLICABLE' } };
    add(validateGateEvidence(view, acceptedManifest, { targetTree, accepted: true }));
  }
  if (postCheckpoint && acceptedManifest && acceptedManifest.checkpointSha !== s.lastAcceptedCheckpoint) {
    errors.push(`the ${acceptedSlice} manifest's checkpointSha (${acceptedManifest.checkpointSha}) is not STATE.lastAcceptedCheckpoint`);
  }
  for (const slice of SLICES) {
    const rel = manifestOf(slice);
    const versions = committedVersions(rel, anchor);
    if (!exists(rel)) {
      if (versions.length) errors.push(`${rel} was committed and has been deleted (evidence is append-only)`);
      continue;
    }
    let m;
    try {
      m = readJson(rel);
    } catch (e) {
      if (slice !== s.currentSlice && slice !== acceptedSlice) errors.push(`${rel} is not valid JSON: ${e.message}`);
      continue;
    }
    add(validateEvidenceFiles(m, { exists, hash: (p) => sha256File(abs(p)), ignored: (p) => gitOk('check-ignore', '-q', p), read: readText }));
    const appendOnly = new Set();
    for (const text of versions) {
      try {
        for (const e of validateManifestAppendOnly(m, JSON.parse(text), `${slice} (vs a committed version)`).errors) appendOnly.add(e);
      } catch {
        /* a committed version that wasn't valid JSON holds no records */
      }
    }
    errors.push(...appendOnly);
  }

  // Requirements: schema, append-only ids against every committed version since the anchor, the slice contract, and
  // in accepted states the full audit.
  try {
    const reqs = readJson(PATHS.requirements);
    const committed = [];
    for (const t of committedVersions(PATHS.requirements, anchor)) {
      try {
        committed.push(JSON.parse(t));
      } catch {
        /* not valid JSON when committed: names no ids */
      }
    }
    const sliceText = exists(PATHS.currentSlice) ? readText(PATHS.currentSlice) : '';
    const adrIsCommitted = (id) => !!findAdr(id);
    add(accepted ? auditRequirements(reqs, s, { committed, sliceText, fileExists: exists, adrOk: adrIsCommitted }) : validateRequirements(reqs, committed, exists, adrIsCommitted));
    const known = new Set(reqs.requirements.map((r) => r.id));
    if (sliceText) {
      if (!sliceText.split('\n').slice(0, 6).join('\n').includes(s.currentSlice)) errors.push(`CURRENT_SLICE.md does not name the current slice ${s.currentSlice} in its header`);
      for (const id of new Set(sliceText.match(REQ_TOKEN_RE) ?? [])) if (!known.has(id)) errors.push(`CURRENT_SLICE.md references unknown requirement ${id}`);
    }
  } catch (e) {
    errors.push(`cannot check REQUIREMENTS.json: ${e.message}`);
  }

  // Ledger: append-only against every committed version since the anchor, one transition chain, committed ADRs on
  // owner-gate exits, agreement with STATE, repairs.
  try {
    const ledger = validateLedger(ledgerText, committedVersions(PATHS.ledger, anchor), (id) => !!findAdr(id));
    add(ledger);
    add(validateStateAgainstLedger(s, ledger.events));
    add(validateRepairs(s, ledger.events, adrOk));
  } catch (e) {
    errors.push(`cannot check LEDGER.jsonl: ${e.message}`);
  }

  // Design registry and protected files.
  try {
    add(validateRegistry(readJson(PATHS.designRegistry), exists, adrOk));
  } catch (e) {
    errors.push(`cannot check the design registry: ${e.message}`);
  }
  try {
    add(verifyProtected());
  } catch (e) {
    errors.push(`cannot verify protected files: ${e.message}`);
  }

  if (STOP_STATES.includes(s.machineState)) warnings.push(`machineState is ${s.machineState}: no session may continue without the owner`);
  return { errors, warnings, state: { slice: s.currentSlice, task: s.currentTask, machineState: s.machineState, branch, head } };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let args;
  try {
    args = parseArgs(process.argv.slice(2), ['json', 'strict'], []);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
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
