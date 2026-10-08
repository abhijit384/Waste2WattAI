import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { parseFrontendConfig } from './config';
import { configureAuth } from './auth';
import './styles.css';

try {
  const savedTheme = window.localStorage.getItem('w2w-theme');
  document.documentElement.dataset.theme = savedTheme === 'light' ? 'light' : 'dark';
} catch {
  document.documentElement.dataset.theme = 'dark';
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing root element');

const config = parseFrontendConfig(import.meta.env);
configureAuth(config);
createRoot(root).render(
  <StrictMode>
    <App config={config} />
  </StrictMode>,
);
