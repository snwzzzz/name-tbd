import { Component, ElementRef, computed, inject } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { ActiveTabsService } from '../../core/services/active-tabs.service';
import { tabNames } from '../../core/rendering/containers';
import { headerRowsOf } from '../../core/catalog/widget-catalog';
import { CELL_SIZE } from '../../_constants/artboard.constants';

/**
 * The tab bar of a tabs widget, in its header rows; the widgets of the tab shown sit in its nested
 * grid below (see visibleChildren). Clicking a tab shows it, while the app runs and while editing
 * alike (to lay out each tab). Arrow keys, Home and End move between tabs.
 */
@Component({
  selector: 'app-tabs-widget',
  template: `
    <div class="tabbar" role="tablist" [style.height.px]="headerHeight">
      @for (name of names(); track $index) {
        <button
          type="button"
          role="tab"
          class="tab"
          [id]="tabId($index)"
          [class.active]="$index === active()"
          [attr.aria-selected]="$index === active()"
          [attr.tabindex]="$index === active() ? 0 : -1"
          (click)="select($index)"
          (keydown)="onKey($event, $index)">
          {{ name }}
        </button>
      }
    </div>
  `,
  styleUrl: './tabs-widget.scss',
})
export class TabsWidget extends BaseWidget {
  private readonly tabs = inject(ActiveTabsService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly headerHeight = headerRowsOf('tabs') * CELL_SIZE;
  readonly names = computed(() => tabNames(this.props()));
  readonly active = computed(() => Math.min(this.tabs.active(this.id()), this.names().length - 1));

  tabId(index: number): string {
    return `tabs-${this.id()}-tab-${index}`;
  }

  select(index: number): void {
    this.tabs.select(this.id(), index);
  }

  onKey(event: KeyboardEvent, index: number): void {
    const last = this.names().length - 1;
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = next > last ? 0 : next < 0 ? last : next;
    this.select(target);
    this.host.querySelectorAll<HTMLElement>('[role="tab"]')[target]?.focus();
  }
}
