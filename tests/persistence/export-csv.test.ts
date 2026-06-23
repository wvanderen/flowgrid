// VER-03 export tier: CSV session export (D-10).
//
// Seeds a cell whose name contains a comma ("Starter, Cell") and a 1500s session,
// exports via exportSessionCsv, splits on CRLF, and asserts the exact ten-column
// header, the floored durationMinutes (25), the RFC-4180-quoted cell name, the
// YYYY-MM-DD date columns, and the 'true'/'false' boolean columns. Also unit-tests
// csvEscape directly for comma, double-quote, newline, carriage-return, and plain.

import { beforeEach, expect, test } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

import type { CellRecord, CoreId, CoreRecord, SessionRecord } from '../../src/domain/index.js';
import { FlowgridDatabase, csvEscape, exportSessionCsv } from '../../src/persistence/index.js';

beforeEach(() => {
  (globalThis as unknown as { indexedDB: unknown }).indexedDB = new IDBFactory();
});

const CELL_ID = 'export-csv:cell';
const CELL_NAME = 'Starter, Cell';
const SESSION_ID = 'export-csv:session-1';

test('csvEscape wraps comma/quote/newline fields and leaves plain fields unchanged', () => {
  expect(csvEscape('plain')).toBe('plain');
  expect(csvEscape('a,b')).toBe('"a,b"');
  expect(csvEscape('a"b')).toBe('"a""b"');
  expect(csvEscape('a\nb')).toBe('"a\nb"');
  expect(csvEscape('a\rb')).toBe('"a\rb"');
});

test('exportSessionCsv emits the D-10 header, floored minutes, quoted cell name, YYYY-MM-DD dates, and true/false booleans', async () => {
  const db = new FlowgridDatabase('export-csv');
  await db.open();

  const seededCore = (await db.table<CoreRecord, CoreId>('core').toArray())[0];
  expect(seededCore, 'DB must be seeded before CSV test').toBeDefined();
  void seededCore;

  const now = '2026-01-01T10:00:00.000Z';
  const endedAt = '2026-01-01T10:25:00.000Z';
  const cell: CellRecord = {
    id: CELL_ID,
    name: CELL_NAME,
    // D-10 fields (Phase 3). Defaults match starter-state.ts / upgradeCellsV1ToV2.
    color: '#6b7280',
    icon: null,
    archivedAt: null,
    activeSessionStartedAt: null,
    xp: 0,
    current: 0,
    charge: 0,
    momentum: 0,
    activation: 0,
    dailyMilestoneProgressSeconds: 0,
    dailyMilestoneTargetSeconds: 1500,
    lastBloomLocalDate: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.cells.put(cell);

  const session: SessionRecord = {
    id: SESSION_ID,
    cellId: CELL_ID,
    startedAt: now,
    endedAt,
    durationSeconds: 1500,
    xpGained: 25,
    currentGenerated: 1500,
    bloomFired: true,
    activationGranted: false,
    energyGained: 750,
    coreChargeGained: 750,
    createdAt: now,
  };
  await db.sessions.put(session);

  const csv = await exportSessionCsv(db);
  db.close();

  // RFC 4180: rows joined with CRLF and the string terminated by a trailing CRLF.
  const rows = csv.split('\r\n');
  expect(rows.length, 'header + 1 data row + trailing empty').toBe(3);

  const header =
    'startedDate,endedDate,durationMinutes,cellName,xpGained,currentGenerated,energyGained,coreChargeGained,bloomFired,activationGranted';
  expect(rows[0]).toBe(header);

  const dataRow = rows[1];
  expect(dataRow).toBeDefined();
  // The cell name column is quoted because it contains a comma; parse the row as
  // RFC-4180 by splitting on the comma boundary, accounting for the quoted field.
  const columns = parseCsvRow(dataRow as string);
  expect(columns).toHaveLength(10);
  expect(columns[0]).toBe('2026-01-01');
  expect(columns[1]).toBe('2026-01-01');
  expect(columns[2]).toBe('25');
  expect(columns[3]).toBe(CELL_NAME);
  expect(columns[4]).toBe('25');
  expect(columns[5]).toBe('1500');
  expect(columns[6]).toBe('750');
  expect(columns[7]).toBe('750');
  expect(columns[8]).toBe('true');
  expect(columns[9]).toBe('false');
});

test('exportSessionCsv maps a session whose cell is missing to (unknown)', async () => {
  const db = new FlowgridDatabase('export-csv-unknown');
  await db.open();

  const now = '2026-02-02T08:00:00.000Z';
  const session: SessionRecord = {
    id: 'export-csv-unknown:session',
    cellId: 'export-csv-unknown:missing-cell',
    startedAt: now,
    endedAt: '2026-02-02T08:30:00.000Z',
    durationSeconds: 1800,
    xpGained: 30,
    currentGenerated: 1800,
    bloomFired: false,
    activationGranted: false,
    energyGained: 900,
    coreChargeGained: 900,
    createdAt: now,
  };
  await db.sessions.put(session);

  const csv = await exportSessionCsv(db);
  db.close();

  const dataRow = csv.split('\r\n')[1];
  expect(dataRow).toBeDefined();
  const columns = parseCsvRow(dataRow as string);
  expect(columns[3]).toBe('(unknown)');
});

// Minimal RFC-4180 row parser for test assertions: honors quoted fields containing
// commas and doubled internal quotes. The production csvEscape is the inverse
// direction (encode); this helper decodes so tests assert the wire format directly.
function parseCsvRow(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (line[i] === '"') {
      let value = '';
      i++;
      while (i < line.length) {
        const ch = line[i];
        if (ch === '"') {
          if (line[i + 1] === '"') {
            value += '"';
            i += 2;
            continue;
          }
          i++;
          break;
        }
        value += ch ?? '';
        i++;
      }
      fields.push(value);
      if (line[i] === ',') i++;
      else break;
    } else {
      let value = '';
      while (i < line.length && line[i] !== ',') {
        value += line[i];
        i++;
      }
      fields.push(value);
      if (line[i] === ',') i++;
      else break;
    }
  }
  return fields;
}
