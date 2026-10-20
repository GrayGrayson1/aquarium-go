# Trust boundary: the state changes a future server would authorise (REL-016)

Written in chunk 6 (2026-10-15) for REL-016. Aquarium Go is local single-player: the browser holds the whole game
and nothing is checked anywhere else (ADR-0005; REL-002 keeps real multiplayer, accounts and a backend for later, with
the owner). This lists what a server would have to authorise if one ever owned the economy, so the work is visible
before anyone starts it.

**How state changes today.** Game state changes only through the store (`useGame.mutate` for the player's actions,
`mutateFast` for the game loop, `setGame` for a whole new world), and every player action is one function in
`src/sim` that takes the state and returns an `ActionResult` (`ok`, a message). `tests/sim/core-mutation-boundary.test.ts`
checks that nothing else writes the game, that the render frame loop never does, that the UI reaches Social only
through the `SocialService` and the browser's notifications, clipboard and share sheet only through `src/platform`. So
each action below is already a single call a server could receive instead; what it would add is the checks in the
right-hand column, done on its side.

**What a server would always check:** the player's money and stock (no spending what isn't there), that the player owns
what the action names (tank, creature, listing, line), the price from its own catalog and market, never the client's,
and the game time (offline catch-up is computed on the device today: a server would replay or cap it).

## Purchases

| Action (src/sim) | What it changes | A server would check |
|---|---|---|
| `buyOffer` (economy/purchases) | money −, a creature into a tank | the offer exists and is unsold, its price, room in the tank |
| `buyTank`, `placeTank` | money −, a tank | price, the facility's tank limit, placement |
| `buyEquipment`, `installEquipment`, `repairEquipment`, `removeEquipment`, `setEquipment` | money −, a tank's gear | price (or the piece is in the player's stock), the tank is the player's |
| `convertWaterClass` | money −, a tank's water class (it empties and restarts its cycle) | the conversion's price, the tank is empty of animals that can't stay |
| `buyFood`, `buySalt`, `buyEggs` | money −, stock + | price, pack size |
| `placeDecor`, `moveDecor`, `removeDecor`, `addFixture`, `removeFixture`, `changeSubstrate` | money −, a tank's layout | price, unlocks |
| `upgradeFacility`, `upgradePrep`, `addReservoir`, `addCulture` | money −, the facility | the level's requirements, price |

## Sales and listings

| Action | What it changes | A server would check |
|---|---|---|
| `createListing` (economy/listings) | a creature, a tank's residents or frags listed | ownership; reserve and buy-now in range |
| `acceptBid`, `declineBid`, `counterBid`, `holdBidForCounter` | money +, creatures leave | the bid is open and real (buyers are simulated today; with other players they would be people) |
| `withdrawListing` | a listing closes | ownership |
| `quickSell`, `quickSellFrags`, `sellFragsToStore` | money +, animals or frags leave | the store's price |
| `forceBuyerVisit` | a buyer arrives | dev tools only (never in a player's build) |

## Production lines

| Action | What it changes | A server would check |
|---|---|---|
| `createLine`, `endLine`, `renameLine` | a line (pair, tanks, rules) | the facility's line slots; the pair and tanks are the player's |
| `setLineRunning`, `setLineRule`, `setKeepRules`, `setLinePair`, `setLineTank` | a line's settings | as above |
| `addQuarantineTank` | money −, a tank | price |
| `waitForLine` | a decision note | none beyond ownership |
| the line step (moves, sorts, quarantines, auto-listing) | creatures move; listings | it runs in the simulation: a server would run it, or check its results |

## Staff

| Action | What it changes | A server would check |
|---|---|---|
| `hireStaff`, `fireStaff` | wages from tomorrow; notice pay | the pool's candidates, wage |
| `assignTank`, `autoAssignAll` | who looks after which tank | ownership |
| `setStockBudget`, `setStockOrders` | the stock manager's daily spend | the facility's budget cap |
| the stock manager's checks (purchases at 9 AM and 3 PM) | money −, stock + | simulated today; the same purchase checks as above |

## Research

| Action | What it changes | A server would check |
|---|---|---|
| `startResearch`, `cancelResearch` | money −, a project running | requirements, price, one at a time |
| `claimQuest` | money +, reputation + | the quest's conditions were met |
| `tutorialAdvance`, `tutorialSkip` | a guide step's reward; skipping grants the essentials a player would earn | the step's objective was met; skipping once |

## Shows

| Action | What it changes | A server would check |
|---|---|---|
| `enterShow`, `withdrawEntry` | money − (the fee), an entry | the class rules; the entrant is the player's |
| judging | prizes, trophies | simulated today; with other players a server would judge |

## Facility, animals and care

| Action | What it changes | A server would check |
|---|---|---|
| `setOpenToPublic`, `setOpenHours`, `setAdmission`, `toggleSignage` | visitors and takings | ranges |
| `moveCreature`, `separateCreature`, `moveClutch`, `startBreeding`, `renameCreature`, `toggleFavorite` | animals and broods | ownership |
| `takeFrag`, `plantFrag`, `dose`, `waterChange`, `topOff`, `cleanTank`, `feedTank` | tanks and animals | ownership; stock for what they use |
| `noteInteraction`, `registerGlassTap` (watching, photos, target feeding, a tap on the glass) | an animal's bond, enrichment and stress; quest progress | rates (the bond counts toward a show's deportment score; the device's diminishing returns would be the server's) |
| `renameTank`, `setTankPurpose`, `setBackdrop`, `setLighting` | a tank's name, purpose, backdrop and light hours | ownership |
| `setManualMode`, `holdAll`, `resumeAll`, `setHold` | automation on or off | none beyond ownership |

## Social

The Social panel talks to the `SocialService` interface (`src/social/service.ts`). Chunk 8 (stage 1, ADR-0038) gives
it a real server for players: a Supabase project whose database the browser reaches only through security-definer
functions (`supabase/migrations/20261019000000_stage1.sql`; ARCHITECTURE.md "Online"). Social still changes no game
state (trades are "open later", ADR-0034), and the online save is a copy of the local one, not a second source of
truth.

**Stage 1 trusts the browser on purpose** (ADR-0038: people the owner knows). What the server checks today: who is
calling (every function checks `auth.uid()`), sign-up (a club's invite code, the 13-and-over box, a name), that only
the owner creates clubs, the online save's revision and that an older build never writes over a newer one's save,
and the size limits (a save body of 4,000,000 characters, a picture of 200,000, names and blurbs). What it doesn't
check, and stage 2 must, before anyone the owner doesn't know joins:
- **The save itself.** `put_save` stores whatever the browser sends: an edited save goes online as it is, and another
  device would load it (`repairState` still validates every value on load, so a crafted save can't break the game,
  but it can hold any money or animals). Stage 2: the server checks saves, or receives the actions above instead.
- **The leaderboard numbers.** `report_standing` takes the browser's collection value, Prismatics and show wins; a
  player could report any number to their friends and club. Stage 2: the server computes them from a save it checked.
- **The friends' pictures.** Any embedded JPEG or WebP within the size limit is shown to friends. Stage 2: moderation,
  or pictures the server renders.
- **Names and club names** others see, unmoderated (only the owner creates clubs in stage 1).
- **Rate limits.** Supabase's own limits cover sign-up and sign-in (30 per 5 minutes per address; a sign-up tests a
  code, so someone with many addresses could still find one in hours), and `resolve_invite`, which answers anyone,
  stops answering everyone after 100 wrong codes in 10 minutes (one brake, no addresses kept; it answers "braked",
  the same for every code, and the game shows its network message with sign-up still open; anyone can hold it with
  a trickle of wrong codes: stage 2 wants per-caller limits). Invite codes are the club's word and four letters
  (ADR-0042). Since chunk 9 (the audit's A1) a read-only call (the API runs a GET that way), which couldn't count a
  wrong code, gets the brake's answer for every code, and `add_friend` answers it the same for a right and a wrong
  friend code. The other functions have none: a signed-in player could call them
  as fast as they like, and could try friend codes (NAME-XXX, 32,768 per visible name) through `add_friend` to send
  requests. Stage 2: per-account limits.
- **Joining clubs.** Anyone signed in may join any club; the invite code gates only sign-up.

## Not for a server

Camera, panels, settings, notification preferences and the alerts drawer's read marks (`markAllRead`, `clearAllEvents`)
are the device's own. Dev tools (`devOpenMarket`, `devAgeCreature`, `devForceBreeding`, `forceBuyerVisit`, the dev
panel's writes and `window.__AQ`'s write calls) are off in a player's build, and since chunk 7 (B-190, REL-019) the live
site ignores `?dev=1`: only the e2e base-path build, made with `VITE_E2E_DEV_URL=1`, honours it. A player still owns
their device and its code, so a server (stage 2, ADR-0038) trusts nothing it reports.
