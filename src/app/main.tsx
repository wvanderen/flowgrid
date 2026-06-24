// Vite entry point (RESEARCH Pattern 2). Mounts <App /> into the #root div from
// index.html and pulls in the Tailwind v4 stylesheet so the build pipeline picks
// it up.
//
// D-13 / BLOCKER fix: awaits initApp(repository) BEFORE createRoot so the Zustand
// store has already transitioned loading→ready (snapshot loaded, day-rollover
// reconciled) by the time React mounts. This guarantees FlowgridHome and CellBoard
// never render against a null snapshot. The brief async gap (Dexie open +
// loadSnapshot on local IndexedDB) is acceptable; a future Phase 6 splash screen
// could render during this window if perceived latency becomes an issue.

import { createRoot } from 'react-dom/client';

import { App } from './App.js';
import { repository } from './repository.js';
import { initApp } from './store/dispatch.js';
import '../style.css';

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Flowgrid: #root element missing from index.html');
}

void (async () => {
  try {
    await initApp(repository);
  } catch (e) {
    // initApp catches its own errors and sets status 'error', but defend against
    // unexpected throws so createRoot still runs (FlowgridHome renders ErrorBanner).
    console.error('Flowgrid bootstrap failed', e);
  }
  createRoot(rootElement).render(<App />);
})();
