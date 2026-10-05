import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDownload, LucideKeyboard, LucideMoon, LucideRedo2, LucideSearch, LucideSun, LucideUndo2 } from '@lucide/angular';
import { ThemeService } from '../../_services/theme.service';
import { SaveQueue } from '../../_services/save-queue.service';
import { EditorContext } from '../../_services/editor-context.service';
import { TabsService, tabKind } from '../../_services/tabs.service';
import { HistoryService } from '../commands/history.service';
import { shortcutKeys } from '../../_constants/keyboard-shortcuts.constants';
import { HttpActivityService } from '../../_services/http-activity.service';
import { ModalService } from '../../_services/modal/modal.service';
import { ShortcutsModal } from '../../components/shortcuts-modal/shortcuts-modal';
import { UserMenu } from '../../components/user-menu/user-menu';
import { SaveIndicator } from '../../components/save-indicator/save-indicator';
import { ExportModal } from '../export-modal/export-modal';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, LucideMoon, LucideSun, LucideDownload, LucideSearch, LucideKeyboard, LucideUndo2, LucideRedo2, UserMenu, SaveIndicator],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private readonly theme = inject(ThemeService);
  private readonly modal = inject(ModalService);
  private readonly context = inject(EditorContext);
  private readonly tabs = inject(TabsService);
  private readonly history = inject(HistoryService);
  private readonly saveQueue = inject(SaveQueue);

  /** The open page (undo and redo act on it), null on the Start tab or a panel. */
  private readonly pageId = computed(() => {
    const tabId = this.tabs.activeTabId();
    return tabId && tabKind(tabId) === 'page' ? tabId : null;
  });
  readonly undoLabel = computed(() => this.history.undoLabel(this.pageId()));
  readonly redoLabel = computed(() => this.history.redoLabel(this.pageId()));
  readonly undoKeys = shortcutKeys('undo');
  readonly redoKeys = shortcutKeys('redo');

  /** The application being edited. */
  readonly appTitle = computed(() => this.context.app()?.title ?? '');

  /** Something is loading or saving (shown as a small spinner). */
  readonly busy = inject(HttpActivityService).busy;

  readonly isDark = this.theme.isDark;

  showShortcuts(): void {
    this.modal.open(ShortcutsModal, { width: '440px', ariaLabel: 'Keyboard shortcuts' });
  }

  undo(): void {
    const pageId = this.pageId();
    if (pageId) this.history.undo(pageId);
  }

  redo(): void {
    const pageId = this.pageId();
    if (pageId) this.history.redo(pageId);
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  /**
   * Download the whole app (all pages, the layout, workflows and data) as one HTML file that runs on
   * its own. Changes still waiting are sent first, so the export (and the version saved before it) has them.
   */
  async exportApp(): Promise<void> {
    await this.saveQueue.flush();
    this.modal.open(ExportModal, { width: '500px', ariaLabel: 'Export App' });
  }
}
