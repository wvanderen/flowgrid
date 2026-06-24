// CellBoard — route component for /cells/:cellId (UI-05, CELL-02, SESS-01).
//
// The primary inspector + interaction surface for a single Cell. Reads cellId from
// useParams and the snapshot from the store, renders the Cell name, an inspector
// with XP/Momentum/Charge/milestone/Activation, the four starter ModuleTiles, the
// GeneratorTile (the protected Start/Finish/Cancel action), and CellActions (edit /
// archive). If the snapshot is not loaded or the Cell does not exist, renders a
// "Cell not found" message with a link back to Flowgrid Home.

import { Link, useParams } from 'react-router';

import type { ModuleDefinitionKind } from '../../domain/index.js';
import { getCellById } from '../../simulation/selectors.js';
import { deriveLocalDate } from '../../simulation/systems/day-rollover.js';
import { useFlowgridStore } from '../../app/store/dispatch.js';
import { SessionSummary } from '../session-summary/SessionSummary.js';

import { CellActions } from './CellActions.js';
import { CellInspector } from './CellInspector.js';
import { GeneratorTile } from './GeneratorTile.js';
import { ModuleTile } from './ModuleTile.js';

interface StarterTileSpec {
  readonly kind: ModuleDefinitionKind;
  readonly label: string;
  readonly description: string;
}

const STARTER_TILES: readonly StarterTileSpec[] = [
  {
    kind: 'generator',
    label: 'Generator',
    description: 'Run focus sessions here to generate Current.',
  },
  {
    kind: 'charge_core',
    label: 'Charge Core',
    description: 'Stores Cell Charge from focused effort.',
  },
  {
    kind: 'output',
    label: 'Output',
    description: 'Routes Current to the Core at 100%.',
  },
  {
    kind: 'bloom',
    label: 'Bloom',
    description: 'Daily Bloom Activates the Cell for bonus Current.',
  },
];

export function CellBoard() {
  const { cellId } = useParams<{ cellId: string }>();
  const snapshot = useFlowgridStore((s) => s.snapshot);
  const lastCompletedSession = useFlowgridStore((s) => s.lastCompletedSession);

  if (snapshot === null || cellId === undefined) {
    return (
      <section aria-label="Cell Board" className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold text-slate-100">Cell not found</h1>
        <Link to="/" className="inline-flex items-center font-medium text-core transition hover:underline">Return to Flowgrid</Link>
      </section>
    );
  }

  const cell = getCellById(snapshot, cellId);
  if (cell === undefined) {
    return (
      <section aria-label="Cell Board" className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <h1 className="text-2xl font-bold text-slate-100">Cell not found</h1>
        <p className="text-sm text-slate-400">This Cell does not exist or has been removed.</p>
        <Link to="/" className="inline-flex items-center font-medium text-core transition hover:underline">Return to Flowgrid</Link>
      </section>
    );
  }

  // SESS-05: show the inline SessionSummary only when the latest completed session
  // belongs to THIS cell. The store field persists across navigation, so a cellId
  // mismatch naturally hides it on other Cells.
  const showSummary =
    lastCompletedSession !== null && lastCompletedSession.cellId === cellId;
  const localDate = deriveLocalDate(
    new Date().toISOString(),
    snapshot.settings.localDayBoundary,
  );

  return (
    <section aria-label={`Cell Board for ${cell.name}`} className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <Link to="/" className="inline-flex items-center font-medium text-core transition hover:underline">Return to Flowgrid</Link>
      <h1 className="text-3xl font-bold text-slate-100">{cell.name}</h1>

      <CellInspector cell={cell} snapshot={snapshot} settings={snapshot.settings} />

      {showSummary ? (
        <SessionSummary
          session={lastCompletedSession!}
          cell={cell}
          settings={snapshot.settings}
          localDate={localDate}
        />
      ) : null}

      <section aria-label="Modules" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STARTER_TILES.map((tile) => (
          <ModuleTile
            key={tile.kind}
            kind={tile.kind}
            label={tile.label}
            description={tile.description}
          />
        ))}
      </section>

      <GeneratorTile cell={cell} />
      <CellActions cellId={cell.id} />
    </section>
  );
}
