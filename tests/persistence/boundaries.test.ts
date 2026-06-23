// Phase 2 Plan 02-01: persistence purity boundary scanner.
//
// Mirrors `tests/simulation/boundaries.test.ts` but scans `src/persistence/**/*.ts`.
// Fails if any persistence source file imports a UI/renderer/state layer, references
// browser globals/timers, or relatively imports into the simulation/app/render/ui
// layers. `indexedDB` and `crypto` are deliberately NOT forbidden (persistence
// legitimately uses them), and `dexie` is NOT forbidden here (the ESLint
// `no-restricted-imports` rule handles the direct-import policy; this scanner
// targets layer leakage).

import { readFileSync, readdirSync, type Dirent } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from 'vitest';

const PERSISTENCE_ROOT = fileURLToPath(new URL('../../src/persistence/', import.meta.url));
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
  { name: 'import idb', rationale: 'competing IndexedDB wrapper', pattern: /import\s[^;]*['"]idb['"]/ },
  { name: 'import zustand', rationale: 'UI state layer', pattern: /import\s[^;]*['"]zustand['"]/ },
  { name: 'import fake-indexeddb', rationale: 'IndexedDB mock (test-only)', pattern: /import\s[^;]*['"]fake-indexeddb['"]/ },
  { name: 'import jsdom', rationale: 'DOM shim', pattern: /import\s[^;]*['"]jsdom['"]/ },
  { name: 'import happy-dom', rationale: 'DOM shim', pattern: /import\s[^;]*['"]happy-dom['"]/ },
  { name: 'reference window', rationale: 'browser global', pattern: /\bwindow\b/ },
  { name: 'reference document', rationale: 'browser global', pattern: /\bdocument\b/ },
  { name: 'reference localStorage', rationale: 'browser global', pattern: /\blocalStorage\b/ },
  { name: 'reference sessionStorage', rationale: 'browser global', pattern: /\bsessionStorage\b/ },
  { name: 'reference navigator', rationale: 'browser global', pattern: /\bnavigator\b/ },
  { name: 'reference Date.now', rationale: 'ambient time', pattern: /\bDate\.now\b/ },
  { name: 'reference performance.now', rationale: 'ambient time', pattern: /\bperformance\.now\b/ },
  { name: 'reference setTimeout', rationale: 'timer', pattern: /\bsetTimeout\b/ },
  { name: 'reference setInterval', rationale: 'timer', pattern: /\bsetInterval\b/ },
  { name: 'reference requestAnimationFrame', rationale: 'browser timer', pattern: /\brequestAnimationFrame\b/ },
  { name: 'relative import into simulation', rationale: 'simulation layer (runtime)', pattern: /['"]\.\.?(\/\.\.)*\/simulation(\/|['"])/ },
  { name: 'relative import into app', rationale: 'app layer', pattern: /['"]\.\.?(\/\.\.)*\/app(\/|['"])/ },
  { name: 'relative import into render', rationale: 'render layer', pattern: /['"]\.\.?(\/\.\.)*\/render(\/|['"])/ },
  { name: 'relative import into ui', rationale: 'ui layer', pattern: /['"]\.\.?(\/\.\.)*\/ui(\/|['"])/ },
];

// Note: unlike the simulation scanner, we do not assert "at least one .ts file" here.
// The plan creates this scanner in Task 1 but introduces the first persistence source
// files in Tasks 2-5; a non-empty-tree guard would fail at the Task 1 boundary by
// design. The load-bearing invariant is the forbidden-rule scan below, which is
// correct over an empty tree (zero violations) and enforced once source exists.

test('persistence boundary: no forbidden imports, browser globals, or timers', () => {
  const files = listTsFiles(PERSISTENCE_ROOT);
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
