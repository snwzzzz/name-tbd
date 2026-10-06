import { Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { APP_VARIABLES, AppVariables } from '../ports/app-ports';
import { FlowVariables, VariableDefinition, coerceToType, displayText, initialValue } from '../../../flow-engine';

/** The key app variables' values are kept under (pages' under their id). */
const APP = '@app';

/** A variable that took a new value (the `variable_change` trigger). */
export interface VariableChange {
  pageId: string;
  name: string;
  value: unknown;
}

const NO_VARIABLES: AppVariables = { app: signal<VariableDefinition[]>([]), page: () => [] };

/**
 * The values of the app's variables while the app runs: each starts at its initial value; flows
 * set them (`set_variable`, an HTTP request's result). A page sees its own variables and the app's
 * (its own hide an app variable of the same name). Reading a value is reactive, so widgets bound to
 * a variable follow it. A page's own variables start afresh whenever the page is opened.
 */
@Injectable({ providedIn: 'root' })
export class VariablesService implements FlowVariables {
  private readonly definitions = inject(APP_VARIABLES, { optional: true }) ?? NO_VARIABLES;
  // Values set while the app runs, by owner (APP or a page id) and name
  private readonly values = signal<Record<string, Record<string, unknown>>>({});
  private readonly changes = new Subject<VariableChange>();
  readonly changes$ = this.changes.asObservable();

  /** The variables a page sees: its own, then the app's it doesn't hide. */
  visible(pageId: string): VariableDefinition[] {
    const own = this.definitions.page(pageId);
    return [...own, ...this.definitions.app().filter((v) => !own.some((o) => o.name === v.name))];
  }

  get(pageId: string, name: string): unknown {
    const { owner, definition } = this.find(pageId, name);
    const values = this.values()[owner];
    return values && name in values ? values[name] : initialValue(definition);
  }

  set(pageId: string, name: string, value: unknown): void {
    const { owner, definition } = this.find(pageId, name);
    let typed: unknown;
    try {
      typed = coerceToType(value, definition.type);
    } catch (err) {
      throw new Error(`${name} can't take that value: ${(err as Error).message}`);
    }
    const before = this.get(pageId, name);
    this.values.update((all) => ({ ...all, [owner]: { ...all[owner], [name]: typed } }));
    if (displayText(before) !== displayText(typed)) this.changes.next({ pageId, name, value: typed });
  }

  /** The page's own variables go back to their initial values (it was opened again). */
  resetPage(pageId: string): void {
    this.values.update((all) => {
      const { [pageId]: _, ...rest } = all;
      return rest;
    });
  }

  /** Every variable back to its initial value (e.g. the preview stopped). */
  reset(): void {
    this.values.set({});
  }

  private find(pageId: string, name: string): { owner: string; definition: VariableDefinition } {
    const own = this.definitions.page(pageId).find((v) => v.name === name);
    if (own) return { owner: pageId, definition: own };
    const app = this.definitions.app().find((v) => v.name === name);
    if (app) return { owner: APP, definition: app };
    throw new Error(`There is no variable "${name}"`);
  }
}
