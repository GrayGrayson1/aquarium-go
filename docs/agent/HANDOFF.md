# HANDOFF

_Written 2026-10-05 at the end of the second S0 repair session. Read this first, then `docs/agent/README_FIRST.md`.
Verify everything below against Git; don't trust it blindly._

## Where we are
- **Slice S0, machine state IMPLEMENT, in a repair round.** Five independent reviews of the S0 work came back RED or
  YELLOW. This session finished **step 1 (game repairs)**. Steps 2-8 below are not started; step 9 is the owner's part.
- **Owner go-ahead (ADR-0006):** run next steps 1-8, then step 9. No other push, PR or deploy is authorized.
- **Branch:** local `main` is the integration branch (ADR-0005 #6). With the owner's approval (ADR-0007) it was pushed
  once to the remote branch **`agent/s0-wip`** so a cloud session can reach it; `origin/main` is untouched (it doesn't
  deploy). Any later push, including an update of `agent/s0-wip`, needs a new owner yes. A cloud session works on
  `agent/s0-wip` and must not push to `main`: a push of `main` deploys GitHub Pages, and `render.yaml` has
  `autoDeploy: true`. The repo is public. `agent/aquariumgo-local-stack-20261005` is stale (points at `7c0dbf4`) and can be deleted.
- **Known doc conflict:** AGENTS.md and the master still say "never commit on `main`". The owner overrode that
  (ADR-0005 #6) and `STATE.integrationBranch` is `main`; step 3 fixes the docs.

## Commits on top of `0d9fc5a` (v0.4.0)
`94de6bb` owner's harness → `62df438` harness revision → `8a4c6c8` gate config → `2ef1ff7` architecture lock and
locale → `3e00a32` atomic mutateFast → `dfc0a13` offline market at 1x (wrong; reverted by `f999618`) → `6347c5d`
crafted saves (partial; completed by `d98731d`) → `16233a1` equipment grace → `c774d38` hidden-tab overlap →
`7c0dbf4` **WIP: harness-script repairs (untested)**, ADR-0004/0005, review reports, requirements draft → this
session:
- `f999618` revert of `dfc0a13`: the catch-up keeps the saved market speed, so bids made while away last 3+ real
  minutes after the return (adversarial F8). Test `tests/sim/fix-econ-offline-market-speed.test.ts` (fails on the
  wrong code).
- `58ae313` `runTick` keeps the backlog only when nothing was published, so a throwing store subscriber no longer
  re-runs time (adversarial F7 / SD-3). Test `tests/sim/core-gameloop-publish.test.ts` (fails without the fix).
- `d98731d` crafted-save hardening (SD-1/SD-2):
  - `repairState` scrubs every inherited-name key, id field and list entry first;
  - clutches take their key as id;
  - equipment, decor, frag, research and starter ids are checked against the catalog;
  - catalogs have null prototypes (`src/data/byId.ts`).

  Tests: `tests/sim/core-crafted-saves.test.ts` and the seeded `tests/sim/core-crafted-saves-fuzz.test.ts`. The
  reviewer's probe `scripts/_audit/H0-review-security/fuzz-ids.ts` now gives 2367 ok and 0 findings.
- `d8fb896` guard tests read files asynchronously in `beforeAll` (review H1: synchronous reads blocked the Vitest
  worker and failed the unit gate); determinism patterns widened (L3); layer matrix added to `docs/ARCHITECTURE.md`.

**Last measured:** `npm run typecheck` exit 0. `npm test` before `d8fb896`: 160 files and 1782 tests passed, but 1
worker RPC timeout error, which is the H1 problem `d8fb896` fixes. The full suite has **not been re-run since
`d8fb896`**: re-run it first. `node scripts/agent/check-state.mjs` fails with 4 errors, all expected until
steps 5 and 7: requirement AUTO-002: names no test; requirement PERSIST-003: names no test; requirement PERSIST-005: names no test; docs/agent/PROTECTED.json is missing.

## Exact next steps (in order)
1. ~~Game repairs~~ **DONE** (above). Leftovers moved to the backlog (step 4):
   - `loadAndResume` still adopts a half-simulated catch-up when `simulateOffline` throws (SD-10 / adversarial F9).
   - Repeated tick failures aren't shown to the player.
   - Enum-valued save fields (`role`, `archetype`, …) aren't checked against their tables.
   - The determinism guard's comment stripper treats quotes inside regex literals as strings.
2. **Harness tests.** `node --test 'scripts/agent/*.test.mjs'` fails at import: `agent.test.mjs` still imports
   `validateRepairCount`. Update it to the repaired APIs:
   - `checkTransition` and the strict `parseArgs`;
   - `validateRepairs` and `repairCounts`;
   - `reportVerdict`, `validateManifestAppendOnly`, `alarmsBetween`, `childEnv`, `nextState`, `designCitations`,
     `DISABLE_RE` and `hasOwnerApproval`;
   - the new `requirements.mjs`.

   Test the fail-closed cases from `evidence/S0/reviews/code-architecture-harness-1.md`, `security-data-1.md` and
   `adversarial-1.md` (bypass table). Fix script bugs the tests reveal; never weaken tests. Then
   `node scripts/agent/check-state.mjs` must exit 0.
3. **Docs** (ADR number is now **ADR-0008**):
   - AGENTS.md, CLAUDE.md and the master: main is the integration branch, so drop "never commit on main"; remove the
     SCHEMA_BUMP sentence from master §3.5.
   - OPERATIONS.md: the slice-start procedure (`next-slice.mjs`), the checkpoint backup step (git bundle to
     `/Volumes/Dev/Backup Projects/AquariumGo/` plus `git bundle verify`, ADR-0006), the S4 flow (readiness gate in a
     new session), reviewers re-running gates, "what the checks can't catch", and that adversarial review is required.
   - `design/DESIGN_REGISTRY.json`: add DESIGN-S3C-LINES and the Social dev-only override.
   - ADR-0008: correct ADR-0002/0003's wrong claims (`--self-test`, missing evidence, SD-13's "STATE.json counts as an
     owner decision"), replace ADR-0003 rules 5 and 7, and add it to `decisions/INDEX.md`.

   AGENTS.md, the master and the prompts are protected (`docs/agent/PROTECTED.json`): edit them under ADR-0008.
4. **`docs/agent/BACKLOG.md`** from `evidence/S0/reviews/adversarial-review-2026-10-05.json` `synthesis.merged`. It
   holds 101 findings: 30 fix-now-harness, 24 needs-slice, 23 owner-decision, 18 fix-now-app-safe, 3 fix-now-repo and 3
   record-only. Mark the ones already fixed (with commit), include the step-1 leftovers above and the design errata
   (M15-M17, M48-M52).
5. **Requirements:** merge `evidence/S0/requirements-draft.json` (151 entries) into `REQUIREMENTS.json`:
   - REL-002 and REL-003 move to ALL;
   - umbrella criteria say "closed";
   - PERSIST-001 becomes SUPERSEDED, and PERSIST-003 becomes the forward-safety rule;
   - add PLAT-005, SOC-011, GEN-013, HARNESS-008 (with the ADR-0006 folder) and one requirement per S0 fix;
   - tag the new tests with their requirement ids.

   Then run a fresh requirements reviewer.
6. **`npm run report:rarity`** (GEN-013, ADR-0005 #4): count how many animals per species fall in each rarity tier,
   so the owner can tune on real numbers.
7. **Evidence:**
   - `node scripts/agent/test-inventory.mjs --baseline`;
   - `node scripts/agent/protect.mjs --update --adr ADR-0008`;
   - `node scripts/agent/verify-slice.mjs` for every gate except e2e.
8. **Fresh independent re-review** (code-architecture, security-data, adversarial) as separate subagents, following
   `CLAUDE.md`. Repair what they find, with a new reviewer instance after every repair.
9. **The owner's part:**
   - design intake (DESIGN-S3D, DESIGN-S3C-LINES);
   - e2e from the Claude desktop app (BF-001);
   - the fresh-session bootstrap check (S0-T11);
   - owner review and S0 acceptance;
   - the checkpoint tag `checkpoint/S0-harness` and the first backup bundle.

Steps 2-6 touch separate files and can run in parallel. The owner rejected background agents once in this session
without saying why, so ask before fanning out.

## Open owner questions
The remaining questions in `synthesis.questions` of the adversarial review JSON (57, mostly open): triage them during
step 4 and ask only the important ones. Answered this session: backup folder and publishing `docs/agent` (ADR-0006).

## Environment
- Claude Code's sandboxed shell can't start headless Chromium (BF-001).
- The external drive is slow for many small reads. A full `npm test` takes about 100 s, and the fuzz probe about 3 min.
- Reviewer scratch worktrees `/Volumes/Dev/Projects/AquariumGo-review-game` and `-review-adv` can be removed with
  `git worktree remove`.
- Probes are in the git-excluded `scripts/_audit/H0-*`.

## Forbidden
No push, PR or deploy, no remote mutation, no multiplayer, no product features before S0 is accepted, no version
bump.
