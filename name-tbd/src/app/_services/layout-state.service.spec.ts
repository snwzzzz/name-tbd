import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { LayoutStateService } from './layout-state.service';
import { PageControllerService } from '../api/services/pageController.service';
import { WorkflowControllerService } from '../api/services/workflowController.service';
import { WorkflowStateService } from './workflow-state.service';
import { SaveQueue } from './save-queue.service';
import { IdRegistry } from './id-registry.service';
import { ChangeOperation } from '../api/models';

describe('LayoutStateService', () => {
  let service: LayoutStateService;
  let queued: ChangeOperation[];

  beforeEach(() => {
    queued = [];
    const pageService = {
      getPageContent: vi.fn().mockReturnValue(of({
        page: { id: 7 },
        components: [
          { id: 1, type: 'button', x: 1, y: 1, w: 2, h: 1, props: { label: 'Stored' } },
          { id: 2, type: 'container', x: 0, y: 5, w: 10, h: 6, props: {} },
        ],
        workflow: { id: 30, nodes: [{ id: 5, type: 'Trigger', props: { triggerType: 'page_load' }, x: 0, y: 0 }], edges: [] },
      })),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: PageControllerService, useValue: pageService },
        { provide: WorkflowControllerService, useValue: {} },
        { provide: SaveQueue, useValue: { enqueue: (change: ChangeOperation) => queued.push(change) } },
      ],
    });
    service = TestBed.inject(LayoutStateService);
    service.loadLayoutForTab('7').subscribe();
  });

  it('loads a page in one request and hands its workflow to the workflow state', () => {
    expect(service.getLayout('7').map((item) => item.props)).toEqual([{ label: 'Stored' }, {}]);
    expect(TestBed.inject(WorkflowStateService).getGraphForTab('7').nodes.map((n) => n.id)).toEqual(['5']);
  });

  it('completes a new widget with its type defaults, without saving', () => {
    service.saveLayout('7', [...service.getLayout('7'), { id: 'new_a', type: 'label', x: 0, y: 0, w: 1, h: 1, props: { text: 'Mine' } }]);

    service.applyTypeDefaults('7', 'new_a', 'label');

    const props = service.getLayout('7').find((item) => item.id === 'new_a')?.props ?? {};
    expect(props['text']).toBe('Mine');
    expect(Object.keys(props).length).toBeGreaterThan(1);
    expect(queued).toEqual([]);
  });

  it('saves a widget place with its container, or -1 for the page', () => {
    service.saveWidgetPlace({ id: 1, x: 5, y: 3, w: 2, h: 1 });
    service.saveWidgetPlace({ id: 'new_a', x: 1, y: 1, w: 2, h: 1, parentId: 2 });
    service.saveWidgetPlace({ id: 3, x: 1, y: 1, w: 2, h: 1, parentId: 'new_box' });

    expect(queued).toEqual([
      { op: 'updateWidget', id: 1, x: 5, y: 3, w: 2, h: 1, parentId: -1 },
      { op: 'updateWidget', ref: 'new_a', x: 1, y: 1, w: 2, h: 1, parentId: 2 },
      { op: 'updateWidget', id: 3, x: 1, y: 1, w: 2, h: 1, parentRef: 'new_box' },
    ]);
  });

  it('shows prop edits right away and saves the props as a whole', () => {
    service.patchItemProps('7', 1, { color: 'red' });

    expect(service.getLayout('7')[0].props).toEqual({ label: 'Stored', color: 'red' });
    expect(queued).toEqual([{ op: 'updateWidget', id: 1, props: { label: 'Stored', color: 'red' } }]);
  });

  it('adds new widgets with their children and saves parents before children', () => {
    service.addWidgets('7', [
      { id: 'new_box', type: 'container', x: 0, y: 20, w: 6, h: 4, props: {},
        children: [{ id: 'new_lbl', parentId: 'new_box', type: 'label', x: 0, y: 0, w: 2, h: 1, props: { text: 'Hi' } }] },
      { id: 'new_btn', parentId: 2, type: 'button', x: 1, y: 1, w: 2, h: 1, props: {} },
    ]);

    expect(service.getLayout('7').map((item) => item.id)).toEqual([1, 2, 'new_box']);
    expect(service.getLayout('7')[1].children?.map((item) => item.id)).toEqual(['new_btn']);
    expect(queued.map((c) => [c.op, c.ref, c.parentId ?? c.parentRef])).toEqual([
      ['createWidget', 'new_box', undefined],
      ['createWidget', 'new_lbl', 'new_box'],
      ['createWidget', 'new_btn', 2],
    ]);
  });

  it('swaps temporary ids for saved ones, also as parents', () => {
    service.addWidgets('7', [
      { id: 'new_box', type: 'container', x: 0, y: 20, w: 6, h: 4, props: {},
        children: [{ id: 'new_lbl', parentId: 'new_box', type: 'label', x: 0, y: 0, w: 2, h: 1, props: {} }] },
    ]);

    TestBed.inject(IdRegistry).record({ new_box: 40, new_lbl: 41 });

    const box = service.getLayout('7')[2];
    expect(box.id).toBe(40);
    expect(box.children?.[0]).toEqual(expect.objectContaining({ id: 41, parentId: 40 }));
  });
});
