# Backlog

Deferred work and logged defects. Since ADR-0018 retired the agent harness, a chunk may fix open items in the files
it touches (the cheap ones especially): say which in the commit and mark the row fixed. Larger items go into a chunk's
brief in `PLAN.md`. Rows whose type is `harness-doc`, `harness-script` or `evidence` were logged against the harness
and no longer apply. The harness files the rows cite (`HANDOFF.md`, `OPERATIONS.md`, the master, `evidence/`, the
scripts) are now in `docs/agent/archive/`.

Sources:
- `evidence/S0/reviews/adversarial-review-2026-10-05.json`, `synthesis.merged`: the 101 merged findings of the
  2026-10-05 adversarial review (M01-M101). One entry each, **B-1NN = MNN** (B-101 is M01, B-201 is M101). Titles
  are the review's own; read the JSON for the summary, locations and recommended fix.
- B-001 to B-005: items from outside `synthesis.merged`, the four leftovers of `HANDOFF.md` step 1 and B-003, the
  e2e warm-up that `OPERATIONS.md` §8 cited before this file existed.
- B-006 to B-017: items from outside `synthesis.merged` that the round-1 step-8 reviews (`code-architecture-harness-2`,
  `security-data-2`, `code-architecture-game-2`) and ADR-0015's consequences left for later, recorded under D-S0-3.
  Two more of their findings were added to existing rows: security-data-2 I1 to B-004 and I4 to B-190.

Not here:
- The 57 owner questions: they are in `synthesis.questions` of the same JSON file and aren't backlog items (see
  "Open owner questions" in `HANDOFF.md`). A row that waits on one says so.
- The findings of the independent S0 reviews (`evidence/S0/reviews/<role>-<n>.md`). They are S0 repair work, tracked
  as defects in `HANDOFF.md`, except the items above that the reviews or the repairs left for later.

## Fields

| Field | Meaning |
|---|---|
| ID | `B-NNN`, never reused or renumbered |
| Mid | The finding id in `synthesis.merged` (— for none) |
| Sev | The review's severity: high, medium, low or info (the highest among the findings it merges); UNKNOWN when no review rated it. For a step-8 review finding, Minor is low and Information is info |
| Verdict | The review's verdict: CONFIRMED, PLAUSIBLE or UNVERIFIED-INFO |
| Type | The review's `fixType` (app-code, harness-doc, test, design-erratum, …) |
| Category | The review's `actionClass`; the tables below are grouped by it |
| Slice | Who takes it: S0 for the fix-now categories, S1-S4 for needs-slice, OWNER for owner-decision (the owner decides first), — for record-only |
| Status | **open**; **partly fixed** (commits, then what is left); **fixed** (commit); **decided** or **partly decided** (the owner answered in an ADR; follow-up work stays open as stated); **no action** |

"Fixed" means the commit was checked against the finding, not that the finding's reviewer re-reviewed it.
"7c0dbf4 (untested, HANDOFF step 2)" in a note marks a script change that waits for the harness tests.
ADR-0008, cited in several notes, was approved by the owner and committed in `1a74863`; the notes used to mark it
"(proposed)".

## Counts

| Category | Items | fixed | partly fixed | decided | partly decided | open | no action |
|---|---|---|---|---|---|---|---|
| fix-now-harness | 30 | 1 | 4 | 0 | 0 | 25 | 0 |
| fix-now-app-safe | 18 | 2 | 4 | 0 | 0 | 12 | 0 |
| fix-now-repo | 3 | 0 | 0 | 0 | 0 | 3 | 0 |
| needs-slice | 24 | 0 | 1 | 0 | 0 | 23 | 0 |
| owner-decision | 23 | 0 | 0 | 7 | 2 | 14 | 0 |
| record-only | 3 | 0 | 0 | 0 | 0 | 0 | 3 |
| outside the review | 17 | 3 | 0 | 0 | 0 | 14 | 0 |
| **total** | **118** | **6** | **9** | **7** | **2** | **91** | **3** |

Fixed or partly fixed by these commits: `3e00a32`, `58ae313`, `9edfa12`, `6347c5d`, `d98731d`, `16233a1`, `c774d38`,
`2ef1ff7`, `d8fb896`, `7c0dbf4`, `5ae85a3`, `62df438`, `9e1bf66`. `dfc0a13` was reverted by `f999618` (B-158).
`172b5c3` adds the rarity report the owner asked for (B-187).

## Items from outside the review

| ID | Mid | Title | Sev | Verdict | Type | Slice | Status |
|---|---|---|---|---|---|---|---|
| B-001 | M01 | loadAndResume adopts a half-simulated catch-up when simulateOffline throws | medium | CONFIRMED | app-code | S0 | **fixed**. Fixed in 9e1bf66 (PERSIST-015, ADR-0015): loadAndResume runs the catch-up on a copy and resumes the decoded save unchanged when the catch-up throws (`tests/sim/core-resume-catchup.test.ts`). HANDOFF step 1 leftover; security-data-1 SD-10, adversarial-1 F9 (probe L2), security-data-2 m4, code-architecture-game-2 m8 (M01 fix 2). |
| B-002 | M01 | Repeated tick failures aren't shown to the player | UNKNOWN | CONFIRMED | app-code | OWNER | **open**. HANDOFF step 1 leftover; M01 fix 3. A persistent fault freezes the world with one console message. What the player sees is the owner question "When a simulation step keeps failing with an error, what should the player see?" (synthesis.questions). |
| B-003 | — | The first e2e test after a cold Vite start can time out while Vite compiles: add a warm-up | UNKNOWN | — | config | S1 | **fixed** in chunk 0 (ADR-0018): a Playwright setup project, `tests/e2e/warmup.setup.ts`, loads "/" and waits for `__AQ.ready` before any test runs; no retry (M32 fix 3). |
| B-004 | — | Enum-valued save fields (role, archetype, …) aren't checked against their tables | info | — | app-code | S4 | **open**. HANDOFF step 1 leftover. security-data-2 I1 (deferred under D-S0-3) found two such fields that crash the loop when set to an inherited name, `tanks.{}.waterClass` and `market.buyers[].archetype`, because plain-object tables in `src/sim` are read as `MAP[x] ?? default` (for example `src/sim/water/index.ts:27`, `src/sim/economy/buyers.ts:122`); reads only, nothing is polluted. Belongs with PERSIST-004 A3 (S4). |
| B-005 | — | The determinism guard's comment stripper treats quotes inside regex literals as strings | UNKNOWN | — | test | S0 | **fixed**. Fixed in 9e1bf66 (CONST-004 A1, ADR-0015): the stripper keeps string, template (nested included) and regex literals whole; `tests/sim/core-determinism-guard.test.ts` "the comment stripper keeps regex and nested template literals whole (B-005)". HANDOFF step 1 leftover, after d8fb896 made the stripper leave strings alone (code-architecture-game-1 L3). |
| B-006 | — | `.gitattributes` isn't protected: none exists today, but one could change how Git normalises, diffs or merges the files the gates and the code tree depend on | low | — | harness-script | S1 | **open**. code-architecture-harness-2 m10, deferred under D-S0-3. Fix: add `.gitattributes` to `PROTECTED_PATTERNS` in protect.mjs (an ADR with the owner's approval and a reviewer's sign-off, ADR-0013 decision 3). |
| B-007 | — | Session ids come from `CLAUDE_CODE_SESSION_ID`, which any command line can set, so the fresh-session checks (bootstrap-check.mjs, leaving NEXT_SLICE) can be satisfied by hand | low | — | harness-doc | S0 | **open**. code-architecture-harness-2 m5, deferred under D-S0-3. Fix: add it to OPERATIONS.md §7's "What the checks can't catch" list, with the owner-only docs ADR of D-S0-5. |
| B-008 | — | A macOS home-directory path with the owner's user name is committed in `evidence/S0/reviews/adversarial-review-2026-10-05.json`, public on `agent/s0-wip` since ADR-0007 | info | — | evidence | OWNER | **open**. security-data-2 I5 (no token or key was found), deferred under D-S0-3. The file is recorded evidence and already public: taking the path out of the public history would need a rewrite and a force push, which only the owner can approve. The token guard for `capture-evidence.mjs --command` logs (security-data-1 SD-16) isn't added either. |
| B-009 | — | `test-inventory.mjs`'s `DISABLE_RE` doesn't flag `retry`, so a newly added `{ retry: n }` that hides a flaky failure goes unnoticed (master §35) | info | — | harness-script | S1 | **open**. security-data-2 I6, deferred under D-S0-3. Two retries exist since the baseline (`tests/sim/core-gameloop.test.ts:48`, `tests/sim/core-perf.test.ts:11`; B-137). Fix: flag `retry` in the inventory with those two in the reference, so only a new one fails (an ADR and a reviewer's sign-off). |
| B-010 | — | Some lookup tables are still plain objects: `UNLOCK_RULE_BY_KEY` (`src/data/unlocks.ts:142`), `TUTORIAL_CHAINS` (`src/data/quests.ts:194`), `ARCH_BY_ID` (`src/sim/facility/visitors.ts:65`) and `SHOW_TIER_BY_KEY` (`src/sim/shows/index.ts:257`) | info | — | app-code | S4 | **open**. code-architecture-game-2 (information), deferred under D-S0-3. Not a defect today: after `repairState` no inherited name from a save reaches them (its fuzz probes). Defence in depth with PERSIST-004 and B-004 (the same pattern in the enum tables of security-data-2 I1). |
| B-011 | — | The Vitest setup file waits on the global `setImmediate`, so a test that leaves fake timers on past its own `afterEach` would hang that hook for 60 s | info | — | test | S1 | **open**. code-architecture-game-2 (information), deferred under D-S0-3. A loud failure, never a false pass; the one test that uses fake timers today (`src/render/decor/mergedDecorCache.test.ts`) restores them. Fix: capture the real `setImmediate` when `tests/sim/setup/yield-between-tests.ts` loads (protected and gate-defining: an ADR and a reviewer's sign-off). |
| B-012 | — | The save scrub passes a whole list as call arguments (`node.splice(0, node.length, ...kept)`, `src/persistence/migrations.ts:77`), so a crafted list of several hundred thousand entries throws `RangeError` | info | — | app-code | S4 | **open**. code-architecture-game-2 (information; cited at `:80` on the reviewed tree), deferred under D-S0-3. Oversized lists are PERSIST-004 A1 (S4). |
| B-013 | — | `runTick`'s `catch` resets `slowedFor` (`src/game/GameLoop.tsx:109`) with no test; without the reset a starvation toast could show for a tick that didn't happen | info | — | test | S3 | **open**. code-architecture-game-2 (information; code-architecture-game-1 L1's leftover), deferred under D-S0-3. With B-177, before S3's world-step hooks. |
| B-014 | — | A real owner ADR can be cited for a gate waiver it doesn't mean: check-state accepts any ADR with the owner's words in `STATE.gateWaivers.<slice>.<gate>`, without checking that it names that gate | UNKNOWN | — | harness-script | S1 | **open**. ADR-0015 Consequences (the harness builder's remaining risks), deferred under D-S0-3. Repair overrides and design approvals must already name their defect or design. Until fixed, reviewers check by hand that a waiver's ADR is about that gate and slice, which matters before any waiver is recorded (BF-001). Fix: require the ADR to name the gate, as for overrides (an ADR and a reviewer's sign-off). |
| B-015 | — | Requirement DEFERRED/SUPERSEDED decisions and `test-changes.json` entries accept any committed ADR listed in the index, without the owner's words | UNKNOWN | — | harness-script | S1 | **open**. ADR-0015 Consequences, deferred under D-S0-3. `requirements.mjs` (`adrOk`) and `test-inventory.mjs` (`validateTestChanges`) use `findAdr`, not the owner-approval check. Until fixed, reviewers check each such citation; the first `test-changes.json` entries are planned for NAV-017 (S1) and GEN-006 A5 (S2). Fix: apply the owner-approval check there too, or record why not (an ADR and a reviewer's sign-off). |
| B-016 | — | check-state doesn't re-check, after the fact, that each `protect.mjs --update` ADR named every owner-only file it let change | UNKNOWN | — | harness-script | S1 | **open**. ADR-0015 Consequences, deferred under D-S0-3. `protect.mjs --update` checks it at update time and its ledger event lists the changed files, so a hand-written record or ledger line is caught only by review. Fix: check-state re-checks each protect.mjs event's `changedFiles` against its ADR. |
| B-017 | — | An older build's research step closes an active research project it doesn't know, so a newer save loses that project under the same SCHEMA_VERSION | UNKNOWN | — | app-code | OWNER | **open**. ADR-0015 Consequences (a PERSIST-003 gap from v0.4.0; `stepResearch` in `src/sim/facility/progression.ts`). `repairState` keeps the id (PERSIST-011), but ADR-0016 decision 2 covers only new species and tank sizes (a SCHEMA_VERSION bump), so whether a new research project also bumps it, or is kept inert, isn't decided. |

## fix-now-harness (30)

docs/agent, AGENTS.md, CLAUDE.md and scripts/agent. Protected files: owner-approved ADR for the constitution and prompts, ADR plus reviewer for scripts (OPERATIONS §10).

| ID | Mid | Title | Sev | Verdict | Type | Slice | Status |
|---|---|---|---|---|---|---|---|
| B-103 | M03 | Agent-written files can still stand in for owner authority: approval references, ‘Accepted’ ADRs and protected-file updates aren't verified, and ADR-0003 itself awaits ratification | medium | CONFIRMED | harness-doc+script | S0 | **open**. Owner confirmed ADR-0003 rules 1-6 (ADR-0004 decision 4). ADR-0002's "ADR, the master or STATE.json" consequence superseded in ADR-0008. protect.mjs owner-approval check in 7c0dbf4 (untested, HANDOFF step 2). PROTECTED.json not created yet (HANDOFF step 7). |
| B-104 | M04 | Fresh-context rollover is defined but not enforced: no rule for auto-compaction, no measurable early-rollover trigger, and the bootstrap assertion is optional | medium | CONFIRMED | harness-doc+script | S0 | **open**. No rule for an auto-compacted session, no measurable early-rollover proxy, and no passing bootstrap assertion required before BOOTSTRAP → BASELINE_VERIFY. |
| B-105 | M05 | State machine, gate keys and bookkeeping are mostly reconciled; check-state still requires only 6 of the 11 gates and the YELLOW sentence contradicts itself | medium | CONFIRMED | harness-doc+script | S0 | **open**. check-state requires every gate key in 7c0dbf4 (untested, HANDOFF step 2). Master §26 YELLOW sentence, the manifest's checkpointSha and the meaning of slice ALL still open. |
| B-106 | M06 | Repair-stop rule: tightened in §3.3 and OPERATIONS §5, but §11.2 and §31 still state the old rule and a defect can be re-filed to reset its counters | medium | CONFIRMED | harness-doc+script | S0 | **open**. Master §11.2 and §31 still state the old rule. Per-defect repair counting in 7c0dbf4 (untested, HANDOFF step 2). |
| B-107 | M07 | The requirements registry doesn't yet cover the approved scope: umbrella ids with vacuous criteria, no ACC/PLAT/DES/PERF/CONST entries, and no check that catches dropped or reworded scope | medium | CONFIRMED | harness-doc+script | S0 | **partly fixed**. Fixed in 5ae85a3: 185 requirements in every family, umbrellas need closed children. Left: audit checks against master §9 and design sections, and against reworded criteria (not verified here); a fresh requirements review (HANDOFF step 5). |
| B-108 | M08 | S0's contract is now complete and testable; the master still calls the S0 scripts ‘Recommended’ and makes rollover part of ‘done’ | medium | CONFIRMED | harness-doc | S0 | **open**. Master §41 still headed "Recommended"; §47's rollover bullet unchanged. |
| B-109 | M09 | Independent review: reviews aren't tied to the code they reviewed, reviewer triggers are the orchestrator's judgement, and the context pack still feeds reviewers the handoff | medium | CONFIRMED | harness-doc+script | S0 | **open**. Adversarial now required by next-slice.mjs MANDATORY_REVIEWERS, in 7c0dbf4 (untested, HANDOFF step 2), and by OPERATIONS §7, in ADR-0008. Review code-tree check and reviewer context pack in 7c0dbf4 (untested, HANDOFF step 2). Triggers derived from the diff: open. |
| B-110 | M10 | Evidence now has a layout, hashes and code-tree binding, but browser-QA runs aren't tied to the build they saw and ignored inputs sit outside the code tree | medium | CONFIRMED | harness-script | S0 | **open**. Browser-run code-tree check in 7c0dbf4 (untested, HANDOFF step 2). Build id, input fingerprint and e2e artefact copies open. |
| B-111 | M11 | E2E server reuse is now opt-in, but a stray E2E_REUSE can still leak into gate runs, the port and server aren't recorded, and dev/QA servers drift ports | medium | CONFIRMED | harness-script | S0 | **open**. verify-slice clears E2E_REUSE for the e2e gate in 7c0dbf4 (untested, HANDOFF step 2). Recording the port and a per-worktree port open. |
| B-112 | M12 | Design overrides are listed in ADR-0003, but the design registry, the context pack and the master's own S3-B wording don't carry them to agents who read a section | medium | CONFIRMED | harness-doc+script | S0 | **open**. Registry gained the Social and §11.1 rows in ADR-0008. The other ADR-0003 rows, overrides in context-pack and master S3-B quiet-hours wording open. |
| B-113 | M13 | The written mutation, render-write and RNG rules still don't match the code in AGENTS.md, ARCHITECTURE.md, LANES.md, the design spec and game.ts | medium | CONFIRMED | harness-doc | S0 | **partly fixed**. 62df438 gave AGENTS.md, master §5 and ARCHITECTURE.md the three-path boundary; 9e1bf66 gave ARCHITECTURE.md and LANES.md the finer wording (the pre-save flush, fixture and showcase boot, render input handlers, the AI's tutorial hook, keyed streams; ADR-0015). Left: AGENTS.md's mutation and RNG bullet (owner-only, with the D-S0-5 docs ADR), the `src/state/game.ts` header ("The ONLY way … is mutate(...)"), the `src/sim/rng.ts` header ("must ONLY use RNG obtained from simRng(state)"), the `getSpecies()`-only wording in ARCHITECTURE.md and LANES.md (`findSpecies` is used too), and design §3 item 5's old wording (a design erratum). |
| B-114 | M14 | Release and version: the interim rule (stay at 0.4.0, notes under ## Unreleased, REL-003) is in place, but the registry and repo docs still point at the old release step | medium | CONFIRMED | harness-doc | S0 | **open** |
| B-115 | M15 | Design §6's router assumes panel targets and shell state the code doesn't have: Back can't leave a sub-view, Settings tabs never reach the URL, and the More sheet would close itself | medium | CONFIRMED | design-erratum | S0 | **open**. Design erratum, recorded below; the S1 contract applies it. |
| B-116 | M16 | Design §5.6 moves phone toasts with CSS only; the JavaScript that keeps toasts off the Buy bar would stop matching, so toasts would cover Buy and Confirm | medium | CONFIRMED | design-erratum | S0 | **open**. Design erratum, recorded below; the S1 contract applies it. |
| B-117 | M17 | Design §6.4 and §12.6 entry paths: the deep-link boot bypasses the guarded load flow, ‘capture once’ and ‘opened from a link’ are undefined, the reload rationale is wrong, and a notification click can open a duplicate tab | medium | CONFIRMED | design-erratum | S0 | **open**. Design erratum, recorded below; the S1 and S3-B contracts apply it once the owner answers the §6.4 question. |
| B-118 | M18 | Determinism is now defined in OPERATIONS §11, including the accepted live-play divergences; it names no gate tests or seed counts, and ARCHITECTURE.md still overclaims chunk-size stability | medium | CONFIRMED | harness-doc | S0 | **fixed**. Fixed in 9e1bf66 (ADR-0015): ARCHITECTURE.md's LOD section no longer says any chunk size gives stable results; large chunks stay well-behaved, and agree with small steps only within each subsystem's tested tolerances (OPERATIONS §11). Not done, and not tracked elsewhere: M18's other suggestions (OPERATIONS §11 naming the gate tests, seed counts and the save round-trip invariant; an AGENTS.md pointer to §11), owner-only edits for a later docs ADR. |
| B-140 | M40 | Master §3.8's conditions for pre-authorized core edits are undefined: who approves a contract change, what ‘stronger regression coverage’ means, and who owns public/ | low | CONFIRMED | harness-doc | S0 | **open** |
| B-141 | M41 | The bootstrap packet points at files that don't exist yet (BACKLOG.md, PROTECTED.json, ADR-0004, evidence/S0/reviews), misstates its own size, and the handoff's generated block is empty | low | CONFIRMED | harness-doc | S0 | **partly fixed**. evidence/S0/reviews and ADR-0004 committed in 7c0dbf4; BACKLOG.md is this file (uncommitted). Left: PROTECTED.json (HANDOFF step 7), README_FIRST's size figure, master §39. |
| B-142 | M42 | The new destructive-command definition forbids the harness's own writes, and S1's ‘baseline visual snapshots’ have no review rule | low | CONFIRMED | harness-doc | S0 | **open** |
| B-143 | M43 | Some environment prerequisites still live only outside the repo: where worktrees go, the npm cache, and an environment check at bootstrap | low | CONFIRMED | harness-doc+script | S0 | **open** |
| B-144 | M44 | Master §4 and §5 baseline lists are incomplete: four direct dependencies and src/app are missing, and ‘src/state holds the stores’ isn't true | low | CONFIRMED | harness-doc | S0 | **open** |
| B-145 | M45 | S3-D design authority is settled by ADR-0002; the intake procedure cites the wrong master section and has no item for the existing water sources | low | CONFIRMED | harness-doc | S0 | **open**. DESIGN_INTAKE.md:40 still cites master §45. |
| B-146 | M46 | Master S1 lists items the design never defines (baseline visual snapshots, design-token fidelity), and Phase 1's ‘every route opens’ check includes the Notifications tab built in S3 | low | CONFIRMED | design-erratum | S0 | **open**. Design erratum, recorded below; the S1 contract applies it. |
| B-147 | M47 | Native and forecast items are deferred in ADR-0003 but not in the requirements, and the deferred design assumes APIs and an ordering the code lacks | low | CONFIRMED | harness-doc | S0 | **partly fixed**. Fixed in 5ae85a3: NOTIFY-011 and PLAT-004 are DEFERRED. Phase 6 errata recorded below. |
| B-148 | M48 | Design §7.5 is wrong about verdict labels: CompatPreview shows the short labels, and the long-label badge it cites is unused code | low | CONFIRMED | design-erratum | S0 | **open**. Design erratum, recorded below; the S2 contract applies it. |
| B-149 | M49 | Design §10.3 misses the per-tank limit for the Auto Water Changer (it defaults to 6) and claims switching on from setting 0 sets 2, which setEquipment doesn't do | low | CONFIRMED | design-erratum | S0 | **open**. Design erratum, recorded below; the S3-A contract applies it. |
| B-150 | M50 | ‘Phone’ means two different media queries: the tab bar uses MOBILE_QUERY (including sideways phones), phone sheet styling uses PHONE_QUERY (≤ 760 px) | low | CONFIRMED | design-erratum | S0 | **open**. Design erratum, recorded below; the S1 contract applies it. |
| B-151 | M51 | Copy-deck toasts have label, title and detail parts, but useUI.toast takes one string and Toasts.tsx parses only four fixed prefixes | low | CONFIRMED | design-erratum | S0 | **open**. Design erratum, recorded below; the S1 contract applies it. |
| B-152 | M52 | The Social dock item's ‘New’ dot can't come from featureUnseen, because Social has no unlock key | low | CONFIRMED | design-erratum | S0 | **open**. Design erratum, recorded below; the S4 contract applies it. |
| B-153 | M53 | The test-integrity alarm's baseline isn't recorded yet, the inventory gate passes when no baseline exists, and gate-config edits and runtime skips aren't checked | low | PLAUSIBLE | harness-script | S0 | **open**. test-inventory refuses a missing reference and gains --baseline in 7c0dbf4 (untested, HANDOFF step 2); the baseline isn't written (HANDOFF step 7). Gate-config weakening checks open. |

## fix-now-app-safe (18)

Contained game fixes under ADR-0002 decision 2: each with a test and an independent review.

| ID | Mid | Title | Sev | Verdict | Type | Slice | Status |
|---|---|---|---|---|---|---|---|
| B-101 | M01 | A world step that throws used to be committed half-done; the atomic fix is uncommitted, failures still freeze the game silently, and loadAndResume still adopts a half-simulated catch-up | high | CONFIRMED | app-code | S0 | **partly fixed**. Fixed in 3e00a32 (atomic mutateFast, PERSIST-009), 58ae313 (throwing subscriber, PERSIST-010; test made machine-independent in 9edfa12) and 9e1bf66 (a failed publish and nested calls, PERSIST-009 A4-A5; B-001's loadAndResume, PERSIST-015). Left: B-002, and PlacementGhost's try/catch inside mutate (with B-179). |
| B-119 | M19 | The Genetics Lab never reveals allele-level genetics for any animal created since geneticsRevealed was added | medium | CONFIRMED | app-code | S0 | **open** |
| B-120 | M20 | S0's ‘Architecture Lock’ has guard tests in the working tree, but they're untraced and uncommitted, don't cover write call sites or read-only state, and the allowed import matrix isn't written down | medium | CONFIRMED | test | S0 | **partly fixed**. Fixed in 2ef1ff7 (guards committed), d8fb896 (async reads, wider patterns, import matrix in ARCHITECTURE.md), 5ae85a3 (traced as CONST-004) and 9e1bf66 (an unknown top-level src directory fails the lock; B-005). Left: an allowlist of setGame/mutateFast call sites and a read-only-state test. |
| B-121 | M21 | UI and render re-derive sim numbers that already disagree with the sim: the admission projection shows the opposite revenue sign, and the decor sell price and the Visitors lock hint are wrong | medium | CONFIRMED | app-code | S0 | **open** |
| B-122 | M22 | Crafted save files could pollute Object.prototype and make the game fetch remote images; the main fix is in the working tree, with defence-in-depth gaps | medium | CONFIRMED | app-code | S0 | **partly fixed**. Fixed in 6347c5d and d98731d (PERSIST-011): own-key lookups, whole-save scrub, null-prototype catalogs, photos must be data:image; 9e1bf66 (ADR-0015) keeps well-formed catalog ids a newer build added instead of deleting them, drops only unusable ids, each with a note (security-data-2 M3, ADR-0005 decision 1), and makes the legacy v0 migration skip unusable tank ids. Left: fastMutate's deepClone copies inherited keys (for…in), quadratic discoveredMorphs de-dup, a 1e999 test; PERSIST-004 stays S4. |
| B-123 | M23 | Leaving the game can silently drop unsaved play: failed saves are ignored on Load and Return to title, Autosave off skips the save the confirm promises, and Reload and crash paths don't check the result | medium | CONFIRMED | app-code | S0 | **open** |
| B-124 | M24 | Repeated small counter-offers push a patient buyer up to twice their private ceiling and keep the listing open days after it ended | medium | CONFIRMED | app-code | S0 | **open** |
| B-125 | M25 | Equipment could fail during the offline-grace catch-up; fixed in the working tree, but the contract comment still credits a core safety net that doesn't exist | medium | CONFIRMED | app-code | S0 | **partly fixed**. Fixed in 16233a1 (PERSIST-012). Left: src/types/game.ts:885 still credits a core safety net that doesn't exist. |
| B-157 | M57 | Small copy defects: ‘Axolotl usually live…’, a doubled ‘in in’ in an encyclopedia fact, three different tank-status vocabularies, and stale comments | low | CONFIRMED | app-code | S0 | **open** |
| B-158 | M58 | Offline catch-up ran market timers at the saved game speed (fixed in the working tree); live speed changes still stretch or shrink open deadlines | low | CONFIRMED | app-code | S0 | **open**. Not fixed as proposed: dfc0a13 forced 1×, and f999618 reverted it because bids made during the catch-up then expired 14-33 real seconds after the return (adversarial-1 F8). The catch-up keeps the saved speed on purpose (MKT-016). ADR-0016 decision 3 keeps it as it is, although a bid made early in the catch-up may then have only about 2.5 real minutes left at 3× (MKT-016 A2). Left: live speed changes still stretch open deadlines (owner question). |
| B-159 | M59 | The player's locale leaked into game state through money text in log events and show-placing ties; fixed in the working tree | low | CONFIRMED | app-code | S0 | **fixed**. Fixed in 2ef1ff7 (en-US formatting, code-unit tie-break, guard); guard widened in d8fb896 (CONST-004). The optional entryId tie-break wasn't added. |
| B-160 | M60 | Water-class research gates are enforced only in the UI: the sim's buyTank accepts marine, reef and brackish, and convertWaterClass accepts marine and reef, without the research | low | CONFIRMED | app-code | S0 | **open** |
| B-161 | M61 | Some tests still pass without checking what their names claim: partial guards in species tests and e2e assertions that can't fail | low | CONFIRMED | test | S0 | **open** |
| B-162 | M62 | Admission demand bottoms out at 5%, so revenue keeps rising with price; the sim accepts $250 while the slider stops at $40 | low | PLAUSIBLE | app-code | S0 | **open** |
| B-163 | M63 | Closing the welcome-back card overrides a pause the player made while it was open, and saves taken meanwhile store the old speed | low | CONFIRMED | app-code | S0 | **open** |
| B-164 | M64 | A load that finished while the tab was hidden got its overlap simulated twice; fixed in the working tree | low | CONFIRMED | app-code | S0 | **fixed**. Fixed in c774d38 (PERSIST-013). adversarial-1 F15 (a clock that steps back) is separate. |
| B-165 | M65 | Settings load accepts any JSON values (nulls, strings, NaN, out-of-range numbers) and writes them back; a null camera sensitivity crashes the Settings panel | low | CONFIRMED | app-code | S0 | **open** |
| B-166 | M66 | Nothing enforces the test-id contract and it has drifted: 25 ids in use are undocumented (one relied on by e2e) and the hud-speed row is broken | low | CONFIRMED | test | S0 | **open** |

## fix-now-repo (3)

Repository docs and config outside docs/agent.

| ID | Mid | Title | Sev | Verdict | Type | Slice | Status |
|---|---|---|---|---|---|---|---|
| B-154 | M54 | qa:shots still writes into the 14 tracked screenshots/ PNGs by default and can't fail on a missing test id | low | CONFIRMED | config | S0 | **open** |
| B-155 | M55 | Pre-harness docs still carry stale facts: a second ‘ADR-001’, a nine-item dock list missing ‘shows’, a broken TEST_IDS row, and unsettled non-core lane ownership | low | CONFIRMED | repo-doc | S0 | **open** |
| B-156 | M56 | Gate globs still miss *.test.tsx files and scripts/*.ts, the master's Level 0 and §52 still use a bare git diff --check, and §35's ‘assertion counts’ can't be measured | low | CONFIRMED | config | S0 | **open** |

## needs-slice (24)

Work for a later slice, named by the finding's own recommendation.

| ID | Mid | Title | Sev | Verdict | Type | Slice | Status |
|---|---|---|---|---|---|---|---|
| B-126 | M26 | No gate runs the production build under the /aquarium-go/ base path that GitHub Pages serves | medium | CONFIRMED | test | S1 | **open**. From S1; needed by S3-B. Gate-defining (ADR plus reviewer). |
| B-127 | M27 | Moving an animal or brood between tanks skips or re-simulates up to about 4 game hours of its life, because neither tank's sim debt is settled | medium | CONFIRMED | app-code | S3 | **open**. Before S3-C; earlier if S2 touches moves. |
| B-128 | M28 | S2's new betta loci will re-roll the seed-1234 starter behind a seed-fragile show-balance test, and the design wrongly says only one test depends on the seeded stream | medium | CONFIRMED | test | S2 | **open**. Before S2's loci, as a separate reviewed test change. |
| B-129 | M29 | Phone coverage is thin: Chromium only, 4 portrait and 2 landscape tests, and no landscape case planned for the new tab bar | medium | CONFIRMED | test | S1 | **open**. WebKit is an owner question. |
| B-130 | M30 | No test checks for value-creating economy loops; the market fuzz checks only structure and per-action money | medium | CONFIRMED | test | S2 | **open**. S2 and S3; each test lands with its fix. |
| B-167 | M67 | The compatibility cache is global, keyed on rounded values and shared with UI previews, so answers near thresholds can depend on history | low | CONFIRMED | backlog | S3 | **open**. Before automation uses compatibility decisions. |
| B-168 | M68 | RNG plumbing: coral nipping opens a second simRng inside a tank step and forks the main stream, and subsystem seeding and repair are ad hoc | low | CONFIRMED | app-code | S2 | **open**. With S2's RNG-stream change (OPERATIONS §11). |
| B-169 | M69 | Authoritative tank mutators (water conversion, substrate change, salt use) live in the UI lane, with a duplicated salt formula | low | CONFIRMED | app-code | S3 | **open**. Before S3-D water-preparation work. |
| B-170 | M70 | Species and food facts are hard-coded outside src/data: the ‘made for another animal’ rule exists four ways, and the sim branches on species ids and display names | low | CONFIRMED | app-code | S2 | **open**. S2 (catalog) and S3 Tier 3 (feed). |
| B-171 | M71 | There's no save-size budget, and the synchronous localStorage mirror fails silently above the browser's quota | low | CONFIRMED | test | S3 | **open**. PERSIST-005. |
| B-172 | M72 | Source-text CSS tests pin text, not behaviour; S1's nav.css will override the pinned rules while those tests stay green | low | CONFIRMED | test | S1 | **open** |
| B-173 | M73 | S3-B's quiet hours and rate limits run on the device clock; without pinned time, notification tests will pass by day and fail at night | low | CONFIRMED | test | S3 | **open**. S3-B contract. |
| B-174 | M74 | A whole-tank sale relocates the unlisted animals without a capacity limit and accepts high-risk mixes | low | CONFIRMED | app-code | S3 | **open**. With S3-C's sell step; the hard block for player sales is the owner's call. |
| B-175 | M75 | Entering a show and withdrawing for a full refund still completes the ‘Enter a show’ quest ($60 and 4 reputation, once) | low | CONFIRMED | app-code | S4 | **open**. S4 hardening. |
| B-176 | M76 | Background LOD chunks lose events that happen inside a chunk: opening a far tank can rot a fresh meal, cool-water spawning cues vanish, and no test pins LOD equivalence | low | CONFIRMED | app-code | S3 | **open**. Before automation; LOD-fidelity owner question. |
| B-177 | M77 | mutateFast's working-copy contract is unenforced: store writes during a recipe are lost, nested calls drop work, and catch-up highlights leak the private working copy | low | CONFIRMED | app-code | S3 | **partly fixed**. 9e1bf66 (PERSIST-009 A4-A5): nested calls are refused ("not re-entrant") and a failed publish drops the working copy; the JSDoc and ARCHITECTURE.md say so. Left, before S3's world-step hooks (or in S1): a store write during a recipe (the recipe's work is dropped without a report, or a later call reverts the write) and the catch-up highlights handed out from the working copy. |
| B-178 | M78 | Accessibility gaps against design §18: unnamed dialogs, offer status hidden from screen readers, a welcome card without Esc, colour-only stability, mixed tab patterns, and high contrast that leaves panels translucent | low | CONFIRMED | app-code | S1 | **open**. S1 and S2; the target level is an owner question. |
| B-179 | M79 | Errors swallowed inside mutate recipes commit half-applied actions, against the code's own rule | low | CONFIRMED | app-code | S1 | **open** |
| B-180 | M80 | Far-tank AI cost grows with tanks × animals, steps every far tank on the same frame, and keeps stepping tanks that are hidden | low | CONFIRMED | app-code | S3 | **open**. With an S3 performance scenario. |
| B-181 | M81 | The portrait cache is never evicted and its blob URLs are never revoked | low | CONFIRMED | app-code | S2 | **open** |
| B-182 | M82 | Per-frame code still allocates, DecorItem scans every tank per anemone, and nothing guards against new per-frame allocations | low | CONFIRMED | app-code | S1 | **open**. S1's render pass. |
| B-183 | M83 | Facility InstancedMeshes are never disposed, so their instance buffers are orphaned on every layout rebuild | low | CONFIRMED | app-code | S1 | **open**. The next slice that touches src/render/facility. |
| B-184 | M84 | TankAI creates its world and food registry during render but its cleanup deletes them, so a re-run effect (StrictMode or &lt;Activity&gt;) leaves the tank empty | low | CONFIRMED | app-code | S3 | **open**. When TankAI is next touched (likely with B-180). |
| B-198 | M98 | Sanitising turns a non-finite health into 0, so a future NaN bug would kill animals silently | info | CONFIRMED | app-code | S4 | **open**. S4 hardening. |

## owner-decision (23)

The owner decides first; the follow-up work then goes to a slice.

| ID | Mid | Title | Sev | Verdict | Type | Slice | Status |
|---|---|---|---|---|---|---|---|
| B-102 | M02 | A future schema bump would let the deployed v0.4.0 code restore an older backup and overwrite the newer save, and the save-compatibility rules disagree | high | CONFIRMED | owner-decision | OWNER | **decided**. ADR-0005 decision 1: old saves not required; good saves going forward. Left: the code fix (a too_new save is final and never overwritten, PERSIST-003). Master §3.5's interim gate sentence removed in ADR-0008. |
| B-131 | M31 | Pushes and deploys are blocked only by written rules in attended sessions, while push credentials, the gh, Render and Vercel CLIs and an unprotected main branch are live | medium | CONFIRMED | owner-decision | OWNER | **decided**. ADR-0004 decision 1: text rules only, for now. Left: the agent-doable text items (OPERATIONS §3 additions, §8's gh fact); relaunch changes in 7c0dbf4 (untested, HANDOFF step 2). |
| B-132 | M32 | There's no lawful path to acceptance once a baseline failure is acknowledged, NOT_APPLICABLE can waive any gate unchecked, and the e2e gate can't run in the sandbox | medium | CONFIRMED | owner-decision | OWNER | **partly decided**. ADR-0004 decision 2: browser tests from the Claude desktop app. Left: the baseline-acknowledgement and NOT_APPLICABLE policy; the warm-up is B-003. |
| B-133 | M33 | S3 scope can still shrink without an owner decision: a single machine may be simplified with no ADR, ‘substantial’ is self-judged, ‘option C’ is undefined and AUTO-002's criterion checks nothing | medium | CONFIRMED | owner-decision | OWNER | **open** |
| B-134 | M34 | Every local checkpoint exists only on one removable disk image, with no backup | medium | CONFIRMED | owner-decision | OWNER | **decided**. ADR-0005 decision 7 and ADR-0006 decision 1: bundles in /Volumes/Dev/Backup Projects/AquariumGo/. Checkpoint step written into OPERATIONS §6 with ADR-0008; no script does it; the first bundle is HANDOFF step 9. |
| B-135 | M35 | The approved §11 production-line design can't be built as written: single-line UI against several lines per species, a Prismatic switch that contradicts its own sim, and a sell step the listing code rejects | medium | CONFIRMED | owner-decision | OWNER | **partly decided**. ADR-0005 decision 6: the multi-line screens come with the owner's designs; DESIGN-S3C-LINES is registered with ADR-0008 (owner-approved, `1a74863`; signed off in code-architecture-harness-2). Left: the Prismatic switch and the sell step. |
| B-136 | M36 | Rare Opaque White and Double Tail carriers next to an equal-dominance partner never count as hidden, so the Rare genes filter would miss them and cards say ‘(both expressed)’ | medium | CONFIRMED | owner-decision | OWNER | **open** |
| B-137 | M37 | Performance gating can't produce the evidence the harness requires: perf.spec sits inside the e2e gate, two unit tests retry silently, and there's no baseline or GPU and AI-cost metric | medium | CONFIRMED | owner-decision | OWNER | **open** |
| B-138 | M38 | An empty, freshly dressed tank sells at auction for more than its parts cost: the beauty multiplier and the ‘ethical display’ bonus apply to hardware, and empty tanks qualify | medium | CONFIRMED | owner-decision | OWNER | **open** |
| B-139 | M39 | The ‘sales’ counter counts animals: one quick sale of 25 shrimp unlocks tank auctions and ‘Trusted Trader’, and business XP is multiplied per animal | medium | CONFIRMED | owner-decision | OWNER | **open** |
| B-185 | M85 | The approved 0.5 visual reference (45 static screens) lives only in a private canvas, so QA can't check ‘screenshot fidelity’ from the repo | low | CONFIRMED | owner-decision | OWNER | **open** |
| B-186 | M86 | The master puts production and the undesigned S3-D before Social and whole-stack hardening, which the design had last and allowed to slip | low | PLAUSIBLE | owner-decision | OWNER | **decided**. ADR-0005 decision 5: S3-D stays in S3. ADR-0002's "master §45" citation corrected in ADR-0008. |
| B-187 | M87 | Rarity-tier inflation (466 of 540 betta morphs Legendary) is an open owner decision the master turned into reviewer judgement | low | CONFIRMED | owner-decision | OWNER | **decided**. ADR-0005 decision 4: keep today's rule and count real numbers; npm run report:rarity added in 172b5c3 (GEN-013). Left: master §42 wording. |
| B-188 | M88 | The approved ‘notifications unsupported’ copy tells iPhone players to add the game to their Home Screen, which the design's own risk list says won't work in this build | low | CONFIRMED | owner-decision | OWNER | **open** |
| B-189 | M89 | Design §12.2's event sources are partly wrong: the new-species stocking event isn't a ‘rare strain’ event, and there's no ‘auction ending soon’ event although the Settings copy promises one | low | CONFIRMED | owner-decision | OWNER | **open** |
| B-190 | M90 | Production builds ship full state-editing developer tools (window.__AQ, a permanent ?dev=1, fixture autosave, sandboxes), and the Multiplayer gate has no trust-boundary criteria | low | CONFIRMED | owner-decision | OWNER | **decided**. ADR-0005 decision 2: write tools only with ?dev=1 (PLAT-005, S1). Left: trust-boundary criteria for the Multiplayer Readiness Gate. security-data-2 I4 (deferred under D-S0-3) confirms today's exposure: `src/main.tsx:6` imports `src/dev/debugHooks.ts` unconditionally, so production's `window.__AQ` carries `setGame` (which bypasses `repairState`), `mutate`, `deleteSave` and `importText`, and `?dev=1` persists `devMode` (`src/App.tsx:32`). |
| B-191 | M91 | Saves, settings, notification permission and the planned service worker sit on the shared graygrayson1.github.io origin | low | CONFIRMED | owner-decision | OWNER | **open** |
| B-192 | M92 | The Social stub's sign-in form invites real passwords that browsers may save for a shared origin, and it stores the email | low | CONFIRMED | owner-decision | OWNER | **decided**. ADR-0005 decision 3: Social is dev-only until a real backend exists (SOC-011). The form's password and email handling still matters when S4 builds it. |
| B-193 | M93 | The GitHub deploy workflow and Render build run no tests before publishing | low | CONFIRMED | owner-decision | OWNER | **open** |
| B-194 | M94 | Morph names and catalog odds disagree with what the game produces: a bristlenose name collision, rare morphs stocked more often than ‘1 in n’, and encyclopedia names the genetics never make | low | CONFIRMED | owner-decision | OWNER | **open** |
| B-195 | M95 | Animals in the holding container are frozen in time, though the game tells the player to ‘give them a tank soon’ | low | CONFIRMED | owner-decision | OWNER | **open** |
| B-196 | M96 | Moving a placed tank is unreachable: the room view reads a ‘move:&lt;id&gt;’ panel target that nothing writes | low | CONFIRMED | owner-decision | OWNER | **open** |
| B-197 | M97 | 46 react-hooks/exhaustive-deps suppressions exist with no linter installed, and one FoodPicker memo is stale | low | CONFIRMED | owner-decision | OWNER | **open** |

## record-only (3)

Verified clean; nothing to fix.

| ID | Mid | Title | Sev | Verdict | Type | Slice | Status |
|---|---|---|---|---|---|---|---|
| B-199 | M99 | Verified clean: entropy stays out of the sim, saves round-trip losslessly, repairState is idempotent, and nothing in public/ conflicts with a service worker | info | UNVERIFIED-INFO | none | — | **no action**. Lock these in as PERSIST-002 regression tests; S3-B's service worker never caches version.json. |
| B-200 | M100 | Verified compliant: AI never writes eating outcomes back, render subscriptions are narrow, AI loops are capped and audio cleans up | info | UNVERIFIED-INFO | none | — | **no action**. One line for ARCHITECTURE.md (AI results are never written back). |
| B-201 | M101 | Verified: listing anti-duplication protections hold; S3 auto-listing must go through createListing and quickSell only | info | UNVERIFIED-INFO | none | — | **no action**. S3-C and S3-D contracts: automation lists only through createListing and sells only through quickSell or completeSale. |

## Design errata by slice

Where the approved 0.5 design (`design/AQUARIUM_GO_0_5_DESIGN_SPEC.md`) is wrong about today's code. The spec isn't
edited: each erratum is applied through the named slice's contract (design banner, master §8). The wording below
comes from each finding's recommended fix; the JSON has the full text.

| ID | Design section | Slice | Erratum |
|---|---|---|---|
| B-115 | §5.3, §6.2, §6.3, §18 | S1 | A route with no sub-view segment closes any open sub-view: the router always sends an explicit root target, and each panel's `tab:` handler clears its sub-view state and its `useNav.sub` entry. Settings and the tank card report their tab through `useNavTab`; `settingsTab` and `useTankCardTab.want` stay one-shot commands. The More sheet's root carries `.ag-popover`, its trigger `.ag-popanchor`, and `POPOVER_TRIGGER` gains a `more` entry. §18: panels return focus through PanelHost's `lastFocus`, popovers through `usePopoverFocusReturn`. Tests: a nav-sync unit case and an e2e Back step from an offer. |
| B-116 | §5.6 | S1 | `useSheetBand` stays the mechanism; its portrait selector matches every 0.5 phone bottom sheet, not `.is-max`. The band floor is the lowest of the tab bar's top, the tops of any `.pn-buybar` or `.pn-wizard__nav`, and the body's bottom. The `nav.css` rule is only the first-frame fallback; leave the `hud.css` block alone (`fix-hud-toasts.test.ts:96`). `mobile-sheets.spec` asserts no toast intersects the buy bar or the tab bar. |
| B-117 | §6.4, §12.6, §20.2, §22 risk 2 | S1, S3-B | Once the owner answers the §6.4 question: the deep-link boot calls `loadIntoGame(latestSaveSlot())` inside `toastMark()`/`reportLoadFailure()`, and on failure shows the title. The capture is a module-level one-shot in `src/ui/nav/router.ts` and needs `useUI.screen === 'boot'`. A deep link is a hash that parses to a non-home route. Title-on-reload exists for the player, not for tests. `deeplink-boot.spec` opens a fresh page. The loading card uses an indeterminate bar. S3-B: `clients.claim()`, and `notificationclick` matches windows with `includeUncontrolled: true` filtered to its scope. |
| B-146 | master S1, §17, §21 Phase 1 | S1 | "Baseline visual snapshots": phone (390×844, 844×390) and desktop (1440×900) `qa:shots` of the new navigation in `.agent-runs/evidence/S1/shots`, hashed in the manifest and reviewed by Browser QA; not a pixel-diff gate. "Design-token fidelity": no new hard-coded colour, radius or spacing where a `tokens.css` token exists. `#/settings/notifications` parses in S1 and opens the default tab until S3-B, and is left out of S1's "every route opens" check. |
| B-147 | D7, §12.7, §14, Phase 6 | deferred | When Phase 6 resumes: `simulateOffline` gains an abort check between chunks (or the forecast runs in a worker); the forecast clones the state the hide save wrote, after its flush; native storage is configured in `main.tsx` before `createRoot().render`, never in a component effect. |
| B-148 | §7.5, §16 | S2 | CompatPreview shows the short labels. Use one wording across the offer detail (the owner's choice at S2 planning). Per-tile verdicts and the fit badge never carry `data-testid="compat-verdict"`. Delete `CompatPreviewLocal` in S2. |
| B-149 | §10.2, §10.3, §15 | S3-A | Add `water_changer: 1` to `MAX_PER_KIND` (`src/sim/care/tuning.ts`) and `tuning.ts` to §15's waterlab row; test that a second install fails. §10.2: the Auto-feed switch sends `{ on: true, setting: def.defaultSetting }` when the setting is 0 (UI side; `setEquipment` is unchanged). |
| B-150 | §5.2, §5.6, §20.2 | S1 | Every tab-bar-dependent behaviour (switcher removal, full-height geometry, tab-bar padding, the toast band, z-index 55) keys off `MOBILE_QUERY` through a new `.pn-sheet--mobile` class; `.pn-sheet--phone` stays for content density. Portrait widths 721-1000 px keep the PanelSwitcher. Add an 844×390 case to `mobile-sheets.spec`. |
| B-151 | §7 copy, §16 | S1 | `useUI.toast(text, kind?, parts?: { label?, detail? })`; Toasts.tsx prefers explicit parts over parsing. The copy deck's "/" and "·" are notation, not a runtime format. Phone toasts may hide the detail line unless the copy deck marks it essential. String-only callers keep working. |
| B-152 | §5.4, §20.1 | S4 | Social's `DOCK_ITEMS` entry gets `newUntilOpened: true`: the dot shows while the `opened_social` flag is unset and the game isn't a showcase; the More tile and tab roll-up use the same rule. No unlock key, no schema change. Social is dev-only for now (ADR-0005 decision 3). |

Other findings whose recommended fix includes a design erratum, after an owner answer or with their slice: B-128
(§8.6, §20.3), B-136 (dominance table and glossary), B-172 (§20.3), B-188 (§12.3) and B-189 (§12.2).

## S0 game fixes

The approved contained fixes (ADR-0002 decision 2, and the repair round of ADR-0015) and their files, as
`CURRENT_SLICE.md` "Expected files" refers to them. Each still needs a fresh independent review of the final S0 tree.

| Commit | Fix | Files | Requirement | Item |
|---|---|---|---|---|
| `3e00a32` | A world step that throws publishes nothing | `src/game/fastMutate.ts`, `src/game/GameLoop.tsx`, `tests/sim/core-fastmutate-atomic.test.ts` | PERSIST-009 | B-101 |
| `58ae313`, `9edfa12` | A throwing store subscriber no longer makes time run away; the test no longer depends on machine speed | `src/game/GameLoop.tsx`, `tests/sim/core-gameloop-publish.test.ts` | PERSIST-010 | B-101 |
| `6347c5d`, `d98731d` | Crafted saves can't reach `Object.prototype` through any id | `src/persistence/migrations.ts`, `src/data/byId.ts`, `src/data/species/index.ts`, the catalog tables in `src/data/`, `tests/sim/core-crafted-saves.test.ts`, `tests/sim/core-crafted-saves-fuzz.test.ts` | PERSIST-011 | B-122 |
| `16233a1` | Equipment doesn't fail during the offline grace | `src/sim/water/step.ts`, `tests/sim/fix-water-grace-equipment.test.ts` | PERSIST-012 | B-125 |
| `c774d38` | The hidden-tab catch-up covers only time not yet simulated | `src/persistence/offline.ts`, `tests/sim/fix-core-hidden-overlap.test.ts`, `tests/sim/fix-core-offline.test.ts` | PERSIST-013 | B-164 |
| `dfc0a13`, reverted by `f999618` | The catch-up keeps the saved market speed (the 1× change was wrong) | `src/sim/economy/listings.ts`, `tests/sim/fix-econ-offline-market-speed.test.ts` | MKT-016 | B-158 |
| `2ef1ff7`, `d8fb896` | Locale-independent sim text and show tie-breaks; determinism guard and layer import test | `src/sim/facility/actions.ts`, `src/sim/facility/progression.ts`, `src/sim/life/morphCatalog.ts`, `src/sim/shows/index.ts`, `tests/sim/core-determinism-guard.test.ts`, `tests/sim/core-architecture-boundaries.test.ts`, `docs/ARCHITECTURE.md` | CONST-004 | B-120, B-159 |
| `9e1bf66` | Saves keep well-formed records whose catalog id this build doesn't know; only unusable ids are dropped or reset, each with a note; the legacy v0 migration skips unusable tank ids | `src/persistence/migrations.ts`, `tests/sim/core-forward-compat.test.ts`, `tests/sim/core-crafted-saves.test.ts`, `tests/sim/core-crafted-saves-fuzz.test.ts` | PERSIST-011, PERSIST-003 A5 | B-122 |
| `9e1bf66` | A publish that throws leaves nothing behind, and nested `mutateFast` calls are refused | `src/game/fastMutate.ts`, `tests/sim/core-fastmutate-atomic.test.ts` | PERSIST-009 | B-101, B-177 |
| `9e1bf66` | `loadAndResume` catches up on a copy and resumes the loaded save unchanged when the catch-up throws | `src/persistence/offline.ts`, `tests/sim/core-resume-catchup.test.ts` | PERSIST-015 | B-001 |
| `9e1bf66` | An unknown top-level `src` directory fails the architecture lock; the determinism guard's stripper keeps regex and nested template literals | `tests/sim/core-architecture-boundaries.test.ts`, `tests/sim/core-determinism-guard.test.ts` | CONST-004 | B-005, B-120 |
