# Chunk 22: every line of text it added or changed

For the owner to read in one place (ADR-0058 decision 5). Chunk 22 removed friction without changing what anything
does, so it added few words: a handful of buttons and links, and three reworded lines. The designs don't cover them.
"{…}" is filled in by the game. To change a line, say which.

## New lines

| Where it shows | Text |
|---|---|
| The tank card, Water tab: a link beside "What's the Biological filter?" that scrolls down to Care | Jump to care |
| An animal's card, at the right of the "Right now: …" line: a link that scrolls down to its Breeding section | Breeding |
| The listing wizard, on the Price and Length steps once the price is valid: a link that goes straight to Review (the recommended length, no photo) | Skip to review |
| Livestock › Eggs & fry, a clutch whose warning is hunger: a button that goes to that tank with the food picker open | Feed in {tank} (e.g. "Feed in Fry Nursery") |
| Livestock › Eggs & fry › Breeding activity, a row that tells you to move the animal: a button that opens its Move box (the clutch cards' existing words) | Move {name} |
| Livestock › Production › New line, "Which pair breeds?": chips above the list when there are several species and more than ten pairs | All species · {Species} ({pairs}) (e.g. "Neon Tetra (30)") |
| The same list: a heading over each species' pairs | {Species} (e.g. "Neon Tetra") |
| The More sheet on a phone, beside the magnifier | Find |
| Visitors › Staff, under the tiles, while people have applied and the team has room | {n} people are applying for a job. / 1 person is applying for a job. |
| The same note's button (scrolls to Hiring) | See them |
| Research › Quests, above the board when two or more quests are complete | Claim all ({n}) |
| The toast after Claim all (its second line is each reward's own words, joined by " · ") | {n} rewards claimed |
| Research, in the "No project running" note when a project can start: a button that shows the ones that can | See what you can start |
| Visitors, the Admission price card, while the price differs from the fair figure the card already names | Set to fair price (${n}) |
| A shared shop, the notice "That costs $8, and you can spend $0. Ask for more in Money.": a new button that opens the Shop money sheet (the sheet's own existing words) | Ask for money |
| A notice when Settings can't be loaded (Settings now loads when first opened; this shows only if that fails, for example with no connection) | Settings didn’t load. Check your connection, then reload the game. |
| Tooltips on a computer (the key in brackets is the new part) | Feed — drop food into the water (F) · Photo (P) · Just watch (H) · Tank card (T) · Show the whole room (V) / Return to the tank (V) · Previous tank ([) · Next tank (]). With a problem the same key follows the existing words: "{Watch or Danger} — {reasons} (T)" on the tank card button, "Previous tank — {name} needs attention (Danger) ([)" on an arrow. The arrows now always have a tooltip (before, only when another tank needed attention). |

## Changed lines

| Where it shows | Before | Now |
|---|---|---|
| Livestock › Animals with only "Needs attention" on and nobody in it | Nobody matches / Try a different search or filter. | Every animal is doing well |
| Shows › Entries with nothing entered, while new results wait unseen: the title | No entries waiting | The results are in |
| The same: its line | Enter a healthy, settled adult — or one of your own aquascapes — in an upcoming show. | (no line) |
| The same: its button (it now opens Results) | See upcoming shows | See results |
| A shared shop on a phone, the pill's first line. The count of people here is no longer on the phone's pill; it is in the dropdown and the pill's spoken label. The club's name did not fit at 390 px. **The owner may prefer the count back.** | 👥 {n} | Shared |
| A shared shop, the speed buttons' tooltips for a member who may not pause or change the speed (the buttons are dimmed; the added sentence is the existing refusal) | Pause (Space) | Pause (Space). Only {owner} and the people they choose can pause or change the speed. (the same for Normal speed (1), Fast ×3 (2) and Very fast ×10 (3)) |

## Existing lines that became links or moved (no new words)

- Livestock › Eggs & fry, a clutch with no nursery: "Tanks" in "…as Nursery in Tanks" is now a link to the Tanks panel.
- Market › Supplies, above the equipment: "Build › Equipment" in "Manage installed gear in Build › Equipment." is now
  a link.
- Tanks: "Tank card" is on every tank's row (it was only on the tank in view).
- Market › Listings: the introduction ("Sell to collectors, breeders & aquariums…") shows only while nothing is
  listed; with listings up, "New listing" is a button in the "Active" heading.
- Livestock › Eggs & fry: "Clutches" now comes before "Breeding activity".
- On a phone, a bid's Counter and Decline buttons lose their icons so the three fit on one row, and a long buyer's
  note shows two lines until tapped.
- On a phone held sideways: the tank card keeps only the tank's name in its header (the chips, problem lines and
  "Move tank" scroll with the card; the size line above the name, such as "29 GALLON", is not shown there), and Settings drops its subtitle and puts "Save now" at the end of the page.
- The guide: its done lines ("Nice to meet you, {name}!", "The water is in good shape.") are now seen on a phone,
  because the card the guide opened closes about 3.5 seconds after its step is done (unless you are using it).
