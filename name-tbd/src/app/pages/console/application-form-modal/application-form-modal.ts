import { Component, computed, inject, signal } from '@angular/core';
import { Button } from '../../../components/button/button';
import { MODAL_DATA, MODAL_REF } from '../../../_services/modal/modal.tokens';
import { ModalRef } from '../../../_services/modal/modal-ref';

export interface ApplicationFormValues {
  title: string;
  description: string;
}

export interface ApplicationFormModalData {
  heading: string;
  submitText: string;
  values: ApplicationFormValues;
}

/** An application's title and description, to create or rename it. Closes with the values, or nothing when cancelled. */
@Component({
  selector: 'app-application-form-modal',
  imports: [Button],
  templateUrl: './application-form-modal.html',
  styleUrl: './application-form-modal.scss',
})
export class ApplicationFormModal {
  readonly data = inject<ApplicationFormModalData>(MODAL_DATA);
  private readonly modalRef = inject<ModalRef<ApplicationFormValues>>(MODAL_REF);

  readonly title = signal(this.data.values.title);
  readonly description = signal(this.data.values.description);
  readonly valid = computed(() => this.title().trim().length > 0 && this.title().trim().length <= 255);

  submit(): void {
    if (this.valid()) this.modalRef.close({ title: this.title().trim(), description: this.description().trim() });
  }

  cancel(): void {
    this.modalRef.close();
  }
}
