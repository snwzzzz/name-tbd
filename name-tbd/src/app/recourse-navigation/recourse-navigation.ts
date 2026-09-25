import { Component, HostListener } from '@angular/core';
import { IconButton } from '../icon-button/icon-button';
import { LucideLayoutList, LucideFileChartColumn } from '@lucide/angular';
import { ComponentList } from '../component-list/component-list';

@Component({
  selector: 'app-recourse-navigation',
  imports: [IconButton, ComponentList],
  templateUrl: './recourse-navigation.html',
  styleUrl: './recourse-navigation.scss',
})
export class RecourseNavigation {
  activeTab: 'components' | 'layers' | null = 'components';

  layoutListIcon = LucideLayoutList;
  fileChartColumnIcon = LucideFileChartColumn;

  // Resize State
  sidebarWidth = 300;
  isResizing = false;

  get isSidebarExpanded(): boolean {
    return this.activeTab !== null;
  }

  selectTab(tab: 'components' | 'layers') {
    if (this.activeTab === tab) {
      this.activeTab = null;
    } else {
      this.activeTab = tab;
      // When expanding, restore a reasonable width if it was collapsed very small
      if (this.sidebarWidth < 200) {
        this.sidebarWidth = 300; 
      }
    }
  }

  startResize(event: MouseEvent) {
    this.isResizing = true;
    event.preventDefault(); 
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.isResizing) return;
    
    // Calculate new width based on mouse position. 
    // Assuming sidebar starts at left edge of the window.
    let newWidth = event.clientX;
    
    if (newWidth < 200) newWidth = 200; // Min expanded width
    if (newWidth > 800) newWidth = 800; // Max expanded width
    
    this.sidebarWidth = newWidth;
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    this.isResizing = false;
  }
}
