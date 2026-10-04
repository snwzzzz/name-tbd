import { TestBed } from '@angular/core/testing';
import fc from 'fast-check';
import { HistoryService } from './history.service';
import { AddWidgets, DeleteWidgets, MoveWidgets } from './widget-commands';
import { SetWidgetProps } from './props-commands';
import { recordGraphChange } from './workflow-commands';
import { LayoutStateService } from '../../_services/layout-state.service';
import { WorkflowStateService } from '../../_services/workflow-state.service';
import { SaveQueue } from '../../_services/save-queue.service';
import { PageControllerService } from '../../api/services/pageController.service';
import { WorkflowControllerService } from '../../api/services/workflowController.service';
import { LayoutItem } from '../../_types/layout.types';
import { PageWorkflow, WorkflowGraph } from '../../_types/workflow.types';
import { flattenTree } from '../../_utils/layout-tree.utils';
import { newTemporaryId } from '../../_utils/component-id.utils';

const PAGE = '7';

/** A page with 50 widgets: 47 labels, and a container with two inside. */
function page(): LayoutItem[] {
  const labels: LayoutItem[] = Array.from({ length: 47 }, (_, i) => ({
    id: i + 1, type: 'label', x: (i % 8) * 6, y: Math.floor(i / 8) * 2, w: 6, h: 2, props: { text: `Label ${i + 1}` },
  }));
  const container: LayoutItem = {
    id: 48, type: 'container', x: 0, y: 20, w: 20, h: 10, props: {},
    children: [
      { id: 49, parentId: 48, type: 'label', x: 0, y: 0, w: 4, h: 1, props: { text: 'Inside' } },
      { id: 50, parentId: 48, type: 'button', x: 0, y: 2, w: 4, h: 1, props: { label: 'Go' } },
    ],
  };
  return [...labels, container];
}

/** Something the user does: `pick` chooses what it's done to, `gap` is the time since the last thing (merging, grouping). */
type Action = { kind: string; pick: number; a: number; b: number; text: string; gap: number };

const action = fc.record({
  kind: fc.constantFrom('move', 'props', 'delete', 'add', 'moveNode', 'editNode', 'addAction', 'deleteNode', 'disconnect'),
  pick: fc.nat(),
  a: fc.nat({ max: 40 }),
  b: fc.nat({ max: 40 }),
  text: fc.string({ maxLength: 6 }),
  gap: fc.constantFrom(10, 500, 5000),
});

/** Order doesn't matter (things come back where they belong, not at the same index). */
function normalLayout(items: LayoutItem[]): unknown {
  return [...items]
    .sort((x, y) => String(x.id).localeCompare(String(y.id)))
    .map(({ children, ...item }) => (children?.length ? { ...item, children: normalLayout(children) } : item));
}

function normalGraph(graph: WorkflowGraph): unknown {
  const byId = <T extends { id: string }>(list: T[]) => [...list].sort((x, y) => x.id.localeCompare(y.id));
  return { nodes: byId(graph.nodes), connections: byId(graph.connections) };
}

describe('Undo and redo (property): any edits, undone, give back the page as it was', () => {
  let now: number;

  beforeEach(() => vi.spyOn(Date, 'now').mockImplementation(() => now));
  afterEach(() => vi.restoreAllMocks());

  function setup() {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PageControllerService, useValue: {} },
        { provide: WorkflowControllerService, useValue: {} },
        { provide: SaveQueue, useValue: { enqueue: () => undefined } },
      ],
    });
    const layout = TestBed.inject(LayoutStateService);
    const workflows = TestBed.inject(WorkflowStateService);
    layout.saveLayout(PAGE, page());
    workflows.seedGraph(PAGE, {
      workflowId: 9,
      nodes: [
        { id: '100', type: 'Trigger', triggerType: 'element_click', elementId: '1', eventName: 'element_click', position: { x: 0, y: 0 } },
        { id: '101', type: 'Action', actionType: 'navigate', config: {}, position: { x: 300, y: 0 } },
      ],
      connections: [{ id: '200', fromNode: '100', toNode: '101', fromPort: '100-out', toPort: '101-in' }],
    } as PageWorkflow);
    return { layout, workflows, history: TestBed.inject(HistoryService) };
  }

  function perform(act: Action, { layout, workflows, history }: ReturnType<typeof setup>): void {
    now += act.gap;
    const items = flattenTree(layout.getLayout(PAGE));
    const item = items[act.pick % Math.max(items.length, 1)];
    const graph = workflows.getGraphForTab(PAGE);
    const node = graph.nodes[act.pick % Math.max(graph.nodes.length, 1)];
    const connection = graph.connections[act.pick % Math.max(graph.connections.length, 1)];
    const place = (it: LayoutItem) => ({ id: it.id!, x: it.x ?? 0, y: it.y ?? 0, w: it.w ?? 1, h: it.h ?? 1, parentId: it.parentId });

    switch (act.kind) {
      case 'move':
        if (item) history.execute(new MoveWidgets(PAGE, [place(item)], [{ ...place(item), x: act.a, y: act.b, w: 1 + (act.a % 8) }]));
        break;
      case 'props':
        if (item) history.execute(new SetWidgetProps(PAGE, item.id!, { ...item.props }, { ...item.props, text: act.text }));
        break;
      case 'delete':
        if (item) history.execute(new DeleteWidgets(PAGE, [structuredClone(item)]));
        break;
      case 'add':
        history.execute(new AddWidgets(PAGE, [{ id: newTemporaryId(), type: 'label', x: act.a, y: act.b, w: 2, h: 1, props: { text: act.text } }]));
        break;
      case 'moveNode':
        if (node) recordGraphChange(history, workflows, PAGE, 'Move node',
          () => workflows.updateNode(PAGE, { ...node, position: { x: act.a * 10, y: act.b * 10 } }));
        break;
      case 'editNode':
        if (node?.type === 'Action') recordGraphChange(history, workflows, PAGE, 'Edit node',
          () => workflows.updateNode(PAGE, { ...node, config: { ...node.config, text: act.text } as unknown as typeof node.config }));
        break;
      case 'addAction':
        if (node) recordGraphChange(history, workflows, PAGE, 'Add action', () => workflows.addActionAfter(PAGE, node.id));
        break;
      case 'deleteNode':
        if (node) recordGraphChange(history, workflows, PAGE, 'Delete node', () => workflows.deleteNode(PAGE, node.id));
        break;
      case 'disconnect':
        if (connection) recordGraphChange(history, workflows, PAGE, 'Delete connection', () => workflows.disconnect(PAGE, connection.id));
        break;
    }
  }

  it('undoes every step back to the start, and redoes them back to the end', () => {
    fc.assert(
      fc.property(fc.array(action, { minLength: 1, maxLength: 60 }), (actions) => {
        now = 1_000_000;
        const editor = setup();
        const { layout, workflows, history } = editor;
        const state = () => ({ layout: normalLayout(layout.getLayout(PAGE)), graph: normalGraph(workflows.getGraphForTab(PAGE)) });
        const start = state();

        actions.forEach((act) => perform(act, editor));
        const end = state();

        let steps = 0;
        while (history.undoLabel(PAGE) && steps++ < 200) history.undo(PAGE);
        expect(state()).toEqual(start);

        while (history.redoLabel(PAGE) && steps-- > 0) history.redo(PAGE);
        expect(state()).toEqual(end);
      }),
      { numRuns: 200 },
    );
  });
});
