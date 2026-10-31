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

Four research agents wrote sourced notes for the 18 species (`docs/agent/design/CHUNK-17/research/`; moved into `docs/research/` with the source check's notes in wave E). The owner said,
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

## Round 3 (2026-10-30, Skye, before building)

One AskUserQuestion round (design §16: research, hints, foods, sellers and a show). The owner chose the recommended
option each time; the previews they saw are quoted.

1. **"Chunk 17 adds two research projects for the big-tank animals. Are these names, shop words and costs right?
   (Existing for scale: Big-water Marine is $4,000 / 72 h; Predator Husbandry $5,000 / 96 h.)"** (Research)
   - Chosen: **"As proposed (Recommended)"**: "Big-water Freshwater $3,000 / 60 h (needs intermediate freshwater + the
     125-gallon tank); Shark & Ray Husbandry $8,000 / 96 h (needs a public showroom + the 300-gallon tank)." The
     preview: Big-water Freshwater, $3,000 · 60 h, needs intermediate freshwater and the 125 Gallon: "River giants need
     long tanks, big filters and a heavy lid. Opens oscars, clown loaches, black ghost knifefish, fahaka puffers, ornate
     bichirs, silver arowanas and, with Cool-water Systems, koi." Shark & Ray Husbandry, $8,000 · 96 h, needs a public
     showroom and the 300 Gallon: "Soft sand, no copper, a tight lid and iodine-rich seafood for animals built of
     cartilage. Opens the motoro stingray, coral catshark, epaulette shark and brown-banded bamboo shark."
   - Not chosen: "Same words, cheaper" ($2,000 / 40 h; $6,000 / 72 h); "Same words, dearer" ($4,000 / 72 h; $10,000 /
     120 h).
2. **"Locked animals show a hand-written hint (shop and encyclopedia), and 32 of them go wrong once the shop waits for
   the tank (e.g. the emperor angelfish's says it comes 'once you research Marine Systems'). Heads-up: right after
   Marine Systems, 13 small marine animals (royal gramma, green chromis, maroon clown…) now also wait for the 40 Gallon
   Breeder. What should a locked card say?"** (Hints)
   - Chosen: **"Say what's missing (Recommended)"**: "Built from whatever is still locked (the research's hint, then
     the tank's), for every species, so no hint can go stale again. The hand-written hints retire." The preview:
     emperor angelfish before Marine Systems: "Research Marine Systems (or reach 150 reputation as a seasoned keeper).
     It also waits for the 240 Gallon: open a public showroom and reach 360 reputation."; after Marine Systems: "Comes
     into the shop with the 240 Gallon: open a public showroom and reach 360 reputation."; royal gramma after Marine
     Systems: "Comes into the shop with the 40 Gallon Breeder: reach 25 reputation or raise a clutch."; silver arowana,
     nothing done yet: "Research Big-water Freshwater. It also waits for the 500 Gallon Showpiece: research Acrylic
     Engineering, or grow into a destination aquarium."
   - Not chosen: "What's missing + the old reason" (the generated hint, then the true part of the old line); "Fix only
     the 32 by hand".
3. **"The big animals need foods the shop doesn't sell. Each appears in the shop once you can buy an animal that eats
   it. Are these names, descriptions and prices right? (For scale: Frozen Krill & Silversides is $12 for 40 servings;
   Goldfish Pellets $7 for 120.)"** (New foods)
   - Chosen: **"Five foods (Recommended)"**: "Koi Sticks, Floating Carnivore Sticks, Frozen Squid, Prawn & Mussel,
     Frozen Shell-on Shellfish, Live Crickets. Krill & Silversides stays as it is." The preview:
     - Koi Sticks, $10 · 100 servings · dry, floats: "Big floating sticks for koi, which feed at the surface and come
       up to beg. Fits an autofeeder." With: koi.
     - Floating Carnivore Sticks, $14 · 80 · dry, floats: "High-protein sticks for surface hunters like arowanas and
       oscars. Fits an autofeeder." With: silver arowana, oscar.
     - Frozen Squid, Prawn & Mussel, $16 · 40 · frozen: "Bite-size seafood for sharks, rays and big carnivores. Never
       beef heart or chicken: big fish can't digest the fat." With: sharks, motoro, oscar, bichir, arowana, black
       ghost, panther grouper.
     - Frozen Shell-on Shellfish, $14 · 30 · frozen: "Crab legs, cockles and crayfish in the shell. Puffer and
       triggerfish teeth never stop growing; crunching shells wears them down." With: fahaka puffer, clown
       triggerfish.
     - Live Crickets, $8 · 20 · live: "Gut-loaded crickets on the surface: a treat big surface hunters take as they
       would in the wild." With: silver arowana, oscar, fahaka.
   - Not chosen: "Four, no crickets"; "Three, one floating stick".
4. **"Two new fictional sellers stock the new animals (koi go to Coldwater Koi & Goldfish, the marine five to Deep Reef
   Specialists, mono and scat to Mangrove Coast Aquatics). And should koi get their own show class?"** (Sellers)
   - Chosen: **"These names + a Koi show (Recommended)"**: "Blackwater River Imports (the big freshwater six + the
     motoro), Mermaid's Purse Shark Hatchery (the three sharks; a mermaid's purse is a shark egg case), and a Koi class
     from club shows up." The preview: "Blackwater River Imports" (oscar, clown loach, black ghost, fahaka, bichir,
     arowana, motoro; lines read "… river stock"); "Mermaid's Purse Shark Hatchery" (coral catshark, epaulette, bamboo
     shark; lines read "… hatchery line"); show class "Koi": "Body shape, clean white skin, deep even colour and a
     crisp, balanced pattern. A big koi is a prize." Body 25 · Colour 25 · Pattern 20 · Size 15 · Condition 15.
   - Not chosen: "These names, no Koi show" (koi in "Open freshwater & brackish"); "Plainer names + a Koi show"
     (Amazon Basin Aquatics, Coral Lagoon Sharks).

9. **Round 3's decisions.** The two research projects as proposed (names, needs, blurbs, $3,000 / 60 h and $8,000 /
   96 h). Locked cards say what's still missing, generated from the unlock rules' hints (research first, then the
   tank: "It also waits for the {tank}: …" when research is missing too, "Comes into the shop with the {tank}: …" when
   only the tank is), for every species; the hand-written species hints retire from the locked cards. The five foods
   with the words and prices above, each sold once an animal listed with it can be bought. The two sellers and their
   line words, and a Koi show class (a class in the existing tiers: data, not a new tier).

## Round 4 (2026-10-30, Skye, wave E): the new wording, a friend's reef, the ray's burying, the release

The new player-visible wording was generated from the data and code into a note on the CNVS canvas (the shop and
research lines, the egg-case and stingray messages and cards, the candling stages, and the 18 species' encyclopedia
pages, notes, morph names and compatibility reasons). One AskUserQuestion round, four questions; the owner's choices:

1. **"Chunk 17's new player-visible wording is open on the canvas next to me (the 'chunk17-wording' note): the shop and
   research lines, the shark egg-case and stingray birth messages, and the 18 species' encyclopedia pages and
   compatibility reasons. Is it OK for players?"** (Wording)
   - Chosen: **"OK as written (Recommended)"**: "Every line as written. One is already reworded so plural food names
     read right: 'The shop sells Koi Sticks once you can buy koi.'"
   - Not chosen: "I'll send changes".
2. **"In the 'A friend's reef' lab preset, a hermit crab kills a snail for its shell in about 1 run in 5 (the game's
   hermits really do this, and the tank has 3 hermits and 37 snails). The preset's own check, 'everyone alive after
   two days', then fails. What should change? (backlog B-220)"** (Friend's reef)
   - Chosen: **"Check fish only (Recommended)"**: "The preset's check becomes 'no fish die in two days'. A snail lost to
     a hermit is the real tank's own risk, so the hermits and the preset stay as they are."
   - Not chosen: "Spare shells protect snails" ("A shell pile in the tank cuts the hermits' snail kills (a small sim
     change), and the preset gets one. The check stays 'everyone alive'."); "Leave it".
3. **"The motoro stingray rests flat on the sand but doesn't bury itself with only its eyes showing, as the design
   asked. The game's sand-burying only works head-first, for wrasses, so a ray needs its own version. Build it now or
   later?"** (Ray burying)
   - Chosen: **"Build it in this chunk"**: "Add a ray burial (sand flicked over the disc, eyes showing) before the
     chunk's checks. Roughly a few more hours."
   - Not chosen: "Backlog it (Recommended)" ("Ship the ray resting flat on the sand; burying goes in the backlog for a
     later chunk. Its encyclopedia line already says 'rests flat on the sand'.").
4. **"Once the four checks and the fresh review are green, release 0.9.0? That merges next into main (GitHub Pages
   and the Render site) and then redeploys the shared-shop server, because the save format changes to v4 (a 0.8.0
   build can't open a 0.9.0 save)."** (Release)
   - Chosen: **"Release once green (Recommended)"**: "Bump to 0.9.0 with a CHANGELOG entry, merge into main and push,
     then deploy aquarium-go-shops from main and check both versions."
   - Not chosen: "I'll play it first"; "Not yet".

10. **Round 4's decisions.** The chunk's new wording is approved as listed. The friend's reef preset checks that no
    fish die in two days (B-220 closed: the hermits and the preset unchanged). The motoro buries itself in a sand bed
    when it rests, eyes showing (built in this chunk). 0.9.0 is released once the four checks and the fresh review
    are green: the version and CHANGELOG, `next` merged into `main` and pushed, then aquarium-go-shops deployed from
    `main` (PLAN.md "Releases").
