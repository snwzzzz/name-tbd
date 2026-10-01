import { Component, computed, inject } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { APP_NAVIGATION, APP_PAGES, APP_SESSION, PageInfo } from '../../core/ports/app-ports';
import { parseJsonList, propBool } from '../../_utils/widget-props.utils';

export const NAV_DEFAULT_COLOR = '#242424';
export const NAV_DEFAULT_ACCENT = '#0f6cbd';

/** How the menu marks the open page (its "Appearance" setting). */
export const NAV_VARIANTS = ['underline', 'pill', 'filled'] as const;
export type NavVariant = (typeof NAV_VARIANTS)[number];

/**
 * A `<nav>` with links to the chosen pages, in the chosen order, marking the page that's open.
 * Links are only followed while the app runs (like the Link widget).
 */
@Component({
  selector: 'app-nav-widget',
  templateUrl: './nav-widget.html',
  styleUrl: './nav-widget.scss',
})
export class NavWidget extends BaseWidget {
  private readonly pages = inject(APP_PAGES);
  private readonly navigation = inject(APP_NAVIGATION);
  readonly previewing = inject(APP_SESSION).live;

  readonly vertical = computed(() => propBool(this.props(), 'vertical', false));
  readonly highlightCurrent = computed(() => propBool(this.props(), 'highlightCurrent', true));
  readonly color = computed(() => this.text('color') ?? NAV_DEFAULT_COLOR);
  readonly accentColor = computed(() => this.text('accentColor') ?? NAV_DEFAULT_ACCENT);
  /** null: transparent, over whatever is behind it. */
  readonly background = computed(() => this.text('background') ?? null);
  readonly variant = computed<NavVariant>(() => {
    const variant = this.text('variant')?.toLowerCase();
    return NAV_VARIANTS.find((v) => v === variant) ?? 'underline';
  });

  /** The chosen pages that still exist, in their order. */
  readonly links = computed(() =>
    parseJsonList(this.props()['pages'])
      .map((id) => this.pages.page(Number(id)))
      .filter((page): page is PageInfo => !!page),
  );

  isCurrent(page: PageInfo): boolean {
    return this.highlightCurrent() && String(page.id) === this.navigation.currentPageId();
  }

  follow(event: MouseEvent, page: PageInfo): void {
    event.preventDefault();
    if (this.previewing()) this.navigation.openPage(page.id);
  }
}
