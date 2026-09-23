/**
 * The room/building for the current facility level + fixtures + visitors + the tank placement ghost.
 * OWNER: lane "facility".
 *
 *  hobby_room     cosy study: oak floor, rug, bookshelf, armchair, reading lamp, window with a live sky
 *  specialty_shop clean shop: terrazzo, teal feature wall with the shop sign, counter, shelving
 *  aquarium_store bigger store: polished concrete, slatted feature wall, aisle signs, checkout
 *  showroom       dark gallery: smoked oak, charcoal walls, spot pools under every exhibit
 *  destination    dramatic hall: basalt floor, deep blue walls, ticket gates, light fins
 *  grand_hall     cavernous: marble with brass inlay, fluted columns, tall night windows, benches
 */
import { getFacilityLevel } from '@/data/facilities';
import { useGameSelector } from '@/state/game';
import { RoomShell } from './Room';
import { HobbyRoom } from './HobbyRoom';
import { PublicRoom } from './PublicRoom';
import { Fixtures } from './Fixtures';
import { VisitorsLayer } from './VisitorsLayer';
import { StaffLayer } from './StaffLayer'; // lane:staff
import { StaffFeedBridge } from './StaffFeedBridge'; // lane:staff
import { PlacementGhost } from './PlacementGhost';
import { usePropMaterials } from './materials';
import { TrophyCase } from './Trophies'; // lane:shows
import { ShopDressing } from './ShopDressing'; // lane:w2-visual

export function FacilityWorld() {
  const level = useGameSelector((g) => g.facility.level, null);
  const width = useGameSelector((g) => g.facility.width, 0);
  const depth = useGameSelector((g) => g.facility.depth, 0);
  const shopName = useGameSelector((g) => g.shopName, 'My Aquarium');
  const mats = usePropMaterials();
  if (!level || !(width > 0) || !(depth > 0)) return null;
  const order = getFacilityLevel(level).order;
  return (
    <group name="facility-world">
      <RoomShell level={level} width={width} depth={depth} />
      {level === 'hobby_room' ? <HobbyRoom mats={mats} width={width} depth={depth} /> : <PublicRoom level={level} width={width} depth={depth} shopName={shopName} mats={mats} />}
      {/* lane:w2-visual — tile wainscot, stock shelves and back-corner furniture in the two shops */}
      {(level === 'specialty_shop' || level === 'aquarium_store') && <ShopDressing level={level} width={width} depth={depth} mats={mats} />}
      <Fixtures mats={mats} dark={order >= 3} />
      <TrophyCase mats={mats} level={level} width={width} depth={depth} /> {/* lane:shows — trophy shelf / cabinet */}
      <VisitorsLayer />
      {/* lane:staff — uniformed staff on the floor + keeper feeds dropping into the tanks */}
      <StaffLayer />
      <StaffFeedBridge />
      <PlacementGhost />
    </group>
  );
}
