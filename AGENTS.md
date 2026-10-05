# Agent instructions: Aquarium Go

This repository is built by AI agents under a written harness. Before anything else, read
`docs/agent/README_FIRST.md` and follow its reading order: master, state, current slice, handoff.

## Rules that always apply

The full rules are in `docs/agent/AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md`. In short:

- **The repository is the memory.** Don't rely on chat history or another agent's summary. Check Git,
  `docs/agent/STATE.json` and the recorded evidence.
- **Nothing leaves this machine without the owner's explicit yes.** No `git push`, pull requests, remote
  merges, releases, deploys or publishing. A push to `main` deploys the live site through GitHub Actions.
  Local branches and local commits are fine.
- **Inspect before you edit.** Never invent file paths, APIs or results. A claim that something passes needs
  the command, its exit code and the evidence.
- **Don't weaken, skip or delete tests to get green, and don't quietly drop scope.**
- **Keep the simulation deterministic.** Simulation randomness comes only from `ctx.rng` / `simRng(state)`, and
  game state changes only through `useGame.mutate`. Rendering never mutates game state.
- **No new dependencies** without an ADR and the owner's approval.
- **A builder never approves its own work.** Acceptance needs the current slice's gates plus an independent review.

## Where things are

| What | Where |
|---|---|
| Harness state, current slice, handoff, requirements, decisions | `docs/agent/` |
| Approved 0.5 design (load only the sections your task cites) | `docs/agent/design/AQUARIUM_GO_0_5_DESIGN_SPEC.md` |
| Orchestrator and reviewer prompts | `docs/agent/prompts/` |
| Code layers and data flow | `docs/ARCHITECTURE.md` |
| File ownership (lanes) | `docs/LANES.md` |
| Test ids | `docs/TEST_IDS.md` |
| Known limitations | `docs/KNOWN_LIMITATIONS.md` |

`docs/LANES.md` was written for the original parallel build. Where it conflicts with the master, the master
wins: the orchestrator makes local commits (§3.4), and edits to core-owned files that an approved slice
needs are pre-authorized (§3.8).

## Commands

```bash
npm run typecheck   # tsc -b --noEmit
npm test            # vitest run: tests/sim and src/**/*.test.ts
npm run build       # tsc -b && vite build
npm run e2e         # playwright test; starts its own Vite server
```
