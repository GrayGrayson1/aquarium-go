# Session handoff: chunk 8 (multiplayer stage 1), handed to Marshall

For the agent that builds chunk 8 on Aquarium Go: Marshall, on the owner's CNVS canvas, handed the chunk by Chase on
2026-10-19 at the owner's request ("give marshall in cnvs all it needs to be successful in building out 8"). Written
2026-10-15 after chunk 6 and kept current since. The repo is the memory: `AGENTS.md`, `CLAUDE.md` and `PLAN.md` rule;
this file is the order of work and the practical knowledge that makes it go smoothly. Replace or delete it when it's
used up.

## Where things stand

- **0.5.4 is released** (2026-10-18: `main` = `63caa8e`, Pages and Render). **Chunk 7 (hardening for multiplayer) is
  done on `next`, not released** (PLAN.md, chunk 7; ADR-0039). Releasing waits for the owner's say.
- **Chunk 8 starts from `next`.** Its brief is in PLAN.md (chunk 8), its build plan is
  `docs/agent/design/ONLINE-STAGE1.md` (read it whole: layout, setup, database, client, online save, words, tests,
  pitfalls), its requirements are REL-025 to REL-033, and the owner's answers are ADR-0038, ADR-0039 and **ADR-0040**
  (2026-10-19): the agent sets up the Supabase project itself (a Free organization "Aquarium Go", the project
  `aquarium-go` in `us-east-1`); only the owner creates clubs, and a club's invite code is the sign-up code (the first
  club "Aquarium Go Friends"); the sign-up, account and online-save wording approved.
- **Open owner questions:** group I was asked and approved (ADR-0041, 2026-10-19); open: F1 (the
  owner's VoiceOver pass during a play-through, whenever the owner does it).
- **The Supabase CLI** (`/Users/brianbean/.local/bin/supabase`, v2.119.0) is signed in to the owner's whole account,
  anonyform's Pro organization included. ONLINE-STAGE1.md §3 has the rules: scope every remote command to the Aquarium
  Go project, never print or save its secret key, never read the CLI's stored sign-in (refused once as credential
  exploration; don't work around it), and stop and ask if anything would cost money or touch another project.

## The order of work

1. **Check the drive and read.** `/Volumes/Dev` must exist (if not, stop and ask the owner to connect the X9). Read
   `AGENTS.md`, `CLAUDE.md`, PLAN.md (Next step, Status, chunk 8's brief), ADR-0038 to ADR-0040 and ONLINE-STAGE1.md.
   Chunk 8 starts at `fd0e0fd` (chunk 7's end); its brief's commit follows it, so the review reads `fd0e0fd..HEAD`.
2. **Ask group I** (one AskUserQuestion round, the exact strings in the previews; if the owner declines the tool, ask
   the same as plain text, as ADR-0040 did). Record the answers verbatim in ADR-0041, then the index, PLAN.md,
   REQUIREMENTS.json and OWNER_QUESTIONS.
3. **Build** in sensible commits (ONLINE-STAGE1.md §2 to §7): install `@supabase/supabase-js@2.117.2` exactly
   (`npm install --save-exact --package-lock-only @supabase/supabase-js@2.117.2` in the Dev repo, which writes only
   `package.json` and the lockfile; then `npm ci` in the test clone), the interface and the stub, the
   Supabase service, the migration and its static test, the mode switch and the gates, the online save, the screens,
   the tests (§8). Run the unit tests as you go.
4. **Set up the project** (§3) once the migration and `scripts/online-smoke.mjs` exist: the owner's yes is ADR-0040
   decision 1; still stop if the organization isn't Free. Record the ref and the smoke result in PLAN.md (the first
   club's code goes to the owner in the session, never in the repo: it is public, ADR-0042), and commit
   `src/social/project.ts`.
5. **Finish:** the four checks twice in a row on the final code, then one fresh reviewer (Opus 5.5 at max effort:
   the Agent tool with `model: "opus"`, `effort: "max"`; never Fable) given the brief, ONLINE-STAGE1.md and
   `git diff <start>..HEAD`, not your summary. Fix its blockers, re-run the checks, update PLAN.md, the requirements
   and the docs REL-033 lists, commit, push `next`, and tell the owner what to try. Don't release: the owner decides.
6. **After a release** (the owner's call): the owner signs up with the first club's link; with the owner's yes and
   that email, set the owner flag (§3 step 10).
7. **Releasing** (as 0.5.4 went): the four checks green, bump `version` and add the CHANGELOG entry, merge `next` into
   `main` with the owner's go-ahead (`git merge-tree --write-tree`, `commit-tree`, `update-ref`: no checkout), push
   from the internal-disk clone, watch the Pages run, deploy Render by hand, check both `version.json` files.

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

Unit tests take about 45 s, e2e about 32 to 35 minutes in Chromium and WebKit (inside Claude Code's sandbox; it works,
don't ask to leave it). **Hold sleep off for a long run:** wrap the checks in `caffeinate -i -s bash -c "…"`. On battery
and idle, the Mac sleeps mid-run (chunk 7: six e2e failures in two passes, every one inside a `pmset -g log` sleep
window); the tests stall, and on wake Vite's client loses its server connection and reloads the page. Every e2e run also builds the production site twice under `/aquarium-go/`: `.e2e-dist` with
`VITE_E2E_DEV_URL=1` for `base-path.spec`, and `.e2e-dist-prod` without it (the players' build) for `prod-mode.spec`.
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

**Learned in chunk 7.**
- *Show the owner numbers before a balance change:* a throwaway probe under the git-excluded `scripts/_audit/` run with
  `npx vite-node` in the internal-disk clone (today's code, then the fix applied to the clone's working copy and
  reverted) gave before-and-after tables the owner could choose from (ADR-0039).
- *A loop hunt needs a fair yardstick:* "worth" counted by the game's own instant sales flagged a frag cut from an
  already-grown coral as a gain until the measure cut a frag from every ready piece too, and frag prices fall a little
  with each sale, so the measure sells everything in one batch per kind. Prove such a test fails with a planted loop.
- *An e2e test that walks the guide* should read the guide's current step and act on it: the betta guide starts on
  "meet", and a fixed script that assumed "camera" failed in both browsers.

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
researched). Since chunk 7 a production build honours it only when built with `VITE_E2E_DEV_URL=1`; the live site
never does, so anything that scripts a production preview builds it with the flag (README). `aq(page, 'dev.setSpeed', 0)` pauses the clock (a restock mid-test changes shop counts). `__AQ.mutate` takes
a function, so call it inside `page.evaluate`. Playwright's `toBeEnabled` counts `aria-disabled` as disabled.
Notifications are recorded by stubbing `window.Notification` and `ServiceWorkerRegistration.prototype.showNotification`
(`tests/e2e/notifications.spec.ts`).

**Rules that bite.** No new dependencies without asking. Never weaken, skip or delete a test; a changed test is a
deliberate fix explained in the commit. Push `next` with `export PATH=/opt/homebrew/bin:$PATH` first (git's
credential helper is `gh`); never push `main` without the owner's go-ahead in your session; never force-push. Don't
change permission settings or hooks. Ask the owner once, batched, and never more than needed. Use plain literal paths
in commands (the owner dislikes approving command after command). Report a test that didn't run as not run.
