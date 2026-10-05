#!/usr/bin/env node
/**
 * Append one event to docs/agent/LEDGER.jsonl (master §13: append-only, one JSON object per line).
 *
 *   node scripts/agent/record-event.mjs --kind transition --actor orchestrator --slice S1 --task S1-T3 \
 *     --from IMPLEMENT --to TARGETED_VERIFY --result "route parser done" \
 *     [--evidence docs/agent/evidence/S1/manifest.json ...] [--decision ADR-0007 ...] [--note "..."]
 *
 *   node scripts/agent/record-event.mjs --kind transition ... --to OWNER_GATE --reason DESIGN_PENDING:DESIGN-S3D \
 *     --resume IMPLEMENT --result "waiting for the S3-D design"
 *
 *   node scripts/agent/record-event.mjs --kind repair --actor orchestrator --slice S1 --task S1-T3 \
 *     --defect D-S1-2 --strategy "re-anchor the debt before the move" [--distinct] --result "still failing" --evidence <log>
 *   node scripts/agent/record-event.mjs --kind repair ... --defect D-S1-2 --resolved --result "gate GREEN" --evidence <log>
 *
 * A transition must start at STATE.machineState, name STATE.currentSlice and be in docs/agent/OPERATIONS.md §4; it
 * then updates STATE.json (machine state, and the owner-gate fields on entering or leaving OWNER_GATE). Leaving
 * OWNER_GATE or BLOCKED_MANUAL_REVIEW, and owner-decision events, need --decision ADR-NNNN naming a committed ADR
 * listed in decisions/INDEX.md. Leaving NEXT_SLICE (into the next slice or the readiness gate) must happen in a
 * different Claude Code session from the one that recorded HANDOFF → NEXT_SLICE. `--distinct` on a repair records a
 * reviewer's judgement that the strategy is materially different (OPERATIONS.md §5). Exits 1, writing nothing, when
 * the event is invalid.
 */
import { pathToFileURL } from 'node:url';
import { EVENT_KINDS, PATHS, appendEvent, checkTransition, currentSession, exists, findAdr, nowIso, parseArgs, parseLedger, readJson, readText, writeJson } from './lib.mjs';

const ALLOWED = ['kind', 'actor', 'slice', 'task', 'from', 'to', 'result', 'evidence', 'decision', 'note', 'defect', 'strategy', 'reason', 'resume'];
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
  return s;
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
    console.log('       [--from <STATE> --to <STATE> [--reason <why> --resume <STATE>]] [--defect <id> --strategy <text> [--distinct|--resolved]]');
    console.log('       [--evidence <path> ...] [--decision ADR-NNNN ...] [--note <text>]');
    console.log(`Kinds: ${EVENT_KINDS.join(', ')}`);
    process.exit(0);
  }
  const event = buildEvent(args);
  const state = readJson(PATHS.state);
  const problems = [];
  if (event.kind === 'transition' || event.kind === 'repair') {
    if (event.slice !== state.currentSlice) problems.push(`${event.kind} events name the current slice ${state.currentSlice}`);
  }
  if (event.kind === 'transition') {
    const { events } = parseLedger(exists(PATHS.ledger) ? readText(PATHS.ledger) : '');
    const closing = [...events].reverse().find((e) => e?.kind === 'transition' && e.toState === 'NEXT_SLICE');
    problems.push(...checkTransition({ from: event.fromState, to: event.toState, slice: event.slice, decisions: event.decisions, reason: event.reason, resume: event.resume }, { state, adrExists: (id) => !!findAdr(id), s4Accepted: s4Accepted(), session: currentSession(), closingSession: closing?.session ?? null }));
  }
  if (event.kind === 'owner-decision') {
    if (!event.decisions.length) problems.push('an owner-decision event cites the ADR that records the owner\'s words (--decision ADR-NNNN)');
    for (const d of event.decisions) if (!findAdr(d)) problems.push(`decision ${d} is not a committed ADR listed in decisions/INDEX.md`);
  }
  if (problems.length) {
    console.error(`refused: ${[...new Set(problems)].join('; ')}`);
    process.exit(1);
  }
  try {
    const written = appendEvent(event);
    if (event.kind === 'transition') writeJson(PATHS.state, stateAfter(state, event));
    console.log(JSON.stringify(written));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
