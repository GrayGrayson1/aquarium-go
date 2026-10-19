# Known Limitations

What is simplified, approximated or missing in this build. None of these block play.

## Biology & simulation
- **Time is compressed.** A game day lasts 4 real minutes, and life stages and breeding timers are compressed further (incubation in game-hours ≈ real days × 8). This is labelled as a playability abstraction, not a biological claim.
- **Genetics are simplified.** Real domestic morphs are modelled as a few Mendelian, codominant or additive loci. Betta colour genetics collapse several real loci into one dominance ladder. Clownfish Snowflake/Platinum merge two real mutations (Klann et al. 2021). Seahorse colour is treated as a heritable tendency, though in reality it depends heavily on environment. Undocumented morph inheritance is modelled as recessive and marked in the data notes.
- **Prismatic animals are fictional.** No real animal shimmers like this. The shimmer is an individual rarity, not a gene, so Prismatic parents raise the odds without ever guaranteeing it. Named strains are game-recognised combinations of the simplified traits above. Real hobby names are used only where the game's traits match them. Strains are curated only for the five starters (axolotl morphs are single colours); every other species has the derived morph catalog. Because only the first matching base colour shows, trade names that need two base colours at once (e.g. a "Black Snowflake" clownfish) can't be expressed.
- **Some species cannot breed in-game** (`not_in_game`): hermit crab, both tangs, coral beauty, foxface, mantis shrimp, dwarf lionfish, miniatus grouper. Home-aquarium breeding of these is not realistically achievable. Amano shrimp and nerite snails need a brackish larval nursery, which is explained but not simulated.
- **Brackish water** is modelled as SG 1.003–1.018. Mollies and archerfish are capped at 1.018 in the game, although both tolerate full sea water. The figure-eight puffer's salinity needs are disputed, and the game follows the brackish consensus.
- **Species not bred in-game:** figure-eight puffers and archerfish are also `not_in_game` for breeding.
- **Several life-history values are estimates** (kuhli breeding, hillstream incubation, dwarf-frog clutch size, some lifespans, several marine egg/larval timings). They are marked in each species' `confidenceNotes` and in `docs/research/*.md`.
- **Scavengers don't consume detritus directly.** Detritus is removed by filtration and cleaning.
- **Heater/chiller running costs** use an estimated duty cycle, not metered energy.
- **During offline catch-up** (capped, grace period), nothing dies. Fights can still cost health down to the grace floor, while predation becomes only a scare. The grace limits never improve on the save: an animal already past the health floor or hunger cap is held where it is, and free plus conditioner-bound ammonia/nitrite is capped at a WATCH level, or at its saved level if that was higher. Absences under 60 s catch up silently, with no welcome-back card.
- **Conditioner hides what it binds.** For 24 game hours the bound ammonia/nitrite is left off the water report, so the reading drops, unlike a real test kit. It comes back when the dose wears off.
- **Shrimp colonies are capped** (a game abstraction): about 6 per gallon, at least 20 and at most 80 per tank, with at most 6 berried females at once. The breeding check says when a colony is full.
- **Nitrifier acclimation** is a game abstraction: one temperature per bacterial colony.
- **Names never change after birth,** so fry named before they can be sexed keep a neutral name. Board quests that stall rotate off silently.
- **Mixed soft- and hard-water tanks** settle between their residents' ideal pH. The report reads GOOD with a note while everyone is inside their tolerated range.
- **Background tanks** (beyond the 12 nearest) step in pieces of at most 30 minutes while a meal is fresh, then in coarser chunks.
- A three.js deprecation warning (`THREE.Clock`) comes from inside react-three-fiber and can't be fixed without changing dependencies.
- **Sold animals stay in the save** (status `sold`) so lineage lookups keep working. Very long games accumulate these records.
- **Save size.** A save is budgeted at 2.5 million characters, what the smallest browser storage quota holds (PERSIST-005); a Grand Hall with 40 tanks, 500 animals and eight production lines fits. Listing photos are the exception: with a photo on many active listings a save can pass the budget. It still saves normally (IndexedDB), but the quick copy written as the page closes then leaves the listing photos out, and since that copy is the newest, the next load uses it and those listings come back without photos. If even that copy doesn't fit, the console says so instead of failing silently. Where the browser has no IndexedDB and localStorage is the save store, a save near the budget leaves no room for its backup copy.
- **The Water room's reserves are exact for jobs, approximate for top-offs** (chunk 5). Water changes, mixing and the cultures run at their game hours whatever the step size, and use exact stock; an Auto Top-Off draws fresh water as its tank catches up, so a background tank's top-off lands at the end of its chunk and the fresh reserve can read up to about half a gallon differently from a run that watched every tank. The player's own changes and the keepers' stay on tap water and shelf salt (INTAKE C-67), so they never draw on the reserves.
- **A line "pauses", it never "pauses tonight"** (chunk 5). The design's Problems item "{Line} pauses tonight" forecasts a pause; the game holds a line's pair as soon as its grow-out tank can't take the next clutch (chunk 4), so Operations shows the line as paused, with the day it restarts.
- **Salt water is mixed at full strength.** The salt reserve is SG 1.025; brackish tanks blend it with fresh water, and a marine tank kept saltier than 1.025 gets its changes at 1.025.
- **The Water room's warnings are a forecast** (chunk 5, ADR-0033). "Salt water runs short" and "Fresh water runs short" come from a dry run of the room's next week that takes each tank's change at today's size and leaves out evaporation between changes, so near the limit a warning can come and go within a day, and a shortage rarer than about every five days shows only part of the time (B-202). The changes it predicts are skipped in the game all the same, and the log's summary line counts them.

## Economy
- Equipment-bundle listings (marked "later" in the spec) are not implemented. Livestock (single, group, pair, juveniles), frag/cutting and whole-tank listings are.
- Frags in storage don't grow. Coral colour-morph lines are not named: a frag is a clone of its parent's look, and its "line" records provenance only. Frag plugs are not drawn on far (merged) tanks.
- Only the five most recent closed listings keep their photos, which keeps save files small.
- **The holding container is a pause, not a tank.** An animal that wasn't part of a whole-tank sale and had no tank with room (or that a save repair found without a tank) rests there: it doesn't eat, age or breed until you move it to a tank, and the game says so (ADR-0029 decision 9, ADR-0030 decision 8).
- The admission-price projection in the Visitors panel is an estimate; the simulation decides actual attendance.

## Rendering
- The water surface uses sheen, glints and a total-internal-reflection band instead of true screen-space refraction. The mirror band does not reflect individual fish.
- Shadow maps use each creature's rest pose for shader-only deformations (fin flutter, gill sway, plant sway).
- Transparency sorting between fins inside a single fish is approximate.
- On far (LOD 2) tanks, desk and rack stands collapse into simple blocks.
- Visitors are deliberately stylised figures, not photoreal people.
- Building a world is still one synchronous main-thread commit (procedural geometry for every rock, plant and animal: 0.3–1.4 s for the title showcase, longer for a big save on a phone). It now runs under the warm-up veil, so the screen shows the veil instead of freezing, and the tank appears a moment later on boot. Shaders compile in parallel behind the same veil.
- Small animals in the hero tank draw lower-resolution meshes (same shape and materials) while they are only a few dozen pixels long. Decor keeps full detail at High/Ultra and simplifies small pieces at Low/Medium.
- The app chunk is ~2.5 MB (≈0.8 MB gzipped) plus ~1.5 MB of cacheable vendor chunks, because every creature, plant and texture is procedural code. Dev tools, photo mode and the management panels load separately.
- The shop dressing (shelves, starter-tank rack, supply cabinet, plants) is cosmetic. On rare occasions a visitor brushes through a corner piece next to a newly placed tank. The shop counter sits outside the default day-one framing; zoom out to see it.
- The frag rack is see-through only at the closest LOD; from far away it reads as pale grey plastic.
- The close camera's line-of-sight check models the substrate and hardscape domes, but not plants or equipment.
- Room-view GPU cost is dominated by the room point lights on the big lit floors and walls (about 45% of scene GPU in the grand hall). Reducing it would need an art change (a lightmap or fewer lights).
- Creature visuals still rebuild on a LOD change (about 100 ms of work spread over a room return). Publishing (`share`) still walks the whole state tree every tick (about 0.7–1.4 ms on the big facility). A `?fixture=` boot waits for one extra chunk.
- Big and high-DPI screens (4K, 150–200% scaling) render the 3D view at a capped internal resolution (≈4.2 MP at High, 3.2 at Medium, 2.1 at Low; Ultra is native up to 4K) and are scaled up. Motion is smooth, but the aquarium can look slightly softer than the crisp UI. Photos still capture at native resolution.
- The frame-time governor can't see a weak GPU until it has run for a few seconds, so the first 2–5 s on a new device may be uneven. After that the settled level is remembered per device.
- Budget CPUs on the 1,000 gal facility are limited by three.js draw-call overhead (~18 fps at 4× CPU throttle); resolution can't help there. Building a tank's decor and creatures on a tank switch can still hitch for 100–400 ms on slow CPUs.
- Very long tanks (500–1,000 gal) are small on portrait phones because they are framed to fit the width; pinch or orbit to get closer. The plaque's species line is legible only at tank-view distance.

## Care shortcuts
- "Buy & feed" on a creature card buys the cheapest suitable food, not the species' favourite.
- Welcome-back staff notes are matched to the log by the staff member's first name.

## Staff
- Staff walking is cosmetic and not synced to the exact game hour of each visit. Where tanks stand flush in a row, keepers feed from a front corner or the gap between tanks.
- Keepers don't feed fry or larvae; raising young stays hands-on.
- Staff never repair failed equipment; repairs stay the player's call. Keepers switch off a stuck-on heater and flag the failure; their reminders toast at most once a game day across the facility (a stuck-on heater always toasts). The alerts popover lists failed equipment until it is repaired.
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
- The score follows day and night only after a short hold at 1×. While fast-forwarding (3×/10×) it never switches to night (it still settles from night to day), so at speed the music lags the clock on purpose.
- Passive income chimes at most once every 12 s (30 s at 3×/10×). A bus at volume 0 stops rendering: the ambience is torn down, or the score turns off.

## Platform
- Runs in any modern WebGL2 browser. There is no native desktop or mobile package.
- Saves live in the browser (IndexedDB, falling back to localStorage, then memory). Use Settings → Export to move a save between browsers. A save that only reached memory is lost on reload; the game warns when that happens.
- On touch screens, the first tap on the faded (invisible) dock or tool rail only wakes the HUD. The top bar and tank bar act at once, and mouse clicks always act.
- On a phone held sideways, an open panel or card covers everything but the top bar, so it shows one toast at a time, in its header row beside the close button. The others wait their turn (routine news may expire into the event log), and the "played further in another tab" banner and the update prompt wait until the sheet closes.
- The iOS focus-zoom (G4-05) and long-press selection (G4-06) fixes are verified by code trace only: Playwright's WebKit emulates neither.
- **High contrast is the accessible mode over a bright room** (chunk 6, ADR-0035 decision 1; WCAG technique G174). Normal mode keeps the 0.5 design's see-through glass: its text passes WCAG 2.2 AA over a dark room, but grey text over a bright, sunlit room drops to 2.5–4.4:1. High contrast (Settings › Play & access) makes the panels, the top bar and toasts solid and passes AA on any background, and every step on the way to its switch passes AA too.

## Online (stage 1, chunk 8)
- **The server trusts each browser** (ADR-0038: people the owner knows). It stores the save and the leaderboard numbers as the game sends them; an edited save goes online as it is, and friends see whatever numbers and picture a player's game reports. Stage 2 checks them before anyone the owner doesn't know joins.
- **Sign-up needs a club's invite code: the club's word and four letters** (FRIENDS-KDWX, the owner's choice: 331,776 codes per word). Anyone may ask whether a code opens a club, but after 100 wrong codes in 10 minutes nobody gets answers until they age out (so someone guessing on purpose can also make invite links show as expired for those minutes; sign-up still works), and Supabase Auth limits sign-ups, which also test a code, to 30 per 5 minutes per address: someone with many addresses could still find a code in hours. A leaked code can be replaced (ARCHITECTURE.md's runbook). Signed in, a player may join any club. Only the owner creates clubs.
- **No emails:** no confirmation, and a forgotten password is reset by hand ("Forgot your password? Ask whoever invited you.").
- **No sign-in on the title screen:** a new device starts a game first, then signs in from Social to load the online save.
- **No likes, trades, leaving a club or club events** yet: trades are "open later", friends' pictures show no likes, and only the stub's sample clubs have events.
- **One online save per account**, the game on screen. When it differs from what this device last synced, a box asks which copy to keep. Load online save keeps this device's copy in Settings › Saves as "Previous autosave" (which replaces any older "Previous autosave" there); Keep this device's writes over the online copy (the server keeps the one it replaced only when it was a different aquarium, for a restore by hand). A device that starts a new game while in step puts that game online in place of the old one (kept the same way).
- **The free project pauses after a week with no activity.** Until the owner restores it, the game says it can't reach Aquarium Go online and plays on.
- **A body over 4,000,000 characters isn't sent** (a save is far smaller, gzipped; listing photos count).

## Architecture
- The AI imports `equipmentLayout` from the decor render module to place equipment colliders (an ai → render dependency).

## Creature motion
- **Decor collision shapes are rounded boxes.** They are fitted to each item's size, not its mesh. Crawlers climbing a lumpy rock (hermit crab, snails, shrimp) can sit a little above the real surface near the box corners. Branchy driftwood is modelled as a soft canopy over a solid boss, so fish weave through the limbs and crawlers only climb the boss.
- **Walkers use a small local planner, not path-finding.** The axolotl picks free headings a short walk ahead. In a very cluttered tank it sometimes gives up on a spot, or swims up and over to open floor.
- **The archerfish's fly is cosmetic** and never feeds the fish. The mangrove is a soft collider, so crawlers don't climb its roots.
- **At sustained low frame rates** (≈17–25 fps), swimmers near decor or in schools weave a little more: the scan reads ≈0.5% raw / 0.3% drawn, against 0.05% / 0 at normal frame rates.
- **Tanks out of view move at a quarter of the pace** (chunk 6, B-180). In tank view, tanks beyond the view radius aren't drawn and their animals' motion is stepped a quarter as often; far tanks in view step at their own moment within the AI's time budget. The simulation itself (health, feeding, breeding) is unaffected.
- **The drawn pose is smoothed.** A One-Euro filter removes sub-millimetre contact jitter. The AI state underneath can still carry tiny reversals when a body presses against decor (see `npm run qa:motion`).
