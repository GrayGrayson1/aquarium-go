# Changelog

The version shows on the title screen (top corner) and in Settings › About, and the "new version is ready" prompt
names it. Every deploy bumps `version` in package.json and adds an entry here: patch (0.3.x) for fixes and small
additions, minor (0.x.0) for new features. `tests/sim/version.test.ts` fails if the two disagree.

## 0.5.4 — 2026-10-18

- **"Best foot forward" says what it asks:** "Enter a show and see it judged. A healthy, settled adult that trusts you
  shows best." (Since 0.5.3 the quest completes when your entry is judged.)
- **Settings' "Save now" sits on the General and Saves tabs only**, so Play & access, Notifications and About show
  more before you scroll on a phone.
- **Safer saves across versions.** A future version that adds a water type, show tier, buyer type, staff role or
  trait, Water room upgrade or kind of rare animal marks its saves as newer. If you then open an older version, it
  leaves that save alone and asks you to refresh the page instead of changing it.

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
