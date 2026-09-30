import { Component, computed, signal } from '@angular/core';
import { LucideFileChartColumn, LucideLayoutList } from '@lucide/angular';
import { IconButton } from '../../components/icon-button/icon-button';
import { ComponentList } from '../component-list/component-list';
import { ResizeHandle } from '../../_directives/resize-handle.directive';
import { SidebarTab } from '../../_types/canvas.types';

const COLLAPSED_WIDTH = 48;
const DEFAULT_WIDTH = 300;
const MIN_WIDTH = 200;

/** Left sidebar: the component palette (and, later, layers). */
@Component({
  selector: 'app-resource-navigation',
  imports: [IconButton, ComponentList, ResizeHandle],
  templateUrl: './resource-navigation.html',
  styleUrl: './resource-navigation.scss',
})
export class ResourceNavigation {
  readonly componentsIcon = LucideLayoutList;
  readonly layersIcon = LucideFileChartColumn;
  readonly minWidth = MIN_WIDTH;

  readonly activeTab = signal<SidebarTab | null>('components');
  readonly width = signal(DEFAULT_WIDTH);
  readonly resizing = signal(false);

  readonly expanded = computed(() => this.activeTab() !== null);
  readonly renderedWidth = computed(() => (this.expanded() ? this.width() : COLLAPSED_WIDTH));

  /** Clicking the active tab collapses the sidebar. */
  selectTab(tab: SidebarTab): void {
    if (this.activeTab() === tab) {
      this.activeTab.set(null);
      return;
    }
    this.activeTab.set(tab);
    if (this.width() < MIN_WIDTH) this.width.set(DEFAULT_WIDTH);
  }
}
