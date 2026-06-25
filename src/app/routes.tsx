// App-level route table. Declarative createBrowserRouter mode (RESEARCH Pitfall 2 —
// NOT framework mode; `@react-router/dev` is intentionally NOT installed).

import { createBrowserRouter } from 'react-router';

import { FlowgridHome } from '../ui/flowgrid-home/FlowgridHome.js';
import { CellBoard } from '../ui/cell-board/CellBoard.js';
import { CorePanel } from '../ui/core-panel/CorePanel.js';
import { ForgePanel } from '../ui/forge-panel/ForgePanel.js';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <FlowgridHome />,
  },
  {
    path: '/cells/:cellId',
    element: <CellBoard />,
  },
  {
    path: '/core',
    element: <CorePanel />,
  },
  {
    path: '/forge',
    element: <ForgePanel />,
  },
]);
