# ADR-0050 — Owner answers, chunk 14: three spending tiers per member, asking for an amount, an allowance topped up each game day, and live tests right after the release

**Status:** Accepted\
**Date:** 2026-10-21\
**Chunk:** 14 (shared shops' permission tiers and money pool; ADR-0043 decision 5, SHARED-SHOPS.md §5.6)\
**Requirements:** SHARE-019 to SHARE-024 (chunk 14's brief, PLAN.md)

## Context

0.6.0 (chunks 10 to 13) shipped shared shops' first version: every member spends the shop's one balance freely, and
only pause and speed are restricted (the owner, plus the members the owner switches on). The owner then asked for the
next portion (verbatim, to Chase): "Within CNVS make Marshall do it. Give it everything it absolutely possibly needs to
be able to be successful in building this next portion. If you've done your own testing then you're fine but have it
do its own testing after the fact. We want this as close to one-to-one as we talked about, as far as being a finished
product." What "we talked about" is the owner's answer in ADR-0043 (round 2, question 2), verbatim: "I think anybody
should be able to do #1. Everything else, with permission, I believe. Otherwise I think there should be tiers of
permission. At the beginning we should probably just have it be that everybody can do everything else with... We also
probably want there to be a group pool where pretty much all the money just goes into the group and then you can
request money. I think, unless you're given permission to just use the money, which we'll probably go with in the
beginning just to make it simpler (with the idea of adding that later), other people should be able to withdraw
requested money to buy things. Maybe we can even set an amount that people can have that they can just draw from,
especially depending on the situation. If there's a prismatic or something that you can buy, maybe you're just granted
permissions, that kind of thing, but that could be later." ADR-0043 decision 5 reads it as tiers of permission, a group
pool, requests someone with the permission approves, people given the permission spend directly, an allowance, and a
one-off grant for a special purchase.

Marshall (chunk 14) read the code first: the shop's `finance.money` is already the one pool everything earns into;
`spend()` (`src/sim/economy/finance.ts`) is where every purchase leaves it; the server's `allowed()`
(`server/room.ts`) is the one permission check and already runs each command's step on a copy; staff wages and the
stock manager keep spending on their own after a hire or a budget. Since 0.6.0 the shop server and the Render address
serve players (the owner and their daughter), so how to test live before the release was the owner's call too
(SESSION_HANDOFF.md, "Production now").

## The questions as asked, and the answers (one AskUserQuestion round)

The previews' example names were "Mia" and "Sam" (made up) and the owner's own first name, written here as {owner}.

1. **"Chunk 14 (the shared shop's money pool and permission tiers): how should a member's spending be set? The shop's
   money is already one pool everything earns into; tiers only limit who can spend it."** (Tiers)
   - Chosen: **"3 tiers each, start free (Recommended)"**: "In your members list you give each member one of three
     spending tiers: Spends freely, Allowance (an amount each game day), or Asks first. Two switches beside it: 'Can
     approve requests and give money' (new) and 'Can pause and change speed' (as now). Everyone starts at Spends
     freely, so shops play as in 0.6.0 until you change someone. Every tier can care for animals, sell and move
     things. Hiring or letting go of staff and the stock budget need Spends freely, because they keep spending after.
     You always spend freely and approve; only you change tiers. No database change: it all saves inside the shop."
     Its preview, verbatim:

     ```
     Your members list (only you), one row each:

      Mia
       Spending: (•) Spends freely
                 ( ) Allowance [$200] each game day
                 ( ) Asks first
       [ ] Can approve requests and give money
       [x] Can pause and change speed

     Everyone starts at Spends freely (as 0.6.0).

     Alerts (everyone; Mia also gets hers as a pop-up):
      {owner}: Set Mia to spend freely.
      {owner}: Set Mia's allowance to $200 a game day.
      {owner}: Set Mia to ask first.
      {owner}: Let Mia approve requests.
      {owner}: Mia can no longer approve requests.

     Staff and the stock budget, without Spends freely:
      "Staff and the stock budget keep spending the
       pool, so only members who spend freely can
       change them."
     ```
   - Not chosen: "3 tiers each, start Asks first" ("The same three tiers and switches, but everyone except you starts
     at Asks first: nobody else can buy anything until you set their tier or approve a request. Safer, but in your
     current shop your daughter couldn't buy until you set her up."), "Named roles instead" ("Each member gets one
     named role that bundles permissions, instead of a tier plus switches. Simpler to read, less fine-grained (e.g.
     pause comes with Manager only)."; Manager, Buyer, Member, Helper).
2. **"How should asking for money work?"** (Asking)
   - Chosen: **"Ask for an amount (Recommended)"**: "A member asks for an amount and says what for (optional). You and
     anyone you let approve get a pop-up and a count on Money; a request waits until someone answers or the asker
     cancels (at most 3 open each). Approved money is the member's to spend, on top of any allowance, until spent.
     Approvers can also give a member money without a request: that's the one-off grant for something special like a
     Prismatic. The money stays in the pool until something is bought, so the pool only drops on a purchase. Nobody
     approves or gives money to themselves." Its preview, verbatim:

     ```
     Strip: Shared · Reef Club · Here: {owner}, Mia
       [Money: $320 to spend] [Back to my aquarium]
       (approvers see [Money (2)] when 2 wait)

     Buying past your limit:
      "That costs $300, and you can spend $120.
       Ask for more in Money."

     Shop money
      Pool: $12,400. Everything the shop earns
      goes here.
      You can spend $320.
       Allowance: $120 of $200 left today.
       Approved for you: $200.
      [Ask for money]
       How much? [$5,000]
       What for? (optional) [Prismatic betta]
       [Send request] [Cancel]
      Your requests
       $5,000: Prismatic betta · Waiting [Cancel]
      Requests (approvers)
       Mia asks for $5,000: Prismatic betta
                            [Approve] [Decline]
      Give money (approvers)
       [Mia ▾] [$500] [Give]

     Pop-ups:
      Mia asks for $5,000: Prismatic betta.
      {owner} approved your $5,000.
      {owner} declined your request for $5,000.
      {owner} gave you $500 to spend.
      2 requests are waiting in Money.
     Alerts:
      Mia: Asked for $5,000: Prismatic betta.
      {owner}: Approved Mia's $5,000.
      {owner}: Declined Mia's request for $5,000.
      {owner}: Gave Mia $500 to spend.
      Mia: Cancelled the request for $5,000.
     Two approvers at once:
      "Sam already answered that request."
     ```
   - Not chosen: "Ask to buy one thing" ("When a purchase is refused, 'Ask to buy' sends that purchase itself as the
     request; approving buys it right away if it's still there (else it says it's gone). No amounts to type, but each
     request is one item, and the one-off grant is a pass for one purchase of any price."), "Amount, moved into a
     purse" ("As the first option, but approved or given money leaves the pool at once into the member's own purse;
     the pool drops when you approve, and the purse is only theirs to spend.").
3. **"How should an allowance refill? (A game day is 4 real minutes at 1×, 24 seconds at 10×, and passes only while
   someone's in the shop; the shop's earnings come per game day too, so an allowance keeps pace with them.)"**
   (Allowance)
   - Chosen: **"Topped up each game day (Recommended)"**: "Each new game day the allowance is filled back up to its
     amount; what wasn't spent doesn't pile up. A purchase uses the allowance first, then approved or given money,
     which stays until spent." Its preview, verbatim:

     ```
     Mia's allowance: $200 each game day.

     Day 12: Mia spends $150 → $50 left.
     Day 13 starts → back to $200 (not $250).
     Approved $500 → she can spend $700.
     A purchase uses the allowance first,
     then the approved money.

     Money sheet:
      "Allowance: $50 of $200 left today."
      "Approved for you: $500."
     ```
   - Not chosen: "Adds up (saving up)" ("Unspent allowance carries over, up to 7 game days' worth, so a member can save
     toward something big."), "No refill, set by hand" ("No automatic allowance: members spend only what's approved or
     given to them, and you or an approver top them up by hand.").
4. **"Since 0.6.0, aquarium-go-shops and aquarium-go.onrender.com serve you and your daughter, so a test build there
   would interrupt you. How should I test chunk 14 live before release?"** (Live test)
   - Chosen: **"Stub first, live after release (Recommended)"**: "I build and test everything against the stub server
     (the real server code, two players in Chrome's and Safari's engines) and locally, plus the four checks and the
     Opus review. Nothing changes for you two until 0.7.0 is released on your go-ahead; right after, I run the live
     smoke and the two-browser test on the real server and fix anything at once. No new service, no database change."
   - Not chosen: "A second free Render server" ("A new free web service runs the test build, reached from a local test
     page. Free, but it shares the 750 free hours and 5 GB of data a month with your other Render services, and you'd
     paste the server password into it once (the browser-Claude flow from chunk 12)."), "A short window on the real
     server" ("Before release I deploy the test build to aquarium-go-shops and the Render address for about an hour
     while you two aren't playing (you tell me when), test with throwaway accounts and a throwaway club, then put 0.6.0
     back. During it, 0.6.0 tabs see 'The shared shop is updating', and the Render address plays the test build (Pages
     is unaffected).").

## Round 2 (2026-10-22, asked while the chunk's checks and review ran)

1. **"Chunk 14 is built and its tests pass so far. A few lines follow from the words you approved but weren't shown in
   the previews (a request with no note, one request waiting, an approver who also has a limit). Approve these as
   written?"** (Words)
   - Chosen: **"Approve as written (Recommended)"**: "Used exactly as in the preview, next to the lines you already
     approved." Its preview, verbatim:

     ```
     A request with no "What for?":
       Alerts:  Mia: Asked for $5,000.
       Pop-up:  Mia asks for $5,000.
       Sheet:   $5,000 · Waiting
                Mia asks for $5,000  [Approve] [Decline]

     One request waiting (an approver opening the shop):
       1 request is waiting in Money.

     An approver who also has a limit, 2 waiting:
       [Money: $320 to spend (2)]

     A note that ends a sentence keeps its own mark:
       Mia: Asked for $5,000: For the Prismatic!
     ```
   - Not chosen: "Change some" ("Say which and how in the notes.").
2. **"From chunk 13: on the shared shop's opening card, opened from the title screen, the back button reuses the
   existing word \"Title\" (from the game's own start screens). Keep it?"** (Back button)
   - Chosen: **"Keep \"Title\" (Recommended)"**: "The card says \"Waking the shared shop…\" with a [← Title] button that
     takes you back to the title screen; from inside your aquarium the same button says \"Back to my aquarium\"."
   - Not chosen: "Use \"Back\"" ("[← Back] from the title screen instead.").
3. **"When chunk 14's four checks are green and the fresh Opus review is clean, may I release 0.7.0? (You picked live
   tests right after the release.)"** (Release)
   - Chosen: **"Yes, release when clean (Recommended)"**: "I bump to 0.7.0, add the changelog entry, merge next into
     main and push; GitHub Pages deploys, then I deploy the Render site and the shop server from main, and run the live
     smoke and the two-browser money test on the real server with throwaway accounts (removed after). Open 0.6.0 tabs
     of the shared shop see \"A new version of Aquarium Go is out. Reload to join the shared shop.\" Everyone starts at
     Spends freely, so your shop plays as before until you set someone's tier."
   - Not chosen: "Wait until I've tried it" ("I push next (it deploys nothing) and tell you how to try it; I release
     only when you say so."), "Not yet" ("I finish, push next and stop.").

## Decisions

1. **Three spending tiers per member:** Spends freely, Allowance (an amount each game day) and Asks first, set by the
   owner in the members list. Beside the tier, two switches: "Can approve requests and give money" (new) and "Can
   pause and change speed" (as in 0.6.0, still saved on the shop's row). **Everyone starts at Spends freely**, so a
   shop plays as in 0.6.0 until the owner changes someone. The owner always spends freely and approves; only the owner
   changes tiers and switches.
2. **Tiers limit only spending the pool.** Every tier can care for the animals, sell and move things. Hiring or
   letting go of staff and the stock budget need Spends freely, because they keep spending after ("Staff and the stock
   budget keep spending the pool, so only members who spend freely can change them.").
3. **The pool is the shop's money** (`finance.money`): everything the shop earns goes into it, and it drops only when
   something is bought. Approved and given money stays in it until spent.
4. **Asking for money:** a member asks for an amount and says what for (optional); at most 3 open requests each. The
   owner and the approvers get a pop-up and a count on Money; a request waits until someone answers or the asker
   cancels. Approved money is the member's to spend, on top of any allowance, until spent. **Giving money** without a
   request is the one-off grant (the Prismatic case). Nobody approves or gives money to themselves. Two approvers at
   once: the first one wins ("Sam already answered that request.").
5. **The allowance is topped up each game day** to its amount; unspent allowance doesn't pile up. A purchase uses the
   allowance first, then approved or given money.
6. **The words in the previews are approved as written** (questions 1 and 2, and question 3's two Money-sheet lines),
   with the example names filled in from the game.
7. **Live testing:** everything is built and tested against the stub server and locally (the four checks, the e2e
   two-player tests in Chromium and WebKit, the fresh Opus review); nothing changes on `aquarium-go-shops` or the Render
   address until 0.7.0 is released on the owner's go-ahead; right after the release, the live smoke and the
   two-browser live test run on the real server, and anything they find is fixed at once. No new service and no
   database change.
8. **Round 2:** the implied forms are approved as previewed; the opening card's back button from the title screen keeps
   "Title"; **0.7.0 is released once the four checks are green and the fresh review is clean** (the owner's go-ahead,
   given in the session), then the live tests run. "That request has changed since you looked." is ADR-0048's approved
   first-one-wins pattern ("the first-one-wins lines for everything") with the request as its noun.

## Consequences

- Chunk 14's brief in PLAN.md builds this: the tiers, requests, gifts and allowances live in the shop's `GameState` (an
  optional field validated in `repairState`; absent, the shop plays as 0.6.0 and `stateHash` is unchanged), changed
  only by new commands; `allowed()` reads them; a spending command's cost is measured on the server's copy of its step,
  and every copy takes it from the member's allowance and approved money in that step.
- The shared build hash changes, so 0.7.0's server and site go out together (PLAN.md "Releases", step 4).
- Releasing 0.7.0: the owner's go-ahead was given in round 2, on the condition that the checks are green and the review
  is clean; "Title" is confirmed.
