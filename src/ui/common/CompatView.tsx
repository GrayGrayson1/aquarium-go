/**
 * Compatibility explanation: verdict badge + reasons grouped by category with icons, plain-language probability
 * words ("likely", "sometimes") and mitigation hints. Used by the creature card (move preview), the tank card, and
 * lane "ui-panels" purchase previews. OWNER: lane "ui-shell".
 *
 *   <CompatView report={previewAddition(game, tankId, candidate)} />
 */
import { useMemo, useState, type ComponentType } from 'react';
import clsx from 'clsx';
import {
  Droplets,
  Thermometer,
  WavesHorizontal,
  FlaskConical,
  Ruler,
  Box,
  Users,
  Swords,
  Fish,
  Utensils,
  Wind,
  Sun,
  Shell,
  Sprout,
  Mountain,
  Egg,
  Sparkles,
  CircleCheck,
  TriangleAlert,
  OctagonAlert,
  Info,
  Lightbulb,
  ThumbsUp,
  ChevronDown,
  type LucideProps,
} from 'lucide-react';
import type { CompatReport, CompatReason, CompatCategory, CompatVerdict } from '@/types';
import { VERDICT_LABEL, VERDICT_STATUS, probabilityWord, speciesName } from './format';

type Icon = ComponentType<LucideProps>;

export const COMPAT_CATEGORY: Record<CompatCategory, { label: string; icon: Icon }> = {
  water: { label: 'Water type', icon: Droplets },
  temperature: { label: 'Temperature', icon: Thermometer },
  salinity: { label: 'Salinity', icon: WavesHorizontal },
  chemistry: { label: 'Water chemistry', icon: FlaskConical },
  size: { label: 'Size', icon: Ruler },
  tank: { label: 'Tank size', icon: Box },
  social: { label: 'Social needs', icon: Users },
  aggression: { label: 'Aggression', icon: Swords },
  predation: { label: 'Predation', icon: Fish },
  feeding: { label: 'Feeding', icon: Utensils },
  flow: { label: 'Flow', icon: Wind },
  light: { label: 'Light', icon: Sun },
  reef: { label: 'Reef safety', icon: Shell },
  plants: { label: 'Plants', icon: Sprout },
  habitat: { label: 'Habitat', icon: Mountain },
  breeding: { label: 'Breeding', icon: Egg },
  exception: { label: 'Special case', icon: Sparkles },
};

const SEVERITY_ORDER: CompatReason['severity'][] = ['critical', 'warning', 'caution', 'info', 'positive'];

const SEVERITY: Record<CompatReason['severity'], { word: string; tone: string; icon: Icon }> = {
  critical: { word: 'Critical', tone: 'danger', icon: OctagonAlert },
  warning: { word: 'Warning', tone: 'danger', icon: TriangleAlert },
  caution: { word: 'Caution', tone: 'watch', icon: TriangleAlert },
  info: { word: 'Note', tone: 'aqua', icon: Info },
  positive: { word: 'Good', tone: 'good', icon: ThumbsUp },
};

const VERDICT_ICON: Record<CompatVerdict, Icon> = {
  excellent: CircleCheck,
  usually_compatible: CircleCheck,
  conditional: TriangleAlert,
  high_risk: OctagonAlert,
  incompatible: OctagonAlert,
};

export function VerdictBadge({ verdict, score, size = 'md', testId = 'compat-verdict' }: { verdict: CompatVerdict; score?: number; size?: 'sm' | 'md' | 'lg'; /** null = no data-testid (lists). */ testId?: string | null }) {
  const status = VERDICT_STATUS[verdict] ?? 'watch';
  const I = VERDICT_ICON[verdict] ?? Info;
  return (
    <span className={clsx('ag-verdict', `ag-verdict--${status}`, `ag-verdict--${size}`)} data-testid={testId ?? undefined} data-verdict={verdict}>
      <I size={size === 'lg' ? 18 : 14} aria-hidden />
      <span>{VERDICT_LABEL[verdict] ?? verdict}</span>
      {score != null && Number.isFinite(score) && <span className="ag-verdict__score">{Math.round(score)}</span>}
    </span>
  );
}

function ReasonRow({ r, existing }: { r: CompatReason; /** lane:qa-play — true when the reason predates the newcomer */ existing?: boolean }) {
  const sev = SEVERITY[r.severity] ?? SEVERITY.info;
  const SevIcon = sev.icon;
  const word = probabilityWord(r.probability);
  const who = r.speciesIds?.length ? r.speciesIds.map(speciesName).join(' · ') : null;
  return (
    <li className={clsx('ag-reason', `ag-reason--${sev.tone}`)} data-testid="compat-reason" data-severity={r.severity}>
      <span className="ag-reason__icon" aria-hidden>
        <SevIcon size={14} />
      </span>
      <div className="ag-reason__body">
        <div className="ag-reason__text">
          <span className="ag-sr">{sev.word}: </span>
          {r.text}
        </div>
        {(word || who) && (
          <div className="ag-reason__meta">
            {word && (
              <span className="ag-reason__prob">
                Happens <strong>{word}</strong>
                {r.probability != null && <span className="ag-muted"> (~{Math.round(r.probability * 100)}% / week)</span>}
              </span>
            )}
            {who && <span className="ag-muted">{who}</span>}
            {existing && <span className="ag-muted">· already in this tank</span>}
          </div>
        )}
        {r.mitigation && (
          <div className="ag-reason__fix">
            <Lightbulb size={13} aria-hidden /> {r.mitigation}
          </div>
        )}
      </div>
    </li>
  );
}

export interface CompatViewProps {
  report: CompatReport | null | undefined;
  /** Heading above the verdict (e.g. "Adding 1 Betta to Ember's Tank"). */
  title?: React.ReactNode;
  /** Show only issues (hide positive/info) until expanded. Default true when there are many reasons. */
  compact?: boolean;
  /** Max reasons shown before "Show all" (default 6). */
  limit?: number;
  emptyText?: string;
  className?: string;
  /**
   * lane:qa-play — the species being added or moved: its reasons come first, and the summary says how many issues the
   * tank already had ("25 serious issues" for one betta joining a busy community tank read as all the betta's doing).
   */
  focusSpeciesId?: string;
}

/** Verdict + WHY. Groups reasons by category, most severe first. */
export function CompatView({ report, title, compact, limit = 6, emptyText, className, focusSpeciesId }: CompatViewProps) {
  const [showAll, setShowAll] = useState(false);
  const involves = (r: CompatReason) => !focusSpeciesId || !r.speciesIds?.length || r.speciesIds.includes(focusSpeciesId);
  const groups = useMemo(() => {
    const reasons = [...(report?.reasons ?? [])].sort((a, b) => Number(!involves(a)) - Number(!involves(b)) || SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
    const map = new Map<CompatCategory, CompatReason[]>();
    for (const r of reasons) {
      const list = map.get(r.category) ?? [];
      list.push(r);
      map.set(r.category, list);
    }
    return [...map.entries()];
  }, [report, focusSpeciesId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!report) return <div className={clsx('ag-compat', className)}><div className="ag-muted ag-small">{emptyText ?? 'No compatibility data yet.'}</div></div>;

  const total = report.reasons?.length ?? 0;
  const issueCount = (report.reasons ?? []).filter((r) => r.severity === 'critical' || r.severity === 'warning' || r.severity === 'caution').length;
  const cap = showAll ? Infinity : compact ? Math.min(limit, 4) : limit;
  let shown = 0;
  const status = VERDICT_STATUS[report.verdict] ?? 'watch';
  const summary =
    status === 'good'
      ? issueCount === 0
        ? 'No conflicts found.'
        : `${issueCount} thing${issueCount === 1 ? '' : 's'} to keep an eye on.`
      : status === 'watch'
        ? `Works with care — ${issueCount} condition${issueCount === 1 ? '' : 's'} to manage.`
        : `Not recommended — ${issueCount} serious issue${issueCount === 1 ? '' : 's'}.`;
  const existing = focusSpeciesId ? (report.reasons ?? []).filter((r) => (r.severity === 'critical' || r.severity === 'warning' || r.severity === 'caution') && !involves(r)).length : 0;
  const already = existing === issueCount ? (issueCount === 1 ? 'It was already in this tank.' : 'All were already in this tank.') : `${existing} ${existing === 1 ? 'was' : 'were'} already in this tank.`;
  const summaryFull = existing > 0 && issueCount > 0 ? `${summary} ${already}` : summary;

  return (
    <div className={clsx('ag-compat', `ag-compat--${status}`, className)}>
      {title && <div className="ag-compat__title">{title}</div>}
      <div className="ag-compat__head">
        <VerdictBadge verdict={report.verdict} score={report.score} size="lg" />
        <span className="ag-compat__summary">{summaryFull}</span>
      </div>
      {total === 0 ? (
        <div className="ag-muted ag-small">{emptyText ?? 'Nothing to flag — these animals and this water suit each other.'}</div>
      ) : (
        <div className="ag-compat__groups">
          {groups.map(([cat, list]) => {
            if (shown >= cap) return null;
            const meta = COMPAT_CATEGORY[cat] ?? COMPAT_CATEGORY.exception;
            const CatIcon = meta.icon;
            const visible = list.slice(0, Math.max(0, cap - shown));
            shown += visible.length;
            return (
              <div className="ag-compat__group" key={cat}>
                <div className="ag-compat__cat">
                  <CatIcon size={13} aria-hidden /> {meta.label}
                </div>
                <ul className="ag-compat__list">
                  {visible.map((r, i) => (
                    <ReasonRow key={i} r={r} existing={!involves(r)} />
                  ))}
                </ul>
              </div>
            );
          })}
          {total > cap && (
            <button type="button" className="ag-linkbtn" onClick={() => setShowAll(true)}>
              <ChevronDown size={14} aria-hidden /> Show all {total} reasons
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default CompatView;
