# ADR-0055 — Owner answers, chunk 19: panels that stay open, links on the tank card, search, a decorating camera, why things are locked, the shared shop's dropdown and a new guide

**Status:** Accepted\
**Date:** 2026-11-02\
**Chunk:** 19 (quality of life; PLAN.md "Chunk 19")\
**Requirements:** QOL-001 to QOL-008

## Context

The owner listed what gets in the way of playing 0.9.1. Today: choosing a decor piece in Build closes Build (and
every placement after it means finding the tab, category and scroll spot again); the tank card says what is wrong
but not where to fix it; Market, Build and Research have no search; while a piece is in hand the camera can't orbit
or zoom (a drag never orbits during placement, the wheel turns the piece, and Orbit opens on one fixed angle), so
the back of a big tank is hard to reach; "Locked" chips and cards don't always say what unlocks them; the shared
shop's strip above the dock runs into the Front · Orbit · Follow · Close chips between about 900 and 1,100 px wide
(and takes two rows on a phone); and the guide's eleven steps, written for 0.5, never show Operations, Supplies,
Staff, Shows, Social or shared shops, and point at things with a ring only.

## The owner's words, verbatim

> "All right, we have a couple of quality of life improvements and maybe we could probably call them bugs for
> Aquarium Go. One kind of annoying thing is that you know if I were to go to builds, for instance. And I pick
> something to let's say decor. I can place that decor and I can multiply that decor, and that's great. But once I
> place it down, it takes me out of the builds. modal and the page that I was on. So it'd be really nice to have kind
> of a smarts, you know, that I I think I'd rather probably close the page that I was working with than have it
> automatically close and have to go find it again. So we'll want some Smarts featuring in when modals stay up or
> when they close down. Another thing that would be helpful is if there's something like, for instance, on the tank
> card, and maybe it says, you know, I maybe I need something, or maybe equipment is dying or something. I don't
> know, but if there's something that needs to be fixed, or Or can be purchased, or would otherwise you would have
> to go and navigate and find what it is that one of the cards is showing you. That card should just have a link
> that takes you there. That would be so convenient. Also, like some way to search through, you know, market or
> builds or or research any. Of those, or maybe even like some way to filter as well would be amazing. It's kind of
> hard to navigate through all of the stuff that's here. It's not intuitive at all. Need better camera controls. For
> instance, I saw somebody trying to decorate their tank, and they weren't able to switch their camera view well
> enough to be able to place the item that they wanted to in the place that they desired. It was it was kind of it
> wasn't a great experience to decorate the tank. We we should. Probably upgrade that experience as well. Oh, and you
> know, if I can't, like, for instance, if I can't buy a tank, it just says locked. We need to have something
> explaining what needs to be unlocked in order to get those things. Also, the front's orbit follow close. Sometimes
> gets in the way of the multiplayer shop. There's a some kind of navigation bar above the main one for when you're
> in that shop, you know, to see like players that are in there or give permissions. We're gonna want to upgrade
> that. Maybe it's like. A little drop down somewhere, I don't know, something that would be better than just this.
> I don't know if they're called pills, but basically just that little command center for the multiplayer shop to
> be above the navigation bar, and it gets getting in the way of the front orbit follow close. There's a lot of other
> updates that would be really good to do, but that's what kind of comes to mind right now. The intro guide, it's
> probably pretty outdated at this point. That could probably be upgraded to be. We wanted to be. Be like super user
> friendly and navigates you places and kind of shows you around and it's animated and it's beautiful. That's the
> kind of thing that we're looking for. Can you just go through and fix all this?"

## The questions and the answers (2026-11-02, one round, verbatim)

1. **"Panels (Build, Market…): when something you start in a panel needs the tank (placing decor, planting a frag,
   Rearrange, Buy & place a tank), how should the panel behave?"** — chosen: **"Stay open; step aside on phones
   (Recommended)"**: "On a computer Build stays open beside the tank: pick a piece, click to place, pick the next. On
   phones/tablets the sheet slides down while you place and slides back to the same tab, category and scroll spot. A
   panel only closes when you close it or go somewhere else. Buying an animal also keeps the Market open, with a 'See
   them' button on the toast." (Not chosen: "Same, but buying an animal goes to the tank"; "Always step aside and come
   back".)
2. **"Search: how far should it go? (Encyclopedia and Livestock already have a search box.)"** — chosen: **"Panel
   search + 'Find anything' (Recommended)"**: "A search box and filters in Market (Shop, Supplies), Build (Decor,
   Equipment, Tanks) and Research (projects, unlock map), plus a 'Find anything' search on the top bar (also ⌘K or /)
   that finds any item, animal, tank, research project or screen and takes you straight to it." (Not chosen: "Panel
   search boxes and filters only".)
3. **"Shared shop: the strip above the dock (who's here · Money · Back to my aquarium, and the owner's permissions)
   collides with Front/Orbit/Follow/Close. Where should it go?"** — chosen: **"Dropdown from the shop-name pill
   (Recommended)"**: "The top-left pill already shows the club's name. In a shared shop it adds '👥 2 here ▾'; tap it
   for a dropdown: who's here, the owner's permissions (pause and speed, spending), Money, and Back to my aquarium. The
   bottom strip goes away. On phones the time pill becomes '👥 2 · 9:57 ▾' and opens the same dropdown." (Not chosen:
   "A separate 👥 button at the top right"; "Keep a strip, move it to the top".)
4. **"The intro guide: what should the new one be?"** — chosen: **"Spotlight guide + tour of everything
   (Recommended)"**: "The same care steps (meet, feed, water, decor, market…) but animated: the rest of the screen
   dims, a glowing spotlight and a moving pointer show exactly where to tap, and 'Show me' opens the place and points
   at the exact button inside it. When it ends, a short tour of everything newer (Operations, Supplies, Staff, Shows,
   Social, alerts, speed), replayable any time from Settings." (Not chosen: "Spotlight guide only"; "Tour first, then
   the care steps".)

## Decisions

1. **Panels stay open (QOL-001).** A management panel closes only when the player closes it (its ×, Escape, a swipe
   down, its dock button) or goes somewhere else on purpose (another panel, a link to a tank or an animal, Watch or
   Photo). Choosing a decor piece, a stored piece or a frag, Rearrange decor, and Buy & place a tank start their tool
   without closing the panel: a side sheet (computer) stays where it is beside the tank or room; a bottom sheet
   (phones, upright tablets) steps aside (slides off the bottom, still holding its tab, filters, search and scroll)
   and comes back when the tool ends by placing, Done, Cancel or Escape — not when the player went somewhere else
   meanwhile. After a decor piece lands on a phone, the sheet comes back after a short beat so the piece is seen
   landing. Buying an animal keeps the Market open on the shop list; the toast offers "See them" (to the tank, with
   the animal's card). Market › Shop's "New tank" path back to the offer is unchanged.
2. **Links on the tank card (QOL-002), the agent's design under the owner's words.** Every problem the tank card
   names gets a link that goes to where it's fixed: the water issues and the header's status and attention lines
   each carry a short action ("Water change", "Top off", "Dose buffer", "Repair", "Buy a heater", "Buy food", "Open
   Equipment", "See {name}"). A fix inside the card scrolls to its control and makes it glow; anything else opens
   the right panel at the exact spot (Market › Supplies on that food, Build › Equipment for this tank on the right
   kind of gear, the animal's card). The Equipment tab gets Repair on failed and worn gear (the same price as Build ›
   Equipment). Gear wearing out (condition under 25 %, not yet failed) is named on the card with Repair, since the
   owner asked about "equipment … dying". The alerts drawer's tank rows use the same links.
3. **Search and filters (QOL-003, QOL-004), as answered.** One search box style everywhere (the Encyclopedia's).
   Market › Shop: search (species, morph, strain, seller, traits) and a sort; Market › Supplies: search; Build ›
   Tanks: "Can buy now"; Build › Decor: search, "Can buy now" and a sort, beside the category chips; Build ›
   Equipment: search and kind chips; Research: search and status chips on projects, search on the unlock map. "Find
   anything": a search button in the top bar (phones: in More), ⌘K / Ctrl+K and /; results grouped (screens, your
   tanks, your animals, shop stock, supplies, decor and equipment, research and unlocks, the Encyclopedia), arrow keys
   and Enter; choosing one goes there and, for an item in a list, opens that list searched for it.
4. **The decorating camera (QOL-005), the agent's design under the owner's words.** While a decor piece is in hand
   or Rearrange is on, the camera switches to a decorating view: it looks down into the tank (about 30°), and the
   player can orbit almost to the side, tilt to straight down, zoom in close and slide the view along the tank. Mouse:
   right- or middle-drag orbits, Shift+right-drag slides, the wheel zooms (R still turns the piece, Shift+wheel still
   sizes it). Keys: the arrows orbit and tilt, Shift+arrows slide. Touch: two fingers drag to orbit and pinch to zoom;
   twist still turns the piece; the piece's size moves to − and + buttons on the hint. An on-screen view pad (turn,
   tilt, zoom, and Front · Above · Left · Right · Reset) is there for everyone. The view returns to the player's camera
   when the tool ends.
5. **Why it's locked (QOL-006).** Every "Locked" in Build (tank sizes, water types, decor, substrates), the Market
   (offers, supplies) and Research opens "How to unlock …": the rule's own route, each requirement with the player's
   progress, the research projects that grant it with a button to open them, and a button to the facility when a
   bigger venue is needed. Locked water types become tappable for this (they were disabled).
6. **The shared shop's dropdown (QOL-007), as answered.** The strip above the dock goes; the top-left pill opens the
   dropdown. Nothing changes in what members may do; the words stay SHARED-SHOPS.md §8's and ADR-0050's.
7. **The guide (QOL-008), as answered.** The guide keeps its steps, objectives and rewards (the simulation's chain is
   untouched); it gains a dimmed spotlight with a glowing ring and a tapping hand that follows each step into the
   place it needs (the food picker's food, Build's suggested piece, the tank card's reading, the Market's stock,
   Research's next project), and "Show me" takes the player there. When it ends, "Show me around" offers the tour: one
   stop per area of the screen and per destination open to the player, each opened and pointed at, with Next, Back
   and Skip; Settings has "Take the tour" any time.
8. **Words.** Every new player-visible line (the links, the lock box, search, the view pad, the dropdown, the guide
   and the tour) is drafted to the copy rules and shown to the owner, with screenshots, before 0.9.2 is released.
   Nothing under `src/sim`, `src/data` (save the guide's words if the owner changes them), `src/types` or the
   persistence files changes, so the shared-shop build hash stays and nobody in a shared shop is asked to reload.

   **Answered 2026-11-02.** The review page (https://claude.ai/artifact/A88guJcyx17PooaThmqjc7, version 2: every new
   line with screenshots, after both reviews, including the phone pill's "👥 {n} ▾" over the time instead of the
   brief's one line) was put to the owner with "a yes on the wording … and whether to release 0.9.2". The owner,
   verbatim: "Yeah go ahead and make sure this is on GitHub, everything's updated, and it's on Render. Make sure it's
   updated everywhere and it's pushed." The words ship as shown, the pill included, in 0.9.2.
