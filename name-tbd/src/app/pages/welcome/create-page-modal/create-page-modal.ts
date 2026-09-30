import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from '../../../components/button/button';
import { MODAL_REF } from '../../../_services/modal/modal.tokens';
import { ModalRef } from '../../../_services/modal/modal-ref';

export interface CreatePageResult {
  name: string;
  path: string;
}

@Component({
  selector: 'app-create-page-modal',
  imports: [FormsModule, Button],
  templateUrl: './create-page-modal.html',
  styleUrl: './create-page-modal.scss',
})
export class CreatePageModal {
  private readonly modalRef = inject<ModalRef<CreatePageResult>>(MODAL_REF);

  readonly name = signal('');
  readonly path = signal('');
  readonly valid = computed(() => !!this.name().trim() && !!this.path().trim());

  onSubmit(): void {
    if (!this.valid()) return;
    this.modalRef.close({ name: this.name().trim(), path: this.path().trim() });
  }

  onCancel(): void {
    this.modalRef.close();
  }
}
