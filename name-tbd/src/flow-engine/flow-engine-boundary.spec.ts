import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';

// The flow engine is a package of its own: the browser (editor preview, exported app) and the
// server's Node sidecar run the same code. So it may import only its own files and the expression
// library, never Angular, the app or Node.

const ROOT = join(process.cwd(), 'src', 'flow-engine');
const ALLOWED_PACKAGES = ['@marcbachmann/cel-js'];

function sourceFiles(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((e) => {
    const child = join(path, e.name);
    if (e.isDirectory()) return e.name === 'server' ? [] : sourceFiles(child);
    return e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts') ? [child] : [];
  });
}

describe('flow engine boundary', () => {
  it('imports only itself and the expression library', () => {
    const files = sourceFiles(ROOT);
    expect(files.length).toBeGreaterThan(5);

    const violations = files.flatMap((file) =>
      [...readFileSync(file, 'utf-8').matchAll(/from '([^']+)'/g)].flatMap(([, path]) => {
        if (path.startsWith('.')) {
          const target = resolve(dirname(file), path);
          return target.startsWith(ROOT) ? [] : [`${relative(ROOT, file)} imports ${path}, outside the package`];
        }
        return ALLOWED_PACKAGES.includes(path) ? [] : [`${relative(ROOT, file)} imports ${path}`];
      }),
    );
    expect(violations).toEqual([]);
  });
});
