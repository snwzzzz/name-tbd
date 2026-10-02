import { Component, computed, effect, inject, input, untracked } from '@angular/core';
import { AbsoluteWidgetRenderer } from '../absolute-widget-renderer/absolute-widget-renderer';
import { WorkflowRuntimeService } from '../../../app/core/workflow/workflow-runtime.service';
import { APP_DEFINITION } from '../app-definition.token';
import { RuntimeLayout, RuntimeLocation } from '../runtime-adapters';

/** A page of the app (one per route): its widgets, and its "page load" workflows once shown. */
@Component({
  selector: 'app-runtime-page',
  imports: [AbsoluteWidgetRenderer],
  template: `<app-absolute-widget-renderer [items]="items()" [contentHeight]="contentHeight()" />`,
  styleUrl: './runtime-page.scss',
})
export class RuntimePage {
  private readonly layout = inject(RuntimeLayout);
  private readonly location = inject(RuntimeLocation);
  private readonly workflows = inject(WorkflowRuntimeService);
  private readonly definition = inject(APP_DEFINITION);

  /** From the route (see appRoutes). */
  readonly pageId = input.required<number>();
  readonly items = computed(() => this.layout.items(String(this.pageId())));
  readonly contentHeight = computed(() => this.definition.pages.find((p) => p.id === this.pageId())?.contentHeight ?? 0);

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
