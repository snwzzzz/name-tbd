import { Component, HostListener, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './sidebar/sidebar';
import { Navbar } from './navbar/navbar';
import { EditorTabs } from './editor-tabs/editor-tabs';
import { ModeDropdown } from './mode-dropdown/mode-dropdown';
import { TabsService } from '../_services/tabs.service';
import { PropsAutosaveService } from '../_services/props-autosave.service';
import { RecentPagesService } from '../_services/recent-pages.service';
import { ModalService } from '../_services/modal/modal.service';
import { ShortcutsModal } from '../components/shortcuts-modal/shortcuts-modal';
import { EditorMode, isPageMode } from '../_types/tab.types';
import { isTyping, matchesShortcut } from '../_utils/keyboard.utils';

/** The editor shell: navbar, sidebars, tabs, and the active mode's view. Handles the editor-wide shortcuts. */
@Component({
  selector: 'app-editor',
  imports: [RouterOutlet, Sidebar, Navbar, EditorTabs, ModeDropdown],
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
})
export class Editor {
  private readonly tabs = inject(TabsService);
  private readonly autosave = inject(PropsAutosaveService);
  private readonly modal = inject(ModalService);

  constructor() {
    // Starts noticing which pages are opened, for the Start tab's recent pages
    inject(RecentPagesService);
  }

  /** Only pages have modes to switch between (not the Start tab or a panel tab). */
  readonly hasModes = computed(() => isPageMode(this.tabs.activeMode()));

  /** Editor-wide shortcuts (see KEYBOARD_SHORTCUTS); the canvas handles its own. */
  private readonly shortcuts: Record<string, () => void> = {
    'mode-edit': () => this.setMode('edit'),
    'mode-workflow': () => this.setMode('workflow'),
    'mode-data': () => this.setMode('data'),
    'save': () => this.autosave.flush(),
    'new-tab': () => this.tabs.addTab(),
    'close-tab': () => {
      const id = this.tabs.activeTabId();
      if (id) this.tabs.closeTab(id);
    },
    'help': () => this.modal.open(ShortcutsModal, { width: '440px', ariaLabel: 'Keyboard shortcuts' }),
  };

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.repeat) return;
    for (const [id, run] of Object.entries(this.shortcuts)) {
      if (!matchesShortcut(event, id)) continue;
      // While typing only Ctrl+S counts; "?" and the others are just typed
      if (isTyping() && id !== 'save') return;
      event.preventDefault();
      run();
      return;
    }
  }

  /** Modes belong to pages; the Start and panel tabs have none to switch. */
  private setMode(mode: EditorMode): void {
    if (this.tabs.activeTabId() && this.hasModes()) this.tabs.setMode(mode);
  }
}
