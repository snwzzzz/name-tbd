import { Injectable, signal } from '@angular/core';
import { MessageTone } from '../../_types/workflow.types';

export interface AppMessage {
  id: number;
  tone: MessageTone;
  text: string;
}

/** How long a message stays, in ms (warnings and errors a bit longer, to be read). */
const DURATION: Record<MessageTone, number> = { info: 4000, success: 4000, warning: 7000, error: 7000 };

/** Short messages the running app shows over its page (the `show_message` action), see AppMessages. */
@Injectable({ providedIn: 'root' })
export class AppMessagesService {
  readonly messages = signal<AppMessage[]>([]);
  private nextId = 1;

  show(text: string, tone: MessageTone = 'info'): void {
    const id = this.nextId++;
    this.messages.update((all) => [...all, { id, tone, text }]);
    setTimeout(() => this.dismiss(id), DURATION[tone] ?? DURATION.info);
  }

  dismiss(id: number): void {
    this.messages.update((all) => all.filter((m) => m.id !== id));
  }

  reset(): void {
    this.messages.set([]);
  }
}
