# S0 review: security-data (instance 2)

- **Role:** security-data (`docs/agent/prompts/ROLE_PROMPTS.md`). I'm a fresh subagent and didn't build any of the
  reviewed work. Everything was read-only except this file and throwaway copies under `/tmp/sd2-scratch/`, which live
  in the reviewer's container, aren't committed and have no worktree.
- **Candidate:** `fd9ed1489e3296c9d496cac3fe9ec0e60958d78d`, detached worktree at `/home/claude/rv/security-data-2`.
  - **Base:** `0d9fc5a46085f746510a1041335632cd4f7314a2` (v0.4.0).
  - **Candidate code tree** (`codeTreeOf`; docs/agent, AGENTS.md and CLAUDE.md removed):
    `4d29120aca765409be362299865ac7bfa0617a09`. I recomputed it from `git archive fd9ed14`. The S0 gate runs recorded
    in the manifest ran on this same tree.
  - When the orchestrator records this review, the tree it records should be this one.
- **Read:** AGENTS.md; the reviewer context pack `/home/claude/rv/CONTEXT_PACK.reviewer.md`; `CURRENT_SLICE.md`;
  `OPERATIONS.md`; `docs/ARCHITECTURE.md`; the diff and the current files.
  - Evidence: `manifest.json`, `logs/`, `baseline-failures.json`, `PROTECTED.json`.
  - From the diff: the `REQUIREMENTS.json` and `BACKLOG.md` entries in focus.
  - Previous reports: `reviews/security-data-1.md` and `reviews/adversarial-1.md`.
- **Not read:** `HANDOFF.md`, `LEDGER.jsonl` contents, builder reports and commit messages.
  - I never ran `git log` or `git blame`. `git show` was used only in its `<commit>:<path>` form.
  - `check-state.mjs` and `protect.mjs` read the ledger internally.
- **Writes to the shared `.git`:** none by me. The permitted `check-state.mjs` run computes `codeTreeOf` through a
  temporary index, which can write loose objects into the object store.
- **Nothing remote was changed.**
  - My only network use was one read-only `git ls-remote` of the public repository.
  - No push, fetch, `gh`, `render`, publish, or use of the owner's computer.

## Commands run

| Command | Exit | Result |
|---|---|---|
| `git status`, `git rev-parse HEAD` (worktree) | 0 | clean, detached at `fd9ed14` |
| `git diff --stat 0d9fc5a fd9ed14` and path-limited diffs | 0 | 126 files |
| `node --test 'scripts/agent/*.test.mjs'` | 0 | 75 of 75 pass |
| `node scripts/agent/check-state.mjs` | 0 | `OK`; the one warning is the expected "current branch HEAD is not the integration branch main" |
| `node scripts/agent/protect.mjs` | 0 | `OK` (53 protected files, approvedBy ADR-0012) |
| `node scripts/agent/requirements-audit.mjs` (read-only) | 0 | `OK` |
| `node scripts/agent/diff-check.mjs` (read-only) | 0 | clean against `0d9fc5a` |
| `git check-ignore -q --no-index` on evidence log paths, and on `.agent-runs/x` | 1 / 0 | evidence logs aren't ignored; `.agent-runs/` is |
| `git diff --name-status --diff-filter=M 0d9fc5a fd9ed14 -- tests` | 0 | only `fix-core-offline`, `species-fw` and `species-marine`, as HARNESS-006 A6 says |
| `git ls-remote https://github.com/GrayGrayson1/aquarium-go.git 'refs/heads/*' 'refs/tags/*'` (read-only) | 0 | `main` = `0d9fc5a`, `agent/s0-wip` = `b243b23`, no tags |
| `git grep` for token and private-key patterns at `fd9ed14` | — | no matches |
| `git archive fd9ed14` and `git archive 0d9fc5a` into `/tmp/sd2-scratch/{copy,keep,base}` | 0 | scratch copies for the experiments below |

**Experiments.**
- The scratch probes ran with `node --experimental-transform-types` and an ESM loader for the `@/` alias.
- zustand, immer, idb-keyval, react and three were stubbed (Node built-ins only, nothing installed). zustand's stub
  keeps its semantics: store first, then call the listeners.
- `decodeRecord`, `migrateSave`, `repairState`, `simulateOffline` and `advanceWorld` don't use the stubs.

| Probe | What | Result |
|---|---|---|
| p3 strings | Every string field of every fixture, one site per field shape (322 shapes, greedy cover over all 46 fixtures), set to each of 10 names: `__proto__`, `constructor`, `toString`, `hasOwnProperty`, `valueOf`, `prototype`, `isPrototypeOf`, `__defineSetter__`, `toLocaleString`, `length`. Each save then goes through `decodeRecord`, a second `repairState` with a hash check, a 3 h `simulateOffline` and 24 h of `advanceWorld`, with 14 built-in prototypes checked. | 3,220 cases. **0 prototype pollution**, 0 non-idempotent repairs. 16 crashes, all in `tanks.{}.waterClass` and `market.buyers[].archetype` (see I1). |
| p3 keys | An own inherited-name key added to every object shape (122 shapes × the same 10 names) | 1,220 cases, 0 failures |
| p6 | All 46 fixtures, the raw legacy v0 save and a fresh game: the first load needs no repairs, a second repair finds nothing, and load → save → load → save → load keeps `stateHash` | 48 of 48 stable (PERSIST-002) |
| p4 | `runTick` and `mutateFast` with the real modules | a subscriber that throws once: 0.05 h after two ticks (correct). One that always throws: 1.0 h in 10 s at 1× (correct). A throw inside `publish()` before `setGame`: the abandoned copy is reused (m2). |
| p7, p7b | A too_new primary plus a v1 backup on a memory backend | A1 and A2 of PERSIST-003 fail, as its note says (I3) |
| p8 | A save carrying future catalog ids under the same SCHEMA_VERSION, run at the candidate and at the base | candidate deletes them, base keeps them (M3) |
| p9 | The defId fuzz on a copy with the unknown-id deletion disabled | 105 cases, 0 problems (M3) |
| p5 | Legacy v0 save with a tank id of `__proto__` | no pollution, but a prototype is set on `tanks` (I2) |
| harness | Pure-function calls in the scratch copy: `parseArgs`, `checkTransition`, `validateLedger`, `validateState`, `validateGateEvidence`, `approvalIsAdr`, `hasOwnerApproval`; plus the credential reset tested against a fake local helper | M1, M2, m7 |

**Not run in my shell.** The container has no `node_modules`, and the npm registry is blocked:

- `npm run typecheck`, `npm test`, `npm run build`, `npm run e2e` and `test-inventory.mjs`.
- None of these are reported as passed here.
- What the manifest records on code tree `4d29120aca`:
  - typecheck exit 0;
  - **unit exit 1** (1 failed, 1791 passed): BF-003, plus one unhandled "Timeout calling onTaskUpdate";
  - build exit 0;
  - testInventory exit 0;
  - e2e has no run (PENDING).
- In that unit run, every S0 test file in my scope passed:
  - `core-fastmutate-atomic`, `core-gameloop-publish`, `core-crafted-saves`, `core-crafted-saves-fuzz`;
  - `fix-core-hidden-overlap`, `fix-econ-offline-market-speed`, `fix-water-grace-equipment`, `fix-core-offline`;
  - `core-determinism`, `fix-core-step-invariance`, `core-persistence`, `core-migration`, `rare-persistence`.

## Summary

The persistence fixes are sound for what they claim.
- **PERSIST-011:** no crafted id reaches a built-in prototype (4,440 fuzz cases, 0 pollution).
- **PERSIST-009 and PERSIST-010:** a throwing world step publishes nothing, and a throwing subscriber no longer
  doubles time.
- **PERSIST-012, PERSIST-013 and MKT-016:** they do what the requirements say.
- **PERSIST-002:** holds for every fixture.
- **PERSIST-003:** still unimplemented, and the registry says so honestly.
- **Remote state:** `origin/main` is still `0d9fc5a`, so nothing has deployed.
- **Harness:** the guards are much stronger than at security-data-1.

Three problems remain:
1. **M1.** A typo turns `relaunch.mjs --dry-run` into a real unattended run. The script says a typo can never do
   that.
2. **M2.** Every "owner approval" check in the scripts accepts any committed, indexed ADR, including ADRs with no owner
   words. That covers gate waivers at acceptance, owner-gate and blocked exits, repair overrides, and remote and
   multiplayer permission.
3. **M3.** S0's `repairState` now deletes equipment, decor, frags and inventory items whose catalog id this build
   doesn't know. These records are well-formed, so a save written by a newer build loses them when an older one opens
   it, against ADR-0005 decision 1 ("good saves going forward"). v0.4.0 kept them, and the sim and the UI already skip
   unknown ids.

## Findings

### Major

**M1. `relaunch.mjs` starts real unattended sessions on common typos.**
- Files: `scripts/agent/relaunch.mjs:11`, `:44-46`, `:358-371`; `scripts/agent/lib.mjs:341-361`.
- What happens:
  - `parseArgs` throws only on unknown `--options`.
  - Anything that doesn't start with `--` goes into `args._`, and `main()` never looks at `args._`.
  - An empty value turns a boolean off.
- Reproduced with `parseRelaunchArgs`. Each of these parses as a live run, which starts up to 6
  `claude -p --permission-mode auto` sessions once the pre-flight passes:
  - `-dry-run`;
  - `—dry-run` (the em dash smart punctuation produces);
  - `dry-run`;
  - `-n`;
  - `--dry-run=`;
  - `--help=`.
- Claims this contradicts:
  - the script header: "Unknown options are refused, so a typo can never start real sessions";
  - lib.mjs's note on `--self-tset`;
  - ADR-0008's correction row for adversarial-1 F5, the same failure class rated High there.
- The pre-flight conditions (on `main`, `check-state.mjs` clean) are normally met, so the owner can approve sessions
  they didn't mean to start.
- **Fix:**
  - refuse positional arguments and empty values whenever `allowed` is given (or at least in `parseRelaunchArgs`);
  - add harness tests for the forms above.

**M2. The owner-approval and waiver checks accept any committed ADR, even one without the owner's words.**
- Files: `scripts/agent/lib.mjs:252-259` (`approvalIsAdr`); `check-state.mjs:106-108`, `:162-165`, `:432-436`,
  `:294-295`, `:336-337`, `:354-357`; `lib.mjs:163`, `:165-168`; `record-event.mjs:96-104`.
- Reproduced in a scratch repository with the candidate's files:
  - `approvalIsAdr` returns true for `ADR-0003` and `ADR-0011`. Both are agent-written, with no `## Owner approval`
    section (`hasOwnerApproval` returns false). It also returns true for `ADR-0001`.
  - With `gates.unit` and `gates.e2e` set to `NOT_APPLICABLE` and `gateWaivers: { unit: "ADR-0010", e2e: "ADR-0004" }`,
    neither `validateState` nor `validateGateEvidence(…, { accepted: true })` reports an error. Yet `validateState`'s
    own message says an "owner-approved waiver" is needed.
  - So S0 could be "accepted" with today's RED unit gate and pending e2e waived through topically adjacent ADRs. Neither
    of those ADRs waives anything: ADR-0004 decision 2 says to run e2e or raise `BASELINE_RED:e2e`.
  - `IMPLEMENT → OWNER_GATE` with `--resume ACCEPT`, then `OWNER_GATE → ACCEPT` citing ADR-0001, passes both
    `checkTransition` and `validateLedger`. The resume state may be any non-stop state.
  - `BLOCKED_MANUAL_REVIEW → REPAIR` citing ADR-0004 passes. `repairOverrides` accepts any ADR. So the repair limit,
    the owner's own ADR-0001 rule, can be cleared without the owner.
- Unattended mode:
  - `relaunch.mjs` stops only when a session **ends** in a stop state.
  - A session that enters and leaves `BLOCKED_MANUAL_REVIEW` or `OWNER_GATE` by citing an existing ADR is not noticed.
- The lib.mjs header admits that a multi-file forgery is possible. This weakness needs no forgery at all, only a
  mis-citation.
- This is the open part of SD-6 (no owner-decision linkage).
- **Fix:**
  - Require `hasOwnerApproval()` (already in `protect.mjs`) for remote and multiplayer approvals, gate waivers, repair
    overrides, design approvals and exits from OWNER_GATE or BLOCKED_MANUAL_REVIEW.
  - Require that ADR to be committed after the gate was entered (or after the anchor), and to be cited by an
    `owner-decision` event.
  - Allow `resumeState` only for the state the gate was entered from (or an earlier one).
  - Have `relaunch.mjs` alarm on any exit from a stop state, or any `owner-decision` event, recorded during an
    unattended session.

**M3. Regression: `repairState` deletes well-formed records whose catalog id is unknown, so a newer save loses data in
an older build.**
- Files: `src/persistence/migrations.ts:260-274` (`knownEquipment`, `knownDecor`), `:292-293`, `:471-474`, `:495`;
  also `:517` (`research.activeId`) and `:425` (`starterId`, reset to `betta` with no repair note).
- Probe p8 used a save with the same SCHEMA_VERSION, as the additive PERSIST-007 policy produces. It carries a future
  equipment item, a decor piece and an inventory item.
  - The candidate's repairs: "1 unknown equipment removed", "1 unknown decor removed", "inventory: 1 unknown equipment
    removed"; the next save overwrites the slot without them.
  - The same probe at `0d9fc5a` keeps all three with `repairs: []`.
  - Both worlds step 24 h without throwing.
- The deletion isn't needed for PERSIST-011:
  - the catalogs now have null prototypes, and the scrub already nulls inherited-name ids;
  - `stepEquipmentWear` skips unknown defs, at the base too (`src/sim/water/step.ts:121-123`);
  - render and UI guard for an unknown def (`MergedDecor.tsx:97-98`, `emitters.ts:91-92`, `tankOps.ts:87-88`,
    `AlertsPopover.tsx:35`);
  - with the deletion disabled (p9), 105 defId fuzz cases (inherited names plus a future id, 6 fixtures including the
    frags fixtures) showed no pollution, crash or non-idempotent repair.
- This is the forward-safety failure ADR-0005 decision 1 rules out ("never treat a save written by newer code as
  damaged … or overwrite it"). PERSIST-003 defines too_new by `schemaVersion` alone, so it doesn't cover a newer build
  that only added catalog items.
- Who hits it: a stale or cached tab (GitHub Pages caches HTML for 10 minutes), a rollback, or local development across
  checkouts on one origin.
- PERSIST-011's text ("must exist in the catalog") requires this behaviour, so the requirement conflicts with ADR-0005.
- **Fix:**
  - drop only non-string and inherited-name ids;
  - keep unknown well-formed ids, which the sim and the UI already skip, or quarantine them;
  - note the `starterId` repair;
  - add a test that a save with future equipment, decor and frag ids round-trips unchanged and steps;
  - reword PERSIST-011 accordingly.

### Minor

**m1. Reviews are bound to the tree at recording time, not to the reviewed candidate (SD-9, partly open).**
- File: `scripts/agent/capture-evidence.mjs:120-133` (`codeTree: codeTreeOf(null)`, `:131`).
- If code changes between a review and its recording, the GREEN review is recorded against the new tree, and
  `check-state.mjs:160` accepts it.
- Fix: `--candidate <sha>`, then record `codeTreeOf(<sha>)`.

**m2. `mutateFast`: a throw inside `publish()` before `setGame` leaves the abandoned working copy in use.**
- Files: `src/game/fastMutate.ts:129`, `:133-153`; `src/game/GameLoop.tsx:107-110`.
- In p4, `share()` threw, the store was unchanged, and the next call kept the abandoned +1000 money (delta 1001, not 1).
  `runTick` sees an unchanged store and keeps the hours as backlog, so those hours would be simulated twice.
- The trigger is narrow (`share()` failing, for example on a cycle or a stack overflow), but PERSIST-009 A1 says "the
  next call starts from the store".
- Fix: wrap `publish` so the working copy is dropped when the store still holds `current`.

**m3. PERSIST-009 A3 is not met.**
- File: `tests/sim/core-fastmutate-atomic.test.ts:3`.
- The header still says `PERSIST-004`. The criterion itself notes this, and `fastMutate.ts:112` does the same.

**m4. B-001 / SD-10 is still open.**
- File: `src/persistence/offline.ts:386-393`.
- `loadAndResume` keeps a half-simulated catch-up when `simulateOffline` throws, and the comment "keep the loaded state
  as-is" is false.
- BACKLOG lists it as S0.

**m5. HARNESS-006 A3 and A5 are not shown on this tree.**
- The only `npm test` recorded on code tree `4d29120aca` exits 1. The cause is BF-003, plus one unhandled "Timeout
  calling onTaskUpdate" (`logs/unit-20261005T234539917Z.log:1015-1032`).
- That is the exact error A5 says must not appear.
- ADR-0010 Verification ("The full `npm test` exits 0 on this tree") isn't backed by any record. The owner's native
  run is pending (ADR-0012).

**m6. The Vitest setup file is gate configuration but isn't protected.**
- Files: `vitest.config.ts:17`; `scripts/agent/protect.mjs:24-41`.
- `tests/sim/setup/yield-between-tests.ts` runs before every test file. An edit there could weaken every test with no
  protect, inventory or relaunch alarm.
- Fix: add `tests/sim/setup/` to `PROTECTED_PATTERNS`.

**m7. Launcher residuals (open parts of SD-4 and SD-5, documented as a guard rail in the header and in ADR-0011
consequence 6).**
- Credential stripping (`relaunch.mjs:147-161`) works: a fake global helper was not called under `childEnv`'s
  overrides.
- But the child can undo it with `GIT_CONFIG_COUNT=0` plus `GH_CONFIG_DIR=…` on its own command. The helper was called
  again.
- In the harness's own matcher model, these forms pass the deny rules:
  - env-assignment prefixes;
  - `node -e`, `python3 -c` and script files;
  - `git subtree push`.
- `snapshot()` (`:247-264`) doesn't cover `~/.gitconfig`, `~/.config/git/config` or `~/.claude/CLAUDE.md`.
- Render API deploys aren't detected after a session.
- Fix: run unattended sessions as a separate OS user without GitHub or Render credentials, and hash those files.

**m8. The Render auto-deploy wording is still open (SD-12).**
- Files: `OPERATIONS.md:60-63`, `AGENTS.md:16-19`, `docs/ARCHITECTURE.md:12`.
- These say Render deploys only through the CLI, the API or the dashboard. But `render.yaml` sets `autoDeploy: true`,
  as ADR-0007's context notes.
- Fix: say "a push to main may deploy both channels".

**m9. The `gh` wording is unchanged (SD-13).**
- File: `OPERATIONS.md:275-276`.
- It still tells agents where `gh` lives and to avoid "anything that writes". Simpler and safer: agents don't use
  `gh`.

### Info

**I1. Two enum-valued fields crash the loop when set to an inherited name.**
- In p3, `tanks.{}.waterClass` and `market.buyers[].archetype` crash it. The cause is plain-object tables in `src/sim`
  read as `MAP[x] ?? default`, where an inherited name defeats the `??`. Examples: `src/sim/water/index.ts:27`,
  `care/index.ts:195,284,445`, `economy/buyers.ts:122,267`, `economy/messages.ts:268`.
- These are reads only, so nothing is polluted. They are tracked as B-004 / PERSIST-004 (S4).
- PERSIST-011's "any id" claim holds for id fields.

**I2. Legacy v0 path: a tank id of `__proto__` sets a prototype on the new `tanks` record.**
- File: `migrations.ts:122` (`rec[t.id] = t`).
- In p5, `for…in` saw the crafted tank's fields. There was no pollution, the hash stayed stable, and the effect is gone
  after the first tick or save.
- Defence in depth: build `rec` with `Object.create(null)`, or skip unsafe ids.

**I3. PERSIST-003 is unchanged and honestly recorded.**
- File: `slots.ts:405-414`, `:246-258`, `:296-314`.
- p7b: the older build restores the backup, and two saves remove the newer record. Within one session the stale-tab
  rule happened to protect it.
- The note ("A1-A2 hold for no build until PERSIST-014") is accurate. SCHEMA_VERSION is unchanged and no save field was
  added (no diff in `src/types` or `schema.ts`).

**I4. PLAT-005 exposure today (S1).**
- `src/main.tsx:6` installs `window.__AQ` unconditionally (`src/dev/debugHooks.ts:190-275`). That includes `setGame`
  (which bypasses `repairState`), `mutate`, `deleteSave` and `importText`.
- `?dev=1` persists `devMode` in settings (`src/App.tsx:32`).
- The S0 diff doesn't touch this, or storage, the service worker (there is none), or any network code.

**I5. Committed evidence.**
- No tokens or keys were found.
- A macOS home-directory path with the owner's user name appears in
  `reviews/adversarial-review-2026-10-05.json`, which is public since ADR-0007.
- The token guard for `capture-evidence --command` (SD-16) wasn't added.

**I6. Retries.**
- `{ retry: 2 }` already existed at the baseline in `core-gameloop.test.ts:48` and `core-perf.test.ts:11`.
- `test-inventory.mjs`'s `DISABLE_RE` doesn't flag `retry`, so a newly added retry would go unnoticed (master §35).

**I7. Social stub.** It doesn't exist yet, and no password handling exists. The password check isn't applicable at this
candidate.

## Requirements in focus

| Requirement | Status at `fd9ed14` |
|---|---|
| PERSIST-002 | Holds: p6 (48 saves); the named tests passed in the recorded run on this tree |
| PERSIST-003 | A1 and A2 not implemented, documented and scheduled for S1 (PERSIST-014); A3 and A4 hold. M3 is a forward-safety gap outside its schemaVersion definition |
| PERSIST-009 | A1 holds for recipe throws (m2 is the residual); A2 holds; **A3 not met** (m3) |
| PERSIST-010 | Holds (test, plus p4 A and B) |
| PERSIST-011 | Holds for id fields (p3: 0 pollution, idempotent). Its "must exist in the catalog" wording drives M3 |
| PERSIST-012 | Holds (code and test). A3 depends on the full `npm test`, which is RED from BF-003 |
| PERSIST-013 | Holds (code and tests). adversarial-1 F15 (a clock that steps back) is separate |
| MKT-016 | Holds: `marketTimeScale` equals the baseline and only its comment changed; its test passed in the recorded run |
| REL-001 | A1 holds: remote refs match ADR-0007 and ADR-0009. A2 holds, using `ls-remote` plus reflog alarms, stronger than its wording. A3 holds: `main` is `0d9fc5a` |
| HARNESS-004 | Literal A1 and A2 hold. The description ("owner's own words") isn't enforced (M2) |
| HARNESS-005 | A1 holds (committed-version history, log, tree and command required). A3 holds. A4: `protect.mjs` OK in my shell; the inventory OK is recorded, not re-run |
| HARNESS-006 | A1 holds (`verify-slice` strips `E2E_REUSE`), A4 holds, A6 holds. A2 typecheck recorded green. **A3 and A5 not shown** (m5) |
| HARNESS-028 | A1 and A2 hold. A3: this review signs off the config-file diffs (tsconfig, vitest, playwright, package.json). It doesn't sign off `scripts/agent/**` until M1 and M2 are fixed |

## Status of the security-data-1 findings

| Finding | Status |
|---|---|
| SD-1 (High) crafted save pollutes `Object.prototype` | **Resolved:** whole-save scrub, `cl.id = id`, null-prototype catalogs. p3: 4,440 cases, 0 pollution |
| SD-2 (Medium) inherited catalog ids crash the loop | **Resolved for ids.** Residual enum fields (I1) are S4. Showing tick failures to the player is B-002, an open owner question |
| SD-3 (Medium) throwing subscriber makes time run ~20× fast | **Resolved** (`GameLoop.tsx:107-110`, test, p4). New narrow residual m2 |
| SD-4 (Medium) push-guard bypasses | **Mostly resolved:** global-option and wrapper deny forms, env stripping, helper reset, `ls-remote` before and after. Residual m7 is documented |
| SD-5 (Medium) launcher guard rails editable by sessions | **Resolved:** inline settings per spawn; `.claude`, `.mcp.json`, git config and hooks, user settings, protected files and deploy config snapshotted. Residual m7 |
| SD-6 (Medium) remote permission accepted on any file | **Partly resolved:** a committed, indexed ADR is now required, but any such ADR counts and there is no owner-decision link (M2) |
| SD-7 (Medium) `PROTECTED.json` missing and self-attested | **Resolved:** present, verified and tied to the ledger hash; `--update` gated; new files are errors; gate files protected. Hand-appended `protect.mjs` ledger lines remain a documented limit |
| SD-8 (Medium) append-only checks only catch uncommitted edits | **Resolved:** all committed versions since the anchor are checked. History rewrites remain a documented limit |
| SD-9 (Medium) verdict from anywhere, path, tree | **Partly resolved:** last-line verdict and the `reviews/` path are enforced; tree binding is at recording time (m1) |
| SD-10 (Low) `loadAndResume` adopts a half-simulated catch-up | **Open** (m4, B-001) |
| SD-11 (Low) owner decisions and fresh sessions self-declared | **Resolved as recommended:** committed ADR required; `bootstrap-check` compares `CLAUDE_CODE_SESSION_ID`. Residual M2 |
| SD-12 (Low) deploy alarm and Render wording | **Alarm part resolved** (package.json, package-lock.json, .npmrc, vite.config.ts); **wording open** (m8) |
| SD-13 (Low) wording | **Mostly resolved:** ADR-0008 supersedes the ADR-0002 line, and the reviewer pack has no handoff. The `gh` line is open (m9) |
| SD-14 (Low) destructive deny gaps | **Mostly resolved.** `rm` and `find -delete` under `docs/agent` aren't denied; the dirty-tree and protected-file alarms partly cover them |
| SD-15 (Info) too_new latent | **Unchanged, honestly recorded** (I3) |
| SD-16 (Info) committed evidence and a public push | **No secrets found.** The username path is committed; the token guard is not added (I5) |
| SD-17 (Info) BF-001 | **Settled by the owner** (ADR-0004 decision 2, ADR-0012 decision 3) |
| SD-18 (Info) save-supplied colours | **Unchanged** (S4) |
| SD-19 (Info) `SKIP_RE` and `--self-test` | **Resolved** (`DISABLE_RE`, ADR-0008). The related typo class is still open (M1) |

## What holds (verified)

- **Crafted saves:**
  - no string or key at any field shape, in any of the 46 fixtures, pollutes 14 built-in prototypes;
  - repair is idempotent and keeps the round-trip hash;
  - listing photos must be `data:image/`;
  - records keep their key as their id;
  - the scrub's depth cap (64) is far above the deepest real nesting (9).
- **Atomicity:** a throwing recipe publishes nothing. `offlineGrace` is set inside `try/finally`, stripped on save and
  deleted on load, so a save can't pin it. The hidden catch-up covers only `min(hidden, now − lastTickRealMs)`.
- **Remote state:** `origin/main` = `0d9fc5a`; `agent/s0-wip` = `b243b23`, the last push ADR-0009 approved; no remote
  tags. Since `b243b23`, only `docs/agent` bookkeeping changed (ADR-0012, bootstrap evidence, `PROTECTED.json`), on
  the same code tree.
- **No weakening of REL-001 in the docs:**
  - AGENTS.md, the master and OPERATIONS §3 state the ban more fully than the owner's original;
  - the `main` branch rule changed only through owner-approved ADR-0005 and ADR-0008;
  - the deploy files (`.github`, `render.yaml`, `vite.config.ts`, `package-lock.json`) are unchanged;
  - package.json gains only `report:rarity`.
- **Gate configuration:**
  - `allowOnly: false`, `requireAssertions: true` and the yield setup file (it changes no test);
  - `forbidOnly: true`, and a server is reused only with `E2E_REUSE=1`, which `verify-slice.mjs` strips for the gate;
  - `tests/e2e` and `playwright.config.ts` are typechecked;
  - evidence logs are committed and not ignored.
- **Launcher:**
  - it fails closed on: STOP, the lock, check-state errors, stop states, remote permission, the wrong branch, an
    unreadable origin;
  - it alarms on: origin ref changes, non-fetch remote-ref moves, rewound or deleted refs, config, hook, `.claude`,
    `.mcp.json` and user-settings changes, protected-file changes, deploy-config changes.

## Minimum for a GREEN re-review

1. M1: `relaunch.mjs` refuses positional arguments and empty boolean values, with tests.
2. M2: owner-approval checks require a real `## Owner approval` section and an ADR that postdates the gate or the
   anchor. OWNER_GATE resumes only where it was entered. The launcher alarms on in-session exits from stop states.
3. M3: unknown well-formed catalog ids are kept, or quarantined, never deleted. Add a forward-compatibility test and
   reconcile PERSIST-011's wording with ADR-0005 decision 1.
4. Before acceptance, as tracked anyway:
   - the m3 header;
   - a recorded `npm test` on this tree without the onTaskUpdate error, or an owner decision on BF-002 and BF-003 (m5);
   - e2e as BF-001 requires.

Verdict: RED
