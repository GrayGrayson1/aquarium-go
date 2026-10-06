# HANDOFF

_Written 2026-10-06 at the end of the Cowork session (Claude desktop app, Claude Code session
`9fb166e0-94f7-5c6b-881e-3278c698d633`). It synced the cloud session's work onto local `main`, bootstrapped (S0-T11),
ran step 8 round 1 (four RED reviews) and repair round 1 (ADR-0015). The owner asked for a fresh conversation to keep
the context small. Verify everything below against Git; don't trust it blindly._

<!-- generated:start -->
_Generated 2026-10-06T06:41:37.959Z by scripts/agent/handoff.mjs. Edit the sections below the block, not inside it._

## Checkpoint
- branch: main
- HEAD: b024608aa4f0a7b9dea0f7a51a003ca7c4550997 (S0: ledger: ADR-0015 owner decision and repair round 1; protected hashes under ADR-0015)
- baseline: 0d9fc5a46085f746510a1041335632cd4f7314a2
- last accepted checkpoint: none yet

## Current position
- slice: S0
- machine state: IMPLEMENT
- task: S0-T10
- repair attempt: 0 (D-S0-6)
- owner gate: none
- required reviewers: code-architecture, code-architecture-harness, security-data, adversarial, requirements

## Gates
- typecheck: GREEN (last run 2026-10-05T23:45:09.756Z, exit 0, docs/agent/evidence/S0/logs/typecheck-20261005T234509756Z.log)
- unit: RED (last run 2026-10-05T23:45:39.917Z, exit 1, docs/agent/evidence/S0/logs/unit-20261005T234539917Z.log)
- build: GREEN (last run 2026-10-05T23:49:13.464Z, exit 0, docs/agent/evidence/S0/logs/build-20261005T234913464Z.log)
- e2e: PENDING (last run 2026-10-05T18:48:18Z, exit 143, docs/agent/evidence/S0/logs/baseline-e2e.log)
- diffCheck: GREEN (last run 2026-10-06T06:39:36.336Z, exit 0, docs/agent/evidence/S0/logs/diffCheck-20261006T063936336Z.log)
- harnessTests: GREEN (last run 2026-10-06T06:39:53.457Z, exit 0, docs/agent/evidence/S0/logs/harnessTests-20261006T063953457Z.log)
- requirementsAudit: GREEN (last run 2026-10-06T06:39:40.722Z, exit 0, docs/agent/evidence/S0/logs/requirementsAudit-20261006T063940722Z.log)
- testInventory: GREEN (last run 2026-10-05T23:50:01.227Z, exit 0, docs/agent/evidence/S0/logs/testInventory-20261005T235001227Z.log)
- protectedFiles: GREEN (last run 2026-10-06T06:39:43.091Z, exit 0, docs/agent/evidence/S0/logs/protectedFiles-20261006T063943091Z.log)
- browserQa: NOT_APPLICABLE
- independentReview: PENDING

## Requirements for S0
- 28 IN_PROGRESS

## Dirty files
- `M docs/agent/CURRENT_SLICE.md`
- ` M docs/agent/LEDGER.jsonl`
- ` M docs/agent/STATE.json`
- ` M docs/agent/evidence/S0/manifest.json`
- `?? docs/agent/evidence/S0/logs/diffCheck-20261006T063936336Z.log`
- `?? docs/agent/evidence/S0/logs/harnessTests-20261006T063953457Z.log`
- `?? docs/agent/evidence/S0/logs/protectedFiles-20261006T063943091Z.log`
- `?? docs/agent/evidence/S0/logs/requirementsAudit-20261006T063940722Z.log`

## Designs not yet approved
- DESIGN-S3D [PENDING_OWNER_DESIGN]: Extended aquarium/aquaculture automation (S3-D): screens, copy, test ids and the names of resources shown to players
- DESIGN-S3C-LINES [PENDING_OWNER_DESIGN]: Multi-line Production screens (S3-C): several production lines per species, with their screens, copy, routes and test ids

## Last ledger events
- 2026-10-06T06:38:03.816Z orchestrator repair S0/S0-T10: repaired in d7ca486 (main 47eb199, ADR-0015); node --test 145/145 in the cloud workspace; awaits fresh code-architecture-harness and security-data reviews
- 2026-10-06T06:38:03.916Z orchestrator repair S0/S0-T10: repaired in d7ca486 (main 47eb199, ADR-0015); node --test 145/145 in the cloud workspace; awaits fresh code-architecture-harness and security-data reviews
- 2026-10-06T06:38:03.945Z orchestrator repair S0/S0-T10: repaired in d7ca486 (main 47eb199, ADR-0015); node --test 145/145 in the cloud workspace; awaits fresh code-architecture-harness and security-data reviews
- 2026-10-06T06:38:03.976Z orchestrator repair S0/S0-T10: repaired in d7ca486 (main 47eb199, ADR-0015); node --test 145/145 in the cloud workspace; awaits fresh code-architecture-harness and security-data reviews
- 2026-10-06T06:38:04.002Z orchestrator repair S0/S0-T10: repaired in d7ca486 (main 47eb199, ADR-0015); node --test 145/145 in the cloud workspace; awaits fresh code-architecture-harness and security-data reviews
- 2026-10-06T06:38:04.029Z orchestrator repair S0/S0-T10: repaired in 9e1bf66 (main 47eb199, ADR-0015); Vitest can't run here, so it awaits the owner's Mac gates and a fresh code-architecture review
- 2026-10-06T06:38:04.053Z orchestrator repair S0/S0-T10: repaired in d7ca486 (main 47eb199, ADR-0015); node --test 145/145 in the cloud workspace; awaits fresh code-architecture-harness and security-data reviews
- 2026-10-06T06:41:18.139Z orchestrator session-end S0/S0-T10: Cowork session ends at the owner's request for a fresh conversation (context). Done: sync to b243b23, bootstrap (S0-T11), round-1 reviews (4 RED, recorded), ADR-0012, ADR-0013, repair round 1 (ADR-0015, D-S0-6 to D-S0-14), harness gates GREEN on code tree 3e9ce488. Next: D-S0-3 registry, D-S0-5 owner-only docs ADR, the owner's Mac run of every gate (D-S0-4), fresh reviews then adversarial; ADR-0014 reserved for the DESIGN-S3D intake
<!-- generated:end -->

## Where S0 stands

- **Branch and pushes.** Local `main` is about 45 commits ahead of `origin/main`. `origin/main` is `0d9fc5a` (v0.4.0,
  the live site) and untouched. Nothing was pushed, and no push approval exists: ADR-0009's ended with the cloud session.
- **Step 8, round 1 (all RED, recorded unchanged):** `requirements-3`, `code-architecture-game-2`,
  `code-architecture-harness-2` (new role `code-architecture-harness`) and `security-data-2`. The adversarial review
  hasn't run; it goes last, after the fixes.
- **Repair round 1** (ADR-0015, owner-approved):
  - harness `d7ca486`: D-S0-7 to D-S0-12 and D-S0-14;
  - game `9e1bf66`: D-S0-6 and D-S0-13.

  Both are applied to `main` (`47eb199`). `protect.mjs --update --adr ADR-0015` is recorded, and repair attempts are
  logged.
- **The code tree is now `3e9ce488`.**
  - diffCheck, harnessTests (145/145), requirementsAudit and protectedFiles ran GREEN on it, in the Cowork sandbox.
  - typecheck, unit, build, e2e and testInventory have NOT run on it. Their GREEN/RED entries above are from tree
    `4d29120a`, so check-state warns. They need `node_modules`, so they run on the owner's Mac (step 4 below).
- **Owner decisions this session:**
  - ADR-0012: reviewer subagents, the bundle sync applied in place, and the owner runs the Mac gates;
  - ADR-0013: builder subagents, the unit gate counts only from the Mac (acknowledging BF-002 and BF-003), and
    approvals need the owner's verbatim words plus named owner-only files;
  - ADR-0015: repair round 1.

  The subagent approvals in ADR-0012 and ADR-0013 were for that session only. **Ask the owner again** before running
  builders or reviewers, and record the answer in an ADR.
- **ADR-0014 is reserved for the DESIGN-S3D intake.** The owner said the handoff folder
  `/Volumes/Dev/Projects/AquariumGo-design-handoff/DESIGN-S3D` is being refreshed. Until the owner says the refresh is
  done, don't copy it into the repo, accept its ADR-0014 or run `protect.mjs --update` for it. If it was copied before
  then, copy the refreshed folder over it before recording anything.
- **Uncommitted owner run.** If this session finds uncommitted `docs/agent/evidence/S0/logs/*`, `manifest.json` and
  `STATE.json` gate changes, they are the owner's Mac run of `verify-slice.mjs`. Check them, then commit them as that
  run.

## Open defects

- **D-S0-3, the registry** (attempt 1: `e79aeba`). It stays open until a requirements review is GREEN.
  `requirements-3` found:
  - R3-B1: HARNESS-013 A3 and HARNESS-016 A2 can be observed only after ACCEPT;
  - R3-M1: REL-011 A2 depends on the owner package;
  - R3-m1 to R3-m7.

  It also needs:
  - **Wording the repairs require:**
    - PERSIST-011: unusable ids are dropped, and well-formed unknown ids are kept (ADR-0005 decision 1);
    - PERSIST-003: a criterion for newer content under the same schema (`core-forward-compat.test.ts`);
    - PERSIST-009: a publish that throws, the refusal of nested calls, and the now-stale A3 note;
    - a requirement for B-001 (`core-resume-catchup.test.ts`);
    - CONST-004: the unknown-directory check and the stripper;
    - MKT-016 A2: at 3× the floor is about 2.5 minutes;
    - HARNESS-006 A3 and A5: the unit gate is judged on the Mac (ADR-0013);
    - HARNESS-028: add `tests/sim/setup/`, `tsconfig*.json` and `.gitignore`;
    - HARNESS-013 A1;
    - HARNESS-021 A2: add ADR-0012, ADR-0013 and ADR-0015;
    - the criteria the harness builder listed: HARNESS-004 A1/A2, -005 A2, -010, -012 A1, -019 A1/A3, -021 A1, -023 A2,
      -024 A1, -025 A1, -026 A1/A2, -027 A1 and -028 A1. Use the new test names in `scripts/agent/agent.test.mjs` and
      `scripts/agent/fixture.test.mjs`.
  - **`evidence/S0/baseline-failures.json`:**
    - BF-002 becomes "mitigated", with ADR-0013 as the owner's acknowledgement and the 68 s recurrence (unit log `:591`,
      `:1015-1032`);
    - BF-003 gets ADR-0013 as its acknowledgement, plus that run's onTaskUpdate error;
    - BF-001 stays open.
  - **`BACKLOG.md`:**
    - close B-001, B-005 and B-118;
    - B-113 is partly done: `AGENTS.md`, `src/state/game.ts` and `src/sim/rng.ts` remain;
    - add the deferred items listed below;
    - fix B-135's "ADR-0008 (proposed)".
- **D-S0-4, the unit gate.** The only unit run on S0 code failed (BF-003, plus BF-002's error from a 68 s test). It is
  resolved by a GREEN unit run on the owner's Mac, on the final tree, with no RPC error (ADR-0013 decision 2).
- **D-S0-5, owner-only docs now out of step with the scripts.**
  - **`OPERATIONS.md`:**
    - §1: typos refused, exclusive lock, new alarm, STOP ignored;
    - §2: an Owner approval section, a new ADR for stop-state exits, resume where entered;
    - §3: a push to `main` may also deploy Render (`autoDeploy: true`);
    - §4: `ACCEPT → CHECKPOINT` sets the checkpoint; the slice changes only at `NEXT_SLICE → BOOTSTRAP`;
    - §5: counters kept by record-event; `--resolved` needs evidence; overrides name the defect;
    - §6: no hand-set checkpoint; waivers keyed by slice; report series; the missing `test-inventory.mjs --write` step;
    - §7: adversarial in STATE, `--candidate`, session ids can be set from the environment;
    - §8: agents don't use `gh`;
    - §10: new files fail, not warn; the full pattern list; the owner's words for every `--update`, naming owner-only
      files.
  - **`AGENTS.md`:** its protected-files line, the Render wording, and B-113's mutation and RNG wording.
  - **The master:** §3.8 (the gate-defining list) and §54.
  - **`README_FIRST.md`:** items 1-11 come to about 132 KB; mention `context-pack --for reviewer`.
  - **Stale but not owner-only:** `ROLE_PROMPTS.md` (`--candidate`, `<role>-<n>.md` naming), `DESIGN_INTAKE.md` step 5,
    the ADR template's Owner approval guidance, and `HANDOFF_TEMPLATE.md` line 16.
  - It's resolved by one ADR with the owner's verbatim approval, naming each owner-only file, then `protect.mjs --update`.
    Do it before relying on OPERATIONS §6 or running `relaunch.mjs`. Until then, the code wins for what exists now.
- **D-S0-6 to D-S0-14** are repaired (ADR-0015) and waiting for fresh reviews. When the matching review is GREEN, resolve
  each with `record-event.mjs --kind repair --defect <id> --resolved --evidence <that review>`.

## Exact next legal action

1. **Bootstrap** (`prompts/KICKOFF.md`, then `bootstrap-check.mjs`). Also read ADR-0012, ADR-0013 and ADR-0015, and the
   four round-1 reports.
2. **Ask the owner** whether builder and reviewer subagents may run in this session, and record the answer in an ADR.
   Then a builder repairs D-S0-3 as listed.
3. **D-S0-5:** draft the owner-only docs ADR with the exact diffs. Use the next free number (ADR-0014 is reserved). Get
   the owner's verbatim approval, then run `protect.mjs --update`.
4. **D-S0-4 and every gate on code tree `3e9ce488`.** The owner runs, in Terminal on the Mac:
   `cd /Volumes/Dev/Projects/AquariumGo && PLAYWRIGHT_BROWSERS_PATH=/Volumes/Dev/Caches/playwright node scripts/agent/verify-slice.mjs`
   and then
   `node scripts/agent/capture-evidence.mjs --command "npm run report:rarity" --label report-rarity --req GEN-013`.
   - Registry and `docs/agent` edits don't change the code tree. Any further code fix does, and needs another run.
   - If e2e says the browser executable is missing:
     `PLAYWRIGHT_BROWSERS_PATH=/Volumes/Dev/Caches/playwright npx playwright install chromium`.
5. **Fresh reviewers** of the resulting tree, recorded with `capture-evidence.mjs --review --candidate <sha>`:
   - `requirements-4`;
   - `code-architecture-game-3`;
   - `code-architecture-harness-3`, which signs off the scripts under ADR-0015;
   - `security-data-3`;
   - then `adversarial-2`.
6. **Step 9, the owner's part:**
   - the DESIGN-S3D intake once the owner says the refresh is done, and DESIGN-S3C-LINES;
   - the owner questions below;
   - S0 acceptance, `checkpoint/S0-harness`, and the backup bundle (OPERATIONS §6).

## Owner questions

1. **Push guard (ADR-0011 open point 6).** Only a pre-push hook or a `pushurl` block actually prevents a push to `main`.
   The owner chose text rules only (ADR-0004). Revisit before any unattended run. Agents may not install it.
2. **MKT-016 (`code-architecture-game-2` m3).** Should offline catch-up time use up real-time bid windows? The 3× test
   passes on its seeds, but the bound isn't guaranteed.
3. **PERSIST-003, same-schema gaps dating from v0.4.0.** Today:
   - creatures, clutches and offers of an unknown species are deleted;
   - an unknown tank tier is reset to `g20L`;
   - the research step drops an unknown active project.

   Keep these inert, or require a schema bump for every new species or tier?
4. **BF-001:** a real e2e run on the Mac (step 4), or the owner's acknowledgement in an ADR.
5. **The 57 open questions** in `evidence/S0/reviews/adversarial-review-2026-10-05.json`: triage them, and ask only the
   important ones.
6. **Launcher residuals (`security-data-2` m7):** should unattended sessions run as a separate OS user with no GitHub or
   Render credentials?

## Deferred review items (to put in BACKLOG under D-S0-3)

- **code-architecture-harness-2:**
  - m10: `.gitattributes` isn't protected (none exists);
  - m5: session ids can be set from the environment (add to OPERATIONS §7's "can't catch" list).
- **security-data-2:**
  - I1: enum fields read through plain-object tables (B-004 / PERSIST-004, S4);
  - I4: `window.__AQ` in production (PLAT-005, S1);
  - I5: a home-directory path in the public adversarial JSON;
  - I6: newly added `retry` options aren't flagged.
- **code-architecture-game-2:** the info items (null-prototype tables, fake timers, large lists, `slowedFor`).
- **The harness builder's remaining risks:**
  - a real owner ADR can be cited for a gate waiver it doesn't mean;
  - requirement DEFERRED/SUPERSEDED decisions and `test-changes.json` entries accept any committed ADR;
  - check-state doesn't re-check the owner-only naming rule after the fact.

## Working in the Cowork sandbox (if the next session runs there too)

- **Its shell is Linux.** It has no GitHub or npm network, it can't delete files in `/Volumes/Dev`, and it can't run
  Vitest, Vite or Playwright with the Mac's `node_modules`.
- **For git there:**
  - set `GIT_OPTIONAL_LOCKS=0`, `core.createObject=rename`, `maintenance.auto=false` and `gc.auto=0`;
  - move aside any empty `.git/*.lock` it leaves (a rolled-back lock can't be unlinked there);
  - `.agent-runs/sync/` holds those leftovers.
- **The cloud workspace can't install npm packages either**, so builders and reviewers there can't run Vitest. The
  harness tests run fine.
- **To move commits:**
  - Mac → cloud: `git bundle` in `.agent-runs/sync/`, then stage the file.
  - Cloud → Mac: commit the bundle into `.agent-runs/sync/`, fetch it into a ref, then apply in place: write the changed
    files, `git update-ref`, then `git read-tree -m -i`. ADR-0012 decision 2 describes the method.

## Required first reads

`docs/agent/README_FIRST.md` (the canonical order), plus ADR-0012, ADR-0013 and ADR-0015, and the four round-1 reports
in `evidence/S0/reviews/`.

## Forbidden actions

- No push (of `main` or anything else), PR, deploy or remote mutation without the owner's approval recorded verbatim in
  an ADR.
- No multiplayer.
- No product features before S0 is accepted.
- No version bump.
- No edits to protected files outside the ADR process.
- Never run `relaunch.mjs` to check something.
- No copying of the DESIGN-S3D folder until the owner says its refresh is done.
