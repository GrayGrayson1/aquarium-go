# Session handoff: chunk 4 done, chunk 5 next

For the agent that builds chunk 5 (Deep automation, S3-D) on Aquarium Go, after the owner's `/compact` or in a new
session. Written 2026-10-14 by Marshall, the session that built chunk 4 (Production lines); it replaces the handoff
written after groups B to E. The repo is the memory: `AGENTS.md`, `CLAUDE.md` and `PLAN.md` rule; this file is the
order of work and the practical knowledge that makes it go smoothly. Replace or delete it when it's used up.

## Where things stand

- `next` holds chunks 1 to 4, all tested, and every owner answer (groups A to E, ADR-0024 to ADR-0029, and chunk 4's
  own copy, ADR-0030 and ADR-0031). DESIGN-S3D is approved (ADR-0027). `docs/agent/OWNER_QUESTIONS.md` has nothing open. The 45
  approved 0.5 screens are in `docs/agent/design/DESIGN-0.5/` (`SOURCE.md` says what each shows).
- **0.5.1 is the release on `main`** (`78548a3`, Pages and Render). Chunk 4 is on `next` only: releasing it is the
  owner's call (PLAN.md "Releases").
- Chunk 5 (deep automation) is next; chunk 6 (Social stub, hardening, the last 0.5 release) after it.

## The order of work

1. **Check the drive and read.** `/Volumes/Dev` must exist (if not, stop and ask the owner to connect the X9). Read
   `AGENTS.md`, `CLAUDE.md`, `PLAN.md` (Next step, Status, How a chunk runs, chunk 5's brief), then
   `docs/agent/design/DESIGN-S3D/SPEC.md` and `INTAKE.md` (its §11 resolutions, §12 proposals, §14 approval) and the
   ADRs the brief cites.
2. **Before building**, as the brief says: write design-intake-3's M3, M4, M5, R4 and R5 into the intake, and turn
   `INTAKE.md` §12's proposals into requirements in `REQUIREMENTS.json` (PROD-019 to PROD-021 are already in, GREEN).
3. **Build chunk 5** following PLAN.md "How a chunk runs": note the start commit; apply the chunk's BACKLOG rows; ask
   the owner once, batched, for any player-visible text no design or ADR gives; run the seeded tests before and after
   any sim change and explain every changed expectation; the four checks pass on the final code; one fresh reviewer
   on Opus 5.5 at max effort (Agent tool `model: "opus"`, `effort: "max"`; never Fable) reads the brief and
   `git diff <start>..HEAD`, not your summary; fix its blockers and re-run; update PLAN.md, REQUIREMENTS.json,
   BACKLOG.md and the ADRs; commit and push `next`; tell the owner each command with its pass or fail line, what
   changed, and what to try (`npm run dev`, then http://127.0.0.1:5173/?dev=1).
4. **Between chunks** (the owner's routine): bring the docs up to date and prune them, push, then the owner types
   `/compact` (an agent can't) and you re-read the docs. Releases (`main`) only when the owner says so in the session.

**What chunk 4 left for chunk 5.** Operations › Lines (`#/operations/lines`) shows the same lines:
`src/sim/production/view.ts` has the numbers (status, next clutch, growing out, quarantine, sales, this week), and the
Production tab's dot and its link row to Operations wait for it. AUTO-014, AUTO-016 to AUTO-018, AUTO-026 and AUTO-027
are IN_PROGRESS, met for lines; chunk 5's chains add their cases (`tests/sim/automation-invariants.test.ts` has a
production block to copy). B-167 (no compatibility decision in the sim) is worth deciding when an automation first
moves animals on its own.

**Asking the owner** (how groups A to E and chunk 4 went): AskUserQuestion, at most 4 questions per round, recommended
option first and labelled "(Recommended)", each description giving the context needed to choose; open design screens on
the Mac with `open <png>` first; record the answers verbatim in an ADR (question as asked, option chosen with its
description, notes), then the index, PLAN.md, REQUIREMENTS.json and BACKLOG.md. Check new questions against earlier
answers before asking.

## How this repo is worked (learned in chunks 1 to 4 and the 0.5.1 release)

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

Unit tests take about 45 s, e2e about 8 minutes (inside Claude Code's sandbox; it works, don't ask to leave it).
Every e2e run also builds the production site under `/aquarium-go/` for the `base-path` project (about 10 s more).
`npx vitest run --reporter=json --outputFile=<file>` gives a list of failures to compare before and after a sim change.

**Seeing a screen.** Start `npx vite --port 4455 --strictPort --host 127.0.0.1` in the test clone and drive it with a
small Playwright script (the clone's `node_modules/playwright`, `PLAYWRIGHT_BROWSERS_PATH=~/LocalTest/playwright`):
`__AQ.newGame`, `__AQ.dev.unlockAll`, `__AQ.act('buyTank', …)`, `__AQ.dev.spawnSpecies`, then set `location.hash`. The
production actions (`createLine`, `setLineRunning`, …) are in `__AQ.act` too. Stop the server when done.

**Releasing.** The local `main` branch can lag `origin/main` (0.5.0 was pushed straight from `next`). Before merging:
`git fetch origin && git checkout main && git merge --ff-only origin/main`, then `git merge --no-ff next`. A version
bump changes `package.json` and the two root `version` fields in `package-lock.json` (no dependency change, so no
`npm ci`). Pages deploys from the push (about 1.5 minutes); check `…/version.json` on Pages and Render, and deploy
Render by hand only if it didn't update (the owner's memory note `render-manual-deploy` has the command).

**Determinism.** In `src/sim` and `src/data` randomness comes only from `ctx.rng`, `simRng(state)`, a subsystem's own
stream or a keyed `mulberry32(hashString(key))`. Since chunk 4 every `simRng` draw re-reads `state.rngState`, so
generators can't fork the stream (`core-rng-one-stream`). Every new log event takes an id from the shared `idCounter`, and some
rolls are keyed on ids, so even a new event shifts later rolls: run the whole unit suite before and after, and say so.
A test that compares two runs can see ids shift when its own harness logs differently (production-line's step-size
case compares hours and counts for that reason).

**Moves settle tanks (B-127).** Code that moves an animal or a brood between tanks goes through `moveCreature` /
`moveClutch` (or calls `settleTanks` from `src/sim/settle.ts`): both tanks catch up first, anchored at the step's end
inside a world step, and the move is checked after that (the animal may have died, the brood been raised). Production
lines and a sold tank's relocations already do.

**Reviews take time.** Chunk 4's reviewer on Opus 5.5 at max effort ran about three hours (much of it one silent
stretch of thinking before its report); wait for it with a background until-loop rather than assuming it hung. A
follow-up through SendMessage (same agent, context kept) confirmed the fixes in about seven minutes.

**Tests that pass by day and fail by night.** Notification delivery reads the device clock (quiet hours 22:00–08:00).
A test that expects a notification turns quiet hours off (e2e: `aquarium-go.notify.v1` in an init script) or pins the
clock and `timezoneId`.

**Unit-test patterns.** Server-rendered tests (`renderToStaticMarkup`) read a zustand store's *initial* state: copy the
live state into `getInitialState()` first. Sim tests build worlds with `newGame`, `createTank`, `installEquipment`,
`createCreature`/`addCreature` and step with `advanceWorld` or `stepTank` (see `tests/sim/automation-*.test.ts`). Tank
tiers and decor start locked: unlock with `UNLOCK_KEYS` and `unlock(g, k, { silent: true })`. Breeding needs real
cover: the `@/sim/aquascape` mock doesn't reach the breeding module, so put planted decor in the tank
(`tests/sim/support/production.ts` builds a working farm and line).

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
