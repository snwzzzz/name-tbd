import { Injectable, inject } from '@angular/core';
import { APP_DATA, APP_LAYOUT } from '../ports/app-ports';
import { InputValuesService } from '../services/input-values.service';
import { FieldErrorsService } from '../services/field-errors.service';
import { TableSelectionService } from '../services/table-selection.service';
import { WidgetEventsService } from '../services/widget-events.service';
import { FormMessage, FormMessagesService } from '../services/form-messages.service';
import { validateField } from './field-validation';
import { fieldKind } from './form-fields';
import { LayoutItem } from '../../_types/layout.types';
import { TableRow } from '../../_types/data-source.types';
import { findInTree, flattenTree } from '../../_utils/layout-tree.utils';
import { propBool, propNumber, propText } from '../../_utils/widget-props.utils';
import { SUBMIT_EVENT } from '../../_constants/widget-events.constants';

export const FORM_EDIT_MODE = 'Edit the selected row';

/**
 * Forms while the app runs: a form container groups fields (the widgets of FIELD_KINDS inside it,
 * also in nested containers); each field with a column ("Column (in a form)") is saved into that
 * column of the form's data source. Submitting checks every field (field-validation) and shows
 * what's wrong under each; if all is fine it adds a row, or changes the row selected in the form's
 * table, then fires the form's submit trigger.
 */
@Injectable({ providedIn: 'root' })
export class FormsService {
  private readonly layout = inject(APP_LAYOUT);
  private readonly data = inject(APP_DATA);
  private readonly values = inject(InputValuesService);
  private readonly errors = inject(FieldErrorsService);
  private readonly selection = inject(TableSelectionService);
  private readonly widgetEvents = inject(WidgetEventsService);
  private readonly messages = inject(FormMessagesService);

  message(formId: string): FormMessage | null {
    return this.messages.message(formId);
  }

  /** The form a widget on the page is in (the nearest one around it), or null. */
  formOf(pageId: string, widgetId: string): LayoutItem | null {
    const items = this.layout.items(pageId);
    let item = findInTree(items, widgetId);
    while (item?.parentId != null) {
      item = findInTree(items, item.parentId);
      if (item?.type === 'form') return item;
    }
    return null;
  }

  /** The fields inside a form (not those of a form inside it). */
  fields(form: LayoutItem): LayoutItem[] {
    const inside = (items: LayoutItem[]): LayoutItem[] =>
      items.flatMap((item) => (item.type === 'form' ? [] : [item, ...inside(item.children ?? [])]));
    return inside(form.children ?? []).filter((item) => fieldKind(item.type) && item.id != null);
  }

  /**
   * Checks the form's fields and saves its row. Returns whether it was saved; when it wasn't, the
   * fields say why (and the form, when it's something else, e.g. no row selected to edit).
   */
  async submit(pageId: string, formId: string): Promise<boolean> {
    const form = findInTree(this.layout.items(pageId), formId);
    if (!form || form.type !== 'form') return false;
    const fields = this.fields(form);

    let firstInvalid: string | null = null;
    for (const field of fields) {
      const id = String(field.id);
      const error = validateField(fieldKind(field.type)!, field.props ?? {}, this.valueOf(field));
      this.errors.set(id, error);
      if (error && !firstInvalid) firstInvalid = id;
    }
    if (firstInvalid) {
      this.say(formId, { text: 'Please check the highlighted fields.', kind: 'error' });
      focusField(firstInvalid);
      return false;
    }

    const dataSourceId = propNumber(form.props, 'dataSourceId', NaN);
    if (!Number.isInteger(dataSourceId)) {
      this.say(formId, { text: 'This form has no data source to save into.', kind: 'error' });
      return false;
    }
    const table = await this.data.loadTable(dataSourceId);
    const bound = fields.filter((field) => table.columns.includes(propText(field.props, 'field') ?? ''));
    const rowValues = (base: string[]) => {
      const values = table.columns.map((_, i) => base[i] ?? '');
      for (const field of bound) values[table.columns.indexOf(propText(field.props, 'field')!)] = this.valueOf(field);
      return values;
    };

    if (propText(form.props, 'mode') === FORM_EDIT_MODE) {
      const row = this.rowToEdit(form, table.rows);
      if (!row) {
        this.say(formId, { text: 'Select a row to edit first.', kind: 'error' });
        return false;
      }
      this.data.updateRow(dataSourceId, row.id, rowValues(row.values));
    } else {
      this.data.addRow(dataSourceId, rowValues([]));
      // Ready for the next one
      this.values.clear(fields.map((field) => String(field.id)));
    }
    this.say(formId, { text: propText(form.props, 'successMessage') ?? 'Saved.', kind: 'success' });
    this.widgetEvents.fire({ pageId, elementId: formId, event: SUBMIT_EVENT });
    return true;
  }

  /** Empties the form's fields (back to their initial values) and its messages. */
  reset(pageId: string, formId: string): void {
    const form = findInTree(this.layout.items(pageId), formId);
    if (!form) return;
    const ids = this.fields(form).map((field) => String(field.id));
    this.values.clear(ids);
    ids.forEach((id) => this.errors.set(id, null));
    this.say(formId, null);
  }

  /** Shows a row's values in the form's fields (a form that edits the selected row). */
  showRow(form: LayoutItem, columns: string[], row: TableRow): void {
    const fields = this.fields(form);
    const values: Record<string, string> = {};
    for (const field of fields) {
      const column = columns.indexOf(propText(field.props, 'field') ?? '');
      if (column >= 0) values[String(field.id)] = row.values[column] ?? '';
      this.errors.set(String(field.id), null);
    }
    this.values.setMany(values);
  }

  /** The row a form that edits the selected row works on: the one selected in its table (exactly one). */
  rowToEdit(form: LayoutItem, rows: TableRow[]): TableRow | null {
    const tableId = propText(form.props, 'tableId');
    const selected = tableId ? this.selection.selected(tableId) : [];
    return selected.length === 1 ? rows.find((row) => row.id === selected[0]) ?? null : null;
  }

  /** A field's value: what was entered, else what it starts with. */
  private valueOf(field: LayoutItem): string {
    return this.values.get(String(field.id)) ?? fieldInitialValue(field);
  }

  private say(formId: string, message: FormMessage | null): void {
    this.messages.say(formId, message);
  }
}

/** What a field shows before anything is entered (a checkbox or toggle: checked at first or not). */
export function fieldInitialValue(field: LayoutItem): string {
  return field.type === 'checkbox' || field.type === 'toggle' ? String(propBool(field.props, 'checked', false)) : '';
}

/** Puts the keyboard on a field (its element is `field-<id>`, see BaseFieldWidget). */
function focusField(fieldId: string): void {
  if (typeof document !== 'undefined') document.getElementById(`field-${fieldId}`)?.focus();
}

/** Every form on a page (for the editor's settings). */
export const formsOf = (items: LayoutItem[]): LayoutItem[] => flattenTree(items).filter((item) => item.type === 'form');
