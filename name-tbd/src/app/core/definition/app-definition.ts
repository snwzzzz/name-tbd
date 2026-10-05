import { LayoutItem } from '../../_types/layout.types';
import { WorkflowGraph } from '../../_types/workflow.types';
import { DataSourceSnapshot } from '../ports/memory-app-data';
import { StoredWorkflow, VariableDefinition, graphOf } from '../../../flow-engine';
import { AppTheme } from '../rendering/app-theme';

// An app as a whole, as the backend exports it (AppDefinitionService.java and its contributors) and the exported app
// runs it: pages with their widgets and workflows, and the data. Changes to its shape bump
// APP_DEFINITION_VERSION on both sides.

export const APP_DEFINITION_VERSION = 3;

export interface AppDefinition {
  version: number;
  app: { id: number; name: string };
  /** Identifies the exported data: data changes kept in a browser are only reused for the same data. */
  dataRevision: string;
  /** The page shown first (and for unknown addresses); null: the first page. */
  homePageId: number | null;
  pages: DefinitionPage[];
  dataSources: DataSourceSnapshot[];
  /** The app-wide theme (null or missing: the default preset); exports before themes have none. */
  theme?: AppTheme | null;
  /** The app's variables (exports before variables have none). */
  variables?: VariableDefinition[];
}

export interface DefinitionPage {
  id: number;
  name: string;
  path: string;
  /** The layout page: its widgets are shown around every other page. */
  layout: boolean;
  /** Placed widgets, containers with their children; props include their type's defaults. */
  components: LayoutItem[];
  workflow: DefinitionWorkflow;
  /** The page's own variables (exports before variables have none). */
  variables?: VariableDefinition[];
}

/** A workflow as the backend stores it (nodes with their props, edges between them). */
export type DefinitionWorkflow = StoredWorkflow;

/** A page's workflow as the workflow runtime runs it (same as the editor's graphs). */
export function definitionGraph(workflow: DefinitionWorkflow): WorkflowGraph {
  return graphOf(workflow) as WorkflowGraph;
}
