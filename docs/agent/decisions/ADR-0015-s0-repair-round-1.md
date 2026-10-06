# ADR-0015 — S0 repair round 1: harness guards, forward-safe saves, and corrections to ADR-0010 and ADR-0011

**Status:** Accepted\
**Date:** 2026-10-06\
**Slice:** S0\
**Requirements:** HARNESS-002, HARNESS-004, HARNESS-005, HARNESS-006, HARNESS-010, HARNESS-012, HARNESS-013,
HARNESS-017, HARNESS-019, HARNESS-021, HARNESS-023, HARNESS-024, HARNESS-025, HARNESS-026, HARNESS-027, HARNESS-028,
PERSIST-002, PERSIST-003, PERSIST-009, PERSIST-011, CONST-004, REL-001

## Context

All four step 8 reviews of `fd9ed14` (code tree `4d29120a`) came back RED: `requirements-3`,
`code-architecture-game-2`, `code-architecture-harness-2` and `security-data-2`.

The owner approved builder subagents for the repairs and decided two rules (ADR-0013):
- the unit gate counts only from the owner's Mac;
- every owner approval, `protect.mjs --update` included, needs the owner's verbatim words.

Two builder subagents repaired the findings in the agent's cloud workspace. Their work is two commits on top of
`7afa202`: `d7ca486` for the harness and `9e1bf66` for the game. These commits change protected files
(`scripts/agent/**`) and bring more gate-defining files under protection. Under ADR-0013 decision 3, that update needs
this ADR with the owner's words. No owner-only file changes.

## Decision

### 1. Harness: `scripts/agent/**` and `.gitignore` (commit `d7ca486`)

- **D-S0-7 (owner approvals).** These all need an Accepted, committed, indexed ADR with a real "## Owner approval"
  section: gate waivers, repair overrides, leaving `OWNER_GATE` or `BLOCKED_MANUAL_REVIEW`, owner-decision events,
  design approvals, remote and multiplayer approvals, and every `protect.mjs --update`.
  - A changed owner-only file must be named by path.
  - A repair override must name its defect, and a design approval its design.
  - A stop-state exit needs an ADR newer than the entry.
  - `OWNER_GATE` resumes only at the state it was entered from.
  - Only the 32 ledger lines committed at `7afa202`, pinned by their SHA-256, may cite the owner ADRs written before the
    convention (ADR-0001, -0002, -0004 and -0005).
- **D-S0-8 (anchor).** `actualBaselineSha` is write-once. `lastAcceptedCheckpoint` must be backed, at that commit, by
  three things: the ledger's `ACCEPT → CHECKPOINT` event, the slice's GREEN manifest, and its `checkpoint/*` tag.
- **D-S0-9 (slice).** The slice changes only at `NEXT_SLICE → BOOTSTRAP`, to the next slice.
- **D-S0-10 (reviews).** At acceptance, the latest review of every report series (`reviews/<role>-<n>.md`) must be GREEN
  on the accepted tree.
- **D-S0-11 (tests).** `fixture.test.mjs` runs the repository-level checks in temporary repositories. In the builder's
  runs, every guard mutation was killed.
- **D-S0-12 (typos).** Strict argument parsing refuses positional, single-dash, typographic-dash and empty-value forms.
  Typos can no longer start real `relaunch.mjs` runs.
- **D-S0-14 (protection).** `tests/sim/setup/`, every `tsconfig*.json` and `.gitignore` are now protected. The
  gate-configuration test pins Vitest's `setupFiles`, and `docs/agent/STOP` is ignored.
- **Smaller fixes:**
  - `requirements-audit.mjs` judges the prepared `NEXT_SLICE` state as check-state does.
  - STATE must list both mandatory reviewers and every required key.
  - Recording `ACCEPT → CHECKPOINT` sets `lastAcceptedCheckpoint` and the manifest's `checkpointSha`.
  - `bootstrap-check.mjs` checks that the files it lists exist and that `startedAt` is an ISO time.
  - Log counts include node:test summaries and Vitest's "Errors" line.
  - `test-inventory.mjs` scans the harness's own test files.
  - `record-event.mjs` keeps the repair counters in step, and `--resolved` needs an evidence file.
  - The launcher lock is an exclusive create.
  - Gate waivers are keyed by slice.
  - `capture-evidence.mjs --review --candidate <sha>` records the reviewed commit.
  - The launcher has smoke tests with a stub `claude`, and raises an alarm when an unattended session records an owner
    decision or leaves a stop state.
  - The `protect.mjs --update` ledger event lists the changed files.

### 2. Game: `src/**`, `tests/sim/**`, `docs/ARCHITECTURE.md` and `docs/LANES.md` (commit `9e1bf66`)

- **D-S0-13 (forward-safe saves).** `repairState` keeps well-formed records whose catalog id this build doesn't know
  (ADR-0005 decision 1).
  - It still drops non-string, empty and inherited-name ids, each with a repair note.
  - A sold aquarium's listing keeps its `tankId`.
  - New test: `core-forward-compat.test.ts`.
- **D-S0-6.** The `core-fastmutate-atomic` header and `fastMutate.ts` now name PERSIST-009.
- **PERSIST-009 residuals.** A `publish()` that throws drops the working copy, and nested `mutateFast` calls are refused.
- **Legacy v0.** Unusable tank ids are skipped.
- **B-001.** `loadAndResume` catches up on a copy, and keeps the decoded save when the catch-up throws. New test:
  `core-resume-catchup.test.ts`.
- **Test strength.**
  - An unknown top-level `src` directory fails the architecture lock.
  - The fuzz test fails on refused loads and on caught simulation errors.
  - The determinism guard's comment stripper keeps regex and nested template literals intact (B-005).
- **Docs.** `docs/ARCHITECTURE.md` and `docs/LANES.md` state the determinism contract, the three write paths and the
  keyed RNG streams (B-118, part of B-113).
- **Unchanged:** the save format (`SCHEMA_VERSION`), the dependencies and the gate-configuration files.

### 3. Protected-file update

Once this ADR is committed, `protect.mjs --update --adr ADR-0015` records:
- the changed harness scripts;
- the new `scripts/agent/fixture.test.mjs`;
- the newly protected `.gitignore` and `tests/sim/setup/yield-between-tests.ts`.

### 4. Corrections (accepted ADRs are never edited)

- **ADR-0010.** Its Verification says "The full npm test exits 0 on this tree, recorded by verify-slice.mjs". No record
  backs that.
  - The only unit run on that tree (`logs/unit-20261005T234539917Z.log`) exited 1, with BF-003 and BF-002's error from
    a single 68 s test.
  - BF-002 is mitigated, not fixed (ADR-0013 decision 2).
  - `code-architecture-game-2` signed off ADR-0010's diff itself.
- **ADR-0011.** It says "Each guard was reverted once in a scratch copy and a test failed every time". That held only
  for the pure functions: `code-architecture-harness-2` F5 found that 26 of 74 guard mutations survived.
  - In this round, the builder's runs killed 97 of 97 mutations, plus 24 of 24 for the approval and protect changes.
  - A fresh code-architecture-harness review of this tree is now the sign-off for the scripts; ADR-0011 was not signed
    off.

## Alternatives considered

- **Weakening a guard or a test to get green:** forbidden (AGENTS.md).
- **Deleting unknown catalog records, as S0 first did:** rejected, because it breaks ADR-0005 decision 1.
- **For nested `mutateFast`, returning early or keeping a copy per call:** rejected.
  - Returning early would let `runTick` count unpublished hours as done.
  - A copy per call would publish the half-done writes of a failed inner recipe.

## Consequences

- **Gates.** The code tree changed, so every gate must run again on the new tree. The unit and e2e gates count only from
  the owner's Mac (ADR-0013 decision 2), and the owner runs all the gates there.
- **Re-review.** Fresh reviewer instances review this tree: requirements, code-architecture (game part),
  code-architecture-harness (it signs off the scripts) and security-data. Adversarial goes last.
- **Owner-only docs now describe some script behaviour wrongly.**
  - The affected files: `OPERATIONS.md` (§1, §2, §4, §5, §6, §7 and §10), `AGENTS.md`'s protected-files line, master §3.8
    and §54, and `README_FIRST.md`.
  - Also out of date, though not owner-only: `ROLE_PROMPTS.md`, `DESIGN_INTAKE.md` step 5 and the ADR template.
  - A docs ADR with the owner's approval, naming each owner-only file, corrects them. Until then the code wins for what
    exists now (README_FIRST).
- **The registry needs updating** for:
  - `requirements-3` R3-B1 and R3-M1;
  - PERSIST-011's "must exist in the catalog";
  - HARNESS-006's Mac-only unit gate;
  - the new tests.
- **Gaps left open, for the owner or a later slice:**
  - **MKT-016.** The 3× case's bound isn't guaranteed for every seed. Fixing it needs a decision on whether catch-up time
    uses up real-time windows.
  - **PERSIST-003.** Newer content under the same schema is still lost for unknown species, unknown tank tiers and an
    unknown active research project. This dates from v0.4.0.
  - **B-113.** `AGENTS.md`, `src/state/game.ts` and `src/sim/rng.ts` still word the mutation and RNG rules too narrowly.
  - **Approvals.**
    - A real owner ADR can still be cited for a gate waiver it doesn't mean.
    - Requirement DEFERRED/SUPERSEDED decisions and `test-changes.json` entries still accept any committed ADR.
    - check-state doesn't re-check the "names each owner-only file" rule after the fact.

## Verification

- **Harness.** `node --test 'scripts/agent/*.test.mjs'` passed 145 of 145 on the repaired tree. Before the update,
  `check-state.mjs` reported only the protected-file errors this ADR's update clears.
- **Game.** Vitest can't run in the cloud workspace or in the Cowork sandbox.
  - The builder ran the changed test files through a Vitest stand-in under `tsx`: 176 tests, 0 failures.
  - The builder also showed that the new tests fail on the old code.
  - These aren't gate results. The owner's Mac run of every gate is the check.
- **Review.** Independent re-review as above.

## Owner impact

Yes. It changes protected and gate-defining files: `scripts/agent/**`, plus new protection for `.gitignore` and
`tests/sim/setup/`. Under ADR-0013 decision 3 that needs the owner's approval. It changes no owner-only file.

## Owner approval

Given 2026-10-06 by the owner in this top-level Cowork session.

Question (verbatim): "ADR-0015 records this repair round, so I can save it to your main and lock the rule files' new
fingerprints under it. Harness: approvals now need your exact words, the history and slice can't be quietly edited,
every guard now has a test that catches its removal, typos can't start real unattended runs, and the Vitest setup file,
tsconfig files and .gitignore are protected. Game: saves keep items a newer version added instead of deleting them, a
crash during the offline catch-up no longer keeps a half-done result, nested game-loop updates are refused, and the
guard tests are stronger. It also corrects two earlier claims (ADR-0010 "npm test passes", ADR-0011 "every guard
tested") and changes none of your owner-only files. Approve it as written?"

Owner's answer (selected option): **"Approve as written (Recommended)"**, described as: "I commit ADR-0015 with your
words, apply the repairs to your local main, and lock the new protected-file fingerprints under it. Nothing is pushed."

Scope: the changes in commits `d7ca486` and `9e1bf66` as this ADR lists them, and the `protect.mjs --update` made under
it. It approves no push, PR, deploy or other remote action.
