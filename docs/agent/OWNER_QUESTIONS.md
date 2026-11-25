# Open owner questions

Every question that waits on the owner, in one place, grouped by what it unblocks. Written 2026-10-11 after chunk 3.
**As of 2026-10-13 groups A to E are all answered** (ADR-0024 to ADR-0029); nothing is open.
Ask them with the AskUserQuestion tool, at most 4 per round, in group order (A first). Put the recommended option
first and label it "(Recommended)". Before a question about screens, open them for the owner (the PNGs under
`docs/agent/design/DESIGN-S3D/screens/`).

The owner may stop after any group: in each group's last round, ask a last question, "Go on to group {next}?" (it fits
within the 4; group A's round did this on 2026-10-11).

After each group, record the answers **verbatim** (the question as asked, the option chosen, any notes) in an ADR, as
ADR-0019 to ADR-0024 do. Add the ADR to `decisions/INDEX.md`, then mark the rows below "Answered (ADR-00NN)" and
update the affected PLAN.md, REQUIREMENTS.json and BACKLOG.md rows. Don't delete a question; mark it answered.
Groups A, B and C are answered (ADR-0024 to ADR-0027; the DESIGN-S3D approval is ADR-0027, also in `INTAKE.md` §14).
Groups D and E are answered (ADR-0028, ADR-0029). Everything up to group E is answered (2026-10-13); group F's F2–F4
are answered (2026-10-16, ADR-0036) and **F1 is open** (the owner's VoiceOver pass); group G is answered (2026-10-18, ADR-0037), with three questions on what follows 0.5; multiplayer stage 1 is approved (ADR-0038); chunk 7's two questions, group H and the two from chunk 7's review are answered (2026-10-18, ADR-0039). Chunk 8's four (the Supabase setup, clubs, the wording) are answered (2026-10-19, ADR-0040); group I (the strings ADR-0040 left) is answered (2026-10-19, ADR-0041), group J (one wording question from the setup) is answered (ADR-0042); shared shops' design questions were answered on 2026-10-20 (ADR-0045), chunk 10's (ADR-0046) and chunk 12's, K1 included (2026-10-21, ADR-0047); **F1 is open**; group L (chunk 13's words) is answered (2026-10-21, ADR-0048), and the decisions of the audit of 2026-10-19 wait in BACKLOG B-207 (its F3 and F5 answered by ADR-0056). The audit of 2026-11-17 (chunk 20) put ten questions to the owner, answered the same day (ADR-0056); the rest of its decisions kept the game's rule and wait in group M. **Open now: F1 and group M (M1–M41; M8 was settled by the 0.10.0 release).** Add new ones as a new group, and record them the same way.

| Group | Unblocks | Questions |
|---|---|---|
| A | The 0.5.1 release and standing decisions | A1–A7: **answered 2026-10-11 (ADR-0024)** |
| B | Chunk 4 (Production lines) | B1–B10: **answered 2026-10-11 (ADR-0025)** |
| C | Chunk 5 (DESIGN-S3D approval) | C1–C15: **answered 2026-10-11 (ADR-0026; the approval ADR-0027)** |
| D | Chunk 6 (Social stub) | D1: **answered 2026-10-11 (ADR-0028)** |
| E | Backlog rows waiting on the owner (block no chunk) | E1–E12: **answered 2026-10-11 to 2026-10-13 (ADR-0029)** |
| (chunk 4) | Chunk 4's own copy and two behaviours, asked during the chunk as its brief said | 8 questions: **answered 2026-10-14 (ADR-0030)** |
| (chunk 4 review) | Four lines of copy the review's fixes needed | 4 questions: **answered 2026-10-14 (ADR-0031)** |
| (chunk 5) | Chunk 5's copy the design leaves unworded, asked once as ADR-0026 decision 9 says | 4 questions: **answered 2026-10-14 (ADR-0032)** |
| (chunk 5 review) | The review's copy; the salt mixer's day (batches grow with the reservoir, the 60 % rule kept); the Water room warnings and their reserve-size wording | 5 questions in 3 rounds: **answered 2026-10-14 (ADR-0033)** |
| (chunk 6) | Chunk 6's copy and data the designs leave unworded (Social, B-194, B-202, What's new in 0.5), asked once before building | 8 questions in 2 rounds: **answered 2026-10-14 (ADR-0034)** |
| (chunk 6, second round) | The accessibility route, Render's build command, S3-D's copy (DES-013) | 4 questions: **answered 2026-10-15 (ADR-0035)** |
| F (chunk 6 review) | What chunk 6's fresh reviews left to the owner (block nothing in 0.5.3) | F2–F4: **answered 2026-10-16 (ADR-0036)**; F1: **open** (the owner's play-through) |
| G (ADR-0036 review) | A backlog row the review of ADR-0036's changes left to the owner (blocks nothing) | G1: **answered 2026-10-18 (ADR-0037)** |
| (after 0.5) | When 0.5.4 goes out, what comes next, who plays multiplayer first | 3 questions, asked with G1: **answered 2026-10-18 (ADR-0037)** |
| (multiplayer, stage 1) | Stage 1's approval: the plan, the library, sign-up, email | 4 questions: **answered 2026-10-18 (ADR-0038)** |
| (chunk 7) | Chunk 7's two money-loop fixes, which change sale prices and admission takings, asked before building | 2 questions, asked with H1 and H2: **answered 2026-10-18 (ADR-0039)** |
| (chunk 7 review) | The review's new line (a removed show's note) and three more limits pinned to the save format | 2 questions: **answered 2026-10-18 (ADR-0039, second round)** |
| H (multiplayer, stage 1) | Chunk 8 (stage 1): the two items ADR-0038 left | H1, H2: **answered 2026-10-18 (ADR-0039)**, asked early at the owner's request |
| (chunk 8) | The Supabase setup's go-ahead, who creates clubs, the sign-up, account and online-save wording | 4 questions, asked as text: **answered 2026-10-19 (ADR-0040)** |
| I (chunk 8's drafts) | Chunk 8's screens: the strings ADR-0040's message didn't spell out | I1 (asked as 4 questions in one round): **answered 2026-10-19 (ADR-0041)** |
| (chunk 8's setup) | The Supabase organization's plan, the invite codes' format, the repo's visibility | 3 questions, asked as text: **answered 2026-10-19 (ADR-0042)** |
| J (chunk 8's setup) | The "Have an invite?" field's example, now that real codes are a word and four letters | J1: **answered 2026-10-19 (ADR-0042)** |
| (shared shops) | The owner's idea of working on the same tank: what a group shares, who runs it, who joins, pause, what members do, an empty shop, carry-over, the order, who creates one, how many per club | 12 questions in 3 rounds: **answered 2026-10-19 (ADR-0043)** |
| (0.5.6, chunk 9) | The audit's high findings: tank-sale bonuses, the live database fix, new invite codes, the save wording; later the release go-ahead and Settings' Load using B1's messages | 4 questions, then two more: **answered 2026-10-19 and 2026-10-20 (ADR-0044)**. Left by the review for the owner (KNOWN_LIMITATIONS, B-207, B-208): Load's line for a "Previous autosave" it replaces, the wording for loading a later copy, the valuation breakdown's rows, D1's extensions, and whether Settings' Load should also keep another aquarium kept only in the autosave (the last answered by ADR-0056 answer 4, 2026-11-17: every way in saves such a copy to a free slot first, or asks) |
| (shared shops, the design) | SHARED-SHOPS.md's choices for the owner: the server's key, the `ws` library, a data cap, who counts as there, how a shop starts, your own game meanwhile, seeing others' actions, two people at once | 8 questions in 2 rounds: **answered 2026-10-20 (ADR-0045)** |
| (shared shops, the words) | Chunk 13: SHARED-SHOPS.md §8's screens and words, where a shop opens, the activity lines' pattern, leaderboards | 4 questions: **answered 2026-10-20 (ADR-0045, round 3)** |
| (shared shops, the design's review) | What the review left to the owner: listing photos, short breaks, an hours cap, three more lines | 4 questions: **answered 2026-10-20 (ADR-0045, round 4)** |
| (chunk 10) | The free Render test service | 1 question: **answered 2026-10-20 (ADR-0046)** |
| (chunk 12) | The migration live, the real server deployed from `next`, and the server's key (a password of its own instead of a Supabase secret key, which could reach accounts) | 3 questions: **answered 2026-10-21 (ADR-0047)**. The Render step done (2026-10-21) and K1 answered (ADR-0047 round 2) |
| K (shared shops, later) | Big shops on the free server: chunk 10 measured that the free instance keeps a new or month-old shop at any speed, but a late-game shop (15 tanks, 337 animals) runs slower than real time even at 1× (SHARED-SHOPS.md §11). When a shared shop grows that big: lower its top speed (new words), or a paid instance (Render's Starter, about $7 a month)? Chunk 12 first makes the server cheaper per step | K1: **answered 2026-10-21 (ADR-0047 round 2)**: keep it free, no change (chunk 12's numbers: a late-game shop keeps 88 to 95% of real time at any speed) |
| L (shared shops, chunk 13) | The words the approved screens don't cover yet: the other first-one-wins lines, a setting another member just changed, lines for Hold all and Resume, a refused action, Settings › Saves and the save buttons in a shared shop, and (chunk 12) a closing for a club with no shop (drafts in SHARED-SHOPS.md §8, "Words still to approve", from chunks 11 and 12) | **answered 2026-10-21 (ADR-0048)**: every line approved as drafted (asked while chunk 12's review ran) |
| M (the audit of 2026-11-17) | Nothing: the decisions chunk 20's audit left as they were (ADR-0056 decision 3); the game keeps today's rule until the owner answers | M1–M41: **open**, M8 settled by the release (the ten the audit asked are answered: 2026-11-17, ADR-0056) |

## A. Release and standing decisions

All answered on 2026-10-11 (ADR-0024).

| # | Question | Options (recommended first) | Source |
|---|---|---|---|
| A1 | Chunks 2 (shop and genetics) and 3 (automation and notifications) are on `next`, fully tested. Release them to players as 0.5.1 now? | **Release 0.5.1 now**: the release step in PLAN.md "Releases" (fresh four checks, version bump, CHANGELOG entry, merge `next` into `main`, push `main`, check Render). · Not yet: wait for more chunks. → **Answered (ADR-0024): Release 0.5.1 now.** | PLAN.md Next step (e) |
| A2 | After a rollback, an older copy of the game can't autosave into a slot that holds a newer version's save; it says so once, with "Refresh the page". Offer more? | **Keep it as is.** · Also offer "Save to another slot" (new copy). → **Answered (ADR-0024): Keep it as is.** | PERSIST-014 note; PLAN (a) |
| A3 | Run the e2e suite in WebKit (Safari's engine) as well as Chromium? | **No, Chromium only** (fast, stable). · Add a WebKit project (slower; catches Safari-only bugs). → **Answered (ADR-0024): Add a WebKit project (not the recommended option).** | B-129; PLAN (b) |
| A4 | What accessibility level should 0.5 aim for? Today panels under the high-contrast setting keep their glass look (B-178). | **WCAG 2.2 AA for text and controls, with solid high-contrast panels (chunk 6).** · Fix only what's reported. → **Answered (ADR-0024): WCAG 2.2 AA with solid high-contrast panels (chunk 6).** | B-178; ACC-005; PLAN (c) |
| A5 | Confirm `?dev=1`: it allows the developer tools for that session only, and the dev panel turns on with the Settings switch (it doesn't open by itself). | **Confirm.** · `?dev=1` should also turn the dev panel on. → **Answered (ADR-0024): Confirm.** | Chunk 1 "Decided"; PLAN (d) |
| A6 | Chunk 3's reviewer flagged wording that fills design slots without the owner's say: (1) the ribbon colours in a Shows notification, "$120 prize · Blue ribbon." (Blue, Red, Gold, Green for 1st, 2nd, 3rd and HM); (2) "1 fry is free-swimming in {Tank}." for one fry; (3) "0% vs fair value" for a bid at fair value; (4) lower-case species, as in "Prismatic betta in the shop"; (5) a jammed Autofeeder's row shows its switch on beside "Paused — feed {name} by hand." | **Keep all five.** · Change some (say which and how). → **Answered (ADR-0024): Keep all five.** | PLAN (f) |
| A7 | Automation must give "the same outcomes and stateHash" for any split of game time into steps (AUTO-016 A1). The water chemistry is computed in steps, so the water itself can't be bit-identical across splits. Accept stated tolerances for water values, with exact equality for job counts, run hours and stock units? Chunk 3's tests do this (within 0.15 °C, 0.05 pH, 3 % nitrate). | **Accept the tolerances.** · Require bit-identical water (a fixed-point rewrite of the water integration; large). → **Answered (ADR-0024): Accept the tolerances.** | AUTO-016 A1; design-intake-3 M7; `tests/sim/automation-invariants.test.ts` |

## B. Chunk 4: Production lines

Show the owner `livestock-production-*.png` (8 screens: early, Royal, all slots used, the three new-line steps) and
DESIGN-S3D `SPEC.md` §8.6 and §8.6.1 before asking B1.

All answered on 2026-10-11 (ADR-0025), each with the recommended option.

| # | Question | Options (recommended first) | Source |
|---|---|---|---|
| B1 | Approve DESIGN-S3D SPEC §8.6 (the line picker, several lines per species) and §8.6.1 (the new-line steps) as chunk 4's screens, replacing 0.5 §11.1's single-line UI? | **Approve.** · Approve with changes (say which). → **Answered (ADR-0025): Approve.** | ADR-0014 answer 14; PLAN chunk 4 |
| B2 | The design's timings don't match the game: betta young are adults at 14 days from laying, so its "juveniles" listed on day 22 are adults, and a juvenile listing refuses adults. How should raising and selling work? | **Raise lengths and stage words come from each species' data, and the sell step lists each animal by its life stage at sale time.** · Keep the design's fixed timings and relabel the stages. → **Answered (ADR-0025): Species data (raise lengths and stage words from each species; sold by life stage at sale time).** | INTAKE C-27; B-135 |
| B3 | What does "Never sell Prismatic animals" do when switched off? | **Automation never lists a Prismatic either way; the switch only chooses between moving it to the keep tank (on) and leaving it with its batch (off).** · Off lets the line list Prismatics. → **Answered (ADR-0025): Automation never lists a Prismatic; the switch chooses keep tank or batch.** | INTAKE C-28; PROD-011; B-135 |
| B4 | What is "protected", and where do kept youngsters go? | **Protected = every animal in a line's keep tank, every Prismatic and every favourite: automation never moves them out, lists or sells them. Youngsters kept by the trait rules go to the keep tank.** · Kept youngsters stay in the raise tank. → **Answered (ADR-0025): Protected = keep tank, every Prismatic, every favourite; kept young go to the keep tank.** | INTAKE C-29; PROD-008 |
| B5 | "Add a quarantine tank · $95" in the setup steps has no real price or failure path. | **Show the real kit price, offer seeded media, handle no money and no floor space, check the tank suits the line, and give the restart day only once it's cycled or seeded.** · Drop the button (pick an existing tank only). → **Answered (ADR-0025): The real kit price, seeded media and the checks.** | INTAKE C-33 |
| B6 | There's no way to end a line. | **"End line" on the line's header card, with a confirmation: animals stay where they are, the slot frees, the stats stay in history.** · Pause only (no ending). → **Answered (ADR-0025): "End line" with a confirmation.** | INTAKE C-34 |
| B7 | The slot caption: "{n} of {m} line slots · more at {next facility}", plus the no-line case "0 of 1 line slot · more at Specialty Shop", singular or plural by count. | **Approve this wording.** · Different wording. → **Answered (ADR-0025): Approve this wording.** | INTAKE C-36 (copy, with C-48) |
| B8 | When the raise tank is full and "Pause when a tank is full" is off, where do free-swimming fry go? | **They stay where they are, and the line shows one notice: "{Line}: the raise tank is full, so the fry stay in {tank}."** · The line pauses itself. → **Answered (ADR-0025): The fry stay, with one notice.** | PROD-006 note |
| B9 | "This week · After food and power": tanks can be shared between lines, or with animals outside them. How are a tank's food and power costs split? | **By the line's share of each tank's residents, day by day.** · The whole cost of every tank the line uses. · Show revenue only (drop "After food and power"). → **Answered (ADR-0025): By the line's share of residents, day by day.** | PROD-015 note |
| B10 | A line whose parent or tank is gone (sold, moved or reused): design §11.3 pauses it with a notice, but §15 has the save repair drop such lines on load, so the paused line would vanish at the next reload. Which? | **Pause with one notice, and keep the paused line through saves (the repair marks the missing reference instead of dropping the line).** · Drop the line on load. → **Answered (ADR-0025): Pause with one notice and keep the line through saves.** | PROD-017 note; PERSIST-006 |

## C. Chunk 5: approving DESIGN-S3D (deep automation)

These are `docs/agent/design/DESIGN-S3D/INTAKE.md` §11's owner rows plus design-intake-3's findings
(`docs/agent/archive/evidence/S0/reviews/design-intake-3.md`: R1, R2 and R3 change how C-22, C-63 and C-38 are asked;
M2 and M6 add copy; M1 needs a yes or no). M3, M4, M5, R4 and R5 need no owner: the agent writes them into the intake
before chunk 5. Show the relevant screens with each question. C15 is the overall approval and comes last.

All answered on 2026-10-11 (ADR-0026; C15 in ADR-0027). Two follow-ups were asked: B9 and C2 conflicted over the
line's "This week" tile (answer: sales and count, then a net line), and C6's (c) needed a storage cap or a waiver
(answer: harvests pause when full).

| # | Question | Options (recommended first) | Source |
|---|---|---|---|
| C1 | Settings moves from the dock to a gear in normal builds too, not only when Social makes the dock crowded? | **Yes, a gear in every build** (one layout, room for Social). · Only when the dock is full. → **Answered (ADR-0026): Yes, a gear in every build.** | C-1 |
| C2 | DESIGN-S3D replaces some approved 0.5 items: Settings as a dock item, the More sheet's height (about 40 % instead of 48 %, with the Operations row), the production tiles' wording, and the test helper that opens Settings from the dock. Approve the replacements, named in the approval ADR? | **Approve.** · Keep some 0.5 items (say which). → **Answered (ADR-0026): Approve (named in ADR-0027).** | C-2, C-58 |
| C3 | The Tanks panel as drawn hides healthy tanks behind a footer (13 tanks' cards and actions gone in the sample). | **Keep every tank's row, problems first; the footer becomes "Show {n} more" or goes.** · Collapse healthy tanks as drawn. → **Answered (ADR-0026): Keep every row, problems first.** | C-6 |
| C4 | Shared water reserves and background tanks (LOD): far tanks are simulated in chunks, so a shared reserve needs their pending time settled. | **Option B: settle a tank's pending time on every action, move and focus change; idle tanks stay coarse; stated tolerances.** · Simulate every tank at full detail (slower). → **Answered (ADR-0026): Option B (settle on actions).** | C-14 |
| C5 | Is water a tracked resource? | **Water costs nothing; once a Water room exists it's limited by the prep rate and the reserve size (an empty fresh reserve stops the ATO until prep refills it). Without a Water room nothing changes.** · Water costs money per gallon. → **Answered (ADR-0026): Water is free, limited by prep.** | C-15, C-16 |
| C6 | Live food shelf life. | **(a) All stock of the two live foods expires, tracked by lot (bought packs too).** · (b) Only home-grown lots expire. · (c) Nothing expires: then AUTO-013 A2 needs a storage cap (new design) or the owner waives it. → **Answered (ADR-0026): (c) Nothing expires (not the recommended option); follow-up: harvests pause when the room's storage is full ("Full"), so AUTO-013 A2 stands.** | C-22, C-23 (R1) |
| C7 | Buying the rooms and machines (nothing in the design prices them). | **Finishing the research installs the base room (prep station, 150/60 gal reserves and a mixer; a hatchery with 2 cones and 4 jars); add-ons and upgrades are bought in Build › Facility; dosers are placed from the tank card; the economy lane sets the numbers.** · Rooms are bought outright in Build › Facility. → **Answered (ADR-0026): The research installs the base room.** | C-37 |
| C8 | Approve the new copy the design needs but doesn't word: line not found ("This line isn't here any more" · "See your lines"), the locked room page, no money / no floor space, no line yet, the "Assisted care" tile before Tier 1, Dry food rows without a stock manager ("You restock it from the Market"), the empty fresh reserve, the freshwater-only Water tab, the ladder rows (C-38), and C-21, C-26, C-36 and C-63's strings. Show the full list from INTAKE C-48 and those rows. | **Approve as proposed.** · Change some (say which). → **Answered (ADR-0026): Approve as proposed, the agent's drafts included (the table is in ADR-0026).** | C-48 (with C-21, C-26, C-36, C-38 per R3, C-63) |
| C9 | The stock budget control. | **A slider in $1 steps, "Raise budget" hidden at the level's maximum with the reason, and a separate switch for Rosa's orders that keeps the budget and the log quiet.** · $5 steps and a typed amount. → **Answered (ADR-0026): A $1 slider and an orders switch.** | C-21 |
| C10 | The Automation notification category's subtitle promises "manual mode" alerts with no template. | **Drop "and manual mode" from the subtitle.** · Add a manual-mode notification (new template). → **Answered (ADR-0026): Drop "and manual mode".** | C-57 |
| C11 | A Water room in a freshwater-only facility (behaviour and copy): the mixer, the salt meter and the salt problem items would show for no salt use. | **They apply only while a salt tank or a hatchery needs salt water; Supplies shows the salt row once a Water room exists.** · Show them always. → **Answered (ADR-0026): Only while salt water is used.** | C-63 (R2) |
| C12 | Schedules: the design shows schedules but edits none. Do the player's existing levers count as schedules they change (a tank's lights-on hour moves its water change; Auto-feed meals a day; Hold or Resume per system)? | **Yes, those levers are enough (no schedule editor).** · Add a schedule editor in Operations (new design). → **Answered (ADR-0026): Yes, the existing levers are enough.** | M1 |
| C13 | Without a stock manager nobody reorders: "No one reorders salt mix. Buy it, or hire a stock manager.", with Buy and "Hire a stock manager" (to Visitors › Staff) instead of "Raise budget", no forecast, and a matching notification. | **Approve.** · Different wording. → **Answered (ADR-0026): Approve.** | M2 (copy, with C-48) |
| C14 | Manual mode holds the Autofeeders. Does a held one count as paused for the hungry-animal alert? | **Yes, worded "Auto-feed is held — feed {name} by hand, or resume it."** · No alert while held. → **Answered (ADR-0026): Yes, worded as held.** | M6 (copy, with C-48) |
| C15 | With the answers above, approve DESIGN-S3D for chunk 5? | **Approve.** · Not yet. → **Answered (ADR-0027): Approve. DESIGN-S3D is approved.** | ADR-0014; PLAN chunk 5 |

### C8's strings (gathered 2026-10-11, for the message before C8)

Answered: the owner approved the table as sent, with the agent's drafts for the **not worded** rows; the final table is
in ADR-0026.

Show the owner this list before asking C8. Quoted strings are proposed in `INTAKE.md` §11 or design-intake-3 (M2,
M6), or reused from the repo and the designs. Rows marked **not worded** have no proposed string yet: draft one in
the style of the strings around it and show it as a proposal (or ask C8 as "approve these, and the agent words the
rest in the same style").

| Where | Proposed copy | Source |
|---|---|---|
| A line that's gone (`#/livestock/production/<id>`) | "This line isn't here any more" · "See your lines" | C-48 |
| A room that isn't built yet | SPEC §7.8's locked card: "The Water room isn't built yet" / "The Live food room isn't built yet", Locked "Tier {n}", the tier's description, "Links to this page keep working; they show this until it opens.", its requirements | C-48 |
| No money / no floor space | Today's messages: "Not enough money for {what}: it costs {price} and you have {money}." (in debt: "You're {amount} in debt, so purchases are paused. Sell something or wait for income first.") · "There's no floor space for a {Tank}. Sell or move a tank, choose a smaller size, or expand your facility." | C-48; `src/sim/economy/purchases.ts` |
| No line yet | 0.5 §11.1's empty state: "No production line yet" · "Pick a breeding pair and the tanks to use. The line moves fry, sorts keepers and lists the rest for you." · "Set up a line" | C-48 |
| "Assisted care" tile before Tier 1 | A dashed tile with 0.5 §10.2's hint: "Research Better Life Support, or build husbandry mastery with regular care." | C-48 |
| The bell before anything is automated | No Automation section (no copy) | C-48 |
| Dry food rows without a stock manager | "You restock it from the Market" | C-48 |
| The empty fresh reserve (the ATO stops) | **not worded** (a shortage item on the Water tab and in Problems) | C-16, C-48 |
| A Water room with no salt-water use (freshwater-only Water tab) | **not worded** | C-63 |
| Stock budget at the level's maximum ("Raise budget" hidden, with the reason) | **not worded** (SPEC §8.7's line reads "up to $600 at a Public Showroom") | C-21 |
| Manual mode, tanks without a keeper | "{n} have no keeper: feed them by hand" | C-26 |
| Line slot caption | "{n} of {m} line slots · more at {next facility}" · no line yet: "0 of 1 line slot · more at Specialty Shop" · "slot" or "slots" by count | C-36 |
| The tier ladder's rows | List what is really missing (reputation, research, as the dock's locked hints do) instead of SPEC §11's "Specialty Shop (42 of 100 reputation) · research Central Water Supply, $900"; **not worded** beyond that | C-38 (R3) |
| No stock manager, salt running out | "No one reorders salt mix. Buy it, or hire a stock manager." with Buy and "Hire a stock manager" (to `#/visitors/staff`) instead of "Raise budget"; no forecast or "arriving"; a matching notification (**not worded**) | M2 (also C13) |
| A held Autofeeder with a hungry animal | "Auto-feed is held — feed {name} by hand, or resume it." | M6 (also C14) |

## D. Chunk 6: the Social stub

| # | Question | Options (recommended first) | Source |
|---|---|---|---|
| D1 | The design words only the empty clubs list ("No club yet"). Empty trades and friends lists? | **"No trades yet" / "Trades you start or accept appear here." and "No friends yet" / "Friends you add appear here."** · Different wording. → **Answered (ADR-0028): Approve this wording.** | SOC-010 note |

## E. Backlog rows waiting on the owner (block no chunk)

Read each row in `docs/agent/BACKLOG.md` (and its recommended fix in the adversarial review JSON it cites) before
asking; the options below are the agent's proposals.

| # | Row | Question | Options (recommended first) |
|---|---|---|---|
| E1 | B-002 | When a simulation step keeps failing, the world freezes with one console message. What should the player see? | **A banner: "Something went wrong — your aquarium is paused. Save and reload." with Save and Reload buttons.** · Nothing (as today). → **Answered (ADR-0029): A banner (chunk 6).** |
| E2 | B-017 | An older build closes a research project it doesn't know, so a newer save loses that project when opened in the older build. | **Keep unknown projects untouched in older builds.** · Accept (old builds are best-effort). → **Answered (ADR-0029): Leave unknown projects untouched (chunk 4).** |
| E3 | B-138 | An empty, freshly dressed tank sells at auction for more than its parts cost. | **Apply the beauty and ethical-display bonuses only to tanks with animals.** · Leave it. → **Answered (ADR-0029): Bonuses need animals (chunk 4).** |
| E4 | B-139 | The "sales" counter counts animals, so one quick sale of 25 shrimp unlocks tank auctions and Trusted Trader. | **Count sales, not animals.** · Leave it. → **Answered (ADR-0029): Count sales (chunk 4).** |
| E5 | B-185 | The approved 0.5 visual reference (45 screens) lives only in a private canvas. | **Export the screens into the repo** (owner supplies them). · Leave it. → **Answered (ADR-0029): Export into the repo.** Done 2026-10-14: `docs/agent/design/DESIGN-0.5/`. |
| E6 | B-191 | Saves, settings, notification permission and the service worker share the graygrayson1.github.io origin with any other Pages site of the account. | **Leave it** (one site on the account). · Move the game to its own domain or origin. → **Answered (ADR-0029): Leave it.** |
| E7 | B-193 | The GitHub deploy and the Render build publish without running tests. | **Run typecheck and unit tests in the deploy workflow before publishing.** · Leave it (the agent runs the four checks before every release). → **Answered (ADR-0029): Test before publishing (chunk 6).** |
| E8 | B-194 | Morph names and catalog odds disagree in places (a bristlenose name collision, rare morphs stocked more often than "1 in n"). | **Fix the data in chunk 6.** · Leave it. → **Answered (ADR-0029): Fix the data in chunk 6.** |
| E9 | B-195 | Animals in the holding container are frozen in time, though the game says "give them a tank soon". | **Change the copy to match (they wait safely).** · Make them age and get hungry there. → **Answered (ADR-0029): Match the copy (chunk 4 or 6).** |
| E10 | B-196 | Moving a placed tank in the room view is unreachable (nothing opens it). | **Add a "Move tank" action to the tank card.** · Remove the dead code. → **Answered (ADR-0029): Add "Move tank" (chunk 6).** |
| E11 | B-197 | 46 lint suppressions exist with no linter installed. | **Leave it (no linter, no new dependency).** · Install ESLint (a new dev dependency). → **Answered (ADR-0029): Leave it.** |
| E12 | B-008 | A home-directory path with the owner's user name is in the public history of `agent/s0-wip`. | **Leave it** (no secret; a history rewrite needs a force push). · Rewrite that branch's history. → **Answered (ADR-0029): Leave it.** |

Harness-era owner rows (B-132, B-133, B-137) were about the retired harness's gates; propose closing them as "no
action" (ADR-0018) in the same round as E. → **Answered (ADR-0029): closed as "no action".**

## F. Chunk 6's fresh code review (F1 open; F2–F4 answered)

Raised by the chunk 6 reviewer on 2026-10-15. None blocks 0.5.3; ask them with the owner's play-through.

| # | Question | Options (recommended first) | Source |
|---|---|---|---|
| F1 | ACC-005 asks for a VoiceOver pass (toasts, Link copied, switch states, form errors). An agent can't run VoiceOver. Who closes it? | **The owner turns on VoiceOver (Cmd-F5) during the 0.5.3 play-through and says what it reads**; the agent records it. · Narrow ACC-005 to the keyboard pass and the roles the tests check (tablist, radiogroup, role=alert, live toasts). | ACC-005; the review's blocker 4 |
| F2 | The quest "Best foot forward" reads "Enter a show. A healthy, settled adult that trusts you shows best." but since B-175 completes on judging day (a withdrawn entry never counts). New wording? | **"Enter a show and see it judged. A healthy, settled adult that trusts you shows best."** · Keep it. · Different wording. → **Answered (ADR-0036): the new wording.** | B-175 (`src/data/quests.ts`); the review's notes |
| F3 | A save's unknown water class, show tier, buyer archetype, staff role or staff trait is now reset or removed on load. If a later build adds one without bumping SCHEMA_VERSION, an older build opened after a rollback would convert those tanks, delete those shows (keeping their fees) and remove those team members for good. Pin these tables? | **Pin them: adding a water class, show tier, buyer type, staff role or trait bumps SCHEMA_VERSION, as species and tank sizes do (ADR-0016), checked by core-save-forward-safety.** · Keep such entries inert instead of removing them (more code in every system that reads them). · Leave it (old builds are best-effort, ADR-0005). → **Answered (ADR-0036): pin them** (`TABLES_AT` in core-save-forward-safety). | migrations.ts; the review and its confirmation pass |
| F4 | Settings has a "Save now" footer from before 0.5 ("Autosave keeps your progress. Save now any time."). No approved Settings screen draws it, and on a phone it covers part of Notifications' list (3 of 5 categories show before scrolling). Keep it? | **Keep it on General and Saves only** (where saving belongs; Notifications, Play & access and About show their whole list). · Keep it on every tab (as today). · Remove it (Saves has its own Save buttons). → **Answered (ADR-0036): General and Saves only.** Correction, measured after: Notifications has 6 categories (chunk 5's Automation), and on a 390×844 phone 3 or 4 of them show before scrolling by the browser's notification state (2 or 3 with the footer); Play & access and About still scroll too, so none shows its whole list (ADR-0036). | the QA review's second pass |

## G. The fresh review of ADR-0036's changes (answered)

Raised by the review of ADR-0036's changes on 2026-10-16 (B-203). Answered on 2026-10-18 (ADR-0037), in the round that also asked when 0.5.4 goes out, what comes next and who plays multiplayer first.

| # | Question | Options (recommended first) | Source |
|---|---|---|---|
| G1 | Beyond ADR-0036's five tables, a save's water-room prep level above 2, reservoir count above 3 and a rare-variant kind other than Prismatic are also reset or dropped on load, so an older build after a rollback would undo paid water-room upgrades or turn a newer rare animal ordinary; and the prep-level and reservoir limits are written out by hand, so a later build that adds a level without editing them would reset them in that same build. Pin these too? | **Pin them: a new prep level, more reservoirs or a new rare-variant kind raises SCHEMA_VERSION (pinned in core-save-forward-safety), and the limits are read from the Water room's table.** · Only read the limits from the table (fixes the same-build case; rollbacks stay best-effort, ADR-0005). · Leave it. → **Answered (ADR-0037): pin them** (`LIMITS_AT` in core-save-forward-safety; `RARE_VARIANT_KINDS`). | B-203; `src/persistence/migrations.ts` (`repairAutomation`), `src/sim/life/rareVariants.ts` |

## H. Multiplayer stage 1, before chunk 8 builds (answered 2026-10-18, ADR-0039)

Left by ADR-0038 (2026-10-18). Ask both with chunk 8's brief, before it builds; put the exact strings in the options'
previews.

| # | Question | Options (recommended first) | Source |
|---|---|---|---|
| H1 | Signing up sends the player's email, display name, friend code, synced save, aquarium snapshot and leaderboard numbers to Aquarium Go's Supabase project. Approve the short privacy note linked from sign-up (what is stored, why, who sees it, how to delete it)? | **The drafted wording** (written with chunk 8's brief). · Changes (say which). → **Answered (ADR-0039): Approve this wording** (the note is quoted in ADR-0039). | ADR-0038 decision 6 |
| H2 | Stage 1 asks for an email, and the game suits families. Who may sign up? | **13 and over: sign-up says so, and a parent signs up for a younger player.** · Anyone (the owner knows every player, since sign-up needs an invite code). → **Answered (ADR-0039): 13 and over** (a required checkbox: "I'm 13 or older, or I'm a parent or guardian signing up for my child."). | ADR-0038 decision 6 |

## I. Chunk 8's drafted strings (answered 2026-10-19, ADR-0041)

Left by ADR-0040 decision 5 (2026-10-19). Ask in one round before building those screens; build the rest meanwhile.
Put the exact strings in the previews (`docs/agent/design/ONLINE-STAGE1.md` §7.3 has them). The owner stopped a round
with previews on 2026-10-18 and answered the same questions as text, so offer them as text if the tool is declined.

| # | Question | Options (recommended first) | Source |
|---|---|---|---|
| I1 | Approve the remaining chunk 8 wording: the sign-up placeholders and "Back to sign in"; Settings › Account's labels and online-save lines; the delete dialog's title, buttons and toast; the online-save box's cards and note; the owner's create-club and invite-link controls? | **Approve this wording.** · Change some (say which). → **Answered (ADR-0041): Approve as written** (asked as four questions in one AskUserQuestion round, each with its strings in the preview). | ADR-0040 decision 5; ONLINE-STAGE1.md §7.3 |

## J. Chunk 8's setup (answered 2026-10-19, ADR-0042)

Left by ADR-0042 (2026-10-19), asked in the session as text.

| # | Question | Options (recommended first) | Source |
|---|---|---|---|
| J1 | The "Have an invite?" field's example reads "Invite code, e.g. HIGHLAND-4821" (the 0.5 design's), but real codes are now the club's word and four letters. Change it? | **"Invite code, e.g. FRIENDS-KDWX"** · Keep it as is. → **Answered (ADR-0042): "yes change it to FRIENDS-KDWX".** | ADR-0042; `SOCIAL_COPY.invitePlaceholder` |

## M. The audit of 2026-11-17: decisions left as they were (open)

Raised by the audit of 2026-11-17 (chunk 20): the auditors' findings, the fixers' reports and the fresh reviews, in
`/Volumes/Dev/Projects/AquariumGo-audit-2026-11-17/` on the owner's Mac (findings, reports and reviews by area, A to J).
Ten of the audit's questions were asked and answered on 2026-11-17 (ADR-0056). Under its decision 3 every other one kept
the game's rule exactly as it was, the screens were made honest about it (M9, M29 and M30 say where that is still to
do), and it waits here: none blocks a release, and the game keeps doing what each row's "Today" says until the owner
answers. They are grouped as `docs/agent/design/CHUNK-20/WORDS.md` is, by where the player meets them. Ask them with
AskUserQuestion, at most 4 per round, with an example of what the player sees today and of each option, as ADR-0056 did;
record the answers in a new ADR.

| # | Question | Options (recommended first) | Source |
|---|---|---|---|
| M1 | The guide's three steps that wait for friends to visit ("A visitor!", "Word gets around" and the reputation step) can only be passed by play: should they get a Next button? Today: no Next; the card says why no friend can come yet, offers "Open the Market" when no animal is on show and "Play" when time is paused. | **Next after a game day (4 real minutes at 1×)** · Next at once · No, keep them play-based | A1 |
| M2 | The research the betta's and seahorse's guides end on, now named "Breeding know-how", only opens two later projects (the Genetics Lab and Live Food Cultures), and nursery tanks were never locked behind it: what should it do? Today: any tank can be a nursery from the start, and the guide step and the research say honestly what the unlock opens. | **Keep nurseries open to everyone and the research as a step on the way, as the words now say** (areas E and G) · Give these two guides another real reward, such as the 40-gallon breeder the axolotl's and pea puffer's guides give (area A) · Lock the Nursery and Breeding purposes until the research · Give the research a real effect, such as better fry survival in a nursery | A3, G3, E13 |
| M3 | Clownfish and seahorse starters begin with a saltwater tank, so the quest "Into the blue" (set up a marine aquarium: $200 and 8 reputation) pays them as soon as the guide ends: should it? Today: it pays them then. | **Count it as done from the start, with no reward, as the matching achievement already is** · Keep it as a welcome gift | A15 |
| M4 | On a phone the guide's bubble says "Research now lives under More. Tap More, then Research." (the approved design's words): should it say "Research is under More. Tap More, then Research."? Today: the design's words. | **Change it** (its requirement and copy test change with it) · Keep the design's words | A10 |
| M5 | With Guide hints switched off, the guide still holds back four rewards (the 40 gallon breeder, Breeding know-how, better life support and Market listings) until steps such a player never sees: should they open by their normal rule instead? Today: they are held either way, and the lock box, the Unlock map and Build's cards name the guide step that gives each. | **Open them by their normal rule while the guide is hidden** · Keep holding them, as the screens now say · Switching hints off skips the guide | G1 |
| M6 | A finished quest whose reward isn't claimed keeps its place on the three-place quest board, so three of them stop new quests coming: should a finished quest give up its place? Today: it keeps it; the board says "Claim a reward to get new quests.", and Research (More on a phone) and the bell point at the reward. | **A finished quest frees its place; finished ones are listed apart until claimed** · Rewards claim themselves after a game day · Keep the rule, with the signposts now built | B2 |
| M7 | The "New" tags on More's Operations row, Research's Facility projects, Build › Facility's rooms, Operations' Water and Feed screens, the Auto Water Changer and brine shrimp eggs in Supplies never go away: should they show only until first seen? Today: they always show, as the approved designs (S3-D) draw them. | **Only until first seen** (a screen until first opened, a project until it is done or seen in Research) · Keep them for good · Remove them | B16, H19, J11 |
| M8 | Settings › About still shows "What's new in 0.5" in version 0.9.2: what should that section show? Today: 0.5's seven lines. | **Retitle it "What's new" and show the latest entry of the changelog** · The current release's lines in your words · Drop the section → **Settled by the release (`8448e9e`, 0.10.0, the lead's call under ADR-0056 decision 2):** it now reads "What’s new in 0.10" with seven lines written for this release (in WORDS.md), and a test checks its number against `package.json`; the owner may still prefer the changelog's entry or other lines. | B17, J12 |
| M9 | Rinsing a filter (free) also makes a worn filter like new, which no screen says: should it? Today: a rinse sets the filter's condition back to 100% without a word, and the wearing-out line says "repair it before it fails" (no screen was reworded for it yet). | **Keep it, and say so in the rinse message and the wearing-out line ("rinse it, free, or repair it")** · A rinse only cleans; condition comes back only by a paid Repair | C16 |
| M10 | Operations' problem list covers supplies and production lines only, not tanks in trouble (a failed heater, an ammonia spike): should it list those tanks too? Today: automation only; its all-clear now reads "Automation is running smoothly.", and the bell lists the tanks. | **Keep it to automation, as the words now say** · Add a "tanks needing a look" row that opens the bell | C20 |
| M11 | The smallest bag of salt is 5 kg for $15, so a saltwater player with almost no money can't change any water: should the shop sell a smaller bag? Today: no smaller bag; with too little salt for a 10% change and less than $15, the tank card says so and links to the ways to raise cash. | **No new bag: the card's words and link are enough** · Add a small bag (for example 1 kg for $3) | C1 (the review) |
| M12 | Hermit crabs sometimes kill snails for their shells, and real keepers add spare shells to prevent it, but spare shells do nothing in the game: should a Shell Pile in the tank lower the risk? Today: no effect, and the warnings and the Shell Pile no longer promise one. | **Yes: a Shell Pile in the tank lowers the hermits' risk to snails** · No, leave it as the words now say | D7 (B-220) |
| M13 | Some compatibility warnings never cause anything in the game (a mantis shrimp cracking thin glass, look-alike relatives fighting, fast swimmers stressing slow ones, too many territorial animals, a goldfish choking on a corydoras or otocinclus) but still make a mix "Conditional" or "High risk": what should they do? Today: they keep their verdict, and the science page says "High risk" can also mean "unsafe in a real aquarium". | **Keep them, as the science page now explains** (later, give the look-alike and territorial ones a real effect) · Give them an effect now, such as chasing stress or a cracked tank · Make them notes that don't change the verdict | D14 |
| M14 | With more than 160 animals, Livestock decides who "needs attention" by a quick rule that ignores harm from the water and calls any illness "Unwell", so it can disagree with an animal's card: which rule should it use? Today: the quick rule. | **The tank bar's rule (cheap, and close to the card)** · The card's full rule, worked out once per tank | D9 (B-121) |
| M15 | Trochus snails: should a few babies grow up in their own tank, or only when their eggs are moved to a nursery, like other egg-layers? Today: the adults eat every clutch in their own tank (4 snails in a 75-gallon reef spawned about 6 times in 30 days, 1,400 to 1,700 eggs a time, and none settled), and a nursery raises up to 6 a clutch. Letting them settle with no limit, as first built and then undone, took 4 snails to about 200 in 30 days, after which they starved in waves. | **Keep today's rule** (the same as every other egg-layer; nobody recommended an option, and this is the simplest) · Let 1 or 2 a clutch settle in their own tank, with a colony cap like the shrimp's (6 a gallon, 20 to 80; not built or measured) | E10 (the review's blocker 1) |
| M16 | A seahorse or Banggai father moved to a nursery to give birth eats his own newborns once they are out: should he leave them alone, as a cichlid pair does? Today: he eats them, and the game tells the player to move him back out. | **Keep the rule, as the words now say** · He spares them | E1 |
| M17 | Two animals whose sex doesn't show yet can be checked as a pair, and the check gives their hidden sex away ("Both are males."): should such a pair be allowed? Today: the check reads the hidden sex and says it. | **Allow it, but never say the hidden sex ("These two can't breed together.")** · Wait until the sexes show, and say that mystery and trochus snails pair up on their own | E5 |
| M18 | The discus page says their fry feed on their parents' skin mucus, but in the game they need baby brine and other foods like any cichlid's: which should change? Today: the page says mucus, and the game feeds them like other cichlids. | **Reword the page to what the game does** · Make the fry stay fed while a parent is with them | E10 |
| M19 | Goldfish spawn in the game after their water is cooled, but their pages say they spawn as it warms in spring: which should change? Today: they wait for the cool cue (Cool 25% twice), and the pages say warming. | **Keep the cool cue and reword the pages** · Make goldfish spawn after warming | E14 |
| M20 | Before the Genetics Lab is researched, "Likely offspring" counts genes an animal carries but doesn't show, which gives away that it carries them: should it forecast from what the animals show until then? Today: it counts the hidden genes too. | **Forecast from what they show until the Lab** · Keep it as it is | E24 |
| M21 | The clown goby's page says both parents guard the eggs, but in the game the mother eats them ("… is eating her own eggs!"): should both parents guard them, as a cichlid pair now does? Today: the mother eats them. | **Give the clown goby pair care** · Leave it | E27 (B-226) |
| M22 | Larvae said to "need" a live food (such as live copepods) still grow up in a nursery fed nothing, close to the most a nursery raises: should they die out without it, or should the lines stop saying they need it? Today: they grow up anyway, and the lines say they need it. | **Soften the lines** · Larvae without their food die out | E29 (B-225) |
| M23 | A buyer's first offer that comes in under your reserve price is turned down automatically, though the buyer might pay more after a counter-offer (about half of first offers fall below a reserve at fair value): should such an offer stay open for a counter? Today: it is turned down automatically, as the listing's Price step now says. | **Keep it open for a counter ("Below your reserve. Counter to bring them up.")** · Keep turning it down automatically | F3 |
| M24 | An offer on your listing is good for a few real minutes, but changing the game's speed stretches or shrinks that time (an offer good for 3 minutes at 1× lasts about 18 seconds after switching to 10×): should open offers keep their real minutes when the speed changes? Today: they don't. | **Keep their real minutes, as a held counter-offer already does** · Leave it | F22 (B-158) |
| M25 | Selling an unwell animal warns that it "can cost reputation" below health 50, but the cost applies only below 45: which one threshold should both use? Today: 50 for the warning, 45 for the cost (and a listing's review badge also counts high stress or hunger). | **45, so the warning shows exactly when the cost applies** · 50 | F23 (B-121) |
| M26 | The aquarium club's food parcel (answer 2) feeds grown animals only; fry and larvae in a brood aren't counted: should it feed them too? Today: broods aren't counted (the player, keepers and live-food dosers feed them). | **Yes, so no young starve just because the till is empty** (nobody recommended an option; this keeps the promise simple) · No, young stay with the player, keepers and dosers | the review of F5 (the parcel) |
| M27 | Big-water Freshwater and Shark & Ray Husbandry open animals that still wait in the shop for a much bigger tank (the 180 Gallon and the 500 Gallon Showpiece): should the research itself ask for that tank? Today: they need the 125 and the 300 Gallon, and each research card says which bigger tank its animals wait for. | **Keep the requirements, as the cards now explain** · Big-water Freshwater needs the 180 Gallon and Shark & Ray Husbandry the 500 Gallon Showpiece · The research also gives the tank | G5 |
| M28 | The compatibility check and the animals' own wellbeing count the hiding places a group needs differently (for six fish, about 6 against about 3): should they agree? Today: they differ; only Build's decor chip was made to match what the game counts. | **The compatibility check uses the wellbeing count** · Keep both · Wellbeing uses the compatibility count | G17 |
| M29 | Before the Operations Desk, Operations' red dot counts shortages (brine shrimp eggs, vegetables, doser food, fresh water) that its Overview doesn't show (the Live food tile reads "Running"): should the Overview show them? Today: the dot only (the tiles weren't reworded yet). | **Give the Live food and Water room tiles the shortage ("Eggs out", "Fresh water short")** · Show the bell's short problem rows there · Keep the dot only, as designed | H5 |
| M30 | Operations' "This week" takes every food and salt purchase in the whole shop away from the production lines' sales: what should it count? Today: "Line sales · Supplies & upkeep · Net", with the whole shop's supplies (not relabelled yet). | **The lines' own costs against their sales** · Relabel it ("Shop supplies & upkeep", "Lines minus shop costs") · Keep it | H16 |
| M31 | The stock manager can spend the till down to $0 just before tonight's bills and wages: should she keep enough back for them? Today: she plans with all the cash there is. | **Keep tonight's bills in the till, still buying food an animal has none of** · Spend up to the budget whatever the cash | H20 |
| M32 | With Autosave switched off, should the game still save by itself when the player closes or reloads the page? Today: "off" saves nothing on its own; the browser asks before unsaved play is lost (iPhone and iPad Safari never ask), and the game's own reloads ask first ("Save now and reload" or "Reload anyway"). | **No: "off" means nothing saves on its own, with the warnings now built** · Yes: "off" only stops the timed saves, and leaving or hiding the tab still saves | I2 (B-123) |
| M33 | Only temperature has a units setting (°C or °F): tanks are in gallons and inches, animals in centimetres and the room in metres. Should one Units setting switch them all? Today: the mix. | **One Units setting, US or Metric (gallons or litres, inches or cm, lb or kg, with °F or °C)** · US hobby units everywhere (feet for the room, inches for animals) · Leave the mix | J23 |
| M34 | "Aquarium" names both one tank ("Buy an aquarium first.", "List this aquarium") and the player's whole place ("Your aquarium ran…"), and "shop" several things: which word should mean what? Today: the mix. | **"Tank" for one tank, "aquarium" for your whole place, "the shop" only for Market › Shop** · "Aquarium" for one tank and "venue" for the place · Leave it | J24 |
| M35 | The quick-sale buyer is "the local fish store" in the quick-sell box but "Harbor Street Aquatics" in the sale history: how should it be named? Today: both. | **"Harbor Street Aquatics, the local fish store" the first time, "the local fish store" after** · Always "the local fish store" | J24 |
| M36 | "Keepers" names both the staff ("Keepers’ rounds", "Hire your first keeper") and a production line's stage for the young it keeps: which should change? Today: both. | **Staff lines say "aquarists" ("aquarists’ rounds", "Hire your first aquarist"); the stage keeps "Keepers"** · Rename the stage ("Kept young") · Leave both | J31 |
| M37 | A species page's Sources list shows each source's raw research notes (its first five facts, in the source's own units): how should Sources show? Today: each source's title, link and five raw facts. | **Titles with links, the facts behind a "Details" toggle** · Five chosen facts per source, in the game's units · Leave the raw facts | J38 |
| M38 | The wording sweep replaced some of the approved designs' words (in Operations "26 brine · 4 infusoria", "+40 / −34 made / used a day", "Baby brine 40 a day · uses 34", "glass weekly", "Short Day {d}" and "batches below 60%"; the 0.5 design's "Join group" and "Pair conditioning"; the shows' "Purse", "Deportment" and "table show") and kept a few as designed ("Can’t afford yet", "Build a marine tank" or "Build a tank", "Not enough", "QT" on a line's track, and "the prep station" and "the salt mixer" in sentences beside the machines' names, Water Prep Station and Salt Mixing Station): are both right? Today: as the sweep left them; the new words are in WORDS.md. | **Keep them as they are now** · Put back some of the designs' words (say which) · Change the kept ones too ("Need $X more", "Buy a marine tank", "Not enough money", "Quarantine") | J22, J25, J30, J32 |
| M39 | The online-save box's button "Keep this device’s" (ADR-0041's approved words) doesn't say that it replaces the save online: should it? Today: the approved words; the box warns "…Keeping this device’s replaces it, and that can’t be undone." only when the online copy is the same aquarium and further along, and says nothing when it is another aquarium. | **"Keep this device’s save", with a note that it replaces the one online and that loading the online save keeps this device's copy as "Previous autosave"** · Keep ADR-0041's words · The new words, and Keep also puts the online copy in Settings › Saves first (a change in what the game does) | J7 |
| M40 | Two species' pages disagree with the tank the game asks for: the panther grouper needs 300 gallons but its page says "A ten-foot tank of 500 gallons" (and "plan the 500-gallon tank"), and the queen angelfish needs 250 but its page says "An eight-foot tank of 300 gallons". Which should change? Today: the game's minimums, 300 and 250, beside the pages' words. | **The pages say both ("at least 300 gallons; it does best in the 500-gallon tank")** · Change the pages to the minimums · Raise the minimums to 500 and 300 (the shop and compatibility get stricter) | J9 |
| M41 | Should an animal whose wild status is unknown (the IUCN's "Data Deficient": the platy, the White Cloud Mountain minnow, the figure-eight puffer and the panther grouper) make its tank a conservation exhibit, as a threatened species does? Today: each scores as a threatened one (0.8, against 0.35 for a common species), and so do four Near Threatened species (panda corydoras, nerite snail, coral catshark, brownbanded bamboo shark); nothing a player sees changes either way yet, because the score feeds only an exhibit value no screen reads. | **Only threatened species count (Vulnerable, Endangered or Critically Endangered), so Data Deficient scores as a common species, as the cherry shrimp now does** (nobody recommended an option; this is the IUCN's own meaning) · The same, and Near Threatened too · Keep scoring them as threatened | J40 (the review of the sweep's second half) |

## N. Chunk 21: the defaults taken for the Collection, reveals and "What next?" (open)

Raised by chunk 21's builders and its review (their reports are in `/Volumes/Dev/Projects/AquariumGo-chunk21/` on
the owner's Mac). Each row is what the game does today (ADR-0057) and the alternative. The words are in
`docs/agent/design/CHUNK-21/WORDS.md`.

| # | Question | Today |
|---|---|---|
| N1 | What should the Collection's percentage count? | Every species equal: half for finding it, half for its morphs; full once found for the 32 species with no named morphs. Weighing by morph count would let betta and fancy guppy (1,226 of 2,253 morphs) dominate and early progress would read near 0% |
| N2 | Should legendary morphs count toward 100%? | Yes. Some are near 1 in a million at a seller, so the big species complete only through planned breeding |
| N3 | Which cards come first? | In progress, nearest completion first; then not started; complete last |
| N4 | "Nearly there": is 5% of a bonded pair's young the right bar, and does "Undiscovered species: one is in the shop now" belong there? | 5%; yes |
| N5 | Where does the Collection tab sit? | Third, after Aquarium science |
| N6 | How often should a reveal card appear? | Prismatic and the first of a named strain always; a new morph alone only at legendary, once a species a game day. Measured: about 1 brood in 8 for bettas from market pairs (all strain firsts; bettas have 10 strains), about 1 in 40 for guppies and platies. Fewer: only strains of tier rare or above |
| N7 | Should a bought Prismatic or rare find get a reveal card? | No: the shop shows its badge before the purchase |
| N8 | Should finds made while the game was closed get a reveal on opening the save? | No: the welcome-back card and the log list them. Only a hidden tab's return reveals |
| N9 | In a shared shop, should every member see a reveal for any member's brood? | Yes |
| N10 | The reveal's sound and its switch's place | The existing unlock chime; Settings › Notifications › "In the game" |
| N11 | "What next?": how much money must be left before it suggests optional spending (a show fee, rare stock, a move, research)? | It must cost at most half of what the player can spend |
| N12 | "What next?" while the guide runs | Only danger, the guide's step and hungry animals; with Guide hints off the guide is ignored and everything is listed |
| N13 | "What next?": Watch-level tank problems (water to watch, low food, worn gear) | Listed, after hungry animals |
| N14 | "What next?": the thresholds | A show closing within 48 game hours; rare stock leaving within 12; a quest from half done |
| N15 | "What next?": the N key, the light bulb icon, and its place | N; a light bulb; in the tank bar, and on an upright phone floating at the right edge at mid-height (inside the bar it cut the tank's status line) |
| N16 | An Operations problem in "What next?" shows with the calm colour and gift icon of "ready" items, though Operations shows it red | As described; giving it the warning colour is a small change |
