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
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'dexie', message: 'Import Dexie through the database module, not directly in repositories.' },
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
);
