import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
// Initialise the theme (applies .dark class) before first paint to prevent FOUC
import './stores/useThemeStore.js';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
