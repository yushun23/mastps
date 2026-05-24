import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

console.log('[MASTPS] main.tsx executing...');

// React Error Boundary
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[MASTPS] React ErrorBoundary caught:', error, info);
    const el = document.getElementById('load-indicator');
    if (el) {
      el.style.background = '#ef4444';
      el.textContent = '[MASTPS] REACT CRASH: ' + error.message;
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: '#ef4444', fontFamily: 'monospace' }}>
          <h2>应用崩溃</h2>
          <pre>{this.state.error?.message}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const root = document.getElementById('root');
if (root) {
  console.log('[MASTPS] root element found, mounting React...');
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
  console.log('[MASTPS] React mounted');
} else {
  console.error('[MASTPS] root element NOT FOUND!');
}