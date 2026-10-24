# ADR-0051 — Owner answers, chunk 15: the scenario lab on this Mac, solo; everything the game has, unlocked; presets, files and links; opens paused

**Status:** Accepted\
**Date:** 2026-10-23\
**Chunk:** 15 (the scenario lab; SESSION_HANDOFF.md "Handoff to Chase: chunk 15")\
**Requirements:** LAB-001 to LAB-008 (chunk 15's brief, PLAN.md)

## Context

The owner asked for it (verbatim, 2026-10-23, to Marshall): "What would it take to have Chase in CNVS Canvas, the app
that we're currently working on, Build some dev tools in order to make what I want. If I want to make a specific kind
of aquarium or setup, I would be able to just do that without having to play through the game, just to test certain
scenarios. If that's something that we can one-shot, go ahead and do the required research. It needs to be successful
and then give Chase in CNVS the prompt to build it all out and all the information that possibly needs to be
successful." Marshall's handoff (`SESSION_HANDOFF.md`, commit `117aca9`) listed what exists (the dev commands, the
scene kit in `src/dev/fixtures/core-helpers.ts`, 46 fixtures, the dev panel, `__AQ`), the gate to keep (ADR-0037
decision 3: the live site ignores `?dev=1`; where the tools are allowed, Social is the local stub) and the questions to
ask first. Chase asked them in one AskUserQuestion round before building.

## The questions as asked, and the answers (one AskUserQuestion round)

1. **"Where do you want to use the scenario lab?"** (Where)
   - Chosen: **"This Mac, solo (Recommended)"**: "Start it with one command (npm run lab) or by asking Chase in CNVS; it
     opens in your browser at 127.0.0.1. No new service; the live sites, Supabase and the shop server are untouched.
     Solo games only: a shared shop runs on the server, so seeding one from a scenario would be a later chunk." Its
     preview, verbatim:

     ```
     Terminal, or ask Chase in CNVS:
       $ npm run lab
       → opens http://127.0.0.1:5173/?lab=1

     ┌ Scenario lab ─────────────────────────────┐
     │ Start from [Blank shop ▾]   Seed [1234]    │
     │ Shop  $50,000 · Day 12, 9 AM · Store ▾     │
     │ Tanks                                      │
     │  ▸ 40 gal Reef ·· 2 clownfish (1 Prismatic)│
     │  ▸ 20 gal Planted ·· betta pair            │
     │  [+ Tank]                                  │
     │ Presets [Ammonia crisis ▾] Save  Load      │
     │ Copy JSON · Import file · Export file      │
     │              [ Build and play ]            │
     └────────────────────────────────────────────┘
     ```
   - Not chosen: "This Mac, plus shared shops" ("The same, and a scenario can also open as a shared shop on the local
     stub server (two browser windows on this Mac). Noticeably bigger; I'd do it as part 2 of this chunk."); "A private
     lab site on Render" ("A new Render static site built with the dev tools on and Social on the local stub, so you
     can open the lab from any device. A new remote service and a reversal of part of ADR-0037 (the live site never has
     the dev tools). Render static sites have no password: anyone with the address could open it. Never touches
     Supabase or the shop server.").

2. **"What must the lab set up in the first version? (pick all you want)"** (Set up; several allowed)
   - Chosen: all four: **"Tanks, water, gear, decor"** ("Any tank size and water type, exact water values (ammonia, pH,
     temperature, salt…), equipment, substrate, decor (or automatic), lights."), **"Animals in detail"** ("Species,
     count, sex, age, name, genes or morph, Prismatic, health, hunger, stress, illness."), **"The shop around it"**
     ("Money, day and hour, speed, facility level, unlocks and research, reputation, the guide finished, staff, shows,
     the market (offers, listings, bids).") and **"Breeding and problems"** ("Pairs ready to spawn, eggs and fry, water
     crises, sick or starving animals, broken equipment.").
   - And the owner's own words with it, verbatim: **"what else can we have here that would be useful?"**

3. **"How should scenarios be kept and opened?"** (Saving)
   - Chosen: **"All three, opens paused (Recommended)"**: "Named presets kept in this browser, a JSON file to export
     and import (and copy and paste for agents), and a link (?scenario=name). A built scenario opens paused so you can
     look first, and never autosaves over your own game." Its preview, verbatim:

     ```
     Presets  [Ammonia crisis ▾]  Save  Save as…  Delete
     JSON     Copy · Paste · Import file · Export file
     Link     http://127.0.0.1:5173/?scenario=ammonia-crisis

     Build and play → the game, paused at 0×
       "Scenario: Ammonia crisis · not saved"
     ```
   - Not chosen: "All three, opens running" ("The same, but the clock runs at 1× as soon as it's built."); "Presets and
     files only" ("No links; opens paused.").

4. **"Which ready-made presets do you want to start from? (pick all you want)"** (Presets; several allowed)
   - Chosen: all four: **"Problems"** ("An ammonia crisis; a broke shop with hungry fish; a crowded, aggressive tank; a
     heater stuck on."), **"Breeding"** ("A breeding-ready betta pair; a clownfish pair with eggs; a tank of fry."),
     **"Showpieces"** ("A reef with a Prismatic clownfish; a late-game grand hall.") and **"Running a business"** ("A
     staffed store; show day; a market with bids waiting.").
   - And the owner's own words with it, verbatim: **"definitely want access to basically what the game has to offer
     but it's an unlocked dev version sandbox that we can set any scenario up in"**

## Decisions

1. **Where:** on the owner's Mac, solo. `npm run lab` starts the dev server and opens the lab; an agent in CNVS can do
   the same, or build a recipe headlessly (`scripts/scenario.ts`). No new service; ADR-0037 decision 3 is unchanged
   (the live site ignores `?dev=1`, `?lab=` and `?scenario=`); where the tools are allowed, Social stays the local stub
   (never `VITE_SOCIAL_ONLINE_IN_DEV` for the lab). Shared shops are out of scope (a later chunk, if wanted).
2. **Scope: everything the game has, unlocked** (answers 2 and 4). A recipe sets the tanks (every tier and water class,
   water values, equipment and its failures, substrate, decor or automatic decor, lights, purpose), the animals
   (species, count, sex, age, name, genes, Prismatic, condition, illness, injury, breeding readiness), eggs and fry,
   and the shop (money and debt, day and hour, speed, facility, unlocks, research, reputation and mastery, the guide,
   inventory, staff, shows, the market's offers, listings and bids, production lines, the Water and Live food rooms).
   A blank shop starts unlocked and finished with its guide, as a sandbox. What the recipe has no field for, its
   `patch` reaches (a deep merge into the built game, then checked by the save path).
3. **Keeping and opening** (answer 3): named presets in this browser (save, save as, duplicate, delete), the recipe as
   JSON (copy, paste, import and export a file), and a link (`?scenario=<preset or built-in>`). A built scenario opens
   paused, shows that it's a scenario, and never autosaves over the owner's own game.
4. **Presets** (answer 4): the four groups, built in: Problems (ammonia crisis, broke shop with hungry fish, crowded and
   aggressive tank, heater stuck on), Breeding (betta pair ready, clownfish pair with eggs, tank of fry), Showpieces
   (reef with a Prismatic clownfish, late-game grand hall), Running a business (staffed store, show day, market with
   bids).
5. **"What else would be useful?"** (the owner's question in answer 2; the agent's answer, built in this chunk):
   *Start again* (rebuild the scenario from its start in one click, from the game); *capture* (turn the game on screen
   into a recipe to edit and keep); *the 46 fixtures* as starting points; *checks* (a recipe can say what should be
   true after N hours, and the headless script reports pass or fail, so an agent or a test can use a scenario as a
   test); *a warm-up* (run the built world forward N hours before it opens, so tanks look lived-in); *warnings while
   editing* (unknown names, a tank too small, and the game's own compatibility verdict for each tank, shown but never
   refused, since bad setups are what the owner wants to test).
