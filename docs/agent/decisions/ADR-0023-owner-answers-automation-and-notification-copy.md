# ADR-0023 — Owner answers for chunk 3: "auction ending soon" wording, live births, show results without a prize, the locked Auto-clean row

**Status:** Accepted\
**Date:** 2026-10-11\
**Chunk:** 3 (Automation and notifications)\
**Requirements:** NOTIFY-003, DES-007, DES-009, AUTO-007

## Context

Chunk 3 builds the notifications of 0.5 spec §12 and the Auto-clean row of §10.3. Four pieces of player-visible text
weren't in the design: the wording of the new "auction ending soon" event (added by ADR-0022 decision 5), what the
Breeding notification says for animals that have young without laying eggs (§12.2 has egg templates only), what a
Shows notification says when an entry wins no prize or ribbon, and what the Auto-clean row shows before its unlock
(AUTO-007's note: the design gives only "Buy · $120"). The agent asked them in one batch at the start of the chunk.

## Decisions

1. **"Auction ending soon"**: the log line and toast read `Bidding on "{title}" ends in about {n} hours. Best offer so
   far: {amount} from {buyer}.` (fired once per listing in its last 3 game hours, while it has an open bid; "1 hour"
   when a bid arrives in the last hour). The notification is "Ending soon: {title}" / "Best offer so far: {amount}
   from {buyer}." The 3-hour lead time is the agent's call (PLAN chunk 3 "Decide").
2. **Live births** (livebearers, seahorses, berried shrimp): the Breeding notification reads "{Name} gave birth" /
   "{n} young in {Tank}.", only for births whose in-game toast shows (so a busy guppy tank stays quiet).
3. **Show results without a prize or ribbon**: the same title ("{Show}: {Name} placed {place}"); the body is the event
   log's own results line.
4. **The Auto-clean row before the unlock** (shared with the Autofeeder): the lock icon and the Auto-feed row's hint,
   "Research Better Life Support, or build husbandry mastery with regular care.", instead of "Buy · $120". The same
   question noted the auto-feed-paused log line, `{Tank}: Auto-feed is paused — feed {name} by hand.`, built from the
   alert row's approved text.

## Owner approval

Given by the owner in the chunk 3 Claude Code session, 2026-10-11, through one multiple-choice round.

Question 1 (verbatim): "Chunk 3, the new \"auction ending soon\" event (fires once, 3 game hours before an auction with
open bids closes). What should it say? It shows in the event log and as a toast, and as a system notification when
the game is in another window." Owner's answer (selected option): **"Best offer so far (Recommended)"** ("Log/toast:
Bidding on \"Ember’s Tank\" ends in about 3 hours. Best offer so far: $120 from Coral Reef Co. · Notification:
\"Ending soon: Ember’s Tank\" / \"Best offer so far: $120 from Coral Reef Co.\""). Not chosen: "Short".

Question 2 (verbatim): "The Breeding notification has templates only for eggs (\"{Name} laid eggs\" / \"{n} eggs in
{Tank}.\" and \"{Name}'s eggs hatched\" / \"{n} fry are free-swimming in {Tank}.\"). Livebearers (guppies, mollies),
seahorses and shrimp have young without laying eggs. What should they notify?" Owner's answer (selected option):
**"\"gave birth\" (Recommended)"** ("\"{Name} gave birth\" / \"{n} young in {Tank}.\" (only when the in-game toast
would show, so a busy guppy tank stays quiet)"). Not chosen: "No notification".

Question 3 (verbatim): "The Shows notification (off by default) is \"{Show}: {Name} placed {place}\" / \"{prize} prize ·
{ribbon} ribbon.\" What should it say when an entry wins no prize or ribbon?" Owner's answer (selected option): **"The
results line (Recommended)"** ("Same title; the body is the event log's own results line (e.g. \"…The judge’s cards
explain why.\")."). Not chosen: "Don't notify".

Question 4 (verbatim): "The Auto Water Changer shares the Autofeeder's unlock. Before it's unlocked, what should the
Auto-clean row on the tank card show? (Related: the auto-feed-paused alert also goes in the event log as \"Ember’s
Tank: Auto-feed is paused — feed Ember by hand.\", built from the alert row's approved text.)" Owner's answer (selected
option): **"Same lock hint (Recommended)"** ("Lock icon and \"Research Better Life Support, or build husbandry mastery
with regular care.\", as the Auto-feed row shows, instead of \"Buy · $120\"."). Not chosen: "Buy shown disabled".
