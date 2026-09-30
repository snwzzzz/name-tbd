import { Component, computed, inject } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { PagesStateService } from '../../_services/pages-state.service';
import { PageNavigationService } from '../../_services/page-navigation.service';
import { PreviewSessionService } from '../../_services/preview-session.service';
import { TabsService } from '../../_services/tabs.service';
import { parseJsonList, propBool } from '../../_utils/widget-props.utils';
import { PageDto } from '../../api/models';

export const NAV_DEFAULT_COLOR = '#1f1f1f';

/**
 * A `<nav>` with links to the chosen pages, in the chosen order, marking the page that's open.
 * Links are only followed while previewing (like the Link widget).
 */
@Component({
  selector: 'app-nav-widget',
  templateUrl: './nav-widget.html',
  styleUrl: './nav-widget.scss',
})
export class NavWidget extends BaseWidget {
  private readonly pages = inject(PagesStateService);
  private readonly navigation = inject(PageNavigationService);
  private readonly tabs = inject(TabsService);
  readonly previewing = inject(PreviewSessionService).active;

  readonly vertical = computed(() => propBool(this.props(), 'vertical', false));
  readonly highlightCurrent = computed(() => propBool(this.props(), 'highlightCurrent', true));
  readonly color = computed(() => this.text('color') ?? NAV_DEFAULT_COLOR);

  /** The chosen pages that still exist, in their order. */
  readonly links = computed(() =>
    parseJsonList(this.props()['pages'])
      .map((id) => this.pages.page(Number(id)))
      .filter((page): page is PageDto => !!page),
  );

  constructor() {
    super();
    this.pages.ensureLoaded();
  }

  isCurrent(page: PageDto): boolean {
    return this.highlightCurrent() && String(page.id) === this.tabs.activeTabId();
  }

  follow(event: MouseEvent, page: PageDto): void {
    event.preventDefault();
    if (this.previewing()) this.navigation.openPage(page.id!);
  }
}
