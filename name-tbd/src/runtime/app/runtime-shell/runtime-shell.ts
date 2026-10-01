import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WidgetGrid } from '../../../app/core/rendering/widget-grid/widget-grid';
import { WidgetEventsService } from '../../../app/core/services/widget-events.service';
import { WorkflowRuntimeService } from '../../../app/core/workflow/workflow-runtime.service';
import { ARTBOARD_HEIGHT, ARTBOARD_WIDTH } from '../../../app/_constants/artboard.constants';
import { APP_DEFINITION } from '../app-definition.token';
import { RuntimeLayout } from '../runtime-adapters';

/**
 * The exported app: the artboard (as big as the window allows), the layout page's widgets on it,
 * and the current page (the router's) over them. Widgets' events run the page's workflows.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, WidgetGrid],
  templateUrl: './runtime-shell.html',
  styleUrl: './runtime-shell.scss',
  host: { '(window:resize)': 'measure()' },
})
export class RuntimeShell {
  private readonly layout = inject(RuntimeLayout);

  readonly width = ARTBOARD_WIDTH;
  readonly height = ARTBOARD_HEIGHT;
  private readonly viewport = signal({ width: window.innerWidth, height: window.innerHeight });
  readonly scale = computed(() => {
    const { width, height } = this.viewport();
    return Math.min(width / ARTBOARD_WIDTH, height / ARTBOARD_HEIGHT);
  });

  private readonly layoutPageId = inject(APP_DEFINITION).pages.find((p) => p.layout)?.id;
  readonly layoutItems = computed(() => (this.layoutPageId == null ? [] : this.layout.items(String(this.layoutPageId))));

  constructor() {
    const workflows = inject(WorkflowRuntimeService);
    const events = inject(WidgetEventsService).events$.subscribe(({ pageId, elementId, event }) =>
      workflows.handleEvent(pageId, elementId, event),
    );
    inject(DestroyRef).onDestroy(() => events.unsubscribe());
  }

  measure(): void {
    this.viewport.set({ width: window.innerWidth, height: window.innerHeight });
  }
}
