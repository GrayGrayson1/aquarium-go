# Code/architecture review: S0 harness half

- **Role:** code-architecture (independent, fresh subagent).
- **Candidate:** `c774d38` on `agent/aquariumgo-local-stack-20261005`. **Base:** `94de6bb` (the owner's harness as
  installed).
- **Scope:** `scripts/agent/**`, `docs/agent/**` (the design spec's header only), `AGENTS.md`, `CLAUDE.md`,
  `.gitignore`, `docs/ARCHITECTURE.md`, `docs/LANES.md`. Another reviewer covers `src/**` and `tests/**`; I opened
  those only to check what the harness documents claim about them.
- **Read:** `CURRENT_SLICE.md`; the S0 and ALL entries of `REQUIREMENTS.json`; the master and its `94de6bb` version;
  `OPERATIONS.md`; `README_FIRST.md`; the prompts and templates; the design registry and intake; ADR-0001, ADR-0002,
  ADR-0003 and `decisions/INDEX.md`; every script in `scripts/agent/` and its tests; the S0 manifest, logs and
  `baseline-failures.json`.
- **Not read:** `HANDOFF.md`, `LEDGER.jsonl`, commit messages, other reviewers' reports, `scripts/_audit/`.

## Commands run

| Command | Exit | Result |
|---|---|---|
| `node --test 'scripts/agent/*.test.mjs'` | 0 | 33 tests, 33 pass |
| `node scripts/agent/check-state.mjs` | 1 | One error: `docs/agent/PROTECTED.json is missing` (expected). No other error or warning. |
| `node scripts/agent/requirements-audit.mjs` | 0 | OK. S0: 6 IN_PROGRESS. ALL: 4 ACTIVE. S3: 4 PENDING, 1 BLOCKED. S4: 3 PENDING, 1 ACTIVE, 1 IN_PROGRESS. |
| `node scripts/agent/protect.mjs` | 1 | PROTECTED.json is missing |
| `node scripts/agent/relaunch.mjs --dry-run` | 1 | "Not starting a session: check-state.mjs reports 1 error(s)". It started nothing, but it did write the ignored file `.agent-runs/relaunch-settings.json`. |
| `node scripts/agent/context-pack.mjs --out -` | 0 | A 38 KB pack. I read only its headings and the list of cited design sections. |
| `node scripts/agent/handoff.mjs` | 0 | Prints the generated block. I read only its headings. |
| `node scripts/agent/diff-check.mjs` | 1 | FAILED (see H3) |
| `node scripts/agent/test-inventory.mjs` | 0 | After 9 min 31 s: "no earlier inventory to compare against" (Vitest 1772, Playwright 47). See M7. |

**Probes.** I ran the probes in a throwaway `git clone --shared` in the session scratchpad. The repository itself
wasn't changed.

**Launcher flags.** I checked Claude Code 2.1.289 with `claude --help` and by searching the binary's strings. Every
flag `relaunch.mjs` passes exists: `-p`, `--permission-mode auto`, `--permission-prompts none`, `--settings`,
`--append-system-prompt`, `--output-format stream-json`, `--verbose`, `--name`, `--model`, `--effort` and
`--max-budget-usd`. So do the variables `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS` and `CLAUDE_CODE_SESSION_ID`. The deny
rules use the documented `Bash(prefix *)` form.

**What I left in the repository.** Two ignored items: `.agent-runs/relaunch-settings.json` (from the dry run) and an
empty `.agent-runs/evidence/` (left by the trimLog test in `agent.test.mjs`). Plus this report.

## Findings

### High

**H1. The code-tree binding fails open after every checkpoint, and at ACCEPT from S1 on.**

- **Where:** `scripts/agent/evidence.mjs:28-31`, `scripts/agent/check-state.mjs:318-324` and `:126`.
- **What is wrong:**
  - `codeTreeOf(<commit>)` loads the commit into a temporary index, then runs `git rm -r --cached` on `docs/agent`,
    `AGENTS.md` and `CLAUDE.md`.
  - Git refuses ("staged content different from both the file and the HEAD") whenever those files differ between the
    commit and HEAD. That is always the case after the bookkeeping commit in OPERATIONS §6 step 5, which changes
    `STATE.json` and `LEDGER.jsonl`.
  - check-state catches the exception and reports it only as a WARNING. It leaves `codeTree` null, so the tree
    comparison at line 126 is skipped.
  - At ACCEPT in S1 to S4, `lastAcceptedCheckpoint` still names the previous slice's checkpoint. The target tree is
    wrong, and computing it throws as well.
- **Evidence (scratch clone):**
  - I wrote gate records on the baseline code tree `454801df` and moved through ACCEPT.
  - At ACCEPT (S0, before the checkpoint commit), check-state correctly failed with nine "passed on code tree
    454801df2c, not the current ec195aca76" errors.
  - After a checkpoint commit and a bookkeeping commit to CHECKPOINT, check-state printed "WARNING could not compute
    the code tree" and **OK, exit 0**. Only `--strict` failed.
  - The relaunch preflight reads errors only, so it would start the next slice.
  - The failure also reproduces in the repository itself: `codeTreeOf('94de6bb')` throws at HEAD.
  - The only test (`agent.test.mjs:309`) uses `codeTreeOf('HEAD')`, which can't hit this case.
- **Why it matters:** this is the main guarantee ADR-0003 advertises ("Gate results are now tied to the code they ran
  on"). It is also HARNESS-005's first acceptance criterion, OPERATIONS §6 ("At acceptance, check-state.mjs checks
  that every gate passed on exactly the tree of the checkpoint commit"), and the master's acceptance list.
- **Fix:**
  - In `codeTreeOf`, use `git rm -r -f --cached` (safe with `--cached` and a throwaway index) or
    `git update-index --force-remove`.
  - Make any failure to compute the tree an ERROR in accepted states.
  - At ACCEPT, compare against `codeTreeOf(null)`.
  - After the checkpoint, compare against `codeTreeOf(lastAcceptedCheckpoint)`, and require `codeTreeOf(null)` to
    equal it, because bookkeeping commits must not change code.
  - Add a test that computes the tree of an older commit whose `docs/agent` differs from HEAD.

**H2. The review-verdict guard records a RED report as GREEN.**

- **Where:** `scripts/agent/capture-evidence.mjs:29-31`, used at `:80`.
- **What is wrong:**
  - The regex accepts the word "verdict" followed by GREEN anywhere in the report, as long as only punctuation
    separates them.
  - `ROLE_PROMPTS.md:11-12` tells every reviewer to end with one of three verdict lines and spells out all three.
    `OPERATIONS.md:152` writes them as a pipe-separated triple.
  - A report that quotes either legend therefore passes the GREEN check even when its last line is RED.
- **Evidence:**
  - `reportStatesVerdict(<the ROLE_PROMPTS legend> + "\nVerdict: RED", 'GREEN')` returns true. So does the OPERATIONS
    §6 form.
  - The test at `agent.test.mjs:215` covers only a lone verdict line.
- **Fix:**
  - Parse only the last non-empty line.
  - Require that line to match `^Verdict:\s*(GREEN|YELLOW|RED)\s*$` (allowing `**` decoration), and compare the
    verdict for equality.
  - Have check-state re-read every cited report and compare its last line with the manifest entry. It already has the
    file path and hash.

**H3. The diffCheck gate fails at HEAD, and can't pass while evidence logs are in its range.**

- **Where:**
  - `scripts/agent/diff-check.mjs:27-41`.
  - `docs/agent/evidence/S0/logs/baseline-unit.log:228`: trailing whitespace. It comes from the seeded playthrough
    summary (`src/dev/fixtures/playthrough.ts:931`, default seed 12345), which the `tests/sim/playthrough-*` tests
    print. The line recurs in every unit log.
  - `baseline-unit.log:738` and `baseline-typecheck.log:5`: blank line at EOF.
  - `scripts/agent/protect.mjs:104`: blank line at EOF, a real harness defect.
- **What is wrong:**
  - `node scripts/agent/diff-check.mjs` exits 1 at HEAD.
  - Evidence logs are raw tool output, and their hashes are in the manifest. Cleaning them makes check-state report
    "evidence was edited".
  - Every `verify-slice.mjs` run writes new untracked unit and typecheck logs before the diffCheck gate runs, and
    diff-check scans untracked files too. The recurring playthrough line therefore turns diffCheck RED in every full
    verification, slice after slice.
  - S0 acceptance criterion 2 can't be met. The most likely agent "fixes" are editing evidence or dropping the gate,
    and both are forbidden.
- **Fix:**
  - Exclude evidence from the check, through the §3.8 ADR route. Either use
    `git diff --check <base> -- . ':(exclude)docs/agent/evidence'` plus the same filter for untracked files, or add
    `docs/agent/evidence/**/*.log -whitespace` to `.gitattributes`.
  - Remove the extra blank line at the end of `protect.mjs`.

**H4. Durable artefacts that the docs and ADRs say exist aren't in the repository, so S0's game fixes can't be
traced.**

- **Missing at HEAD:**
  - `docs/agent/BACKLOG.md`. It is cited by `AGENTS.md:57`, `OPERATIONS.md:204` and `:217`, `CURRENT_SLICE.md:30`,
    the master §12 tree (line 778), the design spec's banner (line 7) and `ADR-0003:41`.
  - `docs/agent/evidence/S0/reviews/` with the fifteen review results ADR-0003 rests on. ADR-0003 lines 14-18 say
    "The full results are in docs/agent/evidence/S0/reviews/".
  - `evidence/S0/test-inventory.json`, cited by `ADR-0003:42`.
  - `PROTECTED.json` (expected, per my brief).
- **Consequence:**
  - The branch changes 11 game files and adds 7 test files: `src/game/GameLoop.tsx`, `src/game/fastMutate.ts`,
    `src/persistence/migrations.ts`, `src/persistence/offline.ts`, `src/sim/economy/listings.ts`, two files in
    `src/sim/facility/`, `src/sim/life/morphCatalog.ts`, `src/sim/shows/index.ts`, `src/sim/water/step.ts` and
    `src/data/species/index.ts`.
  - Only `core-crafted-saves.test.ts` appears in `REQUIREMENTS.json` (PERSIST-004). `CURRENT_SLICE.md:30` says the
    approved fixes are "listed in BACKLOG.md".
  - Neither master §19 (requirement → task → diff → test) nor owner decision 2 ("each with a test and an independent
    review") can be checked.
  - Nobody can verify ADR-0003's basis (the fifteen reviews and the skeptic pass) from the repository.
  - The git-excluded `scripts/_audit/` holds folders named `H0-*`. If those are the review results, they live outside
    Git.
- **Fix:**
  - Commit `BACKLOG.md` with one entry per fix (id, defect, requirement, test, review), and add the matching
    requirements.
  - Commit the review reports under `evidence/S0/reviews/`, or correct ADR-0003 in a superseding ADR.

**H5. A clarification changes a locked owner decision: the save policy.**

- **Where:** master §3.5 (lines 117-127); `REQUIREMENTS.json` PERSIST-001 (line 321) and PERSIST-003 (line 352);
  `ADR-0003:3`, rule 7 at `:74` and register row at `:83`; the design spec banner (lines 3-7).
- **What is wrong:**
  - Master §3 decisions "are locked unless the owner explicitly changes them later".
  - The owner's §3.5, like ADR-0001 ("Old save compatibility is best-effort, not mandatory"), allows a documented,
    tested and locally reversible schema bump. It "supersedes any older statement that schema version 1 can never
    change".
  - The revision adds to the same section that a bump is an owner gate "until the owner decides the schema policy".
    The owner decided it two paragraphs earlier.
  - PERSIST-001 is ACTIVE and makes "a v0.4.0 save loads with repairs: [] at each slice's acceptance" mandatory. That
    reinstates design §3.3/§15, the clause master §3.5 superseded and the new banner calls replaced.
  - ADR-0003's register row says both "best-effort" and "must load".
  - ADR-0003's status line makes these rules stand unless the owner vetoes them. An agent-written ADR therefore
    overrides a constitutional decision by default.
  - The concern behind the change is real: too_new saves get overwritten. But that is a code defect, not a reason to
    forbid bumps.
- **Mitigation:** S0 acceptance criterion 7 requires the owner to answer the open questions before S0 closes.
- **Fix:**
  - Leave §3.5 as the owner wrote it, and record the bump question only as a proposal and owner question.
  - Set PERSIST-001 to PENDING (owner decision), or word it as best-effort.
  - Record the owner's verbatim answer in an ADR before any slice relies on it.

### Medium

**M1. Transition enforcement checks only the declared pair.**

- `record-event.mjs:26-37` never compares `--from` with `STATE.machineState` or with the last recorded transition.
- check-state only compares the last `toState` with STATE (`check-state.mjs:236-244`).
- In the clone, `--from ADVERSARIAL_REVIEW --to ACCEPT` was accepted while STATE was IMPLEMENT.
- `lib.mjs:117` lets OWNER_GATE move to any state, but OPERATIONS §4 allows only `resumeState` or `COMPLETE_LOCAL`.
- `validateEvent` (`lib.mjs:196`) accepts any non-empty string as the decision, so `["ok"]` passes.
- `remoteApproval` and `multiplayerApproval` accept any existing path (`check-state.mjs:302-304`); `package.json`
  would pass.
- **Fix:**
  - record-event reads the current state and requires `from` to equal it, and the slice to equal
    `STATE.currentSlice`.
  - check-state verifies that the transitions form one chain.
  - OWNER_GATE exits go only to `resumeState` or `COMPLETE_LOCAL`.
  - Decision and approval references must be committed `docs/agent/decisions/ADR-NNNN-*.md` files.

**M2. Gates can be dropped or waived in STATE.json.**

- `validateState` requires only typecheck, unit, build, e2e, diffCheck and independentReview
  (`check-state.mjs:96-98`).
- Acceptance accepts NOT_APPLICABLE for any gate, e2e included (`:145`).
- A gate record's `command` is never compared with `GATE_COMMANDS` (`:122-128`).
- **Probe:** CHECKPOINT, with e2e NOT_APPLICABLE, harnessTests, requirementsAudit, testInventory and protectedFiles
  deleted, and records whose command is `true`, produced no errors.
- Marking e2e NOT_APPLICABLE is the obvious way around BF-001, and it contradicts S0 criterion 3 and master §27.
- The S0 baseline records also reuse the gate names. For example, diffCheck is recorded with a different command.
- **Fix:**
  - Require every `GATE_COMMANDS` key.
  - Allow NOT_APPLICABLE only for browserQa.
  - Require `rec.command === GATE_COMMANDS[gate]`, and ignore records that carry a `phase`.
  - Let e2e be waived only with an owner ADR.
  - Rename the baseline records `baseline:<gate>`.

**M3. Reviews and browser runs aren't tied to the accepted tree.**

- In `check-state.mjs:129-142`:
  - independentReview needs only some GREEN code-architecture review, recorded at any time.
  - Acceptance needs the last review for each required role to be GREEN, whichever tree it reviewed.
  - browserQa GREEN needs a single browser run, on any tree and with any console-error count.
- In the H1 probe, reviews recorded on the baseline tree satisfied acceptance even at ACCEPT.
- Nothing enforces OPERATIONS §6 step 2 ("review the same tree") or §7 ("after any repair, a new reviewer instance
  reviews the new tree").
- **Fix:** in accepted states, require each required role's last review, and the browser runs, to carry the accepted
  code tree.

**M4. Append-only and tamper checks cover only uncommitted edits.**

- Requirement deletion and ledger rewrites are compared with HEAD (`check-state.mjs:215-217`, `:229-231`, `:330`,
  `:348`).
- **Probe:** after a commit, a rewritten first ledger line was no longer detected. A deleted requirement (PERSIST-003)
  was caught only because `CURRENT_SLICE.md` mentions it. Deleting SOC-002, for example, would pass.
- The manifest has no append-only check at all. A flipped exit code or a removed RED record goes unnoticed, because
  the log hash still matches.
- Only the current slice's manifest is validated, so an accepted slice's evidence can be edited later.
- HARNESS-005 claims all of these are caught.
- **Fix:**
  - Also compare the ledger, the requirement ids and every accepted slice's manifest against
    `lastAcceptedCheckpoint`, and the ledger against `actualBaselineSha`.
  - Treat `manifest.commands` and `manifest.reviews` as append-only.
  - Consider writing each gate run's exit code and log hash to the ledger.

**M5. Repair limits can be sidestepped, and the owner can't lift them.**

- `validateRepairCount` (`check-state.mjs:186-193`) counts only events for the current `repairTarget`, and counts
  nothing when it is null.
- **Probe:** nine repair events with the target null produced no error.
- Renaming the defect resets the counters. OPERATIONS §5 says they reset "only when its gate goes GREEN", but nothing
  enforces it.
- Conversely, once an owner decision moves BLOCKED_MANUAL_REVIEW → REPAIR, `validateState` (`:79-81`) errors
  forever, because the counters aren't allowed to reset.
- **Fix:**
  - Compute per-defect totals from the slice's repair events, and fail if any defect has reached a limit outside
    BLOCKED_MANUAL_REVIEW.
  - Add an override field, referencing an ADR, that the owner's decision sets.

**M6. bootstrap-check can't pass in the documented flow, and its freshness check is self-reported.**

- `bootstrap-check.mjs:46` requires `expectedSha === HEAD`. That can't happen in the documented flow:
  - `handoff.mjs:48` writes HEAD before the closing commit, and a file can't hold the hash of the commit that
    contains it.
  - OPERATIONS §6 step 5 adds a bookkeeping commit after the checkpoint.
- A fresh session therefore either fails S0-T11 or copies `git rev-parse HEAD`, which makes the field meaningless.
- `a.sessionId` is never compared with `CLAUDE_CODE_SESSION_ID` (`:59-62`), so the "fresh session" check rests on the
  agent's own word.
- **Fix:**
  - Accept `expectedSha` when `git diff --name-only <expectedSha> HEAD` touches only `NON_CODE_PATHS`, or compare code
    trees.
  - Compare `sessionId` with `currentSession()`.

**M7. The testInventory gate passes without comparing anything.**

- In `test-inventory.mjs:95-102` and `:115-119`, a missing earlier inventory prints a note and exits 0.
- For S0, the reference is S0's own file, so once it's written, S0 is compared with itself.
- At HEAD, the gate exited 0 after 9.5 minutes without comparing anything, although S0 changed tests (Vitest 1772
  now, 1753 at the baseline). The comparison S0 needs, baseline against S0, never happens.
- `test-changes.json` entries (`:121`) aren't validated: nothing checks the decision ADR or the requirement.
- The skip regex (`:21`) misses `.skip.each`, the `{ skip: true }` and `{ todo: true }` options, and
  `xit`/`xdescribe`.
- **Fix:**
  - Write the reference inventory from `actualBaselineSha` (in a temporary worktree) as S0's base.
  - Make a missing reference a failure.
  - Validate the test-changes entries.

**M8. The context pack breaks reviewer independence and points builders at the wrong design sections.**

- `README_FIRST.md:32-33` and `OPERATIONS.md:26-27` send the pack to builder **and reviewer** subagents.
- The pack embeds `HANDOFF.md` in full (`context-pack.mjs:45`, `:64-65`; lines 259-308 of the S0 pack). That
  contradicts OPERATIONS §7, AGENTS.md "Reviewer mode" and `ROLE_PROMPTS.md:7`.
- `citedDesignHeadings` (`:30`) treats every `§n` in a requirement's source as a design citation:
  - For S0 it lists design §1, §6, §8, §9, §10, §12 and §16 (goals, routing, genetics, automation, notifications,
    copy) under "load only these".
  - They come from "master §9", "OPERATIONS.md §6, §10" and "master §12-§16".
  - A range contributes only its two endpoints.
- **Fix:**
  - Add a reviewer mode that leaves out the handoff and the ledger, and fix the docs.
  - Match only `design §n` tokens, and expand ranges.

**M9. relaunch.mjs: an unbounded session cap, blind spots in push detection, and guard rails the session can edit.**

- **Session cap.** `--max-sessions` and `--bg-wait-hours` aren't validated (`relaunch.mjs:201-202`):
  - `--max-sessions six` gives NaN, and `sessionsRun >= NaN` is never true (`:100`). The loop runs until another
    stop condition hits. Probe: `decide` after 1000 sessions returns continue.
  - `--bg-wait-hours x` exports `NaN`.
- **Push detection.** `pushCount` (`:118-126`) sees only branch pushes to named remotes. These leave no "update by
  push" entry:
  - tag pushes (`git push origin checkpoint/S1-…`)
  - pushes to a URL
  - `git -c core.logAllRefUpdates=false push`

  REL-001's second criterion relies on this detection.
- **Deny rules.** The rules at `:33-69` don't match:
  - `git -C <dir> push`, `git -c k=v push` and `git --git-dir=… push`
  - `sh -c`, `env` and `xargs` wrappers
  - `git commit -a --amend`, `git tag -f`/`--delete` and `git branch --delete --force`
  - `git switch --discard-changes` and `git checkout -f`
  - `curl` or `wget` to the Render API

  The docstring calls the rules a guard rail. Detection after the session can't undo a push to `main`, which deploys
  immediately.
- **Editable rules.** The rules live in a writable file inside the repo (`.agent-runs/relaunch-settings.json`,
  `:205-207`). The unattended session could edit it.
- **Missing stop conditions.** The launcher doesn't stop when a session:
  - changed protected files or PROTECTED.json (see M10)
  - left a dirty tree
  - ran while another launcher or an attended session was working in the same tree. There is no lock.
- **Fix:**
  - Validate the numeric options: integers of at least 1.
  - Pass the settings inline (`--settings '<json>'`), or from a read-only file outside the repo.
  - Add the missing deny patterns.
  - Compare local refs (including `refs/heads/main` and tags) before and after each session, and raise an alarm on
    protected-file changes.
  - Ask the owner to install a pre-push hook, or a `remote.origin.pushurl` block, for unattended runs. Agents may not
    change guards themselves (OPERATIONS §2).

**M10. protect.mjs: any ADR an agent writes approves any change, and ignored files are hashed.**

- `protect.mjs:78` accepts any existing file that matches the ADR name pattern, and `:70` only checks that
  `approvedBy` exists.
- **Probe:** I appended "Agents may push." to the master, added a one-line `ADR-0099-anything.md` and ran `--update`.
  check-state reported OK.
- Neither the owner approval nor the reviewer sign-off that OPERATIONS §10 requires is checked, or even flagged.
- `protectedFiles` (`:34-44`) walks the file system, so git-ignored files count too.
- **Probe:** a Finder `.DS_Store` in `docs/agent/design/` became a protected file. Its next rewrite failed
  `protect.mjs`, which also blocks the launcher.
- **Fix:**
  - Hash `git ls-files` plus untracked files that aren't ignored.
  - Require the approving ADR to be committed and listed in `decisions/INDEX.md`, with an "Owner approval" section
    when owner-only files changed.
  - Raise an alarm in the launcher when protected files change.

**M11. ADRs claim results that the repository doesn't hold.**

- `ADR-0003:112-115` says typecheck and unit pass on the changed configuration, and that the E2E_REUSE change was
  verified. The S0 manifest holds only baseline records at `0d9fc5a`/`94de6bb` (master §18 rule 6).
- `ADR-0003:47-48` lists "the design decomposition" as done. S0-T6 is IN PROGRESS, and the registry has 23
  requirements.
- `ADR-0002:97` cites `relaunch.mjs --self-test`, which doesn't exist; the tests are in `agent.test.mjs`.
- `INDEX.md:3` says accepted ADRs are never edited, so each of these needs either the evidence or a superseding ADR.

**M12. Gates that judge `docs/agent` are tied to a tree that leaves out `docs/agent`.**

- requirementsAudit judges `REQUIREMENTS.json` and `CURRENT_SLICE.md`, and testInventory judges its own JSON file.
- Both are recorded against the code tree, which leaves those files out (`evidence.mjs:17`). Editing them after a
  passing run leaves the gate GREEN.
- check-state doesn't run `auditRequirements` itself in accepted states.
- **Fix:** run the audit inside check-state in accepted states, or add a `docs/agent` tree hash to these records.

**M13. PERSIST-003's ACTIVE status hides a known data-loss defect.**

- `REQUIREMENTS.json:352-364` says a too_new save is never replaced or overwritten.
- Master §3.5 says the live code does exactly that, and this diff doesn't change it: `migrations.ts:150` still
  classifies too_new saves the same way.
- The requirement has no slice, task or test, and ALL requirements are never audited.
- **Fix:** split it into the standing constraint and a PENDING fix requirement with a slice and a test.

### Low

**L1. Starting a slice isn't documented.**
- OPERATIONS §4 and §6 never say who does the following at NEXT_SLICE → BOOTSTRAP:
  - sets `currentSlice`
  - resets the gates to the full `GATE_COMMANDS` set
  - sets `requiredReviewers`
  - resets the repair counters
  - writes the new `CURRENT_SLICE.md`
- At NEXT_SLICE, the bootstrap assertion must still name the old slice.
- No script or procedure ever sets `manifest.checkpointSha` or `contextRolloverRequired`.

**L2. The S4 readiness gate runs without a fresh context.**
- S4 moves HANDOFF → MULTIPLAYER_READINESS_GATE in the same session (`OPERATIONS.md:94-95`). Master §3.2 requires a
  fresh context after every mega-slice.
- `lib.mjs:70` allows that exit from any slice, and allows HANDOFF → NEXT_SLICE in S4.

**L3. The REPAIR row's wording.**
- The `OPERATIONS.md:87` row "any verify ... state → REPAIR" includes BASELINE_VERIFY by name. `lib.mjs:57` doesn't
  allow it; baseline reds go to OWNER_GATE `BASELINE_RED`.
- Say so in the table.

**L4. The adversarial role.**
- `ROLE_PROMPTS.md:52-57` adds an `adversarial` role.
- Neither `OPERATIONS.md:187-190` nor master §3.2 ever requires it, yet ADVERSARIAL_REVIEW is the only way into
  ACCEPT.
- Say who reviews in that state.

**L5. README_FIRST inaccuracies.**
- `README_FIRST.md:29-30` says the assertion is "described in prompts/KICKOFF.md". It is described in
  `bootstrap-check.mjs:9-16` and master §16.
- `README_FIRST.md:32` says items 1-11 come to "roughly 70 KB". They come to about 120 KB at HEAD.

**L6. The design registry and the intake procedure.**
- `DESIGN_REGISTRY.json:14-20` lists 5 overrides, while ADR-0003's register (`:81-93`) has 11 rows.
- The registry is missing, for example:
  - the design's "all state changes go through useGame.mutate"
  - D3
  - D7/D13
  - the two open questions
- Steps 1, 2 and 5 of `DESIGN_INTAKE.md` edit the protected registry and add protected files. They never mention the
  ADR and `protect.mjs --update` that OPERATIONS §10 requires, so following the intake as written breaks check-state.

**L7. Contradictory owner-gate and YELLOW rules.**
- `HANDOFF_TEMPLATE.md:15-16` says "unanswered questions keep ownerGateRequired set".
- That contradicts `OPERATIONS.md:41-47`: park the question and keep working, and set the flag only when nothing else
  can proceed.
- Under the template's rule, the launcher stops on any parked question.
- Master §26 (line 1131) keeps "orchestrator review unless owner-visible" next to "never advances on its own ...
  owner-approved ADR".

**L8. The screenshot example.**
- The example at `capture-evidence.mjs:9-11` puts screenshots in the tracked `docs/agent/evidence/S1/screens/`.
- That goes against `OPERATIONS.md:154-155`.

**L9. Docs that don't match each other or the code.**
- Master §24 (when a security/data review is required) wasn't updated for permissions and harness guards, as §3.2 and
  OPERATIONS §7 were.
- `AGENTS.md:26-27` and master §5 describe `mutateFast` as "the game loop and offline catch-up".
  `ARCHITECTURE.md:34` adds the pre-save flush (`src/persistence/session.ts:38`, `:75`).
- The list of accepted wall-clock uses at `OPERATIONS.md:252-253` omits the save-metadata timestamps
  (`src/sim/newGame.ts:97`, `src/persistence/migrations.ts:359`).

**L10. Script edge cases.**
- `docs/agent/STOP` isn't ignored (`git check-ignore` says not ignored), so a `git add -A` commits it.
- `diff-check.mjs:36` passes untracked file names without `--`.
- Log names have one-second resolution (`evidence.mjs:96-98`). Two runs of the same gate within one second overwrite
  a log whose hash is already recorded.
- The code tree is captured only before the run (`evidence.mjs:101`), so edits made during a long gate go
  unnoticed.

**L11. Write side effects.**
- `relaunch.mjs --dry-run` writes `.agent-runs/relaunch-settings.json`: it starts nothing, but it isn't write-free.
- The trimLog test (`agent.test.mjs:289-307`) writes into the real repository's `.agent-runs/`.

**L12. Requirements registry details.**
- HARNESS-001's tests list a script (`bootstrap-check.mjs`).
- REL-001 cites the `decide` tests, which can't show that no push happened.
- Nothing audits the umbrella rule (`REQUIREMENTS.json:14`).
- S0-T8 maps to PERSIST-004 (slice S4), which isn't among the governing requirements at `CURRENT_SLICE.md:18-19`.

**L13. ADR-0003's other new rules are disclosed, and they tighten rather than loosen.**
- Rule 1 adds a five-attempt stop to ADR-0001's "three materially different failed repairs".
- Rule 4 removes `package.json` scripts and `tsconfig*.json` (core-owned per `LANES.md:32`) from ADR-0001's
  pre-authorization.
- Both are changes rather than clarifications. The owner should confirm them along with the rest.

## What holds up

- **Transition table.** The table in `lib.mjs` matches OPERATIONS §4 and master §11. It covers the normal flow, the
  failure path, the S4 path and the now-legal MULTIPLAYER_READINESS_GATE, and it forbids IMPLEMENT → ACCEPT and
  TARGETED_VERIFY → CHECKPOINT. The exceptions are the OWNER_GATE exits (M1) and the slice conditions (L2).
- **Script basics.**
  - Ledger appends are validated before writing, and the trailing-newline check works.
  - STATE and manifest writes are atomic (temp file plus rename).
  - diff-check includes untracked files.
  - The gate commands are quoted correctly for both sh and zsh.
- **Gate configuration.** The e2e and Vitest claims in OPERATIONS §6 hold: `vitest.config.ts:13-14`,
  `playwright.config.ts:18`, `:20` and `:37`, and `tsconfig.json:23`.
- **Launcher.** Its preflight and stop logic, and the split between default sessions and opt-in relaunch, match
  ADR-0002 decision 3.
- **Docs.** They are mostly consistent. AGENTS.md, master §5, ARCHITECTURE.md and OPERATIONS §11 agree on one reading
  order, the two deploy channels, the approval rule, the mutation boundary and the RNG streams. The code agrees too:
  wall-clock entropy appears only in `newGame.ts` and `migrations.ts`, and the `staff.rng` and `shows.rng` streams
  exist.
- **ADR-0002.** Its four decisions are implemented as the owner worded them: branch plus local commits, fix the safe
  bugs and log the rest, stop by default with opt-in relaunch, and design intake for S3-D.

## Summary

The revision gives the harness a much better structure, and its documents largely agree with each other and with the
code. S0 can't be accepted on this candidate, though:

- **H1.** The evidence-to-code binding the revision exists to add switches itself off after every checkpoint.
- **H2.** The guard that ties a recorded review to its report accepts a RED report as GREEN.
- **H3.** The diffCheck gate fails at HEAD, and it will keep failing in full verification while raw evidence logs are
  in its range.
- **H4.** The review results and the backlog that justify ADR-0003 and the game fixes aren't in the repository.
- **H5.** An agent-written ADR changes the save policy, a locked owner decision.

Several tasks marked DONE aren't done in substance:

- S0-T4: H1-H3, M6, M7, M9 and M10.
- S0-T5: the BACKLOG errata are missing (and see L6).
- S0-T7: there are no review results to check it against.

The medium findings show that an agent can get around the state machine, gates, repair limits and protected-file
checks by editing STATE.json or declaring a false `--from`. Most acceptance paths still need real evidence, but the
checks are weaker than the documents say.

Fix H1-H5 and M1-M3 before the S0 checkpoint, then have a new reviewer review the new tree.

Verdict: RED
