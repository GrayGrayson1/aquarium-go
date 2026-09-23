/**
 * Keeps one misbehaving panel (e.g. while another lane's domain code is mid-edit) from taking down the whole UI.
 * OWNER: lane "ui-panels".
 */
import { Component, type ReactNode } from 'react';
import { RefreshCw, X } from 'lucide-react';

interface Props {
  children: ReactNode;
  onClose: () => void;
}
interface State {
  error: Error | null;
}

export class PanelErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.warn('[panels] panel crashed', error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="pn-layout">
        <div className="pn-crash">
          <div className="pn-empty__title">This panel hit a snag</div>
          <p className="pn-empty__text">Something unexpected happened while drawing it. Your aquarium is fine — try again.</p>
          <pre className="pn-crash__msg">{String(this.state.error.message).slice(0, 240)}</pre>
          <div className="pn-row pn-gap-2">
            <button type="button" className="ag-btn ag-btn--primary" onClick={() => this.setState({ error: null })}>
              <RefreshCw size={15} /> Try again
            </button>
            <button type="button" className="ag-btn" onClick={this.props.onClose}>
              <X size={15} /> Close
            </button>
          </div>
        </div>
      </div>
    );
  }
}
