/**
 * Achievements: permanent milestones earned from real play. OWNER: lane "facility".
 * Checked in stepProgression; each grants a little reputation and a celebratory toast.
 * Anything the starting setup already satisfies (e.g. "Into the Blue" for a marine starter) is recorded quietly at
 * game creation — no toast, no reputation — by `settleStartingProgress`. Aquascaping achievements only count tanks
 * the player has aquascaped themselves (`scaped`), because the hand-built starter layouts already score 87–94.
 */
import { SCAPED_EDITS, type Cond } from './unlocks';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  cond: Cond;
  reputation: number;
  /** Lucide icon name hint. */
  icon: string;
  tier: 'bronze' | 'silver' | 'gold';
}

const c = (key: string, min: number): Cond => ({ type: 'counter', key, min });

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_meal', title: 'First Meal', description: 'Feed your starter for the first time.', cond: c('feeds', 1), reputation: 1, icon: 'Utensils', tier: 'bronze' },
  { id: 'devoted_keeper', title: 'Devoted Keeper', description: 'Feed your animals 100 times.', cond: c('feeds', 100), reputation: 5, icon: 'Heart', tier: 'silver' },
  { id: 'fresh_start', title: 'Fresh Start', description: 'Do your first water change.', cond: c('waterChanges', 1), reputation: 1, icon: 'Droplets', tier: 'bronze' },
  { id: 'steady_hands', title: 'Steady Hands', description: 'Keep every tank GOOD for 7 days in a row.', cond: c('water_good_streak', 7), reputation: 10, icon: 'ShieldCheck', tier: 'gold' },
  { id: 'first_friend', title: 'Show and Tell', description: 'A friend visits to admire your tank.', cond: c('friend_visits', 1), reputation: 1, icon: 'Users', tier: 'bronze' },
  { id: 'first_sale', title: 'Open for Business', description: 'Make your first sale.', cond: { type: 'sales_count', min: 1 }, reputation: 3, icon: 'HandCoins', tier: 'bronze' },
  { id: 'trader', title: 'Trusted Trader', description: 'Complete 25 sales.', cond: { type: 'sales_count', min: 25 }, reputation: 10, icon: 'BadgeCheck', tier: 'silver' },
  { id: 'turnkey', title: 'Turnkey', description: 'Sell a whole aquarium.', cond: c('tank_sales', 1), reputation: 5, icon: 'Package', tier: 'bronze' },
  { id: 'masterpiece', title: 'Masterpiece', description: 'Sell a whole aquarium for $10,000 or more.', cond: c('best_tank_sale', 10000), reputation: 20, icon: 'Trophy', tier: 'gold' },
  { id: 'first_clutch', title: 'New Generation', description: 'Raise your first clutch.', cond: c('births', 1), reputation: 5, icon: 'Egg', tier: 'bronze' },
  { id: 'breeder', title: 'Breeder', description: 'Raise 10 clutches.', cond: c('births', 10), reputation: 10, icon: 'GitBranch', tier: 'silver' },
  { id: 'morph_hunter', title: 'Morph Hunter', description: 'Discover 10 morphs.', cond: { type: 'morphs', min: 10 }, reputation: 8, icon: 'Palette', tier: 'silver' },
  { id: 'strain_seeker', title: 'Strain Seeker', description: 'Breed or buy 3 named strains.', cond: { type: 'strains', min: 3 }, reputation: 4, icon: 'Dna', tier: 'silver' }, // lane:genetics
  { id: 'prismatic', title: 'Prismatic!', description: 'Own a Prismatic animal — a once-in-thousands shimmer.', cond: { type: 'prismatics', min: 1 }, reputation: 10, icon: 'Sparkles', tier: 'gold' }, // lane:genetics
  { id: 'community', title: 'Community Builder', description: 'Keep 5 species at once.', cond: { type: 'owns_species', min: 5 }, reputation: 5, icon: 'Fish', tier: 'bronze' },
  { id: 'naturalist', title: 'Naturalist', description: 'Keep 15 species at once.', cond: { type: 'owns_species', min: 15 }, reputation: 15, icon: 'Library', tier: 'gold' },
  { id: 'all_starters', title: 'Full Set', description: 'Keep all five starter species.', cond: { type: 'all', of: ['axolotl', 'betta', 'pea_puffer', 'ocellaris_clownfish', 'lined_seahorse'].map((speciesId) => ({ type: 'owns_species' as const, speciesId })) }, reputation: 20, icon: 'Crown', tier: 'gold' },
  { id: 'saltwater', title: 'Into the Blue', description: 'Run a marine aquarium.', cond: { type: 'tanks', min: 1, env: 'marine' }, reputation: 3, icon: 'Waves', tier: 'bronze' },
  { id: 'reefkeeper', title: 'Reefkeeper', description: 'Run a reef aquarium.', cond: { type: 'tanks', min: 1, reef: true }, reputation: 8, icon: 'Flower2', tier: 'silver' },
  { id: 'estuary_keeper', title: 'Where Rivers Meet', description: 'Run a brackish estuary aquarium.', cond: { type: 'tanks', min: 1, env: 'brackish' }, reputation: 5, icon: 'Droplets', tier: 'silver' }, // lane:brackish
  { id: 'aquascaper', title: 'Aquascaper', description: 'Aquascape a tank yourself to a beauty score of 80.', cond: { type: 'beauty', min: 80, scaped: SCAPED_EDITS }, reputation: 6, icon: 'Sparkles', tier: 'silver' },
  { id: 'living_art', title: 'Living Art', description: 'Aquascape a tank yourself to a beauty score of 95.', cond: { type: 'beauty', min: 95, scaped: SCAPED_EDITS, ownLayout: true }, reputation: 15, icon: 'Gem', tier: 'gold' },
  { id: 'five_tanks', title: 'Fish Room', description: 'Run 5 aquariums.', cond: { type: 'tanks', min: 5 }, reputation: 5, icon: 'LayoutGrid', tier: 'bronze' },
  { id: 'twelve_tanks', title: 'Exhibit Hall', description: 'Run 12 aquariums.', cond: { type: 'tanks', min: 12 }, reputation: 12, icon: 'LayoutDashboard', tier: 'silver' },
  { id: 'big_water', title: 'Big Water', description: 'Run a 300-gallon aquarium.', cond: { type: 'tanks', min: 1, minGallons: 300 }, reputation: 10, icon: 'Maximize', tier: 'silver' },
  { id: 'thousand_gallons', title: 'A Thousand Gallons', description: 'Build a 1,000-gallon grand display.', cond: { type: 'tanks', min: 1, minGallons: 1000 }, reputation: 25, icon: 'Landmark', tier: 'gold' },
  { id: 'doors_open', title: 'Doors Open', description: 'Welcome your first paying visitor.', cond: { type: 'visitors', min: 1 }, reputation: 3, icon: 'DoorOpen', tier: 'bronze' },
  { id: 'crowd_pleaser', title: 'Crowd Pleaser', description: 'Welcome 1,000 visitors.', cond: { type: 'visitors', min: 1000 }, reputation: 10, icon: 'PartyPopper', tier: 'silver' },
  { id: 'landmark', title: 'Local Landmark', description: 'Welcome 25,000 visitors.', cond: { type: 'visitors', min: 25000 }, reputation: 25, icon: 'MapPin', tier: 'gold' },
  { id: 'wow_factor', title: 'Wow Factor', description: 'Earn 100 “wow” reactions.', cond: c('wows', 100), reputation: 10, icon: 'Star', tier: 'silver' },
  { id: 'scholar', title: 'Scholar', description: 'Complete 5 research projects.', cond: c('research_done', 5), reputation: 8, icon: 'FlaskConical', tier: 'silver' },
  { id: 'well_known', title: 'Well Known', description: 'Reach 250 reputation.', cond: { type: 'reputation', min: 250 }, reputation: 0, icon: 'Megaphone', tier: 'silver' },
  { id: 'renowned', title: 'Renowned', description: 'Reach 750 reputation.', cond: { type: 'reputation', min: 750 }, reputation: 0, icon: 'Medal', tier: 'gold' },
  { id: 'grand_hall', title: 'The Grand Hall', description: 'Open the Grand Hall.', cond: { type: 'facility', level: 'grand_hall' }, reputation: 30, icon: 'Castle', tier: 'gold' },
  // lane:frags — propagation (counters bumped by src/sim/aquascape/frags.ts and the frag listings)
  { id: 'first_frag', title: 'First Frag', description: 'Take your first coral frag or plant cutting.', cond: c('fragsTaken', 1), reputation: 2, icon: 'Sprout', tier: 'bronze' },
  { id: 'grown_out', title: 'Grown Out', description: 'Grow a frag or cutting into a full colony or plant.', cond: c('fragsGrownOut', 1), reputation: 4, icon: 'Flower', tier: 'bronze' },
  { id: 'frag_farmer', title: 'Frag Farmer', description: 'Sell 25 frags or cuttings.', cond: c('fragsSold', 25), reputation: 8, icon: 'Store', tier: 'silver' },
  // lane:shows — show circuit (counters bumped by src/sim/shows at judging)
  { id: 'first_ribbon', title: 'First Ribbon', description: 'Place 1st, 2nd or 3rd at a show.', cond: c('show_ribbons', 1), reputation: 2, icon: 'Award', tier: 'bronze' },
  { id: 'class_winner', title: 'Blue Rosette', description: 'Win a show class.', cond: c('show_class_wins', 1), reputation: 4, icon: 'Medal', tier: 'bronze' },
  { id: 'best_in_show', title: 'Best in Show', description: 'Take Best in Show at any show.', cond: c('show_bis', 1), reputation: 8, icon: 'Star', tier: 'silver' },
  { id: 'show_champion', title: 'Champion', description: 'Raise an animal to the Champion title (3 class wins at Regional or higher).', cond: c('show_champions', 1), reputation: 10, icon: 'Trophy', tier: 'silver' },
  { id: 'grand_champion', title: 'Grand Champion', description: 'Raise a Grand Champion (3 class wins at National or higher).', cond: c('show_grand_champions', 1), reputation: 20, icon: 'Crown', tier: 'gold' },
  { id: 'scaper_of_the_year', title: 'Scaper of the Year', description: 'Win an aquascape class at a National or International show.', cond: c('show_scape_top_wins', 1), reputation: 15, icon: 'Gem', tier: 'gold' },
  { id: 'world_stage', title: 'World Stage', description: 'Place at an International show.', cond: c('show_intl_placings', 1), reputation: 12, icon: 'Sparkle', tier: 'gold' },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
