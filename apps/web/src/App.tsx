import { useMemo } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './auth';
import { createApi } from './api';
import { Brand, ErrorBoundary, Layout, ThemeProvider } from './components';
import {
  AuthPage,
  Advisor,
  ConfigurationNotice,
  Dashboard,
  DigitalTwin,
  History,
  Landing,
  ScenarioSimulator,
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
        <Route path="/digital-twin" element={<DigitalTwin api={api} />} />
        <Route path="/simulator" element={<ScenarioSimulator />} />
        <Route path="/advisor" element={<Advisor api={api} />} />
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
      <ThemeProvider>
        <BrowserRouter>
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <AuthProvider configured={config.configured}>
            <ApplicationRoutes config={config} />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
