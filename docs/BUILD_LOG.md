# Build Log

## 2026-09-22 — Orchestrator: foundation
- Inspected the empty project folder and the blueprint zip (master prompt, research notes, design blueprint, acceptance checklist, starter seed JSON).
- Toolchain: Node 22, npm 10, Playwright Chromium with hardware WebGL (ANGLE/Metal, Apple M4 Pro). No Godot or Blender, so the web stack was chosen (ADR-001 in ARCHITECTURE.md).
- Wrote the shared contracts (types, stores, sim context, world stepper with LOD, tank geometry, starter setups, species seed records for the five starters, fixed roster ids, unlock keys, UI kit, and underwater shading helper) plus stubs for every lane. Everything typechecks and runs end to end.
- Launched 16 parallel lanes (see LANES.md): species-fw, species-marine, waterlab, lifecycle, breeding, market, facility, waterfx, aquascape, fishart, critterart, behavior, ui-shell, ui-panels, audio, core.
- Fable: not used. Nothing in this environment showed a task where it would clearly beat the Claude Opus 5.5 path. All art is procedural code, which the Opus lanes handle directly.

## Phase 1 — sixteen parallel lanes (Claude Opus 5.5 subagents)
Each lane owned an exclusive set of paths and coded against the orchestrator's contracts and stubs:
- **species-fw / species-marine:** 44 research-backed species records (5 starters + 21 freshwater + 18 marine), with per-species source tables in `docs/research/*.md`. 225 + 178 validation checks.
- **waterlab:** nitrogen cycle with separate AOB/NOB lag, free-NH₃ toxicity, thermal inertia, heater/chiller conflict, evaporation/salinity, equipment wear/failure; the data-driven compatibility engine; care actions; equipment, food and substrate catalogs.
- **lifecycle:** genetics (Mendelian/codominant/additive loci, phenotype rules, mutations), personality, welfare, illness, growth, predation and fight incidents with explained log lines.
- **breeding:** one module per breeding system. All five starter loops work end to end: axolotl spermatophores after a cooling cue, betta bubble nest with harassment if the pair is left together, pea-puffer egg scatter, clownfish protandrous hierarchy and male egg care, seahorse male pregnancy and birth. Also livebearers, shrimp colonies and generic spawners.
- **market:** original valuation model, pre-rolled shop stock, 9 buyer archetypes with preference-driven bids and messages, non-monotonic auctions, counters, whole-tank listings with snapshot integrity, graceful debt with a one-time club loan.
- **facility:** six facility levels, placement and pathfinding, visitor model with fatigue and a welfare gate, exhibit scoring, unlocks, research, 11-step tutorial chains per starter, quests, achievements, procedural rooms, instanced 3D visitors.
- **waterfx:** glass, water surface, total internal reflection, caustics, path-length water fog, light shafts, particles, bubbles, light schedule, all camera modes, post-processing, quality presets, context-loss recovery, photo capture.
- **aquascape:** 45 decor items with procedural rocks, wood, plants, corals and anemone; sloped substrate; beauty scoring; starter layouts; 3D decor editor; equipment props.
- **fishart:** procedural fish generator (lofted bodies, a fin library, a swim-deformation shader, 17 pattern kinds, iridescence), 31 fish species, portraits.
- **critterart:** axolotl, seahorse, shrimp family, mantis shrimp, crayfish, snails, hermit crab and frog (skinned and procedural), plus breeding visuals.
- **behavior:** pure, testable AI core, 35 behaviour sets, feeding visuals mirroring the sim, glass interaction, tutorial observation hooks.
- **ui-shell / ui-panels:** title, starter reveal, naming, HUD, creature and tank cards, tutorial coach, settings, photo, party and dev panels, and nine management panels.
- **audio:** fully synthesized soundscape, generative music, SFX, event cues, music-reactive party mode with a microphone fallback.
- **core:** versioned saves with backups and migrations, capped offline progress with a grace period, a fast mutation path (the sim ran 15–60× slower under Immer), dev commands, the e2e suite, the QA screenshot script.

An account usage limit interrupted ten lanes mid-task; they resumed from their transcripts once it reset. The orchestrator relayed cross-lane requests and made the integration fixes: error boundaries, the lid-ownership conflict, a shader declaration, sloped-ground clamping, environmental stings, the breeding food hook, feeding while mouthbrooding, placement plumbing, and hiding visitors that blocked the tank view.

## Phase 2 — polish round (three agents)
- **polish-render:** hero framing, a lens-shift reframe around open sheets (`data-occlude` contract), brighter and clearer freshwater, exhibit-first facility overview, a chunkier axolotl, solid small-decor colliders, a phone tap-to-place fix, a context-loss remount-loop fix. Draw calls in the big facility went from ~1290 to ~510.
- **polish-ux:** toast redesign (placement, caps, merging), occlusion attributes, a first-10-minutes playthrough of all five starters with fixes, dock scrolling on phones, a calm HUD that fades while watching, three new layout e2e specs.
- **polish-gameplay:** silent start-of-game achievements, a headless bot playing every starter for 45 game days (balance targets enforced in tests), facility cost and rent retune, feeding and pH fixes, four tank-sale integrity bugs fixed, an edge-case coverage map for all 33 items in spec §28, cleaner log text and throttles.

## Final verification (orchestrator)
- `tsc --noEmit`: 0 errors.
- `vitest run`: 41 files, 827 tests passing.
- `playwright test` against a production build: 33/33 passing. The perf specs first failed once under heavy machine load from other OS processes; they passed on an isolated re-run at ~60 fps.
- The QA screenshot set (`screenshots/01…10`) was regenerated from the production build and reviewed.
- Fable was not used; see the foundation entry above.

## Post-build QA: creatures vibrating in place (2026-09-23)
The player saw the starter axolotl "vibrate in place as if there's some kind of collision issue". A headless motion scan (`npm run qa:motion`, `src/ai/core/motionScan.ts`) reproduced it under browser-like uneven frame times: ~1 s windows in which an animal reverses position or heading frame to frame 6+ times. Across every starter (5 seeds each) and the multi-species fixtures, 20.5% of windows vibrated. The axolotl reversed ~40×/s, and tetras, bettas, corydoras and clownfish showed heading shivers.

Root causes and fixes (`src/ai/core/loco.ts`, `acts.ts`, `brain.ts`, `env.ts`):
- **Branchy driftwood was one solid box.** Spider wood's collider covered its whole bounding box, about a third of the 20-gallon starter tank, while the model is thin limbs over a small boss. Spider wood and manzanita are now a soft canopy over a solid boss, the same pattern as plant crowns.
- **Walker collision fights.** Decor pushes could shove the axolotl through the glass, and the glass then pushed it back every frame. Pushes are now clipped at the glass, and the glass has the last word. A step that would press into decor is not taken (the brain re-plans after ~1 s), and a turn that would swing the nose or tail into decor is refused before the step, not undone after it.
- **Step-up lift leaked sideways.** The lift that raises a walker onto a low stone was re-projected away along the sloped sand's normal each frame, sliding the body sideways. It is now removed before re-projection.
- **Walker spawns were never valid in cluttered tanks.** `bodyFits` treated stones a walker steps over as walls, so 0–2 of 400 floor spots fitted in some layouts. The check now uses the walkers' own footprint rules. A walker boxed in with no walkable exit swims out to open floor (`reposition`), and a swimming axolotl rests only where its whole body fits.
- **Swimmer heading feedback.** Look-ahead avoidance moves with the heading, and "face the look target" versus "face the way I'm going" was a hard switch at a speed threshold. Both flipped headings at frame rate. Facing is now a continuous blend. Avoidance and the aim are low-passed (~0.1 s, quicker when urgent), and near-vertical aims keep the current compass heading.
- **Seahorse snout.** A hitched seahorse looking about could swing its snout into the rock beside its post. Such a turn is now refused, and a snout already inside turns away.
- **Presentation smoothing.** `src/render/creatures/core/poseFilter.ts` puts a One-Euro filter on the drawn transform only. It smooths hard at rest and passes fast motion straight through.

Result: 0.24% of windows vibrate in the raw AI motion and 0.02% in what is drawn. The axolotl is at 0%. The new `src/ai/core/motion.test.ts` guards this: raw starter motion under 1%, the axolotl at 0, drawn motion under 0.3%. `vitest`: 42 files, 829 tests passing.

### Follow-up: livelier axolotl, then a QA fix round (2026-09-23)
**Axolotl behaviour.**
- **Why it barely moved:** the player's pet rested ~90% of the time. The explore/cruise "arrived" radius scaled with body length (29–49 cm for a 22 cm axolotl in a 76 cm tank), and random spot picking fell back to "right here". Walkers also stalled at rocks.
- **Explore targets:** a walker-aware floor sampler (`freeFloorSpot`) picks explore targets.
- **Arrival radius:** bounded by tank size (`reachR`).
- **Getting around rocks:** a small local planner (`walkerPlan` in `loco.ts`) tries headings fanned round the goal and round the current heading, and keeps one along which the whole body stays clear a short walk ahead. It uses hysteresis and re-plans ~5×/s.
- **Getting unstuck:** a walker that gets stuck twice swims to open floor.
- **Starter layout:** the axolotl scape (`sim/aquascape/starters.ts`) now leaves an open front-centre sand stage. The free floor where the body fits went from 10–16% to 24–29%.
- **Result:** 2.7–4.5 m walked per 5 min and ~40–65% resting, a mix of exploring, inspecting the glass and short swims.

**Other motion fixes.**
- A hard pitch cap, with softer forage and look pitch, ends head-stands.
- Similar-sized bodies keep apart (`bodySpacing`).
- Calm swimming is capped at 2.4× cruise, and school separation is bounded.
- Swimmer push-outs are rate-limited, so a rock dropped on a fish eases it out.

**QA.** Three parallel QA agents played the game headlessly: first session, mid/late game, and a visual audit of all species. About 60 findings, fixed by five lane agents plus the orchestrator:
- **Rendering:**
  - The post chain froze after photo/close-up (the composer is now keyed on its DoF state). There is a new `tests/e2e/camera-freeze.spec.ts`.
  - Marine tanks flashed black frames (NaN normals from the red-ogo/gorgonian generators, spread by bloom). Fixed at the source, with guards in the builders and shaders and a sanitize pass.
  - Glass reflections are softer.
  - Follow/close framing works for every body size, prefers side profiles and stays on the tank. Phone framing is better.
  - Distant tanks read as water, and nights are moonlit.
  - Caustics are softer.
  - Visitors were rebuilt with faces, varied looks, no clones, and they step out of the camera's way.
  - Room trim no longer z-fights.
  - The 1,000-gallon view holds 60 fps (a per-tick shader recompile was removed).
- **Art:**
  - Shape-preserving containment replaces vertex clamping, which had flattened red ogo and wood ends into plates.
  - Fine-grained aquasoil; curved, back-lit leaves.
  - Remodelled grouper eyes, snails, hermit crab, pleco, fancy-goldfish double tail and panda cory.
  - The selection is a rim glow instead of a cyan ghost.
- **Sim:**
  - Saves are found and migrated across storage backends after a slow first load.
  - Tank status covers animals and food, not just water.
  - Low- and out-of-food signals.
  - Tips are welfare-gated.
  - Market timing is humane in real time, and offers are held during a counter.
  - Tutorial steps count only progress made after they start.
  - Research doesn't charge for unlocks already earned.
  - Predation matches the stated risk.
  - Starters start fed.
  - Copy fixes.
- **UI:**
  - One side card at a time.
  - Phone fixes.
  - Overflow and copy fixes; "Tap glass" (renamed from "Observe").
  - The tutorial's "Speed up" is temporary.
  - The Build panel suggests decor for the habitat step.
  - Buy shortcuts for food.
  - The new status and food signals are shown.

**Verification.** `tsc` clean. `vitest`: 50 files, 898 tests. Playwright against the production build: 34/34. QA screenshots regenerated. Motion scan: 0.27% raw, 0.03% drawn, axolotl 0.

## Round 2: improve, test, expand (2026-09-23)
The user asked for every improvement we could find, more testing, visual bug fixes, and then expansion in ways that make sense. The orchestrator reviewed fresh screenshots and ran three waves of parallel Claude Opus 5.5 agents. They shared one dev server, made small additive edits to shared contracts, kept the save format at v1 (new fields are optional and initialised lazily), and each reported back for integration.

### Wave 1: four features and three fix lanes
- **Shows & Championships** (`src/sim/shows`, `src/ui/panels/shows`, `src/render/facility/Trophies.tsx`):
  - a deterministic show calendar (own RNG stream) across four tiers, with 16 classes, including aquascape classes that finally give `photo_contests` a job;
  - humane eligibility rules, judging against 100-point standards with a judge's card for every entry, and deportment from keeper bond;
  - purses, reputation, rosettes, Champion / Grand Champion titles, and valuation and exhibit bonuses;
  - a procedural trophy shelf (hobby room) and vitrine (larger venues), a Shows dock button, and 7 achievements and 2 quests.
- **Staff & operations** (`src/sim/staff`, Visitors › Staff tab, `StaffLayer.tsx`):
  - aquarists feed and do routine water care through the real sim mutators, but never raise bond or player counters;
  - a stock manager reorders within a budget, and docents lift satisfaction and donations;
  - wages are paid at midnight, and unpaid staff leave gracefully after notice;
  - uniformed instanced figures, and keeper feeds that show in tank view;
  - `big_facility` is staffed.
- **Frags & cuttings** (`src/sim/aquascape/frags.ts`, `src/data/catalog/propagation.ts`):
  - honest propagation rules per living decor, with parent healing, a frag rack and ceramic plugs, and grow-out into colonies;
  - a `frag` market listing kind with buyer taste and valuation, plus local-store sales;
  - achievements.
- **Brackish Estuary chapter** (`src/data/species/brackish`, `src/sim/compat/salinity.ts`):
  - figure-eight puffer, bumblebee goby, sailfin molly and banded archerfish (spit act, water jet, fly);
  - mangrove roots, oyster shells, estuary pebbles and an emergent mangrove seedling;
  - a tuned brackish water class and water look, a research node, and 3 fixtures;
  - one salinity model fixed three real bugs: marine species were allowed in brackish tanks, the molly compat check disagreed with the purchase gate, and the welfare fallback killed brackish fish in fresh water.
- **qa-visual:**
  - engraved brass exhibit plaques;
  - equipment tucked into rear corners (sump heaters hidden, coast-to-coast weir);
  - portrait phone framing, clearer planted water, and a livelier clownfish starter;
  - tool-rail-aware framing, the photo-mode entry fix, shop-sign framing, a phone HUD scrim, hobby-room night dimming, peppermint shrimp colour, and panel layout fixes.
- **qa-play:** all five guides and the mid/late game played through the real UI, with about 30 UX and copy fixes:
  - a one-tap betta feed step, the overfeeding tip, fry food in the feed picker, the Target-feed "Offer to <name>" shortcut and a "Cool 25%" water change;
  - "back to offer" after buying a tank, compat previews that lead with the newcomer, and consistent hunger words;
  - fixtures that load well run.
- **perf:**
  - narrow render subscriptions (renders in room view 1424/s → 27/s) and hero mesh tiers by on-screen size;
  - shader warm-up behind a veil with program keep-alive, and progressive hero decor;
  - vendor/dev/photo code splitting.
  - The 1,000 gal display went from 52 to 60 fps (p95 50 → 17 ms), load freezes are about half as long, and tank switches went from 200–567 ms to 33–117 ms. The main chunk went from 3.7 MB to 2.5 MB.

### Wave 2: follow-ups from the QA reports
- **w2-sim:** a 615-run bot sweep found the balance test was fragile. The axolotl pair out-produced its filter, and quest-board luck swung pre-shop money from $240 to $750. Fixes:
  - nitrifier acclimation to cool water, a sponge filter of 12, stale-quest rotation, a shop reputation gate of 100, and names that don't use the sim RNG and match sex;
  - one flow rule and a tolerated-pH rule shared by the report, comfort and compat;
  - visitor occupancy counted from real arrivals, and a debt message that matches the Finances panel.
  - Zero target failures across 615 runs.
- **w2-ui:**
  - a Feed row on every creature card ("Buy & feed" fallback);
  - an honest welcome-back card (time away, time simulated, show results, bids, staff notes with deep links);
  - a Shows dock badge and the "An extra pair of hands" staff quest;
  - phone Build-row and tab overflow fixes;
  - plural buyer messages, real-time bid expiry and a copy sweep;
  - unlock toasts that open their panel, and locked water types in Convert.
- **w2-visual:**
  - furnished specialty shop and store (tile wainscot, stock shelves, a starter-tank rack, a pegboard cabinet, a fig) that step aside as the exhibit wall fills;
  - foreground visitors and staff dissolve in room view;
  - a zoom clamp with a card open, and a close-camera line-of-sight check (no more dark frames on bottom dwellers);
  - rebuilt cholla and mopani, a warmer pea puffer, archerfish glints, rings and bubbles, brushed-brass trophy plates, and an acrylic frag rack.
- **Orchestrator:**
  - research-panel unlock groups for shows, staff and brackish;
  - fertiliser allowed in brackish tanks;
  - original clownfish name ideas (no famous fictional names);
  - friend-tip toasts every two game days;
  - a second filter in `community_fw`;
  - docs.

### Wave 3: motion, final QA, perf round 2
- **motion:** after integration, the motion scan had regressed from 0.22% raw to 0.71%. Part of that came from fixture layouts reshuffling when name generation left the sim RNG.
  - **Peacock mantis shrimp:** it shook at its burrow. The burrow sat inside a rubble mound it wasn't allowed into, and its crawl surface flipped between sand and rock every frame. It now sits in the burrow mouth facing out and makes small, deliberate scanning turns.
  - **Other fixes:** shared hide spots, hide anchors inside neighbouring decor, a nose-down cory, schooling fish stuck unable to turn around, a seahorse snout head-shake, and crawl-surface hysteresis for shrimp and snails.
  - **TankAI catch-up** is now bounded: at most 2 substeps, and 1 when the AI is over budget.
  - **Result:** motion scan raw 0.71% → 0.05%, drawn 0.08% → 0.00%. `motion.test.ts` now guards burrowing and hiding animals and long frames.
- **qa-final:** played the whole game as a new, mid-game and late-game player with every new feature together, and added `tests/e2e/features.spec.ts` (Shows, Staff, Frags, Brackish; e2e now 38 specs). Fixes:
  - **Overfeeding tip:** a staff tong round tripped the player's overfeeding tip. Tong portions are now judged against the animal's own appetite, and keepers never tip.
  - **Background tanks:** they ate after their food had rotted (LOD chunking), starving pea puffers under staff care. They now step in ≤1 h pieces while food is in the water.
  - **Brooding Banggai fathers:** they starved; they now fast, with hunger held.
  - **Notifications:** late-game toast calming (critics once a game day, merged breeding bursts), and headline unlocks lead merged toasts.
  - **Phone and layout:** a phone guide pill above the tank card, compact Research and Market tabs, and wrapping chips.
  - **Smaller fixes:** feed-row food ordering, a hidden leftover guide quest, and quiet fixture achievements.
  - **Seahorses:** the hungry seahorses were the bot's schedule; the bot now gives fast-metabolism species a late meal.
- **perf2:**
  - **Residents index:** a per-step index (`src/sim/residents.ts`), A/B-tested bit-identical and with a verify mode. The big-facility tick is 44–46% faster.
  - **State publishing:** faster `share()` and working-copy clone.
  - **Room view:** static shell and equipment meshes are merged per material (15–26% fewer draw calls, pixel-identical). Merged LOD-1/2 decor is cached and rebuilt over several frames, so room-return spikes went from 133–150 ms to 67 ms or less.
  - **Bundle:** the fixture registry and playthrough bot load lazily.
- **staff2:** keepers feed fast-metabolism tanks 3–4 times a day, look ahead to the next visit, trim portions only at WATCH, and take turns with tong portions. Meals are sized for everyone who eats them. Hungry tank-hours: staffed big_facility 23% → 0.1%, staff_store 5% → 0%. Food fed went from 1.28× to 1.16× of metabolic need. Background meals no longer rot before the first bite.
- **Orchestrator:** "may eat the young" predation now requires the young to fit the predator's mouth. A seahorse had been "eating" 6 cm juvenile cardinalfish, and a dwarf frog a 5 cm juvenile kuhli loach. Regression test: `tests/sim/round2-orchestrator.test.ts`.

### Round 2 verification
- `tsc` clean.
- Vitest: 75 files, 1,161 tests (baseline at the start of the round: 50 / 898).
- Playwright against the production build: 38/38, including the new `features.spec.ts` for Shows, Staff, Frags and Brackish.
- Motion scan: raw 0.03%, drawn 0.00%, axolotl 0.
- QA screenshots regenerated in `screenshots/`.
