#!/usr/bin/env node
/**
 * Protected harness files (docs/agent/OPERATIONS.md §10): the constitution, operating rules, prompts, templates, ADRs,
 * design contracts, these scripts and the files that define the gates or the deploys. Their SHA-256 hashes live in
 * docs/agent/PROTECTED.json, so an agent can't quietly rewrite the rules that judge it.
 *
 *   node scripts/agent/protect.mjs                              # verify; exit 1 if a protected file changed
 *   node scripts/agent/protect.mjs --update --adr ADR-0006      # record the current hashes under that ADR
 *
 * --update needs a committed ADR listed in decisions/INDEX.md. When an owner-only file changed (OWNER_ONLY), that ADR
 * must contain an "## Owner approval" section quoting the owner. Accepted ADRs are never edited: a changed ADR file
 * fails verification. Every update appends a ledger event carrying the new PROTECTED.json hash, and verification
 * checks PROTECTED.json against the latest such event, so editing it by hand is caught.
 */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PATHS, abs, appendEvent, exists, findAdr, git, nowIso, parseArgs, parseLedger, readJson, readText, sha256File, sha256Text } from './lib.mjs';

export const PROTECTED_PATH = PATHS.protected;

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
  'package.json',
  'tsconfig.json',
  'vitest.config.ts',
  'playwright.config.ts',
  '.github/',
  'render.yaml',
];

/** Changing these needs the owner's approval recorded in the approving ADR. */
export const OWNER_ONLY = [
  'AGENTS.md',
  'CLAUDE.md',
  'docs/agent/README_FIRST.md',
  'docs/agent/AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md',
  'docs/agent/OPERATIONS.md',
  'docs/agent/prompts/',
  'package.json',
  '.github/',
  'render.yaml',
];

const matches = (file, patterns) => patterns.some((p) => (p.endsWith('/') ? file.startsWith(p) : file === p));

/** Files Git can see (tracked, or untracked and not ignored) that match the protected patterns. */
export function protectedFiles() {
  const out = git('ls-files', '-co', '--exclude-standard').split('\n').filter(Boolean);
  return [...new Set(out.filter((f) => matches(f, PROTECTED_PATTERNS) && exists(f)))].sort();
}

export function currentHashes() {
  const out = {};
  for (const f of protectedFiles()) out[f] = sha256File(abs(f));
  return out;
}

/** Pure comparison: recorded hashes vs current files. Every difference is an error. */
export function compareProtected(recorded, current) {
  const errors = [];
  for (const [file, sha] of Object.entries(recorded)) {
    if (!(file in current)) errors.push(`protected file ${file} was deleted`);
    else if (current[file] !== sha) {
      errors.push(file.startsWith('docs/agent/decisions/ADR-') ? `accepted ADR ${file} was edited (write a superseding ADR instead)` : `protected file ${file} changed without a recorded approval (protect.mjs --update --adr <ADR>)`);
    }
  }
  for (const file of Object.keys(current)) {
    if (!(file in recorded)) errors.push(`protected file ${file} is not recorded (protect.mjs --update --adr <ADR>)`);
  }
  return { errors, warnings: [] };
}

/** True when the ADR text has an "## Owner approval" section with real content. */
export function hasOwnerApproval(adrText) {
  const lines = String(adrText).split('\n');
  const start = lines.findIndex((l) => /^## Owner approval\s*$/.test(l));
  if (start < 0) return false;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^## /.test(l));
  const body = (end < 0 ? rest : rest.slice(0, end)).join('').replace(/\s+/g, '');
  return body.length >= 40;
}

/** The PROTECTED.json hash recorded by the latest protect.mjs ledger event, or null. */
export function lastRecordedHash(events) {
  const e = [...events].reverse().find((x) => x?.actor === 'protect.mjs' && typeof x.protectedSha256 === 'string');
  return e ? e.protectedSha256 : null;
}

export function verifyProtected() {
  if (!exists(PROTECTED_PATH)) return { errors: [`${PROTECTED_PATH} is missing`], warnings: [] };
  const rec = readJson(PROTECTED_PATH);
  const r = compareProtected(rec.files ?? {}, currentHashes());
  const id = String(rec.approvedBy ?? '').match(/ADR-\d{4}/)?.[0] ?? '';
  if (!findAdr(id)) r.errors.push(`${PROTECTED_PATH} approvedBy (${rec.approvedBy}) is not a committed ADR listed in decisions/INDEX.md`);
  const { events } = parseLedger(exists(PATHS.ledger) ? readText(PATHS.ledger) : '');
  if (lastRecordedHash(events) !== sha256File(abs(PROTECTED_PATH))) r.errors.push(`${PROTECTED_PATH} doesn't match the hash its last protect.mjs ledger event recorded (edited by hand?)`);
  return r;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let args;
  try {
    args = parseArgs(process.argv.slice(2), ['update'], ['adr']);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  if (args.update) {
    const id = String(args.adr ?? '').match(/ADR-\d{4}/)?.[0] ?? '';
    const adrPath = findAdr(id);
    if (!adrPath) {
      console.error('--update needs --adr ADR-NNNN: a committed ADR listed in docs/agent/decisions/INDEX.md that approves the change');
      process.exit(1);
    }
    const files = currentHashes();
    const before = exists(PROTECTED_PATH) ? readJson(PROTECTED_PATH).files ?? {} : {};
    const changed = Object.keys({ ...before, ...files }).filter((f) => before[f] !== files[f]);
    const editedAdrs = changed.filter((f) => f.startsWith('docs/agent/decisions/ADR-') && f in before);
    if (editedAdrs.length) {
      console.error(`accepted ADRs are never edited: ${editedAdrs.join(', ')} (restore them and write a superseding ADR)`);
      process.exit(1);
    }
    const ownerOnly = changed.filter((f) => matches(f, OWNER_ONLY));
    if (ownerOnly.length && !hasOwnerApproval(readText(adrPath))) {
      console.error(`${adrPath} needs an "## Owner approval" section quoting the owner, because owner-only files changed: ${ownerOnly.join(', ')}`);
      process.exit(1);
    }
    const doc = {
      schemaVersion: 2,
      rule: 'Change these files only through an ADR (owner-approved for ownerOnly files; independently reviewed for the rest), then run protect.mjs --update --adr <ADR>. Accepted ADRs are never edited.',
      approvedBy: adrPath,
      updatedAt: nowIso(),
      patterns: PROTECTED_PATTERNS,
      ownerOnly: OWNER_ONLY,
      files,
    };
    const text = `${JSON.stringify(doc, null, 2)}\n`;
    writeFileSync(abs(PROTECTED_PATH), text);
    const state = readJson(PATHS.state);
    appendEvent({ kind: 'decision', actor: 'protect.mjs', slice: state.currentSlice, task: state.currentTask, result: `protected hashes recorded for ${Object.keys(files).length} file(s), ${changed.length} changed`, decisions: [id], evidence: [PROTECTED_PATH], protectedSha256: sha256Text(text) });
    console.log(`recorded ${Object.keys(files).length} protected files (${changed.length} changed) under ${adrPath}`);
    process.exit(0);
  }
  const r = verifyProtected();
  for (const e of r.errors) console.log(`ERROR   ${e}`);
  console.log(r.errors.length ? `FAILED with ${r.errors.length} error(s)` : 'OK');
  process.exit(r.errors.length ? 1 : 0);
}
