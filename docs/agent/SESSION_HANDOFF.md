# Session handoff: after chunk 10 (shared shops, the test)

For the next agent on Aquarium Go. Chunk 8 was built by Marshall on 2026-10-19; chunk 9 by Chase the same day, at the
owner's request ("Yes, start", ADR-0043 decision 8). The repo is the memory: `AGENTS.md`, `CLAUDE.md` and `PLAN.md`
rule; this file is the order of work and the practical knowledge that makes it go smoothly. Replace or delete it when
it's used up.

## Where things stand

- **0.5.5 is released** (2026-10-19: `main` = `9ae98b3`, Pages and Render): chunks 7 and 8 (PLAN.md; ADR-0039 to
  ADR-0042). Aquarium Go online is live for people with an invite.
- **0.5.6 is released** (2026-10-20: `main` = `3a0e8ce`, Pages and Render): chunk 9, the audit of `c7c0d34`'s five high
  findings, A1, B1, B2, D1 and E1 (with G1, B7 and C7), and the fresh review's blockers and its confirmations' (PLAN.md
  chunk 9; ADR-0044). The audit's report is private (an artifact for the owner); BACKLOG B-207 and B-208 say what's
  left.
- **The Supabase project is live**: the Free organization "Aquarium Go" (`kvqnsqbjufmnkpsrcjbj`), project
  `aquarium-go`, **ref `zkavcxrsxdgdlstravpj`**, us-east-1. Five migrations applied (`supabase/migrations`; the fifth,
  chunk 9's, on 2026-10-19 with the owner's yes), the advisors report no database issues (one Auth warning:
  leaked-password protection, off), the live smoke test passed 90 of 90. Three clubs, all the owner's ("Aquarium Go
  Friends", "CalliClub", "TheSushiBladesToTheMax"); the clubs keep their codes (ADR-0044 decision 3). Never write a
  code or a player's email in the repo, which is public (`select name, invite_code from public.clubs` reads codes).
- **Next: shared shops** (ADR-0043, ADR-0045): a whole shop a club plays together on a small server on Render. The
  design is `docs/agent/design/SHARED-SHOPS.md` (2026-10-20): every browser runs the same steps, the server's copy
  counts, fingerprints catch drift. Render's free plan includes only 5 GB of outbound data a month for the whole
  workspace (with DAS-Games' `dascade`, a free web service, and the static site), so the server never streams the
  shop; Render's 750 free instance hours are shared with `dascade` too. Node, Chromium and WebKit round `Math.exp`,
  `pow` and the other transcendental functions differently (measured 2026-10-20), so every copy must use the same
  arithmetic (`src/sim/dmath.ts`, switched on in chunk 10); the review's probes are in the internal-disk clone's
  `scripts/_audit/review-shared/`. Every design question is answered (ADR-0045, words included).
- **Chunk 10** (2026-10-20, PLAN.md): dmath switched on for the whole simulation, the step block, a prototype server
  (`server/`, `ws`) and replica, the lockstep tests (in one process, and the cross-engine replay in Chromium and
  WebKit), and the measurements on Render (SHARED-SHOPS.md §11). The free web service **`aquarium-go-shops`**
  (`srv-dbbt6gbncjis73c23br0`, created with the owner's yes, ADR-0046) builds from `next` and is deployed by hand
  (`render deploys create srv-dbbt6gbncjis73c23br0 --commit <full sha> --confirm --wait -o text`); after the
  measurements the prototype there is closed (no connections or replays unless `SHOPS_OPEN=1`, which the CLI can't set:
  the dashboard can). The Render CLI can create and deploy services but can't change their environment variables.
- **Open owner questions:** F1 (the owner's VoiceOver pass); the audit's decisions A4 (the shared Pages origin, B-191),
  F5, F3, G2, A6 and new wording (B-207).
- **The Supabase CLI** (`/Users/brianbean/.local/bin/supabase`) is signed in to the owner's whole account, anonyform's
  Pro organization included. Scope every remote command to the project: `--linked --project-ref zkavcxrsxdgdlstravpj`
  (`db query` takes `--project-ref` only with `--linked`). Never print or save the secret key; never read the CLI's
  stored sign-in; stop and ask if anything would cost money (the owner: "lets make everything free if we can"). A
  query that would print another player's email is refused by Claude Code's auto mode (PII): count, or match the
  owner's own email, instead.

## The order of work

1. **Released** (0.5.5, 2026-10-19; PLAN.md "Releases").
2. **The owner's account: done** (2026-10-19, by Chase with the owner's yes). The owner signed up with the first
   club's link; ARCHITECTURE.md's runbook set `is_owner = true` (the only owner) and the first club's `created_by`.
   Sign-up sends no email (confirmations are off), so a player won't get one. Never write the owner's email in the
   repo.
3. **A database change** goes in a new file under `supabase/migrations` (never edit an applied one): check it with
   `scripts/online-db-local/run.sh` (a throwaway local Postgres, Homebrew's postgresql@16), apply it with `supabase db
   query --linked --project-ref <ref> -f <file>`, run `supabase db advisors --linked --project-ref <ref> --type security
   --level warn` (no database issues; Auth's leaked-password warning is known), then `node scripts/online-smoke.mjs`
   from the internal-disk clone (it has supabase-js; the Dev repo's `node_modules` is an old copy without it; for the
   few seconds it runs, its 100 wrong guesses brake real invite screens).
4. **Released 0.5.6** (2026-10-20; PLAN.md "Releases"). The next release goes as 0.5.4 to 0.5.6 went: the four checks green on the final code, bump
   `version` and add the CHANGELOG entry, merge `next` into
   `main` with the owner's go-ahead in the session (`git merge-tree --write-tree`, `commit-tree`, `update-ref`: no
   checkout), push from the internal-disk clone, watch the Pages run, deploy Render by hand, check both
   `version.json` files.
5. **Shared shops** (the owner chose them, 2026-10-20): chunk 10 is done (PLAN.md: the review's two blockers fixed, the
   final pass 319 of 319). Next chunk 11 (commands, §4; PLAN.md's "For chunk 11"), then chunk 12 (the server, the
   database; the owner pastes the server's Supabase key into Render, and the build command must remove it from the
   build, §5.8; PLAN.md's "For chunk 12"). OWNER_QUESTIONS K1 (big shops on the free server) waits for chunk 12's
   numbers. The audit's remaining findings (B-207, B-208) wait for the owner.

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

**Learned in chunk 8.**
- *Supabase's advisors* warn about every SECURITY DEFINER function the API exposes (lints 0028, 0029): the functions
  the game calls live in the schema `private`, behind SECURITY INVOKER wrappers in `public` with the same names.
- *`config push`* pushes every declared section: match `config.toml`'s non-auth settings to the project's first
  (`supabase config diff --project-ref <ref>`), so only what you mean changes.
- *A forwarded address* (`x-forwarded-for`) is the caller's to choose, and keeping addresses is data the privacy note
  doesn't cover: the brake on wrong invite codes is one for everyone, with only times kept.
- *In a JavaScript `replace` string, `$$` becomes `$`*: a test mutation of SQL with `$$` needs a replacer function.
- *The online save's e2e* turns autosave off in its setup, so only the test's own saves count as this device's play;
  `__AQ.social.cloudSyncNow()` waits for the check and send under way.
- *Another project's e2e* (another Claude session's) may run on the same Mac at the same time: a wall-clock test (perf)
  that misses once may be that; look at `pgrep -fl playwright` before calling it a regression.

**Rules that bite.** No new dependencies without asking. Never weaken, skip or delete a test; a changed test is a
deliberate fix explained in the commit. Push `next` with `export PATH=/opt/homebrew/bin:$PATH` first (git's
credential helper is `gh`); never push `main` without the owner's go-ahead in your session; never force-push. Don't
change permission settings or hooks. Ask the owner once, batched, and never more than needed. Use plain literal paths
in commands (the owner dislikes approving command after command). Report a test that didn't run as not run.

**Learned in chunk 10.**
- *Measuring the server:* `scripts/shared-session.ts` (members in Node; Node's WebSocket sends no Origin, so the script
  presents the dev page's) and `scripts/shared-session-browsers.mjs` (Chromium and WebKit through the test page,
  `tests/e2e/shared/page.html`, which needs `npx vite --port 4455`). Room stats on `/stats` add up over a room's life:
  take the difference before and after a run. A free instance sleeps after 15 minutes without requests; the next one
  waits about 20 seconds.
- *Java's StrictMath is fdlibm:* the JDK's `lib/src.zip` holds `java/lang/FdLibm.java`, and `javac`/`java` from
  Homebrew's openjdk@21 compute reference results bit for bit (`scripts/_audit/chunk10/Ref.java` in the internal-disk
  clone).
- *zsh doesn't split words:* `for c in "big_facility 1"; do cmd $c; done` passes one argument; use `${=c}`.
- *A test's own browser contexts:* close them in an `afterEach`; left open in WebKit they slowed the specs after them
  until those timed out, which looked like a flake in someone else's spec.
