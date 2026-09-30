import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDatabase, LucideLayoutTemplate, LucideWorkflow } from '@lucide/angular';
import { TabsService } from '../../_services/tabs.service';
import { UiSelect } from '../../components/ui-select/ui-select';
import { SelectOption } from '../../_types/select.types';
import { EditorMode } from '../../_types/tab.types';

/** Switches the active tab between the page, workflow and data editors. */
@Component({
  selector: 'app-mode-dropdown',
  imports: [FormsModule, UiSelect],
  templateUrl: './mode-dropdown.html',
  styleUrl: './mode-dropdown.scss',
})
export class ModeDropdown {
  private readonly tabs = inject(TabsService);

  readonly activeMode = this.tabs.activeMode;
  readonly defaultIcon = LucideLayoutTemplate;
  readonly modes: SelectOption[] = [
    { value: 'edit', label: 'Edit Mode', icon: LucideLayoutTemplate },
    { value: 'workflow', label: 'Workflow Mode', icon: LucideWorkflow },
    { value: 'data', label: 'Data Mode', icon: LucideDatabase },
  ];

  onModeChange(mode: string): void {
    // Only the options above can be chosen
    this.tabs.setMode(mode as EditorMode);
  }
}
