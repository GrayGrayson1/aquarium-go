/**
 * Trophy case / hall of fame: the shelf of rosettes and cups, titled animals, award-winning aquascapes and the show
 * achievements. OWNER: lane "shows".
 */
import { useMemo } from 'react';
import clsx from 'clsx';
import { Award, Check, Gem } from 'lucide-react';
import type { GameState, Creature } from '@/types';
import { SHOW_TIERS } from '@/data/shows';
import { ACHIEVEMENTS } from '@/data/achievements';
import { findSpecies } from '@/data/species';
import { topTitle, totalWins, winsAtOrAbove } from '@/sim/shows';
import { useUI } from '@/state/ui';
import { sfx } from '@/audio/sfx';
import { Card, EmptyState, SectionHead, Tile } from '../common/parts';
import { NamedIcon } from '../common/icons';
import { CreaturePortrait } from '../common/Portrait';
import { TrophyArt, CreatureRibbons, Rosette, PLACE_LABEL } from './Ribbons';
import { money } from './util';

const SHOW_ACHIEVEMENTS = ['first_ribbon', 'class_winner', 'best_in_show', 'show_champion', 'grand_champion', 'scaper_of_the_year', 'world_stage'];

export function TrophyCaseTab({ g }: { g: GameState }) {
  const s = g.shows;
  const trophies = useMemo(() => {
    const t = [...(s?.trophies ?? [])];
    // the most prestigious first: Best in Show, then higher tiers, then placing, newest first
    return t.sort((a, b) => Number(!!b.bestInShow) - Number(!!a.bestInShow) || SHOW_TIERS[b.tier].order - SHOW_TIERS[a.tier].order || a.place - b.place || b.hour - a.hour);
  }, [s?.trophies]);
  const decorated = useMemo(
    () =>
      Object.values(g.creatures)
        .filter((c) => c.awards && ((c.awards.placings ?? 0) > 0 || c.awards.titles?.length))
        .sort((a, b) => (b.awards!.titles?.length ?? 0) - (a.awards!.titles?.length ?? 0) || totalWins(b.awards) - totalWins(a.awards) || (b.awards!.placings ?? 0) - (a.awards!.placings ?? 0)),
    [g.creatures],
  );
  const scapes = Object.entries(s?.tankAwards ?? {}).filter(([id, a]) => a.placings > 0 && g.tanks[id]);
  const stats = s?.stats;
  return (
    <div className="pn-stack" data-testid="trophy-case">
      {stats && (
        <div className="sh-tiles">
          <Tile label="Ribbons" value={stats.placings} />
          <Tile label="Class wins" value={stats.wins} />
          {/* lane:qa-final — "Top honours" wrapped to two lines in the 1280 side sheet, dropping its value below the others */}
          <Tile label="Honours" value={stats.bestInShow} hint="Best in Show" />
          <Tile label="Prizes" value={money(stats.prize)} />
        </div>
      )}
      <section>
        <SectionHead title="Trophy shelf" icon={<Award size={13} aria-hidden />} />
        {trophies.length === 0 ? (
          <EmptyState icon={<Rosette place={1} size={30} />} title="An empty shelf — for now">
            Every ribbon and cup you win lands here, and on the trophy shelf in your aquarium.
          </EmptyState>
        ) : (
          <div className="sh-shelf">
            {trophies.slice(0, 24).map((t) => (
              <div key={t.id} className="sh-trophy" title={`${t.showName} · ${t.className} · ${t.subject}`}>
                <span className="sh-trophy__art">
                  <TrophyArt t={t} size={50} />
                </span>
                <span className="sh-trophy__label">
                  {t.bestInShow ? 'Best in Show' : PLACE_LABEL[t.place]} · {SHOW_TIERS[t.tier].name}
                  <small>
                    {t.subject} — {t.className}
                  </small>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
      {decorated.length > 0 && (
        <section>
          <SectionHead title="Hall of fame" />
          <div className="sh-champs">
            {decorated.slice(0, 12).map((c) => (
              <ChampRow key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}
      {scapes.length > 0 && (
        <section>
          <SectionHead title="Award-winning aquascapes" icon={<Gem size={13} aria-hidden />} />
          <div className="sh-champs">
            {scapes.map(([id, a]) => (
              <Card key={id} className="sh-champ">
                <span className="pn-grow">
                  <div className="sh-champ__name">{g.tanks[id].name}</div>
                  <div className="sh-champ__meta">
                    {a.wins} class win{a.wins === 1 ? '' : 's'} · {a.placings} placing{a.placings === 1 ? '' : 's'}
                    {a.best ? ` · best: ${a.best}` : ''}
                  </div>
                </span>
              </Card>
            ))}
          </div>
        </section>
      )}
      <section>
        <SectionHead title="Show achievements" />
        <div className="pn-achgrid">
          {ACHIEVEMENTS.filter((a) => SHOW_ACHIEVEMENTS.includes(a.id)).map((a) => {
            const got = g.progress.achievements.includes(a.id);
            return (
              <div key={a.id} className={clsx('pn-ach', `pn-ach--${a.tier}`, got ? 'is-earned' : 'is-locked')}>
                <span className="pn-ach__medal">
                  <NamedIcon name={a.icon} size={20} />
                </span>
                <b className="pn-ach__title">{a.title}</b>
                <span className="pn-tiny pn-muted">{a.description}</span>
                {got && (
                  <span className="pn-tiny pn-ach__state">
                    <Check size={11} /> Earned
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ChampRow({ c }: { c: Creature }) {
  const a = c.awards!;
  const sp = findSpecies(c.speciesId);
  const t = topTitle(c);
  const high = winsAtOrAbove(a, 'regional');
  const gone = c.status !== 'alive' && c.status !== 'listed';
  return (
    <Card
      className="sh-champ"
      onClick={
        gone
          ? undefined
          : () => {
              sfx('click');
              const ui = useUI.getState();
              ui.set({ selectedCreatureId: c.id, ...(c.tankId ? { focusedTankId: c.tankId } : {}) });
            }
      }
      label={`Open ${c.name}’s card`}
    >
      <CreaturePortrait creature={c} size={48} ring={t ? 'gold' : null} />
      <span className="pn-grow" style={{ display: 'grid', gap: 4, minWidth: 0 }}>
        <span className="sh-champ__name">{c.name}</span>
        <span className="sh-champ__meta">
          {sp?.commonName ?? c.speciesId} · {totalWins(a)} win{totalWins(a) === 1 ? '' : 's'}
          {high > 0 ? ` (${high} at Regional+)` : ''} · {a.placings} ribbon{a.placings === 1 ? '' : 's'}
          {gone ? ` · ${c.status === 'sold' ? 'sold' : 'in memoriam'}` : ''}
        </span>
        <CreatureRibbons c={c} max={8} />
      </span>
    </Card>
  );
}
