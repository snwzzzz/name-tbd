import { Component, ElementRef, HostListener, inject, input, output } from '@angular/core';

/**
 * A right-click menu at a screen position. Fill it with `button[app-context-menu-item]`
 * entries; it closes itself on Escape, or a click, right-click or scroll anywhere else.
 */
@Component({
  selector: 'app-context-menu',
  templateUrl: './context-menu.html',
  styleUrl: './context-menu.scss',
})
export class ContextMenu {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly x = input.required<number>();
  readonly y = input.required<number>();
  readonly closed = output<void>();

  @HostListener('document:pointerdown', ['$event'])
  @HostListener('document:contextmenu', ['$event'])
  onDocumentPointer(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.closed.emit();
  }

  /** Scrolling or zooming the view would leave the menu floating in the wrong place. */
  @HostListener('document:wheel', ['$event'])
  onDocumentWheel(event: WheelEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }
}
