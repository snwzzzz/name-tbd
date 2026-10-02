import { Injectable, signal } from '@angular/core';

export type ToastKind = 'info' | 'warning';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

/** How long a message stays, in ms (a warning a bit longer, to be read). */
const DURATION: Record<ToastKind, number> = { info: 2500, warning: 6000 };

/** Short messages at the bottom of the editor (see ToastHost), e.g. "Copied 2 widgets" or why something couldn't be done. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 1;

  show(message: string, kind: ToastKind = 'info'): void {
    const id = this.nextId++;
    this.toasts.update((all) => [...all, { id, kind, message }]);
    setTimeout(() => this.dismiss(id), DURATION[kind]);
  }

  dismiss(id: number): void {
    this.toasts.update((all) => all.filter((t) => t.id !== id));
  }
}
