# ADR-0056 — Owner answers, the audit of 2026-11-17: a friendlier game with no dead ends

**Status:** Accepted\
**Date:** 2026-11-17\
**Chunk:** 20 (the audit of 2026-11-17; PLAN.md "Chunk 20")\
**Requirements:** AUD-001 to AUD-010

## Context

The owner asked for a full audit of the released game (0.9.2) and its code for logical issues and for anything that
isn't friendly, with everything found fixed, and questions only where one is really needed. Ten auditors (Opus 5.5,
max effort) each read one area of the code at `cfdc5c0` (0.9.2 plus the audit of 2026-11-11): the first hour and the
guide, navigation, tank care, the animals, breeding, money, building, running a big shop, saves and online, and the
words game-wide. The lead played the live site as a new player on a phone and a computer. Between them the auditors
raised about 45 decisions; this ADR records the ten that were put to the owner, and the defaults taken on the rest.

## The owner's words, verbatim

> "Go ahead and you have my permission to wake up this project in Superbase. Do a full audit on our codebase and our
> release and specifically look for logical issues or things that are not super friendly.
>
> I want this to be the most user-friendly, easiest-to-navigate game that has no logical issues and helps you along
> the way. This is to make sure that people don't get lost or stuck as they're playing or deal with annoying issues
> like having to search things up again when it doesn't make sense.
>
> Just do the audit with your full work. You are Fable 5.2, you are incredible, and find all the issues. If you need
> to ask me questions make sure that each question is very impactful. We're not asking 100 questions when really we
> can condense it down into 10 really good questions, with examples of what that looks like or entails, just so I
> have a full understanding. An explain-like-I'm-5 kind of deal.
>
> Do the audit, find issues, and go ahead and just fix them. If you need to throw out a bunch of Opus 5.5 agents,
> whether they're in their own terminals or within your own terminal, go ahead and do everything that you need. You
> have my full permission to go ahead and find issues and just deploy fixes unless questions are needed to be
> answered for either direction, big changes, or anything that you aren't 100% sure about."

(The message's third paragraph reads "Just do a full audit with your full work." in the original.)

## The ten answers

Asked with AskUserQuestion in three rounds (4, 4 and 2), each with an example of what the player sees today and a
mock-up of each option. The owner chose the recommended option every time. Each row gives the question as asked,
the option chosen with its description, and the finding it settles.

### 1. The first companion and old age (finding D20)

**Asked:** "Your first fish dies of old age very quickly, with no warning. The starter betta becomes "Elder" after
about 7 hours of normal-speed play and dies "peacefully of old age" at about 9½ hours (about 3 hours at 3× speed).
Pea puffer: about 9 hours. Seahorse: about 12. Axolotl and clownfish: 25 to 32. What should happen to the first
companion?"

**Chosen: Never dies of old age (Recommended).** "The animal with the "First companion" badge can still get sick or
starve if neglected, but old age never takes it. Every other animal ages as now, and its card gains a lifespan line
and a heads-up near the end." Shown with: "Ember is your first companion and will stay with you as long as you look
after him." and, for any other animal, "Lifespan: about 160 days" and "Koi is in her last stretch: about 6 days
left."

Not chosen: lives about 4× longer; keep it, but warn.

### 2. Out of food and out of money (findings A7, F5)

**Asked:** "A player can run out of food AND money with no way to feed their animals. Example: a child spends the
starting $300 on decorations, the food runs out, and they have $4 while a pack costs $8. Today the Buy button just
greys out. The club's loan only arrives after 3 days in debt (once per game), or after every animal has died. What
should the game do?"

**Chosen: Club food parcel (Recommended).** "When animals are hungry, there is no food they can eat, and there
isn't enough money for the cheapest pack, the aquarium club drops off a small parcel of the right food (at most once
per game day) with a tip on how to earn money. Animals never starve just because the till is empty." Shown with:
"The aquarium club dropped off a little food for Ember. Short on cash? Friends tip when your animals are healthy,
or sell something in Livestock." and a "Ways to raise cash" button.

Not chosen: food on credit; clear words only.

### 3. A production line's unsold young (finding H1; the earlier audit's F3, BACKLOG B-207)

**Asked:** "Production lines can jam for good. A line lists its young as an auction, and an auction only sells when
YOU accept an offer. If you're away or playing fast, the offers lapse, the unsold young go back to the line's
quarantine tank, are never listed again, the tank fills up and the line stops, while the screens say it "restarts
today". (Those wrong screens are being fixed now.) What should a line do with young that didn't sell?"

**Chosen: Sell by itself (Recommended).** "The line puts a fixed "buy now" price on its young (about 10% under fair
value), so a buyer who likes the price just buys them without you. Anything left over is listed again a little
cheaper each time. The line really does run while you play." Shown with: "12 juvenile bettas listed · Buy now $18
each", "Sold 9 juvenile bettas · $162", "3 didn't sell: listed again at $16 each".

Not chosen: list again, I accept; leave them to me.

### 4. An aquarium about to fall out of "Previous autosave" (finding I3)

**Asked:** "Starting another game can silently delete an older aquarium. Example: your daughter's "Coral Cove"
exists only in the autosave. She starts a new game, "Reef Town" (Coral Cove becomes "Previous autosave"). Later she
starts a third: Coral Cove is deleted for good, with no warning. Loading a different save from the title screen can
do the same. What should happen to an aquarium that is about to fall out of "Previous autosave"?"

**Chosen: Save it to a free slot (Recommended).** "The game moves it into an empty save slot by itself and says so.
If every slot is full, it asks before anything is deleted. Nobody loses an aquarium by accident." Shown with: "Coral
Cove was only in the autosave, so it was saved to Slot 2 first." and, with every slot full, "“Previous autosave”
(Coral Cove, Day 12) will be deleted." with Cancel and "Delete and continue".

Not chosen: ask every time; just warn.

### 5. Salt paid for twice (findings C2, F14; the earlier audit's F5, BACKLOG B-207)

**Asked:** "Saltwater tanks pay for salt twice. Example: a 300-gallon reef with an Auto Water Changer is charged
about $12 every night for "salt" inside its running costs, and every water change ALSO uses up the salt mix you
bought in Supplies. Which payment should stay?"

**Chosen: Only the salt you buy (Recommended).** "Salt comes out of the nightly bill. Salt is a supply, like food:
you buy it, water changes use it. Easy to understand, and saltwater tanks get a little cheaper to run."

Not chosen: only the nightly bill; leave both.

### 6. Two "High risk" warnings that cry wolf (findings D3, D4)

**Asked:** "Two "High risk" warnings cry wolf. (1) Goldfish, comets, koi and African dwarf frogs "need a group of at
least two", but the shop only sells them one at a time, so the first one you buy is always "High risk" and makes you
"Confirm the risk first". (2) The clownfish and seahorse starters' own 29-gallon tank is "High risk" for 13 species
whose minimum is 30 gallons: 1 gallon short. In the simulation both cases cause only mild stress. Fix them?"

**Chosen: Fix both (Recommended).** "The shop sells those four group-living animals as pairs, so the first purchase
is fine. And the tank-size warning is graded: a tank that is only slightly small gets a gentle note, a tank that is
much too small stays High risk." Shown with: "Fancy goldfish · pair $36", "Good match. Note: a little under the 30
gal they like. Fine with good care." and "High risk: needs at least 30 gal."

Not chosen: soften the warnings only; leave it.

### 7. Things that can't be got rid of (findings C11, F15, G19, G22)

**Asked:** "Some things can't be got rid of. Spare equipment in storage (an old heater, a filter you replaced) can
never be sold. And a tank you no longer want can only go through a whole-aquarium auction, which unlocks later; when
a room is full the game says "sell a tank" before you're able to. Add simple ways out?"

**Chosen: Both (Recommended).** "The store buys back stored equipment at half price, exactly as it already does for
decorations. And an EMPTY tank gets a "Take down" button: its gear and decor go to storage and you get half the bare
tank's price back. Both show the amount and ask before doing it." Shown with: "Sell · $12" and "Take down the 20
Gallon? Its heater, filter and 4 decor pieces go to storage. You get $30 back for the tank." with Cancel and "Take
down".

Not chosen: equipment only; leave it.

### 8. Keepers and fry (finding H2)

**Asked:** "Hired keepers don't feed babies. An aquarist feeds the grown animals in their tanks, but never fry: baby
fish in a nursery or a production line's raise tank only eat when you feed them by hand or a live-food doser does.
The original design said keepers would feed them on their rounds. (The screens that wrongly claim "Maya feeds this
tank" for a tank of fry are being corrected now.) Should keepers feed fry?"

**Chosen: Yes, keepers feed fry (Recommended).** "On their rounds, keepers give fry their first foods from your
stock (baby brine, infusoria and so on) when you have some, and flag it when there's none. A hired keeper then
really does look after a nursery." Shown with: "Maya feeds the fry their first foods and keeps the water clean." and
"Maya couldn't feed the fry in Nursery 1: no baby brine or infusoria in stock." with "Buy in Supplies".

Not chosen: no, keep it hands-on.

### 9. Shop offers that vanish mid-purchase (finding F6)

**Asked:** "Shop offers vanish while you're still deciding. Most shop stock changes every game morning, which is
every 4 real minutes at normal speed, and "today only" specials last 1 to 2 real minutes. If you're reading an offer
(or picking a tank for it) when the clock ticks over, it's gone, and the game says "Another shop snapped it up". (A
"leaves in…" line and truer words are being added either way.) Should an offer wait for you?"

**Chosen: Hold it while I'm looking (Recommended).** "An offer you have open stays until you buy it or close it,
the same way a bid already waits while you write a counter-offer. The shop still restocks around it." Shown with:
"Leaves the shop this morning. It stays while you're looking."

Not chosen: just show the timer.

### 10. Keeping the online side awake

**Asked:** "The online side of the game falls asleep after a quiet week. Supabase's free plan pauses a project after
about 7 days without use. It is paused RIGHT NOW: nobody can sign in, and Social and shared shops don't work until
someone presses Restore in the Supabase dashboard. (I couldn't press it from here: this session's Supabase
connection only reaches your AnonyForm organization.) How should it stay awake in future?"

**Chosen: Free keep-awake ping (Recommended).** "A small scheduled job in the game's GitHub repo (free) reads one
public value from the project twice a week, so it never counts as idle. No cost, nothing changes for players. It is
a common workaround rather than an official Supabase feature, so it could stop working one day."

Not chosen: leave it, restore by hand; pay for Supabase Pro.

Built as `.github/workflows/keep-online-awake.yml`: Mondays and Thursdays, one request to `resolve_invite` with a
code longer than any real one (the function answers null before it looks anything up, so nothing is read, written or
counted against the invite brake), with the public address and publishable key from `src/social/project.ts`. A
failed request fails the job, and GitHub's email about it is the signal to press Restore.

## Decisions

1. The ten answers above are built in chunk 20 (PLAN.md has what each became in the code and its tests).
2. **Fixes without a question each.** The owner asked for the audit's findings to be fixed without asking about
   each. Every player-visible line the chunk adds or changes is listed in
   `docs/agent/design/CHUNK-20/WORDS.md` for him to read in one place; a line he wants changed is a small follow-up.
3. **Defaults on the decisions that weren't asked.** Where an auditor marked a finding as the owner's to decide and
   it wasn't one of the ten, the rule, balance or mechanic stays exactly as it was, the screens are made honest about
   it, and the question is kept in `docs/agent/OWNER_QUESTIONS.md` (group M, 41 questions) for whenever he wants it.
4. **Waking the Supabase project** needs the owner's own click (Restore, in the project's dashboard), or the Supabase
   connector re-authorised for the "Aquarium Go" organization: the agent's connector reaches only another
   organization, the CLI has no restore command, and reading the CLI's stored sign-in stays off limits.

## As built

Where the game as built differs from an answer's mock-up (the mock-ups were sketches; `docs/agent/design/CHUNK-20/WORDS.md`
has the exact words):

- **Answer 2, the food parcel:** a small amount (about four meals for the hungry animals, not a whole pack), for an
  animal that is very hungry (hunger 70 or more), at most once a game day, one per missing diet, hungriest first.
- **Answer 3, line sales:** the buy-now price is for the whole lot (10% under its fair value), shown per animal with
  cents. Each relisting is 10% lower and at least a dollar lower, down to half of that day's fair value, and never
  asks more per animal than the listing before it (young grow while they are listed). A lot comes off sale while one
  of its animals is unwell, and the line says which animal it waits for.
- **Answer 6:** the verdict's words are the game's own ("Usually compatible" with a note), and "slightly small"
  means at least 90% of the species' minimum, the point up to which the simulation's own stress stays small.
- **Answer 7:** stored equipment sells for a flat half of its catalogue price, whatever its condition. Take down is
  in the Tanks panel's row for the tank (the tank card had three other fixers in it), with the confirm as shown.
- **Answer 8:** a keeper gives a brood at most two servings a round (one while ammonia or nitrite is at Watch):
  young are fed by being offered their food, and more only fouls the water. The stock manager orders what the keepers
  will give, after any food the grown animals have run out of.
- **Answer 9:** the hold lasts while the offer is open, up to about six real minutes past its leaving time (the cap
  a bid's hold has), so a forgotten tab or a dropped connection can't keep an offer for ever.
- **Answer 10** runs from `main` (GitHub runs scheduled jobs from the default branch only), so it starts with the
  0.10.0 release; the first runs fail, by design, until the project is restored.

Defaults taken without a question, under decision 2, that the owner may want to look at first: Settings › About's
"What's new" now describes this release (it listed 0.5's lines); the nursery unlock is called "Breeding know-how"
and says only what it does (it never locked nurseries); "Autosave off" still means nothing saves on its own, and
the game now asks before an in-app reload would lose play (group M has the alternative).

## Consequences

- Answers 1, 2, 3, 5, 6, 8 and 9 change the simulation, so the shared build hash changes: the game and the shop
  server go out together, as in any release that touches `src/sim`.
- Answer 7 adds two commands (selling a stored unit, taking down an empty tank) and answer 9 a hold on a shop offer;
  each has its case in `tests/sim/commands-catalogue.test.ts`.
- Answer 3 replaces the earlier audit's open decision F3, and answer 5 its F5 (BACKLOG B-207).
- Answer 10 adds a second workflow file; pushing it needs the `workflow` scope the owner's GitHub sign-in already
  has (PLAN.md "Releases", 0.5.2).
