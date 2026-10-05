# ADR-0001 — Owner operating decisions for the autonomous local build

**Status:** Accepted\
**Date:** 2026-10-05\
**Slice:** ALL

## Decision

- Stop automatic implementation after Social stub and hardening.
- Real multiplayer requires an explicit owner gate even if the harness is healthy.
- Push extended automation as far as safely coherent (option C), not merely the v0.5 convenience controls.
- Green mega-slices automatically advance.
- Local commit after each mega-slice; meaningful internal green checkpoint commits are allowed.
- Mandatory fresh context after each mega-slice with complete durable handoff.
- Independent builder/reviewer/QA topology.
- Necessary local edits to core-owned files are pre-authorized within approved scope.
- Delay release version bump until the final locally validated scope is known.
- Preserve no-new-dependencies rule for the current web stack unless separately approved.
- Old save compatibility is best-effort, not mandatory.
- Written source hierarchy follows the Master Source of Truth.
- Auto Water Changer shares the Autofeeder unlock.
- Quiet hours fixed at 22:00–08:00 for this release.
- One-copy Metallic is visual-only/unnamed.
- Locked destinations open locked-state panels.
- Multiple production lines per species.
- Social is local stub first.
- Native wrapping deferred.
- Strict evidence-based anti-hallucination policy.
- Three materially different failed repairs triggers manual inspection.
- One local integration stack is preferred.
- Refactors are allowed only when requirement-driven, tested and recorded.

## Consequence

This ADR is constitutional for the first autonomous build program and supersedes conflicting older planning assumptions.
