import { Component, DestroyRef, ElementRef, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WidgetGrid } from '../../../app/core/rendering/widget-grid/widget-grid';
import { WidgetEventsService } from '../../../app/core/services/widget-events.service';
import { WorkflowRuntimeService } from '../../../app/core/workflow/workflow-runtime.service';
import { ARTBOARD_HEIGHT, ARTBOARD_WIDTH } from '../../../app/_constants/artboard.constants';
import { APP_DEFINITION } from '../app-definition.token';
import { RuntimeLayout } from '../runtime-adapters';

/**
 * The exported app: the artboard (as wide as the window, like a website), the layout page's
 * widgets on it, and the current page (the router's) over them. Widgets' events run the page's
 * workflows.
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
  /** The width there is for the artboard (the window's, without a scrollbar). */
  private readonly available = signal(window.innerWidth);
  /** Drawn at its real size and zoomed to fill that width; taller than the window, it scrolls. */
  readonly scale = computed(() => this.available() / ARTBOARD_WIDTH);

  private readonly layoutPageId = inject(APP_DEFINITION).pages.find((p) => p.layout)?.id;
  readonly layoutItems = computed(() => (this.layoutPageId == null ? [] : this.layout.items(String(this.layoutPageId))));

  constructor() {
    const workflows = inject(WorkflowRuntimeService);
    const events = inject(WidgetEventsService).events$.subscribe(({ pageId, elementId, event }) =>
      workflows.handleEvent(pageId, elementId, event),
    );
    // The shell's own width: unlike the window's, it changes when a scrollbar comes or goes
    const host: HTMLElement = inject(ElementRef).nativeElement;
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.available.set(host.clientWidth));
    resize?.observe(host);
    inject(DestroyRef).onDestroy(() => {
      events.unsubscribe();
      resize?.disconnect();
    });
  }
}
