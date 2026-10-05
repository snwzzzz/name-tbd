import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucideX } from '@lucide/angular';
import { UiSelect } from '../../components/ui-select/ui-select';
import { ExpressionInput } from '../../components/expression-input/expression-input';
import { SelectOption } from '../../_types/select.types';
import { ScopeEntry } from '../../../flow-engine';

/** One row: a name (or a column) and its value, a template. */
export interface ValueRow {
  key: string;
  value: string;
}

/**
 * Rows of a name and a value (a page's parameters, an HTTP request's headers, a row's columns),
 * each value a template. Names are typed, or picked from `keyOptions` when given.
 */
@Component({
  selector: 'app-value-rows',
  imports: [FormsModule, UiSelect, ExpressionInput, LucidePlus, LucideX],
  template: `
    @for (row of rows(); track $index; let i = $index) {
      <div class="row">
        @if (keyOptions(); as options) {
          <app-select class="key" size="sm" [placeholder]="keyPlaceholder()" [options]="options" [ngModel]="row.key" (ngModelChange)="set(i, { key: $event })" />
        } @else {
          <input class="node-input key" [placeholder]="keyPlaceholder()" [ngModel]="row.key" (ngModelChange)="set(i, { key: $event })" />
        }
        <app-expression-input class="value" [placeholder]="valuePlaceholder" [scope]="scope()" [value]="row.value" (valueChange)="set(i, { value: $event })" />
        <button type="button" class="remove" title="Remove" (click)="remove(i)"><svg lucideX></svg></button>
      </div>
    }
    <button type="button" class="add" (click)="add()"><svg lucidePlus></svg> {{ addLabel() }}</button>
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 4px; }
    .row { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr) auto; gap: 4px; align-items: start; }
    .node-input {
      min-height: 1.625rem; box-sizing: border-box; padding: 0.1875rem 0.5rem; border: 1px solid transparent;
      border-radius: 0.375rem; background: var(--color-surface-secondary); color: var(--color-text-primary); font: inherit; font-size: 11px;
    }
    .remove, .add {
      display: inline-flex; align-items: center; gap: 4px; border: none; background: none; color: var(--color-text-secondary);
      font-size: 11px; cursor: pointer; padding: 4px;
      svg { width: 12px; height: 12px; }
      &:hover { color: var(--color-text-primary); }
    }
    .add { align-self: flex-start; }
  `,
})
export class ValueRows {
  readonly rows = input.required<ValueRow[]>();
  readonly keyOptions = input<SelectOption[] | null>(null);
  readonly keyPlaceholder = input('Name');
  readonly addLabel = input('Add');
  readonly scope = input<ScopeEntry[]>([]);
  readonly changed = output<ValueRow[]>();
  readonly valuePlaceholder = 'Value, or {{ expression }}';

  set(index: number, patch: Partial<ValueRow>): void {
    this.changed.emit(this.rows().map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  add(): void {
    this.changed.emit([...this.rows(), { key: '', value: '' }]);
  }

  remove(index: number): void {
    this.changed.emit(this.rows().filter((_, i) => i !== index));
  }
}
