import { Component, input } from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { GRID_COLUMNS, GRID_ROWS, WIDGET_MARGIN } from '../../../_constants/artboard.constants';
import { LayoutItem } from '../../../_types/layout.types';
import { isContainer, isFlushType, widgetComponent, widgetProps } from '../widget-components';
import { propText } from '../../../_utils/widget-props.utils';

/**
 * Placed widgets drawn in their grid cells (the artboard's, like the canvas), with
 * containers as nested grids. Draws the exported app's pages and the editor's layout overlay.
 */
@Component({
  selector: 'app-widget-grid',
  imports: [NgComponentOutlet, NgTemplateOutlet],
  templateUrl: './widget-grid.html',
  styleUrl: './widget-grid.scss',
})
export class WidgetGrid {
  readonly items = input.required<LayoutItem[]>();

  readonly columns = GRID_COLUMNS;
  readonly rows = GRID_ROWS;
  /** GridStack's margin in the root grid (nested grids have none). */
  readonly margin = WIDGET_MARGIN;

  readonly isContainer = isContainer;
  readonly isFlush = isFlushType;
  readonly component = (item: LayoutItem) => widgetComponent(item.type);
  readonly props = widgetProps;

  /** A container's background color (null: none). */
  background(item: LayoutItem): string | null {
    return propText(item.props, 'background') ?? null;
  }

  key(item: LayoutItem): string {
    return String(item.id);
  }
}
