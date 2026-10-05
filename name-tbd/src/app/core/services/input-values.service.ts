import { Injectable, signal } from '@angular/core';

/**
 * What's entered in each field (by its component id) while the app runs: typed into an input,
 * picked in a dropdown, checked, ... As text, like props (a checkbox: 'true' / 'false'). Actions
 * and forms read it.
 */
@Injectable({ providedIn: 'root' })
export class InputValuesService {
  private readonly values = signal<Record<string, string>>({});

  value(inputId: string): string {
    return this.values()[inputId] ?? '';
  }

  /** The value entered, or undefined when nothing was (the field shows its initial value). */
  get(inputId: string): string | undefined {
    return this.values()[inputId];
  }

  /** Sets several fields at once (e.g. a form showing the row it edits). */
  setMany(values: Record<string, string>): void {
    this.values.update((all) => ({ ...all, ...values }));
  }

  /** Forgets what was entered in these fields, so they show their initial values again. */
  clear(inputIds: string[]): void {
    const forget = new Set(inputIds);
    this.values.update((all) => Object.fromEntries(Object.entries(all).filter(([id]) => !forget.has(id))));
  }

  set(inputId: string, value: string): void {
    this.values.update((all) => ({ ...all, [inputId]: value }));
  }

  reset(): void {
    this.values.set({});
  }
}
