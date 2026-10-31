# Freshwater species research — lane species-fw

This document is the research record behind every freshwater `SpeciesDefinition` in Aquarium Go: the three freshwater starters (`src/data/species/axolotl.ts`, `betta.ts`, `pea_puffer.ts`) and the 39 roster species in `src/data/species/freshwater/`, nine of them added in chunk 16 (ADR-0052) and nine in chunk 17 (ADR-0053; their chapters are at the end). For each species it lists the sources used, the key values encoded, explicit compatibility rules, and confidence and conflicts. It ends with the cross-cutting **Conflicts & uncertainty** and the **Visual notes for render lanes**.

The per-species sections are generated from the species data files, so they always match the game values. The data files are the source of truth; update this document when they change.

## Method

- **Research date:** September 2026. There were four parallel literature passes (invertebrates; cool-water fish; tropical fish; bottom-dwellers and the frog), followed by direct verification of the starter records and of every URL cited. Chunk 16's nine species were researched in October 2026 in two passes (five fish; the livebearers and the two invertebrates).
- **Sources cited are ones that were actually opened.** Two exceptions are flagged where they occur. The axolotl copper paper (Tyrp1) was verified only by its title in a search listing, because the full text sits behind a login redirect. Any hex colours suggested by researchers are approximations chosen by this lane; no source gives hex values.
- **Source tiers:**
  - **Tier 1:** university husbandry programmes (University of Kentucky AGSC, the Xiphophorus Genetic Stock Center), FishBase, Animal Diversity Web, WoRMS, the Catalog of Fishes, government and extension sources (USGS NAS, USFWS ecological risk screenings, UF/IFAS, NIES Japan, CDC, WDFW, FAO), and peer-reviewed papers.
  - **Tier 2:** veterinarian-written care sheets (PetMD), long-established references (Seriously Fish, Practical Fishkeeping, TFH, Amazonas, Tetra), hobby societies and magazines with breeding data (The Angelfish Society; Norton's FAMA articles), and major retailers and wholesalers used for practical parameters (Aquarium Co-Op, LiveAquaria, Aquatic Arts, The Shrimp Farm, PetSmart, Aquarium Glaser, Aquariadise).
  - **Tier 3:** breeder, club and hobbyist sources, used only for morph descriptions and edge cases.
- **Compatibility-critical rules have at least two sources** where possible. These are the `exceptionRules` with a `high_risk` or `incompatible` floor, and the test suite enforces the two-source minimum. Uncertainty is recorded in `confidenceNotes` rather than hidden.
- **Brackish handling:** axolotls are strictly freshwater (AGSC adds salts only to restore hardness). No species here is classified as brackish. Amano and nerite larvae need brackish water, so their reproduction does not complete in freshwater tanks. Ghost shrimp larvae (chunk 16) need none (Dobkin, FAO), so the ghost shrimp breeds in freshwater.
- **Time compression** follows the conventions of the starter records:
  - Incubation or gestation in game-hours ≈ real days × 8.
  - `maturityDays` ≈ 6–20; fast breeders get low values.
  - `juvenileDays` is similar to `maturityDays`.
  - `lifespanDays` ≈ real years × ~40, capped at 500.
  - `hungerHours` is 12–20 for small or warm fish and 24–40 for cold or slow metabolisms.
  - Each species' `confidenceNotes` states its own conversion.
- **Economy fields:**
  - `baseValue` is a 2026 US retail price for an ordinary captive-bred adult.
  - `visitorAppeal` rates charisma, colour and behaviour.
- **Market allele frequencies** in `genetics.loci` are game-tuned so that random market stock roughly resembles real trade prevalence (for example, most cherry shrimp are red and most mystery snails are gold). They are not measured population frequencies.
- **Unlocks:** every non-starter species requires its roster group key. The freshwater starters require `fw_coldwater` (axolotl) or `fw_basic` (betta, pea puffer) *unless chosen as the starter*. See the report to the orchestrator. Chunk 16's nine species are the exception: they have no unlock key and are in the shop from the start (ADR-0052 decisions 4 and 9).

## Species

### Axolotl — *Ambystoma mexicanum* (`axolotl`)

**Key values used:** adult 23 cm · min tank 20 gal · 10–21 °C (ideal 15–18) · pH 6.5–8 (ideal 7–7.6) · GH 6–16 · KH 3–8 · group solitary_or_pair (min 1, ideal 1) · breeding `axolotl_spermatophore` · classes freshwater_cool · unlock `fw_coldwater` · conservation: Critically Endangered (IUCN).

| Source | Tier | Facts used |
|---|---|---|
| [University of Kentucky AGSC — Guide to Axolotl Husbandry](https://ambystoma.uky.edu/education1/guide-to-axolotl-husbandry) | 1 | 15–18 °C recommended; never above about 22 °C; pH 6.5–8.0; never extremely soft or distilled water (salts restore hardness, not salinity); rapid circulation is stressful; avoid pea-sized gravel; maturity about 1 year; spermatophores; eggs 12–20 h after mating, laid over 1–2 days; hatch in 2–3 weeks at room temperature; larvae cannibalistic, sort by size; adults fed 3–4 times a week |
| [Animal Diversity Web — Ambystoma mexicanum](https://animaldiversity.org/accounts/Ambystoma_mexicanum/) | 1 | native range Xochimilco/Chalco; average length 23 cm, up to 30 cm; neoteny; carnivorous diet; 100–300 eggs per spawning; hatch at 10–14 days; lab longevity 5–6 y, some 10–15 y; Critically Endangered |
| [Woodcock et al. 2017, Scientific Reports — Identification of mutant genes and introgressed tiger salamander DNA in the laboratory axolotl](https://pmc.ncbi.nlm.nih.gov/articles/PMC5428337/) | 1 | white (d), albino (a), melanoid (m), axanthic (ax) are autosomal recessive; white = edn3 defect; albino = tyrosinase |
| [Tyrp1 is the Mendelian determinant of the axolotl copper mutant — Scientific Reports (2024; title verified via search listing, full text behind a login redirect)](https://www.nature.com/articles/s41598-024-73283-1) | 1 | copper is a Mendelian (recessive) Tyrp1 mutation |
| [AquariumNexus — Axolotl and goldfish: can you keep them together?](https://www.aquariumnexus.com/axolotl-goldfish/) | 3 | goldfish nip axolotl gills; goldfish add heavy waste; small goldfish can be swallowed |

**Explicit compatibility rules:**
- `tag:fish_tiny` → floor `high_risk`, incident risk 0.3/day: Small fish are either eaten by the axolotl (with a choking risk) or pick at its gills.
- `tag:goldfish` → floor `high_risk`, incident risk 0.25/day: Goldfish nip axolotl gills, add heavy waste, and small goldfish can be swallowed and choke the axolotl.

**Confidence & conflicts:**
- Temperature, pH, flow, substrate and breeding timings follow the AGSC husbandry guide (Tier 1). The 10 °C lower bound is conservative: axolotls tolerate colder water but become sluggish and feed poorly.
- GH/KH ranges are hobby practice (AGSC only says never extremely soft/distilled water) — treat them as guidance, not hard limits.
- Clutch size: ADW gives 100–300; many breeders report larger spawns. The game uses 100–600.
- Compressed time: maturity (~1 real year) = 18 game-days; 2–3 week incubation ≈ 128 game-hours; ~10 year lifespan = 400 game-days.
- Goldfish-gill-nipping rule rests on consistent Tier 3 keeper reports plus the Tier 1 facts that goldfish are heavy-waste nibblers; confidence moderate-high.

### Betta — *Betta splendens* (`betta`)

**Key values used:** adult 6.5 cm · min tank 5 gal · 21–30 °C (ideal 24.5–28) · pH 6–8 (ideal 6.5–7.5) · GH 5–19 · KH 2–12 · group solitary (min 1, ideal 1) · breeding `bubble_nest` · classes freshwater_tropical, freshwater_planted · unlock `fw_basic` · conservation: Vulnerable (IUCN, wild populations).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase — Betta splendens (Siamese fighting fish)](https://www.fishbase.se/summary/Betta-splendens.html) | 1 | 6.5 cm TL max; freshwater, pH 6.0–8.0, 5–19 dH, 24–30 °C; Mekong basin; floodplains, canals, rice paddies; labyrinth organ; bubble nest guarded by male; IUCN Vulnerable (2011); sexes separated except for breeding |
| [PetMD — Betta Fish Care Sheet (Maria Zayas, DVM)](https://www.petmd.com/fish/betta-fish-care-sheet) | 2 | 76–81 °F; pH ~6.5–7.8; at least 2.5 gal, 5–10 gal ideal; lifespan 3–5 years; lid needed — bettas jump; avoid fin-nippers and long-finned fish the betta may spar with |
| [Aquarium Co-Op — Betta fish care guide](https://www.aquariumcoop.com/blogs/aquarium/betta-fish-care-guide) | 2 | ~80 °F; 5–10 gal minimum; feed once a day; not with other bettas; small tetras, rasboras, corydoras in 10–20 gal planted tanks |
| [Wang et al. 2021 — Genomic basis of striking fin shapes and colors in the fighting fish (Mol. Biol. Evol.)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8321530/) | 1 | double tail caused by a deletion in a conserved zic1/zic4 regulatory element; elephant-ear fins linked to kcnh8 expression; domestic fin forms and colours have identifiable genetic bases |

**Explicit compatibility rules:**
- `betta` → floor `none`, incident risk 0.8/day: Two male bettas will fight — often to serious injury.
- `tag:shrimp_dwarf` → floor `conditional`, incident risk 0.2/day: Some bettas ignore adult dwarf shrimp; others hunt them. Shrimplets are usually eaten.
- `fancy_guppy` → floor `conditional`, incident risk 0.15/day: Bettas often attack colourful long-finned male guppies as if they were rivals.

**Confidence & conflicts:**
- Water parameters: FishBase (24–30 °C, pH 6–8, 5–19 dH) and PetMD (76–81 °F) agree well. The tolerated minimum is 21 °C (it was 23 °C): bettas ride out room temperature (about 22 °C) for weeks, and a 23 °C floor made every heater failure lethal. The ideal range stays 24.5–28 °C.
- Betta vs dwarf shrimp varies by individual — represented as conditional with a per-day incident risk rather than a guarantee either way.
- Colour/pattern/fin genetics are a deliberately simplified dominance ladder; real inheritance involves several interacting loci.
- Compressed time: maturity ~4–5 real months = 14 game-days; bubble-nest eggs hatch in ~1–2 days (14 game-hours); 3–5 year lifespan ≈ 160 game-days.

### Pea Puffer — *Carinotetraodon travancoricus* (`pea_puffer`)

**Key values used:** adult 2.5 cm · min tank 5 gal · 22–28 °C (ideal 24–27) · pH 6.5–8.3 (ideal 7–7.8) · GH 5–25 · KH 3–12 · group harem (min 1, ideal 4) · breeding `egg_scatter_cover` · classes freshwater_tropical, freshwater_planted · unlock `fw_basic` · conservation: Vulnerable (IUCN).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase — Carinotetraodon travancoricus (Malabar pufferfish)](https://www.fishbase.se/summary/Carinotetraodon-travancoricus.html) | 1 | freshwater, demersal; max 3.5 cm TL, usually under 2.5 cm; pH 7.5–8.3; 22–28 °C; endemic to south-western India (Malabar); IUCN Vulnerable (2010); eggs hidden in vegetation |
| [Seriously Fish — Carinotetraodon travancoricus](https://www.seriouslyfish.com/species/carinotetraodon-travancoricus/) | 2 | 25 mm SL; 22–28 °C, pH 6.8–8.0, 5–25 dGH; exclusively freshwater; nips slow/long-finned fish; not a community fish; snails needed for beak wear; ten or fewer eggs, hatch ~5 days; male belly line and eye wrinkles |
| [Aquarium Co-Op — Pea puffer care guide](https://www.aquariumcoop.com/blogs/aquarium/pea-puffer-care-guide) | 2 | fully freshwater; ~1 inch; 74–82 °F; pH 6.5–8.4, ideal 7.2–7.5; 5 gal for the first puffer + 3 per extra; one male per 2–3 females; carnivore; rejects most dry food; species-only recommended |

**Explicit compatibility rules:**
- `tag:snail` → floor `high_risk`, incident risk 0.6/day: This puffer is likely to hunt snails.
- `tag:shrimp_dwarf` → floor `high_risk`, incident risk 0.5/day: Pea puffers hunt dwarf shrimp.
- `tag:long_fins` → floor `high_risk`, incident risk 0.4/day: Pea puffers nip flowing fins.

**Confidence & conflicts:**
- Freshwater status is certain (FishBase, Seriously Fish, Aquarium Co-Op). Brackish advice for this species is a myth.
- pH: FishBase lists the wild range as 7.5–8.3; aquarium sources accept 6.5–8.4. The game tolerates 6.5–8.3 with an ideal of 7.0–7.8.
- Shrimp: Seriously Fish says some shrimp species can work; Aquarium Co-Op and most keepers report dwarf shrimp being hunted. Encoded as high_risk with cover mitigation — never guaranteed safe.
- Lifespan is poorly documented (keeper reports of 3–5 years); 150 game-days is a moderate estimate.
- The Golden and Bold-spotted "morphs" are natural individual variation, not established domestic lines.

### Cherry Shrimp — *Neocaridina davidi* (`cherry_shrimp`)

**Key values used:** adult 2.5 cm · min tank 5 gal · 14–29 °C (ideal 20–25) · pH 6.2–8.2 (ideal 7–7.6) · GH 4–14 · KH 2–10 · group colony (min 3, ideal 10) · breeding `shrimp_berried` · classes freshwater_cool, freshwater_tropical, freshwater_planted · unlock `fw_basic` · conservation: Not assessed by IUCN; rated High invasion risk by USFWS.

| Source | Tier | Facts used |
|---|---|---|
| [USGS Nonindigenous Aquatic Species — cherry shrimp (Neocaridina davidi) fact sheet](https://nas.er.usgs.gov/queries/factsheet.aspx?SpeciesID=2257) | 1 | up to 40 mm; native to China, Korea, Taiwan, Vietnam; streams, ponds, ditches; up to ~60 eggs; incubation 16–19 days (warm); maturity ~30 days (warm lab); established in Hawaii and Florida via aquarium release |
| [USFWS Ecological Risk Screening Summary — Cherry Shrimp (2025)](https://www.fws.gov/sites/default/files/documents/2025-06/ecological-risk-screening-summary-cherry-shrimp-june-2025.pdf) | 1 | females ~25 mm, males ~20 mm; wild habitat 4–30 °C seasonally; captive breeding recorded 14–30 °C, pH 6–8.2; diet mostly detritus and algae; 43–60 eggs per clutch; wild lifespan ~10–15 months; High invasion risk; established in Europe, Japan, Canada; can carry crayfish plague |
| [Aquarium Co-Op — Care Guide for Cherry Shrimp](https://www.aquariumcoop.com/blogs/aquarium/cherry-shrimp-care) | 2 | 16–28 °C tolerated, 22–24 °C ideal; pH 6.5–8.5; GH ≥ 6, KH ≥ 2; start with ≥ 10 shrimp; almost all fish eat baby shrimp; females larger, more colourful, with a saddle |
| [The Shrimp Farm — Red Cherry Shrimp caresheet](https://www.theshrimpfarm.com/posts/shrimp-caresheet-red-cherry-shrimp/) | 2 | 18–29.5 °C; pH 6.2–8.0; GH 4–8, KH 3–15, TDS 150–250; 5 gal minimum; direct development, 1–2 mm hatchlings; maturity 2–2.5 months; 1–2 year lifespan |
| [LiveAquaria — Red Cherry Shrimp](https://www.liveaquaria.com/products/red-cherry-shrimp) | 2 | peaceful; never use copper medications; not with loaches, puffers or larger carnivorous fish; ~$2 each in packs |
| [Canada Shrimps — Neocaridina strains](https://www.canadashrimps.com/neocaridina-strains) | 3 | red grades by colour coverage (cherry, sakura, fire red, painted); blue dream vs blue velvet; green jade, black rose, chocolate, yellow, orange lines |

**Confidence & conflicts:**
- Colour-line genetics are simplified (see genetics.notes). Keepers report mixed lines reverting to brown/grey wild type within 2–3 generations — the game models this for all non-red lines.
- Incubation and maturity differ between warm-lab studies (16–19 days; ~30 days to maturity) and hobby reports (3–4 weeks; 2–3 months). The game uses ~21 days (168 game-hours) and fast maturity (8 game-days).
- Breeding temperature conflict: hobby sources say breeding slows below ~21 °C, while a wild study found the most egg-carrying females at 15–20 °C. The game allows breeding from 18 °C.
- Compressed time: 1–2 year lifespan ≈ 60 game-days.

### Comet Goldfish — *Carassius auratus* (`comet_goldfish`)

**Key values used:** adult 25 cm · min tank 75 gal · 2–30 °C (ideal 15–22) · pH 6–8.4 (ideal 7–7.8) · GH 5–19 · KH 4–12 · group group (min 2, ideal 4) · breeding `egg_scatter_cover` · classes freshwater_cool · unlock `fw_coldwater` · conservation: Least Concern (wild species, IUCN 2010); rated High invasion risk by USFWS.

| Source | Tier | Facts used |
|---|---|---|
| [USGS Nonindigenous Aquatic Species — Goldfish (Carassius auratus)](https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=508) | 1 | feral fish 12–22 cm SL, up to 41 cm SL; native to East Asia; still or slow weedy water; survives 0–41 °C; recorded in all 50 US states; uproots plants, increases turbidity, eats fish eggs and fry; usual lifespan 6–7 y, max ~30 |
| [FishBase — Carassius auratus](https://www.fishbase.se/summary/Carassius-auratus.html) | 1 | max 48 cm TL; pH 6.0–8.0, dH 5–19; omnivore (plankton, invertebrates, plants, detritus); several batches per season; cold winter needed for proper egg development; IUCN Least Concern |
| [Animal Diversity Web — Carassius auratus](https://animaldiversity.org/accounts/Carassius_auratus/) | 1 | 15–45 cm TL; social, schools; diet ~45% vegetation; typical 2,000–4,000 eggs; hatch 2–9 days; no parental care; adults eat eggs; captive lifespan 5–10 y, record 43 |
| [USFWS Ecological Risk Screening Summary — Goldfish (2025)](https://www.fws.gov/sites/default/files/documents/2025-01/ecological-risk-screening-summary-goldfish.pdf) | 1 | High invasion risk; hatch 3–10 days at ~15–25 °C; maturity from 8 months in culture; males chase females over plants; adhesive eggs; carries carp diseases |
| [PetMD — Goldfish Care Sheet (Melissa Witherell, DVM)](https://www.petmd.com/fish/goldfish-care-sheet) | 2 | 65–75 °F; ≥20 gal for one juvenile, far more for adults; filter turnover ≥4×/h; heavy waste producer |
| [Aquarium Co-Op — Goldfish Tank Mates](https://www.aquariumcoop.com/blogs/aquarium/goldfish-tank-mates) | 2 | avoid any fish small enough to fit in a goldfish’s mouth; cool 50–70 °F water clashes with tropical fish; spiny corydoras/otocinclus can choke goldfish |
| [The Goldfish Tank — Can goldfish and shrimp live together?](https://thegoldfishtank.com/goldfish-care/tank-mates/can-goldfish-and-shrimp-live-together/) | 3 | adult goldfish eat shrimp given the chance; comets are worse than fancies; shrimplets are eaten |
| [Wikipedia — Comet (goldfish)](https://en.wikipedia.org/wiki/Comet_(goldfish)) | 3 | developed in the USA in the 1880s (Hugo Mulertt); long, deeply forked single tail; best suited to ponds; sarasa and yellow colour forms |

**Explicit compatibility rules:**
- `tag:shrimp_dwarf` → floor `high_risk`, incident risk 0.35/day: Goldfish may eat these shrimp. Adults are often caught; shrimplets are at extreme risk. Dense cover reduces but never eliminates the risk.
- `tag:shrimp_fry` → floor `high_risk`, incident risk 0.8/day: Baby shrimp are at extreme predation risk around goldfish, even where adult shrimp survive.
- `fancy_goldfish` → floor `conditional`, incident risk 0.05/day: Fast comets outcompete slow fancy goldfish at feeding and can outgrow them; keep single-tails and fancies apart.

**Confidence & conflicts:**
- Tank size: retail listings say 20 gal; care sources and hobby guidance say 50–75 gal for the first single-tail plus ~40 per extra, or a pond. The game follows the conservative 75 gal.
- Recommended temperatures vary widely between sources (10–21, 18–24, 22–24 °C). The game uses 15–22 °C ideal; survival range (0–41 °C) is much wider than the tolerance band used here.
- Hatch time depends strongly on temperature (≈56 h at 24 °C; up to 9–10 days when cool). 32 game-hours ≈ 4 real days.
- Compressed time: ~8–12 months to maturity in culture = 18 game-days; 10–15+ year lifespan ≈ 480 game-days.

### Fancy Goldfish — *Carassius auratus* (`fancy_goldfish`)

**Key values used:** adult 16 cm · min tank 30 gal · 10–28 °C (ideal 18–23) · pH 6–8.4 (ideal 7–7.8) · GH 5–19 · KH 4–12 · group group (min 2, ideal 3) · breeding `egg_scatter_cover` · classes freshwater_cool · unlock `fw_coldwater` · conservation: Domestic breeds (wild species Least Concern); invasive where released.

| Source | Tier | Facts used |
|---|---|---|
| [FishBase — Carassius auratus](https://www.fishbase.se/summary/Carassius-auratus.html) | 1 | pH 6.0–8.0, dH 5–19; omnivore; egg scatterer; cold winter conditions egg development; IUCN Least Concern (wild species) |
| [PetMD — Swim Bladder Disease in Fish (Jessie Sanders, DVM)](https://www.petmd.com/fish/conditions/respiratory/swim-bladder-disorders-fish) | 2 | swim-bladder disorders especially common in round-bodied fancy goldfish; sinking or neutrally buoyant foods advised |
| [Aquarium Co-Op — Care Guide for Fancy Goldfish](https://www.aquariumcoop.com/blogs/aquarium/care-guide-for-fancy-goldfish) | 2 | 20 gal for the first + ≥10 per extra; wide tanks; 50–70 °F, no heater needed; dig and uproot plants; 30–50% water changes when nitrate > 50 ppm |
| [Aquarium Co-Op — Goldfish Tank Mates](https://www.aquariumcoop.com/blogs/aquarium/goldfish-tank-mates) | 2 | eat anything that fits in their mouth; white clouds and rosy barbs are much faster than fancy goldfish |
| [LiveAquaria — Oranda Goldfish](https://www.liveaquaria.com/product/957/?pcatid=957) | 2 | max ~10 in; 65–75 °F, pH 6.5–7.5; minimum 30 gal; wen develops from 3–4 months over ~2 years; red cap, calico, black, blue, chocolate colours |
| [PetSmart — How to Take Care of Your Fancy Goldfish](https://www.petsmart.com/learning-center/fish-care/how-to-take-care-of-your-fancy-goldfish/A0147.html) | 2 | some varieties grow to a foot; keep fancies only with other fancy goldfish; sinking food |
| [The Goldfish Tank — Can goldfish and shrimp live together?](https://thegoldfishtank.com/goldfish-care/tank-mates/can-goldfish-and-shrimp-live-together/) | 3 | fancies eat shrimp and certainly shrimplets, a little less than comets; slow, clumsy swimmers |
| [Wikipedia — List of goldfish varieties](https://en.wikipedia.org/wiki/List_of_goldfish_varieties) | 3 | fantail, ryukin, oranda, ranchu, telescope/black moor body types; calico = nacreous scales |

**Explicit compatibility rules:**
- `tag:shrimp_dwarf` → floor `high_risk`, incident risk 0.3/day: Goldfish may eat these shrimp. Adults are often caught; shrimplets are at extreme risk. Dense cover reduces but never eliminates the risk.
- `tag:shrimp_fry` → floor `high_risk`, incident risk 0.8/day: Baby shrimp are at extreme predation risk around goldfish, even where adult shrimp survive.
- `comet_goldfish` → floor `conditional`, incident risk 0.05/day: Slow fancy goldfish lose out to fast comets at feeding and may be outgrown and bullied at mealtimes.
- `white_cloud_minnow` → floor `conditional`, incident risk 0.03/day: Nimble white clouds reach food long before a fancy goldfish, and a large goldfish may swallow one.

**Confidence & conflicts:**
- Tank-size guidance varies (20 gal + 10 per fish vs 30 gal minimum); the game uses 30.
- White clouds as tank mates: PetMD recommends them, Aquarium Co-Op warns they are far faster than fancies — encoded as conditional.
- Body-type genetics are polygenic in reality; the ladder model is a playable simplification.
- Compressed time: maturity ~1–2 years = 20 game-days; hatch 2–9 days ≈ 32 game-hours; 10–15 year lifespan ≈ 400 game-days.

### Neon Tetra — *Paracheirodon innesi* (`neon_tetra`)

**Key values used:** adult 3.5 cm · min tank 10 gal · 20–28 °C (ideal 22–25) · pH 5–7.5 (ideal 6–7) · GH 1–12 · KH 1–8 · group school (min 6, ideal 12) · breeding `egg_scatter_cover` · classes freshwater_tropical, freshwater_planted · unlock `fw_basic` · conservation: Least Concern (IUCN 2021).

| Source | Tier | Facts used |
|---|---|---|
| [Seriously Fish — Paracheirodon innesi](https://www.seriouslyfish.com/species/paracheirodon-innesi/) | 2 | max 30 mm SL; 21–25 °C, pH 4.0–7.5, GH 1–12; breeding 26.5–29 °C, pH 5.5–6.5, GH 1–5; school of 8–10+; eggs hatch 24–36 h; fry free-swimming 3–4 days later; diamond head, gold, albino and long-fin forms; females rounder |
| [FishBase — Paracheirodon innesi](https://www.fishbase.se/summary/Paracheirodon-innesi.html) | 1 | 2.5 cm SL; 20–26 °C, pH 5.0–7.0; blackwater/clearwater Solimões tributaries; omnivore; IUCN Least Concern (2021) |
| [LiveAquaria — Neon Tetra](https://www.liveaquaria.com/products/neon-tetra) | 2 | 68–78 °F, pH 5.5–7.0, KH 4–8; 10 gal minimum; dense planting with low light; groups of 6+ |
| [PetMD — Tetra Care Sheet (Maria Zayas, DVM)](https://www.petmd.com/fish/tetra-fish-care-sheet) | 2 | 10+ gal; groups of at least 5–6; lifespan 2–4 y, some to 10 |
| [Aquarium Co-Op — Neon tetras vs cardinal tetras](https://www.aquariumcoop.com/blogs/aquarium/neon-tetras-and-cardinal-tetras) | 2 | neons prefer cooler water than cardinals; red only on the rear half vs full length in cardinals; mostly captive-raised; $1–2 |
| [Animal Diversity Web — Paracheirodon axelrodi (genus predators)](https://animaldiversity.org/accounts/Paracheirodon_axelrodi/) | 1 | Paracheirodon tetras are preyed on by angelfish; adults eat eggs |
| [Wikipedia — Neon tetra](https://en.wikipedia.org/wiki/Neon_tetra) | 3 | stripe fades at night (guanine crystals); maturity ~12 weeks; named after William T. Innes (1936); ~2 million sold monthly in the US |

**Confidence & conflicts:**
- Size: 2.5–3 cm SL vs ~4 cm TL; the game uses 3.5 cm total length.
- Clutch size lacks a solid Tier 1 figure (FishBase: "relatively few"); 60–130 is a hobby estimate.
- Lifespan: 2–3 years is typical for farmed fish, with reports up to 10; 200 game-days ≈ 5 years.
- Genetics of diamond head, gold and albino forms are undocumented; modelled as recessives.
- Compressed time: ~1–1.5 day hatch ≈ 10 game-hours; maturity (~3–5 months) = 10 game-days.

### Panda Corydoras — *Corydoras panda* (`panda_corydoras`)

**Key values used:** adult 5 cm · min tank 20 gal · 18–26 °C (ideal 21–24) · pH 6–7.8 (ideal 6.2–7.2) · GH 2–12 · KH 1–10 · group shoal (min 6, ideal 8) · breeding `substrate_spawner` · classes freshwater_tropical, freshwater_planted · unlock `fw_basic` · conservation: Near Threatened (IUCN).

| Source | Tier | Facts used |
|---|---|---|
| [Seriously Fish — Corydoras panda](https://www.seriouslyfish.com/species/corydoras-panda/) | 2 | 50 mm SL; 22–25 °C, pH 6.0–7.4, GH 1–12; upper Amazon, Peru; clear/blackwater over sand; group of 6+; clean river sand to protect barbels; T-position; hatch 3–5 days; virtually all captive-bred |
| [FishBase — Hoplisoma (Corydoras) panda](https://www.fishbase.se/summary/Corydoras-panda.html) | 1 | 20–25 °C, pH 6.0–8.0, dH 2–25; facultative air-breather; IUCN Near Threatened |
| [Aquarium Co-Op — Cory catfish care guide](https://www.aquariumcoop.com/blogs/aquarium/cory-catfish-care-guide) | 2 | 20 gal+; groups of 6+ of one species; sinking foods; not algae eaters; cool water changes trigger spawning; mildly venomous fin spines |
| [LiveAquaria — Panda Cory Cat](https://www.liveaquaria.com/product/934/?pcatid=934) | 2 | 72–79 °F, pH 5.8–7.0, dKH 2–12; smooth substrate; planted with hiding places |
| [The Shrimp Farm — Panda Corydoras care](https://www.theshrimpfarm.com/posts/panda-corydoras-care/) | 2 | prefers cooler water; groups of 8+; sensitive to nitrate and water swings |
| [Wikipedia — Hoplisoma panda](https://en.wikipedia.org/wiki/Hoplisoma_panda) | 3 | 55 mm SL; Peru and Ecuador; up to ~25 eggs per spawning; hatch ~3–4 days at 22 °C; named for panda-like markings |
| [Kordon — Malachite Green label (sensitive species warning)](https://www.kordon.com/kordon/products/chemical-preventatives-and-treatments-2/malachite-green) | 2 | catfish, loaches and scaleless fish are medication-sensitive |

**Explicit compatibility rules:**
- `tag:goldfish` → floor `high_risk`, incident risk 0.03/day: A goldfish that tries to swallow a corydoras can choke on its locking fin spines — and the two need different temperatures.

**Confidence & conflicts:**
- Temperature: sources range from a cool 65–68 °F (The Shrimp Farm) to 72–79 °F (LiveAquaria); the game uses 21–24 °C ideal.
- Minimum tank size varies from 11 to 30 gallons; 20 is used.
- Maturity and lifespan lack panda-specific Tier 1/2 data (genus typical: ~1 year to maturity, 5–10 year lifespan).
- Taxonomy: recently moved to Hoplisoma panda; the roster keeps the familiar Corydoras name.
- Compressed time: 3–5 day hatch ≈ 32 game-hours; ~7 year lifespan ≈ 280 game-days.

### Mystery Snail — *Pomacea diffusa* (`mystery_snail`)

**Key values used:** adult 5 cm · min tank 5 gal · 16–30 °C (ideal 21–26) · pH 7–8.5 (ideal 7.2–8) · GH 8–18 · KH 3–15 · group colony (min 1, ideal 2) · breeding `snail_egg_clutch` · classes freshwater_tropical, freshwater_planted · unlock `fw_basic` · conservation: Not evaluated; established invasive populations outside its range.

| Source | Tier | Facts used |
|---|---|---|
| [USGS Nonindigenous Aquatic Species — spike-topped applesnail (Pomacea diffusa)](https://nas.er.usgs.gov/queries/factsheet.aspx?SpeciesID=2662) | 1 | shell up to ~60 mm; native to the Amazon basin; separate sexes; clutches of 200–600 eggs laid above the waterline; ~2.4 mm hatchlings; gill and lung; established in Florida |
| [USFWS Ecological Risk Screening Summary — Spike-topped Applesnail (2017)](https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Spike-topped-Applesnail.pdf) | 1 | shell 40–70 mm; hatch in 2–3 weeks; lives ~3 y at 20–21 °C but ~2 y at 25 °C+; eats other snails’ eggs in lab studies; established in Florida, Alabama, Cuba, Australia, Sri Lanka; risk Uncertain |
| [UF/IFAS EDIS IN598 — Applesnails of Florida](https://ask.ifas.ufl.edu/publication/IN598) | 1 | Pomacea cannot withstand water below 10 °C; only Pomacea allowed in interstate trade under USDA permit; feeds on decaying vegetation and biofilm |
| [Aquarium Co-Op — Care Guide for Mystery Snails](https://www.aquariumcoop.com/blogs/aquarium/mystery-snail) | 2 | 21–26 °C; pH ≥ 7.2, GH ≥ 8; 5 gal minimum; does not eat healthy plants (except duckweed); lowering the water line prevents laying; harmed by puffers, loaches |
| [Applesnail.net — Pomacea diffusa](https://applesnail.net/content/species/pomacea_diffusa.htm) | 2 | shell 45–65 mm; diet of decaying plants and aufwuchs; clutch size |
| [Donya Quick — Color Genetics of Pomacea diffusa](https://www.donyaquick.com/color-genetics-of-pomacea-diffusa/) | 3 | body pigment, shell ground colour and banding are simple Mendelian traits; named colour forms |

**Confidence & conflicts:**
- Plant eating is disputed: one study found Pomacea diffusa ate Cabomba, two others found it barely touched plants. Set to mostly_safe.
- No Tier 1 figure for age at maturity; hobby estimates run from 3 to 12 months. The game uses a fast 10 game-days.
- Sex cannot be determined from outside (sexVisibleAtDays = lifespan). Females reveal themselves by laying.
- Lifespan is temperature-dependent (≈2 y warm, ≈3 y cool); 90 game-days ≈ 2¼ years.
- Taxonomy: often mis-sold as P. bridgesii; some hobby data may mix the two.

### Nerite Snail — *Neritina natalensis* (`nerite_snail`)

**Key values used:** adult 2.5 cm · min tank 5 gal · 18–29 °C (ideal 22–26) · pH 6.5–8.5 (ideal 7.2–8) · GH 6–18 · KH 4–15 · group colony (min 1, ideal 2) · breeding `not_in_game` · classes freshwater_tropical, freshwater_planted · unlock `fw_basic` · conservation: Near Threatened (IUCN 2009).

| Source | Tier | Facts used |
|---|---|---|
| [Aquarium Co-Op — Nerite snail care guide](https://www.aquariumcoop.com/blogs/aquarium/nerite-snail) | 2 | 1.3–3.8 cm; pH above 7.0; eats algae and biofilm; plant-safe; escape artist; white egg capsules do not hatch in freshwater; larvae need brackish water and months of acclimation; 1–2 year lifespan |
| [Aquatic Arts — Zebra Nerite Snail Care Guide](https://aquaticarts.com/pages/zebra-nerite-snail-care-guide) | 2 | 18–29 °C; pH 6.5–8.5; GH/KH moderate to high; eggs need brackish water (SG 1.005–1.015); highly copper-sensitive; avoid cichlids |
| [Aquatic Arts — Zebra Nerite Snail (product page)](https://aquaticarts.com/products/zebra-nerite-snails) | 2 | adults 1–1.5 in; 5 gal minimum; wild-collected stock; ~$2–4 each |
| [Wikipedia — Vittina natalensis (cites IUCN 2009)](https://en.wikipedia.org/wiki/Vittina_natalensis) | 3 | ~2.5 cm; East African coastal rivers and estuaries; Near Threatened (IUCN 2009); formerly Neritina natalensis; 22–26 °C |
| [AquariumBreeder — Nerite snails: care, diet and breeding](https://aquariumbreeder.com/nerite-snails-detailed-guide-care-diet-and-breeding/) | 3 | GH 7–15, KH 5–12; veliger larvae; metamorphosis ~68 days in a related species; eats only dead plant tissue; avoid puffers, crayfish, assassin snails |

**Confidence & conflicts:**
- Current accepted name is Vittina natalensis; the roster keeps the trade name Neritina natalensis.
- Egg-capsule contents ("dozens of eggs") are well supported; exact counts come from a related species.
- Breeding is marked not_in_game because the larvae need brackish rearing, which the first build does not model.
- Sex cannot be determined from outside (sexVisibleAtDays = lifespan).
- Compressed time: ~2 year lifespan ≈ 80 game-days.

### Fancy Guppy — *Poecilia reticulata* (`fancy_guppy`)

**Key values used:** adult 4 cm · min tank 10 gal · 18–28 °C (ideal 23–26) · pH 6.8–8.5 (ideal 7–8) · GH 8–30 · KH 4–15 · group group (min 3, ideal 6) · breeding `livebearer` · classes freshwater_tropical, freshwater_planted · unlock `fw_basic` · conservation: Least Concern (IUCN 2020).

| Source | Tier | Facts used |
|---|---|---|
| [Seriously Fish — Poecilia reticulata](https://www.seriouslyfish.com/species/poecilia-reticulata/) | 2 | 60 mm SL max; 17–28 °C, pH 7.0–8.5, GH 8–30; gestation 4–6 weeks; 5–100 fry; adults eat fry; avoid fin-nippers; fancy strains less hardy |
| [FishBase — Poecilia reticulata](https://www.fishbase.se/summary/Poecilia-reticulata.html) | 1 | 18–28 °C, pH 7.0–8.0, dH 9–19; native to NE South America and the Caribbean; brood 20–40 roughly every 4 weeks; sperm storage; widely introduced for mosquito control; IUCN Least Concern (2020) |
| [Aquarium Co-Op — Guppy care guide](https://www.aquariumcoop.com/blogs/aquarium/guppy-care-guide) | 2 | 76–78 °F recommended; lifespan ~18 months at 82 °F vs 3.5+ y at 72 °F; hard water; 1 male to 2–3 females; gestation ~28–30 days; avoid goldfish and fin-nippers |
| [PetMD — Guppy Care Sheet (Maria Zayas, DVM)](https://www.petmd.com/fish/guppy-fish-care-sheet) | 2 | 72–82 °F, pH 6.8–7.8; 5 gal + 2 per extra fish; groups of 3+; 2–3 year lifespan |
| [UF/IFAS EDIS FA054 — Freshwater Ornamental Fish Commonly Cultured in Florida](https://ask.ifas.ufl.edu/publication/FA054) | 1 | guppies are a foundation species of Florida ornamental aquaculture; livebearer biology |
| [Diana Walstad — Breeding Guppies: Genetic Pitfalls and Successes (2022)](https://dianawalstad.com/wp-content/uploads/2022/03/guppy-genetics-2022.pdf) | 3 | tuxedo (Bcp) and snakeskin (Sst/Ssb) are dominant; Asian blau / grass genetics; ribbon males cannot inseminate; many colour genes Y-linked |
| [Chesapeake Guppy Club — IFGA show classes](https://chesapeakeguppyclub2004.wordpress.com/ifgashowclases/) | 3 | delta 55–75°, veiltail 40–50°; sword classes; albinos require red eyes |

**Explicit compatibility rules:**
- `endlers_livebearer` → floor `conditional`, incident risk 0/day: Guppies and Endler’s livebearers interbreed and produce fertile hybrids — keep them apart to preserve pure lines.

**Confidence & conflicts:**
- Gestation: 21–30 days (hobby) vs 4–6 weeks (Seriously Fish/FishBase). The game uses 28 days (224 game-hours).
- Brood size: 20–40 typical (FishBase) up to ~100 in large females; 5–60 used.
- Genetics are deliberately simplified: real guppy colour and tail traits are polygenic and often sex-linked.
- Compressed time: maturity ~2–3 months = 8 game-days; 2–3 year lifespan ≈ 100 game-days.

### Endler's Livebearer — *Poecilia wingei* (`endlers_livebearer`)

**Key values used:** adult 3 cm · min tank 10 gal · 20–30 °C (ideal 24–27) · pH 6.5–8.5 (ideal 7–8) · GH 8–30 · KH 4–15 · group group (min 3, ideal 6) · breeding `livebearer` · classes freshwater_tropical, freshwater_planted · unlock `fw_basic` · conservation: Endangered (IUCN 2021).

| Source | Tier | Facts used |
|---|---|---|
| [Seriously Fish — Poecilia wingei](https://www.seriouslyfish.com/species/poecilia-wingei/) | 2 | males 25 mm SL; 24–30 °C, pH 7.0–8.5, GH 15–35; broods every 23–24 days, 5–25 fry; males colour at 3–5 weeks, females breed at ~2 months; adults rarely eat young; do not house with guppies; Laguna de Patos habitat lost |
| [FishBase — Poecilia wingei](https://www.fishbase.se/summary/Poecilia-wingei.html) | 1 | NE Venezuela (Cumaná area, Paria); IUCN Endangered B1ab(iii,v) (2021) |
| [Aquarium Co-Op — Endler’s livebearer care guide](https://www.aquariumcoop.com/blogs/aquarium/endlers-livebearer-care-guide) | 2 | males ~1 in, females ~1.8 in; pH 6.5–8.5; 5–10 gal minimum; 1 male to 2–3 females; gestation 23–30 days; interbreed with guppies |
| [Schories, Meyer & Schartl 2009 — Zootaxa 2266 (P. obscura; remarks on P. wingei)](https://www.biotaxa.org/Zootaxa/article/view/zootaxa.2266.1.2) | 1 | P. wingei is a valid species in subgenus Acanthophacelus with P. reticulata and P. obscura |
| [Wikipedia — Poecilia wingei](https://en.wikipedia.org/wiki/Poecilia_wingei) | 3 | most pet-shop Endlers are guppy hybrids; named after Øjvind Winge; rediscovered by John Endler in 1975 |
| [Marty’s Fish — AdrianHD’s contributions to Endler strains](https://martysfish.com/adrianhds-contributions-to-endlers-livebearer-strains-variations/) | 3 | black bar, red chest, peacock, lime green and other N-class lines |
| [Gensou — Endler colour varieties](https://gensou.sg/endler-livebearer-colour-varieties/) | 3 | N/P/K class system; tiger and El Silverado descriptions |

**Explicit compatibility rules:**
- `fancy_guppy` → floor `conditional`, incident risk 0/day: Endler’s livebearers and guppies interbreed and produce fertile hybrids, ending pure Endler lines. Keep them in separate tanks.

**Confidence & conflicts:**
- Fry predation: Seriously Fish says adults rarely eat young; Aquarium Co-Op says they do. Modelled as moderate (0.35), lower than guppies.
- Hardness: Seriously Fish GH 15–35 vs Co-Op "almost any GH"; the game tolerates GH 8–30.
- Lifespan has no Tier 1/2 figure (hobby: 2–5 years); 100 game-days ≈ 2½ years.
- Line colours are described from breeder sources (Tier 3); hex values are approximations.
- Compressed time: ~23.5 day gestation ≈ 188 game-hours; very fast maturity = 6 game-days.

### Amano Shrimp — *Caridina multidentata* (`amano_shrimp`)

**Key values used:** adult 4.5 cm · min tank 10 gal · 18–28 °C (ideal 21–26) · pH 6–8 (ideal 6.5–7.5) · GH 5–15 · KH 1–10 · group group (min 1, ideal 5) · breeding `shrimp_larval_marine` · classes freshwater_tropical, freshwater_planted, freshwater_cool · unlock `fw_basic` · conservation: Least Concern (IUCN).

| Source | Tier | Facts used |
|---|---|---|
| [Aquarium Co-Op — Care Guide for Amano Shrimp](https://www.aquariumcoop.com/blogs/aquarium/amano-shrimp) | 2 | 4–5 cm; pH 6–8; hair, thread and black beard algae eater; expert escaper; does not breed in a normal tank (larvae need salt water); avoid goldfish, cichlids, barbs; named after Takashi Amano |
| [Larval performance of three amphidromous Caridina species — Crustacean Research 50 (2021)](https://www.jstage.jst.go.jp/article/crustacea/50/0/50_41/_article) | 1 | amphidromous life cycle; larvae tolerate 17–34 ppt salinity |
| [Habitat selection and copper toxicity in Caridina multidentata — Journal of Crustacean Biology 45(2) (2025)](https://academic.oup.com/jcb/article/45/2/ruaf020/8127312) | 1 | prefers current, avoids light; copper LC50 1.15 mg/L; sublethal copper impairs food detection |
| [The Shrimp Farm — Amano Shrimp care sheet](https://www.theshrimpfarm.com/posts/amano-shrimp-care-sheet/) | 2 | up to ~5 cm; 21–27 °C; pH 6.5–8.0, GH 5–15, KH 1–10; incubation 4–6 weeks; larval rearing SG 1.012–1.019; 3–5 year lifespan |
| [Wikipedia — Caridina multidentata](https://en.wikipedia.org/wiki/Caridina_multidentata) | 3 | native to Japan and Taiwan; IUCN Least Concern; formerly C. japonica (renamed 2006); sex differences in markings |

**Confidence & conflicts:**
- Size: 2.5–3.5 cm (Wikipedia) vs 4–5 cm (retailers); the game uses 4.5 cm (females larger).
- Lifespan: 2–3 vs 3–5 years across retailer pages; 110 game-days ≈ 2¾ years.
- Egg counts (hundreds to ~2,000) come from secondary summaries of the primary literature.
- Plant nibbling is reported by keepers for underfed amanos (Tier 3); set to mostly_safe.
- Trade stock is a mix of farm-raised and wild-collected animals; exact proportions are unclear.
- Compressed time: 4–5 week incubation ≈ 240 game-hours; ~40 day larval phase ≈ 320 game-hours.

### Otocinclus — *Otocinclus vittatus* (`otocinclus`)

**Key values used:** adult 4 cm · min tank 10 gal · 20–27 °C (ideal 22–25) · pH 5.5–7.5 (ideal 6–7.2) · GH 2–15 · KH 1–10 · group shoal (min 6, ideal 8) · breeding `substrate_spawner` · classes freshwater_tropical, freshwater_planted · unlock `fw_intermediate` · conservation: Least Concern (IUCN 2020).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase — Otocinclus vittatus](https://www.fishbase.se/summary/Otocinclus-vittatus.html) | 1 | 3.3 cm TL; 20–25 °C, pH 6.0–7.5, dH 2–18; Amazon, Orinoco, Paraná/Paraguay basins; facultative air-breather; IUCN Least Concern (2020) |
| [Seriously Fish — Otocinclus macrospilus](https://www.seriouslyfish.com/species/otocinclus-macrospilus/) | 2 | 35 mm SL; 21–26 °C, pH 5.5–7.5, GH 1–12; groups of 6+; almost all wild-caught; shy; outcompeted at feeding; T-position spawning |
| [Aquarium Co-Op — Otocinclus care guide](https://www.aquariumcoop.com/blogs/aquarium/otocinclus-catfish) | 2 | needs an established tank with algae and biofilm; supplement with vegetables and algae wafers; a few plump otos beat a starving school; 30–40 eggs; hatch ~3 days |
| [Practical Fishkeeping — Keeping Otocinclus catfish](https://www.practicalfishkeeping.co.uk/features/keeping-otocinclus-catfish-in-the-aquarium/) | 2 | 22–28 °C; high import mortality; trade O. affinis is usually O. vittatus/macrospilus; female places eggs singly |
| [Aquatic Arts — Otocinclus (tank-bred)](https://aquaticarts.com/products/otocinclus-catfish-tank-bred) | 2 | tank-bred otos are more durable; groups of 6+; plant-safe; ~$7 each |
| [Kordon — Malachite Green label (sensitive species warning)](https://www.kordon.com/kordon/products/chemical-preventatives-and-treatments-2/malachite-green) | 2 | catfish and scaleless fish are medication-sensitive |

**Explicit compatibility rules:**
- `tag:goldfish` → floor `high_risk`, incident risk 0.03/day: A goldfish that tries to swallow an otocinclus can choke on its spines — and the two need different temperatures.

**Confidence & conflicts:**
- Trade identity is confused (O. vittatus, O. macrospilus and others sold as "O. affinis"); values span the commonly traded species.
- Group size: Seriously Fish says 6+, Aquarium Co-Op warns that a starving group is worse than a few well-fed fish — the mature-tank requirement encodes this.
- Maturity and lifespan lack Tier 1/2 data (hobby: 3–5 years); 160 game-days ≈ 4 years.
- requiresMatureDays = 14 game-days is a gameplay abstraction for "established biofilm".

### White Cloud Mountain Minnow — *Tanichthys albonubes* (`white_cloud_minnow`)

**Key values used:** adult 4 cm · min tank 10 gal · 5–25 °C (ideal 16–22) · pH 6–8.5 (ideal 6.5–7.8) · GH 5–20 · KH 2–12 · group school (min 6, ideal 10) · breeding `egg_scatter_cover` · classes freshwater_cool, freshwater_planted · unlock `fw_basic` · conservation: Data Deficient (IUCN 2010); nationally protected in China.

| Source | Tier | Facts used |
|---|---|---|
| [FishBase — Tanichthys albonubes](https://www.fishbase.se/summary/Tanichthys-albonubes.html) | 1 | 4.0 cm TL; 18–22 °C nominal, survives to 5 °C; pH 6.0–8.0, dH 5–19; not recorded in the wild 1980–2001; IUCN Data Deficient (2010); groups of 5+ |
| [USGS Nonindigenous Aquatic Species — White Cloud Mountain Minnow](https://nas.er.usgs.gov/queries/FactSheet.aspx?SpeciesID=2784) | 1 | discovered 1932 near Guangzhou; clear, shallow, slow, weedy brooks; egg scatterer, spawns March–October; aquarium releases recorded in Georgia and Hawaii |
| [USFWS Ecological Risk Screening Summary — White Cloud Mountain Fish (rev. 2019)](https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-White-Cloud-Mountain-Fish.pdf) | 1 | wild population rediscovered 2003; captive-bred reintroductions near Guangzhou; relict populations in Guangdong, Hainan and Vietnam |
| [Yi et al. 2004 — Rediscovering the wild population of White Cloud Mountain minnows (Zoological Research)](https://www.zoores.ac.cn/article/id/2426) | 1 | wild population rediscovered in a spring-fed mountain pool near Guangzhou |
| [Seriously Fish — Tanichthys albonubes](https://www.seriouslyfish.com/species/tanichthys-albonubes/) | 2 | 40 mm SL; 14–22 °C; permanently warm water shortens life; pH 6.0–8.5, GH 5–20; very peaceful; males spar; eggs hatch 48–60 h; golden, long-fin, albino forms |
| [Aquarium Co-Op — White Cloud Mountain Minnow care](https://www.aquariumcoop.com/blogs/aquarium/white-cloud-mountain-minnow-care) | 2 | 65–77 °F, no heater needed; 10 gal minimum, groups of 6+; adults do not tend to eat their babies; good with cool-water fish and shrimp |
| [Wikipedia — White Cloud Mountain minnow](https://en.wikipedia.org/wiki/White_Cloud_Mountain_minnow) | 3 | named after Tan Kam Fei; sold as the “poor man’s neon”; meteor/long-fin form; lifespan 5+ years |

**Confidence & conflicts:**
- IUCN status: FishBase shows Data Deficient (2010); Seriously Fish says not evaluated. The Red List page could not be checked directly.
- Upper temperature: 22 °C (Seriously Fish) vs 25 °C (Aquarium Co-Op); the game tolerates 25 °C with an ideal of 16–22 °C.
- Genetic work suggests "T. albonubes" may be a complex of several cryptic species.
- Lifespan and maturity lack Tier 1 data (hobby: 3–5+ years, 6–12 months); 160 game-days ≈ 4 years.
- Golden and long-fin inheritance modelled as recessive and dominant respectively (not formally documented).

### Medaka Ricefish — *Oryzias latipes* (`medaka`)

**Key values used:** adult 3.5 cm · min tank 10 gal · 4–32 °C (ideal 18–26) · pH 6.5–8.5 (ideal 7–8) · GH 5–25 · KH 3–15 · group shoal (min 6, ideal 10) · breeding `egg_scatter_cover` · classes freshwater_cool, freshwater_planted, freshwater_tropical · unlock `fw_basic` · conservation: Least Concern (IUCN 2018); Vulnerable on Japan’s national Red List.

| Source | Tier | Facts used |
|---|---|---|
| [FishBase — Oryzias latipes](https://www.fishbase.se/summary/Oryzias-latipes.html) | 1 | max 4.0 cm SL; 18–24 °C, pH 7.0–8.0, dH 9–19; Japan, Korea, China, Vietnam; IUCN Least Concern (2018) |
| [UNSW Embryology — Medaka development (Iwamatsu 2004 staging)](https://embryology.med.unsw.edu.au/embryology/index.php?title=Medaka_Development) | 1 | 39 developmental stages; hatching ~9 days at 26 °C; first vertebrates to mate in space (IML-2, 1994) |
| [Kondo et al. 2025 — Medaka initiate courtship and spawning late at night (PLOS ONE)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11819472/) | 1 | wild courtship peaks 01:00–03:00; daily spawning; female carries eggs then attaches them to plants |
| [Niwa — A manual for large-scale breeding of medaka (medaka-book.org)](https://medaka-book.org/contents/chapter02/Appendix2_1.pdf) | 1 | lab colonies 25–28 °C, 14 h light; long-lived rooms ~20 °C |
| [NIES Invasive Species Database (Japan) — Oryzias latipes](https://www.nies.go.jp/biodiversity/invasive/DB/detail/50910e.html) | 1 | native range in Japan; Japan Red Data Book: Vulnerable; released non-local/domestic medaka contaminate wild gene pools |
| [Seriously Fish — Oryzias latipes](https://www.seriouslyfish.com/species/oryzias-latipes/) | 2 | 36 mm SL; 16–22 °C, pH 6.5–8.5, GH 5–25; groups of 8+; incubation 1–3 weeks depending on temperature; male fins longer |
| [Aquarium Co-Op — Medaka rice fish care](https://www.aquariumcoop.com/blogs/aquarium/medaka-rice-fish) | 2 | 60–75 °F, unheated tanks and ponds; may jump — lid needed; groups of 6+; good with white clouds, hillstream loaches, shrimp; eggs carried then attached to plants; 1–5 year lifespan |
| [Tokyo Aqua Garden — Medaka varieties](https://tokyoaquagarden.com/medaka-varieties) | 3 | himedaka, youkihi, shiro, ao, miyuki, lamé, hire-naga, dharma descriptions |

**Confidence & conflicts:**
- Temperature: medaka tolerate roughly 0–40 °C; aquarium guidance ranges from 16–22 °C (Seriously Fish) to 25–28 °C in labs. The game uses 18–26 °C ideal.
- Incubation strongly depends on temperature (~250 degree-days); 80 game-hours ≈ 10 days at 25 °C.
- Development above ~27 °C can sex-reverse genetic females into males (lab finding) — not modelled.
- Inheritance of youkihi, miyuki, lamé, hire-naga and dharma is simplified; b and r follow the classic medaka genetics.
- Compressed time: maturity ~2–4 months = 8 game-days; 2–4 year lifespan ≈ 120 game-days.

### Honey Gourami — *Trichogaster chuna* (`honey_gourami`)

**Key values used:** adult 5 cm · min tank 10 gal · 22–29 °C (ideal 24–27) · pH 6–8 (ideal 6.5–7.5) · GH 2–15 · KH 2–10 · group group (min 1, ideal 4) · breeding `bubble_nest` · classes freshwater_tropical, freshwater_planted · unlock `fw_basic` · conservation: Least Concern (IUCN 2009).

| Source | Tier | Facts used |
|---|---|---|
| [Seriously Fish — Trichogaster chuna](https://www.seriouslyfish.com/species/trichogaster-chuna/) | 2 | 55 mm SL; 22–27 °C, pH 6.0–7.5, GH 2–15; India, Bangladesh, Nepal; groups of 4–6; avoid fin-nippers and boisterous feeders; bubble nest; eggs hatch 24–36 h; male/female colours; water-spitting |
| [FishBase — Trichogaster chuna](https://www.fishbase.se/summary/Trichogaster-chuna.html) | 1 | 22–28 °C, pH 6.0–8.0, dH 5–19; IUCN Least Concern (2009) |
| [Aquarium Co-Op — Honey gourami care guide](https://www.aquariumcoop.com/blogs/aquarium/honey-gourami) | 2 | 74–82 °F; 5–10 gal for one, 20 gal for three; labyrinth organ; bettas only if non-aggressive; eats baby shrimp; gold and red forms; $5–10 |
| [LiveAquaria — Honey Dwarf Gourami](https://www.liveaquaria.com/product/992/?pcatid=992) | 2 | 72–78 °F, pH 6.0–8.0, KH 4–10; 10 gal; needs surface access; territorial when spawning |
| [UF/IFAS EDIS FA054 — Freshwater Ornamental Fish Commonly Cultured in Florida](https://ask.ifas.ufl.edu/publication/FA054) | 1 | labyrinth fish breathe air; bubble-nest builders; male guards eggs |
| [Aqulator — Can honey gouramis live with bettas?](https://www.aqulator.com/articles/can-honey-gourami-live-with-bettas/) | 3 | male betta and honey gourami may fight over the surface/nest sites |

**Explicit compatibility rules:**
- `betta` → floor `conditional`, incident risk 0.1/day: Two labyrinth fish that both claim the surface: a male betta and a honey gourami may fight over nest sites.

**Confidence & conflicts:**
- FishBase’s 13.7 cm TL maximum is almost certainly an error; other sources agree on ~5.5 cm.
- Upper temperature: LiveAquaria 25.5 °C vs others 28 °C; the game tolerates up to 29 °C with 24–27 °C ideal.
- Lifespan is poorly sourced (hobby: 2–5+ years); 170 game-days ≈ 4 years.
- Colour-form genetics are undocumented; the ladder is a playable simplification.

### Kuhli Loach — *Pangio kuhlii* (`kuhli_loach`)

**Key values used:** adult 9 cm · min tank 20 gal · 21–28 °C (ideal 24–26) · pH 5.5–7.5 (ideal 6–7) · GH 0–12 · KH 0–8 · group shoal (min 5, ideal 8) · breeding `egg_scatter_cover` · classes freshwater_tropical, freshwater_planted · unlock `fw_intermediate` · conservation: Least Concern (IUCN).

| Source | Tier | Facts used |
|---|---|---|
| [Seriously Fish — Pangio semicincta](https://www.seriouslyfish.com/species/pangio-semicincta/) | 2 | trade kuhli is almost always P. semicincta; 100 mm SL; 21–26 °C, pH 3.5–7.0, GH 0–8; groups of 5–6+; soft sand; burrows; tight lid, jumps; may prey on eggs or fry; breeding reports vague |
| [FishBase — Pangio kuhlii](https://www.fishbase.se/summary/Pangio-kuhlii.html) | 1 | 12 cm TL; 24–30 °C, pH 5.5–6.5; facultative air-breather; IUCN Least Concern (2019) |
| [Practical Fishkeeping — Keeping kuhli and other eel loaches](https://www.practicalfishkeeping.co.uk/features/keeping-kuhli-and-other-eel-loaches-in-the-aquarium/) | 2 | 22–26 °C, pH 6–7; groups of 10 ideal; squeeze into the tiniest gaps, filters and powerheads; only P. oblonga and P. doriae bred at home |
| [Aquarium Co-Op — Kuhli loach care guide](https://www.aquariumcoop.com/blogs/aquarium/kuhli-loach-care-guide) | 2 | 3–4 in; 23–27 °C; 20 gal for 3–6; nocturnal and shy; not documented to eat shrimp, snails or plants |
| [Aquatic Arts — Striped Kuhli Loach](https://aquaticarts.com/products/kuhli-loach) | 2 | 24–28 °C, pH 6.0–7.5; groups of 5+; 20 gal |
| [Wikipedia — Kuhli loach](https://en.wikipedia.org/wiki/Kuhli_loach) | 3 | 10–15 dark bars on salmon-pink to yellow; a few hundred greenish eggs among floating-plant roots; lifespan up to ~14 years; named after Heinrich Kuhl |
| [Kordon — Malachite Green label (sensitive species warning)](https://www.kordon.com/kordon/products/chemical-preventatives-and-treatments-2/malachite-green) | 2 | loaches and scaleless fish are medication-sensitive |

**Confidence & conflicts:**
- Trade identity: nearly all "kuhlis" are P. semicincta; the roster keeps the familiar P. kuhlii name.
- Temperature: Seriously Fish 21–26 °C vs FishBase/Wikipedia 24–30 °C; the game uses 24–26 °C ideal.
- Minimum group: 5 (Seriously Fish) vs 10 (Practical Fishkeeping); the game uses 5 minimum, 8 ideal.
- Breeding data are very thin; incubation time is an estimate.
- Compressed time: ~10 year lifespan ≈ 400 game-days.

### Reticulated Hillstream Loach — *Sewellia lineolata* (`hillstream_loach`)

**Key values used:** adult 6 cm · min tank 20 gal · 16–26 °C (ideal 19–23) · pH 6–7.8 (ideal 6.5–7.5) · GH 2–12 · KH 2–8 · group group (min 3, ideal 6) · breeding `egg_scatter_cover` · classes freshwater_cool, freshwater_planted · unlock `fw_intermediate` · conservation: Vulnerable (IUCN 2010).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase — Sewellia lineolata](https://www.fishbase.se/summary/Sewellia-lineolata.html) | 1 | 5.7 cm SL; fast, rocky streams incl. waterfalls; grazes aufwuchs; IUCN Vulnerable (2010) |
| [Seriously Fish — Sewellia lineolata](https://www.seriouslyfish.com/species/sewellia-lineolata) | 2 | 65 mm SL; 20–24 °C, pH 6.0–7.5, GH 1–10; turnover 15–20×/h; groups of 6+; males spar harmlessly; tight lid; easiest loach to breed, often accidental |
| [Aquarium Co-Op — Care Guide for Hillstream Loaches](https://www.aquariumcoop.com/blogs/aquarium/hillstream-loaches) | 2 | 65–80 °F acceptable, stress at warm end; keep one or three+, never two; shrimp-safe; ~$15 |
| [Aquarium Co-Op — Goldfish Tank Mates](https://www.aquariumcoop.com/blogs/aquarium/goldfish-tank-mates) | 2 | hillstream loaches grip glass too tightly for goldfish to pluck off; share cool water |
| [TFH Magazine — Going with the Flow: Hillstream Loach Care (M. Hellweg)](https://www.tfhmagazine.com/articles/freshwater/hillstream-loach-care) | 2 | room temperature, no heater; long, shallow tanks; bright light for aufwuchs; singles languish; one planted tank produced 200+ juveniles |
| [Loaches Online — Sewellia lineolata: easy to spawn or a lot of luck? (E. Bodrock)](https://www.loaches.com/articles/sewellia-lineolata-the-reticulated-hillstream-loach-easy-to-spawn-or-a-whole-lot-of-luck) | 3 | ~20 tiny white eggs; fry 1–2 mm, ~1 cm by day 41; adults eat eggs and fry; sexing by pectoral tubercles |

**Confidence & conflicts:**
- Native range: central coastal Vietnam (Seriously Fish, Wikipedia) vs Mekong basin (FishBase).
- Temperature ceiling: 24 °C (Seriously Fish) vs 27 °C (Aquarium Co-Op); warm, poorly oxygenated water is a common cause of losses. Treated as a cool-water, high-oxygen species.
- Group advice conflicts (6+ vs "one or three+"); both are reflected.
- Lifespan and incubation have no reliable figure (hobby: 8–10 years); 280 game-days ≈ 7 years, low confidence.

### Bristlenose Pleco — *Ancistrus cf. cirrhosus* (`bristlenose_pleco`)

**Key values used:** adult 12 cm · min tank 25 gal · 20–28 °C (ideal 23–26) · pH 5.5–7.8 (ideal 6.5–7.5) · GH 1–15 · KH 1–10 · group solitary_or_pair (min 1, ideal 2) · breeding `cave_spawner` · classes freshwater_tropical, freshwater_planted · unlock `fw_intermediate` · conservation: Least Concern (A. cirrhosus, IUCN 2020); trade form not assessable.

| Source | Tier | Facts used |
|---|---|---|
| [Seriously Fish — Ancistrus sp. ‘3’ (A. cf. cirrhosus)](https://www.seriouslyfish.com/species/ancistrus-cf-cirrhosus/) | 2 | 125 mm SL; 21–26 °C, pH 5.5–7.5, GH 1–15; all hobby fish commercially produced, uncertain origin; territorial with conspecifics; male broods eggs in a cave; albino, long-fin, piebald, xanthic forms |
| [USGS Nonindigenous Aquatic Species — Bristlenosed catfish (Ancistrus sp.)](https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=2598) | 1 | ~15 cm; feral in Florida, Hawaii and Utah; male guards eggs; males have head tentacles |
| [FishBase — Ancistrus cirrhosus](https://www.fishbase.se/summary/Ancistrus-cirrhosus.html) | 1 | true A. cirrhosus 9.1 cm SL, Paraná basin; facultative air-breather; IUCN Least Concern (2020) |
| [Aquarium Co-Op — Bristlenose pleco care guide](https://www.aquariumcoop.com/blogs/aquarium/bristlenose-pleco-care-guide) | 2 | 4–6 in; 74–80 °F; 20–29 gal+; needs more than algae; fine with almost any peaceful community fish; clutches of 30–80; males larger with bristles |
| [LiveAquaria — Bushy Nose Pleco](https://www.liveaquaria.com/product/1039/?pcatid=1039) | 2 | 72–79 °F, pH 6.5–7.4; 30 gal; caves and driftwood |
| [German & Bittong 2009 — Digestive enzyme activities of wood-eating catfishes (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC2762538/) | 1 | “wood-eating” loricariids are detritivores that do not digest wood |
| [Gensou — Bristlenose pleco colour morphs guide](https://gensou.sg/bristlenose-pleco-colour-morphs-guide/) | 3 | albino, super red, calico, lemon, blue-eye lemon descriptions; super red fades in warm water; super long-fin carries two copies |

**Confidence & conflicts:**
- Size: true A. cirrhosus is 9 cm SL (FishBase), but the trade form reaches 12–15 cm; the game uses 12 cm.
- Driftwood: hobby sources call it essential; peer-reviewed gut studies show plecos do not digest wood. Treated as beneficial, not required.
- Clutch size and incubation beyond Aquarium Co-Op’s 30–80 eggs come from Tier 3 sources.
- Colour genetics simplified (recessive colour genes; codominant long-fin).
- Compressed time: 4–10 day hatch ≈ 48 game-hours; ~9 year lifespan ≈ 360 game-days.

### African Dwarf Frog — *Hymenochirus boettgeri* (`african_dwarf_frog`)

**Key values used:** adult 3.5 cm · min tank 10 gal · 20–28 °C (ideal 24–26) · pH 6.5–8 (ideal 7–7.8) · GH 4–15 · KH 3–10 · group group (min 2, ideal 3) · breeding `egg_layer_generic` · classes freshwater_tropical, freshwater_planted · unlock `fw_intermediate` · conservation: Least Concern (IUCN).

| Source | Tier | Facts used |
|---|---|---|
| [USGS Nonindigenous Aquatic Species — Hymenochirus boettgeri](https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=66) | 1 | central African range (Nigeria/Cameroon to the Congo); Florida introduction in 1964 failed |
| [Gvoždík et al. 2023 — tetraploidy in Hymenochirus boettgeri (Zool. J. Linn. Soc. 200:1034)](https://academic.oup.com/zoolinnean/article/200/4/1034/7321480) | 1 | wild H. boettgeri are tetraploid; pet/lab stock is diploid; captive stock best called Hymenochirus sp. |
| [CDC — 2011 Salmonella outbreak linked to African dwarf frogs](https://archive.cdc.gov/www_cdc_gov/salmonella/2011/water-frog-7-20-2011.html) | 1 | 241 illnesses in 42 states 2009–2011; traced to one frog breeder; water frogs not appropriate for children under 5; wash hands |
| [Washington Dept. of Fish & Wildlife — African clawed frog](https://wdfw.wa.gov/species-habitats/invasive/xenopus-laevis) | 1 | clawed frogs have unwebbed front feet and black claws; grow larger than a fist; eat fish, frogs, snails; prohibited invasive species |
| [TFH Magazine — Diagnosis of chytridiomycosis in pet African dwarf frogs](https://www.tfhmagazine.com/articles/freshwater/aquarium-science-diagnosis-of-chytridiomycosis-in-pet-african-dwarf-frogs) | 2 | chytrid signs: appetite loss, lethargy, flaking skin; quarantine ≥ 2 months |
| [Aquarium Co-Op — Caring for African dwarf frogs](https://www.aquariumcoop.com/blogs/aquarium/caring-african-dwarf-frogs) | 2 | slow eaters that cannot compete with fish; target-feed frozen bloodworms; will eat guppy fry; amplexus up to ~1.5 days |
| [PetSmart — African dwarf frog care guide](https://www.petsmart.com/learning-center/reptile-care/african-dwarf-frog-care-guide/A0118.html) | 2 | 70–82 °F; 5.5 gal for 1–2, 20 gal with fish; fully aquatic; must surface to breathe; 5–7 year lifespan |
| [Aquatic Arts — Dwarf African Frog (tank-bred)](https://aquaticarts.com/products/dwarf-african-frog) | 2 | 72–78 °F, pH 6.5–7.8; 10 gal; will eat dwarf shrimp and tiny fish; tight lid |
| [Pipidae.org — African dwarf clawed frog or African clawed frog?](https://www.pipidae.org/en/species-and-systematics/determining-of-species/african-dwarf-clawed-frog-or-african-clawed-frog/) | 3 | ADF: webbed fingers, side eyes, rough skin; ACF twice the length, eats fish; all true albinos in the trade are Xenopus |

**Explicit compatibility rules:**
- `tag:shrimp_dwarf` → floor `conditional`, incident risk 0.08/day: African dwarf frogs may eat small shrimp and will eat shrimplets; well-fed frogs in planted tanks often leave adults alone.
- `tag:goldfish` → floor `high_risk`, incident risk 0.1/day: Goldfish outcompete the slow frogs for every meal, may nip or swallow them, and need much cooler water.

**Confidence & conflicts:**
- Taxonomy: pet “H. boettgeri” is a diploid lineage distinct from wild tetraploid H. boettgeri (Gvoždík 2023); the roster name is kept.
- Shrimp: Aquatic Arts says dwarf shrimp will be eaten; Aquarium Co-Op says well-fed frogs usually leave them. Encoded as conditional.
- Clutch size is poorly sourced (hobby claims range widely); 50–200 used.
- Pellets: Aquarium Co-Op discourages them, PetSmart uses them as a staple — both are included as foods, with frozen foods preferred.
- Compressed time: ~2 day hatch ≈ 16 game-hours; ~36 day tadpole stage ≈ 288 game-hours; 5–7 year lifespan ≈ 240 game-days.

### Cardinal Tetra — *Paracheirodon axelrodi* (`cardinal_tetra`)

**Key values used:** adult 4 cm · min tank 15 gal · 21–31 °C (ideal 24–28) · pH 4–7.5 (ideal 5–6.5) · GH 1–10 · KH 0–6 · group school (min 6, ideal 12) · breeding `egg_scatter_cover` · classes freshwater_tropical, freshwater_planted · unlock `fw_intermediate` · conservation: Least Concern (IUCN 2021).

| Source | Tier | Facts used |
|---|---|---|
| [Seriously Fish — Paracheirodon axelrodi](https://www.seriouslyfish.com/species/paracheirodon-axelrodi/) | 2 | 35 mm SL; 23–29 °C, pH 3.5–7.5, GH 1–12; breeding pH 5.5–6.5, GH 1–5; school of 8–10+; hatch 24–36 h; free-swimming 3–4 days later; albino forms; golden cardinals parasite-induced; mostly wild-caught |
| [FishBase — Paracheirodon axelrodi](https://www.fishbase.se/summary/Paracheirodon-axelrodi.html) | 1 | 3.0 cm SL; 23–27 °C, pH 4.0–6.0; upper Orinoco and Rio Negro; hatch 24–30 h; IUCN Least Concern (2021) |
| [Animal Diversity Web — Paracheirodon axelrodi](https://animaldiversity.org/accounts/Paracheirodon_axelrodi/) | 1 | ~500 eggs per spawn; adults eat eggs; maturity ~9 months; wild ~1 year, captive ~5 years; preyed on by angelfish |
| [Oliveira et al. 2008 — Tolerance to temperature, pH, ammonia and nitrite in cardinal tetra (Acta Amazonica)](https://www.scielo.br/j/aa/a/FYCZj6tsgyvP9QcXYh7yPnC/?lang=en) | 1 | 96-h LT50 19.6 °C and 33.7 °C; 100% survival pH 4.0–8.5; nitrite LC50 1.1 mg/L (very sensitive); ~80% of Amazonas ornamental exports |
| [Aquarium Co-Op — Cardinal tetra care guide](https://www.aquariumcoop.com/blogs/aquarium/cardinal-tetra) | 2 | 23–29 °C; 15–20 gal for 8–10; good with corys, kuhlis, discus; may eat baby shrimp |
| [Aquarium Co-Op — Neon tetras vs cardinal tetras](https://www.aquariumcoop.com/blogs/aquarium/neon-tetras-and-cardinal-tetras) | 2 | cardinals prefer warmer water than neons; red runs the full body length; often wild-caught; $3–4 |
| [LiveAquaria — Cardinal Tetra](https://www.liveaquaria.com/products/cardinal-tetra) | 2 | 73–81 °F, pH 5.5–7.5, KH 2–6; 10 gal minimum; groups of 6+ |
| [Wikipedia — Project Piaba](https://en.wikipedia.org/wiki/Project_Piaba) | 3 | founded 1991 (N. L. Chao); “Buy a Fish, Save a Tree”; Rio Negro fishery ~30 million fish/year |

**Confidence & conflicts:**
- Upper temperature: 27 °C (FishBase, LiveAquaria) vs 29 °C (Seriously Fish, Co-Op); lab tolerance data support the higher value. Ideal 24–28 °C.
- FishBase’s dH 5–12 looks high next to other sources; the game uses GH 1–10.
- Clutch size (~500) is from ADW; captive spawns are usually smaller.
- Compressed time: 24–30 h hatch ≈ 10 game-hours; ~5 year captive lifespan ≈ 200 game-days.

### Dwarf Orange Crayfish — *Cambarellus patzcuarensis* (`dwarf_crayfish`)

**Key values used:** adult 3.5 cm · min tank 10 gal · 10–26 °C (ideal 18–24) · pH 6.5–8.2 (ideal 7–8) · GH 6–15 · KH 3–15 · group group (min 1, ideal 3) · breeding `shrimp_berried` · classes freshwater_cool, freshwater_tropical, freshwater_planted · unlock `fw_intermediate` · conservation: Endangered (IUCN 2010).

| Source | Tier | Facts used |
|---|---|---|
| [USFWS Ecological Risk Screening Summary — Mexican Dwarf Crayfish (2017)](https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Mexican-Dwarf-Crayfish.pdf) | 1 | trade animals ~2 cm body length; endemic to Lake Pátzcuaro and nearby springs; IUCN Endangered B1ab(iii) (2010); tolerates 10–26 °C; up to ~60 eggs; trade stock tested positive for crayfish plague; sold by 97% of sampled online shops |
| [Amazonas Magazine — A Mexican crayfish for nano aquariums (R. O’Leary, 2013)](https://www.amazonasmagazine.com/2013/03/15/a-mexican-crayfish-for-nano-aquariums/) | 2 | ~3 cm max; 20–50 eggs; direct development; female carries young; orange line from Dutch hobbyists, late 1990s; adults moult about twice a year |
| [The Shrimp Farm — Dwarf Orange Crayfish care sheet](https://www.theshrimpfarm.com/posts/caresheet-dwarf-orange-crayfish/) | 2 | pH 6.5–8.0; KH 3–15; 10 gal; vulnerable right after moulting; eaten by fish large enough |
| [Aquatic Arts — Orange CPO crayfish & care guide](https://aquaticarts.com/pages/orange-dwarf-mexican-dwarf-crayfish-care-guide) | 2 | may opportunistically catch slow-moving fish or dwarf shrimp; not recommended with dwarf shrimp; incubation 3–4 weeks; avoid copper; restricted in several US states |
| [Aquariadise — CPO crayfish care sheet](https://www.aquariadise.com/caresheet-cambarellus-patzcuarensis/) | 3 | ideal 18–25.5 °C; lifespan shortens above ~26 °C; GH 8–12; soft water causes failed moults; escapes through gaps > 1 cm; takes moulting shrimp, fry, slow snails; avoid loaches and dwarf cichlids |

**Explicit compatibility rules:**
- `tag:shrimp_dwarf` → floor `conditional`, incident risk 0.08/day: Dwarf crayfish may catch freshly moulted dwarf shrimp, and shrimplets are at high risk. Many keepers report peaceful coexistence in densely planted tanks.
- `tag:fish_benthic` → floor `conditional`, incident risk 0.04/day: Bottom-resting fish such as corydoras and loaches can be pinched or caught while sleeping at night.
- `tag:crustacean` → floor `conditional`, incident risk 0.05/day: Crayfish attack other crustaceans while they are soft after a moult.

**Confidence & conflicts:**
- Predation is disputed: The Shrimp Farm and Amazonas call CPOs safe with shrimp and fish; Aquatic Arts, Aquariadise and others report opportunistic catches of moulting shrimp, fry, snails and sleeping bottom fish. Encoded as conditional with low per-day risk.
- Size: ~2 cm body (measured trade animals) vs 4–5 cm including claws; the game uses 3.5 cm total.
- Upper temperature: 26 °C (USFWS) vs 31 °C (hobby source); the cautious 26 °C is used.
- Cannibalism of young: sources conflict; modelled as moderate losses without cover.
- Compressed time: 3–4 week incubation ≈ 200 game-hours; ~2 year lifespan ≈ 80 game-days.

### Discus — *Symphysodon aequifasciatus* (`discus`)

**Key values used:** adult 15 cm · min tank 75 gal · 26–32 °C (ideal 28–30) · pH 5–7.8 (ideal 6–7) · GH 0–12 · KH 0–8 · group shoal (min 5, ideal 6) · breeding `substrate_spawner` · classes freshwater_tropical, freshwater_planted · unlock `fw_advanced` · conservation: Least Concern (IUCN 2018).

| Source | Tier | Facts used |
|---|---|---|
| [Seriously Fish — Symphysodon aequifasciatus](https://www.seriouslyfish.com/species/symphysodon-aequifasciatus/) | 2 | 140 mm SL; lowland Amazon floodplain habitats; 120×45×45 cm tank; peaceful, shy; insect larvae and invertebrate diet |
| [FishBase — Symphysodon aequifasciatus](https://www.fishbase.se/summary/Symphysodon-aequifasciatus.html) | 1 | 13.7 cm SL; 26–30 °C, pH 5.0–8.0, dH 0–12; groups of 5+; pairs territorial when breeding; IUCN Least Concern (2018) |
| [Aquarium Co-Op — Discus care guide](https://www.aquariumcoop.com/blogs/aquarium/discus-care-guide) | 2 | 85–86 °F; 75 gal recommended; buy 10–12 juveniles to end with ~6 adults; nitrate < 20–40 ppm; avoid barbs, big tetra schools, clown loaches, angelfish; good with cardinals, corydoras sterbai, bristlenose |
| [LiveAquaria — Blue Diamond Discus](https://www.liveaquaria.com/products/blue-diamond-discus) | 2 | 79–86 °F, pH 6.1–7.5, KH 3–8; 50 gal; peaceful tank mates only; ~$90 |
| [Sylvain & Derome 2017 — skin-mucus feeding of discus fry (Scientific Reports)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5507859/) | 1 | fry feed on parental skin mucus for ~3 weeks; wrigglers free-swimming ~48 h after hatching |
| [Aquarium Glaser (2024) — The scientific species name of discus cichlids: an open question](https://www.aquariumglaser.de/en/fisharchive/the-scientific-species-name-of-discus-cichlids-an-open-question/) | 2 | competing classifications (Ready 2006; Bleher 2007); S. discus, S. aequifasciatus, S. haraldi, S. tarzoo |
| [North American Discus Association — Discus classification](https://discusnada.org/discus-classification/) | 3 | blue diamond: solid blue, recessive; pigeon blood: no stress bars, pepper, red eyes; red turquoise striations; snakeskin ~14 bars |
| [AquariumScience.org — Breeding discus](https://aquariumscience.org/17-11-6-breeding-discus/) | 3 | breeding 80–82 °F, TDS 70–100; cones; ~150–300 eggs; raise ~10 to get pairs |
| [Wikipedia — Discus (fish)](https://en.wikipedia.org/wiki/Discus_(fish)) | 3 | maturity within ~1 year; lifespan ~10 years, occasionally 15; parental mucus feeding; domestic strains farmed in SE Asia |

**Explicit compatibility rules:**
- `neon_tetra` → floor `conditional`, incident risk 0/day: Discus need 28–30 °C; neons prefer 25 °C or less and are stressed long-term at discus temperatures. Cardinals are the warm-water alternative.

**Confidence & conflicts:**
- Taxonomy is unsettled (3–5 species recognised depending on author); domestic discus are hybrids, often labelled Symphysodon sp.
- pH: Aquarium Co-Op keeps domestic discus at 6.8–7.6, while wild fish live at pH 4–6. Ideal set to 6.0–7.0 for domestic stock.
- Minimum tank: 50–90 gallons across sources; 75 used.
- Egg counts come from hobbyist sources; mucus-feeding length 2–4 weeks (3 used).
- Strain genetics are simplified from breeder experience (blue diamond recessive, pigeon blood dominant).
- Compressed time: ~2.5 day hatch ≈ 20 game-hours; ~10 year lifespan ≈ 400 game-days.

### Chunk 16: freshwater favourites (ADR-0052)

Chunk 16's wave C: nine freshwater species, researched October 2026. None needs research or an unlock key of its own, so each is in the shop from the start (ADR-0052 decisions 4 and 9). The data files are the source of truth for every number. Where they differ from ADR-0052's list (an accepted name), the data wins and the section says why. As for the other species, the key values, sources, rules and the first confidence bullets are generated from each data file (its `confidenceNotes`). The bullets after them come from the research briefs and the data files' comments. Each anchor line above a heading matches the link in that species' data file.

<a id="freshwater-angelfish"></a>
### Freshwater Angelfish — *Pterophyllum scalare* (`freshwater_angelfish`)

**Key values used:** adult 15 cm · min tank 30 gal · 23–30 °C (ideal 25–28) · pH 6–8 (ideal 6.5–7.4) · GH 1–15 · KH 1–10 · group group (min 1, ideal 5) · breeding `substrate_spawner` · classes freshwater_tropical, freshwater_planted · unlock none (in the shop from the start; ADR-0052 decision 9) · conservation: Least Concern (IUCN Red List, assessed 2020).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase — Pterophyllum scalare (Freshwater angelfish)](https://www.fishbase.se/summary/Pterophyllum-scalare.html) | 1 | 15 cm TL (size field 10.5); 24–30 °C, pH 6.0–8.0, dH 5–13; swamps with dense vegetation; 7 bars in young, 4 in adults; IUCN Least Concern (2020); both parents guard |
| [Seriously Fish — Pterophyllum scalare](https://www.seriouslyfish.com/species/pterophyllum-scalare/) | 2 | 150 mm SL, 20 cm tall; 100×40×50 cm tank; eats small fish; eggs on vertical surfaces; easy; farm-bred |
| [Aquarium Co-Op — Angelfish care guide](https://www.aquariumcoop.com/blogs/aquarium/angelfish-care-guide) | 2 | 29 gal for 4 adults; avoid nano fish and dwarf shrimp; up to 1,000 eggs; 8–12 years; $5–20 |
| [Practical Fishkeeping — Keeping and breeding angelfish](https://www.practicalfishkeeping.co.uk/features/keeping-and-breeding-angelfish-in-the-aquarium/) | 2 | tank 50 cm tall; hatch within 48 h at 27–28 °C; free-swimming about day 7; baby brine for ~3 weeks |
| [The Angelfish Society — Phenotype library (2007)](https://www.theangelfishsociety.org/phenotype_library_2007/Dark_Intro.html) | 2 | Dark series D > M > Gm > g; zebra, stripeless, smokey, veil; koi = gold marble blushing; gold hides smokey |
| [Norton (1982) Angelfish genetics, part I. FAMA (reprinted at finarama.com)](https://www.finarama.com/genetics/1982prt1.htm) | 2 | crossing counts; black lace one dose, black two; zebra same in one or two doses; smokey 1:1 |

**Explicit compatibility rules:**
- `neon_tetra` → floor `high_risk`, incident risk 0.12/day: Adult angelfish hunt neon tetras and other fish small enough to swallow.
- `tag:shrimp_dwarf` → floor `high_risk`, incident risk 0.15/day: Angelfish eat dwarf shrimp.

**Confidence & conflicts:**
- The colour genetics rest on Joanne Norton’s crossing experiments in FAMA (hobby magazine, not peer-reviewed), as summarised by TAS; no peer-reviewed paper was found.
- Sources disagree on leopard (TAS: chocolate with zebra; Norton: zebra with smokey, and only under short days); the game names no leopard form.
- Stripeless is partly dominant in Norton and TAS but called recessive in the Finarama timeline; the game follows Norton.
- Aquarium angelfish may carry genes from more than one wild Pterophyllum species.
- In the game the zebra, stripeless and smokey genes show only on fish with the wild bars (silver and black lace). TAS records gold hiding smokey; hiding them on marble and black fish too is the game's simplification. Halfblack, pearlscale, albino, streaked and platinum are left out.
- Compressed time: 6–12 month maturity = 22 game-days; ~2 day hatch ≈ 18 game-hours; 8–12 year lifespan ≈ 400 game-days.

<a id="german-blue-ram"></a>
### German Blue Ram — *Mikrogeophagus ramirezi* (`german_blue_ram`)

**Key values used:** adult 5.5 cm · min tank 20 gal · 25–31 °C (ideal 27–30) · pH 4.5–7.5 (ideal 5.5–6.8) · GH 1–10 · KH 0–8 · group pair (min 1, ideal 2) · breeding `substrate_spawner` · classes freshwater_tropical, freshwater_planted · unlock none (in the shop from the start; ADR-0052 decision 9) · conservation: Least Concern (IUCN Red List, assessed 2020).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase — Mikrogeophagus ramirezi (Ram)](https://www.fishbase.se/summary/Mikrogeophagus-ramirezi.html) | 1 | 4.2 cm SL; Orinoco llanos; 27–30 °C, pH 5.0–6.0; IUCN Least Concern (2020) |
| [Seriously Fish — Mikrogeophagus ramirezi](https://www.seriouslyfish.com/species/mikrogeophagus-ramirezi/) | 2 | 60×30 cm for a pair; 27–30 °C, pH 4–7, 1–10 dGH; sifts substrate; both parents guard; strains gold, electric blue, balloon; never add to an immature tank |
| [Aquarium Co-Op — Ram cichlids](https://aquariumcoop.com/blogs/aquarium/ram-cichlids) | 2 | ideally 29–30 °C; pair in a 20 gal; up to 4 years; females have blue spangles in the black spot; new pairs eat first spawns |
| [Practical Fishkeeping — How to breed the ram](https://www.practicalfishkeeping.co.uk/features/how-to-breed-the-ram-mikrogeophagus-ramirezi/) | 2 | about 200 eggs; free-swimming about 8 days after spawning; males with extended 3rd–4th dorsal rays; pink belly in females |
| [Tetra — Ram cichlid](https://blog.tetra.net/en-en/ram-cichlid-mikrogeophagus-ramirezi/) | 2 | black eye bar, black flank spot; orange head shading to blue; lower water, in pairs; up to 3 years |

**Explicit compatibility rules:**
- `tag:cichlid` → floor `conditional`, incident risk 0.04/day: Other cichlids compete for the floor and can bully a pair of rams.

**Confidence & conflicts:**
- No published inheritance for the colour strains; electric blue and gold follow forum claims, simplified.
- Sources disagree on brood care (both parents in Seriously Fish and PFK, the female in FishBase); the game has both guard.
- Advised temperatures run from 22–26 °C (LiveAquaria) to 29–30 °C (Aquarium Co-Op); the game follows FishBase and Seriously Fish (27–30 °C).
- No age at maturity was found; the balloon form's inheritance is unpublished too (modelled as recessive).
- Compressed time: a 2–3 day hatch ≈ 16 game-hours; a 3–4 year lifespan ≈ 140 game-days.

<a id="harlequin-rasbora"></a>
### Harlequin Rasbora — *Trigonostigma heteromorpha* (`harlequin_rasbora`)

**Key values used:** adult 4.5 cm · min tank 10 gal · 21–28 °C (ideal 23–26.5) · pH 5–7.5 (ideal 5.8–7) · GH 1–12 · KH 1–10 · group shoal (min 6, ideal 10) · breeding `egg_scatter_cover` · classes freshwater_tropical, freshwater_planted · unlock none (in the shop from the start; ADR-0052 decision 9) · conservation: Least Concern (IUCN Red List, assessed 2019).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase — Trigonostigma heteromorpha (Harlequin rasbora)](https://www.fishbase.se/summary/Trigonostigma-heteromorpha.html) | 1 | 5 cm TL; 22–25 °C, pH 5.0–7.0, dH 5–12; eggs under leaves; IUCN Least Concern (2019) |
| [Tan (2020) Trigonostigma truncata, a new species, and the harlequin’s colours. Raffles Bulletin of Zoology 68:421–433](https://lkcnhm.nus.edu.sg/app/uploads/2020/01/RBZ-2020-0058.pdf) | 1 | 35 mm SL; range; live colours; the black “axine”; T. truncata split off |
| [Seriously Fish — Trigonostigma heteromorpha](https://www.seriouslyfish.com/species/trigonostigma-heteromorpha/) | 2 | 60×30 cm for 8–10; 21–28 °C, pH 5.0–7.5; spawns under broad leaves; golden, blue and black strains |
| [LiveAquaria — Harlequin Rasbora](https://www.liveaquaria.com/products/harlequin-rasbora) | 2 | 10 gal; schools of 8–10; males copper-orange, females more golden; easy |

**Confidence & conflicts:**
- Some fish sold as harlequins may be Trigonostigma truncata (split off in 2020), whose wedge stops short of the tail.
- Lifespan (5–8 years) comes from an uncited Wikipedia figure.
- Golden strain inheritance is unpublished; modelled as recessive.
- The game breeds it with its `egg_scatter_cover` system (eggs need cover; no parental care), though harlequins stick their eggs under broad leaves rather than scattering them.
- Compressed time: a 1–2 day hatch ≈ 10 game-hours; a 5–8 year lifespan ≈ 200 game-days.

<a id="zebra-danio"></a>
### Zebra Danio — *Danio rerio* (`zebra_danio`)

**Key values used:** adult 5 cm · min tank 20 gal · 16–28 °C (ideal 19–24) · pH 6–8 (ideal 6.5–7.5) · GH 5–20 · KH 3–12 · group school (min 6, ideal 10) · breeding `egg_scatter_cover` · classes freshwater_cool, freshwater_tropical, freshwater_planted · unlock none (in the shop from the start; ADR-0052 decision 9) · conservation: Least Concern (IUCN Red List, assessed 2009).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase — Danio rerio (Zebra danio)](https://www.fishbase.se/summary/Danio-rerio.html) | 1 | 3.8 cm SL; five stripes onto the tail; two pairs of barbels; 18–24 °C, pH 6.0–8.0; average 3.5 years, oldest 5.5; IUCN Least Concern (2009) |
| [Seriously Fish — Danio rerio](https://www.seriouslyfish.com/species/danio-rerio/) | 2 | 90×30 cm; 18–25 °C; groups of 8–10; leopard is D. rerio; eggs non-adhesive; GloFish excluded |
| [Aquarium Co-Op — Zebra danio](https://www.aquariumcoop.com/blogs/aquarium/zebra-danio) | 2 | 20 gal long; may nip if the school is small; avoid bettas; 100+ eggs |
| [Stewart et al. (2021) Long-fin is a dominant gain of function in kcnh2a. Development 148](https://pmc.ncbi.nlm.nih.gov/articles/PMC8217709) | 1 | long-fin dominant; hobbyist origin |
| [Watanabe et al. (2006) The leopard gene is connexin 41.8. EMBO Reports 7:893](https://pmc.ncbi.nlm.nih.gov/articles/PMC1559663) | 1 | leopard recessive null allele; spots in homozygotes |
| [Lamason et al. (2005) SLC24A5 and the golden zebrafish. Science 310:1782](https://www.bio.davidson.edu/genomics/309redesigned/papers_current/sequencing/genomes/2005ionchannel_pigmentation.pdf) | 1 | golden recessive; lighter stripes |
| [Lessman (2014) Zebrafish clutch size and spawning interval](https://digitalcommons.memphis.edu/facpubs/504) | 1 | 39.6 embryos per clutch; every 2.86 days |

**Explicit compatibility rules:**
- `tag:long_fins` → floor `conditional`, incident risk 0.04/day: Zebra danios nip slow, long-finned fish, especially in small groups; a shoal of eight or more mostly keeps to itself.

**Confidence & conflicts:**
- Whether the trade’s leopard and golden danios carry the same alleles as the lab lines is likely but not proven.
- Albino danios exist but the art cannot yet show the pink eye, so the game leaves the albino out.
- Clutch size: lab pairs average about 40 eggs every three days (Lessman 2014), while Aquarium Co-Op says 100 or more; the game uses 30–120. Whether two long-fin copies grow longer fins is unverified.
- Compressed time: a 24–36 h hatch ≈ 10 game-hours; a 3.5-year average (5.5 at most) lifespan ≈ 160 game-days.

<a id="platy"></a>
### Platy — *Xiphophorus maculatus* (`platy`)

**Key values used:** adult 5 cm · min tank 15 gal · 18–28 °C (ideal 22–26) · pH 6.8–8.5 (ideal 7.2–8.2) · GH 9–30 · KH 4–20 · group group (min 3, ideal 6) · breeding `livebearer` · classes freshwater_tropical, freshwater_planted · unlock none (in the shop from the start; ADR-0052 decision 9) · conservation: Data Deficient (IUCN Red List, assessed 2018).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase — Xiphophorus maculatus (Southern platyfish)](https://www.fishbase.se/summary/Xiphophorus-maculatus.html) | 1 | males 4 cm, females 6 cm TL; 18–25 °C, pH 7.0–8.0; gestation 24–30 days, 20–80 young; mature 3–4 months; IUCN Data Deficient (2018) |
| [Seriously Fish — Xiphophorus maculatus](https://www.seriouslyfish.com/species/xiphophorus-maculatus/) | 2 | 60×30 cm; 20–26 °C, hard water; very peaceful; hybrid ancestry |
| [Aquarium Co-Op — Care guide for platy fish](https://www.aquariumcoop.com/blogs/aquarium/platy-care-guide) | 2 | 10–20 gal; 2 females per male; 3–4 years; $2–4 |
| [Kallman & Atz (1967) The tail-spot patterns of the platyfish. Zoologica 51:107–135](https://archive.org/stream/biostor-194013/biostor-194013_djvu.txt) | 1 | one allelic series of dominant tail-spot alleles; at most two patterns per fish |
| [Gordon (1946) Comet and the E modifier in swordtails and platies. Zoologica 31:77–88](https://archive.org/stream/biostor-194281/biostor-194281_djvu.txt) | 1 | wagtail = comet + E; golden st recessive |
| [Xiphophorus Genetic Stock Center (Texas State University) — stock list](https://imls.txst.edu/stocks.html) | 1 | sex-linked pigment genes; W, X and Y sex chromosomes |
| [Wiedermann — Practical Platy Genetics (hobby guide)](https://ephieslivebearers.weebly.com/uploads/5/7/7/9/57793349/practical_platy_genetics_1.0.pdf) | 3 | tuxedo = nigra on gold; hi-fin dominant; Mickey Mouse = moon + twin |

**Confidence & conflicts:**
- Many platy colour genes are sex-linked in wild stocks; the game treats them as ordinary genes, as it does for the guppy.
- The genetics of trade red, tuxedo, salt-and-pepper, hi-fin and Mickey Mouse come from a hobby guide; Mickey Mouse is “moon complete” to one breeder and moon plus twin to the guide (the game uses the guide).
- Platies and swordtails hybridise freely; the game does not cross species.
- Temperature: 18–25 °C (FishBase), 20–26 °C (Seriously Fish) and 21–28 °C (Aquarium Co-Op); the game tolerates 18–28 °C with 22–26 °C ideal. Broods are 20–80 (FishBase, Seriously Fish) or 20–40 (Wikipedia). No KH figure was found.
- Compressed time: a ~28 day gestation = 224 game-hours; 3–4 month maturity = 10 game-days; a 3–4 year lifespan ≈ 140 game-days.

<a id="swordtail"></a>
### Swordtail — *Xiphophorus hellerii* (`swordtail`)

**Key values used:** adult 11 cm · min tank 30 gal · 18–28 °C (ideal 22–26) · pH 7–8.5 (ideal 7.2–8.2) · GH 10–30 · KH 5–20 · group harem (min 3, ideal 4) · breeding `livebearer` · classes freshwater_tropical, freshwater_planted · unlock none (in the shop from the start; ADR-0052 decision 9) · conservation: Least Concern (IUCN Red List, assessed 2018).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase — Xiphophorus hellerii (Green swordtail)](https://www.fishbase.se/summary/Xiphophorus-hellerii.html) | 1 | males 14 cm, females 16 cm TL; 22–28 °C, pH 7.0–8.0; gestation 24–30 days, 20–200 young; one male to several females; IUCN Least Concern (2018) |
| [Seriously Fish — Xiphophorus hellerii](https://www.seriouslyfish.com/species/xiphophorus-hellerii/) | 2 | 120×30 cm; fast rocky streams; sword is the lower caudal lobe, males only; males form hierarchies |
| [Tetra — Swordtail](https://blog.tetra.net/en-en/swordtail-xiphophorus-helleri/) | 2 | males about 10 cm without the sword; strong jumpers; up to 5 years |
| [Texas State University (2021) — How the swordtail grows its sword (kcnh8)](https://news.txst.edu/research-and-innovation/2021/swordtail-fish-genetics.html) | 1 | sword grows at puberty; females prefer long swords; Darwin |
| [Gordon (1946) Comet and the E modifier in swordtails and platies. Zoologica 31:77–88](https://archive.org/stream/biostor-194281/biostor-194281_djvu.txt) | 1 | wagtail = comet + E, backcrossed into swordtails |
| [Aquarium Glaser — Xiphophorus hellerii Wien Lyra](https://www.aquariumglaser.de/en/fish-archives/xiphophorus_hellerii_wien_lyra_en) | 2 | lyretail males’ gonopodium too long to use; part of each brood lyretail |

**Explicit compatibility rules:**
- `tag:shrimp_dwarf` → floor `conditional`, incident risk 0.04/day: Adult swordtails eat shrimplets and can catch small adult shrimp.

**Confidence & conflicts:**
- The colour genes are simplified: in wild stocks sword colour and some red patterns are sex-linked (XGSC).
- Maturity is given as about 3 months (Wikipedia) and 8–12 months (FishBase); the game uses about 4 months.
- Female-to-male sex change is reported in some conditions (FishBase); the game does not model it.
- Swordtails and platies hybridise freely; the game does not cross species.
- Tank: 80 cm minimum (FishBase) against 120 cm (Seriously Fish); the game uses 30 gal with a 36 in footprint. Whether trade red came from crosses with platies is unverified, and the black and tuxedo histories (Aquarium Glaser) are uncorroborated. No source gives the sword's length in mm.
- Compressed time: a ~28 day gestation = 224 game-hours; maturity = 14 game-days; a 3–5 year lifespan ≈ 160 game-days.

<a id="dwarf-gourami"></a>
### Dwarf Gourami — *Trichogaster lalius* (`dwarf_gourami`)

**Key values used:** adult 7 cm · min tank 15 gal · 22–29 °C (ideal 24–28) · pH 6–8 (ideal 6.5–7.5) · GH 2–18 · KH 4–10 · group solitary_or_pair (min 1, ideal 1) · breeding `bubble_nest` · classes freshwater_tropical, freshwater_planted · unlock none (in the shop from the start; ADR-0052 decision 9) · conservation: Least Concern (IUCN Red List, assessed 2010).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase — Trichogaster lalius (Dwarf gourami)](https://www.fishbase.se/summary/Trichogaster-lalius.html) | 1 | 9.5 cm TL; 25–28 °C, pH 6.0–8.0; about 600 floating eggs; hatch 12–24 h; IUCN Least Concern (2010); 2022 synonymy note |
| [USFWS — Ecological Risk Screening Summary: Dwarf Gourami](https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Dwarf-Gourami.pdf) | 1 | male colours (Dorn 1916); DGIV in imports; sold in bottles in Calcutta |
| [Seriously Fish — Trichogaster lalius](https://www.seriouslyfish.com/species/trichogaster-lalius/) | 2 | 60×30×30 cm for a pair; 22–27 °C; two males fight; bubble nest up to 700 eggs; DGIV untreatable; colour forms |
| [Aquarium Co-Op — Dwarf gourami](https://www.aquariumcoop.com/blogs/aquarium/dwarf-gourami) | 2 | 10 gal; males are territorial bullies; eats cherry shrimp; powder blue, flame; 2–4 years |
| [Practical Fishkeeping — Let’s hear it for the dwarf gourami](https://www.practicalfishkeeping.co.uk/features/lets-hear-it-for-the-dwarf-gourami/) | 2 | DGIV invariably fatal; swims at all levels |

**Explicit compatibility rules:**
- `betta` → floor `high_risk`, incident risk 0.12/day: Two territorial labyrinth fish that claim the surface: a male betta and a dwarf gourami often fight.
- `honey_gourami` → floor `conditional`, incident risk 0.06/day: A male dwarf gourami bullies other gouramis.
- `fancy_guppy` → floor `conditional`, incident risk 0.04/day: Dwarf gourami males can pick on showy, colourful fish like male guppies.

**Confidence & conflicts:**
- Its scientific name is disputed: Catalog of Fishes and FishBase have treated it as Trichogaster fasciata since 2022, others keep T. lalius; the game uses T. lalius.
- Colour-form inheritance is unpublished; the ladder is a playable simplification.
- Sources disagree on shrimp: Seriously Fish lists cherry shrimp as tankmates, Aquarium Co-Op says it eats them; the game says caution.
- Lifespan: 2–4 years (Aquarium Co-Op) against 4–6 (Wikipedia).
- Size: 9.5 cm TL (FishBase) against "attains 5 cm" (the IUCN text in the USFWS summary); the game uses 7 cm. No age at maturity was found. The dwarf gourami iridovirus (DGIV) is not modelled as a disease.
- Compressed time: a 12–36 h hatch ≈ 8 game-hours; a 2–4 year lifespan ≈ 140 game-days.

<a id="ghost-shrimp"></a>
### Ghost Shrimp — *Palaemon paludosus* (`ghost_shrimp`)

**Key values used:** adult 4 cm · min tank 5 gal · 15–30 °C (ideal 20–26) · pH 6.5–8.2 (ideal 7–8) · GH 3–15 · KH 3–15 · group colony (min 1, ideal 6) · breeding `shrimp_berried` · classes freshwater_cool, freshwater_tropical, freshwater_planted · unlock none (in the shop from the start; ADR-0052 decision 9) · conservation: Least Concern (IUCN Red List).

| Source | Tier | Facts used |
|---|---|---|
| [Animal Diversity Web (University of Michigan) — Palaemonetes paludosus](https://animaldiversity.org/accounts/Palaemonetes_paludosus/) | 1 | adults under 50 mm; Atlantic coastal plain; 8–85 eggs; incubation 12–14 days; matures in 2–3 months; lives 6–13 months |
| [WoRMS — Palaemon paludosus (Gibbes, 1850)](https://www.marinespecies.org/rest/AphiaRecordByAphiaID/932400) | 1 | accepted name Palaemon paludosus; Palaemonetes paludosus unaccepted |
| [Dobkin — Abbreviated larval development in caridean shrimps (FAO)](https://www.fao.org/4/AC741T/AC741T24.htm) | 1 | three zoeal stages; postlarva in 5–10 days without food; no brackish water needed |
| [The Shrimp Farm — Ghost shrimp care sheet](https://www.theshrimpfarm.com/posts/shrimp-caresheet-ghost-shrimp-palaemonetes-sp/) | 2 | 18–27.5 °C, pH 6.5–8.0; 10 gal, ~3 per gallon; more aggressive than dwarf shrimp; sponge filter; 1–1.5 years |
| [Aquariadise — Ghost shrimp care](https://aquariadise.com/ghost-shrimp-palaemonetes-care-info/) | 2 | 5 gal; males ~4 cm, females ~5 cm; green ovary saddle; $1–3 |

**Confidence & conflicts:**
- Shops sell several animals as “ghost shrimp”, including the larger, aggressive whisker shrimp (Macrobrachium); the game models Palaemon paludosus.
- Sizes conflict (2.5 cm in Wikipedia, up to 5 cm in ADW) and so does the egg-carrying time (12–14 days against about 3 weeks).
- WoRMS moved it to *Palaemon* (De Grave & Ashelby 2013); ADW and the USFWS still say *Palaemonetes*, and ADR-0052 listed it as *Palaemonetes paludosus*. The egg colour is green (The Shrimp Farm) or brown (a hobby profile); the game uses green. The IUCN year was not confirmed.
- In the game the young hatch as larvae but need no brackish water (unlike the amano's); the larval week is counted as part of rearing.
- Compressed time: about 2½ weeks carrying eggs ≈ 140 game-hours; the 5–10 day larval stage sits inside the 96 rearing hours; a 1–1.5 year lifespan ≈ 50 game-days.

<a id="ramshorn-snail"></a>
### Ramshorn Snail — *Planorbella duryi* (`ramshorn_snail`)

**Key values used:** adult 1.5 cm · min tank 5 gal · 12–32 °C (ideal 22–27) · pH 6.5–8.4 (ideal 7–8.2) · GH 6–18 · KH 3–15 · group colony (min 1, ideal 5) · breeding `snail_egg_clutch` · classes freshwater_cool, freshwater_tropical, freshwater_planted · unlock none (in the shop from the start; ADR-0052 decision 9) · conservation: Not evaluated (IUCN global); NatureServe G5 (secure).

| Source | Tier | Facts used |
|---|---|---|
| [Lucid key, Australian Freshwater Molluscs — Planorbella duryi](https://keys.lucidcentral.org/keys/v3/freshwater_molluscs/key/australian_freshwater_molluscs/Media/Html/entities/planorbella_duryi.htm) | 1 | up to 25 mm; sinistral, biconcave shell; jelly egg masses, direct development; algae and detritus |
| [Freshwater Gastropods of North America (Dillon) — Helisoma scalare duryi](https://fwgna.org/species/planorbidae/h_scalaris_duryi.html) | 1 | Florida range; self-fertilises with a delay; stores sperm ~150 days; red (albino) domestic form; floats on an air pocket |
| [USFWS — Ecological Risk Screening Summary: Seminole Ramshorn (2025)](https://www.fws.gov/sites/default/files/documents/2025-01/ecological-risk-screening-summary-seminole-ramshorn.pdf) | 1 | valid name Planorbella duryi; adults ~20 mm; best growth at 26 °C, survives 33 °C; no laying below 12 °C |
| [The Shrimp Farm — Ramshorn snail care](https://www.theshrimpfarm.com/posts/ramshorn-snail-care/) | 2 | 22–28 °C, pH 6.5–8.0; colour forms; safe with shrimp; booms when overfed; about 1 year |
| [Aquarium Glaser — Planorbella duryi](https://aquariumglaser.de/en/fisharchive/planorbella-duryi-2) | 2 | clutches up to 15 eggs, hatch in 10–12 days; one snail can start a colony; leaves healthy plants alone |

**Confidence & conflicts:**
- Colour-form inheritance is unpublished for this snail; red, blue and leopard are modelled as recessive.
- Egg counts per clutch differ (up to 15 in Aquarium Glaser; about 21–26 averaged from Milward-de-Andrade et al. 1978).
- Some UK “red ramshorns” are the great ramshorn Planorbarius corneus instead.
- ADR-0052 listed it as *Planorbella* sp.; the trade's red, blue and leopard ramshorns are mostly *P. duryi*, which FWGNA treats as *Helisoma scalare duryi*. Aquarium Glaser calls it the "Californian" ramshorn, but it is native to Florida. Whorl counts differ (3–3.5 against 4.5), and no age at maturity was verified.
- In the game it lays its jelly clutches on the glass under water, so, unlike the mystery snail, it needs no lid. A clutch needs two adult snails; self-fertilisation is not modelled.
- Compressed time: a 10–12 day hatch at 25–27 °C ≈ 80 game-hours; a 1–2 year lifespan ≈ 50 game-days.

## Conflicts & uncertainty

1. **Aquarium temperature bands differ widely between sources.** Goldfish recommendations run 10–21, 18–24 or 22–24 °C. Panda cory advice runs from 65–68 °F to 72–79 °F. Hillstream loach ceilings are 24 °C versus 27 °C.
   - The game uses a conservative middle band for `idealMin`–`idealMax`.
   - `min`/`max` are husbandry tolerance bands, not lethal limits. Goldfish, for example, survive 0–41 °C.
   - Chunk 16:
     - German blue ram: 22–26 °C (LiveAquaria) or 24–28 °C (Tetra) up to "ideally 29–30 °C" (Aquarium Co-Op). The game follows FishBase and Seriously Fish (ideal 27–30 °C), because warmth is the key to keeping it.
     - Platy: 18–25, 20–26 or 21–28 °C; swordtail: 16–28, 20–27 or 22–28 °C. Both use 22–26 °C ideal.
     - Zebra danio: aquarium advice is 18–25 °C, but wild fish were found in July water of 24.6–38.6 °C (Seriously Fish). The game keeps the aquarium band (ideal 19–24 °C).
2. **Tank sizes are the most disputed husbandry number.**
   - Comet goldfish: retail says 20 gal, care sources say 50–75 gal plus about 40 per extra fish or a pond. The game uses 75 gal and says honestly that comets are pond fish.
   - Fancy goldfish: 20 or 30 gal. Discus: 50–90 gal. Corydoras: 11–30 gal.
   - Chunk 16:
     - Freshwater angelfish: a 20 gal high for one pair (Aquarium Co-Op) up to about 53 gal for a group (Seriously Fish). The game uses 30 gal and asks for a tall tank.
     - German blue ram: 14–15 gal for a pair (Seriously Fish, PFK) to 30 gal (LiveAquaria's quick stats). The game uses 20.
     - Zebra danio: 10 gal (LiveAquaria) to a 20 gal long (Aquarium Co-Op). The game uses 20, because it is a fast swimmer.
     - Swordtail: 80 cm (FishBase) against 120 cm (Seriously Fish). The game uses 30 gal.
     - Dwarf gourami: 10 gal (Aquarium Co-Op, LiveAquaria) to 15 gal for a pair (Seriously Fish). The game uses 15.
3. **Life history data is sparse for several species.**
   - No reliable figure exists for kuhli breeding, hillstream loach incubation, ADF clutch size, or lifespan and maturity for otocinclus, kuhli, hillstream and panda cory. These values are marked as estimates in each record.
   - Warm-lab studies (cherry shrimp, medaka) run faster than hobby reports. The game sits between the two.
   - Chunk 16:
     - No age at maturity was found for the ram, the dwarf gourami or the ramshorn (Wikipedia's 4–6 weeks for the ramshorn is uncited).
     - Lifespans are weak for the harlequin (an uncited 5–8 years) and conflict for the dwarf gourami (2–4 against 4–6 years).
     - Swordtail maturity is about 3 months (Wikipedia) or 8–12 months (FishBase).
     - Ghost shrimp size (2.5 cm against up to 5 cm) and egg-carrying time (12–14 days against about 3 weeks) conflict. So do ramshorn eggs per clutch (up to 15 against an average of about 21–26).
     - Sizes: the angelfish is 10.5 or 15 cm TL in FishBase's own page, and the harlequin is 35 mm SL wild (Tan 2020) but up to 45 mm SL in tanks (Seriously Fish).
4. **Genetics are playable simplifications.**
   - **Documented genes are followed:** axolotl d/a/m/ax/c; medaka b and r; goldfish nacreous T (incomplete dominance); betta double tail (recessive); guppy tuxedo and snakeskin (dominant); mystery snail body, ground colour and banding.
     - Chunk 16 adds the zebra danio's long-fin (dominant, *kcnh2a*), leopard (recessive, *connexin 41.8*) and golden (recessive, *slc24a5*), all from peer-reviewed papers. It is likely, but not proven, that the trade fish carry the lab alleles.
     - It also adds the platy's tail-spot series (Kallman & Atz 1967), its gold *st* (recessive) and the wagtail (comet plus the modifier E, Gordon 1946).
     - The freshwater angelfish's Dark series (D > M > Gm > wild > g), zebra/stripeless, smokey and veil follow Norton's crossing counts as summarised by TAS. Those were published in a hobby magazine, not a peer-reviewed journal.
   - **Undocumented traits are modelled as recessive**, so they stay rare and must be line-bred: neon forms, honey gourami colour forms, bristlenose colours, and the ADF blonde.
     - Chunk 16: the harlequin's golden, the ram's gold and balloon, the swordtail's albino, and the ramshorn's red, blue and leopard. A recessive red is plausible for the ramshorn: in the related *Biomphalaria* pigment is a single dominant gene, so albino is recessive (Knight et al. 1999).
     - Some chunk 16 traits are modelled as dominant instead, following hobby or regional sources: the ram's electric blue (forums say incompletely dominant), the platy's tuxedo (nigra), hi-fin and salt-and-pepper, and the swordtail's red, black, tuxedo, wagtail, lyretail and hi-fin. Hi-fin is reportedly lethal with two copies, which the game does not model.
     - The dwarf gourami's wild, neon, powder blue and flame forms are a ladder, like the honey gourami's.
   - **Real guppy colour is heavily Y-linked.** The game treats it as autosomal. Platy and swordtail colour genes are often sex-linked in wild stocks too (the Xiphophorus Genetic Stock Center), and the game treats them the same way.
   - **Neocaridina colour lines are mostly separate recessives in reality.** The game keeps red dominant, so ordinary cherry stock breeds true, while all other lines revert to wild type when mixed.
   - **No fictional variants were added.** Parasite-induced "gold/platinum" cardinals are excluded. There is no albino ADF, because every albino "dwarf frog" is a Xenopus.
     - Chunk 16 leaves out GloFish, a trademarked, genetically modified line (ADR-0052 decision 2). It also leaves out the albino danio, because the art cannot yet show its pink eye, and the angelfish's leopard, where TAS and Norton disagree. The angelfish's halfblack, pearlscale, albino, streaked and platinum genes are left out too, and so are the harlequin's blue and black strains.
5. **Taxonomy is in flux.**
   - *Corydoras panda* is now *Hoplisoma panda*, and *Neritina natalensis* is now *Vittina natalensis*.
   - Trade kuhlis are *Pangio semicincta*.
   - Trade otos are mostly *O. vittatus* or *O. macrospilus*, sold as "affinis".
   - The trade bristlenose is *Ancistrus* sp. '3'.
   - Pet ADFs are a diploid lineage distinct from wild tetraploid *H. boettgeri*.
   - *Tanichthys albonubes* may be a cryptic species complex.
   - Discus have 3–5 recognised species depending on the author.
   - Chunk 16:
     - The dwarf gourami's name has been disputed since 2022. The Catalog of Fishes and FishBase follow Knight et al. (2022) and treat *Trichogaster lalius* as a synonym of *T. fasciata*. Aquarium Glaser argues the 1801 description doesn't fit. The game keeps *T. lalius*.
     - The ghost shrimp is *Palaemon paludosus* (WoRMS; De Grave & Ashelby 2013), where ADR-0052 listed *Palaemonetes paludosus*. "Ghost shrimp" is a loose trade name that also covers *Macrobrachium* and the look-alike *Palaemonetes kadiakensis*.
     - The ramshorn is *Planorbella duryi*, where ADR-0052 listed *Planorbella* sp. FWGNA treats it as *Helisoma scalare duryi*, and some UK red ramshorns are *Planorbarius corneus*.
     - Some trade harlequins may be *Trigonostigma truncata* (Tan 2020).
     - Aquarium angelfish may carry genes from more than one wild *Pterophyllum* species.
     - Most trade platies and swordtails have each other's genes. The game keeps them apart and does not cross species.
   - Roster ids and scientific names are kept stable; the notes explain these points.
6. **Compatibility disputes are encoded as probabilities, not certainties.**
   - Pea puffer vs dwarf shrimp: Seriously Fish says some shrimp work, while Co-Op and keepers report hunting. Encoded as `high_risk`, mitigated by cover.
   - Dwarf crayfish predation: The Shrimp Farm and Amazonas say safe; Aquatic Arts, Aquariadise and others say opportunistic. Encoded as `conditional` with a low daily risk.
   - ADF vs shrimp: `conditional`.
   - Betta vs shrimp: `conditional`.
   - White clouds with fancy goldfish: PetMD says yes, Co-Op warns about speed. Encoded as `conditional`.
   - Endler × guppy hybridisation: `conditional`, with zero incident risk. It is a breeding-purity warning, not a welfare risk.
   - Chunk 16:
     - Dwarf gourami vs shrimp: Seriously Fish lists cherry shrimp as tankmates, while Aquarium Co-Op says it eats them. Encoded as `shrimpSafe 'caution'`.
     - Dwarf gourami vs betta: `high_risk`. Against the honey gourami and fancy guppy males: `conditional`.
     - Angelfish vs neon tetras: Tier 2 pages warn about small fish, "small fish such as tetras" and nano fish, but name the neon only in forum consensus. Encoded as `high_risk`, mitigated by cover.
     - Shrimp safety for the ram and the harlequin is not covered by any source. Encoded as `mostly_safe` (shrimplets at risk).
     - Zebra danios nip long-finned fish mainly in small groups: `conditional` against `tag:long_fins`.
7. **Required rules implemented as data:**
   - **Goldfish vs `tag:shrimp_dwarf`:** floor `high_risk`, "Goldfish may eat these shrimp …". Shrimplets are covered by a separate `tag:shrimp_fry` rule at 0.8 per day. Cover mitigates but never removes the risk.
   - **Goldfish flags:** `heavyWaste`, `coolWater` and `outgrowsSmallTanks`.
   - **Otocinclus:** needs a mature tank (`requiresMatureDays` 14) and a group of 6 or more.
   - **Corydoras:** group of 6 or more, sand, and `needsSinkingFood`.
   - **Kuhli loach:** group of 5 or more, sand, `escapeArtist` and `burrower`.
   - **Hillstream loach:** `highOxygen`, `coolWater`, high flow and biofilm.
   - **Amano shrimp:** breeding uses `shrimp_larval_marine`.
   - **Nerite snail:** breeding is `not_in_game`; its eggs do not hatch in freshwater.
   - **Mystery snail:** lays clutches above the waterline.
   - **ADF:** slow `target_fed` feeder, clearly distinguished from the clawed frog.
   - **Discus:** advanced, warm, soft water, kept in groups.
   - **Cardinal vs neon:** cardinals are warmer (ideal 24–28 vs 22–25 °C) and softer or more acidic (ideal pH 5.0–6.5 vs 6.0–7.0).
   - **White clouds** are cool-water and tagged `fish_tiny`, so the axolotl's `tag:fish_tiny` rule catches them.
   - **Chunk 16:**
     - **German blue ram:** warm (ideal 27–30 °C) and soft, a mature tank (`requiresMatureDays` 30) and `needsSinkingFood`. It is a `substrate_spawner` with both parents guarding.
     - **Freshwater angelfish:** a `substrate_spawner` pair with both parents guarding, and a tall tank.
     - **Platy and swordtail:** `livebearer`, with broods about every four weeks.
     - **Dwarf gourami:** `bubble_nest` with male care.
     - **Harlequin rasbora and zebra danio:** `egg_scatter_cover`.
     - **Ghost shrimp:** `shrimp_berried`. The larvae need no brackish water, and the larval week counts as rearing.
     - **Ramshorn snail:** `snail_egg_clutch`. It lays under water on the glass, so it needs no lid, unlike the mystery snail.
8. **Starter unlocks are a design decision.**
   - The roster encodes starters as `starter|<group>`. The records therefore require the group key, and the player's chosen starter must be granted by new-game setup.
   - This is flagged for the orchestrator.
   - Chunk 16's nine species have no unlock key (`unlock.requires: []`), so they are in the shop from the start (ADR-0052 decisions 4 and 9).
9. **Search limits.** A few primary papers (Kwon/Zhang betta genetics, Tyrp1 copper full text) could not be opened. Claims that depended on them were either dropped or labelled.
   - In chunk 16, FishLore and cichlidae.com returned 403, and so did the PubMed, IUCN, Springer and Nature pages.
   - The Angelfish Society's site has a broken HTTPS certificate, so its pages were read over http.
   - IUCN years are FishBase's assessment dates. Wikipedia often gives the publication year instead (ram 2020 against 2022; harlequin 2019 against 2020).

## Visual notes for render lanes

All colours are 6-digit hex (`#rrggbb`) and are validated by `tests/sim/species-fw.test.ts`.

**How phenotypes combine:**
- Phenotype `visual` objects are partial overrides on top of `genetics.baseVisual`.
- The first matching `base` rule wins.
- Every matching `overlay` rule is then applied in order.
- For livebearers, gouramis and bettas, phenotypes describe the **showier sex, the male**. Renderers should derive the female look from `sex` (see the sex table below).

### Every `finType` string used

The **fish** lane draws these body plans:

- `puffer`: pea puffer.
- Betta tails (starter): `veiltail`, `halfmoon`, `crowntail`, `plakat`, `double_tail`.
- `comet`: slim single-tailed goldfish with a long, deeply forked tail.
- `common`: short-tailed single-tail goldfish.
- `fantail`: egg-shaped body, double tail and anal fins, high dorsal fin, no hump.
- `oranda`: fantail body with a raspberry-like head hood (wen). Draw the wen in `accentColor` blended into `bodyColor`; for the "Red Cap" overlay the wen is red (`accentColor`) on a white body.
- `ryukin`: short, deep body with a hump behind a pointed head, and long flowing double fins.
- `ranchu`: egg body, **no dorsal fin**, arched back, short double tail tucked at about 45°, wen on the head.
- `telescope`: fantail body with protruding eyes. A black telescope is the "Black Moor".
- Guppy tails:
  - `delta`: broad triangle spreading 55–75°.
  - `veiltail`: narrower, 40–50°, with a draping trailing edge.
  - `double_sword`: upper and lower rays extended as swords, with a clear centre.
  - `top_sword`: a single upper sword.
  - `lyretail`: curved outer rays with a short centre.
  - `spade`: short and pointed.
  - `round`: short and rounded.
- `endler`: small livebearer with a short tail, often a "sword and a half". `top_sword` is also used by the Yellow Sword line.
- `tetra`: small fusiform characin with an adipose fin. `tetra_longfin`: all fins lengthened and flowing.
- `minnow`: white cloud, a slim cyprinid. `minnow_longfin`: the "meteor" long-fin form.
- `medaka`: surface fish with a flat back, upturned mouth, large dorsal and anal fins set far back, and big eyes.
  - `medaka_longfin` (hire-naga): veil-like fins.
  - `medaka_dharma`: short compressed body, used with `bodyDepth` 1.15.
- `corydoras`: armoured catfish with snout barbels, stout fin spines and a high dorsal. `corydoras_longfin`: elongated dorsal and anal fins.
- `otocinclus`: tiny slim sucker-mouth catfish.
- `pleco`: bristlenose, a broad flat armoured sucker-mouth catfish. Adult males carry fleshy snout tentacles ("bristles"); scale these with sex and age. `pleco_longfin`: extended fins. Super long-fin is the same type with `finLength` 1.6.
- `eel_loach`: kuhli, eel-like with tiny fins. `bodyDepth` is 0.85.
- `hillstream`: flat disc-like body with broad fanned paired fins forming a suction disc. `bodyDepth` is 0.8.
- `gourami`: honey gourami, a compressed oval body with long thread-like pelvic "feelers".
- `discus`: tall, round, laterally compressed disc with red eyes on wild types. `bodyDepth` is 1.15.
- Chunk 16: each new fish has its own plan in `src/render/creatures/fish/` (the platy and swordtail share `xiphophorus.ts`, with two builds). There, `standard` means the plan's own body, and the other strings are forms the plan reads:
  - Freshwater angelfish: `standard`, `veil` and `superveil` (`finLength` 1.4 and 1.75: every fin longer).
  - German blue ram: `standard` and `balloon` (a short, high, round body; `bodyDepth` 1.15).
  - Harlequin rasbora: `standard`.
  - Zebra danio: `standard` and `longfin` (`finLength` 1.6: long flowing fins and tail).
  - Platy: `standard` and `hifin` (a tall, flag-like dorsal). Swordtail: `standard`, `hifin`, `lyretail` (long upper and lower tail rays) and `hifin_lyretail` (both). Two new appearance fields go with them: `tailSpot` (`mickey`, `moon`, `crescent`, `comet`, `twin`) and `bodyMark` (`tuxedo`, the black rear half).
  - Dwarf gourami: `gourami`, the honey gourami's labyrinth build, deeper and with longer dorsal and anal fins.

The **special** lane draws these:

- `axolotl`: starter.
- `shrimp`: Neocaridina and Caridina shrimp.
- `snail_apple`: mystery snail. A tall spired shell, a long siphon ("snorkel"), long tentacles and an operculum.
- `snail_nerite`: low, rounded, smooth shell with an operculum.
- `crayfish`: CPO crayfish.
- `frog`: ADF. Webbed front and hind feet, eyes on the sides of the head, rough skin.
- Chunk 16:
  - `shrimp`: the ghost shrimp has its own spec, slimmer and longer-snouted than the dwarf shrimps and nearly clear.
  - `snail_ramshorn`: ramshorn snail. A flat, coiled (planispiral) shell carried upright on its edge, smooth and glossy, with no operculum.

### Patterns and morphs per species

| Species | Render lane | finType values | Patterns used | Morph names |
|---|---|---|---|---|
| `axolotl` | special | `axolotl` | `speckled`, `solid`, `none` | White Albino, Golden Albino, Leucistic, Copper, Melanoid, Axanthic, Wild Type |
| `betta` | fish | `veiltail`, `plakat`, `halfmoon`, `crowntail`, `double_tail` | `solid`, `butterfly`, `bicolor`, `marble`, `dragon_scale` | Red, Royal Blue, Turquoise, Steel Blue, Copper, Black Melano, Yellow, Opaque White, Multicolour, Butterfly, Bi-colour, Marble, Dragon Scale, Veiltail, Plakat, Halfmoon, Crowntail, Double Tail |
| `pea_puffer` | fish | `puffer` | `spots` | Golden, Wild Type, Bold-spotted |
| `cherry_shrimp` | special | `shrimp` | `mottled`, `solid`, `speckled` | Painted Fire Red, Fire Red, Sakura Red, Red Cherry, Blue Dream, Blue Velvet, Yellow Golden Back, Orange Sunkist, Green Jade, Black Rose, Chocolate, Wild Type, High Grade |
| `comet_goldfish` | fish | `comet`, `common` | `solid`, `mottled`, `koi` | Calico (Shubunkin-type), Matte, Sarasa Red & White, Yellow, White, Bronze, Red-Orange, Common (short tail) |
| `fancy_goldfish` | fish | `fantail`, `oranda`, `ryukin`, `telescope`, `ranchu` | `solid`, `mottled`, `koi` | Calico, Matte, Red & White, Black, White, Red-Orange, Oranda, Fantail, Ryukin, Telescope, Ranchu, Red Cap |
| `neon_tetra` | fish | `tetra`, `tetra_longfin` | `lateral_stripe` | Albino, Gold, Diamond Head, Neon, Long-fin |
| `panda_corydoras` | fish | `corydoras`, `corydoras_longfin` | `saddle` | Panda, Long-fin, Bold-masked |
| `mystery_snail` | special | `snail_apple` | `solid`, `bands` | Wild (Banded Brown), Black, Chestnut, Purple, Magenta, Jade, Gold, Blue, Ivory, Banded |
| `nerite_snail` | special | `snail_nerite` | `bars` | Olive Zebra, Zebra, Bold-striped |
| `fancy_guppy` | fish | `delta`, `veiltail`, `double_sword`, `top_sword`, `lyretail`, `spade`, `round` | `mottled`, `bicolor`, `reticulated`, `bars`, `marble`, `speckled`, `koi` | Full Red, Moscow Blue, Black Moscow, Moscow Green, Moscow Purple, Yellow, Platinum, Mixed Colour, Tuxedo, Snakeskin, Cobra, Mosaic, Grass, Koi, Delta, Veiltail, Double Sword, Top Sword, Lyretail, Spade, Roundtail, Albino |
| `endlers_livebearer` | fish | `endler`, `top_sword` | `mottled`, `bars`, `reticulated`, `spots`, `lateral_stripe` | Black Bar, Tiger, El Silverado, Yellow Sword, Red Chest, Lime Green, Peacock, Endler (mixed line) |
| `amano_shrimp` | special | `shrimp` | `spots` | Wild Type, Heavily marked |
| `otocinclus` | fish | `otocinclus` | `lateral_stripe` | Otocinclus, Crisp-striped |
| `white_cloud_minnow` | fish | `minnow`, `minnow_longfin` | `lateral_stripe` | Golden, White Cloud, Long-fin (Meteor) |
| `medaka` | fish | `medaka`, `medaka_longfin`, `medaka_dharma` | `speckled`, `lateral_stripe` | Shiro (White), Youkihi, Himedaka (Orange), Ao (Blue), Kuro (Wild), Miyuki, Lamé, Hire-naga (Long-fin), Dharma |
| `honey_gourami` | fish | `gourami` | `solid` | Wild Honey, Gold Honey, Red Honey (Sunset) |
| `kuhli_loach` | fish | `eel_loach` | `bands` | Yellow-ground Kuhli, Striped Kuhli, Broad-banded |
| `hillstream_loach` | fish | `hillstream` | `reticulated` | Reticulated, Bold-netted |
| `bristlenose_pleco` | fish | `pleco`, `pleco_longfin` | `spots`, `solid`, `mottled` | Blue-eye Lemon, Super Red, Calico, Lemon, Albino, Brown (Wild), Long-fin, Super Long-fin |
| `african_dwarf_frog` | special | `frog` | `spots` | Blonde, Wild Type, Heavily spotted |
| `cardinal_tetra` | fish | `tetra` | `lateral_stripe` | Albino, Orinoco form, Cardinal |
| `dwarf_crayfish` | special | `crayfish` | `marble`, `mottled` | Wild Brown, Orange, Heavily Marbled |
| `discus` | fish | `discus` | `bars`, `solid`, `reticulated`, `speckled`, `lined`, `spots` | Marlboro Red, Checkerboard, Pigeon Blood, Golden, Blue Diamond, Alenquer Red, Red Turquoise, Turquoise, Brown (Wild-type), Snakeskin, Leopard |
| `freshwater_angelfish` | fish | `standard`, `veil`, `superveil` | `bands`, `solid`, `marble`, `bars`, `spots`, `mottled` | Black, Black Lace, Hybrid Black, Silver Marble, Marble, Silver Gold Marble, Gold Marble, Gold, Silver, Clown, Zebra, Ghost, Blushing, Smokey, Chocolate, Veil, Superveil; strains Koi and Zebra Lace |
| `german_blue_ram` | fish | `standard`, `balloon` | `speckled` | Electric Blue Ram, Gold Ram, German Blue Ram, Balloon |
| `harlequin_rasbora` | fish | `standard` | `solid` | Golden Harlequin, Harlequin Rasbora, Richly coloured |
| `zebra_danio` | fish | `standard`, `longfin` | `lined`, `spots` | Golden, Wild Type, Leopard, Long-fin |
| `platy` | fish | `standard`, `hifin` | `solid`, `speckled` | Red, Blue, Gold, Wild Grey, Mickey Mouse, Moon, Wagtail, Comet, Crescent, Twin-spot, Tuxedo, Salt-and-pepper, Hi-fin |
| `swordtail` | fish | `standard`, `hifin`, `lyretail`, `hifin_lyretail` | `solid` | Albino, Black, Red, Green, Tuxedo, Wagtail, Hi-fin Lyretail, Lyretail, Hi-fin |
| `dwarf_gourami` | fish | `gourami` | `bars` | Wild Dwarf Gourami, Neon Blue, Powder Blue, Flame |
| `ghost_shrimp` | special | `shrimp` | `lined` | Ghost Shrimp, Richly coloured |
| `ramshorn_snail` | special | `snail_ramshorn` | `solid`, `spots` | Red, Blue, Brown, Leopard |

### Field mapping by body plan (where it differs from the fish default)

**Tetras** (`neon_tetra`, `cardinal_tetra`), pattern `lateral_stripe`:
- `accentColor` is the iridescent blue stripe.
- `bodyColor2` is the red zone. On the **neon** it covers the rear half of the lower body only; on the **cardinal** it runs the full length, and `bellyColor` is red too.
- `bodyColor` is the olive back.
- The stripe fades at night (AI behaviour `night_colour_fade`).

**White cloud:**
- `accentColor` is the gold-white lateral stripe.
- `finColor` is the red fins.
- `finColor2` is the pale fin edges.

**Otocinclus:** `accentColor` is the dark snout-to-tail stripe.

**Medaka:**
- The `miyuki` overlay sets `lateral_stripe` with a metallic `accentColor`. This is a line **along the top of the back**, seen from above, not a flank stripe.
- `lamé` uses `speckled` for scattered glitter scales.

**Panda corydoras**, pattern `saddle`: `accentColor` paints three black marks: the eye mask, the dorsal-fin blotch, and a band across the tail base.

**Kuhli loach**, pattern `bands`: 10–15 dark saddle bands (`accentColor`) that stop short of the belly.

**Hillstream loach**, pattern `reticulated`:
- `accentColor` is the dark net pattern.
- `finColor2` is one or two concentric dark bands on the fanned paired fins.

**Goldfish:**
- `koi` means red patches (`accentColor`) on a white body (Sarasa / Red & White).
- Calico `mottled` means a blue-white base (`bodyColor`) with orange patches (`bodyColor2`) and black speckles (`accentColor`), plus lower `metallic` and higher `translucency` (nacreous scales).
- `Matte` sets `metallic` 0.
- Normal goldfish scales are metallic (`metallic` ≈ 0.5).

**Guppy:**
- Base fields:
  - `bodyColor` is the front body; `bodyColor2` is the rear body and peduncle.
  - `finColor` is the caudal colour; `finColor2` is the caudal edge.
  - `accentColor` is the pattern marks.
- Pattern values:
  - `bicolor` = tuxedo (dark rear half).
  - `reticulated` = snakeskin chain-link.
  - `bars` = cobra rosettes and bars.
  - `marble` = mosaic (mainly on the tail).
  - `speckled` = grass (fine dots on the tail).
  - `koi` = red patches on white.
- Albino = red eyes.

**Endler's livebearer:** a male mosaic.
- `bodyColor2` is the orange flank patch.
- `accentColor` is the black bar, stripes or ocellus.
- `finColor2` is the sword edge or blue patch.

**Honey gourami:** `accentColor` is the **breeding** throat colour (blue-black). Apply it to the throat, face and front belly only while the male is displaying or nesting.

**Discus:**
- Base fields:
  - `bodyColor` is the body; `bodyColor2` is the head and face (the pale head of the Marlboro Red).
  - `accentColor` is the striations, bars, pepper or honeycomb.
  - `finColor` and `finColor2` are the fins and fin edge.
- Pattern values:
  - `lined` = wavy horizontal striations (turquoise, red turquoise).
  - `bars` = 9 vertical bars on wild types, or about 14 thin bars for snakeskin (`patternScale` 1.6).
  - `reticulated` = checkerboard honeycomb.
  - `speckled` = pigeon-blood pepper.
  - `spots` = leopard.
- Stress bars can flash dark on any strain (behaviour `stress_bar_flash`).

**Bristlenose:**
- `accentColor` is the pale spots on brown fish, or the dark patches on calico.
- Albino eyes are red; blue-eye lemon eyes are `#4f7fb8`.

**Freshwater angelfish** (chunk 16):
- `bodyColor`/`bellyColor` are the silver ground. `bodyColor2` is the crown on top of the head (gold to orange on gold and koi forms) and the olive sheen on the back.
- `accentColor` is the bars and marbling. `finColor` is the sheer fins; `finColor2` is their dark edges and striations. `eyeColor` is the iris, red in wild-type fish.
- Pattern values: `bands` = the wild silver's four bars, `bars` = zebra, `marble` = marble and koi, `mottled` = smokey and chocolate, `spots` = clown, `solid` = stripeless, gold and black.

**German blue ram** (chunk 16):
- `bodyColor` is the violet-grey to yellow-green flank; `bodyColor2` is the golden-orange head and chest.
- `accentColor` is the electric-blue spangles over the body and fins.
- `finColor` is the fins; `finColor2` is their red edges and the pelvic fins.
- `eyeColor` is the red iris. The art draws the black eye bar, the black flank blotch and the black first dorsal spines on every form.

**Harlequin rasbora** (chunk 16):
- `bodyColor` is the coppery orange flank; `bodyColor2` is the purplish sheen on the front body.
- `accentColor` is the velvety black wedge (Tan 2020's "axine") from below the dorsal fin to the tail base.
- `finColor` is the orange-red dorsal and tail; `finColor2` is their clear tips. `eyeColor` is the orange iris.

**Zebra danio** (chunk 16):
- `bodyColor` is the gold-silver stripes between the blue ones.
- `accentColor` is the five blue-black horizontal stripes, which run on through the tail and anal fin (rows of spots on leopards).
- `finColor` is the fins; `finColor2` is their stripes.

**Platy and swordtail** (chunk 16, one plan):
- `bodyColor`/`bodyColor2` are the flank and back (olive-green with a darker back on the wild swordtail).
- `finColor` is the fins. `finColor2` is their edges: black on wagtails, and on the swordtail the sword's bright upper edge (the art adds its black lower edge).
- `accentColor` is the salt-and-pepper speckles on the platy and the red-brown zigzag flank line on the swordtail.
- `tailSpot` is the tail-base marking and `bodyMark` `tuxedo` is the black rear flank.

**Dwarf gourami** (chunk 16), male colours:
- `bodyColor` is the steel-blue body; `accentColor` is the slanting red-orange bars, which run on into the fins.
- `finColor` is the orange fins with red spots; `finColor2` is their blue edges and the turquoise throat.

**Shrimp** (`cherry_shrimp`, `amano_shrimp`):
- Base fields:
  - `bodyColor`/`bodyColor2` are the carapace and abdomen; `bellyColor` is the underside.
  - `finColor` is the legs, pleopods and tail fan.
  - `translucency` is key: wild and amano about 0.55–0.6, fire red about 0.08, painted about 0.03.
- **Cherry shrimp:**
  - `accentColor` is the dorsal stripe or saddle highlight (the golden back of the Yellow Golden Back).
  - Grades differ by colour coverage: cherry is patchy (`mottled`), sakura partial, fire red solid, painted solid including the legs.
- **Amano shrimp:**
  - `finColor2` is the pale dorsal stripe.
  - `accentColor` is the reddish-brown side markings: long dashes on **females**, round dots on **males**.
- **Ghost shrimp** (chunk 16):
  - `bodyColor`/`bodyColor2`/`bellyColor` are the nearly clear body (`translucency` 0.85); the gut shows through.
  - `finColor2` is the orange bands on the antennae and front claws; `accentColor` is the speckles and the red dots on the tail fan.
  - `gillColor` is the green eggs under a berried female's tail.

**Snails** (`mystery_snail`, `nerite_snail`):
- `bodyColor`/`bodyColor2` are the shell.
- `accentColor` is the shell bands or zigzag stripes: `bands` are spiral bands on the apple snail; `bars` are zigzags following the nerite's growth lines.
- `finColor` is the soft body (foot, head, tentacles); `bellyColor` is the foot sole.
- Mystery snail "blue" and "jade" come from a dark soft body under a pale or yellow shell, so draw the body colour through a slightly translucent shell.
- **Ramshorn snail** (chunk 16): `bodyColor`/`bodyColor2` are the flat, coiled shell (pale translucent brown in wild snails); `accentColor` is the leopard spots. A red snail's red body shows through its golden shell.

**Crayfish:**
- `bodyColor` is the carapace and tail.
- `accentColor` is the darker marbling.
- `finColor` is the legs and claws; `finColor2` is the claw tips.

**Frog (ADF):**
- `bodyColor` is the back and `bellyColor` the belly.
- `finColor` is the foot webbing.
- `accentColor` is the dark spots.

### Sex differences renderers should apply (phenotype = the showier sex)

| Species | Male | Female |
|---|---|---|
| Fancy guppy | as phenotype; long fins | ≈1.4× longer, `bodyDepth` +0.1, silvery olive-grey body (`#9a9a88`–`#b8b4a0`), short rounded tail (`finLength` × 0.6), a little tail colour |
| Endler's | as phenotype | ≈1.5× longer, plain tan-silver (`#b8b09a`), clear fins |
| Betta | as phenotype | `finLength` × 0.6, slightly duller |
| Honey gourami | as phenotype | silvery grey-brown `#b8a58a` with a brown mid-lateral stripe `#7a5c3a` |
| White cloud, medaka | longer dorsal/anal fins | rounder belly |
| Pea puffer | dark belly stripe, wrinkle lines behind the eye | rounder, yellowish belly |
| Cherry shrimp | paler, more translucent (+0.15) | full colour, visible saddle, larger |
| Amano shrimp | dotted side markings | dashed side markings, larger |
| Bristlenose | snout bristles, larger | few or no bristles |
| Corydoras, otocinclus, tetras | slimmer | rounder, slightly larger |
| African dwarf frog | small gland behind each front leg | larger, pear-shaped |
| Axolotl | swollen cloaca when mature | rounder body |
| Goldfish | white breeding tubercles on the gill covers in season | rounder |
| Dwarf gourami (chunk 16) | as phenotype | silvery grey-blue with faint bars (the young look like females) |
| German blue ram (chunk 16) | larger, a taller dorsal with longer front rays | smaller, a rose-pink belly, a shorter dorsal |
| Harlequin rasbora (chunk 16) | a sharper-cornered wedge reaching further down | a rounder wedge; slightly larger and rounder |
| Zebra danio (chunk 16) | slimmer | deeper-bellied, slightly larger |
| Platy, swordtail (chunk 16) | smaller, with a gonopodium; swordtail males grow the sword | rounder, with a gravid spot; the young look like females |
| Freshwater angelfish (chunk 16) | alike | alike (they differ only in the breeding papilla at spawning time) |
| Ghost shrimp (chunk 16) | about 4 cm | about 5 cm; green eggs under the tail when berried |
| Ramshorn snail (chunk 16) | — | — (a hermaphrodite; all alike) |

---

# Chunk 17: big freshwater fish (ADR-0053)

### About the chunk 17 big freshwater research
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

### Game data
The values the game uses are in `src/data/species/freshwater/oscar.ts`; this research proposed them, and the source check at the end of this chapter corrected some of them.

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

### Game data
The values the game uses are in `src/data/species/freshwater/clown_loach.ts`; this research proposed them, and the source check at the end of this chapter corrected some of them.

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

### Game data
The values the game uses are in `src/data/species/freshwater/black_ghost_knifefish.ts`; this research proposed them, and the source check at the end of this chapter corrected some of them.

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

### Game data
The values the game uses are in `src/data/species/freshwater/fahaka_puffer.ts`; this research proposed them, and the source check at the end of this chapter corrected some of them.

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

### Game data
The values the game uses are in `src/data/species/freshwater/ornate_bichir.ts`; this research proposed them, and the source check at the end of this chapter corrected some of them.

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

### Game data
The values the game uses are in `src/data/species/freshwater/silver_arowana.ts`; this research proposed them, and the source check at the end of this chapter corrected some of them.

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

- `tag:fish_tiny` and `tag:fish_small`: incompatible, 0.4 / 0.3.
- `tag:fish_medium`: high_risk, 0.1, mitigatedBy `tank_size`.
- `tag:shrimp_dwarf`: incompatible.
- `tag:amphibian`: incompatible.
- `oscar`: conditional, "young arowana are harassed by cichlids (LA)", mitigatedBy `tank_size`.
- `fahaka_puffer`: incompatible.

### Smallest tank tier for an adult
**500 gal (120×36×27 in).** SF wants at least 2 m (79 in) of length. The hobby consensus is 8×3 ft (96×36) minimum, 10 ft preferred, and the fish needs about its own body length (85–90 cm, ~35 in) of width to turn. Every tier below 500 is only 24 in wide, so 500 is the smallest that fits. The 300 gal (96×24) has the length but not the width. LA's 250 gal is a minimum for a sub-adult at best.

---

## Cross-species notes (big freshwater fish)
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

## Sources (big freshwater fish)
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

## Source check, 2026-10-30 (big freshwater fish)
Before building, a second agent checked the facts the game uses against the sources (claims marked UNVERIFIED were softened or labelled in the data, never used as fact). Its notes, as written:

- O. bicirrhosum (Cuvier 1829) valid; 85 cm; 500 gal 120x36 judgement (SF ≥2 m long; LA 250). Temp SF 20–30 FB 24–30; pH 5.0–7.5. Maturity ~2 y; brood 57–146 fry (Verba), brooding ~6 wk (FB), 50–60 d (LA). Lifespan >10 y (Zoo); price $59.99 LA (3–5 in). IUCN LC 2020; not CITES (Wikipedia). US: MS and OK prohibited (Osteoglossidae / Osteoglossum spp.), HI conditional list (rules as of 2019, USFWS ERSS 2020). Brazil: the trade in juveniles for ornamentals is illegal (Verba). Peru: "the trade may threaten stocks" (Moreau & Coomes: killing brooding males). PLATINUM: PFK "an Osteoglossum species from South America", virtually white, exceptionally rare; price no currency -> unverified as O. bicirrhosum; note it. Juvenile: blue glints, yellow-orange bar, dark stripe (Zoo, SF) vs Wikipedia "same colouring throughout" -> conflict note.

---

# Chunk 17: koi and the motoro stingray (ADR-0053)

### About the chunk 17 koi, ray and brackish research
Researched 2026-10-30 for the big-tank chunk. Every page below was opened unless a row says otherwise. Three kinds of page could not be opened: ResearchGate and ScienceDirect (403), Seriously Fish's mono and scat pages (404), and Animal-World (it now redirects to The Vet Desk). Where a claim rests only on a search-result summary, the row says so. Time conversions follow `docs/GAME_DESIGN.md`: real days × 8 = game hours, real years × 40 = game days (lifespan capped near 500), and maturity takes 8–25 game days.

Repo facts used (read only):
- `src/sim/compat/salinity.ts` decides where a species may live. A brackish species may live in a freshwater tank if `salinitySG.min ≤ 1.001`, and in a marine tank if `salinitySG.max ≥ 1.020`.
- The brackish class runs at SG 1.003–1.018 (ideal 1.004–1.012, new water 1.008). Marine runs at 1.019–1.028 (`src/sim/water/constants.ts`).
- The genetics engine has no lethal genotypes: the swordtail and platy notes say "two copies are reportedly lethal, which the game does not model".
- The koi shader pattern (`pattern: 'koi'`, pid 13 in `src/render/creatures/core/shaders.ts`) draws large irregular patches: `accentColor` is the red and `bodyColor2` the black.
- The `livebearer` module (`src/sim/life/breeding/systems/livebearer.ts`) has these behaviours:
  - stored sperm: 2 extra broods after one mating;
  - a `fry_cloud` of fry eaten by adults unless there is cover;
  - stress on the females in male-heavy groups;
  - a cooldown, then gravid again.
- The `egg_scatter_cover` module (spawners.ts) works like this: a morning chase into plants, scattered eggs that the parents eat, then larvae and fry fed infusoria and baby brine.

---

## Koi
*Cyprinus rubrofuscus* Lacepède, 1803 (domesticated Amur carp; often still labelled *Cyprinus carpio* or "*C. carpio* var. koi") · `goldfish` behaviour set · `egg_scatter_cover`

**Name check:**
- Eschmeyer's Catalog of Fishes lists *C. rubrofuscus* as valid and *C. carpio* var. *haematopterus* as its synonym. Kottelat (2006) gave *rubrofuscus* precedence over *annacarolina*.
- Wikipedia and NC Fishes call koi domesticated Amur carp, *C. rubrofuscus*. In mtDNA, koi fall in the East Asian clade, but they also carry some genes from Japanese native carp.
- FishBase and most koi papers (Gomelsky, Bar, Andrian) still write *C. carpio*.
- **Use `Cyprinus rubrofuscus`**, with a confidence note that koi are often sold and published as *C. carpio*.

| Source | Tier | Facts used |
|---|---|---|
| [Catalog of Fishes: *haematopterus*](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=28864), [*annacarolina*](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=45163) | 1 | Both names are synonyms of ***C. rubrofuscus* Lacepède 1803** (Kottelat 2006, 2013; Endruweit 2025); freshwater and brackish |
| [FishBase: *C. rubrofuscus*](https://www.fishbase.se/summary/Cyprinus-rubrofuscus.html) | 1 | Amur to Red River drainages (China, Laos, Vietnam); silvery wild fish with red pelvic, anal and lower caudal fins in one stock; IUCN LC (2020) |
| [FishBase: *C. carpio*](https://www.fishbase.se/summary/Cyprinus-carpio.html) | 1 | **3–35 °C, pH 6.5–9.0, dH 10–15**; max 129 cm TL; **38 years** reported; spawns in shallow weedy margins; **breeding at 15–20 °C**; >1 million sticky eggs a season, laid on plants; **hatch in ~4 days**; adults eat benthic animals and plants |
| [ADW: *C. carpio*](https://animaldiversity.org/accounts/Cyprinus_carpio/) | 1 | 30–60 cm usual; **47 years** in one (probably captive) fish; **hatch in ~3 days at 25–32 °C**; ~300,000 eggs from a 45 cm female; **mature at 3–5 years**; sucks up mud, leaving "feeding galleries"; **uproots plants**, raises turbidity; males have a larger ventral fin |
| [Casas et al. 2013, *PLoS ONE* 8:e83053](https://pmc.ncbi.nlm.nih.gov/articles/PMC3875451/) | 1 | **Kirpichnikov's two-gene scale model** (table below); NN lethal; S = *fgfr1a1*; N not yet identified; **nudes from koi crosses swam poorly, lost fins, were mostly toothless and disappeared in mixed tanks**; mirrors show moderate fin and tooth defects |
| Rohner et al. 2009, *Curr. Biol.* 19:1642 (via Casas 2013 and the [EurekAlert release](https://www.eurekalert.org/news-releases/858086)) | 1 | The S (mirror) gene is a duplicate of fgfr1 (*fgfr1a1*) |
| [Bar et al. 2013, *Front. Genet.* 4:6](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC3554881/fullTextXML) | 1 | **The Bekko black pattern (Sanke's sumi) is "most likely controlled by a single gene with a dominant black allele"** (Gomelsky et al. 1998; David et al. 2004); **the Utsuri pattern is "probably multigenic"**; *mc1r* alleles not linked to black; dark-early melanophores at hatching, dark-late ones ~2 weeks later |
| [Gomelsky, Novelo & Warner 2023, *N. Am. J. Aquacult.* 85:48](https://academic.oup.com/naja/article/85/1/48/7808805) | 1 | **The metallic koi "design" trait is a dominant allele of one gene (D/d)** (Katasonov 1973; De Kock & Gomelsky 2015); metallic koi × common carp give "ghost koi"; **melanin depigmentation in koi comes from recessive alleles at two duplicate genes, B1/b1 and B2/b2** (Katasonov 1978); red eyes are a dominant demelanisation mutation R, not albinism (Gomelsky et al. 2016) |
| Dasgupta, Cherfas, Gomelsky & Hulata 2003, *Isr. J. Aquacult.-Bamidgeh* 55 ([record](https://ija.scholasticahq.com/article/20349-inheritance-of-the-white-red-kohaku-color-complex-in-ornamental-koi-carp-cyprinus-caprio-l)) | 1 | Title and bibliography only (the abstract would not load). The **search summary**: the white–red (Kohaku) complex is "apparently controlled by many genes", and the white : white-red : red ratio varies with the parents' red |
| David et al. 2004, *Aquaculture* 233 ([abstract page, 403](https://www.sciencedirect.com/science/article/abs/pii/S0044848603006823)) | 1 | **Not opened.** Search summaries say at least 3 interacting genes control red, and that Kohaku was suggested to be heterozygous. Used only as supporting colour |
| [Andrian et al. 2024, *Vet. World* 17:1846](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC11422636/fullTextXML) | 1 | ~120 variants; **Kohaku, Sanke and Showa (Gosanke) the most cultivated**; **culling: Kohaku 60–65% at 40 days, Sanke 75–80% at 25–30 days, Showa 50–95% at 3–5 days**; optimum 23–25 °C, acceptable 15–35 °C; pH 7–9.5; sex hard to tell before ~5 months or 20–30 cm; 31–33% protein feed |
| [Saitama Prefecture Fisheries Research Institute: Hirenaga nishikigoi](https://www.pref.saitama.lg.jp/b0915/kenkyuseika/hirenaga.html) | 1 (government research station) | **The long-fin (butterfly) koi came from crossing nishikigoi with Indonesian long-finned carp ("kumpai", *C. carpio* var. *flavipinnis*), imported February 1980 and crossed from 1982**; fins about twice normal length; long-fin plus good colour ran **8.5% (Kohaku) to 41% (Platinum)**; inheritance not stated |
| [Wikipedia: Koi](https://en.wikipedia.org/wiki/Koi) | 3 | Breeding of variety lines began in the 1820s in Niigata; variety descriptions (Asagi, Shusui, Goshiki, Chagoi, Kumonryu, Doitsu, Ginrin); **fewer than 1% of a spawn are superior colour**; koi revert to wild colour within a few generations; best at **15–25 °C**, immune system weak below 10 °C; KHV and SVC; eat peas, lettuce, watermelon |
| [Wikipedia: Butterfly koi](https://en.wikipedia.org/wiki/Butterfly_koi) | 3 | Not judged by ZNA (Japan) or UK judges; AKCA has standards; long fins tear easily |
| [PetMD koi care sheet (M. Witherell, DVM, 2024)](https://www.petmd.com/fish/koi-fish-care-sheet) | 2 | Up to 3 ft; **25–50+ years**; **≥10 gal per inch (~250 gal for a 24–25 in adult)**, a small group 1,000+ gal; depth 3–6 ft; **64–75 °F**; **pH 7.0–8.6**; groups of at least five; outdoors healthier than indoors; **heavy nitrogenous waste; filter turning over the pond at least every 2 h** |
| [California Fish Vet (J. Sanders, DVM, DABVP Fish)](https://cafishvet.com/koi/can-koi-and-goldfish-be-kept-together/) | 2 | **Koi can live with goldfish**; **~250 gal per koi, ~500 for a breeding female**; "too large for a tank unless extremely big"; goldfish can carry CyHV-3 (KHV) |
| [POND Trade: Ponds by the numbers (K. Wallace 2014)](https://www.pondtrademag.com/ponds-by-the-numbers-rules-for-a-lawless-industry/) | 2 | **200 gal is the survival minimum per adult koi; show keepers give 1,000–2,000 gal per fish**; 3 ft minimum depth; turnover 1–2×/h |
| [POND Trade: Monochrome muji (T. Kodama)](https://www.pondtrademag.com/language-of-koi-monochrome-muji-is-pure-perfection/) | 2 | **Chagoi brown, friendly, fast-growing, often wins jumbo classes**; Soragoi blue-grey; **Karashi bred from Kigoi × Chagoi**, may have red-brown tail edges |
| [POND Trade: Hirenaga](https://www.pondtrademag.com/language-koi-long-finned-hirenaga-variety/) | 2 | Indonesian longfin × koi; "Hirenaga blood can be introduced to any variety"; long fins split and tear easily |
| [Practical Fishkeeping: identify your koi](https://www.practicalfishkeeping.co.uk/features/how-to-identify-your-koi-carp-a-complete-guide-to-koi-varieties/) | 2 | Variety looks: Kohaku, Sanke (sumi on the back, not the head), Showa (black wraps below the lateral line and the head; motoguro), Shiro and Hi Utsuri, Yamabuki, Kujaku, Hariwake, Tancho Kohaku, Chagoi; **a 101 cm Sanke won the 2023 AJKS** |
| [Kodama Koi Farm: variety guide](https://www.kodamakoifarm.com/?p=30694) | 2 | Asagi (blue, red pectoral bases), Shusui (doitsu Asagi), Goshiki (Asagi × Kohaku, 1918), Taisho Sanke (from Kohaku, 1918), Bekko, Ogon, Platinum, Tancho (one round head spot only), Doitsu, Ginrin |
| [Kodama Koi Farm: how to breed koi](https://www.kodamakoifarm.com/how-to-breed-koi) | 2 | Spring, "one chance a year"; parents older than 3 years; 1 female to 2–3 males; 10–15 spawning ropes in a 6 ft round tank 2 ft deep with a **cover net**; **hatch ~3 days at 77 °F**; fry need food ~24 h after hatching and eat baby brine for ~10 days; separate eggs from adults or they are eaten |
| [That Pet Place: domestic koi](https://www.thatpetplace.com/Domestic-Koi-219501) | 2 | $24.99 for 4–5 in; **300 gal per fish**; 36 in deep in ponds; 65–85 °F; no feeding below 45 °F; 40+ years; **cannot ship to Maine or New York** |
| [Pond Informer price chart](https://pondinformer.com/how-much-are-koi-fish/) | 3 | Pet-store koi $10–17 (2–5 in $8–20); large or extra-large domestic $350–2,500; Japanese grade AAA at auction to $16,000+ |
| [LiveAquaria: goldfish and koi](https://www.liveaquaria.com/blogs/ponds-water-gardens/goldfish-and-koi-compatible-pond-fish-for-a-dazzling-display), [The Pond Guy](https://www.thepondguy.com/learning-center/can-koi-and-goldfish-live-together) | 2–3 | Koi and goldfish share ponds; koi are fast, greedy eaters and not best with small or fancy goldfish; both eat anything that fits in the mouth |
| [Cuttlebrook Koi Farm: sexing](https://cuttlebrookkoifarm.co.uk/male-female-can-tell-matter/), [Pond Informer: sexing](https://pondinformer.com/koi-sex-identification/) | 3 | Males: breeding tubercles on the gill covers and pectorals, slimmer bodies, more pointed and solid-coloured pectorals. Females: rounder ("blimp") from above, vent convex |
| [Fitz Fish Ponds](https://fitzfishponds.com/blog/why-do-koi-fish-jump-out-of-the-pond-how-to-prevent-it/), [Koi Fish USA](https://koifishusa.com/blogs/koi-fish/why-do-koi-fish-jump) | 3 | Koi jump during spawning chases, in poor or low-oxygen water and when crowded; netting prevents losses |

### The scale genes (carp; koi "doitsu" follows them)
Kirpichnikov's model, as restated and tested by Casas et al. (2013):

| Genotype | Phenotype | Koi term |
|---|---|---|
| SS nn, Ss nn | fully scaled | *wagoi* (normal) |
| ss nn | scattered / mirror (subtypes "irregular" and classic "mirror"; modifiers) | **doitsu** (kagami; the "armour" form is the heavily scaled irregular end) |
| SS Nn, Ss Nn | linear (a row of scales along the lateral line) | rare in koi |
| ss Nn | nude / "leather" | *kawagoi* (leather doitsu) |
| any NN | lethal (25% loss in N × N crosses); Hungarian lines showed no lethality, so there may be a weaker N allele | – |

S is dominant over s (Rudzinsky, cited in Casas 2013), and S = *fgfr1a1* (Rohner 2009). N is a dominant mutant with recessive lethality, and the gene is unidentified. A dihybrid SsNn × SsNn gives scaled 3/16, linear 6/16, mirror 1/16, nude 2/16 and dead 4/16.

**Modelled as:**
- 70 cm adult, the middle of the 60–90 cm the brief gives. Jumbo show fish pass 100 cm (Practical Fishkeeping).
- `recommendedMinTankGallons 800`, footprint **144 × 36 in**: three adults at the vets' ~250 gal each = 750 gal, and the 800-gal tier is 36 in deep, which meets the 3 ft pond guidance.
- `freshwater_cool` only; `coolWater`, `heavyWaste`, `outgrowsSmallTanks` and `escapeArtist` (jumps; Kodama uses a cover net).
- Breeding is `egg_scatter_cover` with a 500-gal minimum, a cooling trigger and ≥18 °C, much like the goldfish entries. Eggs hatch in ~4 days (32 game hours). One spawning a year, maturity at 25 game days, lifespan at the 500-day cap.
- Genetics: real documented loci (scale S, metallic D, Bekko black, plus the butterfly fin of documented origin), plus game stand-ins for the line-bred, polygenic colour, with the named varieties as phenotypes and strains (below).

**Conflicts:**
1. **Name.** *C. rubrofuscus* (Catalog of Fishes, Wikipedia, NC Fishes) vs *C. carpio* (FishBase, most koi papers). The game uses *rubrofuscus* with a note. Wikipedia also says koi carry some Japanese carp genes, and butterfly koi descend from Indonesian *C. carpio* var. *flavipinnis*. Under the split, butterfly koi are technically a cross of two *Cyprinus* species.
2. **Tank size.** Survival minimum 200 gal per adult (POND Trade), 250 (PetMD, CA Fish Vet), 300 (That Pet Place), 500 for a breeding female (CA Fish Vet), 1,000–2,000 for show fish. The game uses about 250 per adult and a group of three: 800 gal.
3. **Group size.** PetMD says groups of at least five, but at 250 gal each that is 1,250 gal, more than any tier. The game uses `minGroup 2` and `idealGroup 3` and says why.
4. **Lifespan.** 25–50+ years (PetMD), 40+ (That Pet Place), 47 for a carp (ADW). The "Hanako, 226 years" scale count is not used. The lifespan sits at the 500 cap.
5. **Temperature.** Ideal 15–25 °C (Wikipedia), 64–75 °F (PetMD), optimum 23–25 °C (Andrian). Survival 3–35 °C (FishBase carp). The game uses an ideal of 15–24 °C to share `freshwater_cool` with goldfish.
6. **Spawning temperature.** 15–20 °C (FishBase carp) vs about 75 °F (Kodama). The game uses `minTempC 18`.
7. **Sexual size dimorphism** is not quantified in any source, so no `maleSizeFactor`.

### 1,000-gallon indoor tank (144 × 48 × 33 in) for 2–3 adults?
**Yes for two or three adults; no for show-grade standards or a group of five.**
- Volume: 1,000 gal is 333–500 gal per fish, which beats every per-fish rule above except show keepers' 1,000–2,000.
- Breeding group: one breeding female (500) plus two males (250 each) is exactly 1,000 gal (CA Fish Vet).
- Floor: 12 ft is about five body lengths of a 70 cm koi, and 4 ft wide gives room to turn.
- Depth: 33 in is 3 in short of the 36 in pond rule. That rule is about ponds (winter ice, sun, predators), which an indoor tank avoids. The 800-gal tier (36 in deep, 3 ft wide) also fits three adults.
- Caveats:
  - very strong filtration, turning the volume over every 1–2 h (PetMD, POND Trade);
  - a lid, because koi jump;
  - stocking calibrated against the game's water model (see the bioload note).

### Koi colour: what is documented, and the proposed game model
**Documented single genes:**
- S/s (scale): real; S dominant.
- N (leather and linear; NN lethal): real.
- D, metallic "design": dominant (Katasonov 1973; Gomelsky 2023).
- Bekko sumi (the Sanke black): one dominant gene (Gomelsky 1998; David 2004; per Bar 2013).
- B1/B2: melanin depigmentation needs recessive alleles at two duplicate genes (Katasonov 1978).
- R, red eye: dominant (Gomelsky 2016). It is the basis of red-eyed "akame" fish; leave it out (optional).
- A blue (Asagi) recessive allele (Katasonov) appears **only in a search-result summary of an older review**, so it is not verified.

**Polygenic or unknown:**
- Red (hi) pattern: many genes, ≥3 (Dasgupta 2003; David 2004).
- Utsuri/Showa black: probably multigenic (Bar 2013).
- Tancho (head spot only), Ginrin (sparkling scales), Yellow (Ki) vs red, Chagoi, Soragoi, Karashi, Goshiki, Asagi: line-bred; inheritance not documented in any source found.
- Butterfly fin: hobby sites call it dominant (Tier 3). Saitama's 41% long-finned Platinums fits a dominant gene in a heterozygous parent (expected 50%), but that is an inference, not a test.

**Left out:**
- *Leather (kawagoi) and linear scale forms (the N gene)*: NN is lethal, which the engine can't model. Nudes from koi crosses also have fin loss, toothlessness and poor swimming (Casas 2013), a welfare-problem form.
- *Ghost koi*: metallic koi × common carp.
- *Koi × goldfish hybrids*: sterile.
- *Kumonryu*: its black and white change with the seasons (Wikipedia), which the game can't draw.
- *Dyed or injected fish*: none known in koi.

**Proposed loci** (8; mode, alleles with game dominance and market frequency):

| Locus | Mode | Alleles (dominance, frequency) | Basis |
|---|---|---|---|
| `scale` | mendelian | `S` Scaled (2, 0.80) · `s` Doitsu (1, 0.20) | **Real** (S/*fgfr1a1*). ss = doitsu (mirror). The N locus is omitted (see above) |
| `metal` | mendelian | `D` Metallic (2, 0.15) · `d` Non-metallic (1, 0.85) | **Real dominant** (Katasonov; Gomelsky 2023) |
| `bekko` | mendelian | `Bk` Bekko sumi (2, 0.15) · `bk` none (1, 0.85) | **Real dominant** (Gomelsky 1998; David 2004). Expressed only on a white ground (Sanke, Shiro Bekko) |
| `hi` | additive | `h` No red (1, 0.40) · `H` Red (1, 0.60) | **Stand-in for a polygenic trait.** 0 doses: no red; 1: patterned red on white (Kohaku-type); 2: heavy red. Dasgupta's "many genes" and variable segregation; David's "Kohaku heterozygous" (unverified) fits Hh |
| `ground` | mendelian | `U` Utsuri black (6, 0.15) · `C` Chagoi brown (5, 0.10) · `G` Sora grey (4, 0.05) · `W` White (3, 0.50) · `Y` Ki yellow (2, 0.12) · `A` Asagi blue (1, 0.08) | **Stand-in for line-bred ground colours.** The order follows what is known: black patterns dominate over red, red-on-white and white (Gomelsky's hypothesis, per a review in a search summary); wild melanin (B) dominates over depigmentation (Katasonov 1978), so brown and grey sit above white; blue is said to be recessive (Katasonov, unverified). Two origin combinations get their own rules: **A/W = Goshiki** (Asagi × Kohaku, Kodama) and **C/Y = Karashi** (Kigoi × Chagoi, POND Trade) |
| `tancho` | mendelian | `T` none (2, 0.88) · `t` Tancho (1, 0.12) | **Undocumented**; modelled recessive (precedent: the neon tetra's undocumented forms) |
| `ginrin` | mendelian | `R` plain scales (2, 0.80) · `r` Ginrin (1, 0.20) | **Undocumented**; modelled recessive |
| `fin` | mendelian | `L` Butterfly (hirenaga) (2, 0.08) · `l` standard (1, 0.92) | Origin documented (Saitama); dominance from Tier 3 only. Flag it |

Frequencies are estimates; no market survey exists. Gosanke (Kohaku, Sanke, Showa) are set most common, following Andrian 2024.

**Proposed phenotype rules** (base: first match wins, listed in order; overlays after):

| id | Layer | When | Name | Look (hex) | Rarity |
|---|---|---|---|---|---|
| `platinum_ogon` | base | metal D any; ground W any; ground U, C, G, A none; hi H none | Platinum Ogon | solid metallic white `#e9ebee`, fins `#eef0f2`, metallic 0.95 | 0.15 |
| `yamabuki_ogon` | base | metal D any; ground Y any; ground U, C, G, W none (Y over A) | Yamabuki Ogon | solid glossy metallic yellow `#f0bd2a`, fins `#f4cc55`, metallic 0.9 | 0.15 |
| `hariwake` | base | metal D any; ground W any; U, C, G, A none; H het | Hariwake | metallic white `#e9ebee` with orange-yellow patches `#f0a028`, pattern koi | 0.2 |
| `orenji_ogon` | base | metal D any; ground W any; U, C, G, A none; H hom | Orenji Ogon | solid metallic orange `#ef7a1e`, metallic 0.9 | 0.2 |
| `goshiki` | base | ground A het + ground W het; H any | Goshiki | Kohaku-type red `#b8321e` on a dark, netted ground: grey-blue `#5e6670` with scale edges `#2c333b`, pattern reticulated + koi | 0.35 |
| `karashi` | base | ground C het + ground Y het; metal D none | Karashi | matte mustard yellow `#d4ad44`, scale net `#b08a30`, red-brown tail edges `#8a4a2a` | 0.3 |
| `hi_utsuri` | base | ground U any; H hom | Hi Utsuri | black `#141414` with large red-orange patches `#d8481c`; black on the head | 0.3 |
| `showa` | base | ground U any; H het | Showa | black ground `#141414` wrapping below the lateral line and over the head, red `#d4321c` and white `#f6f3ec` patches; black at the pectoral bases (motoguro) | 0.25 |
| `shiro_utsuri` | base | ground U any; H none | Shiro Utsuri | black `#141414` with white `#f4f2ec` patches; black on the head ("panda") | 0.2 |
| `chagoi` | base | ground C any; U none | Chagoi | solid tea-brown `#8b6a44`, scale net `#5a4128`, fins `#7d5e3c`; matte | 0.1 |
| `soragoi` | base | ground G any; U, C none | Soragoi | solid blue-grey `#8f989f`, net `#5e676e`; matte | 0.2 |
| `asagi` | base | ground A hom | Asagi | pale blue-white head `#c9d6df`; blue-grey back `#7d93a8` with dark scale edges `#405568` (reticulated); cheeks, flanks below the lateral line and pectoral bases red-orange `#d65a2a` | 0.2 |
| `kigoi` | base | ground Y any; ground U, C, G, W none; metal D none (Y over A) | Kigoi | matte lemon yellow `#e8c43c` | 0.25 |
| `aka` | base | ground W any; H hom | Aka Muji (Benigoi) | near-solid red-orange `#cc3a1a` over white | 0.2 |
| `kohaku` | base | ground W any; H het | Kohaku | snow-white `#f6f3ec`; red `#d4321c` patches along the back from head to tail, none below the lateral line; white fins | 0.1 |
| `shiro_muji` | base | (fallback) | Shiro Muji | plain white `#f4f1eb` | 0.05 |
| `sanke_sumi` | overlay | bekko Bk any; ground W any; U, C, G, A none; metal D none | (sumi) | small black `#151515` stepping-stone patches on the back, none on the head; black stripes on white fins | 0.15 |
| `tancho` | overlay | tancho t hom; ground W any; H any; U, C, G, A, Y none | Tancho | **all red removed except one round spot `#d0281a` on the top of the head between the eyes** (needs a new `bodyMark: 'tancho'`) | 0.45 |
| `doitsu` | overlay | scale s hom | Doitsu | scales only in a row along each side of the dorsal fin (and sometimes the lateral line); smooth skin elsewhere (needs a scale-type visual) | 0.1 |
| `ginrin` | overlay | ginrin r hom | Ginrin | sparkling reflective scales over the variety: iridescence 0.6 | 0.2 |
| `butterfly` | overlay | fin L any | Butterfly | all fins about 2× long (Saitama): finType `butterfly`, finLength 1.9 | 0.15 |
| `metallic` | overlay | metal D any (for combinations without their own name) | Metallic ("Kin/Gin-") | metallic 0.85 (e.g. Kin Showa, Kin Ki Utsuri) | 0.1 |

| Strain | Requires | Excludes | Tier | Note |
|---|---|---|---|---|
| Kohaku | kohaku | sanke_sumi, tancho, metallic | common | The first established variety (Wikipedia) |
| Taisho Sanke | kohaku, sanke_sumi | tancho | uncommon | |
| Showa Sanshoku | showa | metallic | uncommon | |
| Tancho Kohaku | kohaku, tancho | sanke_sumi | rare | Any other red disqualifies (Kodama) |
| Tancho Sanke | kohaku, tancho, sanke_sumi | – | very_rare | Real show name |
| Shiro Bekko | shiro_muji, sanke_sumi | – | uncommon | Optional |
| Shiro Utsuri | shiro_utsuri | – | uncommon | |
| Hi Utsuri | hi_utsuri | – | rare | |
| Asagi | asagi | doitsu | uncommon | |
| Shusui | asagi, doitsu | – | rare | Doitsu Asagi (Kodama, Wikipedia) |
| Goshiki | goshiki | – | rare | |
| Platinum Ogon | platinum_ogon | – | uncommon | |
| Yamabuki Ogon | yamabuki_ogon | – | uncommon | |
| Chagoi | chagoi | – | common | |
| Soragoi | soragoi | – | uncommon | |
| Karashi | karashi | – | rare | |

- body `#5b5a34`, body2 `#8c7a42`, belly `#d8cfa4`;
- fins `#6a5f3c`, finColor2 (the lower fins' red tint, FishBase) `#a0503a`, accent `#d4321c`;
- eye `#c9a23a`;
- pattern koi; patternScale 1; patternContrast 0.9; iridescence 0.15; metallic 0.1; translucency 0.1;
- finType `koi`; finLength 1; bodyDepth 0.95;
- variation 0.25.

Colour slots for every rule: body = ground, accent = hi red, body2 = sumi black.

Notes for the art and renderer:
- **Koi are judged from above.** The top-down silhouette (a broad, torpedo body, wider in females) and the dorsal pattern matter most. When the game shows koi from the side, the pattern should be readable along the back.
- Showa and Utsuri need the black to cover 40–60%, including the head. The current shader's second patch layer may need a coverage parameter.

### Game data
The values the game uses are in `src/data/species/freshwater/koi.ts`; this research proposed them, and the source check at the end of this chapter corrected some of them.

**Foods the game lacks:** **koi sticks or floating pond pellets**: a large floating dry pellet the autofeeder can drop. Tag it `pellet_large`, or add a `pellet_floating` tag. Koi also eat greens, peas and fruit, which the `vegetable` tag covers.

### Young and sexes (koi)
- **Fry:** about 0.5 cm and translucent olive. Showa fry show black (dark-early melanophores) at hatching; Sanke and Bekko black appears about 2 weeks later (Bar 2013). This is the basis of breeders' early culls (Showa at 3–5 days, Andrian).
- **Juveniles (tosai, 3–6 in in the first year, Wikipedia):** already in their variety's colours. Sumi keeps developing for years, so juveniles show less black.
- **Males:** slimmer and torpedo-shaped. In the breeding season they grow white tubercles on the gill covers and pectoral fins, and their pectorals look larger, pointed and solid-coloured (Tier 3; ADW: larger ventral fin).
- **Females:** rounder and broader seen from above, and swollen with eggs in spring.
- Equal size in the game.

### Behaviour (koi)
- **Movement:** slow, steady cruising in loose groups through all levels, with powerful bursts. Turns are wide for a big body.
- **Feeding:**
  - Forages by sucking up the substrate and spitting it out, leaving pits ("feeding galleries", ADW).
  - Grazes and uproots plants.
  - Rises to the surface for floating food and slurps at it.
- **With people:** learns to beg at the front and takes food from the hand. Chagoi are the friendliest and tamest (POND Trade).
- **Cold:** below about 10 °C it is sluggish and stays deep. The game could slow its activity and appetite with tank temperature.
- **Night:** hovers near the bottom, barely moving.
- **Spawning:** a frantic chase near the surface and through ropes or plants. Fish may jump, and they also jump in poor or low-oxygen water.
- Not territorial.
- **Closest set:** `goldfish` (forage, cruise, shoal). It needs a larger pick radius and a slower tail beat (tailFreq ~0.7). No new set is required.

### Compatibility (koi)
| Other | Verdict | Reason | Sources |
|---|---|---|---|
| Comet goldfish | usually_compatible | Same water and care; koi win at feeding | CA Fish Vet; pond guides |
| Fancy goldfish | high_risk | Outcompeted at feeding; slow; small ones swallowed | Pond guides (Tier 2–3); comet–fancy precedent |
| White cloud, medaka, zebra danio | incompatible | Eaten (fish under 6 cm) | ADW; goldfish precedent |
| Hillstream loach | high_risk | Eaten or starved out; koi dig up its stones and plants | Same |
| Axolotl | high_risk | Gill nipping; waste | Goldfish–axolotl precedent |
| Dwarf, amano and ghost shrimp; crayfish; snails | incompatible / high_risk | Eaten | ADW (benthic crustaceans, molluscs) |
| Oscar, clown loach, black ghost knifefish, fahaka puffer, ornate bichir, silver arowana, motoro | incompatible | Tropical (24–30 °C) vs cool (15–24 °C); motoro also needs soft, acid water | FishBase; species sheets |
| Silver mono, spotted scat | incompatible | Brackish to marine water | – |
| Marine species | incompatible | Salt water | – |

### Smallest tank tier for an adult (koi)
**800 gal (144 × 36 × 36 in)** for the minimum group (2–3 adults). The 1,000-gal tier (144 × 48 × 33 in) also fits and gives more floor. Nothing smaller is long enough for a 70 cm fish.

---

## Motoro stingray
*Potamotrygon motoro* (Müller & Henle, 1841): valid (Eschmeyer, via USFWS); ocellate river stingray · new `stingray` behaviour set · new breeding system (or a livebearer variant)

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Potamotrygon-motoro.html) | 1 | **Max 50 cm disc width (DW)**, 100 cm TL (Axelrod); 24–26 °C; pH 5.0–6.0; dH 10+; Uruguay, Paraná–Paraguay, Orinoco and Amazon basins; **females mature at 24–32 cm DW, males at 20–30 cm**; **3–21 embryos (Achenbach) or 6–7 (Thorson)**; one captive female had 16 pups; "extremely dangerous" (traumatogenic); **IUCN LC (22 Oct 2024)**; **CITES App. III** |
| [ADW](https://animaldiversity.org/accounts/Potamotrygon_motoro/) | 1 | Adult DW ~39 cm (males), 44 cm (females); **captive lifespan up to 15 years**; **lipid histotroph (uterine milk)**; **gestation ~6 months wild, as little as 3 in aquaria**; litters 3–21 (mean 7); **newborns ~97 mm and independent**; one litter a year for 3 years, then a pause; mainly nocturnal, resting partly buried by day; solitary, not territorial; eats fish (loricariids, *Astyanax*, *Pimelodella*), crustaceans, snails and insects. Its IUCN and CITES lines are out of date |
| [USFWS Ecological Risk Screening Summary (2015, rev. 2018, web 2021)](https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Ocellate-River-Stingray.pdf) | 1 | **Overall risk: High**. **Restricted or prohibited: Arizona, California, Georgia, Mississippi, Nevada, Oklahoma, Texas; Florida "conditional"** (permit only); established feral in Singapore and the upper Paraná; motoro × falkneri hybrids found wild; Asian captive breeding produces hybrids; **gestation no more than 3 months; maturity at ~3 years and 30–35 cm DW** (EoL/Fowler 2005); orange-yellow black-ringed ocelli wider than the eye |
| [Loboda & Carvalho 2013, *Neotrop. Ichthyol.* 11(4)](https://www.scielo.br/j/ni/a/RTXCjMdVqjkBcw4yQHcxrRj/abstract/?lang=en) | 1 | Diagnosis: **tricoloured, well-defined, evenly spaced ocelli ≥ eye diameter**; whitish ventral centre, grey-brown margins; the ocelli can be bi-, tri- or tetracoloured within the species; *pauckei* and *labradori* are synonyms of *motoro*; *P. amandae* and *P. pantanensis* are separate look-alikes |
| [Rincon et al. 2024, *Arq. Ciênc. Mar* 56(1)](https://periodicos.ufc.br/arquivosdecienciadomar/article/view/93315) | 1 | One functional (left) ovary and two functional uteri; late embryos swim and make mouth movements in the uterus (abstract only) |
| [OATA: CITES listing (2016)](https://ornamentalfish.org/8902/) | 2 | **App. III from 3 January 2017**: all Brazilian *Potamotrygon*; Colombia lists *P. motoro* and others |
| [Seriously Fish](https://www.seriouslyfish.com/species/potamotrygon-motoro/) | 2 | **~50 cm DW**; **tank 240 × 90 × 75 cm (96 × 36 × 30 in, ~428 gal) for an adult or pair**; river sand, so it can bury; dim light; 24–26 °C, pH 6.0–7.5, 1–12 dGH; "tolerate fairly high nitrate" but no other nitrogen waste; ~50% weekly changes; ~4 turnovers/h; feed at least twice a day; juveniles: bloodworm, *Tubifex*, *Artemia*, krill; adults: mussel, cockle, prawn, squid, whitebait, earthworm; **no mammal meat, no feeder fish**; tankmates: *Heros*, *Geophagus*, large characins, arowana, *Cichla*, datnoids, **bichirs**, large pimelodids; **caution with discus (night losses) and loricariids (latch onto the disc)**; can jump (tight lid); learns its keeper and begs; **the sting sheds about every 6 months and stays venomous**; protein venom (pain, necrosis); hot water first aid; gloves; never net a ray; males have claspers; **matrotrophic; litters of 1–8; captive gestation 9–12 weeks**; pups live on yolk for up to ~1 week; males can injure females in courtship; rest the female after 2–3 litters; trade names "blue", "orange", "black", "marbled"; **hybrids sold, avoid**; **"bat" rays are a genetic defect** |
| [Fishkeeper (Maidenhead Aquatics)](https://www.fishkeeper.co.uk/fish/freshwater/miscellaneous/motoro-stingray) | 2 | Disc 60 cm+; floor area matters more than height; mature tank; 24–26 °C; pH 6.0–7.0; ≤12 dH; **"will not tolerate an elevated nitrate level"**; feed 2–3× a day; one male per tank (singly, a pair, or a male with several females); **avoid loricariids** (they rasp the disc); soft sand or bare floor; stings shed every 2–3 months; **gestation 2–3 months, 1–8 pups**; matures in many years; separate the pair after a couple of litters |
| [Aquatics Unlimited](https://aquaticsunlimited.com/product/misc-stingray-motoro-potamotrygon-motoro) | 2 | **$299.99–499.99 (4–6 in DW juveniles)**; 24 in DW common in aquaria; **250–300 gal for one adult, 450+ for a pair; minimum 36 in wide, 90 in+ long**; 74–82 °F; pH 6.0–7.5; several inches of fine sand; sheds its spine every 3–6 months; males violent with each other; **avoid South American plecos and other *Potamotrygon***; **cannot ship to AZ, AR, CA, FL, GA, HI, MS, NV, OK, TX or UT** |
| [Amazonas magazine 2016](https://amazonasmagazine.com/2016/09/15/two-new-freshwater-stingray-species-described-from-the-tapajos-basin) | 2 | **The "pearl" ray is *P. jabuti* Carvalho 2016** (Tapajós endemic), a separate species |
| [AquariumNexus: ray tankmates](https://www.aquariumnexus.com/?p=2628) | 3 | Arowanas, bichirs, severums, *Geophagus*, silver dollars; plecos cling to rays; anything that fits in a ray's mouth is eaten |

**Modelled as:**
- 50 cm disc (FishBase, Seriously Fish), with a total length of about 1.8× DW including the tail.
- `recommendedMinTankGallons 500`, footprint **96 × 36 in** (Seriously Fish; Aquatics Unlimited's 36 in width).
- `freshwater_tropical` only, with soft, acid water.
- `venomous`, `escapeArtist`, `burrower` (it needs sand to bury in), `heavyWaste`, `needsSinkingFood`, `outgrowsSmallTanks`; nitrate-sensitive like discus.
- Predatory toward small fish, shrimp, snails and worms. Floors: loricariids high_risk, fahaka incompatible, discus conditional.
- A new breeding system: live pups, few and large.
- Lifespan 500 (the cap); maturity 25 game days.

**Conflicts:**
1. **Disc size:** 39–44 cm (ADW), 50 cm (FishBase, Seriously Fish), 24 in (Aquatics Unlimited), 60 cm+ (Fishkeeper). The game uses 50.
2. **Nitrate:** Seriously Fish says rays tolerate fairly high nitrate; Fishkeeper says they don't. The game follows the conservative Fishkeeper (and the brief) and treats rays as nitrate-sensitive. Two Tier 3 guides say under 10–20 ppm.
3. **Gestation:** ~6 months wild (ADW); 3 months at most (EoL); 9–12 weeks captive (Seriously Fish); 2–3 months (Fishkeeper). The game uses ~90 days, so 720 game hours.
4. **Litter:** 3–21 wild (FishBase, ADW) vs 1–8 captive (Seriously Fish, Fishkeeper). The game uses 1–8.
5. **Maturity:** ~3 years (EoL), 1.75–7.5 years (ADW), "many years" (Fishkeeper). The game uses the 25-day maximum.
6. **IUCN:** ADW says DD; FishBase LC (2024), which is newer.
7. **Spine shedding:** every 2–3 months (Fishkeeper), 3–6 (Aquatics Unlimited), ~6 (Seriously Fish). It's a cosmetic in the game.
8. **Loricariids:** Seriously Fish says *Hypostomus* is safe; Fishkeeper and Aquatics Unlimited say avoid. The game uses high_risk for `tag:pleco`.

**Colour forms:**
- P. motoro is very variable (Loboda 2013; Seriously Fish), and trade names exist ("blue", "orange", "black", "marbled"). **No source documents how any of them is inherited**, and they aren't fixed lines. The game should give it the generic intensity locus ("Richly coloured") and per-individual variation in ocellus colour (orange to yellow).
- An optional "Marbled" form could be added later only if the owner wants it, flagged inheritance unknown.
- **Left out:**
  - hybrids (common in Asian captive breeding; Seriously Fish says avoid them; USFWS);
  - "bat" rays (a genetic defect, a welfare problem);
  - "pearl" (*P. jabuti*), "black diamond" (*P. leopoldi* and *P. henlei* lines), *P. falkneri*, *P. amandae* and *P. pantanensis*: separate species, not forms of *motoro*.
  - "P05 / *P.* sp. aff. *motoro*" is unresolved, so it is not merged.

### Breeding: what is different from the `livebearer` system
- **Few, large, independent young.** 1–8 pups of ~10 cm DW, each tracked individually from birth. A newborn ray is far bigger than any other fish's fry. No `fry_cloud`; at most ~1 week on the yolk (56 game hours).
- **Parents are not reported eating pups.** Unlike guppies, set `parentsEatEggs` false. Tankmates are the risk.
- **No stored sperm.** Nothing documents sperm storage for *Potamotrygon*, so don't give the 2 stored broods.
- **Long gestation:** ~90 days, 720 game hours (the molly is 240).
- **Courtship injures females.** Males bite the female's disc (Seriously Fish). It's a stress or injury event during courtship, not the guppy's male-ratio harassment.
- **Rest after 2–3 litters** (Seriously Fish, Fishkeeper): a longer forced rest after the third litter. In the wild, one litter a year for three years, then a pause (ADW).
- **The female must be larger than the male** (Seriously Fish). The breeding check needs a mature male (claspers) and a bigger female.
- **Proposed:** a new `BreedingSystemId` `'ray_viviparous'` (or `'livebearer'` with module flags `storedBroods: 0`, `youngStage: 'juvenile'`, `parentsEatYoung: false`, `courtshipInjury`, `restAfterLitters: 3`).

### Game data
The values the game uses are in `src/data/species/freshwater/motoro_stingray.ts`; this research proposed them, and the source check at the end of this chapter corrected some of them.

**Genetics:** `intensityLocus('Highly variable patterning; trade names (orange, blue, marbled) have no documented inheritance.')` plus `intensityOverlay({ accentColor: '#f08a1c', patternContrast: 1 })`.

- body (dorsal disc) `#6b5a46`, body2 `#5a4a3a`;
- belly (ventral centre) `#ebe7de`, with grey-brown margin `#8a8070`;
- fins (pelvic and tail) `#5f5040`, finColor2 (the black ocellus ring) `#141210`;
- accent (ocellus centre) `#e8962a`;
- eye `#3a3226`;
- pattern spots; patternScale 0.8 (each ocellus at least the size of the eye, evenly spaced); patternContrast 0.9; iridescence 0; metallic 0; translucency 0;
- finType `ray`; finLength 1; bodyDepth 0.3;
- variation 0.25.

**Foods the game lacks:**
- prawn, mussel, cockle and squid ("seafood");
- whitebait or silversides. The existing `meaty_frozen` "Frozen Krill & Silversides" (`pellet_large`) already includes chopped clam and covers most of this.
- live blackworms (for juveniles).
- **Caution:** no feeder goldfish or livebearers, and no beef heart or chicken (SF; AU).

### Young and sexes (motoro)
- **Pups:** small copies of the adults, ~10 cm across (ADW), with the ocelli already present. A small yolk bulge on the belly fades within a week.
- **Males:** a pair of finger-like **claspers** behind the pelvic fins, small in young males and obvious in adults (SF; Fishkeeper). Slightly smaller discs, ~39 cm (ADW).
- **Females:** no claspers; slightly larger (~44 cm). A pregnant female's disc looks thicker.
- **All ages:** grey-brown disc with tricoloured orange-yellow ocelli ringed in black, wider than the eye (Loboda 2013). White belly with grey-brown edges. The tail carries a barbed spine near its base.

### Behaviour (motoro)
- **Movement:** glides over the floor by rippling its disc margin, close to the sand.
- **By day:** rests still and partly buried in sand (EoL; ADW), throwing sand over its back with the disc edges. It also buries when stressed (SF).
- **Night:** mostly nocturnal; forages over the floor at night (ADW).
- **Feeding time:** learns its keeper and rises up the front glass to beg (SF). The "glass climb" is a fun signature behaviour, not a stress signal.
- **Hunting:** covers food or prey with its disc and eats from underneath (mouth on the underside).
- **Jumping:** can jump, so it needs a tight lid (SF).
- **Sting:** sheds its spine every few months, and the dropped spine stays venomous (SF; Fishkeeper; AU). A possible cosmetic: a shed spine on the sand and a keeper warning.
- **Behaviour set:** needs a new `stingray` set: crawl-like gliding with `bottomHugger`, a `BuryProfile` like the chunk-16 sand-dwellers (rest `'sand'`, startle `'sand'` or a burst glide), a glass-climb beg act, and a flat body envelope (hy ~0.06, hz ~0.5).

### Compatibility (motoro)
| Other | Verdict | Reason | Sources |
|---|---|---|---|
| Silver arowana | usually_compatible | The classic pairing: arowana at the top, ray on the floor | SF; AU; AquariumNexus |
| Ornate bichir | usually_compatible | SF lists bichirs. Both feed on the bottom at night, so target-feed | SF; AquariumNexus |
| Oscar | conditional | A large South American cichlid like the *Heros* and *Cichla* SF lists, but boisterous and territorial ones stress rays, and food theft is likely | SF |
| Clown loach | conditional | Small loaches are prey; adults compete for bottom food. Workable with hides (Tier 3) | SF predation note; AquariumNexus |
| Black ghost knifefish | conditional | Both nocturnal in the bottom zone; young knifefish are prey | AquariumNexus; ADW diet |
| Fahaka puffer | incompatible | A notorious biter; rays "do poorly with aggressive or territorial tankmates"; the puffer prefers harder, alkaline water | SF |
| Koi | incompatible | Cool, hard, alkaline vs warm, soft, acid water | – |
| Silver mono, spotted scat | incompatible | Brackish | – |
| Marine species | incompatible | Salt water | – |
| Bristlenose pleco | high_risk | Latches onto the disc | SF; Fishkeeper; AU |
| Discus | conditional | Night losses; temperature mismatch | SF |
| Freshwater angelfish | conditional | A 15 cm cichlid may be caught at night; otherwise peaceful | ADW diet; SF |
| Neon and cardinal tetras, rasbora, guppy, endler, platy, swordtail, betta, gouramis, ram | incompatible / high_risk | Eaten | ADW; AquariumNexus |
| Corydoras, kuhli loach, otocinclus | high_risk | Bottom fish are natural prey | ADW |
| Shrimp, crayfish, snails, African dwarf frog | incompatible | Eaten | ADW |

### Smallest tank tier for an adult (motoro)
**500 gal (120 × 36 × 27 in).** The 240- and 300-gal tiers are only 24 in wide, too narrow for a 50 cm disc to turn; SF and AU both want 36 in. The 500 gal tier also holds a pair (SF ~428 gal; AU 450+).

---

## Cross-species notes (koi, the motoro and the brackish pair)
1. **New behaviour set:**
   - `stingray` (motoro): disc-glide gait close to the floor; rests buried in sand (reuse the chunk-16 `BuryProfile` / `rest: 'sand'`); nocturnal; a glass-climb beg act; a flat body envelope.
   - Koi (`goldfish`), mono (`chromis`) and scat (`rabbitfish` + picker) fit existing sets with tuned parameters.
2. **New breeding system:** `ray_viviparous` (or a `livebearer` variant): 1–8 large independent pups, ~720 h gestation, no stored sperm, no parental fry predation, courtship disc-biting, forced rest after 3 litters, the female larger than the male.
3. **New foods:**
   - **floating koi sticks**, large and dry, for koi (autofeeder-capable);
   - **seafood** (prawn, mussel, cockle, squid) for the motoro. Mostly covered by `meaty_frozen` (`pellet_large`); an explicit tag would stop krill chunks counting as "pellet";
   - **live blackworms** (optional, for juvenile rays).
   - Cautions: no feeder fish and no mammal or bird meat for rays (SF; AU).
4. **New data field (optional):** `salinityByStage` for monos and scats. It is save-safe and data-only.
5. **Genetics engine gaps:**
   - Lethal genotypes (koi N locus; also the platy and swordtail Simpson gene): left out, but a "dies as an embryo" genotype filter would let the N locus in.
   - Juvenile-only colour overlays (ruby scat; also usable for scat bars and mono head bars).
   - Visual parameters for the koi art:
     - `bodyMark: 'tancho'`;
     - a doitsu scale layout;
     - a black-coverage knob for Utsuri and Showa;
     - netting (reticulated scale edges) on Asagi, Chagoi and Soragoi.
6. **Surprises:**
   - The koi species name moved to *C. rubrofuscus*.
   - The Sanke black (Bekko) is a real single dominant gene, and so is metallic (D). Most named varieties are polygenic line-breeding, with up to 95% culled.
   - Leather koi have documented welfare problems.
   - Seriously Fish and Fishkeeper disagree on rays and nitrate.
   - The "pearl" ray is *P. jabuti*.
   - The red scat is a juvenile phase, and no valid subspecies exists.
   - *Selenotoca* is a different genus.
7. **Stocking balance:** the bioload numbers (koi 20, motoro 10, scat 5, mono 3) are extrapolated from the existing scale, not measured. Test a koi trio in the 800 and 1,000 gal tiers and a motoro pair in the 500 gal tier against the water model before shipping, and give the owner any balance caps.
8. **Owner questions:**
   - Include butterfly koi? They are a cross with Indonesian *C. carpio*, ZNA doesn't recognise them, and their dominance is only hobby-reported.
   - Include the koi colour stand-in loci as proposed, or a smaller set?
   - Keep motoro sales open despite the US state bans? Show a legality note in the encyclopedia.

## Sources (koi, the motoro and the brackish pair)
- https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=28864
- https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=45163
- https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=38363 (search summary only)
- https://ncfishes.com/koi-cyprinus-rubrofuscus-lacepede-in-north-carolina/
- https://www.fishbase.se/summary/Cyprinus-rubrofuscus.html
- https://www.fishbase.se/summary/Cyprinus-carpio.html
- https://animaldiversity.org/accounts/Cyprinus_carpio/
- https://pmc.ncbi.nlm.nih.gov/articles/PMC3875451/ (Casas et al. 2013)
- https://www.eurekalert.org/news-releases/858086 (Rohner et al. 2009 release)
- https://www.ebi.ac.uk/europepmc/webservices/rest/PMC3554881/fullTextXML (Bar et al. 2013)
- https://academic.oup.com/naja/article/85/1/48/7808805 (Gomelsky et al. 2023)
- https://ija.scholasticahq.com/article/20349-inheritance-of-the-white-red-kohaku-color-complex-in-ornamental-koi-carp-cyprinus-caprio-l (Dasgupta et al. 2003; bibliography only)
- https://www.sciencedirect.com/science/article/abs/pii/S0044848603006823 (David et al. 2004; 403, not opened)
- https://www.ebi.ac.uk/europepmc/webservices/rest/PMC11422636/fullTextXML (Andrian et al. 2024)
- https://www.pref.saitama.lg.jp/b0915/kenkyuseika/hirenaga.html
- https://en.wikipedia.org/wiki/Koi
- https://en.wikipedia.org/wiki/Butterfly_koi
- https://www.petmd.com/fish/koi-fish-care-sheet
- https://cafishvet.com/koi/can-koi-and-goldfish-be-kept-together/
- https://www.pondtrademag.com/ponds-by-the-numbers-rules-for-a-lawless-industry/
- https://www.pondtrademag.com/language-of-koi-monochrome-muji-is-pure-perfection/
- https://www.pondtrademag.com/language-koi-long-finned-hirenaga-variety/
- https://www.practicalfishkeeping.co.uk/features/how-to-identify-your-koi-carp-a-complete-guide-to-koi-varieties/
- https://www.kodamakoifarm.com/?p=30694
- https://www.kodamakoifarm.com/how-to-breed-koi
- https://www.thatpetplace.com/Domestic-Koi-219501
- https://pondinformer.com/how-much-are-koi-fish/
- https://pondinformer.com/koi-sex-identification/
- https://cuttlebrookkoifarm.co.uk/male-female-can-tell-matter/
- https://www.liveaquaria.com/blogs/ponds-water-gardens/goldfish-and-koi-compatible-pond-fish-for-a-dazzling-display
- https://www.thepondguy.com/learning-center/can-koi-and-goldfish-live-together
- https://fitzfishponds.com/blog/why-do-koi-fish-jump-out-of-the-pond-how-to-prevent-it/
- https://koifishusa.com/blogs/koi-fish/why-do-koi-fish-jump
- https://www.fishbase.se/summary/Potamotrygon-motoro.html
- https://animaldiversity.org/accounts/Potamotrygon_motoro/
- https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Ocellate-River-Stingray.pdf
- https://www.scielo.br/j/ni/a/RTXCjMdVqjkBcw4yQHcxrRj/abstract/?lang=en
- https://periodicos.ufc.br/arquivosdecienciadomar/article/view/93315
- https://ornamentalfish.org/8902/
- https://www.seriouslyfish.com/species/potamotrygon-motoro/
- https://www.fishkeeper.co.uk/fish/freshwater/miscellaneous/motoro-stingray
- https://aquaticsunlimited.com/product/misc-stingray-motoro-potamotrygon-motoro
- https://amazonasmagazine.com/2016/09/15/two-new-freshwater-stingray-species-described-from-the-tapajos-basin
- https://www.aquariumnexus.com/?p=2628
- https://www.fishbase.se/summary/Monodactylus-argenteus.html
- https://fishesofaustralia.net.au/home/species/581
- https://was.org/Meeting/Program/PaperDetail/153808
- https://en.wikipedia.org/wiki/Monodactylus_argenteus
- https://www.liveaquaria.com/product/996/?pcatid=996
- https://aquaticsunlimited.com/product/brackish-mono-argentus-monodactylus-argenteus/
- https://proaquatix.com/?p=9672
- https://gensou.sg/?p=33043
- https://www.fishbase.se/summary/Scatophagus-argus.html
- https://fishbase.se/summary/FamilySummary.php?ID=341
- https://fishesofaustralia.net.au/home/species/2212
- https://fishesofaustralia.net.au/home/species/2213
- https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6940847/fullTextXML (Xiao et al. 2019 genome survey)
- https://en.wikipedia.org/wiki/Scatophagus_argus
- https://tfhmagazine.com/articles/saltwater/scatophagus-argus
- https://www.practicalfishkeeping.co.uk/features/the-mucky-mouths/
- https://www.aquariumglaser.de/en/fish-archives/scatophagus-argus-2
- https://aquaticsunlimited.com/product/brackish-scat-red-ruby-scatophagus-argus-rubifrons/
- https://reeflings.com/species/scatophagus-argus
- https://guidarium.com/fishes/scat-brackish
- https://theaquariumparadise.com/fishes/spotted-scat (search summary only)
- https://en.aqua-fish.net/fish/spotted-scat (search summary only)

## Source check, 2026-10-30 (koi, the motoro and the brackish pair)
Before building, a second agent checked the facts the game uses against the sources (claims marked UNVERIFIED were softened or labelled in the data, never used as fact). Its notes, as written:

- KOI: name C. rubrofuscus OK (CoF; NC Fishes doesn't say "Amur carp"). 70 cm, 250 gal/fish, 800 for 3 OK. Temp 4–32 ideal 15–24 OK; pH 6.5–8.8 OK. Lifespan cap OK. Maturity >3 y (females 4–5 y ADW). Clutch 50k–300k OK. Hatch ~4 d OK. Spawn min 18 °C OK; once a year, 1F:2–3M, ropes, adults eat eggs (Kodama). Price: baseValue 200 is a game value; Kodama "bids up to $16,000", Sakai auction up to $200,000 (Pond Informer). IUCN LC 2020 (wild C. rubrofuscus).
- - Scale genes Casas 2013 OK (scattered/mirror ss/nn, linear S_/Nn, leather ssNn, NN lethal). Hungarian lines: two hypotheses (stronger s or weak N).
- - Metallic D dominant: Gomelsky 2023 (Katasonov 1973; De Kock & Gomelsky 2015). B1/B2 duplicate recessive melanin genes: Gomelsky 2023. R red-eye dominant demelanization (Gomelsky 2023).
- - Bekko black: Bar 2013 "most likely ... single gene with a dominant black allele" (secondary citation) -> say "probably dominant".
- - Utsuri: probably multigenic (Bar). Asagi blue recessive: UNVERIFIED.
- - BUTTERFLY: Saitama: kumpai C. carpio var. flavipinnis imported Feb 1980, crossed from 1982, fins ~2x. DOMINANCE DOCUMENTED: Gomelsky, Schneider & Alsaqufi 2011, N. Am. J. Aquacult. 73(1):49–52 "Inheritance of Long Fins in Ornamental Koi Carp": dominant one gene Lf/lf (1:1 and 3:1). -> locus Lf dominant, cite it; NOT unproven (tell owner).
- - Goshiki 1918 Asagi x Kohaku (Kodama); Karashi Kigoi x Chagoi (POND Trade).
- MOTORO: P. motoro (Müller & Henle 1841). 50 cm DW OK. ADW 39/44 cm are MATURITY disc widths (not adult sizes). 500 gal 96x36 OK (SF 240x90x75 ~428 gal adult/pair; AU 36" wide 90"+ long, 450+ for pair). Temp ideal 24–27 OK. pH 5.5–7.6, GH 1–12, KH 1–8 OK. Litter 1–8 OK (SF, Fishkeeper). Gestation 9–12 wk (SF), 2–3 mo (Fishkeeper): 90 d is top; centre ~75 d = 600 h. Newborn: ADW 96.8 mm "in length" (not disc width) -> say length. Claspers from birth UNVERIFIED (SF: small but visible in juveniles). Maturity ~3 y at 30–35 cm DW (USFWS). Lifespan 15 y captive (ADW). Rest female after 2–3 litters, female bigger, males bite disc edge (SF). Price $299.99–499.99 (AU). IUCN LC 22 Oct 2024 (FishBase). CITES App III Brazil+Colombia populations from 3 Jan 2017 (OATA); no legal export from Brazil (SF). US states: AZ, CA (permit), GA, MS (permit process), NV, OK, TX (permits for zoo/research only); FL conditional (no personal possession). USFWS risk High. Spine shed every few months.
- MONO: M. argenteus. 25 cm OK. 180 gal is above every source (AU 150+, LA 130, Gensou ~106 for five) -> game choice, say so. Temp 24–28 OK. pH 7.0–8.5 OK. Salinity: game synthesis; sources: juveniles can be fresh (LA, FishBase), adults 1.018–1.025 (Gensou; AU "prefer full marine"); max 1.025 not 1.026. Group min 5 ideal 7 (Gensou). Lifespan 8–12 y (tier 3). Lm 13 cm. Breeding (ICAR-CIBA) LHRHa, 31 ppt, 18 h incubation 28 °C. Price $29.99 AU / $65.99 LA. IUCN LC 2016.
- SCAT: S. argus. 30 cm OK. 240 gal OK-ish (TFH 6–8 ft tank). Temp 23–28 OK; pH 7.2–8.6 OK. Salinity synthesis; AU 1.010–1.025; adults full marine (TFH). Group: AU "at least 6" -> min 6 (no source for 4). Maturity 7–9 mo UNVERIFIED. Venom at fin-spine bases (FoA, AU). Ruby = juvenile stage (AU; Glaser rubifrons fanciful; FoA all small young reddish), TFH/Wikipedia say can persist. Females larger (Xiao 2019) vs Glaser males larger: conflict. Price $19.99–59.99 AU. IUCN LC 2009. No captive breeding (TFH).
