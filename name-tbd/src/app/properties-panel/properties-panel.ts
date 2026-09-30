import { Component, inject, signal, computed } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { SelectionService } from '../services/selection.service';
import { LayoutStateService } from '../services/layout-state.service';
import { TabsService } from '../services/tabs.service';
import { WIDGET_REGISTRY } from '../widgets/registry';
import { WidgetRegistryService } from '../core/widget-registry.service';
import { DynamicSettingsComponent } from '../widgets/dynamic-settings/dynamic-settings.component';
import {
  LucideCheck, LucideCircleAlert, LucideComponent, LucideIcon, LucideLoaderCircle,
  LucideMousePointerClick, LucideSave, LucideTextCursorInput, LucideType,
} from '@lucide/angular';

/** Lucide icon per widget type (the registry's icon names are for an icon font that isn't loaded). */
const TYPE_ICONS: Record<string, LucideIcon> = {
  button: LucideMousePointerClick,
  label: LucideType,
  form: LucideTextCursorInput,
};

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [NgComponentOutlet, DynamicSettingsComponent, LucideSave, LucideCheck, LucideCircleAlert, LucideLoaderCircle, LucideMousePointerClick],
  templateUrl: './properties-panel.html',
  styleUrl: './properties-panel.scss',
})
export class PropertiesPanelComponent {
  selection = inject(SelectionService);
  layoutState = inject(LayoutStateService);
  tabs = inject(TabsService);
  registry = inject(WidgetRegistryService);

  /** Recomputes whenever selection, tab, or any layout prop changes. */
  selectedItem = computed(() => {
    const id = this.selection.selectedId();
    const tabId = this.tabs.activeTabId();
    if (!id || !tabId) return null;
    return this.findInLayout(this.layoutState.getLayout(tabId), id);
  });

  saveState = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  private savedTimer: any;

  save() {
    const item = this.selectedItem();
    const tabId = this.tabs.activeTabId();
    if (!item || !tabId || typeof item.id !== 'number') return;

    this.saveState.set('saving');

    // The only place prop edits are written to the database
    this.layoutState.updateComponent(tabId, item, true).subscribe({
      next: () => {
        this.saveState.set('saved');
        clearTimeout(this.savedTimer);
        this.savedTimer = setTimeout(() => this.saveState.set('idle'), 2000);
      },
      error: () => {
        this.saveState.set('error');
        clearTimeout(this.savedTimer);
        this.savedTimer = setTimeout(() => this.saveState.set('idle'), 3000);
      }
    });
  }

  iconFor(type: string): LucideIcon {
    return TYPE_ICONS[type] ?? LucideComponent;
  }

  getDef(type: string) {
    return WIDGET_REGISTRY[type] || WIDGET_REGISTRY['default'];
  }

  private findInLayout(layout: any[], id: string): any {
    for (const item of layout) {
      if (item.id?.toString() === id) return item;
      if (item.children) {
        const found: any = this.findInLayout(item.children, id);
        if (found) return found;
      }
    }
    return null;
  }
}
