// @vitest-environment node
/**
 * Audit 2026-11-17, B14 — on a phone (touch first) switching apps hides the page and pauses the game, so system
 * notifications never arrive: the bell's drawer stops inviting phone players to turn them on, and Settings ›
 * Notifications says why alerts stay in the game. Laptops and desktops are unchanged.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { newGame } from '@/sim/newGame';
import { useGame } from '@/state/game';
import { AlertsPopover } from '@/ui/hud/AlertsPopover';
import { NotificationsTab, PHONE_NOTE } from '@/ui/settings/NotificationsTab';
import { useNotifyPermission } from '@/ui/notify/deliver';
import { TOUCH_FIRST_QUERY } from '@/ui/common/safe';

/** Server-render with a window whose media queries answer like a phone (touch first) or a laptop. */
function render(el: Parameters<typeof renderToStaticMarkup>[0], touch: boolean): string {
  const media = (q: string) => ({ matches: touch && q === TOUCH_FIRST_QUERY, addEventListener() {}, removeEventListener() {} });
  vi.stubGlobal('window', { matchMedia: media, addEventListener() {}, removeEventListener() {}, innerWidth: touch ? 390 : 1440, innerHeight: touch ? 844 : 900 });
  try {
    return renderToStaticMarkup(el);
  } finally {
    vi.unstubAllGlobals();
  }
}

afterEach(() => {
  useGame.setState({ game: null });
  Object.assign(useGame.getInitialState(), { game: null });
  useNotifyPermission.setState({ permission: 'unsupported' });
  Object.assign(useNotifyPermission.getInitialState(), useNotifyPermission.getState());
});

describe('B14: system notifications on a phone', () => {
  it('the drawer invites a laptop to turn them on, but not a phone', () => {
    useGame.getState().setGame(newGame({ starterId: 'betta', starterName: 'Phone', seed: 9 }));
    Object.assign(useGame.getInitialState(), useGame.getState());
    useNotifyPermission.setState({ permission: 'default' });
    Object.assign(useNotifyPermission.getInitialState(), useNotifyPermission.getState());
    expect(render(createElement(AlertsPopover), false)).toContain('alerts-notify-cta');
    expect(render(createElement(AlertsPopover), true)).not.toContain('alerts-notify-cta');
  });

  it('Settings › Notifications on a phone says why alerts stay in the game', () => {
    for (const permission of ['default', 'granted', 'denied'] as const) {
      useNotifyPermission.setState({ permission });
      Object.assign(useNotifyPermission.getInitialState(), useNotifyPermission.getState());
      expect(render(createElement(NotificationsTab), true)).toContain(PHONE_NOTE);
      expect(render(createElement(NotificationsTab), false)).not.toContain(PHONE_NOTE);
    }
    expect(PHONE_NOTE).toBe('On a phone, the game pauses when you switch apps, so alerts show in the game.');
  });
});
