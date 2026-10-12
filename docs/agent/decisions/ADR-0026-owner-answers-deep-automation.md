# ADR-0026 — Owner answers, group C: deep automation (DESIGN-S3D's open rows, chunk 5)

**Status:** Accepted\
**Date:** 2026-10-11\
**Chunk:** before 5 (`docs/agent/OWNER_QUESTIONS.md` group C, C1–C14; C15, the approval, is ADR-0027)\
**Requirements:** NAV-004, AUTO-005, AUTO-012, AUTO-013, AUTO-015, PROD-015; BACKLOG B-176; INTAKE C-1, C-2, C-6,
C-14, C-15, C-16, C-21, C-22, C-23, C-26, C-36, C-37, C-38, C-48, C-57, C-58, C-63; design-intake-3 R1, R2, R3, M1,
M2, M6

## Context

DESIGN-S3D (deep automation) waited on `INTAKE.md` §11's owner rows and design-intake-3's findings
(`docs/agent/archive/evidence/S0/reviews/design-intake-3.md`). The session that asked group B (ADR-0025) asked group C
in four AskUserQuestion rounds, plus two follow-ups, with each question's screens open in Preview on the owner's Mac.
Before C8 the owner was sent the table of strings below (C8 approves it).

## Decisions

1. **Settings is a gear in every build** (C1, C-1): not only when Social crowds the dock. The dock gains Operations
   after Build.
2. **The 0.5 items DESIGN-S3D replaces are approved** (C2, C-2, C-58): Settings as a dock item (now the gear); the More
   sheet's height (its top at about 40 % of the phone's height instead of about 48 %, for the Operations row; NAV-004's
   test moves with the same ± 3 % tolerance); the production tiles' wording ("Listed now" becomes "Quarantine"; "This
   week" shows sales, see decision 3); the test helper that opens Settings from the dock (it uses the gear; no
   assertion weakens). ADR-0027 names them.
3. **A production line's "This week" tile shows sales, then net** (follow-up to B9 and C2): sales and count as drawn
   ("$369 · 9 sold"), with a small second line for what's left after food and power, using ADR-0025 decision 9's
   split (each line pays its share of each tank's residents). The second line's wording comes to the owner with
   chunk 4's copy. This settles the conflict between ADR-0025's B9 and C2 (and replaces INTAKE §12's proposed PROD-015
   change to "sales and count, not net").
4. **The Tanks panel keeps every tank's row** (C3, C-6): problem tanks first; the footer becomes "Show {n} more" or goes.
   Healthy tanks keep their cards and actions.
5. **Background tanks: option B** (C4, C-14, the LOD-fidelity question): a tank's pending time is settled on every
   player action, move and focus change, and before each shared water job; idle tanks stay coarse; water values agree
   within stated tolerances (ADR-0024 decision 7).
6. **Water is free, limited by prep** (C5, C-15, C-16): once a Water room exists, water is limited by the prep rate and
   the reserve size; an empty fresh reserve stops the Auto Top-Offs until prep refills it. Without a Water room nothing
   changes. AUTO-012 stays as written (a finite reserve).
7. **Live food never expires; harvests pause when full** (C6 and its follow-up, C-22, C-23, R1): option (c), not the
   recommended (a). "keeps 1 day" and "keeps 2 days" leave the Feed tab. The Live food room stores a limited amount
   of each food (chunk 5 sets the size, a few days of use); a harvest that would pass it is skipped, and the Feed tab
   shows the stock against the limit with the status "Full". AUTO-013 A2 ("capped by storage capacity") stands as
   written; C-23's proposed rewording is dropped.
8. **Finishing the research installs the base room** (C7, C-37): a Water room with the prep station, 150/60 gal
   reserves and a mixer; a Live food room with 2 hatchery cones and 4 culture jars. Add-ons and upgrades are bought in
   Build › Facility; dosers are placed from the tank card; chunk 5 sets the prices.
9. **The new copy is approved as proposed** (C8, C-48 with C-21, C-26, C-36, C-38, C-63, M2, M6): the table below,
   the agent's drafts included. Anything still unworded when chunk 5 is built follows the same style and goes to the
   owner in one batch.
10. **The stock budget is a $1 slider with an orders switch** (C9, C-21): "Raise budget" is hidden at the level's
    maximum with the reason (decision 9's wording); a separate switch turns Rosa's orders off and keeps the budget and
    the log quiet.
11. **The Automation category's subtitle drops "manual mode"** (C10, C-57): it reads "Shortages and paused lines".
12. **Salt machinery applies only when salt water is used** (C11, C-63, R2): the mixer, the salt meters and the salt
    problems apply only while a marine or brackish tank, or a hatchery, needs salt water; otherwise the Water tab shows
    decision 9's "Not needed" wording. Supplies shows the salt row once a Water room exists; Rosa's order counts real
    use, the hatchery included.
13. **The existing levers are the schedules** (C12, M1): a tank's lights-on hour moves its morning water change,
    Auto-feed's meals a day sets feeding, and Hold or Resume per system starts and stops the rest; each change applies
    from the next step; Water › Schedule and Today show every schedule. No schedule editor. AUTO-015 A5 reads this way.
14. **No stock manager: nobody reorders** (C13, M2): "No one reorders salt mix. Buy it, or hire a stock manager." with
    Buy and "Hire a stock manager" (to `#/visitors/staff`) instead of "Raise budget", no forecast or "arriving" state,
    and the notification in decision 9's table.
15. **A held Autofeeder counts as paused for the hungry-animal alert** (C14, M6, AUTO-005): worded "Auto-feed is held
    — feed {name} by hand, or resume it."

### The approved strings (C8)

As sent to the owner before C8. Rows marked *(draft)* were worded by the agent.

| Where | Proposed copy |
|---|---|
| A line that's gone | "This line isn't here any more" · "See your lines" |
| A room not built yet | §7.8's locked card: "The Water room isn't built yet" / "The Live food room isn't built yet", Locked "Tier {n}", the tier's description, "Links to this page keep working; they show this until it opens.", its requirements |
| No money / no floor space | Today's messages: "Not enough money for {what}: it costs {price} and you have {money}." · "There's no floor space for a {Tank}. Sell or move a tank, choose a smaller size, or expand your facility." |
| No line yet | "No production line yet" · "Pick a breeding pair and the tanks to use. The line moves fry, sorts keepers and lists the rest for you." · "Set up a line" |
| "Assisted care" tile before Tier 1 | Dashed tile: "Research Better Life Support, or build husbandry mastery with regular care." |
| The bell before anything is automated | No Automation section (no copy) |
| Dry food rows, no stock manager | "You restock it from the Market" |
| **Empty fresh reserve** *(draft)* | Meter status "Empty" (red), hint "Top-offs stop until prep refills it · {gal} gal by {time}". Problems card "Fresh water ran out · Look soon": "Today's water used the whole fresh reserve. Auto Top-Offs and salt mixing wait until the prep station refills it: {gal} gal by {time}." · Action "Faster prep in Build" |
| **Freshwater-only Water tab** *(draft)* | The salt meters show "Not needed", hint "No tank or hatchery uses salt water. Mixing starts when one does."; the mixer's row reads "Idle · not needed" |
| **Budget at the level's maximum** *(draft)* | Instead of "Raise budget": "The most for a {level} (${max})"; at the last level "The highest budget (${max})". Staff line: "Spent today: ${x} of ${budget} · the most at a {level}; up to ${next} at a {next level}" |
| Manual mode, no keeper | "{n} have no keeper: feed them by hand" |
| Line slot caption | As approved in B7 |
| **Tier ladder rows** *(draft)* | One row per missing thing, in §7.1's forms: "{Level} · {rep} of {needed} reputation" · "Research {project} · ${cost} · {n} days" · met: "{Level}: you're past it" · running: "Researching {project} · {n} days left". This replaces §11's combined "Specialty Shop (42 of 100 reputation) · research Central Water Supply, $900" |
| No stock manager, salt running out | "No one reorders salt mix. Buy it, or hire a stock manager." with Buy and "Hire a stock manager" (to Visitors › Staff), no forecast. **Notification** *(draft)*: "Out of salt mix" / "No one reorders salt mix. Buy it, or hire a stock manager. Salt water lasts until Day {d}." |
| Held Autofeeder, hungry animal | "Auto-feed is held — feed {name} by hand, or resume it." (C14 asks about this behaviour) |

Decision 7 changes one draft's context: with nothing expiring, no "keeps" wording ships, and the Feed tab's new
"Full" status is part of decision 7, not of this table.

## Owner approval

Given by the owner in a Claude Code session on 2026-10-11, in four multiple-choice rounds and two single-question
follow-ups. The questions are quoted as asked; each option's label is followed by its description in brackets. The
owner added no notes.

Round 1 was introduced with: "Three sets of screens are open in Preview: `home-*` and `more-normal-phone`, for C1 and
C2 (SPEC §5.1, Navigation); `tanks-*`, for C3 (SPEC §8.1, the Tanks panel); `operations-water-*` and
`build-facility-water-*`, for C4 (SPEC §7.2 the Water tab, §9.2 the Water room, §9.9)."

Question C1 (verbatim): "C1. DESIGN-S3D moves Settings out of the dock to a gear button in the top bar (SPEC §5.1). The
design did this because Social crowds the dock, but Social stays hidden outside dev mode, so normal builds would still
have room for Settings in the dock. Move it to the gear in normal builds too?" Owner's answer (selected option): **"Gear
in every build (Recommended)"** ("Settings is always the gear, in normal and dev builds alike. One layout to learn and
test, and room is already there when Social arrives. The dock gains Operations after Build."). Not chosen: "Only when
the dock is full" ("Settings stays in the dock until Social is shown, then moves to the gear. Players see two layouts
over time, and both need testing.").

Question C2 (verbatim): "C2. DESIGN-S3D replaces some approved 0.5 items: Settings as a dock item (now the gear), the
More sheet's height (its top rises from about 48% to about 40% of the phone's height to fit the Operations row), the
production tiles' wording (\"Listed now\" becomes \"Quarantine\"; \"This week\" shows sales), and the test helper that
opens Settings from the dock (it will use the gear; no test checks less). Approve the replacements, named in the
approval ADR?" Owner's answer: **"Approve (Recommended)"** ("The DESIGN-S3D approval ADR names these four as replacing
the 0.5 items. The 0.5 More-sheet test moves to the new height with the same tolerance."). Not chosen: "Keep some 0.5
items" ("Say in the notes which 0.5 items to keep. The design is adjusted around them.").

Question C3 (verbatim): "C3. The Tanks panel as drawn (SPEC §8.1) shows tanks with problems and ends with \"13 more
tanks, all healthy\" and a map link, so 13 tanks lose their cards and actions in the sample. Today every tank has a
card in that panel." Owner's answer: **"Keep every row (Recommended)"** ("Every tank keeps its row and actions, with
problem tanks sorted first. The footer becomes \"Show {n} more\" or goes. Nothing a player does today is lost."). Not
chosen: "Collapse as drawn" ("Show only tanks with problems; healthy tanks are reached through the map. Shorter list,
but healthy tanks' quick actions leave the panel.").

Question C4 (verbatim): "C4. Shared water reserves (SPEC §9.2): a Water room feeds every tank's water changes and
top-offs from one fresh reserve and one salt reserve. Tanks you aren't looking at are simulated in coarse chunks to save
time, so a shared reserve needs each tank's pending time settled first, or tanks would draw water out of order." Owner's
answer: **"Settle on actions (Recommended)"** ("A tank's pending time is settled on every player action, move and focus
change, and before each shared water job. Idle tanks stay coarse; water values agree within stated tolerances (as you
accepted in A7). Keeps big facilities fast."). Not chosen: "Full detail for all" ("Every tank is simulated at full
detail all the time. Exact, but a large facility runs slower, especially on phones and during catch-up.").

Follow-up to B9 and C2, introduced with: "Your answers to B9 and C2 conflict, and I should have caught it before asking.
In B9 you chose to show a line's profit \"After food and power\", splitting costs by share of residents. In C2 you
approved the design's tile wording, and that draws the line's \"This week\" tile as sales only (\"$369 · 9 sold\"). The
intake also proposed changing PROD-015 to sales only." Question (verbatim): "B9 + C2. What should a production line's
\"This week\" tile show? (Operations › Overview's own This week block shows the whole facility's sales, \"Supplies &
upkeep\" and net either way.)" Owner's answer: **"Sales, then net (Recommended)"** ("The tile shows sales and count as
drawn (\"$369 · 9 sold\"), with a small second line for what's left after food and power, using your B9 split (each
line pays its share of each tank's residents). Players see both what the line sold and whether it pays for itself. The
second line's wording comes to you with chunk 4's copy."). Not chosen: "Sales only, as drawn" ("The tile shows only
sales and count, as the design draws it (the intake's PROD-015 change). The B9 split isn't shown anywhere for now and is
used only if a per-line cost figure appears later.") and "Net, as in 0.5" ("The tile keeps 0.5's \"This week · +$146 ·
After food and power\" (net, using B9's split). C2's tile change then covers only \"Listed now\" becoming
\"Quarantine\".").

Round 2 was introduced with the screens for C5 (the Water tab and Build › Facility › Water, SPEC §9.2), C6
(`operations-feed-*` and `market-supplies-home-grown-*`, SPEC §7.3, §8.5, §9.3) and C7 (`build-facility-*`, SPEC §8.4,
§9.1), and the table of strings above.

Question C5 (verbatim): "C5. Is water a tracked resource? A Water room (SPEC §9.2) prepares fresh water at a set rate (6
gal an hour) into a 150 gal reserve, and mixes salt water from it into a 60 gal reserve. Today water is free and
unlimited." Owner's answer: **"Free, limited by prep (Recommended)"** ("Water costs nothing. Once a Water room exists,
it's limited by the prep rate and the reserve size: an empty fresh reserve stops the Auto Top-Offs until prep refills
it (rare: the sample makes 144 gal a day and uses 53). Without a Water room nothing changes from today."). Not chosen:
"Water costs money" ("Every gallon costs a little, so big facilities pay for their water. Needs new economy numbers and
a cost line in Finances.").

Question C6 (verbatim): "C6. Live food shelf life. The Feed tab (SPEC §7.3) says home-grown baby brine shrimp \"keeps
1 day\" and infusoria \"keeps 2 days\", and §9.3 makes them the same item as the store packs. Today nothing in the game
expires." Owner's answer: **"(c) Nothing expires"** ("Drop \"keeps 1 day\". Then home-grown stock has no limit, so
AUTO-013 A2 (home-grown stock is bounded) needs a storage cap (new design) or your waiver."). Not chosen: "(a) All of
it expires (Recommended)" ("Every lot of the two live foods expires, tracked by lot, including packs bought from the
Market (a change from today). Home-grown and bought stay the same item, and stock can't pile up forever.") and "(b)
Home-grown only" ("Only home-grown lots expire; bought packs keep forever. Then the two aren't really the same item, and
players may wonder why one spoils and the other doesn't.").

Follow-up to C6, introduced with: "For C6 you chose (c), nothing expires. As the option said, that leaves AUTO-013 A2
(\"home-grown stock is bounded\") needing either a storage cap or your waiver." Question (verbatim): "C6 follow-up.
Live food never expires, so what keeps home-grown stock from piling up without end (AUTO-013 A2)? Either way \"keeps 1
day\" and \"keeps 2 days\" leave the Feed tab." Owner's answer: **"Harvests pause when full (Recommended)"** ("The Live
food room stores a limited amount of each food (chunk 5 sets the size, a few days of use). A harvest that would go
past it is skipped, and the Feed tab shows stock against the limit with the status \"Full\". Keeps AUTO-013 A2 with two
small additions: the limit and the \"Full\" word."). Not chosen: "Waive A2: no limit" ("Stock grows as long as the
cultures run and nothing uses it. Simplest; you waive AUTO-013 A2 for 0.5.").

Question C7 (verbatim): "C7. Buying the rooms and machines. The design says they're \"bought and upgraded in Build ›
Facility\" (§8.4) and that the research \"gives\" them (§9.1), but nothing prices the first room or says how many
cones, jars or dosers there can be." Owner's answer: **"Research installs (Recommended)"** ("Finishing the research
installs the base room: a Water room with the prep station, 150/60 gal reserves and a mixer; a Live food room with 2
hatchery cones and 4 culture jars. Add-ons and upgrades (\"Faster · $380\", \"+150 gal · $240\", more cones and jars)
are bought in Build › Facility; dosers are placed from the tank card. Prices are set when chunk 5 is built."). Not
chosen: "Rooms bought outright" ("The research only unlocks the rooms; the player buys each room in Build › Facility
for a price. One more purchase step, and a new price to set for each room.").

Question C8 (verbatim): "C8. Approve the new copy in the table above: the strings the design needs but doesn't word, my
drafts for the rows it leaves unworded (the empty fresh reserve, the freshwater-only Water tab, the budget at its
maximum, the tier ladder rows, the no-stock-manager notification), and C-21, C-26, C-36 and C-63's strings?" Owner's
answer: **"Approve as proposed (Recommended)"** ("Use the table's strings, drafts included. Anything still unworded
when chunk 5 is built follows the same style and comes back to you in one batch."). Not chosen: "Change some" ("Say in
the notes which strings to change and how.").

Round 3 was introduced with the screens for C9 (`visitors-staff-*`, SPEC §8.7), C10
(`settings-notifications-automation-*`, SPEC §8.9) and C11 and C12 (`operations-water-*`, SPEC §7.2, §9.1, §9.2, §9.6).

Question C9 (verbatim): "C9. The stock manager's daily budget (SPEC §8.7). Today's control moves in $5 steps, but the
design says \"any whole-dollar amount\" and suggests \"$261 covers food and her 40 kg order\". Today a $0 budget is the
only way to stop Rosa's orders, and it logs \"Budget spent\" every day." Owner's answer: **"$1 slider + orders switch
(Recommended)"** ("A slider in $1 steps, so \"$261 covers…\" can be set exactly. \"Raise budget\" is hidden at the
level's maximum, with the reason (C8's wording). A separate switch turns Rosa's orders off and keeps the budget and the
log quiet."). Not chosen: "$5 steps + typed amount" ("Keep $5 steps and add a box to type an amount. The hint rounds to
the step (\"$265 covers…\", new copy). Stopping orders still means a $0 budget.").

Question C10 (verbatim): "C10. The new Automation notification category's subtitle is \"Shortages, paused lines and
manual mode\" (SPEC §8.9), but the design has no manual-mode notification, only \"Out of salt mix\" and \"{Line}
paused\"." Owner's answer: **"Drop \"manual mode\" (Recommended)"** ("The subtitle reads \"Shortages and paused
lines\". Manual mode is something the player turns on themselves, so there's nothing to tell them."). Not chosen: "Add
a manual-mode alert" ("Keep the subtitle and add a notification about manual mode (say when in the notes, for example
still on after a day). New template and wording.").

Question C11 (verbatim): "C11. A Water room in a facility with no salt water (say a betta keeper at a Specialty Shop).
As drawn, every Water room has a salt mixer and salt meters, so that player would see an empty salt reserve, \"Salt out
· Needs you\", red borders and bell alerts for salt they never use, while Supplies hides salt and Rosa never orders
it." Owner's answer: **"Only when salt is used (Recommended)"** ("The mixer, the salt meters and the salt problems apply
only while a marine or brackish tank, or a hatchery, needs salt water. Otherwise the Water tab shows C8's \"Not needed\"
wording. Supplies shows the salt row once a Water room exists, and Rosa's order counts real use, the hatchery
included."). Not chosen: "Show them always" ("Keep the design as drawn. A freshwater-only facility sees salt warnings it
can't act on until it buys salt.").

Question C12 (verbatim): "C12. Schedules. The design shows schedules (Water › Schedule, Today) but has no screen to edit
them, and AUTO-015 asks for schedules the player can change. Do the levers players already have count?" Owner's answer:
**"Existing levers count (Recommended)"** ("A tank's lights-on hour moves its morning water change, Auto-feed's meals a
day sets feeding, and Hold or Resume per system starts and stops the rest. Each change applies from the next step, and
Water › Schedule and Today show every schedule. No new screen."). Not chosen: "Add a schedule editor" ("A new screen in
Operations to set each job's times (water changes, mixing, harvests, Rosa's checks). New design, so chunk 5 waits for
it.").

Round 4 was introduced with the screens for C13 (`alerts-*` and `operations-issues-*`, SPEC §7.6, §8.3, §9.6) and C14
(`operations-manual-*` and `tank-card-held-*`, SPEC §7.7, §8.2, §9.7). Its C15 and "Go on to group D?" answers are in
ADR-0027.

Question C13 (verbatim): "C13. Without a stock manager nobody reorders, but the design's shortage copy assumes Rosa
(\"Rosa couldn't reorder…\", \"Raise budget\", a forecast of when salt arrives). Staff unlock with the Specialty Shop,
the same level as the Water room, and hiring is optional. Proposed: \"No one reorders salt mix. Buy it, or hire a stock
manager.\" with Buy and \"Hire a stock manager\" (to Visitors › Staff) instead of \"Raise budget\", no forecast or
\"arriving\" state, and the matching notification you approved in C8." Owner's answer: **"Approve (Recommended)"**
("Build the no-stock-manager case this way, so the copy never promises a reorder that can't happen."). Not chosen:
"Different wording" ("Say in the notes how it should read.").

Question C14 (verbatim): "C14. Manual mode holds the Autofeeders (keepers feed on their rounds instead). Today a paused
Autofeeder with a hungry animal raises the \"Auto-feed is paused\" alert. Should a held one do the same?" Owner's
answer: **"Yes, worded as held (Recommended)"** ("A held Autofeeder with a hungry animal raises the alert, worded
\"Auto-feed is held — feed {name} by hand, or resume it.\" A tank without a keeper never goes hungry silently."). Not
chosen: "No alert while held" ("Holding is the player's choice, so no alert. A tank with no keeper can go hungry with no
warning until animals suffer.").

## Consequences

- With C15 (ADR-0027) DESIGN-S3D is approved; chunk 5 starts after chunk 4. Before it, the agent writes design-intake-3's
  M3, M4, M5, R4 and R5 into the intake (no owner needed).
- Chunk 4 builds decision 3's tile (sales and count, then the net line) and asks the owner the net line's wording with
  its batched copy.
- NAV-004's More-sheet check moves from 45–51 % to about 40 % ± 3 % when chunk 5 adds the Operations row (C-58).
- AUTO-013 gains the storage limit and the "Full" status; no lot tracking or expiry is built. INTAKE §12 rows that
  assumed expiry (C-22 option (a)) follow decision 7.
- BACKLOG B-176's LOD-fidelity question is answered by decision 5.
