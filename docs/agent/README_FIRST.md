# AquariumGo Agent System — Read This First

This directory is the durable memory and operating system for the AquariumGo autonomous build.

## First rule

Do not rely on chat history. Read repository state.

## Fresh-agent reading order

1. `AQUARIUMGO_MASTER_SOURCE_OF_TRUTH.md`
2. `STATE.json`
3. `CURRENT_SLICE.md`
4. `HANDOFF.md`
5. ADRs referenced by the current slice/handoff
6. Relevant sections of `design/AQUARIUM_GO_0_5_DESIGN_SPEC.md`
7. Relevant repo architecture/lane docs
8. Actual code and tests

## Remote-state prohibition

No push, PR, merge, deploy, remote migration, secret mutation, publishing, or app-store action without explicit owner approval.

## If documentation and code disagree

The code wins for what exists now. The master/design wins for what should be built. Record the mismatch; do not guess.
