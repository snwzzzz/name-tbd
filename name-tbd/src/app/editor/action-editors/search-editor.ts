import { Component, computed, effect, inject, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideLayers, LucideSheet, LucideTextCursorInput } from '@lucide/angular';
import { BaseActionEditor } from '../../_directives/base-action-editor.directive';
import { UiSelect } from '../../components/ui-select/ui-select';
import { LayoutStateService } from '../../_services/layout-state.service';
import { PagesStateService } from '../../_services/pages-state.service';
import { SelectOption } from '../../_types/select.types';
import { SearchConfig } from '../../_types/workflow.types';
import { SEARCH_ALL_TABLES } from '../../core/workflow/actions/search/search.handler';
import { flattenTree } from '../../_utils/layout-tree.utils';
import { propText } from '../../_utils/widget-props.utils';

/** Settings of `search`: the input (on any page, e.g. the layout page's header) and the table(s) it filters. */
@Component({
  selector: 'app-search-editor',
  imports: [FormsModule, UiSelect],
  template: `
    <label class="field-label">Search for the text of</label>
    @if (inputOptions().length) {
      <app-select
        size="sm"
        placeholder="Select an input…"
        [options]="inputOptions()"
        [ngModel]="config().inputId"
        (ngModelChange)="update()({ inputId: $event })" />
    } @else {
      <p class="hint">Add an Input to a page first.</p>
    }

    <label class="field-label">In</label>
    <app-select
      size="sm"
      placeholder="Select a table…"
      [options]="tableOptions()"
      [ngModel]="config().tableId"
      (ngModelChange)="update()({ tableId: $event })" />
  `,
  styleUrl: './action-editor.scss',
})
export class SearchEditor extends BaseActionEditor<SearchConfig> {
  private readonly pages = inject(PagesStateService);
  private readonly layoutState = inject(LayoutStateService);

  /** The inputs of all pages (layout page included), with the page each one is on. */
  readonly inputOptions = computed<SelectOption[]>(() =>
    this.pages.pages().flatMap((page) =>
      flattenTree(this.layoutState.getLayout(String(page.id)))
        .filter((item) => item.type === 'input' && typeof item.id === 'number')
        .map((item) => ({
          value: String(item.id),
          label: `${page.name ?? `Page ${page.id}`} › ${propText(item.props, 'label') ?? propText(item.props, 'placeholder') ?? 'Input'} (#${item.id})`,
          icon: LucideTextCursorInput,
        })),
    ));

  readonly tableOptions = computed<SelectOption[]>(() => [
    { value: SEARCH_ALL_TABLES, label: 'All tables on this page', icon: LucideLayers },
    ...this.pageItems()
      .filter((i) => i.type === 'table' && typeof i.id === 'number')
      .map((i) => ({ value: String(i.id), label: `${propText(i.props, 'title') ?? 'Table'} (#${i.id})`, icon: LucideSheet })),
  ]);

  constructor() {
    super();
    this.pages.ensureLoaded();
    // Every page's widgets, to find their inputs
    effect(() => {
      for (const page of this.pages.pages()) {
        untracked(() => this.layoutState.loadLayoutForTab(String(page.id)).subscribe({
          error: (err) => console.error(`Failed to load the widgets of page ${page.id}`, err),
        }));
      }
    });
  }
}
