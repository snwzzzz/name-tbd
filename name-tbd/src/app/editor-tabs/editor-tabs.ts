import { Component, inject } from '@angular/core';
import { CdkDrag, CdkDropList, CdkDragDrop, CdkDragPlaceholder } from '@angular/cdk/drag-drop';
import { TabsService } from '../services/tabs.service';

@Component({
  selector: 'app-editor-tabs',
  imports: [CdkDrag, CdkDropList, CdkDragPlaceholder],
  templateUrl: './editor-tabs.html',
  styleUrl: './editor-tabs.scss',
})
export class EditorTabs {
  tabsService = inject(TabsService);
  
  // Expose the signal so the template can read it
  tabs = this.tabsService.tabs;
  activeTabId = this.tabsService.activeTabId;

  selectTab(id: string) {
    this.tabsService.selectTab(id);
  }

  closeTab(id: string, event: Event) {
    event.stopPropagation();
    this.tabsService.closeTab(id);
  }

  addTab() {
    this.tabsService.addTab();
  }

  onDropCdk(event: CdkDragDrop<any[]>) {
    this.tabsService.reorderTabs(event.previousIndex, event.currentIndex);
  }
}
