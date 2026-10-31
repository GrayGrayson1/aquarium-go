# Changelog

The version shows on the title screen (top corner) and in Settings › About, and the "new version is ready" prompt
names it. Every deploy bumps `version` in package.json and adds an entry here: patch (0.3.x) for fixes and small
additions, minor (0.x.0) for new features. `tests/sim/version.test.ts` fails if the two disagree.

## 0.9.0 — 2026-10-30

- **18 big-tank species (79 → 97),** each with its own look, behaviour, colours and care, young and grown:
  - **Freshwater:** oscar, clown loach, black ghost knifefish, fahaka puffer, ornate bichir, silver arowana, koi and the
    motoro stingray.
  - **Brackish:** silver mono and spotted scat.
  - **Marine:** blue tang, naso tang, queen angelfish, clown triggerfish, panther grouper, and three sharks that stay
    small enough for a big tank: the coral catshark, the epaulette shark and the brown-banded bamboo shark.
- **No animal in the shop before its tank.** The shop stocks a species only once you've unlocked a tank big enough for
  an adult, on top of its research, for every species, some from 0.8.0 too: freshwater angelfish, swordtails, fancy
  goldfish and a dozen small marine animals wait for the 40 Gallon Breeder, the emperor angelfish for the 240. A locked
  card says what's still missing, and unlocking a tank size brings its animals in with a notice. Animals you already
  own stay.
- **Two research projects:** Big-water Freshwater ($3,000, 60 h) opens the river giants, and koi with Cool-water
  Systems; Shark & Ray Husbandry ($8,000, 96 h) opens the sharks and the ray.
- **Five foods** come into the shop with the first animal that eats them: Koi Sticks, Floating Carnivore Sticks,
  Frozen Squid, Prawn & Mussel, Frozen Shell-on Shellfish and Live Crickets.
- **Koi** in their classic varieties (Kohaku, Showa, Taisho Sanke, Shiro Utsuri, Asagi, Tancho, the Ogons and more,
  with Doitsu and Ginrin scales), and a Koi class at the club shows and up. Two new sellers: Blackwater River Imports
  and Mermaid's Purse Shark Hatchery.
- **New ways to breed.** The sharks lay egg cases, on the sand or tied to the rock; some are duds with no embryo,
  which you can lift out (Livestock › Eggs & fry) before they rot. The motoro gives birth to live pups. The oscar
  spawns on a stone it has scrubbed clean and the pair guard their eggs and young, and now so do the discus,
  freshwater angelfish and German blue ram; the green chromis male clears a nest on the sand and guards it alone, and
  its larvae want live copepods in a nursery.
- **New behaviours.** The motoro glides flat over the floor and buries itself in sand to rest, eyes showing. The
  epaulette walks on its fins. The bottom sharks rest on the floor by day, and the black ghost knifefish comes out at
  night. The arowana cruises just under the surface, clown loaches rest on their sides, and the fahaka settles on the
  sand.
- **Rare forms** the hobby reports but hasn't proven: the Borneo clown loach, butterfly koi, the platinum arowana and
  the white ghost knifefish.
- **Saves** use a new format. An older copy of the game asks you to refresh rather than open them. When you load,
  shop offers for animals you can't house yet are taken off the shelf.

## 0.8.0 — 2026-10-25

- **31 new species (48 → 79).** Each has its own look, behaviour, colours and care, and all are in the shop from the
  start: the freshwater ones on day one, the marine ones once you've researched Marine Systems.
  - **A friend's reef:** emperor angelfish, sailfin and chocolate tangs, lyretail anthias, melanurus wrasse, maroon
    clownfish, elegant starfish, fighting conch, scarlet reef hermit crab, and the Mexican turbo, Nassarius, Astraea
    and Cerith snails.
  - **Reef favourites:** flame angelfish, six-line wrasse, lawnmower blenny, flame hawkfish, yellowtail damselfish,
    emerald crab, tuxedo urchin, sand-sifting starfish, and the bubble-tip anemone as a living animal.
  - **Freshwater favourites:** freshwater angelfish, German blue ram, harlequin rasbora, zebra danio, platy, swordtail,
    dwarf gourami, ghost shrimp and ramshorn snail.
- **The hobby's real colour forms,** such as the angelfish's marble, zebra, koi and veil, the platy's Mickey Mouse and
  wagtail, and the maroon's Lightning and Gold Nugget. A species with no named forms has "Richly coloured" ones.
- **Young and male/female colours.** A young emperor angelfish is dark blue with white rings, male anthias turn
  magenta, female and young dwarf gouramis are silver, and a maroon clownfish's female is much bigger than her male.
- **New behaviours.** Wrasses, sea stars and Nassarius snails bury themselves in the sand. The six-line wrasse sleeps
  in a mucus cocoon in the rock. A group of anthias or melanurus wrasses turns one female into its male. The tuxedo
  urchin carries bits of debris, and hawkfish perch on the rock. A living anemone wanders until it settles, hosts your
  clownfish, and now and then splits in two.
- **Autofeeders** now drop the food the tank most needs, so a big clean-up crew no longer outvotes the fish. They also
  pass over food made for other animals (axolotl pellets in a reef) while something that suits is in stock.
- **Snails, shrimp, loaches and hermit crabs** now sit on the rock as it's drawn, not just above it.
- **Fixes:** a death from injuries now names the animal that did the most harm, and a fish harassed without a break no
  longer lingers near death for good. An axolotl no longer settles inside a plant's crown or stays wedged between a
  plant and the glass: it lands where it fits.
- **Saves** use a new format. An older copy of the game asks you to refresh rather than open them.

## 0.7.0 — 2026-10-22

- **Shared shops: the money pool and spending tiers.** Everything a shared shop earns goes into one pool, and the
  shop's owner decides how each member may spend it, in the members list (the strip's "Here:" line):
  - **Three tiers.** Spends freely (everyone starts here, so a shop plays as before), Allowance (an amount each game
    day, filled back up when a new day starts; what isn't spent doesn't pile up) and Asks first. The owner can also let
    chosen members approve requests and give money, beside the switch for pause and speed.
  - **Asking for money.** The strip's Money button shows what a member can spend, and Shop money shows the pool. A
    member asks for an amount there, saying what for if they like; the owner and the approvers get a pop-up and a count
    on Money, and approve or decline. Approved money is the member's to spend, after their allowance, until it's spent.
    Approvers can also give a member money without being asked, for something special like a Prismatic. The pool only
    drops when something is bought.
  - **The limits.** A purchase over what a member can spend is refused, saying what it costs and what they can spend.
    Caring for the animals is open to everyone; staff and the stock budget need Spends freely, because they keep
    spending.
- **Phones:** the shared shop's strip gives who's here a row of its own.

## 0.6.0 — 2026-10-21

- **Shared shops: one aquarium a club plays together, live.** A club's shared shop has its own money, tanks, animals,
  staff, research and shows, separate from everyone's own game: nothing carries over either way, and it isn't on the
  leaderboards. Up to 10 club members play it at once, each on their own device.
  - **Opening one.** The club's owner creates it from the club's card in Social, choosing its starter and its name; any
    member opens it from the same card, or from the title screen once they've opened it before. The first visit after a
    quiet spell takes up to a minute while the shop's server wakes.
  - **Your own aquarium waits.** It's saved before you go in, and "Back to my aquarium" brings it back as you left it,
    with no time passed while you were in the shared shop.
  - **Playing together.** Everyone sees everything as it happens. Your alerts show what the others did, with their
    names, and big moments pop up: a pause, a speed change, a sale or purchase over $100. When two people go for the
    same thing at once, the first one wins and the second is told who. The owner, and the members the owner chooses,
    can pause and change the speed. Listing photos show for everyone.
  - **Fair use.** The shop runs while someone is playing and pauses when nobody is ("Still here?" asks after half an
    hour without a tap). When it has been empty a while, it catches up at most 12 game hours, with nothing dying. It
    runs on a free server, so shared shops close for the rest of a month that uses up its free data or hours, and say
    when they open again.
- **Steadier numbers under the hood.** The game's arithmetic is now the same on every browser, so shared shops stay in
  step everywhere (your own game's numbers may differ from before in the last decimal places).

## 0.5.6 — 2026-10-20

- **Your saves keep your newest progress.** Loading, replacing or importing an older copy of the aquarium you're
  playing no longer loses the newer one: it stays in Settings › Saves as "Previous autosave" or "Previous copy of …".
  Load saves the game you're playing first, even with autosave off, and a newer copy kept only in the autosave is
  saved to a free slot first; Import into a slot that holds a save asks first; and Replace and Import say what is kept
  and what goes.
- **Load online save keeps your other aquariums.** An aquarium kept only in the autosave is saved to a free slot
  first. With every slot full, nothing loads and the game says so.
- **Two tabs, two accounts.** Signing out, or in as someone else, in one tab is noticed in your other tabs, and the
  online save only ever goes to the account a tab shows.
- **Tank sales are priced on what's alive.** Welfare, compatibility, beauty and the display bonus raise the value of a
  tank's animals and plants, not its glass and equipment, and decor is valued at its normal price: one cheap animal no
  longer makes a freshly dressed kit sell for a profit.
- **Safer invite codes.** A code can't be tested faster than the limit on wrong guesses allows.

## 0.5.5 — 2026-10-19

- **Aquarium Go online, for people with an invite.** Open a friend's invite link, or "Create account" in Social, to
  make an account with your email, a password, the name friends see and the club's invite code (for 13 and over; a
  parent signs up for a younger player). Your game keeps saving on this device and plays offline as before.
  - **Your save follows you.** While you're signed in, the game also saves online every couple of minutes and when you
    leave. On another device, sign in from Social inside a game and pick which copy to keep; the one you don't load
    stays in Settings › Saves as "Previous autosave".
  - **Friends and clubs.** Add friends by friend code and accept their requests, see your friends' aquariums, join
    clubs, and compare collection value, Prismatics and show wins with friends and club members. Trading opens later.
  - **Settings › Account** shows who you're signed in as and your friend code, signs you out, and deletes your account
    and everything stored with it. "Your account and your data" says what is stored and why: no ads, no tracking, no
    emails.
- **Fairer selling and visitors.** A buyer never pays more than their limit, however you counter, and once bidding
  closes you can accept an offer but not counter it. Very high admission prices now drive visitors away, and the
  rules cap admission at $40, like the slider.
- **Research gates hold everywhere.** Brackish, marine and reef tanks need their research before you can buy or
  convert them, wherever you try.
- **The live site ignores `?dev=1`**: the developer tools are only in a developer's own build.

## 0.5.4 — 2026-10-18

- **"Best foot forward" says what it asks:** "Enter a show and see it judged. A healthy, settled adult that trusts you
  shows best." (Since 0.5.2 the quest completes when your entry is judged.)
- **Settings' "Save now" sits on the General and Saves tabs only**, so Play & access, Notifications and About show
  more before you scroll on a phone.
- **Safer saves across versions.** A future version that adds a water type, show tier, buyer type, staff role or
  trait, kind of rare animal, Water Prep Station level or reservoir space marks its saves as newer. If you then open an
  older version, it leaves that save alone and asks you to refresh the page instead of changing it.

## 0.5.3 — 2026-10-15

- **Closer to the 0.5 design on phones and desktops.**
  - An offer's buy bar sits at the foot of the sheet, just above the tab bar, and offer cards show the animal's whole
    name.
  - A scrolled tab strip (Settings' on a phone, for one) shows whole labels, and Settings and the tank card have their
    grabber on phones.
  - The alerts drawer has its title and a close button; its "Turn on" is easier to spot.
  - Operations' header stays on screen on tablets held upright, and messages and prices follow the design's sizes.
  - Smaller touches: the Genetics Lab card says it reveals hidden carriers in the shop, the Encyclopedia keeps its tabs
    on a species page, Supplies marks the Auto Water Changer as new, and a notification category reads off until the
    browser allows notifications.
- **Operations and production lines.**
  - "Add a quarantine tank" from the alerts bell now works (its dialog used to close itself).
  - Operations and Production use their approved wording throughout; Problems shows a long run of days as a range
    ("Days 39–44").
  - On the Map, each Autofeeder food has its own tile, and a room you haven't built lists what it needs.
- **Smoother big facilities.** Tanks out of view move their animals at a quarter of the pace, which leaves more time
  for the ones you're watching.
- **Sturdier saves.** A save with a team member, trait, clock or birth date the game can't use is repaired on loading
  instead of breaking payday; the "Double Long-fin" rename also reaches your Prismatic finds, listings and
  discoveries.
- **Smaller fixes.**
  - A game paused by an error no longer catches up when you come back to its tab.
  - Switching panels from a bottom sheet moves the keyboard focus to the new panel.

## 0.5.2 — 2026-10-15

- **Production lines** in Livestock › Production. Pick a breeding pair and the tanks to use, and the line breeds,
  raises the fry, keeps the ones your rules choose, quarantines the rest for a week and lists them on the Market.
  - Each facility level adds line slots (one in the Hobby Room, up to eight in the Grand Hall); lines can share
    tanks, and a line waits (no animals are lost) when its grow-out tank is full. Add a quarantine tank in one tap.
  - Every line has a switch, its stages, its route between tanks, this week's sales and its costs.
- **Operations** in the dock (Settings moved to the gear at the top). Overview, Water, Feed, Lines and a map of your
  facility, with what needs you first.
  - **The Water room** (research Central Water Supply): fresh and salt water reserves, salt mixing twice a day, and
    Auto Water Changers that draw from them. Salt mix comes in 5, 20 and 40 kg bags.
  - **The Live food room** (research Live Food Cultures): a brine shrimp hatchery, infusoria jars and live-food
    dosers that feed fry and larvae three times a day.
  - Your stock manager buys salt and brine shrimp eggs within a daily budget you set. The Operations Desk research
    adds Problems, the week's money, today's schedule and Hold all (manual mode).
- **Easier to see and use.** High contrast now makes panels, the top bar and messages solid, with stronger focus
  rings, borders and selected tabs; the keyboard reaches every control, also in Safari.
- **Move tank** on the tank card: pick a new spot for the tank without emptying it.
- **If the game keeps hitting an error**, it pauses and offers Save and Reload instead of failing quietly.
- **Sturdier saves.** A damaged or hand-edited save is repaired on loading (impossible numbers, endless lists,
  unknown names) instead of breaking the game.
- **Smaller fixes.**
  - The bristlenose fin look "Super Long-fin" (two copies of Long-fin) is now "Double Long-fin", so no two looks share
    a name, and a morph's rarity follows how often shops stock it.
  - The Water room warns when fresh water would run short at the salt mixer's checks in the week ahead.
  - Withdrawing a show entry no longer counts toward the "Enter a show" quest.
  - Settings › About lists what's new in 0.5.

## 0.5.1 — 2026-10-11

- **A sharper Market.**
  - "Prismatic only" and "Rare genes" filters, each with a count, and Clear filters when nothing matches.
  - Offers are named after their morph (for example Royal Blue Butterfly Halfmoon), show its rarity tier and say how
    often sellers stock that look.
  - An offer's page shows its genes and temperament, how it fits each of your tanks and why a tank won't do, and what
    you'd need to buy it.
  - A dot on the Market when rare stock arrives.
- **New betta genetics.** Cambodian and Metallic genes and a tenth named strain, the Cambodian Veiltail. The betta
  colour catalog grows from 240 to 540 entries, and Legendary now means rarer than 1 in 10,000.
- **The Genetics Lab shows every animal's genes**, including animals you had before researching it (they used to show
  only rough words).
- **Encyclopedia:** a genes line on the betta page and a new science article, "How genes combine: dominant, recessive
  and additive".
- **The water report** names its stability: Stable, Sensitive or Fragile.
- **Automation on the tank card.**
  - The Auto Water Changer ($120): it changes 10% of the water every morning at lights-on and scrapes the glass once a
    week, and keepers leave routine changes to it. Saltwater tanks need salt mix in stock.
  - Auto-feed (with Meals a day) and Auto-clean have their own switches on the tank card's Equipment tab, and you can
    buy them there.
  - An alert when Auto-feed is paused and an animal is getting hungry.
- **Notifications.** Settings › Notifications can send system notifications while the game is open in another tab or
  window: rare stock, bids and sales, auctions ending soon, eggs and births, show results and animal-care warnings.
  Quiet hours run from 10 PM to 8 AM (you can switch them off). Tapping a notification opens the right screen.

## 0.5.0 — 2026-10-06

- **Links to every screen.** Each screen has its own address (for example `…/#/shop` or `…/#/settings/about`).
  - The browser's Back and Forward buttons move between screens.
  - A link to a screen opens your latest save and goes straight there, and a reload brings you back to where you were.
  - Offers have a Copy link button.
- **A tab bar on phones.** Tanks · Livestock · Market · Build · More, with everything else in the More sheet. Panels
  open at full height under the top bar, and the guide shows the way to Research.
- **Locked places say what opens them.** Visitors and Shows open a panel explaining how to unlock them.
- **Safer saves.** A save made by a newer version is never treated as damaged or overwritten by an older copy of the
  game still open in another tab; that copy asks you to refresh instead.
- **Steadier play.** A game step that fails part way no longer leaves half its changes, time already simulated isn't
  simulated again when you come back to the tab, equipment no longer breaks during the catch-up for time away, and
  resuming a save never keeps a catch-up that failed part way.

## 0.4.0 — 2026-10-05

- **Prismatic animals.** A rare, permanent rainbow shimmer, about 1 in 4,096 stocked animals and 1 in 8,192 young bred
  in your shop.
  - A Prismatic parent makes it likelier in each youngster (×4, or ×8 with two Prismatic parents), never certain.
  - Each one is worth about 12× an ordinary animal.
  - Look for the sheen and sparkles in the tank, the badge in the shop, cards and lists, and the "Prismatic!"
    achievement.
- **Named strains.** Recognised combinations such as the Black Samurai betta, the Misbar Snowflake clownfish and the
  Red Pinto seahorse.
  - Logged when you first breed or buy one; each adds a modest premium to value.
  - Breeding forecasts show strain odds and the pair's Prismatic chance.
- **Morph catalog.** Each species page shows every colour and combination its genetics can produce, as a colour tree
  rated from Common to Legendary by how often sellers stock it. Unseen entries hint only at traits you've already met.
- Saves from earlier versions load unchanged: no existing animal turns Prismatic, and past strains are recognised.

## 0.3.1 — 2026-10-01

- Version numbers: shown on the title screen and in Settings (with the build's commit and date), and the reload
  prompt names the new version.

## 0.3.0 — 2026-10-01

- Equipment and food "fit" warnings before and after you buy: the Autofeeder says when it can't feed a tank (frozen- or
  live-food eaters such as seahorses), strong flow is flagged for gentle-flow species, skimmers fade in brackish water,
  and heater setpoints are checked against the residents.
- Food rows say which of your animals eat them, with an Autofeeder OK / Hand-feed chip.
- Attention dots on tanks (switcher, tank card, tabs, Tanks list, room view), Shows results, Market bids and finished
  research; the bell counts unread news; "Clear all" in the notification drawer.
- Feeding notes and "In real life" tips for all 48 species; actions that used to fail silently now say why.

## 0.2.1 — 2026-10-01

- Review fixes: safer saves, an update prompt when a new version is live, smoother onboarding.

## 0.2.0 — 2026-09-30

- Audit fixes across saves, exploits, softlocks, smoothness and UX.

## 0.1.1 — 2026-09-28

- Smooth play on PCs and 4K screens; Render static-site blueprint.

## 0.1.0 — 2026-09-23

- Aquarium Go: living-aquarium tycoon, first public release.
