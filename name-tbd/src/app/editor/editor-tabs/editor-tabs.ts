import { Component, inject } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList } from '@angular/cdk/drag-drop';
import { TabsService } from '../../_services/tabs.service';
import { TabItem } from '../../_types/tab.types';

/** The editor's tab strip: switch, close, add and reorder (drag) tabs. */
@Component({
  selector: 'app-editor-tabs',
  imports: [CdkDrag, CdkDropList, CdkDragPlaceholder],
  templateUrl: './editor-tabs.html',
  styleUrl: './editor-tabs.scss',
})
export class EditorTabs {
  private readonly tabsService = inject(TabsService);

  readonly tabs = this.tabsService.tabs;
  readonly activeTabId = this.tabsService.activeTabId;

  selectTab(id: string): void {
    this.tabsService.selectTab(id);
  }

  closeTab(id: string, event: Event): void {
    event.stopPropagation();
    this.tabsService.closeTab(id);
  }

  addTab(): void {
    this.tabsService.addTab();
  }

  onDrop(event: CdkDragDrop<TabItem[]>): void {
    this.tabsService.reorderTabs(event.previousIndex, event.currentIndex);
  }
}
