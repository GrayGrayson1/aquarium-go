# ADR-0025 — Owner answers, group B: production lines (chunk 4)

**Status:** Accepted\
**Date:** 2026-10-11\
**Chunk:** before 4 (`docs/agent/OWNER_QUESTIONS.md` group B)\
**Requirements:** PROD-006, PROD-008, PROD-011, PROD-015, PROD-017, PERSIST-006, DES-008; BACKLOG B-135; INTAKE
C-27, C-28, C-29, C-33, C-34, C-36

## Context

Chunk 4 (Production lines, several per species) waited on group B: the approval of DESIGN-S3D's production screens
(SPEC §8.6, §8.6.1), `INTAKE.md` §11's Production rows, and the PROD-006, PROD-015 and PROD-017 calls. The session
after group A asked group B in three AskUserQuestion rounds, with the eight `livestock-production-*.png` screens open
in Preview on the owner's Mac.

## Decisions

1. **The production screens are approved** (B1): DESIGN-S3D SPEC §8.6 (a line picker strip under the Production tab,
   several lines per species, per-line header, tiles, stages and Line rules) and §8.6.1 (the three new-line steps:
   pair, tanks, rules; lines named after the morph they breed for) are chunk 4's screens. They replace 0.5 §11.1's
   single-line UI (the rest of §11.1, the header card, tiles, stages, rules and editors, stays as §8.6 builds on it).
2. **Raise timings come from species data** (B2, C-27, B-135's sell step): each species' data sets how long raising
   takes and what the stages are called; the sell step lists each animal by its life stage at the time of sale (an
   animal that has grown up sells as an adult). The design's fixed "5 days as fry plus 14 as a juvenile" and the
   sample's day numbers are illustrations, not rules.
3. **Automation never lists a Prismatic** (B3, C-28, PROD-011): whatever "Never sell Prismatic animals" says. The
   switch only chooses where the animal goes: on, it moves to the line's keep tank; off, it stays with its batch. A
   player sells a Prismatic only by listing it by hand.
4. **"Protected" is defined** (B4, C-29, PROD-008): every animal in a line's keep tank, every Prismatic and every
   favourite. Automation never moves them out, lists them or sells them. Young kept by the line's trait rules move to
   the keep tank (the Keepers stage), so they are protected too.
5. **"Add a quarantine tank" is a real purchase** (B5, C-33): the button shows the real kit price (tank, gear and
   substrate, as Build charges today), offers seeded filter media, handles no money and no floor space with today's
   messages, and checks the tank suits the line (water type, temperament, space). The line gives its restart day
   only once the new tank is cycled or seeded.
6. **Lines can be ended** (B6, C-34): "End line" on the line's header card, behind a confirmation. The line's animals
   stay in the tanks they're in, its slot frees, and its numbers stay in its history.
7. **The slot captions are approved as worded** (B7, C-36): "{used} of {n} line slots · {level}" while a slot is free
   ("1 of 2 line slots · Specialty Shop"); "{n} of {n} line slots · more at {next level}" when every slot is used;
   "8 of 8 line slots · Grand Hall" at the last level; "0 of 1 line slot · more at Specialty Shop" with no line yet;
   "slot" or "slots" by count.
8. **A full raise tank with "Pause when a tank is full" off** (B8, PROD-006): the fry stay where they are (with the
   parents) and the line keeps running, with one notice: "{Line}: the raise tank is full, so the fry stay in {tank}."
9. **Costs are split by share of residents** (B9, PROD-015): each day a line pays for its share of each tank's
   residents (a tank shared half and half between two lines charges each half); two lines never pay for the same
   food or power.
10. **A line with a missing parent or tank pauses and is kept** (B10, PROD-017, PERSIST-006): it pauses with one
    notice and stays paused through saves and reloads; `repairState` marks the missing parent or tank instead of
    dropping the line, so the player can fix it (a new pair or tank) or end it. This replaces 0.5 §15's and §20.1's
    "drop lines with dangling ids on load".

## Owner approval

Given by the owner in a Claude Code session on 2026-10-11, in three multiple-choice rounds. The questions are quoted
as asked; each option's label is followed by its description in brackets. The owner added no notes.

Question B1 (verbatim): "B1. Approve DESIGN-S3D SPEC §8.6 (the line picker, several lines per species) and §8.6.1
(the new-line steps) as chunk 4's screens, replacing 0.5 §11.1's single-line UI?" Owner's answer (selected option):
**"Approve (Recommended)"** ("Build the screens in Preview. A strip of line names sits under the Production tab
(\"Cambodian · Royal Blue · …\" plus \"+ New line\" while a slot is free). Each line has its header card, four tiles,
five stages and its own Line rules. \"+ New line\" runs three steps: pick a pair, pick a tank for each stage, then the
rules. A line is named after the morph it breeds for."). Not chosen: "Approve with changes" ("Approve, but with
changes you describe in the notes. They become chunk 4's design.").

Question B2 (verbatim): "B2. The design's timings don't match the game. Betta young are adults 14 days after laying,
so the design's \"juveniles\" listed on day 22 are really adults, and a juvenile listing refuses adults. How should
raising and selling work?" Owner's answer: **"Species data (Recommended)"** ("Each species' own data sets how long
raising takes and what the stages are called (bettas, pea puffers and clownfish differ). The sell step lists each
animal by its life stage when it's sold, so an animal that has grown up sells as an adult. Players see stages that
match the animals in the tank."). Not chosen: "Design's fixed timings" ("Keep the design's fixed numbers (5 days as
fry, then 14 as a juvenile) for every species, and relabel the stages to fit. Simpler, but the words can disagree
with what the animal actually is.").

Question B3 (verbatim): "B3. A line's rules include \"Never sell Prismatic animals\" (Prismatic is the rarest tier).
What should happen when the player switches it off?" Owner's answer: **"Never auto-list (Recommended)"** ("Automation
never lists a Prismatic, whatever the switch says. The switch only decides where the animal goes: on moves it to the
line's keep tank, off leaves it with its batch. To sell a Prismatic, the player lists it by hand. A rare animal can't
be sold by accident."). Not chosen: "Off lets the line sell" ("With the switch off, the line lists Prismatics like any
other young. The switch does what its name says, but a player who switches it off can lose a rare animal to an
automatic sale.").

Question B4 (verbatim): "B4. The design says automation leaves \"protected\" animals alone but never defines them.
What counts as protected, and where do young kept by the line's trait rules go?" Owner's answer: **"Keep tank + rares
+ faves (Recommended)"** ("Protected means every animal in a line's keep tank, every Prismatic and every favourite.
Automation never moves them out, lists them or sells them. Young that the line's trait rules keep go to the keep tank
(the design's \"Keepers\" stage), so they're protected too."). Not chosen: "Kept young stay put" ("Use the same
definition, but young kept by the trait rules stay in the raise tank with their batch instead of moving to the keep
tank. The player moves them by hand.").

Question B5 (verbatim): "B5. The setup steps offer \"Add a quarantine tank · $95\", but $95 isn't a real price and
nothing says what happens without the money or floor space. What should the button do?" Owner's answer: **"Real
price + checks (Recommended)"** ("The button shows the real kit price (tank, gear and substrate, as Build charges
today) and offers seeded filter media. It handles no money and no floor space with today's messages, and checks that
the tank suits the line (water type, temperament, space). The line says when it restarts only once the new tank is
cycled or seeded."). Not chosen: "Drop the button" ("No buying from inside the setup steps. The player picks one of
their existing tanks, and buys a new one in Build first if they need it.").

Question B6 (verbatim): "B6. The design has no way to end a production line, so a used slot could never be freed.
Add one?" Owner's answer: **"End line (Recommended)"** ("\"End line\" on the line's header card, behind a
confirmation. Its animals stay in the tanks they're in, the slot frees up for a new line, and the line's numbers stay
in its history."). Not chosen: "Pause only" ("Lines can be paused but never ended. A used slot stays used, so a player
who wants a different line must wait for the next facility level's extra slot.").

Question B7 (verbatim): "B7. The slot caption under the line strip. The design has \"{used} of {n} line slots ·
{level}\" while a slot is free (\"1 of 2 line slots · Specialty Shop\"), \"{n} of {n} line slots · more at {next
level}\" when every slot is used, and \"8 of 8 line slots · Grand Hall\" at the last level. Added for the case with no
line yet: \"0 of 1 line slot · more at Specialty Shop\". \"slot\" or \"slots\" follows the count. Approve?" Owner's
answer: **"Approve wording (Recommended)"** ("Use these captions as written, with \"slot\" or \"slots\" by count.").
Not chosen: "Different wording" ("Give the wording you'd prefer in the notes.").

Question B8 (verbatim): "B8. The raise tank is full and the player has switched \"Pause when a tank is full\" off.
Where do newly free-swimming fry go?" Owner's answer: **"Stay + one notice (Recommended)"** ("The fry stay where they
are (with the parents) and the line keeps running. It shows one notice: \"{Line}: the raise tank is full, so the fry
stay in {tank}.\" The parents may eat some fry, as they would without a line."). Not chosen: "Line pauses itself"
("The line pauses anyway, as if the switch were on, so the switch only matters for other tanks. Safer for the fry,
but the switch doesn't do what it says.").

Question B9 (verbatim): "B9. A line's \"This week · After food and power\" tile shows profit after costs. Lines can
share tanks with each other, or with animals that aren't in any line. How should a tank's food and power costs be
split?" Owner's answer: **"Share of residents (Recommended)"** ("Each day, a line pays for the share of each tank's
residents that belong to it. A quarantine tank shared half and half between two lines charges each line half. Fair,
and two lines never pay for the same food."). Not chosen: "Whole cost per tank" ("A line pays the full food and power
cost of every tank it uses. Simple, but shared tanks count twice, so lines look less profitable than they are.") and
"Revenue only" ("Drop \"After food and power\" and show only what the line earned that week. No cost maths, but the
tile no longer says whether the line pays for itself.").

Question B10 (verbatim): "B10. A line's parent or tank is gone (sold, moved or reused). Design §11.3 pauses the line
with a notice, but §15 has the save repair drop such lines on load, so a paused line would vanish at the next reload.
Which should win?" Owner's answer: **"Pause and keep (Recommended)"** ("The line pauses with one notice (\"Saffron was
sold\") and stays paused through saves and reloads. The save repair marks the missing parent or tank instead of
dropping the line, so the player can fix it (pick a new pair or tank) or end the line."). Not chosen: "Drop on load"
("The line pauses with a notice, then disappears the next time the save loads, freeing its slot without the player
choosing. Its settings are lost.").

Question (verbatim): "That's all of group B. Go on to group C (approving DESIGN-S3D for chunk 5, deep automation: 15
questions in 4 rounds, with the screens opened for each)?" Owner's answer: **"Go on to group C"** ("Ask group C now.
After each group I record your answers in an ADR and push next."). Not chosen: "Stop here for now" ("I record group B,
push next and start chunk 4 (Production lines). Groups C to E wait for another time.").

## Consequences

- Chunk 4 is unblocked: B1 approves its screens and B2 to B10 are answered. PLAN.md's chunk 4 brief carries these
  decisions.
- "Approved wording" covers only B7's captions and B8's notice. Two examples in the option descriptions are not
  approved copy: B10's "Saffron was sold" (the missing-reference notice; 0.5 §11.3 gives no wording) and B5's
  restart-day line. Chunk 4 asks the owner, batched, for the player-visible text no design or ADR gives (End line's
  confirmation, the missing-reference notice, the quarantine purchase's restart line).
- The 0.5 copy "A Prismatic youngster always moves to {tank} instead." describes the switch on; with it off, a
  Prismatic stays with its batch and is never listed by the line.
- PERSIST-006 changes with decision 10: a line with a dangling parent or tank survives `repairState`, marked, not
  dropped (an absent field still leaves `stateHash` unchanged, AGENTS.md "Saves").
- B-135 is decided (the Prismatic switch and the sell step). INTAKE §11's C-27, C-28, C-29, C-33, C-34 and C-36 are
  answered here; the rest of §11 waits on group C and the DESIGN-S3D approval.
