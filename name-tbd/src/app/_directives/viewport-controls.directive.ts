import { DestroyRef, Directive, ElementRef, HostListener, inject, output, signal } from '@angular/core';
import { Point } from '../_types/viewport.types';

export type ViewportCommand = 'zoom-in' | 'zoom-out' | 'zoom-reset' | 'fit';

export interface ZoomAtEvent {
  /** Multiply the zoom by this. */
  factor: number;
  /** Cursor position in client (screen) coordinates. */
  client: Point;
}

const WHEEL_ZOOM_STEP = 1.1;

const isTyping = () => /INPUT|TEXTAREA|SELECT/.test((document.activeElement as HTMLElement | null)?.tagName ?? '');

/**
 * The pan/zoom input of a zoomable view, the same everywhere:
 * - scroll pans, Shift+scroll pans sideways, Ctrl/⌘+scroll zooms toward the cursor
 * - Space+drag or middle-drag pans
 * - Ctrl/⌘ with + / − / 0 / F zooms in, out, back to 100%, or fits the content
 * The host applies the resulting pan and zoom however its coordinates work.
 */
@Directive({
  selector: '[appViewportControls]',
  exportAs: 'viewportControls',
  host: { '[class.is-panning]': 'isPanning()' },
})
export class ViewportControls {
  readonly panBy = output<Point>();
  readonly zoomAt = output<ZoomAtEvent>();
  readonly command = output<ViewportCommand>();

  /** True while Space is held or a middle-drag is in progress (shows the grab cursor). */
  readonly isPanning = signal(false);
  /** True while Space is held: a left-drag then pans instead of picking things up. */
  readonly spaceHeld = signal(false);

  private middleDown = false;
  private dragging = false;
  private last: Point = { x: 0, y: 0 };

  constructor() {
    // Non-passive, so the browser doesn't scroll or zoom the page itself
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const onWheel = (e: WheelEvent) => this.onWheel(e);
    host.addEventListener('wheel', onWheel, { passive: false });
    inject(DestroyRef).onDestroy(() => host.removeEventListener('wheel', onWheel));
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(e: MouseEvent): void {
    const middle = e.button === 1;
    if (!middle && !(e.button === 0 && this.spaceHeld())) return;
    e.preventDefault();
    this.middleDown = middle;
    this.dragging = true;
    this.last = { x: e.clientX, y: e.clientY };
    this.isPanning.set(true);
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (!this.dragging) return;
    this.panBy.emit({ x: e.clientX - this.last.x, y: e.clientY - this.last.y });
    this.last = { x: e.clientX, y: e.clientY };
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    this.dragging = false;
    this.middleDown = false;
    if (!this.spaceHeld()) this.isPanning.set(false);
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (e.repeat) return;
    if (e.code === 'Space' && !isTyping()) {
      e.preventDefault();
      this.spaceHeld.set(true);
      this.isPanning.set(true);
    }
    if (!(e.ctrlKey || e.metaKey)) return;
    const command = this.shortcut(e.key);
    if (command) {
      e.preventDefault();
      this.command.emit(command);
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent): void {
    if (e.code !== 'Space') return;
    this.spaceHeld.set(false);
    this.dragging = false;
    if (!this.middleDown) this.isPanning.set(false);
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const factor = e.deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP;
      this.zoomAt.emit({ factor, client: { x: e.clientX, y: e.clientY } });
    } else if (e.shiftKey) {
      this.panBy.emit({ x: -e.deltaY, y: 0 });
    } else {
      this.panBy.emit({ x: -e.deltaX, y: -e.deltaY });
    }
  }

  private shortcut(key: string): ViewportCommand | null {
    switch (key) {
      case '=':
      case '+': return 'zoom-in';
      case '-': return 'zoom-out';
      case '0': return 'zoom-reset';
      case 'f':
      case 'F': return 'fit';
      default: return null;
    }
  }
}
