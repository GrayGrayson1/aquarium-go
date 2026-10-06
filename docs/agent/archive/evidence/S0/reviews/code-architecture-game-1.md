# S0 review: code-architecture, game half (1)

- **Role:** code-architecture (docs/agent/prompts/ROLE_PROMPTS.md), independent reviewer.
- **Candidate:** `c774d38` on `agent/aquariumgo-local-stack-20261005`. **Base:** `94de6bb`.
- **Scope:** `git diff 94de6bb..c774d38 -- src tests vitest.config.ts playwright.config.ts tsconfig.json README.md`
  (11 source files, 10 test files, 4 config/doc files).
- **Read:** the diff and current files, the old files (`git show 94de6bb:<path>`), every caller of the changed
  functions, docs/agent/CURRENT_SLICE.md, ADR-0002, OPERATIONS.md §6-§11, REQUIREMENTS.json (PERSIST-001..004,
  HARNESS-006), docs/ARCHITECTURE.md, and the S0 manifest. I did not read HANDOFF.md, LEDGER.jsonl or commit messages.
  The slice contract says the approved game fixes are listed in `BACKLOG.md`, but that file doesn't exist (finding M2),
  so I judged each fix on its own merits.
- **Ran:** the full unit suite, the new tests against the old source, probes and typecheck. All of it ran in a detached
  worktree at `/Volumes/Dev/Projects/AquariumGo-review-game`. The worktree is left in place, restored to `c774d38` and
  clean. The probes are in `scripts/_audit/H0-review-game/` (Git-excluded), in that worktree and in the main checkout.
  The machine had other review agents running at the same time (load average 5-7).

## Findings

### H1 (high): the two new guard tests make the unit gate fail when the machine is busy
**Files:** `tests/sim/core-architecture-boundaries.test.ts:82-96, 104-113`; `tests/sim/core-determinism-guard.test.ts:48-58`.

**What's wrong:**
- Both guards scan the source tree synchronously (`readdirSync`, `statSync`, `readFileSync`, `existsSync`).
- The architecture scan `violations()` runs twice, once in each of the `it`s at :104 and :110. Each scan reads every
  `src` file (551 files), with about 3.7k `statSync` and 6.4k `existsSync` calls.
- The cost is all file I/O. The probe `scripts/_audit/H0-review-game/fs-timing.mjs` measured one scan during this review:
  - reading the 551 files took 39 s in the main checkout and 76 s in the fresh worktree (a cold first read cost 70-550 ms per file);
  - the regex work took 9 ms;
  - import resolution took 16-57 ms.
- The blocked worker can't answer Vitest's RPC heartbeat for more than its 60 s timeout. Vitest then records
  `Unhandled Error: [vitest-worker]: Timeout calling "onTaskUpdate"` and **exits 1 even when every assertion passes**.
- In the full run, both scanning tests also hit the 180 s `testTimeout`.

**Evidence (at c774d38):**

| Command | Result | Exit | Time |
|---|---|---|---|
| `npm test` | 1770/1772 passed. The 2 failures are the two scanning tests in core-architecture-boundaries (timeouts), plus 2 unhandled RPC errors | 1 | 516 s |
| `npx vitest run tests/sim/core-architecture-boundaries.test.ts` | 1 timeout and 1 unhandled error | 1 | 424 s |
| The two guards run alone | All 5 tests passed, but 1 unhandled RPC error | non-zero (Vitest fails a run with unhandled errors) | not recorded |

For comparison, the baseline unit gate at `0d9fc5a` passed in 86 s and had none of these tests.

HARNESS-006 exists to make the gates trustworthy. OPERATIONS §8 treats a busy machine as normal operation, and that is
exactly when these tests make the gate red or flaky.

**Fix:**
- Scan once per test file: build the result in a module-level memo or in `beforeAll`, and share it between the `it`s.
- Read files asynchronously with bounded concurrency (`fs.promises.readFile` in batches), so the worker keeps answering RPCs.
- Optionally, list files with `git ls-files` instead of walking the tree.
- Give the two tests an explicit timeout.
- Then re-run the unit gate while the machine is busy.

### M1 (medium): `runTick` re-queues hours it already published when a store subscriber throws, and the clock runs away
**Files:** `src/game/GameLoop.tsx:102-108`; `src/game/fastMutate.ts:123-129`, `:133-142`.

**What's wrong:**
- The `try` in `mutateFast` covers only the recipe. `publish(current)`, which calls `useGame.setGame`, runs after it.
- Zustand stores the new state *before* it calls listeners (`zustand/vanilla.js` `setState`). So if any `useGame.subscribe`
  listener throws, the tick's world has already been published:
  - the listeners include Toasts, tankGuard, TankCreatures, the audio director, `state/ui.ts` and `persistence/offline.ts`;
  - the error still reaches `runTick`'s `catch`.
- The new `catch` sets `done = 0` (its comment says "mutateFast published nothing"), so every simulated hour goes back
  into the backlog. Each later tick simulates those hours again on top of the published state.
- The backlog grows to `MAX_BACKLOG_HOURS`, the world runs many times faster than real time, and the autosave stores
  that state.
- The old code kept `done`, so its accounting was correct.

**Evidence:** probe `scripts/_audit/H0-review-game/probe-subscriber-throw.ts` registers one throwing subscriber and runs
40 ticks of 0.25 s at 1×.

| Code | Game hours advanced (expected 1.0) | Backlog at the end | Errors reported |
|---|---|---|---|
| c774d38 | 20.5 | 1.0 h, still growing | 40 |
| 94de6bb | 1.0 | 0 | 40 |

**Fix:** zero `done` only when nothing was published. For example, in the `catch`:
`if (useGame.getState().game === game) { done = 0; slowedFor = null; }`, where `game` is the value read at the top of
`runTick`. Alternatively, `mutateFast` can catch and report errors thrown by store listeners during `publish`, instead of
rethrowing them as recipe failures. Add a test with a throwing subscriber.

### M2 (medium): the game fixes aren't traceable, and the seeded before/after runs aren't recorded
**Files:** `docs/agent/CURRENT_SLICE.md:30`; `docs/agent/REQUIREMENTS.json:366-382`; OPERATIONS §9 and §11.

**What's wrong:**
- **(a) Missing backlog.** CURRENT_SLICE says the approved game fixes are "listed in `BACKLOG.md`", and OPERATIONS §9 names
  `docs/agent/BACKLOG.md`. That file doesn't exist anywhere in the tree.
- **(b) Missing requirement links.** REQUIREMENTS.json links S0-T8 only to PERSIST-004 and `core-crafted-saves.test.ts`.
  Five behaviour fixes have no requirement or backlog id:
  - atomic `mutateFast` and the `runTick` backlog;
  - the hidden-tab overlap;
  - the offline market at 1×;
  - no equipment failure during the grace period;
  - locale-independent sim text and show tie-breaks.

  The two guard tests have none either, so `requirementsAudit` and `testInventory` can't tie any of them to an approved scope.
- **(c) No seeded before/after runs.** Three changes alter seeded outcomes:
  - `water/step.ts` skips the heater stuck roll on a failure it suppresses during the grace period;
  - `marketTimeScale` changes bid windows and buyer hazard in catch-ups of games saved at 3× or 10×;
  - the shows sort changes how equal scores are placed.

  §11 says to run the seeded suites before and after such a change and record both. The S0 manifest has no runs at all on
  the candidate tree.

**Fix:**
- Add a backlog entry or requirement id for each fix, citing its test.
- Record the before/after seeded-suite runs with `capture-evidence.mjs`.

### L1 (low): no test can tell whether the new `done = 0` / `slowedFor = null` lines are there
**File:** `tests/sim/core-fastmutate-atomic.test.ts:58-73`.

**What's wrong:** the corrupt tank throws in the *first* slice. At that point `done` is 0 in both the old and the new
code, so the backlog assertion passes either way. On 94de6bb the test fails only on the `toBe(before)` identity check.
Deleting the two new lines keeps it green.

**Fix:**
- Add a case where at least one slice finishes before the throw, for example a 1 h backlog plus a background tank that
  throws only when its debt is flushed. Assert that the full amount requested is still in the backlog.
- Add the subscriber case from M1.

### L2 (low): one assertion in `fix-core-offline` no longer tests what its comment says
**File:** `tests/sim/fix-core-offline.test.ts:270`, `:296`.

**What's wrong:**
- The anchor added at :270 is needed and doesn't weaken anything: the P5-09 tests pass on both old and new code.
- But :296, `expect(catchUpAfterHidden(7 * 24 * HOUR)).toBeNull(); // paused by the card`, now returns null because of the
  new `lastTickRealMs` clamp: the first catch-up just reset that timestamp. So it no longer proves that the card paused
  the clock.
- The pause is still asserted directly (`now.clock.speed` is 0), so no coverage is lost.

**Fix:** correct the comment, or move `lastTickRealMs` back before that call.

### L3 (low): the determinism guard's patterns are narrower than the §11 contract
**File:** `tests/sim/core-determinism-guard.test.ts:13-23, 39`.

**What it misses:**
- calls with a non-literal or `undefined` locale: `toLocaleString(undefined, {...})`, `localeCompare(b, undefined, {...})`,
  `localeCompare(String(x))`;
- `toLocaleUpperCase` and `toLocaleLowerCase`;
- `crypto?.` and `performance?.now`;
- `Date.now` and `Math.random` used as references rather than called.

None of these occurs in `src/sim` or `src/data` today (checked with git grep). The guard passes for the right reason
now, but it can miss future regressions. The comment stripper also drops any code after a `//` or `/*` inside a string
literal; there is no such case in sim or data today.

**Fix:**
- Flag every `toLocale\w*\(` or `localeCompare\(` whose locale argument isn't a string literal.
- Widen the other patterns to `\bcrypto\b`, `performance\??\.now` and `Math\??\.random`.

### L4 (low): the architecture lock's allowed-imports matrix isn't written down in ARCHITECTURE.md
**File:** `tests/sim/core-architecture-boundaries.test.ts:1-6, 15-30`.

**What's wrong:** the test header says it encodes "the layering in docs/ARCHITECTURE.md". The document only lists the
layers. These rules exist only in the test:
- `state` may import only `types`;
- `runtime` may not import `state`;
- `persistence` and `game` may import each other (an approved cycle);
- the `app` and `root` layers.

**What works:**
- The parsing fits this codebase. `import type` and `export type` are skipped. An inline `import { type A }` counts as a
  value import, which errs on the safe side. Dynamic `import()` is caught. `import.meta.glob` appears only in
  `src/App.tsx`, which is in the root layer.
- The ratchet works: the BASELINE test proves that all 10 recorded violations are still detected.

**Fix:** put the matrix and BASELINE in ARCHITECTURE.md (or an ADR), so reviewers and the test check the same rules.

### L5 (low): PERSIST-004 is only partly fixed, but the registry says it's fixed
**File:** `src/persistence/migrations.ts:370-399, 427`; `docs/agent/REQUIREMENTS.json:382`.

**What's covered:** keys of `tanks`, `creatures` and `clutches`, and references to tanks.

**What isn't:** other ids read from a save still resolve to inherited `Object` keys:
- clutch `motherId`, `fatherId` and `guardedById`;
- creature lineage parents;
- show entry `subjectId`;
- keys of `visitors.exhibit`, `staff.care` and `shows.tankAwards`;
- the `tankId` of dead creatures.

**Evidence:** probe `scripts/_audit/H0-review-game/probe-clutch-parent-id.ts`.
- A clutch with motherId "constructor" and fatherId "toString" passes `repairState` with `repairs: []`.
- Every clutch step then throws `Cannot read properties of undefined (reading 'generation')`, caught at
  `src/sim/life/breeding/index.ts:154`.
- Over 40 game days that is about 1,600 console warnings per fixture, and the clutch never matures.

This doesn't crash the sim loop. But the registry note "Inherited-key ids ... fixed in S0" overstates what was done.

**Fix:** list the remaining fields in the requirement, so S4 picks them up.

### L6 (low): test robustness
- **`tests/sim/fix-water-grace-equipment.test.ts:33-37`.** The control test depends on the seeded random stream. With
  heater_50w's `failureRate` of 0.0028, about 3.9 failures are expected, so any later change to the stream has roughly
  a 2% chance of giving 0 failures. Use more heaters or a 48 h window.
- **`tests/sim/core-crafted-saves.test.ts:24`.** The test doesn't assert its precondition, an own `"__proto__"` key in
  `s.tanks`. The precondition holds today: on 94de6bb the test fails at exactly that check. Adding
  `expect(Object.hasOwn(s.tanks, '__proto__')).toBe(true)` before `repairState` would keep the test honest if
  `newGame`'s key order changes.
- **`tests/sim/fix-core-hidden-overlap.test.ts:42-47`.** The test reads the wall clock with a 0.5 s tolerance between
  two `Date.now()` calls microseconds apart. That is fine in practice.

### L7 (low, for information): side effects of the config changes
- **`tsconfig.json:23`.** `npm run build` runs `tsc -b`, and the deploy workflow runs `npm run build`. A type error in an
  e2e spec now blocks a deploy. HARNESS-006 intends this, but README or an ADR should say so.
- **`vitest.config.ts:13`.** `allowOnly: false` also applies to `npm run test:watch`, so developers need `--allowOnly`
  to focus a test locally. Playwright's `forbidOnly` (`playwright.config.ts:18`) works the same way. Document both.
- **`playwright.config.ts:37`.** The `E2E_REUSE=1` opt-in is correct and is documented in README, AGENTS and OPERATIONS
  §8. `test-inventory.mjs`'s `playwright test --list` doesn't start a server.

### Information only (no action needed)
- **`findSpecies` cost.** The own-key check costs about 15 ns more per call (15 → 30 ns, measured on the busy machine).
  big_facility makes about 1.8k calls per tick (105k for 4 h of full-fidelity simulation), so that is about 30 µs per
  tick against a 10 ms budget. A null-prototype object or a `Map` would make the extra check unnecessary.
- **PERSIST-001.** All 46 dev fixtures, including big_facility, the playthroughs and core_legacy_v0, go through
  `serializeState` and `migrateSave` with `repairs: []` at c774d38. `capturePhoto` always returns
  `canvas.toDataURL(...)`, i.e. `data:image/...`. Only a zero-size canvas, which gives `"data:,"`, would lose its photo
  with a repair note.
- **Shows.** Ties are now ordered by code unit. This changes the placing of equal scores whose names differ by case or
  diacritics, in future shows only. Past results are already saved and don't change.
- **Market.** Bids created during a catch-up get 1×-scaled windows. After the game resumes at 10×, they run out 10×
  faster in real time, the same as after a live speed change.
- **Rules held.** All state changes in the diff go through `mutate`, `mutateFast` or `setGame`. No randomness was added
  outside `ctx.rng`. The fixes add no new imports between layers. The diff has no TODOs, skips or `.only`.

## Verdict per fix

| # | Fix (files) | Bug real at 94de6bb? | Fix correct, minimal and safe? | Test fails on old, passes on new? | Verdict |
|---|---|---|---|---|---|
| 1 | Ids that are inherited Object keys; species lookup by own key; listing photos that aren't embedded (`src/data/species/index.ts`, `src/persistence/migrations.ts`) | Yes. `findSpecies('constructor')` returned `Object`. `s.tanks['constructor']` and `['toString']` passed `!!s.tanks[id]`. Any photo string was kept. | Yes. Legit saves get no repairs (46 fixtures). The hot path costs about 15 ns more per call. Other ids remain open (L5). | Yes. 3 of 4 tests fail on 94de6bb; the idempotency test passes on both. | GREEN |
| 2 | Atomic `mutateFast`; `runTick` keeps a failed tick's hours (`src/game/fastMutate.ts`, `src/game/GameLoop.tsx`) | Yes. A recipe that threw published its half-done copy. `stepOnce` advances the clock last, so a persistent throw re-stepped the earlier tanks every tick while the clock stood still, and the autosave stored that. | The `mutateFast` change is correct. The `runTick` accounting is wrong when a store listener throws (M1). | Partly. All 3 tests fail on old, but the `done = 0` line isn't tested (L1). | YELLOW |
| 3 | Hidden-tab catch-up covers only time not yet simulated (`src/persistence/offline.ts`) | Yes, though rare. GameLoop is mounted at the app root, so `hiddenAt` is earlier than a load that finishes while the tab is hidden, and the overlap was simulated twice. | Yes. It can only under-simulate if `lastTickRealMs` moves during the hidden spell without simulating; the one case found is an idle-deferred interval autosave up to about 3 s after hiding. | Yes. 2 of 3 tests fail on old (360 vs 36 game h); the control passes on both. | GREEN |
| 4 | Offline catch-up runs the market at 1× (`src/sim/economy/listings.ts`) | Yes. The catch-up converts real time at 1×, but `marketTimeScale` read the saved speed (10× windows, hazard divided by 10). | Yes. `offlineGrace` is set only inside `simulateOffline` and is never published. | Yes. Both tests fail on old. | GREEN |
| 5 | Equipment doesn't fail during the grace period (`src/sim/water/step.ts`) | Yes. This broke the documented grace contract, and it is the only place equipment fails. | Yes. The roll still draws, so the random stream changes only where a failure would have happened. | Yes. The grace test fails on old (1 failure); the control passes on both. | GREEN (record seeded before/after, M2) |
| 6 | Sim text and sorting independent of locale (`facility/actions.ts`, `facility/progression.ts`, `life/morphCatalog.ts`, `shows/index.ts`) | Yes. §11 forbids it in src/sim; log text is part of the stateHash and show placings are saved. | Yes. Now matches the UI's `formatMoney` ('en-US'). | Yes. The guard flags all 4 files on old (×4, ×6, ×2, ×1). | GREEN |
| 7 | Determinism guard (`tests/sim/core-determinism-guard.test.ts`) | n/a | Patterns are narrow (L3); heavy synchronous file I/O (H1). | It detects the old code. | YELLOW |
| 8 | Architecture lock (`tests/sim/core-architecture-boundaries.test.ts`) | n/a | The logic is sound, but the matrix isn't documented (L4), and it fails the gate under load (H1). | The BASELINE ratchet proves detection works. | YELLOW |
| 9 | Gate configuration, S0-T9 (`vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`, `README.md`) | Yes. `reuseExistingServer: true` could test another worktree's server, and e2e specs weren't typechecked. | Yes, with the side effects in L7. | `npm test`: every assertion passes except the H1 timeouts. `npm run typecheck`: exit 0. | GREEN once H1 is fixed |
| 10 | `species-fw` and `species-marine` tests | n/a | Each adds one assertion, needed under `requireAssertions` when a species has no exception rules. Nothing is loosened. | n/a | GREEN |

## Evidence (commands run in the review worktree)
- **`npm test` at c774d38:** 157 of 158 files and 1770 of 1772 tests passed. The 2 failures are
  core-architecture-boundaries timeouts, plus 2 unhandled RPC timeouts. Exit 1, 516 s.
- **`npx vitest run` of the architecture guard alone:** exit 1, 424 s.
- **New tests against the old source.** With `git checkout 94de6bb -- src` in the worktree, running the 7 new or changed
  test files gave 12 failures and 19 passes, exit 1. Every new behaviour test fails as intended:
  - `core-crafted-saves`: 3 of 4 fail;
  - `core-fastmutate-atomic`: 3 of 3 fail;
  - `fix-core-hidden-overlap`: 2 of 3 fail;
  - `fix-econ-offline-market-speed`: 2 of 2 fail;
  - `fix-water-grace-equipment`: 1 of 2 fail;
  - the determinism guard reports 4 files.

  The changed `fix-core-offline` (15 tests) passes on the old code too. The worktree was then restored with
  `git checkout HEAD -- src` and is clean.
- **Probes** (`npx vite-node scripts/_audit/H0-review-game/<probe>`):

  | Probe | Result |
  |---|---|
  | `probe-subscriber-throw.ts` | 20.5 h at HEAD vs 1.0 h on old code (M1) |
  | `probe-repairs-fixtures.ts` | 46 of 46 fixtures load with `repairs: []` |
  | `probe-findspecies-bench.ts` | 15 → 30 ns per call; 1,831 calls per big_facility tick (counted with temporary instrumentation in the worktree, then reverted) |
  | `probe-clutch-parent-id.ts` | L5 |
  | `fs-timing.mjs` | H1 |
- **`npm run typecheck` at c774d38:** exit 0. This includes `tests/e2e` and `playwright.config.ts`, so it meets
  HARNESS-006's typecheck criterion. It took 20 min of wall time for 17 s of CPU; the time went on I/O, as in H1.

Verdict: YELLOW
