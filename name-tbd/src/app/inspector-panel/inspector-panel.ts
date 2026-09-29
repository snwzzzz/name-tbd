import { Component, HostListener, signal, computed } from '@angular/core';
import { PropertiesPanelComponent } from '../properties-panel/properties-panel';
import { IconButton } from '../icon-button/icon-button';
import { LucideSettings, LucideLayers } from '@lucide/angular';

@Component({
  selector: 'app-inspector-panel',
  standalone: true,
  imports: [PropertiesPanelComponent, IconButton],
  templateUrl: './inspector-panel.html',
  styleUrl: './inspector-panel.scss',
})
export class InspectorPanel {
  activeTab = signal<'edit' | 'layers' | null>('edit');
  sidebarWidth = signal(320); // Default width
  isResizing = signal(false);

  editIcon = LucideSettings;
  layersIcon = LucideLayers;

  isSidebarExpanded = computed(() => this.activeTab() !== null);

  // Resize State for Math
  private startX = 0;
  private startWidth = 0;

  selectTab(tab: 'edit' | 'layers') {
    if (this.activeTab() === tab) {
      this.activeTab.set(null);
    } else {
      this.activeTab.set(tab);
      if (this.sidebarWidth() < 240) {
        this.sidebarWidth.set(320);
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
    
    // For a right-side panel, moving mouse left (negative delta) INCREASES width
    const deltaX = this.startX - event.clientX;
    let newWidth = this.startWidth + deltaX;
    
    if (newWidth < 240) newWidth = 240; // Min expanded width
    if (newWidth > 800) newWidth = 800; // Max expanded width
    
    this.sidebarWidth.set(newWidth);
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    this.isResizing.set(false);
  }
}
