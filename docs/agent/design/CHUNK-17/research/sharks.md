# Big-tank sharks: research notes (chunk 17)

Three bottom-living, egg-laying sharks: coral catshark, epaulette shark and brown-banded bamboo shark. Researched 2026-10-30 for the builder. The repo was read only. Every number below has a source; pages that would not load are marked.

**Access notes.**
- These pages refused automated access: IUCN (403), zootier-lexikon (the Hövel 2010 record, 403), Smithsonian (403), reefs.com (403), the sharksandrays Tapatalk care sheets (403) and theaquariumwiki (bot wall).
- PMC's epaulette oviparity paper hit a captcha, so I read the same paper on the journal's own site.
- The Bor et al. 2003 PDF, the Thai catshark PDF, the phys.org PDF and the Wheeler et al. 2021 PDF came through as raw binary. I extracted their text locally with PDFKit and read the full text.
- Facts seen only in a search-engine summary are marked *(via search index)*.

**Time compression** follows `docs/GAME_DESIGN.md`:
- incubation: game hours = real days × 8
- `maturityDays`: 8 to 25
- `lifespanDays`: real years × 40, capped at 500
- `hungerHours`: 36 to 44 for big predators

All three sharks hit the maturity and lifespan caps.

**Shared vocabulary proposed here** (details in "Cross-species notes"):
- behaviour set `benthic_shark`
- breeding system `egg_case`
- prey tags `benthic_shark` and `egg_case`
- food tags `squid`, `shellfish` and `whole_fish`, plus a vitamin and iodine supplement item
- special flags `electricalSensitive`, `needsIodineSupplement`, `knocksDecor` and `nitrateSensitive`

---

## Coral catshark
*Atelomycterus marmoratus* (Anonymous [Bennett], 1830), family **Atelomycteridae**.
- WoRMS and the Catalog of Fishes accept the name. Older sources put the genus in Scyliorhinidae, the true catsharks.
- "Coral catshark" and "coral cat shark" are the trade names. Trade "banded cat sharks" are bamboo sharks (*Chiloscyllium*), not this species, and one forum warns that vendors sell bamboo sharks under the coral catshark name *(via search index)*.
- Two Indonesian relatives live alongside it and are easy to mistake for it: *A. erdmanni* (Fahmi & White 2015, with far fewer white spots) and *A. baliensis*. An Indonesian "coral catshark" may be either one.
- Proposed behaviour set `benthic_shark` (new; the closest existing set is `grouper`). Proposed unlock: a new shark research (owner decision).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Atelomycterus-marmoratus.html) | 1 | **70 cm TL max**; Lm from 49 cm; tropical, reef-associated, inshore; uses crevices and holes; oviparous, **one egg case per oviduct**; **IUCN NT (assessed 14 May 2020)** |
| [WoRMS](https://www.marinespecies.org/aphia.php?p=taxlist&tName=Atelomycterus%20marmoratus) | 1 | accepted name; family Atelomycteridae |
| [Bor, van Oijen & Magenta 2003, Zool. Med. Leiden 77](https://repository.naturalis.nl/document/44279) (full text read) | 1 | captive females laid capsules at the **Liège University aquarium (1998)** and **NUPEC São Paulo (2000–2002, 19 capsules from one 47 cm female)**; capsule **50–79 × 18–23 mm**, length 2.6–3.5 × width; **two constricted waists**; posterior horns with **short tendrils (≤ 20 mm)**; dark brown, banded when dried; larger females lay larger capsules |
| [Choosri et al. 2023, Rambhai Barni Rajabhat Agric. J. 1(1)](https://ph03.tci-thaijo.org/index.php/kaset_rbruj/article/download/457/331/2257) (Thai full text read) | 1 | eggs from captive broodstock (Burapha Univ.), 3 eggs; **hatched in 76 days at 25.0 ± 0.8 °C, 32–33 ppt**; capsule 7.75 × 2.75 cm; 7 stages: d1–9 yolk only, d10–13 tiny embryo, d14–30 tail/gills/heart, d31–50 eye pigment + long gill filaments, d51–69 shark-shaped, **d70–75 striped pigment**, d76 hatch; **hatchling 9.2 cm, 2.57 g**; eggs viewed by **backlighting (candling)**; broodstock fed fish flesh **twice a week** |
| Hövel, Ommer & Ziegler 2010, *Zool. Garten* 79: 243–253 (Cologne Zoo) *(via search index and Wikipedia; full text not reached)* | 1 | a **1.3 group (1 male, 3 females)** in a **~5,000 L** exhibit; fertile eggs from early 2010; **14 juveniles reared**; tank **at least 3 m long with deep hiding places**; nocturnal/crepuscular, hides under overhangs alone or in groups, **returns to the same refuge**; hatchlings **barred, adult pattern by 3 months**; **4–6 months to hatch at 26 °C, hatchlings 10–13 cm** |
| [Wikipedia: Coral catshark](https://en.wikipedia.org/wiki/Coral_catshark) | 3 | carries the Hövel, Michael and Compagno facts above. Michael (2004, *Aquarium Fish Magazine*): **more aggressive than other small sharks, may attack tankmates larger than it can eat**, **up to 20 years** in captivity, well suited to large home tanks. Michael (2001): lies still and **lunges** at prey. Compagno (1984): males mature at 47–62 cm, females at 49–57 cm, **thin claspers** in adult males. It does not "crawl" like the epaulette. Colour: grey with black and white spots merging into dashes, white dorsal-fin tips, white bar through the gill slits, white belly. Capsules laid on the bottom, light brown, darkening |
| [Quality Marine: Coral Cat Shark](https://www.qualitymarine.com/quality-marine/fish/sharks/atelomycterus/coral-cat-marmoratus-29015/) | 2 | almost 28 in; **180 gal minimum**; 72–78 °F, SG 1.020–1.025, pH 8.1–8.4, dKH 8–12; medium light; fine sand and caves; **sensitive to copper and electric impulses**; keep away from larger aggressive fish, **"they can easily pick at it"** |
| [Chewy Education](https://www.chewy.com/education/fish/saltwater-fish/7-ideal-sharks-for-the-saltwater-aquarium) (expert input from Dr Jessie Sanders, DVM) | 2 | 200 gal in the profile, **300+ ideal**; 78–82 °F; silversides, shrimp, clams, mussels, small pieces; good tankmates are docile midwater fish (tangs, damsels, anthias); **avoid triggers, puffers, large angels** |
| [Quality Marine: Shark Eggs Part II](https://www.qualitymarine.com/news/shark-eggs-part-ii/) | 2 | catshark eggs are common in the trade; light brown, darkening; two tendrils; **~5 months** to hatch; hatchlings 4–5 in; candling and egg handling (see the `egg_case` spec) |
| Prices *(via search index)*: [aquariumfish.com](https://aquariumfish.com/collections/sharks) (fetched), Simple Tropical Fish UK, CB Aquatics CA | 2 | US "Cat Shark (*A. marmoratus*)" **from $177**; "Marble Shark" $601 (sold out); CA$500 (sold out); £249.99 |

**Modelled as:**
- 70 cm adult (FishBase max; conservative), **500 gal** and a **118 × 30 in floor footprint**. Hövel's 3 m length requirement → 118 in. The width is at least the adult's length so it can turn without folding double, which rules out the 96 × 24 in tiers.
- Breeding is `egg_case`: 1–2 capsules per laying, **laid loose on the sand** (not anchored), 120 real days → **960 game hours**.
- Tankmate aggression 0.35, the highest of the three sharks (Michael 2004).
- `hidesNeeded 3` (deep hiding places, Hövel).
- Eats crustaceans and small or sleeping fish (FishBase, Michael).

**Conflicts:**
- **Incubation:** 76 days at 25 °C (Choosri 2023, n = 3, full text) against 4–6 months at 26 °C (Hövel 2010 via Wikipedia) and ~5 months (Quality Marine). The game uses **120 days**, inside the aquarium-documented range. It is more conservative than the single small Thai trial.
- **Hatchling size:** 9.2 cm (Thai) against 10–13 cm (Hövel) → 10 cm.
- **Minimum tank:** 180 gal (Quality Marine), 200–300 gal (Chewy), "≥ 3 m long" (Hövel, Tier 1). The 3 m length decides the footprint, so the smallest tier that fits is 500 gal. That is higher than any retail gallon figure, and on purpose.
- **Temperament:** Quality Marine and LiveAquaria-style listings say "aggressive", and Chewy says docile tankmates are fine. The game uses predatory toward small animals and moderate aggression to larger ones, per Michael.
- **Lifespan:** only Michael (20 yr) gives one → the 500-day cap.

### Proposed game data
```ts
{
  id: 'coral_catshark',
  commonName: 'Coral Catshark',
  scientificName: 'Atelomycterus marmoratus',
  category: 'fish',
  group: 'shark',                 // new group: benthic sharks (visitor fatigue / same-group conflicts)
  genus: 'Atelomycterus',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock'], // eats every crustacean; corals are not the problem (see reefSafe)
  nativeRegion: 'Indo-West Pacific: Pakistan and India to Southeast Asia, southern China, Taiwan, the Philippines and New Guinea, north to the Ryukyu Islands', // FishBase + Wikipedia
  isStarter: false,

  adultSizeCm: 70,                // FishBase 70 cm TL max; QM "almost 28 in"; Liège female 60–65 cm
  recommendedMinTankGallons: 500, // smallest tier whose footprint fits (below); retail says 180–300 gal
  recommendedFootprint: { minLengthIn: 118, minWidthIn: 30 }, // Hövel 2010: tank ≥ 3 m long; width ≥ adult TL (27.6 in) to turn
  activeSwimmer: false,
  bioload: 6,                     // slender 70 cm shark, ~1 kg; heavy meaty diet (Top Shelf: heavy waste) — estimate

  tempC: { min: 22, max: 29, idealMin: 24, idealMax: 27 },   // QM 72–78 °F; Chewy 78–82 °F; Cologne 26 °C; Thai trial 25 °C
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },  // QM 8.1–8.4
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.022, idealMax: 1.025 }, // QM 1.020–1.025; Thai trial 32–33 ppt
  gh: null,
  kh: { min: 7, max: 12 },        // QM dKH 8–12

  flowPreference: 'moderate',
  lightPreference: 'moderate',    // QM "medium"; nocturnal, so dim caves matter more than the light level
  diet: 'carnivore',
  foods: ['pellet_large', 'mysis'], // today: Frozen Krill & Silversides (chopped clam) + mysis for young. Add 'squid', 'shellfish', 'whole_fish' if those tags are made
  feedingStyle: 'target_fed',     // slow to find food; tongs or feeding stick (Top Shelf, QM Shark Eggs II)
  feedingSpeed: 0.4,              // lunges when food is close (Michael 2001) but finds food by smell, slowly
  feedingAggression: 0.45,
  hungerHours: 48,                // public-aquarium broodstock fed 2–3×/week (Choosri 2023: 2×/week)

  activityZone: ['bottom', 'decor'],
  temperament: 'predatory',
  territoriality: 0.35,           // returns to the same refuge day after day (Hövel 2010)
  aggression: 0.35,               // Michael 2004: may attack tankmates larger than it can eat
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.02,
    note: 'Fine alone. Cologne kept 1 male with 3 females in ~5,000 L; wild ones sometimes share a refuge. One adult per ~500 gallons.' },
  sameSpeciesRule: { maleMale: 'tension', femaleFemale: 'ok', mixed: 'courtship_ok', juvenile: 'ok',
    note: 'Groups live together in big public tanks (Cologne 1.3). Two males compete for refuges and females.' },

  predatorTags: ['crustacean', 'shrimp_large', 'shrimp_dwarf', 'shrimp_fry', 'worm', 'fish_tiny', 'fish_small', 'fish_benthic', 'fry', 'eggs', 'egg_case'],
  preyTags: ['fish_large', 'fish_benthic', 'benthic_shark'], // benthic_shark = new tag: picked at by triggers, puffers, large angels
  maxLikelyPreySizeCm: 8,         // heuristic: small mouth, about 11% of TL (no measured gape)

  shrimpSafe: 'unsafe',
  snailSafe: 'mostly_safe',
  frySafe: 'unsafe',
  plantSafe: 'mostly_safe',
  reefSafe: 'caution',            // corals are left alone; crustaceans are eaten; it shoves loose rock
  coralRisk: 0.1,
  anemoneRelationship: 'neutral',

  hidesNeeded: 3,                 // "deep hiding places" (Hövel 2010)
  coverPreference: 0.4,
  substrateRules: { preferred: ['fine_sand', 'sand', 'aragonite'], avoid: ['gravel', 'fine_gravel', 'large_pebbles'],
    note: 'Soft sand only: coarse grit scratches the belly and gets infected (LiveAquaria, Top Shelf). Rockwork must sit on the tank floor and be stable (QM).' },

  breeding: {
    system: 'egg_case',           // NEW system (spec in Cross-species notes)
    difficulty: 0.65,             // bred at Cologne, Liège, NUPEC, Burapha; no home-aquarium reports found
    maturityDays: 25,             // cap; real age at maturity undocumented (several years)
    clutchSize: { min: 1, max: 2 }, // one capsule per oviduct (FishBase); laid in pairs (Wikipedia/Hövel)
    incubationHours: 960,         // 120 real days × 8 (range: 76 d at 25 °C Thai trial; 4–6 months at 26 °C Cologne)
    fryRearingHours: 56,          // hatchlings may take ~a week to eat (QM Shark Eggs II) → 7 × 8
    cooldownDays: 5,              // laying interval undocumented; NUPEC female laid 19 capsules over ~2 years (incomplete count)
    conditions: { minTempC: 24, maxTempC: 28, needsPartner: true, needsCover: true, minTankGallons: 500 },
    predationWithoutNursery: 0.5, // Osaka Kaiyukan: about half of bamboo-shark eggs eaten by other fish in a mixed tank
    nurseryRequired: false,
    maxRaisedPerClutch: 2,
    notes: 'Females lay 1–2 leathery capsules (5–8 cm, two pinched "waists", short tendrils) loose on the sand at night. No parental care. Hatches after ~4 months as a 10 cm barred miniature; adult spots by about 3 months old.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  lifecycle: { juvenileDays: 22, adultDays: 25, lifespanDays: 500, sexVisibleAtDays: 10, hatchSizeCm: 10 },
  // 20 yr in captivity (Michael 2004) → cap. Hatchlings 9.2 cm (Thai) / 10–13 cm (Hövel). Claspers tiny in young males, long at maturity.

  hardiness: 0.7,                 // "hardy" (Michael 2004 via Wikipedia); copper and stray-voltage sensitive
  difficulty: 'advanced',
  baseValue: 300,                 // US from $177 (aquariumfish.com); CA$500; £250; "Marble shark" $601
  rarity: 'rare',
  visitorAppeal: 0.9,
  captiveBredAvailable: false,    // zoo-bred young go to other zoos (Hövel); trade stock is wild-caught
  wildCaughtNote: 'Wild-collected in Southeast Asia. Indonesian fish may be a look-alike catshark (A. erdmanni or A. baliensis).',
  conservation: { status: 'Near Threatened (IUCN Red List, assessed 2020)',
    note: 'Caught as bycatch by reef fishers in eastern Indonesia and harmed by blast fishing and coral mining; may qualify as Vulnerable (IUCN via Wikipedia).' },

  behaviorSet: 'benthic_shark',   // NEW; closest existing 'grouper' (cave lurk + ambush), but it rests ON the floor
  behaviorTraits: { cruiseSpeed: 0.35, burstSpeed: 3.5, turnRate: 2.4, hoverTendency: 0, schoolingTightness: 0,
    restOnBottom: 0.85, hitching: 0, burrowing: 0.05, glassSurfing: 0.03, curiosity: 0.3, nocturnal: 0.85, pickRadiusMul: 1.4 },
  // speeds and turn rates are game estimates (no published kinematics); nocturnal/crepuscular per Hövel 2010
  specialBehaviors: ['crevice_rest', 'same_refuge_return', 'dusk_patrol', 'still_lunge', 'eel_glide', 'tong_feed_learned'],

  special: { escapeArtist: true, medicationSensitive: true, outgrowsSmallTanks: true, heavyWaste: true, needsSinkingFood: true,
    /* proposed */ electricalSensitive: true, needsIodineSupplement: true, knocksDecor: true, nitrateSensitive: true },
  visualLane: 'fish',
}
```
**Genetics.** No named forms in the hobby. The pattern is "highly variable" between individuals (Michael 1993 and Last et al. 2010, via Wikipedia), which is individual variation, not a trade form. Use the generic `intensityLocus` and `intensityOverlay` ("Richly coloured": crisper black and white spots). No hybrids or designer forms are left out, because none exist.

**baseVisual (wild adult):**
```ts
{ bodyColor: '#5f5a54', bodyColor2: '#46423d', bellyColor: '#ece8e0', finColor: '#57524c', finColor2: '#f3f1ec',
  accentColor: '#151413', eyeColor: '#c9b98a', pattern: 'speckled', patternScale: 0.6, patternContrast: 0.85,
  patternSeed: 0, iridescence: 0, metallic: 0, translucency: 0, finType: 'shark_benthic', finLength: 1, bodyDepth: 0.85, gillFullness: 0 }
// finType 'shark_benthic' is new. Art needs a second spot colour (white #f3f1ec) mixed with the black accent spots.
```

### Young and sexes
- **Adult:** very slender, cylindrical eel-like shark with a short head and two backward-raked dorsal fins set far back.
  - Grey to grey-brown, covered in many small **black and white spots** that often merge into short horizontal dashes.
  - **No dark saddles** (that separates it from the Australian marbled catshark).
  - **White tips on both dorsal fins**, a **white bar through the gill slits** and a plain white belly (Michael 1993, Last et al. 2010, via Wikipedia).
- **Hatchling:** contrasting **light and dark vertical bars**, sometimes with black and white dots, changing to the adult spotting **by about 3 months** (Hövel 2010 via Wikipedia). The late embryo already shows the "striped pattern" at days 70–75 (Choosri 2023).
  - In game terms, the bars last only a few game days: draw them for the first ~10% of growth.
- **Sexes:** the same colour. Adult males have **thin claspers** reaching about two-thirds of the way from the pelvic to the anal fin (Compagno 1984 via Wikipedia). Young males have tiny claspers that are hard to see except up close (MarAlliance, *via search index*).
  - Females mature at 49–57 cm, males at 47–62 cm, so there is no reliable size difference.
  - Art: draw claspers from maturity. The card can reveal a young shark's sex on close inspection from `sexVisibleAtDays`.

### Behaviour
- **Day:** wedged in a crevice or under an overhang, alone or with others, and it **returns to the same refuge on successive days** (Hövel 2010). It lies flat on the sand with gills pumping.
- **Activity:** mainly **crepuscular and nocturnal**. Foraging starts in the afternoon and ends before sunrise (Hövel 2010).
- **Moving:** slow, sinuous, eel-like gliding along the floor and through narrow gaps in rock (an elongated body for small reef spaces). It **does not fin-walk** like the epaulette (Michael 1993). It rarely leaves the bottom third.
- **Hunting:** **lies still and lunges** at prey that comes within range (Michael 2001). In the tank it learns to take food from tongs.
- **Signature AI moments:** squeezing into a too-small cave head first; a dusk "wake-up" patrol of the tank floor; a sudden short lunge at food dropped near its head.
- **Jumping and escape:** a forum thread asks "are coral catsharks jumpers?" and reports jumps when startled *(Tier 3, via search index)*. It needs a tight lid.

### Compatibility
See the **shared matrix** after the three species. Points specific to this species:
- It is the **most aggressive of the three** toward larger tankmates (Michael 2004). Raise its verdict against the other two sharks.
- It is **smaller** (70 cm), so a panther grouper or miniatus grouper can make a meal of a young one (hatchling 10 cm).
- Snails and sea stars are safer with it than with the other two: there is no record of shell-crushing, and its teeth are not the crushing kind.

### Smallest tank tier for an adult
**500 gal (120 × 36 × 27 in).**
- Hövel's "at least 3 m long" needs 118 in, which rules out the 96 in tiers (240 and 300 gal).
- The 24 in width of the 240 and 300 gal tiers is also narrower than the adult's 27.6 in length.
- 600 gal is the same footprint (taller); 800 and 1,000 gal are better.

---

## Epaulette shark
*Hemiscyllium ocellatum* (Bonnaterre, 1788), family **Hemiscylliidae**, order Orectolobiformes (carpet sharks).
- The name is valid (FishBase, Fishes of Australia). LiveAquaria's "family Orectolobidae" is outdated.
- Fishes of Australia now treats it as **endemic to the Great Barrier Reef**. New Guinea and Indonesian "epaulettes" in the trade are often other *Hemiscyllium* species (FishBase still lists New Guinea; IUCN treated a separate New Guinea population).
- Australian-origin and captive-bred (ORA) fish are the true species.
- Other names: blind shark, itar shark (Quality Marine, Fishes of Australia).
- Proposed behaviour set `benthic_shark` (fin-walking variant).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Hemiscyllium-ocellatum.html) | 1 | **107 cm TL max**; Lm 60 cm; 0–50 m; shallow reefs and **tide pools**; mainly benthic invertebrates; oviparous, **paired eggs**; male **bites the female's body and gills** to hold her; survives low oxygen by switching off non-essential brain functions; "survives well in aquariums"; **IUCN LC (2015)** |
| [Fishes of Australia](https://fishesofaustralia.net.au/home/species/1973) | 1 | GBR endemic; 1–40 m; lagoons and reef flats; seen at night or on low spring tides; shelters in tide pools and under rocks; tolerates low O₂ and high CO₂ (Heinrich et al. 2014); **two capsules at a time, Aug–Dec, laid among coral at night, about every 14 days**; **hatch after ~120 d at 14–16 cm** |
| [Florida Museum](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/hemiscyllium-ocellatum/) | 1 | adult cream/brown with small widely spaced dark spots and **two large white-ringed black spots above the pectorals**; **juveniles have dark saddles forming crossbands that fade into spots**; slow growth, then **~5 cm/yr after 3 months**; males mature at 54 cm, females at 62 cm; suction feeds; **pushes its snout into sand and thrashes** for buried prey; adults eat more crabs and shrimp, juveniles more worms and fish; capsules 9 × 3.5 cm under coral heads; ~120 d; hatchlings 14–16 cm; **walks** with pectoral and pelvic fins; **~3.5 h in hypoxia**; **predators include sharks and groupers** |
| [Aquarium of the Pacific](https://www.aquariumofpacific.org/onlinelearningcenter/species/epaulette_shark) | 1 | typical **70–90 cm**; juveniles have alternating light and dark bands across body and fins that break up with age; rests under ledges and in crevices; **not territorial**; approachable; salamander-like walk; rheotaxis; **two eggs per event, up to 50 a year, attached to coral or rock by fibrous strands**; ~120 d; pups ~15 cm; females mature at 64 cm, males at 60 cm; **lifespan 20–25 yr**; breeds readily in aquaria |
| [Wheeler et al. 2021, *Sci. Rep.* 11:454](https://researchonline.jcu.edu.au/66857/1/66857.pdf) (full text read; New England Aquarium) | 1 | eggs from one long-term NEAq breeding pair; **incubation 125 ± 5 d at 27 °C, 110 ± 7 at 29 °C, 101 ± 7 at 31 °C**; 31 °C hatchlings 2.6 g lighter, weaker; 31 °C is near the **pejus** temperature; at 32 °C only 37.5% survived to hatch (cited study); **25 of 27 hatched in the dark**; external yolk gone ~118 d (27 °C), with an internal reserve after; eggs **candled 2–3×/week**; "embryos **cease movement** when there is a perceived external threat"; neonates fed **minced shrimp and clam daily**, PVC pipe shelters; egg cases **suspended mid-water**; nitrate 3–6 mg/L in the rearing systems |
| [Wheeler et al. 2025, *Biol. Open* 14: bio062076](https://journals.biologists.com/bio/article/doi/10.1242/bio.062076) | 1 | five females **each housed alone** in 1,000 L tanks laid **196 egg cases over 98 cycles** (Mar 2020–Jan 2022), so females lay without a male; **cycle 19 ± 5.7 d at 25 °C** (16–30 d); the two cases 1.7 ± 1.7 d apart (0–2 nights); median **2 cases per cycle**, sometimes 1 + an empty "wind" case or 3; fed **2% body mass 3×/week** (prawn, pilchard); they skip 35% of meals within 2 days of laying |
| Payne 2012, *Zoo Biology* 31: 718–724 *(abstract via search index)* | 1 | egg cases and hatchlings held in **floating baskets** in a 1,306 L tank at 24.4–25.5 °C; **56 cases → 27 hatched, 22 survived**; gestation **~140 d (134–148)**; hatchlings **16.2 cm, 19.9 g**; accepted **finely chopped capelin with a multivitamin**; success came from low stress, an easy-to-eat diet, vitamins and water quality |
| [Porter et al. 2022, *Integr. Comp. Biol.*](https://researchonline.jcu.edu.au/75954/) and [FAU news](https://www.fau.edu/newsdesk/articles/walking-shark-study) | 1 | three gaits: **slow-to-medium walking, fast walking, swimming**; walks **in and out of water**; neonate and juvenile kinematics the same; survives **2 h of anoxia** |
| [Wikipedia: Epaulette shark](https://en.wikipedia.org/wiki/Epaulette_shark) | 3 | carries IUCN 2015 (mating Jul–Dec in the wild, **continuous in captivity**; capsules **two, rarely four**; 20–50 eggs/yr; ~10 × 4 cm; **120–130 d**; both sexes mature at 54–64 cm and at least 7 years old). Also: Goto et al. 1999 and Pridmore 1995 (walking); Martin/ReefQuest (crawls out of the water between tide pools; **chews food 5–10 min**); Compagno 2002 (expels sand through the gills); Michael 2004 ("the best shark for the home aquarium"; **breeds in tanks as small as 135 gal**, adults need ≥ 180 gal; eats other fish) |
| [LiveAquaria: Australian Epaulette Shark](https://www.liveaquaria.com/products/australian-epaulette-shark) | 2 | Expert Only; **360 gal min**; max 42 in; 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025; sand only (coarse grit scratches the abdomen, causing infection); start on cleaned squid or live shrimp, then shrimp, scallop, marine fish; eats invertebrates and **small sleeping fish**; **never copper**; **$895.99** (10–18 in and 18–28 in, sold out) |
| [Quality Marine: Epaulette](https://www.qualitymarine.com/quality-marine/fish/sharks/hemiscyllium/epaulette-29003/) | 2 | almost 42 in; **300 gal min**; 72–78 °F; **deep fine sand**; stable rockwork with caves; **sensitive to electric impulses and copper**; nocturnal; two colour "morphs": golden with small dark spots and a distinct black spot, tan with fewer large spots and a faded black spot |
| [Top Shelf Aquatics](https://topshelfaquatics.com/pages/saltwater-fish/epaulette-shark) | 2 | ≥ 200 gal (published range 180–360); **"bottom area matters far more than height"**; it digs under rockwork, and unstable rock can collapse on it; strong filtration and skimming; never copper; **eliminate stray current** by grounding; bite-size shrimp, squid, scallop, clam, fish, mysis **several times a week**, from a feeding stick or on the bottom; **avoid large triggers, puffers, butterflyfish, angelfish and certain wrasses (pick at the shark); large morays and frogfish threaten small sharks**; eats ornamental shrimp, crabs and small sleeping fish; **sessile corals generally left alone**; mature males attack other males and harass females |
| [ORA (2016)](https://orafarm.com/?p=7600) | 2 | **captive-bred pups sold since Nov 2016**; adults max 32 in; **≥ 200 gal**; expert only; an easy diet with **multivitamins**; ORA broodstock eat **vitamin-enriched squid and shrimp 3×/week** in a 15 × 25 ft raceway; parents took years to mature |
| [PetMD (Dr Jessie Sanders, DVM)](https://www.petmd.com/fish/top-saltwater-shark-species-aquariums) | 2 | **≥ 350 gal per individual**; small, preferably **single-sex groups** possible; shark vitamin/mineral supplements; **20–25 yr** |
| [Wonders of Wildlife (2026)](https://wondersofwildlife.org/2026/from-egg-to-hatchling-epaulette-sharks/) | 1 | **slits form in the case** to let water circulate; the embryo **fans its tail** to move water over its gills; New England Aquarium's **100th hatchling**; juveniles spend 12–18 months in nursery habitats |
| reefs.com epaulette article *(403; via search index)* | 2 | adults occasionally eat the eggs, **males more than females**, so incubate eggs in a separate tank |
| [aquariumfish.com](https://aquariumfish.com/collections/sharks) | 2 | Epaulette (*H. ocellatum*) **from $1,078**, in stock |

**Modelled as:**
- 90 cm adult (top of the typical 70–90 cm; FishBase max 107), **500 gal**, footprint **108 × 36 in** (3× TL long, width ≥ TL). 1,000 gal is better.
- `egg_case` breeding:
  - 1–2 capsules **anchored by fibres to rock or decor**, laid at night
  - laying cycle 19 d → `cooldownDays 6`
  - **130 real days at ~26 °C → 1,040 game hours**, shortening about 6 real days per °C warmer (Wheeler 2021)
  - a lone female still lays **infertile** cases (Wheeler 2025)
- Walks on its fins, the signature AI behaviour.
- Low tankmate aggression (not territorial, AoP). Male–male "fight" (Top Shelf).
- The most hypoxia-tolerant fish in the game: a candidate for a new `lowOxygenTolerant` trait (FishBase, Fishes of Australia, Florida Museum, FAU).

**Conflicts:**
- **Minimum tank:** 180 gal (Michael 2004), 200 (ORA, Top Shelf, Chewy), 300 (QM), 350 (PetMD), 360 (LiveAquaria). The game uses the 500 gal tier because of the floor footprint. A common 360 gal tank is 96 × 36 in, and the game's only 36 in-wide tiers start at 500 gal.
- **Incubation:** 120 d (Fishes of Australia, Florida Museum, AoP), 120–130 (IUCN), 125 at 27 °C (Wheeler 2021), ~140 at 24.4–25.5 °C (Payne 2012), ~5 months (Wonders of Wildlife). The game uses 130 d at the game's usual 25–26 °C. Payne's 140 d at 25 °C fits Wheeler's ~6 d/°C slope.
- **Laying interval:** ~14 d (Fishes of Australia) against 19 ± 6 d at 25 °C (Wheeler 2025, captive) → ~6 game days.
- **Eggs per year:** "up to 20 young per year" (Florida Museum) against 20–50 eggs (IUCN, AoP). The difference is likely eggs laid against young raised.
- **Range:** FishBase says New Guinea to northern Australia; Fishes of Australia (2022) says GBR endemic. The game says Great Barrier Reef (Australia) and notes the New Guinea look-alikes.
- **Max size:** 107 cm (FishBase) against 32 in (ORA) and 30 in (Chewy) for captives → 90 cm, conservative.

### Proposed game data
```ts
{
  id: 'epaulette_shark',
  commonName: 'Epaulette Shark',
  scientificName: 'Hemiscyllium ocellatum',
  category: 'fish',
  group: 'shark',
  genus: 'Hemiscyllium',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock'], // LiveAquaria "Reef compatible: No"; Top Shelf: dedicated predator system
  nativeRegion: 'Great Barrier Reef, Australia (Cape York to the Capricorn Group); similar epaulettes in New Guinea are other species', // Fishes of Australia
  isStarter: false,

  adultSizeCm: 90,                // AoP typical 70–90 cm; FishBase max 107; captives 30–32 in (Chewy, ORA)
  recommendedMinTankGallons: 500, // footprint below → the 500 gal tier; published 180–360 gal
  recommendedFootprint: { minLengthIn: 108, minWidthIn: 36 }, // ~3× TL long, width ≥ TL (35.4 in); Top Shelf: "bottom area matters"
  activeSwimmer: false,
  bioload: 9,                     // ~1.5–2 kg slender shark; heavy waste (Top Shelf) — estimate

  tempC: { min: 22, max: 30, idealMin: 24, idealMax: 28 }, // LA/QM 72–78 °F; Chewy 75–82 °F; Wheeler: 27 °C = current summer, 31 °C ≈ pejus
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.022, idealMax: 1.025 }, // LA 1.020–1.025; Wheeler 32–33 ppt
  gh: null,
  kh: { min: 7, max: 12 },        // LA dKH 8–12

  flowPreference: 'moderate',     // perches facing into the current (rheotaxis, AoP)
  lightPreference: 'moderate',    // QM medium; nocturnal
  diet: 'carnivore',
  foods: ['pellet_large', 'mysis'], // + 'squid', 'shellfish', 'whole_fish' when added (LA: squid, shrimp, scallop, fish)
  feedingStyle: 'target_fed',     // feeding stick or on the bottom (Top Shelf); slow, finds food by smell and electroreception
  feedingSpeed: 0.3,
  feedingAggression: 0.3,
  hungerHours: 48,                // 2% body mass 3×/week (Wheeler 2025); ORA 3×/week; Top Shelf "several times a week"

  activityZone: ['bottom', 'substrate', 'decor'],
  temperament: 'predatory',       // to crustaceans, worms, small fish; harmless to larger fish
  territoriality: 0.15,           // "not territorial" (AoP)
  aggression: 0.15,
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.02,
    note: 'Fine alone. Small single-sex groups work in big tanks (PetMD); mature males fight and harass females (Top Shelf).' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'ok', mixed: 'courtship_ok', juvenile: 'ok',
    note: 'Mating is rough: the male grips the female by a pectoral fin or the gill area with his mouth (FishBase, AoP), leaving bite marks.' },

  predatorTags: ['crustacean', 'shrimp_large', 'shrimp_dwarf', 'shrimp_fry', 'worm', 'snail_small', 'fish_tiny', 'fish_small', 'fish_benthic', 'fry', 'eggs', 'egg_case'],
  // Wild diet >90% polychaetes and crabs (ReefQuest via Wikipedia); teeth flatten to crush hard prey (Florida Museum via Wikipedia)
  preyTags: ['fish_large', 'fish_benthic', 'benthic_shark'],
  maxLikelyPreySizeCm: 7,         // heuristic: small mouth (Top Shelf); "small sleeping fish" (LA)

  shrimpSafe: 'unsafe',
  snailSafe: 'caution',
  frySafe: 'unsafe',
  plantSafe: 'mostly_safe',
  reefSafe: 'caution',            // corals left alone (Top Shelf); crustaceans eaten; digs under rock
  coralRisk: 0.1,
  anemoneRelationship: 'neutral',

  hidesNeeded: 2,
  coverPreference: 0.35,          // open sand to walk on plus ledges to rest under
  substrateRules: { preferred: ['fine_sand', 'sand', 'aragonite'], avoid: ['gravel', 'fine_gravel', 'large_pebbles'],
    note: 'Deep, fine sand (QM): it roots in the sand for prey and coarse grit cuts its belly (LA). Rock must rest on the glass, not the sand, because it digs under it (Top Shelf).' },

  breeding: {
    system: 'egg_case',
    difficulty: 0.55,             // breeds readily in aquaria (AoP; Michael 2004: even in 135 gal); ORA commercial
    maturityDays: 25,             // cap; real: at least 7 years (IUCN via Wikipedia), "several years" (ORA)
    clutchSize: { min: 1, max: 2 }, // median 2 per cycle, rarely 3–4 (Wheeler 2025; IUCN via Wikipedia)
    incubationHours: 1040,        // 130 d × 8 at ~26 °C; 125 d at 27 °C, 101 d at 31 °C (Wheeler 2021); 140 d at 25 °C (Payne 2012)
    fryRearingHours: 56,          // internal yolk carries the neonate about a week (Wheeler 2021; QM Shark Eggs II)
    cooldownDays: 6,              // cycle 19 ± 6 d at 25 °C (Wheeler 2025); ~14 d (FoA) → ~6 game days
    conditions: { minTempC: 24, maxTempC: 29, needsPartner: true, needsCover: true, minTankGallons: 500 },
    predationWithoutNursery: 0.5, // eggs eaten by adults (esp. males; reefs.com) and other fish (Osaka: ~half)
    nurseryRequired: false,
    maxRaisedPerClutch: 2,
    notes: 'Lays two leathery cases (~10 × 4 cm) at night, tied to rock or coral by sticky fibres, every two to three weeks; a lone female lays infertile ones. No parental care. Hatches after ~4 months as a 15 cm banded pup that lives on its yolk for about a week.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  lifecycle: { juvenileDays: 22, adultDays: 25, lifespanDays: 500, sexVisibleAtDays: 10, hatchSizeCm: 15 },
  // 20–25 yr (AoP, PetMD) → cap; hatchlings 14–16 cm (FoA, Florida Museum), 16.2 cm (Payne)

  hardiness: 0.75,                // very hypoxia-tolerant; but copper, stray voltage, goitre
  difficulty: 'expert',           // LiveAquaria and ORA: expert only
  baseValue: 900,                 // LiveAquaria $895.99; aquariumfish.com from $1,078
  rarity: 'very_rare',
  visitorAppeal: 0.98,            // the walking shark
  captiveBredAvailable: true,     // ORA pups since 2016
  wildCaughtNote: 'Australian wild fish are collected under licence in small numbers; ORA sells captive-bred pups.',
  conservation: { status: 'Least Concern (IUCN Red List, assessed 2015)',
    note: 'Common on the Great Barrier Reef, much of it in marine parks; few are taken for aquaria (Fishes of Australia, Florida Museum). Warming seas shorten incubation and produce weaker pups (Wheeler 2021).' },

  behaviorSet: 'benthic_shark',
  behaviorTraits: { cruiseSpeed: 0.3, burstSpeed: 3, turnRate: 2.6, hoverTendency: 0, schoolingTightness: 0,
    restOnBottom: 0.9, hitching: 0, burrowing: 0.15, glassSurfing: 0.03, curiosity: 0.5, nocturnal: 0.8, pickRadiusMul: 1.6 },
  // game estimates; walking is slower than swimming (Porter 2022); "show little fear of people" (Compagno via Wikipedia)
  specialBehaviors: ['fin_walk', 'rest_on_floor', 'ledge_rest', 'night_patrol', 'snout_root', 'suction_strike', 'sand_expel', 'slow_chew', 'rheotaxis_perch', 'tong_feed_learned'],

  special: { escapeArtist: true, medicationSensitive: true, outgrowsSmallTanks: true, heavyWaste: true, needsSinkingFood: true,
    /* proposed */ electricalSensitive: true, needsIodineSupplement: true, knocksDecor: true, nitrateSensitive: true, lowOxygenTolerant: true },
  visualLane: 'fish',
}
```
**Genetics.**
- Quality Marine describes **"golden"** (small dark spots, a distinct black ocellus) and **"tan"** (fewer, larger spots, a faded ocellus) colour types. Their inheritance is **undocumented**: it may be locality or age, and no source shows them breeding true. Do not make a locus for them.
- Use the generic `intensityLocus` and "Richly coloured" overlay: a brighter cream-gold ground and a crisper ocellus. If the owner wants the QM names, they need his approval as a natural-variation label (ADR-0052 decision 2).
- No hybrids or designer forms are left out; none found.

**baseVisual (wild adult):**
```ts
{ bodyColor: '#d6bf95', bodyColor2: '#c2a473', bellyColor: '#f2e8d2', finColor: '#cbb086', finColor2: '#b59866',
  accentColor: '#4b3424', eyeColor: '#d8c27a', pattern: 'spots', patternScale: 0.7, patternContrast: 0.75,
  patternSeed: 0, iridescence: 0, metallic: 0, translucency: 0, finType: 'shark_benthic', finLength: 1, bodyDepth: 0.85,
  gillFullness: 0, bodyMark: 'epaulette' }
// bodyMark 'epaulette' (new value): a large black spot ringed in white just above and behind each pectoral fin.
```

### Young and sexes
- **Adult:** slender body; the **tail stalk is over half the body length**; short rounded snout with small nasal barbels; **paddle-shaped pectoral and pelvic fins** (the legs); two similar dorsal fins set far back (AoP).
  - Cream to beige-brown with widely spaced dark brown spots and faint darker bands.
  - The **"epaulette"**: a big black spot ringed in white above each pectoral fin (Florida Museum, AoP, Fishes of Australia).
- **Juvenile:** dark brown **saddles that extend as crossbands** over the back and tail, on body and fins, which **break up into spots** as it grows (Florida Museum, AoP). Hatchlings show "spots and bands" (Wonders of Wildlife).
  - Art: banded until about half adult size, then blend into spots. Whether the shoulder ocellus is present at hatching is not stated in my sources; photos suggest it is, but that is **unverified**.
- **Sexes:** the same colour. Females mature slightly larger (62–64 cm against 54–60 cm: Florida Museum, AoP).
  - Mature males have long claspers.
  - Mated females may show mouth-shaped bite scars on the pectoral fins or gill area (FishBase).

### Behaviour
- **Walking (the signature):** it bends its body like a salamander and pushes with its paddle-shaped paired fins across sand, rubble and coral. It often walks even where it could swim (Goto et al. 1999 and Pridmore 1995 via Wikipedia; AoP).
  - Gaits: slow-to-medium walk, fast walk, and an eel-like swim for bursts (Porter 2022).
  - It walks **out of water** between tide pools (FAU; ReefQuest via Wikipedia).
  - AI: mostly walk with fin "steps" visible; swim only to cross open water or flee.
- **Resting:** long periods still under ledges and in crevices by day (AoP). Sometimes **perches facing into the current** (rheotaxis: AoP, Peach 2002).
- **Night:** most active at night and at dusk and dawn (Fishes of Australia, Florida Museum). Feeding peaks at dawn and dusk.
- **Feeding:**
  - **Pushes its snout into sand and thrashes** to flush buried prey (Florida Museum).
  - **Suction-feeds** by expanding its mouth cavity (Florida Museum, AoP).
  - Sometimes blows sand out of its gill slits while swallowing (Compagno via Wikipedia).
  - May **chew for 5–10 minutes**, unusual for a shark (ReefQuest via Wikipedia; Tier 3).
  - Learns to take food from tongs.
- **Low oxygen:** survives hours of very low oxygen and 2 h of anoxia (FishBase, Florida Museum 3.5 h, FAU).
  - Game idea: it shrugs off an aeration failure that stresses its tankmates. Needs a new `lowOxygenTolerant` flag (owner call).
- **Temperament:** approachable, shows little fear of divers (Compagno via Wikipedia, AoP).
- **Escape:** walks out of water in the wild, so it needs a tight lid. No aquarium escape report specific to epaulettes was found.

### Compatibility
See the **shared matrix**. Specific to the epaulette:
- **Crushing teeth** (Florida Museum via Wikipedia), so it is a real risk to small snails and possibly urchins.
- **Mature males eat egg cases** more than females (reefs.com, via search index).
- Lowest aggression of the three toward larger fish.

### Smallest tank tier for an adult
**500 gal (120 × 36 in)** for a typical 70–90 cm adult. The 36 in width just exceeds its 35.4 in length.
- 240 and 300 gal (96 × 24) are too narrow; 600 gal is the same footprint.
- **1,000 gal (144 × 48)** is the honest comfortable size for a large (100 cm) adult or a pair.
- By the hobby rule of thumb (width 1.5× TL, Tier 3) an adult would need ~53 in, beyond every tier. Tell the owner that 500 gal is the bare minimum, not the ideal.

---

## Brown-banded bamboo shark
*Chiloscyllium punctatum* Müller & Henle, 1838, family **Hemiscylliidae** (carpet sharks; not a true catshark despite the trade name).
- The name is valid (FishBase, Fishes of Australia). Fishes of Australia's preferred common name is **grey carpetshark**.
- Trade names: banded cat shark, brown-banded cat shark, black-banded cat shark (juveniles).
- Similar *Chiloscyllium* (*C. griseum*, *C. hasseltii*, *C. plagiosum*) appear in the trade under overlapping names.
- Proposed behaviour set `benthic_shark` (ledge-lying variant).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Chiloscyllium-punctatum.html) | 1 | **132 cm TL max**; Lm 87 cm; 0–85 m; inshore reefs, **tide pools**; bottom invertebrates and small fish; **paired eggs** in rounded cases; embryos feed on yolk; **survives up to 12 h out of water**; **IUCN NT (assessed 19 Sep 2023)** |
| [Fishes of Australia](https://fishesofaustralia.net.au/home/species/3264) | 1 | max ~1.2 m; **juveniles to ~30 cm broadly banded with ~10 dark wavy bands on a pale ground, sometimes peppered with dark spots**; large adults plain brownish to greyish with a pale belly; hatch at **13–17 cm** after **~5 months**; capsules **~11 × 5 cm**; males mature at 68–76 cm, females at ~63 cm; crabs, polychaetes, shrimp, small fish; camouflaged juveniles shelter in crevices and coral; threatened by the display-aquarium trade |
| [Florida Museum](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/chiloscyllium-punctatum/) | 1 | juveniles dark transverse bands and spots on medium brown; adults light brown, no pattern; max 104 cm; **life expectancy ~25 yr**; nocturnal, **digs through sediment**; paired eggs on the seafloor; incubation in captivity **up to 4 months**; hatchlings 13–17 cm; tolerates **hypoxia for long periods**; small ones hide in crevices; **breeds readily in captivity** |
| [Onimaru et al. 2018, *Dev. Dyn.*](https://pmc.ncbi.nlm.nih.gov/articles/PMC5947634) (Osaka Kaiyukan) | 1 | 10 males and 11 females in the Pacific Ocean tank (23 °C) **lay constantly, year-round**; **about half the eggs are eaten by other fish**; ~⅓ develop abnormally; capsule ~12 × 6 cm; staging at 25 °C: **movement ~12 dpd**, gill buds ~22, gill filaments ~30, eye pigment 38, **tail stripes 66, eight bands 73**, external gills gone by 80, yolk shrinking 104, **hatch ~118 d** |
| Harahush, Fischer & Collin 2007, *J. Fish Biol.* 71: 1007–1022 *(abstract via search index)* | 1 | 6 females at UnderWater World, Mooloolaba: **692 eggs (228 viable) Jul 2004–Feb 2006**; season late July–February; embryo visible to the naked eye at ~18 dpd; **hatch at a mean 153 dpd at 21–25 °C**; **21.4% hatched** |
| [Kempster, Hart & Collin 2013, *PLoS ONE* 8: e52551](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0052551) | 1 | eggs from captive-bred adults (Underwater World, Daydream Island); case sealed early on; in pre-hatching stages **the seals open and the embryo undulates its tail to pump seawater** through; late embryos **freeze** (stop gill movements, **coil the tail around the body**) for ~19–59 s when they sense predator-like electric fields; up to 5 months in the case |
| [Fahmi et al. 2021, *J. Fish Biol.*](https://pubmed.ncbi.nlm.nih.gov/33977550/) | 1 | 330 wild Indonesian sharks: grows **up to 18 cm/yr**; max ~1 m; **maturity ~6.5 yr**; max age **14 yr** (wild) |
| [Wheaton et al. 2025, *Front. Vet. Sci.*](https://frontiersin.org/articles/10.3389/fvets.2025.1504527/full) | 1 | aquarium brown-banded and white-spotted bamboo sharks; **goitre is the commonest thyroid disease**; causes: low iodine in food or water, ozone, **high nitrate**; **bamboo sharks developed goitres 2 months after supplements were withdrawn**; fed capelin, clam, shrimp, herring, smelt with **shark/ray vitamin tablets (1 per ½ lb of fish)**; too much iodine is also harmful |
| Morris et al. 2011, *J. Aquat. Anim. Health* 23: 92–99 *(abstract via search index)* | 1 | juvenile white-spotted bamboo sharks at **NO₃-N 70 mg/L (~310 mg/L nitrate)** for ~30 days developed thyroid hyperplasia; **nitrate causes goitre** |
| [Feldheim et al. 2010, *J. Heredity*, via phys.org](https://phys.org/news/2010-01-shark-virgin-birth-offspring-survive.pdf) | 1 | **parthenogenesis** in a **white-spotted** bamboo shark (*C. plagiosum*) at Belle Isle Aquarium, Detroit; two daughters **alive after 5+ years**; "half-clones" |
| [Bernal et al. 2015 via Science News](https://www.sciencenews.org/blog/wild-things/paternity-test-reveals-father%E2%80%99s-role-mystery-shark-birth) and [KPBS/NPR 2025](https://www.kpbs.org/news/science-technology/2025/01/28/this-shark-pup-was-born-in-a-habitat-without-any-males-how-did-that-happen) | 1 | a **brown-banded** pup hatched in Jan 2012 at the Steinhart Aquarium (San Francisco) in an all-female tank. **DNA showed a father**, so this was **sperm storage for at least 45 months**, not parthenogenesis. Parthenogenesis is documented in white-spotted bamboo and zebra sharks in several aquariums |
| [Wikipedia: Brownbanded bamboo shark](https://en.wikipedia.org/wiki/Brownbanded_bamboo_shark) | 3 | juveniles banded, adults patternless (Compagno 2002); **feed 2–3×/week**, bite-size meals or it regurgitates; **iodine supplements prevent goitre**; items must be stable, since it **knocks over unstable decor**; **no triggers or puffers (they nip its fins)**; 25 yr in public aquaria; IUCN NT (Rigby et al. 2024) |
| [LiveAquaria (Diver's Den)](https://www.liveaquaria.com/products/cat-shark-brown-banded-expert-only-6-25-wysiwyg) | 2 | Expert Only; **360 gal min**; max 42 in; 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025; cream with broad dark stripes, **larger ones develop muted brown spots between the stripes**; sand only; **never copper**; start on squid or live shrimp; ideal foods **whole cockle in the shell**, fresh shrimp and squid, frozen mussel; **"will eat any crustacean"**; **$199.99 for 6.25 in** |
| [Quality Marine: Banded Cat Shark](https://www.qualitymarine.com/quality-marine/fish/sharks/chiloscyllium/banded-cat-29001/) and [Shark Eggs Part II](https://www.qualitymarine.com/news/shark-eggs-part-ii/) | 2 | almost 37 in; **300 gal min**; **sensitive to electric impulses and copper**; stable rockwork with caves. Eggs: **2–4 every two weeks, up to ~50 a year**; ~4 × 1.5 in; ≥ 4 months; hatchlings 5–6 in; place the egg in **good flow**, **never let air in**; candling (perfect round yolk = good, runny = bad); eggs hatch on their own; **pups may not eat for a week**, then supplemented seafood from **tongs**; **snails and urchins can bore through egg cases** (wild) |
| [Saltwaterfish.com](https://saltwaterfish.com/product-brown-banded-bamboo-shark) | 2 | Expert; **300+ gal**; max 30 in; **$297–571** (sale, by size); fine substrate |
| [Practical Fishkeeping (Blue Reef Aquarium, Newquay)](https://www.practicalfishkeeping.co.uk/fishkeeping-news/public-aquarium-is-inundated-with-pups/) | 2 | 30+ pups in a 50,000 L lagoon; "relatively easy to breed"; **pups black-and-white striped, fading; adults light brown, ~1 m** |
| [Abyss Aquatics (UK)](https://www.abyssaquatics.co.uk/product/bamboo-shark-egg/) and [aquariumfish.com](https://aquariumfish.com/collections/sharks) | 2/3 | **egg cases sold to hobbyists**: £79 (Abyss), **"Banded Shark Eggs" $93.59** (aquariumfish.com); keep eggs in gentle flow **away from tankmates that damage them** (egg trap); hatchlings live on yolk for days, then **small portions 3–4×/day** of mysis, small squid, chopped fish; 75–82 °F; bamboo "Bamboo Shark" **from $281** |
| [Mote Marine Lab](https://mote.org/animal-encyclopedia/brown-banded-bamboo-shark) | 1 | nocturnal; squeezes into crevices; "walks" on its pectorals; eats worms, crustaceans, **echinoderms** (its weight figure of 132 lb is an obvious error and is not used) |

**Modelled as:**
- 105 cm adult (Compagno 104, LiveAquaria 42 in; FishBase's 132 cm is a wild record) → **1,000 gal** and a **124 × 42 in** footprint. 3× TL long, and the width is at least its 41.3 in length. **Only the 1,000 gal tier fits.**
- `egg_case` breeding:
  - pairs of capsules **anchored by sticky white fibres** to decor (Thai paper's citation of Suksuwan & Ubonsuwan 2004) or lying on the floor (Florida Museum)
  - laying weekly in season (Harahush: ~115 eggs per female over two seasons) → `cooldownDays 3`
  - **125 real days at 25–26 °C → 1,000 game hours**
- The heaviest bioload and the biggest prey size of the three.
- Echinoderms, snails and clams are at risk (Mote, LiveAquaria cockles).
- Goitre risk is best documented in *Chiloscyllium* (Wheaton 2025, Morris 2011).

**Conflicts:**
- **Max size:** 104 cm (Compagno, Florida Museum), ~1.2 m (Fishes of Australia), 132 cm (FishBase), 37–42 in (QM, LA), 30 in (Saltwaterfish) → 105 cm.
- **Minimum tank:** 180 gal (Wikipedia's hobby source, Abyss), 300 (QM, Saltwaterfish), 360 (LiveAquaria). Forum keepers call 180–240 gal too small for an adult (via search index). The footprint puts it at 1,000 gal.
- **Incubation:** ~118 d at 25 °C (Onimaru, lab), 153 d at 21–25 °C (Harahush), ~5 months (Fishes of Australia), up to 4 months (Florida Museum), ≥ 4 months (QM) → 125 d.
- **Eggs per laying:** "paired" (FishBase, Florida Museum) against "2–4 every two weeks" (QM, Tier 2) → 1–2, with 2 typical.
- **Lifespan:** 25 yr in aquaria (Florida Museum) against 14 yr in the wild (Fahmi 2021) → the cap either way.
- **Home breeding:** I found **no documented home-aquarium spawning**. The sources show it breeds readily in public aquaria (Florida Museum, Blue Reef, Osaka, UnderWater World, Steinhart) and that **egg cases from those breeders are sold to hobbyists**. Adults need huge tanks, so home spawning is plausible in a 1,000 gal system but unproven. The owner's belief that bamboo sharks breed readily is right for aquaria in general, not shown for homes.
- **Parthenogenesis:** documented in the closely related **white-spotted** bamboo shark (Feldheim 2010), not (in what I found) in the brown-banded. The famous brown-banded "virgin birth" turned out to be 45-month sperm storage (Bernal 2015).

### Proposed game data
```ts
{
  id: 'brownbanded_bamboo_shark',
  commonName: 'Brown-banded Bamboo Shark',
  scientificName: 'Chiloscyllium punctatum',
  category: 'fish',
  group: 'shark',
  genus: 'Chiloscyllium',
  environment: 'marine',
  waterClasses: ['marine_fowlr', 'marine_live_rock'], // LA "Reef compatible: No"; eats all crustaceans
  nativeRegion: 'Indo-West Pacific: India and the Andaman Islands to the Philippines and Japan, south to northern Australia', // FishBase, FoA
  isStarter: false,

  adultSizeCm: 105,               // Compagno 104 cm; LA 42 in; FoA ~1.2 m; FishBase 132 cm record
  recommendedMinTankGallons: 1000, // footprint below fits only the 1,000 gal tier; published 180–360 gal
  recommendedFootprint: { minLengthIn: 124, minWidthIn: 42 }, // 3× TL long; width ≥ TL (41.3 in) to turn
  activeSwimmer: false,
  bioload: 14,                    // thick-bodied metre-long shark, ~3–4 kg — estimate; heaviest of the three
  tempC: { min: 20, max: 29, idealMin: 23, idealMax: 27 }, // LA/QM 72–78 °F; Osaka adults 23 °C; eggs 21–25 °C (Harahush), 25 °C (Onimaru)
  pH: { min: 7.9, max: 8.5, idealMin: 8.1, idealMax: 8.4 },
  salinitySG: { min: 1.02, max: 1.027, idealMin: 1.022, idealMax: 1.025 },
  gh: null,
  kh: { min: 7, max: 12 },

  flowPreference: 'moderate',
  lightPreference: 'moderate',    // QM medium–high; nocturnal, wants shaded ledges
  diet: 'carnivore',
  foods: ['pellet_large', 'mysis'], // + 'squid', 'shellfish' (whole cockle, mussel, scallop: LA), 'whole_fish' when added
  feedingStyle: 'target_fed',
  feedingSpeed: 0.3,
  feedingAggression: 0.35,
  hungerHours: 48,                // 2–3×/week (Wikipedia's hobby source); bite-size or it regurgitates

  activityZone: ['bottom', 'substrate', 'decor'],
  temperament: 'predatory',
  territoriality: 0.2,
  aggression: 0.15,               // "docile, sedentary" (Wikipedia lead); LA/QM list "aggressive" = predatory to small animals
  finNipper: 0,
  hasLongFins: false,
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 1, maxPer10Gallons: 0.01,
    note: 'One adult per ~1,000 gallons at home. Public aquaria keep groups (Osaka: 21 in one huge tank).' },
  sameSpeciesRule: { maleMale: 'tension', femaleFemale: 'ok', mixed: 'courtship_ok', juvenile: 'ok',
    note: 'Groups live peacefully in big public tanks; at home there is no floor space for two adults.' },

  predatorTags: ['crustacean', 'shrimp_large', 'shrimp_dwarf', 'shrimp_fry', 'worm', 'snail', 'snail_small', 'clam', 'starfish', 'fish_tiny', 'fish_small', 'fish_benthic', 'fry', 'eggs', 'egg_case'],
  // FoA/Florida Museum: crabs, worms, shrimp, small fish; Mote: echinoderms; LA: eats whole cockles; "any crustacean"
  preyTags: ['fish_large', 'fish_benthic', 'benthic_shark'],
  maxLikelyPreySizeCm: 10,        // heuristic, ~10% of TL; "small fishes" (FoA)

  shrimpSafe: 'unsafe',
  snailSafe: 'caution',
  frySafe: 'unsafe',
  plantSafe: 'mostly_safe',
  reefSafe: 'caution',
  coralRisk: 0.15,                // strong enough to topple unstable decor (Wikipedia's hobby source)
  anemoneRelationship: 'neutral',

  hidesNeeded: 2,                 // a ledge long enough for a 1 m shark to lie under
  coverPreference: 0.3,
  substrateRules: { preferred: ['fine_sand', 'sand', 'aragonite'], avoid: ['gravel', 'fine_gravel', 'large_pebbles'],
    note: 'Fine sand (LA, QM); it digs through sediment for food (Florida Museum). Rock on the glass and rock-solid: it shoves loose pieces over.' },

  breeding: {
    system: 'egg_case',
    difficulty: 0.6,              // easy in public aquaria; no documented home spawning; egg cases sold to hobbyists
    maturityDays: 25,             // cap; real ~6.5 yr (Fahmi 2021)
    clutchSize: { min: 1, max: 2 }, // paired eggs (FishBase, Florida Museum); QM says 2–4
    incubationHours: 1000,        // 125 d × 8; 118 d at 25 °C (Onimaru), 153 d at 21–25 °C (Harahush)
    fryRearingHours: 56,          // pups may skip food for ~a week (QM; Abyss "yolk for the first few days")
    cooldownDays: 3,              // ~weekly in season (Harahush: 692 eggs / 6 females / 2 seasons); Osaka "constantly"
    conditions: { minTempC: 23, maxTempC: 28, needsPartner: true, needsCover: true, minTankGallons: 1000 },
    predationWithoutNursery: 0.5, // Osaka Kaiyukan: about half eaten by other fish
    nurseryRequired: false,
    maxRaisedPerClutch: 2,
    notes: 'Lays pairs of flat leathery cases (~11 × 5 cm), light brown with sticky white fibres that catch on rock. Only about a fifth to a half hatch even in good aquaria (Harahush 21%, Osaka ~⅔ normal). Hatches after ~4 months as a 15 cm black-and-white banded pup.',
  },
  sexSystem: 'gonochoristic',
  parentalCare: 'none',
  lifecycle: { juvenileDays: 22, adultDays: 25, lifespanDays: 500, sexVisibleAtDays: 10, hatchSizeCm: 15 },
  // 25 yr in aquaria (Florida Museum) → cap; hatch 13–17 cm (FoA, Florida Museum)

  hardiness: 0.8,                 // hardy, survives hours out of water (Florida Museum, FishBase)
  difficulty: 'expert',           // LiveAquaria, Saltwaterfish: expert only (size, not fragility)
  baseValue: 280,                 // LA $199.99 (6.25 in); aquariumfish.com from $281; Saltwaterfish $297–571
  rarity: 'uncommon',
  visitorAppeal: 0.95,
  captiveBredAvailable: true,     // public-aquarium and breeder eggs/pups; eggs $94 (aquariumfish.com), £79 (Abyss)
  wildCaughtNote: 'Both wild-caught juveniles and aquarium-bred eggs and pups are sold. Collection for the aquarium trade is a minor threat, since it breeds readily in captivity (Florida Museum).',
  conservation: { status: 'Near Threatened (IUCN Red List, assessed 2023, published 2024)',
    note: 'Fished for food in India and Thailand and hurt by dynamite and cyanide fishing on reefs (Florida Museum, IUCN via Wikipedia).' },

  behaviorSet: 'benthic_shark',
  behaviorTraits: { cruiseSpeed: 0.25, burstSpeed: 2.5, turnRate: 1.8, hoverTendency: 0, schoolingTightness: 0,
    restOnBottom: 0.95, hitching: 0, burrowing: 0.1, glassSurfing: 0.03, curiosity: 0.35, nocturnal: 0.85, pickRadiusMul: 1.8 },
  specialBehaviors: ['rest_on_floor', 'ledge_lie', 'night_patrol', 'snout_root', 'suction_strike', 'fin_shuffle', 'decor_shove', 'tong_feed_learned'],

  special: { escapeArtist: true, medicationSensitive: true, outgrowsSmallTanks: true, heavyWaste: true, needsSinkingFood: true,
    /* proposed */ electricalSensitive: true, needsIodineSupplement: true, knocksDecor: true, nitrateSensitive: true, lowOxygenTolerant: true },
  visualLane: 'fish',
}
```
**Genetics.**
- No named forms. "Black-banded" in the trade is the banded juvenile, not a form.
- Use the generic `intensityLocus` and "Richly coloured" overlay: deeper, crisper juvenile bands and a warmer adult brown.
- Albino and other sports: none documented in the trade that I found, so none are modelled. No hybrids are left out (none found).

**baseVisual (wild adult):**
```ts
{ bodyColor: '#8b7458', bodyColor2: '#756148', bellyColor: '#ebe2d2', finColor: '#816b51', finColor2: '#6c5940',
  accentColor: '#4d3d2c', eyeColor: '#c8b27c', pattern: 'solid', patternScale: 1, patternContrast: 0.15,
  patternSeed: 0, iridescence: 0, metallic: 0, translucency: 0, finType: 'shark_benthic', finLength: 1, bodyDepth: 0.95, gillFullness: 0 }
// Juvenile (life-stage visual, like the emperor angel's): bodyColor '#e3dccd', accentColor '#211b17',
// pattern 'bands' (~10 dark wavy bands body and tail), patternContrast 0.95, a few dark spots; hatchlings near black-and-white.
```

### Young and sexes
- **Hatchling and juvenile:** pale cream to light brown with **about 10 broad, dark, wavy transverse bands** on body and tail, sometimes peppered with dark spots (Fishes of Australia, Florida Museum). Fresh pups are close to **black and white**, and the stripes fade as they grow (Blue Reef).
  - LiveAquaria adds that larger ones develop **muted brown spots between the stripes** (the transition).
- **Adult:** **plain** light brown to greyish brown with a pale belly and gill margins; no pattern (Fishes of Australia, Compagno via Wikipedia).
  - Banding is gone in "large adults". Fishes of Australia says juveniles are banded "to about 30 cm", so start fading at ~30% of adult length and finish by ~60% (art judgement).
  - The embryo already shows the eight main bands at ~73 dpd (Onimaru 2018).
- **Shape:** slender, thick tail; two equal dorsal fins with a **concave rear edge**; long nasal barbels ("whiskers", the "cat" in the trade name); mouth well ahead of the eyes; **very large spiracles** behind the eyes (Fishes of Australia, Florida Museum, Wikipedia).
- **Sexes:** the same colour. Males mature at 68–76 cm, females at ~63 cm (Fishes of Australia, Florida Museum), so mature males are often a little longer. Claspers are as for the other two.

### Behaviour
- **Day:** lies motionless under ledges, in crevices and among coral, often with only the head or tail showing. Small ones hide deep in crevices (Fishes of Australia, Florida Museum). It breathes through its big spiracles while resting.
- **Night:** a **nocturnal** forager (Florida Museum, Mote). It **digs through the sediment** with its snout and barbels for crabs, worms and shrimp (Florida Museum), then **suction-feeds**.
- **Moving:** slow, sinuous, eel-like cruising along the floor. It uses its strong pectorals to clamber and "walk" short distances (Mote). It is less of a walker than the epaulette.
- **Shoving:** strong enough to **topple unstable rock and decor** (Wikipedia's hobby source; QM "stable rockwork"; Top Shelf for the epaulette).
  - AI and render moment: a loose rock shifts as it noses under it. The sim effect needs a `knocksDecor` flag.
- **Out of water:** survives up to 12 h out of water (FishBase) and tolerates long hypoxia (Florida Museum). That is why it is common in tide pools.
- **Escape:** bamboo sharks have jumped from display tanks when startled (Khaosod 2014, Tier 3). One got through a **4 × 3 in gap in a lid** (Monster Fish Keepers, Tier 3, both via search index). It needs a lid with no gaps.
- **Embryo:** inside the case it beats its tail to pump water once the seams open, and **freezes**, coiling its tail around its body, when it senses a predator's electric field (Kempster 2013).
  - A lovely candling-view behaviour: when the player candles or taps near a late egg, the embryo freezes for a few seconds.

### Compatibility
See the **shared matrix**. Specific to the bamboo shark:
- The **biggest mouth** of the three, so it is the most dangerous to small fish, snails, sea stars and clams, and an adult can eat a hatchling of the other two sharks.
- Its size makes it **safe from adult groupers**, but its pups are not.
- The Wikipedia hobby source singles out triggerfish and pufferfish as fin-nippers of this species.

### Smallest tank tier for an adult
**1,000 gal (144 × 48 in), the largest tier.**
- An adult (~105 cm, 41 in) is longer than the 36 in width of the 500–800 gal tiers, so it could not turn without folding.
- The 800 gal (144 × 36) has the length but not the width.
- **Even 1,000 gal is at the edge.** The width is only ~1.2× the adult's length, and the hobby rule of thumb (1.5× TL, Tier 3) asks for ~62 in. **By that rule an honest adult minimum is beyond 1,000 gallons.**
- A juvenile under ~60 cm can live in a 500 gal tank for a while (`outgrowsSmallTanks` should warn).

---

## Shared compatibility matrix (the three sharks)
Verdicts: E = excellent, UC = usually_compatible, C = conditional, HR = high_risk, I = incompatible. Columns: **Cat** = coral catshark, **Ep** = epaulette, **Bam** = brown-banded bamboo shark.

### Against the other new chunk-17 species

| Other species | Cat | Ep | Bam | Reason | Sources |
|---|---|---|---|---|---|
| Oscar, clown loach, black ghost knifefish, fahaka puffer, ornate bichir, motoro stingray, silver arowana, koi | I | I | I | Freshwater; the sharks need full seawater (SG 1.020–1.025) | LA, QM |
| Silver mono, spotted scat | I | I | I | Brackish water class. Adults of both can live in full seawater; if the builder lets adults into `marine_fowlr`, treat them as **C** (omnivorous pickers and very active feeders that steal the shark's food). No shark-specific source | LA (shark water) |
| Blue tang (*Paracanthurus hepatus*) | UC | UC | UC | Tangs are standard shark tankmates. But tangs catch ich, and a shark tank **can never be treated with copper**, so **quarantine the tang first**. It also steals food, so target-feed the shark | Chewy (tangs good), LA/QM/Top Shelf (no copper) |
| Naso / orangespine unicornfish (*Naso lituratus*) | UC | UC | UC | As the blue tang. A large adult needs the 1,000 gal anyway | Chewy, LA |
| Queen angelfish (*Holacanthus ciliaris*) | HR | HR | HR | Large angels **pick at sharks' skin and eyes**; a keeper reports eye damage to epaulettes from bony tankmates | Chewy, Top Shelf, Reef Central (Tier 3) |
| Clown triggerfish (*Balistoides conspicillum*) | I | I | I | Triggers **nip and bite benthic sharks**, and the clown trigger is among the most aggressive. It would also crack egg cases (inference from diet) | Chewy, Top Shelf, Wikipedia (bamboo) |
| Panther grouper (*Cromileptes altivelis*) | HR | HR | C | **Groupers prey on epaulettes** and eat small sharks; they also compete for the same caves and floor. An adult bamboo is too big to swallow, but its pups are not | Florida Museum (predators incl. groupers), Top Shelf (morays and frogfish threaten small sharks), forum (Tier 3: groupers are bad mates for benthic sharks) |
| Coral catshark ↔ epaulette ↔ bamboo shark | C | C | C | Two benthic sharks need twice the floor (1,000 gal only). The catshark is the most aggressive (Michael 2004). **Adults eat egg cases** (Osaka; reefs.com: males especially). An adult bamboo can eat a hatchling of either | Michael 2004 via Wikipedia, Onimaru 2018, reefs.com (via search index) |

### Against the existing roster (marine; freshwater and brackish are incompatible on water)

| Existing species (group) | Cat | Ep | Bam | Reason | Sources |
|---|---|---|---|---|---|
| Skunk cleaner shrimp, peppermint shrimp | I | I | I | "Will eat any crustacean"; ornamental shrimp are prey | LA (bamboo, epaulette), Top Shelf |
| Emerald crab, blue-leg hermit, scarlet hermit | I | I | I | Crabs are the adults' main prey | FoA, Florida Museum, LA |
| Peacock mantis shrimp | I | I | I | `speciesOnly`; a crustacean the shark will attack, and its strike can maim a resting shark | LA, mantis data |
| Clown goby, mandarin dragonet | I | I | I | Tiny or slow benthic fish, eaten while asleep | LA ("small sleeping fish"), Top Shelf |
| Firefish, yellow watchman goby | HR | HR | HR | Small fish that sleep in burrows the shark roots through at night | LA, Florida Museum (snout in sand) |
| Melanurus wrasse (sleeps buried in sand) | HR | HR | HR | The shark digs out sand-sleepers at night (inference from feeding style) | Florida Museum |
| Green chromis, yellowtail damsel, Banggai cardinal, royal gramma, six-line wrasse, flame hawkfish, ocellaris clown | C | C | HR | Small fish (7–9 cm) at risk when asleep near the floor; rock cover lowers the risk. Damsels are on Chewy's good list, but the bamboo's bigger mouth raises it to HR | LA, Chewy, Top Shelf |
| Lawnmower blenny | C | C | C | Benthic percher, 13 cm; usually too big, but it sleeps in rock holes the shark explores | LA |
| Lyretail anthias | UC | UC | UC | Midwater, 12 cm; named as a good shark tankmate | Chewy |
| Coral beauty, flame angel (dwarf angels) | C | C | C | Angels may pick at the shark (Top Shelf); at 10 cm, small enough to be caught asleep by a bamboo | Top Shelf, LA |
| Emperor angelfish | HR | HR | HR | Large angel, the same as the queen angel | Chewy, Top Shelf |
| Yellow, kole, chocolate and sailfin tangs | UC | UC | UC | Good tankmates, with the quarantine caveat (no copper in the shark tank) | Chewy, LA |
| Foxface rabbitfish | UC | UC | UC | Large, peaceful. Venomous spines would sting a shark that mouthed one, but it is too big to be tried | rabbitfish data |
| Maroon clownfish | UC | UC | UC | 16 cm and feisty; no record of harming sharks | — (judgement) |
| Fuzzy dwarf lionfish | HR | HR | HR | Venomous and rests on the bottom; a shark that grabs it gets stung, and benthic sharks share its resting places | forum (Tier 3: "lionfish are bad mates for benthic sharks"), lionfish data |
| Miniatus grouper | HR | HR | HR | Groupers eat young sharks and compete for caves and food | Florida Museum, forum |
| Lined seahorse | I | I | I | Slow, eaten or bullied; flow and feeding needs clash | seahorse data, LA |
| Bubble-tip anemone | C | C | C | A stinging cnidarian on the floor where the shark rests and ploughs; no shark-specific source (low confidence) | judgement |
| Snails: astraea, cerith, trochus, Mexican turbo, Nassarius, fighting conch | UC | C | C | Epaulette teeth crush hard prey; bamboo eats shelled molluscs (cockles). Snails can also bore through egg cases (QM, wild) | Florida Museum via Wikipedia, LA, QM |
| Elegant star, sand-sifting star, tuxedo urchin | UC | C | C | Bamboo sharks eat echinoderms (Mote). Urchins bore egg cases in the wild (QM). Sand-sifters compete for sand-bed food | Mote, QM |
| Corals (reef decor) | UC | UC | UC | Sessile corals are left alone; the risk is the shark toppling rock (`knocksDecor`) | Top Shelf, Wikipedia |

**Proposed `exceptionRules`** (the same list for all three unless noted):
```ts
[
  { other: 'tag:crustacean', verdictFloor: 'incompatible', reason: 'Crabs and shrimp are a benthic shark’s main food; it will eat any crustacean in the tank.', incidentRisk: 0.35 },
  { other: 'tag:shrimp_large', verdictFloor: 'incompatible', reason: 'Cleaner and peppermint shrimp are eaten.', incidentRisk: 0.35 },
  { other: 'tag:fish_tiny', verdictFloor: 'incompatible', reason: 'Tiny fish are caught asleep at night.', incidentRisk: 0.3 },
  { other: 'tag:fish_benthic', verdictFloor: 'high_risk', reason: 'It roots through sand and burrows at night and catches bottom-sleeping fish.', incidentRisk: 0.15, mitigatedBy: ['hides'] },
  { other: 'tag:fish_small', verdictFloor: 'high_risk', reason: 'Small fish asleep near the floor are eaten at night.', incidentRisk: 0.1, mitigatedBy: ['cover', 'hides'] },
  { other: 'mandarin_dragonet', verdictFloor: 'incompatible', reason: 'A slow benthic fish the shark finds by smell at night.', incidentRisk: 0.3 },
  { other: 'peacock_mantis_shrimp', verdictFloor: 'incompatible', reason: 'The shark attacks it, and its strike can maim a resting shark.', incidentRisk: 0.3 },
  { other: 'lined_seahorse', verdictFloor: 'incompatible', reason: 'Slow seahorses are eaten or bullied, and their gentle-flow tank cannot carry a shark’s waste.', incidentRisk: 0.2 },
  { other: 'dwarf_lionfish', verdictFloor: 'high_risk', reason: 'Both rest on the bottom; a shark that grabs a lionfish is stung by its venomous spines.', incidentRisk: 0.05 },
  { other: 'emperor_angelfish', verdictFloor: 'high_risk', reason: 'Large angelfish pick at a resting shark’s skin and eyes.', incidentRisk: 0.08, mitigatedBy: ['tank_size'] },
  { other: 'miniatus_grouper', verdictFloor: 'high_risk', reason: 'Groupers eat young sharks and fight them for caves and food.', incidentRisk: 0.08, mitigatedBy: ['tank_size', 'hides'] },
  { other: 'tag:stinging_cnidarian', verdictFloor: 'conditional', reason: 'A shark resting or rooting on the floor can blunder into an anemone and be stung, or uproot it.', incidentRisk: 0.03 },
  // epaulette + bamboo only:
  { other: 'tag:snail', verdictFloor: 'conditional', reason: 'Crushing teeth crack small snails; the bamboo shark eats shelled molluscs.', incidentRisk: 0.05, mitigatedBy: ['cover'] },
  { other: 'tag:starfish', verdictFloor: 'conditional', reason: 'Bamboo sharks eat echinoderms in the wild.', incidentRisk: 0.03 }, // bamboo (epaulette: lower risk)
  // new chunk species (ids as the builder names them):
  { other: 'clown_triggerfish', verdictFloor: 'incompatible', reason: 'Triggerfish bite and nip benthic sharks, and the clown trigger is among the most aggressive.', incidentRisk: 0.3 },
  { other: 'queen_angelfish', verdictFloor: 'high_risk', reason: 'Large angelfish pick at a shark’s skin and eyes.', incidentRisk: 0.08, mitigatedBy: ['tank_size'] },
  { other: 'panther_grouper', verdictFloor: 'high_risk', reason: 'Groupers prey on young sharks and compete for the floor and caves.', incidentRisk: 0.1, mitigatedBy: ['tank_size', 'hides'] }, // bamboo: 'conditional'
  // shark ↔ shark:
  { other: 'tag:benthic_shark', verdictFloor: 'conditional', reason: 'Two bottom sharks need twice the floor; adults eat each other’s egg cases and the larger eats hatchlings.', incidentRisk: 0.03, mitigatedBy: ['tank_size', 'nursery'] },
]
```
The tank's other predators should carry the reverse: clown trigger, queen angel, emperor angel and the panther grouper get `tag:benthic_shark` rules. Any `eggs`-eater in a shark tank should also count `egg_case` (see the breeding spec).

---

## Cross-species notes

### New breeding system: `egg_case` (all three sharks)
Real biology, with sources. Times are real days at ~25–26 °C; the game multiplies by 8.

1. **Mating:** the male grips the female by a pectoral fin or the gill region with his mouth and inserts a clasper; copulation is ~1.5 min (West & Carter 1990 via Wikipedia; FishBase; AoP).
   - Wild season Jul–Dec (epaulette) or late Jul–Feb (bamboo); **continuous in captivity** (IUCN via Wikipedia; Osaka "year-round").
   - Window: **night** (Fishes of Australia: capsules laid among coral at night).
   - Mating leaves bite marks on the female (cosmetic; no health cost).
2. **Laying:**
   - **Two capsules per cycle**, the second 0–2 nights after the first (Wheeler 2025). Sometimes one, plus an empty "wind" case.
   - Cycle **~19 d** for the epaulette (Wheeler 2025; ~14 d per Fishes of Australia) and **~7 d** for the bamboo in season (Harahush).
   - For the catshark the interval is unknown; use ~14 d.
3. **Where the case goes** (new `SiteKind` values):
   - Epaulette and bamboo: **tied to rock, coral or decor** by fibrous strands (AoP; Thai paper citing Suksuwan & Ubonsuwan 2004) → `decor_anchor`.
   - Coral catshark: **laid loose on the bottom** (Wikipedia citing Bor 2003 and Hövel 2010) → `floor`.
   - With no decor, the anchoring species drop cases on the floor too.
4. **Fertility:**
   - Needs a mature male in the tank **within a sperm-storage window**. Bernal 2015 documents ≥ 45 months in a brown-banded female. The game might use ~30 game days (owner call).
   - **A female with no male still lays on schedule, but the cases are infertile** (Wheeler 2025: five singly housed females laid 196 cases).
   - With a male, a good share is still dud or abnormal: 21% hatched (Harahush), 48% (Payne), ~⅔ developed normally (Osaka). Use ~50% fertile and viable.
   - Duds show no embryo when candled, or a "runny, undefined" yolk. Left in, they **rot and smell** (QM), which adds ammonia.
5. **Incubation** (temperature-dependent):
   - Epaulette 125 d at 27 °C, 110 at 29, 101 at 31 (Wheeler 2021), ~140 at 25 (Payne). That is about **−6 d per °C**.
   - Bamboo 118 d at 25 °C, 153 d at 21–25 °C.
   - Catshark 76–180 d.
   - **≥ 31 °C:** lighter, weaker pups. **32 °C:** only ~38% survive to hatch (Wheeler 2021). Gate: `maxTempC` 28–29, with a pup-quality penalty above 30.
6. **Visible development** (for a "Candle the egg" view; QM: shine a torch through it).

   Fractions of the incubation, from Onimaru 2018 (bamboo, 118 d) and Choosri 2023 (catshark, 76 d):

   | Fraction of incubation | What candling shows |
   |---|---|
   | 0–0.08 | **Yolk only.** A clean round yolk is good; a runny one is bad (QM) |
   | 0.08–0.15 | A tiny embryo on the yolk; it starts **twitching ~0.10** (12 dpd); visible to the naked eye by ~0.15 (Harahush ~18 dpd) |
   | 0.2–0.4 | Long **external gill filaments** ("fine hair from the yolk", QM); tail lengthens; eyes darken (0.32–0.39) |
   | ~0.4–0.6 | **The case seams open** (pre-hatching) and the embryo starts **tail-wagging to pump water** through the case (Kempster 2013; Wonders of Wildlife). From here the egg needs good flow (QM) |
   | 0.56–0.62 | **Bands or stripes appear** (bamboo 66–73 dpd; catshark d70–75) |
   | 0.62–0.68 | External gills reabsorbed |
   | 0.88–1.0 | Yolk sac shrinks and is drawn inside; the pup fills the case |
   | 1.0 | **Hatches, usually at night** (25 of 27 in the dark: Wheeler 2021). The case stretches or cracks and the pup wriggles out unaided (QM) |

   - From the gill-pumping stage, a late embryo **freezes for 20–60 s** if disturbed (Kempster 2013: predator electric fields; Wheeler 2021: embryos stop moving at a perceived threat).
   - The case darkens from light to dark brown with age (QM, Bor 2003).
7. **No parental care** (`parentalCare 'none'`, `guardEggs false`). The young are fully independent at hatching (zoo source via search index).
8. **Risks in the display tank:**
   - **Other fish eat about half the eggs** in a mixed community (Osaka).
   - **Adult sharks eat eggs**, males especially (reefs.com, via search index). Use `parentsEatEggs: true` at a low rate.
   - Snails and urchins **bore through cases** in the wild (QM).
   - **Air in the case kills the embryo** (QM), so moving an egg must happen under water.
   - Diggers and the sharks themselves can bury or dislodge cases (inference).

   Proposed `RearingPlan`:
   ```ts
   eggTags: ['eggs', 'egg_case'], youngTags: ['fish_medium', 'benthic_shark'],
   parentsEatEggs: true, guardEggs: false, planktonic: false, hatchAtNight: true,
   larvaeViable: true, starveSeverity: 0.6, coverShelter: 0.5, yolkFrac: 1.0
   ```
9. **Nursery advice** (what the game should suggest):
   - Move the case **under water** into an **egg basket / breeder box with good flow** in the main tank, or a separate tank at the same temperature. Payne 2012 used floating baskets in a 1,306 L tank at 24.4–25.5 °C; NEAq suspended cases mid-water.
   - Backlight it to candle. Remove duds.
   - Mitigation `nursery` cuts egg predation from ~0.5 to ~0.05.
   - Shops sell eggs: $94 (aquariumfish.com), £79 (Abyss). An "egg case" shop item is realistic.
10. **Hatchling:** a 10–17 cm miniature shark, tracked as an individual from hatch.
    - It lives on internal yolk **~a week** before eating (QM; Wheeler 2021).
    - Then it needs **small chopped seafood daily**: minced shrimp and clam (Wheeler 2021); chopped capelin with a multivitamin (Payne 2012); mysis or small squid, **3–4 small meals a day** (Abyss, Tier 3).
    - Grow it on away from groupers, morays, frogfish, triggers and adult sharks (Florida Museum predators; Top Shelf).
    - Hatchling survival is high once eating (Payne: 22 of 27).
    - Growth is slow: about 5 cm/yr for the epaulette after 3 months (Florida Museum); up to 18 cm/yr for the bamboo (Fahmi 2021).
11. **New render assets:** `Clutch.visual: 'egg_case'`.

    | Species | Case shape and colour | Size |
    |---|---|---|
    | Bamboo | flat, sub-rectangular; light brown with white fibre tufts | 11 × 5 cm |
    | Epaulette | ellipsoid; brown with fibrous strands | 10 × 4 cm |
    | Catshark | slim, **two pinched waists**, short tendrils at one end; light brown darkening to dark brown | 5–8 × 2 cm |

    Plus a backlit candling overlay showing the stage.

**Game-time problem for the owner:**
- Real days × 8 gives **960–1,040 game hours (40–43 game days)** of incubation. That is about **3× the longest incubation in the game today** (mantis shrimp, 320 h) and longer than the shark's own 25-day maturity cap. At 1× that is ~2.7–2.9 real hours per egg.
- Options:
  - (a) keep the formula: sharks are the slow, prestige breeders
  - (b) cap incubation at e.g. 480 h (20 game days) and say so in the encyclopedia
  - (c) compress shark breeding by a larger, labelled factor
- This needs an owner decision.

### New behaviour set: `benthic_shark`
One set with species variants via `specialBehaviors`.

- **Shared:**
  - `rest_on_floor`: long motionless bouts, gills or spiracles pumping
  - `night_patrol`: a slow floor-hugging cruise at dusk and through the night (`nocturnal` 0.8–0.85)
  - `suction_strike` / `still_lunge`
  - `snout_root`: noses into sand and thrashes, puffing sand
  - `tong_feed_learned`: comes to the front glass and tongs at feeding time
  - never schools, never hovers
  - turns by bending the whole body (a tight U-turn needs width ≥ body length: the footprint rule)
- **Epaulette:** `fin_walk` (stepping gait, the default way of moving), `rheotaxis_perch`, `sand_expel`, `slow_chew`.
- **Bamboo:** `ledge_lie` (under ledges with the head or tail sticking out), `fin_shuffle` (short clambers), `decor_shove`.
- **Catshark:** `crevice_rest` + `same_refuge_return` (picks a favourite crevice and goes back to it), `eel_glide` through gaps, `dusk_patrol`.
- **Embryo** (in the egg view): `tail_pump` and `freeze`.

The closest existing sets are `grouper` (cave lurk, ambush) and `loach_eel` (kuhli: hides, eel-like). Neither does floor resting plus walking, so a new set is needed.

### New foods
Sharks need meaty marine seafood: **squid, clam/cockle/mussel/scallop, shrimp/prawn, and whole small fish** (silversides, lancefish, capelin, pilchard) (LiveAquaria, Top Shelf, Chewy, Wheaton 2025, Wheeler 2025).

- **Today** they can live on `pellet_large`, the shop's "Frozen Krill & Silversides" with chopped clam, plus `mysis` for pups.
- **Proposed tags:**
  - `squid` (needed by all three sharks; good starter food: LiveAquaria)
  - `shellfish` (clam, cockle, mussel, scallop: all three)
  - `whole_fish` (silversides, lancefish, capelin: all three; also the groupers and lionfish)
  - Or one new shop item, "Frozen Shark & Ray Mix" (`squid` + `shellfish`).
- **Supplement (new item kind, not a food tag):** "Shark & ray vitamin tablets", pushed into the food.
  - Without them, **goitre** appears within ~2 months in bamboo sharks (Wheaton 2025).
  - Iodine can also be dosed in the water. Too much iodine is harmful too (Wheaton 2025).
  - **High nitrate also causes goitre** (Morris 2011) → the proposed `nitrateSensitive` flag.
- **Autofeeders:** sharks take frozen seafood from tongs. None of my sources describes them taking dry pellets, so the autofeeder can't feed them.
- **Feeding cautions:**
  - Bite-size pieces, or it regurgitates (Wikipedia's hobby source).
  - Some frozen fish carry **thiaminase** (smelt, herring), which destroys vitamin B1 and is another reason for vitamins (VIN marine-mammal paper, via search index; no elasmobranch-specific data found).
  - No freshwater feeder fish.
  - Feed 2–3 times a week as adults (Wheeler 2025: 2% body mass 3×/week). Pups need small meals daily.

### Husbandry flags these three need (new, owner or engine decision)
- `electricalSensitive`: QM (all three) and Top Shelf: sensitive to electric impulses, so ground the tank. Sharks detect fields far below 1 µV/cm (Kalmijn 1971, via search index; embryos react to 0.4 µV/cm, Kempster 2013).
  - Game: a grounding probe item, or stress from cheap pumps.
  - Evidence of harm from aquarium stray voltage is hobby-level only (Tier 3).
- `medicationSensitive` (exists): never copper (LA, QM, Top Shelf). The real consequence is that **tankmates must be quarantined**, because the display can't be medicated.
- `needsIodineSupplement`: the goitre illness above.
- `nitrateSensitive`: the goitre link (Morris 2011).
- `knocksDecor`: topples unstable rock (Wikipedia, QM, Top Shelf). The aquascape must be anchored on the glass, not on the sand.
- `escapeArtist` (exists): a tight lid. Evidence: epaulettes walk out of water (FAU); bamboo jump and lid-gap escape reports are Tier 3.
- `lowOxygenTolerant` (optional fun flag): epaulette and bamboo survive hours of hypoxia (FishBase, Fishes of Australia, Florida Museum).
- `outgrowsSmallTanks`, `heavyWaste` (exist): strong filtration and a big skimmer (Top Shelf, QM).

### New prey tags
- `benthic_shark`: "Bottom-resting sharks (epaulette, bamboo, catshark): skin, eyes and fins picked at by triggerfish, puffers, large angelfish and some wrasses; the young are eaten by groupers, morays and frogfish." Sources: Chewy, Top Shelf, Florida Museum.
- `egg_case`: "Shark egg cases: eaten by fish and adult sharks, bored by snails and urchins." Sources: Osaka, reefs.com, QM.

### Surprising or worth telling the owner
- **Parthenogenesis:** the famous bamboo-shark "virgin birth" was the **white-spotted** bamboo shark (Detroit, 2010). The **brown-banded** case (San Francisco, 2012) was **sperm stored for ≥ 45 months**, proved by DNA. Both make good fun facts. The game need not model either, though "a female keeps laying fertile eggs for a while after the male is gone" would be a cheap, true touch.
- **Females lay without a male:** a lone female shark lays egg cases on schedule; they are just empty of embryos (Wheeler 2025). That suits a "Candle the egg" mechanic.
- **The tank sizes are much bigger than the retail labels:**
  - Retail labels say 180–360 gal, but the floor footprint puts the catshark and epaulette at the **500 gal** tier and the bamboo shark at the **1,000 gal** tier.
  - For the bamboo shark even 1,000 gal is marginal by the width rule of thumb, which I'd tell the owner plainly.
- **Advise against?** None outright: all three are hardy, long-lived and bred in aquaria. But:
  - The **brown-banded bamboo shark** is the weakest home-tank fit. A metre-long adult, a home footprint at or beyond the game's largest tank, and no documented home spawning. Keep it, but gate it behind the 1,000 gal tank.
  - The **epaulette** is the best fit and the owner's best showpiece: captive-bred (ORA), breeds in aquaria, and walks.
- **Trade names mislead:**
  - "Cat sharks" in shops are mostly bamboo sharks.
  - Indonesian "coral catsharks" may be other *Atelomycterus* species.
  - Non-Australian "epaulettes" may be other *Hemiscyllium* species.
  - The encyclopedia could note this.
- **Legality:**
  - None of the three appears on the CITES appendices as far as I could check. The Species+ database page did not render in the fetcher, so verify.
  - IUCN: catshark NT (2020), epaulette LC (2015), bamboo NT (2023).
  - No US federal restriction found; I did not check state rules.
  - None is venomous or dangerous to keepers; an epaulette may nip if handled (Compagno via Wikipedia).

---

## Sources
Fetched and read unless marked.

- FishBase, *Atelomycterus marmoratus*: https://www.fishbase.se/summary/Atelomycterus-marmoratus.html
- FishBase, *Hemiscyllium ocellatum*: https://www.fishbase.se/summary/Hemiscyllium-ocellatum.html
- FishBase, *Chiloscyllium punctatum*: https://www.fishbase.se/summary/Chiloscyllium-punctatum.html
- WoRMS, *Atelomycterus marmoratus*: https://www.marinespecies.org/aphia.php?p=taxlist&tName=Atelomycterus%20marmoratus
- Catalog of Fishes (family Atelomycteridae; *A. erdmanni*, *A. baliensis*) *(via search index)*: https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=6722
- Bor, van Oijen & Magenta 2003, the egg capsule of the coral cat shark, Zool. Med. Leiden 77: https://repository.naturalis.nl/document/44279
- Choosri et al. 2023, development of *A. marmoratus* in a closed system: https://ph03.tci-thaijo.org/index.php/kaset_rbruj/article/download/457/331/2257
- Hövel, Ommer & Ziegler 2010, Cologne Zoo *(403; via search index and Wikipedia)*: https://zootier-lexikon.org/bibliographie/h-1699975706/hoevel-a-ommer-s-t-ziegler-2010
- Wikipedia, Coral catshark: https://en.wikipedia.org/wiki/Coral_catshark
- Wikipedia, Epaulette shark: https://en.wikipedia.org/wiki/Epaulette_shark
- Wikipedia, Brownbanded bamboo shark: https://en.wikipedia.org/wiki/Brownbanded_bamboo_shark
- Reef Builders, *A. erdmanni* new catshark *(via search index)*: https://reefbuilders.com/2015/03/02/atelomycterus-erdmanni-species-catshark-eastern-indonesia
- Fishes of Australia, Epaulette Shark: https://fishesofaustralia.net.au/home/species/1973
- Fishes of Australia, Grey Carpetshark: https://fishesofaustralia.net.au/home/species/3264
- Florida Museum, Epaulette shark: https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/hemiscyllium-ocellatum/
- Florida Museum, Brownbanded bambooshark: https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/chiloscyllium-punctatum/
- Aquarium of the Pacific, Epaulette shark: https://www.aquariumofpacific.org/onlinelearningcenter/species/epaulette_shark
- Mote Marine Laboratory, Brown-banded bamboo shark: https://mote.org/animal-encyclopedia/brown-banded-bamboo-shark
- Wonders of Wildlife (2026), From egg to hatchling: epaulette sharks: https://wondersofwildlife.org/2026/from-egg-to-hatchling-epaulette-sharks/
- New England Aquarium publication page (Wheeler et al. 2021): https://www.neaq.org/publication/future-thermal-regimes-for-epaulette-sharks-hemiscyllium-ocellatum-growth-and-metabolic-performance-cease-to-be-optimal/
- Wheeler et al. 2021, Sci. Rep. 11:454 (full text): https://researchonline.jcu.edu.au/66857/1/66857.pdf
- phys.org on Wheeler et al. 2021: https://phys.org/news/2021-01-future-baby-sharks.html
- Wheeler et al. 2025, Biology Open, costs of oviparity in the epaulette shark: https://journals.biologists.com/bio/article/doi/10.1242/bio.062076
- Payne 2012, Zoo Biology 31:718–724 *(abstract via search index)*: https://zendy.io/title/10.1002/zoo.20426
- Porter et al. 2022, aquatic walking kinematics: https://researchonline.jcu.edu.au/75954/
- FAU News, walking shark study: https://www.fau.edu/newsdesk/articles/walking-shark-study
- Onimaru et al. 2018, staging of *C. punctatum*: https://pmc.ncbi.nlm.nih.gov/articles/PMC5947634
- Harahush, Fischer & Collin 2007, J. Fish Biol. 71 *(abstract via search index)*: https://peeref.com/works/66940766
- Kempster, Hart & Collin 2013, PLoS ONE: https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0052551
- Fahmi et al. 2021, age and growth of *C. punctatum*: https://pubmed.ncbi.nlm.nih.gov/33977550/
- Wheaton et al. 2025, Front. Vet. Sci., thyroid, iodine and cobalt in aquarium elasmobranchs: https://frontiersin.org/articles/10.3389/fvets.2025.1504527/full
- Morris et al. 2011, nitrate-induced goiter *(abstract via search index)*: https://shark-references.com/literature/listByAuthor/Hamlin-H.J.
- phys.org 2010, shark virgin birth (Feldheim et al., J. Heredity): https://phys.org/news/2010-01-shark-virgin-birth-offspring-survive.pdf
- Science News, sperm storage in a brownbanded bamboo shark (Bernal et al. 2015): https://www.sciencenews.org/blog/wild-things/paternity-test-reveals-father%E2%80%99s-role-mystery-shark-birth
- KPBS/NPR 2025, shark pup in an all-female tank: https://www.kpbs.org/news/science-technology/2025/01/28/this-shark-pup-was-born-in-a-habitat-without-any-males-how-did-that-happen
- Practical Fishkeeping, public aquarium inundated with pups: https://www.practicalfishkeeping.co.uk/fishkeeping-news/public-aquarium-is-inundated-with-pups/
- LiveAquaria, Australian Epaulette Shark: https://www.liveaquaria.com/products/australian-epaulette-shark
- LiveAquaria, Cat Shark Brown Banded (Diver's Den): https://www.liveaquaria.com/products/cat-shark-brown-banded-expert-only-6-25-wysiwyg
- Quality Marine, Coral Cat Shark: https://www.qualitymarine.com/quality-marine/fish/sharks/atelomycterus/coral-cat-marmoratus-29015/
- Quality Marine, Banded Cat Shark: https://www.qualitymarine.com/quality-marine/fish/sharks/chiloscyllium/banded-cat-29001/
- Quality Marine, Epaulette Shark: https://www.qualitymarine.com/quality-marine/fish/sharks/hemiscyllium/epaulette-29003/
- Quality Marine, Shark Eggs Part II: https://www.qualitymarine.com/news/shark-eggs-part-ii/
- Top Shelf Aquatics, Epaulette Shark: https://topshelfaquatics.com/pages/saltwater-fish/epaulette-shark
- ORA, Epaulette Shark Pups Now Available: https://orafarm.com/?p=7600
- CORAL Magazine, Michael 2021 "The Epaulette Sharks" (only the reference list was visible): https://coralmagazine.com/?p=3062217
- Chewy Education, sharks for the saltwater aquarium: https://www.chewy.com/education/fish/saltwater-fish/7-ideal-sharks-for-the-saltwater-aquarium
- PetMD, saltwater aquarium sharks (J. Sanders DVM): https://www.petmd.com/fish/top-saltwater-shark-species-aquariums
- Saltwaterfish.com, Brown Banded Bamboo Shark: https://saltwaterfish.com/product-brown-banded-bamboo-shark
- AquariumFish.com, Sharks collection (prices, eggs): https://aquariumfish.com/collections/sharks
- Abyss Aquatics, Bamboo shark egg: https://www.abyssaquatics.co.uk/product/bamboo-shark-egg/
- reefs.com epaulette article *(403; via search index)*: https://reefs.com/?p=208954
- Reef Central, whitespotted bamboo sharks thread (Tier 3): https://forums.reefcentral.com/threads/whitespotted-bamboo-sharks.1076633
- Monster Fish Keepers, bamboo shark through a lid gap *(Tier 3, via search index)*: https://www.monsterfishkeepers.com/forums/posts/7917965/
- Monster Fish Keepers, "Are coral catsharks jumpers?" *(Tier 3, via search index)*: https://www.monsterfishkeepers.com/forums/goto/post?id=5359269
- Khaosod English 2014, mall shark jumped from tank *(via search index)*: https://www.khaosodenglish.com/life/2014/12/26/1419598596/
- Hobby tank-dimension rules for benthic sharks (3× TL long, 1.5× TL wide) *(Tier 3, via search index)*: https://www.tapatalk.com/groups/sharksandrays/minimum-tank-sizes-t6.html and https://monsterfishkeepers.com/forums/threads/appropriate-tank-size-and-shape-for-bamboo-shark.401420
- MarAlliance, how to tell the sex of a shark *(via search index)*: https://maralliance.org/?p=8674
- VIN, diet-induced thiamine deficiency in captive marine mammals *(via search index)*: https://www.vin.com/doc/?id=3979809
- Kalmijn 1971, The electric sense of sharks and rays, J. Exp. Biol. 55 *(403; via search index)*: https://cob.silverchair.com/jeb/article/55/2/371/21660/The-Electric-Sense-of-Sharks-and-Rays
