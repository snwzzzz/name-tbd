import { Component, HostAttributeToken, computed, effect, inject, signal, untracked } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { IconButton } from '../../components/icon-button/icon-button';
import { TabsService } from '../../_services/tabs.service';
import { LucideMaximize2 } from '@lucide/angular';
import { ResizeHandle } from '../../_directives/resize-handle.directive';
import { SidebarStateService } from '../../_services/sidebar-state.service';
import { SIDEBAR_TABS } from '../../_constants/sidebar-tabs.constants';
import { SidebarSide, SidebarTabDefinition } from '../../_types/sidebar.types';
import { isWidthBetween, persistedSignal } from '../../_utils/storage.utils';

const COLLAPSED_WIDTH = 48;
const MAX_WIDTH = 800;
const SIZES: Record<SidebarSide, { default: number; min: number }> = {
  left: { default: 300, min: 200 },
  right: { default: 320, min: 240 },
};

/**
 * One of the editor's sidebars (`<app-sidebar side="left" />`): an icon bar of tabs and the open
 * tab's panel. Tabs can be dragged to reorder them or into the other sidebar's icon bar.
 */
@Component({
  selector: 'app-sidebar',
  imports: [NgComponentOutlet, CdkDropList, CdkDrag, IconButton, ResizeHandle, LucideMaximize2],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  host: { '[class]': "'side-' + side" },
})
export class Sidebar {
  private readonly state = inject(SidebarStateService);
  private readonly editorTabs = inject(TabsService);

  /** Static attribute, so the saved width can be set up while constructing. */
  readonly side = inject(new HostAttributeToken('side')) as SidebarSide;
  readonly listId = `sidebar-tabs-${this.side}`;
  readonly otherListId = `sidebar-tabs-${this.side === 'left' ? 'right' : 'left'}`;
  readonly minWidth = SIZES[this.side].min;
  readonly maxWidth = MAX_WIDTH;

  readonly width = persistedSignal(`sidebar-${this.side}-width`, SIZES[this.side].default, isWidthBetween(this.minWidth, MAX_WIDTH));
  readonly resizing = signal(false);

  readonly tabs = computed(() =>
    this.state.tabIds(this.side)
      .map((id) => SIDEBAR_TABS.find((tab) => tab.id === id))
      .filter((tab): tab is SidebarTabDefinition => !!tab),
  );
  readonly activeTab = this.state.activeTab(this.side);
  readonly activeDefinition = computed(() => this.tabs().find((tab) => tab.id === this.activeTab()) ?? null);
  readonly expanded = computed(() => this.activeDefinition() !== null);
  readonly renderedWidth = computed(() => (this.expanded() ? this.width() : COLLAPSED_WIDTH));

  /** Set while an icon is dragged, so the click that ends the drag doesn't also toggle a tab. */
  private dragging = false;

  constructor() {
    this.state.sync(SIDEBAR_TABS);

    // A tab that's opened (clicked, moved here, opened from elsewhere) widens the sidebar to its
    // preferred width; the width restored on load is left as it was
    let previous = untracked(this.activeDefinition);
    effect(() => {
      const tab = this.activeDefinition();
      if (tab === previous) return;
      previous = tab;
      const preferred = Math.min(MAX_WIDTH, tab?.preferredWidth ?? this.minWidth);
      if (tab && untracked(this.width) < preferred) this.width.set(preferred);
    });
  }

  select(tabId: string): void {
    if (!this.dragging) this.state.select(this.side, tabId);
  }

  onDragStarted(): void {
    this.dragging = true;
  }

  onDragEnded(): void {
    // The click event comes right after the drop
    setTimeout(() => (this.dragging = false));
  }

  /** Opens the open panel as a tab of its own (for panels that allow it, see openInTab). */
  openInTab(tab: SidebarTabDefinition): void {
    this.editorTabs.openPanel(tab.id, tab.label);
  }

  drop(event: CdkDragDrop<SidebarSide>): void {
    this.state.move(event.item.data, this.side, event.currentIndex);
  }
}
