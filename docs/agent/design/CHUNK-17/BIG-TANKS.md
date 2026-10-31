# Chunk 17 design: big-tank species, and no animal in the shop before its tank

Written by Marshall on 2026-10-30 for Skye, who builds it (ADR-0053: the owner's words verbatim, the three answers and
the decisions). It is the chunk's reference: what to build, where it goes in the code, and the facts behind each
animal. PLAN.md chunk 17 is the brief; SESSION_HANDOFF.md "Handoff to Skye: chunk 17" is the order of work.

The species research behind §8 to §10 was written for this design by research agents from fetched sources, as four
drafts (freshwater-big, koi-ray-brackish, marine-big, sharks). A second agent checked every number the game uses
against its source before the build; in wave E the drafts moved into `docs/research/` (freshwater.md, marine.md and
brackish.md each end with a chunk 17 chapter, the source check's notes included) and were deleted.

## 1. What and why

The tanks go to 1,000 gallons, but no species needs more than 220 (the emperor angelfish); freshwater tops out at 75
and brackish at 125. So the six sizes from 240 to 1,000 only give room. This chunk adds 18 species that need them
(79 → 97), and makes the shop honest for every species: **it stocks an animal only once the player has unlocked a tank
that holds an adult** (ADR-0053 decisions 4 and 5).

## 2. The species at a glance

The research's numbers (each draft's "Proposed game data"), with the owner's round-2 answers (ADR-0053). "Gate" is
what the shop waits for: the research keys, then the tank key from §3. Adult sizes are total length (the ray's is its
disc).

| Species (id) | Water | Adult | Tank (footprint, in) | Gate | Breeding | Behaviour set | Draft |
|---|---|---|---|---|---|---|---|
| Oscar (`oscar`) | fresh, tropical | 35 cm | 180 (72×24) | `fw_large`, `tank_180` | `substrate_spawner` | `cichlid_large` (new) | freshwater-big |
| Clown loach (`clown_loach`) | fresh | 30 cm | 180 (72×24), a group of 5–6 | `fw_large`, `tank_180` | `not_in_game` (hormones only) | `loach_shoal` (new) | freshwater-big |
| Black ghost knifefish (`black_ghost_knifefish`) | fresh | 45 cm | 240 (96×24) | `fw_large`, `tank_240` | `not_in_game` (farm ponds) | `knifefish` (new) | freshwater-big |
| Fahaka puffer (`fahaka_puffer`) | fresh | 40 cm | 180 (72×24), alone | `fw_large`, `tank_180` | `not_in_game` | `pea_puffer` (+ sand wallow, inflate) | freshwater-big |
| Ornate bichir (`ornate_bichir`) | fresh | 50 cm | 180 (72×24) | `fw_large`, `tank_180` | `egg_scatter_cover` (hard) | `bichir` (new) | freshwater-big |
| Silver arowana (`silver_arowana`) | fresh | 85 cm | 500 (120×36) | `fw_large`, `tank_500` | `not_in_game` (male mouthbrooder; ponds) | `arowana` (new) | freshwater-big |
| Koi (`koi`, *Cyprinus rubrofuscus*) | fresh, cool | 70 cm | 800 (144×36), about 250 per adult, a group of 3 | `fw_coldwater`, `fw_large`, `tank_800` | `egg_scatter_cover` | `goldfish` | koi-ray-brackish |
| Motoro stingray (`motoro_stingray`) | fresh | 50 cm disc | 500 (96×36; the 240 and 300 are 24 in wide) | `elasmobranchs`, `tank_500` | `ray_viviparous` (new) | `stingray` (new) | koi-ray-brackish |
| Silver mono (`silver_mono`) | brackish to marine | 25 cm | 180 (72×24), a school of 5–6 | `brackish`, `tank_180` | `not_in_game` | `chromis` | koi-ray-brackish |
| Spotted scat (`spotted_scat`) | brackish to marine | 30 cm | 240 (96×24), a group of 4–6 | `brackish`, `tank_240` | `not_in_game` | `rabbitfish` (+ picker) | koi-ray-brackish |
| Blue tang (`blue_tang`) | marine | 30 cm | 180 (72×24) | `marine_large`, `tank_180` | `not_in_game` (hatcheries) | `tang` | marine-big |
| Naso tang (`naso_tang`) | marine | 45 cm | 240 (96×24) | `marine_large`, `tank_240` | `not_in_game` | `tang` | marine-big |
| Queen angelfish (`queen_angelfish`) | marine, fish-only | 40 cm | 250 → the 300 (96×24) | `marine_large`, `tank_300` | `not_in_game` | `angelfish_dwarf` | marine-big |
| Clown triggerfish (`clown_triggerfish`) | marine, fish-only | 45 cm | 300 (96×24) | `predators`, `tank_300` | `not_in_game` | `triggerfish` (new) | marine-big |
| Panther grouper (`panther_grouper`, *Chromileptes altivelis*) | marine, fish-only | 60 cm | 300, footprint 120×36 → the 500 | `predators`, `tank_500` | `not_in_game` (food hatcheries) | `grouper` | marine-big |
| Coral catshark (`coral_catshark`) | marine, fish-only | 70 cm | 500 (118×30) | `marine_basics`, `elasmobranchs`, `tank_500` | `egg_case` (new) | `benthic_shark` (new) | sharks |
| Epaulette shark (`epaulette_shark`) | marine, fish-only | 90 cm | 500 (108×36) | `marine_basics`, `elasmobranchs`, `tank_500` | `egg_case` | `benthic_shark` (walks) | sharks |
| Brown-banded bamboo shark (`brownbanded_bamboo_shark`) | marine, fish-only | 105 cm | 1,000 (124×42) | `marine_basics`, `elasmobranchs`, `tank_1000` | `egg_case` | `benthic_shark` | sharks |

**The honest numbers moved some fish down.** The sources put the oscar, clown loach, fahaka, bichir, mono and blue
tang at 180 gallons, not 240 or more; only the arowana, motoro, grouper, sharks and koi truly need 500 and up. The
design keeps the sourced numbers (no minimum raised to make a fish "big"); a group's size is where a bigger tank
honestly comes in (an oscar pair or 8–10 clown loaches want 240), and the compat engine already says so through
`social` and stocking. The drafts' own `unlock` lines differ in places (the motoro under `predators`, koi without
`fw_large`): this table wins.

**Names to use** (checked in the drafts): *Cyprinus rubrofuscus* for koi (Catalog of Fishes; FishBase still says *C.
carpio*: say so in `confidenceNotes`); *Chromileptes altivelis* for the panther grouper (the trade spells it
*Cromileptes*; Ma & Craig 2018 put it in *Epinephelus*). The "blonde naso" is *Naso elegans*, a separate species: not a
form of the naso tang (a later species if the owner wants it). The "pearl" ray is *Potamotrygon jabuti*, a separate
species. The red or "ruby" scat is a juvenile colour phase of *S. argus*, not a subspecies.

## 3. The tank gate: every species waits for a tank that holds an adult

**The rule.** A species' tank key is the `unlock` of the smallest tier in `TANK_TIERS` (by gallons) whose gallons are
at least `recommendedMinTankGallons` and whose `dimsIn.l` and `dimsIn.w` are at least the footprint's `minLengthIn` and
`minWidthIn` (with the compat engine's 0.5 in tolerance, `src/sim/compat/engine.ts` "Size vs tank"). The four open
tiers (5, 10, 20 long, 29) have `unlock: null`, so species that fit them gain no key. A species that fits no tier is a
data error: a test fails on it.

**In code.**
- `requiredUnlocks(sp)` (`src/sim/economy/shop.ts`) returns what it returns today (the species' own `unlock.requires`,
  the starter's roster key, or its water's research) plus the tank key, de-duplicated. Put the tank lookup in one
  exported helper (`tankKeyFor(sp)`, next to `waterClassKeys` in `src/sim/facility/progression.ts`, or in the tanks
  catalog) so the shop, the UI and the tests share it.
- Everything that reads availability then follows by itself: `isSpeciesAvailable` (stock, specials, breeder lines),
  `availableSpecies`, `stockNewUnlocks` (unlocking a tank size now announces the species it lets in, which is right:
  the comment there says a tank size must not announce *random* restocks, and it still won't),
  `src/sim/shows/schedule.ts`, `speciesUnlocked` in `src/ui/panels/common/derive.ts` (the shop's locked cards and the
  encyclopedia's availability).
- The player's own starter stays always available (`isSpeciesAvailable`'s first line). Owned animals, their young,
  listings and auctions are untouched: the gate is about what the shop sells.
- Offers already in a save's stock for a species the gate now refuses: drop them in the v3 → v4 migration (§13), so
  nobody can buy one the day they update. No words are needed (it's stock that would have expired within two days).
- The shared shop runs the same code from the same state, so it follows; the release redeploys its server (§15).

**Hints.** A locked card today shows the species' hand-written `unlock.hint`, and 32 of those become wrong (for
example the emperor's "comes into the shop once you research Marine Systems"). Generate the hint from what's missing
instead: the research part from the unlock key's hint in `src/data/unlocks.ts` ("Research Big-water Marine."), the tank
part from the tank key's ("a 240-gallon tank: open a public showroom and reach 360 reputation"). The hand-written hints
can stay as the encyclopedia's "why" line where they say something true. **The wording is the owner's** (round 3, Q2).

**Who changes.** Computed on `27f9d55` (`scripts/_audit/chunk17/gate.ts` in the internal clone, git-excluded): 32 of
the 79 species gain a tank key. The rest fit the open tiers.

| Tank key | Species that wait for it (their research today) |
|---|---|
| `tank_40` (25 reputation or one raised clutch) | freshwater angelfish, swordtail (open); fancy goldfish (cool water); royal gramma, green chromis, Banggai cardinal, watchman goby, maroon clownfish, fighting conch, six-line wrasse, lawnmower blenny, flame hawkfish, bubble-tip anemone (Marine Systems); mandarin dragonet (Refugiums); peacock mantis shrimp (Predator Husbandry) |
| `tank_55` (60 reputation) | melanurus wrasse |
| `tank_75` (specialty shop, 100 reputation) | comet goldfish (cool water); discus (Discus Husbandry); coral beauty (Reef); flame angelfish (Marine Systems); dwarf lionfish (Predator Husbandry) |
| `tank_90` | kole tang (Big-water Marine) |
| `tank_125` (aquarium store, 210 reputation) | yellow tang, foxface (Big-water Marine); chocolate tang, lyretail anthias, elegant starfish, sand-sifting starfish (Marine Systems); banded archerfish (Brackish) |
| `tank_180` (280 reputation) | sailfin tang (Marine Systems); miniatus grouper (Predator Husbandry) |
| `tank_240` (public showroom, 360 reputation) | emperor angelfish (Marine Systems) |

Big-water Marine already needs `tank_180`, so the yellow tang and foxface change only in needing the 125 as well
(already implied). The early marine shop shrinks the most: right after Marine Systems, the 30-gallon fish wait for the
40-gallon breeder. That is the owner's choice (ADR-0053 answer 1), but say so in the round so it isn't a surprise.

**Seeded tests will shift**, twice: the gate removes species from early stock, and the new species add to late stock.
Build the gate first, alone (wave 0), and triage before any species lands, the chunk-16 way: prove each failure passes
with the gate switched off in the clone, then make the test independent of the stream; never retune data to hide a
shift, and check owner decisions before changing a rule a test exposes (SESSION_HANDOFF.md "Learned in chunk 16").

## 4. Research: two new projects, two existing ones reused

Each new species needs its water's research, any research of its own, and its tank (§3).

| Research | Status | Opens | Proposed requirements and cost (the owner approves) |
|---|---|---|---|
| **Big-water Freshwater** → key `fw_large` | new | oscar, clown loach, black ghost knifefish, fahaka puffer, ornate bichir, silver arowana, koi | `fw_intermediate` and `tank_125`; $3,000, 60 h, husbandry track, branch freshwater, xp 150 (Big-water Marine is $4,000, 72 h with `tank_180`) |
| **Shark & Ray Husbandry** → key `elasmobranchs` | new | motoro stingray, coral catshark, epaulette shark, brown-banded bamboo shark | facility `showroom` and `tank_300`; $8,000, 96 h, marine track, branch marine, xp 220 (Predator Husbandry is $5,000, 96 h) |
| Big-water Marine (`marine_large`) | exists | blue tang, naso tang, queen angelfish | as today |
| Predator Husbandry (`predators`) | exists | clown triggerfish, panther grouper | as today |
| Cool-water Systems (`fw_coldwater`) | exists | koi (with `fw_large`) | as today |
| Brackish Estuaries (`brackish`) | exists | silver mono, spotted scat | as today |

Wire a new project the way `large_marine` is: its row in `src/data/research.ts`, the key's label in
`src/data/unlockKeys.ts`, the key's rule and hint in `src/data/unlocks.ts` (`research('…')`), and each species'
`unlock.requires` listing its research keys (with the water keys: an explicit `requires` replaces the water fallback in
`requiredUnlocks`). The motoro is freshwater: its `requires` is `['elasmobranchs']` (fresh water needs no key). The
blurbs name the animals they open, as Brackish Estuaries' does. **Names, blurbs and costs are the owner's** (round 3, Q1).

## 5. Foods: sold with the animals that eat them

The shop already sells "Frozen Krill & Silversides" (`meaty_frozen`, tag `pellet_large`) from the start, for the
lionfish, grouper and mantis shrimp. The research (§8–§10, each draft's "Cross-species notes") names what else the big
animals need. The drafts agree on four gaps:

| New tag | Food (name: the owner's) | Form | Eaten by | Why |
|---|---|---|---|---|
| `pellet_floating` | koi sticks | dry, floating (autofeeder) | koi | the koi staple; sinking food passes surface feeders by |
| `pellet_floating` | floating carnivore sticks | dry, floating (autofeeder) | silver arowana, oscar | a surface feeder's staple |
| `seafood` | frozen squid, prawn and mussel | frozen, sinking | sharks, motoro, oscar, bichir, arowana, black ghost, groupers | the big carnivores' staple; "Frozen Krill & Silversides" stays as it is (tag `pellet_large`), and the new species list both |
| `shellfish` | frozen shell-on shellfish (crab legs, cockles, crayfish) | frozen | fahaka (most of its diet, and what wears its beak down), clown triggerfish (its teeth), the sharks occasionally | puffers' and triggers' teeth grow all their lives |
| `insect` | live crickets (gut-loaded) | live | silver arowana, oscar, fahaka | wild diets; optional, a treat |

Cautions the guide repeats (the drafts' sources): no feeder goldfish or livebearers, no mammal or bird meat (beef
heart, chicken) for oscars and arowanas; mussels and clams carry thiaminase, so "occasionally"; sharks need iodine and
vitamins (bamboo sharks got goitre two months after supplements stopped). The game has no supplements: the sharks'
keeper tip says so, nothing is modelled.

**The rule** (ADR-0053 answer 3): a new food is on sale once any species that eats it can be bought. Add an optional
`soldWith?: readonly string[]` (species ids) to `FoodDef` (`src/types/catalog.ts`), and one helper, `isFoodAvailable
(state, def)`: its `unlock` as today, and, when `soldWith` is set, at least one of them `isSpeciesAvailable`. Use it in
`buyFood` (`src/sim/economy/purchases.ts`, its `isUnlocked(state, def.unlock)` line), the staff's restock pick
(`src/sim/staff/work.ts`, the `FOODS.filter(… unlocked.has(x.unlock))` line) and Supplies' locked state
(`src/ui/panels/market/Supplies.tsx`, `const locked = !unlocked(g, f.unlock)`, whose lock line then names the animal
instead of an unlock label). Existing foods keep `unlock: null` and no `soldWith`. A new `FoodTag` goes in the union in `src/types/species.ts`, and `tests/sim/fixtures/food-rules-pin.json`
changes on purpose. **Names, descriptions and prices are the owner's** (round 3, Q3).

## 6. Breeding: two new systems, two existing ones reused

- **`egg_case` (new; the three sharks).** The sharks draft's "Cross-species notes" has the full system: mating at
  night; two cases per laying (every ~19 days for the epaulette, ~7 in season for the bamboo shark, ~14 assumed for the
  catshark); epaulette and bamboo cases tied to rock or decor, the catshark's loose on the floor; a female alone still
  lays, but the cases are infertile; about half fertile with a male; duds rot and add ammonia if left. Incubation
  follows the game's usual rule (the owner, ADR-0053 round 2: real days × 8, about 40 game days, 2.7 hours of play at
  normal speed), shorter when warm (about 6 days less per °C) and with weaker pups above 30 °C. No parental care;
  tankmates eat about half the cases in a mixed tank (a nursery basket cuts it to about 5 %); hatchlings 10–17 cm live a
  week on yolk, then eat chopped seafood. The egg case's card shows the candled stages (yolk, a twitching embryo, gills,
  tail-pumping, stripes, the pup filling the case). New art: three case shapes (the draft's table). Moving a case
  happens under water (air kills the embryo), so it needs no special rule. Parthenogenesis is a fun fact only (the
  white-spotted bamboo shark, Detroit 2010; the brown-banded case in 2012 was stored sperm).
- **`ray_viviparous` (new; the motoro).** The koi-ray-brackish draft: 1–8 independent pups about 10 cm across after
  about 90 days (720 game hours); no stored sperm; males bite the female's disc in courtship (cosmetic); she rests after
  two or three litters; the female grows bigger than the male (`special.maleSizeFactor`). Not the guppy `livebearer`
  (fry clouds, stored broods, parents eating fry).
- **Existing systems.** Oscar: `substrate_spawner` (pairs clean a flat stone, both guard). Koi: `egg_scatter_cover`
  (spawning ropes or fine plants; the parents eat the eggs). Ornate bichir: `egg_scatter_cover`, hard (a rain cue is
  the honest trigger; `coolingTrigger` is the closest key and isn't right: leave it off). Everything else:
  `not_in_game`, with the reason in the data (hatcheries with hormones, ponds, pelagic larvae).

Each new `BreedingSystemId` goes in the union (`src/types/species.ts`), the registry
(`src/sim/life/breeding/registry.ts`), `check.ts` (what blocks it, in words), the status text, the encyclopedia's
breeding card and the dev `force` hook (the lab's "force breeding"). The card's wording goes to the owner in the final
round, as chunk 16's "Splits by itself" did.

## 7. Behaviour (src/ai) and art (src/render)

**Behaviour.** A behaviour set is mostly a profile in `src/ai/core/sets.ts` (`SetProfile`: loco, body envelope, idle
act weights, rest and startle styles, and the chunk-16 flags such as `bury`, `nightOnly`, `creviceRest`, `chases`,
`labriform`). Most of the new animals are profiles plus traits; a few need a new mechanic. Proposed (the research
drafts' "Behaviour" sections are the facts; confirm each before building):

| Set | Species | Profile and new mechanics |
|---|---|---|
| `tang` (exists) | blue tang, naso tang | as the other tangs; the blue tang wedges into rock to sleep and when frightened (`creviceRest`-like rest in a cave) |
| `angelfish_dwarf` (exists) | queen angelfish | as the emperor (a cave-patrolling picker that nips coral) |
| `grouper` (exists) | panther grouper | as the miniatus, slower, hovering on its pectorals |
| `goldfish` (exists) | koi | forage and sift the bottom, cruise in a loose group, beg at the surface at feeding (`beg`) |
| `cichlid_large` (new) | oscar | patrols mid to low, digs at the substrate, begs at the glass when the keeper is near (`beg`, `follow_pointer`), sulks on the bottom after a fright or a change, a pair guards a flat stone; territory (`territoryBL`, `chases: 'fish'`) |
| `loach_shoal` (new) | clown loach | a loose group (`shoal`) that forages the bottom and piles into caves; rests lying on its side (a cosmetic roll on rest, a famous "is it dead?" moment the encyclopedia can mention); day-active with dusk peaks |
| `knifefish` (new) | black ghost knifefish | `nightOnly` with `rest: 'cave'` (a tube or driftwood by day); swims forwards and backwards with a straight body by the long fin under it (`hover` near 1 lets it back up without turning; the art ripples the fin) |
| `bichir` (new) | ornate bichir | `bottomHugger`, `rest: 'bottom'` propped on its pectoral fins, `airBreath` (it rises to gulp air), hunts along the floor at dusk |
| `arowana` (new) | silver arowana | cruises just under the surface the full tank length (`surface`/`upper` zone), takes food at the surface, wide slow turns at the ends; jumps when startled (`escapeArtist`: the game advises a lid, `src/sim/care/fit.ts`, but loses no jumpers, so the jump is cosmetic) |
| `pea_puffer` (exists, scaled; or a new `puffer_large`) | fahaka puffer | hovers and ambushes, glass-dances, wallows in sand (as the wrasse's `sand` rest), inflates when badly frightened, crunches snails and shellfish; alone in its tank |
| `triggerfish` (new) | clown triggerfish | swims by its dorsal and anal fins with a stiff body (the art's `rigid` motion), blows jets at the sand (cosmetic), wedges into a crevice at night (`creviceRest`), chases tankmates (`chases: 'fish'`) |
| `chromis`, `rabbitfish` (exist) | silver mono; spotted scat | the mono: a busy midwater school (`chromis` tuned); the scat: a grazing group that picks at rock and glass (`rabbitfish` with `picker`) |
| `benthic_shark` (new) | coral catshark, bamboo shark, epaulette shark | `bottomHugger`, `rest: 'cave'` (under a ledge or by the glass), more active at night (`behaviorTraits.nocturnal`), slow sinuous swimming low over the sand, suction-feeds off the bottom; never hovers mid-water |
| `benthic_shark`, walking (a per-species gait) | epaulette shark | walks on its paired fins over sand and rock (`loco: 'walk'`, `canSwim`, as the axolotl), swims in short bursts, out at dusk; a late egg-case embryo and a startled pup "freeze" |
| `stingray` (new) | motoro stingray | glides on the floor (`bottomHugger`, `maxPitch` near 0, a wide body envelope, `hz` about equal to `hx`), buries in sand with its eyes out (`bury`, as the wrasse does in `sand.ts`), climbs the front glass at feeding (`beg`), sweeps the sand for food |

Big bodies are new ground: a 1 m shark in a 48 in wide tank, a 90 cm arowana in a 36 in one. Steering (B-219) and
the wedge fixed in 0.8.0 (a swimming walker whose way out led into the glass) are exactly the cases a big body will
hit. Test each new set in the **smallest tank the gate allows**, and sweep every AI test over nudged starts before the
release (SESSION_HANDOFF.md "Learned in chunk 16": the Pages build takes another path through a long AI run).

**Art.** A fish is a lofted body with fins, marks and a pattern (`FishPlan` in `src/render/creatures/core/plan.ts`;
chunk 16's `recolor` for young and sex colours, with the look in the plan's cache `key`). Barbels exist (`extras`:
`barbel`), the `koi` pattern kind exists in `PatternKind`, `rigid` motion exists (stiff-bodied swimmers), and
portraits have `eel` and `flat` glyphs (`src/ui/panels/common/Portrait.tsx`).
- **Fish plans (14):** oscar (eyespot on the tail: a `ring` mark), clown loach (three bands), black ghost knifefish
  (no dorsal or tail fin to speak of; one long fin under the body that ripples; white tail rings and blaze), fahaka
  (puffer body, a beak mouth, stripes), ornate bichir (long body, a row of small dorsal finlets, big fleshy pectorals),
  silver arowana (long, flat-sided, big scales, an upturned mouth with two chin barbels), koi (carp body, two pairs of
  barbels; the variety patterns; scale types: full, mirror rows of big scales, leather), mono (a tall diamond), scat
  (deep, spotted), blue tang, naso tang (orange lips and spines, tail streamers on adult males), queen angelfish (the
  "crown" on the forehead), clown triggerfish, panther grouper.
- **Sharks (3):** fish plans with a long tail section, two dorsal fins set back, a heterocercal tail (the upper lobe
  longer: a new caudal shape if the existing ones can't make it), paddle-like pectoral and pelvic fins (they move when
  the epaulette walks: the art's walk gait), gill slits (marks), barbels on the bamboo shark, the epaulette's big
  eyespot behind the head (a `ring` mark).
- **The ray (1):** a new special creature (`src/render/creatures/special/ray.ts`, beside `starfish.ts`): a round disc
  whose edge ripples as it swims, eyes on top, a tail with a barb, the ocellated pattern; a `flat` portrait or a new
  `ray` glyph.
- **Egg cases and pups:** an egg case is a new small object (a leathery case on the floor or caught in decor) with a
  visible embryo late in incubation if it's cheap to draw; ray pups are small rays.
- Young and sex colours per species: each draft's "Young and sexes". `MAX_MARKS` is 8: patterns of many spots (the
  panther grouper, the scat) are a `pattern`, not marks.
- Size: these animals fill the view in a way nothing else does. Check the LOD and pick radius for a 1 m body and the
  frame time with a 1,000-gallon showpiece on a phone (`qa:motion`; the lab's "Big-tank species").

## 8. Freshwater species

Per-species facts, data, forms, young and sex colours, behaviour, compatibility and tank: `docs/research/freshwater.md` (its chunk 17 chapter)
(oscar, clown loach, black ghost knifefish, fahaka puffer, ornate bichir, silver arowana) and
`docs/research/freshwater.md` (koi, motoro stingray). What the design adds or settles:

- **Oscar forms:** Tiger and Red as one codominant locus (a simplification: the red is a separate line-bred strain
  that fades without carotenoids, Syam 2019); Albino (the condition is documented; "recessive" is hobby writing:
  `confidenceNotes`); Lutino/lemon and Long-fin (inheritance unknown). Left out: dyed fish (blueberry, strawberry),
  the balloon (a deformity), the unverified blue.
- **Rare forms with unproven inheritance** (the owner, ADR-0053 round 2: include them all, each rare, with a note that
  the inheritance is the hobby's report): the white black ghost knifefish, the platinum silver arowana, the Borneo
  look of the clown loach, butterfly (long-fin) koi. The blue tang's Yellow Belly is the precedent.
- **Koi's variety model:** the draft's 8 loci. Real: the carp's two scale genes, S and N (Casas et al. 2013: scaled
  S_ nn, mirror or doitsu ss nn, linear S_ Nn, leather ss Nn, NN lethal), metallic D (dominant), the Bekko black of the
  Sanke (dominant), two duplicate recessive melanin-loss genes. Stand-ins, labelled as simplified the way fancy
  goldfish body types are: the red pattern (many genes in truth), the Utsuri/Showa black, Tancho and Ginrin. Named
  varieties come out as phenotypes and strains: Kohaku, Taisho Sanke, Showa, Tancho, Shiro and Hi Utsuri, Asagi,
  Shusui, Goshiki, Platinum Ogon, Yamabuki Ogon, Chagoi, Soragoi, Karashi, and Butterfly as an overlay. Left out:
  leather koi (the lethal NN and fin loss and toothlessness in the paper: the N locus keeps only `n` and the linear
  allele, so no leather or lethal genotype can arise), ghost koi (a cross with wild carp), Kumonryu (changes colour with
  the seasons). Most named varieties don't breed true (breeders cull up to 95 %): the game shows that through the
  stand-in loci, not by inventing genes. New art: `bodyMark: 'tancho'`, a doitsu scale layout, black coverage for
  Utsuri and Showa, netting on Asagi, Chagoi and Soragoi; the `koi` pattern kind exists.
- **Motoro:** venomous (keeper safety), soft sand only and nothing sharp, conservative on nitrate (the sources
  disagree), CITES Appendix III, banned or restricted in seven US states and permit-only in Florida: the encyclopedia
  says so plainly (the owner, round 2). The female is bigger. Pups are tracked from birth.
- **Silver arowana:** mostly wild-caught as yolk-sac young, often by killing the brooding father; illegal to own in
  Mississippi and Oklahoma, restricted in Hawaii, its ornamental trade illegal in Brazil: said plainly (round 2). A
  jumper: `escapeArtist`.
- **Fahaka:** `speciesOnly` (alone in its tank), shell-on foods or its beak overgrows. A `beakGrowth` flag is
  optional: if added, the pea and figure-eight puffers get it too.

## 9. Brackish species

`docs/research/brackish.md` (silver mono, spotted scat). One salinity range per species, SG 1.003–1.026 with an
ideal band of 1.010–1.022: they stay out of fresh water and adults may live in fish-only marine tanks
(`waterClasses: ['brackish', 'marine_fowlr', …]`), which is how the hobby keeps them grown. The draft's optional
`salinityByStage` field is the better long-term model; not in this chunk. Neither breeds in a home tank. The ruby scat
is the young's colour phase: a juvenile-only overlay (chunk 16's `recolor` for young colours does this). *Selenotoca*
(the silver scat) is another genus and not in this chunk.

## 10. Marine species

`docs/research/marine.md` (blue tang, naso tang, queen angelfish, clown triggerfish, panther grouper) and
`docs/research/marine.md` (coral catshark, epaulette shark, brown-banded bamboo shark). What the design adds or settles:

- **Blue tang:** 180 gallons by every source; it stays (the owner's list) and needs Big-water Marine and the 180. Its
  young are blue like the adults (the "yellow juvenile" in some references is the Atlantic blue tang). One real form,
  the Indian Ocean Yellow Belly (a locality locus, inheritance unknown, about 1.75× the price). It "plays dead" on its
  side after a fright: a recoverable state that must never read as dying.
- **Queen angelfish:** the young look completely different (navy with curved blue bars) until about 16 cm; the adult's
  "crown". Reef `unsafe` (nips corals and clams). One large angel per tank (high risk with the emperor). Left out: the
  Townsend angelfish (a hybrid), the St Paul's Rocks colour oddities.
- **Clown triggerfish:** eats every crustacean, snail, urchin, star and clam; flips rock; one per tank with large,
  robust fish only. New group `triggerfish`. Optional flags `equipmentBiter` (bites heaters and tubing) and `ichProne`
  (tangs) are core-type changes: add only if the compat or illness code will read them.
- **Panther grouper:** a "tank buster": sold under 2 in, grows several inches a month to 60 cm and eats its tankmates;
  the encyclopedia says so. Its 120×36 footprint is the draft's judgement (a 60 cm adult is longer than the 300's
  width), which puts it at the 500.
- **Sharks:** sand bed, no sharp rock, stable rockwork, a tight lid (they climb out), never copper or most
  medications (so their tankmates are quarantined first), sensitive to nitrate. The epaulette is the headline: captive
  bred, breeds in aquariums, walks on its paired fins. The bamboo shark is the weakest home fit: kept at the 1,000 (the
  owner, round 2) with the encyclopedia saying an adult is at the limit of any home tank. Young colours: the bamboo
  shark's bands fade to plain brown; the epaulette's spots and big eyespot; the catshark's marbling. Males show
  claspers at maturity. The epaulette's golden and tan types have no evidence of inheritance: the generic intensity
  locus. Possible new flags from the draft (`electricalSensitive`, `needsIodineSupplement`, `nitrateSensitive`,
  `knocksDecor`): only those a system will read.

## 11. What can live together, and what can't

Compatibility stays data-driven (`src/sim/compat/engine.ts`): water and temperature, size versus tank and footprint,
social needs, predation by tags and prey size (`src/sim/compat/predation.ts`: puffers tear prey about their own length),
temperament, territory, reef, plant and invert safety, and each species' `exceptionRules` for the pairings the sources
call out. Every draft has a full table for each species against the other new species and the existing roster, with
sources. The new species against each other (where the drafts differed, the stricter verdict is used):

| | Oscar | Clown loach | Black ghost | Fahaka | Bichir | Arowana | Motoro |
|---|---|---|---|---|---|---|---|
| **Oscar** | — | conditional | conditional | incompatible | usually compatible | usually compatible | conditional |
| **Clown loach** | | — | conditional | incompatible | conditional | usually compatible | conditional |
| **Black ghost** | | | — | incompatible | usually compatible | usually compatible | conditional |
| **Fahaka** | | | | alone only | incompatible | incompatible | incompatible |
| **Bichir** | | | | | — | usually compatible | usually compatible |
| **Arowana** | | | | | | — | usually compatible |

(The motoro's own table says conditional with the oscar; the oscar's says usually compatible: conditional is used.)
Koi live only in cool water: incompatible with every tropical species here; with the comet and fancy goldfish the
draft's table applies (and the engine's temperature and size checks).

| | Blue tang | Naso | Queen angel | Clown trigger | Panther grouper | Catshark / epaulette / bamboo | Mono / scat |
|---|---|---|---|---|---|---|---|
| **Blue tang** | one per tank | conditional | usually compatible | conditional | usually compatible as adults; high risk while the tang is small | usually compatible (quarantine first: no copper in a shark tank) | conditional (fish-only marine) |
| **Naso** | | one per tank | usually compatible | conditional | as the blue tang | usually compatible | conditional |
| **Queen angel** | | | one large angel | conditional | as the blue tang | **high risk** (angels nip sharks) | conditional |
| **Clown trigger** | | | | one per tank | conditional | **incompatible** | high risk |
| **Panther grouper** | | | | | one per tank | **high risk** (conditional with an adult bamboo shark, too big to swallow) | high risk |
| **Sharks** | | | | | | the sharks draft's table | conditional |
| **Mono / scat** | | | | | | | excellent together |

Against the existing roster, the headlines (the drafts' tables have every row): the big predators (oscar, bichir,
arowana, groupers, sharks, the motoro, the trigger) eat whatever fits their mouth, so tetras, rasboras, guppies, dwarf
shrimp, cleaner and peppermint shrimp, hermits, crabs and small gobies are incompatible or high risk with them; the
fahaka lives alone; the trigger and queen angel are not reef-safe; the sharks can't share a tank that is ever treated
with copper. Exception rules the drafts call for include the cleaner shrimp (`clown_triggerfish` incompatible,
`panther_grouper` high risk), tang against tang (conditional, mitigated by tank size and sight breaks), angel against
angel, and every new predator against `tag:` prey groups. **Tests pin the key verdicts**: at least one row per new
species against its riskiest existing tankmate and one against its best, plus the table above (a compat test like
chunk 16's `species-chunk16`).

## 12. Sellers, prices and shows

**Sellers** (`src/data/buyers.ts`, `SELLERS`; fictional names):
- koi → "Coldwater Koi & Goldfish" (exists; its name already promises koi);
- blue tang, naso tang, queen angelfish, clown triggerfish, panther grouper → "Deep Reef Specialists" (exists);
- silver mono, spotted scat → "Mangrove Coast Aquatics" (exists);
- the big freshwater six and the motoro → a new seller (a river-fish specialist; name: the owner's, round 3);
- the three sharks → a new seller (a shark and ray breeder; name: the owner's, round 3). Bamboo and epaulette sharks
  are captive-bred in the trade; say so in the line flavour if the research confirms it.

**Prices:** each species' `baseValue` from real retail prices (each draft's "Proposed game data" cites them). The
market's demand covers new species by itself (`initDemand` walks `listSpecies()`). `npm run report:rarity` and the
morph catalogue's checks after each wave.

**A koi show** (owner's call, round 3, Q4): koi are the show fish of the hobby, and the show system is data (a
`ShowDef` in `src/data/shows.ts` like "Goldfish · Fancy & single-tail": a name, a blurb, the species, the judging
weights). Proposed: "Koi" judged on body (form), skin and colour, pattern, size, condition. Real koi are judged from
above; the game's judging is numbers, so nothing changes there. Check ADR-0036 first: a new show *tier* bumps the
schema; a new show in an existing tier is data (and the bump is happening anyway).

## 13. Saves

`SCHEMA_VERSION` 3 → 4 (`src/persistence/schema.ts`; ADR-0016: a new species bumps it): a migration in
`migrations.ts` that drops gated offers from the shop stock (§3) and changes nothing else; the forward-safety pin
(`tests/sim/core-save-forward-safety.test.ts`) updated; a 0.8.0 save loads (keep one from the clone before you start:
the lab's "A friend's reef" saved through the real save path is a good one); a new save is "too new" for 0.8.0. New
breeding systems and food tags are data the old build doesn't know: that's what the bump protects.

## 14. The lab

Three presets in `src/dev/scenario/presets.ts`, each checked the way "A friend's reef" is (no deaths in 48 game hours
with autofeeders, `npm run scenario -- <preset> --hours 48`):
- **"Big-tank species"**: a destination facility with every new species, in tanks and groupings the matrix (§11) calls
  compatible, so the look-around shows them all.
- **"Koi grand display"**: the 1,000-gallon tank, cool water, three koi of different varieties.
- **"Sharks and a ray"**: a bamboo shark in the 1,000, an epaulette pair, a coral catshark (marine) and a motoro pair
  (fresh), each in the tank its draft gives for that number, so the lab warns about nothing; egg cases and pups on the
  way (the lab's "force breeding").

## 15. Waves, checks and the release

Land and test each wave before the next (the four checks' unit part at least, and the seeded triage), as chunk 16 did.

0. **The tank gate** for every species (§3), with the hints as approved in round 3. Alone, first: it shifts seeded
   tests, and the triage is cleaner without new species in the stream. The migration's offer drop comes with the
   schema bump in wave A.
1. **Wave A, big freshwater (6):** oscar, clown loach, black ghost knifefish, fahaka puffer, ornate bichir, silver
   arowana; Big-water Freshwater; the foods they need; `SCHEMA_VERSION` 4 and the migration.
2. **Wave B, koi and brackish (3):** koi (the variety model, §8, is the hard part), silver mono, spotted scat.
3. **Wave C, big marine fish (5):** blue tang, naso tang, queen angelfish, clown triggerfish, panther grouper. Mostly
   existing behaviour sets.
4. **Wave D, sharks and the ray (4):** motoro stingray, coral catshark, epaulette shark, brown-banded bamboo shark;
   Shark & Ray Husbandry; `egg_case` and `ray_viviparous`; the ray's art.
5. **Wave E:** the lab presets (§14), sellers and the show (§12), the owner's final wording round, then the chunk's
   end.

**Done means** (CLAUDE.md): the four checks on the final code from `~/LocalTest/AquariumGo` under `caffeinate -i -s`
with `PLAYWRIGHT_BROWSERS_PATH=~/LocalTest/playwright`; one fresh reviewer on Opus 5.5 at max effort (`model:
"opus"`, `effort: "max"`, never Fable) given the brief and `git diff <chunk start>..HEAD`; its blockers fixed; the AI
tests swept over nudged starts. Then **your own testing, as the owner would play it**:
- a new game: the 30-gallon species aren't in the shop before the 40-gallon breeder; unlocking it (the lab, or dev
  `unlockAll` on a copy) brings them in with the arrival notice; their locked cards show the approved hints;
- each new species in the lab at desktop and phone widths: young and adult, male and female where they differ, a few
  forms each; the koi varieties side by side; a ray buried and gliding; a walking epaulette; an egg case;
- the three presets for 48 game hours with no deaths; a week headless with autofeeders;
- the key pairings in the move preview and the shop (the matrix's tested rows, §11);
- a new food appearing with its first animal;
- a 0.8.0 save loads, keeps its animals, loses only the gated offers, and plays on.

**Release:** 0.9.0 only with the owner's go-ahead in your session (`package.json`, `CHANGELOG.md`, merge `next` into
`main` from the internal clone; Pages; the Render static site; the shop server by hand after Pages, as 0.8.0 did:
PLAN.md "Releases"). Watch the Pages run before deploying Render.

## 16. The owner's questions

**Already answered** (ADR-0053): the species (round 1, the owner's request); the tank gate for every species, "unlocked"
as available, foods with the animals (round 1); egg cases on the usual rule, the bamboo shark kept at 1,000 gallons,
the arowana and motoro kept with plain notes, the rare unproven forms included (round 2, Marshall).

**Skye's round** (round 3), before building, one batched AskUserQuestion with the exact words in previews:
1. **The two research projects:** names, blurbs, costs, hours (§4's proposals).
2. **The generated hints** on locked cards, research and tank parts together and apart, and what replaces the 32 hints
   that become wrong (§3).
3. **The new foods:** names, descriptions, prices (§5).
4. **The two new sellers' names** (§12), and **a koi show** (yes, as proposed, or not).

**Round 4**, at the end: every other new player-visible line (encyclopedia pages, breeding cards such as the egg
case's, the arrival notices, the keeper tips), as chunk 16's round 4 did. Then the release question.

## 17. Risks

- **Big bodies in the AI.** Nothing this long has moved in these tanks; steering edge cases (B-217, B-219) and wedges
  show up first in narrow tanks. Footprints that are honest (wide enough to turn) are the first defence; tests in the
  smallest allowed tank and the nudged-start sweep the second.
- **Frame time.** A 1,000-gallon showpiece with 1 m animals on a phone. Measure; don't guess.
- **Seeded tests**, twice (§3). Triage as chunk 16 did; never re-pin to hide a shift.
- **The gate surprises players** who are used to buying 30-gallon marine fish right after Marine Systems. The owner
  chose it; the arrival notices and hints are what make it read as progress rather than loss.
- **Koi genetics** can't be modelled one-to-one: most varieties are line-bred. Model only what's documented, call the
  rest lines or strains with a plain note, and never invent a gene (ADR-0052 decision 2).
- **Determinism.** New breeding systems run in the sim, which shared shops step in lockstep: `ctx.rng` and `dmath` only
  (AGENTS.md "Deterministic simulation"); the guard tests catch most slips.
- **Public repo.** No friends' names or photos in commits or docs (the repo is public).
- **Scope.** This is bigger than chunk 16 in systems, if not in species: the gate, two research projects, foods, two
  breeding systems, eight new behaviour sets and a ray. If a wave runs long, tell the owner and land the waves done
  so far rather than cutting tests.
