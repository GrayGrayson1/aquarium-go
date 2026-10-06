# HANDOFF

_Written 2026-10-06 at the end of the cloud session (claude.ai/code, session `fb16c5d5-671a-5220-bdec-f4fad52a7de1`),
which ran HANDOFF steps 2-7 and started step 8. The owner moved the work to Cowork on the Mac. Verify everything
below against Git; don't trust it blindly._

<!-- generated:start -->
_Generated 2026-10-06T00:17:15.224Z by scripts/agent/handoff.mjs. Edit the sections below the block, not inside it._

## Checkpoint
- branch: agent/s0-wip
- HEAD: 4c1a987960570f3bb9a8c6afff10848a906054b1 (S0: ledger: D-S0-3 repair attempt; owner-decision events for ADR-0001 and ADR-0004..0007 recorded after the fact)
- baseline: 0d9fc5a46085f746510a1041335632cd4f7314a2
- last accepted checkpoint: none yet

## Current position
- slice: S0
- machine state: IMPLEMENT
- task: S0-T10
- repair attempt: 0
- owner gate: none
- required reviewers: code-architecture, security-data, adversarial

## Gates
- typecheck: GREEN (last run 2026-10-05T23:45:09.756Z, exit 0, docs/agent/evidence/S0/logs/typecheck-20261005T234509756Z.log)
- unit: RED (last run 2026-10-05T23:45:39.917Z, exit 1, docs/agent/evidence/S0/logs/unit-20261005T234539917Z.log)
- build: GREEN (last run 2026-10-05T23:49:13.464Z, exit 0, docs/agent/evidence/S0/logs/build-20261005T234913464Z.log)
- e2e: PENDING (last run 2026-10-05T18:48:18Z, exit 143, docs/agent/evidence/S0/logs/baseline-e2e.log)
- diffCheck: GREEN (last run 2026-10-05T23:49:59.485Z, exit 0, docs/agent/evidence/S0/logs/diffCheck-20261005T234959485Z.log)
- harnessTests: GREEN (last run 2026-10-05T23:49:59.805Z, exit 0, docs/agent/evidence/S0/logs/harnessTests-20261005T234959805Z.log)
- requirementsAudit: GREEN (last run 2026-10-06T00:16:25.283Z, exit 0, docs/agent/evidence/S0/logs/requirementsAudit-20261006T001625283Z.log)
- testInventory: GREEN (last run 2026-10-05T23:50:01.227Z, exit 0, docs/agent/evidence/S0/logs/testInventory-20261005T235001227Z.log)
- protectedFiles: GREEN (last run 2026-10-05T23:50:37.245Z, exit 0, docs/agent/evidence/S0/logs/protectedFiles-20261005T235037245Z.log)
- browserQa: NOT_APPLICABLE
- independentReview: PENDING

## Requirements for S0
- 28 IN_PROGRESS

## Dirty files
- `M docs/agent/HANDOFF.md`
- ` M docs/agent/LEDGER.jsonl`
- ` M docs/agent/STATE.json`
- ` M docs/agent/evidence/S0/manifest.json`
- `?? docs/agent/evidence/S0/logs/requirementsAudit-20261006T001625283Z.log`

## Designs not yet approved
- DESIGN-S3D [PENDING_OWNER_DESIGN]: Extended aquarium/aquaculture automation (S3-D): screens, copy, test ids and the names of resources shown to players
- DESIGN-S3C-LINES [PENDING_OWNER_DESIGN]: Multi-line Production screens (S3-C): several production lines per species, with their screens, copy, routes and test ids

## Last ledger events
- 2026-10-05T23:44:54.583Z protect.mjs decision S0/S0-T4: protected hashes recorded for 52 file(s), 52 changed
- 2026-10-06T00:07:15.527Z orchestrator repair S0/S0-T6: registry repaired in e79aeba (208 entries); audit and check-state exit 0; fresh requirements reviewer to confirm
- 2026-10-06T00:07:15.602Z orchestrator owner-decision S0/S0-T12: Owner decision recorded in ADR-0001 (verbatim in the ADR)
- 2026-10-06T00:07:15.666Z orchestrator owner-decision S0/S0-T12: Owner decision recorded in ADR-0004 (verbatim in the ADR)
- 2026-10-06T00:07:15.737Z orchestrator owner-decision S0/S0-T12: Owner decision recorded in ADR-0005 (verbatim in the ADR)
- 2026-10-06T00:07:15.814Z orchestrator owner-decision S0/S0-T12: Owner decision recorded in ADR-0006 (verbatim in the ADR)
- 2026-10-06T00:07:15.910Z orchestrator owner-decision S0/S0-T12: Owner decision recorded in ADR-0007 (verbatim in the ADR)
- 2026-10-06T00:17:15.146Z orchestrator session-end S0/S0-T10: Cloud session ends; owner moves the work to Cowork on the Mac. Steps 2-7 done (e2e and unit-on-Mac pending); step 8 reviewers stopped before writing reports; HANDOFF.md has the sync steps and the exact next action
<!-- generated:end -->

## First: bring the cloud work onto local main (Cowork / the Mac)

All the cloud session's work is on the remote branch **`agent/s0-wip`** only. Local `main` on the Mac is still at
`8c5700d` (the commit the owner pushed as `agent/s0-wip`, ADR-0007), and `origin/main` is at `0d9fc5a` (v0.4.0, live).

1. In `/Volumes/Dev/Projects/AquariumGo` (check `/Volumes/Dev` is mounted): `git status` must be clean and
   `git log -1 --format=%H main` must be `8c5700df22f353c918c1bcf491b16c2d01738410`. If local `main` has commits beyond
   that, or the tree is dirty, stop and ask the owner. Never discard local work.
2. `git fetch origin agent/s0-wip`, then on `main`: `git merge --ff-only origin/agent/s0-wip`. It must fast-forward
   (the cloud history starts at `8c5700d`). Then `npm ci` only if `package-lock.json` changed (it didn't in the cloud
   session).
3. Never push `main`: it deploys GitHub Pages. ADR-0009's approval to push `agent/s0-wip` ended with the cloud session;
   any push now needs a new owner yes, recorded in an ADR.
4. Then follow `prompts/KICKOFF.md` from the bootstrap step: this session's bootstrap assertion is also the
   fresh-session bootstrap test S0-T11.

## Verified complete

- **Step 2, harness tests (`2926bf0`, ADR-0011):** `node --test 'scripts/agent/*.test.mjs'` 75/75 pass; every guard
  was mutation-checked by the builder. Script fixes the tests exposed are listed in ADR-0011.
- **Step 3, docs (`1a74863`, ADR-0008, owner-approved):** local `main` is the integration branch; no SCHEMA_BUMP gate;
  OPERATIONS gains the next-slice procedure, the backup bundle step, the S4 flow, reviewers re-running gates, "what the
  checks can't catch", adversarial review for every slice and a cloud-session note; `DESIGN-S3C-LINES` and the Social
  dev-only override in the registry.
- **Step 4, `BACKLOG.md` (`1a74863`):** 101 review findings plus B-001..B-005 (the step-1 leftovers and the e2e warm-up)
  and the design errata.
- **Step 5, requirements (`5ae85a3`, repaired in `e79aeba` after the RED review requirements-2):** 208 requirements;
  `requirements-audit.mjs` OK. The repair has **not** been re-reviewed (see step 8).
- **Step 6, `npm run report:rarity` (`172b5c3`, GEN-013, S0-T13):** 800 of 1,257 morph-catalog entries are Legendary
  under today's rule; 765 of them are betta (170/240), fancy guppy (539/686) and medaka (56/80). Run it for the full
  table; the owner tunes tiers from these numbers (ADR-0005 decision 4).
- **Step 7, evidence:** test-inventory baseline at `0d9fc5a` (1,753 Vitest, 47 Playwright) and `PROTECTED.json`
  under ADR-0008 (`fe6f674`); `check-state.mjs` exits 0 (only the branch warning in the cloud).
- **Gates recorded by `verify-slice.mjs` on the current code tree** (the code tree hasn't changed since `fe6f674`;
  later commits touched only `docs/agent`): typecheck, build, diffCheck, harnessTests, requirementsAudit,
  testInventory, protectedFiles GREEN. unit RED (BF-003 below). e2e PENDING (BF-001).
- **Repairs:** D-S0-1 (`9edfa12`): `core-gameloop-publish`'s failure test depended on machine speed; fixed and
  resolved. D-S0-2 = BF-002 (`ac6ab73`, ADR-0010, owner-approved): a Vitest setup file stops the worker's RPC timeout
  that failed `npm test` on slow or busy machines. D-S0-3: the requirements repair (`e79aeba`), awaiting a fresh
  requirements reviewer.
- **Ledger:** owner-decision events for ADR-0001 and ADR-0004..0007 were recorded after the fact; ADR-0008, 0009 and
  0010 at the time.

## Verified failing

- **unit, in the cloud only (BF-003):** `core-gameloop.test.ts` "10× on the big facility" asserts a median tick under
  20 ms. On the 4-core cloud container under full-suite load it measured 34.6/24.0/23.4 ms; alone it is 14-16 ms at HEAD
  and at `0d9fc5a`, and the full baseline suite fails it the same way there. The owner's Mac passed it at the
  baseline. Not an S0 regression. Re-run the unit gate on the Mac.
- **e2e (BF-001):** never run on the S0 tree. In the cloud, Chromium starts (with `executablePath`
  `/opt/pw-browsers/chromium`, as the container's Playwright build differs) and the game loads, but there is no GPU, so
  the 3D page is too slow and `boot.spec.ts` timed out. The owner runs e2e and browser QA from Cowork / the desktop app
  (ADR-0004 decision 2).

## Evidence references

- `docs/agent/evidence/S0/manifest.json`, `evidence/S0/logs/*-20261005T23*.log` and `requirementsAudit-20261006T*.log`
- `evidence/S0/baseline-failures.json` (BF-001, BF-002, BF-003)
- `evidence/S0/bootstrap-20261005T223554Z.json` (the cloud session's bootstrap)
- `evidence/S0/test-inventory-baseline.json`, `docs/agent/PROTECTED.json`
- `evidence/S0/reviews/requirements-2.md` (RED; repaired since)

## Relevant ADRs

ADR-0006 (go-ahead for steps 1-9), ADR-0008 (docs corrections), ADR-0009 (cloud pushes; ended), ADR-0010 (BF-002 fix),
ADR-0011 (harness scripts; needs independent sign-off in step 8).

## Risks

- `scripts/agent/**`, `vitest.config.ts` (ADR-0010) and the design registry change need an independent reviewer's
  sign-off before S0 can be accepted (master §3.8, OPERATIONS §10).
- After any repair to a protected file, run `protect.mjs --update --adr <a new ADR>`; ADR-0008 can't be reused (it
  already recorded). Adding any new ADR file makes `check-state.mjs` fail until that update.
- `relaunch.mjs` must never be run to check a claim (it starts real sessions).
- The full suite takes about 4 min in the cloud; reviewers running `npm test` in parallel slow each other down, and
  wall-clock tests (BF-003) can fail under that load.

## Owner questions

1. **BF-003, the wall-clock tick test.** Options: (a) count the unit gate from the Mac only, where it passes
   (recommended: no test changes, and e2e must run on the Mac anyway); (b) run wall-clock tests apart from the parallel
   suite (a gate-config change under a new ADR). Never loosen the 20 ms budget.
2. **ADR-0011's seven open points:** (1) OPERATIONS §10 says a new protected file only warns, but the script errors
   (recommended: correct the doc to "fails"); (2) whether the `--update` ADR must list the files it covers; (3) no check
   ties `lastAcceptedCheckpoint` to its tag (cloud sessions never get tags); (4) `nextState` carries gate waivers into
   the next slice (recommended: drop them at the slice boundary); (5) `--resolved` resets repair counters without
   evidence (recommended: require an evidence path); (6) deny rules match command text only; (7) `relaunch.mjs`
   `main()`/`snapshot()` aren't tested.
3. **The 57 open questions** in `evidence/S0/reviews/adversarial-review-2026-10-05.json` `synthesis.questions`: triage
   them and ask only the important ones (not done yet).
4. **BF-001:** satisfied by a real e2e run on the S0 tree from the Mac; otherwise the owner acknowledges it in an ADR.

## Exact next legal action

1. The sync above, then the bootstrap assertion and `bootstrap-check.mjs` (S0-T11).
2. On the Mac: `node scripts/agent/verify-slice.mjs --gates unit,e2e` (and every gate again if any code changes).
   e2e needs Chromium outside the sandbox (OPERATIONS §8).
3. **Step 8, independent review**, as separate fresh subagents with the packets `CLAUDE.md` and `prompts/ROLE_PROMPTS.md`
   describe (diff `0d9fc5a..HEAD`): `requirements` (report `requirements-3.md`; rule on each requirements-2 finding),
   `code-architecture` for the game and config part (`code-architecture-game-2.md`, signs off ADR-0010) and for the
   harness part (`code-architecture-harness-2.md`, signs off ADR-0011 and the registry change), `security-data`
   (`security-data-2.md`), then `adversarial` (`adversarial-2.md`). The cloud session started the first four and stopped
   them at the handoff before any wrote a report. Record each verdict with
   `capture-evidence.mjs --review --role <role> --verdict <V> --report <path>`. Repair findings, with a new reviewer
   instance after every repair.
4. Step 9, the owner's part: design intake (DESIGN-S3D, DESIGN-S3C-LINES), owner review and the owner questions above,
   S0 acceptance, the checkpoint tag `checkpoint/S0-harness`, and the first backup bundle to
   `/Volumes/Dev/Backup Projects/AquariumGo/` with `git bundle verify` (OPERATIONS §6).

## Required first reads

`docs/agent/README_FIRST.md` (canonical order), plus ADR-0008 to ADR-0011, `evidence/S0/baseline-failures.json` and
`evidence/S0/reviews/requirements-2.md`.

## Forbidden actions

No push (of `main`, `agent/s0-wip` or anything else), PR, deploy or remote mutation without a new owner approval
recorded in an ADR; no multiplayer; no product features before S0 is accepted; no version bump; no edits to protected
files outside the ADR process; never run `relaunch.mjs` to check something.
