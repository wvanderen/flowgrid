// Vite production/dev build config (RESEARCH Standard Stack + State of the Art lines 728+).
//
// `@vitejs/plugin-react` provides Fast Refresh + the automatic JSX runtime.
// `@tailwindcss/vite` is the v4 CSS-first build pipeline (no tailwind.config.js).
// Resolve order prefers .tsx then .ts so component modules win over same-name utils.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: '.',
  plugins: [react({ include: ['**/*.tsx', '**/*.ts'] }), tailwindcss()],
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
  },
});
