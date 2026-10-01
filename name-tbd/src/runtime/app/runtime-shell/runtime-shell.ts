import { Component, DestroyRef, ElementRef, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WidgetGrid } from '../../../app/core/rendering/widget-grid/widget-grid';
import { WidgetEventsService } from '../../../app/core/services/widget-events.service';
import { WorkflowRuntimeService } from '../../../app/core/workflow/workflow-runtime.service';
import { ARTBOARD_HEIGHT, ARTBOARD_WIDTH } from '../../../app/_constants/artboard.constants';
import { APP_DEFINITION } from '../app-definition.token';
import { RuntimeLayout } from '../runtime-adapters';

/**
 * The exported app: the artboard (as big as fits the window, like a website), the layout page's
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
  /** The room there is for the artboard (the window's). */
  private readonly available = signal({ w: window.innerWidth, h: window.innerHeight });
  /**
   * Drawn at its real size and zoomed to fit the window: it fills its width (or height, in a
   * window wider than the artboard's 2:1), and never needs scrollbars.
   */
  readonly scale = computed(() => {
    const { w, h } = this.available();
    return Math.min(w / ARTBOARD_WIDTH, h / ARTBOARD_HEIGHT) || 1;
  });

  private readonly layoutPageId = inject(APP_DEFINITION).pages.find((p) => p.layout)?.id;
  readonly layoutItems = computed(() => (this.layoutPageId == null ? [] : this.layout.items(String(this.layoutPageId))));

  constructor() {
    const workflows = inject(WorkflowRuntimeService);
    const events = inject(WidgetEventsService).events$.subscribe(({ pageId, elementId, event }) =>
      workflows.handleEvent(pageId, elementId, event),
    );
    const host: HTMLElement = inject(ElementRef).nativeElement;
    const resize =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => this.available.set({ w: host.clientWidth, h: host.clientHeight }));
    resize?.observe(host);
    inject(DestroyRef).onDestroy(() => {
      events.unsubscribe();
      resize?.disconnect();
    });
  }
}
