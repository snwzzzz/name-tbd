import { Injectable, computed, inject, signal } from '@angular/core';
import { PreviewDataService } from './preview-data.service';
import { TableSelectionService } from './table-selection.service';

/**
 * Whether (and which) page is being previewed on the canvas. Widgets use it to become
 * interactive; stopping the preview throws away everything the preview changed, unless it's
 * going on on another page (a followed link).
 */
@Injectable({ providedIn: 'root' })
export class PreviewSessionService {
  private readonly previewData = inject(PreviewDataService);
  private readonly selection = inject(TableSelectionService);

  readonly pageId = signal<string | null>(null);
  readonly active = computed(() => this.pageId() !== null);
  // The page the preview goes on on once it's opened
  private nextPageId: string | null = null;

  start(pageId: string): void {
    this.nextPageId = null;
    this.pageId.set(pageId);
  }

  stop(): void {
    this.pageId.set(null);
    // Switching pages: keep the simulated data for the next page
    if (this.nextPageId !== null) return;
    this.previewData.reset();
    this.selection.reset();
  }

  /** The preview goes on on this page once it's opened (see resumesOn). */
  continueOn(pageId: string): void {
    this.nextPageId = pageId;
  }

  /** Whether the preview should go on now that this page is open. */
  resumesOn(pageId: string): boolean {
    return this.nextPageId === pageId;
  }
}
