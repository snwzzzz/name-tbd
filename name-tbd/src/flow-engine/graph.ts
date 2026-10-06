// The shape of a workflow as the engine runs it: nodes and the connections between their ports.
// The editor edits the same graphs (its types narrow `config`, see _types/workflow.types.ts), and
// the app definition converts the backend's nodes and edges into them (definitionGraph).

export interface Point {
  x: number;
  y: number;
}

export type FlowNodeType = 'Trigger' | 'Condition' | 'Action';

/**
 * What starts a flow: a widget event (`element_click` with `elementId` and `eventName`), the page
 * loading, a timer while the page is open, or a variable taking a new value.
 */
export type TriggerType = 'element_click' | 'page_load' | 'timer' | 'variable_change';

export interface FlowNodeBase {
  id: string;
  position: Point;
  type: FlowNodeType;
}

export interface TriggerNode extends FlowNodeBase {
  type: 'Trigger';
  triggerType: TriggerType;
  elementId?: string;
  eventName?: string;
  /** `timer`: how often it fires while the page is open. */
  intervalSeconds?: number;
  /** `variable_change`: the variable whose new value starts the flow. */
  variable?: string;
}

/** The comparison condition nodes stored before they took an expression (still read, see conditionExpression). */
export interface LegacyCondition {
  field: string;
  operator: string;
  value: string;
}

export interface ConditionNode extends FlowNodeBase {
  type: 'Condition';
  /** An expression that is true or false: the flow goes on through the `true` or the `false` port. */
  expression?: string;
  condition?: LegacyCondition;
}

export interface ActionNode<C extends object = object> extends FlowNodeBase {
  type: 'Action';
  actionType: string;
  config: C;
}

export type FlowNode<C extends object = object> = TriggerNode | ConditionNode | ActionNode<C>;

export interface FlowConnection {
  id: string;
  fromNode: string;
  toNode: string;
  fromPort: string;
  toPort: string;
}

export interface WorkflowGraph<C extends object = object> {
  nodes: FlowNode<C>[];
  connections: FlowConnection[];
}

/** A workflow as the backend stores and exports it: nodes with their props, edges between them. */
export interface StoredWorkflow {
  nodes: { id: number | string; type: string; x?: number | null; y?: number | null; props?: Record<string, unknown> | null }[];
  edges: { id: number | string; sourceNodeId: number | string; sourcePort?: string | null; targetNodeId: number | string }[];
}

/** A stored workflow as the engine (and the editor) runs it. */
export function graphOf(workflow: StoredWorkflow): WorkflowGraph {
  const nodes = workflow.nodes.map((n) => ({
    ...n.props,
    id: String(n.id),
    type: n.type === 'Trigger' || n.type === 'Condition' ? n.type : 'Action',
    position: { x: n.x ?? 0, y: n.y ?? 0 },
  }) as FlowNode);
  const connections = workflow.edges.map((e): FlowConnection => {
    const fromNode = String(e.sourceNodeId);
    const toNode = String(e.targetNodeId);
    return { id: String(e.id), fromNode, toNode, fromPort: outputPortId(fromNode, e.sourcePort ?? OUT_PORT), toPort: inputPortId(toNode) };
  });
  return { nodes, connections };
}

/** The port a node's flow leaves through when it has just one. */
export const OUT_PORT = 'out';

/** Output port ids are `${nodeId}-${port}`, input port ids `${nodeId}-in`. */
export const outputPortId = (nodeId: string, port: string) => `${nodeId}-${port}`;
export const inputPortId = (nodeId: string) => `${nodeId}-in`;

/** Node ids never contain '-' (they are DB ids), so the last '-' separates the port. */
export function splitPortId(portId: string): { nodeId: string; port: string } {
  const i = portId.lastIndexOf('-');
  return { nodeId: portId.slice(0, i), port: portId.slice(i + 1) };
}

/** The nodes connected to a node's output port, top to bottom as drawn. */
export function nextNodes<C extends object>(graph: WorkflowGraph<C>, nodeId: string, port: string): FlowNode<C>[] {
  const fromPort = outputPortId(nodeId, port);
  return graph.connections
    .filter((c) => c.fromPort === fromPort)
    .map((c) => graph.nodes.find((n) => n.id === c.toNode))
    .filter((n): n is FlowNode<C> => !!n)
    .sort((a, b) => a.position.y - b.position.y);
}

/** Whether anything is connected to the node's output port. */
export const hasNext = (graph: WorkflowGraph, nodeId: string, port: string): boolean =>
  graph.connections.some((c) => c.fromPort === outputPortId(nodeId, port));

const LEGACY_OPERATORS: Record<string, (field: string, value: string) => string> = {
  equals: (f, v) => `${f} == ${v}`,
  notEquals: (f, v) => `${f} != ${v}`,
  greaterThan: (f, v) => `${f} > ${v}`,
  lessThan: (f, v) => `${f} < ${v}`,
  contains: (f, v) => `string(${f}).contains(string(${v}))`,
  isTrue: (f) => `${f} == true`,
  isFalse: (f) => `${f} == false`,
};

/**
 * The expression a condition node tests. Nodes from before expressions stored a field, an operator
 * and a value: they're read as the matching expression (the value as a literal: a number or text).
 */
export function conditionExpression(node: ConditionNode): string {
  if (node.expression?.trim()) return node.expression;
  const legacy = node.condition;
  if (!legacy?.field?.trim()) return '';
  const value = legacy.value ?? '';
  const literal = value.trim() !== '' && !Number.isNaN(Number(value)) ? value.trim() : JSON.stringify(value);
  return (LEGACY_OPERATORS[legacy.operator] ?? LEGACY_OPERATORS['equals'])(legacy.field.trim(), literal);
}
