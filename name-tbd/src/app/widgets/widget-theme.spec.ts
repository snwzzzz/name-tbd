import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

// Changing the app's theme restyles every widget only if widgets take their colors from the widget
// tokens (_styles/_tokens.scss, set by the theme), never their own. White text on a filled color is
// fine, and the chart's categorical palette is its own (validated) set.

const WIDGETS = join(process.cwd(), 'src', 'app', 'widgets');
const ALLOWED = [/^#fff(fff)?$/i];
const OWN_PALETTE = ['chart-widget.scss'];

function styleFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return styleFiles(path);
    return /\.(scss|html)$/.test(e.name) && !OWN_PALETTE.includes(e.name) ? [path] : [];
  });
}

describe('widgets follow the app theme', () => {
  it('use the widget tokens instead of colors of their own', () => {
    const offenders = styleFiles(WIDGETS).flatMap((file) =>
      [...readFileSync(file, 'utf-8').matchAll(/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\([^)]*\)/gi)]
        .map(([color]) => color)
        .filter((color) => !ALLOWED.some((ok) => ok.test(color)))
        .map((color) => `${relative(WIDGETS, file)}: ${color}`),
    );
    expect(offenders).toEqual([]);
  });

  it("read the theme's font, corners and spacing", () => {
    const all = styleFiles(WIDGETS).map((file) => readFileSync(file, 'utf-8')).join('\n');
    for (const token of ['--widget-brand', '--widget-font', '--widget-radius', '--widget-space']) expect(all).toContain(token);
  });
});
