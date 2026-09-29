import { Component, inject, effect, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { SelectionService } from '../services/selection.service';
import { LayoutStateService } from '../services/layout-state.service';
import { TabsService } from '../services/tabs.service';
import { WIDGET_REGISTRY } from '../widgets/registry';
import { WidgetRegistryService } from '../core/widget-registry.service';
import { DynamicSettingsComponent } from '../widgets/dynamic-settings/dynamic-settings.component';

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [NgComponentOutlet, DynamicSettingsComponent],
  template: `
    <div class="h-full w-full flex flex-col" style="color: var(--color-text-primary);">
      @if (selectedItem(); as item) {
        <div class="p-4 flex items-center gap-2" style="border-bottom: 1px solid var(--color-border);">
          <i [class]="getDef(item.type).icon" class="text-xl" style="color: var(--color-primary);"></i>
          <h3 class="font-semibold">{{ getDef(item.type).name }} Settings</h3>
        </div>
        
        <div class="flex-1 overflow-y-auto">
          @if (registry.getPropsForWidget(item.type).length > 0) {
            <!-- Auto-generated standard props from the DB -->
            <app-dynamic-settings [type]="item.type" [props]="item.props"></app-dynamic-settings>
          } @else if (getDef(item.type).settingsComponent; as settingsComp) {
            <!-- Fallback to hardcoded settings component if no DB props are defined -->
            <ng-container *ngComponentOutlet="settingsComp; inputs: { props: item.props }"></ng-container>
          } @else {
            <div class="p-4 text-gray-500 text-sm">
              No settings available for this widget.
            </div>
          }
        </div>
      } @else {
        <div class="p-4 text-gray-500 text-sm flex h-full items-center justify-center text-center">
          Select an element on the canvas to edit its properties.
        </div>
      }
    </div>
  `
})
export class PropertiesPanelComponent {
  selection = inject(SelectionService);
  layoutState = inject(LayoutStateService);
  tabs = inject(TabsService);
  registry = inject(WidgetRegistryService);
  
  selectedItem = signal<any>(null);

  constructor() {
    effect(() => {
      const id = this.selection.selectedId();
      const tabId = this.tabs.activeTabId();
      if (!id || !tabId) {
        this.selectedItem.set(null);
        return;
      }
      
      const layout = this.layoutState.getLayout(tabId) || [];
      const item = this.findInLayout(layout, id);
      this.selectedItem.set(item);
    }, { allowSignalWrites: true });
  }

  getDef(type: string) {
    return WIDGET_REGISTRY[type] || WIDGET_REGISTRY['default'];
  }

  private findInLayout(layout: any[], id: string): any {
    for (const item of layout) {
      if (item.id?.toString() === id) return item;
      if (item.children) {
        const found = this.findInLayout(item.children, id);
        if (found) return found;
      }
    }
    return null;
  }
}
