import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
// Initialise the theme (applies .dark class) before first paint to prevent FOUC
import './stores/useThemeStore.js';
import App from './App.jsx';

// Sentry must be initialised before createRoot so it can instrument React rendering.
// Disabled in local dev when VITE_SENTRY_DSN is unset.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    // Sample 10% of page navigations in production to stay within free-tier limits.
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
