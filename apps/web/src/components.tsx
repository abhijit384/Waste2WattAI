import { Component, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from './auth';
import type { ScanStatus, WasteScan } from '@waste2watt/shared';

export function Mark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M5 18V6l7 7 7-7v12M12 13v7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
export function Brand() {
  return (
    <Link to="/" className="brand">
      <Mark />
      <span>
        Waste2Watt<span className="brand-ai"> AI</span>
      </span>
    </Link>
  );
}
export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="error-notice" role="alert">
      <p>{message}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Skeleton() {
  return (
    <div className="skeleton-group" role="status" aria-label="Loading analyses">
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
export function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">
        +
      </div>
      <h3>Your first insight starts with a photo.</h3>
      <p>Create a waste scan to build your analysis history. No sample results are shown here.</p>
      <Link className="button primary" to="/scan">
        Analyze waste <span aria-hidden="true">↗</span>
      </Link>
    </div>
  );
}
const statusNames: Record<ScanStatus, string> = {
  CREATED: 'Created',
  UPLOADING: 'Uploading',
  UPLOADED: 'Uploaded',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};
export function StatusBadge({ status }: { status: ScanStatus }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      <span aria-hidden="true" />
      {statusNames[status]}
    </span>
  );
}
export function ScanRows({
  scans,
  onSelect,
}: {
  scans: WasteScan[];
  onSelect?: (scan: WasteScan) => void;
}) {
  return (
    <ul className="scan-rows">
      {scans.map((scan) => (
        <li key={scan.scanId}>
          <div className="scan-symbol" aria-hidden="true">
            ↗
          </div>
          <div className="scan-summary">
            <strong>{scan.sourceLabel || 'Waste scan'}</strong>
            <span>
              {new Date(scan.createdAt).toLocaleString()} · {scan.quantityKg} kg, approximate
            </span>
          </div>
          <StatusBadge status={scan.status} />
          {onSelect && (
            <button
              className="text-button"
              onClick={() => onSelect(scan)}
              aria-label={`View scan ${scan.scanId}`}
            >
              View
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
export function Layout() {
  const auth = useAuth();
  const [signOutError, setSignOutError] = useState('');
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Application navigation">
          {[
            ['/dashboard', 'Overview', '01'],
            ['/scan', 'Analyze waste', '02'],
            ['/history', 'Analysis history', '03'],
            ['/digital-twin', 'Digital waste twin', '04'],
            ['/simulator', 'Scenario simulator', '05'],
            ['/advisor', 'AI advisor', '06'],
            ['/settings', 'Settings', '07'],
          ].map(([path, label, number]) => (
            <NavLink key={path} to={path!}>
              <span aria-hidden="true">{number}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="live-dot" />
          <strong>Foundation workspace</strong>
          <p>Analysis intelligence arrives in Phase 5.</p>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-header">
          <span className="workspace-breadcrumb">
            WORKSPACE <span>/</span> Waste intelligence
          </span>
          <div className="account-controls">
            <span className="account-avatar" aria-label="Authenticated account">
              W
            </span>
            <button
              className="text-button"
              onClick={() => {
                void auth
                  .signOut()
                  .catch(() => setSignOutError('Sign out could not finish. Please retry.'));
              }}
            >
              Sign out
            </button>
          </div>
        </header>
        <main id="main-content" className="workspace-main">
          {signOutError && <ErrorNotice message={signOutError} />}
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span>Waste2Watt AI</span>
          <span>Evidence first. Decisions next.</span>
        </footer>
      </div>
    </div>
  );
}
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    /* Intentionally do not log user data or stack traces. */
  }
  render() {
    return this.state.failed ? (
      <main className="fatal-error">
        <h1>We couldn’t display this page.</h1>
        <p>Your account data has not been changed. Reload to try again.</p>
        <button className="button primary" onClick={() => window.location.reload()}>
          Reload page
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
