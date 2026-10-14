# Session handoff: all owner questions answered, chunk 4 next

For the agent that builds chunk 4 on Aquarium Go (Marshall, after the owner's `/compact`, or a new session). Written
2026-10-13 by Marshall, the session that asked groups B to E; it replaces Chase's handoff after group A. The repo is
the memory: `AGENTS.md`, `CLAUDE.md` and `PLAN.md` rule; this file is the order of work and the practical knowledge
that makes it go smoothly. Replace or delete it when it's used up.

## Where things stand

- `next` holds chunks 1 to 3, all tested, and every owner answer: groups A to E (ADR-0024 to ADR-0029, 2026-10-11 to
  2026-10-13). DESIGN-S3D is approved (ADR-0027, also in `INTAKE.md` §14). `docs/agent/OWNER_QUESTIONS.md` has
  nothing open. **0.5.1 is released** (`main` `78548a3`, on Pages and Render); the last full run, on `6594d21`, passed
  typecheck, unit (194 files, 2,227 tests), build and e2e (90 of 90). No code has changed since.
- Chunk 4 (Production lines) is next; chunk 5 (deep automation) follows it; chunk 6 (Social stub, hardening, the last
  0.5 release) after that. PLAN.md's briefs list what each chunk also picks up from groups C and E.
- Waiting on the owner: the export of the 45 approved 0.5 screens (E5, B-185).

## The order of work

1. **Check the drive and read.** `/Volumes/Dev` must exist (if not, stop and ask the owner to connect the X9). Read
   `AGENTS.md`, `CLAUDE.md`, `PLAN.md` (Next step, Status, How a chunk runs, chunk 4's brief), then only the design
   sections chunk 4 names: 0.5 spec §11 (data and simulation), DESIGN-S3D SPEC §8.6 and §8.6.1, and the ADRs its brief
   cites (ADR-0025; ADR-0026 decision 3; ADR-0029 decisions 2, 3, 4 and 9).
2. **Build chunk 4** following PLAN.md "How a chunk runs" exactly:
   - note the start commit; apply the chunk's BACKLOG rows (B-017, B-127, B-130, B-138, B-139, B-171, B-174, B-177,
     maybe B-195) and fix or defer each with a reason;
   - ask the owner once, batched, about player-visible text no design or ADR gives (the brief lists at least four:
     End line's confirmation, the missing-reference notice, the quarantine purchase's restart line, the This week
     tile's net line);
   - run the seeded tests before and after any sim change and explain every changed expectation (E3 and E4 change
     money and progression; never retune data to hide a shift);
   - the four checks pass on the final code; one fresh reviewer subagent reads the brief (verbatim from PLAN.md at the
     start commit) and `git diff <start>..HEAD`, not your summary; fix its blockers and re-run. **The reviewer runs on
     Opus 5.5 at max effort** (Agent tool `model: "opus"`, `effort: "max"`), never Fable (the owner, 2026-10-11);
   - update PLAN.md (the chunk's record, Status, Next step, Last full test run), REQUIREMENTS.json (GREEN, or
     DEFERRED/IN_PROGRESS with the reason), BACKLOG.md, ADRs; commit and push `next`;
   - tell the owner each command with its pass or fail line, what changed, and what to try (`npm run dev`, then
     http://127.0.0.1:5173/?dev=1).
3. **Between chunks** (the owner's routine): bring the docs up to date and prune them, push, then the owner types
   `/compact` (an agent can't) and you re-read the docs before the next chunk. Releases (`main`) only when the owner
   says so in the session, through PLAN.md "Releases".

**Asking the owner** (how groups A to E went): AskUserQuestion, at most 4 questions per round, recommended option
first and labelled "(Recommended)", each description giving the context needed to choose; open design screens on the
Mac with `open <png>` first; record the answers verbatim in an ADR (question as asked, option chosen with its
description, notes), then the index, PLAN.md, REQUIREMENTS.json and BACKLOG.md. Check new questions against earlier
answers before asking: B9 and C2 conflicted and needed a follow-up.

## How this repo is worked (learned in chunks 1 to 3 and the 0.5.1 release)

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
cd ~/LocalTest/AquariumGo && git fetch -q dev next && git checkout -q --detach <sha>   # npm ci if the dependencies changed
for c in typecheck test build e2e; do echo "=== npm run $c"; PLAYWRIGHT_BROWSERS_PATH=~/LocalTest/playwright npm run $c; echo "=== $c exit $?"; done > $S/checks.log 2>&1
```

Unit tests take about 40 s, e2e about 8 minutes (inside Claude Code's sandbox; it works, don't ask to leave it).
Every e2e run also builds the production site under `/aquarium-go/` for the `base-path` project (about 10 s more).

**Releasing.** The local `main` branch can lag `origin/main` (0.5.0 was pushed straight from `next`). Before merging:
`git fetch origin && git checkout main && git merge --ff-only origin/main`, then `git merge --no-ff next`. A version
bump changes `package.json` and the two root `version` fields in `package-lock.json` (no dependency change, so no
`npm ci`). Pages deploys from the push (about 1.5 minutes); check `…/version.json` on Pages and Render, and deploy
Render by hand only if it didn't update (the owner's memory note `render-manual-deploy` has the command).

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
