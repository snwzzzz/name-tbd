import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from '../../components/button/button';
import { MODAL_REF, ModalRef } from '../../components/modal';

export interface CreatePageResult {
  name: string;
  path: string;
}

@Component({
  selector: 'app-create-page-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, Button],
  templateUrl: './create-page-modal.component.html',
  styleUrl: './create-page-modal.component.scss',
})
export class CreatePageModalComponent {
  readonly modalRef = inject<ModalRef<CreatePageResult>>(MODAL_REF);

  name = '';
  path = '';

  onSubmit(): void {
    if (!this.name.trim() || !this.path.trim()) {
      return;
    }
    this.modalRef.close({
      name: this.name.trim(),
      path: this.path.trim(),
    });
  }

  onCancel(): void {
    this.modalRef.close();
  }
}
