import { Injectable, signal } from '@angular/core';

/** What's wrong with each field (by its component id) since a form was submitted; shown under it. */
@Injectable({ providedIn: 'root' })
export class FieldErrorsService {
  private readonly errors = signal<Record<string, string>>({});

  error(fieldId: string): string | null {
    return this.errors()[fieldId] ?? null;
  }

  set(fieldId: string, message: string | null): void {
    this.errors.update((all) => {
      if ((all[fieldId] ?? null) === message) return all;
      const { [fieldId]: _old, ...rest } = all;
      return message === null ? rest : { ...rest, [fieldId]: message };
    });
  }

  reset(): void {
    this.errors.set({});
  }
}
