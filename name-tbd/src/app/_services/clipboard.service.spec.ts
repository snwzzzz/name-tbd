import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ClipboardService } from './clipboard.service';
import { LayoutStateService } from './layout-state.service';
import { WorkflowStateService } from './workflow-state.service';
import { LayoutItem } from '../_types/layout.types';
import { FlowNode, NewFlowNode, PageWorkflow } from '../_types/workflow.types';
import { outputPortId, inputPortId } from '../_utils/port.utils';

const LAYOUT: LayoutItem[] = [
  { id: 1, type: 'button', x: 0, y: 0, w: 7, h: 3, props: { label: 'Save' } },
  { id: 4, type: 'button', x: 10, y: 0, w: 7, h: 3, props: { label: 'Load' } },
  { id: 5, type: 'label', x: 30, y: 0, w: 8, h: 3, props: { text: 'Status' } },
  {
    id: 2, type: 'container', x: 0, y: 10, w: 16, h: 9, props: { background: '#eeeeee' },
    children: [{ id: 3, parentId: 2, type: 'label', x: 1, y: 1, w: 8, h: 3, props: { text: 'Hi' } }],
  },
];

/** Button 1 → "change text of label 5", button 4 → "change text of label 3"; an unrelated page-load flow. */
const GRAPH: PageWorkflow = {
  workflowId: 9,
  nodes: [
    { id: 'n1', type: 'Trigger', triggerType: 'element_click', elementId: '1', eventName: 'element_click', position: { x: 0, y: 0 } },
    { id: 'n2', type: 'Action', actionType: 'set_text', config: { targetId: '5', text: 'Saved', resetEnabled: false, resetAfterSeconds: 5 }, position: { x: 300, y: 0 } },
    { id: 'n3', type: 'Trigger', triggerType: 'element_click', elementId: '4', eventName: 'element_click', position: { x: 0, y: 200 } },
    { id: 'n4', type: 'Action', actionType: 'set_text', config: { targetId: '3', text: 'Loaded', resetEnabled: false, resetAfterSeconds: 5 }, position: { x: 300, y: 200 } },
    { id: 'n5', type: 'Trigger', triggerType: 'page_load', position: { x: 0, y: 400 } },
  ] as FlowNode[],
  connections: [
    { id: 'c1', fromNode: 'n1', toNode: 'n2', fromPort: outputPortId('n1', 'out'), toPort: inputPortId('n2') },
    { id: 'c2', fromNode: 'n3', toNode: 'n4', fromPort: outputPortId('n3', 'out'), toPort: inputPortId('n4') },
  ],
};

describe('ClipboardService', () => {
  let created: LayoutItem[];
  let nodes: NewFlowNode[];
  let connections: string[][];

  const setup = (layout: LayoutItem[] = LAYOUT) => {
    created = [];
    nodes = [];
    connections = [];
    let nextId = 100;
    let nextNode = 1;
    TestBed.configureTestingModule({
      providers: [
        {
          provide: LayoutStateService,
          useValue: {
            getLayout: () => layout,
            addComponent: (_page: string, item: LayoutItem) => {
              created.push(item);
              return of({ id: nextId++ });
            },
            refreshLayout: () => of([]),
          },
        },
        {
          provide: WorkflowStateService,
          useValue: {
            ensureGraph: () => of(GRAPH),
            addNode: (_page: string, node: NewFlowNode) => {
              nodes.push(node);
              return of({ ...node, id: `new${nextNode++}` });
            },
            addConnection: (_page: string, from: string, port: string, to: string) => {
              connections.push([from, port, to]);
              return of(null);
            },
          },
        },
      ],
    });
    return TestBed.inject(ClipboardService);
  };

  it('pastes copies with their props in the nearest free place, containers with their children', async () => {
    const clipboard = setup();
    expect(clipboard.copy('p', ['3', '2'])).toBe(1); // the label comes along with its container, once

    const result = await clipboard.paste('p');

    expect(result).toEqual({ ids: ['100'] });
    expect(created).toEqual([
      // Right below the original container (nothing there), the original isn't touched
      { type: 'container', x: 0, y: 19, w: 16, h: 9, props: { background: '#eeeeee' }, parentId: undefined },
      { type: 'label', x: 1, y: 1, w: 8, h: 3, props: { text: 'Hi' }, parentId: '100' },
    ]);
  });

  it('copies several widgets at once with their flows, each pointing at the copies', async () => {
    const clipboard = setup();
    clipboard.copy('p', ['1', '4']);

    await clipboard.paste('p');

    // Both buttons, kept side by side, right below the originals
    expect(created.map((c) => [c.type, c.x, c.y])).toEqual([['button', 0, 3], ['button', 10, 3]]);
    // Their two flows (not the page-load one), below the page's own nodes
    expect(nodes.map((n) => n.type)).toEqual(['Trigger', 'Action', 'Trigger', 'Action']);
    expect(nodes.map((n) => n.position.y)).toEqual([620, 620, 820, 820]);
    const [trigger1, action1, trigger2] = nodes as unknown as Record<string, unknown>[];
    expect(trigger1['elementId']).toBe('100');
    expect(trigger2['elementId']).toBe('101');
    // The label it changes wasn't copied: still the original
    expect((action1['config'] as Record<string, unknown>)['targetId']).toBe('5');
    expect(connections).toEqual([['new1', 'out', 'new2'], ['new3', 'out', 'new4']]);
  });

  it('points a copied action at the copy of a widget copied along', async () => {
    const clipboard = setup();
    clipboard.copy('p', ['4', '2']); // button 4 changes label 3, inside container 2
    await clipboard.paste('p');
    const action = nodes.find((n) => n.type === 'Action') as unknown as { config: Record<string, unknown> };
    expect(action.config['targetId']).toBe('102'); // the copy of label 3
  });

  it('creates nothing when there is no free place, instead of stacking copies on top', async () => {
    const full: LayoutItem[] = [{ id: 1, type: 'container', x: 0, y: 0, w: 128, h: 40, props: {} }, { id: 2, type: 'table', x: 0, y: 40, w: 128, h: 23, props: {} }];
    const clipboard = setup(full);
    clipboard.copy('p', ['2']);

    expect(await clipboard.paste('p')).toEqual({ noRoom: true });
    expect(created).toEqual([]);
    expect(nodes).toEqual([]);
  });
});
