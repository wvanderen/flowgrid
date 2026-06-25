// ModuleTile — presentational tile for a starter module kind (UI-05 / CELL-05).
//
// The four starter modules (Generator, Charge Core, Output, Bloom) render as
// accessible semantic tiles with a label, description, and a lucide icon keyed by
// kind. This is a pure presentational component: it takes no callbacks and reads
// no store. The "hex tile" concept from the Flowgrid canvas is mirrored here as an
// accessible <div role="group"> so screen readers can orient the Cell's modules.

import { ArrowRight, Battery, Flower, Zap, type LucideIcon } from 'lucide-react';

import type { ModuleDefinitionKind } from '../../domain/index.js';
import { MODULE_LEVEL_BONUS } from '../../content/index.js';

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
  // D-13 / MOD-02: the module's current level (from ModuleInstance.level) and the
  // active per-level effect magnitude (moduleLevelBonus(kind, level) — the
  // per-level magnitude × level, i.e. the current total bonus). Both are passed in
  // by CellBoard which resolves them from the snapshot; ModuleTile stays purely
  // presentational.
  readonly level: number;
  readonly levelEffect: number;
}

export function ModuleTile({ kind, label, description, level, levelEffect }: ModuleTileProps) {
  const Icon = KIND_ICONS[kind];
  // D-13 UI ↔ sim agreement: read the per-level magnitude from the SAME content
  // table the simulation systems read (MODULE_LEVEL_BONUS). Bloom's magnitude is a
  // flat activation count (not a percent); the other three are percent magnitudes.
  const perLevel = MODULE_LEVEL_BONUS[kind];
  const isBloom = kind === 'bloom';
  const effectLine = isBloom
    ? `+${perLevel} per level · current bonus +${levelEffect}`
    : `+${perLevel}% per level · current bonus +${levelEffect}%`;
  return (
    <div role="group" aria-label={label} className="rounded-lg border border-slate-700 bg-flowgrid-surface p-4 space-y-3">
      <h2 className="text-base font-semibold text-slate-100">{label} · Lv {level}</h2>
      <Icon aria-hidden="true" data-testid={`module-tile-icon-${kind}`} className="h-8 w-8 text-core" />
      <p className="text-sm text-slate-400">{description}</p>
      <p className="text-xs text-slate-500">{effectLine}</p>
    </div>
  );
}
