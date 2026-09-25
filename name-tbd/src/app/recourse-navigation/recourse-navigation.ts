import { Component, HostListener, signal, computed } from '@angular/core';
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
  activeTab = signal<'components' | 'layers' | null>('components');
  sidebarWidth = signal(300);
  isResizing = signal(false);

  layoutListIcon = LucideLayoutList;
  fileChartColumnIcon = LucideFileChartColumn;

  // Computed state
  isSidebarExpanded = computed(() => this.activeTab() !== null);

  // Resize State for Math
  private startX = 0;
  private startWidth = 0;

  selectTab(tab: 'components' | 'layers') {
    if (this.activeTab() === tab) {
      this.activeTab.set(null);
    } else {
      this.activeTab.set(tab);
      // When expanding, restore a reasonable width if it was collapsed very small
      if (this.sidebarWidth() < 200) {
        this.sidebarWidth.set(300); 
      }
    }
  }

  startResize(event: MouseEvent) {
    this.isResizing.set(true);
    this.startX = event.clientX;
    this.startWidth = this.sidebarWidth();
    event.preventDefault(); 
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.isResizing()) return;
    
    // Calculate new width based on delta from start position. 
    const deltaX = event.clientX - this.startX;
    let newWidth = this.startWidth + deltaX;
    
    if (newWidth < 200) newWidth = 200; // Min expanded width
    if (newWidth > 800) newWidth = 800; // Max expanded width
    
    this.sidebarWidth.set(newWidth);
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    this.isResizing.set(false);
  }
}
