/**
 * lane:automation (chunk 5; DESIGN-S3D §7.6, AUTO-035) — Operations › Problems' line card, server-rendered: the chain's
 * quarantine step in the design's words, and "Why the line stops" when a busy quarantine tank holds the line up
 * (the chunk 5 review: the card was missing).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { lineFarm } from './support/production';
import { useGame } from '@/state/game';
import { opsSnapshot } from '@/ui/common/ops';
import { ProblemsView } from '@/ui/panels/operations/Problems';
import { dayOf } from '@/sim/time';
import { QUARANTINE_HOURS } from '@/sim/production';

afterEach(() => useGame.setState({ game: null }));

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, '’').replace(/\s+/g, ' ');

describe('AUTO-035: a line held up by a busy quarantine tank', () => {
  it('names the batch in quarantine and its day, and says why the line stops: a second tank against waiting', () => {
    const { g, lineId, tanks } = lineFarm(17);
    g.progress.unlocked.push('operations_desk');
    const line = g.production!.lines.find((l) => l.id === lineId)!;
    const now = g.clock.hour;
    // the last batch went into quarantine a day ago; the next one is sorted and waits for it
    line.batches = [
      { id: 'b1', creatureIds: [], sortedHour: now - 30, tankId: tanks.qt.id, quarantinedHour: now - 24 },
      { id: 'b2', creatureIds: [], sortedHour: now - 1 },
    ];
    line.waiting = true;
    useGame.setState({ game: g });
    const html = text(renderToStaticMarkup(createElement(ProblemsView, { g, snap: opsSnapshot(g), nav: { tab: () => {}, view: () => {} } })));
    const until = dayOf(now - 24 + QUARANTINE_HOURS);
    expect(html).toContain(`${line.name} until Day ${until}`);
    expect(html).toContain('Why the line stops');
    expect(html).toContain(`Quarantine serves the ${line.name} and each batch stays 7 days, so the ${line.name.replace(/ line$/, '')} juveniles can’t start quarantine until Day ${until}. Grow-out stays full until then.`);
    expect(html).toContain(`With a second quarantine tank Resumes Day ${dayOf(now)}`);
    expect(html).toContain(`If you wait Resumes Day ${until} (one clutch starts ${until - dayOf(now)} days late; no animals are lost)`);
  });
});
