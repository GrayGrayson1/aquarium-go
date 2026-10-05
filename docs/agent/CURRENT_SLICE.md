# CURRENT SLICE — S0

**Slice:** S0 — Autonomous Harness, Baseline and Architecture Lock\
**Status:** IN PROGRESS: repair round after RED reviews (see HANDOFF.md, next steps)\
**Machine state:** IMPLEMENT (see `STATE.json` for the live value)

## Objective
Install and prove the durable orchestration system before product feature work (master §9 S0).

## In scope
The harness documents, scripts and evidence; the baseline; the requirements registry; the gate configuration that
makes the objective gates trustworthy; and the contained game fixes the owner approved in ADR-0002 decision 2.

## Out of scope
Product features (S1-S4), multiplayer, any remote action, version bumps.

## Governing requirements
HARNESS-001, HARNESS-002, HARNESS-003, HARNESS-004, HARNESS-005, HARNESS-006, HARNESS-008, REL-001, PERSIST-002,
PERSIST-003; the S0 game fixes PERSIST-009, PERSIST-010, PERSIST-011, PERSIST-012, PERSIST-013, MKT-016 and CONST-004;
GEN-013 (rarity report). PERSIST-001 is superseded (ADR-0005 decision 1).

## Governing decisions
ADR-0001 (owner operating decisions), ADR-0002 (owner decisions from the harness review), ADR-0003 (harness revision
and design reconciliation), ADR-0004, ADR-0005, ADR-0006 (owner answers), ADR-0007 and ADR-0009 (pushes of
`agent/s0-wip` and subagents).

## Governing design sections
None for product work. Design §2-§3 and §20-§22 for the reconciliation (ADR-0003).

## Expected files/modules
`docs/agent/**`, `AGENTS.md`, `CLAUDE.md`, `scripts/agent/**`, `.gitignore`, `tsconfig.json`, `vitest.config.ts`,
`playwright.config.ts`, `README.md` (e2e note), and the files of each approved game fix (listed in `BACKLOG.md`).

## Internal task order

| Task | What | Requirements | Status |
|---|---|---|---|
| S0-T1 | Verify Git state and the baseline SHA without discarding anything | HARNESS-001 | DONE (`evidence/S0/logs/baseline-git-state.log`) |
| S0-T2 | Run and record the baseline test matrix | HARNESS-001 | DONE except e2e: not run, environment (`evidence/S0/baseline-failures.json` BF-001, needs owner acknowledgement) |
| S0-T3 | Create the integration branch and commit the owner's harness unchanged | HARNESS-001, REL-001 | DONE (`94de6bb`) |
| S0-T4 | Harness scripts: state, ledger, evidence, gates, audits, test inventory, protected files, bootstrap check, context pack, handoff, relaunch | HARNESS-001, HARNESS-002, HARNESS-004, HARNESS-005 | REPAIRING: scripts repaired after RED reviews, `agent.test.mjs` not yet updated (HANDOFF step 2) |
| S0-T5 | Reconcile the design with the master and the code; design registry and intake | HARNESS-003 | DONE, pending independent review (ADR-0003, `design/DESIGN_REGISTRY.json`) |
| S0-T6 | Decompose master §9 and the design into the requirements registry | HARNESS-001 | IN PROGRESS |
| S0-T7 | Repair the harness documents found inconsistent by the adversarial review | HARNESS-001, HARNESS-004 | DONE, pending independent review |
| S0-T8 | Contained game fixes from the review (owner decision 2) and the backlog for the rest | PERSIST-004 | Fixes DONE (`f999618`, `58ae313`, `d98731d`, `d8fb896`), pending independent review; BACKLOG.md not written (HANDOFF step 4) |
| S0-T9 | Gate configuration: e2e server reuse opt-in, e2e typecheck, required assertions, no focused tests | HARNESS-006 | DONE, pending independent review |
| S0-T10 | Independent review of the S0 diff (code-architecture, security-data) | all S0 | PENDING |
| S0-T11 | Fresh-session bootstrap test: a new session's assertion passes `bootstrap-check.mjs` | HARNESS-001, HARNESS-002 | PENDING (needs a new session) |
| S0-T12 | Owner review of the harness and the open owner questions, then S0 acceptance and checkpoint | all S0 | PENDING |
| S0-T13 | Rarity counting tool `npm run report:rarity` (ADR-0005 decision 4) | GEN-013 | DONE (`172b5c3`), pending independent review |

## Acceptance criteria
- `node scripts/agent/check-state.mjs` exits 0, and `node --test 'scripts/agent/*.test.mjs'` passes.
- `node scripts/agent/verify-slice.mjs` records GREEN for typecheck, unit, build, diffCheck, harnessTests,
  requirementsAudit, testInventory and protectedFiles on the final S0 code tree.
- e2e: GREEN on the S0 code tree, or BF-001 acknowledged by the owner in an ADR with the agreed way to run it.
- `REQUIREMENTS.json` maps every master §9 bullet and every normative design subsection, §19 test-id area and §20
  test to at least one requirement, confirmed by an independent requirements reviewer.
- A fresh session's bootstrap assertion passes `bootstrap-check.mjs` (S0-T11).
- GREEN code-architecture and security-data reviews of the S0 diff, recorded with `capture-evidence.mjs --review`.
- Every owner question in `HANDOFF.md` is answered and recorded in an ADR, or explicitly deferred by the owner.

## Required tests
`scripts/agent/agent.test.mjs`; `npm run typecheck`; `npm test`; `npm run build`; `npm run e2e` (see BF-001).

## Required reviewers
code-architecture, security-data (S0 changes the harness guards, permissions and the relaunch model).

## Known risks
- The e2e and browser gates can't run inside Claude Code's sandboxed shell (BF-001).
- S0 builds the tools that judge it: their own tests and an independent review are the check (master §41).
- The S3-D design is pending (DESIGN-S3D); S3 will stop at an owner gate without it.

## Forbidden actions
No push, PR, deploy, remote mutation, multiplayer implementation, product feature work, version bump, or edits to
protected files without the ADR process (`OPERATIONS.md` §10).

## Completion evidence
`docs/agent/evidence/S0/manifest.json`, `evidence/S0/logs/`, `evidence/S0/reviews/`,
`evidence/S0/test-inventory.json`, `evidence/S0/acceptance-report.md`, the checkpoint commit and tag
`checkpoint/S0-harness`.
