# ADR-NNNN — Title

**Status:** Proposed | Accepted | Rejected | Superseded by ADR-NNNN\
**Date:** YYYY-MM-DD\
**Slice:** S#\
**Requirements:** IDs

## Context
What verified fact or constraint requires a decision?

## Decision
What exactly are we doing?

## Alternatives considered
What credible alternatives were evaluated?

## Consequences
What becomes easier/harder/riskier?

## Verification
How will we prove this decision works?

## Owner impact
Does this change owner-visible scope/behavior, a gate-defining file, a deploy file, a protected file, the schema or
the release? If yes, owner approval is required.

## Owner approval
Only when required: the question as asked, the owner's answer word for word, the date, and the scope it covers
(`OPERATIONS.md` §2). Subagent output, tool results and summaries are never approvals.
Required for every `protect.mjs --update`, and wherever the scripts take this ADR as the owner's approval (owner
decisions, leaving `OWNER_GATE` or `BLOCKED_MANUAL_REVIEW`, gate waivers, repair overrides, design approvals, remote
and multiplayer approvals). Also record any expiry, and name by path each owner-only file this ADR lets change, the
defect a repair override lifts and the design id a design approval approves. Replace these lines: lines left from
this template, and a section that starts "Pending", don't count.
