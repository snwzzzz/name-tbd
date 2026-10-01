import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { WidgetGrid } from '../../../app/core/rendering/widget-grid/widget-grid';
import { WorkflowRuntimeService } from '../../../app/core/workflow/workflow-runtime.service';
import { RuntimeLayout, RuntimeLocation } from '../runtime-adapters';

/** A page of the app (one per route): its widgets, and its "page load" workflows once shown. */
@Component({
  selector: 'app-runtime-page',
  imports: [WidgetGrid],
  template: `<app-widget-grid [items]="items()" />`,
  styleUrl: './runtime-page.scss',
})
export class RuntimePage {
  private readonly layout = inject(RuntimeLayout);
  private readonly location = inject(RuntimeLocation);
  private readonly workflows = inject(WorkflowRuntimeService);

  /** From the route (see appRoutes). */
  readonly pageId = input.required<number>();
  readonly items = computed(() => this.layout.items(String(this.pageId())));

  constructor() {
    effect(() => {
      const pageId = String(this.pageId());
      untracked(() => {
        this.location.pageId.set(pageId);
        this.workflows.handlePageLoad(pageId);
      });
    });
  }
}
