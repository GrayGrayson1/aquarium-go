// Run C: after a checkpoint, check-state can no longer compute the checkpoint's code tree, so stale evidence passes.
import { mkdirSync } from 'node:fs';
import { rj, wj, wt, sha, node, p, git } from './util.mjs';
const STALE = '454801df2ce47efb1e53cd2a4b41b90cb71e3679'; // code tree of the pre-S0 baseline 0d9fc5a
const step = process.argv[2];
if (step === 'accept') {
  const s = rj('docs/agent/STATE.json');
  s.machineState = 'ACCEPT';
  s.currentTask = 'S0-T12';
  s.lastAcceptedCheckpoint = process.argv[3] ?? null;
  s.gates = { typecheck: 'GREEN', unit: 'GREEN', build: 'GREEN', e2e: 'NOT_APPLICABLE', diffCheck: 'GREEN', harnessTests: 'GREEN', requirementsAudit: 'GREEN', testInventory: 'GREEN', protectedFiles: 'GREEN', browserQa: 'NOT_APPLICABLE', independentReview: 'GREEN' };
  wj('docs/agent/STATE.json', s);
  const m = rj('docs/agent/evidence/S0/manifest.json');
  if (!m.reviews.length) {
    for (const gate of ['harnessTests', 'requirementsAudit', 'testInventory', 'protectedFiles']) m.commands.push({ gate, command: 'n/a', exitCode: 0, head: '0d9fc5a46085f746510a1041335632cd4f7314a2', codeTree: STALE });
    mkdirSync(p('docs/agent/evidence/S0/reviews'), { recursive: true });
    for (const role of ['code-architecture', 'security-data']) {
      const rel = `docs/agent/evidence/S0/reviews/${role}-9.md`;
      wt(rel, `# ${role}\n\nVerdict: GREEN\n`);
      m.reviews.push({ role, verdict: 'GREEN', report: rel, reportSha256: sha(rel), codeTree: STALE });
    }
    m.verdict = 'GREEN';
    wj('docs/agent/evidence/S0/manifest.json', m);
    console.log(node('scripts/agent/record-event.mjs', '--kind', 'transition', '--actor', 'orchestrator', '--slice', 'S0', '--task', 'S0-T12', '--from', 'ADVERSARIAL_REVIEW', '--to', 'ACCEPT', '--result', 'adv run C accept').code);
  }
} else if (step === 'bookkeeping') {
  const c1 = git('rev-parse', 'HEAD');
  const s = rj('docs/agent/STATE.json');
  s.lastAcceptedCheckpoint = c1;
  s.machineState = 'CHECKPOINT';
  wj('docs/agent/STATE.json', s);
  console.log(node('scripts/agent/record-event.mjs', '--kind', 'transition', '--actor', 'orchestrator', '--slice', 'S0', '--task', 'S0-T12', '--from', 'ACCEPT', '--to', 'CHECKPOINT', '--result', 'adv run C checkpoint').code);
}
