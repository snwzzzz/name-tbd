import { Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDatabase, LucideFileText, LucideVariable } from '@lucide/angular';
import { BaseActionEditor } from '../../_directives/base-action-editor.directive';
import { UiSelect } from '../../components/ui-select/ui-select';
import { ExpressionInput } from '../../components/expression-input/expression-input';
import { ValueRow, ValueRows } from './value-rows';
import { SelectOption } from '../../_types/select.types';
import {
  CreateRowConfig, DeleteRowConfig, HttpRequestConfig, LoopConfig, NavigateConfig, SetVariableConfig, ShowMessageConfig,
  UpdateRowConfig,
} from '../../_types/workflow.types';
import { VariablesService } from '../../core/variables/variables.service';
import { APP_DATA } from '../../core/ports/app-ports';
import { PagesStateService } from '../../_services/pages-state.service';
import { HTTP_METHODS } from '../../../flow-engine';

/** Examples in the fields (here, as `{{` in a template would be Angular's own). */
const PLACEHOLDERS = {
  value: 'e.g. {{ count + 1 }}',
  message: 'e.g. Saved {{ orderForm.customer }}',
  row: 'e.g. {{ orders.selectedRow }}',
  body: 'Text, or {{ {"amount": orderForm.amount} }} for JSON',
};

// Settings of the actions for logic, data and calls: values are templates (text, or `{{ … }}` for
// a computed value), a loop's list is an expression.

/** The variables a page sees, for pickers. */
function variableOptions(variables: VariablesService, pageId: string): SelectOption[] {
  return variables.visible(pageId).map((v) => ({ value: v.name, label: `${v.name} (${v.type})`, icon: LucideVariable }));
}

/** `set_variable`: the variable and its new value. */
@Component({
  selector: 'app-set-variable-editor',
  imports: [FormsModule, UiSelect, ExpressionInput],
  template: `
    <label class="field-label">Variable</label>
    @if (options().length) {
      <app-select size="sm" placeholder="Select a variable…" [options]="options()" [ngModel]="config().variable" (ngModelChange)="update()({ variable: $event })" />
    } @else {
      <p class="hint">Add a variable in the Variables panel first.</p>
    }
    <label class="field-label">New value</label>
    <app-expression-input label="New value" [placeholder]="placeholders.value" [scope]="scope()" [value]="config().value" (valueChange)="update()({ value: $event })" />
  `,
  styleUrl: './action-editor.scss',
})
export class SetVariableEditor extends BaseActionEditor<SetVariableConfig> {
  readonly placeholders = PLACEHOLDERS;
  private readonly variables = inject(VariablesService);
  readonly options = computed(() => variableOptions(this.variables, this.pageId()));
}

/** `loop`: the list, and the name each item has in the `each` branch. */
@Component({
  selector: 'app-loop-editor',
  imports: [FormsModule, ExpressionInput],
  template: `
    <label class="field-label">For each item of</label>
    <app-expression-input mode="expression" label="List" placeholder="e.g. orders.selectedRows" [scope]="scope()" [value]="config().items" (valueChange)="update()({ items: $event })" />
    <label class="field-label">Call each item</label>
    <input class="node-input" placeholder="item" [ngModel]="config().as" (ngModelChange)="update()({ as: $event })" />
    <p class="hint">The branch from “For each” runs once per item ({{ config().as || 'item' }}, and index from 0), then “Done”.</p>
  `,
  styleUrl: './action-editor.scss',
})
export class LoopEditor extends BaseActionEditor<LoopConfig> {}

/** `navigate`: the page to open and its parameters. */
@Component({
  selector: 'app-navigate-editor',
  imports: [FormsModule, UiSelect, ValueRows],
  template: `
    <label class="field-label">Page</label>
    <app-select size="sm" placeholder="Select a page…" [options]="pageOptions()" [ngModel]="config().pageId" (ngModelChange)="update()({ pageId: $event })" />
    <label class="field-label">Parameters (params.name there)</label>
    <app-value-rows addLabel="Add parameter" [scope]="scope()" [rows]="params()" (changed)="setParams($event)" />
  `,
  styleUrl: './action-editor.scss',
})
export class NavigateEditor extends BaseActionEditor<NavigateConfig> {
  private readonly pages = inject(PagesStateService);
  readonly pageOptions = computed<SelectOption[]>(() =>
    this.pages.contentPages().map((p) => ({ value: String(p.id), label: p.name ?? `Page ${p.id}`, icon: LucideFileText })));
  readonly params = computed<ValueRow[]>(() => (this.config().params ?? []).map((p) => ({ key: p.name, value: p.value })));

  setParams(rows: ValueRow[]): void {
    this.update()({ params: rows.map((r) => ({ name: r.key, value: r.value })) });
  }
}

/** `show_message`: the text and how it looks. */
@Component({
  selector: 'app-show-message-editor',
  imports: [FormsModule, UiSelect, ExpressionInput],
  template: `
    <label class="field-label">Message</label>
    <app-expression-input label="Message" [placeholder]="placeholders.message" [scope]="scope()" [value]="config().message" (valueChange)="update()({ message: $event })" />
    <label class="field-label">Kind</label>
    <app-select size="sm" [options]="tones" [ngModel]="config().tone" (ngModelChange)="update()({ tone: $event })" />
  `,
  styleUrl: './action-editor.scss',
})
export class ShowMessageEditor extends BaseActionEditor<ShowMessageConfig> {
  readonly placeholders = PLACEHOLDERS;
  readonly tones: SelectOption[] = [
    { value: 'info', label: 'Information' },
    { value: 'success', label: 'Success' },
    { value: 'warning', label: 'Warning' },
    { value: 'error', label: 'Error' },
  ];
}

type RowConfig = CreateRowConfig | UpdateRowConfig | DeleteRowConfig;

/** `create_row`, `update_row`, `delete_row`: the data source, the row (update, delete) and the column values (create, update). */
@Component({
  selector: 'app-row-action-editor',
  imports: [FormsModule, UiSelect, ExpressionInput, ValueRows],
  template: `
    <label class="field-label">Data source</label>
    <app-select size="sm" placeholder="Select a data source…" [options]="sourceOptions()" [ngModel]="config().dataSourceId" (ngModelChange)="update()({ dataSourceId: $event })" />
    @if (hasRow()) {
      <label class="field-label">Row</label>
      <app-expression-input label="Row" [placeholder]="placeholders.row" [scope]="scope()" [value]="row()" (valueChange)="setRow($event)" />
    }
    @if (hasValues()) {
      <label class="field-label">Values</label>
      <app-value-rows keyPlaceholder="Column" addLabel="Add column" [keyOptions]="columnOptions()" [scope]="scope()" [rows]="values()" (changed)="setValues($event)" />
    }
  `,
  styleUrl: './action-editor.scss',
})
export class RowActionEditor extends BaseActionEditor<RowConfig> {
  readonly placeholders = PLACEHOLDERS;
  private readonly data = inject(APP_DATA);

  readonly sourceOptions = computed<SelectOption[]>(() =>
    this.data.sources().map((s) => ({ value: String(s.id), label: s.name, icon: LucideDatabase })));
  readonly columnOptions = computed<SelectOption[]>(() =>
    (this.data.sources().find((s) => String(s.id) === this.config().dataSourceId)?.columns ?? []).map((c) => ({ value: c, label: c })));
  readonly hasRow = computed(() => 'row' in this.config());
  readonly hasValues = computed(() => 'values' in this.config());
  readonly row = computed(() => (this.config() as UpdateRowConfig).row ?? '');
  readonly values = computed<ValueRow[]>(() => ((this.config() as CreateRowConfig).values ?? []).map((v) => ({ key: v.column, value: v.value })));

  setRow(row: string): void {
    this.update()({ row } as Partial<RowConfig>);
  }

  setValues(rows: ValueRow[]): void {
    this.update()({ values: rows.map((r) => ({ column: r.key, value: r.value })) } as Partial<RowConfig>);
  }
}

/** `http_request`: method, URL, headers, body, and the variable the answer goes into. */
@Component({
  selector: 'app-http-request-editor',
  imports: [FormsModule, UiSelect, ExpressionInput, ValueRows],
  template: `
    <div class="method-row">
      <app-select size="sm" [options]="methods" [ngModel]="config().method" (ngModelChange)="update()({ method: $event })" />
      <app-expression-input label="URL" placeholder="https://…" [scope]="scope()" [value]="config().url" (valueChange)="update()({ url: $event })" />
    </div>
    <label class="field-label">Headers</label>
    <app-value-rows keyPlaceholder="Header" addLabel="Add header" [scope]="scope()" [rows]="headers()" (changed)="setHeaders($event)" />
    @if (config().method !== 'GET') {
      <label class="field-label">Body</label>
      <app-expression-input label="Body" [multiline]="true" [placeholder]="placeholders.body" [scope]="scope()" [value]="config().body" (valueChange)="update()({ body: $event })" />
    }
    <label class="field-label">Answer into</label>
    @if (options().length) {
      <app-select size="sm" placeholder="No variable" [options]="options()" [ngModel]="config().resultVariable" (ngModelChange)="update()({ resultVariable: $event })" />
    } @else {
      <p class="hint">Add a variable in the Variables panel first.</p>
    }
    <p class="hint">After it, response.status and response.data; when it fails, “Failed” runs with error.</p>
  `,
  styles: `.method-row { display: grid; grid-template-columns: 5.5rem minmax(0, 1fr); gap: 4px; }`,
  styleUrl: './action-editor.scss',
})
export class HttpRequestEditor extends BaseActionEditor<HttpRequestConfig> {
  readonly placeholders = PLACEHOLDERS;
  private readonly variables = inject(VariablesService);
  readonly methods: SelectOption[] = HTTP_METHODS.map((m) => ({ value: m, label: m }));
  readonly options = computed(() => [{ value: '', label: 'No variable' }, ...variableOptions(this.variables, this.pageId())]);
  readonly headers = computed<ValueRow[]>(() => (this.config().headers ?? []).map((h) => ({ key: h.name, value: h.value })));

  setHeaders(rows: ValueRow[]): void {
    this.update()({ headers: rows.map((r) => ({ name: r.key, value: r.value })) });
  }
}
