import { Component, DestroyRef, ElementRef, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WidgetGrid } from '../../../app/core/rendering/widget-grid/widget-grid';
import { WidgetEventsService } from '../../../app/core/services/widget-events.service';
import { WorkflowRuntimeService } from '../../../app/core/workflow/workflow-runtime.service';
import { ARTBOARD_HEIGHT, ARTBOARD_WIDTH } from '../../../app/_constants/artboard.constants';
import { APP_DEFINITION } from '../app-definition.token';
import { RuntimeLayout } from '../runtime-adapters';

/**
 * The exported app: the artboard (zoomed to the window's width), the layout page's widgets on
 * it, and the current page (the router's) over them. Widgets' events run the page's workflows.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, WidgetGrid],
  templateUrl: './runtime-shell.html',
  styleUrl: './runtime-shell.scss',
})
export class RuntimeShell {
  private readonly layout = inject(RuntimeLayout);

  readonly width = ARTBOARD_WIDTH;
  readonly height = ARTBOARD_HEIGHT;
  /** The width there is for the artboard: the window's, without its scrollbar. */
  private readonly available = signal(document.documentElement.clientWidth);
  /**
   * The artboard is the canvas's page area, so it's zoomed as a whole: it looks the same in any
   * window (a 1080p screen shows it at about its real size), it's never squeezed or stretched.
   */
  readonly scale = computed(() => this.available() / ARTBOARD_WIDTH || 1);

  private readonly layoutPageId = inject(APP_DEFINITION).pages.find((p) => p.layout)?.id;
  readonly layoutItems = computed(() => (this.layoutPageId == null ? [] : this.layout.items(String(this.layoutPageId))));

  constructor() {
    const workflows = inject(WorkflowRuntimeService);
    const events = inject(WidgetEventsService).events$.subscribe(({ pageId, elementId, event }) =>
      workflows.handleEvent(pageId, elementId, event),
    );
    const host: HTMLElement = inject(ElementRef).nativeElement;
    const resize =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.available.set(host.clientWidth));
    resize?.observe(host);
    inject(DestroyRef).onDestroy(() => {
      events.unsubscribe();
      resize?.disconnect();
    });
  }
}
