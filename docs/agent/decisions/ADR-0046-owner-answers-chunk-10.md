# ADR-0046 — Owner answers, chunk 10: the free Render test service

**Status:** Accepted\
**Date:** 2026-10-20\
**Chunk:** 10 (shared shops, the test; SHARED-SHOPS.md §10)\
**Requirements:** SHARE-002

## Context

Chunk 10 tests the shared-shop design before chunks 11 to 13 build it: lockstep in one process and across Node,
Chromium and WebKit, then the same on Render's free plan, where the server's speed on 0.1 CPU, the wake time and a
real two-browser session can only be measured on the service itself. SHARED-SHOPS.md §10 says the service is created
only with the owner's yes, which the owner gave when the chunk started (2026-10-20, "ok, chunk 10").

## The question as asked, and the answer (one AskUserQuestion round)

1. **"Chunk 10 ends with a test on Render. Once the local part works, may I create the free test server on Render
   myself, deploy the prototype to it and run the measurements?"**
   - Chosen: **"Yes, when it's ready (Recommended)"**: "I'd create a new free web service, aquarium-go-shops, with the
     Render CLI: free plan ($0), in Virginia near the database, built from `next` and deployed only by hand. It runs
     test shops from the game's dev saves: no database, no key, no players. The test keeps it awake for a few hours
     and sends well under 100 MB, inside Render's free 750 hours and 5 GB a month (shared with dascade). Afterwards it
     sleeps, costs nothing, and I reuse it in chunk 12."
   - Not chosen: "Ask me again first" (the whole local part, then stop and ask before touching Render); "Local only for
     now" (skip Render; the speed and wake-up numbers stay estimates until chunk 12).

## Decisions

1. **The agent creates the free web service `aquarium-go-shops` with the Render CLI** when the local part works: the
   free plan, Virginia, from this repo's `next` branch, auto-deploy off (deployed by hand), stub shops only (no
   database, no key, no players). The agent deploys the prototype to it and runs chunk 10's measurements. Anything that
   would cost money still waits for the owner (ADR-0045; "lets make everything free if we can for now please").
2. **Afterwards it stays** (asleep and free) and chunk 12 reuses it, switched to `main` and the real server then.
