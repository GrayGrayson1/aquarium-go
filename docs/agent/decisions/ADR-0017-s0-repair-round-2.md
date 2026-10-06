# ADR-0017 — S0 repair round 2: symlink-safe harness scripts, the registry repair, and docs that match the scripts

**Status:** Accepted\
**Date:** 2026-10-06\
**Slice:** S0\
**Requirements:** HARNESS-001, HARNESS-002, HARNESS-003, HARNESS-004, HARNESS-005, HARNESS-006, HARNESS-009,
HARNESS-010, HARNESS-011, HARNESS-012, HARNESS-013, HARNESS-014, HARNESS-016, HARNESS-017, HARNESS-018, HARNESS-019,
HARNESS-021, HARNESS-022, HARNESS-023, HARNESS-024, HARNESS-025, HARNESS-026, HARNESS-027, HARNESS-028, HARNESS-029,
PERSIST-003, PERSIST-007, PERSIST-009, PERSIST-011, PERSIST-014, PERSIST-015, CONST-001, CONST-004, CONST-005,
MKT-016, GEN-003, GEN-004, GEN-005, GEN-006, NAV-006, NAV-017, AUTO-015, REL-001, REL-011, REL-018

## Context

The owner ran `verify-slice.mjs` in Terminal on the Mac on 2026-10-06, 10:15-11:39Z, at HEAD `b94938f` on code tree
`3e9ce488`. Its nine gate records are in `evidence/S0/manifest.json`, and the ledger's evidence event of 18:36Z
describes them.
- **GREEN:** typecheck, unit (163 files, 1,809 tests, no "Errors" line), build, diffCheck, requirementsAudit,
  testInventory and protectedFiles. The harness gates really ran: each log ends with its script's verdict.
- **RED, e2e:** 44 of 47 tests passed, and 3 failed on the 120 s test timeout (`logs/e2e-20261006T105750274Z.log`):
  - `boot.spec.ts:5` (first launch): its `page.goto` timed out at a cold Vite start, the case `OPERATIONS.md` §8 and
    BACKLOG B-003 describe;
  - `boot.spec.ts:17` (no console-error storm) and `camera-freeze.spec.ts:34` (High quality): tearing down the browser
    context timed out.
- **RED, harnessTests:** 43 of 145 tests failed, all in `fixture.test.mjs`, tests 103-145
  (`logs/harnessTests-20261006T113735946Z.log`). The first failed while building the fixture stages ("nothing to
  commit"); the other 42 hit `EEXIST` on the half-built stage directory. The same 145 tests had passed on Linux: in
  the cloud workspace, as ADR-0015's Verification reports, and in the Cowork sandbox on code tree `3e9ce488`.

The harness failure is a new defect, **D-S0-15** (Decision 1). Two defects were still open in `HANDOFF.md`:
- **D-S0-3, the registry** (attempt 1: `e79aeba`): `requirements-3`'s findings (R3-B1, R3-M1, R3-m1 to R3-m7), the
  wording the round-1 repairs need, `baseline-failures.json` and `BACKLOG.md`;
- **D-S0-5, the docs:** since ADR-0015 and ADR-0013 decision 3, the owner-only docs describe some of what the scripts
  enforce wrongly. ADR-0015's Consequences call for a docs ADR with the owner's approval that names each owner-only
  file.

Three builder subagents (ADR-0016 decision 1) repaired them in the agent's cloud workspace. Their work is three
commits on top of `70917e3`: `21742d3` (D-S0-15), `6679bda` (D-S0-3) and `2fe37c7` (D-S0-5). A fourth, `d13beb5`,
adds HARNESS-006's criterion for D-S0-15.

These changes reach protected files:
- `scripts/agent/**` defines the gates (master §3.8) and is protected;
- D-S0-5 changes five owner-only files and three other protected files.

Under ADR-0013 decision 3, every `protect.mjs --update` needs the owner's words in the approving ADR, and the ADR must
name each owner-only file it lets change. This ADR is that record for the whole round. The registry,
`baseline-failures.json`, `BACKLOG.md` and `CURRENT_SLICE.md` aren't protected; they are here so the owner sees the
whole round.

## Decision

### 1. Harness: `scripts/agent/**` (commit `21742d3`), D-S0-15

- **Cause.** Each guarded harness CLI ran its main block only when
  `import.meta.url === pathToFileURL(process.argv[1] ?? '').href`. Node gives the main module's `import.meta.url` its
  real path (symlinks resolved) but keeps `process.argv[1]` as given. Started through a symlinked path, the two
  differ, and the script exited 0 without doing anything.
  - On macOS, `os.tmpdir()` is under `/var`, a symlink to `/private/var`. In the fixture repositories there,
    `record-event.mjs` and `protect.mjs` did nothing, so the stage build found nothing to commit.
  - The same hole would let a gate pass without running whenever the repository is reached through a symlinked path,
    on any machine. The Mac run's GREEN harness gates did run (their logs show each script's verdict); only the
    fixture repositories under `os.tmpdir()` were reached through a symlink.
- **Fix.** `lib.mjs` gains `isMainModule(moduleUrl, argv1 = process.argv[1])`, which compares both paths as real
  paths. It is false for a script that another script imports, without an `argv[1]` (`node -e`, the REPL) and when a
  path doesn't resolve. The twelve guarded CLIs use it: `bootstrap-check`, `capture-evidence`, `check-state`,
  `context-pack`, `handoff`, `next-slice`, `protect`, `record-event`, `relaunch`, `requirements-audit`,
  `test-inventory` and `verify-slice`. `diff-check.mjs` has no guard: it always runs, and no script imports it.
- **Tests.** Four new tests, cited by HARNESS-006 A7 (Decision 2):
  - `agent.test.mjs`: `isMainModule` on the script itself and through a symlink either way, but not on another file,
    a missing path or no `argv[1]`; and a script started through a symlinked directory runs its main block, while an
    imported one, or one without an `argv[1]`, doesn't;
  - `fixture.test.mjs`: reached through a symlink, `record-event`, `protect`, `check-state` and `requirements-audit`
    run, and fail where the repository is broken; and every harness CLI runs its main block there.
- **Diagnostics.** `fixture.test.mjs` remembers a failed stage build, so every test that needs the stages shows the
  original error instead of `EEXIST`.
- **Files:** `scripts/agent/lib.mjs`, the twelve CLIs, `scripts/agent/agent.test.mjs` and
  `scripts/agent/fixture.test.mjs`. No gate command, guard or test expectation is loosened.

### 2. Registry: D-S0-3 (commit `6679bda`) and HARNESS-006 A7 (commit `d13beb5`)

- **`REQUIREMENTS.json`:** 208 → 210 entries. No id is removed, no status changes, and 41 entries change.
  - New: CONST-005 (S1 writes CONST-001's dependency test) and PERSIST-015 (B-001: `loadAndResume` runs the catch-up
    on a copy; `core-resume-catchup.test.ts`).
  - `requirements-3` R3-B1: S0's criteria are checked on the candidate before ACCEPT. The post-ACCEPT checks of
    HARNESS-013 A3 and HARNESS-016 A2 move to the standing HARNESS-024 (A5, A6).
  - R3-M1: REL-011 A2 records the limitations in S4's own evidence before ACCEPT, and REL-018 A3 links them. R3-m1 to
    R3-m7 are addressed in the entries they name.
  - The round-1 repairs: PERSIST-011 (unusable ids dropped, well-formed unknown ids kept), PERSIST-003 A5 (newer
    content under the same schema) and A6 (a new species or tank size raises `SCHEMA_VERSION`, ADR-0016 decision 2,
    tested by PERSIST-014 A5), PERSIST-009 A4-A5, CONST-004, MKT-016 A2 (ADR-0016 decision 3), HARNESS-006 A3 and A5
    (the unit gate is judged on the owner's Mac, ADR-0013 decision 2), HARNESS-028 (`tests/sim/setup/`,
    `tsconfig*.json`, `.gitignore`) and HARNESS-021 A2.
  - The harness criteria cite the real `agent.test.mjs` and `fixture.test.mjs` test titles.
- **HARNESS-006 A7 (D-S0-15):** every harness CLI in `scripts/agent` runs its main block when it is reached through a
  symlinked path, so no gate can pass without running. It quotes the four new tests' titles exactly. Nothing else in
  the registry changes in `d13beb5`.
- **`evidence/S0/baseline-failures.json`:**
  - BF-002 is mitigated, not fixed, acknowledged by ADR-0013 decision 2, with the 68 s recurrence;
  - BF-003 is acknowledged by ADR-0013 decision 2;
  - all three entries record the owner's Mac run;
  - BF-001 stays open: its three Mac timeouts aren't classified yet (Decision 6).
- **`BACKLOG.md`:**
  - B-001, B-005 and B-118 fixed; B-113 partly fixed;
  - B-006 to B-017 added for the deferred step-8 findings and ADR-0015's open risks; security-data-2 I1 and I4 added
    to B-004 and B-190;
  - the stale "ADR-0008 (proposed)" marks corrected; the counts and the S0 game-fixes table updated.
- **`CURRENT_SLICE.md`** names PERSIST-015 in its scope and in task S0-T8.

### 3. Docs: owner-only and other protected docs (commit `2fe37c7`), D-S0-5

The docs now describe what the scripts have enforced since ADR-0015 and ADR-0013 decision 3. Where a rule is only
written, the text says so. File by file:

**`docs/agent/OPERATIONS.md`** (owner-only):
- §1: the launcher's real stops (a dirty tree added) and its alarms (a push, a guard change, a deploy-config change, a
  rewritten ledger, an unattended session that records an owner decision or leaves a stop state); `docs/agent/STOP`
  is ignored by Git; typos are refused, and the lock is an exclusive create; the builder pack's contents, and the
  reviewer pack (`--for reviewer`).
- §2: protected-file changes join the owner's list; the approval goes in the ADR's "## Owner approval" section, with
  ADR-0016 as the pattern; a new bullet, "What the scripts check" (`lib.mjs` `ownerApprovalProblems`), which also says
  what stays a written rule; owner-gate steps 2 and 3 as `record-event.mjs` enforces them (`--reason`, `--resume`, a
  new ADR to leave).
- §3: `render.yaml` sets `autoDeploy: true`, so a push to `main` may deploy Render too.
- §4: the REPAIR row names its five source states; recording `ACCEPT → CHECKPOINT` sets `lastAcceptedCheckpoint`;
  stop-state exits need a new ADR; the slice changes only at `NEXT_SLICE → BOOTSTRAP`.
- §5: `record-event.mjs` keeps the repair counters in step with the ledger; `--distinct` records the reviewer's
  judgement; a repair override names its defect; `--resolved` needs an evidence file.
- §6: the `protectedFiles` cell; reviews recorded with `--candidate`; at acceptance, every required role's and every
  report series' latest review GREEN on the tree; step 6 as `record-event.mjs` checks the checkpoint;
  `test-inventory.mjs --write` before `next-slice.mjs`; what `next-slice.mjs` resets; a new "Gate waivers" paragraph.
- §7: report series; `--candidate`, which the script doesn't require; check-state requires both mandatory reviewers;
  session ids can be set by any command.
- §8: the Cowork sandbox's git settings and stale-lock handling; agents don't use `gh`.
- §10: the full pattern list; new matching files fail instead of warning; a hand-edited `PROTECTED.json` or an
  `approvedBy` that isn't the owner's approval fails; the owner-only list; every update needs the owner's approval,
  naming each owner-only file; what `--update` refuses; an edited ADR fails.
- §11: keyed RNG streams (`mulberry32(hashString(key))`).

**`AGENTS.md`** (owner-only):
- a push to `main` may also deploy Render (`autoDeploy: true`);
- the determinism bullet points to `OPERATIONS.md` §11, adds keyed streams, and names the callers of the three write
  paths as the code has them (B-113);
- protected files change only through an ADR that records the owner's words and names each owner-only file, followed
  by `protect.mjs --update`.

**`docs/agent/AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md`** (owner-only):
- §3.1: Render may also deploy on a push to `main`;
- §3.8: the gate-defining files add `tests/sim/setup/` and `.gitignore` (and say "every" `tsconfig*.json`); all of
  them, the whole of `package.json` included, are protected and change with the owner's approval in the ADR;
- §54: the owner-only list follows `OWNER_ONLY` (adding `package.json`, `.github/**` and `render.yaml`); accepted ADRs
  are never edited; the full failure conditions; every update needs the owner's words, naming each owner-only file.

**`docs/agent/README_FIRST.md`** (owner-only):
- the reading load: "roughly 70 KB" becomes "several hundred KB" with a dated measurement, about 430 KB on 2026-10-06
  on this tree (after the registry repair and with ADR-0014), or about 650 KB with the whole `REQUIREMENTS.json`. The
  handoff's estimate of about 132 KB left out the ADRs, the requirements and the design sections;
- builders get `context-pack.mjs`, and reviewers `context-pack.mjs --for reviewer` (without the handoff);
- Render may also deploy on a push to `main`.

**`docs/agent/prompts/ROLE_PROMPTS.md`** (owner-only): report-series naming; `--candidate <commit>`; at acceptance
every series' latest report must be GREEN on the tree; a design-intake verdict goes to the ledger.

**`docs/agent/design/DESIGN_INTAKE.md`:**
- the approval is recorded in an ADR's "## Owner approval" section (pattern ADR-0016);
- step 4: each intake review writes `evidence/<slice>/reviews/design-intake-<n>.md` and is recorded with a ledger
  `review` event, not in the slice manifest;
- step 5: the approval ADR names the design id, is committed and indexed, and is cited first in `approval`; then
  `protect.mjs --update`.

**`docs/agent/templates/ADR_TEMPLATE.md`:** the "## Owner approval" guidance keeps its two lines and adds when the
section is required, the expiry, what to name, and that template lines and a "Pending" start don't count.
`hasOwnerApproval` judges all 16 ADR files the same under the old and the new template.

**`docs/agent/templates/HANDOFF_TEMPLATE.md`:** an open owner question doesn't set `ownerGateRequired`;
`record-event.mjs` sets it on the move to `OWNER_GATE`.

**The owner-only files this ADR lets change,** each by its path, as `protect.mjs --update` requires:
- `AGENTS.md`
- `docs/agent/AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md`
- `docs/agent/OPERATIONS.md`
- `docs/agent/README_FIRST.md`
- `docs/agent/prompts/ROLE_PROMPTS.md`

Not changed: `CLAUDE.md`, `docs/agent/prompts/KICKOFF.md`, `docs/agent/prompts/MASTER_ORCHESTRATOR_PROMPT.md`,
`package.json`, `.github/**` and `render.yaml`.

**The other protected files changed:** `docs/agent/design/DESIGN_INTAKE.md`, `docs/agent/templates/ADR_TEMPLATE.md`
and `docs/agent/templates/HANDOFF_TEMPLATE.md`.

### 4. Protected-file update

Once this ADR is Accepted with the owner's words, committed and indexed, `protect.mjs --update --adr ADR-0017`
records the changed protected files. `node scripts/agent/protect.mjs` reports these 25:
- owner-only: `AGENTS.md`, `docs/agent/AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md`, `docs/agent/OPERATIONS.md`,
  `docs/agent/README_FIRST.md`, `docs/agent/prompts/ROLE_PROMPTS.md`;
- other docs: `docs/agent/design/DESIGN_INTAKE.md`, `docs/agent/templates/ADR_TEMPLATE.md`,
  `docs/agent/templates/HANDOFF_TEMPLATE.md`;
- decisions: `docs/agent/decisions/INDEX.md` and this ADR, `docs/agent/decisions/ADR-0017-s0-repair-round-2.md`
  (new);
- harness: `scripts/agent/agent.test.mjs`, `scripts/agent/bootstrap-check.mjs`, `scripts/agent/capture-evidence.mjs`,
  `scripts/agent/check-state.mjs`, `scripts/agent/context-pack.mjs`, `scripts/agent/fixture.test.mjs`,
  `scripts/agent/handoff.mjs`, `scripts/agent/lib.mjs`, `scripts/agent/next-slice.mjs`, `scripts/agent/protect.mjs`,
  `scripts/agent/record-event.mjs`, `scripts/agent/relaunch.mjs`, `scripts/agent/requirements-audit.mjs`,
  `scripts/agent/test-inventory.mjs`, `scripts/agent/verify-slice.mjs`.

### 5. When the written-rule changes apply

`OPERATIONS.md` §10 step 3 says process changes take effect at the next slice boundary, never retroactively for the
slice in progress. This ADR proposes:
- **At once: the corrections that only describe what the scripts already do.** The scripts have enforced them in S0
  since ADR-0015 and ADR-0013 decision 3: the approval checks, owner-gate and stop-state exits, the slice rule, the
  repair counters, the checkpoint anchor, gate waivers, report series, the protected-file rules and the launcher's
  stops and alarms. Applying them at once changes no rule; it corrects how the rules are described.
- **From now, in S0, with the owner's approval: the new written rules this ADR adds.** No script enforces them:
  1. agents don't use `gh` at all, not even to read (`OPERATIONS.md` §8);
  2. every review is recorded with `capture-evidence.mjs --review --candidate <the reviewed commit>` (§6 step 2, §7,
     `ROLE_PROMPTS.md`);
  3. a design-intake review writes `evidence/<slice>/reviews/design-intake-<n>.md` and is recorded with a ledger
     `review` event, not in the slice manifest (`DESIGN_INTAKE.md` step 4, `ROLE_PROMPTS.md`);
  4. a design-approval ADR names the design id in its "## Owner approval" section, though the script accepts the id
     anywhere in the ADR (`DESIGN_INTAKE.md` step 5);
  5. the closing session runs `test-inventory.mjs --write` before `next-slice.mjs` (§6); without it, the next slice's
     testInventory gate fails;
  6. the Cowork sandbox's git settings, and moving a stale `.git/HEAD.lock` aside (§8);
  7. changes to `tests/sim/setup/` and `.gitignore` need an independent reviewer's sign-off, like the other
     gate-defining files (master §3.8, `OPERATIONS.md` §10 step 1).
- This exception to §10 step 3 covers this ADR's changes only.
- The orchestrator already recorded `design-intake-1`, the DESIGN-S3D capture review, as rule 3 says: a ledger
  `review` event on 2026-10-06 at 19:29Z, while this ADR was a draft.

### 6. Not changed here

- **e2e.** BF-001's three timeouts are classified at the owner's next Mac run, on the new code tree. One re-run is
  allowed, recorded as its own run, never in place of the failure (`OPERATIONS.md` §6 and §8). A timeout that recurs
  becomes an owner gate (`BASELINE_RED:<test>`) or a defect: never a skip, a longer timeout or a retry. B-003's
  warm-up changes `playwright.config.ts`, a gate-defining file, and stays planned for S1.
- **Everything else:** the game code (`src/**`), the game's tests (`tests/sim/**`, `tests/e2e/**`), the gate
  configuration (`package.json`, `tsconfig*.json`, `vitest.config.ts`, `tests/sim/setup/`, `playwright.config.ts`),
  `.gitignore`, `.github/**`, `render.yaml`, the dependencies and the save format (`SCHEMA_VERSION`).

## Alternatives considered

- **D-S0-15, resolving the fixtures' temporary directory with `realpath`** (only `fixture.test.mjs` changes):
  rejected. The tests would pass on the Mac, but every CLI reached through a symlink would still exit 0 without
  running, so a gate could still pass without running.
- **D-S0-15, `--preserve-symlinks-main` (or `--preserve-symlinks`) on the command lines:** rejected. Every caller
  (the gate commands, the fixtures, the owner typing a command) would have to remember it, and it changes how Node
  resolves modules.
- **D-S0-15, comparing with `path.resolve(process.argv[1])`:** rejected; `resolve` doesn't follow symlinks, so the
  hole stays.
- **D-S0-15, splitting each CLI into a library and a thin entry script:** the same effect for a larger change to
  twelve gate-defining scripts; not for a repair round.
- **D-S0-5, waiting for the S1 boundary** (`OPERATIONS.md` §10 step 3): rejected. The owner-only docs would keep
  describing rules wrongly for the rest of S0 (the re-reviews, acceptance and the slice close), and reviewers judge
  against them. "The code wins" (README_FIRST) helps only a reader who already knows where the two differ.
- **D-S0-5 in its own ADR,** as ADR-0015 planned: rejected. The next Mac run needs every protected change recorded,
  and one ADR keeps it to one owner question and one `protect.mjs --update`.
- **Weakening a criterion, a test or a timeout, or adding retries, to get green:** forbidden (AGENTS.md,
  `OPERATIONS.md` §6).

## Consequences

- **Order.** The owner's words are recorded here, this ADR becomes Accepted and is committed with its
  `owner-decision` ledger event (`OPERATIONS.md` §2), and then `protect.mjs --update --adr ADR-0017` records the 25
  files of Decision 4. Until then `protect.mjs` and `check-state.mjs` fail on them, and so would the protectedFiles
  gate.
- **Gates.** `scripts/agent` is code, so the code tree changes from `3e9ce488` to `9beda1a3`. The registry and docs
  commits don't change it (`evidence.mjs` `NON_CODE_PATHS`). Every gate result on `3e9ce488` stops counting, and the
  owner re-runs every gate, in Terminal on the Mac:

  ```bash
  cd /Volumes/Dev/Projects/AquariumGo && PLAYWRIGHT_BROWSERS_PATH=/Volumes/Dev/Caches/playwright node scripts/agent/verify-slice.mjs
  ```

  - Its harnessTests run on macOS is the real check of D-S0-15 (149 tests).
  - The unit gate counts only from this run (ADR-0013 decision 2), so D-S0-4 is resolved by a GREEN unit run there.
- **Re-review.** Fresh reviewers then review that tree, each recorded with
  `capture-evidence.mjs --review --candidate <the reviewed commit>`:
  - `requirements-4`, including HARNESS-006 A7;
  - `code-architecture-game-3`;
  - `code-architecture-harness-3`, which signs off the scripts under ADR-0015 and this ADR, and the two template diffs
    (`OPERATIONS.md` §10 step 1);
  - `security-data-3`;
  - then `adversarial-2`.

  S0 is not accepted until all of them are GREEN and the owner's remaining questions are answered.
- **Defects.** D-S0-15 is resolved by a GREEN harnessTests run on the owner's Mac. D-S0-3 stays open until
  `requirements-4` is GREEN (`HANDOFF.md`). D-S0-5 is resolved by the update under this ADR.
- **Bookkeeping after acceptance.** The docs changes do what three backlog rows still list as open: B-007 (session ids
  in `OPERATIONS.md` §7), the `AGENTS.md` part of B-113 and B-118's `AGENTS.md` pointer to §11. Their rows are updated
  then.
- **Risk.** The new written rules (Decision 5) work only if agents follow them. Reviewers and the owner check them
  (`OPERATIONS.md` §7, "What the checks can't catch").

## Verification

In the agent's cloud workspace (Linux, Node 22, no `node_modules`, so no Vitest, Playwright or `tsc`):
- **D-S0-15, by its builder:**
  - `node --test 'scripts/agent/*.test.mjs'`: 149 of 149 passed.
  - With `TMPDIR` on a symlinked directory, the old code reproduced the Mac failure exactly (102 of 145 passed, the
    same first error), and the fix passed 149 of 149.
  - Mutations were killed: the old guard put back in `protect.mjs` failed 2 of the new tests, and an `isMainModule`
    that compares unresolved paths failed all 4.
  - `test-inventory.mjs` couldn't run there: it needs Vitest from `node_modules`.
- **By this ADR's builder, on `d13beb5` and on this ADR's commit:**
  - `node --test 'scripts/agent/*.test.mjs'`: exit 0, 149 of 149, and the same with `TMPDIR` on a symlinked
    directory.
  - `fixture.test.mjs` from `70917e3`, in an extracted copy, with `TMPDIR` on a symlinked directory: exit 1, 43 of 43
    failed, the first with "nothing to commit" and the other 42 with `EEXIST`, as on the Mac. With a plain `TMPDIR`:
    exit 0, 43 of 43 passed.
  - `node scripts/agent/requirements-audit.mjs`: exit 0. `REQUIREMENTS.json` parses and keeps its formatting;
    `d13beb5` changes only HARNESS-006's acceptance list, and its four quoted titles match the test files.
  - `2fe37c7` compared file by file with the D-S0-5 builder's draft, which checked each statement against
    `scripts/agent/*.mjs` at `219e9a4` (the scripts have since changed only in the main-module guard). One statement
    of the draft is corrected here: master §3.8 already listed `tsconfig*.json`. Under the old and the new ADR
    template, `hasOwnerApproval` judges all 16 ADR files the same. README_FIRST's count reproduced: 355,845 bytes at
    `ad150a3`, 429,572 bytes on this tree.
  - `node scripts/agent/diff-check.mjs`: exit 0. `node scripts/agent/protect.mjs`: exit 1, listing exactly the 25
    files of Decision 4. `check-state.mjs`: exit 1 with only those 25 protected-file errors. Its warnings are
    expected: this branch isn't the integration branch, and seven gates passed on code tree `3e9ce488`, not
    `9beda1a3`.
  - In memory, `protect.mjs`'s `updateProblems` refuses this ADR as drafted for two reasons only (Proposed, and the
    "Pending" approval). A copy marked Accepted with stand-in approval text passes, so the ADR names every changed
    owner-only file.
- **Still needs the owner's Mac:** every gate on code tree `9beda1a3`. Typecheck, unit, build, e2e and testInventory
  can't run in the cloud workspace, and harnessTests on macOS is the check that matters for D-S0-15.
- **Review:** the fresh reviewers above.

## Owner impact

Yes. It changes protected and gate-defining files (`scripts/agent/**`) and five owner-only files: `AGENTS.md`,
`docs/agent/AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md`, `docs/agent/OPERATIONS.md`, `docs/agent/README_FIRST.md` and
`docs/agent/prompts/ROLE_PROMPTS.md`. It also changes three other protected files (`docs/agent/design/DESIGN_INTAKE.md`,
`docs/agent/templates/ADR_TEMPLATE.md` and `docs/agent/templates/HANDOFF_TEMPLATE.md`) and adds written rules that
apply in S0 (Decision 5). Under ADR-0013 decision 3, the update needs the owner's approval in this ADR, and the owner
runs every gate again on the Mac afterwards. It changes no game code, game test, gate configuration, deploy file,
dependency or save format, and it approves no push, PR, deploy or other remote action.

## Owner approval

Given 2026-10-06 by the owner in a top-level Cowork session (Claude desktop app; Claude Code session
`fba2c9be-b138-5280-9d88-73d0d368cce5`).

Question (verbatim): "ADR-0017 records repair round 2, so I can lock the rule files' new fingerprints under it. (1)
Your Mac run found that the harness scripts silently did nothing, and reported success, when started through a folder
shortcut; macOS keeps temp files behind one, so 43 self-tests failed. The fix makes each script check where it really
lives, with 4 new tests: 149/149 pass, and the old code fails exactly as your Mac did. (2) The requirements list gets
the reviewers' fixes (2 entries added, none removed). (3) Five of your owner-only rule files (AGENTS.md, the master,
OPERATIONS.md, README_FIRST.md, prompts/ROLE_PROMPTS.md) and three forms now describe what the scripts really enforce,
and a few new written rules apply from now in S0 (agents never use gh; every review names the commit it checked;
design reviews go in the ledger). Nothing is pushed; no game code, dependency or save format changes. Afterwards you'd
run the same Terminal command again on your Mac (about 1.5 hours), because the fix changes the scripts. Approve
ADR-0017 as written?"

Owner's answer (selected option): **"Approve as written (Recommended)"**, described as: "I record your words in
ADR-0017, apply the fixes to your local main and lock the new fingerprints under it, then give you the Terminal
command for the gate run. Nothing is pushed." The other option offered was "Not yet".

Scope: the changes this ADR lists in Decisions 1 to 3, the new written rules of Decision 5 (applying from now in S0),
and `node scripts/agent/protect.mjs --update --adr ADR-0017` for the 25 protected files of Decision 4, including the
owner-only files `AGENTS.md`, `docs/agent/AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md`, `docs/agent/OPERATIONS.md`,
`docs/agent/README_FIRST.md` and `docs/agent/prompts/ROLE_PROMPTS.md`. It approves no push, PR, deploy or other remote
action, and it doesn't approve S0's acceptance or any design.
