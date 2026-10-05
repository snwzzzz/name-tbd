import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RuntimeShell } from './runtime-shell';
import { runtimeConfig } from '../runtime.config';
import { testDefinition } from '../test-definition';
import { APP_DATA } from '../../../app/core/ports/app-ports';
import { AppDefinition } from '../../../app/core/definition/app-definition';
import { ARTBOARD_HEIGHT, ARTBOARD_WIDTH, CELL_SIZE, EXPORT_MIN_WIDTH, GRID_ROWS } from '../../../app/_constants/artboard.constants';

const flush = () => new Promise((resolve) => setTimeout(resolve));

describe('RuntimeShell', () => {
  const start = async (definition: AppDefinition = testDefinition()) => {
    TestBed.configureTestingModule({ providers: runtimeConfig(definition).providers });
    const fixture = TestBed.createComponent(RuntimeShell);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    return fixture;
  };
  const settle = async (fixture: Awaited<ReturnType<typeof start>>) => {
    await flush();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => localStorage.clear());

  it('shows the home page under the layout page, and runs its workflows', async () => {
    const fixture = await start();
    let el = await settle(fixture);

    expect([...el.querySelectorAll('.layout nav a')].map((a) => a.textContent)).toEqual(['Home', 'About']);
    expect(el.querySelector('app-runtime-page')?.textContent).toContain('Hello');

    (el.querySelector('app-runtime-page button') as HTMLButtonElement).click();
    el = await settle(fixture);
    expect(el.querySelector('app-runtime-page')?.textContent).toContain('Clicked');
  });

  it('follows links to other pages, marking them in the menu', async () => {
    const fixture = await start();
    let el = await settle(fixture);

    (el.querySelector('app-runtime-page a') as HTMLAnchorElement).click();
    el = await settle(fixture);

    expect(TestBed.inject(Router).url).toBe('/about');
    expect(el.querySelector('app-runtime-page')?.textContent).toContain('Alice');
    expect(el.querySelector('.layout nav a[aria-current="page"]')?.textContent).toBe('About');
    expect(el.querySelector('.layout nav a')?.getAttribute('href')).toBe('#/');
  });

  it('draws the page in real px (so the browser zooms it): window-wide down to half the artboard, artboard-high', async () => {
    const el = await settle(await start());
    const artboard = el.querySelector<HTMLElement>('.artboard')!;

    expect(artboard.style.minWidth).toContain(`${EXPORT_MIN_WIDTH}px`);
    expect(EXPORT_MIN_WIDTH).toBe(ARTBOARD_WIDTH / 2);
    expect(artboard.style.height).toBe(`${ARTBOARD_HEIGHT}px`);
    expect(artboard.style.zoom).toBe('');
  });

  it('grows a page taller than the screen downward, so the window scrolls to it', async () => {
    const definition = testDefinition();
    // A label at the bottom of the second screen
    definition.pages[0].components.push({ id: 13, type: 'label', x: 0, y: 2 * GRID_ROWS - 3, w: 8, h: 3, props: { text: 'Far below' } });
    const el = await settle(await start(definition));
    const artboard = el.querySelector<HTMLElement>('.artboard')!;

    expect(artboard.style.height).toBe(`${2 * ARTBOARD_HEIGHT}px`);
    // Both grids have cell-high rows, so the layout page's widgets stay where they are
    const pageGrid = el.querySelector<HTMLElement>('app-runtime-page .layout-grid.root')!;
    const layoutGrid = el.querySelector<HTMLElement>('.layout .layout-grid.root')!;
    expect(pageGrid.style.gridTemplateRows).toBe(`repeat(${2 * GRID_ROWS}, ${CELL_SIZE}px)`);
    expect(layoutGrid.style.gridTemplateRows).toBe(`repeat(${2 * GRID_ROWS}, ${CELL_SIZE}px)`);
    const label = [...el.querySelectorAll<HTMLElement>('app-runtime-page .cell')].find((c) => c.textContent?.includes('Far below'))!;
    expect(label.style.gridRow).toBe(`${2 * GRID_ROWS - 2} / span 3`);
  });

  it('is one screen high again on a shorter page', async () => {
    const definition = testDefinition();
    definition.pages[1].components.push({ id: 21, type: 'label', x: 0, y: 100, w: 8, h: 3, props: { text: 'Deep' } });
    const fixture = await start(definition);
    let el = await settle(fixture);
    expect(el.querySelector<HTMLElement>('.artboard')!.style.height).toBe(`${ARTBOARD_HEIGHT}px`);

    await TestBed.inject(Router).navigateByUrl('/about');
    el = await settle(fixture);
    expect(el.querySelector<HTMLElement>('.artboard')!.style.height).toBe(`${103 * CELL_SIZE}px`);
  });

  it("wears the app's theme: every widget reads its colors, font, corners and spacing", async () => {
    const definition = testDefinition();
    definition.theme = { preset: 'Custom', primary: '#aa3300', font: 'Mono', radius: 'Large', spacing: 'Roomy' };
    await settle(await start(definition));
    const root = document.documentElement.style;

    expect(root.getPropertyValue('--widget-brand')).toBe('#aa3300');
    expect(root.getPropertyValue('--widget-font')).toContain('monospace');
    expect(root.getPropertyValue('--widget-radius')).toBe('14px');
    expect(root.getPropertyValue('--widget-space')).toBe('0.75rem');
  });

  it('keeps data changes in the browser for the next visit', async () => {
    await start();
    TestBed.inject(APP_DATA).addRow(5, ['Carol']);
    TestBed.resetTestingModule();

    await start();
    expect(TestBed.inject(APP_DATA).table(5)?.rows.map((r) => r.values[0])).toEqual(['Alice', 'Bob', 'Carol']);
  });
});
