# Aquarium Go

A living-aquarium tycoon. Choose one remarkable creature (an axolotl, betta, pea puffer, ocellaris clownfish or lined seahorse), learn its personality, and build a beautiful habitat around it. From there you breed distinctive individuals, sell animals or whole aquariums to bidding buyers, and open to paying visitors as a hobby room grows into a grand hall of 1,000-gallon displays. Along the way you can enter your best animals and aquascapes in shows, from the local club to international championships. You can also hire aquarists, a stock manager and docents, propagate coral frags and plant cuttings, and open a brackish estuary chapter with archerfish that spit at flies.

Everything you see and hear is generated in code: procedural creatures, plants, rocks, water, glass and light, plus synthesized sound. The game needs no network connection at runtime.

**Play it online:** https://graygrayson1.github.io/aquarium-go/ (built and deployed by GitHub Actions on every push to `main`).

## Run it

Requirements: Node 20+ (tested with Node 22) and a WebGL2-capable browser (Chrome, Edge, Safari 17+ or Firefox).

```bash
npm install
npm run dev          # http://127.0.0.1:5173
```

Production build and preview:

```bash
npm start            # builds, then serves http://127.0.0.1:4173
```

## Controls

- **Click or tap the glass:** bold animals come over to look and shy ones hide. Tapping repeatedly stresses them, so be gentle.
- **Drag:** orbit the tank or pan the facility. Scroll or pinch to zoom.
- **Click a creature:** open its profile card. Double-click it to follow it with the camera.
- **Feed tool:** pick a food, then click where to drop it (floating foods land at the surface). **Target feed:** click an axolotl or seahorse to feed it directly.
- **Creature card:** the Feed row target-feeds that animal with a food it eats.
- **Bottom dock:** Tanks, Livestock, Market, Visitors (and Staff), Shows, Build, Research, Finances, Encyclopedia, Settings.
- **Watch mode** hides the whole HUD. **Photo mode** captures a frame. **Party mode** makes the lighting react to music; it is purely cosmetic.

## Tests

```bash
npm test             # Vitest simulation suite (water, compatibility, genetics, breeding, market, visitors, saves…)
npm run e2e          # Playwright end-to-end (starts its own dev server on :4399)
npm run typecheck
npm run qa:motion    # creature-vibration scan (DRAWN=1 for the drawn, pose-filtered transform)
```

Visual QA screenshots: start a dev or preview server, then run `npm run qa:shots -- http://127.0.0.1:5173`. The images land in `screenshots/`.

For the most stable e2e run, test a production build: `npx vite build && npx vite preview --host 127.0.0.1 --port 4399 --strictPort`, then `E2E_PORT=4399 npm run e2e` in a second terminal.

Regenerate the species research ledger after editing species data: `npm run docs:research`.

## Developer tools

- `?dev=1` enables the in-game dev panel: add money, unlock everything, spawn species, age creatures, force breeding, set water parameters, advance time, and inspect AI state and compatibility reasons.
- `?showcase=<axolotl|betta|pea_puffer|ocellaris_clownfish|lined_seahorse>` jumps straight into a starter tank. `?fixture=<name>` loads any registered dev fixture, and `&view=facility` opens the room view.
- `window.__AQ` in the browser console exposes the stores and dev commands.

## Project docs

- `docs/ARCHITECTURE.md`: engine decision, layering, time model, simulation LOD, coordinate conventions.
- `docs/GAME_DESIGN.md`: design pillars, loops, systems.
- `docs/RESEARCH_SOURCES.md`: species research ledger (sources, facts used, confidence, conflicts).
- `docs/ASSET_LEDGER.md`: fonts, icons, code snippets and their licences (there are no external art or audio files).
- `docs/BUILD_LOG.md`: how the game was built.
- `docs/KNOWN_LIMITATIONS.md`: what is simplified or missing.
- `docs/LANES.md` / `docs/TEST_IDS.md`: the parallel-build handbook and the UI test-id contract.
