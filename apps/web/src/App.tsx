import { useMemo } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './auth';
import { createApi } from './api';
import { Brand, ErrorBoundary, Layout } from './components';
import {
  AuthPage,
  ConfigurationNotice,
  Dashboard,
  FuturePage,
  History,
  Landing,
  ScanPage,
  Settings,
} from './pages';
import type { FrontendConfig } from './config';

export function ApplicationRoutes({ config }: { config: FrontendConfig }) {
  const api = useMemo(() => createApi(config), [config]);
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<AuthPage config={config} />} />
      <Route
        element={
          config.configured ? (
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          ) : (
            <main className="configuration-shell">
              <Brand />
              <ConfigurationNotice config={config} />
              <Link to="/">Return home</Link>
            </main>
          )
        }
      >
        <Route path="/dashboard" element={<Dashboard api={api} />} />
        <Route path="/scan" element={<ScanPage api={api} />} />
        <Route path="/history" element={<History api={api} />} />
        <Route
          path="/digital-twin"
          element={
            <FuturePage
              eyebrow="DIGITAL WASTE TWIN"
              title="See your waste system as a whole."
              description="A future workspace for connected, measured waste streams."
            />
          }
        />
        <Route
          path="/simulator"
          element={
            <FuturePage
              eyebrow="SCENARIO SIMULATOR"
              title="Explore the possibilities responsibly."
              description="Evidence-based scenarios will arrive with verified recovery methods."
            />
          }
        />
        <Route
          path="/advisor"
          element={
            <FuturePage
              eyebrow="AI SUSTAINABILITY ADVISOR"
              title="Better questions. Grounded decisions."
              description="A future advisor built on your data, sources, and uncertainty."
            />
          }
        />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route
        path="*"
        element={
          <main className="configuration-shell">
            <Brand />
            <h1>Page not found</h1>
            <Link to="/">Return home</Link>
          </main>
        }
      />
    </Routes>
  );
}
export function App({ config }: { config: FrontendConfig }) {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <AuthProvider configured={config.configured}>
          <ApplicationRoutes config={config} />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
