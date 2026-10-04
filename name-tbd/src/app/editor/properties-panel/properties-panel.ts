import { Component, computed, inject } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { LucideMousePointerClick } from '@lucide/angular';
import { SelectionService } from '../../_services/selection.service';
import { LayoutStateService } from '../../_services/layout-state.service';
import { SaveIndicator } from '../../components/save-indicator/save-indicator';
import { TabsService } from '../../_services/tabs.service';
import { WidgetRegistryService } from '../../_services/widget-registry.service';
import { widgetDefinition } from '../../_constants/widget-registry.constants';
import { DynamicSettings } from '../dynamic-settings/dynamic-settings';
import { findInTree } from '../../_utils/layout-tree.utils';

/**
 * Edits the props of the widgets selected on the canvas, one section per widget (stacked, in the
 * order they were selected, scrolling together); edits are saved by themselves.
 */
@Component({
  selector: 'app-properties-panel',
  imports: [
    NgComponentOutlet, DynamicSettings,
    LucideMousePointerClick, SaveIndicator,
  ],
  templateUrl: './properties-panel.html',
  styleUrl: './properties-panel.scss',
})
export class PropertiesPanel {
  private readonly selection = inject(SelectionService);
  private readonly layoutState = inject(LayoutStateService);
  private readonly tabs = inject(TabsService);
  private readonly registry = inject(WidgetRegistryService);

  /** The selected widgets that are on the open page, each with what its section shows. */
  readonly sections = computed(() => {
    const tabId = this.tabs.activeTabId();
    if (!tabId) return [];
    const layout = this.layoutState.getLayout(tabId);
    return this.selection.selectedIds().flatMap((id) => {
      const item = findInTree(layout, id);
      if (!item) return [];
      return [{
        id,
        item,
        definition: widgetDefinition(item.type),
        hasDynamicSettings: this.registry.getPropsForWidget(item.type ?? '').length > 0,
      }];
    });
  });

  /** Whether edits are waiting, being saved, saved, or failed to save. */

}
