import { Component, computed, effect, inject, untracked } from '@angular/core';
import { LayoutStateService } from '../../../_services/layout-state.service';
import { PagesStateService } from '../../../_services/pages-state.service';
import { PreviewSessionService } from '../../../_services/preview-session.service';
import { TabsService } from '../../../_services/tabs.service';
import { WidgetGrid } from '../../../core/rendering/widget-grid/widget-grid';

/**
 * The layout page's widgets (navbar, sidebar, ...), drawn under the open page's own grid in the
 * same cells. Faded and untouchable while editing; they work like the page's widgets in a preview.
 * Not shown on the layout page itself, which edits them.
 */
@Component({
  selector: 'app-layout-overlay',
  imports: [WidgetGrid],
  template: `<app-widget-grid [items]="items()" />`,
  styleUrl: './layout-overlay.scss',
  host: { '[class.interactive]': 'previewing()', '[class.hidden]': '!layoutPageId()' },
})
export class LayoutOverlay {
  private readonly layoutState = inject(LayoutStateService);
  private readonly pages = inject(PagesStateService);
  private readonly tabs = inject(TabsService);
  readonly previewing = inject(PreviewSessionService).active;

  /** The layout page's id, unless it's the page being edited. */
  readonly layoutPageId = computed(() => {
    const id = this.pages.layoutPage()?.id;
    return id != null && String(id) !== this.tabs.activeTabId() ? String(id) : null;
  });
  readonly items = computed(() => {
    const id = this.layoutPageId();
    return id ? this.layoutState.getLayout(id) : [];
  });

  constructor() {
    this.pages.ensureLoaded();
    effect(() => {
      const id = this.layoutPageId();
      if (id) untracked(() => this.layoutState.loadLayoutForTab(id).subscribe({
        error: (err) => console.error('Failed to load the layout page', err),
      }));
    });
  }
}
