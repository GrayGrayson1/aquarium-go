/**
 * lane:ui-shell (chunk 1; DES-003, DES-004; 0.5 spec §16; ADR-0019) — the 0.5 navigation, links-and-boot and
 * locked-panel strings render exactly as the copy deck and the owner's answers write them (curly apostrophes, the
 * ellipsis character, the › separator). Components are server-rendered, as in ui-prismatic.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useGame } from '@/state/game';
import { newGame } from '@/sim/newGame';
import { TabBar } from '@/ui/hud/TabBar';
import { MoreSheetBody } from '@/ui/hud/MoreSheet';
import { BootCardView, bootLine, awayText } from '@/ui/nav/BootCard';
import { BROKEN_LINK, NOT_FOUND } from '@/ui/nav/router';
import { routeLabel, parseRoute } from '@/ui/nav/routes';
import { moreGuideCopy } from '@/ui/tutorial/TutorialCoach';
import { CopyLinkButton } from '@/ui/panels/market/OfferLink';
import { VisitorsPanel } from '@/ui/panels/visitors/VisitorsPanel';
import { ShowsPanel } from '@/ui/panels/shows/ShowsPanel';
import { tooNewMessage } from '@/persistence/migrations';

const html = (el: ReturnType<typeof createElement>) => renderToStaticMarkup(el);
/** The visible text of rendered markup (tags dropped, entities a test could meet decoded). */
const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

describe('§16 Navigation', () => {
  it('the tab bar reads Tanks · Livestock · Market · Build · More', () => {
    const out = html(createElement(TabBar));
    expect(out).toContain('data-testid="nav-tabbar"');
    expect([...out.matchAll(/class="ag-tabbar__label">([^<]+)</g)].map((m) => m[1])).toEqual(['Tanks', 'Livestock', 'Market', 'Build', 'More']);
  });

  describe('the More sheet', () => {
    it('is titled More, with the five tiles and the Settings row', () => {
      const out = html(createElement(MoreSheetBody, { isLocked: () => false, dots: {} }));
      expect(out).toMatch(/<h2[^>]*>More<\/h2>/);
      expect([...out.matchAll(/class="ag-more__label">([^<]+)</g)].map((m) => m[1])).toEqual(['Visitors', 'Shows', 'Research', 'Finances', 'Encyclopedia']);
      expect(out).toContain('<span class="ag-more__rowtitle">Settings</span>');
      expect(out).toContain('<span class="ag-more__rowsub">Saves, sound, notifications</span>');
    });
  });

  it('the guide on phones: “Guide · Research” / “Research now lives under More. Tap More, then Research.”', () => {
    expect(moreGuideCopy('Research')).toEqual({ label: 'Guide · Research', text: 'Research now lives under More. Tap More, then Research.' });
  });
});

describe('§16 Links and boot', () => {
  it('the broken-link toast', () => {
    expect(BROKEN_LINK).toEqual({ title: 'That link doesn’t go anywhere', detail: 'Opened your aquarium instead.' });
  });

  it('the loading card: “Loading your save · catching up {duration}…”, or just “Loading your save…”', () => {
    expect(bootLine(3 * 3_600_000 + 12 * 60_000)).toBe('Loading your save · catching up 3 h 12 min…');
    expect(bootLine(40 * 60_000)).toBe('Loading your save · catching up 40 min…');
    expect(bootLine(5 * 3_600_000)).toBe('Loading your save · catching up 5 h…');
    expect(bootLine(3 * 86_400_000)).toBe('Loading your save · catching up 3 days…');
    expect(bootLine(30_000)).toBe('Loading your save…');
    expect(bootLine(null)).toBe('Loading your save…');
    expect(awayText(59_999)).toBeNull();
  });

  it('the card renders its line and “Then: {destination}” with the › separator', () => {
    const card = (boot: Parameters<typeof BootCardView>[0]['boot']) => html(createElement(BootCardView, { boot }));
    const out = text(card({ dest: routeLabel(parseRoute('#/livestock/eggs')!.route), awayMs: 3 * 3_600_000 + 12 * 60_000 }));
    expect(out).toContain('Loading your save · catching up 3 h 12 min…');
    expect(out).toContain('Then: Livestock › Eggs & fry');
    expect(card({ dest: null, awayMs: 1000 })).toContain('data-testid="boot-deeplink"');
    expect(card({ dest: null, awayMs: 1000 })).not.toContain('boot-deeplink-dest');
    expect(card(null)).toBe('');
  });

  it('Copy link / Copy link to this offer / Link copied', () => {
    const link = (state: 'idle' | 'copied') => ({ state, url: null, copy: async () => undefined });
    expect(text(html(createElement(CopyLinkButton, { link: link('idle'), phone: false })))).toBe('Copy link');
    expect(text(html(createElement(CopyLinkButton, { link: link('copied'), phone: false })))).toBe('Link copied Link copied'); // the button, and its announcement
    expect(html(createElement(CopyLinkButton, { link: link('idle'), phone: true }))).toContain('aria-label="Copy link to this offer"');
  });
});

describe('§16 Locked panels (§5.7)', () => {
  beforeAll(() => useGame.getState().setGame(newGame({ starterId: 'betta', starterName: 'Copy', seed: 9 })));
  afterAll(() => useGame.getState().setGame(null));

  it('Visitors before the Specialty Shop', () => {
    const out = text(html(createElement(VisitorsPanel)));
    expect(out).toContain('Visitors open with a Specialty Shop');
    expect(out).toContain('Upgrade to a specialty shop to welcome paying visitors. Links to this page keep working — they show this until it unlocks.');
    expect(out).toContain('Open Build › Facility');
  });

  it('Shows before the guide is done', () => {
    const out = text(html(createElement(ShowsPanel)));
    expect(out).toContain('Shows unlock after the guide');
    expect(out).toContain('Finish the guide or reach 20 reputation to enter club shows.');
  });
});

describe('ADR-0019 decision 4: links to things that no longer exist, and a newer save', () => {
  it('reads as the owner approved', () => {
    expect(NOT_FOUND.tank).toMatchObject({ title: 'That tank isn’t in your aquarium', detail: 'Showing your tanks instead.' });
    expect(NOT_FOUND.creature).toMatchObject({ title: 'That animal isn’t in your aquarium', detail: 'Showing your livestock instead.' });
    expect(NOT_FOUND.listing).toMatchObject({ title: 'That listing isn’t here any more', detail: 'Showing your listings instead.' });
    expect(NOT_FOUND.species).toMatchObject({ title: 'There’s no page for that species', detail: 'Showing every species instead.' });
    expect(tooNewMessage(2)).toMatch(/newer version of Aquarium Go .* Refresh the page to get the latest version\.$/);
  });
});
