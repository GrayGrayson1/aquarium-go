# AquariumGo Agent System — Read This First

This directory is the durable memory and operating system for the AquariumGo autonomous build.

## First rule

Do not rely on chat history. Read repository state.

Reviewers don't follow this file: they read only what their prompt lists (`AGENTS.md`, "Reviewer mode").

## Fresh-agent reading order

This is the one canonical order; master §15 and the orchestrator prompt point here.

1. `AGENTS.md` (Claude Code loads it automatically through `CLAUDE.md`)
2. `AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md`
3. `OPERATIONS.md`
4. `STATE.json`
5. `CURRENT_SLICE.md`
6. `HANDOFF.md`
7. `decisions/INDEX.md`, then ADR-0001, ADR-0002 and every ADR the slice or handoff cites
8. `REQUIREMENTS.json`: the entries for the current slice and for `ALL`
9. The last 20 lines of `LEDGER.jsonl`
10. `evidence/<current slice>/manifest.json`, if it exists
11. `design/DESIGN_REGISTRY.json`, then only the design sections the slice cites
12. Repository architecture and lane docs relevant to the touched areas
13. The actual code and tests

Then run `node scripts/agent/check-state.mjs`, write the bootstrap assertion described in `prompts/KICKOFF.md`, and
check it with `node scripts/agent/bootstrap-check.mjs <file>` before editing anything.

Items 1-11 come to roughly 70 KB. Builder and reviewer subagents get a compact pack instead:
`node scripts/agent/context-pack.mjs`.

## Remote-state prohibition

No push, PR, merge, deploy, remote migration, secret mutation, publishing, or app-store action without explicit owner
approval recorded word for word in an ADR. This repo has two live sites (GitHub Pages on a push to `main`, and Render
through its CLI or API); `OPERATIONS.md` §3 lists everything that counts as remote.

## If documentation and code disagree

The code wins for what exists now. The master/design wins for what should be built. Record the mismatch; do not guess.
