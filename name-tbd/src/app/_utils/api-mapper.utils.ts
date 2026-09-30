import { EdgeDto, NodeDto, UiComponentDto } from '../api/models';
import { ComponentId, LayoutItem, WidgetProps } from '../_types/layout.types';
import { FlowConnection, FlowNode, NewFlowNode, NodeProps } from '../_types/workflow.types';
import { inputPortId, outputPortId } from './port.utils';

// The generated API types declare props as `Record<string, Record<string, unknown>>`, although
// the backend stores any JSON value per key. These helpers are the one place that converts.

/** Props in the shape the generated API client expects. */
export const toApiProps = (props: WidgetProps | NodeProps): UiComponentDto['props'] =>
  props as UiComponentDto['props'];

export function toLayoutItem(dto: UiComponentDto): LayoutItem {
  return {
    id: dto.id,
    parentId: dto.parentId,
    type: dto.type,
    props: dto.props,
    x: dto.x,
    y: dto.y,
    w: dto.w,
    h: dto.h,
  };
}

/** The API's parent id: -1 moves a component back to the page's root grid. */
export const toApiParentId = (parentId: ComponentId | undefined): number =>
  typeof parentId === 'number' ? parentId : -1;

const NODE_OWN_FIELDS = ['id', 'type', 'position'];

/** Everything except id/type/position is stored in the node's `props`. */
export function toNodeProps(node: NewFlowNode | FlowNode): NodeProps {
  return Object.fromEntries(Object.entries(node).filter(([key]) => !NODE_OWN_FIELDS.includes(key)));
}

/** A node as the editor uses it; its fields besides id/type/position come from the stored props. */
export function toFlowNode(dto: NodeDto): FlowNode {
  return {
    ...dto.props,
    id: dto.id!.toString(),
    type: dto.type === 'Trigger' || dto.type === 'Condition' ? dto.type : 'Action',
    position: { x: dto.x ?? 100, y: dto.y ?? 100 },
  } as FlowNode;
}

export function toConnection(dto: EdgeDto): FlowConnection {
  const fromNode = dto.sourceNodeId!.toString();
  const toNode = dto.targetNodeId!.toString();
  return {
    id: dto.id!.toString(),
    fromNode,
    toNode,
    fromPort: outputPortId(fromNode, dto.sourcePort ?? 'out'),
    toPort: inputPortId(toNode),
  };
}
