# Session handoff: chunk 7 done, chunk 8 (multiplayer stage 1) next

For the agent that builds chunk 8 (multiplayer stage 1, ADR-0038) on Aquarium Go, after the owner's `/compact` or in a
new session. Written 2026-10-15 by the session that built chunk 6, brought up to date on 2026-10-18 after 0.5.4 and
again after chunk 7. The repo is the memory: `AGENTS.md`, `CLAUDE.md` and `PLAN.md` rule; this file is the order of
work and the practical knowledge that makes it go smoothly. Replace or delete it when it's used up.

## Where things stand

- **0.5.4 is released** (2026-10-18: `main` = `63caa8e`, Pages and Render). **Chunk 7 (hardening for multiplayer) is
  done on `next`, not released** (PLAN.md, chunk 7): the live site ignores `?dev=1` (REL-019), counters never pass the
  buyer's ceiling and stop when bidding closes (REL-020), admission takings peak inside $0–40 (REL-021), a seeded loop
  hunt (REL-022), the water research gates in the rules (REL-023), and B-203's and B-204's items (REL-024). The owner's
  answers are ADR-0039 (both rounds). Releasing it as 0.5.5 waits for the owner's say.
- Left from chunk 6: the owner's play-through on a phone and a desktop, with a VoiceOver pass for ACC-005 (the one
  requirement still IN_PROGRESS, OWNER_QUESTIONS F1). Every other owner question is answered.
- **Chunk 8, multiplayer stage 1** for people the owner knows (ADR-0038, approved): a free Supabase project in a new
  Free organization apart from anonyform's, `@supabase/supabase-js` at an exact version, sign-up by invite code, no
  emails, one cloud-saved slot, the Social screens out of dev mode for signed-in players. H1 and H2 are answered
  (ADR-0039): the privacy note as quoted there, the 13-and-over checkbox, a US region. The Supabase CLI on the owner's
  Mac is signed in to the owner's whole account (anonyform's projects too): read only what you need, and ask before any
  change; creating the organization and the project is a remote change (ask in that session). NOTIFY-011 and PLAT-004
  (the native wrapper) stay deferred.

## The order of work

1. **Check the drive and read.** `/Volumes/Dev` must exist (if not, stop and ask the owner to connect the X9). Read
   `AGENTS.md`, `CLAUDE.md`, `PLAN.md` (Next step, Status, chunk 7's record, chunk 8's brief), ADR-0038 and ADR-0039.
2. **The owner's play-through and F1,** whenever the owner does it: record what the owner reports verbatim in an ADR and
   fix what it finds (each fix tested).
3. **Chunk 8:** write its brief in full in PLAN.md first (requirements REL-025 onwards; the Social stub kept for tests
   and dev mode; e2e against the stub, never the live project), then ask the owner for the go-ahead to create the
   Supabase organization and project (a remote change), install `@supabase/supabase-js` at an exact version (approved
   in ADR-0038; `core-dependencies`' list changes citing it), build, run the four checks twice, and one fresh reviewer
   (Opus 5.5 at max effort, never Fable). Copy players see that the designs and ADR-0039 don't cover (the save-conflict
   prompt, sign-up errors) goes to the owner before building.
4. **Releasing** (as 0.5.4 went): the four checks green, bump `version` and add the CHANGELOG entry, merge `next` into
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
