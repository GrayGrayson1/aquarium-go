# ADR-0054 — Owner answers, chunk 18: the owner deletes anything in Social (clubs, shared shops, accounts, friends), from the database

**Status:** Accepted\
**Date:** 2026-11-01\
**Chunk:** 18 (the owner's deletes; PLAN.md "Chunk 18")\
**Requirements:** OWN-001 to OWN-004

## Context

Social had one delete: Delete my account (chunk 8, ADR-0040). The owner could make clubs (ADR-0040 decision 2) but
couldn't remove one, nor a club's shared shop, nor anyone's account, nor a friend. Test clubs, shops and accounts
were piling up in the live Supabase project (the free plan's database is small: ONLINE-STAGE1.md §2).

## The owner's words, verbatim

> "It would also be really nice to have a way to delete any of the socials from the main account if I so wished. It
> is already growing to too large a size so we'll need that."

Asked which (clubs, friends, shared shops, players' accounts), the owner answered:

> "I just need the option to be able to delete what I want to since I'm kind of like the super admin of it. As long as
> I can delete it and it deletes from the database, then that's what we're looking for. please try to get it release
> dto render on your own"

## Decisions

1. **The owner may delete everything Social keeps:** any club (its members list, its shared shop and that shop's
   photos go with it), any club's shared shop alone (the club stays and may get a new shop), any other player's
   account (as Delete my account removes one: profile, online save and its previous copy, friend links, club places,
   their audit-log rows; clubs and shops they made keep going with `created_by` null), and a friend or a friend
   request of the owner's own. The owner's own account is not on the list: it stays Settings › Account › Delete my
   account. Nobody else gets any of this.
2. **It deletes from the database.** Five functions in a new migration (`20261101000000_owner_deletes.sql`), made as
   every function the game calls is (a SECURITY DEFINER function in `private` behind a SECURITY INVOKER wrapper in
   `public`, granted to `authenticated` only), each refusing anyone but the owner (`forbidden`) before it reads
   anything. A delete of something already gone does nothing. No undo: the confirm box says so.
3. **Where:** a "Manage clubs and players" card at the end of Social › Clubs, the owner's only, listing every club
   (members, its shared shop with its day and size) with Delete shop and Delete club, and every player (friend code,
   when they joined and last saved online, how many clubs, their size) with Delete account; at its top, what
   everything online takes (the database's size). Remove on each friend's tile and Decline on each friend request,
   in Friends, the owner's only. Each delete opens a confirm box first. Players see nothing new. The sizes answer
   "growing to too large a size": the biggest saves and shops are visible before deleting.
4. **A shop deleted while people play it** closes for everyone there with the existing "{club} has no shared shop any
   more." (`gone`), at the server's next lease renewal (within 30 seconds) or save, instead of "The shared shop's
   server restarted…"; nothing is written back. A deleted player still in a shop is closed as `removed` at the next
   membership check, as before.
5. **The words** (the owner sees them; written to the copy deck's rules, shown to the owner with this release):
   "Manage clubs and players"; "Everything Aquarium Go keeps online takes {size}."; "Clubs ({n})", "Players ({n})";
   "{n} members · Shared shop {name}, day {d}, {size}" or "· No shared shop"; "{code} · joined {date} · saved online
   {date}" (or "never saved online") "· {n} clubs · {size}"; "{name} (you)" and "Your own account: delete it in
   Settings › Account."; the buttons Delete shop, Delete club, Delete account, Remove, Decline; the confirm boxes
   "Delete {club}?", "Delete the shared shop {shop}?", "Delete {name}'s account?", "Remove {name}?", "Decline
   {name}'s request?", each saying what goes, what stays and (for the deletes) "This can't be undone."; the toasts Club
   deleted, Shared shop deleted, Account deleted, Friend removed, Request declined; an empty club list says "None.",
   and a delete the server refuses says "That didn't go through. Refresh Social and try again." Only the owner's own
   row says "(you)"; no owner's row has Delete account (the database refuses it).
6. **Release:** 0.9.1 once the four checks pass and the review's blockers are fixed (the owner: "try to get it
   released to render on your own"): the migration on the live project, `main`, GitHub Pages, the shop server and the
   Render static site. The shared-shop build hash doesn't change (nothing under `src/sim`, `src/data`, `src/types` or
   the persistence files changed), so nobody playing a shared shop is asked to reload.
