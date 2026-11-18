/**
 * Tank card header line: "Cared for by Maya (Aquarist ★★★)" with her portrait. Tapping opens Visitors › Staff.
 * Renders nothing when no aquarist looks after this tank. OWNER: lane "staff".
 */
import type { GameState, Tank } from '@/types';
import { useUI } from '@/state/ui';
import { skillStars } from '@/data/staff';
import { keeperOf, mealsPerDay } from '@/sim/staff';
import { doserOf, doserShortWords, isHeld } from '@/sim/automation';
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
  // Audit 2026-11-17 (H2): a nursery of fry only — the keeper gives them their first foods
  const fryOnly = !Object.values(game.creatures).some((c) => c.tankId === tank.id && (c.status === 'alive' || c.status === 'listed')) && Object.values(game.clutches).some((cl) => cl.tankId === tank.id && cl.count > 0);
  let doserFoodShort: string | null = null;
  try {
    doserFoodShort = fryOnly ? doserShortWords(game, tank) : null;
  } catch {
    doserFoodShort = null;
  }
  return (
    <button
      type="button"
      className="st-keeperline"
      data-testid="tank-card-keeper"
      title={
        fryOnly
          ? doserOf(tank) && !isHeld(game, 'food')
            ? doserFoodShort
              ? `${firstName} keeps the water clean; the live-food doser has no ${doserFoodShort} in stock, so the fry go hungry. Open Staff` // as the Feed tab says (second review)
              : `${firstName} keeps the water clean; the live-food doser feeds the fry. Open Staff` // a working doser: the keeper leaves the fry to it (H1 review)
            : `${firstName} feeds the fry their first foods and keeps the water clean. Open Staff`
          : `${keeper.name} feeds this tank ${often} and keeps its water clean. Open Staff`
      }
      onClick={() => useUI.getState().set({ panel: 'visitors', panelTarget: 'tab:staff' /* lane:w2-ui */ })}
    >
      <StaffAvatar seed={keeper.avatarSeed} role={keeper.role} size={22} name={keeper.name} />
      <span className="st-keeperline__text">
        Cared for by <b>{firstName}</b> (<span className="st-sr">{keeper.skill}-star </span>Aquarist <span className="st-stars" aria-hidden><span className="st-stars__on">{skillStars(keeper.skill)}</span></span>)
      </span>
    </button>
  );
}
