import { AfterViewInit, Component } from '@angular/core';
import { GridStack } from 'gridstack';
import { LucideComponent, LucideGripVertical } from '@lucide/angular';
import { PALETTE_ITEMS } from '../../_constants/widget-registry.constants';

/** The palette of widgets that can be dragged onto the canvas. */
@Component({
  selector: 'app-component-list',
  imports: [LucideComponent, LucideGripVertical],
  templateUrl: './component-list.html',
  styleUrl: './component-list.scss',
})
export class ComponentList implements AfterViewInit {
  readonly items = PALETTE_ITEMS;

  ngAfterViewInit(): void {
    // Make the palette cards drag sources for the canvas grid. A clone is dragged, appended
    // to <body> so it escapes the sidebar's overflow:hidden.
    GridStack.setupDragIn('.gs-drag-item', { appendTo: 'body', helper: 'clone' });
  }
}
