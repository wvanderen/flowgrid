import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['node_modules/', 'dist/', '.planning/', 'docs/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['src/simulation/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'Simulation must not import React.' },
            { name: 'react-dom', message: 'Simulation must not import react-dom.' },
            { name: 'react/jsx-runtime', message: 'Simulation must not import react/jsx-runtime.' },
            { name: 'pixi.js', message: 'Simulation must not import PixiJS.' },
            { name: '@pixi/node', message: 'Simulation must not import PixiJS.' },
            { name: 'dexie', message: 'Simulation must not import Dexie.' },
            { name: 'zustand', message: 'Simulation must not import Zustand.' },
            { name: 'idb', message: 'Simulation must not import IndexedDB wrappers.' },
            { name: 'fake-indexeddb', message: 'Simulation must not import IndexedDB mocks.' },
            { name: 'happy-dom', message: 'Simulation must not import DOM shims.' },
            { name: 'jsdom', message: 'Simulation must not import DOM shims.' },
          ],
          patterns: [
            {
              group: ['@/app/*', '@/app', '@/persistence/*', '@/persistence', '@/render/*', '@/render', '@/ui/*', '@/ui'],
              message: 'Simulation must not import app/persistence/render/ui layers.',
            },
            {
              group: ['../app', '../app/*', '../persistence', '../persistence/*', '../render', '../render/*', '../ui', '../ui/*'],
              message: 'Simulation must not import app/persistence/render/ui layers.',
            },
            {
              group: ['../../app', '../../app/*', '../../persistence', '../../persistence/*', '../../render', '../../render/*', '../../ui', '../../ui/*'],
              message: 'Simulation must not import app/persistence/render/ui layers.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/persistence/**/*.ts'],
    ignores: ['src/persistence/database.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'dexie',
              message: 'Import Dexie through the database module, not directly in repositories.',
              allowTypeImports: true,
            },
          ],
          patterns: [
            {
              group: [
                '@/simulation',
                '@/simulation/*',
                '../simulation',
                '../simulation/*',
                '../../simulation',
                '../../simulation/*',
              ],
              message: 'Persistence must not import simulation. Consume SimulationResult types only.',
            },
          ],
        },
      ],
    },
  },
  {
    // database.ts is the designated Dexie gateway but still must not import
    // simulation at runtime (type-only SimulationResult consumption lives in
    // repository.ts, which uses import type).
    files: ['src/persistence/database.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/simulation',
                '@/simulation/*',
                '../simulation',
                '../simulation/*',
                '../../simulation',
                '../../simulation/*',
              ],
              message: 'Persistence must not import simulation. Consume SimulationResult types only.',
            },
          ],
        },
      ],
    },
  },
  // --- Phase 3 renderer boundary (PATTERNS S6, AGENTS.md Architecture Rules) ---
  // `src/render/**` consumes PixiJS + simulation selectors/snapshots + visual-event
  // types only. It must NOT import React, Dexie, Zustand, or any DOM/persistence shim.
  // Pixi is ALLOWED — that is the renderer's job. The renderer never reaches across
  // into app/persistence/ui sibling layers; it reads selectors and emits nothing
  // durable.
  {
    files: ['src/render/**/*.ts', 'src/render/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react', message: 'Render must not import React. Render consumes Pixi + selectors only.' },
            { name: 'react-dom', message: 'Render must not import react-dom.' },
            { name: 'react/jsx-runtime', message: 'Render must not import react/jsx-runtime.' },
            { name: 'dexie', message: 'Render must not import Dexie. Persistence is consumed via repositories in the app layer.' },
            { name: 'zustand', message: 'Render must not import Zustand. The app adapter subscribes and forwards snapshots.' },
            { name: 'idb', message: 'Render must not import IndexedDB wrappers.' },
            { name: 'fake-indexeddb', message: 'Render must not import IndexedDB mocks.' },
            { name: 'happy-dom', message: 'Render must not import DOM shims.' },
            { name: 'jsdom', message: 'Render must not import DOM shims.' },
          ],
          patterns: [
            {
              group: [
                '@/app',
                '@/app/*',
                '@/persistence',
                '@/persistence/*',
                '@/ui',
                '@/ui/*',
                '../app',
                '../app/*',
                '../persistence',
                '../persistence/*',
                '../ui',
                '../ui/*',
                '../../app',
                '../../app/*',
                '../../persistence',
                '../../persistence/*',
                '../../ui',
                '../../ui/*',
              ],
              message: 'Render must not import app/persistence/ui sibling layers.',
            },
          ],
        },
      ],
    },
  },
  // --- Phase 3 UI boundary (PATTERNS S6, AGENTS.md Architecture Rules) ---
  // `src/ui/**` is React + Radix + lucide + inward imports only. It must NOT touch
  // Pixi directly (canvas concerns live behind the FlowgridCanvas wrapper) and must
  // NOT touch Dexie directly (it goes through the persistence barrel index.ts).
  // ALLOWED: the legitimate FlowgridCanvas → src/render/flowgrid/{scene,adapter}
  // bridge — UI imports the buildFlowgridScene/connectFlowgridAdapter functions and
  // never imports pixi.js itself, so the package ban alone enforces the actual
  // renderer boundary (no `ban relative import into render` rule is added, by design).
  {
    files: ['src/ui/**/*.ts', 'src/ui/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'pixi.js', message: 'UI must not import Pixi directly. Canvas concerns live behind FlowgridCanvas.' },
            { name: '@pixi/node', message: 'UI must not import Pixi directly. Canvas concerns live behind FlowgridCanvas.' },
            {
              name: 'dexie',
              message: 'UI must go through the persistence barrel (src/persistence/index.ts), not Dexie directly.',
              allowTypeImports: true,
            },
            { name: 'idb', message: 'UI must not import IndexedDB wrappers.' },
            { name: 'fake-indexeddb', message: 'UI must not import IndexedDB mocks.' },
            { name: 'happy-dom', message: 'UI must not import DOM shims.' },
            { name: 'jsdom', message: 'UI must not import DOM shims.' },
          ],
        },
      ],
    },
  },
);
