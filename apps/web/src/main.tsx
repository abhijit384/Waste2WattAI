import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { parseFrontendConfig } from './config';
import { configureAuth } from './auth';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing root element');

const config = parseFrontendConfig(import.meta.env);
configureAuth(config);
createRoot(root).render(
  <StrictMode>
    <App config={config} />
  </StrictMode>,
);
