# Aquarium Go: the build plan

What we're building, in which chunks, and where we are. Update "Next step" and the status table at the end of every
chunk. This file, `AGENTS.md` and `CLAUDE.md` replace the retired agent harness
(`docs/agent/decisions/ADR-0018-retire-the-harness.md`).

## Next step

1. **Chunk 1**, in Claude Code on the Mac, in this repo, on `next`: "Read PLAN.md and build chunk 1."
2. **When the owner has time:** answer the DESIGN-S3D questions (chunk 4 needs the Production ones, chunk 5 the
   rest). Chunks 1 to 3 don't need them.
3. **Optional:** release S0's fixes to players as 0.4.1 (see "Releases").

## Status

| Chunk | What | Status |
|---|---|---|
| 0 | Clean-up: the harness retired, S0's game fixes kept, two flaky e2e tests fixed | Done, 2026-10-06 |
| 1 | Navigation, links and the platform layer | Next |
| 2 | Shop and genetics | Not started |
| 3 | Automation and notifications | Not started |
| 4 | Production lines | Not started; needs the owner's Production answers |
| 5 | Deep automation (S3-D) | Not started; needs the owner's approval of DESIGN-S3D |
| 6 | Social stub, hardening and the 0.5.0 release | Not started |

**Last full test run:** the owner's Mac, 2026-10-06, before chunk 0's e2e fixes: typecheck, unit (1,809 tests),
build green; e2e 45 of 47 (the two failures chunk 0 fixes).

## How a chunk runs

1. `git checkout next && git pull`, and note the commit you start from.
2. Read the chunk's brief below and only the design sections it names (the 0.5 spec is 159 KB). Check
   `docs/agent/BACKLOG.md` for open items in the files you touch; fix the cheap ones and mark them fixed there.
3. Build it in sensible commits, following `AGENTS.md`.
4. Run `npm run typecheck`, `npm test`, `npm run build` and `npm run e2e` on the final code; all four pass (for e2e
   see `CLAUDE.md`). Every 0.5 phase also requires that a v0.4.0 save still loads with no repairs.
5. One fresh reviewer subagent gets the brief and `git diff <start>..HEAD` (not your summary) and reports blockers;
   fix them and re-run the checks.
6. Push `next`, update this file, and tell the owner what to try (`npm run dev`, then http://127.0.0.1:5173).

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
  screen on desktop and phone; Back and Esc behave; a reload shows the title screen; `nav.spec`, `deeplink-boot.spec`,
  `mobile-tabbar.spec` and `mobile-sheets.spec` pass with everything else.
- **Watch:**
  - `src/platform/` is a new top-level layer: add it on purpose to the layer table in `docs/ARCHITECTURE.md` and in
    `tests/sim/core-architecture-boundaries.test.ts`.
  - DESIGN-S3D will later move Settings to a gear and put Operations in the dock and first in More (`INTAKE.md` C-1,
    C-2). Follow the 0.5 design now, but build the dock and More so that's a small change.
  - The reviewer also reads S0's game changes once (`git diff 0d9fc5a 19928b8 -- src`, about 400 lines; the
    harness's last re-reviews never ran). Then set the S0 requirements (CONST-004, GEN-013, MKT-016, PERSIST-009 to
    PERSIST-013, PERSIST-015) to `GREEN`.
- **Decide:** NAV-014's not-found copy, if §6.5 and §16 don't give it (ask the owner).

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

`main` is what players get: a push to `main` deploys GitHub Pages, and Render builds `main` too. To release:

1. a full green run of the four checks on `next`, and the owner has played it;
2. bump `version` in `package.json` and add the `CHANGELOG.md` entry (patch for fixes, minor for features;
   `tests/sim/version.test.ts` checks that the newest entry matches);
3. with the owner's go-ahead, merge `next` into `main` and push `main`.

- **0.4.1 (optional):** S0's stability fixes (`git log --oneline 0d9fc5a..next -- src`): a game step that fails part
  way no longer leaves half its changes, and a failing listener can't make time run away; time already simulated
  isn't simulated again when the tab comes back; equipment no longer breaks during the offline catch-up; resuming a
  save never keeps a catch-up that failed part way; a crafted save can't use built-in object names as ids.
- **0.5.0:** after chunk 6, or earlier by the owner's choice, with later chunks as 0.5.x (§21).

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
