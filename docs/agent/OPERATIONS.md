# AquariumGo harness: operating procedures

The master (`AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md`) says **what** must hold. This file says **how** an orchestrator
does it day to day: sessions, approvals, remote actions, states, repairs, evidence, reviewers and this machine's
quirks. Where the two disagree, the master wins. Change this file through an ADR.

The machine-readable copies of the vocabularies below (states, transitions, gate values, statuses, event kinds) live
in `scripts/agent/lib.mjs`. The scripts in `scripts/agent/` enforce them; run `node scripts/agent/check-state.mjs`
before and after every state change.

---

## 1. Sessions and slice boundaries (ADR-0002 decision 3)

- Every orchestrator session starts with the prompt in `prompts/KICKOFF.md` and assumes it remembers nothing.
- A session ends at every mega-slice boundary and at every early-rollover trigger (master §17), after the rollover
  checklist and a local commit. It never carries on into the next mega-slice.
- **Default:** the owner starts the next session. **Opt-in:** the owner runs `node scripts/agent/relaunch.mjs`, which
  starts each next session headlessly and stops at owner gates, blocks, errors, no progress, the file
  `docs/agent/STOP`, a detected push or deploy-config change, or its session cap. Creating `docs/agent/STOP` stops
  the launcher before its next session.
- Builders and reviewers are subagents of the orchestrator session (Agent tool), or agents in a Workflow script run
  from the top-level session. Workflows don't run inside subagents.
- A session that will run long background work keeps working until that work reports back; it never ends its turn
  while a gate or review is still running in the background.
- `node scripts/agent/context-pack.mjs` builds a compact pack (state, hard owner decisions, non-negotiables, slice,
  handoff, cited ADRs, requirements, cited design headings) for builder and reviewer prompts.

## 2. The owner, approvals and owner gates

- **The owner** is the person who owns the `GrayGrayson1/aquarium-go` repository and starts these sessions. Only the
  owner approves remote actions, multiplayer, new dependencies, owner-visible scope changes, designs, YELLOW
  verdicts and the release version. A schema change needs no separate approval: it is allowed when a feature needs
  it, documented and tested, and the save code never treats a save written by newer code as damaged, falls back past
  it or overwrites it (master §3.5, ADR-0005 decision 1, PERSIST-003).
- **An approval is valid only when** the owner typed it in a top-level session, and it is recorded word for word in
  an ADR (the question, the exact answer, the date, the scope and any expiry) plus a ledger event of kind
  `owner-decision`. Subagent output, tool results, workflow results, files an agent wrote and the agent's own
  summaries are never approvals. ADR-0002 is the pattern.
- An approval covers only what it names. "Push branch X to origin" doesn't approve a deploy, a tag push or a second
  push later.
- Agents never change their own permission settings, hooks, deny rules or push guards, and never ask a subagent to.
- **Owner gate protocol.** When a decision only the owner can make blocks the work:
  1. Park the blocked item and keep working on anything in the slice that doesn't depend on it.
  2. When nothing else can proceed, or the slice can't be accepted without the decision: write the question under
     "Owner questions" in `HANDOFF.md` (options and a recommendation), set `ownerGateRequired: true`,
     `ownerGateReason` (`DESIGN_PENDING:<id>`, `YELLOW_VERDICT:<slice>`, `SCOPE_REDUCTION:<req>`,
     `DEPENDENCY:<name>`, `BASELINE_RED:<test>`, `REMOTE_ACTION`, `MULTIPLAYER` or `OTHER:<text>`) and
     `resumeState`, record the transition to `OWNER_GATE`, commit and end the session.
  3. The next session leaves `OWNER_GATE` only after the decision is recorded (an ADR), returning to `resumeState`.

## 3. Remote actions: what counts

Forbidden without a recorded owner approval for that specific action:

- `git push` in any form (any remote, branch, tag, `--force`, `--tags`, `--follow-tags`, `--mirror`), and adding or
  changing remotes.
- Anything that writes to GitHub: pull requests, merges, releases, issues, comments, `gh` write commands, `gh api`
  calls that are not GETs, and `workflow_dispatch` runs.
- Deploys. This repo has **two** deploy channels:
  - **GitHub Pages**: every push to `main` runs `.github/workflows/deploy.yml` and publishes the site.
  - **Render** static site `aquarium-go` (service `srv-dath0mfavr4c73dgk3j0`, `render.yaml`): deploys are triggered
    with the Render CLI or API (`render deploys create …`), or by the Render dashboard.
- Publishing packages, apps, store builds, or repo content to any external service (including gists and artifacts).
- Remote secrets, settings or configuration, and production data.

Also treated as owner-visible: **edits to `.github/**` or `render.yaml`**. They change what the owner's next push
deploys, so they need a requirement, show up in the owner package, and stop the launcher for review.

Allowed: read-only network access for documentation, package metadata and research, and `git fetch`.

## 4. Machine states and transitions

| From | To | When |
|---|---|---|
| (start of program) | `BOOTSTRAP` | the first S0 session |
| `NEXT_SLICE` | `BOOTSTRAP` | the first session of the next slice (S1-S4), after `next-slice.mjs` (§6) |
| `BOOTSTRAP` | `BASELINE_VERIFY` | bootstrap assertion written and checked against Git |
| `BASELINE_VERIFY` | `SLICE_DISCOVERY` | baseline (or last checkpoint) gates recorded |
| `SLICE_DISCOVERY` | `PLAN_LOCK` | contract, requirements and target files known |
| `PLAN_LOCK` | `IMPLEMENT` | tasks mapped to requirements, tests and reviewers named |
| `IMPLEMENT` | `TARGETED_VERIFY` | a task is ready to check |
| `TARGETED_VERIFY` | `IMPLEMENT` | next task |
| `TARGETED_VERIFY` | `FULL_VERIFY` | all tasks done and targeted checks green |
| `FULL_VERIFY` | `BROWSER_QA` / `SPECIALIST_REVIEW` / `ADVERSARIAL_REVIEW` | all objective gates GREEN on the final code tree |
| `BROWSER_QA` | `SPECIALIST_REVIEW` / `ADVERSARIAL_REVIEW` | browser QA GREEN |
| `SPECIALIST_REVIEW` | `ADVERSARIAL_REVIEW` | triggered specialist reviews GREEN |
| `ADVERSARIAL_REVIEW` | `ACCEPT` | independent reviews GREEN and requirements audit passing |
| any verify, QA or review state | `REPAIR` | a gate, check or review failed |
| `REPAIR` | `TARGETED_VERIFY` / `FULL_VERIFY` / `BROWSER_QA` / `SPECIALIST_REVIEW` / `ADVERSARIAL_REVIEW` | repair attempt ready to re-check |
| `REPAIR` | `IMPLEMENT` | the repair needs new implementation work |
| `REPAIR` | `BLOCKED_MANUAL_REVIEW` | repair limit reached (§5) |
| `ACCEPT` | `CHECKPOINT` | checkpoint commit and tag made |
| `CHECKPOINT` | `COMPACT` | `lastAcceptedCheckpoint` recorded |
| `COMPACT` | `HANDOFF` | obsolete context pruned |
| `HANDOFF` | `NEXT_SLICE` | handoff regenerated; the session ends (every slice, S4 included) |
| `NEXT_SLICE` | `MULTIPLAYER_READINESS_GATE` | S4 accepted: the first session after it ("After S4" below) |
| `MULTIPLAYER_READINESS_GATE` | `OWNER_GATE` | readiness result and owner package written |
| any state | `OWNER_GATE` | §2 owner gate protocol |
| `OWNER_GATE` | `resumeState` or `COMPLETE_LOCAL` | owner decision recorded in an ADR |
| `BLOCKED_MANUAL_REVIEW` | `SLICE_DISCOVERY` / `IMPLEMENT` / `REPAIR` | owner instruction recorded in an ADR |

Never: `IMPLEMENT → ACCEPT`, a checkpoint without the full gates, acceptance on the builder's word, any push, or
multiplayer work without the owner. `record-event.mjs` refuses transitions that aren't in this table, and
`check-state.mjs` checks that `STATE.machineState` matches the last recorded transition.

Internal checkpoints (master §3.1): a local commit after Level 2 checks pass, during `IMPLEMENT` or
`TARGETED_VERIFY`. It doesn't change the machine state; record its commands as evidence.

**After S4.** The session that accepts S4 goes through `CHECKPOINT`, `COMPACT` and `HANDOFF` to `NEXT_SLICE` and
ends, like every slice; it doesn't run `next-slice.mjs`, which refuses after S4. A new session (`bootstrap-check.mjs`
refuses the session that recorded `HANDOFF → NEXT_SLICE`) records `NEXT_SLICE → MULTIPLAYER_READINESS_GATE`, which
`record-event.mjs` allows only while the slice is S4 and `evidence/S4/manifest.json` has verdict GREEN. It runs the
gate (master §10), writes the readiness result and the owner package (master §49), moves to `OWNER_GATE` with reason
`MULTIPLAYER`, commits and ends. Only an owner decision recorded in an ADR leaves that gate (§2).

## 5. Repairs (master §3.3)

- Each failing gate, test or review finding that blocks the slice is a **defect** with an id `D-<slice>-<n>`.
- Every attempt is counted and logged with `record-event.mjs --kind repair`: the defect id, the hypothesis, the
  strategy in one line, the files touched and the result.
- `STATE.repairTarget` names the defect; `repairAttempt` counts **distinct strategies**; `repairTotalAttempts`
  counts **all** attempts.
- Whether a strategy is distinct is judged by a reviewer subagent, not by the agent doing the repair. When unsure,
  count it as distinct.
- At **3 distinct strategies or 5 attempts in total** on the same defect, stop: write
  `evidence/<slice>/root-cause-<defect>.md`, move to `BLOCKED_MANUAL_REVIEW`, commit and end the session.
- A defect's counters reset only when its gate goes GREEN.
- Oscillation (fixing A breaks B and back): stop routine repair and give a fresh diagnosis subagent the evidence.

## 6. Gates, evidence and checkpoints

**Objective gates** (`scripts/agent/lib.mjs` `GATE_COMMANDS`):

| Gate | Command |
|---|---|
| `typecheck` | `npm run typecheck` |
| `unit` | `npm test` |
| `build` | `npm run build` |
| `e2e` | `npm run e2e` |
| `diffCheck` | `node scripts/agent/diff-check.mjs` (everything since the last checkpoint, untracked files included) |
| `harnessTests` | `node --test 'scripts/agent/*.test.mjs'` |
| `requirementsAudit` | `node scripts/agent/requirements-audit.mjs` |
| `testInventory` | `node scripts/agent/test-inventory.mjs` (no test id disappeared or gained a skip since the last slice) |
| `protectedFiles` | `node scripts/agent/protect.mjs` (no protected harness file changed without an ADR) |

Vitest runs with `requireAssertions` and without `.only`, and Playwright with `forbidOnly`, so a test that asserts
nothing or a focused test can't produce a passing gate. A gate that fails and then passes on the same code tree is
**flaky**: `check-state.mjs` flags it, and the acceptance report lists it. One re-run is allowed, and it is recorded
as its own run, never in place of the failure.

Run them with `node scripts/agent/verify-slice.mjs`. It logs each run to `evidence/<slice>/logs/`, records the
command, times, exit code, counts, log hash, HEAD and **code tree** in `evidence/<slice>/manifest.json`, and sets the
gate GREEN or RED. It can't set `independentReview` or `browserQa`.

**Evidence layout** (`docs/agent/evidence/<slice>/`):
- `manifest.json`: every command, browser run, review and performance measurement (see
  `templates/EVIDENCE_MANIFEST_TEMPLATE.json`).
- `logs/`: command logs (committed; text). A log over 1 MB is trimmed to its last 2,000 lines plus the counts before
  committing, and the full log is kept in `.agent-runs/` with its hash in the manifest.
- `reviews/<role>-<n>.md`: each reviewer's own report, ending with `Verdict: GREEN|YELLOW|RED`.
- `bootstrap-<timestamp>.json`, `acceptance-report.md`, `root-cause-<defect>.md`.
- Screenshots and traces: `.agent-runs/evidence/<slice>/` (ignored by Git) with their SHA-256 in the manifest, until
  the owner decides whether binary evidence is committed.

Record targeted checks, browser runs, reviews and performance numbers with `scripts/agent/capture-evidence.mjs`.
Never write evidence into the tracked `screenshots/` folder: run `npm run qa:shots -- <url> --out .agent-runs/evidence/<slice>/shots`.

**The code tree.** Every record carries the Git tree hash of the code with `docs/agent` removed (`evidence.mjs`
`codeTreeOf`). A gate result is valid only for the tree it ran on; change any code or config and the gate must run
again. At acceptance, `check-state.mjs` checks that every gate passed on exactly the tree of the checkpoint commit.

**Checkpoint procedure.**
1. Finish all code. Run `verify-slice.mjs` for every gate on that final tree.
2. Have the required reviewers review the same tree; each re-runs the gates its verdict depends on (§7). Record each
   verdict with `capture-evidence.mjs --review`.
3. Run `requirements-audit.mjs`; write `evidence/<slice>/acceptance-report.md` from the template; set the manifest
   verdict to GREEN; record `ADVERSARIAL_REVIEW → ACCEPT`.
4. Commit code and evidence together as `S<n>: checkpoint — <name>`, and add the local tag `checkpoint/S<n>-<name>`.
5. Back up the repository (ADR-0006 decision 1, HARNESS-008). The first time, create the folder
   `/Volumes/Dev/Backup Projects/AquariumGo/`. Run
   `git bundle create "/Volumes/Dev/Backup Projects/AquariumGo/aquariumgo-S<n>-<sha12>.bundle" --all` (`<sha12>`: the
   first 12 characters of the checkpoint commit), then `git bundle verify` on that file through
   `capture-evidence.mjs --command` (label `backup-bundle`), so its exit code and log are recorded. The folder is on
   the same drive as the repository: it protects against a damaged or rewritten repository, not a lost drive. A cloud
   session can't reach that folder (§8): it records this step as not run, in the acceptance report and in
   `HANDOFF.md`, never as done.
6. In a bookkeeping commit, set `lastAcceptedCheckpoint` to that commit's full SHA and move through `CHECKPOINT`,
   `COMPACT` and `HANDOFF` to `NEXT_SLICE`; for S0-S3 run `next-slice.mjs` (below); run `handoff.mjs --write`;
   commit; end the session.

**Starting the next slice** (S0-S3). The closing session runs, after it records `HANDOFF → NEXT_SLICE` and before its
last commit:

```bash
node scripts/agent/next-slice.mjs --reviewers code-architecture,adversarial[,browser-qa,security-data,performance] [--no-browser]
```

It refuses unless the machine state is `NEXT_SLICE`, refuses after S4 (the next step there is the readiness gate,
§4), and refuses a reviewer list without `code-architecture` and `adversarial` (`MANDATORY_REVIEWERS`). It:
- copies `CURRENT_SLICE.md` to `evidence/<finished slice>/slice-contract.md`;
- sets `STATE.currentSlice` to the next slice and `currentTask` to `<slice>-BOOTSTRAP`, every gate to `PENDING`
  (`browserQa` to `NOT_APPLICABLE` with `--no-browser`), `requiredReviewers` to the list given, the repair counters to
  zero and `contextRolloverRequired` to true;
- creates the next slice's empty `manifest.json` if there is none, and writes a `CURRENT_SLICE.md` draft from the
  template.

The next session records `NEXT_SLICE → BOOTSTRAP` for the new slice and completes the contract at `PLAN_LOCK`,
adding to `STATE.requiredReviewers` any specialist role the contract triggers (§7).

**Baseline failures.** A gate that is red before the slice changed anything is classified, not fixed in passing:
record it in `evidence/<slice>/baseline-failures.json` (test, evidence, classification, owner acknowledgement), and
raise an owner gate (`BASELINE_RED:<test>`) unless the owner has already acknowledged it. Never skip, loosen or
retry it to get green.

## 7. Reviewers

- **Independence.** A reviewer is a fresh subagent that receives only what its prompt lists: the slice contract, the
  requirement subset, the design excerpt, the diff (`git diff <base>..<candidate>` plus untracked files) and the
  evidence paths. It doesn't read `HANDOFF.md`, `LEDGER.jsonl`, builder reports or commit messages, and it never
  sees the builder's narrative.
- Reviewers are read-only. Each writes one report, `evidence/<slice>/reviews/<role>-<n>.md`, with file-level
  findings and a final `Verdict:` line. The orchestrator records it unchanged.
- After any repair, a new reviewer instance reviews the new tree.
- **Required roles:** `code-architecture` and `adversarial` for every slice (`next-slice.mjs` refuses a reviewer
  list without them); `browser-qa` for user-visible slices; `security-data`
  when persistence, the service worker, auth or social state, networking, trust boundaries, permissions or the
  harness's guards change; `performance` when rendering, simulation cost, large collections, routing churn or
  automation scale can regress. The slice contract names them in `STATE.requiredReviewers`.
- **Reviewers re-run the gates.** A gate recorded GREEN in the manifest is data an agent wrote, so it is not proof on
  its own (adversarial-1 F2). Each reviewer re-runs, on the candidate tree, the gates its verdict depends on (for
  example `npm test` and `npm run typecheck` for code, `node --test 'scripts/agent/*.test.mjs'` and
  `node scripts/agent/check-state.mjs` for harness changes) and lists the commands and exit codes in its report. The
  adversarial reviewer re-runs every objective gate its shell can run. Reviewers run the plain commands, not
  `verify-slice.mjs`, which writes evidence. A gate the reviewer's shell can't run (§8) is reported as not run.

**What the checks can't catch.** The scripts check records, hashes, trees and transitions; they can't judge meaning.
Reviewers, and the owner at each boundary, are the only control for:
- a test that asserts the wrong thing, or one that can't fail (`expect(true).toBe(true)`), which no tool detects
  (adversarial-1 F10; B-161);
- scope that shrank in meaning: a reworded acceptance criterion, a simplified machine, a requirement closed on weaker
  evidence (B-107, B-133);
- design fidelity: whether screens match the written design (`qa:shots` never fails; B-185);
- browser behaviour from a sandboxed shell, where headless Chromium can't start (§8): no pass can be recorded there;
- evidence written by an agent with the code open, such as a forged record or a review the orchestrator wrote itself
  (adversarial-1 F2; B-103, B-109);
- tests that depend on the wall clock or time zone (B-173), and performance numbers taken under load (§8, B-137).

## 8. This machine

- The repo lives on the external Dev volume at `/Volumes/Dev/Projects/AquariumGo`. If `/Volumes/Dev` isn't
  mounted, stop and ask the owner; never recreate the project elsewhere.
- **A cloud session (claude.ai/code) is not this machine.** It runs in a container with its own clone; the rule
  above is for sessions on this machine. None of the `/Volumes/Dev` paths in this section exist there (no backup
  folder, no Playwright cache). The container is discarded when the session ends, so its work survives only if it is
  pushed under an owner ADR (ADR-0009: fast-forward pushes of `agent/s0-wip`, for that one session). It works on
  `agent/s0-wip`, so `check-state.mjs` warns that the branch isn't the integration branch; that warning is expected
  there. Whether headless Chromium starts in the container is checked with a real run, never assumed from the facts
  below.
- Node 22. Playwright's browsers are in `PLAYWRIGHT_BROWSERS_PATH=/Volumes/Dev/Caches/playwright`; if e2e says the
  executable is missing, run `npx playwright install chromium`.
- **Claude Code's sandboxed shell can't launch headless Chromium.** On 2026-10-05, `npm run e2e` failed at
  `browserType.launch` (180 s timeout) and a direct headless launch also hung, while typecheck, unit and build ran
  normally. The owner decided that browser work runs from the Claude desktop app, which has web testing capability
  (ADR-0004 decision 2). From a sandboxed session, e2e and browser QA can't pass; record them as not run, never as
  passed.
- Playwright reuses a server already listening on its port only when `E2E_REUSE=1` is set; otherwise a busy port
  fails loudly. Give each worktree its own `E2E_PORT`.
- The first e2e test after a cold Vite start can time out while Vite compiles (BACKLOG B-003: add a warm-up). Until
  then a cold-start timeout on the first test is recorded, classified as environment, and re-run once as its own run.
- `tests/e2e/perf.spec.ts` measures frame rates: run it only when no other suite or agent fleet is busy, and
  record the machine load next to its result.
- On 2026-10-05, with about 15 review agents running, `npm run build` took 9 minutes and `npm run typecheck` about
  4 minutes. Don't read performance into gate timings taken under load.
- `gh` lives in `/opt/homebrew/bin`, which isn't on the agent shell's PATH; agents don't use it for anything
  that writes.
- `scripts/_audit/` is excluded from Git (`.git/info/exclude`) and holds throwaway probes, including the pre-harness
  folders S01-S16, G1-G3, R01-R11 and P2/P5. They are not slice evidence.

## 9. Backlog

Out-of-scope improvements and defects that aren't fixed now go to `docs/agent/BACKLOG.md` with an id, source,
severity and the slice that should take them. They are never implemented opportunistically (master §19).

## 10. Protected files

`docs/agent/PROTECTED.json` holds the SHA-256 of every file matching its patterns: `AGENTS.md`, `CLAUDE.md`,
`README_FIRST.md`, the master, this file, `decisions/`, `prompts/`, `templates/`, `design/` and `scripts/agent/`.
`node scripts/agent/protect.mjs` (and `check-state.mjs`) fail when a recorded file changed or disappeared, and warn
about new files.

To change a protected file:
1. Write an ADR that says what changes and why. For the master, this file, `README_FIRST.md`, `AGENTS.md`,
   `CLAUDE.md`, the prompts and the owner-decision ADRs, the owner must approve it (recorded verbatim). For templates,
   design-registry bookkeeping and `scripts/agent/`, an independent reviewer must sign off on the diff.
2. Make the change, then run `node scripts/agent/protect.mjs --update --adr <that ADR>`. It records the new hashes
   and appends a ledger event.
3. Process changes take effect at the next slice boundary, never retroactively for the slice in progress.

Accepted ADRs are never edited; a later ADR supersedes them.

## 11. Determinism contract

"Deterministic" in the master and AGENTS.md means exactly this:

- **Reproducible.** The same `GameState` plus the same ordered calls (the `advanceWorld` slice sizes, the focused tank
  and `forceFull`, the points where sim debt is flushed, and the player's actions) produce an identical `stateHash`,
  in one process and locale. Tests pin the call sequence to check it.
- **Live play is not replayable.** Wall-clock tick slicing, which tank is focused (its LOD), autosave flushes and speed
  changes all change the call sequence, so two live sessions diverge. That is accepted; it is not a determinism bug.
  Known consequence: the focused tank changes how draws on the main stream interleave (2026-10-05 review; owner
  question in `HANDOFF.md`).
- **Step-size invariance.** One large chunk and many small steps agree within tolerances each subsystem states in its
  tests; exact equality across LOD tiers isn't promised. New systems state their tolerance (S3: automation).
- **Randomness.** Only `simRng(state)` / `ctx.rng`, or a subsystem's own persisted stream; inside a tank step use the
  step's `ctx.rng`, never a second `simRng(state)`. Never `Math.random`, `Date.now`, `performance.now`, `new Date`,
  `crypto` or locale-dependent formatting or sorting in `src/sim` or `src/data`. Accepted entropy: the new-game seed
  (`src/sim/newGame.ts`) and the id `repairState` gives a save that has none (`src/persistence/migrations.ts`).
- **RNG-stream changes.** A change that adds, removes or reorders draws on an existing stream (for example the new
  betta loci in S2) shifts every seeded test after it. Run the seeded suites before and after, record both, and never
  retune data or thresholds to absorb the shift without a reviewer's sign-off. New randomness prefers its own keyed or
  per-subsystem stream.
- **Automation (S3).** Every automated action is atomic per tick, idempotent across save and load (persisted
  last-run markers), settles the sim debt of every tank it moves animals between, and never creates money, animals,
  feed or supplies from nothing (master §9 S3).
