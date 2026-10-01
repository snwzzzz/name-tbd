import { Component, computed, inject, signal } from '@angular/core';
import { Button } from '../button/button';
import { MODAL_DATA, MODAL_REF } from '../../_services/modal/modal.tokens';
import { ModalRef } from '../../_services/modal/modal-ref';
import { ColumnType } from '../../_types/data-source.types';

export interface RowFormField {
  name: string;
  type: ColumnType;
}

export interface RowFormModalData {
  title: string;
  submitText: string;
  fields: RowFormField[];
  /** The starting value of each field (empty for a new row). */
  values: string[];
}

const PLAIN_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A form with one input per column, suited to its type. Closes with the values, or nothing when cancelled. */
@Component({
  selector: 'app-row-form-modal',
  imports: [Button],
  templateUrl: './row-form-modal.html',
  styleUrl: './row-form-modal.scss',
})
export class RowFormModal {
  readonly data = inject<RowFormModalData>(MODAL_DATA);
  private readonly modalRef = inject<ModalRef<string[]>>(MODAL_REF);

  readonly values = signal<string[]>(this.data.fields.map((_, i) => this.data.values[i] ?? ''));

  /** Per field, why its value isn't valid (null when it is). */
  readonly errors = computed(() =>
    this.data.fields.map((field, i) => {
      const value = this.values()[i].trim();
      if (field.type === 'number' && value !== '' && !Number.isFinite(Number(value))) return 'Enter a number';
      return null;
    }),
  );
  readonly valid = computed(() => this.errors().every((e) => e === null));

  /** The native input to use for a field. */
  inputType(i: number): 'number' | 'checkbox' | 'date' | 'text' {
    switch (this.data.fields[i].type) {
      case 'number': return 'number';
      case 'boolean': return 'checkbox';
      // Values with a time (or in another format) are edited as text, so nothing gets lost
      case 'date': return this.values()[i] === '' || PLAIN_DATE.test(this.values()[i]) ? 'date' : 'text';
      default: return 'text';
    }
  }

  checked(i: number): boolean {
    return ['true', 'yes'].includes(this.values()[i].trim().toLowerCase());
  }

  set(i: number, value: string): void {
    this.values.update((values) => values.map((v, j) => (j === i ? value : v)));
  }

  submit(): void {
    if (this.valid()) this.modalRef.close(this.values());
  }

  cancel(): void {
    this.modalRef.close();
  }
}
