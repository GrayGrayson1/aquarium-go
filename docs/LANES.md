# Aquarium Go — Parallel Build Handbook (read fully before writing code)

> **Superseded for the autonomous build (2026-10-05).** This handbook describes the original sixteen-lane parallel
> build. For agents working under `docs/agent/`, the master source of truth wins where they conflict: the orchestrator
> makes local commits on the integration branch (master §3.4); core-owned edits an approved slice needs are
> pre-authorized, except the gate-defining files (§3.8); `npm ci` is allowed in a fresh worktree; type-check and test
> the whole project, not just your files; and the final report is the evidence in `docs/agent/evidence/`. The
> ownership map, contracts, art direction and quality bar below still describe the code.

Sixteen agents build the game at the same time, in one folder. The orchestrator owns integration. The contracts in
`src/types/**`, the stub files, and this handbook are what hold the project together, so follow them exactly.

## 0. The game in one paragraph

Aquarium Go is a beautiful aquarium-building and aquarium-shop tycoon. It combines the feeling of choosing a creature
companion, tycoon expansion, and a living-aquarium simulator. The player starts with one remarkable creature (axolotl,
betta, pea puffer, ocellaris clownfish or lined seahorse) in a pre-cycled tank. They care for it, aquascape it, breed
distinctive individuals, sell animals or whole aquariums to bidding NPC buyers, open to paying visitors, and grow from
a hobby room to a grand hall with 1,000-gallon displays. **Individual animals matter. Compatibility is explained,
never hidden. The tank must be beautiful enough that the player just wants to watch it.**

Priorities when choosing between options: beautiful and delightful → actually playable → biologically coherent without
being tedious → stable and testable → fast to understand → extensible → performant.

## 1. Ownership rules

- You may **create and edit only files inside your lane's owned paths** (listed in your brief). Everything else is read-only for you.
- Stub files in your paths are yours: **replace their bodies but keep every exported name and signature**. Other lanes
  and the UI already call them. You may ADD exports, optional parameters, and new files freely.
- `src/types/**`: you may **add optional fields or new types** if you truly need them (keep additions minimal; put a
  comment `// lane:<name>`). Never rename, remove, or make an existing field required. Mention every addition in your final report.
- Do **not** edit `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/App.tsx`, `src/main.tsx`,
  `src/state/**`, `src/sim/world.ts`, `src/sim/newGame.ts`, `src/sim/tanks.ts`, `src/sim/tankSpace.ts`,
  `src/render/tank/TankInstance.tsx` unless your brief lists them. If you need a change there, describe it precisely in
  your final report and the orchestrator will make it.
- **Never run `npm install`** or add dependencies. Installed: react 19, three 0.186, @react-three/fiber 9, drei 10,
  @react-three/postprocessing 3, postprocessing, zustand 5, immer, idb-keyval, lucide-react, motion (`motion/react`),
  clsx, simplex-noise, @fontsource-variable/fraunces, @fontsource-variable/inter, vitest, @playwright/test.
- Never delete files you do not own. Do not run git commands that change state.
- No network assets at runtime. No copyrighted/unlicensed code or art. Everything is procedural or original. If you
  adapt a known technique, write your own implementation. For any third-party snippet (MIT/CC0 only), add a row to
  `docs/ASSET_LEDGER.md` under a heading for your lane (append only).

## 2. Contracts you must know

- `src/types/species.ts`: `SpeciesDefinition` (all biology is data). Read species only via `getSpecies(id)` from `@/data/species`.
- `src/types/game.ts`: `GameState` and everything persisted. `src/types/catalog.ts`: tanks, equipment, decor, food.
- `src/types/runtime.ts`: per-frame `CreatureRuntime`, food particles, visual events, pointer, audio-reactive, **coordinate conventions**.
- `src/types/reports.ts`: water, compatibility, valuation, beauty and exhibit reports consumed by the UI.
- `src/sim/context.ts`: `SimContext` (`rng`, `hour`, `dt`, `lod`, `emit`). **Sim randomness comes only from `ctx.rng` /
  `simRng(state)`, a subsystem's own persisted stream (`shows.rng`, `staff.rng`), or a keyed `mulberry32(hashString(key))`
  stream** (see "Determinism" in `docs/ARCHITECTURE.md`).
- `src/sim/world.ts`: the order in which subsystems are called each tick (read it).
- `src/sim/tankSpace.ts`: tank dimensions in metres, swim bounds, decor anchors/colliders, `tankWorldTransform`.
- `src/state/game.ts`: `useGame`, `mutate(recipe)`, `getGame()`, `mutateGame()`. **State changes go through the store
  boundary only: `mutate` for player actions (the UI, render input handlers, the AI's tutorial hook), `mutateFast` for
  the game loop, the hidden-tab catch-up and the flush before a save, and `setGame` to replace the whole world** (see
  `docs/ARCHITECTURE.md`). The render frame loop never writes game state.
- `src/state/ui.ts`: transient UI state (screen, view, focused tank, camera mode, tool, panel, toasts, party/photo mode).
- `src/state/settings.ts`: settings (volume, quality, reduced motion, advanced water, dev mode…).
- `src/render/shared/underwater.ts`: `patchUnderwaterMaterial(mat, fx)` + `useTankFX()`. **Every material rendered
  inside a tank should be patched**, so caustics and water fog stay consistent. Custom ShaderMaterials can include
  `UNDERWATER_PARS` / `UNDERWATER_APPLY` (they need `vAgWorldPos` / `vAgWorldNormal` varyings).
- `src/render/creatures/types.ts`: imperative `CreatureFactory` → `CreatureObject` contract.
- `src/runtime/tankRuntime.ts`: `runtime.creatures` (AI writes, renderers read), `runtime.food`, `pushVisualEvent`.
- `src/audio/sfx.ts`: `sfx(id)`, safe to call anytime.

Time: 1 real second at 1× = 0.1 game hours (1 game day = 4 real minutes). Life stages and breeding use compressed game-days (see species `lifecycle` / `breeding`).

## 3. Commands

```bash
# Type-check only your files (other lanes are mid-edit — ignore their errors):
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "src/(YOUR|PATHS)" | head -50
# Run only your tests:
npx vitest run tests/sim/<your>.test.ts
# Dev server on YOUR lane port (see brief). Leave it running in the background; kill it when done.
npx vite --host 127.0.0.1 --port <PORT> --strictPort &
# Screenshot (hardware WebGL works headless on this Mac):
node scripts/shot.mjs "http://127.0.0.1:<PORT>/?showcase=betta" $SHOTS/shot.png --wait 5000 [--w 1440 --h 900] [--eval "js"] [--click "css-selector"]
```
Then **look at your screenshots with the Read tool** and iterate. Store screenshots in
`SHOTS=<your scratch dir>/aq-<your-lane>`
(create it with mkdir -p), not in the repo, except for final QA shots requested in your brief.

URL flags: `?showcase=<starterId>` (axolotl | betta | pea_puffer | ocellaris_clownfish | lined_seahorse) loads a
ready-made starter world straight into tank view. `?fixture=<name>` loads any fixture registered in
`src/dev/fixtures/index.ts` (you may add fixture files + `registerFixture` calls there, append only).
`&view=facility` gives the room view. `?dev=1` enables dev mode. `?sandbox=<name>` renders
`src/dev/sandboxes/<name>.tsx` in isolation (make your own sandbox files for focused iteration, prefixed with your lane name).
In the page, `window.__AQ` (added by the core lane) exposes stores for scripted checks.

Hot-module reload means other lanes' saves can briefly break your page. If a screenshot shows an error from
someone else's file, wait ~20 s and retry. Only fix errors in files you own.

## 4. Art direction (all render + UI lanes)

**"Living nature documentary"**: realistic lighting and optics with a gently painterly finish. The aim is luminous,
calm and rich but restrained colour, like a high-end aquarium photographed well. It should never look like a toy, and it should not chase gritty photorealism either.

- **Water is the star.** Soft depth haze tinted by water class (cool freshwater: clear teal-green; tropical planted:
  warm green-gold light; marine: clear cyan-blue; reef: deep blue with actinic glow; night: moonlit blue). Dancing caustics
  on every surface. Floating particulate catches the light. Slow light shafts. The underside of the surface shows a silvery
  total-internal-reflection shimmer. Bubbles from equipment.
- **Glass** reads as glass: thin bright edges with the classic green tint on the glass thickness, faint room reflections,
  a black rim/trim, and a cabinet or stand that looks like furniture.
- **Creatures** must be the most refined objects on screen: good silhouettes, soft subsurface-like translucency in fins,
  iridescence where real, eyes with a catchlight, continuous organic motion. **No primitive geometry, ever.**
- Rooms are darker than tanks, so tanks glow like in a public aquarium. The hobby room is cosy and warm-lit. The shops are clean and modern.
  Galleries and halls are dark with spot-lit glowing exhibits.
- **UI** is premium and quiet: dark frosted-glass panels (backdrop-blur), thin 1px light borders, generous spacing,
  Fraunces (display serif) for titles and creature names, Inter for UI text. Accent aqua `#5EEAD4`, warm coral `#FF8A65`,
  rarity gold `#F5C451`. Status: GOOD `#4ADE80`, WATCH `#FBBF24`, DANGER `#F87171` (always paired with an icon + word,
  never colour alone). The aquarium is always the hero: the UI hugs the edges and collapses away.
- Respect `settings.reducedMotion` (no camera shake, calmer animations) and `settings.quality` (`low|medium|high|ultra`).

## 5. Quality bar

- TypeScript strict, no `any` unless isolated and commented. No console spam (warnings only for real problems).
- The sim must be deterministic and robust to any `dt` up to ~6 h (substep internally). Never produce NaN; clamp stats.
- Write Vitest tests for your simulation logic under `tests/sim/<lane>-*.test.ts`.
- Render code must be leak-free: dispose geometries, materials and textures you create. Reuse geometry per species/variant. Use instancing for many small things.
- Performance target: 60 fps on this M4 Pro for a hero tank with ~40 creatures at `high`. Keep facility view with 10+ tanks smooth.

## 6. Final report (your last message)

Keep it concise:
1. What you built (bullets) and the key files.
2. Exported APIs other lanes/UI should call (signatures).
3. Any `src/types` additions.
4. Requests for the orchestrator (changes to files you don't own), with exact code if small.
5. Known gaps/limitations and test results (commands + pass counts).
6. Screenshot paths you reviewed (if a render/UI lane).
