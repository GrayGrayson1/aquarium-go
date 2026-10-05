# ADR-0006 — Owner answers, round 4 (backup folder, publishing docs/agent, go-ahead for the handoff steps)

**Status:** Accepted\
**Date:** 2026-10-05\
**Slice:** ALL\
**Requirements:** HARNESS-008

## Context

`HANDOFF.md` left two owner questions open: which folder the checkpoint backups go to (ADR-0005 decision 7), and
whether `docs/agent` should be public once the repo is pushed. The owner answered both in a top-level Claude Code
session, and in the same message asked the orchestrator to run the handoff's next steps.

## Owner's answer (verbatim)

"just put it on my dev drive in a backup projects made folder we can decide on public as we get closer. so just run
"where the next session starts" then after do the after that comes your part?"

## Decisions

1. **Backup folder.** After each accepted checkpoint the orchestrator writes and verifies a git bundle in
   `/Volumes/Dev/Backup Projects/AquariumGo/`, creating the folder with the first bundle (HARNESS-008). This folder
   is on the same Crucial X9 drive as the repository, so it protects against a damaged or rewritten repository, not
   against losing or breaking the drive.
2. **Publishing `docs/agent`.** Deferred by the owner until a push is closer. Until then, nothing changes: nothing is
   pushed.
3. **Go-ahead.** The owner authorized running `HANDOFF.md` next steps 1-8 and then step 9 (design intake, e2e from the
   Claude desktop app, the fresh-session bootstrap check, owner review, S0 acceptance and the backup bundle). This
   doesn't authorize any push, PR or deploy.

## Consequences

- HARNESS-008 names the folder above. `scripts/agent` has no backup step yet; the checkpoint procedure in
  `OPERATIONS.md` must add it (`git bundle create` then `git bundle verify`).
- The corrections ADR that `HANDOFF.md` step 3 called "ADR-0006" becomes ADR-0007.

## Owner approval

The owner's words above, given 2026-10-05 in the top-level session.

## Owner impact

Yes. These are the owner's own decisions.
