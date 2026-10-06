# design-intake-3 — DESIGN-S3D intake re-review (DESIGN_INTAKE.md step 4)

- **Role:** design-intake (`docs/agent/prompts/ROLE_PROMPTS.md`), a fresh reviewer instance after the repair. I wrote
  none of SPEC.md, INTAKE.md or design-intake-2.md.
- **Date:** 2026-10-06.
- **Also:** the OPERATIONS.md §10 sign-off on the diff to be recorded with `protect.mjs --update --adr ADR-0014`.

## What I reviewed

- **Worktree:** `/home/claude/work/rev-intake3`, detached at candidate `563abd9`; base `3ee0f5f`, its parent.
- **Diff** (`git diff 3ee0f5f 563abd9`, 3 files): new `docs/agent/design/DESIGN-S3D/INTAKE.md` (658 lines); new
  `docs/agent/evidence/S0/reviews/design-intake-2.md` (164 lines, the first intake review, YELLOW); one line of
  `docs/agent/design/DESIGN_REGISTRY.json` (DESIGN-S3D `"status": "RECEIVED"` → `"UNDER_REVIEW"`). Nothing outside
  `docs/agent/` changed, so the code tree is the base's: src `88afcb3`, tests `0191724`, the same trees as at `70917e3`,
  where INTAKE says it read the code.
- **Read in full:** INTAKE.md, SPEC.md, design-intake-2.md, ADR-0014, ADR-0016, DESIGN_INTAKE.md, the intake template,
  the registry, ROLE_PROMPTS.md. **By section:** master §2, §3, §7-§9 (S3 and S4), §18, §40, §43-§45; OPERATIONS §2,
  §7, §10, §11; 0.5 spec §5, §6, §7.8, §10-§12, §17-§20; ARCHITECTURE.md (time, UI conventions); BACKLOG B-135, B-145,
  B-167, B-176; the two adversarial owner questions C-14 and C-15 cite. **Requirements:** every id INTAKE cites or
  changes, all AUTO and NOTIFY ids, and a per-id diff of REQUIREMENTS.json from `70917e3` to the base.
- **Code and tests:** every file a new or changed row cites, at the cited lines, plus what the search for missing
  conflicts needed: `src/sim/staff/work.ts`, `src/sim/care/index.ts`, `src/ui/common/notify.ts`, `src/sim/context.ts`,
  `src/persistence/hash.ts`, `src/ui/panels/market/Supplies.tsx`, `src/ui/hud/TopBar.tsx`, `src/ui/styles/hud.css`,
  `src/ui/hud/eventLinks.ts`, `tests/e2e/ui-layout.spec.ts`, `tests/e2e/hud-layout.spec.ts` and the fix-hud unit tests.
- **Earlier INTAKE:** I diffed INTAKE.md against its first version (`cc9208d`, the tree design-intake-2 reviewed)
  to find every changed row: 16 added (C-56 to C-64; AUTO-040 to AUTO-043; the SOC-004, DES-011 and CONST-002
  changes) and 28 changed (name row 17; C-1, C-2, C-4, C-5, C-16, C-21, C-26, C-27, C-36, C-47, C-48, C-49; 15 rows
  of §12).
- **Screens:** all 105 hashes against SOURCE.md; each of the 55 screen/state names mapped to a SPEC section; 17 PNGs
  opened: `settings-notifications-automation` (both), `more-normal-phone`, `operations-overview-normal-desktop`,
  `operations-overview-early-phone`, `operations-map-animals-desktop`, `operations-feed-normal-desktop`,
  `operations-lines-paused-by-you-desktop`, `operations-issues-locked-before-desk-phone`, `home-room-view-desktop`,
  `alerts-manual-on-desktop`, `alerts-salt-low-phone`, `market-supplies-home-grown-desktop`,
  `market-supplies-salt-sizes-desktop`, `build-facility-water-desktop`, `livestock-production-royal-desktop`,
  `research-facility-late-desktop`.
- **Not read:** `HANDOFF.md`, `LEDGER.jsonl`, builder reports, commit messages (see Limitations).

## Commands and exit codes

| # | Command (from the worktree root unless noted) | Exit | Result |
|---|---|---|---|
| 1 | `git status`; `git log --oneline -3`; `git diff --stat 3ee0f5f 563abd9` | 0 | Clean tree; 3 files: INTAKE.md +658, design-intake-2.md +164, registry 1 line changed |
| 2 | `git diff 3ee0f5f 563abd9 -- docs/agent/design/DESIGN_REGISTRY.json` | 0 | Only the DESIGN-S3D `status` line; the file still parses as JSON |
| 3 | `git diff --stat 3ee0f5f 563abd9 -- . ':!docs/agent'`; `git rev-parse` of `src` and `tests` at both commits | 0 | Empty; src `88afcb3`, tests `0191724` at both |
| 4 | `sha256sum screens/*.png` compared with SOURCE.md (`python3 -I`, scratchpad) | 0 | 105 of 105 match; none missing, none extra |
| 5 | `node scripts/agent/protect.mjs` | 1 | Exactly the 2 expected errors: `DESIGN_REGISTRY.json changed without a recorded approval`, `DESIGN-S3D/INTAKE.md is not recorded`; nothing else |
| 6 | `node scripts/agent/diff-check.mjs` | 0 | `diff-check against 0d9fc5a…: clean (0 untracked file(s) checked)` |
| 7 | `node scripts/agent/diff-check.mjs --base 3ee0f5f` | 0 | clean |
| 8 | `node --test 'scripts/agent/*.test.mjs'` | 0 | 149 tests, 149 pass, 0 fail |
| 9 | `node scripts/agent/check-state.mjs` | 1 | The same 2 protected-file errors; 8 warnings: detached HEAD is not `main`, and 7 gates recorded on code tree `3e9ce488ab`, not `9beda1a3e7` |
| 10 | Scratch clone at `3ee0f5f`: `node scripts/agent/check-state.mjs` | 0 | `OK` with the same 8 warnings, so the candidate adds only the 2 errors (the diff is under `docs/agent`, which the code tree leaves out, `evidence.mjs` L17) |
| 11 | Scratch clone at `563abd9`: `protect.mjs`, then `protect.mjs --update --adr ADR-0014`, then `protect.mjs`, then `check-state.mjs` | 1, 0, 0, 0 | `recorded 169 protected files (2 changed) under …ADR-0014…`, then `OK` twice. PROTECTED.json adds INTAKE.md (`562bf67d…`), moves the registry hash `6f28cf3d…` → `c138a136…` and changes `approvedBy` from ADR-0017 to ADR-0014 |
| 12 | `cmp` of the committed design-intake-2.md with the first reviewer's copy in `/home/claude/work/rev-intake` | 0 | Byte-identical; SHA-256 `a59cb46f…` |
| 13 | Style check of INTAKE.md (`python3 -I`, scratchpad): trailing spaces, final byte, CR and tabs, cell counts per table row, prose width | 0 | 0 trailing spaces; ends with one newline; no CR or tabs; 11 tables, 0 rows with a wrong cell count; no prose line over 120 characters |
| 14 | Requirement checks (`python3 -I`): duplicates, family maxima, the 28 new ids, the ids of the 14 "(change)" rows; per-id diff `70917e3` → `3ee0f5f` | 0 | No duplicates or collisions; the new ids are the next free numbers; every changed id exists; the base added PERSIST-015, CONST-005 and AUTO-015 A5 and changed PERSIST-003, PERSIST-007 and NAV-017 |

Not run: `npm test`, `npm run typecheck`, `npm run build`, `npm run e2e` (no `node_modules`, npm installs blocked; the
diff is documentation only) and any browser check (sandbox).

## Checks

1. **design-intake-2's findings** (table below). F1-F8, F10 and F12 are resolved; F9, F11 and F13 partly. Of the info
   items, I2, I5 and I6 are resolved, I1 partly, I3 is outside this diff and I4 is the orchestrator's. All ten
   "conflicts INTAKE.md missed" are now rows: C-16 corrected in place, C-56 to C-64 new.
2. **New and changed rows.** Real and correctly sourced. I checked about 90 file:line citations, among them
   `Dock.tsx` L33-44, L49-66, L155, L158; `hud.css` L204-206, L364-370, L376, L523, L650, L653-657, L665, L668;
   `panels.css` L9-13, L46-55; `tokens.css` `--z-panel` 40 and `--z-toast` 70; `ui-layout.spec.ts` L29-55;
   `helpers.ts` L157-160; `boot.spec.ts` L23-29; `save.spec.ts` L14, L69; `time.ts` L12, L44; `tanks.ts` L76;
   `migrations.ts` L303; `TankCard.tsx` L275, L398, L415; `Supplies.tsx` L41, L77-90, L125, L163-185;
   `work.ts` L44, L50, L60-71, L456-528 (L503-508, L511-518), L697-728, L770-788, L830-846, L856-868, L879-889;
   `water/step.ts` L436-437, L500; `StaffTab.tsx` L379-386; `catalog.ts` L151, L163; `growth.ts` L21-26;
   `clutch.ts` L589-610; `listings.ts` L249-251; the species files' L74, L81, L86 and L94; `Sheet.tsx` L17, L63-79;
   `PanelHost.tsx` L45-56, L96, L112-135, L180, L210; `world.ts` L28-37, L62-88; and TEST_IDS L14, L26, L30, L72, L142,
   L148, L149, L157, L185, L186, L215, L216, L227. Every one says what INTAKE says, and the requirement and 0.5 texts
   the new rows quote (SOC-004 A2 and A4, DES-011 A1-A2, CONST-002 A1 and A3, NOTIFY-006 A2, NAV-004 A1, AUTO-012 A1-A2,
   0.5 §5.3, §12.3, §17) match. C-60's arithmetic (dock about 166-858 px at 1024, two chips from about 776 px) follows
   from the CSS. The resolutions are sensible. "Needs owner?" is wrong in two places (C-23 and C-45, R1 and M7), and
   the owner question undersells C-63 (R2) and leaves out C-38's new copy (R3). I judged the other "No" rows that touch
   owner-visible layout (C-5, C-56, C-59, C-60, C-61, C-62, C-64) acceptable: each follows an owner decision already
   made, fills a width or state SPEC doesn't draw, or makes SPEC's own rule hold (§3 "never colour alone", §5.6's
   labels, §9.2's "each tank's lights-on"), without changing anything drawn or loosening a requirement.
3. **Conflicts still missing.** Seven, each MINOR (M1-M7 below), two of them needing the owner for copy and one for a
   loosened criterion.
4. **§12.** The 28 new ids are free and the next numbers: NAV-020 to 023 (max 19), AUTO-030 to 043 (max 29), MKT-017,
   PROD-019 to 021, NOTIFY-012, DES-013 and 014, ACC-006, PERF-004, and PERSIST-016 (PERSIST-015 exists at the base, so
   016 is right; the "pending" wording is stale, N1). Each criterion is testable; DES-014 (browser QA) and AUTO-038
   ("prices come from data") are the weakest. The 14 "(change)" rows name existing ids. Gaps: AUTO-015 A5 and AUTO-016
   A1 need change rows (M1, M7), HARNESS-003 changes at approval (N2), and some normative behaviours still lack a
   specific home (R5).
5. **Owner questions.** INTAKE.md:585-590 names exactly the 20 rows marked Yes (C-1, C-2, C-6, C-14, C-15, C-16, C-21,
   C-22, C-26, C-27, C-28, C-29, C-33, C-34, C-36, C-37, C-48, C-57, C-58, C-63); 44 rows are No, 64 in all. It should
   gain C-23 (R1) and AUTO-016 (M7), word C-63 as behaviour and copy (R2) and carry M2's and M6's copy with C-48.
6. **Names (§9).** Re-verified 42 of the 64 rows, including changed row 17: rows 1-5, 9-19, 30-32, 36-42, 44-53, 55-58,
   60 and 62, against `src/data/**`, `src/types/**`, `src/sim` and `src/ui`. None is wrong; the tally (36 match, 20 new,
   3 designed elsewhere, 5 mismatches: rows 1, 38, 39, 47, 49) recounts exactly.
7. **Registry and guards.** The registry diff is only the DESIGN-S3D status (command 2). protect.mjs shows exactly the
   two expected errors, diff-check exits 0, the harness tests pass, check-state adds nothing but those two errors, and
   the recording dry run succeeds (commands 5-11).
8. **Style.** Clean (command 13).

## design-intake-2's findings: status

| design-intake-2 | Status | Where INTAKE.md handles it, and what I checked |
|---|---|---|
| F1 (MAJOR) | Resolved | :7-8 (S4 in "Slices affected"), :83, :212-215, :517 (C-1), :572 (C-56), :601 (NAV-020: 10 items at S3 in both modes), :640 (SOC-004: A2's order, A4's 11 and 10, A1), :641 (DES-011). SOC-003, SOC-004 and SOC-011 are S4 and read as quoted; INTAKE also corrects the first review's "A3" to A4. Wording nit N4. |
| F2 (MAJOR) | Resolved | :84, :127-129, :573 (C-57, owner for the subtitle), :623, :625, :637. The phone board does show the "app" callout under "This phone"; NOTIFY-001 A2, NOTIFY-006 A2 and NOTIFY-011 A1 rule it out. |
| F3 (MAJOR) | Resolved | :108-109, :149, :532 (C-16 keeps AUTO-012 A1-A2: the ATO and the mixer stop with a shortage; "Yes, with C-15"), :607, :631, :587. See N7 on how C-15 presents the options. |
| F4 (MINOR) | Resolved | :38, :132, :225-228, :518, :574 (C-58), :638 (NAV-004 A1 at 334 px), :641 (DES-011 A2). 0.5 §5.3 (L237) and §17 (L1364) read as quoted. |
| F5 (MINOR) | Resolved | :486, :488, :575 (C-59), :601 (NAV-020 names both edits), :642 (CONST-002). |
| F6 (MINOR) | Resolved | :216-222, :520, :576 (C-60), :604 (NAV-023 at 981-1440 px), :502. Still an estimate, as the note says. |
| F7 (MINOR) | Resolved | :521 (C-5), :577 (C-61), :615 (AUTO-040), :503. `ui-layout.spec.ts` measures only the Market panel, so it stays as is. Nit N3. |
| F8 (MINOR) | Resolved | :479, :565 (C-49), :578 (C-62). |
| F9 (MINOR) | Partly | :97, :506, :579 (C-63), :607, :609, :619 handle it, but the owner question treats C-63 as copy only (R2). |
| F10 (MINOR) | Resolved | :174-176, :563, :580 (C-64), :615, :626. The Animals board confirms coloured dots and arrows only. |
| F11 (MINOR) | Partly | AUTO-040 to AUTO-043 (:615-618) give the four areas the first review named a testable home; other behaviours still have none (R5). |
| F12 (MINOR) | Resolved | :77 (the §3.8 row). Nit N6. |
| F13 (MINOR) | Partly | C-21, C-26 and C-36 are now "Yes: the copy, with C-48" (:537, :542, :552), C-48 approves them (:564), and C-26's source and wording are corrected (`work.ts` L503-518). C-38 has the same pattern (R3). |
| I1 (INFO) | Partly | :15 names `70917e3` as the base. The candidate's base is `3ee0f5f` (same code trees, so the code citations hold), whose REQUIREMENTS.json added AUTO-015 A5 (M1); :595 still calls PERSIST-015 pending (N1). |
| I2 (INFO) | Resolved | :391 (`catalog.ts` L151 and L163), :543 (`src/sim/life/growth.ts` L21-26). |
| I3 (INFO) | Not addressed | Outside this diff: HARNESS-003 A1 (REQUIREMENTS.json:3673) still says PENDING_OWNER_DESIGN at the base (N2). |
| I4 (INFO) | Orchestrator's | Not an INTAKE item: the ledger event for the status change is due when the diff is recorded. Not checked (ledger unread). |
| I5 (INFO) | Resolved | No prose line over 120 characters (command 13). |
| I6 (INFO) | Resolved | :564 (C-48: "You restock it from the Market" before there's a stock manager). |
| Missed conflicts 1-10 | Resolved | 1 → C-56, 2 → C-57, 3 → C-16, 4 → C-58, 5 → C-59, 6 → C-60, 7 → C-61, 8 → C-62, 9 → C-63, 10 → C-64, each with the first review's owner judgement (C-63's question: R2). |

## Findings

| ID | Severity | Where | Finding | Proposed fix |
|---|---|---|---|---|
| R1 | MINOR | INTAKE.md:539 (C-23), :538 (C-22), :631, :585-590; REQUIREMENTS.json:1814 (AUTO-013 A2) | C-23 rewrites AUTO-013 A2 from "capped by storage capacity" to "bounded by shelf life or capacity" and is marked "No", so the owner list leaves out a loosened acceptance criterion. C-22's option (c), "nothing expires", would leave home-grown live food with neither shelf life nor a cap, failing A2 in either wording, and C-22 doesn't say so. | Mark C-23 "Yes, with C-22", and say in the C-22 question that (c) needs a storage cap (new design) or the owner's waiver of A2. |
| R2 | MINOR | INTAKE.md:579 (C-63), :589-590 | The owner question lists C-63 under copy only, but C-63 also changes behaviour SPEC specifies: the mixer's start conditions (SPEC §9.2) and the salt problem items (§9.8) apply only while salt water is needed, and Supplies shows salt once a Water room exists. | Ask "C-63 the salt machinery in a freshwater-only facility (behaviour and copy)". |
| R3 | MINOR | INTAKE.md:554 (C-38) | C-38 replaces SPEC §11's ladder copy ("Specialty Shop (42 of 100 reputation)") with new requirement wording ("list what is really missing, the way `missingParts` does") and stays "No": the pattern the first review's F13 fixed for C-21, C-26 and C-36. | Route C-38's strings through C-48. |
| R4 | MINOR | INTAKE.md:209, :615 (AUTO-040), :617 (AUTO-042), :625 (DES-014); SOURCE.md:17; ROLE_PROMPTS.md:37; 0.5 spec:1430 | "1440×948" is the desktop board, which includes a 48 px browser bar (in all 12 desktop PNGs I opened, e.g. `operations-overview-normal-desktop.png`). The game viewport on the boards is 1440×900: the e2e default, the browser-QA role's desktop size and DES-011's. A QA run at 1440×948 gives panels 48 px more height than drawn. | Specify a 1440×900 viewport, compared with the board below its bar. |
| R5 | MINOR | INTAKE.md:599-642 (§12) | F11 is only partly done. No row gives a testable criterion for the alerts drawer's Automation section and its before-Desk variant (SPEC §8.3; AUTO-035 covers only the dots), Build › Facility's facility card, Rooms and room pages (§8.4; AUTO-038 covers machines), the Staff status line (§8.7), the Research Facility section's states (§8.8; AUTO-031 covers the gates), Operations' widths and Expand (§5.2, C-5), the phone tab strip at 390 and 360 px (§5.2, §15) or the More tab's red dot (§5.4). DES-013 and DES-014 check only strings, ids and tokens. | Add these rows at step 6. |
| M1 | MINOR | REQUIREMENTS.json:1858 (AUTO-015 A5); INTAKE.md:97, :631 | Missing conflict: AUTO-015 A5, added in the base, asks step 6 for the design's concrete scheduling criterion; §12 gives none, and SPEC has no schedule editor. | See M1 below. |
| M2 | MINOR | SPEC.md:395-397, :602-603 (§7.6, §8.9), §7.2, §9.6; `src/data/unlocks.ts` L132; `src/sim/staff/work.ts` L607-610; INTAKE.md:564 | Missing conflict: a Water room without a stock manager. | See M2 below. |
| M3 | MINOR | SPEC.md:497-501, :610; `src/ui/panels/market/Supplies.tsx` L113-160 | Missing conflict: Market › Supplies' existing Food list against the new sections. | See M3 below. |
| M4 | MINOR | SPEC.md:473-474; REQUIREMENTS.json:1682 (AUTO-008); `src/sim/context.ts` L18; `src/ui/common/notify.ts` L319-333 | Missing conflict: Recent events for automated jobs. | See M4 below. |
| M5 | MINOR | SPEC.md:648-651, §7.2; `src/sim/staff/work.ts` L463-470, L503-518 | Missing conflict: keepers' top-offs and routine water changes once a Water room exists. | See M5 below. |
| M6 | MINOR | REQUIREMENTS.json:1610 (AUTO-005); SPEC.md §5.4, §8.1, §9.7; INTAKE.md:542 (C-26) | Missing conflict: held Autofeeders and AUTO-005's alert and notification. | See M6 below. |
| M7 | MINOR | REQUIREMENTS.json:1875 (AUTO-016 A1); INTAKE.md:561 (C-45), :612 (AUTO-037); `src/persistence/hash.ts` L18, L64-66 | Missing conflict: C-45's tolerances against AUTO-016 A1's identical `stateHash`; no AUTO-016 change row, and "No" though it loosens A1. | See M7 below. |
| N1 | INFO | INTAKE.md:15, :595 | The base is now `3ee0f5f`. PERSIST-015 exists there, so "held for a pending S0 repair" is stale (PERSIST-016 is still the right id). | Cite `3ee0f5f`; reword. |
| N2 | INFO | REQUIREMENTS.json:3673; INTAKE.md:571 (C-55) | HARNESS-003 A1 lists DESIGN-S3D as PENDING_OWNER_DESIGN, and A3 lists AUTO-002 and AUTO-012 to AUTO-015 as BLOCKED by it; both change at approval. | Add HARNESS-003 (change) to §12 or C-55. |
| N3 | INFO | INTAKE.md:490 | §10.3 names `fix-hud-polish` and `fix-hud-css` but not `tests/sim/fix-hud-toasts.test.ts` L86-98, which pins the toast blocks C-61's new rule must leave alone (0.5 §20.3, NAV-018 A1). | Add it. |
| N4 | INFO | INTAKE.md:601 (NAV-020), :638 (NAV-004) | "(from S4 in both modes)" reads as if no dock-width check ran at S3, and the NAV-004 change doesn't say "from S3". | "at S3, and from S4 in both modes"; "A1, from S3". |
| N5 | INFO | INTAKE.md:223-224; `src/ui/styles/hud.css` L32-35; `alerts-manual-on-desktop.png` | Only the right cluster is to be checked at 721-1000 px, but the left cluster gains the ~138 px Manual mode pill; in the `1fr auto 1fr` top bar it may reach the centred speed control below about 900 px (estimated). | Check both clusters. |
| N6 | INFO | INTAKE.md:77; master:142-149 | The §3.8 row leaves out "preserve contracts unless the contract change is explicitly approved". | Add it. |
| N7 | INFO | INTAKE.md:531 (C-15) | C-15 cites the adversarial recommendation A, "freshwater stays free" (A's option text tracks only salt water and feed), while C-15 and C-16 propose capacity-limited fresh water and an ATO that stops at empty: option B for top-off once a Water room exists. | Say so in the C-15 question. |
| N8 | INFO | INTAKE.md:636 (PROD-015), :614 (AUTO-039) | "The last seven days" against AUTO-039's "last seven completed days" and PROD-015's 168-hour `weekStartHour` reset; every "this week" figure should use one window. | Name the window; drop the reset. |
| N9 | INFO | INTAKE.md:530 (C-14); `src/sim/water/step.ts` L436-437 | C-14 names the per-tank AWC, but the ATO's draws on the shared fresh reserve also happen inside per-tank, LOD-chunked steps. Settling debt before each job covers both. | Name the ATO too. |
| N10 | INFO | INTAKE.md:566 (C-50); `livestock-production-royal-desktop.png` | The board's Production tab carries an amber dot that SPEC doesn't specify. | Add it to C-50. |

## Conflicts still missing

**M1. AUTO-015 A5 against display-only schedules.** The S0 repair in the base added AUTO-015 A5
(REQUIREMENTS.json:1858): "a schedule the player changes takes effect from the next simulation step, and the
operations control shows each subsystem's schedule; DESIGN_INTAKE.md step 6 replaces this with the approved design's
concrete criterion before AUTO-015 leaves BLOCKED". Master §9 S3-D lists scheduling in Tiers 2 and 5; SPEC shows
schedules (§7.2 Schedule, §7.1 Today) but edits none (INTAKE.md:97), and §12's AUTO-012 to AUTO-015 row (:631) doesn't
replace A5. **Proposed:** AUTO-015 (change), A5: every scheduled job (AWC changes at each tank's lights-on, mixing at
10 AM and 10 PM, cones, jars, doser feeds, Rosa's checks) runs at its game hour at most once per crossing, live and in
catch-up (AUTO-018, AUTO-023); the player's levers take effect from the next step: a tank's lights-on hour
(`TankCard.tsx` L398) moves its AWC change, Auto-feed meals a day (0.5 §10.2) and Hold or Resume per system (AUTO-036);
Water › Schedule and Today (AUTO-043) show each subsystem's schedule. **Owner:** no, as long as those levers count as
schedules the player changes; yes if the owner wants schedules edited in Operations (not drawn, so new design).

**M2. A Water room without a stock manager.** Staff unlock with the Specialty Shop, the same gate as Tier 2
(`unlocks.ts` L132), but hiring a stock manager is optional, and the keepers already word this case ("…, or hire a
stock manager", `work.ts` L607-610). SPEC's shortage copy assumes Rosa: the salt meter's hint (§7.2), the Problems
reasons "Rosa couldn't reorder…" and "Rosa's $150 budget…" with "Raise budget" and "Staff" (§7.6), the notification
"Rosa couldn't reorder salt mix — today's stock budget is spent" (§8.9), and the forecast and "arriving" state (§9.6),
which can't occur without her. Only the Keepers & stock tile (§7.1) and, in C-48, the Dry food rows have a no-manager
case. **Proposed:** without a stock manager the items say no one reorders ("No one reorders salt mix. Buy it, or hire a
stock manager."), offer Buy and "Hire a stock manager" → `#/visitors/staff` instead of Raise budget, show no forecast or
arriving state, and the notification has a matching variant (master §44: copy stays truthful). **Owner:** yes, copy,
with C-48.

**M3. Market › Supplies' existing Food list.** Today's Supplies has one Food section listing every food the animals
eat, with the "all foods" toggle, the eaters lines and a `data-food-row` deep-link target for each
(`Supplies.tsx` L113-160), then Marine salt, Equipment, and Decor & plants. SPEC §8.5 (L497-501) and the boards show new
sections, Live food, For the cultures and Dry food ("one row per Autofeeder food"), while §8.10 (L610) says the rest of
Market is unchanged. Frozen and hand-fed foods (the sample's seahorses and puffers need frozen food; Frozen Bloodworms
are row 15) get no drawn section, and keeping today's list unchanged would repeat the new rows. **Proposed**, as C-7
does for Build › Facility: keep today's Food section below the new sections for every food they don't show, with its
toggle and eaters lines; each food keeps one row and one `supplies-row-<foodId>` target for
`#/market/supplies/:foodId`. **Owner:** no.

**M4. Recent events for automated jobs.** SPEC §8.3 (L473-474) lists hatchery harvests, water changes and salt batches
under Recent events. AUTO-008 (REQUIREMENTS.json:1682, from 0.5 §10.3) has the device's water changes run "with no
counters, messages or toasts". The drawer lists the last 40 log entries (`notify.ts` L319-329) and the log keeps 300
(`context.ts` L18): an event per tank each morning (17 in the sample), plus harvests and batches, would fill the drawer
every morning and push other news out of the log in about two weeks. **Proposed:** one quiet summary event per job run
("Morning water changes · 17 tanks · 49.4 gal", "Cone A harvested · 20 servings"), not toasted and not counted as news
(`notify.ts` L331-333), throttled like `staff.warned`; AUTO-008's silence per device change stays. **Owner:** no.

**M5. Keepers' top-offs and routine changes with a Water room.** SPEC §9.2 (L648-651) moves the AWCs onto the reserves
and keeps "the player's own water change and keepers' urgent changes" on today's sources. It doesn't say where keepers
get water for the top-offs they make on every round (`work.ts` L463-470, `topOff` from the tap, `care/index.ts`
L276-301) or for routine changes on tanks without a running AWC, including after 30 hours of hold under AUTO-011
(`work.ts` L503-518, shelf salt). The flows (§7.2) count only the five ATOs' 3 gal a day. **Proposed:** keepers'
top-offs and routine changes stay on tap water and shelf salt, as their urgent changes do, so the drawn flows hold; say
so in AUTO-032. **Owner:** no.

**M6. Held Autofeeders and AUTO-005.** Manual mode holds the Autofeeders and "keepers feed instead" (SPEC §7.7, §9.7);
the chips tell "Auto-feed held" from "Auto-feed paused" (§8.1); the bell turns amber for either (§5.4). AUTO-005
(REQUIREMENTS.json:1610) raises `alert-autofeed-paused` and an Animal care event when Auto-feed is paused, empty or
failed and a resident's hunger is at least 50. Nothing says whether a held Autofeeder counts, or in what words; if it
doesn't, a tank without a keeper (C-26) goes hungry silently, against master §9 S3-D ("surface shortages").
**Proposed:** a held Autofeeder counts as paused for AUTO-005, worded "Auto-feed is held — feed {name} by hand, or
resume it." **Owner:** yes, copy, with C-48.

**M7. C-45's tolerances against AUTO-016 A1.** AUTO-016 A1 (REQUIREMENTS.json:1875) wants random step sizes to give
"the same automation outcomes and stateHash for each subsystem", and `stateHash` hashes exact float strings
(`hash.ts` L18, L64-66). C-45 (:561) allows reserve gallons to differ by 0.01 gal and AUTO-037 (:612) accepts
"within the stated tolerances"; with ATO draws that follow each tank's own LOD-chunked evaporation
(`water/step.ts` L436-437), the reserves can't be bit-identical across partitions. OPERATIONS §11 already allows
stated tolerances, but §12 has no AUTO-016 change and C-45 is "No". **Proposed:** AUTO-016 (change): A1's identical
`stateHash` covers job counts, markers and stock units; gallons and water values agree within C-45's tolerances, as
OPERATIONS §11 says (or keep A1 whole by integrating the reserves in fixed point from hour anchors). **Owner:** yes,
one line, because it loosens an existing criterion, though OPERATIONS §11 supports it.

## OPERATIONS.md §10 sign-off

**Given**, for recording exactly this diff with `node scripts/agent/protect.mjs --update --adr ADR-0014`:
`docs/agent/design/DESIGN-S3D/INTAKE.md` at SHA-256
`562bf67d68f62af934ddd2b9c9ecc050f137b39c658909d41c55e11dfabac0d0`, and `docs/agent/design/DESIGN_REGISTRY.json` with
only DESIGN-S3D's `status` moved from `RECEIVED` to `UNDER_REVIEW`, at SHA-256
`c138a13642f11ae3ec95a09975b5839b6dd32b3dd270cd243b3c400d23f82659` (was `6f28cf3d…`).

- **Scope.** ADR-0014's "Owner approval" (lines 338-353) covers writing INTAKE.md, setting DESIGN-S3D to UNDER_REVIEW
  and locking those under ADR-0014. `approval` stays `null`; DESIGN-S3C-LINES is untouched.
- **Owner-only files.** None changed. design-intake-2.md sits under `evidence/`, which no protected pattern covers
  (`protect.mjs` L34-54), and is byte-identical to the first reviewer's report (command 12).
- **Dry run.** The update records 2 changed files; protect.mjs and check-state.mjs then pass (command 11). `approvedBy`
  becomes ADR-0014, as with any update under that ADR.

This sign-off is not an approval of the design (only the owner gives that) and not a statement that INTAKE.md is
complete. R1-R5 and M1-M7 should go into a revision before the owner decides or, at the latest, into step 6; a revised
INTAKE.md is a new protected-file change that needs its own recorded update and a fresh intake review. The orchestrator
still records the ledger events: the status change (DESIGN_INTAKE.md step 7) and the intake reviews (step 4,
`record-event.mjs --kind review`).

## Limitations

- **No browser.** C-60's overlap and N5 are estimates from the CSS; browser QA should measure them.
- **No `node_modules`.** No npm gate ran, and I couldn't check that the installed `lucide-react` has every icon SPEC
  names (`Gauge`, `Hand`, `Map`, `Factory`, `ListFilter`, `Droplets`, `Egg`, `Play`).
- **Sampling.** I opened 17 of the 105 PNGs (all 105 hashes checked, all 55 names mapped), verified about 90 citations
  and 42 name rows, and read the 0.5 spec by section.
- **Ledger and handoff.** Not read. protect.mjs and check-state.mjs read the ledger internally; the dry run's ledger
  append went to scratch clones, not this worktree.
- **Commit messages.** My first `git log --oneline -3` printed the subjects of `563abd9`, `3ee0f5f` and `3e66163`. No
  finding relies on them; C-55's claims were checked against the trees (ADR-0014 Accepted and design-intake-1.md ending
  `Verdict: GREEN` at `fb2ce5f`).
- **The first reviewer's worktree.** I read its design-intake-2.md only to compare bytes. That worktree also holds the
  revised INTAKE.md uncommitted (same SHA-256 as the candidate's); I used nothing else from it.
- **Independence.** I am a fresh subagent and saw no builder narrative. My scratchpad sits under the session id that
  ADR-0014's "Owner approval" names (`fba2c9be-…`), so I was started from the session that prepares the intake; I wrote
  none of the files I reviewed.

Verdict: YELLOW
