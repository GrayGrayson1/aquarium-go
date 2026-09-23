/**
 * Tank card header line: "Cared for by Maya (Aquarist ★★★)" with her portrait. Tapping opens Visitors › Staff.
 * Renders nothing when no aquarist looks after this tank. OWNER: lane "staff".
 */
import type { GameState, Tank } from '@/types';
import { useUI } from '@/state/ui';
import { skillStars } from '@/data/staff';
import { keeperOf, mealsPerDay } from '@/sim/staff';
import { StaffAvatar } from './StaffAvatar';
import './staff.css';

export function TankKeeperLine({ game, tank }: { game: GameState; tank: Tank }) {
  let keeper = null;
  try {
    keeper = keeperOf(game, tank.id);
  } catch {
    keeper = null;
  }
  if (!keeper) return null;
  const firstName = keeper.name.split(' ')[0];
  // lane:staff2 — fast-metabolism tanks get more, smaller meals (discus, chromis, guppies: four; tetras: three).
  let meals = 2;
  try {
    meals = mealsPerDay(game, tank.id);
  } catch {
    meals = 2;
  }
  const often = meals === 4 ? 'four times a day (small meals for fast-metabolism fish)' : meals === 3 ? 'three times a day (a late snack for fast-metabolism fish)' : 'twice a day';
  return (
    <button
      type="button"
      className="st-keeperline"
      data-testid="tank-card-keeper"
      title={`${keeper.name} feeds this tank ${often} and keeps its water clean. Open Staff`}
      onClick={() => useUI.getState().set({ panel: 'visitors', panelTarget: 'tab:staff' /* lane:w2-ui */ })}
    >
      <StaffAvatar seed={keeper.avatarSeed} role={keeper.role} size={22} name={keeper.name} />
      <span className="st-keeperline__text">
        Cared for by <b>{firstName}</b> (Aquarist <span className="st-stars"><span className="st-stars__on">{skillStars(keeper.skill)}</span></span>)
      </span>
    </button>
  );
}
