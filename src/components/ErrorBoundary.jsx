import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('App Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: '#0a0c14', color: '#e2e8f0', height: '100vh',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', fontFamily: 'monospace', padding: '40px',
          gap: '16px'
        }}>
          <div style={{ fontSize: '32px' }}>⚠️</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>
            App Crash — Runtime Error
          </div>
          <div style={{
            background: '#1a1d2e', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px', padding: '16px', maxWidth: '700px',
            fontSize: '13px', color: '#fca5a5', whiteSpace: 'pre-wrap', wordBreak: 'break-all'
          }}>
            {this.state.error?.toString()}
            {'\n\n'}
            {this.state.error?.stack}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
