/**
 * Named-icon lookup for data files that reference lucide icons by name (research, quests, achievements).
 * Only the icons actually used are imported (importing all of lucide would bloat the bundle). OWNER: lane "ui-panels".
 */
import type { LucideIcon } from 'lucide-react';
import {
  Anchor, Award, BadgeCheck, BookOpen, Box, Bug, Building, Building2, Castle, Cpu, Crown, Dna, DoorOpen, Droplets, Egg, Fish, FlaskConical, Flower, Flower2, Gem, GitBranch,
  HandCoins, Heart, Landmark, LayoutDashboard, LayoutGrid, Library, MapPin, Maximize, Medal, Megaphone, Package, Palette, PartyPopper, Plus, Server, ShieldCheck, Smile, Snowflake,
  Sparkle, Sparkles, Sprout, Star, Store, Swords, Trophy, Users, Utensils, Waves,
  UserPlus, // lane:w2-ui (q_first_staff)
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  Anchor, Award, BadgeCheck, BookOpen, Box, Bug, Building, Building2, Castle, Cpu, Crown, Dna, DoorOpen, Droplets, Egg, Fish, FlaskConical, Flower, Flower2, Gem, GitBranch,
  HandCoins, Heart, Landmark, LayoutDashboard, LayoutGrid, Library, MapPin, Maximize, Medal, Megaphone, Package, Palette, PartyPopper, Plus, Server, ShieldCheck, Smile, Snowflake,
  Sparkle, Sparkles, Sprout, Star, Store, Swords, Trophy, Users, Utensils, Waves,
  UserPlus, // lane:w2-ui
};

export function NamedIcon({ name, size = 16, className }: { name?: string; size?: number; className?: string }) {
  const I = (name && ICONS[name]) || Sparkles;
  return <I size={size} className={className} aria-hidden />;
}
