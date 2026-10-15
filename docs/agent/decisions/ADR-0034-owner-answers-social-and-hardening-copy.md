# ADR-0034 — Owner answers, chunk 6: the Social stub's copy and data, the bristlenose rename, tiers on stock odds, a third fresh-water reason, What's new in 0.5

**Status:** Accepted\
**Date:** 2026-10-14\
**Chunk:** 6 (Social stub, hardening and the last 0.5 release)\
**Requirements:** SOC-004, SOC-007, SOC-008, SOC-009, SOC-011, NOTIFY-003, DES-010; BACKLOG B-194, B-202; 0.5 spec
§12.2, §13.4–§13.6, §16, §21 (release step)

## Context

Before building chunk 6, the agent gathered every piece of player-visible text the designs and ADRs don't give (as
PLAN.md's chunk brief and `AGENTS.md` ask) and asked the owner once, in two AskUserQuestion rounds of four:

1. **The Social stub** (0.5 §13, dev-only per ADR-0005 decision 3). The approved screens
   (`docs/agent/design/DESIGN-0.5/screens/desk-social.png`, `phone-clubs.png`, `phone-leaderboard.png`, opened on the
   owner's Mac before asking) show sample clubs, trades, friends and leaderboard rows, some cut off; §13 leaves the
   trade note, Add friend's result, the Clubs search's no-match line, the Show wins unit and the Social dot's name
   unworded; §13.4's "you joined in September" needs a join month the §13.6 storage rule doesn't keep; §12.2's
   club-show reminder has no calendar to come from.
2. **B-194's two halves** (ADR-0029 decision 8): the bristlenose's two-copy fin overlay needed a new name, and making
   the offer's "about 1 in n" count the seller's pick (a Rare find keeps the most striking of six rolls) raised whether
   tiers, defined on the same market-stock share (ADR-0022 decision 1), follow. The agent's estimate before asking
   (`scripts/_audit/C6/odds.ts`, a best-of-six mix at about 12 % of a single-animal species' stock): betta 30 of 540
   looks move one tier, Legendary 364 → about 340, up to 1.6× the genes' share.
3. **B-202's third cause** for "Fresh water runs short": the prep station makes enough over the day, but salt mixing
   finds too little fresh water at its checks, so the approved prep wording read "use 144 … makes 144".
4. **Settings › About's "What's new in 0.5"** (§16, filled by §21's release step): the design's list predates
   production lines and Operations and names Social, which players won't see.

## Decisions

1. **Social's sample data** is the preview's, exactly:
   - Clubs (name · members · blurb): Highland Betta Club · 128 members · "Bettas, show dates and spawning logs", next
     event "Club show on Saturday · 12 entries so far"; Prismatic Hunters · 2,341 members · "Rainbow finds, shared the
     day they land"; Nano Tank Collective · 412 members · "Small tanks, big ideas"; Reef Starter Circle · 87 members ·
     "Marine beginners helping each other".
   - Trades: "Mara offers 2 Golden Bold-spotted Pea Puffers" / "for your Red Veiltail Betta"; "Jun wants an Axanthic
     Axolotl" / "pays $190 or trades a Leucistic"; "Teo offers 10 Fire Red Cherry Shrimp" / "for any Butterfly betta".
   - Friends' aquariums (title · size · likes): Ola's Grand Reef · 1,000 gal · 48 likes; The Ada Hall · Public aquarium
     · 31 likes; Jun's axolotls · 40 gal · 12 likes; Priya's Prismatic room · 220 gal · 27 likes; Teo's shrimp rack ·
     60 gal · 9 likes; Sam's planted 75 · 75 gal · 15 likes.
   - Leaderboard top 4: Collection value Ada Okafor $214,900 · Ola Brandt $188,420 · Priya Nair $151,030 · Sam Duarte
     $97,610; Prismatics Priya Nair 4 · Ada Okafor 3 · Jun Park 2 · Teo Silva 1; Show wins Sam Duarte 9 · Ola Brandt 7
     · Mara Quinn 6 · Ada Okafor 5. The player's row: "You · {your aquarium's name}". The stub ranks more players than
     it shows; their names never appear.
2. **Social's unworded copy:**
   - The coming-soon note ("Offer a trade", and a trade's "View"): title "Trades open later", text "Trading circles
     need Aquarium Go online, which isn't here yet. Nothing was offered, and your animals stay in your aquarium.",
     button "Close".
   - Add friend: toast "Request sent" · "{CODE}" · "Their aquarium shows here once they accept."; error "That friend
     code didn't match anyone. Check it and try again."
   - The Clubs search with no match: "No clubs match "{search}". Check the spelling, or paste an invite code."
   - Leaderboard units: Show wins "1 win" · "{n} wins"; Prismatics as drawn, "{n} Prismatic"; money as "$214,900".
   - The Social dot's name (dock and More tile, hover and screen readers): "Social — New" until Social is first
     opened; "Social — New trades and club news" for new trades or club news.
3. **The join month is kept:** the stub stores the month you joined each club beside the joined club ids (never a
   password, nothing else), so "Your club" reads as designed, e.g. "128 members · you joined in October". This
   amends §13.6's storage list (and SOC-009 A3) by that one field.
4. **A dev-only Friday club-show reminder:** only while Social is reachable (dev mode) and the player is a member, at
   most once per page session, on Fridays (the device's day), a Shows-category notification "Highland Betta Club" ·
   "Club show on Saturday. Entries close Friday." that opens Social › Clubs. Nothing is stored for it.
5. **The bristlenose's two-copy fin overlay is "Double Long-fin"** (was "Super Long-fin"): "Super Red Long-fin
   Bristlenose Pleco" (one copy) and "Super Red Double Long-fin Bristlenose Pleco" (two copies); "Calico Super
   Long-fin" → "Calico Double Long-fin" and so on. Saves are updated: each bristlenose's name is recomputed from its
   genes.
6. **Tiers follow the shown odds:** a look's "about 1 in n" and its tier both come from its share of market stock
   counting the seller's pick, so they always agree (ADR-0022's Legendary below 1 in 10,000 of market stock holds).
   Colony species' offers are never picked singles, so their looks don't move.
7. **A third "Fresh water runs short" reason**, shown only for this cause (the two ADR-0033 reasons stay): "Salt mixing
   needs {b} gal of fresh water at its 10 AM and 10 PM checks, and the fresh reserve doesn't have it by then. What it
   can't cover waits: changes are skipped, not done weak." Its button is "Reservoirs in Build", else "Faster prep in
   Build", else "Water tab".
8. **Settings › About's "What's new in 0.5"**, one line per item under the version row: "Links to every screen, and a
   tab bar on phones" · "Shop filters: Prismatic only and Rare genes" · "New betta genes: Cambodian and Metallic" ·
   "Auto-feed and Auto-clean on the tank card" · "Notifications while the game is open" · "Production lines in
   Livestock" · "Operations: the Water room and the Live food room". (§16's list without Social, and with chunks 3 to
   5's additions.)

## Owner approval

Given by the owner in a Claude Code session on 2026-10-14, in two multiple-choice rounds of four questions. The
questions are quoted as asked; each option's label is followed by its description in brackets, and, where the option
had one, its preview. The owner added no notes.

Round 1, question 1 (verbatim): "Round 1 of 2 (Social stub, dev-only per ADR-0005). The screens I just opened show
sample clubs, trades, friends and leaderboard rows, some cut off. Use this sample data, completed from the screens?
(The stub needs more ranked players than it shows; their names never appear.)" Owner's answer (selected option):
**"Use this data (Recommended)"** ("Exactly the strings in the preview. Names and numbers match the screens; the
cut-off club blurbs, three extra friend tiles and the Show wins rows are filled in."; the preview showed the data in
decision 1). Not chosen: "Different data" ("Say in the notes what to change.").

Round 1, question 2 (verbatim): "Social's actions the design leaves unworded. 'Offer a trade' (and a trade's 'View')
opens a 'coming soon' note; 'Add friend' needs a result; the Clubs search needs a no-match line; Show wins needs a
unit; the Social dot needs a name for screen readers. Use these?" Owner's answer: **"Use these (Recommended)"**
("Exactly the strings in the preview. Same voice as the design's invite error and toasts."; the preview showed the
strings in decision 2). Not chosen: "Different wording" ("Say in the notes which lines to change.").

Round 1, question 3 (verbatim): "'Your club' reads '128 members · you joined in September' (§13.4), but §13.6 says
the stub stores only email, display name and joined club ids, so it can't know the month. What should the row say?"
Owner's answer: **"Month you joined (Recommended)"** ("The stub also keeps the month you joined each club (never a
password, nothing else), so the row reads as designed, e.g. '128 members · you joined in October'."; preview "128
members · you joined in October"). Not chosen: "Leave it out" ("The stub stores only what §13.6 lists; the row says
the member count only."; preview "128 members").

Round 1, question 4 (verbatim): "§12.2 lists club-show reminders (Shows category, off by default): '{Club}' / 'Club
show on {day}. Entries close {day}.', opening Social › Clubs. The stub has no real club calendar. Build one?" Owner's
answer: **"Dev-only Friday reminder (Recommended)"** ("Only while Social is reachable (dev mode) and you're a member:
at most once per session, on Fridays, a Shows notification. Nothing is stored for it."; preview "Highland Betta Club /
Club show on Saturday. Entries close Friday. / → opens Social › Clubs"). Not chosen: "None until a real backend" ("No
club-show reminder in 0.5; the Shows category keeps only show results.").

Round 2, question 1 (verbatim): "Round 2 of 2. B-194 (ADR-0029 E8): the bristlenose's two-copy fin overlay 'Super
Long-fin' loses its 'Super' next to the Super Red colour, so two different looks share 'Super Red Long-fin'. Saves are
updated (each animal's name is recomputed from its genes). What should the two-copy overlay be called?" Owner's
answer: **"Double Long-fin (Recommended)"** ("Says what it is (two copies of Long-fin) and shares no word with any
bristlenose colour."; preview "one copy → Super Red Long-fin Bristlenose Pleco / two copies → Super Red Double
Long-fin Bristlenose Pleco / Calico Super Long-fin → Calico Double Long-fin / Lemon Super Long-fin → Lemon Double
Long-fin / Super Long-fin Bristlenose Pleco → Double Long-fin Bristlenose Pleco"). Not chosen: "Extra Long-fin"
("Describes the look rather than the genetics.").

Round 2, question 2 (verbatim): "B-194's other half: the offer's 'about 1 in n' will count the seller's pick (a Rare
find takes the most striking of six rolls), so rare looks show up to 1.6× more often than the genes alone say. Tiers
are defined on the same 'market stock' share (ADR-0022: Legendary below 1 in 10,000). Should tiers follow the new
odds?" Owner's answer: **"Tiers follow the odds (Recommended)"** ("Tier and odds always agree. Betta: 30 of 540 looks
move one tier (estimate), Legendary 364 → about 340; colony species (shrimp) don't move, their offers are never picked
singles."; preview "Very rare morph · about 1 in 6,000 market bettas (a look that was Legendary at 1 in 9,600 by genes
alone)"). Not chosen: "Tiers stay on the genes" ("Only the 'about 1 in n' line changes; a few Legendary looks will
then read 'about 1 in 6,000', against ADR-0022's 1 in 10,000.").

Round 2, question 3 (verbatim): "B-202: 'Fresh water runs short' has a third cause the two approved reasons
(ADR-0033) miss: the prep station makes enough over the day, but salt mixing finds too little fresh water at its 10 AM
and 10 PM checks, so today it reads 'use 144 … makes 144'. Add this reason (its button is Reservoirs in Build, else
Faster prep, else the Water tab)?" Owner's answer: **"Add this reason (Recommended)"** ("Shown only for this cause;
the two approved reasons stay as they are."; the preview showed the text in decision 7). Not chosen: "Different
wording" ("Say in the notes how it should read.").

Round 2, question 4 (verbatim): "The release step fills Settings › About's 'What's new in 0.5' (§16). The design's
list predates production lines and Operations, and says 'Social on the dock', which players won't see (dev-only). Use
this list instead?" Owner's answer: **"Use this list (Recommended)"** ("Section title 'What’s new in 0.5', one line
per item, under the version row."; the preview showed the list in decision 8). Not chosen: "The design's list" ("As
§16 has it, without the Social item."; preview "Tab bar on phones · Shop filters: Prismatic only and Rare genes · New
betta genes: Cambodian and Metallic · Auto-feed and Auto-clean").

## Consequences

- Chunk 6 builds the Social stub with this data and copy (`src/social/`, `src/ui/panels/social/`); the stub's stored
  value is `{ email, displayName, joinedClubIds, joinedMonths }` (decision 3).
- NOTIFY-003's club-show reminder lands as decision 4 says (dev-only, SOC-011 A5).
- B-194: the bristlenose data, a save migration that recomputes bristlenose names from their genes, a data test that no
  two looks share a name, and a catalog share that counts the seller's pick (tiers and the morph line follow it). The
  rarity report's tier counts change; chunk 6's commit reports them.
- B-202 gains the third reason; Settings › About gains "What's new in 0.5" for the release.
