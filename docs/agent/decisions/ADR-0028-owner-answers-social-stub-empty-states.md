# ADR-0028 — Owner answers, group D: the Social stub's empty trades and friends lists

**Status:** Accepted\
**Date:** 2026-10-11\
**Chunk:** before 6 (`docs/agent/OWNER_QUESTIONS.md` group D)\
**Requirements:** SOC-010

## Context

0.5 §13.4 words only the empty clubs card ("No club yet" · "Clubs share show dates, trades and advice."). SOC-010's
third criterion needs empty states for the trades and friends lists too. The session that asked groups B and C asked
D1 in one AskUserQuestion round.

## Decision

The Social stub's empty lists read **"No trades yet" · "Trades you start or accept appear here."** and **"No friends
yet" · "Friends you add appear here."**, in the style of "No club yet" (a title, then one plain line).

## Owner approval

Given by the owner in a Claude Code session on 2026-10-11, in one multiple-choice round. The questions are quoted as
asked; each option's label is followed by its description in brackets. The owner added no notes.

Question D1 (verbatim): "D1. The Social stub's overview (0.5 §13.4) words only the empty clubs card: \"No club yet\" ·
\"Clubs share show dates, trades and advice.\" The trades and friends lists need empty states too (SOC-010). Proposed:
\"No trades yet\" · \"Trades you start or accept appear here.\" and \"No friends yet\" · \"Friends you add appear
here.\"" Owner's answer (selected option): **"Approve wording (Recommended)"** ("Use these two empty states, in the
same style as \"No club yet\" (a title, then one plain line)."). Not chosen: "Different wording" ("Say in the notes how
they should read.").

Question (verbatim): "That's group D. Go on to group E (12 backlog rows that block no chunk, plus closing three
retired-harness rows: 4 rounds)?" Owner's answer: **"Go on to group E"** ("I record D1 and push next, then ask group E.
Then I build chunk 4."). Not chosen: "Stop here for now" ("I record D1, push next and start chunk 4 (Production lines).
Group E waits for another time.").

## Consequences

- Chunk 6 has its copy (PLAN.md's "Decide" line is settled); it still comes after chunks 4 and 5.
