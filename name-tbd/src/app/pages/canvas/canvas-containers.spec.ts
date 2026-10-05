import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { GridStack } from 'gridstack';
import { Canvas } from './canvas';
import { provideEditorRuntime } from '../../editor/runtime-adapters/editor-runtime.providers';
import { provideTestEditorContext } from '../../_testing/editor-context.testing';
import { PageControllerService } from '../../api/services/pageController.service';
import { SaveQueue } from '../../_services/save-queue.service';
import { TabsService } from '../../_services/tabs.service';
import { LayoutStateService } from '../../_services/layout-state.service';
import { ActiveTabsService } from '../../core/services/active-tabs.service';
import { ModalStateService } from '../../core/services/modal-state.service';
import { findInTree } from '../../_utils/layout-tree.utils';
import { headerRowsOf } from '../../core/catalog/widget-catalog';

const tick = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));
globalThis.CSS ??= { escape: (value: string) => value } as unknown as typeof CSS;

interface CanvasInside {
  grid: GridStack;
  beginGesture(): void;
  endGestureSoon(): void;
  togglePreview(): void;
}

/** Containers on the real canvas: tabs keep the widgets of their other tabs, dialogs only show when open in a preview. */
describe('Canvas with tabs and dialogs', () => {
  let canvas: CanvasInside;
  const layout = () => TestBed.inject(LayoutStateService).getLayout('7');
  const tabsNode = () => canvas.grid.engine.nodes.find((n) => n.id === '1')!;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Canvas],
      providers: [
        provideEditorRuntime(),
        provideTestEditorContext(),
        {
          provide: PageControllerService,
          useValue: {
            getPages: () => of([{ id: 7, name: 'Home', path: '/', branchId: 7, layout: false }]),
            getPageContent: () => of({
              components: [
                { id: 1, type: 'tabs', x: 0, y: 0, w: 40, h: 20, props: { tabs: 'One\nTwo' } },
                { id: 2, parentId: 1, type: 'label', x: 0, y: 0, w: 8, h: 3, props: { text: 'first' } },
                { id: 3, parentId: 1, type: 'label', x: 0, y: 0, w: 8, h: 3, props: { text: 'second', tab: '1' } },
                { id: 4, type: 'modal', x: 50, y: 0, w: 30, h: 15, props: { title: 'Hi' } },
              ],
              workflow: { id: 9, nodes: [], edges: [] },
            }),
          },
        },
        { provide: SaveQueue, useValue: { enqueue: () => undefined, state: signal('saved'), error: signal(null) } },
      ],
    });
    TestBed.inject(TabsService).activeTabId.set('7');
    const fixture = TestBed.createComponent(Canvas);
    fixture.detectChanges();
    await fixture.whenStable();
    await tick();
    canvas = fixture.componentInstance as unknown as CanvasInside;
  });

  it("holds only the shown tab's widgets in its grid, below the tab bar, and keeps the others on the page", async () => {
    expect(tabsNode().subGrid!.engine.nodes.map((n) => n.id)).toEqual(['2']);
    expect(tabsNode().subGrid!.opts.maxRow).toBe(20 - headerRowsOf('tabs'));
    expect(tabsNode().el!.querySelector('app-tabs-widget')).not.toBeNull();

    // A move saves the page from the grid: the hidden widget stays part of it
    canvas.beginGesture();
    canvas.grid.update(tabsNode().el!, { x: 2 });
    canvas.endGestureSoon();
    await tick();
    expect(findInTree(layout(), 1)?.children?.map((c) => c.id)).toEqual([2, 3]);
  });

  it("shows another tab's widgets when the tab is picked", async () => {
    TestBed.inject(ActiveTabsService).select('1', 1);
    await tick();
    expect(tabsNode().subGrid!.engine.nodes.map((n) => n.id)).toEqual(['3']);
    expect(findInTree(layout(), 1)?.children?.map((c) => c.id).sort()).toEqual([2, 3]);
  });

  it('puts a widget dropped on a tab on that tab', async () => {
    TestBed.inject(ActiveTabsService).select('1', 1);
    await tick();
    const el = document.createElement('div');
    el.className = 'grid-stack-item';
    el.setAttribute('data-type', 'label');
    el.innerHTML = '<div class="grid-stack-item-content"></div>';
    Object.entries({ 'gs-x': '10', 'gs-y': '2', 'gs-w': '8', 'gs-h': '3' }).forEach(([name, value]) => el.setAttribute(name, value));
    const sub = tabsNode().subGrid!;
    sub.el.appendChild(el);
    sub.makeWidget(el);
    await tick();
    const added = findInTree(layout(), 1)!.children!.find((c) => ![2, 3].includes(Number(c.id)))!;
    expect(added.props?.['tab']).toBe('1');
  });

  it('hides dialogs in a preview until they are opened', async () => {
    const dialog = () => canvas.grid.engine.nodes.find((n) => n.id === '4')!.el!;
    expect(dialog().classList).not.toContain('modal-closed');

    canvas.togglePreview();
    await tick();
    expect(dialog().classList).toContain('modal-closed');

    TestBed.inject(ModalStateService).show('4');
    await tick();
    expect(dialog().classList).toContain('modal-open');

    canvas.togglePreview();
    await tick();
    expect(dialog().classList).not.toContain('modal-open');
    expect(TestBed.inject(ModalStateService).anyOpen()).toBe(false);
  });
});
