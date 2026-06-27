// App-level route table. Declarative createBrowserRouter mode (RESEARCH Pitfall 2 —
// NOT framework mode; `@react-router/dev` is intentionally NOT installed).
//
// Phase 6.1 D-01: restructured into a pathless parent layout route whose element
// is <AppLayout/> and whose children are the five existing route shapes. AppLayout
// mounts FlowgridCanvas + persistent chrome ONCE; child routes render via
// <Outlet/> (canvas persists across /, /cells/:id, /core). Per D-02 the
// /settings + /forge children declare handle.takeover so AppLayout reads it via
// useMatches and (a) hides the chrome and (b) pushes takeoverActive into the store
// so the canvas pauses its ticker + particle emission.
// Per D-05 (policy only this phase) there is NO /history route.

import { createBrowserRouter } from 'react-router';

import { AppLayout } from '../ui/shell/AppLayout.js';
import { FlowgridHome } from '../ui/flowgrid-home/FlowgridHome.js';
import { CellBoard } from '../ui/cell-board/CellBoard.js';
import { CorePanel } from '../ui/core-panel/CorePanel.js';
import { SettingsTakeover } from '../ui/settings/SettingsTakeover.js';
import { ForgeTakeover } from '../ui/forge-panel/ForgeTakeover.js';

export const router = createBrowserRouter([
  {
    // Pathless parent layout route — D-01. The canvas + chrome live here and
    // persist across all child navigation.
    element: <AppLayout />,
    children: [
      { index: true, element: <FlowgridHome /> },
      { path: 'cells/:cellId', element: <CellBoard /> },
      { path: 'core', element: <CorePanel /> },
      {
        // D-02: handle.takeover metadata read by AppLayout via useMatches.
        path: 'settings',
        element: <SettingsTakeover />,
        handle: { takeover: true },
      },
      {
        path: 'forge',
        element: <ForgeTakeover />,
        handle: { takeover: true },
      },
    ],
  },
]);
