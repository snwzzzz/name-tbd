import { Component, inject } from '@angular/core';
import { Button } from '../button/button';
import { MODAL_REF } from '../../_services/modal/modal.tokens';
import { ModalRef } from '../../_services/modal/modal-ref';
import { KEYBOARD_SHORTCUTS } from '../../_constants/keyboard-shortcuts.constants';

/** The keyboard shortcut overview (opened with "?" or from the navbar). */
@Component({
  selector: 'app-shortcuts-modal',
  imports: [Button],
  template: `
    <div class="shortcuts-modal">
      <h3 class="dialog-title">Keyboard shortcuts</h3>
      <dl class="shortcuts">
        @for (shortcut of shortcuts; track shortcut.id) {
          <div class="shortcut">
            <dt>{{ shortcut.description }}</dt>
            <dd>
              @for (key of shortcut.keys.split('+'); track $index) {
                <kbd>{{ key }}</kbd>
              }
            </dd>
          </div>
        }
      </dl>
      <div class="dialog-actions">
        <app-button color="neutral" variant="ghost" (click)="close()">Close</app-button>
      </div>
    </div>
  `,
  styles: `
    .shortcuts-modal {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      color: var(--color-text-primary);
    }

    .dialog-title {
      margin: 0;
      font-size: var(--font-size-lg);
      font-weight: 600;
    }

    .shortcuts {
      margin: 0;
      display: flex;
      flex-direction: column;
    }

    .shortcut {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.375rem 0;
      border-bottom: 1px solid var(--color-border);
      font-size: var(--font-size-sm);

      &:last-child {
        border-bottom: none;
      }
    }

    dd {
      margin: 0;
      display: flex;
      gap: 0.25rem;
    }

    kbd {
      min-width: 1.5rem;
      padding: 0.125rem 0.375rem;
      border: 1px solid var(--color-border);
      border-bottom-width: 2px;
      border-radius: 0.25rem;
      background: var(--color-surface-secondary);
      font: inherit;
      font-size: var(--font-size-xs);
      text-align: center;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
    }
  `,
})
export class ShortcutsModal {
  private readonly modalRef = inject<ModalRef<void>>(MODAL_REF);
  readonly shortcuts = KEYBOARD_SHORTCUTS;

  close(): void {
    this.modalRef.close();
  }
}
