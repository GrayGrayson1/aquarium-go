# Chunk 17 research: koi, motoro stingray, silver mono, spotted scat

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

**Proposed strains (`MorphStrain`):**

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

**baseVisual (the wild type, a Magoi-like Amur carp; drawn only if no colour rule matches):**
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

### Proposed game data (koi)
```ts
{
  id: 'koi', commonName: 'Koi', scientificName: 'Cyprinus rubrofuscus', category: 'fish',
  group: 'carp',            // new group; koi and goldfish are both carps but different genera
  genus: 'Cyprinus', environment: 'freshwater', waterClasses: ['freshwater_cool'],
  nativeRegion: 'Domestic. Bred in Niigata, Japan, from the 1820s from Amur carp (wild range: Amur to Red River drainages, East Asia)', // Wikipedia; FishBase
  isStarter: false,
  adultSizeCm: 70,                       // 60–90 cm typical; jumbo show fish 100 cm+ (PFK); FishBase carp max 129 cm TL
  recommendedMinTankGallons: 800,        // ~250 gal per adult (PetMD, CA Fish Vet) × a group of 3
  recommendedFootprint: { minLengthIn: 144, minWidthIn: 36 },   // ~5 body lengths; room to turn a 70 cm fish
  activeSwimmer: true,
  bioload: 20,              // comet 8 at 25 cm; koi make "a great deal of nitrogenous waste" (PetMD). Mass scales far faster than this, so tune against the water model
  tempC: { min: 4, max: 32, idealMin: 15, idealMax: 24 },   // carp 3–35 (FishBase); 15–25 best, immunity weak <10 (Wikipedia); 64–75 °F (PetMD)
  pH: { min: 6.5, max: 8.8, idealMin: 7.0, idealMax: 8.0 }, // carp 6.5–9.0 (FishBase); 7.0–8.6 (PetMD)
  salinitySG: null,
  gh: { min: 5, max: 20 },  // carp dH 10–15 (FishBase); widened like the goldfish entries
  kh: { min: 4, max: 12 },  // no species source; mirrors goldfish
  flowPreference: 'moderate', lightPreference: 'moderate',
  diet: 'omnivore',
  foods: ['pellet_large', 'pellet_sinking', 'pellet_small', 'vegetable', 'earthworm', 'bloodworm', 'daphnia', 'algae_wafer'], // + new floating koi sticks; peas, lettuce, fruit (Wikipedia); 31–33% protein pellets (Andrian)
  feedingStyle: 'scavenger', feedingSpeed: 0.85, feedingAggression: 0.75, // "fast and aggressive eaters" (pond guides)
  hungerHours: 20,          // like goldfish; real feeding rises with temperature (PetMD)
  activityZone: ['all'], temperament: 'peaceful', territoriality: 0.05, aggression: 0.1, finNipper: 0.1, hasLongFins: false,
  social: { kind: 'group', minGroup: 2, idealGroup: 3, note: 'Gregarious. PetMD advises five or more, but that needs a pond; three adults is the most an 800–1,000 gal tank holds.' },
  sameSpeciesRule: { maleMale: 'ok', femaleFemale: 'ok', mixed: 'courtship_ok', juvenile: 'ok', note: 'Peaceful. In spring, several males chase a ripe female hard, and she may jump or be bruised.' },
  predatorTags: ['fish_tiny', 'fish_small', 'fry', 'eggs', 'shrimp_dwarf', 'shrimp_fry', 'shrimp_large', 'snail', 'snail_small', 'worm', 'copepod', 'crustacean'], // eats benthic animals and snails (ADW, FishBase); anything that fits in its mouth
  preyTags: ['fish_large'],
  maxLikelyPreySizeCm: 6,   // scaled from the comet's 4 cm at 25 cm; toothless suction feeder with pharyngeal teeth
  shrimpSafe: 'unsafe', snailSafe: 'unsafe', frySafe: 'unsafe', plantSafe: 'unsafe', // uproots and eats plants (ADW; Wikipedia)
  reefSafe: 'unsafe', coralRisk: 0, anemoneRelationship: 'not_applicable',
  hidesNeeded: 0, coverPreference: 0.15,
  substrateRules: { preferred: ['bare', 'large_pebbles', 'sand'], avoid: ['fine_gravel', 'gravel'], note: 'Sifts the bottom constantly and digs "feeding galleries" (ADW). Gravel it can mouth is a choking risk; plants are uprooted or eaten.' },
  breeding: {
    system: 'egg_scatter_cover', difficulty: 0.6,
    maturityDays: 25,                         // >3 years (Kodama); carp 3–5 years (ADW)
    clutchSize: { min: 50000, max: 300000 },  // ~300,000 from a 45 cm carp (ADW); >1 million a season (FishBase). The builder may cap this
    incubationHours: 32,                      // ~4 days (FishBase); 3 days at 25 °C (Kodama, ADW)
    fryRearingHours: 140,                     // fry cling 2–3 days, then eat baby brine ~10 days (Kodama)
    cooldownDays: 30,                         // one spawning a year in the hobby (Kodama)
    conditions: { needsPartner: true, needsCover: true, coolingTrigger: true, minTempC: 18, needsConditioningFood: ['earthworm', 'pellet_large', 'daphnia'], minTankGallons: 500 }, // FishBase 15–20 °C; Kodama's spawning tank ~420 gal
    predationWithoutNursery: 0.95, nurseryRequired: true,   // adults eat the eggs (Kodama)
    maxRaisedPerClutch: 10,                   // <1% of a spawn are good colour (Wikipedia); staged culls of 50–95% (Andrian)
    notes: 'In late spring, warming water after a cold winter starts the spawning chase. Two or three males drive a female through spawning ropes or plants, and she scatters sticky eggs by the hundred thousand. The parents eat them, so the ropes go to a nursery. Eggs hatch in about 3–4 days. Breeders cull hard: few fry show their parents\' variety.',
  },
  sexSystem: 'gonochoristic', parentalCare: 'none',
  lifecycle: { juvenileDays: 25, adultDays: 30, lifespanDays: 500, sexVisibleAtDays: 22, hatchSizeCm: 0.5 }, // 25–50+ y (PetMD); sexing unreliable before ~5 months / 20–30 cm (Andrian)
  hardiness: 0.85, difficulty: 'intermediate',
  baseValue: 200,           // domestic juveniles $10–25 (That Pet Place, Pond Informer); large domestic $350–2,500. Strains should multiply this for Gosanke and Tancho
  rarity: 'common', visitorAppeal: 0.95,
  unlock: { requires: ['fw_coldwater', 'tank_800'], hint: 'Needs cool-water systems and an 800-gallon tank.' }, // suggestion only
  captiveBredAvailable: true,
  conservation: { status: 'Domestic (wild C. rubrofuscus: IUCN Least Concern, 2020)', note: 'Koi revert to wild colour within a few generations and damage habitats as carp do. Never release one. Koi herpesvirus has no cure; quarantine new fish for 4–6 weeks (PetMD).' },
  behaviorSet: 'goldfish',
  behaviorTraits: { cruiseSpeed: 0.5, burstSpeed: 5, turnRate: 1.5, hoverTendency: 0.25, schoolingTightness: 0.3, restOnBottom: 0.1, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.9, nocturnal: 0, pickRadiusMul: 1.6 },
  specialBehaviors: ['substrate_sift', 'beg_at_glass', 'follow_finger', 'hand_feed', 'graze_plants', 'surface_skim', 'spawning_chase', 'jump_escape'],
  special: { coolWater: true, heavyWaste: true, outgrowsSmallTanks: true, escapeArtist: true },
  exceptionRules: [
    { other: 'fancy_goldfish', verdictFloor: 'high_risk', reason: 'Koi are fast, greedy feeders. Slow fancy goldfish miss meals and can be swallowed while small.', incidentRisk: 0.08, mitigatedBy: ['target_feeding', 'tank_size'] },
    { other: 'comet_goldfish', verdictFloor: 'usually_compatible', reason: 'Koi and single-tailed goldfish share ponds (CA Fish Vet), but koi win at feeding and eat small comets.', incidentRisk: 0.02, mitigatedBy: ['tank_size'] },
    { other: 'axolotl', verdictFloor: 'high_risk', reason: 'A grazing, mouthing carp picks at external gills, as goldfish do, and its heavy waste fouls the cool, clean water axolotls need.', incidentRisk: 0.15 },
    { other: 'tag:fish_small', verdictFloor: 'high_risk', reason: 'Koi eat any fish that fits in the mouth.', incidentRisk: 0.2, mitigatedBy: ['cover'] },
    { other: 'tag:shrimp_dwarf', verdictFloor: 'incompatible', reason: 'Dwarf shrimp are eaten.', incidentRisk: 0.5 },
    { other: 'tag:snail', verdictFloor: 'high_risk', reason: 'Carp eat snails (ADW).', incidentRisk: 0.2 },
  ],
}
```

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

### Proposed game data (motoro)
```ts
{
  id: 'motoro_stingray', commonName: 'Motoro Stingray', scientificName: 'Potamotrygon motoro', category: 'fish',
  group: 'stingray', genus: 'Potamotrygon', environment: 'freshwater', waterClasses: ['freshwater_tropical'],
  nativeRegion: 'South America: Amazon, Orinoco and Paraná–Paraguay–Uruguay basins (Argentina, Bolivia, Brazil, Colombia, the Guianas, Paraguay, Peru, Uruguay)', // FishBase; USFWS
  isStarter: false,
  adultSizeCm: 50,                      // disc width (FishBase; SF); total length with tail ~90 cm
  recommendedMinTankGallons: 500,       // SF 96×36×30 in (~428 gal) for an adult or pair; AU 250–300 one, 450+ pair
  recommendedFootprint: { minLengthIn: 96, minWidthIn: 36 },  // SF; AU "min 36 in wide, 90 in+ long". Floor area matters most (Fishkeeper)
  activeSwimmer: false,
  bioload: 10,              // "high metabolism, big eater" (SF); heavy, meaty feeding 2–3× a day (Fishkeeper)
  tempC: { min: 22, max: 30, idealMin: 24, idealMax: 27 },    // 24–26 (FishBase, SF, Fishkeeper); 74–82 °F (AU)
  pH: { min: 5.5, max: 7.6, idealMin: 6.2, idealMax: 7.2 },   // 5–6 wild (FishBase); 6.0–7.5 (SF, AU); 6–7 (Fishkeeper)
  salinitySG: null,
  gh: { min: 1, max: 12 },                                     // SF; Fishkeeper ≤12 dH
  kh: { min: 1, max: 8 },                                      // AU "KH 1–12"; kept soft
  flowPreference: 'moderate', lightPreference: 'dim',         // SF: current from the outflow, ~4 turnovers/h; dim light
  diet: 'carnivore',
  foods: ['earthworm', 'pellet_large', 'mysis', 'bloodworm', 'brine_shrimp', 'pellet_sinking', 'snail_live'], // SF and Fishkeeper menus; snails in the wild diet (ADW)
  feedingStyle: 'bottom', feedingSpeed: 0.6, feedingAggression: 0.5,
  hungerHours: 12,          // feed at least 2× a day (SF), 2–3× (Fishkeeper)
  activityZone: ['bottom', 'substrate', 'glass'],
  temperament: 'predatory', territoriality: 0.1, aggression: 0.15, finNipper: 0, hasLongFins: false,  // not territorial (ADW); "top predators" (SF)
  social: { kind: 'solitary_or_pair', minGroup: 1, idealGroup: 2, note: 'Alone, as a pair, or one male with several females. Never two males (Fishkeeper; AU).' },
  sameSpeciesRule: { maleMale: 'fight', femaleFemale: 'ok', mixed: 'courtship_ok', juvenile: 'ok', note: 'Males bite the female\'s disc while courting; she needs to be bigger than him and may need a break (SF).' },
  predatorTags: ['fish_tiny', 'fish_small', 'fish_benthic', 'fry', 'shrimp_dwarf', 'shrimp_fry', 'shrimp_large', 'crustacean', 'snail', 'snail_small', 'worm', 'amphibian'], // ADW diet; "anything that fits in its mouth" (AquariumNexus)
  preyTags: ['fish_large', 'fish_benthic', 'fish_slow'],    // a bottom-resting disc that loricariids and puffers can damage
  maxLikelyPreySizeCm: 8,   // estimate: fish up to whitebait size; ADW lists loricariids and Astyanax
  shrimpSafe: 'unsafe', snailSafe: 'unsafe', frySafe: 'unsafe', plantSafe: 'caution', reefSafe: 'unsafe', coralRisk: 0, anemoneRelationship: 'not_applicable', // plants: buried in and uprooted; décor optional (SF)
  hidesNeeded: 0, coverPreference: 0.1,
  substrateRules: { preferred: ['fine_sand', 'sand', 'bare'], avoid: ['gravel', 'fine_gravel', 'large_pebbles', 'aragonite'], note: 'Soft river sand several inches deep so it can bury itself (SF, AU). Nothing sharp or rough; leave the floor open. Aragonite would push the pH up.' },
  breeding: {
    system: 'ray_viviparous',    // NEW (see above); closest existing: 'livebearer'
    difficulty: 0.8, maturityDays: 25,                      // ~3 y, 30–35 cm DW (EoL via USFWS)
    clutchSize: { min: 1, max: 8 },                         // captive (SF, Fishkeeper); wild 3–21 (FishBase, ADW)
    incubationHours: 720,                                   // ~90 days × 8 (SF 9–12 wk; Fishkeeper 2–3 mo; EoL ≤3 mo)
    fryRearingHours: 56,                                    // yolk sac up to ~1 week (SF); pups are independent at birth (ADW)
    cooldownDays: 15,                                       // plus a long rest after the 3rd litter (SF, Fishkeeper; ADW pattern)
    conditions: { needsPartner: true, minTempC: 24, needsConditioningFood: ['earthworm', 'pellet_large', 'mysis'], minTankGallons: 500 },
    predationWithoutNursery: 0.1, nurseryRequired: false, maxRaisedPerClutch: 8,
    notes: 'Live-bearing. Embryos feed on uterine milk. After 2–3 months in an aquarium (about 6 in the wild), the female gives birth to 1–8 pups about 10 cm across, independent from birth. The male bites her disc while courting, so pairs need watching, and the female should rest after two or three litters.',
  },
  sexSystem: 'gonochoristic', parentalCare: 'none',
  lifecycle: { juvenileDays: 25, adultDays: 30, lifespanDays: 500, sexVisibleAtDays: 1, hatchSizeCm: 9.7 }, // 15 y captive (ADW) × 40 → cap; claspers visible from birth (SF); newborn ~97 mm (ADW)
  hardiness: 0.45, difficulty: 'expert',
  baseValue: 400,           // $299.99–499.99 juveniles (AU); $399.99 (Tropical Treasures)
  rarity: 'rare', visitorAppeal: 0.97,
  unlock: { requires: ['predators', 'tank_500'], hint: 'Needs Predator Husbandry and a 500-gallon tank with a wide, sandy floor.' }, // suggestion
  captiveBredAvailable: true,     // regularly bred, incl. large-scale in Asia (SF; USFWS/CITES 2009)
  wildCaughtNote: 'Brazil allows no ray exports (SF); trade fish are captive-bred in Asia or come from Peru and Colombia under CITES App. III permits.',
  conservation: { status: 'Least Concern (IUCN, 2024); CITES Appendix III (Brazil, Colombia, since 2017)', note: 'Banned or permit-only in several US states (AZ, CA, GA, MS, NV, OK, TX; FL conditional; retailers also refuse AR, HI, UT). Released rays have established in Singapore and southern Brazil, where they sting bathers.' },
  behaviorSet: 'stingray',        // NEW
  behaviorTraits: { cruiseSpeed: 0.35, burstSpeed: 3, turnRate: 1.2, hoverTendency: 0.1, schoolingTightness: 0, restOnBottom: 0.8, hitching: 0, burrowing: 0.6, glassSurfing: 0.15, curiosity: 0.7, nocturnal: 0.6, pickRadiusMul: 1.5 },
  specialBehaviors: ['sand_bury', 'disc_glide', 'glass_climb_beg', 'pin_food', 'sting_shed', 'night_forage'],
  special: { venomous: true, escapeArtist: true, burrower: true, heavyWaste: true, needsSinkingFood: true, outgrowsSmallTanks: true },
  exceptionRules: [
    { other: 'tag:pleco', verdictFloor: 'high_risk', reason: 'Suckermouth catfish latch onto a ray\'s disc and rasp it raw (SF; Fishkeeper; AU).', incidentRisk: 0.15 }, // needs a 'pleco' group or tag; bristlenose group is 'pleco'
    { other: 'discus', verdictFloor: 'conditional', reason: 'Some keepers lose discus to rays at night, and discus want warmer water (28–30 °C).', incidentRisk: 0.05, mitigatedBy: ['tank_size'] },
    { other: 'fahaka_puffer', verdictFloor: 'incompatible', reason: 'A fahaka bites chunks out of tankmates, and a ray resting on the floor cannot escape.', incidentRisk: 0.4 },
    { other: 'tag:fish_small', verdictFloor: 'incompatible', reason: 'Rays hunt small fish on and near the bottom, mostly at night.', incidentRisk: 0.3 },
    { other: 'tag:fish_benthic', verdictFloor: 'high_risk', reason: 'Bottom fish are its natural prey (ADW: loricariids, Pimelodella).', incidentRisk: 0.2, mitigatedBy: ['hides'] },
  ],
}
```

**Genetics:** `intensityLocus('Highly variable patterning; trade names (orange, blue, marbled) have no documented inheritance.')` plus `intensityOverlay({ accentColor: '#f08a1c', patternContrast: 1 })`.

**baseVisual:**
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

### Proposed game data (mono)
```ts
{
  id: 'silver_mono', commonName: 'Silver Mono', scientificName: 'Monodactylus argenteus', category: 'fish',
  group: 'moony', genus: 'Monodactylus', environment: 'brackish', waterClasses: ['brackish', 'marine_fowlr', 'marine_live_rock'],
  nativeRegion: 'Indo-West Pacific: Red Sea and East Africa to Samoa, north to the Ryukyus, south to New Caledonia and Australia; mangrove estuaries, harbours and lower rivers', // FishBase; FoA
  isStarter: false,
  adultSizeCm: 25,                     // 27 SL max (FishBase); 25 SL (FoA); 10 in in aquaria (LiveAquaria, AU); about as tall as long with the fins
  recommendedMinTankGallons: 180,      // AU 150+ as they grow; LiveAquaria 130; Gensou 400 L for 5. Conservative, for a school of 6
  recommendedFootprint: { minLengthIn: 72, minWidthIn: 24 },  // Gensou ≥150 × 60 cm; a fast, wide-ranging school
  activeSwimmer: true, bioload: 3,
  tempC: { min: 22, max: 30, idealMin: 24, idealMax: 28 },  // 24–28 (FishBase); 76–84 °F (AU); 72–78 °F (LiveAquaria)
  pH: { min: 7.0, max: 8.5, idealMin: 7.6, idealMax: 8.3 }, // 7.0–8.0 brackish (AU); 8.1–8.4 marine (LiveAquaria)
  salinitySG: { min: 1.003, max: 1.026, idealMin: 1.010, idealMax: 1.022 }, // see "Encoding the age shift"
  gh: { min: 10, max: 25 }, kh: { min: 8, max: 14 },          // KH 8–12 (AU, LiveAquaria)
  flowPreference: 'moderate', lightPreference: 'bright',     // water movement and oxygen matter (AU)
  diet: 'omnivore',
  foods: ['flake', 'pellet_small', 'brine_shrimp', 'mysis', 'bloodworm', 'nori', 'vegetable'], // LiveAquaria; AU; ProAquatix; ≥30% veg (Gensou)
  feedingStyle: 'midwater', feedingSpeed: 0.85, feedingAggression: 0.6, hungerHours: 20, // juveniles twice a day, adults once (Gensou)
  activityZone: ['middle', 'upper'], temperament: 'semi_aggressive', territoriality: 0.3, aggression: 0.25, finNipper: 0.1, hasLongFins: false,
  social: { kind: 'school', minGroup: 5, idealGroup: 7, note: 'A school of five or more, all added together. Lone or paired monos are nervous and get fin damage (Gensou; AU).' },
  sameSpeciesRule: { maleMale: 'tension', femaleFemale: 'tension', mixed: 'ok', juvenile: 'ok', note: 'The school forms a pecking order; adults jostle, and bigger numbers spread it out.' },
  predatorTags: ['fry', 'eggs', 'shrimp_fry', 'copepod', 'worm', 'fish_tiny'],
  preyTags: ['fish_medium'],          // juveniles; adults reach fish_large size
  maxLikelyPreySizeCm: 2.5,           // planktivore and detritivore (FishBase); small mouth. Estimate
  shrimpSafe: 'caution', snailSafe: 'safe', frySafe: 'unsafe', plantSafe: 'caution', reefSafe: 'mostly_safe', coralRisk: 0.1, anemoneRelationship: 'neutral',
  hidesNeeded: 1, coverPreference: 0.3,
  substrateRules: { preferred: ['aragonite', 'sand', 'fine_sand'], avoid: [], note: 'Open swimming space with some roots or rocks to swim around (AU). Aragonite sand helps keep the pH up (LiveAquaria).' },
  breeding: {
    system: 'not_in_game', difficulty: 1, maturityDays: 18,   // Lm 13 cm (FishBase); age not documented
    clutchSize: { min: 3000, max: 10000 },                     // 4,040 eggs in the one hatchery report (CIBA 2019)
    incubationHours: 6,                                        // 18–20 h at ~28–29 °C (CIBA)
    fryRearingHours: 240,                                      // metamorphosis day 23–32 (CIBA)
    cooldownDays: 30, conditions: { needsPartner: true, minTankGallons: 1000 },
    predationWithoutNursery: 1, nurseryRequired: true, maxRaisedPerClutch: 1,
    notes: 'Not bred in home aquariums. A government hatchery in India (ICAR-CIBA) first bred it in 2019 with a hormone injection, in full-strength sea water, rearing the larvae on rotifers and copepods. All trade fish are wild-caught or hatchery juveniles.',
  },
  sexSystem: 'gonochoristic', parentalCare: 'none',
  lifecycle: { juvenileDays: 18, adultDays: 20, lifespanDays: 400, sexVisibleAtDays: 400, hatchSizeCm: 0.16 }, // 8–12 y (Gensou); sexes alike (LiveAquaria); larva 1.63 mm (CIBA)
  hardiness: 0.8, difficulty: 'intermediate',
  baseValue: 30,            // $29.99 (AU), $65.99 (LiveAquaria)
  rarity: 'uncommon', visitorAppeal: 0.82,
  unlock: { requires: ['brackish'], hint: 'Unlocks with Brackish Estuaries; it needs a school of five in a long tank.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'Almost all monos sold are wild-collected juveniles.',
  conservation: { status: 'Least Concern (IUCN, 2016)', note: 'Common in estuaries across the Indo-Pacific; mangrove loss is the main threat to estuary fish.' },
  behaviorSet: 'chromis',   // open-water school; a deep-bodied 'mono' variant is optional
  behaviorTraits: { cruiseSpeed: 1.0, burstSpeed: 7, turnRate: 3, hoverTendency: 0.35, schoolingTightness: 0.7, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.1, curiosity: 0.5, nocturnal: 0 },
  specialBehaviors: ['tight_school', 'flash_turn', 'startle_jump', 'surface_feed'],
  special: { escapeArtist: true, outgrowsSmallTanks: true },
  exceptionRules: [
    { other: 'figure_eight_puffer', verdictFloor: 'conditional', reason: 'The puffer nips fins and wants lower salinity (SG ≤ 1.012) than grown monos.', incidentRisk: 0.05 },
    { other: 'bumblebee_goby', verdictFloor: 'high_risk', reason: 'A tiny goby is easily outcompeted, may be eaten, and wants near-fresh water.', incidentRisk: 0.1, mitigatedBy: ['hides'] },
    { other: 'tag:fish_tiny', verdictFloor: 'high_risk', reason: 'A school of adult monos eats fish small enough to swallow.', incidentRisk: 0.15 },
  ],
}
```

**Genetics:** `intensityLocus('No trade morphs; juveniles yellow-finned with two black head bars, adults silver.')` plus `intensityOverlay({ finColor: '#f0cc4a', patternContrast: 1 })`.

**baseVisual:**
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

### Proposed game data (scat)
```ts
{
  id: 'spotted_scat', commonName: 'Spotted Scat', scientificName: 'Scatophagus argus', category: 'fish',
  group: 'scat', genus: 'Scatophagus', environment: 'brackish', waterClasses: ['brackish', 'marine_fowlr'],
  nativeRegion: 'Indo-Pacific from Kuwait to Fiji, north to southern Japan, south to New Caledonia and Australia; harbours, mangrove estuaries and lower rivers', // FishBase; FoA
  isStarter: false,
  adultSizeCm: 30,                     // aquaria usually 15–20 (Glaser), up to 38 (TFH, Wikipedia); FoA 33 SL; FishBase 45 TL max
  recommendedMinTankGallons: 240,      // TFH 6–8 ft for a school; AU 125+ "more ideal"; conservative for 4–6 adults
  recommendedFootprint: { minLengthIn: 96, minWidthIn: 24 },
  activeSwimmer: true, bioload: 5,     // "a lot of waste... heavy bioload" (PFK)
  tempC: { min: 20, max: 30, idealMin: 23, idealMax: 28 },   // 20–28 (FishBase); 72–78 °F (AU)
  pH: { min: 7.2, max: 8.6, idealMin: 7.6, idealMax: 8.4 },  // never below 7.5 for long (Glaser); 7.2–8.5 (AU); 8–8.4 (Reeflings)
  salinitySG: { min: 1.003, max: 1.026, idealMin: 1.010, idealMax: 1.022 }, // AU 1.010–1.025; PFK 10–15 ppt; TFH adults marine
  gh: { min: 10, max: 25 }, kh: { min: 8, max: 14 },           // KH 8–12 (AU)
  flowPreference: 'moderate', lightPreference: 'bright',
  diet: 'omnivore',
  foods: ['vegetable', 'nori', 'algae_wafer', 'flake', 'pellet_small', 'pellet_sinking', 'brine_shrimp', 'bloodworm', 'mysis'], // AU; TFH "substantial plant matter"; FoA algae and detritus
  feedingStyle: 'grazer', feedingSpeed: 0.9, feedingAggression: 0.75, hungerHours: 18, // greedy and fast (PFK)
  activityZone: ['middle', 'lower', 'decor'], temperament: 'peaceful', territoriality: 0.15, aggression: 0.2, finNipper: 0.1, hasLongFins: false,
  social: { kind: 'group', minGroup: 4, idealGroup: 6, note: 'Keep a group, all added at the same time; they sort out a pecking order (PFK; AU).' },
  sameSpeciesRule: { maleMale: 'tension', femaleFemale: 'tension', mixed: 'ok', juvenile: 'ok', note: 'Chases and jostling through the roots; a group spreads it out.' },
  predatorTags: ['fry', 'eggs', 'shrimp_fry', 'shrimp_dwarf', 'copepod', 'worm', 'fish_tiny', 'snail_small', 'coral_polyp', 'sessile_invert'], // worms, crustaceans, plants (FishBase); juveniles eat fish in droughts (Daya Bay study)
  preyTags: ['fish_medium'],
  maxLikelyPreySizeCm: 3,
  shrimpSafe: 'unsafe', snailSafe: 'caution', frySafe: 'unsafe', plantSafe: 'unsafe', reefSafe: 'unsafe', coralRisk: 0.5, anemoneRelationship: 'neutral', // "will consume any aquatic plants"; reef caution (Reeflings)
  hidesNeeded: 1, coverPreference: 0.4,
  substrateRules: { preferred: ['sand', 'aragonite', 'fine_sand'], avoid: [], note: 'A mangrove-style tank: roots and branches to chase through (TFH), open water, and hard-wearing décor. Live plants will be eaten.' },
  breeding: {
    system: 'not_in_game', difficulty: 1, maturityDays: 14,   // females at 7–9 months (Wikipedia)
    clutchSize: { min: 20000, max: 200000 },                    // no Tier 1/2 figure found; placeholder for a small-egg multiple spawner. Flag it
    incubationHours: 7,                                         // ~20 h (Wikipedia)
    fryRearingHours: 240, cooldownDays: 30,
    conditions: { needsPartner: true, minTankGallons: 1000 },
    predationWithoutNursery: 1, nurseryRequired: true, maxRaisedPerClutch: 1,
    notes: 'Not bred in aquariums (TFH). Scats spawn in salt water at the start of the monsoon. Their larvae have bony head plates (the "tholichthys" stage) and drift in the plankton before settling in estuaries. Trade fish are wild-caught juveniles.',
  },
  sexSystem: 'gonochoristic', parentalCare: 'none',
  lifecycle: { juvenileDays: 14, adultDays: 20, lifespanDays: 500, sexVisibleAtDays: 500, hatchSizeCm: 0.18 }, // 10–20 y (Tier 3); larva 1.8 mm (Wikipedia)
  hardiness: 0.85, difficulty: 'intermediate',
  baseValue: 30,            // $19.99–59.99 (AU, ruby); green scats similar
  rarity: 'uncommon', visitorAppeal: 0.82,
  unlock: { requires: ['brackish'], hint: 'Unlocks with Brackish Estuaries; it needs an 8-foot tank as the group grows.' },
  captiveBredAvailable: false,
  wildCaughtNote: 'Sold as wild-caught juveniles; even farms raise wild-caught fingerlings.',
  conservation: { status: 'Least Concern (IUCN, 2009)', note: 'Widespread and fished for food; it depends on mangrove estuaries.' },
  behaviorSet: 'rabbitfish',  // cruise + inspect décor + hover, a grazing roamer
  behaviorTraits: { cruiseSpeed: 0.7, burstSpeed: 5, turnRate: 2.4, hoverTendency: 0.45, schoolingTightness: 0.4, restOnBottom: 0, hitching: 0, burrowing: 0, glassSurfing: 0.05, curiosity: 0.85, nocturnal: 0 },
  specialBehaviors: ['graze_surfaces', 'beg_at_glass', 'chase_play', 'steal_archer_prey', 'leaf_float_juvenile'],
  special: { venomous: true, heavyWaste: true, outgrowsSmallTanks: true },
  exceptionRules: [
    { other: 'banded_archerfish', verdictFloor: 'usually_compatible', reason: 'Natural companions: scats even follow archers to snatch the insects they shoot down (TFH).' },
    { other: 'figure_eight_puffer', verdictFloor: 'conditional', reason: 'The puffer nips fins and wants lower salinity than grown scats.', incidentRisk: 0.05 },
    { other: 'bumblebee_goby', verdictFloor: 'high_risk', reason: 'A greedy, fast scat starves a tiny goby out and may eat it.', incidentRisk: 0.1 },
    { other: 'tag:coral_polyp', verdictFloor: 'high_risk', reason: 'Scats graze anything soft, including coral and plants.', incidentRisk: 0.2 },
  ],
}
```

**Genetics:**
- `intensityLocus('Green to yellowish adults; red "ruby" juveniles are a colour phase, not a known heritable line.')` plus `intensityOverlay({ bodyColor: '#8ea06a', patternContrast: 1 })`.
- An optional `ruby` locus: alleles `n` (0.75) and `rb` (0.25), mode 'additive', note "inheritance unknown; scats are not bred, so this only sets how often shops stock ruby-phase juveniles". Its overlay `ruby` sets bodyColor2 `#b5482e` and accent `#5a1e14`, and should be drawn **only while the fish is a juvenile**. That needs renderer age support; if there is none, drop the locus and keep ruby as a juvenile tint chance in the art.

**baseVisual (adult):**
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

## Cross-species notes

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

## Sources
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
