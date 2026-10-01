import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

// The runtime core (core/, widgets/) is shared by the editor and the exported app, so it may only
// reach the app around it through the ports (core/ports). This keeps it free of editor code.

const APP = join(process.cwd(), 'src', 'app');
// The exported app (src/runtime) is held to the same rule
const RUNTIME_ROOTS = ['core', 'widgets', '_directives/base-widget.directive.ts', '../runtime'];

/** Imports runtime code must not use, and why. */
const FORBIDDEN: { pattern: RegExp; reason: string }[] = [
  { pattern: /\/_services\/(?!modal\/)/, reason: "editor state (use a port from core/ports)" },
  { pattern: /\/(editor|pages)\//, reason: 'editor UI' },
  { pattern: /\/api\//, reason: 'the backend API (use a port from core/ports)' },
  { pattern: /_constants\/(widget-registry|prop-editors|workflow)\.constants/, reason: 'editor registries' },
];

/** The .ts files at a path (a file or a folder), without specs. */
function sourceFiles(path: string): string[] {
  if (path.endsWith('.ts')) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((e) => {
    const child = join(path, e.name);
    if (e.isDirectory()) return sourceFiles(child);
    return e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts') ? [child] : [];
  });
}

describe('runtime boundary', () => {
  it('keeps the runtime core free of editor code', () => {
    const files = RUNTIME_ROOTS.flatMap((root) => sourceFiles(join(APP, root)));
    expect(files.length).toBeGreaterThan(10);

    const violations = files.flatMap((file) =>
      [...readFileSync(file, 'utf-8').matchAll(/from '([^']+)'/g)].flatMap(([, path]) =>
        FORBIDDEN.filter((f) => f.pattern.test(path)).map((f) => `${relative(APP, file)} imports ${path}: ${f.reason}`),
      ),
    );
    expect(violations).toEqual([]);
  });
});
