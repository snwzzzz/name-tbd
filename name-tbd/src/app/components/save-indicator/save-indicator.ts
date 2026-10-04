import { Component, DOCUMENT, inject } from '@angular/core';
import { LucideCheck, LucideCircleAlert, LucideCloudOff } from '@lucide/angular';
import { SaveQueue } from '../../_services/save-queue.service';

/** How saving the editor's changes is going (SaveQueue): Saved, Saving…, Offline (with Retry), or refused (with Reload). */
@Component({
  selector: 'app-save-indicator',
  imports: [LucideCheck, LucideCircleAlert, LucideCloudOff],
  templateUrl: './save-indicator.html',
  styleUrl: './save-indicator.scss',
})
export class SaveIndicator {
  private readonly saveQueue = inject(SaveQueue);
  private readonly document = inject(DOCUMENT);

  readonly state = this.saveQueue.state;
  readonly error = this.saveQueue.error;

  retry(): void {
    void this.saveQueue.flush();
  }

  /** After refused changes: shows the page as it's saved. */
  reload(): void {
    this.document.location.reload();
  }
}
