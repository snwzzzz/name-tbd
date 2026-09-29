import { AfterViewInit, Component } from '@angular/core';
import { GridStack } from 'gridstack';
import { LucideComponent, LucideGripVertical } from '@lucide/angular';

interface PaletteItem {
  type: string;
  label: string;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxH?: number;
  resizable?: boolean;
}

@Component({
  selector: 'app-component-list',
  standalone: true,
  imports: [LucideComponent, LucideGripVertical],
  templateUrl: './component-list.html',
  styleUrl: './component-list.scss',
})
export class ComponentList implements AfterViewInit {
  /**
   * The list of draggable component definitions.
   * PHASE 2: replace this static list with a signal/service that loads real
   * component configurations (type, label, default w/h, icon, config schema)
   * — each entry maps to the Detail Section popup model.
   */
  readonly items: PaletteItem[] = [
    { type: 'button', label: 'Button', w: 2, h: 1, minW: 1, minH: 1 },
    { type: 'label', label: 'Text Label', w: 2, h: 1, minW: 1, minH: 1 },
    { type: 'detail-section', label: 'Detail Section', w: 4, h: 2, resizable: false },
    { type: 'chart', label: 'Chart', w: 6, h: 3, resizable: false },
    { type: 'text', label: 'Text Block', w: 3, h: 2, resizable: false },
    { type: 'image', label: 'Image', w: 3, h: 3, resizable: false },
    { type: 'form', label: 'Dynamic Form', w: 4, h: 3, minH: 3, resizable: false },
    { type: 'container', label: 'Container', w: 4, h: 3, minW: 2, minH: 2 },
  ];

  ngAfterViewInit(): void {
    // Register all .gs-drag-item elements in this panel as external drag sources.
    // GridStack.setupDragIn() attaches drag-and-drop behaviour via its internal
    // drag engine (dd-draggable), so no native HTML5 drag events are needed.
    //
    // The selector must match the class applied in component-list.html.
    // data-gs-width / data-gs-height on each element tell GridStack the initial
    // widget size when dropped.
    GridStack.setupDragIn('.gs-drag-item', {
      appendTo: 'body', // ghost element appended to body so it escapes any overflow:hidden containers
      helper: 'clone', // drag a visual clone, leaving the original in place
    });
  }
}
