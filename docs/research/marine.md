# Marine species research — lane species-marine

Research notes behind every marine `SpeciesDefinition` in Aquarium Go: the 2 marine starters (`src/data/species/ocellaris_clownfish.ts`, `src/data/species/lined_seahorse.ts`) and the 18 unlockable species in `src/data/species/marine/`. Researched September 2026.

**Source tiers.** Tier 1 means FishBase/SeaLifeBase, Animal Diversity Web (ADW), accredited public aquariums (Monterey Bay Aquarium, National Aquarium), NOAA, the IUCN and peer-reviewed papers. Tier 2 means established retailers and producers (LiveAquaria, ORA, Biota, Bulk Reef Supply, Top Shelf Aquatics), long-running hobby magazines (TFH, CORAL) and reviewed care sheets. Tier 3 means hobby guides and Wikipedia summaries, used for edge cases only.

**Access notes.** Most URLs were fetched and read during research. A few publisher pages refused automated access (Springer, Wiley, ScienceDirect, Nature, PubMed). For those papers only the abstract was seen, through a search index, and each one is marked *(abstract via search index)*.

**Time compression** follows the starter seeds:
- incubation or gestation game-hours ≈ real days × 8
- `maturityDays` stays between 8 and 25
- `lifespanDays` ≈ real years × 40, capped at 500
- `hungerHours` is 10–18 for small reef animals and 36–44 for big predators
- `baseValue` is the typical US retail price, using captive-bred stock where it exists

---

## Ocellaris clownfish
*Amphiprion ocellaris* · starter · `clownfish`

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Amphiprion-ocellaris.html) | 1 | max 11 cm TL; 1–15 m; protandrous; 3 natural host anemones; males guard and aerate eggs; **IUCN Least Concern, assessed 3 Feb 2021**; 12 yr in captivity |
| [ADW](https://animaldiversity.org/accounts/Amphiprion_ocellaris/) | 1 | hierarchy; 100–1,000 eggs; incubation 6–8 d; larvae 8–12 d; omnivore |
| [Monterey Bay Aquarium](https://www.montereybayaquarium.org/animals/animals-a-to-z/clownfish) | 1 | all start male; mucus protects in anemone; buy captive-raised |
| [LiveAquaria — Proaquatix captive-bred](https://www.liveaquaria.com/product/3409/?pcatid=3409) | 2 | 20 gal min; 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025; eggs hatch 6–11 d; ~$30 |
| [Klann et al. 2021, EvoDevo](https://pmc.ncbi.nlm.nih.gov/articles/PMC8214269/) | 1 | Snowflake = irregular bars; Gladiator het → Platinum/Wyoming White hom; Black = wild melanistic population; misbar partly environmental |

**Changes from the seed:**
- The IUCN status now reads Least Concern (2021) instead of "verify".
- The tolerated minimum temperature drops from 23 to 22 °C to match LiveAquaria.
- Clutch size is now 100–1,000 (ADW).
- `unlock.requires = ['marine_basics']` matches the freshwater starters' convention. The shop still always offers the player's own starter.
- A hostNote says no anemone is needed.
- A conditional exception rule was added against the seahorse, and a positive interaction with the cleaner shrimp.

Ids, locus ids (`snow`, `mel`, `misbar`) and phenotype ids are unchanged.

**Confidence:** high. **Conflicts:** the game merges two real white-bar mutations, Snowflake and the Platinum line, into one codominant locus, and says so in the locus note.

## Lined seahorse
*Hippocampus erectus* · starter · `seahorse`

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Hippocampus-erectus.html) | 1 | 17.8 cm SL max; **IUCN Vulnerable (A2cd), assessed 3 Oct 2016**; **CITES App. II**; gestation 20–21 d |
| [ADW](https://animaldiversity.org/accounts/Hippocampus_erectus/) | 1 | prehensile tail; very slow swimmer; daily greetings; 250–650 eggs; captive lifespan avg 4.7 yr; fry feed 10 h/day |
| [Giwojna, TFH — Seahorse Reef pt 1](https://www.tfhmagazine.com/articles/saltwater/a-seahorse-reef-part-1-reef-compatibility-of-hippocampus-spp) | 2 | exclude anemones and fire coral; Euphyllia/Catalaphyllia sting harder than most anemones; soft corals fine; avoid Tridacna clams; best 23–24 °C, avoid >27 °C |
| [Bulk Reef Supply seahorse guide](https://www.bulkreefsupply.com/content/post/seahorse-aquarium-how-to) | 2 | 30 gal/pair +10 per extra; ≥18" tall; 72–78 °F; low–medium flow; avoid stinging corals and aggressive fish; feed 2–3×/day; captive-bred |
| [Chewy Education (reviewed)](https://www.chewy.com/education/fish/saltwater-fish/how-to-care-for-a-pet-seahorse) | 2 | 30 gal/pair; 70–78 °F; feed-mode flow; avoid angelfish, damsels, tangs, anemones |

**Changes from the seed:**
- Gestation is now 164 game-hours (20.5 d × 8).
- Clutch size is now 250–650.
- Lifespan is now 200 game-days (about 5 yr).
- The conservation text gives the assessment year.
- `unlock.requires = ['marine_seahorse']`.
- `special.stingSensitive` is set (a new optional field).
- Exception rules were added:
  - high risk against `tag:tang`, `coral_beauty` and `foxface_rabbitfish`
  - conditional against `green_chromis` and `ocellaris_clownfish`
  - incompatible against the three predators and `tag:stinging_cnidarian`

**Conflicts:**
1. Sources disagree about SPS corals. Giwojna says they have weak stings; other keepers avoid them. The game flags only anemones, fire coral and strong LPS.
2. ADW gives a birth size of ~1.6 cm, while breeder reports are smaller. The seed's 0.7 cm is kept.
3. The 29-gallon starter tank is treated as the practical equivalent of the "30 gal per pair" rule.

## Skunk cleaner shrimp
*Lysmata amboinensis* · `shrimp_cleaner`

| Source | Tier | Facts used |
|---|---|---|
| [LiveAquaria](https://www.liveaquaria.com/product/696/?pcatid=696) | 2 | cleaning stations; reef-safe; SG 1.023–1.025; copper/nitrate intolerant; iodine for molts; avoid hawkfish, lionfish, crabs; ~$45 |
| [Caves, Chen & Johnsen 2019, Biol. Lett.](https://pmc.ncbi.nlm.nih.gov/articles/PMC6769148/) | 1 | pairs at stations; simultaneous hermaphrodite; leg-rocking more toward predatory clients |
| [Vaughan, Grutter & Hutson 2018, Sci. Rep.](https://www.nature.com/articles/s41598-018-32293-6) | 1 | removes fish parasites *(abstract via search index)* |
| [SeaLifeBase](https://www.sealifebase.se/summary/Lysmata-amboinensis.html) | 1 | Indo-Pacific; IUCN Not Evaluated |
| [Wikipedia](https://en.wikipedia.org/wiki/Lysmata_amboinensis) | 3 | 5–6 cm; 200–500 eggs; larvae 14 stages over 5–6 months; hard to culture |

**Key facts:** it is a protandric simultaneous hermaphrodite (`simultaneous_hermaphrodite`). The 5–6 month larval period is why almost all trade animals are wild-caught (`captiveBredAvailable: false`). The positive interactions `tag:fish_medium` and `tag:fish_large` represent its cleaning station.

**Conflicts:** SeaLifeBase's generic decapod text says "mostly gonochoric", but the species literature says hermaphrodite, which is used. The egg-carrying time (~2 weeks) comes from hobby reports and has moderate confidence.

## Peppermint shrimp
*Lysmata wurdemanni* (trade name) · `shrimp_cleaner`

| Source | Tier | Facts used |
|---|---|---|
| [LiveAquaria](https://www.liveaquaria.com/products/peppermint-shrimp) | 2 | manages Aiptasia (individuals vary); scavenger; stock is L. boggessi/ankeri/wurdemanni/rafa; commercially bred; ~$16 |
| [Rhyne, Lin & Deal 2004, J. Shellfish Res.](https://www.researchgate.net/publication/289254983_Biological_control_of_aquarium_pest_anemone_Aiptasia_pallida_Verrill_by_peppermint_shrimp_Lysmata_risso) | 1 | Lysmata eat Aiptasia; consumption varies by variety; groups tackle bigger anemones *(abstract via search index)* |
| [AlgaeBarn — L. boggessi](https://www.algaebarn.com/blog/invertebrates/captive-bred-inverts/peppermint-shrimp/) | 2 | L. boggessi the reliable species; captive-bred; may steal food from LPS; ignores Aiptasia when overfed |

**Key facts:** it hunts Aiptasia (new tag `aiptasia`, plus a positive interaction). It may pick at LPS and occasionally zoanthids (`coralRisk 0.2`, `reefSafe 'mostly_safe'`, predator tag `coral_polyp`).

**Confidence:** medium, because the coral-picking reports are anecdotal and the species complex is confusing. The roster name is kept, and the confidence notes explain the taxonomy.

## Blue-leg hermit crab
*Clibanarius tricolor* · `hermit_crab`

| Source | Tier | Facts used |
|---|---|---|
| [LiveAquaria](https://www.liveaquaria.com/product/623/?pcatid=623) | 2 | ~1 in; eats hair algae and cyano; **may attack snails for the shell or food**; keep in groups |
| [TFH — Clibanarius tricolor](https://www.tfhmagazine.com/articles/saltwater/clibanarius-tricolor) | 2 | 2.5 cm; **fights other hermits for shells**; **picks on live snails for shells**; nocturnal; 75–82 °F; 1–2 yr in aquaria |
| [Baeza & Behringer 2017, PeerJ](https://pmc.ncbi.nlm.nih.gov/articles/PMC5314957/) | 1 | Florida Keys intertidal to ~2 m; 184–614 embryos; larval development unknown |
| [SeaLifeBase](https://www.sealifebase.se/summary/Clibanarius-tricolor.html) | 1 | W. Atlantic/Caribbean; 0–3 m; IUCN NE |

**Key facts:** a conditional rule against `tag:snail` covers shell theft, with two sources agreeing. It is mantis prey through the `crustacean` tag plus an explicit incompatible rule. Breeding is `not_in_game`.

**Conflict:** TFH thinks crabs mainly want the shell, while LiveAquaria says they may also eat the snail. Both behaviours carry the same risk in the game.

## Trochus snail
*Trochus sp.* · `snail`

| Source | Tier | Facts used |
|---|---|---|
| [SeaLifeBase — Trochus histrio](https://www.sealifebase.se/summary/Trochus-histrio.html) | 1 | 5 cm max; intertidal–30 m; gonochoric broadcast spawner, trochophore → veliger; IUCN NE |
| [LiveAquaria — Banded Trochus](https://www.liveaquaria.com/product/564/?pcatid=564) | 2 | film algae/cyano/diatom grazer; **rights itself (unlike Tectus)**; breeds in tanks; not easily eaten by crabs; 1 per 2–3 gal |
| [Bulk Reef Supply](https://www.bulkreefsupply.com/content/post/how-to-care-for-trochus-snails) | 2 | herbivore; self-righting; spawns in aquaria; 75–80 °F |
| [AlgaeBarn](https://www.algaebarn.com/blog/clean-up-crew/utilizing-the-trochus-snail-trochus-spp/) | 3 | captive-bred; larvae settle the same week |

**Conflict:** AlgaeBarn describes a very short larval stage, while LiveAquaria says larvae "mature over several months" (probably meaning growth). The game uses a short larval stage followed by slow growth. The breeding system is `egg_layer_generic` because the contract has no broadcast-spawner id; `nurseryRequired: false` lets a few babies appear on their own.

## Royal gramma
*Gramma loreto* · `reef_basslet`

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Gramma-loreto.html) | 1 | 8 cm TL; 1–60 m; 22–27 °C; caves, **belly toward the substrate (upside-down under ledges)**; male nest care; IUCN LC (2011) |
| [LiveAquaria](https://www.liveaquaria.com/product/53/?pcatid=53) | 2 | 30 gal; aggressive to its own kind; caves and subdued light; ~$33 wild |
| [CORAL Magazine 2016](https://www.coralmagazine.com/2016/08/23/quality-marine-offers-captive-bred-royal-grammas/) | 2 | BCMI aquacultured grammas, first batches for public aquariums |
| [Biota](https://shop.thebiotagroup.com/products/royal-gramm) | 2 | captive-bred for hobbyists, $60–70 |

**Confidence:** high for behaviour. Clutch size and incubation come from aquaculture and hobby reports (medium). The sex system is treated as gonochoristic because little has been published on it.

## Firefish
*Nemateleotris magnifica* · `dartfish`

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Nemateleotris-magnifica.html) | 1 | 9 cm TL; 6–28 m; hovers facing current; monogamous; IUCN LC (2023) |
| [LiveAquaria](https://www.liveaquaria.com/product/168/?pcatid=168) | 2 | 20 gal; **jumps — lid**; bolt holes; fights own kind, mated pairs OK; ~$40 |
| [N. decora captive spawning, Aquaculture 2014](https://www.sciencedirect.com/science/article/abs/pii/S0044848613006820) | 1 | congener: 400–500 eggs, 96 h incubation at 28 °C, male guards *(abstract via search index)* |

It is not commercially bred (`captiveBredAvailable: false`, with a `wildCaughtNote`) and is flagged `escapeArtist`.

## Green chromis
*Chromis viridis* · `chromis`

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Chromis-viridis.html) | 1 | 10 cm TL; aggregations over Acropora; male nests; eggs hatch in 2–3 d; IUCN LC (2021) |
| [LiveAquaria](https://www.liveaquaria.com/product/115/?pcatid=115) | 2 | 30 gal; groups of 6+; 8–15 yr; ~$12 |
| [Reef Builders — Rising Tide 2013](https://reefbuilders.com/2013/01/28/captive-bred-green-chromis/) | 2 | reared on copepods, only a few dozen; #1 collected species |
| [Top Shelf — chromis aggression](https://topshelfaquatics.com/blogs/news/chromis-aggression-over-time-explained) | 3 | ~70% of groups collapse to one fish in 18 months; groups of 3 are worst; 6-ft tanks help |

**Modelled as:** a shoal with `minGroup 3` and `idealGroup 7`, and male–male "fight". Most chromis in the trade are wild-caught.

**Conflict:** the group-attrition figures come from retailers and hobbyists (Tier 3).

## Banggai cardinalfish
*Pterapogon kauderni* · `cardinal_hover`

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Pterapogon-kauderni.html) | 1 | 8.6 cm; 1–2 m; hovers over urchins; **male mouthbrooding, no planktonic stage**; IUCN **Endangered** (2007) |
| [NOAA Fisheries](https://www.fisheries.noaa.gov/species/banggai-cardinalfish) | 1 | **ESA Threatened (2016)**; 2.5–3 yr, up to 5; trade + destructive fishing |
| [Vagelli 1999, Env. Biol. Fish.](https://link.springer.com/article/10.1023/A:1007514625811) | 1 | ~40 eggs of 3 mm; ~19 d oral incubation; released at 8 mm *(abstract via search index)* |
| [Top Shelf — captive-bred Banggai](https://topshelfaquatics.com/products/captive-bred-banggai-cardinalfish) | 2 | captive-bred ~$40; 30 gal; adults territorial once paired; 100+ gal for multiple pairs |

**Modelled as:** a `mouthbrooder` with `male_mouth` care, direct development (short `fryRearingHours`, no nursery required) and easy breeding.

**Conflict:** brooding time is given as ~19 d (Vagelli) versus up to ~30 d including post-hatch holding (hobby). The game uses 20 d.

## Yellow watchman goby
*Cryptocentrus cinctus* · `goby_burrow`

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Cryptocentrus-cinctus.html) | 1 | 10 cm SL; sandy lagoons 1–25 m; **yellow or whitish-grey colour phases**; lives with alpheid shrimp; IUCN LC (2020) |
| [Aquatics Unlimited — tank-raised](https://aquaticsunlimited.com/product/goby-tank-raised-watchman-gray-yellow-cryptocentrus-cinctus/) | 2 | captive-bred grey and yellow forms; 30 gal; pairs with *Alpheus bellulus*; lid |
| [Manera et al. 2025, Behav. Ecol.](https://pmc.ncbi.nlm.nih.gov/articles/PMC12527286/) | 1 | shrimp digs and maintains the burrow; goby is the sentinel; tactile fin-flick warnings via antennae |
| [Karplus 1979](https://onlinelibrary.wiley.com/doi/10.1111/j.1439-0310.1979.tb00286.x) | 1 | tail-flick warnings need antenna contact *(abstract via search index)* |

**Modelled as:** `burrower`, `escapeArtist`, and a hostNote naming the pistol-shrimp partner. The grey phase is a real morph, modelled as a recessive with unknown genetics.

## Yellow clown goby
*Gobiodon okinawae* · `goby_perch` · unlock `reef`

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Gobiodon-okinawae.html) | 1 | 3.5 cm; among staghorn Acropora; groups of 5–15; IUCN LC (2018) |
| [LiveAquaria](https://www.liveaquaria.com/product/1441/?pcatid=1441) | 2 | 10 gal; **may nip small SPS polyps**; eggs under a coral branch cause tissue recession; keep singly |
| [Biota (captive-bred)](https://shop.thebiotagroup.com/products/yellow-clown-goby) | 2 | captive-bred; social; nips Acropora if underfed |
| [Gratzer et al. 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4459215) | 1 | Gobiodon skin toxins make predators spit them out; bi-directional sex change |

**Conflicts:** LiveAquaria says keep it singly, while FishBase and Biota describe small groups; the game models a pair as fine and unpaired adults as "tension". The toxin and sex-change facts are documented for the genus, not tested on this species. The sex system is modelled as `protogynous`, the closest option the contract offers.

## Mandarin dragonet
*Synchiropus splendidus* · `dragonet` · unlock `marine_advanced`

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Synchiropus-splendidus.html) | 1 | 7 cm; pairs ascend to spawn; **rare red individuals**; IUCN LC (2018) |
| [ADW](https://animaldiversity.org/accounts/Synchiropus_splendidus/) | 1 | 24–26 °C; eggs hatch in ~12 h; eats amphipods and copepods; toxic smelly mucus; wild 10–15 yr, captive often 2–4 |
| [ORA — Blue Mandarin](https://www.orafarm.com/product/blue-mandarin/) / [Red Mandarin](https://www.orafarm.com/product/red-mandarin/) | 2 | captive-bred take frozen and dry food; red = rare variation with red pelvic and pectoral fins |
| [LiveAquaria — Green Mandarin](https://www.liveaquaria.com/product/551/?pcatid=551) | 2 | well-established 30+ gal; aggressive only to other mandarins |
| [Top Shelf — pods & mature tanks](https://topshelfaquatics.com/blogs/news/mandarin-and-dragonet-care-guide-pods-feeding-and-mature-tank-requirements) | 3 | tank 6+ months old; 1–1.5 lb rock per gal; hundreds of pods a day; males fight |
| [Wikipedia](https://en.wikipedia.org/wiki/Synchiropus_splendidus) | 3 | one of only two vertebrates coloured blue by a cellular pigment (cyanophores) |

**Modelled as:**
- `requiresMatureDays: 20`, which is 6 months × 40 game-days per year
- `needsPods`
- `feedingSpeed 0.1`
- Green and Red morphs, with red as a recessive (its genetics are unpublished)

**Conflict:** the minimum tank is 30 gal according to LiveAquaria versus 50–75 gal according to Top Shelf. The game uses 30 gal plus the maturity and pods gates.

## Yellow tang
*Zebrasoma flavescens* · `tang` · unlock `marine_large`

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Zebrasoma-flavescens.html) | 1 | 20 cm TL; 24–28 °C; algae browser; lunar spawning; IUCN LC (2010) |
| [ADW](https://animaldiversity.org/accounts/Zebrasoma_flavescens/) | 1 | ~40,000 eggs; larvae settle at ~10 weeks; night colour with white lateral line; scalpel spine |
| [Claisse et al. 2009, MEPS 389](https://www.int-res.com/abstracts/meps/v389/p245-255) | 1 | oldest wild fish aged 41 yr *(abstract via search index; site returned 401)* |
| [LiveAquaria product](https://www.liveaquaria.com/product/6746/?pcatid=6746) / [spotlight](https://www.liveaquaria.com/blogs/species-spotlight/yellow-tangs-remain-a-great-choice-for-your-marine-aquarium) | 2 | **100 gal**; aggressive to its own species and tangs in general; constant swimmer; captive-bred via Biota/Oceanic Institute |
| [Top Shelf — captive-bred](https://topshelfaquatics.com/products/captive-bred-yellow-tang) | 2 | ~$330; 100–150 gal preferred |
| [Civil Beat, Oct 2025](https://www.civilbeat.org/2025/10/aquarium-fishing-could-return-to-hawai%CA%BBi-under-proposed-new-rules/) | 2 | Hawaiʻi collection largely halted since the 2017 ruling; 2025 draft rules would allow quotas |

**Modelled as:** 100 gal plus a **72-inch footprint**, which in practice requires the 125-gal tier. It is also flagged `activeSwimmer`, `outgrowsSmallTanks` and male/female "fight", with a conditional rule against the kole tang. Breeding is `not_in_game`.

## Kole bristletooth tang
*Ctenochaetus strigosus* · `tang` · unlock `marine_large`

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Ctenochaetus-strigosus.html) | 1 | 15.4 cm SL; 21–27 °C; **endemic to Hawaiʻi and Johnston**; combs detritus; IUCN LC (2010) |
| [LiveAquaria](https://www.liveaquaria.com/product/345/?pcatid=345) | 2 | **70 gal**; 7 in; aggressive to other tangs, one per tank; juveniles gold, adults brown |
| [Civil Beat, Oct 2025](https://www.civilbeat.org/2025/10/aquarium-fishing-could-return-to-hawai%CA%BBi-under-proposed-new-rules/) | 2 | kole tang included in the proposed Hawaiian quotas |

**Conflict:** 70 gal (LiveAquaria) versus 75–125 gal (other guides). The game uses 90 gal with a 48-inch footprint. No commercial captive breeding was found.

## Coral beauty angelfish
*Centropyge bispinosa* · `angelfish_dwarf` · unlock `reef`

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Centropyge-bispinosa.html) | 1 | 11.5 cm; harems of 3–7; algae diet; IUCN LC (2009) |
| [LiveAquaria](https://www.liveaquaria.com/products/coral-beauty-angelfish) | 2 | 70 gal; **reef with caution — nips stony and soft corals**; ~$60 |
| [ORA](https://www.orafarm.com/product/coral-beauty-angelfish/) | 2 | captive-bred "high orange" line; **nips corals and clams** |
| [Sakai et al. 2003, Zool. Sci.](https://pubmed.ncbi.nlm.nih.gov/12777833/) | 1 | Centropyge protogynous harems; males can change back to females *(abstract via search index)* |

**Modelled as:** `reefSafe 'caution'`, `coralRisk 0.35` and predator tags `coral_polyp`, `clam` and `sessile_invert`. It is protogynous. The High Orange morph is real and line-bred by ORA.

## Foxface rabbitfish
*Siganus vulpinus* · `rabbitfish` · unlock `marine_large`

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Siganus-vulpinus.html) | 1 | 25 cm SL max, 20 cm common; singly or in pairs; algae grazer; **venomous spines**; IUCN LC (2015) |
| [LiveAquaria](https://www.liveaquaria.com/product/687/?pcatid=687) | 2 | **125 gal**; venomous; reef with caution (may nip LPS and soft corals if underfed); peaceful except with other rabbitfish |
| [Wikipedia](https://en.wikipedia.org/wiki/Foxface_rabbitfish) | 3 | turns dark brown when threatened, mottled at night; venom compared to stonefish |

**Modelled as:** `venomous`, `reefSafe 'mostly_safe'` and `coralRisk 0.15`, following the brief's "mostly reef-safe". LiveAquaria's "with caution" is recorded in the confidence notes.

## Peacock mantis shrimp
*Odontodactylus scyllarus* · `mantis_shrimp` · unlock `predators`

| Source | Tier | Facts used |
|---|---|---|
| [Monterey Bay Aquarium](https://www.montereybayaquarium.org/animals/animals-a-to-z/peacock-mantis-shrimp) | 1 | 1–7 in; territorial and solitary; burrows audibly; strike like a .22 bullet; **colour discrimination actually low** |
| [National Aquarium](https://aqua.org/explore/animals/peacock-mantis-shrimp) | 1 | eats gastropods, crabs and mollusks larger than itself; strike 50× faster than a blink; ≥12 photoreceptor types; not threatened |
| [Patek & Caldwell 2005, JEB](https://journals.biologists.com/jeb/article/208/19/3655/15838/Extreme-impact-and-cavitation-forces-of-a) | 1 | impact 400–1,501 N; cavitation up to 504 N; two force peaks |
| [Patek, Korff & Caldwell 2004, Nature](https://scholars.duke.edu/publication/953838) | 1 | saddle-shaped spring mechanism; cavitation |
| [LiveAquaria — Clown Mantis (O. scyllarus)](https://www.liveaquaria.com/products/clown-mantis-shrimp) | 2 | species aquarium only; not reef compatible; 6 in; ~$130 |
| [Bulk Reef Supply](https://www.bulkreefsupply.com/content/post/md-2020-12-how-to-set-up-a-mantis-shrimp-tank) | 2 | 10 gal min; **documented breaking glass (rarely)**; deep mixed substrate |
| [Shrimp and Snail Breeder](https://aquariumbreeder.com/mantis-shrimp-as-an-aquarium-pet-care-guide/) | 3 | acrylic preferred; female carries eggs ~5–6 weeks |

**Modelled as:**
- `speciesOnly`, `burrower` and `glassStrikeRisk` (new optional fields)
- `visitorAppeal 1`
- incompatible rules against snails, crustaceans, small fish and benthic fish
- high-risk rules against medium and large fish

The tank is 40 gal, a conservative choice compared with BRS's 10 gal. The mantis is excluded from the `reef` class because LiveAquaria rates it not reef compatible: it eats the clean-up crew.

## Fuzzy dwarf lionfish
*Dendrochirus brachypterus* (now *Neochirus brachypterus*) · `lionfish` · unlock `predators`

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Dendrochirus-brachypterus.html) | 1 | 17 cm TL; nocturnal hunter of small crustaceans; venomous; IUCN LC (2015) |
| [LiveAquaria product](https://www.liveaquaria.com/product/227/?pcatid=227) | 2 | **50 gal**; venomous; eats ornamental shrimp and fish; recognises its owner; ~$85 |
| [LiveAquaria spotlight](https://www.liveaquaria.com/blogs/species-spotlight/the-fuzzy-dwarf-lionfish) | 2 | live feeder shrimp to start; feed every other day; **hot-water soak ≥30 min for stings**; avoid fin nippers |
| [NOAA NOS — What is a lionfish?](https://oceanservice.noaa.gov/facts/lionfish-facts.html) | 1 | invasive Atlantic lionfish are Indo-Pacific *Pterois*, possibly released aquarium pets |
| [Chou, Liu & Liao 2023, Front. Mar. Sci.](https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2023.1109655/full) | 1 | new genus *Neochirus*, type species *D. brachypterus* |

**Modelled as:** `venomous`, `hungerHours 44` and `maxLikelyPreySizeCm 7` (a heuristic: about half its length). Rules are incompatible against tiny and small fish, and high-risk against large shrimp and benthic fish. The encyclopedia separates this species from the invasive *Pterois volitans* and *P. miles* and never implies release.

## Miniatus grouper
*Cephalopholis miniata* · `grouper` · unlock `predators`

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Cephalopholis-miniata.html) | 1 | **50 cm TL max**; 2–150 m; ~80% of the diet is small fish (anthias), the rest crustaceans; harems of up to 12 females; 475 m² territories; IUCN LC |
| [LiveAquaria](https://www.liveaquaria.com/products/miniatus-grouper) | 2 | **180 gal min**; 14 in in aquaria (18 in wild); aggressive; not trusted with inverts or small fish; ~$150 |
| [Wikipedia](https://en.wikipedia.org/wiki/Cephalopholis_miniata) | 3 | protogynous; juveniles orange-yellow with fewer spots |

**Modelled as:**
- 42 cm adult, 180 gal and a 72×24 in footprint
- `outgrowsSmallTanks` and `heavyWaste`
- `maxLikelyPreySizeCm 15`
- rules: incompatible against small fish; high-risk against medium fish, shrimp and crustaceans; conditional against the dwarf lionfish

Researched conservatively, as the brief requires for large species.

---

## Conflicts & uncertainty

- **Taxonomy drift:**
  - The dwarf lionfish is now *Neochirus brachypterus* (2023).
  - Trade "peppermint shrimp" is the *L. wurdemanni* complex, mostly *L. boggessi*.
  - "Trochus sp." covers several species.
  - Roster names are kept for id stability, and confidence notes explain each case.
- **Tank-size disagreements** were resolved conservatively:
  - kole tang 70 → 90 gal
  - mantis shrimp 10 → 40 gal
  - mandarin 30 gal plus maturity and pod gates
  - yellow tang 100 gal plus a 6-ft footprint
- **Reef-safety grey areas.** Peppermint shrimp (coral picking) and foxface (occasional nipping) are `mostly_safe`, not safe. The coral beauty is `caution`, and the clown goby `mostly_safe`, because it nips Acropora polyps.
- **Seahorse versus SPS corals.** Giwojna says SPS are fine, while other keepers avoid them. Only anemones, fire coral and strongly stinging LPS are flagged, through `tag:stinging_cnidarian` and `special.stingSensitive`.
- **Hawaiian collection status is in flux.** Collection has been halted since 2017, and in 2025 draft rules to reopen it were advanced. The text avoids claiming a final outcome.
- **Breeding numbers** are approximate where only congeners or hobby reports exist: firefish (from *N. decora*), royal gramma, watchman goby, clown goby and the mantis egg mass. Species without realistic home breeding use `not_in_game`: hermit crab, tangs, coral beauty, foxface, mantis, lionfish and grouper.
- **Morph genetics** are simplified wherever the real inheritance is unpublished: clownfish white expansion, seahorse colour, red mandarin, grey watchman and high-orange coral beauty. Every allele and phenotype is a real, observed form, and none is `fictional`.
- **Group attrition** (chromis) and **snail killing** (hermits) are probabilistic tendencies, not certainties.

## New shared vocabulary and flags (for the compat, welfare and AI lanes)

- `tags.ts` (appended):
  - `stinging_cnidarian` is a hazard tag. Anemone or coral species (or decor mapped by the compat engine) should carry it; the seahorse has an incompatible rule against it.
  - `aiptasia` marks pest anemones. The peppermint shrimp's predator tag and positive interaction use it.
- `SpeciesSpecialNeeds` (optional, `// lane:species-marine`):
  - `stingSensitive` (seahorse)
  - `speciesOnly` (mantis shrimp)
  - `glassStrikeRisk` (mantis shrimp; warn on thin glass tanks)
- Groups that exception rules use as `tag:<group>`:
  - `tang` (yellow and kole)
  - `anemonefish`, `damselfish`, `basslet`, `dartfish`, `goby`, `cardinalfish`, `dwarf_angelfish`, `rabbitfish`, `dragonet`
  - `marine_shrimp`, `hermit_crab`, `snail`, `stomatopod`, `scorpionfish`, `grouper`, `syngnathid`
- Positive interactions:
  - cleaner shrimp ↔ `tag:fish_medium` and `tag:fish_large` (cleaning station)
  - peppermint ↔ `tag:aiptasia`
  - mandarin ↔ seahorse
  - clownfish, royal gramma → cleaner shrimp
  - seahorse → trochus

## Visual notes for render lanes

All colours are CSS hex values in `genetics.baseVisual` and are overridden by phenotype rules. The **pattern** column uses `PatternKind` values. The **finType** column holds new strings for body-plan and geometry lookup.

| Species | finType | pattern | Colour-slot meaning and silhouette notes |
|---|---|---|---|
| ocellaris_clownfish | `clownfish` | `bands` | orange body, 3 white bars edged black (`finColor2` = black fin tips) |
| lined_seahorse | `seahorse` | `lined` | fine pale lines on the neck and back; translucent dorsal fin |
| cleaner_shrimp | `shrimp_lysmata` | `lateral_stripe` | `bodyColor` gold-orange flanks; `bodyColor2` red dorsal bands; `accentColor` white dorsal stripe; `finColor` red tail fan with `finColor2` white spots; long white antennae; translucency 0.35 |
| peppermint_shrimp | `shrimp_lysmata` | `lined` | glassy cream body (translucency 0.6) with thin red longitudinal lines (`accentColor`) |
| hermit_crab | `hermit_crab` | `bands` | **body = cobalt legs and claws**; accent = orange-red joint bands and antennae; **fin/fin2 = borrowed snail shell** (brown-grey, darker bands) |
| trochus_snail | `snail_trochus` | `bars` | body/body2 = cream-tan conical shell; accent = red-brown oblique stripes; belly/fin = grey-green foot; slight pearly iridescence |
| royal_gramma | `gramma` | `bicolor` | `bodyColor` magenta-violet front blends into `bodyColor2` gold rear; accent = dark eye line and black spot at the front of the dorsal; long violet pelvics |
| firefish | `dartfish` | `bicolor` | slender (bodyDepth 0.9); white front → red-orange rear; accent = yellow face; **very tall filament first dorsal** (finLength 1.2); black fin edging |
| green_chromis | `chromis` | `solid` | iridescent apple-green/pale blue (iridescence 0.7, metallic 0.3); translucent fins; deeply forked tail |
| banggai_cardinalfish | `banggai` | `bands` | silver body; **3 bold black bars** (accent); long trailing fins (finLength 1.3); pearly white spots on the rear bar and fins; gold eye |
| watchman_goby | `goby_watchman` | `spots` | lemon-yellow body; **electric-blue spots** on the head and fins (accent/fin2); high-set eyes, frowning mouth; grey morph = pale grey with dusky `bars` |
| clown_goby | `goby_clown` | `solid` | tiny, blunt-headed, deep-bodied (bodyDepth 1.1); glossy uniform yellow; fused pelvic disc |
| mandarin_dragonet | `dragonet` | `reticulated` | broad head, fan pectorals; **orange wavy bands (body) edged turquoise (accent) on blue-green ground (body2/belly)**; red-orange eye; males have a tall first dorsal; Red morph = red body and red pectorals |
| yellow_tang | `tang_sailfin` | `solid` | tall disc (bodyDepth 1.12); sail-like dorsal/anal fins; long snout; white caudal spine (accent); night: duskier with a pale lateral stripe |
| kole_tang | `tang_bristletooth` | `lined` | brown with a blue-burgundy cast (body2); fine pale-blue horizontal lines (accent); **gold eye ring** (`eyeColor`) |
| coral_beauty | `angel_dwarf` | `bars` | royal blue-violet head, back and fins; orange flank (`bodyColor2`) crossed by thin dark bars (accent); electric-blue fin edges (fin2); High Orange morph swaps emphasis |
| foxface_rabbitfish | `rabbitfish` | `solid` | bright yellow; **fox mask**: dark band snout → eye plus dark throat patch (accent), separated by a white blaze; tall spiny dorsal; stress/night = blotchy brown mottle (behavioural state) |
| peacock_mantis_shrimp | `mantis_smasher` | `spots` | body/body2 = green → teal segments; **fin = scarlet-orange raptorial clubs**; fin2 = turquoise antennal scales and swimmers; belly = pink legs; accent = black leopard spots on the cream carapace front; eye = turquoise stalked eyes with a midband |
| dwarf_lionfish | `lionfish_dwarf` | `bands` | stocky, with fleshy skin tabs ("fuzzy"); **fan pectorals banded red-brown/cream (fin/fin2)**; dark vertical body bands (accent); pale belly |
| miniatus_grouper | `grouper` | `spots` | robust, big mouth, rounded tail; orange-red body densely covered in **small blue ocellated spots** (accent); thin blue fin margins (fin2); juveniles more orange-yellow |

Invertebrate species (`visualLane: 'special'`) use the colour slots as labelled above rather than as literal fins. The `bodyDepth`, `finLength` and `iridescence` values in each record are tuned hints and can be adjusted during render review.
