# Aquarium Go: the build plan

What we're building, in which chunks, and where we are. Update "Next step" and the status table at the end of every
chunk. This file, `AGENTS.md` and `CLAUDE.md` replace the retired agent harness
(`docs/agent/decisions/ADR-0018-retire-the-harness.md`).

## Next step

1. **0.5 is complete.** Chunk 6 is done and released as 0.5.3 (2026-10-15, the owner's go-ahead in the session, before
   the owner's play-through). Left from it: the owner's play-through on a phone and a desktop, with a VoiceOver pass
   for ACC-005 (OWNER_QUESTIONS F1). The owner's answers to F2–F4 (ADR-0036, 2026-10-16) are built on `next` for 0.5.4
   ("After 0.5.3" under chunk 6), which waits for the owner's go-ahead. What comes after 0.5 (NOTIFY-011 and PLAT-004,
   the native wrapper, are deferred; REL-002, multiplayer, is for later) is the owner's call.
2. **Released:** 0.5.3 (chunk 6's end) and 0.5.2 (chunks 4 and 5 and chunk 6 so far) on 2026-10-15; 0.5.1 (chunks 2
   and 3) on 2026-10-11 and 0.5.0 on 2026-10-06 (see "Releases").
3. Every owner question up to group E is answered (ADR-0024 to ADR-0035), and group F's F2–F4 (ADR-0036); F1, the
   VoiceOver pass, and G1 (B-203: more save values to pin) are open in `docs/agent/OWNER_QUESTIONS.md`. The approved screens are in
   `docs/agent/design/DESIGN-0.5/` and `docs/agent/design/DESIGN-S3D/`.

## Status

| Chunk | What | Status |
|---|---|---|
| 0 | Clean-up: the harness retired, S0's game fixes kept, two flaky e2e tests fixed | Done 2026-10-06. Its e2e run (owner, `3601860`): 47 of 48, the one failure camera-freeze's teardown hang, fixed in `859858a` |
| 1 | Navigation, links and the platform layer | Done 2026-10-07 (released in 0.5.0 on 2026-10-06). Its e2e run (`f59d51a`): 75 of 75, no fixes needed |
| 2 | Shop and genetics | Done 2026-10-11 (released in 0.5.1), with the owner's follow-ups (ADR-0022). Its full run (`7acb0b9`): typecheck, unit 2,107, build, e2e 81 of 81; the reviewer's blockers fixed (ADR-0021) |
| 3 | Automation and notifications | Done 2026-10-11 (released in 0.5.1). Its full run (`aeb7657`): typecheck, unit 2,227, build, e2e 90 of 90; the reviewer found no blockers, and its cheap notes were fixed |
| 4 | Production lines | Done 2026-10-14 (not released). Its full run (`ab03ff1`): typecheck, unit 2,302, build, e2e 93 of 93; the reviewer's 8 blockers fixed (`a342098`) and its confirmation pass's one more (`ab03ff1`) |
| 5 | Deep automation (S3-D) | Done 2026-10-14 (not released). Its full run (`baa2234`): typecheck, unit 2,402, build, e2e 107 of 107; the reviewer's 3 blockers fixed (`0b316f1`), its confirmation passes' one each (`d917bdd`, `6a36439`), and its third pass's first note (`baa2234`) |
| 6 | Social stub, hardening and the last 0.5 release | Done 2026-10-15 (released in 0.5.2 and 0.5.3). Its two full passes (`9bff79e`): typecheck, unit 2,697, build, e2e 285 of 285, twice; the code reviewer's 5 blockers fixed (`bba00ab`) and its confirmation's 3 notes (`d1c37bd`); the QA reviewer RED → GREEN (`e23b8a2`, `d1c37bd`, `9bff79e`). The owner's play-through (with VoiceOver, F1) to come |

**Last full test runs:** chunk 6's two passes in a row (REL-013) on `9bff79e`, its final code, the owner's Mac,
2026-10-15, in Claude Code from the internal-disk clone checked out at that commit: typecheck passed; unit 226 files,
2,697 tests passed; build passed; e2e 285 of 285 in Chromium and WebKit, dev and production builds (32.0 and 32.4
minutes), both times. Earlier: `d7560f9` clean (2,696; 281 of 281); `db25042` one failure (`shop-filters.spec.ts:75`, a
sheet's focus race, fixed in `e23b8a2`).

## How a chunk runs

1. `git checkout next && git pull`, and note the commit you start from.
2. Read the chunk's brief below and only the design sections it names (the 0.5 spec is 159 KB). The harness's
   slices map to chunks: S1 is chunk 1, S2 is 2, S3 (S3-A, S3-B) is 3, S3-C is 4, S3-D is 5, S4 is 6. In
   `docs/agent/BACKLOG.md`, apply your chunk's rows of "Design errata by slice", and fix the open rows of your slice
   or defer them here with a reason. Fix cheap items in the files you touch and mark them fixed.
3. Build it in sensible commits, following `AGENTS.md`.
4. Run `npm run typecheck`, `npm test`, `npm run build` and `npm run e2e` on the final code; all four pass (for e2e
   see `CLAUDE.md`). The 0.5 spec also asks that a v0.4.0 save loads with no repairs; that is best-effort only
   (ADR-0005). What must hold: PERSIST-002, PERSIST-003, PERSIST-007 and, from chunk 1, PERSIST-014.
5. One fresh reviewer subagent gets the brief and `git diff <start>..HEAD` (not your summary) and reports blockers;
   fix them and re-run the checks. Reviewers run on Opus 5.5 at max effort (`model: "opus"`, `effort: "max"`), never
   Fable (the owner, 2026-10-11).
6. Update this file, commit, push `next`, and tell the owner what to try (`npm run dev`, then
   http://127.0.0.1:5173).

**The owner's one-line check run**, for when the agent can't run e2e itself. It pushes `next`, checks it out in the
internal-disk clone (Next step 2), runs all four checks there and keeps a log in
`~/LocalTest/AquariumGo/.agent-runs/checks-next.log`:

```bash
cd /Volumes/Dev/Projects/AquariumGo && git push -u origin next && cd ~/LocalTest/AquariumGo && git fetch dev next && git checkout --detach FETCH_HEAD && npm ci && mkdir -p .agent-runs && { git log --oneline -1; for c in typecheck test build e2e; do echo "=== npm run $c"; PLAYWRIGHT_BROWSERS_PATH=~/LocalTest/playwright npm run $c; echo "=== $c exit $?"; done; } 2>&1 | tee .agent-runs/checks-next.log
```

**Known flaky tests** (from the harness's baseline): `boot.spec.ts:17` and `camera-freeze.spec.ts:34` once timed out
tearing down the browser; `playthrough-starters` can trip Vitest's RPC timeout on a slow machine; `core-gameloop`'s
20 ms median-tick test depends on machine speed. If one fails, re-run it alone on an idle machine before calling it
a regression, and never loosen it on the owner's Mac. (On GitHub Actions and Render's build, `CI` and `RENDER`, every
wall-clock limit in tests/sim is multiplied by 4 through `tests/sim/support/timeBudget.ts`: those machines measured 2×
slower on 2026-10-15, and the rest is room for a busy build machine, since a failed Render build blocks a release.)
The teardown hang is Chromium's graceful `context.close()` on a busy WebGL page
(headless, Metal): in the owner's run on `3601860` camera-freeze's body passed in 38 s and the close then hung for
120 s, while closing the browser took 1.4 s. `camera-freeze.spec` now runs in a browser of its own and closes it with
`browser.close()` (`859858a`); give `boot.spec.ts:17` the same treatment if it hangs again.

**Testing notes** (from chunks 1 to 4):
- To test uncommitted work, `git diff --binary` it into a patch and `git apply` that in the internal-disk clone (on
  the same base commit); run the checks there.
- An e2e spec that counts shop stock pauses the clock (`dev.setSpeed 0`): a restock mid-test changes the counts.
  `dev.addShopOffer` offers never light the Market's rare-stock dot; clone a stock offer under a new id through
  `__AQ.mutate` to light it.
- Server-rendered unit tests (`renderToStaticMarkup`) read a zustand store's initial state, not its live state: copy
  the live state into `getInitialState()` first (see `tests/sim/ui-shop-05.test.ts`).
- Notification delivery reads the device clock (quiet hours): a test that expects one to show turns quiet hours off
  (the e2e specs set `aquarium-go.notify.v1` in an init script) or pins the clock and timezone, or it fails at night.
  e2e records notifications by stubbing `window.Notification` and `ServiceWorkerRegistration.prototype
  .showNotification`. Playwright's `toBeEnabled` counts `aria-disabled` as disabled.
- Every e2e run also builds the game for production under `/aquarium-go/` and serves it for the `base-path` project
  (about 10 s more, even for one spec).
- Sim tests that breed need real cover: the `@/sim/aquascape` mock doesn't reach the breeding module, so put planted
  decor in the tank (`tests/sim/support/production.ts` builds a working farm and line). Tank tiers and decor start
  locked: unlock them with `UNLOCK_KEYS` and `unlock(g, k, { silent: true })`.

**Requirements.** The ids below come from `docs/agent/REQUIREMENTS.json`; their acceptance criteria are the
checklist. Skip criteria that only made sense for the harness (gates, ledgers, evidence manifests, reviewer records,
slice contracts). Where a criterion leaves a value to "the slice contract" (a budget, a tolerance, a string), choose
it, write it under the chunk below, and ask the owner about player-visible text the designs don't give. When a chunk
is done, set its ids to `GREEN` (or `DEFERRED`, with the reason in `note`).

## Chunk briefs

### 1. Navigation, links and the platform layer (0.5 phases 0 and 1) — done 2026-10-07

- **Built:** `src/platform/` (a new top-level layer, in `docs/ARCHITECTURE.md` and the architecture test);
  `src/ui/nav/` (routes, the hash router, the boot, reload and leave rules); the phone tab bar and More sheet;
  full-height phone sheets; locked panels; Copy link on offers; forward-safe saves (PERSIST-014). Requirements
  NAV-001 to NAV-018, PLAT-001 to PLAT-003, PLAT-005, ACC-001, ACC-002, DES-001 to DES-004, PERSIST-014, CONST-005.
- **Decided:**
  - The owner's answers are ADR-0019: a link to a real screen skips the title and opens the latest save behind the
    loading card; a reload (or a return through history) reopens this tab's aquarium at the address; the loading
    card's bar loops; the not-found toasts' wording.
  - Phone sheets start at 64 px ± 2, the tank card at 118 px ± 2, the More sheet's top at 48 % of the height;
    "Link copied" shows for 4 s.
  - `?dev=1` allows the developer tools for that session only and doesn't switch the dev panel on by itself (e2e and
    QA open the game with `?dev=1`, and dev mode unlocks every destination). The owner confirmed it (ADR-0024).
  - The More tab opens the More sheet; while it's highlighted, tapping it returns to the tank view. A panel's first
    tab has no URL segment (`#/build` is Build › Tanks). A link opened in a fresh tab gets no synthetic parent entry.
  - DESIGN-S3D will move Settings to a gear and put Operations in the dock and first in More (`INTAKE.md` C-1, C-2):
    the dock and More are built so that's a small change.

### 2. Shop and genetics (0.5 phase 2) — done 2026-10-11

- **Built:** shop filters and counts; morph-named offer cards; the offer detail's Genes and Temperament sections,
  morph line, from-notification banner, per-tile verdicts, fit badge and buy labels; the gone-offer button; the
  Market's rare-stock dot; the Genetics Lab reveal fix; the Cambodian and Metallic betta genes, the Cambodian Veiltail
  strain and the `rare` allele flags; the Encyclopedia's genes line and science article. Requirements GEN-001 to
  GEN-012, MKT-001 to MKT-015, DES-005, DES-006, ACC-003, PERF-001.
- **Decided:**
  - The owner's answers: ADR-0020 (long verdict labels in the offer detail; white and double tail below their
    partners; the article, the betta note and the no-tank wording; gene nouns; tile reasons only for temperature),
    ADR-0021 (a gene that leaves no trace reads "Can’t be seen on this animal" before the Genetics Lab; "all their
    young"; "Pair it") and ADR-0022 (Legendary below 1 in 10,000; the Stability word "Stable · Sensitive · Fragile";
    the lined seahorse's yellow/red looks Yellow).
  - Tiers (`npm run report:rarity`): betta 240 morphs at 1 / 9 / 21 / 39 / 170 (v0.4.0) → 540 at
    1 / 9 / 21 / 145 / 364, 0.56 % of betta stock Legendary.
  - **PERF-001 budgets**, measured on the owner's Mac (internal disk, vite-node, median of 7). v0.4.0 (`0d9fc5a`) →
    chunk 2: building the betta catalog 5 ms (first 10 ms) → 33 ms (first 43 ms); Encyclopedia › Betta's genetics
    sections from cold 9 ms → 28 ms, warm 4 ms → 4 ms; previews for `big_facility`'s 10 freshwater tanks 0.8 ms →
    0.8 ms. Budgets: the betta catalog builds in ≤ 100 ms once per session; Encyclopedia › Betta renders in ≤ 100 ms
    cold and ≤ 16 ms warm; an offer computes at most 6 tile previews eagerly (plus the selected tank), ≤ 8 ms
    together; the first offer of a species builds its look table once (bettas ≈ 30 ms); `perf.spec` stays green.
  - Before the Genetics Lab a Genes row says only what the animal's look proves (`lookalikePairs` in
    `src/ui/panels/market/offerGenetics.ts`; a property test checks look-alikes read alike in every species). The
    morph line shows for every tier except a degenerate "about 1 in 1". `dev.addShopOffer` offers count as seen (a
    test scenario isn't news) and take `alleles`. The Encyclopedia's genes line is shown for bettas only.
  - Seeded tests: B-128's three seed-fragile tests were rebuilt first (`6343ca2`), the rest passed unchanged.
  - Deferred, with reasons in `docs/agent/BACKLOG.md`: B-130 to chunk 4, B-170 to chunk 5, B-181 to the next render
    pass; B-178's high-contrast panels go to chunk 6 (ADR-0024: WCAG 2.2 AA with solid high-contrast panels).

### 3. Automation and notifications (0.5 phase 3) — done 2026-10-11

- **Built:** the Auto Water Changer (data, one per tank, the shared water-change core `src/sim/water/change.ts`,
  `runWaterChanger`, salt, keepers, save repair of its two lab hours); the tank card's Automation section (Auto-feed
  with Meals a day, Auto-clean, buying from the card) and the Water tab's note; the "Auto-feed is paused" alert (drawer
  row, tank dot, a once-a-day sim event); notification tags on sim events (`GameEvent.notice`, `offerId`) and the
  "auction ending soon" event; Settings › Notifications; web delivery (`src/ui/notify/`), `public/sw.js`, the 192 px
  icon; the Alerts drawer footer; tap routing with the one-shot offer banner; the `base-path` e2e project (B-126).
  Requirements AUTO-001, AUTO-003 to AUTO-011, AUTO-023, NOTIFY-001 to NOTIFY-010, DES-007, DES-009 GREEN; AUTO-016
  to AUTO-018, AUTO-022, AUTO-026, ACC-004 and PERSIST-006 IN_PROGRESS (met for this chunk's automation; chunks 4 and
  5 add production lines and the S3-D chains).
- **Decided:**
  - The owner's answers: ADR-0022 decisions 4 and 5 (the Unsupported callout, "auction ending soon") and ADR-0023
    (the "ending soon" wording, "{Name} gave birth" for live births, a prize-less show result keeps the log's line,
    the locked Auto-clean row shows the Auto-feed lock hint).
  - Quiet hours run from 22:00 up to 07:59 (22:00 held, 08:00 shown, B-173's proposal); a held notification is dropped,
    not delivered at 8 AM (the Alerts drawer keeps everything). Danger-level Animal care, and untagged danger events
    about a tank, come through. "Auction ending soon" fires 3 game hours before the end.
  - Step-size tolerance (AUTO-009): 4 h and 0.25 h pieces make the same changes and scrapes at the same hours and end
    within 0.15 °C, 0.05 pH and 3 % of nitrate (or 0.5 ppm); the owner accepted such tolerances for water values
    (ADR-0024 decision 7). A keeper's 30-hour window is strict (30 h: the keeper
    works again). The device skips a change for lack of salt (never a weak one) and retries the next morning.
  - What notifies: events the sim tags (rare stock, bids, sales, ending soon, breeding milestones that toast, show
    results, animal-care warnings) plus danger events about a tank. The notification needs come from the event, copied
    when it happens. The service worker is registered only once permission is granted.
  - Not built: the optional Finances "Automation gear" row (it would repeat the tanks' costs above it).
  - Seeded tests: none moved. The device runs only where installed; the new events fire only where the scenarios
    don't look (the full unit suite passed unchanged after the sim commits, before the new tests). Accepted across
    builds: the two new events ("auction ending soon", a switched-off Autofeeder with a hungry resident) take ids, and
    some rolls are keyed on ids, so a save continued in this build can roll differently from the old one (old saves
    are best-effort, ADR-0005).
  - Backlog: fixed B-013, B-117 (S3-B), B-126, B-149, B-173, B-188, B-189; partly B-169 (one salt formula; the UI-lane
    mutators move with chunk 5) and B-176 (the device is LOD-exact; cool-water cues left); deferred B-177 and B-127,
    B-171, B-174 to chunk 4 and B-180 to chunk 5 (reasons in `docs/agent/BACKLOG.md`); B-167 stays open (no
    compatibility decisions in this chunk).

### 4. Production lines (0.5 phase 5, several lines per species) — done 2026-10-14

- **Built:** `src/sim/production` (the line step once per game hour crossed from the world step; set-up checks,
  slots, names and ids; End line; Add a quarantine tank; costs; the view numbers) and Livestock › Production
  (`Production.tsx`, `ProductionSetup.tsx`: the line picker and slot caption, each line's header, tiles, five stages,
  route strip and Line rules, the three set-up steps, End line, Add a quarantine tank, the Sort sheet, choosing another
  pair or tank). Routes `#/livestock/production/:lineId` and `/new`. The economy and research fixes (B-017, B-138,
  B-139, B-174, B-195), B-127 (moves settle both tanks), B-171 (the save budget) and B-177 (mutateFast). Requirements
  PROD-001 to PROD-017 and PROD-019 to PROD-021, DES-008, AUTO-019 to AUTO-021, AUTO-024, AUTO-025, ACC-004,
  PERSIST-005 and PERSIST-006 GREEN; PROD-018 SUPERSEDED (ADR-0025); AUTO-014, AUTO-016 to AUTO-018, AUTO-026 and
  AUTO-027 IN_PROGRESS (met for production lines; chunk 5 adds the S3-D chains, the overview and AUTO-027's backup
  case).
- **Reviewed:** one fresh reviewer (Opus 5.5, max effort) read `02959af..bd02cb2` against this brief: 8 blockers, all
  fixed in `a342098` (the stream fork when a line's moves settle tanks; moves checked before settling; no temperament
  check at set-up; a keep tank shared with another line's other stages; one creature in two lines; the pair list's
  overall cap; a gone line's address; set-up taking a display tank off display), with most of its 19 smaller points.
  Its confirmation pass found all 8 fixed and one new blocker (the quarantine "cycled" line), fixed in `ab03ff1`.
- **Decided:**
  - The owner's answers: ADR-0025 (group B), ADR-0026 decision 3, ADR-0030 (this chunk's copy, the betta female,
    whole-tank sales) and ADR-0031 (the review's four lines of copy).
  - **The hold (PROD-010):** a held pair carries `repro.lineHold`, which keeps `readinessTarget` at 0 as resting
    does, so no species starts a new courtship; nothing is moved. A pair is held while the line is paused by the
    player, waiting for room, or missing a partner or tank. Waiting for room = the raise tank holds the line's young
    and has fewer places than the species raises per clutch (INTAKE C-30's places at the raised size).
  - **Raise** starts when a brood is free-swimming (the species' last rearing phase, out of the egg and parent) and
    lasts until the breeding sim raises it (species data, ADR-0025 decision 2); **Sort** runs on the young the hour
    after they're raised; **Quarantine**: the first free, cycled quarantine tank with room, one batch per tank across
    lines, 168 h; what doesn't fit waits as its own batch. "Cycled" is the game's line for a tank with animals,
    bioMaturity 0.4 (the water report's "Tank is still cycling"); a batch held only by an uncycled tank says so once.
  - **Set-up** checks each stage's tank for water, temperature, places for young and temperament: the compatibility
    engine's aggression, predation and social reasons at warning or worse refuse it, in the engine's words (stocking
    stays the places check's). Lines may share tanks, never a keep tank with another line's other stages.
  - **One owner:** a creature belongs to one line; becoming a line's parent takes it out of every batch, and costs
    count it for that line only. **Keep rules** are phenotype rule ids (the morph catalog's traits), best by value,
    ties by creature id. Favourites are never moved; Prismatics follow the switch and are never listed.
  - **Costs** are hour by hour: each line pays its share of its tanks' running cost (`tankDailyCost / 24`) and of
    each serving fed (`noteFoodSpend`), its share being its pair, young and broods over everyone in the tank.
  - **One random stream:** every `simRng` draw re-reads `state.rngState`, so a generator made before a settle's
    draws continues the stream instead of replaying it (the review's fork; also `newGame`'s own, below).
  - **Step sizes (PROD-016, AUTO-016):** 1-hour and 6-hour steps give the same moves, sorts and listings at the same
    hours; random partitions give the same counts with hours within one game hour (the breeding sim raises a brood
    inside a sub-step), the tolerance ADR-0024 decision 7 allows. Runs with background tanks (the settler running)
    repeat exactly.
  - **The save budget (PERSIST-005):** 2.5 million characters (`SAVE_BUDGET_CHARS`), what the smallest common
    localStorage quota holds. A Grand Hall with 40 tanks, 500 animals and eight lines fits. Recorded exception: listing
    photos. Past the budget the page-close copy leaves them out, and as the newest copy it's the one the next load
    uses, so those listings lose their photos (KNOWN_LIMITATIONS).
  - The pair list shows up to 30 pairs per species (a line's own and ready pairs first). A gone line's address opens
    the lines with "This line isn't here any more" (ADR-0026 decision 9). Line colours follow the line's place in the
    list (DESIGN-S3D §12), so a line's colour can change when an earlier line ends.
  - Not built: the Production tab's dot and the link row to Operations › Lines (chunk 5 has Operations); a screen for
    ended lines' history (kept in the save; Operations › Lines can show it); a sell editor (Sell is fixed at fair value
    −10%, ADR-0030 decision 6).
  - Seeded tests: one moved, explained in `a342098`. `simRng`'s fix also ends a fork in `newGame` (a generator made
    before `starterAquascape` drew, then the starter rolled from it), so `newGame(seed)` without a previewed starter
    continues the stream differently; the game's own start passes the previewed starter, so a player's seed still
    gives the same world. `fix-core-offline` R03-04 compared each tetra with the healthy run's best recovery, which a
    chance illness there pulled down; it now compares each tetra with itself. Before that, the full unit suite ran
    before and after each sim change (2,227 → 2,232 → 2,273 → 2,283), the only failures being five tests pinning the
    old whole-tank-sale rule, changed on purpose for ADR-0030 decision 8 (`6996ef7`).
  - Backlog: fixed B-017, B-127, B-135, B-138, B-139, B-171, B-174, B-177, B-195; partly B-130 (M24 and M62 wait for
    their fixes); B-167 stays open (set-up now asks the engine; runtime moves don't).

### 5. Deep automation (S3-D) — done 2026-10-14

- **Built:** `src/sim/automation` (the Water room: prep flow, salt mixing at 10 AM and 10 PM, water changes from the
  reserves at each tank's lights-on, the Auto Top-Off on the fresh reserve; the Live food room: hatchery cones,
  infusoria jars, the storage limit, live-food dosers; manual mode's five holds; Problems, Today, the weekly money and
  the flows), the three Facility research projects (finishing one installs its room), the stock manager's check split
  into a pure plan (`planPurchases`, the forecast) and the purchase (`stockCheck`), the orders switch, the nightly
  running costs, brine shrimp egg tins and 5 / 20 / 40 kg salt, SCHEMA_VERSION 2. The UI: Operations (Overview early,
  before the Desk and full; Water; Feed; Lines; Map; Problems with "Why the line stops"; Manual mode; the locked
  pages), Operations in the dock after Build and Settings on the gear (`hud-settings`), the More row, the manual-mode
  pill, the Facility map room chip, the tank chips in the Tanks panel (problems first) and on the tank card, the doser
  row, the alerts drawer's Automation section, Build › Facility rooms, Supplies (Live food, Cultures, Dry food, salt
  sizes), Staff (the $1 slider, the orders switch, the status line), Research's Facility branch, the Automation
  notification category, the Production tab's dot and link row. Routes
  `#/operations[/water|feed|lines|map|issues|manual][?layer=]` and `#/build/facility/water|food`.
- **Requirements:** NAV-020 to NAV-024, MKT-017, NOTIFY-012, ACC-006, PERF-004, PERSIST-016, AUTO-002 and its chunk
  5 children (AUTO-012 to AUTO-018, AUTO-022, AUTO-026 to AUTO-028, AUTO-030 to AUTO-047) GREEN. DES-013 (a test that
  finds every SPEC §11 string and §14 id) and DES-014 (a full Browser QA pass against `screens/`) IN_PROGRESS, for
  chunk 6's hardening and the owner's play-through.
- **Reviewed:** one fresh reviewer (Opus 5.5, max effort) read `130995d..010d64a` against this brief: 3 blockers (the
  keepers' salt lost once a Water room exists; the forecast recomputed on every panel refresh, PERF-004; Hold and
  Resume not settling background tanks) and 10 smaller points, fixed in `0b316f1`. Its confirmation pass found them
  fixed and one new blocker (salt sorting ahead of food that was out), fixed in `d917bdd` with three of its smaller
  points; two points went to the owner (ADR-0033). Its second pass found the two Water room warnings hid most real
  shortfalls (a day's totals missed the 60 % rule and the reserve's size): `6a36439` drives them from a dry run of the
  room's week (`forecast.ts`), with the owner's third round (ADR-0033). Its third pass found no blockers (verdict:
  ready); its first point (a mixer starved of fresh water reported as a salt shortage) is fixed in `baa2234`, the
  rest is B-202. Its check of `baa2234`: no blockers, ready; its two notes on the fresh warning's wording are in B-202.
- **Decided:**
  - The owner's answers: ADR-0026 (C1 to C14), ADR-0027 (the approval), ADR-0032 (this chunk's copy: shortages, the
    quiet log lines, toasts and receipts, the stock manager's lines without a pronoun, the small labels) and ADR-0033
    (the review's copy; salt batches grow with the reservoir; "Salt water runs short" and "Fresh water runs short").
  - **Jobs** run at their game hours in time order, same-hour jobs in SPEC §9.9's order; each has its own marker, so a
    re-stepped window, a save and load or the catch-up never repeats one; no randomness. The prep flow is added up to
    each job's hour first.
  - **Settling (ADR-0026 decision 5, B-176):** a background tank catches up before each shared water job, a move, a
    sale, a line's moves, a purchase into it, its water conversion or substrate change, and every manual-mode change
    (Hold all and Resume flush every tank on the fast path first, `flushBackgroundTanks`); the focused tank runs at full
    detail. Idle tanks stay coarse.
  - **Water changes with a Water room** go tank by tank in `tankOrder` at each tank's lights-on; a change the reserve
    can't cover is skipped, never done weak. The per-tank Auto Water Changer stands aside. The player's and the keepers'
    changes stay on tap water and shelf salt (C-67).
  - **The Auto Top-Off** draws from the fresh reserve as its tank catches up: background tanks' top-offs land at the end
    of their chunk, so the fresh reserve agrees across step sizes and focus within 0.5 gal; the jobs' own gallons are
    exact (AUTO-037's tolerance, KNOWN_LIMITATIONS).
  - **Salt** is mixed at SG 1.025; a batch is half the salt reserve (30 gal and 4.1 kg at the base room, up to 120 gal
    with three Reservoirs, ADR-0033); the design's 60 % rule stays, so with the morning's changes the mixer sustains
    about 33 gal a day at the base room and 118 with three Reservoirs; brackish tanks blend it with fresh. The salt machinery runs
    only while a salt tank or a hatchery uses salt water. **The stock manager's salt** with a Water room: the mixer's
    use (reorder under 11 days, `SALT_ORDER_DAYS`) plus two or three changes' worth for the salt tanks no changer
    serves, never ahead of food that's out; without a Water room the rule is unchanged. A shelf check buys as it plans,
    so a failed purchase leaves its money for the orders after it.
  - **Live food** never expires; a harvest that would pass the room's storage (60 servings a cone, 20 a jar) waits
    ("Full"). Dosers are tank equipment (kind `doser`), feed at 8, 14 and 20, a serving per 20 young.
  - **Manual mode** holds water changes, salt mixing, live food, Autofeeders and production lines; a held job is skipped,
    not queued; a held Autofeeder raises the hungry-animal alert; held lines act as paused. Life support, keepers, the
    Auto Top-Off, auctions already listed and the stock manager's orders keep running.
  - **Problems** also warns when the Water room's next week, dry-run with the jobs' rules (`forecast.ts`, which also
    gives Today its batches), skips changes for want of salt or fresh water after its first two days ("Salt water runs
    short", "Fresh water runs short", the prep rate or the reserve's size; ADR-0033). The Water room's Overview tile
    stays "OK" meanwhile: the design has no status word for it.
  - **PERF-004:** the forecast is computed once per Operations key (the game hour, the stock, the budget, the holds,
    the lines, and the player's actions, counted by `useGame.mutate`, so a change made while paused shows at once);
    Today, the flows, the week's money and Staff's dry runs are kept per key (`opsMemo`).
  - **Not as drawn:** a line "pauses", never "pauses tonight" (it holds as soon as its grow-out tank can't take the
    next clutch; KNOWN_LIMITATIONS); the Map shows each room's flows as rows rather than the drawn pipe schematic, and
    its layer control sits in the map body; the Overview's manual-mode banner has no "What's on hold" link (§7.1 draws
    none).
  - **Saves:** every new field is optional and checked by `repairState`; SCHEMA_VERSION 1 → 2 (a no-op migration).
  - **Core files:** `world.ts` (the automation hook), the types, persistence (repair, the schema bump),
    `src/state/game.ts` (the `actions` counter), `src/game/fastMutate.ts` (`flushBackgroundTanks`); AGENTS.md's store
    boundary now names the flush before a manual-mode change.
  - `dev.unlockAll` installs both rooms, so e2e games start with them.
  - Seeded tests: none moved (the jobs draw no random numbers; the settles run outside the world step's draws). Tests
    changed on purpose: `core-save-forward-safety` pins `KNOWN_AT[2]`, `production-line` expects SCHEMA_VERSION 2 (and
    PROD-015's sale now also checks the ledger's line tag); the notification defaults gain `auto: true`; the e2e
    Settings helper clicks the gear; `mobile-tabbar.spec` expects the More sheet's top at about 40 %; `shop-filters`'
    phone Supplies test measures the side line's last button (the Hatchery link comes before Buy).
  - Backlog: fixed B-176; closed B-145 (no action); partly B-169 and B-170 (the rest in chunk 6); B-167 and B-180 stay
    open; new B-202 (the Water room dry run's limits and the fresh warning's wording in edge cases, from the review).

### 6. Social stub, hardening and the last 0.5 release (0.5 phase 4 and the release step)

- **Design:** 0.5 spec §13 (Social stays reachable only in dev mode, ADR-0005 decision 3), §5.4 (the dock-width fix)
  and §21's release step.
- **Requirements:** SOC-001 to SOC-011, DES-010 to DES-012, NAV-019, AUTO-029, CONST-003, ACC-005, PERF-002,
  PERSIST-004, PERSIST-008, REL-004 to REL-008, REL-011, REL-013 to REL-017.
- **Also (ADR-0024):** accessibility to WCAG 2.2 AA for text and controls, with solid panels under the high-contrast
  setting (B-178, ACC-005); a WebKit e2e project beside Chromium (B-129). WebKit needs Playwright's WebKit browser in
  `~/LocalTest/playwright` (check the internal disk's free space first; no new npm package), and REL-013's repeated
  full runs include it. A WebKit-only failure is fixed, never skipped.
- **Also (ADR-0029):** the banner when the simulation keeps failing, "Something went wrong — your aquarium is paused.
  Save and reload." with Save and Reload (E1, B-002); typecheck and unit tests before the GitHub deploy and Render's
  build (E7, B-193; `deploy.yml` and `render.yaml` are core files, and a Render setting outside `render.yaml` is a
  remote change: ask first); the morph data (E8, B-194: rename the bristlenose fin overlay with a save migration, a
  test that no two looks share a name, odds that match how stock is picked); "Move tank" on the tank card with an e2e
  test (E10, B-196). (E9, the holding container's copy, was done in chunk 4.)
- **Done when:** `social-stub.test.ts` and `dock-width.spec` pass; `#/social/join/HIGHLAND-4821` works signed out,
  then signed in, then joined; two full test passes in a row on the Mac (REL-013); the owner has played it on a phone
  and a desktop. Then the release.
- **Decided:** SOC-010's empty states (ADR-0028, D1): "No trades yet" · "Trades you start or accept appear here." and
  "No friends yet" · "Friends you add appear here."
- **Built (2026-10-15, `cf9f5bc..` on `next`):**
  - **Social stub** (`src/social`: the SocialService, the local stub with ADR-0034's sample data, standings;
    `src/ui/panels/social`), dev mode only (SOC-011): dock, More, dots (B-152), routes and the club invite
    (`#/social/join/HIGHLAND-4821` signed out → in → joined), the Friday club-show reminder (dev only).
  - **Hardening:** the failure banner (B-002), Move tank (B-196), the morph data (B-194), save hardening (PERSIST-004,
    PERSIST-008; B-004, B-010, B-012, B-122, B-198), B-175, "What's new in 0.5" (Settings › About), the TODO check
    (REL-008), the week-ahead water check (B-202), the tank edits in the sim (B-169), the food and species rules in the
    data (B-170), far-tank AI cost (B-180), WCAG 2.2 AA through High contrast (ACC-005, B-178; ADR-0035), typecheck and
    unit tests before publishing on Pages and Render (B-193), silent e2e (the servers Playwright starts build the game
    with VITE_E2E_MUTE, which the engine treats as Mute; `silent-runs.spec.ts`).
  - **S3-D copy** (DES-013, ADR-0035 decision 3): the 18 missing strings and the rewordings, pinned with chunk 5's
    approved strings and every §14 id by `tests/sim/ui-copy-s3d.test.ts`.
  - **0.5 geometry** (DES-011): §17 measured by `tests/e2e/design-geometry.spec.ts`; toasts and the buy bar's price
    brought to it.
  - **Viewports** (DES-012): `tests/e2e/viewports.spec.ts`, every screen at eight sizes in both browsers; it found
    Operations' header off screen at 721–1000 px portrait, fixed.
  - **Hardening tests:** the route matrix with Social, Production and Operations (NAV-019), long runs over every dev
    fixture and the full-feature facility (REL-015, CONST-003, AUTO-029), the mutation boundary (REL-016,
    `docs/agent/TRUST_BOUNDARY.md`), the debt inventory (REL-017, `docs/agent/DEBT_INVENTORY.md`).
  - **WebKit** (B-129): every spec runs in Chromium and WebKit; WebKit-only test problems fixed on purpose (Tab focus,
    clipboard permissions, a loading card faster than a poll, focus return after a mouse click, a sheet's focus race,
    the ~200 hash changes WebKit allows a page).
- **Reviewed:** a fresh code reviewer (Opus 5.5, max effort) read `cf9f5bc..db25042` against this brief: 5 blockers
  (the bell's "Add a quarantine tank" dialog closed itself; a save's unknown staff role threw at payday; the Problems
  view's out-of-salt card listed every day to the short one; ACC-005 GREEN without its VoiceOver pass; DES-011's and
  REL-016's notes resting on records that didn't exist) and 14 notes, all fixed or recorded (`bba00ab`; F2 and F3 in
  OWNER_QUESTIONS). Its REL-017 verdict on the debt inventory: **YELLOW** (the core-owned workarounds and B-190
  missing, B-167 and B-161 understated; the magnified set otherwise small, known and fixable), fixed in the document.
  A fresh browser/QA reviewer compared every 0.5 surface with `DESIGN-0.5/screens` at 1440×900 and 390×844:
  **RED** (the phone buy bar floating mid-sheet, one-line offer titles, phone Clubs running off the screen, smaller
  style gaps), fixed (`e23b8a2`). The code reviewer's confirmation pass on `db25042..d7560f9`: all five blockers
  fixed, nothing broken, no new blocker, **REL-017 GREEN**; its three new notes (the panel switcher's focus, staff
  roles in F3, `alerts-close` untested and unlisted) fixed (`d1c37bd`). The QA reviewer's second pass: **YELLOW** (the
  three RED items and six of the other seven fixed; left: desktop offer names still cut in two-column cards, the
  Settings strip clipping its first label, the Genetics Lab card's shop chip, polish, and four screens not captured),
  fixed (`d1c37bd`); its third pass YELLOW (chips stretched in uneven grid rows), fixed (`9bff79e`); its check on
  `9bff79e`: **GREEN** (DES-011), measured on the captures, zero console errors.
- **Requirements:** SOC-001 to SOC-011, DES-010, DES-013, DES-014, NAV-019, AUTO-029, CONST-003, PERF-002,
  PERSIST-004, PERSIST-008, REL-008, REL-015, REL-016, REL-017, DES-011, DES-012 GREEN; ACC-005 waits for the owner's
  VoiceOver pass (F1); REL-004 to REL-007, REL-011, REL-013 and REL-014 GREEN on the two passes on `9bff79e` (their
  harness-era evidence paths, `evidence/S4`, `STATE.json` and the scripts, are retired: PLAN.md records them).
- **Measured (PERF-002, 2026-10-15, the owner's Mac, headless Chromium with hardware WebGL):** big_facility (15 tanks,
  356 animals) room view 60 fps (p95 16.7 ms), sim 3.19 ms a tick; the 1,000 gal display 60 fps; 80 schooling fish 60
  fps; 10× sim 6.08 ms a tick on average (44.7 ms worst), no game time dropped; memory +3.3 MB over 20 tank-view trips
  (budgets: 30 fps, 12 ms, 40 MB). The maximum-scale save (Grand Hall, 41 tanks, 513 animals, six lines) with every
  automation system on: 0.67 ms a tick at 1×, 2.82 ms at 10×, a game day in 220 ms (vite-node, one core).
- **Browser QA (DES-014):** Operations at 1440×900 and 390×844 matches `DESIGN-S3D/screens` apart from chunk 5's "Not as
  drawn" (the Map's flows as rows, its layer control in the map body).
- **Not as drawn:** phones keep their compact one-line toasts (tap to expand) at §17's geometry; the decided-line card
  names a quarantine tank as added only when it is newer than the line; four days or more of out-of-salt water changes
  read "Days 39–44" (the design's range form; the design draws two days); Social (dev only) shows drawn placeholders for
  friends' snapshots and a larger club name on phones; Settings keeps its "Save now" footer, which no approved Settings
  screen draws, on General and Saves only since ADR-0036 (OWNER_QUESTIONS F4).
- **Releases:** 0.5.2 went out mid-chunk at the owner's request (see "Releases"); chunk 6 ends with 0.5.3.
- **After 0.5.3 (2026-10-16): group F's answers (ADR-0036), on `next` for 0.5.4.** F2: "Best foot forward" reads
  "Enter a show and see it judged. A healthy, settled adult that trusts you shows best." F3: `core-save-forward-safety`
  pins the water classes, show tiers, buyer types, staff roles and staff traits per save format (`TABLES_AT`, from
  v2), so adding one without raising `SCHEMA_VERSION` fails (PERSIST-003 A7). F4: Settings' "Save now" footer shows
  on General and Saves only, and focus on it moves to the new tab as it goes (save.spec checks each tab and the focus;
  mobile-sheets.spec that a 390×844 phone with no notifications shows 4 of Notifications' 6 categories before
  scrolling, 3 with the footer as measured, and that the tab's end clears the tab bar). None of the three tabs fits
  that phone whole (ADR-0036 corrects the F4 option's "whole list" and its count of five). Each new test was run
  failing without its change, except save.spec's click step (a clicked tab takes focus itself in Chromium and WebKit).
  The fresh review (Opus 5.5, max) found 2 blockers, both wording (the six categories; the handoff's "`next` =
  `main`"), and 7 notes: fixed, or B-203 for the save values outside the five tables. Its confirmation pass on
  `f74e9d8`: no blockers; its five wording notes fixed, and B-203 asked as G1. Two full passes on `c9445af`: typecheck,
  unit 2,699, build, all passed twice; e2e 287 of 289 (41.5 min, the machine loaded) and 288 of 289 (32.5 min), three
  different tests failing once each, none in this change's code (B-204: the route walk's `#/operations/lines` in
  Chromium; Social's expired codes in WebKit, a 2-minute hang in its set-up; the tutorial in WebKit), each passing in
  the other pass and 5 of 5 alone on `c9445af`. Not a clean pass: a release needs one (REL-013).

**Deferred:** NOTIFY-011 and PLAT-004 (alerts while the game is closed, the native wrapper: 0.5 phase 6, needs the
owner). **Retired with the harness:** HARNESS-001 to HARNESS-030, PERF-003, REL-001, REL-003, REL-009, REL-010,
REL-012, REL-018.

## Releases

`main` is what players get: a push to `main` deploys GitHub Pages. Render doesn't build on a push, though
`render.yaml` has auto-deploy on (it didn't for 0.5.0 or 0.5.1): check its `version.json` after a release and deploy
it by hand with the Render CLI (`docs/ARCHITECTURE.md`; the owner's memory note has the command). To release:

1. a full green run of the four checks on `next`, and the owner has played it;
2. bump `version` in `package.json` and add the `CHANGELOG.md` entry (patch for fixes, minor for features;
   `tests/sim/version.test.ts` checks that the newest entry matches);
3. with the owner's go-ahead, merge `next` into `main` and push `main`.

- **0.5.0, released 2026-10-06** at the owner's request ("push to github prod and make sure it's on render"), from
  `next` after chunk 1: chunk 1, S0's stability fixes (the planned 0.4.1) and chunk 0. The owner chose to release
  before chunk 1's e2e run (step 1 of "To release" waived for this release only); typecheck, unit and build passed.
  Later chunks ship as 0.5.x (§21).
- **0.5.1, released 2026-10-11** at the owner's request (ADR-0024 decision 1, "Release 0.5.1 now"): chunks 2 (shop
  and genetics) and 3 (automation and notifications). The four checks passed on the release commit `6594d21`
  (typecheck; unit 194 files, 2,227 tests; build; e2e 90 of 90); the owner's A1 answer stood for step 1's "the owner
  has played it". `main` was fast-forwarded to `origin/main` (`5608ede`), `6594d21` merged with `--no-ff` as
  `78548a3` (its tree is `6594d21`'s) and pushed. Pages deployed by itself; Render stayed on 0.5.0 and was deployed by
  hand (`render deploys create … --commit 78548a3…`, deploy `dep-db61hn3bc2fs73afp29g`). Both `version.json` files
  read `{"id":"78548a3-…","version":"0.5.1"}`.
- **0.5.2, released 2026-10-15** at the owner's request in the session ("run the checks and release 0.5.2 if green
  yeah run all you were going to then release for sure"), before chunk 6 ends: chunks 4 (production lines) and 5
  (Operations, the Water and Live food rooms) and chunk 6 so far. The four checks passed on `86de7c3` (typecheck; unit
  222 files, 2,602 tests; build; e2e 257 of 257, Chromium and WebKit) after the first full WebKit runs found five
  WebKit-only test problems (`3435f27`, `86de7c3`). Merged as `1268783` and pushed, but the Pages deploy (now running
  typecheck and the unit tests, B-193) failed two wall-clock limits on GitHub's slower runner: `c36efa1` scales the
  unit tests' time limits on CI and Render (merge `8a8b98e`, Pages deployed). Render's build (also running the tests
  since ADR-0035) passed every test but failed on Vitest worker RPC timeouts: `6bc1bf8` uses two workers on Render
  (merge `e527e10`). Pushes go from the internal-disk clone (from the disk image the push hung), after the owner added
  gh's `workflow` scope (deploy.yml changed). Pages deployed `e527e10` by itself; Render by hand
  (`dep-db8j6mpsrm7s73eh8f30`). Both `version.json` files read `{"id":"e527e10-…","version":"0.5.2"}`.
- **0.5.3, released 2026-10-15** at the owner's go-ahead in the session ("release 0.5.3 if pass 2 is green"): chunk 6's
  end, after its reviews. Two full passes in a row on `9bff79e` (typecheck; unit 226 files, 2,697 tests; build; e2e
  285 of 285, Chromium and WebKit, twice); on the release commit `31f8b7b` (version, CHANGELOG and docs only)
  typecheck, unit 2,697, build and the production-build specs passed. The owner chose to release before the
  play-through (step 1's "the owner has played it" waived for this release). Merged as `382a637` (its tree is
  `31f8b7b`'s) and pushed from the internal-disk clone with `next`. Pages deployed `382a637` by itself (its run tests
  first, B-193; GitHub notes that `deploy-pages@v4` runs on a deprecated Node 20 and that `ubuntu-latest` moves to
  Ubuntu 26 from 2026-10-19: `deploy.yml` is a core file, left for the owner); Render by hand
  (`dep-db8o0s7f3r2c73eplvm0`). Both `version.json` files read `{"id":"382a637-…","version":"0.5.3"}`.

## Product decisions in force

- Priorities, in order: beautiful, delightful and satisfying to watch; playable and understandable; a correct
  simulation and player state; individual creatures, collection and breeding depth; stable, testable, deterministic
  systems; clear phone and desktop use; extensibility; performance; elegance.
- Local single-player first. No real multiplayer, accounts or backend without the owner (REL-002); the native
  wrapper is deferred (ADR-0001).
- Automation goes deep (ADR-0001, option C): more than Auto-feed and Auto-clean.
- The Auto Water Changer shares the Autofeeder unlock. Quiet hours are fixed at 10 PM to 8 AM, with a switch to turn
  them off (0.5 spec §12.3). One-copy Metallic is unnamed, with a subtle sheen. Locked destinations open a locked
  panel. Several production lines per species. Social is a local stub, reachable only in dev mode (ADR-0001,
  ADR-0005).
- Old saves are best-effort (ADR-0005). A new species or tank size bumps `SCHEMA_VERSION` (ADR-0016), and so does a new
  water class, show tier, buyer type, staff role or staff trait (ADR-0036).
- Catch-up bid windows stay as they are (ADR-0016).
- Morph tiers: Legendary below 1 in 10,000 of market stock (ADR-0022, replacing ADR-0005 decision 4's threshold).
- From the owner's group A answers (ADR-0024): an older build that finds a newer save keeps today's one message
  ("Refresh the page"); e2e gains a WebKit project (chunk 6); accessibility aims at WCAG 2.2 AA with solid
  high-contrast panels (chunk 6); `?dev=1` as built; chunk 3's five flagged wordings stay; automation's step-size
  checks are exact for job counts, run hours and stock units and within stated tolerances for water values.
- From group B (ADR-0025): production lines follow DESIGN-S3D §8.6 and §8.6.1; automation never lists a Prismatic;
  protected animals (keep tanks, Prismatics, favourites) are never moved out, listed or sold by automation; lines can
  be ended; a line with a missing parent or tank is paused and kept, not dropped. A line's "This week" tile shows sales
  and count, then the net after food and power (ADR-0026 decision 3).
- From chunk 4 (ADR-0030, ADR-0031): a line's Sell step lists at fair value −10% (no sell editor); for bettas the
  line moves the female in to breed and back out; a sold tank's animals move only into a tank with room and never
  into a high-risk mix, else they rest in the holding container. Set-up checks temperament; a keep tank is never
  another line's working tank; each animal belongs to one line. A save fits 2.5 million characters, listing photos
  aside (PERSIST-005). The simulation draws from one random stream (`simRng` re-reads `rngState` on each draw).
- From group C (ADR-0026, ADR-0027): DESIGN-S3D is approved for chunk 5. Settings becomes a gear in every build; water
  stays free; live food never expires (storage caps it); no schedule editor.
- From group E (ADR-0029): tank-sale bonuses need animals; "sales" counts sales; the shared Pages origin stays; deploys
  run the unit tests; no linter (no new dependency); B-008's path stays.
- No new dependencies without asking the owner.
