/**
 * Visual fallbacks for special creatures: used when a species record (or an appearance field) is missing, for
 * encyclopedia previews before species lanes land, and by the critterart gallery. Real appearance always wins.
 * OWNER: lane "critterart".
 */
import type { CreatureVisualParams } from '@/types';

export const GALLERY_SPECIES = [
  'axolotl',
  'lined_seahorse',
  'cherry_shrimp',
  'amano_shrimp',
  'cleaner_shrimp',
  'peppermint_shrimp',
  'mystery_snail',
  'nerite_snail',
  'trochus_snail',
  'mexican_turbo_snail',
  'astraea_snail',
  'cerith_snail',
  'nassarius_snail',
  'elegant_starfish',
  'fighting_conch',
  'sand_sifting_starfish',
  'bubbletip_anemone',
  'tuxedo_urchin',
  'emerald_crab',
  'ghost_shrimp',
  'ramshorn_snail',
  'hermit_crab',
  'scarlet_hermit_crab',
  'dwarf_crayfish',
  'peacock_mantis_shrimp',
  'african_dwarf_frog',
];

const BASE: CreatureVisualParams = {
  bodyColor: '#888888',
  bodyColor2: '#666666',
  bellyColor: '#aaaaaa',
  finColor: '#999999',
  finColor2: '#bbbbbb',
  accentColor: '#ffffff',
  eyeColor: '#111111',
  pattern: 'solid',
  patternScale: 1,
  patternContrast: 0.5,
  patternSeed: 1,
  iridescence: 0,
  metallic: 0,
  translucency: 0.2,
  finType: 'none',
  finLength: 1,
  bodyDepth: 1,
  gillFullness: 0,
};

const LOOKS: Record<string, Partial<CreatureVisualParams>> = {
  cherry_shrimp: { bodyColor: '#c41a1c', bodyColor2: '#8a0c10', bellyColor: '#e0503f', finColor: '#d2342c', finColor2: '#f27a62', accentColor: '#ffd2c2', eyeColor: '#0c0c0c', pattern: 'solid', translucency: 0.35, patternContrast: 0.5 },
  amano_shrimp: { bodyColor: '#a7ae9c', bodyColor2: '#7f8a78', bellyColor: '#c9cdbf', finColor: '#b8bca8', finColor2: '#d6d8c8', accentColor: '#6a4c34', eyeColor: '#101010', pattern: 'lined', translucency: 0.72, patternContrast: 0.7 },
  cleaner_shrimp: { bodyColor: '#f0bf3a', bodyColor2: '#c8221c', bellyColor: '#f5d27a', finColor: '#e8b43a', finColor2: '#c8221c', accentColor: '#ffffff', eyeColor: '#1a0c08', pattern: 'bands', translucency: 0.25, patternContrast: 0.9 },
  peppermint_shrimp: { bodyColor: '#efd2c0', bodyColor2: '#e4b7a0', bellyColor: '#f6e2d6', finColor: '#f0cdb8', finColor2: '#c43a2c', accentColor: '#c0302a', eyeColor: '#1a0c08', pattern: 'lined', translucency: 0.7, patternContrast: 0.8 },
  mystery_snail: { bodyColor: '#e2ae3a', bodyColor2: '#b27a22', bellyColor: '#d8c49a', finColor: '#c8b27e', finColor2: '#e4d4ae', accentColor: '#7a4e1c', eyeColor: '#101010', pattern: 'bands', translucency: 0.35, patternContrast: 0.35 },
  nerite_snail: { bodyColor: '#d9a12e', bodyColor2: '#9a6a18', bellyColor: '#8f8a80', finColor: '#8f8a80', finColor2: '#a8a298', accentColor: '#16110c', eyeColor: '#101010', pattern: 'bars', translucency: 0.15, patternContrast: 0.95 },
  trochus_snail: { bodyColor: '#b2a386', bodyColor2: '#8a7a60', bellyColor: '#6f6a5c', finColor: '#7a7466', finColor2: '#9a9486', accentColor: '#8a3a2c', eyeColor: '#101010', pattern: 'bars', translucency: 0.1, patternContrast: 0.6 },
  mexican_turbo_snail: { bodyColor: '#7a7454', bodyColor2: '#4f4a36', bellyColor: '#c8b89a', finColor: '#b8a48a', finColor2: '#8a7a66', accentColor: '#3a2e22', eyeColor: '#101010', pattern: 'bands', translucency: 0.1, patternContrast: 0.7 },
  astraea_snail: { bodyColor: '#8a8a70', bodyColor2: '#5e6250', bellyColor: '#b8ae98', finColor: '#a89a84', finColor2: '#7a6e5e', accentColor: '#6a7a4a', eyeColor: '#101010', pattern: 'bars', translucency: 0.1, patternContrast: 0.5 },
  cerith_snail: { bodyColor: '#6a5a4a', bodyColor2: '#3e342c', bellyColor: '#a89884', finColor: '#9a8a76', finColor2: '#6a5e50', accentColor: '#d8d0c0', eyeColor: '#101010', pattern: 'speckled', translucency: 0.1, patternContrast: 0.75 },
  nassarius_snail: { bodyColor: '#8a7e6e', bodyColor2: '#5e5446', bellyColor: '#d8ccb8', finColor: '#cfc2ae', finColor2: '#a89a86', accentColor: '#4a3e32', eyeColor: '#101010', pattern: 'bands', translucency: 0.15, patternContrast: 0.6 },
  elegant_starfish: { bodyColor: '#d4401e', bodyColor2: '#a82a14', bellyColor: '#eab08a', finColor: '#d4401e', finColor2: '#a82a14', accentColor: '#8a1c10', eyeColor: '#101010', pattern: 'solid', translucency: 0.1, patternContrast: 0.6 },
  fighting_conch: { bodyColor: '#a8784a', bodyColor2: '#7a5232', bellyColor: '#e8905a', finColor: '#6e6a58', finColor2: '#4a4638', accentColor: '#5a3a22', eyeColor: '#c8b03a', pattern: 'mottled', translucency: 0.1, patternContrast: 0.6 },
  sand_sifting_starfish: { bodyColor: '#b8a582', bodyColor2: '#8a7a5e', bellyColor: '#e8dcc4', finColor: '#b8a582', finColor2: '#8a7a5e', accentColor: '#6a5a46', eyeColor: '#101010', pattern: 'solid', translucency: 0.05, patternContrast: 0.6 },
  bubbletip_anemone: { bodyColor: '#a85a4a', bodyColor2: '#c86a5e', bellyColor: '#d8a898', finColor: '#c86a5e', finColor2: '#f0e0d0', accentColor: '#f09a86', eyeColor: '#101010', pattern: 'solid', translucency: 0.35, patternContrast: 0.6 },
  tuxedo_urchin: { bodyColor: '#1a1a24', bodyColor2: '#2a2a34', bellyColor: '#3a3a42', finColor: '#d8d0c0', finColor2: '#6a6a72', accentColor: '#2f5ad8', eyeColor: '#101010', pattern: 'bands', translucency: 0.05, patternContrast: 0.9 },
  emerald_crab: { bodyColor: '#3f7a3a', bodyColor2: '#2a5428', bellyColor: '#a8b890', finColor: '#3a6a36', finColor2: '#e8e0c8', accentColor: '#6a9a4a', eyeColor: '#6a1a12', pattern: 'mottled', translucency: 0.05, patternContrast: 0.6 },
  ghost_shrimp: { bodyColor: '#d8dccf', bodyColor2: '#c4c8ba', bellyColor: '#e6e8de', finColor: '#d8dccf', finColor2: '#e8a070', accentColor: '#b07040', eyeColor: '#101010', pattern: 'lined', translucency: 0.85, patternContrast: 0.3 },
  ramshorn_snail: { bodyColor: '#7a4a2a', bodyColor2: '#5a3420', bellyColor: '#6a5a4a', finColor: '#5a4a3e', finColor2: '#8a7a6a', accentColor: '#2a1a10', eyeColor: '#101010', pattern: 'solid', translucency: 0.15, patternContrast: 0.6 },
  hermit_crab: { bodyColor: '#2d58b8', bodyColor2: '#a88e68', bellyColor: '#e8e2d2', finColor: '#c64a2a', finColor2: '#e8742a', accentColor: '#e8662a', eyeColor: '#101010', pattern: 'bands', translucency: 0.05, patternContrast: 0.7 },
  scarlet_hermit_crab: { bodyColor: '#d0182a', bodyColor2: '#8e0f1a', bellyColor: '#e8e2d2', finColor: '#c9b79c', finColor2: '#7a5e44', accentColor: '#f2c230', eyeColor: '#101010', pattern: 'solid', translucency: 0.05, patternContrast: 0.6 },
  dwarf_crayfish: { bodyColor: '#f0661a', bodyColor2: '#c2440e', bellyColor: '#f8a060', finColor: '#f07a2a', finColor2: '#ffb070', accentColor: '#fff0d8', eyeColor: '#0c0c0c', pattern: 'speckled', translucency: 0.15, patternContrast: 0.25 },
  peacock_mantis_shrimp: { bodyColor: '#2c9a58', bodyColor2: '#16664a', bellyColor: '#e8dcb8', finColor: '#1c4fb8', finColor2: '#d8342a', accentColor: '#ee7a2a', eyeColor: '#6a8a3a', pattern: 'spots', translucency: 0.05, patternContrast: 0.6, iridescence: 0.3 },
  african_dwarf_frog: { bodyColor: '#6a6750', bodyColor2: '#4c4a38', bellyColor: '#bdb8a2', finColor: '#6e6a54', finColor2: '#8a8670', accentColor: '#26241c', eyeColor: '#b89a48', pattern: 'spots', translucency: 0.2, patternContrast: 0.55 },
  axolotl: {},
  lined_seahorse: {},
};

export function defaultLook(speciesId: string): CreatureVisualParams {
  return { ...BASE, ...(LOOKS[speciesId] ?? {}) };
}

/** Mystery snail shell colour morphs (used when species data has no phenotype for them). */
export const MYSTERY_SNAIL_SHELLS: Record<string, { shell: string; shell2: string; body: string; band: string }> = {
  gold: { shell: '#e2ae3a', shell2: '#b27a22', body: '#d8c088', band: '#7a4e1c' },
  ivory: { shell: '#efe6cf', shell2: '#d8ccb0', body: '#e8dfca', band: '#c8b89a' },
  blue: { shell: '#5b79a8', shell2: '#3b527a', body: '#4a4c52', band: '#243650' },
  purple: { shell: '#6a3a58', shell2: '#3e2236', body: '#3a3638', band: '#2a1426' },
  magenta: { shell: '#c65a8a', shell2: '#8e3462', body: '#d8b8a0', band: '#6a2044' },
  jade: { shell: '#6f8a5a', shell2: '#4a6040', body: '#4a4c46', band: '#2c3a24' },
};
