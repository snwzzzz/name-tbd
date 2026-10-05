import { Component, computed, inject, input, signal } from '@angular/core';
import { SelectionService } from '../../_services/selection.service';
import { LayoutStateService } from '../../_services/layout-state.service';
import { LayoutItem } from '../../_types/layout.types';
import { flattenTree } from '../../_utils/layout-tree.utils';
import { IDENTIFIER, RESERVED_NAMES, widgetName } from '../../core/expressions/expression-scope.service';

/** What's wrong with a widget name on its page (the other widgets' names given), or null. */
export function widgetNameProblem(name: string, others: string[]): string | null {
  if (!IDENTIFIER.test(name)) return 'Letters, digits and _ only, not starting with a digit';
  if (RESERVED_NAMES.has(name)) return `"${name}" is taken by expressions`;
  if (others.includes(name)) return 'Another widget on this page has this name';
  return null;
}

/**
 * A widget's name, by which expressions use it (e.g. `orderForm.amount`). Saved once it's valid:
 * letters, digits and _, unique on the page.
 */
@Component({
  selector: 'app-widget-name-field',
  template: `
    <label class="ui-field-label" [attr.for]="'widget-name-' + item().id">Name (in expressions)</label>
    <input
      class="ui-input name"
      spellcheck="false"
      [id]="'widget-name-' + item().id"
      [class.invalid]="!!problem()"
      [value]="name()"
      (input)="typed.set($any($event.target).value)"
      (change)="save($any($event.target).value)" />
    @if (problem(); as problem) { <p class="problem">{{ problem }}</p> }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem; }
    .name { font-family: 'JetBrains Mono', monospace; }
    .invalid { border-color: var(--color-danger); }
    .problem { margin: 0; color: var(--color-danger); font-size: var(--font-size-xs); }
  `,
})
export class WidgetNameField {
  private readonly selection = inject(SelectionService);
  private readonly layoutState = inject(LayoutStateService);

  readonly item = input.required<LayoutItem>();
  readonly pageId = input.required<string>();
  readonly typed = signal<string | null>(null);

  readonly name = computed(() => widgetName(this.item()));
  private readonly others = computed(() =>
    flattenTree(this.layoutState.getLayout(this.pageId()))
      .filter((other) => String(other.id) !== String(this.item().id))
      .map(widgetName));
  readonly problem = computed(() => {
    const typed = this.typed();
    return typed === null ? null : widgetNameProblem(typed.trim(), this.others());
  });

  save(value: string): void {
    const name = value.trim();
    if (widgetNameProblem(name, this.others())) return;
    this.typed.set(null);
    if (name !== this.name()) this.selection.updateProps({ ...this.item().props, name }, String(this.item().id));
  }
}
