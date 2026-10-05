import { Injectable, signal } from '@angular/core';

/** How long a form's message (saved, or what's wrong) shows, in ms. */
export const FORM_MESSAGE_MS = 4000;

/** What a form says after it was submitted. */
export interface FormMessage {
  text: string;
  kind: 'success' | 'error';
}

/** The message each form (by its component id) shows after it was submitted; it goes away after a while. */
@Injectable({ providedIn: 'root' })
export class FormMessagesService {
  private readonly messages = signal<Record<string, FormMessage>>({});
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  message(formId: string): FormMessage | null {
    return this.messages()[formId] ?? null;
  }

  /** Shows a message (null: none) for FORM_MESSAGE_MS. */
  say(formId: string, message: FormMessage | null): void {
    clearTimeout(this.timers.get(formId));
    this.timers.delete(formId);
    this.messages.update((all) => {
      const { [formId]: _old, ...rest } = all;
      return message ? { ...rest, [formId]: message } : rest;
    });
    if (message) this.timers.set(formId, setTimeout(() => this.say(formId, null), FORM_MESSAGE_MS));
  }

  reset(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    this.messages.set({});
  }
}
