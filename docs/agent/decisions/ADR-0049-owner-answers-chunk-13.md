# ADR-0049 — Owner answers, chunk 13: two more shared-shop lines approved as written; the play-test on the Render address first

**Status:** Accepted\
**Date:** 2026-10-21\
**Chunk:** 13 (shared shops, the screens and the play-test; SHARED-SHOPS.md §7, §8)\
**Requirements:** SHARE-004, SHARE-006, SHARE-008; PLAN.md "Releases" step 1

## Context

Chunk 13 (Chase, at the owner's request: SESSION_HANDOFF.md "Handoff to Chase") builds the shared shop's screens with
SHARED-SHOPS.md §8's approved words (ADR-0045, ADR-0048). Two situations the screens meet have no approved words: a
player whose sign-in has ended, or who is signed out, opening or staying in a shared shop (the connection can't sign
them in, so the visit ends); and a pause refusal when the game doesn't know the owner's name (the welcome names the
owner, chunk 13; a shop the server can't name an owner for is rare). The play-test with the owner and their daughter
runs on the live shared-shop server, which accepts only the game's two sites as origins, so how the play-test build
reaches them was the owner's call (SESSION_HANDOFF.md, gate 2).

## The questions as asked, and the answers (one AskUserQuestion round)

1. **"Chunk 13 (shared shop screens) is built and working in two browsers. Two situations need words the approved list
   doesn't cover. (1) A player whose sign-in has ended (or who is signed out) tries to open or stay in a shared shop:
   they go back to their own aquarium (or the title) and see a line. (2) In the rare case the game doesn't know the
   owner's name, the pause refusal fills {owner} with \"the owner\". Approve these as written?"** (Words)
   - Chosen: **"Approve as written (Recommended)"**: "Used exactly as in the preview." The preview, verbatim except
     that its example named the owner, written here as {owner}:

     ```
     Signed out, or the sign-in ended:
       You need to be signed in to play the
       shared shop. Sign in from Social and
       open it again.

     Pause refused, owner's name unknown:
       Only the owner and the people they
       choose can pause or change the speed.
       (normally: "Only {owner} and the people
        they choose can pause or change the
        speed.")
     ```
   - Not chosen: "Change some" ("Say which and how in the notes.").
2. **"For the play-test with your daughter on the real shared-shop server, the game itself has to reach you both, and
   the server only accepts the game's two addresses (GitHub Pages and aquarium-go.onrender.com). How should the
   play-test build reach you?"** (Play-test)
   - Chosen: **"Render address first (Recommended)"**: "Once all checks are green, I put the new build on
     https://aquarium-go.onrender.com only (and the shop server from the same build). GitHub Pages stays 0.5.6 for
     everyone else until you say release. You both play there; then 0.6.0 goes to both sites. $0. If Render needs it, I
     switch that site to follow `next` for the test and back to `main` at the release."
   - Not chosen: "Release 0.6.0 first" ("Once all checks are green, I release 0.6.0 to both sites, then you play-test
     on the live game. Shared shops stay unused until you create one (members see \"No shared shop yet.\"). Simpler,
     but every player gets the build before you've played it. $0."); "Something else" ("Say how in the notes.").

No notes were added.

## Decisions

1. **"You need to be signed in to play the shared shop. Sign in from Social and open it again."** is shown when a
   shared shop can't sign its player in (no session, or a sign-in the server refuses after a fresh token); the player
   goes back to their own aquarium, or the title screen when they came from there.
2. **"Only the owner and the people they choose can pause or change the speed."** is the pause refusal when the game
   doesn't know the owner's name; otherwise §8's line names them.
3. **The play-test runs on the Render static site first.** Once chunk 13's four checks are green on its final commit
   and its review is done, the agent deploys that commit to the Render static site `aquarium-go`
   (https://aquarium-go.onrender.com) by hand, and the shop server `aquarium-go-shops` from the same commit (ADR-0047
   decision 2: deploys from `next`), switching the static site to follow `next` for the test if Render needs it and back
   to `main` at the release. GitHub Pages stays 0.5.6 until the owner says release; then 0.6.0 goes to both sites as
   PLAN.md "Releases" says. $0.

## Consequences

- `src/ui/shared/words.ts` gains the two lines; SHARED-SHOPS.md §8 lists them with the approved words.
- PLAN.md's chunk 13 record and SESSION_HANDOFF.md carry the play-test's steps: the Render static site from `next`, the
  shop server from the same commit, the shared smoke, then the owner's go-ahead for 0.6.0.
- The release puts the static site back on `main` (if it was switched) before the release's deploy.
