// ModuleTile — presentational tile for a starter module kind (UI-05 / CELL-05).
//
// The four starter modules (Generator, Charge Core, Output, Bloom) render as
// accessible semantic tiles with a label, description, and a lucide icon keyed by
// kind. This is a pure presentational component: it takes no callbacks and reads
// no store. The "hex tile" concept from the Flowgrid canvas is mirrored here as an
// accessible <div role="group"> so screen readers can orient the Cell's modules.

import { ArrowRight, Battery, Flower, Zap, type LucideIcon } from 'lucide-react';

import type { ModuleDefinitionKind } from '../../domain/index.js';

const KIND_ICONS: Readonly<Record<ModuleDefinitionKind, LucideIcon>> = {
  generator: Zap,
  charge_core: Battery,
  output: ArrowRight,
  bloom: Flower,
};

interface ModuleTileProps {
  readonly kind: ModuleDefinitionKind;
  readonly label: string;
  readonly description: string;
}

export function ModuleTile({ kind, label, description }: ModuleTileProps) {
  const Icon = KIND_ICONS[kind];
  return (
    <div role="group" aria-label={label} className="rounded-lg border border-slate-700 bg-flowgrid-surface p-4 space-y-3">
      <h2 className="text-base font-semibold text-slate-100">{label}</h2>
      <Icon aria-hidden="true" data-testid={`module-tile-icon-${kind}`} className="h-8 w-8 text-core" />
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}
