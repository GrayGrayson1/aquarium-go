# Agent instructions: Aquarium Go

Start with `PLAN.md`: what we're building, in which chunks, what's done and what's next. The old agent harness was
retired on 2026-10-06 (`docs/agent/decisions/ADR-0018-retire-the-harness.md`); its files are kept, unused, in
`docs/agent/archive/`. Don't follow them.

## Where things are

| What | Where |
|---|---|
| Chunk plan, status, next step, product decisions | `PLAN.md` |
| Approved 0.5 design (load only the sections your chunk needs) | `docs/agent/design/AQUARIUM_GO_0_5_DESIGN_SPEC.md` |
| S3-D design (not approved yet) and its intake note | `docs/agent/design/DESIGN-S3D/` (`SPEC.md`, `INTAKE.md`, `screens/`) |
| Requirements checklist (ids, acceptance criteria, status) | `docs/agent/REQUIREMENTS.json` |
| Known issues and deferred work | `docs/agent/BACKLOG.md`, `docs/KNOWN_LIMITATIONS.md` |
| Owner decisions and design ADRs | `docs/agent/decisions/` |
| Code layers, data flow, the determinism contract | `docs/ARCHITECTURE.md` |
| Test ids | `docs/TEST_IDS.md` |
| File ownership from the original parallel build | `docs/LANES.md` |

## Rules

- **The repo is the memory.** Work from `PLAN.md`, the designs, the decisions and Git, not from chat history or
  another agent's summary. Record decisions and progress in `PLAN.md` (and owner decisions in an ADR).
- **Branches.** Build on `next`. Push `next` when a chunk is done; that deploys nothing. `main` is what players get: a
  push to `main` deploys GitHub Pages (and Render, if its auto-deploy is on). Merge `next` into `main` only after a
  full green test pass, with the release step (bump `version` in `package.json`, add the `CHANGELOG.md` entry), and
  with the owner's go-ahead in the session. Never force-push or rewrite pushed history.
- **Done means tested.** A chunk is done when `npm run typecheck`, `npm test`, `npm run build` and `npm run e2e` all
  pass on the final code, and one fresh reviewer (a subagent that didn't write the code) has read the diff against
  the chunk's brief and its blockers are fixed. Report the commands and their pass or fail lines. Never call a test
  passed that didn't run.
- **Never weaken, skip or delete a test to get green**, and don't quietly drop scope. If a test is wrong (the design
  changed, or the test missed a real case), fix it on purpose and say why in the commit.
- **Deterministic simulation** (the full contract is in `docs/ARCHITECTURE.md`, "Determinism contract"). In
  `src/sim` and `src/data`, randomness comes only from `ctx.rng` / `simRng(state)` (inside a tank step, the step's
  `ctx.rng`, never a second `simRng(state)`), a subsystem's own persisted stream (`staff.rng`, `shows.rng`) or a keyed
  stream (`mulberry32(hashString(key))`). Never `Math.random`, `Date.now`, `performance.now`, `new Date`, `crypto`,
  `Intl` or locale-dependent formatting or sorting there; the only accepted entropy is the new-game seed
  (`src/sim/newGame.ts`) and the id `repairState` gives a save that has none. The guard tests `tests/sim/core-*`
  enforce most of this. A change that adds or reorders draws on an existing stream shifts seeded tests: run them
  before and after and explain each changed expectation; never retune data to hide the shift.
- **The store boundary.** Game state changes only through `useGame.mutate` (player actions from the UI, the render
  layer's input handlers and the AI's tutorial hook), `mutateFast` (the game loop, the hidden-tab catch-up, the flush
  before a save, dev commands) and `setGame` (replacing the whole world). The render frame loop never writes game
  state. A new top-level `src/` folder is a new layer: add it to the layer table in `docs/ARCHITECTURE.md` and in
  `tests/sim/core-architecture-boundaries.test.ts` on purpose.
- **Saves.** New save fields are optional and validated in `repairState` when present; an absent field leaves
  `stateHash` unchanged. Adding a species or a tank size bumps `SCHEMA_VERSION` (ADR-0016). A save written by a newer
  build must never be treated as damaged, loaded past or overwritten (PERSIST-014, chunk 1, finishes this). Old saves
  are best-effort, not required (ADR-0005).
- **Core files** (types, the stores, `world.ts`, persistence, `package.json` scripts, the test configs) may change
  when a chunk needs it; say so in the commit, and the reviewer checks those diffs closely.
- **No new dependencies** without asking the owner.
- **Ask the owner** before anything players see that the designs don't cover (including copy), before pushing
  `main`, and before anything that costs money or changes remote settings.
- **Design sources rank:** the owner's decisions, then the written designs, then the prototype screens, then your
  judgement. For what the code does today, the code wins.

## Commands

```bash
npm run typecheck   # tsc -b --noEmit (src, tests/sim, tests/e2e and the configs)
npm test            # vitest run: tests/sim and src/**/*.test.ts
npm run build       # tsc -b && vite build
npm run e2e         # playwright test; starts its own Vite server on E2E_PORT (default 4399);
                    # reuses a running one only with E2E_REUSE=1
npm run dev         # local dev server on http://127.0.0.1:5173
npm run report:rarity   # morph-catalog entries per rarity tier
```

On the owner's Mac, run the checks from the clone on the internal disk, `~/LocalTest/AquariumGo` (its remote `dev`
is this repo), with `PLAYWRIGHT_BROWSERS_PATH=~/LocalTest/playwright`. The `/Volumes/Dev` disk image is too slow for
e2e. Keep editing and committing in this repo.
