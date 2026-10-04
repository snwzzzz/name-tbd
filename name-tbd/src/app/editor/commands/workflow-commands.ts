import { Observable, isObservable } from 'rxjs';
import { FlowConnection, FlowNode, WorkflowGraph } from '../../_types/workflow.types';
import { WorkflowStateService } from '../../_services/workflow-state.service';
import { Command, CommandContext, resolveConnection, resolveNode } from './command';
import { HistoryService } from './history.service';
import { TYPING_MS } from './props-commands';

/** What a change did to a page's workflow graph. */
export interface GraphDiff {
  addedNodes: FlowNode[];
  removedNodes: FlowNode[];
  /** Nodes changed in place (moved, settings edited): before and after. */
  changedNodes: { before: FlowNode; after: FlowNode }[];
  addedConnections: FlowConnection[];
  removedConnections: FlowConnection[];
}

/** How the graph went from `before` to `after`. */
export function graphDiff(before: WorkflowGraph, after: WorkflowGraph): GraphDiff {
  const nodesBefore = new Map(before.nodes.map((n) => [n.id, n]));
  const nodesAfter = new Map(after.nodes.map((n) => [n.id, n]));
  const connectionsBefore = new Set(before.connections.map((c) => c.id));
  const connectionsAfter = new Set(after.connections.map((c) => c.id));
  return {
    addedNodes: after.nodes.filter((n) => !nodesBefore.has(n.id)),
    removedNodes: before.nodes.filter((n) => !nodesAfter.has(n.id)),
    changedNodes: after.nodes
      .filter((n) => nodesBefore.has(n.id) && JSON.stringify(nodesBefore.get(n.id)) !== JSON.stringify(n))
      .map((n) => ({ before: nodesBefore.get(n.id)!, after: n })),
    addedConnections: after.connections.filter((c) => !connectionsBefore.has(c.id)),
    removedConnections: before.connections.filter((c) => !connectionsAfter.has(c.id)),
  };
}

const isEmpty = (d: GraphDiff) =>
  !d.addedNodes.length && !d.removedNodes.length && !d.changedNodes.length && !d.addedConnections.length && !d.removedConnections.length;

/**
 * A change to a page's workflow (adding, moving, editing or deleting nodes; connecting them). Things
 * removed are deleted softly, so undo brings them back with the same ids; redo of an add does too.
 */
export class ChangeGraph implements Command {
  readonly mergeWindowMs: number | undefined;

  constructor(
    readonly pageId: string,
    readonly label: string,
    readonly diff: GraphDiff,
  ) {
    // Typing into a node's settings, or nudging it: one step
    this.mergeWindowMs = onlyChanges(diff) ? TYPING_MS : undefined;
  }

  apply({ workflows, registry }: CommandContext): void {
    const d = this.diff;
    for (const c of d.removedConnections) workflows.disconnect(this.pageId, resolveConnection(registry, c).id);
    for (const n of d.removedNodes) workflows.deleteNode(this.pageId, resolveNode(registry, n).id);
    for (const { after } of d.changedNodes) workflows.updateNode(this.pageId, resolveNode(registry, after));
    if (d.addedNodes.length || d.addedConnections.length) {
      workflows.restoreNodes(this.pageId,
        d.addedNodes.map((n) => resolveNode(registry, n)),
        d.addedConnections.map((c) => resolveConnection(registry, c)));
    }
  }

  invert(): Command {
    const d = this.diff;
    return new ChangeGraph(this.pageId, this.label, {
      addedNodes: d.removedNodes,
      removedNodes: d.addedNodes,
      changedNodes: d.changedNodes.map(({ before, after }) => ({ before: after, after: before })),
      addedConnections: d.removedConnections,
      removedConnections: d.addedConnections,
    });
  }

  /** Edits to the same nodes one after another (typing, nudging): one step. */
  merge(next: Command): Command | null {
    if (!(next instanceof ChangeGraph) || next.pageId !== this.pageId || !onlyChanges(this.diff) || !onlyChanges(next.diff)) return null;
    const ids = (d: GraphDiff) => d.changedNodes.map((c) => c.after.id).sort().join();
    if (ids(this.diff) !== ids(next.diff)) return null;
    return new ChangeGraph(this.pageId, this.label, {
      ...this.diff,
      changedNodes: this.diff.changedNodes.map((c) => ({
        before: c.before,
        after: next.diff.changedNodes.find((n) => n.after.id === c.after.id)!.after,
      })),
    });
  }
}

function onlyChanges(d: GraphDiff): boolean {
  return d.changedNodes.length > 0 && !d.addedNodes.length && !d.removedNodes.length
    && !d.addedConnections.length && !d.removedConnections.length;
}

/**
 * Runs a change to a page's workflow and records what it did as one undoable step (also when the
 * change finishes later, as an Observable).
 */
export function recordGraphChange(
  history: HistoryService,
  workflows: WorkflowStateService,
  pageId: string,
  label: string,
  change: () => Observable<unknown> | void,
): void {
  const before = structuredClone(workflows.getGraphForTab(pageId));
  const done = () => {
    const diff = graphDiff(before, structuredClone(workflows.getGraphForTab(pageId)));
    if (!isEmpty(diff)) history.record(new ChangeGraph(pageId, label, diff));
  };
  const result = change();
  if (isObservable(result)) result.subscribe({ complete: done, error: (err) => console.error(`Failed: ${label}`, err) });
  else done();
}
