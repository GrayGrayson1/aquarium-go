/**
 * Isolates render failures so one broken layer can never blank the whole app. OWNER: core.
 *
 * lane:fix-core (S06-06) — the game loop lives outside every boundary, so after an interface crash the aquarium
 * kept running and autosaving behind a blank HUD with no way to pause, save or leave. The fallback now pauses the
 * clock and offers "Save & reload" / "Reload" next to "Try again". chunk 13: in a shared shop it pauses nothing and
 * offers "Back to my aquarium" instead of saving.
 */
import { Component, type ReactNode } from 'react';
import { useGame } from '@/state/game';
import '@/game/dispatch'; // installs the solo dispatcher
import { saveCurrentGame } from '@/persistence/session';
import { inSharedShop } from '@/state/sharedMode';
import { leaveSharedShop } from '@/ui/shared/session';
import { SHARED_WORDS } from '@/ui/shared/words';

interface Props {
  name: string;
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error(`[${this.props.name}] crashed:`, error);
    // Don't let the aquarium run unattended behind a broken interface. chunk 13 (SHARED-SHOPS.md §7.3): a shared shop
    // isn't paused (that would pause everyone's); the way back leaves it instead.
    if (this.props.name === 'interface' && !inSharedShop()) {
      try {
        if (useGame.getState().game?.clock.speed !== 0) useGame.getState().dispatch({ k: 'setSpeed', speed: 0 });
      } catch {
        /* the store itself may be what broke */
      }
    }
  }
  retry = () => this.setState({ error: null });
  reload = () => location.reload();
  saveAndReload = async () => {
    try {
      await saveCurrentGame('auto', { flush: true, toast: false });
    } catch {
      /* reload anyway — the autosave on pagehide gets another chance */
    }
    location.reload();
  };
  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;
    const btn = { borderRadius: 999, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: 'inherit', padding: '4px 12px', cursor: 'pointer', font: 'inherit' } as const;
    const shared = inSharedShop();
    const canSave = !shared && !!useGame.getState().game && !useGame.getState().game!.isShowcase;
    return (
      <div role="alert" data-testid={`error-boundary-${this.props.name.replace(/\s+/g, '-')}`} style={{ position: 'absolute', left: 16, bottom: 16, zIndex: 90, maxWidth: 420, padding: '12px 16px', borderRadius: 14, background: 'rgba(40,10,10,0.85)', border: '1px solid rgba(248,113,113,0.5)', color: '#ffe1e1', font: '13px Inter Variable, system-ui, sans-serif' }}>
        <strong>Something in the {this.props.name} hiccuped.</strong>
        <div style={{ opacity: 0.8, margin: '4px 0 8px' }}>{this.state.error.message}</div>
        {this.props.name === 'interface' && !shared && <div style={{ opacity: 0.8, margin: '0 0 8px' }}>Your aquarium is paused. Try again, or save and reload the page.</div>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={this.retry} style={btn}>
            Try again
          </button>
          {canSave && (
            <button type="button" onClick={() => void this.saveAndReload()} style={btn}>
              Save &amp; reload
            </button>
          )}
          {shared && (
            <button type="button" onClick={() => void leaveSharedShop().then(this.retry)} style={btn} data-testid="error-boundary-leave-shared">
              {SHARED_WORDS.back}
            </button>
          )}
          <button type="button" onClick={this.reload} style={btn}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
