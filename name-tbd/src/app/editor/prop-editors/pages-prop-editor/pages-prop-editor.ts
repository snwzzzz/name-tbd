import { Component, computed, inject } from '@angular/core';
import { BasePropEditor } from '../../../_directives/base-prop-editor.directive';
import { PagesStateService } from '../../../_services/pages-state.service';
import { ChecklistItem, OrderedChecklist } from '../../../components/ordered-checklist/ordered-checklist';
import { parseJsonList } from '../../../_utils/widget-props.utils';

/** Chooses and orders several of the project's pages (prop type 'pages'); stores their ids as a JSON array. */
@Component({
  selector: 'app-pages-prop-editor',
  imports: [OrderedChecklist],
  template: `
    @if (items().length) {
      <app-ordered-checklist [items]="items()" (changed)="save($event)" />
    } @else {
      <p class="hint">Create some pages first.</p>
    }
  `,
  styleUrl: '../prop-editor.scss',
})
export class PagesPropEditor extends BasePropEditor {
  private readonly pages = inject(PagesStateService);

  /** Chosen pages first, in their order, then the others. */
  readonly items = computed<ChecklistItem[]>(() => {
    const chosen = parseJsonList(this.value());
    const all = this.pages.contentPages().map((page) => ({ id: String(page.id), label: page.name ?? `Page ${page.id}` }));
    const picked = chosen.map((id) => all.find((page) => page.id === id)).filter((page) => !!page);
    const others = all.filter((page) => !chosen.includes(page.id));
    return [...picked.map((p) => ({ ...p, checked: true })), ...others.map((p) => ({ ...p, checked: false }))];
  });

  constructor() {
    super();
    this.pages.ensureLoaded();
  }

  save(items: ChecklistItem[]): void {
    this.update(JSON.stringify(items.filter((item) => item.checked).map((item) => item.id)));
  }
}
