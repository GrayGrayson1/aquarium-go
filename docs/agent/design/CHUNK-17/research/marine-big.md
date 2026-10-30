# Chunk 17 research: big marine fish (blue tang, naso tang, queen angelfish, clown triggerfish, panther grouper)

Researched 2026-10-30 against the repo at `27f9d55` (read only). Format follows `docs/research/marine.md`. Tiers per
`docs/RESEARCH_SOURCES.md`. All pages below were fetched in this session unless marked "not loaded". Time compression
per `docs/GAME_DESIGN.md`: game hours ≈ real days × 8; maturity 8–25 game days; lifespan ≈ real years × 40, capped
near 500.

Tank tiers used for "smallest tier" (L×W in): 125 gal 72×18 · 180 gal 72×24 · 240 gal 96×24 · 300 gal 96×24 ·
500 gal 120×36 · 600 gal 120×36 · 800 gal 144×36 · 1,000 gal 144×48.

Summary of tiers: blue tang **180** (it is not really a big-tank species) · naso tang **240** · queen angelfish **300** ·
clown triggerfish **300** · panther grouper **500** (the honest minimum for an adult is well under 1,000 gal, so it can
stay in the game).

---

## Blue tang

*Paracanthurus hepatus* (Linnaeus, 1766) · Acanthuridae · `tang` · monotypic genus. Name current (FishBase, Fishes of
Australia; FAO lists no synonyms). Trade names: regal tang, hippo tang, palette surgeonfish, "Dory". Not the Atlantic
blue tang (*Acanthurus coeruleus*), a different fish whose juveniles really are yellow (see Conflicts).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Paracanthurus-hepatus.html) | 1 | **31 cm TL**; 2–40 m; clear current-swept seaward terraces; **loose groups 1–2 m above the bottom**; juveniles at *Pocillopora eydouxi* heads, **hide tightly among branches**; **mainly zooplankton**, some algae; venom gland groove listed; "very popular and hardy aquarium fish"; IUCN LC (2010) |
| [FAO WCP guide vol. 6, Acanthuridae (Randall 2001)](https://www.fao.org/4/y0870e/y0870e30.pdf) (text extracted from the PDF) | 1 | colour: bright blue, black "palette" on upper body ending in the eye, yellow tail triangle; caudal slightly rounded in young, truncate in adults; body depth 1.7× SL (small juveniles) to 2.3× (adults); max 31 cm, **commonly 20 cm**; feeds primarily on zooplankton; adults hard to approach; juveniles shelter among live coral |
| [Fishes of Australia](https://fishesofaustralia.net.au/Home/species/2203) | 1 | 31 cm TL; 2–40 m; clear exposed outer reefs with moderate to strong current; IUCN LC (McIlwain et al. 2012) |
| [Animal Diversity Web](https://animaldiversity.org/accounts/Paracanthurus_hepatus/) | 1 | **males larger than females**; broadcast spawning in groups or pairs, no care; up to **40,000 eggs** per session, about monthly; **eggs hatch in 25–28 h**; larvae mature after ~37 days; maturity ~11 cm (males), ~13 cm (females); wild >30 yr, **captive 8–20 yr (avg 12–14)**; **"plays dead" lying on its side**; wedges into branching coral with the caudal spine; **prone to ich (*Cryptocaryon*)**; (its juvenile colour text is wrong, see Conflicts) |
| [Wikipedia: Paracanthurus](https://en.wikipedia.org/wiki/Paracanthurus) (Tier 3, used only for what it cites) | 3 | **lower body yellow in west-central Indian Ocean fish, bluish in Pacific fish** (citing Debelius; Goda); palette not fully connected until maturity (Sang 2018); maturity at 9–12 months (Sang 2018); lighter blue at night (Goda); first captive-bred 2016 |
| [LiveAquaria: Blue Tang](https://www.liveaquaria.com/product/330/?pcatid=330) | 2 | **180 gal, ≥6 ft**; 72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12; 12"; moderate care; semi-aggressive, **aggressive to its own species**; reef compatible; seaweed ≥3×/week; **more susceptible to lateral line disease, fin erosion, ich**; **$109.99** |
| [LiveAquaria spotlight: The Blue Tang](https://www.liveaquaria.com/blogs/species-spotlight/the-blue-tang) | 2 | 180 gal; "one of the least aggressive tangs"; recommends one per tank; wild in large shoals (older page also says never captive-bred, now out of date) |
| [Quality Marine: The Blue Tang of Many Names](https://www.qualitymarine.com/news/the-blue-tang-of-many-names/) | 2 | **yellow-belly form only in the Indian Ocean / Red Sea, differs only in colour, yellow appears at maturity**; adults usually 8–10"; 180 gal, 6 ft+; high flow (≥20 turnovers/h); big eater and waste producer; may be territorial toward other tangs and some angels; mixed tangs work when added together; low coral risk; 7+ yr, one kept 11 yr |
| [Top Shelf Aquatics: Blue Hippo Tang](https://topshelfaquatics.com/pages/saltwater-fish/blue-hippo-tang) | 2 | 180 gal, 6 ft (some say 125); 12"; open-water swimmer, bolts into rock; **$53.99 (reg. $59.99); Yellow Belly $94.49 (reg. $104.99)** |
| [Reef Builders 2011: yellow belly blue tang](https://reefbuilders.com/2011/10/11/yellow-belly-blue-tang) | 2 | Indian Ocean form, same species; young look like a faded Pacific fish; a split blue-above/yellow-below pattern is uncommon |
| [Reef Builders 2016: captive bred blue tang](https://reefbuilders.com/2016/07/20/captive-bred-blue-tang) | 2 | **UF Tropical Aquaculture Lab + Rising Tide Conservation, announced July 2016** |
| [Rising Tide Conservation](https://www.risingtideconservation.org/tag/kevin-barden/) | 2 | first captive-bred Pacific blue tangs; 55 days post hatch photo; larvae fed *Parvocalanus* copepods |
| [Reef Builders Nov 2016](https://reefbuilders.com/2016/11/29/captive-bred-blue-tangs) | 2 | first captive-bred batch (>200 fish, ~2 in, blue) sold by Sea Dwelling Creatures, presumed Asian breeder |
| [CORAL Magazine Jan 2025](https://www.coralmagazine.com/?p=3078387) / [Biota shop](https://shop.thebiotagroup.com/collections/all/products/blue-tang) | 2 | **Biota: commercial-scale production announced 23 Jan 2025**; tiny CB fish $75 (reg. $120) |

**Modelled as:**
- 30 cm adult, **180 gal with a 72×24 in footprint** → smallest tier the **180-gal**; `activeSwimmer`, `outgrowsSmallTanks`
- omnivore, `feedingStyle 'midwater'` (wild zooplankton picker), plus seaweed several times a week
- reef-safe, shrimp- and snail-safe; one per tank (groups only in very large tanks, added together)
- a geographic colour form, **Yellow Belly** (Indian Ocean), in the game as a locality locus, inheritance unknown
- breeding `not_in_game`: hatchery only (UF 2016, Biota 2025), but `captiveBredAvailable: true`
- ich-prone: low hardiness (there is no `ichProne` flag; see Cross-species notes)
- `tang` behaviour set with "play dead" and "wedge in rock"

**Conflicts:**
- **Juvenile colour.** ADW and National Geographic say juveniles are "bright yellow". That is the Atlantic blue tang
  (*Acanthurus coeruleus*): Florida Museum and REEF describe its yellow juveniles with a blue eye ring, the same words
  ADW uses. FAO describes one colour pattern for *P. hepatus* at all sizes. Captive-bred fish sold at about 2 in are
  blue (Reef Builders 2016). The trade sells blue juveniles from ½ in (LiveAquaria sizes). The game draws juveniles
  blue like adults, with a rounder tail, a deeper body and an incomplete palette.
- Venom: FishBase lists a venom-gland groove and ADW calls the spine venomous, but no other source does, and the
  existing tangs don't set `venomous`. Not flagged; the keeper tip covers the scalpel.
- Size: 31 cm TL max (FishBase, FAO), commonly 20 cm, aquarium adults 8–10 in (QM) to 12 in (LA). The game uses 30 cm.
- Tank size: 125 (Top Shelf mentions it), 180 (LA, QM, Top Shelf). The game uses 180 and 6 ft. **The owner asked for
  species that need 240+ gal. By the sources the blue tang doesn't.** If the owner wants it on the big-tank list, the
  only defensible step up is 240 gal / 96 in for a group of two or more (not sourced as a minimum).
- Diet: LiveAquaria says herbivore; FishBase and FAO say mainly zooplankton. The game uses omnivore.

### Proposed game data

```ts
{
  id: 'blue_tang',
  commonName: 'Blue Tang',                      // aliases in encyclopedia: regal, hippo, palette tang
  scientificName: 'Paracanthurus hepatus',
  category: 'fish',
  group: 'tang',
  genus: 'Paracanthurus',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Indo-Pacific: East Africa and the Mascarenes to Kiribati and Samoa, north to southern Japan, south to the Great Barrier Reef and New Caledonia', // FishBase, FAO
  isStarter: false,
  adultSizeCm: 30,                              // FishBase/FAO 31 cm TL max, commonly 20; QM aquarium adults 8–10 in
  recommendedMinTankGallons: 180,               // LiveAquaria, Quality Marine, Top Shelf
  recommendedFootprint: { minLengthIn: 72, minWidthIn: 24 }, // LA/QM/Top Shelf: at least 6 ft
  activeSwimmer: true,                          // Top Shelf: cruises the display all day
  bioload: 3.5,                                 // QM: big eater, big waste producer; between yellow tang 3 and sailfin 3.6
  tempC: { min: 22, max: 28, idealMin: 23.5, idealMax: 26 },   // LA 72–78 °F; QM target ~75 °F
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },    // LA
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 }, // LA 1.020–1.025
  gh: null,
  kh: { min: 7, max: 12 },                      // LA dKH 8–12
  flowPreference: 'high',                       // FishBase/FoA current-swept reefs; QM ≥20 turnovers/h
  lightPreference: 'bright',
  diet: 'omnivore',                             // FishBase/FAO zooplankton; LA/QM seaweed ≥3×/week
  foods: ['mysis', 'brine_shrimp', 'pellet_small', 'flake', 'nori', 'vegetable', 'algae_wafer'],
  feedingStyle: 'midwater',
  feedingSpeed: 0.75,
  feedingAggression: 0.5,
  hungerHours: 10,                              // QM: small portions several times a day
  activityZone: ['middle', 'upper', 'decor'],   // FishBase: 1–2 m above the bottom; bolts into rock
  temperament: 'semi_aggressive',               // LA
  territoriality: 0.5,
  aggression: 0.25,                             // LA spotlight: one of the least aggressive tangs
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.05,
    note: 'One per tank. A group can work only in a very large tank with all of them added at once (QM, LA).' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'fight', mixed: 'harassment', juvenile: 'tension',
    note: 'Aggressive toward its own species (LA); males circle and slash with the caudal spine (ADW). Groups of small fish do best.' },
  predatorTags: ['copepod'],                    // zooplankton; nothing the player keeps
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 0,
  shrimpSafe: 'safe', snailSafe: 'safe', frySafe: 'safe',      // QM, Top Shelf: no harm to inverts
  plantSafe: 'caution',                         // eats macroalgae
  reefSafe: 'safe',                             // LA yes; QM low coral risk
  coralRisk: 0.03,
  anemoneRelationship: 'neutral',
  hidesNeeded: 2,                               // Top Shelf: secure retreats; LA: hides among live rock
  coverPreference: 0.4,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [],
    note: 'Open swim-throughs plus caves to dart into and wedge in; bare bottom is fine (QM).' },
  breeding: {
    system: 'not_in_game', difficulty: 1,
    maturityDays: 16,                           // 9–12 months (Sang 2018 via Wikipedia); 11–13 cm (ADW): early for a tang
    clutchSize: { min: 10000, max: 40000 },     // ADW up to 40,000 per session
    incubationHours: 9,                         // ADW 25–28 h ≈ 1.1 d × 8
    fryRearingHours: 300,                       // ADW larvae mature after ~37 d × 8
    cooldownDays: 30,
    conditions: { needsPartner: true, minTankGallons: 500 },
    predationWithoutNursery: 1, nurseryRequired: true, maxRaisedPerClutch: 1,
    notes: 'Group or pair spawner at dusk with floating eggs and no care. First bred by the University of Florida Tropical Aquaculture Lab with Rising Tide Conservation (2016); Biota has bred it at commercial scale since 2025. A hatchery job (copepod-fed larvae), not a home-aquarium one, so the game does not breed it.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  lifecycle: { juvenileDays: 16, adultDays: 22, lifespanDays: 480, sexVisibleAtDays: 480, hatchSizeCm: 0.15 },
    // ADW captive 8–20 yr (avg 12–14) → 12 × 40 = 480. Sexes look alike.
  hardiness: 0.6,                               // ich / HLLE / fin erosion prone (ADW, LA)
  difficulty: 'intermediate',                   // LA: moderate, experienced keepers
  baseValue: 110,                               // LA $109.99; Top Shelf $54–60 wild; Biota CB $75–120
  rarity: 'common',
  visitorAppeal: 0.98,                          // "Dory"
  unlock: { requires: ['marine_large'], hint: 'Research Big-water Marine: it needs a six-foot tank of 180 gallons or more.' },
  captiveBredAvailable: true,                   // Biota commercial since Jan 2025
  wildCaughtNote: 'Most are still wild-collected (heavily, and at times with cyanide, after Finding Dory); Biota captive-bred fish have been sold since 2025.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2010)', note: 'Not threatened, but heavily collected for the trade; captive-bred fish are the better buy.' },
  special: { outgrowsSmallTanks: true },
  behaviorSet: 'tang',
  behaviorTraits: { cruiseSpeed: 1.1, burstSpeed: 6, turnRate: 2.6, hoverTendency: 0.35, schoolingTightness: 0.2,
    restOnBottom: 0.05, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.5, nocturnal: 0 },
  specialBehaviors: ['zooplankton_pick', 'patrol_lap', 'dart_and_wedge', 'play_dead', 'scalpel_flare', 'night_colour', 'cleaner_visit'],
  visualLane: 'fish',
}
```

**Genetics.** One real locality form, plus the generic intensity locus.
- Locus `belly` (locality form), 2 alleles: `pacific` (blue belly; trade frequency about 0.7) and `indian_ocean`
  (yellow belly; about 0.3, so about one fish in ten shows it as `hom`). **Inheritance is not documented.** It is a
  geographic population difference (Wikipedia citing Debelius and Goda; QM; Reef Builders). The species doesn't
  breed in the game, so the mode only sets shop frequency; encode it as mendelian with yellow belly needing `hom`.
  The trade frequency is my estimate, not sourced: QM says Indian Ocean fish are hard to source.
  - Phenotype **"Yellow Belly"** (overlay; `rarity` about 0.3; price about 1.75×, from Top Shelf $94.49 vs $53.99):
    `bellyColor '#f4d235'`, `bodyColor2 '#f0c92a'` on the lower flank; on adults the blue lightens and the palette may
    break into fine blue spots (Reef Builders 2011). The yellow shows only at maturity; young look like faded Pacific
    fish (QM, Reef Builders), so the art should fade it in with growth.
- `intensityLocus` + `intensityOverlay({ bodyColor: '#1a5ae0', patternContrast: 1 })` → "Richly coloured".
- Left out: nothing else is real. No hybrids or dyed fish are known in this genus.

baseVisual (wild Pacific): `bodyColor '#1f5fd6'` (royal blue) · `bodyColor2 '#1848b0'` · `bellyColor '#3a7ae2'` ·
`finColor '#1b2a66'` (dorsal and anal blue with black margins) · `finColor2 '#f7d417'` (yellow tail triangle and
pectorals) · `accentColor '#0b0f1a'` (black palette) · `eyeColor '#14161c'` · `pattern 'solid'` + **`bodyMark:
'palette'`** (new: black band from the eye along the upper body, looping back to the tail's upper and lower edges,
leaving a blue "palette" blotch behind the pectoral) · `patternScale 1` · `patternContrast 0.95` · `iridescence 0.25`
(blue from iridophores, ADW) · `metallic 0` · `translucency 0.05` · `finType 'tang'` · `finLength 1` ·
`bodyDepth 1.05` · `gillFullness 0` · `variation 0.1`.

### Young and sexes
- **Young:** coloured like adults: blue, black palette, yellow tail. The body is deeper (1.7× SL vs 2.3× in adults) and
  the tail rounder (FAO). The palette is not fully joined until maturity (Sang via Wikipedia). Indian Ocean young show
  no yellow belly yet.
- **Sexes:** no colour difference. Males are larger (ADW). Colour deepens when stressed and during spawning (ADW).
  Slightly paler at night (Goda via Wikipedia).

### Behaviour
- Swims all day in the middle and upper water, in laps along the length of the tank, picking at the water column
  (zooplankton) and grazing a little. Wild fish hover in loose groups 1–2 m above the reef (FishBase).
- **Startle:** bolts into the rock and wedges in a crevice, caudal spine out (FishBase, FAO, ADW, Top Shelf). **Plays
  dead:** after a scare or when new, it may lie on its side on the bottom or in rock for a while and then recover (ADW).
  The AI should show it as a recoverable state with a "this is normal" note. It must never read as dying.
- Night: shelters in rock, colour a little paler (Goda via Wikipedia).
- No digging and no jumping recorded. It visits cleaner shrimp.
- Closest set: `tang` (no new set). New special behaviours: `zooplankton_pick`, `dart_and_wedge`, `play_dead`.

### Compatibility

| Other | Verdict | Reason | Sources |
|---|---|---|---|
| Naso tang (new) | conditional | tang vs tang; different genus and shape helps; add together in 240+ gal with sight breaks | LA (both pages), QM |
| Queen angelfish (new) | usually_compatible | different family; QM says blue tangs may be territorial to some angels; a UFSC queen kept with four blue tangs got an eye injury, cause unknown | QM; [WAS 2025 abstract](https://was.org/Meeting/Program/PaperDetail/167558) |
| Clown triggerfish (new) | conditional | an adult trigger is very aggressive; a shy tang that "plays dead" is easy to bully; add the trigger last and small | LA trigger, TFH trigger |
| Panther grouper (new) | usually_compatible (adults) / high_risk while the tang is under ~14 cm | a 30 cm deep-bodied tang is too big; juveniles sold at 1–3 in are eaten | LA grouper, SWA blog |
| Coral catshark / epaulette / bamboo shark (new) | usually_compatible | a fast midwater tang is not shark prey; small juveniles resting at night are at risk | Aquarium Domain (T3) |
| Silver mono / spotted scat (new, brackish) | incompatible in the game (water class) | marine vs brackish class; if the brackish researcher finds adults kept in full seawater, then usually_compatible | — |
| Freshwater new species | incompatible | salinity | — |
| Yellow tang, sailfin tang (*Zebrasoma*) | conditional | tangs fight; different genus and shape; 180+ gal, added together | LA, QM; existing sailfin rule `tag:tang` |
| Kole tang (*Ctenochaetus*), chocolate tang (*Acanthurus*) | conditional | as above | LA, QM |
| Emperor angelfish | usually_compatible | QM: may squabble with some angels | QM |
| Flame angel, coral beauty | usually_compatible | | QM |
| Foxface rabbitfish | usually_compatible | different shape; both reef-tank staples | LA |
| Miniatus grouper | usually_compatible (adult tang) | adult too big; small juveniles at risk | miniatus file |
| Dwarf lionfish | excellent | lionfish can't swallow a 30 cm tang | — |
| Clownfish, chromis, anthias, gramma, firefish, gobies, blennies, cardinals, wrasses, hawkfish, damsels | excellent | peaceful toward unrelated fish | LA, QM |
| Mandarin, lined seahorse | conditional | a fast eater takes their food (engine slow-feeder check) | yellow tang precedent |
| Cleaner / peppermint shrimp, crabs, hermits, snails, stars, urchin | excellent | reef safe; it gets cleaned | Top Shelf, QM |
| Corals, bubble-tip anemone | excellent | reef safe | LA, QM |

`exceptionRules`: `{ other: 'tag:tang', verdictFloor: 'conditional', reason: 'Tangs fight other tangs; the blue tang is mild, but add tangs together in a big tank with rock breaking sight lines.', incidentRisk: 0.06, mitigatedBy: ['tank_size', 'sight_breaks'] }`.

### Smallest tank tier for an adult
**180 gal (72×24 in)** by both gallons and footprint. A group needs 240 gal or more (my judgement).

---

## Naso tang (orangespine unicornfish)

*Naso lituratus* (Forster, 1801) · Acanthuridae, Nasinae · `tang`. Valid (Catalog of Fishes; FishBase). Trade names:
naso tang, lipstick tang, orangespine unicornfish.

**The "blonde naso" is *Naso elegans* (Rüppell, 1829), a separate valid species.** Catalog of Fishes lists it as valid
and once synonymised (Dor 1984); it has been valid since at least Randall 2001. FishBase calls it "the Indian Ocean
population, now a separate species". Randall 2022 (cited in Wikipedia) says consistent meristic differences were
shown. Range: Red Sea and Indian Ocean to Bali; *N. lituratus* lives from Cocos-Keeling and Christmas Island east to
Hawaii (CoF). Field mark: *N. elegans* has a largely yellow dorsal fin; *N. lituratus* has a black one with a white
edge (FAO, which in 2001 still called the Indian Ocean fish a colour variant; TFH).
**Game treatment:** don't make "Blonde" a colour form of the naso tang. If wanted, add *N. elegans* later as its own
species with the same care (same genus, so the engine already treats them as rivals). Price: Top Shelf blonde $134.99
(male $237.59) vs naso $67.49 (male $143.09).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase: N. lituratus](https://www.fishbase.se/summary/Naso-lituratus.html) | 1 | **46 cm SL, 2.3 kg**; 0–90 m (usually 5–30); lagoons and seaward reefs; small groups, sometimes large aggregations; juveniles on shallow rocky reef, mixed with other surgeonfish; **leafy brown algae (*Sargassum*, *Dictyota*)**; probably pair spawning; male courtship nape flashes bluish-white; IUCN LC (2010); Indian Ocean population = *N. elegans* |
| [FishBase: N. elegans](https://www.fishbase.se/summary/Naso-elegans.html) | 1 | 45 cm SL; Indian Ocean only, to Bali; yellow dorsal fin; males have caudal filaments; LC (2010) |
| [Catalog of Fishes: Naso](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?tbl=species&genus=Naso) | 1 | both valid; ranges; elegans once a synonym (Dor 1984), valid from Randall 2001 |
| [FAO WCP guide vol. 6 (Randall 2001)](https://www.fao.org/4/y0870e/y0870e30.pdf) | 1 | colour: grey-brown, **black band from upper lip to between the eyes, curved yellow band from mouth corner to eye, yellow area above and behind the eyes, orange lips, bright orange peduncle spines**; dorsal black with a white margin widening to the rear; anal yellowish-brown; tail grey with black edges and a yellow rear margin; **adult males grow a long filament from each tail lobe**; 2 fixed peduncle plates with forward knife keels; max 45 cm TL, commonly 35; usually solitary; leafy algae |
| [Taylor et al. 2014, J Fish Biol 85: 901–916](https://researchonline.jcu.edu.au/35460/) | 1 | **max age 14 yr** (Micronesia); females mature ~15 cm FL, males ~18 cm; rapid early growth; slight sex difference in length at age |
| [Wikipedia: Naso elegans](https://en.wikipedia.org/wiki/Naso_elegans) | 3 | meristic split (citing Randall 2022); males longer filaments and larger keels (citing Fishes of Australia) |
| [LiveAquaria: Naso Tang](https://www.liveaquaria.com/products/naso-tang) | 2 | **180 gal**; 72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12; 18"; reef compatible; semi-aggressive, **aggressive to other tangs**, peaceful with other fish; **tight lid (jumps)**; seaweed ≥3×/week; juveniles (Hawaii) dark grey with a blue dorsal stripe and orange anal stripe, darkening to reddish-brown; **$123.99** |
| [Reef Builders 2015](https://reefbuilders.com/2015/03/15/naso-lituratus-a-sleek-striking-outstanding-fish-for-spacious-marine-aquariums) | 2 | **~200 gal "a bare minimum"**; 125 too small; "lots of running room"; no conspecifics, avoid other tangs especially related ones; can be slow to accept food |
| [TFH: The Naso Tang](https://tfhmagazine.com/articles/saltwater/the-naso-tang-full-article) | 2 | 200+ gal ideal; juveniles grey; adults chestnut-brown, older ones yellow chest; **white spots at night**; carotene-rich foods keep the orange; extremely hardy; scrapes against tank walls |
| [Top Shelf: Naso Tang](https://topshelfaquatics.com/pages/saltwater-fish/naso-tang) | 2 | 180 gal working minimum, length matters most; reef safe; **startled fish jump, lid needed**; prices above |
| [Gensou (aquascaping firm)](https://gensou.sg/?p=32419) | 3 | **900 L / 240 gal, 8 ft strongly preferred**; 35–40 cm in captivity; young of 10–12 cm double in ~18 months |

**Modelled as:**
- 45 cm adult (TL without filaments), **240 gal, 96×24 in** → smallest tier the **240-gal**; `activeSwimmer`,
  `outgrowsSmallTanks`, `escapeArtist` (jumps when startled)
- herbivore grazer on leafy brown macroalgae; seaweed sheets by hand
- reef-safe; one per tank; conditional with other tangs
- no colour forms: generic intensity locus. Males grow tail streamers; juveniles greyer
- breeding `not_in_game` (pelagic, not bred in captivity)

**Conflicts:**
- Tank: 180 (LA, Top Shelf, QM), 200 (Reef Builders "bare minimum", TFH, Aquatics Unlimited 200 at 72 in per search summary), 240 / 8 ft
  (Gensou, Tier 3). Being conservative with a 45 cm, fast, open-water fish, the game uses **240 and 96 in**. 180 is
  the alternative if the owner wants it on the 180-gal tier.
- Size: FishBase 46 cm SL vs FAO 45 cm TL. SL can't be bigger than TL, so one figure is off; captive fish reach
  35–40 cm (Gensou). The game uses 45.
- Lifespan: 14 yr (Taylor 2014, Micronesia), others report 25 yr and more elsewhere; Gensou says 20–30 in aquaria
  (unsourced). The game caps it at 480.
- Gensou says males grow dorsal and anal filaments. That is wrong: FAO and FishBase say caudal.

### Proposed game data

```ts
{
  id: 'naso_tang',
  commonName: 'Naso Tang',                      // aka orangespine unicornfish, lipstick tang
  scientificName: 'Naso lituratus',
  category: 'fish', group: 'tang', genus: 'Naso', environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock', 'reef'],
  nativeRegion: 'Eastern Indian Ocean and Pacific: Cocos-Keeling and Christmas Islands and Indonesia east to Hawaii, Pitcairn and Clipperton, north to southern Japan, south to Western Australia, Queensland and New Caledonia', // CoF
  isStarter: false,
  adultSizeCm: 45,                              // FAO 45 TL (commonly 35); FishBase 46 SL; LA 18 in
  recommendedMinTankGallons: 240,               // Reef Builders 200 "bare minimum"; Gensou 240 / 8 ft; LA 180
  recommendedFootprint: { minLengthIn: 96, minWidthIn: 24 },
  activeSwimmer: true,                          // TFH: almost always on the move
  bioload: 5,
  tempC: { min: 22, max: 28, idealMin: 23.5, idealMax: 26.5 },  // LA 72–78 °F
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null, kh: { min: 7, max: 12 },
  flowPreference: 'high', lightPreference: 'bright',
  diet: 'herbivore',                            // FishBase/FAO leafy brown algae
  foods: ['nori', 'vegetable', 'algae_wafer', 'pellet_small', 'flake', 'mysis', 'brine_shrimp'],
  feedingStyle: 'grazer', feedingSpeed: 0.7, feedingAggression: 0.5, hungerHours: 12,
  activityZone: ['upper', 'middle'],            // TFH: occupies the upper water column
  temperament: 'semi_aggressive', territoriality: 0.45, aggression: 0.25, finNipper: 0, hasLongFins: false,
    // LA: aggressive to tangs, peaceful otherwise. Male streamers are long but not "long fins" for nippers.
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.04,
    note: 'One per tank; wild adults form small groups, but two in a home tank fight (Reef Builders, Top Shelf).' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'fight', mixed: 'harassment', juvenile: 'tension',
    note: 'Bickers with its own kind and related tangs; the fixed peduncle blades cut.' },
  predatorTags: [], preyTags: ['fish_large'], maxLikelyPreySizeCm: 0,
  shrimpSafe: 'safe', snailSafe: 'safe', frySafe: 'safe',
  plantSafe: 'unsafe',                          // eats leafy macroalgae (refugium Sargassum/Caulerpa)
  reefSafe: 'safe', coralRisk: 0.03,            // LA yes; Top Shelf: may dislodge loose frags
  anemoneRelationship: 'neutral',
  hidesNeeded: 1, coverPreference: 0.2,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [],
    note: 'Long open lanes; rock arranged for loops or figure-eights (Reef Builders); a cave to sleep in.' },
  breeding: {
    system: 'not_in_game', difficulty: 1, maturityDays: 18,   // Taylor 2014: 15–18 cm FL, rapid growth
    clutchSize: { min: 10000, max: 40000 },     // not documented; acanthurid order of magnitude (ADW blue/yellow tang)
    incubationHours: 8, fryRearingHours: 560,   // not documented; yellow-tang placeholder (long pelagic phase)
    cooldownDays: 30, conditions: { needsPartner: true, minTankGallons: 1000 },
    predationWithoutNursery: 1, nurseryRequired: true, maxRaisedPerClutch: 1,
    notes: 'Probably spawns in pairs in open water (FishBase); floating eggs; no captive breeding found.',
  },
  sexSystem: 'gonochoristic', parentalCare: 'none',
  lifecycle: { juvenileDays: 18, adultDays: 22, lifespanDays: 480, sexVisibleAtDays: 26, hatchSizeCm: 0.15 },
    // 14 yr+ (Taylor 2014) → cap. Sex visible once adult males grow tail streamers (FAO).
  hardiness: 0.75,                              // TFH "extremely hardy"; some slow to feed
  difficulty: 'intermediate',
  baseValue: 120,                               // LA $123.99; Top Shelf $67 (male $143)
  rarity: 'common', visitorAppeal: 0.85,
  unlock: { requires: ['marine_large'], hint: 'Research Big-water Marine: an adult needs an eight-foot tank of 240 gallons or more.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'All wild-caught; Hawaiian fish are often brighter (LA), but West Hawaiʻi collection has been mostly stopped since 2017.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2010)', note: 'Widespread; also a minor food fish.' },
  special: { outgrowsSmallTanks: true, escapeArtist: true },
  behaviorSet: 'tang',
  behaviorTraits: { cruiseSpeed: 1.4, burstSpeed: 6, turnRate: 2, hoverTendency: 0.2, schoolingTightness: 0.1,
    restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.55, nocturnal: 0, pickRadiusMul: 1.2 },
  specialBehaviors: ['open_water_cruise', 'graze_macroalgae', 'scalpel_flare', 'night_spots', 'startle_jump', 'cleaner_visit'],
  visualLane: 'fish',
}
```

**Genetics.** No named forms → `intensityLocus` + `intensityOverlay({ accentColor: '#ffd23a', finColor2: '#ff7a1a' })`
("Richly coloured"; TFH: carotene-rich foods keep the orange). Locality only: "Hawaii". Left out: the blonde naso
(a separate species), and *N. lituratus* × *N. elegans* hybrids at Christmas and Cocos Islands (hybrids, not in trade).

baseVisual: `bodyColor '#5a4a3e'` (grey-brown) · `bodyColor2 '#3e342e'` · `bellyColor '#7a6a52'` · `finColor
'#1c1a1a'` (black dorsal) · `finColor2 '#ece8dc'` (white dorsal margin, widening to the rear) · `accentColor '#f2c230'`
(yellow mask edge and patch above the eyes) · `eyeColor '#1a1612'` · `pattern 'solid'` + **`bodyMark: 'naso_mask'`**
(new: black band from upper lip to between the eyes, edged yellow, orange lips) · `tailSpot: 'naso_spines'` (or put
it in the mask; two **bright orange** peduncle plates `#ff7a1a`) · `patternContrast 0.9` · `iridescence 0.05` ·
`metallic 0` · `translucency 0.05` · `finType 'naso'` (lyre tail; males add long filaments from both lobe tips) ·
`finLength 1` · `bodyDepth 0.9` (depth 1.9–2.5 in SL, FAO: more elongate than *Zebrasoma*) · `variation 0.12`.

### Young and sexes
- **Young:** dark grey to grey-brown, with a blue line along the dorsal fin and an orange stripe in the anal fin; the
  mask and yellow are faint; the tail is emarginate with no filaments (LA, TFH, FAO). The body darkens to chestnut or
  reddish-brown with age; old fish get a yellow chest (TFH).
- **Sexes:** adult **males grow a long filament from each tail-lobe tip** (FAO) and larger peduncle keels (FoA, for
  *N. elegans*); a courting male flashes a bluish-white nape (FishBase). Males mature larger (Taylor 2014).
- **Night:** pale spots and blotches (TFH).

### Behaviour
- A fast open-water cruiser in the upper and middle water, on long laps and loops; it needs length more than any
  other tang here (Reef Builders, TFH). It grazes clipped seaweed and macroalgae.
- Shy at first: may refuse food for days; startles and **can jump** (LA, Top Shelf). Rubs against walls (TFH).
- Sleeps in a cave or against rock with night spots.
- Closest set: `tang` (a faster, longer-bodied variant; no new set needed).

### Compatibility

| Other | Verdict | Reason | Sources |
|---|---|---|---|
| Blue tang (new) | conditional | tang vs tang; different genus and shape | LA, Reef Builders |
| Queen angelfish (new) | usually_compatible | unrelated; both big | — |
| Clown triggerfish (new) | conditional | trigger aggression; a naso is big and fast enough to cope in 300+ gal | LA trigger |
| Panther grouper (new) | usually_compatible (adults) / high_risk while the naso is small | | LA grouper |
| Sharks (new) | usually_compatible | | Aquarium Domain (T3) |
| Mono / scat (new) | incompatible in the game (water class) | see blue tang | — |
| Freshwater new species | incompatible | salinity | — |
| Yellow, sailfin, kole, chocolate tang | conditional | "aggressive to other tangs" (LA); worse with related or same-shaped fish (Reef Builders) | LA, Reef Builders |
| Emperor angel, dwarf angels, foxface, wrasses, anthias, clownfish, small reef fish | excellent / usually_compatible | peaceful toward unrelated fish | LA, TFH |
| Miniatus grouper, dwarf lionfish | usually_compatible | too big to eat when adult | — |
| Seahorse, mandarin | conditional | a fast feeder; engine slow-feeder check | — |
| All inverts, corals, bubble-tip | excellent | reef safe | LA, Top Shelf |
| Macroalgae / plants | incompatible | eats them | FishBase |

`exceptionRules`: `{ other: 'tag:tang', verdictFloor: 'conditional', reason: 'Aggressive toward other tangs, worst with related or same-shaped ones. Add tangs together in a big, long tank with sight breaks.', incidentRisk: 0.07, mitigatedBy: ['tank_size', 'sight_breaks'] }`.

### Smallest tank tier for an adult
**240 gal (96×24 in).** The 180-gal tier fails on both gallons (240) and length (96 in).

---

## Queen angelfish

*Holacanthus ciliaris* (Linnaeus, 1758) · Pomacanthidae · `angelfish`. Name current (FishBase). Common names:
queen angelfish (also golden or yellow angelfish).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Holacanthus-ciliaris.html) | 1 | **45 cm TL** (common 30), **1.6 kg**; 1–70 m; W Atlantic, Florida and Gulf of Mexico to Brazil, St Paul's Rocks; alone or in pairs; **mostly sponges**, some algae, tunicates, hydroids, bryozoans; **juveniles clean other fish**; Lm 22 cm; ciguatera reports; IUCN LC (2009) |
| [Florida Museum: Queen angelfish](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/holacanthus-ciliaris) | 1 | 45 cm, 1.6 kg; adult blue-green with blue and yellow, **all-yellow tail**, **"crown": dark spot ringed and dotted with bright blue on the forehead**; **juvenile dark blue, yellow tail, yellow around the pectorals, brilliant blue vertical bars, curved** (straight in the blue angel); pairs year-round; spawns rising in the water at dusk; **25,000–75,000 eggs per evening**; **hatch 15–20 h**; settle at 15–20 mm after **3–4 weeks**; juveniles territorial and run cleaning stations; rare queen × blue hybrid exists |
| [Animal Diversity Web](https://animaldiversity.org/accounts/Holacanthus_ciliaris/) | 1 | **males larger**; harems of 1 male + up to 4–5 females; male courtship display; spawns within minutes of sunset; eats sponges and corals; **"very aggressive when kept in aquariums"**; lifespan poorly documented; IUCN LC, no CITES |
| [WAS 2025: first captive spawning (Skorupa et al., UFSC)](https://www.was.org/Meeting/Program/PaperDetail/167384) | 1 (conference abstract) | pairs in 1,000–2,000 L tanks; one pair spawned twice in Dec 2024 at 7 pm; hatch at 18 h; larvae 2.24 mm at 24 h; **no larval survival reported**; female 17 cm, male 22 cm |
| [WAS 2025: growth in aquaculture (Skorupa et al.)](https://was.org/Meeting/Program/PaperDetail/167558) | 1 (abstract) | two-year culture; **juvenile colours lost at ~15.9 cm TL**; females 6 → 20 cm; hierarchy with occasional fights; **a queen kept with blue tangs suffered an eye injury (cause unconfirmed)** |
| [LiveAquaria: Queen Angelfish](https://www.liveaquaria.com/products/queen-angelfish) | 2 | **250 gal**; 72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12; 18"; semi-aggressive; "reef compatible with caution" but **"a poor reef fish": nips stony and soft corals and clam mantles**; **add last**; difficult (water and diet); feed ≥3×/day (spirulina, algae, angel formula, mysis, shrimp); **$218.99**; sold from 1 in |
| [Quality Marine: Queen (juvenile)](https://www.qualitymarine.com/quality-marine/fish/angels/holacanthus/queen-juvenile-10061/) | 2 | **250 gal**; 18"; territorial toward angelfish of the same body shape; may pick at sponges, tunicates and sessile inverts; cheek spines snag nets; "hermaphroditic" |
| [TFH: Holacanthus ciliaris](https://www.tfhmagazine.com/articles/saltwater/holacanthus-ciliaris) | 2 | "immense aquarium", usually 200+ gal; juveniles blue with a golden head and throat and vertical bars; adults yellow with blue overwash; **not reef safe**; **Townsend angel = queen × blue hybrid (*H. townsendi*), not a species**; **St Paul's Rocks morphs** (TFH Jan 2003); no captive-bred *Holacanthus* |
| [Reef Builders 2017: blue queens of St Paul's Rocks](https://reefbuilders.com/2017/07/03/great-new-pictures-of-blue-queen-angelfish-from-st-pauls-rock) | 2 | aberrant colours (koi-like patches, all white, "Blue Queen") in **~1% of that population**, blamed on isolation and inbreeding |
| [Reef Builders 2018: Holacanthus townsendi](https://reefbuilders.com/2018/03/07/the-first-hybrid-angelfish-holacanthus-townsendi) | 2 | the Townsend is the first documented hybrid angelfish (via search summary; abundance up to 5–6% in some surveys) |
| [National Geographic: Queen angelfish](https://www.nationalgeographic.com/animals/fish/facts/queen-angelfish) (search snippet only, not loaded) | 2 | up to 15 yr |

**Modelled as:**
- 40 cm aquarium adult, **250 gal with a 96×24 in footprint** → smallest tier the **300-gal**;
  `activeSwimmer` (moderate), `outgrowsSmallTanks`
- omnivore picker on sponges (angel formula with sponge), algae and meaty foods; feed often
- **reef `unsafe`, `coralRisk 0.65`, `harms_anemone`**: nips stony and soft corals, zoanthids and clam mantles
- one large angel per tank; high risk with the emperor; conditional with dwarf angels (add them first)
- the juvenile is drawn completely differently (navy with curved blue bars); the colour change runs to ~16 cm
- no hobby colour forms: generic intensity locus. Townsend hybrid and St Paul's Rocks morphs left out
- breeding `not_in_game` (one research spawning in 2024, no larvae raised)

**Conflicts:**
- Reef safety: LiveAquaria's quick stat says "with caution" but its text says "a poor reef fish"; TFH says not reef
  safe. The game uses `unsafe` with coral risk 0.65, above the emperor (0.55). Its wild diet is sponge-heavy and it
  hits stony and soft corals alike (LA).
- Social system: ADW says harems; Florida Museum and FishBase say pairs. Sex system: QM says "hermaphroditic". The
  related *Holacanthus tricolor* is a protogynous harem fish (Hourigan & Kelley 1985, not loaded). The game uses
  protogynous with a flag that this is low confidence.
- Tank: TFH 200+, LA 250, QM 250 (Top Shelf 180–250 by search summary). The game uses 250, i.e. the 300 tier.
- The UFSC first-spawning abstract gives egg diameter as "0.65 cm". That must be mm.
- Lifespan: about 15 yr (NatGeo, hobby sites 10–20); not documented by a Tier 1 source. The game uses 480.

### Proposed game data

```ts
{
  id: 'queen_angelfish',
  commonName: 'Queen Angelfish',
  scientificName: 'Holacanthus ciliaris',
  category: 'fish', group: 'angelfish', genus: 'Holacanthus', environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock'],   // not 'reef': nips corals and clams (LA text, TFH)
  nativeRegion: 'Western Atlantic: Bermuda, Florida and the Gulf of Mexico through the Caribbean to Brazil, and St Paul\'s Rocks', // FishBase, Florida Museum
  isStarter: false,
  adultSizeCm: 40,                              // 45 cm TL max (FishBase, Florida Museum); LA 18 in; aquarium adults smaller
  recommendedMinTankGallons: 250,               // LiveAquaria, Quality Marine
  recommendedFootprint: { minLengthIn: 96, minWidthIn: 24 },
  activeSwimmer: true,
  bioload: 6,                                   // 1.6 kg adult, heavy feeder
  tempC: { min: 22, max: 28, idealMin: 23.5, idealMax: 26.5 },   // LA 72–78 °F; UFSC cultured at 26.7–27 °C
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.023, idealMax: 1.026 },
  gh: null, kh: { min: 7, max: 12 },
  flowPreference: 'moderate', lightPreference: 'moderate',
  diet: 'omnivore',                             // sponges + algae + inverts (FishBase)
  foods: ['pellet_small', 'flake', 'mysis', 'brine_shrimp', 'pellet_large', 'nori', 'vegetable', 'algae_wafer'],
  feedingStyle: 'picker', feedingSpeed: 0.7, feedingAggression: 0.65,
  hungerHours: 10,                              // LA: at least three feedings a day
  activityZone: ['lower', 'middle', 'decor'],   // Florida Museum: stays near the bottom, among gorgonians and coral
  temperament: 'semi_aggressive', territoriality: 0.8, aggression: 0.55, finNipper: 0.1, hasLongFins: false,
    // ADW "very aggressive in aquariums"; LA add last; trailing dorsal/anal tips are not nipper bait
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.04,
    note: 'One per tank, and no other large angel. Wild adults pair; research tanks of 1,000–2,000 L held pairs with some fighting.' },
  sameSpeciesRule: { maleMale: 'lethal', femaleFemale: 'fight', mixed: 'courtship_ok', juvenile: 'fight',
    note: 'Juveniles are strongly territorial (Florida Museum); a true pair can live together in a very large tank (UFSC).' },
  predatorTags: ['sessile_invert', 'coral_polyp', 'clam', 'worm', 'copepod'],   // sponges, tunicates, hydroids, bryozoans
  preyTags: ['fish_large'], maxLikelyPreySizeCm: 1,
  shrimpSafe: 'mostly_safe', snailSafe: 'mostly_safe', frySafe: 'caution', plantSafe: 'caution',
  reefSafe: 'unsafe', coralRisk: 0.65, anemoneRelationship: 'harms_anemone',
  hidesNeeded: 2, coverPreference: 0.45,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [],
    note: 'Plenty of live rock to pick at and caves big enough to turn in (LA).' },
  breeding: {
    system: 'not_in_game', difficulty: 1, maturityDays: 22,   // Lm 22 cm (FishBase); colour change ~16 cm
    clutchSize: { min: 25000, max: 75000 },     // Florida Museum, ADW: per evening
    incubationHours: 6,                         // hatch 15–20 h (Florida Museum, ADW), 18 h (UFSC) ≈ 0.75 d × 8
    fryRearingHours: 220,                       // settles after 3–4 weeks (Florida Museum) ≈ 28 d × 8
    cooldownDays: 3, conditions: { needsPartner: true, minTankGallons: 500 },
    predationWithoutNursery: 1, nurseryRequired: true, maxRaisedPerClutch: 1,
    notes: 'Pairs rise and release floating eggs at sunset. The first captive spawning was in a Brazilian research lab in December 2024 and no larvae were raised, so the game does not breed it.',
  },
  sexSystem: 'protogynous',                     // low confidence; see Conflicts
  parentalCare: 'none',
  lifecycle: { juvenileDays: 22, adultDays: 24, lifespanDays: 480, sexVisibleAtDays: 480, hatchSizeCm: 0.2 },
    // ~15 yr (NatGeo, hobby) → 480; larvae 2.24 mm at 24 h (UFSC). Sexes look alike.
  hardiness: 0.65, difficulty: 'advanced',      // LA "difficult": water and diet
  baseValue: 220,                               // LA $218.99
  rarity: 'uncommon', visitorAppeal: 0.95,
  unlock: { requires: ['marine_large'], hint: 'Research Big-water Marine: an adult needs an eight-foot tank of 250 gallons or more.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'All wild-caught in the Caribbean, Florida and Brazil (heavily harvested off Brazil, ADW).',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2009)', note: 'Stable, but heavily harvested near Brazil. Reported in ciguatera cases if eaten.' },
  special: { outgrowsSmallTanks: true },
  behaviorSet: 'angelfish_dwarf',
  behaviorTraits: { cruiseSpeed: 0.7, burstSpeed: 4.5, turnRate: 2, hoverTendency: 0.45, schoolingTightness: 0,
    restOnBottom: 0.05, hitching: 0, burrowing: 0, glassSurfing: 0.02, curiosity: 0.65, nocturnal: 0, pickRadiusMul: 1.2 },
  specialBehaviors: ['rock_pick', 'sponge_graze', 'cave_patrol', 'new_fish_chase', 'juvenile_cleaning'],
  visualLane: 'fish',
}
```

**Genetics.** No hobby colour forms → `intensityLocus` + `intensityOverlay({ bodyColor2: '#ffd21a', accentColor:
'#5fd0ff' })` ("Richly coloured").
- **Left out, on purpose:** (1) **Townsend angelfish** = queen × blue angel (*H. bermudensis*) hybrid (TFH, Florida
  Museum, Reef Builders 2018), a hybrid by ADR-0052 rules. (2) **St Paul's Rocks morphs** (gold, "Blue Queen", white,
  koi-patched): wild aberrants in ~1% of one isolated population off Brazil (Luiz-Júnior 2003, TFH; Reef Builders
  2017). Inheritance is unknown; the cause is assumed to be inbreeding, not shown. Not a trade form, and there's no
  sign they are sold. (3) Locality labels (Caribbean, Brazil) only.

baseVisual (adult): `bodyColor '#2f8fb0'` (blue-green; yellow scale centres with blue edges) · `bodyColor2 '#e6c22a'`
(scale centres) · `bellyColor '#f0c838'` · `finColor '#2a6fd8'` (dorsal and anal blue, long trailing tips with orange
edges) · `finColor2 '#ffd21a'` (**all-yellow tail**, yellow pectorals) · `accentColor '#1b2f8f'` (crown spot; ring
and dots `#5fd0ff`) · `eyeColor '#1c1a24'` · `pattern 'reticulated'` + **`bodyMark: 'crown'`** (new: forehead spot)
· `patternScale 0.7` · `patternContrast 0.7` · `iridescence 0.35` ("iridescent", Florida Museum) · `metallic 0` ·
`translucency 0.04` · `finType 'angelfish_large'` · `finLength 1.15` · `bodyDepth 1` · `variation 0.12`.

### Young and sexes
- **Juvenile (to ~16 cm, UFSC):** dark navy-blue to black body with **bright blue vertical bars, the middle ones
  curved** (straight in the blue angel), a yellow tail, a yellow area around the pectorals, and a golden face and
  throat (Florida Museum, TFH). Sub-adults are blotchy in-betweens (LA sells "transition" sizes). The crown develops
  in the adult.
- **Sexes:** males are larger (ADW; UFSC sexed its pairs by size). No colour difference; colour flashes briefly
  during courtship (ADW).

### Behaviour
- Cruises slowly near the bottom between rock, caves and gorgonians, picking at rock and sponge (Florida Museum).
  Bold, curious, comes to the front.
- Chases newcomers: add it last (LA). Juveniles hold a small territory and **clean other fish** at a "station"
  (FishBase, Florida Museum). A juvenile special behaviour: larger fish pause beside it.
- Sleeps in a cave. No digging; not a jumper.
- Closest set: `angelfish_dwarf` (as the emperor uses). No new set.

### Compatibility

| Other | Verdict | Reason | Sources |
|---|---|---|---|
| Blue tang (new) | usually_compatible | QM: blue tangs can squabble with some angels; UFSC eye injury (cause unconfirmed) | QM; WAS 2025 |
| Naso tang (new) | usually_compatible | unrelated | — |
| Clown triggerfish (new) | conditional | two of the most aggressive large fish; the trigger may bite the angel's fins; 300+ gal, trigger last | LA trigger, ADW |
| Panther grouper (new) | usually_compatible (adult angel) / high_risk for a small juvenile angel | | LA grouper |
| Sharks (new) | conditional | large angels named as poor mates for bottom sharks (may pick at them); another source lists large angels as fine | Aquarium Domain (T3) |
| Mono / scat (new) | incompatible in the game (water class) | | — |
| Freshwater new species | incompatible | | — |
| Emperor angelfish (*Pomacanthus*) | **high_risk** | two large angels: emperors attack other large angels (QM); queens are territorial toward same-shaped angels (QM); one large angel per tank (PFK, emperor file) | QM ×2, PFK (repo) |
| Flame angel, coral beauty (*Centropyge*) | conditional | a big angel bullies small ones; add the dwarf first, very large tank | emperor-rule precedent, LA "add last" |
| Tangs (all), foxface | usually_compatible | | — |
| Miniatus grouper, dwarf lionfish | usually_compatible | robust; the angel is too big to eat when adult | — |
| Clownfish, chromis, anthias, gramma, firefish, gobies, blennies, wrasses, hawkfish, damsels, cardinal | usually_compatible | not a predator (small mouth); may chase newcomers | LA |
| Lined seahorse, mandarin | high_risk | bold feeder; may pick at seahorses (emperor precedent) | — |
| Cleaner / peppermint shrimp, crabs, hermits, snails, conch | usually_compatible | mostly safe; it doesn't hunt them | QM (picks sessile, not mobile, inverts) |
| Starfish, tuxedo urchin | usually_compatible | not sourced either way | — |
| Feather dusters, sponges, clams | incompatible / high_risk | eats sponges, tunicates, hydroids; nips clam mantles | FishBase, LA |
| Corals (stony, soft, zoanthids) | high_risk | nips stony and soft corals | LA, TFH |
| Bubble-tip anemone | high_risk | angels nip anemones; hydroid and jellyfish eater | Florida Museum (diet), emperor precedent |

`exceptionRules`:
- `{ other: 'emperor_angelfish', verdictFloor: 'high_risk', reason: 'Two large angelfish fight; adults attack other large angels. Keep one big angel per tank.', incidentRisk: 0.12, mitigatedBy: ['tank_size', 'sight_breaks'] }`
- `{ other: 'tag:dwarf_angelfish', verdictFloor: 'conditional', reason: 'A queen angel bullies smaller angelfish, especially ones added after it. Add the dwarf angel first, in a very large tank.', incidentRisk: 0.06, mitigatedBy: ['tank_size', 'sight_breaks'] }`
- `{ other: 'tag:clam', verdictFloor: 'high_risk', reason: 'Picks at clam mantles until the clam dies.', incidentRisk: 0.15 }`
- `{ other: 'lined_seahorse', verdictFloor: 'high_risk', reason: 'A large, bold feeder that outcompetes and may pick at slow seahorses.', incidentRisk: 0.08 }`
- `positiveInteractions` (juveniles only, if the engine can condition on life stage): `{ other: 'tag:fish_large', text: 'A young queen angel runs a cleaning station: big fish hold still while it picks off parasites.' }`.

### Smallest tank tier for an adult
**300 gal (96×24 in).** The footprint fits the 240, but the gallons (250) don't.

---

## Clown triggerfish

*Balistoides conspicillum* (Bloch & Schneider, 1801) · Balistidae · new group `triggerfish`. Name current (FishBase,
Fishes of Australia; often misspelt "conspicillium").

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Balistoides-conspicillum.html) | 1 | **50 cm TL**; 1–75 m; Indo-Pacific; **eats sea urchins, crabs and other crustaceans, molluscs, tunicates**; **juveniles secretive in small caves rich in invertebrates**; adults solitary, open water along drop-offs, retreat to caves; distinct pairs; spawns over rubble and sand; **among the most highly prized aquarium fishes**; ciguatera reports; IUCN LC (2022) |
| [Fishes of Australia](https://fishesofaustralia.net.au/Home/species/761) | 1 | **adult black with large white spots on the lower half, yellowish reticulated back, white or yellow band across the snout in front of the eyes, orange-yellow lips, pale yellowish band in the tail**; **juvenile black with large white spots, yellow snout, yellow patch mid-back**; 50 cm TL; drop-offs with rich coral; diet as FishBase |
| [Two Oceans Aquarium](https://aquarium.co.za/animals/clown-triggerfish) | 1 (public aquarium) | first dorsal spine locks upright (second spine is the "trigger") to wedge into the reef; **divers hear grunting or clicking (swim-bladder vibration)**; some chase divers near nests; bites the spines off urchins |
| [Australian Museum: Why are they called triggerfishes?](https://australian.museum/learn/animals/fishes/why-are-they-called-triggerfishes/) | 1 | spine lock mechanism; young wedge into crevices with spine locked and pelvic bone lowered |
| [Raick et al. 2018, J Exp Biol 221](https://orbi.uliege.be/handle/2268/219088) | 1 | sound made by pectoral fins driving scutes against the swim bladder; **likely shared by most Balistidae** (clown trigger not tested) |
| [Wikipedia: Triggerfish](https://en.wikipedia.org/wiki/Triggerfish) | 3 | balistiform swimming (undulating dorsal and anal fins; tail for bursts); triggerfish lay demersal eggs on sand; nest guarding |
| [LiveAquaria: Clown Triggerfish](https://www.liveaquaria.com/products/clown-triggerfish) | 2 | **300 gal**; 72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12; 20"; easy care; **aggressive: one of the most aggressive kept, large similarly assertive mates only**; not reef compatible; **rearranges decor**; meaty foods (squid, krill, clams, small fish, **hard-shelled shrimp, to wear down ever-growing teeth**); **$149.99**; **sold from ½ in** |
| [Quality Marine: Clown Triggerfish](https://www.qualitymarine.com/quality-marine/fish/triggers/balistoides/clown-conspicillum-32009/) | 2 | **300 gal**; ~20"; aggressive, has attacked divers; **turns over rock, rubble, inverts and corals while hunting**; eats small fish, stars, crabs, shrimp, snails, urchins; **blows water to flip urchins**, attacks their undersides; sand bed with rubble and shells |
| [TFH: Balistoides conspicillum](https://tfhmagazine.com/articles/saltwater/balistoides-conspicillum) | 2 | 180 gal "absolute smallest" for one fish with massive filtration; "quickly outgrow all but the largest tanks"; **most end up the only fish in the tank**; **bites hands, heater and filter tubing, damages acrylic, scratches glass**; begs at the glass, hand-feeds; never feed live fish; aquarium spawnings have happened, fry not raised |
| [Reef Builders 2015](https://reefbuilders.com/2015/04/06/quality-marine-receives-biota-marines-cultured-balistoides-conspicillum) / [CORAL 2015](https://coralmagazine.com/?p=491119) | 2 | **Biota Palau hatchery-raised clown triggers sold via Quality Marine (Apr 2015)**, held separately because aggression grows with age; 47-day-old captive-hatched juveniles |
| [Reef Builders: clown-trigger tag](https://reefbuilders.com/tag/clown-triggerfish/) | 2 | rare wild "maze" and ringed individuals; hybrid clown triggers; Sustainable Aquatics tank-raised fish (2010) |
| Hobby lifespan pages (via search: [Aquariadise](https://www.aquariadise.com/clown-triggerfish/), [Saltwater Aquarium Blog](https://www.saltwateraquariumblog.com/clown-triggerfish-care/)) | 3 | ~8 yr wild (unsourced); 10–20 yr in captivity |

**Modelled as:**
- 45 cm aquarium adult, **300 gal, 96×24 in** → smallest tier the **300-gal**; `activeSwimmer`,
  `outgrowsSmallTanks`, `heavyWaste`
- a hard-shell crusher: eats every crustacean, snail, urchin, star, clam and small fish; **reef `unsafe`**,
  `coralRisk 0.45` (flips rock and corals while hunting, bites)
- one per tank and only with large, robust fish; conditional at best, high risk or incompatible with most of the roster
- **new behaviour set `triggerfish`**: balistiform fin swimming, spine-lock wedge at night, rock flipping, sand
  jetting, grunting, begging
- breeding `not_in_game` (demersal, guarded eggs; pelagic larvae need a hatchery; Biota 2015)
- no named forms: intensity locus. Aberrants and hybrids left out

**Conflicts:**
- Tank: TFH 180 "absolute smallest", Saltwater Aquarium Blog 120–200, LA and QM 300. The game uses **300** (two Tier 2
  sources and the conservative rule).
- Size: 50 cm TL wild (FishBase, FoA); ~20 in (LA, QM). Aquarium fish rarely reach the wild maximum. The game uses 45.
- Grunting: documented for the family's mechanism (Raick 2018) and heard by divers (Two Oceans), not measured in this
  species. Good enough for a sound or animation cue.
- Captive-bred: Biota produced them in 2015 (and Sustainable Aquatics "tank raised" in 2010), but there is no current
  steady supply. The game sets `captiveBredAvailable: false`. The owner could flip it.
- Lifespan: only Tier 3 figures (10–20 yr captive). The game uses 480, low confidence.

### Proposed game data

```ts
{
  id: 'clown_triggerfish',
  commonName: 'Clown Triggerfish',
  scientificName: 'Balistoides conspicillum',
  category: 'fish', group: 'triggerfish', genus: 'Balistoides', environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock'],      // not reef
  nativeRegion: 'Indo-Pacific: East Africa to Samoa, north to southern Japan, south to northern Australia and New South Wales', // FishBase, FoA
  isStarter: false,
  adultSizeCm: 45,                              // FishBase/FoA 50 TL; LA 20 in; QM almost 20 in
  recommendedMinTankGallons: 300,               // LA, QM
  recommendedFootprint: { minLengthIn: 96, minWidthIn: 24 },
  activeSwimmer: true,
  bioload: 8,                                   // heavy, messy carnivore (TFH: massive filtration)
  tempC: { min: 22, max: 28, idealMin: 23.5, idealMax: 26.5 },   // LA/QM 72–78 °F
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.022, idealMax: 1.026 },
  gh: null, kh: { min: 7, max: 12 },
  flowPreference: 'moderate', lightPreference: 'moderate',
  diet: 'carnivore',
  foods: ['pellet_large', 'mysis', 'pellet_sinking', 'snail_live', 'pellet_small'],
    // LA: squid, krill, clams, hard-shelled shrimp; pellet_large = "Frozen Krill & Silversides". See Cross-species notes (shell-on food).
  feedingStyle: 'hunter', feedingSpeed: 0.9, feedingAggression: 0.9, hungerHours: 20,
  activityZone: ['middle', 'lower', 'decor'],
  temperament: 'aggressive', territoriality: 0.9, aggression: 0.9, finNipper: 0.45, hasLongFins: false,
    // LA "one of the most aggressive"; TFH: most end up alone; bites fins and equipment
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.03, note: 'One per tank, added last and young. Grows more aggressive with age.' },
  sameSpeciesRule: { maleMale: 'lethal', femaleFemale: 'lethal', mixed: 'harassment', juvenile: 'fight',
    note: 'Never two, unless a known pair in an enormous tank.' },
  predatorTags: ['crustacean', 'shrimp_large', 'shrimp_dwarf', 'shrimp_fry', 'snail', 'snail_small', 'starfish', 'clam',
    'worm', 'sessile_invert', 'copepod', 'fish_tiny', 'fish_small', 'fish_benthic', 'fish_slow', 'fry', 'eggs'],
    // FishBase/FoA: urchins, crabs, crustaceans, molluscs, tunicates; QM: small fish, stars, shrimp, snails, urchins ('starfish' tag covers urchins)
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 8,                       // bites prey apart rather than swallowing; QM lists small fish. Judgement.
  shrimpSafe: 'unsafe', snailSafe: 'unsafe', frySafe: 'unsafe', plantSafe: 'caution',
  reefSafe: 'unsafe', coralRisk: 0.45,          // LA no; QM turns over corals while hunting
  anemoneRelationship: 'harms_anemone',         // low confidence: an invert hunter that tears at benthic life (QM)
  hidesNeeded: 1, coverPreference: 0.3,
  substrateRules: { preferred: ['sand', 'aragonite', 'fine_sand'], avoid: [],
    note: 'Sand with rubble and shells to blow and dig in (QM); rock must be secured, it rearranges decor (LA); one crevice to lock into at night.' },
  breeding: {
    system: 'not_in_game', difficulty: 1, maturityDays: 22,
    clutchSize: { min: 10000, max: 100000 },    // not documented for the species; placeholder
    incubationHours: 8,                         // not documented; demersal triggerfish eggs ~1 day
    fryRearingHours: 380,                       // Biota juveniles moved to tanks at ~47–50 d × 8
    cooldownDays: 30, conditions: { needsPartner: true, needsNestSite: true, minTankGallons: 1000 },
    predationWithoutNursery: 1, nurseryRequired: true, maxRaisedPerClutch: 1,
    notes: 'Pairs spawn over rubble and sand (FishBase); triggerfish lay sticky eggs on the bottom and guard them. Larvae drift in the plankton for weeks; Biota in Palau raised them in a hatchery (2015). Aquarium spawnings have happened, but no one has raised the young at home, so the game does not breed it.',
  },
  sexSystem: 'gonochoristic', parentalCare: 'both',   // triggerfish: female tends eggs, male guards territory (Wikipedia, family level); unused while not_in_game
  lifecycle: { juvenileDays: 20, adultDays: 24, lifespanDays: 480, sexVisibleAtDays: 480, hatchSizeCm: 0.15 },
  hardiness: 0.85,                              // LA easy; TFH hardy once feeding
  difficulty: 'advanced',                       // size and aggression, as the miniatus
  baseValue: 150,                               // LA $149.99
  rarity: 'uncommon', visitorAppeal: 0.95,
  unlock: { requires: ['predators'], hint: 'Research Predator Husbandry: it needs a 300-gallon tank and eats almost anything with a shell.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'Nearly all are wild-caught juveniles; Biota (Palau) hatchery batches reached the US in 2015 but are not a steady supply.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2022)', note: 'Widespread; prized in the trade, and juveniles are the ones collected.' },
  special: { outgrowsSmallTanks: true, heavyWaste: true },
  behaviorSet: 'triggerfish',                   // NEW, see Behaviour
  behaviorTraits: { cruiseSpeed: 0.6, burstSpeed: 5, turnRate: 3, hoverTendency: 0.55, schoolingTightness: 0,
    restOnBottom: 0.05, hitching: 0, burrowing: 0.1, glassSurfing: 0.05, curiosity: 0.85, nocturnal: 0, pickRadiusMul: 1.15 },
  specialBehaviors: ['balistiform_swim', 'spine_lock_wedge', 'rock_flip', 'sand_jet', 'urchin_flip', 'grunt', 'territory_charge', 'glass_beg', 'equipment_bite'],
  visualLane: 'fish',
}
```

**Genetics.** No named forms → `intensityLocus` + `intensityOverlay({ accentColor: '#ffffff', bodyColor2: '#e2cf4a' })`
("Richly coloured"; QM: colour fades if underfed). **Left out:** rare wild aberrants ("maze" and "ringed" clown
triggers, Reef Builders), with no inheritance known and not a trade line; clown trigger hybrids (Reef Builders 2014,
2017); xanthic triggers.

baseVisual: `bodyColor '#111214'` (black) · `bodyColor2 '#d8c040'` (yellow reticulation on the back, around the dorsal
base) · `bellyColor '#f2f2ec'` (large white spots fill the lower half) · `finColor '#1a1a1a'` (soft dorsal and anal
black with yellow edges `#e8d060`) · `finColor2 '#e6dc86'` (pale yellow vertical band in the tail) · `accentColor
'#f6f6f0'` (white spots) · `eyeColor '#1a1410'` · `pattern 'spots'` (large, only on the lower half; seed per fish) ·
`patternScale 1.6` · `patternContrast 1` · `bodyMark: 'trigger_face'` (new: white or yellow band across the snout in
front of the eyes; orange-yellow lips `#ff9a2a`) · `iridescence 0` · `metallic 0` · `translucency 0` · `finType
'triggerfish'` (first dorsal spine folds into a groove; tall soft dorsal and anal that undulate) · `finLength 1` ·
`bodyDepth 1.05` · `variation 0.12`.

### Young and sexes
- **Juvenile:** black with **large white spots over most of the body** (relatively bigger than an adult's), a
  **yellow snout**, and a yellow patch in the middle of the back (FoA). The lower-half spotting and back
  reticulation come with growth. Sold from ½–1 in (LA).
- **Sexes:** no documented difference. Not drawn.

### Behaviour (new set `triggerfish`)
- **Swimming:** balistiform. It sculls on undulating soft dorsal and anal fins with the tail folded, so it moves
  slowly, hovers and pivots precisely, even backs up; the tail opens only for bursts (Wikipedia, Triggerfish).
- **Foraging:** patrols rock and sand, **flips rubble and small rocks and knocks over loose corals** (QM, LA), **blows
  jets of water at the sand** to uncover prey and to flip urchins, then bites from below (QM). Crunches shells.
- **Night:** wedges into a crevice with the **first dorsal spine locked up** (Australian Museum; Two Oceans). It
  should be drawn spine up, tucked into rock.
- **Sound:** grunts or clicks when disturbed (Two Oceans; Raick 2018 family mechanism). A good audio or tooltip cue.
- **Personality:** very curious; follows the keeper and begs at the glass, takes food from the hand (TFH); also
  **bites hands and equipment** and can scratch acrylic (TFH). It charges tankmates in its territory; aggression
  grows with age (QM 2015).
- Not a jumper in the sources; it doesn't bury or rest on the bottom.
- Closest existing set: `pea_puffer` (fin-driven hover and pivot, curious, nippy), but it lacks rock flipping, sand
  jetting and the spine wedge. **A new `triggerfish` set is needed.**

### Compatibility

| Other | Verdict | Reason | Sources |
|---|---|---|---|
| Blue tang (new) | conditional | big but shy; bullied; 300+ gal, trigger added last and small | LA, TFH |
| Naso tang (new) | conditional | big, fast; same caveats | LA |
| Queen angelfish (new) | conditional | both very aggressive; fin biting | LA, ADW |
| Panther grouper (new) | conditional | the grouper is slow and an easy bite target; the trigger is too deep-bodied and spiny for a 14 cm gape | LA ×2 |
| Coral catshark / epaulette / bamboo shark (new) | high_risk | triggers pick at bottom-resting sharks; and the trigger eats shark egg cases and pups (my inference) | Aquarium Domain (T3) |
| Mono / scat (new) | incompatible in the game (water class); high_risk otherwise | | — |
| Freshwater new species | incompatible | | — |
| Yellow, sailfin, chocolate, kole tang; foxface; emperor angel | conditional | "large, similarly assertive tank mates" only (LA); most end up alone (TFH) | LA, TFH |
| Miniatus grouper | conditional | robust predator of similar size | LA |
| Dwarf lionfish, lined seahorse, mandarin | incompatible / high_risk | slow fish are bitten (`fish_slow`); lionfish fins | TFH |
| Dwarf angels, anthias, wrasses, clownfish, chromis, damsels, gramma, firefish, gobies, blennies, hawkfish, cardinal | incompatible / high_risk | small fish eaten (`fish_tiny/small`) or killed (`fish_medium`) | QM, FishBase |
| Cleaner / peppermint shrimp | incompatible | eats shrimp | QM, LA |
| Hermits, emerald crab, mantis | incompatible | eats crabs (mantis is species-only anyway) | FishBase, QM |
| Snails, conch | incompatible | crushes molluscs | FishBase, QM |
| Tuxedo urchin, elegant / sand-sifting star | incompatible | urchins are a staple; eats stars | FishBase, QM |
| Corals, clams, feather dusters | high_risk / incompatible | flips corals while hunting; eats molluscs and tunicates | QM, FishBase |
| Bubble-tip anemone | high_risk | tears at benthic life (low confidence) | QM |

`exceptionRules`:
- `{ other: 'tag:crustacean', verdictFloor: 'incompatible', reason: 'Crabs, hermits and shrimp are its natural food; it crushes them.', incidentRisk: 0.5 }`
- `{ other: 'tag:snail', verdictFloor: 'incompatible', reason: 'Crushes snail shells with its teeth.', incidentRisk: 0.5 }`
- `{ other: 'tag:starfish', verdictFloor: 'incompatible', reason: 'Flips urchins with jets of water and bites them from below; eats starfish.', incidentRisk: 0.4 }`
- `{ other: 'tag:fish_small', verdictFloor: 'incompatible', reason: 'One of the most aggressive fish kept: small fish are killed and eaten.', incidentRisk: 0.35 }`
- `{ other: 'tag:fish_medium', verdictFloor: 'high_risk', reason: 'Attacks mid-sized reef fish; only large, robust fish have a chance.', incidentRisk: 0.15, mitigatedBy: ['tank_size', 'hides'] }`
- `{ other: 'tag:fish_large', verdictFloor: 'conditional', reason: 'Even large fish are harassed; add the trigger last, small, in a very big tank.', incidentRisk: 0.06, mitigatedBy: ['tank_size', 'sight_breaks'] }`
- `{ other: 'tag:fish_slow', verdictFloor: 'incompatible', reason: 'Bites slow, weak swimmers.', incidentRisk: 0.3 }`
- `{ other: 'tag:clam', verdictFloor: 'incompatible', reason: 'Eats molluscs.', incidentRisk: 0.4 }`

### Smallest tank tier for an adult
**300 gal (96×24 in).** The 240 fits the footprint but not the gallons.

---

## Panther grouper (humpback grouper, barramundi cod)

**Name:** Catalog of Fishes: **valid as *Chromileptes altivelis* (Valenciennes, 1828)**, family Epinephelidae; notes
that both spellings are in use (*Cromileptes* in Fricke et al. 2011, Craig et al. 2011) and that **Ma & Craig 2018,
Koeda 2019 and Allen & Erdmann 2024 treat it as *Epinephelus altivelis***. FishBase uses *Chromileptes*. WoRMS accepts
the genus spelled *Chromileptes* but files the species as *Cromileptes altivelis*. Fishes of Australia uses
*Chromileptes* and notes that Ma & Craig (2018) moved it into *Epinephelus*.
**Recommendation:** `scientificName: 'Chromileptes altivelis'`, `genus: 'Chromileptes'` (Catalog of Fishes and
FishBase). Note in `confidenceNotes` that the trade spells it *Cromileptes* (LiveAquaria, Top Shelf) and that it is
increasingly called *Epinephelus altivelis*. Keep `genus` as Chromileptes so the engine doesn't treat it as the same
genus as future *Epinephelus* species; `group: 'grouper'` already pairs it with the miniatus.

| Source | Tier | Facts used |
|---|---|---|
| [Catalog of Fishes](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?tbl=species&genus=Chromileptes) | 1 | name and status as above |
| [WoRMS 218193](https://www.marinespecies.org/aphia.php?p=taxdetails&id=218193) | 1 | *Cromileptes altivelis* accepted, genus accepted as *Chromileptes* |
| [FishBase](https://www.fishbase.se/summary/Chromileptes-altivelis.html) | 1 | **70 cm TL**; Lm 39 cm; 2–40 m; lagoon and seaward reefs, **often dead or silty areas, tide pools**; **small fishes and crustaceans**; "growth is very slow"; **juveniles commonly caught for the aquarium trade**; aquaculture; Hawaiian records probably released aquarium fish; IUCN **Data Deficient (assessed 20 Nov 2016)** |
| [Fishes of Australia](https://fishesofaustralia.net.au/Home/species/4661) | 1 | **adult pale greenish to greenish-brown with scattered round black spots and large dusky blotches; very concave head profile**; **juvenile pale greyish with large round black spots**; 70 cm; adults in lagoons and sheltered inner reefs, often silty; juveniles in shallows and tide pools; **protogynous**; **Queensland no-take species**; heavily exploited in the live-fish trade; Ma & Craig 2018 |
| [Williams et al. 2009, Endang Species Res 9: 67–79](https://researchonline.jcu.edu.au/8039) | 1 | GBR and Torres Strait: **max age 19 yr**; von Bertalanffy **K = 0.30/yr, L∞ = 59.7 cm**; 50% male at 54.7 cm and 9.6 yr; spawning Oct–Jan |
| [Animal Diversity Web](https://animaldiversity.org/accounts/Cromileptes_altivelis) | 1 (page from 2001) | 70 cm; juveniles have fewer, larger spots; **swims slowly with many odd turns, sometimes seems upside down**; wary, swims off a short way when approached; eats fish, squid, cuttlefish; protogynous; pelagic eggs, no care |
| [Wikipedia: Humpback grouper](https://en.wikipedia.org/wiki/Humpback_grouper) | 3 | IUCN DD (Sadovy et al. 2018 assessment); earlier VU (2007/08); females mature ~1.5 yr; sex change from 3 yr, most male by 9; hatchery production mainly in Taiwan and Indonesia; cannibalism in hatcheries; ciguatera; non-native in Florida and Hawaii |
| [Global Seafood Alliance: Indonesian grouper seedstock](https://www.globalseafood.org/advocate/indonesian-methods-achieve-mass-production-grouper-seedstock/) (via search summary) | 2 | Gondol (Bali) hatchery mass seed production from 1999–2001; **broodstock tanks 60–150 m³** |
| [LiveAquaria: Panther Grouper](https://www.liveaquaria.com/products/panther-grouper) | 2 | **300 gal**; 72–78 °F, pH 8.1–8.4, **SG 1.021–1.023**, dKH 8–12; 20" (text says 28"); aggressive when stressed; reef with caution; **needs a lid: shy at first and may jump or escape**; strong filtration; sandy substrate, pebbles, live rock; sexes hard to tell; **"Tank Raised" variant offered**; **$18.99** (sizes from <2") |
| [Quality Marine: Panther Grouper](https://www.qualitymarine.com/quality-marine/fish/groupers/cromileptes/panther-19014/) | 2 | 180 gal; almost 28"; **juveniles white with black spots, adults grey and tan with dark spots**; friendly except to fish or crustaceans that fit in its mouth; one per tank; **low metabolism, feed every other day**; secretive; heavy waste |
| [Top Shelf Aquatics: Panther Grouper](https://topshelfaquatics.com/products/panther-grouper-cromileptes-altivelis) | 2 | 300 gal in text (180 in quick specs); ~28"; **not reef safe** (eats shrimp, crabs, small fish; moves rock); **secure cover**; **$80.99 (reg. $89.99) at 2.6–3.5"** |
| [Saltwater Aquarium Blog](https://www.saltwateraquariumblog.com/panther-grouper-care/) | 3 | **300 gal** for one adult; collected at 3–4 in; **grows a few inches a month**; juvenile "dalmatian", adult duller and greener with bluish fins; rests near the bottom in shade; **feed juveniles 3×/day, adults 2–3×/week**; no feeder goldfish; **mouth smaller than other groupers'**; adults aggressive to other groupers; >20 yr |
| [Practical Fishkeeping: predators and thiaminase](https://www.practicalfishkeeping.co.uk/features/what-you-need-to-know-about-predator-fish-and-thiaminase/) | 2 | mussels, prawns/shrimp and cyprinids (goldfish) carry thiaminase; vary the diet, use B1 or vitamin supplements; feeder goldfish are a bad idea |

**Is it a 1,000-gallon-plus fish? No.** It is a 60–70 cm, sedentary, cave-and-hover grouper (QM: low metabolism;
ADW: slow). The retail minimum is 300 gal (LA, Top Shelf, Saltwater Aquarium Blog; QM 180). A 300-gal tier is only
24 in front to back, which is less than an adult's 60 cm (24 in) length, so an adult couldn't turn comfortably. The
honest minimum is **the 500-gal tier (120×36 in)**. That is my judgement from body length against tank width, not a
sourced figure. Nothing suggests it needs more than 1,000 gal, so there is no reason to leave it out on tank size. The
reasons to think twice are welfare ones: sold as a 2-in "cute" juvenile for about $19 and growing several inches a
month; eats tankmates; released aquarium fish have turned up in Hawaii and Florida.

**Modelled as:**
- 60 cm adult (L∞ 59.7 cm, Williams 2009), **gallons 300 (three sources), footprint 120×36 in (judgement)** →
  smallest tier the **500-gal**; `outgrowsSmallTanks`, `heavyWaste`, `escapeArtist`
- ambush carnivore with a smallish mouth for a grouper: `maxLikelyPreySizeCm 14`
- one per tank; high risk with the miniatus; eats shrimp and crabs; corals safe (it disturbs rock)
- `grouper` behaviour set, slower and more open-water, with the odd hovering turns
- breeding `not_in_game` (hatcheries with 60–150 m³ broodstock tanks), but tank-raised juveniles are sold
  (`captiveBredAvailable: true`)

**Conflicts:**
- **Growth:** FishBase says "very slow". Williams 2009 (K = 0.30, roughly 15 cm at 1 yr, 27 at 2, 35 at 3 in the
  wild) and hobby reports ("a few inches a month" when young, fed heavily) disagree. Fast growth in aquaria is well
  attested (the "tank buster" reputation). The game should warn early (`outgrowsSmallTanks`).
- **Size:** max 70 cm (FishBase, FoA, ADW); LA quick stat 20" vs its text 28"; hobby captives 18–24 in. The game
  uses 60.
- **IUCN:** FishBase and Wikipedia say Data Deficient (2016 assessment, published 2018); FoA still shows Vulnerable
  (the 2007/08 listing). Use DD and mention the earlier VU.
- **Tank:** 180 (QM, Top Shelf quick specs) vs 300 (LA, Top Shelf text, SWA blog). Gallons 300. The 120×36 footprint
  is my call; the owner may prefer 96×24 (300 tier), which the sources allow.
- **Reef:** LA "with caution" vs Top Shelf "not reef safe". The game uses `caution` with low coral risk (it doesn't
  eat coral) and `unsafe` for shrimp, as the miniatus.

### Proposed game data

```ts
{
  id: 'panther_grouper',
  commonName: 'Panther Grouper',                // aka humpback grouper, barramundi cod, polka-dot grouper
  scientificName: 'Chromileptes altivelis',     // CoF valid; trade "Cromileptes"; Ma & Craig 2018 "Epinephelus altivelis"
  category: 'fish', group: 'grouper', genus: 'Chromileptes', environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock'],
  nativeRegion: 'Western Pacific and eastern Indian Ocean: southern Japan to Palau, Guam, New Caledonia and Queensland; Nicobar Islands to Western Australia', // FishBase
  isStarter: false,
  adultSizeCm: 60,                              // L∞ 59.7 cm (Williams 2009); max 70 TL (FishBase, FoA); captives 18–24 in
  recommendedMinTankGallons: 300,               // LA, Top Shelf, SWA blog (QM 180)
  recommendedFootprint: { minLengthIn: 120, minWidthIn: 36 },   // judgement: a 60 cm fish needs more than 24 in front to back
  activeSwimmer: false,
  bioload: 12,                                  // biggest fish here; QM/LA heavy waste
  tempC: { min: 22, max: 28, idealMin: 24, idealMax: 26.5 },     // LA/QM 72–78 °F; juveniles prefer 24.5 °C (Wikipedia)
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.021, idealMax: 1.025 },   // LA 1.021–1.023; QM 1.020–1.025
  gh: null, kh: { min: 7, max: 12 },
  flowPreference: 'low',                        // FoA: sheltered lagoons, silty areas
  lightPreference: 'moderate',
  diet: 'carnivore',
  foods: ['pellet_large', 'mysis', 'pellet_sinking'],   // krill, shrimp, squid, silversides (LA, QM, Top Shelf); mysis for juveniles
  feedingStyle: 'ambush', feedingSpeed: 0.8, feedingAggression: 0.8,
  hungerHours: 48,                              // QM every other day; SWA blog adults 2–3×/week
  activityZone: ['lower', 'middle', 'decor'],
  temperament: 'predatory', territoriality: 0.6, aggression: 0.5, finNipper: 0, hasLongFins: false,
    // QM: friendly except to what fits its mouth; LA: aggressive when stressed
  social: { kind: 'solitary', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.03, note: 'One per tank; adults fight other groupers (SWA blog).' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'fight', mixed: 'harassment', juvenile: 'tension',
    note: 'Young added together at the same small size may tolerate each other; adults do not (SWA blog); hatchery young are cannibals (Wikipedia).' },
  predatorTags: ['fish_tiny', 'fish_small', 'fish_medium', 'fish_slow', 'fish_benthic', 'shrimp_large', 'shrimp_dwarf', 'shrimp_fry', 'crustacean', 'fry'],
    // FishBase/FoA: small fishes and crustaceans; ADW: fish, squid
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 14,                      // "small head" (LA), "mouth smaller than other groupers" (SWA); miniatus at 42 cm uses 15. Judgement.
  shrimpSafe: 'unsafe', snailSafe: 'mostly_safe', frySafe: 'unsafe', plantSafe: 'safe',
  reefSafe: 'caution', coralRisk: 0.08,         // doesn't eat coral; bulk and rock-shifting (Top Shelf)
  anemoneRelationship: 'neutral',
  hidesNeeded: 2, coverPreference: 0.4,
  substrateRules: { preferred: ['sand', 'aragonite'], avoid: [],
    note: 'Sand, pebbles and live rock with caves big enough for it, plus open room; strong filtration and skimming (LA, QM).' },
  breeding: {
    system: 'not_in_game', difficulty: 1, maturityDays: 25,   // females ~1.5 yr; Lm 39 cm (FishBase)
    clutchSize: { min: 50000, max: 500000 },    // not documented here; hatchery order of magnitude. Placeholder.
    incubationHours: 8,                         // not documented; placeholder
    fryRearingHours: 400,                       // hatchery larval rearing ~45–50 d; placeholder
    cooldownDays: 30, conditions: { needsPartner: true, minTankGallons: 1000 },
    predationWithoutNursery: 1, nurseryRequired: true, maxRaisedPerClutch: 1,
    notes: 'A protogynous hermaphrodite: all start female and the biggest turn male (most by 9 years). It spawns in open water with floating eggs. It is bred in food-fish hatcheries in Indonesia and Taiwan with broodstock tanks of 60–150 cubic metres, not in home aquaria, so the game does not breed it.',
  },
  sexSystem: 'protogynous', parentalCare: 'none',
  lifecycle: { juvenileDays: 20, adultDays: 25, lifespanDays: 500, sexVisibleAtDays: 500, hatchSizeCm: 0.15 },
    // 19 yr max (Williams 2009) → cap 500. LA: sexes hard to tell.
  hardiness: 0.85, difficulty: 'advanced',
  baseValue: 80,                                // Top Shelf $80.99 at 2.6–3.5 in; LA $18.99 (from <2 in)
  rarity: 'uncommon', visitorAppeal: 0.85,
  unlock: { requires: ['predators'], hint: 'Research Predator Husbandry: the spotted baby grows into a 60 cm predator that needs a 500-gallon showpiece.' },
  captiveBredAvailable: true,                   // LA "Tank Raised" option; Indonesian and Taiwanese hatcheries
  wildCaughtNote: 'Juveniles are both wild-caught and hatchery-raised (food-fish aquaculture in Indonesia and Taiwan); adults are a luxury food fish in Hong Kong live markets.',
  conservation: { status: 'Data Deficient (IUCN Red List, assessed 2016; listed Vulnerable in 2007/08)', note: 'Overfished for the live reef-fish trade in Southeast Asia; a no-take species in Queensland. Released aquarium fish have turned up in Hawaii and Florida. Never release one.' },
  special: { outgrowsSmallTanks: true, heavyWaste: true, escapeArtist: true },
  behaviorSet: 'grouper',
  behaviorTraits: { cruiseSpeed: 0.35, burstSpeed: 5, turnRate: 1.6, hoverTendency: 0.7, schoolingTightness: 0,
    restOnBottom: 0.35, hitching: 0, burrowing: 0, glassSurfing: 0.02, curiosity: 0.6, nocturnal: 0.25, pickRadiusMul: 1.3 },
  specialBehaviors: ['slow_hover', 'odd_turn', 'ambush_rush', 'cave_lurk', 'feeding_anticipation', 'fright_colour', 'startle_jump'],
  visualLane: 'fish',
}
```

**Genetics.** No colour forms → `intensityLocus` + `intensityOverlay({ accentColor: '#050505', patternContrast: 1 })`
("Richly coloured"). "Tank raised" is an origin, not a form. Left out: the hatchery hybrid with the giant grouper
(*E. lanceolatus* × *C. altivelis*, Wikipedia), a food-farm hybrid.

baseVisual (adult): `bodyColor '#c9c6ad'` (pale greenish-brown) · `bodyColor2 '#a9a68c'` (large dusky blotches) ·
`bellyColor '#dcdac8'` · `finColor '#c2c0a8'` (large, rounded, spotted fins) · `finColor2 '#8fa4b8'` (bluish fin cast,
SWA blog) · `accentColor '#0d0d0d'` (round black spots, smaller than the eye) · `eyeColor '#3a2a1a'` · `pattern
'dalmatian'` · `patternScale 0.8` · `patternContrast 0.9` · `iridescence 0` · `metallic 0` · `translucency 0.03` ·
`finType 'grouper_highfin'` (new: tall rounded dorsal, broad rounded paddle tail) · `finLength 1.15` · `bodyDepth 1.1`
(tall, narrow body, small head, **very concave "humpback" head profile**) · `variation 0.15`.

### Young and sexes
- **Juvenile:** **white to pale grey with fewer, larger round black spots** (as big as the eye), large rounded fins,
  high contrast (FoA, ADW, QM, Wikipedia). With growth the ground turns greenish-grey or tan, the spots get smaller
  and more numerous, and dusky blotches appear (FoA, QM). Stressed fish show brown "fright" patches (SWA blog).
- **Sexes:** look alike (LA); males are the larger, older fish (sex change at about 55 cm, Williams 2009). Not drawn.

### Behaviour
- Hovers slowly in mid- and low water near rock, often head-down or tilted, making **many odd turns and sometimes
  seeming to swim upside down** (ADW). Rests near the bottom in shade (SWA blog). It is *not* a cave-wedger like the
  miniatus: it hovers more in the open.
- Wary when new: hides, may **jump** (LA); later learns feeding time and waits at the front.
- Ambush rush at food and small fish; feeds most at dawn and dusk (Wikipedia).
- Closest set: `grouper` with lower `restOnBottom` and higher hover. No new set; add `odd_turn` and `slow_hover`
  special behaviours.

### Compatibility

| Other | Verdict | Reason | Sources |
|---|---|---|---|
| Blue tang (new) | usually_compatible (adult) / high_risk while the tang < ~14 cm | gape | LA, SWA |
| Naso tang (new) | usually_compatible (adult) / high_risk while small | | |
| Queen angelfish (new) | usually_compatible (adult) / high_risk while small | | |
| Clown triggerfish (new) | conditional | the trigger bites the slow grouper | LA trigger |
| Coral catshark / epaulette / bamboo shark (new) | conditional | eats egg cases and pups; "groupers larger than the shark" are poor mates; adult sharks too big to eat | Aquarium Domain (T3) |
| Mono / scat (new) | incompatible in the game (water class); otherwise conditional (young eaten) | | — |
| Freshwater new species | incompatible | | — |
| Miniatus grouper | high_risk | adults fight other groupers; the panther outgrows it | SWA blog; engine same-group |
| Dwarf lionfish | high_risk | 15 cm, within the gape | — |
| Foxface, yellow/kole/chocolate/sailfin tang, emperor angel | usually_compatible (adults) | too deep-bodied for a 14 cm gape; small juveniles at risk | — |
| Anthias, wrasses, dwarf angels, clownfish, chromis, damsels, gramma, firefish, gobies, blennies, hawkfish, cardinal, mandarin, seahorse | incompatible / high_risk | eaten | FishBase, FoA, QM |
| Cleaner / peppermint shrimp | high_risk | groupers eat their cleaners in tanks | QM; existing cleaner rule for miniatus |
| Hermits, emerald crab | high_risk | crustaceans are its food | FishBase |
| Mantis shrimp | incompatible | mantis is species-only | — |
| Snails, conch, stars, urchin | usually_compatible | not its food | — |
| Corals, bubble-tip | usually_compatible | doesn't eat them; may knock rock | Top Shelf |

`exceptionRules` (as the miniatus):
- `{ other: 'tag:fish_tiny', verdictFloor: 'incompatible', reason: 'Tiny fish are swallowed whole.', incidentRisk: 0.5 }`
- `{ other: 'tag:fish_small', verdictFloor: 'incompatible', reason: 'An ambush predator: small fish are eaten.', incidentRisk: 0.4 }`
- `{ other: 'tag:fish_medium', verdictFloor: 'high_risk', reason: 'Only fish too big to swallow are safe; its mouth is smaller than most groupers\', but a grown one still takes fish of 12–14 cm.', incidentRisk: 0.12, mitigatedBy: ['hides'] }`
- `{ other: 'tag:shrimp_large', verdictFloor: 'high_risk', reason: 'Cleaner and peppermint shrimp are eaten.', incidentRisk: 0.2 }`
- `{ other: 'tag:crustacean', verdictFloor: 'high_risk', reason: 'Crustaceans are much of its natural diet.', incidentRisk: 0.15 }`
- `{ other: 'miniatus_grouper', verdictFloor: 'high_risk', reason: 'Adult groupers fight other groupers, and the panther grows bigger.', incidentRisk: 0.1, mitigatedBy: ['tank_size'] }`
- `{ other: 'dwarf_lionfish', verdictFloor: 'high_risk', reason: 'A grown panther grouper can swallow a dwarf lionfish.', incidentRisk: 0.08 }`

Also add to `cleaner_shrimp.exceptionRules` (and peppermint): `{ other: 'panther_grouper', verdictFloor: 'high_risk', ... }` and `{ other: 'clown_triggerfish', verdictFloor: 'incompatible', ... }`.

### Smallest tank tier for an adult
**500 gal (120×36 in)** by footprint (my judgement); by the sources' gallons alone, the **300-gal**. Not beyond 1,000.

---

## Cross-species notes

- **New foods worth adding:**
  - **Shell-on shellfish** (clams or mussels in the shell, shell-on shrimp, crab legs): the clown trigger needs hard
    food to wear down its ever-growing teeth (LA). Today `snail_live` and `pellet_large` stand in. A new tag
    `shellfish` would also suit future puffers (the fahaka in this chunk).
  - **Angel formula with sponge** (frozen): the queen angel's wild diet is mostly sponge (FishBase). Optional; today
    `pellet_small`/`flake` cover it.
  - **Squid / chopped seafood**: covered by "Frozen Krill & Silversides" (`pellet_large`) for the trigger and grouper.
- **Feeding cautions:** no feeder goldfish or freshwater feeders for the grouper or trigger (thiaminase, disease;
  PFK, SWA blog, TFH "never live fish"). Mussels and prawns carry thiaminase too, so use a varied diet plus a vitamin
  supplement (PFK). Tangs need seaweed at least three times a week (LA ×2).
- **New behaviour set:** `triggerfish` (balistiform fin sculling, spine-locked night wedge, rock flipping, sand
  jetting, urchin flipping, grunting, glass begging, equipment biting). All the others fit existing sets (`tang` ×2,
  `angelfish_dwarf`, `grouper`) with new special-behaviour names: `play_dead`, `dart_and_wedge`, `zooplankton_pick`,
  `night_spots`, `startle_jump`, `sponge_graze`, `juvenile_cleaning`, `odd_turn`, `slow_hover`.
- **New body marks** (`bodyMark` strings): `palette` (blue tang), `naso_mask`, `crown` (queen angel),
  `trigger_face`. New `finType`s: `tang`, `naso` (lyre + male streamers), `triggerfish`, `grouper_highfin`.
- **No new breeding systems:** all five are `not_in_game`. Two are hatchery-bred commercially (blue tang: UF 2016,
  Biota 2025; panther grouper: Indonesian and Taiwanese food hatcheries), one was in 2015 (clown trigger, Biota
  Palau), and the queen angel first spawned in a lab in December 2024 with no larvae raised. None is home breeding.
- **Flag ideas (optional, a core-type change):** `ichProne` (blue tang; tangs generally) to weight marine white spot
  in `eligibleIllnesses` instead of only lowering hardiness; `equipmentBiter` (clown trigger bites heaters and tubing
  and scratches acrylic; TFH), distinct from the mantis `glassStrikeRisk`.
- **New group:** `triggerfish`. The queen angel shares `angelfish` with the emperor, so the engine's same-group check
  fires (plus the explicit high-risk rule). Blue and naso tangs share `tang`.
- **Surprises:**
  1. The blue tang **doesn't need a big tank by the sources** (180 gal, 6 ft), and its "yellow juvenile" in ADW and
     National Geographic is a mix-up with the Atlantic blue tang.
  2. The panther grouper is **not** a 1,000-gal fish, but it's the clearest "tank buster": sold at under 2 in for
     about $19, it grows several inches a month to 60–70 cm.
  3. The "blonde naso" is a different species (*N. elegans*), not a morph.
  4. The panther grouper's name is unsettled: Chromileptes (Catalog of Fishes), Cromileptes (WoRMS species page,
     trade), Epinephelus (Ma & Craig 2018, Allen & Erdmann 2024).
- **Brackish crossover:** silver mono and spotted scat adults are often kept in near-marine water. Whether the game
  lets them share a `marine_fowlr` tank is the brackish researcher's call. Until then they are incompatible by water
  class with all five fish here.

## Sources

- https://www.fishbase.se/summary/Paracanthurus-hepatus.html
- https://www.fishbase.se/summary/Naso-lituratus.html
- https://www.fishbase.se/summary/Naso-elegans.html
- https://www.fishbase.se/summary/Holacanthus-ciliaris.html
- https://www.fishbase.se/summary/Balistoides-conspicillum.html
- https://www.fishbase.se/summary/Chromileptes-altivelis.html
- https://www.fao.org/4/y0870e/y0870e30.pdf (FAO WCP Species ID Guide vol. 6, Acanthuridae; text extracted from the PDF)
- https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?tbl=species&genus=Chromileptes
- https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?tbl=species&genus=Naso
- https://www.marinespecies.org/aphia.php?p=taxdetails&id=218193
- https://fishesofaustralia.net.au/Home/species/2203
- https://fishesofaustralia.net.au/Home/species/4661
- https://fishesofaustralia.net.au/Home/species/761
- https://animaldiversity.org/accounts/Paracanthurus_hepatus/
- https://animaldiversity.org/accounts/Holacanthus_ciliaris/
- https://animaldiversity.org/accounts/Cromileptes_altivelis
- https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/holacanthus-ciliaris
- https://australian.museum/learn/animals/fishes/why-are-they-called-triggerfishes/
- https://aquarium.co.za/animals/clown-triggerfish
- https://orbi.uliege.be/handle/2268/219088 (Raick et al. 2018)
- https://researchonline.jcu.edu.au/8039 (Williams et al. 2009)
- https://researchonline.jcu.edu.au/35460/ (Taylor et al. 2014)
- https://www.was.org/Meeting/Program/PaperDetail/167384 (UFSC 2025, first spawning)
- https://was.org/Meeting/Program/PaperDetail/167558 (UFSC 2025, growth)
- https://www.liveaquaria.com/product/330/?pcatid=330
- https://www.liveaquaria.com/blogs/species-spotlight/the-blue-tang
- https://www.liveaquaria.com/products/naso-tang
- https://www.liveaquaria.com/products/queen-angelfish
- https://www.liveaquaria.com/products/clown-triggerfish
- https://www.liveaquaria.com/products/panther-grouper
- https://www.qualitymarine.com/news/the-blue-tang-of-many-names/
- https://www.qualitymarine.com/quality-marine/fish/angels/holacanthus/queen-juvenile-10061/
- https://www.qualitymarine.com/quality-marine/fish/triggers/balistoides/clown-conspicillum-32009/
- https://www.qualitymarine.com/quality-marine/fish/groupers/cromileptes/panther-19014/
- https://topshelfaquatics.com/pages/saltwater-fish/blue-hippo-tang
- https://topshelfaquatics.com/products/blue-hippo-tang-captive-bred
- https://topshelfaquatics.com/pages/saltwater-fish/naso-tang
- https://topshelfaquatics.com/products/panther-grouper-cromileptes-altivelis
- https://tfhmagazine.com/articles/saltwater/the-naso-tang-full-article
- https://www.tfhmagazine.com/articles/saltwater/holacanthus-ciliaris
- https://tfhmagazine.com/articles/saltwater/balistoides-conspicillum
- https://reefbuilders.com/2011/10/11/yellow-belly-blue-tang
- https://reefbuilders.com/2015/03/15/naso-lituratus-a-sleek-striking-outstanding-fish-for-spacious-marine-aquariums
- https://reefbuilders.com/2015/04/06/quality-marine-receives-biota-marines-cultured-balistoides-conspicillum
- https://reefbuilders.com/2016/07/20/captive-bred-blue-tang
- https://reefbuilders.com/2016/11/29/captive-bred-blue-tangs
- https://reefbuilders.com/2017/07/03/great-new-pictures-of-blue-queen-angelfish-from-st-pauls-rock
- https://reefbuilders.com/2018/03/07/the-first-hybrid-angelfish-holacanthus-townsendi (search summary only)
- https://reefbuilders.com/tag/clown-triggerfish/
- https://coralmagazine.com/?p=491119
- https://www.coralmagazine.com/?p=3078387
- https://shop.thebiotagroup.com/collections/all/products/blue-tang
- https://www.risingtideconservation.org/tag/kevin-barden/
- https://www.practicalfishkeeping.co.uk/features/what-you-need-to-know-about-predator-fish-and-thiaminase/
- https://www.saltwateraquariumblog.com/panther-grouper-care/ (Tier 3)
- https://gensou.sg/?p=32419 (Tier 3)
- https://en.wikipedia.org/wiki/Paracanthurus (Tier 3)
- https://en.wikipedia.org/wiki/Naso_lituratus (Tier 3)
- https://en.wikipedia.org/wiki/Naso_elegans (Tier 3)
- https://en.wikipedia.org/wiki/Humpback_grouper (Tier 3)
- https://en.wikipedia.org/wiki/Triggerfish (Tier 3)
- https://www.nationalgeographic.com/animals/fish/b/blue-tang/ (cited only as the source of the juvenile-colour error)
- https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/blue-tang/ and https://www.reef.org/node/19157 (search summaries: Atlantic blue tang yellow juveniles, for the conflict)
- https://www.globalseafood.org/advocate/indonesian-methods-achieve-mass-production-grouper-seedstock/ (search summary)
- https://aquariumdomain.com/SpeciesProfiles/MarineFish/WhitespottedBambooShark.shtml (search summary, Tier 3: poor shark tankmates)
- https://www.aquariadise.com/clown-triggerfish/ (search summary, Tier 3: lifespan)

Pages that did not load: LiveAquaria /products/blue-hippo-tang (404; used /product/330 instead), the Plazi Ma &
Craig treatment (redirect page only; used Catalog of Fishes and FoA instead), reefs.com panther thread (403), Reef
Life Survey pages (403), the Springer N. lituratus age paper (login), the Inter-Research ESR abstract (429; used the
JCU record instead).
