import { Component, inject } from '@angular/core';
import { LucideLayoutTemplate } from '@lucide/angular';
import { NgComponentOutlet } from '@angular/common';
import { TabsService } from '../services/tabs.service';

@Component({
  selector: 'app-mode-dropdown',
  imports: [NgComponentOutlet],
  templateUrl: './mode-dropdown.html',
  styleUrl: './mode-dropdown.scss',
})
export class ModeDropdown {
  tabsService = inject(TabsService);
  iconMode = LucideLayoutTemplate;

  get activeMode() {
    return this.tabsService.activeMode();
  }

  onModeChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.tabsService.setMode(select.value);
  }
}
