# Aquarium Go — Architecture

## ADR-001: Engine and stack

**Decision:** TypeScript + Vite + React 19 + Three.js via React Three Fiber (+ drei, postprocessing), Zustand + Immer for state, IndexedDB (idb-keyval) for saves, Web Audio API for all sound, Vitest for simulation tests, Playwright for end-to-end and screenshot QA.

**Context:** The project folder was empty. The machine has Node 22 and a hardware-accelerated headless Chromium (ANGLE/Metal on Apple M4 Pro). Godot and Blender are not installed. The prompt prefers the web stack by default. Agents can take and review screenshots of WebGL in headless Chromium with no extra setup, which makes an iterate-and-review visual loop practical in this environment.

**Consequences:**
- One command to run (`npm run dev` / `npm start`), no install beyond `npm install`.
- All art is **procedural / code-generated**: creature meshes are lofted from species body plans, decor and plants are generated from seeds, textures are shader-based. That keeps the art style consistent and avoids licensing problems. Nothing loads from the network at runtime (fonts are bundled via @fontsource; the environment map is built from in-scene light formers).
- Web deployment is possible later, but nothing is deployed.

## Layering (strict)

```
src/types        contracts only (no logic)
src/data         species, catalogs, unlocks, quests — pure data (+ tiny lookups)
src/sim          deterministic simulation: pure functions over GameState (Immer drafts)
src/state        Zustand stores: game (persistent), ui (transient), settings (localStorage)
src/persistence  IndexedDB save slots, versioned schema + migrations, offline cap
src/game         real-time loop driving sim ticks
src/runtime      per-frame non-persisted registries (creature runtime, food, events, audio-reactive)
src/ai           per-frame creature behaviour (reads sim state, writes runtime)
src/render       Three.js/R3F rendering (reads state + runtime; never mutates game state directly)
src/ui           React DOM UI (reads state; calls sim mutators through `mutate`)
src/audio        procedural Web Audio engine
src/dev          fixtures, sandboxes, debug commands
```

Rules:
- **Species facts live only in `src/data/species`.** UI/render/AI read them through `getSpecies()`.
- **The simulation is the source of truth.** Rendering and AI only present it. Example: feeding adds food to `tank.water.foodInWater`. The sim shares it out by feeding speed and competition, so a seahorse really does lose out to fast feeders. The AI animates particles being eaten, but the numbers come from the sim.
- **All game-state changes go through `useGame.getState().mutate(draft => domainFn(draft, …))`.** Domain mutators live in `src/sim/**`.
- **Determinism:** the sim draws randomness only from `simRng(state)`, which persists `rngState`. Cosmetic randomness uses `visualRng`/`Math.random`.

## Time

1 real second at 1× = 6 game minutes (1 game day = 4 real minutes). Speeds are 0, 1×, 3× and 10×. Water chemistry runs on game hours. Life stages and breeding timers are compressed further, as a documented playability abstraction (see GAME_DESIGN.md).

The game loop (`src/game/GameLoop.tsx`) pauses while the tab is hidden. A tab hidden for 5 minutes or more (`OFFLINE_HIDDEN_MIN_MS`) runs the same bounded catch-up as Continue when it comes back. The welcome-back card pauses the clock while it is open. Fast-forward drops to 1× once per animal per starvation episode (`src/game/starvationGuard.ts`): the loop owns that, and the sim never changes `clock.speed`.

Market windows (bid lifetimes, counter holds, closing grace, counter replies) are promises in real time: they are scaled by `marketTimeScale` (the clock speed above 1×), so a bid open 3 real minutes at 1× is open 3 real minutes at 10× too. Buyer arrivals are walked in `MARKET_STEP_HOURS` (0.1 h) pieces, so a long window (10×, catch-up) sees as many buyers per game hour as 1×. An open counter form renews its bid hold every 15 real seconds and on every speed change.

## Simulation LOD

`src/sim/world.ts` steps the **focused tank** at full fidelity every tick. Other tanks accumulate "sim debt". The first 12 are processed in ≥1 h chunks (reduced) and the rest in ≥4 h chunks (summary). Subsystems substep internally, so any chunk size gives stable results. Rendering LOD follows the same pattern: lod 0 is the hero tank, lod 1 is near tanks in the facility view, and lod 2 is far/cheap.

## Coordinate conventions

- Facility/world space is in metres, with the floor at y = 0.
- Tank-local space: x runs across the length, y runs from the tank floor up to the water surface, and +z faces the viewer. See `src/types/runtime.ts` and `src/sim/tankSpace.ts` (the single source of tank dimensions, derived from real gallon tank sizes).
- Creature objects: the head points +X, the standard length is 1 unit, and the caller scales by `sizeCm/100`.

## Rendering composition

`Scene` → `SceneRoot` renders `FacilityWorld` (room + visitors), one `TankInstance` per tank, `CameraRig` and `PostFX`. `TankInstance` wraps its layers in a `TankFXProvider`, which supplies per-tank caustic and fog uniforms used by `patchUnderwaterMaterial`. The layers are: lights, decor, equipment, AI, creatures, breeding visuals, food, water FX, shell, and interaction.

**Render performance.**
- SceneRoot subscribes only to the tank list, the hero and its position. Each `TankSlot` follows its own tank via `useRenderTank`, which ignores sim bookkeeping such as `simDebtHours`. Render code never subscribes to the whole `game`: it uses narrow selectors and reads changing values with `getGame()` inside `useFrame` (see `src/render/shared/renderSelectors.ts`).
- **Warm-up.** Building a world is one synchronous commit, so SceneRoot's `useVeiledBuild` first raises `WarmupVeil`, waits for its DOM commit (`useWarmup.veilUp`) plus one frame, and only then builds. `ShaderWarmup` compiles a veiled world's materials in one `compileAsync` pass and reveals it once they link; tier changes compile frame-sliced (24 ms a frame) with a per-program touch phase. A single-tank world replacing one already on screen (starter cards, the naming screen's Start) is swapped in place without the veil; cold boots and multi-tank loads keep the veiled build. `ProgramKeeper` keeps built-in programs alive across LOD swaps.
- **LOD.** Facility LOD uses hysteresis (`facilityLods` in `src/render/lod.ts`), so a camera drag doesn't flip tanks around the cut-off. Creature visuals for a facility LOD flip are rebuilt only after it has held 0.7 s, within a 3 ms per-frame budget, while the old body keeps drawing. 3D rock backdrop walls are cached and ref-counted per tank, size and detail, with 3 idle walls kept.
- Hero creatures pick a mesh tier by projected size (`src/render/shared/detail.ts`).
- A tank that becomes the hero builds its full-detail decor over several frames.
- **Portraits** (`src/render/portraits`) render on one shared offscreen renderer. A job runs in budgeted steps (build the creature; pose, frame and submit its programs with `compileAsync`; draw once they have linked), sharing a frame while under 8 ms, so a new species never links its shaders synchronously in one frame. Readback is asynchronous (WebGL2 pixel-pack buffer + fence, encoded with `toBlob` from a CPU-backed 2D canvas); the synchronous `toDataURL` path is the fallback. Parts listed in `geometry.userData.frameSkip` (by `aMask` part id: shrimp and hermit-crab antennae) are left out of the framing.
- **Frame-time governor.** `LatenessProbe` (`src/render/shared/resolution.ts`) estimates main-thread work outside the frame loop from timer lateness. It subtracts the platform's timer-delay floor and the post-frame rendering update (timed with a `MessageChannel` message after each frame), and evaluates ticks on `take()`. `__AQ_PERF()` also returns `extFloor` and `extPost`.
- The management panels (`PanelHost`), photo mode and the dev panel are lazy chunks. Vendor code (three, r3f + postprocessing, react, motion) is split into cacheable chunks.

**Camera and decor editor.** `useFacilityOverflow` / `facilityOverflow()` (`src/render/camera/facilityOverflow.ts`) report whether the room view's frame clips the exhibit row on the left or right; the HUD's edge cues read it, and `__AQ.facilityOverflow()` exposes it for QA. Decor picking is analytic (`src/render/decor/pickMath.ts`: the ray is marched against the substrate heightfield, and only pieces whose footprint box it crosses are mesh-tested) and is hit-tested once per frame. The held piece id is a subscribable store (`setEditingDecor` / `useEditingDecorId` in `registry.ts`), so it hides at once even while paused. A paid placement ends the tool; `src/render/decor/placeAgain.ts` remembers the piece for the tool hint's "Place another" chip.

**Residents index.** Inside each world step, "who lives in tank X" is answered from a lazily built per-step index (`src/sim/residents.ts`). Leavers are re-checked on every lookup. Code that adds a creature to a tank inside a step must go through `addCreature`/`moveCreature` or call `touchResidents()`. `AQ_VERIFY_RESIDENTS=1 npx vitest run` checks every indexed lookup against a fresh scan. `__AQ.loadFixture`, `__AQ.fixtures()` and `dev.playthrough` are async: the fixture registry is a lazy chunk, and `makeShowcase` lives in `src/dev/fixtures/showcase.ts`.

**Sim subsystems added in round 2.** `stepShows` (`src/sim/shows`) and `stepStaff` (`src/sim/staff`) run once per world step. Each draws from its own persisted random stream (`shows.rng`, `staff.rng`), so adding or tuning them never shifts the main sim's random sequence or the bot balance. Frags live in `src/sim/aquascape/frags.ts`, driven by per-decor propagation rules in `src/data/catalog/propagation.ts`. Fresh / brackish / marine fit is decided by one salinity model, `src/sim/compat/salinity.ts`.

**Sim rules from the 2026-09 audit.**
- **Water.** `stepTankWater` runs the autofeeder last, so its food is fresh when the creature step lets the animals eat. Conditioner really binds a share of ammonia and nitrite (`WaterLabState.boundAmmonia` / `boundNitrite`) for 24 game hours: the bound share neither harms animals nor shows on the report, so the reading drops (unlike a real test kit), and it comes back when the dose wears off. A dose while one is active only extends it. In salt tanks (brackish and marine alike) nitrite harm starts at raw 1 ppm, the report's WATCH line. `WaterReport.residents` (optional) lists each resident species with the harm the water is doing to it, so the tank bar agrees with the creature cards.
- **Lights.** A new tank's lights run from 07:00 until the room's closing hour, kept to 19:00–22:00 (`defaultLightsOff` in `src/sim/time.ts`). The algae advice fires only above 15 h, or above 12 h with the lights on after closing.
- **Breeding.** Shrimp colonies stop berrying at a ceiling of about 6 per gallon (at least 20, at most 80 per tank), with at most 6 berried females at once; the breeding check says why. Clown gobies change sex female → male through a `transitioning_male` stage (`protogyny.ts`). Only bettas (`breeding_only_temporary`) harass a female kept with the male; honey gouramis and other `courtship_ok` bubble-nesters harass only a spent female while the male guards.
- **Saves.** `repairState` renames pre-S16-05 overlay morph names on creatures and in `discoveredMorphs` (`renamedMorphs` in `src/sim/life/genetics.ts`).

## Motion presentation
The AI (`src/ai/core`) owns creature state. The renderer draws that state through a One-Euro pose filter (`src/render/creatures/core/poseFilter.ts`), which strongly steadies still or slow bodies and passes fast motion through. Only the drawn transform is filtered; sim and AI state are never touched. Walker constraints (`loco.ts`) never push a body past the glass, and they refuse steps and turns that would press into decor instead of undoing them afterwards. `npm run qa:motion` and `src/ai/core/motion.test.ts` measure per-frame vibration under uneven frame times.

Details:
- **Dead bodies:** once a body has settled clear of hard decor, its agent is laid to rest (`Agent.laidToRest`) and `stepWorld` skips it until a decor edit wakes it.
- **Equipment colliders:** `equipmentSolids` (`src/ai/registry.ts`) mirrors the drawn geometry in `render/decor/TankEquipment.tsx` (heater tilt, sump overflow and weir, canister intake and outlet, skimmer pump and riser). Keep the two in step.
- **Crawlers** keep to the surface they are on unless another is clearly nearer or they walk onto it, and they aim for points on the surface of the decor they climb.
- **Spot holders:** an animal holding a spot settles where it is if it can get no closer.
- **Swimmers:** avoidance uses a smoothed probe and a peak-held speed.
- **Frame stepping:** TankAI turns each frame into at most two even AI steps, and into one step (excess time dropped) once the AI is over 4 ms per frame (`src/ai/core/steps.ts`). The motion scan steps exactly the same way.
- **Slow-frame checks:** `FRAMES=40-60` and `OVER_BUDGET=1` check janky frames.

## Save strategy

GameState is plain JSON with a `schemaVersion`. `src/persistence/migrations.ts` upgrades older saves one version at a time. Autosave runs periodically and on visibility change. Offline progress is capped (`OFFLINE_CAP_HOURS`), and a maintenance grace period prevents catastrophic losses.

- **Grace.** During catch-up (`state.offlineGrace`), nothing dies, health is floored at `GRACE_HEALTH_FLOOR` and hunger capped at `GRACE_MAX_HUNGER`. An animal already past either limit is held where it is, not moved to the limit, so reloading never heals or feeds anyone for free, while real feeding and recovery during the catch-up count fully. Free plus conditioner-bound ammonia/nitrite is capped at a WATCH level, again never better than the save. Absences under 60 s catch up silently.
- **Stale tabs.** A write is refused (`SaveResult.code: 'stale'`) only when another tab's newer copy of the same aquarium is at least as far along as this tab's own play (game hours minus catch-up after hidden spells); otherwise this tab takes the save back. Once refused, it stays refused until the player loads the newer copy or keeps this one (the stale-tab banner). `WriteStamp` and `SaveMeta` carry an optional `hour`.
- **Leaving the page.** `saveGameSync` mirrors the record into localStorage on pagehide/hidden, where an IndexedDB round trip never lands. Boot reads every backend and takes the newest record.
- **Displaced aquariums.** When a load or overwrite replaces a slot's aquarium, it is kept in `<slot>.backup` and listed as "Previous …". Deleting the slot promotes it to be the slot's save. A save taken while the welcome-back card holds the clock stores the speed the card will resume.
- **Storage.** Each storage operation has a timeout; a backend that hangs or fails is demoted and the operation retried on the next one. A write that only reached memory is reported as degraded (a warning toast).

## Audio

`src/audio` is a procedural Web Audio engine. The AudioContext is built at idle time (`prewarmAudio`) but stays silent (master gain 0, suspended) until the first user gesture, even where the browser allows autoplay. A permanent capture-phase gesture listener in `AudioRoot` resumes it, and also recovers a context the OS interrupted. `__AQ_AUDIO.unlock()` counts as that gesture for QA scripts. Log-event cues come only from the audio director (`src/audio/cues.ts`), never from Toasts. While fast-forwarding (3×/10×) the day/night gate never moves to night but still settles from night to day, so fast sessions play the day score.

## UI conventions

- `tokens.css` defines `--safe-t/r/b/l` (safe-area insets) and `--edge-t/r/b/l` (`max(--edge, safe inset)`). `.ag-hud` and `.ag-screen` are inset by the safe areas; fixed layers use the `--edge-*` tokens.
- On touch screens (`pointer: coarse`), text selection and the long-press callout are off on `.ag-ui`, and form fields stay at least 16 px (iOS zooms on smaller focused fields).
- The kit `Modal` renders through a portal into the `.ag-ui` root, so modal content no longer inherits panel-scoped selectors such as `.pn-sheet--phone .x`.
- In short landscape (`max-height: 500px` and landscape), management panels always open at full height with a compact header and no expand button.
- `convertTempText` converts temperature differences ("by 2 °C", "1 °C below", "1–2 °C of", "~2 °C cooler") ×1.8 with no offset. Sim copy that states a difference should use these phrasings.

## Deploy

The `buildStamp` plugin in `vite.config.ts` defines `__BUILD_ID__` and emits `version.json` with each production build. `UpdatePrompt` polls it 20 s after launch, every 5 minutes and when the player comes back (tab shown, window focused, back online; at most every 15 s, and a return inside that gap is checked when it ends), and offers a reload when the live build differs. `render.yaml` sends `no-cache` for `/`, `/index.html` and `/version.json`.

## Lanes

See `docs/LANES.md` for the parallel build ownership map.
