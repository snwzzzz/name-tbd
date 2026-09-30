import { Component, computed, effect, inject, untracked } from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { LayoutStateService } from '../../../_services/layout-state.service';
import { PagesStateService } from '../../../_services/pages-state.service';
import { PreviewSessionService } from '../../../_services/preview-session.service';
import { TabsService } from '../../../_services/tabs.service';
import { widgetDefinition } from '../../../_constants/widget-registry.constants';
import { GRID_COLUMNS, GRID_ROWS } from '../../../_constants/artboard.constants';
import { LayoutItem, WidgetProps } from '../../../_types/layout.types';

/**
 * The layout page's widgets (navbar, sidebar, ...), drawn under the open page's own grid in the
 * same cells. Faded and untouchable while editing; they work like the page's widgets in a preview.
 * Not shown on the layout page itself, which edits them.
 */
@Component({
  selector: 'app-layout-overlay',
  imports: [NgComponentOutlet, NgTemplateOutlet],
  templateUrl: './layout-overlay.html',
  styleUrl: './layout-overlay.scss',
  host: { '[class.interactive]': 'previewing()', '[class.hidden]': '!layoutPageId()' },
})
export class LayoutOverlay {
  private readonly layoutState = inject(LayoutStateService);
  private readonly pages = inject(PagesStateService);
  private readonly tabs = inject(TabsService);
  readonly previewing = inject(PreviewSessionService).active;

  readonly columns = GRID_COLUMNS;
  readonly rows = GRID_ROWS;

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

  key(item: LayoutItem): string {
    return String(item.id);
  }

  isContainer(item: LayoutItem): boolean {
    return item.type === 'container' || !!item.children?.length;
  }

  component(item: LayoutItem) {
    return widgetDefinition(item.type).component;
  }

  props(item: LayoutItem): WidgetProps {
    return { ...widgetDefinition(item.type).defaultProps, ...item.props };
  }
}
