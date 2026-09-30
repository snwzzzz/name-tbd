import { toApiProps, toFlowNode, toNodeProps } from './api-mapper.utils';
import { ActionNode } from '../_types/workflow.types';

describe('api mapper', () => {
  it('stores everything but id, type and position in the node props, and reads it back', () => {
    const node: ActionNode = {
      id: '5',
      type: 'Action',
      position: { x: 1, y: 2 },
      actionType: 'set_text',
      config: { targetId: '9', text: 'Hi', resetEnabled: true, resetAfterSeconds: 3 },
    };
    const props = toNodeProps(node);
    expect(props).toEqual({ actionType: 'set_text', config: node.config });

    const restored = toFlowNode({ id: 5, type: 'Action', x: 1, y: 2, props: toApiProps(props) });
    expect(restored).toEqual(node);
  });
});
