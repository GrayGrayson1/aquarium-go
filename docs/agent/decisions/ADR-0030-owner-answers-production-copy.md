# ADR-0030 — Owner answers, chunk 4: the production lines' copy, betta pairs and whole-tank sales

**Status:** Accepted\
**Date:** 2026-10-14\
**Chunk:** 4 (Production lines)\
**Requirements:** PROD-003, PROD-013, PROD-015, PROD-017, PROD-021, DES-008, AUTO-019; BACKLOG B-174, B-195

## Context

Chunk 4's brief asks the owner once, batched, for the player-visible text no design or ADR gives (End line's
confirmation, the missing-reference notice, the quarantine purchase's restart line, the This week tile's net line;
ADR-0025's option descriptions gave examples, not approved copy). Reading the code for the line's design raised three
more points: DESIGN-S3D names a sort editor it never draws; bettas and honey gouramis are introduced by the keeper and
a female left with the male is chased and injured (`src/sim/life/breeding/systems/bubbleNest.ts`), while the design's
sample keeps Blaze × Cinder together; and B-174 left the whole-tank sale's relocation rule to the owner, which decides
whether E9's holding-container copy (ADR-0029 decision 9) lands in this chunk. The agent building chunk 4 asked eight
questions in two AskUserQuestion rounds, before writing the line's code.

## Decisions

1. **Ending a line** (B6): "End line" on the header card opens "End the {Line}?" · "Its animals stay in the tanks
   they're in, the line slot frees up, and its numbers stay in its history." · "Keep the line" · "End line"; then the
   toast "{Line} ended" / "Its animals stay where they are."
2. **A line that can't run** (B10, PROD-017): "{Line} paused: {name} is no longer in your care. Choose another pair,
   or end the line." · "{Line} paused: {tank} is gone. Choose another tank, or end the line." · "{Line} paused: {name}
   isn't in {breed tank}. Move {name} back, or choose another pair." The affected stage card offers "Choose another
   pair" or "Choose another tank"; the badge reads "Paused". Once per incident, on the line and in the log.
3. **Adding a quarantine tank** (B5): "Add a quarantine tank · ${kit}" on the line's amber note when the line waits
   for quarantine, opening "Add a quarantine tank" · "A {tier} like {current quarantine tank}, for the {Line}." · a
   switch "Seeded filter media · +${n}" with "Ready for the juveniles at once. Without it the tank has to cycle
   first." · "Cancel" · "Set up · ${total}". The toasts are DESIGN-S3D's ("Set up · $95" / "Quarantine 2 · 20 Gallon
   Long" / "The Royal Blue juveniles move in on Day 42 and the line restarts."); unseeded, the last line reads "The
   juveniles move in once it has cycled." No money or no floor space: today's messages.
4. **The This week tile's net line** (ADR-0026 decision 3): "$221 after food and power" ("−$12 after food and power"
   for a loss), under "$369" · "9 sold".
5. **The line's smaller messages** (no design words them): "{Line}: {keep tank} is full, so {name} stays in {tank}." ·
   "{Line}: {n} {young} couldn't be listed: {reason}" (the market's own message) · "{Line} is running again: {raise
   tank} has room." · set-up step 2's "Doesn't fit" badge with the reason (today's water and temperature messages, "No
   room for young", "Already the {stage} tank") · empty stage cards "Waiting for the next clutch" (Raise), "Free"
   (Quarantine), "Nothing listed" (Sell).
6. **The sort editor**: a sheet "Sort" · "Young that match a rule move to {keep tank}. The rest go to quarantine." ·
   rows "Keep best [n] [trait]" with "Remove" · "Add a keep rule" · "Done". The traits offered are the ones the pair's
   young can show; Prismatic young follow "Never sell Prismatic animals". Sell stays fixed at "Auctions · reserve at
   fair value −10%" (0.5 §11, PROD-014) and opens nothing.
7. **Bettas and other keeper-introduced species**: the line moves the female. She rests in her own tank (or the line's
   keep tank, if she lived with the male); the line brings her to the male's breed tank when both are ready and moves
   her back right after spawning, through the existing Start breeding and Separate actions and their log lines.
8. **Whole-tank sales** (B-174, B-195): a sold tank's unlisted animals move only to a tank with room and no high-risk
   mix. If none exists the sale still goes ahead and the animal rests in the holding container with E9's message
   (ADR-0029 decision 9); its Livestock row reads "Resting in a holding container" (was "In transit"). So E9 lands in
   chunk 4.

## Owner approval

Given by the owner in a Claude Code session on 2026-10-14, in two multiple-choice rounds. The questions are quoted as
asked; each option's label is followed by its description in brackets. The owner added no notes.

Question 1 (verbatim): "Chunk 4 copy 1 of 8 — Ending a line (your B6: \"End line\" on the line's header card, behind a
confirmation). How should the confirmation read?" Owner's answer (selected option): **"Approve wording
(Recommended)"** ("Button \"End line\" on the header card opens: title \"End the {Line}?\", body \"Its animals stay in
the tanks they're in, the line slot frees up, and its numbers stay in its history.\", buttons \"Keep the line\" · \"End
line\". Afterwards a toast: \"{Line} ended\" / \"Its animals stay where they are.\""). Not chosen: "Different wording"
("Say in the notes how it should read.").

Question 2 (verbatim): "Chunk 4 copy 2 of 8 — A line that can't run (your B10: it pauses with one notice and is kept
so you can fix it or end it). These notices show on the line and in the log, once per incident. Approve?" Owner's
answer: **"Approve wording (Recommended)"** ("Parent gone: \"{Line} paused: {name} is no longer in your care. Choose
another pair, or end the line.\" Tank gone: \"{Line} paused: {tank} is gone. Choose another tank, or end the line.\"
Parent moved out by you: \"{Line} paused: {name} isn't in {breed tank}. Move {name} back, or choose another pair.\" The
affected stage card gets a button \"Choose another pair\" or \"Choose another tank\" (opens the set-up step's list).
Badge: \"Paused\"."). Not chosen: "Different wording" ("Say in the notes how they should read.").

Question 3 (verbatim): "Chunk 4 copy 3 of 8 — \"Add a quarantine tank\" (your B5: real kit price, seeded media offered,
restart day only once the tank is cycled or seeded). It appears on a line's amber note when the line waits for
quarantine. Approve?" Owner's answer: **"Approve wording (Recommended)"** ("Button \"Add a quarantine tank · ${kit}\"
opens: title \"Add a quarantine tank\", body \"A {tier} like {current quarantine tank}, for the {Line}.\", a switch
\"Seeded filter media · +${n}\" with \"Ready for the juveniles at once. Without it the tank has to cycle first.\",
buttons \"Cancel\" · \"Set up · ${total}\". Toasts use DESIGN-S3D's \"Set up · $95\" / \"Quarantine 2 · 20 Gallon
Long\" / \"The Royal Blue juveniles move in on Day 42 and the line restarts.\"; unseeded, the last line is \"The
juveniles move in once it has cycled.\" No money / no floor space: today's messages."). Not chosen: "Different
wording" ("Say in the notes how it should read.").

Question 4 (verbatim): "Chunk 4 copy 4 of 8 — The line's \"This week\" tile (your C2 follow-up: sales and count as
drawn, then a small second line for what's left after food and power). How should the second line read?" Owner's
answer: **"\"$221 after food and power\" (Recommended)"** ("Tile: THIS WEEK · \"$369\" · \"9 sold\", then \"$221 after
food and power\" (a loss reads \"−$12 after food and power\")."). Not chosen: "\"Net $221 · food and power $148\""
("Shows both the net and the costs."); "Different wording" ("Say in the notes how it should read.").

Question 5 (verbatim): "Chunk 4 copy 5 of 8 — The line's smaller messages and empty states, none of which any design
words. Approve them all as listed?" Owner's answer: **"Approve all (Recommended)"** ("Keep tank full: \"{Line}: {keep
tank} is full, so {name} stays in {tank}.\" Auto-listing refused: \"{Line}: {n} {young} couldn't be listed: {reason}\"
(reason = the market's own message, e.g. \"You can run up to 24 listings at once.\"). Back to work after waiting for
room: \"{Line} is running again: {raise tank} has room.\" Set-up step 2, a tank that can't be used: badge \"Doesn't
fit\" plus why (today's water and temperature messages, or \"No room for young\", or \"Already the {stage} tank\").
Empty stage cards: Raise \"Waiting for the next clutch\", Quarantine \"Free\", Sell \"Nothing listed\"."). Not chosen:
"Different wording" ("Say in the notes which to change and how.").

Question 6 (verbatim): "Chunk 4 copy 6 of 8 — The Sort editor. DESIGN-S3D says the Sort field and stage card open \"the
sort editor\" (keep rules such as \"Keep best 2 Cambodian\"), but nothing draws it. Proposed: a small sheet. Approve?
(Sell stays fixed at \"Auctions · reserve at fair value −10%\", as 0.5 §11 specifies, so it opens nothing.)" Owner's
answer: **"Approve (Recommended)"** ("Sheet titled \"Sort\" with \"Young that match a rule move to {keep tank}. The
rest go to quarantine.\"; one row per rule: \"Keep best [2] [Cambodian ▾]\" with \"Remove\"; a button \"Add a keep
rule\"; \"Done\" closes it. The traits offered are the ones the pair's young can show. Prismatic young keep following
\"Never sell Prismatic animals\"."). Not chosen: "No editor in chunk 4" ("Lines keep only \"Keep Prismatic · Sell the
rest\" for now; keep rules come later."); "Different design" ("Say in the notes.").

Question 7 (verbatim): "Chunk 4 behaviour 7 of 8 — Bettas (and honey gouramis) don't live as pairs: the game's own
rule is that a female left with the male gets chased and injured, and the keeper introduces her only to spawn.
DESIGN-S3D shows Blaze × Cinder together in the breed tank. What should a betta line do?" Owner's answer: **"Line
moves the female (Recommended)"** ("The line does what you'd do: the female rests in her own tank (or the line's keep
tank, if she lived with the male), and the line brings her to the male's breed tank when both are ready, then moves
her back right after spawning. Uses the existing Start breeding and Separate actions, with their usual log lines.").
Not chosen: "Leave them together" ("The pair stays in the breed tank; the female gets chased and hurt as the game
already models."); "No betta lines" ("Species the keeper has to introduce can't run a line.").

Question 8 (verbatim): "Chunk 4 behaviour 8 of 8 — Whole-tank sales (B-174, your call per the backlog) and the holding
container (your E9 wording). Today a sold tank's unlisted animals are moved into any tank of the right water, even one
with no room, and into a high-risk mix if nothing better exists. What should happen?" Owner's answer: **"Room first,
else holding (Recommended)"** ("Unlisted animals move only to a tank with room and no high-risk mix. If none exists,
the sale still goes ahead and the animal rests in the holding container with your E9 message; its Livestock row reads
\"Resting in a holding container\" (today: \"In transit\")."). Not chosen: "Block the sale" ("The sale waits until you
move the animal yourself (today's message: \"…has no other suitable tank to move to. Move {name} first, or withdraw
and re-list…\")."); "Leave as today" ("Cram them in anywhere suitable, risky mixes allowed with a warning; only the E9
wording changes.").

## Consequences

- Chunk 4 has all its copy: PLAN.md's "Decide" line for chunk 4 is settled.
- B-174 and B-195 are built in chunk 4 (relocation in `src/sim/economy/listings.ts`, the Livestock row,
  `docs/KNOWN_LIMITATIONS.md`); chunk 6's brief drops E9.
