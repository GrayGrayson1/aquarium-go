# ADR-0045 — Owner answers, shared shops' design: a server key the owner adds, `ws`, a 2 GB data cap and a 400-hour cap, "there" means open and active, a new-game start, your own game waits, activity in the alerts, first one wins, the words, small shared photos

**Status:** Accepted\
**Date:** 2026-10-20\
**Chunk:** none yet (the design, `docs/agent/design/SHARED-SHOPS.md`, plans chunks 10 to 13)\
**Requirements:** REL-002 (the owner decides multiplayer); CONST-001 (dependencies); ADR-0043

## Context

After 0.5.6 the owner asked (verbatim): "what do we need in order to expand on the multiplayer experience? it would be
neat to work on the same aquarium at the same time with my daughter. I think we were working on that with render?" The
agent (Chase) answered from ADR-0043: nothing built yet; the order of work (a design and questions, a quick test on a
free Render server, player actions as commands, the server, the screens, tests and a play-test); what it needs from
the owner (a yes before creating a new free Render web service; Render's 750 free instance hours a month are shared
with DAS-Games' `dascade`; an account for the owner's daughter; the design answers). The owner (verbatim): "yes,
start with the design and questions".

While reading for the design the agent found two facts that shape it (checked 2026-10-20):
- **Render's Hobby workspace includes 5 GB of outbound bandwidth a month**, for the whole workspace (the static site
  `aquarium-go` and `dascade` too); WebSocket messages a server sends count. Past it, Render bills $0.15 a GB when a
  payment method is on file, or spins the workspace's services down until the next month when none is
  ([outbound bandwidth](https://render.com/docs/outbound-bandwidth)). A free web service has 0.1 CPU and 512 MB
  ([compute plans](https://render.com/docs/compute-plans)), spins down after 15 minutes without inbound traffic
  (WebSocket messages count), wakes in about a minute, may restart at any time and has no persistent disk
  ([free](https://render.com/docs/free)).
- **Streaming the shop's changes would use too much of that.** A probe on 2026-10-20 (`scripts/_audit/shared/`,
  git-excluded) stepped the dev fixtures as a server would, 4 ticks a second, and measured the changes per second, gzipped:
  a 30-day playthrough (3 tanks, 26 animals; 221 KB, 38 KB gzipped) 2.1 KB/s at 1× and 9.2 KB/s at 10×;
  `big_facility` (15 tanks, 337 animals; 608 KB, 123 KB gzipped) 36.8 KB/s at 1× and 75.7 KB/s at 10×. So the
  design keeps every browser in step by sending only the steps and the actions (SHARED-SHOPS.md §3).

Then four AskUserQuestion rounds of four: two on the design's choices, one on its words, and one on what the
design's review left to the owner.

## The questions as asked, and the answers

### Round 1 (the set-up the first test needs)

1. **"The shared-shop server has to save each shop to the game's database. How should it be allowed to do that?"**
   (Server key)
   - Chosen: **"You add a key to Render (Recommended)"**: "Only the server can save a shared shop. You make a separate
     Supabase secret key just for it and paste it into Render's settings: about 2 minutes, I walk you through it and
     never see the key. You can switch that key off any time. Free."
   - Not chosen: "Use the players' sign-ins" ("No key to set up: the server saves with a signed-in member's account.
     Simpler, but a member who knew how could change the shop's save directly, like editing a save file.").
2. **"The server keeps a live connection open to each player's browser. May I add one small library for that, called
   ws?"** (Library)
   - Chosen: **"Add ws (Recommended)"**: "Widely used, with no packages of its own. Only the server uses it; the game
     players download doesn't change. Free."
   - Not chosen: "No new library" ("I build the connection from what Node and browsers already have: a stream from the
     server, plus one request per action. More code of ours to write and test.").
3. **"Render's free plan includes 5 GB of outgoing data a month for your whole Render account, shared with DAS-Games
   and the game's Render site. Before testing, I estimate two people playing a shared shop use about 2–5 MB an hour.
   Should shared shops have a monthly cap?"** (Data cap)
   - Chosen: **"Cap at 2 GB a month (Recommended)"**: "That's several hundred hours of play for two people. At the
     cap, shared shops close until the 1st and say why, so DAS-Games and the game's Render site keep their share and
     nothing gets charged. You'd see the month's use on the club's shared-shop card."
   - Not chosen: "Cap at 1 GB a month" ("Same, with more room left for DAS-Games and the site."), "No cap" ("Shared
     shops use the free 5 GB like everything else. If the account goes over, Render charges $0.15 a GB if a card is on
     file; if not, it switches off every Render service you have until the 1st.").
4. **"A shared shop pauses when nobody's there. When does a player count as \"there\"?"** (Who's there)
   - Chosen: **"Open and active (Recommended)"**: "You count while the shared shop is on your screen. A tab in the
     background, or 30 minutes with no clicks (after a \"Still here?\" prompt), counts as gone. With nobody there it
     pauses, and the free server sleeps 15 minutes later."
   - Not chosen: "Open at all" ("Any open tab counts, even in the background. A forgotten tab keeps the shop running
     and the server awake, which uses up free hours that DAS-Games shares."), "Only with a pause-holder" ("The shop
     runs only while you, or someone you've given pause rights, is there. Others can still visit and help, but time
     stands still.").

### Round 2 (how sharing plays)

1. **"How should a new shared shop start?"** (Start)
   - Chosen: **"Like a new game (Recommended)"**: "You name the shop and pick the starter animal, with the normal
     starting money. No guide steps: the guide teaches one player, and in a shared shop it would pop up for everyone."
   - Not chosen: "New game, with the guide" ("The same, with the guide's steps on for whoever is there."), "More
     starting money" ("Like a new game, but with about twice the starting money, since several people share it.").
2. **"What happens to your own aquarium while you're in the shared shop?"** (Your game)
   - Chosen: **"It waits for you (Recommended)"**: "Your own game saves and pauses when you open the shared shop, and
     picks up exactly where it was when you go back. No catch-up for the time you were away."
   - Not chosen: "It runs as if closed" ("When you go back it catches up, up to 12 game hours, the same as after
     closing the game today.").
3. **"How should you see what the others in the shop are doing?"** (Activity)
   - Chosen: **"Alerts, plus pop-ups (Recommended)"**: "Everyone's actions go in the alerts list, for example \"Sam
     sold the clownfish pair for $240.\" Big ones (a sale, a purchase over $100, a pause or a speed change) also pop up
     briefly."
   - Not chosen: "Alerts list only" ("Actions go in the alerts list; nothing pops up."), "Don't show" ("You only see
     the results: the fish has moved, the money changed.").
4. **"What if two people act on the same thing at once, like both selling the same fish?"** (Same time)
   - Chosen: **"First one wins (Recommended)"**: "The server takes actions in the order they arrive. The second person
     sees why theirs didn't work, for example \"Sam already sold that fish.\""
   - Not chosen: "Lock what's being edited" ("While someone has a tank's decor editor or a fish's card open, the others
     see \"Sam is editing\" and can't change it. More to build.").

No notes were added.

### Round 3 (the words, SHARED-SHOPS.md §8)

1. **"Where should a shared shop open from?"** (Open from)
   - Chosen: **"Club card, plus title (Recommended)"**: "Open it from your club's card in Social. After you've been in
     once on a device, the title screen also shows \"Shared shop: {name}\" under Continue, so next time it's one click."
   - Not chosen: "Club card only" ("Only from the club's card in Social, inside a game. The title screen stays as it
     is.").
2. **"Approve the wording for the shared-shop screens? Names, days, amounts and dates fill in from the game."**
   (Wording)
   - Chosen: **"Approve this wording (Recommended)"**: "The strings in the preview, used as written." The preview,
     verbatim:

     ```
     CLUB CARD (Social › Clubs)
       You, no shop yet:  Shared shop
         Play one aquarium together, live, with up
         to 10 club members.   [Create shared shop]
       Member, no shop:   No shared shop yet.
       A shop:            Reef Friends · Day 12 · $1,240
                          [Open shared shop]
       Your meter:        This month: 120 MB of 2 GB
                          · server awake 9 h

     CREATING: the new-game naming and starter
     screens, titled "New shared shop", then
       Your club can open it from Social.

     OPENING
       Saving your aquarium…
       Waking the shared shop… This takes about a
       minute when nobody's been in for a while.
       Catching up on the time nobody was here…
     FIRST TIME IN
       Your own aquarium is saved and waits for
       you. Everything here is shared with
       CalliClub.   [Got it]

     TOP BAR
       Shared · Reef Friends · Here: Brian, Sam
       [Back to my aquarium]
       Pause/speed, not allowed: Only Brian and the
       people they choose can pause or change the
       speed.
     OWNER'S LIST: each person there, with a
       switch "Can pause and change speed"

     OTHERS' ACTIONS
       Sam paused the shop.
       Sam set the speed to 3×.
       Sam: Sold the clownfish pair for $240.
       Sam already sold that fish.

     STILL HERE? The shared shop pauses when
       nobody's playing.   [I'm here]

     WHEN IT CLOSES
       Shared shops have used this month's free
       data (2 GB). They open again on November 1.
       The shared shop is full (10 people). Try
       again soon.
       A new version of Aquarium Go is out. Reload
       to join the shared shop.   [Reload]
       You're no longer in CalliClub, so you can't
       open its shared shop.
       You opened this shared shop in another tab.
       The shared shop hit a problem and stopped.
       It's saved as of 4:12 PM.
       The shared shop's server restarted, so it
       went back to its last save (2 minutes ago).
       Lost the connection to the shared shop.
       Reconnecting…
       Catching up with the shared shop…
     ```
   - Not chosen: "Change some".
3. **"How should others' actions read in the alerts list?"** (Activity)
   - Chosen: **"Name, then the message (Recommended)"**: "The game's usual message for that action, with the person's
     name in front: \"Sam: Bought 3 neon tetras for $36.\" Works for every action at once, including new ones later."
   - Not chosen: "Reworded per action" ("A sentence written for each action: \"Sam bought 3 neon tetras for $36.\" Reads
     more naturally, but about 70 actions need their own wording, for you to approve.").
4. **"Should a shared shop appear on the club's leaderboards?"** (Leaderboard)
   - Chosen: **"No, keep it separate (Recommended)"**: "Leaderboards stay about each player's own aquarium, which
     matches \"nothing carries over\". The shop's day and money show on the club card instead."
   - Not chosen: "Yes, as its own entry" ("The shop shows on the club's leaderboards under its own name, beside the
     members.").

### Round 4 (from the design's review)

A fresh reviewer (Opus at max effort) read the design against the code, with probes, and found two blockers: browsers
and Node round `Math.exp`, `Math.pow` and the other transcendental functions differently (Node 22 and Chromium 153
differ in about 10% of `exp` and `pow` results; the agent re-ran the probe and saw the same), so every copy fell out of
step within seconds, while with those functions written in plain arithmetic Node, Chromium and WebKit matched at every
fingerprint on six fixtures (re-run by the agent on two); and a joiner didn't learn which tanks run in full detail.
Both are fixed in the design. Four of its findings were the owner's to decide:

1. **"A listing photo is large (about 100 KB). In a shared shop every photo would go to every member and into every
   save, and photos barely compress. What should shared shops do?"** (Photos)
   - Options, in order: "No listing photos (Recommended)" ("The Take photo step is hidden in shared shops. A photo
     makes buyers a little keener, so shared listings sell like listings without one. Keeps joining fast and the data
     use small."), "Photo flag only" ("You can still take a photo and the listing gets its boost, but the picture stays
     on your device. The others see \"Photo by Sam\" instead."), "Smaller photos for all" ("Photos shrunk to about a
     sixth of the size and shared with everyone. Uses noticeably more of the 2 GB, and joining gets slower as listings
     pile up.").
   - The owner's answer (verbatim, as Other): **"we'll want to list photos. just make it visible and small"**.
2. **"When a shared shop has been empty under 5 minutes (a quick break), should it just carry on with no catch-up?"**
   (Short break)
   - Chosen: **"Yes, short breaks don't count (Recommended)"**: "Under 5 minutes empty, it resumes where it was, as
     your own game does when you switch tabs briefly. Longer, it catches up at most 12 game hours."
   - Not chosen: "Always catch up" ("Any empty time counts, as when you close and reopen your own game: even a 1-minute
     break moves it ahead up to 6 game hours.").
3. **"Render gives 750 free server hours a month for your whole account, and DAS-Games' server uses the same hours.
   The shared-shop server is awake only while someone's playing, plus 15 minutes. Should shared shops have a monthly
   hours cap too?"** (Hours cap)
   - Options, in order: "Cap at 400 hours (Recommended)" ("Leaves at least 350 hours for DAS-Games. At the cap, shared
     shops close until the 1st: \"Shared shops have used this month's free server hours. They open again on November
     1.\" Your club card shows the hours used."), "No hours cap" ("Your card shows the hours. If the account ran out,
     Render would switch off both free servers, DAS-Games' too, until the 1st; both game websites keep working.").
   - The owner's answer (verbatim, as Other): **"cap at 400 for now"**.
4. **"The review found three more situations that need a message. Approve these lines?"** (More lines)
   - Chosen: **"Approve these lines (Recommended)"**: "The three messages in the preview, used as written." The
     preview, verbatim:

     ```
     WHEN THE SERVER IS BEING UPDATED
       The shared shop is updating. Try again in a
       few minutes.

     WHEN YOUR GAME KEEPS FALLING OUT OF STEP
     (after a few tries, instead of re-loading
     the shop forever)
       Your game keeps falling out of step with
       the shared shop, so it stopped. Reload to
       try again.   [Reload]

     A SLOW DEVICE AT HIGH SPEED
       Your device can't keep up with the shared
       shop at this speed, so it keeps catching
       up. Someone who can change the speed could
       slow it down.
     ```
   - Not chosen: "Change some".

## Decisions

1. **The server saves with its own key, which the owner adds.** The owner creates a separate Supabase secret key for the
   shared-shop server and pastes it into the Render service's environment; the agent never sees, prints or saves it.
   Only the server writes shared shops; the browser still touches no table.
2. **`ws` is approved as a dependency** (CONST-001: this record holds the owner's approval), for the server only, at
   an exact version (8.22.0, published 2026-09-26, no dependencies of its own, was the latest on 2026-10-20). It is
   installed with the first server code (chunk 10's test server), and `core-dependencies`' list changes then, citing
   this record. No other
   package comes with it: the server declares the few `ws` types it uses itself (no `@types/ws`).
3. **Shared shops have a 2 GB monthly data cap.** The server counts what it sends (to browsers and to the database),
   with a margin for the network's overhead; at the cap, shared shops close until the 1st of the next month and say
   why. The owner sees the month's use on the club's shared-shop card.
4. **"There" means open and active:** a player counts while the shared shop is on their screen; a hidden tab, or 30
   minutes without input after a "Still here?" prompt, counts as gone. With nobody there the shop pauses and catches
   up at most 12 game hours on return (ADR-0043 decision 6).
5. **A new shared shop starts like a new game:** the owner names it and picks the starter animal; normal starting
   money; no guide steps.
6. **Your own aquarium waits:** opening a shared shop saves your own game first; going back resumes it exactly where it
   was, with no catch-up for the time spent in the shared shop.
7. **Activity:** every member's action goes in everyone's alerts list, with the person's name; big ones (a sale, a
   purchase over $100, a pause or a speed change) also pop up briefly for the others.
8. **First one wins:** the server applies actions in the order they arrive; an action that no longer works tells its
   sender why, naming who changed it when another member just did.
9. **Shared shops open from the club's card in Social**, and from the title screen ("Shared shop: {name}" under
   Continue) on a device that has opened one before.
10. **The screens' words are approved as previewed** (round 3, question 2, and round 4, question 4), with names,
    days, amounts, clubs and dates filled in from the game.
11. **Others' actions read as the game's own message with the person's name in front** ("Sam: Bought 3 neon tetras
    for $36.").
12. **A shared shop isn't on the leaderboards;** its day and money show on the club card.
13. **Listing photos stay in shared shops, small and visible to everyone** ("we'll want to list photos. just make it
    visible and small"): the agent's reading is a small picture (about 320 pixels wide, roughly 10 to 20 KB) that every
    member sees, with the photo's usual boost, stored once on the server and referred to from the shop, so it isn't
    re-sent with every save and join (SHARED-SHOPS.md §4.4).
14. **Short breaks don't count:** a shop empty under 5 minutes resumes with no catch-up; longer, at most 12 game hours.
15. **Shared shops have a 400-hour monthly cap on the server's awake time** ("cap at 400 for now"), leaving at least 350
    of Render's 750 free hours for DAS-Games; at the cap they close until the 1st, and the club card shows the hours
    used. The message is the one drafted in that question's first option ("Shared shops have used this month's free
    server hours. They open again on {date}."): the owner typed their own answer, which matched that option's cap, so
    using its words is the agent's reading, reported to the owner.

## Consequences

- `docs/agent/design/SHARED-SHOPS.md` is the design: lockstep with the server's copy in charge and the same arithmetic
  on every copy (§3), commands (§4), the server (§5), the database (§6), the client (§7), the approved words (§8),
  tests (§9), the chunks (§10). It was revised after its review (round 4's context).
- Creating the Render web service waits for the owner's yes in the session that needs it (chunk 10's test on Render,
  which runs without the database key); the owner adds the key in chunk 12.
