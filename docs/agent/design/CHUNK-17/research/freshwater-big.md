# Big freshwater species, chunk 17: research notes

Oscar, clown loach, black ghost knifefish, fahaka puffer, ornate bichir and silver arowana. Researched 30 October 2026 for the chunk 17 brief (`BRIEF.md`). The format follows `docs/research/marine.md`: a source table, then **Modelled as:**, then **Conflicts:**, then the proposed data and the notes the brief asks for.

**Tiers** follow `docs/RESEARCH_SOURCES.md`. Tier 1 means FishBase, the Catalog of Fishes (CoF), ADW, USGS/USFWS, the Smithsonian National Zoo and peer-reviewed papers. Tier 2 means Seriously Fish (SF), LiveAquaria (LA), Aquarium Co-Op (Co-op), Practical Fishkeeping (PFK), Quality Marine (QM), TFH, Aquarium Glaser (a wholesaler with a long-running species archive) and a vet news report. Tier 3 means Wikipedia, hobby forums (MonsterFishKeepers, MFK), Pufferfish Enthusiasts Worldwide (PEW), Oscar Fish Lover and Aquariadise, used for edge cases only.

**Access notes.** Every URL in the tables was fetched and read, except where marked. Springer, ScienceDirect, ResearchGate, Academia, PMC (a captcha) and core.ac.uk refused automated access. The papers behind them were read as an abstract on PubMed, Crossref or a search index, or as quoted in a USFWS screening report, and each is marked so. Rows marked *(search snippet)* rest on a search-result summary only.

**Time compression** follows `docs/GAME_DESIGN.md`:
- game incubation or brooding hours ≈ real days × 8
- `maturityDays` stays between 8 and 25
- `lifespanDays` ≈ real years × 40, capped at 500

**Numbers marked "derived"** are game abstractions with no direct source: bioload, behaviour traits, prey size and hunger hours. They are set against existing species (the comet goldfish has bioload 8 at 25 cm, the miniatus grouper 8 at 42 cm with `maxLikelyPreySizeCm 15`).

**Tank tiers (L×W in inches):**

| Tier | Footprint |
|---|---|
| 125 gal | 72×18 |
| 180 gal | 72×24 |
| 240 gal | 96×24 |
| 300 gal | 96×24 |
| 500 gal | 120×36 |
| 600 gal | 120×36 |
| 800 gal | 144×36 |
| 1,000 gal | 144×48 |

**Headline:** by the sources, four of these six fit the existing 180-gallon tier: the oscar (one fish), the clown loach (a group of 5–6), the fahaka and the ornate bichir. The black ghost knifefish goes to 240 gal under the conservative rule. Only the silver arowana truly needs a 500-gallon tank. See each "Smallest tank tier" section.

---

## Oscar
*Astronotus ocellatus* (Agassiz 1831) · proposed group `cichlid` · breeds in the game (`substrate_spawner`)

**Name check.** CoF lists *Astronotus ocellatus* (Agassiz 1831), originally *Lobotes ocellatus*, as valid. The genus has three valid species: *A. ocellatus*, *A. crassipinnis* and *A. mikoljii* (described 2022). SF and Aquarium Glaser note further cryptic lineages, and trade oscars may carry genes from more than one of them. The trade name is fine.

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Astronotus-ocellatus.html) | 1 | **45.7 cm TL max** (40 cm TL in the Biology text), common 24 cm; 1.6 kg; Lm 12 cm; 22–25 °C, pH 6.0–8.0, dH 5–19; quiet mud- and sand-bottomed waters; eats small fish, crayfish, worms and insect larvae; both parents clean the site and guard eggs "usually in the thousands"; **hatch 3–4 days**, fry moved to a sand pit for 6–7 days; IUCN LC (4 Nov 2020) |
| [Animal Diversity Web](https://animaldiversity.org/accounts/Astronotus_ocellatus/) | 1 | adults 30–40 cm; **maturity ~10–14 months at 15–25 cm**; monogamous; 3–4 cycles a year; **300–3,000 eggs** (small females 300–500, large 2,500–3,000); **hatch 2–3 days** (46–58 h in an induced study); larvae 3.25 mm; both parents guard and move the young to pits; young independent at 8–12 months; lateral display and jaw-locking; sexes alike, told apart by the breeding tube; needs dietary vitamin C; spawns above 25 °C |
| [Catalog of Fishes](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?tbl=species&genus=Astronotus) | 1 | valid name; three valid *Astronotus* species |
| [USGS NAS fact sheet](https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=436) | 1 | **established in south Florida, Hawaii and Puerto Rico**; lower lethal temperature 12 °C; may compete with and eat native fish; selective breeding has made several colour variants |
| [Wang et al. 2022, Comp. Biochem. Physiol. D](https://pubmed.ncbi.nlm.nih.gov/34864613/) *(PubMed abstract)* | 1 | albino oscars have a degenerate pigment layer with little melanin and immature melanosomes; 109 genes expressed differently; **no inheritance data** |
| [Hydrobiologia 2022, amelanism in the oscar](https://link.springer.com/article/10.1007/s10750-022-04921-w) *(abstract via search index)* | 1 | the "normal" and amelanistic forms differ in tyrosine-metabolism genes (*tyr*, *tyrp1*); no crossing data |
| [Syam et al. 2019, WAS Asian-Pacific Aquaculture](https://was.org/Meeting/Program/PaperDetail/153650) *(conference abstract)* | 1 | albino, common and red oscars are genetically distinct strains, the red the most distant; on a carotenoid-free diet the red fades and the albino's yellow stays stable |
| [Seriously Fish](https://www.seriouslyfish.com/species/astronotus-ocellatus/) | 2 | **350 mm SL**; **150×60 cm (≈143 gal) just large enough for ONE adult**; 20–28 °C, pH 6.0–7.5, 5–20 dGH; heaters get broken (use external ones); greedy and begs; no beef heart or chicken; feeder fish not recommended; **juveniles black with white stripes**; females show an ovipositor; up to 2,000 eggs; raise ~6 young and let a pair form; forms tiger, red, red tiger, albino, albino tiger; long-fins are less competitive; mass-bred in E. Europe and the Far East; 10–20 years |
| [Practical Fishkeeping, "Night of the Oscars"](https://www.practicalfishkeeping.co.uk/features/night-of-the-oscars/) | 2 | **adults need 180×60×60 cm (6×2×2 ft)**; aquarium adults 25–30 cm, wild 45 cm; 22–25 °C, lethal near 13 °C; feed twice a day, 85–90 % meaty; digs pits and moves substrate; uproots plants; breaks heaters; **leaps, so needs a cover**; plays possum; subordinates go dark with pale bars; avoids fights with fish over 75 % of its size; tankmates silver dollars, large plecos, **stingrays, arowana**; farmed varieties tiger, red, albino tiger, albino red, **lutino**, sunshine, golden, super red, plus blueberry and strawberry; long-finned and balloon forms; dyed or injected fish condemned |
| [Aquarium Co-Op](https://www.aquariumcoop.com/blogs/aquarium/oscar-fish-care-guide) | 2 | 25–30 cm, two-thirds grown in 6–12 months; 23–27 °C, pH 6–8; recognises its owner, begs, can be hand-fed; rearranges decor; **sulks on the bottom after water changes**; no small fish or invertebrates; varieties tiger, albino, red, **lemon**, black-and-white, long fin; vent sexing at 1–1.5 years; **$7–9 small, $15+ larger** |
| [LiveAquaria, Tiger Oscar](https://www.liveaquaria.com/products/tiger-oscar) | 2 | 12 in; 70 gal minimum (100 for breeding); 72–77 °F, pH 6–8, dKH 5–19; deep sand and a few large rocks; digs up plants; **juveniles cluster tightly**; spawns at 79–86 °F, 1,000–2,000 eggs on cleaned rocks; **$36.99** (1–3 in) |
| [LiveAquaria, Longfin Oscar](https://www.liveaquaria.com/product/6604/?pcatid=6604) | 2 | ornamental long-fin variant; $24.99 |
| [Quality Marine, Lemon Longfins](https://www.qualitymarine.com/news/oscar-isnt-that-grouchy-lemon-longfins/) | 2 | lemon long-fin is a recent selectively bred form; varieties albino, ruby, copper, blue, orange, tiger; **long-fins stay smaller (8–10 in)**; 125 gal for a pair; 72–78 °F; recognises keepers; digs |
| [Aquarium Glaser, Red, Albino Red and Red Chili](https://www.aquariumglaser.de/en/fisharchive/astronotus-red-albino-red-and-red-chili/) | 2 | Red: dark head and fins, copper-red scales, some nearly black; Albino Red: red eyes, red body, fins keep a black pattern; **Red Chili descends from Albino Red and is coloured more intensely**; "naturally very variable in colour" |
| [Aquarium Glaser, *A. mikoljii*](https://aquariumglaser.de/en/fisharchive/astronotus-mikoljii-4) | 2 | genus taxonomy; hybrids possible in transplanted stocks |
| [Wikipedia](https://en.wikipedia.org/wiki/Oscar_(fish)) | 3 | juveniles have wavy white and orange bands and spotted heads; ocelli on the tail base and dorsal fin; trade forms with more red, albino, **leucistic and xanthistic**; long fins recent; "painting" (dye); thanatosis; maturity ~1 year |
| [Oscar Fish Lover](https://oscarfishlover.com/albino-oscar-fish/), [MFK "Oscar genetics"](https://www.monsterfishkeepers.com/forums/threads/oscar-genetics.493386), [Aquariadise](https://www.aquariadise.com/types-of-oscar-fish/) | 3 | albino said to be **simple recessive** (no crossing data); lutino said to be a separate recessive; one keeper's long-fin × long-fin pairs threw short-finned young; blueberry = dyed albino |

**Modelled as:**
- a 35 cm adult; 180 gal with a **72×24 in footprint** (PFK's 6×2 ft for adults)
- `outgrowsSmallTanks`, `heavyWaste`, `escapeArtist` (PFK: leaps, needs a cover)
- plants unsafe; `freshwater_tropical` only (it uproots and shreds plants)
- a predator of anything that fits in its mouth: `maxLikelyPreySizeCm 10` (derived; PFK says it avoids fish over 75 % of its size)
- one per tank or a bonded pair; breeds as a `substrate_spawner`: both parents guard, 300–3,000 eggs, hatch in 3 days (24 game h)
- colour loci: line-bred red (tiger/red), recessive albino, lutino and long fin, each with its evidence level stated

**Conflicts:**
- **Size.** FishBase gives 45.7 or 40 cm TL, SF 35 cm SL, aquarium adults 25–30 cm (PFK, Co-op). The game uses 35 cm.
- **Tank.** LA says 70 gal, Co-op 75 gal for one, QM 125 for a pair, SF 143 gal for one, PFK 6×2×2 ft. The game uses PFK's footprint, the conservative choice.
- **Hatch time.** FishBase gives 3–4 days and ADW 2–3, so the game uses 3 days.
- **Temperature.** Most sources give 22–25/26 °C; SF and Co-op give up to 27–28. Ideal 22–26, tolerated 20–30.
- **Albino inheritance.** Recessive is only a hobby claim (Tier 3). The Tier 1 papers describe the albino's skin, not how the trait passes on. It is modelled as recessive with a confidence note, which is the usual pattern for fish albinism but not documented for oscars.
- **Varieties.** QM lists "blue"; Aquariadise says blue is real but rare and that blueberry is dyed. No reliable source separates a real blue from a dyed one, so blue is left out.
- **Tankmates.** QM suggests danios as tankmates, which conflicts with SF, Co-op and LA (small fish are eaten). The game follows the majority.

### Proposed game data
```ts
{
  id: 'oscar',
  commonName: 'Oscar',
  scientificName: 'Astronotus ocellatus',
  category: 'fish',
  group: 'cichlid',                          // with angelfish, discus, ram
  genus: 'Astronotus',
  environment: 'freshwater',
  waterClasses: ['freshwater_tropical'],     // not planted: uproots and shreds plants (PFK, Co-op, LA)
  nativeRegion: 'Western Amazon and Orinoco basins (Peru, Colombia, Ecuador, Brazil, Venezuela, the Guianas), in quiet, shallow, mud- or sand-bottomed water',
  isStarter: false,
  adultSizeCm: 35,                           // SF 35 cm SL; FishBase 40–45.7 TL; aquarium adults 25–30 (PFK, Co-op)
  recommendedMinTankGallons: 180,            // PFK 180×60×60 cm (≈171 US gal) for adults; SF ≈143 gal for ONE
  recommendedFootprint: { minLengthIn: 72, minWidthIn: 24 }, // PFK 6×2 ft
  activeSwimmer: false,
  bioload: 10,                               // derived: messy 35 cm cichlid (comet goldfish 25 cm = 8)
  tempC: { min: 20, max: 30, idealMin: 22, idealMax: 26 }, // FishBase/PFK/LA 22–25, QM 22–26, Co-op 23–27, SF 20–28; lethal ~12–13 (USGS, PFK)
  pH: { min: 6.0, max: 8.0, idealMin: 6.5, idealMax: 7.5 }, // FishBase/LA/Co-op 6–8; SF/PFK 6.0–7.5
  salinitySG: null,
  gh: { min: 5, max: 20 },                   // SF/PFK 5–20; FishBase 5–19
  kh: { min: 5, max: 19 },                   // LA "dKH 5–19" (looks like FishBase's dH copied; low confidence)
  flowPreference: 'low',                     // QM: strong filtration "without strong current"; Co-op: gentle current
  lightPreference: 'dim',                    // PFK: dimmer conditions suit them
  diet: 'omnivore',                          // ADW; PFK 85–90 % meaty, 10–15 % greens or fruit
  foods: ['pellet_large', 'pellet_sinking', 'earthworm', 'snail_live', 'vegetable', 'bloodworm'], // + proposed 'insect', 'seafood' (see cross-species notes)
  feedingStyle: 'hunter',                    // suction feeder (Wikipedia); takes food at every level
  feedingSpeed: 0.85,
  feedingAggression: 0.8,                    // greedy, begs (SF, Co-op)
  hungerHours: 24,                           // PFK: two small meals a day (derived)
  activityZone: ['middle', 'lower', 'bottom'],
  temperament: 'predatory',                  // SF "predatory"; LA semi-aggressive
  territoriality: 0.6,                       // ADW: territorial, dominance hierarchies
  aggression: 0.45,                          // SF "not especially aggressive for a cichlid of its size"; aggressive when spawning (Co-op)
  finNipper: 0,
  hasLongFins: false,                        // the long-fin phenotype sets it (see genetics)
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 1, note: 'One, or a pair that formed by itself from a group of young (SF, Co-op). Oscars grow less tolerant of their own kind with age (PFK), and a pair bullies a third (Co-op).' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'tension', mixed: 'courtship_ok', juvenile: 'ok', note: 'Young cluster tightly (LA). Adults jaw-lock over mates and territory (ADW), and a new oscar of similar size added to a resident is attacked (PFK).' },
  predatorTags: ['fish_tiny', 'fish_small', 'fish_medium', 'fish_benthic', 'fry', 'eggs', 'shrimp_dwarf', 'shrimp_fry', 'shrimp_large', 'crustacean', 'snail', 'snail_small', 'worm', 'amphibian', 'amphibian_larva'], // FishBase: fish, crayfish, worms, larvae; ADW: snails, shrimp; Co-op: no small fish or inverts
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 10,                   // derived; PFK: avoids fish over 75 % of its size; SF: no much-smaller fish
  shrimpSafe: 'unsafe', snailSafe: 'unsafe', frySafe: 'unsafe',
  plantSafe: 'unsafe',                       // PFK: uproots or shreds; even large floating plants destroyed
  reefSafe: 'unsafe', coralRisk: 0, anemoneRelationship: 'not_applicable',
  hidesNeeded: 1,                            // LA: "a few large rocks"
  coverPreference: 0.2,
  substrateRules: { preferred: ['sand', 'fine_sand', 'large_pebbles'], avoid: [], note: 'Deep sand and a few large rocks (LA). It digs pits and piles substrate at one end (PFK), so use heavy rounded decor and an external or guarded heater (SF, PFK).' },
  breeding: {
    system: 'substrate_spawner',
    difficulty: 0.55,
    maturityDays: 22,                        // ADW 10–14 months
    clutchSize: { min: 300, max: 3000 },     // ADW; LA 1,000–2,000; SF up to 2,000
    incubationHours: 24,                     // 3 days × 8 (ADW 2–3 d, FishBase 3–4 d)
    fryRearingHours: 150,                    // 6–7 days in pits (FishBase) = 56 h to free-swimming, then grow-out (matches the angelfish)
    cooldownDays: 12,                        // ADW 3–4 cycles a year (derived)
    conditions: { needsPartner: true, needsNestSite: true, minTempC: 26, needsConditioningFood: ['earthworm'], minTankGallons: 180 }, // LA spawns at 79–86 °F; ADW above 25 °C
    predationWithoutNursery: 0.6,
    nurseryRequired: false,
    maxRaisedPerClutch: 12,
    notes: 'A pair cleans a flat rock and lays hundreds to thousands of adhesive eggs. Both parents guard; the female fans the eggs. Wrigglers are moved to pits in the sand for about a week, and the parents guard the free-swimming young for weeks (FishBase, ADW). Fry take baby brine shrimp (Co-op). Parents may eat fry left too long (Co-op).',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'both',
  lifecycle: { juvenileDays: 20, adultDays: 22, lifespanDays: 500, sexVisibleAtDays: 22, hatchSizeCm: 0.33 }, // 10–20 y (SF, Co-op) → cap; larvae 3.25 mm (ADW); sexes alike, only the breeding tube (ADW)
  hardiness: 0.85,                           // PFK: easy, hardy, tolerant
  difficulty: 'intermediate',                // easy fish, hard tank size
  baseValue: 35,                             // LA $36.99 (1–3 in); Co-op $7–15; longfin $24.99
  rarity: 'common',
  visitorAppeal: 0.85,
  captiveBredAvailable: true,
  wildCaughtNote: 'Trade oscars are mass-bred in Eastern Europe and the Far East (SF).',
  conservation: { status: 'Least Concern (IUCN, assessed 2020)', note: 'Established as an invasive species in south Florida, Hawaii and Puerto Rico from aquarium-farm stockings and releases (USGS NAS). Never release one.' },
  special: { outgrowsSmallTanks: true, heavyWaste: true, escapeArtist: true },
  behaviorSet: 'cichlid_large',              // NEW (closest existing: cichlid_discus); see Behaviour
  behaviorTraits: { cruiseSpeed: 0.35, burstSpeed: 5, turnRate: 1.8, hoverTendency: 0.55, schoolingTightness: 0, restOnBottom: 0.25, hitching: 0, burrowing: 0.2, glassSurfing: 0.05, curiosity: 0.95, nocturnal: 0.1 }, // derived
  specialBehaviors: ['beg_at_glass', 'owner_recognition', 'dig_pit', 'move_decor', 'sulk_on_bottom', 'play_dead', 'lateral_display', 'jaw_lock', 'subordinate_darken', 'heater_bump'],
  visualLane: 'fish',
}
```

**Genetics (loci in words).** Every form is *A. ocellatus*. The hobby treats them as farm strains (SF, PFK, QM "decades of aquaculture").

1. **`red`, red marbling (line-bred; polygenic in reality).** Two alleles: `w` wild marbling and `R` red line.
   - Encoded as codominant: `ww` Wild, `wR` **Tiger** (black ground with bold orange-red marbling, the commonest trade form per Aquariadise and PFK), `RR` **Red** (dark head and fins, flanks mostly copper-red; Aquarium Glaser).
   - Suggested frequency R 0.55.
   - Evidence: SF, PFK and Glaser name the forms. Syam et al. 2019 show the red is a genetically distinct strain whose red fades without carotenoids. No source documents single-gene inheritance, so this is a simplification of a line-bred trait, like the goldfish colour ladder. Say so in `confidenceNotes`.
   - "Super red" (PFK) is a trade name for the strongest reds, best handled as Red with the intensity overlay.
2. **`albino`, amelanism (recessive, hobby-reported).** `+` dominant (frequency 0.75), `a` recessive (0.25), mendelian.
   - `aa` removes all black: a white-to-cream ground, red eyes (Glaser), and the red marbling remains.
   - Combined with `red` this gives **Albino** (`ww`), **Albino Tiger** (`wR`) and **Albino Red** (`RR`).
   - Strain **Red Chili** = Albino Red plus the rich-colour overlay. Glaser: a recent line descended from Albino Red, coloured more intensely.
   - Evidence: the albino phenotype is Tier 1 (Wang 2022; Hydrobiologia 2022: little melanin, tyrosine-metabolism genes). Recessive inheritance is Tier 3 only.
3. **`lutino`, lemon/lutino (inheritance unknown).** `+` (0.93), `l` (0.07), recessive by the only claim found (Oscar Fish Lover, Tier 3).
   - `ll` gives a solid lemon-yellow body and pale fins, and hides the tiger/red marbling (Aquariadise "solid, bright yellow"; Co-op "lemon"; PFK "lutino"; QM "Lemon Longfin").
   - Eye colour is disputed, so draw a dark eye; only a true albino has the pink-red eye.
   - Mark the allele `rare: true`; Aquariadise says lemons are usually pricier.
4. **`fin`, long fin (inheritance unknown).** `s` standard (0.9), `L` long-fin (0.1).
   - Proposed as dominant: one MFK keeper's long-fin × long-fin pairs throwing short-finned young fits a dominant gene carried in one copy, but there are no counts.
   - `L` present gives `finType: 'longfin'`, `finLength ~1.5`, `hasLongFins` behaviour.
   - Welfare: SF says long-fins are "slightly less competitive"; QM says they stay smaller (8–10 in).
5. No intensity locus is needed beyond an optional `intensityOverlay` for Red Chili or Super Red.

**Left out on purpose:**
- **blueberry, strawberry and other dyed, painted or injected fish:** PFK condemns them; Wikipedia ("painting"); Aquariadise (blueberry = dyed albino).
- **balloon oscars:** PFK lists them, but a balloon body is a deformity-based shape.
- **blue:** QM names it and Aquariadise says it is real, but nothing separates it from dye.
- **leucistic and black-and-white:** named only by Wikipedia and Co-op, with no description or inheritance.
- **"sunshine", "golden", "copper", "ruby", "orange":** trade names (PFK, QM) with no definition. Map them to Tiger, Red or Lutino if a name is wanted.
- **hybrids with other *Astronotus*:** possible in transplanted stocks (Glaser).

**baseVisual (wild type)**, from FishBase, Wikipedia and PFK descriptions:

| Field | Value | What it draws |
|---|---|---|
| `bodyColor` | `#3b3a2c` | dark olive-brown |
| `bodyColor2` | `#56502f` | olive back |
| `bellyColor` | `#6f6040` | |
| `finColor` | `#2e2c24` | |
| `finColor2` | `#3e3a2c` | |
| `accentColor` | `#d4562c` | orange-red blotches, and the ring of the tail ocellus |
| `eyeColor` | `#b8432a` | red-orange iris; from photographs, no text source |

Also: `pattern: 'mottled'` (Tiger and Red: `'marble'`), `patternContrast 0.7`, `finType 'standard'`, `iridescence 0.1`, `metallic 0.1`.

The art needs the **ocellus**: a black eyespot ringed with orange or yellow at the tail base, sometimes also on the dorsal fin (PFK, Wikipedia). PFK says double eyespots occur in about 0.5 % of wild fish.

**visualMorphs:** Wild, Tiger, Red, Albino, Albino Tiger, Albino Red, Lutino (Lemon), Long-fin.

### Young and sexes
- **Juveniles (2–8 cm):** high-contrast. SF says black with white stripes; Wikipedia says wavy white and orange bands and a spotted head. Draw dark with wavy pale bands and a speckled head, then fade to the adult blotching by ~15 cm (ADW: colour changes with stage).
- **Adults:** dark olive with orange-red blotches and the ocellus. Colours intensify when spawning (ADW).
- **Subordinates:** turn darker with irregular pale bars (PFK). This is a mood state, useful for a losing or stressed fish.
- **Sexes:** look alike (ADW: monomorphic). Males may grow faster (ADW). Some wild strains show dark blotches at the dorsal-fin base in males (Wikipedia). The breeding tubes differ (female short and blunt, male long and pointed; ADW) and show only at spawning (SF: ovipositor).
- **Art:** one adult look per form, plus a juvenile look.

### Behaviour
- **Swimming:**
  - a deep-bodied cichlid that hovers and cruises slowly in mid and lower water on its pectorals, with short fast lunges to inhale prey (suction feeding)
  - large adults are "less territorial than most cichlids" (LA)
  - zone: middle to bottom
- **Signature behaviours:**
  - **begging:** the oscar of "begging at the glass" fame. It recognises its keeper, greets them at the front glass, begs even when full and takes food from the hand (Co-op, SF, QM).
  - **digging and redecorating:** digs pits, moves substrate to one end, uproots plants and shifts decor (PFK, Co-op, QM). It may knock or break in-tank heaters (SF, PFK).
  - **sulking:** lies on the bottom for a while after water changes or decor changes (Co-op).
  - **playing possum:** wild oscars lie on their side on the substrate as an ambush (PFK, Wikipedia: thanatosis). A rare idle, distinct from sickness.
  - **fights:** lateral display with tail beats is the most common response to an intruder (ADW); pairs and rivals jaw-lock (ADW); a fish that loses turns dark (ADW, PFK).
  - **leaping:** at objects and keepers (PFK).
  - **young** cluster tightly (LA).
- **Rest:** diurnal; prefers dim light (PFK).
- **Behaviour set:** the closest existing set is `cichlid_discus` (cruise and hover), but it has no digging, decor moving, begging or bottom sulks. Propose a new **`cichlid_large`**: a big-bodied cichlid that hovers and patrols, `beg`/`inspect_glass` weighted high, a `dig_pit` act that disturbs substrate, an occasional `play_dead`, and a sulk rest on the bottom after a water change. It could later serve other large cichlids.

### Compatibility
| Other | Verdict | Reason (sources) |
|---|---|---|
| Clown loach | conditional | Adult loaches (15–30 cm) are too big to eat, but 5–8 cm juveniles fit an oscar's mouth (SF: no much-smaller fish). Clown loaches "do not do well with larger, dominant fish" (Wikipedia). Water overlaps at 24–27 °C. Mitigated by tank_size and hides. |
| Black ghost knifefish | conditional | SF lists South American cichlids as BGK tankmates, but PFK says avoid boisterous cichlids that could damage its skin, and an oscar that digs and moves decor is boisterous. Only a large BGK, with sight breaks. |
| Fahaka puffer | incompatible | The fahaka bites chunks out of tankmates; keep it alone (SF, PEW, LA). |
| Ornate bichir | usually_compatible | Size-matched adults coexist: SF's bichir tankmates include large cichlids. A small bichir is eaten by an oscar, and an adult bichir eats a small oscar (LA: swallows anything that fits). Oscars outcompete it for food, so target-feed the bichir. |
| Motoro stingray | usually_compatible | PFK lists stingrays as oscar tankmates. SF (ray page) warns rays fail beside very aggressive fish. Oscars dig and compete at the bottom, so it needs a big footprint. |
| Silver arowana | usually_compatible | PFK lists arowana as oscar tankmates; they use different zones. LA: young arowana are "easily harassed by more aggressive species such as cichlids", so add the arowana big. |
| Koi | incompatible | A cold-water pond carp (`freshwater_cool`); the oscar needs 22–26 °C and suffers below 20 (PFK, LA). |
| Silver mono, spotted scat | incompatible | Brackish to marine as adults; the oscar is a freshwater fish. |
| All marine species | incompatible | Salinity. |
| Tetras, rasboras, danios, white cloud, medaka | incompatible | Eaten (SF, Co-op, LA "will eat anything that fits"). White cloud and medaka are also cool-water. |
| Guppy, endler, platy, sailfin molly | incompatible | Eaten. SF says feeder livebearers are not recommended. |
| Swordtail (11 cm) | high_risk | A `fish_medium` prey size for a 35 cm oscar. |
| Corydoras, kuhli loach, otocinclus | incompatible | Small bottom fish are swallowed. |
| Bristlenose pleco | conditional | SF and Co-op name "larger loricariid" catfish and "certain plecos" as tankmates. A 12 cm bristlenose is at the edge; fine as an adult with caves. |
| Hillstream loach | incompatible | Cool fast water, and small. |
| Gouramis, betta | incompatible | Eaten. |
| Angelfish | conditional | SF: "other cichlids" are suitable, but young angels (≤5 cm body) are eaten, and adults' tall fins draw harassment. Only adult angels in a large tank. |
| Discus | high_risk | Discus need 28–30 °C, soft clean water and calm (existing data). The oscar's ideal is 22–26 and it is messy and boisterous. |
| German blue ram | incompatible | Eaten. |
| Dwarf shrimp, Amano, ghost shrimp | incompatible | Eaten (Co-op; ADW shrimp in diet). |
| Mystery, nerite, ramshorn snails | incompatible | Eaten (ADW; Co-op feeds live snails). |
| Dwarf crayfish | incompatible | Eaten (FishBase: crayfish in diet). |
| Goldfish (comet, fancy) | incompatible | Cool water; fancy goldfish slow, and both get eaten while small. |
| Axolotl, African dwarf frog | incompatible | Cool water (axolotl); amphibians eaten. |
| Pea puffer | incompatible | Eaten. |
| Brackish roster (archerfish, bumblebee goby, figure-eight) | incompatible | Salinity, and predation. |

**Proposed `exceptionRules`:**
- `tag:fish_tiny` and `tag:fish_small`: incompatible, incidentRisk 0.5 / 0.35.
- `tag:fish_medium`: high_risk, 0.1, mitigatedBy `tank_size`, `hides`.
- `tag:shrimp_dwarf`: incompatible, 0.5.
- `tag:crustacean`: high_risk, 0.2.
- `tag:snail`: high_risk, 0.15.
- `tag:amphibian`: incompatible, 0.4.
- `discus`: high_risk, "needs warmer, cleaner, calmer water than an oscar tank gives".
- `freshwater_angelfish`: conditional, mitigatedBy `tank_size`.
- `fahaka_puffer`: incompatible.

### Smallest tank tier for an adult
**180 gal (72×24×25 in)** for one adult: it meets PFK's 6×2 ft and SF's 150×60 cm. A pair, or an oscar with large tankmates, should go in the **240 gal (96×24)**. The 125 gal tier fails on width (18 in < 24).

---

## Clown loach
*Chromobotia macracanthus* (Bleeker 1852) · proposed group `loach` · `not_in_game` breeding (hormone-induced only)

**Name check.** CoF: valid as *Chromobotia macracanthus* (Bleeker 1852), originally *Cobitis*. Kottelat moved it from *Botia* to the monotypic *Chromobotia* in 2004 (SF). LA still lists it as *Botia macracantha*, an outdated name.

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Chromobotia-macracanthus.html) | 1 | **30.5 cm TL**, 469 g; **Lm ~20 cm**; 25–30 °C, pH 5.0–8.0, dH 5–12; main river channels under rocks and wood; juveniles on floodplains; Sumatra and Borneo; eats worms, crustaceans, plants; breeds at the start of the rains in fast rivers; groups of 5+, tank ≥150 cm long; IUCN LC (28 Nov 2019) |
| [Legendre et al. 2012, Aquat. Living Resour. 25:95–108](https://www.cambridge.org/core/product/7C17B5FF5CE8B86FF03F32B10D26ABAC) *(abstract)* | 1 | captive breeding by **hormone injection** (two Ovaprim shots, or hCG then Ovaprim); 112 females of 46–404 g; **76,000–109,000 ova per kg**; ova ~0.8 mg; Borneo stock does worse than Sumatra |
| [Catalog of Fishes](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?tbl=species&genus=Chromobotia) | 1 | valid name |
| [Seriously Fish](https://www.seriouslyfish.com/species/chromobotia-macracanthus/) | 2 | **400 mm SL max**; **180×60 cm (≈171 gal) minimum for a group**; 24–30 °C, pH 5.0–7.0, 1–12 dGH; well-oxygenated, flowing water; at least 5–6, preferably 10+; **jumps: tight lid**; audible clicking; rests wedged in decor or lying flat; "shadowing"; "loachy dance"; "greying out" in dominance fights; sub-ocular spines; nips slow long-finned fish; not a dependable snail-eater; females fuller and larger, males perhaps more forked tails (unproven); Borneo fish have black pelvic fins, Sumatran fish red; **hormone breeding on SE Asian and Czech farms; home breeding undocumented**; >20 years; "skinny disease"; collecting large fish illegal in Indonesia; up to 10,000,000 drifting larvae collected and grown on in Sumatra each year; Botia × Chromobotia hybrids on sale |
| [Aquarium Co-Op](https://www.aquariumcoop.com/blogs/aquarium/clown-loach-care-guide) | 2 | 30–33 cm adults in their care; slow growth; 55 gal only until ~6 in; 28–30 °C; the more the better (3 hide, 30 stay out); clicks; **sleeps on its side**; piles into corners; most active at dawn and dusk; **prone to ich**; eats snails ("expensive pet snails will likely be eaten"); avoid animals that fit in its mouth; males redder fins and slimmer |
| [LiveAquaria](https://www.liveaquaria.com/products/clown-loach) | 2 | 12 in; **100 gal**; 72–86 °F, pH 6.0–7.5, dKH 8–12; **strong water movement**; shies from bright light; "voracious eater of nuisance snails"; small meals several times a day; small embedded scales; **$29.99** (2.5–3.5 in) |
| [Practical Fishkeeping news](https://www.practicalfishkeeping.co.uk/fishkeeping-news/fishkeeper-successfully-breeds-clown-loach/) | 2 | a Russian professional breeder spawned it only with **pituitary injections** and hand-stripping; **eggs hatched in 18 h at 26.5 °C**; fry fed *Artemia* a day later; **fry show a 4th band that fades to the adult three**; broodfish 8 years old, 12–15 cm |
| [PFK, how long will my fish live?](https://www.practicalfishkeeping.co.uk/fishkeeping-news/how-long-will-my-fish-live/) | 2 | owner-reported 24 years |
| [PFK, 39 top tips](https://www.practicalfishkeeping.co.uk/features/articles/39-top-tips-for-fishkeepers) | 2 | copper medications harm "scaleless fish like some loaches" |
| [Wikipedia](https://en.wikipedia.org/wiki/Clown_loach) | 3 | **three thick black triangular bands** on a whitish- to reddish-orange body; clicks by grinding pharyngeal teeth; spawns in captivity only after hormones; eats bladder snails |
| [Guidarium, clown loach and discus](https://guidarium.com/compatibility/clown-loach-and-discus) *(Tier 3)* | 3 | "possible with caution": outcompetes discus at feeding |

**Modelled as:**
- a 30 cm adult, active shoaling bottom-dweller; 180 gal with a **72×24** footprint (SF's group minimum); 240 for the ideal 8–10
- min group 5, ideal 8
- snails `unsafe` (eaten), dwarf shrimp `unsafe`, mild nipper of long fins
- `needsSinkingFood`, `escapeArtist` (SF jumps), `medicationSensitive` (PFK, low confidence), `outgrowsSmallTanks`
- breeding `not_in_game`: hormone-induced only (Legendre 2012, SF, PFK, Wikipedia)
- intensity locus, plus an optional Borneo locality overlay

**Conflicts:**
- **Size.** FishBase gives 30.5 cm TL, SF 40 cm SL (wild), Co-op 30–33 cm kept, and Wikipedia 15–20 cm typical in aquaria. The game uses 30 cm, the conservative figure.
- **Tank.** LA says 100 gal, FishBase ≥150 cm long, SF 72×24. The game uses SF's.
- **Water.** LA gives dKH 8–12 with pH 6–7.5, which fights SF's soft water (1–12 dGH, pH 5–7). The game uses kh 1–12.
- **Temperament.** FishBase says "aggressive", LA semi-aggressive, SF "not especially aggressive". The game uses semi_aggressive with low aggression toward others.
- **Breeding.** Co-op gives conditioning and trigger water values and says eggs are scattered, but documents no aquarium spawning. The confirmed record is hormones only.
- **Lifespan.** SF says >20 years, PFK 24 (owner-claimed), Wikipedia up to 30 (disputed). Capped at 500 game days either way.

### Proposed game data
```ts
{
  id: 'clown_loach',
  commonName: 'Clown Loach',
  scientificName: 'Chromobotia macracanthus',
  category: 'fish',
  group: 'loach',                            // with kuhli loach
  genus: 'Chromobotia',
  environment: 'freshwater',
  waterClasses: ['freshwater_tropical', 'freshwater_planted'], // plants caution: SF wild diet includes soft plants
  nativeRegion: 'Indonesia: Sumatra and Borneo, in the main channels of large rivers; young on flooded plains',
  isStarter: false,
  adultSizeCm: 30,                           // FishBase 30.5 TL; Co-op 30–33; SF 40 SL wild max
  recommendedMinTankGallons: 180,            // SF 180×60 cm (≈171 gal) for a group; FishBase ≥150 cm long
  recommendedFootprint: { minLengthIn: 72, minWidthIn: 24 },
  activeSwimmer: true,                       // SF: "loachy dance"; needs swimming room
  bioload: 6,                                // derived
  tempC: { min: 24, max: 30, idealMin: 26, idealMax: 29 }, // SF 24–30; FishBase 25–30; Co-op 28–30; LA 22–30
  pH: { min: 5.0, max: 7.5, idealMin: 6.0, idealMax: 7.0 }, // SF 5.0–7.0; LA 6.0–7.5; FishBase 5–8
  salinitySG: null,
  gh: { min: 1, max: 12 },                   // SF 1–12 dGH; FishBase dH 5–12
  kh: { min: 1, max: 12 },                   // LA dKH 8–12 conflicts with SF's soft water; combined
  flowPreference: 'moderate',                // LA "strong water movement"; SF well-oxygenated flowing water
  lightPreference: 'dim',                    // LA shies from bright light; Co-op dawn/dusk active
  diet: 'omnivore',                          // FishBase worms, crustaceans, plants; SF mainly carnivorous plus veg
  foods: ['pellet_sinking', 'pellet_small', 'flake', 'bloodworm', 'brine_shrimp', 'snail_live', 'vegetable', 'earthworm'], // SF, Co-op, LA, Wikipedia
  feedingStyle: 'bottom',
  feedingSpeed: 0.8,
  feedingAggression: 0.55,                   // Guidarium (T3): outcompetes discus at food
  hungerHours: 16,                           // LA: small meals several times a day; Co-op: feed heavily (derived)
  activityZone: ['bottom', 'lower', 'decor'],
  temperament: 'semi_aggressive',            // LA; see conflicts
  territoriality: 0.2,
  aggression: 0.15,
  finNipper: 0.2,                            // SF: may nip slow long-finned fish
  hasLongFins: false,
  social: { kind: 'shoal', minGroup: 5, idealGroup: 8, note: 'At least 5–6, better 10 or more (SF); kept singly or in pairs it turns withdrawn or aggressive. Three hide, six hide some of the time, thirty are always out (Co-op).' },
  sameSpeciesRule: { maleMale: 'ok', femaleFemale: 'ok', mixed: 'ok', juvenile: 'ok', note: 'Sparring sets a pecking order; a loser "greys out" for a while (SF). Young fish shadow the big ones (SF).' },
  predatorTags: ['snail', 'snail_small', 'shrimp_dwarf', 'shrimp_fry', 'fry', 'eggs', 'worm', 'copepod'], // LA/Co-op snails; Co-op: inverts that fit
  preyTags: ['fish_large', 'fish_benthic'],
  maxLikelyPreySizeCm: 2,                    // derived: small mouth; not a fish-eater
  shrimpSafe: 'unsafe', snailSafe: 'unsafe', frySafe: 'unsafe',
  plantSafe: 'caution',                      // SF: wild diet includes soft aquatic plants
  reefSafe: 'unsafe', coralRisk: 0, anemoneRelationship: 'not_applicable',
  hidesNeeded: 3,                            // Co-op "plenty of hides"; LA caves for sleeping
  coverPreference: 0.6,
  substrateRules: { preferred: ['sand', 'fine_gravel'], avoid: [], note: 'Caves, wood and gaps it can wedge into to rest (SF, LA). A tight lid: it jumps (SF).' },
  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 25,                        // Lm ~20 cm (FishBase); wild adults mature at 12–15 cm SL (SF); broodfish 3+ years (Co-op)
    clutchSize: { min: 3500, max: 44000 },   // 76k–109k ova/kg × 46–404 g females (Legendre 2012)
    incubationHours: 6,                      // 18 h at 26.5 °C (PFK news) = 0.75 d × 8
    fryRearingHours: 120,                    // placeholder; unused
    cooldownDays: 60,
    conditions: { needsPartner: true, minTankGallons: 1000 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Wild fish migrate up rivers to spawn at the start of the rains. In captivity they spawn only after hormone injections (Legendre et al. 2012; SF; PFK), done on farms in Southeast Asia and Eastern Europe. No natural aquarium spawning is documented, so the game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  lifecycle: { juvenileDays: 22, adultDays: 25, lifespanDays: 500, sexVisibleAtDays: 30, hatchSizeCm: 0.3 }, // >20 y (SF), 24 y (PFK) → cap; hatch size not found (placeholder)
  hardiness: 0.6,                            // ich-prone (Co-op), skinny disease in imports (SF)
  difficulty: 'intermediate',
  baseValue: 30,                             // LA $29.99 (2.5–3.5 in)
  rarity: 'common',
  visitorAppeal: 0.8,
  captiveBredAvailable: true,
  wildCaughtNote: 'Many trade fish are wild larvae netted as they drift down Sumatra’s Batang Hari and grown on (up to ~10 million a year, SF); hormone-bred fish from Southeast Asian and Czech farms are also sold.',
  conservation: { status: 'Least Concern (IUCN, assessed 2019)', note: 'Collecting large adults is illegal in Indonesia, and catches of young have fallen sharply since 2000 (SF).' },
  special: { needsSinkingFood: true, outgrowsSmallTanks: true, escapeArtist: true, medicationSensitive: true, maleSizeFactor: 0.9 }, // maleSizeFactor derived: SF females larger, no ratio given
  behaviorSet: 'loach_shoal',                // NEW (closest: bottom_forager without its air gulps); see Behaviour
  behaviorTraits: { cruiseSpeed: 0.8, burstSpeed: 6, turnRate: 3, hoverTendency: 0.2, schoolingTightness: 0.5, restOnBottom: 0.6, hitching: 0, burrowing: 0.1, glassSurfing: 0.1, curiosity: 0.6, nocturnal: 0.4 }, // derived
  specialBehaviors: ['click_sounds', 'side_rest', 'wedge_rest', 'pile_rest', 'loach_dance', 'shadowing', 'grey_out', 'snail_hunt', 'spine_raise'],
  visualLane: 'fish',
}
```

**Genetics.**
- No domestic colour forms exist.
- **Botia × Chromobotia hybrids** (SF) are left out on purpose.
- The species gets the generic intensity locus ("Richly coloured").
- **Optional locality overlay:** natural, not a trade morph, inheritance unstudied. SF and Wikipedia (citing Loaches Online) say Bornean fish have black or black-and-orange pelvic fins, and some have thin pale borders on the black bands; Sumatran fish have all-red pelvic fins. If wanted, add a `locality` locus: `sumatra` (0.9; most trade fish come from Sumatra's Batang Hari, SF) and `borneo` (0.1). `borneo` is mendelian dominant for drawing purposes only, with a note that it is a population difference, not a gene study.
- **baseVisual:**

  | Field | Value | What it draws |
  |---|---|---|
  | `bodyColor` | `#f2901e` | orange |
  | `bodyColor2` | `#e8761a` | |
  | `bellyColor` | `#f6b860` | |
  | `finColor` | `#e0341f` | red fins |
  | `finColor2` | `#141414` | black dorsal and caudal band edges |
  | `accentColor` | `#111111` | the three bands |
  | `eyeColor` | `#2a1a10` | inside the first band |

  Also: `pattern: 'bands'`, `patternScale 1`, `patternContrast 0.95`, `finType 'forked'`, `iridescence 0.05`.
- **Band positions:** wedge-shaped (Wikipedia: "triangular"). One through the eye; one in front of and into the dorsal fin; one from the caudal peduncle into the anal fin (SF: the Bornean peduncle band ends closer to the tail).

### Young and sexes
- **Young:** juveniles look like small adults. Hatchery fry show a **fourth band that fades**, leaving three (PFK breeder report), and show adult colour by about 5 weeks old. A shop juvenile can be drawn as an adult with a proportionally larger head.
- **Sexes:** females are fuller-bodied and larger than males of the same age (SF, Wikipedia). Males may have slightly inward-hooked caudal tips (SF: unproven; Wikipedia) and redder fins and slimmer bodies (Co-op).
- **Art:** an adult female drawn deeper-bodied, with `maleSizeFactor` about 0.9.

### Behaviour
- **Swimming:**
  - an active, deep-bodied bottom and lower-water shoaler that moves in bursts
  - younger fish swim "shadowing" a big one, sometimes several on each side (SF)
  - the whole group does the **"loachy dance"**: a restless swim up and down the glass and around the tank after feeding, a water change or new arrivals (SF). Not stress, unlike glass-surfing.
- **Rest (the signature):**
  - **lies flat on its side** on the substrate, or wedges between rocks or wood, which looks like a dead fish but is normal (SF, Co-op, Wikipedia)
  - several **pile on top of each other** in a tight corner or cave (Co-op)
  - most active at dawn and dusk (Co-op), shy of bright light (LA)
- **Sound:** audible clicks when excited or feeding (SF, Co-op, Wikipedia: pharyngeal teeth).
- **Defence:** raises the spines under its eyes when stressed or handled (SF), which can snag nets.
- **Feeding:** hunts snails and picks through the substrate (LA, Co-op).
- **Behaviour set:** the closest existing set is `bottom_forager` (shoal, rest bottom, forage), but that set gulps air like a corydoras and has no side-rest or pile-rest. `loach_eel` is for a thin, burrowing kuhli. Propose **`loach_shoal`**: a shoaling bottom forager with no air breaths, `rest: 'cave'` with a side-lying variant, `pile_rest`, a short group "dance" burst act, and `glassSurfing` read as play, not stress.

### Compatibility
| Other | Verdict | Reason (sources) |
|---|---|---|
| Oscar | conditional | See the oscar section: juveniles fit its mouth, and the loach does poorly beside large dominant fish (Wikipedia). |
| Black ghost knifefish | conditional | PFK: avoid boisterous fish that can damage the BGK's skin. Both want the same caves to rest by day, and both feed at dusk and night. |
| Fahaka puffer | incompatible | The fahaka attacks tankmates (SF, PEW). |
| Ornate bichir | conditional | An adult bichir swallows any fish that fits (LA, SF) and hunts the bottom at night where loaches lie on their sides. Only adult loaches over ~15 cm. |
| Motoro stingray | conditional | SF (ray page): rays are "unsafe to keep with most other species", and smaller fish get picked off at night. Both feed hard on the bottom. Needs a large footprint. |
| Silver arowana | usually_compatible | Different zones (bottom against surface). Juvenile loaches under ~15 cm are prey for an adult arowana. |
| Koi | incompatible | Koi are cold-water; the clown loach needs 24–30 °C. |
| Silver mono, scat, marine species | incompatible | Salinity. |
| Neon, cardinal tetra, harlequin rasbora | usually_compatible | Not a fish-eater (Co-op only warns about fish that fit in its mouth). Peaceful open-water fish are SF's recommended tankmates. Cardinals match its warm water; neons prefer 22–25 °C (existing data). |
| Zebra danio, white cloud, medaka | conditional / incompatible | Temperature: white cloud ideal 16–22 °C is incompatible; danio 19–24 and medaka 18–26 are conditional at the overlap. |
| Guppy, endler, platy, swordtail, sailfin molly | conditional | Guppies' long fins get nipped (SF names guppies). Platy, swordtail and molly are usually fine at 24–28 °C. |
| Betta | high_risk | SF names bettas: slow and long-finned, nipped. |
| Panda corydoras | conditional | Peaceful bottom company, but pandas want 21–24 °C (existing data) against the loach's 26–29, and the loaches win the food. |
| Bristlenose pleco, otocinclus | usually_compatible | SF lists "some catfish". Otos prefer 22–25 °C, so conditional for them. |
| Kuhli loach | usually_compatible | SF: "certain loaches" and most botiids are suitable; kuhlis are deep in the substrate. |
| Hillstream loach | incompatible | A cool-water fish (16–26, ideal 19–23). |
| Dwarf and honey gourami | conditional | Gouramis are slow, with long feelers; SF warns against slow fish. Usually fine in a big tank. |
| Angelfish | conditional | SF: may nip slow, long-finned cichlids; Guidarium "caution". |
| Discus | conditional | 28–29 °C overlaps, but loaches are boisterous and outcompete discus at feeding (Guidarium, Tier 3; an MFK keeper moved 12 loaches out of a discus tank). |
| German blue ram | conditional | The warm water fits, but small rams are crowded off food. |
| Dwarf shrimp | high_risk | Eaten (Co-op: inverts that fit). Cover helps. |
| Amano, ghost shrimp | conditional | Larger, but still picked at; no direct source. |
| Mystery, nerite, ramshorn snails | incompatible | Eaten: LA "voracious eater of nuisance snails", Co-op "pet snails will likely be eaten". Pest-snail control is its known use. |
| Dwarf crayfish | conditional | Small crayfish are eaten; a crayfish can pinch resting loaches (`fish_benthic`). |
| Goldfish, axolotl | incompatible | Cool water. |
| African dwarf frog | conditional | Slow feeders that get crowded off food; no source of predation. |
| Pea puffer | high_risk | The pea puffer nips; the loach outcompetes it. |
| Brackish roster | incompatible | Salinity. |

**Proposed `exceptionRules`:**
- `tag:snail`: incompatible, 0.3, "eats snails, including pet snails".
- `tag:shrimp_dwarf`: high_risk, 0.12, mitigatedBy `cover`.
- `tag:long_fins`: conditional, 0.04, "nips slow long-finned fish (SF)".
- `betta`: high_risk.
- `discus`: conditional, "outcompetes them at feeding".

### Smallest tank tier for an adult
**180 gal (72×24×25 in)** for a group of 5–6 adults (SF). Use **240 gal (96×24)** for the ideal 8–10. The 125 gal fails on width.

---

## Black ghost knifefish
*Apteronotus albifrons* (Linnaeus 1766) · proposed group `knifefish` · `not_in_game` breeding

**Name check.** CoF: valid as *Apteronotus albifrons* (Linnaeus 1766), originally *Gymnotus*. It is a species complex. *A. camposdapazi* (2006) and *A. caudimaculosus* are close relatives, and trade "black ghosts" may include other members (PFK news).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Apteronotus-albifrons.html) | 1 | **50 cm TL**; 23–28 °C, pH 6.0–8.0, dH 5–19; fast-flowing sandy creeks; **nocturnal**; micro-predator of insect larvae; weak electric organ and electroreceptors head to tail; IUCN LC (15 Jul 2020) |
| [Catalog of Fishes](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?tbl=species&genus=Apteronotus) | 1 | valid; Amazon and Orinoco basins and NE Brazil coastal rivers |
| [Maulana, Soelistyowati & Furqon 2021, Indones. Aquac. J. 16:29–34](https://doi.org/10.15578/iaj.16.1.2021.29-34) *(abstract via Crossref)* | 1 | farm spawning trials with 1:3, 2:3 and 3:3 male:female ratios over seven days; **spawning at night, 23:00–02:00, one male with one female**; males aggressive to rivals; 2:3 best. Hormones are not mentioned in the abstract |
| [Kirschbaum & Schugardt 2002, J. Physiol. Paris 96:557–566](https://doi.org/10.1016/S0928-4257(03)00011-1) *(via Wikipedia and search index)* | 1 | gymnotiform breeding by **changing water conductivity and raising water level** (simulated rainy season); *Apteronotus* eggs hidden singly in crevices; **1–105 eggs per spawning in *A. leptorhynchus*** (the brown ghost, not *albifrons*) |
| [Seriously Fish](https://www.seriouslyfish.com/species/apteronotus-albifrons/) | 2 | 500 mm TL; **180×60 cm (≈171 gal) minimum for an adult**; 23–28 °C, pH 6.0–8.0, 5–10 dGH; sensitive to water quality; dim light; carnivore pellets, prawn, earthworm; peaceful to timid, but large ones eat small fish (avoid tankmates <6 in); conspecifics bully until the weak one starves; swims any direction, backwards included; recognises its keeper and hand-feeds; tankmates *Geophagus*, *Satanoperca*, **angelfish, discus**, larger characins; sexes unknown; **not bred in home aquaria; commercially bred in Indonesia in large outdoor ponds** |
| [LiveAquaria](https://www.liveaquaria.com/product/857/?pcatid=857) | 2 | 18 in; **150 gal**; 73–80 °F, pH 6.5–7.0, dKH 0–10; timid; fine gravel, roots and rocks; **"ghost tube" for daytime viewing**; tame enough to hand-hold; aggressive to fish of similar or smaller size; **$24.99** |
| [PFK, Predators: the knifefishes](https://www.practicalfishkeeping.co.uk/features/predators-the-knifefishes/) | 2 | **~3 m (10 ft) tank for a full adult**; 120 cm causes stunting; nocturnal, caves, dim or red light; nearly blind; small fish readily eaten; conspecifics aggressive; whitespot in poor water; 23–28 °C, pH ~6.5 |
| [PFK, What can I keep with these knifefish?](https://www.practicalfishkeeping.co.uk/fishkeeping-answers/what-can-i-keep-with-these-knifefish/) | 2 | 50–60 cm; pairs and trios "invariably bully one another"; **very sensitive to low oxygen**; ignores fish too big to swallow, neons eaten; *Panaque*, *Anostomus* and ex-*Brochis* catfish suggested |
| [PFK, 5 spooky aquarium inhabitants](https://www.practicalfishkeeping.co.uk/features/5-spooky-aquarium-inhabitants-and-how-to-keep-them/) | 2 | "180×70×60 cm (6×3×3') minimum"; pH 6–7, 0–5 dKH; sensitive skin, so avoid boisterous fish; some take pellets |
| [PFK, 39 top tips](https://www.practicalfishkeeping.co.uk/features/articles/39-top-tips-for-fishkeepers) | 2 | **copper medications: black ghost knifefish "particularly sensitive"** |
| [PFK, how long will my fish live?](https://www.practicalfishkeeping.co.uk/fishkeeping-news/how-long-will-my-fish-live/) | 2 | owner-reported 16 years |
| [PFK news, new black ghost named](https://www.practicalfishkeeping.co.uk/fishkeeping-news/new-black-ghost-knifefish-named/) | 2 | the *albifrons* complex is defined by two light bands on the tail; trade fish from Brazil and Venezuela; some keepers report spawnings |
| [TFH Magazine](https://www.tfhmagazine.com/articles/freshwater/apteronotus-albifrons) | 2 | stiff body, so it needs front-to-back room to turn; nocturnal; wild fish may need weaning onto dead food; field harmless to people; "reported to be fairly easily spawned" but rarely bred; mature at about half-grown |
| [Aquarium Glaser, *A. albifrons* WHITE](https://aquariumglaser.de/en/tag/albifrons-en) | 2 | **"White" form: a colour sport first imported from Indonesia in 2008, now bred in Europe**; bred in Indonesia regularly for years; rivals contest rank with **wide-open mouths, pushing**; swims in any direction, even upside down |
| [Wikipedia](https://en.wikipedia.org/wiki/Black_ghost_knifefish) | 3 | black body, **white blaze on the snout that may run into a stripe down the back**, **two white bands on the tail**; females have higher electric (EOD) frequencies than males (strong in Orinoco fish, weak in Amazon fish); jamming avoidance; juveniles have larger heads; maturity ~1 year |
| [Aquarium Fish Paradise](https://www.aquariumfishparadise.com.au/?p=422) *(search snippet)* | 3 | claims Asian farms "commonly use hormone injections" (no evidence given) |

**Modelled as:**
- a 45 cm adult, nocturnal, timid; one per tank
- 240 gal with a **96×24** footprint: conservative over SF and LA, but short of PFK's 3 m (see conflicts)
- `medicationSensitive` (PFK copper), `highOxygen` (PFK low-oxygen sensitivity), `outgrowsSmallTanks`
- eats tiny and small fish and dwarf shrimp: `maxLikelyPreySizeCm 5`
- breeding `not_in_game`
- new behaviour set `knifefish`

**Conflicts:**
- **Hormones (the owner's question): corrected.**
  - The documented commercial breeding uses ponds and environmental cues, not hormones: SF (Indonesian outdoor ponds), Aquarium Glaser (bred in Indonesia for years, the white line bred in Europe), Maulana 2021 (natural night pair-spawning in farm trials) and Kirschbaum & Schugardt (conductivity and water-level cues for gymnotiforms).
  - Hormone use appears only as an unsupported Tier 3 claim.
  - Home spawning: forum anecdotes and TFH's "reported to be fairly easily spawned", but SF says it has not been bred in home aquaria.
  - Verdict: `not_in_game` stands, because no aquarium breeding is documented, but the reason is "pond and conductivity breeding on farms", not "hormones only".
- **Tank.**
  - SF says 72×24 in; LA 150 gal.
  - PFK says 3 m in one article and "180×70×60 cm (6×3×3 ft)" in another. That second figure is internally inconsistent: 3 ft is 90 cm.
  - The game uses 96×24 (240 gal). That is a third longer than SF, and still gives the ~61 cm width TFH's turning need asks for.
  - The strict PFK reading (3 m long, 70+ cm wide) would put it in the **500-gal tier**. The owner's call.
- **Fecundity.** The only egg count (1–105) is for the related *A. leptorhynchus*. It is used only as a placeholder.
- **Temperament.** SF says peaceful to timid, LA semi-aggressive. It is timid with big fish, eats small fish and fights its own kind.

### Proposed game data
```ts
{
  id: 'black_ghost_knifefish',
  commonName: 'Black Ghost Knifefish',
  scientificName: 'Apteronotus albifrons',
  category: 'fish',
  group: 'knifefish',                        // NEW group
  genus: 'Apteronotus',
  environment: 'freshwater',
  waterClasses: ['freshwater_tropical', 'freshwater_planted'], // floating plants welcome (PFK)
  nativeRegion: 'Northern and central South America: Amazon and Orinoco basins and coastal rivers of north-eastern Brazil, in fast sandy creeks and deep river channels',
  isStarter: false,
  adultSizeCm: 45,                           // FishBase/SF 50 TL; LA 18 in; PFK 50–60
  recommendedMinTankGallons: 240,            // conservative: SF 171 gal, LA 150; PFK 3 m (see conflicts)
  recommendedFootprint: { minLengthIn: 96, minWidthIn: 24 },
  activeSwimmer: false,
  bioload: 5,                                // derived (slender body)
  tempC: { min: 23, max: 28, idealMin: 24, idealMax: 27 }, // FishBase/SF/PFK 23–28; LA 23–27
  pH: { min: 6.0, max: 8.0, idealMin: 6.0, idealMax: 7.0 }, // FishBase/SF 6–8; LA 6.5–7.0; PFK 6–7
  salinitySG: null,
  gh: { min: 2, max: 15 },                   // SF 5–10; PFK up to 15; FishBase dH 5–19
  kh: { min: 0, max: 10 },                   // LA dKH 0–10; PFK 0–5
  flowPreference: 'moderate',                // FishBase fast creeks; PFK oxygen-sensitive
  lightPreference: 'dim',                    // SF, LA, PFK
  diet: 'carnivore',
  foods: ['bloodworm', 'brine_shrimp', 'mysis', 'earthworm', 'pellet_sinking'], // SF carnivore pellets, prawn, earthworm; PFK bloodworm, frozen
  feedingStyle: 'hunter',                    // Wikipedia: short quick lunge; finds food by electrolocation
  feedingSpeed: 0.3,
  feedingAggression: 0.2,
  hungerHours: 24,                           // derived
  activityZone: ['lower', 'middle', 'decor'],
  temperament: 'semi_aggressive',            // LA; SF "timid" toward big fish
  territoriality: 0.6,
  aggression: 0.15,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, note: 'Keep one. Pairs and trios bully each other until the weakest stops feeding (SF, PFK).' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'fight', mixed: 'harassment', juvenile: 'tension', note: 'Rivals push each other with wide-open mouths (Aquarium Glaser) and signal with their electric fields.' },
  predatorTags: ['fish_tiny', 'fish_small', 'fry', 'eggs', 'shrimp_dwarf', 'shrimp_fry', 'worm', 'copepod'], // PFK neons; LA reviews: guppies; Wikipedia: shrimp
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 5,                    // derived; PFK "very small fish such as neons"; SF avoids <6 in as a margin
  shrimpSafe: 'unsafe', snailSafe: 'mostly_safe', frySafe: 'unsafe', plantSafe: 'safe',
  reefSafe: 'unsafe', coralRisk: 0, anemoneRelationship: 'not_applicable',
  hidesNeeded: 2,                            // a tube or cave is essential (LA, PFK)
  coverPreference: 0.7,
  substrateRules: { preferred: ['fine_gravel', 'sand'], avoid: [], note: 'A clear "ghost tube" or a cave to hide in by day (LA). Smooth decor: its skin is sensitive (PFK). Room front to back to turn its stiff body (TFH).' },
  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 20,                        // ~1 year (Wikipedia citing Kirschbaum & Schugardt)
    clutchSize: { min: 1, max: 105 },        // A. leptorhynchus per spawning (Kirschbaum & Schugardt) — placeholder
    incubationHours: 24,                     // NOT SOURCED placeholder; unused
    fryRearingHours: 120,                    // placeholder
    cooldownDays: 30,
    conditions: { needsPartner: true, needsCover: true, minTankGallons: 500 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Bred on farms in Indonesia, in large outdoor ponds (SF), spawning at night in pairs (Maulana et al. 2021). In the lab, gymnotiforms come into breeding condition when conductivity changes and the water rises, like a rainy season (Kirschbaum & Schugardt 2002). Eggs are hidden one at a time in crevices. Home spawnings are anecdotal only, so the game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  lifecycle: { juvenileDays: 20, adultDays: 25, lifespanDays: 500, sexVisibleAtDays: 500, hatchSizeCm: 0.6 }, // 16 y (PFK owner report) → cap; sexes look alike (SF); hatch size placeholder
  hardiness: 0.5,                            // water-quality and copper sensitive, whitespot-prone (SF, PFK)
  difficulty: 'advanced',
  baseValue: 25,                             // LA $24.99 (2–4 in)
  rarity: 'uncommon',
  visitorAppeal: 0.85,
  captiveBredAvailable: true,                // Indonesian farm-bred (SF, Glaser)
  wildCaughtNote: 'Farm-bred in Indonesia; wild fish come mostly from the Orinoco (Colombia, Venezuela) (Glaser).',
  conservation: { status: 'Least Concern (IUCN, assessed 2020)', note: 'Heavy collection for the trade is a concern; about half the ornamental fish taken from the Amazon are missing from export records (Wikipedia).' },
  special: { medicationSensitive: true, highOxygen: true, outgrowsSmallTanks: true },
  behaviorSet: 'knifefish',                  // NEW; no existing set fits
  behaviorTraits: { cruiseSpeed: 0.25, burstSpeed: 3, turnRate: 1.2, hoverTendency: 0.8, schoolingTightness: 0, restOnBottom: 0.1, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.5, nocturnal: 0.9 }, // derived
  specialBehaviors: ['tube_rest', 'reverse_swim', 'upside_down_swim', 'electrolocate_probe', 'night_hunt', 'hand_feed', 'gape_contest'],
  visualLane: 'fish',
}
```

**Genetics.**
- No hobby colour genetics, so it gets the generic intensity locus.
- **Optional:** Aquarium Glaser documents a **"White"** form (a 2008 colour sport from Indonesia, now bred in Europe). Its inheritance is undocumented and the source does not say whether it is albino or leucistic.
- If included, use a `white` locus with a recessive `w` (frequency ~0.03, `rare: true`), with a confidence note that recessive is an assumption. The phenotype is a white-cream body, two paler tail rings and an unknown eye colour, so draw a dark eye.
- **baseVisual:**

  | Field | Value | What it draws |
  |---|---|---|
  | `bodyColor` | `#121214` | velvet black |
  | `bodyColor2` | `#1c1c20` | |
  | `bellyColor` | `#18181b` | |
  | `finColor` | `#1a1a1e` | the long anal fin, slightly translucent |
  | `finColor2` | `#2a2a30` | |
  | `accentColor` | `#ecebe6` | the white snout blaze and dorsal stripe, plus two rings round the tail |
  | `eyeColor` | `#0e0e10` | small eye |

  Also: `pattern: 'saddle'` (or a knifefish-specific one), `translucency 0.25` on the fin, `finType 'knife'`.
- **Art:** no dorsal fin; one long ribbon anal fin from chest to tail; tiny or no caudal fin (Wikipedia).

### Young and sexes
- **Young:** juveniles look like adults with **a larger head for their body** (Wikipedia). Draw the same pattern with the head scaled up about 15 %.
- **Sexes:** no visible difference (SF: unknown). Females fire their electric organ at higher frequencies (Wikipedia), which is invisible. Draw one adult look.

### Behaviour
- **Swimming:**
  - keeps its body rigid and swims by **rippling the long anal fin**, so it glides forward, **backwards**, sideways, hovers in place and even swims **upside down** (SF, Wikipedia, Glaser)
  - turns are slow and wide (TFH: stiff body needs room to turn)
- **Night life:**
  - nocturnal (FishBase, PFK); spends the day **in a tube, cave or root tangle**, often lying sideways or upside down in it (LA: "ghost tube")
  - at dusk it patrols low to mid-water, probing ahead with its electric sense; it is nearly blind (PFK)
  - takes prey with a short, quick lunge (Wikipedia)
- **Tame side:** settled fish learn their keeper, take food from the hand and become active by day in a shaded tank (SF, LA, PFK Q&A).
- **Rivals:** contest rank with wide open mouths, pushing (Glaser).
- **Behaviour set:** nothing existing fits, because the body stays straight while the fin waves. Propose **`knifefish`**:
  - `rest: 'cave'`, using a tube or cave decor piece
  - a locomotion flag that allows reverse swimming without turning, with tail waves replaced by an anal-fin wave
  - high `nocturnal`, a `hover` act, and a night `hunt`

### Compatibility
| Other | Verdict | Reason (sources) |
|---|---|---|
| Oscar | conditional | See the oscar section (PFK: avoid boisterous cichlids). |
| Clown loach | conditional | Boisterous; competes for caves and night food. |
| Fahaka puffer | incompatible | The fahaka attacks; a soft-skinned BGK is an easy target. |
| Ornate bichir | usually_compatible | SF lists knifefish as bichir tankmates. Both forage at night, so watch food; a small BGK fits a bichir's mouth. |
| Motoro stingray | conditional | Both active low down at night. SF (ray page): smaller fish picked off at night. No direct source on the pairing. |
| Silver arowana | usually_compatible | LA lists knifefish as good arowana tankmates. Different zones and times. |
| Koi | incompatible | Cool water. |
| Mono, scat, marine | incompatible | Salinity. |
| Neon, cardinal, endler, white cloud, medaka | incompatible | Tiny fish eaten (PFK). |
| Harlequin rasbora, zebra danio, guppy, platy | high_risk | 4–5 cm fish are within reach of a big BGK (SF's <6 in rule; LA reviews: guppies eaten). |
| Swordtail, sailfin molly | usually_compatible | Too big to swallow. |
| Panda corydoras | conditional | PFK: ex-*Brochis* catfish work, but they compete for food at night; pandas are small and want 21–24 °C. |
| Bristlenose pleco | usually_compatible | PFK recommends herbivorous catfish that don't compete. |
| Otocinclus, kuhli loach | high_risk | Small, and active at night like the BGK. |
| Hillstream loach | incompatible | Cool water. |
| Dwarf and honey gourami | conditional | Calm, but small (5–7 cm). |
| Betta | high_risk | Small, slow and long-finned. |
| Angelfish | usually_compatible | SF lists angelfish as tankmates. |
| Discus | usually_compatible | SF lists discus. The BGK's tolerance tops out at 28 °C against discus 28–30, so conditional above 28. |
| German blue ram | high_risk | 5.5 cm; and rams want 27–30 °C. |
| Shrimp | incompatible (dwarf) / high_risk (Amano, ghost) | Eaten (Wikipedia). |
| Snails | usually_compatible | Not a snail-eater (no source either way). Copper-free tank anyway. |
| Dwarf crayfish | conditional | Crayfish pinch resting fish; the BGK eats small ones. |
| Goldfish, axolotl, African dwarf frog | incompatible | Cool water (goldfish, axolotl); frogs eaten. |
| Pea puffer | incompatible | Eaten. |
| Brackish roster | incompatible | Salinity. |

**Proposed `exceptionRules`:**
- `tag:fish_tiny`: incompatible, 0.3.
- `tag:fish_small`: high_risk, 0.12, mitigatedBy `hides`.
- `tag:shrimp_dwarf`: incompatible, 0.3.
- `oscar` and `clown_loach`: conditional, "boisterous fish damage its sensitive skin (PFK)".
- `fahaka_puffer`: incompatible.

### Smallest tank tier for an adult
**240 gal (96×24×25 in)** under the conservative rule. The sources' own minimums (SF 72×24, LA 150 gal) would allow the 180 gal. PFK's 3 m (about 120 in) points to the **500 gal (120×36)**. Recommend 240, with the owner choosing between 240 and 500.

---

## Fahaka puffer
*Tetraodon lineatus* Linnaeus 1758 · proposed group `puffer` · `not_in_game` breeding (rare, temperament)

**Name check.** CoF: valid as *Tetraodon lineatus* Linnaeus 1758. *T. fahaka* (Hasselquist 1762) is a suppressed synonym (ICZN Opinion 57). The trade name "fahaka" or "Nile puffer" is fine; the old scientific name *T. fahaka* is outdated.

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Tetraodon-lineatus.html) | 1 | **43 cm TL**, 1 kg; **Lm 18.2 cm**; **max reported age 5 years**; 24–26 °C, pH 7.0, dH 10; freshwater and brackish, large rivers, open water and weed beds; Nile, Chad, Senegal, Gambia, Geba, Volta, Lake Turkana; eats molluscs; inflates with a ventral pocket; IUCN LC (1 Nov 2019) |
| [Catalog of Fishes](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?tbl=species&genus=Tetraodon) | 1 | valid; *fahaka* suppressed |
| [Seriously Fish](https://www.seriouslyfish.com/species/tetraodon-lineatus/) | 2 | **430 mm SL**; **one fish needs ≥450 L, 120×60×60 cm (48×24×24 in)**; freshwater, no salt; 24–26 °C, pH 6.5–7.5, 5–15 dGH; a molluscivore: feed snails and **unshelled shellfish (crab legs, mussels) to wear down continuously growing teeth**; **aggressive and intolerant, best kept alone; beak bites chunks out of or tears apart other fish**; fights its own kind even in huge tanks; learns its owner, expressive eyes; colour changes with mood; inflates 2–3×; sexes look alike, gravid females round, small ovipositor; **breeding reported in large aquaria**; mature ~12 months; male grips the female upside down; several thousand eggs that sink; **hatch 72–96 h**; fry free-swimming after ~1 week, infusoria then brine shrimp; fry turn on each other; tetrodotoxin in many body parts |
| [LiveAquaria](https://www.liveaquaria.com/products/fahaka-puffer) | 2 | 15 in; **120 gal**; 72–82 °F, pH 7.0–8.0, dKH 8–15; fresh and brackish rivers but **best in freshwater**; aggressive, best alone; eats crustaceans, molluscs, earthworms, krill; brownish-grey back fading to an off-white belly with **lighter horizontal stripes from tail to pectoral fin**; **$24.99** (½–1¾ in) |
| [Vet Times, a puffer's beak trimmed](https://www.vettimes.com/news/vets/small-animal-vets/great-barrier-teeth-goldie-grinning-again-after-delicate-dental) | 2 | puffer beaks are kept short by hard-shelled food; an overgrown beak is cut back with a dental burr **under fish anaesthetic** (a porcupine puffer, not a fahaka; same continuously growing beak) |
| [Pufferfish Enthusiasts Worldwide](https://www.pufferfishenthusiastsworldwide.com/post/fahaka-puffer-care-sheet) | 3 | 40–45 cm in about 2 years; **min 60×24×24 in (~150 US gal), 6 ft better**; 24–28 °C, pH 6.5–7.5, 6–16 dGH; nitrate <15–20 ppm; ≥50 % weekly water change; **fine sand 0.2–0.5 mm, 2–5 cm deep: wallows and buries to ambush and rest**; diet 55 % frozen shell-on crayfish and crab, 25 % snails, 10 % gut-loaded insects, 5 % earthworm, 5 % prepared; **avoid thiaminase-rich mussels, clams, oysters**; no live crayfish or crab; beg at glass; shell-crushing; lunges at reflections; **stress: faded stripes, dark "stress brow", dark bars on the back**; forced inflation harmful; one per tank; mostly wild-caught juveniles; 20+ years |
| Aquatics Unlimited, Global Fish Co. *(search snippet)* | 3 | $34.99–199.99 by size; $199 for 6 in |

**Modelled as:**
- a 40 cm adult; 180 gal, **72×24** (PEW's "6 ft better", above SF)
- **`speciesOnly`**: any tankmate at least high risk (SF, PEW, LA)
- `burrower` (sand wallowing, needs fine sand), `heavyWaste` (shell-crushing, big water changes), `outgrowsSmallTanks`
- foods: snails plus a proposed `shellfish_hard` tag (shell-on crayfish and crab) to keep the beak worn
- breeding `not_in_game`
- reuse the `pea_puffer` behaviour set, scaled up, or add a new `puffer_large`

**Conflicts:**
- **Lifespan.** FishBase's 5-year maximum (wild data) clashes with PEW's 20+ in captivity. The game uses 10 years (400 game days) and notes both.
- **Tank.** SF says 48×24, LA 120 gal, PEW 60×24 minimum and 72 better. The game uses 72×24.
- **pH.** LA gives 7–8 against SF and PEW's 6.5–7.5. The game uses 6.5–8.0, ideal 6.8–7.5.
- **Breeding.** SF says it has been reported in large aquaria, PEW says specialists occasionally produce small numbers, and the fry kill each other. No dated, documented home breeding was found, so the game uses `not_in_game`. If the owner wants it bred, it would be `egg_layer_generic`: difficulty ~0.95, several thousand sinking eggs, 28 game h incubation, no parental care, and the pair separated straight after spawning.
- **Mussels.** SF recommends them, while PEW warns of thiaminase. Mussels are fine only occasionally; prefer crayfish and crab legs and snails.

### Proposed game data
```ts
{
  id: 'fahaka_puffer',
  commonName: 'Fahaka Puffer',
  scientificName: 'Tetraodon lineatus',
  category: 'fish',
  group: 'puffer',                           // with pea and figure-eight puffers
  genus: 'Tetraodon',
  environment: 'freshwater',
  waterClasses: ['freshwater_tropical'],     // LA: fresh and brackish wild, best in freshwater
  nativeRegion: 'North and West Africa: the Nile, Lake Chad, Lake Turkana, and the Senegal, Gambia, Geba and Volta basins, in open water and weedy fringes of large rivers',
  isStarter: false,
  adultSizeCm: 40,                           // FishBase/SF 43; LA 15 in; PEW 40–45
  recommendedMinTankGallons: 180,            // PEW 150 US gal min, 6 ft better; SF 450 L; LA 120 gal
  recommendedFootprint: { minLengthIn: 72, minWidthIn: 24 },
  activeSwimmer: false,
  bioload: 9,                                // derived: messy shell-crusher; PEW ≥50 % weekly changes
  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 27 }, // FishBase/SF 24–26; PEW 24–28; LA 22–28
  pH: { min: 6.5, max: 8.0, idealMin: 6.8, idealMax: 7.5 }, // SF/PEW 6.5–7.5; LA 7–8
  salinitySG: null,
  gh: { min: 5, max: 16 },                   // SF 5–15; PEW 6–16
  kh: { min: 5, max: 15 },                   // LA dKH 8–15 (widened low end for SF/PEW pH)
  flowPreference: 'low',
  lightPreference: 'moderate',
  diet: 'carnivore',                         // FishBase molluscs
  foods: ['snail_live', 'earthworm', 'pellet_sinking', 'mysis', 'pellet_large'], // + proposed 'shellfish_hard' (55 %), 'insect' (10 %) — PEW
  feedingStyle: 'ambush',                    // PEW: buries in sand to ambush
  feedingSpeed: 0.75,
  feedingAggression: 0.95,
  hungerHours: 24,                           // PEW several small meals; derived
  activityZone: ['middle', 'lower', 'bottom', 'decor'],
  temperament: 'aggressive',                 // LA; SF "aggressive and intolerant"
  territoriality: 0.9,
  aggression: 0.95,
  finNipper: 0.9,                            // SF: bites chunks out of fish
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, note: 'One per tank. It bites chunks out of other fish and fights its own kind even in very large tanks (SF, PEW).' },
  sameSpeciesRule: { maleMale: 'lethal', femaleFemale: 'lethal', mixed: 'breeding_only_temporary', juvenile: 'fight', note: 'A pair tolerates each other only while spawning (SF); fry pick off the weaker ones early.' },
  predatorTags: ['fish_tiny', 'fish_small', 'fish_medium', 'fish_slow', 'fish_benthic', 'long_fins', 'fry', 'eggs', 'snail', 'snail_small', 'shrimp_dwarf', 'shrimp_fry', 'shrimp_large', 'crustacean', 'clam', 'worm', 'amphibian', 'amphibian_larva', 'gills_external'],
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 8,                    // derived; it bites larger fish rather than swallowing them (handled by speciesOnly)
  shrimpSafe: 'unsafe', snailSafe: 'unsafe', frySafe: 'unsafe', plantSafe: 'mostly_safe',
  reefSafe: 'unsafe', coralRisk: 0, anemoneRelationship: 'not_applicable',
  hidesNeeded: 1,                            // LA plants and rocks
  coverPreference: 0.4,
  substrateRules: { preferred: ['fine_sand'], avoid: ['gravel', 'large_pebbles', 'bare'], note: 'Fine sand 2–5 cm deep to wallow and bury in; stir it weekly (PEW). No grow-out tanks: give it its adult tank (PEW).' },
  breeding: {
    system: 'not_in_game',
    difficulty: 1,
    maturityDays: 20,                        // ~12 months (SF); Lm 18.2 cm (FishBase)
    clutchSize: { min: 2000, max: 5000 },    // SF "several thousand"
    incubationHours: 28,                     // 72–96 h (SF) → 3.5 d × 8
    fryRearingHours: 56,                     // free-swimming after ~1 week (SF)
    cooldownDays: 30,
    conditions: { needsPartner: true, minTankGallons: 500 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Spawning has been reported in large aquaria: the male grips the female upside down in short bursts, she releases several thousand sinking eggs, and they hatch in 3–4 days (SF). No care is given, the pair fights again afterwards, and the fry kill one another. Most fish sold are wild-caught juveniles (PEW). The game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  lifecycle: { juvenileDays: 18, adultDays: 20, lifespanDays: 400, sexVisibleAtDays: 500, hatchSizeCm: 0.2 }, // 10 y between FishBase 5 and PEW 20+; no visible sex differences (SF, PEW); hatch size placeholder
  hardiness: 0.7,
  difficulty: 'advanced',
  baseValue: 25,                             // LA $24.99 juvenile; larger fish $35–200 (snippets)
  rarity: 'uncommon',
  visitorAppeal: 0.9,
  captiveBredAvailable: false,               // PEW: mostly wild-caught; only small specialist batches
  wildCaughtNote: 'Most are wild-caught juveniles from Africa (PEW).',
  conservation: { status: 'Least Concern (IUCN, assessed 2019)', note: 'Widespread in African rivers. Like most puffers it carries tetrodotoxin in its organs (SF); harmless to keep, never to eat.' },
  special: { speciesOnly: true, burrower: true, heavyWaste: true, outgrowsSmallTanks: true },
  behaviorSet: 'pea_puffer',                 // reuse (hover, inspect decor and glass), or NEW 'puffer_large'
  behaviorTraits: { cruiseSpeed: 0.3, burstSpeed: 3, turnRate: 2.2, hoverTendency: 0.9, schoolingTightness: 0, restOnBottom: 0.3, hitching: 0, burrowing: 0.4, glassSurfing: 0.1, curiosity: 0.9, nocturnal: 0.1 }, // derived
  specialBehaviors: ['beg_at_glass', 'owner_recognition', 'shell_crush', 'sand_wallow', 'inflate', 'stress_brow', 'reflection_lunge', 'independent_eye_scan'],
  visualLane: 'fish',
}
```

**Genetics.**
- No named forms; the generic intensity locus applies.
- **baseVisual:**

  | Field | Value | What it draws |
  |---|---|---|
  | `bodyColor` | `#7a6c44` | olive-brown back |
  | `bodyColor2` | `#5e5434` | |
  | `bellyColor` | `#efe9dc` | off-white |
  | `finColor` | `#c9a85a` | fins yellow-olive (from photographs, no text source) |
  | `finColor2` | `#a8883a` | |
  | `accentColor` | `#e2cf86` | the light horizontal stripes |
  | `eyeColor` | `#c8b048` | |

  Also: `pattern: 'lined'` (horizontal stripes; a new 'striped' kind would be better), `patternContrast 0.6`, `finType 'puffer'`, `bodyDepth 1.1`.
- **Description:** brownish-grey back fading to an off-white belly, lighter horizontal stripes from the tail to the pectoral fin (LA).
- **Mood overlay:** stress fades the stripes, adds a dark brow between the eyes and dark bars across the back (PEW).

### Young and sexes
- **Young:** no source describes a separate juvenile colour (SF, PEW, LA). Draw small fish with the adult pattern and a rounder body. Growth is fast: 25–30 cm at 12 months (PEW).
- **Sexes:** no external differences. A gravid female is rounder and shows a small ovipositor before spawning (SF, PEW). One adult look.
- **Mood states (worth drawing):**
  - **stress:** washed-out stripes, a dark "stress brow" and dark arching bars on the back (PEW)
  - **inflated:** 2–3× normal size (SF)

### Behaviour
- **Swimming:** a slow, hovering, deliberate swimmer that steers with its fins and turns its eyes independently, like the pea puffer.
- **Signature behaviours:**
  - **begging:** watches the room and begs at the glass (PEW), and learns its owner (SF)
  - **sand wallowing:** buries itself in sand to rest and to ambush; wallows (PEW)
  - **shell crushing:** cracks snails and crayfish audibly (PEW)
  - **inflation:** puffs up when threatened; brief "practice puffs" are normal, long ones are not (PEW)
  - **reflection lunges:** territorial lunges at its reflection or at movement outside (PEW)
- **Rest:** diurnal.
- **Behaviour set:** `pea_puffer` (hover, inspect decor and glass, leaf rest) is the closest, with `burrow` added for sand rest. A new **`puffer_large`** would swap the leaf rest for a sand-wallow rest and add `inflate` and `shell_crush` acts.

### Compatibility
**Every tankmate is incompatible:** SF ("best kept alone"), PEW (housing it with other fish is "unethical"), LA ("best kept alone").

| Other | Verdict | Reason |
|---|---|---|
| Oscar, clown loach, BGK, ornate bichir, motoro, silver arowana | incompatible | It bites chunks out of fish of any size (SF), and the motoro's disc and the BGK's soft skin are easy targets. |
| Koi, mono, scat, marine species | incompatible | Water class too. |
| All fish in the existing roster | incompatible | Small fish eaten, large ones bitten. Slow and long-finned fish (betta, fancy goldfish, angelfish, discus) are worst. |
| Shrimp, snails, crayfish | incompatible | Its natural food (FishBase; PEW: snails, crayfish). |
| Axolotl, African dwarf frog | incompatible | Eaten or bitten; the axolotl is also cool-water. |
| Pea puffer, figure-eight puffer | incompatible | Eaten. |

**Proposed:** `special.speciesOnly: true` (the existing flag: "Any tank mate is at least high risk"), plus `exceptionRules` `tag:fish_large` incompatible ("bites chunks out of large fish too", incidentRisk 0.3) so even big fish read as incompatible, not just high risk.

### Smallest tank tier for an adult
**180 gal (72×24×25 in)**: PEW's "6 ft better". SF's 48×24 minimum would fit even a 125 if width allowed; it doesn't (18 in).

---

## Ornate bichir
*Polypterus ornatipinnis* Boulenger 1902 · proposed group `bichir` · breeds in the game (`egg_scatter_cover`, hard)

**Name check.** CoF: valid as *Polypterus ornatipinnis* Boulenger 1902. The spelling "ornatapinnis", still in some trade and older SF URLs, is wrong.

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Polypterus-ornatipinnis.html) | 1 | **60 cm TL**; tmax "likely ≥20" years; 26–28 °C; calm swamps and rivers; young eat worms and insect larvae, **adults mainly fish, hunting at night**; **male cups his anal fin, the female lays into it, he spreads the eggs onto plants**; IUCN LC (2009) |
| [Catalog of Fishes](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?tbl=species&genus=Polypterus) | 1 | valid spelling *ornatipinnis*; Congo River system and tributaries of Lakes Tanganyika and Edward |
| Britz & Bartsch 1998, Ichthyol. Explor. Freshw. 9:325–334 *(citation via FishBase and search index; text not seen)* | 1 | captive reproduction and early development of *P. ornatipinnis* documented, which confirms it breeds in captivity |
| [McGill newsroom, Standen et al. 2014 (Nature)](https://mcgill.ca/newsroom/node/21059) | 1 | *Polypterus* (*P. senegalus*) "walks" on its pectoral fins (genus-level behaviour) |
| [Seriously Fish](https://www.seriouslyfish.com/species/polypterus-ornatipinnis/) | 2 | 600 mm SL; **180×60×60 cm (≈171 gal), floor space matters more than depth**; 25–28 °C, pH 6.0–8.0, 5–25 dGH; usually refuses dried food; prawn, earthworm, mussel, lancefish; **nocturnal, very poor eyesight, hunts by smell**; **air-breathing lung; may drown without surface access**; **escape artist: tight lid**; eats any tankmate that fits; compatible with other *Polypterus*, *Synodontis*, knifefish, larger characins, large Rift cichlids; **males have a thicker anal fin**; **juveniles have external, amphibian-like gills**; **spawning achieved in aquaria**; egg-scatterer in dense plants; adults eat eggs; **hatch 3–4 days, free-swimming ~3 days later**; most sold are wild-caught |
| [LiveAquaria](https://www.liveaquaria.com/products/ornate-bichir) | 2 | 24 in; **180 gal**; 77–83 °F, pH 6.5–7.5, dKH 1–12; swallows any fish or invertebrate that fits; passive to other large fish; aggressive to its own kind (keep one unless the tank is very large); **sold "Captive-Bred"**; **prone to jumping**; densely planted, many hiding places, sandy bottom; **$59.99** |
| [PFK, how long will my fish live?](https://www.practicalfishkeeping.co.uk/fishkeeping-news/how-long-will-my-fish-live/) | 2 | owner-reported 30 years |
| [Wikipedia](https://en.wikipedia.org/wiki/Ornate_bichir) | 3 | black and yellow patterning on a dark brown to brownish-grey ground, head included; 9–11 dorsal finlets; largest "upper-jaw" bichir; IUCN LC (Hanssens & Moelants 2010) |
| [Polypterus.info](https://polypterus.info/p_ornatipinnis/) | 3 | head finely reticulated; the pattern runs into the fins |
| [MFK "Breeding ornates" (2007)](https://www.monsterfishkeepers.com/forums/threads/breeding-ornates.94738/), [MFK breeding report (2017)](https://www.monsterfishkeepers.com/forums/goto/post?id=7675739), [MFK farm methods](https://www.monsterfishkeepers.com/forums/goto/post?id=6529660) | 3 | **ornates mature at 4–6 years**; sexed at 7–8 in by the swollen male anal fin; females larger; a female carries 300+ eggs (another keeper got 50–60 per spawn); triggered by a soft-water "rainy season" change; hatch in 60–90 h at ~82 °F; larvae live on yolk 6–7 days; fry fight and cannibalise until ~4 cm; **a keeper breeding ornates "naturally and without hormones"**; Asian farms use hormones (Ovaprim, pituitary, LHRH + domperidone) |

**Modelled as:**
- a 50 cm adult floor-dweller; 180 gal, **72×24** (SF's floor and LA's gallons)
- `airBreather` (obligate air-breather: may drown without the surface, SF), `escapeArtist` (SF, LA), `outgrowsSmallTanks`
- swallows anything that fits: `maxLikelyPreySizeCm 12` (derived)
- one per tank by default
- breeds as `egg_scatter_cover` at high difficulty: dense plants, adults removed, 28 game h incubation
- new behaviour set `bichir`

**Conflicts:**
- **Size.** 60 cm TL is the maximum everywhere; SF says aquarium fish are usually smaller. The game uses 50 cm.
- **Captive-bred or wild.** LA sells "Captive-Bred" stock, while SF says most are wild-caught. Farm production in Asia (MFK, Tier 3) explains the captive-bred fish; both kinds exist.
- **Conspecifics.** SF lists other *Polypterus* as tankmates, while LA says it is aggressive to its own kind. The game uses `tension`, one per tank by default.
- **Breeding numbers.** Clutch, maturity and fry figures are Tier 3 only. The hatch time (3–4 days) is Tier 2 (SF), and the behaviour Tier 1 (FishBase, Britz & Bartsch). Maturity at 4–6 years puts it at the 25-day cap.

### Proposed game data
```ts
{
  id: 'ornate_bichir',
  commonName: 'Ornate Bichir',
  scientificName: 'Polypterus ornatipinnis',
  category: 'fish',
  group: 'bichir',                           // NEW group
  genus: 'Polypterus',
  environment: 'freshwater',
  waterClasses: ['freshwater_tropical', 'freshwater_planted'], // LA: densely planted
  nativeRegion: 'Central and East Africa: the Congo River system and tributaries of Lakes Tanganyika and Edward (Cameroon, the Congos, Angola, Burundi, Tanzania), in calm swamps and rivers',
  isStarter: false,
  adultSizeCm: 50,                           // 60 TL max (FishBase, SF, LA); usually less in aquaria (SF)
  recommendedMinTankGallons: 180,            // LA 180 gal; SF 180×60×60 cm ≈171 gal
  recommendedFootprint: { minLengthIn: 72, minWidthIn: 24 }, // SF: floor space matters more than depth
  activeSwimmer: false,
  bioload: 7,                                // derived
  tempC: { min: 24, max: 29, idealMin: 25, idealMax: 28 }, // SF 25–28; FishBase 26–28; LA 25–28.3
  pH: { min: 6.0, max: 8.0, idealMin: 6.5, idealMax: 7.5 }, // SF 6–8; LA 6.5–7.5
  salinitySG: null,
  gh: { min: 5, max: 25 },                   // SF
  kh: { min: 1, max: 12 },                   // LA
  flowPreference: 'low',                     // FishBase calm waters
  lightPreference: 'dim',                    // nocturnal (SF, FishBase)
  diet: 'carnivore',
  foods: ['earthworm', 'bloodworm', 'pellet_large', 'pellet_sinking', 'mysis'], // SF prawn, earthworm, mussel, lancefish; some take pellets
  feedingStyle: 'bottom',                    // hunts by smell at night (SF)
  feedingSpeed: 0.25,
  feedingAggression: 0.35,
  hungerHours: 30,                           // derived
  activityZone: ['bottom', 'lower', 'surface'], // surface = air gulps
  temperament: 'predatory',
  territoriality: 0.4,
  aggression: 0.3,                           // LA: passive to other large fish
  finNipper: 0.05,
  hasLongFins: false,
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 1, note: 'One, unless the tank is very large (LA); other Polypterus can share a big floor (SF).' },
  sameSpeciesRule: { maleMale: 'tension', femaleFemale: 'tension', mixed: 'courtship_ok', juvenile: 'tension', note: 'Aggressive to its own kind in small tanks (LA); young bichirs fight and eat each other until about 4 cm (MFK).' },
  predatorTags: ['fish_tiny', 'fish_small', 'fish_medium', 'fish_benthic', 'fish_slow', 'fry', 'eggs', 'shrimp_dwarf', 'shrimp_fry', 'shrimp_large', 'crustacean', 'worm', 'amphibian', 'amphibian_larva'], // LA: any fish or invert that fits; FishBase adults mainly fish
  preyTags: ['fish_large', 'fish_benthic'],
  maxLikelyPreySizeCm: 12,                   // derived
  shrimpSafe: 'unsafe', snailSafe: 'mostly_safe', frySafe: 'unsafe', plantSafe: 'safe',
  reefSafe: 'unsafe', coralRisk: 0, anemoneRelationship: 'not_applicable',
  hidesNeeded: 2,                            // LA "numerous hiding places"
  coverPreference: 0.6,
  substrateRules: { preferred: ['sand', 'fine_sand'], avoid: [], note: 'Sand and a large floor (LA, SF). Leave an air gap and open surface: it must gulp air. A tight, sealed lid (SF, LA).' },
  breeding: {
    system: 'egg_scatter_cover',
    difficulty: 0.85,
    maturityDays: 25,                        // 4–6 years (MFK, T3) → cap
    clutchSize: { min: 50, max: 300 },       // MFK: 50–60 per spawn; a female carries 300+ (T3)
    incubationHours: 28,                     // 3–4 days (SF) → 3.5 × 8; MFK 60–90 h at 28 °C
    fryRearingHours: 160,                    // free-swimming ~3 days after hatch (SF) = 24 h, then grow-out past the cannibal stage (~4 cm, MFK); derived
    cooldownDays: 30,
    conditions: { needsPartner: true, needsCover: true, minTempC: 26, needsConditioningFood: ['earthworm', 'bloodworm'], minTankGallons: 180 }, // SF: soft, slightly acidic water; rainy-season change
    predationWithoutNursery: 0.9,            // SF: adults eat eggs; fry cannibalise
    nurseryRequired: true,
    maxRaisedPerClutch: 8,
    notes: 'The male courts by chasing and nudging the female, cups his anal fin to catch her eggs, fertilises them and scatters them into plants (FishBase, SF). The adults then eat eggs, so they come out. Eggs hatch in 3–4 days and the tadpole-like larvae, with feathery external gills, live on their yolk before taking baby brine shrimp. Triggered by a soft-water rainy-season change (SF). Done at home without hormones (MFK); farms use hormones.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  lifecycle: { juvenileDays: 22, adultDays: 25, lifespanDays: 500, sexVisibleAtDays: 25, hatchSizeCm: 0.5 }, // ≥20 y (FishBase), 30 y (PFK) → cap; male anal fin at maturity (SF); hatch size placeholder
  hardiness: 0.85,
  difficulty: 'intermediate',
  baseValue: 60,                             // LA $59.99
  rarity: 'uncommon',
  visitorAppeal: 0.8,
  captiveBredAvailable: true,                // LA "Captive-Bred"
  wildCaughtNote: 'Captive-bred fish are sold (LA), but SF says most are still wild-caught, so quarantine new arrivals.',
  conservation: { status: 'Least Concern (IUCN, assessed 2009, published 2010)', note: 'A living relative of fishes from over 200 million years ago (SF).' },
  special: { airBreather: true, escapeArtist: true, outgrowsSmallTanks: true },
  behaviorSet: 'bichir',                     // NEW (closest: loach_eel for bottom-hugging, cave rest)
  behaviorTraits: { cruiseSpeed: 0.2, burstSpeed: 3, turnRate: 1.5, hoverTendency: 0.1, schoolingTightness: 0, restOnBottom: 0.85, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.3, nocturnal: 0.8 }, // derived
  specialBehaviors: ['fin_prop_rest', 'air_gulp', 'scent_hunt', 'eel_swim', 'night_prowl', 'escape_attempt'],
  visualLane: 'fish',
}
```

**Genetics.**
- No named colour forms; the generic intensity locus applies. (*P. senegalus* has an albino; the ornate has none.)
- **baseVisual:**

  | Field | Value | What it draws |
  |---|---|---|
  | `bodyColor` | `#5a4a32` | brownish grey |
  | `bodyColor2` | `#3e3222` | |
  | `bellyColor` | `#e6d898` | whitish to yellowish |
  | `finColor` | `#4a3e2c` | |
  | `finColor2` | `#efe6c8` | pale spots that alternate with dark ones into bars |
  | `accentColor` | `#d9b94a` | yellow net between the black |
  | `eyeColor` | `#c9a040` | |

  Also: `pattern: 'reticulated'` (head finely reticulated), `patternScale 0.6`, `patternContrast 0.9`, `finType 'bichir'`.
- **Art:**
  - an eel-like armoured body with a row of **9–11 small dorsal finlets**
  - fan-like pectoral fins on fleshy bases
  - flared nostril tubes (bichirs hunt by smell, SF)

### Young and sexes
- **Young:** juveniles have **external, feathery, amphibian-like gills** behind the head, which they lose as they grow (SF). Draw them on small fish, say under ~10 cm, fading out by sub-adult size. No source describes a different juvenile colour.
- **Sexes:** males have a **thicker, broader anal fin** (SF; MFK: "greatly swollen"). Females are generally larger and rounder when carrying eggs (MFK, Tier 3).
- **Art:** an adult male with a broad, paddle-like anal fin and a female with a narrow one, at about the same size.

### Behaviour
- **Rest:** spends most of the day **lying on the bottom, propped on its pectoral fins**, or under wood and caves. *Polypterus* "walk" on their pectorals (Standen et al. 2014, genus-level).
- **Night:** at dusk it prowls the bottom slowly with eel-like sinuous swimming, nosing for food by smell. Its eyesight is very poor (SF).
- **Air breathing:** regularly **rises to the surface to gulp air**, then sinks back (SF: lung-like swim bladder; may drown without air).
- **Escapes:** squeezes through gaps in lids (SF, LA).
- **Hunting:** a lunge-and-swallow on prey it bumps into at night.
- **Feeding:** a slow feeder that is outcompeted by fast fish.
- **Behaviour set:** propose **`bichir`**:
  - bottom-hugging, with a `rest: 'bottom'` "propped" pose on pectoral fins
  - an `airBreath` interval, as `bottom_forager` has, but longer, with a full rise to the surface
  - eel-like body flex at low speed, high `nocturnal`, a slow `forage` and night `hunt`
  - `loach_eel` is the nearest existing set, but it hides in caves all day and doesn't breathe air

### Compatibility
| Other | Verdict | Reason (sources) |
|---|---|---|
| Oscar | usually_compatible | Size-matched adults (see the oscar section). |
| Clown loach | conditional | Adult loaches only: a bichir eats any fish that fits, at night (LA, FishBase). |
| Black ghost knifefish | usually_compatible | SF lists knifefish. Night food competition. |
| Fahaka puffer | incompatible | Bites. |
| Motoro stingray | conditional | SF (ray page): bichirs work "in a tank with a very large footprint"; both feed on the bottom. |
| Silver arowana | usually_compatible | LA lists ornate bichirs as arowana tankmates. SF bichir tankmates include surface-dwelling African butterflyfish. Different zones. |
| Koi | incompatible | Cool water. |
| Mono, scat, marine | incompatible | Salinity. |
| Tetras, rasboras, danios, livebearers, white cloud, medaka | incompatible | Swallowed at night (LA, SF). |
| Swordtail, sailfin molly | high_risk | 11 cm is within reach of a 50 cm bichir. |
| Corydoras, kuhli loach, otocinclus | incompatible | Bottom fish found at night. |
| Bristlenose pleco | conditional | Armoured and fast, but 12 cm; adults only. |
| Hillstream loach | incompatible | Cool water, small. |
| Gouramis, betta | incompatible | Eaten. |
| Angelfish, discus | conditional | Too deep-bodied to swallow as adults, but they sleep in mid-water at night; discus need 28–30 °C (the bichir tops at 28–29). |
| German blue ram | incompatible | Eaten. |
| Shrimp, crayfish | incompatible | Eaten (LA: invertebrates that fit). |
| Snails | usually_compatible | Not a snail-eater (FishBase diet: worms, larvae, fish). |
| Goldfish, axolotl | incompatible | Cool water; axolotl eaten. |
| African dwarf frog | incompatible | Eaten. |
| Pea puffer | incompatible | Eaten. |
| Brackish roster | incompatible | Salinity. |

**Proposed `exceptionRules`:**
- `tag:fish_tiny` and `tag:fish_small`: incompatible, 0.4 / 0.3, "swallowed at night".
- `tag:fish_benthic`: high_risk, 0.15.
- `tag:fish_medium`: high_risk, 0.08, mitigatedBy `tank_size`.
- `tag:shrimp_dwarf`: incompatible.
- `tag:amphibian`: incompatible.
- `fahaka_puffer`: incompatible.

### Smallest tank tier for an adult
**180 gal (72×24×25 in)**. SF's floor of 180×60 cm is exactly the 180's footprint. The 125 fails on width.

---

## Silver arowana
*Osteoglossum bicirrhosum* (Cuvier 1829) · proposed group `arowana` · `not_in_game` breeding (male mouthbrooder; farmed in ponds or wild-collected)

**Name check.** CoF: valid as *Osteoglossum bicirrhosum* (Cuvier 1829), originally *Ischnosoma bicirrhosum*. The Spix & Agassiz 1829 name is an objective synonym. Its only congener is the black arowana *O. ferreirai*. The Asian arowana (*Scleropages formosus*, CITES I) is out of scope, as the brief says.

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Osteoglossum-bicirrhosum.html) | 1 | **90 cm TL**, 6 kg; 24–30 °C; Amazon, Rupununi, Oyapock; feeds on fish at the surface and **jumps out to catch large beetles**; **male carries eggs, larvae and young in his mouth for nearly six weeks**; IUCN LC (4 Nov 2020) |
| [Catalog of Fishes](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?tbl=species&genus=Osteoglossum) | 1 | valid name, authority Cuvier 1829 |
| [USFWS Ecological Risk Screening Summary (2020)](https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Arawana_0.pdf) | 1 | overall US risk **Low**; introductions never established; **regulated in Hawaii (Conditional list), Mississippi (all Osteoglossidae prohibited: import, sale, possession) and Oklahoma (Osteoglossum possession prohibited)**; quotes Moreau & Coomes 2006: **maturity after ~2 years**, up to 20 years in captivity (hobby), young released from the male's mouth at **25–40 mm** once the yolk is absorbed, independent at 4–6 weeks, 2005 US prices $10–20 for yolk-sac fry, $25–65 for 10–20 cm juveniles, $100+ adults; Soares et al. 2008: **females mature from 55 cm SL**, spawning Dec–Jan; Armando et al. 2018: fry survival 78 % at 26 °C, 20 % at 30 °C; sporadic weak electric discharges recorded (Orlov 2015) |
| [Verba et al. 2014, Neotrop. Ichthyol. 12:145–151](https://scielo.br/j/ni/a/vjSLNXfJGmLNrC7B9ZR9pkb/?lang=en) | 1 | **broods of 57–146 young**, 1.0–6.8 cm; mouthbrooding nearly six weeks; mostly one father, some extra-pair or cooperative care; **ornamental trade illegal in Brazil**; upper water column of flooded forest |
| Moreau & Coomes 2006, Oryx 40:152–160 *(via the USFWS quotes and search index)* | 1 | killing mouthbrooding males to take their young may threaten Peruvian stocks; arowana was 42 % of Peru's ornamental export value in 2001 |
| [Smithsonian National Zoo](https://nationalzoo.si.edu/animals/silver-arowana) | 1 | can exceed 100 cm; **lived beyond 10 years in human care**; eats insects, fish, crabs, snails, snakes, small birds from low branches; waits parallel to fallen trees to ambush; leaps; spawns Dec–Jan; few large eggs; male mouthbroods ~2 months; **juveniles have blue glints and a yellow-orange bar; adult scales shift toward red, blue and green with age**; **males slenderer with a longer anal fin**; zoo diet gel, smelt, shrimp, insects, worms |
| [Lowry et al. 2005, Environ. Biol. Fishes 73:453–462](https://www.practicalfishkeeping.co.uk/fishkeeping-news/arowana-mouth-allows-aerial-feeding/) *(via a PFK news summary)* | 1 | aerial feeding uses faster, wider, later jaw opening than underwater feeding; large fish leap "several feet" for insects, spiders and birds |
| [Seriously Fish](https://www.seriouslyfish.com/species/osteoglossum-bicirrhosum/) | 2 | **800 mm SL**; **tank at least 2 m long**, only public or the largest private aquaria; 20–30 °C, pH 5.0–7.5, 2–15 dGH; high dissolved oxygen, moderate water movement; never in an immature tank; **prodigious jumper: tight, heavy lid**; surface dweller; peaceful with fish too big to swallow; aggressive to its own kind in limited space; avoid other surface dwellers; no mammal or bird meat; feeder fish not recommended; gut-loaded crickets fine; juveniles a single dark lateral stripe; **hatchlings 50–75 mm with a large yolk sac, often sold at this stage**; brood 12–30, females 50–250 eggs a season; commercially bred in outdoor facilities, not in aquaria |
| [LiveAquaria](https://www.liveaquaria.com/products/silver-arowana) | 2 | 35 in (47 in wild); **250 gal minimum**; 75–82 °F, pH 6.0–8.0, dKH 1–8; jumps when chasing prey, needs a heavy cover; young harassed by cichlids; **tankmates knifefish, large plecos, catfish, ornate bichirs**; males mouthbrood 50–60 days; breathes air through its swim bladder for short periods out of water; **won't ship to Mississippi, New York or Oklahoma**; **$59.99** (3–5 in) |
| [PFK, Aquarama's most expensive fish](https://www.practicalfishkeeping.co.uk/fishkeeping-news/aquaramas-most-expensive-fish/) | 2 | a near-white **"platinum" *Osteoglossum*** at Aquarama 2007, exceptionally rare, offered for over 200,000; *Osteoglossum* are generally farmed and also wild-imported |
| [SF, motoro stingray](https://www.seriouslyfish.com/species/potamotrygon-motoro/) | 2 | arowana with motoro "a very striking combination" |
| [Wikipedia](https://en.wikipedia.org/wiki/Silver_arowana) | 3 | colour the same all its life (the black arowana's juveniles differ); "water monkey"; birds, bats, mice and snakes found in stomachs; not CITES; IUCN LC (2023); Brazil–Colombia closed seasons |
| Hobby tank consensus: fishkeepingworld, MFK threads *(search snippets)* | 3 | 250–300 gal; **8×3 ft minimum, 10 ft preferred** for one adult |

**Modelled as:**
- an 85 cm adult surface patroller; **500 gal, 120×36 footprint** (it needs room to turn a 85–90 cm body; see the tier section)
- `escapeArtist` (jumper), `outgrowsSmallTanks`, `heavyWaste`; one per tank
- a surface predator of fish, insects and crustaceans: `maxLikelyPreySizeCm 18` (derived)
- breeding `not_in_game`, with the real male mouthbrooding recorded; parentalCare `male_mouth`
- US legality noted (MS and OK prohibited, HI conditional)
- intensity locus, with an optional legendary "Platinum"

**Conflicts:**
- **Size.** FishBase 90 cm TL, SF 80 cm SL, LA 35 in, National Zoo >100 cm. The game uses 85 cm.
- **Brood size.** SF says 12–30, Verba 2014 57–146 (genetically sampled broods). The game uses Verba's Tier 1 figure.
- **Brooding time.** FishBase and Verba say ~6 weeks, LA 50–60 days, National Zoo ~2 months. The game uses 6 weeks.
- **Captive-bred or wild.** SF says "commercially bred in outdoor facilities" and PFK "generally farmed", but Moreau & Coomes and Verba describe large wild collection of yolk-sac fry in Peru and Colombia. `captiveBredAvailable: false` is proposed because most trade fish are wild-collected; this is the owner's call.
- **Air breathing.** LA says it breathes air through the swim bladder, and FWS says it adapts to low oxygen. It is facultative, not obligate, so `airBreather` is not set: it lives at the surface anyway.
- **Temperament.** SF says peaceful with big fish, LA semi-aggressive. The game uses predatory with moderate aggression.

### Proposed game data
```ts
{
  id: 'silver_arowana',
  commonName: 'Silver Arowana',
  scientificName: 'Osteoglossum bicirrhosum',
  category: 'fish',
  group: 'arowana',                          // NEW group
  genus: 'Osteoglossum',
  environment: 'freshwater',
  waterClasses: ['freshwater_tropical'],
  nativeRegion: 'Amazon, Essequibo (Rupununi) and Oyapock basins, in flooded forests of black and white waters; replaced by the black arowana through most of the Rio Negro',
  isStarter: false,
  adultSizeCm: 85,                           // FishBase 90 TL; SF 80 SL; LA 35 in
  recommendedMinTankGallons: 500,            // SF ≥2 m long; LA 250 gal; hobby 8×3 ft min, 10 ft preferred → conservative
  recommendedFootprint: { minLengthIn: 120, minWidthIn: 36 },
  activeSwimmer: true,
  bioload: 12,                               // derived
  tempC: { min: 22, max: 30, idealMin: 25, idealMax: 28 }, // SF 20–30; FishBase 24–30; LA 24–28; fry survive best at 26 (Armando 2018)
  pH: { min: 5.5, max: 7.5, idealMin: 6.0, idealMax: 7.0 }, // SF 5.0–7.5; LA 6–8
  salinitySG: null,
  gh: { min: 2, max: 15 },                   // SF
  kh: { min: 1, max: 8 },                    // LA
  flowPreference: 'moderate',                // SF moderate movement, high oxygen
  lightPreference: 'moderate',
  diet: 'carnivore',                         // FishBase "omnivore tending to fish"; SF generalist predator
  foods: ['pellet_large', 'earthworm', 'bloodworm', 'mysis'], // + proposed 'insect' (crickets), 'pellet_floating' (carnivore sticks), 'seafood'
  feedingStyle: 'surface',
  feedingSpeed: 0.9,
  feedingAggression: 0.7,
  hungerHours: 30,                           // derived
  activityZone: ['surface', 'upper'],
  temperament: 'predatory',
  territoriality: 0.5,
  aggression: 0.4,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, note: 'One per tank: aggressive to its own kind where space is limited, and even big groups form a pecking order (SF). Avoid other surface dwellers (SF).' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'fight', mixed: 'harassment', juvenile: 'tension' },
  predatorTags: ['fish_tiny', 'fish_small', 'fish_medium', 'fry', 'shrimp_dwarf', 'shrimp_fry', 'shrimp_large', 'crustacean', 'snail_small', 'worm', 'amphibian'], // FishBase, National Zoo, Wikipedia
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 18,                   // derived
  shrimpSafe: 'unsafe', snailSafe: 'mostly_safe', frySafe: 'unsafe', plantSafe: 'safe',
  reefSafe: 'unsafe', coralRisk: 0, anemoneRelationship: 'not_applicable',
  hidesNeeded: 0,
  coverPreference: 0.2,                      // SF: floating or overhanging plants appreciated
  substrateRules: { preferred: ['sand', 'bare', 'fine_gravel'], avoid: [], note: 'Open swimming length and a tight, heavy lid matter, not the substrate (SF, LA). A mature tank only (SF).' },
  breeding: {
    system: 'not_in_game',                   // would be 'mouthbrooder' (male) if ever bred
    difficulty: 1,
    maturityDays: 25,                        // ~2 years (Lowe-McConnell via Moreau & Coomes); females from 55 cm SL (Soares 2008)
    clutchSize: { min: 57, max: 146 },       // Verba 2014; SF 12–30
    incubationHours: 336,                    // eggs + larvae held ~6 weeks (FishBase, Verba) = 42 d × 8
    fryRearingHours: 0,
    cooldownDays: 365,                       // once a year, Dec–Jan (National Zoo)
    conditions: { needsPartner: true, minTankGallons: 1000 },
    predationWithoutNursery: 1,
    nurseryRequired: true,
    maxRaisedPerClutch: 1,
    notes: 'Spawns once a year as the floods begin. The female lays a few large eggs, and the male carries eggs, larvae and young in his mouth for about six weeks; the young go out to feed and dart back at danger (Verba 2014; Moreau & Coomes 2006). Not bred in aquaria (SF): fish are farmed in outdoor ponds, or yolk-sac young are collected in Peru and Colombia, often by killing the brooding father.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'male_mouth',
  lifecycle: { juvenileDays: 22, adultDays: 25, lifespanDays: 480, sexVisibleAtDays: 25, hatchSizeCm: 1.0 }, // >10 y (National Zoo), to 20 (hobby, via FWS) → 12 y; embryos 1.0 cm in the mouth (Verba)
  hardiness: 0.6,                            // SF rates it difficult; drop-eye and jump injuries
  difficulty: 'advanced',
  baseValue: 60,                             // LA $59.99 (3–5 in); Aqua Imports $22.99–159.99 (via FWS)
  rarity: 'uncommon',
  visitorAppeal: 0.95,
  captiveBredAvailable: false,               // see conflicts
  wildCaughtNote: 'Most are collected wild as yolk-sac young in Peru and Colombia, often by killing the brooding male (Moreau & Coomes 2006); pond-farmed fish also exist (SF).',
  conservation: { status: 'Least Concern (IUCN; not CITES-listed)', note: 'Considered threatened in Peru by the trade in young (Moreau & Coomes 2006). The ornamental trade is illegal in Brazil (Verba 2014). In the US it is prohibited in Mississippi and Oklahoma and restricted in Hawaii (USFWS).' },
  special: { escapeArtist: true, outgrowsSmallTanks: true, heavyWaste: true },
  behaviorSet: 'arowana',                    // NEW (closest: archerfish surface cruiser)
  behaviorTraits: { cruiseSpeed: 0.4, burstSpeed: 6, turnRate: 1.0, hoverTendency: 0.5, schoolingTightness: 0, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.15, curiosity: 0.5, nocturnal: 0.2 }, // derived
  specialBehaviors: ['surface_patrol', 'jump_strike', 'barbel_probe', 'log_ambush', 'feeding_anticipation'],
  visualLane: 'fish',
}
```

**Genetics.**
- No named domestic colour forms; the generic intensity locus applies.
- **Optional legendary form "Platinum":** a near-white *Osteoglossum*, "exceptionally rare", shown at Aquarama 2007 and offered for over 200,000 (PFK, Tier 2). Inheritance is unknown and it has never been bred. If used, add a `platinum` locus with a recessive `p` at ~0.002 frequency, `rare: true`, rarity 'legendary', and an honest note that the gene model is an assumption.
- Vendor "albino" and "leucistic" silver arowanas exist in Tier 3 listings only and are left out.
- **baseVisual:**

  | Field | Value | What it draws |
  |---|---|---|
  | `bodyColor` | `#c9cdd2` | bright silver |
  | `bodyColor2` | `#d6b0a8` | rosy scale edges in older fish |
  | `bellyColor` | `#e6e8ea` | |
  | `finColor` | `#a8a49a` | |
  | `finColor2` | `#c86a5a` | reddish rear dorsal and anal margins |
  | `accentColor` | `#8fb0d0` | blue-green scale glints |
  | `eyeColor` | `#c9a85a` | |

  Also: `pattern: 'dragon_scale'` (huge scales), `patternScale 1.4`, `metallic 0.85`, `iridescence 0.5`, `finType 'arowana'`.
- **Art:**
  - a long, compressed blade of a body
  - an upturned, trapdoor mouth with **two forward-pointing barbels** on the chin (*bicirrhosum* = "two barbels")
  - dorsal and anal fins far back, nearly fused with the small tail (Wikipedia)

### Young and sexes
- **Young:**
  - shop fish are 5–7.5 cm and may still carry a **large external yolk sac** under the belly (SF)
  - juveniles show **blue glints and a yellow-orange bar** (National Zoo) and a single dark lateral stripe (SF)
  - draw a yolk-sac stage at the smallest size, then a juvenile with a dark stripe and orange-blue glints
- **Adults:** silver, the scales taking on **red, blue and green tints with age** (National Zoo).
- **Sexes:** **males slenderer with a longer anal fin** (National Zoo). Forum keepers add a deeper jaw in males but call every sign unreliable. Draw a male slimmer with a longer anal fin, and a female deeper-bodied.

### Behaviour
- **Swimming:** cruises slowly just under the surface, body straight, barbels forward, scanning above and below. Its upturned mouth takes prey from below (FishBase, National Zoo).
- **Signature behaviours:**
  - **jump strike:** in the wild it leaps out of the water to snatch insects, spiders and even birds from branches; large fish leap "several feet" (Lowry 2005; FishBase). In a tank it jumps at food and at movement above, so it needs a heavy lid (SF, LA).
  - **log ambush:** waits parallel to a fallen log, then rushes (National Zoo). In a tank, it holds still beside driftwood.
  - learns feeding times and swims to the feeding spot (common keeper report; no Tier 1 or 2 source).
- **Rest:** hangs still near the surface at night, more or less diurnal.
- **Behaviour set:** propose **`arowana`**, based on `archerfish`:
  - a near-surface cruise with a low pitch limit, `surface_dweller` zone weighting and a slow, wide turn
  - a `jump_strike` act: a fast upward burst that breaks the surface when food lands or something moves above
  - startle response: a hard burst, which is when tank fish injure themselves
  - no schooling

### Compatibility
| Other | Verdict | Reason (sources) |
|---|---|---|
| Oscar | usually_compatible | PFK lists arowana as an oscar tankmate. LA: young arowana are harassed by cichlids, so add it large. |
| Clown loach | usually_compatible | Different zones; loaches under ~15 cm are prey. |
| Black ghost knifefish | usually_compatible | LA lists knifefish as tankmates. |
| Fahaka puffer | incompatible | Bites. |
| Ornate bichir | usually_compatible | LA lists ornate bichirs as tankmates. |
| Motoro stingray | usually_compatible | SF (ray page): "a very striking combination" in a roomy tank. |
| Koi | incompatible | Cool water. |
| Mono, scat, marine | incompatible | Salinity. |
| Tetras, rasboras, danios, livebearers, white cloud, medaka, endler | incompatible | Eaten (SF: peaceful only with fish too big to swallow). |
| Swordtail, sailfin molly | high_risk | Mid- and upper-water 11 cm fish. |
| Gouramis, betta | incompatible | Surface fish of swallowable size; SF says avoid other surface dwellers. |
| Corydoras, kuhli loach, otocinclus | conditional | Bottom fish, out of its zone, but small: anything rising is taken. |
| Bristlenose pleco | usually_compatible | LA: large plecos are good tankmates. |
| Angelfish | high_risk | Upper and mid-water and swallowable while young. |
| Discus | conditional | Deep-bodied adults are too big, but discus need 28–30 °C and calm. |
| German blue ram | incompatible | Small. |
| Shrimp | incompatible | Eaten (Wikipedia: crustaceans). |
| Snails, dwarf crayfish | usually_compatible / conditional | Bottom animals out of its zone; crayfish climbing decor are taken. |
| Goldfish, axolotl, African dwarf frog | incompatible | Cool water (goldfish, axolotl); the frog surfaces to breathe and is eaten. |
| Pea puffer | incompatible | Eaten. |
| Brackish roster | incompatible | Salinity. Archerfish would also be a surface rival. |

**Proposed `exceptionRules`:**
- `tag:fish_tiny` and `tag:fish_small`: incompatible, 0.4 / 0.3.
- `tag:fish_medium`: high_risk, 0.1, mitigatedBy `tank_size`.
- `tag:shrimp_dwarf`: incompatible.
- `tag:amphibian`: incompatible.
- `oscar`: conditional, "young arowana are harassed by cichlids (LA)", mitigatedBy `tank_size`.
- `fahaka_puffer`: incompatible.

### Smallest tank tier for an adult
**500 gal (120×36×27 in).** SF wants at least 2 m (79 in) of length. The hobby consensus is 8×3 ft (96×36) minimum, 10 ft preferred, and the fish needs about its own body length (85–90 cm, ~35 in) of width to turn. Every tier below 500 is only 24 in wide, so 500 is the smallest that fits. The 300 gal (96×24) has the length but not the width. LA's 250 gal is a minimum for a sub-adult at best.

---

## Cross-species notes

**Tank-tier reality check.**
- The sources put four of these six in the existing 180-gal tier: oscar, clown loach group, fahaka and ornate bichir.
- The black ghost knifefish needs 240 under the conservative rule (500 under PFK's strict 3 m).
- Only the **silver arowana** truly needs 500.
- Owner decision: if chunk 17 wants these as "big-tank" fish, the honest lever is **group or pair size** (an oscar pair → 240; clown loaches at the ideal 8–10 → 240), not inflating a single fish's minimum.

**New foods needed:**

| Food | Tag | Fish | Notes |
|---|---|---|---|
| Insects | `insect` (crickets, mealworms) | silver arowana (SF gut-loaded crickets; National Zoo), oscar (SF, Co-op), fahaka (PEW 10 %) | Gut-load before feeding (SF). Koi do not need it. |
| Shell-on crustaceans and hard shellfish | `shellfish_hard` (frozen crayfish, crab legs, cockles) | fahaka: ~55 % of the diet (PEW), and the main thing that keeps its beak worn (SF, Vet Times) | Also useful for the existing figure-eight puffer. |
| Seafood chunks | `seafood` (prawn, lancefish, white fish, mussel, krill, silversides) | oscar, ornate bichir, silver arowana, BGK (prawn) | Today this food is `meaty_frozen` "Frozen Krill & Silversides", tagged only `pellet_large`. A dedicated tag would let the shop and guide say "seafood" honestly. |
| Floating carnivore sticks | `pellet_floating` | silver arowana: a surface feeder that sinking pellets pass by | Koi sticks are the same idea for koi. The autofeeder rule (dry food only) would apply. |

**Feeding cautions:**
- **No mammal or bird meat** such as beef heart or chicken for the oscar and arowana (SF: they can't metabolise the fats).
- **No feeder goldfish or livebearers** (SF oscar and arowana: parasites, poor nutrition).
- **Thiaminase:** PEW warns that mussels, clams and oysters are thiaminase-rich, so treat them as occasional only for the fahaka. SF still lists mussel for the oscar and bichir, so the guide should say "occasionally".
- **Oscars need vitamin C** in the diet (ADW, Wikipedia). Co-op links hole-in-the-head to diet (vitamin supplement).

**New behaviour sets:** `cichlid_large` (oscar), `loach_shoal` (clown loach), `knifefish` (BGK), `bichir` (bichir), `arowana` (arowana), and optionally `puffer_large` (fahaka; `pea_puffer` works with sand-wallow and inflate added).

**New act or locomotion needs:**
- a reverse-swim mode without turning (knifefish)
- an air-breath rise for a bottom fish (bichir; extend `airBreath`)
- a surface-breaking jump strike (arowana; like the archerfish `jump_feed`)
- side-lying rest (clown loach)
- sand wallow (fahaka; like the wrasse `sand` rest)
- dig and redecorate (oscar)

**Breeding systems:** none new needed. Oscar uses `substrate_spawner`; bichir uses `egg_scatter_cover`. The arowana would use the existing `mouthbrooder` with `male_mouth` if it were ever bred. A **"rain trigger"** condition (a big soft-water change) would be the honest cue for the bichir and for gymnotiforms; the closest existing key is `coolingTrigger`.

**Flags:**
- Existing flags cover most needs: `speciesOnly` (fahaka), `airBreather` (bichir), `escapeArtist` (oscar, clown loach, bichir, arowana), `medicationSensitive` (BGK, clown loach), `burrower` (fahaka), `highOxygen` (BGK), `heavyWaste`, `outgrowsSmallTanks`.
- **Possible new flags:**
  - `beakGrowth`: a puffer that needs hard-shelled food or its beak overgrows, needing a vet trim under anaesthetic (Vet Times). Applies to the fahaka and the existing pea and figure-eight puffers.
  - `rearrangesDecor` for the oscar: digs and moves decor (PFK). Today it can only be expressed as plantSafe 'unsafe'.

**New groups:** `knifefish`, `bichir`, `arowana`.

**Surprises:**
- **Black ghost breeding.** It is not hormone-only: the documented farm breeding uses ponds and conductivity cues. The clown loach really is hormone-only.
- **Silver arowana legality.** It is illegal to own in Mississippi and Oklahoma and restricted in Hawaii (USFWS). The game is not region-locked, but the encyclopedia should say so.
- **Oscar albino inheritance.** "Recessive" is everywhere in hobby writing, but no Tier 1 or 2 source documents it.
- **Red oscars.** They are a genetically distinct strain (Syam 2019) that fades without carotenoids, a nice "feed for colour" hook if the game ever models diet-dependent colour.

## Sources
- FishBase: [*Astronotus ocellatus*](https://www.fishbase.se/summary/Astronotus-ocellatus.html) · [*Chromobotia macracanthus*](https://www.fishbase.se/summary/Chromobotia-macracanthus.html) · [*Apteronotus albifrons*](https://www.fishbase.se/summary/Apteronotus-albifrons.html) · [*Tetraodon lineatus*](https://www.fishbase.se/summary/Tetraodon-lineatus.html) · [*Polypterus ornatipinnis*](https://www.fishbase.se/summary/Polypterus-ornatipinnis.html) · [*Osteoglossum bicirrhosum*](https://www.fishbase.se/summary/Osteoglossum-bicirrhosum.html)
- Catalog of Fishes: [Astronotus](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?tbl=species&genus=Astronotus) · [Chromobotia](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?tbl=species&genus=Chromobotia) · [Apteronotus](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?tbl=species&genus=Apteronotus) · [Tetraodon](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?tbl=species&genus=Tetraodon) · [Polypterus](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?tbl=species&genus=Polypterus) · [Osteoglossum](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?tbl=species&genus=Osteoglossum)
- Animal Diversity Web: [*Astronotus ocellatus*](https://animaldiversity.org/accounts/Astronotus_ocellatus/)
- USGS NAS: [Oscar fact sheet](https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=436)
- USFWS: [Arawana Ecological Risk Screening Summary (2020)](https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Arawana_0.pdf)
- Smithsonian National Zoo: [Silver arowana](https://nationalzoo.si.edu/animals/silver-arowana)
- Papers:
  - [Wang et al. 2022 (PubMed)](https://pubmed.ncbi.nlm.nih.gov/34864613/)
  - [Hydrobiologia 2022, amelanistic oscar](https://link.springer.com/article/10.1007/s10750-022-04921-w) (abstract via search index)
  - [Syam et al. 2019 (WAS abstract)](https://was.org/Meeting/Program/PaperDetail/153650)
  - [Legendre et al. 2012](https://www.cambridge.org/core/product/7C17B5FF5CE8B86FF03F32B10D26ABAC)
  - [Maulana et al. 2021](https://doi.org/10.15578/iaj.16.1.2021.29-34) (via [Crossref](https://api.crossref.org/works?query.bibliographic=Spawning+of+black+ghost+knifefish+Apteronotus+albifrons+with+different+sex+ratios&rows=2))
  - [Kirschbaum & Schugardt 2002](https://doi.org/10.1016/S0928-4257(03)00011-1) (via Wikipedia and search index)
  - [Verba et al. 2014](https://scielo.br/j/ni/a/vjSLNXfJGmLNrC7B9ZR9pkb/?lang=en)
  - Moreau & Coomes 2006, Oryx 40:152–160, doi:10.1017/S0030605306000603 (via USFWS ERSS)
  - Britz & Bartsch 1998, Ichthyol. Explor. Freshw. 9:325–334 (citation only)
  - [Standen et al. 2014 via McGill newsroom](https://mcgill.ca/newsroom/node/21059)
  - [Lowry et al. 2005 via PFK](https://www.practicalfishkeeping.co.uk/fishkeeping-news/arowana-mouth-allows-aerial-feeding/)
- Seriously Fish: [Oscar](https://www.seriouslyfish.com/species/astronotus-ocellatus/) · [Clown loach](https://www.seriouslyfish.com/species/chromobotia-macracanthus/) · [Black ghost](https://www.seriouslyfish.com/species/apteronotus-albifrons/) · [Fahaka](https://www.seriouslyfish.com/species/tetraodon-lineatus/) · [Ornate bichir](https://www.seriouslyfish.com/species/polypterus-ornatipinnis/) · [Silver arowana](https://www.seriouslyfish.com/species/osteoglossum-bicirrhosum/) · [Motoro](https://www.seriouslyfish.com/species/potamotrygon-motoro/)
- LiveAquaria: [Tiger Oscar](https://www.liveaquaria.com/products/tiger-oscar) · [Albino Tiger Oscar](https://www.liveaquaria.com/products/tiger-oscar-albino) (search snippet) · [Longfin Oscar](https://www.liveaquaria.com/product/6604/?pcatid=6604) · [Clown loach](https://www.liveaquaria.com/products/clown-loach) · [Black ghost](https://www.liveaquaria.com/product/857/?pcatid=857) · [Fahaka](https://www.liveaquaria.com/products/fahaka-puffer) · [Ornate bichir](https://www.liveaquaria.com/products/ornate-bichir) · [Silver arowana](https://www.liveaquaria.com/products/silver-arowana)
- Aquarium Co-Op: [Oscar](https://www.aquariumcoop.com/blogs/aquarium/oscar-fish-care-guide) · [Clown loach](https://www.aquariumcoop.com/blogs/aquarium/clown-loach-care-guide)
- Practical Fishkeeping:
  - [Night of the Oscars](https://www.practicalfishkeeping.co.uk/features/night-of-the-oscars/)
  - [Clown loach bred](https://www.practicalfishkeeping.co.uk/fishkeeping-news/fishkeeper-successfully-breeds-clown-loach/)
  - [How long will my fish live?](https://www.practicalfishkeeping.co.uk/fishkeeping-news/how-long-will-my-fish-live/)
  - [39 top tips](https://www.practicalfishkeeping.co.uk/features/articles/39-top-tips-for-fishkeepers)
  - [Predators: the knifefishes](https://www.practicalfishkeeping.co.uk/features/predators-the-knifefishes/)
  - [What can I keep with these knifefish?](https://www.practicalfishkeeping.co.uk/fishkeeping-answers/what-can-i-keep-with-these-knifefish/)
  - [5 spooky aquarium inhabitants](https://www.practicalfishkeeping.co.uk/features/5-spooky-aquarium-inhabitants-and-how-to-keep-them/)
  - [New black ghost named](https://www.practicalfishkeeping.co.uk/fishkeeping-news/new-black-ghost-knifefish-named/)
  - [Aquarama's most expensive fish](https://www.practicalfishkeeping.co.uk/fishkeeping-news/aquaramas-most-expensive-fish/)
- Other Tier 2: [Quality Marine, Lemon Longfins](https://www.qualitymarine.com/news/oscar-isnt-that-grouchy-lemon-longfins/) · [Aquarium Glaser, Red, Albino Red and Red Chili](https://www.aquariumglaser.de/en/fisharchive/astronotus-red-albino-red-and-red-chili/) · [Aquarium Glaser, A. mikoljii](https://aquariumglaser.de/en/fisharchive/astronotus-mikoljii-4) · [Aquarium Glaser, A. albifrons WHITE](https://aquariumglaser.de/en/tag/albifrons-en) · [TFH, Apteronotus albifrons](https://www.tfhmagazine.com/articles/freshwater/apteronotus-albifrons) · [Vet Times, puffer beak trim](https://www.vettimes.com/news/vets/small-animal-vets/great-barrier-teeth-goldie-grinning-again-after-delicate-dental)
- Tier 3:
  - Wikipedia: [Oscar](https://en.wikipedia.org/wiki/Oscar_(fish)) · [Clown loach](https://en.wikipedia.org/wiki/Clown_loach) · [Black ghost knifefish](https://en.wikipedia.org/wiki/Black_ghost_knifefish) · [Ornate bichir](https://en.wikipedia.org/wiki/Ornate_bichir) · [Silver arowana](https://en.wikipedia.org/wiki/Silver_arowana)
  - Hobby and specialist sites: [Pufferfish Enthusiasts Worldwide, fahaka](https://www.pufferfishenthusiastsworldwide.com/post/fahaka-puffer-care-sheet) · [Polypterus.info](https://polypterus.info/p_ornatipinnis/) · [Oscar Fish Lover, albino](https://oscarfishlover.com/albino-oscar-fish/) · [Aquariadise, oscar types](https://www.aquariadise.com/types-of-oscar-fish/) · [Guidarium, clown loach and discus](https://guidarium.com/compatibility/clown-loach-and-discus)
  - MFK forum threads: [Oscar genetics](https://www.monsterfishkeepers.com/forums/threads/oscar-genetics.493386) · [Breeding ornates](https://www.monsterfishkeepers.com/forums/threads/breeding-ornates.94738/) · [ornate breeding report](https://www.monsterfishkeepers.com/forums/goto/post?id=7675739) · [Polypterus farm methods](https://www.monsterfishkeepers.com/forums/goto/post?id=6529660)
  - Search snippet only: [Aquarium Fish Paradise, BGK hormones claim](https://www.aquariumfishparadise.com.au/?p=422)

**Pages that would not load:**
- refused (403) or 404: alr-journal.org, core.ac.uk PDFs, ResearchGate, Academia, PMC (captcha), the Kirschbaum full text, LiveAquaria's old product/1196 URL, PFK's "how-to-care-for-oscars", theaquariumwiki and loaches.com
- unreachable host: the Indonesian Aquaculture Journal site and Cambridge's CMS PDF host
- the Semantic Scholar API rate-limited the request

Replacements are cited above.
