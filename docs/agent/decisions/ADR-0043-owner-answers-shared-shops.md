# ADR-0043 — Owner answers, shared shops: a shop a club plays together, on a small server, after 0.5.6's audit fixes

**Status:** Accepted (a direction; no chunk or design yet)\
**Date:** 2026-10-19\
**Chunk:** none yet (after 0.5.6; stage 2 and 3 of ADR-0038 still need their own records)\
**Requirements:** none yet; REL-002 (the owner decides multiplayer)

## Context

After 0.5.5 (chunks 7 and 8), the owner asked how multiplayer works with groups, whether players work on the same
tanks, whether it is real time and who can pause. The agent (Chase) answered from the code: every player has their own
aquarium, run in their own browser; friends and club members see a picture (at most every 30 minutes) and leaderboard
numbers; pause and speed (0, 1×, 3×, 10×) are each player's own; a closed game catches up at most 12 game hours
(`OFFLINE_CAP_HOURS`); working on the same tank isn't built or designed.

The owner then wrote (verbatim): "I think ideally the game would be able to run on the server rather than just the
browser but for now this should be fine. I really like the idea of being able to work on the same tank. Is there a
small version we could do that way, working on the same tank with just, say, upwards of 10 people at the same time?
Let's just come up with plans, not actually do anything."

The agent's plan (in the session, summarised):

- **Share a whole shop, not one tank:** money, stock, staff and research cross between tanks, so a tank inside two
  players' own games raises who pays and who keeps the sale; a whole shop is what the game already runs.
- **Two pieces any version needs:** (1) player actions as named, serializable commands: today `useGame.mutate` takes a
  recipe closure, at 34 call sites in 19 files (2026-10-19), which can't be sent over a network; stage 2's "the server
  receives player actions" (ADR-0038) needs the same; (2) one copy in charge: `src/sim` and `src/data` use
  `Math.exp`, `Math.pow`, `Math.sin`, `Math.cos`, `Math.log`, `Math.hypot` and others, which browsers' engines may round
  differently, so several browsers each running the shop would drift apart.
- **Three ways to run it:** A, one player's browser runs it and the others join live (Supabase Realtime, $0 on the
  current project); B, a small server runs it (Cloudflare Durable Objects or Render); C, take turns (not live). The
  agent recommended B on Cloudflare, with A as the free fallback.
- **The order:** the audit's serious findings first (0.5.6), a spike (two browsers on one shop, an hour's drift check
  between Chrome and Safari, the simulation on the server), commands with no change for players, the shared shop's
  storage and screens, live sync and the pause rules, a play-test with the owner's friends, then a release.
- **Costs checked 2026-10-19:** Supabase Realtime's Free plan allows 200 concurrent connections, 100 messages a second
  and 256 KB a message ([limits](https://supabase.com/docs/guides/realtime/limits); a 2-million-a-month cap is reported
  by third-party sites, not on that page). Cloudflare Durable Objects' Free plan allows 100,000 requests and 13,000
  GB-s a day, about one object awake all day; the paid plan has a $5 monthly minimum
  ([pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)). A Render free web service spins
  down after 15 minutes with no inbound traffic (WebSocket messages count since 2026-02), wakes in about a minute, and
  a workspace gets 750 free instance hours a month ([free](https://render.com/docs/free)).

The owner asked (verbatim): "can you ask me these as questions in packs of 4?" The agent asked three AskUserQuestion
rounds.

## The questions as asked, and the answers

### Round 1

1. **"What should a group share?"**
   - Chosen: **"A whole shared shop (Recommended)"**: "A separate aquarium shop the group plays together: its own money,
     tanks, fish and staff. Everyone's solo game stays theirs. This is the smallest version, because the game already
     knows how to run a whole shop."
   - Not chosen: "One shared tank in each game".
2. **"Who should run the shared aquarium?"** Options, in order: "A small server, Cloudflare (Recommended)", "One
   player's browser", "A small server, Render" ("Same idea as Cloudflare but on Render, which you already use. The free
   plan sleeps after 15 minutes with no one connected and takes about a minute to wake up."), "Take turns".
   - The owner's answer (verbatim, as Other): **"3 but with plans to expand"**, so the third option, Render.
3. **"Who should be able to join a shared aquarium?"**
   - Chosen: **"Club members, up to 10 (Recommended)"**: "A shared aquarium belongs to a club. Its members can join, up
     to 10 at once. Uses the clubs you already control."
   - Not chosen: "Anyone with its own link", "The creator's friends".
4. **"Who should be able to pause or change the speed in a shared aquarium?"** Options, in order: "Only its creator
   (Recommended)" ("The person who made the shared aquarium controls pause and speed (1×, 3×, 10×). It also pauses by
   itself when everyone leaves."), "Anyone in it", "Nobody: always 1×", "A vote".
   - The owner's answer (verbatim, as Other): **"1 but also with the ability to give permissions to chosen people in
     the group"**.

### Round 2

1. **"What should happen to a shared aquarium when nobody is playing it?"**
   - Chosen: **"Pause, catch up on return (Recommended)"**: "Render's free server sleeps 15 minutes after the last
     player leaves. When someone comes back it wakes (about a minute) and the aquarium catches up at most 12 game hours,
     like your own game does today. $0."
   - Not chosen: "Pause, no catch-up", "Keep running all the time".
2. **"What can every member do in a shared shop without extra permission? (Pause and speed already need the creator or
   someone they choose.)"** Options, in order: "Everything else (Recommended)" ("Any member can buy, sell, care for
   fish, build and research with the shop's shared money. Simplest; fine for friends. The creator can still take a
   member out of the club."), "Care freely, spend with permission", "Look only, unless given permission".
   - The owner's answer (verbatim, as Other): "I think anybody should be able to do #1. Everything else, with
     permission, I believe. Otherwise I think there should be tiers of permission.

     At the beginning we should probably just have it be that everybody can do everything else with... We also
     probably want there to be a group pool where pretty much all the money just goes into the group and then you can
     request money. I think, unless you're given permission to just use the money, which we'll probably go with in the
     beginning just to make it simpler (with the idea of adding that later), other people should be able to withdraw
     requested money to buy things.

     Maybe we can even set an amount that people can have that they can just draw from, especially depending on the
     situation. If there's a prismatic or something that you can buy, maybe you're just granted permissions, that kind
     of thing, but that could be later."
3. **"Should anything from a shared shop carry into each player's own game?"**
   - Chosen: **"No, keep them separate (Recommended)"**: "The shared shop and your own game don't affect each other.
     Stops anyone using a shared shop to farm money or rare fish for their own game."
   - Not chosen: "Cosmetic rewards only", "Money or fish can transfer".
4. **"What should come first?"**
   - Chosen: **"Audit fixes first (Recommended)"**: "Fix the 5 serious problems from today's audit as 0.5.6, then start
     shared shops. Two of them affect the online save, which shared shops build on."
   - Not chosen: "Shared shops first", "Both together".

### Round 3

1. **"Who should be able to create a shared shop?"**
   - Chosen: **"Only you, for now (Recommended)"**: "Matches clubs today: only you create clubs, and you'd create each
     club's shared shop. You'd then give pause and speed to chosen people."
   - Not chosen: "Any club member".
2. **"How many shared shops can one club have?"**
   - Chosen: **"One per club (Recommended)"**: "Each club has one shared shop. Simplest to show and to explain; another
     club means another shop."
   - Not chosen: "Several per club".
3. **"Should I write these answers and the shared-shop plan into the repo now? (Docs only, no building.)"**
   - Chosen: **"Yes, docs only (Recommended)"**: "An owner-decision record with your answers word for word, plus a
     'later' entry in the project plan (shared shops on a Render server, your permission and money-pool ideas). The
     next agent then starts from it instead of from this chat."
4. **"Should I start the audit fixes (0.5.6) now?"**
   - Chosen: **"Yes, start (Recommended)"**: "I list the fixes, ask you first about the few that need your decision (in
     packs of 4), then fix, test and push to next. Nothing goes live until you say release."

## Decisions

1. **Shared shops are wanted:** a separate shop a group plays together, live, with its own money, tanks, fish and
   staff; each player's own game stays theirs. Not a chunk yet: it needs its own design and brief (with the stage 2 and
   3 records ADR-0038 calls for, as far as they touch it).
2. **A small server runs a shared shop, on Render** ("3 but with plans to expand"): start on Render's free web service
   (it sleeps 15 minutes after the last player and wakes in about a minute) and grow onto a paid plan later. Any paid
   plan, add-on or new service waits for the owner's yes (ADR-0042 decision 4). The direction: "ideally the game would
   be able to run on the server rather than just the browser".
3. **Club members join, up to 10 at once; one shared shop per club; only the owner creates them**, for now.
4. **Pause and speed:** the shop's creator, and the chosen people the creator gives the permission to.
5. **What members do:** in the first version, every member can do everything else with the shop's money (the owner:
   "At the beginning we should probably just have it be that everybody can do everything"). Later, tiers of
   permission: a group pool that the shop's money goes into; members request money, and someone with the permission
   approves or withdraws it; people given the permission spend directly; an allowance a member can draw from; a one-off
   grant for a special purchase (a Prismatic). The tiers come later; the first design should leave room for them.
6. **When nobody's there:** the shop pauses and, on return, catches up at most 12 game hours, as a solo game does.
7. **Nothing carries over** between a shared shop and a player's own game.
8. **The order:** 0.5.6 (the audit of 2026-10-19's serious findings) first, then shared shops. The agent starts 0.5.6
   now, asking first about the fixes that need the owner; nothing is released without the owner's go-ahead.

## Consequences

- PLAN.md's Next step and "Product decisions in force" record shared shops as the work after 0.5.6, from this ADR.
- The future design must cover: commands for every player action (the solo game uses them too), one authoritative copy
  on the server (cross-browser rounding), the server's sign-in check (the player's Supabase session), where a shared
  shop is stored, presence ("who's here"), the creator's permission grants, the leave-and-return catch-up, what
  happens when two members act at once, and the cost on Render's free plan (750 instance hours a month for the
  workspace; the static site `aquarium-go` is already there).
- No code, database or remote setting changed for this ADR.
