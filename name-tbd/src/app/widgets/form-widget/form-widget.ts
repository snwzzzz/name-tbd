import { Component, computed, effect, inject, untracked } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { APP_LAYOUT, APP_SESSION } from '../../core/ports/app-ports';
import { FORM_EDIT_MODE, FormsService } from '../../core/forms/forms.service';
import { TableSelectionService } from '../../core/services/table-selection.service';
import { findInTree } from '../../_utils/layout-tree.utils';
import { propText } from '../../_utils/widget-props.utils';
import { bindDataSource } from '../_shared/data-source-binding';

/**
 * What a form draws over its fields (they sit in its nested grid): the message after submitting
 * (saved, or what's wrong). A form that edits the selected row shows that row's values in its
 * fields whenever another row is selected. Submitting is a button's job (FormsService).
 */
@Component({
  selector: 'app-form-widget',
  template: `
    <div class="form-message" role="status" aria-live="polite">
      @if (message(); as message) {
        <span class="bubble" [class.error]="message.kind === 'error'">{{ message.text }}</span>
      }
    </div>
  `,
  styleUrl: './form-widget.scss',
})
export class FormWidget extends BaseWidget {
  private readonly session = inject(APP_SESSION);
  private readonly forms = inject(FormsService);
  private readonly layout = inject(APP_LAYOUT);
  private readonly selection = inject(TableSelectionService);
  private readonly source = bindDataSource(this.props);

  readonly message = computed(() => this.forms.message(this.id()));

  constructor() {
    super();
    // Editing the selected row: show it in the fields when the selection changes
    effect(() => {
      const pageId = this.session.pageId();
      const tableId = propText(this.props(), 'tableId');
      if (!this.session.live() || !pageId || !tableId || propText(this.props(), 'mode') !== FORM_EDIT_MODE) return;
      const selected = this.selection.selected(tableId);
      const table = this.source.table();
      if (selected.length !== 1 || !table) return;
      untracked(() => {
        const form = findInTree(this.layout.items(pageId), this.id());
        const row = form && this.forms.rowToEdit(form, table.rows);
        if (form && row) this.forms.showRow(form, table.columns, row);
      });
    });
  }
}
