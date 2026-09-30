import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { WorkflowRuntimeService } from './workflow-runtime.service';
import { WorkflowStateService } from './workflow-state.service';
import { LayoutStateService } from './layout-state.service';
import { AddRowHandler } from '../workflow-actions/table/add-row.handler';
import { DeleteRowsHandler } from '../workflow-actions/table/delete-rows.handler';
import { ActionOutcome, FlowNode, PageWorkflow } from '../_types/workflow.types';
import { CLICK_EVENT } from '../_constants/workflow.constants';
import { inputPortId, outputPortId } from '../_utils/port.utils';

const flush = () => new Promise((resolve) => setTimeout(resolve));

/** A click trigger on button 1 followed by the given actions, one after another. */
function chain(...actions: { actionType: string; config: object }[]): PageWorkflow {
  const nodes: FlowNode[] = [
    { id: 't', type: 'Trigger', triggerType: 'element_click', elementId: '1', eventName: CLICK_EVENT, position: { x: 0, y: 0 } },
    ...actions.map((a, i) => ({ id: `a${i}`, type: 'Action' as const, position: { x: 0, y: 0 }, ...a }) as FlowNode),
  ];
  const connections = nodes.slice(1).map((node, i) => ({
    id: `c${i}`,
    fromNode: nodes[i].id,
    toNode: node.id,
    fromPort: outputPortId(nodes[i].id, 'out'),
    toPort: inputPortId(node.id),
  }));
  return { workflowId: 1, nodes, connections };
}

describe('WorkflowRuntimeService', () => {
  let graph: PageWorkflow;
  let addOutcome: ActionOutcome;
  let ran: string[];
  let previewProps: unknown[][];

  beforeEach(() => {
    ran = [];
    previewProps = [];
    addOutcome = 'continue';
    TestBed.configureTestingModule({
      providers: [
        { provide: WorkflowStateService, useValue: { ensureGraph: () => of(graph) } },
        { provide: LayoutStateService, useValue: { previewItemProps: (...a: unknown[]) => previewProps.push(a) } },
        { provide: AddRowHandler, useValue: { run: async () => { ran.push('add'); return addOutcome; } } },
        { provide: DeleteRowsHandler, useValue: { run: async () => { ran.push('delete'); return 'continue'; } } },
      ],
    });
  });

  it('runs table operations, and the next action only when the one before continues the flow', async () => {
    const runtime = TestBed.inject(WorkflowRuntimeService);
    graph = chain(
      { actionType: 'table', config: { tableId: '7', operation: 'add_row' } },
      { actionType: 'table', config: { tableId: '7', operation: 'delete_rows' } },
    );

    runtime.handleEvent('p', '1');
    await flush();
    expect(ran).toEqual(['add', 'delete']);

    ran = [];
    addOutcome = 'stop';
    runtime.handleEvent('p', '1');
    await flush();
    expect(ran).toEqual(['add']);
  });

  it('still runs set_text through its handler, and undoes it on reset', async () => {
    const runtime = TestBed.inject(WorkflowRuntimeService);
    graph = chain({ actionType: 'set_text', config: { targetId: '2', text: 'Hi', resetEnabled: false, resetAfterSeconds: 1 } });

    runtime.handleEvent('p', '1');
    await flush();
    expect(previewProps).toEqual([['p', '2', { text: 'Hi' }]]);

    runtime.reset('p');
    expect(previewProps.at(-1)).toEqual(['p', '2', null]);
  });
});
