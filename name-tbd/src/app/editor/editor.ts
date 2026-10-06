import { Component, HostListener, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './sidebar/sidebar';
import { Navbar } from './navbar/navbar';
import { EditorTabs } from './editor-tabs/editor-tabs';
import { ModeDropdown } from './mode-dropdown/mode-dropdown';
import { TabsService, tabKind } from '../_services/tabs.service';
import { SidebarStateService } from '../_services/sidebar-state.service';
import { SaveQueue } from '../_services/save-queue.service';
import { HistoryService } from './commands/history.service';
import { RecentPagesService } from '../_services/recent-pages.service';
import { ModalService } from '../_services/modal/modal.service';
import { ShortcutsModal } from '../components/shortcuts-modal/shortcuts-modal';
import { ToastHost } from '../components/toast-host/toast-host';
import { EditorMode, isPageMode } from '../_types/tab.types';
import { isTyping, matchesShortcut } from '../_utils/keyboard.utils';

/** The editor shell: navbar, sidebars, tabs, and the active mode's view. Handles the editor-wide shortcuts. */
@Component({
  selector: 'app-editor',
  imports: [RouterOutlet, Sidebar, Navbar, EditorTabs, ModeDropdown, ToastHost],
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
})
export class Editor {
  private readonly tabs = inject(TabsService);
  private readonly saveQueue = inject(SaveQueue);
  private readonly history = inject(HistoryService);
  private readonly modal = inject(ModalService);
  private readonly sidebars = inject(SidebarStateService);

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
    'undo': () => this.onPage((pageId) => this.history.undo(pageId)),
    'redo': () => this.onPage((pageId) => this.history.redo(pageId)),
    'redo-y': () => this.onPage((pageId) => this.history.redo(pageId)),
    'save': () => void this.saveQueue.flush(),
    'new-tab': () => this.tabs.addTab(),
    'close-tab': () => {
      const id = this.tabs.activeTabId();
      if (id) this.tabs.closeTab(id);
    },
    'toggle-left-sidebar': () => this.sidebars.toggle('left'),
    'help': () => this.modal.open(ShortcutsModal, { width: '440px', ariaLabel: 'Keyboard shortcuts' }),
  };
  /** Shortcuts that also work while typing in a field (they don't type anything). */
  private readonly whileTyping = new Set(['save', 'toggle-left-sidebar']);

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.repeat) return;
    for (const [id, run] of Object.entries(this.shortcuts)) {
      if (!matchesShortcut(event, id)) continue;
      // While typing only Ctrl+S and Ctrl+B count; "?" and the others are just typed
      if (isTyping() && !this.whileTyping.has(id)) return;
      event.preventDefault();
      run();
      return;
    }
  }

  /** Modes belong to pages; the Start and panel tabs have none to switch. */
  private setMode(mode: EditorMode): void {
    if (this.tabs.activeTabId() && this.hasModes()) this.tabs.setMode(mode);
  }

  /** Runs on the open page (undo and redo act on it), if a page is open. */
  private onPage(run: (pageId: string) => void): void {
    const tabId = this.tabs.activeTabId();
    if (tabId && tabKind(tabId) === 'page') run(tabId);
  }
}
