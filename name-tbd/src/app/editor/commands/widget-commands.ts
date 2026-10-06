import { ComponentId, LayoutItem } from '../../_types/layout.types';
import { FlowConnection, FlowNode } from '../../_types/workflow.types';
import { flattenTree } from '../../_utils/layout-tree.utils';
import {
  Command, CommandContext, MoveLike, resolveConnection, resolveId, resolveItem, resolveNode,
} from './command';

/** Where a widget is: position and size in cells, and its container (none: on the page). */
export interface WidgetPlace {
  id: ComponentId;
  x: number;
  y: number;
  w: number;
  h: number;
  parentId?: ComponentId;
}

/** E.g. "Delete widget", "Delete 3 widgets". */
const stepLabel = (verb: string, count: number) => (count === 1 ? `${verb} widget` : `${verb} ${count} widgets`);

/** Widgets moved or resized (also into or out of a container): one drag, "Center", a container growing. */
export class MoveWidgets extends MoveLike implements Command {
  readonly label = 'Move';

  constructor(
    readonly pageId: string,
    readonly before: WidgetPlace[],
    readonly after: WidgetPlace[],
  ) {
    super();
  }

  apply({ layout, registry }: CommandContext): void {
    layout.placeWidgets(this.pageId, this.after.map((place) => ({
      ...place,
      id: resolveId(registry, place.id),
      parentId: resolveId(registry, place.parentId),
    })));
  }

  invert(): Command {
    return new MoveWidgets(this.pageId, this.after, this.before);
  }

  /** Moves of the same drag: each widget from where it was first to where it is last. */
  merge(next: Command): Command | null {
    if (!(next instanceof MoveWidgets) || next.pageId !== this.pageId) return null;
    const key = (place: WidgetPlace) => String(place.id);
    const before = new Map(this.before.map((p) => [key(p), p]));
    next.before.forEach((p) => before.has(key(p)) || before.set(key(p), p));
    const after = new Map(this.after.map((p) => [key(p), p]));
    next.after.forEach((p) => after.set(key(p), p));
    return new MoveWidgets(this.pageId, [...before.values()], [...after.values()]);
  }
}

/**
 * Widgets added (dropped from the palette, pasted), with what's inside them and, for a paste, the
 * flows that came along. Applying it again (redo) brings the same widgets back, by their ids.
 */
export class AddWidgets implements Command {
  constructor(
    readonly pageId: string,
    readonly items: LayoutItem[],
    readonly nodes: FlowNode[] = [],
    readonly connections: FlowConnection[] = [],
    readonly label = stepLabel('Add', items.length),
  ) {}

  apply({ layout, workflows, registry }: CommandContext): void {
    layout.restoreWidgets(this.pageId, this.items.map((item) => resolveItem(registry, item)));
    if (this.nodes.length > 0) {
      workflows.restoreNodes(this.pageId,
        this.nodes.map((node) => resolveNode(registry, node)),
        this.connections.map((connection) => resolveConnection(registry, connection)));
    }
  }

  invert(): Command {
    return new DeleteWidgets(this.pageId, this.items, this.nodes, this.connections, this.label);
  }
}

/** Widgets deleted, with what's inside them (and, undoing a paste, its flows). Undo brings them back by their ids. */
export class DeleteWidgets implements Command {
  constructor(
    readonly pageId: string,
    readonly items: LayoutItem[],
    readonly nodes: FlowNode[] = [],
    readonly connections: FlowConnection[] = [],
    readonly label = stepLabel('Delete', items.length),
  ) {}

  apply({ layout, workflows, registry }: CommandContext): void {
    for (const node of this.nodes) workflows.deleteNode(this.pageId, String(registry.resolve(node.id)));
    layout.removeWidgets(this.pageId, this.items.map((item) => resolveId(registry, item.id!)));
  }

  invert(): Command {
    return new AddWidgets(this.pageId, this.items, this.nodes, this.connections, this.label);
  }

  /** Several widgets deleted at once (e.g. the selection): one step. */
  merge(next: Command): Command | null {
    if (!(next instanceof DeleteWidgets) || next.pageId !== this.pageId || next.nodes.length || this.nodes.length) return null;
    const inside = new Set(flattenTree(this.items).map((item) => String(item.id)));
    const items = [...this.items, ...next.items.filter((item) => !inside.has(String(item.id)))];
    return new DeleteWidgets(this.pageId, items, [], [], stepLabel('Delete', items.length));
  }
}
