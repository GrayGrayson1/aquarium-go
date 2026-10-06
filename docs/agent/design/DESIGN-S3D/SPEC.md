# DESIGN-S3D: deep automation (S3-D) — design addendum to the 0.5 spec

> **Not approved yet (2026-10-06).** Captured from the owner's Claude Design canvas after the owner chose a direction
> in an option review and settled the follow-up questions (ADR-0014). The owner approves it after answering the
> questions in `INTAKE.md` §11, recorded word for word in a new ADR. Nothing that depends on this design starts before
> approval (`PLAN.md`, chunks 4 and 5). The intake procedure it was captured under is archived with the harness
> (ADR-0018).

- **What this is:** the screens, states, copy, routes, test ids and simulation behaviour for the S3-D automation layer
  (master §9 S3-D, tiers 1–5), written as an addendum to `AQUARIUM_GO_0_5_DESIGN_SPEC.md` (the "0.5 spec"). Where this
  document is silent, the 0.5 spec and the AUTO requirements in `docs/agent/REQUIREMENTS.json` apply.
- **Design files:** the owner's "Design" canvas, https://claude.ai/artifact/SaZzQpkftDTxcZuzZQfgBk (who can open it is
  the owner's choice; the repo copy is what counts), Version 23 (`1791264082-fb19`). Relevant rows: "Automation · final
  · Operations", "Automation · final · Around the app", "Automation · final · Prototypes" (two clickable prototypes,
  phone and desktop) and "Automation · final · Accepted additions" (the screens the follow-up answers added: the room
  view's map chip, the Overview and bell before the Operations Desk, setting up a second line, salt bag sizes, and
  Production with every line slot used). The three option rows above them ("Automation · option A/B/C") are history: they show what the
  owner compared and keep the sample as it was then (the owner chose to leave them as reviewed), so some of their numbers
  differ from §16. `screens/` holds exports of every final screen and the key prototype states; `SOURCE.md` lists them
  with SHA-256s.
- **Checked against the code:** names, prices and rules marked "repo" were read from the working tree at `b243b23`
  (local `main`, 2026-10-05). Everything shown with a "New" chip on the canvas is new, and so is anything this document
  calls a proposal.
- **Precedence:** this document wins over the final boards and the prototypes, and the final rows win over the option
  rows. The boards and prototypes fake a sample facility so every state can be shown; §16 lists the sample numbers so
  screenshots and tests can reproduce them.

---

## Contents

1. Goals
2. Decisions (owner, 2026-10-05)
3. Ground rules
4. What exists and what's new
5. Navigation
6. Routes and deep links
7. Operations screens
8. Around the app
9. Simulation behind the screens
10. Data model (proposed)
11. Copy deck
12. Visual specification
13. Accessibility
14. Test ids
15. Tests: new, changed and at risk
16. The sample facility
17. 0.5 mismatches found while designing
18. Open questions
- Appendix A: canvas boards and exported screens
- Appendix B: the prototype controls

---

## 1. Goals

S3-D turns the 0.5 switches (Auto-feed, Auto-clean) and the production line into a facility you run:

- **Tier 1 · Assisted care** (exists in 0.5): Autofeeder, Auto Water Changer, alerts, schedules.
- **Tier 2 · Water room** (new): a Water Prep Station fills a fresh reserve, a Salt Mixing Station makes salt water from
  marine salt mix, Reservoirs store both, and every Auto Water Changer draws from them.
- **Tier 3 · Live food room** (new): a Brine Shrimp Hatchery and infusoria jars turn eggs and vegetables into the game's
  existing live foods; live-food dosers feed fry and larvae from that stock.
- **Tier 4 · Breeding facility** (S3-C, extended): several production lines that share tanks, with capacity-aware
  pausing, quarantine scheduling, protected keepers and automatic listing.
- **Tier 5 · Operations** (new): one place to see every system, problems first, weekly money, today's schedule, and
  Hold all (manual mode).

One panel, **Operations**, is the hub. Automation also shows where the player already looks (tank rows, the alerts
bell, Build, Market, Livestock), and each of those links back to Operations.

## 2. Decisions (owner, 2026-10-05)

The owner reviewed three options on the canvas (A · Control room, B · In context, C · Facility map; not related to
ADR-0001's "option C") and chose, question by question, then settled the follow-up questions the same day (rows 13–22).
ADR-0014 records the answers.

| # | Topic | Decision |
|---|---|---|
| 1 | Direction | **A · Control room**, with parts brought in from B and C |
| 2 | Where Operations lives | Its own panel. Desktop: a dock item in the place **Settings frees** (the dock stays at 11; Operations sits 8th, after Build); Settings moves to a **gear** in the top bar. Phone: the **first row in More** |
| 3 | Tabs | **Overview · Water · Feed · Lines · Map**. Early on: Overview · Lines · Map |
| 4 | Problems | **Shown first** on the Overview and **one tap from the alerts bell**; full view at `#/operations/issues` |
| 5 | Hold all | In the **Operations header**, with an amber **Manual mode** pill in the HUD. Manual mode holds **automation only**; life support and keepers keep running |
| 6 | Lines tab | Status, output, bottlenecks, pause/resume and a **route strip** per line. **Rules stay in Livestock › Production** |
| 7 | Map | Built now as the **fifth tab**, with **four layers** (All · Water · Food · Animals), **room-level on phone**, tank areas are **grouping only**, shown **from day one** |
| 8 | From B | **Automation chips** on tank rows and the tank card; machines **bought and upgraded in Build › Facility**, run from Operations; **home-grown rows** in Market › Supplies |
| 9 | From C | **Route strips**; **dashed tiles plus the tier ladder** for locked systems early on |
| 10 | Systems | All four new machine families stay: Water room, Brine Shrimp Hatchery, infusoria jars, live-food dosers. **Unlock gates as drawn** (§9.1) |
| 11 | Shortages | Come from the **stock manager's daily budget** (repo staff system) |
| 12 | 0.5 mismatches | **Noted here** (§17); the 0.5 boards stay untouched |
| 13 | Room button | **Room stays the 3D room view**; the room view gets a **"Facility map" chip** that opens the Map (§5.6) |
| 14 | Several production lines | This design's Lines tab and Production line picker **count for DESIGN-S3C-LINES' line cards and detail**; a new line is **set up with the 0.5 §11.1 steps**, once per line (§8.6.1) |
| 15 | Who gets the budget first | **Food first**; with a Water room, salt's urgency counts the days until a water change would be skipped (§9.6) |
| 16 | Salt purchase size | **Add a 40 kg size ($120)**; 5 kg and 20 kg stay (§4, §8.5) |
| 17 | Prices and times | Research costs and times, machine and upgrade prices, the egg tin and machine upkeep are **placeholders** for the economy lane (§8.4, §8.8) |
| 18 | Line slots | **1 · 2 · 3 · 4 · 6 · 8** from Hobby Room to Grand Hall (§9.1, §8.6) |
| 19 | Night-time alerts | Automation notifications **respect quiet hours** (§8.9) |
| 20 | Overview before Tier 5 | **System tiles show their status**; the bell links to the tab where the problem is; the Problems list arrives with the Operations Desk (§7.1) |
| 21 | Approval | **After the intake note and an independent review** (`DESIGN_INTAKE.md` steps 2–5) |
| 22 | Option rows | **Left as reviewed**; the final rows and this document are right where they differ |

## 3. Ground rules

- **Honest to the simulation.** Automation moves real, tracked stock: it never creates money, animals, food, salt or
  water from nothing; it respects tank capacity and compatibility; it never sells a Prismatic or protected animal; it
  surfaces a shortage instead of silently skipping (master S3-D simulation rules and anti-dupe invariants).
- **Numbers add up.** Every figure on a screen is derived from the same state (§9). The sample (§16) is internally
  consistent; keep it consistent in fixtures.
- **Status is an icon plus a word**, never colour alone (Running, Look soon, Needs you, Held, Locked, Paused…).
- **Touch targets ≥ 44px** for every new control (buttons, switches with a 52×44 hit area, chips that act). The 0.5
  tab strips (36px pills, including the Production line picker and its "+ New line" item) and HUD pills (40px phone)
  keep their approved sizes, and so do the room view's camera chips: "Facility map" joins "Reset view" as a 38px
  `.ag-camchip` inside the existing 48px pill (`src/ui/styles/hud.css`).
- **Phone tab bar stays at five tabs.** **Desktop dock stays at eleven items** (Operations replaces Settings).
- **Copy** follows the game's voice: plain, short, specific numbers, sentence case, "·" separators.

## 4. What exists and what's new

| Area | Today / 0.5 | S3-D |
|---|---|---|
| Autofeeder | repo, $35, dry food only (`autofeeder` in `src/data/catalog/equipment.ts`) | unchanged; counted as "Autofeeders" |
| Auto Water Changer | 0.5 §10.3 | draws from the Water room's reserves once Tier 2 exists |
| Auto Top-Off | repo, $110 (`ato`) | counted in water flows |
| Marine salt mix | repo, `state.inventory.salt` (kg), $3 a kg, 0.036 kg per litre at SG 1.025; Market › Supplies sells 5 kg and 20 kg, the tank card 10 kg | used by the Salt Mixing Station; a new **40 kg · $120** size beside 5 kg · $15 and 20 kg · $60 in Supplies (§8.5), and **Buy 40 kg · $120** as the quick action on problems |
| Stock manager | repo: shelf checks 9 AM (and 3 PM from skill 3); daily budget in whole dollars up to the level's max (Showroom default $150, max $600, `STOCK_BUDGET`); salt bought in 5 kg steps within what's left | the source of shortages; "Raise budget" links to Visitors › Staff |
| Aquarists | repo: rounds 8 AM and 6 PM; skip a water change rather than do it short of salt | unchanged; manual mode never stops them |
| Foods | repo: Micro Pellets, Tropical Flakes, Marine Pellets, Blanched Vegetables ($3, 20), Live Baby Brine Shrimp ($8, 20), Infusoria Culture ($5, 15), frozen and live foods | live foods can now be **home-grown** |
| Production line | 0.5 §11 (one line card) + ADR-0005 decision 6 (several lines) | Operations › Lines (status) and Livestock › Production (rules) for several lines |
| Tank tiers | repo, e.g. 20 Gallon Long $95 | "Add a quarantine tank · $95" buys a 20 Gallon Long |
| **New** machines | — | Water Prep Station, Reservoir, Salt Mixing Station, Brine Shrimp Hatchery, Infusoria jars, Live-food doser |
| **New** supply | — | Brine shrimp eggs (30 scoops a tin, $18) |
| **New** research | — | Central Water Supply, Live Food Cultures, Operations Desk |
| **New** panel | — | Operations (`operations`) |

## 5. Navigation

### 5.1 Where Operations lives

| | Phone | Desktop |
|---|---|---|
| Operations | **More › first row** (full width, above the tile grid) | **Dock item 8**, between Build and Research, icon `Gauge` (Research, Finances and Encyclopedia move to 9–11). Settings, 0.5's dock item 11, leaves the dock, so it stays at 11 items and 0.5 §5.4's width rules stay valid |
| Settings | More › row at the bottom (unchanged) | **Gear button** in the top bar, between money and the bell (48px glass pill, `Settings` icon, `aria-label="Settings"`, pressed while Settings is open) |

Dock order: Tanks · Livestock · Market · Visitors · Shows · Social · Build · **Operations** · Research · Finances ·
Encyclopedia.

**Dock width.** "Operations" is a longer label than "Settings": in the prototype its item is 72px against about 60px,
and at 1440px the dock's clearance to the labelled camera chips drops from about 20px (0.5) to 10px. Re-run the 0.5
dock-width checks (0.5 §5.4: 1400, 1440, 1519, 1520 and 1600px); if the dock touches the chips, use 0.5's fallback and
raise the chips' icon-only breakpoint.

**More sheet (phone).** The Operations row sits first: 60px tall, aqua-tinted border and background, 40px icon chip
(`Gauge`), title "Operations" with a "New" chip, subline (see copy deck), chevron. Then the 0.5 grid and Settings row.
The sheet rises to fit (top at 334px on an 844px phone instead of 404px).

### 5.2 The Operations panel

- **Phone:** a full panel sheet (0.5 §5.6) with the drag handle, header and tab strip. Phones held sideways use the
  same sheet (0.5 §5.2) and the room-level Map; landscape isn't drawn, so check it in the build.
- **Desktop:** a right-hand panel, 940px wide on every tab except **Map, which is 1408px** (it spans from the left edge
  to the right edge, between the top bar and the dock). The header keeps the shared panel chrome (`PanelLayout`): the
  **Expand** button maximises the panel as on every other panel, and the tabs' grids reflow to the wider space. On Map
  the panel is already full width, so Expand is hidden there (as on the boards; the prototype leaves Expand out).
- **Header:** 40px icon chip (`Gauge`), serif title "Operations", subline, then the tab strip. Desktop adds
  **Hold all** (ghost button, amber border, `Hand` icon) to the left of the close button while automation is running.
  On Map the layer control sits at the right of the tab row.
- **Tab strip:** the 0.5 pn strip. Five tabs on phone use **13px side padding** instead of 15 so all five fit in 358px
  (measured 352px with a dot) on a 390px phone; on narrower phones the strip scrolls sideways like other 0.5 strips and
  keeps the selected tab in view. The **Overview** tab carries a dot (red when anything needs you, amber when something
  is worth a look) whenever the Overview page itself isn't showing: on the other tabs and on the Problems and Manual
  mode views (which highlight Overview).

### 5.3 Tabs by tier

| Tab | Shows from | Before that |
|---|---|---|
| Overview | day one | early version: assisted care, your line, dashed locked tiles and the tier ladder |
| Water | Tier 2 (Water room) | tab hidden; `#/operations/water` shows a locked page |
| Feed | Tier 3 (Live food room) | tab hidden; `#/operations/feed` shows a locked page |
| Lines | day one | early version: the one line and the locked line slots |
| Map | day one | early version: the Hobby Room map, Water and Live food rooms drawn dashed; no layers |
| Problems view, weekly money, Today, Hold all | Tier 5 (Operations Desk) | `#/operations/issues` and `#/operations/manual` show locked pages |

### 5.4 Dots and badges

- **Bell (HUD):** red dot when anything needs you (a supply is out and no reorder is coming); else amber when something
  is worth a look (low, arriving, a line held up), manual mode is on, or Auto-feed is paused; else aqua for unread news
  (0.5).
- **Operations dock item / More row icon:** red or amber on the same rule (no aqua news dot).
- **More tab:** red when anything needs you; otherwise the 0.5 rule.

### 5.5 Manual mode pill (HUD)

While any system is held: **desktop** shows an amber 48px pill "Manual mode" (`Hand` icon) beside the day/time pill;
**phone** turns the time pill amber with a `Hand` icon and the time. Both open `#/operations/manual`.

### 5.6 The Room button and the map chip [Final · Room view with the Facility map chip]

The tank bar's **Room** button stays as it is: `view-toggle` (`src/ui/hud/TankBar.tsx`) switches to the 3D **room view**
("Show the whole room") and back (decision 13). The room view gets a **"Facility map"** chip beside its "Reset view" chip
(`src/ui/hud/RoomChips.tsx`): same chip style, `Map` icon, test id `room-facility-map`, opens `#/operations/map`.

- **Where:** the existing `.ag-roomcam` group (`.ag-hud__cam--room`), so the pill sits where the room chips sit today:
  bottom right on desktop, in place of the tank camera chips (Front · Orbit · Follow · Close), and above the tab bar on
  phone. Both chips show their labels in the room view (`.ag-hud__cam--room .ag-camchip span`), on phone too.
- **Order:** Reset view, then **Facility map** with the aqua tint of a primary chip (icon aqua, text `#effffc`,
  `rgba(94, 234, 212, 0.12)` fill), so the way to the Map reads first. It is a link, not a toggle: no `aria-checked`.
- **What stays:** the 3D room, its edge cues and its hint, the tank bar (Room pressed) and the dock. The tank tool rail
  hides in the room view as it does today.
- **Opening the Map** keeps the room view underneath: closing the Map returns to the room. Room again returns to the
  tank.
- The boards stand in for the 3D room with a dark gallery of lit tanks; the prototypes do the same.

## 6. Routes and deep links

All follow 0.5 §6 (hash routes, unknown → "That link doesn't go anywhere", Back/Forward/Esc).

| Route | Opens | Notes |
|---|---|---|
| `#/operations` | Operations › Overview | early: early Overview |
| `#/operations/water` | Water tab | before Tier 2: locked page (Tier 2 requirements) |
| `#/operations/feed` | Feed tab | before Tier 3: locked page |
| `#/operations/lines` | Lines tab | early: one line + locked slots |
| `#/operations/map` *`?layer=water\|food\|animals`* | Map tab with a layer | `layer` omitted = All. Changing the layer replaces the URL (no history entry), like the 0.5 shop filters |
| `#/operations/issues` | Problems (full view) | Overview tab highlighted; before Tier 5: locked page |
| `#/operations/manual` | Manual mode | Overview tab highlighted; shows on/off states; before Tier 5: locked page |
| `#/livestock/production` *`/:lineId`* | Production, one line selected | no id = first line; unknown id → not found |
| `#/livestock/production/new` | Setting up another line (§8.6.1) | only while a slot is free; otherwise not found |
| `#/build/facility` *`/water\|food`* | Build › Facility, or one room's machines | before a room exists: locked room page |
| `#/market/supplies/:foodId` | Supplies, scrolled to and outlining a row | 0.5 route; also `brine_shrimp_eggs` and `salt` |
| `#/visitors/staff` | Staff, with the stock budget | target of "Raise budget" |
| `#/settings/notifications` | Settings › Notifications | phone via More; desktop via the gear |

Desktop `#/more` stays a no-op (0.5). Map selection is not in the URL.

## 7. Operations screens

Board titles in brackets point to the canvas (Appendix A); `screens/` holds the PNGs.

### 7.1 Overview [Final · Overview]

**Problems first.**
- Phone: one card listing what needs a look: header "{n} to look at" (amber) or "{n} problems" (red, when anything needs
  you), an "All" link to `#/operations/issues`, then one row per item: icon, title, one-line reason, one action button.
- Desktop: one compact card per item side by side (one fills the width): icon, title, "Look soon"/"Needs you" badge,
  reason, actions.
- Nothing to look at: a green row "Everything is running smoothly."

Items (§9.8): the salt item (low / out / arriving) and the line item (pauses tonight / paused). Actions:
"Buy 40 kg · $120" (phone "Buy"), "Raise budget" → `#/visitors/staff`, "See why" / "Why" / "Fix" → `#/operations/issues`.

**Systems** (2 columns phone, 3 desktop), each a tile: icon chip, name, status badge, then one line (phone) or two
(desktop). A tile whose status is a problem gets the amber or red border; tapping a tile opens its tab.

| Tile | Status | Phone line | Desktop lines |
|---|---|---|---|
| Water changes | Done 8:00 AM · Held | 17 tanks · 49.4 gal | 17 tanks · 49.4 gal / 10% each morning · glass weekly |
| Water room (New) | OK · Salt low · Salt out · Due {time} · Held | Fresh 79% · salt 52% (+ two bars) | Fresh 79% · salt 52% (+ two bars) / 4.1 kg salt mix · 1 batch left |
| Live food (New) | Running · Held | Makes 60 servings a day | Baby brine 40 a day · uses 34 / Infusoria 20 a day · uses 12 |
| Feeding | Running · Held | 6 feeders · 3 dosers | 6 Autofeeders · 3 live-food dosers / 9 tanks fed by keepers on rounds |
| Production lines (phone "Lines") | Running · 1 pauses tonight (phone "1 to check") · 1 paused · {n} paused by you · Resumes Day {d} · Held | 4 lines · 3 smooth | 4 lines · 3 running smoothly / 37 sold this week |
| Keepers & stock (desktop only) | 4 on shift | — | 3 aquarists · Rosa Duarte / $150 stock budget · next order 9:00 AM |
| Manual mode (phone only) | Off · On | Hold everything (or Since {time}) + Hold all / Resume all | — |

**This week · Days 31–37:** line sales, "Supplies & upkeep" (phone "Costs") and net, then a bar per line. The figures
are sums of ledger entries for the last seven completed days, so they match Finances for the same days (AUTO-015).
**Today (desktop):** the next four scheduled jobs (time, icon, title, detail, "Next" on the first), e.g. 9:00 AM "Rosa
checks the shelves" · "Food first · salt mix won't fit the budget"; 10:00 AM "Salt mixing" · "30 gal batch · uses 4.1
kg"; 2:00 PM "Infusoria" · "Jar 1 harvest · 15 servings"; 3:00 PM "Rosa's second check" · "Salt mix if the budget
allows". While manual mode is on, a line under the title: "Manual mode: held jobs wait until you resume."

**Manual mode on:** an amber banner leads the Overview: "Manual mode is on", "Since {time}. …", **Resume all**.

**Early game [Final · Early game]:** Assisted care (Tier 1 chip): Ember's Tank row "Autofeeder · Micro Pellets · {n}
servings left" with Auto-feed status; desktop adds "4 more tanks · Fed and cleaned by hand"; Auto-clean row or
"Auto-clean needs an Auto Water Changer · Buy · $120". Then the Betta line row ("1 of 1 line slot · Raise stage",
status), four dashed locked tiles (Water room, Live food, More lines, Operations tools; each Locked + New, opening its
locked page), and the tier ladder (phone: a list; desktop: tier rows with requirements, Tier 2 "Next up").

**Before the Operations Desk [Final · Overview before the Operations Desk] (Tiers 2–4; decision 20).** From the first
system beyond Tier 1 (a Water room, a Live food room or a second line) until the Operations Desk is researched, the
Overview uses this layout instead of the early one. Tiers can arrive in any order, so it is built from what the player
has. The board shows the Day 38 sample, where only the Desk is missing.
- **Tiles:** a Systems tile for each system the player has, with its status word and tone (e.g. Water room "Salt low"
  or "Salt out" with the amber or red border): Water changes and Feeding always; Water room and Live food once built;
  Production lines once there's a line; Keepers & stock (desktop) once there's a stock manager. Then a dashed tile
  (Locked + New, opening its locked page) for each system still locked: Water room, Live food, More lines (while there's
  one slot), and always **Operations tools** ("Problems first, weekly money, Today and Hold all"). No Problems list,
  This week, Today, Hold all, Manual mode tile or pill until Tier 5.
- **What opens up next:** the ladder of tiers still locked, the first marked "Next up", each with its requirements: met
  ones with a green tick (the sample: "Aquarium Store: you're past it"), unmet ones with a lock and what's missing
  ("Aquarium Store · {rep} of {needed} reputation", "Research Operations Desk · $2,400 · 3 days"). While a research runs
  its line reads "Researching {project} · {n} days left". The card's header has a **Research** link (→ `#/research`).
- **Phone:** Systems tiles, then dashed tiles, in one two-column grid; then the ladder card. **Desktop:** Systems tiles
  in three columns; then the dashed tiles (one column) beside the ladder card (1 : 2).
- **Links go to tabs.** The bell's Automation section (§8.3) lists the same items. Its links, the tiles, the
  notifications, and the other links that would open Problems ("Why" on a tank row, §8.1; "Fix" on a held-up line in
  Production, §8.6) open the tab where the problem is instead: salt → `#/operations/water`, live food →
  `#/operations/feed`, a line → `#/operations/lines`. A deep link to `#/operations/issues` or `#/operations/manual`
  shows its locked page (§7.8).

### 7.2 Water [Final · Water room]

- **Meters:** Fresh reserve (New) "{gal} / 150 gal", status Filling, hint "Refilling 6 gal an hour · full by {time}"
  (after the 10 AM batch: "The 10:00 AM batch drew 30 gal · full by {time}"). Salt water reserve (New) "{gal} / 60
  gal", status OK or "Short Day {d}" (red), hint about the next or current batch. Salt mix "{kg} kg", status OK · Low ·
  Out · Due {time} · "Order at 9 AM", bar against 35 kg, hint (uses 3.5 kg a day, Rosa's checks, or why she can't
  reorder), and **Buy 40 kg · $120** while low, out or due.
- **Where the water goes · a day:** two stacked bars. Fresh {53.4} gal = water changes 24.5 (12 freshwater tanks) + to
  the salt mixer 25.9 + top-off 3 (5 Auto Top-Offs). Salt {25.9} gal = water changes 24.9 (5 marine tanks) + brine
  shrimp hatchery 1.
- **Schedule:** water changes 10% at 8:00 AM (each tank's lights-on); glass scrape once a week; top-off as needed;
  salt mixing in 30 gal batches below 60%, 4.1 kg each.
- **Machines (desktop):** Water Prep Station (6 gal an hour · $0.40/day, Running), Reservoir (150 gal fresh · 60 gal
  salt, OK), Salt Mixing Station (30 gal batches · 12 h · $0.30/day; Idle "Next 10:00 AM" / Mixing "Ready 10:00 PM" /
  Held), Auto Water Changer × 17 (10% each morning · $0.06/day each). Link "Upgrade in Build" → `#/build/facility/water`.
  Phone shows a link row instead: "Machines and upgrades are in Build › Facility." **Open**.
- Manual mode: a note row at the top lists what is held, with **Open** → `#/operations/manual`.

### 7.3 Feed [Final · Live food]

- **Brine Shrimp Hatchery** (New, Running/Held): "2 cones · each takes 1 scoop of eggs and 0.5 gal of salt water";
  a bar per cone with "ready {time}"; output "Live Baby Brine Shrimp · {n} servings in stock · keeps 1 day";
  "+40 / −34 made / used a day".
- **Infusoria jars** (New): "4 jars · each takes 1 serving of Blanched Vegetables · 3 days"; a bar per jar; output
  "Infusoria Culture · {n} servings in stock · keeps 2 days"; "+20 / −12".
- **Live-food dosers** (New): Larvae Tub "clownfish larvae · 26 brine · 4 infusoria", Puffer Grow-out "pea puffer fry ·
  8 brine · 8 infusoria", Grow-out A "idle until the next clutch hatches" (Idle).
- **Supplies (desktop):** Brine shrimp eggs (New) "{n} scoops · about {d} days · 30 scoops a tin" **Buy · $18**;
  Blanched Vegetables "{n} servings · about {d} days" **Buy · $3**. Phone: link row to Market › Supplies.
- **Saved this week (desktop):** "Saved $108 this week. Buying the 238 servings of baby brine and 84 of infusoria the
  tanks used would cost $123; making them cost $15." (Counted on what the tanks used: unused live food expires.)

### 7.4 Lines [Final · Production lines]

- Sections by species ("Betta · 2 lines" with the link **Rules in Production** → `#/livestock/production`, then
  "Clownfish · Pea puffer").
- **Desktop row** per line: pair portraits (Prismatic ring where a parent is Prismatic), name, species · pair; the
  five-stage track (Breed · Raise · Sort · QT · Sell; the current stage lit, amber when held up); "{raise text} in
  {tank} · day {x} of {y} · {next}"; status badge and a **switch** "Run the {line}"; "{n} sold · ${revenue}" this week;
  under it the **route strip**: coloured line dot, then tank chips joined by chevrons (breed tank › grow-out › quarantine
  › Market), each with a short tag; chips with a problem have an amber border and warning icon.
- **Phone card** per line: the same content stacked, with a footer "This week {n} sold · ${x}" · "Line on" switch.
- **Shared tanks** card: Grow-out A 12/24, Grow-out B 12/12 (amber), Quarantine 1 10/12 "Used by the Cambodian and
  Royal Blue lines", Puffer Grow-out 11/12, plus Quarantine 2 0/12 once added; chip "4 of 4 line slots".
- **Coming up (desktop):** dated events (Day 40 Snowflake lists 8 · Day 41 Golden lists 5 · Day 42 Cambodian spawns ·
  Day 44 Cambodian lists 10), plus the Royal Blue restart once decided.
- Switching a line off: status "Paused by you", next line "Paused by you · animals stay where they are" (amber); nothing
  new is bred, moved or listed; animals stay put.
- **Early:** one Betta line card (Breeding Tank › Grow-out Tub 14 fry › Quarantine 3 juveniles › Market 3 listed;
  "14 fry are free-swimming · next stage in 6 h"; "Listed now 3 · best bid $31"; Line on switch), then three dashed
  rows "Line slot 2 · Specialty Shop", "3 · Aquarium Store", "4 · Public Showroom".

### 7.5 Map [Final · Facility map]

A schematic of the facility (not to scale): **rooms** are labelled areas, **tanks** are tiles inside them, **pipes** carry
fresh water (blue), salt water (teal) and live food (violet, dashed), and supplies feed the rooms (grey).

- **Areas:** Water room (New) · Supplies shelf · Live food room (New) · Breeding · {n} lines · Quarantine & keepers ·
  Gallery · {n} tanks · Market. Tank areas are grouping only: tanks aren't dragged between them here.
  Bigger facilities (proposed, not drawn): an area shows as many tank tiles as fit and ends with a "+{n} more" tile that
  opens the Tanks panel; tanks that belong to a line always show.
- **Layers** (desktop: "Show" + a pn strip in the header; phone: four 44px chips above the map): **All** (water and food
  pipes, line routes as tank order), **Water** (rooms that use water lit, gallons on tank tiles, top-off marks),
  **Food** (feeding on each tank: Autofeeder, doser and its daily amount, keepers' rounds; doser tanks violet),
  **Animals** (each line's colour, routes into quarantine, "waits" where a line is held up, "auto-listed" into Market;
  rooms without animals dimmed). Labels on pipes give daily water-change gallons per room.
- **States drawn on the map:** salt low (Supplies amber, "4.1 kg · Low · 1 batch"), out (Supplies red, the salt pipe red
  and dashed, mixer "No salt left" red, salt reserve "Runs short Day 41"), arriving (amber, "due 3 PM / Day 39"),
  held systems (their pipes grey and dashed, machines "Held"), line tags per line (Running · Pauses tonight · Paused ·
  Held), Breed Tank B "Pair waits" while paused, Grow-out B "Full · 12/12", Quarantine 1 "Next: Royal Blue" (amber
  while the line waits), a dashed **"Add a quarantine tank · $95"** slot while the line is paused, then **Quarantine 2**.
- **Desktop selection:** every room, machine and tank is a button. Selecting one outlines it and shows its details to
  the right: tanks show environment · gallons · room · line, then Animals, Places, Feeding, Water and Next, with buttons
  (Open tank card for Ember's Tank; the line → `#/livestock/production/:lineId`); rooms show their machines or tanks
  with statuses and links (Water tab, Machines in Build, Feed tab, Lines tab, Market › Supplies, My listings). Selecting
  it again clears the selection; with nothing selected the column shows "Select a room, machine or tank to see its
  details." Under the details: a Key card (legend for the layer, a hint, and the held legend in manual mode).
- **Phone:** room-level. Each area is one tap target (≥ 44px tall) that opens a sheet with that room's contents and
  links; tanks inside are labels, not buttons. A line under the map: "Tap a room to see what's in it."
- **Early [Final · Early game map]:** the Hobby Room: Supplies (Micro Pellets "34 · Autofeeder", "You restock from the
  Market"), Water room and Live food room dashed with their requirements, Breeding · 1 line with locked slots,
  Quarantine & keepers, Gallery · 1 tank (Ember's Tank "Auto-feed on"), Market "3 listed · Best bid $31". No layers;
  phone adds "Layers for water, food and animals appear when the Water room opens." and the Tier 2 row.

### 7.6 Problems [Final · Out of salt and a full grow-out tank]

`#/operations/issues`: a back button "Overview", then one card per item. Desktop: salt card (and "Why the line stops")
on the left, line card on the right.

**Salt card** (issue card: icon, title, badge, reason, a "when" table, actions):

| State | Title · badge | Reason | When | Actions |
|---|---|---|---|---|
| Low (morning, no reorder coming) | Salt mix is low · Look soon | "4.1 kg is enough for the 10:00 AM batch, then none. Rosa's $150 budget won't stretch to a sack today: food comes first." | 10:00 AM: the batch uses the last 4.1 kg · Day 41: the marine tanks run short of salt water unless salt arrives | Buy 40 kg · $120 · Raise budget |
| Out, no reorder coming | Out of salt mix · Needs you | "Rosa couldn't reorder salt mix — today's $150 stock budget is spent. Salt mixing stops after the batch in the tank." | Now: salt water {30} gal, plus 30 gal mixing (ready 10:00 PM) · Day 39 · 40: morning water changes go ahead as normal · Day 41: 8:00 AM, 5 marine tanks need 24.9 gal, only 8 gal left; 3 of their changes are skipped, not done weak (§9.2; the boards shorten this to "Their changes are skipped") | Buy 40 kg · $120 · Raise budget |
| Arriving (budget now covers it) | Salt mix arrives at 3:00 PM / tomorrow, 9:00 AM · Look soon | "Rosa buys 40 kg ($120) at her next check now that the budget covers it." | Now … · 3:00 PM or Day 39: Rosa buys 40 kg · Day 41: no water change is skipped | Buy now · $120 · Staff |

If Rosa's orders are switched off (manual mode, §7.7), the out reason reads "Rosa's orders are switched off, so nobody
reorders salt mix."

**Line card:**

| State | Title | Body | Actions |
|---|---|---|---|
| Before the pause | Royal Blue line pauses tonight · Look soon | "Iris and Sapphire are ready to spawn tonight, but Grow-out B is full. They'll be kept apart until there's room. No animals are lost; the line restarts by itself." + chain | Add a quarantine tank · $95 · Wait · resumes Day 44 |
| Paused | Royal Blue line paused · Look soon | "Grow-out B is full, so Iris and Sapphire are kept apart until there's room. …" + chain | same |
| Decided | Royal Blue line · Quarantine 2 added / you chose to wait · "Resumes Day 42/44" | what happens next | — |

Chain: Breed Tank B "Iris × Sapphire are ready to spawn" (good) ↓ "the next clutch needs 12 places" ↓ Grow-out B · full
"12 of 12 places · sorting on Day 42" (amber) ↓ "then waits for" ↓ Quarantine 1 · busy "Cambodian batch 7 until Day 44"
(amber) — or Quarantine 2 · ready "20 Gallon Long · takes them on Day 42" (good).

**Why the line stops** (with the route strip): "Quarantine 1 serves both betta lines and each batch stays 7 days, so the
Royal Blue juveniles can't start quarantine until Day 44. Grow-out B stays full until then." · With a second quarantine
tank → Resumes Day 42 · If you wait → Resumes Day 44 ("one clutch starts 6 days late; no animals are lost").

Nothing left: "Nothing needs you right now" / "Shortages and stopped lines show up here first."

### 7.7 Manual mode [Final · Manual mode]

- **On:** banner "Manual mode is on" · "Since {time}. Nothing is moved, changed, made or listed until you resume. It
  stays on until you turn it off." (when some systems are resumed: "{n} of 5 systems are on hold.") · **Resume all**.
- **Off:** card "Manual mode is off" · "Hold all stops the automation below until you resume: nothing is moved,
  changed, made or listed. Life support and keepers keep running." · **Hold all**.
- **On hold / What Hold all stops** (one row per system, status and a per-row Resume or Hold):
  Water changes ("17 tanks skip tomorrow's 8:00 AM change") · Salt mixing ("The 10:00 AM batch won't start" before
  10 AM; "Tonight's batch waits in the mixing tank" after) · Live food ("Cultures keep growing; no harvests or doses") ·
  Autofeeders ("6 tanks · keepers feed on their rounds") · Production lines ("No moves, sorting or new listings").
- **Always running:** Filters, heaters and lights · Auto Top-Off on 5 marine tanks · Keepers' rounds at 8:00 AM and
  6:00 PM · Auctions already on the market · **Rosa's orders** switch ("Food and salt keep coming within her budget").
- **Still to sort out** (while on): the open items with **Open** → `#/operations/issues` (e.g. "Out of salt mix ·
  Manual mode doesn't buy salt for you").
- Hold all is immediate (no confirm): a toast says "Manual mode on · Automation is on hold · Filters, heaters, lights,
  top-off and keepers keep running." and the panel opens `#/operations/manual`. Resuming the last held system turns
  manual mode off ("Manual mode off · All automation is running again.").
- Held systems show "Held" everywhere they appear (tank chips, tabs, the map, tank card notes).

### 7.8 Locked pages

Dashed card: icon, "The Water room isn't built yet" / "The Live food room isn't built yet" / "Problems open with the
Operations Desk" / "Hold all opens with the Operations Desk", Locked "Tier {n}" + New chips, the tier's description,
"Links to this page keep working; they show this until it opens.", and its requirements with lock icons; phone adds the
ladder list.

Once the Overview uses the layout "before the Operations Desk" (§7.1), the Problems and Hold all pages list Tier 5's
requirements in the same way (met ones ticked; the sample: only "Research Operations Desk · $2,400 · 3 days" is left)
and show the Overview's What opens up next card (with its Research link) instead of the early ladder, on phone and
desktop. They stay locked while the research runs.

## 8. Around the app

### 8.1 Tanks panel [Final · Automation chips on the Tanks panel]

Subline "{n} aquariums · {n} animals · {n} young". Each tank row adds automation chips after its residents: Auto-feed,
Auto-clean, Top-off, Live-food doser and its line ("Royal Blue · Raise"). Chip tones: aqua when running, amber when
held or paused ("Auto-feed held", "Auto-feed paused", "Royal Blue · Paused"), neutral when off ("Auto-clean off").
A row with a problem adds the reason line in amber ("Royal Blue line pauses tonight: 12 of 12 places.") and a **Why**
link. Ember's Tank keeps its **Tank card** button. The list ends "{n} more tanks, all healthy" with **On the map** →
`#/operations/map`. Early: Ember's row shows Auto-feed (and Auto-clean once owned).

### 8.2 Tank card

The header badges add the same chips (Auto-feed, Auto-clean). Equipment › Automation (0.5 §10) adds amber notes while
held: "Held by manual mode — keepers feed Ember on their rounds." and "Held by manual mode — tomorrow's change waits."
Once the Water room exists, the Auto-clean subline ends "· water from the Water room".

### 8.3 Alerts bell [Final · Problems in the alerts bell]

The drawer gains an **Automation · {n}** section at the top with an **Operations** link → `#/operations/issues`:
a manual mode row when on ("Manual mode since {time} · {n} of 5 systems held" · Open), then the salt and line items as
compact issue cards with their main action and **Details** (phone label "Add QT tank · $95"), or "Automation is running
smoothly." Then the 0.5 Tanks section ("All 17 tanks look healthy." or the Auto-feed row) and Recent events (hatchery
harvests, water changes, salt batches, Rosa's purchases, auctions ended), newest first.

**Before the Operations Desk [Final · Alerts before the Operations Desk]:** the same section and items, but the
Operations link opens `#/operations` (the Overview), and each item's Details becomes the tab with the problem: **Water
tab** (`Droplets` icon) for salt, **Feed tab** (`Egg` icon) for live food, **Lines tab** (`Factory` icon) for a line.
Purchases stay as quick actions (Buy 40 kg · $120); fixes that belong to Problems don't ("Add a quarantine tank · $95" is
left out).

### 8.4 Build › Facility [Final · Water room machines in Build › Facility]

- **Facility tab:** "Your facility" card (level name, "Next: {level}", line slots and the stock budget cap), then
  **Rooms**: Water room (New, status) → `#/build/facility/water`; Live food room (New, status) → `#/build/facility/food`;
  a link row "Buy and upgrade machines here. Operations runs them day to day." → Operations. Early: rooms dashed with
  their requirements.
- **Water room:** back "Facility", header card, link row "Levels, schedules and daily use are in Operations › Water."
  (Open), the two reserves, and Machines with upgrades: Water Prep Station "Faster · $380", Reservoirs
  "+150 gal · $240" (placeholder prices, decision 17), Salt Mixing Station status.
- **Live food room:** back, header card, link row to Operations › Feed, Machines (Brine Shrimp Hatchery "Add a cone",
  Infusoria jars "Add a jar", Live-food dosers × 3 "Add a doser"; prices for the economy lane) and "Each day" (makes,
  uses, takes).

### 8.5 Market › Supplies [Final · Home-grown food in Market › Supplies]

Sections **Live food** (link "Live food room"): Live Baby Brine Shrimp and Infusoria Culture rows with a violet
**Home-grown** chip, mini cycle bars, "{n} servings · makes x, uses y a day", **Hatchery** and **Buy · $8 / $5** (store
packs still work); **For the cultures:** Brine shrimp eggs (New, Buy · $18), Blanched Vegetables ("Also feeds the jars",
Buy · $3), Marine salt mix (below); **Dry food:** one row per Autofeeder food ("Autofeeder · {n} tanks", "Rosa Duarte
restocks it"). `#/market/supplies/:foodId` scrolls to the row and outlines it.

**Marine salt mix [Final · Salt in 5, 20 and 40 kg bags] (decision 16):** status chip (OK · Low · Out · Due {time}),
"For the Water room · 3.5 kg a day · $3 a kg", a full-width status line in the status colour, then a group of three
sizes (`role="group"`, "Buy marine salt mix"): **5 kg · $15**, **20 kg · $60** and **40 kg · $120** (gold; the new
size). Status lines: low "4.1 kg · 1 batch left · Rosa's $150 budget won't cover it today" (or "… · Rosa reorders 40 kg
at 3:00 PM / tomorrow, 9:00 AM" when the budget covers it); out "0 kg · Rosa can't reorder"; arriving "0 kg · Rosa
reorders {time}"; fine "{kg} kg · about {n} days". `#/market/supplies/salt` scrolls to the row and outlines it. A 5 kg
bag can leave the stock low (one batch); every low-salt line then names the real stock and the next batch (§11).

### 8.6 Livestock › Production (several lines) [Final · Production with every line slot used]

Builds on 0.5 §11.1 (header card, four tiles, five stages, line rules, setup flow) and ADR-0005 decision 6:

- A **line picker** under the tabs (pn strip of line names; route `#/livestock/production/:lineId`). With one line the
  strip shows its full name ("Betta line"); with several, the names drop "line" ("Cambodian · Royal Blue · Snowflake ·
  Golden"). A caption under the strip counts the slots: while a slot is free the strip ends with **+ New line** (§8.6.1)
  and the caption says "{used} of {n} line slots · {level}" ("1 of 2 line slots · Specialty Shop"); when every slot is
  used it says "{n} of {n} line slots · more at {next level}" ("4 of 4 line slots · more at Destination Aquarium"), and
  at the last level "8 of 8 line slots · Grand Hall". The 0.5 single-line view (Hobby Room) has no strip, only the
  caption "1 of 1 line slot · more at Specialty Shop". "+ New line" is an item of the 0.5 pn strip, so it keeps the
  strip's 36px height (§3).
- The selected line: header card (pair, name, status, switch shared with Operations › Lines), an amber note while the
  line is held up ("Pauses tonight: Grow-out B is full." · Fix), four tiles (Next clutch, Growing out, Quarantine, This
  week), the five stages (Raise names the feeding: "12 juveniles · Micro Pellets 3× a day from the Autofeeder",
  "180 larvae · baby brine and infusoria from the doser"), the route strip, and **Line rules** per line (Pause when a
  tank is full · Never sell Prismatic animals · List automatically).
- A link row: "Status, bottlenecks and routes for all four lines are in Operations › Lines."
- Desktop at 576px wraps the stages into a grid (minimum 190px per stage); maximised shows them in one row.

The owner chose to count this for DESIGN-S3C-LINES' line cards and detail view, with each extra line set up through the
0.5 §11.1 steps (decision 14). The other per-line settings master §9 S3-C lists (keeper tank, trait-based keep rules,
sale reserve, statistics) are covered by those set-up steps and the Line rules where they overlap; anything left over
is for intake to map, without new screens.

#### 8.6.1 Setting up another line [Final · New line, step 1–3]

Drawn on Day 12, the day the Specialty Shop opens line slot 2 (§16.1). **+ New line** opens `#/livestock/production/new`
in the Production tab ("+ New line" selected in the strip). With no free slot the route is not found, like an unknown
line id (§6). The flow is the 0.5 §11.1 setup, once per line:

- **Header card:** "New line" (serif) and an aqua chip "Line slot {k} of {n}"; a stepper 1 Choose a pair · 2 Choose
  tanks · 3 Rules (phone: Pair · Tanks · Rules). Done steps show a tick, the current step is filled aqua and carries
  `aria-current="step"`.
- **1 · Which pair breeds?** "Only adult pairs that can breed together are listed." Radio rows (64px): both portraits,
  names, species, where they live, and a status: "Saffron × Amber · Pea puffer · in Puffer Breeder · both adults ·
  Ready"; a pair that already runs a line is listed but disabled ("Blaze × Cinder · Betta · already runs the Betta line
  · In a line"). A dashed row: "Need another pair? Buy a mate, then come back." · Shop. On phone the status sits under
  the text.
- **2 · Where does each stage happen?** One row per stage: Breed, Raise, Quarantine, Keepers. Each shows the chosen tank,
  its size and why it fits, a status, and opens the list of tanks: Puffer Breeder "20 gal · Saffron × Amber live here"
  Fits; Puffer Grow-out "10 gal · room for 12 young" Fits; Quarantine "5 gal · shared with the Betta line, one batch at a
  time" **Shared** (amber); Quiet Corner "5 gal · Prismatic and kept young move here · room for 2" Fits. Footnote: "Tanks
  are checked for water type, temperament and space. A tank can serve several lines, but not two stages of the same
  line."
- **3 · What the line breeds and sells:** four 48px fields. **Breed for** (a select of the pair's reachable morphs:
  "Golden pea puffers"), **Line name** (a text field, "Golden line", hint "Lines are named after what they breed for. You
  can rename it."), **Sort** (shows the keep rules as chips, "Keep Prismatic · Sell the rest") and **Sell** ("Auctions ·
  reserve at fair value −10%"); Sort and Sell open the 0.5 §11.1 sort and sell editors (keep rules, the sale reserve).
  Then **Line rules** with the three switches. Desktop puts Breed for and Line name side by side.
- **Actions** stay pinned while the step scrolls (phone: above the tab bar; desktop: the panel's footer): step 1 "Next:
  choose tanks"; step 2 Back · "Next: rules"; step 3 Back · **Start line** (`Play` icon). Start line creates the line,
  opens `#/livestock/production/{lineId}` and shows the toast "{Line name} started".
- **Moving around:** all three steps share the route. The flow's Back goes to the previous step; the browser's Back,
  Esc (closes the panel, 0.5 §6) or picking another line in the strip leave the flow, and the unfinished line is
  dropped without asking (nothing is created before Start line). The boards for steps 2 and 3 are scrolled to the
  stepper, so the strip is above them.
- **Names and ids.** A line is named after the morph it breeds for ("{Morph} line"). While the player has one line it
  keeps the 0.5 name "{Species} line"; when a second line starts, a line still on its default name takes its morph name
  (the Betta line becomes the Cambodian line), and names the player typed stay. The route id is the first word of the
  morph's name in lower case (`cambodian`, `royal` for Royal Blue, `snowflake`, `golden`), with `-2`, `-3` when taken;
  `new` is reserved.

### 8.7 Visitors › Staff

Rosa Duarte card ("Stock manager · skill 3 · checks the shelves at 9 AM and 3 PM", On shift) with **Daily stock budget**
(the existing budget control, any whole-dollar amount up to the level's max; the prototype offers $150 · $300 · $450 ·
$600 as stand-ins), "Spent today: ${x} of ${budget} · up to $600 at a Public Showroom", and a status line: green
"Covers food ($141) and a 40 kg order of salt mix ($120): she buys it at her {next} check." or amber "Food takes $141
of it, so salt mix doesn't fit (5 kg is $15). $261 covers food and her 40 kg order." (Between the two she buys what
fits in 5 kg steps, §9.6.) Then the aquarists (rounds at 8 AM and 6 PM).

### 8.8 Research

A **Facility** section in Research › Research with three new projects: Central Water Supply ($900 · 1 day; "A Water
room: prepared fresh and salt water piped to every tank."; needs Specialty Shop), Live Food Cultures ($1,400 · 2 days;
"A Live food room: hatch baby brine shrimp and grow infusoria for fry."; needs Central Water Supply and the Breeding
Programme), Operations Desk ($2,400 · 3 days; "Problems first, weekly money, schedules and Hold all in Operations.";
needs Aquarium Store). Costs and times are placeholders in line with the repo's research table; the economy lane sets
them (decision 17).

Each row follows the Genetics Lab row: icon chip, serif name, New chip, description, requirements, cost and time on the
right. **Locked:** requirements with lock icons. **Available** (requirements met, not started): requirements with green
ticks and a **Start** button (44px) under the time, e.g. the Operations Desk on Day 38 before it's researched ("✓
Aquarium Store"). **Researching:** the repo's in-progress research state (progress and days left) in place of Start; the
Overview's ladder says "Researching Operations Desk · {n} days left" and the Problems and Hold all pages stay locked
until it completes. **Complete:** a tick in the icon chip and a Complete chip.

### 8.9 Notifications

A sixth category in Settings › Notifications: **Automation** · "Shortages, paused lines and manual mode"
(`notify-cat-auto`, on by default). Templates: "Out of salt mix" / "Rosa couldn't reorder salt mix — today's stock
budget is spent. Salt water lasts until Day {d}." → `#/operations/issues`; "Royal Blue line paused" / "Grow-out B is
full, so Iris and Sapphire wait. It restarts by itself on Day {d}." → `#/operations/issues` (before Tier 5, the tab
where the problem is, §7.1). Quiet hours and rate limits (0.5 §12.2) apply to every Automation notification, including
shortages (decision 19): the forecast warns days ahead, so they wait for the morning.

### 8.10 Panels not touched

Shows, Social, Encyclopedia and the rest of Visitors, Market and Build are unchanged. (The prototypes show them with the
0.5 Day 4 sample and a note saying so.)

## 9. Simulation behind the screens

All of this runs from game time, deterministically, with last-run markers so a save/load or catch-up never repeats a job
(master S3-D rules). Offline catch-up runs the same steps in order.

### 9.1 Tiers and unlock gates

| Tier | Opens with | Gives |
|---|---|---|
| 1 Assisted care | Better Life Support (repo research, $250), or husbandry mastery (repo unlock rule) | Autofeeder; Auto Water Changer (0.5) |
| 2 Water room | Specialty Shop (100 reputation) **and** research Central Water Supply | Water Prep Station, Reservoir, Salt Mixing Station; Operations › Water |
| 3 Live food room | research Live Food Cultures (after Central Water Supply and the Breeding Programme) | Hatchery, jars, dosers; Operations › Feed |
| 4 Breeding facility | line slots by level (decision 18; new, the repo has no slot rule yet): Hobby Room 1 · Specialty Shop 2 · Aquarium Store 3 · Public Showroom 4 · Destination Aquarium 6 · Grand Hall 8 | several lines sharing tanks |
| 5 Operations | Aquarium Store (180 reputation) **and** research Operations Desk | Problems view, weekly money, Today, Hold all |

### 9.2 Water room

- **Prep:** the Water Prep Station adds 6 gal an hour of conditioned fresh water to the fresh reserve (cap 150 gal) while
  it isn't full.
- **Salt mixing:** at 10:00 AM and 10:00 PM, if salt water is below 60% of its reserve, the mixing tank is empty and
  there is salt mix for a batch, the Salt Mixing Station starts a **30 gal** batch: it draws 30 gal from the fresh
  reserve and exactly **4.1 kg** of salt mix at the start (30 gal × 3.785 L × 0.036 kg/L = 4.09 kg, rounded up to the
  next 0.1 kg, so 4.1 kg in stock is exactly one batch and leaves 0) and finishes 12 hours later.
- **Overflow:** a finished batch tops the salt water reserve up to its capacity; what doesn't fit stays in the mixing
  tank and refills the reserve as it's used. Because a new batch needs an empty mixing tank, the station makes what the
  tanks use over time: the daily flows (fresh water to the mixer 25.9 gal, salt mix 3.5 kg) are averages, not every
  day's draw. In the sample, the 10:00 PM batch on Day 38 brings the reserve to 60 gal and leaves 0.5 gal in the mixing
  tank, which cone B's 6:00 AM restart uses.
- **Use:** at each tank's lights-on (8:00 AM in the sample) every Auto Water Changer takes 10% of its tank from the
  matching reserve (fresh or salt), tank by tank in `state.tankOrder`; Auto Top-Offs take fresh water as needed (3 gal
  a day in the sample); each hatchery cone takes 0.5 gal of salt water when it restarts.
- **Shortage:** a change that can't get its full 10% is **skipped, not done weak** (as keepers do today); later tanks
  that still fit get theirs. The shortage item shows ahead of time (§9.8). Sample, Day 41: 8.2 gal covers Seahorse
  Kelp (5.5) and Larvae Tub (2.0); Reef Lagoon, Clown Pair and Marine QT are skipped.
- **Gallons on screen** are rounded down to whole gallons (8.2 shows as 8, 30.5 as 30).
- **Salt is used once, at mixing.** Once a Water room exists, Auto Water Changers draw only from the reserves: a marine
  change uses prepared salt water and no salt from the shelf, and there's no fallback to mixing per change. Without a
  Water room, AUTO-010's rule stands (salt used as in a manual change). The player's own water change and keepers'
  urgent changes work as today and don't draw on the reserves (proposed; AUTO-012 leaves this to this design).
- Daily sample: fresh 53.4 gal (24.5 + 25.9 + 3), salt water 25.9 gal (24.9 + 1), salt mix 3.5 kg.

### 9.3 Live food room

- **Hatchery:** each cone runs 24 h. At start it takes **1 scoop of Brine shrimp eggs** and **0.5 gal of salt water**;
  at harvest it adds **20 servings of Live Baby Brine Shrimp** (`baby_brine_live`, the same item as a store pack) to stock.
  Baby brine keeps 1 day.
- **Jars:** each jar runs 72 h. At start it takes **1 serving of Blanched Vegetables** (`blanched_veg`); at harvest it adds
  **15 servings of Infusoria Culture** (`infusoria_culture`). Infusoria keeps 2 days.
- **Dosers:** a doser on a tank feeds its fry or larvae from live-food stock at feeding times, by need (sample: Larvae
  Tub 26 brine + 4 infusoria a day; Puffer Grow-out 8 + 8). A doser with nothing to feed is Idle.
- **Shortage:** a cone or jar that can't start (no eggs, vegetables or salt water) waits and raises a shortage item; a
  doser with empty stock skips and raises one.
- Stock bought in Market and home-grown stock are the same items; dosers and keepers use whichever is in stock.

### 9.4 Feeding

The Autofeeder stays **dry food only** (repo). Live food comes from dosers or from keepers' rounds. Tanks with neither
are fed by keepers (frozen and live foods by hand).

### 9.5 Lines (S3-C, extended)

0.5 §11.3 still applies per line. Additions:
- **Shared tanks:** several lines may use the same tank (Quarantine 1 serves both betta lines). A quarantine tank takes
  one batch at a time for 7 days.
- **Capacity pause:** with "Pause when a tank is full", a line whose grow-out tank is full keeps its pair apart and shows
  Paused (the line, Breed Tank B "Pair waits"); it restarts by itself when the grow-out tank empties. The sim computes
  the restart day from the schedule (sorting day, quarantine free day) for the screens.
- **Adding capacity:** a new quarantine tank assigned to the line lets the sorted juveniles move on the sort day, so the
  restart moves earlier (Day 42 instead of 44 in the sample).
- **Paused by you:** the switch stops new breeding, moves and listings; animals stay where they are.

### 9.6 Stock manager and shortages

- **Repo today:** Rosa's shelf checks sort her orders by urgency (days of stock left; foods with nothing in stock
  first) and buy within today's remaining budget and the cash on hand. Salt mix is bought in 5 kg steps ($15 each) up
  to her order; with less than $15 left she buys none and logs "Budget spent — salt mix waits for tomorrow". Her salt
  order keeps two rounds of 25% water changes on the marine tanks (three for a planner).
- **With a Water room (decision 15):** salt is used by the Salt Mixing Station, so (1) salt's urgency counts the days
  until a water change would be skipped, including the salt water already in the reserve and the mixing tank, and
  (2) her order follows the mixer's use. In the sample that's about three days, so the day's food (less than a day
  left) is bought first, and the order is **40 kg ($120)**, about 11 days at 3.5 kg a day. The exact formulas are for
  the sim lane; the sample must come out as shown.
- **The sample:** food takes $141 of the $150 budget at 9 AM, so $9 is left and no salt fits. $261 or more covers
  the whole 40 kg; anything between buys part of it in 5 kg steps ($200 buys 15 kg for $45). The boards' copy
  "won't stretch to a sack today" describes this sample.
- A **shortage** is a tracked resource that has run out or will run out before the next possible restock: salt mix,
  brine shrimp eggs, vegetables, live food for a doser, water in a reserve.
- **Forecast:** the sim dry-runs Rosa's next check (what she'd buy with what's left of today's budget, in her order)
  and, when the salt order wouldn't fit, shows the Low item before the check happens, as the 8:36 AM boards do (§7.6);
  after the check, the item reflects what she actually bought.
- **Raise budget:** a higher budget takes effect at Rosa's next check (9 AM, or 3 PM at skill 3+); the item becomes
  "arrives at {time}".
- **Rosa's orders** (manual mode, §7.7) can be switched off; the repo already pauses orders at a $0 budget, so the
  switch may reuse that or add a flag that keeps the budget.

### 9.7 Manual mode

- `hold` has five flags: water changes, salt mixing, live food (no harvests, starts or doses; cultures keep growing),
  Autofeeders (keepers feed instead), production lines (no breeding moves, sorting or listings). Hold all sets all five
  with a timestamp; each can be resumed alone.
- Never held: filters, heaters, lights, Auto Top-Off, keepers' rounds, auctions already listed. Rosa's orders have their
  own switch (§9.6).
- Held jobs are skipped, not queued: when resumed, systems carry on from their current state on their next scheduled
  time (no catch-up burst). Manual mode is saved and stays on across sessions.

### 9.8 Problems

| Item | Tone | When |
|---|---|---|
| Salt (or any supply) **low** | watch | stock covers less than two days (or one batch) and no reorder is coming |
| Supply **out** | danger | stock is zero and no reorder is coming |
| Supply **arriving** | watch | stock is zero (or low) and a reorder is due at the next check |
| Line **pauses tonight / paused** | watch | the line can't start its next clutch for capacity; until the player adds capacity or chooses to wait |

The count of open items drives the Overview header, the Operations sub-line ("{n} to look at" / "{n} problems"), the tab
and dock dots, the More row and the bell (§5.4). Choosing "Wait" or adding capacity turns the line item into a plain
status ("Resumes Day {d}").

### 9.9 Anti-dupe and idempotency notes

Each machine job (batch start/finish, cone and jar start/harvest, doser feed, water change, shelf check) is keyed by its
scheduled game hour and stored as a last-run marker; a job never runs twice for one crossing. Harvests add stock once;
starts consume once. Line moves use the S3-C invariants (one creature in one stage, one listing per event).
Jobs due in the same game hour run in a fixed order (water changes, top-off, hatchery cones, jars, doser feeds, salt
mixing, shelf check), so stock enough for one job goes to the first and the rest report a shortage (AUTO-022). The
invariants AUTO-016 to AUTO-027 apply to every job above; this design adds no cut-off for automated moves beyond
AUTO-019's (lines move animals only into tanks validated at setup).

## 10. Data model (proposed; reconcile during intake)

```ts
// GameState additions (all optional; absent = not built)
facility.water?: { fresh: number; salt: number;          // gallons in each reserve
  freshCap: number; saltCap: number; prepRate: number;   // gal, gal, gal/h
  batch?: { startedHour: number; gal: number } | null; lastMixCheckHour: number };
facility.food?: { cones: { startedHour: number | null }[]; jars: { startedHour: number | null }[];
  dosers: Record<TankId, { on: boolean; lastFeedHour: number }> };
inventory.brineEggs?: number;                              // scoops (new supply 'brine_shrimp_eggs')
automation?: { hold: { water: boolean; salt: boolean; food: boolean; feeders: boolean; lines: boolean; since: number | null } };
// research ids: 'central_water_supply' | 'live_food_cultures' | 'operations_desk'
// notification category: 'auto'
// production: S3-C ProductionState with several lines; restart day derived, not stored
```

Equipment/machine definitions follow the catalog pattern (`id`, `name`, `price`, `upkeep`, `unlock`). Upkeep from the
design: Water Prep Station $0.40/day, Salt Mixing Station $0.30/day; Auto Water Changer $0.06/day (0.5).

## 11. Copy deck

Strings not already quoted above. Braces are values; keep the "·" separators.

| Where | String |
|---|---|
| Operations sub (phone) | "{Level} · {n} tanks · {n} lines" · "{Level} · {n} problems" · "Manual mode · automation on hold" · early "Hobby Room · 5 tanks · 1 line" |
| Operations sub (desktop) | "{Level} · {n} tanks · {n} lines · {n} to look at" (or "· {n} problems") · "{Level} · manual mode · automation on hold" |
| More row | "Operations" · "{n} problems · {n} lines" · "{n} to look at · {n} lines" · "Manual mode on · automation on hold" · "{n} lines running · {n} tanks" · early "Overview, your line and the map" |
| Hold buttons | "Hold all" (desktop header; phone Manual mode tile) · "Resume all" · "Resume" · "Hold" |
| HUD | "Manual mode" (`aria-label` "Manual mode is on. Open it") |
| Map | "Show" · "All" · "Water" · "Food" · "Animals" · "Tap a room to see what's in it." · "Select a room, machine or tank to see its details." · "Manual mode: dashed grey pipes are on hold." |
| Toasts | "Bought · $120" / "40 kg of marine salt mix" / "The salt mixer can start its next batch." · "Set up · $95" / "Quarantine 2 · 20 Gallon Long" / "The Royal Blue juveniles move in on Day 42 and the line restarts." · "The Royal Blue line waits" / "It restarts by itself on Day 44. No animals are lost." · "{Line} paused" / "Animals stay where they are; nothing new is bred or listed." |
| Locked tiles | "Water room" / "Fresh and salt water for every tank" · "Live food" / "Baby brine shrimp and infusoria for fry" · "More lines" / "A second line at a Specialty Shop" · "Operations tools" / "Problems, weekly money and Hold all" |
| Tier ladder | "What opens up next" · "Specialty Shop (42 of 100 reputation) · research Central Water Supply, $900" · "Research Live Food Cultures" · "1 line now · 2 at a Specialty Shop" · "Aquarium Store · research Operations Desk" |
| Before the Operations Desk | Operations tools tile "Problems first, weekly money, Today and Hold all" · next-up card "What opens up next" · "Research" (link) · "Research Operations Desk · $2,400 · 3 days" · "Aquarium Store: you're past it" · "Aquarium Store · {rep} of {needed} reputation" · "Researching {project} · {n} days left" · Tier 5 "Operations" / "Bottlenecks, schedules, weekly money, manual mode" (the tier ladder's description) · bell actions "Water tab" · "Feed tab" · "Lines tab" |
| Room view | "Reset view" · "Facility map" (group `aria-label` "Room view") |
| Low salt (any stock) | "{kg} kg: enough for the {time} batch, then none." ("the 10:00 AM batch" before it starts, "tomorrow's 10:00 AM batch" after it, in the sample) · Problems timeline "{time}" / "The batch uses the last {kg} kg." or "{day}" / "{time}: the batch uses 4.1 kg; the {kg} kg left won't make another." then "Day {d}" / "8:00 AM: the marine tanks run short of salt water unless salt arrives." |
| Salt sizes | "5 kg · $15" · "20 kg · $60" · "40 kg · $120" (group `aria-label` "Buy marine salt mix") · toasts "Bought · $15" / "5 kg of marine salt mix" and "Bought · $60" / "20 kg of marine salt mix", each with "{kg} kg in stock · enough for {n} batch(es)." (n = whole 4.1 kg batches in stock) |
| Line slots | "{used} of {n} line slots · {Level}" · "{n} of {n} line slots · more at {next level}" · "8 of 8 line slots · Grand Hall" · "1 of 1 line slot · more at Specialty Shop" · "+ New line" |
| New line | "New line" · "Line slot {k} of {n}" · steps "Choose a pair" · "Choose tanks" · "Rules" (phone "Pair" · "Tanks" · "Rules") · "Which pair breeds?" · "Only adult pairs that can breed together are listed." · "Ready" · "In a line" · "Need another pair? Buy a mate, then come back." · "Shop" · "Where does each stage happen?" · "Breed" · "Raise" · "Quarantine" · "Keepers" · "Fits" · "Shared" · "Tanks are checked for water type, temperament and space. A tank can serve several lines, but not two stages of the same line." · "What the line breeds and sells" · "Breed for" · "Line name" · "Lines are named after what they breed for. You can rename it." · "Sort" · "Sell" · "Next: choose tanks" · "Next: rules" · "Back" · "Start line" · toast "{Line name} started" |
| Research | "Start" · toast "Research complete" / "Operations Desk" / "Problems first, weekly money, Today and Hold all are in Operations." |

## 12. Visual specification

Reuse the 0.5 tokens (§17 of the 0.5 spec): glass panels, aqua accent `#5eead4`, watch `#fbbf24`, danger `#f87171`,
good `#4ade80`, violet `#b69cff`, gold `#f5c451`, Fraunces titles, Inter UI. New components:

- **Status badge:** icon + word, 0.5 badge style; tones good / watch / danger / neutral / aqua / violet.
- **Meter:** label row (icon, label, New chip, status), value "{v} / {cap} {unit}", 6px bar, hint.
- **Stage track:** five 5px segments with labels; current lit aqua (amber when held up), done segments 45% aqua.
- **Issue card:** 18px radius; danger border `rgba(248,113,113,.42)` with a red-tinted gradient, watch border
  `rgba(251,191,36,.34)`; optional "when" table (86px time column).
- **Route strip:** 8px line dot, 26px pill chips joined by 13px chevrons; problem chips amber border + warning icon.
- **System tile:** 16px radius card; amber/red border when its status is watch/danger.
- **Map:** areas 18px radius (phone 14) with uppercase 10.5px titles; tank tiles 10px radius with marine/fresh
  gradients; machines 12px radius 50px tall; pipes 2–3px (food dashed 5/4); joints 7px dots; bridges where pipes cross;
  selection ring 2px aqua + glow. Line colours: Cambodian coral, Royal Blue blue, Snowflake aqua, Golden gold.
- **Manual mode amber:** border `rgba(251,191,36,.5)`, fill `rgba(52,38,10,.72)`, text `#ffe6a3`.

## 13. Accessibility

- Status always icon + word; numbers have units; the map's tanks and rooms have `aria-label`s; pipes are decorative.
- Tab strips are `role="tablist"`; map layers and line pickers are radio groups; switches are `role="switch"` with
  labels naming the thing ("Run the Royal Blue line", "Rosa's orders").
- Focus order follows reading order; Esc closes sheets and the panel (0.5).
- Closing a sheet returns focus to what opened it: `src/ui/common/Sheet.tsx` focuses `dock-<panelId>` today, so
  Operations works as is on desktop, and Settings needs the gear (`hud-settings`) as its return target.
- Manual mode is announced in the toast and visible as a word ("Manual mode") in the HUD, not only by colour.
- Reduced motion: no new animation beyond the 0.5 ones.

## 14. Test ids

Add a "S3-D" section to `docs/TEST_IDS.md` (one table per lane).

| Area | Test ids |
|---|---|
| Navigation | `dock-operations` and `dock-badge-operations` (the existing `dock-<panelId>` patterns), `hud-settings` (gear; replaces `dock-settings`), `more-operations`, `hud-manual-mode`, `room-facility-map` (chip in the room view) |
| Panel | `panel-operations`, `ops-tab-<overview\|water\|feed\|lines\|map>`, `ops-hold-all`, `ops-sub` |
| Overview | `ops-problems`, `ops-problem-<salt\|line>`, `ops-problems-all`, `ops-all-clear`, `ops-sys-<water-changes\|water-room\|live-food\|feeding\|lines\|keepers\|manual>`, `ops-week`, `ops-today`, `ops-early-locked-<water\|food\|lines\|tools>`, `ops-ladder` |
| Water | `water-meter-<fresh\|salt\|saltmix>`, `water-buy-salt`, `water-flows`, `water-schedule`, `water-machines` |
| Feed | `feed-hatchery`, `feed-cone-<A\|B>`, `feed-jars`, `feed-jar-<1-4>`, `feed-dosers`, `feed-buy-eggs`, `feed-buy-veg` |
| Lines | `line-row-<lineId>`, `line-toggle-<lineId>`, `line-status-<lineId>`, `line-route-<lineId>`, `lines-capacity`, `lines-upcoming` |
| Map | `map-layer-<all\|water\|food\|animals>`, `map-room-<water\|supplies\|food\|breeding\|quarantine\|gallery\|market>`, `map-tank-<tankId>`, `map-details`, `map-room-sheet`, `map-add-qt` |
| Problems | `issues-salt`, `issues-line`, `issues-buy-salt`, `issues-raise-budget`, `issues-add-qt`, `issues-wait`, `issues-none` |
| Manual | `manual-banner`, `manual-resume-all`, `manual-hold-all`, `manual-row-<water\|salt\|food\|feeders\|lines>`, `manual-toggle-<…>`, `manual-rosa`, `manual-still-open` |
| Around the app | `tank-chip-<auto-feed\|auto-clean\|top-off\|doser\|line>`, `alerts-automation`, `alerts-automation-link`, `build-facility-room-<water\|food>`, `build-room-back`, `supplies-row-<foodId>`, `staff-stock-budget`, `staff-budget-status`, `production-line-<lineId>`, `research-facility-<id>`, `notify-cat-auto` |
| Accepted additions | `camera-room-reset` (exists) beside `room-facility-map`; `ops-next-up`, `ops-next-up-research`, `ops-locked-tools` (before the Desk); `alerts-item-tab-<water\|feed\|lines>`; `supplies-salt-buy-<5\|20\|40>`; `production-slots` (caption), `production-add-line`, `production-new-step-<1\|2\|3>`, `production-new-pair-<pairId>`, `production-new-tank-<breed\|raise\|quarantine\|keepers>`, `production-new-breed-for`, `production-new-name`, `production-new-back`, `production-new-next`, `production-start-line`; `research-start-<id>` |

## 15. Tests: new, changed and at risk

**New unit tests (sim):** water room flows (prep refill, batch start conditions at 10 AM/10 PM, fresh draw, salt use,
12 h completion, one batch at a time); water changes from reserves and the skip-not-weak rule; hatchery and jar cycles
(consume once at start, add once at harvest, expiry); dosers by need and idle; shortage detection, forecast and the
"arriving" state after a budget raise; manual mode holds and per-system resume with no catch-up burst; shared quarantine
scheduling, capacity pause and restart day (Day 42 vs 44); idempotency across save/load and offline catch-up for every
job; anti-dupe invariants.

**New e2e:** dock has 11 items with Operations in slot 8 and no `dock-settings`; the gear opens Settings; More shows
Operations first; every route in §6 (including locked pages early); Overview problems → Problems → Buy salt / Raise
budget / Add quarantine tank / Wait; Hold all → HUD pill → Resume all; Map layers and selection (desktop) and room sheets
(phone); the phone tab strip fits five tabs at 390px and scrolls with the selected tab in view at 360px; status words
present (no colour-only status); the room view's "Facility map" chip opens the Map and closing the Map returns to the
room view. Before the Operations Desk (the Day 38 sample with the Desk not researched, plus a Specialty Shop save with
a Water room and no Aquarium Store): Overview tiles with status, the Operations tools tile and the
next-up card, no Hold all or Manual mode tile; `#/operations/issues` and `#/operations/manual` show their locked pages;
the bell's Water tab / Lines tab links; notifications open the tab; Research › Start on the Operations Desk, then three
days, unlocks the Problems view. Supplies: buying 5, 20 and 40 kg of salt, and the low-salt copy after a 5 kg bag. Production: the slot
caption at a full and at a free level; + New line → the three steps → Start line creates the line and opens it (Day 12
fixture, §16.1), and the first line's default name becomes its morph name.

**Changed / at risk:** tests that find Settings in the dock: `tests/e2e/helpers.ts` `openPanel()` clicks `dock-<panelId>`,
so `openPanel(page, 'settings')` in `tests/e2e/save.spec.ts` and the panel loop in `tests/e2e/boot.spec.ts` need the gear
(`hud-settings`); `docs/TEST_IDS.md` lists `settings` under `dock-<panelId>`; More sheet geometry; the dock-width checks (§5.1: same item count, wider Operations label); the room view's chips (`RoomChips.tsx` gains "Facility map"; `view-toggle` itself is unchanged); Production tests that assume one line card (0.5 §11) or no caption; Supplies tests that count the salt buttons (40 kg joins 5 kg and 20 kg).

## 16. The sample facility (Day 38, Public Showroom)

Used by every final board and the prototypes (the New line boards use §16.1); fixtures can rebuild it.

- **Tanks (17):** Gallery — Ember's Tank 10 gal (Ember), Planted Showcase 75 gal (22 community fish), Reef Lagoon 125 gal
  marine (14 reef fish), Seahorse Kelp 55 gal marine (4 seahorses), Puffer Stream 20 gal (6 pea puffers). Breeding —
  Breed Tank A 10 (Blaze × Cinder), Grow-out A 40 (12 juveniles, 12/24), Breed Tank B 10 (Iris × Sapphire), Grow-out B 20
  (12 juveniles, 12/12), Clown Pair 29 marine (Sunny × Kai), Larvae Tub 20 marine (180 larvae), Puffer Breeder 20
  (Saffron × Amber), Puffer Grow-out 10 (11 young, 11/12). Quarantine & keepers — Quarantine 1 20 (10 juveniles,
  10/12), Marine QT 20 marine (8 juveniles), Puffer QT 5 (5 juveniles), Quiet Corner 5 (3 protected keepers).
  Freshwater 245 gal in 12 tanks; marine 249 gal in 5. **105 animals** (58 adults + 47 juveniles) and **191 young**
  (180 larvae + 11 fry).
- **Clock and money:** 8:36 AM $48,620 · 9:00 AM Rosa buys food, −$141 · 10:00 AM the salt runs out · visitors from
  10 AM (Public Showroom hours, repo: 10 AM–8 PM) bring $447 in admissions, tips and donations, banked hourly from 11 AM
  · 3:20 PM an auction sells 2 Royal Blue juveniles, +$85 · 6:40 PM **$49,011** · manual mode from 6:52 PM (still
  $49,011; nothing is banked between 6 and 7 PM). Reputation 412. Rent and wages are charged overnight (repo), so they
  don't move the day's money.
- **Water:** fresh 118/150 at 8:36 AM, 96 after the 10 AM batch draw, 148 at 6:40 PM, full about 7:00 PM. Salt water
  31/60 at 8:36 AM, 30.5 after cone A's restart at 6 PM (shown as 30), 30 gal mixing until 10:00 PM, then 60 in the
  reserve and 0.5 in the mixing tank. Salt mix 4.1 kg → 0 at 10 AM. With no salt bought: 8.2 gal left at 8:00 AM on
  Day 41 (shown as 8), when the marine tanks need 24.9 gal (§9.2).
- **Feed:** cones A 61% (ready 6 PM) and B 11% (ready 6 AM) at 8:36 AM; jars 92.5/67.5/42.5/17.5% (72-hour jars 18
  hours apart: ready 2 PM, 8 AM Day 39, 2 AM and 8 PM Day 40); stock 26 baby brine, 31 infusoria, 22 scoops of eggs,
  14 servings of vegetables. Saved this week: the tanks used 238 baby brine and 84 infusoria, $123 at shop prices,
  against $15 to make them: $108.
- **Lines:** Cambodian (Blaze × Cinder; breed day 6/10; raise 12 juveniles day 9/19; QT1 10 juveniles list Day 44;
  10 sold · $290), Royal Blue (Iris × Sapphire, Iris Prismatic; pair ready tonight; Grow-out B day 15/19, sorted Day 42;
  9 sold · $369), Snowflake (Sunny × Kai; larvae day 5/20; Marine QT lists Day 40; 8 sold · $384), Golden (Saffron ×
  Amber; young day 3/15; Puffer QT lists Day 41; 10 sold · $90). Week (ledger entries, Days 31–37): sales $1,133,
  37 sold, supplies & upkeep $136 (salt $75 for 25 kg bought in 5 kg steps; food $45 for the Autofeeders' dry food, a tin
  of eggs and a pack of vegetables; automation upkeep $16), net $997.
- **Staff:** Rosa Duarte (stock manager, $150 budget; $141 of food at 9 AM), Joy Mendez, Kofi Mensah, Mei Takeda.
- **Early game:** the 0.5 save — Day 4, Hobby Room, 5 tanks, 1 Betta line, $3,320, reputation 42; Ember's Tank has an
  Autofeeder (34 servings), no Auto Water Changer.

### 16.1 Day 12: a second line slot (Specialty Shop)

Used by the three "New line" boards (§8.6.1). Day 12, 9:10 AM, $6,240, reputation 104 (the Specialty Shop needs 100),
20 animals, 1 line (the Betta line, Blaze × Cinder), "1 of 2 line slots · Specialty Shop". Saffron × Amber (pea
puffers, both adult, Ready) live in the Puffer Breeder (20 gal); the Puffer Grow-out (10 gal) has room for 12 young; the
Betta line's Quarantine (5 gal) takes one batch at a time, so the new line shares it ("Shared"); Quiet Corner (5 gal) has
room for 2 more keepers. The new line breeds for Golden pea puffers and is named the Golden line; it sorts Keep Prismatic
· Sell the rest and sells at auction with the reserve at fair value −10%, with all three line rules on. By Day 38 the
Golden line has its own Puffer QT and the bettas use Quarantine 1 (§16).

## 17. 0.5 mismatches found while designing

The owner chose to note these here and leave the 0.5 boards untouched (decision 12). The S3-D prototypes use the
corrected versions.

1. **Fry can't be fed by Auto-feed.** 0.5 §11.1 (stage 2) says "14 fry, fed 4× a day by Auto-feed", but the Autofeeder
   only drops dry food (repo description). Use "14 fry · first foods by hand or on keepers' rounds" (or live food from a
   doser once Tier 3 exists).
2. **"Betta pellets" should be Micro Pellets.** The 0.5 prototype's tank card ("Runs your Autofeeder · betta pellets")
   and Supplies row ("Betta pellets") name a food the game doesn't have; the repo food is Micro Pellets
   (`micro_pellets`, $8, 150 servings). 0.5 §10.2 already takes `{food}` from `pickAutofeedFood`.
3. **"Day 9 of 60" vs a 19-day raise.** 0.5 §11.1 (tile and stage 2) shows "Day 9 of 60"; betta raising is 5 days as fry
   plus 14 as a juvenile. On Day 4 of a new game the fry can't be 9 days old either; use "Next stage in 6 h" (as Eggs &
   fry does) or the real day count.

Also seen (prototype only, informational): the 0.5 Build › Tanks sizes and prices (Nano 10 gal $62, Standard 20 gal
$118, Breeder 40 gal $240) differ from `src/data/catalog/tanks.ts` (10 Gallon $60, 20 Gallon Long $95, 29 Gallon $130,
40 Gallon Breeder $190); the 0.5 Supplies pack sizes for pellets ("40 servings · $6") and frozen bloodworms
("24 servings · $8") differ from the repo (150 servings $8; 60 servings $7); and the 0.5 Visitors header's "Hobby Room ·
open 9:00 AM–6:00 PM" differs from the repo's Hobby Room hours (10 AM–9 PM, `src/data/facilities.ts`). Build from the
repo data.

## 18. Decisions taken and what's left

The follow-up questions were settled on 2026-10-05 (§2 rows 13–22; ADR-0014 records the questions and answers word
for word). What's left:

1. **Approval** (decision 21): after the intake note (`INTAKE.md`, `DESIGN_INTAKE.md` step 2) and an independent review
   (step 4), the owner approves, changes or rejects, recorded word for word in a new ADR (step 5).
2. **Placeholders** (decision 17): the economy lane sets research costs and times, machine and upgrade prices, the egg
   tin and machine upkeep.
3. **Not drawn, specified here:** phone landscape (§5.2) and bigger facilities on the Map (§7.5). Intake checks these
   against the code; neither needs a new design unless the reviewer finds a conflict. The other screens the follow-up
   answers added are drawn in the "Automation · final · Accepted additions" row (Appendix A).
4. **Filled in while drawing those screens** (not asked of the owner; intake and the review may change them): the
   setup flow's details and route `#/livestock/production/new`, the line naming rule and route ids (§8.6.1), the slot
   caption wording (§8.6), the Research "Start" state (§8.8), and the "Why"/"Fix" links that open Operations › Lines
   before the Operations Desk (§7.1).

---

## Appendix A: canvas boards and exported screens

Final rows (each on phone 390×844 and desktop 1440×948; titles "Phone/Desktop · Final · {screen}  ·  #{route}"):
Overview `#/operations` · Water room `#/operations/water` · Live food `#/operations/feed` · Production lines
`#/operations/lines` · Facility map `#/operations/map` · Out of salt and a full grow-out tank `#/operations/issues` ·
Manual mode `#/operations/manual` · Early game `#/operations` · Early game map `#/operations/map` · Automation chips on
the Tanks panel `#/tanks` · Problems in the alerts bell `#/tanks` · Water room machines in Build › Facility
`#/build/facility/water` · Home-grown food in Market › Supplies `#/market/supplies/baby_brine_live`.

Prototype row: "Phone prototype · automation · tap anything" (1000×844) and "Desktop prototype · automation · click
anything" (1820×948).

Accepted additions row (same sizes and titles): Room view with the Facility map chip `#/` · Overview before the
Operations Desk `#/operations` · Alerts before the Operations Desk `#/tanks` · New line, step 1: choose a pair, step 2:
choose tanks, step 3: rules `#/livestock/production/new` · Salt in 5, 20 and 40 kg bags `#/market/supplies/salt` ·
Production with every line slot used `#/livestock/production/cambodian`.

`screens/` (names `<screen>-<state>-<viewport>.png`; 105 files) and their SHA-256s are listed in `SOURCE.md`. The
accepted additions are `home-room-view`, `operations-overview-before-desk`, `alerts-before-desk`,
`livestock-production-new-line-step-1|2|3`, `market-supplies-salt-sizes` and `livestock-production-all-slots-used`
(boards), plus `operations-issues-locked-before-desk` and `research-facility-before-desk` (prototype states).

## Appendix B: the prototype controls

The dark column beside each prototype is not part of the game. **Open a link** jumps to every new route. **Scenario**
switches between Normal day · 8:36 AM, Out of salt + line full · 6:40 PM, Manual mode on · 6:52 PM and Early game ·
Day 4, plus **Operations Desk researched** (on by default; off shows Day 38 before the Desk: tile Overview, locked
Problems and Hold all, bell links to tabs, Research › Start; turning it off in Manual mode switches to the Out of salt
scenario), the 0.5 toggles (Genetics Lab, signed in, Prismatic in stock, Auto-feed paused, low money, guide step) and the
notification permission. **Events:** "Salt runs out · 10:00 AM" and "Grow-out B fills up · 6:40 PM" move the clock
through Rosa's checks and the salt batch, so purchases and budget changes made first carry through; plus the 0.5 events
(Prismatic and hatch alerts, lock the phone, fresh launch, reset).

In the prototypes the tank bar's **Room** button switches to the room view (a stand-in for the 3D room) with Reset view
and Facility map; Supplies sells salt in 5, 20 and 40 kg; Production shows the slot captions.

Prototype simplifications (this document wins): the Staff budget offers four stand-in amounts instead of the game's
budget control; Operations has no Expand button; research finishes at once; no scenario has a free line slot, so
the setup flow is on the boards only (§8.6.1); views the automation layer doesn't touch keep the 0.5 Day 4 sample and
say so.
