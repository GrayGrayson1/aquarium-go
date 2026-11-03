// Run A: tampering that check-state SHOULD catch (all uncommitted, from the worktree baseline).
import { rj, wj, rt, wt } from './util.mjs';
// A1 rewrite ledger line 1 (one field), uncommitted
const lines = rt('docs/agent/LEDGER.jsonl').split('\n');
const e0 = JSON.parse(lines[0]); e0.result = `${e0.result} (edited)`; lines[0] = JSON.stringify(e0);
// A8 append an illegal IMPLEMENT -> ACCEPT transition by hand
const ill = { timestamp: '2026-10-05T21:00:00Z', kind: 'transition', actor: 'orchestrator', slice: 'S0', task: 'S0-T8', fromState: 'IMPLEMENT', toState: 'ACCEPT', result: 'skip ahead', evidence: [], decisions: [] };
let text = lines.join('\n'); if (!text.endsWith('\n')) text += '\n';
wt('docs/agent/LEDGER.jsonl', `${text}${JSON.stringify(ill)}\n`);
// A2 delete PERSIST-003 (uncommitted)
const req = rj('docs/agent/REQUIREMENTS.json'); req.requirements = req.requirements.filter((r) => r.id !== 'PERSIST-003'); wj('docs/agent/REQUIREMENTS.json', req);
// A3 edit a protected file without --update
wt('docs/agent/OPERATIONS.md', `${rt('docs/agent/OPERATIONS.md')}\n- (tampered)\n`);
// A4 edit a hashed evidence log
wt('docs/agent/evidence/S0/logs/baseline-unit.log', `${rt('docs/agent/evidence/S0/logs/baseline-unit.log')}tampered\n`);
// A5 GREEN gates by hand: harnessTests (no record) and build (old-tree record)
const s = rj('docs/agent/STATE.json');
s.gates.harnessTests = 'GREEN'; s.gates.build = 'GREEN';
// A6 remote permission without approval; A12 multiplayer approval pointing at a missing ADR
s.remoteMutationAllowed = true; s.remoteApproval = null;
s.multiplayerApproved = true; s.multiplayerApproval = 'docs/agent/decisions/ADR-0099-missing.md';
wj('docs/agent/STATE.json', s);
// A7 approve DESIGN-S3D without an approval reference (also changes a protected file)
const reg = rj('docs/agent/design/DESIGN_REGISTRY.json');
for (const d of reg.designs) if (d.id === 'DESIGN-S3D') { d.status = 'APPROVED'; d.approval = null; d.path = 'docs/agent/design/DESIGN_INTAKE.md'; }
wj('docs/agent/design/DESIGN_REGISTRY.json', reg);
// A11 evidence log in an ignored location
const m = rj('docs/agent/evidence/S0/manifest.json');
m.commands.push({ gate: 'check:ignored', command: 'true', exitCode: 0, log: 'dist/ignored.log', logSha256: null });
wj('docs/agent/evidence/S0/manifest.json', m);
console.log('run A applied');
