# DESIGN INTAKE — DESIGN-S3D

> **Since ADR-0018 (2026-10-06)** the agent harness is retired. The harness files this note cites (the master,
> `OPERATIONS.md`, `HANDOFF.md`, `DESIGN_INTAKE.md`, the registry, `evidence/`) are in `docs/agent/archive/`. What
> still counts: the owner's questions in §11 and the proposals in §12; `PLAN.md` says which chunk needs which.

**Design:** Extended aquarium/aquaculture automation (S3-D)\
**Registry status:** UNDER_REVIEW (`DESIGN_INTAKE.md` step 2; ADR-0014's approved scope covers the move)\
**Captured files:** `docs/agent/design/DESIGN-S3D/` (SPEC.md, screens/ with 105 PNGs, SOURCE.md with SHA-256s; all 105
hashes re-checked on 2026-10-06: 105 match, none missing, none extra)\
**Slices affected:** S3 (S3-D, and S3-C's Production screens per ADR-0014 decision 14). S4's contracts change too
(SOC-004 and DES-011, C-56), and so do NAV-004 (S1) and CONST-002 from S3 on.

How this note was made:
- Read all of SPEC.md, SOURCE.md and ADR-0014; the registry; master §2, §3, §7-§9, §40, §43-§45; OPERATIONS §2,
  §10 and §11; ADR-0005, ADR-0015 and ADR-0016; the 0.5 spec sections SPEC cites (§5, §6, §10, §11, §12, §19, §20);
  the AUTO, PROD, NOTIFY, DES, NAV, ACC, PERF and PERSIST requirements; `docs/TEST_IDS.md`; `docs/ARCHITECTURE.md`;
  and the code and tests cited below. Looked at 14 of the screens to check what SPEC says is drawn.
- Code read at the base commit `70917e3` (src tree `88afcb3`, tests tree `0191724`; first read at `6a42aeb`, which
  has the same trees). SPEC's "repo" facts were taken at `b243b23`. Between the two only `src/game/fastMutate.ts`,
  `src/persistence/migrations.ts` and `src/persistence/offline.ts` changed (ADR-0015), and SPEC cites none of them
  for a name, price or rule.
- Revised on 2026-10-06 after the first independent review (design-intake-2, YELLOW; §13). Each finding was checked
  against the files it cites, and five more screens were opened: both `settings-notifications-automation` boards,
  `more-normal-phone`, `operations-map-normal-desktop` and `operations-map-animals-desktop`.
- Nothing was built or run except reading, hashing and style checks of this note. npm isn't available here, so no
  gate ran.
- "SPEC §n" is `DESIGN-S3D/SPEC.md`, "0.5 §n" is `AQUARIUM_GO_0_5_DESIGN_SPEC.md`, "C-n" is a row of §11 below.

## 1. Affected routes, screens and components

Paths verified at `70917e3`. "None today" means no file exists yet. Those surfaces come from S1 (router, tab bar, More
sheet), S2 (Cambodian morph), S3-A (tank card Automation), S3-B (notifications) or S3-C (production lines).

| Surface | Today (file, verified) | S3-D change | SPEC |
|---|---|---|---|
| Desktop dock | `src/ui/hud/Dock.tsx` `DOCK_ITEMS` L33-44 (10 items, Settings last; `dock-<id>` L155) | `operations` (Gauge) right after Build; Settings leaves; `dock-badge-operations` | §5.1, §5.4 |
| Top bar | `src/ui/hud/TopBar.tsx` (`ClockPill` L124-140, `AlertsButton` L175-218, `TopBar` L220-237) | Gear `hud-settings` between money and bell (desktop); Manual mode pill beside the clock (desktop) or amber time pill (phone), `hud-manual-mode`; bell tone | §5.1, §5.4, §5.5 |
| Alerts drawer | `src/ui/hud/AlertsPopover.tsx` (Tanks section L249-252, "All tanks look healthy." L87, Recent events from L253) | Automation · {n} section on top; before-Desk variant | §8.3 |
| Room view chips | `src/ui/hud/RoomChips.tsx` `RoomViewChip` L27-68 (`camera-room-reset` L54), mounted in `src/ui/hud/GameHUD.tsx` L356-362; `src/ui/styles/hud.css` L167-171, L653-669 | Facility map chip `room-facility-map` → `#/operations/map` | §5.6 |
| Room toggle | `src/ui/hud/TankBar.tsx` `view-toggle` L205-215 | Unchanged | §5.6 |
| Phone tab bar, More sheet | None today (S1, 0.5 §5.2-§5.3; the `'more'` popover is declared but unused, `src/ui/common/shellStore.ts` L8) | Operations is the first More row, `more-operations`; the sheet's top moves up (C-58) | §5.1 |
| Panel host and chrome | `src/ui/panels/PanelHost.tsx` (`PANEL_COMPONENTS` L45-56, `panel-<id>` L180, `PanelSwitcher` L210-249); `src/ui/panels/common/PanelLayout.tsx` (`headerExtra` L42, Expand L43-45); `src/ui/panels/panels.css` (`--pn-w` L9, `--pn-max-w` L13, side sheet L46-55); `src/state/ui.ts` `PanelId` L10-22 | New `operations` panel id; wider desktop widths; Hold all in the header | §5.2 |
| Operations panel | None today (new, for example `src/ui/panels/operations/`) | Overview, Water, Feed, Lines and Map tabs; Problems and Manual mode views; locked pages | §5.2-§5.3, §7 |
| Router | None today (S1 builds `src/ui/nav/`, 0.5 §6.3; nothing in `src/` uses `hashchange` or `location.hash`) | New and changed routes (§6 here) | §6 |
| Settings | `src/ui/settings/SettingsPanel.tsx` (`Sheet` `panel-settings` L502, tabs L511-514; no Notifications tab until S3-B) | Opened from the gear on desktop; Notifications gains a sixth category | §5.1, §8.9 |
| Focus return | `src/ui/common/Sheet.tsx` L60-80 (Settings); `src/ui/panels/PanelHost.tsx` L96, L112-118 (managed panels) | Probably none (C-51) | §13 |
| Tanks panel | `src/ui/panels/tanks/TanksPanel.tsx` (subtitle L56, `tanks-row-<id>` L120, status words L136) | Automation chips, amber reason + Why, new subline, footer | §8.1 |
| Tank card | `src/ui/cards/TankCard.tsx` (`GearTab` L415; no Automation section until S3-A, 0.5 §10.1) | Header chips, held notes, "· water from the Water room" | §8.2 |
| Build › Facility | `src/ui/panels/build/BuildPanel.tsx` `FacilityTab` L862-877; `src/ui/panels/common/FacilityUpgrade.tsx` | "Your facility" card, Rooms, Water room and Live food room pages, machines and upgrades | §8.4 |
| Market › Supplies | `src/ui/panels/market/Supplies.tsx` (food rows L121-153 with `data-food-row` L125, salt L163-185); `src/ui/panels/market/MarketPanel.tsx` | Live food rows (Home-grown), For the cultures, Dry food, 40 kg size, `supplies-row-<id>` | §8.5 |
| Livestock › Production | None today (S3-C, 0.5 §11; Livestock tabs `src/ui/panels/livestock/LivestockPanel.tsx` L27, L159-161) | Line picker, slot caption, + New line and three setup steps, per-line detail | §8.6, §8.6.1 |
| Visitors › Staff | `src/ui/panels/visitors/StaffTab.tsx` `BudgetControl` L366-392 (`staff-budget` L379) | Salt status line under the budget | §8.7 |
| Research | `src/ui/panels/research/ResearchPanel.tsx` (`BRANCH_LABEL` L28, `ResearchCard` L198-270); `src/data/research.ts` | Facility section with three projects | §8.8 |
| Simulation | `src/sim/world.ts` `stepOnce` L62-88; `src/sim/staff/work.ts` (`plannedOrders` L731-791, `stockCheck` L794-870); `src/sim/care/index.ts` (`waterChangeCost` L174-184, `waterChange` L190-218); `src/sim/water/step.ts` (ATO L436-437, `runAutofeeder` L500); `src/sim/economy/purchases.ts` (`buyTank` L247-283, `buySalt` L320-327); `src/sim/economy/finance.ts` (`LEDGER_CAP` L25, `dailyOperatingCost` L85-96) | New jobs (water room, live food, holds, problems, forecast) under `src/sim/`; stock manager rules; purchases; upkeep. S3-C adds `src/sim/production/` (new) | §9 |
| Data and types | `src/types/game.ts` (inventory L831-838, `FacilityState` L668, `LedgerEntry` L633-654, `GameEvent` L796-807); `src/types/catalog.ts` (`FoodDef` L153-175); `src/data/research.ts`; `src/data/unlockKeys.ts`; `src/data/facilities.ts`; `src/data/catalog/foods.ts`; `src/data/catalog/equipment.ts` | New state, catalogs, unlock keys, research projects, line slots | §10 |
| Persistence | `src/persistence/migrations.ts` (`repairState`: inventory L473-479, facility L481-482, research L527-535); `src/persistence/schema.ts` (`SCHEMA_VERSION = 1`, L2) | Validation of new fields; save version (C-44) | §10 |

Routes (detail in §6): new `#/operations` and its six sub-routes, `#/livestock/production/:lineId` and `/new`, and
`#/build/facility/water|food`; widened `#/market/supplies/:foodId` (adds `salt` and `brine_shrimp_eggs`); unchanged
`#/visitors/staff` and `#/settings/notifications`.

Implementation note: SPEC's Lucide `Map` icon shadows the global `Map`, which the code uses widely; import it as
`MapIcon`.

## 2. Comparison with the master constitution

**Product priorities (§2).** The design serves "playable and understandable" (problems first, plain copy),
"correctness" (SPEC §3: automation moves only tracked stock), "individual creatures and breeding" (lines, protected
keepers) and "deterministic systems" (jobs keyed by game hour). The priority under pressure is the first: the aquarium
as the visual hero. Operations is 940 px wide at 1440 and the Map spans the whole screen, so the tank is mostly
covered while they're open (C-5). Nothing is traded away on purpose.

**Hard owner decisions (§3).**

| Decision | DESIGN-S3D |
|---|---|
| §3.1 no remote actions | None needed. |
| §3.5 saves | Optional new state; save version in C-44. |
| §3.7 no new dependencies | None needed: the Map is DOM/SVG, the icons are Lucide (installed). |
| §3.8 core-owned files | Needed, and pre-authorized only if each edit is minimal, mapped to a requirement id, independently reviewed and covered by stronger regression tests: the world-level facility job in `src/sim/world.ts` (C-14, AUTO-037; 0.5 §11.3 already asks for core sign-off on the `world.ts` hook); `repairState` and `SCHEMA_VERSION` (C-44, PERSIST-016, with the security/data reviewer, as PERSIST-006 A4); optional additions to `src/types/game.ts` (new state, C-41's ledger tag, C-43's event marker); `PanelId` in `src/state/ui.ts` (AUTO-030, as SOC-003 A4). None of the gate-defining files §3.8 lists is needed. |
| §3.9 precedence | Matches: SPEC wins over the final boards, which win over the option rows (SPEC header). |
| §3.10 AWC shares the Autofeeder unlock | Kept (Tier 1, SPEC §9.1). |
| §3.10 quiet hours 10 PM-8 AM | Kept (decision 19); the rationale is wrong (C-43). |
| §3.10 locked destinations open locked panels | Extended to locked tabs and views (SPEC §7.8). |
| §3.10 several lines per species | Kept (SPEC §7.4, §8.6, decision 14). |
| §3.10 Social is a local stub | ADR-0005 decision 3 makes it dev-only, and it arrives in S4; SPEC's 11-item dock assumes Social is visible (C-1, C-56). |
| §3.10 native deferred | Kept in SPEC's text (web notifications only), but the phone Settings › Notifications board shows 0.5's "app" callout, which promises alerts while the game is closed (C-57). |

**Design Change Gate (§8).** ADR-0014 ran items 1-10 in summary; this note runs them in detail (§1-§10). Item 11,
contracts and traceability, waits for approval (§12).

**S3 scope (§9).**

| Master item | SPEC | Status |
|---|---|---|
| S3-A maintenance automation | Assumed built per 0.5 §10; SPEC §9.2 changes where the AWC's water comes from once a Water room exists | Covered; per-tank AWC conflicts with shared reserves (C-14) |
| S3-B notifications | Sixth category, quiet hours, routes (SPEC §8.9) | Covered (C-43) |
| S3-C per-line settings: pair, breed, raise, quarantine, keeper tank, running/paused, pause-when-full, never-sell-Prismatic, auto-list, trait keep rules, sale reserve, statistics | Setup step 1 (pair), step 2 (Breed, Raise, Quarantine, Keepers), step 3 (Sort = keep rules, Sell = reserve, Line rules), the line switch, "{n} sold · ${revenue}" | All mapped without new screens, as SPEC §8.6 asked; editing Sort and Sell after Start isn't specified (C-35) |
| Tier 1 assisted care | Autofeeder, AWC, alerts, schedules | Covered |
| Tier 2 logistics: reserves, fresh and salt preparation, capacity, salt use, top-off and water-change scheduling, dashboard, storage and shortage indicators | Water room (SPEC §7.2, §9.2) | Covered; schedules are shown, not edited; a Water room with no salt-water use isn't specified (C-63) |
| Tier 3 feed production: cultures, cycles, storage capacity, consumption, shortages | Hatchery, jars, dosers (SPEC §7.3, §9.3) | Covered; shelf life instead of a storage cap (C-22, C-23) |
| Tier 4 breeding facility: lines, grow-out routing, trait sorting, quarantine scheduling, protected keepers, auto-listing, capacity pausing | SPEC §7.4, §8.6, §9.5 | Covered (C-27 to C-34) |
| Tier 5 operations control: overview, every subsystem's status, bottlenecks and shortages, per-line throughput, scheduling, pause/resume, manual override, weekly economics | Overview, Problems, Lines, Today, Hold all and Resume, This week | Covered (weekly money C-41) |

**Simulation rules (§9 S3-D).**
- Deterministic, game time, not frames: SPEC §9 adds no randomness (§7.2 here).
- Variable step sizes: jobs keyed by scheduled hour are fine; per-tank stepping under LOD breaks the shared-reserve
  order (C-14).
- Bounded offline catch-up: every job runs during catch-up (cap 12 game hours, `src/sim/time.ts` L12).
- Tracked resources, nothing from nothing: salt, eggs, vegetables, live food and money are tracked. Fresh water stays
  free but is limited by prep rate and reserve size (C-15); at an empty reserve the ATO and the mixer stop and the
  shortage shows (C-16).
- Idempotent, last-run markers, no double run after load: SPEC §9.9; markers SPEC §10 leaves out are in §7.5 here.
- Capacity and compatibility: setup step 2 checks water type, temperament and space (SPEC §8.6.1); "places" needs a
  definition (C-30); the global compatibility cache (BACKLOG B-167) must be fixed before automation uses it.
- Protected and Prismatic animals: SPEC §3; "protected" is undefined (C-29) and the Prismatic switch is still open
  (C-28).
- Shortages surfaced, not skipped: SPEC §9.6, §9.8.
- Pure and testable: yes, if the forecast and problem items are pure functions over state (§8).

**Anti-dupe invariants.** SPEC §9.9 covers all eight: jobs keyed by scheduled game hour with persisted markers (one
crossing once, nothing repeated after load), harvests add once and starts consume once (one resource unit once), the
S3-C invariants for creatures, clutches and listings, and AUTO-027 for repair. Missing: the order of a batch finishing
and a batch starting in the same hour (C-18), and cultures that finish while held (C-24).

**Scope (§45).** All four new machine families stay (decision 10); nothing is reduced to switches. AUTO-028 stands.

**Reload (§43).** SPEC is silent; NAV-012 applies: reloading any new route shows the title screen.

**Notifications (§44).** The templates are truthful, but two things aren't: the phone board's callout promises alerts
while the game is closed, and the Automation subtitle promises manual-mode notifications SPEC has no template for
(C-57). SPEC §8.9's rationale mixes clocks (C-43).

**Forbidden or not covered.** Nothing the design asks for is forbidden. It changes approved 0.5 items (Settings in the
dock, the More sheet's height, the Production tiles), which the approval ADR must name (C-2, C-58). The master doesn't
cover the Map, the Problems view or manual mode in detail; they are design-owned.

**Harness note.** `DESIGN_INTAKE.md` step 3 cites master §45 for "names must be reconciled"; the rule is in master §9
S3-D Tier 3 (BACKLOG B-145, open). This note applies the rule wherever it lives.

## 3. Comparison with current product behaviour

What the game does at `70917e3`, and what S3-D changes.

| Area | Today | With DESIGN-S3D |
|---|---|---|
| Navigation | Desktop dock of 10, Settings last (`Dock.tsx` L33-44); no router, tab bar or More sheet (S1) | Operations after Build, Settings to a top-bar gear; Operations first in More on phones; new routes |
| Bell | Number of unread news coloured by the worst tank or news tone, else a tank dot (`TopBar.tsx` L175-217) | Automation items join the tone; Automation section at the top of the drawer |
| Room view | Room toggles `view` between `'tank'` and `'facility'`; its label reads "Tank" in the room view (`TankBar.tsx` L205-215); one chip, Reset view (`RoomChips.tsx`) | Second chip, Facility map; the toggle is unchanged |
| Tanks panel | Every tank as a rich card; subline "{n} aquariums · {n} animals · ${value} estimated value" (`TanksPanel.tsx` L56) | Chips per row; subline "{n} aquariums · {n} animals · {n} young"; footer "{n} more tanks, all healthy" (C-6) |
| Water changes | Player and keepers use tap water; salt tanks (marine, reef and brackish, `isSaltClass`, `src/sim/water/constants.ts` L134) use shelf salt scaled to each tank's target SG (`care/index.ts` L174-218); keepers skip a change that would be short of salt (`work.ts` L511-518) | With a Water room, AWCs take 10% from the reserves at lights-on and use no shelf salt; the player's and keepers' urgent changes are unchanged (SPEC §9.2). Without one, nothing changes (AUTO-010) |
| Top-off | ATO holds the level at 99.5% from an untracked source (`water/step.ts` L436-437) | Draws only from the fresh reserve once a Water room exists, and stops with a shortage while it's empty (C-16) |
| Autofeeder | Dry food only (`foods.ts` L382-384) | Unchanged |
| Live food | Bought in packs: Live Baby Brine Shrimp $8/20, Infusoria Culture $5/15; stock is a count that never expires (`types/game.ts` L832) | Also home-grown; "keeps 1 day/2 days" (C-22) |
| Stock manager | Checks at 9 AM (8 AM for early birds) and 3 PM from skill 3 (`work.ts` L50, L879-889); orders sorted by urgency, foods by days of stock, salt by `have / saltNeed − 1` (L786); salt in 5 kg steps (L830-846) | With a Water room: salt urgency counts days until a change would be skipped, the order follows the mixer (40 kg in the sample), a forecast, and an orders switch |
| Budget control | Slider $0 to the level's max in $5 steps, "Paused" at $0 (`StaffTab.tsx` L382, L386) | Status line about salt; "Raise budget" links here (C-21) |
| Salt purchase | Supplies row "Reef-grade salt mix", 5 and 20 kg (`Supplies.tsx` L169-180); tank card 10 kg (`TankCard.tsx` L275) | "Marine salt mix" in 5, 20 and 40 kg with a status line |
| Research | 20 projects in five branches (`research.ts` L26, L29-60); Locked, Start, In progress, Complete and "Learned through play" states | A Facility branch with three projects (C-39, C-40) |
| Build › Facility | Venue, Tanks and Rent tiles, "View the floor", venue upgrade card (`BuildPanel.tsx` L862-877) | Rooms and machines (C-7) |
| Production | None (S3-C) | Several lines sharing tanks, slots by level, setup flow |
| Notifications | None (S3-B) | Sixth category, Automation |
| Money | Ledger capped at 400 entries (`finance.ts` L25); one nightly bill (L85-96) | Weekly money per line and for supplies and upkeep (C-41) |

**Water and salt sources** (the checklist item BACKLOG B-145 asks for): the existing Auto Top-Off and the Auto Water
Changer draw on the new reserves only once a Water room exists. Without one, keepers, the Autofeeder and the AWC behave
exactly as 0.5 §20.4 requires.

**Dependencies.** S3-D needs S1's router, tab bar and More sheet (0.5 §5-§6); S2's Cambodian morph (not in
`src/data/species/betta.ts` today; 0.5 §8); S3-A's AWC and tank-card Automation section (0.5 §10); S3-B's Settings ›
Notifications (0.5 §12); S3-C's production lines (0.5 §11).

## 4. Accessibility

- **Icon plus word.** SPEC §3 and §13 require it for every status, and the boards follow it ("Salt low" with a warning
  icon, "Running" with a play icon). The tab, dock and bell dots are backed by words: the sub-line "{n} to look at" and
  aria-labels like the dock's (`Dock.tsx` L158).
- **Colour alone.** The Map's fresh (blue) and salt (teal) pipes differ only by colour, and labels like "11 + 4.9" rely
  on order (C-47). On the Animals layer a tank's lines show only as coloured dots, and routes only as coloured arrows
  (C-64).
- **Roles.** Tab strips are `role="tablist"` with arrow keys (ACC-001). Map layers and the line picker are radio
  groups (SPEC §13); "+ New line" is a radio that navigates and is checked on `/new`. Switches are `role="switch"`
  with names such as "Run the Royal Blue line" and "Rosa's orders". The setup stepper marks the current step with
  `aria-current="step"`.
- **Map by keyboard.** Every room, machine and tank is a button (about 100 in the sample); Enter or Space selects and
  deselects. SPEC doesn't say what Esc does while a selection is shown. Proposed: the first Esc clears the selection,
  the next closes the panel.
- **Focus.** SPEC §13 says `Sheet.tsx` focuses `dock-<panelId>`, so Settings needs the gear as its return target. In
  the code, `Sheet` returns focus to the element that opened it while it still exists, and falls back to `dock-<panel>`
  only when that element is gone (`Sheet.tsx` L63-79); managed panels like Operations restore focus in `PanelHost.tsx`
  L96, L112-118. Settings opened from the gear already returns to the gear (C-51).
- **Esc.** Closes sheets, then the panel (0.5 §6.4 item 4, `PanelHost.tsx` L120-135). The setup flow is dropped without
  asking (SPEC §8.6.1).
- **Reduced motion.** No new animation (SPEC §13). Meters and bars must not animate when `reducedMotion` is on
  (`src/state/settings.ts` L18).
- **High contrast and text size.** SPEC doesn't mention them; `highContrast` and `textScale` (0.9-1.3) exist
  (`settings.ts` L22-23). Glass cards, dashed locked tiles and the amber manual-mode fill need the solid high-contrast
  treatment (ACC-002). At text scale 1.3 the five-tab strip scrolls on a 390 px phone (SPEC §5.2 measured 352 px at 1).
- **Touch targets.** At least 44 px for new controls (SPEC §3), except the 0.5 sizes SPEC lists (36 px strips, 40 px
  HUD pills, 38 px camera chips). Map rooms on phone are at least 44 px tall; setup radio rows are 64 px.
- **Announcements.** Hold all and Resume all toasts are `role="status"` (ACC-002); the HUD says "Manual mode" in words
  with `aria-label` "Manual mode is on. Open it".

## 5. Phone, landscape and desktop

- **Phone portrait (390×844).** Drawn for every final screen; the five tabs fit (board
  `operations-overview-normal-phone.png`). At 360 px the strip scrolls with the selected tab in view (SPEC §5.2; not
  drawn).
- **Phone landscape (844×390).** Not drawn (SPEC §18 item 3; C-8).
- **Tablets held upright (721-1000 px).** Bottom sheets with the desktop dock (`BOTTOM_SHEET_QUERY`, `Sheet.tsx` L17),
  while panels treat up to 760 px as phone (`src/ui/panels/common/hooks.ts` L95) and the HUD up to 720 px
  (`MOBILE_QUERY`, `src/ui/common/safe.ts` L88). SPEC doesn't say which Operations layout they get (C-9).
- **Desktop (1440×948).** Drawn. Other widths aren't: SPEC gives fixed widths (940 px, Map 1408 px) while panels today
  are `clamp(460px, 40vw, 600px)` and maximise to `max(--pn-w, min(1180px, 100vw − 500px))` (`panels.css` L9, L13),
  which is 940 px at 1440 (C-5).
- **Dock.** Settings out, Operations in. Social arrives in S4, and then only in dev mode (SOC-003, SOC-004, SOC-011),
  so at S3 the dock has 10 items with Operations seventh in both modes; from S4 dev mode has the drawn 11, with
  Operations eighth (C-1, C-56). The 0.5 dock-width checks (0.5 §5.4, §20.2) are planned for S1 and must cover the
  wider "Operations" label (about 72 px against 60 px) in both modes (C-3).
- **Camera chips.** The room view's two chips keep their labels at every width (`hud.css` L657), while the four
  tank-view chips the dock-width check measures go icon-only below 1400 px (L364-365). Up to 1180 px the dock may be
  as wide as 100% − 2·edge − 300 px (L368-369), so from 981 px to about 1200 px the labelled pair (about 230 px,
  against today's single chip of about 115 px) likely reaches the dock. This is estimated from the CSS, not measured
  (C-60). At 980 px and below the chips sit above the dock (L376). On phones the room chips sit above the dock or tab
  bar (L665) and hide while the guide card is open (L668), so the Facility map chip is out of reach during the guide
  (C-4).
- **Top bar.** The 48 px gear joins money and the bell on desktop. Check the right-hand cluster against the centred
  speed control at 721-1000 px.
- **More sheet.** Drawn with six tiles (Social included). At S3 it has five in both modes (Social arrives in S4, and
  only in dev mode), so the second row has an empty cell. Five tiles still make two rows of three, so the height is as
  drawn. That height is new: the Operations row lifts the sheet's top to 334 px of 844 (about 40%), against 0.5's
  "about 48%" and NAV-004 A1 (C-58).
- **Sheets and the tab bar.** Operations follows 0.5 §5.6 (sheet top 64 px, tab bar above it); the setup flow's
  pinned actions sit above the tab bar (NAV-007).

## 6. Routes, deep links and Back

Every route needs S1's router (0.5 §6.3; C-10). Parse targets use 0.5 §6.3's `Route` shape.

| Route | Parses to (proposed) | Back and Forward | Before its tier, or invalid |
|---|---|---|---|
| `#/operations` | panel `operations`, tab `overview` | push on open | early or before-Desk layout (SPEC §7.1) |
| `#/operations/water`, `#/operations/feed` | tab `water` or `feed` | push per tab | locked page (SPEC §7.8) |
| `#/operations/lines` | tab `lines` | push | early layout |
| `#/operations/map?layer=water\|food\|animals` | tab `map` plus a `layer` query | push for the tab; a layer change replaces the URL | unknown layer → All, URL replaced; no layers early |
| `#/operations/issues`, `#/operations/manual` | tab `overview`, sub-view `issues` or `manual` | push | locked page until the Operations Desk is researched |
| `#/livestock/production/:lineId` | panel `livestock`, tab `production`, target `line:<id>` | push when the line changes | unknown id → not-found state (copy C-48) |
| `#/livestock/production/new` | same, target `line:new` | one entry for all three steps | no free slot → not-found state |
| `#/build/facility/water\|food` | panel `build`, tab `facility`, target `room:<id>` | push | locked room page (copy C-48) |
| `#/market/supplies/:id` | 0.5 row (`food:<id>`), plus `salt` and `brine_shrimp_eggs` (C-12) | push | unknown id opens Supplies with nothing outlined (today's `focusFood`, `Supplies.tsx` L77-90) |
| `#/visitors/staff`, `#/settings/notifications` | 0.5 rows | as 0.5 | Settings comes from the gear on desktop |

- `parseRoute` (0.5 §6.3) returns only `ShopFilters` as query state, so `layer` needs a general query field (C-10).
- Line ids: SPEC's readable ids (`cambodian`, `royal`, `-2`, `new` reserved) against 0.5 §6.2's opaque ids (C-11).
- Reload on any of these shows the title screen (0.5 §6.4 item 2, NAV-012, master §43). Opened from a link with a
  save, the loading card's pill needs labels; proposed "Then: Operations › Water" and "Then: Livestock ›
  Production › {Line name}" (0.5 §6.4 item 3).
- Esc and × close the panel and go to `#/` (0.5 §6.4 item 4). The room view isn't part of the URL, so closing the Map
  returns to the room view, as SPEC §5.6 wants.
- An unknown tab such as `#/operations/foo` opens Overview without a toast (0.5 §6.5). Desktop `#/more` stays a no-op.
- The bell and notifications open `#/operations/issues` from Tier 5 and the problem's own tab before it (SPEC §7.1,
  §8.3, §8.9; C-13).

## 7. Simulation and state assumptions

### 7.1 New state

SPEC §10 proposes optional fields. Intake adds what the screens need and §10 leaves out.

| Field (proposed) | Purpose | From |
|---|---|---|
| `facility.water?` (fresh, salt, caps, prep rate, batch, `lastMixCheckHour`) | Reserves and mixing tank | SPEC §10 |
| `facility.food?` (cones, jars, dosers) | Culture cycles and dosers | SPEC §10; dosers better as tank equipment (C-25) |
| `inventory.brineEggs?` | Egg scoops | SPEC §10; name should match the id `brine_shrimp_eggs` (C-12) |
| `automation?.hold` (five flags, `since`) | Manual mode | SPEC §10 |
| Rosa's orders flag | Stops her orders without setting the budget to $0 | intake (C-21) |
| Live-food lots or harvest hours | Shelf life | intake (C-22) |
| Live food used per day (7 days) | "Saved this week" | intake |
| Per-line "wait" decision | The Problems "Decided" state | intake |
| Quarantine occupancy (tank, batch, until hour) | One batch at a time for 7 days | intake (C-32) |
| Ledger tags or a 7-day automation summary | Weekly money | intake (C-41) |
| `nameIsDefault`, `breedFor` on a line | Naming rule | intake (C-11, C-35) |
| Unlock keys for the three projects | Tier gates | intake (C-39) |
| Line slots per facility level | 1 · 2 · 3 · 4 · 6 · 8 | data in `src/data/facilities.ts` (new field) |
| Machine definitions | Prices, upkeep, unlocks | new type in `src/types/catalog.ts`, new file under `src/data/catalog/` (SPEC §10's "catalog pattern") |
| Event category marker | Automation notifications | intake (C-43) |

### 7.2 Randomness

None new. Yields (20 servings a cone, 15 a jar, 30 gal a batch) and all timings are fixed. Spawning stays random in the
existing breeding sim (`src/sim/life/breeding/systems/bubbleNest.ts` L166, L194, L284), so "ready to spawn" and
"pauses tonight" are forecasts from the pair's state. If randomness is ever needed, it gets its own subsystem stream
(OPERATIONS §11).

### 7.3 Step-size invariance and LOD

- Jobs at scheduled hours (crossings, as `crossings()` in `work.ts` L60-71) don't depend on step size.
- Continuous flows (prep at 6 gal an hour, ATO top-off) must be integrated piecewise between job hours inside a step,
  or a 10 AM draw inside a 0.5 h step sees the wrong level.
- Background tanks are stepped in debt chunks of at least 1 h (the first 12) or 4 h (the rest) (`world.ts` L28-37,
  L68-79). A per-tank AWC (0.5 §10.3 and AUTO-009 put `runWaterChanger` inside `stepTankWaterImpl`) would draw from a
  shared reserve in an order and at times set by focus and LOD, not `state.tankOrder` at lights-on (SPEC §9.2); the
  10 AM mixing check could also run before a lagging tank's 8 AM draw. This is the open owner question on how faithful
  background tanks must be (BACKLOG B-176; C-14).
- Tolerances: OPERATIONS §11 asks each S3 system to state them (C-45).

### 7.4 Offline catch-up

Catch-up is capped at 12 game hours (`src/sim/time.ts` L12) and steps the same world, so every job runs during it.
During the grace period animals get minimal rations without using stock (`types/game.ts` L880-887), but dosers,
Autofeeders and keepers still use it. A culture or batch that ends during catch-up harvests once.

### 7.5 Idempotency across save and load

SPEC §10 has `lastMixCheckHour`, the batch's and each cone's and jar's `startedHour`, and each doser's `lastFeedHour`;
the AWC has 0.5's `water.lab.lastAutoChangeHour` and `lastAutoScrapeHour`. Also needed: harvest clears or advances
`startedHour` in the same atomic step; a `lastFlowHour` for the prep and top-off integration; throttle keys for
automation events (like `staff.warned`). Rosa's checks rely on half-open crossings and atomic `mutateFast`, as today.
AUTO-018 A3 (a save without a marker triggers at most one catch-up action) applies to every new marker.

### 7.6 Anti-dupe

Proposed property tests: salt in equals salt bought; salt out equals 4.1 kg per batch started; eggs out equals cones
started; vegetables out equals jars started; live food in equals harvests plus purchases and out equals doses, keeper
feeds and expiry; each reserve balances; no stock goes negative (AUTO-022).

### 7.7 Job order

SPEC §9.9: water changes, top-off, hatchery cones, jars, doser feeds, salt mixing, shelf check; ties between tanks by
`tankOrder`. Add: a batch finishing runs before the start check of the same hour (C-18); cultures that finish while
held (C-24).

### 7.8 Money

Machine upkeep (Water Prep Station $0.40 a day, Salt Mixing Station $0.30 a day; the hatchery, jars and dosers are
unpriced) joins `dailyOperatingCost` (`finance.ts` L85-96). Purchases use existing ledger categories: salt
`'consumables'` (`purchases.ts` L324), food `'food'` (L313), eggs proposed `'consumables'`. Weekly money needs tags
(C-41).

### 7.9 Save compatibility (master §3.5)

- New fields are optional, tagged and validated by `repairState` only when present; absent fields leave `stateHash`
  unchanged (PERSIST-007). `repairState` keeps unknown keys (`fillNumbers`, `migrations.ts` L242-256) and well-formed
  unknown ids (ADR-0015, D-S0-13). It must also drop doser and line references to tanks or creatures that no longer
  exist, with a note (the PERSIST-006 pattern).
- ADR-0016 decision 2 (a new species or tank tier bumps `SCHEMA_VERSION`) isn't triggered: S3-D adds neither, and "Add
  a quarantine tank" buys an existing 20 Gallon Long (`g20L`, `src/data/catalog/tanks.ts` L11). Its new catalogs are
  machines, one supply and three research projects; older builds keep such unknown ids unchanged (ADR-0016 decision 2,
  keeping ADR-0015 decision 2).
- An older build would still mishandle an S3-D save: it closes an unknown active research project (the PERSIST-003 gap
  in ADR-0015's consequences), and it runs the clock without any S3-D job, so reserves, cultures and lines stall. C-44
  proposes one bump when the S3-D state lands.

## 8. Performance

- Jobs run at hourly crossings. Per world step the cost is the number of due jobs: machines, dosers and the tanks whose
  lights-on hour falls in the step. Fine at any facility size.
- UI derivations are the risk. The loop publishes 4 times a second (`src/game/GameLoop.tsx` L28) and `useGameSelector`
  re-runs every selector on each publish (`src/state/game.ts` L40-42). Rosa's forecast reuses `plannedUsage` and
  `plannedOrders` (`work.ts` L697-791), which walk every creature; Problems, Today, the flows and This week also scan
  state. Compute them once per game hour in the sim, or memoise them on the hour and the save id.
- Weekly money scans at most 400 ledger entries (`finance.ts` L25): cheap.
- The Map is about 100 DOM nodes for the 17-tank sample; bigger facilities cap tiles per area with "+{n} more" (SPEC
  §7.5). Backdrop blur over a 940-1408 px panel is a GPU cost on large screens; the performance reviewer should
  measure it (master §3.2).
- Lists that grow: at most 8 lines; Coming up and Today are short; Shared tanks is bounded by the tanks lines use;
  Problems by systems and states.
- PERF-002's maximum-scale run needs a fixture with every S3-D system on. The open owner question on performance targets
  (a larger facility, phone throttling) still applies.

## 9. Names checked against data

Every player-facing name SPEC uses for a resource, food, piece of equipment, machine, room, research project, facility
level, staff role or name, tank, morph or price, matched to `src/data/**` and `src/types/**` (and the sim or UI file
where the name lives today).

| # | Name in SPEC | Kind | In the repo | Result |
|---|---|---|---|---|
| 1 | Marine salt mix | supply | `inventory.salt` "kg of marine salt mix" (`src/types/game.ts` L833); messages "marine salt mix" (`src/sim/economy/purchases.ts` L324-326) | mismatch: the Supplies row says "Reef-grade salt mix" (`Supplies.tsx` L169) |
| 2 | $3 a kg | price | `SALT_PRICE_PER_KG = 3` (`purchases.ts` L28) | match |
| 3 | 0.036 kg per litre, 3.785 L a gallon | constants | `SALT_KG_PER_LITRE`, `LITRES_PER_GALLON` (`src/sim/water/constants.ts` L41, L21) | match |
| 4 | 5 kg · $15, 20 kg · $60 | pack sizes | `buySalt(d, 5)`, `buySalt(d, 20)` (`Supplies.tsx` L175-180) | match |
| 5 | Tank card 10 kg | pack size | `buySalt(d, 10)` (`TankCard.tsx` L275) | match |
| 6 | 40 kg · $120 | pack size | none | new |
| 7 | Brine shrimp eggs (scoops, tin of 30, $18) | supply | none | new; SPEC uses both `brine_shrimp_eggs` and `inventory.brineEggs` (C-12) |
| 8 | Fresh water, salt water (reserve gallons) | resource | none (tap water is untracked) | new |
| 9 | Micro Pellets ($8, 150) | food | `micro_pellets` (`src/data/catalog/foods.ts` L35) | match |
| 10 | Tropical Flakes | food | `flake_tropical` (`foods.ts` L19) | match |
| 11 | Marine Pellets | food | `marine_pellets` (`foods.ts` L229) | match |
| 12 | Blanched Vegetables ($3, 20) | food | `blanched_veg` (`foods.ts` L277) | match |
| 13 | Live Baby Brine Shrimp ($8, 20; "baby brine" in copy) | food | `baby_brine_live` (`foods.ts` L293) | match; shelf life is new (C-22) |
| 14 | Infusoria Culture ($5, 15) | food | `infusoria_culture` (`foods.ts` L309) | match; shelf life is new |
| 15 | Frozen bloodworms (60 servings, $7) | food | `bloodworm_frozen` (`foods.ts` L99) | match |
| 16 | Micro Pellets for 0.5's "Betta pellets" | food | `micro_pellets` | match (SPEC §17 corrects 0.5) |
| 17 | Dry, frozen and live food | food form | `FoodForm` (`src/types/catalog.ts` L151; `FoodDef.form` L163), `isAutofeederFood` (`foods.ts` L382-384) | match |
| 18 | Autofeeder ($35, dry food only) | equipment | `autofeeder` (`src/data/catalog/equipment.ts` L392) | match |
| 19 | Auto Top-Off ($110; "Top-off" chip) | equipment | `ato` (`equipment.ts` L378) | match |
| 20 | Auto Water Changer ($120, $0.06/day) | equipment | not in `src/`; 0.5 §10.3 `auto_water_changer`, kind `water_changer` | 0.5, not built yet (S3-A) |
| 21 | Water Prep Station (6 gal an hour, $0.40/day) | machine | none | new |
| 22 | Reservoir (150 gal fresh, 60 gal salt) | machine | none | new |
| 23 | Salt Mixing Station (30 gal, 12 h, $0.30/day) | machine | none | new; the Map calls it "Salt mixer" (C-49) |
| 24 | Brine Shrimp Hatchery (cones) | machine | none | new |
| 25 | Infusoria jars | machine | none | new |
| 26 | Live-food doser | machine | none | new (C-25) |
| 27 | Water room | room | none | new |
| 28 | Live food room | room | none | new |
| 29 | Supplies shelf, Breeding, Quarantine & keepers, Gallery, Market (Map areas) | room | nearest: `TankPurpose` (`src/types/game.ts` L414) | new grouping (C-46) |
| 30 | Better Life Support ($250) | research | `life_support_2`, $250, 16 h (`src/data/research.ts` L31) | match |
| 31 | Breeding Programme | research | `breeding_program` (`research.ts` L42) | match |
| 32 | Genetics Lab | research | `genetics_lab` (`research.ts` L43) | match |
| 33 | Central Water Supply ($900 · 1 day) | research | none (`central_water_supply` is free) | new |
| 34 | Live Food Cultures ($1,400 · 2 days) | research | none | new |
| 35 | Operations Desk ($2,400 · 3 days) | research | none | new |
| 36 | Facility (research section) | research branch | the `branch` union has no `facility` (`research.ts` L26) | new (C-39) |
| 37 | Hobby Room (10 AM-9 PM) | facility level | `hobby_room`, open 10, close 21 (`src/data/facilities.ts` L99-114) | match |
| 38 | Specialty Shop "(100 reputation)" | facility level | `specialty_shop` (`facilities.ts` L130); unlock needs 100 reputation and a sale or 4 friend visits (`src/data/unlocks.ts` L126) | mismatch: the gate is more than reputation (C-38) |
| 39 | Aquarium Store "(180 reputation)" | facility level | `aquarium_store` (`facilities.ts` L159); unlock needs the Specialty Shop, 180 reputation, 150 visitors and 4 tanks (`unlocks.ts` L127) | mismatch (C-38) |
| 40 | Public Showroom (10 AM-8 PM) | facility level | `showroom` (`facilities.ts` L193-208) | match |
| 41 | Destination Aquarium | facility level | `destination` (`facilities.ts` L226) | match |
| 42 | Grand Hall | facility level | `grand_hall` (`facilities.ts` L262) | match |
| 43 | Line slots 1 · 2 · 3 · 4 · 6 · 8 | data | none | new |
| 44 | Stock manager, Aquarists | staff roles | `STAFF_ROLES` (`src/data/staff.ts` L25-49) | match |
| 45 | Stock budget: $150 default, $600 max at a Showroom | data | `STOCK_BUDGET.showroom` (`staff.ts` L111) | match |
| 46 | Shelf checks at 9 AM, and 3 PM from skill 3 | rule | `STOCK_CHECKS` and skill ≥ 3 (`src/sim/staff/work.ts` L50, L884) | match (early birds check at 8 AM, L886) |
| 47 | Keepers' rounds at 8 AM and 6 PM | rule | `ROUND_START`: 8, 13, 18, 21; early birds at 7 (`work.ts` L44, L55-57) | mismatch: some tanks also get 1 PM and 9 PM rounds (C-49) |
| 48 | Rosa Duarte, Kofi Mensah, Mei Takeda | staff names | name pools (`staff.ts` L143-154) | match |
| 49 | Joy Mendez | staff name | neither "Joy" nor "Mendez" is in the pools (`staff.ts` L143-154) | mismatch (C-49) |
| 50 | 20 Gallon Long $95 | tank | `g20L` (`src/data/catalog/tanks.ts` L11) | match (tier price; a bought tank costs the kit, C-33) |
| 51 | 10 Gallon $60, 29 Gallon $130, 40 Gallon Breeder $190 | tank | `g10`, `g29`, `g40B` (`tanks.ts` L10, L12, L13) | match |
| 52 | Sample tanks of 5, 10, 20, 29, 40, 55, 75 and 125 gal | tank | `g5` to `g125` (`tanks.ts` L9-17) | match |
| 53 | Royal Blue (betta) | morph | `royal`, "Royal Blue" (`src/data/species/betta.ts` L146) | match |
| 54 | Cambodian (betta) | morph | none today (S2 adds the Cambodian locus, 0.5 §8) | S2, not built yet |
| 55 | Snowflake (clownfish) | morph | `snowflake` (`src/data/species/ocellaris_clownfish.ts` L143) | match |
| 56 | Golden (pea puffer) | morph | `golden` (`src/data/species/pea_puffer.ts` L106) | match |
| 57 | Prismatic | rare variant | `RareVariantKind = 'prismatic'` (`src/types/game.ts` L160) | match |
| 58 | Operations | panel | `PanelId` has no `operations` (`src/state/ui.ts` L10-22) | new |
| 59 | Automation (`auto`) | notification category | none in `src/`; 0.5 §12.2 has rare, care, market, breeding, shows | new |
| 60 | Settings | panel | `settings` (`src/state/ui.ts` L19) | match |
| 61 | Pause when a tank is full, Never sell Prismatic animals, List automatically | line rules | 0.5 §11.1 (not in `src/` yet) | 0.5, not built yet (S3-C) |
| 62 | Larvae, fry, juveniles, young | life stages | `LifeStage` (`src/types/game.ts` L15); clutch stages (L217) | match; the stage timing differs (C-27) |
| 63 | Tank card, Room, Reset view | controls | `tank-card-toggle`, `view-toggle`, `camera-room-reset` | match |
| 64 | Research costs, machine and upgrade prices, egg tin, upkeep | prices | placeholders (decision 17) | new (C-42) |

**Result:** 64 names checked: 36 match, 20 are new, 3 are designed elsewhere but not built yet (rows 20, 54, 61), and
5 are mismatches (rows 1, 38, 39, 47, 49). Only row 1 names a resource differently from the current game; rows 38 and
39 understate an unlock rule, row 47 understates the keepers' schedule and row 49 is a sample name the name pool can't
produce.

## 10. Test ids and screenshots

### 10.1 New test ids (SPEC §14) against `docs/TEST_IDS.md`

| Area | Ids | Check |
|---|---|---|
| Navigation | `dock-operations`, `dock-badge-operations` | Follow `dock-<panelId>` (TEST_IDS L14) and `dock-badge-<panelId>` (L142, L216); no collision. L14's list must drop `settings` and add `operations`. |
| Navigation | `hud-settings`, `hud-manual-mode`, `more-operations`, `room-facility-map` | New; no collision with `hud-*` (money, clock, speed, alerts), 0.5 `more-*` or `room-edge-*`, `room-tank-attn-*` (L186, L227). |
| Panel | `panel-operations`, `ops-tab-<…>`, `ops-hold-all`, `ops-sub` | New; `panel-<panelId>` pattern (L30). |
| Overview | `ops-problems`, `ops-problem-<salt\|line>`, `ops-problems-all`, `ops-all-clear`, `ops-sys-<…>`, `ops-week`, `ops-today`, `ops-early-locked-<…>`, `ops-ladder` | New. The Operations tools tile has two ids (`ops-early-locked-tools` and `ops-locked-tools`); use one (C-53). |
| Water | `water-meter-<…>`, `water-buy-salt`, `water-flows`, `water-schedule`, `water-machines` | New. The `water-` prefix is also the tank card's (`water-status`, L26; 0.5 `water-autoclean-note`); no exact collision. |
| Feed | `feed-hatchery`, `feed-cone-<A\|B>`, `feed-jars`, `feed-jar-<1-4>`, `feed-dosers`, `feed-buy-eggs`, `feed-buy-veg` | New. `feed-now` exists, undocumented (`src/ui/hud/ToolRail.tsx` L241). Cone and jar ids assume fixed counts, but cones and jars can be added (C-53). |
| Lines | `line-row-<lineId>`, `line-toggle-<lineId>`, `line-status-<lineId>`, `line-route-<lineId>`, `lines-capacity`, `lines-upcoming` | New; depend on the line id form (C-11). |
| Map | `map-layer-<…>`, `map-room-<…>`, `map-tank-<tankId>`, `map-details`, `map-room-sheet`, `map-add-qt` | New. |
| Problems | `issues-salt`, `issues-line`, `issues-buy-salt`, `issues-raise-budget`, `issues-add-qt`, `issues-wait`, `issues-none` | New. The arriving state's "Staff" action has no id. |
| Manual | `manual-banner`, `manual-resume-all`, `manual-hold-all`, `manual-row-<…>`, `manual-toggle-<…>`, `manual-rosa`, `manual-still-open` | New. `manual-toggle-<…>` is unfinished: `<water\|salt\|food\|feeders\|lines>`. |
| Around the app | `tank-chip-<…>` | New; repeats on every row, so scope it inside `tanks-row-<tankId>` (L215). |
| Around the app | `alerts-automation`, `alerts-automation-link`, `build-facility-room-<water\|food>`, `build-room-back`, `supplies-row-<foodId>`, `staff-budget-status`, `production-line-<lineId>`, `notify-cat-auto` | New. `build-tab-facility` exists (L157); Supplies rows carry `data-food-row` today (`Supplies.tsx` L125); `notify-cat-auto` follows 0.5 §19's `notify-cat-<id>`; the 0.5 Production ids (`production-toggle`, `production-rule-*`, `production-stage-*`, `production-setup`) stay per selected line. |
| Around the app | `staff-stock-budget` | Same element as the existing `staff-budget` (L72, `StaffTab.tsx` L379): reuse `staff-budget`. |
| Around the app | `research-facility-<id>` | Duplicates the existing card id `research-<researchId>` (L148, `ResearchPanel.tsx` L206): reuse it, and give the section its own id if needed. |
| Accepted additions | `camera-room-reset` | Exists (L185), as SPEC says. |
| Accepted additions | `research-start-<id>` | Exists (L149, `ResearchPanel.tsx` L257); not new. |
| Accepted additions | `ops-next-up`, `ops-next-up-research`, `ops-locked-tools`, `alerts-item-tab-<…>`, `supplies-salt-buy-<5\|20\|40>`, `production-slots`, `production-add-line`, `production-new-step-<1\|2\|3>`, `production-new-pair-<pairId>`, `production-new-tank-<…>`, `production-new-breed-for`, `production-new-name`, `production-new-back`, `production-new-next`, `production-start-line` | New; no collision. |

### 10.2 Screenshots that change

- Existing surfaces: every desktop screen (dock, top bar gear), the room view (second chip), the alerts drawer, the
  Tanks panel, the tank card header, Build › Facility, Market › Supplies, Visitors › Staff and Research; on phones,
  the More sheet. S1's baseline set (DES-002: desktop dock, More sheet) goes stale at S3.
- New surfaces: every Operations screen and state. The references are the 26 final boards, the 16 accepted additions
  and the prototype states in `screens/`, compared during the build (ADR-0014, Verification), except where C-56 and
  C-57 say the build differs (DES-014).
- Fixtures: the boards need fixtures for Day 38 (SPEC §16, with and without the Operations Desk), Day 12 (§16.1), the
  Day 4 early game and a Specialty Shop with a Water room, each with every tank's lights on at 8:00 (C-62). None
  exist yet (the registry in `src/dev/fixtures/index.ts` L11-73 has no S3-D entry).
- `scripts/qa-shots.mjs` only clicks `dock-build` and `dock-market` (L152, L164, L183), so it keeps working.

### 10.3 Existing tests at risk

| Test | Today | Effect |
|---|---|---|
| `tests/e2e/helpers.ts` L157-160 `openPanel` | "await tid(page, \`dock-${panelId}\`).click(); await expect(tid(page, \`panel-${panelId}\`)).toBeVisible();" | `openPanel(page, 'settings')` times out once `dock-settings` is gone. 0.5 §20.4 lists it as must stay green (C-2); NAV-020 names the change, as CONST-002 A3 requires (C-59). |
| `tests/e2e/save.spec.ts` L14 and L69 | "await openPanel(page, 'settings');" then `settings-save` or `settings-quality-low` | Both tests fail at the helper until it uses `hud-settings`. |
| `tests/e2e/boot.spec.ts` L23-29 | "for (const panel of ['tanks', … 'encyclopedia', 'settings']) { const btn = tid(page, \`dock-${panel}\`); if (await btn.count()) {" | Doesn't fail: the `if` skips the missing button, so Settings silently drops out of the error sweep and Operations is never visited. Add both (master §35), as NAV-020 names (C-59). |
| `docs/TEST_IDS.md` L14 | "`dock-<panelId>` \| Bottom dock buttons (… encyclopedia, settings)" | Out of date (step 6). |
| `tests/sim/fix-hud-polish.test.ts` L11-27, L43-47 | Reads `hud.css` blocks and checks `RoomChips.tsx` for `useFacilityOverflow((s) => s.left)` and `.right` | Passes if the chip is added without editing those lines; new chip CSS goes in a new file (NAV-018). Same for `fix-hud-css.test.ts`. |
| `tests/sim/progression-research-owned.test.ts` L102-108 | "if (v.status === 'available' \|\| v.status === 'locked') expect(v.grantsNew.length, v.def.id).toBeGreaterThan(0);" over every project in a 45-day clownfish game | A new project that grants no unlock key fails (C-39). |
| `tests/sim/facility-progression.test.ts` L150-155 | "for (const k of keys) expect(UNLOCK_RULES.some((r) => r.key === k) \|\| viaResearch.has(k)).toBe(true);" | New unlock keys pass only if a project or rule grants them. |
| `tests/sim/playthrough-starters.test.ts` L67, L81; `playthrough-robust.test.ts` L23 | Apart from a short wish list, the bot starts the first project in `RESEARCH` order it can afford three times over (`src/dev/fixtures/playthrough.ts` L752-759) | New projects can change what the bot buys and shift seeded results. Append them at the end of `RESEARCH`; run the seeded suites before and after (OPERATIONS §11). |
| `tests/sim/staff-sim.test.ts` L199-236 | Expects "stock budget is spent" in the log, "ordered by" memos, and nothing bought at a $0 budget | Must stay green: Rosa's new rules apply only with a Water room (C-19); the orders switch must not reuse a $0 budget (C-21). |
| `tests/sim/ui-notify-news.test.ts` L15, `ui-notify-attention.test.ts` L11 | Call `navDots(s, DOCK_ITEMS)` and read `tanks`, `shows`, `market`, `research`, `visitors` | Safe: none reads `settings`. An `operations` dot rule must not change these. |
| Named by SPEC §15 or ADR-0014 but not in the repo | `dock-width.spec` (planned, 0.5 §20.2), More sheet geometry (planned `mobile-tabbar.spec.ts`, `mobile-sheets.spec.ts`), Production tests (planned `production-line.test.ts`), Supplies tests that count salt buttons (none; the buttons have no test ids, `Supplies.tsx` L175-180) | Nothing breaks today; they are new tests that get written with the new behaviour (C-54). |

### 10.4 Tests to add

SPEC §15's unit and e2e lists, plus:
- dock tests in both dev and non-dev modes (SOC-011 A3; the same 10 items at S3, C-56);
- the room view's chips against the dock at 981, 1024, 1180, 1280 and 1440 px (C-60), and toasts clear of a
  full-width Operations panel (C-61);
- reserve allocation independent of the focused tank and LOD (C-14), and job order inside an hour (C-18);
- shelf life as decided (C-22); brackish blending (C-17); the ATO and the mixer with an empty fresh reserve (C-16); a
  freshwater-only Water room, with and without a hatchery (C-63);
- weekly money matching Finances past the 400-entry ledger cap (C-41);
- research grants and the seeded suites before and after (C-39);
- route round-trips for the new rows and the `layer` replace (C-10);
- a migration test if the save version is bumped (C-44);
- screenshots at 844×390, at text scale 1.3 and with high contrast (§4, C-8).

## 11. Conflicts and proposed resolutions

| # | Conflict | Sources | Proposed resolution | Needs owner? |
|---|---|---|---|---|
| C-1 | The dock count assumes Social is visible | SPEC §2 row 2, §5.1, §15 ("11 items with Operations in slot 8"); ADR-0005 decision 3; SOC-011 A1, A3; `Dock.tsx` L33-44 | Social arrives in S4 and stays hidden outside dev mode (C-56), so outside dev mode the dock has 10 items with Operations seventh (at S3 in both modes), and Settings would still fit as an eleventh. Recommend keeping Settings on the gear anyway (one layout; room for Social later); write "after Build" rather than "slot 8"; test both modes. | Yes: confirm Settings moves to the gear in normal builds too |
| C-2 | Approved 0.5 items this design replaces | 0.5 §5.1 and §5.4 (Settings is dock item 11); 0.5 §5.3 (the More sheet about 48% high; C-58); 0.5 §20.4 ("helpers.openPanel at desktop for build/market/settings/shows (dock ids kept)" must stay green); 0.5 §11.1 tiles ("Listed now"; "This week · +$146 · After food and power") against SPEC §8.6 ("Quarantine") and the board ("$369 · 9 sold"); registry `overriddenBy` | Name them in the approval ADR and add `overriddenBy` rows to DESIGN-0.5; change `helpers.openPanel` to use `hud-settings` for Settings (a reviewed helper change that weakens no assertion, named in NAV-020 as CONST-002 requires; C-59). | Yes: the approval ADR names them |
| C-3 | The dock-width test SPEC and ADR-0014 call "at risk" doesn't exist | SPEC §5.1, §15; ADR-0014 gate item 9; 0.5 §20.2 (planned for S1); `tests/e2e/` | S1 writes `dock-width.spec.ts`; S3 re-runs it with the "Operations" label in both modes; if the dock touches the chips, raise the chips' icon-only breakpoint (0.5 §5.4). | No |
| C-4 | Facility map chip details | SPEC §5.6; `hud.css` L653-654 (comment on Reset view: "Its label stays at every width: it is the only chip."), L657, L665, L668; NAV-018 | Both chips keep labels; on phones the chip is hidden while the guide card is open (accepted); new chip styles go in a new CSS file, not the blocks fix-hud tests read; update the comment. The pair's clearance from the dock below 1400 px is C-60. | No |
| C-5 | Operations panel widths | SPEC §5.2 (940 px, Map 1408 px, Expand as on other panels); `panels.css` L9, L13 | At 1440 the drawn width already equals today's maximised width, so Expand would do nothing. Open Operations at `--pn-max-w`, expand to full width, keep the Map full width with Expand hidden; check 1024-1399 px and 1920 px and that the camera still frames the tank. While Operations is full width (the Map, or expanded), the toasts move clear of it (C-61). | No |
| C-6 | The Tanks panel hides healthy tanks | SPEC §8.1 ("The list ends '{n} more tanks, all healthy' with On the map"); board `tanks-automation-chips-desktop.png` (4 rows, "13 more tanks"); `TanksPanel.tsx` L2 and L120 (every tank is a card with its actions) | Collapsing removes 13 tanks' cards and actions from the panel. Recommend keeping every row, problems first, and dropping the footer (or making it "Show {n} more"). | Yes |
| C-7 | Build › Facility content | SPEC §8.4, §8.10; board `build-facility-rooms-desktop.png`; `BuildPanel.tsx` L862-877 | Keep the Venue, Tanks and Rent tiles, "View the floor" and the upgrade card (the only way to move venues); add "Your facility" and Rooms above them. | No |
| C-8 | Phone landscape isn't drawn (SPEC §18 item 3) | SPEC §5.2; ARCHITECTURE.md "UI conventions" (short landscape: full height, compact header, no Expand); `safe.ts` L87-88 | Phone layout and room-level Map at 844×390; about 200 px of content height remains above the tab bar, so the rooms scroll. No new design needed; add 844×390 screenshots to the S3 evidence. | No |
| C-9 | Tablets held upright | `Sheet.tsx` L17; `hooks.ts` L95; `safe.ts` L88 | Desktop content in a bottom sheet with the dock; the room-level Map only under `MOBILE_QUERY`. | No |
| C-10 | Routes need S1's router; the `layer` query | SPEC §6; 0.5 §6.3 (`parseRoute` returns `filters?: ShopFilters` only) | Add SPEC §6's rows to S1's route table; generalise the query so `layer` round-trips with `replaceState`; unknown layer → All. | No |
| C-11 | Line naming rule and route ids (filled in while drawing, SPEC §18 item 4) | SPEC §8.6.1; 0.5 §6.2 ("Real ids are opaque … `ember` as a readable stand-in"); `types/game.ts` L129, L234 (`lineId` already means a breeding-line key) | Keep the naming rule (default "{Species} line" while there's one line, "{Morph} line" after; typed names stay; store `nameIsDefault`). Use stored opaque ids in routes like every other entity (fixtures may use `royal`); keep `new` reserved; call it `productionLineId` in code. | No |
| C-12 | Supply ids in the Supplies route | SPEC §6 (`salt`, `brine_shrimp_eggs` as `:foodId`), §10 (`inventory.brineEggs`); `foods.ts` (no such ids); `types/game.ts` L833 | Reserve `salt` and `brine_shrimp_eggs` as supply ids in the route grammar, with a test that keeps them out of `FOODS`; name the field after the id (for example `inventory.brineShrimpEggs`). | No |
| C-13 | "Why" and "Fix" open the problem's tab before the Desk (filled in while drawing, SPEC §18 item 4) | SPEC §7.1, §8.3, §8.6 | Accept: consistent with decision 20 and the bell; notifications follow the same rule (SPEC §8.9). | No |
| C-14 | Shared reserves under background-tank LOD | SPEC §9.2 ("tank by tank in `state.tankOrder`"), §9.9; 0.5 §10.3 and AUTO-009 (per-tank `runWaterChanger`); `world.ts` L28-37, L68-79; OPERATIONS §11; adversarial owner question "How faithful must unwatched (background) tanks be" (recommendation B); BACKLOG B-176 | A world-level facility job at the scheduled hour settles each tank's sim debt, then allocates and applies changes in `tankOrder`; the per-tank AWC path stays for tanks without a Water room. Needs the owner's answer to the LOD question (recommend B: settle pending time on every action, move and focus change; coarse chunks for idle tanks; stated tolerances). | Yes |
| C-15 | Is water a tracked resource? | Adversarial owner question "Should S3-D make water a tracked, limited resource?" (recommendation A: freshwater stays free); BACKLOG B-145; SPEC §9.2; `water/step.ts` L436-437 | Answer it with the design: water costs nothing, is limited by prep rate and reserve size only once a Water room exists, and nothing changes without one (0.5 §20.4). | Yes |
| C-16 | The ATO (and the salt mixer) when the fresh reserve is empty | SPEC §9.2 (top-offs take fresh water "as needed"; the mixer's start conditions don't include 30 gal of fresh water), §9.6 ("water in a reserve" is a shortage), §9.7 (manual mode never holds the ATO); AUTO-012 A1 (top-off and water changes "draw prepared water from a reserve of finite capacity"), A2 ("An empty reserve skips the scheduled job and shows a shortage indicator until it is refilled"); C-15; `water/step.ts` L436 | Keep AUTO-012 as written (corrected after design-intake-2: a tap fallback would loosen A1-A2). Once a Water room exists the ATO draws only from the fresh reserve; while it's empty the ATO stops, the tank evaporates as one without an ATO does, and the reserve shows a shortage until prep refills it, as SPEC §9.6 counts it. This is rare: prep makes 144 gal a day against 53.4 used in the sample. The mixer starts a batch only with 30 gal of fresh water in the reserve, else it waits and raises the same shortage. The flows chart counts the ATO's draw; manual mode still never holds it. The shortage's wording goes with C-48. | Yes, with C-15: its answer settles this; no separate question |
| C-17 | Brackish tanks and other target salinities | SPEC §9.2 (one salt reserve at SG 1.025, "marine tanks"); `care/index.ts` L174-183 (salt per tank's ideal SG); `constants.ts` L134 (`isSaltClass` includes brackish); `Supplies.tsx` L170 | An AWC on any salt tank blends salt-reserve and fresh-reserve water to that tank's target SG and uses no shelf salt; both flow bars count it. | No |
| C-18 | A batch finishing and starting in the same hour | SPEC §9.2, §9.9; §16 (10 PM: reserve 60, 0.5 gal left) | Finishing and top-up run before the start check; a finished batch waits in the mixing tank while salt mixing is held (SPEC §7.7). | No |
| C-19 | Scope of "food first" | SPEC §2 row 15, §9.6 (only with a Water room); ADR-0014 answer 15 (asked generally); `work.ts` L786 | Change the urgency rule only with a Water room, as SPEC §9.6 says, so `staff-sim` and 0.5 §20.4 hold without one. | No |
| C-20 | Rosa and the cultures' supplies | SPEC §9.6 (shortages include eggs, vegetables, doser live food), §8.5 (only dry food says "Rosa Duarte restocks it"); `work.ts` L697-728 (`plannedUsage` counts keeper meals only) | Add machine and doser use to her plan with the same urgency rule; re-check that the sample's $141 at 9 AM still holds. | No |
| C-21 | Budget control and Rosa's orders switch | SPEC §8.7 ("any whole-dollar amount", "$261 covers"), §9.6; `StaffTab.tsx` L382, L386 ($5 steps); `work.ts` L856-868 (a $0 budget logs "Budget spent" every day) | Add a separate orders flag that keeps the budget and the log quiet; give the slider $1 steps, as SPEC's "any whole-dollar amount" says (or keep $5 steps and name a settable amount, $265, which is new copy); hide "Raise budget" at the level's maximum and say why (new copy). The new strings go with C-48. | Yes: the copy, with C-48 |
| C-22 | Live food shelf life | SPEC §7.3 ("keeps 1 day", "keeps 2 days"), §9.3 ("the same item as a store pack"), §16; `types/game.ts` L832; `catalog.ts` L153-175 (no shelf life) | Options: (a) all stock of the two foods expires, tracked by lot (bought packs then expire too, unlike today); (b) only home-grown lots expire (then they aren't the same item); (c) nothing expires and "keeps" goes. Recommend (a). | Yes |
| C-23 | Storage capacity for feed | Master §9 Tier 3 (examples include storage capacity); AUTO-013 A2 ("capped by storage capacity"); SPEC §9.3 | Amend AUTO-013 A2 to "bounded by shelf life or capacity" (follows C-22). | No |
| C-24 | Cultures that finish while held | SPEC §9.7 ("no harvests, starts or doses; cultures keep growing"; held jobs "skipped, not queued") | A finished cone or jar waits and is harvested once at the first job hour after resume; shelf life counts from harvest. | No |
| C-25 | How dosers are stored | SPEC §10 (`dosers: Record<TankId, …>`); `types/game.ts` L331-346; 0.5 §10.3 (`water_changer` pattern) | Make the doser tank equipment (new kind, label, icon) so it moves and sells with its tank and existing repair code covers it. | No |
| C-26 | Manual mode and tanks without a keeper | SPEC §7.7 ("6 tanks · keepers feed on their rounds"), §8.2; `work.ts` L456-528 (keepers change water on a morning round only when the water report flags it or their 5.4-7-day calendar is due, L503-508, and on any round for ammonia or nitrite, L508; salt tanks use shelf salt, L511-518); AUTO-011 (S3-A, not built: keepers skip routine changes for 30 h after the AWC ran) | Count tanks without a keeper in the row and the toast (new copy; proposed "{n} have no keeper: feed them by hand"). Don't promise water changes on keepers' rounds: while the AWC is held, keepers' routine changes come back after AUTO-011's 30 hours, and only when the report flags it or the calendar is due; urgent changes go ahead on any round. The new strings go with C-48. | Yes: the copy, with C-48 |
| C-27 | Raise timings, life stages and the sell step | SPEC §16 ("raise 12 juveniles day 9/19", "Grow-out B day 15/19", quarantined "juveniles"), §17 item 3 ("5 days as fry plus 14 as a juvenile"); `src/sim/life/breeding/clutch.ts` L594; `src/sim/life/growth.ts` L21-26; `betta.ts` L86, `pea_puffer.ts` L86, `ocellaris_clownfish.ts` L94 (in `src/data/species/`); `src/sim/economy/listings.ts` L249-251; BACKLOG B-135 | Young are minted at about 5.6 days old (betta) and are adult at `juvenileDays` from laying (14 for bettas), so the sample's day-15 "juveniles" and the quarantined ones listed 7 days later are adults, and a juvenile batch listing refuses adults. Derive raise length and stage words from species data, fix the sample, and settle B-135's sell step (recommend: list by each animal's life stage at sale time, adversarial M35). | Yes |
| C-28 | The "Never sell Prismatic animals" switch | SPEC §3 ("never sells a Prismatic"), §8.6; 0.5 §11.1, §11.3; PROD-011 note; B-135 | Still open: what does the switch do when off? Recommend: automation never lists a Prismatic; the switch only chooses between the keep tank and staying with the batch (M35). | Yes |
| C-29 | What "protected" means | SPEC §3, §16 ("3 protected keepers"), the Map's "Protected"; AUTO-019 note; `types/game.ts` L146 (`favorite`) | Recommend: protected = every animal in a line's keep tank, every Prismatic and every favourite; automation never moves them out, lists or sells them. | Yes |
| C-30 | "Places" isn't defined | SPEC §7.4, §7.6 ("12 of 12 places", "the next clutch needs 12 places"), §8.6.1 ("room for 12 young"); `clutch.ts` L607-610 (minting stops at the stocking cap) | Define places from stocking (young of this species at minting size that fit) and "needs" as `maxRaisedPerClutch` (12 for bettas, `betta.ts` L81); the figure shrinks as young grow. | No |
| C-31 | The pea puffer sample can't come from the repo's data | SPEC §16 (Puffer Grow-out "11 young, 11/12"; "11 fry"); `pea_puffer.ts` L74 (clutch 3-10), L81 (at most 6 raised) | Use six or fewer young (or two clutches) in the fixture and the copy. | No |
| C-32 | Quarantine tanks per line | 0.5 §11.2 (`tanks.quarantine: Id`); SPEC §7.4, §7.6, §9.5 (shared quarantine, one batch for 7 days, Quarantine 2 "assigned to the line") | A line lists its quarantine tanks (the first free one takes the batch); keep an occupancy record (tank, batch, until hour). | No |
| C-33 | "Add a quarantine tank · $95" | SPEC §7.5, §7.6, §11 ("Set up · $95", juveniles "move in on Day 42"); `purchases.ts` L223-234 (kit = tier + discounted gear + substrate), L252-259 (fails without floor space), L276 (new tanks aren't cycled) | Show the real kit price (or add a bare-tank purchase); offer seeded media; handle no money and no floor space; validate the tank for the line (AUTO-019); give the restart day only once the tank is cycled or seeded. | Yes |
| C-34 | No way to end a line | SPEC §8.6 (slots 1 · 2 · 3 · 4 · 6 · 8), §8.6.1; nothing drawn or specified | Proposed: "End line" on the line's header card, with a confirm; animals stay where they are; the slot frees; stats stay in history. | Yes |
| C-35 | Setup flow details and `#/livestock/production/new` (filled in while drawing, SPEC §18 item 4) | SPEC §8.6.1; 0.5 §11.1 item 5 (empty state, `production-setup`) | Accept the flow. Add: "Breed for" names the line and seeds the default keep rule, no biology; the Sort and Sell stage cards reopen their editors after Start; the 0.5 empty state's "Set up a line" opens the same route; with no line, the Lines tab shows that empty state and the locked slots. | No |
| C-36 | Slot caption wording (filled in while drawing, SPEC §18 item 4) | SPEC §8.6, §11 | Accept; add the no-line case ("0 of 1 line slot · more at Specialty Shop") and singular or plural by n. The new strings go with C-48. | Yes: the copy, with C-48 |
| C-37 | Buying the rooms and machines | SPEC §2 decision 8 ("bought and upgraded in Build › Facility"), §8.4 ("Faster · $380", "+150 gal · $240"; "Add a cone", "Add a jar" and "Add a doser" without prices), §9.1 (research "Gives" the machines) | Nothing draws or prices the first purchase, sets how many cones, jars and dosers there can be, says which tank a doser goes on, or what the upgrades do. Proposed: finishing the research installs the base room (prep station, 150/60 gal reserves and a mixer; a hatchery with 2 cones and 4 jars); add-ons and upgrades are bought in Build › Facility; dosers are placed from the tank card; the economy lane sets the numbers. | Yes |
| C-38 | Tier gate conditions | SPEC §9.1 ("Specialty Shop (100 reputation)", "Aquarium Store (180 reputation)"), §11 ladder copy; `unlocks.ts` L126-127 | Gate on the facility level (as the projects' `requires` do) and list what is really missing, the way `missingParts` does (`Dock.tsx` L49-66). | No |
| C-39 | New research needs unlock keys and a branch | SPEC §8.8, §10; `research.ts` L20 (`grants: UnlockKey[]`), L26; `ResearchPanel.tsx` L28; `progression-research-owned.test.ts` L108 | Add three keys (for example `water_room`, `live_food_room`, `operations_desk`) granted only by these projects, a `facility` branch and its label; append the projects to `RESEARCH`. | No |
| C-40 | Research Start state (filled in while drawing, SPEC §18 item 4) | SPEC §8.8; `ResearchPanel.tsx` L198-270 (Locked, Start, In progress, Complete, "Learned through play", "One at a time" and "Can't afford" exist; requirements show only while locked) | Reuse the existing states and button; add ticked requirements to the Available state. | No |
| C-41 | Weekly money from the ledger | SPEC §7.1 ("sums of ledger entries … match Finances"), §16; AUTO-015 A3; `finance.ts` L25, L85-96 (one nightly bill for tanks, rent and wages); `types/game.ts` L633-654 (no line or system tag) | Tag sales and automation costs (an optional reference on `LedgerEntry`), post automation upkeep as its own nightly entry, and keep a per-day summary for seven days so the cap can't cut the window. | No |
| C-42 | Placeholders and numbers SPEC can't derive (SPEC §18 item 2) | Decision 17; SPEC §7.3 ("making them cost $15"), §16 ("automation upkeep $16", fresh "148 at 6:40 PM") | Hatchery, jar and doser upkeep are unpriced, so $15 and $16 can't be derived (eggs, salt water and vegetables come to about $10.40 for the week counted on use, about $12.70 counted on what was made). With the ATO's 3 gal a day, the fresh reserve reads 147, not 148, at 6:40 PM. The economy lane sets the numbers, fixtures pin them, tests assert formulas. | No |
| C-43 | Notification rationale and event tagging | SPEC §8.9 ("the forecast warns days ahead, so they wait for the morning"); 0.5 §12.2 (quiet hours on the device clock), §12.6 (only while open and unfocused); ARCHITECTURE.md "Time" (a game day is 4 real minutes); `types/game.ts` L796-807 | Keep decision 19; drop the rationale (game days aren't real days); add a category marker to `GameEvent` for Automation events. | No |
| C-44 | Save version | Master §3.5; ADR-0016 decision 2; ADR-0015 consequences (older builds close an unknown active research project); OPERATIONS §2; `migrations.ts` L242-256, L527-535; `schema.ts` L2 | ADR-0016 doesn't force a bump, but an older build would lose an S3-D research and stall every S3-D job. Bump `SCHEMA_VERSION` once when the state lands, with a migration test, so older builds treat the save as `too_new`; reword PROD-002 A2. OPERATIONS §2 says this needs no separate approval. | No |
| C-45 | Step-size tolerances aren't stated | OPERATIONS §11; AUTO-009 note | Job counts and stock units exact; reserve gallons within 0.01 gal; integrate continuous flows piecewise between job hours. | No |
| C-46 | Bigger facilities on the Map (not drawn, SPEC §18 item 3) and area grouping | SPEC §7.5; `types/game.ts` L414 (`TankPurpose`) | Group by line role first (breed and raise → Breeding; quarantine and keep → Quarantine & keepers), then by `purpose`, the rest → Gallery; cap tiles per area by width, then "+{n} more" (opens Tanks); line tanks always show. | No |
| C-47 | Pipes coded by colour only | SPEC §7.5, §12, §13 | Give salt pipes a second stroke or marker and write "fresh" and "salt" in the labels and the key. The Animals layer's line colours are C-64. | No |
| C-48 | States SPEC names but doesn't word | SPEC §6 (not found), §7.1 (Overview from day one), §8.3, §8.4 ("locked room page"), §8.5 (Dry food rows: "Rosa Duarte restocks it"), every Buy button | Proposed copy: line not found "This line isn't here any more" · "See your lines"; locked room page reuses SPEC §7.8's card ("The Water room isn't built yet" …); no money and no floor space reuse today's messages (`needMoney`, `buyTank`); no line yet reuses 0.5 §11.1's empty state; before Tier 1, a dashed "Assisted care" tile with 0.5 §10.2's hint ("Research Better Life Support, or build husbandry mastery with regular care."); no Automation section in the bell until something is automated; before there's a stock manager (before the Specialty Shop), the Dry food rows say "You restock it from the Market" (as the early map's "You restock from the Market"); the empty fresh reserve (C-16); a Water room with no salt-water use (C-63). The copy C-21, C-26, C-36 and C-63 propose is approved with this row. | Yes: approve the copy |
| C-49 | Strings and names that differ from the repo | SPEC §9.6 against `work.ts` L860 ("Budget spent — {what} wait for tomorrow"); "Marine salt mix" against `Supplies.tsx` L169; "All 17 tanks look healthy." against `AlertsPopover.tsx` L87; keepers at "8:00 AM and 6:00 PM" against `work.ts` L44, L55-57; "Joy Mendez" against `staff.ts` L143-154; "Salt mixer" and "Prep station" on the Map | Use "Marine salt mix" everywhere (rename the Supplies row); fix the repo's "wait" to "waits"; derive round times, and water-change times from each tank's lights-on (C-62); the fixture sets staff names or uses pool names; list the Map's short labels in the copy deck. | No |
| C-50 | Drawn but not specified | Boards: Livestock subline "105 animals · 191 young · 4 lines" (`LivestockPanel.tsx` L150 differs); Research subline "Reputation 412 · Public Showroom" (`ResearchPanel.tsx` L51 differs); "Full" badge on Grow-out B (tank words are Healthy, Watch, Danger, `TankBar.tsx` L116); Room drawn pressed (`TankBar.tsx` L210-214 shows "Tank"); "Look soon" and "Needs you" beside "Watch" and "Danger" in one drawer | Keep the repo's sublines and Room toggle (SPEC says the toggle is unchanged); show "Full" as a line chip, not a tank status; keep both vocabularies with matching icons and tones. | No |
| C-51 | SPEC §13 misdescribes focus return | SPEC §13; `Sheet.tsx` L63-79; `PanelHost.tsx` L96, L112-118 | Focus already returns to the opener (the gear); no special case needed. Correct the text. | No |
| C-52 | Bell tone for a paused Auto-feed | SPEC §5.4 (amber whenever Auto-feed is paused); AUTO-005 (paused and a resident's hunger at least 50); `TopBar.tsx` L175-217 | Follow AUTO-005; fold automation items into today's count-and-dot bell rather than a dot-only model. | No |
| C-53 | Test-id problems | SPEC §14; `TEST_IDS.md` L72, L148, L149; `ToolRail.tsx` L241 | Reuse `research-start-<id>`, `research-<id>` and `staff-budget`; one id for the tools tile; index-based cone and jar ids; finish `manual-toggle-<…>`; scope `tank-chip-*` by row. | No |
| C-54 | Tests at risk that SPEC misses or misnames | SPEC §15; ADR-0014 gate item 9; §10.3 here | Add `progression-research-owned`, `facility-progression`, the seeded playthroughs and `staff-sim`; note that `boot.spec.ts` silently stops visiting Settings instead of failing; treat the missing ones as new tests. | No |
| C-55 | Records out of step | ADR-0014; registry; DESIGN-S3C-LINES `path: null` (PROD-018 A1 needs a path) | Settled at intake for ADR-0014: the orchestrator accepted it for the capture (commit `fb2ce5f`), committed the capture sign-off `docs/agent/evidence/S0/reviews/design-intake-1.md` (GREEN) and moved the registry to `UNDER_REVIEW` with this note. Still open: the approval ADR sets DESIGN-S3C-LINES' status and path (SPEC §7.4, §8.6, §8.6.1). | No |
| C-56 | Social arrives in S4, after S3: the S3 dock and the S4 contracts | SPEC §2 row 2, §3 ("Desktop dock stays at eleven items"), §5.1, §15 ("dock has 11 items with Operations in slot 8"); master §9 S4 ("desktop dock Social; phone More Social"); SOC-003, SOC-004 and SOC-011 (all S4); SOC-004 A2 (the order ends "… Research · Finances · Encyclopedia · Settings"), A4 (fixed dock counts updated to 11); DES-011 (S4: judges the More sheet, tank card Automation, Settings › Notifications and Production against 0.5); `Dock.tsx` L33-44 | At S3 Social doesn't exist in either mode, so the dock has 10 items with Operations seventh, right after Build, and the More sheet has five tiles. From S4 dev mode adds Social (11 items, Operations eighth, as drawn); outside dev mode the dock stays at 10 (C-1). The S3 e2e asserts 10 items in both modes; SPEC §15's "11 items … slot 8" applies from S4 in dev mode. §12 changes NAV-020, SOC-004 (A2's order with Operations after Build and no Settings; A4's count 11 in dev mode and 10 outside it) and DES-011 (DESIGN-S3D's surfaces judged against DESIGN-S3D); "Slices affected" adds S4. | No (follows C-1) |
| C-57 | The phone notifications board promises alerts while the game is closed, and the subtitle promises a notification with no template | `screens/settings-notifications-automation-phone.png` (under a "This phone" row: "Alerts arrive on this phone, even when the game is closed. They're worked out from your aquarium when you leave.", 0.5 §12.3's "app" wording for Granted, §12.1); the desktop board has the web callout and "This browser"; master §44, §3.10 (native deferred); NOTIFY-006 A2 ("no 'app' variant ships"); SPEC §8.9 (subtitle "Shortages, paused lines and manual mode"; templates only for out of salt and a paused line); DES-014 | Phones use the web callout and the "This browser" row, as NOTIFY-006 A2 already requires; DES-014 leaves that callout out of the screenshot comparison. For the subtitle, either add a manual-mode template or drop "and manual mode". Recommend dropping it: manual mode is the player's own action, and SPEC defines no event for it. | Yes: the subtitle copy |
| C-58 | The More sheet's height | SPEC §5.1 ("top at 334px on an 844px phone instead of 404px"); 0.5 §5.3 ("rises to about 48% of the screen height"), §17 ("More top ≈ 48% of height", measured by DES-011 A2); NAV-004 A1 (top at about 48%, proposed ± 3%; S1's `mobile-tabbar.spec`); board `more-normal-phone.png` (six tiles in two rows) | The Operations row lifts the top to about 40% (334 px of 844), outside NAV-004 A1, so S1's test fails at S3 unless NAV-004 changes with it. Add it to C-2's list and to the NAV-004 change (334 px, within the same proposed ± 3%). The tile count doesn't move it: five tiles still fill two rows of three, so at S3 (five tiles in both modes, C-56) the top is as drawn. | Yes, with C-2: the approval ADR names it |
| C-59 | Edits to existing e2e files need a requirement that names them | CONST-002 A1 ("helpers.openPanel still working at desktop for build, market, settings and shows"), A3 (a diff of these test files since the S0 checkpoint only where a requirement names the change); master §18 rule 13; `tests/e2e/helpers.ts` L157-160; `tests/e2e/boot.spec.ts` L23-29; C-2; §10.3 here | NAV-020 names both edits: `openPanel(page, 'settings')` clicks `hud-settings` and waits for `panel-settings`, so `save.spec.ts` passes unchanged; the `boot.spec.ts` sweep adds `operations` and opens Settings from the gear. CONST-002 (change) adds NAV-020 to A3's list and reads A1 with the gear. No assertion is removed or weakened. | No |
| C-60 | The room view's two labelled chips against the dock below 1400 px | SPEC §3, §5.6 (both chips keep their labels); `hud.css` L364-365 (the tank-view chips go icon-only below 1400 px), L368-369 (up to 1180 px the dock's max-width is 100% − 2·edge − 300 px), L376 (at 980 px and below the chips sit above the dock), L653-654, L657; 0.5 §5.4 (dock-width checks only at 1400-1600 px, in the tank view); §5 here | Likely overlap, estimated from the CSS and not measured: at 1024 px the dock spans about 166-858 px and the two labelled room chips (about 230 px) start near 776 px, where today's single chip starts near 892 px. Add room-view checks at 981, 1024, 1180, 1280 and 1440 px (NAV-023). If they touch, lift the room chips above the dock at those widths, as at 980 px and below, which keeps the labels SPEC §5.6 asks for. | No |
| C-61 | A full-width Operations panel against the toast stack and the HUD's left column | SPEC §5.2 (Map 1408 px, "from the left edge to the right edge"); C-5 (expand to full width); `panels.css` L10-13 (`--pn-max-w` keeps panels clear of the HUD's left column and the toast stack); `hud.css` L204 (toasts fixed at the top left, `z-index: var(--z-toast)`, 70, above panels at 40), L205 (only a tank card moves them); `tests/e2e/ui-layout.spec.ts` L29-55 ("panels are ≤600px … toasts stay clear of them") | Operations' own toasts (Hold all, Bought, Set up) would land on the Map's header and tab row. While Operations is full width (the Map, or expanded), move the toast stack to the bottom band or the right-hand corner, as the sheet rules do (`hud.css` L523, L650), in a new rule outside the blocks tests read. The tank bar is covered while the Map is open, as drawn. Record the exception to the ≤ 600 px contract in AUTO-040; `ui-layout.spec.ts` itself is unchanged. | No |
| C-62 | Water-change times: the default lights-on hour is 7:00, the sample's 8:00 AM | SPEC §7.1 ("Done 8:00 AM"), §7.2 ("10% at 8:00 AM (each tank's lights-on)"), §7.6 (Day 41, 8:00 AM), §7.7 ("tomorrow's 8:00 AM change"), §9.2 ("8:00 AM in the sample"); `src/sim/time.ts` L44 (`DEFAULT_LIGHTS_ON = 7`); `src/sim/tanks.ts` L76 (new tanks); `migrations.ts` L303 (repaired tanks); 0.5 §10.3 (`onHour ?? 8` is only a fallback); `TankCard.tsx` L398 (players set the hour per tank) | A default facility changes water at 7:00 AM, and tanks can differ. The fixtures set `lighting.onHour = 8` on every tank so the boards and the Day 38 and Day 41 timelines reproduce; the strings take the time from the tanks' lights-on hours (the next one due), not a fixed 8:00 AM. Noted with C-49. | No |
| C-63 | A Water room in a facility with no salt-water use | SPEC §9.1 (Tier 2 gives every Water room a Salt Mixing Station), §9.2, §9.3 (each cone takes 0.5 gal of salt water), §9.6, §9.8; `Supplies.tsx` L41, L163 (the salt row shows only with a marine or brackish tank, or salt in stock); `work.ts` L770-788 (Rosa's salt order counts salt-class tanks only) | Not drawn: a freshwater-only facility (a betta keeper at a Specialty Shop) would show an empty salt reserve, "Salt out · Needs you" items, red borders and bell alerts, while Supplies hides salt and Rosa never orders it; with a Live food room its cones still need salt water. Proposed: the mixer, the salt meter and the salt problem items apply only while a salt tank or a hatchery needs salt water; Supplies shows the salt row once a Water room exists; Rosa's mixer-based order counts real use, the hatchery included (AUTO-034). The freshwater-only Water tab's wording goes with C-48. | Yes: copy only |
| C-64 | Line identity by colour alone on the Map's Animals layer | `screens/operations-map-animals-desktop.png` (Quarantine 1's two lines shown by a coral and a blue dot; routes as line-coloured arrows); SPEC §3 (never colour alone), §7.5 (Animals layer), §12 (Cambodian coral, Royal Blue blue, Snowflake aqua, Golden gold), §13; C-47 | Coral and gold, and blue and aqua, are hard to tell apart with colour-blindness. Tiles name their lines in text ("Cambodian · Royal Blue"), each route carries a label or pattern, and tile `aria-label`s name the lines. Extends C-47; tested under ACC-006. | No |

Rows C-56 to C-64 are the conflicts the first review found missing (design-intake-2, §13). Its third, the ATO against
AUTO-012, is C-16's own subject, so C-16 is corrected in place rather than repeated.

**Questions for the owner** (the 20 rows marked Yes; one answer settles several): C-1 Settings on the gear in normal
builds; C-2 the 0.5 items this replaces, with the More sheet's height (C-58); C-6 the Tanks panel footer; C-14
background-tank fidelity; C-15 water as a resource, whose answer also settles the ATO at an empty reserve (C-16); C-22
live-food shelf life; C-27 the sell step and life stages; C-28 the Prismatic switch; C-29 "protected"; C-33 the
quarantine tank's price and cycling; C-34 ending a line; C-37 buying rooms and machines; C-48 copy for unworded states,
with the copy C-21, C-26, C-36 and C-63 propose; C-57 the Automation category's subtitle.

## 12. Requirements to add or change

Proposals for step 6, after approval. Ids follow master §40 and the next free numbers in `REQUIREMENTS.json`
(PERSIST-015 is held for a pending S0 repair, so the save row is PERSIST-016). In the Test column, "planned" files are
already named in `REQUIREMENTS.json` or the 0.5 spec but don't exist yet; "proposed" files are new names from this
note.

| ID | Description | Acceptance criterion | Test |
|---|---|---|---|
| NAV-020 (new) | Desktop: Operations (Gauge, `dock-operations`) right after Build; Settings leaves the dock for the gear `hud-settings` (`aria-label` "Settings", pressed while open); phones reach Settings from More. Social arrives in S4 (C-56). Named test edits (CONST-002, C-59): `tests/e2e/helpers.ts` `openPanel(page, 'settings')` clicks `hud-settings`; the `tests/e2e/boot.spec.ts` sweep adds Operations and opens Settings from the gear. | At S3 the dock has 10 items in both modes, Operations right after Build, and no `dock-settings`; from S4 dev mode has 11, with Social before Build and Operations eighth (SOC-004); the gear opens and closes Settings; `save.spec.ts` passes unchanged through the changed helper; dock and camera chips don't intersect at 1400, 1440, 1519, 1520 and 1600 px (from S4 in both modes). | new `tests/e2e/operations-nav.spec.ts` (proposed); S1's `dock-width.spec.ts` (planned) extended; `tests/e2e/helpers.ts`, `boot.spec.ts`, `save.spec.ts` |
| NAV-021 (new) | More sheet: Operations is the first row (`more-operations`, 60 px, Gauge chip, "New" chip, copy-deck sub-line) above the grid. | At 390×844 the row is first, opens `#/operations` and its dot follows SPEC §5.4. | S1's `mobile-tabbar.spec.ts` (planned) extended |
| NAV-022 (new) | SPEC §6 routes: each row parses and formats; `layer` replaces history; Problems and Manual highlight Overview; locked pages answer routes before their tier; unknown line id and `/new` without a free slot show not-found; reload shows the title. | `nav-routes` round-trips each new row; e2e opens each route early (locked) and late; a layer change adds no history entry; reload on `#/operations/water` shows `title-continue`. | `tests/sim/nav-routes.test.ts` (planned, S1) extended; new e2e |
| NAV-023 (new) | Room view: the Facility map chip (`room-facility-map`) beside Reset view opens `#/operations/map`; closing the Map returns to the room view; `view-toggle` is unchanged; both chips keep their labels and clear the dock (C-60). | e2e: room view → chip → Map → close → room view still shown; in the room view the dock and the chips don't intersect at 981, 1024, 1180, 1280 and 1440 px. | new e2e |
| AUTO-030 (new) | Operations panel by tier (SPEC §5.3): early, before-Desk and full Overview layouts; locked pages (SPEC §7.8); status words on tiles; Problems, This week, Today and Hold all only from Tier 5. The `PanelId` edit in `src/state/ui.ts` meets master §3.8 (as SOC-003 A4). | The Day 4, Day 38 without the Desk, Specialty Shop with a Water room, and Day 38 fixtures render the drawn layouts; `#/operations/issues` and `/manual` stay locked until the Operations Desk completes; `boot.spec`, `ui-notify-news` and `ui-notify-attention` stay green. | new `tests/e2e/operations.spec.ts` (proposed); `tests/sim/ui-notify-news.test.ts`; `tests/sim/ui-notify-attention.test.ts` |
| AUTO-031 (new) | Tier gates: three projects in a `facility` branch (Central Water Supply after the Specialty Shop; Live Food Cultures after it and the Breeding Programme; Operations Desk after the Aquarium Store), each granting a new unlock key; costs and times are placeholders. | Each project opens only its tier; `progression-research-owned` and `facility-progression` pass; seeded suites recorded before and after. | new `tests/sim/automation-tiers.test.ts` (proposed) |
| AUTO-032 (new) | Water room per SPEC §9.2: prep to the cap; 30 gal batches at 10 AM and 10 PM below 60% with an empty mixing tank, 4.1 kg and 30 gal of fresh water; 12 h; overflow; AWCs take 10% from the matching reserve at lights-on in `tankOrder`, skipped rather than weak; salt used once, at mixing; the ATO draws only from fresh and stops with a shortage while it's empty (C-16); salt machinery and salt items only while a salt tank or a hatchery needs salt water (C-63); the player's and keepers' urgent changes unchanged. | The Day 38 fixture with no salt bought has 8.2 gal at 8:00 AM on Day 41 and skips Reef Lagoon, Clown Pair and Marine QT; reserves never go negative; an empty fresh reserve stops the ATO and the mixer and shows the shortage; a freshwater-only fixture without a hatchery raises no salt item; without a Water room AUTO-010 holds. | `tests/sim/automation-reserves.test.ts` (planned, AUTO-012) |
| AUTO-033 (new) | Live food room per SPEC §9.3 and C-22: cones 24 h (1 scoop and 0.5 gal salt water → 20 `baby_brine_live`), jars 72 h (1 `blanched_veg` → 15 `infusoria_culture`), dosers by need, shortages raised. | Each start consumes once and each harvest adds once across save, load and catch-up; a cone with no eggs waits and raises a shortage. | `tests/sim/automation-feed-production.test.ts` (planned, AUTO-013) |
| AUTO-034 (new) | Stock manager with a Water room (decision 15): salt urgency counts days until a change would be skipped (reserve and mixing tank included); the order follows the mixer's real use, the hatchery's included (C-63); 5 kg steps; the forecast is a pure dry run; an orders switch; no change without a Water room. | Day 38: $141 of food first and no salt at $150; $261 buys 40 kg; $200 buys 15 kg; a raised budget gives "arrives at 3:00 PM"; `staff-sim` and `staff2-feeding` unchanged. | new `tests/sim/automation-stock.test.ts` (proposed); `tests/sim/staff-sim.test.ts` |
| AUTO-035 (new) | Problems per SPEC §9.8: low, out, arriving and line items with their tones; counts drive the sub-line, tab and dock dots, More row and bell; Wait or new capacity turns the line item into "Resumes Day {d}". | One unit case per state from fixtures; the bell and dock dots follow the worst item. | new `tests/sim/automation-problems.test.ts` (proposed) |
| AUTO-036 (new) | Manual mode per SPEC §9.7: five hold flags with a game-hour timestamp; held jobs skipped, not queued; life support, keepers and live auctions never held; per-system resume; resuming the last held system ends manual mode; saved. | Over a held day no held job runs and nothing catches up after resume; the ATO, keepers and auctions still run. | `tests/sim/automation-operations.test.ts` (planned, AUTO-015) |
| AUTO-037 (new) | Facility jobs run at their scheduled game hour in SPEC §9.9's order (a batch finishes before the next start check), settle a tank's sim debt before changing it and allocate shared stock in `tankOrder`. The `world.ts` hook meets master §3.8 (0.5 §11.3 asks for core sign-off). | Results agree within the stated tolerances for different focused tanks, with `forceFull` on and off, and for 0.25 h and 4 h steps; `core-determinism` and `fix-core-step-invariance` stay green. | `tests/sim/automation-invariants.test.ts` (planned, AUTO-016); `tests/sim/core-determinism.test.ts`; `tests/sim/fix-core-step-invariance.test.ts` |
| AUTO-038 (new) | Machines: a machine catalog; bought and upgraded in Build › Facility as C-37 decides; upkeep joins `dailyOperatingCost`. | Upkeep shows in Finances and the weekly money; prices come from data. | new `tests/sim/automation-machines.test.ts` (proposed) |
| AUTO-039 (new) | Weekly money: line sales, supplies and upkeep, and net for the last seven completed days equal Finances for the same days, past the ledger cap too. | A long fixture past 400 ledger entries still matches. | `tests/sim/automation-operations.test.ts` (planned, AUTO-015) |
| AUTO-040 (new) | Operations › Map per SPEC §7.5 and C-46, C-47, C-61, C-64: labelled areas with tank tiles (grouping only); layers All · Water · Food · Animals (`map-layer-<…>`, a radio group; the layer in the URL, NAV-022) with the drawn states; desktop selection outlines a room, machine or tank and fills `map-details` (selecting it again clears it), above the Key card; phones are room-level, each area a button at least 44 px tall that opens `map-room-sheet`; an area that overflows ends with "+{n} more" (opens Tanks), and line tanks always show; early, the Hobby Room map without layers. Toasts stay clear of the full-width panel. | Day 38 fixture at 1440×948: each layer shows its marks (Water: gallons on tank tiles; Food: each tank's feeding; Animals: routes, with each tank's lines in text); selecting Grow-out B shows "12 of 12" and its line button opens `#/livestock/production/<id>`; selecting it again shows "Select a room, machine or tank to see its details."; at 390×844 a room tap opens its sheet; a larger fixture shows "+{n} more"; toasts raised while the Map is open don't intersect it. | `tests/e2e/operations.spec.ts` (proposed); area grouping in new `tests/sim/automation-map.test.ts` (proposed) |
| AUTO-041 (new) | Automation chips and held notes (SPEC §8.1, §8.2): tank rows add Auto-feed, Auto-clean, Top-off, Live-food doser and line chips (`tank-chip-<…>` inside the row), each an icon plus a word, aqua running, amber held or paused, neutral off; a row with a problem adds the amber reason line and Why (Problems from Tier 5, else the problem's tab, C-13); the tank card header adds the Auto-feed and Auto-clean chips, Equipment › Automation shows the held notes while held, and with a Water room the Auto-clean subline ends "· water from the Water room". | A unit test maps tank state to each chip's word, tone and id for running, held, paused and off; on the Day 38 fixture Grow-out B's row shows "Royal Blue line pauses tonight: 12 of 12 places." and Why opens the route for the tier; with manual mode on, Ember's tank card shows both held notes. | new `tests/sim/automation-chips.test.ts` (proposed); `tests/e2e/operations.spec.ts` (proposed) |
| AUTO-042 (new) | Manual mode in the HUD (SPEC §5.5): while any system is held, desktop shows the amber 48 px "Manual mode" pill (`hud-manual-mode`, `Hand` icon, `aria-label` "Manual mode is on. Open it") beside the clock pill, and phones turn the time pill amber with the `Hand` icon and the time; both open `#/operations/manual`. | After Hold all, the pill shows with its word at 1440×948 and the amber time pill at 390×844, and each opens `#/operations/manual`; Resume all removes both; with nothing held, or before the Operations Desk, neither shows. | `tests/e2e/operations.spec.ts` (proposed) |
| AUTO-043 (new) | Today and Saved this week: Today (desktop Overview from Tier 5, SPEC §7.1) lists the next four scheduled jobs from the sim's schedule (time, icon, title, detail, "Next" on the first), with "Manual mode: held jobs wait until you resume." while manual mode is on; Saved this week (desktop Feed, SPEC §7.3) compares the shop price of the live food the tanks used in the last seven completed days with what making it cost (C-42), counted on use from the seven-day use record (§7.1 here). | On the Day 38 fixture at 8:36 AM Today lists 9:00 AM, 10:00 AM, 2:00 PM and 3:00 PM as drawn, and once a job has run the next one moves up; Saved this week equals the shop cost of the servings used minus the making cost, and expired food doesn't count. | new `tests/sim/automation-today.test.ts` (proposed); `tests/sim/automation-operations.test.ts` (planned, AUTO-015) |
| MKT-017 (new) | Market › Supplies: Marine salt mix in 5, 20 and 40 kg (`supplies-salt-buy-<5\|20\|40>`, `role="group"`) with a status line, shown with a salt tank, salt in stock or a Water room (C-63); Live food rows with a Home-grown chip; For the cultures (eggs $18, vegetables); `#/market/supplies/salt` and `/brine_shrimp_eggs` scroll to and outline the row. | Each size adds its kg at $3 a kg; after a 5 kg bag the low-salt copy names the real stock and batches; a freshwater-only facility with a Water room shows the salt row. | new e2e (SPEC §15) |
| PROD-019 (new) | Line slots by level, 1 · 2 · 3 · 4 · 6 · 8 from Hobby Room to Grand Hall, as facility data; the slot caption; + New line only while a slot is free. | Captions at a full and a free level; `/new` shows not-found when full. | `tests/sim/production-line.test.ts` (planned); e2e |
| PROD-020 (new) | Shared tanks: lines may share a tank but not two stages of one line; a quarantine tank takes one batch at a time for 7 days; capacity pause with a derived restart day; an added quarantine tank brings the restart forward. | Day 38: Royal Blue restarts on Day 44 when waiting and on Day 42 with Quarantine 2 (subject to C-27 and C-33). | `tests/sim/production-line.test.ts` (planned) |
| PROD-021 (new) | Setup flow per SPEC §8.6.1 and C-35: three steps on one route; pairs already in a line listed but disabled; tanks checked for water type, temperament and space; Breed for, Line name, Sort, Sell and Line rules; Start line creates and opens the line; leaving drops it; naming rule. | Day 12: the Golden line is created with the drawn values; the Betta line becomes the Cambodian line; nothing exists before Start line. | e2e (SPEC §15); `tests/sim/production-ui.test.ts` (planned, PROD-003) |
| NOTIFY-012 (new) | Automation category (`auto`, on by default, `notify-cat-auto`; subtitle as C-57 decides, drawn as "Shortages, paused lines and manual mode") with SPEC §8.9's templates and routes; quiet hours and rate limits apply; events carry a category marker. | The out-of-salt and line-paused events map to it; quiet hours hold them; the route changes at Tier 5; every kind of event the subtitle names has a template. | `tests/sim/notify-rules.test.ts` (planned, S3-B) extended |
| DES-013 (new) | The S3-D copy (SPEC §11 and the strings quoted in §5-§8, as amended by C-48 and C-49) renders verbatim, and the SPEC §14 ids (as corrected in §10.1 here) exist and are documented in a new "S3-D" section of `docs/TEST_IDS.md`. | Static renders and e2e find each string and id. | new e2e; static renders |
| DES-014 (new) | SPEC §12's components (status badge, meter, stage track, issue card, route strip, system tile, map, manual-mode amber) use the 0.5 tokens (`src/ui/styles/tokens.css` L22-35). | Browser QA against `screens/` at 390×844 and 1440×948, leaving out what C-56 and C-57 say differs: Social in the dock and the More sheet at S3, and the phone notifications callout and its "This phone" row. | browser QA evidence |
| ACC-006 (new) | S3-D accessibility: SPEC §13 plus §4 here (pipes and lines not coded by colour alone, C-47 and C-64; Map keyboard and Esc order, high contrast, text scale 1.3, focus return). | A keyboard-only pass of Operations and the setup flow; contrast checks; screenshots at text scale 1.3; on the Animals layer each tank names its lines in text and each route has a label. | browser QA; `tests/e2e/operations.spec.ts` (proposed) |
| PERF-004 (new) | Operations summaries (forecast, problems, flows, Today, weekly money) are computed once per game hour or memoised on it, never per publish; Map tiles are capped per area. | With Operations open, a 4 Hz publish calls no `plannedUsage`; the maximum-scale fixture stays within the S3 budget. | performance reviewer evidence |
| PERSIST-016 (new) | S3-D save fields are optional, tagged and validated by `repairState` when present (finite numbers, booleans, dangling tank and creature ids dropped with a note); absent fields leave `stateHash` unchanged; the save version as C-44 decides. The edits to `migrations.ts` and `schema.ts` meet master §3.8, with a security/data review (as PERSIST-006 A4). | Crafted saves repair with notes; round trips keep the hash; with the bump, an older build reports `too_new`; `core-persistence` and `rare-persistence` stay green. | `tests/sim/persistence-05.test.ts` (planned); `tests/sim/core-crafted-saves.test.ts` |
| AUTO-002 (change) | Becomes the umbrella of AUTO-030 to AUTO-043 and MKT-017; unblocked when DESIGN-S3D is APPROVED. | requirements-audit's umbrella rule. | `scripts/agent/requirements-audit.mjs` |
| AUTO-009, AUTO-010 (change) | Apply to tanks without a Water room; with one, AUTO-032 and AUTO-037 govern the AWC. | As AUTO-032. | `tests/sim/automation-water-changer.test.ts` (planned) |
| AUTO-012 to AUTO-015 (change) | Unblock; point to SPEC §7 and §9. AUTO-012 A1-A2 stay as written: top-off and water changes draw only from the finite reserves, and an empty reserve skips (or, for the ATO, stops) the jobs that draw on it and shows a shortage until it is refilled (C-16). AUTO-013 A2 becomes "bounded by shelf life or capacity" (C-23); AUTO-015 A3 points to AUTO-039. | As the new rows. | as listed |
| AUTO-019 (change) | Adds the definition of "protected" once C-29 is answered. | As AUTO-019. | `tests/sim/automation-invariants.test.ts` (planned, AUTO-016) |
| PROD-003, DES-008, PROD-018 (change) | DESIGN-S3C-LINES' line cards, detail and setup come from DESIGN-S3D (decision 14); the approval ADR sets its status and `path`. | PROD-018 A1 passes with that path. | `scripts/agent/check-state.mjs` |
| PROD-002 (change) | A2's "SCHEMA_VERSION is unchanged" becomes "unchanged by the production field" if C-44 is adopted. | As PROD-002. | `tests/sim/persistence-05.test.ts` (planned) |
| PROD-011, PROD-012 (change) | Follow the owner's answers to C-27 and C-28. | As amended. | `tests/sim/production-line.test.ts` (planned) |
| PROD-015 (change) | The Production "This week" tile shows line sales and count, not net; `stats.costs` stays optional. | Tile equals the line's sales over the last seven days. | `tests/sim/production-line.test.ts` (planned) |
| NOTIFY-002, NOTIFY-003, NOTIFY-006 (change) | Five categories become six (Automation, on by default). NOTIFY-006 A2 holds on phones too: the web callout and the "This browser" row, not the phone board's "app" callout (C-57). | As NOTIFY-012; at 390×844 `notify-status` shows the web callout. | `tests/sim/notify-rules.test.ts` (planned, S3-B); `tests/e2e/notifications.spec.ts` (planned) |
| NAV-004 (change) | The More sheet gains the Operations row (NAV-021), which lifts its top from about 48% to 334 px of 844 (about 40%; SPEC §5.1, C-58); at S3 it has five tiles in both modes, and from S4 dev mode adds Social (SOC-011, C-56). | A1 becomes: at 390×844 the sheet's top is at 334 px, within the same proposed ± 3%, with `more-operations` first and the tiles below it. | S1's `mobile-tabbar.spec.ts` (planned) |
| PERSIST-006 (change) | Also validates the S3-D fields, or folds into PERSIST-016. | As PERSIST-016. | `tests/sim/persistence-05.test.ts` (planned) |
| SOC-004 (change) | From S4, with S3-D's dock: A2's order becomes Tanks · Livestock · Market · Visitors · Shows · Social · Build · Operations · Research · Finances · Encyclopedia (Settings is on the gear, NAV-020); A4's fixed dock-item count becomes 11 in dev mode and 10 outside it (SOC-011); A1's dock-width checks measure the wider Operations label (C-3, C-56). | In dev mode the dock has 11 items in that order; outside dev mode 10, without Social; `dock-width.spec` passes in both modes. | `tests/e2e/dock-width.spec.ts` (planned); `tests/e2e/boot.spec.ts`; `tests/sim/ui-notify-news.test.ts`; `tests/sim/ui-notify-attention.test.ts` |
| DES-011 (change) | Where DESIGN-S3D changes a 0.5 surface (the desktop dock and top bar, the More sheet, the tank card's Automation section, Settings › Notifications and Production), the S4 reviewer judges it against DESIGN-S3D's SPEC and `screens/` with DES-014's exceptions (C-56, C-57). In A2, the "More top ≈ 48%" in 0.5 §17's phone tank card row becomes 334 px (C-58), and the desktop panel row is measured on a 0.5 panel, since Operations has SPEC §5.2's widths (C-5). | evidence/S4 records, for each surface, which design it was judged against. | as DES-011 |
| CONST-002 (change) | A1's "helpers.openPanel still working at desktop for build, market, settings and shows" holds with Settings opened through `hud-settings` from S3; A3's list of requirements that name test changes adds NAV-020, for `tests/e2e/helpers.ts` (`openPanel(page, 'settings')`) and `tests/e2e/boot.spec.ts` (the sweep adds Operations and the gear) (C-59). | The diff of those two files since the S0 checkpoint holds only those changes and removes or weakens no assertion (master §18 rule 13); `save.spec.ts` is unchanged and passes. | `tests/e2e/helpers.ts`; `tests/e2e/boot.spec.ts`; `tests/e2e/save.spec.ts` |

## 13. Independent review

First review: design-intake-2 (`docs/agent/evidence/S0/reviews/design-intake-2.md`, 2026-10-06), a reviewer that
wrote neither SPEC.md nor INTAKE.md. Verdict: **YELLOW**. Main findings: Social arrives in S4, so the S3 dock has 10
items in both modes and S4's SOC-004 and DES-011 change too; the phone notifications board shows 0.5's native "app"
callout; C-16 quietly loosened AUTO-012's finite reserve; and ten missed conflicts, a few wrong citations and some
normative behaviours with no requirement. This revision folds them in: C-16 is corrected, C-56 to C-64 are new, the
"Needs owner?" column and the owner questions are updated, and §12 gains the missing rows and changes.

Re-review: pending (design-intake-3, a fresh reviewer).

## 14. Owner decision

Owner decision: pending. The owner chose (ADR-0014 answer 21) to approve after this note and an independent review; a
new ADR will record the answer verbatim.
