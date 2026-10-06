#!/usr/bin/env node
/**
 * Prepare the next mega-slice at the end of an accepted one (docs/agent/OPERATIONS.md §6 "Starting the next slice").
 * Run by the closing session after it records HANDOFF → NEXT_SLICE, before its last commit:
 *
 *   node scripts/agent/next-slice.mjs --reviewers code-architecture,adversarial,browser-qa,security-data [--no-browser]
 *
 * It archives the finished slice contract as evidence/<slice>/slice-contract.md, then sets STATE.currentSlice to the
 * next slice with every gate PENDING (browserQa NOT_APPLICABLE with --no-browser), the given reviewers, fresh repair
 * counters, no gate waivers of its own (only the finished slice's stay, for check-state's view of it) and
 * contextRolloverRequired, creates the next slice's empty manifest and a CURRENT_SLICE.md draft from the template. The
 * new session then records NEXT_SLICE → BOOTSTRAP for the new slice. S4 is last: after S4 the next session goes
 * NEXT_SLICE → MULTIPLAYER_READINESS_GATE instead.
 */
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { GATE_COMMANDS, PATHS, SLICES, abs, exists, nowIso, parseArgs, readJson, readText, writeJson } from './lib.mjs';
import { emptyManifest, saveManifest } from './evidence.mjs';

export const MANDATORY_REVIEWERS = ['code-architecture', 'adversarial'];

/** The STATE.json for the next slice (pure). */
export function nextState(state, { reviewers, browser = true }) {
  const idx = SLICES.indexOf(state.currentSlice);
  if (idx < 0 || idx === SLICES.length - 1) throw new Error(`${state.currentSlice} is the last slice: the next step is MULTIPLAYER_READINESS_GATE`);
  if (state.machineState !== 'NEXT_SLICE') throw new Error(`record HANDOFF → NEXT_SLICE first (machine state is ${state.machineState})`);
  const missing = MANDATORY_REVIEWERS.filter((r) => !reviewers.includes(r));
  if (missing.length) throw new Error(`every slice needs the ${missing.join(' and ')} reviewer(s)`);
  const next = SLICES[idx + 1];
  const gates = Object.fromEntries(Object.keys(GATE_COMMANDS).map((g) => [g, 'PENDING']));
  const finished = state.gateWaivers?.[state.currentSlice];
  return {
    ...state,
    currentSlice: next,
    currentTask: `${next}-BOOTSTRAP`,
    repairAttempt: 0,
    repairTotalAttempts: 0,
    repairTarget: null,
    repairOverrides: {},
    gateWaivers: finished ? { [state.currentSlice]: finished } : {},
    contextRolloverRequired: true,
    requiredReviewers: reviewers,
    gates: { ...gates, browserQa: browser ? 'PENDING' : 'NOT_APPLICABLE', independentReview: 'PENDING' },
    updatedAt: nowIso(),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    const args = parseArgs(process.argv.slice(2), ['noBrowser'], ['reviewers']);
    if (typeof args.reviewers !== 'string') throw new Error('--reviewers a,b,c is required');
    const state = readJson(PATHS.state);
    const s = nextState(state, { reviewers: args.reviewers.split(',').map((r) => r.trim()).filter(Boolean), browser: !args.noBrowser });
    const archive = `${PATHS.evidence}/${state.currentSlice}/slice-contract.md`;
    mkdirSync(abs(`${PATHS.evidence}/${state.currentSlice}`), { recursive: true });
    if (exists(PATHS.currentSlice)) copyFileSync(abs(PATHS.currentSlice), abs(archive));
    if (!exists(`${PATHS.evidence}/${s.currentSlice}/manifest.json`)) saveManifest(emptyManifest(s.currentSlice));
    const template = readText('docs/agent/templates/CURRENT_SLICE_TEMPLATE.md').replace(/S#/g, s.currentSlice);
    writeFileSync(abs(PATHS.currentSlice), `${template}\n<!-- Draft written by next-slice.mjs; the next session completes it at PLAN_LOCK. -->\n`);
    writeJson(PATHS.state, s);
    console.log(`prepared ${s.currentSlice}: contract archived to ${archive}, gates reset, reviewers ${s.requiredReviewers.join(', ')}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
