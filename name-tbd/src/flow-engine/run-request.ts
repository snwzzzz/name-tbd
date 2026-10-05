import { FlowEngine, FlowFetch, RunLogEntry } from './engine';
import { StoredWorkflow, TriggerNode, graphOf } from './graph';
import { MemoryData, MemoryVariables, memoryHost } from './memory-host';
import { VariableDefinition } from './expressions/values';

// One run of a flow on the server: what the backend sends the sidecar (flow-engine/server), and
// what it answers. Pure, so the conformance fixtures run through exactly this code too.

/** A data source with its rows (values only). */
export interface DataSourceRows {
  id: number;
  name: string;
  columns: string[];
  rows: (string | null)[][];
}

export interface RunRequest {
  workflow: StoredWorkflow;
  /** The trigger node to start from; default: every page-load trigger. */
  triggerNodeId?: string | number;
  pageId?: string;
  variables?: {
    app?: VariableDefinition[];
    page?: VariableDefinition[];
    /** App variables' current values, instead of their initial ones. */
    values?: Record<string, unknown>;
  };
  data?: DataSourceRows[];
  /** More names for expressions (e.g. a webhook's payload as `body`). */
  scope?: Record<string, unknown>;
  /** Values the flow starts with (e.g. `event`). */
  locals?: Record<string, unknown>;
}

export interface RunResponse {
  /** Every step, as the run log has them. */
  log: RunLogEntry[];
  /** Each step as `<node id>:<port taken, or status>`, e.g. `3:true`. */
  steps: string[];
  variables: { app: Record<string, unknown>; page: Record<string, unknown> };
  data: DataSourceRows[];
}

/** A step as conformance fixtures write it. */
export const stepOf = (entry: RunLogEntry): string => `${entry.nodeId}:${entry.port ?? entry.status}`;

/** Runs the request's flow in memory; `fetch` makes the HTTP request action's calls. */
export async function runRequest(request: RunRequest, fetch?: FlowFetch): Promise<RunResponse> {
  const pageId = request.pageId ?? 'page';
  const variables = new MemoryVariables(request.variables?.app ?? [], { [pageId]: request.variables?.page ?? [] }, request.variables?.values ?? {});
  const data = new MemoryData(request.data ?? []);
  const host = memoryHost({ variables, data, fetch, scope: () => ({ ...request.scope }) });
  const graph = graphOf(request.workflow);
  const engine = new FlowEngine(host);

  const triggers = graph.nodes.filter((n): n is TriggerNode => n.type === 'Trigger' && (request.triggerNodeId !== undefined
    ? n.id === String(request.triggerNodeId)
    : (n.triggerType ?? 'page_load') === 'page_load' && !n.elementId));
  if (request.triggerNodeId !== undefined && !triggers.length) throw new Error(`There is no trigger ${request.triggerNodeId}`);

  const log: RunLogEntry[] = [];
  for (const trigger of triggers) {
    log.push(...(await engine.run(graph, trigger, { pageId, locals: request.locals })).entries);
  }
  const snapshot = variables.snapshot();
  return { log, steps: log.map(stepOf), variables: { app: snapshot.app, page: snapshot.pages[pageId] ?? {} }, data: data.snapshot() };
}
