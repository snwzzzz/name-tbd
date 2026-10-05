import { Component, DestroyRef, computed, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { WidgetGrid } from '../../../app/core/rendering/widget-grid/widget-grid';
import { AppMessages } from '../../../app/core/rendering/app-messages/app-messages';
import { WidgetEventsService } from '../../../app/core/services/widget-events.service';
import { WorkflowRuntimeService } from '../../../app/core/workflow/workflow-runtime.service';
import { CELL_SIZE, EXPORT_MIN_WIDTH, pageRows } from '../../../app/_constants/artboard.constants';
import { inFlow } from '../../../app/core/rendering/containers';
import { AppThemeService } from '../../../app/core/services/app-theme.service';
import { APP_DEFINITION } from '../app-definition.token';
import { RuntimeLayout, RuntimeLocation } from '../runtime-adapters';

/**
 * The exported app: the artboard, the layout page's widgets on it, and the current page (the
 * router's) over them. Widgets' events run the page's workflows.
 *
 * Drawn in real CSS px like any website, so the browser's zoom works: rows keep the canvas's
 * height, columns share the window's width. On a 1920 × 945 window it's exactly the canvas;
 * narrower windows (or zooming in) narrow the columns down to EXPORT_MIN_WIDTH, then it scrolls.
 * A page taller than one screen makes the artboard taller, and the window scrolls down.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, WidgetGrid, AppMessages],
  templateUrl: './runtime-shell.html',
  styleUrl: './runtime-shell.scss',
})
export class RuntimeShell {
  private readonly layout = inject(RuntimeLayout);
  private readonly location = inject(RuntimeLocation);

  /** Less a vertical scrollbar (100vw counts it, 100% doesn't): 200% zoom fits without scrolling sideways. */
  readonly minWidth = `calc(${EXPORT_MIN_WIDTH}px - (100vw - 100%))`;

  private readonly definition = inject(APP_DEFINITION);
  private readonly layoutPageId = this.definition.pages.find((p) => p.layout)?.id;
  readonly layoutItems = computed(() => (this.layoutPageId == null ? [] : this.layout.items(String(this.layoutPageId))));
  /** In rows: as high as the layout page or the page shown, whichever reaches further down. */
  readonly rows = computed(() => {
    const pageId = this.location.pageId();
    return Math.max(pageRows(inFlow(this.layoutItems())), pageRows(inFlow(pageId == null ? [] : this.layout.items(pageId))));
  });
  readonly height = computed(() => this.rows() * CELL_SIZE);

  constructor() {
    // The app's theme on the whole document, so dialogs over the page (and in overlays) wear it too
    const theme = inject(AppThemeService);
    theme.theme.set(this.definition.theme ?? null);
    const root = inject(DOCUMENT).documentElement;
    effect(() => Object.entries(theme.variables()).forEach(([name, value]) => root.style.setProperty(name, value)));

    const workflows = inject(WorkflowRuntimeService);
    const events = inject(WidgetEventsService).events$.subscribe(({ pageId, elementId, event }) =>
      workflows.handleEvent(pageId, elementId, event),
    );
    inject(DestroyRef).onDestroy(() => events.unsubscribe());
  }
}
