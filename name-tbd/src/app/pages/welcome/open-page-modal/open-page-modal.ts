import { Component, inject } from '@angular/core';
import { LucideFile } from '@lucide/angular';
import { PageDto } from '../../../api/models';
import { Button } from '../../../components/button/button';
import { MODAL_DATA, MODAL_REF } from '../../../_services/modal/modal.tokens';
import { ModalRef } from '../../../_services/modal/modal-ref';

export interface OpenPageModalData {
  pages: PageDto[];
}

@Component({
  selector: 'app-open-page-modal',
  imports: [Button, LucideFile],
  templateUrl: './open-page-modal.html',
  styleUrl: './open-page-modal.scss',
})
export class OpenPageModal {
  readonly data = inject<OpenPageModalData>(MODAL_DATA);
  private readonly modalRef = inject<ModalRef<number>>(MODAL_REF);

  onSelect(pageId: number): void {
    this.modalRef.close(pageId);
  }

  onClose(): void {
    this.modalRef.close();
  }
}
