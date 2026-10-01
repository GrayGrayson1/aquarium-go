# Freshwater species research — lane species-fw

This document is the research record behind every freshwater `SpeciesDefinition` in Aquarium Go: the three freshwater starters (`src/data/species/axolotl.ts`, `betta.ts`, `pea_puffer.ts`) and the 21 roster species in `src/data/species/freshwater/`. For each species it lists the sources used, the key values encoded, explicit compatibility rules, and confidence and conflicts. It ends with the cross-cutting **Conflicts & uncertainty** and the **Visual notes for render lanes**.

The per-species sections are generated from the species data files, so they always match the game values. The data files are the source of truth; update this document when they change.

## Method

- **Research date:** September 2026. There were four parallel literature passes (invertebrates; cool-water fish; tropical fish; bottom-dwellers and the frog), followed by direct verification of the starter records and of every URL cited.
- **Sources cited are ones that were actually opened.** Two exceptions are flagged where they occur. The axolotl copper paper (Tyrp1) was verified only by its title in a search listing, because the full text sits behind a login redirect. Any hex colours suggested by researchers are approximations chosen by this lane; no source gives hex values.
- **Source tiers:**
  - **Tier 1:** university husbandry programmes (University of Kentucky AGSC), FishBase, Animal Diversity Web, government and extension sources (USGS NAS, USFWS ecological risk screenings, UF/IFAS, NIES Japan, CDC, WDFW), and peer-reviewed papers.
  - **Tier 2:** veterinarian-written care sheets (PetMD), long-established references (Seriously Fish, Practical Fishkeeping, TFH, Amazonas), and major retailers used for practical parameters (Aquarium Co-Op, LiveAquaria, Aquatic Arts, The Shrimp Farm, PetSmart).
  - **Tier 3:** breeder, club and hobbyist sources, used only for morph descriptions and edge cases.
- **Compatibility-critical rules have at least two sources** where possible. These are the `exceptionRules` with a `high_risk` or `incompatible` floor, and the test suite enforces the two-source minimum. Uncertainty is recorded in `confidenceNotes` rather than hidden.
- **Brackish handling:** axolotls are strictly freshwater (AGSC adds salts only to restore hardness). No species here is classified as brackish. Amano and nerite larvae need brackish water, so their reproduction does not complete in freshwater tanks.
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
- **Unlocks:** every non-starter species requires its roster group key. The freshwater starters require `fw_coldwater` (axolotl) or `fw_basic` (betta, pea puffer) *unless chosen as the starter*. See the report to the orchestrator.

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

## Conflicts & uncertainty

1. **Aquarium temperature bands differ widely between sources.** Goldfish recommendations run 10–21, 18–24 or 22–24 °C. Panda cory advice runs from 65–68 °F to 72–79 °F. Hillstream loach ceilings are 24 °C versus 27 °C.
   - The game uses a conservative middle band for `idealMin`–`idealMax`.
   - `min`/`max` are husbandry tolerance bands, not lethal limits. Goldfish, for example, survive 0–41 °C.
2. **Tank sizes are the most disputed husbandry number.**
   - Comet goldfish: retail says 20 gal, care sources say 50–75 gal plus about 40 per extra fish or a pond. The game uses 75 gal and says honestly that comets are pond fish.
   - Fancy goldfish: 20 or 30 gal. Discus: 50–90 gal. Corydoras: 11–30 gal.
3. **Life history data is sparse for several species.**
   - No reliable figure exists for kuhli breeding, hillstream loach incubation, ADF clutch size, or lifespan and maturity for otocinclus, kuhli, hillstream and panda cory. These values are marked as estimates in each record.
   - Warm-lab studies (cherry shrimp, medaka) run faster than hobby reports. The game sits between the two.
4. **Genetics are playable simplifications.**
   - **Documented genes are followed:** axolotl d/a/m/ax/c; medaka b and r; goldfish nacreous T (incomplete dominance); betta double tail (recessive); guppy tuxedo and snakeskin (dominant); mystery snail body, ground colour and banding.
   - **Undocumented traits are modelled as recessive**, so they stay rare and must be line-bred: neon forms, honey gourami colour forms, bristlenose colours, and the ADF blonde.
   - **Real guppy colour is heavily Y-linked.** The game treats it as autosomal.
   - **Neocaridina colour lines are mostly separate recessives in reality.** The game keeps red dominant, so ordinary cherry stock breeds true, while all other lines revert to wild type when mixed.
   - **No fictional variants were added.** Parasite-induced "gold/platinum" cardinals are excluded. There is no albino ADF, because every albino "dwarf frog" is a Xenopus.
5. **Taxonomy is in flux.**
   - *Corydoras panda* is now *Hoplisoma panda*, and *Neritina natalensis* is now *Vittina natalensis*.
   - Trade kuhlis are *Pangio semicincta*.
   - Trade otos are mostly *O. vittatus* or *O. macrospilus*, sold as "affinis".
   - The trade bristlenose is *Ancistrus* sp. '3'.
   - Pet ADFs are a diploid lineage distinct from wild tetraploid *H. boettgeri*.
   - *Tanichthys albonubes* may be a cryptic species complex.
   - Discus have 3–5 recognised species depending on the author.
   - Roster ids and scientific names are kept stable; the notes explain these points.
6. **Compatibility disputes are encoded as probabilities, not certainties.**
   - Pea puffer vs dwarf shrimp: Seriously Fish says some shrimp work, while Co-Op and keepers report hunting. Encoded as `high_risk`, mitigated by cover.
   - Dwarf crayfish predation: The Shrimp Farm and Amazonas say safe; Aquatic Arts, Aquariadise and others say opportunistic. Encoded as `conditional` with a low daily risk.
   - ADF vs shrimp: `conditional`.
   - Betta vs shrimp: `conditional`.
   - White clouds with fancy goldfish: PetMD says yes, Co-Op warns about speed. Encoded as `conditional`.
   - Endler × guppy hybridisation: `conditional`, with zero incident risk. It is a breeding-purity warning, not a welfare risk.
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
8. **Starter unlocks are a design decision.**
   - The roster encodes starters as `starter|<group>`. The records therefore require the group key, and the player's chosen starter must be granted by new-game setup.
   - This is flagged for the orchestrator.
9. **Search limits.** A few primary papers (Kwon/Zhang betta genetics, Tyrp1 copper full text) could not be opened. Claims that depended on them were either dropped or labelled.

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

The **special** lane draws these:

- `axolotl`: starter.
- `shrimp`: Neocaridina and Caridina shrimp.
- `snail_apple`: mystery snail. A tall spired shell, a long siphon ("snorkel"), long tentacles and an operculum.
- `snail_nerite`: low, rounded, smooth shell with an operculum.
- `crayfish`: CPO crayfish.
- `frog`: ADF. Webbed front and hind feet, eyes on the sides of the head, rough skin.

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

**Snails** (`mystery_snail`, `nerite_snail`):
- `bodyColor`/`bodyColor2` are the shell.
- `accentColor` is the shell bands or zigzag stripes: `bands` are spiral bands on the apple snail; `bars` are zigzags following the nerite's growth lines.
- `finColor` is the soft body (foot, head, tentacles); `bellyColor` is the foot sole.
- Mystery snail "blue" and "jade" come from a dark soft body under a pale or yellow shell, so draw the body colour through a slightly translucent shell.

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
