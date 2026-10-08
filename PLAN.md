# Aquarium Go: the build plan

What we're building, in which chunks, and where we are. Update "Next step" and the status table at the end of every
chunk. This file, `AGENTS.md` and `CLAUDE.md` replace the retired agent harness
(`docs/agent/decisions/ADR-0018-retire-the-harness.md`).

## Next step

1. **Chunk 2** (Shop and genetics), in Claude Code on the Mac, on `next`. Chunk 1 is done (its e2e passed on
   `f59d51a`, 75 of 75).
2. **Run the tests from the internal disk.** The `/Volumes/Dev` disk image is too slow for e2e: on 2026-10-07 a run
   there took 3.7 minutes to warm up and then timed out. The same commit passed all four checks from a clone on the
   Mac's internal disk (`~/LocalTest/AquariumGo`, browsers in `~/LocalTest/playwright`; remote `dev` is this repo).
   Edit and commit here; to test, fetch and check out the commit there and run the checks with
   `PLAYWRIGHT_BROWSERS_PATH=~/LocalTest/playwright`.
3. **When the owner has time:** answer the DESIGN-S3D questions (chunk 4 needs the Production ones, chunk 5 the
   rest). Chunks 1 to 3 don't need them. Also, from chunk 1: (a) after a rollback, an older copy of the game can't
   autosave into a slot that holds a newer version's save (it says so once, with "Refresh the page"): should a
   player be offered more, such as saving to another slot (PERSIST-014's note)? (b) Run the e2e suite in WebKit too
   (B-129)? (c) What accessibility level to aim for (B-178)? (d) Confirm `?dev=1` (chunk 1 "Decided"): it allows the
   developer tools for the session, and the dev panel comes on with the Settings switch.
4. **Released:** 0.5.0 went to players on 2026-10-06 at the owner's request (see "Releases").

## Status

| Chunk | What | Status |
|---|---|---|
| 0 | Clean-up: the harness retired, S0's game fixes kept, two flaky e2e tests fixed | Done 2026-10-06. Its e2e run (owner, `3601860`): 47 of 48, the one failure camera-freeze's teardown hang, fixed in `859858a` |
| 1 | Navigation, links and the platform layer | Done 2026-10-07 (released in 0.5.0 on 2026-10-06). Its e2e run (`f59d51a`): 75 of 75, no fixes needed |
| 2 | Shop and genetics | Not started |
| 3 | Automation and notifications | Not started |
| 4 | Production lines | Not started; needs the owner's Production answers |
| 5 | Deep automation (S3-D) | Not started; needs the owner's approval of DESIGN-S3D |
| 6 | Social stub, hardening and the 0.5.0 release | Not started |

**Last full test run:** the owner's Mac, 2026-10-07, on `f59d51a`, in Claude Code from the internal-disk clone (Next
step 2): typecheck passed; unit 174 files, 2,032 tests passed; build passed; e2e 75 passed (7.2 minutes, inside
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

**Requirements.** The ids below come from `docs/agent/REQUIREMENTS.json`; their acceptance criteria are the
checklist. Skip criteria that only made sense for the harness (gates, ledgers, evidence manifests, reviewer records,
slice contracts). Where a criterion leaves a value to "the slice contract" (a budget, a tolerance, a string), choose
it, write it under the chunk below, and ask the owner about player-visible text the designs don't give. When a chunk
is done, set its ids to `GREEN` (or `DEFERRED`, with the reason in `note`).

## Chunk briefs

### 1. Navigation, links and the platform layer (0.5 phases 0 and 1)

- **Design:** 0.5 spec §5 (not Social), §6 and §14, and this chunk's parts of §16 (copy, including the locked
  panels), §17 (the phone tab bar and sheet sizes), §18 (accessibility), §19 (test ids) and §20 (`nav-routes`,
  `nav-sync`, `platform-memory`, `ui-layout.spec`).
- **Build:** `src/platform/` (web and memory implementations); `src/ui/nav/` (pure routes with tests, the hash router
  with two-way store sync, the boot, reload and leave rules of §6.4); the phone tab bar and More sheet; full-height
  phone sheets; the tutorial fallback for targets in More; locked-panel states; Copy link on offers; the unknown-link
  toast; the 0.5 sections of `docs/TEST_IDS.md`; forward-safe saves (PERSIST-014).
- **Requirements:** NAV-001 to NAV-018, PLAT-001 to PLAT-003, PLAT-005, ACC-001, ACC-002, DES-001 to DES-004,
  PERSIST-014, CONST-005.
- **Done when:** the route and platform unit tests pass; every §6.2 route except Social and Production opens the right
  screen on desktop and phone; Back and Esc behave; a reload shows the title screen (unless the owner's §6.4 answer
  changes that); `nav.spec`, `deeplink-boot.spec`, `mobile-tabbar.spec` and `mobile-sheets.spec` pass with everything
  else.
- **Watch:**
  - `src/platform/` is a new top-level layer, approved by the 0.5 spec (§14): add its row to the layer table in
    `docs/ARCHITECTURE.md` and to `ALLOWED` in `tests/sim/core-architecture-boundaries.test.ts`, and say so in the
    commit (no separate ADR).
  - BACKLOG errata to apply: B-115, B-116, B-117 (after the §6.4 answer), B-146, B-150, B-151. Open S1 rows to fix or
    defer: B-011, B-126, B-129, B-172, B-178, B-179, B-182, B-183.
  - DESIGN-S3D will later move Settings to a gear and put Operations in the dock and first in More (`INTAKE.md` C-1,
    C-2). Follow the 0.5 design now, but build the dock and More so that's a small change.
  - The reviewer also reads S0's game changes once (`git diff 0d9fc5a 19928b8 -- src`, about 400 lines; the
    harness's last re-reviews never ran). Then set the S0 requirements (CONST-004, GEN-013, MKT-016, PERSIST-009 to
    PERSIST-013, PERSIST-015) to `GREEN`.
- **Decide:** ask the owner before building the boot rules: which links skip the title screen, what a reload does,
  and what the loading card shows (§6.4). The harness's review recommended: a deep link is a hash that names a real
  screen; an empty, `#/` or unknown hash shows the title; a reload returns to the title; the loading card shows an
  indeterminate bar with the time away. Also NAV-014's not-found copy, if §6.5 and §16 don't give it.
- **Decided (2026-10-06):**
  - The owner's answers are ADR-0019: a link to a real screen skips the title and opens the latest save behind the
    loading card; **a reload (or a return through history) reopens this tab's aquarium at the address**, not the
    title; the loading card's bar loops; the not-found toasts' wording.
  - Values the requirements left open: panel and Settings sheets on a portrait phone start at 64 px ± 2 and the tank
    card at 118 px ± 2; the More sheet's top at 48 % of the height (tests allow 45-51 %); "Link copied" for 4 s (the
    test allows up to 6 s).
  - `?dev=1` allows the developer tools for that session only (PLAT-005) and no longer switches the dev panel on by
    itself, as NAV-009 A4 assumed: e2e and QA scripts open the game with `?dev=1`, and dev mode unlocks every
    destination, which would change what they test. In such a session the Settings switch turns the panel on.
  - The More tab follows §5.2: it opens the More sheet, and while it is highlighted (the sheet or a destination
    inside More is open) tapping it returns to the tank view; Back from a tile returns to More. A panel's first tab
    has no URL segment (`#/build` is Build › Tanks). A link opened in a fresh tab gets no synthetic parent entry, so
    Back from it leaves the site; Back into an entry of a game that has ended stays where the player is.
  - Deferred, with reasons in `docs/agent/BACKLOG.md`: B-126 (an e2e run under `/aquarium-go/`) to chunk 3 with the
    service worker; B-182 and B-183 (render) to the next chunk with a render pass; B-178's remaining accessibility
    gaps to chunk 2; DES-002 (harness evidence). WebKit e2e (B-129) is an owner question.

### 2. Shop and genetics (0.5 phase 2)

- **Design:** 0.5 spec §5.2 (the Market rare-stock dot), §7.1 to §7.7, §8, §9, §20.3, and this chunk's parts of §16
  to §19.
- **Build:** shop filters and counts; offer cards; the offer detail's additions (genes, temperament, morph line, the
  from-notification banner); destination fit and buy labels; the gone-offer state; the rare-stock dot; the Genetics
  Lab reveal fix; the new betta genes, strain and rare flags; encyclopedia updates; the §20.3 test updates.
- **Requirements:** GEN-001 to GEN-012, MKT-001 to MKT-015, DES-005, DES-006, ACC-003, PERF-001.
- **Done when:** `genetics-expansion`, `genetics-lab-reveal`, `shop-filters`, `offer-genes`, `notify-navdots` and
  `shop-filters.spec` pass with everything else; the catalog shows 540 betta entries; existing bettas keep their
  names.
- **Watch:** the new loci add draws to seeded streams, so seeded tests shift: run them before and after and explain
  every changed expectation (`docs/ARCHITECTURE.md`, "Determinism contract"). Rarity tiers (§8.5): run
  `npm run report:rarity` before and after; changing the tier model needs the owner.
- **Decide:** PERF-001's budgets (measure v0.4.0 first and write the numbers here).

### 3. Automation and notifications (0.5 phase 3)

- **Design:** 0.5 spec §7.8, §10 and §12, and this chunk's parts of §16 to §20.
- **Build:** the tank card's Automation section; Auto-feed meals a day; the Auto Water Changer (equipment kind and
  label, data, the extracted water-change core `water/change.ts`, `runWaterChanger`, salt, staff interplay, the alerts
  row) and its Supplies row; `GameEvent.offerId` on rare-stock events; Settings › Notifications (categories, quiet
  hours, the permission flow, the test notification); web delivery with `public/sw.js`; the Alerts drawer footer;
  click routing.
- **Requirements:** AUTO-001, AUTO-003 to AUTO-011, AUTO-016 to AUTO-018, AUTO-022, AUTO-023, AUTO-026, NOTIFY-001
  to NOTIFY-010, DES-007, DES-009, ACC-004 (the automation and notification switches), PERSIST-006 (the water-lab
  hours).
- **Done when:** `automation-*`, `notify-rules`, `notify-offer-events`, `automation.spec` and `notifications.spec`
  pass, and the existing water, care and staff tests (`fix-water-*`, `staff-*`) and the determinism and step-size
  tests stay green.
- **Decide:** NOTIFY-002's quiet-hour boundaries; the Unsupported callout copy (DES-009, NOTIFY-006: ask the owner);
  the automation step-size tolerances (state them in the tests).

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
- No new dependencies without asking the owner.
