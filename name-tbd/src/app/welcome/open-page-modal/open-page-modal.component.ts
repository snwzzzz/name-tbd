import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageDto } from '../../api/models';
import { Button } from '../../components/button/button';
import { MODAL_DATA, MODAL_REF, ModalRef } from '../../components/modal';

export interface OpenPageModalData {
  pages: PageDto[];
}

@Component({
  selector: 'app-open-page-modal',
  standalone: true,
  imports: [CommonModule, Button],
  templateUrl: './open-page-modal.component.html',
  styleUrl: './open-page-modal.component.scss',
})
export class OpenPageModalComponent {
  readonly data = inject<OpenPageModalData>(MODAL_DATA);
  readonly modalRef = inject<ModalRef<number>>(MODAL_REF);

  onSelect(pageId: number): void {
    this.modalRef.close(pageId);
  }

  onClose(): void {
    this.modalRef.close();
  }
}
