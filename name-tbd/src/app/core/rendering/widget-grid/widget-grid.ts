import { Component, computed, inject, input } from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { CELL_SIZE, GRID_COLUMNS, WIDGET_MARGIN, pageRows } from '../../../_constants/artboard.constants';
import { LayoutItem } from '../../../_types/layout.types';
import { containerFrame, isContainer, isFlushType, widgetComponent, widgetProps } from '../widget-components';
import { containerClass, inFlow, innerRows, isOverlayType, visibleChildren } from '../containers';
import { headerRowsOf } from '../../catalog/widget-catalog';
import { ActiveTabsService } from '../../services/active-tabs.service';
import { ModalStateService } from '../../services/modal-state.service';
import { APP_SESSION } from '../../ports/app-ports';
import { propBool, propText } from '../../../_utils/widget-props.utils';

/**
 * Placed widgets drawn in their grid cells (the artboard's, like the canvas), with
 * containers as nested grids. Draws the exported app's pages and the editor's layout overlay.
 * A container's frame (tab bar, title bar) is drawn over it, its nested grid below its header rows;
 * a tabs widget shows the widgets of its active tab, and a modal dialog shows over the page only
 * while it's open.
 */
@Component({
  selector: 'app-widget-grid',
  imports: [NgComponentOutlet, NgTemplateOutlet],
  templateUrl: './widget-grid.html',
  styleUrl: './widget-grid.scss',
})
export class WidgetGrid {
  private readonly tabs = inject(ActiveTabsService);
  readonly modals = inject(ModalStateService);
  // Optional: the editor's layout overlay only shows widgets (it runs nothing itself)
  private readonly session = inject(APP_SESSION, { optional: true });

  readonly items = input.required<LayoutItem[]>();
  /** The page's height in rows (default: one screen, or down to its lowest widget). */
  readonly rows = input<number | undefined>(undefined);

  readonly columns = GRID_COLUMNS;
  readonly rootRows = computed(() => this.rows() ?? pageRows(inFlow(this.items())));
  readonly cellSize = CELL_SIZE;
  /** GridStack's margin in the root grid (nested grids have none). */
  readonly margin = WIDGET_MARGIN;

  readonly isContainer = isContainer;
  readonly isFlush = isFlushType;
  readonly isOverlay = isOverlayType;
  readonly frame = containerFrame;
  readonly innerRows = innerRows;
  readonly component = (item: LayoutItem) => widgetComponent(item.type);
  readonly props = widgetProps;

  /** A container's background color (null: none). */
  background(item: LayoutItem): string | null {
    return propText(item.props, 'background') ?? null;
  }

  containerClass(item: LayoutItem): string {
    return containerClass(item.props);
  }

  /** The px a container's header takes above its nested grid. */
  headerHeight(item: LayoutItem): number {
    return headerRowsOf(item.type) * CELL_SIZE;
  }

  children(item: LayoutItem): LayoutItem[] {
    return visibleChildren(item, this.tabs.active(this.key(item)));
  }

  /** Whether a modal dialog shows (over the page): only while the app runs and it's open. */
  isOpen(item: LayoutItem): boolean {
    return !!this.session?.live() && this.modals.isOpen(this.key(item));
  }

  closeOnBackdrop(item: LayoutItem): void {
    if (propBool(widgetProps(item), 'closeOnBackdrop', true)) this.modals.close(this.key(item));
  }

  modalTitleId(item: LayoutItem): string {
    return `modal-${this.key(item)}-title`;
  }

  key(item: LayoutItem): string {
    return String(item.id);
  }
}
