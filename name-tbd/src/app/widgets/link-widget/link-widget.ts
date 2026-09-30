import { Component, computed, inject } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { PagesStateService } from '../../_services/pages-state.service';
import { PageNavigationService } from '../../_services/page-navigation.service';
import { PreviewSessionService } from '../../_services/preview-session.service';
import { propBool, propNumber } from '../../_utils/widget-props.utils';

export const LINK_DEFAULT_COLOR = '#2f89ff';

/**
 * A hyperlink (`<a>`) to one of the project's pages, or to a URL when no page is picked.
 * Only followed while previewing: page links open the page there, URLs open in a browser tab.
 */
@Component({
  selector: 'app-link-widget',
  template: `
    <div class="link-wrapper">
      <a
        class="link"
        [class.live]="previewing()"
        [href]="href()"
        [attr.target]="external() && newTab() ? '_blank' : null"
        [attr.rel]="external() ? 'noopener' : null"
        [style.color]="color()"
        (click)="follow($event)">{{ label() }}</a>
    </div>
  `,
  styleUrl: './link-widget.scss',
})
export class LinkWidget extends BaseWidget {
  private readonly pages = inject(PagesStateService);
  private readonly navigation = inject(PageNavigationService);
  readonly previewing = inject(PreviewSessionService).active;

  readonly label = computed(() => this.text('text') ?? 'Link');
  readonly color = computed(() => this.text('color') ?? LINK_DEFAULT_COLOR);
  readonly newTab = computed(() => propBool(this.props(), 'newTab', false));

  readonly pageId = computed(() => {
    const id = propNumber(this.props(), 'pageId', NaN);
    return Number.isInteger(id) ? id : null;
  });
  readonly external = computed(() => this.pageId() === null && !!this.text('url'));
  readonly href = computed(() => {
    const pageId = this.pageId();
    if (pageId !== null) return this.pages.page(pageId)?.path ?? '#';
    return this.text('url') ?? '#';
  });

  constructor() {
    super();
    this.pages.ensureLoaded();
  }

  follow(event: MouseEvent): void {
    // The editor must never navigate away; links are followed by hand, and only in a preview
    event.preventDefault();
    if (!this.previewing()) return;

    const pageId = this.pageId();
    if (pageId !== null) {
      this.navigation.openPage(pageId);
    } else if (this.external()) {
      // Always a new browser tab, so the editor stays open
      window.open(this.href(), '_blank', 'noopener');
    }
  }
}
