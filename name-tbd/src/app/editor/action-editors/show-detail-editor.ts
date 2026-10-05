import { Component, computed, effect, inject, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucidePanelsTopLeft, LucideSheet } from '@lucide/angular';
import { BaseActionEditor } from '../../_directives/base-action-editor.directive';
import { UiSelect } from '../../components/ui-select/ui-select';
import { LayoutStateService } from '../../_services/layout-state.service';
import { PagesStateService } from '../../_services/pages-state.service';
import { SelectOption } from '../../_types/select.types';
import { ShowDetailConfig } from '../../_types/workflow.types';
import { flattenTree } from '../../_utils/layout-tree.utils';
import { propText } from '../../_utils/widget-props.utils';
import { isRowWidget } from '../../core/rendering/row-widgets';

/** Settings of `show_detail`: the table (on this page) and the detail section (on any page). */
@Component({
  selector: 'app-show-detail-editor',
  imports: [FormsModule, UiSelect],
  template: `
    <label class="field-label">Selected row of</label>
    @if (tableOptions().length) {
      <app-select
        size="sm"
        placeholder="Select a table…"
        [options]="tableOptions()"
        [ngModel]="config().tableId"
        (ngModelChange)="update()({ tableId: $event })" />
    } @else {
      <p class="hint">Add a Data Table to this page first.</p>
    }

    <label class="field-label">Show in</label>
    @if (detailOptions().length) {
      <app-select
        size="sm"
        placeholder="Select a detail section…"
        [options]="detailOptions()"
        [ngModel]="config().detailId"
        (ngModelChange)="chooseDetail($event)" />
    } @else {
      <p class="hint">Add a Detail Section to a page first.</p>
    }
  `,
  styleUrl: './action-editor.scss',
})
export class ShowDetailEditor extends BaseActionEditor<ShowDetailConfig> {
  private readonly pages = inject(PagesStateService);
  private readonly layoutState = inject(LayoutStateService);

  readonly tableOptions = computed<SelectOption[]>(() =>
    this.pageItems()
      .filter((i) => isRowWidget(i.type) && typeof i.id === 'number')
      .map((i) => ({ value: String(i.id), label: `${propText(i.props, 'title') ?? (i.type === 'list' ? 'List' : 'Table')} (#${i.id})`, icon: LucideSheet })));

  /** The detail sections of all pages, with the page each one is on. */
  private readonly details = computed(() =>
    this.pages.contentPages().flatMap((page) =>
      flattenTree(this.layoutState.getLayout(String(page.id)))
        .filter((item) => item.type === 'detail' && typeof item.id === 'number')
        .map((item) => ({ id: String(item.id), pageId: String(page.id), pageName: page.name ?? `Page ${page.id}`, item })),
    ),
  );

  readonly detailOptions = computed<SelectOption[]>(() =>
    this.details().map(({ id, pageName, item }) => ({
      value: id,
      label: `${pageName} › ${propText(item.props, 'title') ?? 'Detail'} (#${id})`,
      icon: LucidePanelsTopLeft,
    })));

  constructor() {
    super();
    this.pages.ensureLoaded();
    // Every page's widgets, to find their detail sections
    effect(() => {
      for (const page of this.pages.contentPages()) {
        untracked(() => this.layoutState.loadLayoutForTab(String(page.id)).subscribe({
          error: (err) => console.error(`Failed to load the widgets of page ${page.id}`, err),
        }));
      }
    });
  }

  /** Remembers the detail's page too, so the action can open it. */
  chooseDetail(detailId: string): void {
    const detail = this.details().find((d) => d.id === detailId);
    this.update()({ detailId, detailPageId: detail?.pageId ?? '' });
  }
}
