// Isolated probes of the exported validators. Each prints CAUGHT (errors) / WARN-ONLY / NOT CAUGHT.
import { validateGateEvidence, validateEvidenceFiles, validateRequirements, validateLedger, validateStateAgainstLedger, validateState, validateRegistry } from '/Volumes/Dev/Projects/AquariumGo-review-adv/scripts/agent/check-state.mjs';
import { validateEvent } from '/Volumes/Dev/Projects/AquariumGo-review-adv/scripts/agent/lib.mjs';
import { compareProtected } from '/Volumes/Dev/Projects/AquariumGo-review-adv/scripts/agent/protect.mjs';
import { reportStatesVerdict } from '/Volumes/Dev/Projects/AquariumGo-review-adv/scripts/agent/capture-evidence.mjs';
import { checkAssertion, MANDATED_READS } from '/Volumes/Dev/Projects/AquariumGo-review-adv/scripts/agent/bootstrap-check.mjs';
import { auditRequirements } from '/Volumes/Dev/Projects/AquariumGo-review-adv/scripts/agent/requirements-audit.mjs';
import { compareInventories } from '/Volumes/Dev/Projects/AquariumGo-review-adv/scripts/agent/test-inventory.mjs';
import { rj } from './util.mjs';

const verdict = (r) => (r.errors?.length ? `CAUGHT: ${r.errors[0]}` : r.warnings?.length ? `WARN-ONLY: ${r.warnings[0]}` : 'NOT CAUGHT');
const out = (id, what, r) => console.log(`${id} | ${what} | ${verdict(r)}`);

const state = rj('docs/agent/STATE.json');
const accepted = (o = {}) => ({ ...state, machineState: 'ACCEPT', currentTask: 'S0-T12', ...o, gates: { ...state.gates, ...(o.gates ?? {}) } });
const allGreen = { typecheck: 'GREEN', unit: 'GREEN', build: 'GREEN', e2e: 'GREEN', diffCheck: 'GREEN', harnessTests: 'GREEN', requirementsAudit: 'GREEN', testInventory: 'GREEN', protectedFiles: 'GREEN', browserQa: 'NOT_APPLICABLE', independentReview: 'GREEN' };
const forgedCmds = Object.keys(allGreen).filter((g) => !['browserQa', 'independentReview'].includes(g)).map((gate) => ({ gate, exitCode: 0 }));
const forgedReviews = [{ role: 'code-architecture', verdict: 'GREEN' }, { role: 'security-data', verdict: 'GREEN' }];
const CUR = 'ffffffffffffffffffffffffffffffffffffffff';

// P1 gate records without codeTree / log at an accepted state
out('P1', 'ACCEPT, every gate GREEN from records {gate, exitCode:0} with no codeTree/log', validateGateEvidence(accepted({ gates: allGreen }), { commands: forgedCmds, reviews: forgedReviews, verdict: 'GREEN' }, { codeTree: CUR, acceptedTree: true }));
// P1b same records but WITH an old codeTree (control: should be caught)
out('P1b', 'control: same records carrying an old codeTree', validateGateEvidence(accepted({ gates: allGreen }), { commands: forgedCmds.map((c) => ({ ...c, codeTree: 'old' })), reviews: forgedReviews, verdict: 'GREEN' }, { codeTree: CUR, acceptedTree: true }));
// P2 hand-edit STATE gates to NOT_APPLICABLE: no evidence at all for typecheck/unit/build/e2e
const na = Object.fromEntries(Object.keys(allGreen).map((g) => [g, g === 'independentReview' ? 'GREEN' : 'NOT_APPLICABLE']));
out('P2', 'ACCEPT with typecheck/unit/build/e2e/... hand-set NOT_APPLICABLE, zero command records', validateGateEvidence(accepted({ gates: na }), { commands: [], reviews: forgedReviews, verdict: 'GREEN' }, { codeTree: CUR, acceptedTree: true }));
out('P2b', 'validateState on that STATE', validateState(accepted({ gates: na })));
// P2c delete the four harness gates from STATE.gates entirely
const g4 = { ...allGreen }; for (const k of ['harnessTests', 'requirementsAudit', 'testInventory', 'protectedFiles']) delete g4[k];
const s2c = accepted(); s2c.gates = g4;
out('P2c', 'STATE.gates without harnessTests/requirementsAudit/testInventory/protectedFiles keys', validateState(s2c));
// P3 evidence-file checks with no paths
out('P3', 'review record without report path, command without log path', validateEvidenceFiles({ commands: forgedCmds, reviews: forgedReviews }, { exists: () => false, hash: () => 'x', ignored: () => false }));
// P4 edited log + re-hashed manifest: consistent by construction
out('P4', 'log edited and manifest logSha256 updated to match', validateEvidenceFiles({ commands: [{ gate: 'unit', exitCode: 0, log: 'L', logSha256: 'NEW' }] }, { exists: () => true, hash: () => 'NEW', ignored: () => false }));
// P5 failure record deleted from the manifest (flaky alarm needs both records)
out('P5', 'RED run deleted from manifest before the GREEN re-run (flaky alarm)', validateEvidenceFiles({ commands: [{ gate: 'unit', exitCode: 0, codeTree: 't' }] }, { exists: () => true, hash: () => '', ignored: () => false }));
// P6 requirement deletion committed (HEAD no longer has it); DEFERRED with a made-up decision
const reqs = rj('docs/agent/REQUIREMENTS.json');
const without = { ...reqs, requirements: reqs.requirements.filter((r) => r.id !== 'HARNESS-005') };
out('P6a', 'control: HARNESS-005 deleted in working tree, HEAD still has it', validateRequirements(without, reqs));
out('P6b', 'HARNESS-005 deleted and the deletion committed (HEAD lacks it too)', validateRequirements(without, without));
const deferred = { ...reqs, requirements: reqs.requirements.map((r) => (r.slice === 'S0' ? { ...r, status: 'DEFERRED', decision: 'ADR-9999 (no such file)' } : r)) };
out('P6c', 'every S0 requirement DEFERRED with a non-existent decision reference', validateRequirements(deferred, reqs));
out('P6d', 'requirements-audit at ACCEPT with every S0 requirement DEFERRED (bogus ADR)', auditRequirements(deferred, accepted(), { committed: reqs, sliceText: '' }));
const greenFake = { ...reqs, requirements: reqs.requirements.map((r) => (r.slice === 'S0' ? { ...r, status: 'GREEN', tests: r.tests.length ? r.tests : ['x'], evidence: ['docs/agent/evidence/S0/does-not-exist.json'] } : r)) };
out('P6e', 'requirements-audit at ACCEPT, S0 requirements GREEN citing non-existent evidence', auditRequirements(greenFake, accepted(), { committed: reqs, sliceText: '' }));
// P7 ledger rewrite: working vs committed
const ev = (o) => ({ timestamp: '2026-10-05T00:00:00Z', kind: 'transition', actor: 'orchestrator', slice: 'S0', task: 'S0-T1', fromState: 'BOOTSTRAP', toState: 'BASELINE_VERIFY', result: 'ok', evidence: [], decisions: [], ...o });
const L = (...es) => es.map((e) => `${JSON.stringify(e)}\n`).join('');
const orig = L(ev(), ev({ fromState: 'BASELINE_VERIFY', toState: 'SLICE_DISCOVERY' }));
const rewritten = L(ev({ result: 'REWRITTEN' }), ev({ fromState: 'BASELINE_VERIFY', toState: 'SLICE_DISCOVERY' }));
out('P7a', 'control: ledger line rewritten, not committed', validateLedger(rewritten, orig));
out('P7b', 'ledger line rewritten AND committed (HEAD has the rewrite)', validateLedger(rewritten, rewritten));
out('P7c', 'ledger line deleted AND committed', validateLedger(L(ev()), L(ev())));
// P8 transition chain discontinuity: last transition went to IMPLEMENT; append ADVERSARIAL_REVIEW -> ACCEPT
const chain = [ev({ fromState: 'PLAN_LOCK', toState: 'IMPLEMENT' }), ev({ fromState: 'ADVERSARIAL_REVIEW', toState: 'ACCEPT' })];
out('P8a', 'append ADVERSARIAL_REVIEW->ACCEPT right after ->IMPLEMENT (validateEvent per line)', { errors: chain.flatMap(validateEvent) });
out('P8b', 'STATE=ACCEPT vs that ledger (validateStateAgainstLedger)', validateStateAgainstLedger({ machineState: 'ACCEPT' }, chain));
out('P8c', 'control: append IMPLEMENT->ACCEPT', { errors: validateEvent(ev({ fromState: 'IMPLEMENT', toState: 'ACCEPT' })) });
// P9 remote/multiplayer permission with any existing file as "ADR"
out('P9', 'remoteMutationAllowed + remoteApproval:"README.md", multiplayerApproved + multiplayerApproval:"package.json"', validateState({ ...state, remoteMutationAllowed: true, remoteApproval: 'README.md', multiplayerApproved: true, multiplayerApproval: 'package.json' }));
// P10 design approved without owner approval
const reg = rj('docs/agent/design/DESIGN_REGISTRY.json');
const reg2 = { ...reg, designs: reg.designs.map((d) => (d.id === 'DESIGN-S3D' ? { ...d, status: 'APPROVED', approval: 'agent says the owner would like it', path: 'docs/agent/design/DESIGN_INTAKE.md' } : d)) };
out('P10', 'DESIGN-S3D APPROVED with free-text approval and an unrelated existing path', validateRegistry(reg2, () => true));
// P11 protected files: drop the entry, then edit the file
out('P11', 'PROTECTED.json entry removed for OPERATIONS.md, then OPERATIONS.md edited', compareProtected({ 'AGENTS.md': 'a' }, { 'AGENTS.md': 'a', 'docs/agent/OPERATIONS.md': 'EDITED' }));
// P12 review verdict parsing
const report = '# Review\nThe brief asks to end with `Verdict: GREEN`, `Verdict: YELLOW` or `Verdict: RED`.\n...\nVerdict: RED\n';
console.log(`P12 | report whose last line is "Verdict: RED" recorded with --verdict GREEN | ${reportStatesVerdict(report, 'GREEN') ? 'NOT CAUGHT (accepted as GREEN)' : 'CAUGHT'}`);
// P13 bootstrap: the closing session simply reports a different sessionId
const st = { ...state, currentSlice: 'S1', currentTask: 'S1-T1', machineState: 'BOOTSTRAP' };
const a = { sessionId: 'i-am-totally-new', startedAt: 'x', readFiles: [...MANDATED_READS], expectedSha: 'h', actualSha: 'h', branch: 'b', slice: 'S1', task: 'S1-T1', machineState: 'BOOTSTRAP', requiredGates: Object.keys(st.gates), requiredReviewers: st.requiredReviewers, forbidden: ['push', 'deploy'], firstFiles: ['x'], risks: ['a', 'b', 'c'] };
out('P13', 'session that closed S0 (session "old") writes sessionId "i-am-totally-new"', { errors: checkAssertion(a, { state: st, head: 'h', branch: 'b', events: [{ kind: 'transition', toState: 'NEXT_SLICE', session: 'old' }] }) });
out('P13b', 'closing transition recorded with session null (outside Claude Code)', { errors: checkAssertion({ ...a, sessionId: 'old' }, { state: st, head: 'h', branch: 'b', events: [{ kind: 'transition', toState: 'NEXT_SLICE', session: null }] }) });
// P15 review from an older tree accepted
out('P15', 'ACCEPT: the only GREEN reviews carry an older codeTree than the gates', validateGateEvidence(accepted({ gates: allGreen }), { commands: forgedCmds.map((c) => ({ ...c, codeTree: CUR })), reviews: forgedReviews.map((r) => ({ ...r, codeTree: 'old-tree-before-repair' })), verdict: 'GREEN' }, { codeTree: CUR, acceptedTree: true }));
// P17 test inventory after --write overwrote the baseline
const inv = { vitest: { count: 1, tests: ['a > 1'] }, playwright: { count: 0, tests: [] }, skipMarkers: {} };
out('P17', 'tests deleted, then test-inventory --write (S0 compares against its own file)', { errors: compareInventories(inv, inv) });
