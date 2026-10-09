import { Component, createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { profileInitial, useAuth } from './auth';
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
type Theme = 'dark' | 'light';
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem('w2w-theme', theme);
    } catch {
      // Keep the in-memory choice when browser storage is unavailable.
    }
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme: () => setTheme((value) => (value === 'dark' ? 'light' : 'dark')),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeToggle() {
  const context = useContext(ThemeContext);
  if (!context) return null;
  const nextTheme = context.theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={context.theme === 'light'}
      title={`Switch to ${nextTheme} mode`}
      onClick={context.toggleTheme}
    >
      {context.theme === 'dark' ? (
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
          <path d="M20.2 15.2A8.5 8.5 0 0 1 8.8 3.8 8.7 8.7 0 1 0 20.2 15.2Z" />
        </svg>
      )}
      <span>{nextTheme === 'light' ? 'Light' : 'Dark'}</span>
    </button>
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
            ['/advisor', 'Sustainability advisor', '06'],
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
          <p>AI analysis is currently unavailable.</p>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-header">
          <span className="workspace-breadcrumb">
            WORKSPACE <span>/</span> Waste intelligence
          </span>
          <div className="account-controls">
            <ThemeToggle />
            <Link
              to="/settings"
              className="account-avatar"
              aria-label={`Profile${auth.profile?.firstName ? ` for ${auth.profile.firstName}` : ''}`}
              title="Open your profile"
            >
              {profileInitial(auth.profile)}
            </Link>
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
