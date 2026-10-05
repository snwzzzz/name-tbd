import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucideTrash2 } from '@lucide/angular';
import { VariablesStateService } from '../../_services/variables-state.service';
import { PagesStateService } from '../../_services/pages-state.service';
import { TabsService } from '../../_services/tabs.service';
import { PreviewSessionService } from '../../_services/preview-session.service';
import { UiSelect } from '../../components/ui-select/ui-select';
import { SelectOption } from '../../_types/select.types';
import { VariablesService } from '../../core/variables/variables.service';
import { APP_LAYOUT } from '../../core/ports/app-ports';
import { IDENTIFIER, RESERVED_NAMES, widgetName } from '../../core/expressions/expression-scope.service';
import { flattenTree } from '../../_utils/layout-tree.utils';
import { VARIABLE_TYPES, VariableDefinition, VariableType, displayText, initialValueError } from '../../../flow-engine';

export type VariableOwner = 'app' | 'page';

/** What's wrong with a variable next to the others of its list, or null. */
export function variableProblem(variable: VariableDefinition, others: VariableDefinition[]): string | null {
  if (!IDENTIFIER.test(variable.name)) return 'Letters, digits and _ only, not starting with a digit';
  if (RESERVED_NAMES.has(variable.name)) return `"${variable.name}" is taken by expressions`;
  if (others.some((o) => o.name === variable.name)) return 'Another variable has this name';
  return initialValueError(variable);
}

const listProblem = (list: VariableDefinition[]) =>
  list.some((v, i) => variableProblem(v, list.filter((_, j) => j !== i)));

/**
 * The sidebar's Variables tab: the app's variables (every page sees them) and the open page's own.
 * Each has a name (used in expressions), a type and an initial value; flows change them while the
 * app runs (Set variable, an HTTP request's answer), and widgets bound to them follow. A change is
 * saved once the whole list is valid; until then it's a draft showing what's wrong. While
 * previewing, each variable shows its value now.
 */
@Component({
  selector: 'app-variables-panel',
  imports: [FormsModule, NgTemplateOutlet, UiSelect, LucidePlus, LucideTrash2],
  templateUrl: './variables-panel.html',
  styleUrl: './variables-panel.scss',
})
export class VariablesPanel {
  private readonly state = inject(VariablesStateService);
  private readonly pages = inject(PagesStateService);
  private readonly tabs = inject(TabsService);
  private readonly layout = inject(APP_LAYOUT);
  private readonly values = inject(VariablesService);
  readonly preview = inject(PreviewSessionService);

  readonly types: SelectOption[] = VARIABLE_TYPES.map((t) => ({ value: t.id, label: t.label }));
  // Lists being edited that aren't valid yet, by owner
  private readonly drafts = signal<Partial<Record<VariableOwner, VariableDefinition[]>>>({});

  constructor() {
    this.state.ensureLoaded();
  }

  /** The page open in the editor, if the tab is a page. */
  readonly page = computed(() => {
    const id = Number(this.tabs.activeTabId());
    return Number.isInteger(id) ? this.pages.page(id) ?? null : null;
  });
  readonly appVariables = computed(() => this.drafts().app ?? this.state.app());
  readonly pageVariables = computed(() => {
    const page = this.page();
    return this.drafts().page ?? (page ? this.state.page(String(page.id)) : []);
  });
  /** Widget names on the open page: a variable of the same name hides the widget in expressions. */
  private readonly widgetNames = computed(() => {
    const page = this.page();
    return new Set(page ? flattenTree(this.layout.items(String(page.id))).map(widgetName) : []);
  });

  problem(owner: VariableOwner, index: number): string | null {
    const list = this.list(owner);
    const problem = variableProblem(list[index], list.filter((_, i) => i !== index));
    if (problem) return problem;
    return this.widgetNames().has(list[index].name) ? `Hides the widget ${list[index].name} in expressions` : null;
  }

  /** The value now, while previewing. */
  current(variable: VariableDefinition): string | null {
    const pageId = this.preview.pageId();
    if (!pageId) return null;
    try {
      return displayText(this.values.get(pageId, variable.name)) || '(empty)';
    } catch {
      return null;
    }
  }

  add(owner: VariableOwner): void {
    const list = this.list(owner);
    let n = list.length + 1;
    while (list.some((v) => v.name === `variable${n}`)) n++;
    this.edit(owner, [...list, { name: `variable${n}`, type: 'text', initial: '' }]);
  }

  change(owner: VariableOwner, index: number, patch: Partial<VariableDefinition>): void {
    // A new type starts with that type's empty value
    const reset = patch.type ? { initial: '' } : {};
    this.edit(owner, this.list(owner).map((v, i) => (i === index ? { ...v, ...patch, ...reset } : v)));
  }

  setType(owner: VariableOwner, index: number, type: string): void {
    this.change(owner, index, { type: type as VariableType });
  }

  remove(owner: VariableOwner, index: number): void {
    this.edit(owner, this.list(owner).filter((_, i) => i !== index));
  }

  private list(owner: VariableOwner): VariableDefinition[] {
    return owner === 'app' ? this.appVariables() : this.pageVariables();
  }

  private edit(owner: VariableOwner, list: VariableDefinition[]): void {
    if (listProblem(list)) {
      this.drafts.update((d) => ({ ...d, [owner]: list }));
      return;
    }
    this.drafts.update((d) => ({ ...d, [owner]: undefined }));
    if (owner === 'app') this.state.saveApp(list);
    else if (this.page()) this.state.savePage(String(this.page()!.id), list);
  }
}
