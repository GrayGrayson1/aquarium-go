# Known Limitations

What is simplified, approximated or missing in this build. None of these block play.

## Biology & simulation
- **Time is compressed.** A game day lasts 4 real minutes, and life stages and breeding timers are compressed further (incubation in game-hours ≈ real days × 8). This is labelled as a playability abstraction, not a biological claim.
- **Genetics are simplified.** Real domestic morphs are modelled as a few Mendelian, codominant or additive loci. Betta colour genetics collapse several real loci into one dominance ladder. Clownfish Snowflake/Platinum merge two real mutations (Klann et al. 2021). Seahorse colour is treated as a heritable tendency, though in reality it depends heavily on environment. Undocumented morph inheritance is modelled as recessive and marked in the data notes.
- **Some species cannot breed in-game** (`not_in_game`): hermit crab, both tangs, coral beauty, foxface, mantis shrimp, dwarf lionfish, miniatus grouper. Home-aquarium breeding of these is not realistically achievable. Amano shrimp and nerite snails need a brackish larval nursery, which is explained but not simulated.
- **Brackish water** is modelled as SG 1.003–1.018. Mollies and archerfish are capped at 1.018 in the game, although both tolerate full sea water. The figure-eight puffer's salinity needs are disputed, and the game follows the brackish consensus.
- **Species not bred in-game:** figure-eight puffers and archerfish are also `not_in_game` for breeding.
- **Several life-history values are estimates** (kuhli breeding, hillstream incubation, dwarf-frog clutch size, some lifespans, several marine egg/larval timings). They are marked in each species' `confidenceNotes` and in `docs/research/*.md`.
- **Scavengers don't consume detritus directly.** Detritus is removed by filtration and cleaning.
- **Heater/chiller running costs** use an estimated duty cycle, not metered energy.
- **During offline catch-up** (capped, grace period), nothing dies. Fights can still cost health down to the grace floor, while predation becomes only a scare.
- **Nitrifier acclimation** is a game abstraction: one temperature per bacterial colony.
- **Names never change after birth,** so fry named before they can be sexed keep a neutral name. Board quests that stall rotate off silently.
- **Mixed soft- and hard-water tanks** settle between their residents' ideal pH. The report reads GOOD with a note while everyone is inside their tolerated range.
- **Background tanks** (beyond the 12 nearest) step in pieces of at most 30 minutes while a meal is fresh, then in coarser chunks.
- A three.js deprecation warning (`THREE.Clock`) comes from inside react-three-fiber and can't be fixed without changing dependencies.
- **Sold animals stay in the save** (status `sold`) so lineage lookups keep working. Very long games accumulate these records.

## Economy
- Equipment-bundle listings (marked "later" in the spec) are not implemented. Livestock (single, group, pair, juveniles), frag/cutting and whole-tank listings are.
- Frags in storage don't grow. Coral colour-morph lines are not named: a frag is a clone of its parent's look, and its "line" records provenance only. Frag plugs are not drawn on far (merged) tanks.
- Only the five most recent closed listings keep their photos, which keeps save files small.
- The admission-price projection in the Visitors panel is an estimate; the simulation decides actual attendance.

## Rendering
- The water surface uses sheen, glints and a total-internal-reflection band instead of true screen-space refraction. The mirror band does not reflect individual fish.
- Shadow maps use each creature's rest pose for shader-only deformations (fin flutter, gill sway, plant sway).
- Transparency sorting between fins inside a single fish is approximate.
- On far (LOD 2) tanks, desk and rack stands collapse into simple blocks.
- Visitors are deliberately stylised figures, not photoreal people.
- Loading a world still runs one ~0.3–0.5 s main-thread task (procedural geometry for every rock, plant and animal). Shaders compile in parallel behind a short veil.
- Small animals in the hero tank draw lower-resolution meshes (same shape and materials) while they are only a few dozen pixels long. Decor keeps full detail at High/Ultra and simplifies small pieces at Low/Medium.
- The app chunk is ~2.5 MB (≈0.8 MB gzipped) plus ~1.5 MB of cacheable vendor chunks, because every creature, plant and texture is procedural code. Dev tools, photo mode and the management panels load separately.
- The shop dressing (shelves, starter-tank rack, supply cabinet, plants) is cosmetic. On rare occasions a visitor brushes through a corner piece next to a newly placed tank. The shop counter sits outside the default day-one framing; zoom out to see it.
- The frag rack is see-through only at the closest LOD; from far away it reads as pale grey plastic.
- The close camera's line-of-sight check models the substrate and hardscape domes, but not plants or equipment.
- Room-view GPU cost is dominated by the room point lights on the big lit floors and walls (about 45% of scene GPU in the grand hall). Reducing it would need an art change (a lightmap or fewer lights).
- Creature visuals still rebuild on a LOD change (about 100 ms of work spread over a room return). Publishing (`share`) still walks the whole state tree every tick (about 0.7–1.4 ms on the big facility). A `?fixture=` boot waits for one extra chunk.
- Very long tanks (500–1,000 gal) are small on portrait phones because they are framed to fit the width; pinch or orbit to get closer. The plaque's species line is legible only at tank-view distance.

## Care shortcuts
- "Buy & feed" on a creature card buys the cheapest suitable food, not the species' favourite.
- Welcome-back staff notes are matched to the log by the staff member's first name.

## Staff
- Staff walking is cosmetic and not synced to the exact game hour of each visit. Where tanks stand flush in a row, keepers feed from a front corner or the gap between tanks.
- Keepers don't feed fry or larvae; raising young stays hands-on.
- The sim burns hunger at the same rate day and night (real diurnal fish rest at night), which is why keepers give fast-metabolism fish a 9 PM snack.
- Staff never move animals, so a tank whose population booms (e.g. a shrimp colony) is flagged but stays overcrowded until the player acts.
- There is no sales-associate role.

## Shows
- Show travel is abstracted: entrants stay visible in their tank on show day.
- Other exhibitors are score distributions, not simulated animals.
- Biotope accuracy uses the animals' native regions only, not plants or substrate.
- The trophy case shows up to about 16 pieces, and older minor rosettes are pruned from the record after 60.

## Audio
- The mix was balanced by metering (−27 dBFS ambience, music ≈5 dB under it), not by ear.
- Microphone input for party mode was verified only through its fallback path, because the test browser has no microphone. The built-in groove always works.

## Platform
- Runs in any modern WebGL2 browser. There is no native desktop or mobile package.
- Saves live in the browser (IndexedDB, falling back to localStorage, then memory). Use Settings → Export to move a save between browsers.

## Architecture
- A few small tank-editing mutators (rename, purpose, water-class conversion, backdrop/substrate change) live in `src/ui/panels/common/tankOps.ts` rather than `src/sim`. They are written as plain draft mutators, so they can move without changes.
- The AI imports `equipmentLayout` from the decor render module to place equipment colliders (an ai → render dependency).

## Creature motion
- **Decor collision shapes are rounded boxes.** They are fitted to each item's size, not its mesh. Crawlers climbing a lumpy rock (hermit crab, snails, shrimp) can sit a little above the real surface near the box corners. Branchy driftwood is modelled as a soft canopy over a solid boss, so fish weave through the limbs and crawlers only climb the boss.
- **Walkers use a small local planner, not path-finding.** The axolotl picks free headings a short walk ahead. In a very cluttered tank it sometimes gives up on a spot, or swims up and over to open floor.
- **The archerfish's fly is cosmetic** and never feeds the fish. The mangrove is a soft collider, so crawlers don't climb its roots.
- **At sustained low frame rates** (≈17–25 fps), swimmers near decor or in schools weave a little more: the scan reads ≈0.5% raw / 0.3% drawn, against 0.05% / 0 at normal frame rates.
- **The drawn pose is smoothed.** A One-Euro filter removes sub-millimetre contact jitter. The AI state underneath can still carry tiny reversals when a body presses against decor (see `npm run qa:motion`).
