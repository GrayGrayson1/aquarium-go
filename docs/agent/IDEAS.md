# Ideas for later

Ideas the owner liked enough to keep but did not ask to build yet. Nothing here is decided or scheduled: an idea
becomes work only when the owner says so, and then it gets a chunk in `PLAN.md` and, if it needs his decisions, an
ADR. Add new ideas at the end with the date; when one is built, move its row to "Built" with the chunk number.

Each idea says what it is, what a player would see, why it could matter, what it needs, and how big it is
(small: days of one chunk and no server; medium: a full chunk; large: several chunks or server work).

## Waiting

### 1. "While you were away": a story on every return (2026-11-24)

- **What.** The game already catches the simulation up when the tab was hidden or the game was closed. Turn that
  silent jump into the best ten seconds of a session.
- **What a player sees.** On opening the game: up to three cards. "Your koi pair spawned: 40 fry." "A buyer offered
  $180 for your blue shrimp." "One rare young hatched: tap to see," which opens the rare-hatch reveal (chunk 21).
  Then one button: "Carry on".
- **Why.** A reason to come back each day, and good news first instead of a wall of toasts.
- **Needs.** A summary of what the catch-up did (births, sales, deaths, offers, problems), ranked; the reveal card
  from chunk 21; care that bad news (a death, a tank in danger) is said plainly and first. Mostly client work; the
  summary would be gathered in `src/sim/catchUp.ts` without new rng draws.
- **Open questions for the owner.** How long away before the story shows (a minute? an hour?); whether it shows in a
  shared shop, where the server kept playing with others.
- **Size.** Medium.

### 2. Club play with stakes: weekly club shows and trading (2026-11-24)

- **What.** Friends in a club compete and swap, beyond co-running one shared shop.
- **What a player sees.** "This week: best-coloured guppy. Sam's entry scored 87, yours 82. Three days left." Each
  member enters one animal; the game's own show judging ranks them; the week's winner gets a ribbon on their club
  card. Separately: gift or trade an animal to a club member.
- **Why.** Friendly rivalry and showing off pull harder than any solo reward, and it gives breeding a public goal.
- **Needs.** Server and database work (entries, scores, a weekly clock, trades that cannot duplicate or lose an
  animal), a migration on the live project, rules against cheating by editing a save (the trust boundary:
  `docs/agent/TRUST_BOUNDARY.md`), and many owner decisions (prizes, what a trade may move, what happens to an
  animal's history). The largest idea here.
- **Open questions for the owner.** Whether scores are judged on the player's device or on the server (the second
  is fairer and much more work); whether trading is gifts only at first.
- **Size.** Large.

### 3. A daily goal trio (2026-11-24)

- **What.** Three small tasks a real day, a small reward for each and a streak counter.
- **What a player sees.** "Today: sell 2 young · do a water change · photograph an animal. 2 of 3 done. Streak: 4
  days."
- **Why.** A short, finishable session every day.
- **Needs.** The quest system could carry it (`src/data/quests.ts`), but "a real day" needs a clock, which the
  deterministic simulation may not read: the day would have to come in as a command. Rewards are balance, so the
  owner decides them. Care not to punish a missed day.
- **Size.** Medium.

### 4. A photo worth sharing (2026-11-24)

- **What.** A clean picture of a tank or one animal with its name, morph and rarity, saved as an image to send to
  friends.
- **What a player sees.** In the photo tool: "Share card". A framed picture: "Mango · Marble Halfmoon betta · Rare ·
  bred in my shop on day 41".
- **Why.** Free word of mouth, and a way to show off a rare find.
- **Needs.** The photo code exists (`src/ui/photo`); this adds a framed layout and the phone's share sheet where the
  browser has one. No server.
- **Size.** Small.

### 5. A faster first hour (2026-11-24)

- **What.** Make the first breeding and the first sale happen quickly, so a new player sees the whole loop before
  closing the tab.
- **What a player sees.** Within the first fifteen minutes: young in the tank, one sold, the first discovery in the
  Collection.
- **Why.** Most players who leave, leave before the game shows what it is.
- **Needs.** This is balance (breeding times, the guide's order), so each change is the owner's decision, and seeded
  tests shift when timings change. Start by measuring: play a new game and write down when each first happens.
- **Size.** Medium; mostly decisions.

## Built

| Idea | Chunk |
|---|---|
| The Collection: every species and morph with its holes showing, completion and how to find what is missing | 21 |
| Rare-hatch reveals: a reveal moment when a rare first is born | 21 |
| "What next?": one button that names the most useful thing to do and goes there | 21 |
