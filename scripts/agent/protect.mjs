#!/usr/bin/env node
/**
 * Protected harness files (docs/agent/OPERATIONS.md §10): the constitution, operating rules, prompts, templates,
 * ADRs, design contracts and these scripts. Their SHA-256 hashes live in docs/agent/PROTECTED.json, so an agent
 * can't quietly rewrite the rules that judge it.
 *
 *   node scripts/agent/protect.mjs                                   # verify; exit 1 if a protected file changed
 *   node scripts/agent/protect.mjs --update --adr docs/agent/decisions/ADR-000N-....md
 *
 * --update records the current hashes and the ADR that approved the change, and appends a ledger event. Use it
 * only after that ADR exists: owner-approved for the master, AGENTS.md, CLAUDE.md, README_FIRST.md, OPERATIONS.md,
 * owner ADRs and prompts; independently reviewed for templates and scripts.
 */
import { readdirSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { abs, appendEvent, exists, nowIso, parseArgs, readJson, sha256File, writeJson } from './lib.mjs';

export const PROTECTED_PATH = 'docs/agent/PROTECTED.json';

export const PROTECTED_PATTERNS = [
  'AGENTS.md',
  'CLAUDE.md',
  'docs/agent/README_FIRST.md',
  'docs/agent/AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md',
  'docs/agent/OPERATIONS.md',
  'docs/agent/decisions/',
  'docs/agent/prompts/',
  'docs/agent/templates/',
  'docs/agent/design/',
  'scripts/agent/',
];

/** Files currently matching the protected patterns (directories are walked recursively). */
export function protectedFiles(patterns = PROTECTED_PATTERNS) {
  const out = [];
  const walk = (rel) => {
    if (!exists(rel)) return;
    if (statSync(abs(rel)).isDirectory()) {
      for (const name of readdirSync(abs(rel))) walk(`${rel.replace(/\/$/, '')}/${name}`);
    } else out.push(rel);
  };
  for (const p of patterns) walk(p);
  return [...new Set(out)].sort();
}

/** Pure comparison: recorded hashes vs current files. */
export function compareProtected(recorded, current) {
  const errors = [];
  const warnings = [];
  for (const [file, sha] of Object.entries(recorded)) {
    if (!(file in current)) errors.push(`protected file ${file} was deleted`);
    else if (current[file] !== sha) errors.push(`protected file ${file} changed without a recorded approval (protect.mjs --update --adr <ADR>)`);
  }
  for (const file of Object.keys(current)) {
    if (!(file in recorded)) warnings.push(`new protected file ${file} is not recorded yet (protect.mjs --update --adr <ADR>)`);
  }
  return { errors, warnings };
}

export function currentHashes() {
  const out = {};
  for (const f of protectedFiles()) out[f] = sha256File(abs(f));
  return out;
}

export function verifyProtected() {
  if (!exists(PROTECTED_PATH)) return { errors: [`${PROTECTED_PATH} is missing`], warnings: [] };
  const rec = readJson(PROTECTED_PATH);
  const r = compareProtected(rec.files ?? {}, currentHashes());
  if (!rec.approvedBy || !exists(rec.approvedBy)) r.errors.push(`${PROTECTED_PATH} approvedBy (${rec.approvedBy}) is not an existing ADR`);
  return r;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = parseArgs(process.argv.slice(2), ['update']);
  if (args.update) {
    const adr = String(args.adr ?? '');
    if (!/^docs\/agent\/decisions\/ADR-\d{4}-[^/]+\.md$/.test(adr) || !exists(adr)) {
      console.error('--update needs --adr docs/agent/decisions/ADR-NNNN-<title>.md (an existing ADR that approves the change)');
      process.exit(1);
    }
    const files = currentHashes();
    const before = exists(PROTECTED_PATH) ? readJson(PROTECTED_PATH).files ?? {} : {};
    const changed = Object.keys({ ...before, ...files }).filter((f) => before[f] !== files[f]);
    writeJson(PROTECTED_PATH, {
      schemaVersion: 1,
      rule: 'Only change these files through an ADR (owner-approved for the constitution, prompts and owner decisions; independently reviewed for templates and scripts), then run protect.mjs --update --adr <ADR>.',
      approvedBy: adr,
      updatedAt: nowIso(),
      patterns: PROTECTED_PATTERNS,
      files,
    });
    const state = readJson('docs/agent/STATE.json');
    appendEvent({ kind: 'decision', actor: 'protect.mjs', slice: state.currentSlice, task: state.currentTask, result: `protected hashes updated for ${changed.length} file(s)`, decisions: [adr], evidence: [PROTECTED_PATH] });
    console.log(`recorded ${Object.keys(files).length} protected files (${changed.length} changed) under ${adr}`);
    process.exit(0);
  }
  const r = verifyProtected();
  for (const e of r.errors) console.log(`ERROR   ${e}`);
  for (const w of r.warnings) console.log(`WARNING ${w}`);
  console.log(r.errors.length ? `FAILED with ${r.errors.length} error(s)` : 'OK');
  process.exit(r.errors.length ? 1 : 0);
}

