import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from '../../../components/button/button';
import { MODAL_REF } from '../../../_services/modal/modal.tokens';
import { ModalRef } from '../../../_services/modal/modal-ref';
import { PagesStateService } from '../../../_services/pages-state.service';

export interface CreatePageResult {
  name: string;
  path: string;
  /** The project's layout page: its widgets show on every other page. */
  layout: boolean;
}

@Component({
  selector: 'app-create-page-modal',
  imports: [FormsModule, Button],
  templateUrl: './create-page-modal.html',
  styleUrl: './create-page-modal.scss',
})
export class CreatePageModal {
  private readonly modalRef = inject<ModalRef<CreatePageResult>>(MODAL_REF);
  private readonly pages = inject(PagesStateService);

  readonly name = signal('');
  readonly path = signal('');
  readonly layout = signal(false);
  /** There can be only one layout page. */
  readonly layoutExists = computed(() => this.pages.layoutPage() !== null);

  constructor() {
    this.pages.ensureLoaded();
  }
  readonly valid = computed(() => !!this.name().trim() && !!this.path().trim());

  onSubmit(): void {
    if (!this.valid()) return;
    this.modalRef.close({ name: this.name().trim(), path: this.path().trim(), layout: this.layout() && !this.layoutExists() });
  }

  onCancel(): void {
    this.modalRef.close();
  }
}
