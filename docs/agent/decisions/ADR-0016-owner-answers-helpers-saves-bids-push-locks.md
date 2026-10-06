# ADR-0016 — Owner answers: helpers until S0 is accepted, new species and tank sizes bump the save version, catch-up bid windows, push locks before unattended runs

**Status:** Accepted\
**Date:** 2026-10-06\
**Slice:** S0, and ALL for decisions 2 to 4\
**Requirements:** HARNESS-025, PERSIST-003, PERSIST-007, PERSIST-014, MKT-016, REL-001, HARNESS-002

## Context

`HANDOFF.md` at `9aa89df` raised several questions only the owner can answer:
- The subagent approvals in ADR-0012 and ADR-0013 covered that Cowork session only.
- Three owner questions were open:
  1. a real push guard before unattended runs;
  2. MKT-016's catch-up bid window;
  3. what an older build does with newer content under the same save schema.
- A fourth was open: running unattended sessions as a user without GitHub or Render credentials.

The owner wrote (verbatim): "ask the questions then tell me how we're proceeding". The orchestrator asked four questions
in this top-level session. They are recorded word for word under "Owner approval" (`OPERATIONS.md` §2).

## Decisions

1. **Helpers until S0 is accepted.**
   - Every orchestrator session working on S0 may run builder and reviewer subagents, until S0 is accepted (the
     `ADVERSARIAL_REVIEW → ACCEPT` transition for S0). They follow `CLAUDE.md` and `OPERATIONS.md` §7.
   - A fresh reviewer checks every fix. Subagents never push.
   - S1 and later slices need the owner's answer again.
2. **New species and tank sizes bump the save version.**
   - When a later version adds a species or a tank size (tier), it raises `SCHEMA_VERSION`. An older copy of the game
     then treats that save as `too_new`: it doesn't load it, fall back past it or overwrite it, and it asks the player to
     refresh (PERSIST-003, built in S1 by PERSIST-014).
   - Older builds don't try to keep unknown species or tank tiers inert.
   - ADR-0015 decision 2 stays: well-formed unknown equipment, decor, frag, inventory, research and starter ids are kept
     unchanged.
   - The registry gains a criterion that adding a species or a tank tier bumps `SCHEMA_VERSION`.
   - This answers the PERSIST-003 owner question in `HANDOFF.md`.
3. **Catch-up bid windows stay as they are.**
   - A bid created during the offline catch-up may have less than its full window left on the player's return: at 3×
     about 2.5 real minutes in the worst case, at 10× about 3. The behaviour doesn't change, in S0 or in S2.
   - MKT-016 A2 is corrected to the real minimum.
   - The 3× check in `fix-econ-offline-market-speed.test.ts` may be aligned with that documented minimum. That is a test
     change, so a reviewer checks it: it must assert what the code guarantees, never less.
4. **Push locks before unattended runs.**
   - While the owner starts each session, the written rules stay as they are (ADR-0004 decision 1).
   - Before the first unattended run (`scripts/agent/relaunch.mjs`), the orchestrator asks the owner again about two
     locks:
     - a git lock that refuses pushes to `main`;
     - an OS user for unattended runs with no GitHub or Render login.
   - Agents never install either lock themselves.
   - This answers owner questions 1 and 6 in `HANDOFF.md` for now.

## Alternatives considered

Each was offered and not chosen:
- **Helpers:** asking in every session.
- **Saves:** keeping unknown species and tank tiers inert in older builds.
- **Bids:** a full window counted from the player's return (a market change in S2).
- **Push locks:** the steps written now.

## Consequences

- Sessions working on S0 don't have to ask before using builders or reviewers.
- The registry repair (defect D-S0-3) adds:
  - the `SCHEMA_VERSION` rule for new species and tank tiers, in PERSIST-003 or PERSIST-007 (with PERSIST-014's tests in
    S1);
  - the corrected MKT-016 A2.
- `relaunch.mjs` must not run unattended until the owner has been asked again about the push locks. `HANDOFF.md` carries
  this.

## Owner impact

Yes. These are the owner's own decisions.

## Owner approval

Given 2026-10-06 by the owner in this top-level Cowork session, after they wrote (verbatim): "ask the questions then
tell me how we're proceeding".

Question 1 (verbatim): "Can future sessions use helper AIs for S0 (builders that make fixes, reviewers that check them)
without asking you each time, until S0 is accepted? Your yes today covered only this session."

Owner's answer (selected option): **"Yes, until S0 is accepted (Recommended)"**, described as: "Each S0 session may use
builder and reviewer helpers. A fresh reviewer checks every fix, and helpers never push."

Question 2 (verbatim): "Say a newer version adds a new fish species or tank size, and an older copy of the game is still
open in another tab. What should the old copy do with a save it doesn't fully understand?"

Owner's answer (selected option): **"Treat it as from the future (Recommended)"**, described as: "Each time we add a
species or tank size, the save's version number goes up. The old tab then won't touch that save and asks you to refresh
(built in S1). Simple and safe."

Question 3 (verbatim): "When you come back after time away, the game fast-forwards the time you missed. Bids made during
that fast-forward can run out sooner than their full window after you return: as little as about 2.5 real minutes at 3x
speed. Is that OK?"

Owner's answer (selected option): **"Fine, just document it (Recommended)"**, described as: "Keep how it works today,
and correct the requirement's wording to the real minimum."

Question 4 (verbatim): "Right now only written rules stop an AI from pushing to main, which would update your live site.
Before you ever let sessions run unattended (relaunch.mjs), do you want real locks: git refusing pushes to main, and
unattended runs using a Mac user with no GitHub or Render login? You'd set these up yourself, because agents aren't
allowed to change their own guards."

Owner's answer (selected option): **"Ask before unattended runs (Recommended)"**, described as: "Keep the written rules
while you start each session yourself, and ask again before the first unattended run."

Scope: decision 1 until S0 is accepted; decisions 2 to 4 as written. None of these answers approves a push, PR, deploy
or any other remote action.
