# ADR-0053 — Owner answers, chunk 17: big-tank species (koi, sharks, a ray and fifteen more); the shop sells an animal only once a tank that holds an adult is unlocked; round 2: egg cases, the bamboo shark, the arowana and motoro, rare forms

**Status:** Accepted\
**Date:** 2026-10-30\
**Chunk:** 17 (big-tank species; SESSION_HANDOFF.md "Handoff to Skye: chunk 17")\
**Requirements:** BIG-001 to BIG-012 (chunk 17's brief, PLAN.md)

## Context

After 0.8.0 the owner asked Marshall, verbatim (2026-10-30): "Actually I'm kind of curious about species that we
haven't included because they would be too large so maybe they get unlocked as you get bigger tanks. What kind of
species could we add for up to 1,000-gallon tanks or should we even go above 1,000 gallons?"

Marshall's answer: the tanks already go to 1,000 gallons, but no species needs more than 220 (the emperor angelfish);
freshwater tops out at 75 (discus, comet goldfish) and brackish at 125 (archerfish), so the six sizes from 240 to 1,000
only give room. Fill 240–1,000 before going higher; the next real step (blacktip reef sharks, zebra sharks, eagle rays,
giant groupers) is thousands of gallons, a public aquarium rather than a shop, with a new facility level, new tank
sizes and new art, and the heaviest load on phones. The candidates shown (rough hobby numbers, to be pinned by
research): oscar, clown loach, black ghost knifefish, fahaka puffer, ornate bichir, motoro stingray, silver arowana
(fresh); mono and scat (brackish); blue tang, naso tang, queen angelfish, clown triggerfish, panther grouper, coral
catshark, epaulette shark, brown-banded bamboo shark (marine). Advised against: fish that outgrow even 1,000 gallons
(red-tailed catfish, pacu, arapaima, iridescent shark), fish that rarely survive in captivity (Moorish idol,
blue-spotted ribbontail ray) and the Asian arowana (protected; illegal to own in the US). A "lesson" fish that outgrows
every tank was offered as the owner's call; the owner didn't take it up.

The owner then asked, verbatim: "ok can koi live in 1000 gallon tanks and below?" Marshall: yes, only at 1,000 gallons,
and only two or three adults (2–3 ft, decades-long lives; hobby guides want about 1,000 gallons for the first few and
water about 3 ft deep); young koi can grow up in 300–500 gallons for a while. Cool water like goldfish; very heavy
waste; famous colour varieties whose inheritance isn't simple, so the research decides how many can be modelled
honestly. Koi are judged from above, which is why they usually live in ponds; an indoor pond is the natural step if
the game ever goes past 1,000 gallons.

## The owner's request, verbatim

> "Well it's at the Koi as well, and then everything else that you see here. I'm going to have you actually build out
> the entire schematic and plan for this, including all the variations that need to be implemented for these extra
> species and everything else in between (including all of the instructions on what can work together and what won't
> work together).
>
> We shouldn't be able to purchase these in the market until we have it available to ourselves: all the things,
> everything that needs to be considered. Go through the codebase and make sure that you understand it and then I'm
> going to have you go ahead and give SKYE the build. You're going to have SKYE, within Canvas CN VS, build out what you
> discover."

("it's at the Koi" was dictated; it reads as "add the koi".) Then, while Marshall worked: "make sure we hand off the
build to skye in cnvs".

## The questions as asked, and the answers (one AskUserQuestion round, 2026-10-30)

1. **"Which species should wait in the market until you have a tank big enough for an adult?"** (Which ones)
   - Chosen: **"Every species (Recommended)"**: "The shop never sells an animal you can't house as an adult. Some 0.8.0
     species change too: the emperor angelfish waits for the 240-gallon tank, the sailfin tang for the 180, freshwater
     angelfish and swordtails for the 40-gallon breeder (25 reputation or one raised clutch). Animals people already
     own stay."
   - Not chosen: "Only the new big-tank species" ("The 18 new species wait for their tank; everything already in 0.8.0
     stays as it is today (it appears once its water type is researched).").
2. **"What counts as having the tank available?"** (The tank)
   - Chosen: **"The size is unlocked (Recommended)"**: "As soon as you can buy a tank that big (gallons and floor size),
     the shop starts stocking the species and says so, the way it does after research. The bamboo shark, for example,
     needs the 1,000-gallon: the only tank 4 feet front to back."
   - Not chosen: "You own one that big" ("Stock appears only once you've actually set up a tank that big. Stricter:
     selling or emptying that tank hides those species from the shop again.").
3. **"The new animals need new foods (krill, whole fish like silversides, squid and clam). When should those be
   sold?"** (New foods)
   - Chosen: **"With the animals (Recommended)"**: "Each new food appears in the shop once you can buy an animal that
     eats it."
   - Not chosen: "From the start" ("The new foods are on sale from day one, like the frozen foods today.").

## Decisions

1. **The species: 18, 79 → 97.** Koi and every candidate shown: oscar, clown loach, black ghost knifefish, fahaka
   puffer, ornate bichir, motoro stingray, silver arowana, koi (fresh); silver mono, spotted scat (brackish); blue tang,
   naso tang, queen angelfish, clown triggerfish, panther grouper, coral catshark, epaulette shark, brown-banded bamboo
   shark (marine). A species whose honest adult needs exceed the 1,000-gallon tank goes back to the owner before it is
   built (the design's per-species sheets say which).
2. **"All the variations":** real colour forms only, as ADR-0052 decision 2 (no invented forms; hybrids, dyed fish, GM
   lines and deformity-based forms left out); young and male/female colours where they differ; Prismatic as every
   species has it.
3. **"What can work together and what won't":** every new species carries its compatibility in data (predator and prey
   tags, prey size, temperament, water ranges, reef, plant and invert safety) plus explicit exception rules for the
   pairings the sources call out; the design's compatibility matrix is the reference and its tests pin the key verdicts.
4. **The tank gate (answers 1 and 2):** the shop stocks a species only once the player has unlocked the smallest tank
   tier that holds an adult (`recommendedMinTankGallons` and `recommendedFootprint`), on top of its research. It
   applies to every species, the 79 already in the game included; animals players already own stay. Tiers that need no
   unlock (5, 10, 20 long, 29) gate nothing, and the player's own starter is always available.
5. **New foods (answer 3):** a new food appears in the shop once an animal that eats it can be bought.
6. **Not in this chunk:** tanks above 1,000 gallons, ponds, the advised-against species and a "lesson" fish.
7. **Builder:** Skye, in CNVS (the owner's words above). Player-visible words the designs don't cover (research names
   and blurbs, unlock hints, food names, seller names, any show) go to the owner first, in Skye's question round, and
   are recorded in this ADR as round 3. Releasing it (0.9.0) needs the owner's go-ahead in the session.

## Round 2 (2026-10-30, Marshall, after the research)

Four research agents wrote sourced notes for the 18 species (`docs/agent/design/CHUNK-17/research/`). The owner said,
verbatim: "ask me questions if clarification is needed. otherwise lets get this done and sent to skye". One
AskUserQuestion round:

1. **"Shark egg cases take 3 to 5 months to hatch in real life. How long should they take in the game?"** (Egg cases)
   - Chosen: **"The usual rule (Recommended)"**: "The game's normal speed-up for breeding (real days × 8 game hours):
     about 40 game days. That's about 2.7 hours of play at normal speed, 16 minutes at 10×. A slow, long project; the
     egg case's card shows the embryo growing."
   - Not chosen: "Shorter" ("Cut it to 320 game hours (about 13 game days, 53 minutes at normal speed), as long as the
     longest hatch in the game today (the mantis shrimp), and say in the encyclopedia that it's shortened.").
2. **"The brown-banded bamboo shark grows to about 3.5 ft. Published minimums fit the 1,000-gallon tank, but a hobby
   rule of thumb (tank width 1.5 times the shark's length) says it needs more than 1,000. Keep it?"** (Bamboo shark)
   - Chosen: **"Keep it, 1,000 gal (Recommended)"**: "It comes into the shop with the 1,000-gallon tank (the only one 4
     ft front to back). The encyclopedia says an adult is at the limit of what any home tank can give it."
   - Not chosen: "Leave it out" ("Only the coral catshark and the epaulette shark (both 500 gallons). The epaulette is
     the better home shark anyway: captive-bred, breeds in aquariums, walks on its fins.").
3. **"Two of the new fish come with real-world concerns. The silver arowana is mostly caught wild (often by killing the
   father that carries the young) and is banned in Mississippi and Oklahoma. The motoro stingray is venomous and banned
   or restricted in seven US states. Keep them?"** (Arowana, ray)
   - Chosen: **"Keep both, with notes (Recommended)"**: "Both stay, and their encyclopedia pages say all of it plainly:
     wild-caught, venomous, banned or restricted in several states, experts only."
   - Not chosen: "Leave the arowana out" ("The motoro stays with its notes; the arowana goes (the concern is how it's
     caught)."); "Leave both out" ("16 new species instead of 18.").
4. **"Some colour forms are real and sold, but nobody has documented how they're inherited: butterfly (long-fin) koi,
   the white black ghost knifefish, the platinum silver arowana and the Borneo look of the clown loach. Include
   them?"** (Rare forms)
   - Chosen: **"Include them all (Recommended)"**: "Each as a rare form, with a note that its inheritance is the
     hobby's report, not proven. The game already does this for the blue tang's yellow-belly form."
   - Not chosen: "Only butterfly koi" ("The best-known of them; the other three are left out."); "Leave them all out"
     ("Only forms whose inheritance is documented or a clear bred line.").

8. **Round 2's decisions.** Shark egg cases incubate by the usual rule (real days × 8); the bamboo shark stays, gated
   by the 1,000-gallon tank, with an honest note; the silver arowana and motoro stay, their encyclopedia pages naming
   the wild collection, the venom and the US state bans; the four real forms with unproven inheritance are included as
   rare forms with a note. The research also settled, without a question: the sourced tank sizes stand (several fish
   need 180 gallons, not 240; no minimum is raised to make a fish "big"); koi need 800 gallons for a group of three;
   the "blonde naso", the "pearl" ray and the silver scat are separate species, not forms; leather koi, ghost koi and
   Kumonryu are left out.
