import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { BUILD_TAG } from './buildTag.ts'
import { isTelemetryEnabled } from './game/telemetry.ts'

// EARLY ERROR VISIBILITY: any uncaught error is mirrored into the tab title (visible
// without opening devtools) and a fixed red banner — so a load failure self-reports.
const banner = document.createElement('div')
banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#5a1207;color:#ffd9c9;font:12px monospace;padding:6px 10px;display:none;white-space:pre-wrap'
document.body.appendChild(banner)
function report(err: unknown, src = 'runtime', file = '') {
  const errStr = String((err as Error)?.stack || (err as Error)?.message || err);
  if (errStr.includes('pointer lock') || errStr.includes('WrongDocumentError') || errStr.includes('user gesture')) {
    return;
  }
  const origin = location.origin;
  const ownFile = !file || file.startsWith(origin) || file.startsWith('/') || file.startsWith('blob:') || file.includes('assets/');
  const sameOriginStack = !errStr.includes('chrome-extension://') && !errStr.includes('moz-extension://');
  const msg = `${src}: ${errStr.slice(0, 400)}`
  console.error(msg)
  if (!ownFile || !sameOriginStack) {
    try {
      if (isTelemetryEnabled()) navigator.sendBeacon('/api/debug/client-error', JSON.stringify({
        ts: new Date().toISOString(), tag: BUILD_TAG, href: location.pathname, msg: `foreign-frame-suppressed: ${msg}`
      }));
    } catch { /* noop */ }
    return;
  }
  document.title = `ERR ${msg}`
  banner.style.display = 'block'
  banner.textContent = `BUILD ${BUILD_TAG} — ${msg}`
  // also mirror to the server (readable by the dev from data/client-errors.log)
  if (!isTelemetryEnabled()) return
  try {
    navigator.sendBeacon('/api/debug/client-error', JSON.stringify({
      ts: new Date().toISOString(), tag: BUILD_TAG, href: location.href, msg
    }))
  } catch { /* noop */ }
}
window.addEventListener('error', (e) => report(e.error || e.message, 'error', e.filename || ''))
window.addEventListener('unhandledrejection', (e) => report(e.reason, 'rejection'))
// BFCACHE GUARD: a back/forward-button restore resurrects the entire old JS
// heap with zero network traffic — silently pinning a stale bundle with no
// request the server could ever answer. Never allow it: reload for real.
window.addEventListener('pageshow', (e) => {
  if (e.persisted) window.location.reload();
})
;(window as unknown as { __BUILD_TAG?: string }).__BUILD_TAG = BUILD_TAG
console.info(`[build] ${BUILD_TAG}`)

  // React error boundary: a render throw anywhere in the app used to unmount the
  // whole tree into a white screen with no recovery. Now it shows a panel with a
  // soft "restart game view" (re-mounts App, no page reload) plus a full-reload
  // escape hatch, and beacons the crash when telemetry is opted in.
class GameErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null; gen: number }> {
  state: { error: Error | null; gen: number } = { error: null, gen: 0 };
  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }
  componentDidCatch(error: Error): void {
    report(error, 'react-boundary');
    if (!isTelemetryEnabled()) return;
    try {
      navigator.sendBeacon?.('/api/debug/client-error', JSON.stringify({
        ts: new Date().toISOString(), tag: BUILD_TAG, href: location.pathname,
        msg: `react-boundary: ${String(error?.stack || error?.message || error).slice(0, 600)}`
      }));
    } catch { /* noop */ }
  }
  render(): ReactNode {
    if (this.state.error) {
      return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(8,10,14,0.96)', padding: 16 }}>
          <div className="mc-window" style={{ maxWidth: 520, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#FFFFA0', marginBottom: 8 }}>Something broke in the game view</div>
            <div style={{ fontSize: 12, color: '#ffb3a6', fontFamily: 'monospace', whiteSpace: 'pre-wrap', marginBottom: 6 }}>{String(this.state.error?.message || this.state.error).slice(0, 400)}</div>
            <div style={{ fontSize: 11, color: '#8a8f98', marginBottom: 14 }}>BUILD {BUILD_TAG} — the crash was logged. Your saved world data is intact.</div>
            <button className="mc-button" style={{ marginRight: 8, padding: '8px 14px' }} onClick={() => this.setState({ error: null, gen: this.state.gen + 1 })}>
              ↻ Restart game view
            </button>
            <button className="mc-button" style={{ padding: '8px 14px' }} onClick={() => window.location.reload()}>
              Full page reload
            </button>
          </div>
        </div>
      );
    }
    return <div key={this.state.gen}>{this.props.children}</div>;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <GameErrorBoundary>
        <App />
      </GameErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)
