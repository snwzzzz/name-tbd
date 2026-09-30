import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDatabase, LucideLayoutTemplate, LucideWorkflow } from '@lucide/angular';
import { TabsService } from '../services/tabs.service';
import { SelectOption, UiSelect } from '../ui-select/ui-select';

@Component({
  selector: 'app-mode-dropdown',
  imports: [FormsModule, UiSelect],
  templateUrl: './mode-dropdown.html',
  styleUrl: './mode-dropdown.scss',
})
export class ModeDropdown {
  tabsService = inject(TabsService);

  readonly modes: SelectOption[] = [
    { value: 'edit', label: 'Edit Mode', icon: LucideLayoutTemplate },
    { value: 'workflow', label: 'Workflow Mode', icon: LucideWorkflow },
    { value: 'data', label: 'Data Mode', icon: LucideDatabase },
  ];

  get activeMode() {
    return this.tabsService.activeMode();
  }

  onModeChange(mode: string) {
    this.tabsService.setMode(mode);
  }
}
