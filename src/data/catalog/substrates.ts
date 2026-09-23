/**
 * Substrate catalog — one entry per SubstrateKind. OWNER: lane "waterlab".
 * `price` is per 10 gallons of tank. `grainMm` drives compatibility (axolotls swallow grains smaller than their head;
 * burrowers need sand). Colours are renderer palette hints (first = dominant).
 */
import type { SubstrateDef } from '@/types';

export const SUBSTRATES: SubstrateDef[] = [
  {
    kind: 'bare',
    name: 'Bare Bottom',
    price: 0,
    environments: ['freshwater', 'marine', 'brackish'],
    grainMm: 0,
    colors: ['#1a1d1f', '#2a2e31'],
    unlock: null,
    description: 'No substrate at all. Easiest to keep spotless and completely safe for axolotls, but offers nothing for burrowers or rooted plants.',
  },
  {
    kind: 'fine_sand',
    name: 'Fine Sand',
    price: 6,
    environments: ['freshwater', 'marine', 'brackish'],
    grainMm: 0.3,
    colors: ['#d9ccb0', '#c9b995', '#e8dcc2'],
    unlock: null,
    description: 'Soft, silky sand that passes straight through if swallowed. The safe choice for axolotls, corydoras barbels and sand-sifting loaches.',
  },
  {
    kind: 'sand',
    name: 'Natural River Sand',
    price: 5,
    environments: ['freshwater', 'marine', 'brackish'],
    grainMm: 0.8,
    colors: ['#c2ab84', '#a88f68', '#d6c29c'],
    unlock: null,
    description: 'Medium-grain mixed sand with natural colour variation. Good for burrowers and most bottom dwellers.',
  },
  {
    kind: 'fine_gravel',
    name: 'Fine Gravel',
    price: 5,
    environments: ['freshwater', 'brackish'],
    grainMm: 2.5,
    colors: ['#8a7c68', '#6f6454', '#a19480'],
    unlock: null,
    description: 'Small rounded gravel that lets water flow through the bed. Fine for most fish — but small enough for an axolotl to swallow.',
  },
  {
    kind: 'gravel',
    name: 'Aquarium Gravel',
    price: 4,
    environments: ['freshwater', 'brackish'],
    grainMm: 6,
    colors: ['#7d7368', '#5d554c', '#948a7e'],
    unlock: null,
    description: 'Classic pea-sized gravel. Traps food in the gaps, so it needs regular vacuuming. A known impaction risk for axolotls.',
  },
  {
    kind: 'aragonite',
    name: 'Aragonite Reef Sand',
    price: 9,
    environments: ['marine', 'brackish'],
    grainMm: 1,
    colors: ['#efe6d6', '#e3d7c1', '#f7f1e6'],
    unlock: null,
    description: 'Bright calcium-carbonate sand made from ancient reef sediment. It slowly dissolves to buffer pH and alkalinity in marine tanks.',
  },
  {
    kind: 'planted_soil',
    name: 'Aqua Soil',
    price: 12,
    environments: ['freshwater'],
    grainMm: 3,
    colors: ['#3b3128', '#2c241d', '#4a3e33'],
    unlock: null,
    description: 'Baked, nutrient-rich granules that feed plant roots and gently soften the water. Vacuum lightly — hard siphoning crushes the grains.',
  },
  {
    kind: 'large_pebbles',
    name: 'River Pebbles',
    price: 7,
    environments: ['freshwater', 'marine', 'brackish'],
    grainMm: 40,
    colors: ['#8d8579', '#6e675d', '#a39a8c'],
    unlock: null,
    description: 'Smooth stones bigger than an axolotl’s head, so they cannot be swallowed. Beautiful in stream-style layouts; waste settles between them.',
  },
];

export function getSubstrateDef(kind: string): SubstrateDef | undefined {
  return SUBSTRATES.find((s) => s.kind === kind);
}
