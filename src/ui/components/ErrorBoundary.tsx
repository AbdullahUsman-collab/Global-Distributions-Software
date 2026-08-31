/**
 * React Error Boundary
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 *
 * Prevents white-screen crashes from unhandled exceptions in any page.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.icon}>!</div>
            <h2 style={styles.title}>{this.props.fallbackTitle || 'Something went wrong'}</h2>
            <p style={styles.message}>
              {this.props.fallbackMessage || 'An unexpected error occurred. Please try again.'}
            </p>
            {this.state.error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error details</summary>
                <pre style={styles.pre}>{this.state.error.message}</pre>
              </details>
            )}
            <div style={styles.actions}>
              <button onClick={this.handleReset} style={styles.retryBtn}>Try Again</button>
              <button onClick={this.handleReload} style={styles.reloadBtn}>Reload Page</button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: '32px',
  },
  card: {
    textAlign: 'center',
    maxWidth: '480px',
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '32px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgb(0 0 0 / 0.1)',
  },
  icon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: '700',
    margin: '0 auto 16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: '8px',
  },
  message: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '16px',
    lineHeight: '1.5',
  },
  details: {
    marginBottom: '16px',
    textAlign: 'left',
  },
  summary: {
    fontSize: '13px',
    color: '#64748b',
    cursor: 'pointer',
    marginBottom: '8px',
  },
  pre: {
    fontSize: '12px',
    color: '#991b1b',
    backgroundColor: '#fef2f2',
    padding: '12px',
    borderRadius: '8px',
    overflow: 'auto',
    maxHeight: '120px',
    border: '1px solid #fecaca',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'center',
  },
  retryBtn: {
    padding: '8px 16px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  reloadBtn: {
    padding: '8px 16px',
    backgroundColor: '#ffffff',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};
