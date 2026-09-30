import { Component, computed, signal } from '@angular/core';
import { LucideLayers, LucideSettings } from '@lucide/angular';
import { IconButton } from '../../components/icon-button/icon-button';
import { PropertiesPanel } from '../properties-panel/properties-panel';
import { ResizeHandle } from '../../_directives/resize-handle.directive';
import { InspectorTab } from '../../_types/canvas.types';
import { isOneOfOrNull, isWidthBetween, persistedSignal } from '../../_utils/storage.utils';

const COLLAPSED_WIDTH = 48;
const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 240;
const MAX_WIDTH = 800;
const TABS: InspectorTab[] = ['edit', 'layers'];

/** Right sidebar: the selected widget's properties (and, later, layers). */
@Component({
  selector: 'app-inspector-panel',
  imports: [PropertiesPanel, IconButton, ResizeHandle],
  templateUrl: './inspector-panel.html',
  styleUrl: './inspector-panel.scss',
})
export class InspectorPanel {
  readonly editIcon = LucideSettings;
  readonly layersIcon = LucideLayers;
  readonly minWidth = MIN_WIDTH;

  readonly maxWidth = MAX_WIDTH;

  // The open tab (null: collapsed) and the width are kept across reloads
  readonly activeTab = persistedSignal<InspectorTab | null>('sidebar-right-tab', 'edit', isOneOfOrNull(TABS));
  readonly width = persistedSignal('sidebar-right-width', DEFAULT_WIDTH, isWidthBetween(MIN_WIDTH, MAX_WIDTH));
  readonly resizing = signal(false);

  readonly expanded = computed(() => this.activeTab() !== null);
  readonly renderedWidth = computed(() => (this.expanded() ? this.width() : COLLAPSED_WIDTH));

  /** Clicking the active tab collapses the panel. */
  selectTab(tab: InspectorTab): void {
    if (this.activeTab() === tab) {
      this.activeTab.set(null);
      return;
    }
    this.activeTab.set(tab);
    if (this.width() < MIN_WIDTH) this.width.set(DEFAULT_WIDTH);
  }
}
