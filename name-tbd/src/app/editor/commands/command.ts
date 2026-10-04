import { LayoutStateService } from '../../_services/layout-state.service';
import { WorkflowStateService } from '../../_services/workflow-state.service';
import { IdRegistry } from '../../_services/id-registry.service';
import { ComponentId, LayoutItem } from '../../_types/layout.types';
import { FlowConnection, FlowNode } from '../../_types/workflow.types';
import { WORKFLOW_NODE_ID_KINDS } from '../../core/catalog/id-references';
import { inputPortId, outputPortId } from '../../_utils/port.utils';

/** What commands change: the editor's state (which saves through the SaveQueue). */
export interface CommandContext {
  layout: LayoutStateService;
  workflows: WorkflowStateService;
  registry: IdRegistry;
}

/**
 * One undoable step of editing a page. `apply` makes the change (also again, for redo); `invert`
 * is the command that takes it back. Commands keep the ids things had when they were made; a new
 * thing saved since goes by its real id, so commands look ids up when they apply (see resolve…).
 */
export interface Command {
  /** For the Undo/Redo buttons, e.g. "Move" or "Delete 3 widgets". */
  readonly label: string;
  readonly pageId: string;
  apply(context: CommandContext): void;
  invert(): Command;
  /** This step and the next one as one step, if they belong together (e.g. moves during one drag); else null. */
  merge?(next: Command): Command | null;
}

/** Several commands as one step (they apply in order, and are taken back in reverse). */
export class CompositeCommand implements Command {
  constructor(
    readonly pageId: string,
    readonly commands: Command[],
    readonly label = commands[commands.length - 1]?.label ?? 'Change',
  ) {}

  apply(context: CommandContext): void {
    this.commands.forEach((command) => command.apply(context));
  }

  invert(): Command {
    return new CompositeCommand(this.pageId, [...this.commands].reverse().map((c) => c.invert()), this.label);
  }

  merge(next: Command): Command | null {
    const last = this.commands[this.commands.length - 1];
    const merged = last?.merge?.(next);
    const commands = merged ? [...this.commands.slice(0, -1), merged] : [...this.commands, next];
    // A Move that came along with an Add or Delete (containers resizing) doesn't name the step
    const named = this.commands.find((c) => !(c instanceof MoveLike)) ?? (next instanceof MoveLike ? null : next);
    return new CompositeCommand(this.pageId, commands, named?.label ?? this.label);
  }
}

/** Marks commands that only move things (a step gets its name from something else, if it has one). */
export abstract class MoveLike {}

// ---- Looking up ids that may have been saved since ----

export function resolveId(registry: IdRegistry, id: ComponentId): ComponentId;
export function resolveId(registry: IdRegistry, id: ComponentId | undefined): ComponentId | undefined;
export function resolveId(registry: IdRegistry, id: ComponentId | undefined): ComponentId | undefined {
  return id == null ? id : registry.resolve(id);
}

/** A widget (with what's inside it) under the ids its widgets have now. */
export function resolveItem(registry: IdRegistry, item: LayoutItem): LayoutItem {
  return {
    ...item,
    id: resolveId(registry, item.id),
    parentId: resolveId(registry, item.parentId),
    children: item.children?.map((child) => resolveItem(registry, child)),
  };
}

const resolveText = (registry: IdRegistry, id: string): string => String(registry.resolve(id));

/** A node under its id now, pointing at widgets by theirs. */
export function resolveNode(registry: IdRegistry, node: FlowNode): FlowNode {
  const swap = (values: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(values).map(([key, value]) =>
      [key, typeof value === 'string' && key in WORKFLOW_NODE_ID_KINDS ? resolveText(registry, value) : value]));
  const resolved = { ...swap(node as unknown as Record<string, unknown>), id: resolveText(registry, node.id) } as unknown as FlowNode;
  const config = (node as { config?: Record<string, unknown> }).config;
  return config ? ({ ...resolved, config: swap(config) } as unknown as FlowNode) : resolved;
}

/** A connection under its id and its nodes' ids now. */
export function resolveConnection(registry: IdRegistry, connection: FlowConnection): FlowConnection {
  const port = connection.fromPort.slice(connection.fromNode.length + 1);
  const fromNode = resolveText(registry, connection.fromNode);
  const toNode = resolveText(registry, connection.toNode);
  return { id: resolveText(registry, connection.id), fromNode, toNode, fromPort: outputPortId(fromNode, port), toPort: inputPortId(toNode) };
}
