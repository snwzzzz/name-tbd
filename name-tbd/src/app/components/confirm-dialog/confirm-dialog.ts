import { Component, computed, inject } from '@angular/core';
import { Button } from '../button/button';
import { ButtonColor } from '../../_types/button.types';
import { ConfirmOptions } from '../../_types/modal.types';
import { MODAL_DATA, MODAL_REF } from '../../_services/modal/modal.tokens';
import { ModalRef } from '../../_services/modal/modal-ref';

@Component({
  selector: 'app-confirm-dialog',
  imports: [Button],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss',
})
export class ConfirmDialog {
  readonly data = inject<ConfirmOptions>(MODAL_DATA);
  private readonly modalRef = inject<ModalRef<boolean>>(MODAL_REF);

  readonly confirmButtonColor = computed<ButtonColor>(
    () => this.data.confirmColor ?? (this.data.destructive ? 'error' : 'primary'),
  );

  onCancel(): void {
    this.modalRef.close(false);
  }

  onConfirm(): void {
    this.modalRef.close(true);
  }
}
