/**
 * Planned launch roster — ids are FIXED contracts shared by every lane (compat tests, visuals, market, unlocks).
 * OWNER: core. Species lanes implement each id in freshwater/ or marine/ (starters stay in this folder).
 * `visual`: which render lane draws it ('fish' = lane fishart, 'special' = lane critterart).
 */
export interface RosterEntry {
  id: string;
  commonName: string;
  scientificName: string;
  env: 'freshwater' | 'marine' | 'brackish'; // lane:brackish: + 'brackish'
  lane: 'species-fw' | 'species-marine' | 'brackish'; // lane:brackish: + 'brackish'
  visual: 'fish' | 'special';
  unlock: string; // group unlock key (see src/data/unlockKeys.ts); 'starter' for the five starters
  behaviorSet: string;
}

export const ROSTER: RosterEntry[] = [
  // Starters (seeded by core; verified by species lanes)
  { id: 'axolotl', commonName: 'Axolotl', scientificName: 'Ambystoma mexicanum', env: 'freshwater', lane: 'species-fw', visual: 'special', unlock: 'starter|fw_coldwater', behaviorSet: 'axolotl' },
  { id: 'betta', commonName: 'Betta', scientificName: 'Betta splendens', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'starter|fw_basic', behaviorSet: 'betta' },
  { id: 'pea_puffer', commonName: 'Pea Puffer', scientificName: 'Carinotetraodon travancoricus', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'starter|fw_basic', behaviorSet: 'pea_puffer' },
  { id: 'ocellaris_clownfish', commonName: 'Ocellaris Clownfish', scientificName: 'Amphiprion ocellaris', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'starter|marine_basics', behaviorSet: 'clownfish' },
  { id: 'lined_seahorse', commonName: 'Lined Seahorse', scientificName: 'Hippocampus erectus', env: 'marine', lane: 'species-marine', visual: 'special', unlock: 'starter|marine_seahorse', behaviorSet: 'seahorse' },
  // Freshwater
  { id: 'fancy_guppy', commonName: 'Fancy Guppy', scientificName: 'Poecilia reticulata', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_basic', behaviorSet: 'livebearer' },
  { id: 'endlers_livebearer', commonName: "Endler's Livebearer", scientificName: 'Poecilia wingei', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_basic', behaviorSet: 'livebearer' },
  { id: 'neon_tetra', commonName: 'Neon Tetra', scientificName: 'Paracheirodon innesi', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_basic', behaviorSet: 'schooling_small' },
  { id: 'cardinal_tetra', commonName: 'Cardinal Tetra', scientificName: 'Paracheirodon axelrodi', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_intermediate', behaviorSet: 'schooling_small' },
  { id: 'white_cloud_minnow', commonName: 'White Cloud Mountain Minnow', scientificName: 'Tanichthys albonubes', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_basic', behaviorSet: 'schooling_small' },
  { id: 'medaka', commonName: 'Medaka Ricefish', scientificName: 'Oryzias latipes', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_basic', behaviorSet: 'surface_dweller' },
  { id: 'panda_corydoras', commonName: 'Panda Corydoras', scientificName: 'Corydoras panda', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_basic', behaviorSet: 'bottom_forager' },
  { id: 'otocinclus', commonName: 'Otocinclus', scientificName: 'Otocinclus vittatus', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_intermediate', behaviorSet: 'algae_grazer' },
  { id: 'kuhli_loach', commonName: 'Kuhli Loach', scientificName: 'Pangio kuhlii', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_intermediate', behaviorSet: 'loach_eel' },
  { id: 'hillstream_loach', commonName: 'Reticulated Hillstream Loach', scientificName: 'Sewellia lineolata', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_intermediate', behaviorSet: 'hillstream' },
  { id: 'honey_gourami', commonName: 'Honey Gourami', scientificName: 'Trichogaster chuna', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_basic', behaviorSet: 'gourami' },
  { id: 'cherry_shrimp', commonName: 'Cherry Shrimp', scientificName: 'Neocaridina davidi', env: 'freshwater', lane: 'species-fw', visual: 'special', unlock: 'fw_basic', behaviorSet: 'shrimp_dwarf' },
  { id: 'amano_shrimp', commonName: 'Amano Shrimp', scientificName: 'Caridina multidentata', env: 'freshwater', lane: 'species-fw', visual: 'special', unlock: 'fw_basic', behaviorSet: 'shrimp_dwarf' },
  { id: 'mystery_snail', commonName: 'Mystery Snail', scientificName: 'Pomacea diffusa', env: 'freshwater', lane: 'species-fw', visual: 'special', unlock: 'fw_basic', behaviorSet: 'snail' },
  { id: 'nerite_snail', commonName: 'Nerite Snail', scientificName: 'Neritina natalensis', env: 'freshwater', lane: 'species-fw', visual: 'special', unlock: 'fw_basic', behaviorSet: 'snail' },
  { id: 'african_dwarf_frog', commonName: 'African Dwarf Frog', scientificName: 'Hymenochirus boettgeri', env: 'freshwater', lane: 'species-fw', visual: 'special', unlock: 'fw_intermediate', behaviorSet: 'frog_aquatic' },
  { id: 'bristlenose_pleco', commonName: 'Bristlenose Pleco', scientificName: 'Ancistrus cf. cirrhosus', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_intermediate', behaviorSet: 'algae_grazer' },
  { id: 'fancy_goldfish', commonName: 'Fancy Goldfish', scientificName: 'Carassius auratus', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_coldwater', behaviorSet: 'goldfish' },
  { id: 'comet_goldfish', commonName: 'Comet Goldfish', scientificName: 'Carassius auratus', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_coldwater', behaviorSet: 'goldfish' },
  { id: 'dwarf_crayfish', commonName: 'Dwarf Orange Crayfish', scientificName: 'Cambarellus patzcuarensis', env: 'freshwater', lane: 'species-fw', visual: 'special', unlock: 'fw_intermediate', behaviorSet: 'crayfish' },
  { id: 'discus', commonName: 'Discus', scientificName: 'Symphysodon aequifasciatus', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_advanced', behaviorSet: 'cichlid_discus' },
  // Marine
  { id: 'royal_gramma', commonName: 'Royal Gramma', scientificName: 'Gramma loreto', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'marine_basics', behaviorSet: 'reef_basslet' },
  { id: 'firefish', commonName: 'Firefish', scientificName: 'Nemateleotris magnifica', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'marine_basics', behaviorSet: 'dartfish' },
  { id: 'watchman_goby', commonName: 'Yellow Watchman Goby', scientificName: 'Cryptocentrus cinctus', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'marine_basics', behaviorSet: 'goby_burrow' },
  { id: 'clown_goby', commonName: 'Yellow Clown Goby', scientificName: 'Gobiodon okinawae', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'reef', behaviorSet: 'goby_perch' },
  { id: 'banggai_cardinalfish', commonName: 'Banggai Cardinalfish', scientificName: 'Pterapogon kauderni', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'marine_basics', behaviorSet: 'cardinal_hover' },
  { id: 'green_chromis', commonName: 'Green Chromis', scientificName: 'Chromis viridis', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'marine_basics', behaviorSet: 'chromis' },
  { id: 'cleaner_shrimp', commonName: 'Skunk Cleaner Shrimp', scientificName: 'Lysmata amboinensis', env: 'marine', lane: 'species-marine', visual: 'special', unlock: 'marine_basics', behaviorSet: 'shrimp_cleaner' },
  { id: 'peppermint_shrimp', commonName: 'Peppermint Shrimp', scientificName: 'Lysmata wurdemanni', env: 'marine', lane: 'species-marine', visual: 'special', unlock: 'marine_basics', behaviorSet: 'shrimp_cleaner' },
  { id: 'hermit_crab', commonName: 'Blue-leg Hermit Crab', scientificName: 'Clibanarius tricolor', env: 'marine', lane: 'species-marine', visual: 'special', unlock: 'marine_basics', behaviorSet: 'hermit_crab' },
  { id: 'trochus_snail', commonName: 'Trochus Snail', scientificName: 'Trochus sp.', env: 'marine', lane: 'species-marine', visual: 'special', unlock: 'marine_basics', behaviorSet: 'snail' },
  { id: 'yellow_tang', commonName: 'Yellow Tang', scientificName: 'Zebrasoma flavescens', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'marine_large', behaviorSet: 'tang' },
  { id: 'kole_tang', commonName: 'Kole Bristletooth Tang', scientificName: 'Ctenochaetus strigosus', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'marine_large', behaviorSet: 'tang' },
  { id: 'coral_beauty', commonName: 'Coral Beauty Angelfish', scientificName: 'Centropyge bispinosa', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'reef', behaviorSet: 'angelfish_dwarf' },
  { id: 'foxface_rabbitfish', commonName: 'Foxface Rabbitfish', scientificName: 'Siganus vulpinus', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'marine_large', behaviorSet: 'rabbitfish' },
  { id: 'mandarin_dragonet', commonName: 'Mandarin Dragonet', scientificName: 'Synchiropus splendidus', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'marine_advanced', behaviorSet: 'dragonet' },
  { id: 'peacock_mantis_shrimp', commonName: 'Peacock Mantis Shrimp', scientificName: 'Odontodactylus scyllarus', env: 'marine', lane: 'species-marine', visual: 'special', unlock: 'predators', behaviorSet: 'mantis_shrimp' },
  { id: 'dwarf_lionfish', commonName: 'Fuzzy Dwarf Lionfish', scientificName: 'Dendrochirus brachypterus', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'predators', behaviorSet: 'lionfish' },
  { id: 'miniatus_grouper', commonName: 'Miniatus Grouper', scientificName: 'Cephalopholis miniata', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'predators', behaviorSet: 'grouper' },
  // Brackish (lane:brackish — the estuary chapter)
  { id: 'figure_eight_puffer', commonName: 'Figure-eight Puffer', scientificName: 'Dichotomyctere ocellatus', env: 'brackish', lane: 'brackish', visual: 'fish', unlock: 'brackish', behaviorSet: 'pea_puffer' },
  { id: 'bumblebee_goby', commonName: 'Bumblebee Goby', scientificName: 'Brachygobius doriae', env: 'brackish', lane: 'brackish', visual: 'fish', unlock: 'brackish', behaviorSet: 'goby_perch' },
  { id: 'sailfin_molly', commonName: 'Sailfin Molly', scientificName: 'Poecilia latipinna', env: 'brackish', lane: 'brackish', visual: 'fish', unlock: 'brackish', behaviorSet: 'livebearer' },
  { id: 'banded_archerfish', commonName: 'Banded Archerfish', scientificName: 'Toxotes jaculatrix', env: 'brackish', lane: 'brackish', visual: 'fish', unlock: 'brackish', behaviorSet: 'archerfish' },
];
