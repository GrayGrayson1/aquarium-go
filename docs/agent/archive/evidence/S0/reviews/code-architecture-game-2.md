# S0 review: code-architecture, game and gate-configuration part (2)

- **Role:** code-architecture (`docs/agent/prompts/ROLE_PROMPTS.md`), reviewer mode (`AGENTS.md`). I am a fresh,
  independent reviewer subagent. I built none of the reviewed work, and this report is the only file I wrote.
- **Candidate:** `fd9ed1489e3296c9d496cac3fe9ec0e60958d78d`, in the detached worktree `/home/claude/rv/code-architecture-game-2`.
  **Base:** `0d9fc5a46085f746510a1041335632cd4f7314a2` (v0.4.0).
- **Scope:** `git diff 0d9fc5a fd9ed14 -- . ':!docs/agent' ':!scripts/agent' ':!AGENTS.md' ':!CLAUDE.md'`. That is 44 files:
  - 19 under `src/`;
  - 14 under `tests/`, including `tests/sim/setup/yield-between-tests.ts`;
  - `scripts/report-rarity.ts`, `package.json`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore`
    and `README.md`;
  - two doc files the packet didn't name, both docs-only: `docs/ARCHITECTURE.md` and `docs/LANES.md`.

  There are no untracked files.
- **What I read:**
  - `AGENTS.md` (with `CLAUDE.md` as loaded), `/home/claude/rv/CONTEXT_PACK.reviewer.md` and `docs/agent/CURRENT_SLICE.md`;
  - `docs/ARCHITECTURE.md`, and `docs/agent/OPERATIONS.md` §6-§8, §10 and §11;
  - ADR-0002 (from the pack) and ADR-0010;
  - the diff and the current files around it: every `mutateFast` caller, `useAutosave`, `session.ts`, `offline.ts`, how
    `listings.ts` sets bid expiry, and the buyer patience ranges;
  - the focus requirements in `REQUIREMENTS.json`;
  - in `BACKLOG.md`, the header, B-001 to B-005 and "S0 game fixes" (cited by `CURRENT_SLICE.md` and HARNESS-022);
  - `PROTECTED.json`;
  - the evidence: `manifest.json`, the listed logs, `baseline-failures.json` and `test-inventory-baseline.json`;
  - the previous report `code-architecture-game-1.md`;
  - in `scripts/agent/`, only what the evidence relies on: `evidence.mjs` `codeTreeOf`, `protect.mjs`, the skip scan in
    `test-inventory.mjs`, and the gate-configuration test in `agent.test.mjs`.
- **What I didn't read:** `HANDOFF.md`, `LEDGER.jsonl`, builder reports and commit messages. I didn't use `git log`,
  `git blame` or a `git show` without a `:path`.
- **Environment:** a cloud container with Node v22.22.0, no `node_modules`, and the npm registry blocked, so none of the
  project's npm gates ran here (see "Gates and evidence").
  - **Probes.** They run the candidate's own source with the container's global `tsx` 4.23.12 and TypeScript 6.0.3. Their
    files are in `/tmp/cag2-scratch/`.
  - **Stand-ins.** One probe imports `src/persistence/offline.ts`. For that probe, minimal stand-ins replaced `zustand`,
    `immer` and `idb-keyval`. The function it measures, `simulateOffline`, doesn't use them.
  - Probe results support findings. They are not gate results.

## Summary

The contained game fixes are correct, minimal and well tested.
- **Probes:** they found no regression.
  - All 46 dev fixtures load through `migrateSave` with `repairs: []`, and a second repair finds nothing.
  - An exhaustive crafted-save fuzz runs 1,440 cases with no pollution, refusal or caught error.
  - The determinism and layering guards give the same result when I re-run their logic with the TypeScript parser.
- **Rules:** the mutation boundary, the RNG rule and the layering hold, and no dependency changed.

The verdict is still RED, because two acceptance criteria are unmet on this candidate:
1. **HARNESS-006 A5.** It is contradicted by the only recorded unit run on this code tree, which still reports BF-002's
   "Timeout calling onTaskUpdate" with the ADR-0010 setup file in place. The same goes for the last clause of CONST-004 A3
   (B1).
2. **PERSIST-009 A3.** The header comment still names PERSIST-004 (B2).

There is also a gate-integrity gap: nothing protects the new setup file (M1).

## Findings

### B1 (Blocker): the only recorded unit run on this code tree still has BF-002, with ADR-0010's setup file in place

**Files:**
- `vitest.config.ts:15-16` and `tests/sim/setup/yield-between-tests.ts:12`;
- `docs/agent/evidence/S0/logs/unit-20261005T234539917Z.log:591` and `:1015-1032`;
- `docs/agent/evidence/S0/baseline-failures.json` (BF-002 `nextStep`, BF-003 `evidence[0]`);
- `docs/agent/decisions/ADR-0010-vitest-yield-between-tests.md:35-36` and `:59`.

**Evidence:**
- **The run.** The manifest has one post-baseline unit record: `npm test`, exit 1, log SHA-256 `bfd42010…`, which matches
  the log on disk. Its `codeTree` is `4d29120aca765409be362299865ac7bfa0617a09`.
- **It is this candidate's code.** I computed the code tree of `fd9ed14` independently (commit tree minus `docs/agent`,
  `AGENTS.md` and `CLAUDE.md`, in memory). It is the same `4d29120a…`. So that run used this candidate's
  `vitest.config.ts`, including its `setupFiles`.
- **What it shows.** The log reports `1 failed | 1791 passed` (BF-003) and also
  `Errors 1 error … Error: [vitest-worker]: Timeout calling "onTaskUpdate"` (`:1021`, `:1032`).
- **The likely cause.** One test, `playthrough-starters` "balance: the long game", took 68,471 ms (`:591`). That is over
  Vitest's 60 s RPC reply timer. ADR-0010 itself says the yield can't cover this case: "A single test that runs
  synchronously for more than 60 s would still trip the timer; the longest one measured here is about 32 s". Under
  full-suite load on the 4-core container, that test took twice as long. The setup file only helps a long file of short
  tests.

**What is broken:**
- **Two criteria.**
  - HARNESS-006 A5 is violated for this tree: "no npm test run on the S0 tree reports a Vitest 'Timeout calling
    onTaskUpdate' error (verify-slice.mjs unit records in evidence/S0/manifest.json)".
  - CONST-004 A3's "npm test finishes without a Vitest worker RPC timeout" isn't met either. The guards are not the cause:
    they took 257 ms and 675 ms.
- **The evidence record is wrong or incomplete.**
  - BF-002 says "Fixed by ADR-0010 … The unit gate is re-run on the S0 tree with verify-slice.mjs". This log is that re-run,
    and it shows the error again.
  - BF-003 quotes the same log ("1791/1792 pass") without mentioning the error.
  - ADR-0010's Verification, "The full npm test exits 0 on this tree, recorded by verify-slice.mjs", has no supporting
    record.
  - The manifest's `counts` for the run omit the "Errors" line, so the recurrence shows only in the log. (That is the
    harness's `parseCounts`, outside this review's scope.)

**Fix (orchestrator and owner):**
1. Reclassify BF-002 as mitigated, not fixed: it comes back whenever one test runs synchronously for more than 60 s. Add the
   error to BF-003's evidence.
2. Decide how the unit gate avoids it, then get a run on the final tree with no RPC error in the environment the owner
   names. The options:
   - run the gate only on the owner's Mac (HARNESS-018 A4), and restate A5 to say so through the requirements process;
   - change the gate configuration for slow machines, for example fewer workers. That needs an ADR and a reviewer's
     sign-off.
3. Correct ADR-0010's Verification in a later ADR (accepted ADRs aren't edited).

Never loosen a budget or add retries to get there.

### B2 (Blocker, a one-line fix): PERSIST-009 A3 isn't done

`tests/sim/core-fastmutate-atomic.test.ts:3` still says "(S0 review, PERSIST-004)", but A3 requires the header comment to
name PERSIST-009. `src/game/fastMutate.ts:112` has the same mislabel: the atomic `mutateFast` is PERSIST-009, and
PERSIST-004 is now the S4 remainder.

**Fix:** correct both comments.

### M1 (Major): the new setup file can change every unit test, but no check covers it

**Files:** `tests/sim/setup/yield-between-tests.ts`; `docs/agent/PROTECTED.json` (`patterns`);
`scripts/agent/test-inventory.mjs:54-61`; `scripts/agent/agent.test.mjs:822-842`.

**What's wrong:**
- **What a setup file can do.** A Vitest setup file runs in every worker before every test file. A future edit could skip
  every test at runtime (`beforeEach((ctx) => ctx.skip())`) or swallow failures. That would weaken the whole unit gate.
- **Why nothing would catch that edit:**
  - **Protection.** `vitest.config.ts` is protected, but the file it loads isn't in `PROTECTED.json`, nor in the
    gate-defining list of master §3.8 and HARNESS-028.
  - **Test inventory.** `test-inventory.mjs` scans only `*.test.*` and `*.spec.*` files for skip markers. `vitest list`
    doesn't run hooks, so tests skipped at runtime keep their ids.
  - **Gate-configuration test.** The harness test doesn't check `setupFiles`.
  - **HARNESS-006 A6.** It covers only test files that existed at `0d9fc5a`.
- Today's content is harmless, and I sign it off below.

**Fix:** under an ADR, add `tests/sim/setup/` to `PROTECTED.json` and to the gate-defining list. Have the gate-configuration
test pin `setupFiles`, or the file's content.

### Minor findings

**m1. Forward safety: the new catalog checks delete content that a newer build adds without a schema change.**
- **Where:** `src/persistence/migrations.ts`:
  - `:261-275` and `:292-293`: equipment and decor in tanks;
  - `:471-474` and `:495`: inventory and frags;
  - `:517`: `research.activeId`;
  - `:425` and `:519`: `starterId`.
- **What happens:** `repairState` now removes records whose catalog id this build doesn't know. At `0d9fc5a` they were
  kept. The probe shows it: a schema-1 save carrying one new equipment item, one new decor item and an unknown research
  project loses all three, and the next autosave would write the reduced save back.
- **Why it matters:**
  - PERSIST-007 has new content added as optional fields with no schema bump.
  - PERSIST-003 only protects saves with a `schemaVersion` above `SCHEMA_VERSION`.
  - So an older build that loads a newer save destroys what was added. ADR-0005 decision 1 ("good saves going forward")
    is meant to prevent that, and a stale build becomes likelier once S1 adds a service worker.
- **Severity:** Minor. PERSIST-011 asks for these checks, so no contract is broken, and nothing ships yet.
- **Fix:** record it for S1 (PERSIST-014) or as an owner question. The choices are:
  - keep unknown but safe ids inert instead of deleting them;
  - require a schema bump whenever a catalog id is added;
  - stamp the writing build in the save header.

**m2. Some repairs change a save without leaving a note** (`migrations.ts:517`, `:425`, `:519`, `:496`, `:513`):
- `research.activeId` is deleted;
- `starterId` and the tutorial's `starterId` are reset;
- a listing's `tankId` is deleted;
- quests without an id are dropped.

Idempotence still holds, but `repairs` understates what changed. **Fix:** add a note for each.

**m3. MKT-016: the test's 3× case asserts a bound the code doesn't guarantee.**
- **Where:** `tests/sim/fix-econ-offline-market-speed.test.ts:38-55`, against `src/sim/economy/listings.ts:1500` (bid expiry)
  and `src/data/buyers.ts:153` (patience 0.1-0.45).
- **At 3×.** A low-patience buyer's bid made early in the 12-game-hour catch-up can have about 148 real seconds left on
  return. The test requires at least 171.
- **Probe, with the test's own world and check:**
  - the test's seeds 11-15: smallest margin 203.9 s, so they pass;
  - seeds 100-159: seed 116 leaves 167.0 s, which fails the check.
- **At 10×.** The code does guarantee it: the minimum possible is about 176 s, and the probe's minimum was 193 s.
- **Risk:** the 3× case passes only because of the seeds it uses. An RNG-stream change could break it
  (OPERATIONS.md §11 names S2's new betta loci).
- **Fix, either:**
  - make the promise hold on return: give every bid made during the catch-up at least `BID_MIN_OPEN_HOURS × scale` from the
    return;
  - or assert the window from creation, and state the bound left on return.

**m4. `mutateFast` isn't safe when nested (`src/game/fastMutate.ts:123-128`, `:133-142`).**
- **The failure:**
  1. A recipe calls `mutateFast` again, and the inner call throws.
  2. The inner `resetFastMutate()` sets `work` to `null`.
  3. The outer recipe catches the error and returns normally.
  4. The outer publish then computes `share(current, null)`, which is `null`, and calls `setGame(null)`.
- **Today:** no caller nests calls.
- **Fix:** return early from `publish` when `work` is `null`, or keep the working copy per call.

**m5. Architecture lock: a new top-level `src` directory is silently treated as `root`**
(`tests/sim/core-architecture-boundaries.test.ts:54-57`).
- **The gap:** such a directory may import any layer, and nothing checks its imports.
- **Today:** every current top-level directory is listed in `ALLOWED` (probe).
- **Risk:** S1 adds hand-written router and platform code, which may get its own directory.
- **Fix:** fail on an unknown top-level directory.

**m6. GEN-013 A1 has no recorded run, and nothing typechecks or tests the command-line script.**
- **The gaps:**
  - `scripts/report-rarity.ts` is outside `tsconfig.json`'s `include` (`:23`);
  - no test runs it;
  - no `npm run report:rarity` run is in the manifest.
- **My probes:**
  - run with the global `tsx`, not `vite-node`: exit 0 twice, with byte-identical output (SHA-256 `593cbf8d…`);
  - the betta row matches the pinned test: 1/9/21/39/170, 9 strains, 3.1% legendary stock;
  - a typecheck with TypeScript 6.0.3 found no error in the script or in `rarityReport.ts` (the only errors came from the
    missing `three` types).
- **Fix:** record the run with `capture-evidence.mjs --command`.

**m7. The fuzz test is blind to two kinds of failure.**
- **Where:** `tests/sim/core-crafted-saves-fuzz.test.ts:97`, `:122-124` and `:105-112`.
- **Refusals.** A load refused with a `SaveError` code counts as success. So "the unmodified fixture loads and runs cleanly"
  would pass even if every load were refused.
- **Caught errors.** An error the breeding and visitor steps catch and log never fails the test.
- **My probes found neither today:**
  - 516 id-field cases, all six names at every site: 0 refusals and 0 caught-and-logged errors;
  - 924 own-key cases: none either.
- **Fix:**
  - assert that no load was refused;
  - spy on `console.warn` and fail on caught simulation errors.

**m8. Open S0 backlog items in this area.** These aren't regressions; each is tracked with Slice S0, and each needs closing
or an explicit deferral before S0 is accepted:
- **B-001.** `loadAndResume` still adopts a half-simulated catch-up. At `src/persistence/offline.ts:385-394`, the comment
  "keep the loaded state as-is" is false.
- **B-005.** The guard's comment stripper mishandles quotes inside regex literals. My cross-check stripped comments with
  the TypeScript parser instead and got the same hit counts and 0 problems.
- **B-118.** `docs/ARCHITECTURE.md:69` still says "any chunk size gives stable results".
- **B-113.** The finer wording of the mutation and RNG rules in the docs still differs from the code.

### Information

- **Null-prototype tables.** PERSIST-011 says "catalog tables have null prototypes". That's true for the id-to-definition
  tables in the diff. Still plain objects: `UNLOCK_RULE_BY_KEY` (`src/data/unlocks.ts:142`), `TUTORIAL_CHAINS`
  (`src/data/quests.ts:194`), and `ARCH_BY_ID` and `SHOW_TIER_BY_KEY` in `src/sim`. After `repairState`, no inherited name
  from a save reaches them (fuzz probes), so there is no defect.
- **Fake timers.** The setup file waits on the global `setImmediate`. A future test that leaves fake timers on past its own
  `afterEach` would hang that hook for 60 s: a loud failure, never a false pass. Capturing the real `setImmediate` when the
  file loads avoids it. The one test that uses fake timers today (`src/render/decor/mergedDecorCache.test.ts`) restores
  them.
- **Large lists.** `migrations.ts:80` passes a whole list as arguments (`splice(0, n, ...kept)`). A crafted list of several
  hundred thousand entries would throw `RangeError`. Oversized lists are PERSIST-004 (S4).
- **`docs/LANES.md`.** Its new banner isn't in `CURRENT_SLICE.md`'s expected files. It is docs-only and agrees with
  `AGENTS.md` and B-113.
- **Untested line.** In `runTick`'s `catch`, `slowedFor = null` has no test. The cost would only be a starvation toast for a
  tick that didn't happen.
- **Fuzz cost.** The new fuzz file adds about 61 s of CPU time to the suite: in the recorded run, 6 tests of 10-20 s each.

## Requirement check

| Req | Change | Named tests: exist, assert the criteria, can fail | Status on this candidate |
|---|---|---|---|
| PERSIST-009 | `fastMutate.ts`: a recipe that throws publishes nothing; `GameLoop.tsx:107-110` | `core-fastmutate-atomic` (3). All three failed on the old code (game-1). | **Not met:** A3 header (B2). A1 and A2 met. |
| PERSIST-010 | `GameLoop.tsx:107-110` | `core-gameloop-publish` (2). Test 1 throws after 2 good slices and fails without `done = 0`. Test 2 (a throwing subscriber) fails without the guard. | Met |
| PERSIST-011 | Scrub and catalog checks in `migrations.ts`; `byId` tables; `findSpecies` by own key | `core-crafted-saves` (5) and the fuzz test (6); recorded passes. Probes go further: exhaustive fuzz, and 46/46 fixtures clean. | Met (m1, m2, m7) |
| PERSIST-012 | `water/step.ts:133` | `fix-water-grace-equipment` (2), with a control. The seeded suites passed in the recorded run. | Met. A3's "and the rest of npm test" waits for a passing unit run. |
| PERSIST-013 | `offline.ts:436-445` | `fix-core-hidden-overlap` (3). `fix-core-offline` changes only the helper, and its assertions are unchanged. | Met |
| MKT-016 | `listings.ts:76-82`: comment only; the code equals the baseline | `fix-econ-offline-market-speed` (3). It catches the 1× regression. | Met on its own seeds (m3) |
| CONST-004 | Fixed `en-US`/`en` locales and a code-unit tie-break in sim text; two guards | Recorded passes. My re-runs of both guards' logic find 0 problems, and the violations equal `BASELINE`. | **Not met:** last clause of A3 (B1). The guards themselves are fine. |
| GEN-013 | `rarityReport.ts`, `report-rarity.ts`, the `package.json` script | `report-rarity` (8). Tiers come from `morphCatalog` and `strainTier`. | Code met. A1 evidence missing (m6). |
| HARNESS-006 | Gate configuration | A1, A2, A4 and A6 met. For A6, `git diff --diff-filter=M` lists exactly `fix-core-offline`, `species-fw` and `species-marine`, with the named edits. | **Not met:** A3 needs `npm test` to pass, and the recorded run exits 1. A5 is B1. |
| HARNESS-022 | `src` and `report-rarity.ts` touch only the "S0 game fixes" files and the rarity tool | No new screen, route or save field, and no `SCHEMA_VERSION` change: `schema.ts` and `src/types` are unchanged. | Met for the diff. The `capture-evidence` record and the acceptance report wait for S0-T12. |
| HARNESS-028 | ADR-0003, ADR-0005 decision 4, ADR-0010 | `protect.mjs` OK; the harness gate-configuration test passes. | Met, given my sign-offs below (M1 open) |
| PERSIST-002 | `repairState` changes | The named tests exist and passed in the recorded run. Probe: a fresh game and the 46 fixtures load with no repairs, and a second repair finds nothing. | Met (S0 part) |
| PERSIST-003 | — | No schema, type, `slots` or `serialize` change. A1 and A2 belong to S1 (PERSIST-014). | The S0 part holds (m1) |
| CONST-001 | `package.json` adds `report:rarity` | The `package-lock.json` diff is empty. No dependency or devDependency changed. | Met. The `capture-evidence` record waits for S0-T12. |

## Gate-defining files: sign-off (master §3.8, HARNESS-028)

| File | Change | ADR | Sign-off |
|---|---|---|---|
| `tsconfig.json` | `include` adds `tests/e2e` and `playwright.config.ts` | ADR-0003 | **Signed off.** Typecheck exited 0 on this tree (recorded). An e2e type error now also fails `npm run build`, as intended. |
| `vitest.config.ts` | `allowOnly: false`; `expect.requireAssertions: true` | ADR-0003 | **Signed off.** Both keys are valid in Vitest 3.2, and the harness gate-configuration test pins them (passes). The added `expect` in `species-fw` and `species-marine` is a real check. |
| `vitest.config.ts` `setupFiles`, and `tests/sim/setup/yield-between-tests.ts` | An `afterEach` that waits for `setImmediate` | ADR-0010 | **Diff signed off.** It changes no test, assertion, timeout, retry or test selection, and adds one event-loop turn per test. The mechanism is right for a long file of short tests. **Not signed off:** ADR-0010's Verification and the "fixed" status of BF-002, both contradicted by the recorded run (B1). The file also needs protection (M1). |
| `playwright.config.ts` | `forbidOnly: true`; `reuseExistingServer` only with `E2E_REUSE=1` | ADR-0003 | **Signed off.** The failure on a busy port wasn't re-run, because Playwright isn't installed here. |
| `package.json` | Adds the `report:rarity` script | ADR-0005 decision 4 (owner's words recorded) | **Signed off.** The dependencies and the lockfile are unchanged, and `vite-node` already runs two other scripts. |

The rest of the scope isn't gate-defining. `.gitignore` is fine: `git check-ignore` shows `.agent-runs/` and `shot.png`
ignored, and evidence logs not ignored, tracked or new. The `README.md` note on `E2E_REUSE` is fine.

## Findings of code-architecture-game-1

| Finding | Status |
|---|---|
| H1: the guards' synchronous file reads fail the gate under load | **Resolved.** Each guard reads once, asynchronously, in `beforeAll`. In the recorded run they took 257 ms and 675 ms. That run's RPC timeout comes from another test (B1). |
| M1: `runTick` re-runs hours that were already published | **Resolved.** `GameLoop.tsx:107-110` zeroes `done` only when nothing was published, and `core-gameloop-publish` test 2 fails without it. |
| M2: traceability and the seeded before/after runs | **Resolved.** `BACKLOG.md` has the "S0 game fixes" table. PERSIST-009 to PERSIST-013, MKT-016 and CONST-004 trace every fix, and the `describe` titles name them; one header is left (B2). The baseline run and the S0-tree run are both recorded, and the seeded suites pass in the S0 run (PERSIST-012 A3). |
| L1: no test catches `done = 0` | **Resolved** by PERSIST-010 test 1. `slowedFor = null` is still untested (information). |
| L2: `fix-core-offline` line no longer tests its comment | **Unchanged, low.** At `:296` the speed check runs before the new clamp, so the call returns null because the card paused the clock, as the comment says. But the clamp would also return null, so the line can't fail on its own. `:293` asserts the pause directly. |
| L3: the determinism guard's patterns are too narrow | **Resolved.** It now catches references, optional chaining, `crypto`, `Intl`, and any `toLocale…()` or `localeCompare` without a literal locale, and its stripper keeps strings. Left: B-005, and `Date()` without `new` (information). |
| L4: the import matrix isn't documented | **Resolved.** `docs/ARCHITECTURE.md:31-51` holds the same table as `ALLOWED`. New gap: m5. |
| L5: PERSIST-004 only partly fixed | **Resolved for S0.** The general scrub covers parent ids, `subjectId`, map keys and dead creatures' `tankId`, and the probes are clean. The rest (enum fields B-004, oversized lists, ranges) is PERSIST-004 in S4. |
| L6: test robustness | **Unchanged, low.** The grace control still uses 400 heaters for 12 h, so a stream change has about a 2% chance of giving zero failures. The crafted-save precondition is still not asserted; it holds today (probe). |
| L7: side effects of the config changes | **Partly resolved.** OPERATIONS.md §6 states the gate rules. `README.md` still doesn't say that `test:watch` needs `--allowOnly`, or that an e2e type error blocks `npm run build`. |
| Information items | The `findSpecies` cost is negligible. Shows ties now break by code unit. The 1× market note is obsolete: `dfc0a13` was reverted, and MKT-016 now keeps the saved speed. |

## Architecture rules

- **Mutation boundary:** every state change in the diff goes through `mutateFast` (game loop, hidden-tab catch-up) or
  repairs a decoded save before `setGame`. There are no UI or render writes.
- **RNG rule:** no new randomness. `water/step.ts` keeps the failure roll and skips only the stuck-heater draw on a failure
  it suppresses. Test seeds are fixed, and the fuzz uses its own mulberry32.
- **Determinism:** no wall clock, unseeded randomness or locale-dependent API in `src/sim` or `src/data`, beyond the
  `newGame.ts` allowance (guard, and my re-run).
- **Layering:** no new cross-layer value import. A re-run of the lock's logic gives exactly the 10 `BASELINE` edges, and the
  TypeScript AST gives the same set.
- **Hygiene:** the diff adds no TODO/FIXME, `.skip`, `.only` or skipIf. No test was deleted or renamed, and no test was
  weakened (HARNESS-006 A6). The test count went from 1,753 to 1,792, which is +39 new tests.

## Gates and evidence

| Gate | In my shell | Recorded on code tree `4d29120a` (this candidate) |
|---|---|---|
| typecheck | Not run (no `node_modules`) | Exit 0 |
| unit | Not run | **Exit 1:** BF-003 failure, plus the BF-002 error (B1) |
| build | Not run | Exit 0 |
| e2e | Not run | None. BF-001 is open; the owner runs it on the Mac. |
| diffCheck | Run: exit 0 | Exit 0 |
| requirementsAudit | Run: exit 0 | Exit 0 |
| protectedFiles | Run: exit 0 | Exit 0 |
| testInventory | Not run (needs npx vitest/playwright) | Exit 0 |
| harnessTests | Only the gate-configuration test: exit 0. The rest is the harness reviewer's. | Exit 0 |

The 8 post-baseline logs' SHA-256 values match the manifest. The owner's Mac runs of unit and e2e are not in this checkout,
and I assume nothing about them.

## Commands run

All ran in `/home/claude/rv/code-architecture-game-2` unless a path says otherwise. `git status --porcelain` was clean
before and after every script. I also used read-only Read and Grep tool calls.

| # | Command | Exit |
|---|---|---|
| 1 | `git status`; `git rev-parse HEAD` | 0 (`fd9ed14…`, clean) |
| 2 | `git diff --stat` and `--name-status 0d9fc5a fd9ed14 -- . ':!docs/agent' ':!scripts/agent' ':!AGENTS.md' ':!CLAUDE.md'` | 0 |
| 3 | `git diff 0d9fc5a fd9ed14 -- <config, src, tests, docs paths>` (several calls) | 0 |
| 4 | `git diff --quiet 0d9fc5a fd9ed14 -- package-lock.json` | 0 (no change) |
| 5 | `git diff --name-status 0d9fc5a fd9ed14 -- .github render.yaml vite.config.ts 'tsconfig*.json' .npmrc` | 0 (only `tsconfig.json`) |
| 6 | `git diff --name-status --diff-filter=M 0d9fc5a fd9ed14 -- tests`; same with `--diff-filter=DR -- tests src` | 0 (3 files); 0 (none) |
| 7 | `git diff --quiet 0d9fc5a fd9ed14 --` the core-gameloop and playthrough-starters tests; same for `src/persistence/schema.ts src/types` | 0; 0 (unchanged) |
| 8 | `git diff 0d9fc5a fd9ed14 -- tests src` piped to `grep` for skip/only markers, and for TODO/FIXME/XXX/HACK | 1; 1 (no match) |
| 9 | `git show 0d9fc5a:src/sim/economy/listings.ts`, `0d9fc5a:src/persistence/offline.ts`, `c774d38:src/persistence/offline.ts`, `c774d38:tests/sim/fix-core-offline.test.ts` | 0 |
| 10 | `node /tmp/cag2-scratch/codetree.mjs <repo> <ref>` for `fd9ed14`, `fe6f674`, `4c1a987`, `b243b23`, `0d9fc5a` (code tree in memory; checks itself against git's own hash; writes no git object) | 0 each (`fd9ed14` → `4d29120a…`, `0d9fc5a` → `454801df…`) |
| 11 | `sha256sum` of the 8 S0 logs | 0 (all match) |
| 12 | `git check-ignore -v` on an evidence log, `.agent-runs/x`, `shot.png` and `some.log`; `--no-index -v` on the evidence log; `--no-index -q` on a new evidence log | 1, 0, 0, 0; 0 (matched by the `!` rule); 1 (not ignored) |
| 13 | `node scripts/agent/check-state.mjs` | 0 (expected branch warning) |
| 14 | `node scripts/agent/protect.mjs` | 0 |
| 15 | `node scripts/agent/diff-check.mjs` | 0 |
| 16 | `node scripts/agent/requirements-audit.mjs` | 0 |
| 17 | `node --test --test-name-pattern="gate configuration" scripts/agent/agent.test.mjs` | 0 (1/1) |
| 18 | `node /tmp/cag2-scratch/detguard.mjs <repo>` (guard logic, and a strip with the TypeScript parser) | 0 (0 problems, 0 disagreements) |
| 19 | `node /tmp/cag2-scratch/archlock.mjs <repo>` (lock logic, and the AST) | 0 (violations = `BASELINE`) |
| 20 | `tsx --tsconfig <repo>/tsconfig.json scripts/report-rarity.ts`, twice | 0, 0 (identical output) |
| 21 | `tsx … /tmp/cag2-scratch/probes/repair-probe.ts` | 0 |
| 22 | `tsx … fuzz-probe.ts`, then with `--all-names` | 0; 0 |
| 23 | `tsx … fuzz-keys-probe.ts` | 0 |
| 24 | `tsx … fixtures-repair-probe.ts` | 0 (46/46 clean) |
| 25 | `tsx … crafted-precondition.ts` | 0 |
| 26 | `tsx --tsconfig /tmp/cag2-scratch/stubs/tsconfig.json mkt016-probe.ts` | 0 |
| 27 | `tsc -p /tmp/cag2-scratch/tc/tsconfig.json` (global TypeScript 6.0.3), twice | 2, 2 (errors only from the missing `three` types) |
| 28 | `node --version`; `ls node_modules` | v22.22.0; `node_modules` absent |

**Not run in my shell:** `npm run typecheck`, `npm test` (and any `npx vitest`), `npm run build`, `npm run e2e`,
`node scripts/agent/test-inventory.mjs`, and the full `node --test 'scripts/agent/*.test.mjs'`. None is reported as passed
here.

Verdict: RED
