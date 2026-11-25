# Chunk 21: every line of text it added or changed

For the owner to read in one place. The designs don't cover these three features (the Collection, rare-hatch
reveals, "What next?"), so every line here is new unless marked *existing*. "{…}" is filled in by the game. To change
a line, say which; the builders' rules and the decisions still open are in `docs/agent/OWNER_QUESTIONS.md`, group N.

## Settings › About, "What's new in 0.11"

- The Collection: see every animal and morph you have found, and what is still missing
- A reveal when something rare is born
- "What next?" names the most useful thing to do and takes you there

## A. The Collection (Encyclopedia › Collection)

Every line below is new; none is covered by the designs. "{…}" is filled in by the game.

| Where it shows | Text |
|---|---|
| Encyclopedia, the section strip | Collection |
| Encyclopedia, the subtitle's first part (a link on Species and Aquarium science, plain on Collection; the subtitle's old "· {n} morphs seen" part is removed, since the Collection has the one count) | {n}% collected (e.g. "0.5% collected", "12% collected") |
| A species page, under its summary (species with named morphs) | Collection: {seen} of {total} morphs |
| The loading card's "Then:" pill, and Find anything's screen name | Encyclopedia › Collection |
| A toast, a Collection address naming a species the game doesn't know | There’s no card for that species / Showing your collection instead. |
| Collection header: the percentage | {n}% (a tenth below 10%: "0.5%") |
| Collection header: heading, and the bar's name for screen readers | Your collection |
| Collection header: the note under the heading | Each species counts the same: half for finding it, half for the morphs you have seen. A species with no named colour morphs counts in full once found. |
| Collection header: the four tiles (label, number, line under it) | Species {n} of {total} · Morphs {n} of {total} · Named strains {n} of {total} · Prismatic {n} animal found / animals found |
| Nearly there: heading | Nearly there |
| Nearly there: a bonded pair | {mother} and {father} / About {pct}% of their young could be a morph you’re missing: {hint} (e.g. "Red · ???") |
| Nearly there: a species | {Species} / {seen} of {total} morphs seen · {left} to go |
| Nearly there: an undiscovered species for sale | Undiscovered species / One is in the shop now. |
| Recently found: heading | Recently found |
| Recently found: a row (species name, then its finds joined by " · ", then the day) | New species · New morph: {morph} · New morphs: {a}, {b} · New morphs: {a}, {b} and {n} more · Named strain: {name} · Named strains: {a}, {b} · Prismatic: {name} · Day {n} |
| Recently found: nothing dated yet (an older save) | Your next finds will show here, with the day you found them. |
| Filters: status (screen-reader group "Show") | All · In progress · Complete · Not started |
| Filters: water (screen-reader group "Water type") | Any water · Freshwater · Marine · Brackish |
| The cards' list, for screen readers | Species cards |
| No card matches the filters | Nothing here yet / No species match these filters. |
| A card: name | {Species} / Undiscovered |
| A card: the line under the name | {Water} · {seen} of {total} morphs / {Water} · No named colour morphs / {Water} · {availability} · {total} morphs to find / {Water} · {availability} (availability is the Encyclopedia's existing words: In the shop now, Unlocked to buy, the lock hint, Keep exploring to discover) |
| A card, complete | Complete |
| An open undiscovered card | Find this species to start its card. / {availability} / See it in the shop (existing button) |
| An open card, no named colour morphs | No named colour morphs: {note}. Finding it completes its card. (e.g. "individual variation"; without a note: "No named colour morphs. Finding it completes its card.") |
| An open card: headings | Still to find · {n} / Seen · {n} |
| An open card: a missing morph (screen readers hear the prefix) | Not yet seen: {hint} · {tier chip: Common, Uncommon, Rare, Very rare, Legendary} |
| An open card: how to find it | Sellers stock it often. / Sellers stock it now and then. / Sellers stock it rarely. / Sellers stock it very rarely. / Sellers almost never stock it. / Shows when both parents carry {traits}. / Shows when both parents carry {traits}. It also needs a trait you haven’t seen yet. / Shows when both parents carry a trait you haven’t seen yet. / Breed it from parents showing {traits}. ({traits}: "Halfmoon", "Butterfly and Halfmoon", "A, B and C") |
| An open card: more rows | Show {n} more / Show all {n} |
| An open card, every morph seen | Every morph seen. This card is complete. |
| An open card: counts | Named strains: {found} of {total} · Prismatic finds: {n} |
| An open card: button | Open species page |

House style: sentence case, curly apostrophes, no exclamation marks, no em dashes in new text ("·" separators).

Added by the review's fixes:

| Where it shows | Text |
|---|---|
| Encyclopedia, the subtitle's first part for a moment, until the found species' morphs are counted | Your collection |
| Collection, for a moment the first time it opens in a session | Counting your collection… |

## B. Rare-hatch reveals

Every line a player can see or hear that this feature adds. The designs don't cover it; please read each one.

| Where it shows | Text |
|---|---|
| Reveal card, title during the build-up (about 1.3 s; skipped with reduced motion) | Something rare among the new young |
| Reveal card, title once the animal shows | New for your collection |
| Reveal card, the heading under the picture | {name} |
| Reveal card, under the name | {morph} · {species}, e.g. "Royal Blue Butterfly Halfmoon · Betta" |
| Reveal card, chips (the game's existing badges and their existing tooltips) | Prismatic · {strain name} · {Tier} morph, e.g. "Rare morph" |
| Reveal card, a Prismatic animal | Born Prismatic. About {odds} young shimmer like this. (odds as the sim's own line has them: 1 in 8,192; 1 in 2,048 with one Prismatic parent; 1 in 1,024 with two) |
| Reveal card, the first of a named strain | The first {strain} in your shop, a recognised {tier} strain. e.g. "The first Royal Butterfly Halfmoon in your shop, a recognised rare strain." |
| Reveal card, the first of a legendary morph (with no new strain) (changed in the review fixes) | The first {morph} bred in your shop. About {1 in n} market animals show it. e.g. "The first Red Metallic Cambodian Halfmoon bred in your shop. About 1 in 60,019 market animals show it." |
| Reveal card, the same when the catalog has no share for it (cannot happen with today's data) (changed in the review fixes) | The first {morph} bred in your shop. |
| Reveal card, the pager | {i} of {n} |
| Reveal card, the pager's buttons (screen reader and tooltip) | Previous find / Next find |
| Reveal card, buttons | See it / Open collection |
| Reveal card, the close button (the kit's own label, screen reader and tooltip) | Close |
| Settings › Notifications, a new section's heading | In the game |
| Settings › Notifications › In the game, the row's title and the switch's label | Reveal rare finds |
| Settings › Notifications › In the game, the row's subtitle (changed in the review fixes) | Show a card when a Prismatic, a new named strain or a new legendary morph is born |

## C. "What next?"

Every player-facing line this feature adds or composes. `{…}` is filled in by the game. Lines marked *existing*
are the game's own words reused as they are (not new).

| Where it shows | Text |
|---|---|
| Tank bar, the button | What next? |
| Tank bar, the button's tooltip | What next? (N) |
| The sheet, its title | What next? |
| The sheet, the close button (screen readers) | Close |
| The sheet, when only the collection is left | You’re all caught up. Nothing needs you right now. |
| An action about a tank, the line above its title | {tank} · Danger / {tank} · Watch (the tank bar's status words) |
| A tank action, title | the fix link's own words, *existing* (chunk 19): Water change, Repair, Switch it on, Switch it off, Buy a heater, Buy a filter, Buy food, Open Equipment, Lighting, Top off, Clean glass, Auto-feed, See {name}, Feed {name}… |
| A feeding action, title (rules 1 and 3) | Feed {who} / Target feed {who} ({who}: the animal or group the sim's line names, e.g. "Feed Ember", "Feed 3 neon tetras") |
| A tank action, its line | the bell's line for it, *existing* (e.g. "Ember is very hungry — time to feed it micro pellets or frozen bloodworms.") |
| A tank action with no fix link, title | Open the tank card |
| A food fix the player can't pay for, title | Open Finances |
| … its line | Not enough money for {food} ({price} a pack). (*existing*, the bell's) |
| A gear fix the player can't pay for, its line | Not enough money for {a heater / a filter / a light / an airstone / a chiller / a powerhead / a brighter light} (from {price}). |
| Either, while in debt, its line | Not enough money: purchases are paused while you’re in debt. (*existing*) |
| Either, a shared-shop member who doesn't spend freely, title | Ask for money (*existing*, the shop's Money) |
| The guide's step, the line above its title | Guide · {n} of {total} |
| The guide's step, title and line | the guide card's own title, and the first sentence of its text (or its waiting line, e.g. "Friends visit between 9:00 AM and 9:00 PM.") (*existing*) |
| Bids, the line above | Market › My listings |
| Bids, title | Answer a bid / Answer {n} bids |
| Bids, line | A buyer is waiting on one of your listings. Bids don’t wait long. / Buyers are waiting on your listings. Bids don’t wait long. |
| A show closing soon, the line above | Shows |
| A show closing soon, title | Enter {show} |
| A show closing soon, line | Entries close {when}. ({when}: "10:00 AM", "tomorrow, 9:00 AM", "Day 12, 9:00 AM", Operations' own form) |
| Rare stock leaving soon, the line above | Market |
| Rare stock leaving soon, title | Prismatic {species} in the shop / Rare stock: {morph} (*existing*, the Market dot's) |
| Rare stock leaving soon, line | In the shop until {when}. |
| Quest rewards, the line above | Research › Quests |
| Quest rewards, title | Claim your reward / Claim {n} rewards |
| Quest rewards, line | Quest complete: {quest}. / {n} quests are complete. |
| Show results, the line above | Shows › Results |
| Show results, title | See your show results |
| Show results, line | {n} new show result. / {n} new show results. |
| An automation problem, the line above | Operations |
| An automation problem, title and line | Problems' own title and reason (*existing*) |
| Young that need a hand, the line above | {tank} |
| Young that need a hand, title | Look after the young |
| Young that need a hand, line | the clutch card's first warning, as a sentence (*existing*) |
| A money request (shared shop), the line above | Money |
| A money request, title | Answer a money request / Answer {n} money requests |
| A money request, line | {name} asks for {amount}: {note}. / {name} asks for {amount}. |
| A facility move, the line above | Build › Facility |
| A facility move, title | Move to {level} (*existing*, Build's button) |
| A facility move, line | {cost} · {the first sentence of the level's description} |
| Research, the line above | Research |
| Research, title | Research {project} |
| Research, line | {cost} · {n} day / {n} days · {the first sentence of the project's description} |
| A quest nearly done, the line above | Research › Quests |
| A quest nearly done, title | {quest} |
| A quest nearly done, line | {the quest's own progress line} / {current} of {target} done. |
| The collection, the line above | Encyclopedia |
| The collection, title | Grow your collection |
| The collection, line | See which animals and morphs you haven’t found yet. |

No new line has an exclamation mark or an em dash; the em dashes in the table come from the game's existing lines
(the sim's status lines, research descriptions).

Added by the review's fixes (an empty aquarium is never "all caught up"):

| Where it shows | Text |
|---|---|
| No tank, the line above the title / title / line | Build › Tanks / No tank · Buy one (*existing*, the tank bar's) / There’s no tank in your aquarium. |
| No tank and not enough money for the cheapest one, line (title "Open Finances", or "Ask for money" in a shared shop) | Not enough money for a tank (from {price}). |
| Tanks but no animal, title / line | Open the Market (*existing*, the guide's button) / the guide's own line about friends coming to see your animals (*existing*) |
| No animal and not enough money for the cheapest one, line | Not enough money for an animal (from {price}). |
