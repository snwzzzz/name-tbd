import { Injectable, signal } from '@angular/core';

/** What's typed in each input (by the input's component id) while the app runs; actions read it. */
@Injectable({ providedIn: 'root' })
export class InputValuesService {
  private readonly values = signal<Record<string, string>>({});

  value(inputId: string): string {
    return this.values()[inputId] ?? '';
  }

  set(inputId: string, value: string): void {
    this.values.update((all) => ({ ...all, [inputId]: value }));
  }

  reset(): void {
    this.values.set({});
  }
}
