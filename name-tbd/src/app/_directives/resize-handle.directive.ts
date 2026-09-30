import { Directive, HostListener, input, model } from '@angular/core';

/**
 * Drag handle that resizes a sidebar. Put it on the sidebar's edge and bind its width:
 * `<div appResizeHandle side="left" [(width)]="width" [(resizing)]="resizing"></div>`.
 */
@Directive({ selector: '[appResizeHandle]' })
export class ResizeHandle {
  /** Which side of the screen the sidebar is on (its resizable edge faces the other way). */
  readonly side = input.required<'left' | 'right'>();
  readonly min = input(200);
  readonly max = input(800);
  readonly width = model.required<number>();
  readonly resizing = model(false);

  private startX = 0;
  private startWidth = 0;

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    this.startX = event.clientX;
    this.startWidth = this.width();
    this.resizing.set(true);
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.resizing()) return;
    // A left sidebar grows when dragging right, a right one when dragging left
    const delta = this.side() === 'left' ? event.clientX - this.startX : this.startX - event.clientX;
    this.width.set(Math.min(this.max(), Math.max(this.min(), this.startWidth + delta)));
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (this.resizing()) this.resizing.set(false);
  }
}
