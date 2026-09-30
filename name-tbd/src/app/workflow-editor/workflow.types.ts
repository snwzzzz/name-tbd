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

/** Config of a `set_text` action: temporarily replaces a label's text. */
export interface SetTextConfig {
  targetId: string;          // id of the label on the page
  text: string;
  resetEnabled: boolean;     // restore the label's own text afterwards
  resetAfterSeconds: number;
}

export type FlowNode = TriggerNode | ConditionNode | ActionNode;

export interface FlowConnection {
  id: string;
  fromNode: string;
  toNode: string;
  fromPort: string;
  toPort: string;
}
