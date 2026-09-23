# Brackish species research — lane brackish

This document is the research record behind the estuary chapter: the four brackish `SpeciesDefinition`s in `src/data/species/brackish/` and the brackish water class. For each species it lists the sources used, the key values encoded, the explicit compatibility rules, and its confidence and conflicts. It ends with the brackish water model, the cross-cutting **Conflicts & uncertainty**, and the **Visual notes for render lanes**.

The per-species sections are generated from the species data files, so they always match the game values. The data files are the source of truth; update this document when they change.

## Method

- **Research date:** September 2026. One literature pass covered all four species. Every source cited was opened and read. IUCN statuses come from the FishBase summaries; IUCN pages themselves were not opened.
- **Source tiers** (same as `docs/research/freshwater.md`):
  - **Tier 1:** FishBase, Animal Diversity Web, USGS NAS, museums (Florida Museum, Australian Museum) and peer-reviewed papers.
  - **Tier 2:** Seriously Fish, Wikipedia, and major retailers used for practical parameters (Aquarium Co-Op).
  - **Tier 3:** specialist hobby libraries (The Puffer Forum), used only for husbandry detail and edge cases.
- **Compatibility-critical rules have at least two sources.** The test suite (`tests/sim/species-brackish.test.ts`) enforces two or more sources per species and at least one Tier 1 source.
- **What "brackish" means in the game.** Species with `environment: 'brackish'` carry a `salinitySG` range. One salinity model (`src/sim/compat/salinity.ts`) decides where a species may live, and both the purchase gate and the compatibility engine use it:
  - A brackish species can live in a **freshwater tank** if its range reaches fresh water (`min ≤ 1.001`). Mollies and bumblebee gobies qualify; figure-eight puffers and archerfish do not.
  - It can live in a **marine tank** only if it tolerates full sea water (`max ≥ 1.020`). None of the four does in the game (see the confidence notes).
  - Freshwater animals need `max ≥ 1.005`, and marine animals need `min ≤ 1.012`, to live in a brackish tank. No shipped species qualifies, so a brackish tank holds only brackish animals.
- **Time compression** follows the freshwater conventions:
  - Incubation or gestation in game-hours ≈ real days × 8.
  - `lifespanDays` ≈ real years × ~40, capped at 500.
  - Each species' `confidenceNotes` states its own conversion.
- **Wild-caught animals.** Figure-eight puffers and archerfish are not bred in captivity, so every trade fish is wild-caught. The data says so plainly (`captiveBredAvailable: false` plus a `wildCaughtNote`), and the shop labels their offers "Wild-caught", just as it does for the other wild-only species (kole tang, mantis shrimp, foxface). Breeding for both is `not_in_game`.
- **Welfare choices.** Balloon mollies, whose shape comes from a spinal deformity, are left out. Nothing in the chapter suggests releasing animals, and every encyclopedia entry says never to release them.

## Species

### Figure-eight Puffer — *Dichotomyctere ocellatus* (`figure_eight_puffer`)

**Key values used:** adult 8 cm · min tank 15 gal · 22–28 °C (ideal 24–27) · pH 6.8–8.4 (ideal 7.3–8.2) · SG 1.002–1.012 (ideal 1.004–1.008) · GH 8–25 · KH 8–18 · group solitary_or_pair (min 1, ideal 1) · breeding `not_in_game` · classes brackish · unlock `brackish` · conservation: Data Deficient (IUCN 2019).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase — Dichotomyctere ocellatus (eyespot pufferfish)](https://www.fishbase.se/summary/Dichotomyctere-ocellatus.html) | 1 | 8 cm TL; Indochina, Malaysia and Indonesia; 22–26 °C, pH 6.5–7.5, 5–12 dH (wild); listed as freshwater; eats snails and benthic invertebrates; aggressive toward its own species; IUCN Data Deficient (2019) |
| [Seriously Fish — Tetraodon biocellatus (figure eight puffer)](https://www.seriouslyfish.com/species/tetraodon-biocellatus/) | 2 | 80 mm SL; rivers and coastal waters, often brackish; can be kept fresh but lives longer at SG ~1.005; base 75×30 cm; snails and shell-on foods wear the beak; nips slow or long-finned fish; not bred in captivity; thought to be a guarding substrate spawner |
| [Wikipedia — Dichotomyctere ocellatus](https://en.wikipedia.org/wiki/Dichotomyctere_ocellatus) | 2 | 24–28 °C; low-end brackish SG 1.005–1.008; lower Mekong, Peninsular Malaysia, Borneo; up to 15 years; greenish-yellow pattern on the back |
| [The Puffer Forum Library — The Figure Eight Puffer (Pufferpunk)](https://www.thepufferforum.com/forum/library/puffers-in-focus/fig8/) | 3 | 15 gal for one + 10 per extra; low-end brackish; brackish-kept fish live longest (18+ years recorded); all specimens wild-caught; two black eyespots each side; figure-8 not always clear; personable, but a fin-nipper |

**Explicit compatibility rules:**
- `tag:snail` → floor `high_risk`, incident risk 0.65/day: Figure-eight puffers hunt and crush snails — that is what their beak is for.
- `tag:shrimp_dwarf` → floor `high_risk`, incident risk 0.55/day (mitigated by cover): Figure-eight puffers eat small shrimp.
- `tag:shrimp_large` → floor `high_risk`, incident risk 0.35/day (mitigated by cover): Even larger shrimp get picked apart by a figure-eight puffer.
- `tag:long_fins` → floor `high_risk`, incident risk 0.35/day (mitigated by sight_breaks, tank_size): Figure-eight puffers nip long, flowing fins such as a sailfin molly’s dorsal.
- `bumblebee_goby` → floor `conditional`, incident risk 0.12/day (mitigated by hides, tank_size): Bumblebee gobies are small, slow and territorial; a puffer may nip or harass them in a small tank.

**Confidence & conflicts:**
- Salinity is the classic disagreement: FishBase lists it as a freshwater fish, Seriously Fish says it can be kept fresh but lives longer at SG ~1.005, and Wikipedia and the Puffer Forum recommend low-end brackish (1.005–1.008). The game follows the brackish consensus (ideal 1.004–1.008) and needs at least a trace of salt (1.002) — a game simplification.
- pH: FishBase gives 6.5–7.5 for wild fresh water; brackish keepers run ~8. The game tolerates 6.8–8.4 (ideal 7.3–8.2).
- Lifespan: up to 15 years (Wikipedia), 18+ recorded (Puffer Forum); 480 game-days ≈ 12 years compressed.
- Breeding: not bred in captivity — encoded as not_in_game; the clutch values are placeholders.
- The Golden and Bold-ringed variants are natural individual variation, not trade morphs.

### Bumblebee Goby — *Brachygobius doriae* (`bumblebee_goby`)

**Key values used:** adult 3.5 cm · min tank 10 gal · 22–29 °C (ideal 24–28) · pH 7–8.5 (ideal 7.4–8.2) · SG 1–1.012 (ideal 1.001–1.006) · GH 8–20 · KH 8–18 · group group (min 3, ideal 6) · breeding `cave_spawner` · classes brackish, freshwater_tropical · unlock `brackish` · conservation: Least Concern (IUCN 2018).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase — Brachygobius doriae (bumblebee goby)](https://www.fishbase.se/summary/Brachygobius-doriae.html) | 1 | 4.2 cm TL; fresh and brackish water; Indonesia, Malaysia, Brunei, Singapore; 22–29 °C, pH 8.0, 9–19 dH; 150–200 eggs; IUCN Least Concern (2018) |
| [Seriously Fish — Brachygobius doriae (bumblebee goby)](https://www.seriouslyfish.com/species/brachygobius-doriae/) | 2 | 35 mm SL; mangroves, estuaries and tidal streams over mud; 22–28 °C, pH 7.0–8.5, 8–20 dGH; salt optional (~2 g/L); small live foods essential; dried food ignored; males territorial; groups of 6+; species tank best; male guards 100–200 eggs in a cave; hatch 7–9 days; fry need infusoria then Artemia; first band covers the first dorsal; pectoral and pelvic fins black on the inner two-thirds |
| [Wikipedia — Brachygobius](https://en.wikipedia.org/wiki/Brachygobius) | 2 | 9–10 species, all sold as bumblebee gobies; freshwater and slightly brackish; about 40 L holds a dozen; eggs hatch in about 7 days; about 5 years in aquaria |
| [Seriously Fish — Brachygobius sabanus](https://www.seriouslyfish.com/species/brachygobius-sabanus/) | 2 | smaller (27 mm SL); often confused with B. doriae in the trade |

**Confidence & conflicts:**
- Identification: the trade name covers B. doriae, B. sabanus and others that are hard to tell apart (fish sold as "B. xanthozonus" almost certainly are not). Values are shared across them.
- Salinity: found in fresh and brackish water; Seriously Fish calls salt optional (~2 g/L). The game treats them as brackish-leaning (ideal SG 1.001–1.006) but lets them live in hard fresh water with a small comfort penalty.
- Hatch time: 7–9 days (Seriously Fish) vs ~7 days (Wikipedia); 8 days = 64 game-hours used.
- Compressed time: maturity (~6 months) = 9 game-days; ~5 year lifespan ≈ 200 game-days.

### Sailfin Molly — *Poecilia latipinna* (`sailfin_molly`)

**Key values used:** adult 11 cm · min tank 29 gal · 20–28 °C (ideal 23–27) · pH 7–8.5 (ideal 7.4–8.2) · SG 1–1.018 (ideal 1.002–1.012) · GH 12–30 · KH 8–20 · group group (min 3, ideal 6) · breeding `livebearer` · classes brackish, freshwater_tropical · unlock `brackish` · conservation: Least Concern (IUCN 2019).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase — Poecilia latipinna (sailfin molly)](https://www.fishbase.se/summary/Poecilia-latipinna.html) | 1 | 15 cm TL (males); Cape Fear drainage (NC) to Veracruz, Mexico; 20–28 °C; gestation ~28 days, 10–100 young; algae and plants plus small invertebrates; IUCN Least Concern (2019); potential pest |
| [USGS NAS — Sailfin molly (Poecilia latipinna) species profile](https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=858) | 1 | native range; established in AZ, CA, CO, MT, NV, TX and Hawaii; implicated in declines of desert pupfish and native Hawaiian damselflies |
| [Florida Museum (UF) — Discover Fishes: sailfin molly](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/poecilia-latipinna/) | 1 | max 150 mm TL; coastal marshes, ditches, estuaries; rows of spots merging into stripes; gestation 3–4 weeks, 10–140 young, sperm storage; melanistic and speckled wild forms |
| [Seriously Fish — Poecilia latipinna (sailfin molly)](https://www.seriouslyfish.com/species/poecilia-latipinna/) | 2 | 125 mm SL; 21–26 °C, pH 7.0–8.5, 15–35 dGH; hard water essential; salt not required; 87 L minimum; vegetable matter; low greenery stunts the male sail; males spar; two females per male; fry take baby brine from birth |
| [Aquarium Co-Op — Care guide for mollies](https://www.aquariumcoop.com/blogs/aquarium/molly-fish-care) | 2 | 24–27 °C; 20 gal minimum; hard, mineral-rich water; gestation 30–60 days |
| [Wikipedia — Fancy molly](https://en.wikipedia.org/wiki/Fancy_molly) | 2 | black molly from P. sphenops × P. latipinna crosses; high-fins add P. velifera; dalmatian/marbled, gold, lyretail and balloon varieties; colour and fin shape inherited independently |

**Confidence & conflicts:**
- Domestic mollies are hybrids of P. latipinna, P. sphenops and P. velifera (origin disputed); the game uses P. latipinna values for all of them.
- Salinity: wild fish live from fresh water to ~87 ppt. The game allows fresh water (SG 1.000) with a small comfort penalty and caps the range at 1.018 so they are not sold for marine tanks.
- Gestation: 28 days (FishBase), 3–4 weeks (Florida Museum), up to ~2 months (Seriously Fish); 30 days = 240 game-hours used.
- Genetics are simplified and partly unverified: real melanism is polygenic; "gold is recessive" and "lyretail is dominant" are common hobby claims we could not confirm in a primary source. Colour and fin shape are inherited independently (as modelled).
- Balloon mollies (a spinal deformity) are deliberately left out on welfare grounds.
- Compressed time: 3–5 year lifespan ≈ 180 game-days.

### Banded Archerfish — *Toxotes jaculatrix* (`banded_archerfish`)

**Key values used:** adult 20 cm · min tank 125 gal · 24–31 °C (ideal 25–29) · pH 7–8.5 (ideal 7.4–8.2) · SG 1.002–1.018 (ideal 1.005–1.012) · GH 10–25 · KH 8–18 · group shoal (min 3, ideal 5) · breeding `not_in_game` · classes brackish · unlock `brackish` · conservation: Least Concern (IUCN 2011).

| Source | Tier | Facts used |
|---|---|---|
| [FishBase — Toxotes jaculatrix (banded archerfish)](https://www.fishbase.se/summary/Toxotes-jaculatrix.html) | 1 | 30 cm TL, commonly 20 cm; India to the Philippines, New Guinea and northern Australia; mainly brackish mangrove estuaries; moves up rivers; 25–30 °C; surface feeder on insects; shoots them down (~150 cm); IUCN Least Concern (2011) |
| [The Australian Museum — Banded archerfish, Toxotes jaculatrix](https://australian.museum/learn/animals/fishes/banded-archerfish-toxotes-jaculatrix/) | 1 | silvery-white with 4–5 black bars on the upper half; only rarely in fresh water; tongue and palate groove form the jet; large fish shoot 2–3 m |
| [Animal Diversity Web — Toxotes jaculatrix](https://animaldiversity.org/accounts/Toxotes_jaculatrix/) | 1 | averages 25 cm; schools; aggressive when alone; shooting range ~125 cm; mangrove loss as a threat |
| [Vailati, Zinnato & Cerbino 2012, PLoS ONE — How archer fish achieve a powerful impact](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0047867) | 1 | the jet accelerates from ~2 to 4 m/s so the water gathers into one drop; impact ~200 mN, several times prey grip; ~3000 W/kg at impact |
| [Seriously Fish — Toxotes jaculatrix (banded archerfish)](https://www.seriouslyfish.com/species/toxotes-jaculatrix/) | 2 | 120 × 60 cm base for adults; pH 7.0–8.0, 20–30 dGH; juveniles can be kept fresh; brackish recommended at every stage; groups of 4–5 reduce aggression; eats small fish; takes floating foods; not bred in the hobby; thought to spawn in sea water |
| [Wikipedia — Archerfish](https://en.wikipedia.org/wiki/Archerfish) | 2 | mean shooting angle ~74°; adults almost always hit first shot; juveniles learn by watching; moves to the landing spot within ~100 ms; 5–8 years in captivity; tall lid needed — they jump |

**Explicit compatibility rules:**
- `tag:fish_tiny` → floor `high_risk`, incident risk 0.4/day: Archerfish swallow any fish small enough to fit in their mouths.
- `bumblebee_goby` → floor `high_risk`, incident risk 0.35/day (mitigated by hides, cover): A bumblebee goby is exactly the size of an archerfish snack.

**Confidence & conflicts:**
- Salinity: juveniles can be kept fresh (Seriously Fish) but adults live mainly in brackish estuaries; the game uses a brackish range (ideal SG 1.005–1.012) for all ages.
- Size: FishBase 30 cm TL vs Seriously Fish 300 mm SL; aquarium adults are usually 15–20 cm, so 20 cm is used. Tank size follows Seriously Fish (120 × 60 cm base → 125 gal).
- Spitting: real range is 1.25–3 m at a steep ~74° angle; the game keeps the jet inside the tank’s air gap and treats it as a signature behaviour, not a hunting mechanic.
- Bar count: 4–5 (Australian Museum) vs 4–6 (Wikipedia).
- Compressed time: 5–8 year captive lifespan ≈ 300 game-days.

## Brackish water (the `brackish` water class)

- **Target:** SG 1.004–1.012 ideal (tolerated 1.003–1.018), 24–28 °C, pH 7.5–8.3, KH 6–14, GH 8–20. New water is mixed at SG 1.008, which is about a third of sea strength (`saltStrength('brackish') ≈ 0.32`).
- **Salt:** brackish water uses ordinary marine salt mix, scaled by strength. Water changes use about 0.3× the salt of a marine tank of the same size (`waterChangeCost`). The daily running-cost estimate in `tankDailyCost` scales the same way. Salt dosing raises SG by at most 0.001 per dose.
- **Carbonate chemistry:** pH, dissolved CO₂ and organic acids are blended between the freshwater and sea-water models by salt fraction (`equilibriumPH(kh, co2, marine, saltFrac)` in `src/sim/water/chem.ts`). At SG 1.008 with KH 8, the water settles near pH 7.8, in the middle of the class's ideal band. A stocked fixture stays within 0.05 pH over ten game days.
- **Reports:** the salinity line reads GOOD, WATCH or DANGER, with advice written for brackish water: "about a third of reef strength … no more than 0.001 a day". For too-high salinity it says to top off with fresh water and mix the next change weaker. Estuary fish are euryhaline, so water that drops below their minimum stresses them, but harm builds at only 35% of the usual rate. The stressor text says so plainly.
- **Conversion:** a tank can be converted to brackish only after the Brackish Estuaries research. A one-step change (fresh ↔ brackish ↔ marine) keeps about 70% of the filter's maturity, because nitrifying bacteria adapt to a single step in salinity. Fresh ↔ marine still starts the cycle from scratch. Substrate that suits the new water is kept. Plants that tolerate low-end brackish water (Java fern, anubias, Java moss, vallisneria, crypts) stay in the tank. The others go to storage.

## Conflicts & uncertainty

1. **Fresh or brackish?**
   - *Figure-eight puffer:* FishBase lists it as freshwater. Seriously Fish says fish can be kept fresh but live longer at SG about 1.005. Wikipedia and the Puffer Forum recommend 1.005–1.008. The game follows the brackish consensus and needs at least a trace of salt.
   - *Bumblebee goby:* found in fresh and brackish water. Seriously Fish calls salt optional (about 2 g/L). The game lets them live in hard fresh water with a small comfort penalty, but their ideal is 1.001–1.006.
2. **How salty they can go.**
   - Mollies have been found at up to about 87 ppt, and archerfish may move into sea water to spawn.
   - The game caps both at SG 1.018. That keeps the chapter a brackish exhibit and stops them being sold for marine tanks.
3. **Sizes and tank sizes.**
   - *Archerfish:* FishBase gives 30 cm TL, while Seriously Fish gives 300 mm SL. Aquarium adults reach 15–20 cm, and the game uses 20 cm.
   - *Tank sizes:* Seriously Fish's 120 × 60 cm base sets the archerfish at 125 gallons. The Puffer Forum's "15 + 10 per extra" rule sets the puffer. Sailfin mollies (Seriously Fish 87 L, Aquarium Co-Op 20 gal) are set at 29 gallons to give the male's sail swimming room.
4. **Molly gestation and genetics.**
   - *Gestation:* 28 days (FishBase), 3–4 weeks (Florida Museum), or up to 2 months (Seriously Fish). The game uses 30 days.
   - *Genetics:* "Gold is recessive" and "lyretail is dominant" are common hobby claims. We could not confirm either in a primary source, and they are marked as such. Real melanism is polygenic.
5. **Bumblebee goby identity.** The trade name covers *B. doriae*, *B. sabanus* and others. Fish sold as *B. xanthozonus* almost certainly aren't that species. Hatch time is 7–9 days according to Seriously Fish and about 7 days according to Wikipedia.
6. **Archerfish spitting.**
   - *In the wild:* the range is 1.25–3 m at a mean angle of about 74°. The jet speeds up as it flies (about 2 → 4 m/s), so the water gathers into one drop (Vailati et al. 2012).
   - *In the game:* the jet stays inside the tank's air gap. The behaviour is cosmetic and does not feed the fish in the sim, which is a game abstraction.

## Visual notes for render lanes

All colours are 6-digit hex values, validated by `tests/sim/species-brackish.test.ts`. The first matching `base` phenotype wins, and every matching `overlay` is then applied in order.

| Species | `finType` | Base pattern | Key marks | Sex differences |
|---|---|---|---|---|
| Figure-eight puffer | `puffer` | `reticulated` | Dark olive back with yellow-green vermiculation. Two yellow-ringed dark ocelli on each upper flank, and the back lines often loop into a figure-8. Clean white belly and a gold-green iris. | None visible |
| Bumblebee goby | `goby` | `bands` | Four black bands on yellow. The first covers most of the first dorsal fin. Pectoral and pelvic fins are black on their inner two-thirds. Fused pelvic disc. | Spawning males are slimmer and orange; females are rounder and bright yellow |
| Sailfin molly | `sailfin` / `lyretail` | `spots` (wild), `solid`, `dalmatian` | Wild fish are silver-grey with rows of dark spots merging into stripes, and the sail is blue-sheened with an orange margin (`finColor2`). The Black, Dalmatian and Gold morphs follow the phenotype colours. | Males have the tall sail and a gonopodium; females are deeper-bodied with a small dorsal |
| Banded archerfish | `archer` | `bands` | Silvery-white with an olive back and 4–5 black wedge bars on the upper half, the first through the eye. Straight dorsal profile, pointed snout, large forward eyes and an upturned mouth. | None visible |

## Sources opened

- FishBase: [Dichotomyctere ocellatus](https://www.fishbase.se/summary/Dichotomyctere-ocellatus.html), [Brachygobius doriae](https://www.fishbase.se/summary/Brachygobius-doriae.html), [Brachygobius xanthozona](https://www.fishbase.se/summary/Brachygobius-xanthozonus.html), [Poecilia latipinna](https://www.fishbase.se/summary/Poecilia-latipinna.html), [Toxotes jaculatrix](https://www.fishbase.se/summary/Toxotes-jaculatrix.html) (Tier 1)
- [USGS NAS — Sailfin molly](https://nas.er.usgs.gov/queries/FactSheet.aspx?speciesID=858), [Florida Museum — Sailfin molly](https://www.floridamuseum.ufl.edu/discover-fish/species-profiles/poecilia-latipinna/), [Animal Diversity Web — Toxotes jaculatrix](https://animaldiversity.org/accounts/Toxotes_jaculatrix/), [Australian Museum — Banded archerfish](https://australian.museum/learn/animals/fishes/banded-archerfish-toxotes-jaculatrix/), [Vailati, Zinnato & Cerbino 2012, PLoS ONE](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0047867) (Tier 1)
- Seriously Fish: [Tetraodon biocellatus](https://www.seriouslyfish.com/species/tetraodon-biocellatus/), [Brachygobius doriae](https://www.seriouslyfish.com/species/brachygobius-doriae/), [Brachygobius sabanus](https://www.seriouslyfish.com/species/brachygobius-sabanus/), [Poecilia latipinna](https://www.seriouslyfish.com/species/poecilia-latipinna/), [Poecilia sphenops](https://www.seriouslyfish.com/species/poecilia-sphenops/), [Toxotes jaculatrix](https://www.seriouslyfish.com/species/toxotes-jaculatrix/) (Tier 2)
- [Aquarium Co-Op — Care guide for mollies](https://www.aquariumcoop.com/blogs/aquarium/molly-fish-care) (Tier 2)
- Wikipedia: [Dichotomyctere ocellatus](https://en.wikipedia.org/wiki/Dichotomyctere_ocellatus), [Brachygobius](https://en.wikipedia.org/wiki/Brachygobius), [Gobiidae](https://en.wikipedia.org/wiki/Gobiidae), [Sailfin molly](https://en.wikipedia.org/wiki/Sailfin_molly), [Fancy molly](https://en.wikipedia.org/wiki/Fancy_molly), [Amazon molly](https://en.wikipedia.org/wiki/Amazon_molly), [Archerfish](https://en.wikipedia.org/wiki/Archerfish) (Tier 2)
- [The Puffer Forum Library — The Figure Eight Puffer](https://www.thepufferforum.com/forum/library/puffers-in-focus/fig8/) and [Feeding your puffers](https://www.thepufferforum.com/forum/library/feeding/feeding-your-puffers/) (Tier 3)
