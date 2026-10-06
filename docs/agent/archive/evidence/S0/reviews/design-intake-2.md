# design-intake-2 — DESIGN-S3D intake review (DESIGN_INTAKE.md step 4)

- **Role:** design-intake (`docs/agent/prompts/ROLE_PROMPTS.md`), fresh reviewer; I wrote neither SPEC.md nor INTAKE.md.
- **Date:** 2026-10-06.
- **Also:** the OPERATIONS.md §10 sign-off on the diff to be recorded with `protect.mjs --update --adr ADR-0014`.

## What I reviewed

- **Worktree:** `/home/claude/work/rev-intake`, detached at candidate `cc9208d` (`cc9208dc007a12992a7af0aae696b002a5ac1ba4`);
  base `70917e3`.
- **Diff** (`git diff 70917e3 cc9208d`): new `docs/agent/design/DESIGN-S3D/INTAKE.md` (608 lines) and one line of
  `docs/agent/design/DESIGN_REGISTRY.json` (DESIGN-S3D `"status": "RECEIVED"` → `"UNDER_REVIEW"`). Nothing else.
- **Read in full:** INTAKE.md, SPEC.md, SOURCE.md, ADR-0014, ADR-0016, DESIGN_INTAKE.md, the intake template, the
  registry, ROLE_PROMPTS.md. **By section:** master §2, §3, §7-§9 (S3), §18, §40, §43-§45; OPERATIONS §1-§3, §7, §10,
  §11; 0.5 spec §5, §6, §11, §18-§20 plus targeted reads of §10.3 and §12.3; ARCHITECTURE.md (layering, time, LOD,
  saves, UI conventions); REQUIREMENTS.json (every requirement INTAKE cites, plus scans for dock, More sheet, Supplies,
  salt and test-file rules); TEST_IDS.md lines INTAKE cites; BACKLOG B-135, B-145, B-167, B-176; ADR-0005 decision 3
  and ADR-0015's consequences (targeted). **Code and tests:** every file INTAKE cites, opened at the cited lines.
- **Screens:** 34 of the 105 PNGs opened: `home-normal-desktop`, `more-normal-phone`, `operations-overview-normal`
  (both), `operations-water-normal-desktop`, `operations-feed-normal-phone`, `operations-lines-normal-desktop`,
  `operations-map-normal-desktop`, `operations-map-animals-desktop`, `operations-map-food-desktop`,
  `operations-map-room-sheet-phone`, `operations-issues-out-of-salt-desktop`, `operations-issues-decided-desktop`,
  `operations-manual-on-desktop`, `alerts-out-of-salt-desktop`, `alerts-before-desk-phone`,
  `build-facility-rooms-desktop`, `build-facility-water-phone`, `market-supplies-home-grown-desktop`,
  `market-supplies-salt-sizes-phone`, `livestock-production-new-line-step-2-desktop`,
  `livestock-production-new-line-step-3-phone`, `livestock-production-all-slots-used-desktop`,
  `research-facility-before-desk-desktop`, `research-facility-early-phone`, `visitors-staff-budget-short-desktop`,
  `settings-notifications-automation` (both), `home-room-view-desktop`, `operations-overview-early-desktop`,
  `operations-overview-before-desk-desktop`, `tanks-automation-chips-desktop`, `tank-card-held-desktop`,
  `operations-water-locked-early-phone`, `home-manual-on-phone`.
- **Not read:** `HANDOFF.md`, `LEDGER.jsonl`, builder reports (see Limitations on commit subjects).

## Commands and exit codes

| # | Command (from the worktree root unless noted) | Exit | Result |
|---|---|---|---|
| 1 | `git diff --stat 70917e3 cc9208d` | 0 | 2 files: INTAKE.md +608; DESIGN_REGISTRY.json 1 line changed |
| 2 | `git diff 70917e3 cc9208d -- docs/agent/design/DESIGN_REGISTRY.json` | 0 | Only the DESIGN-S3D `status` line; the file still parses as JSON |
| 3 | `sha256sum screens/*.png`, compared with every SHA-256 in SOURCE.md | 0 | 105 of 105 match; none missing, none extra |
| 4 | `node scripts/agent/protect.mjs` | 1 | Exactly the 2 expected errors: `DESIGN_REGISTRY.json changed without a recorded approval`, `DESIGN-S3D/INTAKE.md is not recorded` |
| 5 | `node scripts/agent/diff-check.mjs` | 0 | `diff-check against 0d9fc5a…: clean (0 untracked file(s) checked)` |
| 6 | `node scripts/agent/diff-check.mjs --base 70917e3` | 0 | clean |
| 7 | `node scripts/agent/check-state.mjs` | 1 | The same 2 protected-file errors; 1 warning (detached HEAD is not `main`, expected in a review worktree); nothing else |
| 8 | Scratch clone at `cc9208d` under the session scratchpad: `node scripts/agent/protect.mjs --update --adr ADR-0014` | 0 | `recorded 168 protected files (2 changed) under docs/agent/decisions/ADR-0014-design-s3d-deep-automation.md` |
| 9 | Same clone: `node scripts/agent/protect.mjs` | 0 | `OK`; the PROTECTED.json diff adds INTAKE.md (`a9ebbd54…`) and moves the registry hash `6f28cf3d…` → `c138a136…`; `approvedBy` unchanged |
| 10 | `git rev-parse 6a42aeb:src 70917e3:src cc9208d:src`; same for `tests` | 0 | All `88afcb3…`; tests trees all `0191724…` |
| 11 | `git diff --stat b243b23 6a42aeb -- src` | 0 | Only `fastMutate.ts`, `migrations.ts`, `offline.ts`, as INTAKE line 15 says |
| 12 | Style: trailing-whitespace grep, final byte, a table checker (`python3 -I`, scratchpad) | 0 | 0 trailing spaces, ends with a newline, no CR or tabs; 11 tables, 0 rows with a wrong cell count |

Not run: `npm test`, `npm run typecheck`, `npm run build`, `npm run e2e` (no `node_modules`, npm installs blocked; the
diff is documentation only) and `node --test 'scripts/agent/*.test.mjs'` (no script changed).

## Checks

1. **Template completeness.** §1-§14 are all present and substantive; the header fields are filled; §13 and §14 are
   correctly "pending". One gap: "Slices affected" names S3 only, but S4 contracts change too (F1).
2. **Screens and states.** All 105 hashes match SOURCE.md. The 55 screen/state names (105 files over phone and
   desktop) each map to a SPEC section (§5.1, §5.5, §5.6, §7.1-§7.8, §8.1-§8.9); I found no exported state that SPEC
   doesn't describe. The 34 screens I opened match SPEC's text. INTAKE §1 and §10 cover every surface they imply. One
   screen carries copy that existing decisions forbid (F2).
3. **Master §8 checklist.** Items 1-10 are done: ADR-0014 in summary, INTAKE §1-§10 in detail (and INTAKE corrects
   ADR-0014 where it was optimistic, e.g. "No conflict found" and the at-risk tests that don't exist). **Item 11
   (contracts and traceability) is not done**, by design: DESIGN_INTAKE step 6 comes after the owner's approval.
   §12 prepares it, with the gaps in F1, F3, F4, F5 and F11.
4. **Names (§9).** I verified 46 of the 64 rows against `src/data/**`, `src/types/**`, `src/sim` and `src/ui`: all 5
   mismatches (rows 1, 38, 39, 47, 49), 33 matches (2-5, 9-15, 17-19, 30-32, 37, 40-42, 44-46, 48, 50-53, 55-57, 60,
   62, 63) and rows 20, 33, 36, 43, 54, 58. No row is wrong. The 36/20/3/5 tally is right. Row 17 has a citation nit
   (I2).
5. **Code claims.** I checked over 100 file:line citations in §1, §3, §4, §5, §7, §8, §10 and §11, across 60-odd
   files. Every file exists and nearly every cited line says what INTAKE says. Exceptions: C-26's source (F13) and two
   nits (I2). The src tree INTAKE read (`6a42aeb`) equals the base's (I1).
6. **Conflicts (§11).** C-1 to C-55 are real and correctly sourced. I opened the source of each code-backed row, and
   INTAKE's arithmetic (C-42's $10.40 and $12.70, the fresh reserve at 147 gal, C-5's 940 px) checks out. The
   resolutions are sensible, and "Needs owner?" is right for most rows; exceptions are F3 and F13. Ten conflicts are
   missing (list below).
7. **§12.** The new ids are the next free numbers and collide with nothing: NAV-020..023 (max 19), AUTO-030..039
   (max 29), MKT-017, PROD-019..021, NOTIFY-012, DES-013/014, ACC-006, PERF-004, and PERSIST-016 per the S0 note. Each
   row has a testable criterion (DES-014's "browser QA against screens/" is the weakest). Missing: changes to SOC-004,
   DES-011, CONST-002, NAV-004 A1 and AUTO-012 A1-A2 (F1, F3-F5); and functional homes for a few normative behaviours
   (F11).
8. **Registry and guards.** The registry diff is exactly the DESIGN-S3D status change. protect.mjs shows exactly the
   two expected errors, diff-check exits 0, and the recording dry run succeeds (commands 4-9).
9. **Style.** Clean (command 12). Four prose lines run slightly past 120 characters (I5).

## Findings

| ID | Severity | Where | Finding | Proposed fix |
|---|---|---|---|---|
| F1 | MAJOR | INTAKE.md:496 (C-1), :565 (NAV-020), :7, :210-211; REQUIREMENTS.json:2797-2803 (SOC-004 A2), :2769 (SOC-003), :355 (DES-011); SPEC.md:838 | **Social arrives in S4, after S3.** SOC-003, SOC-004 and SOC-011 are S4, so during S3 there is no Social dock item in any mode: the S3 dock has 10 items (Operations seventh) in dev and normal builds. NAV-020's "in dev mode 11" and SPEC §15's "11 items … slot 8" therefore can't pass at S3 acceptance. SOC-004 A2 (S4) still requires "… Build · Research · Finances · Encyclopedia · Settings", and A3 counts dock items. DES-011 (S4 browser QA) still judges Production and Settings › Notifications against the 0.5 design. None of these is in §12, and "Slices affected" omits S4. | NAV-020: 10 items in both modes at S3, and 11 in dev mode from S4. Add SOC-004 (change): order "… Shows · Social · Build · Operations · Research · Finances · Encyclopedia", no Settings. Add DES-011 (change): DESIGN-S3D surfaces are judged against DESIGN-S3D. Add S4 to "Slices affected". No owner needed beyond C-1. |
| F2 | MAJOR | `screens/settings-notifications-automation-phone.png`; 0.5 spec:1027; master:1505-1511, :178; REQUIREMENTS.json:2227 (NOTIFY-006 A2); INTAKE.md:77, :119, :585 (DES-014); SPEC.md:601-606 | **The phone Settings › Notifications screen shows the native "app" callout.** It reads "Alerts arrive on this phone, even when the game is closed. They're worked out from your aquarium when you leave." under a "This phone" row. That is 0.5's app variant, which master §44, §3.10 (native deferred) and NOTIFY-006 A2 ("no 'app' variant ships") rule out. INTAKE tells the owner "§3.10 native deferred: Kept" and "the templates are truthful" without listing this. DES-014 then compares the build with these screens. Also, the new category's subtitle promises "manual mode" notifications, but SPEC §8.9 defines templates only for out-of-salt and line paused. | Add a C-row: phones use the web callout and the "This browser" row (NOTIFY-006 A2), and DES-014 excludes that callout from the comparison. Then either add a manual-mode template or drop "and manual mode" from the subtitle (owner: copy). |
| F3 | MAJOR | INTAKE.md:511 (C-16), :510 (C-15), :591; REQUIREMENTS.json:1756-1762 (AUTO-012 A1-A2); SPEC.md:642, :699 | **C-16 quietly rewrites AUTO-012.** C-16 has the ATO fall back to the tap at an empty fresh reserve and raise no shortage, marked "No". AUTO-012 A1 says top-off draws from "a reserve of finite capacity", and A2 says "an empty reserve skips the scheduled job and shows a shortage indicator". SPEC §9.6 counts "water in a reserve" as a shortage. C-16 also contradicts C-15's own recommendation ("limited by prep rate and reserve size"), which is still an open owner question. §12's AUTO-012 change doesn't touch A1-A2: this is the "reworded acceptance criterion" that OPERATIONS §7 asks reviewers to catch. | Either keep AUTO-012: the ATO draws only from the reserve, and at empty it stops and raises the reserve shortage. That case is rare, since prep is 144 gal a day against 53.4 used. Or fold C-16 into C-15 as an owner question and list the A1-A2 change in §12. |
| F4 | MINOR | SPEC.md:154; 0.5 spec:237; REQUIREMENTS.json:475 (NAV-004 A1); INTAKE.md:497 (C-2), :598, :210-211 | The More sheet's top moves from 404 px to 334 px (≈40% instead of 0.5's "about 48%"), outside NAV-004 A1's 48% ± 3%. That would fail S1's mobile-tabbar.spec at S3. Neither C-2's list of replaced 0.5 items nor the NAV-004 change mentions it. Also, INTAKE:210-211's "the sheet's height differ[s]" with five tiles doesn't follow: five tiles in a 3-column grid still make two rows. | Add the height to C-2 and to the NAV-004 change: 334 px ± tolerance with the Operations row. |
| F5 | MINOR | INTAKE.md:497 (C-2), :468-470; REQUIREMENTS.json:42-49 (CONST-002 A1, A3) | INTAKE proposes edits to `tests/e2e/helpers.ts` (`openPanel` for Settings) and `boot.spec.ts` (add Operations and the gear). CONST-002 A3 allows diffs to these e2e files only where a requirement names the change, and A1 names `helpers.openPanel` for settings. §12 names neither change. | Name both edits in NAV-020 or a new row, and add CONST-002 (change) to §12. Per master §18 rule 13, no assertion may weaken. |
| F6 | MINOR | INTAKE.md:204-207, :499 (C-4); `src/ui/styles/hud.css`:364-365, :368-370, :376, :653-654, :657 | **"No new collision" for the room-view chips is likely wrong below 1400 px.** The comparison is with the four tank-view chips, but those go icon-only below 1400 px, while the room chips keep their labels at every width. At 981-1180 px the centred dock may be as wide as 100% − 2·edge − 300 px. My estimate at 1024 px: dock ≈175-850 px; the two labelled room chips (≈220 px) start at ≈795 px, so they overlap; today's single chip starts at ≈890 px. The 0.5 dock-width checks only run at 1400-1600 px, in the tank view. | Add room-view dock/chip checks at 981, 1024, 1180 and 1280 px. If they touch, hide the room chips' labels below a breakpoint (keeping `aria-label` and `title`) or lift the group as at ≤980 px. |
| F7 | MINOR | SPEC.md:160-163; INTAKE.md:500 (C-5); `src/ui/panels/panels.css`:10-13; `src/ui/styles/hud.css`:204; `tests/e2e/ui-layout.spec.ts`:29-55 | The full-width Map (1408 px), and C-5's "expand to full width", reach under the HUD's left column and the desktop toast stack (fixed at the top left, z-index `--z-toast`). `--pn-max-w` was designed to avoid both. The ui-layout contract is "panels are ≤600px … toasts stay clear of them". Operations' own toasts (Hold all, Bought, Set up) would land on the Map's top-left area. | While a full-width panel is open, move the toasts to the bottom band or the right corner (as `.has-left-sheet` does), and record the layout-contract exception in C-5 or ACC-006. |
| F8 | MINOR | SPEC.md:641, :257, :312, :396, :427; `src/sim/time.ts`:44; `src/sim/tanks.ts`:76; `src/persistence/migrations.ts`:303; 0.5 spec:906 | Every water-change time in SPEC and on the boards is 8:00 AM ("each tank's lights-on"). The repo's default lights-on hour is 7:00 (`DEFAULT_LIGHTS_ON = 7` for new and repaired tanks); 0.5's `onHour ?? 8` is only a fallback. A default facility would show 7:00 AM, and the Day 38 and Day 41 timelines would shift. §9 caught the keepers' rounds (row 47) but not this. | The fixtures set `lighting.onHour = 8` on every tank, or the copy derives the hour per tank. Note it with C-49. |
| F9 | MINOR | SPEC.md §9.1 (Tier 2), §9.2, §9.8; `src/ui/panels/market/Supplies.tsx`:163; `src/sim/staff/work.ts`:770-788 | **A Water room with no salt tanks is unspecified.** A freshwater-only facility (a betta player at a Specialty Shop) gets a Salt Mixing Station with every Water room. It would then show a salt reserve, "Salt low/out · Needs you" items, red tile borders and bell alerts, or mix 8.2 kg of salt to fill 60 gal it never uses. Meanwhile Supplies hides the salt row without a salt tank, and Rosa orders salt only for salt tanks. Not drawn and not in C-48. | The mixer, the salt meter and the salt problem items apply only while a salt tank or a hatchery needs salt water. Supplies shows the salt row once a Water room exists, and Rosa's mixer-based order counts real use. Word the freshwater-only Water tab under C-48 (owner: copy). |
| F10 | MINOR | `screens/operations-map-animals-desktop.png`; SPEC.md:366, :797; INTAKE.md:164-165, :542 (C-47), :586 | On the Animals layer, which line a quarantine or keeper tank serves is shown only by coloured dots, and the routes only by line-coloured arrows. Coral against gold, and blue against aqua, are hard to tell apart with colour-blindness. C-47 covers only the fresh and salt pipes. | Extend C-47 and ACC-006: tiles name their lines in text ("Cambodian · Royal Blue"), and arrows carry a label or pattern. |
| F11 | MINOR | INTAKE.md:563-599 (§12); SPEC §5.5, §7.1 (Today), §7.3 (Saved this week), §7.5, §8.1, §8.2 | **Some normative behaviours have no testable home in §12.** Only DES-013 (strings and ids exist), DES-014 (tokens) and the broad "AUTO-012 to AUTO-015 … point to SPEC §7 and §9" cover these: the HUD manual-mode pill (shown while any system is held, opens `#/operations/manual`, amber time pill on phones); tank-row and tank-card chips (tones by state, reason line and Why, held notes, "· water from the Water room"); the Map's layers, desktop selection details, phone room sheets and "+{n} more"; the Today list; and Saved this week. | Add rows at step 6 (e.g. Map; chips and held notes; the HUD pill; Today and Saved this week), each with a testable criterion. |
| F12 | MINOR | INTAKE.md:64-77; master:140-153; 0.5 spec:967 | The §2 table of hard owner decisions skips master §3.8. S3-D needs core-owned edits: the world-level facility job in `src/sim/world.ts` (C-14; 0.5 §11.3 already asks for core sign-off on the `world.ts` hook), `repairState`, `SCHEMA_VERSION` (C-44, PERSIST-016) and `src/types/game.ts`. | Add a §3.8 row: minimal, mapped to requirement ids, independently reviewed, stronger regression coverage. |
| F13 | MINOR | INTAKE.md:516 (C-21), :521 (C-26), :531 (C-36) vs :543 (C-48); `src/sim/staff/work.ts`:502-508 | **"Needs owner?" is inconsistent for new player-facing copy.** C-21 ("$265"), C-26 (a new toast) and C-36 (the no-line caption) propose new copy and are marked "No", while C-48's copy is "Yes". C-26 also cites `work.ts` L456-528 for "keepers resume routine changes 30 h after the AWC last ran"; that 30-hour rule is AUTO-011 (S3-A, not built). Today keepers change water on the morning round only when the water report flags it or the 5.4-7-day calendar is due, so "keepers change water on their rounds after a day on hold" overstates it. | Route all new copy through C-48 (owner), and correct C-26's source and wording. |
| I1 | INFO | INTAKE.md:14 | The code was read at `6a42aeb`, which is not an ancestor of the candidate. Its src and tests trees equal the base's (`88afcb3`, `0191724`), so the citations hold at `70917e3`. | Cite the base commit. |
| I2 | INFO | INTAKE.md:374, :522 | Row 17: `FoodForm` is declared at `src/types/catalog.ts` L151; L163 is `FoodDef.form`. C-27's `growth.ts` is ambiguous: it means `src/sim/life/growth.ts`, not `src/sim/aquascape/growth.ts`. | Fix the paths and lines. |
| I3 | INFO | REQUIREMENTS.json:3607-3612 | HARNESS-003 A1 still says DESIGN-S3D is `PENDING_OWNER_DESIGN`. It has been stale since the RECEIVED capture, so this diff didn't introduce it. | For the pending S0 registry repair. |
| I4 | INFO | DESIGN_INTAKE.md:49 | Step 7 asks for a ledger event per status change; the candidate diff has none for RECEIVED → UNDER_REVIEW. I didn't read the ledger. | The orchestrator records it with the protect update. |
| I5 | INFO | INTAKE.md:10, :11, :235, :455 | Four prose lines are 123-125 characters long; there is no written rule. | Optional rewrap. |
| I6 | INFO | SPEC.md:500-501 | "Rosa Duarte restocks it" on Supplies' Dry food rows has no wording for a facility without a stock manager (before the Specialty Shop). | Fold into C-48. |

## Conflicts INTAKE.md missed

1. **S3/S4 dock sequencing and SOC-004** (F1). In S3 the dock has 10 items in both modes. Change NAV-020, SOC-004
   A2-A3 and DES-011 accordingly. Owner: no (follows C-1).
2. **Untruthful notification callout on the phone board, and a category subtitle with no template** (F2, master §44,
   NOTIFY-006 A2). Use the web callout and exclude it from screenshot comparison. Owner: yes, for the subtitle copy.
3. **ATO fallback against AUTO-012 A1-A2 and SPEC §9.6** (F3). Keep AUTO-012, or ask with C-15 and list the change.
   Owner: yes (with C-15).
4. **More sheet height against 0.5 §5.3 and NAV-004 A1** (F4). Add it to C-2 and the NAV-004 change. Owner: covered
   by C-2.
5. **CONST-002 against the helpers.ts and boot.spec.ts edits** (F5). Name them in §12. Owner: no.
6. **Room-view chips against the dock at 981-1180 px** (F6). Add checks at those widths, or icon-only room chips
   below a breakpoint. Owner: no.
7. **Full-width Map against the toast stack and the HUD's left column** (F7). Move the toasts and record the
   exception. Owner: no.
8. **Default lights-on 7:00 against the sample's 8:00 AM changes** (F8). Fixture lights at 8:00, or derived copy.
   Owner: no.
9. **Water room in a freshwater-only facility** (F9). Salt machinery and salt items only when salt water is needed.
   Owner: yes, for copy only.
10. **Colour-only line identity on the Map's Animals layer** (F10). Add text labels. Owner: no.

## OPERATIONS.md §10 sign-off

**Given**, for recording exactly this diff (`docs/agent/design/DESIGN-S3D/INTAKE.md` at SHA-256 `a9ebbd54…`, and
`DESIGN_REGISTRY.json` with DESIGN-S3D moved to `UNDER_REVIEW`, SHA-256 `c138a136…`) with
`node scripts/agent/protect.mjs --update --adr ADR-0014`.

- **Scope.** The diff is exactly the scope the owner approved in ADR-0014's "Owner approval" section: "writing
  INTAKE.md, setting DESIGN-S3D to UNDER_REVIEW, and locking those under ADR-0014".
- **Registry.** Only the status field changed. UNDER_REVIEW is the accurate status ("the intake checks are in
  progress"), and `approval` stays `null`.
- **Owner-only files.** None changed.
- **Dry run.** In a scratch clone the update succeeded with 2 changed files, and verification then passed.

This sign-off is not an approval of the design (only the owner gives that) and not an endorsement of INTAKE.md's
completeness. The owner should read this report with INTAKE.md. F1-F3 should be fixed in an INTAKE revision before the
owner decides or, at the latest, before step 6. A revised INTAKE.md is a new protected-file change and needs its own
recorded update.

## Limitations

- **No browser.** F6's overlap is estimated from the CSS (item widths, `max-width` rules, chip padding), not measured.
  Browser QA should measure it.
- **Icons.** No `node_modules`, so I didn't check that the installed `lucide-react` 1.47.0 has every icon SPEC names.
  `Factory` and `ListFilter` are not imported anywhere today; the others are.
- **Sampling.** I opened 34 of the 105 PNGs, checked 46 of the 64 name rows and over 100 of the citations, and read
  the 0.5 spec by section, not in full.
- **Ledger and handoff.** I read neither `LEDGER.jsonl` nor `HANDOFF.md`. `check-state.mjs` and `protect.mjs` read the
  ledger internally. The dry run's ledger append went to the scratch clone, not this worktree.
- **Commit messages.** While identifying commits, `git log --oneline` displayed commit subjects (including
  `cc9208d`, `70917e3`, `fb2ce5f`, `6a42aeb`), and `git show --stat fb2ce5f` printed that commit's message body. No
  finding relies on them; C-55's claims were checked against the tree (`design-intake-1.md` is committed at `fb2ce5f`
  and `70917e3` and ends with `Verdict: GREEN`).
- **PERSIST-016.** Not flagged, per the stated S0 reservation of PERSIST-015.

Verdict: YELLOW
