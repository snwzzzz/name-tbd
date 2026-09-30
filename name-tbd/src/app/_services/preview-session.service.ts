import { Injectable, computed, inject, signal } from '@angular/core';
import { PreviewDataService } from './preview-data.service';
import { TableSelectionService } from './table-selection.service';

/**
 * Whether (and which) page is being previewed on the canvas. Widgets use it to become
 * interactive; stopping the preview throws away everything the preview changed.
 */
@Injectable({ providedIn: 'root' })
export class PreviewSessionService {
  private readonly previewData = inject(PreviewDataService);
  private readonly selection = inject(TableSelectionService);

  readonly pageId = signal<string | null>(null);
  readonly active = computed(() => this.pageId() !== null);

  start(pageId: string): void {
    this.pageId.set(pageId);
  }

  stop(): void {
    this.pageId.set(null);
    this.previewData.reset();
    this.selection.reset();
  }
}
