import { Component, computed, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { IconButton } from '../../components/icon-button/icon-button';
import { ResizeHandle } from '../../_directives/resize-handle.directive';
import { SidebarTab } from '../../_types/canvas.types';
import { DEFAULT_SIDEBAR_TAB, SIDEBAR_TABS } from '../../_constants/sidebar-tabs.constants';
import { isOneOfOrNull, isWidthBetween, persistedSignal } from '../../_utils/storage.utils';

const COLLAPSED_WIDTH = 48;
const DEFAULT_WIDTH = 300;
const MIN_WIDTH = 200;
const MAX_WIDTH = 800;

/** Left sidebar: shows the panel of the selected tab (see SIDEBAR_TABS). */
@Component({
  selector: 'app-resource-navigation',
  imports: [NgComponentOutlet, IconButton, ResizeHandle],
  templateUrl: './resource-navigation.html',
  styleUrl: './resource-navigation.scss',
})
export class ResourceNavigation {
  readonly tabs = SIDEBAR_TABS;
  readonly minWidth = MIN_WIDTH;

  readonly maxWidth = MAX_WIDTH;

  // The open tab (null: collapsed) and the width are kept across reloads
  readonly activeTab = persistedSignal<SidebarTab | null>(
    'sidebar-left-tab',
    DEFAULT_SIDEBAR_TAB,
    isOneOfOrNull(SIDEBAR_TABS.map((tab) => tab.id)),
  );
  readonly width = persistedSignal('sidebar-left-width', DEFAULT_WIDTH, isWidthBetween(MIN_WIDTH, MAX_WIDTH));
  readonly resizing = signal(false);

  readonly activeDefinition = computed(() => this.tabs.find((tab) => tab.id === this.activeTab()) ?? null);
  readonly expanded = computed(() => this.activeDefinition() !== null);
  readonly renderedWidth = computed(() => (this.expanded() ? this.width() : COLLAPSED_WIDTH));

  /** Clicking the active tab collapses the sidebar; opening a tab widens it to the tab's preferred width. */
  selectTab(tab: SidebarTab): void {
    if (this.activeTab() === tab) {
      this.activeTab.set(null);
      return;
    }
    this.activeTab.set(tab);
    // Grow (never shrink) to the width the tab asks for
    const preferred = Math.min(MAX_WIDTH, this.tabs.find((t) => t.id === tab)?.preferredWidth ?? MIN_WIDTH);
    if (this.width() < preferred) this.width.set(preferred);
  }
}
