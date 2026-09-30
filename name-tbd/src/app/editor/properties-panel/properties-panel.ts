import { Component, computed, inject, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import {
  LucideCheck, LucideCircleAlert, LucideLoaderCircle, LucideMousePointerClick, LucideSave,
} from '@lucide/angular';
import { SelectionService } from '../../_services/selection.service';
import { LayoutStateService } from '../../_services/layout-state.service';
import { TabsService } from '../../_services/tabs.service';
import { WidgetRegistryService } from '../../_services/widget-registry.service';
import { widgetDefinition } from '../../_constants/widget-registry.constants';
import { DynamicSettings } from '../../widgets/dynamic-settings/dynamic-settings';
import { findInTree } from '../../_utils/layout-tree.utils';
import { isSavedId } from '../../_utils/component-id.utils';
import { SaveState } from '../../_types/canvas.types';

/** How long "Saved" / "Error" stay on the save button. */
const SAVED_FEEDBACK_MS = 2000;
const ERROR_FEEDBACK_MS = 3000;

/** Edits the props of the widget selected on the canvas. */
@Component({
  selector: 'app-properties-panel',
  imports: [
    NgComponentOutlet, DynamicSettings,
    LucideSave, LucideCheck, LucideCircleAlert, LucideLoaderCircle, LucideMousePointerClick,
  ],
  templateUrl: './properties-panel.html',
  styleUrl: './properties-panel.scss',
})
export class PropertiesPanel {
  private readonly selection = inject(SelectionService);
  private readonly layoutState = inject(LayoutStateService);
  private readonly tabs = inject(TabsService);
  private readonly registry = inject(WidgetRegistryService);

  readonly selectedItem = computed(() => {
    const id = this.selection.selectedId();
    const tabId = this.tabs.activeTabId();
    return id && tabId ? findInTree(this.layoutState.getLayout(tabId), id) : null;
  });

  readonly definition = computed(() => widgetDefinition(this.selectedItem()?.type));
  readonly hasDynamicSettings = computed(
    () => this.registry.getPropsForWidget(this.selectedItem()?.type ?? '').length > 0,
  );

  readonly saveState = signal<SaveState>('idle');
  private feedbackTimer?: ReturnType<typeof setTimeout>;

  /** The only place prop edits are written to the database. */
  save(): void {
    const item = this.selectedItem();
    const tabId = this.tabs.activeTabId();
    if (!item || !tabId || !isSavedId(item.id)) return;

    this.saveState.set('saving');
    this.layoutState.updateComponent(tabId, item, true).subscribe({
      next: () => this.showFeedback('saved', SAVED_FEEDBACK_MS),
      error: () => this.showFeedback('error', ERROR_FEEDBACK_MS),
    });
  }

  private showFeedback(state: SaveState, ms: number): void {
    this.saveState.set(state);
    clearTimeout(this.feedbackTimer);
    this.feedbackTimer = setTimeout(() => this.saveState.set('idle'), ms);
  }
}
