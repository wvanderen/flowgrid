// Phase 1 Plan 01-01: simulation purity boundary scanner.
//
// This test recursively scans `src/simulation/**/*.ts` source files and fails if any
// file imports a forbidden package, references browser globals/timers, or relatively
// imports into another source layer. ESLint's no-restricted-imports catches the same
// concerns statically; this test is the second line of defense and also catches
// bare references to globals/timers that import rules cannot see.
//
// Plan 01-03 re-runs this against the full simulation tree; the scanner must keep
// passing as commands/systems/engine are added.

import { readFileSync, readdirSync, type Dirent } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from 'vitest';

const SIM_ROOT = fileURLToPath(new URL('../../src/simulation/', import.meta.url));
const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url));

function listTsFiles(dir: string): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listTsFiles(full));
    } else if (entry.isFile() && extname(entry.name) === '.ts') {
      out.push(full);
    }
  }
  return out;
}

type ForbiddenRule = {
  readonly name: string;
  readonly pattern: RegExp;
  readonly rationale: string;
};

const FORBIDDEN_RULES: readonly ForbiddenRule[] = [
  { name: 'import react', rationale: 'UI layer', pattern: /import\s[^;]*['"]react['"]/ },
  { name: 'import react-dom', rationale: 'UI layer', pattern: /import\s[^;]*['"]react-dom['"]/ },
  { name: 'import react/jsx-runtime', rationale: 'UI layer', pattern: /import\s[^;]*['"]react\/jsx-runtime['"]/ },
  { name: 'import pixi.js', rationale: 'renderer layer', pattern: /import\s[^;]*['"]pixi\.js['"]/ },
  { name: 'import dexie', rationale: 'persistence layer', pattern: /import\s[^;]*['"]dexie['"]/ },
  { name: 'import idb', rationale: 'persistence layer', pattern: /import\s[^;]*['"]idb['"]/ },
  { name: 'import zustand', rationale: 'UI state layer', pattern: /import\s[^;]*['"]zustand['"]/ },
  { name: 'import jsdom', rationale: 'DOM shim', pattern: /import\s[^;]*['"]jsdom['"]/ },
  { name: 'import happy-dom', rationale: 'DOM shim', pattern: /import\s[^;]*['"]happy-dom['"]/ },
  { name: 'import fake-indexeddb', rationale: 'IndexedDB mock', pattern: /import\s[^;]*['"]fake-indexeddb['"]/ },
  { name: 'reference window', rationale: 'browser global', pattern: /\bwindow\b/ },
  { name: 'reference document', rationale: 'browser global', pattern: /\bdocument\b/ },
  { name: 'reference localStorage', rationale: 'browser global', pattern: /\blocalStorage\b/ },
  { name: 'reference sessionStorage', rationale: 'browser global', pattern: /\bsessionStorage\b/ },
  { name: 'reference indexedDB', rationale: 'browser global', pattern: /\bindexedDB\b/ },
  { name: 'reference navigator', rationale: 'browser global', pattern: /\bnavigator\b/ },
  { name: 'reference Date.now', rationale: 'ambient time', pattern: /\bDate\.now\b/ },
  { name: 'reference performance.now', rationale: 'ambient time', pattern: /\bperformance\.now\b/ },
  { name: 'reference setTimeout', rationale: 'browser timer', pattern: /\bsetTimeout\b/ },
  { name: 'reference setInterval', rationale: 'browser timer', pattern: /\bsetInterval\b/ },
  { name: 'reference requestAnimationFrame', rationale: 'browser timer', pattern: /\brequestAnimationFrame\b/ },
  { name: 'relative import into app', rationale: 'app layer', pattern: /['"]\.\.?(\/\.\.)*\/app(\/|['"])/ },
  { name: 'relative import into persistence', rationale: 'persistence layer', pattern: /['"]\.\.?(\/\.\.)*\/persistence(\/|['"])/ },
  { name: 'relative import into render', rationale: 'render layer', pattern: /['"]\.\.?(\/\.\.)*\/render(\/|['"])/ },
  { name: 'relative import into ui', rationale: 'ui layer', pattern: /['"]\.\.?(\/\.\.)*\/ui(\/|['"])/ },
];

test('simulation source tree contains at least one TypeScript file', () => {
  const files = listTsFiles(SIM_ROOT);
  expect(files.length, 'expected src/simulation to contain at least one .ts file').toBeGreaterThan(0);
});

test('simulation boundary: no forbidden imports, browser globals, or timers', () => {
  const files = listTsFiles(SIM_ROOT);
  const violations: string[] = [];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const rel = relative(PROJECT_ROOT, file);
    for (const rule of FORBIDDEN_RULES) {
      if (rule.pattern.test(src)) {
        violations.push(`${rel}: ${rule.name} (${rule.rationale})`);
      }
    }
  }
  expect(violations, violations.join('\n')).toEqual([]);
});
