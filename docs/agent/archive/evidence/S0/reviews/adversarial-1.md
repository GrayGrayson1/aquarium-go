# S0 adversarial review 1

- **Role:** adversarial (`docs/agent/prompts/ROLE_PROMPTS.md`).
- **Candidate:** `c774d38` on `agent/aquariumgo-local-stack-20261005`. **Base:** `94de6bb`. Candidate code tree
  (`codeTreeOf`): `ec195aca76739360da3d2001de08e51356426528`.
- **Read:** `CURRENT_SLICE.md`, `REQUIREMENTS.json` (S0, ALL, and PERSIST-004 because S0-T8 implements it),
  `OPERATIONS.md`, the diff, and the files it touches or cites. Not read: `HANDOFF.md`, the contents of
  `LEDGER.jsonl`, commit messages, other reviewers' reports.
- **Experiments:** in a detached worktree, `/Volumes/Dev/Projects/AquariumGo-review-adv`. Nothing in the main
  checkout was changed except this file. No branch or tag was created (tags are shared with the main checkout and
  `check-state.mjs` checks them). No remote was touched.
- **Machine load:** the disk was saturated by other agents. One `codeTreeOf(null)` call took 3.5-4.3 minutes at about
  0.05 s of CPU, so each `check-state.mjs` run took about 4 minutes. Don't read performance into any timing below.

## Summary

S0 isn't done, and several things marked DONE aren't backed by the repository.

1. **`check-state.mjs` fails on the candidate:** `docs/agent/PROTECTED.json` was never created. Nothing is
   protected today, although OPERATIONS §10, master §54 and ADR-0003 say the harness files are.
2. **A fully forged S0 acceptance passes `check-state.mjs`, `requirements-audit.mjs`, `protect.mjs` and the harness
   tests** (run B). The checks catch careless tampering (run A, 13 errors) but not edits made with the code open.
3. **The code-tree guarantee stops working as soon as a checkpoint is committed** (a bug in `codeTreeOf(ref)`), and
   in every later slice's ACCEPT state (run C). It can also be pointed at the pre-S0 baseline, so S0 is "accepted" on
   evidence older than every S0 change (run D).
4. **ADR-0002's "Verification" tells the reader to run `scripts/agent/relaunch.mjs --self-test`.** That flag doesn't
   exist; once `check-state.mjs` passes, the command starts the real unattended launcher.
5. **The crafted-save fix is incomplete.** Inherited-key values in `starterId`, a tank's `tierId` and an equipment
   `defId` still make every world step throw, so the game freezes. PERSIST-004's note says inherited-key ids were
   fixed in S0.
6. **Two of the S0 game fixes regress in edge cases:** a store subscriber that throws during a tick now gets that
   tick simulated twice (probe L1), and bids created during a catch-up of a 10× save now last about 14-33 real seconds
   after the player returns, against the promised 3 minutes or more (probe L4). The game-loop half of the "a throwing
   world step publishes nothing" fix has no test that can fail (mutation M1).

The verdict line is the last line of this file: RED.

## Findings

**High** defeats a harness guarantee, makes a DONE claim false, or blocks acceptance. **Medium** is a real hole with
a narrower trigger. **Low** is hardening.

### F1 (High): `check-state.mjs` fails on the candidate, and no file is protected

- Reproduction: in a clean checkout of `c774d38`, `node scripts/agent/check-state.mjs` prints
  `ERROR docs/agent/PROTECTED.json is missing` and `FAILED with 1 error(s)` (exit 1). `protect.mjs` fails the same
  way. `git ls-files` has no `PROTECTED.json`, and it isn't ignored; it was never written.
- So acceptance criterion 1 isn't met, the `protectedFiles` gate can't be GREEN, and `relaunch.mjs` refuses to start.
- Every statement that protection is in force is false at this commit: OPERATIONS §10 ("PROTECTED.json holds the
  SHA-256 of every file…"), master §54, and ADR-0003 ("New: … PROTECTED.json"; "silent rule changes all fail
  check-state.mjs"). Until a baseline exists, the master, OPERATIONS, the ADRs, the prompts and `scripts/agent/` can
  be edited freely, and the first `protect.mjs --update` blesses whatever is there at that moment.
- Fix: record the baseline (`protect.mjs --update --adr <ADR>`) on a commit an independent reviewer has checked,
  commit `PROTECTED.json`, and add a harness test that the committed file exists and verifies clean.

### F2 (High): a forged acceptance passes every harness check (run B)

Starting point: the candidate plus a `PROTECTED.json` baseline (worktree commit `70e1858`; `check-state.mjs` prints
`OK` there). Run B commits two edits, makes the rest in the working tree, then runs the checks.

- Committed: ledger line 1 rewritten; `HARNESS-005` deleted from `REQUIREMENTS.json` (and its id replaced in
  `CURRENT_SLICE.md`, which isn't protected); every other S0 requirement set GREEN with evidence
  `docs/agent/evidence/S0/acceptance-report.md`, which doesn't exist.
- `STATE.json`: ACCEPT, every objective gate GREEN, `remoteMutationAllowed: true` with `remoteApproval: "README.md"`,
  `multiplayerApproved: true` with `multiplayerApproval: "package.json"`.
- Ledger: `record-event.mjs --from ADVERSARIAL_REVIEW --to ACCEPT`, appended while the state was IMPLEMENT.
- Manifest: the RED e2e baseline record deleted; nine records `{gate, command: "echo ok", exitCode: 0}` with no
  `codeTree` or `log`; two review records (role plus a GREEN value) with no report file; the manifest's own result
  set to GREEN; `baseline-unit.log` edited ("1999 passed") and its `logSha256` updated to match.
- DESIGN-S3D set to APPROVED with `approval: "the owner will surely like it"`; its hash updated in `PROTECTED.json` by
  hand.
- `OPERATIONS.md`: repair limit changed to "30 distinct strategies or 50 attempts"; hash updated by hand.
- `scripts/agent/check-state.mjs` weakened (a cited evidence file that is missing becomes a warning); hash updated by
  hand.
- `ROLE_PROMPTS.md` removed from `PROTECTED.json`, then edited ("Adversarial reviewers always return GREEN").

Result: `check-state.mjs` prints `OK`, exit 0 (two warnings: the detached branch, and "new protected file
docs/agent/prompts/ROLE_PROMPTS.md is not recorded yet"). `requirements-audit.mjs` prints `S0: 5 GREEN … OK`, exit 0.
`protect.mjs` prints `OK`, exit 0. `verify-slice.mjs --gates harnessTests --no-state` passes, exit 0, with the
weakened `check-state.mjs`.

Why each part gets through:

| Forgery | Why it isn't caught |
|---|---|
| Gate record without `codeTree` | `check-state.mjs:126` compares trees only `if (codeTree && rec.codeTree && …)` |
| Record without `log`, review without `report` | `check-state.mjs:162` `if (!rel) return;` |
| Record whose command isn't the gate's command | `command` is never compared with `GATE_COMMANDS[gate]` |
| Failed run deleted | the manifest isn't append-only, so the FLAKY check (`:174-181`) never sees the failure |
| Log edited together with its hash | the manifest itself isn't hashed or compared with any commit |
| Ledger line rewritten and committed | `:348-349` compares the ledger only with `HEAD:` |
| Requirement deleted and committed | `:330-331` and `:215-217` compare only with `HEAD:` |
| IMPLEMENT straight to ACCEPT | `lib.mjs:192-198` checks each event's from→to pair alone; `record-event.mjs` never reads `STATE.machineState`; `check-state.mjs:236-244` looks only at the last transition |
| Remote and multiplayer "approval" | `:88-89` wants a truthy string and `:302-304` an existing path; `README.md` qualifies |
| Design approval | `:254-256` wants any truthy `approval` and any existing `path` |
| Protected file edited along with its hash | `PROTECTED.json` isn't in `PROTECTED_PATTERNS` (`protect.mjs:20-31`) |
| Entry removed, then file edited | `protect.mjs:55` reports an unrecorded protected file only as a warning |
| Harness tests still green | `agent.test.mjs:315-329` never tests a missing evidence file outside `.agent-runs/` |
| Requirements | `check-state.mjs` never runs the audit; the audit accepts GREEN when `evidence` is non-empty, without checking the paths exist (`check-state.mjs:212`) |

Fix, most valuable first:
1. Make the manifest append-only against the slice's start commit (as the ledger should be), and require `codeTree`,
   `head`, `log` and `logSha256` on every gate record and `report` and `reportSha256` on every review. Reject a
   record whose `command` isn't `GATE_COMMANDS[gate]`.
2. Compare the ledger, requirements and manifest with the last checkpoint commit (or the slice's start commit), not
   with HEAD. Validate the whole transition chain: each `fromState` equals the previous `toState`. Make
   `record-event.mjs` refuse a transition whose `fromState` isn't `STATE.machineState`.
3. Require `remoteApproval`, `multiplayerApproval` and a design's `approval` to name a file in
   `docs/agent/decisions/` with a matching `owner-decision` ledger event. Protect `PROTECTED.json` itself (record its
   hash in the ledger event `--update` appends, and check it).
4. Treat an existing protected-pattern file that has no recorded hash as an error.
5. Run the requirements audit inside `check-state.mjs` in accepted states, and require GREEN evidence paths to exist.
6. Allow NOT_APPLICABLE on an objective gate in an accepted state only with an ADR reference (BF-001 will need this
   for e2e), and require every gate in `GATE_COMMANDS` to be present in `STATE.gates` (today only six are required,
   `check-state.mjs:96-98`).

All of this is self-attested data, so a determined forger still wins. The real control is an independent agent
re-running the gates on the checkpoint tree; OPERATIONS §6 should say so and make it a checkpoint step.

### F3 (High): after the checkpoint commit, the code-tree check silently stops (run C)

- `evidence.mjs:23-35` builds the tree of a commit by `git read-tree <ref>` into a throwaway index, then
  `git rm -r --cached -q --ignore-unmatch -- docs/agent AGENTS.md CLAUDE.md`. `git rm --cached` refuses (exit 1) when
  the index copy differs from both HEAD and the working file, which is true for every `docs/agent` file that changed
  since `<ref>`. So `codeTreeOf(<older commit>)` throws. Shown directly: `read-tree c774d38` in the worktree, then the
  same `git rm` fails on `docs/agent/LEDGER.jsonl`; with `-f` it returns the right tree.
- `check-state.mjs:318-323` computes `codeTreeOf(s.lastAcceptedCheckpoint)` in accepted states, turns the throw into
  the **warning** "could not compute the code tree", leaves `codeTree` null, and `:126` then skips every tree
  comparison.
- Run C follows OPERATIONS §6: a "checkpoint" commit whose manifest records every gate on the pre-S0 tree `454801df`,
  then a bookkeeping commit that sets `lastAcceptedCheckpoint` and records ACCEPT → CHECKPOINT. `check-state.mjs`
  prints the warning and `OK`, exit 0. Control: the same records with `lastAcceptedCheckpoint` = HEAD (a tree that can
  be computed) give eight errors, "gate X passed on code tree 454801df2c, not the current ec195aca76".
- So the guarantee holds only in S0's ACCEPT state, where `lastAcceptedCheckpoint` is still null and the working tree
  is used. In CHECKPOINT, COMPACT, HANDOFF and NEXT_SLICE, and in ACCEPT for S1-S4 (where `lastAcceptedCheckpoint`
  still names the previous slice's checkpoint), no tree is checked. `relaunch.mjs` `decide` looks only at errors, so
  it carries on.
- Separately, even if `codeTreeOf` worked, ACCEPT in S1-S4 would compare the new slice's evidence with the previous
  slice's checkpoint tree and reject correct evidence.
- Fix: `git rm -r --cached -f …` in `codeTreeOf`, and a failure is an error in accepted states. In ACCEPT compare with
  the working tree. From CHECKPOINT on, compare with `codeTreeOf(lastAcceptedCheckpoint)` and also require it to equal
  `codeTreeOf(HEAD)` (bookkeeping commits must not change code). Add a harness test for `codeTreeOf` on an older commit
  whose `docs/agent` differs.

### F4 (High): `lastAcceptedCheckpoint` can point anywhere in history (run D)

- `check-state.mjs:296-301` checks only that `lastAcceptedCheckpoint` is a commit and an ancestor of HEAD; not the
  `checkpoint/S<n>-*` tag, not that its code tree equals HEAD's, not that it belongs to this slice.
- Run D: STATE in ACCEPT with `lastAcceptedCheckpoint = 0d9fc5a` (the pre-harness baseline); typecheck, unit, build
  and diffCheck GREEN; the other objective gates NOT_APPLICABLE; two GREEN review files the builder wrote itself;
  manifest GREEN; the ACCEPT transition appended. `check-state.mjs` prints `OK`, exit 0, in 14 s. The four baseline
  records (tree `454801df` = `codeTreeOf(0d9fc5a)`) "match". None of S0's code (game fixes, `scripts/agent/`, config
  changes) was ever gated.
- Fix: F3's fix, plus: once the state is CHECKPOINT or later, `lastAcceptedCheckpoint` must carry the current slice's
  checkpoint tag; before that it must be null or the previous slice's tagged checkpoint.

### F5 (High): ADR-0002 tells readers to run a launcher flag that doesn't exist

- ADR-0002, "Verification": "The launcher's stop conditions are unit-tested by
  `scripts/agent/relaunch.mjs --self-test`."
- `relaunch.mjs:195` treats only `--dry-run` and `--help` as booleans. `--self-test` becomes `selfTest: true`, which
  nothing reads, and `main()` carries on to spawn `claude -p … --permission-mode auto` sessions when the pre-flight
  passes. Today the pre-flight fails only because of F1. Once F1 is fixed, following the ADR's own verification step
  starts the unattended launcher.
- The stop conditions are actually tested by `node --test scripts/agent/agent.test.mjs` ("relaunch: stop conditions,
  alarms first").
- ADR-0002 is accepted and protected. Fix: a superseding ADR that corrects the line, and make `relaunch.mjs` reject
  unknown flags.

### F6 (High): inherited-key ids still crash the sim loop (PERSIST-004's note is false)

- `REQUIREMENTS.json` PERSIST-004 note: "Inherited-key ids and non-embedded listing photos fixed in S0 (S0-T8)".
  Acceptance: "Ids such as __proto__, constructor and toString are rejected or repaired".
- Probe F-1 (`zz-adv-crafted-fuzz.test.ts`): take the `shows-hall` fixture (big facility with staff and shows), set
  each id-like field (13 kinds: every string key ending in `Id`, first element of every `…Ids` array) to each of
  `__proto__`, `constructor`, `toString`, `hasOwnProperty`, `valueOf`, load it through the real path
  (`decodeRecord` → `migrateSave` → `repairState`), then `advanceWorld` 6 h and `mutateFast` twice. Results:
  - `starterId`: loads, then every world step throws "specs is not iterable" (5/5 values);
  - `tanks.<id>.tierId`: loads, then throws "Cannot read properties of undefined (reading 'l')" (5/5);
  - `tanks.<id>.equipment[n].defId`: loads, then throws "Cannot read properties of undefined (reading
    'failureRate')" (5/5);
  - the other 10 field kinds load and step without error, and no prototype was polluted.
- Cause, the same bug class S0 fixed for species: `migrations.ts:220` validates the tier with
  `!TANK_TIER_BY_ID[t.tierId]`, which `constructor` and `toString` pass (an ordinary unknown tier is repaired to
  `g20L`); `getEquipmentDef` (`src/data/catalog/equipment.ts:435-438`) does a plain `EQUIPMENT_BY_ID[id]` lookup, and
  repairState doesn't check equipment `defId` at all (`migrations.ts:233` only drops non-objects); `starterId` is only
  defaulted when missing (`migrations.ts:366`), and `src/sim/aquascape/starters.ts:274` reads
  `STARTER_LAYOUTS[state.starterId] ?? …`, which returns `Object` for `constructor`. The same `MAP[id] ?? default`
  pattern is in `src/sim/facility/progression.ts:1115` and `src/data/quests.ts:173`.
- With S0's atomic `mutateFast`, each failing tick publishes nothing, so the game freezes rather than corrupting:
  every tick logs an error and the clock never moves.
- Also: dead and sold creatures keep an inherited-key `tankId` (`repairState` only clears it for alive and listed
  ones); probe F-3 shows it is kept as-is. The sim survives it; any UI lookup `tanks[c.tankId]` for such a creature
  gets `Object.prototype`.
- Probe F-2: an own `__proto__` key in all 4,288 objects of the save loads, steps and publishes without polluting a
  prototype. That part of the fix holds.
- Fix: one shared own-key lookup for every catalog map (`Object.hasOwn`, or `Object.create(null)` maps), validation of
  `starterId` and equipment and decor `defId` in `repairState`, the dead and sold `tankId` case, and a test that runs
  this fuzz over every id field.

### F7 (Medium): the game-loop half of the atomic-step fix is untested, and adds a double-simulation path

- Mutation M1: delete `done = 0;` and `slowedFor = null;` from the catch in `GameLoop.tsx:102-108`, then run
  `tests/sim/core-fastmutate-atomic.test.ts`: 3/3 pass. The runTick test can't fail for that change: `want` is
  0.025 h, one slice, which throws before `done += slice` runs (`GameLoop.tsx:93-96`), so `done` is 0 either way.
  Control M2 (make `mutateFast` publish on throw again): 3/3 fail. The `fastMutate.ts` half is tested; the
  `GameLoop.tsx` half isn't.
- Probe L1 (`zz-adv-subscriber.test.ts`): the catch assumes "mutateFast published nothing", but `publish(current)`
  (`fastMutate.ts:129`) runs outside the `try`, and zustand calls subscribers after it has already stored the new
  state (`setGame`, `fastMutate.ts:142`). A subscriber that throws once: tick 1 advances 0.025 h **and** returns a
  backlog of 0.025 h; after tick 2 the clock has moved 0.075 h instead of 0.050 h. With the pre-S0 `GameLoop.tsx`
  (mutation M3), the same probe gives 0.050 h. Subscribers on `useGame` include HUD toasts, the focused-tank guard and
  the audio director (`src/ui/hud/Toasts.tsx:195`, `src/ui/hud/tankGuard.ts:65`, `src/audio/director.ts:219`), which
  run arbitrary code on game data: exactly the corrupted-data case S0 is guarding against.
- Fix: in `mutateFast`, publish inside its own `try` and report whether the store changed (for example return
  `{ result, published }`), and only reset `done` when nothing was published. Add a test whose second slice throws,
  and one with a throwing subscriber.

### F8 (Medium): bids created during a 10× save's catch-up last a tenth of the promised time (regression)

- `listings.ts:82-86` now returns scale 1 during the grace catch-up. Bid windows are fixed in game hours when the bid
  is created (`listings.ts:1500`), and the game resumes at the saved speed when the welcome-back card is dismissed.
- Probe L4 (`zz-adv-market.test.ts`): five axolotl worlds saved at 10× with three listings each, 6 real hours away.
  72 bids created during the catch-up are still open on return; at 10× they expire 14-33 real seconds after play
  resumes. The promise (`BID_MIN_OPEN_HOURS`, the comment on `marketTimeScale`) is 180 real seconds at any speed.
  With the line reverted (mutation M3) the same bids last 221-365 real seconds.
- So the change fixes the catch-up itself (as its test shows) and breaks the moment the player comes back, which is
  when they read the "N new bids" card.
- Fix: when the grace ends (`offline.ts:256-258`), stretch the remaining window of every bid, hold and counter-offer
  created during the catch-up by `marketTimeScale` of the resumed state; or keep windows in real time. Add the probe
  as a test.

### F9 (Medium): the load-time catch-up still publishes a half-simulated world

- The S0 comment in `fastMutate.ts:109-113` says a world step that fails part-way "must never become the game state,
  be built on by the next tick, or be autosaved". `loadAndResume` (`offline.ts:386-397`) runs `simulateOffline` on
  the loaded state in place and, when it throws, keeps that state, sets `lastTickRealMs = now` and publishes it.
- Probe L2: two tanks, the second with `water: null`; `simulateOffline(g, 3 h)` throws ("Cannot read properties of
  null (reading 'lab')") after the clock and the first tank have already moved, and the second tank's sim debt was
  zeroed before it threw (`world.ts:75-77`). That is what `loadAndResume` would publish and autosave, and the rest of
  the absence is lost.
- Fix: run the load-time catch-up on a copy (or `structuredClone` first) and fall back to the untouched loaded state.

### F10 (Medium): tests that should fail can still pass the gates

Probe files run with the project's own config (`requireAssertions: true`, `allowOnly: false`):

| Probe | Result | Seen by `test-inventory.mjs`? |
|---|---|---|
| V1 test with no assertion | fails ("expected any number of assertion, but got none") | n/a (gate fails) |
| V6 `it.only` | fails ("Unexpected .only modifier") | n/a |
| V12 `expect.assertions(0)` and nothing else | fails | n/a |
| V2 vacuous `expect(true).toBe(true)` | **passes** | no (listed, no marker) |
| V3 `it.fails(…)` around a failing assertion | **passes** | no: listed by `vitest list`, and `SKIP_RE` doesn't match `.fails(` |
| V5 runtime skip from the context (`({ skip }) => skip()`) | **skipped, run passes** | no: listed, no marker |
| V4 `it.skip (…)` with a space | skipped, run passes | only as a "disappeared" test, and only if a baseline inventory exists |
| V7 `describe['skip'](…)` | skipped, run passes | same as V4 |

- `SKIP_RE` (`test-inventory.mjs:21`) found 0 of these four forms; its only hit in the probe file was the text
  `.skip(` inside a comment (it doesn't strip comments).
- At S0 there is no earlier inventory: `previousInventoryPath('S0')` (`:95-102`) returns S0's own file, which doesn't
  exist, so the `testInventory` gate exits 0 with "no earlier inventory to compare against" (`:116-118`). Once one
  exists, `--write` (`:109-114`) overwrites it at any time and its hash isn't recorded anywhere. ADR-0003 says
  `evidence/S0/test-inventory.json` exists; it doesn't.
- The harness tests (`scripts/agent/*.test.mjs`) aren't inventoried (`:62` scans only `tests/` and `src/`).
- The gate-defining files that make HARNESS-006 true (`vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`,
  `package.json` scripts) aren't in `PROTECTED_PATTERNS`, although master §3.8 says they need an ADR and a reviewer's
  sign-off. Turning `requireAssertions` off, adding `retry`, or narrowing `"test": "vitest run"` trips no harness
  check, and the inventory stays green because `vitest list` reads the config, not the npm script. HARNESS-006 has no
  test that fails if its configuration is reverted.
- Master §35's other alarms (dropping assertion counts, retries, regenerated snapshots) aren't implemented.
- Fix: add `\.fails\s*\(`, `\.(skip|only|todo|fixme)\s*\(`, `\[\s*['"](skip|only|todo|fails)['"]\s*\]` and a context
  `skip(` to `SKIP_RE`, and strip comments first; record a baseline inventory at `0d9fc5a`; hash the inventory in the
  manifest and refuse `--write` over an accepted slice's file; compare the unit gate's executed test count with the
  inventory; inventory the harness tests; protect the gate-defining files; add a harness test that reads
  `vitest.config.ts` and `playwright.config.ts` and fails if the HARNESS-006 settings are gone.

### F11 (Medium): reviews aren't tied to a tree, and a report can be recorded with the opposite result

- `check-state.mjs:129-142` accepts any GREEN `code-architecture` review for `independentReview` and, per required
  role, only checks that the last review is GREEN. No review's `codeTree` is compared with the gates' tree (probe
  P15). OPERATIONS §7 "After any repair, a new reviewer instance reviews the new tree" isn't enforced.
- `capture-evidence.mjs:29-31` accepts the recorded value if the word "verdict" followed by that value appears
  anywhere in the report. Probe P12: a report that quotes the brief's instruction (the three allowed final lines) and
  ends with a RED line can be recorded as GREEN. (This report avoids that phrasing on purpose.)
- Fix: read the value only from the last non-empty line; store each review's `codeTree` and require it to equal the
  accepted tree.

### F12 (Medium): reviewers are given the builder's narrative by design

- OPERATIONS §7 and `ROLE_PROMPTS.md` say a reviewer never sees `HANDOFF.md`. `README_FIRST.md` and OPERATIONS §1 say
  builder and reviewer subagents get the context pack, and `context-pack.mjs:45` and `:64-65` paste the whole
  `HANDOFF.md` into it.
- Fix: a reviewer mode without the handoff (or keep the handoff out of the pack and give it to builders separately).

### F13 (Medium): the bootstrap check takes the session's word for who it is

- `bootstrap-check.mjs:59-62` compares the assertion's own `sessionId` with the session that recorded the closing
  NEXT_SLICE transition. The closing session passes by writing any other string (P13), and the check is skipped when
  that transition was recorded with `session: null` (P13b). HARNESS-002's third acceptance criterion holds only for an
  honest session.
- `expectedSha` is compared only with HEAD (`:46`), never with what the handoff says HEAD should be, so it proves
  nothing.
- Fix: read `process.env.CLAUDE_CODE_SESSION_ID` inside `bootstrap-check.mjs` and require it to differ; take the
  expected SHA from the handoff's generated block.

### F14 (Low): repair limits reset by renaming the defect

- `check-state.mjs:186-193` counts repair events only for the current `repairTarget`. Four logged attempts on
  `D-S0-1`, then STATE names `D-S0-2` with counters at 0: no error (P18). OPERATIONS §5 "a defect's counters reset
  only when its gate goes GREEN" isn't checked.
- Fix: a defect's counters may only be cleared by a GREEN run of its gate after its last repair event; flag a new
  defect id on the same gate while the old one is open.

### F15 (Low): the hidden-tab catch-up is skipped when the wall clock steps back

- `offline.ts:438-440`: `sinceTick = max(0, Date.now() - lastTickRealMs)`. Probe L3: 60 minutes hidden, and
  `lastTickRealMs` 10 minutes ahead of the clock (a clock corrected backwards after the last tick): no catch-up at
  all, although the 60 minutes were real.
- Fix: when `lastTickRealMs` is in the future, fall back to `hiddenMs`.

### F16 (Low): relaunch's push detection and deny rules are easy to step around

- `relaunch.mjs:118-126` counts "update by push" entries in `refs/remotes/*` reflogs. `git push <url> <ref>` updates
  no remote-tracking ref, so it leaves no entry and the remote list is unchanged; a new branch pushed with
  `-c core.logAllRefUpdates=false` gets no reflog either. The deny rules (`:33-69`) match command prefixes, so
  `git -C . push`, `env git push` or `/usr/bin/git push` aren't matched. (Argued from the code; not run, because the
  brief forbids touching a remote.) The file header calls the rules a guard rail; REL-001's second acceptance criterion
  relies on the reflog check, which isn't reliable.
- Fix: also compare read-only `git ls-remote` output for the deploy branches before and after each session, and the
  owner-approved `pre-push` hook the ADR mentions.

### F17 (Low): `codeTreeOf` is slow, computed before the command runs, and accepts a dirty tree

- Each call stages every file into an empty index, so git must read and hash the whole tree: `git add -A` alone took
  3 min 26 s during this review. `verify-slice.mjs` calls it once per gate (nine times for a full run), and
  `check-state.mjs` and `capture-evidence.mjs` once per run.
- `evidence.mjs:99-101` takes `head`, `dirty` and `codeTree` before spawning the command, so edits made while a gate
  runs are recorded against the earlier tree.
- Records with `dirty: true` are accepted at acceptance (P20), so a GREEN gate can depend on an untracked file that is
  never committed; with F3, nothing then compares the committed checkpoint with the tested tree.
- Fix: seed the throwaway index from a copy of `.git/index` (stat data makes `add -A` cheap); compute the tree before
  and after the command and refuse GREEN when they differ; require a clean tree for records used at acceptance.

### F18: S0 claims the repository doesn't back

| Claim | Where | What the repository has |
|---|---|---|
| "New: … `BACKLOG.md`; `PROTECTED.json`; `evidence/S0/` (baseline, baseline failures, reviews, test inventory)" | ADR-0003, Decision | No `BACKLOG.md`, no `PROTECTED.json`, no `test-inventory.json`; `evidence/S0/reviews/` is not in the candidate commit |
| "The full results are in `docs/agent/evidence/S0/reviews/`" (fifteen reviewers) | ADR-0003, Context | Not in the candidate commit |
| "… vanished tests and silent rule changes all fail check-state.mjs" | ADR-0003, Consequences | `check-state.mjs` never runs the inventory; nothing is protected (F1); the rest only in the careless form (F2) |
| "`npm run typecheck` and `npm test` pass on the changed configuration" | ADR-0003, Verification | No run on any post-baseline tree is recorded in `evidence/S0/manifest.json`; every record is on the pre-S0 tree `454801df`. My runs on the candidate's code (worktree, tree `ec195aca7`): `npm run typecheck` exit 0; `npm test` 158 files and 1,772 tests passed but **exit 1**, from one Vitest worker error ("Timeout calling onTaskUpdate") under the disk load. That's environmental, but `verify-slice.mjs` would record the gate RED, and a passing re-run on the same tree counts as FLAKY |
| "Independent code-architecture and security-data reviews of this diff" | ADR-0003, Verification | None recorded (S0-T10 PENDING) |
| "unit-tested by `relaunch.mjs --self-test`" | ADR-0002, Verification | No such flag (F5) |
| "`check-state.mjs` validates the registry, state and ledger" | ADR-0002, Verification | It fails on the candidate (F1) |
| "BACKLOG B-003" | OPERATIONS §8 | No backlog file |
| "At acceptance, check-state.mjs checks that every gate passed on exactly the tree of the checkpoint commit" | OPERATIONS §6 | Not after the checkpoint (F3); redirectable (F4); skipped when a record has no tree (F2) |
| "a test that asserts nothing or a focused test can't produce a passing gate" | OPERATIONS §6 | True for exactly those two cases (V1, V6); inverted and skipped tests pass (F10) |
| "check-state.mjs flags [a flaky gate]" | OPERATIONS §6 | Only while the failed record is still in the editable manifest (P5) |
| S0-T4 DONE (test inventory, protected files, bootstrap check) | CURRENT_SLICE | Scripts exist; neither baseline exists (F1, F10); the bootstrap check trusts the session (F13) |
| S0-T7 DONE (harness documents made consistent) | CURRENT_SLICE | F5, F12 and the rows above are inconsistencies that remain |
| S0-T9 DONE (required assertions, no focused tests) | CURRENT_SLICE | Effective for those two cases; not protected and not tested (F10) |
| "the files of each approved game fix (listed in `BACKLOG.md`)" | CURRENT_SLICE, Expected files | No backlog file |
| Inherited-key ids "fixed in S0 (S0-T8)" | REQUIREMENTS PERSIST-004 note | Three id fields still crash the loop (F6) |
| Governing requirements | CURRENT_SLICE | S0-T8 implements PERSIST-004, which isn't in the list (it's an S4 requirement). PERSIST-001/002/003 are listed but have no test (PERSIST-003 none at all; PERSIST-001 needs a committed v0.4.0 fixture save that doesn't exist), and `requirements-audit.mjs` never checks `ALL` requirements |
| Every master §9 bullet, design subsection, §19 area and §20 test maps to a requirement | CURRENT_SLICE, acceptance | 23 of the 38 test files named in design §20 aren't named by any requirement; NAV, GEN, MKT and AUTO are single umbrella entries whose acceptance refers to sub-requirements that don't exist yet (S0-T6 is IN PROGRESS, so expected, but not met) |
| RNG-stream changes run the seeded suites before and after and record both | OPERATIONS §11 | `water/step.ts` (one fewer draw per would-be heater failure during grace) and `marketTimeScale` (different hazards during catch-up) change catch-up streams; no before/after runs are recorded |

## Bypass attempts

"Caught" means the named script exits non-zero with an error that names the problem. Runs A (careless tampering), B
(forged acceptance), C (after the checkpoint) and D (baseline evidence) are full runs of `check-state.mjs` in the
worktree. P-numbers are isolated calls of the exported validators (`.adv-review/pure.mjs`, `pure2.mjs`). V-numbers
are the test probes in F10.

| # | Attempt | Result |
|---|---|---|
| 1 | Gate set GREEN by hand, no recorded run (A) | Caught |
| 2 | Gate set GREEN by hand, record on an old tree, state IMPLEMENT (A) | Warning only, exit 0 (by design before acceptance) |
| 3 | Same in ACCEPT, where the tree can be computed (C control, P1b) | Caught |
| 4 | Gate records with no `codeTree` or `log`, in ACCEPT (B, P1) | **Not caught** |
| 5 | Gate record whose command is `echo ok` or `true` (B, P19) | **Not caught** |
| 6 | Objective gates set NOT_APPLICABLE by hand in ACCEPT (D, P2) | **Not caught** |
| 7 | Harness gates removed from `STATE.gates` (P2c) | **Not caught** |
| 8 | Evidence from another code tree via `lastAcceptedCheckpoint` = baseline (D) | **Not caught** |
| 9 | Evidence from another code tree after the checkpoint commit (C) | **Not caught** (warning "could not compute the code tree") |
| 10 | Hashed log edited (A) | Caught |
| 11 | Hashed log edited, hash in the manifest updated (B, P4) | **Not caught** |
| 12 | Evidence log in an ignored path (A) | Caught |
| 13 | RED run deleted so the FLAKY alarm can't fire (B, P5) | **Not caught** |
| 14 | Review record with no report file (B, P3) | **Not caught** |
| 15 | GREEN reviews from an older tree (P15) | **Not caught** |
| 16 | Report ending in RED recorded as GREEN (P12) | **Not caught** |
| 17 | Ledger line rewritten, uncommitted (A, P7a) | Caught |
| 18 | Ledger line rewritten and committed (B, P7b) | **Not caught** |
| 19 | Ledger line deleted and committed (P7c) | **Not caught** |
| 20 | IMPLEMENT → ACCEPT appended (A, P8c) | Caught |
| 21 | ADVERSARIAL_REVIEW → ACCEPT appended while in IMPLEMENT (B, D, P8a-b) | **Not caught** |
| 22 | Requirement deleted, uncommitted (A, P6a) | Caught |
| 23 | Requirement deleted and committed (B, P6b) | **Not caught** |
| 24 | S0 requirements DEFERRED with a made-up ADR, or GREEN with evidence that doesn't exist (P6c-e) | **Not caught** (by `requirements-audit.mjs` either) |
| 25 | `remoteMutationAllowed` with no `remoteApproval` (A) | Caught |
| 26 | `multiplayerApproval` naming a missing file (A) | Caught |
| 27 | `remoteApproval: "README.md"`, `multiplayerApproval: "package.json"` (B, P9) | **Not caught** |
| 28 | DESIGN-S3D APPROVED with no approval (A) | Caught |
| 29 | DESIGN-S3D APPROVED with free-text approval, registry hash updated by hand (B, P10) | **Not caught** |
| 30 | Protected file edited, nothing else (A; needs a `PROTECTED.json`) | Caught |
| 31 | Protected file and its hash in `PROTECTED.json` edited (B) | **Not caught** |
| 32 | Entry removed from `PROTECTED.json`, then the file edited (B, P11) | **Not caught** (warning) |
| 33 | `protect.mjs --update --adr` with an ADR the agent wrote | **Not caught** (`protect.mjs:76-81` checks only the path's shape and that it exists) |
| 34 | Any protected file edited at the candidate today | **Not caught** (no `PROTECTED.json`, F1); `check-state.mjs` fails for that reason only |
| 35 | `check-state.mjs` weakened while `harnessTests` stays green (B) | **Not caught** |
| 36 | Defect renamed to reset repair counters (P18) | **Not caught** |
| 37 | Bootstrap assertion from the closing session with a new `sessionId` (P13) | **Not caught** |
| 38 | Tests deleted, then `test-inventory.mjs --write` (P17; at S0 there's no baseline anyway) | **Not caught** |
| 39 | Test with no assertion; `.only`; `expect.assertions(0)` (V1, V6, V12) | Caught (the unit gate fails) |
| 40 | Vacuous test (V2) | **Not caught** (no tool can) |
| 41 | `it.fails` around a failing assertion; runtime `skip()` (V3, V5) | **Not caught** (gate passes, inventory sees nothing) |
| 42 | `it.skip (` with a space; `describe['skip']` (V4, V7) | **Not caught** at S0; would show as a disappeared test once a baseline inventory exists |
| 43 | `requireAssertions` or `allowOnly` turned off, or `npm test` narrowed in `package.json` (F10) | **Not caught** (argued from `PROTECTED_PATTERNS` and `GATE_COMMANDS`; not run) |

## What held up

- Every careless form of tampering in run A was caught with a clear message (13 errors, exit 1).
- The baseline evidence is consistent: every cited log matches its hash, and the recorded tree `454801df` is exactly
  `codeTreeOf(0d9fc5a)`.
- `git show 94de6bb --stat` lists the 18 owner files, as ADR-0002 says.
- The harness tests pass (33/33). The `claude` flags `relaunch.mjs` uses exist in the installed CLI.
- `requireAssertions` and `allowOnly: false` work as configured (V1, V6, V12).
- `mutateFast` atomicity is tested (M2 fails 3/3). The tests for the hidden-overlap, market-scale, equipment-grace and
  crafted-key fixes assert the fixed behaviour directly (checked by reading them, not by mutation). An own
  `__proto__` key anywhere in a save pollutes nothing (F-2).
- The changed P5-09 test (`fix-core-offline.test.ts`) keeps its intent: its new setup only makes the world's last tick
  precede the hidden spell.
- `npm run typecheck` passes on the candidate's code, now including `tests/e2e` and `playwright.config.ts`. All
  1,772 unit tests in 158 files pass (the run's exit 1 came from a Vitest worker timeout, see F18).
- The candidate has 1,772 tests in 158 files: the baseline's 1,753 in 151 plus 19 new ones in 7 new files, and the
  diff deletes no test.

## Reproductions

Everything is in `/Volumes/Dev/Projects/AquariumGo-review-adv/.adv-review/` and touches only that worktree.

- `util.mjs` (helpers); `pure.mjs`, `pure2.mjs` (P1-P20; `node <file>`).
- `runA.mjs`; `runB.mjs commit` then commit, then `runB.mjs work`; `runC.mjs accept <sha>` / `runC.mjs bookkeeping`;
  `runD.mjs`. Each starts from the worktree commit `70e1858` (the candidate plus a `PROTECTED.json` baseline), followed
  by `node scripts/agent/check-state.mjs`.
- `tests/zz-adv-*.test.ts`: copy into `tests/sim/` and run `npx vitest run tests/sim/<file>`. Don't run
  `npx vitest list --json <file>`: Vitest takes the path as the JSON output file and overwrites it.
- Mutations: M1 deletes `done = 0;` and `slowedFor = null;` in `GameLoop.tsx`; M2 replaces `resetFastMutate();` with
  `publish(current);` in the `mutateFast` catch; M3 is M1 plus deleting `if (state.offlineGrace) return 1;` in
  `listings.ts` (the pre-S0 behaviour for L1 and L4). `runprobes.sh` (M1, M2 and the probes) and `runmut2.sh` (M3)
  have the commands; each restores the files it mutates.

## Worktree

`/Volumes/Dev/Projects/AquariumGo-review-adv` is left in place, detached at `70e1858` with the untracked folder
`.adv-review/`. Commits `70e1858`, `c85ff9c`, `d568022` and `4f66259` exist only there (no branch or tag points at
them). Remove it with `git worktree remove --force /Volumes/Dev/Projects/AquariumGo-review-adv` when done.

Verdict: RED
