# ADR-0057: The Collection, rare-hatch reveals and "What next?" (chunk 21)

- **Date:** 2026-11-24
- **Status:** Accepted (the owner's request); the defaults below are open in OWNER_QUESTIONS group N
- **Owner decision:** Yes

## Context

After 0.10.0 the owner asked what would make the game more fun to come back to. Of the ideas offered he chose three
to build now and asked for the rest to be kept in a document.

The owner, 2026-11-24, verbatim:

> "Go ahead and do the research for number one and get it completely implemented. Put the other two as ideas to look
> at later in some kind of documents that we can look at later, something that doesn't just get lost in the jumble.
> For the first idea, the fish decks, go ahead and build it out completely. Use Opus 5.5 agents. [...] I also like
> the reveal moments for rare hatches. I like that the next best thing to do button would be good. You can build all
> those right now and then put the rest that we aren't building at the moment into idea documents for later to look
> at. Let's do that: get it all built out."

## Decision

1. Build the Collection (an Encyclopedia tab), rare-hatch reveals and "What next?" as chunk 21.
2. Ideas liked but not built live in `docs/agent/IDEAS.md`.
3. The designs don't cover these features, so every player-facing line is listed in
   `docs/agent/design/CHUNK-21/WORDS.md` for the owner, and each rule the builders or the lead chose without him is a
   default he can change: OWNER_QUESTIONS group N says what the game does today for each.

## Defaults taken (group N has the alternatives)

- **The percentage:** every species counts the same; half for finding it, half for the share of its morphs seen; a
  species with no named colour morphs counts in full once found; named strains and Prismatic finds are shown beside
  it, not counted. Legendary morphs count.
- **Reveals:** a Prismatic animal and the first of a named strain always; a new morph alone only at the legendary
  tier, at most one a species a game day. The first build revealed every new morph of tier rare or above, and the
  review measured a card after about two broods in three; with this rule it is about one in eight for bettas from
  market pairs and about one in forty for guppies and platies. Bought finds, and finds made while a save is opened
  from the title, get no card. In a shared shop every member sees the card.
- **"What next?":** the order in the changelog; something optional is suggested only when it costs at most half of
  what the player can spend; while the guide runs only danger, the guide's step and hungry animals are listed, and
  with Guide hints off the guide is left out; the N key; on an upright phone the button floats at the right edge.

## Consequences

- A new optional save field, `progress.discoveredAt` (a discovery's key to its game hour), validated in
  `repairState`, absent leaves `stateHash` unchanged, no `SCHEMA_VERSION` bump, no new random draws. Keys the build
  does not recognise are kept (a later build may add kinds of discovery).
- `src/types` and `src/sim` changed, so the shared build hash changes: Pages and the shop server go out together.
- No new dependency, no migration, no change to an existing rule or to balance.
