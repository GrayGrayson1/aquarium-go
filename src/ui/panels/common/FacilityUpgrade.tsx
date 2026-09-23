/**
 * Facility upgrade call-to-action: current level → next level, perks, cost and requirement progress.
 * OWNER: lane "ui-panels".
 */
import { Building2, ArrowRight, Users, Ruler, Coins, Sparkles } from 'lucide-react';
import type { GameState } from '@/types';
import { Button, Money, formatMoney } from '@/ui/kit';
import { getFacilityLevel } from '@/data/facilities';
import { upgradeFacility, facilityUpgradeInfo, type FacilityUpgradeInfo } from '@/sim/facility';
import { act } from './act';
import { useUI } from '@/state/ui'; // lane:qa-play
import { Chip } from './parts';
import { Requirements } from './Requirements';
import { safe } from './hooks';

export function FacilityUpgradeCard({ g }: { g: GameState }) {
  const info: FacilityUpgradeInfo | null = safe(() => facilityUpgradeInfo(g), null);
  const cur = info?.current ?? getFacilityLevel(g.facility.level);
  const next = info?.next ?? null;
  if (!next) {
    return (
      <div className="pn-card pn-upgrade pn-upgrade--max">
        <div className="pn-row pn-gap-3">
          <span className="pn-head__icon pn-upgrade__icon">
            <Sparkles size={18} />
          </span>
          <div className="pn-grow">
            <div className="pn-card__title">{cur.name}</div>
            <div className="pn-small pn-muted">{info?.reason ?? 'You’ve reached the grandest venue. Keep your exhibits breathtaking.'}</div>
          </div>
        </div>
      </div>
    );
  }
  const reqs = (info?.requirements ?? []).filter((r) => !r.label.startsWith('$'));
  const afford = g.finance.money >= next.upgradeCost;
  return (
    <div className="pn-card pn-upgrade">
      <div className="pn-upgrade__path">
        <span className="pn-chip">{cur.name}</span>
        <ArrowRight size={14} className="pn-muted" aria-hidden />
        <span className="pn-chip pn-chip--gold">{next.name}</span>
      </div>
      <div className="pn-row pn-gap-3 pn-row--top">
        <span className="pn-head__icon pn-upgrade__icon">
          <Building2 size={18} />
        </span>
        <div className="pn-grow pn-col pn-gap-2">
          <div className="pn-card__title">{next.name}</div>
          <p className="pn-p" style={{ margin: 0 }}>
            {next.blurb}
          </p>
          <div className="pn-chips">
            <Chip icon={<Ruler size={11} />}>
              {next.width} × {next.depth} m floor
            </Chip>
            <Chip icon={<Users size={11} />}>{next.visitorCapacity} visitors at once</Chip>
            <Chip icon={<Coins size={11} />}>Rent {formatMoney(next.dailyRent)}/day</Chip>
          </div>
          {next.perks?.length > 0 && (
            <ul className="pn-perks">
              {next.perks.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {reqs.length > 0 && (
        <div className="pn-col pn-gap-2">
          <div className="pn-tiny pn-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 650 }}>
            Requirements
          </div>
          <Requirements items={reqs} />
        </div>
      )}
      <div className="pn-row pn-gap-3 pn-upgrade__foot pn-row--wrap">
        <div className="pn-grow">
          <span className="pn-tiny pn-muted">Upgrade cost</span>
          <div style={{ fontSize: 20 }}>
            <Money value={next.upgradeCost} />
          </div>
        </div>
        <Button variant="primary" disabled={!info?.canUpgrade} silent onClick={() => {
            const r = act((d) => upgradeFacility(d), { sound: 'celebrate', quiet: true });
            // lane:qa-play — show off the new venue: the move used to leave the player in tank view behind the panel
            if (r?.ok) useUI.getState().set({ view: 'facility', panel: null, panelTarget: null, selectedCreatureId: null });
          }}>
          <Building2 size={15} /> {info?.canUpgrade ? `Move to ${next.name}` : !afford && reqs.every((r) => r.met) ? `Need ${formatMoney(next.upgradeCost - g.finance.money)} more` : 'Requirements not met'}
        </Button>
      </div>
      {!info?.canUpgrade && info?.reason && <div className="pn-tiny pn-muted">{info.reason}</div>}
    </div>
  );
}
