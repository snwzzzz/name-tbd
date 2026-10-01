import { Component, input } from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { GRID_COLUMNS, GRID_ROWS } from '../../../_constants/artboard.constants';
import { LayoutItem } from '../../../_types/layout.types';
import { isContainer, widgetComponent, widgetProps } from '../widget-components';

/**
 * Placed widgets drawn in their grid cells (24 × 18 over the artboard, like the canvas), with
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

  readonly isContainer = isContainer;
  readonly component = (item: LayoutItem) => widgetComponent(item.type);
  readonly props = widgetProps;

  key(item: LayoutItem): string {
    return String(item.id);
  }
}
