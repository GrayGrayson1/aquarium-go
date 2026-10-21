# ADR-0047 — Owner answers, chunk 12: the migration live when its check passes, the real server deployed from `next` when tested, a server password instead of a Supabase secret key; big shops stay free (K1)

**Status:** Accepted\
**Date:** 2026-10-21\
**Chunk:** 12 (shared shops, the server and the database; SHARED-SHOPS.md §5, §6)\
**Requirements:** SHARE-003; ADR-0045 decision 1 (changed here), ADR-0046; OWNER_QUESTIONS K1

## Context

The owner asked (relayed by Chase, verbatim): "Within CNVS Canvas go ahead and have Marshall build everything out and
give it everything it needs to be 100% successful." So Marshall builds chunk 12 and chunk 13 to the 0.6.0 release
(`docs/agent/SESSION_HANDOFF.md`, "Handoff to Marshall"). Chunk 12 needs the owner's yes before anything goes live: the
migration applied to the live Supabase project and the real server deployed to the free Render service
`aquarium-go-shops` (ADR-0046 covered only chunk 10's prototype, with stub shops and no key).

While writing chunk 12's brief the agent checked what the server's key could reach. ADR-0045 decision 1 had the owner
make a Supabase secret key for the server and paste it into Render. A secret key acts as the `service_role` Postgres
role ("By design, this role has full access to your project's data", [API keys](https://supabase.com/docs/guides/api/api-keys)),
which the design's migration limits by revoking that role's rights on every table and function (SHARED-SHOPS.md §5.8).
But a secret key also opens Supabase Auth's admin tools (the reference says deleting a user "requires a secret key",
[delete_user](https://supabase.com/docs/reference/python/auth-admin-deleteuser)), and nothing in the database limits
that: a leaked key could list players' email addresses or delete accounts. Option 1 of question 3 below avoids any
Supabase key: the server's functions check a password whose fingerprint is stored in the database.

## The questions as asked, and the answers (one AskUserQuestion round)

1. **"Chunk 12 adds shared shops' tables and the server's functions to the live Supabase project, and takes away the
   admin role's access to every existing table (so the server can reach only its own functions). Once it passes the
   local database check, may I apply it to the live project?"** (Migration)
   - Chosen: **"Yes, when the check passes (Recommended)"**: "I apply it with the Supabase CLI, run the security
     advisors and the stage 1 live test, and tell you the results. Free. Players see no change: no released game calls
     the new functions."
   - Not chosen: "Show me first" ("I stop after the local check, show you the change and its results, and ask again
     before touching the live project.").
2. **"Once the real server passes its tests (sign-in, the database, saving), may I deploy it to the free Render service
   aquarium-go-shops from next and run the live test on it?"** (Server)
   - Chosen: **"Yes, when tested (Recommended)"**: "The same free service as chunk 10 ($0). The live test makes a
     throwaway club, shop and account, plays it for a minute on the real server, then deletes them all and checks
     nothing is left. Players can't reach it yet (no released game has a shared-shop screen). It moves to main only at
     the 0.6.0 release, with your go-ahead then."
   - Not chosen: "Ask me again first" ("I build and test everything locally, then stop and ask before deploying to
     Render.").
3. **"Something you should know about the server's key. The plan (ADR-0045) has you make a Supabase secret key and
   paste it into Render. My database change stops that key reaching any table, but Supabase can't limit what a secret
   key does with accounts: anyone who got it could list players' email addresses or delete accounts. Which should the
   server use?"** (Server key)
   - Chosen: **"A server password (Recommended)"**: "No Supabase key at all: a long random password that unlocks only
     the server's own functions (no accounts, no other tables). A script makes it, stores only a fingerprint of it in
     the database and puts it on your clipboard without showing it to me; you paste it into Render. One Render visit,
     about 2 minutes, walked through. $0, a little more code."
   - Not chosen: "Keep the Supabase key" ("As approved: you make a secret key just for this server in Supabase's
     dashboard and paste it into Render (about 3 minutes, walked through; I never see it). It lives only in Render's
     settings and you can switch it off any time, but it could reach accounts if it ever leaked.").

No notes were added.

### Round 2 (K1, with chunk 12's numbers)

After the deploy the agent measured the stub shops on the real server on Render's free instance (SHARED-SHOPS.md §11,
"Chunk 12"): a new or month-old shop at full speed on about a fifth of the instance; the late-game `big_facility` at 93%
of real time at 1×, 95% at 3× and 88% at 10× (chunk 10: 84 to 92%, 76% and 55%), every fingerprint matching.

1. **"K1, big shared shops on the free server. Measured today: new and month-old shops run at full speed using a fifth of
   the free server. A late-game shop (15 tanks, 337 animals) now keeps 88 to 95% of real time at any speed (it was 55% at
   10×). So a big shop just runs a little slow, never out of step. What should happen when a shop gets that big?"** (Big
   shops)
   - Chosen: **"Keep it free, no change (Recommended)"**: "Big shops run 5 to 12% slower than real time (at 1×, a game day
     takes about 4.3 minutes instead of 4). Nobody sees a message; nothing to build. $0. We can revisit if a real shop
     gets bigger than the test one."
   - Not chosen: "Cap their speed" ("Above a size, the shop's top speed is 3× (new words for the speed buttons, to
     approve). It helps little: the test shop keeps 95% at 3× and 88% at 10×. $0."); "Paid server when needed" ("Move
     the shop server to Render's Starter plan (about $7 a month, 0.5 CPU) once a shop gets that big: full speed for big
     shops. Only with your yes at that time.").

## Decisions

1. **The migration goes live once `scripts/online-db-local/run.sh` passes**, applied by the agent with the Supabase CLI
   (scoped `--linked --project-ref zkavcxrsxdgdlstravpj`), followed by the security advisors and the stage 1 live smoke
   (`scripts/online-smoke.mjs`); the results are reported to the owner.
2. **The real server is deployed to `aquarium-go-shops` from `next` once its tests pass**, and the agent runs the
   shared-shop live smoke on it (`scripts/shared-smoke.mjs`: a throwaway club, shop and account, removed afterwards and
   checked gone). The service stays on `next` for chunk 13's play-test and moves to `main` only at the 0.6.0 release,
   with that release's go-ahead. Anything that would cost money still waits for the owner.
3. **The server uses a password of its own, not a Supabase secret key** (this replaces ADR-0045 decision 1's
   mechanism; its point stands: only the server writes shared shops, and the browser touches no table). The
   password is long and random (256 bits), made by a script in the repo that stores only its SHA-256 fingerprint in
   the database (through the Supabase CLI) and puts the password on the owner's clipboard without printing it; the
   agent never sees it, and it never enters the repo, a log or a build. The owner pastes it into the Render service's
   environment as `SHOPS_SERVER_KEY` (and deletes chunk 10's test variables) in one dashboard visit, walked through.
   The server's database functions are reachable through the API with the publishable key and do nothing unless the
   password's fingerprint matches; they are its only reach (no accounts, no other table). Running the script again
   replaces the password (the old one stops working at once).
4. **`service_role`'s rights on every table and function in `public` are still revoked**, with the schema's default
   privileges changed (SHARED-SHOPS.md §5.8): nothing uses that role, and the project's own secret keys then can't
   read or write players' data through the API either.

5. **Big shops stay on the free server, unchanged (K1):** a late-game shop simply runs a little slower than real time
   (5 to 12% measured), with no message and no speed cap. Revisit only if a real shop grows past the test one; a paid
   instance would still wait for the owner's yes.

## Consequences

- SHARED-SHOPS.md §5.8, §6.3, §12 (SHARE-003) and §13, PLAN.md's chunk 12 brief, SESSION_HANDOFF.md's gates and
  OWNER_QUESTIONS.md say "the server's password" where they said the Supabase secret key.
- The build command removes `SHOPS_SERVER_KEY` from the build (`env -u SHOPS_SERVER_KEY sh -c '…'`), and the build's
  log is checked for the name.
- TRUST_BOUNDARY.md gains a shared-shops section: what the password reaches, and that a leaked password could rewrite
  any club's shared shop (not players' own saves or accounts) until the script is run again.
