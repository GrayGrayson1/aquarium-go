/**
 * Audit 2026-11-17 (G22; the owner's answer to C11 and F15) — the store buys back a stored unit at half its price. The
 * button shows the amount and asks first.
 */
import { useState } from 'react';
import { Coins } from 'lucide-react';
import type { EquipmentInstance } from '@/types';
import { Button, Modal, formatMoney } from '@/ui/kit';
import { getEquipmentDef } from '@/data/catalog/equipment';
import { equipmentSellValue } from '@/sim/economy/sellBack';
import { act } from '../common/act';

/** "Sell · $12" on a stored unit, and the question before it goes. */
export function SellStoredEquipment({ inst }: { inst: EquipmentInstance }) {
  const [asking, setAsking] = useState(false);
  const def = getEquipmentDef(inst.defId);
  const name = def?.name ?? 'equipment';
  const value = equipmentSellValue(def, inst);
  const why = [inst.condition < 0.995 ? 'less for wear' : '', inst.failed ? 'and half that again because it’s broken' : ''].filter(Boolean).join(', ');
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
          The store pays {formatMoney(value)} for it: half its price{why ? `, ${why}` : ''}.
        </p>
      </Modal>
    </>
  );
}
