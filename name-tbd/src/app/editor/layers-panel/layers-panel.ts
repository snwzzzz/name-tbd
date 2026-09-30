import { Component, computed, inject, signal } from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { LucideChevronDown, LucideChevronRight } from '@lucide/angular';
import { LayoutStateService } from '../../_services/layout-state.service';
import { SelectionService } from '../../_services/selection.service';
import { TabsService } from '../../_services/tabs.service';
import { PreviewSessionService } from '../../_services/preview-session.service';
import { SidebarStateService } from '../../_services/sidebar-state.service';
import { PROPERTIES_TAB_ID } from '../../_constants/sidebar.constants';
import { widgetDefinition } from '../../_constants/widget-registry.constants';
import { LayoutItem } from '../../_types/layout.types';
import { layerDetail, layerTypeName, sortLayers } from '../../_utils/layers.utils';
import { flattenTree } from '../../_utils/layout-tree.utils';

/**
 * The widgets of the open page as a tree (containers hold their children). Clicking one selects it;
 * double-clicking also opens its properties.
 */
@Component({
  selector: 'app-layers-panel',
  imports: [NgComponentOutlet, NgTemplateOutlet, LucideChevronDown, LucideChevronRight],
  templateUrl: './layers-panel.html',
  styleUrl: './layers-panel.scss',
})
export class LayersPanel {
  private readonly layoutState = inject(LayoutStateService);
  private readonly selection = inject(SelectionService);
  private readonly tabs = inject(TabsService);
  private readonly sidebars = inject(SidebarStateService);
  private readonly previewing = inject(PreviewSessionService).active;

  readonly selectedId = this.selection.selectedId;
  /** Whether a page is open (the welcome screen has no widgets). */
  readonly hasPage = computed(() => !!this.tabs.activeTabId() && this.tabs.activeMode() !== 'welcome');
  readonly layers = computed(() => {
    const tabId = this.tabs.activeTabId();
    return tabId ? sortLayers(this.layoutState.getLayout(tabId)) : [];
  });
  readonly count = computed(() => flattenTree(this.layers()).length);

  // Containers the user folded, by id
  private readonly collapsed = signal(new Set<string>());

  readonly icon = (item: LayoutItem) => widgetDefinition(item.type).icon;
  readonly typeName = layerTypeName;
  readonly detail = layerDetail;

  key(item: LayoutItem): string {
    return String(item.id);
  }

  isCollapsed(item: LayoutItem): boolean {
    return this.collapsed().has(this.key(item));
  }

  toggle(item: LayoutItem, event: Event): void {
    event.stopPropagation();
    this.collapsed.update((set) => {
      const next = new Set(set);
      if (!next.delete(this.key(item))) next.add(this.key(item));
      return next;
    });
  }

  /** Selects the widget, as clicking it on the canvas would (not while previewing). */
  select(item: LayoutItem): void {
    if (!this.previewing() && item.id != null) this.selection.select(this.key(item));
  }

  /** Selects the widget and shows its properties, in whichever sidebar that tab is. */
  openProperties(item: LayoutItem): void {
    if (this.previewing() || item.id == null) return;
    this.select(item);
    this.sidebars.open(PROPERTIES_TAB_ID);
  }
}
