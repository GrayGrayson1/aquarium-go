/**
 * Shows & championships panel: Upcoming (the calendar), Entries (pending), Results (judge's cards) and the Trophy
 * case / hall of fame, plus the entry flow. OWNER: lane "shows".
 *
 * Deep links via ui.panelTarget:
 *   'tab:upcoming' | 'tab:entries' | 'tab:results' | 'tab:trophies' | 'show:<showId>' (entry flow)
 *   'enter:<showId>:<classId>' | 'result:<entryId>'
 */
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Trophy } from 'lucide-react';
import { useUI } from '@/state/ui';
import { unseenResults, markShowResultsSeen } from '@/sim/shows';
import { PanelLayout } from '../common/PanelLayout';
import { usePanelGame, safe, useIsPhone } from '../common/hooks';
import { Seg } from '../common/parts';
import { edit } from '../common/act';
import { UpcomingTab } from './Upcoming';
import { EnterFlow } from './EnterFlow';
import { EntriesTab, ResultsTab } from './Results';
import { TrophyCaseTab } from './TrophyCase';
import './shows.css';

type ShowsTab = 'upcoming' | 'entries' | 'results' | 'trophies';
const TABS: ShowsTab[] = ['upcoming', 'entries', 'results', 'trophies'];

export function ShowsPanel() {
  const g = usePanelGame(700);
  const phone = useIsPhone();
  const target = useUI((s) => s.panelTarget);
  const [tab, setTab] = useState<ShowsTab>('upcoming');
  const [flow, setFlow] = useState<{ showId: string; classId?: string | null } | null>(null);
  const [focusResult, setFocusResult] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    if (target.startsWith('tab:')) {
      const t = target.slice(4) as ShowsTab;
      if (TABS.includes(t)) setTab(t);
      setFlow(null);
    } else if (target.startsWith('show:')) {
      setTab('upcoming');
      setFlow({ showId: target.slice(5) });
    } else if (target.startsWith('enter:')) {
      const [, showId, classId] = target.split(':');
      setTab('upcoming');
      setFlow({ showId, classId });
    } else if (target.startsWith('result:')) {
      setTab('results');
      setFlow(null);
      setFocusResult(target.slice(7));
    }
    useUI.getState().set({ panelTarget: null });
  }, [target]);

  // lane:notify — opening Results marks them seen at once, so the dock / sheet dot goes the moment the player looks. The
  // "New" tags stay for this visit: they compare against the seen-hour from before the visit (`newSince`).
  const unseen = g ? safe(() => unseenResults(g), 0) : 0;
  const [newSince, setNewSince] = useState<number | null>(null);
  useEffect(() => {
    if (tab !== 'results') {
      setNewSince(null);
      return;
    }
    if (unseen === 0) return;
    const before = g?.shows?.resultsSeenHour ?? -Infinity;
    setNewSince((cur) => (cur === null ? before : Math.min(cur, before)));
    edit((d) => markShowResultsSeen(d));
  }, [tab, unseen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!g) return null;
  const pending = (g.shows?.entries ?? []).filter((e) => e.status === 'entered').length;
  const flowShow = flow ? g.shows?.shows.find((x) => x.id === flow.showId && x.status === 'open') : null;
  const subtitle = flowShow ? 'Enter a show' : pending ? `${pending} entr${pending === 1 ? 'y' : 'ies'} waiting for the judges` : 'Club, Regional, National and International shows';

  return (
    <PanelLayout
      title="Shows"
      icon={<Trophy size={20} />}
      subtitle={subtitle}
      scrollKey={`${tab}:${flow?.showId ?? ''}`}
      toolbar={
        flowShow ? undefined : (
          <Seg<ShowsTab>
            label="Shows section"
            value={tab}
            onChange={(t) => {
              setTab(t);
              setFlow(null);
            }}
            testIdPrefix="shows-tab-"
            size={phone ? 'sm' : 'md' /* lane:w2-ui — four tabs + count badges overflowed a 390 px phone, clipping "Trophies" */}
            items={[
              { id: 'upcoming', label: 'Upcoming' },
              {
                id: 'entries',
                label: (
                  <>
                    Entries
                    {pending > 0 && <span className="pn-seg__count">{pending}</span>}
                  </>
                ),
              },
              {
                id: 'results',
                label: (
                  <>
                    Results
                    {unseen > 0 && tab !== 'results' && (
                      <span className={clsx('pn-seg__count', 'pn-seg__count--new')} data-testid="shows-results-new" aria-label={`${unseen} new`}>
                        {unseen}
                      </span>
                    )}
                  </>
                ),
              },
              { id: 'trophies', label: phone ? 'Trophies' : 'Trophy case' },
            ]}
          />
        )
      }
    >
      {flowShow ? (
        <EnterFlow
          key={flowShow.id}
          g={g}
          show={flowShow}
          initialClass={flow?.classId}
          onBack={() => setFlow(null)}
          onDone={() => {
            setFlow(null);
            setTab('entries');
          }}
        />
      ) : tab === 'upcoming' ? (
        <UpcomingTab g={g} onEnter={(showId) => setFlow({ showId })} />
      ) : tab === 'entries' ? (
        <EntriesTab g={g} onBrowse={() => setTab('upcoming')} />
      ) : tab === 'results' ? (
        <ResultsTab key={focusResult ?? 'r'} g={g} focusId={focusResult} newSince={newSince} />
      ) : (
        <TrophyCaseTab g={g} />
      )}
    </PanelLayout>
  );
}
