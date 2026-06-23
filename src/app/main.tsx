// Vite entry point (RESEARCH Pattern 2). Mounts <App /> into the #root div from
// index.html and pulls in the Tailwind v4 stylesheet so the build pipeline picks
// it up.

import { createRoot } from 'react-dom/client';

import { App } from './App.js';
import '../style.css';

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Flowgrid: #root element missing from index.html');
}

createRoot(rootElement).render(<App />);
