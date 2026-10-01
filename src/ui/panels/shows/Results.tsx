/**
 * Entries (pending) and Results (judge's cards) tabs. Celebratory but quiet: a rosette, the placing and the score up
 * front; the card — the judge's reasons and the points behind the score — one tap away. OWNER: lane "shows".
 */
import { useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, CircleSlash, Hourglass, Trophy, Undo2, ClipboardList } from 'lucide-react';
import type { GameState, ShowEntry } from '@/types';
import { SHOW_CLASS_BY_ID, SHOW_TIERS } from '@/data/shows';
import { recentResults, withdrawEntry, placeWord, TITLE_LABEL } from '@/sim/shows';
import { Button } from '@/ui/kit';
import { Card, Chip, EmptyState } from '../common/parts';
import { act } from '../common/act';
import { TierBadge, Rosette } from './Ribbons';
import { gameWhen, money, realIn, speedNote } from './util';

// ───────────────────────────── entries ─────────────────────────────

export function EntriesTab({ g, onBrowse }: { g: GameState; onBrowse: () => void }) {
  const s = g.shows;
  const now = g.clock.hour;
  const pending = (s?.entries ?? []).filter((e) => e.status === 'entered');
  if (!pending.length)
    return (
      <EmptyState icon={<ClipboardList size={26} />} title="No entries waiting" action={<Button size="sm" onClick={onBrowse}>Browse the calendar</Button>}>
        Enter a healthy, settled adult — or one of your own aquascapes — in an upcoming show.
      </EmptyState>
    );
  const byShow = new Map<string, ShowEntry[]>();
  for (const e of pending) byShow.set(e.showId, [...(byShow.get(e.showId) ?? []), e]);
  const shows = [...byShow.keys()].map((id) => s!.shows.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => a.judgingHour - b.judgingHour);
  return (
    <div className="pn-stack" style={{ gap: 12 }}>
      {shows.map((show) => {
        const open = now < show.deadlineHour;
        return (
          <Card key={show.id} className="sh-show">
            <div className="sh-show__top">
              <TierBadge tier={show.tier} />
              <span className="sh-show__when" title={gameWhen(show.judgingHour)}>
                <Trophy size={12} aria-hidden /> Judging in {realIn(show.judgingHour - now, g.clock.speed)}{speedNote(g.clock.speed)}
              </span>
            </div>
            <h4 className="sh-show__name">{show.name}</h4>
            <div className="pn-stack" style={{ gap: 8 }}>
              {byShow.get(show.id)!.map((e) => (
                <div key={e.id} className="pn-row pn-row--between pn-row--wrap" data-testid={`show-entry-${e.id}`}>
                  <span className="pn-grow">
                    <b className="pn-serif">{e.name}</b>
                    <span className="pn-small pn-muted"> · {SHOW_CLASS_BY_ID[e.classId]?.short ?? e.classId} · fee {money(e.fee)}</span>
                  </span>
                  {open ? (
                    <Button size="sm" variant="ghost" data-testid={`show-withdraw-${e.id}`} onClick={() => act((d) => withdrawEntry(d, e.id), { sound: 'click', kind: 'info' })}>
                      <Undo2 size={13} aria-hidden /> Withdraw
                    </Button>
                  ) : (
                    <Chip tone="aqua" icon={<Hourglass size={11} />}>
                      With the judges
                    </Chip>
                  )}
                </div>
              ))}
            </div>
            <div className="sh-show__deadline">
              {open ? `Entries close in ${realIn(show.deadlineHour - now, g.clock.speed)}${speedNote(g.clock.speed)} — withdraw before then for a full refund.` : 'Entries are closed. If an entrant is unwell on the day, it stays home and the club refunds the fee.'}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ───────────────────────────── results ─────────────────────────────

export function ResultsTab({ g, focusId, newSince }: { g: GameState; focusId?: string | null; newSince?: number | null }) {
  const list = recentResults(g.shows, 30);
  // lane:notify — the panel marks results seen as soon as this tab opens; `newSince` (the seen-hour before this visit)
  // keeps their "New" tags for the visit
  const seen = newSince ?? g.shows?.resultsSeenHour ?? -Infinity;
  const [openId, setOpenId] = useState<string | null>(focusId ?? list.find((e) => e.status === 'judged')?.id ?? null);
  if (!list.length)
    return (
      <EmptyState icon={<Rosette place={1} size={28} />} title="No results yet">
        After judging, every entry comes back with a judge’s card explaining its score.
      </EmptyState>
    );
  return (
    <div className="pn-stack" style={{ gap: 10 }}>
      {list.map((e) => (e.status === 'scratched' ? <Scratched key={e.id} e={e} g={g} /> : <ResultCard key={e.id} g={g} e={e} open={openId === e.id} isNew={(e.judgedHour ?? -Infinity) > seen} onToggle={() => setOpenId(openId === e.id ? null : e.id)} />))}
    </div>
  );
}

function Scratched({ e, g }: { e: ShowEntry; g: GameState }) {
  const show = g.shows?.shows.find((x) => x.id === e.showId);
  return (
    <Card className="sh-scratched">
      <CircleSlash size={18} aria-hidden style={{ color: 'var(--c-ink-3)', flex: 'none', marginTop: 2 }} />
      <div className="pn-grow">
        <div>
          <b className="pn-serif">{e.name}</b> <span className="pn-small pn-muted">· {SHOW_CLASS_BY_ID[e.classId]?.short} · {show?.name ?? e.showName ?? 'show'}</span>
        </div>
        <div className="pn-small pn-muted">{e.note}</div>
      </div>
    </Card>
  );
}

function ResultCard({ g, e, open, isNew, onToggle }: { g: GameState; e: ShowEntry; open: boolean; isNew: boolean; onToggle: () => void }) {
  const show = g.shows?.shows.find((x) => x.id === e.showId);
  const def = SHOW_CLASS_BY_ID[e.classId];
  const rank = e.rank ?? 99;
  const cls = show?.classes.find((c) => c.classId === e.classId);
  const title = rank <= 4 ? `${e.bestInShow ? 'Best in Show · ' : ''}${placeWord(rank)} — ${e.name}` : `${placeWord(rank)} of ${e.of} — ${e.name}`;
  return (
    <Card className={clsx('sh-result', rank === 1 && 'is-win', rank > 1 && rank <= 4 && 'is-ribbon', isNew && 'is-new')} testId={`show-result-${e.id}`}>
      <button type="button" className="sh-result__head" onClick={onToggle} aria-expanded={open}>
        {rank <= 4 ? <Rosette place={rank as 1 | 2 | 3 | 4} bis={e.bestInShow} size={34} /> : <span style={{ width: 34, display: 'grid', placeItems: 'center', color: 'var(--c-ink-3)' }}><ClipboardList size={20} aria-hidden /></span>}
        <span className="sh-result__title">
          <span className="sh-result__place">{title}</span>
          <span className="sh-result__sub">
            {def?.short ?? e.classId} · {show?.name ?? e.showName ?? 'show'}
            {show || e.tier ? ` · ${SHOW_TIERS[show?.tier ?? e.tier!].name}` : ''}
          </span>
          {(e.prize ?? 0) > 0 || (e.titles?.length ?? 0) > 0 ? (
            <span className="pn-row pn-row--wrap" style={{ gap: 6, marginTop: 4 }}>
              {(e.prize ?? 0) > 0 && <Chip tone="gold">+{money(e.prize!)}</Chip>}
              {(e.reputation ?? 0) > 0 && <Chip tone="aqua">+{Math.round(e.reputation!)} reputation</Chip>}
              {e.titles?.map((t) => (
                <Chip key={t} tone="gold" icon={<Trophy size={11} />}>
                  Now a {TITLE_LABEL[t]}
                </Chip>
              ))}
            </span>
          ) : null}
        </span>
        <span className="sh-result__score">
          <b>{e.score?.toFixed(1)}</b>
          <span>{e.of ? `points · ${e.of} ${e.of === 1 ? 'entry' : 'entries'}` : 'points'}</span>
        </span>
        {open ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
      </button>
      {open && e.card && (
        <div className="sh-card">
          <div className="sh-card__paper" data-testid="judge-card">
            <div className="sh-card__hdr">
              <span>Judge’s card</span>
              <span>{e.card.judge}</span>
            </div>
            <ul className="sh-card__lines">
              {e.card.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <div className="sh-crit" aria-label="Points by criterion">
              {e.card.criteria.map((c) =>
                c.key === 'judge' ? (
                  <div key={c.key} className="sh-crit__row sh-crit__row--eye">
                    <span className="sh-crit__label">{c.label}</span>
                    <span />
                    <span className="sh-crit__pts">{c.points >= 0 ? '+' : '−'}{Math.abs(c.points).toFixed(1)}</span>
                  </div>
                ) : (
                  <div key={c.key} className="sh-crit__row">
                    <span className="sh-crit__label">{c.label}</span>
                    <span className="sh-crit__bar" aria-hidden>
                      <i style={{ width: `${Math.round((c.points / Math.max(1, c.max)) * 100)}%` }} />
                    </span>
                    <span className="sh-crit__pts">
                      {c.points.toFixed(1)}
                      <small>/{c.max}</small>
                    </span>
                  </div>
                ),
              )}
              <div className="sh-crit__total">
                <span>Score</span>
                <span>{e.score?.toFixed(1)}</span>
              </div>
            </div>
          </div>
          {cls?.results && (
            <div>
              <div className="pn-tiny pn-muted" style={{ marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 650 }}>
                {def?.short} · {cls.entrants ?? cls.results.length} {(cls.entrants ?? cls.results.length) === 1 ? 'entry' : 'entries'}
              </div>
              <ol className="sh-field">
                {cls.results.map((p) => (
                  <li key={`${p.place}-${p.name}`} className={clsx(p.mine && 'is-mine')}>
                    <span className="sh-field__n">{p.place <= 4 ? <Rosette place={p.place as 1 | 2 | 3 | 4} size={14} /> : p.place}</span>
                    <span className="sh-field__who">
                      {p.name} <small>· {p.exhibitor}</small>
                    </span>
                    <span className="sh-field__s">{p.score.toFixed(1)}</span>
                  </li>
                ))}
              </ol>
              {show?.bestInShow && (
                <div className="pn-small pn-muted" style={{ marginTop: 8 }}>
                  Best in Show: <b style={{ color: 'var(--c-ink)' }}>{show.bestInShow.name}</b> ({show.bestInShow.exhibitor}, {SHOW_CLASS_BY_ID[show.bestInShow.classId]?.short}) — {show.bestInShow.score.toFixed(1)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
