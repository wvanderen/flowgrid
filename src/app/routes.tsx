// App-level route table. Declarative createBrowserRouter mode (RESEARCH Pitfall 2 —
// NOT framework mode; `@react-router/dev` is intentionally NOT installed). The Cell
// Board route is a placeholder until Plan 03-03 ships the real CellBoard component.

import { createBrowserRouter } from 'react-router';

import { FlowgridHome } from '../ui/flowgrid-home/FlowgridHome.js';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <FlowgridHome />,
  },
  {
    path: '/cells/:cellId',
    element: <section aria-label="Cell Board placeholder">Cell Board (Plan 03-03)</section>,
  },
]);
