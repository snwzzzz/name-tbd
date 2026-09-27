export type FlowNodeType = 'Trigger' | 'Condition' | 'Action';

export interface FlowNodeBase {
  id: string;
  position: { x: number; y: number };
  type: FlowNodeType;
}

export interface TriggerNode extends FlowNodeBase {
  type: 'Trigger';
  triggerType: 'element_click' | 'page_load' | 'timer';
  elementId?: string; 
  eventName?: string;
}

export interface ConditionNode extends FlowNodeBase {
  type: 'Condition';
  condition: {
    field: string;
    operator: string;
    value: any;
  };
}

export interface ActionNode extends FlowNodeBase {
  type: 'Action';
  actionType: string;
  config: Record<string, any>;
}

export type FlowNode = TriggerNode | ConditionNode | ActionNode;

export interface FlowConnection {
  id: string;
  fromNode: string;
  toNode: string;
  fromPort: string;
  toPort: string;
}
