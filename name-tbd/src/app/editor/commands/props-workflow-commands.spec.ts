import { TestBed } from '@angular/core/testing';
import { HistoryService } from './history.service';
import { SetWidgetProps, TYPING_MS } from './props-commands';
import { ChangeGraph, graphDiff, recordGraphChange } from './workflow-commands';
import { LayoutStateService } from '../../_services/layout-state.service';
import { WorkflowStateService } from '../../_services/workflow-state.service';
import { SaveQueue } from '../../_services/save-queue.service';
import { PageControllerService } from '../../api/services/pageController.service';
import { WorkflowControllerService } from '../../api/services/workflowController.service';
import { ChangeOperation } from '../../api/models';
import { PageWorkflow, TriggerNode } from '../../_types/workflow.types';
import { findInTree } from '../../_utils/layout-tree.utils';

describe('Settings and workflow commands', () => {
  let history: HistoryService;
  let layout: LayoutStateService;
  let workflows: WorkflowStateService;
  let queued: ChangeOperation[];
  let now: number;

  beforeEach(() => {
    queued = [];
    now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    TestBed.configureTestingModule({
      providers: [
        { provide: PageControllerService, useValue: {} },
        { provide: WorkflowControllerService, useValue: {} },
        { provide: SaveQueue, useValue: { enqueue: (change: ChangeOperation) => queued.push(change) } },
      ],
    });
    history = TestBed.inject(HistoryService);
    layout = TestBed.inject(LayoutStateService);
    workflows = TestBed.inject(WorkflowStateService);
    layout.saveLayout('7', [{ id: 1, type: 'label', x: 0, y: 0, w: 4, h: 1, props: { text: 'A' } }]);
    workflows.seedGraph('7', {
      workflowId: 9,
      nodes: [{ id: '20', type: 'Trigger', triggerType: 'element_click', elementId: '1', eventName: 'element_click', position: { x: 0, y: 0 } }],
      connections: [],
    } as PageWorkflow);
  });

  afterEach(() => vi.restoreAllMocks());

  const text = () => findInTree(layout.getLayout('7'), 1)?.props?.['text'];
  const nodes = () => workflows.getGraphForTab('7').nodes;

  it('undoes and redoes a settings change, and saves each', () => {
    history.execute(new SetWidgetProps('7', 1, { text: 'A' }, { text: 'B' }));
    history.undo('7');
    expect(text()).toBe('A');
    history.redo('7');
    expect(text()).toBe('B');
    expect(queued.map((c) => c.props)).toEqual([{ text: 'B' }, { text: 'A' }, { text: 'B' }]);
  });

  it('makes typing into a setting one step, but not a pause longer than TYPING_MS', () => {
    history.execute(new SetWidgetProps('7', 1, { text: 'A' }, { text: 'Ab' }));
    now += TYPING_MS / 2;
    history.execute(new SetWidgetProps('7', 1, { text: 'Ab' }, { text: 'Abc' }));
    now += TYPING_MS * 2;
    history.execute(new SetWidgetProps('7', 1, { text: 'Abc' }, { text: 'Abcd' }));

    history.undo('7');
    expect(text()).toBe('Abc');
    history.undo('7');
    expect(text()).toBe('A');
    expect(history.undoLabel('7')).toBeNull();
  });

  it('records what a workflow change did, and undoes it as one step', () => {
    recordGraphChange(history, workflows, '7', 'Add action', () => workflows.addActionAfter('7', '20'));
    expect(nodes()).toHaveLength(2);
    expect(history.undoLabel('7')).toBe('Add action');

    history.undo('7');
    expect(nodes().map((n) => n.id)).toEqual(['20']);
    expect(workflows.getGraphForTab('7').connections).toEqual([]);

    history.redo('7');
    expect(nodes()).toHaveLength(2);
    expect(workflows.getGraphForTab('7').connections).toHaveLength(1);
    expect(queued.map((c) => c.op)).toEqual(['createNode', 'createEdge', 'deleteEdge', 'deleteNode', 'restoreNode', 'restoreEdge']);
  });

  it('records nothing when a workflow change changed nothing', () => {
    recordGraphChange(history, workflows, '7', 'Delete', () => workflows.deleteNode('7', 'missing'));
    expect(history.undoLabel('7')).toBeNull();
  });

  it('makes nudging a node one step, from where it was first', () => {
    const trigger = nodes()[0] as TriggerNode;
    const move = (x: number) => recordGraphChange(history, workflows, '7', 'Move node',
      () => workflows.updateNode('7', { ...trigger, position: { x, y: 0 } }));
    move(10);
    now += 200;
    move(20);

    history.undo('7');
    expect(nodes()[0].position.x).toBe(0);
    expect(history.undoLabel('7')).toBeNull();
  });

  it('inverts a diff: added things are removed and changed things go back', () => {
    const before = workflows.getGraphForTab('7');
    const after = { ...before, nodes: [{ ...before.nodes[0], position: { x: 5, y: 5 } }] };
    const inverse = new ChangeGraph('7', 'Move node', graphDiff(before, after)).invert() as ChangeGraph;
    expect(inverse.diff.changedNodes[0].after.position).toEqual({ x: 0, y: 0 });
  });
});
