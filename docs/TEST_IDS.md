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
| `dock-<panelId>` | Bottom dock buttons (tanks, livestock, market, visitors, build, research, finances, encyclopedia, settings) |
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
| `load-confirm` / `load-confirm-load` / `load-confirm-park` | The "Load <slot>?" modal, its Load button, and "Save to <free slot> & load" (shown when a manual slot is free) |
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
