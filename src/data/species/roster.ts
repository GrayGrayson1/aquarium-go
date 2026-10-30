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
  unlock: string; // group unlock key (see src/data/unlockKeys.ts); 'starter' for the five starters; 'open' = buyable from the start (chunk 16, ADR-0052 decision 4)
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
  // Freshwater, chunk 16 wave C: freshwater favourites (ADR-0052; buyable from the start)
  { id: 'freshwater_angelfish', commonName: 'Freshwater Angelfish', scientificName: 'Pterophyllum scalare', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'open', behaviorSet: 'cichlid_discus' },
  { id: 'german_blue_ram', commonName: 'German Blue Ram', scientificName: 'Mikrogeophagus ramirezi', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'open', behaviorSet: 'cichlid_dwarf' },
  { id: 'harlequin_rasbora', commonName: 'Harlequin Rasbora', scientificName: 'Trigonostigma heteromorpha', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'open', behaviorSet: 'schooling_small' },
  { id: 'zebra_danio', commonName: 'Zebra Danio', scientificName: 'Danio rerio', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'open', behaviorSet: 'schooling_small' },
  { id: 'platy', commonName: 'Platy', scientificName: 'Xiphophorus maculatus', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'open', behaviorSet: 'livebearer' },
  { id: 'swordtail', commonName: 'Swordtail', scientificName: 'Xiphophorus hellerii', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'open', behaviorSet: 'livebearer' },
  { id: 'dwarf_gourami', commonName: 'Dwarf Gourami', scientificName: 'Trichogaster lalius', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'open', behaviorSet: 'gourami' },
  { id: 'ghost_shrimp', commonName: 'Ghost Shrimp', scientificName: 'Palaemon paludosus', env: 'freshwater', lane: 'species-fw', visual: 'special', unlock: 'open', behaviorSet: 'shrimp_dwarf' },
  { id: 'ramshorn_snail', commonName: 'Ramshorn Snail', scientificName: 'Planorbella duryi', env: 'freshwater', lane: 'species-fw', visual: 'special', unlock: 'open', behaviorSet: 'snail' },
  // chunk 17 (ADR-0053), wave A: big freshwater (Big-water Freshwater research, and the tank that holds an adult)
  { id: 'oscar', commonName: 'Oscar', scientificName: 'Astronotus ocellatus', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_large', behaviorSet: 'cichlid_large' },
  { id: 'clown_loach', commonName: 'Clown Loach', scientificName: 'Chromobotia macracanthus', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_large', behaviorSet: 'loach_shoal' },
  { id: 'black_ghost_knifefish', commonName: 'Black Ghost Knifefish', scientificName: 'Apteronotus albifrons', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_large', behaviorSet: 'knifefish' },
  { id: 'fahaka_puffer', commonName: 'Fahaka Puffer', scientificName: 'Tetraodon lineatus', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_large', behaviorSet: 'pea_puffer' },
  { id: 'ornate_bichir', commonName: 'Ornate Bichir', scientificName: 'Polypterus ornatipinnis', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_large', behaviorSet: 'bichir' },
  { id: 'silver_arowana', commonName: 'Silver Arowana', scientificName: 'Osteoglossum bicirrhosum', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_large', behaviorSet: 'arowana' },
  // chunk 17, wave B: koi (Cool-water Systems and Big-water Freshwater)
  { id: 'koi', commonName: 'Koi', scientificName: 'Cyprinus rubrofuscus', env: 'freshwater', lane: 'species-fw', visual: 'fish', unlock: 'fw_coldwater|fw_large', behaviorSet: 'goldfish' },
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
  // Marine, chunk 16 wave A: a friend's reef (ADR-0052; buyable from the start)
  { id: 'emperor_angelfish', commonName: 'Emperor Angelfish', scientificName: 'Pomacanthus imperator', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'open', behaviorSet: 'angelfish_dwarf' },
  { id: 'sailfin_tang', commonName: 'Sailfin Tang', scientificName: 'Zebrasoma velifer', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'open', behaviorSet: 'tang' },
  { id: 'chocolate_tang', commonName: 'Chocolate Tang', scientificName: 'Acanthurus pyroferus', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'open', behaviorSet: 'tang' },
  { id: 'lyretail_anthias', commonName: 'Lyretail Anthias', scientificName: 'Pseudanthias squamipinnis', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'open', behaviorSet: 'chromis' },
  { id: 'melanurus_wrasse', commonName: 'Melanurus Wrasse', scientificName: 'Halichoeres melanurus', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'open', behaviorSet: 'wrasse' },
  { id: 'maroon_clownfish', commonName: 'Maroon Clownfish', scientificName: 'Amphiprion biaculeatus', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'open', behaviorSet: 'clownfish' },
  { id: 'elegant_starfish', commonName: 'Elegant Starfish', scientificName: 'Fromia milleporella', env: 'marine', lane: 'species-marine', visual: 'special', unlock: 'open', behaviorSet: 'starfish' },
  { id: 'fighting_conch', commonName: 'Fighting Conch', scientificName: 'Strombus pugilis', env: 'marine', lane: 'species-marine', visual: 'special', unlock: 'open', behaviorSet: 'conch' },
  { id: 'scarlet_hermit_crab', commonName: 'Scarlet Reef Hermit Crab', scientificName: 'Paguristes cadenati', env: 'marine', lane: 'species-marine', visual: 'special', unlock: 'open', behaviorSet: 'hermit_crab' },
  { id: 'mexican_turbo_snail', commonName: 'Mexican Turbo Snail', scientificName: 'Turbo fluctuosus', env: 'marine', lane: 'species-marine', visual: 'special', unlock: 'open', behaviorSet: 'snail' },
  { id: 'nassarius_snail', commonName: 'Nassarius Snail', scientificName: 'Phrontis vibex', env: 'marine', lane: 'species-marine', visual: 'special', unlock: 'open', behaviorSet: 'snail_sand' },
  { id: 'astraea_snail', commonName: 'Astraea Snail', scientificName: 'Lithopoma tectum', env: 'marine', lane: 'species-marine', visual: 'special', unlock: 'open', behaviorSet: 'snail' },
  { id: 'cerith_snail', commonName: 'Cerith Snail', scientificName: 'Cerithium atratum', env: 'marine', lane: 'species-marine', visual: 'special', unlock: 'open', behaviorSet: 'snail' },
  // Marine, chunk 16 wave B: reef favourites (ADR-0052; buyable once Marine Systems is researched, decision 9)
  { id: 'flame_angelfish', commonName: 'Flame Angelfish', scientificName: 'Centropyge loriculus', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'open', behaviorSet: 'angelfish_dwarf' },
  { id: 'sixline_wrasse', commonName: 'Six-line Wrasse', scientificName: 'Pseudocheilinus hexataenia', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'open', behaviorSet: 'wrasse' },
  { id: 'lawnmower_blenny', commonName: 'Lawnmower Blenny', scientificName: 'Salarias fasciatus', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'open', behaviorSet: 'blenny' },
  { id: 'flame_hawkfish', commonName: 'Flame Hawkfish', scientificName: 'Neocirrhites armatus', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'open', behaviorSet: 'hawkfish' },
  { id: 'yellowtail_damselfish', commonName: 'Yellowtail Damselfish', scientificName: 'Chrysiptera parasema', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'open', behaviorSet: 'damsel' },
  { id: 'emerald_crab', commonName: 'Emerald Crab', scientificName: 'Mithraculus sculptus', env: 'marine', lane: 'species-marine', visual: 'special', unlock: 'open', behaviorSet: 'crab' },
  { id: 'tuxedo_urchin', commonName: 'Tuxedo Urchin', scientificName: 'Mespilia globulus', env: 'marine', lane: 'species-marine', visual: 'special', unlock: 'open', behaviorSet: 'urchin' },
  { id: 'sand_sifting_starfish', commonName: 'Sand-sifting Starfish', scientificName: 'Astropecten polyacanthus', env: 'marine', lane: 'species-marine', visual: 'special', unlock: 'open', behaviorSet: 'starfish_sand' },
  { id: 'bubbletip_anemone', commonName: 'Bubble-tip Anemone', scientificName: 'Entacmaea quadricolor', env: 'marine', lane: 'species-marine', visual: 'special', unlock: 'open', behaviorSet: 'anemone' },
  // chunk 17 (ADR-0053), wave C: big marine fish (Big-water Marine or Predator Husbandry, and the tank that holds an adult)
  { id: 'blue_tang', commonName: 'Blue Tang', scientificName: 'Paracanthurus hepatus', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'marine_large', behaviorSet: 'tang' },
  { id: 'naso_tang', commonName: 'Naso Tang', scientificName: 'Naso lituratus', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'marine_large', behaviorSet: 'tang' },
  { id: 'queen_angelfish', commonName: 'Queen Angelfish', scientificName: 'Holacanthus ciliaris', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'marine_large', behaviorSet: 'angelfish_dwarf' },
  { id: 'clown_triggerfish', commonName: 'Clown Triggerfish', scientificName: 'Balistoides conspicillum', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'predators', behaviorSet: 'triggerfish' },
  { id: 'panther_grouper', commonName: 'Panther Grouper', scientificName: 'Chromileptes altivelis', env: 'marine', lane: 'species-marine', visual: 'fish', unlock: 'predators', behaviorSet: 'grouper' },
  // Brackish (lane:brackish — the estuary chapter)
  { id: 'figure_eight_puffer', commonName: 'Figure-eight Puffer', scientificName: 'Dichotomyctere ocellatus', env: 'brackish', lane: 'brackish', visual: 'fish', unlock: 'brackish', behaviorSet: 'pea_puffer' },
  { id: 'bumblebee_goby', commonName: 'Bumblebee Goby', scientificName: 'Brachygobius doriae', env: 'brackish', lane: 'brackish', visual: 'fish', unlock: 'brackish', behaviorSet: 'goby_perch' },
  { id: 'sailfin_molly', commonName: 'Sailfin Molly', scientificName: 'Poecilia latipinna', env: 'brackish', lane: 'brackish', visual: 'fish', unlock: 'brackish', behaviorSet: 'livebearer' },
  { id: 'banded_archerfish', commonName: 'Banded Archerfish', scientificName: 'Toxotes jaculatrix', env: 'brackish', lane: 'brackish', visual: 'fish', unlock: 'brackish', behaviorSet: 'archerfish' },
  // chunk 17 (ADR-0053), wave B: brackish (Brackish Estuaries, and the tank that holds an adult)
  { id: 'silver_mono', commonName: 'Silver Mono', scientificName: 'Monodactylus argenteus', env: 'brackish', lane: 'brackish', visual: 'fish', unlock: 'brackish', behaviorSet: 'chromis' },
  { id: 'spotted_scat', commonName: 'Spotted Scat', scientificName: 'Scatophagus argus', env: 'brackish', lane: 'brackish', visual: 'fish', unlock: 'brackish', behaviorSet: 'rabbitfish' },
];
