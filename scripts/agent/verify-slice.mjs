#!/usr/bin/env node
/**
 * Run the current slice's objective gates and record the evidence (master §41 verify-slice).
 *
 *   node scripts/agent/verify-slice.mjs                      # every gate in STATE.gates that has a command
 *   node scripts/agent/verify-slice.mjs --gates unit,typecheck
 *   node scripts/agent/verify-slice.mjs --no-state           # record evidence but leave STATE.json alone
 *
 * Each run is logged and hashed into docs/agent/evidence/<slice>/manifest.json (see evidence.mjs), and its gate in
 * STATE.json becomes GREEN (exit 0) or RED. Gates that are NOT_APPLICABLE or NOT_YET_REQUIRED are skipped unless named.
 * This script can never mark independentReview or browserQa: those need a reviewer's recorded verdict.
 * The e2e gate always starts its own server: E2E_REUSE is removed from its environment (OPERATIONS.md §8).
 */
import { pathToFileURL } from 'node:url';
import { GATE_COMMANDS, PATHS, nowIso, parseArgs, readJson, writeJson } from './lib.mjs';
import { runAndRecord } from './evidence.mjs';

export function selectGates(state, requested) {
  const all = Object.keys(state.gates ?? {}).filter((g) => g in GATE_COMMANDS);
  if (requested?.length) {
    const unknown = requested.filter((g) => !(g in GATE_COMMANDS));
    if (unknown.length) throw new Error(`no command for gate(s): ${unknown.join(', ')} (known: ${Object.keys(GATE_COMMANDS).join(', ')})`);
    return requested;
  }
  return all.filter((g) => !['NOT_APPLICABLE', 'NOT_YET_REQUIRED'].includes(state.gates[g]));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let args;
  try {
    args = parseArgs(process.argv.slice(2), ['noState', 'help'], ['gates', 'req']);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  if (args.help) {
    console.log('Usage: node scripts/agent/verify-slice.mjs [--gates g1,g2] [--req ID ...] [--no-state]');
    console.log(`Gates with commands: ${Object.entries(GATE_COMMANDS).map(([g, c]) => `${g} (${c})`).join(', ')}`);
    process.exit(0);
  }
  const state = readJson(PATHS.state);
  const requested = typeof args.gates === 'string' ? args.gates.split(',').map((g) => g.trim()).filter(Boolean) : null;
  const gates = selectGates(state, requested);
  const requirements = args.req == null ? [] : [].concat(args.req).map(String);
  let failed = 0;
  for (const gate of gates) {
    process.stdout.write(`${gate}: ${GATE_COMMANDS[gate]} … `);
    const env = gate === 'e2e' ? { E2E_REUSE: '' } : {};
    const rec = await runAndRecord({ slice: state.currentSlice, gate, command: GATE_COMMANDS[gate], requirements, env });
    console.log(`exit ${rec.exitCode} in ${rec.seconds}s ${JSON.stringify(rec.counts)} → ${rec.log}`);
    if (rec.exitCode !== 0) failed++;
    if (!args.noState) {
      const s = readJson(PATHS.state); // re-read: another tool may have written it meanwhile
      s.gates[gate] = rec.exitCode === 0 ? 'GREEN' : 'RED';
      s.updatedAt = nowIso();
      writeJson(PATHS.state, s);
    }
  }
  console.log(failed ? `${failed} gate(s) failed` : 'all selected gates passed');
  process.exit(failed ? 1 : 0);
}
