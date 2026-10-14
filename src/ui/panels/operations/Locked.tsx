/**
 * Operations' locked pages (DESIGN-S3D §7.8): an address that opens before its tier shows what unlocks it. Before the
 * Operations Desk (the Overview's before-the-Desk layout) the Problems and Hold all pages show the "What opens up next"
 * card instead of the early ladder. OWNER: lane "automation" (chunk 5).
 */
import { ArrowLeft, ChevronRight, Droplets, Egg, Gauge, Hand } from 'lucide-react';
import type { GameState } from '@/types';
import { Badge } from '@/ui/kit';
import { go } from '@/ui/nav/router';
import { opsTier, tierLadder } from '@/ui/common/ops';
import { Status, Reqs, Ladder } from './parts';
import type { OpsNav } from './OperationsPanel';

const PAGES = {
  water: { tier: 2, title: 'The Water room isn’t built yet', icon: <Droplets size={20} aria-hidden />, key: 'water' as const },
  feed: { tier: 3, title: 'The Live food room isn’t built yet', icon: <Egg size={20} aria-hidden />, key: 'food' as const },
  issues: { tier: 5, title: 'Problems open with the Operations Desk', icon: <Gauge size={20} aria-hidden />, key: 'tools' as const },
  manual: { tier: 5, title: 'Hold all opens with the Operations Desk', icon: <Hand size={20} aria-hidden />, key: 'tools' as const },
};

export function LockedPage({ g, which, nav }: { g: GameState; which: keyof typeof PAGES; nav: OpsNav }) {
  const page = PAGES[which];
  const ladder = tierLadder(g);
  const tier = ladder.find((t) => t.key === page.key)!;
  const before = opsTier(g).layout !== 'early';
  return (
    <>
      {(which === 'issues' || which === 'manual') && (
        <button type="button" className="ops-link" onClick={() => nav.view(null)}>
          <ArrowLeft size={15} aria-hidden /> Overview
        </button>
      )}
      <section className="ops-locked" data-testid={`ops-locked-${which}`}>
        <div className="ops-card__head">
          <span className="ops-chip ops-chip--lg">{page.icon}</span>
          <h3 className="ops-card__title" style={{ fontSize: 17 }}>
            {page.title}
          </h3>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Status tone="neutral" icon="locked">
            Tier {page.tier}
          </Status>
          <Badge tone="aqua">New</Badge>
        </div>
        <span className="ops-card__body">{tier.desc}.</span>
        <span className="ops-muted">Links to this page keep working; they show this until it opens.</span>
        <Reqs reqs={tier.reqs} />
      </section>
      {before ? (
        <Ladder
          tiers={ladder}
          title="What opens up next"
          testId="ops-next-up"
          end={
            <button type="button" className="ops-link" data-testid="ops-next-up-research" onClick={() => go({ kind: 'panel', panel: 'research' })}>
              Research <ChevronRight size={14} aria-hidden />
            </button>
          }
        />
      ) : (
        <Ladder tiers={ladder} title="What opens up next" testId="ops-ladder" />
      )}
    </>
  );
}
