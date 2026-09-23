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

## Species (48)

| Species | Scientific name | Env | Sources (tier) | Confidence notes |
|---|---|---|---|---|
| **Axolotl** (`axolotl`) | *Ambystoma mexicanum* | freshwater | [University of Kentucky AGSC — Guide to Axolotl Husbandry](https://ambystoma.uky.edu/education1/guide-to-axolotl-husbandry) (T1)<br>[Animal Diversity Web — Ambystoma mexicanum](https://animaldiversity.org/accounts/Ambystoma_mexicanum/) (T1)<br>[Woodcock et al. 2017, Scientific Reports — Identification of mutant genes and introgressed tiger salamander DNA in the laboratory axolotl](https://pmc.ncbi.nlm.nih.gov/articles/PMC5428337/) (T1)<br>[Tyrp1 is the Mendelian determinant of the axolotl copper mutant — Scientific Reports (2024; title verified via search listing, full text behind a login redirect)](https://www.nature.com/articles/s41598-024-73283-1) (T1)<br>[AquariumNexus — Axolotl and goldfish: can you keep them together?](https://www.aquariumnexus.com/axolotl-goldfish/) (T3) | Temperature, pH, flow, substrate and breeding timings follow the AGSC husbandry guide (Tier 1). The 10 °C lower bound is conservative: axolotls tolerate colder water but become sluggish and feed poorly. · GH/KH ranges are hobby practice (AGSC only says never extremely soft/distilled water) — treat them as guidance, not hard limits. · Clutch size: ADW gives 100–300; many breeders report larger spawns. The game uses 100–600. · Compressed time: maturity (~1 real year) = 18 game-days; 2–3 week incubation ≈ 128 game-hours; ~10 year lifespan = 400 game-days. · Goldfish-gill-nipping rule rests on consistent Tier 3 keeper reports plus the Tier 1 facts that goldfish are heavy-waste nibblers; confidence moderate-high. |
| **Betta** (`betta`) | *Betta splendens* | freshwater | [FishBase — Betta splendens (Siamese fighting fish)](https://www.fishbase.se/summary/Betta-splendens.html) (T1)<br>[PetMD — Betta Fish Care Sheet (Maria Zayas, DVM)](https://www.petmd.com/fish/betta-fish-care-sheet) (T2)<br>[Aquarium Co-Op — Betta fish care guide](https://www.aquariumcoop.com/blogs/aquarium/betta-fish-care-guide) (T2)<br>[Wang et al. 2021 — Genomic basis of striking fin shapes and colors in the fighting fish (Mol. Biol. Evol.)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8321530/) (T1) | Water parameters: FishBase (24–30 °C, pH 6–8, 5–19 dH) and PetMD (76–81 °F) agree well; tolerated minimum of 23 °C is a practical floor. · Betta vs dwarf shrimp varies by individual — represented as conditional with a per-day incident risk rather than a guarantee either way. · Colour/pattern/fin genetics are a deliberately simplified dominance ladder; real inheritance involves several interacting loci. · Compressed time: maturity ~4–5 real months = 14 game-days; bubble-nest eggs hatch in ~1–2 days (14 game-hours); 3–5 year lifespan ≈ 160 game-days. |
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
| **Bristlenose Pleco** (`bristlenose_pleco`) | *Ancistrus cf. cirrhosus* | freshwater | [Seriously Fish — Ancistrus sp. ‘3’ (A. cf. cirrhosus)](https://www.seriouslyfish.com/species/ancistrus-cf-cirrhosus/) (T2)<br>[USGS Nonindigenous Aquatic Species — Bristlenosed catfish (Ancistrus sp.)](https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=2598) (T1)<br>[FishBase — Ancistrus cirrhosus](https://www.fishbase.se/summary/Ancistrus-cirrhosus.html) (T1)<br>[Aquarium Co-Op — Bristlenose pleco care guide](https://www.aquariumcoop.com/blogs/aquarium/bristlenose-pleco-care-guide) (T2)<br>[LiveAquaria — Bushy Nose Pleco](https://www.liveaquaria.com/product/1039/?pcatid=1039) (T2)<br>[German & Bittong 2009 — Digestive enzyme activities of wood-eating catfishes (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC2762538/) (T1)<br>[Gensou — Bristlenose pleco colour morphs guide](https://gensou.sg/bristlenose-pleco-colour-morphs-guide/) (T3) | Size: true A. cirrhosus is 9 cm SL (FishBase), but the trade form reaches 12–15 cm; the game uses 12 cm. · Driftwood: hobby sources call it essential; peer-reviewed gut studies show plecos do not digest wood. Treated as beneficial, not required. · Clutch size and incubation beyond Aquarium Co-Op’s 30–80 eggs come from Tier 3 sources. · Colour genetics simplified (recessive colour genes; codominant long-fin). · Compressed time: 4–10 day hatch ≈ 48 game-hours; ~9 year lifespan ≈ 360 game-days. |
| **African Dwarf Frog** (`african_dwarf_frog`) | *Hymenochirus boettgeri* | freshwater | [USGS Nonindigenous Aquatic Species — Hymenochirus boettgeri](https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=66) (T1)<br>[Gvoždík et al. 2023 — tetraploidy in Hymenochirus boettgeri (Zool. J. Linn. Soc. 200:1034)](https://academic.oup.com/zoolinnean/article/200/4/1034/7321480) (T1)<br>[CDC — 2011 Salmonella outbreak linked to African dwarf frogs](https://archive.cdc.gov/www_cdc_gov/salmonella/2011/water-frog-7-20-2011.html) (T1)<br>[Washington Dept. of Fish & Wildlife — African clawed frog](https://wdfw.wa.gov/species-habitats/invasive/xenopus-laevis) (T1)<br>[TFH Magazine — Diagnosis of chytridiomycosis in pet African dwarf frogs](https://www.tfhmagazine.com/articles/freshwater/aquarium-science-diagnosis-of-chytridiomycosis-in-pet-african-dwarf-frogs) (T2)<br>[Aquarium Co-Op — Caring for African dwarf frogs](https://www.aquariumcoop.com/blogs/aquarium/caring-african-dwarf-frogs) (T2)<br>[PetSmart — African dwarf frog care guide](https://www.petsmart.com/learning-center/reptile-care/african-dwarf-frog-care-guide/A0118.html) (T2)<br>[Aquatic Arts — Dwarf African Frog (tank-bred)](https://aquaticarts.com/products/dwarf-african-frog) (T2)<br>[Pipidae.org — African dwarf clawed frog or African clawed frog?](https://www.pipidae.org/en/species-and-systematics/determining-of-species/african-dwarf-clawed-frog-or-african-clawed-frog/) (T3) | Taxonomy: pet “H. boettgeri” is a diploid lineage distinct from wild tetraploid H. boettgeri (Gvoždík 2023); the roster name is kept. · Shrimp: Aquatic Arts says dwarf shrimp will be eaten; Aquarium Co-Op says well-fed frogs usually leave them. Encoded as conditional. · Clutch size is poorly sourced (hobby claims range widely); 50–200 used. · Pellets: Aquarium Co-Op discourages them, PetSmart uses them as a staple — both are included as foods, with frozen foods preferred. · Compressed time: ~2 day hatch ≈ 16 game-hours; ~36 day tadpole stage ≈ 288 game-hours; 5–7 year lifespan ≈ 240 game-days. |
| **Cardinal Tetra** (`cardinal_tetra`) | *Paracheirodon axelrodi* | freshwater | [Seriously Fish — Paracheirodon axelrodi](https://www.seriouslyfish.com/species/paracheirodon-axelrodi/) (T2)<br>[FishBase — Paracheirodon axelrodi](https://www.fishbase.se/summary/Paracheirodon-axelrodi.html) (T1)<br>[Animal Diversity Web — Paracheirodon axelrodi](https://animaldiversity.org/accounts/Paracheirodon_axelrodi/) (T1)<br>[Oliveira et al. 2008 — Tolerance to temperature, pH, ammonia and nitrite in cardinal tetra (Acta Amazonica)](https://www.scielo.br/j/aa/a/FYCZj6tsgyvP9QcXYh7yPnC/?lang=en) (T1)<br>[Aquarium Co-Op — Cardinal tetra care guide](https://www.aquariumcoop.com/blogs/aquarium/cardinal-tetra) (T2)<br>[Aquarium Co-Op — Neon tetras vs cardinal tetras](https://www.aquariumcoop.com/blogs/aquarium/neon-tetras-and-cardinal-tetras) (T2)<br>[LiveAquaria — Cardinal Tetra](https://www.liveaquaria.com/products/cardinal-tetra) (T2)<br>[Wikipedia — Project Piaba](https://en.wikipedia.org/wiki/Project_Piaba) (T3) | Upper temperature: 27 °C (FishBase, LiveAquaria) vs 29 °C (Seriously Fish, Co-Op); lab tolerance data support the higher value. Ideal 24–28 °C. · FishBase’s dH 5–12 looks high next to other sources; the game uses GH 1–10. · Clutch size (~500) is from ADW; captive spawns are usually smaller. · Compressed time: 24–30 h hatch ≈ 10 game-hours; ~5 year captive lifespan ≈ 200 game-days. |
| **Dwarf Orange Crayfish** (`dwarf_crayfish`) | *Cambarellus patzcuarensis* | freshwater | [USFWS Ecological Risk Screening Summary — Mexican Dwarf Crayfish (2017)](https://www.fws.gov/sites/default/files/documents/Ecological-Risk-Screening-Summary-Mexican-Dwarf-Crayfish.pdf) (T1)<br>[Amazonas Magazine — A Mexican crayfish for nano aquariums (R. O’Leary, 2013)](https://www.amazonasmagazine.com/2013/03/15/a-mexican-crayfish-for-nano-aquariums/) (T2)<br>[The Shrimp Farm — Dwarf Orange Crayfish care sheet](https://www.theshrimpfarm.com/posts/caresheet-dwarf-orange-crayfish/) (T2)<br>[Aquatic Arts — Orange CPO crayfish & care guide](https://aquaticarts.com/pages/orange-dwarf-mexican-dwarf-crayfish-care-guide) (T2)<br>[Aquariadise — CPO crayfish care sheet](https://www.aquariadise.com/caresheet-cambarellus-patzcuarensis/) (T3) | Predation is disputed: The Shrimp Farm and Amazonas call CPOs safe with shrimp and fish; Aquatic Arts, Aquariadise and others report opportunistic catches of moulting shrimp, fry, snails and sleeping bottom fish. Encoded as conditional with low per-day risk. · Size: ~2 cm body (measured trade animals) vs 4–5 cm including claws; the game uses 3.5 cm total. · Upper temperature: 26 °C (USFWS) vs 31 °C (hobby source); the cautious 26 °C is used. · Cannibalism of young: sources conflict; modelled as moderate losses without cover. · Compressed time: 3–4 week incubation ≈ 200 game-hours; ~2 year lifespan ≈ 80 game-days. |
| **Discus** (`discus`) | *Symphysodon aequifasciatus* | freshwater | [Seriously Fish — Symphysodon aequifasciatus](https://www.seriouslyfish.com/species/symphysodon-aequifasciatus/) (T2)<br>[FishBase — Symphysodon aequifasciatus](https://www.fishbase.se/summary/Symphysodon-aequifasciatus.html) (T1)<br>[Aquarium Co-Op — Discus care guide](https://www.aquariumcoop.com/blogs/aquarium/discus-care-guide) (T2)<br>[LiveAquaria — Blue Diamond Discus](https://www.liveaquaria.com/products/blue-diamond-discus) (T2)<br>[Sylvain & Derome 2017 — skin-mucus feeding of discus fry (Scientific Reports)](https://pmc.ncbi.nlm.nih.gov/articles/PMC5507859/) (T1)<br>[Aquarium Glaser (2024) — The scientific species name of discus cichlids: an open question](https://www.aquariumglaser.de/en/fisharchive/the-scientific-species-name-of-discus-cichlids-an-open-question/) (T2)<br>[North American Discus Association — Discus classification](https://discusnada.org/discus-classification/) (T3)<br>[AquariumScience.org — Breeding discus](https://aquariumscience.org/17-11-6-breeding-discus/) (T3)<br>[Wikipedia — Discus (fish)](https://en.wikipedia.org/wiki/Discus_(fish)) (T3) | Taxonomy is unsettled (3–5 species recognised depending on author); domestic discus are hybrids, often labelled Symphysodon sp. · pH: Aquarium Co-Op keeps domestic discus at 6.8–7.6, while wild fish live at pH 4–6. Ideal set to 6.0–7.0 for domestic stock. · Minimum tank: 50–90 gallons across sources; 75 used. · Egg counts come from hobbyist sources; mucus-feeding length 2–4 weeks (3 used). · Strain genetics are simplified from breeder experience (blue diamond recessive, pigeon blood dominant). · Compressed time: ~2.5 day hatch ≈ 20 game-hours; ~10 year lifespan ≈ 400 game-days. |
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
| **Figure-eight Puffer** (`figure_eight_puffer`) | *Dichotomyctere ocellatus* | brackish | [FishBase — Dichotomyctere ocellatus (eyespot pufferfish)](https://www.fishbase.se/summary/Dichotomyctere-ocellatus.html) (T1)<br>[Seriously Fish — Tetraodon biocellatus (figure eight puffer)](https://www.seriouslyfish.com/species/tetraodon-biocellatus/) (T2)<br>[Wikipedia — Dichotomyctere ocellatus](https://en.wikipedia.org/wiki/Dichotomyctere_ocellatus) (T2)<br>[The Puffer Forum Library — The Figure Eight Puffer (Pufferpunk)](https://www.thepufferforum.com/forum/library/puffers-in-focus/fig8/) (T3) | Salinity is the classic disagreement: FishBase lists it as a freshwater fish, Seriously Fish says it can be kept fresh but lives longer at SG ~1.005, and Wikipedia and the Puffer Forum recommend low-end brackish (1.005–1.008). The game follows the brackish consensus (ideal 1.004–1.008) and needs at least a trace of salt (1.002) — a game simplification. · pH: FishBase gives 6.5–7.5 for wild fresh water; brackish keepers run ~8. The game tolerates 6.8–8.4 (ideal 7.3–8.2). · Lifespan: up to 15 years (Wikipedia), 18+ recorded (Puffer Forum); 480 game-days ≈ 12 years compressed. · Breeding: not bred in captivity — encoded as not_in_game; the clutch values are placeholders. · The Golden and Bold-ringed variants are natural individual variation, not trade morphs. |
| **Bumblebee Goby** (`bumblebee_goby`) | *Brachygobius doriae* | brackish | [FishBase — Brachygobius doriae (bumblebee goby)](https://www.fishbase.se/summary/Brachygobius-doriae.html) (T1)<br>[Seriously Fish — Brachygobius doriae (bumblebee goby)](https://www.seriouslyfish.com/species/brachygobius-doriae/) (T2)<br>[Wikipedia — Brachygobius](https://en.wikipedia.org/wiki/Brachygobius) (T2)<br>[Seriously Fish — Brachygobius sabanus](https://www.seriouslyfish.com/species/brachygobius-sabanus/) (T2) | Identification: the trade name covers B. doriae, B. sabanus and others that are hard to tell apart (fish sold as "B. xanthozonus" almost certainly are not). Values are shared across them. · Salinity: found in fresh and brackish water; Seriously Fish calls salt optional (~2 g/L). The game treats them as brackish-leaning (ideal SG 1.001–1.006) but lets them live in hard fresh water with a small comfort penalty. · Hatch time: 7–9 days (Seriously Fish) vs ~7 days (Wikipedia); 8 days = 64 game-hours used. · Compressed time: maturity (~6 months) = 9 game-days; ~5 year lifespan ≈ 200 game-days. |
| **Sailfin Molly** (`sailfin_molly`) | *Poecilia latipinna* | brackish | [FishBase — Poecilia latipinna (sailfin molly)](https://www.fishbase.se/summary/Poecilia-latipinna.html) (T1)<br>[USGS NAS — Sailfin molly (Poecilia latipinna) species profile](https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=858) (T1)<br>[Florida Museum (UF) — Discover Fishes: sailfin molly](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/poecilia-latipinna/) (T1)<br>[Seriously Fish — Poecilia latipinna (sailfin molly)](https://www.seriouslyfish.com/species/poecilia-latipinna/) (T2)<br>[Aquarium Co-Op — Care guide for mollies](https://www.aquariumcoop.com/blogs/aquarium/molly-fish-care) (T2)<br>[Wikipedia — Fancy molly](https://en.wikipedia.org/wiki/Fancy_molly) (T2) | Domestic mollies are hybrids of P. latipinna, P. sphenops and P. velifera (origin disputed); the game uses P. latipinna values for all of them. · Salinity: wild fish live from fresh water to ~87 ppt. The game allows fresh water (SG 1.000) with a small comfort penalty and caps the range at 1.018 so they are not sold for marine tanks. · Gestation: 28 days (FishBase), 3–4 weeks (Florida Museum), up to ~2 months (Seriously Fish); 30 days = 240 game-hours used. · Genetics are simplified and partly unverified: real melanism is polygenic; "gold is recessive" and "lyretail is dominant" are common hobby claims we could not confirm in a primary source. Colour and fin shape are inherited independently (as modelled). · Balloon mollies (a spinal deformity) are deliberately left out on welfare grounds. · Compressed time: 3–5 year lifespan ≈ 180 game-days. |
| **Banded Archerfish** (`banded_archerfish`) | *Toxotes jaculatrix* | brackish | [FishBase — Toxotes jaculatrix (banded archerfish)](https://www.fishbase.se/summary/Toxotes-jaculatrix.html) (T1)<br>[The Australian Museum — Banded archerfish, Toxotes jaculatrix](https://australian.museum/learn/animals/fishes/banded-archerfish-toxotes-jaculatrix/) (T1)<br>[Animal Diversity Web — Toxotes jaculatrix](https://animaldiversity.org/accounts/Toxotes_jaculatrix/) (T1)<br>[Vailati, Zinnato & Cerbino 2012, PLoS ONE — How archer fish achieve a powerful impact](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0047867) (T1)<br>[Seriously Fish — Toxotes jaculatrix (banded archerfish)](https://www.seriouslyfish.com/species/toxotes-jaculatrix/) (T2)<br>[Wikipedia — Archerfish](https://en.wikipedia.org/wiki/Archerfish) (T2) | Salinity: juveniles can be kept fresh (Seriously Fish) but adults live mainly in brackish estuaries; the game uses a brackish range (ideal SG 1.005–1.012) for all ages. · Size: FishBase 30 cm TL vs Seriously Fish 300 mm SL; aquarium adults are usually 15–20 cm, so 20 cm is used. Tank size follows Seriously Fish (120 × 60 cm base → 125 gal). · Spitting: real range is 1.25–3 m at a steep ~74° angle; the game keeps the jet inside the tank’s air gap and treats it as a signature behaviour, not a hunting mechanic. · Bar count: 4–5 (Australian Museum) vs 4–6 (Wikipedia). · Compressed time: 5–8 year captive lifespan ≈ 300 game-days. |

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
- Compatibility rules encoded: tag:fish_tiny → incompatible (“Tiny fish are swallowed whole.”); tag:fish_small → incompatible (“A miniatus grouper will ambush and eat small fish.”); tag:fish_medium → high_risk (“A grown miniatus has a huge mouth: only fish too large to swallow are safe, and most community reef fish are not.”); tag:shrimp_large → high_risk (“Cleaner and peppermint shrimp are eaten; the grouper cannot be trusted with invertebrates.”); tag:crustacean → high_risk (“Crabs and other crustaceans make up much of its natural diet.”); dwarf_lionfish → conditional (“A full-grown miniatus can try to swallow a dwarf lionfish despite its spines; keep only if the lionfish is large relative to the grouper.”)

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
