# ADR-0019 — Owner answers for chunk 1: links skip the title, a reload reopens where you were, the loading card, and not-found wording

**Status:** Accepted\
**Date:** 2026-10-06\
**Chunk:** 1 (navigation, links and the platform layer)\
**Requirements:** NAV-012, NAV-013, NAV-014, PERSIST-014, DES-004

## Context

`PLAN.md` chunk 1 says to ask the owner, before building the boot rules, which links skip the title screen, what a
reload does and what the loading card shows (0.5 spec §6.4; BACKLOG B-117), and to get NAV-014's not-found wording,
which §6.5 and §16 don't give. The agent asked four questions in the chunk 1 session; they and the answers are under
"Owner approval".

## Decisions

1. **Links skip the title.** A page opened from a link (navigation type `navigate`) whose hash names a real screen
   (it parses to a route other than home) skips the title: the latest save loads behind the loading card, through the
   same guarded load as Continue (`loadIntoGame` with `toastMark`/`reportLoadFailure`; a failed load shows the title),
   and then the route opens. No hash, `#/` or a hash that names nothing shows the title as today; a hash that names
   nothing also shows the broken-link toast once the game starts. With no save, the route waits through onboarding
   and opens once, when the first game starts (§6.4 item 3).
2. **A reload reopens where you were.** This is the owner's choice over the recommended "back to the title", and it
   replaces §6.4 item 2 and §22 risk 2:
   - A reload (navigation type `reload`, and `back_forward`, a return through history to a page the browser didn't
     keep) loads the save of the aquarium this tab was playing and reopens the screen in the address, behind the same
     loading card. "This tab's aquarium" is the newest save with the `saveId` the tab last played (kept in
     `sessionStorage`), else the latest save.
   - So the address says where the player is: `#/…` while a game is on screen, and no hash on the title and in
     onboarding (the router removes it there). A reload without a hash shows the title; `#/` reopens the tank view; a
     hash that names nothing reopens the tank view with the broken-link toast; with no save at all, the title shows.
3. **The loading card loops.** An indeterminate (looping) bar, not §17's 1.8 s fill, with "Loading your save ·
   catching up {duration}…", where {duration} is the real time since the save was written ("3 h 12 min"), and the
   pill "Then: {destination}" when the route isn't home. Away under a minute, the line is just "Loading your save…".
4. **Not-found wording.** A link to something that no longer exists opens the nearest screen with an info toast:
   - a tank: Tanks, "That tank isn’t in your aquarium" / "Showing your tanks instead.";
   - an animal: Livestock, "That animal isn’t in your aquarium" / "Showing your livestock instead." (animals that died
     or were sold still open their card);
   - a listing: Market › My listings, "That listing isn’t here any more" / "Showing your listings instead.";
   - a species page: Encyclopedia, "There’s no page for that species" / "Showing every species instead."
   - A save written by a newer version keeps today's message and adds "Refresh the page to get the latest version."
     (PERSIST-014; ADR-0016 decision 2 says the old tab asks the player to refresh.)
   - An offer keeps the spec's "This offer has gone" state (§6.5, §7.6).

## Consequences

- NAV-012 and NAV-013 change with decision 2: the reload criteria ("a reload shows the title") become "a reload
  reopens the screen in the address", and the loading-card criterion follows decision 3. `nav.spec`'s reload case
  (§20.2) asserts the reopened screen. Tests that reloaded to reach the title change on purpose and say so in the
  commit; Continue from the title stays covered by opening the game afresh.
- `PLAN.md`'s chunk 1 "Done when" ("a reload shows the title screen") follows this ADR.

## Owner approval

Given 2026-10-06 by the owner in the chunk 1 Claude Code session, through four multiple-choice questions.

Question 1 (verbatim): "Links: when someone opens the game from a link to a screen (e.g.
…/aquarium-go/#/shop/fish/offer_k3x9 or #/livestock/eggs), should it skip the title screen?"

Owner's answer (selected option): **"Skip the title (Recommended)"**, described as: "A link to a real screen loads
your latest save behind a loading card, then opens that screen. A plain address, #/ or a broken link shows the title as
today (a broken link adds the 'That link doesn't go anywhere' toast once you're in). With no save yet, the screen opens
when you finish New Game."

Question 2 (verbatim): "Reload: what should a page reload (F5, pull-to-refresh) do?"

Owner's answer (selected option): **"Reopen where I was"**, described as: "A reload loads your latest save and
reopens the screen you were on, like opening a link." (Not chosen: "Back to the title (Recommended)", described as
"Same as today: a reload always shows the title screen and the address resets to #/. Nothing reopens on top of the
title; Continue picks up where you left off.")

Question 3 (verbatim): "Loading card: while a link loads your save, what should the card show?"

Owner's answer (selected option): **"Looping bar + time away (Recommended)"**, described as: "A looping bar (it can't
promise how long loading takes), 'Loading your save · catching up 3 h 12 min…' and 'Then: Market › Shop'. Away under
a minute: just 'Loading your save…'." (Not chosen: "The design's filling bar", a bar that fills once over 1.8 s.)

Question 4 (verbatim): "Wording the design doesn't give: links to things that no longer exist, and a save made by a
newer version. Use these?"

Owner's answer (selected option): **"Use these (Recommended)"**, described as: "Each opens the nearest screen with a
short info toast, worded like the design's broken-link toast." The list shown with it is decision 4's.

Scope: the boot, reload and not-found behaviour and wording above. None of these answers approves a push of `main`, a
deploy or any other remote action.
