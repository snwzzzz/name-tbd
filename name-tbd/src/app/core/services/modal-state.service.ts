import { Injectable, computed, signal } from '@angular/core';

/** The modal dialogs (by their component id) open while the app runs; workflow actions open and close them. */
@Injectable({ providedIn: 'root' })
export class ModalStateService {
  private readonly open = signal<string[]>([]);
  readonly openIds = this.open.asReadonly();
  readonly anyOpen = computed(() => this.open().length > 0);

  isOpen(modalId: string): boolean {
    return this.open().includes(modalId);
  }

  /** Opens it on top of any open already. */
  show(modalId: string): void {
    this.open.update((ids) => [...ids.filter((id) => id !== modalId), modalId]);
  }

  close(modalId: string): void {
    this.open.update((ids) => ids.filter((id) => id !== modalId));
  }

  /** The topmost open one (null: none). */
  top(): string | null {
    return this.open().at(-1) ?? null;
  }

  reset(): void {
    this.open.set([]);
  }
}
