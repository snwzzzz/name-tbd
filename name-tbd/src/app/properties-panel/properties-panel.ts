import { Component, inject, signal, computed } from '@angular/core';
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

        <!-- Save button -->
        <div class="p-3" style="border-top: 1px solid var(--color-border); flex-shrink: 0;">
          <button
            (click)="save()"
            [disabled]="saveState() === 'saving'"
            class="w-full py-2 px-4 rounded text-sm font-semibold transition-all"
            [style]="saveButtonStyle()">
            @switch (saveState()) {
              @case ('saving') { Saving… }
              @case ('saved')  { ✓ Saved }
              @case ('error')  { ✗ Error — Retry }
              @default         { Save }
            }
          </button>
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

  saveButtonStyle(): string {
    switch (this.saveState()) {
      case 'saving': return 'background: var(--color-primary); color: #fff; opacity: 0.6; cursor: not-allowed;';
      case 'saved':  return 'background: #16a34a; color: #fff; cursor: default;';
      case 'error':  return 'background: #dc2626; color: #fff;';
      default:       return 'background: var(--color-primary); color: #fff; cursor: pointer;';
    }
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
