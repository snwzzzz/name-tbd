import { GridItemHTMLElement, GridStack, GridStackNode } from 'gridstack';
import { ComponentId, GridGeometry, LayoutItem } from '../_types/layout.types';
import { newTemporaryId, toComponentId } from './component-id.utils';
import { RESIZABLE_WIDGET_TYPES, subGridOptions } from '../_constants/artboard.constants';

// Helpers for the canvas's GridStack grids. A widget's DOM element carries its type in
// `data-type` and its component id in `data-gs-id` (a temporary id until it's saved).

const SVG_NS = 'http://www.w3.org/2000/svg';

export const widgetType = (el: HTMLElement | undefined): string => el?.getAttribute('data-type') || 'unknown';

/** The component id of a grid node (numeric once saved). */
export const nodeId = (node: GridStackNode): ComponentId | undefined =>
  toComponentId(node.id || node.el?.getAttribute('data-gs-id'));

/** The component id of the container a node sits in (undefined in the root grid). */
export function parentIdOf(node: GridStackNode): ComponentId | undefined {
  const parent = node.grid?.parentGridNode;
  return parent ? nodeId(parent) : undefined;
}

export const geometryOf = (item: LayoutItem): GridGeometry => ({
  x: item.x || 0,
  y: item.y || 0,
  w: item.w || 100,
  h: item.h || 40,
  parentId: item.parentId,
});

export const sameGeometry = (a: GridGeometry, b: GridGeometry) =>
  a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h && a.parentId === b.parentId;

/** The DOM element GridStack turns into a grid item for a stored widget. */
export function createGridItemElement(item: LayoutItem): GridItemHTMLElement {
  const el = document.createElement('div');
  el.className = 'grid-stack-item';
  el.setAttribute('data-type', item.type || 'unknown');
  if (item.id != null) el.setAttribute('data-gs-id', item.id.toString());

  const content = document.createElement('div');
  content.className = 'grid-stack-item-content';
  el.appendChild(content);
  return el;
}

/** Add a stored widget to a grid (containers get a nested grid). Returns its content element. */
export function addStoredWidget(grid: GridStack, item: LayoutItem): { el: GridItemHTMLElement; content: HTMLElement } {
  const el = createGridItemElement(item);
  const content = el.querySelector<HTMLElement>('.grid-stack-item-content')!;
  const node: GridStackNode = {
    el,
    id: item.id?.toString(),
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    noResize: !RESIZABLE_WIDGET_TYPES.includes(item.type ?? ''),
  };
  grid.addWidget(node);
  if (item.type === 'container') {
    content.classList.add('container-widget');
    grid.makeSubGrid(el, subGridOptions(item.h ?? 1), undefined, false);
  }
  return { el, content };
}

/** The hover "×" that removes a widget from its grid. */
export function createRemoveButton(onRemove: () => void): HTMLElement {
  const button = document.createElement('div');
  button.className = 'widget-remove-btn';
  button.title = 'Remove';

  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [name, value] of Object.entries({
    width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  })) {
    svg.setAttribute(name, value);
  }
  for (const [x1, y1, x2, y2] of [[18, 6, 6, 18], [6, 6, 18, 18]]) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', String(x1));
    line.setAttribute('y1', String(y1));
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', String(y2));
    svg.appendChild(line);
  }
  button.appendChild(svg);

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    onRemove();
  });
  return button;
}

/** The layout tree of a grid's nodes (ids of unsaved widgets stay temporary strings). */
export function toLayoutItems(nodes: GridStackNode[], parentId?: ComponentId): LayoutItem[] {
  return nodes.map((node) => {
    const id = nodeId(node) ?? newTemporaryId();
    return {
      id,
      x: node.x ?? 0,
      y: node.y ?? 0,
      w: node.w ?? 2,
      h: node.h ?? 1,
      type: widgetType(node.el),
      parentId,
      children: node.subGrid ? toLayoutItems(node.subGrid.engine.nodes, id) : undefined,
    };
  });
}

/**
 * Keep every container at least as big as the widgets inside it, so it can't be resized
 * smaller than its content. Its own minimum (when empty) is remembered on the element.
 */
export function fitContainersToContent(nodes: GridStackNode[]): void {
  for (const node of nodes) {
    if (!node.subGrid || !node.grid || !node.el) continue;

    if (!node.el.hasAttribute('data-base-min-w')) {
      node.el.setAttribute('data-base-min-w', String(node.minW || 2));
      node.el.setAttribute('data-base-min-h', String(node.minH || 2));
    }
    const children = node.subGrid.engine.nodes;
    const minW = Math.max(Number(node.el.getAttribute('data-base-min-w')), ...children.map((c) => (c.x ?? 0) + (c.w || 1)));
    const minH = Math.max(Number(node.el.getAttribute('data-base-min-h')), ...children.map((c) => (c.y ?? 0) + (c.h || 1)));
    if (node.minW !== minW || node.minH !== minH) node.grid.update(node.el, { minW, minH });

    fitContainersToContent(children);
  }
}

/** A container's nested grid has exactly as many rows as the container is high. */
export function syncSubGridRows(node: GridStackNode, rows = node.h ?? 1): void {
  if (!node.subGrid) return;
  node.subGrid.opts.maxRow = rows;
  node.subGrid.opts.row = rows;
  node.subGrid.engine.maxRow = rows;
}

/**
 * After a widget was dropped into a container, grow the container so the widget fits at its
 * intended size (GridStack may have shrunk it to fit), then give the widget that size back.
 */
export function growContainerForDrop(node: GridStackNode): void {
  const container = node.grid?.parentGridNode;
  if (!node.el || !node.grid || !container?.grid || !container.el) return;

  // The size the widget was meant to have, from its gs-* attributes
  const attr = (name: string, fallback: number) => parseInt(node.el!.getAttribute(name) || String(fallback), 10);
  const w = attr('gs-w', node.w || 1);
  const minW = attr('gs-min-w', node.minW || w);
  const h = attr('gs-h', node.h || 1);
  const minH = attr('gs-min-h', node.minH || h);

  const neededW = Math.max(container.w || 1, (node.x ?? 0) + Math.max(w, minW));
  const neededH = Math.max(container.h || 1, (node.y ?? 0) + Math.max(h, minH));
  if (neededW <= (container.w || 1) && neededH <= (container.h || 1)) return;

  container.grid.update(container.el, { w: neededW, h: neededH });
  syncSubGridRows(container, neededH);
  node.grid.update(node.el, { w, minW, h, minH });
}
