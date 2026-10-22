import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';
import { LOGIN_PATH } from './lib/api';

// Back from the Access login (LOGIN_PATH): show the usual address.
if (window.location.pathname === LOGIN_PATH) window.history.replaceState(null, '', '/');

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
