/**
 * chunk 17 (ADR-0053) — the compatibility rules the three bottom sharks share (the sharks research's matrix, design
 * §11). Lane species-marine. Pure data.
 */
import type { CompatExceptionRule } from '@/types';

export function sharkRules(o: { crushesShells: boolean; bambooAdult?: boolean }): CompatExceptionRule[] {
  return [
    { other: 'tag:crustacean', verdictFloor: 'incompatible', reason: 'Crabs and shrimp are a bottom shark’s main food: it eats any crustacean in the tank.', incidentRisk: 0.35 },
    { other: 'tag:shrimp_large', verdictFloor: 'incompatible', reason: 'Cleaner and peppermint shrimp are eaten.', incidentRisk: 0.35 },
    { other: 'tag:fish_tiny', verdictFloor: 'incompatible', reason: 'Tiny fish are caught asleep at night.', incidentRisk: 0.3 },
    { other: 'tag:fish_benthic', verdictFloor: 'high_risk', reason: 'It roots through the sand and burrows at night and catches bottom-sleeping fish.', incidentRisk: 0.15, mitigatedBy: ['hides'] },
    { other: 'tag:fish_small', verdictFloor: 'high_risk', reason: 'Small fish asleep near the floor are eaten at night.', incidentRisk: 0.1, mitigatedBy: ['cover', 'hides'] },
    { other: 'mandarin_dragonet', verdictFloor: 'incompatible', reason: 'A slow bottom fish the shark finds by smell at night.', incidentRisk: 0.3 },
    { other: 'peacock_mantis_shrimp', verdictFloor: 'incompatible', reason: 'The shark attacks it, and its strike can maim a resting shark.', incidentRisk: 0.3 },
    { other: 'lined_seahorse', verdictFloor: 'incompatible', reason: 'Slow seahorses are eaten or bullied, and their gentle tank can’t carry a shark’s waste.', incidentRisk: 0.2 },
    { other: 'dwarf_lionfish', verdictFloor: 'high_risk', reason: 'Both rest on the bottom, and a shark that grabs a lionfish is stung by its venomous spines.', incidentRisk: 0.05 },
    { other: 'emperor_angelfish', verdictFloor: 'high_risk', reason: 'Large angelfish pick at a resting shark’s skin and eyes.', incidentRisk: 0.08, mitigatedBy: ['tank_size'] },
    { other: 'queen_angelfish', verdictFloor: 'high_risk', reason: 'Large angelfish pick at a resting shark’s skin and eyes.', incidentRisk: 0.08, mitigatedBy: ['tank_size'] },
    { other: 'miniatus_grouper', verdictFloor: 'high_risk', reason: 'Groupers eat young sharks and fight them for caves and food.', incidentRisk: 0.08, mitigatedBy: ['tank_size', 'hides'] },
    { other: 'panther_grouper', verdictFloor: o.bambooAdult ? 'conditional' : 'high_risk', reason: o.bambooAdult ? 'A grown bamboo shark is too big for a panther grouper, but the grouper eats its young and egg cases and fights it for the floor.' : 'Groupers prey on young sharks and compete for the floor and caves.', incidentRisk: 0.08, mitigatedBy: ['tank_size', 'hides'] },
    { other: 'clown_triggerfish', verdictFloor: 'incompatible', reason: 'Triggerfish bite and nip bottom sharks, and the clown trigger is among the most aggressive.', incidentRisk: 0.3 },
    // the good tankmates (Chewy's list): they steal food, so the shark is target-fed; a shark tank can never be treated
    // with copper, so whatever joins it is quarantined first (design §11)
    { other: 'tag:tang', verdictFloor: 'usually_compatible', reason: 'Tangs are good shark tankmates, but they catch whitespot and a shark tank can never take copper: quarantine them first. They grab food fast, so target-feed the shark.', incidentRisk: 0.01, mitigatedBy: ['target_feeding'] },
    { other: 'lyretail_anthias', verdictFloor: 'usually_compatible', reason: 'Mid-water anthias are good shark tankmates; they feed fast, so target-feed the shark.', incidentRisk: 0.01, mitigatedBy: ['target_feeding'] },
    { other: 'foxface_rabbitfish', verdictFloor: 'usually_compatible', reason: 'Large and peaceful, and too big to be tried; it feeds fast, so target-feed the shark.', incidentRisk: 0.01, mitigatedBy: ['target_feeding'] },
    { other: 'maroon_clownfish', verdictFloor: 'usually_compatible', reason: 'A big, feisty clownfish that keeps to its anemone; target-feed the shark.', incidentRisk: 0.01, mitigatedBy: ['target_feeding'] },
    { other: 'tag:dwarf_angelfish', verdictFloor: 'conditional', reason: 'Dwarf angels may pick at a resting shark, and one asleep near the floor can be caught.', incidentRisk: 0.03, mitigatedBy: ['hides'] },
    { other: 'silver_mono', verdictFloor: 'conditional', reason: 'Quick, greedy feeders that steal the shark’s food; only adults live in full sea water. Target-feed the shark.', incidentRisk: 0.02, mitigatedBy: ['target_feeding'] },
    { other: 'spotted_scat', verdictFloor: 'conditional', reason: 'Quick, greedy feeders that steal the shark’s food; only adults live in full sea water. Target-feed the shark.', incidentRisk: 0.02, mitigatedBy: ['target_feeding'] },
    { other: 'tag:stinging_cnidarian', verdictFloor: 'conditional', reason: 'A shark resting or rooting on the floor can blunder into an anemone and be stung, or uproot it.', incidentRisk: 0.03 },
    { other: 'tag:shark', verdictFloor: 'conditional', reason: 'Two bottom sharks need twice the floor; adults eat each other’s egg cases and the bigger one eats hatchlings.', incidentRisk: 0.03, mitigatedBy: ['tank_size', 'hides'] },
    ...(o.crushesShells
      ? ([
          { other: 'tag:snail', verdictFloor: 'conditional', reason: 'Crushing teeth crack small snails.', incidentRisk: 0.05, mitigatedBy: ['cover'] },
          { other: 'tag:starfish', verdictFloor: 'conditional', reason: 'Bottom sharks with crushing teeth eat starfish and urchins.', incidentRisk: 0.03 },
        ] as CompatExceptionRule[])
      : []),
  ];
}
