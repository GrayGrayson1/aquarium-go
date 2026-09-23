# Aquarium Go — Game Design

## Fantasy

Start with one remarkable aquatic creature and learn its personality. Build a beautiful habitat around it and improve your husbandry. Expand into multiple aquariums, breed distinctive animals, and sell individuals, breeding lines or whole finished aquariums to bidding buyers. Open your doors to paying visitors, and grow a hobby room into a destination aquarium with 1,000-gallon centrepieces.

The emotional centre is **attachment to individual creatures** plus **the satisfaction of building living ecosystems**. The player should often want to stop managing and simply watch.

## Pillars

1. The tank is beautiful enough to watch.
2. Every creature feels individual.
3. Biology creates gameplay.
4. Compatibility is explained, never hidden.
5. Building and selling aquariums is the economic heart.
6. Progression unlocks new ecosystems, not just bigger numbers.

## Core loop

**Observe → Care → Design → Grow/Breed → Show → Trade → Expand**

The loop stays satisfying even if the player ignores breeding or visitors. Viable business paths:
- **Breeder:** morph lines, proven pairs, juvenile batches.
- **Aquascaper:** gorgeous tanks sold whole at auction.
- **Exhibitor:** visitors, admission, tips, donations.
- **Specialist:** marine reef or predator exhibits.

## Starters (five distinct opening chapters)

| Starter | Identity | Opening tank | Teaches | Signature moments |
|---|---|---|---|---|
| Axolotl | The Regenerator | 20 gal long, cool freshwater, chiller, fine sand | Cool water, gentle flow, substrate safety, morph genetics | Gill flicks, bottom walking, surface gulps; spermatophore courtship and egg strands |
| Betta | The Showstopper | 10 gal planted tropical | Warm planted tanks, territoriality, show lines | Fin flares, following your finger, bubble nests; controlled pairing and male nest guarding |
| Pea Puffer | The Tiny Hunter | 10 gal dense planted | Predator feeding, enrichment, sight lines | Helicopter hovering, independent eye scanning, snail hunts |
| Ocellaris Clownfish | The Reef Partner | 29 gal marine live rock | Salinity, live rock, reef-safe choices, hierarchy | Waddling swim, pair formation, protandrous sex change, male egg care |
| Lined Seahorse | The Gentle Oddball | 29 gal marine hitching forest | Slow feeding, gentle flow, peaceful tank mates | Tail hitching, courtship dance, male pregnancy and birth |

The player can later own all five. The starter choice is not a faction lock.

## Individuals

Each creature has two layers:
- **Heritable potentials** (0–100, shown first as Ordinary / Promising / Exceptional / Remarkable): size, colour expression, pattern quality, structure (fins, gills, body form), fertility, hardiness, temperament, curiosity.
- **Dynamic state:** health, hunger, stress, energy, social comfort, environmental comfort, breeding readiness, enrichment, age and life stage.

On top of that, every creature has 1–3 **personality tags** that change visible behaviour within species limits (bold, shy, explorer, food-obsessed, glass-curious, nest-builder, homebody, social, solitary, night owl, showoff, easily startled, patient feeder, competitive feeder, decor inspector). Genetics are simplified Mendelian loci of real domestic morphs. Market value is a game valuation, never a statement about a living thing's worth.

## Time

- 1 real second at 1× = 6 game minutes, so a game day lasts 4 real minutes. Speeds are pause, 1×, 3× and 10×.
- Water chemistry runs in game hours. Because a starter tank arrives pre-cycled, nobody waits weeks for a cycle; bottled bacteria and mature media are game abstractions of real practice.
- **Life stages and breeding are compressed further** for playability. Incubation and gestation in game hours are roughly real days × 8. Maturity takes about 8–25 game days, and lifespan about real years × 40 game days. This is a deliberate abstraction and is labelled as such.
- Offline progress is capped. A maintenance grace period means that returning after a week never shows a tank of dead animals.
- On return, the Welcome-back card says how long the player was away and how much the aquarium actually ran (capped at 12 game hours). It confirms that everyone made it, which is a game kindness: a grace period keeps animals on basic rations. It lists show results, bids waiting and staff notes, each with a link.

## Water and welfare

- Nitrification (ammonia → nitrite → nitrate) is simulated per tank. Uneaten food and waste add ammonia. Biological capacity depends on filters × maturity. Water changes, plants, refugia and skimmers export nitrate. Larger volumes are more stable.
- The UI puts **what is wrong and why** first (GOOD / WATCH / DANGER with advice). Exact values sit behind an "advanced" toggle.
- Welfare combines water comfort, habitat fit (hides, cover, hitching posts, substrate safety), social needs, compatibility incidents and handling (glass tapping stresses animals and is never rewarded).
- A tank's status word (Good / Watch / Danger) is the worst of three things: its water, its animals (starving, sick, badly stressed, injured) and its food. The reason is always shown, so the HUD can never say "Healthy" beside a starving pet. The food outlook counts only foods the tank's animals eat. It warns at under ~4 meals left and turns the tank to Watch when that food runs out. The feed picker offers a one-tap restock.
- Friends and visitors respond to welfare. With an animal in danger, friends leave worried and give no tip. With an animal on Watch, tips and reputation are halved.
- **Filter bacteria acclimate** to their tank's temperature over about two game days. At 16 °C a cool-water filter runs at roughly 80% of a tropical one; a sudden chill still slows it, and stocking accounts for it. Animals take no harm while the water report still reads GOOD: ammonia and nitrite harm begins at the WATCH line, and ammonia is weighted by how toxic it is at the tank's pH and temperature. For sensitive freshwater animals (axolotls, discus), nitrate is good below 20 ppm and danger at 35 ppm or more. Two adult axolotls in the starter 20-gallon long, fed earthworms twice a day with a 25% change every 2–3 days, stay GOOD; feeding 4–5 times a day shows up as ammonia WATCH within a day.
- **Feeding.** Every creature card has a Feed row that target-feeds that animal with a food it eats ("Buy & feed" when none is in stock), so phones never need a tap on a tiny animal. One tap drops one portion sized to the tank's appetite. The first tap past what the animals can eat shows an overfeeding tip, at most once per tank per game day. In a tank with larvae or fry, the feed picker names what the young eat and offers a one-tap pack when none is in stock. With an animal's card open, Target feed offers "Offer to <name>".
- **Mouthbrooding males fast** on their reserves while brooding: hunger is held at "hungry" (a game abstraction), so the tank card never tells the player to feed a father who can't eat.
- **Keepers never trigger the player's overfeeding tip.** A tong portion is judged against that animal's own appetite.
- **Cool water changes.** Tanks holding axolotls, corydoras or goldfish get a "Cool 25%" water change: about −1 °C, which stays below the sudden-change stress line. Two in a row give the ~2 °C "first cool rains" breeding cue.
- **Equipment sits where an aquarist would put it.** Filtration, heat and top-off go in the right rear service corner; flow and air go on the left. Sump systems keep heaters and top-off sensors in the sump. Big multi-sump exhibits drain through a low coast-to-coast weir.

## Compatibility

A data-driven evaluator gives a verdict (Excellent / Usually Compatible / Conditional / High Risk / Incompatible) with explicit reasons. It weighs water type, temperature/pH/salinity overlap, adult size vs tank size, group needs, same-species rules by sex, aggression, predator/prey tags plus a mouth-size heuristic, fry/egg predation, fin and gill nipping, feeding competition, flow/light, plant and reef safety, anemone relationships, substrate, hides, special needs and explicit exception rules. Mitigation (cover, hides, tank size, target feeding, nursery) lowers risk, but it never turns a nonsensical pairing into "Excellent". Incidents are probabilistic and logged with causes ("A cherry shrimp is missing — it was likely eaten by the goldfish").

Previews for a purchase or a move list the newcomer's own issues first and say how many issues were already in the tank. One salinity model (`src/sim/compat/salinity.ts`) decides fresh, brackish and marine fit for the purchase gate, the compatibility engine and welfare alike. Brackish and marine animals never share a tank, and the verdict says why.

## Economy

- **Shop:** captive-bred individuals, each pre-rolled with visible morphs and personalities.
- **Marketplace:** list a creature, group, pair, juvenile batch or a **whole aquarium**. NPC buyer archetypes (beginner, experienced keeper, breeder, collector, aquascaper, family, public aquarium, conservation-minded, bargain hunter) bid according to their preferences, with messages explaining why. You can accept, decline, counter, wait or withdraw. Waiting can pay off but is not guaranteed; the market fluctuates.
- **Timing is humane in real time.** Offers stay open 3–6 real minutes at 1×, and an offer is held while the player writes a counter. Listing lengths are labelled in real time ("about 8 min at 1×").
- **Misrepresentation** (selling sick or incompatible setups) costs reputation.
- **Operating costs** are equipment upkeep, rent and staff wages. Going broke is graceful: animals are never repossessed, and help is available.
- **Frags & cuttings.** Grown corals and plants can be propagated. The player can take a frag (corals), a cutting, a rhizome division, a trimmed portion or a split (plants). The parent loses a little growth and heals for 12–72 game hours.
  - Frags wait in storage, where they don't grow (a game abstraction).
  - Planted on an acrylic frag rack, on rock or in the substrate, a frag heals onto its ceramic plug and then grows into a colony.
  - Frags sell on the market as a single frag, a pack or a bundle of cuttings (reef collectors want coral; aquascapers and breeders want plants), or to the local store for 45% of fair value.
  - Coral frags fetch more than cuttings, and LPS/SPS more than soft corals. Healed, grown-out frags are worth more, and each recent frag sale softens prices.
  - Anemones and mangroves can't be cut.
  - It is a side income: about $19/game-day from a mature 6-colony reef and about $6 from a mature planted tank.

## Visitors

Once the shop opens to the public, visitors with interests, patience and budgets walk between exhibits. Their satisfaction depends on beauty, welfare, visible activity, species charisma, rare behaviour events, signage, cleanliness, crowding and **repeat-species fatigue**. Revenue comes from admission, tips and donations. A gorgeous, ethical 20-gallon display can outperform a messy giant tank.

## Staff

From the specialty shop the player can hire staff: 2 at the shop, rising to 10 in the grand hall. A candidate pool refreshes every few days. Each hire has a skill (★–★★★★★), one trait and a wage, and skill grows slowly with experience.
- **Aquarists** feed each tank as often as its animals need: four small meals (8 AM, 1 PM, 6 PM, 9 PM) for fast-metabolism fish such as discus, chromis, guppies and seahorses, three (with a 9 PM snack) for tetras, and twice a day otherwise. Food comes from the player's cupboard, each species gets a suitable food, and each meal is sized for every animal that will eat it, faster tank-mates included. Keepers feed anyone who would be very hungry before the next visit, trim portions only while ammonia or nitrite reads WATCH, and give tong portions to the animals that keep missing out, taking turns. They also handle routine water care: changes, top-offs, glass and gravel. They flag broken gear, sick animals and overcrowding, but leave repairs, treatment, breeding, moving and selling to the player. Their care never counts toward the keeper's bond with an animal or the player's own care counters and quests.
- **A stock manager** restocks food and salt within a daily budget the player sets.
- **Docents** give talks that lift visitor satisfaction, donations, tips and reputation. A ★★★ docent roughly pays for themselves at the aquarium store.
- Wages are paid at midnight with the other operating costs. If cash runs out, staff work 3 days' notice and then leave; they never create debt, and animals are never harmed by the player's cash problems.

## Shows & championships

The show circuit runs about one show a game day, across four tiers: Club, then Regional (120 reputation), National (aquarium store, 250 reputation) and International (showroom, 450 reputation).
- **Classes.** Livestock classes cover betta fin types, axolotl morphs, guppy & endler, goldfish, designer clownfish, seahorse, discus, shrimp grading, open freshwater/brackish and open marine. Aquascape classes (unlocked by Aquascape Awards) are nano, planted, reef and biotope.
- **Judging.** Animals are judged against 100-point class standards: heritable form, colour, pattern and size, plus condition, deportment and prime age. Deportment rewards a calm animal that trusts its keeper (bond). Morph classes also score rarity. Aquascapes are judged on composition, living health, welfare, clarity and stocking, and biotopes also on native region. Every entry gets a judge's card that adds up to its score.
- **Humane rules.** Only healthy, settled adults travel. Sick, injured, stressed, hungry, gravid, pregnant or brooding animals stay home, and so does any animal from a tank whose water is in danger. Corals never travel. Show day is abstracted as "benched at the hall, home by evening": the entrant stays in its tank and comes home with a little stress, which a strong bond softens.
- **Rewards.** Wins bring purses, reputation, mastery, and rosettes and cups for the trophy shelf (a glass vitrine in bigger venues). Titles: Champion (3 wins at Regional or higher) and Grand Champion (3 at National or higher). Titles lift an animal's market value moderately and its offspring's a little, and award winners add appeal to their exhibit.
- **Balance.** A well-kept starter can win at Club level. Regional needs a line bred for a few generations, and National about five generations. Purses per class: Club $40–150, Regional $250–800, National $1.5–5k, International $8–25k; fees are 10–20% of the purse.

## Progression

Reputation, mastery tracks (husbandry, breeding, aquascaping, marine, business, exhibition), research projects and quests unlock tank tiers up to 1,000 gallons, equipment tiers, livestock groups (freshwater basics → marine → reef → large marine → predators), facility levels (hobby room → specialty shop → aquarium store → showroom → destination → grand hall) and features (auctions, visitors, genetics lab, staff, shows, party mode).

**Brackish Estuaries** is researched after intermediate freshwater. It opens an estuary chapter:
- **Species:** figure-eight puffers (snail-crunching fin-nippers), bumblebee gobies (perching cave spawners; the male guards the eggs), sailfin mollies (Black, Dalmatian, Gold, Lyretail) and the banded archerfish, which spits a jet of water at a fly above the surface.
- **Decor:** mangrove roots, oyster shells, estuary pebbles and a mangrove seedling whose leaves break the surface.
- **Water:** a brackish water class, SG 1.004–1.012, mixed with marine salt at about a third of reef strength.

Mollies bridge hard fresh water and brackish water; puffers and archerfish need salt.

## First session (tutorial)

Name your starter → look around → feed → read one water parameter → add one habitat element → observe a signature behaviour → earn your first money → open the market → make a first small sale or reach a visitor goal → unlock a first upgrade → preview breeding and expansion. Each step is one or two sentences, playable rather than read.

## Music / Party mode

This is an optional cosmetic mode. Lights, caustics and bubbles react to a built-in groove, or to the microphone if you opt in (permission is requested only then). Animals move a little more playfully. It is clearly labelled as fun that bends realism: real fish do not dance.

## Balance curve (bot-verified)

A headless bot player (`src/dev/fixtures/playthrough.ts`, run by `tests/sim/playthrough-starters.test.ts`) plays each starter the way a careful player would. It follows the tutorial, feeds twice a day, fixes WATCH water, buys a mate, follows the breeding hints, moves eggs to a nursery, sells offspring, and upgrades as soon as it can afford to. The test fails if any target below slips. Times are real time at 1× (10 real minutes = 2.5 game days; 1 real hour = 15 game days) and cover seeds 1234 / 77 / 2024.

| Starter | First money | Tutorial done | Mate | First spawn | First offspring sold | Specialty shop (visitors) |
|---|---|---|---|---|---|---|
| Axolotl | < 1 min | 5 min | 1 min | 5–14 min | 55–64 min | 106–120 min |
| Betta | < 1 min | 5 min | 1 min | 7–21 min | 36–50 min | 65–80 min |
| Pea puffer | < 1 min | 5 min | 1 min | 5 min | 32–34 min | 55–79 min |
| Clownfish | < 1 min | 5 min | 1 min | 34–38 min | 80–84 min | 80–101 min |
| Seahorse | < 1 min | 5 min | 1 min | 9–17 min (pregnancy) | 76–84 min | 76–84 min |

**Robustness sweep (round 2).** The same bot was run on 123 seeds per starter (615 runs): no seed missed a shop, spawn, offspring, adult-death, debt or loan target. `tests/sim/playthrough-robust.test.ts` checks 6 extra seeds per starter. Specialty shop arrival (real minutes at 1×):

| Starter | min | p25 | median | p75 | max |
|---|---|---|---|---|---|
| Axolotl | 58 | 82 | 102 | 118 | 128 |
| Betta | 39 | 70 | 79 | 85 | 130 |
| Pea puffer | 46 | 56 | 68 | 79 | 105 |
| Clownfish | 67 | 80 | 80 | 84 | 106 |
| Seahorse | 46 | 76 | 85 | 96 | 103 |

Before the sweep, axolotl seed 77 sat on the edge of missing the shop. The main causes were a starter pair of axolotls that slowly out-produced their filter, and quest-board luck. They were fixed with nitrifier acclimation to cool water, a slightly larger sponge filter, stale-quest rotation and a shop reputation gate of 100.

In the first 45 game days no adult animal dies, and no starter goes into debt or needs the loan. Axolotls pay their way through their own offspring, with no community fish needed. The seahorse path costs more up front: a $470 marine nursery. Its offspring (about $50–100 each) still reach the shop at the same pace as the other starters.

Before tuning, with the same bot, the shop arrived at 86–166 min (axolotl d41, puffer d35, clownfish d38). Seahorse keepers lost every animal around day 30, because a single default feed for 7+ seahorses was capped at 6 servings.

**Facility arc.** This is the long-game run: betta, one careful exhibit per species, research for the big tanks.

| Level | Upgrade cost | Daily rent | Reached (real time at 1×) | Running costs ÷ takings |
|---|---|---|---|---|
| Specialty shop | $1,000 (was $1,500) | $30 (was $25) | ~1.1–1.3 h | ~10–25% |
| Aquarium store | $8,000 (was $6,000) | $150 (was $70) | ~2.6–3.1 h | ~10–20% |
| Public showroom | $40,000 (was $18,000) | $450 (was $160) | ~5.0–6.4 h | ~8–11% |
| Destination | $120,000 (was $45,000) | $1,200 (was $320) | ~7–8.6 h | ~12–17% |
| Grand hall + 1,000 gal | $300,000 (was $110,000) | $3,000 (was $600) | ~9.4–11.5 h | ~18–20% |

Before tuning, the late game ran away: the grand hall came about an hour after the destination, running costs were 2–5% of takings, and money grew by $28k per game day with nothing left to spend it on. Rent now takes a real share of takings but stays well below what a well-run venue earns. The hobby room has no rent, and each tank costs about $1–3 a day there. Up to the shop, friend tips (about $25–35 a day) and offspring sales carry the player.

Re-measured 2026-09-23 in round 2; the long-game test requires the grand hall between 7 and 16 real hours with no debt. The bot doesn't hire staff, enter shows or sell frags, so a player who uses them moves faster. First re-measured after the QA fix round: Tutorial steps now count only progress made after each step starts. Research no longer charges for unlocks already earned through play. Friends don't tip while an animal is in danger.

**Other tuning from the sweep (all small and data-driven):**
- **Default feeding portion.** It is sized to the tank's real demand. Big-pack staples can reach 60 servings, and live foods stay a supplement. When several species share a food, the portion is 110% of demand; for a single species it stays at 90%. The last share of each meal goes to the hungriest fish first, so a tank fed twice a day no longer quietly starves its shyest members.
- **pH tolerance.**
  - Inside every resident's tolerated range, pH is GOOD, with a note naming who would prefer softer or harder water. Mixed soft- and hard-water tanks settle between the two, and that's fine.
  - Up to 0.3 pH past a limit is WATCH: stress only, no health damage.
  - Beyond that it is DANGER, and damage climbs quickly.
  - If no pH suits every resident, the report says it is a compatibility problem.
  - The purchase preview reads the tank's actual pH, for example "too alkaline for cardinal tetras".
- **Flow.** One level off a species' preference is a note (GOOD). Two or more levels off is WATCH or a compat caution. Fish that need oxygen-rich current are flagged at one level too still.
- **Quest board.** A board quest that is less than half done after 4 game days rotates off, while milestones stay. Before this, the board draw swung pre-shop quest money from $240 to $750.
- **Names** are drawn from a generator seeded by the save and the creature's id, never from the sim's random stream, so cosmetic changes can't shift balance. Gendered names are used only when the sex is visible and fixed; fry, clownfish (which change sex) and hermaphrodites get neutral names.
- **Aquascaping credit.** Aquascaping achievements, the beauty quests and the aquascape-awards unlock count a tank only after the player has made 3 edits in it (placed, moved or removed pieces). The starter layouts already score 87–94.
- **Starting achievements.** Achievements the starting setup already satisfies, such as "Into the Blue" for marine starters, are recorded silently at game creation. They get no toast and no reputation.
- **Log pace.** Friend-visit tips toast for the first three visits, then about once every two game days (a worried friend, about once a day). Critic praise toasts at most once per game day per venue (bad reviews always toast). With 4 or more tanks, bursts of breeding news and brood warnings merge into one toast. Headline unlocks (shows, staff, visitors, brackish, listings) lead a merged unlock toast and open their panel. Water-harm dangers toast at most once a day, critics are logged once per exhibit per day, standing breeding tips back off exponentially, and repeat breeding milestones for hard species toast the first five times, then every fourth. The first real hour produces about 55–80 toasts (the tutorial and early unlocks); after that it settles to about 10–60 an hour.
- **Tutorial (polish pass 2).** A step's flags only count if they're raised after that step starts, so a betta flaring early or Build being opened early no longer skips "observe" or "The road ahead". "Meet" waits for the creature card. "Word gets around" leads with three friend visits. The upgrade step asks for 12 reputation, about one friend visit later. The seahorse's feed step points at Target feed.
- **Decor placement.** Plants and corals only clash when planted almost on the same spot. Hardscape still can't sink into hardscape. Plants that would break the surface are trimmed to fit. Every starter layout keeps open sand (at least 13% of the floor), and every piece the habitat step suggests fits at random open spots.
