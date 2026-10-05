# Aquarium Go 0.5: design and build specification

> **Under the agent harness (2026-10-05).** This spec stays normative for product behaviour. Its process instructions
> (the phase order, the release step and version bump, "no schema bump", lane sign-offs, "paste the whole file into a
> coding assistant") are replaced by the master source of truth; ADR-0003 lists every overridden clause, and
> `DESIGN_REGISTRY.json` records this spec's status. Errata found by the 2026-10-05 review are in
> `docs/agent/BACKLOG.md` (design errata) and are applied through the slice contracts.

- **Status:** the design is approved for build. The code isn't written yet; this document is the brief for writing it.
- **Target release:** v0.5.0. The current release is v0.4.0.
- **Repo:** `GrayGrayson1/aquarium-go`. The local clone is at `/Volumes/Dev/Projects/AquariumGo`, commit `0d9fc5a` (the same as `origin/main` when this was written).
- **Stack:** React 19, @react-three/fiber, zustand and Vite. It deploys to GitHub Pages under `/aquarium-go/`.
- **Design files:** the "Design" canvas in Claude, at https://claude.ai/artifact/SaZzQpkftDTxcZuzZQfgBk. It's private to the owner and holds two live prototypes and 45 static screens; Appendix A lists every screen.
- **Written:** October 5, 2026. Every statement about today's code (paths, line numbers, strings, numbers) was checked against commit `0d9fc5a` twice. Line numbers can drift after that commit; search for the quoted code if one doesn't match.

---

## How to use this document

This is the single source of truth for everything decided about 0.5. You can paste the whole file into ChatGPT, or another coding assistant, and work through it in phases.

1. **Read the ground rules first:** §1 Goals, §2 Decisions and §3 Constraints.
2. **Build one phase at a time** (§21 Phased plan). Each phase lists the files to touch and its acceptance criteria.
3. **Take exact wording from the copy deck** (§16). Take sizes and colours from §17. Take test ids from §19.
4. **Where the prototype and this document disagree, this document wins.** The prototype fakes data so it can demonstrate every state.

How to say things in prompts: "the prototype" means the two interactive artboards in the canvas. "Today" or "existing" means the v0.4.0 code. Paths are relative to the repo root.

---

## Contents

1. Goals
2. Decisions log
3. Constraints and ground rules
4. What exists today and what's new
5. Navigation and information architecture
6. Routing and deep links
7. Shop, offers and Prismatic
8. Genetics expansion (new betta genes)
9. Genetics Lab reveal fix and temperament
10. Automation: Auto-feed and Auto-clean
11. Production line
12. Notifications
13. Accounts and social (stubs)
14. Platform layer
15. Data model changes
16. Copy deck
17. Visual specification
18. Accessibility
19. Test ids
20. Tests: new, changed and at risk
21. Phased implementation plan
22. Risks and open questions
- Appendix A: canvas screens
- Appendix B: using the prototype controls
- Appendix C: genetics numbers
- Appendix D: sources for the betta genetics
- Appendix E: glossary

---

## 1. Goals

The original brief had ten items. Each one maps to a design outcome:

| # | Brief item | What 0.5 delivers |
|---|---|---|
| 1 | Prismatic variants | Prismatic already exists (0.4.0). 0.5 surfaces it more widely: a "Prismatic only" shop filter, alerts when one is stocked, a deep link to the offer, a celebration when you buy one, and a Prismatics leaderboard. |
| 2 | Genetics expansion | Two new betta genes, **Cambodian** and **Metallic**, extending the existing engine without rewriting it. This adds a tenth named strain ("Cambodian Veiltail") and grows the betta catalog from 240 to 540 morphs. Every offer gets a gene panel. |
| 3 | Temperament stats | Temperament and curiosity are already inherited, and the offer's profile already names them in words. 0.5 gives them their own section on every offer, with meters and a line on how they're inherited. Exact numbers appear once the Genetics Lab is researched. |
| 4 | Automation controls | Per-tank **Auto-feed** and **Auto-clean** switches on the tank card. Each is unlocked by owning the right equipment: the existing Autofeeder for Auto-feed, and a new **Auto Water Changer** ($120) for Auto-clean. |
| 5 | Shop and Market UI | "Prismatic only" and "Rare genes" filters with counts, a genes panel and temperament on each offer, destination-tank fit that blocks purchases with no suitable tank, and shareable links to offers. |
| 6 | Navigation and mobile UI | Phones get a tab bar (Tanks · Livestock · Market · Build · More). Desktop keeps the dock and adds Social. Every screen has a link via hash routing, e.g. `#/shop/fish/offer_k3x9`. |
| 7 | Accounts and social (stubs) | Sign-in, clubs with invite links, trading circles, friends' aquariums and weekly leaderboards. All of it runs on a local stub with no server yet. |
| 8 | Platform layer | A small `platform` module for notifications, clipboard/share, app lifecycle and storage candidates. The web version ships first; the design leaves room for a native wrapper later. |
| 9 | Tests | New unit and e2e tests, plus a list of the existing tests that will need updating (§20). |
| 10 | Typecheck and build | No new dependencies. Everything typed. Existing saves keep loading with no schema bump. |

The production line (Livestock › Production) was requested on top of the brief. §11 covers it, and it ships last.

---

## 2. Decisions log

All of these were settled with the owner. Treat them as fixed unless he changes them.

| # | Topic | Decision |
|---|---|---|
| D1 | Phone navigation | A bottom tab bar with **Tanks · Livestock · Market · Build · More**. More opens a sheet holding Visitors, Shows, Social, Research, Finances, Encyclopedia and Settings. |
| D2 | Desktop navigation | **Keep the existing dock.** Add **Social** between Shows and Build, giving 11 items. |
| D3 | Automation model | **Switches unlocked by gear.** Auto-feed drives the existing Autofeeder. Auto-clean needs a new **Auto Water Changer** costing **$120**. |
| D4 | Rare genes filter | It **shows visible rare traits first**, with a lock hint. Hidden carriers are included only once the **Genetics Lab** research is complete, which keeps the existing rule that carried genes stay hidden until the lab. |
| D5 | Social scope | All four parts: aquarist **clubs**, **trading circles**, **friends' aquariums** and **leaderboards**. They are stubs for now. |
| D6 | Design fidelity | Static screens **plus** clickable prototypes for both phone and desktop. |
| D7 | Extras | A deep-link flow, Prismatic in the new shop, lock-screen alerts and a production line. |
| D8 | Audience for the canvas | "Just me reviewing the look": clean screens and few notes. This document carries the detail. |
| D9 | URL scheme | **Hash routing** (`/#/…`). GitHub Pages has no SPA fallback, so path routes would 404 on reload. No router dependency; it's a small hand-written router. |
| D10 | New betta genes | **Cambodian**: recessive, and only visible on red bettas. **Metallic**: additive, where one copy gives a soft sheen and two copies give the named "Metallic" look. |
| D11 | New named strain | **Cambodian Veiltail** (Red + Cambodian + Veiltail), Very rare. It's the tenth betta strain. |
| D12 | Buying with no suitable tank | When no tank passes the environment gate (e.g. marine animals when all your tanks are freshwater), the Buy button becomes **"Build a marine tank"**, which opens Build › Tanks. A wrong water class (e.g. axolotls in tropical tanks) stays buyable behind the existing risk confirmation. |
| D13 | Notifications, honestly | **Web:** system notifications only while the game is open. Hidden tabs pause the simulation, so nothing happens while closed. **Phone app (later, native wrapper):** alerts while closed are **predicted** from the deterministic simulation at the moment you leave (§12.7). No push server in 0.5. |
| D14 | Version | Ship as **0.5.0**. Settings › About gets a "What's new in 0.5" list. |

---

## 3. Constraints and ground rules

These come from the repo's own rules (`docs/LANES.md`, `docs/TEST_IDS.md`, `docs/ARCHITECTURE.md`) and from the brief. They are not optional.

1. **No new dependencies.** Don't touch `package.json` dependencies. Write the router, platform layer and social stub by hand. A future native wrapper (e.g. Capacitor) would be a separate, explicitly approved change.
2. **Extend, don't rewrite.** Genetics: add loci, rules and strains through the existing data shapes in `src/data/species/betta.ts` and `src/types/species.ts`. Don't restructure `src/sim/life/genetics.ts`.
3. **Saves stay compatible. No schema bump.**
   - `SCHEMA_VERSION` stays `1`. Bumping it would make new saves unreadable in older cached tabs.
   - Every new field is **optional** and tagged `// lane:<name>`.
   - `repairState` validates a new field only when it is present.
   - New derived data is backfilled silently. This is exactly how 0.4.0 added Prismatic (`rareVariant?`, `progress.prismaticFinds?`).
4. **Lanes and ownership.**
   - Edit only the files your lane owns. Most files name their owner in the header comment (`OWNER: lane "ui-shell"`). A few don't, such as `src/data/species/betta.ts`; follow the `// lane:` tags already in them (the betta genetics data is `// lane:genetics`).
   - `docs/LANES.md` lists these files as off-limits to lanes. Changing them needs explicit sign-off: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/App.tsx`, `src/main.tsx`, `src/state/**`, `src/sim/world.ts`, `src/sim/newGame.ts`, `src/sim/tanks.ts`, `src/sim/tankSpace.ts` and `src/render/tank/TankInstance.tsx`.
   - Files whose header says `OWNER: lane "core"` (for example `src/persistence/migrations.ts` and `storage.ts`) also need sign-off.
   - `src/types/**` is core too, but any lane may **add** optional fields or new types there, tagged `// lane:<name>`.
   - Put new tests in `tests/sim/<lane>-*.test.ts`.
   - Keep exported names and signatures stable. Adding exports and optional parameters is fine.
   - A 0.5 work stream (e.g. "automation") is not a lane. Each section names the lanes that own the files it touches, and the brief for that phase must list those files.
5. **Determinism.**
   - The simulation may only use `simRng(state)`.
   - New subsystems that need randomness keep their own persisted stream, the way `staff.rng` and `shows.rng` do.
   - Rendering never mutates state, and all state changes go through `useGame.mutate`.
6. **UI conventions.**
   - Frosted glass built on tokens.
   - Status is always **icon + word**, never colour alone.
   - Respect `reducedMotion` and the high-contrast setting.
   - Use plain global CSS with `ag-` (shell/HUD) and `pn-` (panel) prefixes, no CSS modules.
   - Put new CSS in **new files**, or in new `@media` blocks **after** the existing ones. Several tests read `hud.css`, `shell.css` and `screens.css` and match exact blocks (§20.3).
7. **Test ids.** Use kebab-case like the existing ids in `docs/TEST_IDS.md`. The file is a set of per-lane tables rather than written rules, so add a "0.5" table per lane and document the deep-link grammar alongside them (§6, §19).
8. **The existing e2e flows keep passing.** The few deliberate exceptions are listed in §20.3 with how to update them.

---

## 4. What exists today and what's new

| Area | Exists in v0.4.0 | New in 0.5 |
|---|---|---|
| Phone navigation | The scrolling 10-item dock (`src/ui/hud/Dock.tsx`) with scroll fades (`has-more-left/right`) and the `PanelSwitcher` strip inside bottom sheets | A 5-tab bar plus a **More** sheet. `useShell.popover` already has an unused `'more'` value. |
| Desktop navigation | The dock (`DOCK_ITEMS`, 10 items) | **Social** item, making 11 |
| URLs | Query flags only (`?dev=1`, `fixture`, `showcase`, `view`…). No hash, history API or router. | Hash router, deep links to every screen, "Copy link", and the browser Back button |
| Panels | `PanelHost.tsx` `PANEL_COMPONENTS`; `useUI.panel` and `panelTarget` (one-shot targets) | A `social` panel; route ↔ panel sync; lifted tab state where needed |
| Shop filters | Environment chips: All stock · Fits my tanks · Freshwater · Marine · Brackish (once unlocked). Prismatic offers sort first. | **Prismatic only** and **Rare genes** chips, a "{n} of {m}" count, filter state in the URL |
| Offer detail | `OfferDetail` in `Shop.tsx`, "This offer has gone" | A **Genes** panel, **Temperament** meters, destination-tank fit that blocks impossible buys, Copy link, and an "Opened from your notification" banner |
| Prismatic | Full system: `src/data/rarity.ts`, `rareVariants.ts`, badges, encyclopedia box, ×12 value | Filter, alerts, celebration toast, leaderboard |
| Genetics | Betta: color (8 alleles), pattern (5) and fins (5), all mendelian; 9 strains; catalog of 240 | **Cambodian** and **Metallic** loci, a 10th strain, catalog of **540**, a `rare` flag on alleles |
| Genetics Lab | Research `genetics_lab` ($1,200, 2 days) | **Bug fix:** after researching the lab, new animals now actually show their gene rows (§9.1) |
| Temperament | Inherited `potentials.temperament` and `curiosity`; words from `temperamentWord` / `curiosityWord`. Shown as two word rows at the end of `PotentialBands` (the offer's **Individual profile**) and on the creature card | Its own **Temperament** section on every offer, with meters; the two word rows leave the offer's profile so they aren't shown twice |
| Autofeeder | Equipment `autofeeder` ($35, tier 2), `setting` 0–4 meals a day. The UI only has a power switch. | Tank card **Automation** section: an **Auto-feed** switch plus **Meals a day 1–4** |
| Cleaning | Manual water changes, glass, gravel and filter; staff keepers | **Auto Water Changer** equipment and an **Auto-clean** switch |
| Notifications | In-game toasts (`useUI.toast`), the sim log (`emitEvent`), the Alerts drawer | A Settings › **Notifications** tab, a permission flow, categories, quiet hours, a test notification, and system notifications through the platform layer |
| Social | — | A `social` panel and a local `SocialService` stub |
| Platform | Storage detection seam (`configureStorageDetection`) | A `src/platform/` module (notifications, clipboard, share, lifecycle, storage candidates) |
| Production | Manual breeding, nursery moves and listings | Livestock › **Production** (§11) |

---

## 5. Navigation and information architecture

### 5.1 Where everything lives

| Destination | Phone (tab bar) | Desktop (dock) | Panel id |
|---|---|---|---|
| Tanks | Tab 1 | Dock 1 | `tanks` |
| Livestock | Tab 2 | Dock 2 | `livestock` |
| Market | Tab 3 | Dock 3 | `market` |
| Build | Tab 4 | Dock 7 | `build` |
| Visitors | More › tile | Dock 4 | `visitors` |
| Shows | More › tile | Dock 5 | `shows` |
| **Social (new)** | More › tile (with a "New" tag) | Dock 6 (between Shows and Build) | `social` (new) |
| Research | More › tile | Dock 8 | `research` |
| Finances | More › tile | Dock 9 | `finances` |
| Encyclopedia | More › tile | Dock 10 | `encyclopedia` |
| Settings | More › row at the bottom | Dock 11 | `settings` (a shell `Sheet`, not in PanelHost) |
| Tank card | Tank bar clipboard button | Tank bar "Tank card" button | — (`TankCard`) |
| Event log | Alerts drawer › "Full event log" | Same | `log` |

### 5.2 Phone tab bar (new)

**When it shows:** when `MOBILE_QUERY` matches (`(max-width: 720px), (max-height: 500px) and (orientation: landscape)` in `src/ui/common/safe.ts`). This is the same condition `hud.css` and `tokens.css` already key off for the phone layout. Wider screens keep the dock.

**Placement and size:**
- Floats at the bottom with `left`, `right` and `bottom` all `var(--edge)` (10px on phones), the same as today's phone dock.
  - `.ag-hud` is already inset by the safe areas (`hud.css` L3 uses `--safe-t/r/b/l` from `tokens.css`), so a child of it must **not** add the inset again.
  - The variable is `--safe-b`; there is no `--safe-bottom`.
- Height **64px** (`--dock-h` is already 64 on phones), padding 4px, gap 2px, radius 18px.
- Glass background (`rgba(9, 22, 30, 0.68)` + `blur(20px) saturate(150%)`), 1px border `rgba(200, 235, 245, 0.11)`, shadow `0 12px 36px rgba(0,0,0,.35)`.
- **Stacking:** `PanelHost` renders phone sheets **outside** `.ag-hud`, as `.pn-sheet--phone` with z-index 55. The bar needs **z-index 60**: above the sheets, below toasts (`--z-toast` 70).
  - This only works while `.ag-hud` is not a stacking context. Today it has no z-index, and its motion fade ends at opacity 1, so it isn't one.
  - Don't add a z-index, `transform`, `filter` or `will-change` to `.ag-hud`. Check in DevTools that the bar paints over an open sheet.
- **Phones held sideways** (e.g. 844×390; `MOBILE_QUERY` includes them): the same bar replaces the dock there.
  - Sheets keep today's landscape rule (`top: max(6px, safe-area-inset-top)`, `panels.css` L965–980).
  - The folded 2×4 tool rail keeps ending above the bar.

**Items:** five equal-width buttons, each with a 22px Lucide icon over a 10.5px/620 label.

| Tab | Icon (lucide) | Opens |
|---|---|---|
| Tanks | `Box` | `#/tanks` |
| Livestock | `Fish` | `#/livestock` |
| Market | `Store` | `#/shop` |
| Build | `Hammer` | `#/build` |
| More | `Ellipsis` | `#/more` (the More sheet) |

**States:**
- **Idle:** text `#b9ccd1`, transparent background.
- **Active** (the open destination, or any More destination for the More tab):
  - text `#f0fffc`, icon `#5eead4`
  - background `linear-gradient(180deg, rgba(94,234,212,.2), rgba(45,212,191,.08))`
  - inset ring `0 0 0 1px rgba(94,234,212,.38)`
  - a 16×3px aqua underline at the bottom with a soft glow
- **Attention dot:** the existing `AttnDot` (9px, amber), driven by `navDots` (`src/ui/common/notify.ts`, lane `notify`). `navDots` returns one dot per item, each with a `label` and `target`.
  - **Market:** the existing "{n} bids waiting for your answer" dot (target `tab:listings`) **keeps priority**. `ui-notify-news.test.ts` L117 pins it.
  - Only when no bid is waiting, Market shows a new **rare-stock** dot for Prismatic or rare offers stocked since the player last opened the Shop:
    - label "Prismatic {species} in the shop", or "Rare stock: {morph}";
    - target `offer:<id>`.
  - Track the "seen" offer ids in a **UI store, not the save**. Start it with the current stock when a game loads, so loading a game never lights the dot.
  - Pass the ids to `navDots` as a new optional 4th parameter. Existing calls and tests stay unchanged; a fresh test game has no unseen rare stock, so `.market` stays undefined there.
  - **More** shows a dot when any destination inside More has one (Shows results, a new Social item, etc.).

**Behaviour:**
- Tapping a tab opens its destination. Tapping the **active** tab closes it and returns to the tank view, the same toggle that `openPanel` does today.
- While a phone panel is open, the tab bar stays visible above the sheet (z-index above the sheet). It replaces the `PanelSwitcher` strip inside bottom sheets on phones, so the switcher stays only for tablets.
- **Calm HUD:** the tab bar must be a direct child of `.ag-hud` and keep the existing "first tap on a calm HUD only wakes it" behaviour (`hud-layout.spec.ts`). Keep it out of the `CALM_LIVE` selector, as the dock is today.
- **Locked destinations** (Visitors, Shows early on) still open their panel, which shows a locked state (§5.7). The More tiles carry a small lock badge.

**Test ids:** the four destination tabs **keep** `dock-tanks`, `dock-livestock`, `dock-market` and `dock-build`, so e2e helpers keep working. The More tab is `dock-more`. See §19.

### 5.3 More sheet (phone)

- **Shape:** a bottom card sheet (`ag-sheet` style, glass-strong) that rises to about 48% of the screen height. The top of the tank stays visible; use the re-framed tank background as today's half sheets do.
- **Header:** "More" with a close button.
- **Body:** a 3-column grid of 92px-tall tiles, each with a 42px rounded icon chip and a label:
  - Visitors (lock badge while locked) · Shows (dot when there are results) · **Social** (a "New" tag until it's first opened)
  - Research · Finances · Encyclopedia
- **Below the grid:** a full-width **Settings** row with icon, title "Settings", subtitle "Saves, sound, notifications" and a chevron.
- **Behaviour:**
  - Tapping a tile closes More and opens that panel.
  - The More tab stays highlighted while any More destination is open.
  - `#/more` opens this sheet on phones. On desktop, `#/more` is treated as `#/`.
- **Test ids:** tiles `more-visitors`, `more-shows`, `more-social`, `more-research`, `more-finances`, `more-encyclopedia`; row `more-settings`; root `more-sheet`.

### 5.4 Desktop dock (changed)

- **Same component and styles as today; add one item.** The order is Tanks · Livestock · Market · Visitors · Shows · **Social** · Build · Research · Finances · Encyclopedia · Settings.
- **Social item:** icon `Globe`, test id `dock-social`, tutorial id `dock-social`. It has an attention dot until Social is first opened, and later when there are new club or trade items.
- **Width: it fits the dock's max-width, but it can collide with the camera chips.**
  - At 1440px the dock is about 750px wide: 11 items × 64px, the wider Encyclopedia item, gaps and padding. That's inside the existing `max-width: calc(100% - 2*var(--edge) - 400px)` (1008px at 1440), so the dock doesn't scroll.
  - The real limit is the labelled camera chips at the bottom right (`.ag-hud__cam`). The 10-item dock already ran 12–32px under them between 1400 and 1519px. A `qa-play` rule fixed that by slimming items to 64px in that range (`hud.css` L608–612).
  - An 11th item adds about 66px (33px on each side of the centred dock), which brings the overlap back. In the prototype at 1440 the clearance is only about 20px.
- **Fix:** keep the 11-item dock no wider than today's 10-item dock where the camera chips have labels.
  - The chips already go icon-only below 1400px (`@media (max-width: 1399px)` in `hud.css`). So the risk is from 1400px up.
  - Narrow the items to `min-width: 58px` from 1400 to 1519px, and to `67px` from 1520px. That's 10/11 of today's 64 and 74px.
  - Put these rules in `nav.css` with a selector more specific than `hud.css`'s (e.g. `.ag-dock .ag-dock__item`), so CSS load order doesn't matter.
  - The Encyclopedia item doesn't shrink below its label (about 82px), so measure. If the dock still touches the chips, raise the icon-only breakpoint for the camera chips until they clear. Keep each chip's name as `aria-label` and `title`.
  - From 981 to 1180px the dock's max-width is `100% − 2·edge − 300px`, so at the narrow end an 11-item dock scrolls with the existing edge fades. That's acceptable.
  - Test it: new e2e checks at 1400, 1440, 1519, 1520 and 1600px assert that the `.ag-dock` and `.ag-hud__cam` bounding boxes don't intersect (§20.2).

### 5.5 Tutorial ("guide") on phones

**The problem:** the tutorial step `preview` ("The road ahead") has `hintTarget: 'dock-research'` (`src/data/quests.ts` L189). On phones Research is inside More, so there is no visible `dock-research` element.

**The fix** (in `TutorialCoach`): when the hint target `dock-<id>` isn't rendered and `<id>` lives in More:
1. Ring **`dock-more`** and show the coach line **"Research now lives under More. Tap More, then Research."** The prototype shows this as a gold-bordered bubble above the More tab, labelled "Guide · Research".
2. When the More sheet opens, ring the **`more-research`** tile with a gold glow.
3. Once Research opens, the step completes. Its objective already accepts `opened_panel:research`.

This applies to any hint target that moves into More. Today that's only `dock-research`; `dock-build` and `dock-market` stay on the tab bar.

### 5.6 Panels on phones

**This is a deliberate change.** Today phone sheets open half-height (`.pn-sheet--bottom { top: 46dvh }`, `panels.css` L61), and `ui-layout.spec` checks that the tank keeps the upper part of the screen.
- With a tab bar permanently taking the bottom ~84px, a half sheet would leave about 300px of content.
- So in 0.5 phone panels open nearly full height, like tab content in a native app. Update the test as described in §20.3.

Sheets are rendered outside `.ag-hud`, so they aren't inset by the safe areas. Add the insets yourself, as below.
- **Full panels** open as bottom sheets from `top: calc(var(--safe-t) + var(--edge) + var(--topbar-h) + 6px)`. On a phone with no notch that's **64px**: just under the top HUD row, covering the tank bar.
  - The tab bar floats over the bottom of the sheet.
  - The existing expand state (`.is-max`) is no longer needed on phones.
- **Sheet bodies** scroll, with `padding-bottom: calc(112px + var(--safe-b))` so content clears the tab bar, plus a 110px bottom fade.
- **The tank card** (`#/tanks/:id…`) opens **below the tank bar**: `top: calc(var(--safe-t) + 118px)` on a portrait phone. The tank bar stays visible.
- **Settings** opens as a full-height card sheet from the same top as full panels.
- **Hide the tank bar and tool rail** while a full panel is open.
  - Today's `.has-bottom-sheet` rule already hides the rail, camera chips and tool hint; add the tank bar.
  - Otherwise the semi-transparent sheet shows them through as a ghost.
- **Panel tab strips** that overflow scroll horizontally. **The active tab is scrolled into view** whenever the route changes, which matters for deep links such as `#/settings/notifications`.
- **The panel switcher strip** (`.pn-switch`) inside phone sheets goes away: the tab bar replaces it. Tablets keep it.
- **Toasts:** today a full-height phone sheet (`.pn-sheet--bottom.is-max`, `.ag-sheet--bottom.is-expanded`) moves the toast stack to the bottom band, so it doesn't cover the sheet's tabs (`hud.css` L521–523).
  - In 0.5 every open phone sheet is full height, so apply that to all of them, lifted above the tab bar: `bottom: calc(var(--safe-b) + 84px)`.
  - Put it in a new rule in `nav.css`. Don't edit the `hud.css` block, because tests read it.
- **The tank card on phones** opens at its expanded height, starting below the tank bar. The guide hides while it's open, as it does today for an expanded card (`hud.css` L618).
- **Camera:** keep `data-occlude="bottom"` on phone sheets (`ui-layout.spec` checks it).
  - The camera framing ignores an occluder that leaves less than 12% of the height (`computeFreeRect`, `src/render/camera/viewport.ts` L105–110).
  - So full-height sheets don't move the camera, and closing one doesn't make the tank jump.
- **A sticky footer** (such as the offer's buy bar) sits above the tab bar: `padding-bottom: calc(84px + var(--safe-b))` on phones. That's 10 + 64 for the bar plus a 10px gap.

### 5.7 Locked destinations and edge states

**Today**, tapping a locked dock item only shows a toast (`lockedToast`). **In 0.5**, a locked destination opens its panel in a **locked state**. This applies to taps, More tiles and deep links alike, so a shared link never lands on nothing.

| Destination | Unlock rule (from `src/data/unlocks.ts`) | Locked panel |
|---|---|---|
| Visitors | `fac('specialty_shop')` | Lock icon; title **"Visitors open with a Specialty Shop"**; text **"Upgrade to a specialty shop to welcome paying visitors. Links to this page keep working — they show this until it unlocks."**; button **"Open Build › Facility"** → `#/build/facility`. Tabs hidden. |
| Shows | tutorial done, or reputation ≥ 20 | Lock icon; title **"Shows unlock after the guide"**; text **"Finish the guide or reach 20 reputation to enter club shows."** Tabs hidden. |

On the phone's More tiles and on the desktop dock, locked items show a 15px lock badge at the bottom-right of the icon. They keep their normal label colour.

Other edge states, specified in their own sections:

| State | Where |
|---|---|
| An offer that's gone | §7.6 |
| No Prismatic in stock | §7.2 |
| A filter that matches nothing | §7.2 |
| Not enough money | §7.5 |
| No suitable tank | §7.5 |
| A broken link | §6.5 |
| An expired invite | §13.3 |
| Notifications blocked | §12.3 |
| Sign-in errors | §13.2 |

---

## 6. Routing and deep links

### 6.1 Why hash routing

- **Why a hash:** the game is served from GitHub Pages at `/aquarium-go/` (and as a Render static site), neither of which has a SPA fallback. A path like `/aquarium-go/shop` would 404 on reload. Hash URLs (`/aquarium-go/#/shop`) always load `index.html`.
- **What exists:** no router package is installed and none may be added. Today there is no `hashchange`, `popstate` or `location.hash` use anywhere.
- **What to build:** a small hand-written router in a new UI-lane folder, **`src/ui/nav/`**, with no dependencies.

### 6.2 Route table

Real ids are opaque, for example `tank_k2x`, `cr_9fq`, `offer_k3x9` and `listing_7mm`. The prototype uses `ember` as a readable stand-in for a tank id. Segments in *italics* are optional.

| Route | Opens | Applied to today's stores as |
|---|---|---|
| `#/` | Tank view, nothing open | `useUI.set({panel:null, panelTarget:null})`; close the tank card and More |
| `#/tanks` | Tanks panel | `panel:'tanks'` |
| `#/tanks/:tankId` | Tank card › Water, focused on that tank | `focusTank(id, true)` (`hud/AlertsPopover.tsx`) + `useTankCardTab.setState({want:'water'})` |
| `#/tanks/:tankId/equipment` | Tank card › Equipment | as above with `want:'gear'` (**URL word "equipment" ↔ internal id `gear`**) |
| `#/tanks/:tankId/life`, `/value` | Tank card › Life / Value | `want:'life'` / `'value'` |
| `#/livestock` | Livestock › Animals | `panel:'livestock'` |
| `#/livestock/eggs` | Livestock › Eggs & fry | target `clutches` (existing) |
| `#/livestock/past` | Livestock › Past residents | target `tab:past` (**new target**) |
| `#/livestock/production` | Livestock › Production (new, §11) | target `tab:production` (**new**) |
| `#/livestock/animal/:creatureId` | Creature card | `useUI.set({selectedCreatureId})` (existing card rules apply) |
| `#/shop` | Market › Shop | `panel:'market'`, target `tab:shop`. Query: `prismatic=1`, `rare=1`, `env=fits\|freshwater\|marine\|brackish` |
| `#/shop/fish/:offerId` | Offer detail | target `offer:<id>` (existing). Unknown or expired → "This offer has gone" |
| `#/market/supplies` *`/:foodId`* | Market › Supplies (optionally scrolled to a food) | `tab:supplies` / `food:<id>` (existing) |
| `#/market/listings` *`/:listingId`* | Market › My listings | `tab:listings` / `listing:<id>` (existing) |
| `#/market/history` | Market › History & demand | `tab:trends` (alias `#/market/trends`) |
| `#/build` *`/tanks\|decor\|equipment\|substrate\|facility`* | Build tabs | `tab:<id>` (existing) |
| `#/visitors` *`/staff`* | Visitors / Staff | `tab:visitors\|staff` (existing). Locked state per §5.7 |
| `#/shows` *`/entries\|results\|trophies`* | Shows tabs | `tab:upcoming\|entries\|results\|trophies` (existing) |
| `#/research` *`/unlocks\|quests\|achievements`* | Research tabs ("Unlock map" = `unlocks`) | `tab:research\|unlocks\|quests\|achievements` (existing) |
| `#/finances` | Finances | `panel:'finances'` |
| `#/encyclopedia` | Species list | `tab:species` |
| `#/encyclopedia/science` *`/:articleId`* | Aquarium science | `tab:science` / `science:<id>` (existing) |
| `#/encyclopedia/:speciesId` | Species page, e.g. `betta` | `species:<id>` (existing) |
| `#/social` *`/clubs\|trading\|friends\|leaderboards`* | Social (new panel, §13) | `panel:'social'` + tab |
| `#/social/join/:code` | Club invite | `panel:'social'`, target `join:<code>` |
| `#/settings` *`/play\|saves\|notifications\|about`* | Settings tabs | `panel:'settings'` + `useShell.set({settingsTab})`. **URL word "play" ↔ internal tab id `display`**. Widen `settingsTab` from `'about' \| null` to the full tab union. |
| `#/more` | Phone More sheet | `useShell.set({popover:'more'})`. On desktop: same as `#/` |
| `#/log` | Full event log | `panel:'log'` |

**Shop query rules:**
- Keys appear in the order `prismatic`, `rare`, `env`.
- Default values are omitted, so the shop with no filters is just `#/shop`.
- `#/shop` with no query **re-applies the filters you last used this session** and rewrites the URL to include them. "Clear filters" always gives plain `#/shop`.

### 6.3 Module design (`src/ui/nav/`, lane `ui-shell`)

```ts
// routes.ts — pure, unit-tested
export type Route =
  | { kind: 'home' }
  | { kind: 'panel'; panel: PanelId | 'social'; tab?: string; target?: string } // e.g. market / tab:supplies
  | { kind: 'tankCard'; tankId: string; tab: 'water' | 'gear' | 'life' | 'value' }
  | { kind: 'creature'; creatureId: string }
  | { kind: 'more' }
  | { kind: 'settings'; tab: 'general' | 'display' | 'saves' | 'notifications' | 'about' };

export interface ShopFilters { prismatic: boolean; rare: boolean; env: 'all' | 'fits' | 'freshwater' | 'marine' | 'brackish' }

export function parseRoute(hash: string): { route: Route; filters?: ShopFilters } | null; // null = unknown
export function formatRoute(route: Route, filters?: ShopFilters): string;                // '#/shop?prismatic=1'
export function shareUrl(route: Route): string; // location.origin + location.pathname + formatRoute(route), no other query
```

```ts
// router.ts
export function startRouter(): () => void; // installs hashchange; returns cleanup
export function go(route: Route, opts?: { replace?: boolean; filters?: ShopFilters; fromNotification?: boolean }): void;
export function applyRoute(route: Route, filters?: ShopFilters): void; // URL → stores (calls useUI.set / useShell.set / focusTank)
export const useNav = create<{
  tab: Partial<Record<string, string>>; // the active tab per panel, reported by panels
  sub: Partial<Record<string, string>>; // sub-view per panel, e.g. market: 'offer:offer_k3x9'
  fromNotification: boolean;            // transient: shows the "Opened from your notification" banner
  pending: string | null;               // hash captured at boot, applied once a game exists
}>(…);
export function useNavTab(panel: string, local: [string, (t: string) => void]): void; // keeps a panel's local tab and the URL in sync
```

**Two-way sync:**
- **URL → stores.** On `hashchange`, `parseRoute` → `applyRoute`.
  - `applyRoute` must call `useUI.set({panel, panelTarget})` **directly**, never `openPanel()`. `openPanel` toggles a panel that's already open.
- **Stores → URL.**
  - Subscribe to `useUI` (`panel`, `selectedCreatureId`), `useShell` (`popover`, `tankCardOpen`, `settingsTab`) and `useNav` (`tab`, `sub`).
  - Compute the route and write it with `history.pushState` when the destination changes (panel, tab or sub-view). Use `history.replaceState` for shop filter changes.
  - Use a re-entrancy guard so a store write caused by a URL change doesn't push a second history entry.
- **Panels report their tab.** `panelTarget` is a one-shot command and tabs are local `useState`, so each panel adds a one-line `useNavTab('market', [tab, setTab])`. Sub-views report through `useNav.setState({sub:{market:'offer:'+id}})` when opened and clear it when closed.

### 6.4 Boot, reload and leaving

1. **Capture once at startup.** In `UIRoot` (ui-shell; `App.tsx` and `main.tsx` are core-owned), read `location.hash` and `performance.getEntriesByType('navigation')[0]?.type`.
2. **Reload (`type === 'reload'`): behave exactly like today.** Clear the hash with `replaceState` to `#/` and show the title screen.
   - This protects the e2e tests that reload: `save.spec.ts` L18–21 reloads and then clicks `title-continue`; `prismatic.spec.ts` L35–37 reloads and then calls `__AQ.loadAndResume`. Both expect a fresh title screen.
   - It also stops a restored panel covering the title screen.
3. **Opened from a link (`type === 'navigate'` with a hash):**
   - **A save exists:** skip the title screen. Load the latest save (`latestSaveSlot()` → `loadAndResume`) behind a **loading card**: app icon, "Aquarium *Go*", "Loading your save · catching up 3 h 12 min…", a progress bar, and a pill **"Then: {destination}"** (e.g. "Then: Market › Prismatic betta"). After loading, `applyRoute`.
   - **No save:** keep the route in `useNav.pending` through onboarding and apply it when the first game starts. Gone or invalid targets degrade to their empty states.
4. **Back and Forward** move through panel history with `hashchange`. Closing a panel (Esc, ×, or tapping the active tab) navigates to `#/`.
5. **Returning to the title, starting a new game or loading another slot** clears the hash to `#/` with `replaceState`.
   - Today only loading resets both `panel` and `panelTarget` (`persistence/offline.ts` L399–410).
   - "Save and return to title" (`SettingsPanel.tsx` L333) and a new game (`NamingScreen.tsx` L97–107) reset `panel` only.
   - In all three cases the router must also clear `panelTarget` and its own `useNav.sub` and `fromNotification`.
   - `pending` is the exception: it's applied once, when the first game starts (item 3), and cleared only after that.
   - Trigger the reset when `useUI.screen` leaves `'game'`, or when the game's `saveId` changes. Key on `saveId`, not on the game object: every `useGame.mutate` (immer `produce`, `src/state/game.ts` L24–32) creates a new game object, many times a second.
   - Use `replaceState`, so Back doesn't return to a panel from the previous game.
6. **Dev, fixture and showcase boots** (`?fixture=`, `?showcase=`, `?dev=1`) keep working. The router ignores the query string and only reads the hash.

### 6.5 Unknown and invalid links

- **Unknown path** (e.g. `#/aquarium/nowhere`): open the tank view and show an info toast, **"That link doesn't go anywhere"** · **"Opened your aquarium instead."**
- **Unknown tab** on a known panel: open the panel's default tab. No toast.
- **Unknown id** (offer, creature, tank, listing, species): show the panel's own "gone" or "not found" state. For offers that's the existing **"This offer has gone"** state, plus a new **"See what's in stock"** button (§7.6).

### 6.6 Copy link and share

- **Offer detail:** desktop shows a **"Copy link"** button (sm, `link` icon); phones show an icon-only button with aria-label "Copy link to this offer".
  - Clicking calls `platform().clipboard.write(shareUrl(route))`.
  - On success the button becomes **"Link copied"** (good tone, `check` icon) for 4 seconds. A row below the back bar shows the link in monospace, ellipsised, with a `link` icon, e.g. `…/aquarium-go/#/shop/fish/offer_k3x9`.
- **Phones with `navigator.share`:** on long-press, or as a second action, offer the system share sheet. This is optional for 0.5.
- **Club invites** use the same mechanism: `#/social/join/:code`.
- **Never** include `?dev=1`, `fixture` or other query flags in a shared URL.

---

## 7. Shop, offers and Prismatic

Files: `src/ui/panels/market/MarketPanel.tsx` and `src/ui/panels/market/Shop.tsx` (`ShopTab`, `OfferCard`, `OfferDetail`, `TierChip`), styles in `panels.css`/`genetics.css`. Sim helpers: `src/sim/economy/shop.ts`, `purchases.ts`, `src/sim/life/morphCatalog.ts`, `rareVariants.ts`.

### 7.1 Market header (unchanged except counts)

Title "Market". Subtitle "{$money} available · {n} offers in stock · {n} active listings" (existing). Tabs: Shop · Supplies · My listings · History & demand (phones: Shop · Supplies · Listings · Trends) (existing). The panel gets the existing expand/maximise button on desktop; when maximised, the shop grid shows **3 columns** instead of 2.

### 7.2 Shop filters (new chips + count)

Layout (top of the Shop tab):

- **Row 1 (existing):** environment chips — *All stock · Fits my tanks · Freshwater · Marine · Brackish (only once `brackish` is unlocked)*. Single-select. On phones the row scrolls horizontally.
- **Row 2 (new):**
  - **"Prismatic only"** — toggle chip with a `Sparkles` icon. Off: violet-tinted outline (`border rgba(214,180,255,.4)`, `background rgba(182,156,255,.07)`, icon violet `#b69cff`). On: the Prismatic pastel gradient (same as `PrismaticBadge`: `linear-gradient(110deg, #ffd1ef, #fff0b3, #c6ffe6, #cfe4ff, #e6d4ff, #ffd1ef)`, `background-size 250%`, the existing slow `ag-prism-flow` 7s animation from `genetics.css`; text `#2a1640`). Reduced motion: no animation.
  - **"Rare genes"** — toggle chip with a `Dna` icon; on = the standard selected chip (aqua tint).
  - **Count** (right-aligned, 12px, ink-3, tabular): **"{visible} of {inStock}"**, e.g. "6 of 9".
- Filters combine with AND. All filters are reflected in the URL (§6.2) and survive switching tabs within the session.

**Filter logic** (pure function, unit-tested; put it beside `Shop.tsx` as `shopFilters.ts`):

```ts
export function offerMatches(g: GameState, o: ShopOffer, f: ShopFilters, labOwned: boolean): boolean {
  const sp = getSpecies(o.speciesId);
  if (!envMatches(sp, f.env, g)) return false;                 // existing EnvFilter logic, moved here
  if (f.prismatic && !o.creatures.some(isPrismatic)) return false;
  if (f.rare && !o.creatures.some((c) => visiblyRare(sp, c) || (labOwned && carriesRareAllele(sp, c)))) return false;
  return true;
}
// visible rarity: the animal's morph tier is rare / very_rare / legendary (morphTierOf) OR it matches a named strain of tier ≥ rare
// hidden carrier: the genome holds an allele flagged `rare: true` (§8.2) that is NOT expressed in its phenotype
```

- Sorting is unchanged (Prismatic offers first).
- **Test-id safety:** `shop-offer-<i>` must keep indexing **`g.market.stock`**, not the filtered list. `gameplay.spec`/`prismatic.spec` click `shop-offer-0` right after `dev.addShopOffer`, and the default (no filters) must show all stock.

**Hint lines** (shown under the chips while "Rare genes" is on):

| State | Line |
|---|---|
| Lab not researched | Dashed outline, `Lock` icon, ink-2: **"Showing rare traits you can see. Hidden carriers appear once you research the Genetics Lab."** |
| Lab researched | Violet tint, `Dna` icon: **"Genetics Lab: animals carrying rare hidden genes are included."** |

**Empty states** (replace the grid):

| Case | Icon | Title | Text | Action |
|---|---|---|---|---|
| "Prismatic only" on and no Prismatic in stock | `Sparkles` (violet) | **No Prismatic animals right now** (new) | **About 1 in 4,096 stocked animals shimmers. New stock arrives through the day.** | "Clear filters" (new) |
| Anything else matches nothing | `Store` | **Nothing matches that filter** (existing) | **Try another filter to see more animals.** (existing) | "Clear filters" (new) |
| No stock at all (existing; any filters) | `Store` | **The shelves are being restocked** (existing) | **Breeders deliver new captive-bred animals throughout the day. Check back soon.** (existing) | — |

Footer line under the grid (existing tone): leaf icon + **"Captive-bred animals are hardier and kinder to wild reefs and rivers."**

### 7.3 Offer cards

**Today's card** (`OfferCard`, `Shop.tsx` L98–166), top to bottom:
- portrait (the Prismatic shimmer animal is the face of the card);
- title = the species common name ("{n} × " for groups) + sex icon (not for groups);
- a second line with the morph name, or the scientific name for wild types;
- `TierChip` under the name;
- a chip row: `PrismaticBadge`, "Captive-bred", species rarity (when not common), 1–2 personality chips;
- two potential highlight chips (`PotentialBands highlightOnly max={2}`);
- footer: seller, "Leaves {time}" / "Leaving soon" (amber when < 6 h), price, plus the notes under the price: "Needs a {water} tank", "Can't afford yet" and "Locked".

**0.5 card** (as in the prototype):
- **Title:** the **morph display name** (`morphDisplayName`, e.g. "Royal Blue Butterfly Halfmoon Betta"; groups "10 × Fire Red Cherry Shrimp") + sex icon. It's set in the display font, 16.5px/560.
- **Second line:** **"{Sex} · {size} cm · {first personality}"** (groups: "Group of {n} · {size} cm"). It replaces the morph/scientific-name line and the personality chips.
- **Chip row**, in this order (new ones marked):
  1. `PrismaticBadge` (existing).
  2. **Strain** (new). When the lead animal matches a named strain: two chips, **"{Strain name}"** (Dna icon, tier tone) and **"{Tier} strain"**. When there's no strain: one chip **"{Tier} morph"**, hidden for Common.
  3. **"New gene · {Gene}"** (new; aqua, Dna icon). Only for 0.5's new genes, and only when *expressed* (e.g. a Cambodian betta). Remove this chip in 0.6.
  4. **"Carries {Gene}"** (new; violet, Dna icon, with a sparkle when the allele is `rare`). Only after the Genetics Lab, and only for hidden carriers of `rare` alleles.
  5. `TierChip` (existing; "Breeder line" / "Rare find" / gold "Today only"). It moves from under the name into this row.
- **Dropped from the card** (all still in the offer detail): the "Captive-bred" chip, the personality chips and the potential highlight chips.
  - The species rarity chip is also dropped, because next to "Rare morph" it would give the word "rare" two meanings.
- **Footer:** unchanged, **including** the "Needs a {water} tank" / "Can't afford yet" / "Locked" notes under the price. The prototype leaves those notes out to save space; keep them.

Tier tones: Common = neutral, Uncommon = aqua, Rare = violet, Very rare = gold, Legendary = gold (as `MorphTierBadge`). A Prismatic card gets the Prismatic frame: `box-shadow: inset 0 0 0 1px rgba(214,180,255,.55), 0 0 22px rgba(190,150,255,.16)` and a faint pastel gradient overlay.

### 7.4 Offer detail — additions and changes

Keep everything the current `OfferDetail` does (group picker / "Sold as one lot", **Individual profile** with `PotentialBands`, destination tanks incl. "+ New tank", `CompatPreview`, size and water-class callouts, risk acknowledgement, all existing buy-button states). Add/change, top to bottom:

1. **Back bar** — existing `SubView` ("Back to shop", seller as title) **plus a Copy link action** on the right (§6.6). After copying, a monospace URL row appears under the bar.
2. **From-notification banner** (new) — when the route was opened from a system notification (`useNav.fromNotification`): aqua-tinted row, `BellRing` icon, **"Opened from your notification"**. Cleared on the next navigation.
3. **Hero.**
   - **Title:** becomes the **morph display name** (`morphDisplayName`, e.g. "Royal Blue Butterfly Halfmoon Betta"). Groups keep "{n} {Species}". The second line stays the scientific name.
   - **Chips, in order:**
     - `PrismaticBadge` (existing);
     - `TierChip` (existing; it's in the hero today, `Shop.tsx` L236);
     - strain chip "{Strain} · {Tier} strain", or "{Tier} morph" (new);
     - "New gene · {Gene}" when it applies (new);
     - "{Sex} · {size} cm" (existing);
     - "Captive-bred" / "Wild-caught" (existing);
     - personality chips (existing).
   - **Dropped:** the separate aqua morph-name chip, because the name is now the title.
   - **Unchanged:** `CareChips`, the personality sentence and the seller's quote.
4. **Genes** (new section, §7.4.1).
5. **Temperament** (new section, §9.2).
6. **Prismatic callout** (existing copy, unchanged) — only for Prismatic animals.
7. **Morph line** (new, one row, `Sparkles` violet icon): **"{Tier} morph · about 1 in {n} market {species plural}"** — `n` from the catalog frequency (`catalogEntry(sp, morphName).frequency` → `oneInLabel`). Examples: "Rare morph · about 1 in 143 market bettas", "Very rare morph · about 1 in 520 market bettas".
8. **Individual profile** (existing `PotentialBands`), **minus its Temperament and Curiosity rows**, which now live in the Temperament section (§9.2). The prototype leaves this section out; keep it.
9. **Destination tank** (existing radio tiles) — see §7.5.
10. **Buy bar** (existing, sticky) — see §7.5.

#### 7.4.1 Genes section

`SectionHead` "Genes" (Dna icon). A bordered list, one row per locus of the species (`sp.genetics.loci`), in data order:

| Column | Content |
|---|---|
| Locus | Locus display name (e.g. "Body colour", "Pattern", "Finnage", "Cambodian", "Metallic"). Loci added in 0.5 show a tiny aqua **"NEW"** under the label. |
| Trait | The **expressed** allele name (bold), e.g. "Royal blue"; below it a one-line **rule summary** (ink-3). |
| Copies | One chip, right-aligned on desktop; **below the rule summary on phones** (so the middle column never gets squeezed). |

Rule summary text (generated from the locus definition):
- `mendelian`, expressed allele is the top of the ladder: **"Dominant over every other {noun}"** (noun: colour / pattern / fin type / line).
- `mendelian`, otherwise: **"Recessive to {A}"** / **"Recessive to {A} and {B}"** (alleles above it, max 2 named) or **"Recessive to most colours"** when ≥ 3 are above.
- Conditional loci (rules that need another locus, e.g. Cambodian needs red): append **" · only shows on red bettas"**.
- `codominant`: **"Codominant · one copy {het name}, two {hom name}"** (clownfish: "one copy Snowflake, two Platinum").
- `additive`: **"Additive · two copies = {name}"**.
- New loci prefix **"New gene · "**.

Copies chip:
- **Known from the phenotype** (neutral chip, title "The visible trait already proves this"): codominant/additive loci always; mendelian loci when the expressed allele has nothing below it (bottom of ladder) → "2 copies"; otherwise for new-gene loci where no copy is present AND it would be visible → "no copies". Text: **"no copies" / "1 copy" / "2 copies"**.
- **Hidden** (before the Genetics Lab): dashed chip with a lock: **"+ ?"**, title "Second copy hidden until the Genetics Lab".
- **Revealed** (after the Genetics Lab): violet chip **"carries {allele name}"** (het) / **"2 copies"** (hom) / **"no copies"**. A `rare` allele carrier gets a sparkle and a slightly stronger tint.

Footer line:
- Before the lab and at least one hidden row: lock icon + **"What it carries stays hidden until you research the Genetics Lab."**
- After the lab: violet Dna line **"Genetics Lab: {advice}"**, where advice is generated: if the animal carries a recessive the player can use, "Pair {him/her} with another {allele} carrier for about 1 in 4 {allele} young." For a known partner in the player's tanks, compute with `predictOffspringMorphs` (e.g. "He carries Cambodian: paired with Cinder, about 3 in 8 young would be Red Cambodian."). If nothing is hidden at all: **"Nothing hidden: every trait here shows its copies."** (additive/codominant-only species: "Nothing hidden: additive traits always show their copies.")

Data source: `offer.creatures[active].genome` (pre-rolled; no new offer fields). Disclosure rule matches the creature card: hidden until `genetics_lab` is unlocked (§9.1).

### 7.5 Destination tank, fit and buying

Keep the existing tiles (`pn-desttank`: name, "{gal} gal · {water class}", "{n} residents" or **"Wrong water"** in danger tone, plus the "+ New tank" tile) and the existing gate/compat logic. Changes:

1. **Per-tile verdict line (new):** for each suitable tank, run `previewAddition` (the same call `OfferDetail` already makes for the selected tank). Show its verdict on the tile with icon + word, e.g. "Excellent match" or "Incompatible — Ember would fight him": the verdict label plus a short form of the top reason. The selected tile keeps the full `CompatPreview` below, as today.
2. **Fit summary badge:** on desktop it sits next to the price in the buy bar, where `VerdictBadge` is today. On phones it goes on the "Destination tank" section header, because the phone buy bar has no room.
   - **Which labels:** there are two `VERDICT_LABEL` maps today.
     - The long one in `src/ui/panels/common/format.ts` L170: "Excellent match", "Usually compatible", "Conditional", "High risk", "Incompatible". `CompatPreview` uses it.
     - The short one in `src/ui/common/format.ts` L59: "Excellent", … The buy bar's `VerdictBadge` uses it (`src/ui/common/CompatView.tsx` L86).
   - The tiles and the fit badge use the **long** labels, as the prototype shows. Render the badge the way `CompatPreview` does (`StatusBadge` + `verdictStatus`, L39) rather than with `VerdictBadge`. Don't change the short map; other screens use it.
3. **No tank passes the environment gate** (`suitable.length === 0` — `environmentGate` only checks freshwater / marine / brackish, e.g. a clownfish or seahorse when all your tanks are freshwater):
   - Tiles show **"Freshwater"** (danger, `CircleX` icon) instead of "Wrong water", so the reason is explicit.
   - Fit badge (watch tone): **"No marine tank"** / **"No brackish tank"**.
   - The existing danger callout is reworded: **"Saltwater animals need a marine tank. Build one first; the offer stays until it expires."** (brackish: "Brackish animals need a brackish tank. …").
   - The **Buy button becomes a gold "Build a marine tank"** (phone: **"Build a tank"**), `Hammer` icon. It calls the existing `rememberOfferReturn(offer.id, waterClass)` and opens `#/build/tanks`, so Quick buy returns to the offer, as today.
4. **Gate passes but the water class is wrong** (e.g. axolotls are `freshwater_cool`; your tanks are tropical): **not blocked**, as today.
   - The selected tank's verdict (typically "High risk") shows on the badge.
   - The existing **risk acknowledgement** checkbox ("I understand the risks and want to go ahead") is required.
   - The existing watch callout ("Axolotls usually live in cool freshwater setups.") gains a link **"Set up a cool-water tank"** → `#/build/tanks`. On phones the link sits under the text, not beside it.
   - Tiles say why in a few words, e.g. **"High risk — too warm for axolotls"**. The full reason stays in `CompatPreview`, worded by the compatibility engine (`compat/engine.ts` L387): "This tank runs at about 25 °C — too warm for axolotls (10–21 °C)."
   - Use the species' tolerable range (`tempC.min`–`max`, 10–21 °C for axolotls), not its ideal range (15–18 °C).
   - Keep "10–21 °C" on one line: use a no-break space before "°C".
5. **Buy button labels.** These are today's labels plus the new ones and the phone variants. When several conditions hold, the first matching row wins:

| # | Condition | Desktop label | Phone label |
|---|---|---|---|
| 1 | Locked species | "Locked" (existing) | "Locked" |
| 2 | Group with nobody picked | "Pick at least one animal" (existing) | "Pick one" |
| 3 | No tank passes the environment gate (**new**; includes having no tanks at all) | **"Build a marine tank"** / **"Build a brackish tank"** (gold, enabled) | **"Build a tank"** |
| 4 | Not enough money | "Not enough money" (disabled; existing) | "Not enough" (disabled) |
| 5 | The selected tile fails the gate while another tank would pass | "Choose a suitable tank" (disabled; existing) | "Choose a tank" |
| 6 | Risky and not yet confirmed | "Confirm the risk first" (disabled; existing) | "Confirm the risk" |
| 7 | Can buy | **"Buy for $X"** (existing) | **"Buy"** |

   - Under the price: "{$left} left after" (existing) or, when short, **"You need $X more"** (new; danger tone).
   - With no tanks at all, the existing "You need an aquarium first." callout and its "Buy a tank" button stay.
6. **After buying** (existing `act(... buyOffer ...)` closes the sub-view): close the Market and return to the tank view (`#/`), focused on the destination tank (existing), with a toast:
   - Prismatic: celebrate toast, label **"Prismatic find"**, title **"{Morph name} is settling into {Tank}"**, detail **"Find them in Livestock."**
   - Otherwise: success toast, label **"Bought"**, same title/detail.

### 7.6 Offer that's gone

Route `#/shop/fish/:id` with an id not in stock (bought, expired or invented).
- **Keep the existing state** (`Shop.tsx` L37–44): a `SubView` with the back bar "Back to shop", and an `EmptyState` with the `Clock` icon, title **"This offer has gone"** and text **"Another shop snapped it up, or it expired. New stock arrives regularly."**
- **Add (new)** a button **"See what's in stock"** (`Store` icon) → `#/shop`. Today the state has no button.

### 7.7 Prismatic touchpoints (existing system, new surfaces)

| Surface | Status |
|---|---|
| Shop sort (Prismatic first), `PrismaticBadge`, card frame, detail callout, ×12 value, lot rule, encyclopedia `PrismaticBox`, achievement, render glints | Existing — unchanged |
| "Prismatic only" filter + empty state | New (§7.2) |
| Notification "Prismatic {species} in the shop" (category Rare stock) and Alerts drawer link "Open the shop" → `#/shop/fish/:id` | New (§12) |
| Celebrate toast on purchase | New copy (§7.5) |
| Livestock row: compact Prismatic badge after the name; row frame tinted | Existing badge; row frame new |
| Leaderboard "Prismatics" | New (§13) |
| Phone tab bar dot on Market when a Prismatic is newly stocked | New (§5.2) |

### 7.8 Supplies: automation gear

Market › Supplies › Equipment (existing rows) gains the **Auto Water Changer** row (§10.3). Row layout on phones is reworked so the description gets the full width: icon/swatch left; name + chips; description; then a bottom line with the info (e.g. "34 servings left · about 17 days" / price) on the left and the action ("Buy · $6", "Buy & install") on the right.

---

## 8. Genetics expansion (new betta genes)

Lane `genetics`. Extend, don't rewrite: everything below is data in `src/data/species/betta.ts` plus one optional type field. The engine (`src/sim/life/genetics.ts`, `morphCatalog.ts`) is untouched.

### 8.1 What and why

Two new betta loci, both well known to betta keepers and both expressible with the engine's existing modes:

| Gene | Mode | In play | Real-world basis (simplified) |
|---|---|---|---|
| **Cambodian** (`c`) | `mendelian`, recessive | Two copies **on a red betta** give a pale, flesh-pink body with red fins ("Red Cambodian Veiltail"). On any other colour it stays hidden. | Hobby genetics treats Cambodian as a simple recessive affecting body colour on red fish. Confidence: medium (breeder consensus and a Thai school research project; no peer-reviewed locus). |
| **Metallic** (`me`) | `additive` | One copy adds a soft sheen (visual blended at 50%, no name change). Two copies give the full "Metallic" look and add "Metallic" to the name. | Metallic/iridescent bettas descend from crosses with wild species; peer-reviewed work maps iridescence to specific genomic regions but it is likely polygenic. One additive locus is a **labelled game simplification**. Confidence: low–medium. |

The locus `note` fields must say they are simplifications (see code below). Sources: Appendix D.

### 8.2 Type change

`src/types/species.ts`, `LocusDefinition.alleles[]` — add one optional flag:

```ts
/** lane:genetics — a collector-sought allele: the shop's "Rare genes" filter includes hidden carriers of it once the Genetics Lab is researched. */
rare?: boolean;
```

Initial `rare` flags (data only): betta `c` (Cambodian), `marble`, `dragon`, `double`, `white`; ocellaris clownfish `mb` (Misbar); lined seahorse `p` (Pinto); axolotl `ax` (Axanthic), `c` (Copper). Additive and codominant alleles are always visible, so flagging them has no effect on hidden-carrier matching.

### 8.3 Betta data (`src/data/species/betta.ts`)

Append two loci after `fins`:

```ts
// lane:genetics — 0.5 expansion
{
  id: 'cambodian',
  name: 'Cambodian',
  mode: 'mendelian',
  alleles: [
    { id: 'C', name: 'Normal body', dominance: 2, frequency: 0.9 },
    { id: 'c', name: 'Cambodian', dominance: 1, frequency: 0.1, rare: true },
  ],
  note: 'Game simplification: a single recessive that pales the body of red bettas (fins stay red). It has no visible effect on other colours, so non-red fish can carry it unseen.',
},
{
  id: 'metallic',
  name: 'Metallic',
  mode: 'additive',
  alleles: [
    { id: 'std', name: 'Standard sheen', dominance: 1, frequency: 0.88 },
    { id: 'me', name: 'Metallic', dominance: 1, frequency: 0.12 },
  ],
  note: 'Game simplification: real metallic/iridescent scaling is polygenic and came from wild-species crosses. Here one copy adds a soft sheen and two copies give the full Metallic look.',
},
```

Insert two **overlay** rules **before the first existing overlay** (`butterfly`), so composed names read "Red Cambodian Veiltail" / "Royal Blue Metallic Butterfly Halfmoon":

```ts
{ id: 'metallic', name: 'Metallic', layer: 'overlay', rarity: 0.2,
  when: [{ locus: 'metallic', allele: 'me', count: 'hom' }],
  visual: { metallic: 0.75, iridescence: 0.9 } },
{ id: 'cambodian', name: 'Cambodian', layer: 'overlay', rarity: 0.25,
  when: [{ locus: 'cambodian', allele: 'c', count: 'hom' }, { locus: 'color', allele: 'red', count: 'any' }],
  visual: { bodyColor: '#e9c3b0', bodyColor2: '#d9a892', bellyColor: '#f2d6c8' } },
```

**Visual order caveat (accepted, no engine change).**
- Overlays apply their `visual` in rule order (`resolveMorph`, `genetics.ts` L386). A fully expressed rule *assigns* its values (`applyVisual`).
- Dragon Scale comes later in the list and sets `metallic: 0.7` (`betta.ts` L157). So on a Metallic Dragon Scale fish, Dragon Scale's 0.7 replaces Metallic's 0.75, and the extra Metallic look there comes from `iridescence: 0.9`.
- That's fine: Dragon Scale already reads as metallic.
- Don't move Metallic after the pattern overlays to "fix" it. Rule order also sets the name, and the name must read "Royal Blue Metallic Marble Dragon Scale …".

Add the tenth strain to `strains`:

```ts
{ id: 'cambodian_veil', name: 'Cambodian Veiltail', requires: ['red', 'cambodian', 'veil'], tier: 'very_rare',
  note: 'A pale, flesh-pink body under flowing red veil fins — the classic Cambodian look.' },
```

Add `'Cambodian'` and `'Metallic'` to the betta `visualMorphs` chips (both are reachable, which `fix-panels-b-morphs.test.ts` requires). Update `genetics.notes` with one sentence on the two new genes.

**Engine behaviours this relies on (verified):**
- Additive `hom` rules are half-expressed with one copy (visual blended at 0.5) and add no name (`genetics.ts` L191).
- `any` conditions only match an *expressed* allele, so `color: red any` means "the fish shows red".
- `composeMorphName` inserts single-token overlays in rule order and removes repeated words.
- No new `PatternKind` or fin type is introduced, so **no renderer or shader work** is required — only `CreatureVisualParams` fields that already exist (`bodyColor`, `bodyColor2`, `bellyColor`, `metallic`, `iridescence`).

### 8.4 Resulting names (checked by running the engine on a scratch copy)

| Genotype (relevant loci) | Display name |
|---|---|
| color royal/yellow · butterfly/marble · halfmoon/crown · metallic me/std | Royal Blue Butterfly Halfmoon Betta (one copy: sheen only) |
| same with metallic me/me | **Royal Blue Metallic Butterfly Halfmoon Betta** |
| color red/yellow · solid · veil · cambodian c/c | **Red Cambodian Veiltail Betta** |
| color royal/red · solid · veil · cambodian c/c | Red Cambodian Veiltail Betta (red is expressed: red is dominant) |
| color royal/royal · cambodian c/c | Royal Blue … (Cambodian hidden — only shows on red) |

Breeding forecast (`predictOffspringMorphs`), Red Cambodian Veiltail female (red/red, c/c) × Red Veiltail male (red/yellow, C/c): **50% Red Veiltail, 50% Red Cambodian Veiltail**. With a red/copper C/c male and a red/royal c/c female (the prototype's "Cinder" case): about **3 in 8** young are Red Cambodian (3/4 red × 1/2 c/c).

### 8.5 Catalog and rarity, before → after

| | v0.4.0 | 0.5 |
|---|---|---|
| Genotypes | 36 × 15 × 15 = 8,100 | × 3 × 3 = **72,900** (species tests cap at 200k; catalog is exact up to 400k) |
| Catalog entries | **240** (8 groups × 30) | **540** — Red **120**, every other group **60** |
| Tier counts (common / uncommon / rare / very rare / legendary) | 1 / 9 / 21 / 39 / 170 | 1 / 9 / 21 / 43 / 466 |
| Offspring forecast combinations (worst case) | 4 × 4 × 4 = 64 | 4 × 4 × 4 × 3 × 3 = **576**. Each new locus has two alleles, so it has at most three distinct pairs. The cap is `MAX_COMBOS` = 4,096 (`genetics.ts` L507), so this is fine. |
| Royal Blue Butterfly Halfmoon | Rare · 1 in 141 | Rare · **1 in 143** |
| Black Melano Dragon Scale Plakat (Black Samurai) | Legendary · 1 in 26,573 | Legendary · **1 in 26,961** |
| Red Veiltail | Common · 1 in 5 | Common · 1 in 5 |
| Opaque White Veiltail | Very rare · 1 in 534 | Very rare · 1 in 541 |
| Red Cambodian Veiltail | — | **Very rare · 1 in 520** |
| Red Metallic Veiltail | — | **Very rare · 1 in 360** |
| Royal Blue Metallic Veiltail | — | Very rare · 1 in 827 |
| Royal Blue Metallic Butterfly Halfmoon | — | **Legendary · 1 in 9,804** |
| Group share (whole colour group) | — | Red 1 in 2 · Royal Blue 1 in 5 · Turquoise 1 in 8 · Steel Blue 1 in 15 · Copper 1 in 29 · Black Melano 1 in 41 · Yellow 1 in 68 · Opaque White 1 in 204 |

Full list for the Royal Blue group: Appendix C.

### 8.6 Save compatibility

- `normalizeGenome` fills a missing locus with its **most common allele**: `C/C` and `std/std`. Neither triggers an overlay, so **every existing betta keeps its name, appearance and value**. No migration, no repair notes.
- `morphName`/`appearance` stay cached on creatures as today.
- **Every new betta rolls two extra loci, so the simulation's RNG stream shifts after the first new betta.**
  - `rollGenome` makes two draws per locus.
  - `inheritGenome` makes two allele picks plus one mutation check per locus (three draws), and two more when a mutation fires (`genetics.ts` L132–146).
- **What that does to tests:**
  - Determinism tests compare runs against each other, so they stay green.
  - Name tests on hand-built genomes (`bettaGenome(...)` and similar) should be unaffected, because missing loci fall back to the most common allele. Re-run them anyway: when they breed, the shifted stream can, rarely, move a mutation.
  - The one test that depends on the seeded stream is `fix-panels-b-morphs.test.ts`, which rolls 600 creatures per species with seed 42 (§20.3).
- **Requirement:** in both new loci the wild-type allele must stay the most common (`C` at 0.9, `std` at 0.88). That's what `allelePair` falls back to for a missing locus.

### 8.7 Where the new genes show up

- **Offer detail › Genes** (§7.4.1) — every offer, every species.
- **Offer cards** — "New gene · Cambodian" chip; after the lab, "Carries Cambodian".
- **Encyclopedia › Betta**:
  - Genes line (new, chips): "Body colour · 8 alleles · dominance ladder", "Pattern · 5 · ladder", "Finnage · 5 · ladder", "Cambodian · recessive" (aqua, sparkle), "Metallic · additive" (aqua, sparkle), with the note **"New in 0.5: Cambodian (recessive, shows on red bettas) and Metallic (additive — one copy adds a sheen, two make it Metallic)."**
  - Morph catalog heading **"Morph catalog · {seen}/540 seen"**; colour groups now 120/60; unseen entries show seen trait words with "???".
  - Named strains **"{found}/10"** including the new Cambodian Veiltail (with a "New" chip).
  - Aquarium science: new article **"How genes combine: dominant, recessive and additive"** (marked "New").
- **Creature card** — gene rows from `describeGenetics` gain "Cambodian" and "Metallic" automatically (once §9.1 is fixed).
- **Shop "Rare genes" filter** — via `morphTierOf` and the `rare` allele flag.

---

## 9. Genetics Lab reveal fix and temperament

### 9.1 Bug: the Genetics Lab never reveals genes for new animals

- Every new animal is created with `geneticsRevealed: 0` (`src/sim/life/index.ts` L120) and nothing raises it.
- `CreatureCard.tsx` L545–546:
  ```ts
  const geneticsOpen = (c.geneticsRevealed ?? 0) >= 1 || isUnlocked(game, 'genetics_lab');
  const genetics = geneticsOpen ? describeGenetics(sp, c.genome, c.geneticsRevealed ?? 1) : [];
  ```
  (simplified; the real code wraps both calls in `safe(…)`.) With the lab researched, `geneticsOpen` is true but `revealLevel` is `0` (not nullish, so `?? 1` never applies). `describeGenetics` then returns band words only — **no "carries … (het)" rows**. Only very old saves (field missing) show the gene rows.
- **Fix** (one line, `ui-shell` lane; `CreatureCard.tsx` declares `OWNER: lane "ui-shell"`): compute the level as `const level = isUnlocked(game, 'genetics_lab') ? 1 : (c.geneticsRevealed ?? 0);` and pass `level`. Use the **same rule** for the shop's Genes panel (§7.4.1), the Rare genes filter (§7.2) and the temperament numbers (§9.2). Add a regression test (§20.1).

### 9.2 Temperament on offers (brief item 3)

**Today:**
- Temperament and curiosity are heritable potentials (`Potentials.temperament`, `curiosity`). `inheritGenome` passes them on with regression toward 50 and noise SD 10.
- Personality tags are **not** inherited; each animal re-rolls them.
- Offers already name both potentials. `PotentialBands` (`src/ui/panels/common/Profile.tsx`, lane `ui-panels`) ends its full list with two word rows, "Temperament · Even-tempered" and "Curiosity · Mildly curious" (L84–93).
- The offer detail's **Individual profile** is the only full-list caller (`Shop.tsx` L306). The offer cards use `highlightOnly`, which skips those rows.
- The creature card shows the same words as key–value rows (`CreatureCard.tsx` L665–666).

**0.5** moves temperament out of the profile list into its own section, so it isn't shown twice:
- Add an optional prop to `PotentialBands`, `temperament?: boolean` (default `true`, so other callers don't change). `OfferDetail` passes `false`.

New **Temperament** section in the offer detail, after Genes:

- `SectionHead` "Temperament" (`Smile` icon). A bordered box with two rows:
  - **Temperament** — a 6px track (blue → aqua → coral gradient) with a 12px white thumb at the value (0–100), end labels "Shy" / "Bold"; on the right the word from `temperamentWord` (**Very shy · Shy · Even-tempered · Bold · Very bold**).
  - **Curiosity** — same, end labels "Reserved" / "Curious"; word from `curiosityWord` (**Reserved · Mildly curious · Curious · Very curious**).
  - **Numbers only after the Genetics Lab** ("Bold · 66"), matching `describeGenetics`' exact mode.
- Footer (ink-3): **"Inherited: young land near their parents' average. Personality quirks are each animal's own."**
- Groups (e.g. 10 shrimp): no meters; text **"A group of {n}: each {noun} has its own temperament. They inherit it from their parents."**
- Optional follow-up (not required for 0.5): show the same two meters on the creature card and in the breeding forecast ("Young will likely be: Bold · Curious").

---

## 10. Automation: Auto-feed and Auto-clean

The model is **switches unlocked by gear** (D3). A switch only works when the tank has the device installed; otherwise the row explains what's needed and offers to buy it.

Who owns what (this work is tagged `// lane:automation`, but "automation" is not a lane):
- **`waterlab`** owns the sim and data files: `src/data/catalog/equipment.ts`, `src/sim/care/index.ts`, `src/sim/water/env.ts` and `src/sim/water/step.ts`.
- **`staff`** owns `src/sim/staff/work.ts` (the keeper interplay).
- **`ui-shell`** owns the tank card (`src/ui/cards/TankCard.tsx`) and `src/ui/common/format.ts`.
- **core** owns `src/types/game.ts`; lanes may add optional fields there.

### 10.1 Tank card › Equipment tab layout

Tabs stay **Water · Equipment · Life · Value** (internal ids `water`, `gear`, `life`, `value`). The Equipment tab (`GearTab`, `src/ui/cards/TankCard.tsx` L415) becomes, top to bottom:

1. **Automation** (new section, `Zap` icon) — Auto-feed row, Auto-clean row.
2. **Equipment** (existing `EquipmentRow` list: power toggle, heater/chiller stepper "Heat to 26.0 °C", flow segmented, fit line).
3. **Lighting** (existing `LightingBlock`).

Row anatomy (both rows): 36px rounded icon chip (aqua tint) · title (13.5px/620) · one or two sublines (11.5px ink-3) · **switch** on the right (`role="switch"`, 44×26, aqua track when on). Installed rows have an aqua-tinted border; locked rows a dashed border and dimmer icon.

### 10.2 Auto-feed (uses the existing Autofeeder)

| State | Shows |
|---|---|
| Autofeeder installed, on | Title **"Auto-feed"**; subline **"Runs your Autofeeder · {food} · {n} servings left · about {d} days"**; a row **"Meals a day"** with a segmented control **1 · 2 · 3 · 4**; switch on. |
| Installed, off (or legacy `setting: 0`) | Same title; subline ends "{n} servings left · paused"; warning line (amber) **"Paused — feed {name} by hand, or a keeper will on their rounds."** (drop the keeper clause when the tank has no keeper); switch off; no meals control. |
| Not installed | Dashed row, title **"Auto-feed"** + lock icon, text **"Drops a measured portion of dry food on a schedule."**, line **"Needs an Autofeeder"** + gold button **"Buy · $35"** (buys and installs into this tank). If `gear_autofeeder` isn't unlocked: lock + hint **"Research Better Life Support, or build husbandry mastery with regular care."** |
| Installed but useless for these animals (`autofeederFit` = useless: e.g. seahorses, puffers need frozen/live food) | Existing fit line in watch tone, e.g. "Can't feed seahorses — they need frozen or live food." |

Wiring (no new sim): the switch ↔ the Autofeeder `EquipmentInstance.on`; "Meals a day" ↔ `EquipmentInstance.setting` (1–4), both via the existing `setEquipment(state, tankId, eqId, {on?, setting?})`. Turning on a device whose `setting` is 0 sets it to 2 (the def's `defaultSetting`). `{food}` comes from `pickAutofeedFood`; `{d}` = ⌊servings ÷ (meals × `recommendedServings` per feeding)⌋, shown only when ≥ 1.

Alerts: when Auto-feed is paused (or the Autofeeder is empty/failed) **and** any resident's hunger is ≥ 50, the Alerts drawer's Tanks section shows a watch row: **"{Tank}"** · **"Auto-feed is paused — feed {name} by hand."** · link **"Fix"** → `#/tanks/:id/equipment`. Same event feeds the Animal care notification (§12).

### 10.3 Auto-clean (new: Auto Water Changer)

New equipment definition in `src/data/catalog/equipment.ts`. Two type-level changes go with it:
- Add `'water_changer'` to `EquipmentKind` in `src/types/game.ts`, tagged `// lane:automation`.
- **Add a matching entry to `EQUIPMENT_KIND_LABEL`** (`src/ui/common/format.ts` L134; e.g. `water_changer: 'Water changer'`). It's a complete `Record<EquipmentKind, string>`, so `npm run typecheck` fails without it.
- Optionally add a `Droplets` icon to `EQUIP_ICON` in `TankCard.tsx` L90 (a `Partial` record, so it isn't required). The equipment `switch` statements in `care/fit.ts`, `water/env.ts` and `water/step.ts` all have default branches.

```ts
{
  id: 'auto_water_changer',
  kind: 'water_changer',
  name: 'Auto Water Changer',
  tier: 2,
  price: 120,
  upkeep: 0.06,
  unlock: 'gear_autofeeder',          // same rule as the Autofeeder: Better Life Support research or husbandry mastery 220
  environments: ALL_ENV,
  gallonsRange: { min: 5, max: 300 },
  stats: { defaultSetting: 0.1, failureRate: 0.002 }, // setting = share of the water changed each morning
  visual: 'ato_sensor',               // reuse an existing prop until the render lane adds one
  description: 'Swaps a small share of the water every morning from a conditioned reservoir and scrapes the front glass once a week. Marine and brackish tanks draw on your salt stock for the new water.',
},
```

| State | Shows |
|---|---|
| Not installed | Dashed row, **"Auto-clean"** + lock, text **"Small daily water changes and a weekly glass scrape."**, line **"Needs an Auto Water Changer"** + gold **"Buy · $120"**; the switch is shown disabled (`aria-disabled`, 40% opacity). Not enough money → toast **"Not enough money"** · "The Auto Water Changer costs $120." |
| Installed | **"Auto-clean"**; subline **"Runs your Auto Water Changer · 10% each morning · glass once a week · $0.06/day"**; switch ↔ device `on`. |
| On (Water tab) | Aqua callout under the water headline: **"Auto-clean is on"** · **"The Auto Water Changer swaps 10% each morning and scrapes the glass once a week. You can still do it by hand."** |
| Out of salt (marine/brackish) | Notice (throttled 24 h like `autofeedNotice`): **"{Tank}: the Auto Water Changer is out of salt. Buy marine salt to keep it running."** |
| Failed | Existing equipment-failure alert ("Equipment failed — Auto Water Changer. Repair or replace it.") |

Buying from the tank card: `buyEquipment(state, tankId, 'auto_water_changer')` (existing, `src/sim/economy/purchases.ts` L287; it adds the install fit note and charges `spend(price,'equipment')`), then switch it on, toast (celebrate) **"Installed"** · **"Auto Water Changer on {Tank}"** · "Auto-clean is on. Switch it off any time on the tank card." Also listed in Market › Supplies › Equipment and Build › Equipment › "Buy equipment" ("Unlocks the Auto-clean switch on the tank card · upkeep $0.06/day").

**Simulation** (lane `waterlab`). Add a new `runWaterChanger(state, tank, env, dt, ctx)` in `src/sim/water/step.ts` and call it right after `runAutofeeder` in `stepTankWaterImpl` (L497).

- **When it runs:** only when the device is on and not failed. `equipmentSummary` (`water/env.ts`) gains `waterChanger?: EqEntry`, filled in its `switch (kind)` the same way `autofeeder` is.
- **Daily change:** at the tank's lights-on hour (`tank.lighting?.onHour ?? 8`), at most once per game day.
  - Find each time that hour falls inside the step window `[ctx.hour, ctx.hour + dt)`. Do it the way `runAutofeeder` walks its feed times, or with the exported `crossings(start, end, hod)` in `staff/work.ts` L60.
  - At each crossing, if ≥ 20 game hours have passed since `water.lab.lastAutoChangeHour` (new optional field), change `setting ?? 0.1` of the water with the temperature matched.
- **Weekly scrape:** at the same crossing, if ≥ 168 game hours have passed since `water.lab.lastAutoScrapeHour` (new optional field), scrape the glass.
- **How to run them without counting as the player** (the device must not move quest, mastery or achievement counters):
  - *Preferred:* extract the state-changing part of `waterChange` and of `cleanTank(…, 'glass')` into a new `src/sim/water/change.ts`, as `applyWaterChange(state, tank, fraction, opts)` and `scrapeGlass(tank)`.
    - `care/index.ts` then calls them, keeping its exported signatures, messages, salt use, shock warning, `bumpCounter('waterChanges' | 'cleanings')` and `lastMaintenanceHour` exactly as today.
    - The device calls the extracted functions directly: no counters, no message, no toast. It still sets `lastMaintenanceHour`, because the tank was maintained.
    - This also avoids an import cycle: `care/index.ts` already imports `sanitizeWater` from `water/step.ts`.
  - *Alternative:* import `waterChange`/`cleanTank` into `water/step.ts`. ESM tolerates that cycle as long as both sides only call each other inside functions. Wrap the calls in a counter guard like staff's `asStaff` (`staff/work.ts` L177; it isn't exported, so export it or copy its 10 lines).
  - Either way, keep the sudden-change (shock) check. It's real chemistry, and with matched temperature a 10% change rarely trips it.
- **Salt tanks:** check `waterChangeCost(state, tankId, fraction).enoughSalt` first.
  - If there isn't enough salt, skip the change and raise the out-of-salt notice, throttled to once a day with the same `warnKey(lab, key, at, 24)` that `autofeedNotice` uses.
  - Otherwise salt is used exactly as in a manual change.
- **Determinism:** no RNG. It must be step-size invariant, and it runs during offline catch-up because catch-up steps the same water sim.
- **Staff interplay** (lane `staff`): `keeperWaterCare` (`staff/work.ts` L456) skips its routine water change and glass scrape on tanks whose Auto Water Changer ran in the last 30 game hours. Keepers still do urgent ammonia/nitrite changes and gravel vacuuming.
- **Money:** upkeep flows through the existing `tankDailyCost` (operating) because it's an `on` device. No new ledger category.

### 10.4 Finances and Build

- Build › Equipment tiles: "Installed {n}" / "Upkeep ${x} per day" include the new device automatically.
- Finances › Running costs per day: optional new breakdown row **"Automation gear"** (sum of Autofeeder + Auto Water Changer upkeep across tanks).

---

## 11. Production line (Livestock › Production) — ships last

A player-configured loop that runs a breeding pair's output through existing systems: **Breed → Raise → Sort → Quarantine → Sell**. It automates clicks the player can already make (nursery moves, listings); it adds no new biology. Lane `production`. Phase 5 (§21).

### 11.1 UI

New 4th Livestock tab **"Production"** (route `#/livestock/production`, test id `livestock-tab-production`), after "Past residents". Content:

1. **Line header card** (aqua-tinted): two overlapping 40px portraits (the pair), title **"{Species} line"** (e.g. "Betta line"), status badge **"Running"** (good, `CirclePlay`) or **"Paused"** (watch, `Pause`), subline **"Breeds, raises and sells {morph} {species plural} while you play."**, switch **"{Species} line running"**.
2. **Tiles** (4; 2×2 on phones): **Next clutch** "~2 days" / "Pair conditioning"; **Growing out** "14 fry" / "Day 9 of 60"; **Listed now** "3" / "Best bid $31"; **This week** "+$146" / "After food and power".
3. **Stages** — five cards in a row on desktop (chevrons between) or stacked on phones (down chevrons). Each: number badge, icon, serif title, tank pill (`Box` icon + tank name · gallons), body. The currently active stage is highlighted (aqua border, number badge filled):
   - **1 Breed** (`Heart`) · Breeding Tank · "Blaze × Cinder · spawns about every 9 days" · progress "Day 6 of 9".
   - **2 Raise** (`Sprout`) · Grow-out Tub · "14 fry, fed 4× a day by Auto-feed" · "Day 9 of 60".
   - **3 Sort** (`ListFilter`) · chips "Keep Prismatic" (violet), "Keep best 2 Cambodian" (aqua), "Sell the rest".
   - **4 Quarantine** (`ShieldCheck`) · Quarantine · "3 juveniles" · amber bar · "4 days left".
   - **5 Sell** (`Gavel`) · Market · "Auctions, reserve at fair value −10%" · "3 listed · best bid $31".
4. **Line rules** — three switch rows: **"Pause when a tank is full"** ("Stops spawning when {raise tank} reaches its stocking limit."), **"Never sell Prismatic animals"** ("A Prismatic youngster always moves to {safe tank} instead."), **"List automatically"** ("Juveniles go to auction the day quarantine ends.").
5. **Empty state** (no line yet): `Factory` icon, **"No production line yet"**, **"Pick a breeding pair and the tanks to use. The line moves fry, sorts keepers and lists the rest for you."**, button **"Set up a line"** → a 3-step sub-view: *Choose a pair* (only compatible adult pairs) → *Choose tanks* (breed / raise / quarantine; validated with existing compat and stocking) → *Rules* → **"Start line"**.

### 11.2 Data (optional, no schema bump)

```ts
// src/types/game.ts — lane:production
export interface ProductionLine {
  id: Id;
  speciesId: string;
  pair: { motherId: Id; fatherId: Id };
  tanks: { breed: Id; raise: Id; quarantine: Id; keep: Id };
  running: boolean;
  rules: { pauseWhenFull: boolean; keepPrismatic: boolean; autoList: boolean; keep: { traitIds: string[]; count: number }[] };
  stats?: { soldCount: number; revenue: number; costs: number; weekStartHour: number };
}
export interface ProductionState { lines: ProductionLine[] }
// GameState: production?: ProductionState;   // absent = no lines
```

### 11.3 Simulation (`src/sim/production/index.ts`, called once per game hour from the world step — needs core sign-off for the `world.ts` hook)

- **Breed:** nothing new — the existing breeding sim spawns when conditions are right. If `pauseWhenFull` and the raise tank is at its stocking limit, the line stops the pair from spawning until there's room — either through the tank's existing optional `breedingEnv` conditions or by parking one parent in `tanks.keep`; choose during implementation after reading the breeding module.
- **Raise:** when a clutch from the pair reaches "Free-swimming fry", run the existing "Move to nursery" action into the raise tank.
- **Sort:** at the juvenile stage, keep up to `count` animals matching each `keep.traitIds` rule (best by `creatureValue`), move Prismatic ones to `tanks.keep` when `keepPrismatic`, and send the rest to quarantine.
- **Quarantine:** hold for 7 game days.
- **Sell:** if `autoList`, create a listing via the existing listing code (kind "Juveniles", reserve = fair value × 0.9). Never list a Prismatic.
- Deterministic, no RNG; step-size invariant; skips safely when any referenced creature or tank no longer exists (line pauses with a notice).

---

## 12. Notifications

Lanes `notify` (rules, settings UI) and `platform` (delivery). Nothing in the repo uses the Notification API, service workers or a manifest today; in-game toasts (`useUI.toast`), the sim log (`emitEvent`) and the Alerts drawer (`AlertsPopover`) stay as they are and remain the primary channel.

### 12.1 What notifications can and cannot do (read this first)

Facts from the code that shape the design:

- **The game loop pauses while the tab is hidden** (`GameLoop.tsx`); when the player comes back after ≥ 5 min, `catchUpAfterHidden` simulates the gap.
- **Time away is capped at 12 game hours** (`OFFLINE_CAP_HOURS = 12`; at 1× speed 1 game hour = 10 real seconds, so the cap is reached after about **2 real minutes** away). After that the world waits for the player.
- Therefore, **in a browser, nothing happens while the game is closed or hidden**, so there is nothing to notify about then. Web notifications are useful when the game is **open but not focused** (another window in front, or the browser window not active), plus the test notification.
- A phone **app** (native wrapper, later) can still tell the player what *will have happened* when they return: the simulation is deterministic, so the catch-up can be **forecast at the moment the player leaves** and turned into scheduled local notifications (§12.7). The copy promises exactly that ("They're worked out from your aquarium when you leave.").
- No push server in 0.5.

### 12.2 Categories, defaults and templates

Per-device preferences (not in the save): localStorage key **`aquarium-go.notify.v1`** `{ categories: Record<Category, boolean>, quiet: { on: boolean, start: 22, end: 8 } }`.

| Category (key) | Default | Events (sources) | Title / body template | Opens |
|---|---|---|---|---|
| **Rare stock** (`rare`) | On | Prismatic stocked (`announcePrismatic`), rare strain or special stocked (`stockNewUnlocks`, `maybeSpecial`) | **"Prismatic {species} in the shop"** / "{Seller} just stocked a Prismatic {morph}. It leaves in {time}." · **"Today only: {morph}"** / "{Seller} · {price}. Leaves {time}." | `#/shop/fish/{offerId}` |
| **Animal care** (`care`) | On | Tank danger status, Autofeeder empty, Auto-feed paused with hungry residents, illness | **"{Tank}"** / "{status reason}" (e.g. "Auto-feed is paused — Ember hasn't eaten since this morning.") | `#/tanks/{id}` or `#/tanks/{id}/equipment`; illness → `#/livestock/animal/{id}` |
| **Market** (`market`) | On | New bid, sale, auction ending soon | **"New bid on {title}"** / "{Buyer} offers {amount} ({vs fair value})." · **"Sold: {title}"** / "{Buyer} paid {amount}." | `#/market/listings/{id}` |
| **Breeding** (`breeding`) | On | Eggs laid, hatched, free-swimming | **"{Name} laid eggs"** / "{n} eggs in {Tank}." · **"{Name}'s eggs hatched"** / "{n} fry are free-swimming in {Tank}." | `#/livestock/eggs` |
| **Shows** (`shows`) | **Off** | Results of entered shows, club show reminders | **"{Show}: {Name} placed {place}"** / "{prize} prize · {ribbon} ribbon." · **"{Club}"** / "Club show on {day}. Entries close {day}." | `#/shows/results` or `#/social/clubs` |

Subtitles in Settings (exact): Rare stock — "Prismatic animals and rare strains in the shop"; Animal care — "Hungry or sick animals, empty autofeeders"; Market — "New bids, sales and auctions ending"; Breeding — "Eggs laid and fry hatched"; Shows — "Results from shows you entered".

**Event links need an offer id.** `GameEvent` (`src/types/game.ts` L796–807) carries `tankId`, `creatureId` and `listingId`, but no offer id. `announcePrismatic` (`src/sim/economy/shop.ts` L344) emits text only.
- Add `offerId?: Id` to `GameEvent`, tagged `// lane:notify`.
- Set it in `announcePrismatic`, `stockNewUnlocks` and `maybeSpecial` (lane `market`).
- `repairState` only checks that log entries are objects (`migrations.ts` L442), so the new field needs no repair code.
- Rare-stock events without an offer id open `#/shop`.

Rules (pure functions in `src/ui/notify/rules.ts`, unit-tested):
- Map `GameEvent` → `{category, title, body, route, priority}`; unmapped events never notify.
- **Quiet hours** (device clock, default 22:00–08:00, on): hold everything except **danger-level animal care**.
- **Rate limits:** max 1 notification per category per 30 real minutes (later ones collapse into "… and {n} more" on the next one); max 6 per real hour overall.
- Same `tag` per category so the OS replaces rather than stacks.

### 12.3 Settings › Notifications tab (new)

Settings tabs become **General · Play & access · Saves · Notifications · About** (`settingsTab` union widened; test ids `settings-tab-<id>`). Route `#/settings/notifications`. The strip scrolls on phones; the active tab is scrolled into view.

Top: one status callout —

| Permission | Callout (title / text) | Action |
|---|---|---|
| Not asked (`default`) | **"Notifications are off"** / web: "Get a nudge for rare stock, hungry animals and sales while Aquarium Go is open, even when you're in another window." · app: "Get a nudge for rare stock, hungry animals and sales — even when the game is closed." | Primary **"Turn on"** |
| Granted | **"Notifications are on"** (good) / web: "This browser shows alerts while Aquarium Go is open, even in another window. Close the tab and they stop." · app: "Alerts arrive on this phone, even when the game is closed. They're worked out from your aquarium when you leave." | — |
| Denied | web: **"Blocked in your browser"** / "To turn them on, allow notifications for this site in your browser's site settings, then come back." · app: **"Turned off for Aquarium Go"** / "To turn them on, allow notifications for Aquarium Go in your phone's Settings, then come back." | — |
| Unsupported | **"This browser can't show notifications"** / "Alerts still appear in the game. On iPhone, add Aquarium Go to your Home Screen to get notifications." | — |

Sections below:
1. **"This browser"** (web) / **"This phone"** (app): row **"Test notification"** — subline "Arrives in a couple of seconds" (granted), "Sent — it appears at the top of the screen" (after sending), or "Turn notifications on to try this" (otherwise) — button **"Send test"** (`Send` icon).
2. **"Notify me about"**: the five category rows (icon chip + title + subline + switch). Switches are **disabled** unless permission is granted.
3. **"Quiet hours"**: row **"10:00 PM – 8:00 AM"** / "Urgent animal care still comes through" + switch (default on). (Editing the hours is out of scope for 0.5.)

### 12.4 Permission flow

- **Never prompt on launch.** Entry points: Settings › Notifications "Turn on"; the Alerts drawer footer (permission `default` only): `BellRing` icon, **"Get alerts like these as system notifications, not just in here."** + **"Turn on"** → opens `#/settings/notifications`.
- "Turn on" calls `platform().notifications.request()` from the click handler (browsers require a user gesture). The OS/browser prompt appears — web (Chrome): "{site} wants to · Show notifications · Block / Allow"; iOS app: "“Aquarium Go” Would Like to Send You Notifications · Don't Allow / Allow". Their wording is the system's, not ours.
- Result **granted** → info toast **"Notifications on"** · "You'll hear about rare stock, care and sales" · "Choose exactly what below." Categories take their defaults. **denied** → the Denied callout. Dismissed → stays "Not asked".
- On desktop the browser shows a bell-off icon in the address bar when blocked; nothing to build.

### 12.5 Test notification

"Send test" (granted only): after ~1.5 s, `platform().notifications.show({ title: 'Test notification', body: "Notifications work on this device. You'll hear about rare stock, hungry animals and sales.", route: null, category: 'test' })`. Not granted → info toast **"Turn notifications on first"**. Fires even when the game is focused (it's a test).

### 12.6 Delivery on the web (0.5)

- **Where events come from:** the notify module subscribes to new `state.log` entries (the same stream `Toasts.tsx` uses) and runs §12.2's rules.
- **When to show a system notification:** permission granted **and** the category is on **and** not in quiet hours **and** `document.visibilityState === 'visible' && !document.hasFocus()` (open but not focused). When focused, the in-game toast is enough (no duplicates). When hidden, the loop is paused, so no events arrive.
- **How:** prefer a service worker (`registration.showNotification`), which phones and Android Chrome require; fall back to `new Notification(...)` on desktop. Add a minimal hand-written **`public/sw.js`** (no build plugin, no dependency) registered at `import.meta.env.BASE_URL + 'sw.js'` with scope `BASE_URL` (`/aquarium-go/`). It only handles `notificationclick`: focus an existing window and `postMessage({route})`, or open `BASE_URL + '#' + route`.
- **Notification content:** `title`, `body`, `icon` = the app icon (`public/favicon.svg` rendered to PNG at 192px), `tag` = category, `data.route`.
- **On click:** focus the game, `go(route, { fromNotification: true })` → e.g. the offer opens with the banner "Opened from your notification" (§7.4). If the game was closed (SW opened a new window), the boot flow in §6.4 runs: loading card "Then: Market › Prismatic betta", then the route.

### 12.7 Delivery while closed (phone app, later phase)

Only with a native wrapper (e.g. Capacitor `LocalNotifications` + `App` lifecycle) — a **separate, explicitly approved dependency change** (§22). Design:

1. On app pause (`platform().lifecycle.onPause`): `const clone = structuredClone(game)` → `simulateOffline(clone, capMs, {})` with the same cap the real catch-up will use → collect new `log` events → run §12.2 rules → pick at most **3**: the highest-priority one scheduled at **+15 min** real time, the rest folded into one digest at **+2 h** ("While you were away: Cinder's eggs hatched, 2 new bids, and 1 more"). Respect quiet hours by shifting to the next allowed time. Budget: abort the forecast after ~1 s (schedule nothing rather than something wrong).
2. On resume: `cancelAll()` pending notifications; the real catch-up (same deterministic code, same state, cap already reached because ≥ 15 min passed) produces the same events the notifications described.
3. Tapping one opens the app at its route through the §6.4 flow; the prototype's lock screen + "Loading your save · catching up 3 h 12 min… Then: Market › Prismatic betta" demonstrates this.

### 12.8 Prototype coverage

The prototypes demonstrate: the Settings tab in all three states, the system prompts (iOS-style on the phone, Chrome-style on desktop), the test notification banner, the Prismatic and hatch alerts (as an in-app banner on the phone, as a macOS-style notification on desktop, or as an in-game toast labelled "Notifications off · in-game only" when not allowed), the lock screen with category-filtered notifications, tapping one → loading card → offer with the banner, and the Alerts drawer footer.

---

## 13. Accounts and social (stubs)

Lane `social`. **There is no server in 0.5.** Everything goes through a `SocialService` interface implemented by a local stub, so the UI, routes and states are real and a backend can be swapped in later without UI changes. The game itself stays local and offline-first; an account only adds social features.

### 13.1 Panel

New panel id **`social`** (add to `PanelId` in `src/state/ui.ts` — core-owned, needs sign-off — plus `PANEL_COMPONENTS` and `DOCK_ITEMS`). Header: `Globe` icon, title **"Social"**, subtitle **"Clubs, trading, friends and leaderboards"** when signed out, **"Signed in as {email}"** when signed in. Tabs (signed in only): **Overview · Clubs · Trading · Friends · Leaderboards** (`social-tab-<id>`); routes in §6.2. Desktop supports maximise (2-column overview).

### 13.2 Signed out: sign in / create account

- Title (serif) **"Bring your aquarium online"**; text **"Your game stays on this device and keeps working offline. An account adds clubs, trading circles, friends' aquariums and weekly leaderboards."**
- Fields: **Email** (`type=email`, `autocomplete=email`, placeholder "you@example.com"), **Password** (`type=password`, `autocomplete=current-password`, placeholder "At least 8 characters"). 16px font (no iOS zoom).
- Buttons: primary **"Sign in"** (`LogIn`), secondary **"Create account"** (`UserPlus`).
- Divider **"Have an invite?"**; invite code field (placeholder "Invite code, e.g. HIGHLAND-4821") + **"Join group"**.
- Validation (stub and future server alike): email must look like `x@y.z`; password ≥ 8 characters. Error (danger callout, `role="alert"`): **"Enter your email and a password of at least 8 characters."** Invalid invite: **"That invite code didn't match a club. Check it and try again."** Network failure (real backend later): **"Can't reach Aquarium Go online right now. Your game is fine — try again in a moment."**
- Success → toast **"Signed in"** · "{email}" · "Your aquarium still saves on this device." (create: label "Account created").
- The prototype's hint "Prototype: any email with an @ and a password of 8+ characters signs you in." ships **only in dev mode**.

### 13.3 Club invites (`#/social/join/:code`)

| State | Shows |
|---|---|
| Signed out, valid code | Aqua callout above the sign-in form: **"You're invited to Highland Betta Club"** · "Sign in or create an account to join. Your game stays on this device either way." After signing in, the join card shows. |
| Signed in, not a member | Card: club avatar (initials on a gradient), **"Join Highland Betta Club?"**, "Invite HIGHLAND-4821 · 128 members · club show on Saturday", text "Members share show dates, trade bettas and see each other's aquariums. You can leave any time.", buttons **"Join club"** (primary) / **"Not now"** (→ `#/social`). Joining → `#/social/clubs` + celebrate toast **"Welcome"** · "You joined Highland Betta Club" · "Club show on Saturday — entries close Friday." |
| Already a member | **"You're in Highland Betta Club"** · "This invite has already been used on your account." · button **"Open club"**. |
| Unknown or expired code | Empty state, `Ticket` icon: **"This invite has expired"** · "Ask the club for a new code, or browse clubs you can join right away." · **"Find clubs"**. |

### 13.4 Overview (signed in)

Desktop maximised: two columns. Phone: one column. Cards:

1. **Your club** — member: club row (avatar, name, "128 members · you joined in September", chip "Member") + strip "Club show on Saturday · 12 entries so far" with link **"Enter"** → `#/shows`. Not a member: **"No club yet"** · "Clubs share show dates, trades and advice." + **"Find clubs"** + ghost **"Use an invite"**. Header action "Find clubs".
2. **Trading circle** — 3 latest trades: avatar, "**Mara** offers 2 Golden Bold-spotted Pea Puffers" / "for your Red Veiltail Betta", button "View". Header action "All trades".
3. **Friends' aquariums** — 3 tiles: snapshot image (16:10), name, "1,000 gal · 48 likes" (heart icon). Header action "All friends".
4. **This week's leaderboard** — segmented **Collection value · Prismatics · Show wins**; top 4 rows (rank, avatar, name, value) + the player's own row highlighted (aqua) with their rank.
5. Footer: ghost **"Sign out"**.

### 13.5 Clubs, Trading, Friends, Leaderboards tabs

- **Clubs:** search field "Search clubs or paste an invite code"; section "Your club"; section "Suggested for you" — rows: avatar, name, "{n} members · {blurb}", button **"Join"** → becomes **"Joined"** (check) + toast "You joined {club}".
- **Trading:** coral hero card **"Trade with your circle"** · "Offer an animal, ask for one, or both. Trades settle the next time both games are online." + **"Offer a trade"** (stub: opens a "coming soon" note); list of trades as in Overview.
- **Friends:** "Friend code, e.g. MYAQUA-7Q2" field + **"Add friend"**; grid of aquarium tiles (2 cols phone, 3 desktop); note **"Visits are read-only snapshots: friends see your tanks as they were when you last went online."**
- **Leaderboards:** the leaderboard card full width. Values: Collection value = sum of `creatureValue` + tank values; Prismatics = count of owned Prismatic animals; Show wins = class wins this week.

### 13.6 Service interface and stub

```ts
// src/social/service.ts — lane:social
export interface SocialUser { id: string; email: string; displayName: string; friendCode: string }
export interface Club { id: string; name: string; initials: string; colors: [string, string]; members: number; blurb: string; nextEvent?: { title: string; when: string } }
export interface TradeOffer { id: string; from: string; gives: string; wants: string; createdAt: string }
export interface FriendAquarium { id: string; owner: string; title: string; gallons: number | null; likes: number; snapshotUrl: string; updatedAt: string }
export type LeaderboardKind = 'collection_value' | 'prismatics' | 'show_wins';
export interface LeaderboardRow { rank: number; name: string; value: number; me?: boolean }

export interface SocialService {
  currentUser(): Promise<SocialUser | null>;
  signIn(email: string, password: string): Promise<SocialUser>;   // rejects with { code: 'invalid' | 'network' }
  signUp(email: string, password: string): Promise<SocialUser>;
  signOut(): Promise<void>;
  clubs(): Promise<{ mine: Club[]; suggested: Club[] }>;
  resolveInvite(code: string): Promise<{ club: Club; alreadyMember: boolean } | null>; // null = expired/unknown
  joinClub(clubId: string): Promise<void>;
  trades(): Promise<TradeOffer[]>;
  friendsAquariums(): Promise<FriendAquarium[]>;
  addFriend(code: string): Promise<void>;
  leaderboard(kind: LeaderboardKind): Promise<{ rows: LeaderboardRow[]; me: LeaderboardRow }>;
}
export function createLocalSocialStub(): SocialService; // canned data, 300–600 ms fake latency, localStorage 'aquarium-go.social.v1'
```

Stub rules: **never store the password** (store only `{ email, displayName, joinedClubIds }`); valid invite `HIGHLAND-4821`, everything else expired; the player's leaderboard row is computed locally from the save. Loading states: skeleton rows with a gentle shimmer (static when reduced motion). All social data lives outside the save.

---

## 14. Platform layer

Lane `platform`. A thin seam so the game doesn't call browser APIs directly and a native wrapper can be dropped in later.
- `src/platform/` makes **no runtime imports** from `persistence`, `sim`, `state` or `ui`. Type-only imports (e.g. `import type { KVBackend }`) are fine.
- UI code imports the platform. Persistence doesn't need to.

```ts
// src/platform/types.ts
export type NotifyPermission = 'default' | 'granted' | 'denied' | 'unsupported';
export type NotifyCategory = 'rare' | 'care' | 'market' | 'breeding' | 'shows' | 'test';
export interface PlatformNotification { id: string; title: string; body: string; route: string | null; category: NotifyCategory }

export interface NotificationPort {
  permission(): NotifyPermission;
  request(): Promise<NotifyPermission>;                        // call only from a user gesture
  show(n: PlatformNotification): Promise<boolean>;             // false = not shown (no permission / unsupported)
  schedule?(n: PlatformNotification, at: Date): Promise<boolean>; // native only (§12.7)
  cancelAll?(): Promise<void>;                                 // native only
  onOpen(cb: (route: string | null) => void): () => void;      // a notification was tapped
}

export interface Platform {
  kind: 'web' | 'native';
  notifications: NotificationPort;
  clipboard: { write(text: string): Promise<boolean> };
  share?(data: { title: string; url: string }): Promise<boolean>;
  lifecycle: { onPause(cb: () => void): () => void; onResume(cb: () => void): () => void };
  storageCandidates?(): KVBackend[];                           // optional: only a native platform supplies its own list
}
```

```ts
// src/platform/index.ts
export function platform(): Platform;            // lazily creates the web platform
export function setPlatform(p: Platform): void;  // native wrapper / tests
export function createWebPlatform(): Platform;
export function createMemoryPlatform(opts?: { permission?: NotifyPermission }): Platform & { shown: PlatformNotification[] }; // tests
```

Web implementation:
- **Notifications:** `Notification.permission` / `requestPermission()`; show via the service worker (`navigator.serviceWorker.ready` → `showNotification(title, { body, tag: category, icon, data: { route } })`), falling back to `new Notification()`; `onOpen` listens to SW `message` events and to `Notification.onclick`. `'unsupported'` when `!('Notification' in window)`.
- **Clipboard:** `navigator.clipboard.writeText`, fallback hidden-textarea copy; returns false on failure (UI then shows the link selected for manual copy).
- **Share:** `navigator.share` when present.
- **Lifecycle:** `visibilitychange` / `pagehide` / `pageshow`.
- **Storage:** the web platform leaves `storageCandidates` **undefined**, and persistence keeps its own detection unchanged.
  - Persistence already has the seam a native platform needs. `configureStorageDetection({ candidates })` (`storage.ts` L540) replaces the default list, which comes from the private, unexported `defaultCandidates()` (L193).
  - A native wrapper's boot code (lane `ui-shell`, in `UIRoot`) calls `configureStorageDetection({ candidates: p.storageCandidates })` when the platform defines it. Do it **before** anything reads or writes a save, because the call resets the active backend.
  - `storage.ts` is core-owned, and none of this requires changing it.
  - Optional cleanup for later, with core sign-off: `warn()` in `storage.ts` calls `useUI.toast` directly; route it through an injected notifier.

Native (later, needs approval): `createCapacitorPlatform()` mapping to `@capacitor/local-notifications` (`requestPermissions`, `schedule`, `cancel`, `localNotificationActionPerformed`), `@capacitor/app` (`pause`/`resume`, `appUrlOpen` → route), `@capacitor/clipboard`, `@capacitor/share`, and the same storage candidates.

---

## 15. Data model changes

All additive and optional; **`SCHEMA_VERSION` stays 1**; every field marked `// lane:<name>`.

The **Owner** column is the lane named in the file's header, which is the lane that edits it. The `// lane:` tag on new code names the 0.5 work stream (genetics, automation, notify…).

| File | Change | Owner | Needs core sign-off |
|---|---|---|---|
| `src/types/species.ts` | `LocusDefinition.alleles[].rare?: boolean` | core (types) | no (optional addition) |
| `src/data/species/betta.ts` | `cambodian` + `metallic` loci, two overlay rules, strain `cambodian_veil`, `visualMorphs` += Cambodian, Metallic, notes | genetics (no header; existing `// lane:genetics` edits) | no |
| `src/data/species/ocellaris_clownfish.ts`, `lined_seahorse.ts`, `axolotl.ts` | `rare: true` on `mb`, `p`, `ax`, `c` | genetics | no |
| `src/types/game.ts` | `EquipmentKind` += `'water_changer'`; `WaterLabState.lastAutoChangeHour?`, `lastAutoScrapeHour?`; `GameEvent.offerId?`; `GameState.production?: ProductionState` + `ProductionLine` types | core (types) | no (optional additions) |
| `src/ui/common/format.ts` | `EQUIPMENT_KIND_LABEL.water_changer` (**typecheck fails without it**) | ui-shell | no |
| `src/data/catalog/equipment.ts` | `auto_water_changer` definition | waterlab | no |
| `src/sim/water/env.ts`, `step.ts`, new `change.ts` | `equipmentSummary().waterChanger`; `runWaterChanger`; extracted `applyWaterChange` / `scrapeGlass` (§10.3) | waterlab | no |
| `src/sim/care/index.ts` | `waterChange` / `cleanTank` call the extracted core; signatures and behaviour unchanged | waterlab | no |
| `src/sim/staff/work.ts` | keepers skip routine change/scrape when the device ran recently | staff | no |
| `src/sim/economy/shop.ts` | set `offerId` on rare-stock events (§12.2) | market | no |
| `src/ui/common/notify.ts` | `navDots` gains an optional 4th parameter (unseen rare offers, §5.2) | notify | no |
| `src/ui/panels/common/Profile.tsx` | `PotentialBands` gains `temperament?: boolean` (§9.2) | ui-panels | no |
| `src/sim/production/` (new) | the line step | production (new) | **yes**: hook in `src/sim/world.ts` |
| `src/state/ui.ts` | `PanelId` += `'social'` | core | **yes** |
| `src/ui/common/shellStore.ts` | `settingsTab` widened to all Settings tab ids | ui-shell | no |
| `src/persistence/migrations.ts` (`repairState`) | validate `production` when present (drop lines that reference missing creatures or tanks; note a repair only when broken); check that the two optional lab hours are finite numbers | core (`OWNER: lane "core"`) | **yes** |
| `src/ui/cards/CreatureCard.tsx` | Genetics Lab reveal level fix (§9.1) | ui-shell | no |
| `package.json`, `CHANGELOG.md` | `version` → `0.5.0` and a new top entry `## 0.5.0 — YYYY-MM-DD` (`version.test.ts` requires both to match) | core | **yes** |
| localStorage (not the save) | `aquarium-go.notify.v1` (notification prefs), `aquarium-go.social.v1` (stub account, joined clubs) | notify, social | no |
| `public/sw.js` (new) | notification click handler only | platform (`public/` has no owner today; tell the orchestrator) | no |

Compatibility checks (add to `rare-persistence`-style tests): a v0.4.0 save loads with `repairs: []`; `stateHash` is identical across two save/load round trips; a fresh game needs no repairs; absent optional fields don't change the hash (`hash.ts` skips undefined).

New UI/source files (all new, so no merge conflicts): `src/ui/nav/{routes.ts,router.ts}`, `src/ui/hud/TabBar.tsx`, `src/ui/hud/MoreSheet.tsx`, `src/ui/panels/social/*`, `src/ui/settings/NotificationsTab.tsx`, `src/ui/notify/{rules.ts,deliver.ts}`, `src/ui/panels/market/shopFilters.ts`, `src/ui/panels/market/OfferGenes.tsx`, `src/ui/panels/market/OfferTemperament.tsx`, `src/ui/panels/livestock/Production.tsx`, `src/platform/*`, `src/social/*`, `src/sim/production/*`; CSS in new files `src/ui/styles/nav.css`, `social.css`, `notify.css`, `src/ui/panels/market/offer-genes.css`.

---

## 16. Copy deck (new and changed strings)

Exact strings. `{x}` = runtime value. Curly apostrophes and the en/em dashes are intentional.

**Navigation**

| Key | Text |
|---|---|
| Tab labels | Tanks · Livestock · Market · Build · More |
| More sheet title | More |
| More tiles | Visitors · Shows · Social · Research · Finances · Encyclopedia |
| More "New" tag | New |
| Settings row | Settings / Saves, sound, notifications |
| Guide bubble label | Guide · Research |
| Guide bubble text | Research now lives under **More**. Tap More, then Research. |
| Dock item | Social |

**Links and boot**

| Key | Text |
|---|---|
| Broken link toast | That link doesn’t go anywhere / Opened your aquarium instead. |
| Loading card | Loading your save · catching up {duration}… |
| Loading destination pill | Then: {destination} (e.g. "Market › Prismatic betta", "Ember’s Tank › Equipment", "Social › Club invite") |
| Copy link (desktop / aria) | Copy link / Copy link to this offer |
| Copied | Link copied |
| From notification banner | Opened from your notification |

**Locked panels**

| Key | Text |
|---|---|
| Visitors | Visitors open with a Specialty Shop / Upgrade to a specialty shop to welcome paying visitors. Links to this page keep working — they show this until it unlocks. / Open Build › Facility |
| Shows | Shows unlock after the guide / Finish the guide or reach 20 reputation to enter club shows. |

**Shop and offers**

| Key | Text |
|---|---|
| Filter chips | Prismatic only · Rare genes |
| Count | {visible} of {inStock} |
| Rare hint (no lab) | Showing rare traits you can see. Hidden carriers appear once you research the Genetics Lab. |
| Rare hint (lab) | Genetics Lab: animals carrying rare hidden genes are included. |
| Empty, Prismatic | No Prismatic animals right now / About 1 in 4,096 stocked animals shimmers. New stock arrives through the day. |
| Empty, other | Nothing matches that filter / Try another filter to see more animals. |
| Clear | Clear filters |
| Footer | Captive-bred animals are hardier and kinder to wild reefs and rivers. |
| Card chips | {Strain} · {Tier} strain · {Tier} morph · New gene · {Gene} · Carries {Gene} |
| Genes section | Genes |
| Gene "new" tag | NEW |
| Copies chips | no copies · 1 copy · 2 copies · + ? · carries {allele} |
| Hidden title | Second copy hidden until the Genetics Lab |
| Genes footer (no lab) | What it carries stays hidden until you research the Genetics Lab. |
| Genes footer (lab) | Genetics Lab: {advice} |
| Genes footer (nothing hidden) | Nothing hidden: every trait here shows its copies. / Nothing hidden: additive traits always show their copies. |
| Rule summaries | Dominant over every other {noun} · Recessive to {A} · Recessive to {A} and {B} · Recessive to most colours · Codominant · one copy {X}, two {Y} · Additive · two copies = {X} · New gene · … · only shows on red bettas |
| Temperament section | Temperament / Temperament · Curiosity / Shy – Bold · Reserved – Curious |
| Temperament footer | Inherited: young land near their parents’ average. Personality quirks are each animal’s own. |
| Temperament, group | A group of {n}: each {noun} has its own temperament. They inherit it from their parents. |
| Morph line | {Tier} morph · about 1 in {n} market {species plural} |
| Fit badges | No marine tank · No brackish tank (plus existing verdicts: Excellent match · Usually compatible · Conditional · High risk · Incompatible) |
| Marine callout | Saltwater animals need a marine tank. Build one first; the offer stays until it expires. |
| Cool-water callout link | Set up a cool-water tank (after the existing "Axolotls usually live in cool freshwater setups.") |
| Tile reason (water class) | High risk — too warm for axolotls (pattern: "{verdict} — too warm/cold for {species plural}") |
| Buy states, desktop | Locked · Pick at least one animal · Build a marine tank · Build a brackish tank · Not enough money · Choose a suitable tank · Confirm the risk first · Buy for {$} |
| Buy states, phone | Locked · Pick one · Build a tank · Not enough · Choose a tank · Confirm the risk · Buy |
| Short of money | You need {$} more |
| Bought toast | Prismatic find / Bought · {Morph name} is settling into {Tank} · Find them in Livestock. |
| Gone | This offer has gone / Another shop snapped it up, or it expired. New stock arrives regularly. (both existing) / See what’s in stock (new button) |
| Empty shop (existing) | The shelves are being restocked / Breeders deliver new captive-bred animals throughout the day. Check back soon. |
| Card second line | {Sex} · {size} cm · {first personality} (groups: Group of {n} · {size} cm) |
| Rare-stock dot (Market) | Prismatic {species} in the shop · Rare stock: {morph} |

**Automation**

| Key | Text |
|---|---|
| Section | Automation |
| Auto-feed on | Auto-feed / Runs your Autofeeder · {food} · {n} servings left · about {d} days / Meals a day |
| Auto-feed off | … · paused / Paused — feed {name} by hand, or a keeper will on their rounds. |
| Auto-feed missing | Drops a measured portion of dry food on a schedule. / Needs an Autofeeder / Buy · $35 |
| Auto-clean missing | Auto-clean / Small daily water changes and a weekly glass scrape. / Needs an Auto Water Changer / Buy · $120 |
| Auto-clean installed | Runs your Auto Water Changer · 10% each morning · glass once a week · $0.06/day |
| Water tab callout | Auto-clean is on / The Auto Water Changer swaps 10% each morning and scrapes the glass once a week. You can still do it by hand. |
| Installed toast | Installed / Auto Water Changer on {Tank} / Auto-clean is on. Switch it off any time on the tank card. |
| Not enough money toast | Not enough money / The Auto Water Changer costs $120. |
| Out of salt notice | {Tank}: the Auto Water Changer is out of salt. Buy marine salt to keep it running. |
| Alert row | Auto-feed is paused — feed {name} by hand. / Fix |
| Equipment description | Swaps a small share of the water every morning from a conditioned reservoir and scrapes the front glass once a week. Marine and brackish tanks draw on your salt stock for the new water. |
| Build/Supplies line | Unlocks the Auto-clean switch on the tank card · upkeep $0.06/day |
| Finances row | Automation gear |

**Production** — Production · {Species} line · Running · Paused · Breeds, raises and sells {morph} {species plural} while you play. · Next clutch · Growing out · Listed now · This week · Breed · Raise · Sort · Quarantine · Sell · Keep Prismatic · Keep best {n} {trait} · Sell the rest · Auctions, reserve at fair value −10% · Line rules · Pause when a tank is full · Stops spawning when {tank} reaches its stocking limit. · Never sell Prismatic animals · A Prismatic youngster always moves to {tank} instead. · List automatically · Juveniles go to auction the day quarantine ends. · No production line yet · Pick a breeding pair and the tanks to use. The line moves fry, sorts keepers and lists the rest for you. · Set up a line · Start line

**Notifications** — see §12.2–§12.5 for every string (categories, subtitles, callouts, test row, quiet hours, toasts, templates). Alerts drawer footer: Get alerts like these as system notifications, not just in here. / Turn on

**Social** — see §13.2–§13.5 (sign-in, errors, invites, overview cards, tabs).

**Settings › About** — "Aquarium Go v0.5.0" / "Build {sha} · {date}"; section **"What’s new in 0.5"**: Tab bar on phones, Social on the dock · Shop filters: Prismatic only and Rare genes · New betta genes: Cambodian and Metallic · Auto-feed and Auto-clean switches · Notifications and links to any screen.

**Encyclopedia** — "Cambodian · recessive" · "Metallic · additive" · New in 0.5: Cambodian (recessive, shows on red bettas) and Metallic (additive — one copy adds a sheen, two make it Metallic). · Morph catalog · {seen}/540 seen · Named strains · {n}/10 · Cambodian Veiltail · A pale, flesh-pink body under flowing red veil fins — the classic Cambodian look. · How genes combine: dominant, recessive and additive

---

## 17. Visual specification

Use the existing tokens (`src/ui/styles/tokens.css`) — values below are for reference and match the prototype.

**Colour**

| Token role | Value |
|---|---|
| Background | `#03090d` |
| Ink / ink-2 / ink-3 / ink-4 | `#eaf5f7` / `#b9ccd1` / `#8199a0` / `#5d7379` |
| Line / line-strong | `rgba(200,235,245,.11)` / `rgba(200,235,245,.20)` |
| Glass / glass-strong | `rgba(9,22,30,.68)` / `rgba(7,17,24,.84)`, blur `20px saturate(150%)` / `28px saturate(160%)` |
| Fill / fill-2 | `rgba(255,255,255,.045)` / `.075` |
| Aqua / aqua-2 / aqua-ink | `#5eead4` / `#2dd4bf` / `#04201d` |
| Coral · Gold · Violet · Blue | `#ff8a65` · `#f5c451` · `#b69cff` · `#7cc4ff` |
| Good · Watch · Danger | `#4ade80` · `#fbbf24` · `#f87171` |
| Panel sheet background | `linear-gradient(180deg, rgba(12,30,40,.86) 0%, rgba(7,18,26,.9) 42%, rgba(5,13,19,.93) 100%)` |
| Prismatic gradient | `linear-gradient(110deg, #ffd1ef 0%, #fff0b3 20%, #c6ffe6 40%, #cfe4ff 60%, #e6d4ff 80%, #ffd1ef 100%)` |

**Type:** Inter (UI; 400–800, optical size) and Fraunces (display/serif titles; `opsz`, `SOFT` axes). Panel titles Fraunces 24/560; section heads Inter 11.5 uppercase, letter-spacing .11em, 680, ink-3; body 13–14; chips 11.5–12.5/600; tab labels 10.5/620.

**Geometry**

| Element | Spec |
|---|---|
| Phone tab bar | inside `.ag-hud` (already safe-area inset): left/right/bottom `var(--edge)` = 10; h 64, r 18, p 4, gap 2; icons 22; z-index 60 |
| Phone panel sheet | top `calc(var(--safe-t) + var(--edge) + var(--topbar-h) + 6px)` (= 64 without a notch) to bottom; r 22 22 0 0; header p 8 16 12 with a 42×5 grabber; body p 16 16 `calc(112px + var(--safe-b))`; bottom fade 110 |
| Phone tank card | top `calc(var(--safe-t) + 118px)` (below the tank bar); Settings uses the panel-sheet top; More top ≈ 48% of height |
| Phone sticky footer (buy bar) | `padding-bottom: calc(84px + var(--safe-b))` |
| Desktop panel | top 76, bottom 96, right 16, width `clamp(460px, 40vw, 600px)` (576 at 1440), maximised 940; r 24 |
| Desktop tank card | left 16, top 144, bottom 104, width 404; Settings sheet right 16, top 82, width 404 |
| Filter chips | min-height 36, p 6×14, r 999, 12.5/600 |
| Segmented | container p 3, r 999; items min 32×28, 11.5/650 |
| Switch | 44×26 track, 20 knob, travel 18; on = aqua-2 track |
| Gene row | min-height 50, grid `96px 1fr auto` (phone `92px 1fr`, chip under the text), row border-top line |
| Temperament meter | track 6, thumb 12 with a 2px dark ring; end labels 10.5 ink-4 |
| Destination tile | min-height 76, r 16, p 12×14; selected: aqua border + `rgba(94,234,212,.1)` fill + 1px ring |
| Buy bar | sticky footer, `rgba(5,13,19,.96)` + blur 12; price 24/650 (phone 22) |
| Toast | r 14, p 8 6 8 8, icon chip 30; gold variant for celebrate |
| Loading card | 300 wide, r 24, glass-strong; progress 6 tall, aqua gradient, 1.8 s fill |
| Phone system banner | r 22, `rgba(42,52,58,.62)` + blur 30 saturate 160%, app icon 38 |
| Desktop OS notification | 360 wide, top/right 12, r 16, `rgba(40,44,48,.92)` + blur 30, app icon 36 |

**Motion** (all disabled under reduced motion). Reuse the existing keyframes in `src/ui/styles/genetics.css`; the prototype's shorter names are stand-ins.

| Effect | Keyframes | Timing |
|---|---|---|
| Prismatic gradient flow | existing `ag-prism-flow` (L32) | 7 s linear infinite |
| Prismatic portrait ring | existing `ag-prism-spin` (L75) | 9 s |
| Glints | existing `ag-prism-twinkle` (L80) | 3.4 s |
| Guide highlight ring | same opacity pulse, at 2.4 s. Reuse `ag-prism-twinkle` or add an identical `ag-guide-pulse` in `nav.css` | 2.4 s |
| Loading progress | **new** `ag-load` (width 0 → 100%) | 1.8 s ease-out |
| Sheets and panels | existing transitions | — |

---

## 18. Accessibility

- Tab bar: `<nav aria-label="Main">`; buttons have visible labels and `aria-current="page"` when active (the prototype uses `aria-pressed`; prefer `aria-current`). Dock unchanged (`aria-pressed`).
- Panel tab strips: `role="tablist"` / `role="tab"` / `aria-selected`; Left/Right arrow keys move between tabs.
- Switches: `role="switch"`, `aria-checked`, names that include the subject ("Auto-feed for Ember’s Tank"); disabled locked switches use `aria-disabled` and stay focusable with an explanation.
- Segmented controls and destination tiles: `role="radiogroup"` / `role="radio"` / `aria-checked`.
- Status always icon + word (Healthy/Watch/Danger, Running/Paused, verdicts, fit badges).
- Live regions: toasts `role="status"`; form errors `role="alert"`; "Link copied" announced.
- Focus: opening a panel or sheet moves focus to its title; closing returns it to the opener (existing `usePopoverFocusReturn`); the More sheet and modals trap focus; Esc closes one layer at a time (existing order) and updates the route.
- Touch targets ≥ 44×44 for primary actions; chips ≥ 36 high.
- Inputs 16px on phones (no iOS zoom); correct `type` and `autocomplete`.
- Portraits have `alt` = the animal's name; decorative icons `aria-hidden`.
- High-contrast setting: glass becomes solid (existing `data-contrast`), Prismatic gradient text keeps ≥ 4.5:1 (`#2a1640` on the pastel).

---

## 19. Test ids (add a "0.5" section per lane to `docs/TEST_IDS.md`)

| Area | Test ids |
|---|---|
| Navigation | `nav-tabbar` (phone root), `dock-tanks` · `dock-livestock` · `dock-market` · `dock-build` (kept on the tabs), `dock-more`, `more-sheet`, `more-visitors` · `more-shows` · `more-social` · `more-research` · `more-finances` · `more-encyclopedia`, `more-settings`, `dock-social` (desktop) |
| Boot / links | `boot-deeplink` (loading card), `boot-deeplink-dest` |
| Shop | `shop-filter-prismatic`, `shop-filter-rare`, `shop-filter-count`, `shop-filter-hint`, `shop-empty`, `shop-clear-filters`; existing `shop-offer-<stockIndex>` |
| Offer | `offer-copy-link`, `offer-link-row`, `offer-from-notification`, `offer-genes`, `offer-gene-<locusId>`, `offer-temperament`, `offer-morph-line`, `offer-build-tank`; existing `buy-offer`, `compat-verdict` |
| Encyclopedia | `enc-genes` (new genes line); existing `enc-catalog`, `enc-strains`, `enc-prismatic` |
| Tank card | `tank-auto-feed`, `tank-auto-feed-meals-<1-4>`, `tank-auto-feed-buy`, `tank-auto-clean`, `tank-auto-clean-buy`, `water-autoclean-note` |
| Alerts | `alert-autofeed-paused`, `alerts-notify-cta` |
| Settings | `settings-tab-<general\|display\|saves\|notifications\|about>`, `notify-status`, `notify-turn-on`, `notify-test`, `notify-cat-<rare\|care\|market\|breeding\|shows>`, `notify-quiet` |
| Social | `panel-social`, `social-tab-<id>`, `social-email`, `social-password`, `social-signin`, `social-signup`, `social-invite-code`, `social-invite-join`, `social-error`, `social-join-club`, `social-club-<id>`, `social-club-join-<id>`, `social-signout`, `social-lb-<collection_value\|prismatics\|show_wins>` |
| Production | `livestock-tab-production`, `production-toggle`, `production-rule-<pauseWhenFull\|keepPrismatic\|autoList>`, `production-setup`, `production-stage-<breed\|raise\|sort\|quarantine\|sell>` |

Deep-link grammar: document §6.2's table next to these ids. `TEST_IDS.md` has no written rules; follow its existing layout of one table per lane.

---

## 20. Tests: new, changed and at risk

Vitest runs `tests/sim/**/*.test.ts` and `src/**/*.test.ts` in node; Playwright e2e runs at 1440×900 by default (one worker). Name new unit tests `tests/sim/<lane>-*.test.ts`.

### 20.1 New unit tests

| File | Asserts |
|---|---|
| `nav-routes.test.ts` | `parseRoute`/`formatRoute` round-trip every row of §6.2; aliases (`equipment`↔`gear`, `play`↔`display`, `market/trends`); shop query order and defaults omitted; unknown path → `null`; unknown tab → panel default; `shareUrl` drops other query flags. |
| `nav-sync.test.ts` | Applying a route sets `useUI.panel/panelTarget` directly (never toggles); store changes produce the right hash; filter changes use replace (no history entry); re-entrancy guard (one history entry per navigation). |
| `genetics-expansion.test.ts` | Betta catalog: 540 entries, groups Red 120 + 7 × 60; Royal Blue Butterfly Halfmoon tier rare and `oneInLabel` "1 in 143"; Red Cambodian Veiltail very_rare "1 in 520"; Royal Blue Metallic Butterfly Halfmoon legendary "1 in 9,804"; Cambodian c/c on royal shows no "Cambodian"; Metallic me/std shows no "Metallic" (but visual `metallic` > base); me/me adds "Metallic"; forecast red/red c/c × red/yellow C/c = 50/50; a 0.4 genome (no new loci) normalises to `C/C` + `std/std` with an unchanged name; `validateStrains` clean and `cambodian_veil` within one tier of its catalog tier; genotypes 72,900 < 200k. |
| `genetics-lab-reveal.test.ts` | With `genetics_lab` unlocked, a newly created creature (`geneticsRevealed: 0`) gets exact gene rows from the card's reveal logic; without the lab, band words only. |
| `shop-filters.test.ts` | `offerMatches`: Prismatic only; Rare genes = visible tier/strain only without the lab; with the lab, hidden carriers of `rare` alleles included; env filter unchanged; counts. |
| `offer-genes.test.ts` | Rule-summary text per mode (top of ladder, recessive to A/B, most colours, codominant, additive, conditional "only shows on red bettas"); known vs hidden copies; lab chip text. |
| `automation-water-changer.test.ts` | Daily 10% change at lights-on, once per game day; weekly glass scrape; player counters (`waterChanges`, `cleanings`) unchanged; manual `waterChange`/`cleanTank` still bump them (refactor guard); salt tanks consume salt and skip with a notice when short; upkeep appears in `tankDailyCost`; deterministic (`stateHash` equal across runs) and step-size invariant (4 h pieces ≈ 0.25 h pieces); runs during `simulateOffline`; keepers skip routine changes when it ran. |
| `notify-navdots.test.ts` | Market dot: "bids waiting" wins over rare stock; the rare-stock dot appears only for Prismatic/rare offers not yet seen; loading a game marks current stock as seen; without the new parameter `navDots` behaves exactly as today. |
| `notify-offer-events.test.ts` | `announcePrismatic` (and the special/new-unlock stock events) set `offerId`; the rule maps it to `#/shop/fish/{offerId}`, and to `#/shop` when absent. |
| `automation-autofeed-ui.test.ts` (static render) | The Automation section maps the switch to `on` and the meals control to `setting`; legacy `setting: 0` renders as off; turning on from 0 sets 2. |
| `notify-rules.test.ts` | Event → category/title/body/route mapping; categories off suppress; quiet hours hold all but danger care; rate limit and "and {n} more" folding; nothing shown when focused; test notification path. |
| `notify-forecast.test.ts` (for the later native phase) | Forecast on a cloned state produces the same events as the real `simulateOffline` from the same state; the original state is untouched. |
| `platform-memory.test.ts` | `createMemoryPlatform` records shows; permission states; `setPlatform` swaps implementations. |
| `social-stub.test.ts` | Validation rules; invite `HIGHLAND-4821` resolves, others expire; join persists; password never written to storage; leaderboard "me" row computed from a save. |
| `production-line.test.ts` | (Phase 5) moves fry at free-swimming, sorts by rules, never lists Prismatic, pauses when full, lists with reserve = fair value × 0.9, survives missing references; deterministic. |
| `persistence-05.test.ts` | A v0.4.0 save loads with `repairs: []`; identical `stateHash` after two round trips; `production` with dangling ids is repaired with a note; absent fields don't change the hash. |

### 20.2 New e2e specs

| File | Viewport | Flow |
|---|---|---|
| `nav.spec.ts` | 1440×900 | Open `/#/shop/fish/<id>` (after `dev.addShopOffer`) → offer detail visible; Back → shop; Esc → `#/`; `/#/nowhere` → toast; `page.reload()` on `#/settings` → title screen with `title-continue` (reload clears the route). |
| `deeplink-boot.spec.ts` | 1440×900 | With a save present, `page.goto('/#/livestock/eggs')` → `boot-deeplink` card → Livestock › Eggs & fry. |
| `mobile-tabbar.spec.ts` | 390×844 touch | `nav-tabbar` has 5 items, no horizontal overflow; More opens `more-sheet`; `more-research` opens `panel-research` (from Phase 4, also `more-social` → `panel-social`); calm-HUD first tap only wakes (as hud-layout asserts today); the tutorial `preview` step rings `dock-more` then `more-research`. |
| `shop-filters.spec.ts` | 1440×900 | Toggle `shop-filter-prismatic` and `shop-filter-rare`; URL query updates; count text; empty state + Clear filters. |
| `automation.spec.ts` | 1440×900 | Tank card › Equipment: `tank-auto-feed` toggles the Autofeeder; meals control; `tank-auto-clean-buy` installs the device and enables `tank-auto-clean`. |
| `notifications.spec.ts` | 1440×900 | `context.grantPermissions(['notifications'])` + a stubbed `window.Notification`; Settings › Notifications → `notify-turn-on` → granted callout → `notify-test` → one notification recorded with the test title. |
| `dock-width.spec.ts` | 1400, 1440, 1519, 1520, 1600 × 900 | In a game, the bounding boxes of `.ag-dock` and `.ag-hud__cam` don't intersect, and `.ag-dock` has no `has-more-right` class (§5.4). |
| `mobile-sheets.spec.ts` | 390×844 touch | An open phone panel's top edge is at 64 px (± 2), the tab bar paints above it (`document.elementFromPoint` at the bar's centre returns a tab button), and the sheet's last element can scroll clear of the bar. |

### 20.3 Existing tests that change (planned)

| Test | Why | Update |
|---|---|---|
| `tests/e2e/ui-layout.spec.ts` (phone test, L84–104) | Two assertions encode today's phone layout: `.ag-dock` has class `has-more-right` (the scrolling dock, L89), and the open sheet's top `pb.y > 844 * 0.4` ("the tank keeps the upper third", L98). Both change on purpose (§5.2, §5.6). | Rename the test. Replace the dock assertion with: `nav-tabbar` visible, 5 buttons, `scrollWidth <= clientWidth`. Replace the `y > 337` check with the new geometry: the sheet's top is 64 px ± 2 and the tab bar is still hit-testable above it. Keep `data-occlude="bottom"` and the ≤ 2 toasts assertion. |
| `tests/sim/morph-catalog.test.ts` L58–65 | Betta "8 groups × 30 = 240". | Red 120, others 60, total 540. |
| `tests/sim/ui-prismatic.test.ts` L49 | "Morph catalog · 1/240 seen". | "Morph catalog · 1/540 seen". |
| `tests/sim/fix-panels-b-morphs.test.ts` L58–77 | Rolls 600 creatures per species with `mulberry32(42)` and requires every betta chip except Copper Dragon to appear. The two new loci shift the stream. Opaque White (≈ 0.49% per roll), Double Tail (≈ 0.64%) and the new Cambodian chip (≈ 0.51%) expect only 3–4 hits each, so one can go missing by chance. | Re-run. If a chip is missing, raise the roll count for bettas (e.g. 1,500) rather than changing the seed or adding exceptions. Cambodian and Metallic must be reachable (§8.3). |
| Name tests on hand-built genomes: `lifecycle-genetics.test.ts` L150–152, `rare-variants.test.ts` L202–203 / L241–242, `fix-sim3-morphs.test.ts`, `fix-life-genetics.test.ts` | These build genomes by hand (e.g. `bettaGenome(...)` → `normalizeGenome`), so the new loci fill in as `C/C` and `std/std` and the names don't change. Breeding in them draws from a shifted stream. | Should stay green; re-run to confirm. If one changes, the cause is a moved mutation, not a naming change. |
| `tests/sim/version.test.ts` L19–22 | Requires `package.json` `version` to equal the newest `CHANGELOG.md` entry. | The release step bumps both together (§21). |
| Any test that counts Settings tabs or dock items (e.g. `boot.spec.ts` iterates `dock-*`) | 5 Settings tabs; 11 desktop dock items. | `boot.spec` clicks ids "if present" — keep; update fixed counts if any. |
| `tests/sim/fix-hud-css.test.ts`, `fix-hud-toasts.test.ts`, `fix-hud-polish.test.ts` | Read exact `@media` blocks in `hud.css`/`shell.css`/`screens.css`. | Don't edit those blocks; put tab-bar CSS in `nav.css`. |

### 20.4 Must stay green (don't break)

`helpers.openPanel` at desktop for build/market/settings/shows (dock ids kept); `hud-layout.spec` phone calm-HUD and bell; `ui-notify-news.test.ts` (the Market dot stays "bids waiting" first; Visitors "new" dot); `save.spec` (General is still the default Settings tab; `settings-save`, `settings-quality-low`); `gameplay.spec`/`prismatic.spec` (`shop-offer-0` indexes stock; default filters show everything; reload behaviour unchanged); `staff2-feeding`, `fix-water-autofeeder`, `staff-sim` (automation must not change keeper or Autofeeder behaviour when the new device isn't installed); `core-determinism`, `fix-core-step-invariance`; `copy-fixes` (no doubled words — "Red Cambodian Veiltail" etc. are clean); `species-fw` invariants; `rare-persistence`, `core-persistence`.

---

## 21. Phased implementation plan

Each phase ends with: `npm run typecheck` clean, unit + e2e green, no new dependencies, a v0.4.0 save loads with no repairs.

**Phase 0 — Foundations (no visible change)**
- `src/platform/` (web + memory implementations), `src/ui/nav/routes.ts` (pure) with tests; `docs/TEST_IDS.md` 0.5 sections.
- *Done when:* route and platform unit tests pass.

**Phase 1 — Navigation and links**
- Phone tab bar + More sheet (`TabBar.tsx`, `MoreSheet.tsx`, `nav.css`) with the stacking and safe-area rules (§5.2), full-height phone sheets (§5.6), tutorial target fallback (§5.5).
- The Social dock item and More tile arrive in Phase 4. Until then the desktop dock is unchanged, and the More grid has five tiles.
- Hash router + two-way sync + boot/reload/leave rules (§6.4); panels report tabs (`useNavTab`); Copy link on offers; unknown-link toast; locked-panel states (§5.7).
- Update `ui-layout.spec` (§20.3).
- *Done when:* every route in §6.2 (except Social/Production) opens the right screen on desktop and phone; Back/Esc behave; reload shows the title screen; `nav.spec`, `deeplink-boot.spec`, `mobile-tabbar.spec` and `mobile-sheets.spec` pass.

**Phase 2 — Shop and genetics**
- Filters (§7.2), cards (§7.3), offer additions (§7.4: genes, temperament, morph line, from-notification banner) with the `PotentialBands` `temperament` prop (§9.2), destination fit and buy labels (§7.5), gone-offer button (§7.6), the Market rare-stock dot (§5.2).
- Genetics Lab reveal fix (§9.1); betta genes, strain and `rare` flags (§8); encyclopedia updates; test updates (§20.3), including `fix-panels-b-morphs`.
- *Done when:* `genetics-expansion`, `genetics-lab-reveal`, `shop-filters`, `offer-genes`, `notify-navdots` and `shop-filters.spec` pass; catalog shows 540; existing bettas keep names.

**Phase 3 — Automation and notifications (web)**
- Tank card Automation section; Auto Water Changer: `EquipmentKind` + `EQUIPMENT_KIND_LABEL`, data, the extracted water-change core (`water/change.ts`), `runWaterChanger`, staff interplay; alerts row.
- `GameEvent.offerId` on rare-stock events; Settings › Notifications tab, permission flow, categories, quiet hours, test notification, web delivery + `public/sw.js`, Alerts drawer footer.
- *Done when:* `automation-*`, `notify-rules`, `notify-offer-events`, `automation.spec`, `notifications.spec` pass; existing water/care tests (`fix-water-*`, `staff-*`) and the determinism/step-invariance tests stay green.

**Phase 4 — Social (stub)**
- `social` panel id (core sign-off), `PANEL_COMPONENTS`, dock item with the dock-width fix (§5.4), More tile; `SocialService` + local stub; sign-in, invites, overview, tabs, leaderboards.
- *Done when:* `social-stub.test.ts` and `dock-width.spec` pass; `#/social/join/HIGHLAND-4821` works signed out → in → joined; expired codes handled.

**Phase 5 — Production line**
- Types, `repairState` validation, `src/sim/production`, the world hook (core sign-off), Livestock › Production tab + setup flow.
- *Done when:* `production-line.test.ts` and `persistence-05` pass.

**Phase 6 — Native wrapper (optional, needs approval)**
- Capacitor (or similar) platform implementation; predicted notifications (§12.7); app-icon and store builds.
- *Done when:* `notify-forecast.test.ts` passes and a device test shows scheduled alerts that match the catch-up.

**Release step (every deploy; core sign-off for `package.json`)**
- The repo's rule (`CHANGELOG.md` header): every deploy bumps `version` in `package.json` and adds a CHANGELOG entry. Patch for fixes and small additions, minor for new features.
- 0.5 ships as **0.5.0**: set `"version": "0.5.0"` and add `## 0.5.0 — YYYY-MM-DD` at the top of `CHANGELOG.md`, using the existing entry style.
- If phases deploy separately, the first deploy is 0.5.0 and later ones are 0.5.1, 0.5.2 and so on.
- Fill Settings › About "What's new in 0.5" (§16) to match.
- *Done when:* `version.test.ts` passes (it requires the newest CHANGELOG version to equal `package.json`).

---

## 22. Risks and open questions

**Risks**
1. **Tier inflation.** With two more loci, 466 of 540 betta catalog entries are "Legendary" (was 170 of 240) because tiers come from fixed share thresholds (`MORPH_TIER_MIN_SHARE`). Collectors may feel "Legendary" is cheap. Options: tier by share *within the colour group*, or count only names the market actually stocks. Decide before Phase 2 ships.
2. **Reload drops the route** (by design, to protect tests and avoid panels over the title screen). Players pressing F5 return to the title; acceptable, but confirm.
3. **Core-owned edits** need sign-off:
   - `PanelId += 'social'` (`src/state/ui.ts`);
   - the production hook (`src/sim/world.ts`);
   - `repairState` (`src/persistence/migrations.ts`);
   - the version bump (`package.json`).
   - `public/sw.js` is a new file in a folder with no owner, so tell the orchestrator.
4. **Notification expectations.** Web alerts only while open; "while closed" needs the native phase. The copy already says so; keep it honest.
5. **iOS web notifications** require an installed web app (manifest + Home Screen). There is no manifest today; out of scope for 0.5 (the "Unsupported" state covers it).
6. **Per-tile compatibility previews** run `previewAddition` per tank; with many tanks, compute lazily or only for the first 6 tiles.
7. **Calm HUD and the tab bar** — must not change the "first tap only wakes" behaviour or the camera bottom reserve (`hudReserve` phone 150 px stays valid because the bar is the same 64 px as `--dock-h`).
8. **Auto Water Changer visual** reuses `ato_sensor` until the render lane adds a prop.
9. **Production line scope** is large; it ships last and can slip to 0.6 without blocking the rest.
10. **Social data** is fake in 0.5; don't market it as online play until a backend exists.
11. **Phone panels open full height** (§5.6). That's a deliberate change from today's half sheet, so the tank isn't visible behind a phone panel. Revisit only if players miss watching the tank while shopping; the alternative is a half sheet with drag-to-expand above the tab bar.
12. **Dock width at 1400–1600px** (§5.4). The 11th item can push the dock under the labelled camera chips. The `dock-width.spec` checks guard it.
13. **Water-change refactor** (§10.3). Extracting the core of `waterChange`/`cleanTank` must not change manual behaviour. The existing water and staff tests are the guard; run them all.

**Open questions for the owner**
1. Should the Auto Water Changer have its own unlock, or share the Autofeeder's (current plan)?
2. Should quiet hours be editable in 0.5, or fixed at 10 PM–8 AM?
3. Should one Metallic copy get a name ("Soft Metallic"), or stay sheen-only (current plan)?
4. Locked dock items: show the locked panel (current plan) or keep today's toast?
5. One production line per species, or several?

---

## Appendix A — Canvas screens

Canvas: **"Design"** artifact (private), https://claude.ai/artifact/SaZzQpkftDTxcZuzZQfgBk.

**Row "Try it" — live prototypes**

| File | What | Size |
|---|---|---|
| `Main.dc.html` | **Phone prototype** — a 390×844 phone plus a control panel. Everything is clickable. | 1000×844 |
| `desktop-prototype.dc.html` | **Desktop prototype** — a browser window (address bar shows the live `#/` route, Back and Reload work) with the 1440×900 game, plus a control panel. | 1820×948 |

**Static screens** (frozen from the prototype, so they match it exactly; desktop screens include the address bar showing the link):

| Row | File | Screen | Link | State |
|---|---|---|---|---|
| Navigation | `phone-home.dc.html` | Phone · Tank view with the tab bar | `#/` | — |
| Navigation | `phone-more.dc.html` | Phone · More | `#/more` | — |
| Navigation | `phone-guide.dc.html` | Phone · Guide points to Research | `#/more` | guide on the Research step |
| Navigation | `desk-home.dc.html` | Desktop · Dock with Social | `#/` | — |
| Navigation | `desk-early.dc.html` | Desktop · Early game locks | `#/visitors` | early game |
| Shop and Prismatic | `phone-shop-prism.dc.html` | Phone · Shop · Prismatic only | `#/shop?prismatic=1` | — |
| Shop and Prismatic | `phone-offer.dc.html` | Phone · Prismatic offer | `#/shop/fish/offer_k3x9` | — |
| Shop and Prismatic | `phone-offer-genes.dc.html` | Phone · Offer genes, before the lab | `#/shop/fish/offer_k3x9` | — |
| Shop and Prismatic | `desk-shop-rare.dc.html` | Desktop · Shop · Rare genes | `#/shop?rare=1` | panel maximised |
| Shop and Prismatic | `desk-offer.dc.html` | Desktop · Offer with link copied | `#/shop/fish/offer_k3x9` | link copied |
| Shop edge cases | `phone-offer-blocked.dc.html` | Phone · No tank fits | `#/shop/fish/offer_c2pq` | — |
| Shop edge cases | `phone-offer-gone.dc.html` | Phone · Offer that’s gone | `#/shop/fish/offer_zz00` | — |
| Shop edge cases | `phone-shop-empty.dc.html` | Phone · No Prismatic in stock | `#/shop?prismatic=1` | no Prismatic in stock |
| Shop edge cases | `phone-low-money.dc.html` | Phone · Not enough money | `#/shop/fish/offer_k3x9` | $40 in the bank |
| Shop edge cases | `phone-broken.dc.html` | Phone · Broken link | `#/` | broken-link toast |
| Genetics | `phone-cambodian.dc.html` | Phone · Cambodian betta (new gene) | `#/shop/fish/offer_m5cb` | — |
| Genetics | `phone-catalog.dc.html` | Phone · Betta morph catalog | `#/encyclopedia/betta` | — |
| Genetics | `desk-research.dc.html` | Desktop · Genetics Lab research | `#/research` | — |
| Genetics | `desk-shop-rare-lab.dc.html` | Desktop · Rare genes after the lab | `#/shop?rare=1` | panel maximised, Genetics Lab researched |
| Genetics | `desk-offer-lab.dc.html` | Desktop · Carriers revealed | `#/shop/fish/offer_r4vt` | Genetics Lab researched |
| Genetics | `desk-catalog.dc.html` | Desktop · Betta genes and catalog | `#/encyclopedia/betta` | panel maximised |
| Notifications and links | `phone-notif-off.dc.html` | Phone · Notifications off | `#/settings/notifications` | — |
| Notifications and links | `phone-notif-prompt.dc.html` | Phone · System permission prompt | `#/settings/notifications` | permission prompt open |
| Notifications and links | `phone-notif-on.dc.html` | Phone · Notifications on | `#/settings/notifications` | notifications granted |
| Notifications and links | `phone-lock.dc.html` | Phone · Lock-screen alerts | — | phone locked, notifications granted, Auto-feed paused, all categories on |
| Notifications and links | `phone-opening.dc.html` | Phone · Opening from the alert | — | loading from a notification |
| Notifications and links | `phone-from-push.dc.html` | Phone · Offer opened from the alert | `#/shop/fish/offer_k3x9` | opened from the notification |
| Notifications and links | `phone-banner.dc.html` | Phone · Alert while playing | `#/` | Prismatic alert showing, notifications granted |
| Notifications and links | `phone-alerts.dc.html` | Phone · Alerts drawer | `#/` | Alerts drawer open, Auto-feed paused |
| Notifications and links | `desk-perm.dc.html` | Desktop · Browser permission prompt | `#/settings/notifications` | permission prompt open |
| Notifications and links | `desk-notif.dc.html` | Desktop · System notification | `#/` | Prismatic alert showing, notifications granted |
| Automation and production | `phone-card-equip.dc.html` | Phone · Tank card · Automation | `#/tanks/ember/equipment` | — |
| Automation and production | `phone-card-owned.dc.html` | Phone · Auto-clean unlocked | `#/tanks/ember/equipment` | owns the Auto Water Changer |
| Automation and production | `phone-feed-paused.dc.html` | Phone · Auto-feed paused | `#/tanks/ember/equipment` | Auto-feed paused |
| Automation and production | `phone-production.dc.html` | Phone · Production line | `#/livestock/production` | — |
| Automation and production | `desk-card.dc.html` | Desktop · Tank card · Auto-clean on | `#/tanks/ember` | owns the Auto Water Changer |
| Automation and production | `desk-supplies.dc.html` | Desktop · Supplies · Auto Water Changer | `#/market/supplies` | — |
| Automation and production | `desk-production.dc.html` | Desktop · Production line | `#/livestock/production` | panel maximised |
| Social | `phone-signin.dc.html` | Phone · Social sign-in | `#/social` | — |
| Social | `phone-signin-error.dc.html` | Phone · Sign-in error | `#/social` | validation error |
| Social | `phone-invite.dc.html` | Phone · Club invite, signed out | `#/social/join/HIGHLAND-4821` | — |
| Social | `phone-join.dc.html` | Phone · Join the club | `#/social/join/HIGHLAND-4821` | signed in |
| Social | `phone-clubs.dc.html` | Phone · Clubs | `#/social/clubs` | signed in, member of Highland Betta Club |
| Social | `phone-leaderboard.dc.html` | Phone · Leaderboards | `#/social/leaderboards` | signed in, Prismatics leaderboard, owns a Prismatic |
| Social | `desk-social.dc.html` | Desktop · Social overview | `#/social` | signed in, member of Highland Betta Club, panel maximised |

## Appendix B — Using the prototype controls

The dark column beside each device ("Prototype controls") is not game UI.

- **Current link** — the route the game is showing (`…/aquarium-go/#/…`), with **Back** and **Home**. On desktop the browser address bar shows the same, and its Back and Reload buttons work (Reload = a fresh launch from the link).
- **Open a link** — 14 presets: Prismatic offer · Cambodian betta offer · An offer that's gone · Shop · Prismatic only · Shop · Rare genes · Tank card · Equipment · Production line · Supplies · Water Changer · Betta morph catalog · Genetics Lab research · Club invite link · Notification settings · Visitors (locks early) · A broken link.
- **Scenario** — toggles: Genetics Lab researched · Signed in · Early game (locks) · Prismatic in stock · Owns Auto Water Changer · Auto-feed paused · Low money ($40) · Guide: Research step (phone). **Notifications**: Not asked / Allowed / Blocked.
- **Events** — Send Prismatic alert · Send hatch alert · Lock the phone (phone) · Fresh launch from link · Reset everything.

Things to try: Market → Prismatic only → the Prismatic offer → Copy link → Buy (celebration toast, then Livestock shows "Iris"); Lock the phone with notifications Allowed → tap the alert → loading card → the offer "Opened from your notification"; Tank card → Equipment → Auto-feed off → bell turns amber and Alerts shows "Fix"; Social → Club invite link → sign in (any email with @ and an 8+ character password) → Join club; Settings → Notifications → Turn on → Allow → Send test.

Prototype simplifications (the spec wins): money, stock and animals are fixed sample data; the offer detail omits existing sections (group picker, Individual profile, full compatibility preview); the destination fit badge stands in for the existing compatibility verdict; social data is canned; the lock screen and system prompts imitate the OS.

## Appendix C — Genetics numbers (from running the real engine on a scratch copy of the betta data)

Tier thresholds (`MORPH_TIER_MIN_SHARE`): common ≥ 10%, uncommon ≥ 2%, rare ≥ 0.5%, very rare ≥ 0.1%, else legendary.

Royal Blue group, all 60 entries after the expansion (Royal Blue group share: 1 in 5 market bettas):

| Morph | Tier | Frequency |
|---|---|---|
| Royal Blue Veiltail | Uncommon | 1 in 12 |
| Royal Blue Plakat | Uncommon | 1 in 26 |
| Royal Blue Halfmoon | Uncommon | 1 in 31 |
| Royal Blue Butterfly Veiltail | Rare | 1 in 57 |
| Royal Blue Butterfly Plakat | Rare | 1 in 120 |
| Royal Blue Butterfly Halfmoon | Rare | 1 in 143 |
| Royal Blue Crowntail | Rare | 1 in 147 |
| Royal Blue Bi-colour Veiltail | Rare | 1 in 157 |
| Royal Blue Bi-colour Plakat | Very rare | 1 in 334 |
| Royal Blue Bi-colour Halfmoon | Very rare | 1 in 398 |
| Royal Blue Marble Dragon Scale Veiltail | Very rare | 1 in 566 |
| Royal Blue Butterfly Crowntail | Very rare | 1 in 688 |
| Royal Blue Metallic Veiltail | Very rare | 1 in 827 |
| Royal Blue Marble Veiltail | Very rare | 1 in 906 |
| Royal Blue Double Tail | Very rare | 1 in 963 |
| Royal Blue Marble Dragon Scale Plakat | Legendary | 1 in 1,203 |
| Royal Blue Dragon Scale Veiltail | Legendary | 1 in 1,416 |
| Royal Blue Marble Dragon Scale Halfmoon | Legendary | 1 in 1,432 |
| Royal Blue Metallic Plakat | Legendary | 1 in 1,757 |
| Royal Blue Bi-colour Crowntail | Legendary | 1 in 1,910 |
| Royal Blue Marble Plakat | Legendary | 1 in 1,925 |
| Royal Blue Metallic Halfmoon | Legendary | 1 in 2,091 |
| Royal Blue Marble Halfmoon | Legendary | 1 in 2,292 |
| Royal Blue Dragon Scale Plakat | Legendary | 1 in 3,008 |
| Royal Blue Dragon Scale Halfmoon | Legendary | 1 in 3,581 |
| Royal Blue Metallic Butterfly Veiltail | Legendary | 1 in 3,875 |
| Royal Blue Butterfly Double Tail | Legendary | 1 in 4,512 |
| Royal Blue Marble Dragon Scale Crowntail | Legendary | 1 in 6,875 |
| Royal Blue Metallic Butterfly Plakat | Legendary | 1 in 8,235 |
| Royal Blue Metallic Butterfly Halfmoon | Legendary | 1 in 9,804 |
| Royal Blue Metallic Crowntail | Legendary | 1 in 10,039 |
| Royal Blue Metallic Bi-colour Veiltail | Legendary | 1 in 10,765 |
| Royal Blue Marble Crowntail | Legendary | 1 in 11,001 |
| Royal Blue Bi-colour Double Tail | Legendary | 1 in 12,533 |
| Royal Blue Dragon Scale Crowntail | Legendary | 1 in 17,188 |
| Royal Blue Metallic Bi-colour Plakat | Legendary | 1 in 22,876 |
| Royal Blue Metallic Bi-colour Halfmoon | Legendary | 1 in 27,233 |
| Royal Blue Metallic Marble Dragon Scale Veiltail | Legendary | 1 in 38,754 |
| Royal Blue Marble Dragon Scale Double Tail | Legendary | 1 in 45,120 |
| Royal Blue Metallic Butterfly Crowntail | Legendary | 1 in 47,058 |
| Royal Blue Metallic Marble Veiltail | Legendary | 1 in 62,006 |
| Royal Blue Metallic Double Tail | Legendary | 1 in 65,882 |
| Royal Blue Marble Double Tail | Legendary | 1 in 72,192 |
| Royal Blue Metallic Marble Dragon Scale Plakat | Legendary | 1 in 82,352 |
| Royal Blue Metallic Dragon Scale Veiltail | Legendary | 1 in 96,885 |
| Royal Blue Metallic Marble Dragon Scale Halfmoon | Legendary | 1 in 98,038 |
| Royal Blue Dragon Scale Double Tail | Legendary | 1 in 112,799 |
| Royal Blue Metallic Bi-colour Crowntail | Legendary | 1 in 130,717 |
| Royal Blue Metallic Marble Plakat | Legendary | 1 in 131,763 |
| Royal Blue Metallic Marble Halfmoon | Legendary | 1 in 156,861 |
| Royal Blue Metallic Dragon Scale Plakat | Legendary | 1 in 205,880 |
| Royal Blue Metallic Dragon Scale Halfmoon | Legendary | 1 in 245,095 |
| Royal Blue Metallic Butterfly Double Tail | Legendary | 1 in 308,820 |
| Royal Blue Metallic Marble Dragon Scale Crowntail | Legendary | 1 in 470,583 |
| Royal Blue Metallic Marble Crowntail | Legendary | 1 in 752,932 |
| Royal Blue Metallic Bi-colour Double Tail | Legendary | 1 in 857,833 |
| Royal Blue Metallic Dragon Scale Crowntail | Legendary | 1 in 1,176,457 |
| Royal Blue Metallic Marble Dragon Scale Double Tail | Legendary | 1 in 3,088,199 |
| Royal Blue Metallic Marble Double Tail | Legendary | 1 in 4,941,118 |
| Royal Blue Metallic Dragon Scale Double Tail | Legendary | 1 in 7,720,496 |

Red group samples: Red Metallic Veiltail very rare 1 in 360 · Red Cambodian Veiltail very rare 1 in 520 · Red Metallic Plakat very rare 1 in 764 · Red Metallic Halfmoon very rare 1 in 910 · Red Cambodian Plakat legendary 1 in 1,105 · Red Cambodian Halfmoon legendary 1 in 1,316 · Red Metallic Butterfly Veiltail legendary 1 in 1,686 · Red Cambodian Butterfly Veiltail legendary 1 in 2,438 · Red Metallic Butterfly Halfmoon legendary 1 in 4,264 · Red Cambodian Butterfly Halfmoon legendary 1 in 6,168.

Prismatic constants (unchanged, `src/data/rarity.ts`): shop 1/4096, bred base 1/8192 (×4 with one Prismatic parent, ×8 with two, capped at 1/512), value ×12.

Shop species gene tables used by the offer Genes panel (from the repo): betta color (red 5, royal 4, turq 4, steel 4, copper 3, black 2, yellow 1, white 1), pattern (solid 3, butterfly 2, bicolor 2, marble 1, dragon 1), fins (veil 4, plakat 3, halfmoon 2, crown 1, double 1), + cambodian, metallic; ocellaris snow (codominant wt/sn), mel (O 1 / B 2), misbar (N 2 / mb 1); axolotl dark (D/d), albino (A/a), melanoid (M/m), axanthic (Ax/ax), copper (C/c), all recessive; pea puffer spots (fine/bold) and hue (green/gold), additive; lined seahorse hue (dark 3, orange 2, yellow 1, red 1), pinto (N 2 / p 1); cherry shrimp line (R 5; B/Y/O/G/K/C 3; W 1) and density (additive l/h/p).

## Appendix D — Sources for the betta genetics

- Saetan, betta colour genetics project, Thailand (scimath.org, project item 6336) — describes Cambodian as recessive (*c*), iridescence (*Bl*) as incompletely dominant, marble recessive (*mb*), extended red dominant (*Er*) and non-red recessive (*nr*). Used for: Cambodian as a simple recessive. Confidence: medium (school/breeder-level source).
- Kwon et al. 2022, *Science Advances* (PMC8906746; preprint bioRxiv 2021.04.29.442030) — colour is polygenic and modular across body regions (e.g. *alkal2l–bco1l*, *kitlga*, *adsl*, *slc2a15b*); fin webbing loci (*frmd6*, *tfap2b/d*). Used for: labelling single-locus Metallic as a game simplification.
- bioRxiv 10.1101/2021.05.10.443352 — maps iridescence to a chromosome-20 region (near *MTHFD1L*), red to *RNF213* (red dominant over yellow) and long fins to *KCNJ15* (dominant). Used for: red dominant over yellow (matches the game's ladder) and Metallic as an iridescence trait.
- Hameister 2021, thesis, Alfred University — notes the popular incomplete-dominance model for steel/royal/turquoise is untested. Used for: keeping the existing colour ladder unchanged.
- Wang et al. 2021, *Molecular Biology and Evolution* (PMC8321530) — already cited in the repo's betta notes.

## Appendix E — Glossary

- **Allele** — one version of a gene. Each animal has two per locus.
- **Locus** — a gene slot in the species table (`LocusDefinition`), e.g. Body colour, Cambodian.
- **Dominance ladder** (`mendelian`) — the higher allele shows; equal dominance shows both.
- **Codominant** — each copy counts (one copy Snowflake, two Platinum).
- **Additive** — copies add up (one copy half-expressed with no name; two copies named).
- **Carrier** — an animal holding a recessive allele it doesn't show.
- **Morph** — the composed appearance name ("Royal Blue Butterfly Halfmoon").
- **Strain** — a named, collector-recognised trait combination with a tier ("Royal Butterfly Halfmoon", "Cambodian Veiltail").
- **Tier** — Common / Uncommon / Rare / Very rare / Legendary, from how often market stock shows it.
- **Prismatic** — a game-only, non-genetic ultra-rare shimmer on an individual (1/4096 shop).
- **Genetics Lab** — research (`genetics_lab`, $1,200, 2 days) that reveals exact genes and carriers.
- **Route** — the part after `#` in the URL that names a screen.
- **Lane** — a code-ownership area from `docs/LANES.md`.
