import { Component, input } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { LayoutItem } from '../../../app/_types/layout.types';
import { isContainer, widgetComponent, widgetProps } from '../../../app/core/rendering/widget-components';

/**
 * Renders widgets with absolute positioning based on CSS styles provided by the backend export pipeline.
 */
@Component({
  selector: 'app-absolute-widget-renderer',
  imports: [NgComponentOutlet],
  templateUrl: './absolute-widget-renderer.html',
  styleUrl: './absolute-widget-renderer.scss',
})
export class AbsoluteWidgetRenderer {
  readonly items = input.required<LayoutItem[]>();
  readonly contentHeight = input<number>(0);
  readonly root = input<boolean>(true);

  readonly isContainer = isContainer;
  readonly component = (item: LayoutItem) => widgetComponent(item.type);
  readonly props = widgetProps;

  key(item: LayoutItem): string {
    return String(item.id);
  }
}
