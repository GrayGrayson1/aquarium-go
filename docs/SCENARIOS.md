# Scenarios: the scenario lab and its recipes

The scenario lab (chunk 15, ADR-0051) builds any aquarium or setup and plays it in seconds, without playing up to it.
A setup is a **recipe**: a small JSON file that says what the shop, its tanks and its animals are like. You can make
one in the lab, keep it, export it, or ask any agent "make me a scenario with …" and paste what it writes.

It's a developer tool: it runs on this Mac only. The live game ignores the lab's addresses.

## Opening it

- `npm run lab` from `~/LocalTest/AquariumGo` (the internal-disk clone; Vite on the `/Volumes/Dev` image is very
  slow). It starts the dev server and opens http://127.0.0.1:5173/?lab=1. In CNVS, ask an agent to run it.
- In a dev build: the title screen's **Scenario lab** (with Settings › About › Developer tools on), the wrench's
  **Scenarios & fixtures** section, or `__AQ.scenario.open()` in the console.
- A link: `http://127.0.0.1:5173/?scenario=<preset>` builds a preset (built-in by id, such as `ammonia-crisis`, or one
  you kept, by its name), and `?recipe=<text>` builds a recipe carried in the address (the lab's **Copy link** writes
  it).

Your own game on screen is saved first. A built scenario opens **paused**, says "Scenario: … · not saved" at the bottom
(under the tank bar on a phone), and is **never saved over your autosave**: not by the timed autosave, Save now, Save
and return to title, closing the page or the online save. **Start again** builds it fresh from its recipe; **Lab** goes
back to the lab. Saving it to a numbered slot by hand in Settings › Saves still works. The dev build keeps its own
browser storage, apart from the live sites' saves.

## The lab

- **Presets**, left: the built-in ones (below) and **yours**, kept in this browser. **Save** keeps the recipe under its
  name (rename it first to save a copy), **Duplicate** makes a copy to edit, **Delete** removes one of yours.
- **Setup**: the name, where it starts from, the shop (money, day, hour, reputation, facility, everything unlocked,
  research, the guide, food, the Live food room, manual mode) and how it opens (speed, a tank or the room, which tank,
  a warm-up).
- **Tanks**: each tank's size, water, purpose, decor, age, cycled or not, its water numbers, problems (heater stuck
  on, heater broken, filter stopped, chiller stopped), its animals and its eggs or fry.
- **Shop & market**: staff, the stock budget, the shop's offers, animals for sale with bids waiting, show entries and
  show day.
- **JSON**: the whole recipe, editable (it applies as you type, so you can paste a recipe straight in). Copy, Import
  file, Export file, and **Capture the game**, which turns the game on screen into a recipe.
- Right: what it builds, the game's own compatibility verdict for each tank, and **Problems**. A problem never stops
  a build: an *error* means that part is skipped, a *warning* builds it anyway (a bad pairing is something you may want
  to test), a *note* is for information.

## Without a browser

```bash
npm run scenario -- ammonia-crisis --hours 30      # a preset by id, 30 game hours
npm run scenario -- my-recipe.json                 # a recipe file (or a lab export)
npm run scenario -- my-recipe.json --json          # the build's problems and the report as JSON
npm run scenario -- my-recipe.json --save out.json # the world at the end as a save file (Settings › Saves › Import)
npm run scenario -- --list                         # the built-in presets
```

It builds the recipe, runs it forward (the latest check's hour, else 24 hours; `--hours 0` only builds) and prints
what happened: money, births, deaths and why, each tank's animals and water, the game's own log lines, and the
**checks**. It exits with 1 when the build has errors (add `--force` to run what it built) or a check fails, so a
recipe with checks is a test an agent can run.

In the console: `await __AQ.scenario.run(recipeOrPresetName, hours)` does the same without touching the game on
screen; `await __AQ.scenario.play(recipeOrPresetName)` builds and plays it; `await __AQ.scenario.validate(recipe)`
lists its problems; `await __AQ.scenario.capture()` returns the game on screen as a recipe.

## The built-in presets

| Group | Id | What it is |
|---|---|---|
| Start | `sandbox` | Everything unlocked, a million dollars, a showroom and three empty tanks |
| Problems | `ammonia-crisis` | A new tank stocked too fast: ammonia and nitrite up, the filter bacteria barely started |
| Problems | `broke-hungry` | In debt, no food left, every animal starving |
| Problems | `crowded-aggressive` | Far too many fish in 20 gallons, two male bettas and pea puffers |
| Problems | `heater-stuck` | A heater stuck on (the water already too warm), and a chiller stopped in the axolotl tank |
| Breeding | `betta-pair` | A conditioned halfmoon pair courting (the nest built), with a nursery and live food |
| Breeding | `clownfish-eggs` | A clownfish pair that has just spawned beside its rock |
| Breeding | `fry-tank` | Thirty guppy fry in a nursery, and a shrimp colony with shrimplets |
| Showpieces | `prismatic-reef` | A 75 gallon reef; one clownfish is Prismatic |
| Showpieces | `grand-hall` | The biggest room on day 120: eight big exhibits, five staff, reputation 850 |
| Running a business | `staffed-store` | An aquarium store open to the public, with two aquarists, a stock manager and a docent |
| Running a business | `show-day` | A halfmoon betta and a leucistic axolotl entered in today's club shows, judging in an hour |
| Running a business | `market-bids` | Animals listed with buyers' bids waiting, and a Prismatic betta in the shop |

Each is an ordinary recipe (`src/dev/scenario/presets.ts`), so they are also examples of the format.

## The recipe format (version 1)

A recipe is a JSON object. Only `version` and `name` are required; everything else has a sensible default. Tanks and
animals are referred to **by name** elsewhere in the recipe (a listing, a show entry, a line, the tank it opens on).

```json
{
  "format": "aquarium-go-scenario",
  "version": 1,
  "name": "Sick betta in a cold tank",
  "notes": "Fin rot and a heater that died overnight.",
  "seed": 7,
  "shop": { "money": 2000, "day": 5, "hour": 8 },
  "tanks": [
    {
      "name": "Betta Tank",
      "size": "g10",
      "water": "freshwater_planted",
      "equipment": [{ "id": "heater", "failed": "off" }],
      "values": { "tempC": 21 },
      "animals": [
        { "species": "betta", "sex": "male", "name": "Cobalt", "morph": "Royal Blue Halfmoon", "illness": { "kind": "fin_rot", "severity": 50 } }
      ]
    }
  ],
  "checks": [{ "name": "Cobalt survives a day", "afterHours": 24, "tank": "Betta Tank", "alive": { "min": 1 } }]
}
```

### Top level

| Field | What it does |
|---|---|
| `format` | `"aquarium-go-scenario"` (optional; the lab writes it) |
| `version` | `1` (required) |
| `name` | Required. Shown in the game while it plays, and the name it's kept under |
| `notes` | Free text |
| `seed` | Same recipe and seed, same world (default 1) |
| `base` | Where it starts: `"blank"` (default: an empty shop with everything unlocked and researched, the guide finished, $50,000, plenty of food), `"starter:<id>"` (a new game: `axolotl`, `betta`, `pea_puffer`, `ocellaris_clownfish`, `lined_seahorse`, guide on), `"fixture:<name>"` (one of the 46 dev fixtures; `__AQ.fixtures()` lists them), `"current"` (the game on screen; while a scenario built on it plays, the game it was built from, so Start again never stacks; the lab only) |
| `shop` | The shop (below) |
| `tanks` | A list of tanks (below) |
| `staff` | A list: `{ "role": "aquarist" \| "stock_manager" \| "docent", "skill": 1–5, "trait": …, "name": … }` |
| `stockBudget` | The stock manager's daily budget, in dollars |
| `market` | Offers, listings with bids, demand (below) |
| `shows` | `{ "entries": [{ "animal": "<name>", "tier": "club" }], "showDay": true }`: enters each animal in a show of that tier (club, regional, national, international); `showDay` moves the clock to an hour before judging |
| `lines` | Production lines: `{ "mother": "<name>", "father": "<name>", "breed": "<tank>", "raise": "<tank>", "quarantine": "<tank>", "keep": "<tank>", "name": … }`, refused as the Production panel would refuse it |
| `warmupHours` | Run the world forward this many game hours before it opens (at most 30 days) |
| `open` | `{ "tank": "<name>", "view": "tank" \| "facility", "speed": 0 \| 1 \| 3 \| 10 }` (default: the first tank, paused) |
| `checks` | What should be true after some hours (below) |
| `patch` | Anything else: a deep merge into the built game (objects merge, other values replace, `null` deletes). The patched world is loaded through the save path first (what it repairs is reported; a world it can't load is built without the patch), and when it's built to play or run, played for a moment with every tank stepped: a world the game can't play is built without the patches (tanks' and animals' too) |

### `shop`

| Field | What it does |
|---|---|
| `name` | The shop's name |
| `money` | The balance; negative for a shop in debt (kept within ±$1,000,000,000,000) |
| `day`, `hour` | Game day (1 to 36,500) and hour of the day (0 to 23.99). The clock can't go back from a base's own time |
| `facility` | `hobby_room`, `specialty_shop`, `aquarium_store`, `showroom`, `destination`, `grand_hall` |
| `openToPublic`, `admission` | Visitors (not in a hobby room), and the ticket price (0 to 40) |
| `unlocks` | `"all"`, `"none"` or a list of unlock keys (`tank_75`, `reef`, `staff` …; `src/data/unlockKeys.ts`) |
| `research` | `"all"` or a list of finished projects (`reef_systems` …; `src/data/research.ts`); `researching: { "id": …, "hoursDone": … }` is the one under way. A blank shop finishes all research only when `unlocks` is `"all"` (research grants unlocks of its own) |
| `reputation` | 0 to 1000 |
| `mastery` | Points per track: `husbandry`, `breeding`, `aquascaping`, `marine`, `business`, `exhibition` |
| `guide` | `"done"` or `"on"` (only a starter base can play the guide) |
| `inventory` | `{ "foods": "plenty" \| { "<food id>": servings }, "salt": kg, "brineShrimpEggs": scoops, "equipment": [ids], "decor": [ids] }` |
| `waterRoom`, `foodRoom` | The Water room and the Live food room (their research is finished with them) |
| `manualMode` | The shop's automation held |

### A tank

| Field | What it does |
|---|---|
| `name` | Required; the tank's name in the game |
| `size` | A tier (`g5`, `g10`, `g20L`, `g29`, `g40B`, `g55`, `g75`, `g90`, `g125`, `g180`, `g240`, `g300`, `g500`, `g600`, `g800`, `g1000`) or gallons (the smallest tier that holds them). Default: what its animals need |
| `water` | `freshwater_cool`, `freshwater_tropical`, `freshwater_planted`, `marine_fowlr`, `marine_live_rock`, `reef`, `brackish`. Default: its first animal's |
| `purpose` | `display`, `nursery`, `quarantine`, `breeding` |
| `cycled` | Default `true`; `false` is a new filter with no bacteria |
| `ageDays` | How long it has been set up (default 30, or 0 when not cycled) |
| `matchWater` | Default `true`: the water suits its animals first, then `values` apply |
| `values` | Exact water numbers: `tempC`, `pH`, `ammonia`, `nitrite`, `nitrate` (ppm), `oxygen` (0–1), `salinitySG`, `gh`, `kh`, `detritus`, `algae` (0–100), `clarity` (0–1), `bioMaturity` (0–1, the filter bacteria), `foodInWater`, `level` (0.3–1) |
| `equipment` | Pieces to add or change. A string adds one (`"autofeeder"`, `"heater_300w"`). An object changes the tank's own piece of that id or kind, or adds one: `{ "id": "heater", "failed": "stuck_on" }`, `{ "id": "filter", "failed": "off" }`, `{ "id": "light", "on": false }`, `{ "id": "heater", "setting": 30 }`, `{ "id": "lid", "remove": true }`, `{ "id": "filter", "condition": 0.1 }`. Only a heater sticks on. Each entry changes a piece no earlier entry has, so a second `heater` entry adds a second heater. `"exact": true` adds the piece as given, past the game's install limits (a captured tank uses this) |
| `bareEquipment` | Start from no equipment instead of the tier's own kit |
| `substrate` | `bare`, `fine_sand`, `sand`, `fine_gravel`, `gravel`, `aragonite`, `planted_soil`, `large_pebbles`, or `{ "kind": …, "depthCm": …, "color": … }` |
| `decor` | `"auto"` (default), `"none"`, or a list of decor ids (`src/data/catalog/decor.ts`), each a string or `{ "id", "x", "z", "rotY", "scale" }` in tank metres (the game's layout check places it; `"exact": true` with `"y"` puts it exactly there, as a capture does); a list with `"auto"` in it adds to the automatic layout |
| `lights` | `{ "preset": "daylight" \| "warm" \| "planted" \| "reef_actinic" \| "reef_full" \| "moonlight" \| "sunset" \| "cool", "intensity": 0–1.5, "on": hour, "off": hour, "moonlight": true }` |
| `backdrop` | `black`, `deep_blue`, `frosted`, `none`, `rock_3d` |
| `animals` | A list of animal groups (below) |
| `young` | Eggs, larvae or fry: `{ "species": …, "stage": "eggs" \| "larvae" \| "fry", "count": …, "mother": "<name>", "father": "<name>", "nextStageInHours": … }`. Species that carry their young (livebearers, seahorses, berried shrimp) have no loose eggs: ask for fry, or `"breed": "spawned"` |
| `patch` | Anything else on the tank (a deep merge) |

### An animal group

| Field | What it does |
|---|---|
| `species` | Required: a species id (`betta`, `neon_tetra`, `ocellaris_clownfish` …; the lab lists all 48) |
| `count` | How many (default 1, at most 200) |
| `sex` | `male`, `female`, `unknown`, or a plan: `pair` (male, female, …), `mixed`, `females`, `auto` (default). A sex-changing species (clownfish, clown goby, coral beauty, grouper) decides for itself unless you name the sex: `"pair"` gives a bonded male and female |
| `ageDays` / `stage` | Age in game days, or `juvenile`, `adult` (default: a young, mature adult) or `elder` |
| `name` / `names` | Names in order; the rest are named by the game |
| `morph` | A morph by its name (`"Royal Blue Halfmoon"`, `"Leucistic"`, `"Blue Dream High Grade"`); the lab suggests every name the species has |
| `genes` | Pinned genes: `{ "<locus>": ["<allele>", "<allele>"] }`; the rest are rolled. The Problems list names the loci and alleles if one is wrong |
| `potentials` | 0 to 100: `size`, `color`, `pattern`, `structure`, `fertility`, `hardiness`, `temperament`, `curiosity` |
| `prismatic` | `true` for all, or how many |
| `stats` | 0 to 100: `health`, `hunger` (100 = starving), `stress`, `energy`, `social`, `comfort`, `breedingReadiness`, `enrichment` |
| `illness` | `{ "kind": "ich" \| "fin_rot" \| "fungus" \| "swim_bladder" \| "stress_coloration" \| "impaction", "severity": 1–100 }` |
| `injury` | 0 to 100 |
| `breed` | `"ready"`: the first male and female go straight into courtship and spawn within hours of play. `"spawned"`: the build also runs the world forward until they have eggs or young (at most three game days; the Problems list says how long it took) |
| `wild`, `favorite` | Wild-caught; a favourite |
| `patch` | Anything else on each animal (a deep merge) |

### `market`

| Field | What it does |
|---|---|
| `offers` | Livestock at the front of the shop: `{ "species", "count", "sex", "ageDays", "price", "prismatic", "genes" }` (the price defaults to the game's valuation) |
| `clearStock` | Clear the shop's own stock first |
| `listings` | Animals for sale (by name): `{ "animals": ["Ember"], "reserve": …, "buyNow": …, "hours": …, "bids": 3 }`; `bids` is how many of the game's own buyers bid, or a list of amounts |
| `demand` | Demand by species, 0.6 to 1.6 |

### `checks`

Each check is judged once, `afterHours` game hours after the scenario opens (after any warm-up), by the headless
script, `__AQ.scenario.run` and the tests. `tank` and `species` narrow what's counted. Each measure is a range,
`{ "min": …, "max": … }` (both ends included): `alive`, `births`, `deaths`, `clutches`, `money`, `sales`, `ammonia`,
`nitrite`, `nitrate`, `tempC`, `pH`, `oxygen`, and the average `health`, `hunger` and `stress` of the animals counted.
A check without a usable `afterHours` (0 to 8,760) fails, rather than being skipped.

```json
{ "name": "The fry make it to a week", "afterHours": 168, "tank": "Fry Nursery", "species": "fancy_guppy", "alive": { "min": 10 } }
```

## Asking an agent for a scenario

Give the agent this file and say what you want, for example: "Make me a scenario recipe (docs/SCENARIOS.md) with a
reef tank where the skimmer has stopped, nitrate at 60, two Prismatic clownfish and a hungry mandarin, opening at
3×." Paste what it writes into the lab's JSON tab, or save it as a file and run `npm run scenario -- file.json`. An
agent can test its own recipe first with `npm run scenario -- file.json --hours 0`, which lists any problems.

## What it doesn't do

- Shared shops: the lab is solo (a shared shop runs on the server; ADR-0051 decision 1).
- `current` and Capture copy what a recipe can say; the market's listings and bids, shows, history and the log
  aren't carried over.
- A recipe can't move the clock back from a base's own time, and a fixture base needs the dev build or Node (the
  fixtures are dev code).
