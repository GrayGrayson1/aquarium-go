# Research Sources — Species Ledger

Generated from `src/data/species/**` by `scripts/gen-research-ledger.ts`, so it always matches what ships in the game.
Full per-species research notes (facts used, conflicts, visual notes) live in
[`docs/research/freshwater.md`](research/freshwater.md), [`docs/research/marine.md`](research/marine.md) and [`docs/research/brackish.md`](research/brackish.md).

## Source hierarchy

- **Tier 1:** university husbandry/research programmes (e.g. University of Kentucky Ambystoma Genetic Stock Center), FishBase, Animal Diversity Web, government/university extension (UF IFAS), accredited public aquariums (Monterey Bay Aquarium), IUCN/CITES, peer-reviewed papers.
- **Tier 2:** veterinarian-reviewed care sheets (PetMD), long-established references, major specialty retailers for practical parameters (Aquarium Co-Op, LiveAquaria).
- **Tier 3:** experienced hobbyist sources, used only for edge cases and never to overrule stronger sources.

Compatibility-critical claims (predation, serious aggression, major husbandry mismatch) use two sources where possible. Uncertainty is recorded in each species’ `confidenceNotes` rather than invented as certainty.

## Cross-cutting science

| Topic | Source | Tier | Used for |
|---|---|---|---|
| Nitrification (ammonia → nitrite → nitrate), biofilters | University of Florida IFAS Extension — ammonia & nitrification in aquatic systems | 1 | Water-chemistry model, cycling, free-NH₃ toxicity vs pH/temperature |
| Tank stability & welfare framing | RSPCA fish environment guidance | 2 | Volume-dependent stability, welfare model |
| Practical freshwater compatibility | Aquarium Co-Op care guides | 2 | Tank sizes, tank-mate cautions |
| Practical marine parameters, reef safety | LiveAquaria species pages | 2 | Minimum tank sizes, reef-safety, temperament |

## Species (97)

| Species | Scientific name | Env | Sources (tier) | Confidence notes |
|---|---|---|---|---|
| **Axolotl** (`axolotl`) | *Ambystoma mexicanum* | freshwater | [University of Kentucky AGSC — Guide to Axolotl Husbandry](https://ambystoma.uky.edu/education1/guide-to-axolotl-husbandry) (T1)<br>[Animal Diversity Web — Ambystoma mexicanum](https://animaldiversity.org/accounts/Ambystoma_mexicanum/) (T1)<br>[Woodcock et al. 2017, Scientific Reports — Identification of mutant genes and introgressed tiger salamander DNA in the laboratory axolotl](https://pmc.ncbi.nlm.nih.gov/articles/PMC5428337/) (T1)<br>[Tyrp1 is the Mendelian determinant of the axolotl copper mutant — Scientific Reports (2024; title verified via search listing, full text behind a login redirect)](https://www.nature.com/articles/s41598-024-73283-1) (T1)<br>[AquariumNexus — Axolotl and goldfish: can you keep them together?](https://www.aquariumnexus.com/axolotl-goldfish/) (T3) | Temperature, pH, flow, substrate and breeding timings follow the AGSC husbandry guide (Tier 1). The 10 °C lower bound is conservative: axolotls tolerate colder water but become sluggish and feed poorly. · GH/KH ranges are hobby practice (AGSC only says never extremely soft/distilled water) — treat them as guidance, not hard limits. · Clutch size: ADW gives 100–300; many breeders report larger spawns. The game uses 100–600. · Compressed time: maturity (~1 real year) = 18 game-days; 2–3 week incubation ≈ 128 game-hours; ~10 year lifespan = 400 game-days. · Goldfish-gill-nipping rule rests on consistent Tier 3 keeper reports plus the Tier 1 facts that goldfish are heavy-waste nibblers; confidence moderate-high. |
| **Betta** (`betta`) | *Betta splendens* | freshwater | [FishBase — Betta splendens (Siamese fighting fish)](https://www.fishbase.se/summary/Betta-splendens.html) (T1)<br>[PetMD — Betta Fish Care Sheet (Maria Zayas, DVM)](https://www.petmd.com/fish/betta-fish-care-sheet) (T2)<br>[Aquarium Co-Op — Betta fish care guide](https://www.aquariumcoop.com/blogs/aquarium/betta-fish-care-guide) (T2)<br>[Wang et al. 2021 — Genomic basis of striking fin shapes and colors in the fighting fish (Mol. Biol. Evol.)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8321530/) (T1) | Water parameters: FishBase (24–30 °C, pH 6–8, 5–19 dH) and PetMD (76–81 °F) agree well. The tolerated minimum is 21 °C (it was 23 °C): bettas ride out room temperature (about 22 °C) for weeks, and a 23 °C floor made every heater failure lethal. The ideal range stays 24.5–28 °C. · Betta vs dwarf shrimp varies by individual — represented as conditional with a per-day incident risk rather than a guarantee either way. · Colour/pattern/fin genetics are a deliberately simplified dominance ladder; real inheritance involves several interacting loci. · Compressed time: maturity ~4–5 real months = 14 game-days; bubble-nest eggs hatch in ~1–2 days (14 game-hours); 3–5 year lifespan ≈ 160 game-days. |
| **Pea Puffer** (`pea_puffer`) | *Carinotetraodon travancoricus* | freshwater | [FishBase — Carinotetraodon travancoricus (Malabar pufferfish)](https://www.fishbase.se/summary/Carinotetraodon-travancoricus.html) (T1)<br>[Seriously Fish — Carinotetraodon travancoricus](https://www.seriouslyfish.com/species/carinotetraodon-travancoricus/) (T2)<br>[Aquarium Co-Op — Pea puffer care guide](https://www.aquariumcoop.com/blogs/aquarium/pea-puffer-care-guide) (T2) | Freshwater status is certain (FishBase, Seriously Fish, Aquarium Co-Op). Brackish advice for this species is a myth. · pH: FishBase lists the wild range as 7.5–8.3; aquarium sources accept 6.5–8.4. The game tolerates 6.5–8.3 with an ideal of 7.0–7.8. · Shrimp: Seriously Fish says some shrimp species can work; Aquarium Co-Op and most keepers report dwarf shrimp being hunted. Encoded as high_risk with cover mitigation — never guaranteed safe. · Lifespan is poorly documented (keeper reports of 3–5 years); 150 game-days is a moderate estimate. · The Golden and Bold-spotted "morphs" are natural individual variation, not established domestic lines. |
| **Ocellaris Clownfish** (`ocellaris_clownfish`) | *Amphiprion ocellaris* | marine | [FishBase — Amphiprion ocellaris (Clown anemonefish)](https://www.fishbase.se/summary/Amphiprion-ocellaris.html) (T1)<br>[Animal Diversity Web — Amphiprion ocellaris](https://animaldiversity.org/accounts/Amphiprion_ocellaris/) (T1)<br>[Monterey Bay Aquarium — Clownfish](https://www.montereybayaquarium.org/animals/animals-a-to-z/clownfish) (T1)<br>[LiveAquaria — Proaquatix Captive-Bred Ocellaris Clownfish](https://www.liveaquaria.com/product/3409/?pcatid=3409) (T2)<br>[Klann et al. (2021) Variation on a theme: pigmentation variants and mutants of anemonefish. EvoDevo (PMC8214269)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8214269/) (T1) | High confidence: protandry, male egg care, host anemones, IUCN Least Concern (FishBase lists the 2021 assessment). · Temperature: LiveAquaria lists 72–78 °F; reef practice runs 24–27 °C. Tolerated range widened to 22–28 °C to reflect both. · Designer-morph genetics are simplified: Snowflake and Platinum are separate real mutations merged into one locus (see locus note). · Incubation (64 game-hours) is ~8 real days × 8, inside the 6–11 day range reported by ADW and LiveAquaria. |
| **Lined Seahorse** (`lined_seahorse`) | *Hippocampus erectus* | marine | [FishBase — Hippocampus erectus (Lined seahorse)](https://www.fishbase.se/summary/Hippocampus-erectus.html) (T1)<br>[Animal Diversity Web — Hippocampus erectus](https://animaldiversity.org/accounts/Hippocampus_erectus/) (T1)<br>[Pete Giwojna — A Seahorse Reef, Part One: Reef Compatibility of Hippocampus spp. (TFH Magazine)](https://www.tfhmagazine.com/articles/saltwater/a-seahorse-reef-part-1-reef-compatibility-of-hippocampus-spp) (T2)<br>[Bulk Reef Supply — Ultimate Seahorse Care Guide](https://www.bulkreefsupply.com/content/post/seahorse-aquarium-how-to) (T2)<br>[Chewy Education — How To Care for a Pet Seahorse (reviewed)](https://www.chewy.com/education/fish/saltwater-fish/how-to-care-for-a-pet-seahorse) (T2) | High confidence: male pregnancy, 20–21 day gestation, slow feeding, low-flow needs, IUCN Vulnerable + CITES II. · Tank mates: sources agree on excluding fast/aggressive feeders, tangs, angelfish and anemones. They disagree on SPS corals (Giwojna: weak stings, acceptable; other keepers avoid them) — the game flags only anemones, fire coral and strongly stinging LPS. · Birth size conflict: ADW gives ~5/8 in (1.6 cm) at birth, while breeder reports are smaller; the seed value of 0.7 cm is kept. · Colour genetics are simplified: colour in seahorses is partly environmental and mood-driven. |
| **Cherry Shrimp** (`cherry_shrimp`) | *Neocaridina davidi* | freshwater | [USGS Nonindigenous Aquatic Species — cherry shrimp (Neocaridina davidi) fact sheet](https://nas.er.usgs.gov/queries/factsheet.aspx?SpeciesID=2257) (T1)<br>[USFWS Ecological Risk Screening Summary — Cherry Shrimp (2025)](https://www.fws.gov/sites/default/files/documents/2025-06/ecological-risk-screening-summary-cherry-shrimp-june-2025.pdf) (T1)<br>[Aquarium Co-Op — Care Guide for Cherry Shrimp](https://www.aquariumcoop.com/blogs/aquarium/cherry-shrimp-care) (T2)<br>[The Shrimp Farm — Red Cherry Shrimp caresheet](https://www.theshrimpfarm.com/posts/shrimp-caresheet-red-cherry-shrimp/) (T2)<br>[LiveAquaria — Red Cherry Shrimp](https://www.liveaquaria.com/products/red-cherry-shrimp) (T2)<br>[Canada Shrimps — Neocaridina strains](https://www.canadashrimps.com/neocaridina-strains) (T3) | Colour-line genetics are simplified (see genetics.notes). Keepers report mixed lines reverting to brown/grey wild type within 2–3 generations — the game models this for all non-red lines. · Incubation and maturity differ between warm-lab studies (16–19 days; ~30 days to maturity) and hobby reports (3–4 weeks; 2–3 months). The game uses ~21 days (168 game-hours) and fast maturity (8 game-days). · Breeding temperature conflict: hobby sources say breeding slows below ~21 °C, while a wild study found the most egg-carrying females at 15–20 °C. The game allows breeding from 18 °C. · Compressed time: 1–2 year lifespan ≈ 60 game-days. |
| **Comet Goldfish** (`comet_goldfish`) | *Carassius auratus* | freshwater | [USGS Nonindigenous Aquatic Species — Goldfish (Carassius auratus)](https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=508) (T1)<br>[FishBase — Carassius auratus](https://www.fishbase.se/summary/Carassius-auratus.html) (T1)<br>[Animal Diversity Web — Carassius auratus](https://animaldiversity.org/accounts/Carassius_auratus/) (T1)<br>[USFWS Ecological Risk Screening Summary — Goldfish (2025)](https://www.fws.gov/sites/default/files/documents/2025-01/ecological-risk-screening-summary-goldfish.pdf) (T1)<br>[PetMD — Goldfish Care Sheet (Melissa Witherell, DVM)](https://www.petmd.com/fish/goldfish-care-sheet) (T2)<br>[Aquarium Co-Op — Goldfish Tank Mates](https://www.aquariumcoop.com/blogs/aquarium/goldfish-tank-mates) (T2)<br>[The Goldfish Tank — Can goldfish and shrimp live together?](https://thegoldfishtank.com/goldfish-care/tank-mates/can-goldfish-and-shrimp-live-together/) (T3)<br>[Wikipedia — Comet (goldfish)](https://en.wikipedia.org/wiki/Comet_(goldfish)) (T3) | Tank size: retail listings say 20 gal; care sources and hobby guidance say 50–75 gal for the first single-tail plus ~40 per extra, or a pond. The game follows the conservative 75 gal. · Recommended temperatures vary widely between sources (10–21, 18–24, 22–24 °C). The game uses 15–22 °C ideal; survival range (0–41 °C) is much wider than the tolerance band used here. · Hatch time depends strongly on temperature (≈56 h at 24 °C; up to 9–10 days when cool). 32 game-hours ≈ 4 real days. · Compressed time: ~8–12 months to maturity in culture = 18 game-days; 10–15+ year lifespan ≈ 480 game-days. |
| **Fancy Goldfish** (`fancy_goldfish`) | *Carassius auratus* | freshwater | [FishBase — Carassius auratus](https://www.fishbase.se/summary/Carassius-auratus.html) (T1)<br>[PetMD — Swim Bladder Disease in Fish (Jessie Sanders, DVM)](https://www.petmd.com/fish/conditions/respiratory/swim-bladder-disorders-fish) (T2)<br>[Aquarium Co-Op — Care Guide for Fancy Goldfish](https://www.aquariumcoop.com/blogs/aquarium/care-guide-for-fancy-goldfish) (T2)<br>[Aquarium Co-Op — Goldfish Tank Mates](https://www.aquariumcoop.com/blogs/aquarium/goldfish-tank-mates) (T2)<br>[LiveAquaria — Oranda Goldfish](https://www.liveaquaria.com/product/957/?pcatid=957) (T2)<br>[PetSmart — How to Take Care of Your Fancy Goldfish](https://www.petsmart.com/learning-center/fish-care/how-to-take-care-of-your-fancy-goldfish/A0147.html) (T2)<br>[The Goldfish Tank — Can goldfish and shrimp live together?](https://thegoldfishtank.com/goldfish-care/tank-mates/can-goldfish-and-shrimp-live-together/) (T3)<br>[Wikipedia — List of goldfish varieties](https://en.wikipedia.org/wiki/List_of_goldfish_varieties) (T3) | Tank-size guidance varies (20 gal + 10 per fish vs 30 gal minimum); the game uses 30. · White clouds as tank mates: PetMD recommends them, Aquarium Co-Op warns they are far faster than fancies — encoded as conditional. · Body-type genetics are polygenic in reality; the ladder model is a playable simplification. · Compressed time: maturity ~1–2 years = 20 game-days; hatch 2–9 days ≈ 32 game-hours; 10–15 year lifespan ≈ 400 game-days. |
| **Neon Tetra** (`neon_tetra`) | *Paracheirodon innesi* | freshwater | [Seriously Fish — Paracheirodon innesi](https://www.seriouslyfish.com/species/paracheirodon-innesi/) (T2)<br>[FishBase — Paracheirodon innesi](https://www.fishbase.se/summary/Paracheirodon-innesi.html) (T1)<br>[LiveAquaria — Neon Tetra](https://www.liveaquaria.com/products/neon-tetra) (T2)<br>[PetMD — Tetra Care Sheet (Maria Zayas, DVM)](https://www.petmd.com/fish/tetra-fish-care-sheet) (T2)<br>[Aquarium Co-Op — Neon tetras vs cardinal tetras](https://www.aquariumcoop.com/blogs/aquarium/neon-tetras-and-cardinal-tetras) (T2)<br>[Animal Diversity Web — Paracheirodon axelrodi (genus predators)](https://animaldiversity.org/accounts/Paracheirodon_axelrodi/) (T1)<br>[Wikipedia — Neon tetra](https://en.wikipedia.org/wiki/Neon_tetra) (T3) | Size: 2.5–3 cm SL vs ~4 cm TL; the game uses 3.5 cm total length. · Clutch size lacks a solid Tier 1 figure (FishBase: "relatively few"); 60–130 is a hobby estimate. · Lifespan: 2–3 years is typical for farmed fish, with reports up to 10; 200 game-days ≈ 5 years. · Genetics of diamond head, gold and albino forms are undocumented; modelled as recessives. · Compressed time: ~1–1.5 day hatch ≈ 10 game-hours; maturity (~3–5 months) = 10 game-days. |
| **Panda Corydoras** (`panda_corydoras`) | *Corydoras panda* | freshwater | [Seriously Fish — Corydoras panda](https://www.seriouslyfish.com/species/corydoras-panda/) (T2)<br>[FishBase — Hoplisoma (Corydoras) panda](https://www.fishbase.se/summary/Corydoras-panda.html) (T1)<br>[Aquarium Co-Op — Cory catfish care guide](https://www.aquariumcoop.com/blogs/aquarium/cory-catfish-care-guide) (T2)<br>[LiveAquaria — Panda Cory Cat](https://www.liveaquaria.com/product/934/?pcatid=934) (T2)<br>[The Shrimp Farm — Panda Corydoras care](https://www.theshrimpfarm.com/posts/panda-corydoras-care/) (T2)<br>[Wikipedia — Hoplisoma panda](https://en.wikipedia.org/wiki/Hoplisoma_panda) (T3)<br>[Kordon — Malachite Green label (sensitive species warning)](https://www.kordon.com/kordon/products/chemical-preventatives-and-treatments-2/malachite-green) (T2) | Temperature: sources range from a cool 65–68 °F (The Shrimp Farm) to 72–79 °F (LiveAquaria); the game uses 21–24 °C ideal. · Minimum tank size varies from 11 to 30 gallons; 20 is used. · Maturity and lifespan lack panda-specific Tier 1/2 data (genus typical: ~1 year to maturity, 5–10 year lifespan). · Taxonomy: recently moved to Hoplisoma panda; the roster keeps the familiar Corydoras name. · Compressed time: 3–5 day hatch ≈ 32 game-hours; ~7 year lifespan ≈ 280 game-days. |
| **Mystery Snail** (`mystery_snail`) | *Pomacea diffusa* | freshwater | [USGS Nonindigenous Aquatic Species — spike-topped applesnail (Pomacea diffusa)](https://nas.er.usgs.gov/queries/factsheet.aspx?SpeciesID=2662) (T1)<br>[USFWS Ecological Risk Screening Summary — Spike-topped Applesnail (2017)](https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Spike-topped-Applesnail.pdf) (T1)<br>[UF/IFAS EDIS IN598 — Applesnails of Florida](https://ask.ifas.ufl.edu/publication/IN598) (T1)<br>[Aquarium Co-Op — Care Guide for Mystery Snails](https://www.aquariumcoop.com/blogs/aquarium/mystery-snail) (T2)<br>[Applesnail.net — Pomacea diffusa](https://applesnail.net/content/species/pomacea_diffusa.htm) (T2)<br>[Donya Quick — Color Genetics of Pomacea diffusa](https://www.donyaquick.com/color-genetics-of-pomacea-diffusa/) (T3) | Plant eating is disputed: one study found Pomacea diffusa ate Cabomba, two others found it barely touched plants. Set to mostly_safe. · No Tier 1 figure for age at maturity; hobby estimates run from 3 to 12 months. The game uses a fast 10 game-days. · Sex cannot be determined from outside (sexVisibleAtDays = lifespan). Females reveal themselves by laying. · Lifespan is temperature-dependent (≈2 y warm, ≈3 y cool); 90 game-days ≈ 2¼ years. · Taxonomy: often mis-sold as P. bridgesii; some hobby data may mix the two. |
| **Nerite Snail** (`nerite_snail`) | *Neritina natalensis* | freshwater | [Aquarium Co-Op — Nerite snail care guide](https://www.aquariumcoop.com/blogs/aquarium/nerite-snail) (T2)<br>[Aquatic Arts — Zebra Nerite Snail Care Guide](https://aquaticarts.com/pages/zebra-nerite-snail-care-guide) (T2)<br>[Aquatic Arts — Zebra Nerite Snail (product page)](https://aquaticarts.com/products/zebra-nerite-snails) (T2)<br>[Wikipedia — Vittina natalensis (cites IUCN 2009)](https://en.wikipedia.org/wiki/Vittina_natalensis) (T3)<br>[AquariumBreeder — Nerite snails: care, diet and breeding](https://aquariumbreeder.com/nerite-snails-detailed-guide-care-diet-and-breeding/) (T3) | Current accepted name is Vittina natalensis; the roster keeps the trade name Neritina natalensis. · Egg-capsule contents ("dozens of eggs") are well supported; exact counts come from a related species. · Breeding is marked not_in_game because the larvae need brackish rearing, which the first build does not model. · Sex cannot be determined from outside (sexVisibleAtDays = lifespan). · Compressed time: ~2 year lifespan ≈ 80 game-days. |
| **Fancy Guppy** (`fancy_guppy`) | *Poecilia reticulata* | freshwater | [Seriously Fish — Poecilia reticulata](https://www.seriouslyfish.com/species/poecilia-reticulata/) (T2)<br>[FishBase — Poecilia reticulata](https://www.fishbase.se/summary/Poecilia-reticulata.html) (T1)<br>[Aquarium Co-Op — Guppy care guide](https://www.aquariumcoop.com/blogs/aquarium/guppy-care-guide) (T2)<br>[PetMD — Guppy Care Sheet (Maria Zayas, DVM)](https://www.petmd.com/fish/guppy-fish-care-sheet) (T2)<br>[UF/IFAS EDIS FA054 — Freshwater Ornamental Fish Commonly Cultured in Florida](https://ask.ifas.ufl.edu/publication/FA054) (T1)<br>[Diana Walstad — Breeding Guppies: Genetic Pitfalls and Successes (2022)](https://dianawalstad.com/wp-content/uploads/2022/03/guppy-genetics-2022.pdf) (T3)<br>[Chesapeake Guppy Club — IFGA show classes](https://chesapeakeguppyclub2004.wordpress.com/ifgashowclases/) (T3) | Gestation: 21–30 days (hobby) vs 4–6 weeks (Seriously Fish/FishBase). The game uses 28 days (224 game-hours). · Brood size: 20–40 typical (FishBase) up to ~100 in large females; 5–60 used. · Genetics are deliberately simplified: real guppy colour and tail traits are polygenic and often sex-linked. · Compressed time: maturity ~2–3 months = 8 game-days; 2–3 year lifespan ≈ 100 game-days. |
| **Endler's Livebearer** (`endlers_livebearer`) | *Poecilia wingei* | freshwater | [Seriously Fish — Poecilia wingei](https://www.seriouslyfish.com/species/poecilia-wingei/) (T2)<br>[FishBase — Poecilia wingei](https://www.fishbase.se/summary/Poecilia-wingei.html) (T1)<br>[Aquarium Co-Op — Endler’s livebearer care guide](https://www.aquariumcoop.com/blogs/aquarium/endlers-livebearer-care-guide) (T2)<br>[Schories, Meyer & Schartl 2009 — Zootaxa 2266 (P. obscura; remarks on P. wingei)](https://www.biotaxa.org/Zootaxa/article/view/zootaxa.2266.1.2) (T1)<br>[Wikipedia — Poecilia wingei](https://en.wikipedia.org/wiki/Poecilia_wingei) (T3)<br>[Marty’s Fish — AdrianHD’s contributions to Endler strains](https://martysfish.com/adrianhds-contributions-to-endlers-livebearer-strains-variations/) (T3)<br>[Gensou — Endler colour varieties](https://gensou.sg/endler-livebearer-colour-varieties/) (T3) | Fry predation: Seriously Fish says adults rarely eat young; Aquarium Co-Op says they do. Modelled as moderate (0.35), lower than guppies. · Hardness: Seriously Fish GH 15–35 vs Co-Op "almost any GH"; the game tolerates GH 8–30. · Lifespan has no Tier 1/2 figure (hobby: 2–5 years); 100 game-days ≈ 2½ years. · Line colours are described from breeder sources (Tier 3); hex values are approximations. · Compressed time: ~23.5 day gestation ≈ 188 game-hours; very fast maturity = 6 game-days. |
| **Amano Shrimp** (`amano_shrimp`) | *Caridina multidentata* | freshwater | [Aquarium Co-Op — Care Guide for Amano Shrimp](https://www.aquariumcoop.com/blogs/aquarium/amano-shrimp) (T2)<br>[Larval performance of three amphidromous Caridina species — Crustacean Research 50 (2021)](https://www.jstage.jst.go.jp/article/crustacea/50/0/50_41/_article) (T1)<br>[Habitat selection and copper toxicity in Caridina multidentata — Journal of Crustacean Biology 45(2) (2025)](https://academic.oup.com/jcb/article/45/2/ruaf020/8127312) (T1)<br>[The Shrimp Farm — Amano Shrimp care sheet](https://www.theshrimpfarm.com/posts/amano-shrimp-care-sheet/) (T2)<br>[Wikipedia — Caridina multidentata](https://en.wikipedia.org/wiki/Caridina_multidentata) (T3) | Size: 2.5–3.5 cm (Wikipedia) vs 4–5 cm (retailers); the game uses 4.5 cm (females larger). · Lifespan: 2–3 vs 3–5 years across retailer pages; 110 game-days ≈ 2¾ years. · Egg counts (hundreds to ~2,000) come from secondary summaries of the primary literature. · Plant nibbling is reported by keepers for underfed amanos (Tier 3); set to mostly_safe. · Trade stock is a mix of farm-raised and wild-collected animals; exact proportions are unclear. · Compressed time: 4–5 week incubation ≈ 240 game-hours; ~40 day larval phase ≈ 320 game-hours. |
| **Otocinclus** (`otocinclus`) | *Otocinclus vittatus* | freshwater | [FishBase — Otocinclus vittatus](https://www.fishbase.se/summary/Otocinclus-vittatus.html) (T1)<br>[Seriously Fish — Otocinclus macrospilus](https://www.seriouslyfish.com/species/otocinclus-macrospilus/) (T2)<br>[Aquarium Co-Op — Otocinclus care guide](https://www.aquariumcoop.com/blogs/aquarium/otocinclus-catfish) (T2)<br>[Practical Fishkeeping — Keeping Otocinclus catfish](https://www.practicalfishkeeping.co.uk/features/keeping-otocinclus-catfish-in-the-aquarium/) (T2)<br>[Aquatic Arts — Otocinclus (tank-bred)](https://aquaticarts.com/products/otocinclus-catfish-tank-bred) (T2)<br>[Kordon — Malachite Green label (sensitive species warning)](https://www.kordon.com/kordon/products/chemical-preventatives-and-treatments-2/malachite-green) (T2) | Trade identity is confused (O. vittatus, O. macrospilus and others sold as "O. affinis"); values span the commonly traded species. · Group size: Seriously Fish says 6+, Aquarium Co-Op warns that a starving group is worse than a few well-fed fish — the mature-tank requirement encodes this. · Maturity and lifespan lack Tier 1/2 data (hobby: 3–5 years); 160 game-days ≈ 4 years. · requiresMatureDays = 14 game-days is a gameplay abstraction for "established biofilm". |
| **White Cloud Mountain Minnow** (`white_cloud_minnow`) | *Tanichthys albonubes* | freshwater | [FishBase — Tanichthys albonubes](https://www.fishbase.se/summary/Tanichthys-albonubes.html) (T1)<br>[USGS Nonindigenous Aquatic Species — White Cloud Mountain Minnow](https://nas.er.usgs.gov/queries/FactSheet.aspx?SpeciesID=2784) (T1)<br>[USFWS Ecological Risk Screening Summary — White Cloud Mountain Fish (rev. 2019)](https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-White-Cloud-Mountain-Fish.pdf) (T1)<br>[Yi et al. 2004 — Rediscovering the wild population of White Cloud Mountain minnows (Zoological Research)](https://www.zoores.ac.cn/article/id/2426) (T1)<br>[Seriously Fish — Tanichthys albonubes](https://www.seriouslyfish.com/species/tanichthys-albonubes/) (T2)<br>[Aquarium Co-Op — White Cloud Mountain Minnow care](https://www.aquariumcoop.com/blogs/aquarium/white-cloud-mountain-minnow-care) (T2)<br>[Wikipedia — White Cloud Mountain minnow](https://en.wikipedia.org/wiki/White_Cloud_Mountain_minnow) (T3) | IUCN status: FishBase shows Data Deficient (2010); Seriously Fish says not evaluated. The Red List page could not be checked directly. · Upper temperature: 22 °C (Seriously Fish) vs 25 °C (Aquarium Co-Op); the game tolerates 25 °C with an ideal of 16–22 °C. · Genetic work suggests "T. albonubes" may be a complex of several cryptic species. · Lifespan and maturity lack Tier 1 data (hobby: 3–5+ years, 6–12 months); 160 game-days ≈ 4 years. · Golden and long-fin inheritance modelled as recessive and dominant respectively (not formally documented). |
| **Medaka Ricefish** (`medaka`) | *Oryzias latipes* | freshwater | [FishBase — Oryzias latipes](https://www.fishbase.se/summary/Oryzias-latipes.html) (T1)<br>[UNSW Embryology — Medaka development (Iwamatsu 2004 staging)](https://embryology.med.unsw.edu.au/embryology/index.php?title=Medaka_Development) (T1)<br>[Kondo et al. 2025 — Medaka initiate courtship and spawning late at night (PLOS ONE)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11819472/) (T1)<br>[Niwa — A manual for large-scale breeding of medaka (medaka-book.org)](https://medaka-book.org/contents/chapter02/Appendix2_1.pdf) (T1)<br>[NIES Invasive Species Database (Japan) — Oryzias latipes](https://www.nies.go.jp/biodiversity/invasive/DB/detail/50910e.html) (T1)<br>[Seriously Fish — Oryzias latipes](https://www.seriouslyfish.com/species/oryzias-latipes/) (T2)<br>[Aquarium Co-Op — Medaka rice fish care](https://www.aquariumcoop.com/blogs/aquarium/medaka-rice-fish) (T2)<br>[Tokyo Aqua Garden — Medaka varieties](https://tokyoaquagarden.com/medaka-varieties) (T3) | Temperature: medaka tolerate roughly 0–40 °C; aquarium guidance ranges from 16–22 °C (Seriously Fish) to 25–28 °C in labs. The game uses 18–26 °C ideal. · Incubation strongly depends on temperature (~250 degree-days); 80 game-hours ≈ 10 days at 25 °C. · Development above ~27 °C can sex-reverse genetic females into males (lab finding) — not modelled. · Inheritance of youkihi, miyuki, lamé, hire-naga and dharma is simplified; b and r follow the classic medaka genetics. · Compressed time: maturity ~2–4 months = 8 game-days; 2–4 year lifespan ≈ 120 game-days. |
| **Honey Gourami** (`honey_gourami`) | *Trichogaster chuna* | freshwater | [Seriously Fish — Trichogaster chuna](https://www.seriouslyfish.com/species/trichogaster-chuna/) (T2)<br>[FishBase — Trichogaster chuna](https://www.fishbase.se/summary/Trichogaster-chuna.html) (T1)<br>[Aquarium Co-Op — Honey gourami care guide](https://www.aquariumcoop.com/blogs/aquarium/honey-gourami) (T2)<br>[LiveAquaria — Honey Dwarf Gourami](https://www.liveaquaria.com/product/992/?pcatid=992) (T2)<br>[UF/IFAS EDIS FA054 — Freshwater Ornamental Fish Commonly Cultured in Florida](https://ask.ifas.ufl.edu/publication/FA054) (T1)<br>[Aqulator — Can honey gouramis live with bettas?](https://www.aqulator.com/articles/can-honey-gourami-live-with-bettas/) (T3) | FishBase’s 13.7 cm TL maximum is almost certainly an error; other sources agree on ~5.5 cm. · Upper temperature: LiveAquaria 25.5 °C vs others 28 °C; the game tolerates up to 29 °C with 24–27 °C ideal. · Lifespan is poorly sourced (hobby: 2–5+ years); 170 game-days ≈ 4 years. · Colour-form genetics are undocumented; the ladder is a playable simplification. |
| **Kuhli Loach** (`kuhli_loach`) | *Pangio kuhlii* | freshwater | [Seriously Fish — Pangio semicincta](https://www.seriouslyfish.com/species/pangio-semicincta/) (T2)<br>[FishBase — Pangio kuhlii](https://www.fishbase.se/summary/Pangio-kuhlii.html) (T1)<br>[Practical Fishkeeping — Keeping kuhli and other eel loaches](https://www.practicalfishkeeping.co.uk/features/keeping-kuhli-and-other-eel-loaches-in-the-aquarium/) (T2)<br>[Aquarium Co-Op — Kuhli loach care guide](https://www.aquariumcoop.com/blogs/aquarium/kuhli-loach-care-guide) (T2)<br>[Aquatic Arts — Striped Kuhli Loach](https://aquaticarts.com/products/kuhli-loach) (T2)<br>[Wikipedia — Kuhli loach](https://en.wikipedia.org/wiki/Kuhli_loach) (T3)<br>[Kordon — Malachite Green label (sensitive species warning)](https://www.kordon.com/kordon/products/chemical-preventatives-and-treatments-2/malachite-green) (T2) | Trade identity: nearly all "kuhlis" are P. semicincta; the roster keeps the familiar P. kuhlii name. · Temperature: Seriously Fish 21–26 °C vs FishBase/Wikipedia 24–30 °C; the game uses 24–26 °C ideal. · Minimum group: 5 (Seriously Fish) vs 10 (Practical Fishkeeping); the game uses 5 minimum, 8 ideal. · Breeding data are very thin; incubation time is an estimate. · Compressed time: ~10 year lifespan ≈ 400 game-days. |
| **Reticulated Hillstream Loach** (`hillstream_loach`) | *Sewellia lineolata* | freshwater | [FishBase — Sewellia lineolata](https://www.fishbase.se/summary/Sewellia-lineolata.html) (T1)<br>[Seriously Fish — Sewellia lineolata](https://www.seriouslyfish.com/species/sewellia-lineolata) (T2)<br>[Aquarium Co-Op — Care Guide for Hillstream Loaches](https://www.aquariumcoop.com/blogs/aquarium/hillstream-loaches) (T2)<br>[Aquarium Co-Op — Goldfish Tank Mates](https://www.aquariumcoop.com/blogs/aquarium/goldfish-tank-mates) (T2)<br>[TFH Magazine — Going with the Flow: Hillstream Loach Care (M. Hellweg)](https://www.tfhmagazine.com/articles/freshwater/hillstream-loach-care) (T2)<br>[Loaches Online — Sewellia lineolata: easy to spawn or a lot of luck? (E. Bodrock)](https://www.loaches.com/articles/sewellia-lineolata-the-reticulated-hillstream-loach-easy-to-spawn-or-a-whole-lot-of-luck) (T3) | Native range: central coastal Vietnam (Seriously Fish, Wikipedia) vs Mekong basin (FishBase). · Temperature ceiling: 24 °C (Seriously Fish) vs 27 °C (Aquarium Co-Op); warm, poorly oxygenated water is a common cause of losses. Treated as a cool-water, high-oxygen species. · Group advice conflicts (6+ vs "one or three+"); both are reflected. · Lifespan and incubation have no reliable figure (hobby: 8–10 years); 280 game-days ≈ 7 years, low confidence. |
| **Bristlenose Pleco** (`bristlenose_pleco`) | *Ancistrus cf. cirrhosus* | freshwater | [Seriously Fish — Ancistrus sp. ‘3’ (A. cf. cirrhosus)](https://www.seriouslyfish.com/species/ancistrus-cf-cirrhosus/) (T2)<br>[USGS Nonindigenous Aquatic Species — Bristlenosed catfish (Ancistrus sp.)](https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=2598) (T1)<br>[FishBase — Ancistrus cirrhosus](https://www.fishbase.se/summary/Ancistrus-cirrhosus.html) (T1)<br>[Aquarium Co-Op — Bristlenose pleco care guide](https://www.aquariumcoop.com/blogs/aquarium/bristlenose-pleco-care-guide) (T2)<br>[LiveAquaria — Bushy Nose Pleco](https://www.liveaquaria.com/product/1039/?pcatid=1039) (T2)<br>[German & Bittong 2009 — Digestive enzyme activities of wood-eating catfishes (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC2762538/) (T1)<br>[Gensou — Bristlenose pleco colour morphs guide](https://gensou.sg/bristlenose-pleco-colour-morphs-guide/) (T3)<br>Sabaj, Armbruster & Page (1999) Spawning in Ancistrus (Siluriformes: Loricariidae) with comments on the evolution of snout tentacles as a novel reproductive strategy: larval mimicry. Ichthyological Exploration of Freshwaters 10(3) (T1) | Size: true A. cirrhosus is 9 cm SL (FishBase), but the trade form reaches 12–15 cm; the game uses 12 cm. · Driftwood: hobby sources call it essential; peer-reviewed gut studies show plecos do not digest wood. Treated as beneficial, not required. · Clutch size and incubation beyond Aquarium Co-Op’s 30–80 eggs come from Tier 3 sources. · Colour genetics simplified (recessive colour genes; codominant long-fin). · Compressed time: 4–10 day hatch ≈ 48 game-hours; ~9 year lifespan ≈ 360 game-days. |
| **African Dwarf Frog** (`african_dwarf_frog`) | *Hymenochirus boettgeri* | freshwater | [USGS Nonindigenous Aquatic Species — Hymenochirus boettgeri](https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=66) (T1)<br>[Gvoždík et al. 2023 — tetraploidy in Hymenochirus boettgeri (Zool. J. Linn. Soc. 200:1034)](https://academic.oup.com/zoolinnean/article/200/4/1034/7321480) (T1)<br>[CDC — 2011 Salmonella outbreak linked to African dwarf frogs](https://archive.cdc.gov/www_cdc_gov/salmonella/2011/water-frog-7-20-2011.html) (T1)<br>[Washington Dept. of Fish & Wildlife — African clawed frog](https://wdfw.wa.gov/species-habitats/invasive/xenopus-laevis) (T1)<br>[TFH Magazine — Diagnosis of chytridiomycosis in pet African dwarf frogs](https://www.tfhmagazine.com/articles/freshwater/aquarium-science-diagnosis-of-chytridiomycosis-in-pet-african-dwarf-frogs) (T2)<br>[Aquarium Co-Op — Caring for African dwarf frogs](https://www.aquariumcoop.com/blogs/aquarium/caring-african-dwarf-frogs) (T2)<br>[PetSmart — African dwarf frog care guide](https://www.petsmart.com/learning-center/reptile-care/african-dwarf-frog-care-guide/A0118.html) (T2)<br>[Aquatic Arts — Dwarf African Frog (tank-bred)](https://aquaticarts.com/products/dwarf-african-frog) (T2)<br>[Pipidae.org — African dwarf clawed frog or African clawed frog?](https://www.pipidae.org/en/species-and-systematics/determining-of-species/african-dwarf-clawed-frog-or-african-clawed-frog/) (T3) | Taxonomy: pet “H. boettgeri” is a diploid lineage distinct from wild tetraploid H. boettgeri (Gvoždík 2023); the roster name is kept. · Shrimp: Aquatic Arts says dwarf shrimp will be eaten; Aquarium Co-Op says well-fed frogs usually leave them. Encoded as conditional. · Clutch size is poorly sourced (hobby claims range widely); 50–200 used. · Pellets: Aquarium Co-Op discourages them, PetSmart uses them as a staple — both are included as foods, with frozen foods preferred. · Compressed time: ~2 day hatch ≈ 16 game-hours; ~36 day tadpole stage ≈ 288 game-hours; 5–7 year lifespan ≈ 240 game-days. |
| **Cardinal Tetra** (`cardinal_tetra`) | *Paracheirodon axelrodi* | freshwater | [Seriously Fish — Paracheirodon axelrodi](https://www.seriouslyfish.com/species/paracheirodon-axelrodi/) (T2)<br>[FishBase — Paracheirodon axelrodi](https://www.fishbase.se/summary/Paracheirodon-axelrodi.html) (T1)<br>[Animal Diversity Web — Paracheirodon axelrodi](https://animaldiversity.org/accounts/Paracheirodon_axelrodi/) (T1)<br>[Oliveira et al. 2008 — Tolerance to temperature, pH, ammonia and nitrite in cardinal tetra (Acta Amazonica)](https://www.scielo.br/j/aa/a/FYCZj6tsgyvP9QcXYh7yPnC/?lang=en) (T1)<br>[Aquarium Co-Op — Cardinal tetra care guide](https://www.aquariumcoop.com/blogs/aquarium/cardinal-tetra) (T2)<br>[Aquarium Co-Op — Neon tetras vs cardinal tetras](https://www.aquariumcoop.com/blogs/aquarium/neon-tetras-and-cardinal-tetras) (T2)<br>[LiveAquaria — Cardinal Tetra](https://www.liveaquaria.com/products/cardinal-tetra) (T2)<br>[Wikipedia — Project Piaba](https://en.wikipedia.org/wiki/Project_Piaba) (T3) | Upper temperature: 27 °C (FishBase, LiveAquaria) vs 29 °C (Seriously Fish, Co-Op); lab tolerance data support the higher value. Ideal 24–28 °C. · FishBase’s dH 5–12 looks high next to other sources; the game uses GH 1–10. · Clutch size (~500) is from ADW; captive spawns are usually smaller. · Compressed time: 24–30 h hatch ≈ 10 game-hours; ~5 year captive lifespan ≈ 200 game-days. |
| **Dwarf Orange Crayfish** (`dwarf_crayfish`) | *Cambarellus patzcuarensis* | freshwater | [USFWS Ecological Risk Screening Summary — Mexican Dwarf Crayfish (2017)](https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Mexican-Dwarf-Crayfish.pdf) (T1)<br>[Amazonas Magazine — A Mexican crayfish for nano aquariums (R. O’Leary, 2013)](https://www.amazonasmagazine.com/2013/03/15/a-mexican-crayfish-for-nano-aquariums/) (T2)<br>[The Shrimp Farm — Dwarf Orange Crayfish care sheet](https://www.theshrimpfarm.com/posts/caresheet-dwarf-orange-crayfish/) (T2)<br>[Aquatic Arts — Orange CPO crayfish & care guide](https://aquaticarts.com/pages/orange-dwarf-mexican-dwarf-crayfish-care-guide) (T2)<br>[Aquariadise — CPO crayfish care sheet](https://www.aquariadise.com/caresheet-cambarellus-patzcuarensis/) (T3) | Predation is disputed: The Shrimp Farm and Amazonas call CPOs safe with shrimp and fish; Aquatic Arts, Aquariadise and others report opportunistic catches of moulting shrimp, fry, snails and sleeping bottom fish. Encoded as conditional with low per-day risk. · Size: ~2 cm body (measured trade animals) vs 4–5 cm including claws; the game uses 3.5 cm total. · Upper temperature: 26 °C (USFWS) vs 31 °C (hobby source); the cautious 26 °C is used. · Cannibalism of young: sources conflict; modelled as moderate losses without cover. · Compressed time: 3–4 week incubation ≈ 200 game-hours; ~2 year lifespan ≈ 80 game-days. |
| **Discus** (`discus`) | *Symphysodon aequifasciatus* | freshwater | [Seriously Fish — Symphysodon aequifasciatus](https://www.seriouslyfish.com/species/symphysodon-aequifasciatus/) (T2)<br>[FishBase — Symphysodon aequifasciatus](https://www.fishbase.se/summary/Symphysodon-aequifasciatus.html) (T1)<br>[Aquarium Co-Op — Discus care guide](https://www.aquariumcoop.com/blogs/aquarium/discus-care-guide) (T2)<br>[LiveAquaria — Blue Diamond Discus](https://www.liveaquaria.com/products/blue-diamond-discus) (T2)<br>[Sylvain & Derome 2017 — skin-mucus feeding of discus fry (Scientific Reports)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5507859/) (T1)<br>[Aquarium Glaser (2024) — The scientific species name of discus cichlids: an open question](https://www.aquariumglaser.de/en/fisharchive/the-scientific-species-name-of-discus-cichlids-an-open-question/) (T2)<br>[North American Discus Association — Discus classification](https://discusnada.org/discus-classification/) (T3)<br>[AquariumScience.org — Breeding discus](https://aquariumscience.org/17-11-6-breeding-discus/) (T3)<br>[Wikipedia — Discus (fish)](https://en.wikipedia.org/wiki/Discus_(fish)) (T3) | Taxonomy is unsettled (3–5 species recognised depending on author); domestic discus are hybrids, often labelled Symphysodon sp. · pH: Aquarium Co-Op keeps domestic discus at 6.8–7.6, while wild fish live at pH 4–6. Ideal set to 6.0–7.0 for domestic stock. · Minimum tank: 50–90 gallons across sources; 75 used. · Egg counts come from hobbyist sources; mucus-feeding length 2–4 weeks (3 used). · Strain genetics are simplified from breeder experience (blue diamond recessive, pigeon blood dominant). · Compressed time: ~2.5 day hatch ≈ 20 game-hours; ~10 year lifespan ≈ 400 game-days. |
| **Freshwater Angelfish** (`freshwater_angelfish`) | *Pterophyllum scalare* | freshwater | [FishBase — Pterophyllum scalare (Freshwater angelfish)](https://www.fishbase.se/summary/Pterophyllum-scalare.html) (T1)<br>[Seriously Fish — Pterophyllum scalare](https://www.seriouslyfish.com/species/pterophyllum-scalare/) (T2)<br>[Aquarium Co-Op — Angelfish care guide](https://www.aquariumcoop.com/blogs/aquarium/angelfish-care-guide) (T2)<br>[Practical Fishkeeping — Keeping and breeding angelfish](https://www.practicalfishkeeping.co.uk/features/keeping-and-breeding-angelfish-in-the-aquarium/) (T2)<br>[The Angelfish Society — Phenotype library (2007)](https://www.theangelfishsociety.org/phenotype_library_2007/Dark_Intro.html) (T2)<br>[Norton (1982) Angelfish genetics, part I. FAMA (reprinted at finarama.com)](https://www.finarama.com/genetics/1982prt1.htm) (T2) | The colour genetics rest on Joanne Norton’s crossing experiments in FAMA (hobby magazine, not peer-reviewed), as summarised by TAS; no peer-reviewed paper was found. · Sources disagree on leopard (TAS: chocolate with zebra; Norton: zebra with smokey, and only under short days); the game names no leopard form. · Stripeless is partly dominant in Norton and TAS but called recessive in the Finarama timeline; the game follows Norton. · Aquarium angelfish may carry genes from more than one wild Pterophyllum species. |
| **German Blue Ram** (`german_blue_ram`) | *Mikrogeophagus ramirezi* | freshwater | [FishBase — Mikrogeophagus ramirezi (Ram)](https://www.fishbase.se/summary/Mikrogeophagus-ramirezi.html) (T1)<br>[Seriously Fish — Mikrogeophagus ramirezi](https://www.seriouslyfish.com/species/mikrogeophagus-ramirezi/) (T2)<br>[Aquarium Co-Op — Ram cichlids](https://aquariumcoop.com/blogs/aquarium/ram-cichlids) (T2)<br>[Practical Fishkeeping — How to breed the ram](https://www.practicalfishkeeping.co.uk/features/how-to-breed-the-ram-mikrogeophagus-ramirezi/) (T2)<br>[Tetra — Ram cichlid](https://blog.tetra.net/en-en/ram-cichlid-mikrogeophagus-ramirezi/) (T2) | No published inheritance for the colour strains; electric blue and gold follow forum claims, simplified. · Sources disagree on brood care (both parents in Seriously Fish and PFK, the female in FishBase); the game has both guard. · Advised temperatures run from 22–26 °C (LiveAquaria) to 29–30 °C (Aquarium Co-Op); the game follows FishBase and Seriously Fish (27–30 °C). |
| **Harlequin Rasbora** (`harlequin_rasbora`) | *Trigonostigma heteromorpha* | freshwater | [FishBase — Trigonostigma heteromorpha (Harlequin rasbora)](https://www.fishbase.se/summary/Trigonostigma-heteromorpha.html) (T1)<br>[Tan (2020) Trigonostigma truncata, a new species, and the harlequin’s colours. Raffles Bulletin of Zoology 68:421–433](https://lkcnhm.nus.edu.sg/app/uploads/2020/01/RBZ-2020-0058.pdf) (T1)<br>[Seriously Fish — Trigonostigma heteromorpha](https://www.seriouslyfish.com/species/trigonostigma-heteromorpha/) (T2)<br>[LiveAquaria — Harlequin Rasbora](https://www.liveaquaria.com/products/harlequin-rasbora) (T2) | Some fish sold as harlequins may be Trigonostigma truncata (split off in 2020), whose wedge stops short of the tail. · Lifespan (5–8 years) comes from an uncited Wikipedia figure. · Golden strain inheritance is unpublished; modelled as recessive. |
| **Zebra Danio** (`zebra_danio`) | *Danio rerio* | freshwater | [FishBase — Danio rerio (Zebra danio)](https://www.fishbase.se/summary/Danio-rerio.html) (T1)<br>[Seriously Fish — Danio rerio](https://www.seriouslyfish.com/species/danio-rerio/) (T2)<br>[Aquarium Co-Op — Zebra danio](https://www.aquariumcoop.com/blogs/aquarium/zebra-danio) (T2)<br>[Stewart et al. (2021) Long-fin is a dominant gain of function in kcnh2a. Development 148](https://pmc.ncbi.nlm.nih.gov/articles/PMC8217709) (T1)<br>[Watanabe et al. (2006) The leopard gene is connexin 41.8. EMBO Reports 7:893](https://pmc.ncbi.nlm.nih.gov/articles/PMC1559663) (T1)<br>[Lamason et al. (2005) SLC24A5 and the golden zebrafish. Science 310:1782](https://www.bio.davidson.edu/genomics/309redesigned/papers_current/sequencing/genomes/2005ionchannel_pigmentation.pdf) (T1)<br>[Lessman (2014) Zebrafish clutch size and spawning interval](https://digitalcommons.memphis.edu/facpubs/504) (T1) | Whether the trade’s leopard and golden danios carry the same alleles as the lab lines is likely but not proven. · Albino danios exist but the art cannot yet show the pink eye, so the game leaves the albino out. |
| **Platy** (`platy`) | *Xiphophorus maculatus* | freshwater | [FishBase — Xiphophorus maculatus (Southern platyfish)](https://www.fishbase.se/summary/Xiphophorus-maculatus.html) (T1)<br>[Seriously Fish — Xiphophorus maculatus](https://www.seriouslyfish.com/species/xiphophorus-maculatus/) (T2)<br>[Aquarium Co-Op — Care guide for platy fish](https://www.aquariumcoop.com/blogs/aquarium/platy-care-guide) (T2)<br>[Kallman & Atz (1967) The tail-spot patterns of the platyfish. Zoologica 51:107–135](https://archive.org/stream/biostor-194013/biostor-194013_djvu.txt) (T1)<br>[Gordon (1946) Comet and the E modifier in swordtails and platies. Zoologica 31:77–88](https://archive.org/stream/biostor-194281/biostor-194281_djvu.txt) (T1)<br>[Xiphophorus Genetic Stock Center (Texas State University) — stock list](https://imls.txst.edu/stocks.html) (T1)<br>[Wiedermann — Practical Platy Genetics (hobby guide)](https://ephieslivebearers.weebly.com/uploads/5/7/7/9/57793349/practical_platy_genetics_1.0.pdf) (T3) | Many platy colour genes are sex-linked in wild stocks; the game treats them as ordinary genes, as it does for the guppy. · The genetics of trade red, tuxedo, salt-and-pepper, hi-fin and Mickey Mouse come from a hobby guide; Mickey Mouse is “moon complete” to one breeder and moon plus twin to the guide (the game uses the guide). · Platies and swordtails hybridise freely; the game does not cross species. |
| **Swordtail** (`swordtail`) | *Xiphophorus hellerii* | freshwater | [FishBase — Xiphophorus hellerii (Green swordtail)](https://www.fishbase.se/summary/Xiphophorus-hellerii.html) (T1)<br>[Seriously Fish — Xiphophorus hellerii](https://www.seriouslyfish.com/species/xiphophorus-hellerii/) (T2)<br>[Tetra — Swordtail](https://blog.tetra.net/en-en/swordtail-xiphophorus-helleri/) (T2)<br>[Texas State University (2021) — How the swordtail grows its sword (kcnh8)](https://news.txst.edu/research-and-innovation/2021/swordtail-fish-genetics.html) (T1)<br>[Gordon (1946) Comet and the E modifier in swordtails and platies. Zoologica 31:77–88](https://archive.org/stream/biostor-194281/biostor-194281_djvu.txt) (T1)<br>[Aquarium Glaser — Xiphophorus hellerii Wien Lyra](https://www.aquariumglaser.de/en/fish-archives/xiphophorus_hellerii_wien_lyra_en) (T2) | The colour genes are simplified: in wild stocks sword colour and some red patterns are sex-linked (XGSC). · Maturity is given as about 3 months (Wikipedia) and 8–12 months (FishBase); the game uses about 4 months. · Female-to-male sex change is reported in some conditions (FishBase); the game does not model it. · Swordtails and platies hybridise freely; the game does not cross species. |
| **Dwarf Gourami** (`dwarf_gourami`) | *Trichogaster lalius* | freshwater | [FishBase — Trichogaster lalius (Dwarf gourami)](https://www.fishbase.se/summary/Trichogaster-lalius.html) (T1)<br>[USFWS — Ecological Risk Screening Summary: Dwarf Gourami](https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Dwarf-Gourami.pdf) (T1)<br>[Seriously Fish — Trichogaster lalius](https://www.seriouslyfish.com/species/trichogaster-lalius/) (T2)<br>[Aquarium Co-Op — Dwarf gourami](https://www.aquariumcoop.com/blogs/aquarium/dwarf-gourami) (T2)<br>[Practical Fishkeeping — Let’s hear it for the dwarf gourami](https://www.practicalfishkeeping.co.uk/features/lets-hear-it-for-the-dwarf-gourami/) (T2) | Its scientific name is disputed: Catalog of Fishes and FishBase have treated it as Trichogaster fasciata since 2022, others keep T. lalius; the game uses T. lalius. · Colour-form inheritance is unpublished; the ladder is a playable simplification. · Sources disagree on shrimp: Seriously Fish lists cherry shrimp as tankmates, Aquarium Co-Op says it eats them; the game says caution. · Lifespan: 2–4 years (Aquarium Co-Op) against 4–6 (Wikipedia). |
| **Ghost Shrimp** (`ghost_shrimp`) | *Palaemon paludosus* | freshwater | [Animal Diversity Web (University of Michigan) — Palaemonetes paludosus](https://animaldiversity.org/accounts/Palaemonetes_paludosus/) (T1)<br>[WoRMS — Palaemon paludosus (Gibbes, 1850)](https://www.marinespecies.org/rest/AphiaRecordByAphiaID/932400) (T1)<br>[Dobkin — Abbreviated larval development in caridean shrimps (FAO)](https://www.fao.org/4/AC741T/AC741T24.htm) (T1)<br>[The Shrimp Farm — Ghost shrimp care sheet](https://www.theshrimpfarm.com/posts/shrimp-caresheet-ghost-shrimp-palaemonetes-sp/) (T2)<br>[Aquariadise — Ghost shrimp care](https://aquariadise.com/ghost-shrimp-palaemonetes-care-info/) (T2) | Shops sell several animals as “ghost shrimp”, including the larger, aggressive whisker shrimp (Macrobrachium); the game models Palaemon paludosus. · Sizes conflict (2.5 cm in Wikipedia, up to 5 cm in ADW) and so does the egg-carrying time (12–14 days against about 3 weeks). |
| **Ramshorn Snail** (`ramshorn_snail`) | *Planorbella duryi* | freshwater | [Lucid key, Australian Freshwater Molluscs — Planorbella duryi](https://keys.lucidcentral.org/keys/v3/freshwater_molluscs/key/australian_freshwater_molluscs/Media/Html/entities/planorbella_duryi.htm) (T1)<br>[Freshwater Gastropods of North America (Dillon) — Helisoma scalare duryi](https://fwgna.org/species/planorbidae/h_scalaris_duryi.html) (T1)<br>[USFWS — Ecological Risk Screening Summary: Seminole Ramshorn (2025)](https://www.fws.gov/sites/default/files/documents/2025-01/ecological-risk-screening-summary-seminole-ramshorn.pdf) (T1)<br>[The Shrimp Farm — Ramshorn snail care](https://www.theshrimpfarm.com/posts/ramshorn-snail-care/) (T2)<br>[Aquarium Glaser — Planorbella duryi](https://aquariumglaser.de/en/fisharchive/planorbella-duryi-2) (T2) | Colour-form inheritance is unpublished for this snail; red, blue and leopard are modelled as recessive. · Egg counts per clutch differ (up to 15 in Aquarium Glaser; about 21–26 averaged from Milward-de-Andrade et al. 1978). · Some UK “red ramshorns” are the great ramshorn Planorbarius corneus instead. |
| **Oscar** (`oscar`) | *Astronotus ocellatus* | freshwater | [FishBase — Astronotus ocellatus (Oscar)](https://www.fishbase.se/summary/Astronotus-ocellatus.html) (T1)<br>[Animal Diversity Web — Astronotus ocellatus](https://animaldiversity.org/accounts/Astronotus_ocellatus/) (T1)<br>[USGS Nonindigenous Aquatic Species — Oscar](https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=436) (T1)<br>[Wang et al. 2022 — Skin transcriptome of albino oscars (Comp. Biochem. Physiol. D)](https://pubmed.ncbi.nlm.nih.gov/34864613/) (T1)<br>[Syam et al. 2019 — Genetic distinctness of oscar strains (WAS Asian-Pacific Aquaculture)](https://was.org/Meeting/Program/PaperDetail/153650) (T1)<br>[Seriously Fish — Astronotus ocellatus](https://www.seriouslyfish.com/species/astronotus-ocellatus/) (T2)<br>[Practical Fishkeeping — Night of the Oscars](https://www.practicalfishkeeping.co.uk/features/night-of-the-oscars/) (T2)<br>[Aquarium Co-Op — Oscar fish care guide](https://www.aquariumcoop.com/blogs/aquarium/oscar-fish-care-guide) (T2)<br>[LiveAquaria — Tiger Oscar](https://www.liveaquaria.com/products/tiger-oscar) (T2) | Tiger and red are line-bred strains (polygenic in truth); one codominant locus is the game’s simplification. · Albino, lutino and long-fin inheritance is unpublished: albino and lutino recessive follow hobby reports; long-fin dominant is the game’s choice. · Size: 35 cm (Seriously Fish SL); FishBase gives up to 45.7 cm TL, aquarium adults 25–30 cm. · Tank: sources run from 70–75 gal (LiveAquaria, Aquarium Co-Op) to 6×2 ft (PFK); the game uses PFK’s footprint, the 180-gallon tank. · Range: since 2022 the Orinoco oscar is a separate species (A. mikoljii, Catalog of Fishes); trade oscars may carry genes from more than one Astronotus. · Left out: dyed and injected fish (blueberry, strawberry), the balloon (a deformity) and the unverified blue. |
| **Clown Loach** (`clown_loach`) | *Chromobotia macracanthus* | freshwater | [FishBase — Chromobotia macracanthus (Clown loach)](https://www.fishbase.se/summary/Chromobotia-macracanthus.html) (T1)<br>[Legendre et al. 2012 — Captive breeding of the clown loach (Aquatic Living Resources 25: 95–108)](https://www.cambridge.org/core/product/7C17B5FF5CE8B86FF03F32B10D26ABAC) (T1)<br>[Seriously Fish — Chromobotia macracanthus](https://www.seriouslyfish.com/species/chromobotia-macracanthus/) (T2)<br>[Aquarium Co-Op — Clown loach care guide](https://www.aquariumcoop.com/blogs/aquarium/clown-loach-care-guide) (T2)<br>[LiveAquaria — Clown Loach](https://www.liveaquaria.com/products/clown-loach) (T2) | No domestic colour forms; the Borneo look is a locality difference whose inheritance nobody has studied (modelled as dominant for drawing). · Size: 30 cm (FishBase TL); Seriously Fish gives 40 cm SL for wild fish, aquarium fish 15–33 cm. · Breeding: farms use hormone injections (Legendre et al. 2012), and some breed it naturally by copying wild conditions (Aquarium Co-Op); no home spawning is documented. · Sources disagree on temperament (FishBase “aggressive”, Seriously Fish “not especially aggressive”); the game uses semi-aggressive with little aggression to other fish. |
| **Black Ghost Knifefish** (`black_ghost_knifefish`) | *Apteronotus albifrons* | freshwater | [FishBase — Apteronotus albifrons (Black ghost)](https://www.fishbase.se/summary/Apteronotus-albifrons.html) (T1)<br>[Maulana, Soelistyowati & Furqon 2021 — Spawning of the black ghost (Indonesian Aquaculture Journal 16: 29–34)](https://doi.org/10.15578/iaj.16.1.2021.29-34) (T1)<br>[Kirschbaum & Schugardt 2002 — Reproductive strategies and developmental aspects in mormyrid and gymnotiform fishes (J. Physiol. Paris 96: 557–566)](https://doi.org/10.1016/S0928-4257(03)00011-1) (T1)<br>[Seriously Fish — Apteronotus albifrons](https://www.seriouslyfish.com/species/apteronotus-albifrons/) (T2)<br>[LiveAquaria — Black Ghost Knifefish](https://www.liveaquaria.com/product/857/?pcatid=857) (T2)<br>[Practical Fishkeeping — Predators: the knifefishes](https://www.practicalfishkeeping.co.uk/features/predators-the-knifefishes/) (T2)<br>[Practical Fishkeeping — 39 top tips for fishkeepers](https://www.practicalfishkeeping.co.uk/features/articles/39-top-tips-for-fishkeepers) (T2)<br>[TFH Magazine — Apteronotus albifrons](https://www.tfhmagazine.com/articles/freshwater/apteronotus-albifrons) (T2)<br>[Aquarium Glaser — Apteronotus albifrons WHITE](https://aquariumglaser.de/en/tag/albifrons-en) (T2) | The white form’s inheritance is undocumented; recessive is an assumption (the owner chose to include it as a rare form). · Tank: Seriously Fish 180×60 cm, LiveAquaria 150 gal, PFK about 3 m; the game uses the 240-gallon tank (96 in long), room to turn. · Breeding figures are placeholders (the game does not breed it); the egg counts are from a related species. |
| **Fahaka Puffer** (`fahaka_puffer`) | *Tetraodon lineatus* | freshwater | [FishBase — Tetraodon lineatus (Fahaka pufferfish)](https://www.fishbase.se/summary/Tetraodon-lineatus.html) (T1)<br>[Seriously Fish — Tetraodon lineatus](https://www.seriouslyfish.com/species/tetraodon-lineatus/) (T2)<br>[LiveAquaria — Fahaka Puffer](https://www.liveaquaria.com/products/fahaka-puffer) (T2)<br>[Vet Times — A puffer’s overgrown beak trimmed under anaesthetic](https://www.vettimes.com/news/vets/small-animal-vets/great-barrier-teeth-goldie-grinning-again-after-delicate-dental) (T2)<br>[Pufferfish Enthusiasts Worldwide — Fahaka puffer care sheet](https://www.pufferfishenthusiastsworldwide.com/post/fahaka-puffer-care-sheet) (T3) | Lifespan: FishBase gives a wild maximum of 5 years, hobby keepers report 20 or more; the game uses 10. · Tank: Seriously Fish 120×60 cm, LiveAquaria 120 gal, PEW six feet better; the game uses the 180-gallon tank. · Breeding in aquaria is reported but undated and rare; the game does not breed it. |
| **Ornate Bichir** (`ornate_bichir`) | *Polypterus ornatipinnis* | freshwater | [FishBase — Polypterus ornatipinnis (Ornate bichir)](https://www.fishbase.se/summary/Polypterus-ornatipinnis.html) (T1)<br>[McGill University — Standen et al. 2014 (Nature): fish that walk on their fins](https://mcgill.ca/newsroom/node/21059) (T1)<br>[Seriously Fish — Polypterus ornatipinnis](https://www.seriouslyfish.com/species/polypterus-ornatipinnis/) (T2)<br>[LiveAquaria — Ornate Bichir](https://www.liveaquaria.com/products/ornate-bichir) (T2)<br>[Practical Fishkeeping — How long will my fish live?](https://www.practicalfishkeeping.co.uk/fishkeeping-news/how-long-will-my-fish-live/) (T2) | Clutch size and age at maturity come from hobby breeders (Tier 3); the hatch time is Seriously Fish’s and the behaviour FishBase’s. · Sources differ on its own kind (Seriously Fish lists other bichirs as tankmates, LiveAquaria calls it aggressive to them); the game keeps one per tank by default. · In the wild a soft-water rainy season triggers spawning; the game has no such cue, so breeding is simply hard. |
| **Silver Arowana** (`silver_arowana`) | *Osteoglossum bicirrhosum* | freshwater | [FishBase — Osteoglossum bicirrhosum (Silver arowana)](https://www.fishbase.se/summary/Osteoglossum-bicirrhosum.html) (T1)<br>[USFWS — Ecological Risk Screening Summary: Silver arowana (2020)](https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Arawana_0.pdf) (T1)<br>[Verba et al. 2014 — Mouthbrooding in the silver arowana (Neotropical Ichthyology 12: 145–151)](https://scielo.br/j/ni/a/vjSLNXfJGmLNrC7B9ZR9pkb/?lang=en) (T1)<br>[Smithsonian’s National Zoo — Silver arowana](https://nationalzoo.si.edu/animals/silver-arowana) (T1)<br>[Seriously Fish — Osteoglossum bicirrhosum](https://www.seriouslyfish.com/species/osteoglossum-bicirrhosum/) (T2)<br>[LiveAquaria — Silver Arowana](https://www.liveaquaria.com/products/silver-arowana) (T2)<br>[Practical Fishkeeping — Aquarama’s most expensive fish](https://www.practicalfishkeeping.co.uk/fishkeeping-news/aquaramas-most-expensive-fish/) (T2) | The platinum’s inheritance is unknown and PFK doesn’t say which Osteoglossum it was; recessive is an assumption (the owner chose to include it as a rare form). · Tank: Seriously Fish wants at least 2 m of length, LiveAquaria 250 gal; the game uses the 500-gallon tank, 10 ft long and 3 ft deep. · Young: the National Zoo and Seriously Fish describe a juvenile with a dark stripe and coloured glints; Wikipedia says its colour is the same all its life. · US rules are cited as of 2019 (USFWS 2020); check current state law. |
| **Koi** (`koi`) | *Cyprinus rubrofuscus* | freshwater | [Catalog of Fishes — Cyprinus rubrofuscus](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=28864) (T1)<br>[FishBase — Cyprinus rubrofuscus](https://www.fishbase.se/summary/Cyprinus-rubrofuscus.html) (T1)<br>[FishBase — Cyprinus carpio (Common carp)](https://www.fishbase.se/summary/Cyprinus-carpio.html) (T1)<br>[Animal Diversity Web — Cyprinus carpio](https://animaldiversity.org/accounts/Cyprinus_carpio/) (T1)<br>[Casas et al. 2013 — Scale genes of the common carp (PLoS ONE 8: e83053)](https://pmc.ncbi.nlm.nih.gov/articles/PMC3875451/) (T1)<br>[Bar et al. 2013 — Black pigment in koi (Frontiers in Genetics 4: 6)](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC3554881/fullTextXML) (T1)<br>[Gomelsky, Novelo & Warner 2023 — Inheritance in ornamental koi (North American Journal of Aquaculture 85: 48)](https://academic.oup.com/naja/article/85/1/48/7808805) (T1)<br>Gomelsky, Schneider & Alsaqufi 2011 — Inheritance of long fins in ornamental koi carp (North American Journal of Aquaculture 73: 49–52) (T1)<br>[Saitama Prefecture Fisheries Research Institute — Hirenaga nishikigoi](https://www.pref.saitama.lg.jp/b0915/kenkyuseika/hirenaga.html) (T1)<br>[Andrian et al. 2024 — Koi variety production (Veterinary World 17: 1846)](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC11422636/fullTextXML) (T1)<br>[PetMD — Koi fish care sheet](https://www.petmd.com/fish/koi-fish-care-sheet) (T2)<br>[California Fish Vet — Can koi and goldfish be kept together?](https://cafishvet.com/koi/can-koi-and-goldfish-be-kept-together/) (T2)<br>[Kodama Koi Farm — Koi varieties](https://www.kodamakoifarm.com/?p=30694) (T2)<br>[Kodama Koi Farm — How to breed koi](https://www.kodamakoifarm.com/how-to-breed-koi) (T2)<br>[POND Trade — Monochrome muji](https://www.pondtrademag.com/language-of-koi-monochrome-muji-is-pure-perfection/) (T2) | Real genes: the scale gene S, metallic D and butterfly fins (Lf). The Bekko black is probably a dominant gene (cited by Bar et al. 2013). · Stand-ins (line-bred in truth, inheritance undocumented): the red pattern (many genes), the Utsuri black, the ground colours, Tancho and Ginrin. Most named varieties don’t breed true; breeders cull most of a spawn. · Left out: leather and linear scales (the N gene, lethal when doubled), ghost koi (a cross with wild carp) and Kumonryu (changes colour with the seasons). · Scientific name: Catalog of Fishes treats koi as C. rubrofuscus; FishBase still files koi under C. carpio. · Tank: three adults in 800 gallons follows vets’ 250 gallons per koi; show keepers and pond guides want far more. |
| **Motoro Stingray** (`motoro_stingray`) | *Potamotrygon motoro* | freshwater | [FishBase — Potamotrygon motoro (Ocellate river stingray)](https://www.fishbase.se/summary/Potamotrygon-motoro.html) (T1)<br>[Animal Diversity Web — Potamotrygon motoro](https://animaldiversity.org/accounts/Potamotrygon_motoro/) (T1)<br>[USFWS — Ecological Risk Screening Summary: Ocellate river stingray](https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Ocellate-River-Stingray.pdf) (T1)<br>[Loboda & Carvalho 2013 — Revision of Potamotrygon motoro (Neotropical Ichthyology 11)](https://www.scielo.br/j/ni/a/RTXCjMdVqjkBcw4yQHcxrRj/abstract/?lang=en) (T1)<br>[OATA — CITES listing of Potamotrygon (2016)](https://ornamentalfish.org/8902/) (T2)<br>[Seriously Fish — Potamotrygon motoro](https://www.seriouslyfish.com/species/potamotrygon-motoro/) (T2)<br>[Fishkeeper (Maidenhead Aquatics) — Motoro stingray](https://www.fishkeeper.co.uk/fish/freshwater/miscellaneous/motoro-stingray) (T2)<br>[Aquatics Unlimited — Motoro stingray](https://aquaticsunlimited.com/product/misc-stingray-motoro-potamotrygon-motoro) (T2) | Gestation: 9–12 weeks (Seriously Fish), 2–3 months (Fishkeeper); the game uses about 75 days. Wild females carry longer. · ADW’s 39 and 44 cm are the disc widths at which males and females mature, not their adult size. · Its US legal status changes; the states named follow USFWS (rules as of 2013–2020). |
| **Skunk Cleaner Shrimp** (`cleaner_shrimp`) | *Lysmata amboinensis* | marine | [LiveAquaria — Scarlet Skunk Cleaner Shrimp](https://www.liveaquaria.com/product/696/?pcatid=696) (T2)<br>[Caves, Chen & Johnsen (2019) The cleaner shrimp Lysmata amboinensis adjusts its behaviour towards predatory versus non-predatory clients. Biology Letters](https://pmc.ncbi.nlm.nih.gov/articles/PMC6769148/) (T1)<br>[Vaughan, Grutter & Hutson (2018) Cleaner shrimp are a sustainable option to treat parasitic disease in farmed fish. Scientific Reports](https://www.nature.com/articles/s41598-018-32293-6) (T1)<br>[Wikipedia — Lysmata amboinensis (summarising primary literature)](https://en.wikipedia.org/wiki/Lysmata_amboinensis) (T3)<br>[SeaLifeBase — Lysmata amboinensis](https://www.sealifebase.se/summary/Lysmata-amboinensis.html) (T1) | High confidence: cleaning behaviour, pair living, hermaphroditism, wild-caught trade, copper sensitivity. · Egg-carrying time (~2 weeks) comes from hobby breeding reports rather than a primary paper; moderate confidence. · SeaLifeBase’s generic decapod text says "mostly gonochoric"; the species-specific literature (Caves et al. 2019) confirms simultaneous hermaphroditism, which is used here. · Lifespan in aquaria (~2–3 years) is a care-sheet estimate. |
| **Blue-leg Hermit Crab** (`hermit_crab`) | *Clibanarius tricolor* | marine | [LiveAquaria — Dwarf Blue Leg Hermit Crab](https://www.liveaquaria.com/product/623/?pcatid=623) (T2)<br>[Tropical Fish Hobbyist — Clibanarius tricolor](https://www.tfhmagazine.com/articles/saltwater/clibanarius-tricolor) (T2)<br>[Baeza & Behringer (2017) Small-scale spatial variation in reproductive parameters of the blue-legged hermit crab Clibanarius tricolor. PeerJ (PMC5314957)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5314957/) (T1)<br>[SeaLifeBase — Clibanarius tricolor](https://www.sealifebase.se/summary/Clibanarius-tricolor.html) (T1) | Snail-killing is documented by LiveAquaria and TFH (two sources) but framed differently: TFH thinks crabs mostly want the shell, LiveAquaria says they may also eat the snail. Modelled as a conditional risk that spare shells reduce. · Lifespan: TFH says 1–2 years in aquaria; hobbyists report longer. 100 game-days (~2.5 years) is a middle value. · Breeding is excluded from the game (not_in_game): larval development is undescribed and no aquarium culture exists. |
| **Trochus Snail** (`trochus_snail`) | *Trochus sp.* | marine | [LiveAquaria — Banded Trochus Snail](https://www.liveaquaria.com/product/564/?pcatid=564) (T2)<br>[Bulk Reef Supply — How To Care For Trochus Snails](https://www.bulkreefsupply.com/content/post/how-to-care-for-trochus-snails) (T2)<br>[SeaLifeBase — Trochus histrio (Actor top)](https://www.sealifebase.se/summary/Trochus-histrio.html) (T1)<br>[AlgaeBarn — Using the Trochus Snail](https://www.algaebarn.com/blog/clean-up-crew/utilizing-the-trochus-snail-trochus-spp/) (T3) | Taxonomy: "Trochus sp." in the trade covers several species (often labelled T. histrio). Values are for the typical small banded trochus. · Larval duration: AlgaeBarn says juveniles settle within the week; LiveAquaria says larvae "mature over several months" (probably meaning growth to visible size). The game uses a short larval phase and slow growth. · Clutch size is a broad placeholder for a broadcast spawner (not measured for aquarium Trochus). |
| **Royal Gramma** (`royal_gramma`) | *Gramma loreto* | marine | [FishBase — Gramma loreto (Royal gramma)](https://www.fishbase.se/summary/Gramma-loreto.html) (T1)<br>[LiveAquaria — Royal Gramma Basslet](https://www.liveaquaria.com/product/53/?pcatid=53) (T2)<br>[CORAL Magazine — Quality Marine Offers Captive-Bred Royal Grammas (2016)](https://www.coralmagazine.com/2016/08/23/quality-marine-offers-captive-bred-royal-grammas/) (T2)<br>[The Biota Group — Royal Gramma Basslet (captive-bred)](https://shop.thebiotagroup.com/products/royal-gramm) (T2) | High confidence: size, cave dwelling, upside-down orientation, male nest care, conspecific aggression. · Clutch size and egg incubation time are drawn from aquaculture/hobby reports (moderate confidence). · Captive-bred availability is real but limited; the bulk of the trade remains wild-caught. · Sex system: treated as gonochoristic (males larger with longer fins); literature on possible sex change in Gramma is sparse. |
| **Firefish** (`firefish`) | *Nemateleotris magnifica* | marine | [FishBase — Nemateleotris magnifica (Fire goby)](https://www.fishbase.se/summary/Nemateleotris-magnifica.html) (T1)<br>[LiveAquaria — Firefish](https://www.liveaquaria.com/product/168/?pcatid=168) (T2)<br>[Captive spawning and embryonic development of purple firefish Nemateleotris decora (Aquaculture 424, 2014)](https://www.sciencedirect.com/science/article/abs/pii/S0044848613006820) (T1) | Breeding numbers come from the congener N. decora (abstract seen via search index; full text paywalled); N. magnifica itself is not reported as commercially bred. · Lifespan (~3–5 years in aquaria) is a care-sheet estimate. · Pairing: FishBase lists the species as monogamous; LiveAquaria confirms mated pairs coexist while other conspecifics fight. |
| **Green Chromis** (`green_chromis`) | *Chromis viridis* | marine | [FishBase — Chromis viridis (Blue green damselfish)](https://www.fishbase.se/summary/Chromis-viridis.html) (T1)<br>[LiveAquaria — Green Reef Chromis](https://www.liveaquaria.com/product/115/?pcatid=115) (T2)<br>[Reef Builders — Rising Tide announces success with captive-bred Green Chromis (2013)](https://reefbuilders.com/2013/01/28/captive-bred-green-chromis/) (T2)<br>[Top Shelf Aquatics — Chromis Aggression Over Time](https://topshelfaquatics.com/blogs/news/chromis-aggression-over-time-explained) (T3) | High confidence: shoaling, nest spawning, 2–3 day incubation, wild-caught trade, IUCN status. · Group attrition in captivity is reported by retailers and hobbyists (Tier 3; Top Shelf estimates ~70% of groups end as one fish within 18 months) — modelled as male–male fighting that tank length and group size mitigate. · Chromis viridis is often confused with C. atripectoralis (black-axil chromis) in the trade; values here apply to both. |
| **Banggai Cardinalfish** (`banggai_cardinalfish`) | *Pterapogon kauderni* | marine | [FishBase — Pterapogon kauderni (Banggai cardinalfish)](https://www.fishbase.se/summary/Pterapogon-kauderni.html) (T1)<br>[NOAA Fisheries — Banggai Cardinalfish](https://www.fisheries.noaa.gov/species/banggai-cardinalfish) (T1)<br>[Vagelli (1999) The reproductive biology and early ontogeny of the mouthbrooding Banggai cardinalfish. Environmental Biology of Fishes](https://link.springer.com/article/10.1023/A:1007514625811) (T1)<br>[Top Shelf Aquatics — Captive-Bred Banggai Cardinalfish](https://topshelfaquatics.com/products/captive-bred-banggai-cardinalfish) (T2) | High confidence: endemism, mouthbrooding and direct development, IUCN Endangered, ESA Threatened. · Brooding time: Vagelli (1999) reports ~19 days of oral incubation; some hobby sources quote up to ~30 days including post-hatch holding. The game uses ~20 real days. · Vagelli (1999) abstract read via search index; the Springer page requires sign-in. · Clutch size range (20–60) brackets the ~40-egg mean. |
| **Yellow Watchman Goby** (`watchman_goby`) | *Cryptocentrus cinctus* | marine | [FishBase — Cryptocentrus cinctus (Yellow prawn-goby)](https://www.fishbase.se/summary/Cryptocentrus-cinctus.html) (T1)<br>[Aquatics Unlimited — Watchman Goby Gray/Yellow, captive bred](https://aquaticsunlimited.com/product/goby-tank-raised-watchman-gray-yellow-cryptocentrus-cinctus/) (T2)<br>[Manera et al. (2025) Boat noise alters individual behaviors but not communication between partners in a fish–shrimp mutualism. Behavioral Ecology (PMC12527286)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12527286/) (T1)<br>[Karplus (1979) The tactile communication between Cryptocentrus steinitzi and Alpheus purpurilenticularis. Z. Tierpsychologie](https://onlinelibrary.wiley.com/doi/10.1111/j.1439-0310.1979.tb00286.x) (T1) | High confidence: size, burrow mutualism with alpheid shrimp, colour phases, IUCN status. · Incubation (~4–5 days) and clutch size are drawn from general goby aquaculture reports (moderate confidence). · Karplus (1979) is cited from its abstract (search index); the mutualism details are confirmed by the open-access Manera et al. (2025). · The pistol shrimp partner is not in the launch roster; the partnership is recorded in special.hostNote. |
| **Peppermint Shrimp** (`peppermint_shrimp`) | *Lysmata wurdemanni* | marine | [LiveAquaria — Peppermint Shrimp](https://www.liveaquaria.com/products/peppermint-shrimp) (T2)<br>[Rhyne, Lin & Deal (2004) Biological control of aquarium pest anemone Aiptasia pallida by peppermint shrimp Lysmata. J. Shellfish Research 23: 227–229](https://www.researchgate.net/publication/289254983_Biological_control_of_aquarium_pest_anemone_Aiptasia_pallida_Verrill_by_peppermint_shrimp_Lysmata_risso) (T1)<br>[AlgaeBarn — Meet Lysmata boggessi: Peppermint Shrimp](https://www.algaebarn.com/blog/invertebrates/captive-bred-inverts/peppermint-shrimp/) (T2) | Taxonomy: the roster name L. wurdemanni is kept, but most trade peppermints are L. boggessi or other members of the L. wurdemanni complex. · Coral picking (LPS, occasionally zoanthids) is reported mainly by hobbyists and retailers (Tier 2–3); modelled as a modest coralRisk of 0.2 rather than a hard rule. · Egg-carrying time and larval duration are approximations from aquaculture/hobby reports. |
| **Yellow Clown Goby** (`clown_goby`) | *Gobiodon okinawae* | marine | [FishBase — Gobiodon okinawae (Okinawa goby)](https://www.fishbase.se/summary/Gobiodon-okinawae.html) (T1)<br>[LiveAquaria — Clown Goby, Yellow](https://www.liveaquaria.com/product/1441/?pcatid=1441) (T2)<br>[The Biota Group — Yellow Clown Goby (captive-bred)](https://shop.thebiotagroup.com/products/yellow-clown-goby) (T2)<br>[Gratzer et al. (2015) Skin toxins in coral-associated Gobiodon species affect predator preference and prey survival. Marine Ecology (PMC4459215)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4459215) (T1) | Social conflict: FishBase and Biota describe small groups; LiveAquaria advises one per small tank. Modelled as tension between unpaired adults, fine as a pair. · The toxin and bi-directional sex change are documented for the genus (G. histrio and others); G. okinawae itself was not tested by Gratzer et al. · Incubation and clutch size come from hobby breeding reports (moderate confidence). · Temperature: FishBase gives 20–25 °C for the wild range; care sheets use 72–78 °F. Ideal band set to 23.5–26.5 °C. |
| **Yellow Tang** (`yellow_tang`) | *Zebrasoma flavescens* | marine | [FishBase — Zebrasoma flavescens (Yellow tang)](https://www.fishbase.se/summary/Zebrasoma-flavescens.html) (T1)<br>[Animal Diversity Web — Zebrasoma flavescens](https://animaldiversity.org/accounts/Zebrasoma_flavescens/) (T1)<br>[Claisse et al. (2009) Habitat- and sex-specific life history patterns of yellow tang in Hawaii. Marine Ecology Progress Series 389: 245–255](https://www.int-res.com/abstracts/meps/v389/p245-255) (T1)<br>[LiveAquaria — Yellow Tang, Hawaii](https://www.liveaquaria.com/product/6746/?pcatid=6746) (T2)<br>[LiveAquaria — Yellow Tangs remain a great choice (species spotlight)](https://www.liveaquaria.com/blogs/species-spotlight/yellow-tangs-remain-a-great-choice-for-your-marine-aquarium) (T2)<br>[Top Shelf Aquatics — Captive-Bred Yellow Tang](https://topshelfaquatics.com/products/captive-bred-yellow-tang) (T2)<br>[Honolulu Civil Beat — Aquarium Fishing Could Return To Hawaiʻi Under Proposed New Rules (Oct 2025)](https://www.civilbeat.org/2025/10/aquarium-fishing-could-return-to-hawai%CA%BBi-under-proposed-new-rules/) (T2) | Tank size: sources range from 100 gal (LiveAquaria) to 100–150 gal preferred (Top Shelf); many keepers insist on 6 ft. The game requires 100 gal and a 72-inch footprint, which means the 125-gal tier or larger. · Hawaiʻi collection status is in flux (draft rules to reopen were advanced in late 2025). The note describes the situation as of this research (Sept 2026) without claiming a final outcome. · Lifespan: 41 years documented in the wild; the game caps at 480 game-days. · Breeding is excluded (not_in_game): pelagic spawning needs hatchery culture. |
| **Kole Bristletooth Tang** (`kole_tang`) | *Ctenochaetus strigosus* | marine | [FishBase — Ctenochaetus strigosus](https://www.fishbase.se/summary/Ctenochaetus-strigosus.html) (T1)<br>[LiveAquaria — Kole Yellow Eye Tang](https://www.liveaquaria.com/product/345/?pcatid=345) (T2)<br>[Honolulu Civil Beat — Aquarium Fishing Could Return To Hawaiʻi Under Proposed New Rules (Oct 2025)](https://www.civilbeat.org/2025/10/aquarium-fishing-could-return-to-hawai%CA%BBi-under-proposed-new-rules/) (T2) | Tank size conflict: LiveAquaria says 70 gal; several guides recommend 75–125 gal. The game uses 90 gal with a 48-inch footprint. · Trade identity: because the true kole is Hawaiian, some "yellow-eye" tangs sold elsewhere are related Ctenochaetus species; values here apply to C. strigosus. · No evidence of commercial captive breeding was found in this research. · Lifespan (~10+ years) is inferred from other surgeonfish; no species-specific ageing study was found. |
| **Coral Beauty Angelfish** (`coral_beauty`) | *Centropyge bispinosa* | marine | [FishBase — Centropyge bispinosa (Twospined angelfish)](https://www.fishbase.se/summary/Centropyge-bispinosa.html) (T1)<br>[LiveAquaria — Coral Beauty Angelfish](https://www.liveaquaria.com/products/coral-beauty-angelfish) (T2)<br>[ORA — Coral Beauty Angelfish (captive-bred)](https://www.orafarm.com/product/coral-beauty-angelfish/) (T2)<br>[Sakai et al. (2003) Sexually dichromatic protogynous angelfish Centropyge ferrugata males can change back to females. Zoological Science 20: 627–633](https://pubmed.ncbi.nlm.nih.gov/12777833/) (T1) | Reef safety: LiveAquaria and ORA agree it may nip corals and clams (two sources) — reefSafe "caution", coralRisk 0.35. · Protogyny is documented for Centropyge (Sakai et al. 2003 on C. ferrugata); applied to C. bispinosa by genus. The Sakai abstract was read via search index. · Captive-bred pricing (~$90) is an estimate from retailer listings; wild fish ~$60. · Breeding is excluded (not_in_game): pelagic larvae require hatchery culture. |
| **Foxface Rabbitfish** (`foxface_rabbitfish`) | *Siganus vulpinus* | marine | [FishBase — Siganus vulpinus (Foxface)](https://www.fishbase.se/summary/Siganus-vulpinus.html) (T1)<br>[LiveAquaria — Foxface Lo](https://www.liveaquaria.com/product/687/?pcatid=687) (T2)<br>[Wikipedia — Foxface rabbitfish (summarising FishBase and Australian Museum)](https://en.wikipedia.org/wiki/Foxface_rabbitfish) (T3) | Reef safety: LiveAquaria says "with caution" (nips LPS/soft corals when hungry); the brief and hobby experience call it mostly reef-safe. Modelled as mostly_safe with coralRisk 0.15. · Venom: FishBase confirms venomous spines; keeper safety flagged via special.venomous. · No commercial captive breeding found. Lifespan (~10+ years) is a care-sheet estimate. |
| **Mandarin Dragonet** (`mandarin_dragonet`) | *Synchiropus splendidus* | marine | [FishBase — Synchiropus splendidus (Mandarinfish)](https://www.fishbase.se/summary/Synchiropus-splendidus.html) (T1)<br>[Animal Diversity Web — Synchiropus splendidus](https://animaldiversity.org/accounts/Synchiropus_splendidus/) (T1)<br>[ORA — Blue Mandarin (captive-bred)](https://www.orafarm.com/product/blue-mandarin/) (T2)<br>[ORA — Red Mandarin (captive-bred)](https://www.orafarm.com/product/red-mandarin/) (T2)<br>[LiveAquaria — Green Mandarin](https://www.liveaquaria.com/product/551/?pcatid=551) (T2)<br>[Wikipedia — Synchiropus splendidus](https://en.wikipedia.org/wiki/Synchiropus_splendidus) (T3)<br>[Top Shelf Aquatics — Mandarin and Dragonet Care Guide: Pods, Feeding and Mature Tank Requirements](https://topshelfaquatics.com/blogs/news/mandarin-and-dragonet-care-guide-pods-feeding-and-mature-tank-requirements) (T3) | High confidence: copepod dependence, slow feeding, mature-tank requirement, male–male aggression, captive-bred fish taking frozen food. · Minimum tank size conflict: LiveAquaria says 30 gal; Top Shelf recommends 50–75 gal with a refugium. The game uses 30 gal plus a mature-tank and pods requirement. · requiresMatureDays = 20 game-days ≈ 6 real months × 40/year, consistent with the lifespan compression. · Red colour inheritance is unpublished; modelled as recessive. |
| **Peacock Mantis Shrimp** (`peacock_mantis_shrimp`) | *Odontodactylus scyllarus* | marine | [Monterey Bay Aquarium — Peacock Mantis Shrimp](https://www.montereybayaquarium.org/animals/animals-a-to-z/peacock-mantis-shrimp) (T1)<br>[National Aquarium — Peacock Mantis Shrimp](https://aqua.org/explore/animals/peacock-mantis-shrimp) (T1)<br>[Patek & Caldwell (2005) Extreme impact and cavitation forces of a biological hammer: strike forces of the peacock mantis shrimp. J. Exp. Biol. 208: 3655](https://journals.biologists.com/jeb/article/208/19/3655/15838/Extreme-impact-and-cavitation-forces-of-a) (T1)<br>[Patek, Korff & Caldwell (2004) Deadly strike mechanism of a mantis shrimp. Nature 428: 819–820](https://scholars.duke.edu/publication/953838) (T1)<br>[LiveAquaria — Clown Mantis Shrimp (Odontodactylus scyllarus)](https://www.liveaquaria.com/products/clown-mantis-shrimp) (T2)<br>[Bulk Reef Supply — How to Set Up a Mantis Shrimp Tank](https://www.bulkreefsupply.com/content/post/md-2020-12-how-to-set-up-a-mantis-shrimp-tank) (T2)<br>[Shrimp and Snail Breeder — Peacock Mantis Shrimp as a Pet](https://aquariumbreeder.com/mantis-shrimp-as-an-aquarium-pet-care-guide/) (T3) | Tank size conflict: BRS says 10 gal; other guides 20+ gal. The game conservatively uses 40 gal for a 15 cm adult with a deep burrow bed. · Glass damage: BRS and hobby guides report cracked/chipped glass but say it is rare — flagged as glassStrikeRisk (a warning, not an event certainty). · Colour vision: older claims of "super colour vision" are outdated; MBA notes their colour discrimination is actually poor despite 12+ photoreceptor types (Thoen et al. 2014). · Breeding values (egg mass size, brooding time) are approximate and the species is excluded from breeding (not_in_game). |
| **Fuzzy Dwarf Lionfish** (`dwarf_lionfish`) | *Dendrochirus brachypterus* | marine | [FishBase — Dendrochirus brachypterus (Dwarf lionfish)](https://www.fishbase.se/summary/Dendrochirus-brachypterus.html) (T1)<br>[LiveAquaria — Fuzzy Dwarf Lionfish (Shortfin Lionfish)](https://www.liveaquaria.com/product/227/?pcatid=227) (T2)<br>[LiveAquaria — The Fuzzy Dwarf Lionfish: A Gorgeous Showstopper (species spotlight)](https://www.liveaquaria.com/blogs/species-spotlight/the-fuzzy-dwarf-lionfish) (T2)<br>[NOAA National Ocean Service — What is a lionfish?](https://oceanservice.noaa.gov/facts/lionfish-facts.html) (T1)<br>[Chou, Liu & Liao (2023) Systematics of lionfishes (Scorpaenidae: Pteroini) using molecular and morphological data. Frontiers in Marine Science 10](https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2023.1109655/full) (T1) | Taxonomy: Chou et al. (2023) moved this species to Neochirus (N. brachypterus). The roster name Dendrochirus brachypterus is kept for stability; the encyclopedia notes the change. · Frozen-food training (krill, silversides, mysis) is standard husbandry advice; the fetched LiveAquaria pages confirm live-food starts and every-other-day feeding. · Maximum prey size (~7 cm, about half its length) is a husbandry heuristic, not a measured value. · Breeding is excluded (not_in_game); egg-mass numbers are approximate. |
| **Miniatus Grouper** (`miniatus_grouper`) | *Cephalopholis miniata* | marine | [FishBase — Cephalopholis miniata (Coral hind)](https://www.fishbase.se/summary/Cephalopholis-miniata.html) (T1)<br>[LiveAquaria — Miniatus Grouper](https://www.liveaquaria.com/products/miniatus-grouper) (T2)<br>[Wikipedia — Cephalopholis miniata (citing IUCN, FishBase, FAO)](https://en.wikipedia.org/wiki/Cephalopholis_miniata) (T3) | Size: FishBase max 50 cm TL; LiveAquaria says ~14 in (36 cm) in aquaria. The game uses 42 cm, matching the brief’s conservative 40–45 cm. · Tank size 180 gal (LiveAquaria) is treated as an absolute minimum; public-aquarium displays are far larger. Researched conservatively per the design brief. · IUCN: FishBase lists the assessment date as November 2017 while Wikipedia cites Rocha 2018 — the same assessment, published 2018. · Lifespan is not documented for the species; set near the cap to reflect a long-lived grouper. |
| **Emperor Angelfish** (`emperor_angelfish`) | *Pomacanthus imperator* | marine | [FishBase — Pomacanthus imperator (Emperor angelfish)](https://www.fishbase.se/summary/Pomacanthus-imperator.html) (T1)<br>[Fishes of Australia — Pomacanthus imperator](https://fishesofaustralia.net.au/Home/species/653) (T1)<br>[Australian Museum — Emperor Angelfish](https://australian.museum/learn/animals/fishes/emperor-angelfish-pomacanthus-imperator/) (T1)<br>[Oregon Coast Aquarium — Emperor angelfish](https://aquarium.org/?p=22368) (T1)<br>[LiveAquaria — Emperor Angelfish](https://www.liveaquaria.com/product/411/?pcatid=411) (T2)<br>[Quality Marine — Emperor Angelfish](https://www.qualitymarine.com/news/emperor-angelfish/) (T2)<br>[Reef Builders (2023) — Captive bred emperor angelfish are now available](https://reefbuilders.com/2023/06/15/captive-bred-emperor-angelfish-are-now-available/) (T2) | Maximum size differs by source and measure (30–40 cm, FishBase’s figure is SL); the game uses 35 cm. · Reef safety: LiveAquaria says reef with caution, Practical Fishkeeping says not reef-safe except in SPS-only tanks; the game marks it caution with a high coral risk. · Older care sheets say it has never been bred; that is out of date since Bali Aquarich’s 2023 captive-bred release. · Sexual dimorphism is slight and the game keeps adults the same colour; the juvenile’s rings are drawn until the fish is grown. |
| **Sailfin Tang** (`sailfin_tang`) | *Zebrasoma velifer* | marine | [FishBase — Zebrasoma velifer (Sailfin tang)](https://www.fishbase.se/summary/Zebrasoma-veliferum.html) (T1)<br>[WoRMS — Zebrasoma velifer (Bloch, 1795)](https://www.marinespecies.org/aphia.php?p=taxdetails&id=712902) (T1)<br>[FAO Species Identification Guide, Western Central Pacific vol. 6 — Acanthuridae (Randall)](https://www.fao.org/4/y0870e/y0870e30.pdf) (T1)<br>[LiveAquaria — Sailfin Tang](https://www.liveaquaria.com/product/379/?pcatid=379) (T2)<br>[Reef Builders (2015) — Speciation, biogeography and hybridisation in Zebrasoma](https://reefbuilders.com/2015/06/29/speciation-biogeography-hybridization-zebrasoma/) (T2) | Name: WoRMS and FishBase use Z. velifer; many care sheets still say veliferum. · The Red Sea / Indian Ocean sailfin is a separate valid species, Z. desjardinii (FishBase, FAO); it is not modelled as a form of this one. · Tank size: 125–180 gallons by source; the game uses 180 with a six-foot footprint (LiveAquaria, Top Shelf). · Spawning differs between FishBase (pairs, daytime) and ADW (groups at dusk); it does not matter in the game. |
| **Chocolate Tang** (`chocolate_tang`) | *Acanthurus pyroferus* | marine | [FishBase — Acanthurus pyroferus (Mimic surgeonfish)](https://www.fishbase.se/summary/Acanthurus-pyroferus.html) (T1)<br>[FAO Species Identification Guide, Western Central Pacific vol. 6 — Acanthuridae (Randall)](https://www.fao.org/4/y0870e/y0870e30.pdf) (T1)<br>[Eagle & Jones (2004) Mimicry in coral reef fishes: ecological and behavioural responses of a mimic to its model. J. Zool. 264:33–43](https://researchonline.jcu.edu.au/6757/) (T1)<br>[LiveAquaria — Lemon Tang (Acanthurus pyroferus)](https://www.liveaquaria.com/product/763/?pcatid=763) (T2)<br>[Top Shelf Aquatics — Chocolate / Yellow Mimic Tang (Fiji)](https://topshelfaquatics.com/products/chocolate-yellow-mimic-tang-fiji) (T2) | Tank size: 125 gallons (Top Shelf, hobby guides) versus 180 (LiveAquaria); the game uses 125 with a six-foot footprint. · Lifespan: no species maximum found (one otolith reading of 7 years at 22.5 cm); related Acanthurus live 30–45 years, so 380 game-days is a cautious middle. · Which mimic phase a juvenile takes depends on the angelfish where it lives, not on genes; the game picks yellow or halfblack per individual and models no locus for it. · Tail-margin colour: yellow (FAO, Fishes of Australia) versus white (Wikipedia); the game uses yellow. |
| **Lyretail Anthias** (`lyretail_anthias`) | *Pseudanthias squamipinnis* | marine | [FishBase — Pseudanthias squamipinnis (Sea goldie)](https://www.fishbase.se/summary/Pseudanthias-squamipinnis.html) (T1)<br>[FishBase — Reproduction of Pseudanthias squamipinnis](https://fishbase.se/Reproduction/6568) (T1)<br>[Fishes of Australia — Pseudanthias squamipinnis](https://fishesofaustralia.net.au/home/species/4402) (T1)<br>[LiveAquaria — Lyretail Anthias](https://www.liveaquaria.com/product/54/?pcatid=54) (T2)<br>[That Pet Place — Lyretail Anthias](https://www.thatpetplace.com/Pseudanthias-squamipinnis-lyretail-anthias-239115) (T2) | Name: the Catalog of Fishes now limits P. squamipinnis to the Red Sea and western Indian Ocean and calls Pacific fish P. cheirospilos; FishBase, WoRMS and the hobby still use one species, as the game does. · Tank size varies by source from 55 to 150 gallons; the game uses 125 with a six-foot footprint (LiveAquaria, Quality Marine). · Lifespan has no Tier 1 figure (hobby guides 5–7 years). · Sex change runs in the game without breeding (special.socialSexChange): a group of two or more adult females with no male makes one, faster than the real 2–4 weeks. |
| **Melanurus Wrasse** (`melanurus_wrasse`) | *Halichoeres melanurus* | marine | [FishBase — Halichoeres melanurus (Tail-spot wrasse)](https://www.fishbase.se/summary/Halichoeres-melanurus.html) (T1)<br>[Fishes of Australia — Halichoeres melanurus](https://fishesofaustralia.net.au/home/species/235) (T1)<br>[University of Florida (World Aquaculture Society abstract) — larviculture of Halichoeres melanurus](https://www.was.org/MeetingAbstracts/ShowAbstract/42634) (T1)<br>[Tropical Fish Hobbyist — Halichoeres melanurus](https://tfhmagazine.com/articles/saltwater/halichoeres-melanurus) (T2)<br>[LiveAquaria — Melanurus Wrasse](https://www.liveaquaria.com/product/2285/) (T2) | Adult size varies by source (11–14 cm); the game uses 12 cm. · Reef safety is a judgement call: safe with corals in every source, but it eats small shrimp and some sessile invertebrates (LiveAquaria, Top Shelf), so the game marks it mostly safe. · Lifespan has no Tier 1 figure (hobby guides 5–7 years). · Juvenile colours rest on retailer text and a Reef Life Survey description; the game draws them as duller pinstripes with two dorsal eyespots. |
| **Maroon Clownfish** (`maroon_clownfish`) | *Amphiprion biaculeatus* | marine | [FishBase — Amphiprion biaculeatus (Spinecheek anemonefish)](https://www.fishbase.se/summary/Amphiprion-biaculeatus.html) (T1)<br>[WoRMS — Amphiprion biaculeatus (Bloch, 1790)](https://www.marinespecies.org/aphia.php?p=taxdetails&id=1605249) (T1)<br>[Fishes of Australia — Amphiprion biaculeatus](https://fishesofaustralia.net.au/home/species/378) (T1)<br>[LiveAquaria — Maroon Clownfish](https://www.liveaquaria.com/product/105/?pcatid=105) (T2)<br>[ORA — Gold Stripe Maroon Clownfish](https://www.orafarm.com/product/gold-stripe-maroon-clownfish/) (T2)<br>[CORAL Magazine — Pedersen (2016) on maroon clownfish lines](https://coralmagazine.com/?p=1490714) (T2)<br>[CORAL Magazine (2014) — Lightning Maroon updates](https://www.coralmagazine.com/2014/06/24/lightning-maroon-updates/) (T2) | Name: WoRMS, the Catalog of Fishes and FishBase now use Amphiprion biaculeatus (Tang et al. 2021 merged Premnas into Amphiprion); much of the hobby still says Premnas. · Colour-form genetics are breeders’ observations, not proven inheritance: Gold Stripe is modelled as a recessive, Lightning as a dominant and the Goldflake/Gold Nugget line as one codominant allele (Pedersen’s untested hypothesis). · Gold Dot and Morse Code are left out: ORA has not said how Gold Dot is inherited, and Morse Code is a pattern seen among non-Lightning siblings, not a line. · Lifespan: no Tier 1 figure; ORA reports pairs spawning for decades, so the game uses its 500-day ceiling as for the ocellaris. |
| **Elegant Starfish** (`elegant_starfish`) | *Fromia milleporella* | marine | [WoRMS — Fromia milleporella (Lamarck, 1816)](https://www.marinespecies.org/aphia.php?p=taxdetails&id=213299) (T1)<br>[Nausicaá — Harlequin shrimp](https://nausicaa.fr/en/my-visit/animals/harlequin-shrimp) (T1)<br>[TFH Magazine (Fenner) — Marbled or tile sea stars](https://tfhmagazine.com/articles/saltwater/marbled-or-tile-sea-stars) (T2)<br>[LiveAquaria — Red Sea Star (Fromia milleporella)](https://www.liveaquaria.com/product/578/) (T2)<br>[Quality Marine — Red Fromia](https://www.qualitymarine.com/quality-marine/invertebrates/stars/fromia/red-fromia-59026) (T2) | Name: no source pins "elegant starfish" to one species (Wikipedia gives it to F. nodosa). The trade sells red Fromia as F. milleporella, which the game uses. · Survival record is poor: Reeflex rates it unproven long-term and keepers report starvation after a year or two; the game makes it hard (needs a mature tank, low hardiness). · Day or night activity is disputed (LiveAquaria diurnal, others nocturnal); the game makes it a little busier at night. · The Red & Black form’s inheritance is unknown; modelled as a simple recessive. |
| **Fighting Conch** (`fighting_conch`) | *Strombus pugilis* | marine | [WoRMS — Strombus pugilis Linnaeus, 1758 (S. alatus a synonym)](https://www.marinespecies.org/aphia.php?p=taxdetails&id=419695) (T1)<br>[SeaLifeBase — Strombus alatus](https://sealifebase.se/summary/Strombus-alatus) (T1)<br>[Davis & Cantillo Villa (2019) — conch aquaculture, World Aquaculture](https://www.was.org/Magazine/2019/04/33/) (T1)<br>[LiveAquaria — Florida Fighting Conch](https://www.liveaquaria.com/product/2174/) (T2)<br>[Top Shelf Aquatics — Fighting Conch](https://topshelfaquatics.com/pages/saltwater-invertebrates/fighting-conch) (T2) | Name: Irwin et al. (2024) sank S. alatus into S. pugilis; the trade still sells it as S. alatus. · Minimum tank: 15, 20 or 90 gallons by source; the game uses 30 with an open sand bed. · Lifespan: no figure found; it matures at 1–2 years and the game gives it ~4 years. · SeaLifeBase calls it a broadcast spawner, which contradicts internal fertilisation and egg strings; the game follows the aquaculture source. |
| **Scarlet Reef Hermit Crab** (`scarlet_hermit_crab`) | *Paguristes cadenati* | marine | [WoRMS — Paguristes cadenati Forest, 1954](https://www.marinespecies.org/aphia.php?p=taxdetails&id=368215) (T1)<br>[Oregon Coast Aquarium — Red reef hermit crab](https://aquarium.org/animals/red-reef-hermit-crab/) (T1)<br>[Naturalis Caribbean diving — Paguristes cadenati](https://caribbean-diving.linnaeus.naturalis.nl/linnaeus_ng/app/views/species/taxon.php?id=6428) (T1)<br>[LiveAquaria — Scarlet Reef Hermit Crab](https://www.liveaquaria.com/product/620/) (T2)<br>[Top Shelf Aquatics — Scarlet Red Hermit Crab](https://topshelfaquatics.com/pages/saltwater-invertebrates/scarlett-red-hermit-crab) (T2) | Snail safety: sources and keepers disagree; many bad reports turn out to be red-leg hermits. Modelled as a small risk that spare shells reduce. · Depth range differs by source (0–100 m, 8–30 m, 1–52 m); irrelevant in a tank. · Lifespan (2–4 years) comes from a retailer page only. |
| **Mexican Turbo Snail** (`mexican_turbo_snail`) | *Turbo fluctuosus* | marine | [WoRMS — Turbo fluctuosus W. Wood, 1828](https://www.marinespecies.org/aphia.php?p=taxdetails&id=413380) (T1)<br>[Galland, Hastings & Leichter (2019) Thermal variability on Gulf of California reefs. Sci. Rep. 9:18022](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6889390/fullTextXML) (T1)<br>[LiveAquaria — Mexican Turbo Snail](https://www.liveaquaria.com/product/571/) (T2)<br>[Top Shelf Aquatics — Mexican Turbo Snail](https://topshelfaquatics.com/pages/saltwater-invertebrates/mexican-turbo-snail) (T2) | Temperature: often called a cold-water snail, but its own reefs run 14–32 °C; the game sets its ideal at 21.5–25 °C and tolerates up to 28. · Whether it can right itself differs by source; the game lets it. · Lifespan comes from a hobby guide only. |
| **Nassarius Snail** (`nassarius_snail`) | *Phrontis vibex* | marine | [WoRMS — Phrontis vibex (Say, 1822)](https://www.marinespecies.org/aphia.php?p=taxdetails&id=877061) (T1)<br>[Animal Diversity Web — Nassarius vibex](https://animaldiversity.org/accounts/Nassarius_vibex/) (T1)<br>[Bailey-Matthews National Shell Museum — Phrontis vibex](https://shells.shellmuseum.org/shell/phrontis-vibex/) (T1)<br>[Reef Cleaners — Nassarius vibex](https://www.reefcleaners.org/nassarius-vibex) (T2)<br>[LiveAquaria — Nassarius Snail](https://www.liveaquaria.com/products/nassarius-snail) (T2) | Name: WoRMS moved it to Phrontis vibex; the trade still sells it as Nassarius vibex (and other species as "Nassarius sp." or "Tongan"). · Whether the sexes are separate was not confirmed for this species (it is the norm for its group). · Stocking figures come from retailers and forums only. |
| **Astraea Snail** (`astraea_snail`) | *Lithopoma tectum* | marine | [WoRMS — Lithopoma tectum ([Lightfoot], 1786)](https://www.marinespecies.org/aphia.php?p=taxdetails&id=419499) (T1)<br>[SeaLifeBase — Lithopoma tectum](https://www.sealifebase.se/summary/Lithopoma-tectum.html) (T1)<br>[Geiger & Levine (FWC) — Florida marine-life snail landings, Aquaculture 2022 abstract](https://was.org/Meeting/Program/PaperDetail/157970) (T1)<br>[LiveAquaria — Astraea Turbo Snail](https://www.liveaquaria.com/products/astraea-turbo-snail) (T2)<br>[Reef Cleaners — Astraea tectas](https://www.reefcleaners.org/astraea-tectas) (T2) | Name: the trade’s "Astraea tecta" is Lithopoma tectum in WoRMS, and trade stock probably mixes Lithopoma species. · Hair algae: most sources say it eats it, one says it mostly ignores it. · Lifespan comes from a hobby guide only. |
| **Cerith Snail** (`cerith_snail`) | *Cerithium atratum* | marine | [WoRMS — Cerithium atratum (Born, 1778)](https://www.marinespecies.org/aphia.php?p=taxdetails&id=224572) (T1)<br>[SeaLifeBase — Cerithium atratum](https://www.sealifebase.se/summary/Cerithium-atratum.html) (T1)<br>[Bailey-Matthews National Shell Museum — Cerithium atratum](https://shells.shellmuseum.org/shell/cerithium-atratum/) (T1)<br>[Biagi et al. (2006) Shell use by the hermit crab Paguristes calliopsis. An. Acad. Bras. Ciênc. 78(3)](https://www.scielo.br/j/aabc/a/JDCTK3Zm7YFjVqb73tWyzgC/abstract/?lang=en) (T1)<br>[Reef Cleaners — Florida Cerith](https://www.reefcleaners.org/florida-cerith) (T2) | Trade "ceriths" may be mixed (LiveAquaria sells Cerithium sp. from the Caribbean and Eastern Pacific); the game uses the Florida cerith. · Lifespan: no figure found. · SeaLifeBase’s "broadcast spawner" is a generic note for the order and contradicts the egg strands; the game follows the keepers’ reports. |
| **Flame Angelfish** (`flame_angelfish`) | *Centropyge loriculus* | marine | [FishBase — Centropyge loriculus (Flame angel)](https://www.fishbase.se/summary/Centropyge-loricula.html) (T1)<br>[Australian Museum — Flame Angelfish](https://australian.museum/Flame-Angelfish-Centropyge-loriculus) (T1)<br>[LiveAquaria — Flame Angelfish](https://www.liveaquaria.com/product/444/?pcatid=444) (T2)<br>[Biota — Flame Angelfish (captive-bred)](https://shop.thebiotagroup.com/products/flame-angelfish) (T2)<br>[Reef Builders (2020) — Morse code flame angelfish](https://reefbuilders.com/2020/04/24/morse-code-flame-angelfish) (T2) | Name: WoRMS and the Catalog of Fishes spell it loriculus; the trade writes loricula. · Protogyny is documented across Centropyge, not yet for this species in a peer-reviewed study. · The Marquesan form is a locality look; modelled as a recessive because its inheritance is unknown. · Lifespan is weakly sourced (5–7+ years). |
| **Six-line Wrasse** (`sixline_wrasse`) | *Pseudocheilinus hexataenia* | marine | [FishBase — Pseudocheilinus hexataenia (Sixline wrasse)](https://www.fishbase.se/summary/Pseudocheilinus-hexataenia.html) (T1)<br>[Barton et al. (2020) Predators of Acropora-eating flatworms. Aquaculture Environment Interactions 12:61–66](https://researchonline.jcu.edu.au/62557/) (T1)<br>[Australian Museum — Sixline Wrasse](https://australian.museum/learn/animals/fishes/sixline-wrasse-pseudocheilinus-hexataenia/) (T1)<br>[LiveAquaria — Six Line Wrasse](https://www.liveaquaria.com/products/six-line-wrasse) (T2)<br>[Quality Marine — Six-line Wrasse](https://www.qualitymarine.com/quality-marine/fish/wrasses/pseudocheilinus/six-line-33580/) (T2) | Tank size: LiveAquaria gives 30 and 60 gallons on one page; Quality Marine 55; the game uses 40. · The mucus cocoon and protogyny are reported for the genus and in hobby sources, not in a species-level study. · Colours: scientific sources describe orange stripes on violet; LiveAquaria “blue lines on orange” — the game follows the scientific description. |
| **Lawnmower Blenny** (`lawnmower_blenny`) | *Salarias fasciatus* | marine | [FishBase — Salarias fasciatus (Jewelled blenny)](https://www.fishbase.se/summary/Salarias-fasciatus.html) (T1)<br>[Fishes of Australia — Salarias fasciatus](https://fishesofaustralia.net.au/home/species/4759) (T1)<br>[Awata et al. (2010) Reproductive behaviour of Salarias fasciatus. Ichthyological Research 57:161–168](https://agris.fao.org/search/en/records/64724de253aa8c896305af08) (T1)<br>[LiveAquaria — Lawnmower Blenny](https://www.liveaquaria.com/products/sailfin-algae-blenny) (T2)<br>[Reef Builders (2015) — The lawnmower blenny](https://reefbuilders.com/2015/05/08/the-lawnmower-blenny-a-funny-fascinating-fish-of-unpredictable-utility) (T2) | Reef safety: LiveAquaria warns of SPS and clam nipping; other sources call it reef-safe. The game marks it mostly safe. · Sources disagree on whether the dorsal fin is notched. · Lifespan (2–6 years) comes from hobby sources only. · Diet: Fishes of Australia calls it mainly a detritivore (it combs detritus from turf algae); the game files it as a grazing herbivore whose foods include detritus. |
| **Flame Hawkfish** (`flame_hawkfish`) | *Neocirrhites armatus* | marine | [FishBase — Neocirrhites armatus (Flame hawkfish)](https://www.fishbase.se/summary/Neocirrhitus-armatus.html) (T1)<br>[FishBase — Reproduction of Neocirrhites armatus (citing Sadovy & Donaldson 1995)](https://www.fishbase.se/Reproduction/5832) (T1)<br>[LiveAquaria — Flame Hawkfish](https://www.liveaquaria.com/products/flame-hawkfish) (T2)<br>[Quality Marine — Revisited: the flame hawkfish](https://www.qualitymarine.com/news/revisited-flame-hawkfish/) (T2) | Name: WoRMS spells the genus Neocirrhites; Neocirrhitus is a misspelling still used in the trade. · Depth differs by source (FishBase 1–10 m, Wikipedia 10–25 m). · Lifespan (10+ years) comes from a retailer without a citation. |
| **Yellowtail Damselfish** (`yellowtail_damselfish`) | *Chrysiptera parasema* | marine | [FishBase — Chrysiptera parasema (Goldtail demoiselle)](https://www.fishbase.se/summary/Chrysiptera-parasema.html) (T1)<br>[CORAL Magazine (2016) — ORA’s captive-bred yellowtail damsel](https://www.coralmagazine.com/?p=1460673) (T2)<br>[LiveAquaria — Yellowtail Damselfish](https://www.liveaquaria.com/products/yellowtail-damselfish) (T2)<br>[Reef Builders (2013) — Chrysiptera parasema](https://reefbuilders.com/2013/11/25/chrysiptera-parasema-yellowtail-damselfish-demoiselle) (T2) | No sex change has been documented for this damsel, so it is modelled as separate-sexed. · Lifespan is weakly sourced (4–6 years). · Breeding is possible in the game but hard, reflecting ORA’s small first success. |
| **Emerald Crab** (`emerald_crab`) | *Mithraculus sculptus* | marine | [WoRMS — Mithraculus sculptus (Lamarck, 1818)](https://www.marinespecies.org/rest/AphiaRecordsByName/Mithraculus%20sculptus?like=false&marine_only=true) (T1)<br>[Wagner (1990) The genera Mithrax and Mithraculus. Zoologische Verhandelingen 264](https://repository.naturalis.nl/document/149174) (T1)<br>[Figueiredo et al. (2008) Emerald crabs to control bubble alga in aquaria. JMBA 88:95–101](https://www.cambridge.org/core/journals/journal-of-the-marine-biological-association-of-the-united-kingdom/article/efficiency-of-using-emerald-crabs-mithraculus-sculptus-to-control-bubble-alga-ventricaria-ventricosa-syn-valonia-ventricosa-in-aquaria-habitats/639F6330E0A684340BB80510279C03E9) (T1)<br>[LiveAquaria — Emerald Crab](https://www.liveaquaria.com/products/emerald-crab) (T2)<br>[TFH Magazine — Mithraculus (Mithrax) sculptus](https://tfhmagazine.com/articles/saltwater/mithraculus-mithrax-sculptus) (T2) | Carapace size: SeaLifeBase gives 1.2 cm, Wagner (Tier 1) 27 mm; the game uses about 5 cm across the legs. · Lifespan (2–4 years) comes from a hobby guide only. · No species-specific predators were found; the usual crab eaters (triggers, puffers, mantis shrimp) are assumed. |
| **Tuxedo Urchin** (`tuxedo_urchin`) | *Mespilia globulus* | marine | [WoRMS — Mespilia globulus (Linnaeus, 1758)](https://www.marinespecies.org/rest/AphiaRecordsByName/Mespilia%20globulus?like=false&marine_only=true) (T1)<br>[Matar et al. — the tuxedo urchin as a model animal (eLife reviewed preprint)](https://elifesciences.org/reviewed-preprints/112682) (T1)<br>[Digimorph (UT Austin) — Mespilia globulus](https://digimorph.geo.utexas.edu/specimens/Mespilia_globulus/) (T1)<br>[LiveAquaria — Tuxedo Urchin](https://www.liveaquaria.com/products/tuxedo-urchin) (T2)<br>[Quality Marine — Tuxedo urchins and coralline algae](https://www.qualitymarine.com/news/tuxedo-urchins-and-coralline-algae/) (T2) | Size differs by source (5–8 cm test); the game uses 7 cm across the spines. · Sources disagree on five or ten bare bands; the game draws ten (Wikipedia, the commonest description). · The red form’s inheritance is unpublished; modelled as a recessive. |
| **Sand-sifting Starfish** (`sand_sifting_starfish`) | *Astropecten polyacanthus* | marine | [WoRMS — Astropecten polyacanthus Müller & Troschel, 1842](https://www.marinespecies.org/rest/AphiaRecordsByName/Astropecten%20polyacanthus?like=false&marine_only=true) (T1)<br>[SeaLifeBase — Astropecten polyacanthus](https://www.sealifebase.se/summary/Speciessummary.php?id=86687) (T1)<br>[Noguchi et al. (1982) Tetrodotoxin in the starfish Astropecten polyacanthus. Nippon Suisan Gakkaishi](https://www.jstage.jst.go.jp/article/suisan1932/48/8/48_8_1173/_article) (T1)<br>[LiveAquaria — Sand Sifting Sea Star](https://www.liveaquaria.com/products/sand-sifting-sea-star) (T2)<br>[Echinoblog (C. Mah) — Telling apart sand stars: Archaster vs. Astropecten](https://echinoblog.blogspot.com/2011/04/telling-apart-sand-stars-archaster-vs.html) (T2) | Trade naming is muddled: “sand-sifting stars” are often Archaster typicus; the game uses Astropecten polyacanthus, the comb star. · LiveAquaria rates it easy, but no long-term successes are reported (Reeflex); the game makes it hard and gives it a big minimum tank. · No per-gallon stocking rule is published, and advice on numbers conflicts (Reef Builders: one or several in a big bed; forums: a second starves); the game keeps one per tank. |
| **Bubble-tip Anemone** (`bubbletip_anemone`) | *Entacmaea quadricolor* | marine | [Titus et al. (2024) Revision of Entacmaea. Zootaxa 5506(1)](https://par.nsf.gov/servlets/purl/10575794) (T1)<br>[SeaLifeBase — Entacmaea quadricolor](https://www.sealifebase.se/summary/Speciessummary.php?id=129744) (T1)<br>[Scott, Hardefeldt & Hall (2014) Asexual propagation of Entacmaea quadricolor. PLoS ONE](https://pmc.ncbi.nlm.nih.gov/articles/PMC4196916/) (T1)<br>[LiveAquaria — Bubble Tip Anemone](https://www.liveaquaria.com/products/green-bubble-tip-anemone) (T2)<br>[Reef Builders (2023) — The indomitable red bubble-tip anemone](https://reefbuilders.com/2023/02/08/the-indomitable-red-bubble-tip-anemone) (T2) | Colour forms (green, rose, rainbow) are traded clones, not studied genetics; modelled as one codominant locus. · Why the tentacles bulb is unclear (fish, light, flow and feeding have all been proposed); the art keeps them bulbed. · Splitting is modelled as a clone appearing beside a settled, well-fed anemone; the timing (a couple of weeks settled, then about every six months) is a game simplification of the hobby reports. |
| **Blue Tang** (`blue_tang`) | *Paracanthurus hepatus* | marine | [FishBase — Paracanthurus hepatus (Palette surgeonfish)](https://www.fishbase.se/summary/Paracanthurus-hepatus.html) (T1)<br>[FAO species guide, vol. 6: Acanthuridae (Randall 2001)](https://www.fao.org/4/y0870e/y0870e30.pdf) (T1)<br>[Animal Diversity Web — Paracanthurus hepatus](https://animaldiversity.org/accounts/Paracanthurus_hepatus/) (T1)<br>[LiveAquaria — Blue Tang](https://www.liveaquaria.com/product/330/?pcatid=330) (T2)<br>[Quality Marine — The blue tang of many names](https://www.qualitymarine.com/news/the-blue-tang-of-many-names/) (T2)<br>[Reef Builders 2016 — Captive-bred blue tang](https://reefbuilders.com/2016/07/20/captive-bred-blue-tang) (T2)<br>[CORAL Magazine 2025 — Biota’s captive-bred blue tangs](https://www.coralmagazine.com/?p=3078387) (T2) | The yellow belly is a population difference whose inheritance is unknown; modelled recessive to set how often shops stock it. · Breeding figures from ADW may describe a related surgeonfish; the game does not breed it. · Water ranges follow the game’s marine bands (LiveAquaria gives 22–26 °C and SG 1.020–1.025). |
| **Naso Tang** (`naso_tang`) | *Naso lituratus* | marine | [FishBase — Naso lituratus (Orangespine unicornfish)](https://www.fishbase.se/summary/Naso-lituratus.html) (T1)<br>[FAO species guide, vol. 6: Acanthuridae (Randall 2001)](https://www.fao.org/4/y0870e/y0870e30.pdf) (T1)<br>[Taylor et al. 2014 — Growth and longevity of Naso (J. Fish Biol. 85: 901–916)](https://researchonline.jcu.edu.au/35460/) (T1)<br>[LiveAquaria — Naso Tang](https://www.liveaquaria.com/products/naso-tang) (T2)<br>[Reef Builders 2015 — Naso lituratus](https://reefbuilders.com/2015/03/15/naso-lituratus-a-sleek-striking-outstanding-fish-for-spacious-marine-aquariums) (T2)<br>[TFH Magazine — The naso tang](https://tfhmagazine.com/articles/saltwater/the-naso-tang-full-article) (T2)<br>[Gensou — Naso tang care](https://gensou.sg/?p=32419) (T3) | Tank: LiveAquaria gives 180 gal, Reef Builders and TFH at least 200; the game’s 240 gal (eight feet) follows one shop blog and is a judgement for a fast, 45 cm cruiser. · Breeding figures are placeholders: no captive breeding is known. |
| **Queen Angelfish** (`queen_angelfish`) | *Holacanthus ciliaris* | marine | [FishBase — Holacanthus ciliaris (Queen angelfish)](https://www.fishbase.se/summary/Holacanthus-ciliaris.html) (T1)<br>[Florida Museum — Queen angelfish](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/holacanthus-ciliaris) (T1)<br>[Animal Diversity Web — Holacanthus ciliaris](https://animaldiversity.org/accounts/Holacanthus_ciliaris/) (T1)<br>[Skorupa et al. 2025 — First captive spawning of the queen angelfish (World Aquaculture Society)](https://www.was.org/Meeting/Program/PaperDetail/167384) (T1)<br>[Skorupa et al. 2025 — Growth of the queen angelfish in aquaculture (World Aquaculture Society)](https://was.org/Meeting/Program/PaperDetail/167558) (T1)<br>[LiveAquaria — Queen Angelfish](https://www.liveaquaria.com/products/queen-angelfish) (T2)<br>[Quality Marine — Queen angelfish](https://www.qualitymarine.com/quality-marine/fish/angels/holacanthus/queen-juvenile-10061/) (T2)<br>[National Geographic — Queen angelfish](https://www.nationalgeographic.com/animals/fish/facts/queen-angelfish) (T2) | Sex change (protogyny) is assumed from related angelfish; the sexes look alike. · Left out: the Townsend angelfish (a hybrid with the blue angel) and the wild colour oddities of St Paul’s Rocks (about 1 % of one island population, not a trade form). |
| **Clown Triggerfish** (`clown_triggerfish`) | *Balistoides conspicillum* | marine | [FishBase — Balistoides conspicillum (Clown triggerfish)](https://www.fishbase.se/summary/Balistoides-conspicillum.html) (T1)<br>[Fishes of Australia — Balistoides conspicillum](https://fishesofaustralia.net.au/Home/species/761) (T1)<br>[Australian Museum — Why are they called triggerfishes?](https://australian.museum/learn/animals/fishes/why-are-they-called-triggerfishes/) (T1)<br>[LiveAquaria — Clown Triggerfish](https://www.liveaquaria.com/products/clown-triggerfish) (T2)<br>[Quality Marine — Clown Triggerfish](https://www.qualitymarine.com/quality-marine/fish/triggers/balistoides/clown-conspicillum-32009/) (T2)<br>[TFH Magazine — Balistoides conspicillum](https://tfhmagazine.com/articles/saltwater/balistoides-conspicillum) (T2)<br>[Reef Builders 2015 — Biota’s cultured clown triggerfish](https://reefbuilders.com/2015/04/06/quality-marine-receives-biota-marines-cultured-balistoides-conspicillum) (T2) | No lifespan source beyond hobby reports; the game uses 12 years. · Its prey size is a judgement: it bites prey apart rather than swallowing it. |
| **Panther Grouper** (`panther_grouper`) | *Chromileptes altivelis* | marine | [Catalog of Fishes — Chromileptes altivelis](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?tbl=species&genus=Chromileptes) (T1)<br>[FishBase — Chromileptes altivelis (Humpback grouper)](https://www.fishbase.se/summary/Chromileptes-altivelis.html) (T1)<br>[Fishes of Australia — Chromileptes altivelis](https://fishesofaustralia.net.au/Home/species/4661) (T1)<br>[Williams et al. 2009 — Biology of the humpback grouper (Endangered Species Research 9: 67–79)](https://researchonline.jcu.edu.au/8039) (T1)<br>[Animal Diversity Web — Cromileptes altivelis](https://animaldiversity.org/accounts/Cromileptes_altivelis) (T1)<br>[LiveAquaria — Panther Grouper](https://www.liveaquaria.com/products/panther-grouper) (T2)<br>[Top Shelf Aquatics — Panther Grouper](https://topshelfaquatics.com/products/panther-grouper-cromileptes-altivelis) (T2) | The 120×36 in footprint is the game’s judgement for a 60 cm fish; the sources give 300 gal. · Hobby keepers report fast growth in aquaria; FishBase calls its growth slow in the wild. · Name: Chromileptes (Catalog of Fishes), Cromileptes (the trade, WoRMS spelling), Epinephelus (Ma & Craig 2018). |
| **Coral Catshark** (`coral_catshark`) | *Atelomycterus marmoratus* | marine | [FishBase — Atelomycterus marmoratus (Coral catshark)](https://www.fishbase.se/summary/Atelomycterus-marmoratus.html) (T1)<br>[Bor, van Oijen & Magenta 2003 — Egg capsules of Atelomycterus marmoratus (Zoologische Mededelingen 77)](https://repository.naturalis.nl/document/44279) (T1)<br>[Choosri et al. 2023 — Embryonic development of the coral catshark (Rambhai Barni Rajabhat Agric. J. 1)](https://ph03.tci-thaijo.org/index.php/kaset_rbruj/article/download/457/331/2257) (T1)<br>[Wikipedia — Coral catshark (citing Hövel et al. 2010, Michael 2004, Compagno 1984)](https://en.wikipedia.org/wiki/Coral_catshark) (T3)<br>[Quality Marine — Coral Cat Shark](https://www.qualitymarine.com/quality-marine/fish/sharks/atelomycterus/coral-cat-marmoratus-29015/) (T2)<br>[Chewy Education — 7 ideal sharks for the saltwater aquarium (Dr Jessie Sanders, DVM)](https://www.chewy.com/education/fish/saltwater-fish/7-ideal-sharks-for-the-saltwater-aquarium) (T2)<br>[Quality Marine — Shark Eggs Part II](https://www.qualitymarine.com/news/shark-eggs-part-ii/) (T2) | Incubation: 76 days at 25 °C in a three-egg trial against 4–6 months at 26 °C at Cologne Zoo; the game uses 120 days. · The laying interval is undocumented: about two weeks is assumed. · Trade “cat sharks” are mostly bamboo sharks; only the “marble shark” and coral catshark listings are this species. |
| **Epaulette Shark** (`epaulette_shark`) | *Hemiscyllium ocellatum* | marine | [FishBase — Hemiscyllium ocellatum (Epaulette shark)](https://www.fishbase.se/summary/Hemiscyllium-ocellatum.html) (T1)<br>[Fishes of Australia — Hemiscyllium ocellatum](https://fishesofaustralia.net.au/home/species/1973) (T1)<br>[Aquarium of the Pacific — Epaulette shark](https://www.aquariumofpacific.org/onlinelearningcenter/species/epaulette_shark) (T1)<br>[Wheeler et al. 2021 — Warming shortens epaulette shark incubation (Scientific Reports 11)](https://researchonline.jcu.edu.au/66857/1/66857.pdf) (T1)<br>[Wheeler et al. 2025 — Egg-laying cycles of epaulette sharks (Biology Open 14)](https://journals.biologists.com/bio/article/doi/10.1242/bio.062076) (T1)<br>[LiveAquaria — Australian Epaulette Shark](https://www.liveaquaria.com/products/australian-epaulette-shark) (T2)<br>[Top Shelf Aquatics — Epaulette Shark](https://topshelfaquatics.com/pages/saltwater-fish/epaulette-shark) (T2)<br>[ORA — Captive-bred epaulette sharks (2016)](https://orafarm.com/?p=7600) (T2) | Incubation: 120–140 days by source and temperature; the game uses 130 days at about 26 °C, shorter in warmer water. · Females housed alone laid on schedule (Wheeler 2025); the game makes their cases empty. A female kept with a male before can store sperm, which the game does not model. · The 500-gallon tank is the bare minimum for an adult; the 1,000 is comfortable. |
| **Brown-banded Bamboo Shark** (`brownbanded_bamboo_shark`) | *Chiloscyllium punctatum* | marine | [FishBase — Chiloscyllium punctatum (Brownbanded bambooshark)](https://www.fishbase.se/summary/Chiloscyllium-punctatum.html) (T1)<br>[Fishes of Australia — Chiloscyllium punctatum](https://fishesofaustralia.net.au/home/species/3264) (T1)<br>[Florida Museum — Brownbanded bamboo shark](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/chiloscyllium-punctatum/) (T1)<br>[Onimaru et al. 2018 — Developmental table of the brownbanded bamboo shark (Developmental Dynamics)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5947634) (T1)<br>[Kempster, Hart & Collin 2013 — Embryos freeze when they sense a predator (PLoS ONE 8)](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0052551) (T1)<br>[Wheaton et al. 2025 — Thyroid disease in aquarium bamboo sharks (Frontiers in Veterinary Science)](https://frontiersin.org/articles/10.3389/fvets.2025.1504527/full) (T1)<br>[LiveAquaria — Brown-banded cat shark (Diver’s Den)](https://www.liveaquaria.com/products/cat-shark-brown-banded-expert-only-6-25-wysiwyg) (T2) | Adult size: 104 cm (Compagno), about 1.2 m (Fishes of Australia), 132 cm (FishBase record); the game uses 105 cm. · No home-aquarium spawning is documented; it breeds readily in public aquariums, whose egg cases are sold to hobbyists. · The famous brown-banded “virgin birth” (San Francisco, 2012) was sperm stored for at least 45 months; the game does not model either. |
| **Figure-eight Puffer** (`figure_eight_puffer`) | *Dichotomyctere ocellatus* | brackish | [FishBase — Dichotomyctere ocellatus (eyespot pufferfish)](https://www.fishbase.se/summary/Dichotomyctere-ocellatus.html) (T1)<br>[Seriously Fish — Tetraodon biocellatus (figure eight puffer)](https://www.seriouslyfish.com/species/tetraodon-biocellatus/) (T2)<br>[Wikipedia — Dichotomyctere ocellatus](https://en.wikipedia.org/wiki/Dichotomyctere_ocellatus) (T2)<br>[The Puffer Forum Library — The Figure Eight Puffer (Pufferpunk)](https://www.thepufferforum.com/forum/library/puffers-in-focus/fig8/) (T3) | Salinity is the classic disagreement: FishBase lists it as a freshwater fish, Seriously Fish says it can be kept fresh but lives longer at SG ~1.005, and Wikipedia and the Puffer Forum recommend low-end brackish (1.005–1.008). The game follows the brackish consensus (ideal 1.004–1.008) and needs at least a trace of salt (1.002) — a game simplification. · pH: FishBase gives 6.5–7.5 for wild fresh water; brackish keepers run ~8. The game tolerates 6.8–8.4 (ideal 7.3–8.2). · Lifespan: up to 15 years (Wikipedia), 18+ recorded (Puffer Forum); 480 game-days ≈ 12 years compressed. · Breeding: not bred in captivity — encoded as not_in_game; the clutch values are placeholders. · The Golden and Bold-ringed variants are natural individual variation, not trade morphs. |
| **Bumblebee Goby** (`bumblebee_goby`) | *Brachygobius doriae* | brackish | [FishBase — Brachygobius doriae (bumblebee goby)](https://www.fishbase.se/summary/Brachygobius-doriae.html) (T1)<br>[Seriously Fish — Brachygobius doriae (bumblebee goby)](https://www.seriouslyfish.com/species/brachygobius-doriae/) (T2)<br>[Wikipedia — Brachygobius](https://en.wikipedia.org/wiki/Brachygobius) (T2)<br>[Seriously Fish — Brachygobius sabanus](https://www.seriouslyfish.com/species/brachygobius-sabanus/) (T2) | Identification: the trade name covers B. doriae, B. sabanus and others that are hard to tell apart (fish sold as "B. xanthozonus" almost certainly are not). Values are shared across them. · Salinity: found in fresh and brackish water; Seriously Fish calls salt optional (~2 g/L). The game treats them as brackish-leaning (ideal SG 1.001–1.006) but lets them live in hard fresh water with a small comfort penalty. · Hatch time: 7–9 days (Seriously Fish) vs ~7 days (Wikipedia); 8 days = 64 game-hours used. · Compressed time: maturity (~6 months) = 9 game-days; ~5 year lifespan ≈ 200 game-days. |
| **Sailfin Molly** (`sailfin_molly`) | *Poecilia latipinna* | brackish | [FishBase — Poecilia latipinna (sailfin molly)](https://www.fishbase.se/summary/Poecilia-latipinna.html) (T1)<br>[USGS NAS — Sailfin molly (Poecilia latipinna) species profile](https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=858) (T1)<br>[Florida Museum (UF) — Discover Fishes: sailfin molly](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/poecilia-latipinna/) (T1)<br>[Seriously Fish — Poecilia latipinna (sailfin molly)](https://www.seriouslyfish.com/species/poecilia-latipinna/) (T2)<br>[Aquarium Co-Op — Care guide for mollies](https://www.aquariumcoop.com/blogs/aquarium/molly-fish-care) (T2)<br>[Wikipedia — Fancy molly](https://en.wikipedia.org/wiki/Fancy_molly) (T2) | Domestic mollies are hybrids of P. latipinna, P. sphenops and P. velifera (origin disputed); the game uses P. latipinna values for all of them. · Salinity: wild fish live from fresh water to ~87 ppt. The game allows fresh water (SG 1.000) with a small comfort penalty and caps the range at 1.018 so they are not sold for marine tanks. · Gestation: 28 days (FishBase), 3–4 weeks (Florida Museum), up to ~2 months (Seriously Fish); 30 days = 240 game-hours used. · Genetics are simplified and partly unverified: real melanism is polygenic; "gold is recessive" and "lyretail is dominant" are common hobby claims we could not confirm in a primary source. Colour and fin shape are inherited independently (as modelled). · Balloon mollies (a spinal deformity) are deliberately left out on welfare grounds. · Compressed time: 3–5 year lifespan ≈ 180 game-days. |
| **Banded Archerfish** (`banded_archerfish`) | *Toxotes jaculatrix* | brackish | [FishBase — Toxotes jaculatrix (banded archerfish)](https://www.fishbase.se/summary/Toxotes-jaculatrix.html) (T1)<br>[The Australian Museum — Banded archerfish, Toxotes jaculatrix](https://australian.museum/learn/animals/fishes/banded-archerfish-toxotes-jaculatrix/) (T1)<br>[Animal Diversity Web — Toxotes jaculatrix](https://animaldiversity.org/accounts/Toxotes_jaculatrix/) (T1)<br>[Vailati, Zinnato & Cerbino 2012, PLoS ONE — How archer fish achieve a powerful impact](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0047867) (T1)<br>[Seriously Fish — Toxotes jaculatrix (banded archerfish)](https://www.seriouslyfish.com/species/toxotes-jaculatrix/) (T2)<br>[Wikipedia — Archerfish](https://en.wikipedia.org/wiki/Archerfish) (T2) | Salinity: juveniles can be kept fresh (Seriously Fish) but adults live mainly in brackish estuaries; the game uses a brackish range (ideal SG 1.005–1.012) for all ages. · Size: FishBase 30 cm TL vs Seriously Fish 300 mm SL; aquarium adults are usually 15–20 cm, so 20 cm is used. Tank size follows Seriously Fish (120 × 60 cm base → 125 gal). · Spitting: real range is 1.25–3 m at a steep ~74° angle; the game keeps the jet inside the tank’s air gap and treats it as a signature behaviour, not a hunting mechanic. · Bar count: 4–5 (Australian Museum) vs 4–6 (Wikipedia). · Compressed time: 5–8 year captive lifespan ≈ 300 game-days. |
| **Silver Mono** (`silver_mono`) | *Monodactylus argenteus* | brackish | [FishBase — Monodactylus argenteus (Silver moony)](https://www.fishbase.se/summary/Monodactylus-argenteus.html) (T1)<br>[Fishes of Australia — Monodactylus argenteus](https://fishesofaustralia.net.au/home/species/581) (T1)<br>[Thomas et al. (ICAR-CIBA) 2019 — First captive breeding of the silver moony (WAS Asian-Pacific Aquaculture)](https://was.org/Meeting/Program/PaperDetail/153808) (T1)<br>[LiveAquaria — Mono Argentus](https://www.liveaquaria.com/product/996/?pcatid=996) (T2)<br>[Aquatics Unlimited — Mono argentus](https://aquaticsunlimited.com/product/brackish-mono-argentus-monodactylus-argenteus/) (T2)<br>[Gensou — Silver mono care](https://gensou.sg/?p=33043) (T3) | Salinity: one range spans the young’s near-fresh water and the adults’ sea water; its bounds are the game’s synthesis of the sources, not a figure from any of them. · Tank: 180 gallons is the game’s choice for a school of 25 cm fish, above every source (130–150 gal). · Lifespan (8–12 years) comes from a shop blog (Tier 3). |
| **Spotted Scat** (`spotted_scat`) | *Scatophagus argus* | brackish | [FishBase — Scatophagus argus (Spotted scat)](https://www.fishbase.se/summary/Scatophagus-argus.html) (T1)<br>[Fishes of Australia — Scatophagus argus](https://fishesofaustralia.net.au/home/species/2212) (T1)<br>[Xiao et al. 2019 — Genome survey of the spotted scat](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6940847/fullTextXML) (T1)<br>[TFH Magazine — Scatophagus argus](https://tfhmagazine.com/articles/saltwater/scatophagus-argus) (T2)<br>[Practical Fishkeeping — The mucky mouths](https://www.practicalfishkeeping.co.uk/features/the-mucky-mouths/) (T2)<br>[Aquarium Glaser — Scatophagus argus](https://www.aquariumglaser.de/en/fish-archives/scatophagus-argus-2) (T2)<br>[Aquatics Unlimited — Red (ruby) scat](https://aquaticsunlimited.com/product/brackish-scat-red-ruby-scatophagus-argus-rubifrons/) (T2) | The red “ruby” scat is the young’s colour phase (Aquatics Unlimited, Aquarium Glaser); TFH and Wikipedia call red an individual variation that can last. The game draws every young scat red-patched. · Salinity: one range spans the young’s brackish water and the adults’ sea water; its bounds are the game’s synthesis. · Age at maturity (7–9 months) is uncited in Wikipedia; the sexes differ in size by one study (females larger) and the other way by Aquarium Glaser. |

## Facts used per species

### Axolotl — *Ambystoma mexicanum*

- **University of Kentucky AGSC — Guide to Axolotl Husbandry** (Tier 1) — https://ambystoma.uky.edu/education1/guide-to-axolotl-husbandry
  - Facts: 15–18 °C recommended; never above about 22 °C; pH 6.5–8.0; never extremely soft or distilled water (salts restore hardness, not salinity); rapid circulation is stressful; avoid pea-sized gravel; maturity about 1 year; spermatophores; eggs 12–20 h after mating, laid over 1–2 days; hatch in 2–3 weeks at room temperature; larvae cannibalistic, sort by size; adults fed 3–4 times a week
- **Animal Diversity Web — Ambystoma mexicanum** (Tier 1) — https://animaldiversity.org/accounts/Ambystoma_mexicanum/
  - Facts: native range Xochimilco/Chalco; average length 23 cm, up to 30 cm; neoteny; carnivorous diet; 100–300 eggs per spawning; hatch at 10–14 days; lab longevity 5–6 y, some 10–15 y; Critically Endangered
- **Woodcock et al. 2017, Scientific Reports — Identification of mutant genes and introgressed tiger salamander DNA in the laboratory axolotl** (Tier 1) — https://pmc.ncbi.nlm.nih.gov/articles/PMC5428337/
  - Facts: white (d), albino (a), melanoid (m), axanthic (ax) are autosomal recessive; white = edn3 defect; albino = tyrosinase
- **Tyrp1 is the Mendelian determinant of the axolotl copper mutant — Scientific Reports (2024; title verified via search listing, full text behind a login redirect)** (Tier 1) — https://www.nature.com/articles/s41598-024-73283-1
  - Facts: copper is a Mendelian (recessive) Tyrp1 mutation
- **AquariumNexus — Axolotl and goldfish: can you keep them together?** (Tier 3) — https://www.aquariumnexus.com/axolotl-goldfish/
  - Facts: goldfish nip axolotl gills; goldfish add heavy waste; small goldfish can be swallowed
- Compatibility rules encoded: tag:fish_tiny → high_risk (“Small fish are either eaten by the axolotl (with a choking risk) or pick at its gills.”); tag:goldfish → high_risk (“Goldfish nip axolotl gills, add heavy waste, and small goldfish can be swallowed and choke the axolotl.”)

### Betta — *Betta splendens*

- **FishBase — Betta splendens (Siamese fighting fish)** (Tier 1) — https://www.fishbase.se/summary/Betta-splendens.html
  - Facts: 6.5 cm TL max; freshwater, pH 6.0–8.0, 5–19 dH, 24–30 °C; Mekong basin; floodplains, canals, rice paddies; labyrinth organ; bubble nest guarded by male; IUCN Vulnerable (2011); sexes separated except for breeding
- **PetMD — Betta Fish Care Sheet (Maria Zayas, DVM)** (Tier 2) — https://www.petmd.com/fish/betta-fish-care-sheet
  - Facts: 76–81 °F; pH ~6.5–7.8; at least 2.5 gal, 5–10 gal ideal; lifespan 3–5 years; lid needed — bettas jump; avoid fin-nippers and long-finned fish the betta may spar with
- **Aquarium Co-Op — Betta fish care guide** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/betta-fish-care-guide
  - Facts: ~80 °F; 5–10 gal minimum; feed once a day; not with other bettas; small tetras, rasboras, corydoras in 10–20 gal planted tanks
- **Wang et al. 2021 — Genomic basis of striking fin shapes and colors in the fighting fish (Mol. Biol. Evol.)** (Tier 1) — https://pmc.ncbi.nlm.nih.gov/articles/PMC8321530/
  - Facts: double tail caused by a deletion in a conserved zic1/zic4 regulatory element; elephant-ear fins linked to kcnh8 expression; domestic fin forms and colours have identifiable genetic bases
- Compatibility rules encoded: betta → risk (“Two male bettas will fight — often to serious injury.”); tag:shrimp_dwarf → conditional (“Some bettas ignore adult dwarf shrimp; others hunt them. Shrimplets are usually eaten.”); fancy_guppy → conditional (“Bettas often attack colourful long-finned male guppies as if they were rivals.”)

### Pea Puffer — *Carinotetraodon travancoricus*

- **FishBase — Carinotetraodon travancoricus (Malabar pufferfish)** (Tier 1) — https://www.fishbase.se/summary/Carinotetraodon-travancoricus.html
  - Facts: freshwater, demersal; max 3.5 cm TL, usually under 2.5 cm; pH 7.5–8.3; 22–28 °C; endemic to south-western India (Malabar); IUCN Vulnerable (2010); eggs hidden in vegetation
- **Seriously Fish — Carinotetraodon travancoricus** (Tier 2) — https://www.seriouslyfish.com/species/carinotetraodon-travancoricus/
  - Facts: 25 mm SL; 22–28 °C, pH 6.8–8.0, 5–25 dGH; exclusively freshwater; nips slow/long-finned fish; not a community fish; snails needed for beak wear; ten or fewer eggs, hatch ~5 days; male belly line and eye wrinkles
- **Aquarium Co-Op — Pea puffer care guide** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/pea-puffer-care-guide
  - Facts: fully freshwater; ~1 inch; 74–82 °F; pH 6.5–8.4, ideal 7.2–7.5; 5 gal for the first puffer + 3 per extra; one male per 2–3 females; carnivore; rejects most dry food; species-only recommended
- Compatibility rules encoded: tag:snail → high_risk (“This puffer is likely to hunt snails.”); tag:shrimp_dwarf → high_risk (“Pea puffers hunt dwarf shrimp.”); tag:long_fins → high_risk (“Pea puffers nip flowing fins.”)

### Ocellaris Clownfish — *Amphiprion ocellaris*

- **FishBase — Amphiprion ocellaris (Clown anemonefish)** (Tier 1) — https://www.fishbase.se/summary/Amphiprion-ocellaris.html
  - Facts: max 11 cm TL; depth 1–15 m; protandrous hermaphrodite; three natural host anemones; males guard and aerate eggs; IUCN Least Concern (assessed 2021); reached 12 years in captivity
- **Animal Diversity Web — Amphiprion ocellaris** (Tier 1) — https://animaldiversity.org/accounts/Amphiprion_ocellaris/
  - Facts: dominance hierarchy; protandry; male nest care; 100–1,000 eggs; incubation 6–8 days; planktonic larvae 8–12 days; omnivore
- **Monterey Bay Aquarium — Clownfish** (Tier 1) — https://www.montereybayaquarium.org/animals/animals-a-to-z/clownfish
  - Facts: all clownfish start male; protective mucus in anemone; prefer captive-raised fish
- **LiveAquaria — Proaquatix Captive-Bred Ocellaris Clownfish** (Tier 2) — https://www.liveaquaria.com/product/3409/?pcatid=3409
  - Facts: min tank 20 gal; 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025; eggs hatch in 6–11 days; captive-bred price ~$30; reef compatible
- **Klann et al. (2021) Variation on a theme: pigmentation variants and mutants of anemonefish. EvoDevo (PMC8214269)** (Tier 1) — https://pmc.ncbi.nlm.nih.gov/articles/PMC8214269/
  - Facts: Snowflake irregular white bars; Gladiator het → Platinum/Wyoming White hom; Black ocellaris from a wild melanistic population; misbar environmental and genetic; genetic states unconfirmed
- Compatibility rules encoded: lined_seahorse → conditional (“Clownfish are faster feeders and can turn territorial, stressing slow seahorses. It can work in a roomy tank with target feeding and no anemone.”)

### Lined Seahorse — *Hippocampus erectus*

- **FishBase — Hippocampus erectus (Lined seahorse)** (Tier 1) — https://www.fishbase.se/summary/Hippocampus-erectus.html
  - Facts: max 17.8 cm SL; western Atlantic range; IUCN Vulnerable (assessed 2016); CITES Appendix II; gestation 20–21 days; reared in captivity
- **Animal Diversity Web — Hippocampus erectus** (Tier 1) — https://animaldiversity.org/accounts/Hippocampus_erectus/
  - Facts: prehensile tail; very slow swimmer; daily greeting dance; male pregnancy 20–21 days; 250–650 eggs; captive lifespan ~4.7 years; fry feed up to 10 h a day
- **Pete Giwojna — A Seahorse Reef, Part One: Reef Compatibility of Hippocampus spp. (TFH Magazine)** (Tier 2) — https://www.tfhmagazine.com/articles/saltwater/a-seahorse-reef-part-1-reef-compatibility-of-hippocampus-spp
  - Facts: exclude anemones and fire coral; Euphyllia/Catalaphyllia stings stronger than most anemones; soft corals are good choices; avoid Tridacna clams; best at 23–24 °C, avoid >27 °C
- **Bulk Reef Supply — Ultimate Seahorse Care Guide** (Tier 2) — https://www.bulkreefsupply.com/content/post/seahorse-aquarium-how-to
  - Facts: 30 gal per pair, +10 per extra seahorse; tank 18"+ tall; 72–78 °F, SG 1.020–1.025; low to medium flow; avoid stinging corals and aggressive fish; feed 2–3 times a day; prefer captive-bred
- **Chewy Education — How To Care for a Pet Seahorse (reviewed)** (Tier 2) — https://www.chewy.com/education/fish/saltwater-fish/how-to-care-for-a-pet-seahorse
  - Facts: 30 gal per pair; 70–78 °F; minimal current, feed mode; avoid angelfish, damselfish, tangs, anemones
- Compatibility rules encoded: tag:tang → high_risk (“Tangs are fast, pushy grazers that sweep up food before a seahorse can reach it, and they need strong flow. This animal is likely to outcompete the seahorse at feeding.”); coral_beauty → high_risk (“Dwarf angelfish are quick, bold feeders and may pick at a seahorse’s skin and skin filaments.”); foxface_rabbitfish → high_risk (“A large, fast grazer with venomous spines. It dominates feeding and needs far more flow and space than seahorses tolerate.”); green_chromis → conditional (“Chromis are fast midwater feeders that grab food before seahorses reach it. Workable only with dedicated target feeding.”); ocellaris_clownfish → conditional (“Clownfish are faster feeders and can become territorial. Works in a roomy tank without an anemone, with target feeding.”); dwarf_lionfish → incompatible (“A venomous ambush predator that eats small fish and shrimp; young seahorses are prey and adults are harassed.”); miniatus_grouper → incompatible (“A large predator that eats fish it can swallow — including seahorses.”); peacock_mantis_shrimp → incompatible (“A mantis shrimp will strike and kill a slow seahorse that rests near its burrow.”); tag:stinging_cnidarian → incompatible (“Anemones, fire coral and strongly stinging corals burn seahorse skin when they perch on them.”)

### Cherry Shrimp — *Neocaridina davidi*

- **USGS Nonindigenous Aquatic Species — cherry shrimp (Neocaridina davidi) fact sheet** (Tier 1) — https://nas.er.usgs.gov/queries/factsheet.aspx?SpeciesID=2257
  - Facts: up to 40 mm; native to China, Korea, Taiwan, Vietnam; streams, ponds, ditches; up to ~60 eggs; incubation 16–19 days (warm); maturity ~30 days (warm lab); established in Hawaii and Florida via aquarium release
- **USFWS Ecological Risk Screening Summary — Cherry Shrimp (2025)** (Tier 1) — https://www.fws.gov/sites/default/files/documents/2025-06/ecological-risk-screening-summary-cherry-shrimp-june-2025.pdf
  - Facts: females ~25 mm, males ~20 mm; wild habitat 4–30 °C seasonally; captive breeding recorded 14–30 °C, pH 6–8.2; diet mostly detritus and algae; 43–60 eggs per clutch; wild lifespan ~10–15 months; High invasion risk; established in Europe, Japan, Canada; can carry crayfish plague
- **Aquarium Co-Op — Care Guide for Cherry Shrimp** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/cherry-shrimp-care
  - Facts: 16–28 °C tolerated, 22–24 °C ideal; pH 6.5–8.5; GH ≥ 6, KH ≥ 2; start with ≥ 10 shrimp; almost all fish eat baby shrimp; females larger, more colourful, with a saddle
- **The Shrimp Farm — Red Cherry Shrimp caresheet** (Tier 2) — https://www.theshrimpfarm.com/posts/shrimp-caresheet-red-cherry-shrimp/
  - Facts: 18–29.5 °C; pH 6.2–8.0; GH 4–8, KH 3–15, TDS 150–250; 5 gal minimum; direct development, 1–2 mm hatchlings; maturity 2–2.5 months; 1–2 year lifespan
- **LiveAquaria — Red Cherry Shrimp** (Tier 2) — https://www.liveaquaria.com/products/red-cherry-shrimp
  - Facts: peaceful; never use copper medications; not with loaches, puffers or larger carnivorous fish; ~$2 each in packs
- **Canada Shrimps — Neocaridina strains** (Tier 3) — https://www.canadashrimps.com/neocaridina-strains
  - Facts: red grades by colour coverage (cherry, sakura, fire red, painted); blue dream vs blue velvet; green jade, black rose, chocolate, yellow, orange lines

### Comet Goldfish — *Carassius auratus*

- **USGS Nonindigenous Aquatic Species — Goldfish (Carassius auratus)** (Tier 1) — https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=508
  - Facts: feral fish 12–22 cm SL, up to 41 cm SL; native to East Asia; still or slow weedy water; survives 0–41 °C; recorded in all 50 US states; uproots plants, increases turbidity, eats fish eggs and fry; usual lifespan 6–7 y, max ~30
- **FishBase — Carassius auratus** (Tier 1) — https://www.fishbase.se/summary/Carassius-auratus.html
  - Facts: max 48 cm TL; pH 6.0–8.0, dH 5–19; omnivore (plankton, invertebrates, plants, detritus); several batches per season; cold winter needed for proper egg development; IUCN Least Concern
- **Animal Diversity Web — Carassius auratus** (Tier 1) — https://animaldiversity.org/accounts/Carassius_auratus/
  - Facts: 15–45 cm TL; social, schools; diet ~45% vegetation; typical 2,000–4,000 eggs; hatch 2–9 days; no parental care; adults eat eggs; captive lifespan 5–10 y, record 43
- **USFWS Ecological Risk Screening Summary — Goldfish (2025)** (Tier 1) — https://www.fws.gov/sites/default/files/documents/2025-01/ecological-risk-screening-summary-goldfish.pdf
  - Facts: High invasion risk; hatch 3–10 days at ~15–25 °C; maturity from 8 months in culture; males chase females over plants; adhesive eggs; carries carp diseases
- **PetMD — Goldfish Care Sheet (Melissa Witherell, DVM)** (Tier 2) — https://www.petmd.com/fish/goldfish-care-sheet
  - Facts: 65–75 °F; ≥20 gal for one juvenile, far more for adults; filter turnover ≥4×/h; heavy waste producer
- **Aquarium Co-Op — Goldfish Tank Mates** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/goldfish-tank-mates
  - Facts: avoid any fish small enough to fit in a goldfish’s mouth; cool 50–70 °F water clashes with tropical fish; spiny corydoras/otocinclus can choke goldfish
- **The Goldfish Tank — Can goldfish and shrimp live together?** (Tier 3) — https://thegoldfishtank.com/goldfish-care/tank-mates/can-goldfish-and-shrimp-live-together/
  - Facts: adult goldfish eat shrimp given the chance; comets are worse than fancies; shrimplets are eaten
- **Wikipedia — Comet (goldfish)** (Tier 3) — https://en.wikipedia.org/wiki/Comet_(goldfish)
  - Facts: developed in the USA in the 1880s (Hugo Mulertt); long, deeply forked single tail; best suited to ponds; sarasa and yellow colour forms
- Compatibility rules encoded: tag:shrimp_dwarf → high_risk (“Goldfish may eat these shrimp. Adults are often caught; shrimplets are at extreme risk. Dense cover reduces but never eliminates the risk.”); tag:shrimp_fry → high_risk (“Baby shrimp are at extreme predation risk around goldfish, even where adult shrimp survive.”); fancy_goldfish → conditional (“Fast comets outcompete slow fancy goldfish at feeding and can outgrow them; keep single-tails and fancies apart.”)

### Fancy Goldfish — *Carassius auratus*

- **FishBase — Carassius auratus** (Tier 1) — https://www.fishbase.se/summary/Carassius-auratus.html
  - Facts: pH 6.0–8.0, dH 5–19; omnivore; egg scatterer; cold winter conditions egg development; IUCN Least Concern (wild species)
- **PetMD — Swim Bladder Disease in Fish (Jessie Sanders, DVM)** (Tier 2) — https://www.petmd.com/fish/conditions/respiratory/swim-bladder-disorders-fish
  - Facts: swim-bladder disorders especially common in round-bodied fancy goldfish; sinking or neutrally buoyant foods advised
- **Aquarium Co-Op — Care Guide for Fancy Goldfish** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/care-guide-for-fancy-goldfish
  - Facts: 20 gal for the first + ≥10 per extra; wide tanks; 50–70 °F, no heater needed; dig and uproot plants; 30–50% water changes when nitrate > 50 ppm
- **Aquarium Co-Op — Goldfish Tank Mates** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/goldfish-tank-mates
  - Facts: eat anything that fits in their mouth; white clouds and rosy barbs are much faster than fancy goldfish
- **LiveAquaria — Oranda Goldfish** (Tier 2) — https://www.liveaquaria.com/product/957/?pcatid=957
  - Facts: max ~10 in; 65–75 °F, pH 6.5–7.5; minimum 30 gal; wen develops from 3–4 months over ~2 years; red cap, calico, black, blue, chocolate colours
- **PetSmart — How to Take Care of Your Fancy Goldfish** (Tier 2) — https://www.petsmart.com/learning-center/fish-care/how-to-take-care-of-your-fancy-goldfish/A0147.html
  - Facts: some varieties grow to a foot; keep fancies only with other fancy goldfish; sinking food
- **The Goldfish Tank — Can goldfish and shrimp live together?** (Tier 3) — https://thegoldfishtank.com/goldfish-care/tank-mates/can-goldfish-and-shrimp-live-together/
  - Facts: fancies eat shrimp and certainly shrimplets, a little less than comets; slow, clumsy swimmers
- **Wikipedia — List of goldfish varieties** (Tier 3) — https://en.wikipedia.org/wiki/List_of_goldfish_varieties
  - Facts: fantail, ryukin, oranda, ranchu, telescope/black moor body types; calico = nacreous scales
- Compatibility rules encoded: tag:shrimp_dwarf → high_risk (“Goldfish may eat these shrimp. Adults are often caught; shrimplets are at extreme risk. Dense cover reduces but never eliminates the risk.”); tag:shrimp_fry → high_risk (“Baby shrimp are at extreme predation risk around goldfish, even where adult shrimp survive.”); comet_goldfish → conditional (“Slow fancy goldfish lose out to fast comets at feeding and may be outgrown and bullied at mealtimes.”); white_cloud_minnow → conditional (“Nimble white clouds reach food long before a fancy goldfish, and a large goldfish may swallow one.”)

### Neon Tetra — *Paracheirodon innesi*

- **Seriously Fish — Paracheirodon innesi** (Tier 2) — https://www.seriouslyfish.com/species/paracheirodon-innesi/
  - Facts: max 30 mm SL; 21–25 °C, pH 4.0–7.5, GH 1–12; breeding 26.5–29 °C, pH 5.5–6.5, GH 1–5; school of 8–10+; eggs hatch 24–36 h; fry free-swimming 3–4 days later; diamond head, gold, albino and long-fin forms; females rounder
- **FishBase — Paracheirodon innesi** (Tier 1) — https://www.fishbase.se/summary/Paracheirodon-innesi.html
  - Facts: 2.5 cm SL; 20–26 °C, pH 5.0–7.0; blackwater/clearwater Solimões tributaries; omnivore; IUCN Least Concern (2021)
- **LiveAquaria — Neon Tetra** (Tier 2) — https://www.liveaquaria.com/products/neon-tetra
  - Facts: 68–78 °F, pH 5.5–7.0, KH 4–8; 10 gal minimum; dense planting with low light; groups of 6+
- **PetMD — Tetra Care Sheet (Maria Zayas, DVM)** (Tier 2) — https://www.petmd.com/fish/tetra-fish-care-sheet
  - Facts: 10+ gal; groups of at least 5–6; lifespan 2–4 y, some to 10
- **Aquarium Co-Op — Neon tetras vs cardinal tetras** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/neon-tetras-and-cardinal-tetras
  - Facts: neons prefer cooler water than cardinals; red only on the rear half vs full length in cardinals; mostly captive-raised; $1–2
- **Animal Diversity Web — Paracheirodon axelrodi (genus predators)** (Tier 1) — https://animaldiversity.org/accounts/Paracheirodon_axelrodi/
  - Facts: Paracheirodon tetras are preyed on by angelfish; adults eat eggs
- **Wikipedia — Neon tetra** (Tier 3) — https://en.wikipedia.org/wiki/Neon_tetra
  - Facts: stripe fades at night (guanine crystals); maturity ~12 weeks; named after William T. Innes (1936); ~2 million sold monthly in the US

### Panda Corydoras — *Corydoras panda*

- **Seriously Fish — Corydoras panda** (Tier 2) — https://www.seriouslyfish.com/species/corydoras-panda/
  - Facts: 50 mm SL; 22–25 °C, pH 6.0–7.4, GH 1–12; upper Amazon, Peru; clear/blackwater over sand; group of 6+; clean river sand to protect barbels; T-position; hatch 3–5 days; virtually all captive-bred
- **FishBase — Hoplisoma (Corydoras) panda** (Tier 1) — https://www.fishbase.se/summary/Corydoras-panda.html
  - Facts: 20–25 °C, pH 6.0–8.0, dH 2–25; facultative air-breather; IUCN Near Threatened
- **Aquarium Co-Op — Cory catfish care guide** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/cory-catfish-care-guide
  - Facts: 20 gal+; groups of 6+ of one species; sinking foods; not algae eaters; cool water changes trigger spawning; mildly venomous fin spines
- **LiveAquaria — Panda Cory Cat** (Tier 2) — https://www.liveaquaria.com/product/934/?pcatid=934
  - Facts: 72–79 °F, pH 5.8–7.0, dKH 2–12; smooth substrate; planted with hiding places
- **The Shrimp Farm — Panda Corydoras care** (Tier 2) — https://www.theshrimpfarm.com/posts/panda-corydoras-care/
  - Facts: prefers cooler water; groups of 8+; sensitive to nitrate and water swings
- **Wikipedia — Hoplisoma panda** (Tier 3) — https://en.wikipedia.org/wiki/Hoplisoma_panda
  - Facts: 55 mm SL; Peru and Ecuador; up to ~25 eggs per spawning; hatch ~3–4 days at 22 °C; named for panda-like markings
- **Kordon — Malachite Green label (sensitive species warning)** (Tier 2) — https://www.kordon.com/kordon/products/chemical-preventatives-and-treatments-2/malachite-green
  - Facts: catfish, loaches and scaleless fish are medication-sensitive
- Compatibility rules encoded: tag:goldfish → high_risk (“A goldfish that tries to swallow a corydoras can choke on its locking fin spines — and the two need different temperatures.”)

### Mystery Snail — *Pomacea diffusa*

- **USGS Nonindigenous Aquatic Species — spike-topped applesnail (Pomacea diffusa)** (Tier 1) — https://nas.er.usgs.gov/queries/factsheet.aspx?SpeciesID=2662
  - Facts: shell up to ~60 mm; native to the Amazon basin; separate sexes; clutches of 200–600 eggs laid above the waterline; ~2.4 mm hatchlings; gill and lung; established in Florida
- **USFWS Ecological Risk Screening Summary — Spike-topped Applesnail (2017)** (Tier 1) — https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Spike-topped-Applesnail.pdf
  - Facts: shell 40–70 mm; hatch in 2–3 weeks; lives ~3 y at 20–21 °C but ~2 y at 25 °C+; eats other snails’ eggs in lab studies; established in Florida, Alabama, Cuba, Australia, Sri Lanka; risk Uncertain
- **UF/IFAS EDIS IN598 — Applesnails of Florida** (Tier 1) — https://ask.ifas.ufl.edu/publication/IN598
  - Facts: Pomacea cannot withstand water below 10 °C; only Pomacea allowed in interstate trade under USDA permit; feeds on decaying vegetation and biofilm
- **Aquarium Co-Op — Care Guide for Mystery Snails** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/mystery-snail
  - Facts: 21–26 °C; pH ≥ 7.2, GH ≥ 8; 5 gal minimum; does not eat healthy plants (except duckweed); lowering the water line prevents laying; harmed by puffers, loaches
- **Applesnail.net — Pomacea diffusa** (Tier 2) — https://applesnail.net/content/species/pomacea_diffusa.htm
  - Facts: shell 45–65 mm; diet of decaying plants and aufwuchs; clutch size
- **Donya Quick — Color Genetics of Pomacea diffusa** (Tier 3) — https://www.donyaquick.com/color-genetics-of-pomacea-diffusa/
  - Facts: body pigment, shell ground colour and banding are simple Mendelian traits; named colour forms

### Nerite Snail — *Neritina natalensis*

- **Aquarium Co-Op — Nerite snail care guide** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/nerite-snail
  - Facts: 1.3–3.8 cm; pH above 7.0; eats algae and biofilm; plant-safe; escape artist; white egg capsules do not hatch in freshwater; larvae need brackish water and months of acclimation; 1–2 year lifespan
- **Aquatic Arts — Zebra Nerite Snail Care Guide** (Tier 2) — https://aquaticarts.com/pages/zebra-nerite-snail-care-guide
  - Facts: 18–29 °C; pH 6.5–8.5; GH/KH moderate to high; eggs need brackish water (SG 1.005–1.015); highly copper-sensitive; avoid cichlids
- **Aquatic Arts — Zebra Nerite Snail (product page)** (Tier 2) — https://aquaticarts.com/products/zebra-nerite-snails
  - Facts: adults 1–1.5 in; 5 gal minimum; wild-collected stock; ~$2–4 each
- **Wikipedia — Vittina natalensis (cites IUCN 2009)** (Tier 3) — https://en.wikipedia.org/wiki/Vittina_natalensis
  - Facts: ~2.5 cm; East African coastal rivers and estuaries; Near Threatened (IUCN 2009); formerly Neritina natalensis; 22–26 °C
- **AquariumBreeder — Nerite snails: care, diet and breeding** (Tier 3) — https://aquariumbreeder.com/nerite-snails-detailed-guide-care-diet-and-breeding/
  - Facts: GH 7–15, KH 5–12; veliger larvae; metamorphosis ~68 days in a related species; eats only dead plant tissue; avoid puffers, crayfish, assassin snails

### Fancy Guppy — *Poecilia reticulata*

- **Seriously Fish — Poecilia reticulata** (Tier 2) — https://www.seriouslyfish.com/species/poecilia-reticulata/
  - Facts: 60 mm SL max; 17–28 °C, pH 7.0–8.5, GH 8–30; gestation 4–6 weeks; 5–100 fry; adults eat fry; avoid fin-nippers; fancy strains less hardy
- **FishBase — Poecilia reticulata** (Tier 1) — https://www.fishbase.se/summary/Poecilia-reticulata.html
  - Facts: 18–28 °C, pH 7.0–8.0, dH 9–19; native to NE South America and the Caribbean; brood 20–40 roughly every 4 weeks; sperm storage; widely introduced for mosquito control; IUCN Least Concern (2020)
- **Aquarium Co-Op — Guppy care guide** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/guppy-care-guide
  - Facts: 76–78 °F recommended; lifespan ~18 months at 82 °F vs 3.5+ y at 72 °F; hard water; 1 male to 2–3 females; gestation ~28–30 days; avoid goldfish and fin-nippers
- **PetMD — Guppy Care Sheet (Maria Zayas, DVM)** (Tier 2) — https://www.petmd.com/fish/guppy-fish-care-sheet
  - Facts: 72–82 °F, pH 6.8–7.8; 5 gal + 2 per extra fish; groups of 3+; 2–3 year lifespan
- **UF/IFAS EDIS FA054 — Freshwater Ornamental Fish Commonly Cultured in Florida** (Tier 1) — https://ask.ifas.ufl.edu/publication/FA054
  - Facts: guppies are a foundation species of Florida ornamental aquaculture; livebearer biology
- **Diana Walstad — Breeding Guppies: Genetic Pitfalls and Successes (2022)** (Tier 3) — https://dianawalstad.com/wp-content/uploads/2022/03/guppy-genetics-2022.pdf
  - Facts: tuxedo (Bcp) and snakeskin (Sst/Ssb) are dominant; Asian blau / grass genetics; ribbon males cannot inseminate; many colour genes Y-linked
- **Chesapeake Guppy Club — IFGA show classes** (Tier 3) — https://chesapeakeguppyclub2004.wordpress.com/ifgashowclases/
  - Facts: delta 55–75°, veiltail 40–50°; sword classes; albinos require red eyes
- Compatibility rules encoded: endlers_livebearer → conditional (“Guppies and Endler’s livebearers interbreed and produce fertile hybrids — keep them apart to preserve pure lines.”)

### Endler's Livebearer — *Poecilia wingei*

- **Seriously Fish — Poecilia wingei** (Tier 2) — https://www.seriouslyfish.com/species/poecilia-wingei/
  - Facts: males 25 mm SL; 24–30 °C, pH 7.0–8.5, GH 15–35; broods every 23–24 days, 5–25 fry; males colour at 3–5 weeks, females breed at ~2 months; adults rarely eat young; do not house with guppies; Laguna de Patos habitat lost
- **FishBase — Poecilia wingei** (Tier 1) — https://www.fishbase.se/summary/Poecilia-wingei.html
  - Facts: NE Venezuela (Cumaná area, Paria); IUCN Endangered B1ab(iii,v) (2021)
- **Aquarium Co-Op — Endler’s livebearer care guide** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/endlers-livebearer-care-guide
  - Facts: males ~1 in, females ~1.8 in; pH 6.5–8.5; 5–10 gal minimum; 1 male to 2–3 females; gestation 23–30 days; interbreed with guppies
- **Schories, Meyer & Schartl 2009 — Zootaxa 2266 (P. obscura; remarks on P. wingei)** (Tier 1) — https://www.biotaxa.org/Zootaxa/article/view/zootaxa.2266.1.2
  - Facts: P. wingei is a valid species in subgenus Acanthophacelus with P. reticulata and P. obscura
- **Wikipedia — Poecilia wingei** (Tier 3) — https://en.wikipedia.org/wiki/Poecilia_wingei
  - Facts: most pet-shop Endlers are guppy hybrids; named after Øjvind Winge; rediscovered by John Endler in 1975
- **Marty’s Fish — AdrianHD’s contributions to Endler strains** (Tier 3) — https://martysfish.com/adrianhds-contributions-to-endlers-livebearer-strains-variations/
  - Facts: black bar, red chest, peacock, lime green and other N-class lines
- **Gensou — Endler colour varieties** (Tier 3) — https://gensou.sg/endler-livebearer-colour-varieties/
  - Facts: N/P/K class system; tiger and El Silverado descriptions
- Compatibility rules encoded: fancy_guppy → conditional (“Endler’s livebearers and guppies interbreed and produce fertile hybrids, ending pure Endler lines. Keep them in separate tanks.”)

### Amano Shrimp — *Caridina multidentata*

- **Aquarium Co-Op — Care Guide for Amano Shrimp** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/amano-shrimp
  - Facts: 4–5 cm; pH 6–8; hair, thread and black beard algae eater; expert escaper; does not breed in a normal tank (larvae need salt water); avoid goldfish, cichlids, barbs; named after Takashi Amano
- **Larval performance of three amphidromous Caridina species — Crustacean Research 50 (2021)** (Tier 1) — https://www.jstage.jst.go.jp/article/crustacea/50/0/50_41/_article
  - Facts: amphidromous life cycle; larvae tolerate 17–34 ppt salinity
- **Habitat selection and copper toxicity in Caridina multidentata — Journal of Crustacean Biology 45(2) (2025)** (Tier 1) — https://academic.oup.com/jcb/article/45/2/ruaf020/8127312
  - Facts: prefers current, avoids light; copper LC50 1.15 mg/L; sublethal copper impairs food detection
- **The Shrimp Farm — Amano Shrimp care sheet** (Tier 2) — https://www.theshrimpfarm.com/posts/amano-shrimp-care-sheet/
  - Facts: up to ~5 cm; 21–27 °C; pH 6.5–8.0, GH 5–15, KH 1–10; incubation 4–6 weeks; larval rearing SG 1.012–1.019; 3–5 year lifespan
- **Wikipedia — Caridina multidentata** (Tier 3) — https://en.wikipedia.org/wiki/Caridina_multidentata
  - Facts: native to Japan and Taiwan; IUCN Least Concern; formerly C. japonica (renamed 2006); sex differences in markings

### Otocinclus — *Otocinclus vittatus*

- **FishBase — Otocinclus vittatus** (Tier 1) — https://www.fishbase.se/summary/Otocinclus-vittatus.html
  - Facts: 3.3 cm TL; 20–25 °C, pH 6.0–7.5, dH 2–18; Amazon, Orinoco, Paraná/Paraguay basins; facultative air-breather; IUCN Least Concern (2020)
- **Seriously Fish — Otocinclus macrospilus** (Tier 2) — https://www.seriouslyfish.com/species/otocinclus-macrospilus/
  - Facts: 35 mm SL; 21–26 °C, pH 5.5–7.5, GH 1–12; groups of 6+; almost all wild-caught; shy; outcompeted at feeding; T-position spawning
- **Aquarium Co-Op — Otocinclus care guide** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/otocinclus-catfish
  - Facts: needs an established tank with algae and biofilm; supplement with vegetables and algae wafers; a few plump otos beat a starving school; 30–40 eggs; hatch ~3 days
- **Practical Fishkeeping — Keeping Otocinclus catfish** (Tier 2) — https://www.practicalfishkeeping.co.uk/features/keeping-otocinclus-catfish-in-the-aquarium/
  - Facts: 22–28 °C; high import mortality; trade O. affinis is usually O. vittatus/macrospilus; female places eggs singly
- **Aquatic Arts — Otocinclus (tank-bred)** (Tier 2) — https://aquaticarts.com/products/otocinclus-catfish-tank-bred
  - Facts: tank-bred otos are more durable; groups of 6+; plant-safe; ~$7 each
- **Kordon — Malachite Green label (sensitive species warning)** (Tier 2) — https://www.kordon.com/kordon/products/chemical-preventatives-and-treatments-2/malachite-green
  - Facts: catfish and scaleless fish are medication-sensitive
- Compatibility rules encoded: tag:goldfish → high_risk (“A goldfish that tries to swallow an otocinclus can choke on its spines — and the two need different temperatures.”)

### White Cloud Mountain Minnow — *Tanichthys albonubes*

- **FishBase — Tanichthys albonubes** (Tier 1) — https://www.fishbase.se/summary/Tanichthys-albonubes.html
  - Facts: 4.0 cm TL; 18–22 °C nominal, survives to 5 °C; pH 6.0–8.0, dH 5–19; not recorded in the wild 1980–2001; IUCN Data Deficient (2010); groups of 5+
- **USGS Nonindigenous Aquatic Species — White Cloud Mountain Minnow** (Tier 1) — https://nas.er.usgs.gov/queries/FactSheet.aspx?SpeciesID=2784
  - Facts: discovered 1932 near Guangzhou; clear, shallow, slow, weedy brooks; egg scatterer, spawns March–October; aquarium releases recorded in Georgia and Hawaii
- **USFWS Ecological Risk Screening Summary — White Cloud Mountain Fish (rev. 2019)** (Tier 1) — https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-White-Cloud-Mountain-Fish.pdf
  - Facts: wild population rediscovered 2003; captive-bred reintroductions near Guangzhou; relict populations in Guangdong, Hainan and Vietnam
- **Yi et al. 2004 — Rediscovering the wild population of White Cloud Mountain minnows (Zoological Research)** (Tier 1) — https://www.zoores.ac.cn/article/id/2426
  - Facts: wild population rediscovered in a spring-fed mountain pool near Guangzhou
- **Seriously Fish — Tanichthys albonubes** (Tier 2) — https://www.seriouslyfish.com/species/tanichthys-albonubes/
  - Facts: 40 mm SL; 14–22 °C; permanently warm water shortens life; pH 6.0–8.5, GH 5–20; very peaceful; males spar; eggs hatch 48–60 h; golden, long-fin, albino forms
- **Aquarium Co-Op — White Cloud Mountain Minnow care** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/white-cloud-mountain-minnow-care
  - Facts: 65–77 °F, no heater needed; 10 gal minimum, groups of 6+; adults do not tend to eat their babies; good with cool-water fish and shrimp
- **Wikipedia — White Cloud Mountain minnow** (Tier 3) — https://en.wikipedia.org/wiki/White_Cloud_Mountain_minnow
  - Facts: named after Tan Kam Fei; sold as the “poor man’s neon”; meteor/long-fin form; lifespan 5+ years

### Medaka Ricefish — *Oryzias latipes*

- **FishBase — Oryzias latipes** (Tier 1) — https://www.fishbase.se/summary/Oryzias-latipes.html
  - Facts: max 4.0 cm SL; 18–24 °C, pH 7.0–8.0, dH 9–19; Japan, Korea, China, Vietnam; IUCN Least Concern (2018)
- **UNSW Embryology — Medaka development (Iwamatsu 2004 staging)** (Tier 1) — https://embryology.med.unsw.edu.au/embryology/index.php?title=Medaka_Development
  - Facts: 39 developmental stages; hatching ~9 days at 26 °C; first vertebrates to mate in space (IML-2, 1994)
- **Kondo et al. 2025 — Medaka initiate courtship and spawning late at night (PLOS ONE)** (Tier 1) — https://pmc.ncbi.nlm.nih.gov/articles/PMC11819472/
  - Facts: wild courtship peaks 01:00–03:00; daily spawning; female carries eggs then attaches them to plants
- **Niwa — A manual for large-scale breeding of medaka (medaka-book.org)** (Tier 1) — https://medaka-book.org/contents/chapter02/Appendix2_1.pdf
  - Facts: lab colonies 25–28 °C, 14 h light; long-lived rooms ~20 °C
- **NIES Invasive Species Database (Japan) — Oryzias latipes** (Tier 1) — https://www.nies.go.jp/biodiversity/invasive/DB/detail/50910e.html
  - Facts: native range in Japan; Japan Red Data Book: Vulnerable; released non-local/domestic medaka contaminate wild gene pools
- **Seriously Fish — Oryzias latipes** (Tier 2) — https://www.seriouslyfish.com/species/oryzias-latipes/
  - Facts: 36 mm SL; 16–22 °C, pH 6.5–8.5, GH 5–25; groups of 8+; incubation 1–3 weeks depending on temperature; male fins longer
- **Aquarium Co-Op — Medaka rice fish care** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/medaka-rice-fish
  - Facts: 60–75 °F, unheated tanks and ponds; may jump — lid needed; groups of 6+; good with white clouds, hillstream loaches, shrimp; eggs carried then attached to plants; 1–5 year lifespan
- **Tokyo Aqua Garden — Medaka varieties** (Tier 3) — https://tokyoaquagarden.com/medaka-varieties
  - Facts: himedaka, youkihi, shiro, ao, miyuki, lamé, hire-naga, dharma descriptions

### Honey Gourami — *Trichogaster chuna*

- **Seriously Fish — Trichogaster chuna** (Tier 2) — https://www.seriouslyfish.com/species/trichogaster-chuna/
  - Facts: 55 mm SL; 22–27 °C, pH 6.0–7.5, GH 2–15; India, Bangladesh, Nepal; groups of 4–6; avoid fin-nippers and boisterous feeders; bubble nest; eggs hatch 24–36 h; male/female colours; water-spitting
- **FishBase — Trichogaster chuna** (Tier 1) — https://www.fishbase.se/summary/Trichogaster-chuna.html
  - Facts: 22–28 °C, pH 6.0–8.0, dH 5–19; IUCN Least Concern (2009)
- **Aquarium Co-Op — Honey gourami care guide** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/honey-gourami
  - Facts: 74–82 °F; 5–10 gal for one, 20 gal for three; labyrinth organ; bettas only if non-aggressive; eats baby shrimp; gold and red forms; $5–10
- **LiveAquaria — Honey Dwarf Gourami** (Tier 2) — https://www.liveaquaria.com/product/992/?pcatid=992
  - Facts: 72–78 °F, pH 6.0–8.0, KH 4–10; 10 gal; needs surface access; territorial when spawning
- **UF/IFAS EDIS FA054 — Freshwater Ornamental Fish Commonly Cultured in Florida** (Tier 1) — https://ask.ifas.ufl.edu/publication/FA054
  - Facts: labyrinth fish breathe air; bubble-nest builders; male guards eggs
- **Aqulator — Can honey gouramis live with bettas?** (Tier 3) — https://www.aqulator.com/articles/can-honey-gourami-live-with-bettas/
  - Facts: male betta and honey gourami may fight over the surface/nest sites
- Compatibility rules encoded: betta → conditional (“Two labyrinth fish that both claim the surface: a male betta and a honey gourami may fight over nest sites.”)

### Kuhli Loach — *Pangio kuhlii*

- **Seriously Fish — Pangio semicincta** (Tier 2) — https://www.seriouslyfish.com/species/pangio-semicincta/
  - Facts: trade kuhli is almost always P. semicincta; 100 mm SL; 21–26 °C, pH 3.5–7.0, GH 0–8; groups of 5–6+; soft sand; burrows; tight lid, jumps; may prey on eggs or fry; breeding reports vague
- **FishBase — Pangio kuhlii** (Tier 1) — https://www.fishbase.se/summary/Pangio-kuhlii.html
  - Facts: 12 cm TL; 24–30 °C, pH 5.5–6.5; facultative air-breather; IUCN Least Concern (2019)
- **Practical Fishkeeping — Keeping kuhli and other eel loaches** (Tier 2) — https://www.practicalfishkeeping.co.uk/features/keeping-kuhli-and-other-eel-loaches-in-the-aquarium/
  - Facts: 22–26 °C, pH 6–7; groups of 10 ideal; squeeze into the tiniest gaps, filters and powerheads; only P. oblonga and P. doriae bred at home
- **Aquarium Co-Op — Kuhli loach care guide** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/kuhli-loach-care-guide
  - Facts: 3–4 in; 23–27 °C; 20 gal for 3–6; nocturnal and shy; not documented to eat shrimp, snails or plants
- **Aquatic Arts — Striped Kuhli Loach** (Tier 2) — https://aquaticarts.com/products/kuhli-loach
  - Facts: 24–28 °C, pH 6.0–7.5; groups of 5+; 20 gal
- **Wikipedia — Kuhli loach** (Tier 3) — https://en.wikipedia.org/wiki/Kuhli_loach
  - Facts: 10–15 dark bars on salmon-pink to yellow; a few hundred greenish eggs among floating-plant roots; lifespan up to ~14 years; named after Heinrich Kuhl
- **Kordon — Malachite Green label (sensitive species warning)** (Tier 2) — https://www.kordon.com/kordon/products/chemical-preventatives-and-treatments-2/malachite-green
  - Facts: loaches and scaleless fish are medication-sensitive

### Reticulated Hillstream Loach — *Sewellia lineolata*

- **FishBase — Sewellia lineolata** (Tier 1) — https://www.fishbase.se/summary/Sewellia-lineolata.html
  - Facts: 5.7 cm SL; fast, rocky streams incl. waterfalls; grazes aufwuchs; IUCN Vulnerable (2010)
- **Seriously Fish — Sewellia lineolata** (Tier 2) — https://www.seriouslyfish.com/species/sewellia-lineolata
  - Facts: 65 mm SL; 20–24 °C, pH 6.0–7.5, GH 1–10; turnover 15–20×/h; groups of 6+; males spar harmlessly; tight lid; easiest loach to breed, often accidental
- **Aquarium Co-Op — Care Guide for Hillstream Loaches** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/hillstream-loaches
  - Facts: 65–80 °F acceptable, stress at warm end; keep one or three+, never two; shrimp-safe; ~$15
- **Aquarium Co-Op — Goldfish Tank Mates** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/goldfish-tank-mates
  - Facts: hillstream loaches grip glass too tightly for goldfish to pluck off; share cool water
- **TFH Magazine — Going with the Flow: Hillstream Loach Care (M. Hellweg)** (Tier 2) — https://www.tfhmagazine.com/articles/freshwater/hillstream-loach-care
  - Facts: room temperature, no heater; long, shallow tanks; bright light for aufwuchs; singles languish; one planted tank produced 200+ juveniles
- **Loaches Online — Sewellia lineolata: easy to spawn or a lot of luck? (E. Bodrock)** (Tier 3) — https://www.loaches.com/articles/sewellia-lineolata-the-reticulated-hillstream-loach-easy-to-spawn-or-a-whole-lot-of-luck
  - Facts: ~20 tiny white eggs; fry 1–2 mm, ~1 cm by day 41; adults eat eggs and fry; sexing by pectoral tubercles

### Bristlenose Pleco — *Ancistrus cf. cirrhosus*

- **Seriously Fish — Ancistrus sp. ‘3’ (A. cf. cirrhosus)** (Tier 2) — https://www.seriouslyfish.com/species/ancistrus-cf-cirrhosus/
  - Facts: 125 mm SL; 21–26 °C, pH 5.5–7.5, GH 1–15; all hobby fish commercially produced, uncertain origin; territorial with conspecifics; male broods eggs in a cave; albino, long-fin, piebald, xanthic forms
- **USGS Nonindigenous Aquatic Species — Bristlenosed catfish (Ancistrus sp.)** (Tier 1) — https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=2598
  - Facts: ~15 cm; feral in Florida, Hawaii and Utah; male guards eggs; males have head tentacles
- **FishBase — Ancistrus cirrhosus** (Tier 1) — https://www.fishbase.se/summary/Ancistrus-cirrhosus.html
  - Facts: true A. cirrhosus 9.1 cm SL, Paraná basin; facultative air-breather; IUCN Least Concern (2020)
- **Aquarium Co-Op — Bristlenose pleco care guide** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/bristlenose-pleco-care-guide
  - Facts: 4–6 in; 74–80 °F; 20–29 gal+; needs more than algae; fine with almost any peaceful community fish; clutches of 30–80; males larger with bristles
- **LiveAquaria — Bushy Nose Pleco** (Tier 2) — https://www.liveaquaria.com/product/1039/?pcatid=1039
  - Facts: 72–79 °F, pH 6.5–7.4; 30 gal; caves and driftwood
- **German & Bittong 2009 — Digestive enzyme activities of wood-eating catfishes (PMC)** (Tier 1) — https://pmc.ncbi.nlm.nih.gov/articles/PMC2762538/
  - Facts: “wood-eating” loricariids are detritivores that do not digest wood
- **Gensou — Bristlenose pleco colour morphs guide** (Tier 3) — https://gensou.sg/bristlenose-pleco-colour-morphs-guide/
  - Facts: albino, super red, calico, lemon, blue-eye lemon descriptions; super red fades in warm water; super long-fin carries two copies
- **Sabaj, Armbruster & Page (1999) Spawning in Ancistrus (Siluriformes: Loricariidae) with comments on the evolution of snout tentacles as a novel reproductive strategy: larval mimicry. Ichthyological Exploration of Freshwaters 10(3)** (Tier 1)
  - Facts: male snout tentacles may mimic larvae (larval-mimicry hypothesis)

### African Dwarf Frog — *Hymenochirus boettgeri*

- **USGS Nonindigenous Aquatic Species — Hymenochirus boettgeri** (Tier 1) — https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=66
  - Facts: central African range (Nigeria/Cameroon to the Congo); Florida introduction in 1964 failed
- **Gvoždík et al. 2023 — tetraploidy in Hymenochirus boettgeri (Zool. J. Linn. Soc. 200:1034)** (Tier 1) — https://academic.oup.com/zoolinnean/article/200/4/1034/7321480
  - Facts: wild H. boettgeri are tetraploid; pet/lab stock is diploid; captive stock best called Hymenochirus sp.
- **CDC — 2011 Salmonella outbreak linked to African dwarf frogs** (Tier 1) — https://archive.cdc.gov/www_cdc_gov/salmonella/2011/water-frog-7-20-2011.html
  - Facts: 241 illnesses in 42 states 2009–2011; traced to one frog breeder; water frogs not appropriate for children under 5; wash hands
- **Washington Dept. of Fish & Wildlife — African clawed frog** (Tier 1) — https://wdfw.wa.gov/species-habitats/invasive/xenopus-laevis
  - Facts: clawed frogs have unwebbed front feet and black claws; grow larger than a fist; eat fish, frogs, snails; prohibited invasive species
- **TFH Magazine — Diagnosis of chytridiomycosis in pet African dwarf frogs** (Tier 2) — https://www.tfhmagazine.com/articles/freshwater/aquarium-science-diagnosis-of-chytridiomycosis-in-pet-african-dwarf-frogs
  - Facts: chytrid signs: appetite loss, lethargy, flaking skin; quarantine ≥ 2 months
- **Aquarium Co-Op — Caring for African dwarf frogs** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/caring-african-dwarf-frogs
  - Facts: slow eaters that cannot compete with fish; target-feed frozen bloodworms; will eat guppy fry; amplexus up to ~1.5 days
- **PetSmart — African dwarf frog care guide** (Tier 2) — https://www.petsmart.com/learning-center/reptile-care/african-dwarf-frog-care-guide/A0118.html
  - Facts: 70–82 °F; 5.5 gal for 1–2, 20 gal with fish; fully aquatic; must surface to breathe; 5–7 year lifespan
- **Aquatic Arts — Dwarf African Frog (tank-bred)** (Tier 2) — https://aquaticarts.com/products/dwarf-african-frog
  - Facts: 72–78 °F, pH 6.5–7.8; 10 gal; will eat dwarf shrimp and tiny fish; tight lid
- **Pipidae.org — African dwarf clawed frog or African clawed frog?** (Tier 3) — https://www.pipidae.org/en/species-and-systematics/determining-of-species/african-dwarf-clawed-frog-or-african-clawed-frog/
  - Facts: ADF: webbed fingers, side eyes, rough skin; ACF twice the length, eats fish; all true albinos in the trade are Xenopus
- Compatibility rules encoded: tag:shrimp_dwarf → conditional (“African dwarf frogs may eat small shrimp and will eat shrimplets; well-fed frogs in planted tanks often leave adults alone.”); tag:goldfish → high_risk (“Goldfish outcompete the slow frogs for every meal, may nip or swallow them, and need much cooler water.”)

### Cardinal Tetra — *Paracheirodon axelrodi*

- **Seriously Fish — Paracheirodon axelrodi** (Tier 2) — https://www.seriouslyfish.com/species/paracheirodon-axelrodi/
  - Facts: 35 mm SL; 23–29 °C, pH 3.5–7.5, GH 1–12; breeding pH 5.5–6.5, GH 1–5; school of 8–10+; hatch 24–36 h; free-swimming 3–4 days later; albino forms; golden cardinals parasite-induced; mostly wild-caught
- **FishBase — Paracheirodon axelrodi** (Tier 1) — https://www.fishbase.se/summary/Paracheirodon-axelrodi.html
  - Facts: 3.0 cm SL; 23–27 °C, pH 4.0–6.0; upper Orinoco and Rio Negro; hatch 24–30 h; IUCN Least Concern (2021)
- **Animal Diversity Web — Paracheirodon axelrodi** (Tier 1) — https://animaldiversity.org/accounts/Paracheirodon_axelrodi/
  - Facts: ~500 eggs per spawn; adults eat eggs; maturity ~9 months; wild ~1 year, captive ~5 years; preyed on by angelfish
- **Oliveira et al. 2008 — Tolerance to temperature, pH, ammonia and nitrite in cardinal tetra (Acta Amazonica)** (Tier 1) — https://www.scielo.br/j/aa/a/FYCZj6tsgyvP9QcXYh7yPnC/?lang=en
  - Facts: 96-h LT50 19.6 °C and 33.7 °C; 100% survival pH 4.0–8.5; nitrite LC50 1.1 mg/L (very sensitive); ~80% of Amazonas ornamental exports
- **Aquarium Co-Op — Cardinal tetra care guide** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/cardinal-tetra
  - Facts: 23–29 °C; 15–20 gal for 8–10; good with corys, kuhlis, discus; may eat baby shrimp
- **Aquarium Co-Op — Neon tetras vs cardinal tetras** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/neon-tetras-and-cardinal-tetras
  - Facts: cardinals prefer warmer water than neons; red runs the full body length; often wild-caught; $3–4
- **LiveAquaria — Cardinal Tetra** (Tier 2) — https://www.liveaquaria.com/products/cardinal-tetra
  - Facts: 73–81 °F, pH 5.5–7.5, KH 2–6; 10 gal minimum; groups of 6+
- **Wikipedia — Project Piaba** (Tier 3) — https://en.wikipedia.org/wiki/Project_Piaba
  - Facts: founded 1991 (N. L. Chao); “Buy a Fish, Save a Tree”; Rio Negro fishery ~30 million fish/year

### Dwarf Orange Crayfish — *Cambarellus patzcuarensis*

- **USFWS Ecological Risk Screening Summary — Mexican Dwarf Crayfish (2017)** (Tier 1) — https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Mexican-Dwarf-Crayfish.pdf
  - Facts: trade animals ~2 cm body length; endemic to Lake Pátzcuaro and nearby springs; IUCN Endangered B1ab(iii) (2010); tolerates 10–26 °C; up to ~60 eggs; trade stock tested positive for crayfish plague; sold by 97% of sampled online shops
- **Amazonas Magazine — A Mexican crayfish for nano aquariums (R. O’Leary, 2013)** (Tier 2) — https://www.amazonasmagazine.com/2013/03/15/a-mexican-crayfish-for-nano-aquariums/
  - Facts: ~3 cm max; 20–50 eggs; direct development; female carries young; orange line from Dutch hobbyists, late 1990s; adults moult about twice a year
- **The Shrimp Farm — Dwarf Orange Crayfish care sheet** (Tier 2) — https://www.theshrimpfarm.com/posts/caresheet-dwarf-orange-crayfish/
  - Facts: pH 6.5–8.0; KH 3–15; 10 gal; vulnerable right after moulting; eaten by fish large enough
- **Aquatic Arts — Orange CPO crayfish & care guide** (Tier 2) — https://aquaticarts.com/pages/orange-dwarf-mexican-dwarf-crayfish-care-guide
  - Facts: may opportunistically catch slow-moving fish or dwarf shrimp; not recommended with dwarf shrimp; incubation 3–4 weeks; avoid copper; restricted in several US states
- **Aquariadise — CPO crayfish care sheet** (Tier 3) — https://www.aquariadise.com/caresheet-cambarellus-patzcuarensis/
  - Facts: ideal 18–25.5 °C; lifespan shortens above ~26 °C; GH 8–12; soft water causes failed moults; escapes through gaps > 1 cm; takes moulting shrimp, fry, slow snails; avoid loaches and dwarf cichlids
- Compatibility rules encoded: tag:shrimp_dwarf → conditional (“Dwarf crayfish may catch freshly moulted dwarf shrimp, and shrimplets are at high risk. Many keepers report peaceful coexistence in densely planted tanks.”); tag:fish_benthic → conditional (“Bottom-resting fish such as corydoras and loaches can be pinched or caught while sleeping at night.”); tag:crustacean → conditional (“Crayfish attack other crustaceans while they are soft after a moult.”)

### Discus — *Symphysodon aequifasciatus*

- **Seriously Fish — Symphysodon aequifasciatus** (Tier 2) — https://www.seriouslyfish.com/species/symphysodon-aequifasciatus/
  - Facts: 140 mm SL; lowland Amazon floodplain habitats; 120×45×45 cm tank; peaceful, shy; insect larvae and invertebrate diet
- **FishBase — Symphysodon aequifasciatus** (Tier 1) — https://www.fishbase.se/summary/Symphysodon-aequifasciatus.html
  - Facts: 13.7 cm SL; 26–30 °C, pH 5.0–8.0, dH 0–12; groups of 5+; pairs territorial when breeding; IUCN Least Concern (2018)
- **Aquarium Co-Op — Discus care guide** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/discus-care-guide
  - Facts: 85–86 °F; 75 gal recommended; buy 10–12 juveniles to end with ~6 adults; nitrate < 20–40 ppm; avoid barbs, big tetra schools, clown loaches, angelfish; good with cardinals, corydoras sterbai, bristlenose
- **LiveAquaria — Blue Diamond Discus** (Tier 2) — https://www.liveaquaria.com/products/blue-diamond-discus
  - Facts: 79–86 °F, pH 6.1–7.5, KH 3–8; 50 gal; peaceful tank mates only; ~$90
- **Sylvain & Derome 2017 — skin-mucus feeding of discus fry (Scientific Reports)** (Tier 1) — https://pmc.ncbi.nlm.nih.gov/articles/PMC5507859/
  - Facts: fry feed on parental skin mucus for ~3 weeks; wrigglers free-swimming ~48 h after hatching
- **Aquarium Glaser (2024) — The scientific species name of discus cichlids: an open question** (Tier 2) — https://www.aquariumglaser.de/en/fisharchive/the-scientific-species-name-of-discus-cichlids-an-open-question/
  - Facts: competing classifications (Ready 2006; Bleher 2007); S. discus, S. aequifasciatus, S. haraldi, S. tarzoo
- **North American Discus Association — Discus classification** (Tier 3) — https://discusnada.org/discus-classification/
  - Facts: blue diamond: solid blue, recessive; pigeon blood: no stress bars, pepper, red eyes; red turquoise striations; snakeskin ~14 bars
- **AquariumScience.org — Breeding discus** (Tier 3) — https://aquariumscience.org/17-11-6-breeding-discus/
  - Facts: breeding 80–82 °F, TDS 70–100; cones; ~150–300 eggs; raise ~10 to get pairs
- **Wikipedia — Discus (fish)** (Tier 3) — https://en.wikipedia.org/wiki/Discus_(fish)
  - Facts: maturity within ~1 year; lifespan ~10 years, occasionally 15; parental mucus feeding; domestic strains farmed in SE Asia
- Compatibility rules encoded: neon_tetra → conditional (“Discus need 28–30 °C; neons prefer 25 °C or less and are stressed long-term at discus temperatures. Cardinals are the warm-water alternative.”)

### Freshwater Angelfish — *Pterophyllum scalare*

- **FishBase — Pterophyllum scalare (Freshwater angelfish)** (Tier 1) — https://www.fishbase.se/summary/Pterophyllum-scalare.html
  - Facts: 15 cm TL (size field 10.5); 24–30 °C, pH 6.0–8.0, dH 5–13; swamps with dense vegetation; 7 bars in young, 4 in adults; IUCN Least Concern (2020); both parents guard
- **Seriously Fish — Pterophyllum scalare** (Tier 2) — https://www.seriouslyfish.com/species/pterophyllum-scalare/
  - Facts: 150 mm SL, 20 cm tall; 100×40×50 cm tank; eats small fish; eggs on vertical surfaces; easy; farm-bred
- **Aquarium Co-Op — Angelfish care guide** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/angelfish-care-guide
  - Facts: 29 gal for 4 adults; avoid nano fish and dwarf shrimp; up to 1,000 eggs; 8–12 years; $5–20
- **Practical Fishkeeping — Keeping and breeding angelfish** (Tier 2) — https://www.practicalfishkeeping.co.uk/features/keeping-and-breeding-angelfish-in-the-aquarium/
  - Facts: tank 50 cm tall; hatch within 48 h at 27–28 °C; free-swimming about day 7; baby brine for ~3 weeks
- **The Angelfish Society — Phenotype library (2007)** (Tier 2) — https://www.theangelfishsociety.org/phenotype_library_2007/Dark_Intro.html
  - Facts: Dark series D > M > Gm > g; zebra, stripeless, smokey, veil; koi = gold marble blushing; gold hides smokey
- **Norton (1982) Angelfish genetics, part I. FAMA (reprinted at finarama.com)** (Tier 2) — https://www.finarama.com/genetics/1982prt1.htm
  - Facts: crossing counts; black lace one dose, black two; zebra same in one or two doses; smokey 1:1
- Compatibility rules encoded: neon_tetra → high_risk (“Adult angelfish hunt neon tetras and other fish small enough to swallow.”); tag:shrimp_dwarf → high_risk (“Angelfish eat dwarf shrimp.”)

### German Blue Ram — *Mikrogeophagus ramirezi*

- **FishBase — Mikrogeophagus ramirezi (Ram)** (Tier 1) — https://www.fishbase.se/summary/Mikrogeophagus-ramirezi.html
  - Facts: 4.2 cm SL; Orinoco llanos; 27–30 °C, pH 5.0–6.0; IUCN Least Concern (2020)
- **Seriously Fish — Mikrogeophagus ramirezi** (Tier 2) — https://www.seriouslyfish.com/species/mikrogeophagus-ramirezi/
  - Facts: 60×30 cm for a pair; 27–30 °C, pH 4–7, 1–10 dGH; sifts substrate; both parents guard; strains gold, electric blue, balloon; never add to an immature tank
- **Aquarium Co-Op — Ram cichlids** (Tier 2) — https://aquariumcoop.com/blogs/aquarium/ram-cichlids
  - Facts: ideally 29–30 °C; pair in a 20 gal; up to 4 years; females have blue spangles in the black spot; new pairs eat first spawns
- **Practical Fishkeeping — How to breed the ram** (Tier 2) — https://www.practicalfishkeeping.co.uk/features/how-to-breed-the-ram-mikrogeophagus-ramirezi/
  - Facts: about 200 eggs; free-swimming about 8 days after spawning; males with extended 3rd–4th dorsal rays; pink belly in females
- **Tetra — Ram cichlid** (Tier 2) — https://blog.tetra.net/en-en/ram-cichlid-mikrogeophagus-ramirezi/
  - Facts: black eye bar, black flank spot; orange head shading to blue; lower water, in pairs; up to 3 years
- Compatibility rules encoded: tag:cichlid → conditional (“Other cichlids compete for the floor and can bully a pair of rams.”)

### Harlequin Rasbora — *Trigonostigma heteromorpha*

- **FishBase — Trigonostigma heteromorpha (Harlequin rasbora)** (Tier 1) — https://www.fishbase.se/summary/Trigonostigma-heteromorpha.html
  - Facts: 5 cm TL; 22–25 °C, pH 5.0–7.0, dH 5–12; eggs under leaves; IUCN Least Concern (2019)
- **Tan (2020) Trigonostigma truncata, a new species, and the harlequin’s colours. Raffles Bulletin of Zoology 68:421–433** (Tier 1) — https://lkcnhm.nus.edu.sg/app/uploads/2020/01/RBZ-2020-0058.pdf
  - Facts: 35 mm SL; range; live colours; the black “axine”; T. truncata split off
- **Seriously Fish — Trigonostigma heteromorpha** (Tier 2) — https://www.seriouslyfish.com/species/trigonostigma-heteromorpha/
  - Facts: 60×30 cm for 8–10; 21–28 °C, pH 5.0–7.5; spawns under broad leaves; golden, blue and black strains
- **LiveAquaria — Harlequin Rasbora** (Tier 2) — https://www.liveaquaria.com/products/harlequin-rasbora
  - Facts: 10 gal; schools of 8–10; males copper-orange, females more golden; easy

### Zebra Danio — *Danio rerio*

- **FishBase — Danio rerio (Zebra danio)** (Tier 1) — https://www.fishbase.se/summary/Danio-rerio.html
  - Facts: 3.8 cm SL; five stripes onto the tail; two pairs of barbels; 18–24 °C, pH 6.0–8.0; average 3.5 years, oldest 5.5; IUCN Least Concern (2009)
- **Seriously Fish — Danio rerio** (Tier 2) — https://www.seriouslyfish.com/species/danio-rerio/
  - Facts: 90×30 cm; 18–25 °C; groups of 8–10; leopard is D. rerio; eggs non-adhesive; GloFish excluded
- **Aquarium Co-Op — Zebra danio** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/zebra-danio
  - Facts: 20 gal long; may nip if the school is small; avoid bettas; 100+ eggs
- **Stewart et al. (2021) Long-fin is a dominant gain of function in kcnh2a. Development 148** (Tier 1) — https://pmc.ncbi.nlm.nih.gov/articles/PMC8217709
  - Facts: long-fin dominant; hobbyist origin
- **Watanabe et al. (2006) The leopard gene is connexin 41.8. EMBO Reports 7:893** (Tier 1) — https://pmc.ncbi.nlm.nih.gov/articles/PMC1559663
  - Facts: leopard recessive null allele; spots in homozygotes
- **Lamason et al. (2005) SLC24A5 and the golden zebrafish. Science 310:1782** (Tier 1) — https://www.bio.davidson.edu/genomics/309redesigned/papers_current/sequencing/genomes/2005ionchannel_pigmentation.pdf
  - Facts: golden recessive; lighter stripes
- **Lessman (2014) Zebrafish clutch size and spawning interval** (Tier 1) — https://digitalcommons.memphis.edu/facpubs/504
  - Facts: 39.6 embryos per clutch; every 2.86 days
- Compatibility rules encoded: tag:long_fins → conditional (“Zebra danios nip slow, long-finned fish, especially in small groups; a shoal of eight or more mostly keeps to itself.”)

### Platy — *Xiphophorus maculatus*

- **FishBase — Xiphophorus maculatus (Southern platyfish)** (Tier 1) — https://www.fishbase.se/summary/Xiphophorus-maculatus.html
  - Facts: males 4 cm, females 6 cm TL; 18–25 °C, pH 7.0–8.0; gestation 24–30 days, 20–80 young; mature 3–4 months; IUCN Data Deficient (2018)
- **Seriously Fish — Xiphophorus maculatus** (Tier 2) — https://www.seriouslyfish.com/species/xiphophorus-maculatus/
  - Facts: 60×30 cm; 20–26 °C, hard water; very peaceful; hybrid ancestry
- **Aquarium Co-Op — Care guide for platy fish** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/platy-care-guide
  - Facts: 10–20 gal; 2 females per male; 3–4 years; $2–4
- **Kallman & Atz (1967) The tail-spot patterns of the platyfish. Zoologica 51:107–135** (Tier 1) — https://archive.org/stream/biostor-194013/biostor-194013_djvu.txt
  - Facts: one allelic series of dominant tail-spot alleles; at most two patterns per fish
- **Gordon (1946) Comet and the E modifier in swordtails and platies. Zoologica 31:77–88** (Tier 1) — https://archive.org/stream/biostor-194281/biostor-194281_djvu.txt
  - Facts: wagtail = comet + E; golden st recessive
- **Xiphophorus Genetic Stock Center (Texas State University) — stock list** (Tier 1) — https://imls.txst.edu/stocks.html
  - Facts: sex-linked pigment genes; W, X and Y sex chromosomes
- **Wiedermann — Practical Platy Genetics (hobby guide)** (Tier 3) — https://ephieslivebearers.weebly.com/uploads/5/7/7/9/57793349/practical_platy_genetics_1.0.pdf
  - Facts: tuxedo = nigra on gold; hi-fin dominant; Mickey Mouse = moon + twin

### Swordtail — *Xiphophorus hellerii*

- **FishBase — Xiphophorus hellerii (Green swordtail)** (Tier 1) — https://www.fishbase.se/summary/Xiphophorus-hellerii.html
  - Facts: males 14 cm, females 16 cm TL; 22–28 °C, pH 7.0–8.0; gestation 24–30 days, 20–200 young; one male to several females; IUCN Least Concern (2018)
- **Seriously Fish — Xiphophorus hellerii** (Tier 2) — https://www.seriouslyfish.com/species/xiphophorus-hellerii/
  - Facts: 120×30 cm; fast rocky streams; sword is the lower caudal lobe, males only; males form hierarchies
- **Tetra — Swordtail** (Tier 2) — https://blog.tetra.net/en-en/swordtail-xiphophorus-helleri/
  - Facts: males about 10 cm without the sword; strong jumpers; up to 5 years
- **Texas State University (2021) — How the swordtail grows its sword (kcnh8)** (Tier 1) — https://news.txst.edu/research-and-innovation/2021/swordtail-fish-genetics.html
  - Facts: sword grows at puberty; females prefer long swords; Darwin
- **Gordon (1946) Comet and the E modifier in swordtails and platies. Zoologica 31:77–88** (Tier 1) — https://archive.org/stream/biostor-194281/biostor-194281_djvu.txt
  - Facts: wagtail = comet + E, backcrossed into swordtails
- **Aquarium Glaser — Xiphophorus hellerii Wien Lyra** (Tier 2) — https://www.aquariumglaser.de/en/fish-archives/xiphophorus_hellerii_wien_lyra_en
  - Facts: lyretail males’ gonopodium too long to use; part of each brood lyretail
- Compatibility rules encoded: tag:shrimp_dwarf → conditional (“Adult swordtails eat shrimplets and can catch small adult shrimp.”)

### Dwarf Gourami — *Trichogaster lalius*

- **FishBase — Trichogaster lalius (Dwarf gourami)** (Tier 1) — https://www.fishbase.se/summary/Trichogaster-lalius.html
  - Facts: 9.5 cm TL; 25–28 °C, pH 6.0–8.0; about 600 floating eggs; hatch 12–24 h; IUCN Least Concern (2010); 2022 synonymy note
- **USFWS — Ecological Risk Screening Summary: Dwarf Gourami** (Tier 1) — https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Dwarf-Gourami.pdf
  - Facts: male colours (Dorn 1916); DGIV in imports; sold in bottles in Calcutta
- **Seriously Fish — Trichogaster lalius** (Tier 2) — https://www.seriouslyfish.com/species/trichogaster-lalius/
  - Facts: 60×30×30 cm for a pair; 22–27 °C; two males fight; bubble nest up to 700 eggs; DGIV untreatable; colour forms
- **Aquarium Co-Op — Dwarf gourami** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/dwarf-gourami
  - Facts: 10 gal; males are territorial bullies; eats cherry shrimp; powder blue, flame; 2–4 years
- **Practical Fishkeeping — Let’s hear it for the dwarf gourami** (Tier 2) — https://www.practicalfishkeeping.co.uk/features/lets-hear-it-for-the-dwarf-gourami/
  - Facts: DGIV invariably fatal; swims at all levels
- Compatibility rules encoded: betta → high_risk (“Two territorial labyrinth fish that claim the surface: a male betta and a dwarf gourami often fight.”); honey_gourami → conditional (“A male dwarf gourami bullies other gouramis.”); fancy_guppy → conditional (“Dwarf gourami males can pick on showy, colourful fish like male guppies.”)

### Ghost Shrimp — *Palaemon paludosus*

- **Animal Diversity Web (University of Michigan) — Palaemonetes paludosus** (Tier 1) — https://animaldiversity.org/accounts/Palaemonetes_paludosus/
  - Facts: adults under 50 mm; Atlantic coastal plain; 8–85 eggs; incubation 12–14 days; matures in 2–3 months; lives 6–13 months
- **WoRMS — Palaemon paludosus (Gibbes, 1850)** (Tier 1) — https://www.marinespecies.org/rest/AphiaRecordByAphiaID/932400
  - Facts: accepted name Palaemon paludosus; Palaemonetes paludosus unaccepted
- **Dobkin — Abbreviated larval development in caridean shrimps (FAO)** (Tier 1) — https://www.fao.org/4/AC741T/AC741T24.htm
  - Facts: three zoeal stages; postlarva in 5–10 days without food; no brackish water needed
- **The Shrimp Farm — Ghost shrimp care sheet** (Tier 2) — https://www.theshrimpfarm.com/posts/shrimp-caresheet-ghost-shrimp-palaemonetes-sp/
  - Facts: 18–27.5 °C, pH 6.5–8.0; 10 gal, ~3 per gallon; more aggressive than dwarf shrimp; sponge filter; 1–1.5 years
- **Aquariadise — Ghost shrimp care** (Tier 2) — https://aquariadise.com/ghost-shrimp-palaemonetes-care-info/
  - Facts: 5 gal; males ~4 cm, females ~5 cm; green ovary saddle; $1–3

### Ramshorn Snail — *Planorbella duryi*

- **Lucid key, Australian Freshwater Molluscs — Planorbella duryi** (Tier 1) — https://keys.lucidcentral.org/keys/v3/freshwater_molluscs/key/australian_freshwater_molluscs/Media/Html/entities/planorbella_duryi.htm
  - Facts: up to 25 mm; sinistral, biconcave shell; jelly egg masses, direct development; algae and detritus
- **Freshwater Gastropods of North America (Dillon) — Helisoma scalare duryi** (Tier 1) — https://fwgna.org/species/planorbidae/h_scalaris_duryi.html
  - Facts: Florida range; self-fertilises with a delay; stores sperm ~150 days; red (albino) domestic form; floats on an air pocket
- **USFWS — Ecological Risk Screening Summary: Seminole Ramshorn (2025)** (Tier 1) — https://www.fws.gov/sites/default/files/documents/2025-01/ecological-risk-screening-summary-seminole-ramshorn.pdf
  - Facts: valid name Planorbella duryi; adults ~20 mm; best growth at 26 °C, survives 33 °C; no laying below 12 °C
- **The Shrimp Farm — Ramshorn snail care** (Tier 2) — https://www.theshrimpfarm.com/posts/ramshorn-snail-care/
  - Facts: 22–28 °C, pH 6.5–8.0; colour forms; safe with shrimp; booms when overfed; about 1 year
- **Aquarium Glaser — Planorbella duryi** (Tier 2) — https://aquariumglaser.de/en/fisharchive/planorbella-duryi-2
  - Facts: clutches up to 15 eggs, hatch in 10–12 days; one snail can start a colony; leaves healthy plants alone

### Oscar — *Astronotus ocellatus*

- **FishBase — Astronotus ocellatus (Oscar)** (Tier 1) — https://www.fishbase.se/summary/Astronotus-ocellatus.html
  - Facts: 45.7 cm TL max; 22–25 °C, pH 6.0–8.0; quiet mud- and sand-bottomed waters; both parents guard eggs; hatch 3–4 days; IUCN Least Concern (2020)
- **Animal Diversity Web — Astronotus ocellatus** (Tier 1) — https://animaldiversity.org/accounts/Astronotus_ocellatus/
  - Facts: adults 30–40 cm; mature at 10–14 months; 300–3,000 eggs; hatch 2–3 days; monogamous; jaw-locking
- **USGS Nonindigenous Aquatic Species — Oscar** (Tier 1) — https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=436
  - Facts: established in south Florida, Hawaii and Puerto Rico; lower lethal temperature 12 °C
- **Wang et al. 2022 — Skin transcriptome of albino oscars (Comp. Biochem. Physiol. D)** (Tier 1) — https://pubmed.ncbi.nlm.nih.gov/34864613/
  - Facts: albino oscars have little melanin and immature melanosomes; no inheritance data
- **Syam et al. 2019 — Genetic distinctness of oscar strains (WAS Asian-Pacific Aquaculture)** (Tier 1) — https://was.org/Meeting/Program/PaperDetail/153650
  - Facts: albino, common and red oscars are genetically distinct strains; the red fades without carotenoids
- **Seriously Fish — Astronotus ocellatus** (Tier 2) — https://www.seriouslyfish.com/species/astronotus-ocellatus/
  - Facts: 350 mm SL; 150×60 cm just large enough for one adult; 20–28 °C, pH 6.0–7.5; no beef heart or chicken; juveniles dark with pale bands; forms tiger, red, albino; 10–20 years
- **Practical Fishkeeping — Night of the Oscars** (Tier 2) — https://www.practicalfishkeeping.co.uk/features/night-of-the-oscars/
  - Facts: adults need 180×60×60 cm; digs pits and uproots plants; leaps: needs a cover; plays possum; tankmates stingrays and arowana; lutino and long-fin forms
- **Aquarium Co-Op — Oscar fish care guide** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/oscar-fish-care-guide
  - Facts: recognises its owner and begs; sulks after water changes; lemon and long-fin varieties; $7–9 small, $15+ larger
- **LiveAquaria — Tiger Oscar** (Tier 2) — https://www.liveaquaria.com/products/tiger-oscar
  - Facts: 12 in; spawns at 79–86 °F; 1,000–2,000 eggs; $36.99 (1–3 in)
- Compatibility rules encoded: tag:fish_tiny → incompatible (“An oscar swallows small fish whole.”); tag:fish_small → incompatible (“An oscar swallows small fish whole.”); tag:fish_medium → high_risk (“Medium fish are at the edge of what an adult oscar can swallow.”); tag:shrimp_dwarf → incompatible (“Oscars eat shrimp.”); tag:crustacean → high_risk (“Oscars eat crayfish, crabs and shrimp.”); tag:snail → high_risk (“Oscars crush and eat snails.”); tag:amphibian → incompatible (“Oscars eat frogs and salamanders.”); discus → high_risk (“Discus need warmer, cleaner and calmer water than an oscar tank gives.”); comet_goldfish → incompatible (“Goldfish are cool-water fish; an oscar needs tropical water and eats them while they are small.”); fancy_goldfish → incompatible (“Goldfish are cool-water fish; an oscar needs tropical water and eats them while they are small.”); clown_loach → conditional (“Adult clown loaches are too big to eat, but young ones fit an oscar’s mouth; loaches also fare poorly beside big, dominant fish.”); black_ghost_knifefish → conditional (“A digging, boisterous oscar can damage a knifefish’s skin; only a large knifefish, with sight breaks.”); fahaka_puffer → incompatible (“The fahaka bites chunks out of tankmates and must live alone.”)

### Clown Loach — *Chromobotia macracanthus*

- **FishBase — Chromobotia macracanthus (Clown loach)** (Tier 1) — https://www.fishbase.se/summary/Chromobotia-macracanthus.html
  - Facts: 30.5 cm TL; 25–30 °C; needs a tank at least 150 cm long
- **Legendre et al. 2012 — Captive breeding of the clown loach (Aquatic Living Resources 25: 95–108)** (Tier 1) — https://www.cambridge.org/core/product/7C17B5FF5CE8B86FF03F32B10D26ABAC
  - Facts: spawns in captivity only after hormone injections; 76,000–109,000 eggs per kg of female
- **Seriously Fish — Chromobotia macracanthus** (Tier 2) — https://www.seriouslyfish.com/species/chromobotia-macracanthus/
  - Facts: 180×60 cm for a group; 24–30 °C, pH 5.0–7.0; groups of 5–6 or more; rests on its side; jumps; Borneo fish have black pelvic fins; over 20 years
- **Aquarium Co-Op — Clown loach care guide** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/clown-loach-care-guide
  - Facts: 30–33 cm kept; 28–30 °C; eats snails; ich-prone; clicks
- **LiveAquaria — Clown Loach** (Tier 2) — https://www.liveaquaria.com/products/clown-loach
  - Facts: 100 gal minimum; voracious eater of nuisance snails; $29.99 (2.5–3.5 in)
- Compatibility rules encoded: tag:snail → incompatible (“Clown loaches hunt and eat snails, pet snails included.”); tag:shrimp_dwarf → high_risk (“Clown loaches eat dwarf shrimp.”); tag:long_fins → conditional (“Clown loaches nip slow, long-finned fish.”); betta → high_risk (“A slow, long-finned betta gets nipped.”); discus → conditional (“Boisterous loaches outcompete discus at feeding time.”); fahaka_puffer → incompatible (“The fahaka attacks tankmates and must live alone.”); comet_goldfish → incompatible (“Goldfish are cool-water fish; a clown loach needs warm tropical water.”); fancy_goldfish → incompatible (“Goldfish are cool-water fish; a clown loach needs warm tropical water.”); ornate_bichir → conditional (“An adult bichir hunts the floor at night, where loaches lie on their sides; only loaches too big to swallow.”)

### Black Ghost Knifefish — *Apteronotus albifrons*

- **FishBase — Apteronotus albifrons (Black ghost)** (Tier 1) — https://www.fishbase.se/summary/Apteronotus-albifrons.html
  - Facts: 50 cm TL; 23–28 °C, pH 6.0–8.0; fast-flowing sandy creeks; nocturnal; IUCN Least Concern
- **Maulana, Soelistyowati & Furqon 2021 — Spawning of the black ghost (Indonesian Aquaculture Journal 16: 29–34)** (Tier 1) — https://doi.org/10.15578/iaj.16.1.2021.29-34
  - Facts: farm spawning in pairs at night
- **Kirschbaum & Schugardt 2002 — Reproductive strategies and developmental aspects in mormyrid and gymnotiform fishes (J. Physiol. Paris 96: 557–566)** (Tier 1) — https://doi.org/10.1016/S0928-4257(03)00011-1
  - Facts: breeding triggered by lowering the conductivity and raising the water; mature at about a year
- **Seriously Fish — Apteronotus albifrons** (Tier 2) — https://www.seriouslyfish.com/species/apteronotus-albifrons/
  - Facts: 500 mm TL; 180×60 cm minimum for an adult; 23–28 °C, pH 6.0–8.0; sensitive to water quality; farm-bred in Indonesia
- **LiveAquaria — Black Ghost Knifefish** (Tier 2) — https://www.liveaquaria.com/product/857/?pcatid=857
  - Facts: 18 in; 150 gal; ghost tube for daytime viewing; $24.99 (2–4 in)
- **Practical Fishkeeping — Predators: the knifefishes** (Tier 2) — https://www.practicalfishkeeping.co.uk/features/predators-the-knifefishes/
  - Facts: a 3 m tank for a full adult; nocturnal, caves; eats very small fish such as neons
- **Practical Fishkeeping — 39 top tips for fishkeepers** (Tier 2) — https://www.practicalfishkeeping.co.uk/features/articles/39-top-tips-for-fishkeepers
  - Facts: black ghost knifefish particularly sensitive to copper
- **TFH Magazine — Apteronotus albifrons** (Tier 2) — https://www.tfhmagazine.com/articles/freshwater/apteronotus-albifrons
  - Facts: stiff body needs room front to back to turn; nocturnal
- **Aquarium Glaser — Apteronotus albifrons WHITE** (Tier 2) — https://aquariumglaser.de/en/tag/albifrons-en
  - Facts: white colour sport first imported from Indonesia in 2008; now bred in Europe
- Compatibility rules encoded: tag:fish_tiny → incompatible (“A black ghost eats tiny fish such as neons at night.”); tag:fish_small → high_risk (“Small fish are within reach of a big black ghost’s mouth.”); tag:shrimp_dwarf → incompatible (“A black ghost eats dwarf shrimp.”); oscar → conditional (“Boisterous fish damage a black ghost’s sensitive skin.”); clown_loach → conditional (“Boisterous loaches compete for its caves and its night-time food.”); fahaka_puffer → incompatible (“The fahaka attacks tankmates, and a soft-skinned black ghost is an easy target.”); black_ghost_knifefish → high_risk (“Two or three black ghosts bully each other until the weakest stops feeding.”); silver_arowana → usually_compatible (“Different zones and times: the arowana cruises the surface by day, the black ghost the floor at night; feed it after the lights go off.”); comet_goldfish → incompatible (“Goldfish are cool-water fish; a black ghost needs tropical water.”); fancy_goldfish → incompatible (“Goldfish are cool-water fish; a black ghost needs tropical water.”)

### Fahaka Puffer — *Tetraodon lineatus*

- **FishBase — Tetraodon lineatus (Fahaka pufferfish)** (Tier 1) — https://www.fishbase.se/summary/Tetraodon-lineatus.html
  - Facts: 43 cm TL; Lm 18.2 cm; max reported age 5 years; 24–26 °C; Nile, Chad, Senegal, Gambia, Volta; eats molluscs; IUCN Least Concern (2019)
- **Seriously Fish — Tetraodon lineatus** (Tier 2) — https://www.seriouslyfish.com/species/tetraodon-lineatus/
  - Facts: 430 mm SL; 120×60×60 cm for one; no salt; 24–26 °C, pH 6.5–7.5; feed shells to wear down its teeth; best kept alone; eggs hatch in 72–96 h
- **LiveAquaria — Fahaka Puffer** (Tier 2) — https://www.liveaquaria.com/products/fahaka-puffer
  - Facts: 15 in; 120 gal; best in freshwater; best kept alone; light horizontal stripes; $24.99 (½–1¼ in)
- **Vet Times — A puffer’s overgrown beak trimmed under anaesthetic** (Tier 2) — https://www.vettimes.com/news/vets/small-animal-vets/great-barrier-teeth-goldie-grinning-again-after-delicate-dental
  - Facts: puffer beaks are kept short by hard food; an overgrown beak is cut back under anaesthetic
- **Pufferfish Enthusiasts Worldwide — Fahaka puffer care sheet** (Tier 3) — https://www.pufferfishenthusiastsworldwide.com/post/fahaka-puffer-care-sheet
  - Facts: 60×24×24 in minimum, 6 ft better; fine sand to wallow and bury in; diet 55 % shell-on crustaceans, 25 % snails; mussels carry thiaminase; mostly wild-caught
- Compatibility rules encoded: tag:fish_large → incompatible (“A fahaka bites chunks out of large fish too.”)

### Ornate Bichir — *Polypterus ornatipinnis*

- **FishBase — Polypterus ornatipinnis (Ornate bichir)** (Tier 1) — https://www.fishbase.se/summary/Polypterus-ornatipinnis.html
  - Facts: 60 cm TL; lives at least 20 years; 26–28 °C; adults mainly eat fish, hunting at night; the male catches the eggs in his cupped anal fin; IUCN Least Concern
- **McGill University — Standen et al. 2014 (Nature): fish that walk on their fins** (Tier 1) — https://mcgill.ca/newsroom/node/21059
  - Facts: Polypterus walks on its pectoral fins
- **Seriously Fish — Polypterus ornatipinnis** (Tier 2) — https://www.seriouslyfish.com/species/polypterus-ornatipinnis/
  - Facts: 600 mm SL; 180×60×60 cm; 25–28 °C, pH 6.0–8.0; nocturnal, very poor eyesight, hunts by smell; breathes air: may drown without the surface; escapes through gaps; eggs hatch in 3–4 days
- **LiveAquaria — Ornate Bichir** (Tier 2) — https://www.liveaquaria.com/products/ornate-bichir
  - Facts: 24 in; 180 gal; swallows any fish or invertebrate that fits; captive-bred; prone to jumping; $59.99
- **Practical Fishkeeping — How long will my fish live?** (Tier 2) — https://www.practicalfishkeeping.co.uk/fishkeeping-news/how-long-will-my-fish-live/
  - Facts: an ornate bichir kept 30 years (owner report)
- Compatibility rules encoded: tag:fish_tiny → incompatible (“A bichir swallows small fish at night.”); tag:fish_small → incompatible (“A bichir swallows small fish at night.”); tag:fish_benthic → conditional (“A bichir finds bottom fish resting on the floor at night and takes any that fit.”); tag:fish_medium → high_risk (“Medium fish are within reach of an adult bichir.”); tag:shrimp_dwarf → incompatible (“A bichir eats shrimp.”); tag:amphibian → incompatible (“A bichir eats frogs.”); fahaka_puffer → incompatible (“The fahaka bites chunks out of tankmates and must live alone.”); oscar → conditional (“Size-matched adults share a big tank, but an oscar eats a young bichir and takes the food first: feed the bichir after dark.”); silver_arowana → usually_compatible (“Different zones: the arowana holds the surface, the bichir the floor; feed the bichir after dark.”); comet_goldfish → incompatible (“Goldfish are cool-water fish; a bichir needs tropical water.”); fancy_goldfish → incompatible (“Goldfish are cool-water fish; a bichir needs tropical water.”)

### Silver Arowana — *Osteoglossum bicirrhosum*

- **FishBase — Osteoglossum bicirrhosum (Silver arowana)** (Tier 1) — https://www.fishbase.se/summary/Osteoglossum-bicirrhosum.html
  - Facts: 90 cm TL; 24–30 °C; Amazon, Rupununi and Oyapock; the male broods the eggs and young for about six weeks; IUCN Least Concern (2020)
- **USFWS — Ecological Risk Screening Summary: Silver arowana (2020)** (Tier 1) — https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Arawana_0.pdf
  - Facts: mature after about 2 years; prohibited in Mississippi and Oklahoma; on Hawaii’s conditional list
- **Verba et al. 2014 — Mouthbrooding in the silver arowana (Neotropical Ichthyology 12: 145–151)** (Tier 1) — https://scielo.br/j/ni/a/vjSLNXfJGmLNrC7B9ZR9pkb/?lang=en
  - Facts: broods of 57–146 young, 1.0–6.8 cm; the trade in young for the ornamental market is illegal in Brazil
- **Smithsonian’s National Zoo — Silver arowana** (Tier 1) — https://nationalzoo.si.edu/animals/silver-arowana
  - Facts: can exceed 100 cm; lived beyond 10 years in human care; young with blue glints and a yellow-orange bar; males slenderer with a longer anal fin
- **Seriously Fish — Osteoglossum bicirrhosum** (Tier 2) — https://www.seriouslyfish.com/species/osteoglossum-bicirrhosum/
  - Facts: 800 mm SL; a tank at least 2 m long; 20–30 °C, pH 5.0–7.5; aggressive to its own kind; jumps; not bred in aquaria
- **LiveAquaria — Silver Arowana** (Tier 2) — https://www.liveaquaria.com/products/silver-arowana
  - Facts: 35 in; 250 gal minimum; jumps when startled: a tight lid; $59.99 (3–5 in)
- **Practical Fishkeeping — Aquarama’s most expensive fish** (Tier 2) — https://www.practicalfishkeeping.co.uk/fishkeeping-news/aquaramas-most-expensive-fish/
  - Facts: a near-white “platinum” Osteoglossum; exceptionally rare
- Compatibility rules encoded: tag:fish_tiny → incompatible (“An arowana swallows small fish whole.”); tag:fish_small → incompatible (“An arowana swallows small fish whole.”); tag:fish_medium → high_risk (“Medium fish fit an adult arowana’s mouth.”); tag:shrimp_dwarf → incompatible (“An arowana eats shrimp.”); fahaka_puffer → incompatible (“The fahaka bites chunks out of tankmates and must live alone.”); silver_arowana → high_risk (“Arowanas fight their own kind in all but the biggest tanks.”); oscar → conditional (“Big cichlids harass a young arowana: add the arowana grown, to a large tank.”); comet_goldfish → incompatible (“Goldfish are cool-water fish; an arowana needs tropical water.”); fancy_goldfish → incompatible (“Goldfish are cool-water fish; an arowana needs tropical water.”)

### Koi — *Cyprinus rubrofuscus*

- **Catalog of Fishes — Cyprinus rubrofuscus** (Tier 1) — https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=28864
  - Facts: koi’s wild ancestor treated as C. rubrofuscus Lacepède 1803
- **FishBase — Cyprinus rubrofuscus** (Tier 1) — https://www.fishbase.se/summary/Cyprinus-rubrofuscus.html
  - Facts: Amur to Red River drainages; IUCN Least Concern (2020)
- **FishBase — Cyprinus carpio (Common carp)** (Tier 1) — https://www.fishbase.se/summary/Cyprinus-carpio.html
  - Facts: 3–35 °C, pH 6.5–9.0; 129 cm TL max; breeds at 15–20 °C; eggs hatch in about 4 days
- **Animal Diversity Web — Cyprinus carpio** (Tier 1) — https://animaldiversity.org/accounts/Cyprinus_carpio/
  - Facts: about 300,000 eggs from a 45 cm female; hatch in about 3 days at 25–32 °C; mature at 3–5 years; eats benthic animals and plants
- **Casas et al. 2013 — Scale genes of the common carp (PLoS ONE 8: e83053)** (Tier 1) — https://pmc.ncbi.nlm.nih.gov/articles/PMC3875451/
  - Facts: two scale genes, S and N; mirror ss/nn, leather ss/Nn, NN lethal; koi-derived nudes: fin loss, missing teeth, poor swimming
- **Bar et al. 2013 — Black pigment in koi (Frontiers in Genetics 4: 6)** (Tier 1) — https://www.ebi.ac.uk/europepmc/webservices/rest/PMC3554881/fullTextXML
  - Facts: the Bekko black is most likely one gene with a dominant black allele; the Utsuri black is probably multigenic
- **Gomelsky, Novelo & Warner 2023 — Inheritance in ornamental koi (North American Journal of Aquaculture 85: 48)** (Tier 1) — https://academic.oup.com/naja/article/85/1/48/7808805
  - Facts: metallic is one dominant gene, D; white koi need recessives at two duplicate melanin genes
- **Gomelsky, Schneider & Alsaqufi 2011 — Inheritance of long fins in ornamental koi carp (North American Journal of Aquaculture 73: 49–52)** (Tier 1)
  - Facts: long fins are one dominant gene, Lf; long × short 1:1, long × long 3:1
- **Saitama Prefecture Fisheries Research Institute — Hirenaga nishikigoi** (Tier 1) — https://www.pref.saitama.lg.jp/b0915/kenkyuseika/hirenaga.html
  - Facts: butterfly koi from crossing koi with Indonesian long-finned carp, from 1982; fins about twice as long
- **Andrian et al. 2024 — Koi variety production (Veterinary World 17: 1846)** (Tier 1) — https://www.ebi.ac.uk/europepmc/webservices/rest/PMC11422636/fullTextXML
  - Facts: Kohaku, Sanke and Showa the most cultivated; breeders cull most of each spawn
- **PetMD — Koi fish care sheet** (Tier 2) — https://www.petmd.com/fish/koi-fish-care-sheet
  - Facts: up to 3 ft; 25–50+ years; about 250 gallons per adult; heavy waste
- **California Fish Vet — Can koi and goldfish be kept together?** (Tier 2) — https://cafishvet.com/koi/can-koi-and-goldfish-be-kept-together/
  - Facts: koi live with goldfish; about 250 gallons per koi
- **Kodama Koi Farm — Koi varieties** (Tier 2) — https://www.kodamakoifarm.com/?p=30694
  - Facts: Asagi, Shusui, Goshiki (Asagi × Kohaku, 1918), Taisho Sanke, Ogon, Tancho
- **Kodama Koi Farm — How to breed koi** (Tier 2) — https://www.kodamakoifarm.com/how-to-breed-koi
  - Facts: spring, once a year; parents older than 3 years; one female to two or three males; spawning ropes; parents eat the eggs
- **POND Trade — Monochrome muji** (Tier 2) — https://www.pondtrademag.com/language-of-koi-monochrome-muji-is-pure-perfection/
  - Facts: Chagoi brown and friendly; Soragoi blue-grey; Karashi from Kigoi × Chagoi
- Compatibility rules encoded: fancy_goldfish → high_risk (“Koi are fast, greedy feeders: slow fancy goldfish miss meals and can be swallowed while small.”); comet_goldfish → usually_compatible (“Koi and single-tailed goldfish share ponds, but koi win at feeding and eat small comets.”); axolotl → high_risk (“A mouthing carp picks at external gills, and its heavy waste fouls the clean water axolotls need.”); tag:fish_small → high_risk (“Koi eat any fish that fits in the mouth.”); tag:shrimp_dwarf → incompatible (“Koi eat dwarf shrimp.”); tag:snail → high_risk (“Carp eat snails.”); oscar → incompatible (“Koi are cool-water fish (15–24 °C); oscars need warm, tropical water.”); clown_loach → incompatible (“Koi are cool-water fish (15–24 °C); clown loaches need warm, tropical water.”); black_ghost_knifefish → incompatible (“Koi are cool-water fish (15–24 °C); black ghost knifefish need warm, tropical water.”); fahaka_puffer → incompatible (“Koi are cool-water fish (15–24 °C); fahaka puffers need warm, tropical water.”); ornate_bichir → incompatible (“Koi are cool-water fish (15–24 °C); ornate bichirs need warm, tropical water.”); silver_arowana → incompatible (“Koi are cool-water fish (15–24 °C); silver arowanas need warm, tropical water.”)

### Motoro Stingray — *Potamotrygon motoro*

- **FishBase — Potamotrygon motoro (Ocellate river stingray)** (Tier 1) — https://www.fishbase.se/summary/Potamotrygon-motoro.html
  - Facts: 50 cm disc width max; 24–26 °C; IUCN Least Concern (2024)
- **Animal Diversity Web — Potamotrygon motoro** (Tier 1) — https://animaldiversity.org/accounts/Potamotrygon_motoro/
  - Facts: up to 15 years in captivity; young about 97 mm long at birth; nourished by uterine milk
- **USFWS — Ecological Risk Screening Summary: Ocellate river stingray** (Tier 1) — https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Ocellate-River-Stingray.pdf
  - Facts: mature at about 3 years and a 30–35 cm disc; banned or restricted in AZ, CA, GA, MS, NV, OK, TX; conditional in FL; risk category High
- **Loboda & Carvalho 2013 — Revision of Potamotrygon motoro (Neotropical Ichthyology 11)** (Tier 1) — https://www.scielo.br/j/ni/a/RTXCjMdVqjkBcw4yQHcxrRj/abstract/?lang=en
  - Facts: tricoloured, evenly spaced eyespots wider than the eye
- **OATA — CITES listing of Potamotrygon (2016)** (Tier 2) — https://ornamentalfish.org/8902/
  - Facts: CITES Appendix III from 3 January 2017: Brazil’s and Colombia’s rays
- **Seriously Fish — Potamotrygon motoro** (Tier 2) — https://www.seriouslyfish.com/species/potamotrygon-motoro/
  - Facts: about 50 cm across; 240×90×75 cm for an adult or pair; soft sand to bury in; 1–8 pups after 9–12 weeks; rest the female after 2–3 litters; sheds its spine
- **Fishkeeper (Maidenhead Aquatics) — Motoro stingray** (Tier 2) — https://www.fishkeeper.co.uk/fish/freshwater/miscellaneous/motoro-stingray
  - Facts: floor area matters more than height; 1–8 pups after 2–3 months
- **Aquatics Unlimited — Motoro stingray** (Tier 2) — https://aquaticsunlimited.com/product/misc-stingray-motoro-potamotrygon-motoro
  - Facts: $299.99–499.99 for 4–6 in juveniles; a tank 36 in wide and 90 in+ long
- Compatibility rules encoded: tag:pleco → high_risk (“Suckermouth catfish latch onto a ray’s disc and rasp it raw.”); discus → conditional (“Some keepers lose discus to rays at night, and discus want warmer water.”); fahaka_puffer → incompatible (“A fahaka bites chunks out of tankmates, and a ray resting on the floor can’t escape.”); tag:fish_small → incompatible (“Rays hunt small fish on and near the bottom, mostly at night.”); panda_corydoras → high_risk (“Bottom fish are its natural prey.”); kuhli_loach → high_risk (“Bottom fish are its natural prey.”); otocinclus → high_risk (“Bottom fish are its natural prey.”); hillstream_loach → high_risk (“Bottom fish are its natural prey.”); tag:snail → incompatible (“Rays crunch snails: a favourite food.”); koi → incompatible (“Koi need cool, hard, alkaline water; a ray needs warm, soft, acid water.”); freshwater_angelfish → conditional (“A ray can catch a sleeping angelfish on the floor at night.”); oscar → conditional (“A big, boisterous cichlid stresses a ray and steals its food: only in a very large tank.”); clown_loach → conditional (“Young loaches are prey, and adults compete for food on the floor.”); black_ghost_knifefish → conditional (“Both forage the floor at night, and a young knifefish is prey.”); silver_arowana → usually_compatible (“The classic pairing: the arowana keeps to the surface, the ray to the floor.”); ornate_bichir → usually_compatible (“Bichirs share a big floor with rays; both eat at night, so feed each in its place.”)

### Skunk Cleaner Shrimp — *Lysmata amboinensis*

- **LiveAquaria — Scarlet Skunk Cleaner Shrimp** (Tier 2) — https://www.liveaquaria.com/product/696/?pcatid=696
  - Facts: cleaning stations; reef compatible; 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.023–1.025; intolerant of copper and high nitrate; iodine for moulting; avoid hawkfish, lionfish, predatory shrimp, crabs; price ~$45
- **Caves, Chen & Johnsen (2019) The cleaner shrimp Lysmata amboinensis adjusts its behaviour towards predatory versus non-predatory clients. Biology Letters** (Tier 1) — https://pmc.ncbi.nlm.nih.gov/articles/PMC6769148/
  - Facts: lives in pairs at cleaning stations; simultaneous hermaphrodite; leg rocking more often toward predatory clients; predators cleaned less often
- **Vaughan, Grutter & Hutson (2018) Cleaner shrimp are a sustainable option to treat parasitic disease in farmed fish. Scientific Reports** (Tier 1) — https://www.nature.com/articles/s41598-018-32293-6
  - Facts: L. amboinensis removes fish parasites; reduces free-living parasite stages
- **Wikipedia — Lysmata amboinensis (summarising primary literature)** (Tier 3) — https://en.wikipedia.org/wiki/Lysmata_amboinensis
  - Facts: body 5–6 cm; rocking dance; starts male then becomes hermaphrodite; 200–500 eggs; larvae 14 stages over 5–6 months; difficult to culture
- **SeaLifeBase — Lysmata amboinensis** (Tier 1) — https://www.sealifebase.se/summary/Lysmata-amboinensis.html
  - Facts: Indo-Pacific; depth range; IUCN Not Evaluated
- Compatibility rules encoded: peacock_mantis_shrimp → incompatible (“Mantis shrimp hunt shrimp; a cleaner will be struck and eaten.”); dwarf_lionfish → high_risk (“Lionfish readily eat ornamental shrimp. Some cleaners survive by servicing the lionfish, but losses are common.”); miniatus_grouper → high_risk (“Wild groupers visit cleaning stations, but a hungry grouper in a tank often eats its cleaner.”)

### Blue-leg Hermit Crab — *Clibanarius tricolor*

- **LiveAquaria — Dwarf Blue Leg Hermit Crab** (Tier 2) — https://www.liveaquaria.com/product/623/?pcatid=623
  - Facts: max ~1 in; eats hair algae and cyanobacteria; may attack snails for their shell or food; keep in groups; 72–78 °F, SG 1.020–1.025; reef compatible
- **Tropical Fish Hobbyist — Clibanarius tricolor** (Tier 2) — https://www.tfhmagazine.com/articles/saltwater/clibanarius-tricolor
  - Facts: ~2.5 cm; fights other hermits for shells, loser damaged or killed; picks on live snails for shells; nocturnal feeders; 75–82 °F; 1–2 years in aquaria
- **Baeza & Behringer (2017) Small-scale spatial variation in reproductive parameters of the blue-legged hermit crab Clibanarius tricolor. PeerJ (PMC5314957)** (Tier 1) — https://pmc.ncbi.nlm.nih.gov/articles/PMC5314957/
  - Facts: Florida Keys intertidal to ~2 m; fecundity 184–614 embryos; larval development unknown
- **SeaLifeBase — Clibanarius tricolor** (Tier 1) — https://www.sealifebase.se/summary/Clibanarius-tricolor.html
  - Facts: western Atlantic/Caribbean; depth 0–3 m; IUCN Not Evaluated
- Compatibility rules encoded: tag:snail → conditional (“Blue-leg hermits may kill snails to take their shells, especially when spare empty shells or food run short. Adding spare shells reduces the risk.”); peacock_mantis_shrimp → incompatible (“Hermit crabs are favourite prey for smashing mantis shrimp — shells are no protection.”)

### Trochus Snail — *Trochus sp.*

- **LiveAquaria — Banded Trochus Snail** (Tier 2) — https://www.liveaquaria.com/product/564/?pcatid=564
  - Facts: eats film algae, cyanobacteria, diatoms; rights itself when knocked over (unlike Tectus); breeds easily in aquaria; not easily eaten by crabs; copper intolerant; 1 per 2–3 gal; 72–78 °F, SG 1.023–1.025
- **Bulk Reef Supply — How To Care For Trochus Snails** (Tier 2) — https://www.bulkreefsupply.com/content/post/how-to-care-for-trochus-snails
  - Facts: herbivore grazing glass, rock, sand; rights itself; spawns in aquaria; 75–80 °F, SG 1.023–1.026; avoid puffers
- **SeaLifeBase — Trochus histrio (Actor top)** (Tier 1) — https://www.sealifebase.se/summary/Trochus-histrio.html
  - Facts: max 5 cm shell height; intertidal and shallow sublittoral to 30 m, on rocks near reefs; western Pacific; archaeogastropods are gonochoric broadcast spawners with trochophore then veliger larvae; IUCN Not Evaluated
- **AlgaeBarn — Using the Trochus Snail** (Tier 3) — https://www.algaebarn.com/blog/clean-up-crew/utilizing-the-trochus-snail-trochus-spp/
  - Facts: captive-bred; larvae settle within the week they were spawned
- Compatibility rules encoded: hermit_crab → usually_compatible (“Blue-leg hermits sometimes kill snails for their shells, but the Trochus shell shape makes it a less tempting target. Spare shells reduce the risk further.”); peacock_mantis_shrimp → incompatible (“Smashing mantis shrimp crack snail shells with ease — snails are staple prey.”)

### Royal Gramma — *Gramma loreto*

- **FishBase — Gramma loreto (Royal gramma)** (Tier 1) — https://www.fishbase.se/summary/Gramma-loreto.html
  - Facts: max 8 cm TL; depth 1–60 m; 22–27 °C; caves and ledges, swims belly toward substrate; eats ectoparasites and plankton; male nest building and care; IUCN Least Concern (2011); reared in captivity
- **LiveAquaria — Royal Gramma Basslet** (Tier 2) — https://www.liveaquaria.com/product/53/?pcatid=53
  - Facts: min tank 30 gal; 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025; aggressive to its own kind — keep singly; caves and subdued lighting; meaty diet; price ~$33
- **CORAL Magazine — Quality Marine Offers Captive-Bred Royal Grammas (2016)** (Tier 2) — https://www.coralmagazine.com/2016/08/23/quality-marine-offers-captive-bred-royal-grammas/
  - Facts: BCMI (Australia) aquacultured royal grammas, 2016; first batches limited to public aquariums
- **The Biota Group — Royal Gramma Basslet (captive-bred)** (Tier 2) — https://shop.thebiotagroup.com/products/royal-gramm
  - Facts: captive-bred Gramma loreto sold to hobbyists; 30+ gal; captive-bred price $60–70

### Firefish — *Nemateleotris magnifica*

- **FishBase — Nemateleotris magnifica (Fire goby)** (Tier 1) — https://www.fishbase.se/summary/Nemateleotris-magnifica.html
  - Facts: max 9 cm TL; depth typically 6–28 m; 22–28 °C; hovers above bottom facing current, eats zooplankton; monogamous; IUCN Least Concern (2023)
- **LiveAquaria — Firefish** (Tier 2) — https://www.liveaquaria.com/product/168/?pcatid=168
  - Facts: min tank 20 gal; jumps when stressed — needs a lid; needs safety zones to dart into; aggressive only to own species; mated pairs peaceful; 72–78 °F, SG 1.020–1.025; price ~$40
- **Captive spawning and embryonic development of purple firefish Nemateleotris decora (Aquaculture 424, 2014)** (Tier 1) — https://www.sciencedirect.com/science/article/abs/pii/S0044848613006820
  - Facts: congener: 400–500 eggs per spawn; incubation 96 h at 28 °C; males guard eggs; larvae 1.9 mm

### Green Chromis — *Chromis viridis*

- **FishBase — Chromis viridis (Blue green damselfish)** (Tier 1) — https://www.fishbase.se/summary/Chromis-viridis.html
  - Facts: max 10 cm TL; depth 1–20 m; aggregations above branching Acropora; males nest; females spawn in turn; eggs hatch in 2–3 days; male guards and fans eggs; IUCN Least Concern (2021)
- **LiveAquaria — Green Reef Chromis** (Tier 2) — https://www.liveaquaria.com/product/115/?pcatid=115
  - Facts: min tank 30 gal; school of 6+; max 4 in; 72–78 °F, SG 1.020–1.025; multiple daily feedings; 8–15 years; price ~$12
- **Reef Builders — Rising Tide announces success with captive-bred Green Chromis (2013)** (Tier 2) — https://reefbuilders.com/2013/01/28/captive-bred-green-chromis/
  - Facts: reared on cultured copepods; only a couple dozen juveniles; number-one species collected for the hobby
- **Top Shelf Aquatics — Chromis Aggression Over Time** (Tier 3) — https://topshelfaquatics.com/blogs/news/chromis-aggression-over-time-explained
  - Facts: about 70% of groups collapse to one fish within 18 months; groups of 3 worst; 5–7 better; six-foot tanks reduce aggression; hierarchy forms at maturity

### Banggai Cardinalfish — *Pterapogon kauderni*

- **FishBase — Pterapogon kauderni (Banggai cardinalfish)** (Tier 1) — https://www.fishbase.se/summary/Pterapogon-kauderni.html
  - Facts: max 8.6 cm TL; depth 1–2 m; hover over urchins, retreat among spines; juveniles use anemones; male mouthbrooding, 8 mm young released; no planktonic stage; IUCN Endangered (2007)
- **NOAA Fisheries — Banggai Cardinalfish** (Tier 1) — https://www.fisheries.noaa.gov/species/banggai-cardinalfish
  - Facts: ESA Threatened (2016); up to 3.4 in; lifespan 2.5–3 years, up to 5; male mouthbrooding, fully formed juveniles; threats: ornamental trade and destructive fishing; individual bar patterns
- **Vagelli (1999) The reproductive biology and early ontogeny of the mouthbrooding Banggai cardinalfish. Environmental Biology of Fishes** (Tier 1) — https://link.springer.com/article/10.1023/A:1007514625811
  - Facts: clutch ~40 eggs, 3 mm; ~19 day oral incubation; released at 8 mm SL; no planktonic interval; 30 mm TL at four months
- **Top Shelf Aquatics — Captive-Bred Banggai Cardinalfish** (Tier 2) — https://topshelfaquatics.com/products/captive-bred-banggai-cardinalfish
  - Facts: captive-bred, ~$40; min 30 gal; adults territorial toward own species once pairs form; multiple pairs need 100+ gal; reef safe; 75–80 °F, SG 1.024–1.026

### Yellow Watchman Goby — *Cryptocentrus cinctus*

- **FishBase — Cryptocentrus cinctus (Yellow prawn-goby)** (Tier 1) — https://www.fishbase.se/summary/Cryptocentrus-cinctus.html
  - Facts: max 10 cm SL; sandy lagoons 1–25 m; 22–28 °C; yellow or whitish colour phases with 4–5 dusky bars; lives in burrows with alpheid shrimps; IUCN Least Concern (2020)
- **Aquatics Unlimited — Watchman Goby Gray/Yellow, captive bred** (Tier 2) — https://aquaticsunlimited.com/product/goby-tank-raised-watchman-gray-yellow-cryptocentrus-cinctus/
  - Facts: tank-raised yellow and grey forms; adult ~4 in; min 30 gal; 72–78 °F; pairs with tiger pistol shrimp Alpheus bellulus; lid recommended; price $45–60
- **Manera et al. (2025) Boat noise alters individual behaviors but not communication between partners in a fish–shrimp mutualism. Behavioral Ecology (PMC12527286)** (Tier 1) — https://pmc.ncbi.nlm.nih.gov/articles/PMC12527286/
  - Facts: shrimp excavate and maintain the shared burrow; goby acts as sentinel; tactile fin-flick warnings detected by shrimp antennae
- **Karplus (1979) The tactile communication between Cryptocentrus steinitzi and Alpheus purpurilenticularis. Z. Tierpsychologie** (Tier 1) — https://onlinelibrary.wiley.com/doi/10.1111/j.1439-0310.1979.tb00286.x
  - Facts: warning tail flicks transmitted via antenna contact; no warnings without contact

### Peppermint Shrimp — *Lysmata wurdemanni*

- **LiveAquaria — Peppermint Shrimp** (Tier 2) — https://www.liveaquaria.com/products/peppermint-shrimp
  - Facts: manages Aiptasia (individuals vary); scavenger; stock is L. boggessi / L. ankeri / L. wurdemanni / L. rafa; bred by commercial farms; 72–78 °F, SG 1.020–1.025; copper and nitrate intolerant; price ~$16
- **Rhyne, Lin & Deal (2004) Biological control of aquarium pest anemone Aiptasia pallida by peppermint shrimp Lysmata. J. Shellfish Research 23: 227–229** (Tier 1) — https://www.researchgate.net/publication/289254983_Biological_control_of_aquarium_pest_anemone_Aiptasia_pallida_Verrill_by_peppermint_shrimp_Lysmata_risso
  - Facts: Lysmata eat Aiptasia; consumption varies by variety/species; groups eat less per shrimp but tackle larger anemones
- **AlgaeBarn — Meet Lysmata boggessi: Peppermint Shrimp** (Tier 2) — https://www.algaebarn.com/blog/invertebrates/captive-bred-inverts/peppermint-shrimp/
  - Facts: L. boggessi the reliable Aiptasia eater; captive-bred available; may steal food from LPS corals; ignore Aiptasia when overfed
- Compatibility rules encoded: peacock_mantis_shrimp → incompatible (“Mantis shrimp hunt shrimp; peppermints will be eaten.”); dwarf_lionfish → high_risk (“Lionfish eat small ornamental shrimp that fit in their mouths.”)

### Yellow Clown Goby — *Gobiodon okinawae*

- **FishBase — Gobiodon okinawae (Okinawa goby)** (Tier 1) — https://www.fishbase.se/summary/Gobiodon-okinawae.html
  - Facts: max 3.5 cm TL; depth 2–15 m; coral-commensal among staghorn Acropora; aggregations of 5–15; IUCN Least Concern (2018)
- **LiveAquaria — Clown Goby, Yellow** (Tier 2) — https://www.liveaquaria.com/product/1441/?pcatid=1441
  - Facts: min 10 gal; max 1.5 in; may nip small SPS polyps; eggs under coral branch cause tissue recession; keep singly — fights own kind in small tanks; 72–78 °F, SG 1.020–1.025; price ~$25
- **The Biota Group — Yellow Clown Goby (captive-bred)** (Tier 2) — https://shop.thebiotagroup.com/products/yellow-clown-goby
  - Facts: captive-bred; social, more active in small groups; may nip Acropora polyps if underfed; small colonies at higher risk; price ~$90
- **Gratzer et al. (2015) Skin toxins in coral-associated Gobiodon species affect predator preference and prey survival. Marine Ecology (PMC4459215)** (Tier 1) — https://pmc.ncbi.nlm.nih.gov/articles/PMC4459215
  - Facts: toxic skin mucus deters predators; captured gobies expelled alive; strong Acropora association; bi-directional sex change

### Yellow Tang — *Zebrasoma flavescens*

- **FishBase — Zebrasoma flavescens (Yellow tang)** (Tier 1) — https://www.fishbase.se/summary/Zebrasoma-flavescens.html
  - Facts: max 20 cm TL; depth 2–46 m; 24–28 °C; browses filamentous algae; singly or loose groups; lunar spawning; IUCN Least Concern (2010); top Hawaiian marine export
- **Animal Diversity Web — Zebrasoma flavescens** (Tier 1) — https://animaldiversity.org/accounts/Zebrasoma_flavescens/
  - Facts: up to 30 years wild, ~10 in captivity; ~40,000 eggs per spawn; larvae settle after ~10 weeks; night colour: darker with white lateral line; scalpel-like caudal spine
- **Claisse et al. (2009) Habitat- and sex-specific life history patterns of yellow tang in Hawaii. Marine Ecology Progress Series 389: 245–255** (Tier 1) — https://www.int-res.com/abstracts/meps/v389/p245-255
  - Facts: oldest wild fish aged 41 years; otolith annuli validated
- **LiveAquaria — Yellow Tang, Hawaii** (Tier 2) — https://www.liveaquaria.com/product/6746/?pcatid=6746
  - Facts: min tank 100 gal; max 8 in; semi-aggressive; aggressive toward its own species and tangs in general; active swimmer in near-constant motion; seaweed 3× weekly; reef compatible
- **LiveAquaria — Yellow Tangs remain a great choice (species spotlight)** (Tier 2) — https://www.liveaquaria.com/blogs/species-spotlight/yellow-tangs-remain-a-great-choice-for-your-marine-aquarium
  - Facts: min 100 gal; add last; captive-bred via Biota and the Oceanic Institute of Hawaii; Hawaiian collection restrictions
- **Top Shelf Aquatics — Captive-Bred Yellow Tang** (Tier 2) — https://topshelfaquatics.com/products/captive-bred-yellow-tang
  - Facts: captive-bred ~$330; min 100 gal, 100–150 preferred; territorial toward other surgeonfish; 75–80 °F, SG 1.024–1.026
- **Honolulu Civil Beat — Aquarium Fishing Could Return To Hawaiʻi Under Proposed New Rules (Oct 2025)** (Tier 2) — https://www.civilbeat.org/2025/10/aquarium-fishing-could-return-to-hawai%CA%BBi-under-proposed-new-rules/
  - Facts: collection largely halted since a 2017 court ruling; 2025 draft rules would allow quotas for yellow and kole tang
- Compatibility rules encoded: kole_tang → conditional (“Tangs fight other tangs. A yellow and a kole tang can share a very large tank (180+ gal) if added together with plenty of rockwork to break sight lines.”); foxface_rabbitfish → usually_compatible (“Another yellow, disc-shaped herbivore: expect some chasing at first, but they usually settle in a large tank.”)

### Kole Bristletooth Tang — *Ctenochaetus strigosus*

- **FishBase — Ctenochaetus strigosus** (Tier 1) — https://www.fishbase.se/summary/Ctenochaetus-strigosus.html
  - Facts: max 15.4 cm SL; depth 1–113 m; 21–27 °C; endemic to Hawaii and Johnston Island; combs detritus with comb-like teeth; solitary, spawns in pairs; IUCN Least Concern (2010)
- **LiveAquaria — Kole Yellow Eye Tang** (Tier 2) — https://www.liveaquaria.com/product/345/?pcatid=345
  - Facts: min tank 70 gal; max 7 in; semi-aggressive; aggressive toward other tangs — one per tank; eats detritus and film algae; juveniles yellow-gold, adults brown with blue/burgundy hue; 72–78 °F, SG 1.020–1.025; price ~$93
- **Honolulu Civil Beat — Aquarium Fishing Could Return To Hawaiʻi Under Proposed New Rules (Oct 2025)** (Tier 2) — https://www.civilbeat.org/2025/10/aquarium-fishing-could-return-to-hawai%CA%BBi-under-proposed-new-rules/
  - Facts: collection largely halted since 2017; draft rules include kole tang quotas
- Compatibility rules encoded: yellow_tang → conditional (“Tangs fight other tangs. A kole and a yellow tang can share a very large tank (180+ gal) if added together with rockwork breaking sight lines.”)

### Coral Beauty Angelfish — *Centropyge bispinosa*

- **FishBase — Centropyge bispinosa (Twospined angelfish)** (Tier 1) — https://www.fishbase.se/summary/Centropyge-bispinosa.html
  - Facts: max 11.5 cm TL; depth 0–60 m; harems of 3–7; feeds on algae; secretive; IUCN Least Concern (2009)
- **LiveAquaria — Coral Beauty Angelfish** (Tier 2) — https://www.liveaquaria.com/products/coral-beauty-angelfish
  - Facts: min tank 70 gal; reef compatible with caution; prone to nip stony and soft corals; semi-aggressive; 72–78 °F, SG 1.020–1.025; price ~$60
- **ORA — Coral Beauty Angelfish (captive-bred)** (Tier 2) — https://www.orafarm.com/product/coral-beauty-angelfish/
  - Facts: captive-bred "high orange" variant; known to nip corals and clams — add to reefs with caution; max ~4 in; easy to feed
- **Sakai et al. (2003) Sexually dichromatic protogynous angelfish Centropyge ferrugata males can change back to females. Zoological Science 20: 627–633** (Tier 1) — https://pubmed.ncbi.nlm.nih.gov/12777833/
  - Facts: Centropyge are protogynous and haremic; largest female changes sex when the male disappears; males can reverse sex change

### Foxface Rabbitfish — *Siganus vulpinus*

- **FishBase — Siganus vulpinus (Foxface)** (Tier 1) — https://www.fishbase.se/summary/Siganus-vulpinus.html
  - Facts: max 25 cm SL, common 20 cm TL; depth 1–30 m; coral-rich reefs, often among staghorn coral; singly or pairs; juveniles school; feeds on algae; stout venomous spines; IUCN Least Concern (2015)
- **LiveAquaria — Foxface Lo** (Tier 2) — https://www.liveaquaria.com/product/687/?pcatid=687
  - Facts: min tank 125 gal; max 9 in; reef compatible with caution — may nip LPS and soft corals if underfed; venomous dorsal spines; eats undesirable algae; peaceful except with other rabbitfish; price ~$110
- **Wikipedia — Foxface rabbitfish (summarising FishBase and Australian Museum)** (Tier 3) — https://en.wikipedia.org/wiki/Foxface_rabbitfish
  - Facts: changes to dark brown when threatened; duller mottled pattern at night or under stress; rabbitfish venom similar to stonefish venom
- Compatibility rules encoded: yellow_tang → usually_compatible (“Two yellow, disc-shaped herbivores may chase each other at first, but usually settle in a large tank.”)

### Mandarin Dragonet — *Synchiropus splendidus*

- **FishBase — Synchiropus splendidus (Mandarinfish)** (Tier 1) — https://www.fishbase.se/summary/Synchiropus-splendidus.html
  - Facts: max 7 cm TL; depth 1–18 m; silty lagoons, coral rubble; pairs ascend to spawn; rare red individuals; IUCN Least Concern (2018); reared in captivity
- **Animal Diversity Web — Synchiropus splendidus** (Tier 1) — https://animaldiversity.org/accounts/Synchiropus_splendidus/
  - Facts: 24–26 °C; pair rises ~1 m to spawn; eggs hatch in ~12 h; eats amphipods, isopods, worms; toxic smelly mucus; wild 10–15 yr, captive often 2–4 yr
- **ORA — Blue Mandarin (captive-bred)** (Tier 2) — https://www.orafarm.com/product/blue-mandarin/
  - Facts: captive-bred accept frozen and dry foods; established reef best; singly or mated pairs; max 4 in
- **ORA — Red Mandarin (captive-bred)** (Tier 2) — https://www.orafarm.com/product/red-mandarin/
  - Facts: rare red colour variation of S. splendidus; red body and red pelvic/pectoral fins
- **LiveAquaria — Green Mandarin** (Tier 2) — https://www.liveaquaria.com/product/551/?pcatid=551
  - Facts: well-established 30+ gal with live rock and sand; aggressive only to other mandarins; live foods for wild fish; price ~$50
- **Wikipedia — Synchiropus splendidus** (Tier 3) — https://en.wikipedia.org/wiki/Synchiropus_splendidus
  - Facts: one of only two vertebrates known to be blue from cellular pigment (cyanophores); males have an exceptionally tall dorsal fin; smelly, bitter slime instead of scales; some wild fish refuse all but live pods
- **Top Shelf Aquatics — Mandarin and Dragonet Care Guide: Pods, Feeding and Mature Tank Requirements** (Tier 3) — https://topshelfaquatics.com/blogs/news/mandarin-and-dragonet-care-guide-pods-feeding-and-mature-tank-requirements
  - Facts: tank established 6+ months (ideally 9–12); 1–1.5 lb live rock per gallon; hundreds of pods a day; males fight; pairs in 75+ gal; captive-bred accept frozen
- Compatibility rules encoded: mandarin_dragonet → conditional (“Two male mandarins fight, and every mandarin competes for the same copepods. Only a male–female pair in a large, pod-rich tank works.”); green_chromis → usually_compatible (“Chromis are fast feeders that eat most frozen food before a mandarin notices it; the mandarin relies on copepods.”)

### Peacock Mantis Shrimp — *Odontodactylus scyllarus*

- **Monterey Bay Aquarium — Peacock Mantis Shrimp** (Tier 1) — https://www.montereybayaquarium.org/animals/animals-a-to-z/peacock-mantis-shrimp
  - Facts: 1–7 in; Indian and Pacific Oceans; territorial and solitary; burrows audibly in rock and seabed; strikes comparable to a .22 bullet; colour discrimination actually low
- **National Aquarium — Peacock Mantis Shrimp** (Tier 1) — https://aqua.org/explore/animals/peacock-mantis-shrimp
  - Facts: 2–7 in; eats gastropods, crabs and mollusks, prey larger than itself; strike 50× faster than a blink; at least 12 photoreceptor types; not threatened
- **Patek & Caldwell (2005) Extreme impact and cavitation forces of a biological hammer: strike forces of the peacock mantis shrimp. J. Exp. Biol. 208: 3655** (Tier 1) — https://journals.biologists.com/jeb/article/208/19/3655/15838/Extreme-impact-and-cavitation-forces-of-a
  - Facts: impact forces 400–1,501 N; cavitation forces up to 504 N; two force peaks per strike
- **Patek, Korff & Caldwell (2004) Deadly strike mechanism of a mantis shrimp. Nature 428: 819–820** (Tier 1) — https://scholars.duke.edu/publication/953838
  - Facts: saddle-shaped exoskeletal spring stores strike energy; cavitation bubbles form at the club
- **LiveAquaria — Clown Mantis Shrimp (Odontodactylus scyllarus)** (Tier 2) — https://www.liveaquaria.com/products/clown-mantis-shrimp
  - Facts: species aquarium, housed alone; not reef compatible; sandy bottom with rubble for a cave; max 6 in; 72–78 °F, SG 1.023–1.025; price ~$130
- **Bulk Reef Supply — How to Set Up a Mantis Shrimp Tank** (Tier 2) — https://www.bulkreefsupply.com/content/post/md-2020-12-how-to-set-up-a-mantis-shrimp-tank
  - Facts: 10 gal minimum for one peacock; documented breaking glass, rarely targets walls; deep mixed-grain substrate and rubble; should not be kept with other animals
- **Shrimp and Snail Breeder — Peacock Mantis Shrimp as a Pet** (Tier 3) — https://aquariumbreeder.com/mantis-shrimp-as-an-aquarium-pet-care-guide/
  - Facts: acrylic preferred; smashers can chip glass; female carries eggs ~5–6 weeks; 22–26 °C; lifespan several years
- Compatibility rules encoded: tag:snail → incompatible (“Peacock mantis shrimp smash snails open — exactly what their clubs evolved for.”); tag:crustacean → incompatible (“Crabs, hermit crabs and shrimp are staple prey; shells offer no protection.”); tag:fish_small → incompatible (“Small fish that rest near the rockwork are ambushed and killed.”); tag:fish_benthic → incompatible (“Bottom-resting fish such as gobies and dragonets are easy targets for a burrowing mantis.”); tag:fish_medium → high_risk (“Mid-sized fish can be struck at night or when they come too close to the burrow. A mantis is best kept alone.”); tag:fish_large → high_risk (“Too big to eat, but large fish may harass the mantis or be struck by it. This is a species-only animal.”)

### Fuzzy Dwarf Lionfish — *Dendrochirus brachypterus*

- **FishBase — Dendrochirus brachypterus (Dwarf lionfish)** (Tier 1) — https://www.fishbase.se/summary/Dendrochirus-brachypterus.html
  - Facts: max 17 cm TL; depth 2–80 m; nocturnal hunter of small crustaceans; juveniles in small aggregations; venomous; distinct pairing; IUCN Least Concern (2015)
- **LiveAquaria — Fuzzy Dwarf Lionfish (Shortfin Lionfish)** (Tier 2) — https://www.liveaquaria.com/product/227/?pcatid=227
  - Facts: min tank 50 gal; max 7 in; venomous spines; reef compatible with caution; eats live shrimp, ornamental shrimp and fish; may need live feeders at first; recognises owner; price ~$85
- **LiveAquaria — The Fuzzy Dwarf Lionfish: A Gorgeous Showstopper (species spotlight)** (Tier 2) — https://www.liveaquaria.com/blogs/species-spotlight/the-fuzzy-dwarf-lionfish
  - Facts: live feeder shrimp help new fish start eating; low metabolism: target feed every other day; stings: soak in hot water for at least 30 minutes; avoid fin-nipping tank mates; min 50 gal, up to 7 in; recognises its keeper
- **NOAA National Ocean Service — What is a lionfish?** (Tier 1) — https://oceanservice.noaa.gov/facts/lionfish-facts.html
  - Facts: invasive Atlantic lionfish are Indo-Pacific natives; possibly released aquarium pets; venomous sting causes extreme pain
- **Chou, Liu & Liao (2023) Systematics of lionfishes (Scorpaenidae: Pteroini) using molecular and morphological data. Frontiers in Marine Science 10** (Tier 1) — https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2023.1109655/full
  - Facts: new genus Neochirus erected with D. brachypterus as type species
- Compatibility rules encoded: tag:fish_tiny → incompatible (“Lionfish swallow any fish that fits in their mouth.”); tag:fish_small → incompatible (“Small fish are prey: a dwarf lionfish will herd and swallow them.”); tag:shrimp_large → high_risk (“Ornamental shrimp such as cleaners and peppermints are favourite prey.”); tag:fish_benthic → high_risk (“Small bottom-resting fish such as gobies and dragonets are easy to ambush.”)

### Miniatus Grouper — *Cephalopholis miniata*

- **FishBase — Cephalopholis miniata (Coral hind)** (Tier 1) — https://www.fishbase.se/summary/Cephalopholis-miniata.html
  - Facts: max 50 cm TL; depth 2–150 m; ~80% of diet small fish (mainly Pseudanthias), rest crustaceans; harems of a male and 2–12 females; territories up to 475 m²; IUCN Least Concern (2017/2018 assessment); high fishing and climate vulnerability
- **LiveAquaria — Miniatus Grouper** (Tier 2) — https://www.liveaquaria.com/products/miniatus-grouper
  - Facts: min tank 180 gal; max 14 in in aquaria (18 in wild); aggressive; reef compatible with caution; not to be trusted with invertebrates or small fish; price ~$150
- **Wikipedia — Cephalopholis miniata (citing IUCN, FishBase, FAO)** (Tier 3) — https://en.wikipedia.org/wiki/Cephalopholis_miniata
  - Facts: protogynous hermaphrodite; juveniles orange-yellow with fewer spots; ambushes sea goldies from below; popular in public aquaria
- Compatibility rules encoded: tag:fish_tiny → incompatible (“Tiny fish are swallowed whole.”); tag:fish_small → incompatible (“A miniatus grouper will ambush and eat small fish.”); tag:fish_medium → high_risk (“A grown miniatus has a huge mouth: only fish too large to swallow are safe, and most community reef fish are not.”); tag:shrimp_large → high_risk (“Cleaner and peppermint shrimp are eaten; the grouper cannot be trusted with invertebrates.”); tag:crustacean → high_risk (“Crustaceans such as crabs and shrimp make up most of the rest of its natural diet.”); dwarf_lionfish → conditional (“A full-grown miniatus can try to swallow a dwarf lionfish despite its spines; keep only if the lionfish is large relative to the grouper.”)

### Emperor Angelfish — *Pomacanthus imperator*

- **FishBase — Pomacanthus imperator (Emperor angelfish)** (Tier 1) — https://www.fishbase.se/summary/Pomacanthus-imperator.html
  - Facts: 40 cm SL; depth 1–100 m; sponges and tunicates; pairs; 14 years reported; IUCN Least Concern (2009); juvenile white dorsal margin
- **Fishes of Australia — Pomacanthus imperator** (Tier 1) — https://fishesofaustralia.net.au/Home/species/653
  - Facts: 38 cm TL; juveniles under ledges on patch reefs, adults at caves
- **Australian Museum — Emperor Angelfish** (Tier 1) — https://australian.museum/learn/animals/fishes/emperor-angelfish-pomacanthus-imperator/
  - Facts: 38 cm; blue with yellow stripes; juvenile concentric rings
- **Oregon Coast Aquarium — Emperor angelfish** (Tier 1) — https://aquarium.org/?p=22368
  - Facts: protogynous; colour change at 8–12 cm; dusk spawning, planktonic eggs
- **LiveAquaria — Emperor Angelfish** (Tier 2) — https://www.liveaquaria.com/product/411/?pcatid=411
  - Facts: 220 gal; 72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12; semi-aggressive; reef with caution: nips corals and clams; from ~$162 juvenile
- **Quality Marine — Emperor Angelfish** (Tier 2) — https://www.qualitymarine.com/news/emperor-angelfish/
  - Facts: adults attack their own kind and large angels; drumming; transition: rings break into stripes; at least 15 years; HLLE prone
- **Reef Builders (2023) — Captive bred emperor angelfish are now available** (Tier 2) — https://reefbuilders.com/2023/06/15/captive-bred-emperor-angelfish-are-now-available/
  - Facts: Bali Aquarich, sold by Biota since June 2023; pellet-trained; $225
- Compatibility rules encoded: coral_beauty → conditional (“A big angel bullies smaller angelfish, especially ones added after it. Add the dwarf angel first, in a very large tank.”); tag:clam → high_risk (“Picks at clam mantles until the clam dies.”); lined_seahorse → high_risk (“A large, bold feeder that outcompetes and may pick at slow seahorses.”)

### Sailfin Tang — *Zebrasoma velifer*

- **FishBase — Zebrasoma velifer (Sailfin tang)** (Tier 1) — https://www.fishbase.se/summary/Zebrasoma-veliferum.html
  - Facts: 40 cm SL; depth 0–45 m; leafy and turf algae; solitary or in pairs; tmax 27 years; IUCN Least Concern (2010); juveniles yellow with dark bars
- **WoRMS — Zebrasoma velifer (Bloch, 1795)** (Tier 1) — https://www.marinespecies.org/aphia.php?p=taxdetails&id=712902
  - Facts: velifer is the accepted spelling; veliferum unaccepted
- **FAO Species Identification Guide, Western Central Pacific vol. 6 — Acanthuridae (Randall)** (Tier 1) — https://www.fao.org/4/y0870e/y0870e30.pdf
  - Facts: body depth 1.8–2× in SL; dorsal fin extremely elevated; bar and line pattern; blue patch around the tail spine; Z. desjardinii differs in colour and fin-ray counts
- **LiveAquaria — Sailfin Tang** (Tier 2) — https://www.liveaquaria.com/product/379/?pcatid=379
  - Facts: 180 gal; 72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12; aggressive to its own kind; seaweed at least three times a week; price ~$80
- **Reef Builders (2015) — Speciation, biogeography and hybridisation in Zebrasoma** (Tier 2) — https://reefbuilders.com/2015/06/29/speciation-biogeography-hybridization-zebrasoma/
  - Facts: trade sailfins mostly from Indonesia and the Philippines; Z. desjardinii the Indian Ocean sister species; yellow fades with age
- Compatibility rules encoded: tag:tang → conditional (“Tangs fight other tangs, Zebrasoma above all. Two can share only a very large tank, added together, with rock breaking sight lines.”)

### Chocolate Tang — *Acanthurus pyroferus*

- **FishBase — Acanthurus pyroferus (Mimic surgeonfish)** (Tier 1) — https://www.fishbase.se/summary/Acanthurus-pyroferus.html
  - Facts: 29 cm TL; depth 0–60 m; base of reefs, usually alone; juveniles mimic Centropyge; IUCN Least Concern (2010)
- **FAO Species Identification Guide, Western Central Pacific vol. 6 — Acanthuridae (Randall)** (Tier 1) — https://www.fao.org/4/y0870e/y0870e30.pdf
  - Facts: ~25 cm TL; filamentous algae; orange patch over the pectoral, black gill band, white chin band; yellow tail border; four juvenile mimic phases; caudal rounded in young, lunate in adults
- **Eagle & Jones (2004) Mimicry in coral reef fishes: ecological and behavioural responses of a mimic to its model. J. Zool. 264:33–43** (Tier 1) — https://researchonline.jcu.edu.au/6757/
  - Facts: juveniles stay within 1–2 m of the model; change when they outgrow the model; fed more near the model
- **LiveAquaria — Lemon Tang (Acanthurus pyroferus)** (Tier 2) — https://www.liveaquaria.com/product/763/?pcatid=763
  - Facts: 180 gal; 72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12; aggressive to other tangs and look-alikes; reef compatible; price ~$119
- **Top Shelf Aquatics — Chocolate / Yellow Mimic Tang (Fiji)** (Tier 2) — https://topshelfaquatics.com/products/chocolate-yellow-mimic-tang-fiji
  - Facts: 125 gal; 7–10 in in aquaria; moderate care; from ~$90
- Compatibility rules encoded: tag:tang → conditional (“Tangs fight other tangs. Two can share only a very large tank, added together, with rock breaking sight lines.”); coral_beauty → conditional (“Attacks fish of its own shape and colour, and young chocolate tangs copy dwarf angelfish.”)

### Lyretail Anthias — *Pseudanthias squamipinnis*

- **FishBase — Pseudanthias squamipinnis (Sea goldie)** (Tier 1) — https://www.fishbase.se/summary/Pseudanthias-squamipinnis.html
  - Facts: males 15 cm, females 7 cm TL; depth 0–55 m; 22–28 °C; zooplankton feeder; protogynous; IUCN Least Concern (2015)
- **FishBase — Reproduction of Pseudanthias squamipinnis** (Tier 1) — https://fishbase.se/Reproduction/6568
  - Facts: sex change at ~5 cm; dominant female changes in 2–4 weeks when the male is removed; all-female groups 170–280 days; pelagic batch spawner, no care
- **Fishes of Australia — Pseudanthias squamipinnis** (Tier 1) — https://fishesofaustralia.net.au/home/species/4402
  - Facts: females golden orange with violet streak eye to pectoral; males purplish pink, red pectoral patch, blue anal fin; juveniles start female
- **LiveAquaria — Lyretail Anthias** (Tier 2) — https://www.liveaquaria.com/product/54/?pcatid=54
  - Facts: 125 gal; 72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12; semi-aggressive; one male per tank; feed mysis, brine and flake through the day; price ~$45–70
- **That Pet Place — Lyretail Anthias** (Tier 2) — https://www.thatpetplace.com/Pseudanthias-squamipinnis-lyretail-anthias-239115
  - Facts: one male to six or more females; several feedings a day; reef safe
- Compatibility rules encoded: lined_seahorse → high_risk (“Anthias snatch food from the water long before a slow seahorse can reach it.”)

### Melanurus Wrasse — *Halichoeres melanurus*

- **FishBase — Halichoeres melanurus (Tail-spot wrasse)** (Tier 1) — https://www.fishbase.se/summary/Halichoeres-melanurus.html
  - Facts: 14 cm TL; depth 1–15 m; eats polychaetes, copepods, isopods and forams; alone or in small groups; IUCN Least Concern (2008)
- **Fishes of Australia — Halichoeres melanurus** (Tier 1) — https://fishesofaustralia.net.au/home/species/235
  - Facts: 11 cm TL; female stripes and eyespots; male mauve with green-blue stripes and blue bars; black scales behind the pectoral
- **University of Florida (World Aquaculture Society abstract) — larviculture of Halichoeres melanurus** (Tier 1) — https://www.was.org/MeetingAbstracts/ShowAbstract/42634
  - Facts: pelagic eggs ~660 µm; spawns at sunset; settlement 22 days post-hatch; front dorsal spot fades first in sex change
- **Tropical Fish Hobbyist — Halichoeres melanurus** (Tier 2) — https://tfhmagazine.com/articles/saltwater/halichoeres-melanurus
  - Facts: very hardy; sleeps buried in sand; at least 3 in of fine sand; protogynous harem; female turns male within weeks; eats pest flatworms and snails
- **LiveAquaria — Melanurus Wrasse** (Tier 2) — https://www.liveaquaria.com/product/2285/
  - Facts: 50 gal; peaceful; eats fireworms, pyramid snails and flatworms; may eat feather dusters, tube worms and shrimp; 2–3 in of sand; jumps; price ~$52
- Compatibility rules encoded: tag:shrimp_dwarf → conditional (“Picks off small ornamental shrimp (sexy shrimp, dwarf shrimp) and their young.”); lined_seahorse → conditional (“A fast, busy feeder that gets to food before a seahorse; workable only with target feeding.”)

### Maroon Clownfish — *Amphiprion biaculeatus*

- **FishBase — Amphiprion biaculeatus (Spinecheek anemonefish)** (Tier 1) — https://www.fishbase.se/summary/Amphiprion-biaculeatus.html
  - Facts: max 17 cm TL; depth 1–16 m; hosts Entacmaea quadricolor; adhesive eggs, male guards; zooplankton and benthic algae; IUCN Least Concern (2021)
- **WoRMS — Amphiprion biaculeatus (Bloch, 1790)** (Tier 1) — https://www.marinespecies.org/aphia.php?p=taxdetails&id=1605249
  - Facts: accepted name; Premnas biaculeatus unaccepted; Premnas epigrammata a synonym
- **Fishes of Australia — Amphiprion biaculeatus** (Tier 1) — https://fishesofaustralia.net.au/home/species/378
  - Facts: 16 cm TL; females 2–3× the size of males; three narrow white bars; cheek spine crosses the head bar; protandrous hierarchy
- **LiveAquaria — Maroon Clownfish** (Tier 2) — https://www.liveaquaria.com/product/105/?pcatid=105
  - Facts: 30 gal minimum; 72–78 °F, SG 1.020–1.025, dKH 8–12; keep one or a pair; reef compatible; cheek spines catch in nets; price ~$40
- **ORA — Gold Stripe Maroon Clownfish** (Tier 2) — https://www.orafarm.com/product/gold-stripe-maroon-clownfish/
  - Facts: Sumatran broodstock; bars white when young, gold at 9–12 months; ~1,500 eggs per spawn, >6,000 recorded; the female guards the nest
- **CORAL Magazine — Pedersen (2016) on maroon clownfish lines** (Tier 2) — https://coralmagazine.com/?p=1490714
  - Facts: Goldflake 2007 (Sustainable Aquatics), ORA 2012; Gold Nugget × Gold Nugget gives only Nuggets; hypothesis: one copy Goldflake, two copies Gold Nugget
- **CORAL Magazine (2014) — Lightning Maroon updates** (Tier 2) — https://www.coralmagazine.com/2014/06/24/lightning-maroon-updates/
  - Facts: wild mutation from Fisherman Island, PNG; Lightning × normal gave ~50% Lightning twice; not sex-linked
- Compatibility rules encoded: ocellaris_clownfish → high_risk (“A maroon female attacks other clownfish, and an ocellaris is half her size. Keep one clownfish species per tank.”); lined_seahorse → high_risk (“A big, territorial, fast-feeding clownfish harasses slow seahorses and takes their food.”)

### Elegant Starfish — *Fromia milleporella*

- **WoRMS — Fromia milleporella (Lamarck, 1816)** (Tier 1) — https://www.marinespecies.org/aphia.php?p=taxdetails&id=213299
  - Facts: accepted name; Goniasteridae; Indo-Pacific; 0–30 m
- **Nausicaá — Harlequin shrimp** (Tier 1) — https://nausicaa.fr/en/my-visit/animals/harlequin-shrimp
  - Facts: harlequin shrimp eat Fromia
- **TFH Magazine (Fenner) — Marbled or tile sea stars** (Tier 2) — https://tfhmagazine.com/articles/saltwater/marbled-or-tile-sea-stars
  - Facts: 100 gal, running 6+ months; mostly detritivores; drip-acclimate 1 h+; most sea stars survive under a month; Fromia sturdier; arm-tip discharge normal; hold at the dealer a week
- **LiveAquaria — Red Sea Star (Fromia milleporella)** (Tier 2) — https://www.liveaquaria.com/product/578/
  - Facts: 72–78 °F, pH 8.1–8.4, SG 1.023–1.025, dKH 8–12; very intolerant of sudden changes; no copper; Red & Black form; extremely difficult to breed; price ~$24
- **Quality Marine — Red Fromia** (Tier 2) — https://www.qualitymarine.com/quality-marine/invertebrates/stars/fromia/red-fromia-59026
  - Facts: algal film and detritus diet; shrimp, krill or pellet supplements; regenerates arms; wild-collected
- Compatibility rules encoded: tag:crustacean → usually_compatible (“Large crabs and hermits can pick at and pull apart a sea star.”)

### Fighting Conch — *Strombus pugilis*

- **WoRMS — Strombus pugilis Linnaeus, 1758 (S. alatus a synonym)** (Tier 1) — https://www.marinespecies.org/aphia.php?p=taxdetails&id=419695
  - Facts: accepted name; S. alatus a junior synonym (Irwin et al. 2024)
- **SeaLifeBase — Strombus alatus** (Tier 1) — https://sealifebase.se/summary/Strombus-alatus
  - Facts: max 11.2 cm; depth 0–183 m; leaps with a sickle-shaped operculum; IUCN not evaluated
- **Davis & Cantillo Villa (2019) — conch aquaculture, World Aquaculture** (Tier 1) — https://www.was.org/Magazine/2019/04/33/
  - Facts: 7–10 cm; internal fertilisation, sperm storage; egg strings; veligers settle ~21 days; Harbor Branch produced 50,000–100,000 a year
- **LiveAquaria — Florida Fighting Conch** (Tier 2) — https://www.liveaquaria.com/product/2174/
  - Facts: easy care; 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.023–1.025; needs an open sand bed; sensitive to nitrate; price ~$30
- **Top Shelf Aquatics — Fighting Conch** (Tier 2) — https://topshelfaquatics.com/pages/saltwater-invertebrates/fighting-conch
  - Facts: buries leaving the eyes showing; 2–3 in of sand; bulldozes frags; hermits, triggers, puffers and wrasses are threats
- Compatibility rules encoded: tag:hermit_crab → usually_compatible (“Large hermits can kill a conch for its shell; small reef hermits are little risk to an adult.”)

### Scarlet Reef Hermit Crab — *Paguristes cadenati*

- **WoRMS — Paguristes cadenati Forest, 1954** (Tier 1) — https://www.marinespecies.org/aphia.php?p=taxdetails&id=368215
  - Facts: accepted name; Diogenidae; coral reefs and hard bottoms
- **Oregon Coast Aquarium — Red reef hermit crab** (Tier 1) — https://aquarium.org/animals/red-reef-hermit-crab/
  - Facts: detritus scavenger; IUCN not evaluated; 1985 Barbados stamp
- **Naturalis Caribbean diving — Paguristes cadenati** (Tier 1) — https://caribbean-diving.linnaeus.naturalis.nl/linnaeus_ng/app/views/species/taxon.php?id=6428
  - Facts: red legs, yellow eyestalks; ~3 cm
- **LiveAquaria — Scarlet Reef Hermit Crab** (Tier 2) — https://www.liveaquaria.com/product/620/
  - Facts: 1.5 in max; 72–78 °F, pH 8.1–8.4, SG 1.020–1.025; eats hair and slime algae and cyanobacteria; needs spare shells; reef safe
- **Top Shelf Aquatics — Scarlet Red Hermit Crab** (Tier 2) — https://topshelfaquatics.com/pages/saltwater-invertebrates/scarlett-red-hermit-crab
  - Facts: rarely bothers snails if shells are scarce it may; prefers light oval shells; hides to molt; may irritate LPS
- Compatibility rules encoded: tag:snail → usually_compatible (“May take a living snail’s shell when spare empty shells run out; with shells on hand it rarely bothers snails.”); peacock_mantis_shrimp → incompatible (“Hermit crabs are favourite prey for smashing mantis shrimp — the shell is no protection.”)

### Mexican Turbo Snail — *Turbo fluctuosus*

- **WoRMS — Turbo fluctuosus W. Wood, 1828** (Tier 1) — https://www.marinespecies.org/aphia.php?p=taxdetails&id=413380
  - Facts: accepted name; Turbo fluctuosa an incorrect spelling
- **Galland, Hastings & Leichter (2019) Thermal variability on Gulf of California reefs. Sci. Rep. 9:18022** (Tier 1) — https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6889390/fullTextXML
  - Facts: 14.1–32.1 °C at 5 m over a year; site means 20.9–25.3 °C
- **LiveAquaria — Mexican Turbo Snail** (Tier 2) — https://www.liveaquaria.com/product/571/
  - Facts: up to 2 in; 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.023–1.025; fond of hair algae; knocks over unsecured frags; no collection July–September
- **Top Shelf Aquatics — Mexican Turbo Snail** (Tier 2) — https://topshelfaquatics.com/pages/saltwater-invertebrates/mexican-turbo-snail
  - Facts: 24–26 °C; grazes at night; threats: wrasses, puffers, triggers, hawkfish, crabs, hermits
- Compatibility rules encoded: peacock_mantis_shrimp → incompatible (“Mantis shrimp smash snails, even a heavy turban.”)

### Nassarius Snail — *Phrontis vibex*

- **WoRMS — Phrontis vibex (Say, 1822)** (Tier 1) — https://www.marinespecies.org/aphia.php?p=taxdetails&id=877061
  - Facts: accepted name; Nassarius vibex unaccepted (Galindo et al. 2016)
- **Animal Diversity Web — Nassarius vibex** (Tier 1) — https://animaldiversity.org/accounts/Nassarius_vibex/
  - Facts: Cape Cod to Brazil; 10–20 mm; eats carrion; usually buried; several years
- **Bailey-Matthews National Shell Museum — Phrontis vibex** (Tier 1) — https://shells.shellmuseum.org/shell/phrontis-vibex/
  - Facts: up to 15 mm; 7–12 axial ribs crossed by spiral cords; smells carcasses from afar; shell colours
- **Reef Cleaners — Nassarius vibex** (Tier 2) — https://www.reefcleaners.org/nassarius-vibex
  - Facts: do not eat algae; stock by feeding; gather at the rock base in bare tanks; ~$0.80 each
- **LiveAquaria — Nassarius Snail** (Tier 2) — https://www.liveaquaria.com/products/nassarius-snail
  - Facts: buried with only the siphon showing; 72–78 °F, SG 1.023–1.025; reef safe; extremely difficult to breed
- Compatibility rules encoded: peacock_mantis_shrimp → incompatible (“Mantis shrimp smash snails.”)

### Astraea Snail — *Lithopoma tectum*

- **WoRMS — Lithopoma tectum ([Lightfoot], 1786)** (Tier 1) — https://www.marinespecies.org/aphia.php?p=taxdetails&id=419499
  - Facts: accepted name; West Indian starsnail; no record for Astraea tecta
- **SeaLifeBase — Lithopoma tectum** (Tier 1) — https://www.sealifebase.se/summary/Lithopoma-tectum.html
  - Facts: max 6.0 cm; 0–10 m, rocky intertidal; IUCN not evaluated
- **Geiger & Levine (FWC) — Florida marine-life snail landings, Aquaculture 2022 abstract** (Tier 1) — https://was.org/Meeting/Program/PaperDetail/157970
  - Facts: Turbo and Lithopoma landings can exceed one million a year
- **LiveAquaria — Astraea Turbo Snail** (Tier 2) — https://www.liveaquaria.com/products/astraea-turbo-snail
  - Facts: up to 1 in; pyramid shell; eats hair algae, cyanobacteria, diatoms; cannot right itself; 72–78 °F, SG 1.023–1.025
- **Reef Cleaners — Astraea tectas** (Tier 2) — https://www.reefcleaners.org/astraea-tectas
  - Facts: nickel- to quarter-sized; film and hair algae; cannot right itself; ~$1 each
- Compatibility rules encoded: peacock_mantis_shrimp → incompatible (“Mantis shrimp smash snails.”)

### Cerith Snail — *Cerithium atratum*

- **WoRMS — Cerithium atratum (Born, 1778)** (Tier 1) — https://www.marinespecies.org/aphia.php?p=taxdetails&id=224572
  - Facts: accepted name; Florida cerith; C. floridanum a synonym
- **SeaLifeBase — Cerithium atratum** (Tier 1) — https://www.sealifebase.se/summary/Cerithium-atratum.html
  - Facts: North Carolina to Brazil; 0–91 m; max 5.0 cm; IUCN not evaluated
- **Bailey-Matthews National Shell Museum — Cerithium atratum** (Tier 1) — https://shells.shellmuseum.org/shell/cerithium-atratum/
  - Facts: ~40 mm; detritus feeder; beaded spiral cords; grey with brown mottling
- **Biagi et al. (2006) Shell use by the hermit crab Paguristes calliopsis. An. Acad. Bras. Ciênc. 78(3)** (Tier 1) — https://www.scielo.br/j/aabc/a/JDCTK3Zm7YFjVqb73tWyzgC/abstract/?lang=en
  - Facts: C. atratum 75.86% of shells used
- **Reef Cleaners — Florida Cerith** (Tier 2) — https://www.reefcleaners.org/florida-cerith
  - Facts: 1–1.25 in; film algae, diatoms, detritus; egg strands in summer, larvae rarely settle; active at night; dormant 72 h after adding; ~$1 each
- Compatibility rules encoded: peacock_mantis_shrimp → incompatible (“Mantis shrimp smash snails.”)

### Flame Angelfish — *Centropyge loriculus*

- **FishBase — Centropyge loriculus (Flame angel)** (Tier 1) — https://www.fishbase.se/summary/Centropyge-loricula.html
  - Facts: 15 cm TL; depth 0–60 m; harems of 3–7; algae diet; frequently exported; IUCN Least Concern (2009)
- **Australian Museum — Flame Angelfish** (Tier 1) — https://australian.museum/Flame-Angelfish-Centropyge-loriculus
  - Facts: ~10 cm; red-orange with black bars; blue and black banded fin rear
- **LiveAquaria — Flame Angelfish** (Tier 2) — https://www.liveaquaria.com/product/444/?pcatid=444
  - Facts: 70 gal; 72–78 °F, SG 1.020–1.025, pH 8.1–8.4, dKH 8–12; semi-aggressive; reef with caution; copper-sensitive; locality colours; ~$110
- **Biota — Flame Angelfish (captive-bred)** (Tier 2) — https://shop.thebiotagroup.com/products/flame-angelfish
  - Facts: 65–70 gal; protogynous; territorial to dwarf angels; captive-bred lots ~$275
- **Reef Builders (2020) — Morse code flame angelfish** (Tier 2) — https://reefbuilders.com/2020/04/24/morse-code-flame-angelfish
  - Facts: Marquesan form with reduced bars; broken bars on one aberrant fish
- Compatibility rules encoded: tag:dwarf_angelfish → conditional (“Dwarf angels fight each other. Two can share only a very large tank, added together.”); tag:clam → high_risk (“Picks at clam mantles.”); lined_seahorse → high_risk (“A quick, bold feeder that may pick at a seahorse and takes its food.”)

### Six-line Wrasse — *Pseudocheilinus hexataenia*

- **FishBase — Pseudocheilinus hexataenia (Sixline wrasse)** (Tier 1) — https://www.fishbase.se/summary/Pseudocheilinus-hexataenia.html
  - Facts: 10 cm TL; depth 1–35 m; among coral branches; small crustaceans; IUCN Least Concern (2009)
- **Barton et al. (2020) Predators of Acropora-eating flatworms. Aquaculture Environment Interactions 12:61–66** (Tier 1) — https://researchonline.jcu.edu.au/62557/
  - Facts: ate 100% of adult flatworms; 0% of egg capsules
- **Australian Museum — Sixline Wrasse** (Tier 1) — https://australian.museum/learn/animals/fishes/sixline-wrasse-pseudocheilinus-hexataenia/
  - Facts: 8.5 cm; violet with orange stripes; tail eyespot
- **LiveAquaria — Six Line Wrasse** (Tier 2) — https://www.liveaquaria.com/products/six-line-wrasse
  - Facts: 30–60 gal; 72–78 °F, SG 1.020–1.025; semi-aggressive, bullies peaceful wrasses; eats pyramid snails, flatworms, bristleworms; reef safe; ~$57
- **Quality Marine — Six-line Wrasse** (Tier 2) — https://www.qualitymarine.com/quality-marine/fish/wrasses/pseudocheilinus/six-line-33580/
  - Facts: 55 gal; one per tank, never two males; jumps
- Compatibility rules encoded: tag:wrasse → conditional (“Bullies other small wrasses, especially peaceful ones added after it.”); tag:shrimp_dwarf → conditional (“Picks off small ornamental shrimp.”); lined_seahorse → high_risk (“A fast, pushy little feeder that harasses slow fish.”)

### Lawnmower Blenny — *Salarias fasciatus*

- **FishBase — Salarias fasciatus (Jewelled blenny)** (Tier 1) — https://www.fishbase.se/summary/Salarias-fasciatus.html
  - Facts: 14 cm TL; depth 0–8 m; scrapes algae; solitary; facultative air-breather; IUCN Least Concern (2009)
- **Fishes of Australia — Salarias fasciatus** (Tier 1) — https://fishesofaustralia.net.au/home/species/4759
  - Facts: 14 cm; combs detritus from turf algae; colour pattern
- **Awata et al. (2010) Reproductive behaviour of Salarias fasciatus. Ichthyological Research 57:161–168** (Tier 1) — https://agris.fao.org/search/en/records/64724de253aa8c896305af08
  - Facts: males guard the eggs; breeds April–June in Okinawa; males have longer anal spines
- **LiveAquaria — Lawnmower Blenny** (Tier 2) — https://www.liveaquaria.com/products/sailfin-algae-blenny
  - Facts: 30 gal; perches on rock; one per tank; may nip SPS and clams; ~$30
- **Reef Builders (2015) — The lawnmower blenny** (Tier 2) — https://reefbuilders.com/2015/05/08/the-lawnmower-blenny-a-funny-fascinating-fish-of-unpredictable-utility
  - Facts: 40 gal; needs a mature tank; some never accept prepared food; cirri over the eyes
- Compatibility rules encoded: tag:blenny → high_risk (“Fights other blennies over grazing ground and perches.”)

### Flame Hawkfish — *Neocirrhites armatus*

- **FishBase — Neocirrhites armatus (Flame hawkfish)** (Tier 1) — https://www.fishbase.se/summary/Neocirrhitus-armatus.html
  - Facts: 9 cm TL; depth 1–10 m; lives in branching corals; small crustaceans; fades in captivity; IUCN Least Concern (2015)
- **FishBase — Reproduction of Neocirrhites armatus (citing Sadovy & Donaldson 1995)** (Tier 1) — https://www.fishbase.se/Reproduction/5832
  - Facts: protogynous; pelagic batch spawner, no care; pairs or harems
- **LiveAquaria — Flame Hawkfish** (Tier 2) — https://www.liveaquaria.com/products/flame-hawkfish
  - Facts: 30 gal; no small shrimp; careful with small gobies and blennies; ~$80
- **Quality Marine — Revisited: the flame hawkfish** (Tier 2) — https://www.qualitymarine.com/news/revisited-flame-hawkfish/
  - Facts: 40 gal; one per tank; may eat snails and crabs; spawns at dusk; 10+ years; varied diet keeps the red
- Compatibility rules encoded: tag:shrimp_dwarf → high_risk (“Small shrimp are its favourite prey.”); tag:fish_tiny → high_risk (“Pounces on fish small enough to swallow.”); lined_seahorse → high_risk (“A quick pouncing feeder that takes food before a seahorse can and pesters slow fish.”)

### Yellowtail Damselfish — *Chrysiptera parasema*

- **FishBase — Chrysiptera parasema (Goldtail demoiselle)** (Tier 1) — https://www.fishbase.se/summary/Chrysiptera-parasema.html
  - Facts: 7 cm TL; depth 1–16 m; over Acropora patches; demersal eggs, male guards; IUCN Least Concern (2021)
- **CORAL Magazine (2016) — ORA’s captive-bred yellowtail damsel** (Tier 2) — https://www.coralmagazine.com/?p=1460673
  - Facts: ~60 raised from three spawns; settlement ~23 days
- **LiveAquaria — Yellowtail Damselfish** (Tier 2) — https://www.liveaquaria.com/products/yellowtail-damselfish
  - Facts: 30 gal; territorial to its own kind; reef safe; singly or odd groups; ~$25
- **Reef Builders (2013) — Chrysiptera parasema** (Tier 2) — https://reefbuilders.com/2013/11/25/chrysiptera-parasema-yellowtail-damselfish-demoiselle
  - Facts: ~20 gal; unusually mild for a damsel; add shy fish first
- Compatibility rules encoded: tag:damselfish → conditional (“Territorial toward other damsels and fish of its shape and colour.”); lined_seahorse → conditional (“A quick feeder that gets to food first; workable with target feeding.”)

### Emerald Crab — *Mithraculus sculptus*

- **WoRMS — Mithraculus sculptus (Lamarck, 1818)** (Tier 1) — https://www.marinespecies.org/rest/AphiaRecordsByName/Mithraculus%20sculptus?like=false&marine_only=true
  - Facts: accepted name; Mithrax sculptus a superseded combination
- **Wagner (1990) The genera Mithrax and Mithraculus. Zoologische Verhandelingen 264** (Tier 1) — https://repository.naturalis.nl/document/149174
  - Facts: largest male 27 mm wide; carapace broader than long; olive-green with bluish-white spots, white tips; stops moulting after the puberty moult
- **Figueiredo et al. (2008) Emerald crabs to control bubble alga in aquaria. JMBA 88:95–101** (Tier 1) — https://www.cambridge.org/core/journals/journal-of-the-marine-biological-association-of-the-united-kingdom/article/efficiency-of-using-emerald-crabs-mithraculus-sculptus-to-control-bubble-alga-ventricaria-ventricosa-syn-valonia-ventricosa-in-aquaria-habitats/639F6330E0A684340BB80510279C03E9
  - Facts: eats bubble algae; pellets chosen 77% of the time and cut algae eating; spoon-shaped claws
- **LiveAquaria — Emerald Crab** (Tier 2) — https://www.liveaquaria.com/products/emerald-crab
  - Facts: 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025; nocturnal, hides by day; may eat corals or small fish when underfed; no copper; easy
- **TFH Magazine — Mithraculus (Mithrax) sculptus** (Tier 2) — https://tfhmagazine.com/articles/saltwater/mithraculus-mithrax-sculptus
  - Facts: omnivorous scavenger; 75–82 °F, calcium 380–430 ppm
- Compatibility rules encoded: peacock_mantis_shrimp → incompatible (“Crabs are a mantis shrimp’s favourite prey.”); tag:crab → conditional (“Crabs fight each other over food and caves.”)

### Tuxedo Urchin — *Mespilia globulus*

- **WoRMS — Mespilia globulus (Linnaeus, 1758)** (Tier 1) — https://www.marinespecies.org/rest/AphiaRecordsByName/Mespilia%20globulus?like=false&marine_only=true
  - Facts: accepted name
- **Matar et al. — the tuxedo urchin as a model animal (eLife reviewed preprint)** (Tier 1) — https://elifesciences.org/reviewed-preprints/112682
  - Facts: red and blue forms are one species; larvae settle ~14 days; mature at 4–6 months
- **Digimorph (UT Austin) — Mespilia globulus** (Tier 1) — https://digimorph.geo.utexas.edu/specimens/Mespilia_globulus/
  - Facts: 6–8 cm; covers itself with debris; common in aquarium stores
- **LiveAquaria — Tuxedo Urchin** (Tier 2) — https://www.liveaquaria.com/products/tuxedo-urchin
  - Facts: 20 gal; 72–78 °F, pH 8.1–8.4, SG 1.023–1.025; no high nitrate or copper; nocturnal grazer; ~$40
- **Quality Marine — Tuxedo urchins and coralline algae** (Tier 2) — https://www.qualitymarine.com/news/tuxedo-urchins-and-coralline-algae/
  - Facts: grazes coralline; needs a mature tank; loosens rockwork; losing spines = poor water

### Sand-sifting Starfish — *Astropecten polyacanthus*

- **WoRMS — Astropecten polyacanthus Müller & Troschel, 1842** (Tier 1) — https://www.marinespecies.org/rest/AphiaRecordsByName/Astropecten%20polyacanthus?like=false&marine_only=true
  - Facts: accepted name
- **SeaLifeBase — Astropecten polyacanthus** (Tier 1) — https://www.sealifebase.se/summary/Speciessummary.php?id=86687
  - Facts: Red Sea to Hawaii; 0–222 m; eats bivalves and gastropods whole; buried by day, active at night; IUCN not evaluated
- **Noguchi et al. (1982) Tetrodotoxin in the starfish Astropecten polyacanthus. Nippon Suisan Gakkaishi** (Tier 1) — https://www.jstage.jst.go.jp/article/suisan1932/48/8/48_8_1173/_article
  - Facts: carries tetrodotoxin; passes to trumpet snails that eat it
- **LiveAquaria — Sand Sifting Sea Star** (Tier 2) — https://www.liveaquaria.com/products/sand-sifting-sea-star
  - Facts: 8 in; large tank, deep sand; starves when detritus runs out; eats small shrimp and molluscs; avoid puffers; ~$24
- **Echinoblog (C. Mah) — Telling apart sand stars: Archaster vs. Astropecten** (Tier 2) — https://echinoblog.blogspot.com/2011/04/telling-apart-sand-stars-archaster-vs.html
  - Facts: Astropecten: long sharp marginal spines, pointed tube feet; Archaster sold under the same name
- Compatibility rules encoded: tag:snail_small → conditional (“Swallows small snails it finds in the sand.”)

### Bubble-tip Anemone — *Entacmaea quadricolor*

- **Titus et al. (2024) Revision of Entacmaea. Zootaxa 5506(1)** (Tier 1) — https://par.nsf.gov/servlets/purl/10575794
  - Facts: disc to 400 mm; foot in crevices; tentacle colours, purple tips, white band; red column without verrucae; solitary or clonal
- **SeaLifeBase — Entacmaea quadricolor** (Tier 1) — https://www.sealifebase.se/summary/Speciessummary.php?id=129744
  - Facts: 0–200 m; zooxanthellae; IUCN not evaluated
- **Scott, Hardefeldt & Hall (2014) Asexual propagation of Entacmaea quadricolor. PLoS ONE** (Tier 1) — https://pmc.ncbi.nlm.nih.gov/articles/PMC4196916/
  - Facts: 89–94% of halves survive; bleaching above ~400 PAR outdoors
- **LiveAquaria — Bubble Tip Anemone** (Tier 2) — https://www.liveaquaria.com/products/green-bubble-tip-anemone
  - Facts: 30 gal; 72–78 °F, pH 8.1–8.4, SG 1.020–1.025; stings corals; wanders; green ~$48, rose ~$239
- **Reef Builders (2023) — The indomitable red bubble-tip anemone** (Tier 2) — https://reefbuilders.com/2023/02/08/the-indomitable-red-bubble-tip-anemone
  - Facts: splits over ~24 h, one split led to a dozen+; 150–200 PAR; ocellaris often host it in tanks; grip a crevice 10 minutes
- Compatibility rules encoded: tag:coral_polyp → conditional (“Stings corals it touches and can wander onto them; keep corals a few inches away.”)

### Blue Tang — *Paracanthurus hepatus*

- **FishBase — Paracanthurus hepatus (Palette surgeonfish)** (Tier 1) — https://www.fishbase.se/summary/Paracanthurus-hepatus.html
  - Facts: 31 cm TL max; hovers 1–2 m above the reef; wedges into coral when frightened; IUCN Least Concern (2010)
- **FAO species guide, vol. 6: Acanthuridae (Randall 2001)** (Tier 1) — https://www.fao.org/4/y0870e/y0870e30.pdf
  - Facts: 31 cm TL max, commonly 20; young deeper-bodied, coloured as adults
- **Animal Diversity Web — Paracanthurus hepatus** (Tier 1) — https://animaldiversity.org/accounts/Paracanthurus_hepatus/
  - Facts: 8–20 years in captivity; may play dead when frightened
- **LiveAquaria — Blue Tang** (Tier 2) — https://www.liveaquaria.com/product/330/?pcatid=330
  - Facts: 180 gal, at least 6 ft long; reef compatible; seaweed several times a week; $109.99 (1–2 in)
- **Quality Marine — The blue tang of many names** (Tier 2) — https://www.qualitymarine.com/news/the-blue-tang-of-many-names/
  - Facts: 180 gal, 6 ft+; the yellow belly occurs only in the Indian Ocean and Red Sea and shows at maturity
- **Reef Builders 2016 — Captive-bred blue tang** (Tier 2) — https://reefbuilders.com/2016/07/20/captive-bred-blue-tang
  - Facts: first captive breeding: University of Florida and Rising Tide Conservation, 2016
- **CORAL Magazine 2025 — Biota’s captive-bred blue tangs** (Tier 2) — https://www.coralmagazine.com/?p=3078387
  - Facts: commercial-scale captive breeding since 2025
- Compatibility rules encoded: tag:tang → conditional (“Tangs fight other tangs; the blue tang is mild, but add tangs together in a big tank with rock breaking the sight lines.”); blue_tang → high_risk (“Blue tangs fight their own kind: one per tank, unless a group goes into a very large tank together.”)

### Naso Tang — *Naso lituratus*

- **FishBase — Naso lituratus (Orangespine unicornfish)** (Tier 1) — https://www.fishbase.se/summary/Naso-lituratus.html
  - Facts: 46 cm SL; eats leafy brown algae; IUCN Least Concern (2010)
- **FAO species guide, vol. 6: Acanthuridae (Randall 2001)** (Tier 1) — https://www.fao.org/4/y0870e/y0870e30.pdf
  - Facts: 45 cm TL max, commonly 35; adult males grow a filament from each tail lobe
- **Taylor et al. 2014 — Growth and longevity of Naso (J. Fish Biol. 85: 901–916)** (Tier 1) — https://researchonline.jcu.edu.au/35460/
  - Facts: lives 14 years or more
- **LiveAquaria — Naso Tang** (Tier 2) — https://www.liveaquaria.com/products/naso-tang
  - Facts: 18 in; 180 gal; reef compatible; a tight lid: it jumps; young grey with a blue dorsal line and orange anal stripe; $123.99
- **Reef Builders 2015 — Naso lituratus** (Tier 2) — https://reefbuilders.com/2015/03/15/naso-lituratus-a-sleek-striking-outstanding-fish-for-spacious-marine-aquariums
  - Facts: 200 gal as a bare minimum; needs long open laps
- **TFH Magazine — The naso tang** (Tier 2) — https://tfhmagazine.com/articles/saltwater/the-naso-tang-full-article
  - Facts: at least 200 gal; young grey, adults chestnut; pale night spots; extremely hardy
- **Gensou — Naso tang care** (Tier 3) — https://gensou.sg/?p=32419
  - Facts: 240 gal, 8 ft strongly preferred
- Compatibility rules encoded: tag:tang → conditional (“Aggressive to other tangs, worst with related or same-shaped ones: add tangs together in a big, long tank with sight breaks.”); naso_tang → high_risk (“Two naso tangs fight in a home tank: one per tank.”)

### Queen Angelfish — *Holacanthus ciliaris*

- **FishBase — Holacanthus ciliaris (Queen angelfish)** (Tier 1) — https://www.fishbase.se/summary/Holacanthus-ciliaris.html
  - Facts: 45 cm TL max; eats mainly sponges; Lm 22 cm; IUCN Least Concern (2009)
- **Florida Museum — Queen angelfish** (Tier 1) — https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/holacanthus-ciliaris
  - Facts: 45 cm; young dark blue with curved bright blue bars and a yellow tail; young clean other fish; 25,000–75,000 eggs an evening
- **Animal Diversity Web — Holacanthus ciliaris** (Tier 1) — https://animaldiversity.org/accounts/Holacanthus_ciliaris/
  - Facts: very aggressive in aquariums; males larger
- **Skorupa et al. 2025 — First captive spawning of the queen angelfish (World Aquaculture Society)** (Tier 1) — https://www.was.org/Meeting/Program/PaperDetail/167384
  - Facts: spawned twice in December 2024; hatch at about 18 h
- **Skorupa et al. 2025 — Growth of the queen angelfish in aquaculture (World Aquaculture Society)** (Tier 1) — https://was.org/Meeting/Program/PaperDetail/167558
  - Facts: young colours lost at about 15.9 cm TL
- **LiveAquaria — Queen Angelfish** (Tier 2) — https://www.liveaquaria.com/products/queen-angelfish
  - Facts: 18 in; 250 gal; not a good reef dweller: nips corals and clam mantles; add it last; $218.99
- **Quality Marine — Queen angelfish** (Tier 2) — https://www.qualitymarine.com/quality-marine/fish/angels/holacanthus/queen-juvenile-10061/
  - Facts: 250 gal or larger; territorial to other large angels
- **National Geographic — Queen angelfish** (Tier 2) — https://www.nationalgeographic.com/animals/fish/facts/queen-angelfish
  - Facts: up to 15 years
- Compatibility rules encoded: emperor_angelfish → high_risk (“Two large angelfish fight: keep one big angel per tank.”); tag:dwarf_angelfish → conditional (“A queen angel bullies smaller angelfish, especially ones added after it: add the dwarf angel first, in a very large tank.”); tag:clam → high_risk (“It picks at clam mantles until the clam dies.”); lined_seahorse → high_risk (“A big, bold feeder that outcompetes and may pick at slow seahorses.”)

### Clown Triggerfish — *Balistoides conspicillum*

- **FishBase — Balistoides conspicillum (Clown triggerfish)** (Tier 1) — https://www.fishbase.se/summary/Balistoides-conspicillum.html
  - Facts: 50 cm TL; eats urchins, crabs, crustaceans, molluscs and tunicates; IUCN Least Concern (2022)
- **Fishes of Australia — Balistoides conspicillum** (Tier 1) — https://fishesofaustralia.net.au/Home/species/761
  - Facts: 50 cm TL; young black with big white spots, a yellow snout and a yellow back patch
- **Australian Museum — Why are they called triggerfishes?** (Tier 1) — https://australian.museum/learn/animals/fishes/why-are-they-called-triggerfishes/
  - Facts: the first dorsal spine locks upright to wedge into the reef
- **LiveAquaria — Clown Triggerfish** (Tier 2) — https://www.liveaquaria.com/products/clown-triggerfish
  - Facts: 20 in; 300 gal; not reef compatible; hard-shelled food wears down its teeth; $149.99
- **Quality Marine — Clown Triggerfish** (Tier 2) — https://www.qualitymarine.com/quality-marine/fish/triggers/balistoides/clown-conspicillum-32009/
  - Facts: 300 gal or larger; eats small fish, stars, crabs, shrimp, snails and urchins; blows water to flip urchins
- **TFH Magazine — Balistoides conspicillum** (Tier 2) — https://tfhmagazine.com/articles/saltwater/balistoides-conspicillum
  - Facts: almost all end up kept alone; bites hands, heaters and tubing
- **Reef Builders 2015 — Biota’s cultured clown triggerfish** (Tier 2) — https://reefbuilders.com/2015/04/06/quality-marine-receives-biota-marines-cultured-balistoides-conspicillum
  - Facts: hatched and raised by Biota in Palau
- Compatibility rules encoded: tag:crustacean → incompatible (“Crabs, hermits and shrimp are its natural food: it crushes them.”); tag:shrimp_large → incompatible (“Cleaner and peppermint shrimp are eaten.”); tag:snail → incompatible (“It crushes snail shells with its teeth.”); tag:starfish → incompatible (“It flips urchins with jets of water and bites them from below, and eats starfish.”); tag:fish_small → incompatible (“One of the most aggressive fish kept: small fish are killed and eaten.”); tag:fish_medium → high_risk (“It attacks mid-sized reef fish; only large, robust fish have a chance.”); tag:fish_large → conditional (“Even large fish are harassed: add the trigger last, young, to a very big tank.”); tag:fish_slow → incompatible (“It bites slow, weak swimmers.”); tag:clam → incompatible (“It eats clams.”); clown_triggerfish → incompatible (“Never two clown triggerfish: they fight to the death.”)

### Panther Grouper — *Chromileptes altivelis*

- **Catalog of Fishes — Chromileptes altivelis** (Tier 1) — https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?tbl=species&genus=Chromileptes
  - Facts: valid as Chromileptes altivelis (Valenciennes 1828); others use Cromileptes or Epinephelus
- **FishBase — Chromileptes altivelis (Humpback grouper)** (Tier 1) — https://www.fishbase.se/summary/Chromileptes-altivelis.html
  - Facts: 70 cm TL; eats small fishes and crustaceans; IUCN Data Deficient (2016)
- **Fishes of Australia — Chromileptes altivelis** (Tier 1) — https://fishesofaustralia.net.au/Home/species/4661
  - Facts: sheltered lagoons and silty areas; young white with fewer, larger black spots
- **Williams et al. 2009 — Biology of the humpback grouper (Endangered Species Research 9: 67–79)** (Tier 1) — https://researchonline.jcu.edu.au/8039
  - Facts: L∞ 59.7 cm; oldest 19 years; sex change at about 55 cm
- **Animal Diversity Web — Cromileptes altivelis** (Tier 1) — https://animaldiversity.org/accounts/Cromileptes_altivelis
  - Facts: swims slowly with many odd turns, sometimes upside down
- **LiveAquaria — Panther Grouper** (Tier 2) — https://www.liveaquaria.com/products/panther-grouper
  - Facts: 300 gal; a lid to prevent escape; $18.99 under 2 in; $29.99–34.99 at 2–4 in; tank-raised fish sold
- **Top Shelf Aquatics — Panther Grouper** (Tier 2) — https://topshelfaquatics.com/products/panther-grouper-cromileptes-altivelis
  - Facts: grows to about 28 in; eats shrimp, crabs and small fish
- Compatibility rules encoded: tag:fish_tiny → incompatible (“Tiny fish are swallowed whole.”); tag:fish_small → incompatible (“An ambush predator: small fish are eaten.”); tag:fish_medium → high_risk (“Only fish too big to swallow are safe: a grown panther grouper takes fish of 12–14 cm.”); tag:shrimp_large → high_risk (“Cleaner and peppermint shrimp are eaten.”); tag:crustacean → high_risk (“Crustaceans are much of its natural diet.”); miniatus_grouper → high_risk (“Adult groupers fight other groupers, and the panther grows bigger.”); dwarf_lionfish → high_risk (“A grown panther grouper can swallow a dwarf lionfish.”); panther_grouper → high_risk (“Adult panther groupers fight each other: one per tank.”)

### Coral Catshark — *Atelomycterus marmoratus*

- **FishBase — Atelomycterus marmoratus (Coral catshark)** (Tier 1) — https://www.fishbase.se/summary/Atelomycterus-marmoratus.html
  - Facts: 70 cm TL max; uses crevices and holes on reefs; one egg case per oviduct; IUCN Near Threatened (2020)
- **Bor, van Oijen & Magenta 2003 — Egg capsules of Atelomycterus marmoratus (Zoologische Mededelingen 77)** (Tier 1) — https://repository.naturalis.nl/document/44279
  - Facts: capsules 50–79 × 18–23 mm with two constricted waists and short tendrils; laid by captive females at Liège and São Paulo
- **Choosri et al. 2023 — Embryonic development of the coral catshark (Rambhai Barni Rajabhat Agric. J. 1)** (Tier 1) — https://ph03.tci-thaijo.org/index.php/kaset_rbruj/article/download/457/331/2257
  - Facts: hatched in 76 days at 25 °C; hatchling 9.2 cm; striped pigment at days 70–75; broodstock fed twice a week
- **Wikipedia — Coral catshark (citing Hövel et al. 2010, Michael 2004, Compagno 1984)** (Tier 3) — https://en.wikipedia.org/wiki/Coral_catshark
  - Facts: Cologne Zoo group: a tank at least 3 m long with deep hiding places; returns to the same refuge; hatch after 4–6 months at 26 °C at 10–13 cm; up to 20 years; may attack tankmates
- **Quality Marine — Coral Cat Shark** (Tier 2) — https://www.qualitymarine.com/quality-marine/fish/sharks/atelomycterus/coral-cat-marmoratus-29015/
  - Facts: 180 gal minimum; 72–78 °F, SG 1.020–1.025, pH 8.1–8.4; fine sand and caves; sensitive to copper
- **Chewy Education — 7 ideal sharks for the saltwater aquarium (Dr Jessie Sanders, DVM)** (Tier 2) — https://www.chewy.com/education/fish/saltwater-fish/7-ideal-sharks-for-the-saltwater-aquarium
  - Facts: 200 gal, 300+ ideal; good tankmates: tangs, damsels, anthias; avoid triggers, puffers and large angels
- **Quality Marine — Shark Eggs Part II** (Tier 2) — https://www.qualitymarine.com/news/shark-eggs-part-ii/
  - Facts: eggs candled with a torch; hatchlings may not eat for a week; never let air into an egg case
- Compatibility rules encoded: tag:crustacean → incompatible (“Crabs and shrimp are a bottom shark’s main food: it eats any crustacean in the tank.”); tag:shrimp_large → incompatible (“Cleaner and peppermint shrimp are eaten.”); tag:fish_tiny → incompatible (“Tiny fish are caught asleep at night.”); tag:fish_benthic → high_risk (“It roots through the sand and burrows at night and catches bottom-sleeping fish.”); tag:fish_small → high_risk (“Small fish asleep near the floor are eaten at night.”); mandarin_dragonet → incompatible (“A slow bottom fish the shark finds by smell at night.”); peacock_mantis_shrimp → incompatible (“The shark attacks it, and its strike can maim a resting shark.”); lined_seahorse → incompatible (“Slow seahorses are eaten or bullied, and their gentle tank can’t carry a shark’s waste.”); dwarf_lionfish → high_risk (“Both rest on the bottom, and a shark that grabs a lionfish is stung by its venomous spines.”); emperor_angelfish → high_risk (“Large angelfish pick at a resting shark’s skin and eyes.”); queen_angelfish → high_risk (“Large angelfish pick at a resting shark’s skin and eyes.”); miniatus_grouper → high_risk (“Groupers eat young sharks and fight them for caves and food.”); panther_grouper → high_risk (“Groupers prey on young sharks and compete for the floor and caves.”); clown_triggerfish → incompatible (“Triggerfish bite and nip bottom sharks, and the clown trigger is among the most aggressive.”); tag:tang → usually_compatible (“Tangs are good shark tankmates, but they catch whitespot and a shark tank can never take copper: quarantine them first. They grab food fast, so target-feed the shark.”); lyretail_anthias → usually_compatible (“Mid-water anthias are good shark tankmates; they feed fast, so target-feed the shark.”); foxface_rabbitfish → usually_compatible (“Large and peaceful, and too big to be tried; it feeds fast, so target-feed the shark.”); maroon_clownfish → usually_compatible (“A big, feisty clownfish that keeps to its anemone; target-feed the shark.”); tag:dwarf_angelfish → conditional (“Dwarf angels may pick at a resting shark, and one asleep near the floor can be caught.”); silver_mono → conditional (“Quick, greedy feeders that steal the shark’s food; only adults live in full sea water. Target-feed the shark.”); spotted_scat → conditional (“Quick, greedy feeders that steal the shark’s food; only adults live in full sea water. Target-feed the shark.”); tag:stinging_cnidarian → conditional (“A shark resting or rooting on the floor can blunder into an anemone and be stung, or uproot it.”); tag:shark → conditional (“Two bottom sharks need twice the floor; adults eat each other’s egg cases and the bigger one eats hatchlings.”)

### Epaulette Shark — *Hemiscyllium ocellatum*

- **FishBase — Hemiscyllium ocellatum (Epaulette shark)** (Tier 1) — https://www.fishbase.se/summary/Hemiscyllium-ocellatum.html
  - Facts: 107 cm TL max; tide pools and shallow reefs; paired eggs; survives low oxygen; IUCN Least Concern (2015)
- **Fishes of Australia — Hemiscyllium ocellatum** (Tier 1) — https://fishesofaustralia.net.au/home/species/1973
  - Facts: Great Barrier Reef endemic; two capsules laid among coral at night about every 14 days; hatch after about 120 days at 14–16 cm
- **Aquarium of the Pacific — Epaulette shark** (Tier 1) — https://www.aquariumofpacific.org/onlinelearningcenter/species/epaulette_shark
  - Facts: typically 70–90 cm; not territorial; walks on its fins; eggs attached to coral or rock by fibrous strands; 20–25 years
- **Wheeler et al. 2021 — Warming shortens epaulette shark incubation (Scientific Reports 11)** (Tier 1) — https://researchonline.jcu.edu.au/66857/1/66857.pdf
  - Facts: 125 days at 27 °C, 110 at 29, 101 at 31; weaker hatchlings at 31 °C; most hatch in the dark; embryos freeze at a threat
- **Wheeler et al. 2025 — Egg-laying cycles of epaulette sharks (Biology Open 14)** (Tier 1) — https://journals.biologists.com/bio/article/doi/10.1242/bio.062076
  - Facts: females housed alone laid on schedule; a cycle of 19 ± 6 days at 25 °C; a median of two cases per cycle; fed 2% of body mass three times a week
- **LiveAquaria — Australian Epaulette Shark** (Tier 2) — https://www.liveaquaria.com/products/australian-epaulette-shark
  - Facts: 360 gal minimum, expert only; 72–78 °F, SG 1.020–1.025; sand only; never copper; $895.99
- **Top Shelf Aquatics — Epaulette Shark** (Tier 2) — https://topshelfaquatics.com/pages/saltwater-fish/epaulette-shark
  - Facts: bottom area matters more than height; digs under rockwork; avoid triggers, puffers, angelfish; eats ornamental shrimp and small sleeping fish
- **ORA — Captive-bred epaulette sharks (2016)** (Tier 2) — https://orafarm.com/?p=7600
  - Facts: captive-bred pups sold since November 2016; expert only; multivitamins in the food
- Compatibility rules encoded: tag:crustacean → incompatible (“Crabs and shrimp are a bottom shark’s main food: it eats any crustacean in the tank.”); tag:shrimp_large → incompatible (“Cleaner and peppermint shrimp are eaten.”); tag:fish_tiny → incompatible (“Tiny fish are caught asleep at night.”); tag:fish_benthic → high_risk (“It roots through the sand and burrows at night and catches bottom-sleeping fish.”); tag:fish_small → high_risk (“Small fish asleep near the floor are eaten at night.”); mandarin_dragonet → incompatible (“A slow bottom fish the shark finds by smell at night.”); peacock_mantis_shrimp → incompatible (“The shark attacks it, and its strike can maim a resting shark.”); lined_seahorse → incompatible (“Slow seahorses are eaten or bullied, and their gentle tank can’t carry a shark’s waste.”); dwarf_lionfish → high_risk (“Both rest on the bottom, and a shark that grabs a lionfish is stung by its venomous spines.”); emperor_angelfish → high_risk (“Large angelfish pick at a resting shark’s skin and eyes.”); queen_angelfish → high_risk (“Large angelfish pick at a resting shark’s skin and eyes.”); miniatus_grouper → high_risk (“Groupers eat young sharks and fight them for caves and food.”); panther_grouper → high_risk (“Groupers prey on young sharks and compete for the floor and caves.”); clown_triggerfish → incompatible (“Triggerfish bite and nip bottom sharks, and the clown trigger is among the most aggressive.”); tag:tang → usually_compatible (“Tangs are good shark tankmates, but they catch whitespot and a shark tank can never take copper: quarantine them first. They grab food fast, so target-feed the shark.”); lyretail_anthias → usually_compatible (“Mid-water anthias are good shark tankmates; they feed fast, so target-feed the shark.”); foxface_rabbitfish → usually_compatible (“Large and peaceful, and too big to be tried; it feeds fast, so target-feed the shark.”); maroon_clownfish → usually_compatible (“A big, feisty clownfish that keeps to its anemone; target-feed the shark.”); tag:dwarf_angelfish → conditional (“Dwarf angels may pick at a resting shark, and one asleep near the floor can be caught.”); silver_mono → conditional (“Quick, greedy feeders that steal the shark’s food; only adults live in full sea water. Target-feed the shark.”); spotted_scat → conditional (“Quick, greedy feeders that steal the shark’s food; only adults live in full sea water. Target-feed the shark.”); tag:stinging_cnidarian → conditional (“A shark resting or rooting on the floor can blunder into an anemone and be stung, or uproot it.”); tag:shark → conditional (“Two bottom sharks need twice the floor; adults eat each other’s egg cases and the bigger one eats hatchlings.”); tag:snail → conditional (“Crushing teeth crack small snails.”); tag:starfish → conditional (“Bottom sharks with crushing teeth eat starfish and urchins.”)

### Brown-banded Bamboo Shark — *Chiloscyllium punctatum*

- **FishBase — Chiloscyllium punctatum (Brownbanded bambooshark)** (Tier 1) — https://www.fishbase.se/summary/Chiloscyllium-punctatum.html
  - Facts: paired eggs; tide pools; survives up to 12 hours out of water; IUCN Near Threatened (2023)
- **Fishes of Australia — Chiloscyllium punctatum** (Tier 1) — https://fishesofaustralia.net.au/home/species/3264
  - Facts: young broadly banded to about 30 cm; adults plain; hatch after about 5 months at 13–17 cm; eats crabs, worms, shrimp and small fish
- **Florida Museum — Brownbanded bamboo shark** (Tier 1) — https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/chiloscyllium-punctatum/
  - Facts: 104 cm max; about 25 years; nocturnal; digs through sediment; breeds readily in captivity
- **Onimaru et al. 2018 — Developmental table of the brownbanded bamboo shark (Developmental Dynamics)** (Tier 1) — https://pmc.ncbi.nlm.nih.gov/articles/PMC5947634
  - Facts: lays year-round in an aquarium; about half the eggs eaten by other fish; hatch about 118 days at 25 °C; bands at days 66–73
- **Kempster, Hart & Collin 2013 — Embryos freeze when they sense a predator (PLoS ONE 8)** (Tier 1) — https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0052551
  - Facts: late embryos pump water with their tails; freeze for 19–59 s at predator-like electric fields
- **Wheaton et al. 2025 — Thyroid disease in aquarium bamboo sharks (Frontiers in Veterinary Science)** (Tier 1) — https://frontiersin.org/articles/10.3389/fvets.2025.1504527/full
  - Facts: goitre the commonest thyroid disease; goitre two months after supplements stopped; high nitrate a cause
- **LiveAquaria — Brown-banded cat shark (Diver’s Den)** (Tier 2) — https://www.liveaquaria.com/products/cat-shark-brown-banded-expert-only-6-25-wysiwyg
  - Facts: 360 gal minimum, expert only; will eat any crustacean; never copper; $199.99 for 6.25 in
- Compatibility rules encoded: tag:crustacean → incompatible (“Crabs and shrimp are a bottom shark’s main food: it eats any crustacean in the tank.”); tag:shrimp_large → incompatible (“Cleaner and peppermint shrimp are eaten.”); tag:fish_tiny → incompatible (“Tiny fish are caught asleep at night.”); tag:fish_benthic → high_risk (“It roots through the sand and burrows at night and catches bottom-sleeping fish.”); tag:fish_small → high_risk (“Small fish asleep near the floor are eaten at night.”); mandarin_dragonet → incompatible (“A slow bottom fish the shark finds by smell at night.”); peacock_mantis_shrimp → incompatible (“The shark attacks it, and its strike can maim a resting shark.”); lined_seahorse → incompatible (“Slow seahorses are eaten or bullied, and their gentle tank can’t carry a shark’s waste.”); dwarf_lionfish → high_risk (“Both rest on the bottom, and a shark that grabs a lionfish is stung by its venomous spines.”); emperor_angelfish → high_risk (“Large angelfish pick at a resting shark’s skin and eyes.”); queen_angelfish → high_risk (“Large angelfish pick at a resting shark’s skin and eyes.”); miniatus_grouper → high_risk (“Groupers eat young sharks and fight them for caves and food.”); panther_grouper → conditional (“A grown bamboo shark is too big for a panther grouper, but the grouper eats its young and egg cases and fights it for the floor.”); clown_triggerfish → incompatible (“Triggerfish bite and nip bottom sharks, and the clown trigger is among the most aggressive.”); tag:tang → usually_compatible (“Tangs are good shark tankmates, but they catch whitespot and a shark tank can never take copper: quarantine them first. They grab food fast, so target-feed the shark.”); lyretail_anthias → usually_compatible (“Mid-water anthias are good shark tankmates; they feed fast, so target-feed the shark.”); foxface_rabbitfish → usually_compatible (“Large and peaceful, and too big to be tried; it feeds fast, so target-feed the shark.”); maroon_clownfish → usually_compatible (“A big, feisty clownfish that keeps to its anemone; target-feed the shark.”); tag:dwarf_angelfish → conditional (“Dwarf angels may pick at a resting shark, and one asleep near the floor can be caught.”); silver_mono → conditional (“Quick, greedy feeders that steal the shark’s food; only adults live in full sea water. Target-feed the shark.”); spotted_scat → conditional (“Quick, greedy feeders that steal the shark’s food; only adults live in full sea water. Target-feed the shark.”); tag:stinging_cnidarian → conditional (“A shark resting or rooting on the floor can blunder into an anemone and be stung, or uproot it.”); tag:shark → conditional (“Two bottom sharks need twice the floor; adults eat each other’s egg cases and the bigger one eats hatchlings.”); tag:snail → conditional (“Crushing teeth crack small snails.”); tag:starfish → conditional (“Bottom sharks with crushing teeth eat starfish and urchins.”)

### Figure-eight Puffer — *Dichotomyctere ocellatus*

- **FishBase — Dichotomyctere ocellatus (eyespot pufferfish)** (Tier 1) — https://www.fishbase.se/summary/Dichotomyctere-ocellatus.html
  - Facts: 8 cm TL; Indochina, Malaysia and Indonesia; 22–26 °C, pH 6.5–7.5, 5–12 dH (wild); listed as freshwater; eats snails and benthic invertebrates; aggressive toward its own species; IUCN Data Deficient (2019)
- **Seriously Fish — Tetraodon biocellatus (figure eight puffer)** (Tier 2) — https://www.seriouslyfish.com/species/tetraodon-biocellatus/
  - Facts: 80 mm SL; rivers and coastal waters, often brackish; can be kept fresh but lives longer at SG ~1.005; base 75×30 cm; snails and shell-on foods wear the beak; nips slow or long-finned fish; not bred in captivity; thought to be a guarding substrate spawner
- **Wikipedia — Dichotomyctere ocellatus** (Tier 2) — https://en.wikipedia.org/wiki/Dichotomyctere_ocellatus
  - Facts: 24–28 °C; low-end brackish SG 1.005–1.008; lower Mekong, Peninsular Malaysia, Borneo; up to 15 years; greenish-yellow pattern on the back
- **The Puffer Forum Library — The Figure Eight Puffer (Pufferpunk)** (Tier 3) — https://www.thepufferforum.com/forum/library/puffers-in-focus/fig8/
  - Facts: 15 gal for one + 10 per extra; low-end brackish; brackish-kept fish live longest (18+ years recorded); all specimens wild-caught; two black eyespots each side; figure-8 not always clear; personable, but a fin-nipper
- Compatibility rules encoded: tag:snail → high_risk (“Figure-eight puffers hunt and crush snails — that is what their beak is for.”); tag:shrimp_dwarf → high_risk (“Figure-eight puffers eat small shrimp.”); tag:shrimp_large → high_risk (“Even larger shrimp get picked apart by a figure-eight puffer.”); tag:long_fins → high_risk (“Figure-eight puffers nip long, flowing fins such as a sailfin molly’s dorsal.”); bumblebee_goby → conditional (“Bumblebee gobies are small, slow and territorial; a puffer may nip or harass them in a small tank.”)

### Bumblebee Goby — *Brachygobius doriae*

- **FishBase — Brachygobius doriae (bumblebee goby)** (Tier 1) — https://www.fishbase.se/summary/Brachygobius-doriae.html
  - Facts: 4.2 cm TL; fresh and brackish water; Indonesia, Malaysia, Brunei, Singapore; 22–29 °C, pH 8.0, 9–19 dH; 150–200 eggs; IUCN Least Concern (2018)
- **Seriously Fish — Brachygobius doriae (bumblebee goby)** (Tier 2) — https://www.seriouslyfish.com/species/brachygobius-doriae/
  - Facts: 35 mm SL; mangroves, estuaries and tidal streams over mud; 22–28 °C, pH 7.0–8.5, 8–20 dGH; salt optional (~2 g/L); small live foods essential; dried food ignored; males territorial; groups of 6+; species tank best; male guards 100–200 eggs in a cave; hatch 7–9 days; fry need infusoria then Artemia; first band covers the first dorsal; pectoral and pelvic fins black on the inner two-thirds
- **Wikipedia — Brachygobius** (Tier 2) — https://en.wikipedia.org/wiki/Brachygobius
  - Facts: 9–10 species, all sold as bumblebee gobies; freshwater and slightly brackish; about 40 L holds a dozen; eggs hatch in about 7 days; about 5 years in aquaria
- **Seriously Fish — Brachygobius sabanus** (Tier 2) — https://www.seriouslyfish.com/species/brachygobius-sabanus/
  - Facts: smaller (27 mm SL); often confused with B. doriae in the trade

### Sailfin Molly — *Poecilia latipinna*

- **FishBase — Poecilia latipinna (sailfin molly)** (Tier 1) — https://www.fishbase.se/summary/Poecilia-latipinna.html
  - Facts: 15 cm TL (males); Cape Fear drainage (NC) to Veracruz, Mexico; 20–28 °C; gestation ~28 days, 10–100 young; algae and plants plus small invertebrates; IUCN Least Concern (2019); potential pest
- **USGS NAS — Sailfin molly (Poecilia latipinna) species profile** (Tier 1) — https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=858
  - Facts: native range; established in AZ, CA, CO, MT, NV, TX and Hawaii; implicated in declines of desert pupfish and native Hawaiian damselflies
- **Florida Museum (UF) — Discover Fishes: sailfin molly** (Tier 1) — https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/poecilia-latipinna/
  - Facts: max 150 mm TL; coastal marshes, ditches, estuaries; rows of spots merging into stripes; gestation 3–4 weeks, 10–140 young, sperm storage; melanistic and speckled wild forms
- **Seriously Fish — Poecilia latipinna (sailfin molly)** (Tier 2) — https://www.seriouslyfish.com/species/poecilia-latipinna/
  - Facts: 125 mm SL; 21–26 °C, pH 7.0–8.5, 15–35 dGH; hard water essential; salt not required; 87 L minimum; vegetable matter; low greenery stunts the male sail; males spar; two females per male; fry take baby brine from birth
- **Aquarium Co-Op — Care guide for mollies** (Tier 2) — https://www.aquariumcoop.com/blogs/aquarium/molly-fish-care
  - Facts: 24–27 °C; 20 gal minimum; hard, mineral-rich water; gestation 30–60 days
- **Wikipedia — Fancy molly** (Tier 2) — https://en.wikipedia.org/wiki/Fancy_molly
  - Facts: black molly from P. sphenops × P. latipinna crosses; high-fins add P. velifera; dalmatian/marbled, gold, lyretail and balloon varieties; colour and fin shape inherited independently

### Banded Archerfish — *Toxotes jaculatrix*

- **FishBase — Toxotes jaculatrix (banded archerfish)** (Tier 1) — https://www.fishbase.se/summary/Toxotes-jaculatrix.html
  - Facts: 30 cm TL, commonly 20 cm; India to the Philippines, New Guinea and northern Australia; mainly brackish mangrove estuaries; moves up rivers; 25–30 °C; surface feeder on insects; shoots them down (~150 cm); IUCN Least Concern (2011)
- **The Australian Museum — Banded archerfish, Toxotes jaculatrix** (Tier 1) — https://australian.museum/learn/animals/fishes/banded-archerfish-toxotes-jaculatrix/
  - Facts: silvery-white with 4–5 black bars on the upper half; only rarely in fresh water; tongue and palate groove form the jet; large fish shoot 2–3 m
- **Animal Diversity Web — Toxotes jaculatrix** (Tier 1) — https://animaldiversity.org/accounts/Toxotes_jaculatrix/
  - Facts: averages 25 cm; schools; aggressive when alone; shooting range ~125 cm; mangrove loss as a threat
- **Vailati, Zinnato & Cerbino 2012, PLoS ONE — How archer fish achieve a powerful impact** (Tier 1) — https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0047867
  - Facts: the jet accelerates from ~2 to 4 m/s so the water gathers into one drop; impact ~200 mN, several times prey grip; ~3000 W/kg at impact
- **Seriously Fish — Toxotes jaculatrix (banded archerfish)** (Tier 2) — https://www.seriouslyfish.com/species/toxotes-jaculatrix/
  - Facts: 120 × 60 cm base for adults; pH 7.0–8.0, 20–30 dGH; juveniles can be kept fresh; brackish recommended at every stage; groups of 4–5 reduce aggression; eats small fish; takes floating foods; not bred in the hobby; thought to spawn in sea water
- **Wikipedia — Archerfish** (Tier 2) — https://en.wikipedia.org/wiki/Archerfish
  - Facts: mean shooting angle ~74°; adults almost always hit first shot; juveniles learn by watching; moves to the landing spot within ~100 ms; 5–8 years in captivity; tall lid needed — they jump
- Compatibility rules encoded: tag:fish_tiny → high_risk (“Archerfish swallow any fish small enough to fit in their mouths.”); bumblebee_goby → high_risk (“A bumblebee goby is exactly the size of an archerfish snack.”)

### Silver Mono — *Monodactylus argenteus*

- **FishBase — Monodactylus argenteus (Silver moony)** (Tier 1) — https://www.fishbase.se/summary/Monodactylus-argenteus.html
  - Facts: 27 cm SL max; marine, brackish and fresh; 24–28 °C; Lm 13 cm; IUCN Least Concern (2016)
- **Fishes of Australia — Monodactylus argenteus** (Tier 1) — https://fishesofaustralia.net.au/home/species/581
  - Facts: 25 cm SL; juveniles enter fresh streams; young with two black bars and yellow fins
- **Thomas et al. (ICAR-CIBA) 2019 — First captive breeding of the silver moony (WAS Asian-Pacific Aquaculture)** (Tier 1) — https://was.org/Meeting/Program/PaperDetail/153808
  - Facts: hormone-induced spawning in sea water; 4,040 eggs; hatch in about 18 h at 28 °C
- **LiveAquaria — Mono Argentus** (Tier 2) — https://www.liveaquaria.com/product/996/?pcatid=996
  - Facts: 10 in; 130 gal minimum; adults at SG 1.020–1.025; small fish can live in fresh water; $65.99
- **Aquatics Unlimited — Mono argentus** (Tier 2) — https://aquaticsunlimited.com/product/brackish-mono-argentus-monodactylus-argenteus/
  - Facts: 90 gal for a small group, 150+ as they grow; keep at least six, added together; $29.99
- **Gensou — Silver mono care** (Tier 3) — https://gensou.sg/?p=33043
  - Facts: juveniles fresh to SG 1.005, adults 1.018–1.025; a school of five or more, ideally seven; 8–12 years
- Compatibility rules encoded: figure_eight_puffer → conditional (“The puffer nips fins and wants lower salinity than grown monos.”); bumblebee_goby → high_risk (“A tiny goby is outcompeted, may be eaten, and wants near-fresh water.”); tag:fish_tiny → high_risk (“A school of adult monos eats fish small enough to swallow.”); tag:tang → conditional (“In a fish-only marine tank fast, greedy monos win the food, and grown tangs need a very large tank.”); queen_angelfish → conditional (“In a fish-only marine tank a queen angel chases newcomers and monos win the food: a very large tank, the angel added last.”)

### Spotted Scat — *Scatophagus argus*

- **FishBase — Scatophagus argus (Spotted scat)** (Tier 1) — https://www.fishbase.se/summary/Scatophagus-argus.html
  - Facts: 45 cm TL max, 20 cm common; marine, brackish and fresh; 20–28 °C; IUCN Least Concern (2009)
- **Fishes of Australia — Scatophagus argus** (Tier 1) — https://fishesofaustralia.net.au/home/species/2212
  - Facts: 33 cm SL; mangrove creeks and lower streams; small young barred with red-orange patches; venom glands at the fin-spine bases
- **Xiao et al. 2019 — Genome survey of the spotted scat** (Tier 1) — https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6940847/fullTextXML
  - Facts: the female grows faster and larger
- **TFH Magazine — Scatophagus argus** (Tier 2) — https://tfhmagazine.com/articles/saltwater/scatophagus-argus
  - Facts: usually up to 38 cm; adults best in full marine water; a six- to eight-foot tank; follows archerfish; not bred in captivity
- **Practical Fishkeeping — The mucky mouths** (Tier 2) — https://www.practicalfishkeeping.co.uk/features/the-mucky-mouths/
  - Facts: brackish is best, starting at 10–15 ppt; always keep in groups; a heavy bioload
- **Aquarium Glaser — Scatophagus argus** (Tier 2) — https://www.aquariumglaser.de/en/fish-archives/scatophagus-argus-2
  - Facts: “rubifrons” is a dealer’s name; small red scats are striped and turn spotted at 4–5 cm
- **Aquatics Unlimited — Red (ruby) scat** (Tier 2) — https://aquaticsunlimited.com/product/brackish-scat-red-ruby-scatophagus-argus-rubifrons/
  - Facts: the red is a juvenile stage; keep at least six; $19.99–59.99 (1–3 in)
- Compatibility rules encoded: banded_archerfish → usually_compatible (“Natural companions: scats even follow archerfish to snatch the insects they shoot down.”); figure_eight_puffer → conditional (“The puffer nips fins and wants lower salinity than grown scats.”); bumblebee_goby → high_risk (“A greedy, fast scat starves a tiny goby out and may eat it.”); tag:coral_polyp → high_risk (“Scats graze anything soft, corals and plants included.”); tag:tang → conditional (“In a fish-only marine tank scats compete hard for the seaweed tangs live on, and grown tangs need a very large tank.”); queen_angelfish → conditional (“In a fish-only marine tank a queen angel chases newcomers and greedy scats win the food: a very large tank, the angel added last.”)
