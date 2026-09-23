/**
 * Controlled vocabulary for predator/prey tags. Species data MUST use these tags so the compatibility
 * engine can reason generically. OWNER: species lane (may add tags with a description).
 */
export const PREY_TAGS = {
  fish_tiny: 'Fish under ~3 cm adult (neon tetra, endler, pea puffer, white cloud)',
  fish_small: 'Fish ~3–6 cm',
  fish_medium: 'Fish ~6–12 cm',
  fish_large: 'Fish over ~12 cm',
  fish_slow: 'Slow, weak-swimming fish easily outcompeted or harassed (seahorses, fancy goldfish, long-finned bettas)',
  long_fins: 'Flowing fins that attract nippers',
  fry: 'Newly hatched/born fish',
  eggs: 'Fish/amphibian/invert eggs',
  shrimp_dwarf: 'Dwarf shrimp adults (Neocaridina/Caridina, ~2–3 cm)',
  shrimp_fry: 'Baby shrimp (shrimplets)',
  shrimp_large: 'Larger shrimp (amano ~5 cm, cleaner/peppermint)',
  snail: 'Snails of any size',
  snail_small: 'Small/pest snails (ramshorn, bladder, small nerites)',
  crustacean: 'Crabs, crayfish, hermit crabs, shrimp — hard-shelled crustaceans',
  amphibian: 'Aquatic amphibians (axolotl, African dwarf frog)',
  amphibian_larva: 'Tadpoles/axolotl larvae',
  gills_external: 'Delicate external gills (axolotl) — targeted by nippers',
  copepod: 'Copepods/amphipods/micro-fauna',
  worm: 'Worms (bristleworms, blackworms)',
  coral_polyp: 'Coral polyps',
  clam: 'Clams / bivalves',
  starfish: 'Starfish / urchins',
  sessile_invert: 'Feather dusters, sponges, other sessile invertebrates',
  // lane:species-fw (append only)
  fish_benthic: 'Bottom-resting/bottom-sleeping fish (corydoras, loaches, gobies) that crayfish and crabs can grab at night',
  // lane:species-marine (append only)
  stinging_cnidarian:
    'Hazard tag, not food: anemones, fire coral and strongly stinging LPS (Euphyllia, Catalaphyllia). Carried by anemone/coral species or mapped from anemone/coral decor; seahorses are harmed by it',
  aiptasia: 'Pest glass anemones (Aiptasia/Exaiptasia) that hitchhike on live rock — eaten by peppermint shrimp',
} as const;

export type PreyTag = keyof typeof PREY_TAGS;
