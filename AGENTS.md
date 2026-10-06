# Agent instructions: Aquarium Go

This repository is built by AI agents under a written harness. Before anything else, read
`docs/agent/README_FIRST.md` and follow its reading order. If you were started as a **reviewer**, read "Reviewer
mode" below first.

## Rules that always apply

The full rules are in `docs/agent/AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md`, and the procedures in
`docs/agent/OPERATIONS.md`. In short:

- **The repository is the memory.** Don't rely on chat history or another agent's summary. Check Git,
  `docs/agent/STATE.json` and the recorded evidence. Claude auto-memory, CNVS shared memory and compaction
  summaries are hints, not project memory: never record project state or decisions only there, never cite them as
  evidence, and `docs/agent` wins any conflict.
- **Nothing leaves this machine without the owner's explicit yes**, recorded word for word in an ADR. No `git push`
  (of any branch or tag), pull requests, GitHub writes, workflow runs, releases, deploys or publishing. There are
  two live sites: a push to `main` deploys GitHub Pages through GitHub Actions, and may also deploy the Render static
  site, because `render.yaml` sets `autoDeploy: true` (Render also deploys through its CLI, API or dashboard). Local
  branches and local commits are fine.
- **Never commit on `feat/*`.** Work on the integration branch named in `docs/agent/STATE.json`
  (`integrationBranch`): local `main` (ADR-0005 decision 6). A push of `main` deploys, so it still needs the owner's
  recorded yes. A cloud session (claude.ai/code) works on `agent/s0-wip` and pushes only as an owner ADR allows
  (ADR-0007, ADR-0009).
- **Inspect before you edit.** Never invent file paths, APIs or results. A claim that something passes needs
  the command, its exit code and the evidence (`scripts/agent/verify-slice.mjs`, `capture-evidence.mjs`).
- **Don't weaken, skip or delete tests to get green, and don't quietly drop scope.**
- **Keep the simulation deterministic** (`docs/agent/OPERATIONS.md` §11). Simulation randomness comes only from
  `ctx.rng` / `simRng(state)`, a subsystem's own persisted stream (like `staff.rng` and `shows.rng`) or a keyed
  stream seeded from a stable key (`mulberry32(hashString(key))`); never `Math.random`, the wall clock or render
  state. Persistent game state changes only through the store boundary: `useGame.mutate` (player actions from the UI
  and from the render layer's input handlers, and the AI's tutorial hook), `mutateFast` (the game loop, the
  hidden-tab catch-up, the flush before a save and dev commands) and `setGame` (replacing the whole world: loading a
  save, a new game, the showcase and fixture boot, dev tools). The render frame loop never writes game state.
- **No new dependencies** without an ADR and the owner's approval.
- **A builder never approves its own work.** Acceptance needs the current slice's gates plus an independent review.
- **Don't edit the rules that judge you.** Protected files (`docs/agent/PROTECTED.json`) change only through an ADR
  that records the owner's approval word for word and names each owner-only file it lets change, followed by
  `protect.mjs --update` (`docs/agent/OPERATIONS.md` §10); `node scripts/agent/protect.mjs` fails otherwise.
- **Release steps are suspended.** README, CHANGELOG, `vite.config.ts` and the design spec say every deploy bumps the
  version; during the local build keep `package.json` at its current version and put user-facing notes under
  `## Unreleased` in `CHANGELOG.md` (master §3.6).

## Reviewer mode

If your prompt says you are a reviewer (code/architecture, browser QA, security/data, performance, adversarial,
design intake or requirements audit):
- Read only what your prompt lists: the slice contract, the requirement subset, the design excerpt, the diff and the
  evidence paths. Don't read `docs/agent/HANDOFF.md`, `docs/agent/LEDGER.jsonl`, builder reports or commit messages.
- Don't edit, commit or run anything that changes the repo, except writing your one report file at the path your
  prompt gives. End the report with `Verdict: GREEN`, `Verdict: YELLOW` or `Verdict: RED`.

## Where things are

| What | Where |
|---|---|
| Harness state, current slice, handoff, requirements, decisions, evidence | `docs/agent/` |
| Day-to-day procedures (sessions, approvals, transitions, repairs, evidence, reviewers, this machine) | `docs/agent/OPERATIONS.md` |
| Kickoff prompt for every orchestrator session | `docs/agent/prompts/KICKOFF.md` |
| Approved 0.5 design (load only the sections your task cites) | `docs/agent/design/AQUARIUM_GO_0_5_DESIGN_SPEC.md` |
| Which designs are approved or still pending | `docs/agent/design/DESIGN_REGISTRY.json` |
| Orchestrator and reviewer prompts | `docs/agent/prompts/` |
| Harness scripts (state check, ledger, evidence, gates, audits, relaunch) | `scripts/agent/` |
| Deferred work and logged defects | `docs/agent/BACKLOG.md` |
| Code layers and data flow | `docs/ARCHITECTURE.md` |
| File ownership (lanes) | `docs/LANES.md` |
| Test ids | `docs/TEST_IDS.md` |
| Known limitations | `docs/KNOWN_LIMITATIONS.md` |

`docs/LANES.md` was written for the original parallel build. Where it conflicts with the master, the master wins: the
orchestrator makes local commits (§3.4), edits to core-owned files that an approved slice needs are pre-authorized
(§3.8, except the gate-defining files listed there), and `npm ci` is allowed in a fresh worktree.

## Commands

```bash
npm run typecheck   # tsc -b --noEmit (src, tests/sim, tests/e2e and the configs)
npm test            # vitest run: tests/sim and src/**/*.test.ts
npm run build       # tsc -b && vite build
npm run e2e         # playwright test; starts its own Vite server on E2E_PORT (default 4399);
                    # reuses a running one only with E2E_REUSE=1

node scripts/agent/check-state.mjs        # validate state, ledger, requirements, evidence, protected files
node scripts/agent/verify-slice.mjs       # run the slice's gates and record the evidence
node scripts/agent/record-event.mjs ...   # append a ledger event (transitions are checked)
node --test 'scripts/agent/*.test.mjs'    # the harness's own tests
```

Headless Chromium can't start inside Claude Code's sandboxed shell (see `docs/agent/OPERATIONS.md` §8): e2e and
browser QA from such a shell are recorded as not run, never as passed.
