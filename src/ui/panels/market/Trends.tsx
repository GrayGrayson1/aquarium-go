/**
 * Market › History & demand — sales history and species demand trends (↑/↓ chips). OWNER: lane "ui-panels".
 */
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, History, Receipt, Trophy } from 'lucide-react';
import type { GameState } from '@/types';
import { Money } from '@/ui/kit';
import { useUI } from '@/state/ui';
import { EmptyState, SectionHead, Tile } from '../common/parts';
import { SpeciesPortrait } from '../common/Portrait';
import { speciesOf } from '../common/derive';
import { LISTING_KIND_LABEL, relTime, untilTime } from '../common/format';

export function TrendsTab({ g }: { g: GameState }) {
  const demand = useMemo(() => {
    const discovered = new Set(g.progress.discoveredSpecies);
    const owned = new Set(Object.values(g.creatures).filter((c) => c.status === 'alive' || c.status === 'listed').map((c) => c.speciesId));
    return Object.entries(g.market.demand)
      .filter(([id]) => speciesOf(id))
      .map(([id, m]) => ({ id, m, relevant: owned.has(id) || discovered.has(id) }))
      .sort((a, b) => Number(b.relevant) - Number(a.relevant) || Math.abs(b.m - 1) - Math.abs(a.m - 1));
  }, [g.market.demand, g.progress.discoveredSpecies, g.creatures]);

  const history = [...g.market.history].sort((a, b) => b.hour - a.hour);
  const total = history.reduce((a, h) => a + h.price, 0);
  const best = history.reduce<(typeof history)[number] | null>((m, h) => (!m || h.price > m.price ? h : m), null);
  const hot = demand.filter((d) => d.m >= 1.08);
  const cold = demand.filter((d) => d.m <= 0.92);

  return (
    <div className="pn-stack pn-stack--lg">
      <div className="pn-grid pn-grid--tiles">
        <Tile icon={<Receipt size={14} />} tone="gold" label="Sales" value={history.length} hint="all time" />
        <Tile icon={<TrendingUp size={14} />} tone="good" label="Revenue" value={<Money value={total} />} hint="from listings" />
        <Tile icon={<Trophy size={14} />} tone="gold" label="Best sale" value={best ? <Money value={best.price} /> : '—'} hint={best ? best.title : 'no sales yet'} />
      </div>

      {(g.market.trends ?? []).filter((t) => t.untilHour > g.clock.hour).length > 0 && (
        <section className="pn-col pn-gap-2">
          {(g.market.trends ?? [])
            .filter((t) => t.untilHour > g.clock.hour)
            .map((t, i) => (
              <div key={i} className={`pn-trend ${t.delta >= 0 ? 'is-up' : 'is-down'}`}>
                <span className="pn-trend__icon">{t.delta >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}</span>
                <div className="pn-grow">
                  <div className="pn-trend__text">{t.text}</div>
                  <div className="pn-tiny pn-muted">
                    {speciesOf(t.speciesId)?.commonName ?? t.speciesId} · {t.delta >= 0 ? 'prices up' : 'prices down'} {Math.round(Math.abs(t.delta) * 100)}% · ends {untilTime(t.untilHour, g.clock.hour)}
                  </div>
                </div>
              </div>
            ))}
        </section>
      )}

      <section>
        <SectionHead title="Demand today" icon={<TrendingUp size={14} />} />
        {demand.length === 0 ? (
          <EmptyState icon={<TrendingUp size={22} />} title="Demand data is warming up">
            Buyers’ tastes shift daily. Check back after the first market day.
          </EmptyState>
        ) : (
          <>
            {(hot.length > 0 || cold.length > 0) && (
              <p className="pn-small pn-muted" style={{ marginTop: 0 }}>
                {hot.length > 0 && (
                  <>
                    Buyers are keen on <b className="pn-dim">{hot.slice(0, 3).map((d) => speciesOf(d.id)?.commonName).join(', ')}</b>.{' '}
                  </>
                )}
                {cold.length > 0 && <>Prices are soft for {cold.slice(0, 2).map((d) => speciesOf(d.id)?.commonName).join(' and ')}.</>}
              </p>
            )}
            <div className="pn-demand">
              {demand.slice(0, 24).map(({ id, m, relevant }) => {
                const sp = speciesOf(id)!;
                const up = m >= 1.03;
                const down = m <= 0.97;
                const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
                return (
                  <button key={id} type="button" className={`pn-demandchip ${up ? 'is-up' : down ? 'is-down' : ''} ${relevant ? '' : 'is-faint'}`} onClick={() => useUI.getState().set({ panel: 'encyclopedia', panelTarget: `species:${id}` })} title={`${sp.commonName}: demand ×${m.toFixed(2)}`}>
                    <SpeciesPortrait speciesId={id} size={28} silhouette={!g.progress.discoveredSpecies.includes(id) && !relevant} />
                    <span className="pn-ellipsis">{sp.commonName}</span>
                    <span className="pn-demandchip__v">
                      <Icon size={13} aria-hidden />
                      <span className="pn-sr">{up ? 'rising' : down ? 'falling' : 'steady'}</span>
                      {m >= 1 ? '+' : '−'}
                      {Math.abs(Math.round((m - 1) * 100))}%
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section>
        <SectionHead title="Sales history" icon={<History size={14} />} />
        {history.length === 0 ? (
          <EmptyState icon={<Receipt size={22} />} title="No sales yet">
            Your first sale will be recorded here — every buyer and price.
          </EmptyState>
        ) : (
          <ul className="pn-history">
            {history.slice(0, 40).map((h, i) => (
              <li key={i} className="pn-history__row">
                <span className="pn-history__kind">{LISTING_KIND_LABEL[h.kind]}</span>
                <span className="pn-grow pn-col" style={{ gap: 2 }}>
                  <span className="pn-ellipsis">{h.title}</span>
                  <span className="pn-tiny pn-muted">
                    to {h.buyer} · {relTime(h.hour, g.clock.hour)}
                  </span>
                </span>
                <Money value={h.price} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
