// App-level route table. Declarative createBrowserRouter mode (RESEARCH Pitfall 2 —
// NOT framework mode; `@react-router/dev` is intentionally NOT installed).

import { createBrowserRouter } from 'react-router';

import { FlowgridHome } from '../ui/flowgrid-home/FlowgridHome.js';
import { CellBoard } from '../ui/cell-board/CellBoard.js';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <FlowgridHome />,
  },
  {
    path: '/cells/:cellId',
    element: <CellBoard />,
  },
]);
