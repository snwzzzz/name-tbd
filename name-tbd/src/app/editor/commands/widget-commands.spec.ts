import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CommandContext } from './command';
import { AddWidgets, DeleteWidgets, MoveWidgets } from './widget-commands';
import { LayoutStateService } from '../../_services/layout-state.service';
import { WorkflowStateService } from '../../_services/workflow-state.service';
import { IdRegistry } from '../../_services/id-registry.service';
import { SaveQueue } from '../../_services/save-queue.service';
import { PageControllerService } from '../../api/services/pageController.service';
import { WorkflowControllerService } from '../../api/services/workflowController.service';
import { ChangeOperation } from '../../api/models';
import { LayoutItem } from '../../_types/layout.types';
import { FlowNode } from '../../_types/workflow.types';
import { inputPortId, outputPortId } from '../../_utils/port.utils';

/** The page as the commands find it: a button, and a container with a label inside. */
const PAGE = [
  { id: 1, type: 'button', x: 0, y: 0, w: 2, h: 1, props: { text: 'Go' } },
  { id: 2, type: 'container', x: 0, y: 5, w: 10, h: 6, props: {} },
  { id: 3, parentId: 2, type: 'label', x: 1, y: 1, w: 3, h: 1, props: { text: 'Hi' } },
];

/** A layout compared by content: children in id order. */
const normalized = (items: LayoutItem[]): unknown =>
  [...items]
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map((item) => ({ ...item, children: item.children?.length ? normalized(item.children) : undefined }));

describe('widget commands', () => {
  let queued: ChangeOperation[];
  let context: CommandContext;
  let layout: () => unknown;

  beforeEach(() => {
    queued = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PageControllerService,
          useValue: { getPageContent: () => of({ components: structuredClone(PAGE), workflow: { id: 9, nodes: [], edges: [] } }) },
        },
        { provide: WorkflowControllerService, useValue: {} },
        { provide: SaveQueue, useValue: { enqueue: (change: ChangeOperation) => queued.push(change) } },
      ],
    });
    context = {
      layout: TestBed.inject(LayoutStateService),
      workflows: TestBed.inject(WorkflowStateService),
      registry: TestBed.inject(IdRegistry),
    };
    context.layout.loadLayoutForTab('7').subscribe();
    layout = () => normalized(context.layout.getLayout('7'));
  });

  const applyAndInvert = (command: { apply(c: CommandContext): void; invert(): { apply(c: CommandContext): void } }) => {
    const start = layout();
    command.apply(context);
    const changed = layout();
    command.invert().apply(context);
    expect(layout()).toEqual(start);
    command.apply(context);
    expect(layout()).toEqual(changed);
    return changed;
  };

  it('moves widgets and moves them back, saving each place', () => {
    applyAndInvert(new MoveWidgets('7',
      [{ id: 1, x: 0, y: 0, w: 2, h: 1 }],
      [{ id: 1, x: 4, y: 2, w: 3, h: 1 }]));

    expect(queued.map((c) => [c.op, c.id, c.x, c.parentId])).toEqual([
      ['updateWidget', 1, 4, -1], ['updateWidget', 1, 0, -1], ['updateWidget', 1, 4, -1],
    ]);
  });

  it('moves a widget out of its container and back in', () => {
    const changed = applyAndInvert(new MoveWidgets('7',
      [{ id: 3, x: 1, y: 1, w: 3, h: 1, parentId: 2 }],
      [{ id: 3, x: 20, y: 0, w: 3, h: 1 }])) as LayoutItem[];

    expect(changed.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(queued.map((c) => c.parentId)).toEqual([-1, 2, -1]);
  });

  it('deletes a container with what is inside, and brings both back with the same ids', () => {
    const container = structuredClone(context.layout.getLayout('7')[1]);
    const changed = applyAndInvert(new DeleteWidgets('7', [container])) as LayoutItem[];

    expect(changed.map((item) => item.id)).toEqual([1]);
    expect(queued).toEqual([
      { op: 'deleteWidget', id: 2 }, { op: 'restoreWidget', id: 2 }, { op: 'deleteWidget', id: 2 },
    ]);
  });

  it('takes back a paste with its flows, and brings it all back', () => {
    const item: LayoutItem = { id: 'new_c', type: 'button', x: 5, y: 0, w: 2, h: 1, props: { text: 'Copy' } };
    const node = { id: 'new_n', type: 'Trigger', triggerType: 'element_click', elementId: 'new_c', position: { x: 0, y: 0 } } as FlowNode;
    const action = { id: 'new_a', type: 'Action', actionType: 'set_text', config: { targetId: '3' }, position: { x: 1, y: 0 } } as unknown as FlowNode;
    const connection = { id: 'new_e', fromNode: 'new_n', toNode: 'new_a', fromPort: outputPortId('new_n', 'out'), toPort: inputPortId('new_a') };
    context.layout.addWidgets('7', [structuredClone(item)]);
    context.workflows.restoreNodes('7', [node, action], [connection]);
    queued = [];
    const paste = new AddWidgets('7', [item], [node, action], [connection], 'Paste');

    paste.invert().apply(context);
    expect(context.layout.getLayout('7').map((i) => i.id)).toEqual([1, 2]);
    expect(context.workflows.getGraphForTab('7').nodes).toEqual([]);

    paste.apply(context);
    expect(context.layout.getLayout('7').map((i) => i.id)).toEqual([1, 2, 'new_c']);
    expect(context.workflows.getGraphForTab('7').connections).toEqual([connection]);
    expect(queued.map((c) => c.op)).toEqual([
      'deleteNode', 'deleteNode', 'deleteWidget', 'restoreWidget', 'restoreNode', 'restoreNode', 'restoreEdge',
    ]);
  });

  it('goes by the real ids of things saved since the command was made', () => {
    context.layout.addWidgets('7', [{ id: 'new_c', type: 'button', x: 5, y: 0, w: 2, h: 1, props: {} }]);
    const add = new AddWidgets('7', [structuredClone(context.layout.getLayout('7')[2])]);
    context.registry.record({ new_c: 42 });
    queued = [];

    add.invert().apply(context);
    add.apply(context);

    expect(queued).toEqual([{ op: 'deleteWidget', id: 42 }, { op: 'restoreWidget', id: 42 }]);
    expect(context.layout.getLayout('7').map((i) => i.id)).toEqual([1, 2, 42]);
  });

  it('merges the moves of one drag, and several deletes into one', () => {
    const first = new MoveWidgets('7', [{ id: 1, x: 0, y: 0, w: 2, h: 1 }], [{ id: 1, x: 1, y: 0, w: 2, h: 1 }]);
    const second = new MoveWidgets('7', [{ id: 1, x: 1, y: 0, w: 2, h: 1 }, { id: 2, x: 0, y: 5, w: 10, h: 6 }],
      [{ id: 1, x: 2, y: 0, w: 2, h: 1 }, { id: 2, x: 0, y: 6, w: 10, h: 6 }]);
    const merged = first.merge(second) as MoveWidgets;
    expect(merged.before).toEqual([{ id: 1, x: 0, y: 0, w: 2, h: 1 }, { id: 2, x: 0, y: 5, w: 10, h: 6 }]);
    expect(merged.after).toEqual([{ id: 1, x: 2, y: 0, w: 2, h: 1 }, { id: 2, x: 0, y: 6, w: 10, h: 6 }]);

    const layoutNow = context.layout.getLayout('7');
    const deletes = new DeleteWidgets('7', [layoutNow[0]]).merge(new DeleteWidgets('7', [layoutNow[1]]))!;
    expect(deletes.label).toBe('Delete 2 widgets');
  });
});
