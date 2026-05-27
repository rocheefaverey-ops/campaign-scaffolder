import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './styles.css';

// Surface everything — React in prod mode minifies/suppresses some errors and
// the error boundary only catches *render* throws. These listeners catch
// uncaught errors and rejected promises so a white screen always leaves a
// trail in the console.
window.addEventListener('error', (e) => {
  // eslint-disable-next-line no-console
  console.error('[window error]', e.message, e.error, e.filename, e.lineno, e.colno);
});
window.addEventListener('unhandledrejection', (e) => {
  // eslint-disable-next-line no-console
  console.error('[unhandled promise rejection]', e.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
