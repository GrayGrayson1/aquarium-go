# Session handoff: after chunk 3

For the next agent session (Chase, on the owner's AquariumGo CNVS canvas). Written 2026-10-11 by the session that
built chunks 2 and 3. The repo is the memory: `AGENTS.md`, `CLAUDE.md` and `PLAN.md` rule; this file is the order of
work and the practical knowledge that makes it go smoothly. Replace or delete it when it's used up.

## Where things stand

- `next` holds chunks 1 to 3, all tested: the last full run (`aeb7657`) passed typecheck, unit (194 files, 2,227
  tests), build and e2e (90 of 90). `main` and the live sites still run 0.5.0 (chunk 1). Nothing is uncommitted.
- Chunk 4 (Production lines) and chunk 5 (deep automation, DESIGN-S3D) wait on the owner's answers. Chunk 6 (Social
  stub, hardening, the release step) waits on one copy question.
- Every open owner question is in `docs/agent/OWNER_QUESTIONS.md` (groups A to E, about 45 questions, each with a
  recommended option and its source).

## The order of work

1. **Check the drive and read.** `/Volumes/Dev` must exist (if not, stop and ask the owner to connect the X9). Read
   `AGENTS.md`, `CLAUDE.md`, `PLAN.md` (Next step, Status, How a chunk runs, the chunk briefs) and
   `docs/agent/OWNER_QUESTIONS.md`.
2. **Ask the owner every question, first thing**, before building anything:
   - Use AskUserQuestion, at most 4 questions per round, in the file's order (A, B, C, D, E), with the recommended
     option first and labelled "(Recommended)". Tell the owner how many rounds there are and that they can stop after
     any group and finish later.
   - Before B1 open the production screens for the owner:
     `open docs/agent/design/DESIGN-S3D/screens/livestock-production-*.png` (Preview, on the Mac). Before each C
     question open its screens the same way (`alerts-*`, `build-facility-*`, `operations-*`, `market-supplies-*`,
     `home-*`) and point to the SPEC.md section.
   - For C8 show the full proposed strings (INTAKE.md §11 rows C-21, C-26, C-36, C-38, C-48, C-63 and
     design-intake-3's M2 and M6) in the question's description or a short message before it.
3. **Record the answers** after each group, verbatim (question as asked, option chosen, the owner's notes), in ADRs
   like ADR-0019 to ADR-0023:
   - ADR-0024 for groups A, B, D and E; ADR-0025 is the DESIGN-S3D approval (group C): it names the 0.5 items it
     replaces (C2) and is also written into `INTAKE.md` §14 "Owner decision".
   - Then: `decisions/INDEX.md`; mark the rows "Answered (ADR-00NN)" in `OWNER_QUESTIONS.md`; PLAN.md ("Product
     decisions in force", "Next step", the chunk briefs' "Before starting" lines); REQUIREMENTS.json notes (PROD-006,
     PROD-008, PROD-011, PROD-015, PROD-017, SOC-010, AUTO-016); BACKLOG.md rows (status **decided**, the ADR).
   - Commit ("Owner answers: …") and push `next`.
4. **If A1 is "release 0.5.1"**, do PLAN.md's release step before new work:
   - the four checks on `next`'s HEAD (below), all green;
   - `package.json` version 0.5.1 and a new top `CHANGELOG.md` entry `## 0.5.1 — <date>` in the existing style
     (`tests/sim/version.test.ts` checks they match), summarising chunks 2 and 3 for players; re-run the unit tests;
   - commit on `next`, push `next`, then `git checkout main && git merge --no-ff next` and push `main` (never force);
     that deploys GitHub Pages. Check the Render site, and deploy it by hand only if it didn't update (the owner's
     memory note `render-manual-deploy` has the command; the A1 answer is the go-ahead, say so before pushing `main`);
   - go back to `next` (`git checkout next`), and record the release in PLAN.md "Releases".
5. **Build the next chunk** that the answers unblock: chunk 4 if B1 is approved and B2 to B10 are answered; otherwise
   chunk 6 (needs D1, and A4 for its accessibility work). Chunk 5 only after C15 approves and chunk 4 is done. Follow
   PLAN.md "How a chunk runs" exactly:
   - note the start commit; read only the brief and the design sections it names; apply the chunk's BACKLOG errata and
     fix or defer its open rows;
   - ask the owner (batched, once) about player-visible text no design or ADR gives;
   - run the seeded tests before and after any sim change and explain every changed expectation (never retune data to
     hide a shift);
   - the four checks pass on the final code; one fresh reviewer subagent reads the brief (verbatim from PLAN.md at the
     start commit) and `git diff <start>..HEAD`, not your summary; fix its blockers and re-run;
   - update PLAN.md (the chunk's record, Status, Next step, Last full test run), REQUIREMENTS.json (GREEN, or
     DEFERRED/IN_PROGRESS with the reason), BACKLOG.md, ADRs; commit and push `next`;
   - tell the owner each command with its pass or fail line, what changed, and what to try (`npm run dev`, then
     http://127.0.0.1:5173/?dev=1).
6. **Between chunks** (the owner's routine): bring the docs up to date and prune them, push, then the owner types
   `/compact` (an agent can't) and you re-read the docs before the next chunk.

## How this repo is worked (learned in chunks 1 to 3)

**Edit in `/Volumes/Dev/Projects/AquariumGo`, test in `~/LocalTest/AquariumGo`.** The disk image is slow (typecheck
about 2 minutes there, 9 seconds on the internal disk; e2e times out there). The clone's remote `dev` is this repo.
To test uncommitted work, apply it as a patch on the same base commit (make the script in your scratchpad):

```zsh
cd /Volumes/Dev/Projects/AquariumGo && git add -N . && git diff HEAD --binary > $S/wip.patch
BASE=$(git rev-parse HEAD); cd ~/LocalTest/AquariumGo
git checkout -q -- . && git clean -fdq tests src docs public
git fetch -q dev next && git checkout -q --detach $BASE && git apply $S/wip.patch
```

The four checks on a commit (run it in the background with `run_in_background`, then wait; don't end a turn while it
or a reviewer runs):

```zsh
cd ~/LocalTest/AquariumGo && git fetch -q dev next && git checkout -q --detach <sha>   # npm ci if the lock changed
for c in typecheck test build e2e; do echo "=== npm run $c"; PLAYWRIGHT_BROWSERS_PATH=~/LocalTest/playwright npm run $c; echo "=== $c exit $?"; done > $S/checks.log 2>&1
```

Unit tests take about 40 s, e2e about 8 minutes (inside Claude Code's sandbox; it works, don't ask to leave it).
Every e2e run also builds the production site under `/aquarium-go/` for the `base-path` project (about 10 s more).

**Determinism.** In `src/sim` and `src/data` randomness comes only from `ctx.rng`, `simRng(state)`, a subsystem's own
stream or a keyed `mulberry32(hashString(key))`. Every new log event takes an id from the shared `idCounter`, and some
rolls are keyed on ids, so even a new event shifts later rolls: run the whole unit suite before and after, and say so.

**Tests that pass by day and fail by night.** Notification delivery reads the device clock (quiet hours 22:00–08:00).
A test that expects a notification turns quiet hours off (e2e: `aquarium-go.notify.v1` in an init script) or pins the
clock and `timezoneId`.

**Unit-test patterns.** Server-rendered tests (`renderToStaticMarkup`) read a zustand store's *initial* state: copy the
live state into `getInitialState()` first. Sim tests build worlds with `newGame`, `createTank`, `installEquipment`,
`createCreature`/`addCreature` and step with `advanceWorld` or `stepTank` (see `tests/sim/automation-*.test.ts`).

**e2e patterns.** Open the game with `?dev=1` (dev mode unlocks every destination, and counts the Genetics Lab as
researched). `aq(page, 'dev.setSpeed', 0)` pauses the clock (a restock mid-test changes shop counts). `__AQ.mutate` takes
a function, so call it inside `page.evaluate`. Playwright's `toBeEnabled` counts `aria-disabled` as disabled.
Notifications are recorded by stubbing `window.Notification` and `ServiceWorkerRegistration.prototype.showNotification`
(`tests/e2e/notifications.spec.ts`).

**Rules that bite.** No new dependencies without asking. Never weaken, skip or delete a test; a changed test is a
deliberate fix explained in the commit. Push `next` with `export PATH=/opt/homebrew/bin:$PATH` first (git's
credential helper is `gh`); never push `main` without the owner's go-ahead in your session; never force-push. Don't
change permission settings or hooks. Ask the owner once, batched, and never more than needed. Use plain literal paths
in commands (the owner dislikes approving command after command). Report a test that didn't run as not run.
