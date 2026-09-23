/**
 * Sandbox (lane ui-panels): the live scene + PanelHost + a tiny panel switcher and toast list, so panels can be
 * reviewed before the ui-shell mounts them.  ?sandbox=ui-panels-host&fixture=panels
 */
import { Scene } from '@/render/Scene';
import { GameLoop } from '@/game/GameLoop';
import { PanelHost, MANAGED_PANELS } from '@/ui/panels/PanelHost';
import { useUI } from '@/state/ui';
import '@/ui/styles/base.css';
import '@/ui/styles/tokens.css';

function Toasts() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div style={{ position: 'fixed', left: 16, top: 16, display: 'grid', gap: 6, zIndex: 80, maxWidth: 360 }}>
      {toasts.map((t) => (
        <div key={t.id} data-testid="toast" style={{ background: 'rgba(8,20,28,0.9)', color: '#e9f4f6', border: '1px solid rgba(200,235,245,0.2)', borderRadius: 12, padding: '8px 12px', fontSize: 13, fontFamily: 'Inter Variable, system-ui' }} onClick={() => useUI.getState().dismissToast(t.id)}>
          <b style={{ textTransform: 'capitalize' }}>{t.kind}</b> · {t.text}
        </div>
      ))}
    </div>
  );
}

export default function UiPanelsHost() {
  const panel = useUI((s) => s.panel);
  return (
    <div className="app-root">
      <Scene />
      <GameLoop />
      <PanelHost />
      <Toasts />
      <div style={{ position: 'fixed', left: '50%', bottom: 16, transform: 'translateX(-50%)', display: 'flex', gap: 6, zIndex: 50, background: 'rgba(8,20,28,0.7)', padding: 6, borderRadius: 999, backdropFilter: 'blur(12px)' }}>
        {MANAGED_PANELS.map((p) => (
          <button
            key={p}
            data-testid={`dock-${p}`}
            onClick={() => useUI.getState().set({ panel: panel === p ? null : p, panelTarget: null })}
            style={{ border: 0, borderRadius: 999, padding: '8px 12px', cursor: 'pointer', background: panel === p ? '#5eead4' : 'transparent', color: panel === p ? '#04201d' : '#b5c8cd', fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
