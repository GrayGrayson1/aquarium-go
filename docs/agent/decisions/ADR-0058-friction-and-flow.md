# ADR-0058: Player friction and flow, with no change to what anything does (chunk 22)

- **Date:** 2026-11-25
- **Status:** Accepted (the owner's request); the new wording waits for his reading
- **Owner decision:** Yes

## Context

0.11.0 was released on 2026-11-24. The game grew chunk by chunk, each feature built on the last, without one plan
for how the whole would fit together. The owner asked for a pass over the flow and structure as they stand.

The owner, 2026-11-25, verbatim:

> "To do a deep dive into what we're looking for is to have immediate improvements on what the current flow and
> structure is. We've kind of built this from the ground up without a huge idea in mind of what we're going to be
> ending up as, without massively overhauling how everything works and operates. Find immediate improvements that
> wouldn't change any of the functions or break anything and add them to the game.
>
> As far as the friction of the player, if there's anything that would be friction for the player, we need to
> resolve that. Make sense? Go ahead and do that."

## Decision

1. Chunk 22 plays the game as a player would, on a phone (upright and sideways) and a computer, from a new game to
   a late-game shop and a shared shop, and writes down where the flow makes a player stop, hunt, guess, repeat or
   wait. The findings are kept outside the repo, in `/Volumes/Dev/Projects/AquariumGo-captain1/`.
2. It builds the immediate ones: small, safe, clearly better. In scope: navigation and layout, ordering and
   grouping, links between screens, defaults, shortcuts, clearer labels and empty states, fewer steps for a common
   action, feedback after an action, consistency between panels.
3. It changes no function: no simulation rule, balance, price, timing or genetics; nothing a command does; no new
   system, dependency, save field or schema version. `src/sim`, `src/data` and `src/types` are left alone, so the
   shared build hash stays the same and the release needs only the game's pages, not the shop server.
4. A finding bigger than an immediate fix goes to `docs/agent/IDEAS.md`; one that is the owner's to decide goes to
   `docs/agent/OWNER_QUESTIONS.md`; a small one left unbuilt goes to `docs/agent/BACKLOG.md`.
5. The designs don't cover new text, so every line added or changed is in `docs/agent/design/CHUNK-22/WORDS.md`
   for the owner to read. He can change any of them.
6. `main` is pushed and Render is deployed only at the owner's go-ahead in the session.

## Consequences

- PLAN.md chunk 22 has what was found, what was built and what was left.
- No migration, no new dependency, no change to saves.
