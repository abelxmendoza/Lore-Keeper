import './styles/tailwind.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Router } from './pages/Router';
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  </StrictMode>
);
