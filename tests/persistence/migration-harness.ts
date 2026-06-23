// Reusable migration-fixture harness (D-07, VER-03).
//
// Generic fixture runner that proves an upgrade function transforms an old-shape
// record into the new shape. Designed for direct reuse by the real v1->v2 migration
// when it arrives: the real migration adds `db.version(2).stores({...}).upgrade(...)`
// to database.ts AND registers real fixtures here — the harness stays unchanged.
//
// Phase 2 ships NO forward-looking v2 stub Dexie schema (database.ts still declares
// only version(1)); the synthetic fixtures prove the field-transform mechanism
// without polluting the shipped schema.

import { it, expect } from 'vitest';

export interface MigrationFixture<OldShape, NewShape> {
  readonly description: string;
  readonly input: OldShape;
  readonly upgrade: (record: OldShape) => NewShape;
  readonly expected: NewShape;
}

export function runMigrationFixture<OldShape, NewShape>(
  fixture: MigrationFixture<OldShape, NewShape>,
): void {
  it(fixture.description, () => {
    expect(fixture.upgrade(fixture.input)).toEqual(fixture.expected);
  });
}
