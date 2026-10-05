#!/usr/bin/env node
/**
 * Record one piece of evidence in docs/agent/evidence/<slice>/manifest.json (master §28 and §41 capture-evidence).
 *
 * A targeted command (Level 0-2 checks):
 *   node scripts/agent/capture-evidence.mjs --command "npx vitest run tests/sim/nav-routes.test.ts" --label nav-routes [--req NAV-001]
 *
 * A browser run (master §28 browser evidence; the screenshot must already exist):
 *   node scripts/agent/capture-evidence.mjs --browser --route "#/shop" --viewport 390x844 --fixture none \
 *     --actions "open shop; toggle Prismatic only" --expected "..." --observed "..." --console-errors 0 \
 *     --screenshot .agent-runs/evidence/S1/screens/shop-390.png [--req MKT-001]
 *
 * A reviewer's verdict (the reviewer's own report file must exist under evidence/<slice>/reviews/ and end with the
 * verdict line):
 *   node scripts/agent/capture-evidence.mjs --review --role code-architecture --verdict GREEN \
 *     --report docs/agent/evidence/S1/reviews/code-architecture-1.md --reviewer "fresh subagent"
 *
 * A committed evidence file (an inventory or report) recorded with its hash:
 *   node scripts/agent/capture-evidence.mjs --file docs/agent/evidence/S1/test-inventory.json --kind test-inventory
 *
 * A performance measurement:
 *   node scripts/agent/capture-evidence.mjs --perf --scenario big_facility --metric "fps 58" --baseline "fps 60" \
 *     --machine "M4 Pro, Chrome headless" --quality high --population "12 tanks"
 */
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { PATHS, abs, git, nowIso, parseArgs, readJson, readText, sha256File } from './lib.mjs';
import { codeTreeOf, loadManifest, recordFile, runAndRecord, saveManifest } from './evidence.mjs';

const REVIEW_VERDICTS = ['GREEN', 'YELLOW', 'RED'];

/**
 * The verdict a report ends with: its last non-empty line must be exactly "Verdict: GREEN|YELLOW|RED" (bold markers
 * allowed). Anything else, including a verdict legend quoted earlier in the report, counts as no verdict (null).
 */
export function reportVerdict(text) {
  const last = String(text).split('\n').map((l) => l.trim()).filter(Boolean).pop() ?? '';
  const m = last.replace(/\*/g, '').trim().match(/^Verdict:\s*(GREEN|YELLOW|RED)$/i);
  return m ? m[1].toUpperCase() : null;
}

export function reportStatesVerdict(text, verdict) {
  return reportVerdict(text) === verdict;
}

/**
 * Why a --review can't be recorded (pure; empty when it can): the role, verdict and report are required, the report
 * must be the reviewer's own file under evidence/<slice>/reviews/ (committed with the evidence, never .agent-runs/ or a
 * path outside the repository), and its last line must be the verdict being recorded.
 */
export function reviewProblems({ role, verdict, report }, slice, { exists: fileExists, read }) {
  const missing = Object.entries({ role, verdict, report }).filter(([, v]) => typeof v !== 'string').map(([k]) => `--review needs --${k}`);
  if (missing.length) return missing;
  if (!REVIEW_VERDICTS.includes(verdict)) return [`--verdict must be one of ${REVIEW_VERDICTS.join(', ')}`];
  const reviewsDir = `${PATHS.evidence}/${slice}/reviews/`;
  if (!report.startsWith(reviewsDir) || report.split('/').includes('..')) return [`--report must be the reviewer's own file under ${reviewsDir} (committed with the evidence)`];
  if (!fileExists(report)) return [`report ${report} does not exist`];
  const ended = reportVerdict(read(report));
  if (ended !== verdict) return [`report ${report} ends with ${ended ? `"Verdict: ${ended}"` : 'no verdict line'}, not "Verdict: ${verdict}"`];
  return [];
}

const list = (v) => (v == null ? [] : [].concat(v).map(String));

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  let args;
  try {
    args = parseArgs(process.argv.slice(2), ['browser', 'review', 'perf', 'help'], ['command', 'label', 'req', 'slice', 'route', 'viewport', 'fixture', 'actions', 'expected', 'observed', 'consoleErrors', 'screenshot', 'role', 'verdict', 'report', 'reviewer', 'scenario', 'metric', 'baseline', 'machine', 'quality', 'population', 'file', 'kind']);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  if (args.help) {
    console.log('See the header of scripts/agent/capture-evidence.mjs for the forms (--command, --browser, --review, --perf, --file).');
    process.exit(0);
  }
  const slice = args.slice ?? readJson(PATHS.state).currentSlice;
  const requirements = list(args.req);
  const fail = (msg) => {
    console.error(msg);
    process.exit(1);
  };

  if (typeof args.command === 'string') {
    const rec = await runAndRecord({ slice, gate: `check:${args.label ?? 'targeted'}`, command: args.command, requirements });
    console.log(JSON.stringify(rec));
    process.exit(rec.exitCode === 0 ? 0 : 1);
  }

  if (typeof args.file === 'string') {
    if (!existsSync(abs(args.file))) fail(`file ${args.file} does not exist`);
    if (typeof args.kind !== 'string') fail('--file needs --kind (for example test-inventory)');
    recordFile(slice, args.file, args.kind);
    console.log(`recorded ${args.file} in ${PATHS.evidence}/${slice}/manifest.json`);
    process.exit(0);
  }

  const manifest = loadManifest(slice);
  const head = git('rev-parse', 'HEAD');
  if (args.browser) {
    for (const k of ['route', 'viewport', 'observed', 'screenshot']) if (typeof args[k] !== 'string') fail(`--browser needs --${k}`);
    if (!existsSync(abs(args.screenshot))) fail(`screenshot ${args.screenshot} does not exist`);
    const consoleErrors = Number(args.consoleErrors);
    if (!Number.isInteger(consoleErrors) || consoleErrors < 0) fail('--console-errors must be a whole number (count them; don\'t guess)');
    manifest.browserRuns.push({
      timestamp: nowIso(),
      route: args.route,
      viewport: args.viewport,
      fixture: args.fixture ?? null,
      actions: args.actions ?? null,
      expected: args.expected ?? null,
      observed: args.observed,
      consoleErrors,
      screenshot: args.screenshot,
      screenshotSha256: sha256File(abs(args.screenshot)),
      head,
      codeTree: codeTreeOf(null),
      requirements,
    });
  } else if (args.review) {
    const problems = reviewProblems(args, slice, { exists: (p) => existsSync(abs(p)), read: readText });
    if (problems.length) fail(problems.join('; '));
    manifest.reviews.push({
      timestamp: nowIso(),
      role: args.role,
      reviewer: args.reviewer ?? null,
      verdict: args.verdict,
      report: args.report,
      reportSha256: sha256File(abs(args.report)),
      head,
      codeTree: codeTreeOf(null),
      requirements,
    });
  } else if (args.perf) {
    for (const k of ['scenario', 'metric']) if (typeof args[k] !== 'string') fail(`--perf needs --${k}`);
    manifest.performance.push({
      timestamp: nowIso(),
      scenario: args.scenario,
      metric: args.metric,
      baseline: args.baseline ?? null,
      machine: args.machine ?? null,
      quality: args.quality ?? null,
      population: args.population ?? null,
      head,
      codeTree: codeTreeOf(null),
      requirements,
    });
  } else {
    fail('nothing to record: pass --command, --browser, --review, --perf or --file (see --help)');
  }
  saveManifest(manifest);
  console.log(`recorded in ${PATHS.evidence}/${slice}/manifest.json`);
}
