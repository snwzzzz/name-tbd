import { Component, DestroyRef, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AbsoluteWidgetRenderer } from '../absolute-widget-renderer/absolute-widget-renderer';
import { WidgetEventsService } from '../../../app/core/services/widget-events.service';
import { WorkflowRuntimeService } from '../../../app/core/workflow/workflow-runtime.service';
import { APP_DEFINITION } from '../app-definition.token';
import { RuntimeLayout } from '../runtime-adapters';

/**
 * The exported app: the page container (responsive width, natural scroll), the layout page's
 * widgets on it, and the current page (the router's) over them. Widgets' events run the page's
 * workflows.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AbsoluteWidgetRenderer],
  templateUrl: './runtime-shell.html',
  styleUrl: './runtime-shell.scss',
})
export class RuntimeShell {
  private readonly layout = inject(RuntimeLayout);
  private readonly definition = inject(APP_DEFINITION);

  private readonly layoutPage = this.definition.pages.find((p) => p.layout);
  private readonly layoutPageId = this.layoutPage?.id;
  readonly layoutContentHeight = computed(() => this.layoutPage?.contentHeight ?? 0);
  readonly layoutItems = computed(() => (this.layoutPageId == null ? [] : this.layout.items(String(this.layoutPageId))));

  constructor() {
    const workflows = inject(WorkflowRuntimeService);
    const events = inject(WidgetEventsService).events$.subscribe(({ pageId, elementId, event }) =>
      workflows.handleEvent(pageId, elementId, event),
    );
    inject(DestroyRef).onDestroy(() => {
      events.unsubscribe();
    });
  }
}
