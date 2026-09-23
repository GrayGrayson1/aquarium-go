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
- `ShaderWarmup` compiles a new world's materials with `compileAsync` behind `WarmupVeil`, and `ProgramKeeper` keeps built-in programs alive across LOD swaps.
- Hero creatures pick a mesh tier by projected size (`src/render/shared/detail.ts`).
- A tank that becomes the hero builds its full-detail decor over several frames.
- The management panels (`PanelHost`), photo mode and the dev panel are lazy chunks. Vendor code (three, r3f + postprocessing, react, motion) is split into cacheable chunks.

**Residents index.** Inside each world step, "who lives in tank X" is answered from a lazily built per-step index (`src/sim/residents.ts`). Leavers are re-checked on every lookup. Code that adds a creature to a tank inside a step must go through `addCreature`/`moveCreature` or call `touchResidents()`. `AQ_VERIFY_RESIDENTS=1 npx vitest run` checks every indexed lookup against a fresh scan. `__AQ.loadFixture`, `__AQ.fixtures()` and `dev.playthrough` are async: the fixture registry is a lazy chunk, and `makeShowcase` lives in `src/dev/fixtures/showcase.ts`.

**Sim subsystems added in round 2.** `stepShows` (`src/sim/shows`) and `stepStaff` (`src/sim/staff`) run once per world step. Each draws from its own persisted random stream (`shows.rng`, `staff.rng`), so adding or tuning them never shifts the main sim's random sequence or the bot balance. Frags live in `src/sim/aquascape/frags.ts`, driven by per-decor propagation rules in `src/data/catalog/propagation.ts`. Fresh / brackish / marine fit is decided by one salinity model, `src/sim/compat/salinity.ts`.

## Motion presentation
The AI (`src/ai/core`) owns creature state. The renderer draws that state through a One-Euro pose filter (`src/render/creatures/core/poseFilter.ts`), which strongly steadies still or slow bodies and passes fast motion through. Only the drawn transform is filtered; sim and AI state are never touched. Walker constraints (`loco.ts`) never push a body past the glass, and they refuse steps and turns that would press into decor instead of undoing them afterwards. `npm run qa:motion` and `src/ai/core/motion.test.ts` measure per-frame vibration under uneven frame times.

Details:
- **Crawlers** keep to the surface they are on unless another is clearly nearer or they walk onto it, and they aim for points on the surface of the decor they climb.
- **Spot holders:** an animal holding a spot settles where it is if it can get no closer.
- **Swimmers:** avoidance uses a smoothed probe and a peak-held speed.
- **Frame stepping:** TankAI turns each frame into at most two even AI steps, and into one step (excess time dropped) once the AI is over 4 ms per frame (`src/ai/core/steps.ts`). The motion scan steps exactly the same way.
- **Slow-frame checks:** `FRAMES=40-60` and `OVER_BUDGET=1` check janky frames.

## Save strategy

GameState is plain JSON with a `schemaVersion`. `src/persistence/migrations.ts` upgrades older saves one version at a time. Autosave runs periodically and on visibility change. Offline progress is capped (`OFFLINE_CAP_HOURS`), and a maintenance grace period prevents catastrophic losses.

## Lanes

See `docs/LANES.md` for the parallel build ownership map.
