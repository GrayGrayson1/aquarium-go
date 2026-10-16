/**
 * Settings › Notifications (0.5 spec §12.3–§12.5; ADR-0022 decision 4 for the Unsupported copy). OWNER: lane "notify".
 *
 * Web wording only: a browser tab can't notify once it is closed, so no copy here promises that (the phone-app
 * wording waits for the native wrapper, NOTIFY-011). The category switches stay locked (focusable, with the reason)
 * until the browser allows notifications.
 */
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Bell, BellOff, BellRing, Send, Sparkles, HeartPulse, Gavel, Egg, Trophy, Moon, Ban, Gauge, MonitorSmartphone } from 'lucide-react';
import { sfx } from '@/audio/sfx';
import { Button, Section, Toggle } from '../kit';
import { requestNotifications, sendTestNotification, useNotifyPermission, refreshNotifyPermission, TEST_DELAY_MS } from '../notify/deliver';
import { useNotifyPrefs } from '../notify/prefs';
import type { NotifyCategory } from '../notify/rules';
import type { NotifyPermission } from '@/platform';

/** §12.3's callout per permission state (web). */
export const NOTIFY_STATUS: Record<NotifyPermission, { title: string; text: string; tone: 'info' | 'good' | 'watch' | 'muted' }> = {
  default: { title: 'Notifications are off', text: 'Get a nudge for rare stock, hungry animals and sales while Aquarium Go is open, even when you’re in another window.', tone: 'info' },
  granted: { title: 'Notifications are on', text: 'This browser shows alerts while Aquarium Go is open, even in another window. Close the tab and they stop.', tone: 'good' },
  denied: { title: 'Blocked in your browser', text: 'To turn them on, allow notifications for this site in your browser’s site settings, then come back.', tone: 'watch' },
  unsupported: { title: 'This browser can’t show notifications', text: 'Alerts still appear in the game.', tone: 'muted' },
};

/** §12.2's categories: title and the exact Settings subtitle. */
export const NOTIFY_CATEGORY_ROWS: { id: NotifyCategory; title: string; sub: string; icon: typeof Bell }[] = [
  { id: 'rare', title: 'Rare stock', sub: 'Prismatic animals and rare strains in the shop', icon: Sparkles },
  { id: 'care', title: 'Animal care', sub: 'Hungry or sick animals, empty autofeeders', icon: HeartPulse },
  { id: 'market', title: 'Market', sub: 'New bids, sales and auctions ending', icon: Gavel },
  { id: 'breeding', title: 'Breeding', sub: 'Eggs laid and fry hatched', icon: Egg },
  { id: 'shows', title: 'Shows', sub: 'Results from shows you entered', icon: Trophy },
  // lane:automation (chunk 5, DESIGN-S3D §8.9; the subtitle is ADR-0026 decision 11's)
  { id: 'auto', title: 'Automation', sub: 'Shortages and paused lines', icon: Gauge },
];

const STATUS_ICON: Record<NotifyPermission, typeof Bell> = { default: Bell, granted: BellRing, denied: BellOff, unsupported: Ban };

export function NotificationsTab() {
  const permission = useNotifyPermission((s) => s.permission);
  const prefs = useNotifyPrefs();
  const [sent, setSent] = useState(false);
  const timer = useRef(0);
  useEffect(() => {
    refreshNotifyPermission();
    return () => window.clearTimeout(timer.current);
  }, []);
  const granted = permission === 'granted';
  const status = NOTIFY_STATUS[permission];
  const StatusIcon = STATUS_ICON[permission];
  const testLine = !granted ? 'Turn notifications on to try this' : sent ? 'Sent — it appears at the top of the screen' : 'Arrives in a couple of seconds';
  return (
    <>
      <div className={clsx('ag-notify-status', `is-${status.tone}`)} data-testid="notify-status" data-permission={permission} role="status">
        <StatusIcon size={18} aria-hidden className="ag-notify-status__icon" />
        <div className="ag-grow">
          {/* the locked category switches point here for their reason (aria-describedby) */}
          <div className="ag-notify-status__title" id="notify-status-title">{status.title}</div>
          <div className="ag-notify-status__text">{status.text}</div>
        </div>
        {permission === 'default' && (
          <Button variant="primary" size="sm" data-testid="notify-turn-on" onClick={() => void requestNotifications()}>
            Turn on
          </Button>
        )}
      </div>

      {/* chunk 6 (DES-011): the section heads' small icons, as phone-notif-off.png draws them */}
      <Section title={<><MonitorSmartphone size={12} aria-hidden /> This browser</>}>
        <div className="ag-notify-row">
          <span className="ag-notify-row__icon" aria-hidden>
            <Send size={16} />
          </span>
          <div className="ag-grow">
            <div className="ag-notify-row__title">Test notification</div>
            <div className="ag-notify-row__sub" data-testid="notify-test-line">{testLine}</div>
          </div>
          <Button
            size="sm"
            data-testid="notify-test"
            onClick={() => {
              sfx('click');
              if (!sendTestNotification()) return;
              window.clearTimeout(timer.current);
              timer.current = window.setTimeout(() => setSent(true), TEST_DELAY_MS);
            }}
          >
            <Send size={14} aria-hidden /> Send test
          </Button>
        </div>
      </Section>

      <Section title={<><Bell size={12} aria-hidden /> Notify me about</>}>
        {NOTIFY_CATEGORY_ROWS.map((c) => (
          <div key={c.id} className={clsx('ag-notify-row', !granted && 'is-locked')}>
            <span className="ag-notify-row__icon" aria-hidden>
              <c.icon size={16} />
            </span>
            <div className="ag-grow">
              <div className="ag-notify-row__title">{c.title}</div>
              <div className="ag-notify-row__sub">{c.sub}</div>
            </div>
            <Toggle
              label={`${c.title} notifications`}
              testId={`notify-cat-${c.id}`}
              checked={granted && prefs.categories[c.id]} /* chunk 6 (DES-011): off until notifications are allowed, as the 0.5 screens draw it; the stored choice comes back once they are */
              locked={!granted}
              describedBy={!granted ? 'notify-status-title' : undefined}
              onChange={(v) => prefs.setCategory(c.id, v)}
            />
          </div>
        ))}
      </Section>

      <Section title="Quiet hours">
        <div className="ag-notify-row">
          <span className="ag-notify-row__icon" aria-hidden>
            <Moon size={16} />
          </span>
          <div className="ag-grow">
            <div className="ag-notify-row__title">10:00 PM – 8:00 AM</div>
            <div className="ag-notify-row__sub">Urgent animal care still comes through</div>
          </div>
          <Toggle label="Quiet hours, 10:00 PM to 8:00 AM" testId="notify-quiet" checked={prefs.quiet.on} onChange={(v) => prefs.setQuiet(v)} />
        </div>
      </Section>
    </>
  );
}
