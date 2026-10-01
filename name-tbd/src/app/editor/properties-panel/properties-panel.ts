import { Component, computed, inject } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { LucideCheck, LucideCircleAlert, LucideMousePointerClick } from '@lucide/angular';
import { SelectionService } from '../../_services/selection.service';
import { LayoutStateService } from '../../_services/layout-state.service';
import { PropsAutosaveService } from '../../_services/props-autosave.service';
import { TabsService } from '../../_services/tabs.service';
import { WidgetRegistryService } from '../../_services/widget-registry.service';
import { widgetDefinition } from '../../_constants/widget-registry.constants';
import { DynamicSettings } from '../dynamic-settings/dynamic-settings';
import { findInTree } from '../../_utils/layout-tree.utils';

/** Edits the props of the widget selected on the canvas; edits are saved by themselves. */
@Component({
  selector: 'app-properties-panel',
  imports: [
    NgComponentOutlet, DynamicSettings,
    LucideCheck, LucideCircleAlert, LucideMousePointerClick,
  ],
  templateUrl: './properties-panel.html',
  styleUrl: './properties-panel.scss',
})
export class PropertiesPanel {
  private readonly selection = inject(SelectionService);
  private readonly layoutState = inject(LayoutStateService);
  private readonly tabs = inject(TabsService);
  private readonly registry = inject(WidgetRegistryService);
  private readonly autosave = inject(PropsAutosaveService);

  readonly selectedItem = computed(() => {
    const id = this.selection.selectedId();
    const tabId = this.tabs.activeTabId();
    return id && tabId ? findInTree(this.layoutState.getLayout(tabId), id) : null;
  });

  readonly definition = computed(() => widgetDefinition(this.selectedItem()?.type));
  readonly hasDynamicSettings = computed(
    () => this.registry.getPropsForWidget(this.selectedItem()?.type ?? '').length > 0,
  );

  /** Whether edits are waiting, being saved, saved, or failed to save. */
  readonly saveState = this.autosave.state;

  /** Saves what's waiting now (also the way to retry after an error). */
  saveNow(): void {
    this.autosave.flush();
  }
}
