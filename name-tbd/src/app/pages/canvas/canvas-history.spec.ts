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
import { HistoryService } from '../../editor/commands/history.service';
import { LayoutStateService } from '../../_services/layout-state.service';
import { findInTree } from '../../_utils/layout-tree.utils';

/** What the tests reach into: the grid, and the canvas's own gesture and delete handling. */
interface CanvasInside {
  grid: GridStack;
  beginGesture(): void;
  endGestureSoon(): void;
  removeWidget(grid: GridStack, el: HTMLElement): void;
}

const tick = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

/** Undo and redo on the real canvas (GridStack): the page is rebuilt, and only user gestures count as steps. */
describe('Canvas with undo and redo', () => {
  let canvas: CanvasInside;
  let history: HistoryService;
  const x = (id: number) => findInTree(TestBed.inject(LayoutStateService).getLayout('7'), id)?.x;
  const element = (id: string) => canvas.grid.engine.nodes.find((n) => n.id === id)!.el!;

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
                { id: 1, type: 'button', x: 0, y: 0, w: 8, h: 3, props: {} },
                { id: 2, type: 'container', x: 0, y: 10, w: 20, h: 10, props: {} },
                { id: 3, parentId: 2, type: 'label', x: 1, y: 1, w: 6, h: 2, props: {} },
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
    history = TestBed.inject(HistoryService);
  });

  /** A drag: GridStack moves the widget during a gesture. */
  const drag = async (id: string, toX: number) => {
    canvas.beginGesture();
    canvas.grid.update(element(id), { x: toX });
    canvas.endGestureSoon();
    await tick();
  };

  it('undoes and redoes a drag', async () => {
    await drag('1', 30);
    expect(history.undoLabel('7')).toBe('Move');

    history.undo('7');
    await tick();
    expect(x(1)).toBe(0);
    expect(history.redoLabel('7')).toBe('Move');

    history.redo('7');
    await tick();
    expect(x(1)).toBe(30);
    expect(history.undoLabel('7')).toBe('Move');
  });

  it('undoes and redoes a delete', async () => {
    canvas.removeWidget(canvas.grid, element('1'));
    await tick();
    expect(history.undoLabel('7')).toBe('Delete widget');

    history.undo('7');
    await tick();
    expect(x(1)).toBe(0);

    history.redo('7');
    await tick();
    expect(x(1)).toBeUndefined();
    expect(history.undoLabel('7')).toBe('Delete widget');
  });

  it('does not count GridStack moving things by itself as a step (which would wipe out redo)', async () => {
    await drag('1', 30);
    history.undo('7');
    await tick();

    // E.g. GridStack laying the rebuilt page out again: no gesture
    canvas.grid.update(element('1'), { x: 5 });
    await tick();

    expect(history.redoLabel('7')).toBe('Move');
    expect(x(1)).toBe(5); // still saved
  });

  it('undoes and redoes a drop from the palette', async () => {
    // What a palette drop adds: a new grid item without an id
    const el = document.createElement('div');
    el.className = 'grid-stack-item';
    el.setAttribute('data-type', 'button');
    el.innerHTML = '<div class="grid-stack-item-content"></div>';
    Object.entries({ 'gs-x': '50', 'gs-y': '30', 'gs-w': '8', 'gs-h': '3' }).forEach(([name, value]) => el.setAttribute(name, value));
    canvas.grid.el.appendChild(el);
    canvas.grid.makeWidget(el);
    await tick();
    const layout = () => TestBed.inject(LayoutStateService).getLayout('7');
    expect(layout()).toHaveLength(3);
    expect(history.undoLabel('7')).toBe('Add widget');

    history.undo('7');
    await tick();
    expect(layout()).toHaveLength(2);
    expect(history.redoLabel('7')).toBe('Add widget');

    history.redo('7');
    await tick();
    expect(layout()).toHaveLength(3);
    expect(history.undoLabel('7')).toBe('Add widget');
  });
});
