import { Component, DestroyRef, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WidgetGrid } from '../../../app/core/rendering/widget-grid/widget-grid';
import { WidgetEventsService } from '../../../app/core/services/widget-events.service';
import { WorkflowRuntimeService } from '../../../app/core/workflow/workflow-runtime.service';
import { ARTBOARD_HEIGHT, EXPORT_MIN_WIDTH } from '../../../app/_constants/artboard.constants';
import { APP_DEFINITION } from '../app-definition.token';
import { RuntimeLayout } from '../runtime-adapters';

/**
 * The exported app: the artboard, the layout page's widgets on it, and the current page (the
 * router's) over them. Widgets' events run the page's workflows.
 *
 * Drawn in real CSS px like any website, so the browser's zoom works: rows keep the canvas's
 * height, columns share the window's width. On a 1920 × 945 window it's exactly the canvas;
 * narrower windows (or zooming in) narrow the columns down to EXPORT_MIN_WIDTH, then it scrolls.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, WidgetGrid],
  templateUrl: './runtime-shell.html',
  styleUrl: './runtime-shell.scss',
})
export class RuntimeShell {
  private readonly layout = inject(RuntimeLayout);

  /** Less a vertical scrollbar (100vw counts it, 100% doesn't): 200% zoom fits without scrolling sideways. */
  readonly minWidth = `calc(${EXPORT_MIN_WIDTH}px - (100vw - 100%))`;
  readonly height = ARTBOARD_HEIGHT;

  private readonly layoutPageId = inject(APP_DEFINITION).pages.find((p) => p.layout)?.id;
  readonly layoutItems = computed(() => (this.layoutPageId == null ? [] : this.layout.items(String(this.layoutPageId))));

  constructor() {
    const workflows = inject(WorkflowRuntimeService);
    const events = inject(WidgetEventsService).events$.subscribe(({ pageId, elementId, event }) =>
      workflows.handleEvent(pageId, elementId, event),
    );
    inject(DestroyRef).onDestroy(() => events.unsubscribe());
  }
}
