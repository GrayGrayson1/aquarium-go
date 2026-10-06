#!/usr/bin/env node
/**
 * Append one event to docs/agent/LEDGER.jsonl (master §13: append-only, one JSON object per line).
 *
 *   node scripts/agent/record-event.mjs --kind transition --actor orchestrator --slice S1 --task S1-T3 \
 *     --from IMPLEMENT --to TARGETED_VERIFY --result "route parser done" \
 *     [--evidence docs/agent/evidence/S1/manifest.json ...] [--decision ADR-0007 ...] [--note "..."]
 *
 *   node scripts/agent/record-event.mjs --kind transition ... --from IMPLEMENT --to OWNER_GATE \
 *     --reason DESIGN_PENDING:DESIGN-S3D --resume IMPLEMENT --result "waiting for the S3-D design"
 *
 *   node scripts/agent/record-event.mjs --kind transition ... --from ACCEPT --to CHECKPOINT [--checkpoint <sha>] --result "..."
 *
 *   node scripts/agent/record-event.mjs --kind repair --actor orchestrator --slice S1 --task S1-T3 \
 *     --defect D-S1-2 --strategy "re-anchor the debt before the move" [--distinct] --result "still failing" --evidence <log>
 *   node scripts/agent/record-event.mjs --kind repair ... --defect D-S1-2 --resolved --result "gate GREEN" --evidence <log>
 *
 * A transition must start at STATE.machineState, name STATE.currentSlice and the slice of the last recorded transition
 * (the slice changes only at NEXT_SLICE → BOOTSTRAP, to the next one) and be in docs/agent/OPERATIONS.md §4; it then
 * updates STATE.json (machine state, and the owner-gate fields on entering or leaving OWNER_GATE). OWNER_GATE is entered
 * with --reason and --resume set to the state it is entered from. Leaving OWNER_GATE or BLOCKED_MANUAL_REVIEW, and
 * owner-decision events, need --decision citing the owner's approval (lib.mjs ownerApprovalProblems: a committed,
 * indexed, Accepted ADR with an "## Owner approval" section); a stop-state exit's ADR must also be newer than the
 * transition into that state. Leaving NEXT_SLICE (into the next slice or the readiness gate) must happen in a different
 * Claude Code session from the one that recorded HANDOFF → NEXT_SLICE.
 *
 * ACCEPT → CHECKPOINT records the checkpoint commit: --checkpoint, or else STATE.lastAcceptedCheckpoint or HEAD,
 * whichever the commit backs (the ledger committed there ends at → ACCEPT for this slice, its manifest there is GREEN,
 * any checkpoint/<slice>-* tag points at it, and the working code is its code). It sets STATE.lastAcceptedCheckpoint and
 * the slice manifest's checkpointSha to it.
 *
 * Repairs: `--distinct` records a reviewer's judgement that the strategy is materially different (OPERATIONS.md §5).
 * STATE.repairTarget names the defect being repaired (the first one recorded while none is), and its repairAttempt and
 * repairTotalAttempts follow the ledger's counts for it. `--resolved` needs an existing --evidence file under
 * docs/agent/evidence/ (the passing run) and resets the counters of the defect it resolves. Exits 1, writing nothing,
 * when the event is invalid.
 */
import { pathToFileURL } from 'node:url';
import { EVENT_KINDS, PATHS, appendEvent, checkTransition, currentSession, exists, git, nowIso, ownerApprovalProblems, parseArgs, parseLedger, readJson, readText, showAt, writeJson } from './lib.mjs';
import { checkpointBackingProblems, checkpointTagCommits, manifestOf, repairCounts } from './check-state.mjs';
import { codeTreeOf, loadManifest, saveManifest } from './evidence.mjs';

const ALLOWED = ['kind', 'actor', 'slice', 'task', 'from', 'to', 'result', 'evidence', 'decision', 'note', 'defect', 'strategy', 'reason', 'resume', 'checkpoint'];
const BOOLEANS = ['help', 'distinct', 'resolved'];

const list = (v) => (v == null ? [] : [].concat(v).map(String));

/** Whether S4 has been accepted (its manifest verdict is GREEN). */
export function s4Accepted() {
  const p = `${PATHS.evidence}/S4/manifest.json`;
  return exists(p) && readJson(p).verdict === 'GREEN';
}

export function buildEvent(args) {
  const event = {
    kind: args.kind,
    actor: args.actor,
    slice: args.slice,
    task: args.task,
    fromState: args.from ?? null,
    toState: args.to ?? null,
    result: args.result,
    evidence: list(args.evidence),
    decisions: list(args.decision),
  };
  if (args.note != null) event.note = String(args.note);
  if (args.defect != null) event.defect = String(args.defect);
  if (args.strategy != null) event.strategy = String(args.strategy);
  if (args.distinct) event.distinct = true;
  if (args.resolved) event.resolved = true;
  if (args.reason != null) event.reason = String(args.reason);
  if (args.resume != null) event.resume = String(args.resume);
  if (args.checkpoint != null) event.checkpoint = String(args.checkpoint);
  return event;
}

/** STATE.json after a recorded transition. */
export function stateAfter(state, event) {
  const s = { ...state, machineState: event.toState, updatedAt: nowIso() };
  if (event.toState === 'OWNER_GATE') {
    s.ownerGateRequired = true;
    s.ownerGateReason = event.reason;
    s.resumeState = event.resume;
  } else if (event.fromState === 'OWNER_GATE') {
    s.ownerGateRequired = false;
    s.ownerGateReason = null;
    s.resumeState = null;
  }
  if (event.fromState === 'ACCEPT' && event.toState === 'CHECKPOINT') s.lastAcceptedCheckpoint = event.checkpoint;
  return s;
}

/**
 * STATE.json after a recorded repair event (pure; `events` is the ledger including it). The first defect repaired while
 * no target is set becomes STATE.repairTarget; the target's counters never fall below the ledger's counts for it
 * (code-architecture-harness-2 m7); resolving the target clears it and resets its counters.
 */
export function stateAfterRepair(state, events, event) {
  const s = { ...state };
  if (event.resolved) {
    if (s.repairTarget === event.defect) Object.assign(s, { repairTarget: null, repairAttempt: 0, repairTotalAttempts: 0, updatedAt: nowIso() });
    return s;
  }
  if (!s.repairTarget) s.repairTarget = event.defect;
  if (s.repairTarget === event.defect) {
    const c = repairCounts(events, s.currentSlice)[event.defect] ?? { attempts: 0, distinct: 0 };
    s.repairAttempt = Math.max(s.repairAttempt ?? 0, c.distinct);
    s.repairTotalAttempts = Math.max(s.repairTotalAttempts ?? 0, c.attempts);
    s.updatedAt = nowIso();
  }
  return s;
}

/**
 * A --resolved repair must cite the evidence that the defect's gate went GREEN (pure): at least one --evidence path
 * that exists under docs/agent/evidence/ (ADR-0011 open point 5).
 */
export function resolvedEvidenceProblems(event, fileExists) {
  if (!event.resolved) return [];
  const ok = (event.evidence ?? []).map((e) => String(e).split(' ')[0]).some((p) => p.startsWith(`${PATHS.evidence}/`) && !p.split('/').includes('..') && fileExists(p));
  return ok ? [] : [`--resolved needs --evidence naming the passing run that resolves ${event.defect}: an existing file under ${PATHS.evidence}/ (OPERATIONS.md §5: a defect's counters reset only when its gate goes GREEN)`];
}

function commitOf(ref) {
  try {
    return git('rev-parse', '--verify', '--quiet', `${ref}^{commit}`);
  } catch {
    return null;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let args;
  try {
    args = parseArgs(process.argv.slice(2), BOOLEANS, ALLOWED);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  if (args.help) {
    console.log('Usage: node scripts/agent/record-event.mjs --kind <kind> --actor <who> --slice <S0-S4|ALL> --task <id> --result <text>');
    console.log('       [--from <STATE> --to <STATE> [--reason <why> --resume <STATE>] [--checkpoint <sha>]] [--defect <id> --strategy <text> [--distinct|--resolved]]');
    console.log('       [--evidence <path> ...] [--decision ADR-NNNN ...] [--note <text>]');
    console.log(`Kinds: ${EVENT_KINDS.join(', ')}`);
    process.exit(0);
  }
  const event = buildEvent(args);
  const state = readJson(PATHS.state);
  const { events } = parseLedger(exists(PATHS.ledger) ? readText(PATHS.ledger) : '');
  const problems = [];
  if (event.kind === 'transition' || event.kind === 'repair') {
    if (event.slice !== state.currentSlice) problems.push(`${event.kind} events name the current slice ${state.currentSlice}`);
  }
  if (event.kind === 'transition') {
    const transitions = events.filter((e) => e?.kind === 'transition');
    const closing = [...transitions].reverse().find((e) => e.toState === 'NEXT_SLICE');
    problems.push(
      ...checkTransition(
        { from: event.fromState, to: event.toState, slice: event.slice, decisions: event.decisions, reason: event.reason, resume: event.resume },
        { state, ownerApproval: (id, opts) => ownerApprovalProblems(id, opts), s4Accepted: s4Accepted(), session: currentSession(), closingSession: closing?.session ?? null, lastTransition: transitions.length ? transitions[transitions.length - 1] : null },
      ),
    );
    const isCheckpoint = event.fromState === 'ACCEPT' && event.toState === 'CHECKPOINT';
    if (!isCheckpoint && event.checkpoint != null) problems.push('--checkpoint belongs only to ACCEPT → CHECKPOINT');
    if (isCheckpoint) {
      const io = { ledgerAt: (sha) => showAt(sha, PATHS.ledger), manifestAt: (sha, slice) => showAt(sha, manifestOf(slice)), tagCommits: checkpointTagCommits };
      const candidates = event.checkpoint != null ? [event.checkpoint] : [state.lastAcceptedCheckpoint, 'HEAD'].filter(Boolean);
      const why = [];
      let chosen = null;
      for (const c of candidates) {
        const sha = commitOf(c);
        const p = sha ? checkpointBackingProblems(sha, event.slice, io) : [`${c} is not a commit`];
        if (!p.length) {
          chosen = sha;
          break;
        }
        why.push(...p);
      }
      if (!chosen) problems.push(`ACCEPT → CHECKPOINT records the checkpoint commit (--checkpoint <sha>; by default STATE.lastAcceptedCheckpoint or HEAD), and none is backed: ${why.join('; ')}`);
      else {
        if (codeTreeOf(null) !== codeTreeOf(chosen)) problems.push(`the working code differs from the checkpoint ${chosen.slice(0, 10)}: commit the code in the checkpoint commit, and touch only docs/agent, AGENTS.md and CLAUDE.md after it`);
        const recorded = loadManifest(event.slice).checkpointSha;
        if (recorded && recorded !== chosen) problems.push(`the ${event.slice} manifest already records checkpoint ${recorded}`);
        event.checkpoint = chosen;
      }
    }
  }
  if (event.kind === 'owner-decision') {
    if (!event.decisions.length) problems.push('an owner-decision event cites the ADR that records the owner\'s words (--decision ADR-NNNN)');
    for (const d of event.decisions) for (const p of ownerApprovalProblems(d)) problems.push(`decision ${p}`);
  }
  if (event.kind !== 'transition' && event.checkpoint != null) problems.push('--checkpoint belongs only to ACCEPT → CHECKPOINT');
  if (event.kind === 'repair') problems.push(...resolvedEvidenceProblems(event, exists));
  if (problems.length) {
    console.error(`refused: ${[...new Set(problems)].join('; ')}`);
    process.exit(1);
  }
  try {
    const written = appendEvent(event);
    if (event.kind === 'transition') {
      writeJson(PATHS.state, stateAfter(state, written));
      if (written.fromState === 'ACCEPT' && written.toState === 'CHECKPOINT') {
        const manifest = loadManifest(written.slice);
        manifest.checkpointSha = written.checkpoint;
        saveManifest(manifest);
      }
    }
    if (event.kind === 'repair' && written.slice === state.currentSlice) {
      const after = stateAfterRepair(state, [...events, written], written);
      if (JSON.stringify(after) !== JSON.stringify(state)) writeJson(PATHS.state, after);
    }
    console.log(JSON.stringify(written));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
