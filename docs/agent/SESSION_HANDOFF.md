# Session handoff: after 0.7.0; chunk 15 (the scenario lab) built

For the next agent on Aquarium Go. Chunk 8 was built by Marshall on 2026-10-19; chunk 9 by Chase the same day, at the
owner's request ("Yes, start", ADR-0043 decision 8). The repo is the memory: `AGENTS.md`, `CLAUDE.md` and `PLAN.md`
rule; this file is the order of work and the practical knowledge that makes it go smoothly. Replace or delete it when
it's used up.

## Chunk 15, the scenario lab: built (Chase, 2026-10-23)

- **Done** (PLAN.md chunk 15; ADR-0051 has the owner's answers, verbatim). The owner asked for dev tools to build any
  aquarium or setup and play it without playing up to it; they chose: on this Mac, solo; all four areas plus
  "basically what the game has to offer but it's an unlocked dev version sandbox"; presets, files and links; opens
  paused; every preset group. Their question "what else can we have here that would be useful?" is answered in
  ADR-0051 decision 5 (Start again, Capture, fixtures as bases, checks, a warm-up, the game's own verdicts while
  editing), all built.
- **For the owner to try:** `cd ~/LocalTest/AquariumGo && npm run lab` (the clone is left at `next`), or ask an agent
  in CNVS to run it. docs/SCENARIOS.md is the guide and the recipe reference (hand it to any agent: "make me a
  scenario with …"). `npm run scenario -- ammonia-crisis` runs one without a browser.
- **State of things:** `next` = chunk 15's last commit (pushed); `main` = `a704e63` (0.7.0), unchanged: a dev-only tool needs no
  release, and nothing was deployed. The internal clone is at `next`'s head with no patch applied.
- **Tested:** the four checks on the final code `aae0922` (unit 3,363, e2e 335 of 335, 39.9 min) and on `f9c62ab`
  (the same); before it `0bdc84c` green
  too (unit 3,341, e2e 335 of 335). The fresh review (Opus 5.5, max effort) found four blockers, the worst that "Save now" and
  "Save and return to title" wrote a scenario over the player's autosave; all fixed in `765b6b6` with its notes;
  its first confirmation found two more (the lab's checking stepped a world, which changed the game on screen; the
  patch play-test stepped no tank), fixed in `f9c62ab`; the second was clean.
- **Still open after it:** F1 (the owner's VoiceOver pass), the audit's other findings (B-207, B-208), B-210 (two crafted
  save shapes that crash a step; before stage 2), online stage 2 (before strangers join). The owner hasn't played 0.6.0
  or 0.7.0 yet: a problem they report comes first.

**Learned in chunk 15.**
- *Building a world by hand:* set the clock before making anything (moving it forward never trips `repairState`; a
  future-dated `*Hour` does). A blank shop is `newGame` with its starter tank, animal, log and discoveries removed, then
  `initMarket` again once the facility and unlocks are set (`seenUnlocks = -1` restocks silently).
  `settleStartingProgress` last, so unlock rules and achievements don't toast on the first step.
- *Module-level dev state leaks into builds:* `forcePrismatic` counters are consumed by the base's own market roll;
  the builder sets them aside and puts them back. A test of that needs a recipe with no Prismatic of its own (the
  first version of the test couldn't fail: a mutant survived).
- *Keeping dev code out of the players' build:* a lazy chunk is still emitted unless the `import()` sits behind a
  build-time constant (`import.meta.env.DEV || import.meta.env.VITE_E2E_DEV_URL === '1'`, inlined in each file);
  Rollup then drops it. The dev panel, the fixtures and the sandboxes still ship as unfetched chunks (as before).
- *A dev world must not reach the player's autosave through any door:* the timed autosave is one; "Save now", "Save and
  return to title", the error screens, the page-close save and the online save are the others. The refusal lives in
  `saveCurrentGame`/`saveCurrentGameSync` (`autosaveRefused`), so every door checks it. URL `?fixture=` boots still use
  the older `fixtureSaveId` rule (only the timed autosave), unchanged.
- *Clipboard and other browser APIs go through `src/platform`* (`tests/sim/platform-web.test.ts` and
  `core-mutation-boundary` scan for direct `navigator.clipboard`); the platform has no clipboard read.
- *`Toasts.tsx` dismissed UI toasts inside a state updater* (a store write mid-render; a dev-only React warning that
  frequent world switches brought out in WebKit). Fixed in this chunk.

## Handoff to Chase: chunk 15, the scenario lab (Marshall, 2026-10-23)

*Used up: chunk 15 is built (above). Kept for the owner's words and the gate.*

**The owner's words, verbatim (2026-10-23):** "What would it take to have Chase in CNVS Canvas, the app that we're
currently working on, Build some dev tools in order to make what I want. If I want to make a specific kind of aquarium
or setup, I would be able to just do that without having to play through the game, just to test certain scenarios. If
that's something that we can one-shot, go ahead and do the required research. It needs to be successful and then give
Chase in CNVS the prompt to build it all out and all the information that possibly needs to be successful."

**The goal.** The owner describes a setup (a tank, its water, its animals, the shop around it) and is playing it in
seconds, without playing up to it; they can keep it, load it again, and hand it to an agent or a test. A developer
tool: never in the players' build (ADR-0037 decision 3, below).

**What exists already (read these; build on them, don't rebuild them).**
- `src/dev/commands.ts` (`dev`, 423 lines): addMoney, unlockAll, spawnSpecies (species, tank, sex, count, age; makes a
  suitable tank if none), ageCreature, forceBreeding, setWater, advanceTime (≤6 h steps, then `flushSimDebt`),
  hireStaff, setSpeed, fillTestFacility, newGame (skips onboarding), playthrough (the balance bot, N days), loadFixture,
  focusTank, addShopOffer (incl. Prismatic and pinned alleles), makePrismatic, forcePrismatic, killCreature,
  setAllStats. Writes go through `mutateGame`/`mutateFast`; every call no-ops with no game.
- `src/dev/fixtures/core-helpers.ts`: the scene-building kit: `ensureFacility(state, level)`, `unlockEverything`,
  `addPlacedTank(state, tierId, waterClass, name?, placement?)`, `placeOrGrow`/`findTankSpot`, `tierForGallons`,
  `stockTank(state, tankId, StockEntry[])` (species, count, sex plan incl. 'pair' | 'mixed' | 'females' | 'auto', age),
  `scatterDecor`/`decorateTank`, `matchWaterToStock`, `finishTank`, `speciesForClass`. `core-testkit.ts`:
  `richSaveState`, `manyTankWorld`, `findNonFinite`.
- 46 named fixtures in `src/dev/fixtures/index.ts` (lazy registry, `./lazy.ts`): the 5 starter showcases, big_facility,
  community_fw, marine_reef, stress_school, offline_test, core_legacy_v0, panels(_live), facility_* (6 levels),
  breeding_* (5), behavior-* (5), playthrough_<starter> (5, the bot, 30 days), brackish_* (3), frags_* (3), staff_*
  (3), shows-demo, shows-hall, prismatic_showcase. Today they load only by `?fixture=<name>` or `__AQ.loadFixture`:
  there's no picker.
- `src/ui/dev/DevPanel.tsx` (the wrench in the top bar; Settings › Developer tools turns it on): money, unlock all,
  +10 test tanks, the market (open it, Prismatic offers, a buyer for a listing), time (speed, +1 h to +7 d), spawn,
  the selected animal (age, force breeding, Prismatic), the focused tank's water editor and presets (ammonia spike,
  heatwave, neglected, pristine), AI and compatibility views. Its writes are direct, never commands, and it's off in
  a shared shop (`devWrite`; `src/dev/debugHooks.ts` wraps every write in `noSharedWrites`).
- `src/dev/debugHooks.ts`: `window.__AQ` (e2e, QA, the console): `dev.*`, `loadFixture`, `fixtures()`, `newGame`,
  `advance`, `setGame`, `mutate`, `hash`, `autosave`; production keeps only `READ_ONLY_KEYS`.
- `src/game/useAutosave.ts`: a world booted from `?fixture=`/`?showcase=` is never autosaved (`fixtureSaveId`), so a
  test scene can't overwrite the player's autosave.
- The catalogue a builder offers (counted on `a704e63`): 48 species (freshwater, marine, brackish); 7 water classes
  (freshwater_cool, freshwater_tropical, freshwater_planted, marine_fowlr, marine_live_rock, reef, brackish); 16 tank
  tiers (`TANK_TIERS`), 30 equipment, 50 decor, 8 substrates, 21 foods (`src/data/catalog/`); 23 research projects, 6
  facility levels, 3 staff roles, 4 show tiers and 16 show classes, 56 unlock keys (`src/data/`). Top-level
  `GameState`: clock, tanks/tankOrder, creatures, clutches, inventory, facility, market, finance, progress (reputation,
  mastery, unlocked, research, quests, tutorial, counters, discoveries), visitors, staff, shows, notify, production,
  automation.

**The gate (don't change it without the owner).** `src/state/devTools.ts`: the write tools exist only in a dev build
(`npm run dev`), or in a production build made with `VITE_E2E_DEV_URL=1` and opened with `?dev=1` (the e2e base-path
build only); the live site ignores `?dev=1` (ADR-0037 decision 3; B-190; tests `tests/sim/plat-dev-tools.test.ts`,
`tests/e2e/prod-mode.spec.ts`). Where the tools are allowed, Social is the local stub (`src/ui/online/mode.ts`) unless
built with `VITE_SOCIAL_ONLINE_IN_DEV=1`, so nothing made in the lab reaches the live project, the owner's online
save or the leaderboard. Keep it that way: never set that flag for the lab. A dev build at http://127.0.0.1:5173 also
keeps its own browser storage, apart from the live sites' saves.

**A suggested shape (yours to improve; the owner's answers rule).**
1. *A recipe:* a versioned, documented JSON `ScenarioRecipe` (`src/dev/scenario/`): a base (blank shop, a starter,
   any fixture, or a copy of the game on screen), a seed, the shop (money, day and hour, speed, facility level, unlocks
   and research, reputation, the guide finished), tanks (tier, water class, name, water values, equipment, substrate,
   decor or "auto", lights) and their animals (species, count, sex plan, age, name, genes or morph, Prismatic, stats
   such as hunger or health, breeding state), staff, shows, and the market (offers, listings, bids). One pure
   `buildScenario(recipe) → GameState` made from the helpers above; `validateRecipe` that names each problem (an
   unknown species, a tank too small) and warns, without refusing, about a bad pairing, since bad setups are what the
   owner wants to test. Same recipe and seed, same world.
2. *Every built world is a legal save:* it goes through the real save path (serialise, load, `repairState`) with
   nothing repaired, no non-finite numbers (`findNonFinite`), and loads again in a fresh session. Unit tests for that
   on a set of sample recipes and on every species at least once.
3. *The screen:* a "Scenario lab" in the dev tools (its own lazily loaded chunk): start from, the shop, a tank list
   with an animals editor per tank, presets (save, load, duplicate, delete, kept in this browser), the recipe as JSON
   (copy, paste, import and export a file), and "Build and play". Plus a fixture picker in the dev panel for the 46
   fixtures. It refuses inside a shared shop, as the dev panel does.
4. *Addresses and scripts:* `?scenario=<preset>` (and perhaps a recipe in the address) behind the same gate as
   `?fixture=` and never autosaved over the player's save; `__AQ.scenario.*` for agents and e2e; a vite-node script
   (`scripts/scenario.ts <recipe.json> --hours N`) that builds a recipe headlessly, runs time forward and prints a
   report (births, deaths, water, money), so a scenario can be tested without a browser.
5. *Ready-made presets* the owner can start from (ask which they want first): an ammonia crisis, a breeding-ready
   pair, a reef with a Prismatic clownfish, a crowded or aggressive tank, a broke shop with hungry fish, a staffed
   store, show day, a market with bids, a late-game grand hall.
6. *A doc* (`docs/SCENARIOS.md`) for the recipe format, so the owner can ask any agent "make me a scenario with …" and
   paste the result; and `npm run lab` (a `package.json` script, a core file: say so in the commit) that starts the dev
   server and opens the lab. Run it from `~/LocalTest/AquariumGo`: Vite on the `/Volumes/Dev` image is very slow.

**Ask the owner first, in one batched AskUserQuestion round** (recommended option first, ASCII mock-ups in previews;
their answers verbatim in ADR-0051, the next free number), at least:
- *Where they use it:* (recommended) on this Mac, started with one command or by asking an agent in CNVS (no new
  service, ADR-0037 untouched); or a private "lab" site on Render's free plan, built with the dev tools and the local
  stub. That second one is a new remote service and a reversal of part of ADR-0037 decision 3: it needs their
  explicit yes, and it may never touch the live Supabase project or the shop server.
- *What it must set up first* (multi-select): tanks and water; animals (genes, Prismatic, age, health); equipment and
  decor; the shop (money, time, facility, unlocks, research, staff, shows, market); breeding (pairs, eggs, fry);
  problems (water crises, sick or starving animals, broken equipment).
- *Saving:* named presets in the browser, a JSON file to export and import, and a link (recommended: all three).
- *Which ready-made presets*, and whether the lab should open its scenario paused.
- *Shared shops:* recommended out of scope (the lab is solo; a shared shop runs on the server). A local-stub shared
  shop seeded from a recipe (`server/stub.ts`, `scripts/shared-stub-shops.ts` show how stub shops are made) would be
  a later chunk.

**How to run it.** A full chunk per `CLAUDE.md` and `PLAN.md` "How a chunk runs": write chunk 15's brief into
`PLAN.md` (requirement ids too, `docs/agent/REQUIREMENTS.json`), build on `next` (`f05d8e5` plus this handoff's docs
commit), the four checks from `~/LocalTest/AquariumGo` under `caffeinate -i -s` with
`PLAYWRIGHT_BROWSERS_PATH=~/LocalTest/playwright`, one fresh reviewer (Opus 5.5, `model: "opus"`, `effort: "max"`,
never Fable) given the brief and `git diff <start>..HEAD`, its blockers fixed, `PLAN.md` and this file updated, push
`next`. Then test it yourself as the owner would: start the lab, build each preset and a recipe of your own through
the screen (a Playwright look script with screenshots at desktop and phone widths, like chunk 14's
`scripts/_audit/chunk14/look.mjs` in the clone), play one forward, export, import, reload, and check the players'
build still has none of it (`prod-mode.spec`, and `?scenario=` ignored there). e2e: one spec that builds a recipe
through the screen and plays it. Nothing here deploys: a dev-only tool needs no release, and `main`, Render and the
shop server stay untouched without the owner's yes in your session. No new dependencies without asking.

**State of things.** `main` = `a704e63` (0.7.0, live on GitHub Pages, aquarium-go.onrender.com and the shop server;
they serve players: the owner, their daughter and, since 2026-10-22, a third player). `next` = `f05d8e5` plus this
handoff. The internal clone `~/LocalTest/AquariumGo` is detached at `a704e63`, nothing running, no patch applied; its
`scripts/_audit/` holds Marshall's git-excluded scripts (`patch-sync.sh`, `patch-at.sh`, `chunk14/`,
`catalog-counts.ts`). Marshall isn't editing the repo or the clone.

**Also from 2026-10-22, in case the owner raises it:** the third player (Windows, Edge, signed up through
CalliClub's invite) sat on "Waking the shared shop…", which stays up only while the browser's `GET /health` to
`aquarium-go-shops.onrender.com` fails (a socket that fails shows "Catching up…" instead; a refusal shows its own
words, and no refusal was sent). Both sites point at the right server and its CORS allows both, so it's most likely
their network or browser; the owner has the steps to give them (open `/health` in a tab; a blocker or antivirus web
shield; F12 › Console). Not confirmed yet. The server logs no joins or refusals at the door; `/stats` counters (per
room `frames.welcome`, `sent.closing` in bytes) and the `saves` row's time (opening a shop saves the player's own
game first) are how to read a visit. A paused shared shop stays paused for a joiner who may not pause (the DND Aq.
Co. shop was left paused).

## 0.7.0, the money pool: released (Marshall, 2026-10-22)

- **Chunk 14 is done and released** (PLAN.md chunk 14 and "Releases"; ADR-0050). Built as the owner asked ("Within CNVS
  make Marshall do it … as close to one-to-one as we talked about, as far as being a finished product"), from their
  words in ADR-0043: each shared-shop member spends the shop's money (the pool) within a tier the owner sets in the
  members list (Spends freely, everyone's start; Allowance, topped up each game day; Asks first), members ask for an
  amount in the Shop money sheet, the owner and the members they let approve answer or give money, and staff and the
  stock budget need Spends freely. The state is in the shop's `GameState.pool` (`src/sim/pool.ts`): no database
  change. `main` = `a704e63` on GitHub Pages, the Render address and `aquarium-go-shops` (`/health` `build`
  `74779d9a30306b9c`); `next` = the release commit `d16dd72` plus docs.
- **Tested:** the four checks on the release commit (unit 3,243, e2e 331 of 331); a fresh Opus review (one blocker, a
  test that couldn't fail) and two confirmations, the last clean; live after the release, the smoke 27 of 27 and the
  two-browser money test 29 of 29 on both sites.
- **For the owner, when they've played it** (not asked yet; ask only if it matters to them):
  - Care is never counted or refused (ADR-0050 decision 2), so a member on Asks first can still spend the pool on
    doses and repairs: up to about $400 a dose for a 1,000-gallon reef tank, at most 10 actions a second. Counting care
    against an allowance (never refusing it) or capping it would be a new decision.
  - Approvers can give each other money (by design: the owner picks them).
  - A pool pop-up can lapse behind the game's own news in a busy shop (the toast stack shows 3 at a time); the line is
    always in the alerts list.
  - On a touch screen, a press on a tier held over 600 ms right after typing an allowance can send the amount and then
    the tier (two alerts lines; cosmetic).
- **Still open after it:** F1 (the owner's VoiceOver pass), the audit's other findings (B-207, B-208), online stage 2
  (before strangers join). The owner hasn't played 0.6.0 or 0.7.0 yet: a problem they report comes first.

**Learned in chunk 14.**
- *Syncing work into the internal clone without discarding anything:* Claude Code's auto-mode classifier refuses `git
  checkout -- . && git clean` in the clone ("Irreversible Local Destruction"). What worked: write the Dev repo's
  `git diff HEAD --binary` to a patch, reverse-apply the previously applied patch in the clone, `git checkout --detach`
  the base, apply the new one; to test a commit, reverse-apply and check it out. The scripts are in the internal
  clone's git-excluded `scripts/_audit/`: `patch-sync.sh` (the Dev repo's uncommitted work onto its HEAD) and
  `patch-at.sh <sha>` (the clone at a commit); they keep the applied patch in `scripts/_audit/.patches/`. The clone
  was left detached at `a704e63` with no patch applied.
- *The toast stack is no measure of a pop-up:* it shows 3 at a time (2 on a phone) and lets routine ones lapse behind
  the game's own news (a bid, a fish's sex). An e2e that checks a pop-up records `__AQ.ui().toasts` every 50 ms from the
  start; checking what's on screen failed once in Chromium.
- *A look-around against a stub server* needs `VITE_SHARED_SHOP_SERVER` set on its Vite (the club cards ask that server
  whether the club has a shop; `?shops=` only moves the connection), and the calm HUD (`aquarium-go.ui-prefs.v1`
  `{"calmHud":false}`) off, or an idle player's strip is hidden. `scripts/_audit/chunk14/look.mjs` in the internal clone
  screenshots the money screens at desktop and phone sizes in both browsers.
- *The live site's `__AQ` is read-only* (`game()`, `ui()` and the other `READ_ONLY_KEYS`): a live test acts through the
  interface (Market › Supplies' Buy button), never `__AQ.cmd`. No throwaway account is the game's owner, so a live
  test seeds owner-only state (tiers, approvers) in the stored shop.
- *A test that measures money must send what costs money:* the review's mutants found the care exemption untested
  because the sample care cost nothing. Prove each exemption with a mutant.

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
- **0.7.0 is released** (2026-10-22: `main` = `a704e63`, Pages, the Render address and the shop server): chunk 14, the
  money pool and spending tiers (ADR-0050; the top section).
- **Shared shops, released in 0.6.0** (ADR-0043, ADR-0045): a whole shop a club plays together on a small server on Render. The
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
- **Chunk 11** (2026-10-20, PLAN.md): every player action is a command (`src/sim/commands`, 80 kinds) sent through
  `useGame.getState().dispatch`; the solo dispatcher (`src/game/dispatch.ts`) applies it at once, so the solo game is
  unchanged. With an actor (a shared shop), commands are tagged, first one wins and settings are last-writer-wins
  (`src/sim/commands/shared.ts`, the memory in `GameState.touches`). A new player action is a new command kind
  (`kinds.ts`, `apply.ts`, `validate.ts`, and a case in `tests/sim/commands-catalogue.test.ts`), never a closure.
- **Open owner questions:** F1 (the owner's VoiceOver pass); the audit's decisions A4 (the shared Pages origin,
  B-191), F5, F3, G2, A6 and new wording (B-207). K1 and group L are answered (ADR-0047, ADR-0048).
- **The Supabase CLI** (`/Users/brianbean/.local/bin/supabase`) is signed in to the owner's whole account, anonyform's
  Pro organization included. Scope every remote command to the project: `--linked --project-ref zkavcxrsxdgdlstravpj`
  (`db query` takes `--project-ref` only with `--linked`). Never print or save the secret key; never read the CLI's
  stored sign-in; stop and ask if anything would cost money (the owner: "lets make everything free if we can"). A
  query that would print another player's email is refused by Claude Code's auto mode (PII): count, or match the
  owner's own email, instead.

## 0.6.0, shared shops: released (Chase, 2026-10-21)

- **Released** at the owner's go-ahead ("test it and then release. I'll have to test in a sec"; PLAN.md "Releases"):
  `main` = `298b3ff`, `next` = its tree. GitHub Pages, the Render static site and the shop server `aquarium-go-shops`
  (now on branch `main`, deployed by hand) are all from `298b3ff`; `/health` `build` `681ac8b023eeaca7` equals the
  game's shared build hash. The live smoke 23 of 23; the agent's live two-browser test 18 of 18 on the Render address
  before the release and on Pages after. The first Pages run failed a racy unit test (fixed in `3d7d2cc`, test only).
- **Still with the owner:** their own play-test with their daughter (on Pages or the Render address; each address has
  its own device saves, and "Load online save" brings the owner's real aquarium to either). The owner: Social › Clubs ›
  the club › Create shared shop. Their daughter: her own account through the club's invite link (a parent signs up for
  a player under 13, ADR-0039 decision 4), then the club card › Open shared shop. Also to confirm with the owner: the
  opening card's back button from the title screen reuses the existing word "Title".
- **From now on, the shop server goes after `main`, never before** (PLAN.md "Releases", step 4): push `main`, wait for
  Pages, then `render deploys create srv-dbbt6gbncjis73c23br0 --commit <main's full sha> --confirm --wait -o text`, the
  static site the same way (`srv-dath0mfavr4c73dgk3j0`), then `npx vite-node scripts/shared-smoke.ts` from the internal
  clone, and check `/health`'s `build` and both `version.json` files. A change that leaves src/sim, src/data, src/types
  and the pure persistence files alone keeps the shared build hash, so the server needn't change with it.
- The chunk 13 worktree (`/Volumes/Dev/Projects/AquariumGo-chunk13`, branch `chunk13`) is used up and can go.
- **Next:** chunk 14, permission tiers and the money pool: done and released as 0.7.0 (the top section).

## The owner's standing rules (from the shared-shop chunks; verbatim where quoted)

- "anything that's going to cost anything extra needs to be run by me first"; "lets make everything free if we can for
  now please". Render's free web service and Supabase's free project only; nothing paid without a yes.
- Never push `main` or deploy players' builds without the owner's yes in the session; never force-push or rewrite
  pushed history; push from the internal-disk clone (`git push origin "${N}:refs/heads/next"`).
- Supabase: scope every remote command `--linked --project-ref zkavcxrsxdgdlstravpj`; never print or save the secret
  key; never read the CLI's stored sign-in; the agent never sees the server's key (the owner pastes it into Render), and
  it never enters the repo. Never write invite codes or players' emails in the repo (it is public).
- The shop server's password is never asked for or shown in chat. If it must change: `node scripts/shared-server-key.mjs
  --yes` from the internal clone, then the browser-Claude prompt flow in "Learned in chunk 12" (the agent can't set
  Render variables). Never run a build or install command to "check" it.
- The owner prefers agents to do everything they can themselves and to ask once, batched (AskUserQuestion, recommended
  option first, the answers verbatim in a new ADR, the next is ADR-0051).
- Reviewers (the chunk's fresh reviewer and its confirmation passes) run on Opus 5.5 at max effort (the Agent tool:
  `model: "opus"`, `effort: "max"`), never Fable.
- No new dependencies without asking (`ws` 8.22.0 is approved, server only, no `@types/ws`). Never weaken, skip or delete
  a test; don't change permission settings, hooks or push guards; don't end a turn while tests or a reviewer you started
  are still running; never count a test that didn't run.

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
4. **Released 0.6.0** (2026-10-21; PLAN.md "Releases"). The next release goes as 0.5.4 to 0.6.0 went: the four checks
   green on the final code, bump `version` and add the CHANGELOG entry, merge `next` into GitHub's `main` with the
   owner's go-ahead in the session (in the internal-disk clone, `git fetch origin` first and merge onto `origin/main`:
   the Dev repo's local `main` can lag, and a merge made on it is refused as not a fast-forward), push from the
   internal-disk clone, watch the Pages run (it runs typecheck and the unit tests first; a test that fails only there
   is usually a race or a time limit), then the shop server and the Render static site by hand from `main`'s full sha,
   the live smoke, and both `version.json` files.
5. **Shared shops: done and released** (chunks 10 to 13, 0.6.0), and their money pool and spending tiers (chunk 14,
   0.7.0; the top section). The audit's remaining findings (B-207, B-208) wait for the owner.

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

**Learned in chunk 11.**
- *A new player action is a new command:* its kind in `src/sim/commands/kinds.ts`, its call in `apply.ts`, its fields in
  `validate.ts`'s `SCHEMA` (TypeScript checks every field has one), and a case in `tests/sim/commands-catalogue.test.ts`
  whose sample changes the game (or is a pinned refusal the wrong mapping would turn into a change). If it buys,
  sells, moves or takes, it gets an expectation in `shared.ts` (`staleOf`, `touchesOf`, `markOf`); a setting gets a
  `settingKey`; a new guide flag on an action goes in `ACTION_FLAGS`. The interface sends it with `act(cmd, opts)` and
  reads the result in `opts.after`, never from the return.
- *What chunk 13's shared dispatcher has to do:* `useGame.getState().installDispatch(fn)` while a shop is open, put
  the solo one (`soloDispatch`, `src/game/dispatch.ts`) back after. Send the command with its id; when the step with
  that `{by, id}` arrives and the replica has applied it, call `done` with that command's result (`runSharedStep`
  returns the results in `cmds` order); a rejected or lost command settles as not applied. Coalesce sliders
  (§4.2). The "seen" marks have one home, `src/ui/common/marks.ts`: keep them per player there. Others' feeds and taps
  should draw from applied commands (today the sender's `after` draws them). Today's 640-pixel listing photo is
  larger than a command may be (48 KB): shrink it first (§4.4), and `validateCommand`'s photo field and `repairState`
  gain the `p:<hash>` reference in chunk 12.
- *Mutants find the tests that can't fail.* The review swapped one mapping at a time in a copy of a module
  (`scripts/_audit/review-chunk11/mut/`: `make-mutant.mjs`, `vitest.mut.config.ts`, `confirm.mjs`;
  `scripts/_audit/chunk11/mut/run.sh` is the author's). A sample that changes nothing can't tell a right mapping from
  a wrong one.
- *Syncing to the test clone:* `~/LocalTest/AquariumGo/scripts/_audit/sync-from-dev.sh` copies the Dev repo's sources
  into the clone (no git there). **Never while an e2e pass runs in the clone:** its Vite server serves `src` live,
  so later specs test the new files and the pass no longer tests its commit (a pass on `2202c45` had to be thrown
  away). Check the clone out at the commit for a counted pass: `git checkout -q -- . && git clean -q -fd src server
  tests docs && git fetch -q dev next && git checkout -q --detach FETCH_HEAD`.
- *The reviewer can work during a pass* if its commands run with `nice -n 19`, vitest with `--maxWorkers=1`, and no
  browsers or builds: the e2e pass stayed 319 of 319 while it probed.
- *First one wins needs a mark:* a member's own earlier change is excused only while the thing is as their command left
  it (each touch keeps one); otherwise the game's own later change would be overridden. Offers and the last stored
  piece have no mark on purpose.


**Learned in chunk 12.**
- *The server's password, not a Supabase key* (ADR-0047): a secret key also opens Supabase Auth's admin tools, which no
  database rule limits. `node scripts/shared-server-key.mjs --yes` (from the internal-disk clone, which is linked to the
  project) stores a new password's SHA-256 and leaves the password on the clipboard only; the old one stops at once.
  The agent can't put it into Render (the CLI can't set environment variables; reading the CLI's sign-in to use the API
  is blocked by Claude Code's safety check). What worked: a prompt for a browser-capable Claude in the owner's Chrome
  profile, which stops before pasting; the owner says "make it", the agent runs the script, the owner says "go". Copying
  the prompt overwrites the clipboard, so the password is made last. Never ask for the password in chat: one pasted
  there had to be replaced. Check it took from the build log (`render logs --resources srv-dbbt6gbncjis73c23br0 --text
  "env names"`: the names only; `SHOPS_SERVER_KEY` must be absent) and the server's start-up line (no "not set").
- *Never run a build command to "check" it:* piping `npm ci && …` into `head` ran `npm ci` in the Dev repo before the
  pipe closed and left its `node_modules` half-installed (reinstalled afterwards). Test a command's quoting with `echo`.
- *A preflight before a live migration:* a read-only query (who runs it, role memberships, what `service_role` reaches,
  whose default privileges) told in advance that the migration's own final check would pass.
- *Rooms in the unit tests run in-thread* (`inline` in `server/rooms.ts`) with one fake clock for the rooms, the server's
  jobs and the stub database (`tests/sim/support/sharedServer.ts`); real workers are covered by e2e against the built
  server. A test that waits on the server must move the fake clock (`pump`), or command steps (flushed 50 ms later)
  never go out.
- *The simulation shrugs off most broken data* (a null `water` or `market` steps fine): to make a step throw in a test,
  null `finance`, `progress`, a creature's `stats` or a tank's `decor`.

**Learned in chunk 13.**
- *A woken shop keeps the id it was saved with* (only `create` sets `shared_<club>`; the stub's fixture shops have their
  fixtures' ids): the client goes by the shared mode (`src/state/sharedMode.ts`), and the `shared_` id is only a second
  guard (the slot layer refuses it whoever asks).
- *The game's own guards meet a shared shop in odd places:* the guide card (a stub shop whose guide wasn't done), the
  online save's store listener (the server's saves bump `lastSavedRealMs`), the welcome-back card repeating on every
  welcome for 2 minutes, a hidden tab's return showing the opening card. Look at the screens, not just the tests:
  `scripts/_audit/chunk13/look.mjs` and `two.mjs` (git-excluded) screenshot them against a local stub server.
- *Ports:* the e2e suite uses 4395 (the restart test's own stub server) to 4399; a look-around runs its own stub server
  and Vite elsewhere (4391, 4392), so a pass in the test clone is never disturbed.
- *The e2e stub server lives for the whole run* (Chromium, then WebKit): each browser project plays its own club, and a
  test that sells or lists a fish buys one first.
- *`expect.poll` stops at the first exception* its callback throws: read possibly-missing values null-safely
  (`(await gameOf(page))?.saveId ?? null`).
- *An owner question can take hours to come back:* ask it while there's other work to do, not at the end.
