# ADR-0052 — Owner answers, chunk 16: 31 new species (a friend's reef, the maroon clownfish, reef and freshwater favourites); real colour forms, young and sex colours; buyable from the start

**Status:** Accepted\
**Date:** 2026-10-24\
**Chunk:** 16 (new species; SESSION_HANDOFF.md "Handoff: chunk 16, 31 new species")\
**Requirements:** SPC-001 to SPC-010 (chunk 16's brief, PLAN.md)

## Context

The owner shared a friend's 210-gallon reef (a photo and a stock list; neither is kept in this public repo) and asked,
verbatim (2026-10-24): "how much of this do we have? can you create me a 210 (or closest) tank with these animals and
the style of the tank decorations?" Chase built it in the scenario lab (chunk 15) with stand-ins and reported what the
game lacks. The owner then asked, verbatim: "did we have anything missing as far as species/creatures/fish? where is the
emporor for example", and then: "add all 12 missing species as the next chunk and what other species should we be
adding? how will this work for variations? do we need to give this to a new agent or compact this convo?"

The friend's stock, as listed: 5 anthias, 5 green chromis, 2 "crimson" clowns, 1 melanurus wrasse, 1 bubble-tip
anemone, a chocolate tang, a sailfin tang, an emperor angelfish, an elegant starfish, a fighting conch, 10 Mexican turbo
snails, 20 Nassarius snails, 3 Astraea snails, 4 Cerith snails, 2 blue hermit crabs, 1 scarlet hermit crab, a foxface
rabbitfish. The game had the green chromis, the foxface, the blue-leg hermit and the ocellaris (orange only); the
bubble-tip anemone only as decor. The 12 missing: emperor angelfish, chocolate tang, sailfin tang, lyretail anthias,
melanurus wrasse, elegant starfish, fighting conch, Mexican turbo snail, Nassarius snail, Astraea snail, Cerith snail,
scarlet hermit crab.

Chase's suggestions before the questions (the gaps by hobby popularity): reef: maroon clownfish, flame angel, six-line
wrasse, lawnmower blenny, flame hawkfish, yellowtail damsel, emerald crab, tuxedo urchin, sand-sifting starfish, a
living bubble-tip anemone; freshwater: freshwater angelfish, German blue ram, harlequin rasbora, zebra danio, platy,
swordtail, dwarf gourami, ghost shrimp, ramshorn snail. And how variation works today (genes making named colour forms,
the "Richly coloured" grade, heritable potentials, small individual differences, Prismatic on every species; young fish
drawn with young proportions but adult colours).

## The questions as asked, and the answers (one AskUserQuestion round)

The friend's name in the first question is replaced by "[a friend]" here.

1. **"[a friend]'s \"crimson clowns\": the game only has the ocellaris, with no red ones. Should chunk 16 also add the
   Maroon Clownfish (deep red; White Stripe, Gold Stripe and Lightning forms) as a 13th species?"** (Crimson)
   - Chosen: **"Add the maroon (Recommended)"**: "A 13th species with its real forms. [a friend]'s clowns become
     maroons in the scenario."
   - Not chosen: "Keep them as ocellaris" ("Orange Ocellaris stand in, as now; 12 species.").
2. **"Should chunk 16 add any species beyond [a friend]'s?"** (Extras)
   - Chosen: **"Reef and freshwater extras"**: "About 18 more; really two chunks' worth in one." Its preview,
     verbatim:

     ```
     + the reef extras, and
     + freshwater angelfish, German blue ram,
       harlequin rasbora, zebra danio, platy,
       swordtail, dwarf gourami, ghost shrimp,
       ramshorn snail
     ```
     The reef extras' preview: "+ flame angel, six-line wrasse, lawnmower blenny, flame hawkfish, yellowtail damsel,
     emerald crab, tuxedo urchin, sand-sifting star, living bubble-tip anemone".
   - Not chosen: "[a friend]'s only; extras next (Recommended)" ("Keeps chunk 16 to 12 or 13 species; the extras become
     chunk 17, after you've seen these."); "Add the reef extras too" ("About 9 more marine species in the same chunk;
     much bigger, longer to build and test.").
3. **"Some of these look completely different when young or by sex: the emperor angel (blue with white rings when
   young), the chocolate tang (copies a yellow angelfish when young), and anthias and melanurus wrasse (males and
   females differ, and they change sex). Build those looks?"** (Looks)
   - Chosen: **"Yes, young and sex colours (Recommended)"**: "Young fish get their young colours and change as they
     grow; males and females look different where they do in the wild."
   - Not chosen: "Adult colours only" ("Simpler; every age looks like the adult.").
4. **"Where should the new species sit in the game's progression?"** (Unlocks)
   - Chosen: **"All from the start"**: "Every new species can be bought straight away."
   - Not chosen: "Like the real hobby (Recommended)" ("Clean-up crew in Beginner marine; anthias and wrasse in Reef;
     sailfin, chocolate tang and emperor in Large marine; the starfish in Advanced marine (hard to keep).").

## Decisions

1. **Chunk 16 adds 31 species (48 → 79)**, all in one chunk (answer 2), built in three waves so each lands tested:
   - *Wave A, the friend's reef (13):* emperor angelfish (*Pomacanthus imperator*), sailfin tang (*Zebrasoma
     veliferum*), chocolate tang (*Acanthurus pyroferus*), lyretail anthias (*Pseudanthias squamipinnis*), melanurus
     wrasse (*Halichoeres melanurus*), elegant starfish (*Fromia* sp.), fighting conch (*Strombus alatus*), Mexican
     turbo snail (*Turbo fluctuosus*), Nassarius snail (*Nassarius* sp.), Astraea snail (*Lithopoma tectum*), Cerith
     snail (*Cerithium* sp.), scarlet reef hermit crab (*Paguristes cadenati*), maroon clownfish (*Premnas
     biaculeatus*, answer 1).
   - *Wave B, reef favourites (9):* flame angelfish (*Centropyge loricula*), six-line wrasse (*Pseudocheilinus
     hexataenia*), lawnmower blenny (*Salarias fasciatus*), flame hawkfish (*Neocirrhitus armatus*), yellowtail
     damselfish (*Chrysiptera parasema*), emerald crab (*Mithraculus sculptus*), tuxedo urchin (*Mespilia globulus*),
     sand-sifting starfish (*Astropecten polyacanthus*), bubble-tip anemone as a living animal (*Entacmaea
     quadricolor*; the existing decor piece stays, so saves keep it).
   - *Wave C, freshwater favourites (9):* freshwater angelfish (*Pterophyllum scalare*), German blue ram
     (*Mikrogeophagus ramirezi*), harlequin rasbora (*Trigonostigma heteromorpha*), zebra danio (*Danio rerio*), platy
     (*Xiphophorus maculatus*), swordtail (*Xiphophorus hellerii*), dwarf gourami (*Trichogaster lalius*), ghost shrimp
     (*Palaemonetes paludosus*), ramshorn snail (*Planorbella* sp.).
   The names are checked against the research sources while building; a correction goes in the chunk's notes.
2. **Variations use the game's existing system, with real-world colour forms only** (Chase's explanation before the
   questions): genes and named forms where the hobby has them (e.g. the maroon's White Stripe, Gold Stripe and
   Lightning; the freshwater angelfish's marble, zebra, gold and veil; platy and swordtail colours; the ram's gold and
   electric blue; the dwarf gourami's powder blue and flame; ramshorn red and blue), the "Richly coloured" grade
   where it has none (the snails, the hermit, most of the reef fish), heritable potentials, individual variation, and
   Prismatic on every species. No invented forms; no GloFish (a trademarked, genetically modified line).
3. **Young and sex colours** (answer 3): the art draws a species' young colours where the wild young differ (the
   emperor's blue and white rings, the chocolate tang's yellow mimic phase, and any others the research finds) and
   changes them as the animal grows; males and females look different where they do in the wild (anthias, melanurus
   wrasse, ram, dwarf gourami, platy and swordtail, the maroon's larger female). Anthias and the melanurus wrasse
   change sex female to male (`protogynous`, as the game already does for the coral beauty).
4. **Every new species is buyable from the start** (answer 4): no unlock key on the species (`unlock.requires` empty).
   The tanks, water and gear a species needs keep their own unlocks (the answer was about the species), so the shop's
   existing warnings still tell a player when a tank can't hold one. Existing species are unchanged.
5. **Saves:** adding species bumps `SCHEMA_VERSION` (ADR-0016; 2 → 3) with its migration, and
   `core-save-forward-safety` pins the new ids. Old saves load; a save from the new build is refused by an old one as
   too new (PERSIST-014).
6. **The friend's reef in the lab:** a built-in lab preset ("A friend's reef"), the 180-gallon tank (the closest to a
   210, which shares its 72 × 24 in footprint) with the friend's real stock once wave A lands, and the rock ridge,
   arch, anemone, red macroalgae and three reef lights of the stand-in recipe kept in
   `docs/agent/design/CHUNK-16/friends-reef-standins.json`.
7. **Release:** new species are something players see, so the chunk ends in a release (0.8.0) only with the owner's
   go-ahead in the session (AGENTS.md). Until then it stays on `next`.
8. **Process** (the owner asked "do we need to give this to a new agent or compact this convo?"): Chase wrote this
   record, chunk 16's brief and the handoff and pushed `next`; the chunk starts in a fresh context (the owner's
   `/compact`, or a new agent), reading the docs first.

## Round 2 (2026-10-24, during wave A): stocking what the player can keep

**Why it was asked.** Building wave A showed a side effect of decision 4: with every new species available from day
one, a freshwater starter's first shop had 1–5 of its 6 random slots filled with marine animals they could not keep
yet (marine tanks still need the Marine Systems research), and after all 31 species about 40% of such a shop would be
marine; a clownfish starter could be offered an emperor angel (220 gallons) on day one. A probe over three seeds for
each starter is the evidence.

**The question as asked:** "You chose every new species buyable from the start. Testing shows a side effect: a
freshwater starter's first shop now has 1–5 of its 6 random slots filled with marine animals they can't keep yet
(marine tanks still need Marine Systems research), and after all 31 species about 40% of their shop would be marine.
A clownfish starter can be offered an emperor angel (needs 220 gal) on day one. How should the shop stock the new
species?" (Day-one shop)
- Chosen: **"Stock what you can keep (Recommended)"**: "No research needed for any new species, but the shop only
  stocks one once you have its water type: freshwater ones for everyone, marine ones once Marine Systems is researched,
  reef-only ones once Reef Systems is. Big fish still show their tank-size warning." Its preview, verbatim:

  ```
  Betta starter, day 1 shop:
    betta, guppy, honey gourami,
    platy, zebra danio, ghost shrimp
    (no marine animals yet)

  After Marine Systems research:
    + maroon, anthias, snails, conch,
      emperor angel ... all at once
  ```
- Not chosen: "Keep it as chosen" ("Every new species can turn up in any shop from day one, including animals the
  player has no tank for yet."); "Like the real hobby" ("The option you passed on before: clean-up crew with Beginner
  marine, anthias and wrasse with Reef, the big tangs and the emperor with Large marine, the starfish with Advanced
  marine; freshwater ones from the start.").

**Decision 9 (amends decision 4).** A new species keeps `unlock.requires: []` (no research of its own); the game
treats the research its easiest water type needs as its keys (`requiredUnlocks` in `src/sim/economy/shop.ts`, from
`waterClassKeys` in `src/sim/facility/progression.ts`, the same rule as `waterClassLock`): freshwater species are in
the shop from the start, marine ones from Marine Systems, reef-only ones from Reef Systems. When that research
completes, the shop restocks them at once (`stockNewUnlocks`). The Shop and the Encyclopedia read the same rule, and
each species' hint says so. Existing species are unchanged.

## Round 3 (2026-10-25, before the chunk's checks): the first hour's toast cap

The new species shift the game's shared random stream, and one balance test seed went over a cap. Asked with the
AskUserQuestion tool (one question):

- **"A balance test caps the pop-up toasts a new player sees in their first real hour at 90. With the new species, one
  test seed (betta 77) now shows 92: two spawns, two sales and other ordinary events, no repeating message. Over 63
  seeds the median is 76 and the 95th percentile 87. Before this chunk, one seed already reached 97. The cap fails on
  1–3 % of seeds by luck either way. How should the test hold that promise?"** (Toast cap)
  - Chosen: **"Raise the cap to 100 (Recommended)"** ("Keep the per-seed check, with the cap above the most ever seen
    (97 in 63 seeds, before and after the chunk). A quick change; it still catches real toast spam.")
  - Not chosen: "Test a sweep instead" ("Keep 90 but check it over many seeds (e.g. 95 % of seeds at or under 90;
    today 87). A truer promise, but a slower test and a bigger change to it."); "Cut toasts in the game" ("Keep 90 and
    make the first hour quieter (fold more events into the log instead of toasts). Players would see the change; I'd
    ask you which events before building it.").

**Decision 10.** `tests/sim/playthrough-starters.test.ts` caps the first real hour's toasts at 100 per seed (was 90);
the later hours' cap (70) is unchanged.
