// Human-readable CSV session export (D-10).
//
// Emits a spreadsheet-friendly CSV with the exact ten D-10 columns. cellId alone is
// opaque, so the cell name is JOINED from the cells store (a missing cell maps to
// '(unknown)'). durationSeconds is floored to minutes for consistency with focusToXp
// in content/formulas.ts. Fields are RFC-4180 escaped (comma/double-quote/newline
// wrapped and internal quotes doubled). Sessions are sorted by startedAt ascending
// for chronological readability. No simulation involvement; no Zod (import-only,
// delivered in 02-03). Sessions reference cellId only — cellName is never a raw id.
//
// CSV is for humans opening a spreadsheet, not for machine re-import (D-10):
// readability (joined names, minutes, YYYY-MM-DD dates) outweighs field-for-field
// fidelity. A JSON round-trip (plan 02-03) is the machine re-import path.

import type { CellId, CellRecord, SessionRecord } from '../domain/index.js';

import { FlowgridDatabase } from './database.js';

export function csvEscape(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export async function exportSessionCsv(db: FlowgridDatabase): Promise<string> {
  const [sessions, cells] = await Promise.all([db.sessions.toArray(), db.cells.toArray()]);

  const cellsMap = new Map<CellId, CellRecord>(cells.map((c) => [c.id, c] as const));
  const sortedSessions: readonly SessionRecord[] = [...sessions].sort((a, b) =>
    a.startedAt < b.startedAt ? -1 : a.startedAt > b.startedAt ? 1 : 0,
  );

  const header =
    'startedDate,endedDate,durationMinutes,cellName,xpGained,currentGenerated,energyGained,coreChargeGained,bloomFired,activationGranted';

  const rows = sortedSessions.map((session) => {
    const cell = cellsMap.get(session.cellId);
    const fields = [
      session.startedAt.slice(0, 10),
      session.endedAt.slice(0, 10),
      String(Math.floor(session.durationSeconds / 60)),
      cell?.name ?? '(unknown)',
      String(session.xpGained),
      String(session.currentGenerated),
      String(session.energyGained),
      String(session.coreChargeGained),
      session.bloomFired ? 'true' : 'false',
      session.activationGranted ? 'true' : 'false',
    ];
    return fields.map(csvEscape).join(',');
  });

  return [header, ...rows].join('\r\n') + '\r\n';
}
