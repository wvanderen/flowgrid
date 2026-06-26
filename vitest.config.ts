// Vitest workspace config — dual environment split (RESEARCH Pitfall 3, PATTERNS E1–E6).
//
// Simulation, persistence, and property tests run under `node` (pure TS, fake-indexeddb
// via tests/helpers/setup-indexeddb.ts). React UI / app-shell / render tests run under
// `happy-dom` so JSX + `document` are available. Both projects keep `globals: false`
// (Phase 1 convention: tests import `test`/`expect` explicitly) and both inherit the
// global fake-indexeddb setup so any project can drive a real repository if needed.
//
// Vitest 4.x uses `test.projects` (the inline form). `extends: true` makes each
// project inherit root-level options (resolve, plugins, etc.) from this file.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['tests/e2e/**'],
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: [
            'tests/simulation/**/*.test.ts',
            'tests/persistence/**/*.test.ts',
            'tests/properties/**/*.test.ts',
            'tests/helpers/**/*.test.ts',
          ],
          setupFiles: ['tests/helpers/setup-indexeddb.ts'],
          globals: false,
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'happy-dom',
          include: [
            'tests/app/**/*.test.{ts,tsx}',
            'tests/ui/**/*.test.{ts,tsx}',
            'tests/render/**/*.test.{ts,tsx}',
          ],
          setupFiles: [
            'tests/helpers/setup-indexeddb.ts',
            'tests/helpers/setup-dom.ts',
          ],
          globals: false,
        },
      },
    ],
  },
});
