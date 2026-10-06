import { Injectable, InjectionToken, inject, untracked } from '@angular/core';
import { APP_DATA, APP_LAYOUT, APP_PAGES } from '../ports/app-ports';
import { InputValuesService } from '../services/input-values.service';
import { TableSelectionService } from '../services/table-selection.service';
import { TableFilterService } from '../services/table-filter.service';
import { PageParamsService } from '../services/page-params.service';
import { VariablesService } from '../variables/variables.service';
import { FormsService, fieldInitialValue } from '../forms/forms.service';
import { fieldKind } from '../forms/form-fields';
import { FieldKind } from '../forms/field-validation';
import { isRowWidget } from '../rendering/row-widgets';
import { ITEMS_PROP, listTableData } from './list-table';
import { LayoutItem } from '../../_types/layout.types';
import { TableData } from '../../_types/data-source.types';
import { flattenTree } from '../../_utils/layout-tree.utils';
import { propNumber, propText } from '../../_utils/widget-props.utils';
import { ROW_ID, ScopeEntry, VariableType, expressions, isTemplate, rowObject, rowObjects, toCel } from '../../../flow-engine';

/** Adds names to every page's scope (e.g. the signed-in user, once there is one). Provided with `multi: true`. */
export type ScopeContributor = (pageId: string) => Record<string, unknown>;
export const EXPRESSION_SCOPE = new InjectionToken<ScopeContributor[]>('EXPRESSION_SCOPE');

/** A widget's name in expressions: its `name` prop, or else its type and id (e.g. `input12`). */
export function widgetName(item: LayoutItem): string {
  const name = propText(item.props, 'name')?.trim();
  return name && IDENTIFIER.test(name) ? name : `${item.type ?? 'widget'}${item.id ?? ''}`;
}

/** What a widget or variable name may look like: letters, digits and _, not starting with a digit. */
export const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Names CEL keeps for itself (they can't name a widget or variable). */
export const RESERVED_NAMES = new Set([
  'true', 'false', 'null', 'in', 'as', 'break', 'const', 'continue', 'else', 'for', 'function', 'if', 'import', 'let',
  'loop', 'package', 'namespace', 'return', 'var', 'void', 'while', 'params', 'data', 'event', 'item', 'index',
  'response', 'error', 'row',
]);

const KIND_TYPES: Record<FieldKind, string> = { text: 'text', number: 'number', date: 'date (yyyy-MM-dd)', check: 'true / false', choice: 'text', file: 'file' };

/** A field's value as expressions see it: a number field's a number (or null), a checkbox's true/false, else text. */
export function typedFieldValue(kind: FieldKind, raw: string): unknown {
  if (kind === 'number') {
    if (raw.trim() === '') return null;
    const n = Number(raw);
    return Number.isNaN(n) ? raw : n;
  }
  if (kind === 'check') return raw === 'true';
  return raw;
}

/**
 * What expressions see on a page (scope): every named widget of the page and of the layout page
 * around it, the variables, the page's `params` and every data source's rows (`data.orders`).
 * Each name is read only when an expression uses it (a getter), so a widget bound to an
 * expression only follows what that expression reads.
 *
 * | Widget            | Expression sees                                                      |
 * |-------------------|----------------------------------------------------------------------|
 * | field             | `.value` (number fields: a number, checkboxes: true/false)           |
 * | form              | a field per column of its fields, e.g. `orderForm.amount`           |
 * | table, list       | `.selectedRow`, `.selectedRows`, `.rows` (objects with `_id`), `.search` |
 * | label / button    | `.text` / `.label`                                                   |
 */
@Injectable({ providedIn: 'root' })
export class ExpressionScopeService {
  private readonly layout = inject(APP_LAYOUT);
  private readonly pages = inject(APP_PAGES);
  private readonly data = inject(APP_DATA);
  private readonly inputs = inject(InputValuesService);
  private readonly selection = inject(TableSelectionService);
  private readonly filters = inject(TableFilterService);
  private readonly params = inject(PageParamsService);
  private readonly variables = inject(VariablesService);
  private readonly forms = inject(FormsService);
  private readonly contributors = inject(EXPRESSION_SCOPE, { optional: true }) ?? [];

  /** The page's scope (read lazily; see above). */
  scope(pageId: string): Record<string, unknown> {
    const scope: Record<string, unknown> = {};
    const define = (name: string, get: () => unknown) =>
      Object.defineProperty(scope, name, { get: () => toCel(get()), enumerable: true, configurable: true });

    for (const item of this.widgets(pageId)) define(widgetName(item), () => this.widgetValue(pageId, item));
    // Variables hide a widget of the same name (the editor warns about it)
    for (const variable of this.variables.visible(pageId)) define(variable.name, () => this.variables.get(pageId, variable.name));
    define('params', () => this.params.get(pageId));
    define('data', () => this.dataScope());
    for (const contribute of this.contributors) Object.assign(scope, contribute(pageId));
    return scope;
  }

  /** The names of the page's scope with what follows them, for the editor's checks and autocomplete. */
  entries(pageId: string): ScopeEntry[] {
    const entries: ScopeEntry[] = this.widgets(pageId).map((item) => this.widgetEntry(pageId, item));
    for (const variable of this.variables.visible(pageId)) {
      const index = entries.findIndex((e) => e.name === variable.name);
      if (index >= 0) entries.splice(index, 1);
      entries.push(variableEntry(variable.name, variable.type));
    }
    entries.push({ name: 'params', kind: 'param', type: 'page parameters', detail: 'Values the page was opened with' });
    entries.push({
      name: 'data', kind: 'value', type: 'data sources', detail: 'Every data source’s rows',
      members: this.data.sources().filter((s) => IDENTIFIER.test(s.name)).map((s) => ({
        name: s.name, kind: 'value', type: `list of ${s.name} rows`,
      })),
    });
    for (const contribute of this.contributors) {
      for (const name of Object.keys(contribute(pageId))) entries.push({ name, kind: 'value' });
    }
    return entries;
  }

  /** The widgets of the page and of the layout page around it (the page's first, for equal names). */
  private widgets(pageId: string): LayoutItem[] {
    const layoutPage = this.pages.pages().find((p) => p.layout);
    const own = flattenTree(this.layout.items(pageId));
    const around = layoutPage && String(layoutPage.id) !== pageId ? flattenTree(this.layout.items(String(layoutPage.id))) : [];
    return [...own, ...around].filter((item) => item.id != null && item.type);
  }

  private widgetValue(pageId: string, item: LayoutItem): unknown {
    const id = String(item.id);
    const kind = fieldKind(item.type);
    if (kind) return { value: typedFieldValue(kind, this.inputs.get(id) ?? fieldInitialValue(item)) };
    if (item.type === 'form') {
      const values: Record<string, unknown> = {};
      for (const field of this.forms.fields(item)) {
        const column = propText(field.props, 'field');
        if (column) values[column] = typedFieldValue(fieldKind(field.type)!, this.inputs.get(String(field.id)) ?? fieldInitialValue(field));
      }
      return values;
    }
    if (isRowWidget(item.type)) {
      const table = this.tableOf(pageId, item);
      const rows = table ? rowObjects(table) : [];
      const selected = this.selection.selected(id);
      const selectedRows = rows.filter((row) => selected.includes(String(row[ROW_ID])));
      return { rows, selectedRows, selectedRow: selectedRows[0] ?? null, search: this.filters.query(id) };
    }
    if (item.type === 'label') return { text: propText(item.props, 'text') ?? '' };
    if (item.type === 'button') return { label: propText(item.props, 'label') ?? '' };
    return {};
  }

  /** A table's or list's rows: from its `items` expression, else its data source. */
  private tableOf(pageId: string, item: LayoutItem): TableData | null {
    const items = item.props?.[ITEMS_PROP];
    if (isTemplate(items)) {
      try {
        return listTableData(expressions.template(items, this.scope(pageId)));
      } catch {
        return null;
      }
    }
    const dataSourceId = propNumber(item.props, 'dataSourceId', NaN);
    if (!Number.isInteger(dataSourceId)) return null;
    untracked(() => this.data.ensureTable(dataSourceId));
    return this.data.table(dataSourceId);
  }

  private dataScope(): Record<string, unknown> {
    const scope: Record<string, unknown> = {};
    for (const source of this.data.sources()) {
      Object.defineProperty(scope, source.name, {
        enumerable: true,
        get: () => {
          untracked(() => this.data.ensureTable(source.id));
          const table = this.data.table(source.id);
          return table ? rowObjects(table) : [];
        },
      });
    }
    return scope;
  }

  private widgetEntry(pageId: string, item: LayoutItem): ScopeEntry {
    const name = widgetName(item);
    const type = item.type ?? 'widget';
    const kind = fieldKind(type);
    if (kind) {
      return { name, kind: 'widget', type: `${type} field`, members: [{ name: 'value', kind: 'value', type: KIND_TYPES[kind] }] };
    }
    if (type === 'form') {
      const members: ScopeEntry[] = this.forms.fields(item).flatMap((field) => {
        const column = propText(field.props, 'field');
        return column ? [{ name: column, kind: 'field' as const, type: KIND_TYPES[fieldKind(field.type)!] }] : [];
      });
      return { name, kind: 'widget', type: 'form', members };
    }
    if (isRowWidget(type)) {
      const row = this.rowEntry(pageId, item);
      return {
        name, kind: 'widget', type,
        members: [
          { ...row, name: 'selectedRow', detail: 'The selected row (null: none)' },
          { name: 'selectedRows', kind: 'value', type: 'list of rows' },
          { name: 'rows', kind: 'value', type: 'list of rows' },
          { name: 'search', kind: 'value', type: 'text' },
        ],
      };
    }
    if (type === 'label') return { name, kind: 'widget', type, members: [{ name: 'text', kind: 'value', type: 'text' }] };
    if (type === 'button') return { name, kind: 'widget', type, members: [{ name: 'label', kind: 'value', type: 'text' }] };
    return { name, kind: 'widget', type, members: [] };
  }

  /** A row of a table or list: its columns, when its data source is known. */
  private rowEntry(pageId: string, item: LayoutItem): ScopeEntry {
    const dataSourceId = propNumber(item.props, 'dataSourceId', NaN);
    const columns = isTemplate(item.props?.[ITEMS_PROP]) ? null : this.data.sources().find((s) => s.id === dataSourceId)?.columns;
    return {
      name: 'row', kind: 'value', type: 'row',
      members: columns ? [{ name: ROW_ID, kind: 'field', type: 'row id' }, ...columns.filter((c) => IDENTIFIER.test(c)).map((c) => ({
        name: c, kind: 'field' as const, type: 'column',
      }))] : undefined,
    };
  }
}

export function variableEntry(name: string, type: VariableType): ScopeEntry {
  const open = type === 'object';
  return { name, kind: 'variable', type: `${type} variable`, members: open ? undefined : [] };
}

/** One row as expressions see it (columns as text), e.g. the row a trigger fired for. */
export function rowValue(table: TableData, rowId: string): Record<string, unknown> | null {
  const row = table.rows.find((r) => r.id === rowId);
  return row ? rowObject(table.columns, row) : null;
}
