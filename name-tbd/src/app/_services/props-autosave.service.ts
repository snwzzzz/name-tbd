import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LayoutStateService } from './layout-state.service';
import { findInTree } from '../_utils/layout-tree.utils';
import { isSavedId } from '../_utils/component-id.utils';

/** How long after the last edit a widget's props are saved. */
export const AUTOSAVE_DELAY_MS = 800;

export type AutosaveState = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error';

/**
 * Saves widget prop edits by itself, shortly after the last change (per widget). Warns before
 * the browser tab is closed or reloaded while something isn't saved yet.
 */
@Injectable({ providedIn: 'root' })
export class PropsAutosaveService {
  private readonly layoutState = inject(LayoutStateService);

  // Widgets with edits not saved yet, by `${pageId}:${id}`
  private readonly pending = signal<ReadonlySet<string>>(new Set());
  private readonly saving = signal(0);
  private readonly failed = signal(false);
  private readonly savedOnce = signal(false);
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly hasUnsaved = computed(() => this.pending().size > 0 || this.saving() > 0);
  readonly state = computed<AutosaveState>(() => {
    if (this.saving() > 0) return 'saving';
    if (this.failed()) return 'error';
    if (this.pending().size > 0) return 'unsaved';
    return this.savedOnce() ? 'saved' : 'idle';
  });

  constructor() {
    window.addEventListener('beforeunload', (event) => {
      if (!this.hasUnsaved()) return;
      event.preventDefault();
      // Older browsers only show the warning with a returnValue
      event.returnValue = '';
    });
  }

  /** A widget's props changed: save them once the edits pause. */
  schedule(pageId: string, id: string): void {
    const key = `${pageId}:${id}`;
    this.pending.update((keys) => new Set(keys).add(key));
    clearTimeout(this.timers.get(key));
    this.timers.set(key, setTimeout(() => this.save(key), AUTOSAVE_DELAY_MS));
  }

  /** Saves everything that's waiting right away (e.g. Ctrl+S, or Retry after an error). */
  async flush(): Promise<void> {
    const keys = [...this.pending()];
    keys.forEach((key) => clearTimeout(this.timers.get(key)));
    await Promise.all(keys.map((key) => this.save(key)));
  }

  private async save(key: string): Promise<void> {
    this.timers.delete(key);
    const [pageId, id] = splitKey(key);
    const item = findInTree(this.layoutState.getLayout(pageId), id);
    // Gone, or not created in the backend yet (it's saved with its props once it is)
    if (!item || !isSavedId(item.id)) {
      this.forget(key);
      return;
    }

    this.saving.update((n) => n + 1);
    try {
      await firstValueFrom(this.layoutState.updateComponent(pageId, item, true));
      // Edited again while saving: its own timer saves the newer props
      if (!this.timers.has(key)) this.forget(key);
      this.failed.set(false);
      this.savedOnce.set(true);
    } catch (err) {
      console.error('Failed to save the widget props', err);
      this.failed.set(true);
    } finally {
      this.saving.update((n) => n - 1);
    }
  }

  private forget(key: string): void {
    this.pending.update((keys) => {
      const next = new Set(keys);
      next.delete(key);
      return next;
    });
  }
}

/** `${pageId}:${id}`; page ids never contain a colon. */
function splitKey(key: string): [string, string] {
  const at = key.indexOf(':');
  return [key.slice(0, at), key.slice(at + 1)];
}
