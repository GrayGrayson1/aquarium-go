# ADR-0031 — Owner answers, chunk 4 review: four more lines of production copy

**Status:** Accepted\
**Date:** 2026-10-14\
**Chunk:** 4 (Production lines)\
**Requirements:** PROD-003, PROD-007, PROD-021, DES-008; BACKLOG B-174

## Context

Chunk 4's fresh reviewer found eight blockers (PLAN.md chunk 4). Their fixes put four player-visible texts on screen
that no design or ADR words: set-up now refuses a tank that is another line's keep tank (or the reverse); a batch now
waits, and says so, while the line's quarantine tank isn't cycled (it used to stall silently); a whole-tank listing's
note about animals added after listing had become wrong after ADR-0030 decision 8; and the route strip (DESIGN-S3D
§7.4, §12) needs a word on a chip whose tank is gone (§13: never colour or an icon alone). The agent asked the owner
once, in one AskUserQuestion round, after building the fixes with the recommended wording.

## Decisions

1. **A keep tank another line uses** (set-up step 2's "Doesn't fit" reason, following ADR-0030 decision 5's "Already
   the {stage} tank"): "Already {Line}'s keepers tank" · "Already {Line}'s {stage} tank" (breed, raise, quarantine).
2. **A quarantine tank that isn't cycled**: the one-time notice "{Line}: {tank} isn't cycled yet, so the juveniles
   wait in {raise tank}." (the batch's own word for its young: "juveniles", or the species' plural once grown); the
   Quarantine tile's hint "{tank} isn't cycled yet"; the route strip's tag "isn't cycled yet".
3. **A whole-tank listing with animals added after listing**: "{names} is/are in "{tank}" but not part of its listing —
   if it sells, they move to a tank with room, or rest in a holding container." (was "…they'll be moved to another tank
   if it sells.").
4. **A route strip chip whose tank is gone**: the tag "Paused", the line's own status word; the note above explains
   which tank.

## Owner approval

Given by the owner in a Claude Code session on 2026-10-14, in one multiple-choice round. The questions are quoted as
asked; each option's label is followed by its description in brackets. The owner added no notes.

Question 1 (verbatim): "Setting up a line now refuses a tank that's another line's keep tank (its animals are
protected, so a batch put there could never be listed), or the reverse. What should the \"Doesn't fit\" reason under the
tank say?" Owner's answer (selected option): **"\"Already {Line}'s keepers tank\" (Recommended)"** ("Follows your
approved \"Already the {stage} tank\" (ADR-0030 decision 5). Examples: \"Already Betta line's keepers tank\", \"Already
Royal Blue line's raise tank\". This is what's built now."). Not chosen: "\"Keeps {Line}'s animals\"" ("Says why rather
than what. Only covers the keep-tank side; the reverse case would also read \"{Line}'s raise tank\"."); "\"Used by
{Line}\"" ("Shortest. Doesn't say which stage, or why sharing isn't allowed here when other tanks can be shared.").

Question 2 (verbatim): "A batch now waits when the line's quarantine tank isn't cycled (instead of stalling silently).
What should the one-time notice say? (The Quarantine tile would show \"{tank} isn't cycled yet\".)" Owner's answer:
**"\"{Line}: {tank} isn't cycled yet, so the juveniles wait in {raise tank}.\" (Recommended)"** ("Reuses the game's
existing \"{tank} isn't cycled yet\" from Move to nursery, in the same pattern as your approved \"{Line}: {keep tank} is
full, so {name} stays in {tank}.\" Built now."). Not chosen: "\"{Line} is waiting for {tank} to cycle.\"" ("Shorter.
Doesn't say where the young are waiting."); "No notice, only the tile" ("Quieter. The line's tile and route strip still
show it, but the Alerts drawer gets nothing.").

Question 3 (verbatim): "A whole-tank listing's note about animals added after listing still says \"they'll be moved to
another tank if it sells\". Since your ADR-0030 decision 8, they may rest in the holding container instead. Change it?"
Owner's answer: **"\"…but not part of its listing — if it sells, they move to a tank with room, or rest in a holding
container.\" (Recommended)"** ("Accurate under decision 8 and uses E9's \"holding container\" wording. Full line:
\"{names} is/are in \"{tank}\" but not part of its listing — if it sells, …\""). Not chosen: "Keep today's text"
("\"…they'll be moved to another tank if it sells.\" Short, but wrong when no tank has room.").

Question 4 (verbatim): "On a line's route strip (breed tank › grow-out › quarantine › Market), a chip whose tank is gone
(sold or deleted) is amber with a warning icon. Your design wants a word with every problem chip. Which word?" Owner's
answer: **"\"Paused\" (Recommended)"** ("The line's own status word, already approved. The note above the strip
explains: \"{Line} paused: {tank} is gone. Choose another tank, or end the line.\" Built now."). Not chosen: "\"Gone\""
("Names the problem directly; it's a new word on that screen."); "\"Missing\"" ("Same idea as \"Gone\", softer.").

## Consequences

- The wording is in `src/sim/production/index.ts` (decisions 1 and 2), `src/ui/panels/livestock/Production.tsx`
  (decisions 2 and 4) and `src/sim/economy/listings.ts` (decision 3), with tests in `production-line` and
  `production-ui`.
- "Cycled" for a quarantine tank is the game's own line for a tank with animals (bioMaturity 0.4, where the water
  report says "Tank is still cycling" and buying animals warns "This tank is not cycled yet"), set after the reviewer's
  confirmation pass; decision 2's notice is what the player sees while a tank is below it.
