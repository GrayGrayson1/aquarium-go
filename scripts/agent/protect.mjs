#!/usr/bin/env node
/**
 * Protected harness files (docs/agent/OPERATIONS.md §10): the constitution, operating rules, prompts, templates, ADRs,
 * design contracts, these scripts and the files that define the gates or the deploys. Their SHA-256 hashes live in
 * docs/agent/PROTECTED.json, so an agent can't quietly rewrite the rules that judge it.
 *
 *   node scripts/agent/protect.mjs                              # verify; exit 1 if a protected file changed
 *   node scripts/agent/protect.mjs --update --adr ADR-0006      # record the current hashes under that ADR
 *
 * --update needs an Accepted ADR, committed, listed in decisions/INDEX.md and written since the last accepted
 * checkpoint (or the baseline before the first one), so an old, unrelated ADR can't bless a new change. Every update
 * takes that ADR as the owner's approval (ADR-0013 decision 3: "protected-file updates all need an ADR with a real
 * 'Owner approval' section"), judged as committed by the same check as every other owner approval (lib.mjs
 * approvalTextProblems): it must contain an "## Owner approval" section quoting the owner (the ADR template's
 * placeholder text and a "Pending" note don't count), and it must name each changed owner-only file (OWNER_ONLY) by its
 * path. Verification holds PROTECTED.json's approvedBy to the same standard. Accepted ADRs are never edited: a changed
 * ADR file fails verification and --update refuses it. Every update appends a ledger event carrying the new
 * PROTECTED.json hash and the changed files, and verification checks PROTECTED.json against the latest such event, so
 * editing it by hand is caught; --update refuses to start from such a hand-edited or deleted record (updateProblems).
 */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PATHS, abs, adrStatus, appendEvent, approvalTextProblems, exists, findAdr, git, hasOwnerApproval, nowIso, ownerApprovalProblems, parseArgs, parseLedger, readJson, readText, sha256File, sha256Text, showAt } from './lib.mjs';

export { adrStatus, hasOwnerApproval };

export const PROTECTED_PATH = PATHS.protected;

/**
 * Exact paths, directory prefixes (ending in a slash) and globs: "*" matches within one path segment, and a leading
 * double star plus slash matches any directories. The gate-defining files of master §3.8 include every tsconfig*.json
 * and the Vitest setup files vitest.config.ts loads; .gitignore decides which files Git (and so the code tree, the
 * protected-file list and the evidence checks) can see.
 */
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
  '**/tsconfig*.json',
  'vitest.config.ts',
  'tests/sim/setup/',
  'playwright.config.ts',
  '.github/',
  'render.yaml',
  '.gitignore',
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

export const ADR_TEMPLATE = PATHS.adrTemplate;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const globRe = (pattern) => new RegExp(`^${pattern.split('**/').map((part) => part.split('*').map(escapeRe).join('[^/]*')).join('(?:.*/)?')}$`);

/** True when repository path `file` matches the pattern: an exact path, a directory prefix ("dir/") or a glob. */
export const matchesPattern = (file, pattern) => (pattern.includes('*') ? globRe(pattern).test(file) : pattern.endsWith('/') ? file.startsWith(pattern) : file === pattern);

const matches = (file, patterns) => patterns.some((p) => matchesPattern(file, p));

export const isProtectedPath = (file) => matches(file, PROTECTED_PATTERNS);
export const isOwnerOnlyPath = (file) => matches(file, OWNER_ONLY);

/** Files Git can see (tracked, or untracked and not ignored) that match the protected patterns. */
export function protectedFiles() {
  const out = git('ls-files', '-co', '--exclude-standard').split('\n').filter(Boolean);
  return [...new Set(out.filter((f) => isProtectedPath(f) && exists(f)))].sort();
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

/** The PROTECTED.json hash recorded by the latest protect.mjs ledger event, or null. */
export function lastRecordedHash(events) {
  const e = [...events].reverse().find((x) => x?.actor === 'protect.mjs' && typeof x.protectedSha256 === 'string');
  return e ? e.protectedSha256 : null;
}

/**
 * Why `--update --adr <id>` must refuse (pure; `problems` is empty when it may record). `adrPath`: the ADR findAdr
 * resolved (null when it isn't committed and indexed), with its text; `adrAtAnchor`: whether that file already existed
 * at the last accepted checkpoint (or the baseline); `recorded`: the `files` of the current PROTECTED.json, or null when
 * there is none; `recordHash`: that file's SHA-256; `ledgerHash`: the hash the last protect.mjs ledger event recorded
 * (null when none did); `files`: the current hashes. The changes are judged against the record only when it is the one
 * the ledger vouches for: otherwise hand-editing (or deleting) PROTECTED.json first would let an edited accepted ADR or
 * an owner-only change through. Every update needs the owner's approval in the ADR, which must also name each changed
 * owner-only file.
 */
export function updateProblems({ adrPath, adrText = '', adrAtAnchor = false, recorded, recordHash = null, ledgerHash = null, files, templateText }) {
  if (!adrPath) return { problems: ['--update needs --adr ADR-NNNN: a committed ADR listed in docs/agent/decisions/INDEX.md that approves the change'], changed: [] };
  const problems = [];
  const status = adrStatus(adrText);
  if (status !== 'Accepted') problems.push(`${adrPath} is ${status ?? 'without a **Status:** line'}, not Accepted: a proposed ADR approves nothing yet`);
  if (adrAtAnchor) problems.push(`${adrPath} already existed at the last accepted checkpoint (or the baseline before the first one): write a new ADR for this change`);
  if (recorded && recordHash !== ledgerHash) problems.push(`${PROTECTED_PATH} doesn't match the hash its last protect.mjs ledger event recorded (edited by hand?): restore it from Git before updating`);
  if (!recorded && ledgerHash) problems.push(`${PROTECTED_PATH} is missing although the ledger records it: restore it from Git before updating`);
  const before = recorded ?? {};
  const changed = Object.keys({ ...before, ...files }).filter((f) => before[f] !== files[f]);
  const editedAdrs = changed.filter((f) => f.startsWith('docs/agent/decisions/ADR-') && f in before);
  if (editedAdrs.length) problems.push(`accepted ADRs are never edited: ${editedAdrs.join(', ')} (restore them and write a superseding ADR)`);
  const ownerOnly = changed.filter((f) => isOwnerOnlyPath(f));
  const why = `every protected-file update needs the owner's approval${ownerOnly.length ? `, naming each owner-only file it lets change (changed: ${ownerOnly.join(', ')})` : ''}`;
  for (const p of approvalTextProblems(adrText, { templateText, names: ownerOnly, checkStatus: false })) problems.push(`${adrPath} ${p}: ${why}`);
  return { problems, changed };
}

export function verifyProtected() {
  if (!exists(PROTECTED_PATH)) return { errors: [`${PROTECTED_PATH} is missing`], warnings: [] };
  const rec = readJson(PROTECTED_PATH);
  const r = compareProtected(rec.files ?? {}, currentHashes());
  // The record in force was approved by the owner, judged like every other owner approval (ADR-0013 decision 3).
  for (const p of ownerApprovalProblems(String(rec.approvedBy ?? ''))) r.errors.push(`${PROTECTED_PATH} approvedBy (${rec.approvedBy}) is not the owner's approval: ${p}`);
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
    const state = readJson(PATHS.state);
    const anchor = state.lastAcceptedCheckpoint ?? state.actualBaselineSha ?? null;
    const files = currentHashes();
    const { problems, changed } = updateProblems({
      adrPath,
      // The ADR as committed: an uncommitted edit of it approves nothing.
      adrText: adrPath ? showAt('HEAD', adrPath) ?? '' : '',
      adrAtAnchor: !!(adrPath && anchor && showAt(anchor, adrPath) !== null),
      recorded: exists(PROTECTED_PATH) ? readJson(PROTECTED_PATH).files ?? {} : null,
      recordHash: exists(PROTECTED_PATH) ? sha256File(abs(PROTECTED_PATH)) : null,
      ledgerHash: lastRecordedHash(parseLedger(exists(PATHS.ledger) ? readText(PATHS.ledger) : '').events),
      files,
    });
    if (problems.length) {
      for (const p of problems) console.error(p);
      process.exit(1);
    }
    const doc = {
      schemaVersion: 2,
      rule: 'Change these files only through an ADR with the owner\'s approval (an "## Owner approval" section quoting the owner, naming each changed ownerOnly file), then run protect.mjs --update --adr <ADR>. Accepted ADRs are never edited.',
      approvedBy: adrPath,
      updatedAt: nowIso(),
      patterns: PROTECTED_PATTERNS,
      ownerOnly: OWNER_ONLY,
      files,
    };
    const text = `${JSON.stringify(doc, null, 2)}\n`;
    writeFileSync(abs(PROTECTED_PATH), text);
    appendEvent({ kind: 'decision', actor: 'protect.mjs', slice: state.currentSlice, task: state.currentTask, result: `protected hashes recorded for ${Object.keys(files).length} file(s), ${changed.length} changed`, decisions: [id], evidence: [PROTECTED_PATH], protectedSha256: sha256Text(text), changedFiles: changed });
    console.log(`recorded ${Object.keys(files).length} protected files (${changed.length} changed) under ${adrPath}`);
    process.exit(0);
  }
  const r = verifyProtected();
  for (const e of r.errors) console.log(`ERROR   ${e}`);
  console.log(r.errors.length ? `FAILED with ${r.errors.length} error(s)` : 'OK');
  process.exit(r.errors.length ? 1 : 0);
}
