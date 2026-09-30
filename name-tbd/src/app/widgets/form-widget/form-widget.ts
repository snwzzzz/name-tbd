import { Component, ElementRef, inject, signal } from '@angular/core';
import { GridItemHTMLElement, GridStack } from 'gridstack';
import { BaseWidget } from '../../_directives/base-widget.directive';

type GridHostElement = HTMLElement & { gridstack?: GridStack };

@Component({
  selector: 'app-form-widget',
  templateUrl: './form-widget.html',
  styleUrl: './form-widget.scss',
})
export class FormWidget extends BaseWidget {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly inputs = signal<number[]>([1]);

  addInput(): void {
    this.inputs.update((inputs) => [...inputs, inputs.length + 1]);
    // Grow the grid item once the browser has laid out the new input
    setTimeout(() => this.resizeGridItemToContent(), 0);
  }

  private resizeGridItemToContent(): void {
    const item = this.host.nativeElement.closest<GridItemHTMLElement>('.grid-stack-item');
    const gridEl = this.host.nativeElement.closest<GridHostElement>('.grid-stack');
    const grid = item?.gridstackNode?.grid ?? gridEl?.gridstack;
    if (item && grid) grid.resizeToContent(item);
  }
}
