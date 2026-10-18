# ADR-0037 — Owner answers, group G and after 0.5: the Water room's limits and rare-variant kinds pinned, 0.5.4, a hardening chunk next, multiplayer first for people the owner knows

**Status:** Accepted\
**Date:** 2026-10-18\
**Chunk:** after 0.5.3 (with ADR-0036's changes, unreleased on `next`)\
**Requirements:** PERSIST-003 (A7, widened); REL-002; BACKLOG B-203, B-190, B-124, B-162, B-130, B-160;
OWNER_QUESTIONS G1

## Context

ADR-0036's three changes were built, reviewed and pushed to `next` (`ce5dcc0`) for 0.5.4, which waited for the owner.
The fresh review of those changes left G1 (B-203) to the owner: beyond ADR-0036's five tables, `repairState` also
resets a Water room prep level above 2 and a reservoir count above 3 (paid upgrades) and drops a rare-variant kind
other than Prismatic, so an older build opened after a rollback would undo them; and the two limits were written out
by hand in `src/persistence/migrations.ts`, so a later build that raised them in `WATER_ROOM` without editing that
file would reset them in the same build.

On 2026-10-18 the owner asked to be asked the open questions again, and asked what multiplayer needs and whether it
can start with a few players and grow from what exists. The agent answered (quoted below) and asked four questions in
one round.

## Decisions

1. **G1:** adding a Water room prep level, raising the reservoir limit or adding a rare-variant kind raises
   `SCHEMA_VERSION`, as ADR-0036's five tables do, with that change's migration, test and docs entry (PERSIST-003 A4).
   - `repairState` reads the limits from `WATER_ROOM` (`src/data/catalog/machines.ts`): the highest prep level is
     `prepRates.length - 1`, the reservoir limit `maxReservoirs`.
   - The rare-variant kinds a save can hold are a table, `RARE_VARIANT_KINDS` in `src/data/rarity.ts` (a record over
     the `RareVariantKind` type, so a kind added to the type without it fails the typecheck); `sanitizeRareVariant`
     drops a kind it doesn't list.
   - `tests/sim/core-save-forward-safety.test.ts` pins them per save format (`LIMITS_AT`, first pinned at v2: 3 prep
     levels, 3 reservoirs, `prismatic`); `tests/sim/persistence-limits-from-tables.test.ts` checks, with both tables
     made bigger, that a save at the new limits loads unchanged and one past them is still repaired. PERSIST-003 A7
     widens to these.
   - B-203's other clause (a crafted save's removed show leaves its entries "entered", never judged, fees kept) is not
     part of G1 and stays open, for the hardening chunk (decision 3).
2. **0.5.4** carries ADR-0036's three changes and G1's, released together: after one full green pass of the four
   checks on the release commit, merged into `main` and published on GitHub Pages and Render. This answer is the
   owner's go-ahead for that release, including Render. As with 0.5.3, it goes out before the owner's play-through: the
   chosen option names one full test pass as its condition.
3. **Next, a hardening chunk (chunk 7), with the multiplayer decision record drafted beside it.** The chunk makes the
   single-player game ready for other players, as the chosen option lists: turn off `?dev=1` on the live site (B-190;
   this changes ADR-0005 decision 2 and ADR-0024 A5, "`?dev=1` as built", for the live site), fix the two money loops
   (B-124, counter-offers past a buyer's ceiling; B-162, admission takings that keep rising with the price), add a
   test that hunts for such loops (B-130) and enforce the research gates in the game's rules, not only its screens
   (B-160). Meanwhile the agent drafts the multiplayer decision record (REL-002's gate: the backend, its cost, what
   gets built first) as **Proposed**, for the owner to approve before any backend, account or cloud-save code. The
   chunk's own choices that players see (how the money-loop fixes change prices and takings, any copy) go to the owner
   before building, as earlier chunks did.
4. **The first players are people the owner knows** (a handful of friends or family). The first multiplayer version
   can trust each player's browser (the server stores what it is sent); the server checks of
   `docs/agent/TRUST_BOUNDARY.md` and the hardening come before it opens to anyone.

## Owner approval

Given by the owner in a Claude Code session on 2026-10-18, in one AskUserQuestion round. The owner's message before it
(verbatim): **"ask me them again and also tell me what we need for multiplayer? is it easy to start small with just a
few players then go bigger with what we currently have?"**

The agent's message before the questions (verbatim):

> ## Multiplayer
>
> **Where we are today.** The game is only files on a web host. There's no server, no database and no accounts, and
> each player's save lives in their own browser.
>
> **What a small first version needs**
> - **A backend:** sign-in, a database and a small server. A hosted service such as Supabase or Firebase would do.
>   Their free plans would probably cover a handful of players, but it's a new dependency and could cost money later,
>   so it's your call.
> - **Hook up the Social screens:** clubs, friends, leaderboards and trade offers are already built. Today they run only
>   in developer mode, on sample data, behind a connection we can swap for a real one.
> - **Cloud saves:** your save stored online, so it follows you to another device.
> - **A decision record you approve:** the project's rules say no backend code gets written until you've signed off on
>   one.
>
> **Can we start small and grow? Yes, and that's the right way to do it.**
> - **With a few people you know,** nobody is trying to cheat. The server can simply store what each browser sends.
>   That's the easiest real step.
> - **The code is ready to grow.** Every player action is one function. The game's rules are plain code that already
>   runs outside the browser, which is how the tests run them. So later, a server could run those same rules to check
>   players without a rewrite.
> - **The big jump comes later:** moving from "trust each player's browser" to "the server decides." That's needed
>   before strangers play together or anyone trades or shares a market. Before that step:
>   - turn off the developer tools anyone can switch on by adding `?dev=1` to the address;
>   - fix the two ways to farm money (pushing a buyer's counter-offer too high, and admission takings that keep rising
>     with the price);
>   - make the game itself enforce the research gates, not just the screens;
>   - move the "while you were away" catch-up onto the server.
> - **Two catches:**
>   - Leaderboard scores from the friends-only stage can't be verified afterwards, so you'd probably reset them when you
>     open up to everyone.
>   - Trading and a shared market haven't been designed yet.
>
> ## Your open questions
>
> The earlier three (the quest wording, the save rule and the "Save now" button) are done. These are the ones still
> open. The VoiceOver check is still yours to do during a play-through.

The questions as asked (verbatim; option label, then its description), and the owner's answers:

1. **"When should 0.5.4 (the quest wording and the Save now change) go out to players?"** (Release)
   - "Bundle with G1 (Recommended)": "Wait for the next question's fix, then run one full test pass and release
     everything together to GitHub Pages and Render. If you pick 'Leave it' below, this is the same as releasing now."
   - "Release now": "One more full test pass, then release 0.5.4 to GitHub Pages and Render. G1, if chosen, comes in a
     later release."
   - "Not yet": "Keep it on the next branch for now."
   - **Answer: "Bundle with G1 (Recommended)".**
2. **"Should water-room upgrades and new kinds of rare animal also count as save-format changes? Otherwise, rolling
   back to an older version could undo paid water-room upgrades or turn a rare animal ordinary."** (Rollbacks)
   - "Count them too (Recommended)": "An older version refuses such a save instead of changing it. The water-room
     limits come from the game's own table, which also stops a future version from resetting upgrades by mistake."
   - "Only fix the limits": "Read the limits from the table, which fixes the future-version mistake. Rollbacks stay
     best-effort."
   - "Leave it": "Change nothing."
   - **Answer: "Count them too (Recommended)".**
3. **"What should I work on next?"** (Next chunk)
   - "Both, hardening first (Recommended)": "Build the hardening chunk (turn off ?dev=1 on the live site, fix the two
     money loops, add a test that hunts for them, enforce research gates in the rules). At the same time I draft the
     multiplayer decision record for you to approve."
   - "Multiplayer record only": "Skip hardening for now, since a few friends won't cheat. I write the decision record
     (backend choice, costs, what gets built first) so we can start sooner."
   - "Hardening only": "Build the hardening chunk and leave multiplayer for later."
   - **Answer: "Both, hardening first (Recommended)".**
4. **"Who would play together first?"** (First players)
   - "People you know (Recommended)": "A handful of friends or family. The server can trust each browser, so the first
     version stays small."
   - "Anyone": "Open to the public from the start. The hardening and the server checks have to come before launch."
   - **Answer: "People you know (Recommended)".**

No notes were added.

## Consequences

- G1 is answered in OWNER_QUESTIONS; F1 (the VoiceOver pass) stays open. B-203 is partly fixed.
- `AGENTS.md` (Saves) and PLAN.md's "Product decisions in force" state the wider rule.
- PLAN.md gains chunk 7's brief (hardening for multiplayer). The multiplayer decision record is a new ADR, Proposed
  until the owner approves it; REL-002 stays the gate.
