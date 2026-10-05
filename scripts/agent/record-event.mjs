#!/usr/bin/env node
/**
 * Append one event to docs/agent/LEDGER.jsonl (master §13: append-only, one JSON object per line).
 *
 *   node scripts/agent/record-event.mjs --kind transition --actor orchestrator --slice S1 --task S1-T3 \
 *     --from IMPLEMENT --to TARGETED_VERIFY --result "route parser done" \
 *     [--evidence docs/agent/evidence/S1/manifest.json ...] [--decision ADR-0003 ...] [--note "..."]
 *
 *   node scripts/agent/record-event.mjs --kind repair --actor orchestrator --slice S1 --task S1-T3 \
 *     --defect D-S1-2 --result "attempt 2 (new strategy: ...): still failing" --evidence <log>
 *
 * Kinds: transition, repair, evidence, review, decision, owner-decision, session-start, session-end, note.
 * A transition must be in the table in docs/agent/OPERATIONS.md §4; leaving OWNER_GATE or BLOCKED_MANUAL_REVIEW
 * needs --decision. Prints the appended event. Exits 1 (and appends nothing) when the event is invalid.
 */
import { appendEvent, EVENT_KINDS, parseArgs } from './lib.mjs';

const args = parseArgs(process.argv.slice(2), ['help']);
if (args.help) {
  console.log('Usage: node scripts/agent/record-event.mjs --kind <kind> --actor <who> --slice <S0-S4|ALL> --task <id> --result <text>');
  console.log('       [--from <STATE> --to <STATE>] [--defect <id>] [--evidence <path> ...] [--decision <ref> ...] [--note <text>]');
  console.log(`Kinds: ${EVENT_KINDS.join(', ')}`);
  process.exit(0);
}

const list = (v) => (v == null ? [] : [].concat(v).map(String));
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

try {
  console.log(JSON.stringify(appendEvent(event)));
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
