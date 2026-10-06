import { Component, inject } from '@angular/core';
import { AppMessagesService } from '../../services/app-messages.service';

/**
 * The running app's messages (show_message), bottom center over the page, in the app's theme.
 * The exported app shows it over its pages, the editor over the previewed page.
 */
@Component({
  selector: 'app-app-messages',
  template: `
    @for (message of messages(); track message.id) {
      <div class="message" [class]="message.tone" [attr.role]="message.tone === 'error' || message.tone === 'warning' ? 'alert' : 'status'">
        <span class="text">{{ message.text }}</span>
        <button type="button" class="close" aria-label="Dismiss" (click)="dismiss(message.id)">×</button>
      </div>
    }
  `,
  styles: `
    :host {
      position: fixed;
      left: 50%;
      bottom: 1.5rem;
      transform: translateX(-50%);
      z-index: 1500;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      pointer-events: none;
      font-family: var(--widget-font);
    }

    .message {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      max-width: 32rem;
      padding: 0.625rem 0.625rem 0.625rem 1rem;
      border-radius: var(--widget-radius);
      border-left: 4px solid var(--widget-brand);
      background: var(--widget-bg);
      color: var(--widget-fg);
      font-size: var(--widget-text-size, var(--text-size-normal));
      box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.18);
      pointer-events: auto;

      &.success { border-left-color: var(--widget-success); }
      &.warning { border-left-color: var(--widget-warning); }
      &.error { border-left-color: var(--widget-danger); }
    }

    .text { flex: 1; }

    .close {
      border: none;
      background: none;
      color: var(--widget-fg-secondary);
      font-size: 1.1rem;
      line-height: 1;
      cursor: pointer;
    }
  `,
})
export class AppMessages {
  private readonly service = inject(AppMessagesService);
  readonly messages = this.service.messages;

  dismiss(id: number): void {
    this.service.dismiss(id);
  }
}
