# Brackish species research — lane brackish

This document is the research record behind the estuary chapter: the six brackish `SpeciesDefinition`s in `src/data/species/brackish/` (the silver mono and spotted scat, chunk 17, at the end) and the brackish water class. For each species it lists the sources used, the key values encoded, the explicit compatibility rules, and its confidence and conflicts. It ends with the brackish water model, the cross-cutting **Conflicts & uncertainty**, and the **Visual notes for render lanes**.

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

---

# Chunk 17: the silver mono and the spotted scat (ADR-0053)

These two sections were written by hand from the chunk 17 research (not generated from the data files). The research's cross-species notes, sources and source check are in [freshwater.md](freshwater.md#chunk-17-koi-and-the-motoro-stingray-adr-0053).

### About the research
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

## Silver mono
*Monodactylus argenteus* (Linnaeus, 1758): valid (FishBase, Fishes of Australia); silver moony, diamondfish, "mono argentus" · `chromis` behaviour set (open-water school) · `not_in_game`

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Monodactylus-argenteus.html) | 1 | **27 cm SL max**, 12 cm common; marine, brackish and fresh; **24–28 °C**; bays, mangrove estuaries, tidal creeks, lower freshwater streams; **usually only juveniles enter fresh water**; **large schools; small juveniles solitary or in small groups**; plankton and detritus; "highly territorial"; Lm 13 cm; **IUCN LC (2016)**; harmless |
| [Fishes of Australia](https://fishesofaustralia.net.au/home/species/581) | 1 | 25 cm SL; jetties and pilings; **juveniles common in estuaries and often enter fresh streams**; **adults silvery with black-dusky leading edges and black tips on the dorsal and anal fins; small juveniles have a yellow dorsal and two vertical bars on the head**; plankton and detritus |
| [Thomas et al. (ICAR-CIBA), WAS APA 2019 abstract](https://was.org/Meeting/Program/PaperDetail/153808); 2020 *Aquacult. Res.* (via search summary) | 1 | **First captive breeding, a hatchery result**: LHRHa hormone, **31 ppt** sea water, spawning ~36 h after injection, **4,040 eggs**, **hatch 18–20 h at ~28–29 °C**, larvae on rotifers, copepods and *Artemia*, metamorphosis from ~day 23 to 32 |
| [Wikipedia](https://en.wikipedia.org/wiki/Monodactylus_argenteus) | 3 | Juveniles more yellow, with **two black bands, through the eye and behind the gill cover**; adults bright silver with yellowish fin edges and black-tipped dorsal and anal fins; very salinity-tolerant |
| [LiveAquaria](https://www.liveaquaria.com/product/996/?pcatid=996) | 2 | 10 in; **130 gal minimum** (its text also says 50, a conflict); 72–78 °F; **pH 8.1–8.4; SG 1.020–1.025** (adults); **small fish may be kept fresh and should be moved gradually from brackish to sea water as they grow**; mostly vegetable diet (seaweed, lettuce), brine shrimp, flakes; **sexes look alike, breeding unknown**; **$65.99** |
| [Aquatics Unlimited (brackish)](https://aquaticsunlimited.com/product/brackish-mono-argentus-monodactylus-argenteus/) | 2 | **90 gal for a small group, 150+ as they grow**; 76–84 °F; pH 7.0–8.0; KH 8–12; SG 1.008–1.012 in brackish; **juveniles may spend time in fresh water but need brackish long-term; adults prefer full marine**; **groups of 6+, all added together (hierarchy)**; eats soft-leaved plants; nitrate under 20 ppm; scats and archers common companions; **$29.99** |
| [ProAquatix](https://proaquatix.com/?p=9672) | 2 | Juveniles 2–3 in live in fresh water and move to estuaries as they mature; weaned onto pellets and flakes; mysis, brine shrimp, squid; reef-safe |
| [Gensou (Singapore shop blog)](https://gensou.sg/?p=33043) | 3 | **SG by size**: juveniles fresh to 1.005; sub-adults 1.010–1.015; **adults 1.018–1.025**; raise ≤0.002 a week, 1.012 by 12 cm, 1.018 by 18 cm; **school of 5+, ideally 7+; lone monos nervous and fin-damaged**; **400 L, 150 × 60 cm for five adults**; **"startled monos jump powerfully"**; ≥30% vegetable diet; **8–12 years** |

**Modelled as:**
- 25 cm adult.
- `recommendedMinTankGallons 180`, footprint 72 × 24 for a school of 6. The 240-gal tier is better for 7+.
- `environment 'brackish'`; classes `brackish`, `marine_fowlr` and `marine_live_rock`.
- **One salinity range spanning both:** `{ min: 1.003, max: 1.026, idealMin: 1.010, idealMax: 1.022 }`, which (see below):
  - keeps monos out of freshwater tanks (`min` > 1.001);
  - lets adults live in marine tanks (`max` ≥ 1.020);
  - puts the ideal band across high brackish and low marine.
- A school (min 5, ideal 7), `escapeArtist`, `outgrowsSmallTanks`.
- Not bred in home tanks (only hormone-induced in a hatchery in sea water): `not_in_game`.
- Lifespan 400; no morphs (intensity locus).

**Conflicts:**
1. **Fresh water:** LiveAquaria and ProAquatix say juveniles can be fresh; Aquatics Unlimited says brackish long-term; FishBase says usually only juveniles enter fresh water. The game makes no freshwater placement. Conservative: fresh water shortens their lives; the shop sells juveniles for brackish tanks.
2. **Adult salinity:** brackish 1.008–1.012 (AU) vs 1.020–1.025 (LiveAquaria) vs 1.018–1.025 (Gensou). The game's single ideal band, 1.010–1.022, is a compromise.
3. **Tank size:** 90 → 150+ gal (AU), 130 (LiveAquaria), 400 L for 5 (Gensou). The game uses 180 for 6.
4. **Temperament:** "highly territorial" (FishBase) and semi-aggressive (LiveAquaria) vs peaceful but pushy adults (AU). The game uses semi_aggressive, tension within the school.
5. **Lifespan:** 8–12 years (Gensou, Tier 3); nothing in Tier 1. 400 game days.
6. **Reef:** ProAquatix says reef-safe; AU says it eats soft plants. The game uses mostly_safe.

**Colour forms:** none in the trade. *Monodactylus sebae* (African moony) is a separate species and is not modelled here.

### Encoding the age shift in the single-range salinity model
- **Option A (no code; recommended now):** one `salinitySG` range from juvenile to adult needs:
  - `min 1.003`, so it can't be sold for fresh water;
  - `max 1.026` (adults at full marine strength);
  - ideal 1.010–1.022.
  
  In a brackish tank run high (1.012–1.018) both juveniles and adults stay in the ideal band, and adults also fit FOWLR tanks. The encyclopedia and keeper tip tell players to raise salinity as the school grows ("1.012 by 12 cm, 1.018 by 18 cm"). Side effect: `offIdealEnvironmentNote` will tell a marine keeper "brackish suits them best", which is wrong for adults. Suppress the note when `salinitySG.max ≥ 1.024`, or reword it for this case.
- **Option B (small code, data only, save-safe):** an optional `salinityByStage?: { juvenile?: ParamRange; adult?: ParamRange }` on `SpeciesDefinition`, which the water-comfort check reads by the creature's life stage. `salinitySG` stays as the union for the purchase gate and `fitsEnvironment`.
  - Mono: juvenile `{1.000, 1.015, 1.003, 1.010}`, adult `{1.008, 1.026, 1.018, 1.025}`.
  - Scat: juvenile `{1.000, 1.018, 1.005, 1.012}`, adult `{1.008, 1.026, 1.015, 1.025}`.
  
  A grown mono in a low brackish tank then shows WATCH with "raise the salinity as they grow". The same field serves the scat.

### Game data
The values the game uses are in `src/data/species/brackish/silver_mono.ts`; this research proposed them, and the source check at the end of this chapter corrected some of them.

**Genetics:** `intensityLocus('No trade morphs; juveniles yellow-finned with two black head bars, adults silver.')` plus `intensityOverlay({ finColor: '#f0cc4a', patternContrast: 1 })`.

- body `#d8dde0`, body2 `#b7c0c6`, belly `#eef1f2`;
- fins (dorsal and anal) `#e6c24a`, finColor2 (black tips and leading edges) `#1a1a1a`;
- accent (the two head bars in juveniles; faint in adults) `#1c1c1c`;
- eye `#2a2a2a`;
- pattern bars; patternScale 1; patternContrast 0.5; iridescence 0.35; metallic 0.65; translucency 0.1;
- finType `mono`; finLength 1.3; bodyDepth 1.15 (a diamond shape).

### Young and sexes (mono)
- **Juveniles:** strongly yellow dorsal (and anal) fins; two black vertical bars, one through the eye and one behind the gill cover (FoA; Wikipedia).
- **Adults:** bright silver diamonds. The fin yellow fades to the edges, the bars fade (AU), and the tips of the dorsal and anal fins are black.
- **Sexes:** look alike (LiveAquaria).
- The pelvic fins are tiny: the name means "one finger". The art can omit them.

### Behaviour (mono)
- **Movement:** a fast, tight, flashing school in open midwater, turning together.
- **Mood:** skittish. It bolts and can **jump** when startled (Gensou, Tier 3). It calms in bigger schools and looks off-colour alone.
- **School:** a pecking order; adults jostle.
- **Feeding:** takes food at the surface and in midwater, nibbles soft plants, and picks at algae.
- **Night:** a loose, slow school in midwater; not nocturnal.
- **Closest set:** `chromis` (school + forage), with a higher burst and startle sensitivity. A new set isn't required.

### Compatibility (mono)
| Other | Verdict | Reason | Sources |
|---|---|---|---|
| Spotted scat | excellent | Same water, size and diet; the classic estuary pairing | AU; TFH |
| Banded archerfish | usually_compatible | Common companions; the archer caps at SG 1.018, so the tank runs at the brackish top end | AU; TFH |
| Sailfin molly | usually_compatible | A brackish companion for juvenile scats and monos; the molly caps at SG 1.018 | TFH |
| Figure-eight puffer | conditional | Fin-nipper; SG ≤1.012 vs adult monos higher | Repo data |
| Bumblebee goby | high_risk | Too small; outcompeted; near-fresh water | Repo data |
| Freshwater species (incl. all new freshwater species) | incompatible | Salinity (a mono's min is 1.003) | – |
| Marine (in a FOWLR tank): blue tang, naso tang, queen angelfish | conditional | Adults share sea water (LiveAquaria SG 1.020–1.025); big angels and tangs need very large tanks, and fast monos win at feeding | LiveAquaria |
| Clown triggerfish | high_risk | A notoriously aggressive trigger that attacks open-water fish | (trigger researcher) |
| Panther grouper, miniatus grouper | high_risk / incompatible | Ambush predators that swallow fish up to ~15 cm; juvenile monos are prey | Repo data (miniatus maxPrey 15) |
| Dwarf lionfish | conditional | Eats juvenile monos under ~7 cm | Repo data |
| Coral catshark, epaulette, bamboo shark | conditional | Night-hunting bottom sharks; monos stay in midwater | (shark researchers) |
| Reef corals | mostly_safe | Planktivore; ProAquatix says reef-safe | ProAquatix |

### Smallest tank tier for an adult (mono)
**180 gal (72 × 24 × 25 in)** for the minimum school of 5–6. The 240-gal tier (96 × 24) is advised for 7+. The 125 gal (72 × 18) is too narrow for a school of 25 cm fish.

---

## Spotted scat
*Scatophagus argus* (Linnaeus, 1766): valid. *S. rubrifrons* Myers 1936 and *Chaetodon atromaculatus* Bennett 1830 are junior synonyms (FishBase, Catalog of Fishes). Green scat, ruby or red scat, argusfish · `rabbitfish` behaviour set (grazing cruiser) · `not_in_game`

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Scatophagus-argus.html) | 1 | **45 cm TL max, 20 cm common**; marine, brackish and fresh; amphidromous; **20–28 °C**; harbours, estuaries, lower streams, mangroves; worms, crustaceans, insects, plants; Lm 14 cm; multiple spawner; **dorsal, anal and pelvic spines venomous**; **IUCN LC (2009)**; juveniles have eye-sized blotches or 5–6 dark bars; spots faint in large adults |
| [FishBase: Scatophagidae](https://fishbase.se/summary/FamilySummary.php?ID=341) | 1 | **4 species**: *Scatophagus argus*, *S. tetracanthus* (African scat), *Selenotoca multifasciata*, *S. papuensis* |
| [Catalog of Fishes: *atromaculatus*](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=38363) (via search summary) | 1 | *Chaetodon atromaculatus* is a synonym of *S. argus* |
| [Fishes of Australia](https://fishesofaustralia.net.au/home/species/2212) | 1 | 33 cm SL; sheltered bays, mangrove creeks, lower freshwater streams; **adults school; small juveniles solitary; tiny juveniles float at the surface**; omnivorous scavenger of algae, detritus and small invertebrates; **small juveniles have dark and whitish-yellow bars, reddish-orange patches on the head and back, and reddish dorsal and pelvic fins**; adults silvery to green-brown with brown to red-brown spots, faint in big adults; pelagic "tholichthys" larva; **venom glands at the spine bases** |
| [Fishes of Australia: *Selenotoca multifasciata*](https://fishesofaustralia.net.au/home/species/2213) | 1 | Striped or banded scat: **a separate genus**, silvery with dark vertical bars, venomous spines |
| [Xiao et al. 2019, genome survey (PMC6940847)](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6940847/fullTextXML) | 1 | Moves directly from fresh to sea water; **"the female grows significantly faster and larger than males"**; XY sex system; aquaculture fingerlings are mostly wild-caught |
| [Wikipedia](https://en.wikipedia.org/wiki/Scatophagus_argus) | 3 | 38 cm; fry in fresh water, moving to salt as they mature; **two colour morphs, green and ruby or red**; adults mainly herbivorous in one study; **females mature at 7–9 months**; spawning triggered by monsoon rains; eggs 0.7 mm; **hatch ~20 h**; venom causes severe pain |
| [TFH Magazine](https://tfhmagazine.com/articles/saltwater/scatophagus-argus) | 2 | Usually up to 38 cm; **juveniles in estuaries and barely brackish rivers; adults best in full marine water; fresh water causes poor growth and health**; **6–8 ft tank for a school**; substantial plant matter; active, friendly, pet-like; **follows archerfish to steal the insects they shoot down**; green, yellow and red individuals; **"S. rubifrons" an invalid name, and colour varies with individual, origin and age**; **no confirmed captive breeding**; tankmates for juveniles: monos, gobies, mollies, archers |
| [Practical Fishkeeping: The mucky mouths](https://www.practicalfishkeeping.co.uk/features/the-mucky-mouths/) | 2 | Brackish is optimal; start at **10–15 ppt**; stable salinity; **always keep in groups, added together**; greedy, so target-feed tankmates; **heavy bioload**. It calls the red or ruby scat a subspecies "*S. argus arromaculatus*" (see conflicts) |
| [Aquarium Glaser](https://www.aquariumglaser.de/en/fish-archives/scatophagus-argus-2) | 2 | "rubifrons" is a fanciful dealer name; **small red scats are striped and turn spotted at 4–5 cm**; usually 15–20 cm, max ~30; **pH never below 7.5 for long**; free spawners; **won't spawn in fresh water** |
| [Aquatics Unlimited: red or ruby scat](https://aquaticsunlimited.com/product/brackish-scat-red-ruby-scatophagus-argus-rubifrons/) | 2 | **$19.99–59.99**, sold at 1–3 in; adults ~15 in; **55 gal for a group, 125+ "more ideal"**; 72–78 °F; pH 7.2–8.5; KH 8–12; **SG 1.010–1.025**; omnivore (spirulina mixes, frozen, flakes, pellets); **groups of 6+ added together (hierarchy)**; **juvenile red and stripes lost at maturity**; **venomous dorsal and ventral spines; soak a sting in hot water 15–20 min** |
| [Reeflings](https://reeflings.com/species/scatophagus-argus), [Guidarium](https://guidarium.com/fishes/scat-brackish) | 3 | SG 1.005–1.025; reef safe "caution"; "will consume any aquatic plants" |
| Search summaries of scat lifespan pages ([The Aquarium Paradise](https://theaquariumparadise.com/fishes/spotted-scat), [aqua-fish.net](https://en.aqua-fish.net/fish/spotted-scat)) | 3 | **10–20 years** in aquaria |

**Modelled as:**
- 30 cm adult (aquaria 15–20 cm usual per Glaser, up to 38 per TFH; FishBase 45 TL max).
- `recommendedMinTankGallons 240`, footprint **96 × 24** (TFH's 6–8 ft for a school; AU's 125+).
- Brackish with an adult marine reach: the same encoding as the mono, ideal 1.010–1.022.
- `venomous`, `heavyWaste`, `outgrowsSmallTanks`; plantSafe unsafe, reefSafe unsafe.
- A group (min 4, ideal 6).
- `not_in_game`, lifespan 500 (cap).
- Genetics: the intensity locus plus a "Ruby" juvenile colour phase (natural variation, not a line).

**Conflicts:**
1. **Red or ruby scat.** PFK calls it a subspecies "*S. argus arromaculatus*". No such subspecies is valid: *atromaculatus* and *rubrifrons* are junior synonyms of *S. argus* (Catalog of Fishes, FishBase). TFH and Glaser call the names invalid dealer names. AU and FoA show the red is a **juvenile colour that is lost at maturity**; TFH says it depends on individual, origin and age. **The game treats ruby as a juvenile colour phase of unknown cause, not an inherited form.** No source documents its inheritance.
2. **Which sex is larger.** The genome paper (Tier 1) says females grow faster and larger; Glaser (Tier 2) says males do. The game uses females larger but sets no `maleSizeFactor`, as there is no figure.
3. **Salinity for adults:** full marine (TFH) vs 10–15 ppt (PFK) vs 1.010–1.025 (AU). The game uses the single range, with Option B as the better encoding.
4. **Tank:** 55 → 125+ (AU), 200 L (Reeflings), 6–8 ft (TFH). The game uses 8 ft, 240 gal, for an adult school.
5. **"Tiger scat."** No source found uses it for *Selenotoca multifasciata*, which is sold as silver, striped or banded scat. Either way, *Selenotoca* (and the African *S. tetracanthus*) are separate species and are **not** modelled as *S. argus* forms.

**Breeding:** not in home tanks.
- No confirmed captive breeding in aquaria (TFH); it won't spawn in fresh water (Glaser).
- Aquaculture spawns it in salt water (25–35 ppt gave better fertilisation in a PSU hatchery thesis, from a search summary).
- Real numbers: eggs 0.7 mm, hatch in ~20 h, females mature at 7–9 months (Wikipedia citing the Philippine study).

### Game data
The values the game uses are in `src/data/species/brackish/spotted_scat.ts`; this research proposed them, and the source check at the end of this chapter corrected some of them.

**Genetics:**
- `intensityLocus('Green to yellowish adults; red "ruby" juveniles are a colour phase, not a known heritable line.')` plus `intensityOverlay({ bodyColor: '#8ea06a', patternContrast: 1 })`.
- An optional `ruby` locus: alleles `n` (0.75) and `rb` (0.25), mode 'additive', note "inheritance unknown; scats are not bred, so this only sets how often shops stock ruby-phase juveniles". Its overlay `ruby` sets bodyColor2 `#b5482e` and accent `#5a1e14`, and should be drawn **only while the fish is a juvenile**. That needs renderer age support; if there is none, drop the locus and keep ruby as a juvenile tint chance in the art.

- body `#9aa77c` (silvery green), body2 `#7c8758` (back), belly `#dfe2cf`;
- fins `#8d9466`, finColor2 `#4a4a30`;
- accent (the spots) `#3a2e1e`, red-brown in some adults;
- eye `#2c2418`;
- pattern spots; patternScale 0.9; patternContrast 0.75; iridescence 0.15; metallic 0.3; translucency 0.1;
- finType `scat`; finLength 1; bodyDepth 1.15.

**Juvenile visual:** bars (`pattern: 'bars'`, accent `#2a2418`, ground `#e8e2b8`), reddish-orange patches on the head and back `#d0622c`, and reddish dorsal and pelvic fins. It changes to spots at about 4–5 cm (Glaser).

### Young and sexes (scat)
- **Tiny juveniles:** float at the surface like leaves (FoA) and are solitary.
- **Small juveniles:** alternating dark and whitish-yellow bars, reddish-orange patches on the head and along the back, and reddish dorsal and pelvic fins (FoA). Some have a few large blotches instead (FishBase). Ruby juveniles carry much more red (AU; TFH).
- **From about 4–5 cm:** the bars break into spots (Glaser).
- **Adults:** silvery-green to brown with dark spots, faint and limited to the upper flanks in big adults (FoA, FishBase). The forehead is steep and the body deep and compressed.
- **Sexes:** the female grows larger and faster (genome paper); no reliable external sign is documented. Glaser says males are higher-backed with a steeper forehead (conflict noted).

### Behaviour (scat)
- **Movement:** a busy, active roamer in midwater and low water. It grazes constantly, picking at rock, roots, glass and plants (FoA; TFH).
- **Feeding:** greedy and fast at feeding time; begs at the glass and becomes pet-like (TFH).
- **Play:** chases tankmates and its own kind through roots and branches (TFH).
- **Signature:** **follows archerfish and steals insects they shoot down** (TFH). The game could hook it to the archerfish `spit` act: a nearby scat darts to where the drop lands.
- **Tiny young:** drift at the surface.
- Not nocturnal; no burrowing.
- **Closest set:** `rabbitfish` (cruise + inspect décor), with a grazing "pick" act like the chunk-16 wrasse's `picker`. A new set isn't required.

### Compatibility (scat)
| Other | Verdict | Reason | Sources |
|---|---|---|---|
| Silver mono | excellent | Same water, size and diet | AU; TFH |
| Banded archerfish | usually_compatible | Classic companions; the archer caps at SG 1.018 | TFH; AU |
| Sailfin molly | usually_compatible | Suggested for juvenile scats | TFH |
| Figure-eight puffer | conditional | Fin nipping; salinity mismatch | Repo data |
| Bumblebee goby | high_risk | Starved out or eaten; near-fresh water | Repo data |
| All freshwater species (incl. new freshwater species) | incompatible | Salinity; fresh water causes poor growth (TFH) | TFH |
| Marine FOWLR: blue tang, naso tang, queen angelfish | conditional | Share adult marine water. Scats compete hard for algae and greens (tang food) and graze rock; tank size | TFH; AU |
| Clown triggerfish | high_risk | Aggressive | (trigger researcher) |
| Panther grouper, miniatus grouper | high_risk | Swallow juveniles; adults deep-bodied and 30 cm, so safer once grown | Repo data |
| Sharks (catshark, epaulette, bamboo) | conditional | Bottom night hunters; scats in midwater | (shark researchers) |
| Reef corals, plants | high_risk / incompatible | Grazes soft corals and eats plants | Guidarium; Reeflings |

### Smallest tank tier for an adult (scat)
**240 gal (96 × 24 × 25 in)** for a group of 4–6 adults. A 180 (72 × 24) holds juveniles and sub-adults; the 125 is too narrow.

---
