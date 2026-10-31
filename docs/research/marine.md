# Marine species research — lane species-marine

Research notes behind every marine `SpeciesDefinition` in Aquarium Go: the 2 marine starters (`src/data/species/ocellaris_clownfish.ts`, `src/data/species/lined_seahorse.ts`) and the 48 unlockable species in `src/data/species/marine/`. Researched September 2026; the 22 chunk 16 species researched October 2026; the 8 chunk 17 species (big marine fish and the bottom sharks, chapters at the end) late October 2026.

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

---

# Chunk 17: big marine fish (ADR-0053)

### About the chunk 17 big marine research
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

### Game data
The values the game uses are in `src/data/species/marine/blue_tang.ts`; this research proposed them, and the source check at the end of this chapter corrected some of them.

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

## Naso tang
Also called the orangespine unicornfish.
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

### Game data
The values the game uses are in `src/data/species/marine/naso_tang.ts`; this research proposed them, and the source check at the end of this chapter corrected some of them.

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

### Game data
The values the game uses are in `src/data/species/marine/queen_angelfish.ts`; this research proposed them, and the source check at the end of this chapter corrected some of them.

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

### Game data
The values the game uses are in `src/data/species/marine/clown_triggerfish.ts`; this research proposed them, and the source check at the end of this chapter corrected some of them.

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

## Panther grouper
Also called the humpback grouper, barramundi cod.
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

### Game data
The values the game uses are in `src/data/species/marine/panther_grouper.ts`; this research proposed them, and the source check at the end of this chapter corrected some of them.

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

## Cross-species notes (big marine fish)
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

## Sources (big marine fish)
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

## Source check, 2026-10-30 (big marine fish)
Before building, a second agent checked the facts the game uses against the sources (claims marked UNVERIFIED were softened or labelled in the data, never used as fact). Its notes, as written:

- - Blue tang: OK all (size 30, 180 gal 6ft, LC 2010, price 110 = LA 1–2"; yellow belly Indian Ocean/Red Sea at maturity; young blue). Eye-ring claim is REEF's not Florida Museum. ADW breeding figures suspect (Atlantic tang) -> low confidence incubation/larval numbers.
- - Naso: 240 gal rests on one Tier-3 (Gensou); Tier 1-2 say 180-200 (LA 180, Reef Builders/TFH 200). Mark 240 as judgement (design keeps 240 w/ 96x24) or 200. Lifespan 14 yr -> ~500 cap. Price 120 OK (LA $123.99 juv). Male streamers FAO. Juvenile grey, blue dorsal stripe, orange anal stripe (LA). Jumps OK.
- - Queen angel: 250 gal OK (LA, QM). Lifespan NatGeo up to 15 yr (page loads) -> ~500. Price 220 OK. LC 2009. Reef: LA "Not a good reef dweller" (quote fix). Juvenile dark blue, curved blue bars, yellow tail/pectoral area, golden face/throat; lost ~15.9 cm TL (UFSC). Lab spawn Dec 2024 (UFSC, WAS/LACQUA 2025), nothing reported on larvae.
- - Clown trigger: size 45 OK (FishBase 50), 300 gal OK (LA, QM), price 150 = LA 1/2-1" (179.99 at 1-2"). LC 2022. Eats urchins, crabs, crustaceans, molluscs (FishBase); blows water to flip urchins (QM). Juvenile black w/ big white spots, yellow snout+back patch (FoA). Biota Palau 2015 hatched & raised (Reef Builders 6 Apr 2015). Lifespan unverified.
- - Panther grouper: Chromileptes altivelis valid per CoF; WoRMS Cromileptes accepted as Chromileptes. Size 60 OK (FishBase 70). 300 gal OK; 120x36 own judgement. Lifespan 19 yr max (Williams) -> 500 OK. IUCN Data Deficient 2016. Price: LA under 2" $18.99, 2-3" $29.99, 3-4" $34.99 -> use ~30-35 not 80 (mixed basis). "Grows several inches a month" is ONE tier-3 blog; FishBase: growth very slow; Williams K=0.30 -> ~1.3 cm/month. DROP or say "fast growth reported by hobbyists"; do not state as fact. Escape: LA lid "to prevent escape".
- - Remove unsourced claims: cyanide after Finding Dory (blue tang), West Hawaii collection stopped 2017 (naso), Bermuda range (queen).
- - Water: keep repo marine convention but don't claim "LA 72–78 °F" in comments for ideal >25.6.

---

# Chunk 17: the bottom sharks (ADR-0053)

### About the chunk 17 shark research
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

### Game data
The values the game uses are in `src/data/species/marine/coral_catshark.ts`; this research proposed them, and the source check at the end of this chapter corrected some of them.
**Genetics.** No named forms in the hobby. The pattern is "highly variable" between individuals (Michael 1993 and Last et al. 2010, via Wikipedia), which is individual variation, not a trade form. Use the generic `intensityLocus` and `intensityOverlay` ("Richly coloured": crisper black and white spots). No hybrids or designer forms are left out, because none exist.

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

### Game data
The values the game uses are in `src/data/species/marine/epaulette_shark.ts`; this research proposed them, and the source check at the end of this chapter corrected some of them.
**Genetics.**
- Quality Marine describes **"golden"** (small dark spots, a distinct black ocellus) and **"tan"** (fewer, larger spots, a faded ocellus) colour types. Their inheritance is **undocumented**: it may be locality or age, and no source shows them breeding true. Do not make a locus for them.
- Use the generic `intensityLocus` and "Richly coloured" overlay: a brighter cream-gold ground and a crisper ocellus. If the owner wants the QM names, they need his approval as a natural-variation label (ADR-0052 decision 2).
- No hybrids or designer forms are left out; none found.

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

### Game data
The values the game uses are in `src/data/species/marine/brownbanded_bamboo_shark.ts`; this research proposed them, and the source check at the end of this chapter corrected some of them.
**Genetics.**
- No named forms. "Black-banded" in the trade is the banded juvenile, not a form.
- Use the generic `intensityLocus` and "Richly coloured" overlay: deeper, crisper juvenile bands and a warmer adult brown.
- Albino and other sports: none documented in the trade that I found, so none are modelled. No hybrids are left out (none found).

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

## Shared compatibility matrix (the bottom sharks)
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

## Cross-species notes (the bottom sharks)
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

## Sources (the bottom sharks)
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

## Source check, 2026-10-30 (the bottom sharks)
Before building, a second agent checked the facts the game uses against the sources (claims marked UNVERIFIED were softened or labelled in the data, never used as fact). Its notes, as written:

- CATSHARK A. marmoratus: 70 cm OK; tank 3 m (118 in) long per Hövel 2010 via Wikipedia (only sourced footprint); QM 180, Chewy 200/300, PetMD up to 500 for cat sharks. Temp ideal 24–27 OK (29 max unsourced). SG 1.020–1.025. Lifespan up to 20 y. Maturity ♂47–62 ♀49–57 cm. IUCN NT 14 May 2020. PRICE: the "$177 cat shark" is a bamboo shark listing -> A. marmoratus listings $601 (aquariumfish Marble Shark), £195–250, CA$500 -> baseValue ~350. Cases 1 per oviduct (two at a time). Laying interval ~14 d UNVERIFIED (assumption). Incubation 4–6 months (Hövel), 76 d at 25 °C (Choosri n=3) -> 120 d OK. Hatchling 10–13 cm (Hövel), 9.2 cm (Choosri). Capsule 50–79×18–23 mm two waists, tendrils ≤20 mm (Bor 2003); Hövel ~10 cm. "Laid loose on the floor": Wikipedia only (unfootnoted).
- EPAULETTE H. ocellatum: 90 cm (70–90 typical, max 107). Tank: LA 360, QM 300, PetMD 350/individual -> 500 gal footprint 108x36 derived (judgement). Temp ideal 24–28 OK; pejus ~31 °C. Lifespan 20–25 y (AoP). Maturity ♂54–60 ♀62–64 cm, ≥7 y. IUCN LC 2015. Price $895.99 LA; ORA captive-bred $500 -> 900 OK (captive-bred cheaper). Cases: median 2 (Wheeler 2025), interval avg 19 d (±5.7) at 25 °C (Wheeler 2025); FoA every 14 d. Incubation 125±5 d at 27 °C, 110 at 29, 101 at 31 (Wheeler 2021); 140 d at ~25 (Payne) -> about −6 d/°C OK (epaulette only). Hatchling 14–16 cm. LONE FEMALE: Wheeler 2025 says only that individually housed females laid on schedule; infertility UNVERIFIED (wild-caught may store sperm; one source says rarely viable without male). Walks in and out of water (FAU). ORA captive-bred since 2016. Cases tangled in coral/rock by fibrous material (AoP). Pup yolk ~1 week is QM's (not Wheeler).
- BAMBOO C. punctatum: 105 cm OK. Tank: LA 360, QM 300; 1,000 (124x42) derived. Temp ideal 23–27 OK. Lifespan ~25 y. Maturity ♂68–76 ♀63, ~6.5 y. IUCN NT 2023. Price 280 OK (LA $199.99 6 in, aquariumfish $280.79). Cases paired. Interval ~7 d DERIVED (Harahush 692 eggs, 6 females, two seasons) -> use 7–14 d. Incubation 118 d at 25 (Onimaru), 153 d at 21–25 (Harahush) -> 125 OK. Hatchling 13–17 cm. Sticky fibres claim is C. hasseltii -> UNVERIFIED for punctatum (eggs "released into the benthic environment", Florida Museum). Viability with male: 33% viable, 21% hatched (Harahush); Payne 48% hatched -> use ~35–45%. Parthenogenesis: white-spotted bamboo, Belle Isle (Detroit) J. Heredity Jan 2010 (daughters hatched ~2004). Sperm storage Steinhart Jan 2012 ≥45 months. Goitre 2 months after supplements removed (Wheaton citing ref 52; species not named). Morris 2011: nitrate ~310 mg/L for 29 d -> goitre in white-spotted bamboo; no basis for penalising normal nitrate.
- MISC: Kempster 2013 freeze mean 18.9 s, up to ~60 s. QM shark eggs article is family-level, not species. Footprints: only catshark 3 m sourced; label others judgement. Hypoxia: Florida Museum gives up to an hour and 3.5 h.
