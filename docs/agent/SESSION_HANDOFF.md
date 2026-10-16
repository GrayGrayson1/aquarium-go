# Session handoff: chunk 6 built, its review and the last 0.5 release next

For the agent that finishes chunk 6 (Social stub, hardening and the last 0.5 release) on Aquarium Go, after the
owner's `/compact` or in a new session. Written 2026-10-15 by the session that built chunk 6; it replaces the handoff
written after chunk 5. The repo is the memory: `AGENTS.md`, `CLAUDE.md` and `PLAN.md` rule; this file is the order of
work and the practical knowledge that makes it go smoothly. Replace or delete it when it's used up.

## Where things stand

- **0.5 is complete and released.** 0.5.3 is on `main` (`382a637`, 2026-10-15): chunk 6's end, after a fresh code
  review (5 blockers fixed, REL-017 GREEN on confirmation) and a browser/QA review (RED → GREEN), with two full
  passes in a row on `9bff79e` (PLAN.md, chunk 6). `next` = `main`'s content (`31f8b7b` plus the post-release notes).
- Left from chunk 6: the owner's play-through on a phone and a desktop, with a VoiceOver pass for ACC-005 (the one
  requirement still IN_PROGRESS), and the owner's answers to group F in `docs/agent/OWNER_QUESTIONS.md` (F1
  VoiceOver, F2 a quest's wording, F3 pinning tables to SCHEMA_VERSION, F4 Settings' "Save now" footer).
- What comes after 0.5 is the owner's call: NOTIFY-011 and PLAT-004 (the native wrapper) are deferred, REL-002
  (multiplayer) is for later, and `docs/agent/DEBT_INVENTORY.md` lists what multiplayer would magnify.

## The order of work

1. **Check the drive and read.** `/Volumes/Dev` must exist (if not, stop and ask the owner to connect the X9). Read
   `AGENTS.md`, `CLAUDE.md`, `PLAN.md` (Next step, Status, chunk 6's record).
2. **The owner's play-through and group F:** record what the owner reports (ACC-005's VoiceOver pass, F1) and their
   answers to F2–F4 verbatim in an ADR, then make the changes they choose (each one tested, a fresh reviewer for
   anything beyond copy) and release them as 0.5.4 only with the owner's go-ahead.
3. **After 0.5:** ask the owner what's next; a new chunk gets a brief in PLAN.md, its own fresh reviewer (Opus 5.5 at
   max effort, never Fable) and two full passes before a release.
4. **Releasing** (as 0.5.3 went): the four checks green, bump `version` and add the CHANGELOG entry, merge `next` into
   `main` with the owner's go-ahead (`git merge-tree --write-tree`, `commit-tree`, `update-ref`: no checkout), push
   from the internal-disk clone, watch the Pages run, deploy Render by hand, check both `version.json` files.
5. **Between chunks** (the owner's routine): bring the docs up to date and prune them, push, then the owner types
   `/compact` (an agent can't) and you re-read the docs. Releases (`main`) only when the owner says so in the session.

**Asking the owner** (how groups A to E and chunks 4 and 5 went): AskUserQuestion, at most 4 questions per round,
recommended option first and labelled "(Recommended)", each description giving the context needed to choose; put the
exact strings in the option's preview; open design screens on the Mac with `open <png>` first; record the answers
verbatim in an ADR (question as asked, option chosen with its description, notes), then the index, PLAN.md,
REQUIREMENTS.json and BACKLOG.md. Check new questions against earlier answers before asking.

## How this repo is worked (learned in chunks 1 to 5 and the 0.5.1 release)

**Edit in `/Volumes/Dev/Projects/AquariumGo`, test in `~/LocalTest/AquariumGo`.** The disk image is slow, at times very
slow (a `git add -A` and commit there took several minutes in chunk 5: run them with `run_in_background`; search the
test clone instead of the image when grep hangs). Typecheck takes about 2 minutes there, 9 seconds on the internal
disk; e2e times out there. The clone's remote `dev` is this repo.
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

**Learned in chunk 6.**
- *Push from the internal-disk clone* (`~/LocalTest/AquariumGo`, remote `origin` is GitHub): a push from the disk
  image hung for 13 minutes. Fetch `dev` there, then `git push origin "${SHA}:refs/heads/main"` (braces: zsh reads
  `$M:r` as a modifier). A change under `.github/workflows/` needs gh's `workflow` scope (the owner added it in his own
  Terminal; the device flow times out when run with `!`).
- *Publishing runs the unit tests* (B-193): GitHub's runner and Render's build are about 2× slower and Render's has few
  CPUs. Wall-clock limits in tests/sim go through `tests/sim/support/timeBudget.ts` (×4 on CI and RENDER) and Vitest
  uses two workers when RENDER is set. Watch the Pages run (`gh run watch`) before deploying Render.
- *WebKit*: Tab skips buttons unless Safari's setting is on (press Option+Tab in WebKit); it grants no clipboard
  permissions; it doesn't focus a button on click; it drops a page's hash changes after about 200 in quick
  succession (split long route walks across pages); a transient element can come and go before a poll sees it
  (record it with a MutationObserver from the page's first moment).
- *Silent e2e*: the audio engine treats an automated browser (`navigator.webdriver`) as muted; Chromium was muted by
  Playwright already, WebKit played the game aloud.
- *Fixed-position sheets*: `offsetParent` is always null; measure their box and computed style.

**Determinism.** In `src/sim` and `src/data` randomness comes only from `ctx.rng`, `simRng(state)`, a subsystem's own
stream or a keyed `mulberry32(hashString(key))`. Since chunk 4 every `simRng` draw re-reads `state.rngState`, so
generators can't fork the stream (`core-rng-one-stream`). Every new log event takes an id from the shared `idCounter`, and some
rolls are keyed on ids, so even a new event shifts later rolls: run the whole unit suite before and after, and say so.
A test that compares two runs can see ids shift when its own harness logs differently (production-line's step-size
case compares hours and counts for that reason).

**Moves settle tanks (B-127).** Code that moves an animal or a brood between tanks goes through `moveCreature` /
`moveClutch` (or calls `settleTanks` from `src/sim/settle.ts`): both tanks catch up first, anchored at the step's end
inside a world step, and the move is checked after that (the animal may have died, the brood been raised). Production
lines and a sold tank's relocations already do. Since chunk 5 (ADR-0026 decision 5) so do a shop purchase into a tank,
a water conversion, a substrate change, the Water room's jobs and every manual-mode change: a player action that
changes a background tank settles that tank first (`settleTanks` on its id costs a few ms; settling all 40 tanks
inside an Immer action costs about 85 ms, so a whole-facility settle goes through `flushBackgroundTanks`, mutateFast).

**Reviews take time.** Chunk 4's reviewer on Opus 5.5 at max effort ran about three hours, chunk 5's about 40
minutes; its completion arrives as a notification, so keep working (docs, tests) meanwhile. Follow-ups through
SendMessage (same agent, context kept) confirm fixes in 10 to 15 minutes, and do find new problems in the fixes:
chunk 5's first confirmation pass caught a regression the fix had introduced.

**Tests that pass by day and fail by night.** Notification delivery reads the device clock (quiet hours 22:00–08:00).
A test that expects a notification turns quiet hours off (e2e: `aquarium-go.notify.v1` in an init script) or pins the
clock and `timezoneId`.

**Unit-test patterns.** Server-rendered tests (`renderToStaticMarkup`) read a zustand store's *initial* state: copy the
live state into `getInitialState()` first. Sim tests build worlds with `newGame`, `createTank`, `installEquipment`,
`createCreature`/`addCreature` and step with `advanceWorld` or `stepTank` (see `tests/sim/automation-*.test.ts`). Tank
tiers and decor start locked: unlock with `UNLOCK_KEYS` and `unlock(g, k, { silent: true })`. Breeding needs real
cover: the `@/sim/aquascape` mock doesn't reach the breeding module, so put planted decor in the tank
(`tests/sim/support/production.ts` builds a working farm and line; `tests/sim/support/automation.ts` a facility with
the Water room, the Live food room and a stock manager). To make a sim function fail in a test, `vi.mock` the file that
defines it (`@/sim/economy/purchases`), not an index: the economy index's imports reach the staff code while the mock
is being made, and that code then keeps the original. Operations' caches key on the game hour and on
`useGame.getState().actions` (player actions); a test that renders twice in one hour and expects a recompute must
change one of those.

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
