#!/usr/bin/env node
/**
 * Regenerate the machine-derived part of docs/agent/HANDOFF.md from state, Git, evidence and the ledger (master §41
 * handoff), so a handoff never relies on memory for facts a script can read.
 *
 *   node scripts/agent/handoff.mjs          # print the generated block
 *   node scripts/agent/handoff.mjs --write  # replace the block between the markers in HANDOFF.md
 *
 * Only the text between <!-- generated:start --> and <!-- generated:end --> is replaced. The written sections
 * (verified complete, verified failing, risks, exact next legal action, owner questions) stay as the orchestrator
 * wrote them.
 */
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { PATHS, abs, exists, git, nowIso, parseArgs, parseLedger, readJson, readText } from './lib.mjs';
import { loadManifest } from './evidence.mjs';

export const START = '<!-- generated:start -->';
export const END = '<!-- generated:end -->';

export function replaceBlock(text, block) {
  const a = text.indexOf(START);
  const b = text.indexOf(END);
  if (a >= 0 && b > a) return `${text.slice(0, a)}${block}${text.slice(b + END.length)}`;
  const lines = text.split('\n');
  const titleAt = lines.findIndex((l) => l.startsWith('# '));
  lines.splice(titleAt + 1, 0, '', block);
  return lines.join('\n');
}

export function buildBlock() {
  const s = readJson(PATHS.state);
  const manifest = loadManifest(s.currentSlice);
  const latest = {};
  for (const c of manifest.commands) latest[c.gate] = c;
  const reqs = readJson(PATHS.requirements).requirements.filter((r) => r.slice === s.currentSlice);
  const counts = {};
  for (const r of reqs) counts[r.status] = (counts[r.status] ?? 0) + 1;
  const { events } = parseLedger(exists(PATHS.ledger) ? readText(PATHS.ledger) : '');
  const registry = readJson(PATHS.designRegistry);
  const dirty = git('status', '--porcelain');
  const lines = [
    START,
    `_Generated ${nowIso()} by scripts/agent/handoff.mjs. Edit the sections below the block, not inside it._`,
    '',
    '## Checkpoint',
    `- branch: ${git('rev-parse', '--abbrev-ref', 'HEAD')}`,
    `- HEAD: ${git('rev-parse', 'HEAD')} (${git('log', '-1', '--format=%s')})`,
    `- baseline: ${s.actualBaselineSha ?? s.planningBaselineSha}`,
    `- last accepted checkpoint: ${s.lastAcceptedCheckpoint ?? 'none yet'}`,
    '',
    '## Current position',
    `- slice: ${s.currentSlice}`,
    `- machine state: ${s.machineState}`,
    `- task: ${s.currentTask}`,
    `- repair attempt: ${s.repairAttempt}${s.repairTarget ? ` (${s.repairTarget})` : ''}`,
    `- owner gate: ${s.ownerGateRequired ? `REQUIRED: ${s.ownerGateReason}` : 'none'}`,
    `- required reviewers: ${s.requiredReviewers.join(', ')}`,
    '',
    '## Gates',
    ...Object.entries(s.gates).map(([g, v]) => {
      const c = latest[g];
      return `- ${g}: ${v}${c ? ` (last run ${c.start}, exit ${c.exitCode}, ${c.log})` : ''}`;
    }),
    '',
    `## Requirements for ${s.currentSlice}`,
    `- ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ') || 'none'}`,
    '',
    '## Dirty files',
    ...(dirty ? dirty.split('\n').map((l) => `- \`${l}\``) : ['- none (clean tree)']),
    '',
    '## Designs not yet approved',
    ...registry.designs.filter((d) => !['APPROVED', 'SUPERSEDED'].includes(d.status)).map((d) => `- ${d.id} [${d.status}]: ${d.title}`),
    '',
    '## Last ledger events',
    ...events.slice(-8).map((e) => `- ${e.timestamp} ${e.actor} ${e.kind} ${e.slice}/${e.task}: ${e.result}`),
    END,
  ];
  return lines.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = parseArgs(process.argv.slice(2), ['write']);
  const block = buildBlock();
  if (!args.write) console.log(block);
  else {
    writeFileSync(abs(PATHS.handoff), replaceBlock(readText(PATHS.handoff), block));
    console.log('HANDOFF.md generated block updated');
  }
}
