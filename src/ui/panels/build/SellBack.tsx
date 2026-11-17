/**
 * Audit 2026-11-17 (G19, G22; the owner's answer to C11 and F15) — the store buys back a stored unit at half its price,
 * and an empty tank can be taken down for half the bare tank's price. Each button shows the amount and asks first.
 */
import { useState } from 'react';
import { Coins, PackageOpen } from 'lucide-react';
import type { EquipmentInstance, GameState, Tank } from '@/types';
import { Button, Modal, formatMoney } from '@/ui/kit';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { equipmentSellValue, takeDownCheck, type TakeDownCheck } from '@/sim/economy/sellBack';
import { act } from '../common/act';
import { safe } from '../common/hooks';
import { useUI } from '@/state/ui';

/** "Sell · $12" on a stored unit, and the question before it goes. */
export function SellStoredEquipment({ inst }: { inst: EquipmentInstance }) {
  const [asking, setAsking] = useState(false);
  const def = getEquipmentDef(inst.defId);
  const name = def?.name ?? 'equipment';
  const value = equipmentSellValue(def);
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setAsking(true)} data-testid={`sellback-equip-${inst.id}`}>
        <Coins size={14} aria-hidden /> Sell · {formatMoney(value)}
      </Button>
      <Modal
        open={asking}
        onClose={() => setAsking(false)}
        title={`Sell the ${name}?`}
        testId="sellback-equip-confirm"
        actions={
          <>
            <Button onClick={() => setAsking(false)}>Keep it</Button>
            <Button variant="primary" silent onClick={() => { setAsking(false); act({ k: 'sellEquipment', instance: inst.id }, { sound: 'coin' }); }}>
              Sell · {formatMoney(value)}
            </Button>
          </>
        }
      >
        <p className="pn-p">
          The store pays {formatMoney(value)} for it: half its price.
        </p>
      </Modal>
    </>
  );
}

/** The take-down question's body, every count read right ("Its filter goes …", "Its filter and 4 decor pieces go …"). */
export function takeDownText(check: Pick<TakeDownCheck, 'stores' | 'storesMany' | 'value' | 'last'>): string {
  const stores = check.stores ? `${check.stores.charAt(0).toUpperCase()}${check.stores.slice(1)} ${check.storesMany ? 'go' : 'goes'} to storage. ` : '';
  return `${stores}You get ${formatMoney(check.value)} back for the tank.${check.last ? ' It’s your only tank, so the room will be empty until you buy another.' : ''}`;
}

/** A tank's "Take down": shown when the tank may come down, else the reason it can't; asks first. */
export function TakeDownTank({ g, tank }: { g: GameState; tank: Tank }) {
  const [asking, setAsking] = useState(false);
  const moving = useUI((s) => s.tool === 'tank_place' && s.movingTankId === tank.id);
  const check = safe(() => takeDownCheck(g, tank.id), null);
  if (!check) return null;
  if (moving) return <span className="pn-small pn-muted" data-testid="tank-takedown-why">Take down: it’s being moved. Place it or cancel the move first.</span>;
  if (!check.ok) return <span className="pn-small pn-muted" data-testid="tank-takedown-why">Take down: {check.reason}</span>;
  const title = `Take down ${check.called}?`;
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setAsking(true)} data-testid="tank-takedown">
        <PackageOpen size={14} aria-hidden /> Take down
      </Button>
      <Modal
        open={asking}
        onClose={() => setAsking(false)}
        title={title.charAt(0).toUpperCase() + title.slice(1)}
        testId="tank-takedown-confirm"
        actions={
          <>
            <Button onClick={() => setAsking(false)}>Cancel</Button>
            <Button variant="danger" silent onClick={() => { setAsking(false); act({ k: 'takeDownTank', tank: tank.id }, { sound: 'coin' }); }} data-testid="tank-takedown-yes">
              Take down
            </Button>
          </>
        }
      >
        <p className="pn-p">{takeDownText(check)}</p>
      </Modal>
    </>
  );
}
