# Code/architecture review: S0 harness part, round 2

- **Role:** code-architecture, harness part. I'm a fresh, independent reviewer subagent and built none of the work
  reviewed here. The Cowork orchestrator session started me under ADR-0012 decision 1, so my process carries that
  session's id (`9fb166e0-…`), as subagents do.
- **Candidate:** `fd9ed1489e3296c9d496cac3fe9ec0e60958d78d`, a detached checkout. **Base:** `0d9fc5a` (v0.4.0).
  `94de6bb` contains no `scripts/agent`, so `git diff 94de6bb fd9ed14 -- scripts/agent` is the whole diff. The
  previous harness review judged `c774d38`, so I used `c774d38..fd9ed14` to see what changed since then.
  `scripts/agent` hasn't changed since `2926bf0`, the commit that carries ADR-0011.
- **Scope:**
  - `scripts/agent/**`, for the ADR-0011 sign-off;
  - the `DESIGN_REGISTRY.json` change made under ADR-0008 §5;
  - the consistency checks the prompt lists;
  - HARNESS-001 to HARNESS-030 (S0 and ALL; HARNESS-007 is S4 and out of scope) and REL-001.
- **Read:**
  - `AGENTS.md`, `CLAUDE.md` and the reviewer context pack;
  - `CURRENT_SLICE.md`, `OPERATIONS.md`, `README_FIRST.md`, `prompts/KICKOFF.md` and `ROLE_PROMPTS.md`;
  - the master: §0, §3, §9 S0, §11-§19, §26-§30, §41 and §54;
  - `decisions/INDEX.md`, and ADR-0001 to ADR-0012 as the pack gives them;
  - `DESIGN_REGISTRY.json` (with its diff), `DESIGN_INTAKE.md`, and the templates' relevant lines;
  - the S0 and ALL entries of `REQUIREMENTS.json`, plus the registry-linked ones;
  - every script in `scripts/agent` and all of `agent.test.mjs`;
  - `evidence/S0/manifest.json`, the listed logs, both `bootstrap-*.json` files and `PROTECTED.json`;
  - BACKLOG row B-135, and `code-architecture-harness-1.md` in full.
- **Not read:** `HANDOFF.md`, `LEDGER.jsonl`, builder reports, commit messages, `adversarial-1.md` and
  `security-data-1.md`.
  - I took `HANDOFF.md`'s byte count (`wc -c`) for README_FIRST's size claim without opening it.
  - The scripts read the ledger internally.
  - I didn't run `handoff.mjs`, because it prints ledger events and a commit subject.

## Verdict in short

The repair round fixed most of round 1: the code-tree binding (H1), the verdict parser (H2), the diffCheck gate (H3),
transitions that ignored the current state (M1), droppable gates (M2), reviews not tied to the tree (M3), the context
pack (M8), the session cap and deny rules (M9), and protect.mjs hashing ignored files (M10). The exported check
functions are well tested: of the 50 mutations I made in them, 48 were killed. But five gaps remain open, each verified
in a scratch clone:

1. **F1.** Any committed ADR can stand in for the owner's approval.
2. **F2.** The append-only anchor is an unchecked STATE field.
3. **F3.** STATE's slice can be changed without a transition.
4. **F4.** With S0's two code-architecture reviewers, acceptance depends on the order their verdicts are recorded.
5. **F5.** The repository-level checks have no tests that could fail: 26 single-guard mutations survived the whole
   suite, which contradicts ADR-0011's claim.

So I don't sign off ADR-0011. I do sign off the registry change.

## Commands run

All of these ran in the candidate checkout (read-only), unless marked *scratch*.

| Command | Exit | Result |
|---|---|---|
| `git status`, `git rev-parse HEAD` | 0 | clean; `fd9ed14` |
| `git diff --stat 0d9fc5a fd9ed14 -- scripts/agent docs/agent/design/DESIGN_REGISTRY.json docs/agent/PROTECTED.json` | 0 | 19 files, +4350 |
| `git diff --stat 94de6bb fd9ed14 -- scripts/agent`; `git diff --stat c774d38 fd9ed14 -- …` | 0 | +4201 (all new); +2736/−696 since round 1 |
| `git diff --stat fe6f674 fd9ed14 -- . ':(exclude)docs/agent' ':(exclude)AGENTS.md' ':(exclude)CLAUDE.md'` | 0 | empty: no code changed after the gate runs |
| `git diff --name-only b243b23 fd9ed14` | 0 | only files under `docs/agent` |
| `node --test 'scripts/agent/*.test.mjs'` | 0 | 75 tests, 75 pass, 0 fail, 0 skipped |
| `node scripts/agent/check-state.mjs` | 0 | OK; 1 warning, the expected one: detached `HEAD` isn't `main` |
| `node scripts/agent/protect.mjs` | 0 | OK |
| `node scripts/agent/diff-check.mjs` | 0 | clean against `0d9fc5a` (0 untracked files) |
| `node scripts/agent/requirements-audit.mjs` | 0 | OK. ALL: 17 ACTIVE, 1 SUPERSEDED, 3 PENDING. S0: 28 IN_PROGRESS |
| SHA-256 of every file in `PROTECTED.json` (python), and pattern coverage via `git ls-files -co --exclude-standard` | 0 | 53 of 53 match; no unrecorded or extra files |
| `git rev-parse origin/main`; `git merge-base --is-ancestor 0d9fc5a HEAD`; `git log --merges --format=%h 0d9fc5a..HEAD \| wc -l` | 0 | `0d9fc5a` (local ref, not fetched); ancestor; 0 merges |
| `claude --version`; `claude --help` (flag check only) | 0 | 2.1.290. Every flag `relaunch.mjs` passes exists: `--settings <file-or-json>`, `--permission-mode auto`, `--permission-prompts none` |
| *scratch:* `git clone --no-local` of the checkout into `/tmp/cah2-scratch/clone` | 0 | history is needed for the anchor and code-tree checks. The clone only reads the shared `.git` |
| *scratch:* `node --test …`; `check-state.mjs` | 0; 0 | the same results |
| *scratch:* 74 single-guard mutations, with the full harness suite after each | n/a | 48 killed, 26 survived (F5) |
| *scratch:* runtime probes P1 to P14, plus an S0 → S1 handover simulation | n/a | see the findings |

**Not run:**
- `npm run typecheck`, `npm test`, `npm run build`, `npm run e2e` and `test-inventory.mjs`: this container has no
  `node_modules`, and the npm registry is blocked.
- `relaunch.mjs`: never run (forbidden).
- `verify-slice`, `capture-evidence`, `record-event`, `next-slice` and `protect --update` write to the repo, so I ran
  them only in the scratch clone.

**Side effects:**
- The harness test run (its trimLog test, m6) left two empty, git-ignored folders in the checkout: `.agent-runs/` and
  `.agent-runs/evidence/`. I removed them with `rmdir`, and `git status --ignored` is clean again.
- `check-state.mjs` computes code trees through a throwaway index. That writes unreachable loose objects into the
  shared object store, which is inherent to the command.

## Findings

### Blocker

None.

### Major

**F1. The owner's escape hatches accept any committed ADR, whether or not it records the owner's words.**

- **Where:**
  - `lib.mjs:153-168`: `checkTransition`'s `adrExists` is `findAdr`.
  - `lib.mjs:237-259`: `findAdr` and `approvalIsAdr` check only that the ADR is committed and listed in the index.
  - `check-state.mjs`: lines 106-107 and 163 (gate waivers); 286-294 (ledger decisions); 331-338 (repair overrides);
    346-358 (design approvals); 413 and 432-436.
  - `record-event.mjs:99-104`.
  - The owner-approval check that does exist, `hasOwnerApproval` (`protect.mjs:102-109`), is used only by
    `protect.mjs --update` (`:143-144`).
- **What:** these are all accepted on any committed ADR listed in the index:
  - an ADR that lifts a repair limit (`STATE.repairOverrides`);
  - an ADR that waives a gate, e2e included (`STATE.gateWaivers`);
  - an ADR that leaves `OWNER_GATE` or `BLOCKED_MANUAL_REVIEW`;
  - an ADR that backs an `owner-decision` event;
  - an ADR that approves a design;
  - an ADR that backs `remoteApproval` or `multiplayerApproval`.

  Nothing checks the owner's words: not INDEX.md's "Owner decision" column, and not an "## Owner approval" section.
- **Evidence (scratch, P6 and P6b):**
  - Setup: I wrote `ADR-0013` with `**Status:** Accepted` and no approval section, indexed it, committed it, and ran
    `protect.mjs --update --adr ADR-0013`. It was accepted, because only INDEX.md and the new ADR changed, and neither is
    owner-only.
  - Repair limit: with five repair attempts on `D-S0-9`, check-state failed with "reached the repair limit". With
    `repairOverrides: {"D-S0-9": "ADR-0013"}` it printed **OK**.
  - e2e waiver: `gates.e2e: NOT_APPLICABLE` with `gateWaivers.e2e: ADR-0013` also printed **OK**.
  - Remote approval: `remoteApproval: ADR-0007` passes check-state (P5b). The launcher still refuses to run.
- **Why it matters:**
  - The harness's own texts promise more:
    - `lib.mjs:120`: "e2e needs an owner ADR";
    - check-state's error messages: "owner-approved waiver", and "an owner ADR in STATE.repairOverrides";
    - OPERATIONS §2 and §5, and master §3.3: stop for owner or manual inspection;
    - HARNESS-023 A2: "unless STATE.repairOverrides names an owner ADR". This criterion isn't met;
    - HARNESS-026 A2: "a committed ADR that records the owner's approval verbatim";
    - HARNESS-018 A3: an owner ADR acknowledges BF-001.
  - Impact: an orchestrator stuck at the repair limit, or unable to run e2e, can authorize itself with one new ADR, even
    in good faith. check-state and the relaunch pre-flight then pass; only relaunch's protected-file alarm notices,
    after the session.
  - ADR-0011's open point 2 covers `protect.mjs` only, so this gap isn't listed anywhere.
- **Fix:** one helper used for every reference above. For example: `findAdr`, plus the INDEX row's Owner-decision column
  "Yes", plus `hasOwnerApproval` for ADRs written from now on (ADR-0001, -0002, -0004 and -0005 have no "## Owner
  approval" heading). Key waivers by slice (open point 4), and test each path.

**F2. The append-only anchor is a STATE.json field that nothing validates.**

- **Where:**
  - `check-state.mjs:440` (the anchor);
  - `check-state.mjs:96-98` and `:423-431`: they check only the format, that the commit exists, that it's an ancestor of
    HEAD, and that it comes after the baseline;
  - `diff-check.mjs:26-33` (the gate's base);
  - `protect.mjs:171` and `:176` (`adrAtAnchor`).
- **What:**
  - Every "against every committed version since the anchor" check uses `lastAcceptedCheckpoint ?? actualBaselineSha`:
    the ledger, the requirement ids and every slice's manifest. So does diffCheck's base.
  - `lastAcceptedCheckpoint` may be set in any state, IMPLEMENT included, to any commit after the baseline.
    `actualBaselineSha` only has to be a commit.
  - Neither is compared with `planningBaselineSha`, with earlier committed STATE versions, with the ledger or with a tag.
- **Evidence (scratch, P11a to P11c):**
  - A committed rewrite of ledger line 1 → check-state **fails**, which is correct.
  - The same rewrite, then `lastAcceptedCheckpoint` set to the rewrite commit while still in IMPLEMENT → **OK**.
  - The same rewrite, then `actualBaselineSha` set to that commit → **OK**. diff-check then checks only that last commit
    ("against 1c10f4c…: clean").
- **Why it matters:**
  - HARNESS-005 A1, HARNESS-010 A3, HARNESS-011 A1 and HARNESS-012 A3 rest on these comparisons. One field edit after a
    committed rewrite hides it.
  - HARNESS-019 A1 attributes "both are 0d9fc5a…" to check-state. The script checks only that they're full SHAs of
    commits.
  - Open point 3 mentions the missing tag check, but not this consequence.
- **Fix:**
  - Treat `actualBaselineSha` as write-once: equal to `planningBaselineSha` and to its value in every committed STATE
    version.
  - Allow `lastAcceptedCheckpoint` only after an `ACCEPT → CHECKPOINT` transition. Require the ledger at that commit to
    end at `→ ACCEPT` for the same slice, and that slice's manifest there to have verdict GREEN. When a checkpoint tag
    exists, require it to point at the same commit.
  - Alternatively, always anchor the ledger and the requirement ids at the baseline.
  - Add tests.

**F3. `STATE.currentSlice` is never compared with the ledger.**

- **Where:** `check-state.mjs:303-311` (`validateStateAgainstLedger` compares `machineState` only) and `:273-300`
  (`validateLedger` doesn't check that transitions stay in one slice). `record-event.mjs:94` trusts
  `STATE.currentSlice`.
- **Evidence (scratch, P12):** mid-S0, in IMPLEMENT, I edited STATE: `currentSlice` S1, task `S1-T1`, gates PENDING,
  `browserQa` NOT_APPLICABLE. With CURRENT_SLICE.md's header changed to S1, check-state printed **OK**, and record-event
  then accepts S1 transitions.
- **Why it matters:**
  - The edit skips S0's acceptance, checkpoint, independent review and fresh-session rollover without recording a single
    transition.
  - Only later checks would object: the requirementsAudit gate (S0 requirements still open), or S1's acceptance audit.
  - check-state's docstring promises "no silent state edits".
- **Fix:**
  - Require `STATE.currentSlice` to equal the slice of the last transition, except in the prepared NEXT_SLICE state that
    `evidenceScope` already recognises.
  - In the chain, let the slice change only at `NEXT_SLICE → BOOTSTRAP`, and only to the next slice.
  - Add tests.

**F4. Acceptance looks only at the latest review per role, and S0 has two code-architecture reviewers.**

- **Where:** `check-state.mjs:155-161`.
- **Evidence:** I called `validateGateEvidence` for ACCEPT, with every gate GREEN and all reviews on tree T.
  - Order 1: code-architecture RED (`…-harness-2.md`), code-architecture GREEN (`…-game-2.md`), security-data GREEN,
    adversarial GREEN → **no errors**.
  - Order 2, the two code-architecture reviews swapped → "needs a GREEN code-architecture review".
- **Why it matters:**
  - ADR-0012 decision 1 splits code-architecture into a game reviewer and a harness reviewer.
  - Both are recorded with `--role code-architecture` (ROLE_PROMPTS, `capture-evidence.mjs`).
  - So whether S0 can be accepted with one of them RED depends only on the order the orchestrator records them in.
  - HARNESS-025 and HARNESS-026 intend that no required verdict is RED or YELLOW at acceptance. Their criteria say
    "latest review per role", which doesn't fit a split role.
- **Fix:**
  - Available now, with no script change, before any S0 verdict is recorded: add `code-architecture-harness` to
    `STATE.requiredReviewers` and record the harness report under that role. The game report stays under
    `code-architecture`, which `independentReview` and `validateState` need. Then each half's latest review must be
    GREEN.
  - Script fix: require the latest review of each report series (the report path without its `-<n>.md`) on the
    accepted tree to be GREEN.
  - Add a test.

**F5. The repository-level checks have no test that could fail, and ADR-0011's mutation claim doesn't hold for them.**

- **Where:**
  - `check-state.mjs:399-543`: `checkRepository` is neither imported nor run by any test;
  - `protect.mjs:148-157` (`verifyProtected`);
  - `lib.mjs:245` and `:249`: `findAdr`'s "listed in the index" and "committed" conditions;
  - the CLI bodies of `record-event.mjs:75-117` and `verify-slice.mjs:33-66`: the tests only feed them an unknown option;
  - `evidence.mjs:113-155` (`runAndRecord`);
  - `diff-check.mjs`.
- **Evidence:** I made 74 single-guard mutations and ran the whole suite after each.
  - Killed (48): all 25 targeted mutations of the check-state, lib, requirements and protect validators; 22 of 24 in the
    relaunch, bootstrap, test-inventory, next-slice, verify-slice, context-pack, evidence and args functions; and
    capture-evidence's report-path rule.
  - Survived (26). In `check-state.mjs`:
    - code changed after the checkpoint (:453);
    - checkpoint after the baseline (:428);
    - checkpoint-tag ancestry (:421);
    - `feat/*` (:419);
    - STATE SHAs are commits (:424);
    - approvals, waivers and overrides are ADRs (:433-436);
    - a failed tree computation is an error once accepted (:457);
    - the anchor (:440);
    - the full audit in accepted states (:508);
    - the prepared predecessor check (:475);
    - every slice's manifest (:479);
    - STATE against the ledger (:523);
    - the `verifyProtected` call (:536);
    - manifest `checkpointSha` (:476);
    - the CURRENT_SLICE header (:511).
  - Survived, elsewhere:
    - `protect.mjs:153` and `:155`: approvedBy, and the ledger hash;
    - `record-event.mjs:94`, `:103` and `:99`: slice, owner-decision ADR, and session;
    - `verify-slice.mjs:53`: E2E_REUSE cleared;
    - `evidence.mjs:150`: treeChanged;
    - `diff-check.mjs:38`: the evidence exclusion;
    - `findAdr`'s index and committed conditions.
  - A few survivors are backed up by tested pure functions (:457 by validateGateEvidence's null-tree error; slice
    checks on transitions by checkTransition).
  - Every survivor I probed exists and fails closed at runtime: P1 to P5, P8, P10 and P14, and diff-check passes at HEAD.
- **Why it matters:**
  - ADR-0011 says "Each guard was reverted once in a scratch copy and a test failed every time". That holds for the pure
    functions, not for these.
  - Several criteria cite tests that don't cover their guard: HARNESS-024 A1 ("agent.test.mjs: check-state after
    next-slice", for tag ancestry and code after the checkpoint), HARNESS-017 A2, HARNESS-019 A3, HARNESS-013 A1 and
    HARNESS-021 A1.
  - Any of those lines can be deleted with harnessTests still GREEN. Because `scripts/agent` is protected, review is
    then the only thing that would catch it.
- **Fix:**
  - Add a fixture test: copy `scripts/agent` and a minimal `docs/agent` into a temporary git repo under `os.tmpdir()`,
    then spawn `check-state.mjs --json`, `protect.mjs`, `record-event.mjs` and `diff-check.mjs` there. Probes P1-P14
    are the scenario list.
  - Correct ADR-0011's claim in the repair ADR (accepted ADRs are never edited).

### Minor

- **m1. requirements-audit.mjs** (`requirements.mjs:60-72`, `requirements-audit.mjs:47-50`):
  - In the prepared NEXT_SLICE state it reports every open requirement of the new slice twice: "no task after
    PLAN_LOCK" and "claims acceptance (NEXT_SLICE)". That was 58 false errors in my handover simulation (P9).
    check-state avoids this through `evidenceScope`.
  - It also never checks CURRENT_SLICE.md's header, although HARNESS-013 A1 says it does. Only check-state does (P10).
- **m2. Reviewer list** (`check-state.mjs:111-113`): `validateState` requires only code-architecture, although
  `MANDATORY_REVIEWERS` is imported. Dropping adversarial and security-data from STATE passes (P13).
  - `preparedView` backs this up for S0-S3 once `next-slice.mjs` has run.
  - Nothing does between ACCEPT and HANDOFF, or for S4.
- **m3. Resume state** (`lib.mjs:161-164`): entering OWNER_GATE accepts any legal state that isn't a stop state as
  `--resume`, for example ACCEPT, CHECKPOINT, NEXT_SLICE or MULTIPLAYER_READINESS_GATE. The exit then needs only any
  ADR (F1).
  - So a gate entered from IMPLEMENT can resume at ACCEPT. The accepted-state checks still apply, but the readiness
    gate's S4 condition, which is checked only on the NEXT_SLICE edge, can be skipped.
  - Restrict resume to the state the gate was entered from.
- **m4. Checkpoint procedure against the scripts** (OPERATIONS §6 step 6; `check-state.mjs:476-478`):
  - Missing `checkpointSha` (round-1 L1): after the checkpoint, check-state requires the manifest's `checkpointSha` to
    equal `lastAcceptedCheckpoint`, but neither §6 nor any script sets it. Following step 6 as written failed at
    CHECKPOINT in my simulation until I set it by hand.
  - Missing reference inventory: §6 never runs `test-inventory.mjs --write`, which writes the next slice's reference
    inventory.
  - Both fail closed. Fix: have record-event set `checkpointSha` on `ACCEPT → CHECKPOINT`, and add the `--write` step.
- **m5. bootstrap-check.mjs against master §16** (`:28-36`, `:45-77`):
  - §16 asks for the "expected baseline/checkpoint SHA". `expectedSha` is the handoff's HEAD instead, and it's never
    compared with `actualBaselineSha` or `lastAcceptedCheckpoint`.
  - `readFiles` and `firstFiles` aren't checked to exist.
  - `MANDATED_READS` covers 7 of README_FIRST's 11 items.
  - `startedAt` isn't validated, and the assertion file itself isn't hashed into the manifest.
  - Session ids come from `CLAUDE_CODE_SESSION_ID` (`lib.mjs:270`), which any command line can set. That's worth a line
    in OPERATIONS §7's "can't catch" list.
- **m6. The harness tests**:
  - The trimLog test (`agent.test.mjs:1220-1239`) writes into the repo's `.agent-runs/` and leaves the folder behind,
    against the header's "never write to it" (lines 7-8). Use `os.tmpdir()`.
  - `parseCounts` (`evidence.mjs:74-87`) doesn't read node:test's summary, so the harnessTests record has empty counts.
  - test-inventory doesn't track node:test ids or skips (`test-inventory.mjs:54-62`), so a `{ skip: true }` in
    `agent.test.mjs` keeps the gate GREEN.
- **m7. Repair counters** (`record-event.mjs:60-73`): repair events never update `STATE.repairAttempt` or
  `repairTotalAttempts`, yet check-state errors when STATE lists fewer attempts than the ledger (`check-state.mjs:340-341`).
  Let record-event maintain the counters, and reset them on `--resolved`.
- **m8. The launcher lock** (`relaunch.mjs:345-356`, `:384-385`): it checks, then writes, so two launchers started
  together can both run. Use `openSync(…, 'wx')`. It also doesn't cover an attended session in the same tree.
- **m9. STATE schema** (`check-state.mjs:57-71`): `REQUIRED_STATE_KEYS` omits `integrationBranch`,
  `actualBaselineSha`, `lastAcceptedCheckpoint`, `repairTotalAttempts` and `repairTarget`. Deleting `integrationBranch`
  silences check-state's branch warning; relaunch still refuses, which is tested.
- **m10. Protection coverage**:
  - `protect.mjs:24-41` protects `tsconfig.json` by exact name, while master §3.8 says `tsconfig*.json`. Only
    `tsconfig.json` exists today.
  - These files shape the gates or the code tree but aren't protected: `tests/sim/setup/yield-between-tests.ts` (vitest
    `setupFiles`, ADR-0010), `.gitignore` and `.gitattributes`.
  - `docs/agent/STOP` still isn't ignored (round-1 L10).
- **m11. Owner-only docs out of step with the scripts** (fix together in one owner-approved docs ADR):
  - OPERATIONS §10 says new protected files warn, but they error (open point 1). Its pattern list also omits
    `package.json`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `.github/` and `render.yaml`.
  - OPERATIONS §1 and README_FIRST don't mention `--for reviewer`.
  - OPERATIONS §4's "any verify … state → REPAIR" row (round-1 L3).
  - README_FIRST says items 1-11 come to "roughly 70 KB"; they come to about 132 KB (L5).
  - DESIGN_INTAKE.md steps 1, 2 and 5 add or edit protected files with no ADR or `protect.mjs --update` step (L6). The
    next session starts with design intake, so this matters soon.
  - `HANDOFF_TEMPLATE.md:16`, "unanswered questions keep ownerGateRequired set", contradicts OPERATIONS §2 (L7). The
    template isn't owner-only.
  - Master §24 (L9).

### What holds up

- **Transitions.**
  - `TRANSITIONS` matches OPERATIONS §4, and a test asserts the whole table.
  - `checkTransition` enforces: the from-state equals STATE; the slice; OWNER_GATE resumes only at its recorded state;
    decisions; NEXT_SLICE sessions; S4-only readiness.
  - The ledger chain is enforced.
- **H1, H2 and H3 are fixed and confirmed:** older-commit trees, the verdict on the last line only, and diffCheck clean
  at HEAD.
- **Relaunch:** the decisions, alarms (including a failed `ls-remote`), credential stripping, deny rules and pre-flight
  are all tested, and their mutations were killed.
- **Handover simulation.** In the scratch clone, with fabricated evidence, the whole S0 → S1 handover worked:
  - ACCEPT, then the checkpoint commit and tag;
  - CHECKPOINT (once `checkpointSha` was set), COMPACT, HANDOFF, NEXT_SLICE;
  - the prepared state left by `next-slice.mjs`, with check-state OK.
  - The closing session was refused `NEXT_SLICE → BOOTSTRAP`; a new session was allowed.

## Sign-off decisions

- **ADR-0011: not signed off.**
  - F1-F4 are fail-open gaps in the diff ADR-0011 covers.
  - F5 contradicts its verification claim.
  - Otherwise the diff is a clear improvement.
  - ADR-0011 is Accepted and can't be edited. So: repair F1-F5 with tests under a new ADR, then have a new reviewer
    instance review the new tree.
  - The m-items can follow, or go to BACKLOG with the owner's knowledge.
- **The design-registry change (ADR-0008 §5, `62df438 → 1a74863`): signed off.**
  - It matches the §5 row item by item:
    - the new `DESIGN-S3C-LINES` (PENDING_OWNER_DESIGN, scope S3-C) blocks only the multi-line UI;
    - overrides were added for Social dev-only (D2, D5, §13) and for the §11.1 single line card;
    - the §3.3 override row now cites ADR-0005 decision 1;
    - DESIGN-S3D's `doesNotBlock` no longer frees S3-C.
  - The JSON parses, and `validateRegistry` passes.
  - HARNESS-003 A1 and A3 hold: 7 BLOCKED requirements, each with a matching `blockedBy`.
  - Every reference resolves:
    - design §10, §11.1-§11.3, §12, §13, D2 and D5 exist;
    - BACKLOG B-135 confirms that the Prismatic switch and the sell step are still open. B-135 still calls ADR-0008
      "(proposed)", which is a nit.
  - The change was hashed into `PROTECTED.json` (at `fe6f674`) before this sign-off. That is the order the owner approved
    in ADR-0008 (lock the hashes at step 7, review at step 8).

## ADR-0011's open points: my view

1. **A new protected file errors, but OPERATIONS §10 says it warns.** Keep the error; it fails closed. Correct §10, with
   its pattern list, in the owner-approved docs ADR (m11).
2. **Any Accepted owner ADR newer than the anchor can bless `--update`.** Confirmed, and live today.
   - P7: ADR-0012, which is about subagents and the sync, blessed an OPERATIONS.md edit that added "Agents may push to
     main without asking." After that, protect.mjs and check-state both printed OK.
   - Until the first checkpoint, every owner ADR since the baseline qualifies.
   - Recommendation:
     - make `--update` require the ADR to name each changed owner-only file (ADR-0008 §5 already does);
     - list the changed files in the ledger event;
     - ask the owner, because it changes how owner ADRs are written;
     - meanwhile, reviewers diff `PROTECTED.json` at every protect event.
   - Settle this before running unattended.
3. **`lastAcceptedCheckpoint` isn't checked against its tag.** The larger problem is F2, the unvalidated anchor.
   Validate the checkpoint against the ledger and manifest at that commit, which works without tags, and compare with the
   tag when one exists.
4. **`gateWaivers` carry into the next slice.** This fails open once a waiver exists, and with F1 any ADR can create
   one. Key waivers by slice (`preparedView` needs the predecessor's), and start each new slice with none. Settle this
   before granting a waiver for BF-001.
5. **`--resolved` resets the counters without evidence.** The scripts can fix this alone: require `--resolved` to cite a
   manifest record with exit 0, of the defect's gate, recorded after its last attempt. Fix it alongside F1, since it
   undermines the same limit.
6. **Deny rules match command text only.** Accurate, and more:
   - Indirection gets past them: `bash x.sh`, `node -e`, an npm script.
   - The real preventive control is credential stripping. It doesn't cover a token inside a remote URL or an unencrypted
     SSH key.
   - `ls-remote origin` can't see a push to another URL.
   - The test treats `*` as a glob anywhere in the pattern. I didn't verify how Claude Code matches a `*` in the middle
     of a rule.
   - The owner chose text rules only (ADR-0004 decision 1). Ask again before the first unattended run: a pre-push hook
     or a `pushurl` block is the only guard that would prevent a push to `main`.
7. **`main()` and `snapshot()` aren't tested.** Agreed. A smoke test could pass `--claude` a stub script, in a temporary
   repo with a local bare origin.

## Consistency checks

- **`PROTECTED.json` against the files it hashes:**
  - 53 recorded, 53 match, and pattern coverage is complete.
  - Its `approvedBy` is ADR-0012 (committed and indexed), and protect.mjs exited 0, which verifies the ledger hash.
  - The `fe6f674 → fd9ed14` update changed only `INDEX.md` and added ADR-0012.
- **OPERATIONS §4 against `TRANSITIONS`:** they match, except for the REPAIR row's wording (m11) and m3.
- **OPERATIONS §6 against `next-slice.mjs` and `verify-slice.mjs`:**
  - They match on the refusals, the archived contract, the STATE resets, the new manifest and draft, and on
    verify-slice's logging and its inability to set independentReview or browserQa.
  - The gaps are m4 and open point 4.
- **`bootstrap-check.mjs` against master §16:** all the fields are present, with the deviations listed in m5.

## Requirements in focus: the guards

| Req | Guard exists | Test that could fail | Fails closed | Open |
|---|---|---|---|---|
| HARNESS-001 | yes | yes | yes | m5 |
| HARNESS-002 | yes | yes (relaunch, bootstrap) | yes | open point 7 |
| HARNESS-003 | yes | yes | yes | none |
| HARNESS-004 | yes | partly (the check-state wiring isn't tested) | yes (P5a) | F1 |
| HARNESS-005 | yes | the pure checks yes; the anchor and verifyProtected wiring no | yes (P8, P11a) | F2, F5 |
| HARNESS-006 | yes | the config test yes; E2E_REUSE clearing no | yes | config is the game reviewer's part |
| HARNESS-009 | yes | yes | yes | none |
| HARNESS-010 | yes | the pure checks yes; the commit check and STATE-ledger wiring no | yes | F2, F3, m7 |
| HARNESS-011 | yes | the pure checks yes; the accepted-state wiring no | yes | m1 |
| HARNESS-012 | yes | the pure checks yes; runAndRecord and the all-slice loop no | yes | F5 |
| HARNESS-013 | check-state only | header check no; next-slice yes | yes (P10) | m1 |
| HARNESS-014 to HARNESS-016 | yes | yes | yes, where it applies | none |
| HARNESS-017 | yes | relaunch yes; check-state no | yes (P4) | F5 |
| HARNESS-018 | yes (baseline records via `phase`, baseline inventory) | yes | yes | unit is RED and e2e hasn't run on the S0 tree, outside this part |
| HARNESS-019 | partly | the format check yes; the commit and after-baseline checks no | yes (P2) | F2 |
| HARNESS-020 | yes | yes | yes | none |
| HARNESS-021 | yes | protect yes; findAdr's two conditions no | yes (P14) | F5 |
| HARNESS-023 | yes | yes | yes | F1, open point 5, m7 |
| HARNESS-024 | yes | next-slice yes; tag and code-after-checkpoint no | yes (P1, P3) | m4, F5 |
| HARNESS-025, HARNESS-026 | yes | yes | yes | F4, F1, m2 |
| HARNESS-027 | yes | yes | yes | m3 |
| HARNESS-028 | yes | yes | yes | open point 2, m10 |
| HARNESS-022, -029, -030 | process | n/a | n/a | review |
| REL-001 | yes (text rules plus relaunch's deny rules, stripping and alarms) | yes | yes | open point 6. `origin/main` is `0d9fc5a` locally (not fetched) |

## Status of the code-architecture-harness-1 findings

| Finding | Status |
|---|---|
| H1, H2, H3 | Resolved. F5 notes that H1's after-checkpoint comparison and H3's evidence exclusion have no test |
| H4, H5, M11, M12, M13, L2, L4, L8, L13 | Resolved |
| M1 | Resolved, apart from F1 and m3 |
| M2 | Resolved, apart from F1 (waivers) |
| M3, M6, M7 | Resolved |
| M4 | Partly: committed rewrites are caught, but the anchor can be moved (F2) |
| M5 | Resolved, apart from F1 and open point 5 |
| M8 | Script resolved; the docs still don't mention `--for reviewer` (m11) |
| M9 | Resolved; open point 6 and m8 remain |
| M10 | Partly (open point 2) |
| L1 | Partly (m4) |
| L3, L5, L6, L7, L9 | Unresolved (m11) |
| L10 | Partly: STOP isn't ignored (m10) |
| L11 | Partly (m6) |
| L12 | Partly: HARNESS-001 still lists scripts among its tests |

## Evidence notes

- **Gate records.** The manifest's records after the baseline ran on code tree `4d29120a…`, which is also the
  candidate's code tree: only `docs/agent` changed after `fe6f674`, and check-state gives no stale-tree warning.
- **Gates.** These records exited 0: typecheck, build, diffCheck, harnessTests (75 of 75), testInventory,
  protectedFiles and requirementsAudit. My re-runs of the harness gates agree.
- **Open S0 gates outside this review's part.** unit exited 1 (1 of 1792 failed), and e2e has no record on the S0
  tree. Both are S0 acceptance blockers for the owner's Mac run (BF-001, BF-003, ADR-0012 decision 3).
- **Bootstrap.** The Cowork bootstrap assertion passed at `b243b23`. Every commit since touches only `docs/agent`.
- **Reviews.** None is recorded yet.

Verdict: RED
