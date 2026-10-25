# data-testid contract (UI lanes add these; e2e + QA scripts rely on them)

| test id | element |
|---|---|
| `title-new-game` | Title screen “New Game” button |
| `title-continue` | Title screen “Continue” button (only when a save exists) |
| `starter-card-<speciesId>` | Starter reveal card (click selects) |
| `starter-confirm` | Confirm chosen starter |
| `name-input` | Creature name input |
| `name-confirm` | Begin game button on naming screen |
| `hud-money` | Money display |
| `hud-clock` | Day + time display |
| `hud-speed-<0|1|3|10>` | Speed buttons |
| `dock-<panelId>` | Bottom dock buttons (tanks, livestock, market, visitors, shows, build, operations, research, finances, encyclopedia; Settings is the top bar's gear `hud-settings` since chunk 5) |
| `view-toggle` | Facility ⇄ tank view toggle |
| `tank-prev` / `tank-next` | Tank switcher |
| `tool-feed` / `tool-target-feed` / `tool-tap` / `tool-photo` / `tool-party` / `tool-watch` | Tank tools |
| `food-option-<foodId>` | Food picker entries |
| `food-buy-<foodId>` | One-tap "Buy $X" pack button on a low or out food in the picker |
| `food-shop` | "Shop for …" link that opens Market › Supplies on that food |
| `food-alert` | Low/out food notice in the feed picker |
| `toolhint-buy` | "Buy a pack" action in the tool prompt when the armed food runs out |
| `alert-food` | Restock row in the alerts drawer |
| `tank-status` / `tank-status-reason` | Tank bar status word and its reason line (water, animals or food) |
| `tank-card-toggle` | Open/close tank card |
| `water-status` | Water status headline in tank card |
| `action-water-change` | Water change quick action |
| `creature-card` | Creature card root |
| `creature-name` | Editable creature name |
| `panel-<panelId>` | Panel root element |
| `shop-offer-<index>` | Livestock offer card in market shop |
| `buy-offer` | Buy button in offer detail |
| `compat-verdict` | Compatibility verdict badge (preview) |
| `compat-reason` | Each compatibility reason row |
| `listing-create` | Start create-listing flow |
| `listing-kind-<kind>` | Listing kind choice |
| `listing-confirm` | Confirm listing |
| `listing-<listingId>` | Listing row |
| `bid-accept` / `bid-decline` / `bid-counter` | Bid actions |
| `build-tank-<tierId>` | Buy tank tier in Build panel |
| `build-decor-<decorId>` | Decor item in Build panel |
| `visitors-open-toggle` | Open to public toggle |
| `settings-quality-<level>` | Graphics quality buttons |
| `settings-save` | Manual save |
| `tutorial-card` | Tutorial coach card |
| `tutorial-next` / `tutorial-skip` | Tutorial controls |
| `toast` | Toast item |
| `dev-panel` | Dev panel root |

## Additional attributes (polish round)

| attribute | where | meaning |
|---|---|---|
| `data-occlude="right\|left\|bottom\|top"` | Panel sheets, creature card (right), tank card (left), phone bottom sheets, tool rail beside an open card | The element covers that side of the 3D viewport; `src/render/camera/viewport.ts` re-frames the tank into the free region. |
| `data-step` | `tutorial-card` | Current tutorial step id. |
| `data-kind` | `toast` | Toast kind (info, success, warning, danger, celebrate, market, visitor…). |
| `data-param` | Tank-card water parameter rows | Parameter key (temp, ph, ammonia, nitrite, nitrate, salinity, …). |
| `data-food-row` | Feed picker rows | Food id of the row. |
| `data-coach-occlude` | `tutorial-card` | Which side the expanded guide card reserves for the camera. |
| `data-tutorial-id` | HUD controls (`tool-feed`, `tool-target-feed`, `tank-card-toggle`, `dock-market`, `dock-build`, `dock-research`, `hud-money`, `creature-name`, `scene`, …) | Targets for the tutorial coach's highlight ring. |

## Staff (lane:staff)

| test id | element |
|---|---|
| `visitors-tab-visitors` / `visitors-tab-staff` | Visitors panel section tabs (Staff shows a lock until the specialty shop) |
| `staff-tab` | Staff tab root (roster, hiring pool, locked preview) |
| `staff-member-<staffId>` | A hired staff member's card |
| `staff-fire-<staffId>` | "Let go" (click twice: the first click arms "Confirm") |
| `staff-edit-<staffId>` | Change tanks / Change exhibits toggle on an aquarist's or docent's card |
| `staff-assign-<staffId>-<tankId>` | Tank chip that assigns / unassigns that tank (aquarist) or exhibit (docent) |
| `staff-budget` | Stock manager's daily budget block (slider inside) |
| `staff-autoassign` | "Share out tanks" (auto-assign every uncovered tank / exhibit) |
| `staff-candidate-<staffId>` | Candidate card in the hiring pool |
| `staff-hire-<staffId>` | Hire button on a candidate card |
| `tank-card-keeper` | Tank card header line "Cared for by Maya (Aquarist ★★★)" (opens Visitors › Staff) |
| `finance-wages` | "Wages · N staff" row in Finances › Running costs per day |

## Frags & cuttings (lane:frags)

| test id | element |
|---|---|
| `frag-take-<decorId>` | Build › Decor › placed piece: "Take frag / Take cutting / Divide rhizome / Trim portion / Split" pill (ready) |
| `frag-wait-<decorId>` | …the same row when not ready yet (growing in, healing from a cut) with a progress ring |
| `frag-tag-<decorId>` | Status line on a piece that is itself a frag/cutting (healing, growing out, grown out) |
| `frag-storage` | Build › Decor "Frags & cuttings" storage section |
| `frag-item-<fragId>` | A stored frag/cutting card |
| `frag-plant-<fragId>` | "Plant" (3D placement of that frag, free, at frag size) |
| `frag-rack-<fragId>` | "Rack" (seat it in a free frag-rack hole in this tank; reef corals only) |
| `frag-sell-<fragId>` | "Sell · $N" to the local fish store |
| `frag-list-all` | "List all" → Market wizard on Frags & cuttings with every stored frag selected |
| `listing-kind-frag` | Market › New listing › "Frags & cuttings" kind card |
| `frag-picker` / `frag-pick-<fragId>` | Wizard step 2: the frag picker and one selectable row |
| `frag-review` | Wizard review block for a frag listing |
| `frag-listing-visual-<listingId>` | Frag swatch stack on a frag listing card |

Deep link: `ui.panel = 'market'`, `ui.panelTarget = 'list:frag:<fragId,fragId,…>'`. Fixtures: `?fixture=frags_reef`, `frags_planted`, `frags_market`.
In Build › Rearrange, **F** takes a frag/cutting from the hovered piece.

## Shows & championships (lane:shows)

| test id | element |
|---|---|
| `dock-shows` | Dock button for the Shows panel (locked until the `shows` unlock) |
| `panel-shows` | Shows panel root |
| `shows-tab-<upcoming\|entries\|results\|trophies>` | Shows panel tabs |
| `show-card-<showId>` | Show card on the Upcoming tab |
| `show-enter-<showId>` | Enter (or View) button on a show card |
| `show-class-<classId>` | Class option in the entry flow |
| `show-candidate-<creatureId\|tankId>` | Entrant row in the entry flow (disabled rows explain why) |
| `show-confirm-entry` | Confirm entry (pays the fee) |
| `show-entry-<entryId>` | Pending entry row on the Entries tab |
| `show-withdraw-<entryId>` | Withdraw a pending entry (before entries close; fee refunded) |
| `show-result-<entryId>` | Result card on the Results tab |
| `judge-card` | The judge's card inside an expanded result |
| `trophy-case` | Trophy case / hall of fame tab root |
| `creature-ribbons` | Title badge + rosettes row on the creature card |

## qa-play (round 2)

| test id | element |
|---|---|
| `food-alert-young` | Feed picker notice when larvae / fry in this tank have nothing they can eat in stock |
| `food-young-buy` | One-tap "Buy $X" pack of the cheapest food those young eat (inside `food-alert-young`) |
| `toolhint-offer` | Target-feed prompt: "Offer to <name>" for the animal whose card is open (no need to click a tiny animal) |
| `action-water-change-cool` | Tank card › Care: "Cool 25%" water change (~−1 °C), shown when a resident spawns on a cool-water cue (axolotl, corydoras, goldfish) |

## perf (round 2)

| test id | element |
|---|---|
| `warmup-veil` | Soft veil over the canvas (under the HUD) while a newly loaded world's shaders compile; opacity 0 when idle, fades out in ~0.4 s. Before canvas screenshots right after a load, wait for `window.__AQ.warming() === false` |

## w2-ui (round 2, wave 2)

| test id | element |
|---|---|
| `creature-feed` | Creature card › Feed row: target-feed this animal (hunger word, the food it will get, stock) |
| `creature-feed-offer` | "Feed" button in that row (target-feeds through `feedTank`, same path as Target feed › "Offer to …") |
| `creature-feed-buy` | "Buy & feed · $X" when nothing the animal eats is in stock (buys one pack of the cheapest suitable food, then offers it) |
| `creature-feed-food-<foodId>` | Food chip in the Feed row when several suitable foods are in stock |
| `dock-badge-<panelId>` | Attention dot on a dock button (round 3: a 9 px dot, `data-level="watch\|danger\|new"`, no number — see "notify" below; `dock-badge-shows` still means unseen show results and the button then opens Shows › Results) |
| `welcome-back` | "While you were away" card root |
| `welcome-ran` | Line saying how much game time the aquarium actually simulated (and whether the safety cap applied) |
| `welcome-grace` | The grace-period reassurance (nobody dies while you're away) |
| `welcome-go-shows` / `welcome-go-bids` / `welcome-go-staff` | Deep-link buttons on the card's "what happened" rows (Shows › Results, Market › Listings, Visitors › Staff) |
| `welcome-close` | "Back to the aquarium" |
| `research-<researchId>` | Research card (e.g. `research-brackish_estuaries`) |
| `research-start-<researchId>` | "Start" on an available research card |
| `frag-list-<fragId>` | Build › Decor › stored frag: "List" (opens the Market wizard with just that frag) |
| `frag-ready-hint` / `frag-ready-show` | Build › Decor "Ready to propagate" hint (only until the player's first cut) and its "Show me" button (scrolls to the first "Take frag" pill) |

Deep links: Visitors accepts `panelTarget` `'tab:staff'` / `'tab:visitors'` (the bare `'staff'` / `'visitors'` still work). Unlock toasts for features with a home (Shows tiers, staff, visitors, brackish, mangrove decor, listings, tanks, gear, livestock groups, venues) carry a "where" line and open that panel on click; show-result toasts open Shows › Results.

| test id | element |
|---|---|
| `build-tab-<tanks\|decor\|equipment\|substrate\|facility>` | Build panel section tabs (compact on phones / the 1280 side sheet) |
| `tank-convert` | Tanks › manage › Water type "Convert" (locked water types are marked "(locked)" and disable it, with the research that unlocks them) |

## qa-final (round 2, wave 3)

| test id | element |
|---|---|
| `research-tab-<research\|unlocks\|quests\|achievements>` | Research & Unlocks panel section tabs (compact, like Build's) |

e2e: `tests/e2e/features.spec.ts` covers Shows (enter → judging → judge's card, ineligible reasons), Staff (lock → unlock toast → hire → assign → `tank-card-keeper`), Frags (`frag-take-*` → `frag-list-*` → `listing-confirm`) and Brackish (`research-start-brackish_estuaries` → `tank-convert` → the `brackish_estuary` render).

## pc-perf (round 2)

| test id | element |
|---|---|
| `settings-quality-auto` | Settings › Graphics "Auto" option (radio; checked while quality is picked automatically for this device). The four `settings-quality-<level>` options are explicit choices and uncheck Auto |
| `settings-quality-auto-current` | The level Auto is running now ("· Medium"), shown inside the Auto option while it is selected |
| `settings-quality-note` | The line under the quality options (what Auto picked, or the chosen level's note) |

Dev/QA (with `?perf=1` or in dev): `window.__AQ_PERF()` → `{ tier, dpr, scale, degrade, auto }` (effective tier, canvas DPR from the pixel budget × adaptive scale, last-resort feature steps, Auto on/off).

## Audit fixes (2026-09-29 to 2026-10-01)

| test id | element |
|---|---|
| `load-more` | "Show N more" paged-list button (and scroll sentinel) in Livestock and the listing wizard's picker |
| `bid-accept-confirm` | Confirm button in the accept-bid dialog |
| `placement-rotate` / `placement-confirm` | Touch tank placement: the Rotate and Place here (Move here) buttons inside the placement-hint label |
| `camera-room-reset` | Room view "Reset view" chip (`src/ui/hud/RoomChips.tsx`) |
| `room-edge-left` / `room-edge-right` | Room view edge fades with a chevron, shown only while the exhibit row runs past that side of the frame (`useFacilityOverflow`); no pointer events |
| `toolhint-place-another` | Tool hint "Place another · $X" after a paid decor placement (about 8 s; disabled when the player can't afford it) |
| `alert-equipment` | Failed-equipment row in the alerts popover (opens the tank card's Equipment tab) |
| `tutorial-hint` | The guide's plain hint ("Pick a food", "Pick a plant"…) shown instead of a button when the popover or panel it points at is already open |
| `sheet-switch` / `sheet-switch-<panelId>` | Panel switcher strip inside a bottom sheet, and one destination in it |
| `enc-morph-chips` / `enc-morph-finds` | Encyclopedia › Morphs: the seen/unseen morph chips and the "Your finds" line |
| `prismatic-badge` | "Prismatic" badge on a Prismatic animal (shop cards and offer detail, creature card header, livestock rows, encyclopedia tiles) |
| `enc-strains` / `enc-catalog` / `enc-prismatic` | Encyclopedia species page: Named strains, the Morph catalog (colour tree) and the Prismatic box |
| `breed-prismatic-odds` | Creature card › Breeding: the Prismatic chance line for the chosen pair |
| `save-here-<slot>` / `save-overwrite-<slot>` | Settings › Saves: "Save here" on an empty manual slot / "Overwrite with current game" on a filled one (asks first) |
| `overwrite-confirm` / `overwrite-confirm-replace` | The "Replace <slot>?" modal and its Replace button |
| `load-confirm` / `load-confirm-load` / `load-confirm-park` | The "Load <slot>?" modal, its Load button, and "Save to <free slot> & load" (shown when a manual slot is free; since chunk 9 for another copy of the aquarium on screen too) |
| `import-confirm` / `import-confirm-replace` | Chunk 9: the "Replace <slot>?" modal before Import into a slot that holds a save, and its Replace button |
| `save-delete-promotes` | Note in a save's delete confirm (title screen › Load and Settings › Saves) naming the "Previous …" aquarium that takes the slot |
| `stale-tab-banner` / `stale-tab-load` / `stale-tab-keep` | "Played further in another tab" banner (rendered at the head of the toast column, above the update prompt) and its two actions: load the newer copy, or keep this tab's copy and save it |
| `update-prompt` / `update-reload` | "A new version is ready" prompt at the head of the toast column, and its Reload button (saves first) |
| `error-boundary-<name>` | An error boundary's alert, named with spaces as dashes (e.g. `error-boundary-interface`, `error-boundary-aquarium-view`, `error-boundary-hud`) |

e2e: `tests/e2e/hud-layout.spec.ts` checks the alerts popover over a card and a panel, a mouse click on the calm HUD, the calm HUD after Escape closes a clicked-open panel, the phone money delta, the calm-HUD touch wake and retry, and the one toast a sideways phone (844×390, 932×430) shows in an open sheet's header row, off its list, tabs and buttons.

## notify (round 3: attention dots & notification centre)

Rules: `src/ui/common/notify.ts` (tests: `tests/sim/ui-notify-*.test.ts`). Every dot is `.ag-attn` with `data-level="watch|danger|new"` (amber / red / amber), 9 px, top-right of what it marks. Tank dots are live (they clear when the problem is fixed); news dots are "new until viewed".

| test id | element |
|---|---|
| `tank-card-attn` | Dot on the tank bar's Tank card button: the focused tank needs a look (status, food low, failed gear, gear that can't help). The button's `data-attention` is `good\|watch\|danger`; its aria-label / title give the reasons |
| `tank-prev-attn` / `tank-next-attn` | Dot on the switcher arrow that reaches the most urgent OTHER tank soonest (aria-label names it) |
| `tank-tab-attn-<water\|gear\|life>` | Inline dot on a tank card tab with something to look at |
| `tank-attention-reason` | Tank card header line for what the status reason doesn't cover (food running low, broken gear, "The Autofeeder can't help these animals — see Equipment.") |
| `tanks-row-<tankId>` / `tanks-row-attn-<tankId>` / `tanks-row-extra-<tankId>` | Tanks panel row, its dot (on the thumbnail), and its extra reasons line |
| `dock-badge-<panelId>` / `sheet-switch-dot-<panelId>` | Dock / bottom-sheet switcher dots: `tanks` (a tank other than the one in view needs a look — that one's dot is `tank-card-attn`), `shows` (new results → opens Shows › Results), `market` (bids waiting for an answer → Market › My listings), `research` (a project finished since Research was last open), `visitors` / `shows` (unlocked but never opened). Hidden on the panel that is open |
| `shows-results-new` | Amber count on the Shows › Results tab (unseen results); opening the tab marks them seen at once — the cards keep their "New" tag for that visit |
| `hud-alerts` | Bell: `data-attention` = worst tank (`good\|watch\|danger`), aria-label / title "N tanks need attention · M unread events" |
| `hud-alerts-count` | Bell number: unread news (toasted events and every warning/danger/death not yet read or cleared), coloured by the worst of the tanks and that news (`is-danger\|is-watch\|is-news`) |
| `hud-alerts-dot` | Bell dot when tanks need a look but nothing is unread |
| `alerts-close` | The alerts drawer's close button ("Close alerts"), beside its "Alerts" title (chunk 6, DES-011) |
| `alerts-mark-read` / `alerts-clear-all` | Drawer: "Mark read" (reads everything) and "Clear all" (reads and hides every event logged so far from the drawer; `notify.logClearedSeq` — nothing is deleted) |
| `alerts-events` / `alerts-event` / `alerts-events-empty` | Drawer event list, one event, and its empty line ("You're all caught up…" after Clear all) |
| `alerts-event-link` | Drawer event's "See results" / "Open Research" / "Open the shop" / "View listing" link |
| `alerts-open-log` | Drawer "Full event log" (opens the Log panel, which keeps everything) |
| `alert-gear-fit` | Drawer tank row: running gear that can't help that tank's animals (opens the tank card's Equipment tab) |
| `log-event-link` | Log panel row link to where the news lives (e.g. Shows › Results) |
| `room-tank-attn-<tankId>` | Room view: dot pinned above a tank that needs a look (`data-level`; `src/render/facility/RoomTankDots.tsx`, hidden with the HUD) |


## fit & guide (round 3: will this gear / food help these animals? keeper's guide)

Verdicts: `src/sim/care/fit.ts` (tests: `tests/sim/fit-*.test.ts`); keeper's guide: `src/data/species/guide.ts` (tests: `tests/sim/guide-*.test.ts`). Fit rows carry `data-fit="ok|partial|useless|harmful"`.

| test id | element |
|---|---|
| `shop-equip-<defId>` | Market › Supplies equipment row (`data-fit` = its verdict for the chosen tank; "Buy anyway" when it won't help) |
| `shop-equip-fit-<defId>` | That row's one-line reason ("Won't help. Your 3 lined seahorses only eat frozen or live food…") |
| `build-equip-fit-<instId>` | Build › Equipment: reason line under installed gear that isn't helping these animals |
| `tank-equip-fit-<instId>` | Tank card › Equipment: the same note under an installed unit |
| `food-eaters-<foodId>` | Food row: who you keep that eats it, plus an "Autofeeder OK" / "Hand-feed" chip (`data-autofeeder="yes|no"`) |
| `guide-strip` / `guide-diet` / `guide-autofeeder` / `guide-needs` / `guide-tips` | Encyclopedia species page: care summary strip, diet by food type (dry / frozen / live), whether an autofeeder can feed it (`data-level="yes|no"`), flow & temperature, "In real life" tips |
| `tank-handfeed` | Tank card › Life: residents that only take frozen or live food (no autofeeder can feed them) |
| `starter-diet` | Starter reveal: what the starter eats and whether an autofeeder can feed it |

## 0.5 navigation and links (chunk 1: lanes ui-shell, ui-panels)

0.5 spec §19. Phones are `MOBILE_QUERY` (≤ 720 px wide, or a phone held sideways): the tab bar replaces the dock there.
The four destination tabs keep the dock's ids, so `helpers.openPanel` works on both.

| test id | element |
|---|---|
| `nav-tabbar` | Phone tab bar root (`<nav aria-label="Main">`; the open destination's tab has `aria-current="page"`) |
| `dock-tanks` · `dock-livestock` · `dock-market` · `dock-build` | Tab bar destination tabs on phones (the dock's buttons on wider screens) |
| `dock-more` | Phone More tab (`aria-expanded` while the sheet is open; highlighted while a More destination is open) |
| `dock-badge-more` | Attention dot on the More tab (a destination inside More has one) |
| `more-sheet` | Phone More sheet root (`#/more`) |
| `more-visitors` · `more-shows` · `more-research` · `more-finances` · `more-encyclopedia` | More tiles (a locked one carries `.ag-more__lock`); `more-badge-<id>` is a tile's attention dot; chunk 6 adds `more-social` where Social exists (chunk 8) |
| `more-settings` | More sheet Settings row |
| `guide-more-bubble` | Phone guide note above the More tab for a step whose target lives in More ("Guide · Research") |
| `locked-visitors` · `locked-shows` | A locked destination's panel body (0.5 spec §5.7) |
| `settings-tab-<general\|display\|saves\|about>` | Settings tabs (`notifications` arrives with chunk 3) |
| `boot-deeplink` | Loading card while a link or a reload opens a save |
| `boot-deeplink-dest` | Its "Then: {destination}" pill |
| `offer-copy-link` | Offer detail: Copy link (icon-only on phones, aria-label "Copy link to this offer") |
| `offer-link-row` | Offer detail: the copied link, selected for a manual copy when the clipboard refuses |

Panel section strips are tabs (`role="tablist"` / `role="tab"`, `aria-selected`, Left and Right arrow keys); their
existing prefixes stay (`build-tab-<id>`, `research-tab-<id>`, `shows-tab-<id>`, `visitors-tab-<id>`).

### Deep-link grammar (`src/ui/nav/routes.ts`; 0.5 spec §6.2)

A panel's first tab has no segment of its own (`#/build` is Build › Tanks). An unknown path opens the tank view with
"That link doesn’t go anywhere"; an unknown tab opens the panel's first tab; an id that's gone shows that screen's own
gone state (ADR-0019 decision 4). Shared links (`shareUrl`) never carry `?dev=1`, `?fixture=` or other query flags.

| Route | Opens | Store command |
|---|---|---|
| `#/` | Tank view, nothing open | `panel: null` |
| `#/tanks` | Tanks panel | `panel: 'tanks'` |
| `#/tanks/:tankId` *`/equipment\|life\|value`* | Tank card on that tank (Water, or the tab) | `focusedTankId`, `tankCardOpen`, `useTankCardTab.want` (URL word `equipment` = tab `gear`) |
| `#/livestock` *`/eggs\|past\|production`* | Livestock (Animals, Eggs & fry, Past residents; Production from chunk 4) | `tab:animals\|young\|past\|production` |
| `#/livestock/production/:lineId` · `/new` | One production line; setting up another (chunk 4; an unknown line, or `new` with no free slot, is a broken link) | `line:<lineId>\|new` |
| `#/livestock/animal/:creatureId` | Creature card | `selectedCreatureId` |
| `#/shop` *`?prismatic=1&rare=1&env=fits\|freshwater\|marine\|brackish`* | Market › Shop (filters in that order, defaults left out; a bare `#/shop` re-applies the session's filters) | `tab:shop` |
| `#/shop/fish/:offerId` | Offer detail ("This offer has gone" when it has) | `offer:<id>` |
| `#/market/supplies` *`/:foodId`* | Market › Supplies (scrolled to a food) | `tab:supplies` / `food:<id>` |
| `#/market/listings` *`/:listingId`* | Market › My listings (focused on a listing) | `tab:listings` / `listing:<id>` |
| `#/market/history` (alias `#/market/trends`) | Market › History & demand | `tab:trends` |
| `#/build` *`/decor\|equipment\|substrate\|facility`* | Build tabs | `tab:<id>` |
| `#/visitors` *`/staff`* | Visitors / Staff (locked panel until the Specialty Shop) | `tab:visitors\|staff` |
| `#/shows` *`/entries\|results\|trophies`* | Shows tabs (locked panel until the guide is done) | `tab:upcoming\|entries\|results\|trophies` |
| `#/research` *`/unlocks\|quests\|achievements`* | Research tabs | `tab:research\|unlocks\|quests\|achievements` |
| `#/finances` | Finances | `panel: 'finances'` |
| `#/encyclopedia` | Species list | `tab:species` |
| `#/encyclopedia/science` *`/:articleId`* | Aquarium science (an article open) | `tab:science` / `science:<id>` |
| `#/encyclopedia/:speciesId` | Species page | `species:<id>` |
| `#/social` *`/clubs\|trading\|friends\|leaderboards`* | Social tabs (chunk 6; chunk 8: wherever Social exists, `socialAvailable()`: elsewhere a broken link) | `tab:overview\|clubs\|trading\|friends\|leaderboards` |
| `#/social/join/:code` | Club invite (Clubs highlighted, as the screen phone-join) | `join:<code>` |
| `#/settings` *`/play\|saves\|account\|notifications\|about`* | Settings tabs (URL word `play` = tab `display`; Notifications from chunk 3; Account from chunk 8, where Social exists) | `useShell.settingsTab` |
| `#/more` | Phone More sheet (desktop: the tank view) | `useShell.popover: 'more'` |
| `#/log` | Full event log | `panel: 'log'` |

## 0.5 shop and genetics (chunk 2: lanes ui-panels, genetics, notify)

0.5 spec §19 (Shop, Offer, Encyclopedia). `shop-offer-<i>` keeps indexing `g.market.stock`, not the filtered list, so
`shop-offer-0` is still the offer `dev.addShopOffer` just added (it adds at the front), whatever the filters show.

| test id | element |
|---|---|
| `shop-filter-prismatic` · `shop-filter-rare` | Shop: the "Prismatic only" and "Rare genes" toggle chips (`aria-pressed`) |
| `shop-filter-count` | Shop: "{visible} of {inStock}" |
| `shop-filter-hint` | Shop: the Rare genes line (dashed Lock before the Genetics Lab, violet Dna after it) |
| `shop-empty` | Shop: the empty state replacing the grid (Prismatic, no match, or no stock at all) |
| `shop-clear-filters` | Shop: "Clear filters" in the Prismatic and no-match empty states |
| `offer-from-notification` | Offer detail: "Opened from your notification" (after `go(route, { fromNotification: true })`) |
| `offer-genes` | Offer detail: the Genes section; `offer-gene-<locusId>` is one locus row (e.g. `offer-gene-cambodian`) |
| `offer-temperament` | Offer detail: the Temperament section (meters, or the group line) |
| `offer-morph-line` | Offer detail: "{Tier} morph · about 1 in {n} market {species}" (not shown for Common morphs) |
| `offer-build-tank` | Offer detail: the gold "Build a {water} tank" button that replaces `buy-offer` when no tank can hold the animal |
| `offer-gone-stock` | Gone offer: "See what’s in stock" (opens `#/shop`) |
| `enc-genes` | Encyclopedia › Betta: the genes line and its "New in 0.5" note (joins `enc-catalog`, `enc-strains`, `enc-prismatic`) |

`compat-verdict` stays unique on the offer detail: it is the compatibility box's badge; the destination tiles' verdicts
(`.ag-tilefit`, `data-verdict`) and the fit badge (`.ag-fitbadge`, `data-fit`) carry none (B-148). The destination
tiles are `role="radiogroup"` / `role="radio"` with `aria-checked`; arrow keys move the choice. The Market's rare-stock
dot is `dock-badge-market` (label "Prismatic {species} in the shop" or "Rare stock: {morph}", target `offer:<id>`).
`dev.addShopOffer(speciesId, { alleles })` pins an offer's genes for tests (the rest normalise to the most common).

## 0.5 automation and notifications (chunk 3: lanes ui-shell, notify, platform)

0.5 spec §19 (Tank card, Alerts, Settings). The automation switches are `role="switch"` named "Auto-feed for {Tank}" /
"Auto-clean for {Tank}"; a switch whose device isn't installed is `aria-disabled="true"` (never `disabled`, so it stays
in the tab order) with `aria-describedby` on the "Needs …" line or the unlock hint. The category switches in Settings
are locked the same way until the browser allows notifications (`aria-describedby="notify-status-title"`).

| test id | element |
|---|---|
| `tank-automation` | Tank card › Equipment: the Automation section's list (above Equipment and Lighting) |
| `tank-auto-feed` · `tank-auto-feed-row` | The Auto-feed switch (the Autofeeder's `on`); its row (`data-state` on / paused) |
| `tank-auto-feed-meals-<1-4>` | "Meals a day": a `role="radiogroup"` of `role="radio"` (the Autofeeder's `setting`); arrow keys move it |
| `tank-auto-feed-paused` | The amber "Paused — feed {name} by hand[, or a keeper will on their rounds]." line |
| `tank-auto-feed-buy` | "Buy · $35" when the tank has no Autofeeder (buys and installs it here) |
| `tank-auto-feed-fit` · `tank-auto-clean-fit` | The fit line when the device can't help these animals |
| `tank-auto-clean` · `tank-auto-clean-row` | The Auto-clean switch (the Auto Water Changer's `on`); its row |
| `tank-auto-clean-buy` | "Buy · $120" (buys, installs and switches on; "Not enough money" toast below $120) |
| `water-autoclean-note` | Water tab: "Auto-clean is on" while the device runs |
| `shop-equip-unlocks-auto_water_changer` | Supplies / Build: "Unlocks the Auto-clean switch on the tank card · upkeep $0.06/day" |
| `alert-autofeed-paused` | Alerts drawer › Tanks: "{Tank}" · "Auto-feed is paused — feed {name} by hand." · "Fix" (opens `#/tanks/:id/equipment`) |
| `alerts-notify-cta` · `alerts-notify-turn-on` | Alerts drawer footer (permission not asked yet only); its "Turn on" opens `#/settings/notifications` |
| `settings-tab-notifications` | Settings › Notifications (five tabs: `settings-tab-<general\|display\|saves\|notifications\|about>`; chunk 8 adds `settings-tab-account` after Saves where Social exists) |
| `notify-status` | The status callout (`data-permission` default / granted / denied / unsupported) |
| `notify-turn-on` | "Turn on" (asks the browser; only while not asked) |
| `notify-test` · `notify-test-line` | "Send test" and its line ("Arrives in a couple of seconds" / "Sent — …" / "Turn notifications on to try this") |
| `notify-cat-<rare\|care\|market\|breeding\|shows>` | The five category switches |
| `notify-quiet` | Quiet hours "10:00 PM – 8:00 AM" on/off |

Notification routes are hashes (`#/shop/fish/<offerId>`, `#/tanks/<id>/equipment`, `#/market/listings/<id>`,
`#/livestock/eggs`, `#/livestock/animal/<id>`, `#/shows/results`); public/sw.js opens a new window at
`<base>?notification=1#<route>` (the page drops the flag and shows the offer banner). e2e records notifications by
stubbing `window.Notification` and `ServiceWorkerRegistration.prototype.showNotification`, and simulates a tap with a
`notification-click` message on `navigator.serviceWorker` (tests/e2e/notifications.spec.ts). The `base-path` Playwright
project runs the production build under `/aquarium-go/` (tests/e2e/base-path.spec.ts).

## 0.5 production lines (chunk 4: lanes production, ui-panels)

0.5 spec §19 as amended by DESIGN-S3D §14 (several lines, DES-008). The switches are `role="switch"`: the line's is
named "{Line} running", each rule "{Rule} ({Line})". The Livestock tabs are `livestock-tab-<animals\|young\|past\|production>`.

| test id | element |
|---|---|
| `livestock-tab-production` | Livestock › Production (`#/livestock/production`) |
| `production-slots` | The slot caption ("1 of 2 line slots · Specialty Shop") |
| `production-line-<lineId>` · `production-add-line` | The line picker (a `role="radiogroup"` of `role="radio"`, DESIGN-S3D §13; arrow keys move it); "+ New line" while a slot is free |
| `production-setup` | The empty state's "Set up a line" |
| `production-view-<lineId>` | One line's view |
| `production-toggle` | The header card's switch (the line's `running`) |
| `production-end-line` · `production-end-confirm` · `production-end-confirm-yes` | "End line"; its confirmation; its "End line" |
| `production-note` | The amber note while the line waits for room or is paused for a missing parent or tank |
| `production-add-qt` · `production-add-qt-dialog` · `production-add-qt-seeded` · `production-add-qt-buy` | "Add a quarantine tank · $…"; its dialog, seeded-media switch and "Set up · $…" |
| `production-week-net` | The This week tile's "$… after food and power" line |
| `production-route` | The route strip: the line's colour dot, then breed tank › grow-out › quarantine › Market, each with its short tag (a tank holding the line up is amber, with a warning icon and its tag) |
| `production-stage-<breed\|raise\|sort\|quarantine\|sell>` | The five stage cards (Sort opens the Sort sheet) |
| `production-sort` · `production-sort-add` | The Sort sheet; "Add a keep rule" |
| `production-fix-pair` · `production-fix-tank` | "Choose another pair" / "Choose another tank" on a paused line's stage card (and their `…-dialog`s) |
| `production-rule-<pauseWhenFull\|keepPrismatic\|autoList>` | The three Line rules switches (the line view and set-up step 3) |
| `production-new-step-<1\|2\|3>` | The set-up stepper (`aria-current="step"` on the current one) |
| `production-new-pair-<motherId>-<fatherId>` | Step 1's pair rows (`role="radio"`; a line's own pair is disabled, "In a line") |
| `production-new-tank-<breed\|raise\|quarantine\|keepers>` | Step 2's stage rows (Fits · Shared · Doesn't fit) |
| `production-new-breed-for` · `production-new-name` | Step 3's "Breed for" and "Line name" fields |
| `production-new-back` · `production-new-next` · `production-start-line` | The pinned actions |

## S3-D: deep automation (chunk 5: lane automation; DESIGN-S3D §14 as corrected in INTAKE §10.1)

Index-based cone and jar ids, one id for the Operations tools tile, `staff-budget` and `research-<id>` reused (C-53).

| Test id | Element |
|---|---|
| `dock-operations` · `dock-badge-operations` | The dock's Operations item (after Build) and its red or amber dot |
| `hud-settings` | The top bar's Settings gear (`aria-pressed` while Settings is open) |
| `hud-manual-mode` | Manual mode: the amber "Manual mode" pill (desktop) or the amber time pill (phone); opens `#/operations/manual` |
| `more-operations` · `more-badge-operations` | The More sheet's first row, and its dot |
| `room-facility-map` | The room view's "Facility map" chip beside `camera-room-reset` |
| `panel-operations` · `ops-sub` · `ops-hold-all` | The panel, its sub-line, Hold all (desktop header; the phone Manual mode tile) |
| `ops-tab-<overview\|water\|feed\|lines\|map>` | The tab strip (Water and Feed from their rooms) |
| `ops-problems` · `ops-problem-<salt\|eggs\|veg\|live\|fresh\|salt_rate\|fresh_rate\|line>` · `ops-problems-all` · `ops-all-clear` | Overview's Problems (from the Operations Desk), its items, the "All" link, "Everything is running smoothly." |
| `ops-sys-<water-changes\|water-room\|live-food\|feeding\|lines\|keepers\|manual>` | The Systems tiles (Keepers & stock desktop only; Manual mode phone only) |
| `ops-week` · `ops-today` · `ops-manual-banner` · `ops-resume-all` | This week, Today (desktop), the manual-mode banner and its Resume all |
| `ops-assisted` · `ops-early-line` · `ops-ladder` | The early Overview's Assisted care card, its line row, the tier ladder |
| `ops-early-locked-<water\|food\|lines\|tools>` | The dashed locked tiles (early and before the Desk) |
| `ops-next-up` · `ops-next-up-research` | "What opens up next" before the Desk, and its Research link |
| `ops-locked-<water\|feed\|issues\|manual>` | The locked pages (§7.8) |
| `ops-issues-back` | Problems' back link to Overview |
| `water-meter-<fresh\|salt\|saltmix>` · `water-buy-salt` · `water-flows` · `water-schedule` · `water-machines` | Operations › Water |
| `feed-hatchery` · `feed-cone-<n>` · `feed-jars` · `feed-jar-<n>` · `feed-dosers` · `feed-buy-eggs` · `feed-buy-veg` | Operations › Feed (cones and jars numbered from 1) |
| `line-row-<lineId>` · `line-toggle-<lineId>` · `line-status-<lineId>` · `line-route-<lineId>` · `lines-capacity` · `lines-upcoming` | Operations › Lines |
| `map-layer-<all\|water\|food\|animals>` · `map-room-<water\|supplies\|food\|breeding\|quarantine\|gallery\|market>` · `map-tank-<tankId>` · `map-details` · `map-room-sheet` · `map-add-qt` · `map-more` | Operations › Map |
| `issues-<salt\|eggs\|veg\|live\|fresh\|salt_rate\|fresh_rate\|line>` · `issues-<kind>-action` · `issues-buy-salt` · `issues-raise-budget` · `issues-add-qt` · `issues-wait` · `issues-line-why` · `issues-line-decided` · `issues-none` | Problems (`#/operations/issues`) |
| `manual-banner` · `manual-resume-all` · `manual-hold-all` · `manual-row-<water\|salt\|food\|feeders\|lines>` · `manual-toggle-<…>` · `manual-rosa` · `manual-rosa-toggle` · `manual-still-open` | Manual mode (`#/operations/manual`) |
| `tank-chip-<auto-feed\|auto-clean\|top-off\|doser\|line>` | Automation chips, inside `tanks-row-<tankId>` and in the tank card's header |
| `tanks-row-line-<tankId>` | A Tanks row's amber "{Line} paused: …" reason with Why |
| `tank-auto-feed-held` · `tank-auto-clean-held` · `tank-doser-row` · `tank-doser-buy` · `tank-doser` · `tank-doser-held` | The tank card's held notes and the live-food doser row |
| `alerts-automation` · `alerts-automation-link` · `alerts-automation-manual` · `alerts-item-<kind>` · `alerts-item-tab-<water\|feed\|lines>` · `alerts-item-add-qt` | The alerts drawer's Automation section (`alerts-item-add-qt`: with the Desk, a held-up line's Add a quarantine tank, chunk 6) |
| `build-your-facility` · `build-facility-room-<water\|food>` · `build-room-<water\|food>` · `build-room-locked-<water\|food>` · `build-room-back` | Build › Facility's card, rooms and room pages |
| `build-upgrade-prep` · `build-add-reservoir` · `build-add-cone` · `build-add-jar` | The rooms' upgrades and add-ons |
| `supplies-row-<foodId\|salt\|brine_shrimp_eggs>` · `supplies-salt-buy-<5\|20\|40>` · `supplies-salt-status` · `supplies-buy-eggs` | Market › Supplies rows (one per food; the deep-link targets) and the salt sizes |
| `staff-budget` · `staff-budget-status` · `staff-orders` | Visitors › Staff: the $1 budget slider, its status line, the orders switch |
| `production-ops-link` · `livestock-production-dot` | Production's link row to Operations › Lines, and the Production tab's dot |
| `notify-cat-auto` | Settings › Notifications' Automation category |
| `line-listed-<lineId>` · `map-tier2` · `map-slot-<n>` · `tank-row-card-<tankId>` · `production-note-fix` · `staff-duty-<staffId>` | Chunk 6 (DES-013, ADR-0035 decision 3): early Lines' "Listed now {n} · best bid {$}"; the phone's early map Tier 2 row and the early map's locked line slots; the Tanks row's Tank card button (the tank in view); the held-up note's Fix; the stock manager's duty line |

## 0.5 Social stub (chunk 6: lane social; 0.5 spec §13, §19)

Chunk 6 made Social reachable only in dev mode (ADR-0005 decision 3, SOC-011). Chunk 8 (REL-025): Social exists wherever
`socialAvailable()`: the local stub in dev mode and every e2e build (`VITE_SOCIAL_STUB`), the Supabase service in the
players' build once a project is configured; with neither, none of these exist and every `#/social` address is a broken
link.

| test id | element |
|---|---|
| `dock-social` · `dock-badge-social` | Dock item (Globe, between Shows and Build; tutorial id `dock-social`) and its dot: "New" until first opened, "New trades and club news" after |
| `more-social` · `more-new-social` | Phone More tile (after Shows) and its "New" tag until Social is first opened |
| `panel-social` · `social-body` | The panel (PanelHost's sheet) and its body |
| `social-tab-<overview\|clubs\|trading\|friends\|leaderboards>` | Tabs (signed in only; `role="tab"`) |
| `social-email` · `social-password` · `social-signin` · `social-signup` | Sign-in form (`type=email` / `autocomplete=email`; `type=password` / `autocomplete=current-password`; 16 px) |
| `social-invite-code` · `social-invite-join` | "Have an invite?" field and Join group |
| `social-error` | Every Social error (`role="alert"`): the sign-in rule, a bad invite or friend code, the network error |
| `social-loading` | Skeleton rows while the service answers (`aria-busy`; still under reduced motion) |
| `social-invite-callout` · `social-join-card` · `social-join-club` · `social-not-now` · `social-invite-member` · `social-invite-expired` | The four invite states (§13.3) |
| `social-overview` · `social-your-club` · `social-trading-card` · `social-friends-card` · `social-leaderboard` · `social-signout` | Overview's cards (two columns when the desktop panel is maximised) and Sign out |
| `social-club-<id>` · `social-club-join-<id>` | A club (a member's card, or a suggestion) and a suggestion's Join (→ "Joined") |
| `social-search` · `social-nomatch` | Clubs search (a pasted invite code opens it with Enter) and its no-match line |
| `social-trading` · `social-offer-trade` · `social-soon` · `social-soon-close` · `social-trades-empty` | Trading, Offer a trade, the coming-soon note (also behind a trade's View) and its Close; the empty list |
| `social-friends` · `social-friend-code` · `social-add-friend` · `social-friend-grid` · `social-friends-empty` | Friends: Add friend by code, the snapshot grid (3 columns, 2 on phones), the empty list |
| `social-leaderboards` · `social-lb-<collection_value\|prismatics\|show_wins>` · `social-lb-me` | Leaderboards: the radio group's options and the player's highlighted row |
| `social-signin-form` · `social-signup-form` · `social-forgot` | Chunk 8: the form in sign-in mode and in sign-up mode; "Forgot your password? Ask whoever invited you." under Sign in |
| `social-name` · `social-signup-code` · `social-age` · `social-signup-submit` · `social-back-signin` | Chunk 8 sign-up mode ("Create account" opens it): Name friends see, Invite code (filled from an invite link), the 13-and-over box, Create account, Back to sign in |
| `social-privacy-link` · `social-privacy` · `social-privacy-close` | Chunk 8: "Your account and your data", the privacy note (ADR-0039) and its Close (also from Settings › Account: `account-privacy`) |
| `social-friend-requests` · `social-request-<id>` · `social-accept` | Chunk 8: Friends' "Friend requests" ("{name} added you") and Accept |
| `social-create-club` · `social-club-name` · `social-club-blurb` · `social-create-club-submit` | Chunk 8: the owner's Create a club (Social › Clubs, the owner's account only) |
| `social-invite-link-<CODE>` · `social-copy-link` · `social-invite-url` | Chunk 8: on the owner's own clubs, "Invite link {CODE}" and Copy link; the link, selected, when the clipboard refuses |

## Online save and Settings › Account (chunk 8; ONLINE-STAGE1.md §6, §7; REL-029, REL-031)

| test id | element |
|---|---|
| `settings-tab-account` · `settings-account` | Settings › Account (`#/settings/account`, where Social exists) and its body |
| `account-signed-out` · `account-open-social` | Signed out: "Sign in from Social to save your aquarium online and see friends." and Open Social (in a game only) |
| `account-who` · `account-name` · `account-online` | Signed in: "Signed in as {email}", "Name friends see: {name} · Friend code {code}", the online-save line (`role="status"`) |
| `account-signout` · `account-delete` · `account-delete-confirm` · `account-delete-yes` · `account-delete-cancel` · `account-privacy` | Sign out; Delete my account, its confirmation ("Delete your account?") and its buttons; the privacy link |
| `cloud-prompt` · `cloud-card-device` · `cloud-card-online` · `cloud-keep` · `cloud-load` | The online-save box (no close button; Escape and the backdrop do nothing): its two cards, Keep this device's, Load online save |

`window.__AQ.social` (where the tools are allowed) adds, for the stub: `setOwner(on)`, `pushFriendRequest(name)`,
`setCloud(meta, text)` (another device writes the online save), `cloud()` (the online save, unpacked),
`cloudSyncNow()` and `cloudCheck()`.

## The scenario lab (chunk 15; ADR-0051; docs/SCENARIOS.md; LAB-004, LAB-005)

| test id | element |
|---|---|
| `lab-root` · `lab-close` | The lab (a developer tool, only where the tools are allowed) and its close button |
| `lab-preset-<id>` · `lab-mine-<slug>` | A built-in preset (`ammonia-crisis` …) and one kept in this browser (its name as a slug) |
| `lab-save` · `lab-duplicate` · `lab-delete` | Keep the recipe under its name; a copy to edit; delete a kept one |
| `lab-tab-setup` · `lab-tab-tanks` · `lab-tab-business` · `lab-tab-json` | The editor's tabs |
| `lab-name` · `lab-base` · `lab-money` · `lab-facility` · `lab-warmup` · `lab-speed-<0\|1\|3\|10>` | Setup's fields |
| `lab-unlocks` · `lab-research` · `lab-guide` · `lab-food` · `lab-open-public` · `lab-foodroom` · `lab-manual` | Setup's switches |
| `lab-add-tank` · `lab-tank-<i>` · `lab-tank-<i>-name` · `-size` · `-water` · `-cycled` · `-remove` · `-water-<value>` · `-problem-<kind>-<off\|stuck_on>` · `-add-animal` · `-add-young` | The tank list and a tank's editor |
| `lab-tank-<i>-animal-<k>` · `-species` · `-count` · `-morph` · `-prismatic` · `-hunger` · `-breed` · `-names` | An animal group in a tank |
| `lab-add-staff` · `lab-add-offer` · `lab-add-listing` · `lab-listing-<i>-animals` | Shop & market |
| `lab-json` · `lab-json-error` · `lab-json-copy` · `lab-import` (the file input) · `lab-export` · `lab-capture` | The JSON tab |
| `lab-counts` · `lab-issues` · `lab-issue` (`data-level` error, warning or note) | What it builds and the problems |
| `lab-msg` · `lab-copy-link` · `lab-build` | The footer: its message line, Copy link, Build and play |
| `lab-badge` · `lab-restart` · `lab-badge-open` | In the game while a scenario plays: the badge, Start again, back to the lab |
| `title-lab` | The title screen's Scenario lab (with Developer tools on) |
| `dev-lab-open` · `dev-lab-restart` · `dev-fixture-select` · `dev-fixture-load` | The dev panel's Scenarios & fixtures |

`window.__AQ.scenario` (where the tools are allowed; each call resolves): `presets()`, `recipe(name)`,
`validate(recipe)`, `play(recipe | name)`, `restart()`, `capture(name?)`, `run(recipe | name, hours)`,
`link(recipe | name)`, `current()`, `open()`, `close()`.
