# Aquarium Go: the build plan

What we're building, in which chunks, and where we are. Update "Next step" and the status table at the end of every
chunk. This file, `AGENTS.md` and `CLAUDE.md` replace the retired agent harness
(`docs/agent/decisions/ADR-0018-retire-the-harness.md`).

## Next step

1. **Chunk 3** (Automation and notifications), in Claude Code on the Mac, on `next`. Read its brief below (the owner's
   notification answers are in, ADR-0022). Chunk 2 is done and on `next` only: players get it with the next release
   (0.5.1), which needs the owner's go-ahead (see "Releases").
2. **When the owner has time:** answer the DESIGN-S3D questions (chunk 4 needs the Production ones, chunk 5 the
   rest). Also: (a) after a rollback, an older copy of the game can't autosave into a slot that holds a newer
   version's save (it says so once, with "Refresh the page"): should a player be offered more, such as saving to
   another slot (PERSIST-014's note)? (b) Run the e2e suite in WebKit too (B-129)? (c) What accessibility level to
   aim for (B-178: panels under high contrast)? (d) Confirm `?dev=1` (chunk 1 "Decided"): it allows the developer
   tools for the session, and the dev panel comes on with the Settings switch. (e) Release chunk 2 as 0.5.1?
3. **Released:** 0.5.0 went to players on 2026-10-06 at the owner's request (see "Releases").

## Status

| Chunk | What | Status |
|---|---|---|
| 0 | Clean-up: the harness retired, S0's game fixes kept, two flaky e2e tests fixed | Done 2026-10-06. Its e2e run (owner, `3601860`): 47 of 48, the one failure camera-freeze's teardown hang, fixed in `859858a` |
| 1 | Navigation, links and the platform layer | Done 2026-10-07 (released in 0.5.0 on 2026-10-06). Its e2e run (`f59d51a`): 75 of 75, no fixes needed |
| 2 | Shop and genetics | Done 2026-10-11. Its full run (`d608dcf`): typecheck, unit 2,105, build, e2e 81 of 81; the reviewer's blockers fixed (ADR-0021) |
| 3 | Automation and notifications | Not started |
| 4 | Production lines | Not started; needs the owner's Production answers |
| 5 | Deep automation (S3-D) | Not started; needs the owner's approval of DESIGN-S3D |
| 6 | Social stub, hardening and the 0.5.0 release | Not started |

**Last full test run:** the owner's Mac, 2026-10-11, on `d608dcf`, in Claude Code from the internal-disk clone (Next
step 2): typecheck passed; unit 182 files, 2,105 tests passed; build passed; e2e 81 passed (7.4 minutes, inside
Claude Code's sandbox).

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
   fix them and re-run the checks.
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

**Testing notes** (from chunks 1 and 2):
- To test uncommitted work, `git diff --binary` it into a patch and `git apply` that in the internal-disk clone (on
  the same base commit); run the checks there.
- An e2e spec that counts shop stock pauses the clock (`dev.setSpeed 0`): a restock mid-test changes the counts.
  `dev.addShopOffer` offers never light the Market's rare-stock dot; clone a stock offer under a new id through
  `__AQ.mutate` to light it.
- Server-rendered unit tests (`renderToStaticMarkup`) read a zustand store's initial state, not its live state: copy
  the live state into `getInitialState()` first (see `tests/sim/ui-shop-05.test.ts`).

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
    QA open the game with `?dev=1`, and dev mode unlocks every destination). Owner question (d) confirms it.
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
    pass; B-178's high-contrast panels wait on owner question (c).

### 3. Automation and notifications (0.5 phase 3)

- **Design:** 0.5 spec §7.8, §10 and §12, and this chunk's parts of §16 to §20.
- **Build:** the tank card's Automation section; Auto-feed meals a day; the Auto Water Changer (equipment kind and
  label, data, the extracted water-change core `water/change.ts`, `runWaterChanger`, salt, staff interplay, the alerts
  row) and its Supplies row; `GameEvent.offerId` on rare-stock events; the "auction ending soon" event (ADR-0022);
  Settings › Notifications (categories, quiet hours, the permission flow, the test notification); web delivery with
  `public/sw.js`; the Alerts drawer footer; click routing.
- **Requirements:** AUTO-001, AUTO-003 to AUTO-011, AUTO-016 to AUTO-018, AUTO-022, AUTO-023, AUTO-026, NOTIFY-001
  to NOTIFY-010, DES-007, DES-009, ACC-004 (the automation and notification switches), PERSIST-006 (the water-lab
  hours).
- **Done when:** `automation-*`, `notify-rules`, `notify-offer-events`, `automation.spec` and `notifications.spec`
  pass, and the existing water, care and staff tests (`fix-water-*`, `staff-*`) and the determinism and step-size
  tests stay green.
- **Owner answers already in (ADR-0022):** the Unsupported callout reads "This browser can’t show notifications" /
  "Alerts still appear in the game." (no iPhone Home Screen line); add an "auction ending soon" event and keep the
  Market subtitle "New bids, sales and auctions ending". Earlier product decisions: the Auto Water Changer shares the
  Autofeeder's unlock; quiet hours fixed at 10 PM to 8 AM with an on/off switch (`PLAN.md` "Product decisions").
- **Watch:**
  - BACKLOG errata to apply: B-149 (S3-A: `water_changer: 1` in `MAX_PER_KIND`, a test that a second install fails;
    the Auto-feed switch sends `{ on: true, setting: def.defaultSetting }` from setting 0), B-117's S3-B part
    (`clients.claim()`; `notificationclick` matches windows with `includeUncontrolled: true` within its scope), B-188
    and B-189 (above).
  - Open rows to fix or defer here: B-126 (an e2e run of the production build under `/aquarium-go/`, where the service
    worker's scope matters), B-173 (quiet hours and rate limits are pure functions of an injected now and local
    minutes; unit tests at 21:59, 22:00, 07:59, 08:00 and across midnight; e2e with Playwright's `page.clock` and a
    fixed `timezoneId`), B-176 (background LOD chunks lose events: the water changer's lights-on run must fire in far
    tanks; pin LOD equivalence), B-169 (the salt formula is duplicated in the UI lane, and the water changer uses
    salt), B-177 (mutateFast's working copy, before any world-step hook), B-013 (a GameLoop test), B-167 (only if
    automation makes compatibility decisions).
  - The automation adds sim work: run the seeded and step-size tests before and after, and explain any changed
    expectation. Notification prefs live in localStorage, never the save.
- **Decide:** NOTIFY-002's quiet-hour boundaries (B-173 suggests 22:00 held, 08:00 shown); the automation step-size
  tolerances (state them in the tests); the "auction ending soon" lead time. Ask the owner before any other
  player-visible text the designs don't give.

### 4. Production lines (0.5 phase 5, several lines per species)

- **Design:** 0.5 spec §11 for the data and simulation. The screens come from DESIGN-S3D, SPEC §8.6 (the line picker)
  and §8.6.1 (the new-line steps), which replace §11.1's single-line UI (ADR-0014, owner answer 14). The Lines tab
  (SPEC §7.4) comes with Operations in chunk 5.
- **Before starting:** the owner approves SPEC §8.6 and §8.6.1 and answers the Production questions in
  `docs/agent/design/DESIGN-S3D/INTAKE.md` §11: C-27 (raise timings and the sell step), C-28 (the "Never sell
  Prismatic animals" switch), C-29 (what "protected" means), C-33 (adding a quarantine tank), C-34 (ending a line) and
  C-36 (the slot caption). BACKLOG B-135 is the same question as C-27 and C-28.
- **Build:** the production types and their `repairState` validation, `src/sim/production` and its world hook,
  Livestock › Production with the line picker and the new-line steps, several lines per species.
- **Requirements:** PROD-001 to PROD-018, DES-008, AUTO-014 (the production part), AUTO-016 to AUTO-021, AUTO-024 to
  AUTO-027, ACC-004 (the production switches), PERSIST-005, PERSIST-006 (production), and `INTAKE.md` §12's
  PROD-019 to PROD-021 with its change rows for PROD-002, PROD-003, PROD-011, PROD-012, PROD-015, PROD-018 and DES-008.
- **Done when:** `production-line.test.ts` and `persistence-05` pass with everything else.
- **Decide:** the owner calls in PROD-006, PROD-008, PROD-011, PROD-015 and PROD-017 (ask); PERSIST-005's save-size
  budget.

### 5. Deep automation (S3-D)

- **Design:** `docs/agent/design/DESIGN-S3D/SPEC.md`, its `screens/`, and `INTAKE.md`.
- **Before starting:** the owner approves DESIGN-S3D: the rest of `INTAKE.md` §11's questions (20 rows that fold into
  about 14 questions, chunk 4's included) and the open findings of
  `docs/agent/archive/evidence/S0/reviews/design-intake-3.md` (R1 to R5, M1 to M7). Record the answers verbatim in a
  short ADR.
- **Build:** the Operations hub (Overview, Water, Feed, Lines, Map), the Water room and the Live food room, Hold all,
  Settings on a gear, the Supplies, Staff and Research changes, the Automation notification category.
- **Requirements:** AUTO-002, AUTO-012, AUTO-013, AUTO-014 (the overview), AUTO-015, AUTO-016 to AUTO-018, AUTO-022,
  AUTO-026, AUTO-028, and the rest of `INTAKE.md` §12's proposals.

### 6. Social stub, hardening and the 0.5.0 release (0.5 phase 4 and the release step)

- **Design:** 0.5 spec §13 (Social stays reachable only in dev mode, ADR-0005 decision 3), §5.4 (the dock-width fix)
  and §21's release step.
- **Requirements:** SOC-001 to SOC-011, DES-010 to DES-012, NAV-019, AUTO-029, CONST-003, ACC-005, PERF-002,
  PERSIST-004, PERSIST-008, REL-004 to REL-008, REL-011, REL-013 to REL-017.
- **Done when:** `social-stub.test.ts` and `dock-width.spec` pass; `#/social/join/HIGHLAND-4821` works signed out,
  then signed in, then joined; two full test passes in a row on the Mac (REL-013); the owner has played it on a phone
  and a desktop. Then the release.
- **Decide:** SOC-010's empty-state copy (ask the owner).

**Deferred:** NOTIFY-011 and PLAT-004 (alerts while the game is closed, the native wrapper: 0.5 phase 6, needs the
owner). **Retired with the harness:** HARNESS-001 to HARNESS-030, PERF-003, REL-001, REL-003, REL-009, REL-010,
REL-012, REL-018.

## Releases

`main` is what players get: a push to `main` deploys GitHub Pages. Render may build `main` too (`render.yaml` has
auto-deploy on, but `docs/ARCHITECTURE.md` says Render is deployed with its CLI), so check the Render site after a
release and deploy it by hand if it didn't update. To release:

1. a full green run of the four checks on `next`, and the owner has played it;
2. bump `version` in `package.json` and add the `CHANGELOG.md` entry (patch for fixes, minor for features;
   `tests/sim/version.test.ts` checks that the newest entry matches);
3. with the owner's go-ahead, merge `next` into `main` and push `main`.

- **0.5.0, released 2026-10-06** at the owner's request ("push to github prod and make sure it's on render"), from
  `next` after chunk 1: chunk 1, S0's stability fixes (the planned 0.4.1) and chunk 0. The owner chose to release
  before chunk 1's e2e run (step 1 of "To release" waived for this release only); typecheck, unit and build passed.
  Later chunks ship as 0.5.x (§21).

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
- No new dependencies without asking the owner.
