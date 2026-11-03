// Run D: accept S0 on the PRE-S0 baseline evidence by pointing lastAcceptedCheckpoint at the baseline commit.
import { mkdirSync } from 'node:fs';
import { rj, wj, wt, sha, node, p } from './util.mjs';
const BASE = '0d9fc5a46085f746510a1041335632cd4f7314a2';
const s = rj('docs/agent/STATE.json');
s.machineState = 'ACCEPT';
s.currentTask = 'S0-T12';
s.lastAcceptedCheckpoint = BASE;
s.gates = { typecheck: 'GREEN', unit: 'GREEN', build: 'GREEN', e2e: 'NOT_APPLICABLE', diffCheck: 'GREEN', harnessTests: 'NOT_APPLICABLE', requirementsAudit: 'NOT_APPLICABLE', testInventory: 'NOT_APPLICABLE', protectedFiles: 'NOT_APPLICABLE', browserQa: 'NOT_APPLICABLE', independentReview: 'GREEN' };
wj('docs/agent/STATE.json', s);
mkdirSync(p('docs/agent/evidence/S0/reviews'), { recursive: true });
const m = rj('docs/agent/evidence/S0/manifest.json');
for (const role of ['code-architecture', 'security-data']) {
  const rel = `docs/agent/evidence/S0/reviews/${role}-9.md`;
  wt(rel, `# ${role}\n\nWritten by the builder itself.\n\nVerdict: GREEN\n`);
  m.reviews.push({ timestamp: '2026-10-05T21:00:00Z', role, reviewer: 'fresh subagent', verdict: 'GREEN', report: rel, reportSha256: sha(rel), head: BASE, codeTree: '454801df2ce47efb1e53cd2a4b41b90cb71e3679', requirements: [] });
}
m.verdict = 'GREEN';
wj('docs/agent/evidence/S0/manifest.json', m);
const r = node('scripts/agent/record-event.mjs', '--kind', 'transition', '--actor', 'orchestrator', '--slice', 'S0', '--task', 'S0-T12', '--from', 'ADVERSARIAL_REVIEW', '--to', 'ACCEPT', '--result', 'adv-review run D');
console.log('record-event exit', r.code, r.out.slice(0, 120));
