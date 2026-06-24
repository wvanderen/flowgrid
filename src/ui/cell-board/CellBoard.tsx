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
import { useFlowgridStore } from '../../app/store/dispatch.js';

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

  if (snapshot === null || cellId === undefined) {
    return (
      <section aria-label="Cell Board">
        <h1>Cell not found</h1>
        <Link to="/">Return to Flowgrid</Link>
      </section>
    );
  }

  const cell = getCellById(snapshot, cellId);
  if (cell === undefined) {
    return (
      <section aria-label="Cell Board">
        <h1>Cell not found</h1>
        <p>This Cell does not exist or has been removed.</p>
        <Link to="/">Return to Flowgrid</Link>
      </section>
    );
  }

  return (
    <section aria-label={`Cell Board for ${cell.name}`}>
      <h1>{cell.name}</h1>

      <CellInspector cell={cell} snapshot={snapshot} settings={snapshot.settings} />

      <section aria-label="Modules">
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
