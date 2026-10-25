# Marine species research — lane species-marine

Research notes behind every marine `SpeciesDefinition` in Aquarium Go: the 2 marine starters (`src/data/species/ocellaris_clownfish.ts`, `src/data/species/lined_seahorse.ts`) and the 40 unlockable species in `src/data/species/marine/`. Researched September 2026; the 22 chunk 16 species researched October 2026.

**Source tiers.** Tier 1 means FishBase/SeaLifeBase, WoRMS, the Catalog of Fishes, FAO identification guides, Fishes of Australia, Animal Diversity Web (ADW), museums and accredited public aquariums (Monterey Bay Aquarium, National Aquarium, Oregon Coast Aquarium), NOAA, the IUCN and peer-reviewed papers. Tier 2 means established retailers and producers (LiveAquaria, ORA, Biota, Bulk Reef Supply, Top Shelf Aquatics, Quality Marine, Reef Cleaners), long-running hobby magazines (TFH, CORAL) and reviewed care sheets. Tier 3 means hobby guides and Wikipedia summaries, used for edge cases only.

**Access notes.** Most URLs were fetched and read during research. A few publisher pages refused automated access (Springer, Wiley, ScienceDirect, Nature, PubMed). For those papers only the abstract was seen, through a search index, and each one is marked *(abstract via search index)*. Papers and conference abstracts read only as an abstract on their own page are marked *(abstract only)*, *(abstract)* or *(conference abstract)*. During chunk 16 the IUCN site refused access (403), so those IUCN categories and dates come from FishBase and SeaLifeBase.

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

<a id="kole-tang"></a>
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

## Chunk 16: a friend's reef (ADR-0052)

Chunk 16's wave A: the 13 marine species in a friend's reef. None needs research of its own; each comes into the shop once Marine Systems is researched (ADR-0052 decision 9). The data files are the source of truth for every number. Where they differ from the research briefs (an accepted name or a trade name), the data wins, and the section says why.

## Emperor angelfish
*Pomacanthus imperator* · `angelfish_dwarf` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Pomacanthus-imperator.html) | 1 | **40 cm SL**; 1–100 m; eats sponges and tunicates; pairs; **14 yr reported**; juvenile white dorsal margin; IUCN LC (2009) |
| [Fishes of Australia](https://fishesofaustralia.net.au/Home/species/653) / [Australian Museum](https://australian.museum/learn/animals/fishes/emperor-angelfish-pomacanthus-imperator/) | 1 | 38 cm TL; juveniles under ledges on patch reefs, adults at caves; blue with yellow stripes; juvenile concentric rings |
| [Oregon Coast Aquarium](https://aquarium.org/?p=22368) | 1 | protogynous; **colour change at 8–12 cm**; spawns at dusk, planktonic eggs |
| [LiveAquaria](https://www.liveaquaria.com/product/411/?pcatid=411) | 2 | **220 gal**; 72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12; semi-aggressive; **reef with caution: nips corals and clam mantles**; juveniles from ~$162 |
| [Practical Fishkeeping](https://www.practicalfishkeeping.co.uk/features/how-to-care-for-an-emperor-angelfish/) | 2 | **at least 215 cm long**, over 2 m for an adult; not reef-safe except in SPS-only tanks; one *Pomacanthus*, added last |
| [Quality Marine](https://www.qualitymarine.com/news/emperor-angelfish/) | 2 | adults attack their own kind and other large angels, usually not juveniles; **drums**; the rings break into stripes; at least 15 yr; prone to HLLE |
| [Reef Builders 2023](https://reefbuilders.com/2023/06/15/captive-bred-emperor-angelfish-are-now-available/) | 2 | captive-bred by Bali Aquarich, sold by Biota since June 2023; pellet-trained; $225 |

**Modelled as:**
- 35 cm adult, 220 gal and an **84×24 in footprint** (Practical Fishkeeping's length); `activeSwimmer` and `outgrowsSmallTanks`
- `reefSafe 'caution'`, `coralRisk 0.55` and `harms_anemone`, with predator tags `sessile_invert`, `coral_polyp`, `clam` and `worm`
- one per tank, male–male "lethal"; rules: conditional against the coral beauty, high-risk against `tag:clam` and the seahorse
- protogynous; breeding `not_in_game` (reared commercially, not at home); lifespan at the 500-day ceiling; `baseValue 300`
- the `angelfish_dwarf` behaviour set (a cave-patrolling picker), with drumming and rock picking

**Conflicts:** the maximum size is 30, 38 or 40 cm (FishBase's figure is SL), so the game uses 35 cm. LiveAquaria says reef with caution and Practical Fishkeeping says not reef-safe, so the game uses caution with a high coral risk. Older care sheets (LiveAquaria's blog, Aquarium Source) say it has never been bred, which is out of date since 2023. The sexes differ only slightly, so adults share one look and only the ringed juvenile is drawn differently.

## Sailfin tang
*Zebrasoma velifer* (long spelled *veliferum*) · `tang` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Zebrasoma-veliferum.html) | 1 | **40 cm SL**; 0–45 m; leafy and turf algae; solitary or in pairs; **27 yr maximum (otoliths)**; juveniles yellow with dark bars; IUCN LC (2010) |
| [WoRMS](https://www.marinespecies.org/aphia.php?p=taxdetails&id=712902) | 1 | *velifer* is the accepted spelling; *veliferum* unaccepted |
| [FAO WCP guide vol. 6, Acanthuridae](https://www.fao.org/4/y0870e/y0870e30.pdf) | 1 | depth 1.8–2× in SL; dorsal fin "extremely elevated"; bar-and-line pattern; blue patch around the tail spine; *Z. desjardinii* differs in colour and fin-ray counts |
| [ADW](https://animaldiversity.org/accounts/Zebrasoma_veliferum/) | 1 | spawns at dusk, mostly in groups; no parental care; ~25 yr typical |
| [LiveAquaria](https://www.liveaquaria.com/product/379/?pcatid=379) | 2 | **180 gal**; 72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12; aggressive to its own kind; **seaweed at least three times a week**; ~$80 |
| [Aquatics Unlimited](https://aquaticsunlimited.com/product/tang-sailfin-zebrasoma-veliferum/) | 2 | 125 gal with at least 18 in width; juveniles for a while in 75 gal |
| [Reef Builders 2015](https://reefbuilders.com/2015/06/29/speciation-biogeography-hybridization-zebrasoma/) | 2 | trade fish mostly from Indonesia and the Philippines; *Z. desjardinii* is the Indian Ocean sister species; the yellow fades with age |

**Modelled as:** 35 cm, 180 gal and a **72×24 in footprint**, with `activeSwimmer`, `outgrowsSmallTanks` and `needsAlgaeOrBiofilm`. It is `reefSafe 'mostly_safe'` (`coralRisk 0.08`, an underfed fish may nip LPS), with a conditional rule against `tag:tang`. It is gonochoristic, breeding is `not_in_game`, and the lifespan sits at the 500-day ceiling. It shares the yellow tang's `tang_sailfin` fin type.

**Conflicts:** tank sizes run from 125 to 180 gal, and the game uses 180 with a six-foot footprint (LiveAquaria, Top Shelf). FishBase has it spawning in pairs by day, ADW in groups at dusk; this does not matter in the game. The Red Sea and Indian Ocean "Desjardini" sailfin, *Z. desjardinii*, is a separate valid species and is not modelled as a form of this one. LiveAquaria's "Africa" locale on its velifer page would be desjardinii by range. Wild lifespans of 5–7 years (Saltwater Aquarium Blog, Deep Sea World) contradict the otolith data and are not used.

## Chocolate tang
*Acanthurus pyroferus* (mimic surgeonfish) · `tang` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Acanthurus-pyroferus.html) | 1 | 29 cm TL; 0–60 m; base of reefs, usually alone; juveniles mimic *Centropyge*; IUCN LC (2010) |
| [FAO WCP guide vol. 6, Acanthuridae](https://www.fao.org/4/y0870e/y0870e30.pdf) | 1 | ~25 cm TL; filamentous algae; orange patch over the pectoral, black gill band, white chin band; **yellow tail border**; four juvenile mimic phases; tail rounded in the young, lunate in adults |
| [Eagle & Jones 2004, J. Zool.](https://researchonline.jcu.edu.au/6757/) | 1 | juveniles stay within 1–2 m of their model and change when they outgrow it; fed ~10% more near it *(abstract only)* |
| [LiveAquaria — Lemon Tang](https://www.liveaquaria.com/product/763/?pcatid=763) | 2 | 180 gal; 72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12; **aggressive to other tangs and look-alikes**; reef compatible; ~$119 |
| [Top Shelf Aquatics](https://topshelfaquatics.com/products/chocolate-yellow-mimic-tang-fiji) | 2 | **125 gal**; 7–10 in in aquaria; moderate care; from ~$90 |
| [Fishkeeper](https://www.fishkeeper.co.uk/fish/marine/tangs/mimic-tang) | 2 | 24–28 °C; keep one, and not with the angelfish it copies; an underfed fish may nip LPS |

**Modelled as:** 25 cm, 125 gal and a **72×18 in footprint**, with `outgrowsSmallTanks` and `needsAlgaeOrBiofilm`. It is `reefSafe 'mostly_safe'` (`coralRisk 0.06`), with conditional rules against `tag:tang` and the coral beauty (it attacks look-alikes). Breeding is `not_in_game` and the lifespan is 380 game-days. Which mimic a juvenile copies depends on the angelfish where it lives, not on genes, so the art picks yellow or halfblack per individual and no locus is modelled.

**Conflicts:**
1. The tank is 125 gal (Top Shelf, hobby guides) versus 180 (LiveAquaria). The game uses 125 with a six-foot footprint.
2. No species maximum age was found. One otolith reading gave 7 years at 22.5 cm (search index only), while related *Acanthurus* live 30–45 years. 380 game-days is a cautious middle.
3. The tail margin is yellow (FAO, Fishes of Australia) or white (Wikipedia). The game uses yellow.
4. The halfblack mimic is often sold as *A. chronixis*. FishBase thinks that species is endemic to Kapingamarangi and that other reports are young *pyroferus*.
5. Randall (2005) questions the feeding explanation in Eagle & Jones.

## Lyretail anthias
*Pseudanthias squamipinnis* (sea goldie) · `chromis` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Pseudanthias-squamipinnis.html) | 1 | **males 15 cm, females 7 cm TL**; 0–55 m; 22–28 °C; zooplankton feeder; protogynous; IUCN LC (2015) |
| [FishBase — reproduction](https://fishbase.se/Reproduction/6568) | 1 | sex change at ~5 cm; **the dominant female changes in 2–4 weeks when the male is removed; all-female groups take 170–280 days**; pelagic batch spawner, no care |
| [Fishes of Australia](https://fishesofaustralia.net.au/home/species/4402) | 1 | females golden orange with a violet streak from eye to pectoral; males purplish pink with a red pectoral patch and a blue anal fin; juveniles start female |
| [Catalog of Fishes — *squamipinnis*](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=15838) / [*cheirospilos*](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=34629) | 1 | *squamipinnis* restricted to the Red Sea and western Indian Ocean; Pacific fish are *P. cheirospilos* |
| [LiveAquaria](https://www.liveaquaria.com/product/54/?pcatid=54) | 2 | **125 gal**; 72–78 °F, pH 8.1–8.4, SG 1.020–1.025, dKH 8–12; semi-aggressive; **one male per tank**; mysis, brine and flake through the day; $45–70 |
| [Quality Marine](https://www.qualitymarine.com/quality-marine/fish/anthias/pseudanthias/lyretail-red-male-11011/) | 2 | 125 gal; several feedings a day; jumps (lid) |
| [That Pet Place](https://www.thatpetplace.com/Pseudanthias-squamipinnis-lyretail-anthias-239115) | 2 | one male to six or more females; several feedings a day; reef safe; 55 gal (a low outlier) |
| [CORAL Magazine](https://coralmagazine.com/?p=3052725) / [Reef Builders 2019](https://reefbuilders.com/2019/12/11/marineland-antibes-successfully-rears-spotfin-anthias) | 2 | rearing is experimental only: ORA (2019, a handful) and Marineland Antibes (2019, 4 survivors, metamorphosis at 55–65 days) |

**Modelled as:**
- a harem (`minGroup 1`, `idealGroup 5`) with male–male "fight"; a 12 cm adult, between the female and male sizes
- 125 gal with a **72×18 in footprint**; `escapeArtist`; `reefSafe 'safe'`
- `hungerHours 8`, below the usual 10–18, because it needs several small feedings a day
- a high-risk rule against the seahorse, which loses its food
- protogynous with breeding `not_in_game`, but with the new `special.socialSexChange`: a group of two or more adult females with no male makes one, faster than the real 2–4 weeks
- the `chromis` behaviour set (hovers in the current, picks plankton); lifespan 220 game-days

**Conflicts:** the Catalog of Fishes splits the species, while FishBase, WoRMS and the hobby keep one; the game keeps one. Tank sizes range from 55 to 150 gal, and the game uses 125. There is no Tier 1 lifespan (hobby guides give 5–7 years in aquaria). Where it rests at night and the male's "U-swim" display are unverified.

## Melanurus wrasse
*Halichoeres melanurus* (tail-spot wrasse) · `wrasse` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Halichoeres-melanurus.html) | 1 | 14 cm TL; 1–15 m; eats polychaetes, copepods, isopods and forams; alone or in small groups; IUCN LC (2008) |
| [Fishes of Australia](https://fishesofaustralia.net.au/home/species/235) | 1 | 11 cm TL; female stripes and eyespots; male mauve with green-blue stripes and blue bars; black scales behind the pectoral |
| [University of Florida, WAS abstract](https://www.was.org/MeetingAbstracts/ShowAbstract/42634) / [Rising Tide](https://risingtideconservation.org/early-success-with-a-halichoeres-wrasse) | 1 / 2 | pelagic eggs ~660 µm; spawns at sunset; settles 22 days after hatching (reared 2015); **the front dorsal spot fades first in sex change** *(conference abstract)* |
| [TFH](https://tfhmagazine.com/articles/saltwater/halichoeres-melanurus) | 2 | very hardy; **sleeps buried in sand; at least 3 in of fine sand**; protogynous harem, a female turns male within weeks; eats pest flatworms and snails |
| [LiveAquaria](https://www.liveaquaria.com/product/2285/) | 2 | **50 gal**; peaceful; eats fireworms, pyramid snails and flatworms; **may eat feather dusters, tube worms and shrimp**; 2–3 in of sand; jumps; ~$52 |
| [Top Shelf Aquatics](https://topshelfaquatics.com/products/melanurus-wrasse-male-halichoeres-melanurus) | 2 | 55 gal; 74–80 °F; 2–4 in of fine aragonite, never crushed coral; eats small shrimp, small crabs and snails |

**Modelled as:**
- 12 cm, 50 gal and a 48×13 in footprint
- `burrower` and `escapeArtist`, preferring fine sand and avoiding bare floors, gravel and large pebbles
- `reefSafe 'mostly_safe'` with `coralRisk 0`, but `shrimpSafe 'caution'`; predator tags `copepod`, `worm`, `snail_small`, `shrimp_fry`, `shrimp_dwarf` and `sessile_invert`
- conditional rules against `tag:shrimp_dwarf` and the seahorse
- a protogynous harem (`idealGroup 3`) with `socialSexChange`; breeding `not_in_game` (reared only in research); lifespan 240 game-days
- the new `wrasse` behaviour set: forages low over rock and sand, dives into the sand when frightened, and sleeps buried

**Conflicts:** adult size ranges from 11 to 14 cm, and the game uses 12. Every source calls it safe with corals, but it eats small shrimp and some sessile invertebrates, and TFH calls it a problem in a reef with other invertebrates, so it is `mostly_safe`. TFH's "never bred" is out of date since 2015. The juvenile colours rest on retailer text and a Reef Life Survey snippet (the page returned 403). Some authors treat Indian Ocean fish as *H. chrysotaenia* (unresolved). There is no Tier 1 lifespan.

## Maroon clownfish
*Amphiprion biaculeatus* (formerly *Premnas biaculeatus*) · `clownfish` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Amphiprion-biaculeatus.html) | 1 | **17 cm TL max**; 1–16 m; **hosts *Entacmaea quadricolor***; adhesive eggs, male guards; zooplankton and benthic algae; IUCN LC (2021) |
| [WoRMS](https://www.marinespecies.org/aphia.php?p=taxdetails&id=1605249) | 1 | *A. biaculeatus* accepted; *Premnas biaculeatus* unaccepted; *P. epigrammata* a synonym |
| [Fishes of Australia](https://fishesofaustralia.net.au/home/species/378) | 1 | 16 cm TL; **females 2–3× the size of males**; three narrow white bars; the cheek spine crosses the head bar; protandrous hierarchy |
| [LiveAquaria](https://www.liveaquaria.com/product/105/?pcatid=105) | 2 | **30 gal**; 72–78 °F, SG 1.020–1.025, dKH 8–12; one or a pair; reef compatible; the spines catch in nets; ~$40 |
| [ORA — Gold Stripe Maroon](https://www.orafarm.com/product/gold-stripe-maroon-clownfish/) | 2 | Sumatran broodstock; bars white when young, **gold at 9–12 months**; ~1,500 eggs per spawn, more than 6,000 recorded; the female guards the nest; pairs spawning for 35+ years |
| [ORA — GoldXLightnings](https://www.orafarm.com/blog/2017/03/17/goldxlightnings/) | 2 | White × Gold crosses were no better than either parent; Lightning × Gold Nugget gave about six grades and does not breed true |
| [CORAL — Pedersen 2016](https://coralmagazine.com/?p=1490714) | 2 | Goldflake 2007 (Sustainable Aquatics), ORA 2012; **Gold Nugget × Gold Nugget gives only Nuggets**; the hypothesis: one copy Goldflake, two Gold Nugget |
| [CORAL — Lightning updates 2014](https://www.coralmagazine.com/2014/06/24/lightning-maroon-updates/) | 2 | wild mutation from Fisherman Island, PNG; **Lightning × normal gave ~50% Lightning twice**; not sex-linked; Morse Code is a sibling phenotype, not a line |

**Modelled as:**
- 16 cm (the big female; a male grows to 0.45 of her, `maleSizeFactor`, from Fishes of Australia's 2–3×, and the male that becomes the female grows into her size), 30 gal and a 36×12 in footprint; `bodyDepth 1.05`
- a `pair_hierarchy` with female–female "lethal"; `host_seeker` with a hostNote (no anemone needed)
- high-risk rules against the ocellaris and the seahorse
- the only one of these 13 that breeds: `clownfish_substrate` like the ocellaris, protandrous, with male care, a 64-hour incubation, a nursery and up to 12 raised per clutch
- three loci:
  - `gold`: Gold Stripe as a recessive
  - `lightning`: a rare dominant
  - `nugget`: one codominant allele, with one copy giving Goldflake and two giving Gold Nugget
- lifespan at the 500-day ceiling, like the ocellaris

**Conflicts:** Tang et al. (2021) merged *Premnas* into *Amphiprion*, but much of the hobby, LiveAquaria included, still says *Premnas*. None of the form genetics is proven; they are breeders' observations. Gold Dot (inheritance not stated) and Morse Code (not a line) are left out, and LuxLightning and Blood Orange are hybrids with other species. ORA has the gold come in at 9–12 months and CORAL at 9–15. No Tier 1 text places the three bars beyond "head and body", so the positions behind the eye, mid-body and at the tail base are the art's. There is no Tier 1 lifespan.

## Elegant starfish
*Fromia milleporella* (sold as the elegant or red Fromia) · `starfish` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [WoRMS](https://www.marinespecies.org/aphia.php?p=taxdetails&id=213299) | 1 | accepted name; Goniasteridae; Indo-Pacific; 0–30 m |
| [Nausicaá](https://nausicaa.fr/en/my-visit/animals/harlequin-shrimp) | 1 | harlequin shrimp eat *Fromia* |
| [TFH — Fenner](https://tfhmagazine.com/articles/saltwater/marbled-or-tile-sea-stars) | 2 | **at least 100 gal, running 6+ months**; mostly detritivores; drip-acclimate for at least 1 h; **most sea stars survive under a month, *Fromia* are sturdier**; arm-tip discharge is normal; hold at the dealer a week |
| [LiveAquaria — Red Sea Star](https://www.liveaquaria.com/product/578/) | 2 | 72–78 °F, pH 8.1–8.4, **SG 1.023–1.025**, dKH 8–12; very intolerant of sudden changes, no copper; Red & Black form; extremely difficult to breed; ~$24 |
| [Quality Marine — Red Fromia](https://www.qualitymarine.com/quality-marine/invertebrates/stars/fromia/red-fromia-59026) | 2 | algal film and detritus; shrimp, krill or pellet supplements; regrows arms; wild-collected |
| [Florent's Reef Guide](https://www.reefguide.org/fromiamilleporella.html) | 2 | 7–9 cm typical |
| [Reeflex](https://reeflex.net/tiere/714_Fromia_milleporella.htm) | 3 | 200 L; **"unproven" long term**: one keeper lost two stars after about a year when a blenny stripped the food film |

**Modelled as:**
- 9 cm across, 100 gal and a 48×18 in footprint
- `requiresMatureDays 20` (the six-month rule, as for the mandarin), `needsAlgaeOrBiofilm` and `medicationSensitive`
- `hardiness 0.35` and `difficulty 'advanced'`; `reefSafe 'safe'`
- prey tag `starfish`, and a usually-compatible rule against `tag:crustacean`, since large crabs and hermits pull stars apart
- one locus, `tips`, with Red & Black as a recessive; breeding `not_in_game`; lifespan 160 game-days
- the new `starfish` behaviour set: glides over glass and rock, a little busier at night

**Conflicts:** no source pins "elegant starfish" to one species. Wikipedia gives "elegant sea star" to *F. nodosa*, and *F. elegans* is a WoRMS synonym of *F. indica*. The trade sells the red Fromia as *F. milleporella*, which the game uses under the trade name "Elegant Starfish". WoRMS's "deep purple above" (Sloan 1979) disagrees with every other source, which say red. Sizes run from 7 to 15 cm. Some sources say it is active by day (LiveAquaria), others by night. LiveAquaria's family, Ophidiasteridae, is out of date.

## Fighting conch
*Strombus pugilis* (the Florida form long sold as *S. alatus*) · `conch` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [WoRMS](https://www.marinespecies.org/aphia.php?p=taxdetails&id=419695) / [Irwin et al. 2024](https://archimer.ifremer.fr/doc/00949/106132) | 1 | *S. pugilis* accepted; *S. alatus* a junior synonym |
| [SeaLifeBase](https://sealifebase.se/summary/Strombus-alatus) | 1 | max 11.2 cm; 0–183 m; leaps with a sickle-shaped operculum; IUCN NE |
| [Davis & Cantillo Villa 2019, World Aquaculture](https://www.was.org/Magazine/2019/04/33/) | 1 | 7–10 cm; internal fertilisation, sperm storage; sand-coated egg strings; **veligers settle at ~21 days**; matures at 1–2 yr; Harbor Branch produced 50,000–100,000 a year |
| [LiveAquaria](https://www.liveaquaria.com/product/2174/) | 2 | easy; 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.023–1.025; **needs an open sand bed**; sensitive to nitrate; ~$30 |
| [Top Shelf Aquatics](https://topshelfaquatics.com/pages/saltwater-invertebrates/fighting-conch) | 2 | buries with only the eyes showing; **2–3 in of sand**; bulldozes frags; hermits, triggers, puffers and wrasses are threats |
| [That Pet Place](https://www.thatpetplace.com/Strombus-alatus-fighting-conch-206603) | 2 | 90 gal; hops |
| [FWC — sea shells](https://myfwc.com/fishing/saltwater/recreational/sea-shells/) | 1 | a licence is needed to take a live shell in Florida; Lee County bans it |

**Modelled as:**
- a 9 cm shell, 30 gal and a 30×12 in footprint
- `burrower`, `needsAlgaeOrBiofilm` and `medicationSensitive`; it needs sand and avoids bare floors, gravel and large pebbles
- `reefSafe 'mostly_safe'` with `coralRisk 0.02`, for the frags it bulldozes
- male–male "tension" for the snout sparring that names it; a usually-compatible rule against `tag:hermit_crab`
- breeding `not_in_game`; its clutch of 76,000–485,000 is the figure for the genus; lifespan 160 game-days
- the new `conch` behaviour set: lurches forward on its operculum, ploughs the sand and settles half-buried, mostly at night

**Conflicts:** Irwin et al. (2024) sank *S. alatus* into *S. pugilis*, but the trade still sells *S. alatus*. The minimum tank is 15 gal (Aquatics Unlimited), 20 (Reef Exclusive, search only) or 90 (That Pet Place); the game uses 30 with an open sand bed. SeaLifeBase calls it a broadcast spawner, which contradicts internal fertilisation and egg strings, so the game follows the aquaculture source. No lifespan was found; it matures at 1–2 years, and the game gives it about 4.

## Scarlet reef hermit crab
*Paguristes cadenati* · `hermit_crab` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [WoRMS](https://www.marinespecies.org/aphia.php?p=taxdetails&id=368215) | 1 | accepted name; Diogenidae; coral reefs and hard bottoms |
| [Oregon Coast Aquarium](https://aquarium.org/animals/red-reef-hermit-crab/) | 1 | detritus scavenger; IUCN NE; on a 1985 Barbados stamp |
| [Naturalis Caribbean diving](https://caribbean-diving.linnaeus.naturalis.nl/linnaeus_ng/app/views/species/taxon.php?id=6428) | 1 | red legs, yellow eyestalks; ~3 cm |
| [LiveAquaria](https://www.liveaquaria.com/product/620/) | 2 | 1.5 in max; 72–78 °F, pH 8.1–8.4, SG 1.020–1.025; **eats hair and slime algae and cyanobacteria**; needs spare shells; reef safe |
| [Top Shelf Aquatics](https://topshelfaquatics.com/pages/saltwater-invertebrates/scarlett-red-hermit-crab) | 2 | **rarely bothers snails, but may take a shell when spare shells are scarce**; prefers light, oval shells; hides to molt; may irritate LPS |
| [Aquatics Unlimited](https://aquaticsunlimited.com/product/crab-hermit-scarlet-paguristes-cadenati) | 2 | **10–15 gal** established tank; several can share a tank; ~$7 |

**Modelled as:** 3 cm and 10 gal; a colony (`idealGroup 3`) with "tension" over shells; `needsAlgaeOrBiofilm` and `medicationSensitive`; predator tag `snail_small`. Against `tag:snail` it has a usually-compatible rule (incident risk 0.015), gentler than the blue-leg's conditional rule. It has an incompatible rule against the mantis shrimp and is mantis prey through the `crustacean` tag. Females carry the eggs; breeding is `not_in_game` and the lifespan is 120 game-days. It uses the blue-leg's `hermit_crab` behaviour set.

**Conflict:** sources and keepers disagree about snails, and many bad reports turn out to be misidentified red-leg hermits, so it carries a small risk that spare shells reduce. Depth is given as 0–100, 8–30 or 1–52 m, which does not matter in a tank. The eyestalks are yellow (Naturalis) or orange (Oregon Coast Aquarium); the game uses yellow. The 2–4 year lifespan comes from a retailer page seen only in search.

## Mexican turbo snail
*Turbo fluctuosus* (wavy turban) · `snail` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [WoRMS](https://www.marinespecies.org/aphia.php?p=taxdetails&id=413380) | 1 | accepted name; "*Turbo fluctuosa*" is an incorrect spelling |
| [Galland, Hastings & Leichter 2019, Sci. Rep.](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6889390/fullTextXML) | 1 | Gulf of California reefs at 5 m ran **14.1–32.1 °C over a year**, site means 20.9–25.3 °C |
| [LiveAquaria](https://www.liveaquaria.com/product/571/) | 2 | up to 2 in; 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.023–1.025; fond of hair algae; **knocks over unsecured frags**; no collection July–September |
| [Top Shelf Aquatics](https://topshelfaquatics.com/pages/saltwater-invertebrates/mexican-turbo-snail) | 2 | 24–26 °C; grazes at night; threats: wrasses, puffers, triggers, hawkfish, crabs and hermits |
| [saltwateraquarium.com](https://www.saltwateraquarium.com/10-pack-large-mexican-turbo-snail-turbo-fluctuosa-cleanup-crew/) | 2 | life "significantly shortened" at 26 °C or more (no study cited); can't right itself on sand; ~$5 each |
| [Aquarium Breeder](https://aquariumbreeder.com/?p=5920) | 3 | 10 gal minimum; **one per 5–10 gal**; can right itself with effort; 3–5 yr wild, 1–2 in tanks |

**Modelled as:** 5 cm and 10 gal; an ideal of **21.5–25 °C**, tolerating 19–28 °C; a herbivore grazer with `needsAlgaeOrBiofilm` and `medicationSensitive`. It is `reefSafe 'mostly_safe'` (`coralRisk 0.02`), because it pushes over loose rock and frags, and it has an incompatible rule against the mantis shrimp. Breeding is `not_in_game` and the lifespan is 140 game-days. It uses the `snail` behaviour set, busiest at night.

**Conflicts:** it is often called a cold-water snail, but its own reefs run 14–32 °C, and the early deaths in warm tanks are anecdote. Sources disagree about whether it can right itself; the game lets it. The lifespan comes from a hobby guide only. One shell site calls it a simultaneous hermaphrodite, which is probably wrong (FAO's snail manual gives *Turbo* separate sexes). Reeflex lists it in the Gulf of Mexico (search only), against WoRMS's eastern Pacific range.

## Nassarius snail
*Phrontis vibex* (bruised nassa, sold as *Nassarius vibex*) · `snail_sand` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [WoRMS](https://www.marinespecies.org/aphia.php?p=taxdetails&id=877061) | 1 | *Phrontis vibex* accepted; *Nassarius vibex* unaccepted (Galindo et al. 2016) |
| [ADW](https://animaldiversity.org/accounts/Nassarius_vibex/) | 1 | Cape Cod to Brazil; 10–20 mm; eats carrion; usually buried; lives "several years" |
| [Bailey-Matthews Shell Museum](https://shells.shellmuseum.org/shell/phrontis-vibex/) | 1 | **up to 15 mm**; 7–12 axial ribs crossed by spiral cords; smells carcasses from far away; white, yellowish or tan, mottled |
| [SeaLifeBase](https://www.sealifebase.se/summary/Phrontis-vibex.html) | 1 | max 2.0 cm; 0–31 m on soft bottoms; not a broadcast spawner; IUCN NE |
| [Reef Cleaners](https://www.reefcleaners.org/nassarius-vibex) / [When to add cleaners](https://www.reefcleaners.org/when-to-add-cleaners) | 2 | **does not eat algae; stock by feeding**; gathers at the base of the rock in bare tanks; slow metabolism, fed once or twice a week at most; ~$0.80 |
| [LiveAquaria](https://www.liveaquaria.com/products/nassarius-snail) | 2 | **buried with only the siphon showing**; 72–78 °F, SG 1.023–1.025; reef safe; extremely difficult to breed |
| [Gensou](https://gensou.sg/nassarius-snail-marine-cleanup-care/) | 3 | about one per 15–20 L; overstocked snails starve; wrasses and hermits may eat it |

**Modelled as:** 1.5 cm and 10 gal; a carnivorous scavenger with `hungerHours 40` (well above the usual 10–18, for its slow metabolism); `burrower` and `medicationSensitive`; a colony (`idealGroup 5`); `reefSafe 'safe'`; an incompatible rule against the mantis shrimp. Breeding is `not_in_game` and the lifespan is 160 game-days. It uses the new `snail_sand` behaviour set: it stays buried with the siphon up and races out when food lands.

**Conflicts:** WoRMS moved it to *Phrontis*, but the trade still says *Nassarius vibex*. The trade also sells other animals under the name: LiveAquaria's Caribbean and Indo-Pacific "Nassarius sp." and the larger "Tongan" (*N. distortus* and others). The game uses the Atlantic bruised nassa. Separate sexes are the rule for its group but were not confirmed for this species. The stocking figures come from retailers and forums only.

## Astraea snail
*Lithopoma tectum* (West Indian starsnail, sold as *Astraea tecta*) · `snail` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [WoRMS](https://www.marinespecies.org/aphia.php?p=taxdetails&id=419499) | 1 | accepted name; West Indian starsnail; no record for "Astraea tecta" |
| [SeaLifeBase](https://www.sealifebase.se/summary/Lithopoma-tectum.html) | 1 | max 6.0 cm; 0–10 m on rocky intertidal shores; IUCN NE |
| [Geiger & Levine (FWC), Aquaculture 2022](https://was.org/Meeting/Program/PaperDetail/157970) | 1 | Florida landings of *Turbo* plus *Lithopoma* can exceed a million a year *(abstract)* |
| [LiveAquaria](https://www.liveaquaria.com/products/astraea-turbo-snail) | 2 | up to 1 in; pyramid shell; eats hair algae, cyanobacteria and diatoms; **cannot right itself**; 72–78 °F, SG 1.023–1.025 |
| [Reef Cleaners](https://www.reefcleaners.org/astraea-tectas) | 2 | nickel- to quarter-sized; film and hair algae; cannot right itself; ~$1 |
| [Top Shelf Aquatics](https://topshelfaquatics.com/pages/saltwater-invertebrates/astrea-snail) | 2 | mostly ignores hair algae; **staying upside down can be fatal**; juveniles rare in tanks |
| [Aquarium Breeder](https://aquariumbreeder.com/astrea-snail-detailed-guide-care-diet-and-breeding/) / [Breeders Registry](https://breedersregistry.org/?p=592) | 3 | 5 gal minimum; 3–5 yr; busiest at dusk; separate sexes; in a 1994 tank spawning, sperm came 30 min before the eggs and every egg was eaten |

**Modelled as:** 2.5 cm and 5 gal; `needsAlgaeOrBiofilm` and `medicationSensitive`; `reefSafe 'safe'` (too small to topple corals); an incompatible rule against the mantis shrimp. It has the `cannot_self_right` behaviour, and `hardiness 0.6` reflects how delicate that makes it. Breeding is `not_in_game` and the lifespan is 140 game-days.

**Conflicts:** "Astraea tecta" is a trade name, and trade stock probably mixes *Lithopoma* species (the American starsnail, *L. americanum*, is a separate valid species and also a licensed Florida catch). Most sources say it eats hair algae, but Top Shelf says it mostly ignores it. The lifespan comes from a hobby guide only.

## Cerith snail
*Cerithium atratum* (Florida cerith) · `snail` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [WoRMS](https://www.marinespecies.org/aphia.php?p=taxdetails&id=224572) | 1 | accepted name; Florida cerith; *C. floridanum* a synonym |
| [SeaLifeBase](https://www.sealifebase.se/summary/Cerithium-atratum.html) | 1 | North Carolina to Brazil; 0–91 m; max 5.0 cm; IUCN NE |
| [Bailey-Matthews Shell Museum](https://shells.shellmuseum.org/shell/cerithium-atratum/) | 1 | ~40 mm; detritus feeder; beaded spiral cords; grey with brown mottling |
| [Biagi et al. 2006, An. Acad. Bras. Ciênc.](https://www.scielo.br/j/aabc/a/JDCTK3Zm7YFjVqb73tWyzgC/abstract/?lang=en) | 1 | **75.86% of the shells used by the hermit *Paguristes calliopsis* were *C. atratum*** *(abstract)* |
| [Reef Cleaners — Florida Cerith](https://www.reefcleaners.org/florida-cerith) | 2 | 1–1.25 in; film algae, diatoms and detritus; egg strands in summer, larvae rarely settle; active at night; **dormant for 72 h after being added**; ~$1 |
| [LiveAquaria](https://www.liveaquaria.com/products/cerith-snail) | 2 | sold as "Cerithium sp." from the Caribbean and eastern Pacific; best with deep sand; egg loops on the glass after dark; reef safe |

**Modelled as:** 3 cm and 5 gal; a detritivore with `needsAlgaeOrBiofilm` and `medicationSensitive`; `reefSafe 'safe'`; an incompatible rule against the mantis shrimp. In the `snail` behaviour set it turns the sand by day (burrowing 0.4) and climbs the glass at night. Breeding is `not_in_game` and the lifespan is 140 game-days, like the other clean-up snails.

**Conflicts:** ADR-0052 listed it as *Cerithium* sp. Trade ceriths may be mixed (LiveAquaria's come from two oceans, and the "Stocky Cerith" is *C. litteratum*), so the game uses the Florida cerith that Reef Cleaners sells. No lifespan was found. SeaLifeBase's "broadcast spawner" is a generic note for the order and contradicts the egg strands, so the game follows the keepers' reports.

## Chunk 16: reef favourites (ADR-0052)

Chunk 16's wave B: nine popular reef animals the game lacked. As with wave A, none needs research of its own; each comes into the shop once Marine Systems is researched (ADR-0052 decision 9). The data files are the source of truth for every number. Where they differ from the research briefs or from ADR-0052's list (an accepted spelling), the data wins, and the section says why.

## Flame angelfish
*Centropyge loriculus* (sold as *C. loricula*) · `angelfish_dwarf` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Centropyge-loricula.html) | 1 | **15 cm TL**; 0–60 m in clear lagoons and seaward reefs, never far from shelter; algae; harems of 3–7; frequently exported; IUCN LC (2009) |
| [WoRMS](https://www.marinespecies.org/rest/AphiaRecordsByName/Centropyge%20loriculus?like=false&marine_only=true) / [Catalog of Fishes](https://researcharchive.calacademy.org/research/ichthyology/catalog/fishcatget.asp?spid=38821) | 1 | *loriculus* is the valid spelling ("a noun in apposition"); *loricula* unaccepted |
| [Australian Museum](https://australian.museum/Flame-Angelfish-Centropyge-loriculus) | 1 | ~10 cm; red-orange with black bars; the rear dorsal and anal fins banded purple-blue and black |
| [Schultz et al. 2007, *Mar. Biol.* 151:167–175](https://marineinfo.org/id/publication/259416) | 1 | red Hawaiian, Marquesan and orange fish show no genetic split, even 5,700 km apart *(abstract via search index)* |
| [LiveAquaria](https://www.liveaquaria.com/product/444/?pcatid=444) | 2 | **70 gal**; 72–78 °F, SG 1.020–1.025, pH 8.1–8.4, dKH 8–12; semi-aggressive; **reef with caution: nips fleshy LPS, soft and stony corals and clam mantles**; very copper-sensitive; Marshall, Christmas Island, Cebu and Tahiti colours; add last; ~$110 |
| [Biota](https://shop.thebiotagroup.com/products/flame-angelfish) | 2 | 65 gal ("70 suggested"); protogynous; territorial to its own kind and other dwarf angels; a pair only in a big tank, added together; sporadic captive-bred lots with the Oceanic Institute, ~$275 |
| [TFH](https://www.tfhmagazine.com/articles/saltwater/centropyge-loricula) | 2 | 24–28 °C; rival males "will fight to the death"; hardy once eating an algae-based diet |
| [Reef Builders 2020](https://reefbuilders.com/2020/04/24/morse-code-flame-angelfish) | 2 | Marquesan fish have the bars reduced or absent; the "Morse code" fish is one aberrant specimen, not a form |

**Modelled as:**
- 10 cm adult (the Australian Museum's figure), 70 gal and a 48×18 in footprint
- `reefSafe 'caution'` with `coralRisk 0.3`; predator tags `coral_polyp`, `clam` and `sessile_invert`
- one per tank, male–male "lethal"; rules: conditional against `tag:dwarf_angelfish` (the coral beauty), high-risk against `tag:clam` and the seahorse
- protogynous with `socialSexChange`; breeding `not_in_game` (reared only by the Oceanic Institute and Biota); lifespan 240 game-days
- two loci:
  - `bars`: the Marquesan form (bars faint) as a rare recessive
  - `intensity`: its "Richly coloured" overlay stands for the redder locality fish (no trade name: ADR-0052 decision 2)
- the `angelfish_dwarf` behaviour set: it darts between caves and pecks at the rock; the art gives males more blue in the rear fins

**Conflicts:** WoRMS and the Catalog of Fishes spell it *loriculus*, while the trade and ADR-0052 write *loricula*. The size is 15 cm (FishBase), about 10 cm (Australian Museum) or 3.5–4 in in tanks; the game uses 10. Tanks run from 55 gal (Animal-World, seen only; the site is gone) to 70, and the game uses 70. Protogyny is documented across *Centropyge* (Hioki 2002; Sakai et al. 2003; Lutnesky 1996) but not yet for this species. LiveAquaria's locality colours (redder Marshall Islands fish, thin-barred Christmas Island fish, blurry Cebu bars, blood-red Tahiti fish) are only individual variation in the game. Only the Marquesan form is named, and its inheritance is unknown. No juvenile colours were found, so the young look like the adults. The 5–7+ year lifespan is weakly sourced, and captive breeding at Bali Aquarich could not be verified.

## Six-line wrasse
*Pseudocheilinus hexataenia* · `wrasse` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Pseudocheilinus-hexataenia.html) | 1 | **10 cm TL**; the Red Sea and East Africa to the Tuamotus; 1–35 m among coral branches; small crustaceans; small loose groups, pairing to breed; 24–28 °C; IUCN LC (2009) |
| [Australian Museum](https://australian.museum/learn/animals/fishes/sixline-wrasse-pseudocheilinus-hexataenia/) / [Fishes of Australia](https://fishesofaustralia.net.au/home/species/266) | 1 | 8.5 cm and 7.5 cm TL; violet-blue with six orange stripes; green tail; a black eyespot ringed blue on the upper tail base |
| [Oregon Coast Aquarium](https://aquarium.org/animals/six-line-wrasse/) | 1 | often in *Pocillopora*; starts female and can become male; juveniles pick parasites off other fish; pairs dash upward to spawn before sunset |
| [Barton et al. 2020, *Aquac. Environ. Interact.* 12:61–66](https://researchonline.jcu.edu.au/62557/) | 1 | in 24-hour trials it **ate every adult *Acropora*-eating flatworm (n = 9) but none of their egg capsules** |
| [LiveAquaria](https://www.liveaquaria.com/products/six-line-wrasse) | 2 | **30 gal in the text, 60 in the quick stats**; 72–78 °F, SG 1.020–1.025, pH 8.1–8.4, dKH 8–12; semi-aggressive, bullies peaceful wrasses; eats pyramidellid snails, flatworms and bristleworms; reef safe; easy; ~$57 |
| [Quality Marine](https://www.qualitymarine.com/quality-marine/fish/wrasses/pseudocheilinus/six-line-33580/) | 2 | 55 gal; one per tank, never two males; females smaller; jumps |
| [Breeders' Registry](https://breedersregistry.org/spawning-reports/pseudocheilinus-hexataenia-psehex-053109-berand-001/) | 2 | spawned daily in captivity, ~800 µm floating eggs; none raised |
| [Reeflex](https://reeflex.net/tiere/183_Pseudocheilinus_hexataenia.htm) | 3 | 400 L; keepers report it chasing or killing small wrasses, dwarf angels and damsels and attacking newcomers; sleeps in a mucus cocoon |

**Modelled as:**
- 8 cm, 40 gal and a 36×12 in footprint; `activeSwimmer` and `escapeArtist`
- `reefSafe 'safe'` with `coralRisk 0`, but `shrimpSafe 'caution'`; predator tags `copepod`, `worm`, `snail_small`, `shrimp_fry` and `shrimp_dwarf`
- solitary and never two (male–male "lethal", female–female "fight"); rules: conditional against `tag:wrasse` and `tag:shrimp_dwarf`, high-risk against the seahorse
- protogynous, without `socialSexChange`; breeding `not_in_game` (spawned in captivity, never raised); lifespan 240 game-days
- no colour forms, so only the intensity locus
- the `wrasse` behaviour set with `rock_sleep`: unlike the melanurus, it darts through the rockwork and sleeps in a crevice in its mucus cocoon, never in the sand; it hunts pests (`pest_hunt`)

**Conflicts:** LiveAquaria gives both 30 and 60 gal on one page and Quality Marine 55; the game uses 40 with a three-foot footprint. The scientific sources describe orange stripes on violet, and LiveAquaria "six blue lines on orange"; the game follows the scientific description. Protogyny and the mucus cocoon are reported for the genus and in hobby sources, not in a study of this species, and the Oregon Coast Aquarium's phase description may be generic. Hobby results against pyramid snails are mixed, though the flatworm trial is clear. The 4–10 year lifespan comes from Tier 3 sites only.

## Lawnmower blenny
*Salarias fasciatus* (jewelled rockskipper) · `blenny` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Salarias-fasciatus.html) | 1 | **14 cm TL**; the Red Sea to Samoa; 0–8 m on algae-rich reef flats and rubble; scrapes algae; solitary, pairing to breed; adhesive eggs on a pedestal; facultative air-breather; IUCN LC (2009) |
| [Fishes of Australia](https://fishesofaustralia.net.au/home/species/4759) | 1 | 14 cm; mainly a detritivore, combing organic matter from turf algae; rests among dead branching coral; colour pattern |
| [Awata et al. 2010, *Ichthyol. Res.* 57:161–168](https://agris.fao.org/search/en/records/64724de253aa8c896305af08) | 1 | males guard the brood; breeds April–June in Okinawa; the sexes differ only in the males' longer anal spines |
| [LiveAquaria](https://www.liveaquaria.com/products/sailfin-algae-blenny) | 2 | **30 gal**; 72–78 °F, SG 1.020–1.025, pH 8.1–8.4, dKH 8–12; one per tank; fights other blennies and fish of its shape; **may nip small-polyp stony corals and clam mantles**; ~$30 |
| [Quality Marine](https://qualitymarine.com/quality-marine/fish/blennies/salarias/sailfin-algae-12518) | 2 | 30 gal; little or no swim bladder, so it does not hover; uses empty tubes and shells; jumps |
| [Reef Builders 2015](https://reefbuilders.com/2015/05/08/the-lawnmower-blenny-a-funny-fascinating-fish-of-unpredictable-utility) | 2 | 40 gal; needs a mature tank; **some wild fish never accept prepared food and starve**; cirri over the eyes; reef safe |
| [Biota](https://shop.thebiotagroup.com/products/lawnmower-blenny) / [CORAL 2023](https://www.coralmagazine.com/2023/06/16/long-overdue-captive-bred-lawnmower-blennies/) | 2 | the first captive-bred fish were released in 2023, ~$50; they also take mysis, brine shrimp and small pellets; 20 gal for captive-bred fish |
| [Aquarium Source](https://www.aquariumsource.com/lawnmower-blenny/) | 3 | 55 gal (100 for a pair); may eat tiny snails; sits in a crevice at night with only its face showing |

**Modelled as:**
- 13 cm, 30 gal and a 36×12 in footprint; `escapeArtist` and `needsAlgaeOrBiofilm`
- a herbivore grazer on biofilm, detritus and seaweed, with mysis and small pellets as extras
- `reefSafe 'mostly_safe'` with `coralRisk 0.05`; safe with shrimp, snails and fry; no predator tags
- solitary, with a high-risk rule against `tag:blenny`
- breeding `not_in_game` (captive-bred only by Biota); male care; lifespan 160 game-days
- no colour forms, so only the intensity locus
- the new `blenny` behaviour set: it perches propped on its fins on rock and glass, swivels its eyes, then hops to a new spot to graze

**Conflicts:** tanks run from 20 gal (Biota, for captive-bred fish) through 30 (LiveAquaria, Quality Marine) and 40 (Reef Builders) to 55 (Aquarium Source); the game uses 30. LiveAquaria warns of SPS and clam nipping, while Biota and Reef Builders call it reef-safe, so it is `mostly_safe`. Fishes of Australia calls it mainly a detritivore; the game makes it a herbivore grazer whose foods include detritus. Sources disagree on whether the dorsal fin is notched (Wikipedia no, Seatizens yes). Wikipedia's "about 15% plant" diet is unverified. The 2–6 year lifespan comes from Tier 3 sources only.

## Flame hawkfish
*Neocirrhites armatus* (often spelled *Neocirrhitus*) · `hawkfish` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Neocirrhitus-armatus.html) | 1 | **9 cm TL**; the Ryukyus to the Line Islands; 1–10 m on surge-swept reef fronts, deep inside branching *Pocillopora* and *Stylophora*; small crustaceans; needs well-oxygenated water; "fades in captivity"; IUCN LC (2015) |
| [FishBase — reproduction](https://www.fishbase.se/Reproduction/5832) | 1 | protogynous (Sadovy & Donaldson 1995); pelagic batch spawner, no care; facultatively monogamous pairs, sometimes harems |
| [WoRMS](https://www.marinespecies.org/rest/AphiaRecordsByName/Neocirrhites%20armatus?like=false&marine_only=true) | 1 | *Neocirrhites* Castelnau 1873 is the valid spelling; "Neocirrhitus" a misspelling; the only species in its genus |
| [University of Florida, Aquaculture America 2024](https://was.org/Meeting/Program/PaperDetail/161921) | 1 | spawning since June 2022; larval trials still lose most larvae at first feeding *(conference abstract)* |
| [LiveAquaria](https://www.liveaquaria.com/products/flame-hawkfish) | 2 | **30 gal**; no small shrimp; careful with small gobies and blennies; "Western Pacific" and "Tahiti" locales; ~$80 |
| [Quality Marine — product page](https://www.qualitymarine.com/quality-marine/fish/hawks/neocirrhites/flame-armatus-21004/) / [Revisited](https://www.qualitymarine.com/news/revisited-flame-hawkfish/) | 2 | 30 gal (product page), 40 gal (articles); one per tank, intolerant of its own kind; may eat snails and crabs; courts and spawns at dusk; rests in a lair at night; **10+ years**; varied, vitamin-enriched food keeps the red |
| [TFH](https://www.tfhmagazine.com/articles/saltwater/neocirrhites-armatus) | 2 | eats small fish and moving invertebrates; no swim bladder, so it perches on its pelvic fins; spawned in captivity but never raised |
| [Reef Builders 2015](https://reefbuilders.com/2015/01/14/the-flame-hawkfish-a-vision-in-red) | 2 | 20–30 gal; a "football" body; constant perching can keep coral polyps retracted; the red fades to orange in captivity |

**Modelled as:**
- 9 cm, 30 gal and a 36×12 in footprint; `highOxygen` and high flow
- an ambush feeder on mysis, brine shrimp and small pellets; predator tags `shrimp_dwarf`, `shrimp_fry`, `fish_tiny`, `fry`, `snail_small` and `copepod`, with prey up to 3 cm
- `reefSafe 'mostly_safe'` (`coralRisk 0.03`, for the polyps it sits on), `shrimpSafe 'unsafe'` and `snailSafe 'caution'`
- one per tank (`solitary_or_pair`, `idealGroup 1`); rules: high-risk against `tag:shrimp_dwarf`, `tag:fish_tiny` and the seahorse
- protogynous with `socialSexChange`; breeding `not_in_game` (spawned, never raised); lifespan 400 game-days for its 10+ years
- no colour forms, so only the intensity locus
- the new `hawkfish` behaviour set: it sits on the highest rock tips, watches, pounces on food and goes back to its perch

**Conflicts:** WoRMS spells the genus *Neocirrhites*. The misspelling *Neocirrhitus* is still used by the trade, in FishBase's page address and in ADR-0052. Depth is 1–10 m (FishBase) or 10–25 m (Wikipedia). Tanks run from 20 to 40 gal, and the game uses 30. LiveAquaria's "Western Pacific" and "Tahiti" locales have no documented colour difference, and fading to orange comes from diet, not a form. The 10+ year lifespan comes from a retailer without a citation. No juvenile colours were found. The perching pectoral rays and tufted spine tips are drawn from family descriptions, not checked for this species.

## Yellowtail damselfish
*Chrysiptera parasema* (yellowtail blue damsel, goldtail demoiselle) · `damsel` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [FishBase](https://www.fishbase.se/summary/Chrysiptera-parasema.html) | 1 | **7 cm TL**; the Solomons, Papua New Guinea, the Philippines and the Ryukyus (the Great Barrier Reef record doubtful); 1–16 m in small groups over *Acropora* in sheltered lagoons; demersal eggs, the male guards; IUCN LC (2021) |
| [LiveAquaria](https://www.liveaquaria.com/products/yellowtail-damselfish) | 2 | **30 gal**; 2.75 in; 72–78 °F, SG 1.020–1.025, pH 8.1–8.4, dKH 8–12; territorial to its own kind and fish of its size; reef and invertebrate safe; alone or in odd-numbered groups of 3–7; males larger and slimmer; easy; ~$25 |
| [Reef Builders 2013](https://reefbuilders.com/2013/11/25/chrysiptera-parasema-yellowtail-damselfish-demoiselle) | 2 | about 20 gal; unusually mild for a damsel; add shy look-alikes first |
| [ORA](https://www.orafarm.com/product/yellowtail-blue-damsel/) / [CORAL 2016](https://www.coralmagazine.com/?p=1460673) | 2 | ORA raised about 60 from three spawns in 2016, settling at about 23 days, partly as a "Dory substitute"; it shelters in branching coral at night |
| [TFH](https://www.tfhmagazine.com/articles/saltwater/chrysiptera-parasema) | 2 | electric-blue body with a yellow tail |
| [Fish Profiles](https://fishprofiles.com/profiles/marine/Damselfish/Chrysiptera_parasema/) | 3 | 50 gal to keep more than two; 24–27 °C; middle water; a "concave" tail |
| [Wikipedia](https://en.wikipedia.org/wiki/Chrysiptera_parasema) | 3 | eggs hatch in about 4 days; yellow never on the back or belly (a yellow belly means the azure damsel, a yellow chin the blue devil); Papua New Guinea fish show more yellow in the fins; darkens when stressed; 4–6 years |

**Modelled as:**
- 7 cm, 20 gal and a 30×12 in footprint; `activeSwimmer`
- `reefSafe 'safe'`, safe with shrimp and snails
- a group (`idealGroup 3`) with male–male "fight"; rules: conditional against `tag:damselfish` (the green chromis) and against the seahorse (workable with target feeding)
- the only wave B species that breeds: `egg_layer_generic`, separate sexes, male care, a 32-hour incubation, a nursery and up to 6 raised per clutch; hard (difficulty 0.75), after ORA's small first success
- no colour forms, so only the intensity locus; lifespan 200 game-days
- the new `damsel` behaviour set: it hovers over its own patch of rock, darts in and out and chases off intruders

**Conflicts:** tanks run from about 20 gal (Reef Builders) to 30 (LiveAquaria), or 50 to keep more than two (Fish Profiles); the game uses 20. No sex change is documented for this damsel, and it is absent from Kuwamura et al.'s (2020) list of hermaphrodite fishes, so it has separate sexes, although some damsels (*Dascyllus*, *Pomacentrus amboinensis*) are protogynous. The 4–6 year lifespan ("up to 15") comes from Wikipedia only.

## Emerald crab
*Mithraculus sculptus* (emerald mithrax; formerly *Mithrax sculptus*) · `crab` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [WoRMS](https://www.marinespecies.org/rest/AphiaRecordsByName/Mithraculus%20sculptus?like=false&marine_only=true) | 1 | accepted name; *Mithrax sculptus* a superseded combination |
| [SeaLifeBase](https://www.sealifebase.se/summary/Speciessummary.php?id=27093) | 1 | Florida and the Gulf of Mexico to Brazil; 0–55 m; separate sexes, courtship and indirect sperm transfer; IUCN NE |
| [Wagner 1990, *Zool. Verhandelingen* 264](https://repository.naturalis.nl/document/149174) | 1 | **largest male 27 mm wide**; carapace broader than long, with four lobes on each side; spoon-shaped claws; olive-green with bluish-white spots and white tips; among calcareous algae, seagrass, corals and sun anemones; stops moulting after the puberty moult |
| [Rhyne, Fujita & Calado 2006, JMBA 86:1133–1147](https://research.nhm.org/pdfs/31813/31813.pdf) | 1 | two zoea stages of 2 days each, then a megalopa of 3–9 days at 28–29 °C; larvae moult just after dark |
| [Figueiredo et al. 2008, JMBA 88:95–101](https://www.cambridge.org/core/journals/journal-of-the-marine-biological-association-of-the-united-kingdom/article/efficiency-of-using-emerald-crabs-mithraculus-sculptus-to-control-bubble-alga-ventricaria-ventricosa-syn-valonia-ventricosa-in-aquaria-habitats/639F6330E0A684340BB80510279C03E9) | 1 | **eats bubble algae, but chose pellets 77% of the time, and pellets cut how much algae it ate** *(abstract)* |
| [LiveAquaria](https://www.liveaquaria.com/products/emerald-crab) | 2 | no minimum, only an established tank with plenty of rock; 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025; nocturnal; **an underfed crab may eat corals, invertebrates or small fish**; no copper; easy |
| [TFH](https://tfhmagazine.com/articles/saltwater/mithraculus-mithrax-sculptus) | 2 | an omnivorous scavenger, not a true herbivore; 24–28 °C, SG 1.024–1.026, calcium 380–430 ppm; 3–4 in across the legs |
| [Aquarium Source](https://www.aquariumsource.com/emerald-crab/) | 3 | 20–30 gal per crab; fights other crabs when food or space runs short; hides for days after a moult; 2–4 years |

**Modelled as:**
- 5 cm across the legs, 20 gal and a 24×12 in footprint
- an omnivorous scavenger on biofilm, detritus, seaweed and leftovers, with `needsAlgaeOrBiofilm` and `medicationSensitive`
- `reefSafe 'mostly_safe'` (`coralRisk 0.08`, for a hungry crab); predator tags `snail_small`, `copepod` and `worm`; prey tag `crustacean`, the prey of the mantis shrimp, lionfish and grouper
- solitary; rules: incompatible against the mantis shrimp, conditional against `tag:crab`
- breeding `not_in_game` (reared in the lab, not in numbers); females carry the eggs; lifespan 120 game-days
- no colour forms, so only the intensity locus
- the new `crab` behaviour set: wedged in a crevice by day, it climbs out after dark and picks over the rock with its spoon-tipped claws

**Conflicts:** SeaLifeBase gives a 1.2 cm maximum against Wagner's 27 mm. Wikipedia and Aquarium Source call the carapace longer than wide; the game follows Wagner (only the first crab stage is longer than broad). The game has no food tag for nuisance algae, so its algae eating is modelled as biofilm grazing. Tearing open bubble-algae cells may spread the alga (Figueiredo et al.). No species-specific predators were found, so the usual crab eaters are assumed. The 2–4 year lifespan comes from a hobby guide only, and no captive-bred emerald crabs were found on sale.

## Tuxedo urchin
*Mespilia globulus* (blue and red tuxedo pincushion urchin) · `urchin` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [WoRMS](https://www.marinespecies.org/rest/AphiaRecordsByName/Mespilia%20globulus?like=false&marine_only=true) | 1 | accepted name; Temnopleuridae |
| [SeaLifeBase](https://www.sealifebase.se/summary/Speciessummary.php?id=86764) | 1 | test 5 cm max; 0–80 m (the same page also says 0–60 m) on shallow reefs, rubble and seagrass; detritus and calcareous sediment; IUCN NE |
| [Matar et al., eLife reviewed preprint](https://elifesciences.org/reviewed-preprints/112682) | 1 | **the red and blue forms are one species** (its genome came from a red female and a blue male); separate sexes; a heat shock to 29 °C triggers spawning; larvae settle about 14 days after fertilisation; mature at 4–6 months |
| [Digimorph (UT Austin)](https://digimorph.geo.utexas.edu/specimens/Mespilia_globulus/) | 1 | 6–8 cm; five broad coloured bands alternating with five darker ones; covers itself with sponges, shells and algae; hides by day; common in stores |
| [Cornish 2000, *Porcupine!* 28 (HKU)](https://biosch.hku.hk/ecology/porcupine/por28/28-vert-urchin.htm) | 1 | urchins in general are eaten by larger wrasses, triggerfish, puffers and porcupinefish |
| [LiveAquaria](https://www.liveaquaria.com/products/tuxedo-urchin) | 2 | **20 gal**; 3 in; 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.023–1.025; no high nitrate or copper; easy; ~$40 |
| [Quality Marine](https://www.qualitymarine.com/news/tuxedo-urchins-and-coralline-algae/) | 2 | grazes coralline algae, which can't be supplemented; needs a mature, brightly lit tank; can loosen rockwork; losing spines means poor water |
| [Top Shelf Aquatics](https://topshelfaquatics.com/products/tuxedo-urchin) / [CORAL 2019](https://www.coralmagazine.com/?p=2893478) | 2 | picks up and dislodges loose frags; holds debris on its tube feet; ORA has sold captive-bred tuxedos since 2019 |
| [Wikipedia](https://en.wikipedia.org/wiki/Mespilia) | 3 | ten bare vertical zones, blue or green and velvety; spines red, brown or dark, to ~2 cm |

**Modelled as:**
- 7 cm across the spines, 20 gal and a 24×12 in footprint
- `requiresMatureDays 20`, `needsAlgaeOrBiofilm` and `medicationSensitive`; a herbivore grazer in bright light; live-rock and reef tanks only
- `reefSafe 'mostly_safe'` (`coralRisk 0.05`, for the frags it carries off and the rock it loosens); peaceful, with no rules of its own; prey tag `starfish` (the tag covers sea stars and urchins)
- solitary; breeding `not_in_game` (ORA breeds it, the game does not); lifespan 160 game-days
- one locus, `red`: the Red form as a recessive, because its inheritance is unpublished
- the new `urchin` behaviour set: it creeps over glass and rock at night with a shell or two on its spines, and parks in a crevice by day

**Conflicts:** the test is 5 cm (SeaLifeBase, Wikipedia), 6–8 cm (Digimorph) or 3 in (LiveAquaria) across, and the depth 0–60, 0–80 or 200 m. Wikipedia describes ten bare bands, Digimorph five broad and five darker ones; the game draws ten. SeaLifeBase's "brooding is common" looks like text for the whole class and conflicts with the free-swimming larvae Matar et al. raised. Quality Marine's salinity of "1.056" is a typo. No lifespan or movement speed was found.

## Sand-sifting starfish
*Astropecten polyacanthus* (comb star) · `starfish_sand` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [WoRMS](https://www.marinespecies.org/rest/AphiaRecordsByName/Astropecten%20polyacanthus?like=false&marine_only=true) | 1 | accepted name; *Archaster typicus* is a separate accepted species |
| [SeaLifeBase](https://www.sealifebase.se/summary/Speciessummary.php?id=86687) | 1 | the Red Sea and South Africa to Hawaii; 0–222 m on silty sand; 12 cm; swallows bivalves and snails whole; buried by day, crawls at night; separate sexes, planktonic larvae; IUCN NE |
| [Noguchi et al. 1982, *Nippon Suisan Gakkaishi*](https://www.jstage.jst.go.jp/article/suisan1932/48/8/48_8_1173/_article) | 1 | carries tetrodotoxin, which passes into the trumpet snails that eat it |
| [Bos et al. 2011, *Mar. Biol.* 158:639](https://pmc.ncbi.nlm.nih.gov/articles/PMC3873073) | 1 | *Archaster*: arm radius 15–40 mm (81 at most), about 3 years old at 60 mm; buries with the tide; heavily harvested in the Philippines |
| [LiveAquaria](https://www.liveaquaria.com/products/sand-sifting-sea-star) | 2 | 8 in; a large tank with sand several inches deep; 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.023–1.025; sensitive to swings and copper, drip-acclimate; **once the detritus runs low it burrows in, starves and decays**; eats small shrimp, urchins, molluscs and stars; avoid puffers; "easy"; ~$24 |
| [Echinoblog (C. Mah)](https://echinoblog.blogspot.com/2011/04/telling-apart-sand-stars-archaster-vs.html) | 2 | *Astropecten*: long sharp marginal spines, a jumble of paxillae, pointed tube feet for digging; *Archaster*: flat blunt spines and suckered feet; both are sold under one name |
| [Reef Builders 2024](https://reefbuilders.com/2024/04/23/five-sand-sifters-for-a-reef-aquarium) | 2 | a mature reef with a large sand area is self-sufficient; keep one or several; its "sand sifting starfish" is *Archaster* |
| [ReefApp](https://reefapp.net/encyclopedia/archaster-typicus) / [Reeflex](https://reeflex.net/tiere/11072_Astropecten_polyacanthus.htm) | 2 / 3 | 400 L for *Archaster*, which is often sold as *A. polyacanthus*; it can strip a sand bed of detritus and life; **no long-term successes are reported for *A. polyacanthus***; no captive-bred stock |

**Modelled as:**
- 15 cm across, 100 gal and a 48×18 in footprint
- `requiresMatureDays 20` (the six-month rule, as for the elegant starfish), `burrower`, `needsAlgaeOrBiofilm` and `medicationSensitive`; it needs sand and avoids bare floors, gravel, fine gravel and large pebbles
- `hardiness 0.35` and `difficulty 'advanced'`; `reefSafe 'mostly_safe'` and `snailSafe 'caution'`
- a carnivorous scavenger; predator tags `snail_small`, `clam`, `worm`, `copepod` and `shrimp_fry`; a conditional rule against `tag:snail_small`; prey tag `starfish`
- one per tank; breeding `not_in_game`; lifespan 140 game-days
- no colour forms, so only the intensity locus
- the new `starfish_sand` behaviour set: buried by day, it surfaces after dark and slides across the bed, sinking in again to feed. The sea-star renderer draws it from its own spec.

**Conflicts:** the trade names are muddled. LiveAquaria sells both species under different names, ReefApp says *Archaster* is often sold as *A. polyacanthus*, and Reef Builders' sand sifter is *Archaster*; the game uses the comb star. LiveAquaria rates it easy, but Reeflex reports no long-term successes, so the game makes it hard. No source gives a per-gallon rule; the 100 gal minimum follows LiveAquaria's "large tank" and ReefApp's 400 L. Reef Builders says one or several can share a tank, while forums say a second usually starves (Tier 3); the game keeps one. Sizes run from 12 cm (SeaLifeBase) to 20 cm across (Wikipedia). SeaLifeBase gives the top as greenish-blue, brownish-grey or dark reddish-brown and Wikipedia as dark purplish; the game draws dark purplish. No lifespan was found.

## Bubble-tip anemone
*Entacmaea quadricolor* (BTA, bulb-tentacle anemone) · `anemone` · unlock none (buyable once Marine Systems is researched; ADR-0052 decision 9)

| Source | Tier | Facts used |
|---|---|---|
| [Titus et al. 2024, *Zootaxa* 5506(1)](https://par.nsf.gov/servlets/purl/10575794) | 1 | the northern Red Sea to the Marshall Islands; the foot deep in a crevice, never in sand; **disc to 400 mm**; tentacles to 100 mm, bulbed or plain, often purple-tipped with a white band; a red column without verrucae; solitary or in clonal clusters; the commonest host anemone |
| [SeaLifeBase](https://www.sealifebase.se/summary/Speciessummary.php?id=129744) | 1 | 0–200 m; clonal animals about 5 cm across in shallow water; lives mostly off its zooxanthellae; tentacles collapse when disturbed; IUCN NE |
| [Scott, Hardefeldt & Hall 2014, *PLoS ONE*](https://pmc.ncbi.nlm.nih.gov/articles/PMC4196916/) | 1 | 89–94% of halves and 63–80% of quarters survive cutting; research tanks shaded to 400 µmol m⁻² s⁻¹ or less to stop bleaching |
| [Scott & Harrison 2008](https://marineinfo.org/doc/publication/258892) / [2009](https://marineinfo.org/doc/publication/258508) | 1 | separate sexes, females far more common; broadcast spawns January–April in eastern Australia; larvae settle from day 5, peaking around day 10 |
| [Ollerton et al. 2007](https://pmc.ncbi.nlm.nih.gov/articles/PMC1766375) | 1 | hosts about half of all anemonefish |
| [LiveAquaria](https://www.liveaquaria.com/products/green-bubble-tip-anemone) | 2 | **30 gal**; 72–78 °F, pH 8.1–8.4, dKH 8–12, SG 1.020–1.025; medium flow; stings corals and other anemones; wanders until it settles; green ~$48, Grade A rose ~$239 |
| [Reef Builders 2023](https://reefbuilders.com/2023/02/08/the-indomitable-red-bubble-tip-anemone) / [2025](https://reefbuilders.com/2025/12/29/introduction-to-bubble-tip-anemone-care/) | 2 | splits over ~24 h, and one split led to a dozen or more; 150–200 PAR, ~20× turnover; ocellaris often host it in tanks; hold it over a crevice for 10 minutes; different strains fight with chemicals; 78 °F, SG 1.026, Ca 450, Mg 1300–1400 |
| [Bulk Reef Supply — ECC Rainbow](https://www.bulkreefsupply.com/ecc-rainbow-bubble-tip-anemone-eye-catching-coral.html) | 2 | 150–350 PAR; a mature, stable tank of 6+ months; guard pump intakes; target-feed small meaty food; ~$127 |
| [Wikipedia](https://en.wikipedia.org/wiki/Bubble-tip_anemone) | 3 | hosts 14 clownfish species in the wild, the maroon only in the solitary form; the young have about 20 tentacles |

**Modelled as:**
- a living animal (`category 'anemone'`); the bubble-tip decor piece stays, so saves keep it
- 25 cm across, 30 gal and a 30×12 in footprint; `requiresMatureDays 30` and `medicationSensitive`; bright light and moderate flow; reef and live-rock tanks only
- photosynthetic, target-fed with mysis, brine shrimp and coral food (`hungerHours 48`)
- `reefSafe 'caution'` (`coralRisk 0.3`) with a conditional rule against `tag:coral_polyp`; predator tags `fry`, `copepod` and `fish_tiny`; prey tag `stinging_cnidarian`, so the seahorse's incompatible rule applies to it
- a colony of its own clones (`idealGroup 1`); unrelated anemones are in "tension"
- breeding `fission` (chunk 16): one that has been in its tank a couple of weeks, is well fed (hunger 35 or less) and healthy (70+), and has room (one anemone per 30 gallons, within the stocking limit) splits now and then into a clone of itself — same genes, sex and look, starting half-grown — and rests 20 game-days (about six months) before splitting again; the timing is a game simplification, since no splitting rate in tanks was found; lifespan at the 500-day ceiling
- one codominant locus, `form`: green, with one rose copy giving rainbow and two giving rose
- it hosts clownfish (`hostNote`), with positive interactions for the maroon (its natural host) and the ocellaris (tank-raised fish often move in)
- the new `anemone` behaviour set: it creeps until it finds a crevice in the light, then settles for good. It closes at night and deflates and refills now and then. It carries a host spot for two clownfish, which moves with it.

**Conflicts:** the column is red or magenta (Titus et al.) or brown (SeaLifeBase); the game draws it red. Wikipedia calls splitting in the wild rare, yet clonal fields are common (Titus et al.). Why the tentacles bulb is unclear (fish, strong light, flow and feeding have all been proposed); the art keeps them bulbed. Green, rose and rainbow are traded clone lines with no published genetics. "Sunburst" (first one orange Colorado strain), "Black Widow" and "Nexus" are named clone lines and are not modelled. Daily deflating and shrinking after lights-out are reported only on forums. No lifespan, and no splitting rate in tanks, was found. The ocellaris is not a wild host (its hosts are *Heteractis magnifica*, *H. crispa* and *Stichodactyla gigantea*), but it often takes to a bubble-tip in tanks.

---

## Conflicts & uncertainty

- **Taxonomy drift:**
  - The dwarf lionfish is now *Neochirus brachypterus* (2023).
  - Trade "peppermint shrimp" is the *L. wurdemanni* complex, mostly *L. boggessi*.
  - "Trochus sp." covers several species.
  - Chunk 16:
    - The maroon clownfish is *Amphiprion biaculeatus*: Tang et al. (2021) merged *Premnas* into *Amphiprion*, though much of the hobby still says *Premnas*.
    - The Florida fighting conch is *Strombus pugilis*: Irwin et al. (2024) sank *S. alatus* into it. The trade still says *S. alatus*, and the game keeps the trade name "Fighting Conch".
    - The trade Nassarius is *Phrontis vibex*: WoRMS moved *Nassarius vibex* there (Galindo et al. 2016). "Nassarius sp." and "Tongan" Nassarius are other species.
    - The sailfin tang is spelled *Zebrasoma velifer* (WoRMS, FishBase), though care sheets still say *veliferum*. The Red Sea and Indian Ocean *Z. desjardinii* is a separate species and is not modelled.
    - "Elegant starfish" names no single species: Wikipedia gives it to *Fromia nodosa*, and *F. elegans* is a synonym of *F. indica*. The game keeps the trade name "Elegant Starfish" for the red Fromia, *F. milleporella*.
    - The Catalog of Fishes limits *Pseudanthias squamipinnis* to the Red Sea and western Indian Ocean and calls Pacific fish *P. cheirospilos*. FishBase, WoRMS and the hobby keep one species, as the game does.
    - "Astraea tecta" is a trade name for *Lithopoma tectum*. The cerith is the Florida cerith *Cerithium atratum*, where ADR-0052 listed *Cerithium* sp.
    - Wave B: the flame angel is spelled *Centropyge loriculus* (WoRMS, the Catalog of Fishes), though the trade and ADR-0052 write *loricula*. The flame hawkfish's genus is *Neocirrhites*; *Neocirrhitus* (the trade, FishBase's page address, ADR-0052) is a misspelling.
    - "Sand-sifting starfish" covers two genera: the game uses the comb star *Astropecten polyacanthus*, but *Archaster typicus* is sold under the same name (Reef Builders' sand sifter is *Archaster*).
    - The emerald crab's old combination *Mithrax sculptus* is superseded by *Mithraculus sculptus*.
  - Roster names are kept for id stability, and confidence notes explain each case.
- **Tank-size disagreements** were resolved conservatively:
  - kole tang 70 → 90 gal
  - mantis shrimp 10 → 40 gal
  - mandarin 30 gal plus maturity and pod gates
  - yellow tang 100 gal plus a 6-ft footprint
  - chunk 16:
    - sailfin tang 125–180 → 180 gal
    - anthias 55–150 → 125 gal
    - fighting conch 15–90 → 30 gal plus an open sand bed
    - chocolate tang 125 rather than LiveAquaria's 180, with a 6-ft footprint
    - wave B:
      - flame angelfish 55–70 → 70 gal
      - six-line wrasse 30–60 (two figures on one LiveAquaria page) → 40 gal
      - lawnmower blenny 20–55 → 30 gal
      - flame hawkfish 20–40 → 30 gal
      - yellowtail damselfish 20–50 → 20 gal
      - emerald crab: LiveAquaria gives no minimum, Aquarium Source 20–30 gal per crab → 20 gal
      - sand-sifting starfish: no source gives a per-gallon rule → 100 gal, with a tank running at least 20 game-days
- **Reef-safety grey areas.** Peppermint shrimp (coral picking) and foxface (occasional nipping) are `mostly_safe`, not safe. The coral beauty is `caution`, and the clown goby `mostly_safe`, because it nips Acropora polyps. In chunk 16 the emperor angelfish is `caution` with `coralRisk 0.55` (Practical Fishkeeping says it is not reef-safe). The melanurus wrasse is `mostly_safe` because it eats small shrimp, feather dusters and tube worms.
  - Wave B: the flame angelfish is `caution` (`coralRisk 0.3`; it nips LPS, soft corals and clam mantles). The bubble-tip anemone is `caution` too, because it stings corals and can wander onto them.
  - `mostly_safe`:
    - the lawnmower blenny (LiveAquaria warns of SPS and clam nipping; others say reef-safe)
    - the flame hawkfish (its perching can keep polyps closed)
    - the emerald crab (an underfed crab may eat corals)
    - the tuxedo urchin (it carries off loose frags and loosens rockwork)
    - the sand-sifting starfish (it empties the sand bed of small animals)
  - The six-line wrasse is coral-safe but `shrimpSafe 'caution'`, and the hawkfish is `shrimpSafe 'unsafe'`.
- **Seahorse versus SPS corals.** Giwojna says SPS are fine, while other keepers avoid them. Only anemones, fire coral and strongly stinging LPS are flagged, through `tag:stinging_cnidarian` and `special.stingSensitive`.
- **Hawaiian collection status is in flux.** Collection has been halted since 2017, and in 2025 draft rules to reopen it were advanced. The text avoids claiming a final outcome.
- **Breeding numbers** are approximate where only congeners or hobby reports exist: firefish (from *N. decora*), royal gramma, watchman goby, clown goby and the mantis egg mass. Species without realistic home breeding use `not_in_game`: hermit crab, tangs, coral beauty, foxface, mantis, lionfish and grouper.
  - Chunk 16 adds 12 of wave A's 13 species to that list: the emperor angelfish, the sailfin and chocolate tangs, the lyretail anthias, the melanurus wrasse, the elegant starfish, the fighting conch, the scarlet hermit crab and all four snails.
  - Only the maroon clownfish breeds, as the ocellaris does.
  - Some have been reared outside home tanks, but not in them: the emperor (commercially, Bali Aquarich), the anthias (in trials, ORA and Marineland Antibes), the wrasse (in research, University of Florida and Rising Tide) and the conch (in aquaculture, Harbor Branch).
  - The anthias and the wrasse still change sex without breeding (`socialSexChange`).
  - Wave B adds seven more `not_in_game` species: the flame angelfish, six-line wrasse, lawnmower blenny, flame hawkfish, emerald crab, tuxedo urchin and sand-sifting starfish.
    - Some have been reared outside home tanks: the flame angel (the Oceanic Institute in 2002, then small Biota lots), the lawnmower blenny (Biota, since 2023), the tuxedo urchin (ORA, since 2019, and as a lab animal) and the emerald crab (larvae reared by Rhyne et al. 2006).
    - The six-line and the hawkfish have spawned in captivity but have never been raised.
  - The bubble-tip anemone splits in tanks, and in the game too (`fission`): a settled, well-fed one splits in two now and then, each half a clone of the other.
  - The yellowtail damselfish breeds (`egg_layer_generic`), but it is hard (difficulty 0.75): ORA's first success raised about 60 fish from three spawns.
  - The flame angelfish and flame hawkfish change sex without breeding too (`socialSexChange`). The six-line wrasse is protogynous but has no `socialSexChange`.
- **Morph genetics** are simplified wherever the real inheritance is unpublished: clownfish white expansion, seahorse colour, red mandarin, grey watchman and high-orange coral beauty. Chunk 16 adds:
  - the maroon's **Gold Stripe**, a geographic form from Sumatra, modelled as a recessive
  - the maroon's **Lightning**, modelled as a rare dominant because two Lightning × normal crosses gave about half Lightning
  - the maroon's **Goldflake / Gold Nugget**, modelled as one codominant allele (one copy Goldflake, two Gold Nugget), following Pedersen's untested hypothesis
  - the elegant starfish's **Red & Black** tips, modelled as a recessive
  - wave B:
    - the flame angel's **Marquesan** form (bars reduced), a locality look with unknown inheritance, modelled as a rare recessive
    - the tuxedo urchin's **Red** form, one species with the blue (Matar et al.) and an unpublished inheritance, modelled as a recessive
    - the bubble-tip anemone's **green, rose and rainbow** clone lines, which have no published genetics. They are modelled as one codominant locus, with one rose copy giving rainbow and two giving rose.

  The other six wave B species have no colour forms and carry only the intensity locus. Gold Dot and Morse Code are left out. Every allele and phenotype is a real, observed form, and none is `fictional`.
- **Sea-star survival.** The elegant starfish has a poor record. Fenner says most aquarium sea stars survive less than a month (*Fromia* are sturdier), Reeflex rates it unproven long term, and keepers report stars starving after a year or two. The game keeps it but makes it hard: 100 gal, a tank running at least 20 game-days (`requiresMatureDays`), biofilm to graze, `hardiness 0.35` and `difficulty 'advanced'`.
  - The sand-sifting starfish (wave B) is worse. LiveAquaria rates it easy but says it starves once the detritus runs low, and Reeflex reports no long-term successes. The game gives it the same hard settings as the elegant starfish, plus a sand bed and one per tank.
- **Wave B lifespans are weak.** Every fish lifespan comes from Tier 3 sites or an uncited retailer, and none was found for the tuxedo urchin, the sand-sifting starfish or the bubble-tip anemone (which sits at the 500-day ceiling).
- **Group attrition** (chromis) and **snail killing** (hermits) are probabilistic tendencies, not certainties.

## New shared vocabulary and flags (for the compat, welfare and AI lanes)

- `tags.ts` (appended):
  - `stinging_cnidarian` is a hazard tag. Anemone or coral species (or decor mapped by the compat engine) should carry it; the seahorse has an incompatible rule against it.
  - `aiptasia` marks pest anemones. The peppermint shrimp's predator tag and positive interaction use it.
- `SpeciesSpecialNeeds` (optional, `// lane:species-marine`):
  - `stingSensitive` (seahorse)
  - `speciesOnly` (mantis shrimp)
  - `glassStrikeRisk` (mantis shrimp; warn on thin glass tanks)
  - `socialSexChange` (chunk 16: lyretail anthias, melanurus wrasse, flame angelfish and flame hawkfish). It marks a protogynous species that the game doesn't breed. In a group of two or more adult females with no male, the dominant female still turns male, without a breeding module.
- Groups that exception rules use as `tag:<group>`:
  - `tang` (yellow, kole, sailfin and chocolate)
  - `anemonefish` (ocellaris and maroon), `damselfish`, `basslet`, `dartfish`, `goby`, `cardinalfish`, `dwarf_angelfish`, `rabbitfish`, `dragonet`
  - `marine_shrimp`, `hermit_crab` (blue-leg and scarlet), `snail` (trochus plus the four chunk 16 snails), `stomatopod`, `scorpionfish`, `grouper`, `syngnathid`
  - new in chunk 16: `angelfish` (emperor), `anthias` (lyretail), `wrasse` (melanurus and six-line), `sea_star` (elegant and sand-sifting starfish), `conch` (fighting conch)
  - new in wave B: `blenny` (lawnmower), `hawkfish` (flame), `crab` (emerald), `urchin` (tuxedo), `anemone` (the living bubble-tip). Wave B also adds the flame angel to `dwarf_angelfish` and the yellowtail to `damselfish`.
- New behaviour sets (`BehaviorSetId` in `src/types/species.ts`, chunk 16):
  - `wrasse`: forages over rock and sand by day and sleeps buried in the sand (melanurus)
  - `starfish`: a slow crawler on glass and rock (elegant starfish)
  - `conch`: a sand-bed grazer that hops on its operculum and half-buries (fighting conch)
  - `snail_sand`: a buried scavenger that surfaces for food (Nassarius)
  - wave B:
    - `blenny`: perches on rock and glass and hops between perches to graze (lawnmower)
    - `hawkfish`: sits on the rock tips and pounces on food (flame hawkfish)
    - `damsel`: hovers over its own patch of rock and chases intruders (yellowtail)
    - `crab`: hides in the rock by day and forages at night (emerald crab)
    - `urchin`: a slow spiny grazer on rock and glass that carries debris (tuxedo urchin)
    - `starfish_sand`: buried by day, roams the sand bed at night (sand-sifting starfish)
    - `anemone`: a living anemone that wanders until it settles in the light, closes at night and hosts clownfish (bubble-tip)
  - The other chunk 16 species reuse existing sets: `angelfish_dwarf` (emperor, flame angel), `tang`, `chromis` (anthias), `clownfish` (maroon), `hermit_crab`, `snail`, and `wrasse` for the six-line, whose `rock_sleep` special behaviour makes it sleep in the rock, not the sand.
- Chunk 16 adds no prey tags. It reuses `clam`, `shrimp_dwarf`, `snail_small`, `starfish` and `crustacean`. Wave B also uses `fish_benthic` (the blenny) and the hazard tag `stinging_cnidarian`, which the living anemone carries as a prey tag, so the seahorse's incompatible rule applies to it.
- Positive interactions:
  - cleaner shrimp ↔ `tag:fish_medium` and `tag:fish_large` (cleaning station)
  - peppermint ↔ `tag:aiptasia`
  - mandarin ↔ seahorse
  - clownfish, royal gramma → cleaner shrimp
  - seahorse → trochus
  - bubble-tip anemone → maroon clownfish (its natural host) and ocellaris (tank-raised fish often move in)

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
| emperor_angelfish | `angelfish_large` | `lined` | deep, compressed, gill-cover spine, rounded tail; body = royal blue, body2 = deep blue lower body; **accent = the narrow yellow stripes**; fin = yellow-orange tail and rear dorsal; fin2 = electric-blue anal-fin lines; the plan adds the black mask edged pale blue, the white mouth and the black shoulder band. **Juvenile:** navy with concentric white and electric-blue rings closing into a white ring at the rear, a white dorsal edge and a clear tail |
| sailfin_tang | `tang_sailfin` | `bars` | the yellow tang's fin type, as tall as it is long with the fins up; body/body2 = broad dark grey-brown bars; accent = narrow pale bars; fin = dark banded sail; fin2 = pale blue-green fin edges; the plan adds the dark eye bar, yellow-brown snout, blue patch round the tail spine and a yellow tail edged white. **Juvenile:** bright yellow with narrow dark bars and even taller sails |
| chocolate_tang | `tang_acanthurus` | `solid` | protruding snout, concave forehead, crescent tail; body = chocolate brown; body2 = brownish-red chest; accent = orange shoulder patch; fin = dark median fins; **fin2 = yellow tail border**; eye = orange ring; the plan adds the black gill band and the white chin band. **Juvenile:** a pygmy-angel mimic with a rounded tail, all yellow (most) or pale grey shading to black (about 3 in 10, picked per individual) |
| lyretail_anthias | `anthias_lyretail` | `solid` | spindle-shaped, big eye, deeply forked lyre tail; female body/body2 = golden orange, belly = pale gold, fin = orange, fin2 = yellow; **accent = the violet face streak** (eye to pectoral). **Male** (from the creature's sex; the young look like females): purplish pink, pink-orange face streak, red pectoral patch, blue anal fin, longer pelvic fins and tail lobes and a long third dorsal spine. A female that turns male is redrawn |
| melanurus_wrasse | `wrasse` | `lined` | slim, straight head profile, squared tail; female body/body2 = blue stripes; **accent = orange-yellow stripes**; fin = yellow tail; fin2 = blue; eye = red; the plan adds the yellow-green head and three dark eyespots (front dorsal, ringed mid-dorsal, tail base). **Male:** mauve with green-blue stripes, pink-orange head bands, blue bars, a yellow pectoral base and a black tail tip, with no dorsal spots. **Juvenile:** duller and finer-striped, with the same eyespots |
| maroon_clownfish | `clownfish` | `bands` | deeper than the ocellaris (bodyDepth 1.05), a cheek spine across the head bar; body/body2 = deep red; **accent = the three narrow bars** (white, or gold in Gold Stripe), without black edging; fin2 = dark maroon edges; Gold Nugget = solid gold with maroon fins edged orange; Lightning and Goldflake = `marble` broken bars. **Young:** bright red with white bars (a young Nugget is white; the gold comes in with age). **Adult females** darken to maroon or nearly black; males stay bright red |
| elegant_starfish | `starfish` | `solid` | five tapering arms on a small disc (the sea-star renderer); body/body2 = red to orange-red granular upper surface; belly = paler underside; **accent = the arm tips** (black in Red & Black); fin/fin2 repeat the body |
| fighting_conch | `conch` | `mottled` | knobbed short spire, big body whorl and flared lip; body/body2 = shell and pale mottling; accent = dark zigzag streaks; **belly = the glazed orange aperture and lip**; fin/fin2 = grey soft body; eye = amber ringed iris on long eyestalks; a sickle-shaped operculum |
| scarlet_hermit_crab | `hermit_crab` | `solid` | the blue-leg's crab and shell in its own colours (a renderer flag); **body = red legs and claws**; body2 = deep red antennae; accent = yellow eyestalks and face; eye = yellow-green corneas; fin/fin2 = the borrowed cerith-style shell |
| mexican_turbo_snail | `snail_turbo` | `bands` | heavy globose turban, short spire, coarse spiral cords, knobbed shoulder; body/body2 = olive-brown shell and mottling; accent = rows of dark and pale checks along the cords; fin/belly = grey foot (unsourced) |
| nassarius_snail | `snail_nassarius` | `bands` | small, plump, latticed shell; **a long siphon held up from the front** (all that shows while buried); body/body2 = tan shell and mottling; accent = the dark band; fin2 = glossy callus round the aperture; fin/belly = pale foot (unsourced) |
| astraea_snail | `snail_astraea` | `bars` | flat-sided cone with knobbed folds at each keel and a nearly flat base; body/body2 = olive cone and its patches; accent = algae film; fin/belly = grey-tan foot (unsourced) |
| cerith_snail | `snail_cerith` | `speckled` | tall, slender, many-whorled spire with beaded spiral cords; body/body2 = grey-brown spire and mottling; accent = the pale beads; fin/belly = grey foot (unsourced) |
| flame_angelfish | `angel_dwarf` | `bars` | the coral beauty's short, deep, compressed body; body = red-orange; body2 = the more orange mid-flank; belly = orange; **accent = the 4–5 thin black bars** on the upper flank; fin = orange tail; fin2 = the black edge of the rear dorsal and anal fins (the plan adds their electric-blue bars); Marquesan = faint bars. **Male:** more blue in the rear fins |
| sixline_wrasse | `wrasse` | `lined` | small, elongate, pointed snout, thick lips; body = violet-blue; body2 = the purple-blue gaps; belly = purple-orange lower body; **accent = the six orange lines** along the upper two thirds; fin = green tail and peduncle; fin2 = blue; eye = red with two white lines; the plan adds the orange cheek and the blue-ringed black eyespot on the upper tail base |
| lawnmower_blenny | `blenny` | `mottled` | elongate combtooth blenny with a blunt head, a wide low mouth, high bulging eyes with branched cirri, a long dorsal joined to the tail base and short pelvics it perches on; body = olive-tan; body2 = the darker bars; belly = pale; **accent = the white spots**; fin/fin2 = translucent olive fins with dark spots |
| flame_hawkfish | `hawkfish` | `solid` | deep, compressed "football" body, high-set eyes, tufted dorsal spine tips, thick lower pectoral rays for perching; body = brilliant red; body2 = red-orange; belly = lighter red; fin/fin2 = red; **accent = the black ring round the eye and the black band along the dorsal base** |
| yellowtail_damselfish | `damsel` | `solid` | small oval damsel with a forked tail; body/body2/belly = velvety electric blue all over (iridescence 0.4); accent = the blue sheen; fin = blue; **fin2 = the yellow tail, peduncle and rear tips of the dorsal and anal fins**; yellow never reaches the back or belly |
| emerald_crab | `crab` | `mottled` | the new crab renderer: a flat, finely sculpted carapace a little wider than long, spoon-shaped claws, hairy banded legs; body = olive-green carapace; body2 = mottling and leg bands; belly = underside; fin = claws; **fin2 = the white spoon tips**; accent = the pale spots |
| tuxedo_urchin | `urchin` | `bands` | the new urchin renderer: a round, slightly flattened test with short spines in ten tracts; **accent = the ten bare velvety bands** (blue, or red-brown in the Red form); body = the dark test between them; body2 = the spines; fin2 = spine tips; belly = the oral side; fin = the debris it carries |
| sand_sifting_starfish | `starfish` | `solid` | the sea-star renderer with its own spec: five broad, flat arms with blunt, slightly upturned tips, fringed with marginal spines; body/body2 = the dark purplish top and its grey patches; accent = the cream paxillae; **belly = the orange underside**; fin/fin2 = the spines' brown bases and pale tips |
| bubbletip_anemone | `anemone` | `solid` | the new anemone renderer: a column on an adhesive foot, a flat oral disc and a crown of tentacles that swell into a bulb short of the tip; **belly = the red-magenta column**; body = the disc and tentacle bases; body2 = the tentacle shafts; accent = the bubble; fin2 = the purple-magenta tips; Rose and Rainbow swap the colours |

Invertebrate species (`visualLane: 'special'`) use the colour slots as labelled above rather than as literal fins. The `bodyDepth`, `finLength` and `iridescence` values in each record are tuned hints and can be adjusted during render review.

**Chunk 16 young and sex looks** (ADR-0052 decision 3) are drawn by each fish's render plan in `src/render/creatures/fish/<id>.ts`, from the creature's life stage and sex, not by phenotypes:
- juvenile looks: the emperor angelfish, the sailfin tang and the chocolate tang
- a male look: the lyretail anthias and the flame angelfish (more blue in the rear fins)
- both a juvenile and a male look: the melanurus wrasse
- young and female looks: the maroon clownfish

The eleven chunk 16 invertebrates (the living anemone included) have none. Their renderers (`src/render/creatures/special/{snail,starfish,conch,hermit,crab,urchin,anemone}.ts`) draw every age and sex alike. The other four wave B fish (the six-line, the blenny, the hawkfish and the yellowtail) have no young or sex looks either: the research found no distinct juvenile colours, and their sexes differ little (in size, or a male brightening when courting).
