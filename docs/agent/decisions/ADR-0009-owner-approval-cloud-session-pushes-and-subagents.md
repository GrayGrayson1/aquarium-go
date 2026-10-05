# ADR-0009 — Owner approval: cloud-session pushes to `agent/s0-wip`, and builder and reviewer subagents

**Status:** Accepted\
**Date:** 2026-10-05\
**Slice:** S0\
**Requirements:** REL-001, HARNESS-001

## Context

The owner pushed the S0 work to `agent/s0-wip` (ADR-0007) and asked a Claude Code cloud session (claude.ai/code) to
"read docs/agent/HANDOFF.md and continue". That session runs in a cloud container, not on the owner's machine. The
container is reclaimed when the session ends, so a local commit made there is lost unless it is pushed. ADR-0007
approved one push only.

`HANDOFF.md` also notes that the owner once rejected background agents and says to ask before fanning out. Handoff
steps 2-6 touch separate files, and step 8 needs independent reviewer subagents (`CLAUDE.md`, `OPERATIONS.md` §7).

The number ADR-0008 stays reserved for the docs-corrections ADR that ADR-0006 named, so this decision takes ADR-0009.

## Owner's words (verbatim)

Question 1: "ADR-0007 approved only one push. Commits made on this cloud machine are lost when the session ends unless
pushed. May I push my S0 commits to agent/s0-wip during this session? It would never touch main (so nothing deploys),
never force-push, and no tags or PRs."

Owner's answer (selected option): **"Yes, update agent/s0-wip (Recommended)"**, described as: "I push normal
(no-force) updates to agent/s0-wip at checkpoints during this session only and record your words in an ADR. main,
tags, PRs and deploys stay off-limits."

Question 2: "The handoff says you once rejected background agents and to ask before fanning out. Steps 2–6 touch
separate files and could run in parallel, and step 8 requires independent reviewer subagents (the harness won't accept
S0 without them). Which agents may I use?"

Owner's answer (selected option): **"Builders + reviewers (Recommended)"**, described as: "Parallel builder subagents
for steps 2–6, then fresh reviewer subagents for step 8. Fastest; uses more of your usage."

## Decision

1. **Pushes.** For the rest of this cloud session (session id `fb16c5d5-671a-5220-bdec-f4fad52a7de1`), the
   orchestrator may push to the remote branch `agent/s0-wip` with a normal fast-forward `git push origin agent/s0-wip`
   at checkpoints. Not covered: any push to `main` (it deploys GitHub Pages), a force push, a tag push, a push of any
   other branch (including the cloud session's default `claude/eager-euler-0g044p`), pull requests, merges, other
   GitHub writes, workflow runs and Render deploys. The approval ends with this session; a later session needs the
   owner's yes again.
2. **Subagents.** The orchestrator may run builder subagents in parallel for `HANDOFF.md` steps 2-6 and fresh,
   independent reviewer subagents for step 8, following `CLAUDE.md` and `OPERATIONS.md` §7. Subagents never push
   (master §3.4); only the orchestrator pushes, under decision 1.

## Alternatives considered

- Asking before each push: offered, not chosen. Work would be lost if the session ended before an answer.
- No pushes: offered, not chosen. Everything done in the container would be lost.
- Reviewers only, or no subagents: offered, not chosen.

## Consequences

- Work from the cloud session survives on `agent/s0-wip`; the owner's local `main` can fetch it from there.
- `origin/main` is untouched, so nothing deploys.
- `STATE.integrationBranch` stays `main` (ADR-0005 decision 6). In the cloud the work sits on `agent/s0-wip`, so
  `check-state.mjs` warns about the branch; that warning is expected here.

## Verification

- `git log origin/main -1` stays at `0d9fc5a` after every push from this session.
- Every push from this session is a fast-forward of `agent/s0-wip`.

## Owner impact

Yes. These are the owner's own decisions.

## Owner approval

The two answers above, selected by the owner on 2026-10-05 in the top-level cloud session. Scope: as in decisions 1
and 2, for this session only.
