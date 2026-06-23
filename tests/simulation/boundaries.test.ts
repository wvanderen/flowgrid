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
//
// Plan 03-02 extends the scanner to a reusable `scanLayer(rootDir, rules)` helper
// and adds parallel coverage for the new `src/render` and `src/ui` layers
// (PATTERNS S6, AGENTS.md Architecture Rules). The render and ui test blocks are
// skipped while their trees are empty so the boundary test does not regress when
// only some of Phase 3 has landed.

import { existsSync, readFileSync, readdirSync, type Dirent } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from 'vitest';

const SIM_ROOT = fileURLToPath(new URL('../../src/simulation/', import.meta.url));
const RENDER_ROOT = fileURLToPath(new URL('../../src/render/', import.meta.url));
const UI_ROOT = fileURLToPath(new URL('../../src/ui/', import.meta.url));
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
    } else if (entry.isFile() && (extname(entry.name) === '.ts' || extname(entry.name) === '.tsx')) {
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

// RENDER layer rules (PATTERNS S6): render consumes Pixi + selectors only. Pixi is
// allowed; React/Dexie/Zustand and DOM shims are forbidden. Render also must not
// relatively import into sibling app/persistence/ui layers.
const RENDER_FORBIDDEN_RULES: readonly ForbiddenRule[] = [
  { name: 'import react', rationale: 'UI layer (render is Pixi-only)', pattern: /import\s[^;]*['"]react['"]/ },
  { name: 'import react-dom', rationale: 'UI layer', pattern: /import\s[^;]*['"]react-dom['"]/ },
  { name: 'import react/jsx-runtime', rationale: 'UI layer', pattern: /import\s[^;]*['"]react\/jsx-runtime['"]/ },
  { name: 'import dexie', rationale: 'persistence layer', pattern: /import\s[^;]*['"]dexie['"]/ },
  { name: 'import idb', rationale: 'persistence layer', pattern: /import\s[^;]*['"]idb['"]/ },
  { name: 'import zustand', rationale: 'app state layer', pattern: /import\s[^;]*['"]zustand['"]/ },
  { name: 'import jsdom', rationale: 'DOM shim', pattern: /import\s[^;]*['"]jsdom['"]/ },
  { name: 'import happy-dom', rationale: 'DOM shim', pattern: /import\s[^;]*['"]happy-dom['"]/ },
  { name: 'import fake-indexeddb', rationale: 'IndexedDB mock', pattern: /import\s[^;]*['"]fake-indexeddb['"]/ },
  { name: 'relative import into app', rationale: 'app layer', pattern: /['"]\.\.?(\/\.\.)*\/app(\/|['"])/ },
  { name: 'relative import into persistence', rationale: 'persistence layer', pattern: /['"]\.\.?(\/\.\.)*\/persistence(\/|['"])/ },
  { name: 'relative import into ui', rationale: 'ui layer', pattern: /['"]\.\.?(\/\.\.)*\/ui(\/|['"])/ },
];

// UI layer rules (PATTERNS S6): UI must not touch Pixi directly (canvas concerns
// live behind FlowgridCanvas which imports the render barrel functions only) and
// must not touch Dexie directly (go through the persistence barrel). NO relative-
// import-into-render ban — FlowgridCanvas legitimately imports buildFlowgridScene
// and connectFlowgridAdapter from src/render/flowgrid/{scene,adapter} as the
// intended React↔Pixi seam.
const UI_FORBIDDEN_RULES: readonly ForbiddenRule[] = [
  { name: 'import pixi.js', rationale: 'renderer layer (canvas lives behind FlowgridCanvas)', pattern: /import\s[^;]*['"]pixi\.js['"]/ },
  { name: 'import @pixi/node', rationale: 'renderer layer', pattern: /import\s[^;]*['"]@pixi\/node['"]/ },
  { name: 'import dexie', rationale: 'go through persistence barrel', pattern: /import\s[^;]*['"]dexie['"]/ },
  { name: 'import idb', rationale: 'persistence layer', pattern: /import\s[^;]*['"]idb['"]/ },
  { name: 'import fake-indexeddb', rationale: 'IndexedDB mock', pattern: /import\s[^;]*['"]fake-indexeddb['"]/ },
];

// Reusable scanner: walks `rootDir` for .ts/.tsx files, applies each rule, and
// returns the list of `${relpath}: ${rule.name} (${rule.rationale})` violations.
// Exported so future tests (or other tooling) can compose over the same shape.
export function scanLayer(rootDir: string, rules: readonly ForbiddenRule[]): string[] {
  const files = listTsFiles(rootDir);
  const violations: string[] = [];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const rel = relative(PROJECT_ROOT, file);
    for (const rule of rules) {
      if (rule.pattern.test(src)) {
        violations.push(`${rel}: ${rule.name} (${rule.rationale})`);
      }
    }
  }
  return violations;
}

test('simulation source tree contains at least one TypeScript file', () => {
  const files = listTsFiles(SIM_ROOT);
  expect(files.length, 'expected src/simulation to contain at least one .ts file').toBeGreaterThan(0);
});

test('simulation boundary: no forbidden imports, browser globals, or timers', () => {
  const violations = scanLayer(SIM_ROOT, FORBIDDEN_RULES);
  expect(violations, violations.join('\n')).toEqual([]);
});

// Render / UI trees are populated by Phase 3 (Plan 03-02 Task 2). Before any files
// land there is nothing to scan, so skip the existence + boundary tests rather than
// asserting against an empty tree. Once Task 2 writes the renderer and UI sources
// the skip conditions clear automatically and the boundary tests become meaningful.
test.skipIf(!existsSync(RENDER_ROOT) || listTsFiles(RENDER_ROOT).length === 0)(
  'render source tree contains at least one TypeScript file',
  () => {
    const files = listTsFiles(RENDER_ROOT);
    expect(files.length, 'expected src/render to contain at least one .ts/.tsx file').toBeGreaterThan(0);
  },
);

test.skipIf(!existsSync(RENDER_ROOT) || listTsFiles(RENDER_ROOT).length === 0)(
  'render boundary: no React/Dexie/Zustand/DOM-shim imports or sibling-layer crossings',
  () => {
    const violations = scanLayer(RENDER_ROOT, RENDER_FORBIDDEN_RULES);
    expect(violations, violations.join('\n')).toEqual([]);
  },
);

test.skipIf(!existsSync(UI_ROOT) || listTsFiles(UI_ROOT).length === 0)(
  'ui source tree contains at least one TypeScript file',
  () => {
    const files = listTsFiles(UI_ROOT);
    expect(files.length, 'expected src/ui to contain at least one .ts/.tsx file').toBeGreaterThan(0);
  },
);

test.skipIf(!existsSync(UI_ROOT) || listTsFiles(UI_ROOT).length === 0)(
  'ui boundary: no Pixi or direct Dexie imports (FlowgridCanvas bridges via render barrel only)',
  () => {
    const violations = scanLayer(UI_ROOT, UI_FORBIDDEN_RULES);
    expect(violations, violations.join('\n')).toEqual([]);
  },
);
