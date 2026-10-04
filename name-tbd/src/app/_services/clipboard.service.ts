import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LayoutStateService } from './layout-state.service';
import { WorkflowStateService } from './workflow-state.service';
import { IdRegistry } from './id-registry.service';
import { GRID_COLUMNS, GRID_ROWS } from '../_constants/artboard.constants';
import { TRIGGER_SPACING_Y } from '../_constants/workflow.constants';
import { ComponentId, LayoutItem, WidgetProps } from '../_types/layout.types';
import { ActionConfig, ActionNode, FlowConnection, FlowNode, NewFlowNode } from '../_types/workflow.types';
import { findInTree } from '../_utils/layout-tree.utils';
import { splitPortId } from '../_utils/port.utils';
import { findFreeSpot } from '../_utils/placement.utils';
import { toComponentId } from '../_utils/component-id.utils';
import { workflowKeysOf } from '../core/catalog/id-references';

/** A copied widget: what it is, where it was and its props, with its children (containers). */
interface CopiedWidget {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  parentId?: string;
  props: WidgetProps;
  children: CopiedWidget[];
}

/** The flows the copied widgets start: their triggers and everything after them. */
interface CopiedFlows {
  nodes: FlowNode[];
  connections: { from: string; port: string; to: string }[];
}

/** Node settings that point at a widget (shared/id-references.json): a copied node points at the widget's copy, when it was copied along. */
const WIDGET_REFERENCES = workflowKeysOf('widget');

/** What a paste created (to select it, and to undo it), or that there was no room. */
export type PasteResult =
  | { ids: string[]; items: LayoutItem[]; nodes: FlowNode[]; connections: FlowConnection[] }
  | { noRoom: true };

/**
 * The canvas's copy and paste: copies widgets with their current props (unsaved edits included),
 * containers with what's inside, and the flows the widgets start. Pastes them as new widgets onto
 * any page, in the nearest free place (nothing there is moved), with their flows.
 */
@Injectable({ providedIn: 'root' })
export class ClipboardService {
  private readonly layoutState = inject(LayoutStateService);
  private readonly workflows = inject(WorkflowStateService);
  private readonly registry = inject(IdRegistry);

  private copied: { pageId: string; widgets: CopiedWidget[]; flows: Promise<CopiedFlows> } | null = null;
  readonly hasContent = signal(false);

  /** Copies these widgets of the page (a widget inside a copied container comes along with it), and their flows. Returns how many. */
  copy(pageId: string, ids: string[]): number {
    const layout = this.layoutState.getLayout(pageId);
    const items = ids.map((id) => findInTree(layout, id)).filter((item): item is LayoutItem => !!item);
    const chosen = new Set(items.map((item) => String(item.id)));
    const insideChosen = (item: LayoutItem): boolean => {
      for (let parent = item.parentId; parent != null; parent = findInTree(layout, parent)?.parentId) {
        if (chosen.has(String(parent))) return true;
      }
      return false;
    };
    const widgets = items.filter((item) => !insideChosen(item)).map(toCopy);
    if (widgets.length === 0) return 0;

    const allIds = new Set(widgets.flatMap(idsOf));
    this.copied = { pageId, widgets, flows: this.copyFlows(pageId, allIds) };
    this.hasContent.set(true);
    return widgets.length;
  }

  /**
   * Creates the copied widgets on the page, in the nearest place where they fit without covering
   * anything (keeping how they sit to each other, inside the page or their container), with their
   * flows. They show right away and are saved with the next batch. Creates nothing when there's no
   * such place.
   */
  async paste(pageId: string): Promise<PasteResult> {
    if (!this.copied) return { ids: [], items: [], nodes: [], connections: [] };
    const { widgets } = this.copied;
    const layout = this.layoutState.getLayout(pageId);

    // Where each group of copies goes: into its container again (same page, if it's there), else onto the page
    const groups = new Map<string, { parent: LayoutItem | null; widgets: CopiedWidget[] }>();
    for (const widget of widgets) {
      const parent = widget.parentId && pageId === this.copied.pageId ? findInTree(layout, widget.parentId) : null;
      const key = parent ? String(parent.id) : '';
      groups.set(key, { parent, widgets: [...(groups.get(key)?.widgets ?? []), widget] });
    }
    const placed: { widget: CopiedWidget; parentId?: string }[] = [];
    for (const { parent, widgets: group } of groups.values()) {
      const room = parent ? { w: parent.w ?? 1, h: parent.h ?? 1 } : { w: GRID_COLUMNS, h: GRID_ROWS };
      const occupied = (parent ? parent.children ?? [] : layout).map(rectOf);
      const spot = findFreeSpot(group.map(rectOf), occupied, room);
      if (!spot) return { noRoom: true };
      for (const widget of group) {
        placed.push({ widget: { ...widget, x: widget.x + spot.dx, y: widget.y + spot.dy }, parentId: parent?.id != null ? String(parent.id) : undefined });
      }
    }

    const copies = new Map<string, string>();
    const items = placed.map(({ widget, parentId }) => this.newItem(widget, toComponentId(parentId), copies));
    this.layoutState.addWidgets(pageId, items);

    const flows = await this.pasteFlows(pageId, await this.copied.flows, copies);
    return { ids: items.map((item) => String(item.id)), items: structuredClone(items), ...flows };
  }

  /** A new widget (temporary id) copying this one, with copies of its children; remembers each original's copy. */
  private newItem(widget: CopiedWidget, parentId: ComponentId | undefined, copies: Map<string, string>): LayoutItem {
    const id = this.registry.newRef();
    copies.set(widget.id, id);
    const { type, x, y, w, h, props } = widget;
    return { id, parentId, type, x, y, w, h, props: { ...props }, children: widget.children.map((child) => this.newItem(child, id, copies)) };
  }

  /** The flows started by these widgets' triggers: the triggers and every node they lead to. */
  private async copyFlows(pageId: string, widgetIds: Set<string>): Promise<CopiedFlows> {
    try {
      const graph = await firstValueFrom(this.workflows.ensureGraph(pageId));
      const reached = new Set(graph.nodes.filter((n) => n.type === 'Trigger' && n.elementId && widgetIds.has(n.elementId)).map((n) => n.id));
      for (let grew = true; grew; ) {
        grew = false;
        for (const c of graph.connections) {
          if (reached.has(c.fromNode) && !reached.has(c.toNode)) {
            reached.add(c.toNode);
            grew = true;
          }
        }
      }
      return {
        nodes: graph.nodes.filter((n) => reached.has(n.id)).map((n) => structuredClone(n)),
        connections: graph.connections
          .filter((c) => reached.has(c.fromNode) && reached.has(c.toNode))
          .map((c) => ({ from: c.fromNode, port: splitPortId(c.fromPort).port, to: c.toNode })),
      };
    } catch (err) {
      console.error('Failed to copy the widgets\' flows', err);
      return { nodes: [], connections: [] };
    }
  }

  /** The copied flows on the page, below its own, pointing at the copies. */
  private async pasteFlows(pageId: string, flows: CopiedFlows, copies: Map<string, string>): Promise<{ nodes: FlowNode[]; connections: FlowConnection[] }> {
    const created = { nodes: [] as FlowNode[], connections: [] as FlowConnection[] };
    if (flows.nodes.length === 0) return created;
    const graph = await firstValueFrom(this.workflows.ensureGraph(pageId));
    const bottom = graph.nodes.length ? Math.max(...graph.nodes.map((n) => n.position.y)) + TRIGGER_SPACING_Y : null;
    const top = Math.min(...flows.nodes.map((n) => n.position.y));
    const shiftY = bottom === null ? 0 : bottom - top;

    const nodeCopies = new Map<string, string>();
    for (const node of flows.nodes) {
      const { id, ...rest } = this.repoint(node, pageId, copies);
      const copy = await firstValueFrom(this.workflows.addNode(pageId, { ...rest, position: { x: node.position.x, y: node.position.y + shiftY } } as NewFlowNode));
      nodeCopies.set(id, copy.id);
      created.nodes.push(copy);
    }
    for (const { from, port, to } of flows.connections) {
      const [a, b] = [nodeCopies.get(from), nodeCopies.get(to)];
      const connection = a && b ? await firstValueFrom(this.workflows.addConnection(pageId, a, port, b)) : null;
      if (connection) created.connections.push(connection);
    }
    return created;
  }

  /** A copied node pointing at the copies of the widgets it pointed at (when they were copied along). */
  private repoint(node: FlowNode, pageId: string, copies: Map<string, string>): FlowNode {
    const repointed = repointWidgets(node as unknown as Record<string, unknown>, copies) as unknown as FlowNode;
    if (node.type !== 'Action') return repointed;
    const config = repointWidgets({ ...(node as ActionNode).config } as Record<string, unknown>, copies);
    // A copied detail section is on this page now
    if (typeof config['detailId'] === 'string' && [...copies.values()].includes(config['detailId'] as string)) config['detailPageId'] = pageId;
    return { ...repointed, config: config as unknown as ActionConfig } as ActionNode;
  }
}

/** The settings that point at copied widgets, pointing at the copies instead. */
function repointWidgets(settings: Record<string, unknown>, copies: Map<string, string>): Record<string, unknown> {
  const result = { ...settings };
  for (const key of WIDGET_REFERENCES) {
    const copy = typeof result[key] === 'string' ? copies.get(result[key] as string) : undefined;
    if (copy) result[key] = copy;
  }
  return result;
}

const rectOf = (item: { x?: number; y?: number; w?: number; h?: number }) => ({ x: item.x ?? 0, y: item.y ?? 0, w: item.w ?? 1, h: item.h ?? 1 });

const idsOf = (widget: CopiedWidget): string[] => [widget.id, ...widget.children.flatMap(idsOf)];

function toCopy(item: LayoutItem): CopiedWidget {
  return {
    id: String(item.id),
    type: item.type ?? 'unknown',
    x: item.x ?? 0,
    y: item.y ?? 0,
    w: item.w ?? 1,
    h: item.h ?? 1,
    parentId: item.parentId != null ? String(item.parentId) : undefined,
    props: { ...item.props },
    children: (item.children ?? []).map(toCopy),
  };
}
