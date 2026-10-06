import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { VersionControlControllerService } from '../api/services/versionControlController.service';
import { PageControllerService } from '../api/services/pageController.service';
import { VersionDto } from '../api/models';
import { versionPreviewUrl } from '../_constants/api.constants';
import { EditorContext } from './editor-context.service';
import { SaveQueue } from './save-queue.service';
import { ToastService } from './toast.service';
import { TabsService, tabKind } from './tabs.service';
import { PagesStateService } from './pages-state.service';

/**
 * The versions of the app's branch, for the History panel: snapshots saved by hand, every 30 minutes
 * while editing, before an export, and before a restore (the backend makes those). Saving or
 * restoring first sends the changes waiting in the SaveQueue, so a version holds what's on screen.
 */
@Injectable({ providedIn: 'root' })
export class VersionsService {
  private readonly api = inject(VersionControlControllerService);
  private readonly context = inject(EditorContext);
  private readonly saveQueue = inject(SaveQueue);
  private readonly toast = inject(ToastService);
  private readonly tabs = inject(TabsService);
  private readonly pages = inject(PagesStateService);
  private readonly pagesApi = inject(PageControllerService);

  /** Newest first. */
  readonly versions = signal<VersionDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  /** Saving or restoring right now. */
  readonly busy = signal(false);

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.versions.set(await firstValueFrom(this.api.getVersions(this.context.requireBranchId())));
    } catch (err) {
      this.error.set(messageOf(err, 'The versions could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  /** Saves the app as it is now as a version. */
  async save(label: string): Promise<VersionDto | null> {
    return this.run(async () => {
      if (!(await this.sendChanges())) return null;
      const version = await firstValueFrom(this.api.saveVersion({ branchId: this.context.requireBranchId(), label }));
      this.versions.update((all) => [version, ...all]);
      this.toast.show(`Saved as version ${version.number}`);
      return version;
    }, 'The version could not be saved.');
  }

  async rename(id: number, label: string): Promise<void> {
    await this.run(async () => {
      const renamed = await firstValueFrom(this.api.renameVersion(id, { label }));
      this.versions.update((all) => all.map((v) => (v.id === id ? renamed : v)));
    }, 'The version could not be renamed.');
  }

  /**
   * Makes the app what it was in this version (the backend keeps what it is now as a version first),
   * then reloads the editor: everything it shows changed, and undo can't reach across. Everything got
   * new ids, so the saved tabs go, and the editor opens the page at the same path, if there's one.
   */
  async restore(id: number): Promise<void> {
    const openPath = this.openPagePath();
    const url = await this.run(async () => {
      await this.sendChanges();
      await firstValueFrom(this.api.restoreVersion(id));
      const pages = await firstValueFrom(this.pagesApi.getPages(this.context.requireBranchId()));
      const page = openPath != null ? pages.find((p) => p.path === openPath) : undefined;
      return (page ? this.context.path(page.id!, 'edit') : this.context.path()).join('/');
    }, 'The version could not be restored.');
    if (url) {
      this.tabs.forgetSaved();
      this.reload(url);
    }
  }

  /** Opens the app as it was in this version in a new browser tab (the exported app, read-only). */
  preview(id: number): void {
    window.open(versionPreviewUrl(id), '_blank', 'noopener');
  }

  /** Loads the editor anew at this URL (a seam for tests). */
  reload(url: string): void {
    window.location.assign(url);
  }

  /** The path of the page open in the editor, if one is. */
  private openPagePath(): string | null {
    const tabId = this.tabs.activeTabId();
    if (!tabId || tabKind(tabId) !== 'page') return null;
    return this.pages.page(Number(tabId))?.path ?? null;
  }

  /** Sends what's waiting to be saved; false (with a message) if some of it couldn't be. */
  private async sendChanges(): Promise<boolean> {
    await this.saveQueue.flush();
    if (!this.saveQueue.hasUnsaved()) return true;
    this.toast.show('Some changes aren’t saved yet. Try again once they are.', 'warning');
    return false;
  }

  private async run<T>(work: () => Promise<T>, failure: string): Promise<T | null> {
    this.busy.set(true);
    try {
      return await work();
    } catch (err) {
      this.toast.show(messageOf(err, failure), 'warning');
      return null;
    } finally {
      this.busy.set(false);
    }
  }
}

function messageOf(err: unknown, fallback: string): string {
  const message = err instanceof HttpErrorResponse ? (err.error as { message?: string } | null)?.message : null;
  return message || fallback;
}
