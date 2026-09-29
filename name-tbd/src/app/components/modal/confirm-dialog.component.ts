import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button, ButtonColor } from '../button/button';
import { ConfirmOptions } from './modal.types';
import { MODAL_DATA, MODAL_REF } from './modal.tokens';
import { ModalRef } from './modal-ref';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, Button],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  readonly data = inject<ConfirmOptions>(MODAL_DATA);
  readonly modalRef = inject<ModalRef<boolean>>(MODAL_REF);

  readonly confirmButtonColor = computed<ButtonColor>(() => {
    if (this.data.confirmColor) {
      return this.data.confirmColor;
    }
    return this.data.destructive ? 'error' : 'primary';
  });

  onCancel(): void {
    this.modalRef.close(false);
  }

  onConfirm(): void {
    this.modalRef.close(true);
  }
}
