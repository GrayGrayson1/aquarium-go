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
 * checkpoint (or the baseline before the first one), so an old, unrelated ADR can't bless a new change. When an
 * owner-only file changed (OWNER_ONLY), that ADR must contain an "## Owner approval" section quoting the owner; the
 * ADR template's placeholder text and a "Pending" note don't count. Accepted ADRs are never edited: a changed ADR file
 * fails verification and --update refuses it. Every update appends a ledger event carrying the new PROTECTED.json
 * hash, and verification checks PROTECTED.json against the latest such event, so editing it by hand is caught;
 * --update refuses to start from such a hand-edited or deleted record (updateProblems).
 */
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PATHS, abs, appendEvent, exists, findAdr, git, nowIso, parseArgs, parseLedger, readJson, readText, sha256File, sha256Text, showAt } from './lib.mjs';

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

export const ADR_TEMPLATE = 'docs/agent/templates/ADR_TEMPLATE.md';

/** The non-empty, trimmed lines of a text's "## Owner approval" section, or null when it has none. */
function ownerApprovalLines(text) {
  const lines = String(text).split('\n');
  const start = lines.findIndex((l) => /^## Owner approval\s*$/.test(l));
  if (start < 0) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^## /.test(l));
  return (end < 0 ? rest : rest.slice(0, end)).map((l) => l.trim()).filter(Boolean);
}

/**
 * True when the ADR text has an "## Owner approval" section with real content. Lines copied unchanged from the ADR
 * template's own section (its instructions) don't count, and a section that starts "Pending", "TBD" or "To be
 * recorded" is no approval.
 */
export function hasOwnerApproval(adrText, templateText = exists(ADR_TEMPLATE) ? readText(ADR_TEMPLATE) : '') {
  const lines = ownerApprovalLines(adrText);
  if (!lines) return false;
  const placeholder = new Set(ownerApprovalLines(templateText) ?? []);
  const own = lines.filter((l) => !placeholder.has(l));
  if (/^(pending|tbd|todo|to be (recorded|added|confirmed))\b/i.test((own[0] ?? '').replace(/[*_>`]/g, '').trim())) return false;
  return own.join('').replace(/\s+/g, '').length >= 40;
}

/** The ADR's status word from its "**Status:**" line (Accepted, Proposed, …), or null. */
export function adrStatus(adrText) {
  return String(adrText).match(/^\*\*Status:\*\*\s*([A-Za-z]+)/m)?.[1] ?? null;
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
 * an owner-only change through.
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
  const ownerOnly = changed.filter((f) => matches(f, OWNER_ONLY));
  if (ownerOnly.length && !hasOwnerApproval(adrText, templateText)) problems.push(`${adrPath} needs an "## Owner approval" section quoting the owner, because owner-only files changed: ${ownerOnly.join(', ')}`);
  return { problems, changed };
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
    const state = readJson(PATHS.state);
    const anchor = state.lastAcceptedCheckpoint ?? state.actualBaselineSha ?? null;
    const files = currentHashes();
    const { problems, changed } = updateProblems({
      adrPath,
      adrText: adrPath ? readText(adrPath) : '',
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
      rule: 'Change these files only through an ADR (owner-approved for ownerOnly files; independently reviewed for the rest), then run protect.mjs --update --adr <ADR>. Accepted ADRs are never edited.',
      approvedBy: adrPath,
      updatedAt: nowIso(),
      patterns: PROTECTED_PATTERNS,
      ownerOnly: OWNER_ONLY,
      files,
    };
    const text = `${JSON.stringify(doc, null, 2)}\n`;
    writeFileSync(abs(PROTECTED_PATH), text);
    appendEvent({ kind: 'decision', actor: 'protect.mjs', slice: state.currentSlice, task: state.currentTask, result: `protected hashes recorded for ${Object.keys(files).length} file(s), ${changed.length} changed`, decisions: [id], evidence: [PROTECTED_PATH], protectedSha256: sha256Text(text) });
    console.log(`recorded ${Object.keys(files).length} protected files (${changed.length} changed) under ${adrPath}`);
    process.exit(0);
  }
  const r = verifyProtected();
  for (const e of r.errors) console.log(`ERROR   ${e}`);
  console.log(r.errors.length ? `FAILED with ${r.errors.length} error(s)` : 'OK');
  process.exit(r.errors.length ? 1 : 0);
}
