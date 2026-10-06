import { TestBed } from '@angular/core/testing';
import { reflectComponentType } from '@angular/core';
import { Router } from '@angular/router';
import axe from 'axe-core';
import { RuntimeShell } from './runtime-shell/runtime-shell';
import { runtimeConfig } from './runtime.config';
import { APP_DEFINITION_VERSION, AppDefinition } from '../../app/core/definition/app-definition';
import { WIDGET_CATALOG, catalogDefaults } from '../../app/core/catalog/widget-catalog';
import { containerFrame, widgetComponent } from '../../app/core/rendering/widget-components';
import { ModalStateService } from '../../app/core/services/modal-state.service';
import { LayoutItem, WidgetProps } from '../../app/_types/layout.types';

// Every widget the palette offers, exported and run in the exported app (the runtime shell, as an
// export boots it): it must draw with its catalog defaults, and pass axe-core's WCAG 2.1 A/AA rules.
// A new catalog widget is covered here automatically; give it settings in SETTINGS if its defaults
// alone draw nothing worth checking.

const PALETTE = WIDGET_CATALOG.widgets.filter((w) => w.palette !== false);
const PEOPLE = { id: 5, name: 'People', columns: ['name', 'city', 'age'], rows: [['Alice', 'Berlin', '31'], ['Bob', 'Vienna', '45']] };
const LABEL = (id: number, parentId: number): LayoutItem => ({ id, parentId, type: 'label', x: 0, y: 0, w: 8, h: 3, props: { text: 'Inside' } });

/** Settings beyond the catalog defaults, so the widget shows something real (data, a field, a child). */
const SETTINGS: Record<string, { props?: WidgetProps; children?: (id: number) => LayoutItem[] }> = {
  table: { props: { dataSourceId: '5' } },
  detail: { props: { dataSourceId: '5' } },
  chart: { props: { dataSourceId: '5', labelColumn: 'city', valueColumn: 'age', title: 'Ages' } },
  list: { props: { dataSourceId: '5', titleColumn: 'name', subtitleColumn: 'city', badgeColumn: 'age' } },
  select: { props: { dataSourceId: '5', optionsColumn: 'city' } },
  image: { props: { src: 'https://example.com/logo.png', alt: 'Company logo' } },
  link: { props: { url: 'https://example.com' } },
  container: { children: (id) => [LABEL(id + 1, id)] },
  tabs: { children: (id) => [LABEL(id + 1, id)] },
  modal: { children: (id) => [LABEL(id + 1, id)] },
  form: {
    props: { dataSourceId: '5' },
    children: (id) => [
      { id: id + 1, parentId: id, type: 'input', x: 0, y: 0, w: 16, h: 4, props: { label: 'Name', field: 'name', required: 'true', searchIcon: 'false' } },
      { id: id + 2, parentId: id, type: 'button', x: 0, y: 5, w: 7, h: 3, props: { label: 'Save' } },
    ],
  },
};

function definitionWith(type: string): AppDefinition {
  const widget = PALETTE.find((w) => w.type === type)!;
  const id = 10;
  const settings = SETTINGS[type] ?? {};
  return {
    version: APP_DEFINITION_VERSION,
    app: { id: 70, name: 'Catalog' },
    dataRevision: 'r1',
    homePageId: 1,
    pages: [{
      id: 1, name: 'Home', path: '/', layout: false,
      components: [{
        id, type, x: 0, y: 0, w: widget.size.w, h: widget.size.h,
        props: { ...catalogDefaults(widget), ...settings.props },
        children: settings.children?.(id),
      }],
      workflow: { nodes: [], edges: [] },
    }],
    dataSources: [PEOPLE],
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve));

async function exportAndRun(type: string): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: runtimeConfig(definitionWith(type)).providers });
  const fixture = TestBed.createComponent(RuntimeShell);
  await TestBed.inject(Router).navigateByUrl('/');
  await fixture.whenStable();
  // A dialog only shows once opened
  if (type === 'modal') TestBed.inject(ModalStateService).show('10');
  await flush();
  await fixture.whenStable();
  document.body.appendChild(fixture.nativeElement);
  return fixture.nativeElement as HTMLElement;
}

describe('every palette widget in the exported app', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => document.body.replaceChildren());

  it('has at least 23 widgets in the palette', () => {
    expect(PALETTE.length).toBeGreaterThanOrEqual(23);
  });

  it('would catch an inaccessible widget (axe really runs here)', async () => {
    const el = document.createElement('div');
    el.innerHTML = '<input type="text"><button></button>';
    document.body.appendChild(el);
    const results = await axe.run(el, { runOnly: { type: 'tag', values: ['wcag2a'] } });
    expect(results.violations.map((v) => v.id)).toEqual(expect.arrayContaining(['label', 'button-name']));
  });

  for (const { type } of PALETTE) {
    describe(type, () => {
      it('draws from its exported definition', async () => {
        const el = await exportAndRun(type);
        const component = containerFrame(type) ?? (WIDGET_CATALOG.widgets.find((w) => w.type === type)?.container ? null : widgetComponent(type));
        if (component) {
          const selector = reflectComponentType(component)!.selector;
          expect(el.querySelector(selector), `<${selector}> on the page`).not.toBeNull();
          expect(el.querySelector('app-default-widget'), 'no placeholder').toBeNull();
        }
        if (SETTINGS[type]?.children) expect(el.textContent).toMatch(/Inside|Name/);
      });

      it('passes axe-core (WCAG 2.1 A and AA)', async () => {
        const el = await exportAndRun(type);
        const results = await axe.run(el, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
          // jsdom draws nothing, so contrast can't be measured here
          rules: { 'color-contrast': { enabled: false } },
        });
        const violations = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(' | ')}`);
        expect(violations).toEqual([]);
      });
    });
  }
});
