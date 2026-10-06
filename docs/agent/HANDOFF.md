# HANDOFF

_Written 2026-10-06 at the end of a Cowork session (Claude desktop app, Claude Code session
`fba2c9be-b138-5280-9d88-73d0d368cce5`). It committed the owner's Mac run of every gate on code tree `3e9ce488`, moved
the DESIGN-S3D capture into the repo and ran its intake up to the owner's decision (ADR-0014), and applied repair
round 2 (ADR-0017: D-S0-15, D-S0-3, D-S0-5). Verify everything below against Git; don't trust it blindly._

<!-- generated:start -->
_Generated 2026-10-06T21:13:56.946Z by scripts/agent/handoff.mjs. Edit the sections below the block, not inside it._

## Checkpoint
- branch: main
- HEAD: 7ba5956ca67ee76f5b6c48068d3ba26e31028d41 (S0: ledger: protected hashes under ADR-0014 for INTAKE.md and the UNDER_REVIEW registry entry)
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
- typecheck: GREEN (last run 2026-10-06T10:15:24.865Z, exit 0, docs/agent/evidence/S0/logs/typecheck-20261006T101524865Z.log)
- unit: GREEN (last run 2026-10-06T10:30:00.860Z, exit 0, docs/agent/evidence/S0/logs/unit-20261006T103000860Z.log)
- build: GREEN (last run 2026-10-06T10:34:33.674Z, exit 0, docs/agent/evidence/S0/logs/build-20261006T103433674Z.log)
- e2e: RED (last run 2026-10-06T10:57:50.274Z, exit 1, docs/agent/evidence/S0/logs/e2e-20261006T105750274Z.log)
- diffCheck: GREEN (last run 2026-10-06T11:37:34.861Z, exit 0, docs/agent/evidence/S0/logs/diffCheck-20261006T113734861Z.log)
- harnessTests: RED (last run 2026-10-06T11:37:35.946Z, exit 1, docs/agent/evidence/S0/logs/harnessTests-20261006T113735946Z.log)
- requirementsAudit: GREEN (last run 2026-10-06T11:37:45.205Z, exit 0, docs/agent/evidence/S0/logs/requirementsAudit-20261006T113745205Z.log)
- testInventory: GREEN (last run 2026-10-06T11:37:45.531Z, exit 0, docs/agent/evidence/S0/logs/testInventory-20261006T113745531Z.log)
- protectedFiles: GREEN (last run 2026-10-06T11:39:21.111Z, exit 0, docs/agent/evidence/S0/logs/protectedFiles-20261006T113921111Z.log)
- browserQa: NOT_APPLICABLE
- independentReview: PENDING

## Requirements for S0
- 29 IN_PROGRESS

## Dirty files
- `M docs/agent/CURRENT_SLICE.md`
- ` M docs/agent/LEDGER.jsonl`

## Designs not yet approved
- DESIGN-S3D [UNDER_REVIEW]: Extended aquarium/aquaculture automation (S3-D): screens, copy, test ids and the names of resources shown to players
- DESIGN-S3C-LINES [PENDING_OWNER_DESIGN]: Multi-line Production screens (S3-C): several production lines per species, with their screens, copy, routes and test ids

## Last ledger events
- 2026-10-06T20:35:05.465Z orchestrator repair S0/S0-T10: repaired in 58bf22d (ADR-0017): REQUIREMENTS.json 208 -> 210 (CONST-005, PERSIST-015), no id removed; requirements-audit exit 0; awaits a fresh requirements reviewer (requirements-4)
- 2026-10-06T20:35:05.546Z orchestrator repair S0/S0-T10: docs changed in 58bf22d; owner-approved in ADR-0017; protect.mjs --update recorded 25 changed files
- 2026-10-06T20:35:05.589Z orchestrator repair S0/S0-T10: resolved: the owner approved ADR-0017 and protect.mjs verifies clean after the update
- 2026-10-06T21:10:19.573Z orchestrator review S0/S0-T10: Design intake reviewer, first review of DESIGN-S3D's INTAKE.md (fresh instance, role design-intake): YELLOW. Accurate and usable, but ten conflicts missing, three major (the dock plan ignored slice order; the phone notifications board shows native-only copy; C-16 weakened AUTO-012); sign-off given for the reviewed version. The note was revised for every finding before recording
- 2026-10-06T21:10:19.662Z orchestrator review S0/S0-T10: Design intake reviewer, re-review of the revised INTAKE.md (fresh instance, role design-intake): YELLOW. design-intake-2's three majors fixed, about 90 citations and 42 name rows correct, the 20 owner questions listed; still missing M1-M7 (AUTO-015 A5 scheduling, a Water room without a stock manager, Supplies sections, Recent events vs AUTO-008, keepers' water source, held Autofeeders vs AUTO-005, C-45 vs AUTO-016 A1) and C-23 should need the owner. OPERATIONS.md §10 sign-off given for recording INTAKE.md (sha256 562bf67d) and the UNDER_REVIEW status under ADR-0014
- 2026-10-06T21:10:19.691Z orchestrator note S0/S0-T10: DESIGN-S3D: RECEIVED -> UNDER_REVIEW (DESIGN_INTAKE.md steps 2 and 7) with INTAKE.md (sha256 562bf67d), reconciled against the master, the 0.5 spec, the code and the tests: 64 conflicts, 20 for the owner; 28 proposed requirements. Two intake reviews (design-intake-2, design-intake-3: YELLOW). Next: the owner's design decision (step 5)
- 2026-10-06T21:10:44.475Z protect.mjs decision S0/S0-T10: protected hashes recorded for 169 file(s), 2 changed
- 2026-10-06T21:13:53.895Z orchestrator session-end S0/S0-T10: Cowork session ends its turn waiting for the owner's Mac run of every gate on code tree 9beda1a3 (if the owner continues in this session, a session-start resume event follows). Done: the owner's run on 3e9ce488 committed; DESIGN-S3D captured and its intake taken to the owner's decision under ADR-0014 (design-intake-1 GREEN, -2 and -3 YELLOW, registry UNDER_REVIEW); repair round 2 under owner-approved ADR-0017 (D-S0-15 symlink-safe CLIs, D-S0-3 registry, D-S0-5 docs resolved). Next: the Mac run, then requirements-4, code-architecture-game-3, code-architecture-harness-3, security-data-3, adversarial-2
<!-- generated:end -->

## Where S0 stands

- **Branch and pushes.** Local `main` is well ahead of `origin/main`, which is still `0d9fc5a` (v0.4.0, the live site).
  Nothing was pushed, and no push approval exists.
- **The owner's Mac run on code tree `3e9ce488`** (2026-10-06 10:15-11:39Z, committed as `219e9a4`):
  - GREEN: typecheck, unit (163 files, 1,809 tests, no "Errors" line), build, diffCheck, requirementsAudit,
    testInventory, protectedFiles;
  - RED, harnessTests: 43 of 145 fixture tests failed on macOS. Root cause D-S0-15: every guarded harness CLI ran its
    main block only when `import.meta.url` (a real path) equalled `process.argv[1]` (the path as given), so through a
    symlinked path (macOS `os.tmpdir()` is under `/var` → `/private/var`) the scripts exited 0 silently. The same hole
    could let any gate pass without running when the repo is reached through a symlink;
  - RED, e2e: 44 of 47 passed; 3 timeouts (the first test's `page.goto` at a cold Vite start, and context teardown in
    `boot.spec.ts:17` and `camera-freeze.spec.ts:34` High quality). Not classified yet (BF-001).
- **Repair round 2 (ADR-0017, owner-approved verbatim, commits `58bf22d` `3e66163` `3ee0f5f`):**
  - D-S0-15: `lib.mjs` `isMainModule` compares real paths in all twelve guarded CLIs; four regression tests
    (HARNESS-006 A7); fixture stage failures memoised. 149/149 in the cloud workspace, also with `TMPDIR` on a symlinked
    directory, where the old code reproduced the Mac failure exactly (102/145);
  - D-S0-3: `REQUIREMENTS.json` 208 → 210 (CONST-005, PERSIST-015; none removed), `baseline-failures.json`, `BACKLOG.md`,
    `CURRENT_SLICE.md`;
  - D-S0-5: AGENTS.md, the master, OPERATIONS.md, README_FIRST.md, prompts/ROLE_PROMPTS.md, design/DESIGN_INTAKE.md
    and two templates now describe what the scripts enforce; the new written rules of ADR-0017 Decision 5 apply from now
    in S0 (no `gh` at all; `capture-evidence.mjs --review --candidate <sha>`; design-intake reviews go in the ledger,
    not the manifest; and the others listed there);
  - `protect.mjs --update --adr ADR-0017` recorded exactly its 25 files. D-S0-5 is resolved.
- **The code tree is now `9beda1a3`.** Every gate result above was on `3e9ce488`, so check-state warns, and every gate
  must run again on the owner's Mac (step 1 below). Docs-only commits since then don't change the tree.
- **D-S0-4 (the unit gate)** is not resolved yet: the Mac unit run was GREEN, but on `3e9ce488`, not the final tree.

## DESIGN-S3D intake (the owner's request this session)

- **Done (ADR-0014, Accepted for the capture and the intake note only; owner's words recorded verbatim):**
  - capture (`fb2ce5f`, `70917e3`): `docs/agent/design/DESIGN-S3D/` SPEC.md, SOURCE.md and 105 screens copied byte
    for byte from `/Volumes/Dev/Projects/AquariumGo-design-handoff/DESIGN-S3D` (canvas Version 23; every PNG matches
    SOURCE.md; the handoff folder is still in place), the INDEX row and the registry entry;
  - capture sign-off `design-intake-1` (GREEN); owner-decision event; protected hashes under ADR-0014;
  - `INTAKE.md` (64 conflicts, 20 marked "Needs owner"; 28 proposed requirements), first review `design-intake-2`
    (YELLOW, ten missed conflicts, folded in), re-review `design-intake-3` (YELLOW, §10 sign-off given); registry at
    `UNDER_REVIEW` (`0df586c`, `7ba5956`). Intake reviews are ledger `review` events, not in the S0 manifest.
- **Still open in the note (design-intake-3):** seven missing conflicts M1-M7 (AUTO-015 A5 scheduling; a Water room
  without a stock manager; Supplies sections for frozen and hand-fed foods; Recent events versus AUTO-008; the keepers'
  water source; held Autofeeders versus AUTO-005; C-45's tolerances versus AUTO-016 A1), C-23 should need the owner
  (it loosens AUTO-013 A2), C-63's question is wider than copy, C-38's copy should route through C-48, the desktop
  viewport is 1440×900 (not 1440×948), and a few behaviours lack a testable requirement.
- **Not done (needs the owner):** step 5, the approval; then step 6, traceability (`REQUIREMENTS.json` from INTAKE §12,
  an S3-D section in `docs/TEST_IDS.md`, the S3 contract). DESIGN-S3C-LINES stays `PENDING_OWNER_DESIGN` until the
  approval ADR sets it (ADR-0014 decision 14).

## Open defects

- **D-S0-15** (attempt 1 applied): resolved by a GREEN harnessTests run on the owner's Mac on `9beda1a3`, then a fresh
  code-architecture-harness review.
- **D-S0-3** (attempt 2 applied): stays open until `requirements-4` is GREEN.
- **D-S0-4:** resolved by a GREEN unit run on the owner's Mac on the final tree with no "Errors" line (ADR-0013).
- **D-S0-6 to D-S0-14** (ADR-0015): waiting for fresh reviews; resolve each with
  `record-event.mjs --kind repair --defect <id> --resolved --evidence <that review>` when its review is GREEN.
- **e2e (BF-001):** three timeouts on `3e9ce488`. If they recur on `9beda1a3`, one re-run is allowed as its own run
  (`node scripts/agent/verify-slice.mjs --gates e2e` on the Mac); a recurring failure becomes an owner gate
  (`BASELINE_RED:<test>`) or a defect, never a skip, a longer timeout or a retry.

## Exact next legal action

1. **The owner's Mac run on code tree `9beda1a3`.** The owner was given these two commands in Terminal (the session
   doesn't write to the repo while they run):
   - `cd /Volumes/Dev/Projects/AquariumGo && PLAYWRIGHT_BROWSERS_PATH=/Volumes/Dev/Caches/playwright node scripts/agent/verify-slice.mjs`
   - then `node scripts/agent/capture-evidence.mjs --command "npm run report:rarity" --label report-rarity --req GEN-013`.

   If a session finds uncommitted `docs/agent/evidence/S0/logs/*`, `manifest.json` and `STATE.json` gate changes, they
   are that run: check them (code tree `9beda1a3`, no `treeChanged`), commit them as the owner's run, and record an
   `evidence` ledger event. If e2e failed, ask the owner before any re-run.
2. **Fresh S0 reviewers** (ADR-0016 decision 1 allows them), each on the commit that holds the run, recorded with
   `capture-evidence.mjs --review --candidate <sha>`:
   - `requirements-4` (D-S0-3, including HARNESS-006 A7);
   - `code-architecture-game-3` (the game and gate-configuration part; D-S0-4, D-S0-6, D-S0-13);
   - `code-architecture-harness-3` (signs off the scripts under ADR-0015 and ADR-0017, and the two template diffs);
   - `security-data-3`;
   - then `adversarial-2`.

   Give each only what `prompts/ROLE_PROMPTS.md` lists. Reviewers run in a cloud clone made from a bundle of `main`
   (see "Working in the Cowork sandbox").
3. **Repairs** if any review is RED or YELLOW, with fresh re-reviews (counting attempts per defect).
4. **The owner's part:** the owner questions below; then S0 acceptance (`ADVERSARIAL_REVIEW → ACCEPT` needs the state
   chain from IMPLEMENT through the verify and review states), `checkpoint/S0-harness`, and the backup bundle
   (`OPERATIONS.md` §6).
5. **DESIGN-S3D step 5** whenever the owner is ready (owner question 4). It doesn't block S0.

## Owner questions

1. **e2e (BF-001):** after the Mac run on `9beda1a3`: if the three timeouts recur, how to classify them (a recorded
   re-run, `BASELINE_RED`, or a defect to repair).
2. **The 57 open questions** in `evidence/S0/reviews/adversarial-review-2026-10-05.json`: triage them, and ask only the
   important ones.
3. **Before the first unattended run** (`relaunch.mjs`), ask about the push locks again (ADR-0016 decision 4).
4. **DESIGN-S3D approval (DESIGN_INTAKE step 5).** Recommendation: first fold design-intake-3's open items into
   INTAKE.md and re-review it (`design-intake-4`), then put the owner questions to the owner in batches of four with a
   picture of where each lives (the owner's preferred style, ADR-0014), then write the approval ADR: it quotes the
   question and answer verbatim, names DESIGN-S3D, lists the approved 0.5 items it overrides (INTAKE C-2), sets
   DESIGN-S3C-LINES per ADR-0014 decision 14, records an `owner-decision` event and runs `protect.mjs --update`.
5. **S0 acceptance (S0-T12):** the owner's review of the harness once the reviews are GREEN.

## Working in the Cowork sandbox (if the next session runs there too)

- **Its shell is a Linux VM on the Mac.** It can't delete files under `/Volumes/Dev/Projects`, has no npm registry,
  can't run Vitest, Vite or Playwright against the Mac's `node_modules`, and each command is capped at 180 s.
- **Git there:** `GIT_OPTIONAL_LOCKS=0` and `-c core.checkStat=minimal -c core.trustctime=false -c core.createObject=rename
  -c gc.auto=0 -c maintenance.auto=false` (`OPERATIONS.md` §8). Without checkStat=minimal, `git status` re-hashes the
  whole tree and times out. Every commit leaves an empty `.git/HEAD.lock`: move it into
  `.agent-runs/sync/stale-locks/` right after. A throwaway-index `git add -A` (codeTreeOf) takes 20-80 s there, so
  `check-state.mjs` and `capture-evidence.mjs --command` fit but are slow.
- **Never write to the repo while the owner's verify-slice run is going:** new protected files would turn its
  protectedFiles gate red. Check `docs/agent/evidence/S0/logs/` for a log that is still growing before writing.
- **Moving work:** Mac → cloud with `git bundle create .agent-runs/sync/<name>.bundle <base>..main`, staged and fetched
  into a cloud clone; cloud → Mac by writing the reviewed files byte for byte (checked by SHA-256 against their base
  first), then committing in the VM. The cloud workspace has no npm registry either; harness tests run there.

## Required first reads

`docs/agent/README_FIRST.md` (the canonical order), plus ADR-0014, ADR-0016 and ADR-0017, `design/DESIGN_INTAKE.md`,
and the reports `design-intake-3.md` and `requirements-3.md` in `evidence/S0/reviews/`.

## Forbidden actions

- No push (of `main` or anything else), PR, deploy or remote mutation without the owner's approval recorded verbatim in
  an ADR.
- No multiplayer; no product features before S0 is accepted; no version bump.
- No edits to protected files outside the ADR process; never edit an accepted ADR.
- Never run `relaunch.mjs` to check something; never use `gh`.
- No S3-D work and no approval of DESIGN-S3D or DESIGN-S3C-LINES without the owner's recorded decision.
