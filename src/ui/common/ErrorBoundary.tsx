/**
 * Isolates UI sections from errors in other lanes' code (stubs, mid-edit modules). OWNER: lane "ui-shell".
 */
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Rendered instead of children after an error. */
  fallback?: ReactNode;
  /** Label for the console warning. */
  name?: string;
  /** Changing this resets the boundary (e.g. the selected creature id). */
  resetKey?: unknown;
}

export class ErrorBoundary extends Component<Props, { error: Error | null; key: unknown }> {
  state = { error: null as Error | null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: { error: Error | null; key: unknown }) {
    if (props.resetKey !== state.key) return { error: null, key: props.resetKey };
    return null;
  }

  componentDidCatch(error: Error) {
    console.warn(`[ui] ${this.props.name ?? 'section'} crashed:`, error);
  }

  render() {
    if (this.state.error) return this.props.fallback ?? null;
    return this.props.children;
  }
}
