import { LayoutItem } from '../../_types/layout.types';
import { FlowConnection, FlowNode, WorkflowGraph } from '../../_types/workflow.types';
import { inputPortId, outputPortId } from '../../_utils/port.utils';
import { DataSourceSnapshot } from '../ports/memory-app-data';

// An app as a whole, as the backend exports it (AppDefinitionService.java and its contributors) and the exported app
// runs it: pages with their widgets and workflows, and the data. Changes to its shape bump
// APP_DEFINITION_VERSION on both sides.

export const APP_DEFINITION_VERSION = 2;

export interface AppDefinition {
  version: number;
  app: { id: number; name: string };
  /** Identifies the exported data: data changes kept in a browser are only reused for the same data. */
  dataRevision: string;
  /** The page shown first (and for unknown addresses); null: the first page. */
  homePageId: number | null;
  pages: DefinitionPage[];
  dataSources: DataSourceSnapshot[];
}

export interface DefinitionPage {
  id: number;
  name: string;
  path: string;
  /** The layout page: its widgets are shown around every other page. */
  layout: boolean;
  contentHeight?: number;
  /** Placed widgets, containers with their children; props include their type's defaults. */
  components: LayoutItem[];
  workflow: DefinitionWorkflow;
}

/** A workflow as the backend stores it (nodes with their props, edges between them). */
export interface DefinitionWorkflow {
  nodes: { id: number; type: string; x?: number; y?: number; props?: Record<string, unknown> }[];
  edges: { id: number; sourceNodeId: number; sourcePort?: string; targetNodeId: number }[];
}

/** A page's workflow as the workflow runtime runs it (same as the editor's graphs). */
export function definitionGraph(workflow: DefinitionWorkflow): WorkflowGraph {
  const nodes = workflow.nodes.map((n) => ({
    ...n.props,
    id: String(n.id),
    type: n.type === 'Trigger' || n.type === 'Condition' ? n.type : 'Action',
    position: { x: n.x ?? 0, y: n.y ?? 0 },
  }) as FlowNode);
  const connections = workflow.edges.map((e): FlowConnection => {
    const fromNode = String(e.sourceNodeId);
    const toNode = String(e.targetNodeId);
    return { id: String(e.id), fromNode, toNode, fromPort: outputPortId(fromNode, e.sourcePort ?? 'out'), toPort: inputPortId(toNode) };
  });
  return { nodes, connections };
}
