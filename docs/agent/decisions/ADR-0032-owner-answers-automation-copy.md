# ADR-0032 — Owner answers, chunk 5: the deep-automation copy the design leaves unworded

**Status:** Accepted\
**Date:** 2026-10-14\
**Chunk:** 5 (Deep automation, S3-D)\
**Requirements:** AUTO-033, AUTO-034, AUTO-035, AUTO-041, AUTO-043, AUTO-044, AUTO-045, AUTO-046, MKT-017, DES-013;
INTAKE C-48, C-66

## Context

DESIGN-S3D words salt and the production lines, the Operations screens and much of what's around them; ADR-0026's
table words the states the intake found unworded. Building chunk 5 needed more player-visible text: shortages of the
other supplies (brine shrimp eggs, vegetables for the jars, live food for the dosers), the quiet log lines the intake
asked for (C-66), purchase toasts and receipts, the live-food doser (placed from the tank card, ADR-0026 decision 8),
chip words, tile statuses and the room pages' small labels. The design's stock-manager lines also say "her", which
reads wrong for most of the name pool. ADR-0026 decision 9 says such text "follows the same style and goes to the owner
in one batch": the agent asked once, in one AskUserQuestion round of four questions, with two screenshots of the
built Operations screens open in Preview, after building with the drafts.

## Decisions

1. **Shortages** (Problems, the alerts drawer, Supplies), as drafted:
   - Eggs, low: "Brine shrimp eggs are low" · "{n} scoops: a cone takes one a day." Out: "Out of brine shrimp eggs" ·
     "The hatchery cones wait for eggs."
   - Vegetables, low: "Vegetables for the jars are low" · "{n} servings: a jar takes one every 3 days." Out: "Out of
     vegetables for the jars" · "The infusoria jars wait for Blanched Vegetables."
   - Live food for the dosers: "No live food for the dosers" (nothing growing) or "Live food is short for the dosers" (a
     culture is growing) · "{Tank} has young to feed and none of their food in stock."
   - Salt with two or more batches left: "{kg} kg: enough for {n} batches." Out because the till is empty: "{Name}
     couldn't reorder salt mix: there isn't enough cash right now." The Problems timeline: "Day {d} · The salt tanks'
     water changes are skipped, not done weak, unless salt arrives (they use about {gal} gal a day)." Supplies without a
     stock manager: "{kg} kg · no one reorders it".
2. **The log, toasts and receipts**, as drafted: one quiet line per job run (not toasted, not news; C-66) — "Morning
   water changes · {n} tanks · {gal} gal" (+ " · {k} skipped"; "Water changes" after noon), "Salt mixing · {gal} gal batch
   · used {kg} kg · ready {time}", "Cone {i} harvested · {n} servings of Live Baby Brine Shrimp", "Jar {i} harvested ·
   {n} servings of Infusoria Culture"; Finances "Running costs — Water room and Live food room"; toasts "Bought · $18" /
   "A tin of brine shrimp eggs" / "{n} scoops in stock." and "Installed" / "Live-food doser on {tank}"; upgrade receipts
   "The Water Prep Station now makes {n} gal an hour (${price})." · "Reservoirs now hold {f} gal of fresh water and {s}
   gal of salt water (${price})." · "Added a hatchery cone (${price})." · "Added an infusoria jar (${price})."; the
   Operations Desk's completion "Research complete: Operations Desk! Problems first, weekly money, Today and Hold all
   are in Operations."
3. **The stock manager's lines carry no pronoun.** The design's "at her next check", "within her budget", "she buys it
   at her {time} check" and "covers food and her {kg} kg order" become "at the next check", "within the budget", "{Name}
   buys it at the {time} check" and "covers food and the {kg} kg order". Today's new details: "Buys {a} and {b}" ·
   "Nothing to reorder" · "Reorders what runs low".
4. **Labels**, as drafted: the live-food doser on the tank card ("Live-food doser" · "Feeds fry and larvae baby brine
   shrimp or infusoria from the Live food room, three times a day." · Buy · $45 · "Feeding {n} young · three times a
   day" · "Idle until the next clutch hatches" · "Held by manual mode — no doses until you resume.") and in the shop
   ("Feeds fry and larvae live food from your Live food room's stock — baby brine shrimp or infusoria, whichever their
   stage needs, three times a day. It does nothing while the tank has no young to feed."); chips "Auto-feed off" ·
   "Auto-clean paused" · "Top-off off" · "Live-food doser held" · "{Line} · Held"; tiles: Water changes "Due" / "Off",
   Feeding "By hand", Water room "Fresh {f}% · salt not needed"; Feed: "Empty · needs eggs" · "Full · waits for room" ·
   "{n} of {cap} servings in stock" · "No dosers yet: add one from a tank card's Equipment."; Build: "Cultures, stock
   and the dosers are in Operations › Feed." · "Placed from a tank card's Equipment" · "Fastest" · "No more space";
   the tier ladder "{Level} · move up in Build › Facility" · "{Project}: researched"; the Map "+{n} more" · "In the
   Tanks panel".

## Owner approval

Given by the owner in a Claude Code session on 2026-10-14, in one multiple-choice round. The questions are quoted as
asked; each option's label is followed by its description in brackets, and the recommended option's preview (the
strings above) was shown beside it. The owner added no notes.

Question 1 (verbatim): "Problems and the alerts drawer need words for shortages the design doesn't draw (it words only
salt). Two screenshots of chunk 5's Operations are open in Preview. Approve these drafts?" Owner's answer (selected
option): **"Approve as drafted (Recommended)"** ("Use the strings in the preview for eggs, vegetables, live food for the
dosers, and the extra salt cases (two or more batches left, out because the till is empty, the Problems timeline, the
Supplies line without a stock manager)."). Not chosen: "Change some" ("Say in the notes which strings to change and
how.").

Question 2 (verbatim): "The event log gets one quiet summary line per job run (intake C-66: not toasted, not counted as
news), and purchases need toasts and receipts. Approve these drafts?" Owner's answer: **"Approve as drafted
(Recommended)"** ("Use the log lines, the Finances memo, the toasts and the upgrade messages in the preview."). Not
chosen: "Change some" ("Say in the notes which strings to change and how.").

Question 3 (verbatim): "The design's stock-manager lines say \"her\" because its sample manager is Rosa, but a stock
manager can be anyone from the name pool, including men's names. I wrote those lines without pronouns. Which should
ship?" Owner's answer: **"Pronoun-free (Recommended)"** ("Name the manager and drop \"her\"/\"she\", so the lines read
right for every hire. Also approves the Today details at the bottom of the preview."). Not chosen: "Keep \"her\" as
drawn" ("Ship the design's words. They read wrong whenever the stock manager has a man's name.").

Question 4 (verbatim): "Smaller labels the screens need that the design leaves out: the live-food doser (placed from the
tank card, ADR-0026 decision 8), chip words, tile statuses, the Feed tab and the room pages. Approve?" Owner's answer:
**"Approve as drafted (Recommended)"** ("Use the labels in the preview."). Not chosen: "Change some" ("Say in the notes
which labels to change and how.").

## Consequences

- The strings ship as built in chunk 5 (`src/ui/panels/operations/issues.ts`, `src/sim/automation`, the tank card, the
  Feed tab, Build › Facility, Supplies, Visitors › Staff); the code's "draft" markers point here.
- DESIGN-S3D's "her" lines are superseded by decision 3 wherever they name the stock manager.
