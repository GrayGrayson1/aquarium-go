# ADR-0033 — Owner answers, chunk 5's review: the copy it found, the salt mixer's day, the Water room warnings

**Status:** Accepted\
**Date:** 2026-10-14\
**Chunk:** 5 (Deep automation, S3-D)\
**Requirements:** AUTO-032, AUTO-035, AUTO-037, MKT-017; DESIGN-S3D §7.6, §8.6, §9.2

## Context

Chunk 5's fresh reviewer (Opus 5.5, max effort) and its confirmation pass raised three things that need the owner:

1. A few lines of player-visible text that neither the design nor ADR-0032 words, where the design shows only its own
   example (four production lines, one named quarantine batch, two betta lines sharing a quarantine tank).
2. The salt mixer's day. SPEC §9.2 fixes a batch at 30 gal and 4.1 kg; a batch takes 12 h and the mixing tank must be
   empty, so the Water room makes at most 60 gal of salt water a day, and the Reservoir upgrade didn't raise that. A big
   marine facility whose Auto Water Changers need more has its last tanks' changes skipped every morning. Before chunk 5
   those changes used shelf salt with no limit.
3. Nothing warned when a Water room can't make as much water a day as the tanks use: the jobs it couldn't cover were
   skipped quietly (only the log's summary line said so), against SPEC §3 ("surfaces a shortage instead of silently
   skipping").

The agent asked in three AskUserQuestion rounds (one question, then two, then two). The reviewer's second
confirmation pass found that a day's totals hid most real shortfalls (the 60 % rule and the fresh reserve's size), so
the warnings now come from a dry run of the room's next week, and round 3 corrected round 2's "up to 240 gal a day".

## Decisions

1. **The copy, as drafted.**
   - Livestock › Production's link row with one line: "Status, bottlenecks and routes for your line are in Operations ›
     Lines." (two or more: the design's "…for all {n} lines…").
   - Problems › a paused line, the quarantine step while it's busy: "{Line} until Day {d}" (the design's "Cambodian batch
     7 until Day 44" names a batch; batches have no names in the game).
   - "Why the line stops" beyond the design's "serves both betta lines": one line "serves the {Line}"; two lines of
     different species "serves both lines"; three or more "serves {n} lines"; and "(one clutch starts 1 day late; no
     animals are lost)".
2. **Batches grow with the reservoir.** A batch is half the salt reserve: 30 gal and 4.1 kg at the base room (the
   design's numbers), then 60, 90 and 120 gal with each Reservoir upgrade, salt mix in proportion. **The design's 60 %
   rule stays** (round 3): a batch starts only while salt water is under 60 % of the reserve, so with the morning's
   changes the mixer sustains about 33 gal a day at the base room and 67, 102 and 118 with one, two and three
   Reservoirs, not the two batches a day (up to 240 gal) round 2's option described.
3. **Two warnings in Problems and the alerts drawer**, Look soon, shown only while a day's use is more than the room
   makes:
   - "Salt water runs short" · "The salt tanks' changes use {u} gal of salt water a day, and the mixer makes up to {m}.
     The changes it can't cover are skipped, not done weak." · action "Reservoirs in Build".
   - "Fresh water runs short" · "The tanks use {u} gal of fresh water a day, and the prep station makes {m}. What it
     can't cover waits: changes are skipped, not done weak." · action "Faster prep in Build" (ADR-0026's label). When the
     fresh reserve's size is the limit (round 3): "The tanks' changes take {u} gal of fresh water at lights-on, and the
     fresh reserve holds {cap}. What it can't cover waits: changes are skipped, not done weak." · "Reservoirs in Build".
   - With every upgrade that would help already bought, the action is "Water tab".
   - They show when the room's next week, dry-run with the jobs' rules, skips changes for want of that water after its
     first two days (a new room starts with no salt water); {m} is what the mixer really makes. Not while water changes
     are held.

## Owner approval

Given by the owner in a Claude Code session on 2026-10-14. The questions are quoted as asked; each option's label is
followed by its description in brackets. The owner added no notes.

Round 1. Question (verbatim): "The chunk 5 reviewer found a few lines of text that neither the design nor ADR-0032
words. In each case the design shows only its own example: four lines, one named batch, two betta lines sharing a
quarantine tank. Approve these drafts?" Owner's answer (selected option): **"Approve as drafted (Recommended)"** ("Use
the strings in the preview: the Production tab's link row with a single line, a busy quarantine tank named by the line
using it, and the 'Why the line stops' wording for cases other than two betta lines."; the preview showed the strings
in decision 1). Not chosen: "Change some" ("Say in the notes which strings to change and how.").

Round 2, question 1 (verbatim): "The Salt Mixing Station makes one 30 gal batch at a time (12 h each), so at most 60
gal of salt water a day, and the Reservoir upgrade doesn't raise that. A big marine facility whose Auto Water Changers
need more has its last tanks' changes skipped every morning, with no warning. Before chunk 5 those changes used shelf
salt with no limit. What should happen?" Owner's answer: **"Batches grow (Recommended)"** ("A batch is half the salt
reserve: 30 gal at the base room (the design's 30 gal / 4.1 kg), then 60, 90 and 120 gal with each Reservoir upgrade,
salt mix in proportion. Up to 240 gal a day. Problems warns when the tanks need more than that (next question).").
Not chosen: "Keep 30 gal, warn only" ("The design's numbers stay: 60 gal of salt water a day at most. Problems warns
when the tanks need more, and the player turns changers down or moves tanks to fresh water."); "Add a mixer upgrade"
("Keep 30 gal batches and add a new Build › Facility item, a second mixing tank (doubles the rate). Needs a price, copy
and a test pass; more work this chunk.").

Round 2, question 2 (verbatim): "When a Water room can't make as much water a day as the tanks use, its jobs are
skipped quietly (only the log's summary line says so). Add these warnings to Problems and the alerts drawer?" Owner's
answer: **"Approve as drafted (Recommended)"** ("Two Look-soon items, worded as in the preview. They appear only while a
day's use is more than the room can make."; the preview showed the strings in decision 3). Not chosen: "No warnings"
("Leave it as the log line; record it as a known limitation."); "Change some" ("Say in the notes what to change.").

Round 3, question 1 (verbatim): "A correction to my last question: growing batches don't reach 'up to 240 gal a
day'. The mixer only starts a batch while the salt reserve is under 60% (the design's rule), and tanks change in the
morning, so it really sustains about 33 gal a day at the base room, then 67, 102 and 118 with one, two and three
Reservoirs. The warnings now show the real figure. Keep the design's 60% rule?" Owner's answer: **"Keep the 60% rule
(Recommended)"** ("The design's rule stays (SPEC §9.2). 'Salt water runs short' names what the mixer really makes, and
Reservoirs raise it (about 33 → 118 gal a day). No other change."). Not chosen: "Mix whenever there's room" ("Each 10 AM
and 10 PM check starts a batch whenever the reserve and the mixing tank have room for it, so two batches a day are
reachable: 60, 120, 180, 240 gal a day. Changes the design's §9.2 rule; the stock manager buys salt a little more
often.").

Round 3, question 2 (verbatim): "'Fresh water runs short' has a second cause: the morning changes all draw at
lights-on, and the fresh reserve can hold less than they need even when the prep station makes enough per day. Approve
this wording for that case? When no upgrade is left to buy, the action becomes 'Water tab' (an existing label)."
Owner's answer: **"Approve as drafted (Recommended)"** ("Use the reserve-size wording in the preview, with the
'Reservoirs in Build' action (already approved)."). Not chosen: "Change some" ("Say in the notes what to change.").

## Consequences

- `WATER_ROOM.batchShare` (0.5) sizes a batch from the salt reserve (`batchGal`, `mixerPerDay` in
  `src/sim/automation/reserve.ts`); SPEC §9.2's fixed 30 gal holds for the base room only.
- Problems gains the supplies `salt_rate` and `fresh_rate` (`src/sim/automation/problems.ts`), from the Water room's
  dry run (`src/sim/automation/forecast.ts`, `waterRoomRun`, which also gives Today its batches); the issue views word
  them (`src/ui/panels/operations/issues.ts`). The fresh warning gives way to "Fresh water ran out" while the reserve is
  empty.
- The strings in decision 1 ship as built in `Problems.tsx` and `Production.tsx`.
