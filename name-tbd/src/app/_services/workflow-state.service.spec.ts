import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { WorkflowStateService } from './workflow-state.service';
import { SaveQueue } from './save-queue.service';
import { IdRegistry } from './id-registry.service';
import { WorkflowControllerService } from '../api/services/workflowController.service';
import { PageControllerService } from '../api/services/pageController.service';
import { ChangeOperation } from '../api/models';
import { ActionNode, TriggerNode } from '../_types/workflow.types';
import { inputPortId, outputPortId } from '../_utils/port.utils';

describe('WorkflowStateService', () => {
  let queued: ChangeOperation[];
  let workflows: WorkflowStateService;
  let nextRef: number;

  beforeEach(() => {
    queued = [];
    nextRef = 1;
    TestBed.configureTestingModule({
      providers: [
        { provide: WorkflowControllerService, useValue: {} },
        { provide: PageControllerService, useValue: {} },
        { provide: SaveQueue, useValue: { enqueue: (change: ChangeOperation) => queued.push(change) } },
      ],
    });
    const registry = TestBed.inject(IdRegistry);
    vi.spyOn(registry, 'newRef').mockImplementation(() => `new_${nextRef++}`);
    workflows = TestBed.inject(WorkflowStateService);
    workflows.seedGraph('7', {
      workflowId: 9,
      nodes: [{ id: '20', type: 'Trigger', triggerType: 'element_click', elementId: '4', eventName: 'element_click', position: { x: 0, y: 0 } }],
      connections: [],
    });
  });

  it('adds an action after a node right away, saved as a node and its connection', async () => {
    const actionId = await firstValueFrom(workflows.addActionAfter('7', '20'));

    const graph = workflows.getGraphForTab('7');
    expect(actionId).toBe('new_1');
    expect(graph.nodes.map((n) => n.id)).toEqual(['20', 'new_1']);
    expect(graph.connections).toEqual([
      { id: 'new_2', fromNode: '20', toNode: 'new_1', fromPort: outputPortId('20', 'out'), toPort: inputPortId('new_1') },
    ]);
    expect(queued.map((c) => c.op)).toEqual(['createNode', 'createEdge']);
    expect(queued[1]).toEqual(expect.objectContaining({ ref: 'new_2', workflowId: 9, sourceId: 20, targetRef: 'new_1', sourcePort: 'out' }));
  });

  it('saves node edits and deletes through the queue', () => {
    const trigger = workflows.getGraphForTab('7').nodes[0] as TriggerNode;
    workflows.updateNode('7', { ...trigger, position: { x: 50, y: 0 } });
    workflows.deleteNode('7', '20');

    expect(queued).toEqual([
      expect.objectContaining({ op: 'updateNode', id: 20, x: 50, y: 0 }),
      { op: 'deleteNode', id: 20 },
    ]);
    expect(workflows.getGraphForTab('7').nodes).toEqual([]);
  });

  it('swaps temporary ids for saved ones: nodes, connections, their ports, and widgets nodes point at', async () => {
    await firstValueFrom(workflows.addActionForElement('7', 'new_w'));
    const graph = workflows.getGraphForTab('7');
    const trigger = graph.nodes.find((n) => n.type === 'Trigger' && (n as TriggerNode).elementId === 'new_w')!;
    const action = graph.nodes.find((n) => n.type === 'Action') as ActionNode;
    (action.config as unknown as Record<string, unknown>)['targetId'] = 'new_w';

    TestBed.inject(IdRegistry).record({ [trigger.id]: 30, [action.id]: 31, new_w: 40, [graph.connections[0].id]: 50 });

    const renamed = workflows.getGraphForTab('7');
    expect(renamed.nodes.map((n) => n.id)).toEqual(['20', '30', '31']);
    expect((renamed.nodes[1] as TriggerNode).elementId).toBe('40');
    expect(((renamed.nodes[2] as ActionNode).config as unknown as Record<string, unknown>)['targetId']).toBe('40');
    expect(renamed.connections).toEqual([
      { id: '50', fromNode: '30', toNode: '31', fromPort: outputPortId('30', 'out'), toPort: inputPortId('31') },
    ]);
  });
});
