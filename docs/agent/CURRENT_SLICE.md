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
HARNESS-001, HARNESS-002, HARNESS-003, HARNESS-004, HARNESS-005, HARNESS-006; the master §9 S0 bullets HARNESS-009,
HARNESS-010, HARNESS-011, HARNESS-012, HARNESS-013, HARNESS-014, HARNESS-015, HARNESS-016, HARNESS-017, HARNESS-018,
HARNESS-019, HARNESS-020, HARNESS-021 and HARNESS-022; the standing rules HARNESS-008, HARNESS-023, HARNESS-024,
HARNESS-025, HARNESS-026, HARNESS-027, HARNESS-028, HARNESS-029, REL-001, REL-003, CONST-001, PERSIST-002 and
PERSIST-003 (implemented in S1 by PERSIST-014); the S0 game fixes PERSIST-009, PERSIST-010, PERSIST-011, PERSIST-012,
PERSIST-013, MKT-016 and CONST-004; GEN-013 (rarity report). PERSIST-001 is superseded (ADR-0005 decision 1), and
PERSIST-011 is the S0 part of PERSIST-004 (S4).

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
| S0-T1 | Verify Git state and the baseline SHA without discarding anything | HARNESS-017, HARNESS-019 | DONE (`evidence/S0/logs/baseline-git-state.log`) |
| S0-T2 | Run and record the baseline test matrix | HARNESS-018 | DONE except e2e: not run, environment (`evidence/S0/baseline-failures.json` BF-001, needs owner acknowledgement) |
| S0-T3 | Create the integration branch and commit the owner's harness unchanged | HARNESS-009, HARNESS-017, REL-001 | DONE (`94de6bb`) |
| S0-T4 | Harness scripts: state, ledger, evidence, gates, audits, test inventory, protected files, bootstrap check, context pack, handoff, relaunch | HARNESS-001, HARNESS-002, HARNESS-004, HARNESS-005, HARNESS-010, HARNESS-011, HARNESS-012, HARNESS-013, HARNESS-014, HARNESS-015, HARNESS-016, HARNESS-023, HARNESS-024, HARNESS-025, HARNESS-026, HARNESS-027, REL-001 | DONE: scripts repaired and 75 harness tests (`2926bf0`, ADR-0011), pending independent review |
| S0-T5 | Reconcile the design with the master and the code; design registry and intake | HARNESS-003, HARNESS-020, HARNESS-021 | DONE, pending independent review (ADR-0003, `design/DESIGN_REGISTRY.json`) |
| S0-T6 | Decompose master §9 and the design into the requirements registry | HARNESS-011 | DONE: draft merged into REQUIREMENTS.json (`5ae85a3`), pending a fresh requirements reviewer |
| S0-T7 | Repair the harness documents found inconsistent by the adversarial review | HARNESS-004, HARNESS-009, HARNESS-021 | DONE (`62df438`; corrections under owner-approved ADR-0008, `1a74863`), pending independent review |
| S0-T8 | Contained game fixes from the review (owner decision 2) and the backlog for the rest | HARNESS-022, PERSIST-002, PERSIST-003, PERSIST-009, PERSIST-010, PERSIST-011, PERSIST-012, PERSIST-013, MKT-016, CONST-004 | Fixes DONE (`3e00a32`, `58ae313`, `6347c5d` + `d98731d`, `16233a1`, `c774d38`, `f999618`, `d8fb896`; test repair `9edfa12`, D-S0-1), pending independent review; BACKLOG.md written (`1a74863`) |
| S0-T9 | Gate configuration: e2e server reuse opt-in, e2e typecheck, required assertions, no focused tests | HARNESS-006, HARNESS-018, HARNESS-028 | DONE, pending independent review |
| S0-T10 | Independent review of the S0 diff (code-architecture, security-data) | HARNESS-022, HARNESS-025, HARNESS-026, HARNESS-028; all S0 | PENDING |
| S0-T11 | Fresh-session bootstrap test: a new session's assertion passes `bootstrap-check.mjs` | HARNESS-001, HARNESS-002 | PENDING (needs a new session) |
| S0-T12 | Owner review of the harness and the open owner questions, then S0 acceptance and checkpoint | HARNESS-001, HARNESS-008, HARNESS-009, HARNESS-013, HARNESS-015, HARNESS-016, HARNESS-017, HARNESS-018, HARNESS-021, HARNESS-024, HARNESS-029, CONST-001, REL-001, REL-003; all S0 | PENDING |
| S0-T13 | Rarity counting tool `npm run report:rarity` (ADR-0005 decision 4) | HARNESS-022, GEN-013 | DONE (`172b5c3`), pending independent review |

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
code-architecture, security-data (S0 changes the harness guards, permissions and the relaunch model), adversarial
(every slice, ADR-0008), and a fresh requirements reviewer for the registry merge (HANDOFF step 5).

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
