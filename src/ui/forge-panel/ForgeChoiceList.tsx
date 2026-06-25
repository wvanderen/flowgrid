// ForgeChoiceList — presentational list of the 3 revealed ForgeChoice rows (D-10,
// MOD-03). Mirrors the accessible-semantic style of ModuleTile.tsx: a <ul> of <li>
// rows, each carrying a kind-keyed lucide icon, the Cell name, the module kind
// label, the level transition, the per-level effect magnitude, and a semantic
// <button> to pick that choice.
//
// This is a pure presentational component: it takes the choices + a cellNameById
// map + an onPick callback and renders. It reads no store, dispatches nothing.
// The parent (ForgePanel) owns the dispatch path.
//
// Boundary (T-05-11): ForgeChoiceList never imports the run_forge handler. It calls
// onPick(choice); the parent builds and dispatches the RunForgeCommand.

import { ArrowRight, Battery, Flower, Zap, type LucideIcon } from 'lucide-react';

import type { ForgeChoice } from '../../domain/index.js';
import type { ModuleDefinitionKind } from '../../domain/index.js';
import { MODULE_LEVEL_BONUS } from '../../content/index.js';

const KIND_ICONS: Readonly<Record<ModuleDefinitionKind, LucideIcon>> = {
  generator: Zap,
  charge_core: Battery,
  output: ArrowRight,
  bloom: Flower,
};

// Human-readable labels keyed by ModuleDefinitionKind. The starter module
// definitions (content/starter-modules.ts) carry `kind` + `phase1Behavior` but no
// display label, so the UI owns this small map (mirrors the STARTER_TILES labels
// in CellBoard.tsx). Exported so ForgePanel / ForgeSummary reuse the same strings.
export const KIND_LABELS: Readonly<Record<ModuleDefinitionKind, string>> = {
  generator: 'Generator',
  charge_core: 'Charge Core',
  output: 'Output',
  bloom: 'Bloom',
};

interface ForgeChoiceListProps {
  readonly choices: readonly ForgeChoice[];
  readonly cellNameById: ReadonlyMap<string, string>;
  readonly onPick: (choice: ForgeChoice) => void;
  readonly disabled: boolean;
}

export function ForgeChoiceList({ choices, cellNameById, onPick, disabled }: ForgeChoiceListProps) {
  if (choices.length === 0) return null;
  return (
    <ul className="space-y-2">
      {choices.map((choice) => {
        const Icon = KIND_ICONS[choice.moduleKind];
        const kindLabel = KIND_LABELS[choice.moduleKind];
        const cellName = cellNameById.get(choice.cellId) ?? choice.cellId;
        const magnitude = MODULE_LEVEL_BONUS[choice.moduleKind];
        const isBloom = choice.moduleKind === 'bloom';
        const effectText = isBloom
          ? `+${magnitude} activation per level`
          : `+${magnitude}% per level`;
        return (
          <li key={`${choice.cellId}:${choice.moduleKind}`}>
            <div
              role="group"
              aria-label={`${cellName} ${kindLabel}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-flowgrid-surface p-3"
            >
              <div className="flex items-center gap-3">
                <Icon aria-hidden="true" className="h-6 w-6 text-core" />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-slate-100">{kindLabel}</p>
                  <p className="text-xs text-slate-400">{cellName}</p>
                  <p className="text-xs text-slate-500">{effectText}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onPick(choice)}
                disabled={disabled}
                aria-describedby="forge-help"
                className={disabled
                  ? 'inline-flex items-center justify-center rounded-md bg-core px-3 py-1.5 text-sm font-semibold text-flowgrid-bg opacity-50 cursor-not-allowed'
                  : 'inline-flex items-center justify-center rounded-md bg-core px-3 py-1.5 text-sm font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core'}
              >
                Pick
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
