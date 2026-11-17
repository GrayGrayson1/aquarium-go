/**
 * Audit 2026-11-17 (D5) — Offer detail: what the animal eats and whether you have any, with a one-tap pack when the
 * cupboard has nothing it eats, and the guide's autofeeder verdict for an animal fed only frozen or live food.
 * OWNER: lane "ui-panels".
 */
import { ShoppingCart, Utensils } from 'lucide-react';
import type { Environment, GameState, SpeciesDefinition } from '@/types';
import { Button, formatMoney } from '@/ui/kit';
import { buyFoodPack } from '@/ui/common/foodStock';
import { AutofeederVerdict } from '../encyclopedia/SpeciesGuide';
import { safe } from '../common/hooks';
import { offerDiet } from './offerDietText';

export function OfferDiet({ g, sp, env }: { g: GameState; sp: SpeciesDefinition; env: Environment | undefined }) {
  const d = safe(() => offerDiet(g, sp, env), null);
  if (!d) return null;
  const poor = !!d.restock && g.finance.money < d.restock.price;
  return (
    <div className="pn-col pn-gap-1" data-testid="offer-diet">
      <p className="pn-small" style={{ margin: 0 }}>
        <Utensils size={12} aria-hidden /> {d.eats}{' '}
        {d.have ? <span className="pn-tone-good">{d.have}</span> : <span className="pn-tone-watch">None of its food is in stock.</span>}
      </p>
      {d.restock && (
        <span>
          <Button
            size="sm"
            data-testid="offer-diet-buy"
            disabled={poor}
            title={poor ? `Not enough money (${formatMoney(d.restock.price)} a pack)` : `Buy a pack of ${d.restock.name} for ${formatMoney(d.restock.price)}`}
            onClick={() => buyFoodPack(d.restock!.id)}
          >
            <ShoppingCart size={14} aria-hidden /> Buy {d.restock.name} · {formatMoney(d.restock.price)}
          </Button>
        </span>
      )}
      {d.handFed && <AutofeederVerdict sp={sp} compact />}
    </div>
  );
}
