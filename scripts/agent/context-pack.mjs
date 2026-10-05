#!/usr/bin/env node
/**
 * Build a compact context pack for a builder or reviewer prompt (master §14 and §41 context-pack): the owner's hard
 * decisions and the non-negotiables from the master, the current slice, the handoff, the ADRs they cite, the
 * slice's requirements, the design sections they cite (headings only) and any design still waiting for approval.
 * It never includes chat history.
 *
 *   node scripts/agent/context-pack.mjs                       # builder pack → .agent-runs/CONTEXT_PACK.md
 *   node scripts/agent/context-pack.mjs --for reviewer        # reviewer pack: no handoff, no ledger, no builder notes
 *   node scripts/agent/context-pack.mjs --out -               # print instead of writing
 *
 * Design sections are taken only from "design §n" citations and requirements' designSections (ranges expanded), never
 * from "master §n" or other documents' section numbers.
 */
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PATHS, ROOT, exists, git, nowIso, parseArgs, readJson, readText } from './lib.mjs';

const MASTER = 'docs/agent/AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md';
const DESIGN = 'docs/agent/design/AQUARIUM_GO_0_5_DESIGN_SPEC.md';

/** Text from the line that starts with `from` up to (not including) the next line that starts with `to`. */
export function section(text, from, to) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.startsWith(from));
  if (start < 0) return '';
  const rel = lines.slice(start + 1).findIndex((l) => l.startsWith(to));
  return lines.slice(start, rel < 0 ? undefined : start + 1 + rel).join('\n').trim();
}

/**
 * The sections a range names: "12-16" → 12…16 and "12.2-12.5" → 12.2…12.5 (same parent, last number counts up);
 * any other pair gives just its two ends.
 */
function expandRange(from, to) {
  if (!to) return [from];
  const a = from.split('.');
  const b = to.split('.');
  const first = Number(a[a.length - 1]);
  const last = Number(b[b.length - 1]);
  if (a.length !== b.length || a.slice(0, -1).join('.') !== b.slice(0, -1).join('.') || last < first || last - first > 100) return [from, to];
  const parent = a.slice(0, -1);
  return Array.from({ length: last - first + 1 }, (_, i) => [...parent, String(first + i)].join('.'));
}

/** Section numbers cited as design sections: "design §5.2", "design §12-§16", "§5.2" items of designSections. */
export function designCitations(texts, designSections = []) {
  const out = new Set(designSections.map((d) => String(d).replace(/^§/, '')));
  for (const t of texts) {
    for (const m of String(t).matchAll(/design\s+((?:§\d+(?:\.\d+)*(?:\s*[-–]\s*§?\d+(?:\.\d+)*)?(?:\s*(?:,|and)\s*)?)+)/gi)) {
      for (const part of m[1].split(/\s*(?:,|and)\s*/)) {
        const r = part.match(/§?(\d+(?:\.\d+)*)(?:\s*[-–]\s*§?(\d+(?:\.\d+)*))?/);
        if (r) for (const n of expandRange(r[1], r[2])) out.add(n);
      }
    }
  }
  return [...out].map((n) => `§${n}`);
}

/** Design headings for every cited section (§n or §n.m). */
export function citedDesignHeadings(cites, design) {
  const headings = design.split('\n').filter((l) => /^#{2,4} \d+(\.\d+)*\.? /.test(l));
  const out = [];
  for (const c of [...new Set(cites)].sort()) {
    const num = c.slice(1);
    const h = headings.find((l) => l.replace(/^#+ /, '').startsWith(`${num}.`) || l.replace(/^#+ /, '').startsWith(`${num} `));
    if (h) out.push(`- ${c}: ${h.replace(/^#+ /, '')}`);
  }
  return out;
}

export function buildPack({ forReviewer = false } = {}) {
  const state = readJson(PATHS.state);
  const master = readText(MASTER);
  const slice = exists(PATHS.currentSlice) ? readText(PATHS.currentSlice) : '(missing)';
  const handoff = exists(PATHS.handoff) ? readText(PATHS.handoff) : '(missing)';
  const reqs = readJson(PATHS.requirements).requirements.filter((r) => r.slice === state.currentSlice || r.slice === 'ALL');
  const adrIds = new Set(`${slice}\n${forReviewer ? '' : handoff}`.match(/ADR-\d{4}/g) ?? []);
  const adrFiles = readdirSync(join(ROOT, PATHS.decisions)).filter((f) => [...adrIds].some((id) => f.startsWith(id)));
  const registry = readJson(PATHS.designRegistry);
  const pending = registry.designs.filter((d) => d.status !== 'APPROVED' && d.status !== 'SUPERSEDED');
  const cites = designCitations([slice, ...reqs.map((r) => `${r.source} ${r.description}`)], reqs.flatMap((r) => r.designSections ?? []));

  const parts = [
    `# CONTEXT PACK — ${state.currentSlice} (${state.machineState})`,
    `Generated ${nowIso()} from repository files at ${git('rev-parse', '--short', 'HEAD')} on ${git('rev-parse', '--abbrev-ref', 'HEAD')}. Not chat history. Regenerate rather than edit.`,
    '## State',
    '```json',
    JSON.stringify({ currentSlice: state.currentSlice, currentTask: state.currentTask, machineState: state.machineState, repairAttempt: state.repairAttempt, gates: state.gates, requiredReviewers: state.requiredReviewers, ownerGateRequired: state.ownerGateRequired, ownerGateReason: state.ownerGateReason ?? null }, null, 2),
    '```',
    section(master, '## 3. Hard owner decisions', '# PART II'),
    section(master, '# PART XXIV', '# END STATE'),
    '## Current slice',
    slice,
    ...(forReviewer ? [] : ['## Handoff', handoff]),
    ...adrFiles.map((f) => `## ${f}\n\n${readText(`${PATHS.decisions}/${f}`)}`),
    `## Requirements for ${state.currentSlice} and ALL`,
    ...reqs.map((r) => `- **${r.id}** [${r.status}] ${r.description}\n  - source: ${r.source}\n  - acceptance: ${(r.acceptance ?? []).join(' | ')}`),
    '## Design sections cited (load only these from the design spec)',
    ...citedDesignHeadings(cites, readText(DESIGN)),
    '## Designs not yet approved (do not build what depends on them)',
    ...(pending.length ? pending.map((d) => `- ${d.id} [${d.status}]: ${d.title}`) : ['- none']),
  ];
  return `${parts.join('\n\n')}\n`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let args;
  try {
    args = parseArgs(process.argv.slice(2), [], ['out', 'for']);
    if (args.for !== undefined && args.for !== 'reviewer' && args.for !== 'builder') throw new Error('--for must be builder or reviewer');
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  const pack = buildPack({ forReviewer: args.for === 'reviewer' });
  const out = args.out ?? (args.for === 'reviewer' ? '.agent-runs/CONTEXT_PACK.reviewer.md' : '.agent-runs/CONTEXT_PACK.md');
  if (out === '-') process.stdout.write(pack);
  else {
    mkdirSync(dirname(join(ROOT, out)), { recursive: true });
    writeFileSync(join(ROOT, out), pack);
    console.log(`wrote ${out} (${pack.length} characters, about ${Math.round(pack.length / 4)} tokens)`);
  }
}
