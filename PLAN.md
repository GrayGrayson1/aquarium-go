# Aquarium Go: the build plan

What we're building, in which chunks, and where we are. Update "Next step" and the status table at the end of every
chunk. This file, `AGENTS.md` and `CLAUDE.md` replace the retired agent harness
(`docs/agent/decisions/ADR-0018-retire-the-harness.md`).

## Next step

1. **Ask the owner group E** of `docs/agent/OWNER_QUESTIONS.md` (backlog rows; blocks no chunk). Groups A to D are
   answered (ADR-0024 to ADR-0028; DESIGN-S3D is approved, ADR-0027). `docs/agent/SESSION_HANDOFF.md` gives the order
   of work.
2. **Then chunk 4** (Production lines): group B unblocked it (ADR-0025).
3. **Released:** 0.5.1 (chunks 2 and 3) on 2026-10-11 and 0.5.0 on 2026-10-06 (see "Releases").

## Status

| Chunk | What | Status |
|---|---|---|
| 0 | Clean-up: the harness retired, S0's game fixes kept, two flaky e2e tests fixed | Done 2026-10-06. Its e2e run (owner, `3601860`): 47 of 48, the one failure camera-freeze's teardown hang, fixed in `859858a` |
| 1 | Navigation, links and the platform layer | Done 2026-10-07 (released in 0.5.0 on 2026-10-06). Its e2e run (`f59d51a`): 75 of 75, no fixes needed |
| 2 | Shop and genetics | Done 2026-10-11 (released in 0.5.1), with the owner's follow-ups (ADR-0022). Its full run (`7acb0b9`): typecheck, unit 2,107, build, e2e 81 of 81; the reviewer's blockers fixed (ADR-0021) |
| 3 | Automation and notifications | Done 2026-10-11 (released in 0.5.1). Its full run (`aeb7657`): typecheck, unit 2,227, build, e2e 90 of 90; the reviewer found no blockers, and its cheap notes were fixed |
| 4 | Production lines | Not started; group B answered (ADR-0025), so it's next |
| 5 | Deep automation (S3-D) | Not started; DESIGN-S3D approved (ADR-0027); needs chunk 4 |
| 6 | Social stub, hardening and the last 0.5 release | Not started; D1 answered (ADR-0028); after chunks 4 and 5 |

**Last full test run:** the owner's Mac, 2026-10-11, on `6594d21` (the 0.5.1 release commit: chunk 3's code, the
version bump and docs), in Claude Code from the internal-disk clone: typecheck passed; unit 194 files, 2,227 tests
passed; build passed; e2e 90 passed (8.1 minutes, inside Claude Code's sandbox; the warmup, the `base-path` project
and 88 desktop tests).

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
a regression, and never loosen it. The teardown hang is Chromium's graceful `context.close()` on a busy WebGL page
(headless, Metal): in the owner's run on `3601860` camera-freeze's body passed in 38 s and the close then hung for
120 s, while closing the browser took 1.4 s. `camera-freeze.spec` now runs in a browser of its own and closes it with
`browser.close()` (`859858a`); give `boot.spec.ts:17` the same treatment if it hangs again.

**Testing notes** (from chunks 1 to 3):
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

### 4. Production lines (0.5 phase 5, several lines per species)

- **Design:** 0.5 spec §11 for the data and simulation. The screens come from DESIGN-S3D, SPEC §8.6 (the line picker)
  and §8.6.1 (the new-line steps), which replace §11.1's single-line UI (ADR-0014, owner answer 14). The Lines tab
  (SPEC §7.4) comes with Operations in chunk 5.
- **Decided (ADR-0025, group B, 2026-10-11):** SPEC §8.6 and §8.6.1 are approved as the screens (B1). Raise lengths
  and stage words come from each species' data, and the sell step lists each animal by its life stage at sale time
  (B2, C-27). Automation never lists a Prismatic; "Never sell Prismatic animals" only chooses keep tank (on) or batch
  (off) (B3, C-28, PROD-011). Protected = every animal in a line's keep tank, every Prismatic and every favourite;
  automation never moves them out, lists or sells them; young kept by the trait rules go to the keep tank (B4, C-29,
  PROD-008). "Add a quarantine tank" shows the real kit price, offers seeded media, handles no money and no floor
  space, checks the tank suits the line and gives the restart day only once it's cycled or seeded (B5, C-33). "End
  line" on the header card with a confirmation: animals stay, the slot frees, stats stay in history (B6, C-34). The
  slot captions as worded in ADR-0025 (B7, C-36). A full raise tank with "Pause when a tank is full" off: the fry stay,
  with one notice "{Line}: the raise tank is full, so the fry stay in {tank}." (B8, PROD-006). Costs split by the
  line's share of each tank's residents, day by day (B9, PROD-015). A line with a missing parent or tank pauses with
  one notice and is kept through saves; `repairState` marks it, never drops it (B10, PROD-017, PERSIST-006). B-135 is
  decided.
- **Build:** the production types and their `repairState` validation, `src/sim/production` and its world hook,
  Livestock › Production with the line picker and the new-line steps, several lines per species.
- **Requirements:** PROD-001 to PROD-018, DES-008, AUTO-014 (the production part), AUTO-016 to AUTO-021, AUTO-024 to
  AUTO-027, ACC-004 (the production switches), PERSIST-005, PERSIST-006 (production), and `INTAKE.md` §12's
  PROD-019 to PROD-021 with its change rows for PROD-002, PROD-003, PROD-011, PROD-012, PROD-015, PROD-018 and DES-008.
- **Done when:** `production-line.test.ts` and `persistence-05` pass with everything else.
- **Decide:** PERSIST-005's save-size budget. Ask the owner once, batched, for the player-visible text no design or
  ADR gives (at least End line's confirmation, the missing-reference notice and the quarantine purchase's restart
  line; ADR-0025's option descriptions gave examples, not approved copy).

### 5. Deep automation (S3-D)

- **Design:** `docs/agent/design/DESIGN-S3D/SPEC.md`, its `screens/`, and `INTAKE.md`.
- **Decided:** DESIGN-S3D is approved (ADR-0027, C15; `INTAKE.md` §14), with the owner's answers to C1 to C14
  (ADR-0026): Settings a gear in every build; the replaced 0.5 items (ADR-0027's list: Settings in the dock, the More
  sheet's top at about 40 %, the production tiles, the Settings test helper); every tank keeps its row in the Tanks
  panel, problems first; background tanks option B (settle pending time on actions, moves, focus changes and before
  each shared water job); water free, limited by prep and reserve size; live food never expires, and a harvest that
  would pass the room's storage is skipped ("Full"); finishing the research installs the base room, add-ons in Build ›
  Facility, dosers from the tank card; C8's strings (the table in ADR-0026); a $1 budget slider, "Raise budget" hidden
  at the maximum, an orders switch; the Automation subtitle "Shortages and paused lines"; the salt machinery only
  while salt water is used; the existing levers are the schedules (no editor); without a stock manager nobody
  reorders; a held Autofeeder raises the hungry-animal alert.
- **Before starting:** chunk 4 is done. Write design-intake-3's M3, M4, M5, R4 and R5 into the intake (no owner
  needed), and turn `INTAKE.md` §12's proposals into the chunk's requirements in `REQUIREMENTS.json`.
- **Build:** the Operations hub (Overview, Water, Feed, Lines, Map), the Water room and the Live food room, Hold all,
  Settings on a gear, the Supplies, Staff and Research changes, the Automation notification category.
- **Requirements:** AUTO-002, AUTO-012, AUTO-013, AUTO-014 (the overview), AUTO-015, AUTO-016 to AUTO-018, AUTO-022,
  AUTO-026, AUTO-028, and the rest of `INTAKE.md` §12's proposals.

### 6. Social stub, hardening and the last 0.5 release (0.5 phase 4 and the release step)

- **Design:** 0.5 spec §13 (Social stays reachable only in dev mode, ADR-0005 decision 3), §5.4 (the dock-width fix)
  and §21's release step.
- **Requirements:** SOC-001 to SOC-011, DES-010 to DES-012, NAV-019, AUTO-029, CONST-003, ACC-005, PERF-002,
  PERSIST-004, PERSIST-008, REL-004 to REL-008, REL-011, REL-013 to REL-017.
- **Also (ADR-0024):** accessibility to WCAG 2.2 AA for text and controls, with solid panels under the high-contrast
  setting (B-178, ACC-005); a WebKit e2e project beside Chromium (B-129). WebKit needs Playwright's WebKit browser in
  `~/LocalTest/playwright` (check the internal disk's free space first; no new npm package), and REL-013's repeated
  full runs include it. A WebKit-only failure is fixed, never skipped.
- **Done when:** `social-stub.test.ts` and `dock-width.spec` pass; `#/social/join/HIGHLAND-4821` works signed out,
  then signed in, then joined; two full test passes in a row on the Mac (REL-013); the owner has played it on a phone
  and a desktop. Then the release.
- **Decided:** SOC-010's empty states (ADR-0028, D1): "No trades yet" · "Trades you start or accept appear here." and
  "No friends yet" · "Friends you add appear here."

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
- Old saves are best-effort (ADR-0005). A new species or tank size bumps `SCHEMA_VERSION` (ADR-0016).
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
- From group C (ADR-0026, ADR-0027): DESIGN-S3D is approved for chunk 5. Settings becomes a gear in every build; water
  stays free; live food never expires (storage caps it); no schedule editor.
- No new dependencies without asking the owner.
