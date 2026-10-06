import { Component, inject } from '@angular/core';
import { LucideCircleAlert, LucideInfo, LucideX } from '@lucide/angular';
import { ToastService } from '../../_services/toast.service';

/** Shows the ToastService's messages, bottom center, newest last. */
@Component({
  selector: 'app-toast-host',
  imports: [LucideCircleAlert, LucideInfo, LucideX],
  template: `
    @for (toast of toasts(); track toast.id) {
      <div class="toast" [class.warning]="toast.kind === 'warning'" [attr.role]="toast.kind === 'warning' ? 'alert' : 'status'">
        @if (toast.kind === 'warning') { <svg lucideCircleAlert class="icon"></svg> } @else { <svg lucideInfo class="icon"></svg> }
        <span class="message">{{ toast.message }}</span>
        <button type="button" class="close" aria-label="Dismiss" (click)="dismiss(toast.id)"><svg lucideX></svg></button>
      </div>
    }
  `,
  styles: `
    :host {
      position: fixed;
      left: 50%;
      // Above the canvas's zoom bar
      bottom: 5rem;
      transform: translateX(-50%);
      z-index: 2000;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      max-width: 32rem;
      padding: 0.625rem 0.75rem 0.625rem 0.875rem;
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      background: var(--color-surface);
      color: var(--color-text-primary);
      font-size: var(--font-size-sm);
      box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.18);
      pointer-events: auto;
      animation: toast-in 0.16s ease-out;

      &.warning {
        border-color: color-mix(in srgb, var(--color-warning) 55%, var(--color-border));
        .icon { color: var(--color-warning-dark); }
      }
    }

    .icon {
      flex-shrink: 0;
      width: 1.05rem;
      height: 1.05rem;
      color: var(--color-primary);
    }

    .message {
      flex: 1;
    }

    .close {
      display: flex;
      padding: 0.125rem;
      border: none;
      border-radius: 0.25rem;
      background: none;
      color: var(--color-text-secondary);
      cursor: pointer;

      &:hover { background: var(--color-surface-hover); }
      svg { width: 0.875rem; height: 0.875rem; }
    }

    @keyframes toast-in {
      from { opacity: 0; transform: translateY(0.5rem); }
    }
  `,
})
export class ToastHost {
  private readonly service = inject(ToastService);
  readonly toasts = this.service.toasts;

  dismiss(id: number): void {
    this.service.dismiss(id);
  }
}
