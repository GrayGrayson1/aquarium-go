/** Isolates render failures so one broken layer can never blank the whole app. OWNER: core. */
import { Component, type ReactNode } from 'react';

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
  }
  retry = () => this.setState({ error: null });
  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;
    return (
      <div role="alert" style={{ position: 'absolute', left: 16, bottom: 16, zIndex: 90, maxWidth: 420, padding: '12px 16px', borderRadius: 14, background: 'rgba(40,10,10,0.85)', border: '1px solid rgba(248,113,113,0.5)', color: '#ffe1e1', font: '13px Inter Variable, system-ui, sans-serif' }}>
        <strong>Something in the {this.props.name} hiccuped.</strong>
        <div style={{ opacity: 0.8, margin: '4px 0 8px' }}>{this.state.error.message}</div>
        <button type="button" onClick={this.retry} style={{ borderRadius: 999, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: 'inherit', padding: '4px 12px', cursor: 'pointer' }}>
          Try again
        </button>
      </div>
    );
  }
}
