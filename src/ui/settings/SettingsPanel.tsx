// SettingsPanel — the /settings route component (Phase 6 / UI-06, D-10..D-13).
//
// Mirrors CorePanel / ForgePanel as the route peer. Reads snapshot.settings, edits
// the four defaults via local controlled-input state, dispatches update_settings
// on save, and surfaces rejections via the shared lastRejection store field.
// Export buttons (D-11) call exportJson / exportSessionCsv through the persistence
// barrel and trigger downloads; the Import button (D-13) opens a Radix confirm
// dialog and calls importArchive in replace mode.
//
// Boundary: the UI never computes economy rules. All values come from the snapshot
// and dispatch is the single mutation path. The database singleton is imported only
// to pass to the persistence export/import functions (UI never imports Dexie).

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import * as Dialog from '@radix-ui/react-dialog';

import type { UpdateSettingsCommand } from '../../domain/index.js';

import { makeEnv } from '../../app/env.js';
import { database, repository } from '../../app/repository.js';
import { dispatch, useFlowgridStore } from '../../app/store/dispatch.js';
import {
  exportJson,
  exportSessionCsv,
  importArchive,
} from '../../persistence/index.js';

import { prefersReducedMotion } from './reduce-motion.js';
import { triggerDownload } from '../shared/download.js';

const SETTINGS_SEED = 'flowgrid-settings-seed';

function buildSettingsEnv(localDayBoundary: string) {
  return makeEnv(new Date().toISOString(), { localDayBoundary }, SETTINGS_SEED);
}

// Clamp a number-input value into a positive integer; NaN (empty input) → 0.
function clampPositiveInt(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function SettingsPanel() {
  const snapshot = useFlowgridStore((s) => s.snapshot);
  const lastRejection = useFlowgridStore((s) => s.lastRejection);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Local controlled-input state seeded from snapshot.settings. The only writer of
  // these settings is this control, so after a successful save the snapshot and
  // local state agree.
  const [sessionLength, setSessionLength] = useState(
    snapshot?.settings.defaultSessionLengthSeconds ?? 1500,
  );
  const [dailyTarget, setDailyTarget] = useState(
    snapshot?.settings.dailyTargetSeconds ?? 1800,
  );
  const [localDayBoundary, setLocalDayBoundary] = useState(
    snapshot?.settings.localDayBoundary ?? '00:00',
  );
  const [reduceMotion, setReduceMotion] = useState(
    snapshot?.settings.reduceMotion ?? false,
  );

  // D-09 (revised per gap-closure 06-05): the OS preference now pre-fills the
  // checkbox as a SESSION-ONLY visual suggestion — durable reduceMotion requires
  // an explicit Save click. The prior implementation dispatched update_settings
  // to durably persist reduceMotion=true on the first /settings visit when the OS
  // asked for reduced motion, which accidentally pinned reduceMotion true for any
  // user who visited once with OS reduce-motion enabled — stopping the animation
  // ticker and skipping particle emission indefinitely (root-cause evidence:
  // .planning/debug/no-canvas-animation.md). The ref guard still prevents
  // re-firing on every render/reload cycle. D-09's "manual override" is fully
  // preserved: the user can explicitly toggle the checkbox and click Save to
  // persist their choice either way.
  const honoredOsPreference = useRef(false);
  useEffect(() => {
    if (honoredOsPreference.current) return;
    if (snapshot === null) return;
    honoredOsPreference.current = true;
    // Pre-fill the checkbox from the OS preference (session-only suggestion).
    // No durable write occurs here — reduceMotion cannot be accidentally pinned.
    if (!snapshot.settings.reduceMotion && prefersReducedMotion()) {
      setReduceMotion(true);
    }
  }, [snapshot]);

  // Import dialog state (D-13).
  const [importOpen, setImportOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);

  if (snapshot === null) {
    return (
      <section aria-label="Settings loading" className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <h2 className="text-3xl font-bold text-core">Settings</h2>
        <p role="status" className="text-sm text-slate-400">Loading Settings…</p>
      </section>
    );
  }

  const settings = snapshot.settings;
  const boundaryValid = /^\d{2}:\d{2}$/.test(localDayBoundary);
  const sessionValid = Number.isInteger(sessionLength) && sessionLength > 0;
  const dailyValid = Number.isInteger(dailyTarget) && dailyTarget > 0;
  const formValid = boundaryValid && sessionValid && dailyValid;
  const dirty =
    sessionLength !== settings.defaultSessionLengthSeconds ||
    dailyTarget !== settings.dailyTargetSeconds ||
    localDayBoundary !== settings.localDayBoundary ||
    reduceMotion !== settings.reduceMotion;

  const handleSave = () => {
    const env = buildSettingsEnv(settings.localDayBoundary);
    const command: UpdateSettingsCommand = {
      type: 'update_settings',
      operationId: crypto.randomUUID(),
      defaultSessionLengthSeconds: sessionLength,
      dailyTargetSeconds: dailyTarget,
      localDayBoundary,
      reduceMotion,
    };
    void dispatch(command, env, repository);
    setStatusMessage('Settings saved.');
  };

  const handleExportJson = async () => {
    try {
      const archive = await exportJson(database);
      triggerDownload(
        `flowgrid-export-${new Date().toISOString().slice(0, 10)}.json`,
        'application/json',
        JSON.stringify(archive, null, 2),
      );
      setStatusMessage('Exported full state (JSON).');
    } catch {
      setStatusMessage('JSON export failed.');
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = await exportSessionCsv(database);
      triggerDownload(
        `flowgrid-sessions-${new Date().toISOString().slice(0, 10)}.csv`,
        'text/csv',
        csv,
      );
      setStatusMessage('Exported sessions (CSV).');
    } catch {
      setStatusMessage('CSV export failed.');
    }
  };

  const handleImportConfirm = async (file: File) => {
    setImportBusy(true);
    setImportError(null);
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const result = await importArchive(database, parsed, 'replace');
      if (result.ok) {
        setImportOpen(false);
        // Local state is stale after a replace; reload so the store rehydrates
        // from the new durable truth (D-13 replace replaces ALL local state).
        window.location.reload();
      } else if ('issues' in result) {
        setImportError(
          `Import rejected: ${result.issues[0]?.message ?? 'invalid archive'}`,
        );
      } else {
        setImportError(result.error.message);
      }
    } catch (e) {
      setImportError(
        e instanceof Error ? e.message : 'Import failed: could not parse file.',
      );
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <section aria-label="Settings" className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-core">Settings</h2>
        <Link to="/" className="text-sm text-slate-400 underline">Home</Link>
      </div>

      {/* Defaults (D-12: changes affect new Cells only). */}
      <section aria-label="Defaults" className="rounded-lg border border-slate-700 bg-flowgrid-surface p-4 space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Defaults</h3>
        <p className="text-sm text-slate-400">
          These affect newly created Cells only; existing Cells keep their captured targets.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-sm text-slate-300">
            Default session length (s)
            <input
              type="number"
              min={1}
              value={sessionLength}
              onChange={(e) => setSessionLength(clampPositiveInt(e.target.valueAsNumber))}
              className="ml-2 w-24 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
            />
          </label>
          <label className="text-sm text-slate-300">
            Daily target (s)
            <input
              type="number"
              min={1}
              value={dailyTarget}
              onChange={(e) => setDailyTarget(clampPositiveInt(e.target.valueAsNumber))}
              className="ml-2 w-24 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
            />
          </label>
          <label className="text-sm text-slate-300">
            Local day boundary (HH:MM)
            <input
              type="text"
              value={localDayBoundary}
              onChange={(e) => setLocalDayBoundary(e.target.value)}
              className="ml-2 w-24 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-slate-100"
            />
          </label>
          <label className="text-sm text-slate-300">
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) => setReduceMotion(e.target.checked)}
              className="mr-2"
            />
            Reduce motion
          </label>
          <button
            type="button"
            onClick={handleSave}
            disabled={!formValid || !dirty}
            className={
              formValid && dirty
                ? 'inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core'
                : 'inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg opacity-50 cursor-not-allowed'
            }
          >
            Save
          </button>
        </div>
        {!sessionValid ? (
          <p role="status" aria-live="polite" className="text-sm text-error">
            Default session length must be a positive integer.
          </p>
        ) : null}
        {!dailyValid ? (
          <p role="status" aria-live="polite" className="text-sm text-error">
            Daily target must be a positive integer.
          </p>
        ) : null}
        {!boundaryValid ? (
          <p role="status" aria-live="polite" className="text-sm text-error">
            Local day boundary must be HH:MM.
          </p>
        ) : null}
      </section>

      {/* Backup / restore (D-11 export, D-13 import-replace). */}
      <section aria-label="Backup and restore" className="rounded-lg border border-slate-700 bg-flowgrid-surface p-4 space-y-3">
        <h3 className="text-base font-semibold text-slate-200">Backup and restore</h3>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2 text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Export full state (JSON)
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2 text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            Export sessions (CSV)
          </button>
          <Dialog.Root open={importOpen} onOpenChange={(open) => { setImportOpen(open); setImportError(null); }}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2 text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Import (replace local state)
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60" />
              <Dialog.Content aria-label="Confirm replace local state" className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-700 bg-flowgrid-surface p-6 shadow-2xl space-y-4">
                <Dialog.Title className="text-lg font-semibold text-slate-100">Replace local state?</Dialog.Title>
                <Dialog.Description className="text-sm text-slate-400">
                  Choosing a JSON archive replaces ALL local state. This cannot be undone. Export a backup first if unsure.
                </Dialog.Description>
                <ImportFilePicker onConfirm={handleImportConfirm} busy={importBusy} error={importError} />
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Close import dialog"
                    disabled={importBusy}
                    className="inline-flex items-center justify-center rounded-md border border-slate-600 px-4 py-2 text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </section>

      {/* Status / rejection surfaces. */}
      {statusMessage !== null ? (
        <p role="status" aria-live="polite" className="rounded-md bg-slate-900/40 px-3 py-2 text-sm text-slate-300">{statusMessage}</p>
      ) : null}
      {lastRejection !== null ? (
        <p role="status" aria-live="polite" className="rounded-md bg-slate-900/40 px-3 py-2 text-sm text-error">{lastRejection}</p>
      ) : null}
    </section>
  );
}

function ImportFilePicker({
  onConfirm,
  busy,
  error,
}: {
  onConfirm: (file: File) => void;
  busy: boolean;
  error: string | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  return (
    <div className="space-y-3">
      <input
        type="file"
        accept="application/json"
        aria-label="Choose a JSON archive"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-core file:px-3 file:py-1 file:font-semibold file:text-flowgrid-bg"
      />
      {error !== null ? (
        <p role="status" aria-live="polite" className="text-sm text-error">{error}</p>
      ) : null}
      <button
        type="button"
        onClick={() => {
          if (file !== null) onConfirm(file);
        }}
        disabled={file === null || busy}
        className={
          file !== null && !busy
            ? 'inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg transition hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-core'
            : 'inline-flex items-center justify-center rounded-md bg-core px-4 py-2 font-semibold text-flowgrid-bg opacity-50 cursor-not-allowed'
        }
      >
        {busy ? 'Importing…' : 'Replace local state'}
      </button>
    </div>
  );
}
